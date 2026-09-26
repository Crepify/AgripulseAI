/**
 * WhatsApp Cloud API integration tests — `npm run whatsapp:test`
 * ─────────────────────────────────────────────────────────────────────────
 * Exercises the REAL modules (server/whatsapp/client.js, config.js,
 * router.js, api/whatsapp-webhook.js) against a local mock Graph server, so
 * the outbound payload shape, Meta's payload limits, the webhook handshake
 * and the credential auto-discovery CLI are all verified without a Meta app
 * and without spending a single message.
 *
 * Node's built-in test runner + fetch — zero new dependencies.
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '..');

/* ── mock Graph API ─────────────────────────────────────────────────── */

const PHONE_ID = '109876543210987';
const WABA_ID = '1234567890';
const TOKEN = 'EAAtest-token-for-the-suite';

let mock; // http server
let requests = []; // every request the client made

function startMock() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        const url = new URL(req.url, 'http://localhost');
        const auth = req.headers.authorization || '';
        requests.push({
          method: req.method,
          path: url.pathname,
          query: Object.fromEntries(url.searchParams),
          auth,
          body: body ? JSON.parse(body) : null,
        });
        const send = (obj, code = 200) => {
          res.writeHead(code, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(obj));
        };

        if (auth !== `Bearer ${TOKEN}`) return send({ error: { code: 190, message: 'Invalid OAuth access token' } }, 401);

        // token introspection
        if (url.pathname === '/debug_token') {
          return send({
            data: {
              is_valid: true,
              app_id: '111222333',
              type: 'SYSTEM_USER',
              expires_at: 0,
              scopes: ['whatsapp_business_messaging', 'whatsapp_business_management'],
            },
          });
        }
        // system-user discovery: account → WABA → phone_numbers (double nesting)
        if (url.pathname === '/me/accounts') {
          return send({
            data: [{
              id: 'BUSINESS_1',
              name: 'AgriPulse Test Business',
              whatsapp_business_accounts: {
                data: [{
                  id: WABA_ID,
                  name: 'AgriPulse Test WABA',
                  phone_numbers: {
                    data: [{
                      id: PHONE_ID,
                      display_phone_number: '+1 555 0100',
                      verified_name: 'AgriPulse AI',
                      quality_rating: 'GREEN',
                    }],
                  },
                }],
              },
            }],
          });
        }
        // explicit walk fallback
        if (url.pathname === `/${WABA_ID}/phone_numbers`) {
          return send({ data: [{ id: PHONE_ID, display_phone_number: '+1 555 0100', verified_name: 'AgriPulse AI' }] });
        }
        // single phone-number read
        if (url.pathname === `/${PHONE_ID}`) {
          return send({ id: PHONE_ID, display_phone_number: '+1 555 0100', verified_name: 'AgriPulse AI' });
        }
        // media metadata
        if (/^\/media-/.test(url.pathname)) {
          return send({ id: url.pathname.slice(1), url: 'http://127.0.0.1/cdn/file', mime_type: 'image/jpeg' });
        }
        // message send (a body containing TRIGGER_400 makes the mock reject,
        // so the client's error path can be exercised without a real failure)
        if (url.pathname === `/${PHONE_ID}/messages`) {
          const parsed = body ? JSON.parse(body) : {};
          if (JSON.stringify(parsed).includes('TRIGGER_400')) {
            return send({ error: { code: 131030, message: 'Recipient phone number not in allowed list' } }, 400);
          }
          return send({ messaging_product: 'whatsapp', contacts: [{ input: '919876543210' }], messages: [{ id: `wamid.MOCK${requests.length}` }] });
        }
        return send({ error: { code: 100, message: `Unsupported path ${url.pathname}` } }, 404);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

let baseUrl;
let client, cfgMod, webhook;

