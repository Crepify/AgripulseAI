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
import { config, validateConfig } from './whatsapp/config.js';
import { handleInboundEvent } from './whatsapp/router.js';
import { COMMUNITY_NAME, CHANNELS, broadcastToChannel } from './whatsapp/community.js';

const ADMIN_TOKEN = process.env.WHATSAPP_ADMIN_TOKEN || config.verifyToken;

const WEBHOOK_PATHS = new Set(['/webhook', '/api/whatsapp-webhook', '/api/whatsapp/webhook']);

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

  /* POST /admin/broadcast — post to an AgriPulse Community channel.
     curl -X POST :8787/admin/broadcast -H "Authorization: Bearer $TOKEN" \
          -d '{"channel":"mandi","text":"Aaj tamatar ₹2,400/q — 6% upar 📈"}' */
  if (req.method === 'POST' && url.pathname === '/admin/broadcast') {
    if ((req.headers.authorization || '') !== `Bearer ${ADMIN_TOKEN}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end('{"error":"unauthorized"}');
    }
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', async () => {
      try {
        const { channel, text } = JSON.parse(body || '{}');
        if (!text || !CHANNELS.some((c) => c.id === channel)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'need { channel, text }', channels: CHANNELS.map((c) => c.id) }));
        }
        const result = await broadcastToChannel(channel, text);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ community: COMMUNITY_NAME, channel, ...result }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
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
