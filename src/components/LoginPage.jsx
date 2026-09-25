import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, KeyRound, ShieldCheck, Smartphone, MessageSquareText,
  RefreshCw, Timer, User, MapPin, AlertTriangle, CheckCircle2, Leaf,
  Fingerprint, BadgeCheck, LocateFixed, Mic, MicOff,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { speechEngine } from '../utils/speech';
import {
  isValidIndianMobile, isValidName, normalizeMobile, getUser, getUserByAadhaar, registerUser,
  updateLastLogin, requestOtp, verifyOtp, saveSession,
  OTP_RESEND_COOLDOWN_S,
  normalizeAadhaar, isValidAadhaar, formatAadhaar, maskAadhaar,
  requestAadhaarOtp, verifyAadhaarOtp, linkAadhaarToUser,
} from '../utils/authService';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand',
  'West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh','Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu','Lakshadweep',
];

// Bilingual strings (en + hi) — login happens before the in-app language switch
const L = {
  en: {
    tagline: 'Secure Farmer Login',
    phoneTitle: 'Choose a sign-in method',
    phoneSub: 'Mobile OTP and Aadhaar verification are demo-only offline checks — no external SMS or UIDAI call is made in this prototype.',
    googleDemo: 'Continue with Google (Demo)',
    googleDemoNote: 'Demo only — no Google account is contacted.',
    orMobile: 'or continue with mobile / Aadhaar',
    phoneLabel: 'Mobile Number',
    phonePlaceholder: '98765 43210',
    phoneHint: '10-digit Indian mobile number',
    sendOtp: 'Send OTP',
    invalidPhone: 'Please enter a valid 10-digit Indian mobile number (starts with 6-9).',
    newHere: 'New to AgriPulse? You will register on the next step.',
    regTitle: 'Create your farmer profile',
    regSub: 'First login from this number. Tell us a little about you.',
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
    verified: 'Demo OTP accepted · offline verified',
    loading: 'Please wait…',
    secNote: 'Your data never leaves this device — login works fully offline.',
    aadhaarLabel: 'Aadhaar Number',
    aadhaarPlaceholder: '1234 5678 9012',
    aadhaarHint: '12-digit Aadhaar (Verhoeff checksum verified offline)',
    aadhaarInvalid: 'Invalid Aadhaar — check 12 digits and checksum.',
    verifyAadhaar: 'Verify Aadhaar',
    aadhaarVerified: 'Aadhaar Verified ✓',
    aadhaarOtpSent: 'Aadhaar OTP sent',
    aadhaarLoginTitle: 'Login with Aadhaar',
    aadhaarLoginSub: 'Enter your 12-digit Aadhaar, verify via OTP, and we will find your linked mobile account.',
    aadhaarLinkTitle: 'Link Aadhaar for subsidies',
    aadhaarLinkSub: 'Aadhaar verification unlocks PM-Kisan and subsidy benefits. Offline Verhoeff check + OTP.',
    skipAadhaar: 'Skip for now',
    loginWithAadhaarBtn: 'Login with Aadhaar OTP',
    detectLocation: 'Auto-detect my state',
    detecting: 'Detecting…',
    locationDetected: 'Location detected',
    locationFailed: 'Could not detect location — select manually',
  },
  hi: {
    tagline: 'सुरक्षित किसान लॉगिन',
    phoneTitle: 'लॉगिन का तरीका चुनें',
    phoneSub: 'मोबाइल OTP और आधार सत्यापन इस प्रोटोटाइप में सिर्फ ऑफलाइन डेमो हैं — कोई बाहरी SMS या UIDAI कॉल नहीं होता।',
    googleDemo: 'Google से जारी रखें (डेमो)',
    googleDemoNote: 'सिर्फ डेमो — कोई Google खाता उपयोग नहीं होगा।',
    orMobile: 'या मोबाइल / आधार से जारी रखें',
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
    verified: 'डेमो OTP स्वीकार · ऑफलाइन सत्यापित',
    loading: 'कृपया प्रतीक्षा करें…',
    secNote: 'आपका डेटा इसी डिवाइस पर रहता है — लॉगिन पूरी तरह ऑफलाइन चलता है।',
    aadhaarLabel: 'आधार नंबर',
    aadhaarPlaceholder: '1234 5678 9012',
    aadhaarHint: '12 अंकों का आधार (ऑफलाइन Verhoeff जांच)',
    aadhaarInvalid: 'अमान्य आधार — 12 अंक और चेकसम जांचें।',
    verifyAadhaar: 'आधार सत्यापित करें',
    aadhaarVerified: 'आधार सत्यापित ✓',
    aadhaarOtpSent: 'आधार OTP भेजा गया',
    aadhaarLoginTitle: 'आधार से लॉगिन करें',
    aadhaarLoginSub: '12 अंकों का आधार डालें, OTP से सत्यापित करें, और आपका लिंक्ड खाता मिल जाएगा।',
    aadhaarLinkTitle: 'सब्सिडी के लिए आधार लिंक करें',
    aadhaarLinkSub: 'आधार सत्यापन से PM-किसान और सब्सिडी लाभ मिलते हैं। ऑफलाइन जांच + OTP।',
    skipAadhaar: 'अभी छोड़ें',
    loginWithAadhaarBtn: 'आधार OTP से लॉगिन',
    detectLocation: 'मेरी लोकेशन पहचानें',
    detecting: 'पहचान रहे हैं…',
    locationDetected: 'लोकेशन मिल गई',
    locationFailed: 'लोकेशन नहीं मिली — मैन्युअली चुनें',
  },
};

