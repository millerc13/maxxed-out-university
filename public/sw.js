// Maxxed Out University — service worker.
//
// Strategy summary:
//   · API requests, auth flows, signing/checkout pages → NETWORK ONLY
//     (never cache anything that touches user state, payments, or auth).
//   · Static assets (/_next/static, /icons, /images, /downloads, fonts)
//     → STALE-WHILE-REVALIDATE (instant load + background refresh).
//   · Navigation requests (HTML pages) → NETWORK FIRST with a 4s timeout.
//     Falls back to the most recently cached copy of that URL, then
//     /offline.html if neither resolves.
//
// Bump CACHE_VERSION whenever this file changes — old caches are
// purged in the activate event.

const CACHE_VERSION = 'v1-2026-04-30';
const STATIC_CACHE = `mou-static-${CACHE_VERSION}`;
const PAGES_CACHE = `mou-pages-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// URL prefixes / regexes that must NEVER be cached or served from cache.
// Auth and payment flows must always hit the network so stale cookies /
// session state can't surface old data.
const NETWORK_ONLY_PATTERNS = [
  /^\/api\//,
  /^\/auth\//,
  /^\/sign\//,
  /^\/checkout(\/|$|\?)/,
  /^\/admin/,             // admin-gated, dynamic — never cache
  /^\/ph\//,              // posthog proxy
  /\/__nextjs_/,          // Next.js dev / inspect endpoints
];

const STATIC_PATTERNS = [
  /^\/_next\/static\//,
  /^\/icons\//,
  /^\/images\//,
  /^\/downloads\//,
  /^\/fonts\//,
  /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff|woff2|ttf|otf)$/i,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      // Pre-cache the offline fallback only — anything else can lazy
      // load on first hit. Pre-caching every chunk would slow install
      // and most assets are content-hashed anyway.
      await cache.add(new Request(OFFLINE_URL, { cache: 'reload' }));
      // skipWaiting so a freshly-installed SW takes over without
      // requiring a manual reload.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Drop any caches from older versions of this SW.
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

  // Only handle GET; let POST/PUT/DELETE pass through unchanged.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin requests entirely — let the browser handle them
  // normally so third-party CDNs (PostHog, Google Fonts, etc.) work.
  if (url.origin !== self.location.origin) return;

  // Network-only routes (auth/admin/api/etc.) — pass through without
  // ever touching the cache.
  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(url.pathname))) {
    return;
  }

  // Static asset → stale-while-revalidate. Serve cached if present,
  // refresh in background.
  if (STATIC_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Navigation request (HTML page) → network-first w/ 4s timeout,
  // fall back to cached copy of that URL, then offline.html.
  if (
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html')
  ) {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  // Anything else (e.g. JSON manifests, RSC payloads) — try network,
  // fall back to cache silently. No offline fallback for non-navigation.
  event.respondWith(
    fetch(request).catch(() => caches.match(request).then((res) => res || Response.error())),
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      // Only cache successful, basic (same-origin) responses.
      if (response.ok && response.type === 'basic') {
        cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

async function networkFirstHtml(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('network-timeout')), 4000),
      ),
    ]);
    if (networkResponse && networkResponse.ok && networkResponse.type === 'basic') {
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    return (
      offline ||
      new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } })
    );
  }
}

// Allow the page to ask the SW to update itself instantly (used after
// a deploy — the registration script posts {type: 'SKIP_WAITING'}).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
