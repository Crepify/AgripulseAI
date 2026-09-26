import React, { useEffect, useState } from 'react';
import { Wifi, Signal, BatteryFull } from 'lucide-react';

/*
 * PHONE DEVICE FRAME — presentation mode.
 * On laptops/projectors the entire app runs inside a realistic Android-style
 * device: bezel, dynamic island, live status bar, side buttons.
 * On a real phone (<520px) the frame disappears and the app is native-fullscreen.
 *
 * The `transform: translateZ(0)` on the screen surface makes every
 * `position: fixed` element inside the app (bottom nav, modals, FABs)
 * anchor to the phone screen instead of the browser viewport.
 */

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 20_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function StatusBar() {
  const now = useClock();
  const hh = now.getHours() % 12 || 12;
  const mm = String(now.getMinutes()).padStart(2, '0');
  return (
    <div className="pointer-events-none absolute top-0 inset-x-0 z-[70] flex items-center justify-between px-7 pt-2.5 text-white mix-blend-difference">
      <span className="text-[12px] font-black tracking-wide drop-shadow">{hh}:{mm}</span>
      <span className="flex items-center gap-1.5 drop-shadow">
        <Signal className="w-3.5 h-3.5" strokeWidth={2.6} />
        <Wifi className="w-3.5 h-3.5" strokeWidth={2.6} />
        <BatteryFull className="h-[18px] w-[18px]" strokeWidth={2.2} />
      </span>
    </div>
  );
}

export default function PhoneFrame({ children, onHome, companion }) {
  const [framed, setFramed] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 520);
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1000);
  useEffect(() => {
    const onResize = () => {
      setFramed(window.innerWidth >= 520);
      setWide(window.innerWidth >= 1000);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Second WhatsApp device only in wide presentation mode, and only for the
  // main app frame (not landing / phone home screen).
  const showCompanion = framed && wide && companion;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ap:wa-side', { detail: { side: showCompanion } }));
  }, [showCompanion]);

  // Real phones: the device IS the frame.
  if (!framed) return children;

  return (
    <div className="fixed inset-0 flex items-center justify-center gap-10 overflow-hidden select-none"
      style={{ background: 'radial-gradient(1100px 700px at 50% -8%, #14432f 0%, #0b1c14 45%, #050807 100%)' }}>

      {/* desk branding */}
      <div className="absolute bottom-5 inset-x-0 text-center text-emerald-500/40 text-xs font-mono font-bold tracking-[0.35em]">
        AGRIPULSE AI • FARMER COMMERCE OS{showCompanion ? ' • WHATSAPP LIVE FEED' : ''}
      </div>

      {/*
        Sized off the STABLE viewport (vh), not dvh — the dynamic viewport
        grows/shrinks with the URL bar & on-screen keyboard, which re-derived
        a wider/narrower phone through the aspect ratio on every change.
      */}
      <div className="relative" style={{ height: 'min(94vh, 880px)', aspectRatio: '9 / 19', maxWidth: '96vw' }}>
        {/* side hardware buttons */}
        <div className="absolute -left-[3px] top-[18%] h-14 w-[4px] rounded-l-md bg-zinc-800" />
        <div className="absolute -left-[3px] top-[28%] h-20 w-[4px] rounded-l-md bg-zinc-800" />
        <div className="absolute -right-[3px] top-[22%] h-24 w-[4px] rounded-r-md bg-zinc-800" />

        {/* bezel */}
        <div className="h-full w-full rounded-[46px] bg-zinc-950 p-[9px] ring-1 ring-zinc-600/50 shadow-[0_30px_90px_-15px_rgba(0,0,0,0.9),0_0_60px_rgba(16,185,129,0.08)]">
          {/* screen surface — fixed elements anchor here */}
          <div className="ap-in-frame relative h-full w-full overflow-hidden rounded-[38px] bg-black" style={{ transform: 'translateZ(0)' }}>
            <StatusBar />
            {/* dynamic island */}
            <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-[80] h-[24px] w-[92px] rounded-full bg-black shadow-inner flex items-center justify-end pr-2">
              <span className="h-2.5 w-2.5 rounded-full bg-zinc-800 ring-1 ring-zinc-700" />
            </div>
            {/* app viewport */}
            <div className="ap-screen-scroll h-full w-full overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain">
              {children}
            </div>
            {/* home indicator — tap to go back to the phone home screen */}
            <button
              onClick={onHome}
              disabled={!onHome}
              aria-label="Go to home screen"
              title={onHome ? 'Tap to go Home' : undefined}
              className={`group absolute bottom-0 left-1/2 -translate-x-1/2 z-[90] flex h-6 w-40 items-end justify-center pb-1.5 ${onHome ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <span className={`h-1 w-28 rounded-full bg-white/40 transition-all duration-200 ${onHome ? 'group-hover:w-36 group-hover:h-1.5 group-hover:bg-emerald-300 group-active:scale-90' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* SECOND DEVICE — dedicated WhatsApp phone (side-by-side demo mode).
          WhatsAppScreen portals its hub into #ap-wa-screen. */}
      {showCompanion && (
        <div className="relative" style={{ height: 'min(86vh, 800px)', aspectRatio: '9 / 19', maxWidth: '44vw' }}>
          <div className="absolute -left-[3px] top-[20%] h-16 w-[4px] rounded-l-md bg-zinc-800" />
          <div className="absolute -right-[3px] top-[24%] h-20 w-[4px] rounded-r-md bg-zinc-800" />
          <div className="h-full w-full rounded-[42px] bg-zinc-950 p-[8px] ring-1 ring-zinc-600/50 shadow-[0_30px_90px_-15px_rgba(0,0,0,0.9),0_0_60px_rgba(37,211,102,0.10)]">
            <div className="ap-in-frame relative h-full w-full overflow-hidden rounded-[35px] bg-[#0b141a]" style={{ transform: 'translateZ(0)' }}>
              <StatusBar />
              <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-[80] h-[22px] w-[84px] rounded-full bg-black shadow-inner flex items-center justify-end pr-2">
                <span className="h-2 w-2 rounded-full bg-zinc-800 ring-1 ring-zinc-700" />
              </div>
              {/* WhatsApp hub mounts here via portal */}
              <div id="ap-wa-screen" className="h-full w-full" />
              <div className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 z-[90] h-1 w-24 rounded-full bg-white/40" />
            </div>
          </div>
          <div className="absolute -bottom-8 inset-x-0 text-center text-[#25D366]/50 text-[10px] font-mono font-black tracking-[0.3em]">
            FARMER'S WHATSAPP
          </div>
        </div>
      )}
    </div>
  );
}