before(async () => {
  mock = await startMock();
  baseUrl = `http://127.0.0.1:${mock.address().port}`;

  // Must be set before the modules are first imported — config.js reads env
  // at import time and its getters read process.env on every access.
  process.env.WHATSAPP_GRAPH_BASE = baseUrl;
  process.env.WHATSAPP_API_TOKEN = TOKEN;
  process.env.WHATSAPP_PHONE_NUMBER_ID = PHONE_ID;
  process.env.WHATSAPP_VERIFY_TOKEN = 'test-verify-token';

  cfgMod = await import('../server/whatsapp/config.js');
  client = await import('../server/whatsapp/client.js');
  webhook = await import('../api/whatsapp-webhook.js');
});

after(() => {
  // fetch keeps connections warm — drop them so the runner can exit.
  mock?.closeAllConnections?.();
  mock?.close();
});

const lastSend = () => [...requests].reverse().find((r) => r.path === `/${PHONE_ID}/messages`);
const reset = () => { requests = []; };

/* ── config ─────────────────────────────────────────────────────────── */

test('config reports LIVE once token + phone number id are present', () => {
  assert.equal(cfgMod.isLive(), true);
  const d = cfgMod.describeConfig();
  assert.equal(d.mode, 'LIVE');
  assert.equal(d.tokenPresent, true);
  assert.equal(d.verifyTokenIsDefault, false);
  // masked, never the raw id, and the token is not in the report at all
  assert.equal(d.phoneNumberId, `${PHONE_ID.slice(0, 4)}…${PHONE_ID.slice(-4)}`);
  assert.ok(!JSON.stringify(d).includes(TOKEN));
});

/* ── outbound client ────────────────────────────────────────────────── */

test('sendTextMessage posts a valid Cloud API text payload', async () => {
  reset();
  const out = await client.sendTextMessage('+91 98765 43210', 'Namaste *Ramesh*');
  const req = lastSend();
  assert.equal(req.method, 'POST');
  assert.equal(req.auth, `Bearer ${TOKEN}`);
  assert.equal(req.body.messaging_product, 'whatsapp');
  assert.equal(req.body.type, 'text');
  assert.equal(req.body.text.body, 'Namaste *Ramesh*');
  assert.equal(req.body.to, '919876543210'); // '+' and spaces stripped
  assert.match(out.messages[0].id, /^wamid\.MOCK/);
});

test('sendInteractiveButtons enforces Meta\'s 3-button / 20-char limits', async () => {
  reset();
  await client.sendInteractiveButtons('919876543210', 'Kya karna chahenge?', [
    { id: 'A', title: 'Short' },
    { id: 'B', title: 'This title is definitely longer than twenty characters' },
    { id: 'C', title: 'Third' },
    { id: 'D', title: 'Fourth should be dropped' },
  ]);
  const buttons = lastSend().body.interactive.action.buttons;
  assert.equal(buttons.length, 3);
  assert.equal(buttons[0].type, 'reply');
  assert.ok(buttons.every((b) => b.reply.title.length <= 20));
  assert.ok(!buttons.some((b) => b.id === 'D'));
});

test('sendListMenu caps rows at 10 across all sections', async () => {
  reset();
  const rows = (n) => Array.from({ length: n }, (_, i) => ({ id: `R${i}`, title: `Row ${i}` }));
  await client.sendListMenu('919876543210', 'Pick', 'Choose', [
    { title: 'First section', rows: rows(7) },
    { title: 'Second section', rows: rows(7) },
  ]);
  const sections = lastSend().body.interactive.action.sections;
  const total = sections.reduce((n, s) => n + s.rows.length, 0);
  assert.equal(total, 10);
});

test('a 4xx from Graph rejects instead of silently passing', async () => {
  reset();
  await assert.rejects(
    () => client.sendTextMessage('919876543210', 'TRIGGER_400'),
    /Graph API 400/
  );
});

/* ── webhook transport (Vercel adapter) ─────────────────────────────── */

test('GET verification handshake echoes hub.challenge', async () => {
  const res = await webhook.GET(new Request(
    `${baseUrl}/api/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=987654`
  ));
  assert.equal(res.status, 200);
  assert.equal(await res.text(), '987654');
});

test('GET verification rejects a wrong verify token', async () => {
  const res = await webhook.GET(new Request(
    `${baseUrl}/api/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1`
  ));
  assert.equal(res.status, 403);
});

