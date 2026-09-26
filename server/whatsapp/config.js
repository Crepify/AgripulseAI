/**
 * FILE 1 — Environment & Client Configuration
 * ─────────────────────────────────────────────────────────────────────────
 * Centralized, validated configuration for the WhatsApp Cloud API layer.
 * Direct Meta Graph API integration (Option A) — no Twilio/WATI/Interakt.
 *
 * Required env vars (Vercel project settings or the repo-root .env):
 *   WHATSAPP_API_TOKEN        Permanent system-user token (whatsapp_business_messaging)
 *   WHATSAPP_PHONE_NUMBER_ID  Meta phone-number id (NOT the phone number)
 *                             → `npm run whatsapp:setup` discovers & writes it
 *   WHATSAPP_VERIFY_TOKEN     Any secret string; must match the Meta webhook config
 *   PORT                      Standalone server port (server/index.js only)
 *
 * ZERO-COST NOTE: this layer only ever *replies* to farmer-initiated
 * messages, i.e. inside Meta's 24-hour service conversation window.
 * Service conversations are free on the Cloud API — no template spend.
 */

import { loadDotEnv } from './env.js';

// `node server/index.js` and the setup CLI get no env from Vite — read .env here.
// No-op when the file is absent, and real env vars always win.
loadDotEnv();

export const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v20.0';

/**
 * Values are GETTERS, not a snapshot: `scripts/whatsapp-setup.js` writes the
 * discovered phone-number id into `process.env` at runtime and the client
 * must pick it up in the same process without a restart.
 */
export const config = {
  get phoneNumberId() { return process.env.WHATSAPP_PHONE_NUMBER_ID || ''; },
  // Accept both names — earlier deployments used WHATSAPP_ACCESS_TOKEN.
  get apiToken() { return process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || ''; },
  get verifyToken() { return process.env.WHATSAPP_VERIFY_TOKEN || 'agripulse-verify'; },
  get port() { return Number(process.env.PORT || 8787); },
  // Test seam: point the whole client at a mock Graph server.
  get graphBase() {
    return (process.env.WHATSAPP_GRAPH_BASE || `https://graph.facebook.com/${GRAPH_API_VERSION}`).replace(/\/$/, '');
  },
};

/** Message-send endpoint for our business number. */
export const messagesUrl = () => `${config.graphBase}/${config.phoneNumberId}/messages`;

/** Media metadata endpoint (resolve media_id → CDN URL). */
export const mediaUrl = (mediaId) => `${config.graphBase}/${mediaId}`;

/** Business-account endpoint (phone-number discovery, profile, templates). */
export const wabaUrl = (wabaId) => `${config.graphBase}/${wabaId}`;

/** Token introspection — is_valid / expires_at / scopes. */
export const debugTokenUrl = () => `${config.graphBase}/debug_token`;

/**
 * Validate configuration.
 * @param {{strict?: boolean}} opts  strict=true throws on missing vars
 * @returns {{ok: boolean, missing: string[]}}
 */
export function validateConfig({ strict = false } = {}) {
  const missing = [];
  if (!config.apiToken) missing.push('WHATSAPP_API_TOKEN');
  if (!config.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!process.env.WHATSAPP_VERIFY_TOKEN) missing.push('WHATSAPP_VERIFY_TOKEN (using default — set one!)');
  const ok = missing.length === 0;
  if (!ok && strict) {
    throw new Error(`WhatsApp config incomplete. Missing: ${missing.join(', ')}`);
  }
  return { ok, missing };
}

/**
 * Live mode = credentials present → real Graph API calls.
 * Dry-run mode = missing creds → payloads are logged, never sent, so the
 * whole pipeline is testable locally without a Meta app.
 */
export const isLive = () => Boolean(config.phoneNumberId && config.apiToken);

/** Hide the middle of a phone-number id — safe for status endpoints/logs. */
const maskId = (id) => {
  const s = String(id || '');
  if (s.length <= 6) return s || '(not set)';
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
};

/**
 * Credential status for `/healthz` and `/api/whatsapp-webhook?status=1`.
 * NEVER returns the token — only enough to diagnose a misconfiguration.
 */
export function describeConfig() {
  return {
    live: isLive(),
    mode: isLive() ? 'LIVE' : 'DRY-RUN',
    graphVersion: GRAPH_API_VERSION,
    graphBase: config.graphBase,
    tokenPresent: Boolean(config.apiToken),
    phoneNumberId: config.phoneNumberId ? maskId(config.phoneNumberId) : '(not set)',
    wabaId: process.env.WHATSAPP_WABA_ID || '(not set)',
    businessPhone: process.env.WHATSAPP_BUSINESS_PHONE || '(not set)',
    verifyTokenIsDefault: config.verifyToken === 'agripulse-verify',
    missing: validateConfig().missing,
  };
}
