const config = {
  reels: 5,
  rows: 3,
  betLevels: [1, 2, 5, 10, 20, 50],
  startBalance: 100,
  reelSpinDuration: 650,
  reelStopDelay: 240,
  spinBuffer: 10,
  autoSpinDelay: 420,
  wildSpinBonus: 260,
  reelStartGap: 220,
  freeSpinAward: 10,
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
  autoSpin: false,
  freeSpins: 0
};

const dom = {
  reels: document.getElementById("reels"),
  balance: document.getElementById("balance"),
  bet: document.getElementById("bet"),
  lastWin: document.getElementById("lastWin"),
  freeSpins: document.getElementById("freeSpins"),
  spinBtn: document.getElementById("spinBtn"),
  autoSpinBtn: document.getElementById("autoSpinBtn"),
  betUp: document.getElementById("betUp"),
  betDown: document.getElementById("betDown"),
  soundToggle: document.getElementById("soundToggle"),
  winOverlay: document.getElementById("winOverlay"),
  freeSpinOverlay: document.getElementById("freeSpinOverlay"),
  freeSpinCount: document.getElementById("freeSpinCount"),
  toast: document.getElementById("toast"),
  paytableList: document.getElementById("paytableList"),
  resetBtn: document.getElementById("resetBtn")
};

const wildSymbol = config.symbols.find((symbol) => symbol.wild);
let toastTimeout = null;
let autoSpinTimer = null;
let audioCtx = null;

function getAudioContext() {
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) {
    return null;
  }
  if (!audioCtx) {
    audioCtx = new Context();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function playWinSound(amount) {
  if (!state.soundEnabled) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  const base = 220 + Math.min(amount, 200) * 0.6;
  const notes = [1, 1.25, 1.5, 2];
  notes.forEach((ratio, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = base * ratio;
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    const start = now + index * 0.08;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.07, start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    osc.start(start);
    osc.stop(start + 0.18);
  });
}

function playSpinSound() {
  if (!state.soundEnabled) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  const duration = 1.9;

  const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.setValueAtTime(420, now);
  noiseFilter.frequency.exponentialRampToValueAtTime(920, now + duration);

  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0001, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.08, now + 0.2);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  const whirr = ctx.createOscillator();
  whirr.type = "sawtooth";
  whirr.frequency.setValueAtTime(140, now);
  whirr.frequency.exponentialRampToValueAtTime(520, now + duration);

  const whirrGain = ctx.createGain();
  whirrGain.gain.setValueAtTime(0.0001, now);
  whirrGain.gain.exponentialRampToValueAtTime(0.05, now + 0.15);
  whirrGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
  whirr.connect(whirrGain).connect(ctx.destination);

  noise.start(now);
  noise.stop(now + duration);
  whirr.start(now);
  whirr.stop(now + duration);
}

function playWildSound() {
  if (!state.soundEnabled) {
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(520, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.4);
}

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
  dom.freeSpins.textContent = state.freeSpins.toString();
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
  document.querySelectorAll(".symbol.wild-hit").forEach((el) => el.classList.remove("wild-hit"));
}

function highlightWin(indices) {
  indices.forEach((index) => {
    const symbol = document.querySelector(`.symbol[data-reel="${index}"][data-row="1"]`);
    if (symbol) {
      symbol.classList.add("win");
    }
  });
}

function highlightVerticalWins(reelIndices) {
  reelIndices.forEach((reelIndex) => {
    for (let row = 0; row < config.rows; row += 1) {
      const symbol = document.querySelector(`.symbol[data-reel="${reelIndex}"][data-row="${row}"]`);
      if (symbol) {
        symbol.classList.add("win");
      }
    }
  });
}

function highlightDiagonalWins(positions) {
  positions.forEach((pos) => {
    const symbol = document.querySelector(`.symbol[data-reel="${pos.reel}"][data-row="${pos.row}"]`);
    if (symbol) {
      symbol.classList.add("win");
    }
  });
}

