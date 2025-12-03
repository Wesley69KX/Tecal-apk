const CACHE_NAME = 'torres-pwa-v1';
const ASSETS = [
  '/', '/index.html', '/style.css', '/app.js', '/idb.js',
  '/manifest.json', '/offline.html', '/icon-192.png', '/icon-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e=>{
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  // API requests: network-first
  if(url.pathname.startsWith('/api')){
    e.respondWith(
      fetch(e.request).catch(()=> caches.match('/offline.html'))
    );
    return;
  }

  // other requests: cache-first
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request).then(r=>{
      // put in cache dynamically
      return caches.open(CACHE_NAME).then(cache=>{
        cache.put(e.request, r.clone());
        return r;
      });
    })).catch(()=> caches.match('/offline.html'))
  );
});
