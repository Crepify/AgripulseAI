import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Gavel, Users, Timer, Trophy, MapPin, MessageCircle, Loader2 } from 'lucide-react';
import { sound } from '../utils/audio';
import { inr } from '../utils/evidence';

/*
 * REVERSE FERTILIZER AUCTION
 * Farmers in a taluka pool their input orders for 24h → the aggregated
 * order (e.g. 100 L herbicide) is blasted to 5 local dealers on WhatsApp →
 * dealers bid DOWN → lowest bid wins the whole order.
 */

const PRODUCTS = [
  { id: 'glypho', name: 'Glyphosate 41% SL (herbicide)', unit: 'L', mrp: 420 },
  { id: 'urea', name: 'Urea 45kg bag', unit: 'bag', mrp: 320 },
  { id: 'dap', name: 'DAP 50kg bag', unit: 'bag', mrp: 1450 },
  { id: 'npk', name: 'NPK 19:19:19 (1kg)', unit: 'kg', mrp: 160 },
];

const CO_BUYERS = [
  { name: 'Ramesh (Wadgaon)', qty: 20 },
  { name: 'FPO Shirur group', qty: 25 },
  { name: 'Savita tai (Khed)', qty: 15 },
];

const DEALERS = [
  { name: 'Kisan Agro Centre', dist: '2.1 km', factor: 0.82 },
  { name: 'Bharat Fertilizers', dist: '3.4 km', factor: 0.74 },
  { name: 'Shetkari Krushi Seva', dist: '4.0 km', factor: 0.78 },
  { name: 'Om Sai Agro', dist: '5.2 km', factor: 0.86 },
  { name: 'Green Field Agencies', dist: '6.0 km', factor: 0.71 },
];

