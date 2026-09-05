import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  X, 
  Smartphone, 
  CheckCircle, 
  Share, 
  PlusSquare, 
  MoreVertical, 
  Monitor, 
  Sparkles,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { sound } from '../utils/audio';

export default function InstallAppModal({ isOpen, onClose, deferredPrompt, selectedLang }) {
  const [deviceType, setDeviceType] = useState('android'); // 'android' | 'ios' | 'desktop'
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setDeviceType('ios');
    } else if (/android/.test(userAgent)) {
      setDeviceType('android');
    } else {
      setDeviceType('desktop');
    }
  }, []);

  const handleNativeInstall = async () => {
    sound.playClick();
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          sound.playSuccess();
          setInstallSuccess(true);
          setTimeout(() => onClose(), 2000);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      sound.playClick();
      // If native prompt is blocked by iframe, switch to visual step-by-step guide
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full my-auto p-5 sm:p-6 rounded-3xl bg-zinc-900 border-2 border-emerald-400 text-white relative flex flex-col items-center text-center shadow-[0_0_50px_rgba(16,185,129,0.4)]"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>

            {/* App Icon */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-400 text-black flex items-center justify-center text-3xl font-black shadow-[0_0_25px_rgba(52,211,153,0.6)] mb-2.5 border-2 border-emerald-300">
              🌾
            </div>

            <h3 className="text-xl font-black text-white">
              {selectedLang === 'hi' ? 'AgriPulse AI ऐप डाउनलोड करें' : 'Install AgriPulse AI App'}
            </h3>
            <p className="text-xs text-emerald-400 font-bold mt-0.5">
              {selectedLang === 'hi' ? '100% फ्री • बिना इंटरनेट चलेगा • 2MB साइज' : '100% Free • Works Offline • Instant Mobile Launch'}
            </p>

            {/* Device Selector Tabs (Android / iPhone / Laptop) */}
            <div className="flex items-center gap-1 my-3 bg-zinc-950 p-1 rounded-xl border border-zinc-800 w-full text-xs">
              <button
                onClick={() => { sound.playClick(); setDeviceType('android'); }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  deviceType === 'android' ? 'bg-emerald-400 text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
                aria-label="Android"
              >
                🤖 Android
              </button>
              <button
                onClick={() => { sound.playClick(); setDeviceType('ios'); }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  deviceType === 'ios' ? 'bg-emerald-400 text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
                aria-label="iPhone"
              >
                🍎 iPhone
              </button>
              <button
                onClick={() => { sound.playClick(); setDeviceType('desktop'); }}
                className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                  deviceType === 'desktop' ? 'bg-emerald-400 text-black shadow-sm' : 'text-zinc-400 hover:text-white'
                }`}
                aria-label="Laptop / PC"
              >
                💻 Laptop / PC
              </button>
            </div>

            {/* Step-by-Step Interactive Visual Guide based on Device */}
            <div className="w-full p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-left text-xs space-y-3 font-medium text-zinc-200">
              {deviceType === 'android' && (
                <>
                  <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs pb-1 border-b border-zinc-800">
                    <Smartphone className="w-4 h-4" />
                    <span>{selectedLang === 'hi' ? 'एंड्रॉइड फोन में कैसे इंस्टॉल करें:' : 'How to install on Android:'}</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>
                      {selectedLang === 'hi' ? 'ब्राउज़र के ऊपर दाईं तरफ' : 'Tap the'} <strong>3 डॉट्स <MoreVertical className="w-3.5 h-3.5 inline text-emerald-400" /></strong> {selectedLang === 'hi' ? 'पर दबाएं।' : 'menu button in Chrome.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>
                      <strong>"Install App"</strong> या <strong>"Add to Home screen"</strong> {selectedLang === 'hi' ? 'पर दबाएं।' : 'option.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span className="text-emerald-400 font-bold">
                      {selectedLang === 'hi' ? 'ऐप आपके फोन की स्क्रीन पर आ जाएगा!' : 'App installs directly to your home screen!'}
                    </span>
                  </div>
                </>
              )}

              {deviceType === 'ios' && (
                <>
                  <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs pb-1 border-b border-zinc-800">
                    <Smartphone className="w-4 h-4" />
                    <span>{selectedLang === 'hi' ? 'iPhone / iPad में कैसे इंस्टॉल करें:' : 'How to install on iPhone / iPad:'}</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>
                      {selectedLang === 'hi' ? 'Safari में नीचे' : 'Tap the'} <strong>Share</strong> बटन <Share className="w-3.5 h-3.5 inline text-emerald-400" /> {selectedLang === 'hi' ? 'पर दबाएं।' : 'at the bottom.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>
                      {selectedLang === 'hi' ? 'नीचे स्क्रॉल करें और' : 'Scroll down & tap'} <strong>"Add to Home Screen" <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" /></strong> {selectedLang === 'hi' ? 'पर दबाएं।' : '.'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span className="text-emerald-400 font-bold">
                      {selectedLang === 'hi' ? 'ऊपर "Add" दबाएं — ऐप फुल स्क्रीन खुलेगा!' : 'Tap "Add" — launches full screen like a native app!'}
                    </span>
                  </div>
                </>
              )}

              {deviceType === 'desktop' && (
                <>
                  <div className="font-bold text-amber-400 flex items-center gap-1.5 text-xs pb-1 border-b border-zinc-800">
                    <Monitor className="w-4 h-4" />
                    <span>How to install on Laptop / Desktop:</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Look at the right side of your browser URL address bar.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Click the <strong>Install App icon 🖥️ (down arrow)</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-400 text-black font-black text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span className="text-emerald-400 font-bold">AgriPulse AI opens in its own clean desktop window!</span>
                  </div>
                </>
              )}
            </div>

            {/* Direct Native Install Button (if browser supports programmatic prompt) */}
            {deferredPrompt && (
              <button
                onClick={handleNativeInstall}
                className="w-full mt-3 py-3 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-xs sm:text-sm border-2 border-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.5)] transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>1-Tap Instant Install (डाउनलोड करें)</span>
              </button>
            )}

            {installSuccess && (
              <div className="mt-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                <span>App successfully added to your device!</span>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
