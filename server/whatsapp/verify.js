/**
 * Meta webhook signature verification (X-Hub-Signature-256).
 * ─────────────────────────────────────────────────────────────────────────
 * The webhook URL is public. Without signature checking, anyone who guesses it
 * can POST a forged `messages` event and make the bot reply to whatever number
 * they put in `from`. Meta signs every delivery with HMAC-SHA256 of the RAW
 * body using the app secret, sent as `X-Hub-Signature-256: sha256=<hex>`.
 *
 * Enforcement is opt-in by configuration: set WHATSAPP_APP_SECRET and invalid
 * signatures are rejected; leave it unset and verification is skipped (with a
 * boot warning) so existing deployments keep working.
 *
 * App secret: Meta App Dashboard → Settings → Basic → "App secret" → Show.
 */

import crypto from 'node:crypto';

export const appSecret = () => process.env.WHATSAPP_APP_SECRET || '';

export const isSignatureVerificationEnabled = () => Boolean(appSecret());

/**
 * Verify a Meta delivery.
 * @param {string|Buffer} rawBody  the EXACT bytes received (never a re-serialised object)
 * @param {string} headerValue     value of X-Hub-Signature-256
 * @returns {{ok: boolean, reason?: string}}
 */
export function verifySignature(rawBody, headerValue) {
  const secret = appSecret();
  if (!secret) return { ok: true, reason: 'WHATSAPP_APP_SECRET not set — verification skipped' };
  if (!headerValue) return { ok: false, reason: 'missing X-Hub-Signature-256 header' };

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  const a = Buffer.from(String(headerValue).trim());
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch — compare digests, not raw strings
  if (a.length !== b.length) return { ok: false, reason: 'signature length mismatch' };
  return crypto.timingSafeEqual(a, b)
    ? { ok: true }
    : { ok: false, reason: 'signature does not match app secret' };
}

/** Sign a body the way Meta does — used by the test suite. */
export function signBody(rawBody, secret = appSecret()) {
  return `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
}
