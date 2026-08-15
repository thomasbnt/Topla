(() => {
  "use strict";

  const STORAGE_KEY = "topla-score";
  const CUSTOM_STEP_STORAGE_KEY = "topla-score-custom-step";
  const MIN_CUSTOM_STEP = -99;
  const MAX_CUSTOM_STEP = 99;
  const DEFAULT_CUSTOM_STEP = 3;
  const T = window.ToplaI18n.score;

  const GRIP_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></svg>';
  const RESET_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>';
  const TRASH_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>';
  const SETTINGS_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" /></svg>';
  const CHECK_ICON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>';

  let form, nameInput, listEl, resetBtn, manageBtn, settingsRow, stepMinusBtn, stepPlusBtn, stepValueEl;
  let players = []; // { id, name, score }
  let nextId = 1;
  let isManaging = false;
  let draggingId = null;
  let customStep = DEFAULT_CUSTOM_STEP;

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

  function loadCustomStep() {
    const raw = parseInt(localStorage.getItem(CUSTOM_STEP_STORAGE_KEY), 10);
    customStep = Number.isFinite(raw) && raw >= MIN_CUSTOM_STEP && raw <= MAX_CUSTOM_STEP ? raw : DEFAULT_CUSTOM_STEP;
  }

  function saveCustomStep() {
    try {
      localStorage.setItem(CUSTOM_STEP_STORAGE_KEY, String(customStep));
    } catch (e) {
      /* quota dépassé ou stockage désactivé : on continue sans persister */
    }
  }

  function updateCustomStepDisplay() {
    stepValueEl.textContent = (customStep >= 0 ? "+" : "") + customStep;
    stepMinusBtn.disabled = customStep <= MIN_CUSTOM_STEP;
    stepPlusBtn.disabled = customStep >= MAX_CUSTOM_STEP;
  }

  function setCustomStep(value) {
    customStep = Math.min(MAX_CUSTOM_STEP, Math.max(MIN_CUSTOM_STEP, value));
    saveCustomStep();
    updateCustomStepDisplay();
    render();
  }

  function changeCustomStep(delta) {
    const next = customStep + delta;
    if (next < MIN_CUSTOM_STEP || next > MAX_CUSTOM_STEP) return;
    setCustomStep(next);
  }

  async function promptCustomStep() {
    const value = await window.ToplaModal.promptNumber({
      title: T.customStepPromptTitle,
      message: T.customStepPromptMessage,
      confirmLabel: T.customStepPromptConfirm,
      cancelLabel: window.ToplaI18n.common.cancel,
    });
    if (value === null) return;
    setCustomStep(value);
  }

  function changeScore(player, delta) {
    player.score += delta;
    save();
    render();
  }

  async function promptCustomScore(player) {
    const amount = await window.ToplaModal.promptNumber({
      title: player.name,
      message: T.pointsPrompt,
      confirmLabel: T.promptAddLabel,
      cancelLabel: window.ToplaI18n.common.cancel,
    });
    if (amount === null || amount === 0) return;
    changeScore(player, amount);
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

  async function resetScores() {
    if (players.length === 0) return;
    const confirmed = await window.ToplaModal.confirm({
      title: T.resetConfirmTitle,
      message: T.resetConfirmMessage,
      confirmLabel: T.resetConfirmLabel,
      cancelLabel: window.ToplaI18n.common.cancel,
      danger: true,
    });
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

  const EN_ORDINAL_SUFFIXES = { 1: "st", 2: "nd", 3: "rd" };

  function formatRank(rank) {
    if (window.ToplaLang === "en") {
      const suffix = rank % 100 >= 11 && rank % 100 <= 13 ? "th" : EN_ORDINAL_SUFFIXES[rank % 10] || "th";
      return rank + suffix;
    }
    return rank === 1 ? T.rankFirst : rank + T.rankOtherSuffix;
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
    handle.setAttribute("aria-label", T.reorder + player.name);
    attachDragHandle(handle, player);

    const main = document.createElement("div");
    main.className = "score-card-main is-compact";
    const nameEl = document.createElement("span");
    nameEl.className = "score-card-name";
    nameEl.textContent = player.name;
    const subEl = document.createElement("span");
    subEl.className = "score-card-sub";
    subEl.textContent = T.scoreLabel + player.score;
    main.appendChild(nameEl);
    main.appendChild(subEl);

    const actions = document.createElement("div");
    actions.className = "score-manage-actions";

    const resetBtnEl = document.createElement("button");
    resetBtnEl.type = "button";
    resetBtnEl.className = "score-icon-btn reset";
    resetBtnEl.innerHTML = RESET_ICON_SVG;
    resetBtnEl.setAttribute("aria-label", T.resetOne + player.name);
    resetBtnEl.addEventListener("click", () => resetOnePlayer(player));

    const deleteBtnEl = document.createElement("button");
    deleteBtnEl.type = "button";
    deleteBtnEl.className = "score-icon-btn delete";
    deleteBtnEl.innerHTML = TRASH_ICON_SVG;
    deleteBtnEl.setAttribute("aria-label", T.remove + player.name);
    deleteBtnEl.addEventListener("click", () => removePlayer(player.id));

    actions.appendChild(resetBtnEl);
    actions.appendChild(deleteBtnEl);

    card.appendChild(handle);
    card.appendChild(main);
    card.appendChild(actions);
  }

  function createQuickBtn(player, amount) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "score-quick-btn" + (amount < 0 ? " is-negative" : "");
    btn.textContent = (amount >= 0 ? "+" : "") + amount;
    const verb = amount >= 0 ? T.add : T.remove;
    const plural = Math.abs(amount) > 1 ? T.pointPlural : T.pointSingular;
    btn.setAttribute("aria-label", verb + Math.abs(amount) + plural + T.toLabel + player.name);
    btn.addEventListener("click", () => changeScore(player, amount));
    return btn;
  }

  function renderPlayCard(card, player) {
    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "score-btn minus";
    minusBtn.textContent = "−";
    minusBtn.setAttribute("aria-label", T.remove + "1" + T.pointSingular + T.toLabel + player.name);
    minusBtn.addEventListener("click", () => changeScore(player, -1));

    const main = document.createElement("div");
    main.className = "score-card-main";
    const nameEl = document.createElement("span");
    nameEl.className = "score-card-name";
    nameEl.textContent = player.name;
    const valueEl = document.createElement("button");
    valueEl.type = "button";
    valueEl.className = "score-card-value";
    valueEl.textContent = String(player.score);
    valueEl.setAttribute("aria-label", T.addPointsTo + player.name);
    valueEl.addEventListener("click", () => promptCustomScore(player));
    main.appendChild(nameEl);
    main.appendChild(valueEl);

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "score-btn plus";
    plusBtn.textContent = "+";
    plusBtn.setAttribute("aria-label", T.add + "1" + T.pointSingular + T.toLabel + player.name);
    plusBtn.addEventListener("click", () => changeScore(player, 1));

    const quickRow = document.createElement("div");
    quickRow.className = "score-quick-row";
    quickRow.appendChild(createQuickBtn(player, 5));
    quickRow.appendChild(createQuickBtn(player, 10));
    quickRow.appendChild(createQuickBtn(player, customStep));

    card.appendChild(minusBtn);
    card.appendChild(main);
    card.appendChild(plusBtn);
    card.appendChild(quickRow);
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

    settingsRow.hidden = !isManaging;

    manageBtn.classList.toggle("is-selected", isManaging);
    manageBtn.innerHTML = isManaging
      ? CHECK_ICON_SVG + T.doneBtnLabel
      : SETTINGS_ICON_SVG + T.manageBtnLabel;
  }

  function onShow() {
    render();
  }

  function init() {
    form = document.getElementById("score-add-form");
    nameInput = document.getElementById("score-name-input");
    listEl = document.getElementById("score-list");
    resetBtn = document.getElementById("score-reset-btn");
    manageBtn = document.getElementById("score-manage-btn");
    settingsRow = document.getElementById("score-settings-row");
    stepMinusBtn = document.getElementById("score-step-minus");
    stepPlusBtn = document.getElementById("score-step-plus");
    stepValueEl = document.getElementById("score-step-value");
    if (!form) return false;

    load();
    loadCustomStep();
    updateCustomStepDisplay();
    render();

    form.addEventListener("submit", addPlayer);
    resetBtn.addEventListener("click", resetScores);
    manageBtn.addEventListener("click", toggleManage);
    stepMinusBtn.addEventListener("click", () => changeCustomStep(-1));
    stepPlusBtn.addEventListener("click", () => changeCustomStep(1));
    stepValueEl.addEventListener("click", promptCustomStep);

    return true;
  }

  window.ToplaTools = window.ToplaTools || {};
  window.ToplaTools.score = { init, onShow };
})();
