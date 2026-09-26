/**
 * FILE 3 — Webhook Verification & Ingestion Router (Vercel adapter)
 * ─────────────────────────────────────────────────────────────────────────
 *   GET  /api/whatsapp-webhook   Meta verification handshake
 *   POST /api/whatsapp-webhook   inbound message ingestion
 *
 * Meta handshake: echoes hub.challenge as plain text iff
 * hub.mode === 'subscribe' && hub.verify_token matches WHATSAPP_VERIFY_TOKEN.
 *
 * POST contract: ALWAYS answer 200 fast. Meta retries (and eventually
 * disables) webhooks that are slow or non-200 — so parsing/processing
 * errors are swallowed after logging, and per-message work is bounded by a
 * hard time cap so the ACK can never hang on a slow upstream.
 *
 * The same core router also powers server/index.js (standalone node:http
 * deployment) — this file is only the serverless transport shim.
 */

import { config } from '../server/whatsapp/config.js';
import { handleInboundEvent } from '../server/whatsapp/router.js';

/* ── GET: verification handshake ────────────────────────────────────── */

export async function GET(request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === config.verifyToken) {
    // Meta requires the raw challenge string back, 200, text/plain.
    return new Response(challenge ?? '', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
  return new Response('Forbidden', { status: 403 });
}

/* ── POST: inbound ingestion ────────────────────────────────────────── */

const ACK = () =>
  new Response(JSON.stringify({ status: 'received' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

export async function POST(request) {
  let payload = null;
  try {
    payload = await request.json();
  } catch {
    return ACK(); // malformed body — still 200 so Meta never retries forever
  }

  try {
    if (payload?.object === 'whatsapp_business_account') {
      // Route every change in every entry. Sender phone lives at
      // entry[].changes[].value.messages[].from — extracted in the router.
      const jobs = [];
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'messages') jobs.push(handleInboundEvent(change.value));
        }
      }
      // Serverless caveat: work started after the response returns can be
      // frozen by the platform, so we await — but bounded by a hard cap so
      // the ACK is always fast. Replies that miss the cap complete on the
      // next warm invocation via the idempotency guard in store.js.
      await Promise.race([
        Promise.allSettled(jobs),
        new Promise((r) => setTimeout(r, 8000)),
      ]);
    }
  } catch (err) {
    console.error('[whatsapp-webhook]', err); // never surface as non-200
  }
  return ACK();
}
