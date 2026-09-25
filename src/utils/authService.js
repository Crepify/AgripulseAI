// ─────────────────────────────────────────────────────────────────────────────
// AgriPulse AI — Authentication Service (Device-Local, Offline-First)
//
// Local demo login for a frontend-only PWA (not production authentication):
//   • Indian mobile number validation (+91, 10 digits, starts 6-9)
//   • Aadhaar verification (12 digits + Verhoeff checksum) — demo offline check
//   • On-device 6-digit OTP with 5-minute expiry, max 3 verify attempts,
//     30-second resend cooldown and a per-session resend cap
//   • OTP is "delivered" through a simulated SMS push notification in the UI
//     (and console.log for developers) since no SMS backend exists
//   • Google demo sign-in is a local dummy profile; it never contacts Google.
//   • Farmer profiles + demo sessions are persisted in localStorage for 30 days.
// ─────────────────────────────────────────────────────────────────────────────

const USERS_KEY = 'ap_users_v1';
const SESSION_KEY = 'ap_session_v1';
const OTP_KEY = 'ap_otp_v1';
const AADHAAR_OTP_KEY = 'ap_aadhaar_otp_v1';
const AADHAAR_VERIFIED_KEY = 'ap_aadhaar_verified_v1';

export const SESSION_DAYS = 30;
export const OTP_TTL_MS = 5 * 60 * 1000;       // 5 minutes
export const OTP_RESEND_COOLDOWN_S = 30;        // 30 seconds
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_MAX_SENDS = 5;                 // per pending login flow

// ── helpers ──────────────────────────────────────────────────────────────────

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / private mode — non-fatal for session UX
  }
}

function maskMobile(mobile) {
  return `+91 ${mobile.slice(0, 2)}•••••${mobile.slice(7)}`;
}

// ── validation ───────────────────────────────────────────────────────────────

// Indian mobile: 10 digits, first digit 6-9 (optionally typed with +91/0 prefix)
export function normalizeMobile(input) {
  const digits = String(input || '').replace(/\D/g, '');
  const stripped = digits.replace(/^(91|0)/, '');
  return stripped.length === 10 ? stripped : digits.length === 10 ? digits : stripped;
}

export function isValidIndianMobile(input) {
  return /^[6-9]\d{9}$/.test(normalizeMobile(input));
}

export function isValidName(name) {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 40;
}

// ── Aadhaar validation (Verhoeff algorithm) ──────────────────────────────────
// UIDAI Aadhaar: 12 digits, Verhoeff checksum, first digit 2-9 (0,1 not allowed per enrolment rules)

const verhoeffD = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,2,3,4,0,6,7,8,9,5],
  [2,3,4,0,1,7,8,9,5,6],
  [3,4,0,1,2,8,9,5,6,7],
  [4,0,1,2,3,9,5,6,7,8],
  [5,9,8,7,6,0,4,3,2,1],
  [6,5,9,8,7,1,0,4,3,2],
  [7,6,5,9,8,2,1,0,4,3],
  [8,7,6,5,9,3,2,1,0,4],
  [9,8,7,6,5,4,3,2,1,0],
];
const verhoeffP = [
  [0,1,2,3,4,5,6,7,8,9],
  [1,5,7,6,2,8,3,0,9,4],
  [5,8,0,3,7,9,6,1,4,2],
  [8,9,1,6,0,4,3,7,2,5],
  [9,4,5,3,1,2,6,8,7,0],
  [4,2,8,6,5,7,3,9,0,1],
  [2,7,9,3,8,0,6,4,1,5],
  [7,0,4,6,9,1,3,2,5,8],
];
const verhoeffInv = [0,4,3,2,1,5,6,7,8,9];

function verhoeffCheck(numStr) {
  let c = 0;
  const reversed = numStr.split('').reverse().map(d => parseInt(d,10));
  for (let i = 0; i < reversed.length; i++) {
    c = verhoeffD[c][verhoeffP[i % 8][reversed[i]]];
  }
  return c === 0;
}

// ── Demo / presentation mode ────────────────────────────────────────────────
// When ON: any 12-digit Aadhaar (first digit 2-9) passes format checks so the
// full OTP flow can be demonstrated without a real UIDAI number. Real Verhoeff
// validation stays active whenever demo mode is off.
const DEMO_KEY = 'ap_demo_mode';

