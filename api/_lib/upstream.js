/**
 * Shared server-side helpers for the AgriPulse API routes.
 *
 * Every private key lives here (process.env), never in a VITE_* variable:
 *   WEATHERAPI_KEY   weatherapi.com key           → /api/weather
 *   CEDA_API_KEY     CEDA Agmarknet bearer token  → /api/mandi
 *   ULTRALYTICS_*    handled in api/predict.js
 */

const WEATHER_KEY = process.env.WEATHERAPI_KEY || process.env.WEATHER_API_KEY || '';
const CEDA_KEY = process.env.CEDA_API_KEY || '';
const CEDA_BASE = (process.env.CEDA_API_BASE || 'https://api.ceda.ashoka.edu.in/v1/agmarknet').replace(/\/$/, '');

export const hasWeatherKey = () => Boolean(WEATHER_KEY);
export const hasCedaKey = () => Boolean(CEDA_KEY);

// ── tiny in-memory cache (per serverless instance) ───────────────────────────
const cache = new Map();
function cached(key, ttlMs, producer) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = producer().then(
    (v) => { cache.set(key, { at: Date.now(), value: Promise.resolve(v) }); return v; },
    (e) => { cache.delete(key); throw e; },
  );
  cache.set(key, { at: Date.now(), value });
  return value;
}

async function fetchJson(url, opts = {}, timeoutMs = 25_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON upstream error page */ }
    if (!res.ok) {
      const err = new Error(json?.error || json?.message || `Upstream HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return json;
  } finally {
    clearTimeout(timer);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  WEATHER  (weatherapi.com — 7 day forecast + current conditions)
// ═════════════════════════════════════════════════════════════════════════════

const to12h = (s) => (s || '').replace(/^0/, '') || null;
const to24h = (s) => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((s || '').trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (/pm/i.test(m[3])) h += 12;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
};

export async function getWeather(city) {
  const q = String(city || 'Mandya').trim().slice(0, 80);
  if (!WEATHER_KEY) {
    const err = new Error('Weather API key is not configured on the server');
    err.status = 503;
    throw err;
  }
  return cached(`wx:${q.toLowerCase()}`, 15 * 60 * 1000, async () => {
    // Bias plain city names to India (otherwise "Delhi" resolves to Delhi, Ontario).
    const isCoordsOrPostcode = /^-?\d/.test(q);
    const query = isCoordsOrPostcode || /india/i.test(q) || q.includes(',') ? q : `${q}, India`;
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${encodeURIComponent(WEATHER_KEY)}`
      + `&q=${encodeURIComponent(query)}&days=7&aqi=no&alerts=no`;
    const j = await fetchJson(url);
    const cur = j.current || {};
    const days = Array.isArray(j.forecast?.forecastday) ? j.forecast.forecastday : [];
    const today = days[0] || {};

    return {
      live: true,
      city: [j.location?.name, j.location?.region].filter(Boolean).join(', ') || q,
      tempMax: today.day?.maxtemp_c ?? cur.temp_c ?? null,
      tempMin: today.day?.mintemp_c ?? null,
      humidityMorning: today.day?.avghumidity ?? cur.humidity ?? null,
      humidityEvening: cur.humidity ?? null,
      rainfallMm: today.day?.totalprecip_mm ?? cur.precip_mm ?? 0,
      windKmh: cur.wind_kph != null ? Math.round(cur.wind_kph) : null,
      sunrise: to24h(today.astro?.sunrise) || to12h(today.astro?.sunrise),
      sunset: to24h(today.astro?.sunset) || to12h(today.astro?.sunset),
      condition: cur.condition?.text || today.day?.condition?.text || 'Current conditions',
      forecast: days.map((d) => ({
        date: d.date,
        maxTemp: d.day?.maxtemp_c,
        minTemp: d.day?.mintemp_c,
        description: [d.day?.condition?.text, d.day?.daily_chance_of_rain != null ? `${d.day.daily_chance_of_rain}% rain` : null]
          .filter(Boolean).join(' · '),
      })),
      source: 'weatherapi.com',
      fetchedAt: Date.now(),
    };
  });
}

