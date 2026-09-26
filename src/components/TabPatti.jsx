import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ScanLine, FileText, AlertTriangle, BellRing, Loader2, MessageCircle, CircleCheck, Camera } from 'lucide-react';
import { sound } from '../utils/audio';
import { auditPatti, getMandiRules, STATE_MANDI_RULES } from '../data/mandiRules';
import { stampEvidence, inr, saveToList } from '../utils/evidence';
import { sendWhatsApp } from './WhatsAppScreen';

/*
 * AUTOMATED PATTI AUDITOR
 * Photo of the handwritten payment slip → OCR → every fee checked against
 * the legal APMC fee registry for the selected state → exact ₹ stolen +
 * legal payout due date with an automated reminder.
 */

const STATES = Object.keys(STATE_MANDI_RULES);

/** Demo OCR: deterministic parse seeded by file size — always finds a slip
 *  with a couple of illegal charges so the audit logic can be demonstrated. */
function mockOcr(file) {
  const seed = (file?.size || 7) % 5;
  const weightKg = 480 + seed * 35;
  const pricePerKg = [14, 16, 12, 18, 15][seed];
  const bags = 10 + seed;
  const gross = weightKg * pricePerKg;
  return {
    trader: ['Sharma Traders', 'Balaji Commission Co.', 'Gupta & Sons'][seed % 3],
    weightKg, pricePerKg, bags, dateTs: Date.now() - 86400000,
    fees: {
      commission: Math.round(gross * 0.06),   // charged 6% — limit ~2-3%
      unloading: Math.round(gross * 0.05),    // charged 5% — limit 2%
      weighing: bags * 10,                    // ₹10/bag — limit ₹2-3
      marketFee: Math.round(gross * 0.01),
      other: [120, 0, 250, 80, 150][seed],    // "misc" — never legal
    },
  };
}

