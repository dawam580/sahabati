// ==========================================
// Sahabati PWA Service Worker
// Enables Offline Caching & Google Play PWA / TWA Compatibility
// ==========================================

const CACHE_NAME = 'sahabati-v2.5';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './logo.jpg',
  './js/app.js',
  './js/database.js',
  './js/data.js',
  './js/assets.js',
  './js/security.js',
  './css/style.css',
  './css/mobile-app.css',
  './js/brand-icons.js',
  './vendor/fontawesome/css/all.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
