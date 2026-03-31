const CACHE_NAME = 'coffee-cream-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/recipes.js',
  '/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
