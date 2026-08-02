(() => {
  "use strict";

  const MIN_DICE = 1;
  const MAX_DICE = 6;
  const SHAKE_THRESHOLD = 16; // m/s², seuil de variation d'accélération
  const SHAKE_COOLDOWN_MS = 1000;
  const ROLL_ANIMATION_MS = 700;

  // Chaque face physique du cube porte une valeur fixe ; on tourne le cube
  // pour amener la face voulue devant la caméra plutôt que de repeindre les faces.
  const FACE_VALUES = { front: 1, back: 6, right: 3, left: 4, top: 5, bottom: 2 };
  const FACE_ROTATION = {
    1: { x: 0, y: 0 },
    6: { x: 0, y: 180 },
    3: { x: 0, y: -90 },
    4: { x: 0, y: 90 },
    5: { x: -90, y: 0 },
    2: { x: 90, y: 0 },
  };
  const REST_TILT = { x: -18, y: 24 };

  const PIPS = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
    6: [[30, 25], [70, 25], [30, 50], [70, 50], [30, 75], [70, 75]],
  };

  let countMinus, countPlus, countValue, permissionBtn, tray, totalEl, hintEl, screenDes;
  let bound = false;

  let diceCount = 1;
  let dice = []; // { inner: HTMLElement, curX: number, curY: number, value: number }
  let isRolling = false;
  let lastShakeTime = 0;
  let prevAcceleration = null;

  function buildFace(role) {
    const face = document.createElement("div");
    face.className = "die3d-face face-" + role;
    PIPS[FACE_VALUES[role]].forEach(([x, y]) => {
      const pip = document.createElement("span");
      pip.className = "pip";
      pip.style.left = x + "%";
      pip.style.top = y + "%";
      face.appendChild(pip);
    });
    return face;
  }

  function buildDie() {
    const die = document.createElement("div");
    die.className = "die3d";

    const inner = document.createElement("div");
    inner.className = "die3d-inner";
    inner.style.transform = `rotateX(${REST_TILT.x}deg) rotateY(${REST_TILT.y}deg)`;
    ["front", "back", "right", "left", "top", "bottom"].forEach((role) => {
      inner.appendChild(buildFace(role));
    });

    die.appendChild(inner);
    return { die, inner, curX: REST_TILT.x, curY: REST_TILT.y, value: 1 };
  }

  function renderTray() {
    tray.innerHTML = "";
    dice = Array.from({ length: diceCount }, () => buildDie());
    dice.forEach((d) => tray.appendChild(d.die));
  }

  function updateTotal() {
    if (diceCount > 1) {
      const sum = dice.reduce((a, d) => a + d.value, 0);
      totalEl.textContent = "Total : " + sum;
      totalEl.hidden = false;
    } else {
      totalEl.hidden = true;
    }
  }

  function spinDieTo(d, value) {
    const base = FACE_ROTATION[value];
    const spins = 2 + Math.floor(Math.random() * 2);
    const signX = Math.random() < 0.5 ? -1 : 1;
    const signY = Math.random() < 0.5 ? -1 : 1;

    const nextX = Math.round(d.curX / 360) * 360 + 360 * spins * signX + base.x;
    const nextY = Math.round(d.curY / 360) * 360 + 360 * spins * signY + base.y;

    d.inner.style.transform = `rotateX(${nextX}deg) rotateY(${nextY}deg)`;
    d.curX = nextX;
    d.curY = nextY;
    d.value = value;
  }

  function roll() {
    if (isRolling || dice.length === 0) return;
    isRolling = true;

    dice.forEach((d) => spinDieTo(d, 1 + Math.floor(Math.random() * 6)));
    updateTotal();

    setTimeout(() => {
      isRolling = false;
    }, ROLL_ANIMATION_MS);
  }

  function changeDiceCount(delta) {
    const next = diceCount + delta;
    if (next < MIN_DICE || next > MAX_DICE) return;
    diceCount = next;
    countValue.textContent = String(diceCount);
    renderTray();
    updateTotal();
  }

  function isDesScreenActive() {
    return screenDes && screenDes.classList.contains("is-active");
  }

  function bindShakeListener() {
    window.addEventListener("devicemotion", (event) => {
      if (!isDesScreenActive()) return;
      const acc = event.acceleration && event.acceleration.x !== null
        ? event.acceleration
        : event.accelerationIncludingGravity;
      if (!acc) return;

      const magnitude = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);

      if (prevAcceleration !== null) {
        const delta = Math.abs(magnitude - prevAcceleration);
        const now = Date.now();
        if (delta > SHAKE_THRESHOLD && !isRolling && now - lastShakeTime > SHAKE_COOLDOWN_MS) {
          lastShakeTime = now;
          roll();
        }
      }
      prevAcceleration = magnitude;
    });
  }

  function setupMotion() {
    const hasDeviceMotion = typeof DeviceMotionEvent !== "undefined";
    const needsPermission = hasDeviceMotion && typeof DeviceMotionEvent.requestPermission === "function";

    if (needsPermission) {
      permissionBtn.hidden = false;
      permissionBtn.addEventListener("click", () => {
        DeviceMotionEvent.requestPermission()
          .then((result) => {
            if (result === "granted") {
              bindShakeListener();
              permissionBtn.hidden = true;
            } else {
              hintEl.textContent = "Secousse refusée : touchez les dés pour lancer.";
              permissionBtn.hidden = true;
            }
          })
          .catch(() => {
            hintEl.textContent = "Secousse indisponible : touchez les dés pour lancer.";
            permissionBtn.hidden = true;
          });
      });
      return;
    }

    if (hasDeviceMotion) {
      bindShakeListener();
    }
    // Sans DeviceMotion (desktop, capteur absent) : le tap reste toujours disponible.
  }

  function init() {
    if (bound) return;
    countMinus = document.getElementById("des-count-minus");
    countPlus = document.getElementById("des-count-plus");
    countValue = document.getElementById("des-count-value");
    permissionBtn = document.getElementById("des-permission-btn");
    tray = document.getElementById("des-tray");
    totalEl = document.getElementById("des-total");
    hintEl = document.getElementById("des-hint");
    screenDes = document.getElementById("screen-des");
    if (!tray) return;

    renderTray();

    countMinus.addEventListener("click", () => changeDiceCount(-1));
    countPlus.addEventListener("click", () => changeDiceCount(1));
    tray.addEventListener("click", roll);

    setupMotion();

    bound = true;
  }

  window.ToplaTools = window.ToplaTools || {};
  window.ToplaTools.des = { init };
})();
