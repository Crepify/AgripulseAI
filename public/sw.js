// AgriPulse AI Service Worker for 100% Offline-First Execution
// BUILD_ID injected by vite.config.js — every deploy gets fresh SHELL_CACHE

const BUILD_ID = '__BUILD_ID__';
const SHELL_CACHE = `agripulse-shell-${BUILD_ID}`;
const MODEL_CACHE = 'agripulse-models-v1';

const SHELL_PRECACHE = ['/', '/index.html', '/manifest.json'];
const SHELL_OPTIONAL = ['/icon.svg', '/favicon.svg', '/icons.svg'];
const MODEL_PREFIXES = ['/models/', '/litert/', '/yolo/'];
const MODEL_PRECACHE = [
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
  '/models/agripulse.tflite',
  '/models/classes.json',
];

const isModelPath = (pathname) => MODEL_PREFIXES.some((p) => pathname.startsWith(p));

async function addIfMissing(cache, url) {
  try {
    if (!(await cache.match(url, { ignoreVary: true }))) await cache.add(url);
  } catch {}
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    try {
      const res = await fetch('/index.html', { cache: 'no-cache' });
      const html = await res.text();
      const assets = [...html.matchAll(/(?:src|href)="(\\/assets\\/[^"]+)"/g)].map((m) => m[1]);
      await shell.put('/index.html', new Response(html, { headers: res.headers }));
      // Also cache root as index.html for navigation fallback
      await shell.put('/', new Response(html, { headers: res.headers }));
      if (assets.length) {
        // Fetch assets with no-cache to ensure we have latest
        await Promise.all(assets.map(async (a) => {
          try {
            const r = await fetch(a, { cache: 'no-cache' });
            if (r.ok) await shell.put(a, r);
          } catch {}
        }));
      }
    } catch {}
    await Promise.all(SHELL_OPTIONAL.map((u) => addIfMissing(shell, u)));
    const models = await caches.open(MODEL_CACHE);
    await Promise.all(MODEL_PRECACHE.map((u) => addIfMissing(models, u)));
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
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
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const fallback = await cache.match(request, { ignoreVary: true });
    if (fallback) return fallback;
    return new Response('', { status: 503, statusText: 'Offline and not cached' });
  }
}

// NETWORK-FIRST for navigation — prevents black screen from stale index.html referencing deleted hashed assets
async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
      cache.put('/index.html', response.clone()).catch(() => {});
      cache.put('/', response.clone()).catch(() => {});
      return response;
    }
    // If server returns 404/500, try cache
    if (response && response.status >= 400) {
      const cached = await cache.match(request, { ignoreVary: true }) || await cache.match('/index.html', { ignoreVary: true });
      if (cached) return cached;
      return response;
    }
  } catch (e) {
    // Network failed — serve cached shell
    const cached = await cache.match(request, { ignoreVary: true }) || await cache.match('/index.html', { ignoreVary: true }) || await cache.match('/', { ignoreVary: true });
    if (cached) return cached;
  }
  // Last resort
  const fallback = await cache.match('/index.html', { ignoreVary: true });
  if (fallback) return fallback;
  return new Response('<h1>Offline — please reconnect</h1>', { status: 503, headers: { 'Content-Type': 'text/html' } });
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request, { ignoreVary: true });
  const networkPromise = fetch(request).then((response) => {
    if (response && response.ok) {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  }).catch(() => undefined);
  if (cached) {
    networkPromise.catch(() => {});
    return cached;
  }
  const response = await networkPromise;
  if (response) return response;
  if (request.mode === 'navigate') {
    const fallback = await cache.match('/index.html', { ignoreVary: true });
    if (fallback) return fallback;
  }
  return new Response('', { status: 503, statusText: 'Offline' });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }
  if (isModelPath(url.pathname)) {
    event.respondWith(cacheFirst(request, MODEL_CACHE));
  } else if (url.pathname.startsWith('/assets/')) {
    // For hashed assets, network first to avoid 404 black screen — if asset deleted on server, fetch new index.html path
    event.respondWith((async () => {
      try {
        const res = await fetch(request, { cache: 'no-cache' });
        if (res.ok) {
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, res.clone()).catch(() => {});
          return res;
        }
        // If 404 (old hashed file deleted), try cache, then force navigation to refresh shell
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(request, { ignoreVary: true });
        if (cached) return cached;
        return res;
      } catch {
        return cacheFirst(request, SHELL_CACHE);
      }
    })());
  } else if (request.mode === 'navigate' || request.destination === 'document' || url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(networkFirstNavigation(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});
