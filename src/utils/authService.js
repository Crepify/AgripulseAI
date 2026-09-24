// ─────────────────────────────────────────────────────────────────────────────
// AgriPulse AI — Authentication Service (Device-Local, Offline-First)
//
// Local demo login for a frontend-only PWA (not production authentication):
//   • Indian mobile number validation (+91, 10 digits, starts 6-9)
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

// ── farmer profile store ─────────────────────────────────────────────────────

export function getUser(mobile) {
  const users = readJson(USERS_KEY, {});
  return users[mobile] || null;
}

export function registerUser({ name, mobile, village, state }) {
  const users = readJson(USERS_KEY, {});
  const existing = users[mobile] || {};
  const profile = {
    name: name.trim(),
    mobile,
    village: (village || '').trim(),
    state: state || 'Karnataka',
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

// ── OTP lifecycle ────────────────────────────────────────────────────────────

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

// ── sessions ─────────────────────────────────────────────────────────────────

export function saveSession(user) {
  const session = {
    name: user.name,
    mobile: user.mobile || '',
    email: user.email || '',
    authProvider: user.authProvider || 'phone-demo',
    village: user.village || '',
    state: user.state || 'Karnataka',
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