export default function TabPatti({ isSunlightMode }) {
  const card = isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white';
  const sub = isSunlightMode ? 'text-zinc-600' : 'text-zinc-400';
  const fileRef = useRef(null);
  const [state, setState] = useState('Maharashtra');
  const [photo, setPhoto] = useState(null);
  const [stamp, setStamp] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [audit, setAudit] = useState(null);
  const [reminderSet, setReminderSet] = useState(false);

  const onPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    sound.playClick();
    setPhoto(URL.createObjectURL(f));
    setParsed(null); setAudit(null); setReminderSet(false);
    setScanning(true);
    const st = await stampEvidence(f);
    setStamp(st);
    setTimeout(() => {
      const p = mockOcr(f);
      const a = auditPatti(p, state);
      setParsed(p); setAudit(a); setScanning(false);
      if (a.totalStolen > 1) sound.playTransition(); else sound.playSuccess();
      saveToList('ap_patti_audits', { ts: Date.now(), trader: p.trader, stolen: Math.round(a.totalStolen), state });
    }, 1600);
    e.target.value = '';
  };

  const setReminder = async () => {
    sound.playClick();
    try {
      if ('Notification' in window && Notification.permission !== 'granted') await Notification.requestPermission();
    } catch {}
    setReminderSet(true); sound.playSuccess();
  };

  const whatsappText = audit && parsed ? (
    `PATTI AUDIT (AgriPulse AI)\nTrader: ${parsed.trader}\nGross: ${inr(audit.gross)} (${parsed.weightKg}kg × ₹${parsed.pricePerKg}/kg)\nILLEGAL OVERCHARGE: ${inr(audit.totalStolen)}\n` +
    audit.items.filter((i) => i.verdict === 'ILLEGAL').map((i) => `• ${i.label}: charged ${inr(i.charged)}, legal max ${inr(i.legalMax)} → stolen ${inr(i.stolen)}`).join('\n') +
    `\nLegal cash due: ${audit.dueDateText} (${audit.rules.paymentDueDays} days, ${audit.rules.state} APMC)\nPay the legal balance or this goes to the Mandi Secretary.`) : '';

  return (
    <div className="w-full space-y-4">
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="text-[10px] font-mono font-black tracking-widest text-emerald-500">PATTI AUDITOR • पर्ची जांच</div>
        <div className="text-lg font-black">Every Deduction, Verified Against the Law</div>
        <p className={`text-xs font-bold mt-1 ${sub}`}>Photograph your payment slip and every fee is read, checked against your state's legal APMC limits, and the exact overcharge is revealed in rupees.</p>
        <div className="mt-3">
          <label className={`text-[10px] font-mono font-black ${sub}`}>YOUR MANDI STATE</label>
          <select value={state} onChange={(e) => { setState(e.target.value); setAudit(null); setParsed(null); }}
            className={`mt-1 w-full min-h-[52px] px-3 rounded-xl border-2 text-sm font-black outline-none ${isSunlightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
            {STATES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className={`text-[10px] font-mono mt-1 ${sub}`}>
            Legal limits: commission {getMandiRules(state).commissionPct}% • unloading {getMandiRules(state).unloadingPct}% • weighing ₹{getMandiRules(state).weighingFlatPerBag}/bag • cash due {getMandiRules(state).paymentDueDays} day(s)
          </div>
        </div>
      </div>

      {/* capture */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
      {!photo ? (
        <button onClick={() => fileRef.current?.click()} className="w-full min-h-[64px] rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-center gap-2 active:scale-[0.98]">
          <Camera className="w-6 h-6" /> Photograph the Patti • पर्ची की फोटो लें
        </button>
      ) : (
        <div className={`p-3 rounded-2xl border ${card}`}>
          <div className="relative rounded-xl overflow-hidden">
            <img src={photo} alt="Payment slip (patti)" className="w-full max-h-56 object-cover" />
            {scanning && <motion.div initial={{ top: 0 }} animate={{ top: '100%' }} transition={{ repeat: Infinity, duration: 1.1, ease: 'linear' }} className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399]" />}
          </div>
          {stamp && <div className={`mt-2 text-[9px] font-mono ${sub}`}>🔒 {stamp.time}{stamp.loc ? ` • ${stamp.loc.lat}, ${stamp.loc.lng}` : ''} • SHA {stamp.hashShort}</div>}
          {scanning && <div className="mt-2 flex items-center gap-2 text-amber-500 text-xs font-black"><ScanLine className="w-4 h-4 animate-pulse" /> OCR reading amounts, weights and every deduction…</div>}
          <button onClick={() => fileRef.current?.click()} className={`mt-2 w-full min-h-[44px] rounded-xl border-2 text-xs font-black ${isSunlightMode ? 'border-zinc-300 text-zinc-700' : 'border-zinc-700 text-zinc-300'}`}>Retake photo</button>
        </div>
      )}

      {/* parsed + audit */}
      {parsed && audit && (
        <>
          <div className={`p-4 rounded-2xl border ${card}`}>
            <div className="flex items-center gap-2 font-black text-sm"><FileText className="w-4 h-4 text-emerald-500" /> OCR Extracted — {parsed.trader}</div>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center">
              <div className={`p-2 rounded-xl border ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}><div className="text-lg font-black">{parsed.weightKg} kg</div><div className={`text-[9px] font-bold ${sub}`}>WEIGHT</div></div>
              <div className={`p-2 rounded-xl border ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}><div className="text-lg font-black">₹{parsed.pricePerKg}/kg</div><div className={`text-[9px] font-bold ${sub}`}>RATE</div></div>
              <div className={`p-2 rounded-xl border ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}><div className="text-lg font-black">{inr(audit.gross)}</div><div className={`text-[9px] font-bold ${sub}`}>GROSS</div></div>
            </div>
            <div className="mt-3 space-y-1.5">
              {audit.items.map((f) => (
                <div key={f.key} className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${f.verdict === 'ILLEGAL' ? 'border-red-500/60 bg-red-500/5' : isSunlightMode ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800 bg-zinc-900'}`}>
                  <div className="min-w-0">
                    <div className="text-xs font-black truncate">{f.label}</div>
                    <div className={`text-[10px] font-mono ${sub}`}>charged {inr(f.charged)} • legal {f.limitText} = {inr(f.legalMax)}</div>
                  </div>
                  {f.verdict === 'ILLEGAL'
                    ? <span className="shrink-0 text-red-500 text-xs font-black flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> −{inr(f.stolen)}</span>
                    : <span className="shrink-0 text-emerald-500 text-xs font-black flex items-center gap-1"><CircleCheck className="w-4 h-4" /> OK</span>}
                </div>
              ))}
            </div>
          </div>

          {/* verdict */}
          <div className={`p-4 rounded-2xl border-2 ${audit.totalStolen > 1 ? 'border-red-600' : 'border-emerald-600'} ${card}`}>
            <div className={`text-[10px] font-mono font-black tracking-widest ${audit.totalStolen > 1 ? 'text-red-500' : 'text-emerald-500'}`}>{audit.totalStolen > 1 ? 'MONEY STOLEN FROM YOU • आपसे चुराया गया' : 'PATTI IS CLEAN'}</div>
            <div className={`font-black ${audit.totalStolen > 1 ? 'text-red-500' : 'text-emerald-500'}`} style={{ fontSize: 40, lineHeight: 1.15 }}>{inr(audit.totalStolen)}</div>
            <div className={`text-xs font-bold ${sub}`}>You were paid {inr(audit.paidNet)} — the legal net is {inr(audit.legalNet)}. Demand the difference.</div>
            <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between gap-2 ${isSunlightMode ? 'bg-amber-50 border-amber-300' : 'bg-amber-950/30 border-amber-700/50'}`}>
              <div>
                <div className="text-xs font-black text-amber-600">Legal cash due date: {audit.dueDateText}</div>
                <div className={`text-[10px] font-bold ${sub}`}>{audit.rules.state} APMC — payment within {audit.rules.paymentDueDays} day(s) of sale</div>
              </div>
              <button onClick={setReminder} disabled={reminderSet}
                className={`shrink-0 min-h-[48px] px-3 rounded-xl font-black text-xs flex items-center gap-1.5 ${reminderSet ? 'bg-emerald-500/15 text-emerald-600 border-2 border-emerald-500/50' : 'bg-amber-500 text-black'}`}>
                <BellRing className="w-4 h-4" /> {reminderSet ? 'Reminder set ✓' : 'Remind me'}
              </button>
            </div>
            <button onClick={() => { sound.playClick(); sendWhatsApp({
                name: parsed?.trader || 'Trader (Arhtiya)', avatar: '🧑‍💼', phone: '9876500071', message: whatsappText,
                replies: [
                  { text: 'Bhai hisaab dobara check karta hun… 🙏', delay: 1800 },
                  { text: `Theek hai, ${inr(audit.totalStolen)} ka difference kal aapke account mein bhej dunga. Mandi Secretary ko mat bhejo.`, delay: 2400 },
                ] }); }}
              className="mt-3 w-full min-h-[56px] rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
              <MessageCircle className="w-5 h-5" /> Send audit to trader on WhatsApp
            </button>
          </div>
        </>
      )}

      {scanning && !parsed && <div className="flex items-center justify-center gap-2 text-emerald-500 font-black text-sm"><Loader2 className="w-5 h-5 animate-spin" /> Auditing against {state} legal fee table…</div>}
    </div>
  );
}
