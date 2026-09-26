import React, { useRef, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Sparkles, ArrowRight, Navigation, Bot, Globe, Send } from 'lucide-react';
import { speechEngine, speechLangCode } from '../utils/speech';
import { classifyVoiceIntent } from '../utils/voiceNavigator';
import { sound } from '../utils/audio';
import { T } from '../data/translations';

const SOURCE_LABEL = {
  'wikipedia-hi': 'Wikipedia हिन्दी', 'wikipedia-en': 'Wikipedia', 'wikipedia-ta': 'Wikipedia தமிழ்',
  'wikipedia-te': 'Wikipedia తెలుగు', 'wikipedia-kn': 'Wikipedia ಕನ್ನಡ', 'wikipedia-mr': 'Wikipedia मराठी',
  'wikipedia-gu': 'Wikipedia ગુજરાતી', 'wikipedia-bn': 'Wikipedia বাংলা', 'wikipedia-pa': 'Wikipedia ਪੰਜਾਬੀ',
  'wikipedia-ml': 'Wikipedia മലയാളം', 'wikipedia-or': 'Wikipedia ଓଡ଼ିଆ', 'wikipedia-as': 'Wikipedia অসমীয়া',
  'wikipedia-ur': 'Wikipedia اردو', 'duckduckgo': 'DuckDuckGo', 'math': '🧮', 'assistant': 'AgriPulse',
  'app': 'AgriPulse', 'offline': '', 'none': '',
};

