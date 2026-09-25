import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import {
  ArrowLeft, KeyRound, ShieldCheck, Smartphone, MessageSquareText,
  RefreshCw, Timer, User, MapPin, AlertTriangle, CheckCircle2, Leaf, QrCode,
} from 'lucide-react';
import { sound } from '../utils/audio';
import {
  isValidIndianMobile, isValidName, normalizeMobile, getUser, registerUser,
  updateLastLogin, requestOtp, verifyOtp, saveSession,
  enableTotp, setTotpSkipped, verifyUserTotp, isTotpEnabled,
  serverSendOtp, serverVerifyOtp, fetchGoogleConfig, serverVerifyGoogle,
  upsertGoogleUser,
  OTP_RESEND_COOLDOWN_S,
} from '../utils/authService';
import {
  generateSecret, buildOtpAuthUri, verifyTotpCode, formatSecretForHumans,
  totpSecondsRemaining, totpNow, TOTP_PERIOD_S,
} from '../utils/totp';

const INDIAN_STATES = [
  'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha',
  'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];

// Bilingual strings (en + hi) — login happens before the in-app language switch
const L = {
  en: {
    tagline: 'Demo Farmer Login',
    phoneTitle: 'Choose a sign-in method',
    phoneSub: 'Google and mobile OTP are demo-only in this prototype; no external account or SMS service is used.',
    googleDemo: 'Continue with Google (Demo)',
    googleDemoNote: 'Demo only — no Google account is contacted.',
    googleRealNote: 'Verified by Google — no password needed.',
    googleVerified: 'Google account verified',
    googleFailed: 'Google sign-in failed. Please try again.',
    orMobile: 'or continue with mobile number',
    phoneLabel: 'Mobile Number',
    phonePlaceholder: '98765 43210',
    phoneHint: '10-digit Indian mobile number',
    sendOtp: 'Send OTP',
    invalidPhone: 'Please enter a valid 10-digit Indian mobile number (starts with 6-9).',
    newHere: 'New to AgriPulse? You will register on the next step.',
    regTitle: 'Create your farmer profile',
    regSub: 'This is your first login from this number. Tell us a little about you.',
    nameLabel: 'Full Name',
    namePlaceholder: 'e.g. Ramesh Kumar',
    villageLabel: 'Village / Taluk',
    villagePlaceholder: 'e.g. Maddur, Mandya',
    stateLabel: 'State',
    continueBtn: 'Continue & Send OTP',
    invalidName: 'Please enter your name (2–40 characters).',
    otpTitle: 'Enter verification code',
    otpSub: 'OTP sent to',
    otpHint: 'The code is valid for 5 minutes.',
    otpRealNote: 'Sent as a real SMS — check your phone’s messages.',
    otpOffline: 'Network unavailable. Reconnect and try again.',
    otpSendFailed: 'Could not send the SMS right now. Please try again.',
    smsBanner: 'SMS · AGRIPULSE',
    smsText: 'Your AgriPulse AI login OTP is',
    smsValid: 'Valid for 5 minutes. Do not share it with anyone.',
    verifyBtn: 'Verify & Login',
    resendIn: 'Resend OTP in',
    resendBtn: 'Resend OTP',
    resendMax: 'Resend limit reached. Please restart login.',
    attemptsLeft: 'attempts left',
    wrongOtp: 'Incorrect OTP.',
    expiredOtp: 'OTP expired. Please request a new one.',
    maxAttempts: 'Too many wrong attempts. Request a fresh OTP.',
    changeNumber: '← Change number',
    welcomeBack: 'Welcome back!',
    welcomeNew: 'Account created!',
    demoWelcome: 'Demo login ready!',
    demoStatus: 'Local demo profile · not verified',
    verified: 'Demo OTP accepted · not verified by a carrier',
    loading: 'Please wait…',
    secNote: 'Your data never leaves this device — login works fully offline.',
    // Google Authenticator (TOTP 2FA)
    methodSms: 'SMS OTP',
    methodTotp: 'Authenticator',
    totpContinueBtn: 'Continue with Authenticator',
    totpMethodHint: 'Set up once with a QR scan — then log in with offline 6-digit codes.',
    regContinueTotp: 'Continue to Authenticator setup',
    useTotpInstead: 'Use Google Authenticator instead',
    totp2faTag: 'Two-Factor Security',
    totpSetupTitle: 'Add Google Authenticator',
    totpSetupSub: 'Extra protection for your account. Codes are generated on your phone — no internet needed.',
    totpStep1: 'Install Google Authenticator (free, works offline)',
    totpStep2: 'Tap “+” → “Scan a QR code”',
    totpStep3: 'Enter the 6-digit code below to confirm',
    totpManualKey: 'Can’t scan? Enter this key in the app',
    totpConfirmHint: 'Enter the code shown in the app',
    totpConfirmBtn: 'Verify & Enable',
    totpSkip: 'Skip for now',
    totpSkippedNote: 'You can enable it after your next login.',
    totpWrongCode: 'That code didn’t match. Check your phone’s clock and try again.',
    totpVerifyTitle: 'Authenticator code',
    totpVerifySub: 'Open Google Authenticator and enter the current 6-digit code for',
    totpNewCodeIn: 'New code in {s}s',
    totp2faOn: 'Google Authenticator verified · 2FA active',
    totpMaxAttempts: 'Too many wrong codes. Please restart login.',
  },
  hi: {
    tagline: 'डेमो किसान लॉगिन',
    phoneTitle: 'लॉगिन का तरीका चुनें',
    phoneSub: 'इस प्रोटोटाइप में Google और मोबाइल OTP दोनों डेमो हैं; कोई बाहरी खाता या SMS सेवा उपयोग नहीं होती।',
    googleDemo: 'Google से जारी रखें (डेमो)',
    googleDemoNote: 'सिर्फ डेमो — कोई Google खाता उपयोग नहीं होगा।',
    googleRealNote: 'Google द्वारा सत्यापित — पासवर्ड की ज़रूरत नहीं।',
    googleVerified: 'Google खाता सत्यापित',
    googleFailed: 'Google साइन-इन विफल। दोबारा कोशिश करें।',
    orMobile: 'या मोबाइल नंबर से जारी रखें',
    phoneLabel: 'मोबाइल नंबर',
    phonePlaceholder: '98765 43210',
    phoneHint: '10 अंकों का भारतीय मोबाइल नंबर',
    sendOtp: 'OTP भेजें',
    invalidPhone: 'कृपया सही 10 अंकों का मोबाइल नंबर डालें (6-9 से शुरू)।',
    newHere: 'AgriPulse पर नए हैं? अगले चरण में रजिस्ट्रेशन होगा।',
    regTitle: 'अपनी किसान प्रोफाइल बनाएं',
    regSub: 'इस नंबर से पहली बार लॉगिन है। अपनी जानकारी दें।',
    nameLabel: 'पूरा नाम',
    namePlaceholder: 'जैसे: रमेश कुमार',
    villageLabel: 'गांव / तालुका',
    villagePlaceholder: 'जैसे: मद्दूर, मांड्या',
    stateLabel: 'राज्य',
    continueBtn: 'आगे बढ़ें, OTP भेजें',
    invalidName: 'कृपया अपना नाम लिखें (2–40 अक्षर)।',
    otpTitle: 'OTP दर्ज करें',
    otpSub: 'OTP भेजा गया',
    otpHint: 'कोड 5 मिनट के लिए मान्य है।',
    otpRealNote: 'असली SMS भेजा गया है — अपने फोन के मैसेज देखें।',
    otpOffline: 'नेटवर्क उपलब्ध नहीं। कनेक्ट होकर दोबारा कोशिश करें।',
    otpSendFailed: 'अभी SMS नहीं भेजा जा सका। कृपया दोबारा कोशिश करें।',
    smsBanner: 'SMS · AGRIPULSE',
    smsText: 'आपका AgriPulse AI लॉगिन OTP है',
    smsValid: '5 मिनट के लिए मान्य। किसी को बताएं नहीं।',
    verifyBtn: 'सत्यापित करके लॉगिन करें',
    resendIn: 'फिर से OTP भेजें',
    resendBtn: 'OTP फिर भेजें',
    resendMax: 'भेजने की सीमा पूरी। लॉगिन फिर शुरू करें।',
    attemptsLeft: 'प्रयास शेष',
    wrongOtp: 'गलत OTP।',
    expiredOtp: 'OTP समाप्त हो गया। नया OTP मंगवाएं।',
    maxAttempts: 'बहुत गलत प्रयास। नया OTP मंगवाएं।',
    changeNumber: '← नंबर बदलें',
    welcomeBack: 'फिर से स्वागत है!',
    welcomeNew: 'खाता बन गया!',
    demoWelcome: 'डेमो लॉगिन तैयार है!',
    demoStatus: 'स्थानीय डेमो प्रोफाइल · सत्यापित नहीं',
    verified: 'डेमो OTP स्वीकार · मोबाइल नेटवर्क से सत्यापित नहीं',
    loading: 'कृपया प्रतीक्षा करें…',
    secNote: 'आपका डेटा इसी डिवाइस पर रहता है — लॉगिन पूरी तरह ऑफलाइन चलता है।',
    // Google Authenticator (TOTP 2FA)
    methodSms: 'SMS OTP',
    methodTotp: 'ऑथेंटिकेटर',
    totpContinueBtn: 'ऑथेंटिकेटर से जारी रखें',
    totpMethodHint: 'एक बार QR स्कैन से सेटअप — फिर ऑफलाइन 6-अंकों के कोड से लॉगिन।',
    regContinueTotp: 'ऑथेंटिकेटर सेटअप पर आगे बढ़ें',
    useTotpInstead: 'इसके बजाय Google Authenticator इस्तेमाल करें',
    totp2faTag: 'दो-चरणीय सुरक्षा',
    totpSetupTitle: 'Google Authenticator जोड़ें',
    totpSetupSub: 'आपके खाते के लिए अतिरिक्त सुरक्षा। कोड आपके फोन पर बनते हैं — इंटरनेट की ज़रूरत नहीं।',
    totpStep1: 'Google Authenticator इंस्टॉल करें (मुफ़्त, ऑफलाइन चलता है)',
    totpStep2: '“+” दबाएं → “QR कोड स्कैन करें”',
    totpStep3: 'पुष्टि के लिए नीचे 6-अंकों का कोड डालें',
    totpManualKey: 'स्कैन नहीं हो पा रहा? ऐप में यह कुंजी दर्ज करें',
    totpConfirmHint: 'ऐप में दिख रहा कोड दर्ज करें',
    totpConfirmBtn: 'सत्यापित करें और चालू करें',
    totpSkip: 'अभी छोड़ें',
    totpSkippedNote: 'अगले लॉगिन के बाद भी चालू कर सकते हैं।',
    totpWrongCode: 'कोड मेल नहीं खाया। फोन का समय जांचकर दोबारा कोशिश करें।',
    totpVerifyTitle: 'प्रमाणीकरण कोड',
    totpVerifySub: 'Google Authenticator खोलें और इसके लिए मौजूदा 6-अंकों का कोड दर्ज करें:',
    totpNewCodeIn: 'नया कोड {s} सेकंड में',
    totp2faOn: 'Google Authenticator सत्यापित · 2FA सक्रिय',
    totpMaxAttempts: 'बहुत गलत कोड। लॉगिन फिर से शुरू करें।',
  },
};

// ── Reusable 6-digit code input (used by the authenticator screens) ──────────
// The parent remounts this via `key` to clear the boxes (e.g. after a wrong
// code) — remount resets the state and autoFocus re-focuses the first box.
function CodeBoxes({ onComplete, disabled = false }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = useRef([]);

  const handleChange = (i, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = digit;
    setDigits(next);
    sound.playClick();
    if (digit && i < 5) refs.current[i + 1]?.focus();
    if (digit && i === 5 && next.every((d) => d !== '')) onComplete(next.join(''));
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setDigits(next);
      onComplete(next.join(''));
      e.preventDefault();
    }
  };

  return (
    <div className="flex w-full min-w-0 gap-1 sm:gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="tel"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          disabled={disabled}
          autoFocus={i === 0}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="box-border w-10 max-w-11 min-w-0 flex-1 h-12 sm:h-13 bg-white text-zinc-900 py-2 px-0 text-center text-xl font-black border-2 border-zinc-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-60"
        />
      ))}
    </div>
  );
}

