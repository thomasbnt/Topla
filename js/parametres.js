(() => {
  "use strict";

  let valueEl, clearBtn;
  let bound = false;

  function getLocalStorageSize() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key) || "";
      total += new Blob([key + value]).size;
    }
    return total;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " o";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1).replace(".", ",") + " Ko";
    return (bytes / (1024 * 1024)).toFixed(2).replace(".", ",") + " Mo";
  }

  function refresh() {
    let size = 0;
    try {
      size = getLocalStorageSize();
    } catch (e) {
      /* localStorage indisponible : on affiche 0 */
    }
    valueEl.textContent = formatBytes(size);
  }

  function clearStorage() {
    const confirmed = window.confirm(
      "Supprimer toutes les données locales (joueurs, équipes, scores) ? Cette action est irréversible."
    );
    if (!confirmed) return;
    try {
      localStorage.clear();
    } catch (e) {
      /* localStorage indisponible : rien à supprimer */
    }
    window.location.reload();
  }

  function onShow() {
    refresh();
  }

  function init() {
    if (bound) return;
    valueEl = document.getElementById("storage-value");
    clearBtn = document.getElementById("storage-clear-btn");
    if (!valueEl) return;

    clearBtn.addEventListener("click", clearStorage);
    bound = true;
  }

  window.ToplaTools = window.ToplaTools || {};
  window.ToplaTools.parametres = { init, onShow };
})();
