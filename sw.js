// Service Worker for MEX Group.
// Price/trading APIs must stay network-first; stale cached quotes can make the
// platform look frozen even when the backend is healthy.
const CACHE_NAME = 'mex-v6';
const STATIC_ASSETS = [
  '/assets/img/mex_global_logo.png'
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isAppShell(url, request) {
  return request.mode === 'navigate' || url.pathname === '/app.php';
}

function isVersionedStatic(url, request) {
  return url.pathname.startsWith('/assets/dist/')
    || request.destination === 'image'
    || request.destination === 'font';
}

// Fetch strategy:
// - API: network only. Never replay old quotes, markets, orders, or balances.
// - App shell: network first so a deploy takes effect immediately.
// - Versioned/static assets: cache first.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (isApiRequest(url)) {
    event.respondWith(fetch(request));
    return;
  }

  if (isAppShell(url, request)) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  if (isVersionedStatic(url, request)) {
    event.respondWith(
      caches.match(request).then((response) => {
        return response || fetch(request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});
