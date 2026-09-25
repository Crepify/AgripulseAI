import React, { useEffect, useState } from 'react';
import { Mic, X } from 'lucide-react';
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
    <div className="w-full border-b border-emerald-500/30 bg-gradient-to-r from-emerald-950 via-zinc-900 to-black text-white shadow-lg">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-3 py-1.5 sm:px-6">
        <span className="flex items-center gap-1.5 text-[11px] font-black text-emerald-300">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-black ${isListening ? 'animate-pulse' : ''}`}>
            <Mic className="w-3 h-3 fill-black" />
          </span>
          <span className="whitespace-nowrap">🖐️ Hands-Free Active</span>
        </span>

        <span className="min-w-0 flex-1 text-[10px] font-mono leading-snug text-zinc-300">
          Say: <strong>"स्कैन"</strong> • <strong>"मंडी भाव"</strong> • <strong>"मौसम"</strong> • <strong>"दवा"</strong> • <strong>"दुकान"</strong> • <strong>"समूह"</strong> • <strong>"बाजार"</strong> • <strong>"समुदाय"</strong> • <strong>"मजदूर"</strong> • <strong>"डीजल"</strong> • <strong>"सहायक"</strong> • <strong>"सेवा"</strong> • All 22 languages
        </span>

        {lastHeard && (
          <span className="order-last basis-full sm:order-none sm:basis-auto text-[10px] italic text-amber-300 bg-black/60 px-2 py-0.5 rounded border border-white/10 truncate max-w-full">
            Heard: "{lastHeard}"
          </span>
        )}

        <button
          onClick={onToggle}
          className="order-last ml-auto flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-bold text-zinc-300 hover:text-white active:scale-95 sm:order-none"
          aria-label="Turn off hands-free mode"
        >
          <X className="w-3 h-3" />
          {selectedLang === 'hi' ? 'बंद करें' : 'Turn Off'}
        </button>
      </div>
    </div>
  );
}
