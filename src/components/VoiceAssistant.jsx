import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Sparkles, ArrowRight, CheckCircle2, Navigation } from 'lucide-react';
import { speechEngine } from '../utils/speech';
import { classifyVoiceIntent } from '../utils/voiceNavigator';
import { sound } from '../utils/audio';
import { T } from '../data/translations';

export default function VoiceAssistant({ isOpen, onClose, selectedLang, onNavigate }) {
  const t = T[selectedLang] || T['en'];
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [navigatedTab, setNavigatedTab] = useState(null);

  const sampleQuestions = [
    { text: 'आज का मंडी भाव क्या है?', topic: 'mandi' },
    { text: 'सुबह छिड़काव का सही समय क्या है?', topic: 'weather' },
    { text: 'दवा असली है या नकली कैसे जांचें?', topic: 'verify' },
    { text: 'धान में ब्लास्ट रोग के लिए क्या करें?', topic: 'scan' },
  ];

  const handleAsk = (userText) => {
    sound.playClick();
    setTranscript(userText);

    // Classify intent & auto-navigate
    const intent = classifyVoiceIntent(userText, selectedLang);
    if (intent && intent.targetTab) {
      const speechText = intent.speechResponse[selectedLang] || intent.speechResponse['en'];
      const targetLabel = intent.tabLabel[selectedLang] || intent.tabLabel['en'];
      
      setAiResponse(speechText);
      setNavigatedTab(targetLabel);
      onNavigate(intent.targetTab);

      const speechLangCode = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'ta' ? 'ta-IN' : selectedLang === 'te' ? 'te-IN' : selectedLang === 'kn' ? 'kn-IN' : 'en-IN';
      speechEngine.speak(speechText, speechLangCode);
    }
  };

  const handleMic = () => {
    sound.playClick();
    if (isListening) {
      speechEngine.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      const speechLangCode = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'ta' ? 'ta-IN' : selectedLang === 'te' ? 'te-IN' : selectedLang === 'kn' ? 'kn-IN' : 'en-IN';
      
      speechEngine.startListening(
        speechLangCode,
        (text) => setTranscript(text),
        () => {
          setIsListening(false);
          handleAsk(transcript || 'आज का मंडी भाव क्या है?');
        },
        () => {
          setIsListening(false);
          handleAsk('आज का मंडी भाव क्या है?');
        }
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none"
          onClick={onClose}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-md w-full p-6 rounded-3xl bg-[#121514] border border-emerald-500/30 text-white relative flex flex-col items-center text-center shadow-[0_0_50px_rgba(16,185,129,0.2)]"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl bg-[#181c1a] text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl mb-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              👨‍🌾
            </div>
            <h3 className="text-lg font-bold text-white">{t.assistant.title}</h3>
            <p className="text-xs text-emerald-300 font-mono">{t.assistant.subtitle}</p>

            {/* Mic button */}
            <div className="my-5 flex flex-col items-center">
              <button
                onClick={handleMic}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.8)] scale-105'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-105'
                }`}
              >
                {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8 fill-black" />}
              </button>
              <span className="text-xs font-mono text-zinc-400 mt-2.5">
                {isListening ? t.assistant.listening : t.assistant.tapToSpeak}
              </span>
            </div>

            {transcript && (
              <div className="w-full p-4 rounded-2xl bg-[#181c1a] border border-[#232925] text-left text-xs space-y-2 mb-3">
                <div className="text-zinc-400 font-mono text-[10px]">{t.assistant.youAsked}</div>
                <div className="text-white font-bold italic">"{transcript}"</div>

                {navigatedTab && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono bg-black/40 px-2.5 py-1 rounded-lg border border-amber-500/20">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>{t.assistant.autoNavigated} <strong>{navigatedTab}</strong></span>
                  </div>
                )}

                {aiResponse && (
                  <div className="pt-2 border-t border-white/5 text-emerald-300 font-light leading-relaxed">
                    {aiResponse}
                  </div>
                )}
              </div>
            )}

            {/* Sample Prompts */}
            <div className="w-full text-left space-y-1.5">
              {sampleQuestions.map((sq, i) => (
                <button
                  key={i}
                  onClick={() => handleAsk(sq.text)}
                  className="w-full p-2.5 rounded-xl bg-[#181c1a] hover:bg-[#222825] border border-[#232925] text-xs text-zinc-300 text-left flex items-center justify-between transition-all"
                >
                  <span className="truncate">{sq.text}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
