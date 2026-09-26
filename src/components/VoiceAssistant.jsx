import React, { useRef, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Sparkles, ArrowRight, Navigation, Bot, Globe, Send, Infinity as InfinityIcon } from 'lucide-react';
import { speechEngine, speechLangCode } from '../utils/speech';
import { classifyVoiceIntent } from '../utils/voiceNavigator';
import { sound } from '../utils/audio';
import { T } from '../data/translations';

const SOURCE_LABEL = {
  'jarvis': '⚡ Jarvis AI', 'wikipedia-hi': 'Wikipedia हिन्दी', 'wikipedia-en': 'Wikipedia',
  'wikipedia-ta': 'Wikipedia தமிழ்', 'wikipedia-te': 'Wikipedia తెలుగు', 'wikipedia-kn': 'Wikipedia ಕನ್ನಡ',
  'wikipedia-mr': 'Wikipedia मराठी', 'wikipedia-gu': 'Wikipedia ગુજરાતી', 'wikipedia-bn': 'Wikipedia বাংলা',
  'wikipedia-pa': 'Wikipedia ਪੰਜਾਬੀ', 'wikipedia-ml': 'Wikipedia മലയാളം', 'wikipedia-or': 'Wikipedia ଓଡ଼ିଆ',
  'wikipedia-as': 'Wikipedia অসমীয়া', 'wikipedia-ur': 'Wikipedia اردو', 'duckduckgo': 'DuckDuckGo',
  'math': '🧮', 'assistant': 'AgriPulse', 'app': 'AgriPulse', 'offline': '', 'none': '',
};

// Saying these to the assistant closes it (the modal — NOT the mic session,
// which self-heals; and never from a stray single word mid-guide).
const STOP_WORDS = /^(band karo|band kar|band kro|बंद करो|बंद कर|stop speaking|stop listening|stop|close|chup karo|chup|ruko|rukja|रुको|रुक जाओ|alvida|अलविदा)[\s!.?]*$/i;

const GREETING = {
  hi: 'नमस्ते जी! मैं आपका आवाज़ सहायक हूँ — बोलिए, सुन रहा हूँ।',
  en: 'Hello! I am your voice assistant — go ahead, I am listening.',
};

// After every command the assistant announces it will hold the mic for
// 35 seconds and reply to whatever is said inside that window.
const WAIT_MSG = {
  hi: 'मैं पैंतीस सेकंड अगले आदेश के लिए रुकूँगा।',
  en: 'I will wait 35 seconds for your next command.',
};
const WAIT_MS = 35000;

// ── voice language switching: "talk in tamil" / "தமிழில் பேசு" / "tamil bhasha" ──
// Only languages the voice stack can actually speak (speechLangCode map).
const LANG_ALIASES = [
  ['hi', ['hindi', 'hindhi', 'हिंदी', 'हिन्दी']],
  ['en', ['english', 'angrezi', 'अंग्रेज़ी', 'अंग्रेजी', 'inglish']],
  ['ta', ['tamil', 'tamizh', 'तमिल', 'तमिळ', 'தமிழ்']],
  ['te', ['telugu', 'तेलुगू', 'तेलुगु', 'తెలుగు']],
  ['kn', ['kannada', 'kannda', 'कन्नड़', 'कन्नड', 'ಕನ್ನಡ']],
  ['ml', ['malayalam', 'malyalam', 'മലയാളം', 'मलयालम']],
  ['mr', ['marathi', 'marati', 'मराठी']],
  ['pa', ['punjabi', 'panjabi', 'पंजाबी', 'ਪੰਜਾਬੀ']],
  ['gu', ['gujarati', 'gujrati', 'गुजराती', 'ગુજરાતી']],
  ['bn', ['bengali', 'bangla', 'bangali', 'बांग्ला', 'बंगाली', 'বাংলা']],
  ['or', ['odia', 'oriya', 'ओड़िया', 'ଓଡ଼ିଆ']],
  ['as', ['assamese', 'axomiya', 'असमिया', 'অসমীয়া']],
  ['ur', ['urdu', 'उर्दू', 'اردو']],
];
const SWITCH_VERB = /(talk|speak|switch|change|reply|respond|bhasha|bolo|bolna|भाषा|बोलो|बोलिए|बात|మాట్లాడు|பேசு|ಮಾತನಾಡು|സംസാരി|പറയൂ|ਬੋਲੋ|ਗੱਲ|બોલો|વાત|বলুন|কথা|କୁହନ୍ତୁ|कওक)/i;
const POLITE = /^(please|kripya|जी|ji|bolo|bhasha|me|in|ல்|மொழி|లో|భాష|ಲ್ಲಿ|ಭಾಷೆ|ഭാഷ|भाषा|বোলী)$/i;

