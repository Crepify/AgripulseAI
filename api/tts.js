// Cloud TTS proxy — natural Indian-language speech for EVERY device.
//
// Most browsers ship only Hindi + English voices among Indian languages, so
// a Tamil/Telugu/Kannada/Marathi farmer would hear nothing. This endpoint
// fetches natural speech from Google Translate's public TTS (free, no API
// key, no install) and streams the MP3 back to the app. The client caches
// by URL, and falls back to local device voices if offline.
//
// GET /api/tts?text=...&lang=ta  → audio/mpeg

// All 17 app languages — Google TTS covers most; any it lacks returns 502
// and the client gracefully falls back to device voices + phonetic text.
const ALLOWED = new Set(['hi', 'en', 'ta', 'te', 'kn', 'mr', 'ml', 'pa', 'bn', 'gu', 'or', 'as', 'ur', 'ks', 'ne', 'sa', 'sd']);
const MAX_CHARS = 600;

// Google's endpoint accepts ~200 chars per request — split at sentence
// boundaries, then words, and concatenate the MP3 chunks (players handle
// concatenated MP3 frames fine).
export function chunkText(text, max = 180) {
  const t = String(text || '').trim();
  if (!t) return [];
  if (t.length <= max) return [t];
  const chunks = [];
  // split into sentences first (Devanagari danda included)
  const sentences = t.split(/(?<=[।.!?;])\s+/);
  let cur = '';
  const push = () => { if (cur.trim()) chunks.push(cur.trim()); cur = ''; };
  for (const s of sentences) {
    if (s.length > max) {
      // sentence itself too long — split on words
      for (const w of s.split(/\s+/)) {
        if ((cur + ' ' + w).trim().length > max) push();
        cur = cur ? `${cur} ${w}` : w;
      }
      push();
    } else if ((cur + ' ' + s).trim().length > max) {
      push();
      cur = s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  push();
  return chunks;
}

export default async function handler(req, res) {
  const { text, lang } = req.query || {};
  if (!text || !ALLOWED.has(lang)) {
    res.status(400).json({ error: 'bad request — text + lang(=hi|en|ta|te|kn|mr) required' });
    return;
  }
  if (String(text).length > MAX_CHARS) {
    res.status(400).json({ error: 'text too long' });
    return;
  }
  try {
    const chunks = chunkText(String(text));
    const buffers = [];
    for (const c of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${lang}&q=${encodeURIComponent(c)}`;
      const r = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
          Referer: 'https://translate.google.com/',
        },
      });
      if (!r.ok) throw new Error(`upstream ${r.status}`);
      buffers.push(Buffer.from(await r.arrayBuffer()));
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.status(200).send(Buffer.concat(buffers));
  } catch {
    res.status(502).json({ error: 'tts unavailable — client will fall back to device voices' });
  }
}