function highlightWilds(reelSymbols) {
  reelSymbols.forEach((reel, reelIndex) => {
    reel.forEach((symbol, rowIndex) => {
      if (symbol.id === wildSymbol.id) {
        const el = document.querySelector(`.symbol[data-reel="${reelIndex}"][data-row="${rowIndex}"]`);
        if (el) {
          el.classList.add("wild-hit");
        }
      }
    });
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

  let verticalWin = 0;
  const verticalReels = [];
  reelSymbols.forEach((reel, reelIndex) => {
    const firstId = reel[0].id;
    const allMatch = reel.every((symbol) => symbol.id === firstId);
    if (allMatch) {
      const symbol = config.symbols.find((entry) => entry.id === firstId);
      if (symbol && symbol.payout[3]) {
        verticalWin += symbol.payout[3] * config.betLevels[state.betIndex];
        verticalReels.push(reelIndex);
      }
    }
  });

  const diagonalLines = [
    [
      { reel: 0, row: 0 },
      { reel: 1, row: 1 },
      { reel: 2, row: 2 },
      { reel: 3, row: 1 },
      { reel: 4, row: 0 }
    ],
    [
      { reel: 0, row: 2 },
      { reel: 1, row: 1 },
      { reel: 2, row: 0 },
      { reel: 3, row: 1 },
      { reel: 4, row: 2 }
    ]
  ];

  let diagonalWin = 0;
  const diagonalPositions = [];
  diagonalLines.forEach((line) => {
    const lineSymbols = line.map((pos) => reelSymbols[pos.reel][pos.row]);
    let bestLine = { amount: 0, count: 0 };
    config.symbols.forEach((symbol) => {
      const count = countMatchesLine(lineSymbols, symbol.id);
      const payout = symbol.payout[count];
      if (count >= 3 && payout) {
        const amount = payout * config.betLevels[state.betIndex];
        if (amount > bestLine.amount) {
          bestLine = { amount, count };
        }
      }
    });
    if (bestLine.count >= 3) {
      diagonalWin += bestLine.amount;
      diagonalPositions.push(...line.slice(0, bestLine.count));
    }
  });

  return {
    winAmount: best.amount + verticalWin + diagonalWin,
    winningIndices,
    verticalReels,
    diagonalPositions
  };
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

function countMatchesLine(lineSymbols, targetId) {
  let count = 0;
  for (let i = 0; i < lineSymbols.length; i += 1) {
    const symbol = lineSymbols[i];
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

function showFreeSpinPopup(amount) {
  if (!dom.freeSpinOverlay || !dom.freeSpinCount) {
    return;
  }
  dom.freeSpinCount.textContent = `+${amount}`;
  dom.freeSpinOverlay.classList.add("show");
  setTimeout(() => {
    dom.freeSpinOverlay.classList.remove("show");
  }, 1400);
}

function scheduleAutoSpin() {
  if (!state.autoSpin) {
    return;
  }
  const bet = config.betLevels[state.betIndex];
  if (state.balance < bet && state.freeSpins === 0) {
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
  const useFreeSpin = state.freeSpins > 0;
  if (!useFreeSpin && state.balance < bet) {
    showToast("Not enough balance.");
    if (state.autoSpin) {
      state.autoSpin = false;
      updateUI();
    }
    return;
  }

  state.spinning = true;
  if (!useFreeSpin) {
    state.balance -= bet;
  }
  state.lastWin = 0;
  clearHighlights();
  updateUI();
  playSpinSound();

  const finalSymbols = [];
  for (let i = 0; i < config.reels; i += 1) {
    finalSymbols.push(Array.from({ length: config.rows }, () => weightedPick()));
  }

  const wildCount = finalSymbols.reduce(
    (count, reel) => count + reel.filter((symbol) => symbol.id === wildSymbol.id).length,
    0
  );
  if (wildCount >= 3) {
    state.freeSpins += config.freeSpinAward;
    showFreeSpinPopup(config.freeSpinAward);
    showToast(`+${config.freeSpinAward} Free Spins`);
  }

  const spins = finalSymbols.map((symbols, index) => {
    const duration = config.reelSpinDuration + index * config.reelStopDelay + (wildCount > 0 ? config.wildSpinBonus : 0);
    const startDelay = index * config.reelStartGap;
    return new Promise((resolve) => {
      setTimeout(() => {
        spinReel(index, symbols, duration).then(resolve);
      }, startDelay);
    });
  });

  Promise.all(spins).then(() => {
    const result = evaluateWin(finalSymbols);
    if (result.winAmount > 0) {
      state.balance += result.winAmount;
      state.lastWin = result.winAmount;
      showWin(result.winAmount);
      playWinSound(result.winAmount);
      highlightWin(result.winningIndices);
      highlightVerticalWins(result.verticalReels);
      highlightDiagonalWins(result.diagonalPositions);
    }

    if (wildCount > 0) {
      highlightWilds(finalSymbols);
      playWildSound();
    }

    if (useFreeSpin) {
      state.freeSpins = Math.max(0, state.freeSpins - 1);
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
  state.freeSpins = 0;
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
