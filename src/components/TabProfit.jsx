import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Calculator, IndianRupee } from 'lucide-react';
import { MANDI_PRICES } from '../data/agriData';
import { T } from '../data/translations';

export default function TabProfit({ selectedLang, isSunlightMode }) {
  const t = T[selectedLang] || T['en'];
  const [acreage, setAcreage] = useState(3);

  const bioProfit = acreage * 38500;
  const chemProfit = acreage * 19000;
  const cropLoss = acreage * 22000;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Acreage Slider & Profit Comparison (7 cols) */}
        <div className={`lg:col-span-7 p-6 rounded-2xl border space-y-5 shadow-xl ${
          isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold font-mono">
                {t.profit.calcTitle}
              </h3>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
              {acreage} {t.profit.selectedAcres}
            </span>
          </div>

          {/* Slider */}
          <div className={`p-4 rounded-xl border space-y-2 ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}>
            <div className="flex justify-between text-xs font-mono">
              <span className={isSunlightMode ? 'text-zinc-600' : 'text-zinc-400'}>{t.profit.landSize}</span>
              <span className="font-bold text-emerald-500">{acreage} Acres</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={acreage}
              onChange={(e) => setAcreage(Number(e.target.value))}
              className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>1 Acre</span>
              <span>10 Acres</span>
              <span>20 Acres</span>
            </div>
          </div>

          {/* 3 Comparative Financial Tiers */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className={`p-3.5 rounded-xl border ${isSunlightMode ? 'bg-emerald-50 border-emerald-300' : 'bg-[#18231e] border-emerald-500/30'}`}>
              <div className="text-[10px] font-mono text-emerald-500 font-bold">{t.profit.organicTitle}</div>
              <div className="text-xl font-bold text-emerald-600 mt-1">+₹{bioProfit.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-zinc-500 mt-1 font-mono">{t.profit.costLabel} ₹{acreage * 350}</div>
            </div>

            <div className={`p-3.5 rounded-xl border ${isSunlightMode ? 'bg-amber-50 border-amber-300' : 'bg-[#231e15] border-amber-500/30'}`}>
              <div className="text-[10px] font-mono text-amber-500 font-bold">{t.profit.chemicalTitle}</div>
              <div className="text-xl font-bold text-amber-600 mt-1">+₹{chemProfit.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-zinc-500 mt-1 font-mono">{t.profit.costLabel} ₹{acreage * 1500}</div>
            </div>

            <div className={`p-3.5 rounded-xl border ${isSunlightMode ? 'bg-red-50 border-red-300' : 'bg-[#231515] border-red-500/30'}`}>
              <div className="text-[10px] font-mono text-red-500 font-bold">{t.profit.untreatedTitle}</div>
              <div className="text-xl font-bold text-red-500 mt-1">-₹{cropLoss.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-zinc-500 mt-1 font-mono">{t.profit.yieldLoss} 60%</div>
            </div>
          </div>
        </div>

        {/* Right Column: Live APMC Mandi Rates (5 cols) */}
        <div className={`lg:col-span-5 p-6 rounded-2xl border space-y-4 shadow-xl ${
          isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white'
        }`}>
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold font-mono">{t.profit.mandiTitle}</h3>
            <span className="text-[10px] font-mono text-emerald-500">{t.profit.mandiLive}</span>
          </div>

          <div className="space-y-2">
            {MANDI_PRICES.map((m) => (
              <div
                key={m.crop}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'
                }`}
              >
                <div>
                  <div className="font-bold">{m.crop}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">{m.market}</div>
                </div>
                <div className="text-right font-mono">
                  <div className="font-bold">₹{m.price.toLocaleString('en-IN')} / Qtl</div>
                  <div className={`text-[10px] flex items-center justify-end gap-0.5 ${
                    m.trend === 'up' ? 'text-emerald-500' : 'text-red-500'
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
