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
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-2 sticky top-[62px] z-30">
      {/* ALWAYS VISIBLE TOP NAVIGATION BAR (All screen sizes) */}
      <nav 
        aria-label="Main Navigation"
        style={{
          backgroundColor: isSunlightMode ? '#e5e7eb' : '#111827',
          borderColor: isSunlightMode ? '#9ca3af' : '#374151',
        }}
        className="flex items-center gap-2 p-2 rounded-2xl border-2 shadow-2xl overflow-x-auto"
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
                    : '#1f2937', // Solid bright dark-slate (zinc-800)
                color: isActive 
                  ? '#000000' 
                  : isSunlightMode 
                    ? '#111827' 
                    : '#ffffff', // Pure white text
                borderColor: isActive 
                  ? '#10b981' 
                  : isSunlightMode 
                    ? '#9ca3af' 
                    : '#4b5563', // Solid visible border
                opacity: 1,
                visibility: 'visible',
              }}
              className={`flex-1 min-w-[120px] sm:min-w-[140px] flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-xs sm:text-sm font-black transition-all border-2 whitespace-nowrap cursor-pointer shadow-md ${
                isActive ? 'scale-[1.03] shadow-lg' : 'hover:scale-[1.01]'
              }`}
            >
              <Icon 
                style={{ 
                  color: isActive ? '#000000' : '#34d399',
                  opacity: 1,
                  visibility: 'visible',
                }} 
                className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" 
              />
              <span 
                style={{
                  color: isActive ? '#000000' : isSunlightMode ? '#111827' : '#ffffff',
                  opacity: 1,
                  visibility: 'visible',
                  fontWeight: 800,
                }}
                className="truncate"
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
