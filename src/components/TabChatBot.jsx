import React, { useState, useEffect, useRef } from 'react';
import { Bot, Mic, Send, Phone, MapPin, Building2, Sparkles, Volume2, MessageSquare, Search } from 'lucide-react';
import { sound } from '../utils/audio';
import { speechEngine } from '../utils/speech';
import { getChatbotAnswer, getNearestCSC, CSC_CENTERS } from '../utils/chatbotData';
import { detectUserState } from '../utils/dataService';
import { getSession } from '../utils/authService';

export default function TabChatBot({ selectedLang, isSunlightMode }) {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('ap_chat_history_v1');
      return saved ? JSON.parse(saved) : [{ from: 'bot', text: 'नमस्ते! मैं आपका किसान सहायक हूं। मंडी भाव, रोग, दवा, मौसम, सब्सिडी, बीज/ट्रैक्टर बाजार, मजदूर, डीजल बचत, मिट्टी, CSC केंद्र — किसी भी भाषा में पूछें! 🎙️ वॉइस बटन दबाएं।', time: Date.now() }];
    } catch {
      return [{ from: 'bot', text: 'नमस्ते! मैं आपका किसान सहायक हूं। किसी भी भाषा में पूछें!', time: Date.now() }];
    }
  });
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userState, setUserState] = useState(() => { try { return getSession()?.state || 'Karnataka'; } catch { return 'Karnataka'; } });
  const [showCSC, setShowCSC] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('ap_chat_history_v1', JSON.stringify(messages.slice(-50))); } catch {}
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const autoDetect = async () => {
      try { const info = await detectUserState(); if (info?.state) setUserState(info.state); } catch {}
    };
    autoDetect();
  }, []);

  const handleSend = (text = input) => {
    if (!text.trim()) return;
    sound.playClick();
    const userMsg = { from: 'user', text: text.trim(), time: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Detect intent for auto-navigation hint and answer
    const answer = getChatbotAnswer(text, selectedLang);
    setTimeout(() => {
      const botMsg = { from: 'bot', text: answer, time: Date.now(), query: text };
      setMessages(prev => [...prev, botMsg]);
      sound.playSuccess();
      // Auto TTS in selected language
      try {
        const langMap = { hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', mr: 'mr-IN', gu: 'gu-IN', bn: 'bn-IN', pa: 'pa-IN', en: 'en-IN' };
        const code = langMap[selectedLang] || 'hi-IN';
        speechEngine.speak(answer, code, ()=>setIsSpeaking(false));
        setIsSpeaking(true);
      } catch {}
    }, 600);
  };

  const handleVoice = () => {
    if (isListening) { speechEngine.stopListening(); setIsListening(false); return; }
    const langMap = { hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', mr: 'mr-IN', gu: 'gu-IN', bn: 'bn-IN', pa: 'pa-IN', en: 'en-IN' };
    const code = langMap[selectedLang] || 'hi-IN';
    setIsListening(true);
    sound.playClick();
    speechEngine.startListening(code, (transcript)=>{
      setInput(transcript);
    }, ()=>{
      setIsListening(false);
      if (input || transcript) {
        // Auto-send after voice ends if transcript exists
        // We need to capture transcript from closure
      }
    }, ()=>setIsListening(false));
  };

  // When voice stops and input has text, auto-send
  useEffect(() => {
    if (!isListening && input && input.length > 3) {
      const timer = setTimeout(() => {
        if (input.trim().length > 2) handleSend(input);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isListening]);

  const cscList = getNearestCSC(userState);

  const quickQuestions = [
    'मंडी भाव बताओ', 'Tomato disease?', 'Weather today?', 'PM-Kisan subsidy?', 'Tractor sell', 'Need labour', 'Diesel saving tips?', 'Soil health?', 'Nearest CSC?', 'Community help'
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-3">
      <div className={`p-3 rounded-2xl border flex items-center justify-between ${isSunlightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center">🤖</span>
          <span className="font-black text-sm">AI Chat</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold border flex items-center gap-1"><MapPin className="w-3 h-3" /> {userState}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={()=>{ sound.playClick(); setShowCSC(!showCSC); }} className="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center"><Building2 className="w-4 h-4" /></button>
          <button onClick={()=>{ sound.playClick(); if (isSpeaking) { speechEngine.stopSpeaking(); setIsSpeaking(false); } }} className={`w-8 h-8 rounded-full flex items-center justify-center ${isSpeaking ? 'bg-red-500 text-white animate-pulse' : 'bg-zinc-800 text-white'}`}><Volume2 className="w-4 h-4" /></button>
        </div>
      </div>

      {showCSC && (
        <div className={`p-4 rounded-2xl border ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
          <h4 className="font-black text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-amber-500" /> Nearest Computer / CSC Centers — for farmers needing help</h4>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            {cscList.map((csc,i)=>(
              <div key={i} className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800 border-zinc-700 text-white'}`}>
                <div className="font-bold text-xs">{csc.name}</div>
                <div className="text-[11px] text-zinc-500 mt-1">{csc.address}</div>
                <div className="text-[11px] mt-1">{csc.services}</div>
                <button onClick={()=>window.open(`tel:${csc.phone}`, '_self')} className="mt-2 w-full py-1.5 rounded-lg bg-emerald-500 text-black font-black text-[11px] flex items-center justify-center gap-1"><Phone className="w-3 h-3" /> {csc.phone}</button>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-zinc-500">Toll-free CSC: 1800 3000 3468 • Kisan Call Center: 1800-180-1551 (24x7, all languages) • Visit with Aadhaar for PM-Kisan, soil card, insurance.</div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {quickQuestions.map((q,i)=>(
          <button key={i} onClick={()=>handleSend(q)} className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${isSunlightMode ? 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100' : 'bg-zinc-800 border-zinc-700 text-zinc-200 hover:bg-zinc-700'}`}>{q}</button>
        ))}
      </div>

      <div className={`rounded-2xl border-2 flex flex-col ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-[#121514] border-[#1f2421]'} h-[460px]`}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, idx)=>(
            <div key={idx} className={`flex ${msg.from==='user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${msg.from==='user' ? 'bg-emerald-500 text-black font-bold rounded-br-sm' : isSunlightMode ? 'bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-bl-sm' : 'bg-zinc-800 text-white border border-zinc-700 rounded-bl-sm'}`}>
                <div>{msg.text}</div>
                <div className="text-[9px] opacity-60 mt-1">{new Date(msg.time).toLocaleTimeString()}</div>
                {msg.from==='bot' && msg.query && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.query.toLowerCase().includes('mandi') && <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-600 text-[9px] font-black">Go to Mandi tab → auto state</span>}
                    {msg.query.toLowerCase().includes('tractor') && <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 text-[9px] font-black">Check Marketplace → tractor</span>}
                    {msg.query.toLowerCase().includes('labour') && <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600 text-[9px] font-black">Post in Jobs tab</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className={`p-3 border-t-2 flex items-center gap-2 ${isSunlightMode ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800 bg-zinc-900'}`}>
          <div className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-xl border-2 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-800 border-zinc-700'}`}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter' && handleSend()} placeholder="Type in your mother tongue or tap mic..." className={`flex-1 bg-transparent outline-none text-xs font-bold ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`} />
            <button onClick={handleVoice} className={`p-2 rounded-full ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-black'}`}><Mic className="w-4 h-4" /></button>
          </div>
          <button onClick={()=>handleSend()} className="p-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white"><Send className="w-5 h-5" /></button>
          <button onClick={()=>{ sound.playClick(); window.open('tel:18001801551', '_self'); }} className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black"><Phone className="w-5 h-5" /></button>
        </div>
      </div>

      {/* help text hidden in simple UI - accessible via CSC button */}
      
    </div>
  );
}
