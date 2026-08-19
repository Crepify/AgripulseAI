import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Wind, Droplets, Sun, ShieldCheck, Bell, CloudRain } from 'lucide-react';
import { sound } from '../utils/audio';
import { T } from '../data/translations';

export default function TabRadar({ selectedLang, isSunlightMode }) {
  const t = T[selectedLang] || T['en'];
  const [alertSent, setAlertSent] = useState(false);

  const handleAlert = () => {
    sound.playSuccess();
    setAlertSent(true);
    setTimeout(() => setAlertSent(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      {/* Real-time Rain Advisory Alert */}
      <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center gap-3 text-amber-300 text-xs font-bold shadow-md">
        <CloudRain className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
        <span>{t.radar.irrigationAlert}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Radar View (6 cols) */}
        <div className={`lg:col-span-6 p-6 rounded-2xl border flex flex-col items-center justify-center min-h-[360px] relative overflow-hidden ${
          isSunlightMode ? 'bg-white border-zinc-300' : 'bg-[#121514] border-[#1f2421]'
        }`}>
          {/* Radar circle & sweep */}
          <div className="relative w-64 h-64 rounded-full border border-emerald-500/30 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border border-emerald-500/40 flex items-center justify-center" />
            <div className="w-32 h-32 rounded-full border border-emerald-500/50 flex items-center justify-center" />
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/20 via-transparent to-transparent pointer-events-none"
            />

            {/* Threat Node */}
            <div className="absolute top-10 right-14 flex flex-col items-center">
              <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
              <span className="text-[10px] font-mono text-red-300 bg-black/85 px-1.5 py-0.5 rounded mt-1 border border-red-500/30">Blast Spores (3km)</span>
            </div>
          </div>

          <div className={`mt-4 flex items-center justify-between w-full text-xs font-mono pt-3 border-t ${
            isSunlightMode ? 'border-zinc-200 text-zinc-700' : 'border-[#1f2421] text-zinc-400'
          }`}>
            <span>District: <strong>Mandya</strong></span>
            <span className="text-amber-500 font-bold">{t.radar.riskLabel} 74% High</span>
          </div>
        </div>

        {/* Right Column: Microclimate Spray Window (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white'
          }`}>
            <h3 className="text-sm font-bold font-mono flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500" />
              {t.radar.title}
            </h3>

            {/* Weather Grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}>
                <Wind className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-500">{t.radar.windLabel}</div>
                <div className="font-bold mt-0.5">6.2 km/h</div>
              </div>
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}>
                <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-500">{t.radar.humidityLabel}</div>
                <div className="font-bold text-amber-500 mt-0.5">89% High</div>
              </div>
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}>
                <Sun className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-500">{t.radar.rainLabel}</div>
                <div className="font-bold text-emerald-500 mt-0.5">2:30 PM</div>
              </div>
            </div>

            {/* Safe Spray Window Callout */}
            <div className={`p-4 rounded-xl border ${isSunlightMode ? 'bg-zinc-100 border-emerald-500/40' : 'bg-[#181c1a] border-emerald-500/30'}`}>
              <div className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> {t.radar.safeWindowLabel}
              </div>
              <div className="text-lg font-bold mt-1">
                {t.radar.safeWindowText}
              </div>
              <p className={`text-xs font-light mt-1 ${isSunlightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {t.radar.safeWindowDesc}
              </p>
            </div>

            <button
              onClick={handleAlert}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-md"
            >
              <Bell className="w-4 h-4" />
              <span>{alertSent ? t.radar.alertSentText : t.radar.sendAlertBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
