(() => {
  "use strict";

  let tapZone, display;
  let lastDigit = null;

  function drawDigit() {
    let digit;
    do {
      digit = Math.floor(Math.random() * 10);
    } while (digit === lastDigit);
    lastDigit = digit;

    display.textContent = String(digit);

    display.classList.remove("is-popping");
    void display.offsetWidth; // force reflow pour rejouer l'animation
    display.classList.add("is-popping");
  }

  function init() {
    tapZone = document.getElementById("chiffre-tap-zone");
    display = document.getElementById("chiffre-display");
    if (!tapZone) return;

    tapZone.addEventListener("click", drawDigit);
  }

  window.ToplaTools = window.ToplaTools || {};
  window.ToplaTools.chiffre = { init };
})();
