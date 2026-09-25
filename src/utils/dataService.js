// ─────────────────────────────────────────────────────────────────────────────
// AgriPulse AI — Live Data Services
//
//  1. Mandi Prices → https://mandi-api.onrender.com/v1 (keyless third-party API)
//     Supports Maharashtra, Uttar Pradesh, Punjab, Madhya Pradesh & Karnataka.
//     Provider claims a data.gov.in mirror; provenance is not independently verified.
//     Rate limit: 100 req / 15 min / IP → validated API responses cached briefly.
//
//  2. Weather (IMD) → https://weather.indianapi.in (needs x-api-key)
//     Current conditions + 7-day IMD forecast for Indian cities.
//     Set VITE_WEATHER_API_KEY in .env — without a key we fall back to a
//     realistic simulated dataset so the Radar UI always stays functional.
// ─────────────────────────────────────────────────────────────────────────────

const MANDI_BASE = (import.meta.env.VITE_MANDI_API_BASE || 'https://mandi-api.onrender.com/v1').replace(/\/$/, '');
const WEATHER_BASE = (import.meta.env.VITE_WEATHER_API_BASE || 'https://weather.indianapi.in').replace(/\/$/, '');
const WEATHER_KEY = import.meta.env.VITE_WEATHER_API_KEY || '';

const MANDI_CACHE_TTL_MS = 10 * 60 * 1000;  // 10 min; respects API's 100 requests / 15 min limit
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

export const FALLBACK_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh',
  'Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand',
  'West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry','Chandigarh','Andaman and Nicobar Islands',
  'Dadra and Nagar Haveli and Daman and Diu','Lakshadweep'
];

export const ALL_INDIAN_STATES = [...FALLBACK_STATES];

export const STATE_CODE_MAP = {
  'Andhra Pradesh': 'AP','Arunachal Pradesh': 'AR','Assam': 'AS','Bihar': 'BR','Chhattisgarh': 'CG','Goa': 'GA',
  'Gujarat': 'GJ','Haryana': 'HR','Himachal Pradesh': 'HP','Jharkhand': 'JH','Karnataka': 'KA','Kerala': 'KL',
  'Madhya Pradesh': 'MP','Maharashtra': 'MH','Manipur': 'MN','Meghalaya': 'ML','Mizoram': 'MZ','Nagaland': 'NL',
  'Odisha': 'OR','Punjab': 'PB','Rajasthan': 'RJ','Sikkim': 'SK','Tamil Nadu': 'TN','Telangana': 'TS',
  'Tripura': 'TR','Uttar Pradesh': 'UP','Uttarakhand': 'UK','West Bengal': 'WB','Delhi': 'DL',
  'Jammu and Kashmir': 'JK','Ladakh': 'LA','Puducherry': 'PY','Chandigarh': 'CH'
};

