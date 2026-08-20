import React from 'react';
import { Scan, Radio, ShieldCheck, TrendingUp, MapPin, Users } from 'lucide-react';
import { sound } from '../utils/audio';
import { T } from '../data/translations';

export default function TabNav({ activeTab, setActiveTab, selectedLang, isSunlightMode }) {
  const t = T[selectedLang] || T['en'];

  const tabs = [
    { id: 'scan', label: t.tabs.scan, icon: Scan },
    { id: 'radar', label: t.tabs.radar, icon: Radio },
    { id: 'verify', label: t.tabs.verify, icon: ShieldCheck },
    { id: 'profit', label: t.tabs.profit, icon: TrendingUp },
    { id: 'stores', label: t.tabs.stores, icon: MapPin },
    { id: 'group', label: t.tabs.group, icon: Users },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 pb-1 sticky top-[56px] z-30">
      <nav 
        aria-label="Main Navigation"
        className={`flex items-center gap-2 p-1.5 rounded-2xl border shadow-xl overflow-x-auto transition-colors ${
          isSunlightMode 
            ? 'bg-zinc-100 border-zinc-300' 
            : 'bg-[#141816] border-[#2b3630]'
        }`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sound.playClick();
                setActiveTab(tab.id);
              }}
              style={{
                backgroundColor: isActive 
                  ? '#34d399' // Solid bright emerald
                  : isSunlightMode 
                    ? '#ffffff' 
                    : '#1f2937', // Solid bright dark-slate
                color: isActive 
                  ? '#000000' 
                  : isSunlightMode 
                    ? '#111827' 
                    : '#ffffff', // Pure crisp white text
                borderColor: isActive 
                  ? '#10b981' 
                  : isSunlightMode 
                    ? '#9ca3af' 
                    : '#4b5563', // Solid visible border
                opacity: 1,
                visibility: 'visible',
              }}
              className={`flex-1 min-w-[105px] sm:min-w-[130px] flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-black transition-all border-2 whitespace-nowrap cursor-pointer shadow-md ${
                isActive ? 'scale-[1.02] shadow-lg' : 'hover:scale-[1.01]'
              }`}
            >
              <Icon 
                style={{ 
                  color: isActive ? '#000000' : '#34d399',
                  opacity: 1,
                  visibility: 'visible',
                }} 
                className="w-4 h-4 shrink-0" 
              />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
