/**
 * AgriPulse Vision Agent — on-device crop-disease detection
 *
 * Runs /models/agripulse.tflite (LiteRT export of your YOLO26s, 52 PlantVillage classes)
 * in the browser with @ultralytics/yolo: LiteRT.js on WebGPU, automatic CPU/wasm fallback.
 * Letterboxing, NMS, class names and drawing are handled by the library.
 *
 * Plain ES module — works from React, Vue or Svelte.
 */
import { YOLO, annotate } from "@ultralytics/yolo";

// Switch to "/models/agripulse_fp16.onnx" for half the download (ONNX Runtime Web backend).
export const MODEL_URL = "/models/agripulse.tflite";

let modelPromise = null;

/** "Tomato___Late_blight" -> { crop: "Tomato", disease: "Late blight" }; "frogeye_spot" -> { crop: "", disease: "frogeye spot" } */
export function splitLabel(name) {
  const [a, b] = name.split("___");
  return b ? { crop: a.replace(/_/g, " "), disease: b.replace(/_/g, " ") } : { crop: "", disease: a.replace(/_/g, " ") };
}

/** Load once (first call downloads ~37 MB; the browser caches it afterwards). */
export function loadDetector(onProgress) {
  if (!modelPromise) {
    onProgress?.("Loading model…");
    modelPromise = YOLO.load(MODEL_URL, {
      device: "auto",                                        // WebGPU if available, else CPU/wasm
      litertWasmUrl: new URL("/litert/", location.href),     // self-hosted LiteRT.js runtime (absolute URL, trailing slash)
      wasmUrl: new URL("/yolo/ultralytics_inference_web_bg.wasm", location.href), // self-hosted pre/post-processing wasm
    }).then((m) => {
      console.info(`[AgriPulse] model ready on "${m.device}" — ${Object.keys(m.names).length} classes`);
      return m;
    }).catch((err) => {
      modelPromise = null; // allow a retry after a transient failure
      throw err;
    });
  }
  return modelPromise;
}

/** Detect on an <img>, <video>, <canvas>, ImageBitmap or File. Boxes are in source pixels. */
export async function detectDisease(source, { conf = 0.25, iou = 0.7 } = {}) {
  const model = await loadDetector();
  const results = await model.predict(source, { conf, iou });
  return {
    device: model.device,
    width: results.width,
    height: results.height,
    speedMs: results.speed,                       // { preprocess, inference, postprocess }
    detections: results.boxes.map((b) => ({
      classId: b.cls,
      label: b.name,                              // e.g. "Tomato___Late_blight"
      ...splitLabel(b.name),
      confidence: b.conf,
      box: [b.x1, b.y1, b.x2, b.y2],
    })),
    raw: results,
  };
}

/** Detect + draw labelled boxes onto a canvas in one call. */
export async function detectAndDraw(canvas, source, opts = {}) {
  const model = await loadDetector();
  const results = await model.predict(source, opts);
  await annotate(canvas, source, results);
  return results;
}

/** Live camera loop; returns stop(). */
export function startLiveDetection(videoEl, canvasEl, onResults, opts = {}) {
  let running = true;
  (async () => {
    const model = await loadDetector();
    while (running) {
      if (videoEl.readyState >= 2 && !videoEl.paused) {
        const results = await model.predict(videoEl, opts);
        await annotate(canvasEl, videoEl, results);
        onResults?.(results);
      }
      await new Promise(requestAnimationFrame);
    }
  })();
  return () => { running = false; };
}
