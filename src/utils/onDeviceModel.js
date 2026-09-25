// On-Device Edge-AI Computer Vision & Agronomic Diagnostic Engine
// Runs 100% locally in-browser: AgriPulse YOLO26s detector (52 crop-disease classes, /models/agripulse.tflite)
// executed by LiteRT.js on WebGPU (wasm/CPU fallback). Zero network latency once the model is cached.
// If the model cannot run on a device and the phone is online, /api/predict (Ultralytics cloud) is used.

import { CROPS } from '../data/agriData';
import { PESTICIDE_DB } from '../data/pesticideDatabase.js';
import { loadDetector, detectDisease, forceCPU } from '../vision/detector';
import { detectDiseaseCloud } from '../vision/cloud-detector';

/* ------------------------------------------------------------------ */
/* Model status (small status line in the scanner)                     */
/* ------------------------------------------------------------------ */
const status = { state: 'idle', device: null, error: null }; // idle | loading | ready | error
const listeners = new Set();

export function getModelStatus() {
  return { ...status };
}

export function subscribeModelStatus(cb) {
  listeners.add(cb);
  cb({ ...status });
  return () => listeners.delete(cb);
}

function setStatus(patch) {
  Object.assign(status, patch);
  listeners.forEach((cb) => cb({ ...status }));
}

const MODEL_CACHE = 'agripulse-models-v1'; // must match public/sw.js

// Explicit list must stay in sync with public/sw.js MODEL_PRECACHE (but we also scan performance entries)
const KNOWN_MODEL_ASSETS = [
  '/models/agripulse.tflite',
  '/models/classes.json',
  '/litert/core.js',
  '/litert/wasm-utils.js',
  '/litert/litert_wasm_internal.js',
  '/litert/litert_wasm_internal.wasm',
  '/litert/litert_wasm_compat_internal.js',
  '/litert/litert_wasm_compat_internal.wasm',
  '/litert/litert_wasm_jspi_internal.js',
  '/litert/litert_wasm_jspi_internal.wasm',
  '/litert/litert_wasm_threaded_internal.js',
  '/litert/litert_wasm_threaded_internal.wasm',
  '/yolo/ultralytics_inference_web_bg.wasm',
];

