import React, { useEffect, useState } from 'react';
import { Mic, MicOff, Sparkles, Navigation, X } from 'lucide-react';
import { speechEngine } from '../utils/speech';
import { classifyVoiceIntent } from '../utils/voiceNavigator';
import { sound } from '../utils/audio';

export default function HandsFreeVoiceBanner({ isHandsFree, onToggle, selectedLang, onNavigate }) {
  const [isListening, setIsListening] = useState(false);
  const [lastHeard, setLastHeard] = useState('');

  useEffect(() => {
    if (!isHandsFree) {
      speechEngine.stopListening();
      setIsListening(false);
      return;
    }

    startHandsFreeLoop();

    return () => {
      speechEngine.stopListening();
    };
  }, [isHandsFree, selectedLang]);

  const startHandsFreeLoop = () => {
    setIsListening(true);
    const langCode = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'ta' ? 'ta-IN' : selectedLang === 'te' ? 'te-IN' : selectedLang === 'kn' ? 'kn-IN' : 'en-IN';

    speechEngine.startListening(
      langCode,
      (transcript) => {
        setLastHeard(transcript);
        const intent = classifyVoiceIntent(transcript, selectedLang);
        if (intent && intent.targetTab) {
          sound.playSuccess();
          onNavigate(intent.targetTab);
          const speechResponse = intent.speechResponse[selectedLang] || intent.speechResponse['en'];
          speechEngine.speak(speechResponse, langCode);
        }
      },
      () => {
        // Auto-restart listening if hands-free is still on
        if (isHandsFree) {
          setTimeout(() => startHandsFreeLoop(), 1000);
        }
      },
      () => {
        if (isHandsFree) {
          setTimeout(() => startHandsFreeLoop(), 1500);
        }
      }
    );
  };

  if (!isHandsFree) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-950 via-zinc-900 to-black border-b border-emerald-500/30 px-4 py-2 text-xs font-mono text-white flex flex-wrap items-center justify-between gap-2 shadow-lg sticky top-[57px] z-20">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center animate-pulse">
          <Mic className="w-3.5 h-3.5 fill-black" />
        </div>
        <div>
          <div className="font-bold text-emerald-300 flex items-center gap-1.5">
            <span>🖐️ गीले हाथ / Hands-Free Voice Mode Active:</span>
          </div>
          <p className="text-[11px] text-zinc-300 font-light">
            Say aloud: <strong>"स्कैन" (Scan)</strong> • <strong>"मंडी" (Mandi)</strong> • <strong>"मौसम" (Radar)</strong> • <strong>"दवा" (Verify)</strong> • <strong>"दुकान" (Stores)</strong> • <strong>"समूह" (Group)</strong>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {lastHeard && (
          <span className="text-amber-300 italic text-[11px] bg-black/60 px-2 py-0.5 rounded border border-white/10">
            Heard: "{lastHeard}"
          </span>
        )}
        <button
          onClick={onToggle}
          className="text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/5 border border-white/10 text-[11px]"
        >
          ✕ Turn Off
        </button>
      </div>
    </div>
  );
}
