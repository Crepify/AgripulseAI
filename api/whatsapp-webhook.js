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

import { config, describeConfig } from '../server/whatsapp/config.js';
import { handleInboundEvent } from '../server/whatsapp/router.js';
import { verifySignature } from '../server/whatsapp/verify.js';

/* ── GET: verification handshake + credential status ─────────────────── */

export async function GET(request) {
  const url = new URL(request.url);

  // `?status=1` — config/credential report for the app's WhatsApp hub.
  // Returns no secrets: only masked ids, mode and the missing-var list.
  if (url.searchParams.has('status')) {
    return new Response(JSON.stringify(describeConfig()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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

/* ── Vercel Node runtime adapter ────────────────────────────────────── */

/**
 * Vercel's Node.js runtime invokes the DEFAULT export as `handler(req, res)`
 * (Node http objects). It does NOT dispatch named `GET`/`POST` exports that
 * take a Web `Request` — that shape is what `vite.config.js`'s dev middleware
 * uses, so both are kept: the named exports serve `npm run dev`, this bridge
 * serves Vercel. Without it the deployed function 500s with no default export
 * and Meta disables the webhook after repeated failures.
 */
export default async function handler(req, res) {
  const route = { GET, POST }[req.method];
  if (!route) {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'text/plain');
    return res.end('Method not allowed');
  }

  // Collect the body (Vercel gives a stream; req.body is absent for raw JSON
  // when there's no body parser in front of us).
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);

  // Meta signs deliveries with HMAC-SHA256 over the raw body. Enforced only
  // when WHATSAPP_APP_SECRET is configured; a bad signature is dropped with
  // 401 so a forged event can never make the bot message an arbitrary number.
  if (req.method === 'POST') {
    const check = verifySignature(raw, req.headers['x-hub-signature-256']);
    if (!check.ok) {
      console.warn(`[whatsapp-webhook] rejected delivery: ${check.reason}`);
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      return res.end('{"error":"invalid signature"}');
    }
  }

  const host = req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const request = new Request(`${proto}://${host}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: raw.length ? raw : undefined,
    duplex: 'half',
  });

  let out;
  try {
    out = await route(request);
  } catch (err) {
    console.error('[whatsapp-webhook]', err);
    out = ACK(); // still 200 — a non-200 makes Meta retry, then disable
  }

  res.statusCode = out.status;
  out.headers.forEach((value, key) => res.setHeader(key, value));
  res.end(Buffer.from(await out.arrayBuffer()));
}
