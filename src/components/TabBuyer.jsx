import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, MapPin, Droplets, BadgeCheck, Loader2, TrendingUp, X } from 'lucide-react';
import { sound } from '../utils/audio';
import { RATES, GOVT_BENCHMARKS, inr } from '../utils/saathiEconomics';

/*
 * BUYER REAL-TIME BIDDING & SUPPLY MAP
 * ────────────────────────────────────
 * Executive mobile dashboard for verified bulk buyers (retailers,
 * processors, FPOs). Buyer pays ₹300/q — funds lock 100% in Razorpay
 * escrow BEFORE dispatch; released only on the dual-QR cross-scan.
 */

const HUBS = [
  { id: 'khed', name: 'Khed Hub', x: 32, y: 38, tons: 12, crop: 'Tomato', emoji: '🍅' },
  { id: 'mandya', name: 'Mandya Hub', x: 44, y: 78, tons: 8, crop: 'Onion', emoji: '🧅' },
  { id: 'nashik', name: 'Nashik Hub', x: 26, y: 30, tons: 15, crop: 'Onion', emoji: '🧅' },
  { id: 'indore', name: 'Indore Hub', x: 40, y: 22, tons: 6, crop: 'Soybean', emoji: '🫘' },
  { id: 'ludhiana', name: 'Ludhiana Hub', x: 36, y: 6, tons: 10, crop: 'Wheat', emoji: '🌾' },
];

const LOTS = [
  { id: 'LOT-9F2', hub: 'khed', crop: 'Tomato', emoji: '🍅', quintals: 52, grade: 'A', moisture: 11.2, quality: 94, farmers: 9, village: 'Khed, Pune' },
  { id: 'LOT-8B7', hub: 'nashik', crop: 'Onion', emoji: '🧅', quintals: 80, grade: 'A', moisture: 9.8, quality: 91, farmers: 14, village: 'Pimpalgaon, Nashik' },
  { id: 'LOT-7C4', hub: 'mandya', crop: 'Onion', emoji: '🧅', quintals: 44, grade: 'B', moisture: 12.4, quality: 84, farmers: 7, village: 'Maddur, Mandya' },
  { id: 'LOT-6A1', hub: 'ludhiana', crop: 'Wheat', emoji: '🌾', quintals: 96, grade: 'A', moisture: 10.1, quality: 96, farmers: 18, village: 'Khanna, Ludhiana' },
];

