const CACHE_NAME = "attendance-tracker-v2";

// Only static assets are pre-cached. index.html / "/" are handled with
// a network-first strategy at fetch time, so they are NOT listed here.
const STATIC_ASSETS = ["./manifest.json", "./icon-192.png", "./icon-512.png"];

// Paths that should use the network-first strategy (the "app shell" HTML).
const NETWORK_FIRST_PATHS = ["/", "./", "./index.html", "index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isHtmlRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Standard navigation requests (address bar, link clicks, PWA launch)
  if (request.mode === "navigate") return true;

  // Explicit matches for "/" or "index.html" (any path segment ending in it)
  if (NETWORK_FIRST_PATHS.includes(path) || path.endsWith("/index.html") || path === "/") {
    return true;
  }

  return false;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const networkResponse = await fetch(request);
    // Keep a fresh copy in the cache as an offline fallback for next time.
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const networkResponse = await fetch(request);
  cache.put(request, networkResponse.clone());
  return networkResponse;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests; let everything else pass through untouched.
  if (request.method !== "GET") return;

  if (isHtmlRequest(request)) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});
