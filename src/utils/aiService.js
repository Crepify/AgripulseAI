import { CROPS } from '../data/agriData';

export const DEFAULT_AI_ENDPOINT = 'https://predict-6a8fe586becceb8c53b3b178-dproatj77a-el.a.run.app';

const AI_ENDPOINT = (import.meta.env.VITE_AI_API_URL || DEFAULT_AI_ENDPOINT).replace(/\/+$/, '');
const AI_API_KEY = (import.meta.env.VITE_AI_API_KEY || '').trim();
const REQUEST_TIMEOUT_MS = 60_000;

export const isCloudAIConfigured = Boolean(AI_API_KEY);

function normalizeLabel(label) {
  return String(label || '')
    .toLowerCase()
    .replace(/[_./-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchCropLabel(label) {
  const normalized = normalizeLabel(label);
  if (!normalized || /\b(healthy|normal|no disease)\b/.test(normalized)) return null;

  const containsAny = (...terms) => terms.some((term) => normalized.includes(term));

  // Only map disease labels supported by the care guides; a crop-only or
  // unrelated disease label should not trigger a potentially incorrect remedy.
  if (containsAny('blast', 'magnaporthe')) return CROPS[0];
  if (containsAny('early blight', 'alternaria solani')) return CROPS[1];
  if (containsAny('leaf curl', 'clcuv')) return CROPS[2];
  if (containsAny('yellow rust', 'stripe rust', 'wheat rust', 'puccinia striiformis')) return CROPS[3];

  return null;
}

function getPredictionEntries(payload) {
  const images = Array.isArray(payload?.images) ? payload.images : [];
  const imageResults = images.flatMap((image) => [
    ...(Array.isArray(image?.results) ? image.results : []),
    ...(Array.isArray(image?.classifications) ? image.classifications : []),
  ]);

  if (imageResults.length) return imageResults;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.predictions)) return payload.predictions;
  return [];
}

function getConfidencePercent(prediction, crop) {
  const rawConfidence = Number(
    prediction?.confidence ?? prediction?.score ?? prediction?.probability,
  );
  if (!Number.isFinite(rawConfidence)) return crop.confidence;

  const percent = rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;
  return Number(Math.max(0, Math.min(100, percent)).toFixed(1));
}

async function readErrorMessage(response) {
  try {
    const body = await response.json();
    const detail = body?.detail || body?.message || body?.error;
    if (typeof detail === 'string' && detail.trim()) return detail.trim();
  } catch {
    // The endpoint may return a plain-text error body.
  }
  return `AI endpoint returned HTTP ${response.status}.`;
}

/**
 * Send one uploaded/captured leaf image to the Ultralytics dedicated endpoint.
 * Returns null when no API key is configured or when the model result does not
 * map to a supported AgriPulse crop; callers can then use the offline analyzer.
 */
export async function predictCropImage(imageBlob, fileName = 'leaf-image.jpg') {
  if (!isCloudAIConfigured || !(imageBlob instanceof Blob)) return null;

  const body = new FormData();
  body.append('file', imageBlob, fileName);
  body.append('conf', '0.25');
  body.append('iou', '0.7');
  body.append('imgsz', '640');
  body.append('normalize', 'true');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${AI_ENDPOINT}/predict`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    const payload = await response.json();
    const predictions = getPredictionEntries(payload)
      .map((prediction) => {
        const label = prediction?.name ?? prediction?.label ?? prediction?.class_name ?? prediction?.className;
        const crop = matchCropLabel(label);
        return crop ? {
          crop,
          label: String(label),
          confidence: getConfidencePercent(prediction, crop),
        } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.confidence - a.confidence);

    if (!predictions.length) return null;

    return {
      ...predictions[0],
      task: payload?.metadata?.task || null,
      latencyMs: Number(payload?.metadata?.functionTimeCall) || null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