test('GET ?status=1 returns config without leaking the token', async () => {
  const res = await webhook.GET(new Request(`${baseUrl}/api/whatsapp-webhook?status=1`));
  assert.equal(res.status, 200);
  const raw = await res.text();
  assert.equal(JSON.parse(raw).mode, 'LIVE');
  assert.ok(!raw.includes(TOKEN));
});

test('POST inbound "hi" ACKs 200 and replies with the welcome button menu', async () => {
  reset();
  const payload = {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        field: 'messages',
        value: {
          metadata: { phone_number_id: PHONE_ID },
          contacts: [{ profile: { name: 'Ramesh Patil' }, wa_id: '919800000001' }],
          messages: [{
            from: '919800000001', id: 'wamid.UNIT-1', type: 'text', text: { body: 'namaste' },
          }],
        },
      }],
    }],
  };
  const res = await webhook.POST(new Request(`${baseUrl}/api/whatsapp-webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'received' });

  const sends = requests.filter((r) => r.path === `/${PHONE_ID}/messages` && r.body.type === 'interactive');
  assert.equal(sends.length, 1, 'expected exactly one interactive welcome reply');
  assert.equal(sends[0].body.to, '919800000001');
  assert.match(sends[0].body.interactive.body.text, /Namaste Ramesh Patil/);
  assert.equal(sends[0].body.interactive.action.buttons.length, 3);
  // read receipt (blue tick) is sent too
  assert.ok(requests.some((r) => r.body?.status === 'read' && r.body.message_id === 'wamid.UNIT-1'));
});

test('a redelivered wamid is processed once (idempotency)', async () => {
  reset();
  const value = {
    metadata: { phone_number_id: PHONE_ID },
    messages: [{ from: '919800000002', id: 'wamid.DUP-1', type: 'text', text: { body: 'mandi' } }],
  };
  const { handleInboundEvent } = await import('../server/whatsapp/router.js');
  await handleInboundEvent(value);
  const first = requests.filter((r) => r.body?.type === 'interactive').length;
  reset();
  await handleInboundEvent(value); // Meta redelivers the identical event
  const second = requests.filter((r) => r.body?.type === 'interactive').length;
  assert.equal(first, 1);
  assert.equal(second, 0, 'duplicate delivery must not reply again');
});

test('events addressed to a foreign phone_number_id are ignored', async () => {
  reset();
  const { handleInboundEvent } = await import('../server/whatsapp/router.js');
  await handleInboundEvent({
    metadata: { phone_number_id: '999999999999999' },
    messages: [{ from: '919800000003', id: 'wamid.FOREIGN', type: 'text', text: { body: 'hi' } }],
  });
  assert.equal(requests.filter((r) => r.body?.type).length, 0);
});

/* ── Vercel Node runtime adapter (default export) ────────────────────── */

/**
 * Vercel invokes `handler(req, res)` with Node http objects. Drive it through
 * a real http server so the adapter is exercised exactly as the platform will.
 */
function serveVercelAdapter(handler) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => handler(req, res));
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

test('the Vercel default export exists and serves the handshake', async () => {
  assert.equal(typeof webhook.default, 'function',
    'Vercel\'s Node runtime needs a default export — without it the deployed function 500s');

  const server = await serveVercelAdapter(webhook.default);
  try {
    const port = server.address().port;
    const res = await fetch(
      `http://127.0.0.1:${port}/api/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=test-verify-token&hub.challenge=VERCEL123`
    );
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('content-type'), 'text/plain');
    assert.equal(await res.text(), 'VERCEL123');
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test('the Vercel adapter ingests a POST and always ACKs 200', async () => {
  const server = await serveVercelAdapter(webhook.default);
  try {
    const port = server.address().port;
    reset();
    const res = await fetch(`http://127.0.0.1:${port}/api/whatsapp-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [{
          changes: [{
            field: 'messages',
            value: {
              metadata: { phone_number_id: PHONE_ID },
              contacts: [{ profile: { name: 'Vercel Farmer' } }],
              messages: [{ from: '919800000009', id: 'wamid.VERCEL-1', type: 'text', text: { body: 'menu' } }],
            },
          }],
        }],
      }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'received' });
    // the router really ran: it sent the welcome menu back through the client
    assert.ok(requests.some((r) => r.body?.type === 'interactive'),
      'expected the router to reply with the welcome menu');
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

test('the Vercel adapter rejects an unsupported method with 405', async () => {
  const server = await serveVercelAdapter(webhook.default);
  try {
    const port = server.address().port;
    const res = await fetch(`http://127.0.0.1:${port}/api/whatsapp-webhook`, { method: 'DELETE' });
    assert.equal(res.status, 405);
  } finally {
    server.closeAllConnections?.();
    server.close();
  }
});

/* ── webhook signature verification ─────────────────────────────────── */

const inboundBody = (id) => JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [{
    changes: [{
      field: 'messages',
      value: {
        metadata: { phone_number_id: PHONE_ID },
        messages: [{ from: '919800000077', id, type: 'text', text: { body: 'menu' } }],
      },
    }],
  }],
});