export function isDemoMode() {
  try { return localStorage.getItem(DEMO_KEY) === '1'; } catch { return false; }
}

export function setDemoMode(on) {
  try { localStorage.setItem(DEMO_KEY, on ? '1' : '0'); } catch {}
}

/** One-tap presentation login: verified sample farmer, no OTP typing. */
export function createDemoSession() {
  setDemoMode(true);
  const user = registerUser({
    name: 'Ramesh Patil', mobile: '9876543210',
    village: 'Khed', state: 'Maharashtra', aadhaar: '234123412346',
  });
  return saveSession({ ...user, aadhaarVerified: true, authProvider: 'demo' });
}

export function normalizeAadhaar(input) {
  return String(input || '').replace(/\D/g, '').slice(0,12);
}

export function isValidAadhaar(input) {
  const digits = normalizeAadhaar(input);
  // Demo mode: accept any well-formed 12-digit number so juries/presenters
  // can walk the whole Aadhaar OTP flow without a real UIDAI number.
  if (isDemoMode()) return /^[2-9]\d{11}$/.test(digits);
  if (!/^[2-9]\d{11}$/.test(digits)) return false;
  // Verhoeff checksum for Aadhaar
  return verhoeffCheck(digits);
}

export function maskAadhaar(aadhaar) {
  const d = normalizeAadhaar(aadhaar);
  if (d.length !== 12) return '•••• •••• ••••';
  return `•••• •••• ${d.slice(8)}`;
}

export function formatAadhaar(aadhaar) {
  const d = normalizeAadhaar(aadhaar);
  if (d.length <= 4) return d;
  if (d.length <= 8) return `${d.slice(0,4)} ${d.slice(4)}`;
  return `${d.slice(0,4)} ${d.slice(4,8)} ${d.slice(8,12)}`;
}

// ── farmer profile store ─────────────────────────────────────────────────────

export function getUser(mobile) {
  const users = readJson(USERS_KEY, {});
  return users[mobile] || null;
}

export function getUserByAadhaar(aadhaar) {
  const users = readJson(USERS_KEY, {});
  const norm = normalizeAadhaar(aadhaar);
  return Object.values(users).find(u => u.aadhaar && normalizeAadhaar(u.aadhaar) === norm) || null;
}

export function registerUser({ name, mobile, village, state, aadhaar }) {
  const users = readJson(USERS_KEY, {});
  const existing = users[mobile] || {};
  const profile = {
    name: name.trim(),
    mobile,
    village: (village || '').trim(),
    state: state || 'Karnataka',
    aadhaar: aadhaar ? normalizeAadhaar(aadhaar) : existing.aadhaar || '',
    aadhaarVerified: aadhaar ? true : existing.aadhaarVerified || false,
    aadhaarVerifiedAt: aadhaar ? Date.now() : existing.aadhaarVerifiedAt || null,
    createdAt: existing.createdAt || Date.now(),
    lastLoginAt: Date.now(),
  };
  users[mobile] = profile;
  writeJson(USERS_KEY, users);
  return profile;
}

export function updateLastLogin(mobile) {
  const users = readJson(USERS_KEY, {});
  if (users[mobile]) {
    users[mobile].lastLoginAt = Date.now();
    writeJson(USERS_KEY, users);
    return users[mobile];
  }
  return null;
}

export function linkAadhaarToUser(mobile, aadhaar) {
  const users = readJson(USERS_KEY, {});
  const norm = normalizeAadhaar(aadhaar);
  if (!users[mobile]) return null;
  users[mobile].aadhaar = norm;
  users[mobile].aadhaarVerified = true;
  users[mobile].aadhaarVerifiedAt = Date.now();
  writeJson(USERS_KEY, users);
  // also store verified list for quick lookup
  const verified = readJson(AADHAAR_VERIFIED_KEY, {});
  verified[norm] = { mobile, verifiedAt: Date.now() };
  writeJson(AADHAAR_VERIFIED_KEY, verified);
  return users[mobile];
}

export function isAadhaarVerified(aadhaar) {
  const verified = readJson(AADHAAR_VERIFIED_KEY, {});
  const norm = normalizeAadhaar(aadhaar);
  return Boolean(verified[norm]);
}

// ── OTP lifecycle (mobile) ───────────────────────────────────────────────────

