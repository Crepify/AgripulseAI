import React, { useEffect, useRef, useState } from 'react';
import { Calculator, RefreshCw, Radio, Database, Truck, Users2, Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { getMandiPrices, ALL_INDIAN_STATES } from '../utils/dataService';
import { getMandiRules, ROI_COSTS, YIELD_PER_ACRE_Q } from '../data/mandiRules';
import { getSession } from '../utils/authService';
import { sound } from '../utils/audio';
import { inr } from '../utils/evidence';

/*
 * MANDI ROI SIMULATOR
 * "Is the trip even worth it?" — acres + crop → live mandi price →
 * gross revenue − LCV transport − labor − APMC fees = NET profit,
 * before the farmer spends a rupee on diesel.
 */

const CROPS = Object.keys(YIELD_PER_ACRE_Q);

export default function TabROI({ isSunlightMode }) {
  const card = isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white';
  const sub = isSunlightMode ? 'text-zinc-600' : 'text-zinc-400';
  const [acres, setAcres] = useState(3);
  const [crop, setCrop] = useState('Tomato');
  const [stateSel, setStateSel] = useState(() => { try { return getSession()?.state || 'Karnataka'; } catch { return 'Karnataka'; } });
  const [distanceKm, setDistanceKm] = useState(ROI_COSTS.defaultDistanceKm);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  useEffect(() => {
    const mySeq = ++seq.current;
    setLoading(true);
    getMandiPrices({ state: stateSel, commodity: crop })
      .then((res) => { if (seq.current === mySeq) setBoard(res); })
      .catch(() => { if (seq.current === mySeq) setBoard(null); })
      .finally(() => { if (seq.current === mySeq) setLoading(false); });
  }, [stateSel, crop]);

  const bestRow = board?.rows?.length ? board.rows[0] : null;
  const pricePerQ = bestRow?.modal || 0;
  const rules = getMandiRules(stateSel);

  const yieldQ = (YIELD_PER_ACRE_Q[crop] || 20) * acres;
  const gross = yieldQ * pricePerQ;
  const trips = Math.max(1, Math.ceil((yieldQ * 100) / 1500)); // 1.5t LCV loads
  const transport = trips * distanceKm * 2 * ROI_COSTS.lcvPerKm;
  const labor = yieldQ * ROI_COSTS.laborPerQuintal;
  const apmcFees = (gross * (rules.marketFeePct + rules.commissionPct)) / 100;
  const net = Math.round(gross - transport - labor - apmcFees);
  const profitable = net > 0;

  return (
    <div className="w-full space-y-4">
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="text-[10px] font-mono font-black tracking-widest text-emerald-500">ROI SIMULATOR • मुनाफ़ा कैलकुलेटर</div>
        <div className="text-lg font-black">Your Net Profit, Calculated Before Departure</div>
        <p className={`text-xs font-bold mt-1 ${sub}`}>Live mandi prices minus transport, labor and APMC fees — the real number that reaches your pocket.</p>
      </div>

      {/* inputs */}
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="flex items-center justify-between">
          <label className={`text-[10px] font-mono font-black ${sub}`}>MY LAND</label>
          <span className="text-emerald-500 font-black text-lg">{acres} acre{acres > 1 ? 's' : ''}</span>
        </div>
        <input type="range" min={1} max={20} step={1} value={acres}
          onChange={(e) => { setAcres(Number(e.target.value)); }}
          onPointerUp={() => sound.playClick()}
          className="w-full mt-2 accent-emerald-500" style={{ height: 32 }} />
        <div className={`flex justify-between text-[9px] font-black ${sub}`}><span>1</span><span>10</span><span>20 acres</span></div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <label className={`text-[10px] font-mono font-black ${sub}`}>CROP</label>
            <select value={crop} onChange={(e) => { sound.playClick(); setCrop(e.target.value); }}
              className={`mt-1 w-full min-h-[52px] px-3 rounded-xl border-2 text-sm font-black outline-none ${isSunlightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
              {CROPS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={`text-[10px] font-mono font-black ${sub}`}>STATE / MANDI</label>
            <select value={stateSel} onChange={(e) => { sound.playClick(); setStateSel(e.target.value); }}
              className={`mt-1 w-full min-h-[52px] px-3 rounded-xl border-2 text-sm font-black outline-none ${isSunlightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
              {ALL_INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <label className={`text-[10px] font-mono font-black ${sub}`}>DISTANCE TO MANDI</label>
            <span className="font-black text-sm">{distanceKm} km</span>
          </div>
          <input type="range" min={5} max={120} step={1} value={distanceKm} onChange={(e) => setDistanceKm(Number(e.target.value))}
            className="w-full accent-amber-500" style={{ height: 28 }} />
        </div>
      </div>

      {/* live price */}
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="flex items-center justify-between">
          <span className="font-black text-sm flex items-center gap-1.5"><Calculator className="w-4 h-4 text-emerald-500" /> {crop} @ {bestRow ? bestRow.market : stateSel}</span>
          {loading ? <RefreshCw className={`w-4 h-4 animate-spin ${sub}`} />
            : board?.live ? <span className="text-[9px] font-black text-emerald-500 flex items-center gap-1"><Radio className="w-3 h-3" /> LIVE AGMARKNET</span>
            : <span className={`text-[9px] font-black flex items-center gap-1 ${sub}`}><Database className="w-3 h-3" /> REFERENCE BOARD</span>}
        </div>
        <div className="mt-1 text-3xl font-black">{pricePerQ ? inr(pricePerQ) : '—'} <span className={`text-sm ${sub}`}>/ quintal</span></div>
        <div className={`text-xs font-bold ${sub}`}>Expected yield: {yieldQ} q from {acres} acre{acres > 1 ? 's' : ''} • {trips} LCV trip{trips > 1 ? 's' : ''}</div>
      </div>

      {/* breakdown */}
      <div className={`rounded-2xl border overflow-hidden ${card}`}>
        <div className="p-4 space-y-2.5">
          <Row label="Gross revenue" value={`+ ${inr(Math.round(gross))}`} good icon={<TrendingUp className="w-4 h-4 text-emerald-500" />} isSunlightMode={isSunlightMode} />
          <Row label={`LCV transport (${trips}× ${distanceKm} km × 2 @ ₹${ROI_COSTS.lcvPerKm}/km)`} value={`− ${inr(transport)}`} icon={<Truck className="w-4 h-4 text-amber-500" />} isSunlightMode={isSunlightMode} />
          <Row label={`Harvest + loading labor (₹${ROI_COSTS.laborPerQuintal}/q)`} value={`− ${inr(Math.round(labor))}`} icon={<Users2 className="w-4 h-4 text-amber-500" />} isSunlightMode={isSunlightMode} />
          <Row label={`APMC fees ${rules.marketFeePct}% + commission ${rules.commissionPct}% (${rules.state})`} value={`− ${inr(Math.round(apmcFees))}`} icon={<Landmark className="w-4 h-4 text-amber-500" />} isSunlightMode={isSunlightMode} />
        </div>
        <div className={`p-4 text-center ${profitable ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
          <div className="text-[10px] font-black tracking-widest opacity-90">NET IN YOUR POCKET • शुद्ध मुनाफ़ा</div>
          <div className="text-4xl font-black mt-1">{inr(net)}</div>
          <div className="text-xs font-black mt-1 flex items-center justify-center gap-1.5">
            {profitable ? <><TrendingUp className="w-4 h-4" /> Worth the trip — {inr(Math.round(net / acres))} per acre</>
              : <><TrendingDown className="w-4 h-4" /> LOSS — hold, pool a truck, or try another mandi</>}
          </div>
        </div>
      </div>

      <p className={`text-[10px] font-bold text-center px-4 ${sub}`}>
        Yield table is indicative. Fees use {rules.state} legal APMC limits — cross-check any patti in the Patti Auditor tab.
      </p>
    </div>
  );
}

function Row({ label, value, good, icon, isSunlightMode }) {
  return (
    <div className={`flex items-center justify-between gap-2 pb-2.5 border-b last:border-0 last:pb-0 ${isSunlightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
      <span className={`flex items-center gap-2 text-xs font-bold ${isSunlightMode ? 'text-zinc-700' : 'text-zinc-300'}`}>{icon} {label}</span>
      <span className={`text-sm font-black shrink-0 ${good ? 'text-emerald-500' : 'text-red-500'}`}>{value}</span>
    </div>
  );
}
