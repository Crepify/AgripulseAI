import React, { useState } from 'react';
import { MapPin, Phone, ShieldCheck, Check } from 'lucide-react';
import { DEALERS } from '../data/agriData';
import { sound } from '../utils/audio';

export default function TabStores() {
  const [callingDealer, setCallingDealer] = useState(null);

  const handleCall = (dealer) => {
    sound.playClick();
    setCallingDealer(dealer);
    setTimeout(() => setCallingDealer(null), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DEALERS.map((d) => (
          <div
            key={d.id}
            className="p-5 rounded-2xl bg-[#121514] border border-[#1f2421] flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">{d.name}</h4>
                  <div className="text-[11px] text-zinc-400 mt-0.5">{d.address}</div>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-bold">
                  {d.distance}
                </span>
              </div>

              <div className="mt-3 p-2.5 rounded-xl bg-[#181c1a] border border-[#232925] text-xs font-mono text-zinc-300">
                📦 {d.stock}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Price Controlled
              </span>

              <button
                onClick={() => handleCall(d)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs font-mono transition-transform active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Store</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {callingDealer && (
        <div className="p-3 rounded-xl bg-emerald-500 text-black text-xs font-mono font-bold flex items-center justify-between shadow-lg">
          <span>Connecting call to {callingDealer.name} ({callingDealer.phone})...</span>
          <span>Ringing...</span>
        </div>
      )}
    </div>
  );
}
