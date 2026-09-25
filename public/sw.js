// AgriPulse AI Service Worker for 100% Offline-First Execution
// BUILD_ID injected by vite.config.js — every deploy gets fresh SHELL_CACHE

const BUILD_ID = '__BUILD_ID__';
const SHELL_CACHE = `agripulse-shell-${BUILD_ID}`;
const MODEL_CACHE = 'agripulse-models-v1';

const SHELL_PRECACHE = ['/', '/index.html', '/manifest.json', '/data/pesticide-offline-db.json'];
const SHELL_OPTIONAL = ['/icon.svg', '/favicon.svg', '/icons.svg'];
const MODEL_PREFIXES = ['/models/', '/litert/', '/yolo/'];
const DATA_PREFIXES = ['/data/'];
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
  '/data/pesticide-offline-db.json',
];

const isModelPath = (pathname) => MODEL_PREFIXES.some((p) => pathname.startsWith(p));
const isDataPath = (pathname) => DATA_PREFIXES.some((p) => pathname.startsWith(p));

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
      const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]);
      await shell.put('/index.html', new Response(html, { headers: res.headers }));
      await shell.put('/', new Response(html, { headers: res.headers }));
      if (assets.length) {
        await Promise.all(assets.map(async (a) => {
          try {
            const r = await fetch(a, { cache: 'no-cache' });
            if (r.ok) await shell.put(a, r);
          } catch {}
        }));
      }
      // Precache offline DB explicitly
      await addIfMissing(shell, '/data/pesticide-offline-db.json');
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
    if (response && response.status >= 400) {
      const cached = await cache.match(request, { ignoreVary: true }) || await cache.match('/index.html', { ignoreVary: true });
      if (cached) return cached;
      return response;
    }
  } catch (e) {
    const cached = await cache.match(request, { ignoreVary: true }) || await cache.match('/index.html', { ignoreVary: true }) || await cache.match('/', { ignoreVary: true });
    if (cached) return cached;
  }
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
  if (isModelPath(url.pathname) || isDataPath(url.pathname)) {
    event.respondWith(cacheFirst(request, url.pathname.startsWith('/data/') ? SHELL_CACHE : MODEL_CACHE));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith((async () => {
      try {
        const res = await fetch(request, { cache: 'no-cache' });
        if (res.ok) {
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, res.clone()).catch(() => {});
          return res;
        }
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