export const COMMON_COMMODITIES = [
  'Onion', 'Tomato', 'Potato', 'Wheat', 'Rice', 'Maize', 'Cotton',
  'Soyabean', 'Gram', 'Bajra', 'Jowar', 'Sugarcane', 'Groundnut', 'Turmeric',
  'Mustard','Moong','Urad','Masoor','Arhar','Sunflower','Sesame','Barley',
  'Ragi','Coconut','Chilli','Garlic','Ginger','Mango','Banana','Apple',
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
    const apiList = (Array.isArray(json?.data) ? json.data : [])
      .map((c) => (typeof c === 'string' ? c.trim() : c?.commodity || c?.name))
      .filter(Boolean);
    if (json?.success !== true || apiList.length === 0) throw new Error('Mandi commodity list unavailable');

    // The mirror's commodity directory can lag its price records. Keep common
    // crops selectable and let the live price endpoint confirm availability.
    const list = [...new Set([...COMMON_COMMODITIES, ...apiList])];
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
function parsePrice(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function normalizeMandiDate(value) {
  const date = String(value || '').trim();
  let normalized = date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const dayFirst = date.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (!dayFirst) return '';
    normalized = `${dayFirst[3]}-${dayFirst[2].padStart(2, '0')}-${dayFirst[1].padStart(2, '0')}`;
  }
  const parsed = new Date(`${normalized}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized ? '' : normalized;
}

function isValidMandiDate(date) {
  const indiaToday = new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
  return Boolean(date && date <= indiaToday);
}

/** Drop malformed mandi rows rather than presenting impossible price ranges. */
function normalizeRow(r) {
  if (!r || typeof r !== 'object') return null;

  const state = String(r.state || '').trim();
  const market = String(r.market || '').trim();
  const crop = String(r.commodity || '').trim();
  const variety = String(r.variety || '').trim();
  const date = normalizeMandiDate(r.arrival_date);
  const parsedFetchedAt = Date.parse(String(r.fetched_at || ''));
  const min = parsePrice(r.min_price);
  const max = parsePrice(r.max_price);
  const modal = parsePrice(r.modal_price);

  if (!state || !market || !crop || !isValidMandiDate(date) || min == null || max == null || modal == null) return null;
  if (min <= 0 || min > max || max > 1_000_000 || modal <= 0 || modal < min || modal > max) return null;

  return {
    id: r.id ?? `${state}-${market}-${crop}-${variety}-${date}`,
    state,
    district: String(r.district || '').trim(),
    market,
    crop,
    variety,
    date,
    sourceFetchedAt: Number.isFinite(parsedFetchedAt) && parsedFetchedAt > 0 ? parsedFetchedAt : null,
    min,
    max,
    modal,
  };
}

function isValidCachedRow(row) {
  if (!row || typeof row !== 'object') return false;
  const min = parsePrice(row.min);
  const max = parsePrice(row.max);
  const modal = parsePrice(row.modal);
  return Boolean(
    String(row.state || '').trim() && String(row.market || '').trim() && String(row.crop || '').trim()
    && isValidMandiDate(normalizeMandiDate(row.date)) && min != null && max != null && modal != null
    && min > 0 && min <= max && max <= 1_000_000 && modal > 0 && modal >= min && modal <= max,
  );
}

function validateCachedMandiResult(value) {
  if (!value || !Array.isArray(value.rows)) return null;
  const rows = value.rows.filter(isValidCachedRow);
  if (rows.length === 0 && value.empty !== true) return null;
  return { ...value, rows };
}

/**
 * CEDA Agmarknet fallback (same-origin `/api/mandi`, bearer token stays server-side).
 * CEDA republishes Agmarknet with a validation lag, so this returns the most recent
 * verified state-level session instead of a same-day market board.
 */
async function getCedaBoard(state, commodity) {
  const json = await fetchJson(
    `/api/mandi?action=prices&state=${encodeURIComponent(state)}&commodity=${encodeURIComponent(commodity)}`,
    { timeoutMs: 45000 },
  );
  const series = Array.isArray(json?.series) ? json.series : [];
  if (!series.length) {
    return { live: false, cached: false, rows: [], latestDate: null, fetchedAt: Date.now(), empty: true, source: 'ceda' };
  }
  const last = series[series.length - 1];
  const prev = series[series.length - 2] || null;
  const change = prev ? Math.round(last.modal - prev.modal) : null;

  const rows = [{
    id: `ceda-${json.state}-${json.commodity}-${last.date}`,
    state: json.state || state,
    district: 'CEDA Agmarknet (verified)',
    market: `${json.state || state} — state average`,
    crop: json.commodity || commodity,
    variety: '',
    date: last.date,
    sourceFetchedAt: json.fetchedAt || null,
    min: last.min,
    max: last.max,
    modal: last.modal,
    change,
    trend: change == null ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
  }];

  return {
    live: false,
    cached: false,
    stale: true,
    rows,
    latestDate: last.date,
    prevDate: prev?.date || null,
    sourceFetchedAt: json.fetchedAt || null,
    fetchedAt: Date.now(),
    source: 'ceda',
    series,
  };
}

/**
 * Fetch live mandi prices and compute per-market day-over-day trend.
 * Only API-returned, range-validated rows (or their validated local cache) are
 * returned; the app does not invent fallback price rows when the service fails.
 */
export async function getMandiPrices({ state, commodity, forceRefresh = false } = {}) {
  const params = new URLSearchParams();
  if (state) params.set('state', state);
  if (commodity) params.set('commodity', commodity);
  const cacheKey = `ap_cache_mandi_prices_${state || ''}_${commodity || ''}`;

  if (!forceRefresh) {
    const fresh = validateCachedMandiResult(cacheGetFresh(cacheKey, MANDI_CACHE_TTL_MS));
    if (fresh) return { ...fresh, live: false, cached: true, stale: false };
  }

  try {
    if (!state && !commodity) throw new Error('Choose a state or crop to fetch mandi prices.');

    const json = await fetchJson(`${MANDI_BASE}/prices?${params}`);
    if (json?.success !== true || !Array.isArray(json?.data)) {
      throw new Error(json?.error?.message || 'Mandi API returned an invalid response.');
    }

    const rawRecords = json.data;
    const validRecords = rawRecords.map(normalizeRow).filter(Boolean);
    if (rawRecords.length > 0 && validRecords.length === 0) {
      throw new Error('The mandi API returned rows with invalid dates or price ranges.');
    }
    const matchesQuery = (value, query) => !query || String(value).trim().toLocaleLowerCase() === String(query).trim().toLocaleLowerCase();
    const records = validRecords.filter((row) => matchesQuery(row.state, state) && matchesQuery(row.crop, commodity));

    if (records.length === 0) {
      // Nothing live for this crop/state — fall back to CEDA's verified Agmarknet series.
      try {
        const ceda = await getCedaBoard(state, commodity);
        if (ceda.rows.length) {
          cacheSet(cacheKey, ceda);
          return ceda;
        }
      } catch { /* keep the empty-state message below */ }

      const result = { live: true, cached: false, rows: [], latestDate: null, fetchedAt: Date.now(), empty: true };
      cacheSet(cacheKey, result);
      return result;
    }

    const dates = [...new Set(records.map((r) => r.date))].sort().reverse();
    const latestDate = dates[0];
    const prevDate = dates[1] || null;
    const latestRecords = records.filter((r) => r.date === latestDate);
    const sourceFetchedAt = latestRecords.reduce(
      (latest, row) => Math.max(latest, row.sourceFetchedAt || 0),
      0,
    ) || null;

    const marketKey = (row) => `${row.state}::${row.district}::${row.market}::${row.variety}`;
    const prevByMarket = new Map();
    if (prevDate) {
      records.filter((r) => r.date === prevDate).forEach((r) => {
        prevByMarket.set(marketKey(r), r.modal);
      });
    }

    const rows = latestRecords
      .map((r) => {
        const prev = prevByMarket.get(marketKey(r));
        const change = prev != null ? r.modal - prev : null;
        return { ...r, change, trend: change == null ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat' };
      })
      .sort((a, b) => b.modal - a.modal);

    const result = { live: true, cached: false, rows, latestDate, prevDate, sourceFetchedAt, fetchedAt: Date.now() };
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    // Revalidate stored rows too, including entries created by an older app
    // version, before using them as a stale fallback.
    const staleEntry = cacheGet(cacheKey);
    const stale = validateCachedMandiResult(staleEntry?.value);
    if (stale) {
      return { ...stale, live: false, cached: true, stale: true, error: err.message };
    }

    // Live mirror down → CEDA Agmarknet via the same-origin proxy.
    if (state && commodity) {
      try {
        const ceda = await getCedaBoard(state, commodity);
        if (ceda.rows.length) {
          cacheSet(cacheKey, ceda);
          return { ...ceda, error: err.message };
        }
      } catch { /* fall through to the unavailable state */ }
    }
    return {
      live: false,
      cached: false,
      stale: false,
      error: err.message || 'Mandi API is unavailable.',
      latestDate: null,
      fetchedAt: Date.now(),
      rows: [],
    };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  WEATHER API (indianapi.in — IMD data)
// ═════════════════════════════════════════════════════════════════════════════

// The weather key now lives in the server environment (WEATHERAPI_KEY) and is
// reached through the same-origin /api/weather proxy. We stay optimistic until the
// proxy reports that it is not configured.
let serverWeatherConfigured = true;

export function hasWeatherKey() {
  return Boolean(WEATHER_KEY) || serverWeatherConfigured;
}

/** Same-origin weatherapi.com proxy — no key in the browser bundle. */
async function getWeatherViaProxy(city) {
  const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`, { headers: { accept: 'application/json' } });
  if (res.status === 503) {
    serverWeatherConfigured = false;
    throw new Error('no_server_key');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!json || json.error) throw new Error(json?.error || 'weather_proxy_error');
  serverWeatherConfigured = true;
  return json;
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

  const fresh = cacheGetFresh(cacheKey, WEATHER_CACHE_TTL_MS);
  if (fresh) return fresh;

  // 1) Preferred path: same-origin proxy backed by WEATHERAPI_KEY on the server.
  try {
    const out = await getWeatherViaProxy(city);
    cacheSet(cacheKey, out);
    return out;
  } catch {
    /* fall through to the legacy key path / simulation */
  }

  if (!WEATHER_KEY) {
    const stale = cacheGet(cacheKey);
    if (stale) return { ...stale.value, live: false, stale: true, error: 'proxy_unavailable' };
    return { ...simulatedWeather(city), error: 'no_api_key' };
  }

  // 2) Legacy optional path: indianapi.in via VITE_WEATHER_API_KEY, if someone set it.
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

// ── auto-location for farmer-first automation ────────────────────────────────

function roughStateFromLatLon(lat, lon) {
  // Very rough bounding boxes for demo — good enough to auto-select state
  if (lat >= 32) return lat > 34 ? 'Jammu and Kashmir' : 'Punjab';
  if (lat >= 29) {
    if (lon < 77) return 'Haryana';
    if (lon < 80) return 'Uttar Pradesh';
    return 'Uttarakhand';
  }
  if (lat >= 26) {
    if (lon < 73) return 'Rajasthan';
    if (lon < 77) return 'Haryana';
    if (lon < 85) return 'Bihar';
    if (lon >= 88) return 'Assam';
    return 'Uttar Pradesh';
  }
  if (lat >= 22) {
    if (lon < 72) return 'Gujarat';
    if (lon < 76) return 'Madhya Pradesh';
    if (lon < 81) return 'Maharashtra';
    if (lon < 86) return 'Chhattisgarh';
    return 'West Bengal';
  }
  if (lat >= 18) {
    if (lon < 76) return 'Maharashtra';
    if (lon < 80) return 'Karnataka';
    if (lon < 84) return 'Telangana';
    return 'Odisha';
  }
  if (lat >= 14) {
    if (lon < 77) return 'Karnataka';
    return 'Andhra Pradesh';
  }
  if (lat >= 10) return 'Tamil Nadu';
  return 'Kerala';
}

export async function detectUserState() {
  const cacheKey = 'ap_cache_detected_state';
  const fresh = cacheGetFresh(cacheKey, 6 * 60 * 60 * 1000);
  if (fresh) return fresh;

  if (!navigator.geolocation) throw new Error('Geolocation not supported');

  const pos = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 600000,
    });
  });

  const { latitude, longitude } = pos.coords;
  let detectedState = roughStateFromLatLon(latitude, longitude);
  let detectedCity = null;

  // Try reverse geocode if online for better accuracy
  if (navigator.onLine) {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`, {
        headers: { Accept: 'application/json' },
      });
      const json = await res.json();
      const city = json?.address?.city || json?.address?.town || json?.address?.village || json?.address?.county || null;
      const state = json?.address?.state || '';
      if (city) detectedCity = city;
      if (state) {
        const matched = ALL_INDIAN_STATES.find(s => s.toLowerCase() === state.toLowerCase() || state.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(state.toLowerCase()));
        if (matched) detectedState = matched;
      }
    } catch {
      // keep rough guess
    }
  }

  const result = { state: detectedState, city: detectedCity, lat: latitude, lon: longitude, at: Date.now() };
  cacheSet(cacheKey, result);
  return result;
}

export async function detectUserLocation() {
  try {
    const r = await detectUserState();
    return r;
  } catch {
    return null;
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
