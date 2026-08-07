(() => {
  "use strict";

  const ROTATION = { pile: 0, face: 180 };

  let tapZone, coinInner;
  let curY = 0;
  let isFlipping = false;

  function flip() {
    if (isFlipping) return;
    isFlipping = true;

    const result = Math.random() < 0.5 ? "pile" : "face";
    const spins = 3 + Math.floor(Math.random() * 2);
    const nextY = Math.round(curY / 360) * 360 + 360 * spins + ROTATION[result];

    coinInner.style.transform = `rotateY(${nextY}deg)`;
    curY = nextY;

    setTimeout(() => {
      isFlipping = false;
    }, 700);
  }

  function init() {
    tapZone = document.getElementById("pile-face-tap-zone");
    coinInner = document.getElementById("coin-inner");
    if (!tapZone) return;

    tapZone.addEventListener("click", flip);
  }

  window.ToplaTools = window.ToplaTools || {};
  window.ToplaTools["pile-face"] = { init };
})();
