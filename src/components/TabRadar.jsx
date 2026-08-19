import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Wind, Droplets, Sun, ShieldCheck, Bell } from 'lucide-react';
import { sound } from '../utils/audio';

export default function TabRadar() {
  const [alertSent, setAlertSent] = useState(false);

  const handleAlert = () => {
    sound.playSuccess();
    setAlertSent(true);
    setTimeout(() => setAlertSent(false), 2500);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Radar View (6 cols) */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-[#121514] border border-[#1f2421] flex flex-col items-center justify-center min-h-[360px] relative overflow-hidden">
          {/* Radar circle & sweep */}
          <div className="relative w-64 h-64 rounded-full border border-emerald-500/20 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border border-emerald-500/30 flex items-center justify-center" />
            <div className="w-32 h-32 rounded-full border border-emerald-500/40 flex items-center justify-center" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />

            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/15 via-transparent to-transparent pointer-events-none"
            />

            {/* Threat Node */}
            <div className="absolute top-10 right-14 flex flex-col items-center">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-mono text-red-300 bg-black/80 px-1 rounded mt-1">Blast Spores (3km)</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between w-full text-xs font-mono text-zinc-400 pt-3 border-t border-[#1f2421]">
            <span>District: <strong>Mandya</strong></span>
            <span className="text-amber-400">Risk: Moderate (74%)</span>
          </div>
        </div>

        {/* Right Column: Microclimate Spray Window (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-6 rounded-2xl bg-[#121514] border border-[#1f2421] space-y-4">
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              Microclimate Spray Calculator
            </h3>

            {/* Weather Grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#181c1a] border border-[#232925]">
                <Wind className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-400">Wind</div>
                <div className="font-bold text-white mt-0.5">6.2 km/h</div>
              </div>
              <div className="p-3 rounded-xl bg-[#181c1a] border border-[#232925]">
                <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-400">Humidity</div>
                <div className="font-bold text-amber-300 mt-0.5">89% High</div>
              </div>
              <div className="p-3 rounded-xl bg-[#181c1a] border border-[#232925]">
                <Sun className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-400">Rain Time</div>
                <div className="font-bold text-emerald-400 mt-0.5">2:30 PM</div>
              </div>
            </div>

            {/* Safe Spray Window Callout */}
            <div className="p-4 rounded-xl bg-[#181c1a] border border-emerald-500/30">
              <div className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Recommended Spray Time:
              </div>
              <div className="text-lg font-bold text-white mt-1">
                6:30 AM – 10:30 AM Today
              </div>
              <p className="text-xs text-zinc-400 font-light mt-1">
                Low wind prevents chemical drift. Spray before 10:30 AM to allow full absorption before afternoon rain.
              </p>
            </div>

            <button
              onClick={handleAlert}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs font-mono transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Bell className="w-4 h-4" />
              <span>{alertSent ? 'Alert Sent to 140 Village Farmers ✓' : 'Send Spore Alert to Village Group'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
