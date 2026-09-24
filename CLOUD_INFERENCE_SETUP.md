# AgriPulse AI — server-side API setup

All three private keys are read by Vercel Functions in `/api`. None of them is exposed to the browser.

| Feature | Browser calls | Server route | Env variable |
|---|---|---|---|
| Leaf disease AI (cloud fallback) | `/api/predict` | `api/predict.js` | `ULTRALYTICS_ENDPOINT_URL`, `ULTRALYTICS_API_KEY` |
| Weather / spray window | `/api/weather?city=…` | `api/weather.js` | `WEATHERAPI_KEY` |
| Mandi prices (CEDA Agmarknet) | `/api/mandi?action=…` | `api/mandi.js` | `CEDA_API_KEY` |

## Vercel environment variables

Add these under **Settings → Environment Variables** for Production and Preview, then redeploy:

```text
ULTRALYTICS_ENDPOINT_URL=https://platform.ultralytics.com/api/models/agrovision/agrovisionai/exp
ULTRALYTICS_API_KEY=<your ul_… key>
WEATHERAPI_KEY=<your weatherapi.com key>
CEDA_API_KEY=<your CEDA bearer token>
```

Never use a `VITE_` prefix for these. Vite inlines `VITE_*` values into the public bundle.

## Health checks

After deploying, open:

```text
/api/predict                  → {"ok":true,"upstream":"shared-api","authenticated":true}
/api/weather?health=1         → {"ok":true,"provider":"weatherapi.com","configured":true}
/api/mandi?action=health      → {"ok":true,"provider":"ceda-agmarknet","configured":true}
```

`configured: false` or `authenticated: false` means that variable is missing from the deployment you tested.

## Verified behaviour

- `POST /api/predict` with `file`, `conf=0.25`, `iou=0.7`, `imgsz=640` returns detections from the shared Ultralytics model (PlantVillage class names, e.g. `Tomato___Early_blight`).
- The dedicated Cloud Run endpoint `predict-6a8fe586….run.app` currently returns **401 Invalid API key**, so the shared Ultralytics model API is configured as the default upstream. Switch `ULTRALYTICS_ENDPOINT_URL` back to the Cloud Run URL once that endpoint is running and bound to your key.
- `GET /api/weather?city=Mandya` returns live current conditions plus a 7-day forecast. Plain city names are biased to India so `Delhi` does not resolve to Delhi, Ontario.
- `GET /api/mandi?action=prices&state=Karnataka&commodity=Onion` returns a verified Agmarknet daily series. CEDA validates data before publishing, so the latest record lags real time by weeks — the app uses it as a trusted fallback when the live mandi mirror has no rows, and labels it as a state average.

## Local development

`npm run dev` now serves these routes too: `vite.config.js` mounts `api/*.js` as dev middleware and loads `.env`. Create a local `.env` (it is git-ignored):

```bash
cp .env.example .env   # then paste your keys
npm install
npm run dev
```

`vercel dev` also works if you prefer the real Functions runtime.

## Key hygiene

- `.env` is git-ignored and is not included in any shared ZIP.
- Rotate any key that has been pasted into chat, a screenshot, or a public bundle.
- The old build shipped a weather key inside the client bundle; that path is now removed in favour of `/api/weather`. Rotate that key.
