import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, Video, MoreVertical, Check, CheckCheck, ExternalLink, Lock } from 'lucide-react';
import { sound } from '../utils/audio';

/*
 * WHATSAPP INTEGRATION SCREEN
 * A full second screen styled like a real WhatsApp chat. Any feature can
 * dispatch  window.dispatchEvent(new CustomEvent('ap:whatsapp', { detail }))
 * with { name, phone, avatar, message, replies:[{text, delay}] } and the
 * screen slides in, sends the message (tick → double tick → blue), shows
 * the contact typing, then plays their scripted replies.
 * A real wa.me deep link is offered so the demo can jump to actual WhatsApp.
 */

export function sendWhatsApp(detail) {
  window.dispatchEvent(new CustomEvent('ap:whatsapp', { detail }));
}

const nowTime = () => {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
};

export default function WhatsAppScreen() {
  const [chat, setChat] = useState(null);          // { name, phone, avatar, message, replies }
  const [outStatus, setOutStatus] = useState('sent'); // sent | delivered | read
  const [typing, setTyping] = useState(false);
  const [replies, setReplies] = useState([]);
  const timers = useRef([]);
  const scrollRef = useRef(null);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  useEffect(() => {
    const onOpen = (e) => {
      clearTimers();
      setChat(e.detail);
      setOutStatus('sent');
      setTyping(false);
      setReplies([]);
      sound.playTransition();
      // message lifecycle: ✓ sent → ✓✓ delivered → ✓✓ blue read
      later(() => setOutStatus('delivered'), 900);
      later(() => setOutStatus('read'), 2000);
      // contact types, then scripted replies arrive one by one
      const script = e.detail.replies || [];
      let t = 2600;
      script.forEach((r) => {
        later(() => setTyping(true), t);
        t += r.delay || 1600;
        later(() => {
          setTyping(false);
          setReplies((prev) => [...prev, { text: r.text, time: nowTime() }]);
          sound.playClick();
        }, t);
        t += 700;
      });
    };
    window.addEventListener('ap:whatsapp', onOpen);
    return () => { window.removeEventListener('ap:whatsapp', onOpen); clearTimers(); };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' });
  }, [replies, typing, chat]);

  const close = () => { sound.playClick(); clearTimers(); setChat(null); };

  const Tick = () =>
    outStatus === 'sent'
      ? <Check className="w-3.5 h-3.5 text-zinc-400 inline" />
      : <CheckCheck className={`w-3.5 h-3.5 inline ${outStatus === 'read' ? 'text-[#53bdeb]' : 'text-zinc-400'}`} />;

  return (
    <AnimatePresence>
      {chat && (
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[95] mx-auto max-w-md flex flex-col bg-[#0b141a]">

          {/* header */}
          <div className="flex items-center gap-2 px-2 pt-10 pb-2 bg-[#1f2c34] text-white shadow-md">
            <button onClick={close} aria-label="Back to AgriPulse" className="p-2 rounded-full active:bg-white/10"><ArrowLeft className="w-5 h-5" /></button>
            <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-lg shrink-0">{chat.avatar || '🧑‍🌾'}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-bold truncate">{chat.name}</div>
              <div className="text-[11px] text-zinc-400">{typing ? 'typing…' : 'online'}</div>
            </div>
            <Video className="w-5 h-5 text-zinc-300 mx-2" />
            <Phone className="w-5 h-5 text-zinc-300 mx-2" />
            <MoreVertical className="w-5 h-5 text-zinc-300 mx-1" />
          </div>

          {/* chat area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-2"
            style={{ background: '#0b141a', backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1.2px)', backgroundSize: '22px 22px' }}>

            <div className="mx-auto w-fit px-3 py-1 rounded-lg bg-[#1f2c34] text-[10px] text-zinc-400 font-bold">TODAY</div>
            <div className="mx-auto w-fit max-w-[85%] px-3 py-1.5 rounded-lg bg-[#182229] text-[10px] text-[#ffd279] text-center flex items-center gap-1.5">
              <Lock className="w-3 h-3 shrink-0" /> Messages are end-to-end encrypted
            </div>

            {/* outgoing message from the farmer */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
              <div className="max-w-[85%] rounded-lg rounded-tr-none bg-[#005c4b] px-3 py-2 shadow">
                <pre className="whitespace-pre-wrap font-sans text-[13px] leading-snug text-white">{chat.message}</pre>
                <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-zinc-300/80">{nowTime()} <Tick /></div>
              </div>
            </motion.div>

            {/* scripted replies */}
            {replies.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <div className="max-w-[85%] rounded-lg rounded-tl-none bg-[#1f2c34] px-3 py-2 shadow">
                  <pre className="whitespace-pre-wrap font-sans text-[13px] leading-snug text-zinc-100">{r.text}</pre>
                  <div className="mt-1 text-right text-[10px] text-zinc-500">{r.time}</div>
                </div>
              </motion.div>
            ))}

            {typing && (
              <div className="flex justify-start">
                <div className="rounded-lg rounded-tl-none bg-[#1f2c34] px-4 py-3 shadow flex gap-1">
                  {[0, 1, 2].map((d) => (
                    <motion.span key={d} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: d * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* footer actions */}
          <div className="p-3 pb-6 bg-[#1f2c34] flex gap-2">
            <a href={`https://wa.me/${chat.phone || ''}?text=${encodeURIComponent(chat.message)}`} target="_blank" rel="noreferrer"
              onClick={() => sound.playClick()}
              className="flex-1 min-h-[48px] rounded-full bg-[#00a884] text-black font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
              <ExternalLink className="w-4 h-4" /> Open in real WhatsApp
            </a>
            <button onClick={close}
              className="min-h-[48px] px-5 rounded-full border-2 border-zinc-600 text-zinc-200 font-black text-sm active:scale-[0.98]">
              Back to app
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
