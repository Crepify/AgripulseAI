/**
 * Vercel Function  /api/google
 *
 * REAL Google sign-in (Google Identity Services).
 *
 *   GET  /api/google  → { ok, provider:'google', configured, clientId }
 *                       clientId is a PUBLIC value (it is embedded in the web
 *                       page anyway) — tells the frontend to render the real
 *                       "Continue with Google" button instead of the demo one.
 *
 *   POST /api/google  → body { credential } — the RS256 ID-token JWT returned
 *                       by the GIS button. Verified HERE server-side:
 *                         • signature against Google's public JWKS
 *                         • audience  == GOOGLE_CLIENT_ID (our app)
 *                         • issuer    ∈ accounts.google.com
 *                         • expiry    not passed
 *                         • email_verified
 *                       On success returns the verified profile. No secrets
 *                       are exposed to the browser.
 *
 * Setup: Google Cloud Console → APIs & Services → Credentials →
 * "OAuth 2.0 Client ID" (Web application) → set GOOGLE_CLIENT_ID (env) with
 * the site's origin under "Authorized JavaScript origins".
 * Without GOOGLE_CLIENT_ID the route answers configured:false and the login
 * keeps the local demo button (offline-first fallback).
 */
import { createPublicKey, verify as cryptoVerify } from 'node:crypto';
import { jsonResponse } from './_lib/upstream.js';

// ── JWKS (Google's rotating public keys) with a 1-hour cache ─────────────────

let jwksCache = null;

async function getJwks() {
  if (jwksCache && Date.now() - jwksCache.at < 3600_000) return jwksCache.keys;
  const res = await fetch('https://www.googleapis.com/oauth2/v3/certs');
  if (!res.ok) throw new Error('jwks_fetch_failed');
  const data = await res.json();
  jwksCache = { at: Date.now(), keys: data.keys || [] };
  return jwksCache.keys;
}

// ── ID-token verification ────────────────────────────────────────────────────

function b64urlJson(part) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

async function verifyGoogleIdToken(idToken, clientId) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) return { ok: false, error: 'malformed_token' };

  let header;
  let payload;
  try {
    header = b64urlJson(parts[0]);
    payload = b64urlJson(parts[1]);
  } catch {
    return { ok: false, error: 'malformed_token' };
  }

  if (header.alg !== 'RS256' || !header.kid) return { ok: false, error: 'bad_alg' };
  if (payload.aud !== clientId) return { ok: false, error: 'bad_audience' };
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss)) {
    return { ok: false, error: 'bad_issuer' };
  }
  if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) {
    return { ok: false, error: 'expired' };
  }
  if (!payload.sub) return { ok: false, error: 'no_subject' };
  if (payload.email && payload.email_verified === false) {
    return { ok: false, error: 'email_unverified' };
  }

  let keys;
  try {
    keys = await getJwks();
  } catch {
    return { ok: false, error: 'jwks_unavailable' };
  }
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    jwksCache = null; // key rotated — force a refetch on the next try
    return { ok: false, error: 'unknown_key' };
  }

  let signatureOk = false;
  try {
    const keyObj = createPublicKey({ key: jwk, format: 'jwk' });
    signatureOk = cryptoVerify(
      'RSA-SHA256',
      Buffer.from(`${parts[0]}.${parts[1]}`),
      keyObj,
      Buffer.from(parts[2], 'base64url'),
    );
  } catch {
    return { ok: false, error: 'verify_failed' };
  }
  if (!signatureOk) return { ok: false, error: 'bad_signature' };

  return {
    ok: true,
    profile: {
      sub: payload.sub,
      name: payload.name || payload.email?.split('@')[0] || 'Google User',
      email: payload.email || '',
      picture: payload.picture || '',
    },
  };
}

// ── handlers ─────────────────────────────────────────────────────────────────

const CLIENT_ID = () => process.env.GOOGLE_CLIENT_ID || '';

export async function GET() {
  return jsonResponse({
    ok: true,
    provider: 'google',
    configured: Boolean(CLIENT_ID()),
    clientId: CLIENT_ID(),
  });
}

export async function POST(request) {
  if (!CLIENT_ID()) {
    return jsonResponse({ ok: false, error: 'not_configured' });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'bad_request' }, 400);
  }
  if (!body?.credential) {
    return jsonResponse({ ok: false, error: 'missing_credential' }, 400);
  }
  try {
    const res = await verifyGoogleIdToken(body.credential, CLIENT_ID());
    if (!res.ok) return jsonResponse({ ok: false, error: res.error }, 401);
    return jsonResponse({ ok: true, profile: res.profile });
  } catch (err) {
    return jsonResponse({ ok: false, error: 'verification_failed', detail: err.message }, 502);
  }
}
