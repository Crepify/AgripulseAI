import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Store, Users, MessageCircle, TrendingUp, CircleCheck, ArrowRight, Ban } from 'lucide-react';
import { sound } from '../utils/audio';
import { inr, loadList, saveToList } from '../utils/evidence';
import { sendWhatsApp } from './WhatsAppScreen';

/*
 * DIRECT MARKET — farm to urban doorstep, zero middlemen.
 * The broken chain: middleman pays the farmer ₹100, the same crate retails
 * in the city at ₹400. Here the farmer lists at a fair direct price (~₹250):
 * the farmer earns 2.5x and the urban buyer still saves ~40%.
 */

const CROPS = {
  Tomato:  { unit: 'kg', middleman: 8,  retail: 32, fair: 20 },
  Onion:   { unit: 'kg', middleman: 12, retail: 40, fair: 26 },
  Potato:  { unit: 'kg', middleman: 9,  retail: 30, fair: 19 },
  Spinach: { unit: 'bunch', middleman: 5, retail: 25, fair: 15 },
  Chilli:  { unit: 'kg', middleman: 22, retail: 80, fair: 50 },
  Banana:  { unit: 'dozen', middleman: 18, retail: 60, fair: 38 },
};

const BUYERS = [
  { name: 'Green Heights Society', type: '120 flats • weekly veggie basket', avatar: '🏢', qty: 40, phone: '9876500061' },
  { name: 'Hotel Annapurna', type: 'Restaurant • daily fresh supply', avatar: '🍽️', qty: 25, phone: '9876500062' },
  { name: 'Sharma Kirana Store', type: 'Retail shop • repeat buyer', avatar: '🏪', qty: 30, phone: '9876500063' },
];

