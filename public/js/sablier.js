(() => {
  "use strict";

  const CIRCUMFERENCE = 2 * Math.PI * 90;
  const T = window.ToplaI18n.sablier;

  let presetsRow, manualForm, minInput, secInput, ringProgress, timeEl, hintEl;
  let startBtn, pauseBtn, resumeBtn, resetBtn, stopOverlay;

  let totalSeconds = 0;
  let remainingSeconds = 0;
  let intervalId = null;
  let audioCtx = null;

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function updateDisplay() {
    timeEl.textContent = formatTime(Math.max(0, remainingSeconds));
    const ratio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
    ringProgress.style.strokeDashoffset = String(CIRCUMFERENCE * (1 - ratio));
  }

  function showControls({ start, pause, resume }) {
    startBtn.hidden = !start;
    pauseBtn.hidden = !pause;
    resumeBtn.hidden = !resume;
  }

  function setDuration(seconds) {
    stopInterval();
    totalSeconds = seconds;
    remainingSeconds = seconds;
    hintEl.textContent = "";
    ringProgress.classList.remove("is-flash");
    stopOverlay.hidden = true;
    updateDisplay();
    showControls({ start: true, pause: false, resume: false });
  }

  function stopInterval() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function unlockAudio() {
    if (audioCtx) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioCtx = new AudioContextClass();
  }

  function playBeep() {
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.6);
  }

  function dismissStop() {
    stopOverlay.hidden = true;
  }

  function onFinish() {
    stopInterval();
    hintEl.textContent = T.timeUp;
    ringProgress.classList.add("is-flash");
    showControls({ start: true, pause: false, resume: false });
    stopOverlay.hidden = false;

    if (navigator.vibrate) {
      try {
        navigator.vibrate([250, 120, 250, 120, 250]);
      } catch (e) {
        /* vibration indisponible : silencieux */
      }
    }

    playBeep();
  }

  function tick() {
    remainingSeconds -= 1;
    updateDisplay();
    if (remainingSeconds <= 0) {
      onFinish();
    }
  }

  function start() {
    if (remainingSeconds <= 0) {
      hintEl.textContent = T.chooseDuration;
      return;
    }
    unlockAudio();
    ringProgress.classList.remove("is-flash");
    hintEl.textContent = "";
    stopInterval();
    intervalId = setInterval(tick, 1000);
    showControls({ start: false, pause: true, resume: false });
  }

  function pause() {
    stopInterval();
    showControls({ start: false, pause: false, resume: true });
  }

  function resume() {
    if (remainingSeconds <= 0) return;
    intervalId = setInterval(tick, 1000);
    showControls({ start: false, pause: true, resume: false });
  }

  function reset() {
    stopInterval();
    remainingSeconds = totalSeconds;
    hintEl.textContent = "";
    ringProgress.classList.remove("is-flash");
    stopOverlay.hidden = true;
    updateDisplay();
    showControls({ start: true, pause: false, resume: false });
  }

  function onPresetClick(event) {
    const btn = event.target.closest("[data-seconds]");
    if (!btn) return;
    setDuration(Number(btn.dataset.seconds));
  }

  function onManualSubmit(event) {
    event.preventDefault();
    const minutes = Math.min(59, Math.max(0, Number(minInput.value) || 0));
    const seconds = Math.min(59, Math.max(0, Number(secInput.value) || 0));
    const total = minutes * 60 + seconds;
    if (total <= 0) return;
    setDuration(total);
    minInput.value = "";
    secInput.value = "";
  }

  function init() {
    presetsRow = document.getElementById("sablier-presets");
    manualForm = document.getElementById("sablier-manual-form");
    minInput = document.getElementById("sablier-min-input");
    secInput = document.getElementById("sablier-sec-input");
    ringProgress = document.getElementById("sablier-ring-progress");
    timeEl = document.getElementById("sablier-time");
    hintEl = document.getElementById("sablier-status");
    startBtn = document.getElementById("sablier-start-btn");
    pauseBtn = document.getElementById("sablier-pause-btn");
    resumeBtn = document.getElementById("sablier-resume-btn");
    resetBtn = document.getElementById("sablier-reset-btn");
    stopOverlay = document.getElementById("sablier-stop-overlay");
    if (!presetsRow) return;

    ringProgress.style.strokeDasharray = String(CIRCUMFERENCE);
    updateDisplay();

    presetsRow.addEventListener("click", onPresetClick);
    manualForm.addEventListener("submit", onManualSubmit);
    startBtn.addEventListener("click", start);
    pauseBtn.addEventListener("click", pause);
    resumeBtn.addEventListener("click", resume);
    resetBtn.addEventListener("click", reset);
    stopOverlay.addEventListener("click", dismissStop);

  }

  window.ToplaTools = window.ToplaTools || {};
  window.ToplaTools.sablier = { init };
})();
