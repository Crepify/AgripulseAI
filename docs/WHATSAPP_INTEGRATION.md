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
| `server/whatsapp/config.js` | env validation, Graph endpoints, `describeConfig()` status |
| `server/whatsapp/env.js` | zero-dependency `.env` loader + `upsertEnvVar()` (real env vars always win) |
| `server/whatsapp/client.js` | `sendTextMessage` / `sendInteractiveButtons` / `sendListMenu` / `sendMediaMessage` / `markAsRead` / `downloadMedia` — Meta limits enforced (≤3 buttons, 20-char titles, ≤10 list rows) |
| `server/whatsapp/store.js` | user auto-provision by phone + session state machine (`IDLE`, `AWAITING_CROP_IMAGE`, `AWAITING_PATTI_PHOTO`, `AWAITING_POOL_DETAILS`, `AWAITING_DAWAI_NAME`) + wamid idempotency |
| `server/whatsapp/router.js` | routes text / interactive / image / audio, runs the flows |
| `api/whatsapp-webhook.js` | Vercel transport shim (GET verify + POST ingest + `?status=1`) |
| `server/index.js` | zero-dependency standalone server (`npm run whatsapp:server`) |
| `scripts/whatsapp-setup.js` | `npm run whatsapp:setup` — verifies the token, discovers the phone-number id, writes it to `.env` |
| `scripts/mock-graph-server.mjs` | standalone mock Meta Graph API used by the test suite |
| `tests/whatsapp.test.mjs` | `npm run whatsapp:test` — 15 tests over client limits, webhook, router, env, CLI |

## 👉 Going live

Step-by-step checklist — test number in ~20 minutes, then production:
**[`docs/WHATSAPP_GO_LIVE.md`](WHATSAPP_GO_LIVE.md)**.

## Wiring credentials (`npm run whatsapp:setup`)

An access token on its own is **not** enough to send: the Graph API also needs
the *phone number id*, which is a separate opaque number (it is **not** the
display phone number — confusing the two is the most common Cloud API error).
The setup CLI reads it out of the Business graph and writes it back to `.env`:

```bash
# 1. put the token in .env
echo 'WHATSAPP_API_TOKEN=EAA…' >> .env

# 2. verify + discover + persist
npm run whatsapp:setup

# 3. prove the outbound path with a real message
npm run whatsapp:setup -- --send 919812345678
```

What it does, in order:

1. `GET /debug_token` — reports `is_valid`, granted scopes and expiry, and
   warns when the token is the 24-hour API-Setup token rather than a
   permanent System User token.
2. Discovers phone numbers: `GET /me/accounts?fields=…,whatsapp_business_accounts{…}`
   (system-user tokens) → `GET /me?fields=businesses` →
   `{business}/owned_whatsapp_business_accounts` → `{waba}/phone_numbers`
   (user tokens) → `GET /{phone_number_id}` (confirm an id already set).
3. Writes `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_WABA_ID` and
   `WHATSAPP_BUSINESS_PHONE` into `.env`, preserving comments.
4. `--send <number>` fires a live test message through the real client.

Flags: `--phone-number-id <id>` pin a specific number · `--json`
machine-readable report · `--no-write` verify only.

`.env` is read by `server/whatsapp/env.js` on import, so `npm run whatsapp:server`
and the setup CLI pick it up with no dotenv dependency. Real environment
variables always win over the file, so Vercel/Railway settings override it.

> ⚠️ **Never commit `.env`** (it is gitignored). A token pasted into chat, a
> ticket or a commit is compromised — rotate it in Meta Business Settings →
> System Users and prefer a permanent System User token over the 24-hour
> API-Setup token.

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/whatsapp-webhook` | Meta verification handshake (echoes `hub.challenge`) |
| GET | `/api/whatsapp-webhook?status=1` | credential status — mode, masked ids, missing vars (no secrets) |
| POST | `/api/whatsapp-webhook` | inbound ingestion; always ACKs 200 |
| GET | `/status`, `/healthz` | same status, standalone server |
| POST | `/admin/send` | `{"to","text"}` — 1:1 send, `Authorization: Bearer $WHATSAPP_ADMIN_TOKEN` |
| POST | `/admin/broadcast` | `{"channel","text"}` — community channel fan-out |

The app's WhatsApp hub shows a **LIVE / Demo** badge driven by `?status=1`, so
a demo deck can never be mistaken for a connected number.

## Setup (one-time, ~15 min)

1. **Meta app** — [developers.facebook.com](https://developers.facebook.com) →
   Create App → *Business* → add the **WhatsApp** product. You get a free
   test number + `WHATSAPP_PHONE_NUMBER_ID` under *WhatsApp → API Setup*.
2. **Permanent token** — Business Settings → System Users → create one →
   generate token with `whatsapp_business_messaging` +
   `whatsapp_business_management` → this is `WHATSAPP_API_TOKEN`.
   (The API-Setup page token expires in 24 h — don't ship it.)
3. **Env vars** — copy `.env.example`, put the token in `.env`, then run
   `npm run whatsapp:setup` to verify it and auto-fill
   `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_WABA_ID` (details below). Mirror the
   same vars into Vercel project settings (or the server's environment).
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
npm run whatsapp:test             # 15 tests: client limits, webhook, router,
                                  # .env loader, credential-discovery CLI.
                                  # Runs against scripts/mock-graph-server.mjs —
                                  # no Meta app, no messages spent.
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

## AgriPulse Community

Meta's Cloud API has no group/Community API, so the **AgriPulse Community**
is modeled server-side (`server/whatsapp/community.js`): members join named
channels and every community event fans out as individual messages —
behaves like a community group from the farmer's side.

| Channel | id | Fed by |
|---|---|---|
| 🚚 Truck Pool | `pool` | every new pool request fans out to members |
| 🚨 Fraud Alerts | `fraud` | every illegal patti audit fans out (anonymized) |
| 🛒 Direct Deals | `deals` | admin broadcasts |
| 🥬 Mandi Bhav | `mandi` | admin broadcasts (e.g. daily price cron) |

- New farmers are **auto-joined** to `fraud` + `mandi` on first "hi".
- Commands: `community` (menu), `join pool`, `leave fraud`, …
- Broadcasts deliver **only to members with an open 24-h service window**
  (skipped members are counted) → the community stays on the free tier.
- Admin posts (standalone server):
  ```bash
  curl -X POST localhost:8787/admin/broadcast \
    -H "Authorization: Bearer $WHATSAPP_ADMIN_TOKEN" \
    -d '{"channel":"mandi","text":"Aaj tamatar *₹2,400/q* — 6% upar 📈"}'
  ```

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
