import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Radio, Wind, Droplets, ShieldCheck, Bell, CloudRain,
  Sunrise, Sunset, RefreshCw, Thermometer, MapPin, AlertTriangle, CalendarDays,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { getIndiaWeather, hasWeatherKey } from '../utils/dataService';
import { useTranslation } from '../hooks/useLocalT';

const QUICK_CITIES = ['Mandya', 'Bengaluru', 'Pune', 'Nashik', 'Ludhiana', 'Indore', 'Bhopal'];

// "06:08" → "6:38 AM" with `plusMins` offset
function addMinutes(hhmm, plusMins) {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const total = h * 60 + m + plusMins;
  const hh = Math.floor((total % 1440) / 60);
  const mm = total % 60;
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`;
}

export default function TabRadar({ selectedLang, isSunlightMode }) {
  const t = useTranslation(selectedLang);
  const wl = t.weatherLive;

  const [cityInput, setCityInput] = useState('Mandya');
  const [city, setCity] = useState('Mandya');
  const [wx, setWx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const data = await getIndiaWeather(city);
    if (mounted.current) {
      setWx(data);
      setLoading(false);
      setRefreshing(false);
    }
  }, [city]);

  useEffect(() => { load(); }, [load]);

  const handleCitySubmit = (e) => {
    e?.preventDefault();
    const c = cityInput.trim();
    if (!c) return;
    sound.playClick();
    setCity(c);
  };

  const handleAlert = () => {
    sound.playSuccess();
    setAlertSent(true);
    setTimeout(() => setAlertSent(false), 2500);
  };

  // ── derived agronomic intelligence ──
  const humidity = wx?.humidityMorning ?? null;
  const rainDesc = (wx?.forecast?.[0]?.description || wx?.condition || '').toLowerCase();
  const rainToday = (wx?.rainfallMm ?? 0) > 0 || /rain|drizzle|shower|thunder/.test(rainDesc);
  const wind = wx?.windKmh ?? null;
  const windSafe = wind == null || wind < 15;

  const riskScore = humidity == null ? 50 : humidity >= 85 ? 88 : humidity >= 70 ? 74 : humidity >= 55 ? 52 : 28;
  const riskLabel = riskScore >= 85 ? wl.riskVHigh : riskScore >= 70 ? wl.riskHigh : riskScore >= 50 ? wl.riskMod : wl.riskLow;
  const riskColor = riskScore >= 85 ? 'text-red-500' : riskScore >= 70 ? 'text-amber-500' : riskScore >= 50 ? 'text-yellow-500' : 'text-emerald-500';

  const sprayStart = addMinutes(wx?.sunrise, 30);
  const sprayEndRaw = addMinutes(wx?.sunrise, 270); // sunrise+4.5h
  const sprayEnd = sprayEndRaw || '10:30 AM';
  const sprayAdvised = !rainToday && windSafe;

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      {/* Weather key missing notice */}
      {!hasWeatherKey() && (
        <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/40 flex items-start gap-3 text-blue-400 text-xs font-bold shadow-md">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{wl.noKeyBanner}</span>
        </div>
      )}

      {/* Rain advisory (computed from forecast) */}
      {rainToday ? (
        <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center gap-3 text-amber-500 text-xs font-bold shadow-md">
          <CloudRain className="w-5 h-5 shrink-0 animate-bounce" />
          <span>{wl.washoutYes}</span>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center gap-3 text-emerald-500 text-xs font-bold shadow-md">
          <ShieldCheck className="w-5 h-5 shrink-0" />
          <span>{wl.washoutNo}</span>
        </div>
      )}

      {/* City selector bar */}
      <form onSubmit={handleCitySubmit} className="flex flex-wrap items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 grow sm:grow-0 ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-700'}`}>
          <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder={wl.cityPlaceholder}
            className={`bg-transparent outline-none text-xs font-black w-36 sm:w-44 ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`}
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black text-xs font-black border-2 border-emerald-300 shadow-sm transition-transform active:scale-95"
        >
          {wl.applyCity}
        </button>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {QUICK_CITIES.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => { sound.playClick(); setCityInput(c); setCity(c); }}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black whitespace-nowrap border transition-all ${
                city.toLowerCase() === c.toLowerCase()
                  ? 'bg-emerald-400 text-black border-emerald-300'
                  : isSunlightMode ? 'bg-white text-zinc-700 border-zinc-300' : 'bg-zinc-800 text-zinc-200 border-zinc-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Radar View */}
        <div className={`lg:col-span-6 p-6 rounded-2xl border flex flex-col items-center justify-center min-h-[360px] relative overflow-hidden ${
          isSunlightMode ? 'bg-white border-zinc-300' : 'bg-[#121514] border-[#1f2421]'
        }`}>
          <div className="relative w-64 h-64 rounded-full border border-emerald-500/30 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border border-emerald-500/40 flex items-center justify-center" />
            <div className="w-32 h-32 rounded-full border border-emerald-500/50 flex items-center justify-center" />
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              className="absolute inset-0 rounded-full bg-gradient-to-tr from-emerald-500/20 via-transparent to-transparent pointer-events-none"
            />
            <div className="absolute top-10 right-14 flex flex-col items-center">
              <span className={`w-3.5 h-3.5 rounded-full ${riskScore >= 70 ? 'bg-red-500' : 'bg-amber-500'} animate-ping`} />
              <span className={`text-[10px] font-mono bg-black/85 px-1.5 py-0.5 rounded mt-1 border ${
                riskScore >= 70 ? 'text-red-300 border-red-500/30' : 'text-amber-300 border-amber-500/30'
              }`}>
                {loading ? '…' : `Spores ${riskScore}%`}
              </span>
            </div>
          </div>

          <div className={`mt-4 flex items-center justify-between w-full text-xs font-mono pt-3 border-t ${
            isSunlightMode ? 'border-zinc-200 text-zinc-700' : 'border-[#1f2421] text-zinc-400'
          }`}>
            <span className="truncate">{wl.cityLabel}: <strong>{wx?.city || city}</strong></span>
            <span className={`${riskColor} font-bold shrink-0 pl-2`}>{loading ? '…' : riskLabel}</span>
          </div>
        </div>

        {/* Right Column: Live Microclimate */}
        <div className="lg:col-span-6 space-y-4">
          <div className={`p-6 rounded-2xl border space-y-4 ${
            isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white'
          }`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-500" />
                {t.radar.title}
              </h3>
              <div className="flex items-center gap-2">
                {wx && (
                  <span className={`flex items-center gap-1 text-[9px] font-mono font-black px-2 py-0.5 rounded-full border ${
                    wx.live
                      ? 'text-emerald-500 border-emerald-500/40 bg-emerald-500/10'
                      : 'text-blue-500 border-blue-500/40 bg-blue-500/10'
                  }`}>
                    {wx.live ? wl.liveBadge : wl.simBadge}
                  </span>
                )}
                <button
                  onClick={() => load(true)}
                  disabled={refreshing || loading}
                  aria-label={wl.refresh}
                  className={`p-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                    isSunlightMode ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200' : 'bg-[#181c1a] border-[#232925] text-zinc-300 hover:bg-[#1f2421]'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Weather Grid */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}>
                <Wind className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-500">{t.radar.windLabel}</div>
                <div className="font-bold mt-0.5">{loading ? '…' : wind != null ? `${wind} km/h` : wl.notAvailable}</div>
              </div>
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}>
                <Droplets className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-500">{wl.humidityM}</div>
                <div className={`font-bold mt-0.5 ${humidity >= 80 ? 'text-amber-500' : ''}`}>{loading ? '…' : humidity != null ? `${humidity}%` : '—'}</div>
              </div>
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}>
                <CloudRain className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-500">{wl.rainLabel}</div>
                <div className="font-bold mt-0.5">{loading ? '…' : wx?.rainfallMm != null ? `${wx.rainfallMm} mm` : '0 mm'}</div>
              </div>
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}>
                <Thermometer className="w-4 h-4 text-red-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-500">{wl.tempMax} / {wl.tempMin}</div>
                <div className="font-bold mt-0.5">{loading ? '…' : wx?.tempMax != null ? `${Math.round(wx.tempMax)}° / ${Math.round(wx.tempMin)}°C` : '—'}</div>
              </div>
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}>
                <Sunrise className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-500">{wl.sunrise}</div>
                <div className="font-bold mt-0.5">{loading ? '…' : addMinutes(wx?.sunrise, 0) || '—'}</div>
              </div>
              <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}>
                <Sunset className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                <div className="text-[10px] text-zinc-500">{wl.sunset}</div>
                <div className="font-bold mt-0.5">{loading ? '…' : addMinutes(wx?.sunset, 0) || '—'}</div>
              </div>
            </div>

            {/* Safe Spray Window Callout */}
            <div className={`p-4 rounded-xl border ${
              sprayAdvised
                ? isSunlightMode ? 'bg-zinc-100 border-emerald-500/40' : 'bg-[#181c1a] border-emerald-500/30'
                : isSunlightMode ? 'bg-red-50 border-red-400' : 'bg-[#231515] border-red-500/30'
            }`}>
              <div className={`text-xs font-bold flex items-center gap-1.5 ${sprayAdvised ? 'text-emerald-500' : 'text-red-500'}`}>
                {sprayAdvised ? <ShieldCheck className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {sprayAdvised ? wl.bestWindow : !windSafe ? wl.windCaution : wl.washoutYes}
              </div>
              {sprayAdvised && (
                <div className="text-lg font-bold mt-1">{sprayStart ?? '6:30 AM'} – {sprayEnd}</div>
              )}
              <p className={`text-xs font-light mt-1 ${isSunlightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                {wx?.condition}
              </p>
            </div>

            <button
              onClick={handleAlert}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-md"
            >
              <Bell className="w-4 h-4" />
              <span>{alertSent ? t.radar.alertSentText : t.radar.sendAlertBtn}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7-Day IMD Forecast strip */}
      <div className={`p-6 rounded-2xl border ${isSunlightMode ? 'bg-white border-zinc-300' : 'bg-[#121514] border-[#1f2421]'}`}>
        <h3 className={`text-sm font-bold font-mono flex items-center gap-2 mb-4 ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`}>
          <CalendarDays className="w-4 h-4 text-emerald-500" /> {wl.forecastTitle}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {(loading ? Array.from({ length: 7 }) : wx?.forecast || []).map((f, i) =>
            f ? (
              <div
                key={i}
                className={`p-3 rounded-xl border text-center ${
                  /rain|drizzle|shower|thunder/.test((f.description || '').toLowerCase())
                    ? isSunlightMode ? 'bg-blue-50 border-blue-300' : 'bg-blue-950/30 border-blue-800'
                    : isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'
                }`}
              >
                <div className={`text-[10px] font-mono font-bold ${isSunlightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>{f.date}</div>
                <div className="text-lg my-1">{/rain|drizzle|shower|thunder/.test((f.description || '').toLowerCase()) ? '🌧️' : /cloud/.test((f.description || '').toLowerCase()) ? '⛅' : '☀️'}</div>
                <div className={`text-[11px] font-black font-mono ${isSunlightMode ? 'text-zinc-900' : 'text-white'}`}>
                  {Math.round(f.maxTemp)}° / {Math.round(f.minTemp)}°
                </div>
                <div className={`text-[9px] font-mono mt-1 leading-tight ${isSunlightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {(f.description || '').length > 42 ? `${f.description.slice(0, 42)}…` : f.description}
                </div>
              </div>
            ) : (
              <div key={i} className={`p-3 rounded-xl border h-[110px] animate-pulse ${isSunlightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-[#181c1a] border-[#232925]'}`} />
            )
          )}
        </div>
        {wx && !wx.live && hasWeatherKey() && (
          <div className="mt-3 text-[11px] font-mono text-amber-500 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Live IMD fetch failed ({wx.error}) — showing simulated data.
          </div>
        )}
      </div>
    </div>
  );
}
