import React, { useState, useEffect } from 'react';

import Header from './components/Header';
import BottomNav from './components/BottomNav';
import TabScanner from './components/TabScanner';
import TabPatti from './components/TabPatti';
import TabWeigh from './components/TabWeigh';
import TabGrade from './components/TabGrade';
import TabExposer from './components/TabExposer';
import TabPool from './components/TabPool';
import TabAuction from './components/TabAuction';
import TabROI from './components/TabROI';
import TabMarket from './components/TabMarket';
import WhatsAppScreen, { openWhatsAppHub } from './components/WhatsAppScreen';
import VoiceAssistant from './components/VoiceAssistant';
import { detectLanguageByLocation } from './utils/voiceGuide';
import HandsFreeVoiceBanner from './components/HandsFreeVoiceBanner';
import BackgroundCanvas from './components/BackgroundCanvas';
import InstallAppModal from './components/InstallAppModal';
import LandingPage from './components/LandingPage';
import PhoneFrame from './components/PhoneFrame';
import PhoneHomeScreen from './components/PhoneHomeScreen';

import { initOnDeviceAI } from './utils/onDeviceModel';
import { initOfflineDB } from './utils/offlineStore';
import { getSession, clearSession } from './utils/authService';
import { voiceGuide } from './utils/voiceGuide';
import { classifyVoiceIntent } from './utils/voiceNavigator';
import { sound } from './utils/audio';
import { T } from './data/translations';
import { WifiOff, Mic, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LANG_MAP = {
  'hi': 'hi','en': 'en','ta': 'ta','te': 'te','kn': 'kn','ml': 'ml','mr': 'mr','pa': 'pa','bn': 'bn','gu': 'gu','or': 'or','as': 'as','mai': 'mai','sat': 'sat','ks': 'ks','brx': 'brx','doi': 'doi','kok': 'kok','mni': 'mni','ne': 'ne','sa': 'sa','sd': 'sd','ur': 'ur',
  'bodo': 'brx','dogri': 'doi','konkani': 'kok','manipuri': 'mni','nepali': 'ne','sanskrit': 'sa','sindhi': 'sd',
};

function detectBrowserLanguage() {
  try {
    const saved = localStorage.getItem('ap_lang');
    if (saved && T[saved]) return saved;
    const nav = (navigator.language || navigator.userLanguage || 'hi').toLowerCase();
    const base = nav.split('-')[0];
    // Map browser lang to our codes
    if (LANG_MAP[nav]) return LANG_MAP[nav];
    if (LANG_MAP[base]) return LANG_MAP[base];
    // Fallback: if browser is en, use en, else hi for Indian users
    if (base === 'en') return 'en';
    return 'hi';
  } catch { return 'hi'; }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [selectedLang, setSelectedLang] = useState(() => detectBrowserLanguage());

  // Live location → language: on first visit (no explicit choice saved yet),
  // detect where the farmer is (GPS → IP → browser) and speak their tongue.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (localStorage.getItem('ap_lang')) return; // explicit choice wins
        const lang = await detectLanguageByLocation();
        if (!cancelled && lang && T[lang] && lang !== selectedLang) {
          setSelectedLang(lang);
          try { localStorage.setItem('ap_lang', lang); } catch (e) {}
        }
      } catch (e) {}
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [isOffline, setIsOffline] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [waUnread, setWaUnread] = useState(0);
  // When the dedicated WhatsApp phone is on the desk (wide presentation
  // mode), the in-app launcher disappears — WhatsApp lives on that device.
  const [waSide, setWaSide] = useState(() => {
    try { return window.innerWidth >= 1000 && window.innerWidth >= 520; } catch { return false; }
  });
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isSunlightMode, setIsSunlightMode] = useState(() => {
    try {
      const saved = localStorage.getItem('ap_sunlight');
      if (saved !== null) return saved === 'true';
      return true;
    } catch { return true; }
  });
  const [isLowLiteracy, setIsLowLiteracy] = useState(() => {
    try { return localStorage.getItem('ap_low_literacy') === 'true'; } catch { return false; }
  });
  // Real persistent session — restored from localStorage (30-day validity)
  const [user, setUser] = useState(() => getSession());
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [guideActive, setGuideActive] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  // Presentation flow: the phone home screen shows first; tapping the
  // AgriPulse icon "opens" the app (persisted per browser session).
  const [appOpened, setAppOpened] = useState(() => {
    try { return sessionStorage.getItem('ap_phone_opened') === '1'; } catch { return false; }
  });

  const t = T[selectedLang] || T['en'];

  useEffect(() => {
    initOfflineDB();
    // Defer heavy model init to avoid blocking first paint — farmer sees UI instantly
    const timer = setTimeout(() => initOnDeviceAI(), 800);

    // Listen for PWA install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallModalOpen(true);
    };

    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Persist language when it changes
  useEffect(() => {
    try { localStorage.setItem('ap_lang', selectedLang); } catch {}
  }, [selectedLang]);

  useEffect(() => {
    try { localStorage.setItem('ap_sunlight', String(isSunlightMode)); } catch {}
  }, [isSunlightMode]);

  useEffect(() => {
    try { localStorage.setItem('ap_low_literacy', String(isLowLiteracy)); } catch {}
  }, [isLowLiteracy]);

  // Every tab opens from the top — switching mid-scroll used to land the new
  // tab halfway down, making the layout look like it "changed size".
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.querySelector('.ap-screen-scroll')?.scrollTo({ top: 0, behavior: 'instant' });
    } catch {}
  }, [activeTab]);

  // ── Voice guide: run the service tour once the farmer logs in ──────────
  useEffect(() => {
    // subscribe (not a single callback slot) so the login page's subscription
    // is never stolen and both components stay in sync
    const unsubscribe = voiceGuide.subscribe(() => setGuideActive(voiceGuide.active));
    if (user && voiceGuide.tourPending) {
      voiceGuide.tourPending = false;
      // While the guide waits for an answer, the farmer can just SAY an
      // action ("open mandi prices") — we do it, then ask to continue.
      voiceGuide.onCommand = (transcript) => {
        try {
          const intent = classifyVoiceIntent(transcript, selectedLang);
          if (intent && intent.targetTab) {
            setActiveTab(intent.targetTab);
            const line = (intent.speechResponse && (intent.speechResponse[selectedLang] || intent.speechResponse.hi || intent.speechResponse.en));
            voiceGuide.say(line || intent.tabLabel?.hi || 'ठीक है।');
            return true;
          }
        } catch { /* unknown speech — ignore */ }
        return false;
      };
      setTimeout(() => { voiceGuide.runServiceTour(); }, 1200);
    }
    if (!user) {
      voiceGuide.onCommand = null;
    }
    return unsubscribe;
  }, [user, selectedLang]);

  // The modal assistant / hands-free mode own the mic — pause the guide then.
  useEffect(() => {
    if (isVoiceOpen || isHandsFree) voiceGuide.suspend();
    else voiceGuide.resume();
  }, [isVoiceOpen, isHandsFree]);

  const handleAutoNavigate = (targetTab) => {
    setActiveTab(targetTab);
  };

  // Playful: tapping the phone's home indicator exits to the home screen.
  const goHomeScreen = () => {
    sound.playTransition();
    try { sessionStorage.setItem('ap_phone_opened', '0'); } catch {}
    setAppOpened(false);
  };

  // Any component can request navigation: window.dispatchEvent(
  //   new CustomEvent('ap:navigate', { detail: 'saathi' }))
  useEffect(() => {
    const onNav = (e) => { if (typeof e.detail === 'string') setActiveTab(e.detail); };
    window.addEventListener('ap:navigate', onNav);
    return () => window.removeEventListener('ap:navigate', onNav);
  }, []);

  // WhatsApp Hub broadcasts its total unread count for the launcher badge
  useEffect(() => {
    const onUnread = (e) => setWaUnread(e.detail?.count || 0);
    const onSide = (e) => setWaSide(Boolean(e.detail?.side));
    window.addEventListener('ap:wa-unread', onUnread);
    window.addEventListener('ap:wa-side', onSide);
    return () => {
      window.removeEventListener('ap:wa-unread', onUnread);
      window.removeEventListener('ap:wa-side', onSide);
    };
  }, []);

  const handleLogout = () => {
    sound.playClick();
    clearSession();
    voiceGuide.stop(); // companion mode ends at logout — no mic on the landing page
    setUser(null);
    setActiveTab('scan');
  };

  if (!appOpened) {
    return (
      <PhoneFrame>
        <PhoneHomeScreen onOpenApp={() => {
          try { sessionStorage.setItem('ap_phone_opened', '1'); } catch {}
          setAppOpened(true);
        }} />
      </PhoneFrame>
    );
  }

  if (!user) {
    return (
      <PhoneFrame onHome={goHomeScreen}>
      <div className="min-h-dvh w-full bg-black">
        {/* FULL MOBILE MODE — login also lives in the centered phone frame */}
        <div className="relative mx-auto min-h-dvh w-full max-w-md shadow-2xl overflow-x-hidden">
          <LandingPage
            onLoginSuccess={(session) => setUser(session)}
            selectedLang={selectedLang}
            setSelectedLang={setSelectedLang}
          />
        </div>
      </div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame onHome={goHomeScreen} companion>
    <div className={`min-h-dvh w-full transition-colors ${isSunlightMode ? 'bg-zinc-300' : 'bg-black'}`}>
    {/* FULL MOBILE MODE — the whole app lives in a centered phone frame */}
    <div id="ap-phone-frame" className={`relative mx-auto flex min-h-dvh w-full max-w-md flex-col font-sans shadow-2xl selection:bg-emerald-500 selection:text-black transition-colors ${
      isSunlightMode ? 'bg-[#f4f7f5] text-zinc-900' : 'bg-[#090a09] text-white'
    }`}>
      {/* Background Bio-Aura Canvas (Dark mode only) */}
      {!isSunlightMode && <BackgroundCanvas />}

      {/*
        Unified sticky top unit.
        The offline strip, header, hands-free banner and tab bar live in ONE
        sticky container, so they can never drift apart or overlap — the old
        version pinned each layer at a hard-coded pixel offset (top-[48px],
        top-[56px], top-[57px]) that stopped matching the real header height
        as the layout scaled across screen sizes.
      */}
      <div className={`sticky top-0 z-40 transition-shadow ${isScrolled ? 'shadow-lg' : ''}`}>
        {/* Offline Alert Strip */}
        {isOffline && (
          <div className="bg-amber-400 text-black px-4 py-1.5 text-[11px] sm:text-xs font-bold flex items-center justify-between">
            <span className="flex items-center gap-2 min-w-0">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t.offlineMode}</span>
            </span>
            <span className="hidden sm:inline text-[10px] sm:text-[11px] font-mono shrink-0">{t.savedLocally}</span>
          </div>
        )}

        {/* Main Header */}
        <Header
          selectedLang={selectedLang}
          setSelectedLang={setSelectedLang}
          isOffline={isOffline}
          setIsOffline={setIsOffline}
          onOpenVoiceModal={() => setIsVoiceOpen(true)}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
          isSunlightMode={isSunlightMode}
          setIsSunlightMode={setIsSunlightMode}
          isHandsFree={isHandsFree}
          setIsHandsFree={setIsHandsFree}
          user={user}
          onLogout={handleLogout}
          isLowLiteracy={isLowLiteracy}
          setIsLowLiteracy={setIsLowLiteracy}
        />

        {/* Voice guide companion — replay the service tour or stop it */}
        <div className="fixed bottom-[148px] inset-x-0 z-30 mx-auto max-w-md flex flex-col items-end gap-2 px-3 pointer-events-none [&>button]:pointer-events-auto">
          {guideActive ? (
            <button
              onClick={() => { sound.playClick(); voiceGuide.stopTour(); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-[11px] font-black shadow-lg animate-pulse"
            >
              ⏹ {t.voiceGuideStop || 'Stop guide'}
            </button>
          ) : (
            <button
              onClick={() => { sound.playClick(); voiceGuide.runServiceTour(); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black shadow-lg"
            >
              🔊 {t.voiceGuideReplay || 'सेवाएँ सुनें'}
            </button>
          )}
        </div>

        {/* Wet-Hands / Hands-Free Voice Navigation Banner */}
        <HandsFreeVoiceBanner
          isHandsFree={isHandsFree}
          onToggle={() => setIsHandsFree(!isHandsFree)}
          selectedLang={selectedLang}
          onNavigate={handleAutoNavigate}
        />

      </div>

      {/* Main Tab Stage (Full Natural Scroll) */}
      <main className="flex-1 w-full px-3 py-4 pb-28 relative z-10">
        <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }}>
        {activeTab === 'scan' && <TabScanner selectedLang={selectedLang} isSunlightMode={isSunlightMode} isLowLiteracy={isLowLiteracy} setIsLowLiteracy={setIsLowLiteracy} />}
        {activeTab === 'patti' && <TabPatti selectedLang={selectedLang} isSunlightMode={isSunlightMode} />}
        {activeTab === 'weigh' && <TabWeigh selectedLang={selectedLang} isSunlightMode={isSunlightMode} />}
        {activeTab === 'grade' && <TabGrade selectedLang={selectedLang} isSunlightMode={isSunlightMode} />}
        {activeTab === 'exposer' && <TabExposer selectedLang={selectedLang} isSunlightMode={isSunlightMode} />}
        {activeTab === 'pool' && <TabPool selectedLang={selectedLang} isSunlightMode={isSunlightMode} />}
        {activeTab === 'auction' && <TabAuction selectedLang={selectedLang} isSunlightMode={isSunlightMode} />}
        {activeTab === 'profit' && <TabROI selectedLang={selectedLang} isSunlightMode={isSunlightMode} />}
        {activeTab === 'market' && <TabMarket selectedLang={selectedLang} isSunlightMode={isSunlightMode} />}
        </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom mobile navigation — primary tabs + More sheet */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedLang={selectedLang}
        isSunlightMode={isSunlightMode}
      />

      {/* Floating launchers: WhatsApp Hub (left, hidden when the dedicated
          WhatsApp phone is beside the app) + 1-Tap Voice Assistant (right) */}
      <div className={`fixed bottom-[88px] inset-x-0 z-30 mx-auto max-w-md flex px-3 pointer-events-none [&>button]:pointer-events-auto ${waSide ? 'justify-end' : 'justify-between'}`}>
        {!waSide && (
        <button
          onClick={() => { sound.playClick(); openWhatsAppHub(); }}
          className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-black border-2 border-[#5ee394] shadow-[0_0_25px_rgba(37,211,102,0.55)] transition-transform hover:scale-105 active:scale-95"
          aria-label="WhatsApp alerts — pools, frauds, deals"
        >
          <MessageCircle className="w-6 h-6 fill-black text-[#25D366]" strokeWidth={0} />
          {waUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 border-2 border-black text-white text-[10px] font-black flex items-center justify-center">
              {waUnread}
            </span>
          )}
        </button>
        )}
        <button
          onClick={() => { sound.playClick(); setIsVoiceOpen(true); }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400 hover:bg-emerald-300 text-black border-2 border-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.6)] transition-transform hover:scale-105 active:scale-95 sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-3"
          aria-label="Kisan Sahayak — Ask AI by voice"
        >
          <Mic className="w-5 h-5 fill-black sm:w-4 sm:h-4" />
          <span className="hidden sm:inline font-black text-sm">{t.askAiBtn}</span>
        </button>
      </div>

      {/* Clean Minimalist Footer */}
      <footer className={`border-t px-4 lg:px-8 py-3 pb-24 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs transition-colors relative z-10 ${
        isSunlightMode ? 'bg-zinc-200 border-zinc-300 text-zinc-700 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400 font-medium'
      }`}>
        <div className="min-w-0 truncate">{t.footerText}</div>
        <div className="text-[11px] font-mono shrink-0">
          AgriPulse AI • NexHack 2026
        </div>
      </footer>

      {/* In-app WhatsApp integration screen — features dispatch 'ap:whatsapp' */}
      <WhatsAppScreen />

      {/* Kisan Sahayak Voice Modal */}
      <VoiceAssistant
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        selectedLang={selectedLang}
        setSelectedLang={setSelectedLang}
        onNavigate={handleAutoNavigate}
      />

      {/* PWA Download to Home Screen Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        deferredPrompt={deferredPrompt}
        selectedLang={selectedLang}
      />
    </div>
    </div>
    </PhoneFrame>
  );
}
