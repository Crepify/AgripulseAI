/**
 * AgriPulse Farmer Commerce OS — Unit Economics Engine
 * ─────────────────────────────────────────────────────
 * The financial loop per quintal (100 kg):
 *   Buyer pays        ₹300/q  (still ~25% below traditional retail)
 *   Platform fee      ₹65/q   — collected STRICTLY from the buyer side:
 *       ₹25 → Kisan Saathi (village youth operator)
 *       ₹20 → Logistics / truck fleet
 *       ₹3  → Panchayat Hub rent
 *       ₹17 → AgriPulse net margin
 *   Farmer receives   ₹235/q  NET IN HAND. Zero hidden cuts.
 *
 * RULE: the UI must ALWAYS show NET-IN-HAND (money hitting the bank),
 * never gross estimates.
 */

export const RATES = {
  BUYER_PAYS_PER_QUINTAL: 300,
  PLATFORM_FEE_PER_QUINTAL: 65,
  FARMER_NET_PER_QUINTAL: 235,
  FEE_SPLIT: {
    saathi: 25,      // Kisan Saathi commission
    logistics: 20,   // truck / fleet
    hubRent: 3,      // Panchayat Hub lease
    platform: 17,    // AgriPulse margin
  },
};

// Government trust anchors (70% of the Rural Trust Engine) — demo benchmarks
export const GOVT_BENCHMARKS = {
  msp: 215,          // ₹/quintal — Govt Minimum Support Price baseline (demo)
  enam: 224,         // ₹/quintal — live e-NAM mandi modal rate (demo)
  localMandiNet: 205, // what the farmer ACTUALLY takes home from the mandi
  mandiDeductions: [  // the predatory middleman cuts AgriPulse eliminates
    { label: 'Commission (आढ़त 6%)', perQ: 15 },
    { label: 'Weighing cut (तौल कटौती)', perQ: 6 },
    { label: 'Transport to mandi', perQ: 12 },
    { label: 'Loading / palledari', perQ: 5 },
  ],
};

export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN');

/** Full payout breakdown for a lot of `quintals` — the single source of truth. */
export function computePayout(quintals) {
  const q = Math.max(0, Number(quintals) || 0);
  const { FEE_SPLIT } = RATES;
  return {
    quintals: q,
    buyerPays: q * RATES.BUYER_PAYS_PER_QUINTAL,
    farmerNet: q * RATES.FARMER_NET_PER_QUINTAL,
    platformFee: q * RATES.PLATFORM_FEE_PER_QUINTAL,
    saathiCommission: q * FEE_SPLIT.saathi,
    logistics: q * FEE_SPLIT.logistics,
    hubRent: q * FEE_SPLIT.hubRent,
    platformMargin: q * FEE_SPLIT.platform,
    mandiNet: q * GOVT_BENCHMARKS.localMandiNet,
    extraVsMandi: q * (RATES.FARMER_NET_PER_QUINTAL - GOVT_BENCHMARKS.localMandiNet),
  };
}

/** Mask a govt ID: show only the last 4 digits (trust without exposure). */
export const maskGovtId = (id = '') => {
  const d = String(id).replace(/\D/g, '');
  return d.length >= 4 ? `•••• •••• ${d.slice(-4)}` : '••••';
};

/** PM-KISAN / KCC verification — 10–14 digits (offline format check, demo). */
export const isValidGovtId = (id = '') => /^\d{10,14}$/.test(String(id).replace(/[\s-]/g, ''));

// ── Trade passbook store (offline-first, localStorage) ────────────────────
const TRADES_KEY = 'ap_saathi_trades';

export function listTrades() {
  try { return JSON.parse(localStorage.getItem(TRADES_KEY) || '[]'); } catch { return []; }
}

export function saveTrade(trade) {
  const trades = listTrades();
  const idx = trades.findIndex((t) => t.id === trade.id);
  if (idx >= 0) trades[idx] = trade; else trades.unshift(trade);
  try { localStorage.setItem(TRADES_KEY, JSON.stringify(trades.slice(0, 25))); } catch {}
  return trade;
}

export function newTradeId() {
  return 'AP-' + Date.now().toString(36).toUpperCase().slice(-6);
}

/** Step tracker states shown in the farmer passbook. */
export const TRADE_STEPS = [
  { key: 'weighed', label: 'Weighed', hi: 'तौल हुई', icon: '⚖️' },
  { key: 'escrow', label: 'Escrow Locked', hi: 'पैसा एस्क्रो में बंद', icon: '🔒' },
  { key: 'loaded', label: 'Loaded on Truck', hi: 'ट्रक पर लोड', icon: '🚚' },
  { key: 'paid', label: 'UPI Paid', hi: 'UPI भुगतान हुआ', icon: '✅' },
];
