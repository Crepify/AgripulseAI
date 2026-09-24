import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Minus, Calculator, RefreshCw, Radio,
  AlertTriangle, Database, MapPin, ArrowUpRight,
} from 'lucide-react';
import { getMandiStates, getMandiCommodities, getMandiPrices } from '../utils/dataService';
import { useTranslation } from '../hooks/useLocalT';

const fallbackT = {
  refresh: 'Refresh',
  loading: 'Fetching mandi rates…',
  retry: 'Retry',
  perQtl: '/ Qtl',
  minMax: 'Min–Max',
  prevDay: 'vs previous report',
};

export default function TabProfit({ selectedLang, isSunlightMode }) {
  const t = useTranslation(selectedLang);
  const [acreage, setAcreage] = useState(3);

  // ── live mandi board state ──
  const [states, setStates] = useState([]);
  const [commodities, setCommodities] = useState([]);
  const [stateSel, setStateSel] = useState('Karnataka');
  const [commoditySel, setCommoditySel] = useState('Tomato');
  const [board, setBoard] = useState(null); // API/cache status + validated rows and market date
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestSeq = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load states once
  useEffect(() => {
    getMandiStates().then((s) => {
      if (mountedRef.current && Array.isArray(s) && s.length) setStates(s);
    });
  }, []);

  // Load commodities whenever state changes
  useEffect(() => {
    getMandiCommodities(stateSel).then((c) => {
      if (mountedRef.current && Array.isArray(c) && c.length) {
        setCommodities(c);
        if (!c.includes(commoditySel)) setCommoditySel(c.includes('Tomato') ? 'Tomato' : c[0]);
      }
    });
  }, [stateSel]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPrices = useCallback(async (isRefresh = false) => {
    const seq = ++requestSeq.current;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const result = await getMandiPrices({ state: stateSel, commodity: commoditySel, forceRefresh: isRefresh });
      if (mountedRef.current && seq === requestSeq.current) setBoard(result);
    } finally {
      if (mountedRef.current && seq === requestSeq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [stateSel, commoditySel]);

  useEffect(() => {
    setBoard(null);
    loadPrices();
  }, [loadPrices]);

  const bioProfit = acreage * 38500;
  const chemProfit = acreage * 19000;
  const cropLoss = acreage * 22000;

  const topModal = board?.rows?.[0]?.modal;
  const boardStatus = !board
    ? null
    : board.live
      ? 'live'
      : board.stale
        ? 'stale'
        : board.cached ? 'cached' : 'unavailable';

  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-4 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Acreage Slider & Profit Comparison (7 cols) */}
        <div className={`lg:col-span-7 p-6 rounded-2xl border space-y-5 shadow-xl ${
          isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-500" />
              <h3 className="text-sm font-bold font-mono">{t.profit.calcTitle}</h3>
            </div>
            <span className="text-xs font-mono px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20">
              {acreage} {t.profit.selectedAcres}
            </span>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 ${isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'}`}>
            <div className="flex justify-between text-xs font-mono">
              <span className={isSunlightMode ? 'text-zinc-600' : 'text-zinc-400'}>{t.profit.landSize}</span>
              <span className="font-bold text-emerald-500">{acreage} Acres</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              value={acreage}
              onChange={(e) => setAcreage(Number(e.target.value))}
              className="w-full h-2 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>1 Acre</span>
              <span>10 Acres</span>
              <span>20 Acres</span>
            </div>
          </div>

          {/* 3 Comparative Financial Tiers */}
          <div className="grid grid-cols-3 gap-2.5 text-center">
            <div className={`p-3.5 rounded-xl border ${isSunlightMode ? 'bg-emerald-50 border-emerald-300' : 'bg-[#18231e] border-emerald-500/30'}`}>
              <div className="text-[10px] font-mono text-emerald-500 font-bold">{t.profit.organicTitle}</div>
              <div className="text-xl font-bold text-emerald-600 mt-1">+₹{bioProfit.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-zinc-500 mt-1 font-mono">{t.profit.costLabel} ₹{acreage * 350}</div>
            </div>
            <div className={`p-3.5 rounded-xl border ${isSunlightMode ? 'bg-amber-50 border-amber-300' : 'bg-[#231e15] border-amber-500/30'}`}>
              <div className="text-[10px] font-mono text-amber-500 font-bold">{t.profit.chemicalTitle}</div>
              <div className="text-xl font-bold text-amber-600 mt-1">+₹{chemProfit.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-zinc-500 mt-1 font-mono">{t.profit.costLabel} ₹{acreage * 1500}</div>
            </div>
            <div className={`p-3.5 rounded-xl border ${isSunlightMode ? 'bg-red-50 border-red-300' : 'bg-[#231515] border-red-500/30'}`}>
              <div className="text-[10px] font-mono text-red-500 font-bold">{t.profit.untreatedTitle}</div>
              <div className="text-xl font-bold text-red-500 mt-1">-₹{cropLoss.toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-zinc-500 mt-1 font-mono">{t.profit.yieldLoss} 60%</div>
            </div>
          </div>

          {/* Sell-value estimator driven by the live modal price */}
          {topModal > 0 && (
            <div className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
              isSunlightMode ? 'bg-emerald-50 border-emerald-300' : 'bg-[#18231e] border-emerald-500/30'
            }`}>
              <div className="flex items-center gap-2.5">
                <ArrowUpRight className="w-5 h-5 text-emerald-500 shrink-0" />
                <div className="text-xs font-bold">
                  {t.mandiLive.sellEstimate.split('{qtl}')[0]}
                  <strong className="font-mono">{(acreage * 8).toLocaleString('en-IN')} Qtl</strong>
                  {t.mandiLive.sellEstimate.split('{qtl}')[1]}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black text-emerald-500 font-mono">
                  ≈ ₹{(acreage * 8 * topModal).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] font-mono text-zinc-500">
                  {commoditySel} · ₹{topModal.toLocaleString('en-IN')} {fallbackT.perQtl} · {stateSel}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: API-backed APMC Mandi Rates (5 cols) */}
        <div className={`lg:col-span-5 p-6 rounded-2xl border space-y-4 shadow-xl ${
          isSunlightMode ? 'bg-white border-zinc-300 text-zinc-900' : 'bg-[#121514] border-[#1f2421] text-white'
        }`}>
          {/* Header + live badge + refresh */}
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <h3 className="text-sm font-bold font-mono">{t.mandiLive.boardTitle}</h3>
            <div className="flex items-center gap-2">
              {board && (
                <span className={`flex items-center gap-1 text-[9px] font-mono font-black px-2 py-0.5 rounded-full border ${
                  boardStatus === 'live'
                    ? 'text-emerald-500 border-emerald-500/40 bg-emerald-500/10'
                    : boardStatus === 'cached'
                      ? 'text-sky-500 border-sky-500/40 bg-sky-500/10'
                      : boardStatus === 'stale'
                        ? 'text-amber-500 border-amber-500/40 bg-amber-500/10'
                        : 'text-red-500 border-red-500/40 bg-red-500/10'
                }`}>
                  {boardStatus === 'live'
                    ? <Radio className="w-2.5 h-2.5 animate-pulse" />
                    : boardStatus === 'unavailable' ? <AlertTriangle className="w-2.5 h-2.5" /> : <Database className="w-2.5 h-2.5" />}
                  {boardStatus === 'live'
                    ? t.mandiLive.liveBadge
                    : boardStatus === 'cached'
                      ? t.mandiLive.freshCacheBadge
                      : boardStatus === 'stale'
                        ? t.mandiLive.staleBadge
                        : t.mandiLive.offlineBadge}
                </span>
              )}
              <button
                onClick={() => loadPrices(true)}
                disabled={refreshing || loading}
                aria-label={fallbackT.refresh}
                className={`p-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                  isSunlightMode ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200' : 'bg-[#181c1a] border-[#232925] text-zinc-300 hover:bg-[#1f2421]'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* State + Crop selectors */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-[10px] font-mono font-bold ${isSunlightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{t.mandiLive.stateLabel}</label>
              <select
                value={stateSel}
                onChange={(e) => setStateSel(e.target.value)}
                className={`mt-1 w-full px-2.5 py-2 rounded-xl border text-xs font-bold outline-none ${
                  isSunlightMode ? 'bg-zinc-100 border-zinc-300 text-zinc-900' : 'bg-[#181c1a] border-[#232925] text-white'
                }`}
              >
                {(states.length ? states : [stateSel]).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={`text-[10px] font-mono font-bold ${isSunlightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{t.mandiLive.cropLabel}</label>
              <select
                value={commoditySel}
                onChange={(e) => setCommoditySel(e.target.value)}
                className={`mt-1 w-full px-2.5 py-2 rounded-xl border text-xs font-bold outline-none ${
                  isSunlightMode ? 'bg-zinc-100 border-zinc-300 text-zinc-900' : 'bg-[#181c1a] border-[#232925] text-white'
                }`}
              >
                {(commodities.length ? commodities : [commoditySel]).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Board meta */}
          {board?.latestDate && !loading && (
            <div className={`space-y-1 text-[10px] font-mono ${isSunlightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-500" />
                  {board.rows.length} {t.mandiLive.marketsShowing}
                </span>
                <span>{t.mandiLive.marketDateLabel}: {formatDate(board.latestDate)}</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                {board.sourceFetchedAt && (
                  <span>{t.mandiLive.recordFetchedAtLabel}: {formatTime(board.sourceFetchedAt)}</span>
                )}
                <span>{t.mandiLive.fetchedAtLabel}: {formatTime(board.fetchedAt)}</span>
              </div>
            </div>
          )}

          {/* Price list */}
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5" style={{ scrollbarWidth: 'thin' }}>
            {loading && (
              <div className="space-y-2 animate-pulse">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`p-3 rounded-xl border h-[58px] ${isSunlightMode ? 'bg-zinc-100 border-zinc-200' : 'bg-[#181c1a] border-[#232925]'}`} />
                ))}
                <div className={`text-center text-[11px] font-mono pt-1 ${isSunlightMode ? 'text-zinc-500' : 'text-zinc-400'}`}>{fallbackT.loading}</div>
              </div>
            )}

            {!loading && board?.empty && (
              <div className={`p-4 rounded-xl border text-xs font-bold text-center ${isSunlightMode ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-[#231e15] border-amber-500/30 text-amber-400'}`}>
                {t.mandiLive.empty}
              </div>
            )}

            {!loading && board?.error && !board?.rows?.length && (
              <div className={`p-4 rounded-xl border text-xs font-bold text-center space-y-2 ${isSunlightMode ? 'bg-red-50 border-red-300 text-red-600' : 'bg-[#231515] border-red-500/30 text-red-400'}`}>
                <div className="flex items-center justify-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {t.mandiLive.errorMsg}</div>
                <button onClick={() => loadPrices()} className="px-3 py-1.5 rounded-lg bg-red-500 text-white font-black">{fallbackT.retry}</button>
              </div>
            )}

            {!loading && board?.rows?.map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  isSunlightMode ? 'bg-zinc-100 border-zinc-300' : 'bg-[#181c1a] border-[#232925]'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-bold truncate">{m.market.replace(/ APMC$/, '')}</div>
                  <div className="text-[10px] text-zinc-500 font-mono truncate">
                    {m.district}{m.variety && m.variety !== m.crop ? ` · ${m.variety}` : ''}
                  </div>
                  <div className="text-[9px] text-zinc-500 font-mono mt-0.5">
                    {fallbackT.minMax}: ₹{m.min.toLocaleString('en-IN')}–₹{m.max.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="text-right font-mono shrink-0 pl-2">
                  <div className="font-black text-sm">₹{m.modal.toLocaleString('en-IN')} <span className="text-[9px] font-bold text-zinc-500">{fallbackT.perQtl}</span></div>
                  <div className={`text-[10px] flex items-center justify-end gap-0.5 font-bold ${
                    m.trend === 'up' ? 'text-emerald-500' : m.trend === 'down' ? 'text-red-500' : 'text-zinc-500'
                  }`}>
                    {m.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : m.trend === 'down' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    <span>
                      {m.change == null ? '—' : `${m.change > 0 ? '+' : '−'}₹${Math.abs(m.change).toLocaleString('en-IN')}`}
                      {m.change != null && ` ${fallbackT.prevDay}`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className={`text-[9px] font-mono text-center pt-1 ${isSunlightMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {t.mandiLive.poweredBy}
          </div>
        </div>
      </div>
    </div>
  );
}
