/**
 * Vercel Function  POST /api/predict  →  Ultralytics inference (cloud fallback for the Vision Agent)
 *
 * Why a proxy? So the `ul_…` API key stays in Vercel's environment variables and never
 * reaches the browser bundle, where anyone could copy it and burn your credits.
 *
 * Works with EITHER upstream (set ULTRALYTICS_ENDPOINT_URL accordingly):
 *   A) Shared model API (no hourly cost, 20 req/min per key):
 *        https://platform.ultralytics.com/api/models/agrovision/agrovisionai/exp
 *   B) Your dedicated endpoint (billed per hour while running, no per-key limit):
 *        https://predict-6a8fe586becceb8c53b3b178-dproatj77a-el.a.run.app
 *
 * Vercel → Project → Settings → Environment Variables (Production + Preview):
 *   ULTRALYTICS_ENDPOINT_URL   one of the two URLs above (defaults to A)
 *   ULTRALYTICS_API_KEY        ul_xxxxxxxx   (Platform → Settings → API Keys). Optional for A while the
 *                              model is Public, but strongly recommended: anonymous calls share a per-IP quota.
 *   ALLOWED_ORIGINS            optional comma-separated EXTRA origins (same-deployment-origin requests are
 *                              always permitted; leave empty for standard same-origin deployments/previews)
 *
 * Node.js runtime, Web-standard signature. Request body limit is 4.5 MB — cloud-detector.js
 * downscales photos to ≤1024 px JPEG before upload.
 */

const DEFAULT_UPSTREAM = "https://platform.ultralytics.com/api/models/agrovision/agrovisionai/exp";
const UPSTREAM = (process.env.ULTRALYTICS_ENDPOINT_URL || DEFAULT_UPSTREAM).replace(/\/(predict)?\/?$/, "");
const API_KEY = process.env.ULTRALYTICS_API_KEY;
const ALLOWED = (process.env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const UPSTREAM_TIMEOUT_MS = 25_000;

export async function POST(request) {
  // Same-origin is the default. Optionally allow additional trusted origins for embedded clients.
  const origin = request.headers.get("origin") ?? "";
  if (origin) {
    let requestOrigin = "";
    try { requestOrigin = new URL(request.url).origin; } catch { /* handled by the deny below */ }
    if (origin !== requestOrigin && !ALLOWED.includes(origin)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let form;
  try {
    form = await request.formData(); // file | source, conf, iou, imgsz, normalize …
  } catch {
    return Response.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }
  if (!form.get("file") && !form.get("source")) {
    return Response.json({ error: "Missing 'file' (image) field" }, { status: 400 });
  }

  const headers = {};
  if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  let upstream;
  try {
    upstream = await fetch(`${UPSTREAM}/predict`, { method: "POST", headers, body: form, signal: ctrl.signal });
  } catch (err) {
    clearTimeout(timer);
    const timedOut = err?.name === "AbortError";
    return Response.json(
      { error: timedOut ? "Inference service timed out" : "Inference service unreachable" },
      { status: timedOut ? 504 : 502 },
    );
  }
  clearTimeout(timer);

  if (upstream.status === 429) {
    return Response.json(
      { error: "Cloud analysis is busy right now (rate limit). Please try again in a minute." },
      { status: 429, headers: { "retry-after": upstream.headers.get("retry-after") ?? "60" } },
    );
  }
  if (upstream.status === 401 || upstream.status === 403) {
    // don't leak upstream details; log for the operator
    console.error("[api/predict] upstream auth failed — check ULTRALYTICS_API_KEY / endpoint binding");
    return Response.json({ error: "Cloud analysis is not configured correctly" }, { status: 502 });
  }

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "no-store",
    },
  });
}

/** Health probe for the app / uptime checks — never calls the paid upstream. */
export async function GET() {
  return Response.json({
    ok: true,
    upstream: UPSTREAM.includes("platform.ultralytics.com") ? "shared-api" : "dedicated-endpoint",
    authenticated: Boolean(API_KEY),
  });
}
