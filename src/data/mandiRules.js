/**
 * LEGAL MANDI FEE REGISTRY — the "hardcoded SQLite" of the Patti Auditor.
 * Per-state APMC legal limits (demo values patterned on real APMC bylaw
 * ranges). Every fee a middleman writes on a patti is checked against this
 * table; anything above the limit is money stolen from the farmer.
 */

const DEFAULT_RULES = {
  commissionPct: 2.0,     // arhat / commission max %
  unloadingPct: 2.0,      // hamali / unloading max %
  weighingFlatPerBag: 3,  // ₹ per bag max
  marketFeePct: 1.0,      // APMC cess max %
  paymentDueDays: 3,      // cash payout due within N days (APMC Act)
};

export const STATE_MANDI_RULES = {
  'Maharashtra':   { commissionPct: 3.0, unloadingPct: 2.0, weighingFlatPerBag: 3, marketFeePct: 1.05, paymentDueDays: 1 },
  'Karnataka':     { commissionPct: 2.0, unloadingPct: 2.0, weighingFlatPerBag: 2, marketFeePct: 1.0, paymentDueDays: 2 },
  'Punjab':        { commissionPct: 2.5, unloadingPct: 1.5, weighingFlatPerBag: 3, marketFeePct: 3.0, paymentDueDays: 2 },
  'Uttar Pradesh': { commissionPct: 2.5, unloadingPct: 2.0, weighingFlatPerBag: 3, marketFeePct: 1.0, paymentDueDays: 3 },
  'Madhya Pradesh':{ commissionPct: 2.0, unloadingPct: 2.0, weighingFlatPerBag: 2, marketFeePct: 0.5, paymentDueDays: 2 },
  'Rajasthan':     { commissionPct: 2.25, unloadingPct: 2.0, weighingFlatPerBag: 3, marketFeePct: 1.6, paymentDueDays: 3 },
  'Gujarat':       { commissionPct: 2.0, unloadingPct: 1.5, weighingFlatPerBag: 2, marketFeePct: 0.8, paymentDueDays: 2 },
  'Bihar':         { commissionPct: 2.0, unloadingPct: 2.0, weighingFlatPerBag: 3, marketFeePct: 1.0, paymentDueDays: 3 },
  'Tamil Nadu':    { commissionPct: 2.0, unloadingPct: 1.5, weighingFlatPerBag: 2, marketFeePct: 1.0, paymentDueDays: 2 },
  'Telangana':     { commissionPct: 2.0, unloadingPct: 2.0, weighingFlatPerBag: 2, marketFeePct: 1.0, paymentDueDays: 2 },
  'Andhra Pradesh':{ commissionPct: 2.0, unloadingPct: 2.0, weighingFlatPerBag: 2, marketFeePct: 1.0, paymentDueDays: 2 },
  'Haryana':       { commissionPct: 2.5, unloadingPct: 1.5, weighingFlatPerBag: 3, marketFeePct: 2.0, paymentDueDays: 2 },
  'West Bengal':   { commissionPct: 2.0, unloadingPct: 2.0, weighingFlatPerBag: 3, marketFeePct: 1.0, paymentDueDays: 3 },
  'Odisha':        { commissionPct: 2.0, unloadingPct: 2.0, weighingFlatPerBag: 2, marketFeePct: 1.0, paymentDueDays: 3 },
};

export function getMandiRules(state) {
  return { state: STATE_MANDI_RULES[state] ? state : 'Default (APMC Model Act)', ...(STATE_MANDI_RULES[state] || DEFAULT_RULES) };
}

/** APMC/labor/transport cost model for the ROI simulator (₹ per trip). */
export const ROI_COSTS = {
  lcvPerKm: 22,            // light commercial vehicle ₹/km
  defaultDistanceKm: 28,   // village → mandi average
  laborPerQuintal: 12,     // loading + harvest handling ₹/q
};

/** Typical yield per acre in quintals (demo agronomic table). */
export const YIELD_PER_ACRE_Q = {
  Tomato: 100, Onion: 80, Potato: 90, Wheat: 18, Rice: 22, Maize: 25,
  Cotton: 8, Soyabean: 10, Gram: 8, Mustard: 8, Groundnut: 12, Bajra: 12,
  Chilli: 15, Banana: 160, Sugarcane: 320,
};

/**
 * AUDIT ENGINE — compare a parsed patti against the legal limits.
 * Returns per-fee verdicts + the exact ₹ stolen.
 */
export function auditPatti(parsed, state) {
  const rules = getMandiRules(state);
  const gross = parsed.weightKg * parsed.pricePerKg;
  const legal = {
    commission: (gross * rules.commissionPct) / 100,
    unloading: (gross * rules.unloadingPct) / 100,
    weighing: parsed.bags * rules.weighingFlatPerBag,
    marketFee: (gross * rules.marketFeePct) / 100,
  };
  const items = [
    { key: 'commission', label: 'Commission (आढ़त)', hi: 'आढ़त', charged: parsed.fees.commission, legalMax: legal.commission, limitText: `${rules.commissionPct}% max` },
    { key: 'unloading', label: 'Unloading (हमाली)', hi: 'हमाली', charged: parsed.fees.unloading, legalMax: legal.unloading, limitText: `${rules.unloadingPct}% max` },
    { key: 'weighing', label: 'Weighing (तुलाई)', hi: 'तुलाई', charged: parsed.fees.weighing, legalMax: legal.weighing, limitText: `₹${rules.weighingFlatPerBag}/bag max` },
    { key: 'marketFee', label: 'Market fee (मंडी शुल्क)', hi: 'मंडी शुल्क', charged: parsed.fees.marketFee, legalMax: legal.marketFee, limitText: `${rules.marketFeePct}% max` },
    { key: 'other', label: 'Unlisted deduction', hi: 'गैर-कानूनी कटौती', charged: parsed.fees.other, legalMax: 0, limitText: 'NOT permitted' },
  ].map((f) => {
    const stolen = Math.max(0, f.charged - f.legalMax);
    return { ...f, stolen, verdict: stolen > 1 ? 'ILLEGAL' : 'OK' };
  });

  const totalStolen = items.reduce((s, f) => s + f.stolen, 0);
  const dueDate = new Date(parsed.dateTs + rules.paymentDueDays * 86400000);
  return {
    rules, gross, items, totalStolen,
    legalNet: gross - items.reduce((s, f) => s + Math.min(f.charged, f.legalMax), 0),
    paidNet: gross - items.reduce((s, f) => s + f.charged, 0),
    dueDate,
    dueDateText: dueDate.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }),
  };
}