// ── QR code canvas for the otpauth:// provisioning URI ───────────────────────
function TotpQr({ uri, size = 208 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !uri) return undefined;
    QRCode.toCanvas(canvasRef.current, uri, {
      width: size,
      margin: 2,                 // quiet zone — required for reliable scanning
      errorCorrectionLevel: 'M',
      color: { dark: '#090a09', light: '#ffffff' },
    }).catch(() => {});           // non-fatal: manual key entry remains available
    return undefined;
  }, [uri, size]);

  return (
    <div className="p-3 bg-white rounded-2xl border-2 border-zinc-200 shadow-inner">
      <canvas ref={canvasRef} className="block rounded-lg" style={{ width: size, height: size }} />
    </div>
  );
}

// ── Google Identity Services script loader (module-level cache) ──────────────
let gsiPromise = null;
function loadGsiScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no_window'));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gsiPromise) {
    gsiPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => { gsiPromise = null; reject(new Error('gsi_load_failed')); };
      document.head.appendChild(s);
    });
  }
  return gsiPromise;
}

export default function LoginPage({ onSuccess, onCancel, selectedLang = 'hi', setSelectedLang }) {
  const l = L[selectedLang] || L.en;

  const [step, setStep] = useState('phone'); // phone | register | otp | success
  const [phone, setPhone] = useState('');
  const [loginMethod, setLoginMethod] = useState('sms'); // 'sms' | 'totp' (Google Authenticator)
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [stateName, setStateName] = useState('Karnataka');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [smsOtp, setSmsOtp] = useState(null);       // simulated SMS payload
  const [showSms, setShowSms] = useState(false);
  const [serverOtp, setServerOtp] = useState(null);  // { token } when the code went as a real SMS
  const [cooldown, setCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [resendLocked, setResendLocked] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [welcomeEmail, setWelcomeEmail] = useState('');
  const [isDemoLogin, setIsDemoLogin] = useState(false);
  const [googleCfg, setGoogleCfg] = useState(null);   // null=loading, {configured,clientId}
  const [loginProvider, setLoginProvider] = useState('phone'); // 'phone' | 'google' | 'google-demo'
  const googleBtnRef = useRef(null);
  const [isReturning, setIsReturning] = useState(false);

  // ── Google Authenticator (TOTP 2FA) state ──────────────────────────────
  const [pendingProfile, setPendingProfile] = useState(null); // authenticated, awaiting 2FA
  const [totpSecret, setTotpSecret] = useState('');           // not yet persisted (enrollment)
  const [totpResetKey, setTotpResetKey] = useState(0);         // clears the code boxes
  const [totpAttempts, setTotpAttempts] = useState(5);
  const [totpVerified, setTotpVerified] = useState(false);
  const [totpSecLeft, setTotpSecLeft] = useState(totpSecondsRemaining());

  const otpRefs = useRef([]);

  // 30-second code-rotation ticker (authenticator apps rotate codes)
  useEffect(() => {
    const id = setInterval(() => setTotpSecLeft(totpSecondsRemaining()), 1000);
    return () => clearInterval(id);
  }, []);

  // DEV ONLY: print the current authenticator code so the team can demo the
  // 2FA screen without a phone. Stripped from production builds by the bundler.
  useEffect(() => {
    if (step !== 'totp' || !import.meta.env.DEV) return;
    const secret = pendingProfile?.totp?.secret;
    if (secret) {
      console.log(
        `%c[AgriPulse DEV] current authenticator code: ${totpNow(secret)}`,
        'background:#10b981;color:#000;padding:4px 8px;border-radius:4px;font-weight:bold',
      );
    }
  }, [step, pendingProfile]);

  // Resend cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const sendOtpFlow = async (mobile) => {
    // 1) Real SMS delivery — server route with a configured gateway.
    //    The code goes to the farmer's phone and is NEVER shown on the website.
    const srv = await serverSendOtp(mobile, serverOtp?.token);
    if (srv.ok) {
      setServerOtp({ token: srv.token });
      setSmsOtp(null);
      setShowSms(false);
      setCooldown(OTP_RESEND_COOLDOWN_S);
      setAttemptsLeft(3);
      setResendLocked(false);
      setError('');
      sound.playSuccess();
      return true;
    }
    if (srv.error === 'cooldown') {
      setCooldown(srv.waitSeconds || OTP_RESEND_COOLDOWN_S);
      return false;
    }
    if (srv.error === 'max_sends') {
      setResendLocked(true);
      setError(l.resendMax);
      return false;
    }
    if (srv.error === 'sms_failed') {
      setError(l.otpSendFailed);
      return false;
    }
    // 2) No gateway configured / offline → on-screen demo OTP (offline-first)
    setServerOtp(null);
    const res = requestOtp(mobile);
    if (!res.ok) {
      if (res.error === 'max_sends') {
        setResendLocked(true);
        setError(l.resendMax);
      } else if (res.error === 'cooldown') {
        setCooldown(res.waitSeconds || OTP_RESEND_COOLDOWN_S);
      }
      return false;
    }
    setSmsOtp(res.otp);
    setShowSms(true);
    setCooldown(OTP_RESEND_COOLDOWN_S);
    setAttemptsLeft(3);
    setResendLocked(false);
    setError('');
    sound.playSuccess();
    setTimeout(() => setShowSms(false), 12000); // auto-hide SMS toast
    return true;
  };

  // ── REAL Google sign-in (GIS button → server-verified ID token) ────────

  const handleGoogleCredential = async (credential) => {
    setBusy(true);
    setError('');
    const res = await serverVerifyGoogle(credential);
    setBusy(false);
    if (res.ok && res.profile) {
      const profile = upsertGoogleUser(res.profile);
      const session = saveSession({ ...profile, authProvider: 'google' });
      setLoginProvider('google');
      setIsDemoLogin(false);
      setTotpVerified(false);
      setWelcomeName(profile.name);
      setWelcomeEmail(profile.email);
      setIsReturning(true);
      sound.playSuccess();
      setStep('success');
      setTimeout(() => onSuccess(session), 1400);
      return;
    }
    sound.playTransition();
    setError(res.error === 'offline' ? l.otpOffline : l.googleFailed);
  };

  // Probe /api/google once: with GOOGLE_CLIENT_ID set we render the real
  // "Continue with Google" button; otherwise we keep the demo button.
  useEffect(() => {
    let alive = true;
    fetchGoogleConfig().then((cfg) => { if (alive) setGoogleCfg(cfg); });
    return () => { alive = false; };
  }, []);

  // Render the official GIS button once the script + client id are ready
  useEffect(() => {
    if (step !== 'phone' || !googleCfg?.configured) return undefined;
    let cancelled = false;
    loadGsiScript().then(() => {
      if (cancelled || !googleBtnRef.current || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: googleCfg.clientId,
        callback: (resp) => handleGoogleCredential(resp.credential),
        cancel_on_tap_outside: true,
      });
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: 320,
      });
    }).catch(() => {
      // GIS script unreachable (offline) → fall back to the demo button
      setGoogleCfg({ configured: false });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, googleCfg]);

  const handleGoogleDemoLogin = () => {
    sound.playClick();
    setError('');
    setBusy(true);
    setIsDemoLogin(true);
    setLoginProvider('google-demo');

    // Deliberately local demo identity: this does not contact Google or verify an account.
    setTimeout(() => {
      const demoProfile = {
        name: 'Demo Farmer',
        email: 'farmer.demo@example.com',
        mobile: '',
        village: 'Demo Farm',
        state: 'Karnataka',
        authProvider: 'google-demo',
      };
      const session = saveSession(demoProfile);
      setWelcomeName(demoProfile.name);
      setWelcomeEmail(demoProfile.email);
      setIsReturning(false);
      setBusy(false);
      setStep('success');
      sound.playSuccess();
      setTimeout(() => onSuccess(session), 1200);
    }, 450);
  };

  const handlePhoneSubmit = () => {
    sound.playClick();
    setIsDemoLogin(false);
    setWelcomeEmail('');
    const mobile = normalizeMobile(phone);
    if (!isValidIndianMobile(mobile)) {
      setError(l.invalidPhone);
      sound.playTransition();
      return;
    }
    setError('');
    setBusy(true);
    // Simulate network dispatch latency of an SMS gateway / lookup
    setTimeout(async () => {
      setBusy(false);
      const existing = getUser(mobile);
      if (loginMethod === 'totp') {
        // Authenticator path: the rotating code IS the verification.
        if (existing && isTotpEnabled(existing)) {
          setIsReturning(true);
          setPendingProfile(existing);
          setTotpAttempts(5);
          setTotpResetKey((k) => k + 1);
          setStep('totp');
        } else if (existing) {
          // Known number, no authenticator yet → offer enrollment now
          setIsReturning(true);
          setPendingProfile(existing);
          setTotpSecret(generateSecret());
          setTotpResetKey((k) => k + 1);
          setStep('totp-setup');
        } else {
          setIsReturning(false);
          setStep('register');
        }
        return;
      }
      if (existing) {
        setIsReturning(true);
        if (await sendOtpFlow(mobile)) setStep('otp');
      } else {
        setIsReturning(false);
        setStep('register');
      }
    }, 700);
  };

  const handleRegisterSubmit = () => {
    sound.playClick();
    if (!isValidName(name)) {
      setError(l.invalidName);
      sound.playTransition();
      return;
    }
    setError('');
    setBusy(true);
    setTimeout(async () => {
      setBusy(false);
      if (loginMethod === 'totp') {
        // Authenticator path: enroll straight after registration — no SMS involved
        setPendingProfile(null);
        setTotpSecret(generateSecret());
        setTotpResetKey((k) => k + 1);
        setStep('totp-setup');
      } else if (await sendOtpFlow(normalizeMobile(phone))) setStep('otp');
    }, 700);
  };

  // Common success path — persists the session and hands off to the app
  const finalizeLogin = (profile) => {
    setLoginProvider('phone');
    const mobile = normalizeMobile(phone);
    const finalProfile = (isReturning ? updateLastLogin(mobile) : null) || profile;
    const session = saveSession(finalProfile);
    setWelcomeName(finalProfile.name);
    sound.playSuccess();
    setStep('success');
    setTimeout(() => onSuccess(session), 1500);
  };

  // Shared post-OTP-success routing (2FA enrollment / verification / plain login)
  const completeOtpSuccess = (mobile) => {
    const profile = isReturning
      ? getUser(mobile)
      : registerUser({ name, mobile, village, state: stateName });
    if (!profile) {
      setError(l.maxAttempts);
      return;
    }
    if (isTotpEnabled(profile)) {
      setPendingProfile(profile);
      setTotpAttempts(5);
      setTotpResetKey((k) => k + 1);
      setError('');
      setStep('totp');
      return;
    }
    if (profile.totpSkipped) {
      finalizeLogin(profile);
      return;
    }
    setPendingProfile(profile);
    setTotpSecret(generateSecret());
    setTotpResetKey((k) => k + 1);
    setError('');
    setStep('totp-setup');
  };

  const handleVerifyFail = (res) => {
    sound.playTransition();
    if (res.error === 'wrong_code') {
      setAttemptsLeft(res.attemptsLeft);
      setError(`${l.wrongOtp} ${res.attemptsLeft} ${l.attemptsLeft}.`);
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } else if (res.error === 'expired') {
      setError(l.expiredOtp);
    } else {
      setError(l.maxAttempts);
    }
  };

  const handleVerify = (digits) => {
    const code = (digits || otpDigits).join('');
    if (code.length !== 6) return;
    setBusy(true);
    const mobile = normalizeMobile(phone);
    if (serverOtp) {
      // Real SMS path — the code lives on the farmer's phone, verified server-side
      serverVerifyOtp(mobile, code, serverOtp.token).then((res) => {
        setBusy(false);
        if (res.ok) {
          completeOtpSuccess(mobile);
          return;
        }
        if (res.token) setServerOtp({ token: res.token }); // attempts decremented server-side
        if (res.error === 'offline') {
          setError(l.otpOffline);
          return;
        }
        handleVerifyFail(res);
      });
      return;
    }
    setTimeout(() => {
      setBusy(false);
      const res = verifyOtp(mobile, code);
      if (res.ok) {
        completeOtpSuccess(mobile);
        return;
      }
      handleVerifyFail(res);
    }, 600);
  };

  // ── Google Authenticator (TOTP 2FA) handlers ───────────────────────────

  const handleTotpFail = () => {
    const left = totpAttempts - 1;
    setTotpAttempts(left);
    if (left <= 0) {
      setError(l.totpMaxAttempts);
      setTimeout(() => {
        setStep('phone');
        setError('');
        setTotpAttempts(5);
        setPendingProfile(null);
        setTotpSecret('');
      }, 1600);
      return false;
    }
    setError(`${l.totpWrongCode} ${left} ${l.attemptsLeft}.`);
    setTotpResetKey((k) => k + 1);
    return false;
  };

  // Enrollment: the secret is only persisted after a live code matches
  const handleTotpSetupConfirm = (code) => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const res = verifyTotpCode(totpSecret, code);
      if (res.ok) {
        const mobile = normalizeMobile(phone);
        // Direct-authenticator sign-ups register here (the SMS path registers after its OTP)
        if (!getUser(mobile)) registerUser({ name, mobile, village, state: stateName });
        const profile = enableTotp(mobile, totpSecret) || pendingProfile;
        setTotpVerified(true);
        finalizeLogin(profile);
        return;
      }
      sound.playTransition();
      handleTotpFail();
    }, 450);
  };

  const handleTotpSkip = () => {
    sound.playClick();
    const mobile = normalizeMobile(phone);
    const profile = setTotpSkipped(mobile)
      || getUser(mobile)
      || registerUser({ name, mobile, village, state: stateName });
    setTotpVerified(false);
    finalizeLogin(profile);
  };

  // Login: verify the code from the authenticator app against the stored secret
  const handleTotpVerify = (code) => {
    if (busy) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const mobile = normalizeMobile(phone);
      const res = verifyUserTotp(mobile, code);
      if (res.ok) {
        setTotpVerified(true);
        finalizeLogin(pendingProfile);
        return;
      }
      sound.playTransition();
      handleTotpFail();
    }, 450);
  };

  const handleOtpChange = (i, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[i] = digit;
    setOtpDigits(next);
    setError('');
    sound.playClick();
    if (digit && i < 5) otpRefs.current[i + 1]?.focus();
    if (digit && i === 5 && next.every((d) => d !== '')) handleVerify(next);
  };

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otpDigits[i] && i > 0) {
      otpRefs.current[i - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setOtpDigits(next);
      handleVerify(next);
      e.preventDefault();
    }
  };

  const maskedPhone = `+91 ${normalizeMobile(phone).slice(0, 2)}•••••${normalizeMobile(phone).slice(7)}`;

  return (
    <div className="auth-page min-h-screen w-full bg-[#f4f7f5] text-zinc-900 flex items-center justify-center p-3 sm:p-4 relative overflow-x-hidden">
      {/* Simulated SMS push notification (demo delivery channel) */}
      <AnimatePresence>
        {showSms && smsOtp && (
          <motion.div
            initial={{ y: -90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-[94%] max-w-sm"
          >
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-900 text-white shadow-2xl border border-zinc-700">
              <div className="w-9 h-9 rounded-xl bg-emerald-400 flex items-center justify-center shrink-0">
                <MessageSquareText className="w-5 h-5 text-black" />
              </div>
              <div className="text-left min-w-0">
                <div className="text-[10px] font-black tracking-widest text-zinc-400">{l.smsBanner} · {l.loading.includes('…') ? 'अभी' : 'now'}</div>
                <div className="text-xs font-bold mt-0.5">
                  {l.smsText} <span className="text-emerald-400 font-mono text-base tracking-widest">{smsOtp}</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">{l.smsValid}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-sm min-w-0 bg-white text-zinc-900 rounded-3xl shadow-lg border border-zinc-200 overflow-hidden relative">
        {/* Back / cancel */}
        <button
          onClick={() => {
            sound.playClick();
            if (step === 'otp') { setStep(isReturning ? 'phone' : 'register'); setOtpDigits(['', '', '', '', '', '']); setError(''); }
            else if (step === 'register') { setStep('phone'); setError(''); }
            else if (step === 'totp' || step === 'totp-setup') {
              setStep('phone');
              setError('');
              setBusy(false);
              setTotpAttempts(5);
              setPendingProfile(null);
              setTotpSecret('');
            }
            else onCancel();
          }}
          className="absolute top-4 left-4 p-2 text-zinc-500 hover:text-zinc-600 rounded-full hover:bg-zinc-100 z-10"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Mini language toggle */}
        {setSelectedLang && (
          <div className="absolute top-4 right-4 flex rounded-lg overflow-hidden border border-zinc-200 text-[11px] font-black">
            {['en', 'hi'].map((code) => (
              <button
                key={code}
                onClick={() => { sound.playClick(); setSelectedLang(code); }}
                className={`px-3 py-1.5 ${selectedLang === code ? 'bg-emerald-500 text-white' : 'bg-white text-zinc-600'}`}
              >
                {code === 'en' ? 'EN' : 'हिं'}
              </button>
            ))}
          </div>
        )}

        <div className="min-w-0 px-5 py-8 pt-14 sm:px-8 flex flex-col items-center text-center">
          {/* ── STEP: phone ─────────────────────────────── */}
          {step === 'phone' && (
            <>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-5">
                <Smartphone className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-[10px] font-black tracking-[0.2em] text-emerald-600 uppercase mb-1">{l.tagline}</div>
              <h2 className="text-2xl font-black text-zinc-900 mb-2">{l.phoneTitle}</h2>
              <p className="text-sm text-zinc-500 mb-5">{l.phoneSub}</p>

              {googleCfg?.configured ? (
                <>
                  <div ref={googleBtnRef} className="w-full min-h-11 flex justify-center" />
                  <p className="w-full text-center text-[10px] text-zinc-500 mt-2">{l.googleRealNote}</p>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleDemoLogin}
                    disabled={busy}
                    className="w-full min-h-12 flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-zinc-800 border-2 border-zinc-300 hover:bg-zinc-50 disabled:opacity-60 font-bold text-sm shadow-sm transition-colors"
                  >
                    <span aria-hidden="true" className="font-black text-xl leading-none text-[#4285F4]">G</span>
                    <span>{busy && isDemoLogin ? l.loading : l.googleDemo}</span>
                  </button>
                  <p className="w-full text-center text-[10px] text-zinc-500 mt-2">{l.googleDemoNote}</p>
                </>
              )}

              <div className="w-full flex items-center gap-3 my-5" aria-hidden="true">
                <span className="h-px flex-1 bg-zinc-200" />
                <span className="text-[10px] font-bold text-zinc-500">{l.orMobile}</span>
                <span className="h-px flex-1 bg-zinc-200" />
              </div>

              <div className="w-full text-left mb-1.5">
                <label className="text-xs font-black text-zinc-700">{l.phoneLabel}</label>
              </div>
              <div className="phone-number-row w-full min-w-0 items-center mb-1">
                <div className="flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-2.5 sm:px-3 py-3 rounded-xl bg-zinc-100 border-2 border-zinc-200 font-black text-zinc-700 text-sm">
                  <span>🇮🇳</span> +91
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  value={phone}
                  autoFocus
                  onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
                  onKeyDown={(e) => e.key === 'Enter' && handlePhoneSubmit()}
                  placeholder={l.phonePlaceholder}
                  className="phone-number-input block box-border w-full min-w-0 max-w-full bg-white text-zinc-900 placeholder:text-zinc-400 px-2.5 sm:px-4 py-3 text-base sm:text-lg font-black tracking-[0.12em] sm:tracking-[0.18em] border-2 border-zinc-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="w-full text-left text-[11px] text-zinc-500 mb-3">{l.phoneHint} · {phone.length}/10</div>

              {/* Verification method — pick SMS or Google Authenticator */}
              <div className="w-full grid grid-cols-2 gap-1 p-1 mb-4 bg-zinc-100 rounded-xl border border-zinc-200" role="tablist" aria-label="Verification method">
                {['sms', 'totp'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={loginMethod === m}
                    onClick={() => { sound.playClick(); setLoginMethod(m); setError(''); }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-black transition-colors ${loginMethod === m ? 'bg-white text-emerald-700 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    {m === 'sms'
                      ? <Smartphone className="w-4 h-4 shrink-0" />
                      : <QrCode className="w-4 h-4 shrink-0" />}
                    {m === 'sms' ? l.methodSms : l.methodTotp}
                  </button>
                ))}
              </div>

              {error && (
                <div className="w-full flex items-center gap-2 p-2.5 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={handlePhoneSubmit}
                disabled={busy}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black text-sm shadow-md transition-colors"
              >
                {busy ? l.loading : loginMethod === 'totp' ? l.totpContinueBtn : l.sendOtp}
              </button>
              <p className="text-[11px] text-zinc-500 mt-4">{loginMethod === 'totp' ? l.totpMethodHint : l.newHere}</p>
            </>
          )}

          {/* ── STEP: register (new numbers only) ────────── */}
          {step === 'register' && (
            <>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-5">
                <User className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-2">{l.regTitle}</h2>
              <p className="text-sm text-zinc-500 mb-6">{l.regSub}</p>

              <div className="w-full space-y-3 text-left">
                <div>
                  <label className="text-xs font-black text-zinc-700">{l.nameLabel}</label>
                  <input
                    type="text"
                    value={name}
                    autoFocus
                    maxLength={40}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    placeholder={l.namePlaceholder}
                    className="box-border mt-1 w-full min-w-0 bg-white text-zinc-900 placeholder:text-zinc-400 px-4 py-3 text-sm font-bold border-2 border-zinc-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-zinc-700 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-600" /> {l.villageLabel}</label>
                  <input
                    type="text"
                    value={village}
                    maxLength={50}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder={l.villagePlaceholder}
                    className="box-border mt-1 w-full min-w-0 bg-white text-zinc-900 placeholder:text-zinc-400 px-4 py-3 text-sm font-bold border-2 border-zinc-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-zinc-700">{l.stateLabel}</label>
                  <select
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="mt-1 w-full px-4 py-3 text-sm font-bold border-2 border-zinc-200 rounded-xl focus:border-emerald-500 focus:outline-none bg-white"
                  >
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {error && (
                <div className="w-full flex items-center gap-2 p-2.5 mt-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={handleRegisterSubmit}
                disabled={busy}
                className="mt-6 w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black text-sm shadow-md transition-colors"
              >
                {busy ? l.loading : loginMethod === 'totp' ? l.regContinueTotp : l.continueBtn}
              </button>
            </>
          )}

          {/* ── STEP: otp ───────────────────────────────── */}
          {step === 'otp' && (
            <>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-5">
                <KeyRound className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-1">{l.otpTitle}</h2>
              <p className="text-sm text-zinc-500">{l.otpSub} <strong className="text-zinc-800 font-mono">{maskedPhone}</strong></p>
              <p className="text-[11px] text-zinc-500 mb-6">{l.otpHint}</p>

              <div className="flex w-full min-w-0 gap-1 sm:gap-2 justify-center mb-3" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoFocus={i === 0}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="box-border w-10 max-w-11 min-w-0 flex-1 h-12 sm:h-13 bg-white text-zinc-900 py-2 px-0 text-center text-xl font-black border-2 border-zinc-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                ))}
              </div>

              {error && (
                <div className="w-full flex items-center gap-2 p-2.5 mb-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {/* Real SMS: code went to the farmer's phone — never displayed here */}
              {serverOtp && (
                <div className="w-full flex items-center gap-2.5 p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-left">
                  <Smartphone className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs font-bold text-emerald-800">{l.otpRealNote}</div>
                </div>
              )}

              {/* Persistent demo-SMS card (demo mode only — no SMS gateway configured) */}
              {!serverOtp && smsOtp && (
                <div className="w-full flex items-center gap-2.5 p-3 mb-4 rounded-xl bg-zinc-900 text-white border border-zinc-700 text-left">
                  <MessageSquareText className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-[9px] font-black tracking-widest text-zinc-400">{l.smsBanner}</div>
                    <div className="text-xs font-bold">
                      {l.smsText} <span className="text-emerald-400 font-mono text-sm tracking-[0.25em]">{smsOtp}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full flex items-center justify-between text-xs mb-4">
                <button
                  onClick={() => { sound.playClick(); setStep(isReturning ? 'phone' : 'register'); setError(''); }}
                  className="font-bold text-zinc-500 hover:text-zinc-700"
                >
                  {l.changeNumber}
                </button>
                {!resendLocked ? (
                  cooldown > 0 ? (
                    <span className="flex items-center gap-1 font-bold text-zinc-500">
                      <Timer className="w-3.5 h-3.5" /> {l.resendIn} {cooldown}s
                    </span>
                  ) : (
                    <button
                      onClick={() => sendOtpFlow(normalizeMobile(phone))}
                      className="flex items-center gap-1 font-black text-emerald-600 hover:text-emerald-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> {l.resendBtn}
                    </button>
                  )
                ) : (
                  <span className="font-bold text-red-600">{resendLocked ? l.resendMax : ''}</span>
                )}
              </div>

              <button
                onClick={() => { sound.playClick(); handleVerify(); }}
                disabled={busy || otpDigits.some((d) => d === '')}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-black text-sm shadow-md transition-colors"
              >
                {busy ? l.loading : l.verifyBtn}
              </button>

              {/* Enrolled users can switch to their authenticator instead of the SMS code */}
              {isTotpEnabled(isReturning ? getUser(normalizeMobile(phone)) : null) && (
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setPendingProfile(getUser(normalizeMobile(phone)));
                    setTotpAttempts(5);
                    setTotpResetKey((k) => k + 1);
                    setError('');
                    setStep('totp');
                  }}
                  className="mt-3 w-full py-3 rounded-xl bg-white border-2 border-emerald-200 hover:bg-emerald-50 text-emerald-700 font-black text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-4 h-4" /> {l.useTotpInstead}
                </button>
              )}
            </>
          )}

          {/* ── STEP: totp-setup (enroll Google Authenticator) ── */}
          {step === 'totp-setup' && (
            <>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <QrCode className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-[10px] font-black tracking-[0.2em] text-emerald-600 uppercase mb-1">{l.totp2faTag}</div>
              <h2 className="text-2xl font-black text-zinc-900 mb-1">{l.totpSetupTitle}</h2>
              <p className="text-xs text-zinc-500 mb-4">{l.totpSetupSub}</p>

              <TotpQr uri={totpSecret ? buildOtpAuthUri({ secret: totpSecret, account: `+91${normalizeMobile(phone)}` }) : ''} />

              <ol className="w-full text-left text-[11px] font-bold text-zinc-600 space-y-1.5 my-4 list-none">
                {[l.totpStep1, l.totpStep2, l.totpStep3].map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black flex items-center justify-center">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>

              <div className="w-full mb-4">
                <div className="text-[10px] font-black text-zinc-500 mb-1">{l.totpManualKey}</div>
                <div className="font-mono text-[11px] leading-relaxed tracking-wider bg-zinc-100 border border-zinc-200 rounded-lg px-2.5 py-2 break-all text-zinc-700 select-all cursor-text">
                  {formatSecretForHumans(totpSecret)}
                </div>
              </div>

              <div className="w-full text-xs font-black text-zinc-700 mb-2">{l.totpConfirmHint}</div>
              <CodeBoxes key={`setup-${totpResetKey}`} onComplete={handleTotpSetupConfirm} disabled={busy} />

              {error && (
                <div className="w-full flex items-center gap-2 p-2.5 mt-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={handleTotpSkip}
                disabled={busy}
                className="mt-4 w-full py-3 rounded-xl bg-white border-2 border-zinc-200 hover:bg-zinc-50 disabled:opacity-60 text-zinc-500 font-black text-xs transition-colors"
              >
                {l.totpSkip}
              </button>
              <p className="text-[10px] text-zinc-400 mt-1.5">{l.totpSkippedNote}</p>
            </>
          )}

          {/* ── STEP: totp (verify authenticator code) ─────── */}
          {step === 'totp' && (
            <>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="text-[10px] font-black tracking-[0.2em] text-emerald-600 uppercase mb-1">{l.totp2faTag}</div>
              <h2 className="text-2xl font-black text-zinc-900 mb-1">{l.totpVerifyTitle}</h2>
              <p className="text-xs text-zinc-500 mb-1">{l.totpVerifySub}</p>
              <p className="text-xs font-mono font-bold text-zinc-800 mb-5">{maskedPhone}</p>

              <CodeBoxes key={`verify-${totpResetKey}`} onComplete={handleTotpVerify} disabled={busy} />

              {error && (
                <div className="w-full flex items-center gap-2 p-2.5 mt-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {/* Code rotation countdown — matches the authenticator app */}
              <div className="w-full flex items-center justify-between text-[11px] font-bold text-zinc-500 mt-4 mb-1.5">
                <span className="flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> {l.totpNewCodeIn.replace('{s}', totpSecLeft)}</span>
                <span className="flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3.5 h-3.5" /> 2FA</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden" aria-hidden="true">
                <div
                  className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(totpSecLeft / TOTP_PERIOD_S) * 100}%` }}
                />
              </div>

              <p className="text-[10px] text-zinc-400 mt-4">{l.secNote}</p>
            </>
          )}

          {/* ── STEP: success ───────────────────────────── */}
          {step === 'success' && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="py-8 flex flex-col items-center"
            >
              <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-black text-emerald-600">{isDemoLogin ? l.demoWelcome : isReturning ? l.welcomeBack : l.welcomeNew}</h2>
              <p className="text-base font-bold text-zinc-800 mt-1 flex items-center gap-1.5">
                <Leaf className="w-4 h-4 text-emerald-500" /> {welcomeName}
              </p>
              {welcomeEmail && (
                <p className="text-xs font-mono text-zinc-600 mt-1">
                  {welcomeEmail}{loginProvider === 'google' ? '' : ' · DEMO'}
                </p>
              )}
              <p className="text-xs font-mono text-zinc-500 mt-2 flex items-center gap-1">
                {isDemoLogin
                  ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  : <ShieldCheck className="w-3.5 h-3.5" />}
                {isDemoLogin
                  ? l.demoStatus
                  : loginProvider === 'google' ? l.googleVerified : l.verified}
              </p>
              {totpVerified && (
                <p className="mt-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] font-black text-emerald-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> {l.totp2faOn}
                </p>
              )}
            </motion.div>
          )}
        </div>

        {/* Footer strip */}
        <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-center gap-1.5 text-[10px] font-bold text-zinc-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> {l.secNote}
        </div>
      </div>
    </div>
  );
}
