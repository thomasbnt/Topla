(() => {
  "use strict";

  let valueEl, clearBtn, cacheClearBtn, updateBtn, commitLink, commitValueEl;

  function formatCommitDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const locale = window.ToplaI18n.parametres.dateLocale;
    return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
  }

  function refreshCommitInfo() {
    if (!commitLink) return;
    const info = window.ToplaCommit;
    if (!info || !info.hash) return;

    commitLink.href = `https://github.com/thomasbnt/Topla/commit/${info.hash}`;
    const date = formatCommitDate(info.date);
    commitValueEl.textContent = date ? `${info.shortHash} · ${date}` : info.shortHash;
    commitLink.hidden = false;
  }

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
    const t = window.ToplaI18n.parametres;
    const decimalSeparator = window.ToplaLang === "en" ? "." : ",";
    if (bytes < 1024) return bytes + t.byteUnit;
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1).replace(".", decimalSeparator) + t.kiloUnit;
    return (bytes / (1024 * 1024)).toFixed(2).replace(".", decimalSeparator) + t.megaUnit;
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

  async function clearStorage() {
    const t = window.ToplaI18n.parametres;
    const confirmed = await window.ToplaModal.confirm({
      title: t.deleteConfirmTitle,
      message: t.deleteConfirmMessage,
      confirmLabel: t.deleteConfirmLabel,
      cancelLabel: window.ToplaI18n.common.cancel,
      danger: true,
    });
    if (!confirmed) return;
    try {
      localStorage.clear();
    } catch (e) {
      /* localStorage indisponible : rien à supprimer */
    }
    window.location.reload();
  }

  async function clearCache() {
    const t = window.ToplaI18n.parametres;
    const confirmed = await window.ToplaModal.confirm({
      title: t.cacheConfirmTitle,
      message: t.cacheConfirmMessage,
      confirmLabel: t.cacheConfirmLabel,
      cancelLabel: window.ToplaI18n.common.cancel,
    });
    if (!confirmed) return;
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (e) {
      /* Cache Storage indisponible */
    }
    window.location.reload();
  }

  function refreshUpdateButton() {
    if (!updateBtn) return;
    const available = !!(window.ToplaUpdate && window.ToplaUpdate.available);
    updateBtn.disabled = !available;
    const t = window.ToplaI18n.parametres;
    updateBtn.textContent = available ? t.updateAvailable : t.updateDefault;
    updateBtn.classList.toggle("btn-primary", available);
    updateBtn.classList.toggle("btn-ghost", !available);
  }

  function applyUpdate() {
    if (window.ToplaUpdate && window.ToplaUpdate.available) window.ToplaUpdate.apply();
  }

  function onShow() {
    refresh();
    refreshUpdateButton();
  }

  function init() {
    valueEl = document.getElementById("storage-value");
    clearBtn = document.getElementById("storage-clear-btn");
    cacheClearBtn = document.getElementById("cache-clear-btn");
    updateBtn = document.getElementById("update-app-btn");
    commitLink = document.getElementById("commit-info-link");
    commitValueEl = document.getElementById("commit-info-value");
    if (!valueEl) return;

    clearBtn.addEventListener("click", clearStorage);
    if (cacheClearBtn) cacheClearBtn.addEventListener("click", clearCache);
    if (updateBtn) {
      updateBtn.addEventListener("click", applyUpdate);
      refreshUpdateButton();
      document.addEventListener("topla:update-changed", refreshUpdateButton);
    }
    refreshCommitInfo();
  }

  window.ToplaTools = window.ToplaTools || {};
  window.ToplaTools.parametres = { init, onShow };
})();
