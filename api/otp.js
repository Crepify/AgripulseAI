/**
 * Vercel Function  POST /api/otp
 *
 * REAL SMS OTP delivery — sends the login code to the farmer's phone instead
 * of displaying it on the website. Providers (first configured wins):
 *
 *   Twilio     TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER
 *              https://console.twilio.com (works worldwide; trial accounts
 *              can only send to verified caller numbers)
 *   MSG91      MSG91_AUTH_KEY + MSG91_TEMPLATE_ID (+ MSG91_SENDER_ID)
 *              https://msg91.com (India; the template must exist in DLT)
 *   Fast2SMS   FAST2SMS_API_KEY
 *              https://www.fast2sms.com (India; uses the quick route)
 *
 * With no provider configured the route answers { ok:false, error:'not_configured' }
 * and the frontend falls back to the on-screen demo OTP — nothing breaks.
 *
 * Design: STATELESS signed tokens (HMAC-SHA256). The OTP code itself is never
 * returned to the client — only a signed blob containing its hash, expiry,
 * attempt counter and resend counter. Works across serverless instances
 * without a database. OTP_SECRET can pin the signing key; otherwise it is
 * derived from the provider credential (stable per account).
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { jsonResponse } from './_lib/upstream.js';

const OTP_TTL_MS = 5 * 60 * 1000;      // code valid 5 minutes
const OTP_MAX_ATTEMPTS = 3;            // wrong entries before lockout
const OTP_RESEND_COOLDOWN_S = 30;      // seconds between sends
const OTP_MAX_SENDS = 5;               // per login flow (tracked in the token)

// ── provider detection ───────────────────────────────────────────────────────

function providerConfig() {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    return { name: 'twilio' };
  }
  if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) {
    return { name: 'msg91' };
  }
  if (process.env.FAST2SMS_API_KEY) {
    return { name: 'fast2sms' };
  }
  return null;
}

function otpSecret() {
  return (
    process.env.OTP_SECRET
    || process.env.TWILIO_AUTH_TOKEN
    || process.env.MSG91_AUTH_KEY
    || process.env.FAST2SMS_API_KEY
    || ''
  );
}

// ── phone helpers ────────────────────────────────────────────────────────────

function normalizeMobile(input) {
  const digits = String(input || '').replace(/\D/g, '').replace(/^(91|0)/, '');
  return digits;
}

function isValidIndianMobile(mobile) {
  return /^[6-9]\d{9}$/.test(mobile);
}

function maskMobile(mobile) {
  return `+91 ${mobile.slice(0, 2)}•••••${mobile.slice(7)}`;
}

// ── stateless signed tokens ──────────────────────────────────────────────────

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', otpSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function parseToken(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', otpSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null; // tampered
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function hashCode(mobile, code) {
  return createHash('sha256').update(`${mobile}:${code}:${otpSecret()}`).digest('hex');
}

function safeEqualHex(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// ── SMS dispatch ─────────────────────────────────────────────────────────────

async function sendSms(mobile, code, provider) {
  const e164 = `+91${mobile}`;
  const text = `${code} is your AgriPulse AI login code. Valid 5 minutes. Do not share it with anyone.`;

  if (provider === 'twilio') {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: e164, From: process.env.TWILIO_FROM_NUMBER, Body: text }),
    });
    if (!res.ok) throw new Error(`twilio ${res.status}: ${(await res.text()).slice(0, 180)}`);
    return;
  }

  if (provider === 'msg91') {
    const params = new URLSearchParams({
      template_id: process.env.MSG91_TEMPLATE_ID,
      mobile: `91${mobile}`,
      otp: code,
    });
    if (process.env.MSG91_SENDER_ID) params.set('sender', process.env.MSG91_SENDER_ID);
    const res = await fetch(`https://control.msg91.com/api/v5/otp?${params.toString()}`, {
      method: 'POST',
      headers: { authkey: process.env.MSG91_AUTH_KEY },
    });
    if (!res.ok) throw new Error(`msg91 ${res.status}: ${(await res.text()).slice(0, 180)}`);
    return;
  }

  if (provider === 'fast2sms') {
    const base = {
      method: 'POST',
      headers: {
        authorization: process.env.FAST2SMS_API_KEY,
        'content-type': 'application/x-www-form-urlencoded',
      },
    };
    // 1) Dedicated OTP route — reaches DND numbers, but requires account KYC
    //    (PAN/Aadhaar/website verification) which many hackathon teams skip.
    const otpRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      ...base,
      body: new URLSearchParams({ route: 'otp', variables_values: code, numbers: mobile }),
    });
    const otpData = await otpRes.json().catch(() => null);
    if (otpRes.ok && otpData?.return !== false) return;

    // 2) KYC locked (status 996) → promotional quick route still works
    //    WITHOUT any KYC. Delivers to non-DND numbers, 9am–9pm — fine for a
    //    daytime demo. Any other error is a real failure.
    const kycLocked = otpData?.status_code === 996 || /verification|kyc/i.test(otpData?.message || '');
    if (!kycLocked) {
      throw new Error(`fast2sms ${otpRes.status}: ${JSON.stringify(otpData || {}).slice(0, 180)}`);
    }
    const qRes = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      ...base,
      body: new URLSearchParams({ route: 'q', message: text, numbers: mobile }),
    });
    const qData = await qRes.json().catch(() => null);
    if (!qRes.ok || qData?.return === false) {
      throw new Error(`fast2sms ${qRes.status}: ${JSON.stringify(qData || {}).slice(0, 180)}`);
    }
    return;
  }

  throw new Error(`unknown provider: ${provider}`);
}

// ── handler ──────────────────────────────────────────────────────────────────

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: 'bad_request' }, 400);
  }

  const action = body?.action;
  const mobile = normalizeMobile(body?.mobile);
  if (!isValidIndianMobile(mobile)) {
    return jsonResponse({ ok: false, error: 'invalid_mobile' }, 400);
  }

  // ── send a code to the phone ────────────────────────────────────────────
  if (action === 'send') {
    const provider = providerConfig();
    if (!provider) {
      // No SMS gateway on this deployment → the client falls back to demo mode
      return jsonResponse({ ok: false, error: 'not_configured' });
    }

    const prev = body.token ? parseToken(body.token) : null;
    if (prev && prev.m === mobile) {
      if (Date.now() - prev.sentAt < OTP_RESEND_COOLDOWN_S * 1000) {
        return jsonResponse({
          ok: false,
          error: 'cooldown',
          waitSeconds: Math.ceil((OTP_RESEND_COOLDOWN_S * 1000 - (Date.now() - prev.sentAt)) / 1000),
        });
      }
      if (prev.sends >= OTP_MAX_SENDS) {
        return jsonResponse({ ok: false, error: 'max_sends' });
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = Date.now();
    const payload = {
      m: mobile,
      h: hashCode(mobile, code),
      sentAt: now,
      expiresAt: now + OTP_TTL_MS,
      sends: (prev && prev.m === mobile ? prev.sends : 0) + 1,
      attemptsLeft: OTP_MAX_ATTEMPTS,
    };

    try {
      await sendSms(mobile, code, provider.name);
    } catch (err) {
      return jsonResponse({ ok: false, error: 'sms_failed', detail: err.message }, 502);
    }

    // NOTE: the code is deliberately NOT in this response — it went to the phone.
    return jsonResponse({
      ok: true,
      channel: 'sms',
      provider: provider.name,
      token: sign(payload),
      masked: maskMobile(mobile),
      expiresAt: payload.expiresAt,
      waitSeconds: OTP_RESEND_COOLDOWN_S,
    });
  }

  // ── verify a code ───────────────────────────────────────────────────────
  if (action === 'verify') {
    const t = parseToken(body.token);
    if (!t || t.m !== mobile) {
      return jsonResponse({ ok: false, error: 'invalid_token' }, 400);
    }
    if (Date.now() > t.expiresAt) {
      return jsonResponse({ ok: false, error: 'expired' });
    }
    const code = String(body.code || '').replace(/\D/g, '');
    if (code.length !== 6) {
      return jsonResponse({ ok: false, error: 'bad_format' });
    }
    if (safeEqualHex(hashCode(mobile, code), t.h)) {
      return jsonResponse({ ok: true, masked: maskMobile(mobile) });
    }
    const attemptsLeft = (t.attemptsLeft ?? OTP_MAX_ATTEMPTS) - 1;
    if (attemptsLeft <= 0) {
      return jsonResponse({ ok: false, error: 'max_attempts' });
    }
    // re-sign with the decremented counter so the client can keep trying
    return jsonResponse({
      ok: false,
      error: 'wrong_code',
      attemptsLeft,
      token: sign({ ...t, attemptsLeft }),
    });
  }

  return jsonResponse({ ok: false, error: 'unknown_action' }, 400);
}
