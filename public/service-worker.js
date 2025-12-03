const CACHE_NAME = 'torres-pwa-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/idb.js',
  '/manifest.json',
  '/offline.html',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install: Cache assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Fetch: Network First for API, Cache First for Assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API Requests: Network First, fallback to nothing (app handles offline)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Se falhar a API, apenas retorna erro 503 ou similar, 
        // o app.js vai lidar com IndexedDB
        return new Response(JSON.stringify({ error: 'Offline' }), { 
            headers: { 'Content-Type': 'application/json' } 
        });
      })
    );
    return;
  }

  // Static Assets: Cache First, fallback to Network, fallback to Offline.html
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
        }
      });
    })
  );
});
