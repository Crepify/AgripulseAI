import React, { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff, Mic, Sun, Moon, Hand, Download, Globe, LogOut, Eye, SlidersHorizontal, Check, X, FlaskConical } from 'lucide-react';
import { isDemoMode, setDemoMode } from '../utils/authService';
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
  user,
  onLogout,
  isLowLiteracy,
  setIsLowLiteracy,
}) {
  const t = T[selectedLang] || T['en'];
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [demoOn, setDemoOn] = useState(() => isDemoMode());
  const settingsRef = useRef(null);

  // Close the settings panel on outside tap / Escape
  useEffect(() => {
    if (!settingsOpen) return;
    const onDown = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) setSettingsOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setSettingsOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [settingsOpen]);

  const languages = [
    { code: 'hi', label: 'हिन्दी' },
    { code: 'en', label: 'EN' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'ml', label: 'മലയാളം' },
    { code: 'mr', label: 'मराठी' },
    { code: 'pa', label: 'ਪੰਜਾਬੀ' },
    { code: 'bn', label: 'বাংলা' },
    { code: 'gu', label: 'ગુજરાતી' },
    { code: 'or', label: 'ଓଡ଼ିଆ' },
    { code: 'as', label: 'অসমীয়া' },
    { code: 'mai', label: 'मैथिली' },
    { code: 'sat', label: 'ᱥᱟᱱᱛᱟᱲᱤ' },
    { code: 'ks', label: 'کٲشُر' },
    { code: 'brx', label: 'बड़ो' },
    { code: 'doi', label: 'डोगरी' },
    { code: 'kok', label: 'कोंकणी' },
    { code: 'mni', label: 'মৈতৈলোন্' },
    { code: 'ne', label: 'नेपाली' },
    { code: 'sa', label: 'संस्कृत' },
    { code: 'sd', label: 'سنڌي' },
    { code: 'ur', label: 'اردو' },
  ];

  // Sunlight mode is the default (field-safe), so only flag non-default modes
  const anyModeActive = isLowLiteracy || isHandsFree || isOffline;

  const chipBase = `inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border text-xs font-black transition-all active:scale-95 select-none whitespace-nowrap`;
  const chipIdle = isSunlightMode ? 'bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200' : 'bg-zinc-800/80 text-zinc-200 border-zinc-700 hover:bg-zinc-700/80';
  const chipOn = 'bg-emerald-400 text-black border-emerald-300 shadow-md';

  const toggleRows = [
    {
      key: 'sunlight',
      icon: isSunlightMode ? Sun : Moon,
      iconOn: 'text-black',
      iconOff: 'text-amber-400',
      on: isSunlightMode,
      label: t.highContrast || 'Sunlight Mode',
      desc: 'High-contrast screen for direct outdoor sunlight',
      action: () => setIsSunlightMode(!isSunlightMode),
    },
    {
      key: 'lowLiteracy',
      icon: Eye,
      iconOn: 'text-black',
      iconOff: 'text-blue-400',
      on: isLowLiteracy,
      label: 'Big Simple Icons',
      desc: 'Larger buttons and simple icon labels',
      action: () => setIsLowLiteracy(!isLowLiteracy),
    },
    {
      key: 'handsFree',
      icon: Hand,
      iconOn: 'text-black',
      iconOff: 'text-emerald-400',
      on: isHandsFree,
      label: t.handsFreeMode || 'Hands-Free (Wet Hands)',
      desc: 'Control the app by voice, no touch needed',
      action: () => setIsHandsFree(!isHandsFree),
    },
    {
      key: 'demo',
      icon: FlaskConical,
      iconOn: 'text-black',
      iconOff: 'text-violet-400',
      on: demoOn,
      label: t.demoMode || 'Demo Mode',
      desc: t.demoModeDesc || 'Presentation mode — any 12-digit Aadhaar accepted, sample data allowed',
      action: () => { setDemoMode(!demoOn); setDemoOn(!demoOn); },
    },
    {
      key: 'offline',
      icon: isOffline ? WifiOff : Wifi,
      iconOn: 'text-black',
      iconOff: 'text-emerald-400',
      on: isOffline,
      label: isOffline ? t.offlineMode : t.onlineMode,
      desc: 'Demo switch — the app also works offline automatically',
      action: () => setIsOffline(!isOffline),
    },
  ];

  return (
    <header
      ref={settingsRef}
      className={`relative w-full border-b-2 backdrop-blur-md ${
        isSunlightMode ? 'bg-white/95 border-zinc-300 text-zinc-900' : 'bg-[#0c0e0d]/95 border-zinc-800 text-white'
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-2 gap-y-1.5 px-2.5 py-1.5 sm:px-6 sm:py-2">
        {/* Brand Logo & Name */}
        <div className="flex min-w-0 items-center gap-2">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-400 border border-emerald-300 text-base sm:text-lg shadow-sm`}>
            🌾
          </div>
          <div className="min-w-0">
            <h1 className={`truncate font-black text-sm sm:text-base tracking-tight leading-none ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`}>
              AgriPulse AI
            </h1>
            <p className={`hidden truncate text-[10px] font-medium mt-0.5 sm:block ${isSunlightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
              {t.brandSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls — wraps to a second row on narrow screens instead of clipping */}
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          {/* Vernacular Language Selector */}
          <div className={`flex items-center gap-1 rounded-xl border pl-2 pr-1 ${isSunlightMode ? 'bg-zinc-100 border-zinc-300 text-zinc-900' : 'bg-zinc-800/80 border-zinc-700 text-white'}`}>
            <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              aria-label="Select Language"
              value={selectedLang}
              onChange={(e) => {
                sound.playClick();
                setSettingsOpen(false);
                setSelectedLang(e.target.value);
              }}
              className="h-10 max-w-[96px] sm:max-w-none bg-transparent border-none outline-none text-xs font-black cursor-pointer"
            >
              {languages.map((l) => (
                <option key={l.code} value={l.code} className="bg-zinc-900 text-white">
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Assistant — the #1 action stays one tap away, always visible */}
          <button
            onClick={() => { sound.playClick(); setSettingsOpen(false); onOpenVoiceModal(); }}
            className={`${chipBase} ${chipOn} px-3.5`}
            aria-label="Voice Assistant"
          >
            <Mic className="w-4 h-4 fill-black" />
            <span>{selectedLang === 'hi' ? 'बोलें' : 'Voice'}</span>
          </button>

          {/* Settings — secondary modes grouped here so the top bar scales cleanly */}
          <button
            onClick={() => { sound.playClick(); setSettingsOpen(!settingsOpen); }}
            aria-expanded={settingsOpen}
            aria-haspopup="true"
            aria-label="Display & mode settings"
            className={`${chipBase} relative px-2.5 ${settingsOpen ? chipOn : chipIdle}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {anyModeActive && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 border border-white text-[8px] font-black text-black">
                !
              </span>
            )}
          </button>

          {/* Logged-in Farmer Chip + Logout */}
          {user && (
            <>
              <div
                className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 ${
                  isSunlightMode ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-500/15 border-emerald-500/40'
                }`}
                title={user.email
                  ? `${user.name} · ${user.email}${user.authProvider?.endsWith('-demo') ? ' · DEMO' : ''}${user.village ? ` · ${user.village}` : ''}`
                  : `${user.name} · +91 ${user.mobile}${user.authProvider?.endsWith('-demo') ? ' · DEMO' : ''}${user.village ? ` · ${user.village}` : ''}`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-black text-[11px] font-black uppercase">
                  {(user.name || 'K')[0]}
                </span>
                <span className={`hidden md:inline text-xs font-black max-w-[90px] truncate ${isSunlightMode ? 'text-zinc-800' : 'text-zinc-200'}`}>
                  {(user.name || '').split(' ')[0]}
                </span>
                {user.authProvider?.endsWith('-demo') && (
                  <span className={`hidden sm:inline px-1.5 py-0.5 rounded text-[9px] font-black ${isSunlightMode ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/15 text-amber-400'}`}>
                    DEMO
                  </span>
                )}
              </div>
              <button
                onClick={() => { setSettingsOpen(false); onLogout(); }}
                className={`${chipBase} px-2.5 ${
                  isSunlightMode
                    ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100'
                    : 'bg-red-950/40 text-red-400 border-red-900 hover:bg-red-950/70'
                }`}
                title={selectedLang === 'hi' ? 'लॉगआउट' : 'Logout'}
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Settings Panel — every mode toggle, all info preserved, reachable at any width */}
      {settingsOpen && (
        <div
          role="menu"
          aria-label="Settings"
          className={`absolute right-2 top-full mt-1.5 w-[min(94vw,360px)] rounded-2xl border-2 shadow-2xl overflow-hidden z-50 ${
            isSunlightMode ? 'bg-white border-zinc-300' : 'bg-[#121514] border-zinc-700'
          }`}
        >
          <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isSunlightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
            <span className={`text-xs font-black tracking-wide ${isSunlightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>
              {selectedLang === 'hi' ? 'मोड्स और सेटिंग्स' : 'Modes & Settings'}
            </span>
            <button
              onClick={() => setSettingsOpen(false)}
              aria-label="Close settings"
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${isSunlightMode ? 'text-zinc-500 hover:bg-zinc-100' : 'text-zinc-400 hover:bg-zinc-800'}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-[min(60vh,420px)] overflow-y-auto">
            {toggleRows.map((row) => {
              const RowIcon = row.icon;
              return (
                <button
                  key={row.key}
                  role="menuitemcheckbox"
                  aria-checked={row.on}
                  onClick={() => { sound.playClick(); row.action(); }}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                    isSunlightMode ? 'hover:bg-zinc-50 active:bg-zinc-100' : 'hover:bg-zinc-800/50 active:bg-zinc-800'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                      row.on ? 'bg-emerald-400 border-emerald-300' : isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-800 border-zinc-700'
                    }`}
                  >
                    <RowIcon className={`w-4.5 h-4.5 ${row.on ? row.iconOn : row.iconOff}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-xs font-black ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`}>{row.label}</span>
                    <span className={`block text-[11px] leading-snug ${isSunlightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{row.desc}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors border ${
                      row.on ? 'bg-emerald-400 border-emerald-300' : isSunlightMode ? 'bg-zinc-200 border-zinc-300' : 'bg-zinc-700 border-zinc-600'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4.5 w-4.5 rounded-full shadow transition-all ${
                        row.on ? 'left-[calc(100%-1.25rem)] bg-black' : `left-0.5 ${isSunlightMode ? 'bg-white' : 'bg-zinc-300'}`
                      }`}
                    />
                  </span>
                </button>
              );
            })}

            {/* Install App action */}
            <button
              role="menuitem"
              onClick={() => { sound.playClick(); setSettingsOpen(false); onOpenInstallModal(); }}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors border-t ${
                isSunlightMode ? 'border-zinc-200 hover:bg-zinc-50' : 'border-zinc-800 hover:bg-zinc-800/50'
              }`}
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-amber-400 border-amber-300`}>
                <Download className="w-4.5 h-4.5 text-black" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-xs font-black ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`}>
                  {selectedLang === 'hi' ? 'ऐप इंस्टॉल करें' : 'Install App'}
                </span>
                <span className={`block text-[11px] leading-snug ${isSunlightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  Add to home screen — works offline
                </span>
              </span>
              <Check className="w-4 h-4 text-amber-500 shrink-0" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
