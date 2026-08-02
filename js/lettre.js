(() => {
  "use strict";

  const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  let tapZone, display, historyEl;
  let lastLetter = null;
  let history = [];
  let bound = false;

  function renderHistory() {
    historyEl.innerHTML = "";
    history.forEach((letter) => {
      const chip = document.createElement("span");
      chip.className = "draw-history-chip";
      chip.textContent = letter;
      historyEl.appendChild(chip);
    });
  }

  function drawLetter() {
    let letter;
    do {
      letter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    } while (letter === lastLetter && ALPHABET.length > 1);
    lastLetter = letter;

    display.textContent = letter;

    display.classList.remove("is-popping");
    void display.offsetWidth; // force reflow pour rejouer l'animation
    display.classList.add("is-popping");

    history.unshift(letter);
    renderHistory();
  }

  function init() {
    if (bound) return;
    tapZone = document.getElementById("lettre-tap-zone");
    display = document.getElementById("lettre-display");
    historyEl = document.getElementById("lettre-history");
    if (!tapZone) return;

    tapZone.addEventListener("click", drawLetter);
    bound = true;
  }

  window.ToplaTools = window.ToplaTools || {};
  window.ToplaTools.lettre = { init };
})();
