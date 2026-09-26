#!/usr/bin/env node
/**
 * `npm run whatsapp:setup` — verify the Meta credentials in .env and finish
 * the WhatsApp wiring automatically.
 * ─────────────────────────────────────────────────────────────────────────
 * A pasted access token is only HALF the credential set: sending also needs
 * the *phone number id*, which is not derivable from the token by eye. This
 * script reads it straight out of the Meta Business graph and writes it back
 * into `.env` so there is no copy-paste step and no chance of pasting the
 * display phone number (the #1 Cloud API mistake) by hand.
 *
 *   npm run whatsapp:setup                       verify + discover + write .env
 *   npm run whatsapp:setup -- --send 919812345678 …and send a live test message
 *   npm run whatsapp:setup -- --phone-number-id 123456789012345   pin a number
 *   npm run whatsapp:setup -- --json             machine-readable report
 *   npm run whatsapp:setup -- --no-write         verify only, don't touch .env
 *
 * Discovery order (first hit wins, every step is skipped on Graph error):
 *   1. GET /me/accounts?fields=…             system-user tokens
 *   2. GET /me?fields=businesses{…}          user tokens (API-Setup page)
 *   3. GET /{phone_number_id}                pin the id that's already set
 */

import process from 'node:process';
import { loadDotEnv, upsertEnvVar, maskSecret, ENV_FILE as DEFAULT_ENV_FILE } from '../server/whatsapp/env.js';
import { GRAPH_API_VERSION, config, describeConfig } from '../server/whatsapp/config.js';

// Overridable so the test suite can point the script at a fixture .env.
const ENV_FILE = process.env.ENV_FILE || DEFAULT_ENV_FILE;

/* ── CLI flags ──────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : '';
};

const SEND_TO = opt('--send');
const FORCE_ID = opt('--phone-number-id');
const JSON_OUT = flag('--json');
const WRITE = !flag('--no-write');

const log = (...a) => { if (!JSON_OUT) console.log(...a); };
const fail = (msg, hint) => {
  if (JSON_OUT) {
    console.log(JSON.stringify({ ok: false, error: msg, hint: hint || null }, null, 2));
  } else {
    console.error(`\n❌ ${msg}`);
    if (hint) console.error(`   → ${hint}`);
  }
  process.exitCode = 1;
};

/* ── Graph transport ────────────────────────────────────────────────── */

const HINTS = [
  [102, 'Token missing `whatsapp_business_management` — discovery needs it. Sending alone only needs `whatsapp_business_messaging`.'],
  [190, 'Token is expired or revoked. The API-Setup page token lives 24 h — create a System User token instead.'],
  [10, 'The app has not been granted this permission for your user. Re-authorise with `whatsapp_business_messaging`.'],
  [100, 'Bad request — usually the id in the URL is not a resource this token can see.'],
  [131026, 'Recipient is not on your test-recipient list (unregistered numbers on a test WABA are rejected).'],
  [131030, 'Recipient not in the allowed list for this test number — add them under WhatsApp → API Setup → To.'],
  [133000, 'Generic messaging error — check the number format (international, digits only, no `+`).'],
  [368, 'App is blocked or the account is temporarily restricted.'],
];

