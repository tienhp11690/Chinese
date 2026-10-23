const CACHE_NAME = 'chinese-app-pwa-v4';

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
    console.log('[SW] Cài đặt Service Worker, bắt đầu cache tài nguyên cốt lõi...');
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

// 2. Activate Event: Clean up outdated caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Service Worker kích hoạt, dọn dẹp cache cũ...');
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

// 3. Fetch Event: Offline-first with network fallback and dynamic caching
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

    // Đối với tài nguyên cùng nguồn (local static assets)
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Trả về cache ngay lập tức cho tốc độ tối đa offline
                // Đồng thời fetch ngầm để cập nhật phiên bản mới (Stale-While-Revalidate)
                fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, networkResponse);
                        });
                    }
                }).catch(() => {
                    // Offline - bỏ qua fetch ngầm
                });
                return cachedResponse;
            }

            // Nếu chưa có trong cache, tải từ network và lưu vào cache
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
                // Nếu offline và là điều hướng trang, fallback về index.html
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
