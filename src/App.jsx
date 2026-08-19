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

import { initOnDeviceAI } from './utils/onDeviceModel';
import { initOfflineDB } from './utils/offlineStore';
import { WifiOff } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('scan');
  const [selectedLang, setSelectedLang] = useState('hi');
  const [isOffline, setIsOffline] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  useEffect(() => {
    initOfflineDB();
    initOnDeviceAI();

    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#090a09] text-white flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-black">
      {/* Clean Offline Alert Strip */}
      {isOffline && (
        <div className="bg-amber-500 text-black px-4 py-1.5 text-xs font-medium flex items-center justify-between sticky top-0 z-50 shadow-sm">
          <span className="flex items-center gap-2">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Working in Offline Mode (No Internet Needed)</span>
          </span>
          <span className="text-[11px] font-bold">Saved Locally</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        selectedLang={selectedLang}
        setSelectedLang={setSelectedLang}
        isOffline={isOffline}
        setIsOffline={setIsOffline}
        onOpenVoiceModal={() => setIsVoiceOpen(false || true)}
      />

      {/* Minimalist Tab Navigation Bar */}
      <TabNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Tab Stage */}
      <main className="flex-1 pb-8">
        {activeTab === 'scan' && <TabScanner selectedLang={selectedLang} />}
        {activeTab === 'radar' && <TabRadar />}
        {activeTab === 'verify' && <TabVerify />}
        {activeTab === 'profit' && <TabProfit />}
        {activeTab === 'stores' && <TabStores />}
        {activeTab === 'group' && <TabGroup />}
      </main>

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-[#1f2421] bg-[#0c0e0d] px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between text-xs text-zinc-500">
        <div>AgriPulse AI • Built for Farmers</div>
        <div className="text-zinc-500 text-[11px]">
          Simple • Fast • Reliable
        </div>
      </footer>

      {/* Kisan Sahayak Voice Modal */}
      <VoiceAssistant
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        selectedLang={selectedLang}
      />
    </div>
  );
}