// ═════════════════════════════════════════════════════════════════════════════
//  MANDI  (CEDA Agmarknet — bearer token stays server-side)
// ═════════════════════════════════════════════════════════════════════════════

function cedaHeaders(json = false) {
  const h = { Authorization: `Bearer ${CEDA_KEY}`, accept: 'application/json' };
  if (json) h['content-type'] = 'application/json';
  return h;
}

function requireCeda() {
  if (!CEDA_KEY) {
    const err = new Error('CEDA_API_KEY is not configured on the server');
    err.status = 503;
    throw err;
  }
}

/** [{ commodity_id, commodity_name }] */
export async function cedaCommodities() {
  requireCeda();
  return cached('ceda:commodities', 24 * 60 * 60 * 1000, async () => {
    const j = await fetchJson(`${CEDA_BASE}/commodities`, { headers: cedaHeaders() });
    return (j?.output?.data || []).map((c) => ({ id: c.commodity_id, name: c.commodity_name }));
  });
}

/** [{ id, name, districts: [{ id, name }] }] */
export async function cedaGeographies() {
  requireCeda();
  return cached('ceda:geographies', 24 * 60 * 60 * 1000, async () => {
    const j = await fetchJson(`${CEDA_BASE}/geographies`, { headers: cedaHeaders() });
    const byState = new Map();
    for (const row of j?.output?.data || []) {
      if (!byState.has(row.census_state_id)) {
        byState.set(row.census_state_id, { id: row.census_state_id, name: row.census_state_name, districts: [] });
      }
      byState.get(row.census_state_id).districts.push({ id: row.census_district_id, name: row.census_district_name });
    }
    return [...byState.values()].sort((a, b) => a.name.localeCompare(b.name));
  });
}

const norm = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

async function resolveIds(stateName, commodityName) {
  const [states, commodities] = await Promise.all([cedaGeographies(), cedaCommodities()]);
  const state = states.find((s) => norm(s.name) === norm(stateName))
    || states.find((s) => norm(s.name).includes(norm(stateName)) && norm(stateName).length > 2);
  const wanted = norm(commodityName);
  const commodity = commodities.find((c) => norm(c.name) === wanted)
    || commodities.find((c) => norm(c.name).startsWith(wanted) && wanted.length > 2)
    || commodities.find((c) => norm(c.name).includes(wanted) && wanted.length > 2);
  return { state, commodity, states, commodities };
}

/**
 * CEDA publishes validated Agmarknet series with a reporting lag, so we ask for a
 * wide window and return the most recent days available.
 */
export async function cedaPrices({ state, commodity, days = 400 }) {
  requireCeda();
  const { state: st, commodity: cm } = await resolveIds(state, commodity);
  if (!st) { const e = new Error(`Unknown state: ${state}`); e.status = 400; throw e; }
  if (!cm) { const e = new Error(`Unknown commodity: ${commodity}`); e.status = 400; throw e; }

  const key = `ceda:prices:${st.id}:${cm.id}:${days}`;
  return cached(key, 6 * 60 * 60 * 1000, async () => {
    const to = new Date();
    const from = new Date(to.getTime() - days * 86400000);
    const body = {
      commodity_id: cm.id,
      state_id: st.id,
      from_date: from.toISOString().slice(0, 10),
      to_date: to.toISOString().slice(0, 10),
    };
    const j = await fetchJson(`${CEDA_BASE}/prices`, { method: 'POST', headers: cedaHeaders(true), body: JSON.stringify(body) }, 60_000);
    const series = (j?.output?.data || [])
      .map((r) => ({
        date: String(r.date || '').slice(0, 10),
        min: Math.round(Number(r.min_price)),
        max: Math.round(Number(r.max_price)),
        modal: Math.round(Number(r.modal_price)),
      }))
      .filter((r) => r.date && Number.isFinite(r.min) && Number.isFinite(r.max) && Number.isFinite(r.modal) && r.modal > 0)
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      source: 'ceda-agmarknet',
      state: st.name,
      commodity: cm.name,
      requestedFrom: body.from_date,
      requestedTo: body.to_date,
      series: series.slice(-60),
      fetchedAt: Date.now(),
    };
  });
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
