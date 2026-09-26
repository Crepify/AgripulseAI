import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Sparkles, ArrowRight, Navigation, Bot } from 'lucide-react';
import { speechEngine, speechLangCode } from '../utils/speech';
import { classifyVoiceIntent } from '../utils/voiceNavigator';
import { sound } from '../utils/audio';
import { T } from '../data/translations';

export default function VoiceAssistant({ isOpen, onClose, selectedLang, onNavigate }) {
  const t = T[selectedLang] || T['en'];
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [navigatedTab, setNavigatedTab] = useState(null);
  // Latest heard text lives in a ref — the old version read the `transcript`
  // STATE inside onEnd, which was a stale closure and always acted on ''.
  const heardRef = useRef({ text: '', acted: false });

  const sampleQuestions = [
    { text: 'टमाटर में रोग है', topic: 'scan' },
    { text: 'पट्टी जांचो', topic: 'patti' },
    { text: 'वजन में चोरी?', topic: 'weigh' },
    { text: 'गुणवत्ता प्रमाण चाहिए', topic: 'grade' },
    { text: 'दवा का असली दाम', topic: 'exposer' },
    { text: 'ट्रक साझा करो', topic: 'pool' },
    { text: 'खाद की बोली लगाओ', topic: 'auction' },
    { text: 'बिना बिचौलिए बेचो', topic: 'market' },
    { text: 'मंडी भाव बताओ', topic: 'mandi' },
  ];

  const handleAsk = (userText) => {
    sound.playClick();
    setTranscript(userText);
    const intent = classifyVoiceIntent(userText, selectedLang);
    if (intent && intent.targetTab) {
      const speechText = intent.speechResponse[selectedLang] || intent.speechResponse['hi'] || intent.speechResponse['en'];
      const targetLabel = intent.tabLabel[selectedLang] || intent.tabLabel['hi'] || intent.tabLabel['en'];
      setAiResponse(speechText);
      setNavigatedTab(targetLabel);
      onNavigate(intent.targetTab);
      const langMap = { hi: 'hi-IN', en: 'en-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', mr: 'mr-IN', gu: 'gu-IN', bn: 'bn-IN', pa: 'pa-IN', ml: 'ml-IN', or: 'or-IN', as: 'as-IN', ur: 'ur-IN' };
      const speechLangCode = langMap[selectedLang] || 'hi-IN';
      speechEngine.speak(speechText, speechLangCode);
    }
  };

  const handleMic = () => {
    sound.playClick();
    if (isListening) {
      speechEngine.stopListening();
      setIsListening(false);
      return;
    }
    heardRef.current = { text: '', acted: false };
    setTranscript('');
    setAiResponse(null);
    setNavigatedTab(null);
    setIsListening(true);
    speechEngine.startListening(
      speechLangCode(selectedLang),
      (text, meta = {}) => {
        // Live interim text streams into the UI; we only ACT on final results.
        setTranscript(text);
        heardRef.current.text = text;
        if (meta.final && text.trim() && !heardRef.current.acted) {
          heardRef.current.acted = true;
          setIsListening(false);
          speechEngine.stopListening();
          handleAsk(text.trim());
        }
      },
      () => {
        // Recognizer ended (silence/timeout) — act on whatever was heard.
        setIsListening(false);
        const heard = heardRef.current.text.trim();
        if (heard && !heardRef.current.acted) {
          heardRef.current.acted = true;
          handleAsk(heard);
        }
      },
      () => {
        setIsListening(false);
        const heard = heardRef.current.text.trim();
        if (heard && !heardRef.current.acted) {
          heardRef.current.acted = true;
          handleAsk(heard);
        }
      }
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none" onClick={onClose}>
          <div onClick={(e) => e.stopPropagation()} className="modal-max-h max-w-md w-full p-5 sm:p-6 rounded-3xl bg-[#121514] border border-emerald-500/30 text-white relative flex flex-col items-center text-center shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-y-auto overscroll-contain">
            <button onClick={onClose} aria-label="Close assistant" title="Close assistant" className="absolute top-4 right-4 p-2 rounded-xl bg-[#181c1a] text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl mb-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]">👨‍🌾</div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Bot className="w-5 h-5 text-emerald-400" /> {t.assistant.title} — 22 Languages</h3>
            <p className="text-xs text-emerald-300 font-mono">{t.assistant.subtitle} + Patti Audit, Weighing, Grade, Pooling, Auction</p>

            <div className="my-5 flex flex-col items-center">
              <button onClick={handleMic} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.8)] scale-105' : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-105'}`}><span className="sr-only">Mic</span>{isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8 fill-black" />}</button>
              <span className="text-xs font-mono text-zinc-400 mt-2.5">{isListening ? t.assistant.listening : t.assistant.tapToSpeak} — {selectedLang.toUpperCase()}</span>
            </div>

            {transcript && (
              <div className="w-full p-4 rounded-2xl bg-[#181c1a] border border-[#232925] text-left text-xs space-y-2 mb-3">
                <div className="text-zinc-400 font-mono text-[10px]">{t.assistant.youAsked}</div>
                <div className="text-white font-bold italic">"{transcript}"</div>
                {navigatedTab && <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono bg-black/40 px-2.5 py-1 rounded-lg border border-amber-500/20"><Navigation className="w-3.5 h-3.5" /><span>{t.assistant.autoNavigated} <strong>{navigatedTab}</strong></span></div>}
                {aiResponse && <div className="pt-2 border-t border-white/5 text-emerald-300 font-light leading-relaxed">{aiResponse}</div>}
              </div>
            )}

            <div className="w-full text-left space-y-1.5">
              <div className="text-[10px] font-black text-zinc-500 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Try in your mother tongue:</div>
              {sampleQuestions.map((sq, i) => (
                <button key={i} onClick={() => handleAsk(sq.text)} className="w-full p-2.5 rounded-xl bg-[#181c1a] hover:bg-[#222825] border border-[#232925] text-xs text-zinc-300 text-left flex items-center justify-between"><span className="truncate">{sq.text}</span><ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" /></button>
              ))}
            </div>
            <div className="mt-3 text-[10px] text-zinc-500">Voice → Intent → Auto-navigate + spoken reply in {selectedLang.toUpperCase()}. Kisan Call Centre: 1800-180-1551</div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
