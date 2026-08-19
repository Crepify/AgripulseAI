import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, QrCode, AlertOctagon, Check } from 'lucide-react';
import { PESTICIDE_SAMPLES } from '../data/agriData';
import { sound } from '../utils/audio';
import { T } from '../data/translations';

export default function TabVerify({ selectedLang, isSunlightMode }) {
  const t = T[selectedLang] || T['en'];
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
        <span className={`font-bold ${isSunlightMode ? 'text-zinc-900' : 'text-zinc-200'}`}>{t.verify.testBottles}</span>
        {PESTICIDE_SAMPLES.map((s) => {
          const isSelected = selectedSample.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleScan(s)}
              style={{
                backgroundColor: isSelected 
                  ? s.status === 'GENUINE' ? '#34d399' : '#ef4444'
                  : isSunlightMode ? '#ffffff' : '#1f2937',
                color: isSelected ? (s.status === 'GENUINE' ? '#000000' : '#ffffff') : isSunlightMode ? '#111827' : '#ffffff',
                borderColor: isSelected 
                  ? s.status === 'GENUINE' ? '#10b981' : '#dc2626'
                  : isSunlightMode ? '#9ca3af' : '#4b5563',
              }}
              className="px-3.5 py-2 rounded-xl font-black text-xs transition-all border-2 shadow-sm whitespace-nowrap"
            >
              {s.name.split(' ')[0]} {s.status === 'FAKE' ? '⚠️ (Fake)' : '✓'}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Hologram QR Viewfinder */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-black border-2 border-zinc-700 flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden shadow-xl">
          <motion.div
            animate={{ top: ['10%', '85%', '10%'] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
            className={`absolute left-6 right-6 h-0.5 ${selectedSample.status === 'GENUINE' ? 'bg-emerald-400 shadow-[0_0_15px_#00ff87]' : 'bg-red-500 shadow-[0_0_15px_#ef4444]'}`}
          />

          <div className="p-6 rounded-2xl bg-zinc-900 border-2 border-zinc-700 flex flex-col items-center gap-2">
            <QrCode className={`w-20 h-20 ${selectedSample.status === 'GENUINE' ? 'text-emerald-400' : 'text-red-400'}`} />
            <div className="text-xs font-mono text-white font-bold">{selectedSample.name}</div>
            <div className="text-[10px] font-mono text-zinc-400">Batch: {selectedSample.batch}</div>
          </div>
        </div>

        {/* Right: Verification Details */}
        <div className="lg:col-span-7">
          <div className={`p-6 rounded-2xl border-2 space-y-4 shadow-xl ${
            selectedSample.status === 'GENUINE'
              ? isSunlightMode ? 'bg-white border-emerald-400 text-zinc-900' : 'bg-zinc-900 border-emerald-500/50 text-white'
              : isSunlightMode ? 'bg-red-50 border-red-400 text-zinc-900' : 'bg-zinc-900 border-red-500/50 text-white'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b-2 border-zinc-800">
              <div className="flex items-center gap-2.5">
                {selectedSample.status === 'GENUINE' ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                ) : (
                  <AlertOctagon className="w-6 h-6 text-red-500" />
                )}
                <div>
                  <h3 className="text-base font-black">
                    {selectedSample.status === 'GENUINE' ? t.verify.genuineTitle : t.verify.fakeTitle}
                  </h3>
                  <div className="text-xs text-zinc-400 font-mono">
                    {selectedSample.name}
                  </div>
                </div>
              </div>

              <span className={`text-xs font-mono font-black px-3 py-1 rounded-lg border-2 ${
                selectedSample.status === 'GENUINE' ? 'bg-emerald-400 text-black border-emerald-300' : 'bg-red-500 text-white border-red-400'
              }`}>
                {selectedSample.status === 'GENUINE' ? t.verify.authenticBadge : t.verify.fakeBadge}
              </span>
            </div>

            {selectedSample.warning && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border-2 border-red-500 text-xs text-red-200 font-mono leading-relaxed font-bold">
                {selectedSample.warning}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className={`p-3 rounded-xl border-2 ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-950 border-zinc-800'}`}>
                <div className="text-[10px] text-zinc-400 font-bold">{t.verify.mfgLabel}</div>
                <div className="font-black mt-0.5 text-white">{selectedSample.mfg}</div>
              </div>
              <div className={`p-3 rounded-xl border-2 ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-950 border-zinc-800'}`}>
                <div className="text-[10px] text-zinc-400 font-bold">{t.verify.mrpLabel}</div>
                <div className="font-black text-amber-400 mt-0.5">{selectedSample.mrp}</div>
              </div>
            </div>

            <div className="text-xs text-zinc-300 pt-1 flex items-center justify-between font-bold">
              <span>{t.verify.registryVerified}</span>
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
