const CACHE_NAME = 'chinese-app-pwa-v8';

const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './pinyin-pro.min.js',
    './hanzi-writer.min.js',
    './vocab.json',
    './stories.json',
    './config.json',
    './manifest.json',
    './favicon.png',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// 1. Install Event: Cache Core Assets
self.addEventListener('install', (event) => {
    console.log('[SW] Cài đặt Service Worker v5, bắt đầu cache tài nguyên cốt lõi...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.warn('[SW] Pre-cache warning:', err);
            })
    );
});

// 2. Activate Event: Clean up outdated caches immediately
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker v5 kích hoạt, dọn dẹp cache cũ...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('[SW] Xóa cache cũ:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Fetch Event: Network-First for app code, offline fallback
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Không can thiệp vào các API động (Google Sheets, Gemini AI, GitHub API, GitHub Raw, Google Translate TTS)
    if (
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('docs.google.com') ||
        url.hostname.includes('api.github.com') ||
        url.hostname.includes('raw.githubusercontent.com') ||
        url.hostname.includes('translate.google.com') ||
        url.hostname.includes('mymemory.translated.net')
    ) {
        return; // Để trình duyệt gọi trực tiếp qua network
    }

    // Cache đặc biệt cho dữ liệu nét chữ Hán của HanziWriter (cdn.jsdelivr.net / hanzi-writer-data)
    if (url.hostname.includes('jsdelivr.net')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(async (cache) => {
                const cachedResponse = await cache.match(request);
                if (cachedResponse) {
                    return cachedResponse;
                }
                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(request, networkResponse.clone());
                    }
                    return networkResponse;
                } catch (e) {
                    console.warn('[SW] Offline: không tải được nét chữ mới:', url.pathname);
                    return cachedResponse || new Response('Offline', { status: 503 });
                }
            })
        );
        return;
    }

    // Network-First cho core code (app.js, index.html, styles.css, config.json) để đảm bảo cập nhật tức thì
    const isCoreAppAsset = (
        url.pathname.endsWith('app.js') ||
        url.pathname.endsWith('index.html') ||
        url.pathname.endsWith('styles.css') ||
        url.pathname.endsWith('config.json') ||
        url.pathname.endsWith('stories.json') ||
        url.pathname === '/' ||
        url.pathname.endsWith('/')
    );

    if (isCoreAppAsset) {
        event.respondWith(
            fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return networkResponse;
            }).catch(() => {
                return caches.match(request).then((cached) => {
                    if (cached) return cached;
                    if (request.mode === 'navigate') return caches.match('./index.html');
                    return new Response('Offline', { status: 503 });
                });
            })
        );
        return;
    }

    // Đối với các static asset khác (hình ảnh, thư viện tĩnh pinyin-pro, hanzi-writer)
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