test('signature check is skipped when WHATSAPP_APP_SECRET is unset (back-compat)', async () => {
  const { isSignatureVerificationEnabled, verifySignature } = await import('../server/whatsapp/verify.js');
  const prev = process.env.WHATSAPP_APP_SECRET;
  delete process.env.WHATSAPP_APP_SECRET;
  try {
    assert.equal(isSignatureVerificationEnabled(), false);
    assert.equal(verifySignature('anything', undefined).ok, true);
  } finally {
    if (prev !== undefined) process.env.WHATSAPP_APP_SECRET = prev;
  }
});

test('a forged webhook delivery is rejected with 401 once the app secret is set', async () => {
  const { signBody } = await import('../server/whatsapp/verify.js');
  process.env.WHATSAPP_APP_SECRET = 'test-app-secret-32-chars-long-ok';
  const server = await serveVercelAdapter(webhook.default);
  try {
    const port = server.address().port;
    const body = inboundBody('wamid.SIG-FORGED');
    reset();

    // 1. no signature at all
    let res = await fetch(`http://127.0.0.1:${port}/api/whatsapp-webhook`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    assert.equal(res.status, 401);

    // 2. a wrong signature
    res = await fetch(`http://127.0.0.1:${port}/api/whatsapp-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': 'sha256=deadbeef' },
      body,
    });
    assert.equal(res.status, 401);
    assert.equal(requests.filter((r) => r.body?.type).length, 0, 'nothing may be sent for a forged event');

    // 3. a correct signature — accepted and processed
    res = await fetch(`http://127.0.0.1:${port}/api/whatsapp-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signBody(body) },
      body,
    });
    assert.equal(res.status, 200);
    assert.ok(requests.some((r) => r.body?.type === 'interactive'), 'a validly signed event must be processed');
  } finally {
    server.closeAllConnections?.();
    server.close();
    delete process.env.WHATSAPP_APP_SECRET;
  }
});

/* ── env loader ─────────────────────────────────────────────────────── */

test('parseDotEnv handles quotes, comments and export prefixes', async () => {
  const { parseDotEnv } = await import('../server/whatsapp/env.js');
  const parsed = parseDotEnv([
    '# comment line',
    '',
    'export WHATSAPP_API_TOKEN=EAAplain',
    'QUOTED="has spaces"',
    "SINGLE='single quoted'",
    'WITH_TRAILING=value   # trailing comment',
    'EMPTY=',
  ].join('\n'));
  assert.equal(parsed.WHATSAPP_API_TOKEN, 'EAAplain');
  assert.equal(parsed.QUOTED, 'has spaces');
  assert.equal(parsed.SINGLE, 'single quoted');
  assert.equal(parsed.WITH_TRAILING, 'value');
  assert.equal(parsed.EMPTY, '');
});

