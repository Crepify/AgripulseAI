// 100% Offline Pesticide Search — alternative to Google Shopping when offline
// Works without internet, uses bundled JSON price book + fuzzy search

let OFFLINE_DB = null;
let LOAD_PROMISE = null;

export async function loadOfflineDB() {
  if (OFFLINE_DB) return OFFLINE_DB;
  if (LOAD_PROMISE) return LOAD_PROMISE;
  
  LOAD_PROMISE = (async () => {
    try {
      // Try to load from public/data (precached by SW)
      const res = await fetch('/data/pesticide-offline-db.json', { cache: 'force-cache' });
      if (res.ok) {
        const json = await res.json();
        OFFLINE_DB = json.products || [];
        console.log('[AgriPulse Offline DB] Loaded', OFFLINE_DB.length, 'products');
        return OFFLINE_DB;
      }
    } catch (e) {
      console.warn('[AgriPulse Offline DB] Fetch failed, using fallback', e);
    }
    // Fallback hardcoded minimal DB (if JSON not available)
    OFFLINE_DB = [
      {
        id: 'upl-saaf',
        name: 'UPL SAAF Fungicide',
        composition: 'Carbendazim 12% + Mancozeb 63% WP',
        mrp: '₹480',
        mrpRange: '₹50-₹500',
        manufacturer: 'UPL Ltd.',
        cibrc: 'Verified',
        hologram: 'UPL-HOLO-VERIFY',
        prices: [
          { store: 'BigHaat', price: '₹102', variant: '100 Gms', url: 'https://www.bighaat.com/products/saaf-fungicide', delivery: 'Free delivery', rating: '4.5 ★', inStock: true, offline: true },
          { store: 'BigHaat', price: '₹50', variant: '20 Gram', url: 'https://www.bighaat.com/products/saaf-fungicide', delivery: 'Free delivery', rating: '4.6 ★ (8)', inStock: true, offline: true },
          { store: 'Amazon.in', price: '₹134', variant: '100 Gms', url: 'https://www.amazon.in/s?k=SAAF+Fungicide', delivery: 'Free delivery', rating: '4.2 ★', inStock: true, offline: true },
        ],
        keywords: ['saaf', 'upl', 'carbendazim', 'mancozeb', 'shopping'],
        fakeAlert: false
      }
    ];
    return OFFLINE_DB;
  })();
  return LOAD_PROMISE;
}

// Simple fuzzy scoring for offline search
function scoreProduct(product, query) {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const name = (product.name + ' ' + product.localName + ' ' + product.composition + ' ' + (product.keywords||[]).join(' ')).toLowerCase();
  let score = 0;
  // Exact id match
  if (product.id === q) score += 100;
  // Name contains query
  if (name.includes(q)) score += 50;
  // Each keyword match
  for (const kw of (product.keywords||[])) {
    if (q.includes(kw.toLowerCase()) || kw.toLowerCase().includes(q)) score += 20;
  }
  // Token overlap
  const qTokens = q.split(/\s+/);
  const nameTokens = name.split(/\s+/);
  for (const qt of qTokens) {
    if (qt.length < 2) continue;
    for (const nt of nameTokens) {
      if (nt.includes(qt) || qt.includes(nt)) score += 5;
    }
  }
  return score;
}

export async function searchOfflinePesticides(query) {
  const db = await loadOfflineDB();
  if (!query || !query.trim()) {
    // Return all sorted by id
    return db.map(p => ({ ...p, _score: 0, live: false, source: 'Offline Price Book (100% offline)', offline: true }));
  }
  const scored = db.map(p => ({ product: p, score: scoreProduct(p, query) }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .map(x => ({ 
      ...x.product, 
      _score: x.score, 
      live: false, 
      source: x.score > 30 ? 'Offline Price Book — Exact Match (100% offline)' : 'Offline Price Book — Similar (100% offline)',
      offline: true 
    }));
  // If no match, return generic + all
  if (scored.length === 0) {
    return db.slice(0, 3).map(p => ({ ...p, _score: 0, live: false, source: 'Offline Price Book — Suggestions (100% offline)', offline: true }));
  }
  return scored;
}

export async function getOfflineProductByKey(key) {
  const db = await loadOfflineDB();
  const k = (key||'').toLowerCase();
  let found = db.find(p => p.id === k);
  if (found) return { ...found, live: false, source: 'Offline Price Book (100% offline)', offline: true };
  // Fuzzy
  const results = await searchOfflinePesticides(k);
  return results[0] || null;
}

// Alternative to /api/pesticide-prices for offline mode
export async function getOfflinePrices(productKey) {
  const product = await getOfflineProductByKey(productKey);
  if (!product) return null;
  return {
    ...product,
    prices: product.prices,
    lastUpdated: new Date().toISOString(),
    productKey: product.id,
  };
}
