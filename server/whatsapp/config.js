/**
 * FILE 1 — Environment & Client Configuration
 * ─────────────────────────────────────────────────────────────────────────
 * Centralized, validated configuration for the WhatsApp Cloud API layer.
 * Direct Meta Graph API integration (Option A) — no Twilio/WATI/Interakt.
 *
 * Required env vars (Vercel project settings or server/.env):
 *   WHATSAPP_PHONE_NUMBER_ID  Meta phone-number id (NOT the phone number)
 *   WHATSAPP_API_TOKEN        Permanent system-user token (whatsapp_business_messaging)
 *   WHATSAPP_VERIFY_TOKEN     Any secret string; must match the Meta webhook config
 *   PORT                      Standalone server port (server/index.js only)
 *
 * ZERO-COST NOTE: this layer only ever *replies* to farmer-initiated
 * messages, i.e. inside Meta's 24-hour service conversation window.
 * Service conversations are free on the Cloud API — no template spend.
 */

export const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_VERSION || 'v20.0';

export const config = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  // Accept both names — earlier deployments used WHATSAPP_ACCESS_TOKEN.
  apiToken: process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'agripulse-verify',
  port: Number(process.env.PORT || 8787),
  graphBase: `https://graph.facebook.com/${GRAPH_API_VERSION}`,
};

/** Message-send endpoint for our business number. */
export const messagesUrl = () => `${config.graphBase}/${config.phoneNumberId}/messages`;

/** Media metadata endpoint (resolve media_id → CDN URL). */
export const mediaUrl = (mediaId) => `${config.graphBase}/${mediaId}`;

/**
 * Validate configuration.
 * @param {{strict?: boolean}} opts  strict=true throws on missing vars
 * @returns {{ok: boolean, missing: string[]}}
 */
export function validateConfig({ strict = false } = {}) {
  const missing = [];
  if (!config.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!config.apiToken) missing.push('WHATSAPP_API_TOKEN');
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
