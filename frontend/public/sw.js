// JMK HRMS - Progressive Web App Service Worker (Auto-Updating & Resilient)
const CACHE_NAME = 'jmk-hrms-v4';

// Install Event: Skip waiting immediately so new builds activate without waiting
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate Event: Wipe all old caches and claim control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          return caches.delete(name);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-first for everything to ensure zero stale chunk lockouts
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Never intercept API requests, non-GET methods, or cross-origin requests
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.startsWith('/uploads') ||
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // 2. Navigation (HTML): Always fetch live HTML from network (never cache index.html)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' }).catch(() => {
        return caches.match('/index.html') || fetch('/index.html');
      })
    );
    return;
  }

  // 3. Static assets: Try network first; fallback to cache if offline; never throw unhandled
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      // Return synthetic empty response or fallback instead of throwing net::ERR_FAILED
      return new Response('', { status: 404, statusText: 'Resource Not Found' });
    })
  );
});
