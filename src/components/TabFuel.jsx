import React, { useState } from 'react';
import { Fuel, Tractor, Truck, Plus, X, Trash2, TrendingDown, Lightbulb, Sparkles, Calculator } from 'lucide-react';
import { sound } from '../utils/audio';
import { getFuelLogs, addFuelLog, deleteFuelLog, getFuelStats, getFuelTips } from '../utils/fuelTracker';

export default function TabFuel({ selectedLang, isSunlightMode }) {
  const [logs, setLogs] = useState(() => getFuelLogs());
  const [showAdd, setShowAdd] = useState(false);
  const [newLog, setNewLog] = useState({ vehicle: 'Mahindra 575', type: 'tractor', hoursOrKm: '', fuelLiters: '', workType: 'Ploughing' });
  const stats = getFuelStats();

  const handleAdd = () => {
    if (!newLog.hoursOrKm || !newLog.fuelLiters) { alert('Hours/Km and fuel required'); return; }
    sound.playClick();
    const updated = addFuelLog(newLog);
    setLogs(updated);
    setShowAdd(false);
    setNewLog({ vehicle: 'Mahindra 575', type: 'tractor', hoursOrKm: '', fuelLiters: '', workType: 'Ploughing' });
    sound.playSuccess();
  };

  const handleDelete = (id) => {
    sound.playClick();
    setLogs(deleteFuelLog(id));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      <div className={`p-3 rounded-2xl border flex items-center justify-between ${isSunlightMode ? 'bg-white border-zinc-200' : 'bg-zinc-900 border-zinc-800'}`}>
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-amber-500 text-black flex items-center justify-center">⛽</span>
          <span className="font-black text-sm">Fuel</span>
          {stats && <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-[10px] font-bold border">{stats.totalFuel.toFixed(1)}L</span>}
        </div>
        <button onClick={()=>{ sound.playClick(); setShowAdd(true); }} className="w-10 h-10 rounded-full bg-amber-500 text-black flex items-center justify-center shadow"><Plus className="w-5 h-5" /></button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-5 rounded-2xl border-2 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
            <div className="text-xs font-bold text-zinc-500">Total Fuel Used</div>
            <div className="text-2xl font-black text-amber-500 mt-1">{stats.totalFuel.toFixed(1)} L</div>
            <div className="text-[11px] text-zinc-500 mt-1">{stats.totalWork.toFixed(1)} hours/km total work</div>
          </div>
          <div className={`p-5 rounded-2xl border-2 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
            <div className="text-xs font-bold text-zinc-500">Average Efficiency</div>
            <div className="text-2xl font-black text-emerald-500 mt-1">{stats.avgEfficiency} L/unit</div>
            <div className="text-[11px] text-zinc-500 mt-1">Lower is better • Target &lt;3 L/hour for tractor</div>
          </div>
          <div className={`p-5 rounded-2xl border-2 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
            <div className="text-xs font-bold text-zinc-500">Most Efficient Vehicle</div>
            <div className="text-lg font-black text-emerald-500 mt-1">{stats.best?.vehicle || '—'}</div>
            <div className="text-[11px] text-zinc-500 mt-1">{stats.best ? `${stats.best.eff.toFixed(2)} L/unit • ${stats.best.count} logs` : 'No data'}</div>
          </div>
        </div>
      )}

      {stats && (
        <div className={`p-4 rounded-2xl border ${isSunlightMode ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-blue-950/30 border-blue-800/50 text-blue-300'}`}>
          <div className="flex items-center gap-2 font-black text-xs"><Lightbulb className="w-4 h-4" /> Fuel Saving Tips</div>
          <div className="mt-2 space-y-1 text-xs">
            {getFuelTips(parseFloat(stats.avgEfficiency)).map((tip,i)=><div key={i}>• {tip}</div>)}
          </div>
        </div>
      )}

      {showAdd && (
        <div className={`p-5 rounded-2xl border-2 space-y-3 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
          <div className="flex items-center justify-between"><h4 className="font-black text-sm">Log fuel — track efficiency</h4><button onClick={()=>setShowAdd(false)} className="p-1 rounded-full bg-zinc-800 text-white"><X className="w-4 h-4" /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={newLog.vehicle} onChange={e=>setNewLog({...newLog, vehicle: e.target.value})} placeholder="Vehicle e.g. Mahindra 575" className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
            <select value={newLog.type} onChange={e=>setNewLog({...newLog, type: e.target.value})} className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300">
              <option value="tractor">Tractor (hours)</option><option value="truck">Truck/Goods (km)</option>
            </select>
            <input value={newLog.hoursOrKm} onChange={e=>setNewLog({...newLog, hoursOrKm: e.target.value})} placeholder={newLog.type==='tractor' ? 'Hours worked e.g. 5' : 'Km driven e.g. 50'} type="number" className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
            <input value={newLog.fuelLiters} onChange={e=>setNewLog({...newLog, fuelLiters: e.target.value})} placeholder="Diesel liters e.g. 12" type="number" className="px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
            <input value={newLog.workType} onChange={e=>setNewLog({...newLog, workType: e.target.value})} placeholder="Work e.g. Ploughing, Transport" className="col-span-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold bg-white border-zinc-300" />
          </div>
          <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${isSunlightMode ? 'bg-zinc-100' : 'bg-zinc-800 text-white'}`}>
            <Calculator className="w-4 h-4 text-emerald-500" />
            {newLog.hoursOrKm && newLog.fuelLiters ? `Efficiency: ${(parseFloat(newLog.fuelLiters)/parseFloat(newLog.hoursOrKm)||0).toFixed(2)} L/${newLog.type==='tractor' ? 'hour' : 'km'} — ${parseFloat(newLog.fuelLiters)/parseFloat(newLog.hoursOrKm) > 4 ? 'High! Check tips' : 'Good'}` : 'Enter hours and fuel to see efficiency'}
          </div>
          <button onClick={handleAdd} className="w-full py-3 rounded-xl bg-amber-500 text-black font-black text-xs">Save Log — Track Efficiency</button>
        </div>
      )}

      <div className="space-y-2">
        {logs.map(log=>(
          <div key={log.id} className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700 text-white'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${log.type==='tractor' ? 'bg-emerald-500 text-black' : 'bg-amber-500 text-black'}`}>{log.type==='tractor' ? <Tractor className="w-5 h-5" /> : <Truck className="w-5 h-5" />}</div>
              <div>
                <div className="font-black text-sm">{log.vehicle} — {log.workType}</div>
                <div className="text-[11px] text-zinc-500">{log.hoursOrKm} {log.type==='tractor' ? 'hours' : 'km'} • {log.fuelLiters}L diesel • {(parseFloat(log.fuelLiters)/parseFloat(log.hoursOrKm)||0).toFixed(2)} L/{log.type==='tractor' ? 'h' : 'km'}</div>
              </div>
            </div>
            <button onClick={()=>handleDelete(log.id)} className="p-2 rounded-xl bg-zinc-800 text-white"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {logs.length===0 && <div className="text-center py-12 text-zinc-500 text-sm">No fuel logs yet — start tracking to save diesel! 🚜</div>}
      </div>
    </div>
  );
}
