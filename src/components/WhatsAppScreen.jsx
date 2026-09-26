import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, Video, MoreVertical, Check, CheckCheck, ExternalLink, Lock, Search, Camera, Users, ArrowUpRight } from 'lucide-react';
import { sound } from '../utils/audio';

/*
 * WHATSAPP HUB — the app's information backbone.
 *
 * Two surfaces:
 *  1. INBOX: WhatsApp-style chat list with community groups that push live
 *     alerts — truck-pool requests, fraud warnings from nearby farmers,
 *     direct-market deals, live mandi prices. Every incoming message carries
 *     an embedded deep-link button that jumps straight into the right
 *     feature tab ("Join truck pool" → pool, "Audit my patti" → patti…).
 *  2. THREADS: outgoing shares from any feature (sendWhatsApp) open a
 *     direct chat — message sends (✓ → ✓✓ → blue), contact types, replies.
 *
 * Events:
 *   window 'ap:whatsapp'        → open a direct chat with an outgoing message
 *   window 'ap:whatsapp-open'   → open the inbox
 *   window 'ap:wa-unread'       → broadcast {count} for launcher badges
 */

export function sendWhatsApp(detail) {
  window.dispatchEvent(new CustomEvent('ap:whatsapp', { detail }));
}
export function openWhatsAppHub() {
  window.dispatchEvent(new CustomEvent('ap:whatsapp-open'));
}

const nowTime = () => {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
};

/* Community groups + their scripted live alerts (delay in ms from mount). */
const GROUPS = [
  {
    id: 'pool', name: 'Truck Pool — 5 km Radius', avatar: '🚚', group: true, members: '82 farmers',
    seed: { from: 'AgriPulse Bot', text: 'Is group mein 5 km ke andar ke farmers apne load pool karte hain. Ek truck, sabka bhaada split. 🚛' },
    script: [
      { delay: 6000, from: 'Suresh • Wadgaon', text: '350 kg tamatar hai, kal subah Pune mandi jaana hai. Koi pool bana raha hai? Akela truck ₹1,400 padega 😩', action: { label: 'Join truck pool', tab: 'pool' } },
      { delay: 24000, from: 'Prakash • Chakan', text: 'Mere paas 400 kg hai. Tata Ace ₹1,800 mein book — weight ke hisaab se split karenge. 2 jagah aur bachi hai!', action: { label: 'Join truck pool', tab: 'pool' } },
      { delay: 55000, from: 'Meena tai • Khed', text: 'Main 280 kg ke saath in. Ab 1,030 kg ho gaya — 470 kg aur chahiye truck full hone ke liye. Jaldi karo! ⏳', action: { label: 'Fill the truck', tab: 'pool' } },
    ],
  },
  {
    id: 'fraud', name: 'Fraud Alerts — Khed Taluka', avatar: '🚨', group: true, members: '214 farmers',
    seed: { from: 'AgriPulse Bot', text: 'Yahan aas-paas ke farmers pakde gaye frauds report karte hain — taaki agla shikaar aap na bano. 🛡️' },
    script: [
      { delay: 9000, from: 'Ramesh • Rajgurunagar', text: '⚠️ FRAUD PAKDA: Balaji Traders ne meri patti par 6.2% commission kata — legal max 3% hai. Patti audit se ₹1,240 wapas mile! Apni patti zaroor scan karo.', action: { label: 'Audit my patti', tab: 'patti' } },
      { delay: 32000, from: 'AgriPulse Alerts', text: '⚠️ KANTA ALERT: Shivaji Mandi gate #3 ka kanta 4% kam tol raha hai — 3 farmers ne aaj report kiya. Tol se pehle photo-lock karna mat bhoolna.', action: { label: 'Lock my weight', tab: 'weigh' } },
      { delay: 62000, from: 'Savita tai • Khed', text: 'Kal mera 20% "quality cut" laga diya bina dekhe. Aaj Grade certificate ke saath gayi — full rate mila. Certificate zaroor banao! ✊', action: { label: 'Get grade certificate', tab: 'grade' } },
    ],
  },
  {
    id: 'deals', name: 'Direct Market Deals', avatar: '🛒', group: true, members: '156 buyers & farmers',
    seed: { from: 'AgriPulse Bot', text: 'Shehar ke buyers yahan seedha order dalte hain — bina bichauliye. Pehle aao, pehle pao. 🏙️' },
    script: [
      { delay: 13000, from: 'Green Heights Society', text: '🏢 CHAHIYE: 40 kg tamatar @ ₹20/kg — middleman sirf ₹8 deta hai! 120 flats ka weekly order. Kal subah delivery.', action: { label: 'Sell direct now', tab: 'market' } },
      { delay: 40000, from: 'Hotel Annapurna', text: '🍽️ DAILY CONTRACT: 25 kg pyaz @ ₹26/kg, seedha farmer se. Pura mahina fixed. Interested ho to list karo.', action: { label: 'Accept this order', tab: 'market' } },
      { delay: 70000, from: 'Sharma Kirana Store', text: '🏪 30 kg aloo chahiye har hafte @ ₹19/kg. UPI on delivery, koi commission nahi.', action: { label: 'List my potatoes', tab: 'market' } },
    ],
  },
  {
    id: 'mandi', name: 'Mandi Bhav Live', avatar: '📈', group: true, members: 'Official channel',
    seed: { from: 'AgriPulse Bot', text: 'Roz ke live mandi bhav aur deals — seedha aapke WhatsApp par. 📊' },
    script: [
      { delay: 17000, from: 'AgriPulse Alerts', text: '📈 PUNE: Tamatar ₹2,400/q — aaj 6% upar! Transport nikaal ke bhi margin strong hai. Bechne ka accha din.', action: { label: 'Calculate my profit', tab: 'profit' } },
      { delay: 48000, from: 'AgriPulse Alerts', text: '🧪 DEAL: Generic Carbendazim+Mancozeb ₹280 (branded "Saaf" ₹520 — 46% saving). Kisan Agro Centre, 2.1 km. Stock limited.', action: { label: 'Verify this price', tab: 'exposer' } },
      { delay: 80000, from: 'AgriPulse Alerts', text: '🔨 AUCTION KHULI: Shirur FPO ka 100L glyphosate pool — 5 dealers bid kar rahe hain. Apna order jodne ka last chance.', action: { label: 'Join the auction', tab: 'auction' } },
    ],
  },
];

