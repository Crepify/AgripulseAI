import React, { useState } from 'react';
import { Scan, ShieldCheck, Mic, Leaf, ArrowRight, WifiOff, Languages, Sparkles } from 'lucide-react';
import LoginPage from './LoginPage';

export default function LandingPage({ onLoginSuccess, selectedLang, setSelectedLang }) {
  const [showAuth, setShowAuth] = useState(false);

  if (showAuth) {
    return (
      <LoginPage
        onSuccess={onLoginSuccess}
        onCancel={() => setShowAuth(false)}
        selectedLang={selectedLang}
        setSelectedLang={setSelectedLang}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-[#f4f7f5] text-zinc-900 font-sans flex flex-col">
      <header className="px-4 sm:px-6 py-3.5 sm:py-4 flex justify-between items-center gap-3 border-b border-zinc-200 bg-white">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm">
            <Leaf className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg sm:text-xl font-black text-emerald-700 tracking-tight leading-none">AgriPulse AI</h1>
            <p className="hidden truncate text-[11px] text-zinc-500 sm:block">{selectedLang === 'hi' ? 'स्मार्ट फसल देखभाल' : 'Smart Crop Care & Market Copilot'}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAuth(true)}
          className="h-11 px-5 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 transition-colors active:scale-95 shrink-0"
        >
          {selectedLang === 'hi' ? 'लॉगिन' : 'Login'}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16 text-center">
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1.5 text-[11px] sm:text-xs font-bold">
            <WifiOff className="w-3.5 h-3.5" />
            {selectedLang === 'hi' ? '100% ऑफलाइन काम करता है' : 'Works 100% offline'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 text-sky-800 px-3 py-1.5 text-[11px] sm:text-xs font-bold">
            <Languages className="w-3.5 h-3.5" />
            22 {selectedLang === 'hi' ? 'भाषाएं' : 'Languages'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-3 py-1.5 text-[11px] sm:text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            No app install needed
          </span>
        </div>

        <h2 className="text-[clamp(2rem,7vw,3.9rem)] font-black text-zinc-900 mb-4 sm:mb-6 leading-[1.1] tracking-tight">
          Smart Crop Care & <span className="text-emerald-600">Market Copilot</span>
        </h2>
        <p className="text-base sm:text-lg md:text-xl text-zinc-600 mb-8 sm:mb-10 max-w-2xl mx-auto leading-relaxed">
          Built for farmers. Works 100% offline with zero latency. Secure, hands-free, and available in your local language.
        </p>

        <button
          onClick={() => setShowAuth(true)}
          className="flex items-center gap-2.5 px-8 py-4 bg-zinc-900 text-white rounded-2xl text-base sm:text-lg font-bold hover:scale-[1.03] transition-transform shadow-xl mb-14 sm:mb-20 active:scale-95"
        >
          {selectedLang === 'hi' ? 'मुफ्त में शुरू करें' : 'Get Started for Free'} <ArrowRight className="w-5 h-5" />
        </button>

        <div className="grid md:grid-cols-3 gap-4 sm:gap-6 w-full text-left">
          <div className="p-5 sm:p-6 bg-white rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <Scan className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Cloud + On-Device AI</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              Crop photos can use our connected cloud AI endpoint, with on-device analysis available as an offline fallback.
            </p>
          </div>

          <div className="p-5 sm:p-6 bg-white rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Pesticide Verification</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              Scan supply chain barcodes to detect counterfeit pesticides before you buy. Protect your crops and your investment.
            </p>
          </div>

          <div className="p-5 sm:p-6 bg-white rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">Hands-Free Voice Copilot</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              Muddy hands? Kisan Sahayak acts as your voice copilot to navigate the app and fetch market rates using natural language.
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center py-5 sm:py-6 text-zinc-500 text-xs sm:text-sm font-medium border-t border-zinc-200 pb-safe px-4">
        AgriPulse AI • Built for Farmers • Zero Network Overhead
      </footer>
    </div>
  );
}
