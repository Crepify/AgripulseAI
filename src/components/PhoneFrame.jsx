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
        <BatteryFull className="w-4.5 h-4.5 w-[18px]" strokeWidth={2.2} />
      </span>
    </div>
  );
}

export default function PhoneFrame({ children }) {
  const [framed, setFramed] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 520);
  useEffect(() => {
    const onResize = () => setFramed(window.innerWidth >= 520);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Real phones: the device IS the frame.
  if (!framed) return children;

  return (
    <div className="fixed inset-0 flex items-center justify-center overflow-hidden select-none"
      style={{ background: 'radial-gradient(1100px 700px at 50% -8%, #14432f 0%, #0b1c14 45%, #050807 100%)' }}>

      {/* desk branding */}
      <div className="absolute bottom-5 inset-x-0 text-center text-emerald-500/40 text-xs font-mono font-bold tracking-[0.35em]">
        AGRIPULSE AI • FARMER COMMERCE OS
      </div>

      <div className="relative" style={{ height: 'min(94dvh, 880px)', aspectRatio: '9 / 19' }}>
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
            <div className="h-full w-full overflow-y-auto overflow-x-hidden no-scrollbar overscroll-contain">
              {children}
            </div>
            {/* home indicator */}
            <div className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 z-[80] h-1 w-28 rounded-full bg-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
}
