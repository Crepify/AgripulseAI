import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, CheckCircle, Share, PlusSquare, Zap, ShieldCheck } from 'lucide-react';
import { sound } from '../utils/audio';

export default function InstallAppModal({ isOpen, onClose, deferredPrompt, selectedLang }) {
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Check if already in standalone PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }
  }, []);

  const handleInstallClick = async () => {
    sound.playClick();
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        sound.playSuccess();
        setIsInstalled(true);
        onClose();
      }
    } else if (isIOS) {
      // Show iOS instruction
    } else {
      alert('To install: Tap your browser menu (3 dots) and tap "Install App" or "Add to Home Screen".');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full p-6 rounded-3xl bg-[#141816] border-2 border-emerald-400/50 text-white relative flex flex-col items-center text-center shadow-[0_0_50px_rgba(16,185,129,0.3)]"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* App Icon */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-400 text-black flex items-center justify-center text-3xl font-black shadow-[0_0_25px_rgba(52,211,153,0.6)] mb-3 border-2 border-emerald-300">
              🌾
            </div>

            <h3 className="text-xl font-black text-white">
              {selectedLang === 'hi' ? 'AgriPulse AI ऐप डाउनलोड करें' : 'Download AgriPulse AI App'}
            </h3>
            <p className="text-xs text-emerald-300 font-bold mt-1">
              {selectedLang === 'hi' ? '100% मुफ्त • ऑफलाइन चलेगा • फोन में कोई जगह नहीं लेगा' : '100% Free • Works Offline • Instant Mobile Launch'}
            </p>

            {/* Benefits */}
            <div className="w-full my-4 p-3.5 rounded-2xl bg-black/60 border border-zinc-700 text-left text-xs space-y-2 font-medium text-zinc-200">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{selectedLang === 'hi' ? 'बिना इंटरनेट खेत में पत्ती स्कैन और आवाज सुनें' : 'Use offline in remote fields with zero internet'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{selectedLang === 'hi' ? 'होम स्क्रीन से 1-टैप में सीधे ऐप की तरह खुलेगा' : 'Launches full-screen from your Home Screen'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{selectedLang === 'hi' ? 'जीरो ऐप-स्टोर डाउनलोड, केवल 2MB साइज' : 'Zero app store friction • Instant updates'}</span>
              </div>
            </div>

            {/* Action Buttons & iOS Guide */}
            {isIOS ? (
              <div className="w-full p-4 rounded-2xl bg-zinc-900 border border-zinc-700 text-left text-xs space-y-2.5">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>iPhone / iPad Installation Steps:</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs">1</span>
                  <span>Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-emerald-400" /> in Safari browser.</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-300">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-xs">2</span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-400" />.</span>
                </div>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                className="w-full py-3.5 rounded-2xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-sm border-2 border-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.6)] transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>{selectedLang === 'hi' ? 'फोन में डाउनलोड करें (Install App)' : 'Download to Home Screen'}</span>
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
