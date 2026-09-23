import React, { useState, useEffect } from 'react';

import Header from './components/Header';
import TabNav from './components/TabNav';
import TabScanner from './components/TabScanner';
import TabRadar from './components/TabRadar';
import TabVerify from './components/TabVerify';
import TabProfit from './components/TabProfit';
import TabStores from './components/TabStores';
import TabGroup from './components/TabGroup';
import VoiceAssistant from './components/VoiceAssistant';
import HandsFreeVoiceBanner from './components/HandsFreeVoiceBanner';
import BackgroundCanvas from './components/BackgroundCanvas';
import InstallAppModal from './components/InstallAppModal';
import LandingPage from './components/LandingPage';

import { initOnDeviceAI } from './utils/onDeviceModel';
import { initOfflineDB } from './utils/offlineStore';
import { getSession, clearSession } from './utils/authService';
import { sound } from './utils/audio';
import { T } from './data/translations';
import { WifiOff, Mic, Download } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [selectedLang, setSelectedLang] = useState('hi');
  const [isOffline, setIsOffline] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isSunlightMode, setIsSunlightMode] = useState(true);
  // Real persistent session — restored from localStorage (30-day validity)
  const [user, setUser] = useState(() => getSession());
  const [isHandsFree, setIsHandsFree] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const t = T[selectedLang] || T['en'];

  useEffect(() => {
    initOfflineDB();
    initOnDeviceAI();

    // Listen for PWA install prompt
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Auto-open install banner if not dismissed
      setIsInstallModalOpen(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleAutoNavigate = (targetTab) => {
    setActiveTab(targetTab);
  };

  const handleLogout = () => {
    sound.playClick();
    clearSession();
    setUser(null);
    setActiveTab('scan');
  };

  if (!user) {
    return (
      <LandingPage
        onLoginSuccess={(session) => setUser(session)}
        selectedLang={selectedLang}
        setSelectedLang={setSelectedLang}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-black transition-colors ${
      isSunlightMode ? 'bg-[#f4f7f5] text-zinc-900' : 'bg-[#090a09] text-white'
    }`}>
      {/* Background Bio-Aura Canvas (Dark mode only) */}
      {!isSunlightMode && <BackgroundCanvas />}

      {/* Clean Offline Alert Strip */}
      {isOffline && (
        <div className="bg-amber-500 text-black px-4 py-1.5 text-xs font-bold flex items-center justify-between sticky top-0 z-50 shadow-md">
          <span className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5" />
            <span>{t.offlineMode}</span>
          </span>
          <span className="text-[11px] font-mono">{t.savedLocally}</span>
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
      />

      {/* Wet-Hands / Hands-Free Voice Navigation Active Banner */}
      <HandsFreeVoiceBanner
        isHandsFree={isHandsFree}
        onToggle={() => setIsHandsFree(!isHandsFree)}
        selectedLang={selectedLang}
        onNavigate={handleAutoNavigate}
      />

      {/* Top Tab Navigation Bar (Sticky & Always Visible on all screen sizes) */}
      <TabNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedLang={selectedLang}
        isSunlightMode={isSunlightMode}
      />

      {/* Main Tab Stage (Full Natural Scroll) */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-3 pb-28 relative z-10">
        {activeTab === 'scan' && (
          <TabScanner
            selectedLang={selectedLang}
            isSunlightMode={isSunlightMode}
          />
        )}
        {activeTab === 'radar' && (
          <TabRadar
            selectedLang={selectedLang}
            isSunlightMode={isSunlightMode}
          />
        )}
        {activeTab === 'verify' && (
          <TabVerify
            selectedLang={selectedLang}
            isSunlightMode={isSunlightMode}
          />
        )}
        {activeTab === 'profit' && (
          <TabProfit
            selectedLang={selectedLang}
            isSunlightMode={isSunlightMode}
          />
        )}
        {activeTab === 'stores' && (
          <TabStores
            selectedLang={selectedLang}
            isSunlightMode={isSunlightMode}
          />
        )}
        {activeTab === 'group' && (
          <TabGroup
            selectedLang={selectedLang}
            isSunlightMode={isSunlightMode}
          />
        )}
      </main>

      {/* Floating 1-Tap Voice Assistant Button */}
      <div className="fixed bottom-6 right-4 sm:right-6 z-40">
        <button
          onClick={() => { sound.playClick(); setIsVoiceOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 sm:px-5 sm:py-3 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs sm:text-sm border-2 border-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.6)] transition-transform hover:scale-105 active:scale-95"
        >
          <Mic className="w-4 h-4 fill-black" />
          <span>{t.askAiBtn}</span>
        </button>
      </div>

      {/* Clean Minimalist Footer */}
      <footer className={`border-t px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between text-xs transition-colors relative z-10 ${
        isSunlightMode ? 'bg-zinc-200 border-zinc-300 text-zinc-700 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400 font-medium'
      }`}>
        <div>{t.footerText}</div>
        <div className="text-[11px] font-mono">
          AgriPulse AI • NexHack 2026
        </div>
      </footer>

      {/* Kisan Sahayak Voice Modal */}
      <VoiceAssistant
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        selectedLang={selectedLang}
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
  );
}
