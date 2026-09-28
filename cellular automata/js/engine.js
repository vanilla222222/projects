"use strict";

  /* ============================================================
     PLAY LOOP
     ============================================================ */

  let lastTick = 0;
  let rafId = null;

  function loop(timestamp) {
    if (!state.running) return;
    const interval = 1000 / state.genPerSec;
    if (timestamp - lastTick >= interval) {
      lastTick = timestamp;
      step();
      render();
    }
    rafId = requestAnimationFrame(loop);
  }

  function togglePlay() {
    state.running = !state.running;
    btnPlay.setAttribute("aria-pressed", String(state.running));
    iconPlay.hidden = state.running;
    iconPause.hidden = !state.running;
    playLabel.textContent = state.running ? "Pause" : "Run";
    if (state.running) {
      lastTick = 0;
      rafId = requestAnimationFrame(loop);
    } else if (rafId) {
      cancelAnimationFrame(rafId);
    }
  }

  btnPlay.addEventListener("click", togglePlay);

  btnStep.addEventListener("click", () => {
    if (state.running) togglePlay();
    step();
    render();
  });

  btnRandom.addEventListener("click", () => {
    if (state.running) togglePlay();
    randomize();
  });

  btnClear.addEventListener("click", () => {
    if (state.running) togglePlay();
    clearGrid();
  });

  function setSpeed(v) {
    state.genPerSec = Math.max(1, Math.round(v) || 1);
    speedInput.value = state.genPerSec;
  }

  speedInput.addEventListener("input", () => setSpeed(Number(speedInput.value)));
  speedInput.addEventListener("change", () => setSpeed(Number(speedInput.value)));
  speedDec.addEventListener("click", () => setSpeed(state.genPerSec - 1));
  speedInc.addEventListener("click", () => setSpeed(state.genPerSec + 1));