export function requestOtp(mobile) {
  const pending = readJson(OTP_KEY, null);

  // Resend cooldown enforcement
  if (pending && pending.mobile === mobile && Date.now() - pending.sentAt < OTP_RESEND_COOLDOWN_S * 1000) {
    return {
      ok: false,
      error: 'cooldown',
      waitSeconds: Math.ceil((OTP_RESEND_COOLDOWN_S * 1000 - (Date.now() - pending.sentAt)) / 1000),
    };
  }

  const sendsSoFar = pending && pending.mobile === mobile ? pending.sends : 0;
  if (sendsSoFar >= OTP_MAX_SENDS) {
    return { ok: false, error: 'max_sends' };
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  writeJson(OTP_KEY, {
    mobile,
    otp,
    sentAt: Date.now(),
    expiresAt: Date.now() + OTP_TTL_MS,
    attemptsLeft: OTP_MAX_ATTEMPTS,
    sends: sendsSoFar + 1,
  });

  // Simulated SMS delivery — surfaced in UI as a push-notification styled card
  console.log(`%c[AgriPulse SMS] OTP for ${maskMobile(mobile)} is ${otp} (valid 5 min)`, 'background:#10b981;color:#000;padding:4px 8px;border-radius:4px;font-weight:bold');
  return { ok: true, otp, masked: maskMobile(mobile) };
}

export function getOtpDebug() {
  // Lets the simulated-SMS banner display the code
  const pending = readJson(OTP_KEY, null);
  if (!pending || Date.now() > pending.expiresAt) return null;
  return { otp: pending.otp, masked: maskMobile(pending.mobile), expiresAt: pending.expiresAt };
}

export function verifyOtp(mobile, code) {
  const pending = readJson(OTP_KEY, null);
  if (!pending || pending.mobile !== mobile) {
    return { ok: false, error: 'no_pending' };
  }
  if (Date.now() > pending.expiresAt) {
    localStorage.removeItem(OTP_KEY);
    return { ok: false, error: 'expired' };
  }
  if (String(code) === pending.otp) {
    localStorage.removeItem(OTP_KEY);
    return { ok: true };
  }

  const attemptsLeft = pending.attemptsLeft - 1;
  if (attemptsLeft <= 0) {
    localStorage.removeItem(OTP_KEY);
    return { ok: false, error: 'max_attempts' };
  }
  writeJson(OTP_KEY, { ...pending, attemptsLeft });
  return { ok: false, error: 'wrong_code', attemptsLeft };
}

// ── real SMS OTP (server route /api/otp) ─────────────────────────────────────
//
// When the deployment has an SMS provider configured (Twilio / MSG91 /
// Fast2SMS), the code is sent to the farmer's actual phone and NEVER shown
// on the website. Without a provider the route answers not_configured and
// the caller falls back to the on-screen demo OTP above.

export async function serverSendOtp(mobile, token) {
  try {
    const res = await fetch('/api/otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'send', mobile, token }),
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'offline' };
  }
}

export async function serverVerifyOtp(mobile, code, token) {
  try {
    const res = await fetch('/api/otp', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'verify', mobile, code, token }),
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'offline' };
  }
}

// ── real Google sign-in (server route /api/google) ───────────────────────────
//
// Google Identity Services returns an RS256 ID-token JWT in the browser; it is
// verified SERVER-SIDE (/api/google) against Google's public keys. Only the
// verified profile reaches the app. Without GOOGLE_CLIENT_ID configured the
// route answers configured:false and the login keeps the demo button.

export async function fetchGoogleConfig() {
  try {
    const res = await fetch('/api/google');
    return await res.json();
  } catch {
    return { ok: false, configured: false };
  }
}

