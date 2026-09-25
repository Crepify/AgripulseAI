// ─────────────────────────────────────────────────────────────────────────────
// AgriPulse AI — TOTP (Google Authenticator) utility
//
// Real, standards-compliant TOTP two-factor codes (RFC 4226 HOTP / RFC 6238
// TOTP, SHA-1, 6 digits, 30-second period) computed fully on-device with the
// Web Crypto RNG + crypto-js HMAC-SHA1. Google Authenticator, Microsoft
// Authenticator, Authy, FreeOTP… all speak this protocol, and the codes are
// generated on the farmer's phone with zero connectivity — a natural fit for
// the offline-first pitch.
//
// NOTE: like everything in this demo auth layer, the shared secret is stored
// device-locally (localStorage). A production build would keep the secret
// server-side and verify codes on an API route.
// ─────────────────────────────────────────────────────────────────────────────

import CryptoJS from 'crypto-js';

export const TOTP_PERIOD_S = 30;   // standard Google Authenticator period
export const TOTP_DIGITS = 6;
export const TOTP_WINDOW = 1;      // accept codes from ±1 time step (clock drift)

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// ── base32 (RFC 4648, no padding — what authenticator apps use) ──────────────

export function base32Encode(bytes) {
  let bits = 0;
  let value = 0;
  let output = '';
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input) {
  const clean = String(input || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const output = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

export function isProbablyValidSecret(secret) {
  return /^[A-Z2-7]{16,}$/i.test(String(secret || '').replace(/\s/g, ''));
}

// ── crypto helpers ───────────────────────────────────────────────────────────

function bytesToWordArray(bytes) {
  const words = [];
  for (let i = 0; i < bytes.length; i++) {
    words[i >>> 2] |= bytes[i] << (24 - (i % 4) * 8);
  }
  return CryptoJS.lib.WordArray.create(words, bytes.length);
}

function wordArrayToBytes(wordArray) {
  const bytes = [];
  for (let i = 0; i < wordArray.sigBytes; i++) {
    bytes.push((wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff);
  }
  return bytes;
}

// String compare that does not short-circuit (avoids trivial timing leaks)
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ── RFC 4226 HOTP ────────────────────────────────────────────────────────────

export function hotp(secretBase32, counter, digits = TOTP_DIGITS) {
  // counter → 8-byte big-endian buffer
  const counterBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  const hmac = CryptoJS.HmacSHA1(
    bytesToWordArray(counterBytes),
    bytesToWordArray(base32Decode(secretBase32)),
  );
  const digest = wordArrayToBytes(hmac);
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, '0');
}

// ── RFC 6238 TOTP ────────────────────────────────────────────────────────────

export function currentTotpCounter(nowMs = Date.now()) {
  return Math.floor(nowMs / 1000 / TOTP_PERIOD_S);
}

// The code an authenticator app is showing right now for this secret
export function totpNow(secretBase32) {
  return hotp(secretBase32, currentTotpCounter());
}

// Seconds until the app rotates to the next code
export function totpSecondsRemaining(nowMs = Date.now()) {
  return TOTP_PERIOD_S - Math.floor((nowMs / 1000) % TOTP_PERIOD_S);
}

/**
 * Verify a 6-digit code against a secret.
 * Accepts the previous / current / next 30-second window for clock drift and
 * rejects counters at-or-before `lastCounter` (replay protection).
 * @returns {{ ok: boolean, counter?: number, error?: string }}
 */
export function verifyTotpCode(secretBase32, code, { window = TOTP_WINDOW, lastCounter = 0 } = {}) {
  const normalized = String(code || '').replace(/\D/g, '');
  if (normalized.length !== TOTP_DIGITS) return { ok: false, error: 'bad_format' };
  const secret = String(secretBase32 || '').replace(/\s/g, '');
  if (!isProbablyValidSecret(secret)) return { ok: false, error: 'bad_secret' };

  const center = currentTotpCounter();
  for (let c = center - window; c <= center + window; c++) {
    if (c <= lastCounter) continue; // already used — one code, one login
    if (timingSafeEqual(hotp(secret, c), normalized)) {
      return { ok: true, counter: c };
    }
  }
  return { ok: false, error: 'wrong_code' };
}

// ── secret generation + provisioning URI ─────────────────────────────────────

// 20 random bytes → 32 base32 chars (160-bit secret, same as Google's default)
export function generateSecret(numBytes = 20) {
  const bytes = new Uint8Array(numBytes);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

/**
 * otpauth:// URI that Google Authenticator understands when scanning the QR.
 * @see https://github.com/google/google-authenticator/wiki/Key-Uri-Format
 */
export function buildOtpAuthUri({ secret, account, issuer = 'AgriPulse AI' }) {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({
    secret: String(secret || '').replace(/\s/g, ''),
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_S),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// Pretty-print a secret for manual entry: "JBSW Y3DP EHPK 3PXP …"
export function formatSecretForHumans(secret) {
  return String(secret || '')
    .replace(/\s/g, '')
    .toUpperCase()
    .replace(/(.{4})/g, '$1 ')
    .trim();
}
