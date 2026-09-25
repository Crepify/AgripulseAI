import React, { useMemo, useState } from 'react';
import { BadgeCheck, CircleCheck, MessageCircle, IndianRupee, RefreshCw } from 'lucide-react';
import { sound } from '../utils/audio';
import { useTranslation } from '../hooks/useLocalT';
import {
  RATES, GOVT_BENCHMARKS, inr, computePayout, listTrades, saveTrade, newTradeId, TRADE_STEPS,
} from '../utils/saathiEconomics';

/*
 * FARMER WHATSAPP CONVERSATIONAL PASSBOOK (web view)
 * ──────────────────────────────────────────────────
 * The farmer opens this from a WhatsApp link after a voice-note deal.
 * RULES: show NET-IN-HAND only, PM-KISAN trust badge, step tracker,
 * and the zero-deduction comparison vs the local mandi.
 */

function demoTrade() {
  const q = 5.2;
  return {
    id: newTradeId(), ts: Date.now() - 3600_000,
    farmerName: 'Ramesh Patil', idType: 'PM-KISAN', idMasked: '•••• •••• 4417',
    crop: 'Tomato', cropHi: 'टमाटर', emoji: '🍅',
    quintals: q, farmerNet: Math.round(q * RATES.FARMER_NET_PER_QUINTAL),
    grade: 'A', moisture: 11.2, status: 'loaded',
    steps: { weighed: true, escrow: true, loaded: true, paid: false },
    hub: 'Khed Panchayat Hub',
  };
}

