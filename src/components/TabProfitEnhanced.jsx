import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Calculator, RefreshCw, Radio,
  AlertTriangle, Database, MapPin, ArrowUpRight, LocateFixed, Sparkles,
  Phone, BadgeCheck, Droplets, ShoppingBag, BarChart3
} from 'lucide-react';
import { getMandiStates, getMandiCommodities, getMandiPrices, detectUserState, ALL_INDIAN_STATES } from '../utils/dataService';
import { useTranslation } from '../hooks/useLocalT';
import { getSession } from '../utils/authService';
import { sound } from '../utils/audio';
import { getSubsidiesForState } from '../utils/subsidyData';
import { getLandSize, saveLandSize } from '../utils/farmerProfile';

const fallbackT = {
  refresh: 'Refresh', loading: 'Fetching mandi rates…', retry: 'Retry', perQtl: '/ Qtl', minMax: 'Min–Max', prevDay: 'vs previous report',
  autoDetect: 'Auto-detect my mandi', detecting: 'Detecting…', detected: 'Auto-detected', useCurrentCrop: 'Use my last scanned crop',
};

export default function TabProfit({ selectedLang, isSunlightMode }) {
  const t = useTranslation(selectedLang);
  const [acreage, setAcreage] = useState(() => getLandSize() || 3);
  const [states, setStates] = useState(ALL_INDIAN_STATES);
  const [commodities, setCommodities] = useState([]);
  const [stateSel, setStateSel] = useState(() => { try { const s = getSession(); return s?.state || 'Karnataka'; } catch { return 'Karnataka'; } });
  const [commoditySel, setCommoditySel] = useState('Tomato');
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [detectedInfo, setDetectedInfo] = useState(null);
  const [autoCrop, setAutoCrop] = useState(null);
  const [showTrend, setShowTrend] = useState(true);
  const requestSeq = useRef(0);
  const mountedRef = useRef(true);

  const aadhaarVerified = (()=>{ try { return Boolean(getSession()?.aadhaarVerified); } catch { return false; } })();
  const subsidies = getSubsidiesForState(stateSel, aadhaarVerified);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  useEffect(() => { saveLandSize(acreage); }, [acreage]);

  useEffect(() => {
    getMandiStates().then((s) => {
      if (mountedRef.current && Array.isArray(s) && s.length) {
        const merged = [...new Set([...ALL_INDIAN_STATES, ...s])].sort();
        setStates(merged);
      }
    });
    try { const last = localStorage.getItem('ap_last_scanned_crop'); if (last) setAutoCrop(last); } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tryAutoDetect = async () => {
      try {
        const info = await detectUserState();
        if (cancelled || !mountedRef.current) return;
        if (info?.state && ALL_INDIAN_STATES.includes(info.state)) {
          setStateSel(info.state);
          setDetectedInfo(info);
        }
      } catch {}
    };
    const session = (() => { try { return getSession(); } catch { return null; } })();
    if (!session || session.state === 'Karnataka') tryAutoDetect();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    getMandiCommodities(stateSel).then((c) => {
      if (mountedRef.current && Array.isArray(c) && c.length) {
        setCommodities(c);
        if (!c.includes(commoditySel)) {
          if (autoCrop && c.includes(autoCrop)) setCommoditySel(autoCrop);
          else setCommoditySel(c.includes('Tomato') ? 'Tomato' : c[0]);
        }
      }
    });
  }, [stateSel]);

  const loadPrices = useCallback(async (isRefresh = false) => {
    const seq = ++requestSeq.current;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const result = await getMandiPrices({ state: stateSel, commodity: commoditySel, forceRefresh: isRefresh });
      if (mountedRef.current && seq === requestSeq.current) setBoard(result);
    } finally {
      if (mountedRef.current && seq === requestSeq.current) { setLoading(false); setRefreshing(false); }
    }
  }, [stateSel, commoditySel]);

  useEffect(() => { setBoard(null); loadPrices(); }, [loadPrices]);

  const handleAutoDetect = async () => {
    sound.playClick(); setLocating(true);
    try { const info = await detectUserState(); if (info?.state) { setStateSel(info.state); setDetectedInfo(info); sound.playSuccess(); } } catch { sound.playTransition(); } finally { setLocating(false); }
  };

  // Generate mock 7-day trend for mandi price
  const trendData = (() => {
    if (!board?.rows?.[0]) return [];
    const base = board.rows[0].modal;
    return Array.from({ length: 7 }).map((_, i) => {
      const date = new Date(); date.setDate(date.getDate() - (6-i));
      const variation = (Math.random() - 0.5) * base * 0.15;
      return { date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), price: Math.round(base + variation) };
    });
  })();

  const maxTrend = Math.max(...trendData.map(d=>d.price), 0);
  const minTrend = Math.min(...trendData.map(d=>d.price), 0);

  const bioProfit = acreage * 38500;
  const chemProfit = acreage * 19000;
  const cropLoss = acreage * 22000;
  const topModal = board?.rows?.[0]?.modal;
  const boardStatus = !board ? null : board.live ? 'live' : board.stale ? 'stale' : board.cached ? 'cached' : 'unavailable';

  const formatDate = (iso) => { if (!iso) return ''; try { return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return iso; } };
  const formatTime = (ts) => { if (!ts) return ''; return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 text-xs ${isSunlightMode ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'}`}>
        <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-500" /><span className="font-bold">Farmer-first: location, crop, land size auto — trend, sell now, subsidy</span></div>
        <div className="flex items-center gap-2">
          {detectedInfo && <span className="px-2 py-1 rounded-full bg-emerald-500 text-black text-[10px] font-black border border-emerald-300">{fallbackT.detected}: {detectedInfo.state}{detectedInfo.city ? `, ${detectedInfo.city}` : ''}</span>}
          <button onClick={handleAutoDetect} disabled={locating} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-[11px] border border-emerald-300 shadow-sm disabled:opacity-60"><LocateFixed className={`w-3.5 h-3.5 ${locating ? 'animate-spin' : ''}`} /><span>{locating ? fallbackT.detecting : fallbackT.autoDetect}</span></button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-7 p-6 rounded-2xl border space-y-5 shadow-xl ${isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Calculator className="w-5 h-5 text-emerald-500" /><h3 className="text-sm font-bold font-mono">{t.profit.calcTitle} — Auto {acreage} acres</h3></div>
            <span className="text-xs font-mono px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">{acreage} {t.profit.selectedAcres} (auto-saved)</span>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}>
            <div className="flex justify-between text-xs font-mono"><span className={isSunlightMode ? 'text-zinc-600' : 'text-zinc-400'}>{t.profit.landSize} — One-tap auto</span><span className="font-bold text-emerald-500">{acreage} Acres</span></div>
            <input type="range" min="0.5" max="20" step="0.5" value={acreage} onChange={(e)=>setAcreage(Number(e.target.value))} className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono"><span>0.5 Acre</span><span>10 Acres</span><span>20 Acres</span></div>
            <div className="text-[10px] text-zinc-500">Auto-saved as ap_land_size — reused in scanner, mandi, fuel tracker. No need to enter again.</div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className={`p-3.5 rounded-xl border ${isSunlightMode ? 'bg-emerald-50 border-emerald-300' : 'bg-[#18231e] border-emerald-500/30'}`}><div className="text-[10px] font-mono text-emerald-500 font-bold">{t.profit.organicTitle}</div><div className="text-xl font-bold text-emerald-600 mt-1">+₹{bioProfit.toLocaleString('en-IN')}</div><div className="text-[10px] text-zinc-500 mt-1 font-mono">{t.profit.costLabel} ₹{acreage*350}</div></div>
            <div className={`p-3.5 rounded-xl border ${isSunlightMode ? 'bg-amber-50 border-amber-300' : 'bg-[#231e15] border-amber-500/30'}`}><div className="text-[10px] font-mono text-amber-500 font-bold">{t.profit.chemicalTitle}</div><div className="text-xl font-bold text-amber-600 mt-1">+₹{chemProfit.toLocaleString('en-IN')}</div><div className="text-[10px] text-zinc-500 mt-1 font-mono">{t.profit.costLabel} ₹{acreage*1500}</div></div>
            <div className={`p-3.5 rounded-xl border ${isSunlightMode ? 'bg-red-50 border-red-300' : 'bg-[#231515] border-red-500/30'}`}><div className="text-[10px] font-mono text-red-500 font-bold">{t.profit.untreatedTitle}</div><div className="text-xl font-bold text-red-500 mt-1">-₹{cropLoss.toLocaleString('en-IN')}</div><div className="text-[10px] text-zinc-500 mt-1 font-mono">{t.profit.yieldLoss} 60%</div></div>
          </div>

          {topModal > 0 && (
            <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${isSunlightMode ? 'bg-emerald-50 border-emerald-300' : 'bg-[#18231e] border-emerald-500/30'}`}>
              <div className="flex items-center gap-2.5"><ArrowUpRight className="w-5 h-5 text-emerald-500 shrink-0" /><div className="text-xs font-bold">{t.mandiLive.sellEstimate.split('{qtl}')[0]}<strong className="font-mono">{(acreage*8).toLocaleString('en-IN')} Qtl</strong>{t.mandiLive.sellEstimate.split('{qtl}')[1]}</div></div>
              <div className="text-right"><div className="text-lg font-black text-emerald-500 font-mono">≈ ₹{(acreage*8*topModal).toLocaleString('en-IN')}</div><div className="text-[10px] font-mono text-zinc-500">{commoditySel} · ₹{topModal.toLocaleString('en-IN')} {fallbackT.perQtl} · {stateSel}</div></div>
            </div>
          )}

          {topModal > 0 && (
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>{ sound.playClick(); window.open('tel:18001801551', '_self'); }} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs border-2 border-emerald-300"><Phone className="w-4 h-4" /> Sell Now — Call APMC Trader</button>
              <button onClick={()=>{ sound.playClick(); window.open(`https://wa.me/?text=${encodeURIComponent(`I want to sell ${acreage*8} Qtl ${commoditySel} at ₹${topModal}/Qtl from ${stateSel}. Contact me.`)}`, '_blank'); }} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-black text-xs border-2 border-blue-400"><ShoppingBag className="w-4 h-4" /> Share on WhatsApp</button>
            </div>
          )}

          {/* Subsidy auto-check */}
          <div className={`p-4 rounded-xl border ${isSunlightMode ? 'bg-blue-50 border-blue-200' : 'bg-blue-950/20 border-blue-800/50'}`}>
            <div className="flex items-center gap-2 font-black text-xs"><BadgeCheck className="w-4 h-4 text-blue-500" /> Subsidy Auto-Check — {stateSel} {aadhaarVerified ? '✓ Aadhaar Verified' : '⚠️ Verify Aadhaar'}</div>
            <div className="mt-2 grid grid-cols-1 gap-1.5">
              {subsidies.slice(0,3).map(s=>(
                <div key={s.id} className="flex items-center justify-between text-[11px]"><span className="font-bold">{s.name}</span><span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black">{s.amount}</span></div>
              ))}
            </div>
            <div className="text-[10px] text-zinc-500 mt-2">Aadhaar verified → DBT eligible. Check Services tab for all schemes.</div>
          </div>
        </div>

        <div className={`lg:col-span-5 p-6 rounded-2xl border space-y-4 shadow-xl ${isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white'}`}>
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold font-mono flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-500" /> {t.mandiLive.boardTitle}</h3>
            <div className="flex items-center gap-2">
              {board && <span className={`flex items-center gap-1 text-[9px] font-mono font-black px-2 py-0.5 rounded-full border ${boardStatus==='live' ? 'text-emerald-500 border-emerald-500/40 bg-emerald-500/10' : boardStatus==='cached' ? 'text-sky-500 border-sky-500/40 bg-sky-500/10' : boardStatus==='stale' ? 'text-amber-500 border-amber-500/40 bg-amber-500/10' : 'text-red-500 border-red-500/40 bg-red-500/10'}`}>{boardStatus==='live' ? <Radio className="w-2.5 h-2.5 animate-pulse" /> : boardStatus==='unavailable' ? <AlertTriangle className="w-2.5 h-2.5" /> : <Database className="w-2.5 h-2.5" />}{boardStatus==='live' ? t.mandiLive.liveBadge : boardStatus==='cached' ? t.mandiLive.freshCacheBadge : boardStatus==='stale' ? t.mandiLive.staleBadge : t.mandiLive.offlineBadge}</span>}
              <button onClick={()=>loadPrices(true)} disabled={refreshing||loading} className={`p-1.5 rounded-lg border disabled:opacity-50 ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}><RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[10px] font-mono font-bold text-zinc-500">{t.mandiLive.stateLabel}</label><select value={stateSel} onChange={e=>setStateSel(e.target.value)} className={`mt-1 w-full px-2.5 py-2 rounded-xl border text-xs font-bold outline-none ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925] text-white'}`}>{(states.length ? states : [stateSel]).map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="text-[10px] font-mono font-bold text-zinc-500">{t.mandiLive.cropLabel}</label><select value={commoditySel} onChange={e=>setCommoditySel(e.target.value)} className={`mt-1 w-full px-2.5 py-2 rounded-xl border text-xs font-bold outline-none ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925] text-white'}`}>{(commodities.length ? commodities : [commoditySel]).map(c=><option key={c} value={c}>{c}</option>)}</select></div>
          </div>

          {autoCrop && autoCrop!==commoditySel && <button onClick={()=>{ sound.playClick(); setCommoditySel(autoCrop); }} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-[11px] font-black"><Sparkles className="w-3.5 h-3.5" /> {fallbackT.useCurrentCrop}: {autoCrop}</button>}

          {board?.latestDate && !loading && (
            <div className={`space-y-1 text-[10px] font-mono ${isSunlightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <div className="flex justify-between"><span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-emerald-500" /> {board.rows.length} {t.mandiLive.marketsShowing}</span><span>{t.mandiLive.marketDateLabel}: {formatDate(board.latestDate)}</span></div>
            </div>
          )}

          {/* Trend graph */}
          {trendData.length>0 && (
            <div className={`p-3 rounded-xl border ${isSunlightMode ? 'bg-zinc-50 border-zinc-200' : 'bg-[#181c1a] border-[#232925]'}`}>
              <div className="flex items-center justify-between text-xs font-black"><span className="flex items-center gap-1"><TrendingUp className="w-4 h-4 text-emerald-500" /> 7-Day Price Trend — Best day to sell</span><button onClick={()=>setShowTrend(!showTrend)} className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-white">{showTrend ? 'Hide' : 'Show'}</button></div>
              {showTrend && (
                <div className="mt-3">
                  <div className="flex items-end gap-1 h-20">
                    {trendData.map((d,i)=>{
                      const h = maxTrend===minTrend ? 50 : ((d.price-minTrend)/(maxTrend-minTrend))*70 + 10;
                      const isBest = d.price===maxTrend;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className={`w-full rounded-t ${isBest ? 'bg-emerald-500' : 'bg-zinc-600'} transition-all`} style={{ height: `${h}%` }} title={`${d.date}: ₹${d.price}`} />
                          <div className={`text-[8px] font-mono ${isBest ? 'text-emerald-500 font-black' : 'text-zinc-500'}`}>{d.date.split(' ')[0]}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-[10px] font-mono flex justify-between"><span>Min ₹{minTrend}</span><span className="text-emerald-500 font-black">Best ₹{maxTrend} — Sell now!</span><span>Max ₹{maxTrend}</span></div>
                  <div className="text-[10px] text-zinc-500 mt-1">Auto-fetch when crop selected. Green bar = best day to sell. Save more by waiting for peak.</div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-0.5">
            {loading && <div className="space-y-2 animate-pulse">{[...Array(4)].map((_,i)=><div key={i} className={`p-3 rounded-xl border h-[58px] ${isSunlightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-[#181c1a] border-[#232925]'}`} />)}<div className="text-center text-[11px] font-mono text-zinc-500">{fallbackT.loading}</div></div>}
            {!loading && board?.empty && <div className={`p-4 rounded-xl border text-xs font-bold text-center ${isSunlightMode ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-[#231e15] border-amber-500/30 text-amber-400'}`}>{t.mandiLive.empty}</div>}
            {!loading && board?.rows?.map((m)=>(
              <div key={m.id} className={`p-3 rounded-xl border flex items-center justify-between text-xs ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}>
                <div className="min-w-0"><div className="font-bold truncate">{m.market.replace(/ APMC$/,'')}</div><div className="text-[10px] text-zinc-500 font-mono truncate">{m.district}{m.variety && m.variety!==m.crop ? ` · ${m.variety}` : ''}</div><div className="text-[9px] text-zinc-500 font-mono mt-0.5">{fallbackT.minMax}: ₹{m.min.toLocaleString('en-IN')}–₹{m.max.toLocaleString('en-IN')}</div></div>
                <div className="text-right font-mono shrink-0 pl-2"><div className="font-black text-sm">₹{m.modal.toLocaleString('en-IN')} <span className="text-[9px] font-bold text-zinc-500">{fallbackT.perQtl}</span></div><div className={`text-[10px] flex items-center justify-end gap-0.5 font-bold ${m.trend==='up' ? 'text-emerald-500' : m.trend==='down' ? 'text-red-500' : 'text-zinc-500'}`}>{m.trend==='up' ? <TrendingUp className="w-3 h-3" /> : m.trend==='down' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}<span>{m.change==null ? '—' : `${m.change>0 ? '+' : '−'}₹${Math.abs(m.change).toLocaleString('en-IN')}`} {m.change!=null && ` ${fallbackT.prevDay}`}</span></div></div>
              </div>
            ))}
          </div>
          <div className="text-[9px] font-mono text-center text-zinc-500">{t.mandiLive.poweredBy}</div>
        </div>
      </div>
    </div>
  );
}
