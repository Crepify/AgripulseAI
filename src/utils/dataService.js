// ─────────────────────────────────────────────────────────────────────────────
// AgriPulse AI — Live Data Services
//
//  1. Mandi Prices  → https://mandi-api.onrender.com/v1 (keyless, free)
//     Daily wholesale (APMC) prices for Maharashtra, Uttar Pradesh, Punjab,
//     Madhya Pradesh & Karnataka, mirrored from data.gov.in.
//     Rate limit: 100 req / 15 min / IP  →  responses are cached 30 minutes.
//
//  2. Weather (IMD) → https://weather.indianapi.in (needs x-api-key)
//     Current conditions + 7-day IMD forecast for Indian cities.
//     Set VITE_WEATHER_API_KEY in .env — without a key we fall back to a
//     realistic simulated dataset so the Radar UI always stays functional.
// ─────────────────────────────────────────────────────────────────────────────

import { MANDI_PRICES } from '../data/agriData';

const MANDI_BASE = (import.meta.env.VITE_MANDI_API_BASE || 'https://mandi-api.onrender.com/v1').replace(/\/$/, '');
const WEATHER_BASE = (import.meta.env.VITE_WEATHER_API_BASE || 'https://weather.indianapi.in').replace(/\/$/, '');
const WEATHER_KEY = import.meta.env.VITE_WEATHER_API_KEY || '';

const MANDI_CACHE_TTL_MS = 30 * 60 * 1000;   // 30 min (protects the 100/15min rate limit)
const WEATHER_CACHE_TTL_MS = 20 * 60 * 1000; // 20 min

// ── generic helpers ──────────────────────────────────────────────────────────

async function fetchJson(url, { headers = {}, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { accept: 'application/json', ...headers }, signal: controller.signal });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw); // { at, value }
  } catch {
    return null;
  }
}

function cacheSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // storage full — skip caching
  }
}