test('upsertEnvVar updates an existing key and appends a new one', async () => {
  const { upsertEnvVar } = await import('../server/whatsapp/env.js');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'agripulse-env-')), '.env');
  fs.writeFileSync(file, '# keep me\nWHATSAPP_PHONE_NUMBER_ID=\nOTHER=1\n');
  assert.equal(upsertEnvVar(file, 'WHATSAPP_PHONE_NUMBER_ID', '123'), 'updated');
  assert.equal(upsertEnvVar(file, 'WHATSAPP_WABA_ID', '456'), 'added');
  const out = fs.readFileSync(file, 'utf8');
  assert.match(out, /# keep me/);
  assert.match(out, /WHATSAPP_PHONE_NUMBER_ID=123/);
  assert.match(out, /WHATSAPP_WABA_ID=456/);
});

/* ── credential setup CLI (the thing the user actually runs) ─────────── */

/**
 * The CLI is a separate process, and `spawnSync` blocks THIS process's event
 * loop — so the in-process mock above could never answer it (deadlock).
 * The mock therefore runs as its own process here.
 */
function startMockProcess() {
  const child = spawn(process.execPath, [path.join(ROOT, 'scripts/mock-graph-server.mjs')], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('mock server did not start')), 10_000);
    child.stdout.on('data', (chunk) => {
      const m = /MOCK_PORT=(\d+)/.exec(String(chunk));
      if (m) {
        clearTimeout(timer);
        resolve({ child, port: Number(m[1]) });
      }
    });
    child.on('exit', (code) => reject(new Error(`mock server exited early (${code})`)));
  });
}

test('whatsapp:setup discovers the phone-number id and writes it to .env', async () => {
  const mockProc = await startMockProcess();
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agripulse-setup-'));
    const envFile = path.join(dir, '.env');
    fs.writeFileSync(envFile, 'WHATSAPP_API_TOKEN=EAAtest-token-for-the-suite\n');

    const res = spawnSync(process.execPath, [path.join(ROOT, 'scripts/whatsapp-setup.js'), '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30_000,
      env: {
        ...process.env,
        ENV_FILE: envFile,
        WHATSAPP_GRAPH_BASE: `http://127.0.0.1:${mockProc.port}`,
        WHATSAPP_API_TOKEN: TOKEN,
        WHATSAPP_PHONE_NUMBER_ID: '', // must be discovered, not assumed
        WHATSAPP_VERIFY_TOKEN: 'test-verify-token',
      },
    });
    assert.equal(res.status, 0, `setup failed: ${res.stderr || res.stdout}`);
    const report = JSON.parse(res.stdout);
    assert.equal(report.ok, true);
    assert.equal(report.discoveredPhoneNumbers[0].id, PHONE_ID);
    assert.equal(report.discoveredPhoneNumbers[0].display, '+1 555 0100');
    assert.deepEqual(report.discoveryErrors, []);
    assert.deepEqual(report.config.missing, []);

    const written = fs.readFileSync(envFile, 'utf8');
    assert.match(written, new RegExp(`WHATSAPP_PHONE_NUMBER_ID=${PHONE_ID}`));
    assert.match(written, new RegExp(`WHATSAPP_WABA_ID=${WABA_ID}`));
  } finally {
    mockProc.child.kill('SIGKILL');
  }
});

test('whatsapp:setup reports a rejected token instead of guessing', async () => {
  const mockProc = await startMockProcess();
  try {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agripulse-setup-'));
    const envFile = path.join(dir, '.env');
    fs.writeFileSync(envFile, 'WHATSAPP_API_TOKEN=EAAbogus\n');
    const res = spawnSync(process.execPath, [path.join(ROOT, 'scripts/whatsapp-setup.js'), '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 30_000,
      env: {
        ...process.env,
        ENV_FILE: envFile,
        WHATSAPP_GRAPH_BASE: `http://127.0.0.1:${mockProc.port}`,
        WHATSAPP_API_TOKEN: 'EAAbogus', // mock rejects anything else with 190
        WHATSAPP_PHONE_NUMBER_ID: '',
      },
    });
    assert.notEqual(res.status, 0);
    const report = JSON.parse(res.stdout);
    assert.equal(report.ok, false);
    assert.match(report.error, /discover|expired|Invalid/i);
  } finally {
    mockProc.child.kill('SIGKILL');
  }
});
