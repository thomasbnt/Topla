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

  function promptNumberModal({ title, message, confirmLabel = "Ajouter", cancelLabel = "Annuler" }) {
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

      const input = document.createElement("input");
      input.type = "number";
      input.inputMode = "numeric";
      input.className = "modal-input";
      input.placeholder = "ex : 25";
      input.setAttribute("aria-label", message);

      const actions = document.createElement("div");
      actions.className = "modal-actions";

      const cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "btn btn-ghost";
      cancelBtn.textContent = cancelLabel;

      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "btn btn-primary";
      confirmBtn.textContent = confirmLabel;

      actions.appendChild(cancelBtn);
      actions.appendChild(confirmBtn);
      box.appendChild(titleEl);
      box.appendChild(messageEl);
      box.appendChild(input);
      box.appendChild(actions);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      function close(result) {
        overlay.removeEventListener("click", onOverlayClick);
        document.removeEventListener("keydown", onKeydown);
        overlay.remove();
        resolve(result);
      }

      function submit() {
        const value = Number(input.value);
        if (!input.value || Number.isNaN(value)) return;
        close(value);
      }

      function onOverlayClick(event) {
        if (event.target === overlay) close(null);
      }

      function onKeydown(event) {
        if (event.key === "Escape") close(null);
        if (event.key === "Enter") {
          event.preventDefault();
          submit();
        }
      }

      cancelBtn.addEventListener("click", () => close(null));
      confirmBtn.addEventListener("click", submit);
      overlay.addEventListener("click", onOverlayClick);
      document.addEventListener("keydown", onKeydown);

      input.focus();
    });
  }

  window.ToplaModal = { confirm: confirmModal, promptNumber: promptNumberModal };
})();
