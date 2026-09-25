# 🌾 Farmer Onboarding Playbook — "How will the farmer know how to use this?"

Short answer: **they won't figure out a 4-option login — so the app now shows ONE obvious path, speaks every step aloud, and pictures what happens next.** The rest happens through people they already trust.

---

## 1. What's built into the app (design answer)

| Feature | What a farmer sees |
|---|---|
| **One primary path** | Mobile number → big green "Send OTP" → name/village. Same flow as UPI/everything they already know. Google, Aadhaar, Authenticator live behind a collapsed "Other ways to sign in". |
| **🔊 सुनें / Listen button** | On every login screen. Speaks simple instructions in Hindi (Devanagari voice, with phonetic fallback so even devices without a Hindi voice speak clearly). |
| **Pictured 3-step guide** | On the first screen: 📱 number → 🔑 SMS code → 👤 name & village. Zero reading required to get the idea. |
| **"कैसे इस्तेमाल करें?" help sheet** | Bottom-sheet with numbered, step-specific instructions + a Listen button, in EN/हिं. |
| **Bilingual everywhere** | Every new string ships in English + Hindi. |

## 2. The field playbook (people answer)

No rural product self-onboards. Farmers adopt through **trusted intermediaries**:

1. **CSC / Seva Kendra operators** — every village has a Common Service Centre. The operator logs the farmer in once (2 min), the 30-day session means they rarely need to repeat it. Give CSC operators a one-page QR flyer.
2. **FPOs & cooperatives** — demo at the monthly group meeting; the group leader ("25-farmer group buy" users) onboards others.
3. **Krishi Vigyan Kendras / input dealers** — the pesticide shop is where disease questions already go. The anti-fake Verify tab is the hook there.
4. **WhatsApp-first distribution** — share the PWA link into village WhatsApp groups with a 30-second voice note in Hindi explaining "phone number daalo, code daalo, ho gaya".
5. **Voice-first positioning** — once inside, the app already speaks (VoiceAssistant). The login now matches that promise.

## 3. Demo-day script (60 seconds)

1. "Like UPI — enter your number." (farmer's muscle memory)
2. Real SMS arrives on *their actual phone* → type the code.
3. Name + village → in. Show the 3-step card: "This is the whole login. A 60-year-old farmer does this unaided."
4. Optional flex: "सुनें" button reads the instructions aloud — built for the 70% who struggle with text.
5. Advanced (only if judges ask): Google sign-in, Aadhaar OTP, Google Authenticator 2FA — all real, all behind 'Other ways'.

## 4. Principles we follow (for future contributors)

- The default screen offers exactly **one** action. Everything else is progressive disclosure.
- Any new login/verification option must ship with: bilingual strings + a voice script in `VOICE` + a line in `HELP`.
- Never assume literacy: icon + color + voice for every instruction.
