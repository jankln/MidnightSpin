const config = {
  reels: 5,
  rows: 3,
  betLevels: [1, 2, 5, 10, 20, 50],
  startBalance: 100,
  reelSpinDuration: 650,
  reelStopDelay: 180,
  spinBuffer: 10,
  autoSpinDelay: 420,
  symbols: [
    { id: "ember", label: "EMBER", color: "#ff6b3d", weight: 14, payout: { 3: 4, 4: 8, 5: 16 } },
    { id: "moon", label: "MOON", color: "#c4c2ff", weight: 13, payout: { 3: 4, 4: 9, 5: 18 } },
    { id: "nova", label: "NOVA", color: "#ffd166", weight: 12, payout: { 3: 5, 4: 10, 5: 20 } },
    { id: "pulse", label: "PULSE", color: "#3dd3c6", weight: 11, payout: { 3: 6, 4: 12, 5: 24 } },
    { id: "orbit", label: "ORBIT", color: "#7dd56f", weight: 10, payout: { 3: 7, 4: 14, 5: 28 } },
    { id: "flare", label: "FLARE", color: "#ff9f1c", weight: 9, payout: { 3: 8, 4: 16, 5: 32 } },
    { id: "comet", label: "COMET", color: "#f48c9f", weight: 8, payout: { 3: 9, 4: 18, 5: 36 } },
    { id: "wild", label: "WILD", color: "#ffe066", weight: 3, payout: { 3: 12, 4: 30, 5: 90 }, wild: true }
  ]
};

const state = {
  balance: config.startBalance,
  betIndex: 0,
  soundEnabled: true,
  spinning: false,
  lastWin: 0,
  autoSpin: false
};

const dom = {
  reels: document.getElementById("reels"),
  balance: document.getElementById("balance"),
  bet: document.getElementById("bet"),
  lastWin: document.getElementById("lastWin"),
  spinBtn: document.getElementById("spinBtn"),
  autoSpinBtn: document.getElementById("autoSpinBtn"),
  betUp: document.getElementById("betUp"),
  betDown: document.getElementById("betDown"),
  soundToggle: document.getElementById("soundToggle"),
  winOverlay: document.getElementById("winOverlay"),
  toast: document.getElementById("toast"),
  paytableList: document.getElementById("paytableList"),
  resetBtn: document.getElementById("resetBtn")
};

const wildSymbol = config.symbols.find((symbol) => symbol.wild);
let toastTimeout = null;
let autoSpinTimer = null;

function randomFloat() {
  if (window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return array[0] / 0xffffffff;
  }
  return Math.random();
}

function weightedPick() {
  const total = config.symbols.reduce((sum, symbol) => sum + symbol.weight, 0);
  let roll = randomFloat() * total;
  for (const symbol of config.symbols) {
    roll -= symbol.weight;
    if (roll <= 0) {
      return symbol;
    }
  }
  return config.symbols[config.symbols.length - 1];
}

function loadState() {
  const storedBalance = Number(localStorage.getItem("balance"));
  const storedBet = Number(localStorage.getItem("bet"));
  const storedSound = localStorage.getItem("soundEnabled");

  if (!Number.isNaN(storedBalance) && storedBalance > 0) {
    state.balance = storedBalance;
  }

  if (!Number.isNaN(storedBet)) {
    const index = config.betLevels.indexOf(storedBet);
    if (index >= 0) {
      state.betIndex = index;
    }
  }

  if (storedSound !== null) {
    state.soundEnabled = storedSound === "true";
  }
}

function saveState() {
  localStorage.setItem("balance", String(state.balance));
  localStorage.setItem("bet", String(config.betLevels[state.betIndex]));
  localStorage.setItem("soundEnabled", String(state.soundEnabled));
}

function updateUI() {
  dom.balance.textContent = state.balance.toString();
  dom.bet.textContent = config.betLevels[state.betIndex].toString();
  dom.lastWin.textContent = state.lastWin.toString();
  dom.spinBtn.textContent = state.spinning ? "SPINNING" : "SPIN";
  dom.spinBtn.disabled = state.spinning;
  dom.betUp.disabled = state.spinning || state.autoSpin || state.betIndex >= config.betLevels.length - 1;
  dom.betDown.disabled = state.spinning || state.autoSpin || state.betIndex <= 0;
  dom.soundToggle.textContent = `Sound: ${state.soundEnabled ? "On" : "Off"}`;
  dom.autoSpinBtn.textContent = state.autoSpin ? "AUTO ON" : "AUTO OFF";
  dom.autoSpinBtn.classList.toggle("active", state.autoSpin);
}

