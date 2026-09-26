# AgriPulse × WhatsApp Cloud API — Real Integration (Option A)

Direct Meta Graph API (v20.0). **No Twilio / WATI / Interakt.** Zero cost:
the bot only ever *replies* inside the 24-hour service window that a
farmer opens by messaging first — service conversations are free.

## Architecture

```
farmer's WhatsApp
      │  inbound message
      ▼
Meta Cloud API ──POST──▶  webhook (200 ACK immediately, async processing)
                          ├─ api/whatsapp-webhook.js   (Vercel serverless)
                          └─ server/index.js           (standalone node:http)
                                    │
                          server/whatsapp/router.js    ← state machine
                          ├─ server/whatsapp/store.js  ← phone→user, sessions
                          ├─ server/whatsapp/client.js ← Graph API sends
                          ├─ src/data/mandiRules.js    ← auditPatti (REUSED)
                          ├─ src/data/genericRegistry.js ← lookupBrand (REUSED)
                          └─ api/_lib/upstream.js      ← cedaPrices (REUSED)
```

| File | Role |
|---|---|
| `server/whatsapp/config.js` | env validation, Graph endpoints |
| `server/whatsapp/client.js` | `sendTextMessage` / `sendInteractiveButtons` / `sendListMenu` / `sendMediaMessage` / `markAsRead` / `downloadMedia` — Meta limits enforced (≤3 buttons, 20-char titles, ≤10 list rows) |
| `server/whatsapp/store.js` | user auto-provision by phone + session state machine (`IDLE`, `AWAITING_CROP_IMAGE`, `AWAITING_PATTI_PHOTO`, `AWAITING_POOL_DETAILS`, `AWAITING_DAWAI_NAME`) + wamid idempotency |
| `server/whatsapp/router.js` | routes text / interactive / image / audio, runs the flows |
| `api/whatsapp-webhook.js` | Vercel transport shim (GET verify + POST ingest) |
| `server/index.js` | zero-dependency standalone server (`npm run whatsapp:server`) |

## Setup (one-time, ~15 min)

1. **Meta app** — [developers.facebook.com](https://developers.facebook.com) →
   Create App → *Business* → add the **WhatsApp** product. You get a free
   test number + `WHATSAPP_PHONE_NUMBER_ID` under *WhatsApp → API Setup*.
2. **Permanent token** — Business Settings → System Users → create one →
   generate token with `whatsapp_business_messaging` +
   `whatsapp_business_management` → this is `WHATSAPP_API_TOKEN`.
   (The API-Setup page token expires in 24 h — don't ship it.)
3. **Env vars** — copy `.env.example`; set the three `WHATSAPP_*` vars in
   Vercel project settings (or the server's environment).
4. **Webhook** — App → WhatsApp → Configuration →
   * Callback URL: `https://<your-deployment>/api/whatsapp-webhook`
   * Verify token: the exact value of `WHATSAPP_VERIFY_TOKEN`
   * Click **Verify and save** (Meta fires the GET handshake) →
     **Subscribe** to the `messages` field.
5. **Test** — from a phone added as a test recipient, WhatsApp "hi" to the
   test number. You should get the welcome menu with 3 buttons.

## Local testing (no Meta account needed)

Missing credentials switch the client to **dry-run**: outbound payloads are
logged instead of sent, so the whole pipeline is testable offline.

```bash
npm run whatsapp:server           # listens on :8787 in dry-run

# 1) verification handshake
curl "localhost:8787/webhook?hub.mode=subscribe&hub.verify_token=agripulse-verify&hub.challenge=12345"
# → 12345

# 2) inbound "hi"
curl -s localhost:8787/webhook -H 'Content-Type: application/json' -d '{
  "object":"whatsapp_business_account",
  "entry":[{"changes":[{"field":"messages","value":{
    "contacts":[{"profile":{"name":"Ramesh"}}],
    "messages":[{"from":"919876543210","id":"wamid.TEST1","type":"text",
                 "text":{"body":"hi"}}]}}]}]}'
# → 200 + welcome-menu payload in the server log
```

For a public URL during development: `npx localtunnel --port 8787` (or
ngrok / cloudflared) and point the Meta webhook at it.

## Conversation map

| Farmer sends | Bot does |
|---|---|
| `hi` / `namaste` / `menu` | welcome + 3 quick-reply buttons (auto-provisions user on first contact) |
| `mandi` / `bhav` | crop list menu → live CEDA Agmarknet price (reference fallback) |
| `patti` | → `AWAITING_PATTI_PHOTO`; photo → `auditPatti()` illegal-deduction report |
| `scan` / `rog` | → `AWAITING_CROP_IMAGE`; photo → disease report (hooks `/api/predict`) |
| `pool` | → `AWAITING_POOL_DETAILS`; "300 kg Pune" → share quote + confirm buttons |
| `dawai` / brand name | `lookupBrand()` → generic equivalent + savings |
| voice note | media resolved via Graph; STT slot (Sarvam) documented in router |
| anything else | contextual fallback help |

## Production notes

- **Always-200 webhook**: non-200/slow responses make Meta retry and
  eventually disable the webhook. Both adapters ACK fast and process
  async; `store.js` dedupes redelivered `wamid`s.
- **DB**: `store.js` bodies are marked `PRISMA SWAP` — replace with
  `prisma.user.findUnique/upsert` against `prisma/schema.prisma` when
  `DATABASE_URL` is live; the interface doesn't change.
- **Media**: inbound `media_id` → `getMediaUrl()` → authenticated CDN
  download (`downloadMedia`) for OCR / vision / STT providers.
- **Limits enforced in client.js**: 3 buttons, 20-char button titles,
  24-char list titles, 10 list rows, 4096-char text (auto-chunked).
