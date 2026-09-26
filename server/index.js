/**
 * Standalone WhatsApp webhook server (zero dependencies — node:http only).
 * ─────────────────────────────────────────────────────────────────────────
 * For VPS / Railway / Render deployments where the Vercel serverless
 * adapter (api/whatsapp-webhook.js) isn't in play. Same core router.
 *
 *   node server/index.js            # listens on PORT (default 8787)
 *
 *   GET  /webhook | /api/whatsapp-webhook   Meta verification handshake
 *   POST /webhook | /api/whatsapp-webhook   inbound ingestion (async, 200 fast)
 *   GET  /healthz                           liveness + config status
 */

import http from 'node:http';
import { config, validateConfig, describeConfig } from './whatsapp/config.js';
import { handleInboundEvent } from './whatsapp/router.js';
import { sendTextMessage } from './whatsapp/client.js';
import { COMMUNITY_NAME, CHANNELS, broadcastToChannel } from './whatsapp/community.js';

const ADMIN_TOKEN = process.env.WHATSAPP_ADMIN_TOKEN || config.verifyToken;

const WEBHOOK_PATHS = new Set(['/webhook', '/api/whatsapp-webhook', '/api/whatsapp/webhook']);

/* ── shared helpers for the admin endpoints ───────────────────────────── */

const json = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
};

const authorized = (req) => (req.headers.authorization || '') === `Bearer ${ADMIN_TOKEN}`;

/** Read a JSON body (bounded) — resolves null on parse failure. */
function readJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); } catch { resolve(null); }
    });
  });
}

const { ok, missing } = validateConfig();
if (!ok) {
  console.warn(`[whatsapp] DRY-RUN mode — missing env: ${missing.join(', ')}`);
  console.warn('[whatsapp] outbound payloads will be logged, not sent.');
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, live: ok, missing }));
  }

  /* GET /status — credential/config state for the app's WhatsApp hub.
     Never returns the token; safe to expose. */
  if (req.method === 'GET' && url.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(describeConfig()));
  }

  /* POST /admin/broadcast — post to an AgriPulse Community channel.
     curl -X POST :8787/admin/broadcast -H "Authorization: Bearer $TOKEN" \
          -d '{"channel":"mandi","text":"Aaj tamatar ₹2,400/q — 6% upar 📈"}' */
  if (req.method === 'POST' && url.pathname === '/admin/broadcast') {
    if (!authorized(req)) return json(res, 401, { error: 'unauthorized' });
    const body = await readJsonBody(req);
    const { channel, text } = body || {};
    if (!text || !CHANNELS.some((c) => c.id === channel)) {
      return json(res, 400, { error: 'need { channel, text }', channels: CHANNELS.map((c) => c.id) });
    }
    try {
      const result = await broadcastToChannel(channel, text);
      return json(res, 200, { community: COMMUNITY_NAME, channel, ...result });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  /* POST /admin/send — direct 1:1 send (inside the farmer's 24-h window).
     curl -X POST :8787/admin/send -H "Authorization: Bearer $TOKEN" \
          -d '{"to":"919876543210","text":"Namaste! *mandi* bhejein."}' */
  if (req.method === 'POST' && url.pathname === '/admin/send') {
    if (!authorized(req)) return json(res, 401, { error: 'unauthorized' });
    const body = await readJsonBody(req);
    const { to, text } = body || {};
    if (!to || !text) return json(res, 400, { error: 'need { to, text }' });
    try {
      const out = await sendTextMessage(to, text);
      return json(res, 200, { ok: true, messageId: out?.messages?.[0]?.id || null, dryRun: Boolean(out?.dryRun) });
    } catch (err) {
      return json(res, 502, { error: err.message });
    }
  }

  if (!WEBHOOK_PATHS.has(url.pathname)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }

  /* GET — Meta verification handshake */
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === config.verifyToken) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      return res.end(challenge ?? '');
    }
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  /* POST — ACK 200 immediately, process fully async */
  if (req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 2e6) req.destroy(); });
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"status":"received"}'); // ← Meta ACK before any processing

      setImmediate(async () => {
        try {
          const payload = JSON.parse(body || '{}');
          if (payload?.object !== 'whatsapp_business_account') return;
          for (const entry of payload.entry || []) {
            for (const change of entry.changes || []) {
              if (change.field === 'messages') await handleInboundEvent(change.value);
            }
          }
        } catch (err) {
          console.error('[whatsapp:async]', err);
        }
      });
    });
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method not allowed');
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(`✅ AgriPulse WhatsApp webhook listening on :${config.port}`);
  console.log(`   GET  /webhook   (verify token: ${config.verifyToken === 'agripulse-verify' ? 'DEFAULT — set WHATSAPP_VERIFY_TOKEN!' : 'custom ✓'})`);
  console.log(`   POST /webhook   mode: ${ok ? 'LIVE (Graph API v20.0)' : 'DRY-RUN'}`);
});
