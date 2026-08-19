import React, { useState } from 'react';
import { Users, UserPlus, ShoppingBag, Check } from 'lucide-react';
import { sound } from '../utils/audio';
import { T } from '../data/translations';
import confetti from 'canvas-confetti';

export default function TabGroup({ selectedLang, isSunlightMode }) {
  const t = T[selectedLang] || T['en'];
  const [farmers, setFarmers] = useState(18);
  const [joined, setJoined] = useState(false);

  const handleJoin = () => {
    sound.playSuccess();
    if (!joined) {
      setFarmers(f => f + 1);
      setJoined(true);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10B981', '#F59E0B', '#FFFFFF'],
        });
      } catch (e) {}
    }
  };

  const discount = farmers >= 20 ? 25 : 20;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      <div className={`p-6 rounded-2xl border space-y-5 shadow-xl ${
        isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-emerald-500">{t.group.clusterTitle}</div>
            <h3 className="text-lg font-bold mt-0.5">{t.group.groupName}</h3>
          </div>

          <div className="text-right">
            <div className="text-3xl font-black text-emerald-500 font-mono">{discount}% OFF</div>
            <div className="text-[10px] font-mono text-zinc-500">{t.group.discountLabel}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className={isSunlightMode ? 'text-zinc-600' : 'text-zinc-400'}>{t.group.poolTarget}</span>
            <span className="text-emerald-500 font-bold">{farmers} / 20 {t.group.farmersJoined}</span>
          </div>
          <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 border ${
            isSunlightMode ? 'bg-zinc-200 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'
          }`}>
            <div
              style={{ width: `${(farmers / 20) * 100}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
            />
          </div>
        </div>

        {/* Pooled Line Items */}
        <div className={`p-4 rounded-xl border space-y-2 text-xs font-mono ${
          isSunlightMode ? 'bg-zinc-100 border-zinc-300 text-zinc-800' : 'bg-[#181c1a] border-[#232925] text-zinc-300'
        }`}>
          <div className="font-bold flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
            {t.group.orderItemsTitle}
          </div>
          <div className="flex justify-between">
            <span>• Trichoderma Bio-Fungicide (45 kg)</span>
            <span className="text-emerald-500 font-bold">25% Saved</span>
          </div>
          <div className="flex justify-between">
            <span>• Cold-Pressed Neem Oil (60 Liters)</span>
            <span className="text-emerald-500 font-bold">Shared Delivery Assigned</span>
          </div>
        </div>

        <button
          onClick={handleJoin}
          disabled={joined}
          className={`w-full py-3 rounded-xl font-bold font-mono text-xs transition-all shadow-md ${
            joined
              ? 'bg-[#181c1a] text-emerald-400 border border-emerald-500/40'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black'
          }`}
        >
          {joined ? t.group.joinedBtn : t.group.joinBtn}
        </button>
      </div>
    </div>
  );
}
