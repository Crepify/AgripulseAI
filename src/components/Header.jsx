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
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
  ];

  return (
    <header className={`border-b-2 ${isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-zinc-950 border-zinc-800 text-white'} px-4 lg:px-8 py-3 sticky top-0 z-40 shadow-md`}>
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-400 border-2 border-emerald-300 flex items-center justify-center text-black font-black text-xl shadow-md">
            🌾
          </div>
          <div>
            <h1 className={`font-black text-lg tracking-wide leading-none ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`}>
              AgriPulse AI
            </h1>
            <p className={`text-xs font-medium mt-0.5 ${isSunlightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
              {t.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls - High-Contrast Solid Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Quick Voice Assistant Button */}
          <button
            onClick={() => { sound.playClick(); onOpenVoiceModal(); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black border-2 border-emerald-300 transition-transform active:scale-95 shadow-[0_0_15px_rgba(52,211,153,0.4)]"
          >
            <Mic className="w-4 h-4 fill-black" />
            <span>{t.askAiBtn}</span>
          </button>

          {/* Wet-Hands / Hands-Free Voice Mode Toggle */}
          <button
            onClick={() => {
              sound.playClick();
              setIsHandsFree(!isHandsFree);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all border-2 shadow-sm ${
              isHandsFree
                ? 'bg-emerald-400 text-black border-emerald-300 animate-pulse'
                : isSunlightMode
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-400 hover:bg-zinc-200'
                  : 'bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-emerald-500'
            }`}
            title="Hands-Free Voice Navigation for Muddy/Wet hands"
          >
            <Hand className="w-4 h-4 text-emerald-400" />
            <span>{t.handsFreeMode}</span>
          </button>

          {/* Sunlight Mode Toggle */}
          <button
            onClick={() => {
              sound.playClick();
              setIsSunlightMode(!isSunlightMode);
            }}
            className={`p-2 rounded-xl text-xs border-2 font-black transition-all shadow-sm ${
              isSunlightMode
                ? 'bg-amber-400 text-black border-amber-500'
                : 'bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-amber-400'
            }`}
            title="Toggle Sunlight High-Contrast Mode"
          >
            {isSunlightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-amber-400" />}
          </button>

          {/* High-Contrast Language Switcher */}
          <div className={`flex items-center p-1 rounded-xl border-2 ${isSunlightMode ? 'bg-zinc-100 border-zinc-400' : 'bg-zinc-900 border-zinc-700'}`}>
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => { sound.playClick(); setSelectedLang(l.code); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all border ${
                  selectedLang === l.code
                    ? 'bg-emerald-400 text-black border-emerald-300 shadow-sm'
                    : isSunlightMode
                      ? 'bg-white text-zinc-900 border-zinc-300 hover:bg-zinc-200'
                      : 'bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:text-white'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Offline Toggle */}
          <button
            onClick={() => { sound.playClick(); setIsOffline(!isOffline); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border-2 transition-all shadow-sm ${
              isOffline
                ? 'bg-amber-400 text-black border-amber-500'
                : isSunlightMode
                  ? 'bg-zinc-100 text-zinc-900 border-zinc-400 hover:bg-zinc-200'
                  : 'bg-zinc-800 text-white border-zinc-600 hover:bg-zinc-700 hover:border-emerald-500'
            }`}
            title="Toggle Offline mode"
          >
            {isOffline ? <WifiOff className="w-4 h-4 text-black" /> : <Wifi className="w-4 h-4 text-emerald-400" />}
            <span className="hidden sm:inline">{isOffline ? 'Offline' : 'Online'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
