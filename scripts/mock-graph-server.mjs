/**
 * Standalone mock Meta Graph API — used by tests/whatsapp.test.mjs to exercise
 * the credential-discovery CLI, which runs in a CHILD process (spawnSync blocks
 * the parent's event loop, so an in-process server could not answer it).
 *
 *   node tests/helpers/mock-graph-server.mjs   → prints MOCK_PORT=<port>
 *
 * Mirrors the response shapes Meta returns for:
 *   GET  /debug_token                  token introspection
 *   GET  /me/accounts                  system-user → WABA → phone_numbers
 *   GET  /{waba}/phone_numbers         explicit walk fallback
 *   GET  /{phone_number_id}            single-number read
 *   POST /{phone_number_id}/messages   message send
 */

import http from 'node:http';

const TOKEN = process.env.MOCK_TOKEN || 'EAAtest-token-for-the-suite';
const PHONE_ID = process.env.MOCK_PHONE_ID || '109876543210987';
const WABA_ID = process.env.MOCK_WABA_ID || '1234567890';

const PHONE = {
  id: PHONE_ID,
  display_phone_number: '+1 555 0100',
  verified_name: 'AgriPulse AI',
  quality_rating: 'GREEN',
};

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const url = new URL(req.url, 'http://localhost');
    const send = (obj, code = 200) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    if ((req.headers.authorization || '') !== `Bearer ${TOKEN}`) {
      return send({ error: { code: 190, message: 'Invalid OAuth access token' } }, 401);
    }
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
    if (url.pathname === '/me/accounts') {
      // Graph nests it twice:
      //   { data: [ { whatsapp_business_accounts: { data: [ { id, phone_numbers: { data: [phone] } } ] } } ] }
      return send({
        data: [{
          id: 'BUSINESS_1',
          name: 'AgriPulse Test Business',
          whatsapp_business_accounts: {
            data: [{
              id: WABA_ID,
              name: 'AgriPulse Test WABA',
              phone_numbers: { data: [PHONE] },
            }],
          },
        }],
      });
    }
    if (url.pathname === `/${WABA_ID}/phone_numbers`) return send({ data: [PHONE] });
    if (url.pathname === `/${PHONE_ID}`) return send(PHONE);
    if (url.pathname === `/${PHONE_ID}/messages`) {
      const parsed = body ? JSON.parse(body) : {};
      if (JSON.stringify(parsed).includes('TRIGGER_400')) {
        return send({ error: { code: 131030, message: 'Recipient phone number not in allowed list' } }, 400);
      }
      return send({ messaging_product: 'whatsapp', messages: [{ id: `wamid.MOCK${Date.now()}` }] });
    }
    return send({ error: { code: 100, message: `Unsupported path ${url.pathname}` } }, 404);
  });
});

server.listen(0, '127.0.0.1', () => {
  process.stdout.write(`MOCK_PORT=${server.address().port}\n`);
});
