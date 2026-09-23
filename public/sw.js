// AgriPulse AI Service Worker for 100% Offline-First Execution

const CACHE_NAME = 'agripulse-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Immutable, large files (on-device AI model + wasm runtime): cache-first, never re-downloaded
// in the background. Bump CACHE_NAME when the model file changes.
const CACHE_FIRST_PREFIXES = ['/models/', '/litert/', '/yolo/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache API calls (cloud fallback) or non-GET requests.
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  const isCacheFirst = url.origin === self.location.origin &&
    CACHE_FIRST_PREFIXES.some((p) => url.pathname.startsWith(p));

  // Stale-while-revalidate or cache-first for offline resilience
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        if (!isCacheFirst) {
          // Fetch in background to update cache
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {
            // Offline, cachedResponse already returned
          });
        }
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback for offline navigation
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
