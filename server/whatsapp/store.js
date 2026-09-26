/**
 * User store + conversation session state.
 * ─────────────────────────────────────────────────────────────────────────
 * USER MATCHING: Meta webhooks identify the sender only by
 * entry[0].changes[0].value.messages[0].from (a wa phone id like
 * '9198xxxxxxxx'). We look the phone up in the user store and
 * auto-provision a FARMER record on first contact so every farmer can
 * onboard by simply sending "hi" — no app install required.
 *
 * PERSISTENCE: in-memory Map + best-effort /tmp JSON snapshot (survives
 * warm serverless invocations). The interface mirrors prisma/schema.prisma
 * (model User { phone @unique; role Role }) — swap the marked bodies for
 * `prisma.user.findUnique/upsert` once DATABASE_URL is live. Nothing else
 * in the pipeline changes.
 *
 * SESSION STATE MACHINE values (used by router.js):
 *   IDLE                   default; keyword / menu routing
 *   AWAITING_CROP_IMAGE    farmer chose disease scan → next image = crop photo
 *   AWAITING_PATTI_PHOTO   farmer chose patti audit → next image = mandi slip
 *   AWAITING_POOL_DETAILS  farmer chose truck pool → next text = "300 kg pune"
 *   AWAITING_DAWAI_NAME    farmer chose generic finder → next text = brand name
 */

import fs from 'node:fs';

const SNAPSHOT = '/tmp/agripulse-wa-store.json';
const SESSION_TTL_MS = 30 * 60 * 1000; // stale flows reset to IDLE after 30 min

const db = { users: new Map(), sessions: new Map() };

/* warm-start restore */
try {
  const raw = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8'));
  for (const u of raw.users || []) db.users.set(u.phone, u);
  for (const s of raw.sessions || []) db.sessions.set(s.phone, s);
} catch { /* first boot — nothing to restore */ }

function persist() {
  try {
    fs.writeFileSync(SNAPSHOT, JSON.stringify({
      users: [...db.users.values()],
      sessions: [...db.sessions.values()],
    }));
  } catch { /* read-only fs — memory copy still valid */ }
}

/* ── users ──────────────────────────────────────────────────────────── */

/** PRISMA SWAP: prisma.user.findUnique({ where: { phone } }) */
export async function getUserByPhone(phone) {
  return db.users.get(phone) || null;
}

/**
 * Find or auto-provision the user for an inbound wa id.
 * PRISMA SWAP: prisma.user.upsert({ where:{phone}, create:{...}, update:{name} })
 */
export async function resolveUser(phone, profileName = '') {
  let user = db.users.get(phone);
  if (!user) {
    user = {
      id: `wa_${phone}`,
      phone,
      name: profileName || `Farmer ${phone.slice(-4)}`,
      role: 'FARMER',            // Role enum in prisma/schema.prisma
      createdAt: new Date().toISOString(),
      isNew: true,
    };
    db.users.set(phone, user);
    persist();
    return user;
  }
  if (profileName && user.name !== profileName && user.name.startsWith('Farmer ')) {
    user.name = profileName;
    persist();
  }
  return { ...user, isNew: false };
}

/* ── sessions (state machine) ───────────────────────────────────────── */

export async function getSession(phone) {
  const s = db.sessions.get(phone);
  if (!s || Date.now() - s.updatedAt > SESSION_TTL_MS) {
    return { phone, state: 'IDLE', data: {}, updatedAt: Date.now() };
  }
  return s;
}

export async function setSession(phone, state, data = {}) {
  const s = { phone, state, data, updatedAt: Date.now() };
  db.sessions.set(phone, s);
  persist();
  return s;
}

export const clearSession = (phone) => setSession(phone, 'IDLE', {});

/* ── idempotency: Meta redelivers webhooks — never process a wamid twice ── */

const seen = new Map();
export function alreadyProcessed(wamid) {
  if (!wamid) return false;
  const now = Date.now();
  for (const [k, t] of seen) if (now - t > 10 * 60 * 1000) seen.delete(k);
  if (seen.has(wamid)) return true;
  seen.set(wamid, now);
  return false;
}
