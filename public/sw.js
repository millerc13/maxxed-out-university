// Maxxed Out University — service worker.
//
// CONSERVATIVE caching strategy by design. Caches ONLY static
// assets (Next.js chunked JS/CSS, icons, images, fonts). Does NOT
// cache HTML pages — every navigation hits the network so prod
// updates always show up immediately. This avoids the entire class
// of "stale page after deploy" problems we hit earlier.
//
// Bump CACHE_VERSION whenever this SW changes; old cache buckets
// are purged on activate.

const CACHE_VERSION = 'v2-2026-04-30';
const STATIC_CACHE = `mou-static-${CACHE_VERSION}`;

const STATIC_PATTERNS = [
  /^\/_next\/static\//,
  /^\/icons\//,
  /^\/images\//,
  /^\/downloads\//,
  /^\/fonts\//,
  /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff|woff2|ttf|otf)$/i,
];

self.addEventListener('install', (event) => {
  // Skip the "wait for old SW to release control" dance — install
  // immediately so subsequent visits use the new SW right away.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Purge any caches from older versions of this SW.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('mou-') && !key.endsWith(CACHE_VERSION))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // ONLY cache static assets. Everything else (HTML pages, API
  // routes, auth, admin, etc.) bypasses the SW and hits the network.
  if (!STATIC_PATTERNS.some((p) => p.test(url.pathname))) {
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok && response.type === 'basic') {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
