(() => {
  "use strict";

  const MIN_DICE = 1;
  const MAX_DICE = 6;
  const SHAKE_THRESHOLD = 16; // m/s², seuil de variation d'accélération
  const SHAKE_COOLDOWN_MS = 1000;
  const ROLL_ANIMATION_MS = 700;
  const SCATTER_MARGIN = 4; // px, marge de sécurité gardée dans la zone du dé
  const SCATTER_ROTATE = 18; // deg, inclinaison max du dé posé
  const DIE_SIZE_MAX = 72; // px
  const DIE_SIZE_MIN = 40; // px
  const ZONE_PADDING = 16; // px, réservés par zone pour le débattement du scatter

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

  // Même palette multicolore que les pips de l'icône de l'app (icons/icon-*.png).
  const PIP_COLORS = ["var(--teal)", "var(--violet)", "var(--corail)", "var(--rose)", "var(--bleu)", "var(--jaune)"];

  let countMinus, countPlus, countValue, permissionBtn, tray, totalEl, hintEl;

  let diceCount = 1;
  let dice = []; // { inner: HTMLElement, curX: number, curY: number, value: number }
  let isRolling = false;
  let lastShakeTime = 0;
  let prevAcceleration = null;

  function buildFace(role) {
    const face = document.createElement("div");
    face.className = "die3d-face face-" + role;
    PIPS[FACE_VALUES[role]].forEach(([x, y], i) => {
      const pip = document.createElement("span");
      pip.className = "pip";
      pip.style.left = x + "%";
      pip.style.top = y + "%";
      pip.style.background = PIP_COLORS[i % PIP_COLORS.length];
      face.appendChild(pip);
    });
    return face;
  }

  function buildDie() {
    const zone = document.createElement("div");
    zone.className = "die3d-zone";

    const die = document.createElement("div");
    die.className = "die3d";

    const inner = document.createElement("div");
    inner.className = "die3d-inner";
    inner.style.transform = `rotateX(${REST_TILT.x}deg) rotateY(${REST_TILT.y}deg)`;
    ["front", "back", "right", "left", "top", "bottom"].forEach((role) => {
      inner.appendChild(buildFace(role));
    });

    die.appendChild(inner);
    zone.appendChild(die);
    return { zone, die, inner, curX: REST_TILT.x, curY: REST_TILT.y, value: 1 };
  }

  function updateDieSizing() {
    const available = tray.clientWidth / diceCount - ZONE_PADDING;
    const size = Math.max(DIE_SIZE_MIN, Math.min(DIE_SIZE_MAX, available));
    tray.style.setProperty("--die-size", size + "px");
    tray.style.setProperty("--die-half", size / 2 + "px");
  }

  function renderTray() {
    tray.innerHTML = "";
    dice = Array.from({ length: diceCount }, () => buildDie());
    dice.forEach((d) => tray.appendChild(d.zone));
    updateDieSizing();
  }

  function updateTotal() {
    if (diceCount > 1) {
      const sum = dice.reduce((a, d) => a + d.value, 0);
      totalEl.textContent = window.ToplaI18n.des.total + sum;
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

  function scatterDie(d) {
    const zoneRect = d.zone.getBoundingClientRect();
    const dieSize = d.die.offsetWidth;
    const maxX = Math.max(0, (zoneRect.width - dieSize) / 2 - SCATTER_MARGIN);
    const maxY = Math.max(0, (zoneRect.height - dieSize) / 2 - SCATTER_MARGIN);

    const tx = (Math.random() * 2 - 1) * maxX;
    const ty = (Math.random() * 2 - 1) * maxY;
    const rot = (Math.random() * 2 - 1) * SCATTER_ROTATE;
    d.die.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
  }

  function roll() {
    if (isRolling || dice.length === 0) return;
    isRolling = true;

    dice.forEach((d) => {
      spinDieTo(d, 1 + Math.floor(Math.random() * 6));
      scatterDie(d);
    });
    updateTotal();

    setTimeout(() => {
      isRolling = false;
      // curX/curY grow by 360°+ on every roll ; sur beaucoup de lancers l'angle
      // devient énorme et perd en précision côté GPU (le dé "disparaît" par
      // moments). On les ramène à l'équivalent dans [0, 360) sans transition
      // visible : rotateX(4680deg) et rotateX(4680 % 360)deg rendent pareil.
      dice.forEach((d) => {
        const normX = ((d.curX % 360) + 360) % 360;
        const normY = ((d.curY % 360) + 360) % 360;
        d.curX = normX;
        d.curY = normY;
        d.inner.style.transition = "none";
        d.inner.style.transform = `rotateX(${normX}deg) rotateY(${normY}deg)`;
        d.inner.offsetHeight;
        d.inner.style.transition = "";
      });
    }, ROLL_ANIMATION_MS);
  }

  function updateCountButtons() {
    countMinus.disabled = diceCount <= MIN_DICE;
    countPlus.disabled = diceCount >= MAX_DICE;
  }

  function changeDiceCount(delta) {
    const next = diceCount + delta;
    if (next < MIN_DICE || next > MAX_DICE) return;
    diceCount = next;
    countValue.textContent = String(diceCount);
    updateCountButtons();
    renderTray();
    updateTotal();
  }

  function isDesScreenActive() {
    return tray && document.body.contains(tray);
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
              hintEl.textContent = window.ToplaI18n.des.shakeRefused;
              permissionBtn.hidden = true;
            }
          })
          .catch(() => {
            hintEl.textContent = window.ToplaI18n.des.shakeUnavailable;
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
    countMinus = document.getElementById("des-count-minus");
    countPlus = document.getElementById("des-count-plus");
    countValue = document.getElementById("des-count-value");
    permissionBtn = document.getElementById("des-permission-btn");
    tray = document.getElementById("des-tray");
    totalEl = document.getElementById("des-total");
    hintEl = document.getElementById("des-hint");
    if (!tray) return false;

    renderTray();
    updateCountButtons();

    countMinus.addEventListener("click", () => changeDiceCount(-1));
    countPlus.addEventListener("click", () => changeDiceCount(1));
    tray.addEventListener("click", roll);
    window.addEventListener("resize", () => {
      if (isDesScreenActive()) updateDieSizing();
    });

    setupMotion();

    return true;
  }

  function onShow() {
    updateDieSizing();
  }

  window.ToplaTools = window.ToplaTools || {};
  window.ToplaTools.des = { init, onShow };
})();
