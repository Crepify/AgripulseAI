/**
 * Vercel Function  POST /api/deals-dispatch
 *
 * DUAL-QR ZERO-TRUST PAYMENT RELEASE
 * ──────────────────────────────────
 * Razorpay escrow releases ONLY when BOTH parties have cross-scanned the
 * dispatch QR:
 *   1. Kisan Saathi   (hub operator)
 *   2. Truck Driver   (fleet)
 * No single actor can move the money — this kills collusion fraud.
 *
 * On release, a Razorpay Route split payout executes instantly:
 *   Farmer UPI       ₹235/q  (NET IN HAND)
 *   Kisan Saathi     ₹25/q
 *   Logistics fleet  ₹20/q
 *   Panchayat Hub    ₹3/q
 *   AgriPulse margin ₹17/q
 *   (Buyer already paid ₹300/q into escrow before dispatch.)
 */

const RATES = {
  BUYER_PAYS: 300,
  FARMER_NET: 235,
  SPLIT: { saathi: 25, logistics: 20, hubRent: 3, platform: 17 },
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

/** Demo signature check — production verifies HMAC of QR payload per party. */
const isValidSignature = (sig, party) =>
  typeof sig === 'string' && sig.length >= 6 && sig.toUpperCase().includes(party);

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }

  const { tradeId, quintals, saathiSignature, driverSignature } = body || {};

  if (!tradeId || !(Number(quintals) > 0)) {
    return json({ error: 'tradeId and positive quintals required' }, 400);
  }

  // ── Zero-trust rule: BOTH scans must be present and valid ──────────────
  const saathiOk = isValidSignature(saathiSignature, 'SAATHI');
  const driverOk = isValidSignature(driverSignature, 'DRIVER');
  if (!saathiOk || !driverOk) {
    return json({
      error: 'DUAL_QR_INCOMPLETE',
      detail: 'Escrow release blocked — both Kisan Saathi AND Truck Driver must cross-scan the dispatch QR.',
      scans: { saathi: saathiOk, driver: driverOk },
    }, 403);
  }

  const q = Number(quintals);
  const payout = {
    escrowDebit: q * RATES.BUYER_PAYS,
    transfers: [
      { to: 'farmer_upi', label: 'Farmer NET-IN-HAND', amount: q * RATES.FARMER_NET, mode: 'UPI (Razorpay Route)' },
      { to: 'saathi_account', label: 'Kisan Saathi commission', amount: q * RATES.SPLIT.saathi, mode: 'Razorpay Route' },
      { to: 'fleet_account', label: 'Logistics fleet', amount: q * RATES.SPLIT.logistics, mode: 'Razorpay Route' },
      { to: 'panchayat_account', label: 'Panchayat Hub rent', amount: q * RATES.SPLIT.hubRent, mode: 'Razorpay Route' },
      { to: 'agripulse_account', label: 'AgriPulse margin', amount: q * RATES.SPLIT.platform, mode: 'internal' },
    ],
  };

  // Live mode: razorpay.transfers.create(...) per leg with RAZORPAY_KEY_ID /
  // RAZORPAY_KEY_SECRET; idempotency key = tradeId. Mocked for the demo.
  return json({
    status: 'RELEASED',
    tradeId,
    releasedAt: new Date().toISOString(),
    razorpayTransferGroup: `trf_${tradeId}`,
    payout,
    audit: { dualQr: { saathi: true, driver: true }, rule: 'BOTH_SCANS_REQUIRED' },
  });
}
