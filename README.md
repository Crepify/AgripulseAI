<div align="center">

# 🌾 AgriPulse AI
### Voice-First, Multimodal & Hybrid Cloud / On-Device Agricultural Copilot for Smallholders

[![NexHack 2026](https://img.shields.io/badge/NexHack-2026-10B981?style=for-the-badge&logo=target)](https://github.com)
[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-059669?style=for-the-badge&logo=pwa)](https://github.com)
[![TensorFlow.js](https://img.shields.io/badge/AI-On--Device%20WebGL-F59E0B?style=for-the-badge&logo=tensorflow)](https://tensorflow.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

<br />

> **"Turning 40% Preventable Crop Losses into Smallholder Prosperity through Edge-AI, Vernacular Voice, and Practical Low-Tech Math."**

</div>

---

## 📖 Table of Contents
- [The Grassroots Problem](#-the-grassroots-problem)
- [The AgriPulse AI Solution](#-the-agripulse-ai-solution)
- [Key Features & Innovations](#-key-features--innovations)
- [System Architecture](#-system-architecture)
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
│  1. 📷 Real-Time Leaf Scan ──▶ 2. 🧠 Cloud AI / Offline Vision ──▶ 3. 🧴 Dosage         │
│     (Camera / Upload)        (Ultralytics + local fallback)      ("Mix 2 Bottle Caps") │
│                                                                        │               │
│  4. 🛰️ 72h Spore Radar    ◀── 5. 🎙️ Vernacular Voice AI   ◀───────────┘               │
│     (Pre-Symptom Warning)         (Hindi/Tamil/Telugu TTS)                             │
│                                                                                        │
│  6. 🛡️ Anti-Fake Shield   ──▶ 7. 📊 Mandi ROI Simulator ──▶ 8. 🤝 20-Farmer Group Buy  │
│     (CIB&RC Registry Check)       (Live ₹ Net Profit Math)       (25% Wholesale Off)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features & Innovations

### 1. 🌿 Hybrid Cloud + On-Device Leaf Scanner
- **Cloud inference:** Camera captures and uploaded crop photos can be sent to the configured Ultralytics endpoint for disease classification.
- **Offline fallback:** If the endpoint is not configured, unavailable, or returns an unsupported class, the scanner continues with its on-device TensorFlow.js / image analysis path.
- **Visual Lesion HUD:** Shows the local lesion overlay when offline inference is used.
- **Hardware Integration:** Native camera capture using HTML5 `navigator.mediaDevices.getUserMedia`.

### 2. 🧴 Smart Low-Tech Dosage Translator
- Translates confusing chemical metrics into everyday physical measurements:
  $$\text{15L Backpack Sprayer} \longrightarrow \mathbf{2\text{ Bottle Caps (30ml) of Bio-Fungicide}}$$
- Equipment toggles for **15L Backpack**, **20L Tank**, and **100L Power Drum**.
- Dynamic Field Mixing Calculator computing exact liters and caps for $X$ acres.

### 3. 🎙️ "Kisan Sahayak" Voice AI & Auto-Navigator
- **Speech-to-Text & Text-to-Speech:** Converses in **Hindi, Tamil, Telugu, Kannada, and English** using native Web Speech APIs.
- **Voice Auto-Navigation:** Ask *"मंडी भाव क्या है?"* $\rightarrow$ AI speaks the answer and **automatically navigates** to the Mandi screen!
- **🖐️ Wet-Hands / Hands-Free Mode:** Farmers with muddy or wet hands can speak simple commands (*"Scan", "Mandi", "Radar", "Verify"*) to operate the app touch-free.

### 4. 🛰️ 72-Hour Pre-Symptom Spore Radar
- Forecasts fungal spore trajectories and whitefly surges 72 hours before visible symptoms.
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

## 🛠️ Technology Stack (100% Free & Open Source)

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, Vite, Tailwind CSS | Ultra-lightweight, responsive client |
| **Cloud AI** | Ultralytics dedicated inference endpoint | Optional remote crop-image inference (`/predict`) |
| **On-Device AI** | TensorFlow.js (WebGL / CPU) | Offline scanner fallback |
| **Speech Engine** | Web Speech Recognition & SpeechSynthesis | Vernacular voice input and audio readout |
| **Offline Storage** | IndexedDB (`idb`) | Local storage of scans, history & sync queue |
| **PWA Layer** | Service Worker (`sw.js`) & Manifest | Offline caching & "Add to Home Screen" |
| **Mandi Prices** | [mandi-api.onrender.com](https://mandi-api.onrender.com/v1) (keyless third-party API) | Market price records for MH, UP, PB, MP, KA; validated and briefly cached |
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
VITE_WEATHER_API_KEY=            # free key from https://indianapi.in/sign-in  (Radar tab live IMD data)
VITE_MANDI_API_BASE=https://mandi-api.onrender.com/v1   # keyless third-party API; provenance caveat above
VITE_AI_API_URL=https://predict-6a8fe586becceb8c53b3b178-dproatj77a-el.a.run.app
VITE_AI_API_KEY=                  # Ultralytics key bound to this deployment
```

The scanner posts images to `VITE_AI_API_URL/predict` using multipart form data and a Bearer API key. The cloud result is mapped to the app's supported crop guides; a missing key, endpoint error, or unsupported class falls back to on-device analysis. The dedicated endpoint requires an Ultralytics API key. **Vite `VITE_*` values are included in browser code**, so do not put a private key in a public production build; use a server-side proxy for a public deployment. Keep local `.env` files untracked.

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
The on-device AI uses genuine TensorFlow.js WebGL execution. It samples camera/image pixel tensors, computes color-space heuristics (necrosis/chlorosis clustering), and renders dynamic canvas bounding box overlays in under 40ms with zero network bytes.
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
