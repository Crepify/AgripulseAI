import React, { useState } from 'react';
import { Briefcase, Users, MapPin, Phone, Plus, X, Search, Sparkles, Clock, Mic, MicOff } from 'lucide-react';
import { sound } from '../utils/audio';
import { speechEngine } from '../utils/speech';
import { getJobs, addJob, deleteJob } from '../utils/jobsData';

export default function TabJobs({ selectedLang, isSunlightMode }) {
  const [jobs, setJobs] = useState(() => getJobs());
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newJob, setNewJob] = useState({ type: 'need_help', title: '', location: '', date: '', wage: '', contact: '', description: '' });
  const [voiceField, setVoiceField] = useState(null);
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  const handleVoiceFill = (field) => {
    if (isVoiceListening && voiceField===field) { speechEngine.stopListening(); setIsVoiceListening(false); setVoiceField(null); return; }
    const langMap = { hi: 'hi-IN', en: 'en-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', mr: 'mr-IN', gu: 'gu-IN', bn: 'bn-IN', pa: 'pa-IN' };
    const code = langMap[selectedLang] || 'hi-IN';
    setVoiceField(field); setIsVoiceListening(true);
    speechEngine.startListening(code, (t)=>{ setNewJob(prev=>({...prev, [field]: t})); }, ()=>{ setIsVoiceListening(false); setVoiceField(null); }, ()=>{ setIsVoiceListening(false); setVoiceField(null); });
  };

  const handleAdd = () => {
    if (!newJob.title || !newJob.contact) { alert('Title and contact required'); return; }
    sound.playClick();
    setJobs(addJob(newJob));
    setShowAdd(false);
    setNewJob({ type: 'need_help', title: '', location: '', date: '', wage: '', contact: '', description: '' });
    sound.playSuccess();
  };

  const filtered = jobs.filter(j=>{
    const matchType = filter==='all' || j.type===filter;
    const matchQuery = !query || `${j.title} ${j.location} ${j.description}`.toLowerCase().includes(query.toLowerCase());
    return matchType && matchQuery;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      <div className={`p-3 rounded-2xl border flex items-center justify-between ${isSunlightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-amber-500 text-black flex items-center justify-center">👷</span>
          <span className="font-black text-sm">Jobs</span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold border">{filtered.length}</span>
        </div>
        <button onClick={()=>{ sound.playClick(); setShowAdd(true); }} className="w-10 h-10 rounded-full bg-amber-500 text-black flex items-center justify-center shadow"><Plus className="w-5 h-5" /></button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 grow ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
          <Search className="w-4 h-4 text-zinc-500" />
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search paddy transplanting, tractor operator..." className={`bg-transparent outline-none text-xs font-bold w-full ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`} />
        </div>
        {['all','need_help','offer_work'].map(f=>(
          <button key={f} onClick={()=>{ sound.playClick(); setFilter(f); }} className={`px-3 py-2 rounded-xl text-xs font-black border-2 capitalize ${filter===f ? 'bg-amber-400 text-black border-amber-300' : isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-800 border-zinc-700 text-zinc-200'}`}>{f.replace('_',' ')}</button>
        ))}
      </div>

      {showAdd && (
        <div className={`p-5 rounded-2xl border-2 space-y-3 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
          <div className="flex items-center justify-between"><h4 className="font-black text-sm">Post help or work — nearby farmers will see</h4><button onClick={()=>setShowAdd(false)} className="p-1 rounded-full bg-zinc-800 text-white"><X className="w-4 h-4" /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <select value={newJob.type} onChange={e=>setNewJob({...newJob, type: e.target.value})} className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300">
              <option value="need_help">I Need Help / Labour</option><option value="offer_work">I Offer Work / Service</option>
            </select>
            <div className="flex items-center gap-1">
              <input value={newJob.title} onChange={e=>setNewJob({...newJob, title: e.target.value})} placeholder="Title e.g. Need 2 labourers" className="flex-1 px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
              <button type="button" onClick={()=>handleVoiceFill('title')} className={`p-2 rounded-xl border-2 ${isVoiceListening && voiceField==='title' ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-black border-amber-300'}`}>{isVoiceListening && voiceField==='title' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}</button>
            </div>
            <input value={newJob.location} onChange={e=>setNewJob({...newJob, location: e.target.value})} placeholder="Location" className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
            <input value={newJob.date} onChange={e=>setNewJob({...newJob, date: e.target.value})} placeholder="When e.g. Tomorrow" className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
            <input value={newJob.wage} onChange={e=>setNewJob({...newJob, wage: e.target.value})} placeholder="Wage e.g. ₹400/day" className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
            <input value={newJob.contact} onChange={e=>setNewJob({...newJob, contact: e.target.value})} placeholder="Phone" className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
            <div className="col-span-2 flex items-center gap-1">
              <input value={newJob.description} onChange={e=>setNewJob({...newJob, description: e.target.value})} placeholder="Description — voice supported" className="flex-1 px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
              <button type="button" onClick={()=>handleVoiceFill('description')} className={`p-2 rounded-xl border-2 ${isVoiceListening && voiceField==='description' ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-black border-amber-300'}`}>{isVoiceListening && voiceField==='description' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}</button>
            </div>
          </div>
          <button onClick={handleAdd} className="w-full py-3 rounded-xl bg-amber-500 text-black font-black text-xs">Post — Free for farmers</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(job=>(
          <div key={job.id} className={`p-5 rounded-2xl border-2 space-y-3 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-[#121514] border-[#1f2421] text-white'}`}>
            <div className="flex items-start justify-between gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${job.type==='need_help' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-black'}`}>{job.type==='need_help' ? 'Need Help' : 'Offers Work'}</span>
              <span className="text-[11px] text-zinc-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(job.time).toLocaleDateString()}</span>
            </div>
            <h4 className="font-black text-sm">{job.title}</h4>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="flex items-center gap-1 text-zinc-500"><MapPin className="w-3 h-3" /> {job.location}</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-black">{job.wage}</span>
              <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-bold border">{job.date}</span>
            </div>
            <div className={`p-2.5 rounded-xl border text-xs ${isSunlightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-800 border-zinc-700'}`}>{job.description}</div>
            <div className="flex items-center gap-2">
              <button onClick={()=>{ sound.playClick(); window.open(`tel:${job.contact}`, '_self'); }} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-emerald-500 text-black font-black text-xs"><Phone className="w-3.5 h-3.5" /> {job.contact}</button>
              <button onClick={()=>{ sound.playClick(); setJobs(deleteJob(job.id)); }} className="px-3 py-2 rounded-xl bg-zinc-800 text-white text-xs">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
