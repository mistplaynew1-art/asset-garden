// Casino PWA Service Worker v2
// Proper caching strategy, push notifications support

const CACHE_NAME = 'casino-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - HTML: network first, cache fallback
// - Assets (JS/CSS/images): cache first, network fallback
// - API calls: network only (never cache game results)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache Supabase API calls
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/functions/')) {
    return; // let it pass through
  }

  // Cache first for assets
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return res;
          })
      )
    );
    return;
  }

  // Network first for everything else
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request) || caches.match('/'))
  );
});

// Push notifications (for win alerts)
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Casino Alert', {
      body: data.body ?? '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'casino-notification',
      data: data.url ?? '/',
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data;
  event.waitUntil(clients.openWindow(url));
});