const isLatin = (s) => /[a-z]/i.test(s);

function detectLangSwitch(text) {
  const raw = String(text || '');
  const t = ` ${raw.toLowerCase().trim()} `;
  if (/nadu|ਨਾਡੂ|నాడు|नाडू/i.test(raw)) return null; // "tamil nadu mandi…" is a place, not a switch
  for (const [code, names] of LANG_ALIASES) {
    for (const n of names) {
      // Latin names need word boundaries; Indic scripts agglutinate suffixes
      // (à®¤à®®à®¿à®´à¯ + à®à®²à¯), so there we match the START of a word.
      // Indic suffixes join at the stem: à®¤à®®à®¿à®´à¯ + à®à®²à¯ = à®¤à®®à®¿à®´à®¿à®²à¯,
      // à´®à´²à´¯à´¾à´³à´ + à´¤àµà´¤à´¿àµ½ = à´®à´²à´¯à´¾à´³à´¤àµà´¤à´¿àµ½ â so also
      // match the alias with its final joining mark removed.
      const stem = n.replace(/[\u0902\u094D\u09CD\u0A02\u0A4D\u0ACD\u0B4D\u0BCD\u0C02\u0C4D\u0D02\u0D4D]/u, '');
      const hit = isLatin(n)
        ? (t.includes(` ${n} `) || t.includes(` ${n}?`) || t.includes(` ${n}.`))
        : (t.includes(` ${n}`) || (stem !== n && t.includes(` ${stem}`)));
      if (!hit) continue;
      // explicit command form: verb + language name
      if (SWITCH_VERB.test(text)) return code;
      // or the utterance is essentially JUST the language name ("tamil?", "tamil bhasha")
      const words = t.trim().split(/[\s?.]+/).filter(Boolean);
      const rest = words.filter(w => w !== n && !POLITE.test(w));
      if (words.length <= 3 && rest.length === 0) return code;
    }
  }
  return null;
}

const SWITCH_OK = {
  hi: 'ठीक है, अब मैं हिंदी में बात करूँगा।',
  en: 'Okay, I will speak English now.',
  ta: 'சரி, இப்போது தமிழில் பேசுவேன்.',
  te: 'సరే, ఇప్పుడు తెలుగులో మాట్లాడుతాను.',
  kn: 'ಸರಿ, ಈಗ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡುತ್ತೇನೆ.',
  ml: 'ശരി, ഇപ്പോൾ മലയാളത്തിൽ സംസാരിക്കും.',
  mr: 'ठीक आहे, आता मी मराठीत बोलेन.',
  pa: 'ਠੀਕ ਹੈ, ਹੁਣ ਮੈਂ ਪੰਜਾਬੀ ਵਿੱਚ ਗੱਲ ਕਰਾਂਗਾ।',
  gu: 'ઠીક છે, હવે હું ગુજરાતીમાં વાત કરીશ.',
  bn: 'ঠিক আছে, এখন আমি বাংলায় কথা বলব।',
  or: 'ଠିକ୍ ଅଛି, ବର୍ତ୍ତମାନ ମୁଁ ଓଡ଼ିଆରେ କଥା ହେବି।',
  as: 'ঠিক আছে, এতিয়া মই অসমীয়াত কথা পাতিম।',
  ur: 'ٹھیک ہے، اب میں اردو میں بات کروں گا۔',
};

