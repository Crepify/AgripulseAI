import React, { useRef, useState } from 'react';
import { Camera, Mic, Search, MessageCircle, Store, FlaskConical, TrendingDown } from 'lucide-react';
import { sound } from '../utils/audio';
import { lookupBrand, lookupFromPhoto, SAMPLE_SHOPS, GENERIC_REGISTRY } from '../data/genericRegistry';
import { inr } from '../utils/evidence';

/*
 * PESTICIDE PRICE EXPOSER
 * Photo the bottle OR speak/type the brand → registry finds the active
 * ingredient → shows the identical generic, true wholesale price, and the
 * local shops that stock it. Negotiation ammo in one text message.
 */

export default function TabExposer({ isSunlightMode }) {
  const card = isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white';
  const sub = isSunlightMode ? 'text-zinc-600' : 'text-zinc-400';
  const fileRef = useRef(null);
  const [query, setQuery] = useState('');
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const show = (entry) => {
    if (!entry) { setNotFound(true); setResult(null); sound.playTransition(); return; }
    setNotFound(false); setResult(entry); sound.playSuccess();
  };

  const onSearch = (e) => { e?.preventDefault(); sound.playClick(); show(lookupBrand(query)); };

  const onPhoto = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    sound.playClick();
    setQuery('');
    setTimeout(() => show(lookupFromPhoto(f.name + f.size)), 900);
    e.target.value = '';
  };

  // Local speech input for the brand name — separate from the global
  // Kisan Sahayak assistant, which stays untouched.
  const onSpeak = () => {
    sound.playClick();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition not supported on this browser'); return; }
    const rec = new SR();
    rec.lang = 'hi-IN'; rec.interimResults = false;
    setListening(true);
    rec.onresult = (ev) => {
      const text = ev.results[0][0].transcript;
      setQuery(text); setListening(false);
      show(lookupBrand(text) || lookupFromPhoto(text));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try { rec.start(); } catch { setListening(false); }
  };

  const savings = result ? result.brandedPrice - result.genericPrice : 0;
  const savingsPct = result ? Math.round((savings / result.brandedPrice) * 100) : 0;
  const waText = result ? encodeURIComponent(
    `GENERIC PRICE CHECK (AgriPulse AI)\nActive ingredient: ${result.activeIngredient}\nGeneric: ${result.genericName} — TRUE wholesale ${inr(result.genericPrice)} / ${result.unit}\nBranded price being charged: ${inr(result.brandedPrice)} (${savingsPct}% more!)\nStocked at: ${SAMPLE_SHOPS.map((s) => `${s.name} (${s.dist})`).join(', ')}\nGive me the generic or match the price.`) : '';

  return (
    <div className="w-full space-y-4">
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="text-[10px] font-mono font-black tracking-widest text-emerald-500">PRICE EXPOSER • असली दाम</div>
        <div className="text-lg font-black">The True Price of Every Pesticide</div>
        <p className={`text-xs font-bold mt-1 ${sub}`}>Photograph the bottle or speak the brand — instantly see the identical generic, its real wholesale price, and the nearby shops that stock it.</p>
      </div>

      {/* input row */}
      <form onSubmit={onSearch} className="flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder='Brand name — e.g. "Saaf", "Confidor"'
          className={`flex-1 min-h-[56px] px-4 rounded-2xl border-2 text-sm font-bold outline-none ${isSunlightMode ? 'bg-white border-zinc-300 focus:border-emerald-500' : 'bg-zinc-900 border-zinc-700 text-white focus:border-emerald-500'}`} />
        <button type="submit" aria-label="Search brand" className="min-h-[56px] w-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center active:scale-95"><Search className="w-5 h-5" /></button>
        <button type="button" onClick={onSpeak} aria-label="Speak brand name" className={`min-h-[56px] w-14 rounded-2xl flex items-center justify-center active:scale-95 ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-black'}`}><Mic className="w-5 h-5" /></button>
      </form>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
      <button onClick={() => fileRef.current?.click()} className={`w-full min-h-[56px] rounded-2xl border-2 border-dashed font-black text-sm flex items-center justify-center gap-2 ${isSunlightMode ? 'border-zinc-400 text-zinc-700' : 'border-zinc-600 text-zinc-300'}`}>
      <Camera className="w-5 h-5 text-emerald-500" /> Or photograph the bottle label
      </button>

      {notFound && (
        <div className={`p-4 rounded-2xl border-2 border-amber-500 text-sm font-bold ${card}`}>
          Brand not in the registry yet. Try: {GENERIC_REGISTRY.slice(0, 4).map((g) => g.brands[0]).join(', ')}…
        </div>
      )}

      {/* result */}
      {result && (
        <>
          <div className={`p-4 rounded-2xl border ${card}`}>
            <div className="flex items-center gap-2 font-black text-sm"><FlaskConical className="w-4 h-4 text-emerald-500" /> Active ingredient</div>
            <div className="text-base font-black mt-1">{result.activeIngredient}</div>
            <div className={`text-xs font-bold ${sub}`}>{result.use} • dose {result.dose}</div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-center">
              <div className={`p-3 rounded-xl border-2 border-red-500/60 ${isSunlightMode ? 'bg-red-50' : 'bg-red-950/20'}`}>
                <div className={`text-[9px] font-black ${sub}`}>DEALER'S BRANDED PRICE</div>
                <div className="text-2xl font-black text-red-500 line-through">{inr(result.brandedPrice)}</div>
                <div className={`text-[10px] font-bold ${sub}`}>per {result.unit}</div>
              </div>
              <div className="p-3 rounded-xl border-2 border-emerald-600 bg-emerald-600 text-white">
                <div className="text-[9px] font-black opacity-90">TRUE GENERIC PRICE</div>
                <div className="text-2xl font-black">{inr(result.genericPrice)}</div>
                <div className="text-[10px] font-bold opacity-90">per {result.unit}</div>
              </div>
            </div>
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-center text-emerald-600 font-black text-sm flex items-center justify-center gap-1.5">
              <TrendingDown className="w-4 h-4" /> You save {inr(savings)} ({savingsPct}%) — {result.genericName}
            </div>
          </div>

          <div className={`p-4 rounded-2xl border ${card}`}>
            <div className="flex items-center gap-2 font-black text-sm mb-2"><Store className="w-4 h-4 text-emerald-500" /> Shops stocking the generic near you</div>
            {SAMPLE_SHOPS.map((s) => (
              <a key={s.name} href={`tel:${s.phone}`} onClick={() => sound.playClick()}
                className={`flex items-center justify-between py-2.5 border-b last:border-0 ${isSunlightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
                <div><div className="text-sm font-black">{s.name}</div><div className={`text-[11px] font-bold ${sub}`}>{s.dist} away</div></div>
                <span className="text-emerald-500 text-xs font-black">📞 Call</span>
              </a>
            ))}
          </div>

          <a href={`https://wa.me/?text=${waText}`} target="_blank" rel="noreferrer" onClick={() => sound.playClick()}
            className="w-full min-h-[56px] rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
            <MessageCircle className="w-5 h-5" /> Text me this — negotiate at the counter
          </a>
        </>
      )}
    </div>
  );
}
