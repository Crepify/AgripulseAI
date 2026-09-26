import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Scan, ShieldCheck, Mic, Leaf, ArrowRight, Handshake, TrendingUp, Languages } from 'lucide-react';
import LoginPage from './LoginPage';
import { createDemoSession } from '../utils/authService';

/*
 * CLEAN MOBILE LANDING — app-style onboarding, not a website.
 * One headline, four feature tiles, one giant CTA. Zero clutter.
 */

export default function LandingPage({ onLoginSuccess, selectedLang, setSelectedLang }) {
  const [showAuth, setShowAuth] = useState(false);
  const hi = selectedLang === 'hi';

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

  const features = [
    { icon: Scan, title: hi ? 'रोग स्कैनर' : 'Disease Scanner', desc: hi ? 'एक फोटो से 52 रोगों की पहचान और सटीक दवा' : 'One photo identifies 52 diseases with exact dosage', color: 'bg-emerald-100 text-emerald-700' },
    { icon: Handshake, title: hi ? 'पट्टी ऑडिटर' : 'Patti Auditor', desc: hi ? 'हर मंडी कटौती कानूनी सीमा से जांची जाती है' : 'Every mandi fee audited against legal limits', color: 'bg-amber-100 text-amber-700' },
    { icon: TrendingUp, title: hi ? 'मुनाफ़ा सिम्युलेटर' : 'ROI Simulator', desc: hi ? 'भाड़ा, मजदूरी और फीस के बाद का शुद्ध मुनाफ़ा' : 'Net profit after transport, labor and fees', color: 'bg-sky-100 text-sky-700' },
    { icon: Mic, title: hi ? 'वॉइस ट्रक पूलिंग' : 'Voice Truck Pooling', desc: hi ? 'बोलकर साझा ट्रक भरें और भाड़ा बांटें' : 'A shared truck filled by voice, freight split fairly', color: 'bg-violet-100 text-violet-700' },
  ];

  return (
    <div className="min-h-dvh flex flex-col font-sans text-zinc-900"
      style={{ background: 'linear-gradient(175deg, #f0fdf4 0%, #f4f7f5 40%, #ecfdf5 100%)' }}>

      {/* top bar */}
      <header className="px-5 pt-12 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-700 text-white shadow-md shadow-emerald-200">
            <Leaf className="w-6 h-6" strokeWidth={2.4} />
          </div>
          <div>
            <h1 className="text-lg font-black text-emerald-800 leading-none tracking-tight">AgriPulse AI</h1>
            <p className="text-[11px] font-bold text-zinc-500 mt-0.5">{hi ? 'किसान का अपना ऐप' : 'The farmer’s own app'}</p>
          </div>
        </div>
        <button
          onClick={() => setSelectedLang(hi ? 'en' : 'hi')}
          className="flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-white border border-zinc-200 text-xs font-black text-zinc-700 shadow-sm active:scale-95"
        >
          <Languages className="w-4 h-4 text-emerald-600" /> {hi ? 'EN' : 'हिंदी'}
        </button>
      </header>

      {/* hero */}
      <main className="flex-1 flex flex-col px-5 pt-6">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h2 className="text-[34px] leading-[1.12] font-black tracking-tight">
            {hi ? <>फसल भी,<br /><span className="text-emerald-600">भाव भी।</span></> : <>Grow more.<br /><span className="text-emerald-600">Earn more.</span></>}
          </h2>
          <p className="mt-3 text-[15px] font-medium text-zinc-600 leading-relaxed max-w-[300px]">
            {hi
              ? 'बीमारी की जांच, सही दवा, मंडी भाव और बिना बिचौलिए की बिक्री — सब एक ऐप में, आपकी भाषा में।'
              : 'Disease check, right medicine, mandi prices and middleman-free selling — one app, in your language.'}
          </p>
        </motion.div>

        {/* feature tiles */}
        <div className="mt-7 grid grid-cols-2 gap-3">
          {features.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 + i * 0.08 }}
              className="p-4 rounded-2xl bg-white border border-zinc-100 shadow-sm">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 ${f.color}`}>
                <f.icon className="w-5 h-5" strokeWidth={2.4} />
              </div>
              <div className="text-[14px] font-black leading-tight">{f.title}</div>
              <div className="text-[11px] font-bold text-zinc-500 mt-1 leading-snug">{f.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* trust strip */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-5 flex items-center justify-center gap-4 text-[11px] font-black text-zinc-500">
          <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> {hi ? '100% ऑफलाइन' : '100% offline'}</span>
          <span>•</span>
          <span>{hi ? '23 भाषाएं' : '23 languages'}</span>
          <span>•</span>
          <span>{hi ? 'मुफ्त' : 'Free forever'}</span>
        </motion.div>
      </main>

      {/* CTA */}
      <footer className="px-5 pb-10 pt-4">
        <motion.button initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          onClick={() => setShowAuth(true)}
          className="w-full min-h-[60px] rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white text-lg font-black flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-200 active:scale-[0.98] transition-transform"
        >
          {hi ? 'शुरू करें' : 'Get Started'} <ArrowRight className="w-5 h-5" strokeWidth={2.6} />
        </motion.button>
        <button
          onClick={() => onLoginSuccess(createDemoSession())}
          className="mt-2.5 w-full min-h-[48px] rounded-2xl bg-white border-2 border-violet-200 text-violet-700 text-sm font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          🎬 {hi ? 'डेमो मोड — बिना लॉगिन देखें' : 'Demo Mode — explore without login'}
        </button>
        <p className="text-center text-[11px] font-bold text-zinc-400 mt-3">
          {hi ? 'मोबाइल नंबर से 30 सेकंड में लॉगिन • डेमो में कोई OTP नहीं' : 'Login with mobile in 30 seconds • no OTP in demo'}
        </p>
      </footer>
    </div>
  );
}
