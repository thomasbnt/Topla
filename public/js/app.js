(() => {
  "use strict";

  function updateGreeting() {
    const greetingEl = document.getElementById("greeting");
    if (!greetingEl) return;
    const hour = new Date().getHours();
    const t = window.ToplaI18n.common;
    greetingEl.textContent = hour >= 18 || hour < 5 ? t.greetingEvening : t.greetingMorning;
  }

  // Bouton "Installer l'app" : masqué si déjà installée (mode standalone) ou
  // si le navigateur ne propose pas l'invite d'installation (ex. iOS Safari).
  let deferredPrompt = null;

  function initInstallButton() {
    const installBtn = document.getElementById("install-app-btn");
    if (!installBtn) return;

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (isStandalone) return;

    installBtn.hidden = !deferredPrompt;

    installBtn.addEventListener("click", async () => {
      if (!deferredPrompt) return;
      installBtn.hidden = true;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    });
  }

  // Mise à jour PWA : window.ToplaUpdate est la source de vérité partagée
  // avec la page Paramètres (script séparé, même session). "available"
  // reflète l'existence d'un service worker en attente ; "apply" déclenche
  // son activation.
  let updateWorker = null;
  let updateDismissed = false;
  window.ToplaUpdate = { available: false, apply: () => {} };

  function applyUpdate() {
    if (!updateWorker) return;
    updateWorker.postMessage({ type: "SKIP_WAITING" });
  }

  function setUpdateAvailable(worker) {
    updateWorker = worker;
    window.ToplaUpdate = { available: true, apply: applyUpdate };
    document.dispatchEvent(new CustomEvent("topla:update-changed"));
    showUpdateToast();
  }

  function showUpdateToast() {
    const existing = document.getElementById("update-toast");
    if (existing) existing.remove();
    if (!window.ToplaUpdate.available || updateDismissed) return;

    const toast = document.createElement("div");
    toast.id = "update-toast";
    toast.className = "update-toast";
    toast.setAttribute("role", "status");

    const t = window.ToplaI18n.common;

    const text = document.createElement("p");
    text.textContent = t.updateToastText;

    const actions = document.createElement("div");
    actions.className = "update-toast-actions";

    const laterBtn = document.createElement("button");
    laterBtn.type = "button";
    laterBtn.className = "btn btn-ghost";
    laterBtn.textContent = t.updateIgnore;
    laterBtn.addEventListener("click", () => {
      updateDismissed = true;
      toast.remove();
    });

    const updateBtn = document.createElement("button");
    updateBtn.type = "button";
    updateBtn.className = "btn btn-primary";
    updateBtn.textContent = t.updateApply;
    updateBtn.addEventListener("click", applyUpdate);

    actions.appendChild(laterBtn);
    actions.appendChild(updateBtn);
    toast.appendChild(text);
    toast.appendChild(actions);
    document.body.appendChild(toast);
  }

  // Posé juste avant le reload qui suit une mise à jour appliquée ; lu une
  // fois au chargement suivant pour confirmer que la mise à jour a réussi.
  function showUpdateSuccessToast() {
    if (!sessionStorage.getItem("topla-updated")) return;
    sessionStorage.removeItem("topla-updated");

    const toast = document.createElement("div");
    toast.className = "update-toast";
    toast.setAttribute("role", "status");

    const text = document.createElement("p");
    text.textContent = window.ToplaI18n.common.updateSuccessText;
    toast.appendChild(text);

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // Avec les view transitions Astro, la page ne recharge plus entre deux
  // outils : le DOM est remplacé mais ce script ne se réexécute pas
  // forcément. "astro:page-load" se déclenche à chaque navigation (y
  // compris la toute première) et remplace DOMContentLoaded.
  function runPageInit() {
    updateGreeting();
    initInstallButton();
    showUpdateToast();
    showUpdateSuccessToast();

    Object.keys(window.ToplaTools || {}).forEach((name) => {
      const tool = window.ToplaTools[name];
      const isActive = typeof tool.init === "function" ? tool.init() : false;
      if (isActive && typeof tool.onShow === "function") tool.onShow();
    });
  }

  document.addEventListener("astro:page-load", runPageInit);

  // Tout ce qui suit ne doit s'exécuter qu'une seule fois pour toute la
  // session (écouteurs sur window, service worker) : un marqueur sur window
  // protège contre une éventuelle réexécution de ce script à la navigation.
  if (window.__toplaBootstrapped) return;
  window.__toplaBootstrapped = true;

  setInterval(updateGreeting, 60 * 1000);

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    const installBtn = document.getElementById("install-app-btn");
    if (installBtn) installBtn.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    const installBtn = document.getElementById("install-app-btn");
    if (installBtn) installBtn.hidden = true;
  });

  if ("serviceWorker" in navigator) {
    // Une mise à jour appliquée pendant que l'app est hors ligne ne doit pas
    // forcer un rechargement : on attend le retour du réseau.
    function reloadWhenOnline() {
      sessionStorage.setItem("topla-updated", "1");
      if (navigator.onLine) {
        window.location.reload();
      } else {
        window.addEventListener("online", () => window.location.reload(), { once: true });
      }
    }

    // Le nouveau SW ne prend le contrôle qu'après SKIP_WAITING (déclenché
    // par le toast ou le bouton Paramètres) : c'est le signal fiable pour
    // recharger avec la nouvelle version.
    navigator.serviceWorker.addEventListener("controllerchange", reloadWhenOnline);

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").then((registration) => {
        function trackInstalling(worker) {
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateAvailable(worker);
            }
          });
        }

        // Un SW était déjà en attente avant même ce chargement (ex. onglet
        // resté ouvert pendant qu'une mise à jour s'installait ailleurs).
        if (registration.waiting && navigator.serviceWorker.controller) {
          setUpdateAvailable(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          if (registration.installing) trackInstalling(registration.installing);
        });

        // Un nouveau sw.js n'est parfois détecté qu'après un long moment
        // (cache HTTP du navigateur) : on force la vérification régulièrement,
        // ce qui évite que certains appareils restent bloqués sur une vieille version.
        registration.update().catch(() => {});
        setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") registration.update().catch(() => {});
        });
      }).catch(() => {});
    });
  }
})();
