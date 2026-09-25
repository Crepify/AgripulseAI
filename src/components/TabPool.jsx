import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Truck, Users, MapPin, MessageCircle, Loader2, CircleCheck } from 'lucide-react';
import { sound } from '../utils/audio';
import { inr } from '../utils/evidence';

/*
 * VOICE-ACTIVATED TRUCK POOLING
 * Voice note ("300 kg to Pune mandi") → 5-km radius search → loads from
 * nearby farmers aggregate until a 1.5-ton pickup fills → one milk-run,
 * freight split by weight → ~75% cheaper than hiring solo.
 */

const TRUCK_CAPACITY_KG = 1500;
const BASE_FREIGHT = 1800;   // ₹ full pickup, village → mandi
const SOLO_FREIGHT = 1400;   // ₹ what a lone farmer pays for the same trip

const NEARBY = [
  { name: 'Suresh (Wadgaon)', kg: 350, dist: '1.8 km' },
  { name: 'Meena tai (Khed)', kg: 280, dist: '2.6 km' },
  { name: 'Prakash (Chakan)', kg: 400, dist: '4.2 km' },
  { name: 'Anil (Rajgurunagar)', kg: 250, dist: '4.9 km' },
];

export default function TabPool({ isSunlightMode }) {
  const card = isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white';
  const sub = isSunlightMode ? 'text-zinc-600' : 'text-zinc-400';
  const [myKg, setMyKg] = useState(300);
  const [market, setMarket] = useState('Pune Mandi');
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | searching | pooling | full
  const [joined, setJoined] = useState([]);

  // Local speech input — the global voice assistant is untouched.
  const onSpeak = () => {
    sound.playClick();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { startSearch(); return; }
    const rec = new SR();
    rec.lang = 'hi-IN'; rec.interimResults = false;
    setListening(true);
    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      setHeard(text);
      const kgMatch = text.match(/(\d{2,4})/);
      if (kgMatch) setMyKg(Math.min(900, Number(kgMatch[1])));
      setListening(false);
      startSearch();
    };
    rec.onerror = () => { setListening(false); startSearch(); };
    rec.onend = () => setListening(false);
    try { rec.start(); } catch { setListening(false); startSearch(); }
  };

  const startSearch = () => {
    setPhase('searching'); setJoined([]);
    setTimeout(() => {
      setPhase('pooling');
      // farmers join one by one until the truck fills
      NEARBY.forEach((f, i) => {
        setTimeout(() => {
          setJoined((prev) => {
            const next = [...prev, f];
            const total = myKg + next.reduce((s, x) => s + x.kg, 0);
            if (total >= TRUCK_CAPACITY_KG * 0.85 || i === NEARBY.length - 1) {
              setTimeout(() => { setPhase('full'); sound.playSuccess(); }, 600);
            }
            return next;
          });
          sound.playClick();
        }, 900 * (i + 1));
      });
    }, 1400);
  };

  const pooledKg = myKg + joined.reduce((s, f) => s + f.kg, 0);
  const fillPct = Math.min(100, Math.round((pooledKg / TRUCK_CAPACITY_KG) * 100));
  const myShare = pooledKg > 0 ? Math.round(BASE_FREIGHT * (myKg / pooledKg)) : SOLO_FREIGHT;
  const saving = SOLO_FREIGHT - myShare;
  const savingPct = Math.round((saving / SOLO_FREIGHT) * 100);

  const smsDriver = encodeURIComponent(
    `AGRIPULSE POOL DISPATCH\n${market} run — ${pooledKg} kg total (${1 + joined.length} farmers)\nPickups: You (${myKg}kg), ${joined.map((f) => `${f.name} ${f.kg}kg`).join(', ')}\nFreight ${inr(BASE_FREIGHT)} split by weight. Confirm 6 AM tomorrow.`);

  return (
    <div className="space-y-4 pb-28">
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="text-[10px] font-mono font-black tracking-widest text-emerald-500">TRUCK POOLING • साझा ट्रक</div>
        <div className="text-lg font-black">Small load? Don't pay for an empty truck</div>
        <p className={`text-xs font-bold mt-1 ${sub}`}>Speak your load — we pool farmers within 5 km heading to the same mandi in 48h and split one truck's freight by weight.</p>
      </div>

      {/* my load */}
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={`text-[10px] font-mono font-black ${sub}`}>MY LOAD (KG)</label>
            <input type="number" value={myKg} min={50} max={900} onChange={(e) => setMyKg(Number(e.target.value) || 0)}
              className={`mt-1 w-full min-h-[56px] px-3 rounded-xl border-2 text-xl font-black text-center outline-none ${isSunlightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`} />
          </div>
          <div>
            <label className={`text-[10px] font-mono font-black ${sub}`}>TO MARKET</label>
            <select value={market} onChange={(e) => setMarket(e.target.value)}
              className={`mt-1 w-full min-h-[56px] px-3 rounded-xl border-2 text-sm font-black outline-none ${isSunlightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
              {['Pune Mandi', 'Nashik Mandi', 'Mumbai Vashi', 'Local APMC'].map((m) => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        {heard && <div className={`mt-2 text-[11px] font-bold ${sub}`}>🎙 Heard: “{heard}”</div>}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button onClick={onSpeak} className={`min-h-[56px] rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98] ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-black'}`}>
            <Mic className="w-5 h-5" /> {listening ? 'Listening…' : 'Speak your load'}
          </button>
          <button onClick={() => { sound.playClick(); startSearch(); }} className="min-h-[56px] rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
            <Users className="w-5 h-5" /> Find pool partners
          </button>
        </div>
      </div>

      {/* pooling status */}
      {phase !== 'idle' && (
        <div className={`p-4 rounded-2xl border ${card}`}>
          {phase === 'searching' && <div className="flex items-center gap-2 text-amber-500 font-black text-sm"><Loader2 className="w-5 h-5 animate-spin" /> Searching 5 km radius for sub-tonnage loads (next 48h)…</div>}
          {phase !== 'searching' && (
            <>
              <div className="flex items-center justify-between font-black text-sm">
                <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-emerald-500" /> 1.5-ton pickup filling…</span>
                <span className={fillPct >= 85 ? 'text-emerald-500' : 'text-amber-500'}>{pooledKg} / {TRUCK_CAPACITY_KG} kg</span>
              </div>
              <div className={`mt-2 h-3 rounded-full overflow-hidden ${isSunlightMode ? 'bg-zinc-200' : 'bg-zinc-800'}`}>
                <motion.div animate={{ width: `${fillPct}%` }} transition={{ duration: 0.5 }} className={`h-full rounded-full ${fillPct >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </div>
              <div className="mt-3 space-y-1.5">
                <div className={`p-2.5 rounded-xl border-2 border-emerald-500 flex items-center justify-between text-sm font-black ${isSunlightMode ? 'bg-emerald-50' : 'bg-emerald-950/30'}`}>
                  <span>👨‍🌾 You</span><span>{myKg} kg</span>
                </div>
                {joined.map((f) => (
                  <motion.div key={f.name} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between text-sm font-bold ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-500" /> {f.name} <span className={`text-[10px] ${sub}`}>({f.dist})</span></span>
                    <span>{f.kg} kg</span>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* full → split + dispatch */}
      {phase === 'full' && (
        <div className={`p-4 rounded-2xl border-2 border-emerald-600 ${card}`}>
          <div className="flex items-center gap-2 text-emerald-500 font-black text-sm"><CircleCheck className="w-5 h-5" /> TRUCK FULL — milk-run confirmed to {market}</div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-center">
            <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
              <div className={`text-[9px] font-black ${sub}`}>SOLO TRUCK COST</div>
              <div className="text-2xl font-black text-red-500 line-through">{inr(SOLO_FREIGHT)}</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-600 text-white">
              <div className="text-[9px] font-black opacity-90">YOUR POOLED SHARE</div>
              <div className="text-2xl font-black">{inr(myShare)}</div>
            </div>
          </div>
          <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-center text-emerald-600 font-black text-sm">
            You save {inr(saving)} ({savingPct}%) — freight {inr(BASE_FREIGHT)} split across {pooledKg} kg
          </div>
          <a href={`sms:9876500055?body=${smsDriver}`} onClick={() => sound.playClick()}
            className="mt-3 w-full min-h-[56px] rounded-2xl bg-slate-900 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
            <MessageCircle className="w-5 h-5" /> SMS the driver — book 6 AM pickup
          </a>
        </div>
      )}
    </div>
  );
}
