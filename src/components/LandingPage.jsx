import React, { useState } from 'react';
import { Scan, ShieldCheck, Mic, Leaf, ArrowRight } from 'lucide-react';
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
    <div className="min-h-screen bg-[#f4f7f5] text-zinc-900 font-sans flex flex-col">
      <header className="px-6 py-4 flex justify-between items-center border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-bold">
            <Leaf className="w-5 h-5" />
          </div>
          <h1 className="text-xl font-black text-emerald-700 tracking-tight">AgriPulse AI</h1>
        </div>
        <button
          onClick={() => setShowAuth(true)}
          className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors"
        >
          {selectedLang === 'hi' ? 'लॉगिन' : 'Login'}
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-4xl mx-auto">
        <h2 className="text-4xl md:text-6xl font-black text-zinc-900 mb-6 leading-tight">
          Smart Crop Care & <span className="text-emerald-600">Market Copilot</span>
        </h2>
        <p className="text-lg md:text-xl text-zinc-600 mb-10 max-w-2xl mx-auto">
          Built for farmers. Works 100% offline with zero latency. Secure, hands-free, and available in your local language.
        </p>

        <button
          onClick={() => setShowAuth(true)}
          className="flex items-center gap-2 px-8 py-4 bg-zinc-900 text-white rounded-2xl text-lg font-bold hover:scale-105 transition-transform shadow-xl mb-20"
        >
          Get Started for Free <ArrowRight className="w-5 h-5" />
        </button>

        <div className="grid md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <Scan className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Cloud + On-Device AI</h3>
            <p className="text-zinc-600 text-sm">
              Crop photos can use our connected cloud AI endpoint, with on-device analysis available as an offline fallback.
            </p>
          </div>
          
          <div className="p-6 bg-white rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Pesticide Verification</h3>
            <p className="text-zinc-600 text-sm">
              Scan supply chain barcodes to detect counterfeit pesticides before you buy. Protect your crops and your investment.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl shadow-sm border border-zinc-100 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-4">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Hands-Free Voice Copilot</h3>
            <p className="text-zinc-600 text-sm">
              Muddy hands? Kisan Sahayak acts as your voice copilot to navigate the app and fetch market rates using natural language.
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center py-6 text-zinc-500 text-sm font-medium border-t border-zinc-200">
        AgriPulse AI • Built for Farmers • Zero Network Overhead
      </footer>
    </div>
  );
}
