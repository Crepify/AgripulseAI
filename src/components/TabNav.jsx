import React, { useEffect, useRef, useState } from 'react';
import { Scan, Radio, ShieldCheck, TrendingUp, MapPin, Users, ShoppingBag, MessageSquare, Briefcase, Fuel, Bot, LayoutGrid } from 'lucide-react';
import { sound } from '../utils/audio';
import { T } from '../data/translations';

export default function TabNav({ activeTab, setActiveTab, selectedLang, isSunlightMode, isLowLiteracy }) {
  const t = T[selectedLang] || T['en'];
  const scrollerRef = useRef(null);
  const [fadeLeft, setFadeLeft] = useState(false);
  const [fadeRight, setFadeRight] = useState(false);

  const tabs = [
    { id: 'scan', label: t.tabs.scan || 'Scan', icon: Scan, emoji: '🌱' },
    { id: 'radar', label: t.tabs.radar || 'Weather', icon: Radio, emoji: '🌧️' },
    { id: 'verify', label: t.tabs.verify || 'Check', icon: ShieldCheck, emoji: '🧴' },
    { id: 'profit', label: t.tabs.profit || 'Mandi', icon: TrendingUp, emoji: '💰' },
    { id: 'stores', label: t.tabs.stores || 'Shops', icon: MapPin, emoji: '🏪' },
    { id: 'group', label: t.tabs.group || 'Group', icon: Users, emoji: '👥' },
    { id: 'marketplace', label: t.tabs.marketplace || 'Market', icon: ShoppingBag, emoji: '🛒' },
    { id: 'community', label: t.tabs.community || 'Community', icon: MessageSquare, emoji: '💬' },
    { id: 'jobs', label: t.tabs.jobs || 'Jobs', icon: Briefcase, emoji: '👷' },
    { id: 'fuel', label: t.tabs.fuel || 'Fuel', icon: Fuel, emoji: '⛽' },
    { id: 'chatbot', label: t.tabs.chatbot || 'AI Chat', icon: Bot, emoji: '🤖' },
    { id: 'services', label: t.tabs.services || 'Services', icon: LayoutGrid, emoji: '🏛️' },
  ];

  // Edge fades only appear when the row actually overflows at this width
  const updateFades = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setFadeLeft(el.scrollLeft > 6);
    setFadeRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  };

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateFades();
    el.addEventListener('scroll', updateFades, { passive: true });
    window.addEventListener('resize', updateFades);
    return () => {
      el.removeEventListener('scroll', updateFades);
      window.removeEventListener('resize', updateFades);
    };
  }, [isLowLiteracy]);

  // Keep the active tab visible after navigating (e.g. from voice commands)
  useEffect(() => {
    const el = scrollerRef.current?.querySelector('[aria-selected="true"]');
    el?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [activeTab, isLowLiteracy]);

  const navBg = isSunlightMode ? '#f3f4f6' : '#111827';
  const navBorder = isSunlightMode ? '#d1d5db' : '#374151';

  const tabColors = (isActive) => ({
    backgroundColor: isActive ? '#34d399' : isSunlightMode ? '#ffffff' : '#1f2937',
    color: isActive ? '#000000' : isSunlightMode ? '#111827' : '#ffffff',
    borderColor: isActive ? '#10b981' : isSunlightMode ? '#9ca3af' : '#4b5563',
  });

  // Low-literacy mode: big tappable emoji tiles in a grid — no scrolling needed
  if (isLowLiteracy) {
    return (
      <nav
        aria-label="Main Navigation"
        role="tablist"
        style={{ backgroundColor: navBg, borderColor: navBorder }}
        className={`mx-auto grid w-full max-w-6xl grid-cols-3 gap-1.5 rounded-2xl border-2 p-1.5 shadow-lg sm:grid-cols-6`}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => { sound.playClick(); setActiveTab(tab.id); }}
              style={tabColors(isActive)}
              className={`flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-xl border-2 px-2 py-3 transition-all shadow-sm cursor-pointer ${
                isActive ? 'scale-[1.02] shadow-md' : 'hover:scale-[1.01]'
              }`}
            >
              <span className="text-3xl leading-none" aria-hidden="true">{tab.emoji}</span>
              <span className="text-[11px] font-black text-center leading-tight">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="relative w-full">
      <div
        ref={scrollerRef}
        className="no-scrollbar snap-x snap-mandatory overflow-x-auto scroll-px-3 border-b-2"
        style={{ backgroundColor: isSunlightMode ? '#f3f4f6' : '#111827', borderColor: isSunlightMode ? '#d1d5db' : '#374151' }}
      >
        <nav
          aria-label="Main Navigation"
          role="tablist"
          style={{ backgroundColor: 'transparent' }}
          className="mx-auto flex w-max max-w-full items-center gap-1.5 px-3 py-2 sm:px-6"
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
                onClick={() => { sound.playClick(); setActiveTab(tab.id); }}
                style={tabColors(isActive)}
                className={`snap-start shrink-0 flex min-h-10 items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2 font-black whitespace-nowrap transition-all shadow-sm cursor-pointer sm:min-h-11 sm:px-3.5 sm:py-2.5 ${
                  isActive ? 'scale-[1.02] shadow-md' : 'hover:scale-[1.01]'
                }`}
              >
                <Icon
                  style={{ color: isActive ? '#000000' : '#34d399' }}
                  className="w-4 h-4 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-xs sm:text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overflow affordances: fade + hint that more tabs continue in that direction */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r to-transparent transition-opacity duration-200 ${
          fadeLeft ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: `linear-gradient(to right, ${navBg}, transparent)` }}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l to-transparent transition-opacity duration-200 ${
          fadeRight ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ backgroundImage: `linear-gradient(to left, ${navBg}, transparent)` }}
      />
    </div>
  );
}