function showToast(message) {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  dom.toast.textContent = message;
  dom.toast.classList.add("show");
  toastTimeout = setTimeout(() => {
    dom.toast.classList.remove("show");
  }, 1600);
}

function buildReels() {
  dom.reels.innerHTML = "";
  for (let i = 0; i < config.reels; i += 1) {
    const reel = document.createElement("div");
    reel.className = "reel";
    reel.dataset.reel = String(i);

    const windowEl = document.createElement("div");
    windowEl.className = "reel-window";

    const strip = document.createElement("div");
    strip.className = "reel-strip";

    windowEl.appendChild(strip);
    reel.appendChild(windowEl);
    dom.reels.appendChild(reel);

    const initialSymbols = Array.from({ length: config.rows }, () => weightedPick());
    renderFinalSymbols(strip, initialSymbols, i);
  }
}

function renderFinalSymbols(strip, symbols, reelIndex) {
  strip.style.transition = "none";
  strip.style.transform = "translateY(0px)";
  strip.innerHTML = "";
  symbols.forEach((symbol, rowIndex) => {
    strip.appendChild(createSymbol(symbol, reelIndex, rowIndex));
  });
}

function createSymbol(symbol, reelIndex, rowIndex) {
  const el = document.createElement("div");
  el.className = `symbol sym-${symbol.id}`;
  if (reelIndex !== null) {
    el.dataset.reel = String(reelIndex);
  }
  if (rowIndex !== null) {
    el.dataset.row = String(rowIndex);
  }
  const label = document.createElement("span");
  label.textContent = symbol.label;
  label.style.color = symbol.color;
  el.appendChild(label);
  return el;
}

function clearHighlights() {
  document.querySelectorAll(".symbol.win").forEach((el) => el.classList.remove("win"));
}

function highlightWin(indices) {
  indices.forEach((index) => {
    const symbol = document.querySelector(`.symbol[data-reel="${index}"][data-row="1"]`);
    if (symbol) {
      symbol.classList.add("win");
    }
  });
}

function spinReel(reelIndex, finalSymbols, duration) {
  return new Promise((resolve) => {
    const reel = document.querySelector(`.reel[data-reel="${reelIndex}"]`);
    const strip = reel.querySelector(".reel-strip");
    const symbolHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--symbol-h")) || 92;

    const bufferSymbols = Array.from({ length: config.spinBuffer }, () => weightedPick());
    strip.innerHTML = "";
    strip.style.transition = "none";
    strip.style.transform = "translateY(0px)";

    bufferSymbols.forEach((symbol) => {
      strip.appendChild(createSymbol(symbol, null, null));
    });

    finalSymbols.forEach((symbol, rowIndex) => {
      strip.appendChild(createSymbol(symbol, reelIndex, rowIndex));
    });

    requestAnimationFrame(() => {
      strip.style.transition = `transform ${duration}ms cubic-bezier(0.2, 0.6, 0.1, 1)`;
      strip.style.transform = `translateY(-${symbolHeight * config.spinBuffer}px)`;
    });

    strip.addEventListener(
      "transitionend",
      () => {
        renderFinalSymbols(strip, finalSymbols, reelIndex);
        reel.classList.remove("bounce");
        void reel.offsetWidth;
        reel.classList.add("bounce");
        resolve();
      },
      { once: true }
    );
  });
}

function evaluateWin(reelSymbols) {
  const middle = reelSymbols.map((reel) => reel[1]);
  let best = { amount: 0, count: 0, symbol: null };

  config.symbols.forEach((symbol) => {
    const targetId = symbol.id;
    const count = countMatches(middle, targetId);
    const payout = symbol.payout[count];
    if (count >= 3 && payout) {
      const amount = payout * config.betLevels[state.betIndex];
      if (amount > best.amount) {
        best = { amount, count, symbol: symbol.id };
      }
    }
  });

  const winningIndices = best.count >= 3 ? Array.from({ length: best.count }, (_, i) => i) : [];
  return { winAmount: best.amount, winningIndices };
}

