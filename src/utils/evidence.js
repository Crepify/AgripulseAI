/**
 * EVIDENCE ENGINE — tamper-proof photo stamping.
 * Every anti-fraud feature (Weighing Fraud Tracker, Proof of Grade, Patti
 * Auditor) locks captures with:
 *   • exact device time
 *   • GPS coordinates (when permitted)
 *   • SHA-256 content hash — any pixel change breaks the fingerprint
 */

export async function hashBlob(blob) {
  try {
    const buf = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return 'sha256-unavailable';
  }
}

export function getLocation(timeoutMs = 6000) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: +pos.coords.latitude.toFixed(5), lng: +pos.coords.longitude.toFixed(5), accuracy: Math.round(pos.coords.accuracy) }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 300000 },
    );
  });
}

/** Full evidence stamp for a captured file. */
export async function stampEvidence(file) {
  const [hash, loc] = await Promise.all([hashBlob(file), getLocation()]);
  return {
    ts: Date.now(),
    time: new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
    loc,
    hash,
    hashShort: hash.slice(0, 12).toUpperCase(),
  };
}

export const inr = (n) => '₹' + Math.round(Math.abs(n)).toLocaleString('en-IN');

// small persistent stores for evidence artefacts
export function loadList(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
export function saveToList(key, item, cap = 20) {
  const list = loadList(key);
  list.unshift(item);
  try { localStorage.setItem(key, JSON.stringify(list.slice(0, cap))); } catch {}
  return item;
}
