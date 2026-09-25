import React, { useState, useEffect } from 'react';
import { Calendar, Sprout, Droplets, BadgeCheck, MapPin, Phone, Fuel, Building2, Sparkles, AlertTriangle, TrendingUp, Calculator, Sun, CloudRain, LocateFixed } from 'lucide-react';
import { sound } from '../utils/audio';
import { getCalendarForState, getCurrentSeason, getSowingAlert } from '../utils/cropCalendar';
import { getSubsidiesForState } from '../utils/subsidyData';
import { getSoilForState, getFertilizerAdjustment } from '../utils/soilHealth';
import { getNearestCSC } from '../utils/chatbotData';
import { detectUserState } from '../utils/dataService';
import { getSession } from '../utils/authService';

export default function TabServices({ selectedLang, isSunlightMode }) {
  const [activeSubTab, setActiveSubTab] = useState('calendar');
  const [userState, setUserState] = useState(() => {
    try { const s = getSession(); return s?.state || 'Karnataka'; } catch { return 'Karnataka'; }
  });
  const [locating, setLocating] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(() => {
    try { const s = getSession(); return Boolean(s?.aadhaarVerified); } catch { return false; }
  });

  useEffect(() => {
    const autoDetect = async () => {
      try {
        const info = await detectUserState();
        if (info?.state) setUserState(info.state);
      } catch {}
    };
    autoDetect();
  }, []);

  const handleLocate = async () => {
    sound.playClick();
    setLocating(true);
    try {
      const info = await detectUserState();
      if (info?.state) { setUserState(info.state); sound.playSuccess(); }
    } catch { sound.playTransition(); } finally { setLocating(false); }
  };

  const calendar = getCalendarForState(userState);
  const subsidies = getSubsidiesForState(userState, aadhaarVerified);
  const soil = getSoilForState(userState);
  const fertilizer = getFertilizerAdjustment(soil, calendar.suggestions[0]?.crop || 'Rice');
  const cscList = getNearestCSC(userState);
  const sowingAlert = getSowingAlert(userState);

  const subTabs = [
    { id: 'calendar', label: 'Crop Calendar', icon: Calendar },
    { id: 'subsidy', label: 'Subsidy', icon: BadgeCheck },
    { id: 'soil', label: 'Soil Health', icon: Droplets },
    { id: 'csc', label: 'CSC Centers', icon: Building2 },
    { id: 'ivr', label: 'IVR Helpline', icon: Phone },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-4">
      <div className={`p-3 rounded-2xl border flex items-center justify-between ${isSunlightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-emerald-500 text-black flex items-center justify-center">🏛️</span>
          <span className="font-black text-sm">Services</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold border flex items-center gap-1"><MapPin className="w-3 h-3" /> {userState}</span>
        </div>
        <button onClick={handleLocate} disabled={locating} className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center">
          <LocateFixed className={`w-4 h-4 ${locating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {sowingAlert && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-3 text-emerald-700 text-xs font-bold">
          <Sprout className="w-5 h-5" /> {sowingAlert} — {calendar.month} • {calendar.season} season
        </div>
      )}

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {subTabs.map(tab=>{
          const Icon = tab.icon;
          const isActive = activeSubTab===tab.id;
          return (
            <button key={tab.id} onClick={()=>{ sound.playClick(); setActiveSubTab(tab.id); }} className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border-2 whitespace-nowrap ${isActive ? 'bg-emerald-400 text-black border-emerald-300' : isSunlightMode ? 'bg-white border-zinc-300 text-zinc-700' : 'bg-zinc-800 border-zinc-700 text-zinc-200'}`}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeSubTab==='calendar' && (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl border-2 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
            <h3 className="font-black text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-emerald-500" /> Crop Calendar — {userState} • {calendar.season} • {calendar.month}</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {calendar.suggestions.map((item,i)=>(
                <div key={i} className={`p-4 rounded-xl border ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800 border-zinc-700'}`}>
                  <div className="font-black text-sm flex items-center gap-2"><Sprout className="w-4 h-4 text-emerald-500" /> {item.crop}</div>
                  <div className="mt-2 text-xs space-y-1">
                    <div><span className="text-zinc-500">Sowing:</span> <span className="font-bold">{item.sowing}</span></div>
                    <div><span className="text-zinc-500">Harvest:</span> <span className="font-bold">{item.harvest}</span></div>
                    <div className="text-[11px] text-emerald-600 font-bold mt-1">{item.note || `Best time for ${item.crop} in ${userState}`}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              {Object.entries(calendar.all).map(([season, crops])=>(
                <div key={season} className={`p-3 rounded-xl border ${season===calendar.season ? 'bg-emerald-500/10 border-emerald-500/40' : isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800 border-zinc-700'}`}>
                  <div className="font-black">{season}</div>
                  <div className="mt-1 text-[11px]">{crops.map(c=>c.crop).join(', ')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab==='subsidy' && (
        <div className="space-y-4">
          <div className={`p-3 rounded-xl border text-xs font-bold ${aadhaarVerified ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700' : 'bg-amber-500/10 border-amber-500/40 text-amber-700'}`}>
            {aadhaarVerified ? '✓ Aadhaar verified — you are eligible for DBT subsidies' : '⚠️ Verify Aadhaar in login to unlock PM-Kisan DBT — currently showing all schemes'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subsidies.map(s=>(
              <div key={s.id} className={`p-5 rounded-2xl border-2 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
                <div className="flex items-start justify-between gap-2">
                  <span className="font-black text-sm">{s.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[10px] font-black">{s.amount}</span>
                </div>
                <div className="mt-2 text-xs space-y-1">
                  <div><span className="text-zinc-500">Category:</span> {s.category}</div>
                  <div><span className="text-zinc-500">Eligibility:</span> {s.eligibility}</div>
                  <div><span className="text-zinc-500">Docs:</span> {s.docs}</div>
                  <div className={`mt-2 p-2 rounded-lg text-[11px] font-bold ${s.eligible.includes('Eligible') ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-600 border border-amber-500/30'}`}>{s.eligible}</div>
                </div>
                <button onClick={()=>window.open(s.link, '_blank')} className="mt-3 w-full py-2 rounded-xl bg-blue-500 text-white font-black text-xs">Apply / Check Status</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab==='soil' && (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl border-2 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
            <h3 className="font-black text-sm flex items-center gap-2"><Droplets className="w-4 h-4 text-blue-500" /> Soil Health — {userState}</h3>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-50' : 'bg-zinc-800'}`}><div className="text-zinc-500">Soil Type</div><div className="font-black mt-1">{soil.type}</div></div>
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-50' : 'bg-zinc-800'}`}><div className="text-zinc-500">pH</div><div className="font-black mt-1">{soil.ph}</div></div>
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-50' : 'bg-zinc-800'}`}><div className="text-zinc-500">Organic Matter</div><div className="font-black mt-1">{soil.organic}</div></div>
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-50' : 'bg-zinc-800'}`}><div className="text-zinc-500">Nitrogen</div><div className="font-black mt-1">{soil.nitrogen}</div></div>
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-50' : 'bg-zinc-800'}`}><div className="text-zinc-500">Phosphorus</div><div className="font-black mt-1">{soil.phosphorus}</div></div>
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-50' : 'bg-zinc-800'}`}><div className="text-zinc-500">Potassium</div><div className="font-black mt-1">{soil.potassium}</div></div>
            </div>
            <div className={`mt-4 p-3 rounded-xl border text-xs ${isSunlightMode ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'}`}>
              <div className="font-black flex items-center gap-1"><Sparkles className="w-4 h-4" /> Recommendation for {calendar.suggestions[0]?.crop || 'your crop'}:</div>
              <div className="mt-1">{soil.recommendation}</div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-white border text-zinc-900 text-center"><div className="text-[10px]">N</div><div className="font-black">{fertilizer.N} kg/acre</div></div>
                <div className="p-2 rounded bg-white border text-zinc-900 text-center"><div className="text-[10px]">P</div><div className="font-black">{fertilizer.P} kg/acre</div></div>
                <div className="p-2 rounded bg-white border text-zinc-900 text-center"><div className="text-[10px]">K</div><div className="font-black">{fertilizer.K} kg/acre</div></div>
              </div>
              <div className="text-[10px] mt-2">Auto-adjusted based on your soil + crop. Use neem-coated urea, apply FYM 5t/acre.</div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab==='csc' && (
        <div className="space-y-4">
          <div className={`p-4 rounded-2xl border ${isSunlightMode ? 'bg-blue-50 border-blue-200' : 'bg-blue-950/30 border-blue-800/50'}`}>
            <div className="font-black text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-blue-500" /> Nearest CSC / Computer Centers — {userState}</div>
            <div className="text-xs mt-1">For farmers who need help with Aadhaar, PM-Kisan, soil card, insurance. Toll-free: 1800 3000 3468</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cscList.map((csc,i)=>(
              <div key={i} className={`p-5 rounded-2xl border-2 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
                <div className="font-black text-sm">{csc.name}</div>
                <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {csc.address}</div>
                <div className="text-xs mt-2"><span className="text-zinc-500">Services:</span> {csc.services}</div>
                <div className="mt-3 flex gap-2">
                  <button onClick={()=>window.open(`tel:${csc.phone}`, '_self')} className="flex-1 py-2 rounded-xl bg-emerald-500 text-black font-black text-xs flex items-center justify-center gap-1"><Phone className="w-4 h-4" /> {csc.phone}</button>
                  <button onClick={()=>window.open(`https://www.google.com/maps/search/?api=1&query=${csc.lat},${csc.lon}`, '_blank')} className="px-3 py-2 rounded-xl bg-zinc-800 text-white text-xs">Map</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab==='ivr' && (
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl border-2 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
            <h3 className="font-black text-sm flex items-center gap-2"><Phone className="w-4 h-4 text-emerald-500" /> IVR & Toll-Free Helplines — For farmers without smartphone</h3>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { name: 'Kisan Call Center', number: '1800-180-1551', desc: '24x7 agronomist in your language, free', lang: 'All 22 languages' },
                { name: 'PM-Kisan Helpline', number: '155261 / 011-24300606', desc: 'PM-KISAN scheme status', lang: 'Hindi, English' },
                { name: 'Fasal Bima Helpline', number: '14447', desc: 'Crop insurance claim', lang: 'All languages' },
                { name: 'CSC Helpline', number: '1800 3000 3468', desc: 'Common Service Center support', lang: 'All languages' },
                { name: 'Soil Health Helpline', number: '1800 180 1551', desc: 'Soil testing & fertilizer advice', lang: 'Hindi, English' },
                { name: 'AgriPulse IVR (Demo)', number: '1800-AGRI-AI', desc: 'Call, speak crop issue, get SMS remedy — works on feature phone', lang: 'All 22 languages + voice' },
              ].map((helpline,i)=>(
                <div key={i} className={`p-4 rounded-xl border ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-zinc-800 border-zinc-700'}`}>
                  <div className="font-black text-sm">{helpline.name}</div>
                  <div className="text-lg font-black text-emerald-500 mt-1">{helpline.number}</div>
                  <div className="text-xs text-zinc-500 mt-1">{helpline.desc}</div>
                  <div className="text-[10px] mt-1 px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-500 inline-block">{helpline.lang}</div>
                  <button onClick={()=>window.open(`tel:${helpline.number.replace(/[^0-9]/g,'')}`, '_self')} className="mt-2 w-full py-2 rounded-xl bg-emerald-500 text-black font-black text-xs">Call Now — Free</button>
                </div>
              ))}
            </div>
            <div className={`mt-4 p-3 rounded-xl border text-xs ${isSunlightMode ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-950/30 border-amber-800/50 text-amber-300'}`}>
              <div className="font-black">How IVR works for non-smartphone farmers:</div>
              <div className="mt-1">1. Call 1800-180-1551 → Select language (1 for Hindi, 2 for Tamil etc) → Speak crop issue → Agronomist answers + SMS with remedy + nearby CSC address.</div>
              <div className="mt-1">2. AgriPulse demo IVR: Call → Say "Tomato yellow leaves" in your language → AI detects intent → Sends SMS with dose + connects to nearest farmer who solved same issue.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