export default function VoiceAssistant({ isOpen, onClose, selectedLang, setSelectedLang, onNavigate }) {
  const t = T[selectedLang] || T['en'];
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [thinking, setThinking] = useState(false);
  const [chat, setChat] = useState([]); // {q, a, source, nav}
  const [typed, setTyped] = useState('');
  const [autoListen, setAutoListen] = useState(true);

  // Latest heard text lives in a ref — the old version read the `transcript`
  // STATE inside onEnd, which was a stale closure and always acted on ''.
  const heardRef = useRef({ text: '', acted: false });
  const askCtlRef = useRef(null);
  const chatEndRef = useRef(null);
  // Conversation loop state in refs — the speak→listen chain runs through
  // async callbacks where state would be stale.
  const autoListenRef = useRef(true);
  const openRef = useRef(isOpen);
  const manualStopRef = useRef(false);
  const langRef = useRef(selectedLang); // spoken lang can change mid-conversation
  const lastExchangeRef = useRef(null); // {q, a} — one-turn memory for follow-ups
  const waitTimerRef = useRef(null); // 35s listening window after each reply
  const greetedRef = useRef(false);

  const loc = {
    thinking: t.assistant.thinking || 'Thinking…',
    speaking: t.assistant.speaking || 'Speaking…',
    offline: t.assistant.offline || 'No internet right now — please ask again once you are back online.',
    placeholder: t.assistant.typePlaceholder || 'Ask me anything…',
    autoListen: t.assistant.autoListen || 'Auto-listen',
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
  const webSamples = ['टमाटर की पत्तियाँ पीली क्यों हो जाती हैं', 'भारत के राष्ट्रपति कौन है', '50 का 20% कितना'];

  useEffect(() => { openRef.current = isOpen; }, [isOpen]);
  useEffect(() => { autoListenRef.current = autoListen; }, [autoListen]);
  useEffect(() => { langRef.current = selectedLang; }, [selectedLang]);

  // Stop everything when the modal closes — never leave a voice running.
  useEffect(() => {
    if (!isOpen) {
      manualStopRef.current = true;
      clearWaitTimer();
      try { speechEngine.stopSpeaking(); speechEngine.stopListening(); } catch {}
      askCtlRef.current?.abort();
      setIsListening(false);
      setIsSpeaking(false);
      setThinking(false);
    } else {
      manualStopRef.current = false;
      // Jarvis greets you, then starts listening — once per open.
      if (!greetedRef.current) {
        greetedRef.current = true;
        const g = setTimeout(() => {
          if (!openRef.current) return;
          say(GREETING[langRef.current] || GREETING.en);
        }, 350);
        return () => clearTimeout(g);
      }
    }
    return undefined;
  }, [isOpen, selectedLang]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ block: 'nearest' }); }, [chat, thinking]);

  // Reset the once-per-open greeting flag after the modal fully closes.
  useEffect(() => {
    if (!isOpen) {
      const r = setTimeout(() => { greetedRef.current = false; }, 500);
      return () => clearTimeout(r);
    }
    return undefined;
  }, [isOpen]);

  const pushChat = (entry) => setChat(prev => [...prev.slice(-5), entry]);

  const clearWaitTimer = () => { if (waitTimerRef.current) { clearTimeout(waitTimerRef.current); waitTimerRef.current = null; } };

  // Speak + optional chain: when the voice finishes, the conversation loop
  // continues automatically (Jarvis-style) unless the user stopped it.
  const say = (text, { then } = {}) => {
    try { speechEngine.stopSpeaking(); } catch {}
    setIsSpeaking(true);
    speechEngine.speak(text, speechLangCode(langRef.current), () => {
      setIsSpeaking(false);
      if (then) return then();
      if (autoListenRef.current && openRef.current && !manualStopRef.current) startListeningFlow();
    });
  };

  // Ask the web (api/ask.js: Jarvis AI → Wikipedia in the farmer's language
  // → DuckDuckGo → math; remembers the last exchange for follow-ups).
  async function askWeb(userText) {
    setThinking(true);
    askCtlRef.current?.abort();
    askCtlRef.current = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const killTimer = setTimeout(() => askCtlRef.current?.abort(), 14000);
    try {
      const ctx = lastExchangeRef.current
        ? `&ctx=${encodeURIComponent(JSON.stringify(lastExchangeRef.current))}` : '';
      const res = await fetch(`/api/ask?q=${encodeURIComponent(userText)}&lang=${encodeURIComponent(selectedLang)}${ctx}`,
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

  // Answer → announce the 35s wait → listen for the next command.
  const reply = (answerText) => {
    if (autoListenRef.current) {
      say(answerText, { then: () => say(WAIT_MSG[langRef.current] || WAIT_MSG.en, { then: () => startListeningFlow() }) });
    } else {
      say(answerText);
    }
  };

  const handleAsk = async (userText) => {
    sound.playClick();
    if (!userText) return;
    setTranscript(userText);

    // 0. "talk in tamil" / "tamil bhasha" / "தமிழில் பேசு" → switch language NOW.
    const switchTo = detectLangSwitch(userText);
    if (switchTo && switchTo !== langRef.current) {
      langRef.current = switchTo;                    // speak + listen in the new tongue immediately
      try { setSelectedLang(switchTo); } catch (e) {} // app UI + ap_lang persistence
      try { localStorage.setItem('ap_guide_lang_pref', switchTo); } catch (e) {} // guide stays in sync
      const ok = SWITCH_OK[switchTo] || SWITCH_OK.en;
      pushChat({ q: userText, a: ok, source: 'app' });
      lastExchangeRef.current = { q: userText, a: ok };
      reply(ok);
      return;
    }

    // 1. App commands → navigate + spoken confirmation (as before).
    const intent = classifyVoiceIntent(userText, selectedLang);
    if (intent && intent.targetTab) {
      const speechText = intent.speechResponse[selectedLang] || intent.speechResponse['hi'] || intent.speechResponse['en'];
      const targetLabel = intent.tabLabel[selectedLang] || intent.tabLabel['hi'] || intent.tabLabel['en'];
      pushChat({ q: userText, a: speechText, source: 'app', nav: targetLabel });
      lastExchangeRef.current = { q: userText, a: String(speechText).slice(0, 400) };
      onNavigate(intent.targetTab);
      reply(speechText);
      return;
    }

    // 2. Anything else → the web. Answer is displayed AND spoken through the
    //    3-layer voice stack (native → cloud TTS → phonetic), so it works in
    //    every language even on phones with no voices installed.
    const { a, source } = await askWeb(userText);
    pushChat({ q: userText, a, source });
    lastExchangeRef.current = { q: userText, a: String(a).slice(0, 400) };
    reply(a);
  };

  const onFinalHeard = (text) => {
    clearWaitTimer();
    const heard = String(text || '').trim();
    setIsListening(false);
    if (!heard) return; // silence → the loop rests until the next tap
    if (STOP_WORDS.test(heard)) {
      try { speechEngine.stopSpeaking(); } catch {}
      sound.playClick();
      onClose();
      return;
    }
    handleAsk(heard);
  };

  const startListeningFlow = () => {
    if (!openRef.current || manualStopRef.current) return;
    try { speechEngine.stopSpeaking(); } catch {} // don't listen to our own voice
    heardRef.current = { text: '', acted: false };
    setTranscript('');
    setIsListening(true);
    clearWaitTimer();
    waitTimerRef.current = setTimeout(() => {
      waitTimerRef.current = null;
      try { speechEngine.stopListening(); } catch {}
      setIsListening(false);
      setTranscript('');
    }, WAIT_MS);
    speechEngine.startListening(
      speechLangCode(langRef.current),
      (text, meta = {}) => {
        // Live interim text streams into the UI; we only ACT on final results.
        setTranscript(text);
        heardRef.current.text = text;
        if (meta.final && text.trim() && !heardRef.current.acted) {
          heardRef.current.acted = true;
          speechEngine.stopListening();
          onFinalHeard(text);
        }
      },
      () => {
        // Recognizer ended (silence/timeout) — act on whatever was heard.
        const heard = heardRef.current.text.trim();
        if (heard && !heardRef.current.acted) {
          heardRef.current.acted = true;
          onFinalHeard(heard);
        } else {
          clearWaitTimer();
          setIsListening(false);
        }
      },
      () => {
        const heard = heardRef.current.text.trim();
        if (heard && !heardRef.current.acted) {
          heardRef.current.acted = true;
          onFinalHeard(heard);
        } else {
          clearWaitTimer();
          setIsListening(false);
        }
      }
    );
  };

  const handleMic = () => {
    sound.playClick();
    if (isListening) {
      manualStopRef.current = true;
      clearWaitTimer();
      speechEngine.stopListening();
      setIsListening(false);
      return;
    }
    if (isSpeaking) {
      manualStopRef.current = true;
      try { speechEngine.stopSpeaking(); } catch {}
      setIsSpeaking(false);
      return;
    }
    manualStopRef.current = false;
    startListeningFlow();
  };

  const submitTyped = (e) => {
    e.preventDefault();
    const q = typed.trim();
    if (!q || thinking) return;
    setTyped('');
    handleAsk(q);
  };

  const statusLine = isSpeaking ? loc.speaking : isListening ? t.assistant.listening : thinking ? loc.thinking : t.assistant.tapToSpeak;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none" onClick={onClose}>
          <div onClick={(e) => e.stopPropagation()} className="modal-max-h max-w-md w-full p-5 sm:p-6 rounded-3xl bg-[#121514] border border-emerald-500/30 text-white relative flex flex-col items-center text-center shadow-[0_0_50px_rgba(16,185,129,0.2)] overflow-y-auto overscroll-contain">
            <button onClick={onClose} aria-label="Close assistant" title="Close assistant" className="absolute top-4 right-4 p-2 rounded-xl bg-[#181c1a] text-zinc-400 hover:text-white"><X className="w-5 h-5" /></button>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl mb-2 shadow-[0_0_20px_rgba(16,185,129,0.4)]">👨‍🌾</div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Bot className="w-5 h-5 text-emerald-400" /> {t.assistant.title} — 22 Languages</h3>
            <p className="text-xs text-emerald-300 font-mono flex items-center gap-1.5 flex-wrap justify-center"><Globe className="w-3 h-3" /> {t.assistant.subtitle} + <span className="text-emerald-200">{selectedLang === 'hi' ? 'हर सवाल का जवाब — AI से' : 'any question answered — by AI'}</span></p>

            <div className="my-5 flex flex-col items-center gap-2">
              <button onClick={handleMic} aria-label={isListening ? 'Stop listening' : 'Start listening'} className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isListening ? 'bg-red-500 text-white animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.8)] scale-105' : isSpeaking ? 'bg-emerald-400 text-black animate-pulse shadow-[0_0_30px_rgba(16,185,129,0.8)]' : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-105'}`}><span className="sr-only">Mic</span>{isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8 fill-black" />}</button>
              <span className="text-xs font-mono text-zinc-400">{statusLine} — {selectedLang.toUpperCase()}</span>
              <button onClick={() => { sound.playClick(); setAutoListen(v => !v); }} aria-pressed={autoListen} title={loc.autoListen}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border transition-colors ${autoListen ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-[#181c1a] border-[#232925] text-zinc-500'}`}>
                <InfinityIcon className="w-3 h-3" />{loc.autoListen}: {autoListen ? 'ON' : 'OFF'}
              </button>
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
              <div className="text-[10px] font-black text-zinc-500 flex items-center gap-1"><Globe className="w-3 h-3" /> {selectedLang === 'hi' ? 'कुछ भी पूछें (AI से जवाब):' : 'Ask anything (answered by AI):'}</div>
              {webSamples.map((wq, i) => (
                <button key={`w${i}`} onClick={() => handleAsk(wq)} className="w-full p-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs text-emerald-200 text-left flex items-center justify-between"><span className="truncate">{wq}</span><Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" /></button>
              ))}
              <div className="text-[10px] font-black text-zinc-500 flex items-center gap-1 pt-2"><Sparkles className="w-3 h-3" /> {selectedLang === 'hi' ? 'ऐप के काम (आवाज़ से):' : 'App commands (by voice):'}</div>
              {commandSamples.map((sq, i) => (
                <button key={i} onClick={() => handleAsk(sq.text)} className="w-full p-2.5 rounded-xl bg-[#181c1a] hover:bg-[#222825] border border-[#232925] text-xs text-zinc-300 text-left flex items-center justify-between"><span className="truncate">{sq.text}</span><ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" /></button>
              ))}
            </div>
            <div className="mt-3 text-[10px] text-zinc-500">Just talk — it listens, answers, and listens again. Say "{selectedLang === 'hi' ? 'बंद करो' : 'stop'}" to close. Kisan Call Centre: 1800-180-1551</div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
