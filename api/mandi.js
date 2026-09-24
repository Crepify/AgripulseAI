/**
 * Vercel Function  GET /api/mandi
 *
 *   ?action=health
 *   ?action=commodities
 *   ?action=states
 *   ?action=prices&state=Karnataka&commodity=Onion
 *
 * Proxies the CEDA Agmarknet API so CEDA_API_KEY stays server-side.
 * CEDA publishes validated Agmarknet series with a reporting lag, so `prices`
 * returns the most recent daily records available rather than same-day rates.
 */
import { cedaCommodities, cedaGeographies, cedaPrices, hasCedaKey, jsonResponse } from './_lib/upstream.js';

export async function GET(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action') || 'health';

  try {
    if (action === 'health') {
      return jsonResponse({ ok: true, provider: 'ceda-agmarknet', configured: hasCedaKey() });
    }
    if (action === 'commodities') {
      return jsonResponse({ data: await cedaCommodities() });
    }
    if (action === 'states' || action === 'geographies') {
      const states = await cedaGeographies();
      return jsonResponse({ data: url.searchParams.get('full') === '1' ? states : states.map((s) => s.name) });
    }
    if (action === 'prices') {
      const state = url.searchParams.get('state');
      const commodity = url.searchParams.get('commodity');
      if (!state || !commodity) return jsonResponse({ error: 'state and commodity are required' }, 400);
      return jsonResponse(await cedaPrices({ state, commodity }));
    }
    return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Mandi lookup failed' }, err.status && err.status < 600 ? err.status : 502);
  }
}
