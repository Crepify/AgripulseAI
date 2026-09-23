/**
 * AgriPulse — CLOUD path (fallback) via /api/predict  →  Ultralytics inference.
 * The API key never reaches the browser; the Vercel function adds it.
 *
 * Returns the SAME shape as detectDisease() in ./detector.js, so UI code doesn't
 * care which backend produced the result.
 *
 * Upstream response shape (Ultralytics Platform / dedicated endpoint — identical):
 *   { images: [{ shape: [h, w], results: [{ class, name, confidence, box: {x1,y1,x2,y2} }], speed }], metadata }
 */
import { detectDisease, loadDetector, splitLabel } from "./detector.js";

const MAX_UPLOAD_PX = 1024; // small uploads: rural bandwidth + Vercel's 4.5 MB body limit

function sourceSize(source) {
  return {
    w: source.videoWidth || source.naturalWidth || source.width,
    h: source.videoHeight || source.naturalHeight || source.height,
  };
}

/** Downscale any drawable source (or File/Blob) to a JPEG Blob ≤ MAX_UPLOAD_PX on the long side. */
async function toJpegBlob(source, maxPx = MAX_UPLOAD_PX, quality = 0.85) {
  const drawable = source instanceof Blob ? await createImageBitmap(source) : source;
  const { w, h } = sourceSize(drawable);
  const s = Math.min(1, maxPx / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * s);
  canvas.height = Math.round(h * s);
  canvas.getContext("2d").drawImage(drawable, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
  return { blob, w, h };
}

export class CloudError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function detectDiseaseCloud(source, { conf = 0.25, iou = 0.7, imgsz = 640 } = {}) {
  const { blob, w: W, h: H } = await toJpegBlob(source);

  const form = new FormData();
  form.append("file", blob, "leaf.jpg");
  form.append("conf", String(conf));
  form.append("iou", String(iou));
  form.append("imgsz", String(imgsz));
  form.append("normalize", "true"); // 0–1 coords → independent of the downscale above

  const t0 = performance.now();
  const r = await fetch("/api/predict", { method: "POST", body: form });
  if (!r.ok) {
    let msg = `Cloud analysis failed (HTTP ${r.status})`;
    try { msg = (await r.json()).error ?? msg; } catch { /* non-JSON error body */ }
    throw new CloudError(msg, r.status);
  }
  const data = await r.json();
  const img = data.images?.[0] ?? { shape: [H, W], results: [], speed: {} };

  return {
    device: "cloud",
    width: W,
    height: H,
    speedMs: { ...img.speed, network: performance.now() - t0 },
    detections: (img.results ?? []).map((d) => ({
      classId: d.class,
      label: d.name,
      ...splitLabel(d.name),
      confidence: d.confidence,
      box: [d.box.x1 * W, d.box.y1 * H, d.box.x2 * W, d.box.y2 * H],
    })),
    raw: null, // no annotate()-compatible Results object from the cloud path; draw from `detections`
  };
}

/**
 * On-device first (offline, private, free). Falls back to the cloud when:
 *   - the local model can't load/run (no WebGPU + broken wasm, very old phone), or
 *   - `cloudIfCpu` is set and the device only has the slow CPU path while online.
 * Result carries `backend: "on-device" | "cloud"` so the UI can show a small badge.
 */
export async function detectDiseaseSmart(source, { cloudIfCpu = false, ...opts } = {}) {
  if (cloudIfCpu && navigator.onLine) {
    try {
      const model = await loadDetector();
      if (model.device !== "webgpu") {
        const r = await detectDiseaseCloud(source, opts);
        return { ...r, backend: "cloud" };
      }
    } catch { /* fall through to the normal path */ }
  }
  try {
    const r = await detectDisease(source, opts);
    return { ...r, backend: "on-device" };
  } catch (err) {
    if (!navigator.onLine) throw err;
    console.warn("[AgriPulse] on-device inference failed, using cloud:", err);
    const r = await detectDiseaseCloud(source, opts);
    return { ...r, backend: "cloud" };
  }
}

/** Draw cloud (or any) detections onto a canvas already sized to the image. */
export function drawDetections(canvas, source, detections) {
  const { w, h } = sourceSize(source);
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, w, h);
  ctx.lineWidth = Math.max(2, Math.round(w / 300));
  ctx.font = `${Math.max(14, Math.round(w / 40))}px sans-serif`;
  for (const d of detections) {
    const [x1, y1, x2, y2] = d.box;
    const text = `${d.label} ${(d.confidence * 100).toFixed(0)}%`;
    ctx.strokeStyle = "#22c55e"; ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    const tw = ctx.measureText(text).width + 10, th = parseInt(ctx.font) + 8;
    ctx.fillStyle = "#22c55e"; ctx.fillRect(x1, Math.max(0, y1 - th), tw, th);
    ctx.fillStyle = "#000"; ctx.fillText(text, x1 + 5, Math.max(th - 6, y1 - 6));
  }
}