export async function serverVerifyGoogle(credential) {
  try {
    const res = await fetch('/api/google', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    return await res.json();
  } catch {
    return { ok: false, error: 'offline' };
  }
}

// Google profiles are keyed by the stable Google subject id (payload.sub),
// independent of the mobile-number-keyed farmer records.
export function upsertGoogleUser({ sub, name, email, picture }) {
  const users = readJson(USERS_KEY, {});
  const key = `google:${sub}`;
  const prev = users[key] || {};
  users[key] = {
    ...prev,
    name: name || prev.name || 'Google User',
    email: email || prev.email || '',
    picture: picture || prev.picture || '',
    googleSub: sub,
    mobile: prev.mobile || '',
    village: prev.village || '',
    state: prev.state || 'Karnataka',
    createdAt: prev.createdAt || Date.now(),
    lastLoginAt: Date.now(),
  };
  writeJson(USERS_KEY, users);
  return users[key];
}

// ── Aadhaar OTP lifecycle (demo) ─────────────────────────────────────────────

export function requestAadhaarOtp(aadhaar) {
  const norm = normalizeAadhaar(aadhaar);
  if (!isValidAadhaar(norm)) {
    return { ok: false, error: 'invalid_aadhaar' };
  }
  const pending = readJson(AADHAAR_OTP_KEY, null);

  if (pending && pending.aadhaar === norm && Date.now() - pending.sentAt < OTP_RESEND_COOLDOWN_S * 1000) {
    return {
      ok: false,
      error: 'cooldown',
      waitSeconds: Math.ceil((OTP_RESEND_COOLDOWN_S * 1000 - (Date.now() - pending.sentAt)) / 1000),
    };
  }

  const sendsSoFar = pending && pending.aadhaar === norm ? pending.sends : 0;
  if (sendsSoFar >= OTP_MAX_SENDS) {
    return { ok: false, error: 'max_sends' };
  }

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  writeJson(AADHAAR_OTP_KEY, {
    aadhaar: norm,
    otp,
    sentAt: Date.now(),
    expiresAt: Date.now() + OTP_TTL_MS,
    attemptsLeft: OTP_MAX_ATTEMPTS,
    sends: sendsSoFar + 1,
  });

  console.log(`%c[AgriPulse Aadhaar] OTP for ${maskAadhaar(norm)} is ${otp} (valid 5 min)`, 'background:#3b82f6;color:#fff;padding:4px 8px;border-radius:4px;font-weight:bold');
  return { ok: true, otp, masked: maskAadhaar(norm) };
}

export function getAadhaarOtpDebug() {
  const pending = readJson(AADHAAR_OTP_KEY, null);
  if (!pending || Date.now() > pending.expiresAt) return null;
  return { otp: pending.otp, masked: maskAadhaar(pending.aadhaar), expiresAt: pending.expiresAt, aadhaar: pending.aadhaar };
}

export function verifyAadhaarOtp(aadhaar, code) {
  const norm = normalizeAadhaar(aadhaar);
  const pending = readJson(AADHAAR_OTP_KEY, null);
  if (!pending || pending.aadhaar !== norm) {
    return { ok: false, error: 'no_pending' };
  }
  if (Date.now() > pending.expiresAt) {
    localStorage.removeItem(AADHAAR_OTP_KEY);
    return { ok: false, error: 'expired' };
  }
  if (String(code) === pending.otp) {
    localStorage.removeItem(AADHAAR_OTP_KEY);
    // mark verified
    const verified = readJson(AADHAAR_VERIFIED_KEY, {});
    verified[norm] = { verifiedAt: Date.now(), mobile: pending.mobile || '' };
    writeJson(AADHAAR_VERIFIED_KEY, verified);
    return { ok: true, aadhaar: norm };
  }

  const attemptsLeft = pending.attemptsLeft - 1;
  if (attemptsLeft <= 0) {
    localStorage.removeItem(AADHAAR_OTP_KEY);
    return { ok: false, error: 'max_attempts' };
  }
  writeJson(AADHAAR_OTP_KEY, { ...pending, attemptsLeft });
  return { ok: false, error: 'wrong_code', attemptsLeft };}

// ── sessions ─────────────────────────────────────────────────────────────────

export function saveSession(user) {
  const session = {
    name: user.name,
    mobile: user.mobile || '',
    email: user.email || '',
    authProvider: user.authProvider || 'phone-demo',
    picture: user.picture || '',
    village: user.village || '',
    state: user.state || 'Karnataka',
    aadhaar: user.aadhaar ? maskAadhaar(user.aadhaar) : '',
    aadhaarFull: user.aadhaar || '',
    aadhaarVerified: Boolean(user.aadhaarVerified),
    loginAt: Date.now(),
    expiresAt: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  writeJson(SESSION_KEY, session);
  return session;
}

export function getSession() {
  const session = readJson(SESSION_KEY, null);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
  return session;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

