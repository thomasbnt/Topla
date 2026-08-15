(() => {
  "use strict";

  const HINT_IDLE = "Posez plusieurs doigts sur l'écran, puis lancez le compte à rebours";
  const HINT_COUNTDOWN = "Gardez vos doigts posés...";
  const HINT_SELECTING = "La roulette tourne...";
  const HINT_NO_FINGER = "Aucun doigt détecté. Réessayez !";
  const HINT_WINNER = "Doigt gagnant désigné !";

  let surface, hint, countdownEl, startBtn, resetBtn;

  /** @type {Map<number, {el: HTMLElement}>} */
  let activePointers = new Map();
  let countdownTimer = null;
  let isTrackingLive = false;
  let dimOverlay = null;
  let dimTimer = null;

  function clearDimOverlay() {
    clearTimeout(dimTimer);
    if (dimOverlay) {
      dimOverlay.remove();
      dimOverlay = null;
    }
  }

  function showDimOverlay() {
    clearDimOverlay();
    const rect = surface.getBoundingClientRect();
    dimOverlay = document.createElement("div");
    dimOverlay.className = "roulette-dim-overlay";
    dimOverlay.style.top = rect.top + "px";
    dimOverlay.style.left = rect.left + "px";
    dimOverlay.style.width = rect.width + "px";
    dimOverlay.style.height = rect.height + "px";
    document.body.appendChild(dimOverlay);
    requestAnimationFrame(() => dimOverlay.classList.add("is-active"));
    dimTimer = setTimeout(clearDimOverlay, 5000);
  }

  function surfacePoint(event) {
    const rect = surface.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event) {
    if (!isTrackingLive) return;
    event.preventDefault();
    surface.setPointerCapture(event.pointerId);

    const dot = document.createElement("div");
    dot.className = "finger-dot";
    const point = surfacePoint(event);
    dot.style.left = point.x + "px";
    dot.style.top = point.y + "px";
    surface.appendChild(dot);

    activePointers.set(event.pointerId, { el: dot });
  }

  function onPointerMove(event) {
    if (!isTrackingLive) return;
    const entry = activePointers.get(event.pointerId);
    if (!entry) return;
    const point = surfacePoint(event);
    entry.el.style.left = point.x + "px";
    entry.el.style.top = point.y + "px";
  }

  function onPointerUp(event) {
    if (!isTrackingLive) return;
    const entry = activePointers.get(event.pointerId);
    if (!entry) return;
    entry.el.remove();
    activePointers.delete(event.pointerId);
  }

  function bindPointerTracking() {
    isTrackingLive = true;
    surface.addEventListener("pointerdown", onPointerDown);
    surface.addEventListener("pointermove", onPointerMove);
    surface.addEventListener("pointerup", onPointerUp);
    surface.addEventListener("pointercancel", onPointerUp);
  }

  function unbindPointerTracking() {
    isTrackingLive = false;
    surface.removeEventListener("pointerdown", onPointerDown);
    surface.removeEventListener("pointermove", onPointerMove);
    surface.removeEventListener("pointerup", onPointerUp);
    surface.removeEventListener("pointercancel", onPointerUp);
  }

  function clearDots() {
    activePointers.forEach((entry) => entry.el.remove());
    activePointers.clear();
  }

  function resetAll() {
    clearInterval(countdownTimer);
    unbindPointerTracking();
    clearDots();
    clearDimOverlay();
    countdownEl.hidden = true;
    hint.textContent = HINT_IDLE;
    startBtn.hidden = false;
    startBtn.disabled = false;
    resetBtn.hidden = true;
  }

  function startCountdown() {
    startBtn.disabled = true;
    hint.textContent = HINT_COUNTDOWN;
    clearDots();
    countdownEl.hidden = false;

    let n = 3;
    countdownEl.textContent = String(n);
    bindPointerTracking();

    countdownTimer = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(countdownTimer);
        countdownEl.hidden = true;
        finalizeSnapshot();
      } else {
        countdownEl.textContent = String(n);
      }
    }, 800);
  }

  function finalizeSnapshot() {
    unbindPointerTracking();
    const dots = Array.from(activePointers.values());

    if (dots.length === 0) {
      hint.textContent = HINT_NO_FINGER;
      startBtn.hidden = false;
      startBtn.disabled = false;
      resetBtn.hidden = false;
      return;
    }

    hint.textContent = HINT_SELECTING;
    startBtn.hidden = true;
    resetBtn.hidden = true;
    runSelection(dots);
  }

  function runSelection(dots) {
    const winnerIndex = Math.floor(Math.random() * dots.length);
    const totalDuration = 4000;
    const totalTicks = Math.max(dots.length * 4, 18);

    const weights = [];
    for (let i = 0; i < totalTicks; i++) weights.push(Math.pow(i + 1, 1.6));
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const delays = weights.map((w) => (w / weightSum) * totalDuration);

    const sequence = [];
    for (let i = 0; i < totalTicks; i++) sequence.push(i % dots.length);
    sequence[totalTicks - 1] = winnerIndex;

    let tick = 0;

    function step() {
      if (tick > 0) dots[sequence[tick - 1]].el.classList.remove("is-highlighted");
      dots[sequence[tick]].el.classList.add("is-highlighted");

      if (tick === totalTicks - 1) {
        finishSelection(dots, winnerIndex);
        return;
      }
      const currentTick = tick;
      tick += 1;
      setTimeout(step, delays[currentTick]);
    }

    step();
  }

  function finishSelection(dots, winnerIndex) {
    dots.forEach((dot, i) => {
      dot.el.classList.remove("is-highlighted");
      if (i === winnerIndex) {
        dot.el.classList.add("is-winner");
      } else {
        dot.el.classList.add("is-loser");
      }
    });
    hint.textContent = HINT_WINNER;
    resetBtn.hidden = false;
    showDimOverlay();
  }

  function onShow() {
    resetAll();
  }

  function init() {
    surface = document.getElementById("roulette-surface");
    hint = document.getElementById("roulette-hint");
    countdownEl = document.getElementById("roulette-countdown");
    startBtn = document.getElementById("roulette-start-btn");
    resetBtn = document.getElementById("roulette-reset-btn");
    if (!surface) return false;

    startBtn.addEventListener("click", startCountdown);
    resetBtn.addEventListener("click", resetAll);
    return true;
  }

  window.ToplaTools = window.ToplaTools || {};
  window.ToplaTools.roulette = { init, onShow };
})();