export default function TabPassbook({ selectedLang, isSunlightMode }) {
  const ts = (useTranslation(selectedLang).saathiHub) || {};
  const card = isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white';
  const sub = isSunlightMode ? 'text-zinc-600' : 'text-zinc-400';
  const [tick, setTick] = useState(0);

  const trades = useMemo(() => {
    const t = listTrades();
    return t.length ? t : [demoTrade()];
  }, [tick]);

  const latest = trades[0];
  const totalNet = trades.reduce((s, t) => s + (t.farmerNet || 0), 0);
  const pay = computePayout(latest.quintals);
  const mandiGross = latest.quintals * (GOVT_BENCHMARKS.localMandiNet + GOVT_BENCHMARKS.mandiDeductions.reduce((s, d) => s + d.perQ, 0));

  const advanceDemo = () => {
    sound.playClick();
    if (latest.status === 'paid') return;
    saveTrade({ ...latest, status: 'paid', steps: { ...latest.steps, paid: true } });
    setTick((x) => x + 1); sound.playSuccess();
  };

  const stepDone = (key) => !!latest.steps?.[key];

  return (
    <div className="space-y-4 pb-28">
      {/* WhatsApp-style header */}
      <div className="rounded-2xl overflow-hidden border border-emerald-700/40">
        <div className="bg-[#075E54] text-white p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-2xl">👨‍🌾</div>
          <div className="min-w-0 flex-1">
            <div className="font-black text-lg leading-tight truncate">{latest.farmerName}</div>
            <div className="flex items-center gap-1 text-emerald-200 text-xs font-bold"><BadgeCheck className="w-4 h-4" /> {latest.idType} Verified • {latest.idMasked}</div>
          </div>
          <MessageCircle className="w-6 h-6 text-emerald-200 shrink-0" />
        </div>
        <div className={`p-4 ${isSunlightMode ? 'bg-white' : 'bg-[#0d1512]'}`}>
          <div className={`text-[10px] font-mono font-black tracking-widest ${sub}`}>{ts.passbookTotal || 'TOTAL NET-IN-HAND CASH'} • कुल पैसा हाथ में</div>
          <div className="font-black" style={{ fontSize: 40, lineHeight: 1.15, color: '#16A34A' }}>{inr(totalNet)}</div>
          <div className={`text-sm font-bold ${sub}`}>{trades.length} trade{trades.length > 1 ? 's' : ''} • zero deductions • paid by UPI</div>
        </div>
      </div>

      {/* Latest trade step tracker */}
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-base">{latest.emoji} {latest.crop} • {latest.quintals} q • Grade {latest.grade}</h3>
          <span className="text-[10px] font-mono font-black text-emerald-500">{latest.id}</span>
        </div>
        <div className="space-y-2.5">
          {TRADE_STEPS.map((s, i) => {
            const done = stepDone(s.key);
            const active = !done && (i === 0 || stepDone(TRADE_STEPS[i - 1].key));
            return (
              <div key={s.key} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base border-2 shrink-0 ${done ? 'bg-emerald-600 border-emerald-500 text-white' : active ? 'bg-amber-500/15 border-amber-500 text-amber-500' : isSunlightMode ? 'border-zinc-300 text-zinc-400' : 'border-zinc-700 text-zinc-600'}`}>
                  {done ? <CircleCheck className="w-5 h-5" /> : s.icon}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-black ${done ? 'text-emerald-600' : active ? 'text-amber-500' : sub}`}>{s.label} {done ? '✓' : active ? '🟡' : ''}</div>
                  <div className={`text-[11px] font-bold ${sub}`}>{s.hi}</div>
                </div>
              </div>
            );
          })}
        </div>
        {latest.status !== 'paid' && (
          <button onClick={advanceDemo} className="mt-3 w-full min-h-[48px] rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4" /> Refresh status (demo: mark UPI paid)
          </button>
        )}
      </div>

      {/* AgriPulse vs Mandi — the zero-deduction proof */}
      <div className={`p-4 rounded-2xl border-2 border-emerald-600 ${card}`}>
        <div className="text-[10px] font-mono font-black tracking-widest text-emerald-600 mb-2">{ts.whyMore || 'WHY AGRIPULSE PAYS MORE'} • मंडी से तुलना</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-emerald-600 text-white">
            <div className="text-[10px] font-bold opacity-90">AgriPulse NET</div>
            <div className="text-2xl font-black flex items-center"><IndianRupee className="w-5 h-5" />{Math.round(pay.farmerNet).toLocaleString('en-IN')}</div>
            <div className="text-[10px] font-bold mt-1 space-y-0.5 opacity-90">
              <div className="flex justify-between"><span>Commission</span><span>₹0</span></div>
              <div className="flex justify-between"><span>Weighing cut</span><span>₹0</span></div>
              <div className="flex justify-between"><span>Transport</span><span>₹0</span></div>
            </div>
          </div>
          <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
            <div className={`text-[10px] font-bold ${sub}`}>Local Mandi (est.)</div>
            <div className={`text-2xl font-black flex items-center ${isSunlightMode ? 'text-zinc-700' : 'text-zinc-300'}`}><IndianRupee className="w-5 h-5" />{Math.round(pay.mandiNet).toLocaleString('en-IN')}</div>
            <div className={`text-[10px] font-bold mt-1 space-y-0.5 ${sub}`}>
              {GOVT_BENCHMARKS.mandiDeductions.slice(0, 3).map((d) => (
                <div key={d.label} className="flex justify-between text-red-500"><span className="truncate pr-1">{d.label.split(' (')[0]}</span><span>-₹{Math.round(d.perQ * latest.quintals)}</span></div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-center text-emerald-600 font-black text-sm">
          You earn {inr(pay.extraVsMandi)} MORE on this lot 🎉
        </div>
        <div className={`mt-2 text-[10px] font-mono text-center ${sub}`}>Mandi gross {inr(mandiGross)} − middleman cuts = {inr(pay.mandiNet)} | AgriPulse: NET means NET</div>
      </div>

      {/* Trade history */}
      {trades.length > 1 && (
        <div className={`p-4 rounded-2xl border ${card}`}>
          <h3 className="font-black text-sm mb-2">📗 Past Trades</h3>
          {trades.slice(1).map((tr) => (
            <div key={tr.id} className={`flex items-center justify-between py-2 border-b last:border-0 ${isSunlightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
              <div className="text-sm font-bold">{tr.emoji} {tr.crop} • {tr.quintals} q</div>
              <div className="text-emerald-600 font-black">{inr(tr.farmerNet)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
