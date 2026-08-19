import React from 'react';
import { Wifi, WifiOff, Mic } from 'lucide-react';
import { sound } from '../utils/audio';

export default function Header({
  selectedLang,
  setSelectedLang,
  isOffline,
  setIsOffline,
  onOpenVoiceModal,
}) {
  const languages = [
    { code: 'hi', label: 'हिन्दी' },
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
  ];

  return (
    <header className="border-b border-[#1f2421] bg-[#0c0e0d]/90 backdrop-blur-md px-4 lg:px-8 py-3.5 sticky top-0 z-30">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-black font-bold text-lg shadow-sm">
            🌾
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-white leading-none">
              AgriPulse AI
            </h1>
            <p className="text-[11px] text-zinc-400 font-light mt-1">
              Smart Crop Care & Market Copilot
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Voice Assistant */}
          <button
            onClick={() => { sound.playClick(); onOpenVoiceModal(); }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-transform active:scale-95 shadow-sm"
          >
            <Mic className="w-3.5 h-3.5 fill-black" />
            <span>Kisan Sahayak (बोलें)</span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center bg-[#151817] p-1 rounded-xl border border-[#232925]">
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => { sound.playClick(); setSelectedLang(l.code); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedLang === l.code
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Offline Toggle */}
          <button
            onClick={() => { sound.playClick(); setIsOffline(!isOffline); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              isOffline
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                : 'bg-[#151817] text-zinc-400 border-[#232925] hover:text-zinc-200'
            }`}
            title="Toggle Offline mode"
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5 text-amber-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden sm:inline">{isOffline ? 'Offline Mode' : 'Online'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