export default function TabBuyer({ isSunlightMode }) {
  const card = isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white';
  const sub = isSunlightMode ? 'text-zinc-600' : 'text-zinc-400';
  const [selectedHub, setSelectedHub] = useState(null);
  const [locking, setLocking] = useState(null);   // lot id being paid
  const [locked, setLocked] = useState({});       // { lotId: true }
  const [payModal, setPayModal] = useState(null); // lot object

  const lots = selectedHub ? LOTS.filter((l) => l.hub === selectedHub) : LOTS;

  const lockLot = (lot) => {
    sound.playClick(); setPayModal(lot);
  };

  const confirmPay = (lot) => {
    setLocking(lot.id);
    // Razorpay escrow: 100% of funds lock before pickup dispatch
    setTimeout(() => {
      setLocking(null); setLocked((p) => ({ ...p, [lot.id]: true })); setPayModal(null); sound.playSuccess();
    }, 1600);
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Buyer header */}
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="text-[10px] font-mono font-black tracking-widest text-emerald-500">VERIFIED BULK BUYER</div>
        <div className="text-lg font-black flex items-center gap-1.5">FreshKart Retail Pvt Ltd <BadgeCheck className="w-5 h-5 text-emerald-500" /></div>
        <div className={`text-xs font-bold ${sub}`}>GSTIN verified • Razorpay escrow enabled • buys at ₹{RATES.BUYER_PAYS_PER_QUINTAL}/q (≈25% below retail market)</div>
      </div>

      {/* Live supply map (stylised village node clusters) */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="p-3 pb-0 flex items-center justify-between">
          <h3 className="font-black text-sm flex items-center gap-1.5"><MapPin className="w-4 h-4 text-emerald-500" /> Live Supply Map</h3>
          {selectedHub && <button onClick={() => { sound.playClick(); setSelectedHub(null); }} className="text-[11px] font-black text-amber-500">Clear filter ✕</button>}
        </div>
        <div className="relative m-3 h-56 rounded-xl overflow-hidden border border-emerald-800/30" style={{ background: 'linear-gradient(160deg, #0f2419 0%, #14352a 45%, #0d1f2d 100%)' }}>
          {/* grid lines for map feel */}
          <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(#34d399 1px, transparent 1px), linear-gradient(90deg, #34d399 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          {HUBS.map((h) => (
            <button key={h.id} onClick={() => { sound.playClick(); setSelectedHub(h.id === selectedHub ? null : h.id); }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${h.x}%`, top: `${h.y}%` }}>
              <span className={`relative flex h-4 w-4 items-center justify-center ${selectedHub === h.id ? '' : ''}`}>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className={`relative inline-flex h-3 w-3 rounded-full border-2 ${selectedHub === h.id ? 'bg-amber-400 border-amber-200' : 'bg-emerald-400 border-emerald-200'}`} />
              </span>
              <span className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-black whitespace-nowrap ${selectedHub === h.id ? 'bg-amber-400 text-black' : 'bg-black/75 text-emerald-300'}`}>
                {h.name}: {h.tons}T {h.emoji}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Benchmark strip */}
      <div className={`p-3 rounded-2xl border flex items-center justify-between text-center ${card}`}>
        <div><div className={`text-[9px] font-bold ${sub}`}>GOVT MSP</div><div className="font-black">₹{GOVT_BENCHMARKS.msp}/q</div></div>
        <div><div className={`text-[9px] font-bold ${sub}`}>e-NAM</div><div className="font-black">₹{GOVT_BENCHMARKS.enam}/q</div></div>
        <div><div className={`text-[9px] font-bold ${sub}`}>YOU PAY</div><div className="font-black text-emerald-500">₹{RATES.BUYER_PAYS_PER_QUINTAL}/q</div></div>
        <div><div className={`text-[9px] font-bold ${sub}`}>RETAIL MKT</div><div className="font-black text-red-500 line-through">₹400/q</div></div>
      </div>

      {/* Live bidding panel */}
      <h3 className={`font-black text-sm flex items-center gap-1.5 px-1 ${isSunlightMode ? 'text-zinc-800' : 'text-white'}`}><TrendingUp className="w-4 h-4 text-emerald-500" /> Aggregated Village Lots ({lots.length})</h3>
      {lots.map((lot) => {
        const total = lot.quintals * RATES.BUYER_PAYS_PER_QUINTAL;
        const isLocked = locked[lot.id];
        return (
          <div key={lot.id} className={`p-4 rounded-2xl border-2 ${isLocked ? 'border-emerald-600' : isSunlightMode ? 'border-zinc-300 bg-white text-zinc-900' : 'border-[#1f2421] bg-[#121514] text-white'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0 ${isSunlightMode ? 'bg-zinc-100' : 'bg-zinc-900'}`}>{lot.emoji}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-black text-base truncate">{lot.crop} • {lot.quintals} q</div>
                  <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${lot.grade === 'A' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>GRADE {lot.grade}</span>
                </div>
                <div className={`text-[11px] font-bold ${sub}`}>📍 {lot.village} • {lot.farmers} farmers • AI quality {lot.quality}/100</div>
                <div className={`text-[11px] font-bold flex items-center gap-1 ${sub}`}><Droplets className="w-3 h-3 text-blue-400" /> Moisture {lot.moisture}% • CV audit 3/3 frames ✓</div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div>
                <div className={`text-[9px] font-bold ${sub}`}>LOT TOTAL (100% ESCROW)</div>
                <div className="text-xl font-black">{inr(total)}</div>
              </div>
              {isLocked ? (
                <span className="flex items-center gap-1.5 px-4 min-h-[48px] rounded-xl bg-amber-500 text-black text-xs font-black"><Lock className="w-4 h-4" /> Escrowed • Truck assigned 🟡</span>
              ) : (
                <button onClick={() => lockLot(lot)} className="min-h-[56px] px-4 rounded-xl bg-emerald-600 text-white text-sm font-black flex items-center gap-2 active:scale-95">
                  <Lock className="w-4 h-4" /> Lock Lot & Pay Escrow
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Razorpay escrow modal */}
      <AnimatePresence>
        {payModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/70 flex items-end justify-center" onClick={() => !locking && setPayModal(null)}>
            <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: 'spring', damping: 28 }} onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white text-zinc-900 rounded-t-3xl p-5 pb-8">
              <div className="flex items-center justify-between mb-3">
                <div className="font-black text-lg">Razorpay Escrow</div>
                <button onClick={() => !locking && setPayModal(null)} className="p-2"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-3 rounded-xl bg-zinc-100 text-sm font-bold space-y-1">
                <div className="flex justify-between"><span>{payModal.emoji} {payModal.crop} • {payModal.quintals} q</span><span>{payModal.id}</span></div>
                <div className="flex justify-between"><span>Rate</span><span>₹{RATES.BUYER_PAYS_PER_QUINTAL}/q</span></div>
                <div className="flex justify-between text-lg font-black"><span>Lock in escrow</span><span>{inr(payModal.quintals * RATES.BUYER_PAYS_PER_QUINTAL)}</span></div>
              </div>
              <p className="text-[11px] font-bold text-zinc-500 mt-2">Funds release to farmer UPI + Saathi + hub ONLY after the dual-QR dispatch cross-scan. Quality mismatch = auto-refund.</p>
              <button onClick={() => confirmPay(payModal)} disabled={!!locking}
                className="mt-4 w-full min-h-[56px] rounded-2xl bg-[#0F172A] text-white font-black text-base flex items-center justify-center gap-2">
                {locking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />} {locking ? 'Locking with Razorpay…' : 'Pay 100% to Escrow (UPI)'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
