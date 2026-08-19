import React from 'react';
import { Scan, Radio, ShieldCheck, TrendingUp, MapPin, Users } from 'lucide-react';
import { sound } from '../utils/audio';

export default function TabNav({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'scan', label: 'Leaf Scanner', icon: Scan },
    { id: 'radar', label: 'Spore Radar', icon: Radio },
    { id: 'verify', label: 'Verify Pesticide', icon: ShieldCheck },
    { id: 'profit', label: 'Mandi & ROI', icon: TrendingUp },
    { id: 'stores', label: 'Certified Stores', icon: MapPin },
    { id: 'group', label: 'Farmer Group', icon: Users },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-4 pb-2">
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-[#121514] p-1.5 rounded-2xl border border-[#1f2421]">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                sound.playClick();
                setActiveTab(t.id);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-500 text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