function cacheGetFresh(key, ttl) {
  const entry = cacheGet(key);
  if (entry && Date.now() - entry.at < ttl) return entry.value;
  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
//  MANDI PRICE API
// ═════════════════════════════════════════════════════════════════════════════

export const FALLBACK_STATES = ['Maharashtra', 'Uttar Pradesh', 'Punjab', 'Madhya Pradesh', 'Karnataka'];

export const COMMON_COMMODITIES = [
  'Onion', 'Tomato', 'Potato', 'Wheat', 'Rice', 'Maize', 'Cotton',
  'Soyabean', 'Gram', 'Bajra', 'Jowar', 'Sugarcane', 'Groundnut', 'Turmeric',
];

export async function getMandiStates() {
  const cacheKey = 'ap_cache_mandi_states';
  const fresh = cacheGetFresh(cacheKey, 24 * 60 * 60 * 1000);
  if (fresh) return fresh;
  try {
    const json = await fetchJson(`${MANDI_BASE}/states`);
    const states = Array.isArray(json?.data) ? json.data : FALLBACK_STATES;
    cacheSet(cacheKey, states);
    return states;
  } catch {
    return FALLBACK_STATES;
  }
}

export async function getMandiCommodities(state) {
  const cacheKey = `ap_cache_mandi_commodities_${state}`;
  const fresh = cacheGetFresh(cacheKey, 24 * 60 * 60 * 1000);
  if (fresh) return fresh;
  try {
    const json = await fetchJson(`${MANDI_BASE}/commodities?state=${encodeURIComponent(state)}`);
    const list = (Array.isArray(json?.data) ? json.data : [])
      .map((c) => (typeof c === 'string' ? c : c?.commodity || c?.name))
      .filter(Boolean);
    if (list.length === 0) throw new Error('empty');
    cacheSet(cacheKey, list);
    return list;
  } catch {
    return COMMON_COMMODITIES;
  }
}

/**
 * Normalize one raw API record → flat row used by the UI.
 * Raw shape: { state, district, market, commodity, variety, grade,
 *              arrival_date, min_price, max_price, modal_price }
 */
function normalizeRow(r) {
  return {
    id: r.id,
    state: r.state,
    district: r.district || '',
    market: r.market || '',
    crop: r.commodity || '',
    variety: r.variety || '',
    date: r.arrival_date || '',
    min: Number(r.min_price) || 0,
    max: Number(r.max_price) || 0,
    modal: Number(r.modal_price) || 0,
  };
}

/**
 * Fetch live mandi prices and compute per-market day-over-day trend.
 * Returns { live, rows, latestDate, fetchedAt, error? } where rows are the
 * newest-dated records, each with { change, trend } vs. the previous date.
 */
export async function getMandiPrices({ state, commodity } = {}) {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (commodity) params.set('commodity', commodity);
  const cacheKey = `ap_cache_mandi_prices_${state || ''}_${commodity || ''}`;

  try {
    const json = await fetchJson(`${MANDI_BASE}/prices?${params}`);
    const records = (json?.success && Array.isArray(json.data) ? json.data : []).map(normalizeRow);
    if (records.length === 0) {
      return { live: true, rows: [], latestDate: null, fetchedAt: Date.now(), empty: true };
    }

    const dates = [...new Set(records.map((r) => r.date))].sort().reverse();
    const latestDate = dates[0];
    const prevDate = dates[1] || null;

    const prevByMarket = new Map();
    if (prevDate) {
      records.filter((r) => r.date === prevDate).forEach((r) => {
        if (!prevByMarket.has(r.market)) prevByMarket.set(r.market, r.modal);
      });
    }

    const rows = records
      .filter((r) => r.date === latestDate)
      .map((r) => {
        const prev = prevByMarket.get(r.market);
        const change = prev != null ? r.modal - prev : null;
        return { ...r, change, trend: change == null ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat' };
      })
      .sort((a, b) => b.modal - a.modal);

    const result = { live: true, rows, latestDate, prevDate, fetchedAt: Date.now() };
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    // Serve stale cache if we have it, else curated fallback rows
    const stale = cacheGet(cacheKey);
    if (stale) return { ...stale.value, live: false, stale: true, error: err.message };
    return {
      live: false,
      stale: false,
      error: err.message,
      latestDate: null,
      fetchedAt: Date.now(),
      rows: MANDI_PRICES.map((m, i) => ({
        id: `fallback-${i}`,
        state: state || 'India',
        district: '',
        market: m.market,
        crop: m.crop,
        variety: '',
        date: '',
        min: m.price - 150,
        max: m.price + 150,
        modal: m.price,
        change: parseInt(m.change.replace(/[₹+,]/g, ''), 10) || 0,
        trend: m.trend,
      })),
    };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  WEATHER API (indianapi.in — IMD data)
// ═════════════════════════════════════════════════════════════════════════════

export function hasWeatherKey() {
  return Boolean(WEATHER_KEY);
}

// Realistic monsoon-season simulated data so the Radar stays fully usable
// until the user pastes their indianapi.in key into .env
function simulatedWeather(city) {
  const cityName = city || 'Mandya';
  return {
    live: false,
    city: cityName,
    tempMax: 31.5,
    tempMin: 22.4,
    tempMaxDep: -1.1,
    tempMinDep: 0.6,
    humidityMorning: 86,
    humidityEvening: 68,
    rainfallMm: null,
    windKmh: 9.5,
    sunrise: '06:08',
    sunset: '18:32',
    condition: 'Partly cloudy sky with possibility of rain or thundershower',
    forecast: Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() + (i + 1) * 86400000);
      const rainy = i % 3 !== 0;
      return {
        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        maxTemp: rainy ? 29 + i * 0.4 : 31 + i * 0.3,
        minTemp: 21 + i * 0.2,
        description: rainy
          ? 'Generally cloudy sky with Light rain'
          : 'Partly cloudy sky',
      };
    }),
  };
}

/**
 * Fetch live IMD weather for an Indian city.
 * Returns normalized shape:
 *  { live, city, tempMax, tempMin, humidityMorning, humidityEvening,
 *    rainfallMm, windKmh|null, sunrise, sunset, condition, forecast[7], error? }
 */
export async function getIndiaWeather(city = 'Mandya') {
  const cacheKey = `ap_cache_weather_${city.toLowerCase()}`;

  if (!WEATHER_KEY) {
    return { ...simulatedWeather(city), error: 'no_api_key' };
  }

  const fresh = cacheGetFresh(cacheKey, WEATHER_CACHE_TTL_MS);
  if (fresh) return fresh;

  try {
    const json = await fetchJson(
      `${WEATHER_BASE}/india/weather?city=${encodeURIComponent(city)}`,
      { headers: { 'x-api-key': WEATHER_KEY } }
    );

    const w = json?.weather || {};
    const cur = w.current || {};
    const astro = w.astronomical || {};

    const out = {
      live: true,
      city: json.city || city,
      tempMax: cur?.temperature?.max?.value ?? null,
      tempMin: cur?.temperature?.min?.value ?? null,
      tempMaxDep: cur?.temperature?.max?.departure ?? null,
      tempMinDep: cur?.temperature?.min?.departure ?? null,
      humidityMorning: cur?.humidity?.morning ?? null,
      humidityEvening: cur?.humidity?.evening ?? null,
      rainfallMm: cur?.rainfall ?? null,
      windKmh: null,
      sunrise: astro.sunrise || null,
      sunset: astro.sunset || null,
      condition: w?.forecast?.[0]?.description || 'IMD Current Observations',
      forecast: (Array.isArray(w.forecast) ? w.forecast : []).map((f) => ({
        date: f.date,
        maxTemp: f.max_temp,
        minTemp: f.min_temp,
        description: f.description,
      })),
      fetchedAt: Date.now(),
    };

    // Wind speed is only on the global endpoint — best-effort, non-fatal
    try {
      const g = await fetchJson(
        `${WEATHER_BASE}/global/current?location=${encodeURIComponent(city)}`,
        { headers: { 'x-api-key': WEATHER_KEY }, timeoutMs: 10000 }
      );
      if (typeof g?.wind_speed === 'number') out.windKmh = g.wind_speed;
    } catch {
      /* wind stays null — advisory uses humidity/rain instead */
    }

    cacheSet(cacheKey, out);
    return out;
  } catch (err) {
    const stale = cacheGet(cacheKey);
    if (stale) return { ...stale.value, live: false, stale: true, error: err.message };
    return { ...simulatedWeather(city), error: err.message, failedLive: true };
  }
}

// ── backward-compatible shim (old callers) ───────────────────────────────────

export async function getWeatherData() {
  const w = await getIndiaWeather('Mandya');
  return {
    temp: w.tempMax ?? 26,
    humidity: w.humidityMorning ?? 82,
    wind: w.windKmh ?? 12,
    risk: (w.humidityMorning ?? 82) > 80 ? 'High Risk' : 'Low Risk',
  };
}

export { getMandiPrices as default };
