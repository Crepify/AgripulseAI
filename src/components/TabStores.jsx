import React, { useState } from 'react';
import { MapPin, Phone, ShieldCheck, PhoneCall, HeartPulse } from 'lucide-react';
import { DEALERS } from '../data/agriData';
import { sound } from '../utils/audio';
import { T } from '../data/translations';

export default function TabStores({ selectedLang, isSunlightMode }) {
  const t = T[selectedLang] || T['en'];
  const [callingDealer, setCallingDealer] = useState(null);

  const handleCall = (dealer) => {
    sound.playClick();
    setCallingDealer(dealer);
    setTimeout(() => setCallingDealer(null), 3000);
  };

  const handleHelpline = () => {
    sound.playClick();
    window.open('tel:18001801551', '_self');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      {/* 24x7 Kisan Call Center Emergency Helpline Banner */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold text-lg">
            📞
          </div>
          <div>
            <div className="font-bold text-emerald-400 text-sm">{t.stores.helplineTitle}</div>
            <div className="text-zinc-400 text-[11px]">Free Government Agronomist Consultation (All Indian Dialects)</div>
          </div>
        </div>

        <button
          onClick={handleHelpline}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold font-mono text-xs shadow-md"
        >
          <PhoneCall className="w-4 h-4" />
          <span>{t.stores.callHelpline}</span>
        </button>
      </div>

      {/* Certified Local Dealer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DEALERS.map((d) => (
          <div
            key={d.id}
            className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 shadow-xl ${
              isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white'
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold">{d.name}</h4>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{d.address}</div>
                </div>
                <span className="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                  {d.distance}
                </span>
              </div>

              <div className={`mt-3 p-2.5 rounded-xl border text-xs font-mono ${
                isSunlightMode ? 'bg-zinc-100 border-zinc-300 text-zinc-800' : 'bg-[#181c1a] border-[#232925] text-zinc-300'
              }`}>
                📦 {d.stock}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <span className="text-[11px] font-mono text-emerald-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> {t.stores.priceControlled}
              </span>

              <button
                onClick={() => handleCall(d)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs font-mono transition-transform active:scale-95 shadow-sm"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{t.stores.callStore}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {callingDealer && (
        <div className="p-3.5 rounded-xl bg-emerald-500 text-black text-xs font-mono font-bold flex items-center justify-between shadow-xl">
          <span>{t.stores.connecting} {callingDealer.name} ({callingDealer.phone})...</span>
          <span>Ringing...</span>
        </div>
      )}
    </div>
  );
}
