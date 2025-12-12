const CACHE_NAME = 'gestao-torres-v4'; // Mude o número se alterar códigos

// Lista de arquivos vitais para o app funcionar offline
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './offline.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  
  // Bibliotecas Externas (CDNs) - Essencial cachear para não quebrar offline
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js',
  'https://cdn.jsdelivr.net/npm/idb@7/build/umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js'
];

// 1. Instalação: Baixa e salva os arquivos no cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // Força ativação imediata
});

// 2. Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interceptação de Requisições (Fetch)
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam GET (ex: POST para salvar dados)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Se estiver no cache, retorna o cache (velocidade máxima)
      if (cachedResponse) {
        return cachedResponse;
      }

      // Se não, tenta buscar na rede
      return fetch(event.request).catch(() => {
        // Se falhar a rede (offline) e for uma navegação de página (HTML)
        if (event.request.mode === 'navigate') {
          return caches.match('./offline.html');
        }
      });
    })
  );
});
