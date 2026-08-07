(() => {
  "use strict";

  const STORAGE_KEY = "topla-equipes";
  const TEAM_COLORS = ["#FF6B4A", "#1FA2A6", "#8B5CF6", "#FFC542", "#3EAE71", "#D64545", "#E85D9C", "#3E7BFA", "#FF9F43"];
  const MIN_TEAMS = 2;
  const MAX_TEAMS = 12;
  const COUNTDOWN_SECONDS = 5;
  const CYCLE_DURATION_MS = 2200;
  const REVEAL_HOLD_MS = 1800;
  const T = window.ToplaI18n.equipes;

  let form, nameInput, chipList, clearBtn, minusBtn, plusBtn, countValue, generateBtn, errorEl, resultEl;
  let normalView, fingerBtn, fingerDetect, fingerHint, fingerCountdown, fingerSurface, fingerCountLabel, fingerConfirmBtn;

  let state = { players: [], numTeams: MIN_TEAMS, lastResult: null };

  /** @type {Map<number, HTMLElement>} */
  let fingerPointers = new Map();
  let fingerPhase = "placing"; // placing | countdown | cycling | revealed
  let countdownTimer = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.players)) state.players = parsed.players;
      if (Number.isInteger(parsed.numTeams)) state.numTeams = parsed.numTeams;
      if (Array.isArray(parsed.lastResult)) state.lastResult = parsed.lastResult;
    } catch (e) {
      /* localStorage indisponible ou corrompu : on repart d'un état vide */
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* quota dépassé ou stockage désactivé : on continue sans persister */
    }
  }

  function renderChips() {
    chipList.innerHTML = "";
    state.players.forEach((name, index) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      const label = document.createElement("span");
      label.textContent = name;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "×";
      removeBtn.setAttribute("aria-label", T.remove + name);
      removeBtn.addEventListener("click", () => {
        state.players.splice(index, 1);
        save();
        renderChips();
      });
      chip.appendChild(label);
      chip.appendChild(removeBtn);
      chipList.appendChild(chip);
    });
    clearBtn.hidden = state.players.length === 0;
  }

  async function clearPlayers() {
    const confirmed = await window.ToplaModal.confirm({
      title: T.confirmClearTitle,
      message: T.confirmClearMessage,
      confirmLabel: T.confirmClearLabel,
      cancelLabel: window.ToplaI18n.common.cancel,
      danger: true,
    });
    if (!confirmed) return;
    state.players = [];
    save();
    renderChips();
    showError("");
  }

  function renderCount() {
    countValue.textContent = String(state.numTeams);
  }

  function renderResult() {
    resultEl.innerHTML = "";
    if (!state.lastResult) return;
    state.lastResult.forEach((team, index) => {
      const card = document.createElement("div");
      card.className = "team-card";
      card.style.background = TEAM_COLORS[index % TEAM_COLORS.length];

      const title = document.createElement("h3");
      title.textContent = T.team + (index + 1);
      card.appendChild(title);

      const ul = document.createElement("ul");
      team.forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        ul.appendChild(li);
      });
      card.appendChild(ul);

      resultEl.appendChild(card);
    });
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  function addPlayer(event) {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;
    state.players.push(name);
    nameInput.value = "";
    save();
    renderChips();
    showError("");
  }

  function changeTeamCount(delta) {
    const next = state.numTeams + delta;
    if (next < MIN_TEAMS || next > MAX_TEAMS) return;
    state.numTeams = next;
    save();
    renderCount();
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function generateTeams() {
    if (state.players.length === 0) {
      showError(T.addAtLeastOnePlayer);
      return;
    }
    if (state.players.length < state.numTeams) {
      showError(T.addAtLeastAsManyPlayers);
      return;
    }

    showError("");
    const shuffled = shuffle(state.players);
    const teams = Array.from({ length: state.numTeams }, () => []);
    shuffled.forEach((name, i) => {
      teams[i % state.numTeams].push(name);
    });

    state.lastResult = teams;
    save();
    renderResult();
  }

  // ---------- Détection via doigts ----------

  function updateFingerCount() {
    const n = fingerPointers.size;
    fingerCountLabel.textContent = n + (n <= 1 ? T.playerSingular : T.playerPlural);
  }

  function fingerPoint(event) {
    const rect = fingerSurface.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onFingerDown(event) {
    event.preventDefault();
    fingerSurface.setPointerCapture(event.pointerId);
    const dot = document.createElement("div");
    dot.className = "finger-dot";
    const point = fingerPoint(event);
    dot.style.left = point.x + "px";
    dot.style.top = point.y + "px";
    fingerSurface.appendChild(dot);
    fingerPointers.set(event.pointerId, dot);
    updateFingerCount();
  }

  function onFingerMove(event) {
    const dot = fingerPointers.get(event.pointerId);
    if (!dot) return;
    const point = fingerPoint(event);
    dot.style.left = point.x + "px";
    dot.style.top = point.y + "px";
  }

  function onFingerUp(event) {
    const dot = fingerPointers.get(event.pointerId);
    if (!dot) return;
    dot.remove();
    fingerPointers.delete(event.pointerId);
    updateFingerCount();
  }

  function bindFingerTracking() {
    fingerSurface.addEventListener("pointerdown", onFingerDown);
    fingerSurface.addEventListener("pointermove", onFingerMove);
    fingerSurface.addEventListener("pointerup", onFingerUp);
    fingerSurface.addEventListener("pointercancel", onFingerUp);
  }

  function unbindFingerTracking() {
    fingerSurface.removeEventListener("pointerdown", onFingerDown);
    fingerSurface.removeEventListener("pointermove", onFingerMove);
    fingerSurface.removeEventListener("pointerup", onFingerUp);
    fingerSurface.removeEventListener("pointercancel", onFingerUp);
  }

  function openFingerDetect() {
    fingerPhase = "placing";
    clearInterval(countdownTimer);
    unbindFingerTracking();
    normalView.hidden = true;
    fingerDetect.hidden = false;
    fingerHint.textContent = T.fingerStartHint;
    fingerCountdown.hidden = true;
    fingerCountLabel.hidden = true;
    fingerConfirmBtn.hidden = false;
    fingerConfirmBtn.disabled = false;
    fingerConfirmBtn.textContent = T.fingerConfirmLabel;
    fingerSurface.innerHTML = "";
    fingerPointers.clear();
  }

  function closeFingerDetect() {
    fingerPhase = "placing";
    clearInterval(countdownTimer);
    unbindFingerTracking();
    fingerSurface.innerHTML = "";
    fingerPointers.clear();
    fingerDetect.hidden = true;
    normalView.hidden = false;
  }

  function startCountdown() {
    if (fingerPhase !== "placing") return;
    fingerPhase = "countdown";
    fingerConfirmBtn.hidden = true;
    fingerHint.textContent = T.fingerPlacingHint;
    fingerCountdown.hidden = false;
    fingerSurface.innerHTML = "";
    fingerPointers.clear();
    fingerCountLabel.hidden = false;
    updateFingerCount();
    bindFingerTracking();

    let n = COUNTDOWN_SECONDS;
    fingerCountdown.textContent = String(n);

    countdownTimer = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(countdownTimer);
        fingerCountdown.hidden = true;
        finalizeCountdown();
      } else {
        fingerCountdown.textContent = String(n);
      }
    }, 1000);
  }

  function finalizeCountdown() {
    unbindFingerTracking();
    const dots = Array.from(fingerPointers.values());

    if (dots.length < state.numTeams) {
      fingerPhase = "placing";
      fingerHint.textContent = T.fingerNotEnoughPrefix + state.numTeams + T.fingerNotEnoughSuffix;
      fingerCountLabel.hidden = true;
      fingerConfirmBtn.hidden = false;
      fingerConfirmBtn.disabled = false;
      return;
    }

    fingerPhase = "cycling";
    fingerCountLabel.hidden = true;
    fingerHint.textContent = T.fingerSpinning;
    runFingerRoulette(dots);
  }

  function runFingerRoulette(dots) {
    const totalTicks = Math.max(dots.length * 3, 14);
    const weights = Array.from({ length: totalTicks }, (_, i) => Math.pow(i + 1, 1.5));
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const delays = weights.map((w) => (w / weightSum) * CYCLE_DURATION_MS);

    let tick = 0;

    function step() {
      dots.forEach((dot) => dot.classList.remove("is-highlighted"));
      dots[tick % dots.length].classList.add("is-highlighted");

      if (tick === totalTicks - 1) {
        setTimeout(() => {
          dots.forEach((dot) => dot.classList.remove("is-highlighted"));
          revealTeams(dots);
        }, delays[tick]);
        return;
      }
      const currentTick = tick;
      tick += 1;
      setTimeout(step, delays[currentTick]);
    }

    step();
  }

  function revealTeams(dots) {
    const shuffled = shuffle(dots);
    const teams = Array.from({ length: state.numTeams }, () => []);

    shuffled.forEach((dot, i) => {
      const teamIndex = i % state.numTeams;
      teams[teamIndex].push(dot);
      dot.style.background = TEAM_COLORS[teamIndex % TEAM_COLORS.length];
      dot.textContent = String(teamIndex + 1);
      dot.classList.add("is-revealed");
    });

    const startNum = state.players.length + 1;
    let counter = 0;
    const namedTeams = teams.map((teamDots) =>
      teamDots.map(() => T.playerNumbered + (startNum + counter++))
    );
    namedTeams.forEach((names) => names.forEach((name) => state.players.push(name)));

    state.lastResult = namedTeams;
    save();
    renderChips();
    renderResult();
    showError("");

    fingerPhase = "revealed";
    fingerHint.textContent = T.fingerDone;

    setTimeout(closeFingerDetect, REVEAL_HOLD_MS);
  }

  function onShow() {
    closeFingerDetect();
    renderChips();
    renderCount();
    renderResult();
  }

  function init() {
    form = document.getElementById("equipes-add-form");
    nameInput = document.getElementById("equipes-name-input");
    chipList = document.getElementById("equipes-chip-list");
    clearBtn = document.getElementById("equipes-clear-btn");
    minusBtn = document.getElementById("equipes-count-minus");
    plusBtn = document.getElementById("equipes-count-plus");
    countValue = document.getElementById("equipes-count-value");
    generateBtn = document.getElementById("equipes-generate-btn");
    errorEl = document.getElementById("equipes-error");
    resultEl = document.getElementById("equipes-result");
    normalView = document.getElementById("equipes-normal-view");
    fingerBtn = document.getElementById("equipes-finger-btn");
    fingerDetect = document.getElementById("equipes-finger-detect");
    fingerHint = document.getElementById("equipes-finger-hint");
    fingerCountdown = document.getElementById("equipes-finger-countdown");
    fingerSurface = document.getElementById("equipes-finger-surface");
    fingerCountLabel = document.getElementById("equipes-finger-count");
    fingerConfirmBtn = document.getElementById("equipes-finger-confirm");
    if (!form) return false;

    load();
    renderChips();
    renderCount();
    renderResult();

    form.addEventListener("submit", addPlayer);
    clearBtn.addEventListener("click", clearPlayers);
    minusBtn.addEventListener("click", () => changeTeamCount(-1));
    plusBtn.addEventListener("click", () => changeTeamCount(1));
    generateBtn.addEventListener("click", generateTeams);
    fingerBtn.addEventListener("click", openFingerDetect);
    fingerConfirmBtn.addEventListener("click", startCountdown);

    return true;
  }

  window.ToplaTools = window.ToplaTools || {};
  window.ToplaTools.equipes = { init, onShow };
})();
