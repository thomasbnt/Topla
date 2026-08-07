const VERSION = "v31";
const CACHE_VERSION = `topla-${VERSION}`;
const APP_SHELL = [
  "./",
  "./lettre",
  "./chiffre",
  "./roulette",
  "./equipes",
  "./score",
  "./des",
  "./sablier",
  "./pile-face",
  "./parametres",
  "./en",
  "./en/letter",
  "./en/number",
  "./en/roulette",
  "./en/teams",
  "./en/score",
  "./en/dice",
  "./en/timer",
  "./en/coin-flip",
  "./en/settings",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/commit-info.js",
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
  // Pas de skipWaiting() ici : une mise à jour doit rester en attente tant
  // que l'utilisateur ne l'a pas validée (toast / bouton Paramètres). Un
  // premier install (aucun client existant à contrôler) s'active malgré
  // tout automatiquement, sans besoin de skipWaiting.
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
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
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
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
          if (request.mode === "navigate") {
            const isEn = url.pathname === "/en" || url.pathname.startsWith("/en/");
            return cache.match(isEn ? "./en" : "./");
          }
          return new Response("", { status: 504, statusText: "Hors ligne" });
        });
      })
    )
  );
});
