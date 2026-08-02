(() => {
  "use strict";

  const STORAGE_KEY = "topla-score";
  const LONG_PRESS_MS = 600;

  const GRIP_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>';
  const RESET_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>';
  const TRASH_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>';
  const MANAGE_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5H3" /><path d="M12 19H3" /><path d="M14 3v4" /><path d="M16 17v4" /><path d="M21 12h-9" /><path d="M21 19h-5" /><path d="M21 5h-7" /><path d="M8 10v4" /><path d="M8 12H3" /></svg>';
  const CHECK_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>';

  let form, nameInput, listEl, resetBtn, manageBtn;
  let bound = false;
  let players = []; // { id, name, score }
  let nextId = 1;
  let isManaging = false;
  let draggingId = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.players)) {
        players = parsed.players;
        nextId = players.reduce((max, p) => Math.max(max, p.id + 1), 1);
      }
    } catch (e) {
      /* localStorage indisponible ou corrompu : on repart d'un état vide */
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ players }));
    } catch (e) {
      /* quota dépassé ou stockage désactivé : on continue sans persister */
    }
  }

  function changeScore(player, delta) {
    player.score += delta;
    save();
    render();
  }

  function resetOnePlayer(player) {
    player.score = 0;
    save();
    render();
  }

  function removePlayer(id) {
    players = players.filter((p) => p.id !== id);
    save();
    render();
  }

  function addPlayer(event) {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    players.push({ id: nextId++, name, score: 0 });
    nameInput.value = "";
    save();
    render();
  }

  function resetScores() {
    if (players.length === 0) return;
    const confirmed = window.confirm("Réinitialiser tous les scores à 0 ?");
    if (!confirmed) return;
    players.forEach((p) => (p.score = 0));
    save();
    render();
  }

  function toggleManage() {
    isManaging = !isManaging;
    render();
  }

  function computeRanks() {
    const ranks = new Map();
    const sorted = players.slice().sort((a, b) => b.score - a.score);
    let rank = 0;
    let prevScore = null;
    sorted.forEach((player, index) => {
      if (player.score !== prevScore) {
        rank = index + 1;
        prevScore = player.score;
      }
      ranks.set(player.id, rank);
    });
    return ranks;
  }

  function formatRank(rank) {
    return rank === 1 ? "1er" : rank + "e";
  }

  function attachLongPress(button, onLongPress, onShortPress) {
    let timer = null;
    let triggered = false;

    button.addEventListener("pointerdown", () => {
      triggered = false;
      timer = setTimeout(() => {
        triggered = true;
        onLongPress();
      }, LONG_PRESS_MS);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach((evt) =>
      button.addEventListener(evt, () => clearTimeout(timer))
    );

    button.addEventListener("click", () => {
      if (triggered) {
        triggered = false;
        return;
      }
      onShortPress();
    });
  }

  function attachDragHandle(handle, player) {
    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      draggingId = player.id;
      render();

      function onMove(moveEvent) {
        const target = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        const overCard = target && target.closest(".score-card");
        if (!overCard) return;
        const overId = Number(overCard.dataset.id);
        const fromIndex = players.findIndex((p) => p.id === draggingId);
        const overIndex = players.findIndex((p) => p.id === overId);
        if (fromIndex === -1 || overIndex === -1 || fromIndex === overIndex) return;
        const [moved] = players.splice(fromIndex, 1);
        players.splice(overIndex, 0, moved);
        render();
      }

      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        draggingId = null;
        save();
        render();
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    });
  }

  function renderManageCard(card, player) {
    const handle = document.createElement("button");
    handle.type = "button";
    handle.className = "score-drag-handle";
    handle.innerHTML = GRIP_ICON_SVG;
    handle.setAttribute("aria-label", "Réordonner " + player.name);
    attachDragHandle(handle, player);

    const main = document.createElement("div");
    main.className = "score-card-main is-compact";
    const nameEl = document.createElement("span");
    nameEl.className = "score-card-name";
    nameEl.textContent = player.name;
    const subEl = document.createElement("span");
    subEl.className = "score-card-sub";
    subEl.textContent = "Score : " + player.score;
    main.appendChild(nameEl);
    main.appendChild(subEl);

    const actions = document.createElement("div");
    actions.className = "score-manage-actions";

    const resetBtnEl = document.createElement("button");
    resetBtnEl.type = "button";
    resetBtnEl.className = "score-icon-btn reset";
    resetBtnEl.innerHTML = RESET_ICON_SVG;
    resetBtnEl.setAttribute("aria-label", "Réinitialiser le score de " + player.name);
    resetBtnEl.addEventListener("click", () => resetOnePlayer(player));

    const deleteBtnEl = document.createElement("button");
    deleteBtnEl.type = "button";
    deleteBtnEl.className = "score-icon-btn delete";
    deleteBtnEl.innerHTML = TRASH_ICON_SVG;
    deleteBtnEl.setAttribute("aria-label", "Retirer " + player.name);
    deleteBtnEl.addEventListener("click", () => removePlayer(player.id));

    actions.appendChild(resetBtnEl);
    actions.appendChild(deleteBtnEl);

    card.appendChild(handle);
    card.appendChild(main);
    card.appendChild(actions);
  }

  function renderPlayCard(card, player) {
    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "score-btn minus";
    minusBtn.textContent = "−";
    minusBtn.setAttribute("aria-label", "Retirer un point à " + player.name);
    minusBtn.addEventListener("click", () => changeScore(player, -1));

    const main = document.createElement("div");
    main.className = "score-card-main";
    const nameEl = document.createElement("span");
    nameEl.className = "score-card-name";
    nameEl.textContent = player.name;
    const valueEl = document.createElement("span");
    valueEl.className = "score-card-value";
    valueEl.textContent = String(player.score);
    main.appendChild(nameEl);
    main.appendChild(valueEl);

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "score-btn plus";
    plusBtn.textContent = "+";
    plusBtn.setAttribute("aria-label", "Ajouter un point à " + player.name + " (appui long : +5)");
    attachLongPress(
      plusBtn,
      () => changeScore(player, 5),
      () => changeScore(player, 1)
    );

    card.appendChild(minusBtn);
    card.appendChild(main);
    card.appendChild(plusBtn);
  }

  function render() {
    listEl.innerHTML = "";
    const maxScore = players.reduce((max, p) => Math.max(max, p.score), 0);
    const ranks = maxScore > 0 ? computeRanks() : null;

    players.forEach((player) => {
      const card = document.createElement("div");
      card.className = "score-card";
      card.dataset.id = String(player.id);

      const rank = ranks ? ranks.get(player.id) : null;
      if (rank) {
        if (rank === 1) card.classList.add("is-leader");
        const badge = document.createElement("span");
        badge.className = "score-rank-badge" + (rank <= 3 ? " rank-" + rank : "");
        badge.textContent = formatRank(rank);
        card.appendChild(badge);
      }

      if (player.id === draggingId) card.classList.add("is-dragging");

      if (isManaging) {
        renderManageCard(card, player);
      } else {
        renderPlayCard(card, player);
      }

      listEl.appendChild(card);
    });

    manageBtn.classList.toggle("is-selected", isManaging);
    manageBtn.innerHTML = isManaging
      ? CHECK_ICON_SVG + "Terminer la gestion"
      : MANAGE_ICON_SVG + "Gérer les joueurs";
  }

  function onShow() {
    render();
  }

  function init() {
    if (bound) return;
    form = document.getElementById("score-add-form");
    nameInput = document.getElementById("score-name-input");
    listEl = document.getElementById("score-list");
    resetBtn = document.getElementById("score-reset-btn");
    manageBtn = document.getElementById("score-manage-btn");
    if (!form) return;

    load();
    render();

    form.addEventListener("submit", addPlayer);
    resetBtn.addEventListener("click", resetScores);
    manageBtn.addEventListener("click", toggleManage);

    bound = true;
  }

  window.ToplaTools = window.ToplaTools || {};
  window.ToplaTools.score = { init, onShow };
})();
