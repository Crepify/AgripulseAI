import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Sparkles } from 'lucide-react';

export default function ImageScanOverlay({ isScanning, text = 'Analyzing Leaf Lesions...' }) {
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    if (!isScanning) {
      setProgress(10);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.floor(Math.random() * 18 + 12);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isScanning]);

  if (!isScanning) return null;

  return (
    <div className="absolute inset-0 z-30 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white select-none">
      {/* Animated Laser Grid & Targeting Reticle */}
      <div className="relative w-48 h-48 border border-emerald-500/40 rounded-2xl flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.3)]">
        {/* Sweeping Laser Line */}
        <motion.div
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#00ff87]"
        />

        {/* Pulsing Neural Lesion Rings */}
        <div className="w-28 h-28 rounded-full border border-emerald-400/50 animate-ping absolute opacity-60" />
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-400 animate-spin absolute" />
        <div className="w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_15px_#10b981]" />

        {/* Reticle corner marks */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
      </div>

      {/* Progress & Status */}
      <div className="mt-5 w-64 text-center space-y-2">
        <div className="text-xs font-bold font-mono text-emerald-300 flex items-center justify-center gap-1.5 animate-pulse">
          <Zap className="w-3.5 h-3.5 fill-emerald-400" />
          <span>{text}</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-[#181c1a] rounded-full overflow-hidden border border-[#232925] p-0.5">
          <div
            style={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-amber-400 rounded-full transition-all duration-150 shadow-[0_0_10px_#10b981]"
          />
        </div>

        <div className="flex justify-between text-[10px] font-mono text-zinc-400">
          <span>Running AI inference</span>
          <span className="text-emerald-400 font-bold">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
