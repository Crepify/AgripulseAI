import React from 'react';
import { Wifi, WifiOff, Mic, Sun, Moon, Hand, Download, Globe } from 'lucide-react';
import { sound } from '../utils/audio';
import { T } from '../data/translations';

export default function Header({
  selectedLang,
  setSelectedLang,
  isOffline,
  setIsOffline,
  onOpenVoiceModal,
  onOpenInstallModal,
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
    { code: 'mr', label: 'मराठी' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ' },
    { code: 'bn', label: 'বাংলা' },
    { code: 'gu', label: 'ગુજરાતી' },
    { code: 'or', label: 'ଓଡ଼ିଆ' },
    { code: 'ml', label: 'മലയാളം' },
    { code: 'as', label: 'অসমীয়া' },
    { code: 'mai', label: 'मैथिली' },
    { code: 'sat', label: 'ᱥᱟᱱᱛᱟᱲᱤ' },
    { code: 'ks', label: 'کأشُر' },
  ];

  return (
    <header className={`border-b-2 ${isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#0c0e0d]/95 border-zinc-800 text-white'} px-2.5 sm:px-6 py-2 sticky top-0 z-40 backdrop-blur-md shadow-md w-full max-w-full overflow-hidden`}>
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-emerald-400 border border-emerald-300 flex items-center justify-center text-black font-black text-sm sm:text-lg shadow-sm">
            🌾
          </div>
          <div>
            <h1 className={`font-black text-xs sm:text-base tracking-tight leading-none ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`}>
              AgriPulse AI
            </h1>
            <p className={`text-[9px] font-medium mt-0.5 hidden sm:block ${isSunlightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
              {t.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls (Clean, Compact & Zero Overflow on Mobile) */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Download / Install App Button */}
          <button
            onClick={() => { sound.playClick(); onOpenInstallModal(); }}
            className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-[11px] font-black border border-amber-300 shadow-sm transition-transform active:scale-95 whitespace-nowrap"
            title="Download App"
            aria-label="Download App"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{selectedLang === 'hi' ? 'ऐप' : 'Install'}</span>
          </button>

          {/* Voice Assistant Button */}
          <button
            onClick={() => { sound.playClick(); onOpenVoiceModal(); }}
            className="flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-[11px] font-black border border-emerald-300 shadow-sm transition-transform active:scale-95 whitespace-nowrap"
            aria-label="Voice Assistant"
          >
            <Mic className="w-3.5 h-3.5 fill-black" />
            <span>{selectedLang === 'hi' ? 'बोलें' : 'Voice'}</span>
          </button>

          {/* Compact Vernacular Language Dropdown Selector */}
          <div className={`flex items-center px-1.5 py-1 rounded-xl border ${isSunlightMode ? 'bg-zinc-100 border-zinc-300 text-zinc-900' : 'bg-zinc-800 border-zinc-700 text-white'}`}>
            <Globe className="w-3 h-3 text-emerald-400 mr-0.5 shrink-0" />
            <select
              aria-label="Select Language"
              value={selectedLang}
              onChange={(e) => {
                sound.playClick();
                setSelectedLang(e.target.value);
              }}
              className="bg-transparent border-none outline-none text-[10px] sm:text-xs font-black cursor-pointer pr-0.5"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-zinc-900 text-white">
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Hands-Free Button */}
          <button
            onClick={() => {
              sound.playClick();
              setIsHandsFree(!isHandsFree);
            }}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-black transition-all border ${
              isHandsFree
                ? 'bg-emerald-400 text-black border-emerald-300 animate-pulse shadow-md'
                : isSunlightMode
                  ? 'bg-zinc-100 text-zinc-800 border-zinc-300'
                  : 'bg-zinc-800 text-zinc-200 border-zinc-700'
            }`}
            title="Hands-Free Voice Mode"
            aria-label="Hands-Free Voice Mode"
          >
            <Hand className="w-3 h-3 text-emerald-400" />
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
                : 'bg-zinc-800 text-white border-zinc-700'
            }`}
            title="Sunlight High-Contrast Mode"
            aria-label="Sunlight High-Contrast Mode"
          >
            {isSunlightMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3 text-amber-400" />}
          </button>

          {/* Offline Toggle */}
          <button
            onClick={() => { sound.playClick(); setIsOffline(!isOffline); }}
            className={`p-1.5 sm:px-2 sm:py-1.5 rounded-xl text-xs font-black border transition-all ${
              isOffline
                ? 'bg-amber-400 text-black border-amber-500 shadow-sm'
                : isSunlightMode
                  ? 'bg-zinc-100 text-zinc-700 border-zinc-300'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}
            title="Offline Mode"
            aria-label="Offline Mode"
          >
            {isOffline ? <WifiOff className="w-3 h-3 text-black" /> : <Wifi className="w-3 h-3 text-emerald-400" />}
          </button>
        </div>
      </div>
    </header>
  );
}