// Make sure every model/runtime file this page actually loaded is in the offline cache.
// On a first visit some requests happen before the service worker controls the page; cache.add()
// re-requests them with a conditional GET, which the browser's HTTP cache answers without re-downloading.
async function ensureOfflineCache() {
  if (typeof caches === 'undefined' || navigator.connection?.saveData) return;
  try {
    const cache = await caches.open(MODEL_CACHE);
    const perfPaths = new Set(
      performance.getEntriesByType('resource')
        .map((e) => e.name)
        .filter((u) => u.startsWith(location.origin))
        .map((u) => {
          try { return new URL(u).pathname; } catch { return ''; }
        })
        .filter((p) => /^\/(models|litert|yolo)\//.test(p)),
    );
    // Union of known assets + anything we saw in performance timing
    const all = new Set([...KNOWN_MODEL_ASSETS, ...perfPaths]);
    for (const p of all) {
      try {
        if (!(await cache.match(p, { ignoreVary: true }))) await cache.add(p);
      } catch {
        // best effort - individual file may 404 or be offline
      }
    }
  } catch (err) {
    console.warn('Offline cache top-up skipped:', err);
  }
}

// Load (or warm) the on-device model. First call downloads ~37 MB once; the browser + service worker cache it.
export async function initOnDeviceAI() {
  if (status.state === 'ready') return true;
  if (status.state !== 'loading') setStatus({ state: 'loading', error: null });
  try {
    const model = await loadDetector();
    setStatus({ state: 'ready', device: model.device });
    // Top-up offline cache now and again after 2s to catch late-loaded wasm chunks
    ensureOfflineCache();
    setTimeout(ensureOfflineCache, 2000);
    setTimeout(ensureOfflineCache, 8000);
    return true;
  } catch (err) {
    console.error('AgriPulse on-device model failed to load:', err);
    setStatus({ state: 'error', error: err?.message || String(err) });
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Label helpers                                                       */
/* ------------------------------------------------------------------ */
const byId = Object.fromEntries(CROPS.map((c) => [c.id, c]));
// Fallback to first crop if a curated id is missing (prevents crash if agriData is filtered)
const FALLBACK_CROP = CROPS[0];
const TEMPLATE = {
  blast: byId['rice-blast'] || FALLBACK_CROP,
  blight: byId['tomato-blight'] || FALLBACK_CROP,
  virus: byId['cotton-curl'] || FALLBACK_CROP,
  rust: byId['wheat-rust'] || FALLBACK_CROP,
};

// Which curated advisory (dosage / spray window / voice) fits each detector class.
// Default for every other fungal / bacterial leaf spot, blight, mildew, scab or rot: 'blight'.
const FAMILY_OVERRIDES = {
  Leaf_Blast: 'blast',
  Corn___Common_rust: 'rust',
  Apple___Cedar_apple_rust: 'rust',
  Stem_Rust: 'rust',
  Yellow_Rust: 'rust',
  Tomato___Tomato_Yellow_Leaf_Curl_Virus: 'virus',
  Tomato___Tomato_mosaic_virus: 'virus',
  Cassava___Mosaic_Disease: 'virus',
  Cassava___Brown_Streak_Disease: 'virus',
  Cassava___Green_Mottle: 'virus',
  Tungro: 'virus',
  'Orange___Haunglongbing_(Citrus_greening)': 'virus',
  'Tomato___Spider_mites Two-spotted_spider_mite': 'virus', // sucking pest → neem / sticky-trap advisory
};

// Readable names for classes whose raw label is not "Crop___Disease".
const LABEL_INFO = {
  frogeye_spot: { crop: 'Soybean', disease: 'Frogeye Leaf Spot' },
  healthy_sbl: { crop: 'Soybean', disease: 'Healthy' },
  Powdery_Mildew: { crop: 'Wheat', disease: 'Powdery Mildew' },
  Septoria: { crop: 'Wheat', disease: 'Septoria Leaf Blotch' },
  Stem_Rust: { crop: 'Wheat', disease: 'Stem Rust' },
  Yellow_Rust: { crop: 'Wheat', disease: 'Yellow Rust' },
  Bacterial_Leaf_Blight: { crop: 'Rice', disease: 'Bacterial Leaf Blight' },
  Leaf_Blast: { crop: 'Rice', disease: 'Leaf Blast' },
  Tungro: { crop: 'Rice', disease: 'Tungro Virus' },
  'Pepper,_bell___Bacterial_spot': { crop: 'Bell Pepper', disease: 'Bacterial Spot' },
  'Pepper,_bell___healthy': { crop: 'Bell Pepper', disease: 'Healthy' },
  'Corn___Cercospora_leaf_spot Gray_leaf_spot': { crop: 'Corn (Maize)', disease: 'Gray Leaf Spot' },
  'Tomato___Spider_mites Two-spotted_spider_mite': { crop: 'Tomato', disease: 'Two-spotted Spider Mite' },
  'Orange___Haunglongbing_(Citrus_greening)': { crop: 'Orange', disease: 'Citrus Greening (HLB)' },
  'Grape___Esca_(Black_Measles)': { crop: 'Grape', disease: 'Esca (Black Measles)' },
  'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': { crop: 'Grape', disease: 'Isariopsis Leaf Blight' },
  Tomato___Tomato_Yellow_Leaf_Curl_Virus: { crop: 'Tomato', disease: 'Yellow Leaf Curl Virus' },
  Tomato___Tomato_mosaic_virus: { crop: 'Tomato', disease: 'Mosaic Virus' },
};

const clean = (s) => s.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
const titleCase = (s) => s.replace(/\b[a-z]/g, (ch) => ch.toUpperCase());

export function describeLabel(label) {
  if (LABEL_INFO[label]) return LABEL_INFO[label];
  const [a, b] = label.split('___');
  return b
    ? { crop: clean(a), disease: titleCase(clean(b)) }
    : { crop: '', disease: titleCase(clean(a)) };
}

export const isHealthyLabel = (label) => /healthy/i.test(label);

/* ------------------------------------------------------------------ */
/* Result templates for cases the curated CROPS list does not cover    */
/* ------------------------------------------------------------------ */
const NO_SPRAY = {
  bio: {
    name: 'No spray needed',
    measure: '—',
    tank: '—',
    cost: '₹0 / acre',
    safety: 'Keep monitoring every 3–4 days • Water at the base, not on leaves',
  },
  chemical: {
    name: 'No spray needed',
    measure: '—',
    tank: '—',
    cost: '₹0 / acre',
    safety: 'Avoid preventive chemical sprays on healthy crops',
  },
};

const HEALTHY = {
  id: 'det-healthy',
  name: 'Leaf',
  localName: 'पत्ता',
  disease: 'Healthy Leaf ✅',
  pathogen: 'None detected',
  confidence: 0,
  severity: 'None',
  symptoms: 'No lesions, spots or discolouration found. Keep the field weed-free and re-scan if new spots appear.',
  image: TEMPLATE.blight.image,
  audio: {
    en: {
      devanagari: 'Good news. The leaf looks healthy and no disease was detected. No spray is needed. Keep checking your crop every few days.',
      phonetic: 'Good news. The leaf looks healthy and no disease was detected. No spray is needed. Keep checking your crop every few days.',
    },
    hi: {
      devanagari: 'अच्छी खबर। पत्ता स्वस्थ है और कोई रोग नहीं मिला। छिड़काव की ज़रूरत नहीं है। हर कुछ दिन में फसल की जाँच करते रहें।',
      phonetic: 'Achhi khabar. Patta swasth hai aur koi rog nahin mila. Chhidkaav ki zaroorat nahin hai. Har kuch din mein fasal ki jaanch karte rahein.',
    },
  },
  dosage: NO_SPRAY,
  sprayTime: 'Not required',
};

const NO_DETECTION = {
  id: 'det-none',
  name: 'Leaf',
  localName: 'पत्ता',
  disease: 'Uncertain - No clear pattern',
  pathogen: 'Not identified',
  confidence: 0,
  severity: 'Unknown',
  symptoms: 'The AI could not confidently identify a disease (low confidence). This happens with blurry photos, blue/sky backgrounds, or leaves not in the 52 trained classes. Try: 1) Place leaf on white paper, 2) Fill 80% of frame with single leaf, 3) Daylight, no shadow, 4) Focus on spots. If spots persist, ask a KVK expert.',
  image: TEMPLATE.blight.image,
  audio: {
    en: {
      devanagari: 'The AI could not confidently identify a disease in this photo. Please place the leaf on white paper, fill the frame, and retake in daylight.',
      phonetic: 'The AI could not confidently identify a disease in this photo. Please place the leaf on white paper, fill the frame, and retake in daylight.',
    },
    hi: {
      devanagari: 'इस फ़ोटो में रोग स्पष्ट नहीं है। कृपया पत्ते को सफेद कागज पर रखकर, पास से, दिन की रोशनी में दोबारा फोटो लें।',
      phonetic: 'Is photo mein rog spasht nahin hai. Kripya patte ko safed kagaz par rakhkar, paas se, din ki roshni mein dobara photo lein.',
    },
  },
  dosage: NO_SPRAY,
  sprayTime: 'Not required',
};

const UNAVAILABLE = {
  ...NO_DETECTION,
  id: 'det-unavailable',
  disease: 'Vision Agent unavailable',
  symptoms: 'The on-device model could not run in this browser and the online analysis is not reachable. Update Chrome / Safari or check your connection and try again.',
};

/* ------------------------------------------------------------------ */
/* Overlay drawing (image is shown with object-fit: cover)             */
/* ------------------------------------------------------------------ */
export function clearOverlay(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawOverlay(canvas, img, detections) {
  if (!canvas) return;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  const iw = img.naturalWidth || img.videoWidth || img.width;
  const ih = img.naturalHeight || img.videoHeight || img.height;
  if (!cw || !ch || !iw || !ih) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);

  // object-fit: cover → uniform scale, centred, overflow cropped
  const scale = Math.max(cw / iw, ch / ih);
  const offX = (cw - iw * scale) / 2;
  const offY = (ch - ih * scale) / 2;

  ctx.font = 'bold 11px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'top';

  detections.forEach((d) => {
    const [x1, y1, x2, y2] = d.box;
    const x = x1 * scale + offX;
    const y = y1 * scale + offY;
    const w = (x2 - x1) * scale;
    const h = (y2 - y1) * scale;
    const color = isHealthyLabel(d.label) ? '#34d399' : d.confidence < 0.5 ? '#f59e0b' : '#ef4444';

    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = color + '26';
    ctx.fillRect(x, y, w, h);

    const text = `${describeLabel(d.label).disease} ${Math.round(d.confidence * 100)}%`;
    const tw = ctx.measureText(text).width + 8;
    const ty = y >= 16 ? y - 16 : y + 2;
    ctx.fillStyle = color;
    ctx.fillRect(x, ty, tw, 15);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillText(text, x + 4, ty + 2);
  });
}

/* ------------------------------------------------------------------ */
/* Build the UI result from raw detections                             */
/* ------------------------------------------------------------------ */
function buildMatchedCrop(detections) {
  if (!detections.length) return NO_DETECTION;

  const top = detections[0];
  const pct = Math.round(top.confidence * 1000) / 10;
  const { crop, disease } = describeLabel(top.label);

  if (isHealthyLabel(top.label)) {
    const db = PESTICIDE_DB[top.label];
    return {
      ...HEALTHY,
      id: `det-${top.label}`,
      name: crop || db?.crop || HEALTHY.name,
      localName: db ? db.crop : HEALTHY.localName,
      disease: db ? `${db.disease} ✅ Healthy` : HEALTHY.disease,
      pathogen: top.label,
      confidence: pct,
      symptoms: db ? `${db.crop} leaf looks healthy — no disease lesions. ${HEALTHY.symptoms}` : `${crop ? `${crop} leaf` : 'Leaf'} looks healthy — no disease lesions detected. ${HEALTHY.symptoms}`,
      image: db?.image || HEALTHY.image,
      dosage: db ? { bio: { name: db.organic.name, measure: db.organic.measure, tank: db.organic.tank, cost: db.organic.cost, safety: db.organic.safety }, chemical: { name: db.chemical.name, measure: db.chemical.measure, tank: db.chemical.tank, cost: db.chemical.cost, safety: db.chemical.safety } } : HEALTHY.dosage,
      sprayTime: db ? db.organic.bestTime : HEALTHY.sprayTime,
      pesticideInfo: db || null,
    };
  }

  // Try to get full pesticide info from DB for this exact label
  const dbEntry = PESTICIDE_DB[top.label];
  const tpl = dbEntry ? {
    ...TEMPLATE[FAMILY_OVERRIDES[top.label] || 'blight'],
    name: dbEntry.crop,
    disease: dbEntry.disease,
    pathogen: dbEntry.pathogen,
    symptoms: dbEntry.symptoms,
    image: dbEntry.image,
    dosage: {
      bio: { name: dbEntry.organic.name, measure: dbEntry.organic.measure, tank: dbEntry.organic.tank, cost: dbEntry.organic.cost, safety: dbEntry.organic.safety },
      chemical: { name: dbEntry.chemical.name, measure: dbEntry.chemical.measure, tank: dbEntry.chemical.tank, cost: dbEntry.chemical.cost, safety: dbEntry.chemical.safety }
    },
    sprayTime: dbEntry.organic.bestTime,
    audio: TEMPLATE.blight.audio,
  } : (TEMPLATE[FAMILY_OVERRIDES[top.label] || 'blight'] || TEMPLATE.blight || FALLBACK_CROP);
  
  const lowConf = top.confidence < 0.5;
  const name = crop || dbEntry?.crop || tpl?.name || 'Leaf';
  const regions = detections.filter((d) => d.label === top.label).length;
  const others = [...new Set(
    detections.filter((d) => d.label !== top.label && !isHealthyLabel(d.label)).map((d) => d.label),
  )].slice(0, 2).map((l) => describeLabel(l).disease);

  const diseaseText = `${lowConf ? 'Possible: ' : ''}${dbEntry?.disease || disease}`;
  const baseSymptoms = dbEntry?.symptoms || tpl.symptoms;
  const symptoms =
    `${diseaseText} detected on ${name} — ${regions} affected region${regions > 1 ? 's' : ''} marked on the photo.` +
    (lowConf ? ' Low confidence: retake in daylight with one leaf filling the frame, white paper background.' : '') +
    (others.length ? ` Also seen: ${others.join(', ')}.` : '') +
    ` Typical signs: ${baseSymptoms}` +
    (dbEntry ? ` Soil: ${dbEntry.soilTypes.join(', ')}. Organic side effects: ${dbEntry.organic.sideEffects}. Chemical side effects: ${dbEntry.chemical.sideEffects}. Verify: ${dbEntry.organic.verification} / ${dbEntry.chemical.verification}` : '');

  const spoken =
    `${diseaseText} detected on ${name} with ${Math.round(pct)} percent confidence. ` +
    `Recommended organic: ${dbEntry ? dbEntry.organic.name + ', ' + dbEntry.organic.measure : tpl.dosage.bio.name + ', ' + tpl.dosage.bio.measure} in a ${dbEntry ? dbEntry.organic.tank : tpl.dosage.bio.tank}. ` +
    `Chemical: ${dbEntry ? dbEntry.chemical.name + ', ' + dbEntry.chemical.measure : tpl.dosage.chemical.name}. ` +
    `Best spray time ${dbEntry ? dbEntry.organic.bestTime : tpl.sprayTime}.`;

  return {
    ...tpl,
    id: `det-${top.label}`,
    name,
    localName: dbEntry?.crop || tpl.localName,
    disease: diseaseText,
    pathogen: dbEntry?.pathogen || top.label,
    confidence: pct,
    severity: lowConf ? 'Possible' : top.confidence >= 0.75 ? 'High' : 'Moderate',
    symptoms,
    image: dbEntry?.image || tpl.image,
    dosage: {
      bio: dbEntry ? { name: dbEntry.organic.name, measure: dbEntry.organic.measure, tank: dbEntry.organic.tank, cost: dbEntry.organic.cost, safety: dbEntry.organic.safety } : tpl.dosage.bio,
      chemical: dbEntry ? { name: dbEntry.chemical.name, measure: dbEntry.chemical.measure, tank: dbEntry.chemical.tank, cost: dbEntry.chemical.cost, safety: dbEntry.chemical.safety } : tpl.dosage.chemical
    },
    sprayTime: dbEntry?.organic.bestTime || tpl.sprayTime,
    pesticideInfo: dbEntry || null,
    // English voice is generated from the real detection; other languages keep the closest curated advisory.
    audio: { ...tpl.audio, en: { devanagari: spoken, phonetic: spoken } },
  };
}

/* ------------------------------------------------------------------ */
/* Public API used by TabScanner                                       */
/* ------------------------------------------------------------------ */
// Perform 100% local on-device leaf analysis (cloud fallback when model can't run OR finds nothing).
// Adaptive thresholds: tries 0.25 -> 0.15 -> 0.10 -> 0.05 -> 0.01 to improve recall on difficult images
// (user's apple scab photo was 0 detections at 0.25 but 1 at 0.15).
const ADAPTIVE_THRESHOLDS = [0.25, 0.15, 0.10, 0.05, 0.02, 0.01, 0.005];

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label + ' timeout after ' + ms + 'ms')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function detectWithAdaptiveThreshold(detectFn, imageElement, initialConf) {
  const tried = new Set();
  // Try highest conf first, but only 2-3 attempts before giving up for cloud fallback
  const order = [initialConf, ...ADAPTIVE_THRESHOLDS].filter(c => {
    if (tried.has(c)) return false;
    tried.add(c);
    return true;
  }).sort((a,b) => b-a).slice(0, 3); // Only try top 3 thresholds for speed
  let lastResult = null;
  let consecutiveTimeouts = 0;
  for (const conf of order) {
    try {
      console.log('[AgriPulse] trying conf', conf);
      const r = await withTimeout(detectFn(imageElement, { conf }), 8000, 'detect conf=' + conf);
      console.log('[AgriPulse] conf', conf, 'detections', r?.detections?.length);
      consecutiveTimeouts = 0;
      if (r?.detections?.length) return r;
      lastResult = r;
    } catch (e) {
      console.warn('[AgriPulse] detect failed at conf', conf, e?.message);
      if (e?.message?.includes('timeout')) {
        consecutiveTimeouts++;
        if (consecutiveTimeouts >= 1 && detectFn.name === 'detectDisease') {
          // WebGPU hang detected - force CPU and retry
          console.warn('[AgriPulse] WebGPU timeout, forcing CPU backend');
          try { forceCPU(); } catch {}
        }
        if (consecutiveTimeouts >= 2) {
          console.warn('[AgriPulse] 2 consecutive timeouts, aborting on-device attempts');
          break;
        }
      }
    }
  }
  // Only try ultra-low if we had at least one successful inference (not timeout)
  if (consecutiveTimeouts === 0) {
    for (const conf of [0.001, 0.0001, 0]) {
      try {
        console.log('[AgriPulse] trying ultra-low conf', conf);
        const r = await withTimeout(detectFn(imageElement, { conf }), 6000, 'detect conf=' + conf);
        if (r?.detections?.length) return r;
        lastResult = lastResult || r;
      } catch (e) {
        console.warn('[AgriPulse] ultra-low detect failed', conf, e?.message);
      }
    }
  }
  return lastResult;
}

export async function analyzeLeafOnDevice(imageElement, canvasOverlay = null, { conf = 0.15 } = {}) {
  const startTime = performance.now();
  let result = null;
  let backend = 'on-device';

  try {
    console.log('[AgriPulse] analyzeLeafOnDevice init');
    const ready = await withTimeout(initOnDeviceAI(), 15000, 'initOnDeviceAI');
    if (!ready) throw new Error(status.error || 'on-device model unavailable');
    console.log('[AgriPulse] model ready, detecting');
    result = await detectWithAdaptiveThreshold(detectDisease, imageElement, conf);
    console.log('[AgriPulse] on-device result', result?.detections?.length);
  } catch (err) {
    console.warn('On-device inference failed:', err);
  }

  // If on-device found nothing, timed out, or we're online, try cloud as fallback
  const shouldTryCloud = (typeof navigator === 'undefined' || navigator.onLine);
  if (shouldTryCloud) {
    // If on-device failed or found nothing, try cloud
    if (!result || !result.detections?.length) {
      console.log('[AgriPulse] trying cloud fallback');
      try {
        const cloudResult = await withTimeout(
          detectWithAdaptiveThreshold(detectDiseaseCloud, imageElement, conf),
          20000,
          'cloud detect'
        );
        console.log('[AgriPulse] cloud result', cloudResult?.detections?.length);
        if (cloudResult?.detections?.length) {
          result = cloudResult;
          backend = 'cloud';
        } else if (!result && cloudResult) {
          result = cloudResult;
          backend = 'cloud';
        }
      } catch (cloudErr) {
        console.warn('Cloud fallback failed or found nothing:', cloudErr);
      }
    }
  }

  const latencyMs = Math.round(performance.now() - startTime);

  if (!result) {
    clearOverlay(canvasOverlay);
    return { matchedCrop: UNAVAILABLE, confidence: 0, latencyMs, backend: 'none', detections: [], metrics: {} };
  }

  const detections = [...(result.detections || [])].sort((a, b) => b.confidence - a.confidence);
  drawOverlay(canvasOverlay, imageElement, detections);
  const matchedCrop = buildMatchedCrop(detections);

  return {
    matchedCrop,
    confidence: matchedCrop.confidence,
    latencyMs,
    backend,
    device: result.device || (backend === 'cloud' ? 'cloud' : status.device),
    detections,
    metrics: {
      detections: detections.length,
      inferenceMs: result.speedMs?.inference != null ? Math.round(result.speedMs.inference) : undefined,
    },
  };
}
