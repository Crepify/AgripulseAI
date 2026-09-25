import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { sound } from '../utils/audio';

/*
 * PHONE HOME SCREEN — the presentation opens on a familiar phone launcher.
 * Tapping the AgriPulse icon launches the app (zoom animation), exactly like
 * opening an app on a real device.
 */

const APPS = [
  { label: 'Phone', emoji: '📞', bg: 'from-emerald-500 to-green-600' },
  { label: 'Messages', emoji: '💬', bg: 'from-sky-400 to-blue-600' },
  { label: 'Camera', emoji: '📷', bg: 'from-zinc-600 to-zinc-800' },
  { label: 'Photos', emoji: '🌈', bg: 'from-pink-500 to-rose-600' },
  { label: 'WhatsApp', emoji: '🟢', bg: 'from-green-400 to-emerald-600' },
  { label: 'YouTube', emoji: '▶️', bg: 'from-red-500 to-red-700' },
  { label: 'Maps', emoji: '🗺️', bg: 'from-teal-400 to-cyan-600' },
  { label: 'UPI Pay', emoji: '₹', bg: 'from-indigo-500 to-violet-700' },
  { label: 'Weather', emoji: '⛅', bg: 'from-blue-400 to-sky-600' },
  { label: 'Clock', emoji: '⏰', bg: 'from-slate-500 to-slate-700' },
  { label: 'Settings', emoji: '⚙️', bg: 'from-zinc-500 to-zinc-700' },
];

export default function PhoneHomeScreen({ onOpenApp }) {
  const [now, setNow] = useState(new Date());
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(id);
  }, []);

  const launch = () => {
    if (launching) return;
    sound.playClick();
    setLaunching(true);
    setTimeout(onOpenApp, 550);
  };

  const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  const hh = now.getHours() % 12 || 12;
  const mm = String(now.getMinutes()).padStart(2, '0');

  return (
    <div className="relative min-h-dvh w-full flex flex-col overflow-hidden"
      style={{ background: 'linear-gradient(165deg, #052e1c 0%, #0a4a2e 35%, #0f3a40 75%, #071c26 100%)' }}>
      {/* wallpaper glow + fields silhouette */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-emerald-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-24 -left-16 w-60 h-60 rounded-full bg-teal-300/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 inset-x-0 text-[64px] leading-none opacity-15 text-center tracking-[-8px]">🌾🌾🌾🌾🌾🌾</div>

      {/* clock widget */}
      <div className="pt-16 pb-6 text-center text-white">
        <div className="text-6xl font-black tracking-tight drop-shadow-lg">{hh}:{mm}</div>
        <div className="text-sm font-bold text-emerald-100/90 mt-1">{dateStr}</div>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold text-emerald-50 backdrop-blur">
          ⛅ 27° • Good morning, Kisan ji 🙏
        </div>
      </div>

      {/* app grid */}
      <div className="flex-1 px-6">
        <div className="grid grid-cols-4 gap-x-4 gap-y-5">
          {/* THE APP — AgriPulse */}
          <motion.button onClick={launch} whileTap={{ scale: 0.9 }}
            animate={launching ? { scale: 14, opacity: 0 } : { scale: 1, opacity: 1 }}
            transition={launching ? { duration: 0.55, ease: 'easeIn' } : {}}
            className="flex flex-col items-center gap-1.5 origin-center z-10" aria-label="Open AgriPulse AI">
            <span className="relative w-[62px] h-[62px] rounded-[18px] bg-gradient-to-br from-emerald-400 to-green-700 flex items-center justify-center shadow-lg shadow-emerald-900/50 ring-2 ring-emerald-300/60">
              <Leaf className="w-8 h-8 text-white drop-shadow" strokeWidth={2.4} />
              <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-black/30">3</span>
            </span>
            <span className="text-[11px] font-bold text-white drop-shadow">AgriPulse</span>
          </motion.button>

          {APPS.map((a) => (
            <button key={a.label} onClick={() => sound.playTransition()}
              className="flex flex-col items-center gap-1.5 opacity-90 active:scale-90 transition-transform">
              <span className={`w-[62px] h-[62px] rounded-[18px] bg-gradient-to-br ${a.bg} flex items-center justify-center text-[26px] font-black text-white shadow-md shadow-black/40`}>
                {a.emoji}
              </span>
              <span className="text-[11px] font-bold text-white/90 drop-shadow">{a.label}</span>
            </button>
          ))}
        </div>

        {/* hint */}
        {!launching && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            className="mt-7 mx-auto w-fit px-4 py-2 rounded-full bg-black/35 backdrop-blur text-emerald-200 text-xs font-bold border border-emerald-400/30">
            👆 Tap <span className="text-white">AgriPulse</span> to open the app
          </motion.div>
        )}
      </div>

      {/* dock */}
      <div className="px-6 pb-7 pt-3">
        <div className="rounded-3xl bg-white/10 backdrop-blur-md px-5 py-3 flex items-center justify-between border border-white/10">
          {['📞', '💬', '🌐', '📷'].map((e, i) => (
            <button key={i} onClick={() => sound.playTransition()} className="w-[56px] h-[56px] rounded-[16px] bg-white/15 flex items-center justify-center text-2xl active:scale-90 transition-transform">{e}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
