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
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-6 lg:px-8 pt-2 pb-1 sticky top-[48px] sm:top-[56px] z-30 overflow-hidden">
      <nav 
        aria-label="Main Navigation"
        role="tablist"
        style={{
          backgroundColor: isSunlightMode ? '#f3f4f6' : '#111827',
          borderColor: isSunlightMode ? '#d1d5db' : '#374151',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
        className="flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl border-2 shadow-lg overflow-x-auto w-full max-w-full touch-pan-x"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
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
              className={`shrink-0 flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all border-2 whitespace-nowrap cursor-pointer shadow-sm ${
                isActive ? 'scale-[1.02] shadow-md' : 'hover:scale-[1.01]'
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
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
