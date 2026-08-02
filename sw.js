const VERSION = "v21";
const CACHE_VERSION = `topla-${VERSION}`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/modal.js",
  "./js/lettre.js",
  "./js/chiffre.js",
  "./js/roulette.js",
  "./js/equipes.js",
  "./js/score.js",
  "./js/des.js",
  "./js/sablier.js",
  "./js/parametres.js",
  "./js/pile-face.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-192-maskable.png",
  "./icons/icon-512-maskable.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((clients) => clients.forEach((client) => client.postMessage({ type: "SW_UPDATED" })))
  );
});

// Cache-first, avec revalidation réseau en arrière-plan (stale-while-revalidate).
self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => null);

        if (cached) {
          networkFetch.catch(() => {});
          return cached;
        }

        return networkFetch.then((response) => {
          if (response) return response;
          if (request.mode === "navigate") return cache.match("./index.html");
          return new Response("", { status: 504, statusText: "Hors ligne" });
        });
      })
    )
  );
});
