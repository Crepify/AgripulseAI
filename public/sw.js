// AgriPulse AI Service Worker for 100% Offline-First Execution
//
// Two caches:
//   SHELL_CACHE  – index.html, hashed JS/CSS, manifest, icons. Versioned per build (BUILD_ID is
//                  injected by vite.config.js), so every deploy installs fresh and old shells are dropped.
//   MODEL_CACHE  – on-device AI model + wasm runtime (~50 MB). Persistent across deploys; cache-first,
//                  never re-downloaded in the background. Bump the name only when the model files change.

const BUILD_ID = '__BUILD_ID__';
const SHELL_CACHE = `agripulse-shell-${BUILD_ID}`;
const MODEL_CACHE = 'agripulse-models-v1';

const SHELL_PRECACHE = ['/', '/index.html', '/manifest.json'];
const SHELL_OPTIONAL = ['/icon.svg', '/favicon.svg', '/icons.svg'];
const MODEL_PREFIXES = ['/models/', '/litert/', '/yolo/'];
// Small runtime files the page requests before this worker controls it on a first visit.
const MODEL_PRECACHE = ['/litert/core.js', '/litert/wasm-utils.js', '/yolo/ultralytics_inference_web_bg.wasm'];

const isModelPath = (pathname) => MODEL_PREFIXES.some((p) => pathname.startsWith(p));

async function addIfMissing(cache, url) {
  try {
    if (!(await cache.match(url, { ignoreVary: true }))) await cache.add(url);
  } catch {
    // best effort (offline during install, 404, ...)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    // Discover this build's hashed assets from index.html so the whole app shell works offline
    // after the very first visit.
    const res = await fetch('/index.html', { cache: 'no-cache' });
    const html = await res.text();
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
    await shell.put('/index.html', new Response(html, { headers: res.headers }));
    await shell.addAll([...SHELL_PRECACHE.filter((u) => u !== '/index.html'), ...assets]);
    await Promise.all(SHELL_OPTIONAL.map((u) => addIfMissing(shell, u)));

    const models = await caches.open(MODEL_CACHE);
    await Promise.all(MODEL_PRECACHE.map((u) => addIfMissing(models, u)));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // One-time migration from the previous single cache: keep already-downloaded model files.
    const legacy = keys.find((k) => k === 'agripulse-cache-v2');
    if (legacy) {
      const old = await caches.open(legacy);
      const models = await caches.open(MODEL_CACHE);
      for (const req of await old.keys()) {
        if (isModelPath(new URL(req.url).pathname) && !(await models.match(req, { ignoreVary: true }))) {
          const r = await old.match(req);
          if (r) await models.put(req, r);
        }
      }
    }
    await Promise.all(
      keys.filter((k) => k !== SHELL_CACHE && k !== MODEL_CACHE).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.status === 200 && response.type === 'basic') {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  const network = fetch(request).then((response) => {
    if (response && response.status === 200 && response.type === 'basic') {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => undefined);

  if (cached) return cached;
  const response = await network;
  if (response) return response;
  // Offline navigation fallback
  if (request.mode === 'navigate') return cache.match('/index.html', { ignoreVary: true });
  return Response.error();
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API calls (cloud fallback), non-GET requests or third-party origins.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  if (isModelPath(url.pathname)) {
    event.respondWith(cacheFirst(request, MODEL_CACHE));
  } else if (url.pathname.startsWith('/assets/')) {
    // Vite output is content-hashed → immutable
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
