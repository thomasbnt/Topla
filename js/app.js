(() => {
  "use strict";

  const screens = Array.from(document.querySelectorAll(".screen"));
  const greetingEl = document.getElementById("greeting");

  function updateGreeting() {
    if (!greetingEl) return;
    const hour = new Date().getHours();
    greetingEl.textContent = hour >= 18 || hour < 5 ? "Bonsoir" : "Bonjour";
  }

  function screenNameFromHash() {
    const hash = window.location.hash.replace("#", "");
    const known = screens.map((s) => s.dataset.screen);
    return known.includes(hash) ? hash : "accueil";
  }

  function applyScreen(name) {
    screens.forEach((screen) => {
      screen.classList.toggle("is-active", screen.dataset.screen === name);
    });

    if (name === "accueil") updateGreeting();

    const onShow = window.ToplaTools && window.ToplaTools[name] && window.ToplaTools[name].onShow;
    if (typeof onShow === "function") onShow();

    window.scrollTo(0, 0);
  }

  function showScreen(name) {
    if (typeof document.startViewTransition === "function") {
      document.startViewTransition(() => applyScreen(name));
    } else {
      applyScreen(name);
    }
  }

  function navigateTo(name) {
    if (window.location.hash.replace("#", "") === name) {
      showScreen(name);
    } else {
      window.location.hash = name;
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-nav]");
    if (!target) return;
    navigateTo(target.dataset.nav);
  });

  window.addEventListener("hashchange", () => showScreen(screenNameFromHash()));

  document.addEventListener("DOMContentLoaded", () => {
    Object.keys(window.ToplaTools || {}).forEach((name) => {
      const init = window.ToplaTools[name].init;
      if (typeof init === "function") init();
    });
    showScreen(screenNameFromHash());
  });

  // Rafraîchit "Bonjour"/"Bonsoir" si l'app reste ouverte au passage de 18h.
  setInterval(updateGreeting, 60 * 1000);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "SW_UPDATED") window.location.reload();
    });
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {});
    });
  }
})();