export default function TabMarket({ isSunlightMode }) {
  const card = isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white';
  const sub = isSunlightMode ? 'text-zinc-600' : 'text-zinc-400';
  const [crop, setCrop] = useState('Tomato');
  const info = CROPS[crop];
  const [qty, setQty] = useState(100);
  const [price, setPrice] = useState(CROPS.Tomato.fair);
  const [listed, setListed] = useState(false);
  const [orders, setOrders] = useState([]);
  const [accepted, setAccepted] = useState(null);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => { setPrice(CROPS[crop].fair); setListed(false); setOrders([]); setAccepted(null); }, [crop]);

  const listNow = () => {
    sound.playSuccess();
    setListed(true); setOrders([]); setAccepted(null);
    saveToList('ap_market_listings', { crop, qty, price, ts: Date.now() });
    BUYERS.forEach((b, i) => {
      timers.current.push(setTimeout(() => { setOrders((p) => [...p, b]); sound.playClick(); }, 1100 * (i + 1)));
    });
  };

  const accept = (b) => {
    sound.playSuccess();
    setAccepted(b);
    sendWhatsApp({
      name: b.name,
      phone: b.phone,
      avatar: b.avatar,
      message: `ORDER CONFIRMED — AgriPulse Direct Market\n${crop}: ${Math.min(qty, b.qty)} ${info.unit} @ ${inr(price)}/${info.unit}\nTotal: ${inr(Math.min(qty, b.qty) * price)}\nFarm-fresh, harvested today. Delivery tomorrow 7 AM.\nUPI on delivery — no middleman, no commission.`,
      replies: [
        { text: 'Confirmed! 🙏 The whole society is happy to buy directly from the farmer.', delay: 1800 },
        { text: `Payment of ${inr(Math.min(qty, b.qty) * price)} will be done on UPI at delivery. Same quantity next week too?`, delay: 2200 },
      ],
    });
  };

  const vsMiddleman = price - info.middleman;
  const earnX = (price / info.middleman).toFixed(1);
  const buyerSaves = Math.round(((info.retail - price) / info.retail) * 100);
  const pastListings = loadList('ap_market_listings');

  return (
    <div className="w-full space-y-4">
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="text-[10px] font-mono font-black tracking-widest text-emerald-500">DIRECT MARKET • सीधा बाज़ार</div>
        <div className="text-lg font-black">Farm to Doorstep, Zero Middlemen</div>
        <p className={`text-xs font-bold mt-1 ${sub}`}>List your harvest at a fair direct price — urban societies, restaurants and shops order straight from you on WhatsApp.</p>
      </div>

      {/* the broken chain, visualised */}
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="text-xs font-black mb-2 flex items-center gap-1.5"><Ban className="w-4 h-4 text-red-500" /> The middleman chain — {crop.toLowerCase()}, per {info.unit}</div>
        <div className="flex items-center gap-1 text-center">
          <div className="flex-1 p-2 rounded-xl border-2 border-red-500/50 bg-red-500/5">
            <div className="text-[9px] font-black text-red-500">YOU GET</div>
            <div className="text-lg font-black text-red-500">{inr(info.middleman)}</div>
          </div>
          <ArrowRight className={`w-4 h-4 shrink-0 ${sub}`} />
          <div className={`flex-1 p-2 rounded-xl border ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className={`text-[9px] font-black ${sub}`}>MANDI</div>
            <div className="text-lg font-black">{inr(Math.round((info.middleman + info.retail) / 2 / 2))}</div>
          </div>
          <ArrowRight className={`w-4 h-4 shrink-0 ${sub}`} />
          <div className={`flex-1 p-2 rounded-xl border ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
            <div className={`text-[9px] font-black ${sub}`}>CITY RETAIL</div>
            <div className="text-lg font-black">{inr(info.retail)}</div>
          </div>
        </div>
        <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-center text-emerald-600 font-black text-xs">
          Sell direct at {inr(price)} — you earn {earnX}× more, the buyer still saves {buyerSaves}%
        </div>
      </div>

      {/* listing form */}
      <div className={`p-4 rounded-2xl border ${card}`}>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3">
          {Object.keys(CROPS).map((c) => (
            <button key={c} onClick={() => { sound.playClick(); setCrop(c); }}
              className={`shrink-0 min-h-[44px] px-3.5 rounded-xl border-2 text-sm font-black ${crop === c ? 'bg-emerald-500 text-black border-emerald-400' : isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-800 border-zinc-700 text-zinc-200'}`}>{c}</button>
          ))}
        </div>
        <label className={`text-[10px] font-mono font-black ${sub}`}>QUANTITY AVAILABLE ({info.unit.toUpperCase()})</label>
        <input type="number" value={qty} min={10} onChange={(e) => setQty(Number(e.target.value) || 0)}
          className={`mt-1 w-full min-h-[52px] px-3 rounded-xl border-2 text-lg font-black text-center outline-none ${isSunlightMode ? 'bg-zinc-50 border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`} />
        <div className="mt-3 flex items-center justify-between">
          <label className={`text-[10px] font-mono font-black ${sub}`}>MY DIRECT PRICE</label>
          <span className="text-emerald-500 font-black text-lg">{inr(price)}/{info.unit}</span>
        </div>
        <input type="range" min={info.middleman} max={info.retail} step={1} value={price}
          onChange={(e) => setPrice(Number(e.target.value))} className="w-full accent-emerald-500" style={{ height: 30 }} />
        <div className={`flex justify-between text-[9px] font-black ${sub}`}>
          <span className="text-red-500">middleman {inr(info.middleman)}</span>
          <span className="text-emerald-500">fair {inr(info.fair)}</span>
          <span>retail {inr(info.retail)}</span>
        </div>
        <button onClick={listNow} className="mt-3 w-full min-h-[56px] rounded-2xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
          <Store className="w-5 h-5" /> List {qty} {info.unit} for the city
        </button>
      </div>

      {/* incoming urban orders */}
      {listed && (
        <div className={`p-4 rounded-2xl border ${card}`}>
          <div className="font-black text-sm mb-2 flex items-center gap-1.5"><Users className="w-4 h-4 text-emerald-500" /> Urban buyers within delivery range</div>
          {orders.length === 0 && <div className={`text-xs font-bold ${sub}`}>Broadcasting your listing to nearby societies and shops…</div>}
          <div className="space-y-2">
            {orders.map((b) => (
              <motion.div key={b.name} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-xl border-2 flex items-center gap-2.5 ${accepted?.name === b.name ? 'border-emerald-500 bg-emerald-500/10' : isSunlightMode ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-800 bg-zinc-900'}`}>
                <span className="text-2xl">{b.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-black truncate">{b.name}</div>
                  <div className={`text-[10px] font-bold ${sub}`}>{b.type}</div>
                  <div className="text-[11px] font-black text-emerald-500">wants {b.qty} {info.unit} = {inr(b.qty * price)}</div>
                </div>
                {accepted?.name === b.name ? (
                  <span className="flex items-center gap-1 text-emerald-500 text-xs font-black"><CircleCheck className="w-4 h-4" /> Sold</span>
                ) : (
                  <button onClick={() => accept(b)}
                    className="min-h-[44px] px-3.5 rounded-xl bg-emerald-600 text-white text-xs font-black flex items-center gap-1.5 active:scale-95">
                    <MessageCircle className="w-4 h-4" /> Accept
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* deal summary */}
      {accepted && (
        <div className={`p-4 rounded-2xl border-2 border-emerald-600 ${card}`}>
          <div className="text-emerald-500 font-black text-sm flex items-center gap-1.5"><TrendingUp className="w-5 h-5" /> Direct deal closed — no commission, no deductions</div>
          <div className="grid grid-cols-2 gap-2 mt-3 text-center">
            <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
              <div className={`text-[9px] font-black ${sub}`}>MIDDLEMAN WOULD PAY</div>
              <div className="text-xl font-black text-red-500 line-through">{inr(Math.min(qty, accepted.qty) * info.middleman)}</div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-600 text-white">
              <div className="text-[9px] font-black opacity-90">YOU EARN DIRECT</div>
              <div className="text-xl font-black">{inr(Math.min(qty, accepted.qty) * price)}</div>
            </div>
          </div>
        </div>
      )}

      {pastListings.length > 0 && !listed && (
        <div className={`p-4 rounded-2xl border ${card}`}>
          <h3 className="font-black text-sm mb-2">Past listings</h3>
          {pastListings.slice(0, 4).map((l, i) => (
            <div key={i} className={`flex justify-between py-2 border-b last:border-0 text-sm font-bold ${isSunlightMode ? 'border-zinc-200' : 'border-zinc-800'}`}>
              <span>{l.crop} • {l.qty} {CROPS[l.crop]?.unit || ''}</span><span className="text-emerald-500 font-black">{inr(l.price)}/{CROPS[l.crop]?.unit || 'unit'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
