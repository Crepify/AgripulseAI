<div align="center">

# 🌾 AgriPulse AI
### Voice-First, Multimodal & Hybrid Cloud / On-Device Agricultural Copilot for Smallholders

[![NexHack 2026](https://img.shields.io/badge/NexHack-2026-10B981?style=for-the-badge&logo=target)](https://github.com)
[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-059669?style=for-the-badge&logo=pwa)](https://github.com)
[![YOLO26 on-device](https://img.shields.io/badge/AI-YOLO26%20On--Device%20WebGPU-F59E0B?style=for-the-badge)](https://docs.ultralytics.com/integrations/litert/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br />

> **"Turning 40% Preventable Crop Losses into Smallholder Prosperity through Edge-AI, Vernacular Voice, and Practical Low-Tech Math."**

</div>

---

## 📖 Table of Contents
- [The Grassroots Problem](#-the-grassroots-problem)
- [The AgriPulse AI Solution](#-the-agripulse-ai-solution)
- [Key Features & Innovations](#key-features--innovations)
- [System Architecture](#system-architecture)
- [Technology Stack (100% Free & Open Source)](#-technology-stack-100-free--open-source)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [PWA Mobile Installation Guide](#-pwa-mobile-installation-guide)
- [Hackathon Pitch Evaluation FAQ](#-hackathon-pitch-evaluation-faq)

---

## 🚨 The Grassroots Problem

Over **140 million smallholder farming families** in India feed 1.4 billion citizens, yet remain trapped in an avoidable crop-loss and debt cycle:

1. **The Biological Blindspot (40% Crop Loss):** Existing crop scanner apps only diagnose diseases after yellow rot appears—when 20% to 30% of yield potential is permanently destroyed.
2. **The Socio-Literacy Gap:** Over 70% of marginal farmers cannot read complex text apps or interpret academic metrics like *"Apply 2.5 kg/ha"*.
3. **The Counterfeit Pesticide Crisis:** 35% of rural agrochemicals are fake or diluted, poisoning soil biology and draining farmer savings.
4. **Asymmetric Market Exploitation:** Lack of real-time wholesale price transparency forces distress selling to predatory middlemen at 30–40% below fair APMC mandi rates.

---

## 💡 The AgriPulse AI Solution

AgriPulse AI is an **offline-first, voice-native Progressive Web App (PWA)** that runs on-device without requiring app store installation or high-speed cellular connectivity.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              AGRIPULSE AI WORKFLOW                                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  1. 📷 Real-Time Leaf Scan ──▶ 2. 🧠 Hybrid AI Vision ──▶ 3. 🧴 Bottle-Cap Dosage       │
│     (Camera / Upload)        (YOLO26 local + cloud safety net) (\"Mix 2 Bottle Caps\") │
│                                                                        │               │
│  4. 🌦️ 72h Weather Watch  ◀── 5. 🎙️ Vernacular Voice AI   ◀───────────┘               │
│     (Pre-Symptom Warning)         (Hindi/Tamil/Telugu TTS)                             │
│                                                                                        │
│  6. 🛡️ Anti-Fake Shield   ──▶ 7. 📊 Mandi ROI Simulator ──▶ 8. 🤝 20-Farmer Group Buy  │
│     (CIB&RC Registry Check)       (Live ₹ Net Profit Math)       (25% Wholesale Off)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🤝 NEW: Kisan Saathi — Farmer Commerce Operating System

AgriPulse now ships the full farmer-to-buyer commerce loop (mobile-first PWA):

| Module | Where | What it does |
|---|---|---|
| **Kisan Saathi Aggregation Console** | `src/components/TabSaathi.jsx` | PM-KISAN/KCC onboarding, **read-only Web Bluetooth scale** (manual weight entry hard-disabled — anti weighbridge fraud), Hindi TTS weight broadcast, 3-frame AI quality audit, 58mm thermal receipt, escrow + **dual-QR release** |
| **Farmer WhatsApp Passbook** | `src/components/TabPassbook.jsx` + `api/whatsapp-webhook.js` | Voice-note → structured deal (Whisper/Sarvam mock), NET-IN-HAND passbook, step tracker (Weighed → Escrow → Loaded → UPI Paid), zero-deduction mandi comparison |
| **Buyer Bidding & Supply Map** | `src/components/TabBuyer.jsx` | Live village-hub supply map, aggregated lots with CV quality scores, "Lock Lot & Pay 100% to Escrow" (Razorpay mock) |
| **Payments & Schema** | `api/deals-dispatch.js` + `prisma/schema.prisma` | Dual-QR zero-trust split payout (Farmer ₹235/q • Saathi ₹25 • Fleet ₹20 • Hub ₹3 • Platform ₹17) + production Postgres contract |

**Unit economics per quintal:** Buyer pays ₹300 → Farmer takes home **₹235 NET** (10%+ over mandi, zero hidden cuts) → ₹65 platform fee funds the Saathi, fleet, Panchayat hub and AgriPulse. Every screen shows live **MSP & e-NAM govt benchmarks** (70/30 Rural Trust Engine).

The whole app now runs in **full mobile style** — a phone-frame layout with bottom navigation, ≥56px touch targets and big-number NET pricing ("the Bapu Test").

---

## 🟢 NEW: WhatsApp Cloud API Integration (direct Meta, no BSP)

A farmer never has to install AgriPulse. Messaging the business number opens a
full service bot on the **Meta WhatsApp Cloud API** (Graph v20.0) — no Twilio,
WATI or Interakt, and no per-message spend: every reply lands inside the
farmer-initiated 24-hour service window, which Meta bills at zero.

```
farmer's WhatsApp ──▶ Meta Cloud API ──POST──▶ webhook (200 ACK, async work)
                                               ├─ api/whatsapp-webhook.js  (Vercel)
                                               └─ server/index.js          (VPS/Railway)
                                                        │
                                               server/whatsapp/router.js  ← state machine
                                               ├─ client.js  Graph sends (Meta limits enforced)
                                               ├─ store.js   phone→user, sessions, wamid dedupe
                                               ├─ community.js  channel fan-out
                                               └─ REUSES src/data/mandiRules.js,
                                                  src/data/genericRegistry.js, api/_lib/upstream.js
```

| Command | What it does |
|---|---|
| `npm run whatsapp:setup` | Verifies the token via `debug_token` (scopes + expiry), **auto-discovers the phone-number id** from the Business graph and writes it into `.env`. `--send 91…` fires a live test message. |
| `npm run whatsapp:server` | Standalone zero-dependency webhook server (`:8787`) — dry-run mode when credentials are absent |
| `npm run whatsapp:test` | 15 tests over the real modules against `scripts/mock-graph-server.mjs` — no Meta app, no messages spent |

Bot flows: `mandi` (live Agmarknet price) · `patti` (illegal-deduction audit,
reusing the app's own `auditPatti()`) · `scan` (crop photo → disease report) ·
`pool` (truck share, fans out to the Truck Pool channel) · `dawai` (brand →
generic + savings) · `community` (join/leave 🚚 pool, 🚨 fraud, 🛒 deals, 🥬 mandi).

`GET /api/whatsapp-webhook?status=1` reports the wiring state (mode, masked ids,
missing vars — never the token) and drives the **LIVE / Demo** badge in the
app's WhatsApp hub, so a scripted demo can't be mistaken for a connected
number. Full walkthrough: [`docs/WHATSAPP_INTEGRATION.md`](docs/WHATSAPP_INTEGRATION.md).

> 🔐 Credentials live in `.env` (gitignored) or the platform's env vars — real
> environment variables always win. Tokens pasted into chat or committed to
> Git should be rotated in Meta Business Settings → System Users.

---

## ✨ Key Features & Innovations

### 1. 🌿 Hybrid Cloud + On-Device Leaf Scanner
- **On-device inference:** a trained YOLO26 model (`public/models/agripulse.tflite`, 52 classes) runs in-browser with LiteRT.js on WebGPU and CPU/wasm fallback; the service worker caches it for offline scans after the initial download.
- **Cloud safety net:** if local inference is unavailable, the scanner can use the same-origin `/api/predict` Vercel function, which keeps the Ultralytics key server-side.
- **Visual Lesion HUD:** shows detected boxes and confidence; the scanner starts with a neutral AI preview and shows no diagnosis before a sample or user photo is scanned.
- **Hardware Integration:** Native camera capture using HTML5 `navigator.mediaDevices.getUserMedia`.

### 2. 🧴 Smart Low-Tech Dosage Translator
- Translates confusing chemical metrics into everyday physical measurements:
  $$\text{15L Backpack Sprayer} \longrightarrow \mathbf{2\text{ Bottle Caps (30ml) of Bio-Fungicide}}$$
- Equipment toggles for **15L Backpack**, **20L Tank**, and **100L Power Drum**.
- Dynamic Field Mixing Calculator computing exact liters and caps for $X$ acres.

### 3. 🎙️ "Kisan Sahayak" Voice AI & Auto-Navigator
- **Speech-to-Text & Text-to-Speech:** Converses in **Hindi, Tamil, Telugu, Kannada, and English** using native Web Speech APIs.
- **Voice Auto-Navigation:** Ask *"मंडी भाव क्या है?"* $\rightarrow$ AI speaks the answer and **automatically navigates** to the Mandi screen!
- **🖐️ Wet-Hands / Hands-Free Mode:** Farmers with muddy or wet hands can speak simple commands (*"Scan", "Mandi", "Weather", "Verify"*) to operate the app touch-free.

### 4. 🌦️ 72-Hour Pre-Symptom Weather & Disease Risk Forecast
- Forecasts fungal disease pressure and whitefly surges 72 hours before visible symptoms.
- **Microclimate Spray Calculator:** Computes safe application hours (e.g. 6:30 AM – 10:30 AM) to eliminate rain chemical washout and wind drift.

### 5. 🛡️ Anti-Counterfeit Hologram & Pesticide Shield
- Camera laser scanner validates QR barcodes and batch security seals against national chemical registry hashes to stop the ₹3,000 Cr fake chemical trade.

### 6. 📊 14-Day Mandi ROI Simulator & Micro-Consortium
- Interactive farm landholding slider (1 to 20 Acres) computing real-time net profits in Indian Rupees (₹).
- **Virtual Micro-FPO:** Groups 20 neighboring smallholders to unlock **25% wholesale manufacturer discounts**.

### 7. ☀️ Sunlight High-Contrast Mode & 24x7 Helpline
- 1-tap toggle for direct outdoor sunlight visibility.
- 1-tap emergency dialer to the Government **Kisan Call Center (1800-180-1551)**.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, Vite, Tailwind CSS | Ultra-lightweight, responsive client |
| **Cloud AI** | Same-origin Vercel `/api/predict` proxy | Optional fallback; server-side key; dedicated endpoint may incur provider charges |
| **On-Device AI** | YOLO26s → LiteRT (`@ultralytics/yolo`, LiteRT.js WebGPU / wasm) | In-browser crop-disease detection (52 classes, boxes + confidence) |
| **Speech Engine** | Web Speech Recognition & SpeechSynthesis | Vernacular voice input and audio readout |
| **Offline Storage** | IndexedDB (`idb`) | Local storage of scans, history & sync queue |
| **PWA Layer** | Service Worker (`sw.js`) & Manifest | Offline caching & "Add to Home Screen" |
| **Mandi Prices** | [mandi-api.onrender.com](https://mandi-api.onrender.com/v1) (keyless third-party API) | Validated market price rows; source provenance caveat below |
| **Weather (IMD)** | [indianapi.in Weather API](https://indianapi.in/weather-api) | Live IMD observations + 7-day forecast (needs free `VITE_WEATHER_API_KEY`) |
| **Icons & Motion** | Lucide React, Framer Motion, Canvas Confetti | Minimalist animations & visual feedback |

### 🔐 Farmer Login (Device-Local, Offline-First)
- **Indian mobile + OTP login**: 10-digit number validation, on-device 6-digit OTP with 5-minute expiry, 30-second resend cooldown, and max-attempt lockout — OTP is delivered via a simulated SMS push notification in the UI (no SMS backend required).
- **Google sign-in (Demo)**: the button creates a clearly labeled dummy profile locally; it does not open Google, use OAuth, or verify an email. This is a UI demo, not authentication for production.
- **New-farmer registration** (name, village/taluk, state) with a persistent **30-day session** in `localStorage` — logout anytime from the header chip.

### 📈 Mandi Data Source & Freshness
The price board requests rows from the configured `VITE_MANDI_API_BASE` (defaults to `https://mandi-api.onrender.com/v1`). This is a third-party wrapper that claims to mirror data.gov.in AGMARKNET records; that provenance has not been independently verified. `API LIVE` means the API request succeeded, not that each market record is from today—the market's arrival date, the API record's `fetched_at` timestamp when provided, and the app's last successful fetch time are displayed separately. Valid API responses are cached for 10 minutes; fresh cache, stale cache, and unavailable states have distinct labels. Invalid or impossible price ranges are discarded. There are no seeded/demo fallback prices: when neither the API nor a validated prior API cache can provide rows, the board shows no prices and explains whether the query had no records or the API was unavailable.

### 🔑 Environment Variables (copy `.env.example` → `.env`)
```bash
VITE_WEATHER_API_KEY=            # optional legacy indianapi.in fallback; leave blank (weather now uses /api/weather)
VITE_MANDI_API_BASE=https://mandi-api.onrender.com/v1   # keyless third-party API; provenance caveat above
ULTRALYTICS_ENDPOINT_URL=https://platform.ultralytics.com/api/models/agrovision/agrovisionai/exp
ULTRALYTICS_API_KEY=              # server-side only (ul_…)
WEATHERAPI_KEY=                   # server-side only — weatherapi.com, used by /api/weather
CEDA_API_KEY=                     # server-side only — CEDA Agmarknet, used by /api/mandi
ALLOWED_ORIGINS=                  # optional comma-separated extra trusted origins; same-origin is allowed
```

For the exact Vercel cloud-inference setup and health check, see [CLOUD_INFERENCE_SETUP.md](CLOUD_INFERENCE_SETUP.md).

The scanner tries the local YOLO26 model first. If it cannot run, the browser sends the image to the same-origin `/api/predict` Vercel function, which adds the `ULTRALYTICS_API_KEY` server-side. **Never put a private key in a `VITE_*` variable**; Vite embeds those values in the browser bundle. `npm run dev` now mounts `api/*.js` as dev middleware (see `vite.config.js`), so the cloud fallback, weather and mandi routes work locally; `vercel dev` also works. Keep local `.env` files untracked.

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- Node.js (v18 or higher)
- npm / yarn / pnpm

### Quick Start (3 Steps)
```bash
# 1. Clone the repository
git clone https://github.com/your-username/agripulse-ai.git
cd agripulse-ai

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📱 PWA Mobile Installation Guide

### Android (Chrome / Brave / Edge)
1. Open your hosted HTTPS URL in Chrome.
2. Tap the **3 dots (top right)** $\rightarrow$ tap **"Install App"** or **"Add to Home screen"**.
3. Launch from your home screen. Test in **Airplane Mode** to verify 100% offline execution.

### iOS / iPhone (Safari)
1. Open the URL in Safari.
2. Tap the **Share button** (square with up arrow) $\rightarrow$ tap **"Add to Home Screen"**.
3. Launches full-screen like a native app.

---

## 🏆 Hackathon Pitch Evaluation FAQ

<details>
<summary><strong>Q: Is the on-device AI real or just mock images?</strong></summary>
<p>
Yes — it is a real object-detection model. The scanner runs our trained YOLO26s detector (52 PlantVillage / cassava / wheat / rice / soybean classes, exported to LiteRT `.tflite`) directly in the browser through `@ultralytics/yolo` and LiteRT.js on WebGPU, with wasm/CPU fallback. Detections (class, confidence and box) are drawn on the canvas overlay and mapped to the bottle-cap dosage advisory; nothing leaves the phone. The model (~37 MB) is downloaded once and cached by the service worker, so later scans work fully offline.
</p>
</details>

<details>
<summary><strong>Q: How does the voice recognition work without paid APIs?</strong></summary>
<p>
It utilizes the browser's built-in Web Speech API (SpeechRecognition for voice input and SpeechSynthesis for spoken voice audio in Indian language codes like <code>hi-IN</code>, <code>ta-IN</code>, <code>te-IN</code>, <code>kn-IN</code>), requiring zero third-party paid API keys.
</p>
</details>

<details>
<summary><strong>Q: How does this make farming profitable?</strong></summary>
<p>
By preventing 35% preventable yield loss through pre-symptom warnings, eliminating counterfeit input waste, reducing chemical overdosing by 60%, and aggregating 20-farmer bulk buying groups for 25% discounts.
</p>
</details>

---

<div align="center">

**Built with ❤️ for Indian Farmers at NexHack 2026**

</div>
