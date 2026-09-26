# WhatsApp Integration — Go Live Runbook

Two paths. **Path A gets a real, working bot on a real phone in ~20 minutes**
with Meta's free test number. Path B removes the test-number restrictions and
is what you do before real farmers use it.

---

## Path A — live in ~20 minutes (test number, development mode)

### A1. Credentials (Meta console)

| Value | Where | Env var |
|---|---|---|
| Access token | App → WhatsApp → API Setup → *Generate access token* | `WHATSAPP_API_TOKEN` |
| Phone number id | same page, under the **From** dropdown — 15–17 digits, **not** the phone number | `WHATSAPP_PHONE_NUMBER_ID` (auto-discovered) |
| WABA id | same page, near the top | `WHATSAPP_WABA_ID` (auto-discovered) |
| App secret | App → Settings → Basic → *App secret* → Show (32-char hex) | `WHATSAPP_APP_SECRET` |

### A2. Allowlist your own phone

The test number can only message **up to 5 numbers**, and once a number is
added it cannot be removed. App → WhatsApp → API Setup → **To** →
*Manage phone number list* → add your WhatsApp number → enter the code it
receives.

> This is the whole ceiling of Path A: farmers can message the bot, but the
> bot's replies only reach those 5 allowlisted numbers.

### A3. Configure the repo

```bash
git checkout arena/01a0dc0c-agripulseai
npm ci

cat > .env <<'EOF'
WHATSAPP_API_TOKEN=EAA…your token…
WHATSAPP_APP_SECRET=…32-char hex…
WHATSAPP_VERIFY_TOKEN=pick-a-long-random-string
PUBLIC_APP_URL=https://your-app.vercel.app
EOF

npm run whatsapp:setup
```

Expected output:

```
✓ Token introspection — valid, scopes: whatsapp_business_messaging, …
✓ Phone-number discovery — 109876543210987 (+1 555 0100, AgriPulse AI)
✓ Persisted to .env — WHATSAPP_PHONE_NUMBER_ID (added), WHATSAPP_WABA_ID (added)
```

The script writes the discovered ids into `.env` for you. If discovery comes
back empty, the token lacks `whatsapp_business_management` — copy the id from
the API Setup page and run `npm run whatsapp:setup -- --phone-number-id <ID>`.

### A4. Prove the outbound path

```bash
npm run whatsapp:setup -- --send 91<your allowlisted number>
```

That message should arrive on your phone. If it does, sending works end to end.

### A5. Host the webhook

Pick **one**.

**Option 1 — Vercel** (serverless, `api/whatsapp-webhook.js`)

```bash
npx vercel link && npx vercel env add WHATSAPP_API_TOKEN      # repeat per var
npx vercel env add WHATSAPP_PHONE_NUMBER_ID
npx vercel env add WHATSAPP_APP_SECRET
npx vercel env add WHATSAPP_VERIFY_TOKEN
npx vercel --prod
```

**Option 2 — standalone server** (Railway / Render / any VPS, `server/index.js`)

Deploy the repo with start command `node server/index.js`, the same env vars,
and it listens on `$PORT`. Session state lives in memory + a `/tmp` snapshot,
so run **one** instance.

**Local, right now** — no deploy needed:

```bash
npm run whatsapp:server          # :8787
npx localtunnel --port 8787      # or: cloudflared tunnel --url localhost:8787
```

### A6. Point Meta at it

App → WhatsApp → **Configuration**:

- Callback URL: `https://<your-host>/api/whatsapp-webhook`
  (standalone server also accepts `/webhook`)
- Verify token: **exactly** your `WHATSAPP_VERIFY_TOKEN`
- **Verify and save** — Meta fires the GET handshake and must get its challenge
  back
- Then **Subscribe** to the `messages` field

### A7. Test

From your allowlisted phone, WhatsApp the test number: `hi`.
You should get the welcome menu with three buttons. Then try `mandi`, `patti`,
`pool`, `dawai`, `community`.

Check the wiring any time — it never leaks the token:

```bash
curl https://<your-host>/api/whatsapp-webhook?status=1
# {"live":true,"mode":"LIVE","phoneNumberId":"1098…0987", …}
```

---

## Path B — real farmers (production)

Development mode is capped: the test number, 5 recipients, and 24-hour tokens.
To lift all three:

1. **Permanent token.** Business Settings → System Users → create one →
   generate a token with `whatsapp_business_messaging` **and**
   `whatsapp_business_management`. The API-Setup token expires in 24 h — the
   bot will silently stop replying when it does.
2. **Register your own number.** API Setup → *Add phone number*. It must be
   able to take an SMS or voice call. A number currently used by the WhatsApp
   or WhatsApp Business **app** must be removed from it first.
3. **Business verification.** Business Settings → Security Centre → Start
   verification (legal name, address, a supporting document). Typically 2–5
   business days.
4. **Privacy policy + ToS URLs** in App Settings → Basic — live mode is blocked
   without them.
5. **Flip the app to Live** (toggle at the top of the App Dashboard).

Worth knowing: even unverified, an account may handle **unlimited
user-initiated conversations** and 250 business-initiated ones per rolling 24 h.
AgriPulse only ever replies inside the farmer's 24-hour window, so the 250 tier
is not the binding constraint — the 5-recipient test allowlist is.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Recipient phone number not in allowed list` (131030/131026) | Number isn't in the test allowlist | A2, or move to Path B |
| Bot worked yesterday, silent today | 24-hour API-Setup token expired | Permanent System User token (B1) |
| Error code 10 on send | Missing `whatsapp_business_messaging` | Re-authorise the token with that scope |
| Meta won't save the webhook | Verify token mismatch, or URL not publicly HTTPS | Compare the strings exactly; check `curl …?status=1` from outside your network |
| Webhook verified but no replies | Not subscribed to the `messages` field | Configuration → Webhook fields → Subscribe |
| `signature does not match app secret` in the logs | `WHATSAPP_APP_SECRET` wrong, or a proxy rewrote the body | Re-copy the 32-char hex; unset the var to confirm the rest works |
| Vercel function 500 with no logs | Missing default export | Fixed in `api/whatsapp-webhook.js` — the Vercel adapter bridges `handler(req,res)` to the `GET`/`POST` handlers |
| Replies arrive twice | Meta redelivers on slow ACKs | Already handled — `store.js` dedupes by `wamid` |

## Security notes

- `.env` is gitignored. Never commit a token; rotate anything that has been
  pasted into chat or a ticket.
- Set `WHATSAPP_APP_SECRET`. The webhook URL is public — without signature
  verification a forged POST can make the bot message an arbitrary number.
  Verification is enforced automatically once the var is set.
- Change `WHATSAPP_VERIFY_TOKEN` away from the default `agripulse-verify`.
- `POST /admin/send` and `/admin/broadcast` are guarded by
  `WHATSAPP_ADMIN_TOKEN` (defaults to the verify token) — set it explicitly.
- `GET …?status=1` returns masked ids only, never the token.
