/**
 * Zero-dependency .env loader (no dotenv — the repo installs nothing extra).
 * ─────────────────────────────────────────────────────────────────────────
 * Real environment variables ALWAYS win over the file, so Vercel / Railway /
 * Docker settings override a stale local `.env`.
 *
 *   import { loadDotEnv } from './env.js';
 *   loadDotEnv();                       // reads <repo root>/.env once
 *
 * Why this exists: `vite.config.js` loads .env for `npm run dev` API routes,
 * but `node server/index.js` and `scripts/whatsapp-setup.js` never saw the
 * file — so the WhatsApp credentials in .env were silently ignored and the
 * server booted in DRY-RUN even with a perfectly good token configured.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ENV_FILE = path.resolve(here, '../../.env');

let loaded = false;

/**
 * Parse a KEY=VALUE .env body. Handles `export KEY=`, `#` comments, blank
 * lines, and single/double-quoted values. Deliberately minimal.
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseDotEnv(text) {
  const out = {};
  for (const rawLine of String(text || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).replace(/^export\s+/, '').trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length > 1) ||
      (value.startsWith("'") && value.endsWith("'") && value.length > 1)
    ) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/, ''); // trailing comment on bare values
    }
    if (key) out[key] = value;
  }
  return out;
}

/**
 * Load `.env` into `process.env` (idempotent). Real env vars are never
 * overwritten — the file only fills the gaps.
 * @param {string} [file] path override (tests point this at a fixture)
 * @returns {string[]} keys that were newly populated
 */
export function loadDotEnv(file = ENV_FILE) {
  if (loaded && file === ENV_FILE) return [];
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return []; // no file — nothing to do (CI, Vercel, fresh clone)
  }
  const filled = [];
  for (const [key, value] of Object.entries(parseDotEnv(text))) {
    if (process.env[key] === undefined || process.env[key] === '') {
      process.env[key] = value;
      filled.push(key);
    }
  }
  if (file === ENV_FILE) loaded = true;
  return filled;
}

/**
 * Insert or update `KEY=value` in a .env file, preserving comments and
 * ordering. Used by `npm run whatsapp:setup -- --write` to persist the
 * auto-discovered phone-number id without a human copy-paste step.
 * @param {string} file
 * @param {string} key
 * @param {string} value
 * @returns {'updated'|'added'}
 */
export function upsertEnvVar(file, key, value) {
  let text = '';
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    text = '';
  }
  const lines = text.length ? text.split(/\r?\n/) : [];
  const idx = lines.findIndex((l) => {
    const t = l.trim();
    return !t.startsWith('#') && new RegExp(`^${key}\\s*=`).test(t);
  });
  if (idx >= 0) {
    const bare = lines[idx].trim();
    const commented = /^#\s*/.test(bare);
    lines[idx] = `${commented ? '# ' : ''}${key}=${value}`;
    // Un-comment a commented-out placeholder only when nothing active exists.
    if (commented && !lines.some((l) => new RegExp(`^${key}\\s*=`).test(l.trim()))) {
      lines[idx] = `${key}=${value}`;
    }
    fs.writeFileSync(file, lines.join('\n'));
    return 'updated';
  }
  const body = lines.join('\n').replace(/\n*$/, '');
  fs.writeFileSync(file, `${body}${body ? '\n' : ''}${key}=${value}\n`);
  return 'added';
}

/** Never log a full token. `EAAc…ggLw (285 chars)` is all anyone needs. */
export function maskSecret(secret) {
  const s = String(secret || '');
  if (!s) return '(not set)';
  if (s.length <= 12) return `${s.slice(0, 3)}… (${s.length} chars)`;
  return `${s.slice(0, 4)}…${s.slice(-4)} (${s.length} chars)`;
}
