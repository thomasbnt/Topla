(() => {
  "use strict";

  function confirmModal({ title, message, confirmLabel = "Confirmer", cancelLabel = "Annuler", danger = false }) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal-overlay";

      const box = document.createElement("div");
      box.className = "modal-box";
      box.setAttribute("role", "dialog");
      box.setAttribute("aria-modal", "true");

      const titleEl = document.createElement("h3");
      titleEl.className = "modal-title";
      titleEl.textContent = title;

      const messageEl = document.createElement("p");
      messageEl.className = "modal-message";
      messageEl.textContent = message;

      const actions = document.createElement("div");
      actions.className = "modal-actions";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "btn btn-ghost";
      cancelBtn.textContent = cancelLabel;

      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = danger ? "btn btn-danger-outline" : "btn btn-primary";
      confirmBtn.textContent = confirmLabel;

      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      box.appendChild(titleEl);
      box.appendChild(messageEl);
      box.appendChild(actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      function close(result) {
        overlay.removeEventListener("click", onOverlayClick);
        document.removeEventListener("keydown", onKeydown);
        overlay.remove();
        resolve(result);
      }

      function onOverlayClick(event) {
        if (event.target === overlay) close(false);
      }

      function onKeydown(event) {
        if (event.key === "Escape") close(false);
      }

      cancelBtn.addEventListener("click", () => close(false));
      confirmBtn.addEventListener("click", () => close(true));
      overlay.addEventListener("click", onOverlayClick);
      document.addEventListener("keydown", onKeydown);

      confirmBtn.focus();
    });
  }

  window.ToplaModal = { confirm: confirmModal };
})();
