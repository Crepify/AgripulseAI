import React, { useState, useEffect } from 'react';
import { ShoppingBag, Tractor, Package, Search, MapPin, Phone, Plus, X, CheckCircle2, Sparkles, Filter, Mic, MicOff } from 'lucide-react';
import { sound } from '../utils/audio';
import { speechEngine } from '../utils/speech';
import { getMarketplaceListings, addListing, deleteListing, searchListings } from '../utils/marketplaceData';

export default function TabMarketplace({ selectedLang, isSunlightMode }) {
  const [listings, setListings] = useState(() => getMarketplaceListings());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ type: 'seed', title: '', crop: '', qty: '', price: '', location: '', contact: '', description: '' });
  const [voiceField, setVoiceField] = useState(null);
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  useEffect(() => { setListings(searchListings(query, filter)); }, [query, filter]);

  const handleVoiceFill = (field) => {
    if (isVoiceListening && voiceField === field) { speechEngine.stopListening(); setIsVoiceListening(false); setVoiceField(null); return; }
    const langMap = { hi: 'hi-IN', en: 'en-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', mr: 'mr-IN', gu: 'gu-IN', bn: 'bn-IN', pa: 'pa-IN' };
    const code = langMap[selectedLang] || 'hi-IN';
    setVoiceField(field); setIsVoiceListening(true);
    speechEngine.startListening(code, (transcript) => {
      setNewItem(prev => ({ ...prev, [field]: transcript }));
    }, () => { setIsVoiceListening(false); setVoiceField(null); }, () => { setIsVoiceListening(false); setVoiceField(null); });
  };

  const handleAdd = () => {
    sound.playClick();
    if (!newItem.title || !newItem.price) { alert('Title and price required'); return; }
    const added = addListing({ ...newItem, price: parseInt(newItem.price)||0 });
    setListings(added);
    setShowAdd(false);
    setNewItem({ type: 'seed', title: '', crop: '', qty: '', price: '', location: '', contact: '', description: '' });
    sound.playSuccess();
  };

  const handleDelete = (id) => {
    sound.playClick();
    setListings(deleteListing(id));
  };

  const filtered = searchListings(query, filter);

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 ${isSunlightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-emerald-500 text-black flex items-center justify-center">🛒</span>
          <span className="font-black text-sm">Bazaar</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold border">{filtered.length}</span>
        </div>
        <button onClick={()=>{ sound.playClick(); setShowAdd(true); }} className="w-10 h-10 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow"><Plus className="w-5 h-5" /></button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 grow sm:grow-0 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
          <Search className="w-4 h-4 text-zinc-500" />
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search seeds, tractor, sprayer..." className={`bg-transparent outline-none text-xs font-bold w-48 ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`} />
        </div>
        {['all','seed','tractor','equipment','fertilizer'].map(f=>(
          <button key={f} onClick={()=>{ sound.playClick(); setFilter(f); }} className={`px-3 py-2 rounded-xl text-xs font-black border-2 capitalize ${filter===f ? 'bg-emerald-400 text-black border-emerald-300' : isSunlightMode ? 'bg-white border-zinc-300 text-zinc-700' : 'bg-zinc-800 border-zinc-700 text-zinc-200'}`}>{f}</button>
        ))}
      </div>

      {showAdd && (
        <div className={`p-5 rounded-2xl border-2 space-y-3 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
          <div className="flex items-center justify-between"><h4 className="font-black text-sm">List your item — other farmers will see</h4><button onClick={()=>setShowAdd(false)} className="p-1 rounded-full bg-zinc-800 text-white"><X className="w-4 h-4" /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={newItem.type} onChange={e=>setNewItem({...newItem, type: e.target.value})} className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300">
              <option value="seed">Seed</option><option value="tractor">Tractor</option><option value="equipment">Equipment</option><option value="fertilizer">Fertilizer/Compost</option>
            </select>
            <div className="flex items-center gap-1">
              <input value={newItem.title} onChange={e=>setNewItem({...newItem, title: e.target.value})} placeholder="Title e.g. Tomato Hybrid 100g" className="flex-1 px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
              <button type="button" onClick={()=>handleVoiceFill('title')} className={`p-2 rounded-xl border-2 ${isVoiceListening && voiceField==='title' ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-black border-emerald-300'}`}>{isVoiceListening && voiceField==='title' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}</button>
            </div>
            <input value={newItem.crop} onChange={e=>setNewItem({...newItem, crop: e.target.value})} placeholder="Crop e.g. Tomato" className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
            <input value={newItem.qty} onChange={e=>setNewItem({...newItem, qty: e.target.value})} placeholder="Qty e.g. 100g packet" className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
            <input value={newItem.price} onChange={e=>setNewItem({...newItem, price: e.target.value})} placeholder="Price ₹" type="number" className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
            <input value={newItem.location} onChange={e=>setNewItem({...newItem, location: e.target.value})} placeholder="Location e.g. Mandya" className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
            <input value={newItem.contact} onChange={e=>setNewItem({...newItem, contact: e.target.value})} placeholder="Phone" className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
            <div className="col-span-2 flex items-center gap-1">
              <input value={newItem.description} onChange={e=>setNewItem({...newItem, description: e.target.value})} placeholder="Description — voice supported" className="flex-1 px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
              <button type="button" onClick={()=>handleVoiceFill('description')} className={`p-2 rounded-xl border-2 ${isVoiceListening && voiceField==='description' ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-black border-emerald-300'}`}>{isVoiceListening && voiceField==='description' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}</button>
            </div>
          </div>
          <button onClick={handleAdd} className="w-full py-3 rounded-xl bg-emerald-500 text-black font-black text-xs">Post Listing — Free</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item=>(
          <div key={item.id} className={`p-4 rounded-2xl border-2 space-y-3 shadow-xl ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-[#121514] border-[#1f2421] text-white'}`}>
            <div className="relative h-32 rounded-xl overflow-hidden bg-zinc-900">
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black capitalize ${item.type==='seed' ? 'bg-emerald-500 text-black' : item.type==='tractor' ? 'bg-amber-500 text-black' : 'bg-blue-500 text-white'}`}>{item.type}</span>
              {item.verified && <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Verified</span>}
            </div>
            <div>
              <h4 className="font-black text-sm">{item.title}</h4>
              <div className="text-[11px] text-zinc-500 mt-0.5">{item.crop} • {item.qty}</div>
              <div className="text-base font-black text-emerald-500 mt-1">₹{item.price.toLocaleString('en-IN')}</div>
            </div>
            <div className="text-[11px] text-zinc-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location} • {item.seller}</div>
            <div className={`p-2 rounded-xl border text-[11px] ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-800 border-zinc-700'}`}>{item.description}</div>
            <div className="flex items-center gap-2">
              <button onClick={()=>{ sound.playClick(); window.open(`tel:${item.contact}`, '_self'); }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-emerald-500 text-black font-black text-xs"><Phone className="w-3.5 h-3.5" /> Call</button>
              <button onClick={()=>handleDelete(item.id)} className="px-3 py-2 rounded-xl bg-zinc-800 text-white text-xs">Remove</button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length===0 && <div className="text-center py-12 text-zinc-500 text-sm">No listings found — be first to sell!</div>}
    </div>
  );
}