async function graph(pathname, { method = 'GET', body } = {}) {
  const url = `${config.graphBase}/${String(pathname).replace(/^\//, '')}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (err) {
    // fetch throws TypeError on DNS/TLS/refused — that's a network problem,
    // not a credential problem. Say so, or the user chases the wrong fix.
    const e = new Error(`cannot reach ${config.graphBase} (${err.cause?.code || err.message})`);
    e.network = true;
    e.hint = 'No route to the Meta Graph API from this machine — check DNS/proxy/firewall, or run this on the deploy host.';
    throw e;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json?.error || {};
    const e = new Error(err.message || `HTTP ${res.status}`);
    e.code = err.code ?? res.status;
    e.subcode = err.error_subcode;
    e.hint = HINTS.find(([c]) => c === e.code || c === e.subcode)?.[1] || '';
    throw e;
  }
  return json;
}

/* ── 1. token introspection ─────────────────────────────────────────── */

async function inspectToken() {
  try {
    // graph() adds the Authorization header; input_token is the token itself.
    const { data } = await graph(`debug_token?input_token=${encodeURIComponent(config.apiToken)}`);
    return data || {};
  } catch (err) {
    // debug_token needs an app access token for some setups — non-fatal.
    return { is_valid: null, note: err.message };
  }
}

/* ── 2. phone-number discovery ──────────────────────────────────────── */

const PHONE_FIELDS = 'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier';

async function phoneNumbersOf(wabaId) {
  try {
    const res = await graph(`${wabaId}/phone_numbers?fields=${PHONE_FIELDS}`);
    return res.data || [];
  } catch (err) {
    if (err.network) throw err; // a dead network is not "no numbers"
    return [];
  }
}

/** System-user tokens: /me/accounts → data[].whatsapp_business_accounts{phone_numbers}. */
async function discoverViaSystemUser() {
  const found = [];
  let accounts = [];
  try {
    const me = await graph(`me/accounts?fields=id,name,whatsapp_business_accounts{${PHONE_FIELDS}}`);
    // Graph nests the result: { data: [ { whatsapp_business_accounts: { data: [...] } } ] }
    accounts = me?.data || [];
  } catch (err) {
    return { found, error: err.hint || err.message, network: Boolean(err.network) };
  }
  for (const acct of accounts) {
    for (const waba of acct.whatsapp_business_accounts?.data || []) {
      for (const phone of waba.phone_numbers?.data || []) {
        found.push({ ...phone, wabaId: waba.id, wabaName: waba.name, via: 'system-user' });
      }
    }
  }
  if (found.length) return { found };
  // Nested field expansion isn't always permitted — walk it explicitly.
  const wabaIds = [];
  for (const acct of accounts) {
    for (const waba of acct.whatsapp_business_accounts?.data || []) wabaIds.push([waba.id, waba.name]);
  }
  try {
    for (const [id, name] of wabaIds) {
      for (const phone of await phoneNumbersOf(id)) {
        found.push({ ...phone, wabaId: id, wabaName: name, via: 'system-user-walk' });
      }
    }
  } catch (err) {
    if (!err.network) throw err;
    return { found, error: err.hint || err.message, network: true };
  }
  return { found };
}

/** User tokens (the API-Setup page): /me → businesses → owned WABAs → phones. */
async function discoverViaBusinesses() {
  let businesses;
  try {
    const me = await graph('me?fields=businesses{id,name}');
    businesses = me?.businesses?.data || [];
  } catch (err) {
    return { found: [], error: err.hint || err.message, network: Boolean(err.network) };
  }
  const found = [];
  for (const biz of businesses) {
    let wabas = [];
    try {
      wabas = (await graph(`${biz.id}/owned_whatsapp_business_accounts?fields=id,name`))?.data || [];
    } catch { /* business we can't manage */ }
    for (const waba of wabas) {
      for (const phone of await phoneNumbersOf(waba.id)) {
        found.push({ ...phone, wabaId: waba.id, wabaName: waba.name, businessId: biz.id, via: 'business' });
      }
    }
  }
  return { found };
}

/** Last resort: the id already in .env — confirm it belongs to this token. */
async function verifyPinnedId(id) {
  if (!id) return null;
  try {
    const phone = await graph(`${id}?fields=${PHONE_FIELDS}`);
    return { ...phone, via: 'configured' };
  } catch {
    return null;
  }
}

/* ── 3. live send test ──────────────────────────────────────────────── */

async function sendTest(to) {
  const { sendTextMessage } = await import('../server/whatsapp/client.js');
  return sendTextMessage(to,
    '🌾 *AgriPulse AI* — WhatsApp integration *LIVE*!\n\n' +
    'Yeh message server se aaya hai. Ab aap yahan likh sakte hain:\n' +
    '• *mandi* — aaj ke bhav\n' +
    '• *patti* — parchi audit\n' +
    '• *scan* — fasal ki photo se rog\n\n' +
    '_Reply karo: menu_');
}

/* ── main ───────────────────────────────────────────────────────────── */

async function main() {
  loadDotEnv();

  const report = { ok: true, envFile: ENV_FILE, config: describeConfig(), steps: [] };
  const step = (name, detail) => { report.steps.push({ name, ...detail }); log(`  ${detail.ok === false ? '✗' : '✓'} ${name} — ${detail.detail || ''}`); };

  log('\n🔐 AgriPulse × WhatsApp Cloud API — credential check');
  log(`   Graph ${GRAPH_API_VERSION} · .env: ${ENV_FILE}`);

  if (!config.apiToken) {
    return fail('WHATSAPP_API_TOKEN is not set.',
      'Put it in .env (or Vercel env vars), then re-run `npm run whatsapp:setup`.');
  }
  log(`   token ${maskSecret(config.apiToken)}`);

  /* 1 — is the token good? */
  const info = await inspectToken();
  const scopes = info.scopes || info.granular_scopes?.map((s) => s.scope) || [];
  const expiresIn = info.expires_at ? Math.round((info.expires_at - Date.now() / 1000) / 3600) : null;
  if (info.is_valid === false) {
    return fail(`Meta rejected the token: ${info.error?.message || 'invalid'}`,
      'Generate a fresh System User token with whatsapp_business_messaging.');
  }
  step('Token introspection', {
    detail: info.is_valid === null
      ? `debug_token unavailable (${info.note}) — continuing with live calls`
      : `valid, scopes: ${scopes.join(', ') || '(none reported)'}${expiresIn !== null ? `, expires in ${expiresIn}h` : ', no expiry'}`,
    is_valid: info.is_valid,
    scopes,
    expires_at: info.expires_at ?? null,
    expires_in_hours: expiresIn,
    app_id: info.app_id || null,
    type: info.type || null,
  });
  if (expiresIn !== null && expiresIn < 24) {
    log(`   ⚠️  This token expires in ~${expiresIn}h — it is the temporary API-Setup token.`);
    log('      Create a permanent System User token for production (docs/WHATSAPP_INTEGRATION.md step 2).');
  }
  if (scopes.length && !scopes.some((s) => String(s).includes('whatsapp_business_messaging'))) {
    log('   ⚠️  `whatsapp_business_messaging` not in the reported scopes — sends will fail with code 10.');
  }

  /* 2 — find the phone number id */
  let phones = [];
  const discoveryErrors = [];
  let networkDown = false;
  if (FORCE_ID) {
    const pinned = await verifyPinnedId(FORCE_ID);
    phones = pinned ? [pinned] : [];
    if (!pinned) log(`   ⚠️  --phone-number-id ${FORCE_ID} could not be read with this token — trying anyway.`);
  } else {
    let res = await discoverViaSystemUser();
    if (res.error) discoveryErrors.push(`system-user: ${res.error}`);
    if (res.network) networkDown = true;
    phones = res.found;
    if (!phones.length) {
      res = await discoverViaBusinesses();
      if (res.error) discoveryErrors.push(`business: ${res.error}`);
      if (res.network) networkDown = true;
      phones = res.found;
    }
    if (!phones.length && config.phoneNumberId) {
      const pinned = await verifyPinnedId(config.phoneNumberId);
      if (pinned) phones = [pinned];
    }
  }
  report.discoveryErrors = discoveryErrors;
  report.networkDown = networkDown;
  if (discoveryErrors.length) discoveryErrors.forEach((e) => log(`   · ${e}`));

  report.discoveredPhoneNumbers = phones.map((p) => ({
    id: p.id, display: p.display_phone_number, verified_name: p.verified_name,
    quality: p.quality_rating, wabaId: p.wabaId, wabaName: p.wabaName, via: p.via,
  }));

  if (!phones.length) {
    step('Phone-number discovery', { ok: false, detail: 'no phone numbers visible to this token' });
    if (networkDown) {
      return fail('Could not reach the Meta Graph API, so nothing could be verified.',
        'This machine has no route to graph.facebook.com. Re-run on a host with internet access, or set WHATSAPP_PHONE_NUMBER_ID by hand from Meta → your app → WhatsApp → API Setup.');
    }
    log('\n   Copy the *Phone number ID* from Meta → your app → WhatsApp → API Setup, then:');
    log('     npm run whatsapp:setup -- --phone-number-id <PHONE_NUMBER_ID>');
    return fail('WHATSAPP_PHONE_NUMBER_ID could not be discovered.',
      'Discovery needs `whatsapp_business_management`; the id is always visible in the API Setup page.');
  }

  let chosen = phones[0];
  if (phones.length > 1 && !FORCE_ID) {
    log(`\n   Multiple numbers on this token — using the first. Pick another with --phone-number-id:`);
    phones.forEach((p, i) => log(`     ${i + 1}. ${p.id}  ${p.display_phone_number || ''}  ${p.verified_name || ''}${i === 0 ? '  ← chosen' : ''}`));
    log('');
  }
  step('Phone-number discovery', {
    detail: `${chosen.id} (${chosen.display_phone_number || 'no display number'}${chosen.verified_name ? `, ${chosen.verified_name}` : ''})`,
    id: chosen.id,
    display: chosen.display_phone_number || null,
    quality_rating: chosen.quality_rating || null,
    via: chosen.via,
  });

  /* 3 — persist into .env so every process boots LIVE */
  const writes = [];
  if (WRITE) {
    writes.push(['WHATSAPP_PHONE_NUMBER_ID', chosen.id, upsertEnvVar(ENV_FILE, 'WHATSAPP_PHONE_NUMBER_ID', chosen.id)]);
    if (chosen.wabaId) writes.push(['WHATSAPP_WABA_ID', chosen.wabaId, upsertEnvVar(ENV_FILE, 'WHATSAPP_WABA_ID', chosen.wabaId)]);
    if (chosen.display_phone_number) writes.push(['WHATSAPP_BUSINESS_PHONE', chosen.display_phone_number, upsertEnvVar(ENV_FILE, 'WHATSAPP_BUSINESS_PHONE', chosen.display_phone_number)]);
    process.env.WHATSAPP_PHONE_NUMBER_ID = chosen.id; // same-process, no restart needed
    if (chosen.wabaId) process.env.WHATSAPP_WABA_ID = chosen.wabaId;
  }
  report.written = writes.map(([k, , action]) => ({ key: k, action }));
  step('Persisted to .env', {
    detail: WRITE ? writes.map(([k, , a]) => `${k} (${a})`).join(', ') : 'skipped (--no-write)',
  });
  if (chosen.quality_rating && chosen.quality_rating !== 'GREEN' && chosen.quality_rating !== 'NA') {
    log(`   ⚠️  Number quality rating is ${chosen.quality_rating} — Meta is throttling this sender.`);
  }

  /* 4 — optional live send */
  if (SEND_TO) {
    try {
      const out = await sendTest(SEND_TO);
      const id = out?.messages?.[0]?.id;
      step('Live send test', { detail: `message ${id} → ${SEND_TO}`, message_id: id, to: SEND_TO });
      log('\n   📲 Check that phone — if it arrived, the outbound path is fully wired.');
    } catch (err) {
      step('Live send test', { ok: false, detail: `${err.message}${err.code ? ` (code ${err.code})` : ''}` });
      return fail('Live send failed.', err.hint || 'See the Meta error above.');
    }
  }

  /* 5 — what's left */
  const cfg = describeConfig();
  report.config = cfg;
  report.nextSteps = [
    `Set the SAME vars in Vercel → Project → Settings → Environment Variables (${cfg.missing.join(', ') || 'all present locally'})`,
    cfg.verifyTokenIsDefault
      ? 'Pick a real WHATSAPP_VERIFY_TOKEN — the default "agripulse-verify" is guessable'
      : 'Verify token is custom ✓',
    'Meta app → WhatsApp → Configuration → Callback URL: https://<your-deployment>/api/whatsapp-webhook',
    'Verify token in Meta must equal WHATSAPP_VERIFY_TOKEN exactly, then Subscribe to the `messages` field',
  ];
  if (!JSON_OUT) {
    log('\n📋 Next:');
    report.nextSteps.forEach((s, i) => log(`   ${i + 1}. ${s}`));
    log(`\n   Webhook status endpoint: GET /api/whatsapp-webhook?status=1  ·  npm run whatsapp:server`);
    log('✅ Credential check complete.\n');
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
}

main().catch((err) => fail(err.message, err.hint));
