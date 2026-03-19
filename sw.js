const CACHE_NAME = 'billable-tracker-v1';

// Everything the app needs to work offline
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Google+Sans+Display:wght@400;500;700&family=Roboto:wght@400;500&display=swap'
];

// ── INSTALL: cache all shell assets ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local assets reliably; best-effort for external fonts
      const local = PRECACHE_URLS.filter(u => !u.startsWith('http'));
      const external = PRECACHE_URLS.filter(u => u.startsWith('http'));
      return cache.addAll(local).then(() =>
        Promise.allSettled(external.map(u => cache.add(u)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: remove old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first for local, network-first for fonts ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // For Google Fonts — stale-while-revalidate
  if (url.hostname.includes('fonts.g') || url.hostname.includes('fonts.google')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(cached => {
          const network = fetch(event.request).then(response => {
            cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  // For everything else — cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      });
    })
  );
});