export default function WhatsAppScreen() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState('list');            // 'list' | chatId
  const [chats, setChats] = useState(() => {
    const init = {};
    GROUPS.forEach((g) => {
      init[g.id] = {
        ...g,
        messages: [{ from: g.seed.from, text: g.seed.text, time: 'Yesterday' }],
        unread: 0, lastTs: 0,
      };
    });
    return init;
  });
  const [typingChat, setTypingChat] = useState(null);
  const [toast, setToast] = useState(null);           // banner for messages arriving while hub is closed
  // Side-by-side mode: PhoneFrame renders a dedicated WhatsApp phone with a
  // #ap-wa-screen mount point — the hub portals onto that second device.
  const [sideEl, setSideEl] = useState(null);
  const toastTimer = useRef(null);
  const timers = useRef([]);
  const openRef = useRef({ open: false, view: 'list' });
  const scrollRef = useRef(null);
  const side = Boolean(sideEl);

  useEffect(() => { openRef.current = { open: open || side, view }; }, [open, view, side]);

  useEffect(() => {
    const check = () => setSideEl(document.getElementById('ap-wa-screen') || null);
    check();
    window.addEventListener('ap:wa-side', check);
    window.addEventListener('resize', check);
    return () => {
      window.removeEventListener('ap:wa-side', check);
      window.removeEventListener('resize', check);
    };
  }, []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const pushMessage = (chatId, msg, { silent } = {}) => {
    setChats((prev) => {
      const c = prev[chatId];
      if (!c) return prev;
      const isViewing = openRef.current.open && openRef.current.view === chatId;
      return {
        ...prev,
        [chatId]: {
          ...c,
          messages: [...c.messages, msg],
          unread: isViewing || msg.out ? 0 : c.unread + 1,
          lastTs: Date.now(),
        },
      };
    });
    if (!silent && !msg.out) {
      sound.playClick();
      // WhatsApp-style banner when the hub isn't open on this chat
      if (!openRef.current.open || openRef.current.view !== chatId) {
        const g = GROUPS.find((x) => x.id === chatId);
        setToast({ chatId, avatar: g?.avatar || '💬', name: g?.name || msg.from, from: msg.from, text: msg.text });
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 4500);
      }
    }
  };

  /* live community alerts */
  useEffect(() => {
    GROUPS.forEach((g) => {
      g.script.forEach((m) => {
        later(() => pushMessage(g.id, { from: m.from, text: m.text, time: nowTime(), action: m.action }), m.delay);
      });
    });
    return () => timers.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* unread badge broadcast */
  const totalUnread = Object.values(chats).reduce((s, c) => s + c.unread, 0);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ap:wa-unread', { detail: { count: totalUnread } }));
  }, [totalUnread]);

  /* open inbox / open a direct share chat */
  useEffect(() => {
    const onOpenHub = () => { sound.playTransition(); setOpen(true); setView('list'); };
    const onShare = (e) => {
      const d = e.detail;
      const id = 'direct-' + d.name.replace(/\W+/g, '-').toLowerCase();
      const outMsg = { out: true, text: d.message, time: nowTime(), status: 'sent' };
      setChats((prev) => ({
        ...prev,
        [id]: {
          id, name: d.name, avatar: d.avatar || '🧑‍🌾', phone: d.phone, direct: true,
          messages: [...(prev[id]?.messages || []), outMsg],
          unread: 0, lastTs: Date.now(),
        },
      }));
      sound.playTransition();
      setOpen(true); setView(id);
      const setStatus = (status) => setChats((prev) => {
        const c = prev[id]; if (!c) return prev;
        const msgs = c.messages.map((m) => (m.out ? { ...m, status } : m));
        return { ...prev, [id]: { ...c, messages: msgs } };
      });
      later(() => setStatus('delivered'), 900);
      later(() => setStatus('read'), 2000);
      let t = 2600;
      (d.replies || []).forEach((r) => {
        later(() => setTypingChat(id), t);
        t += r.delay || 1600;
        later(() => { setTypingChat(null); pushMessage(id, { from: d.name, text: r.text, time: nowTime() }); }, t);
        t += 700;
      });
    };
    window.addEventListener('ap:whatsapp-open', onOpenHub);
    window.addEventListener('ap:whatsapp', onShare);
    return () => {
      window.removeEventListener('ap:whatsapp-open', onOpenHub);
      window.removeEventListener('ap:whatsapp', onShare);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: 'smooth' });
  }, [chats, typingChat, view]);

  /* Real Cloud API wiring status.
     GET /api/whatsapp-webhook?status=1 reports LIVE only when the server has
     WHATSAPP_API_TOKEN + WHATSAPP_PHONE_NUMBER_ID, so this badge tells the
     difference between a scripted demo and a genuinely connected number.
     Any failure (static preview, offline PWA) falls back to DEMO. */
  const [link, setLink] = useState({ live: false, checked: false });
  useEffect(() => {
    let cancelled = false;
    fetch('/api/whatsapp-webhook?status=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => { if (!cancelled) setLink({ live: Boolean(s?.live), checked: true }); })
      .catch(() => { if (!cancelled) setLink({ live: false, checked: true }); });
    return () => { cancelled = true; };
  }, []);

  const openChat = (id) => {
    sound.playClick();
    setView(id);
    setChats((prev) => ({ ...prev, [id]: { ...prev[id], unread: 0 } }));
  };

  const goToTab = (tab) => {
    sound.playSuccess();
    setOpen(false);
    window.dispatchEvent(new CustomEvent('ap:navigate', { detail: tab }));
  };

  const close = () => { sound.playClick(); setOpen(false); };
  const chat = view !== 'list' ? chats[view] : null;

  const sorted = Object.values(chats).sort((a, b) => (b.lastTs || 0) - (a.lastTs || 0));

  const Tick = ({ status }) =>
    status === 'sent'
      ? <Check className="w-3.5 h-3.5 text-zinc-400 inline" />
      : <CheckCheck className={`w-3.5 h-3.5 inline ${status === 'read' ? 'text-[#53bdeb]' : 'text-zinc-400'}`} />;

  const hub = (
    <>

          {view === 'list' ? (
            <>
              {/* inbox header */}
              <div className="px-4 pt-10 pb-3 bg-[#1f2c34] text-white">
                <div className="flex items-center justify-between">
                  {side ? (
                    <span className="text-lg font-black text-[#25D366]">WhatsApp</span>
                  ) : (
                    <button onClick={close} className="flex items-center gap-1 text-[#00a884] font-black text-sm active:opacity-70">
                      <ArrowLeft className="w-5 h-5" /> AgriPulse
                    </button>
                  )}
                  {!side && <span className="text-lg font-black">WhatsApp</span>}
                  <span className="flex items-center gap-4 text-zinc-300"><Camera className="w-5 h-5" /><MoreVertical className="w-5 h-5" /></span>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-full bg-[#0b141a] px-3.5 py-2 text-zinc-400 text-sm">
                  <Search className="w-4 h-4" /> Ask Meta AI or search
                </div>
              </div>

              {/* chat list */}
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* AgriPulse Community header (WhatsApp Communities style) */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
                  <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-2xl shrink-0">🌾</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[15px] font-black text-white truncate">AgriPulse</span>
                    <span className="block text-[12px] text-zinc-400 truncate">Community · 4 groups · 450+ kisan</span>
                  </span>
                  <span className="text-[10px] font-black text-[#00a884] bg-[#00a884]/10 rounded-full px-2 py-1 shrink-0">JOINED</span>
                </div>

                {/* live Cloud API wiring status (see /api/whatsapp-webhook?status=1) */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/[0.02]">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${link.live ? 'bg-[#25D366]' : 'bg-zinc-500'}`} />
                  <span className="text-[11px] font-bold text-zinc-300 truncate">
                    {link.live
                      ? 'WhatsApp Cloud API connected — replies arrive on the farmer’s real WhatsApp'
                      : 'Demo mode — scripted alerts (server has no WhatsApp credentials yet)'}
                  </span>
                  {link.checked && !link.live && (
                    <span className="ml-auto text-[10px] font-black text-zinc-500 shrink-0">npm run whatsapp:setup</span>
                  )}
                </div>
                {sorted.map((c) => {
                  const last = c.messages[c.messages.length - 1];
                  return (
                    <button key={c.id} onClick={() => openChat(c.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-white/5 border-b border-white/5">
                      <span className="w-12 h-12 rounded-full bg-[#1f2c34] flex items-center justify-center text-2xl shrink-0">{c.avatar}</span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center justify-between">
                          <span className="text-[15px] font-bold text-white truncate">{c.name}</span>
                          <span className={`text-[11px] font-bold shrink-0 ml-2 ${c.unread ? 'text-[#00a884]' : 'text-zinc-500'}`}>{last?.time}</span>
                        </span>
                        <span className="flex items-center justify-between gap-2 mt-0.5">
                          <span className="text-[13px] text-zinc-400 truncate">
                            {last?.out && <Tick status={last.status} />} {last?.from && !last.out ? `${last.from.split(' •')[0]}: ` : ''}{last?.text}
                          </span>
                          {c.unread > 0 && <span className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-[#00a884] text-black text-[11px] font-black flex items-center justify-center">{c.unread}</span>}
                        </span>
                      </span>
                    </button>
                  );
                })}
                <div className="px-4 py-4 text-center text-[11px] text-zinc-500 font-bold flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3" /> Your personal messages are end-to-end encrypted
                </div>
              </div>
            </>
          ) : (
            <>
              {/* thread header */}
              <div className="flex items-center gap-2 px-2 pt-10 pb-2 bg-[#1f2c34] text-white shadow-md">
                <button onClick={() => setView('list')} aria-label="Back to chats" className="p-2 rounded-full active:bg-white/10"><ArrowLeft className="w-5 h-5" /></button>
                <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center text-lg shrink-0">{chat.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold truncate">{chat.name}</div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {typingChat === chat.id ? 'typing…' : chat.group ? chat.members : 'online'}
                  </div>
                </div>
                <Video className="w-5 h-5 text-zinc-300 mx-2" />
                <Phone className="w-5 h-5 text-zinc-300 mx-2" />
                <MoreVertical className="w-5 h-5 text-zinc-300 mx-1" />
              </div>

              {/* messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-2"
                style={{ background: '#0b141a', backgroundImage: 'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1.2px)', backgroundSize: '22px 22px' }}>
                <div className="mx-auto w-fit max-w-[85%] px-3 py-1.5 rounded-lg bg-[#182229] text-[10px] text-[#ffd279] text-center flex items-center gap-1.5">
                  <Lock className="w-3 h-3 shrink-0" /> Messages are end-to-end encrypted
                </div>

                {chat.messages.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.out ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 shadow ${m.out ? 'rounded-tr-none bg-[#005c4b]' : 'rounded-tl-none bg-[#1f2c34]'}`}>
                      {!m.out && m.from && chat.group && <div className="text-[11px] font-black text-[#00a884] mb-0.5">{m.from}</div>}
                      <pre className={`whitespace-pre-wrap font-sans text-[13px] leading-snug ${m.out ? 'text-white' : 'text-zinc-100'}`}>{m.text}</pre>
                      {m.action && (
                        <button onClick={() => goToTab(m.action.tab)}
                          className="mt-2 w-full min-h-[38px] rounded-lg border border-[#00a884]/60 bg-[#00a884]/10 text-[#00d9a3] text-[12px] font-black flex items-center justify-center gap-1.5 active:scale-[0.97]">
                          <ArrowUpRight className="w-4 h-4" /> {m.action.label}
                        </button>
                      )}
                      <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${m.out ? 'text-zinc-300/80' : 'text-zinc-500'}`}>
                        {m.time} {m.out && <Tick status={m.status} />}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {typingChat === chat.id && (
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

              {/* thread footer */}
              <div className="p-3 pb-6 bg-[#1f2c34] flex gap-2">
                <a href={chat.direct
                    ? `https://wa.me/${chat.phone || ''}?text=${encodeURIComponent(chat.messages.find((m) => m.out)?.text || '')}`
                    : 'https://wa.me/?text=' + encodeURIComponent(`Join our "${chat.name}" farmer group on AgriPulse AI 🌾`)}
                  target="_blank" rel="noreferrer" onClick={() => sound.playClick()}
                  className="flex-1 min-h-[48px] rounded-full bg-[#00a884] text-black font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                  {chat.direct ? <><ExternalLink className="w-4 h-4" /> Open in real WhatsApp</> : <><Users className="w-4 h-4" /> Share group invite</>}
                </a>
                {!side && (
                <button onClick={close}
                  className="min-h-[48px] px-5 rounded-full border-2 border-zinc-600 text-zinc-200 font-black text-sm active:scale-[0.98]">
                  App
                </button>
                )}
              </div>
            </>
          )}
    </>
  );

  /* SIDE-BY-SIDE MODE — the hub lives permanently on the second phone. */
  if (side && sideEl) {
    return createPortal(
      <div className="h-full w-full flex flex-col bg-[#0b141a] text-left">{hub}</div>,
      sideEl
    );
  }

  /* MOBILE / NARROW MODE — launcher + slide-in overlay + notification banner. */
  return (
    <>
    <AnimatePresence>
      {toast && !open && (
        <motion.button
          initial={{ y: -80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          onClick={() => { clearTimeout(toastTimer.current); const id = toast.chatId; setToast(null); sound.playTransition(); setOpen(true); openChat(id); }}
          className="fixed top-12 inset-x-0 z-[96] mx-auto w-[92%] max-w-md text-left"
        >
          <span className="flex items-start gap-2.5 rounded-2xl bg-[#1f2c34]/95 border border-white/10 px-3.5 py-2.5 shadow-2xl backdrop-blur">
            <span className="w-9 h-9 rounded-full bg-[#0b141a] flex items-center justify-center text-lg shrink-0">{toast.avatar}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[12px] font-black text-white truncate">
                <MessageCircleIcon /> {toast.name} <span className="text-zinc-500 font-bold">• now</span>
              </span>
              <span className="block text-[12px] text-zinc-300 truncate">{toast.from}: {toast.text}</span>
            </span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>

    <AnimatePresence>
      {open && (
        <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[95] mx-auto max-w-md flex flex-col bg-[#0b141a]">
          {hub}
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}

/* tiny WhatsApp-green chat glyph for the notification banner */
function MessageCircleIcon() {
  return <span className="inline-block w-2 h-2 rounded-full bg-[#25D366] shrink-0" />;
}
