import React, { useState } from 'react';
import { Users, UserPlus, ShoppingBag, Check } from 'lucide-react';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';

export default function TabGroup() {
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
      <div className="p-6 rounded-2xl bg-[#121514] border border-[#1f2421] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-emerald-400">Village Cluster #MND-04</div>
            <h3 className="text-lg font-bold text-white mt-0.5">Mandya Smallholders Group Buying Pool</h3>
          </div>

          <div className="text-right">
            <div className="text-2xl font-black text-emerald-400 font-mono">{discount}% OFF</div>
            <div className="text-[10px] font-mono text-zinc-400">Manufacturer Wholesale Discount</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-zinc-300">
            <span>Pool Target:</span>
            <span className="text-emerald-400 font-bold">{farmers} / 20 Farmers Joined</span>
          </div>
          <div className="w-full h-2.5 bg-[#181c1a] rounded-full overflow-hidden p-0.5 border border-[#232925]">
            <div
              style={{ width: `${(farmers / 20) * 100}%` }}
              className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 rounded-full transition-all duration-500"
            />
          </div>
        </div>

        {/* Pooled Line Items */}
        <div className="p-4 rounded-xl bg-[#181c1a] border border-[#232925] space-y-2 text-xs font-mono">
          <div className="font-bold text-white flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Group Order Items:
          </div>
          <div className="flex justify-between text-zinc-300">
            <span>• Trichoderma Bio-Fungicide (45 kg)</span>
            <span className="text-emerald-400 font-bold">25% Saved</span>
          </div>
          <div className="flex justify-between text-zinc-300">
            <span>• Cold-Pressed Neem Oil (60 Liters)</span>
            <span className="text-emerald-400 font-bold">Shared Delivery Assigned</span>
          </div>
        </div>

        <button
          onClick={handleJoin}
          disabled={joined}
          className={`w-full py-3 rounded-xl font-bold font-mono text-xs transition-all ${
            joined
              ? 'bg-[#181c1a] text-emerald-400 border border-emerald-500/30'
              : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-sm'
          }`}
        >
          {joined ? 'You are Joined in this 20-Farmer Group ✓' : 'Join Group (+1 Farm)'}
        </button>
      </div>
    </div>
  );
}
