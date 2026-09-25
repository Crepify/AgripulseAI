// Farmer profile extensions — land size, disease history, auto-save, etc.
const LAND_SIZE_KEY = 'ap_land_size_v1';
const DISEASE_HISTORY_KEY = 'ap_disease_history_v1';
const SCAN_HISTORY_KEY = 'ap_scan_history_v1';

export function getLandSize() {
  try {
    const v = localStorage.getItem(LAND_SIZE_KEY);
    if (!v) return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  } catch { return null; }
}

export function saveLandSize(acres) {
  try {
    localStorage.setItem(LAND_SIZE_KEY, String(acres));
  } catch {}
}

export function getDiseaseHistory() {
  try {
    const raw = localStorage.getItem(DISEASE_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

export function addDiseaseHistory(entry) {
  // entry: { crop, disease, date, severity, imageName }
  try {
    const hist = getDiseaseHistory();
    hist.unshift({ ...entry, at: Date.now() });
    // Keep last 50
    const trimmed = hist.slice(0, 50);
    localStorage.setItem(DISEASE_HISTORY_KEY, JSON.stringify(trimmed));
    // Also save to scan history for marketplace/community insights
    saveScanHistory(entry);
    return trimmed;
  } catch { return []; }
}

export function saveScanHistory(entry) {
  try {
    const raw = localStorage.getItem(SCAN_HISTORY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift({ ...entry, timestamp: Date.now() });
    localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(arr.slice(0, 100)));
  } catch {}
}

export function getScanHistory() {
  try {
    const raw = localStorage.getItem(SCAN_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function getDiseaseStats() {
  const hist = getDiseaseHistory();
  if (!hist.length) return null;
  const counts = {};
  hist.forEach(h => {
    const key = `${h.crop}::${h.disease}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  // Most frequent
  let top = null;
  let max = 0;
  Object.entries(counts).forEach(([k, v]) => {
    if (v > max) { max = v; top = k; }
  });
  if (!top) return null;
  const [crop, disease] = top.split('::');
  return { crop, disease, count: max, total: hist.length, history: hist.slice(0, 5) };
}
