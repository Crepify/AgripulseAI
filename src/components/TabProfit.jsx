import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Calculator } from 'lucide-react';
import { MANDI_PRICES } from '../data/agriData';

export default function TabProfit() {
  const [acreage, setAcreage] = useState(3);

  const bioProfit = acreage * 38500;
  const chemProfit = acreage * 19000;
  const cropLoss = acreage * 22000;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Acreage Slider & Profit Comparison (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#121514] border border-[#1f2421] space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold font-mono text-white">
                Harvest Profit Calculator
              </h3>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
              {acreage} Acres Selected
            </span>
          </div>

          {/* Slider */}
          <div className="p-4 rounded-xl bg-[#181c1a] border border-[#232925] space-y-2">
            <div className="flex justify-between text-xs text-zinc-300 font-mono">
              <span>Landholding Size:</span>
              <span className="text-white font-bold">{acreage} Acres</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={acreage}
              onChange={(e) => setAcreage(Number(e.target.value))}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>1 Acre</span>
              <span>10 Acres</span>
              <span>20 Acres</span>
            </div>
          </div>

          {/* 3 Comparative Financial Tiers */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className="p-3.5 rounded-xl bg-[#18231e] border border-emerald-500/30">
              <div className="text-[10px] font-mono text-emerald-400 font-bold">Organic Bio</div>
              <div className="text-xl font-bold text-white mt-1">+₹{bioProfit.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-zinc-400 mt-1 font-mono">Cost: ₹{acreage * 350}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#231e15] border border-amber-500/30">
              <div className="text-[10px] font-mono text-amber-400 font-bold">Late Chemical</div>
              <div className="text-xl font-bold text-white mt-1">+₹{chemProfit.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-zinc-400 mt-1 font-mono">Cost: ₹{acreage * 1500}</div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#231515] border border-red-500/30">
              <div className="text-[10px] font-mono text-red-400 font-bold">Untreated Loss</div>
              <div className="text-xl font-bold text-red-400 mt-1">-₹{cropLoss.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-zinc-400 mt-1 font-mono">Yield Lost: 60%</div>
            </div>
          </div>
        </div>

        {/* Right Column: Live APMC Mandi Rates (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#121514] border border-[#1f2421] space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold font-mono text-white">Live APMC Mandi Rates</h3>
            <span className="text-[10px] font-mono text-emerald-400">● AGMARKNET Stream</span>
          </div>

          <div className="space-y-2">
            {MANDI_PRICES.map((m) => (
              <div
                key={m.crop}
                className="p-2.5 rounded-xl bg-[#181c1a] border border-[#232925] flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white">{m.crop}</div>
                  <div className="text-[10px] text-zinc-400 font-mono">{m.market}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold text-white">₹{m.price.toLocaleString('en-IN')} / Qtl</div>
                  <div className={`text-[10px] flex items-center justify-end gap-0.5 ${
                    m.trend === 'up' ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {m.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{m.change}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
