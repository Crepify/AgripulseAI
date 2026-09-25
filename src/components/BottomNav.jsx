import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scan, Scale, ReceiptText, TrendingUp, LayoutGrid, X } from 'lucide-react';
import { sound } from '../utils/audio';
import { T } from '../data/translations';

/*
 * FULL MOBILE BOTTOM NAVIGATION
 * 4 primary destinations + "More" sheet with every other service.
 * All touch targets ≥ 56px (the Bapu Test).
 */

const MORE_TABS = [
  { id: 'grade', label: 'Proof of Grade', emoji: '📜' },
  { id: 'exposer', label: 'Price Exposer', emoji: '💊' },
  { id: 'pool', label: 'Truck Pooling', emoji: '🚚' },
  { id: 'auction', label: 'Reverse Auction', emoji: '🔨' },
];

export default function BottomNav({ activeTab, setActiveTab, selectedLang, isSunlightMode }) {
  const t = T[selectedLang] || T['en'];
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = [
    { id: 'scan', label: t.tabs?.scan || 'Scan', icon: Scan },
    { id: 'weigh', label: t.tabs?.weigh || 'Weigh', icon: Scale },
    { id: 'patti', label: t.tabs?.patti || 'Patti', icon: ReceiptText },
    { id: 'profit', label: t.tabs?.profit || 'ROI', icon: TrendingUp },
  ];

  const inMore = MORE_TABS.some((m) => m.id === activeTab);

  const go = (id) => { sound.playClick(); setActiveTab(id); setMoreOpen(false); };

  return (
    <>
      {/* More sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60" onClick={() => setMoreOpen(false)}>
            <motion.div initial={{ y: 400 }} animate={{ y: 0 }} exit={{ y: 400 }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className={`absolute bottom-0 inset-x-0 mx-auto max-w-md rounded-t-3xl border-t-2 px-4 pt-4 pb-24 ${
                isSunlightMode ? 'bg-white border-zinc-200' : 'bg-[#101312] border-zinc-800'
              }`}>
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-zinc-400/40" />
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-black text-base ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`}>{t.saathiHub?.allServices || 'All Services'} • सभी सेवाएं</h3>
                <button onClick={() => setMoreOpen(false)} aria-label="Close" className={`p-2.5 rounded-full ${isSunlightMode ? 'bg-zinc-100 text-zinc-700' : 'bg-zinc-800 text-zinc-200'}`}><X className="w-5 h-5" /></button>
              </div>
              {/* Farmer helplines — one tap to call, works without internet */}
              <div className={`mb-3 p-3 rounded-2xl border-2 ${isSunlightMode ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/40 border-emerald-800/60'}`}>
                <div className={`text-[10px] font-black tracking-widest mb-2 ${isSunlightMode ? 'text-emerald-700' : 'text-emerald-400'}`}>📞 KISAN HELPLINE • किसान हेल्पलाइन</div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Kisan Call Centre', hi: 'फसल सलाह', num: '18001801551' },
                    { label: 'PM-KISAN', hi: 'किस्त जांच', num: '155261' },
                    { label: 'Crop Insurance', hi: 'फसल बीमा', num: '18002091111' },
                  ].map((h) => (
                    <a key={h.num} href={`tel:${h.num}`} onClick={() => sound.playClick()}
                      className={`min-h-[56px] rounded-xl border flex flex-col items-center justify-center gap-0.5 text-center px-1 active:scale-95 transition-transform ${isSunlightMode ? 'bg-white border-emerald-300 text-emerald-800' : 'bg-emerald-900/40 border-emerald-700 text-emerald-200'}`}>
                      <span className="text-[10px] font-black leading-tight">{h.label}</span>
                      <span className="text-[9px] font-bold opacity-75">{h.hi}</span>
                    </a>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {MORE_TABS.map((m) => {
                  const active = activeTab === m.id;
                  return (
                    <button key={m.id} onClick={() => go(m.id)}
                      className={`min-h-[84px] rounded-2xl border-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform ${
                        active ? 'bg-emerald-500 text-black border-emerald-400'
                          : isSunlightMode ? 'bg-zinc-50 border-zinc-200 text-zinc-800' : 'bg-zinc-900 border-zinc-800 text-zinc-100'
                      }`}>
                      <span className="text-3xl leading-none">{m.emoji}</span>
                      <span className="text-[11px] font-black text-center leading-tight px-1">{t.tabs?.[m.id] || m.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom bar */}
      <nav aria-label="Main Navigation" className={`fixed bottom-0 inset-x-0 z-40 mx-auto max-w-md border-t-2 pb-safe ${
        isSunlightMode ? 'bg-white/95 border-zinc-200' : 'bg-[#0c0f0e]/95 border-zinc-800'
      }`} style={{ backdropFilter: 'blur(12px)' }}>
        <div className="grid grid-cols-5">
          {primary.map((p) => {
            const Icon = p.icon;
            const active = activeTab === p.id && !moreOpen;
            const isSaathi = p.id === 'patti'; // hero feature gets the raised centre button
            return (
              <button key={p.id} onClick={() => go(p.id)} aria-current={active ? 'page' : undefined}
                className="min-h-[64px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform">
                {isSaathi ? (
                  <span className={`-mt-5 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg border-2 ${active ? 'bg-emerald-500 border-emerald-300 text-black' : 'bg-emerald-600 border-emerald-500 text-white'}`}>
                    <Icon className="w-6 h-6" />
                  </span>
                ) : (
                  <span className={`px-4 py-0.5 rounded-full transition-colors ${active ? 'bg-emerald-500/15' : ''}`}>
                    <Icon className={`w-6 h-6 ${active ? 'text-emerald-500' : isSunlightMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
                  </span>
                )}
                <span className={`text-[10px] font-black ${active ? 'text-emerald-500' : isSunlightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>{p.label}</span>
              </button>
            );
          })}
          <button onClick={() => { sound.playClick(); setMoreOpen(true); }} aria-expanded={moreOpen}
            className="min-h-[64px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform">
            <LayoutGrid className={`w-6 h-6 ${moreOpen || inMore ? 'text-emerald-500' : isSunlightMode ? 'text-zinc-500' : 'text-zinc-400'}`} />
            <span className={`text-[10px] font-black ${moreOpen || inMore ? 'text-emerald-500' : isSunlightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>{t.saathiHub?.more || 'More'}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
