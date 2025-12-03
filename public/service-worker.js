self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("torres-cache").then(cache =>
      cache.addAll([
        "/",
        "/index.html",
        "/style.css",
        "/script.js",
        "/offline.html",
        "/icon-192.png",
        "/icon-512.png"
      ])
    )
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(resp =>
      resp || fetch(e.request).catch(() => caches.match("/offline.html"))
    )
  );
});
