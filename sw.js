const CACHE_NAME = 'chinese-pro-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdn.jsdelivr.net/npm/pinyin-pro@3.16.0/dist/index.umd.js',
  'https://script.google.com/macros/s/AKfycbyMlgl6tJdTQfZ8PjZmtqnPWzOqYЩ_tmqTbUhE7ZrXaxBzyj4Cmyj5yw1pnHNYfxJ_GSnw/exec',
  'https://api.allorigins.win/get'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).catch(() => new Response('Offline', { status: 503 }));
    })
  );
});