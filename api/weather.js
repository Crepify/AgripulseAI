/**
 * Vercel Function  GET /api/weather?city=Mandya
 *
 * Proxies weatherapi.com so WEATHERAPI_KEY stays in Vercel's environment variables
 * and never ships inside the browser bundle.
 */
import { getWeather, hasWeatherKey, jsonResponse } from './_lib/upstream.js';

export async function GET(request) {
  const url = new URL(request.url);
  if (url.searchParams.get('health') === '1') {
    return jsonResponse({ ok: true, provider: 'weatherapi.com', configured: hasWeatherKey() });
  }
  const city = url.searchParams.get('city') || 'Mandya';
  try {
    return jsonResponse(await getWeather(city));
  } catch (err) {
    return jsonResponse({ error: err.message || 'Weather lookup failed' }, err.status === 503 ? 503 : 502);
  }
}