function countMatches(middle, targetId) {
  let count = 0;
  for (let i = 0; i < middle.length; i += 1) {
    const symbol = middle[i];
    if (symbol.id === targetId || (wildSymbol && symbol.id === wildSymbol.id)) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

function showWin(amount) {
  dom.winOverlay.textContent = `WIN +${amount}`;
  dom.winOverlay.classList.add("show");
  setTimeout(() => {
    dom.winOverlay.classList.remove("show");
  }, 1400);
}

function scheduleAutoSpin() {
  if (!state.autoSpin) {
    return;
  }
  const bet = config.betLevels[state.betIndex];
  if (state.balance < bet) {
    state.autoSpin = false;
    showToast("Auto spin stopped - balance too low.");
    updateUI();
    return;
  }
  autoSpinTimer = setTimeout(() => {
    spin();
  }, config.autoSpinDelay);
}

function spin() {
  if (state.spinning) {
    return;
  }

  const bet = config.betLevels[state.betIndex];
  if (state.balance < bet) {
    showToast("Not enough balance.");
    if (state.autoSpin) {
      state.autoSpin = false;
      updateUI();
    }
    return;
  }

  state.spinning = true;
  state.balance -= bet;
  state.lastWin = 0;
  clearHighlights();
  updateUI();

  const finalSymbols = [];
  for (let i = 0; i < config.reels; i += 1) {
    finalSymbols.push(Array.from({ length: config.rows }, () => weightedPick()));
  }

  const spins = finalSymbols.map((symbols, index) => {
    const duration = config.reelSpinDuration + index * config.reelStopDelay;
    return spinReel(index, symbols, duration);
  });

  Promise.all(spins).then(() => {
    const result = evaluateWin(finalSymbols);
    if (result.winAmount > 0) {
      state.balance += result.winAmount;
      state.lastWin = result.winAmount;
      showWin(result.winAmount);
      highlightWin(result.winningIndices);
    }

    state.spinning = false;
    saveState();
    updateUI();
    scheduleAutoSpin();
  });
}

function changeBet(delta) {
  if (state.spinning || state.autoSpin) {
    return;
  }
  const next = state.betIndex + delta;
  if (next < 0 || next >= config.betLevels.length) {
    return;
  }
  state.betIndex = next;
  saveState();
  updateUI();
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  saveState();
  updateUI();
}

function toggleAutoSpin() {
  state.autoSpin = !state.autoSpin;
  if (!state.autoSpin && autoSpinTimer) {
    clearTimeout(autoSpinTimer);
    autoSpinTimer = null;
  }
  updateUI();
  if (state.autoSpin && !state.spinning) {
    scheduleAutoSpin();
  }
}

function resetGame() {
  localStorage.removeItem("balance");
  localStorage.removeItem("bet");
  localStorage.removeItem("soundEnabled");
  state.balance = config.startBalance;
  state.betIndex = 0;
  state.soundEnabled = true;
  state.lastWin = 0;
  state.autoSpin = false;
  if (autoSpinTimer) {
    clearTimeout(autoSpinTimer);
    autoSpinTimer = null;
  }
  updateUI();
}

function bindEvents() {
  dom.spinBtn.addEventListener("click", spin);
  dom.autoSpinBtn.addEventListener("click", toggleAutoSpin);
  dom.betUp.addEventListener("click", () => changeBet(1));
  dom.betDown.addEventListener("click", () => changeBet(-1));
  dom.soundToggle.addEventListener("click", toggleSound);
  dom.resetBtn.addEventListener("click", resetGame);

  document.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      spin();
      return;
    }

    if (event.key === "ArrowUp" || event.key === "+" || event.key === "=") {
      changeBet(1);
    }

    if (event.key === "ArrowDown" || event.key === "-") {
      changeBet(-1);
    }

    if (event.key === "m" || event.key === "M") {
      toggleSound();
    }

    if (event.key === "a" || event.key === "A") {
      toggleAutoSpin();
    }
  });
}

function renderPaytable() {
  dom.paytableList.innerHTML = "";
  config.symbols.forEach((symbol) => {
    const row = document.createElement("div");
    row.className = "pay-row";
    row.style.borderLeft = `4px solid ${symbol.color}`;

    const label = document.createElement("div");
    label.textContent = symbol.label;

    const payouts = document.createElement("span");
    payouts.textContent = `3:${symbol.payout[3]} 4:${symbol.payout[4]} 5:${symbol.payout[5]}`;

    row.appendChild(label);
    row.appendChild(payouts);
    dom.paytableList.appendChild(row);
  });
}

loadState();
renderPaytable();
buildReels();
bindEvents();
updateUI();
