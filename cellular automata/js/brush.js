"use strict";

  /* ============================================================
     BRUSH — which lifecycle stage of the active team it paints
     ============================================================ */

  function updateBrushSwatches() {
    brushColorLabel.textContent = `Team ${state.activeTeam + 1}`;
    const team = activeTeam();
    brushSwatchesEl.innerHTML = "";

    const eraser = document.createElement("button");
    eraser.type = "button";
    eraser.className = "brush-swatch";
    eraser.dataset.stage = "0";
    eraser.textContent = "∅";
    eraser.title = "Eraser";
    brushSwatchesEl.appendChild(eraser);

    for (let stage = 1; stage <= team.numStates - 1; stage++) {
      const sw = document.createElement("button");
      sw.type = "button";
      sw.className = "brush-swatch";
      sw.dataset.stage = String(stage);
      sw.style.background = team.color;
      sw.style.opacity = String(Math.max(0.2, stateAlpha(brushValueForStage(state.activeTeam, stage))));
      sw.title = stage === 1 ? "Alive" : `Decay stage ${stage}`;
      brushSwatchesEl.appendChild(sw);
    }

    if (state.brush.stage > team.numStates - 1) state.brush.stage = 1;
    syncBrushSwatchSelection();
  }

  function syncBrushSwatchSelection() {
    brushSwatchesEl.querySelectorAll(".brush-swatch").forEach((btn) => {
      btn.classList.toggle("is-active", Number(btn.dataset.stage) === state.brush.stage);
    });
  }

  brushSwatchesEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".brush-swatch");
    if (!btn) return;
    state.brush.stage = Number(btn.dataset.stage);
    syncBrushSwatchSelection();
  });

  brushSizeInput.addEventListener("input", () => {
    state.brush.size = Number(brushSizeInput.value);
    const d = state.brush.size * 2 + 1;
    brushSizeValue.textContent = state.brush.size === 0 ? "1×1" : `~${d}×${d}`;
  });

