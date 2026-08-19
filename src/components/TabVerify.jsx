import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, QrCode, AlertOctagon, Check } from 'lucide-react';
import { PESTICIDE_SAMPLES } from '../data/agriData';
import { sound } from '../utils/audio';

export default function TabVerify() {
  const [selectedSample, setSelectedSample] = useState(PESTICIDE_SAMPLES[0]);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = (sample) => {
    sound.playClick();
    setIsScanning(true);
    setSelectedSample(sample);
    setTimeout(() => {
      setIsScanning(false);
      if (sample.status === 'GENUINE') {
        sound.playSuccess();
      } else {
        sound.playTransition();
      }
    }, 800);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      {/* Sample Pesticide Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="font-mono text-zinc-400">Test Bottles:</span>
        {PESTICIDE_SAMPLES.map((s) => (
          <button
            key={s.id}
            onClick={() => handleScan(s)}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs transition-all ${
              selectedSample.id === s.id
                ? s.status === 'GENUINE' ? 'bg-emerald-500 text-black font-bold' : 'bg-red-500 text-white font-bold'
                : 'bg-[#151817] text-zinc-400 hover:text-zinc-200 border border-[#232925]'
            }`}
          >
            {s.name.split(' ')[0]} {s.status === 'FAKE' ? '⚠️ (Fake)' : '✓'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Hologram QR Viewfinder (5 cols) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-black border border-[#1f2421] flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden">
          {/* Laser beam */}
          <motion.div
            animate={{ top: ['10%', '85%', '10%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            className={`absolute left-6 right-6 h-0.5 ${selectedSample.status === 'GENUINE' ? 'bg-emerald-400' : 'bg-red-500'}`}
          />

          <div className="p-6 rounded-2xl bg-[#121514] border border-[#232925] flex flex-col items-center gap-2">
            <QrCode className={`w-20 h-20 ${selectedSample.status === 'GENUINE' ? 'text-emerald-400' : 'text-red-400'}`} />
            <div className="text-xs font-mono text-white font-bold">{selectedSample.name}</div>
            <div className="text-[10px] font-mono text-zinc-400">Batch: {selectedSample.batch}</div>
          </div>
        </div>

        {/* Right: Verification Details (7 cols) */}
        <div className="lg:col-span-7">
          <div className={`p-6 rounded-2xl border space-y-4 ${
            selectedSample.status === 'GENUINE'
              ? 'bg-[#121514] border-emerald-500/30'
              : 'bg-[#181111] border-red-500/40'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                {selectedSample.status === 'GENUINE' ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertOctagon className="w-6 h-6 text-red-400" />
                )}
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedSample.status === 'GENUINE' ? '100% Genuine Verified' : '⚠️ Warning: Counterfeit Detected'}
                  </h3>
                  <div className="text-xs text-zinc-400 font-mono">
                    Product: {selectedSample.name}
                  </div>
                </div>
              </div>

              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg ${
                selectedSample.status === 'GENUINE' ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'
              }`}>
                {selectedSample.status === 'GENUINE' ? 'AUTHENTIC' : 'SPURIOUS'}
              </span>
            </div>

            {selectedSample.warning && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-200 font-mono">
                {selectedSample.warning}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#0e100f] border border-[#232925]">
                <div className="text-[10px] text-zinc-500">Manufacturer</div>
                <div className="font-bold text-white mt-0.5">{selectedSample.mfg}</div>
              </div>
              <div className="p-3 rounded-xl bg-[#0e100f] border border-[#232925]">
                <div className="text-[10px] text-zinc-500">Authorized MRP</div>
                <div className="font-bold text-amber-300 mt-0.5">{selectedSample.mrp}</div>
              </div>
            </div>

            <div className="text-xs text-zinc-400 pt-1 flex items-center justify-between">
              <span>National Agrochemical Registry (CIB&RC) verified</span>
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