export default function LoginPage({ onSuccess, onCancel, selectedLang = 'hi', setSelectedLang }) {
  const l = L[selectedLang] || L.en;

  const [step, setStep] = useState('phone'); // phone | register | aadhaar_login | aadhaar_otp | otp | success
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [stateName, setStateName] = useState('Karnataka');
  const [aadhaar, setAadhaar] = useState('');
  const [aadhaarVerified, setAadhaarVerified] = useState(false);
  const [aadhaarOtpDigits, setAadhaarOtpDigits] = useState(['','','','','','']);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [smsOtp, setSmsOtp] = useState(null);
  const [aadhaarOtp, setAadhaarOtp] = useState(null);
  const [showSms, setShowSms] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [aadhaarCooldown, setAadhaarCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [resendLocked, setResendLocked] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [welcomeEmail, setWelcomeEmail] = useState('');
  const [isDemoLogin, setIsDemoLogin] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMsg, setLocationMsg] = useState('');
  const [voiceField, setVoiceField] = useState(null); // 'name' | 'village' | null
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  const otpRefs = useRef([]);
  const aadhaarOtpRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  useEffect(() => {
    if (aadhaarCooldown <= 0) return undefined;
    const id = setInterval(() => setAadhaarCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [aadhaarCooldown]);

  const sendOtpFlow = (mobile) => {
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
    setAadhaarOtp(null);
    setShowSms(true);
    setCooldown(OTP_RESEND_COOLDOWN_S);
    setAttemptsLeft(3);
    setResendLocked(false);
    setError('');
    sound.playSuccess();
    setTimeout(() => setShowSms(false), 12000);
    return true;
  };

  const sendAadhaarOtpFlow = (aadhaarNumber) => {
    const norm = normalizeAadhaar(aadhaarNumber);
    if (!isValidAadhaar(norm)) {
      setError(l.aadhaarInvalid);
      sound.playTransition();
      return false;
    }
    const res = requestAadhaarOtp(norm);
    if (!res.ok) {
      if (res.error === 'max_sends') {
        setResendLocked(true);
        setError(l.resendMax);
      } else if (res.error === 'cooldown') {
        setAadhaarCooldown(res.waitSeconds || OTP_RESEND_COOLDOWN_S);
      } else if (res.error === 'invalid_aadhaar') {
        setError(l.aadhaarInvalid);
      }
      return false;
    }
    setAadhaarOtp(res.otp);
    setSmsOtp(null);
    setShowSms(true);
    setAadhaarCooldown(OTP_RESEND_COOLDOWN_S);
    setAttemptsLeft(3);
    setResendLocked(false);
    setError('');
    sound.playSuccess();
    setTimeout(() => setShowSms(false), 12000);
    return true;
  };

  const handleGoogleDemoLogin = () => {
    sound.playClick();
    setError('');
    setBusy(true);
    setIsDemoLogin(true);

    setTimeout(() => {
      const demoProfile = {
        name: 'Demo Farmer',
        email: 'farmer.demo@example.com',
        mobile: '',
        village: 'Demo Farm',
        state: 'Karnataka',
        authProvider: 'google-demo',
        aadhaar: '',
        aadhaarVerified: false,
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
    setTimeout(() => {
      setBusy(false);
      const existing = getUser(mobile);
      if (existing) {
        setIsReturning(true);
        if (sendOtpFlow(mobile)) setStep('otp');
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
    if (aadhaar && !isValidAadhaar(aadhaar)) {
      setError(l.aadhaarInvalid);
      sound.playTransition();
      return;
    }
    setError('');
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const mobile = normalizeMobile(phone);
      if (aadhaar && isValidAadhaar(aadhaar) && !aadhaarVerified) {
        // Need to verify aadhaar first via OTP
        if (sendAadhaarOtpFlow(aadhaar)) {
          setStep('aadhaar_otp');
          return;
        }
      }
      if (sendOtpFlow(mobile)) setStep('otp');
    }, 700);
  };

  const handleAadhaarLoginSubmit = () => {
    sound.playClick();
    const norm = normalizeAadhaar(aadhaar);
    if (!isValidAadhaar(norm)) {
      setError(l.aadhaarInvalid);
      sound.playTransition();
      return;
    }
    setError('');
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      if (sendAadhaarOtpFlow(norm)) {
        setStep('aadhaar_otp');
      }
    }, 600);
  };

  const handleVerify = (digits) => {
    const code = (digits || otpDigits).join('');
    if (code.length !== 6) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const mobile = normalizeMobile(phone);
      const res = verifyOtp(mobile, code);
      if (res.ok) {
        const profile = isReturning
          ? updateLastLogin(mobile)
          : registerUser({ name, mobile, village, state: stateName, aadhaar: aadhaarVerified ? aadhaar : '' });
        if (aadhaarVerified && aadhaar) {
          linkAadhaarToUser(mobile, aadhaar);
        }
        const session = saveSession({ ...profile, aadhaarVerified: aadhaarVerified || profile.aadhaarVerified });
        setWelcomeName(profile.name);
        sound.playSuccess();
        setStep('success');
        setTimeout(() => onSuccess(session), 1500);
        return;
      }
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
    }, 600);
  };

  const handleAadhaarVerify = (digits) => {
    const code = (digits || aadhaarOtpDigits).join('');
    if (code.length !== 6) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      const norm = normalizeAadhaar(aadhaar);
      const res = verifyAadhaarOtp(norm, code);
      if (res.ok) {
        sound.playSuccess();
        setAadhaarVerified(true);
        setError('');
        // If we are in Aadhaar login flow (no phone yet), try to find user by Aadhaar
        const existingByAadhaar = getUserByAadhaar(norm);
        if (existingByAadhaar) {
          // Login existing user
          const updated = updateLastLogin(existingByAadhaar.mobile);
          const session = saveSession({ ...updated, aadhaarVerified: true });
          setWelcomeName(updated.name);
          setIsReturning(true);
          setStep('success');
          setTimeout(() => onSuccess(session), 1200);
        } else {
          // If we came from registration, proceed to mobile OTP
          if (phone && isValidIndianMobile(phone)) {
            if (sendOtpFlow(normalizeMobile(phone))) setStep('otp');
          } else {
            // New user via Aadhaar only — go to register to fill rest
            setStep('register');
          }
        }
        return;
      }
      sound.playTransition();
      if (res.error === 'wrong_code') {
        setAttemptsLeft(res.attemptsLeft);
        setError(`${l.wrongOtp} ${res.attemptsLeft} ${l.attemptsLeft}.`);
        setAadhaarOtpDigits(['', '', '', '', '', '']);
        aadhaarOtpRefs.current[0]?.focus();
      } else if (res.error === 'expired') {
        setError(l.expiredOtp);
      } else {
        setError(l.maxAttempts);
      }
    }, 600);
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

  const handleAadhaarOtpChange = (i, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...aadhaarOtpDigits];
    next[i] = digit;
    setAadhaarOtpDigits(next);
    setError('');
    sound.playClick();
    if (digit && i < 5) aadhaarOtpRefs.current[i + 1]?.focus();
    if (digit && i === 5 && next.every((d) => d !== '')) handleAadhaarVerify(next);
  };

  const handleOtpKeyDown = (i, e, isAadhaar=false) => {
    if (e.key === 'Backspace') {
      const arr = isAadhaar ? aadhaarOtpDigits : otpDigits;
      const refs = isAadhaar ? aadhaarOtpRefs : otpRefs;
      if (!arr[i] && i > 0) refs.current[i - 1]?.focus();
    }
  };

  const handleOtpPaste = (e, isAadhaar=false) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      if (isAadhaar) {
        setAadhaarOtpDigits(next);
        handleAadhaarVerify(next);
      } else {
        setOtpDigits(next);
        handleVerify(next);
      }
      e.preventDefault();
    }
  };

  const handleDetectLocation = () => {
    sound.playClick();
    if (!navigator.geolocation) {
      setLocationMsg(l.locationFailed);
      return;
    }
    setLocating(true);
    setLocationMsg(l.detecting);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          if (navigator.onLine) {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`, {
              headers: { 'Accept': 'application/json' }
            });
            const json = await res.json();
            const stateFromApi = json?.address?.state || '';
            const villageFromApi = json?.address?.village || json?.address?.town || json?.address?.hamlet || '';
            if (villageFromApi && !village) {
              setVillage(villageFromApi);
            }
            if (stateFromApi) {
              const matched = INDIAN_STATES.find(s => s.toLowerCase() === stateFromApi.toLowerCase() || stateFromApi.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(stateFromApi.toLowerCase()));
              if (matched) {
                setStateName(matched);
                setLocationMsg(`${l.locationDetected}: ${matched}${villageFromApi ? `, ${villageFromApi}` : ''}`);
                setLocating(false);
                sound.playSuccess();
                return;
              }
            }
          }
        } catch {}
        let guessed = 'Karnataka';
        if (latitude > 28) guessed = 'Punjab';
        else if (latitude > 26 && longitude > 88) guessed = 'Assam';
        else if (latitude > 22 && longitude < 74) guessed = 'Gujarat';
        else if (latitude > 20 && longitude > 77) guessed = 'Maharashtra';
        else if (latitude > 17 && longitude > 78) guessed = 'Telangana';
        else if (latitude > 12 && longitude > 77) guessed = 'Karnataka';
        else if (latitude > 8) guessed = 'Tamil Nadu';
        setStateName(guessed);
        setLocationMsg(`${l.locationDetected}: ${guessed} (approx)`);
        setLocating(false);
        sound.playSuccess();
      },
      () => {
        setLocating(false);
        setLocationMsg(l.locationFailed);
        sound.playTransition();
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  };

  const handleVoiceFill = (field) => {
    sound.playClick();
    if (isVoiceListening && voiceField === field) {
      speechEngine.stopListening();
      setIsVoiceListening(false);
      setVoiceField(null);
      return;
    }
    const langMap = { en: 'en-IN', hi: 'hi-IN' };
    const code = langMap[selectedLang] || 'hi-IN';
    setVoiceField(field);
    setIsVoiceListening(true);
    speechEngine.startListening(code, (transcript) => {
      if (field === 'name') setName(transcript);
      if (field === 'village') setVillage(transcript);
    }, () => { setIsVoiceListening(false); setVoiceField(null); }, () => { setIsVoiceListening(false); setVoiceField(null); });
  };

  const maskedPhone = `+91 ${normalizeMobile(phone).slice(0, 2)}•••••${normalizeMobile(phone).slice(7)}`;
  const maskedAadhaar = maskAadhaar(aadhaar);

  return (
    <div className="auth-page min-h-screen w-full bg-[#f4f7f5] text-zinc-900 flex items-center justify-center p-3 sm:p-4 relative overflow-x-hidden">
      <AnimatePresence>
        {showSms && (smsOtp || aadhaarOtp) && (
          <motion.div
            initial={{ y: -90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -90, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] w-[94%] max-w-sm"
          >
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-900 text-white shadow-2xl border border-zinc-700">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${aadhaarOtp ? 'bg-blue-500' : 'bg-emerald-400'}`}>
                {aadhaarOtp ? <Fingerprint className="w-5 h-5 text-white" /> : <MessageSquareText className="w-5 h-5 text-black" />}
              </div>
              <div className="text-left min-w-0">
                <div className="text-[10px] font-black tracking-widest text-zinc-400">{aadhaarOtp ? 'AADHAAR OTP · UIDAI (Demo)' : `${l.smsBanner} · now`}</div>
                <div className="text-xs font-bold mt-0.5">
                  {aadhaarOtp ? 'Your Aadhaar verification OTP is' : l.smsText} <span className={`${aadhaarOtp ? 'text-blue-400' : 'text-emerald-400'} font-mono text-base tracking-widest`}>{aadhaarOtp || smsOtp}</span>
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">{l.smsValid}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-sm min-w-0 bg-white text-zinc-900 rounded-3xl shadow-lg border border-zinc-200 overflow-hidden relative">
        <button
          onClick={() => {
            sound.playClick();
            if (step === 'otp') { setStep(isReturning ? 'phone' : 'register'); setOtpDigits(['', '', '', '', '', '']); setError(''); }
            else if (step === 'aadhaar_otp') { setStep(aadhaar ? 'aadhaar_login' : 'register'); setAadhaarOtpDigits(['', '', '', '', '', '']); setError(''); }
            else if (step === 'aadhaar_login') { setStep('phone'); setError(''); }
            else if (step === 'register') { setStep('phone'); setError(''); }
            else onCancel();
          }}
          className="absolute top-4 left-4 p-2 text-zinc-500 hover:text-zinc-600 rounded-full hover:bg-zinc-100 z-10"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

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

              <div className="w-full flex items-center gap-3 my-5" aria-hidden="true">
                <span className="h-px flex-1 bg-zinc-200" />
                <span className="text-[10px] font-bold text-zinc-500">{l.orMobile}</span>
                <span className="h-px flex-1 bg-zinc-200" />
              </div>

              <div className="w-full text-left mb-1.5">
                <label className="text-xs font-black text-zinc-700">{l.phoneLabel}</label>
              </div>
              <div className="phone-number-row w-full min-w-0 items-center mb-1 flex gap-2">
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
                {busy ? l.loading : l.sendOtp}
              </button>

              <button
                onClick={() => { sound.playClick(); setStep('aadhaar_login'); setError(''); }}
                className="mt-3 w-full py-3 rounded-xl bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-700 font-black text-sm flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-4 h-4" /> {l.aadhaarLoginTitle}
              </button>

              <p className="text-[11px] text-zinc-500 mt-4">{l.newHere}</p>
            </>
          )}

          {/* ── STEP: aadhaar_login ─────────────────────── */}
          {step === 'aadhaar_login' && (
            <>
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-5">
                <Fingerprint className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-2">{l.aadhaarLoginTitle}</h2>
              <p className="text-sm text-zinc-500 mb-6">{l.aadhaarLoginSub}</p>

              <div className="w-full text-left mb-1.5">
                <label className="text-xs font-black text-zinc-700">{l.aadhaarLabel}</label>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={aadhaar}
                autoFocus
                onChange={(e) => {
                  const formatted = formatAadhaar(e.target.value);
                  setAadhaar(formatted);
                  setAadhaarVerified(false);
                  setError('');
                }}
                placeholder={l.aadhaarPlaceholder}
                className="w-full bg-white text-zinc-900 placeholder:text-zinc-400 px-4 py-3 text-base font-black tracking-widest border-2 border-zinc-200 rounded-xl focus:border-blue-500 focus:outline-none"
              />
              <div className="w-full text-left text-[11px] text-zinc-500 mb-4 mt-1 flex items-center justify-between">
                <span>{l.aadhaarHint}</span>
                {aadhaarVerified && <span className="text-emerald-600 font-black flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5" /> {l.aadhaarVerified}</span>}
              </div>

              {error && (
                <div className="w-full flex items-center gap-2 p-2.5 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button
                onClick={handleAadhaarLoginSubmit}
                disabled={busy || !isValidAadhaar(aadhaar)}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-sm shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-4 h-4" /> {busy ? l.loading : l.loginWithAadhaarBtn}
              </button>

              <button
                onClick={() => { sound.playClick(); setStep('phone'); setError(''); }}
                className="mt-3 w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs"
              >
                {l.changeNumber}
              </button>
            </>
          )}

          {/* ── STEP: register ───────────────────────────── */}
          {step === 'register' && (
            <>
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-5">
                <User className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-2">{l.regTitle}</h2>
              <p className="text-sm text-zinc-500 mb-6">{l.regSub}</p>

              <div className="w-full space-y-3 text-left">
                <div>
                  <label className="text-xs font-black text-zinc-700 flex items-center justify-between">
                    <span>{l.nameLabel}</span>
                    <button type="button" onClick={()=>handleVoiceFill('name')} className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${isVoiceListening && voiceField==='name' ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-white'}`}>
                      {isVoiceListening && voiceField==='name' ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />} {isVoiceListening && voiceField==='name' ? 'Listening...' : 'Voice Fill'}
                    </button>
                  </label>
                  <input
                    type="text"
                    value={name}
                    autoFocus
                    maxLength={40}
                    onChange={(e) => { setName(e.target.value); setError(''); }}
                    placeholder={l.namePlaceholder}
                    className="box-border mt-1 w-full min-w-0 bg-white text-zinc-900 placeholder:text-zinc-400 px-4 py-3 text-sm font-bold border-2 border-zinc-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="text-[10px] text-zinc-500 mt-1">Tap mic and speak your name — auto-fills, no typing needed</div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-zinc-700 flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emerald-600" /> {l.villageLabel}</label>
                    <button type="button" onClick={()=>handleVoiceFill('village')} className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${isVoiceListening && voiceField==='village' ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-white'}`}>
                      {isVoiceListening && voiceField==='village' ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />} {isVoiceListening && voiceField==='village' ? 'Listening...' : 'Voice Fill'}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={village}
                    maxLength={50}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder={l.villagePlaceholder}
                    className="box-border mt-1 w-full min-w-0 bg-white text-zinc-900 placeholder:text-zinc-400 px-4 py-3 text-sm font-bold border-2 border-zinc-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="text-[10px] text-zinc-500 mt-1">Voice fill + auto-detect location reduces typing for farmers</div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-zinc-700">{l.stateLabel}</label>
                    <button
                      type="button"
                      onClick={handleDetectLocation}
                      disabled={locating}
                      className="text-[11px] font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 disabled:opacity-60"
                    >
                      <LocateFixed className="w-3.5 h-3.5" /> {locating ? l.detecting : l.detectLocation}
                    </button>
                  </div>
                  <select
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="mt-1 w-full px-4 py-3 text-sm font-bold border-2 border-zinc-200 rounded-xl focus:border-emerald-500 focus:outline-none bg-white"
                  >
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {locationMsg && <div className="text-[10px] text-emerald-600 font-bold mt-1">{locationMsg}</div>}
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-blue-800 flex items-center gap-1"><Fingerprint className="w-3.5 h-3.5" /> {l.aadhaarLabel} (Optional)</label>
                    {aadhaarVerified && <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> {l.aadhaarVerified}</span>}
                  </div>
                  <input
                    type="text"
                    value={aadhaar}
                    onChange={(e) => {
                      setAadhaar(formatAadhaar(e.target.value));
                      setAadhaarVerified(false);
                      setError('');
                    }}
                    placeholder={l.aadhaarPlaceholder}
                    className="w-full bg-white text-zinc-900 placeholder:text-zinc-400 px-4 py-3 text-sm font-black tracking-widest border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                  <div className="text-[10px] text-blue-600">{l.aadhaarHint}</div>
                  {aadhaar && isValidAadhaar(aadhaar) && !aadhaarVerified && (
                    <button
                      type="button"
                      onClick={() => sendAadhaarOtpFlow(aadhaar) && setStep('aadhaar_otp')}
                      className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-black"
                    >
                      {l.verifyAadhaar}
                    </button>
                  )}
                  <div className="text-[10px] text-zinc-500">{l.aadhaarLinkSub}</div>
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
                {busy ? l.loading : l.continueBtn}
              </button>

              <button
                onClick={() => { sound.playClick(); setAadhaar(''); setAadhaarVerified(false); handleRegisterSubmit(); }}
                className="mt-2 w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold text-xs"
              >
                {l.skipAadhaar}
              </button>
            </>
          )}

          {/* ── STEP: aadhaar_otp ────────────────────────── */}
          {step === 'aadhaar_otp' && (
            <>
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-5">
                <Fingerprint className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-black text-zinc-900 mb-1">{l.otpTitle}</h2>
              <p className="text-sm text-zinc-500">{l.aadhaarOtpSent} <strong className="text-zinc-800 font-mono">{maskedAadhaar}</strong></p>
              <p className="text-[11px] text-zinc-500 mb-6">{l.otpHint} · {l.aadhaarHint}</p>

              <div className="flex w-full min-w-0 gap-1 sm:gap-2 justify-center mb-3" onPaste={(e) => handleOtpPaste(e, true)}>
                {aadhaarOtpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { aadhaarOtpRefs.current[i] = el; }}
                    type="tel"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoFocus={i === 0}
                    onChange={(e) => handleAadhaarOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e, true)}
                    className="box-border w-10 max-w-11 min-w-0 flex-1 h-12 sm:h-13 bg-white text-zinc-900 py-2 px-0 text-center text-xl font-black border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ))}
              </div>

              {error && (
                <div className="w-full flex items-center gap-2 p-2.5 mb-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {aadhaarOtp && (
                <div className="w-full flex items-center gap-2.5 p-3 mb-4 rounded-xl bg-zinc-900 text-white border border-zinc-700 text-left">
                  <Fingerprint className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <div className="text-[9px] font-black tracking-widest text-zinc-400">AADHAAR OTP · UIDAI (Demo)</div>
                    <div className="text-xs font-bold">
                      Your Aadhaar OTP is <span className="text-blue-400 font-mono text-sm tracking-[0.25em]">{aadhaarOtp}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="w-full flex items-center justify-between text-xs mb-4">
                <button
                  onClick={() => { sound.playClick(); setStep(phone ? 'register' : 'aadhaar_login'); setError(''); }}
                  className="font-bold text-zinc-500 hover:text-zinc-700"
                >
                  ← Back
                </button>
                {!resendLocked ? (
                  aadhaarCooldown > 0 ? (
                    <span className="flex items-center gap-1 font-bold text-zinc-500">
                      <Timer className="w-3.5 h-3.5" /> {l.resendIn} {aadhaarCooldown}s
                    </span>
                  ) : (
                    <button
                      onClick={() => sendAadhaarOtpFlow(aadhaar)}
                      className="flex items-center gap-1 font-black text-blue-600 hover:text-blue-700"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> {l.resendBtn}
                    </button>
                  )
                ) : (
                  <span className="font-bold text-red-600">{resendLocked ? l.resendMax : ''}</span>
                )}
              </div>

              <button
                onClick={() => { sound.playClick(); handleAadhaarVerify(); }}
                disabled={busy || aadhaarOtpDigits.some((d) => d === '')}
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-black text-sm shadow-md transition-colors"
              >
                {busy ? l.loading : l.verifyAadhaar}
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

              <div className="flex w-full min-w-0 gap-1 sm:gap-2 justify-center mb-3" onPaste={(e) => handleOtpPaste(e, false)}>
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
                    onKeyDown={(e) => handleOtpKeyDown(i, e, false)}
                    className="box-border w-10 max-w-11 min-w-0 flex-1 h-12 sm:h-13 bg-white text-zinc-900 py-2 px-0 text-center text-xl font-black border-2 border-zinc-200 rounded-xl focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                ))}
              </div>

              {error && (
                <div className="w-full flex items-center gap-2 p-2.5 mb-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              {smsOtp && (
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

              {aadhaarVerified && (
                <div className="w-full flex items-center gap-2 p-2.5 mb-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold text-left">
                  <BadgeCheck className="w-4 h-4" /> {l.aadhaarVerified} · {maskedAadhaar}
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
                <p className="text-xs font-mono text-zinc-600 mt-1">{welcomeEmail} · DEMO</p>
              )}
              <p className="text-xs font-mono text-zinc-500 mt-2 flex items-center gap-1">
                {isDemoLogin
                  ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  : <ShieldCheck className="w-3.5 h-3.5" />}
                {isDemoLogin ? l.demoStatus : l.verified}
              </p>
              {aadhaarVerified && (
                <div className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-black">
                  <Fingerprint className="w-3.5 h-3.5" /> {l.aadhaarVerified} · {maskedAadhaar}
                </div>
              )}
            </motion.div>
          )}
        </div>

        <div className="px-6 py-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-center gap-1.5 text-[10px] font-bold text-zinc-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> {l.secNote}
        </div>
      </div>
    </div>
  );
}
