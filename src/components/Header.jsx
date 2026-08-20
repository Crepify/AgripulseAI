import React from 'react';
import { Wifi, WifiOff, Mic, Sun, Moon, Hand } from 'lucide-react';
import { sound } from '../utils/audio';
import { T } from '../data/translations';

export default function Header({
  selectedLang,
  setSelectedLang,
  isOffline,
  setIsOffline,
  onOpenVoiceModal,
  isSunlightMode,
  setIsSunlightMode,
  isHandsFree,
  setIsHandsFree,
}) {
  const t = T[selectedLang] || T['en'];

  const languages = [
    { code: 'hi', label: 'हिन्दी' },
    { code: 'en', label: 'EN' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
  ];

  return (
    <header className={`border-b-2 ${isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#0c0e0d]/95 border-zinc-800 text-white'} px-3 sm:px-6 py-2.5 sticky top-0 z-40 backdrop-blur-md shadow-md`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-400 border border-emerald-300 flex items-center justify-center text-black font-black text-lg sm:text-xl shadow-md">
            🌾
          </div>
          <div>
            <h1 className={`font-black text-sm sm:text-base tracking-wide leading-none ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`}>
              AgriPulse AI
            </h1>
            <p className={`text-[10px] font-medium mt-0.5 hidden sm:block ${isSunlightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
              {t.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Voice Assistant Action Button */}
          <button
            onClick={() => { sound.playClick(); onOpenVoiceModal(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black border border-emerald-300 shadow-md transition-transform active:scale-95 whitespace-nowrap"
          >
            <Mic className="w-3.5 h-3.5 fill-black" />
            <span>{t.askAiBtn}</span>
          </button>

          {/* Wet-Hands Hands-Free Button */}
          <button
            onClick={() => {
              sound.playClick();
              setIsHandsFree(!isHandsFree);
            }}
            className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-black transition-all border ${
              isHandsFree
                ? 'bg-emerald-400 text-black border-emerald-300 animate-pulse shadow-md'
                : isSunlightMode
                  ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                  : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:text-white'
            }`}
            title="Hands-Free Voice Navigation"
          >
            <Hand className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">{t.handsFreeMode}</span>
          </button>

          {/* Sunlight Mode Toggle */}
          <button
            onClick={() => {
              sound.playClick();
              setIsSunlightMode(!isSunlightMode);
            }}
            className={`p-1.5 sm:p-2 rounded-xl text-xs border font-black transition-all ${
              isSunlightMode
                ? 'bg-amber-400 text-black border-amber-500 shadow-sm'
                : 'bg-zinc-800 text-white border-zinc-700 hover:border-amber-400'
            }`}
            title="Toggle Sunlight High-Contrast Mode"
          >
            {isSunlightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Language Switcher */}
          <div className={`flex items-center p-0.5 rounded-xl border ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => { sound.playClick(); setSelectedLang(l.code); }}
                className={`px-2 py-1 rounded-lg text-[11px] sm:text-xs font-black transition-all ${
                  selectedLang === l.code
                    ? 'bg-emerald-400 text-black shadow-sm'
                    : isSunlightMode
                      ? 'text-zinc-700 hover:text-black'
                      : 'text-zinc-300 hover:text-white'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Offline Toggle */}
          <button
            onClick={() => { sound.playClick(); setIsOffline(!isOffline); }}
            className={`flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs font-black border transition-all ${
              isOffline
                ? 'bg-amber-400 text-black border-amber-500 shadow-sm'
                : isSunlightMode
                  ? 'bg-zinc-100 text-zinc-700 border-zinc-300'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}
            title="Toggle Offline mode"
          >
            {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden lg:inline">{isOffline ? 'Offline' : 'Online'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
