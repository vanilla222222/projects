"use strict";

  /* ============================================================
     NOISE / APPEARANCE
     ============================================================ */

  function setNoiseChance(v) {
    state.noise = Math.round(Math.max(0, v) * 10) / 10;
    noiseInput.value = state.noise;
  }

  noiseInput.addEventListener("input", () => setNoiseChance(Number(noiseInput.value) || 0));
  noiseInput.addEventListener("change", () => {
    setNoiseChance(Number(noiseInput.value) || 0);
    addMarkerAll(`Noise ${state.noise}% (${state.noiseMode})`);
  });
  noiseDec.addEventListener("click", () => setNoiseChance(state.noise - 0.1));
  noiseInc.addEventListener("click", () => setNoiseChance(state.noise + 0.1));

  noiseModeEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".segmented-btn");
    if (!btn) return;
    state.noiseMode = btn.dataset.mode;
    noiseModeEl.querySelectorAll(".segmented-btn").forEach((b) => {
      const active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-checked", String(active));
    });
    addMarkerAll(`Noise mode: ${state.noiseMode}`);
  });

  showGridInput.addEventListener("change", () => {
    state.showGrid = showGridInput.checked;
    render();
  });

