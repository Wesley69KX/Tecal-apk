const CACHE_NAME = 'gestao-torres-v5-nativo'; // Mudei a versão para forçar atualização

// Arquivos vitais para o visual do app
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  
  // Bibliotecas (Firebase, PDF, IDB, Ícones)
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js',
  'https://cdn.jsdelivr.net/npm/idb@7/build/umd.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js'
];

// 1. Instalação: Baixa tudo para o celular
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando App Completo');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Ativação: Limpa versões velhas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Estratégia de Busca: Cache First (Prioriza o Offline)
// Se tiver no cache (mesmo sem internet), usa o cache. Se não, tenta a rede.
self.addEventListener('fetch', (event) => {
  // Não cacheia chamadas ao Firestore (deixa o SDK do Firebase lidar com isso)
  if (event.request.url.includes('firestore.googleapis.com')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Retorna o visual salvo imediatamente (Velocidade Nativa)
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Se não achou (ex: navegar para uma página nova), tenta a rede
      return fetch(event.request).catch(() => {
        // Se falhar a rede, retorna o index.html (modo SPA offline)
        // Isso garante que a estrutura sempre carregue
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
