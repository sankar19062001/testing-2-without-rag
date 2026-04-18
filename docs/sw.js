// sw.js — Service Worker for SIMODRIVE 611 Diagnostic PWA
// Caches the app shell so it loads instantly even offline.
// API calls (/ask, /health) go to the factory server — never cached.

const CACHE  = "simodrive-pwa-v1";
const SHELL  = ["/", "/index.html", "/manifest.json"];

// ── Install: cache the app shell ──────────────────────────────────────────
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ────────────────────────────────────────────
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch strategy ────────────────────────────────────────────────────────
// API calls  → Network only (never cache LLM responses)
// App shell  → Cache first (loads instantly offline)
self.addEventListener("fetch", e => {
  const url = e.request.url;

  // API calls to factory server — always go to network
  if (url.includes("/ask") || url.includes("/health") ||
      url.includes("/tickets") || url.includes("/resolve")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // App shell — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      return cached || fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      });
    }).catch(() => {
      // Absolute fallback — return cached index.html
      return caches.match("/index.html");
    })
  );
});
