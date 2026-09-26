/**
 * FILE 2 — WhatsApp Messaging Service Layer
 * ─────────────────────────────────────────────────────────────────────────
 * Outbound client abstraction over Meta Graph API (direct HTTPS, v20.0+).
 *
 *   sendTextMessage(to, body)
 *   sendInteractiveButtons(to, bodyText, buttonsArray)   // ≤3 buttons, titles ≤20 chars
 *   sendListMenu(to, bodyText, buttonLabel, sectionsArray)
 *   sendMediaMessage(to, mediaType, mediaUrl, caption)
 *   markAsRead(messageId)
 *   getMediaUrl(mediaId) / downloadMedia(mediaId)        // vision & voice pipelines
 *
 * Meta payload rules are enforced HERE so route handlers can't ship an
 * invalid payload: quick-reply buttons max 3, button titles 20 chars,
 * list row titles 24 chars, list ≤10 rows, text body ≤4096 chars.
 * WhatsApp Markdown: *bold* _italic_ ~strikethrough~ ```code```.
 */

import { config, isLive, messagesUrl, mediaUrl } from './config.js';

/* ── low-level transport ────────────────────────────────────────────── */

async function graphPost(payload, { retries = 2 } = {}) {
  if (!isLive()) {
    // Dry-run mode: full pipeline works without Meta credentials.
    console.log('[whatsapp:dry-run] would POST', JSON.stringify(payload, null, 2));
    return { dryRun: true, messages: [{ id: `dryrun.${Date.now()}` }] };
  }
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(messagesUrl(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) return body;
      // Retry only transient failures (rate limit / upstream hiccup).
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`Graph API ${res.status}: ${JSON.stringify(body?.error || body)}`);
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1) ** 2));
        continue;
      }
      throw new Error(`Graph API ${res.status}: ${JSON.stringify(body?.error || body)}`);
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1) ** 2));
    }
  }
  console.error('[whatsapp] send failed:', lastErr?.message);
  throw lastErr;
}

/** wa ids arrive as '9198xxxxxxxx' — keep digits only, no '+'. */
export const normalizePhone = (raw) => String(raw || '').replace(/[^\d]/g, '');

const clip = (s, max) => {
  const str = String(s ?? '');
  return str.length <= max ? str : `${str.slice(0, max - 1)}…`;
};

/* ── public send API ────────────────────────────────────────────────── */

/** Plain text (WhatsApp Markdown allowed). Auto-splits bodies over 4096. */
export async function sendTextMessage(to, body) {
  const chunks = [];
  let rest = String(body ?? '');
  while (rest.length > 4096) {
    const cut = rest.lastIndexOf('\n', 4096);
    chunks.push(rest.slice(0, cut > 2000 ? cut : 4096));
    rest = rest.slice(cut > 2000 ? cut + 1 : 4096);
  }
  chunks.push(rest);
  let out;
  for (const chunk of chunks) {
    out = await graphPost({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizePhone(to),
      type: 'text',
      text: { preview_url: false, body: chunk },
    });
  }
  return out;
}

/**
 * Quick-reply buttons.
 * @param {Array<{id: string, title: string}>} buttonsArray  (max 3 enforced)
 */
export async function sendInteractiveButtons(to, bodyText, buttonsArray) {
  const buttons = (buttonsArray || []).slice(0, 3).map((b) => ({
    type: 'reply',
    reply: { id: clip(b.id, 256), title: clip(b.title, 20) }, // Meta caps
  }));
  if ((buttonsArray || []).length > 3) {
    console.warn('[whatsapp] >3 buttons supplied — extra buttons dropped (Meta limit).');
  }
  return graphPost({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: clip(bodyText, 1024) },
      action: { buttons },
    },
  });
}

/**
 * List menu (section picker).
 * @param {Array<{title: string, rows: Array<{id, title, description?}>}>} sectionsArray
 */
export async function sendListMenu(to, bodyText, buttonLabel, sectionsArray) {
  let rowBudget = 10; // Meta: max 10 rows across all sections
  const sections = (sectionsArray || []).map((s) => ({
    title: clip(s.title, 24),
    rows: (s.rows || []).splice(0, rowBudget).map((r) => {
      rowBudget -= 1;
      return {
        id: clip(r.id, 200),
        title: clip(r.title, 24),
        ...(r.description ? { description: clip(r.description, 72) } : {}),
      };
    }),
  })).filter((s) => s.rows.length > 0);
  return graphPost({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: clip(bodyText, 1024) },
      action: { button: clip(buttonLabel, 20), sections },
    },
  });
}

/** Media by public URL. mediaType: image | audio | video | document. */
export async function sendMediaMessage(to, mediaType, mediaUrlStr, caption) {
  const media = { link: mediaUrlStr };
  if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
    media.caption = clip(caption, 1024);
  }
  return graphPost({
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhone(to),
    type: mediaType,
    [mediaType]: media,
  });
}

/** Blue-tick an inbound message (good UX, keeps the thread feeling live). */
export async function markAsRead(messageId) {
  if (!messageId) return null;
  return graphPost({ messaging_product: 'whatsapp', status: 'read', message_id: messageId });
}

/* ── inbound media (vision / voice-note pipelines) ──────────────────── */

/** Resolve a media_id to its short-lived CDN URL + mime type. */
export async function getMediaUrl(mediaId) {
  if (!isLive()) return { url: `https://dry-run.local/media/${mediaId}`, mime_type: 'application/octet-stream' };
  const res = await fetch(mediaUrl(mediaId), {
    headers: { Authorization: `Bearer ${config.apiToken}` },
  });
  if (!res.ok) throw new Error(`Media lookup failed: HTTP ${res.status}`);
  return res.json(); // { url, mime_type, sha256, file_size, id }
}

/**
 * Download inbound media bytes (crop photos → /api/predict, patti photos →
 * OCR, voice notes (OGG/Opus) → STT). CDN URL requires the same bearer.
 */
export async function downloadMedia(mediaId) {
  const meta = await getMediaUrl(mediaId);
  if (!isLive()) return { buffer: new ArrayBuffer(0), mimeType: meta.mime_type, meta };
  const res = await fetch(meta.url, { headers: { Authorization: `Bearer ${config.apiToken}` } });
  if (!res.ok) throw new Error(`Media download failed: HTTP ${res.status}`);
  return { buffer: await res.arrayBuffer(), mimeType: meta.mime_type, meta };
}
