const CACHE_NAME = 'gestao-torres-v22'; // Mudei para v8 para forçar atualização
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/idb.js',
  '/manifest.json',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png',
  
  // Bibliotecas Externas (Essencial para funcionar offline)
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
];

// 1. Instalação: Baixa os arquivos para o celular
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
        console.log('Cacheando arquivos para offline...');
        return cache.addAll(ASSETS);
    })
  );
});

// 2. Ativação: Limpa versões antigas do cache
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        )).then(() => clients.claim())
    );
});

// 3. Interceptação: Se tiver internet, usa. Se não, usa o cache.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Se for conexão com o banco do Google (Firestore), tenta rede primeiro
  // (Para garantir dados frescos), se falhar, o app.js assume com o IndexedDB.
  if (url.origin.includes('firestore.googleapis.com') || url.href.includes('google')) {
      return; // Deixa o app.js lidar com a lógica de dados offline
  }

  // Para arquivos do site (HTML, CSS, JS, Libs), usa Cache Primeiro
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        // Se não tiver no cache e não tiver internet, mostra a tela de erro
        if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
        }
      });
    })
  );
});