export default function VoiceAssistant({ isOpen, onClose, selectedLang, onNavigate }) {
  const t = T[selectedLang] || T['en'];
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [thinking, setThinking] = useState(false);
  const [chat, setChat] = useState([]); // {q, a, source, nav}
  const [typed, setTyped] = useState('');
  // Latest heard text lives in a ref — the old version read the `transcript`
  // STATE inside onEnd, which was a stale closure and always acted on ''.
  const heardRef = useRef({ text: '', acted: false });
  const askCtlRef = useRef(null);
  const chatEndRef = useRef(null);

  const loc = {
    thinking: t.assistant.thinking || 'Thinking…',
    offline: t.assistant.offline || 'No internet right now — please ask again once you are back online.',
    placeholder: t.assistant.typePlaceholder || 'Ask me anything…',
  };

  const commandSamples = [
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
  const webSamples = ['भारत के राष्ट्रपति कौन है', '50 का 20% कितना', 'what is organic farming'];

  // Stop everything when the modal closes — never leave a voice running.
  useEffect(() => {
    if (!isOpen) {
      try { speechEngine.stopSpeaking(); speechEngine.stopListening(); } catch {}
      askCtlRef.current?.abort();
      setIsListening(false);
      setThinking(false);
    }
  }, [isOpen]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ block: 'nearest' }); }, [chat, thinking]);

  const pushChat = (entry) => setChat(prev => [...prev.slice(-5), entry]);

  // Ask the web (api/ask.js: Wikipedia in the farmer's language + DDG + math).
  async function askWeb(userText) {
    setThinking(true);
    askCtlRef.current?.abort();
    askCtlRef.current = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const killTimer = setTimeout(() => askCtlRef.current?.abort(), 9000);
    try {
      const res = await fetch(`/api/ask?q=${encodeURIComponent(userText)}&lang=${encodeURIComponent(selectedLang)}`,
        askCtlRef.current ? { signal: askCtlRef.current.signal } : {});
      const data = await res.json();
      if (data && data.answer) return { a: data.answer, source: data.source || 'none' };
      return { a: loc.offline, source: 'offline' };
    } catch {
      return { a: loc.offline, source: 'offline' };
    } finally {
      clearTimeout(killTimer);
      setThinking(false);
    }
  }

  const handleAsk = async (userText) => {
    sound.playClick();
    if (!userText) return;
    setTranscript(userText);

    // 1. App commands → navigate + spoken confirmation (as before).
    const intent = classifyVoiceIntent(userText, selectedLang);
    if (intent && intent.targetTab) {
      const speechText = intent.speechResponse[selectedLang] || intent.speechResponse['hi'] || intent.speechResponse['en'];
      const targetLabel = intent.tabLabel[selectedLang] || intent.tabLabel['hi'] || intent.tabLabel['en'];
      pushChat({ q: userText, a: speechText, source: 'app', nav: targetLabel });
      onNavigate(intent.targetTab);
      speechEngine.speak(speechText, speechLangCode(selectedLang));
      return;
    }

    // 2. Anything else → the web. Answer is displayed AND spoken through the
    //    3-layer voice stack (native → cloud TTS → phonetic), so it works in
    //    every language even on phones with no voices installed.
    const { a, source } = await askWeb(userText);
    pushChat({ q: userText, a, source });
    speechEngine.speak(a, speechLangCode(selectedLang));
  };

  const handleMic = () => {
    sound.playClick();
    if (isListening) {
      speechEngine.stopListening();
      setIsListening(false);
      return;
    }
    try { speechEngine.stopSpeaking(); } catch {} // don't listen to our own voice
    heardRef.current = { text: '', acted: false };
    setTranscript('');
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

  const submitTyped = (e) => {
    e.preventDefault();
    const q = typed.trim();
    if (!q || thinking) return;
    setTyped('');
    handleAsk(q);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none" onClick={onClose}>
          <div onClick={(e) => e.stopPropagation()} className="modal-max-h max-w-md w-full p-5 sm:p-6 rounded-3xl bg-[#121514] border border-emerald-500/30 text-white relative flex flex-col items-center text-center shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-y-auto overscroll-contain">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl bg-[#181c1a] text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl mb-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]">👨‍🌾</div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Bot className="w-5 h-5 text-emerald-400" /> {t.assistant.title} — 22 Languages</h3>
            <p className="text-xs text-emerald-300 font-mono flex items-center gap-1.5 flex-wrap justify-center"><Globe className="w-3 h-3" /> {t.assistant.subtitle} + <span className="text-emerald-200">{selectedLang === 'hi' ? 'हर सवाल का जवाब — विकिपीडिया से' : 'any question answered — from the web'}</span></p>

            <div className="my-5 flex flex-col items-center">
              <button onClick={handleMic} aria-label={isListening ? 'Stop listening' : 'Start listening'} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.8)] scale-105' : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-105'}`}><span className="sr-only">Mic</span>{isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8 fill-black" />}</button>
              <span className="text-xs font-mono text-zinc-400 mt-2.5">{isListening ? t.assistant.listening : t.assistant.tapToSpeak} — {selectedLang.toUpperCase()}</span>
            </div>

            {(transcript || isListening) && !thinking && (
              <div className="w-full p-3 rounded-2xl bg-[#181c1a] border border-[#232925] text-left text-xs mb-2">
                <div className="text-zinc-400 font-mono text-[10px]">{t.assistant.youAsked}</div>
                <div className="text-white font-bold italic">"{transcript || '…'}"</div>
              </div>
            )}

            {thinking && (
              <div className="w-full p-3 rounded-2xl bg-[#181c1a] border border-emerald-500/20 text-left text-xs mb-2 flex items-center gap-2 text-emerald-300 font-mono">
                <span className="flex gap-1">{[0, 1, 2].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</span>
                {loc.thinking}
              </div>
            )}

            {chat.length > 0 && (
              <div className="w-full space-y-2 mb-3">
                {chat.map((c, i) => (
                  <div key={i} className="w-full p-3 rounded-2xl bg-[#181c1a] border border-[#232925] text-left text-xs space-y-2">
                    <div className="text-zinc-400 font-mono text-[10px]">{t.assistant.youAsked} <span className="text-zinc-300 font-bold italic">"{c.q}"</span></div>
                    {c.nav && <div className="flex items-center gap-1.5 text-xs text-amber-300 font-mono bg-black/40 px-2.5 py-1 rounded-lg border border-amber-500/20"><Navigation className="w-3.5 h-3.5" /><span>{t.assistant.autoNavigated} <strong>{c.nav}</strong></span></div>}
                    <div className="pt-2 border-t border-white/5 text-emerald-300 font-light leading-relaxed">{c.a}</div>
                    {SOURCE_LABEL[c.source] && <div className="text-[9px] font-mono text-zinc-500">source: {SOURCE_LABEL[c.source]}</div>}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}

            <form onSubmit={submitTyped} className="w-full flex gap-2 mb-3">
              <input
                type="text" value={typed} onChange={(e) => setTyped(e.target.value)}
                placeholder={loc.placeholder} aria-label={loc.placeholder}
                className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#181c1a] border border-[#232925] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50"
              />
              <button type="submit" disabled={!typed.trim() || thinking} aria-label="Ask" className="px-3.5 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-black flex items-center justify-center transition-colors"><Send className="w-4 h-4" /></button>
            </form>

            <div className="w-full text-left space-y-1.5">
              <div className="text-[10px] font-black text-zinc-500 flex items-center gap-1"><Globe className="w-3 h-3" /> {selectedLang === 'hi' ? 'कुछ भी पूछें (वेब से जवाब):' : 'Ask anything (answered from the web):'}</div>
              {webSamples.map((wq, i) => (
                <button key={`w${i}`} onClick={() => handleAsk(wq)} className="w-full p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs text-emerald-200 text-left flex items-center justify-between"><span className="truncate">{wq}</span><Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" /></button>
              ))}
              <div className="text-[10px] font-black text-zinc-500 flex items-center gap-1 pt-2"><Sparkles className="w-3 h-3" /> {selectedLang === 'hi' ? 'ऐप के काम (आवाज़ से):' : 'App commands (by voice):'}</div>
              {commandSamples.map((sq, i) => (
                <button key={i} onClick={() => handleAsk(sq.text)} className="w-full p-2.5 rounded-xl bg-[#181c1a] hover:bg-[#222825] border border-[#232925] text-xs text-zinc-300 text-left flex items-center justify-between"><span className="truncate">{sq.text}</span><ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" /></button>
              ))}
            </div>
            <div className="mt-3 text-[10px] text-zinc-500">Voice → Action + spoken reply in {selectedLang.toUpperCase()}. General questions answered from Wikipedia/DuckDuckGo — free, no data charged. Kisan Call Centre: 1800-180-1551</div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