export default function TabAuction({ isSunlightMode }) {
  const card = isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white';
  const sub = isSunlightMode ? 'text-zinc-600' : 'text-zinc-400';
  const [product, setProduct] = useState(PRODUCTS[0]);
  const [myQty, setMyQty] = useState(50);
  const [phase, setPhase] = useState('idle'); // idle | pooling | broadcast | bidding | done
  const [coBuyers, setCoBuyers] = useState([]);
  const [bids, setBids] = useState([]);
  const [countdown, setCountdown] = useState(0);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const start = () => {
    sound.playClick();
    timers.current.forEach(clearTimeout); timers.current = [];
    setPhase('pooling'); setCoBuyers([]); setBids([]); setCountdown(24);
    CO_BUYERS.forEach((b, i) => later(() => { setCoBuyers((p) => [...p, b]); sound.playClick(); }, 800 * (i + 1)));
    // fast-forward the 24h pooling window for the demo
    const tick = (h) => { setCountdown(h); if (h > 0) later(() => tick(h - 6), 350); };
    later(() => tick(18), 800);
    later(() => { setPhase('broadcast'); sound.playTransition(); }, 3600);
    later(() => setPhase('bidding'), 5400);
  };

  useEffect(() => {
    if (phase !== 'bidding') return;
    DEALERS.forEach((d, i) => {
      later(() => {
        setBids((prev) => [...prev, { ...d, price: Math.round(product.mrp * d.factor) }]);
        sound.playClick();
      }, 1000 * (i + 1));
    });
    later(() => { setPhase('done'); sound.playSuccess(); }, 1000 * DEALERS.length + 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const totalQty = myQty + coBuyers.reduce((s, b) => s + b.qty, 0);
  const winner = bids.length ? bids.reduce((a, b) => (b.price < a.price ? b : a)) : null;
  const savePerUnit = winner ? product.mrp - winner.price : 0;
  const mySaving = savePerUnit * myQty;

  const waOrder = winner ? encodeURIComponent(
    `REVERSE AUCTION RESULT (AgriPulse AI)\n${product.name} — pooled order ${totalQty} ${product.unit}\nWinning bid: ${winner.name} @ ${inr(winner.price)}/${product.unit} (MRP ${inr(product.mrp)})\nMy share: ${myQty} ${product.unit} = ${inr(winner.price * myQty)} (saved ${inr(mySaving)})\nConfirming pickup.`) : '';

  return (
    <div className="space-y-4 pb-28">
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="text-[10px] font-mono font-black tracking-widest text-emerald-500">REVERSE AUCTION • उल्टी बोली</div>
        <div className="text-lg font-black">Make dealers fight for YOUR order</div>
        <p className={`text-xs font-bold mt-1 ${sub}`}>Your order pools with neighbours for 24h → 5 dealers get one WhatsApp blast → lowest bid wins the whole lot.</p>
      </div>

      {/* order form */}
      <div className={`p-4 rounded-2xl border ${card}`}>
        <label className={`text-[10px] font-mono font-black ${sub}`}>WHAT DO YOU NEED?</label>
        <select value={product.id} onChange={(e) => setProduct(PRODUCTS.find((p) => p.id === e.target.value))}
          className={`mt-1 w-full min-h-[56px] px-3 rounded-xl border-2 text-sm font-black outline-none ${isSunlightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
          {PRODUCTS.map((p) => <option key={p.id} value={p.id}>{p.name} — MRP {inr(p.mrp)}/{p.unit}</option>)}
        </select>
        <label className={`mt-3 block text-[10px] font-mono font-black ${sub}`}>QUANTITY ({product.unit.toUpperCase()})</label>
        <input type="number" value={myQty} min={1} onChange={(e) => setMyQty(Number(e.target.value) || 0)}
          className={`mt-1 w-full min-h-[56px] px-3 rounded-xl border-2 text-xl font-black text-center outline-none ${isSunlightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`} />
        <button onClick={start} className="mt-3 w-full min-h-[56px] rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
          <Gavel className="w-5 h-5" /> Start pooled reverse auction
        </button>
      </div>

      {/* pooling window */}
      {phase !== 'idle' && (
        <div className={`p-4 rounded-2xl border ${card}`}>
          <div className="flex items-center justify-between font-black text-sm">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-emerald-500" /> Taluka pooling window</span>
            {phase === 'pooling'
              ? <span className="flex items-center gap-1 text-amber-500"><Timer className="w-4 h-4" /> {countdown}h left</span>
              : <span className="text-emerald-500">CLOSED — {totalQty} {product.unit}</span>}
          </div>
          <div className="mt-2 space-y-1.5">
            <div className={`p-2.5 rounded-xl border-2 border-emerald-500 flex justify-between text-sm font-black ${isSunlightMode ? 'bg-emerald-50' : 'bg-emerald-950/30'}`}><span>👨‍🌾 You</span><span>{myQty} {product.unit}</span></div>
            {coBuyers.map((b) => (
              <motion.div key={b.name} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                className={`p-2.5 rounded-xl border flex justify-between text-sm font-bold ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
                <span>{b.name}</span><span>{b.qty} {product.unit}</span>
              </motion.div>
            ))}
          </div>
          {phase === 'broadcast' && (
            <div className="mt-3 flex items-center gap-2 text-emerald-500 font-black text-xs">
              <Loader2 className="w-4 h-4 animate-spin" /> WhatsApp blast → 5 dealers: “{totalQty} {product.unit} {product.name}. Best price wins the entire order.”
            </div>
          )}
        </div>
      )}

      {/* bids */}
      {(phase === 'bidding' || phase === 'done') && (
        <div className={`p-4 rounded-2xl border ${card}`}>
          <div className="font-black text-sm mb-2 flex items-center gap-1.5"><Gavel className="w-4 h-4 text-amber-500" /> Dealer bids (per {product.unit}, MRP {inr(product.mrp)})</div>
          <div className="space-y-1.5">
            {bids.map((b) => {
              const isWinner = phase === 'done' && winner && b.name === winner.name;
              return (
                <motion.div key={b.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className={`p-2.5 rounded-xl border-2 flex items-center justify-between text-sm font-black ${isWinner ? 'border-emerald-500 bg-emerald-600 text-white' : isSunlightMode ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800 bg-zinc-900'}`}>
                  <span className="flex items-center gap-1.5">{isWinner && <Trophy className="w-4 h-4" />} {b.name} <span className={`text-[10px] font-bold ${isWinner ? 'opacity-90' : sub}`}>({b.dist})</span></span>
                  <span>{inr(b.price)}</span>
                </motion.div>
              );
            })}
            {phase === 'bidding' && <div className={`text-xs font-bold flex items-center gap-1.5 ${sub}`}><Loader2 className="w-3.5 h-3.5 animate-spin" /> Bids coming in…</div>}
          </div>
        </div>
      )}

      {/* winner */}
      {phase === 'done' && winner && (
        <div className={`p-4 rounded-2xl border-2 border-emerald-600 ${card}`}>
          <div className="text-emerald-500 font-black text-sm flex items-center gap-1.5"><Trophy className="w-5 h-5" /> {winner.name} wins @ {inr(winner.price)}/{product.unit}</div>
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-center text-emerald-600 font-black text-sm">
            Your {myQty} {product.unit} = {inr(winner.price * myQty)} — you save {inr(mySaving)} vs MRP
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <a href={`https://wa.me/?text=${waOrder}`} target="_blank" rel="noreferrer" onClick={() => sound.playClick()}
              className="min-h-[56px] rounded-2xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center gap-1.5 active:scale-[0.98]">
              <MessageCircle className="w-4 h-4" /> Confirm on WhatsApp
            </a>
            <a href={`https://www.google.com/maps/search/${encodeURIComponent(winner.name)}`} target="_blank" rel="noreferrer" onClick={() => sound.playClick()}
              className={`min-h-[56px] rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] ${isSunlightMode ? 'border-zinc-300 text-zinc-800' : 'border-zinc-700 text-zinc-200'}`}>
              <MapPin className="w-4 h-4" /> Directions ({winner.dist})
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
