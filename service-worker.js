const CACHE_NAME = 'coffee-cream-v12.2';
// Chemins relatifs — résolus contre l'URL du service worker, donc marchent à
// la fois sur Netlify (déployé à `/`) et sur GitHub Pages (`/coffee-and-cream/`)
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './recipes.js',
  './extraction.js',
  './beans.js',
  './app.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
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
  // Never cache Supabase API calls
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Network-first for app files (JS, CSS, HTML) so updates are always picked up
  if (e.request.url.match(/\.(js|css|html)$/) || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache-first for static assets (fonts, icons, CDN libs)
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
