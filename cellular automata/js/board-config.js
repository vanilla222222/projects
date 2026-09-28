"use strict";

  /* ============================================================
     BOARD SIZE / BOUNDARY / SHAPE / NEIGHBORHOOD
     ============================================================ */

  function resizeBoard(newCols, newRows, markerLabel) {
    newCols = clamp(newCols, 4, BOARD_MAX);
    newRows = clamp(newRows, 4, BOARD_MAX);

    const oldGrid = grid;
    const oldCols = state.cols;
    const oldRows = state.rows;

    state.cols = newCols;
    state.rows = newRows;
    colsInput.value = newCols;
    rowsInput.value = newRows;

    allocateGrids();

    const copyCols = Math.min(oldCols, newCols);
    const copyRows = Math.min(oldRows, newRows);
    for (let y = 0; y < copyRows; y++) {
      for (let x = 0; x < copyCols; x++) {
        grid[idx(x, y)] = oldGrid[y * oldCols + x];
      }
    }

    selectedCells.clear();
    updateStampSaveRowVisibility();

    state.generation = 0;
    resetStabilityTracking();
    const pops = populationByTeam();
    pops.forEach((p, t) => { if (charts[t]) charts[t].resetHistory(markerLabel, p); });
    if (globalChart) globalChart.resetHistory(markerLabel, pops.reduce((a, b) => a + b, 0));
    updateStats();
    fitCanvas();
  }

  btnResize.addEventListener("click", () => {
    const newCols = clamp(Number(colsInput.value) || state.cols, 4, BOARD_MAX);
    const newRows = clamp(Number(rowsInput.value) || state.rows, 4, BOARD_MAX);
    resizeBoard(newCols, newRows, `Board ${newCols}×${newRows}`);
  });

  function setBoundary(wrap) {
    state.wrap = wrap;
    btnFinite.classList.toggle("is-active", !wrap);
    btnFinite.setAttribute("aria-checked", String(!wrap));
    btnWrap.classList.toggle("is-active", wrap);
    btnWrap.setAttribute("aria-checked", String(wrap));
    boundaryHint.textContent = wrap
      ? "Cells beyond the edge reappear on the opposite side (torus topology)."
      : "Cells beyond the edge are permanently dead.";
    addMarkerAll(wrap ? "Wraparound" : "Finite boundary");
  }

  btnFinite.addEventListener("click", () => setBoundary(false));
  btnWrap.addEventListener("click", () => setBoundary(true));

  function setNeighborhood(mode) {
    state.neighborhood = mode;
    const isVN = mode === "vonneumann";
    btnMoore.classList.toggle("is-active", !isVN);
    btnMoore.setAttribute("aria-checked", String(!isVN));
    btnVN.classList.toggle("is-active", isVN);
    btnVN.setAttribute("aria-checked", String(isVN));
    neighborhoodHint.textContent = isVN
      ? "Only the 4 orthogonal neighbors count — no diagonals. Max neighbor count is 4."
      : "All 8 surrounding cells count — diagonals included. Max neighbor count is 8.";
    updateMatrixReachability();
    addMarkerAll(isVN ? "Von Neumann" : "Moore neighborhood");
  }

  btnMoore.addEventListener("click", () => setNeighborhood("moore"));
  btnVN.addEventListener("click", () => setNeighborhood("vonneumann"));

  function setGridShape(shape) {
    state.gridShape = shape;
    btnSquare.classList.toggle("is-active", shape === "square");
    btnSquare.setAttribute("aria-checked", String(shape === "square"));
    btnHex.classList.toggle("is-active", shape === "hex");
    btnHex.setAttribute("aria-checked", String(shape === "hex"));
    btnTri.classList.toggle("is-active", shape === "tri");
    btnTri.setAttribute("aria-checked", String(shape === "tri"));
    neighborhoodBlock.classList.toggle("is-disabled", shape !== "square");
    updateMatrixReachability();
    updateRendererAvailability();
    selectedCells.clear();
    if (armedStamp && armedStamp.gridShape !== shape) { armedStamp = null; setTool("paint"); }
    updateStampSaveRowVisibility();
    renderStampList();
    fitCanvas();
    addMarkerAll(shape === "hex" ? "Hex grid" : shape === "tri" ? "Triangular grid" : "Square grid");
  }

  btnSquare.addEventListener("click", () => setGridShape("square"));
  btnHex.addEventListener("click", () => setGridShape("hex"));
  btnTri.addEventListener("click", () => setGridShape("tri"));

  function setUpdateScheme(scheme) {
    state.updateScheme = scheme;
    const isMargolus = scheme === "margolus";
    updateSchemeEl.querySelectorAll(".segmented-btn").forEach((btn) => {
      const active = btn.dataset.scheme === scheme;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-checked", String(active));
    });
    margolusRuleBlock.hidden = !isMargolus;
    gridShapeBlock.classList.toggle("is-disabled", isMargolus);
    btnHex.disabled = isMargolus;
    btnTri.disabled = isMargolus;
    if (isMargolus && state.gridShape !== "square") setGridShape("square");
    state.margolusPhase = 0;
    resetStabilityTracking();
    renderRulesetBody();
    addMarkerAll(isMargolus ? `Margolus (${state.margolusRule})` : "Standard update");
  }

  updateSchemeEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".segmented-btn");
    if (!btn) return;
    setUpdateScheme(btn.dataset.scheme);
  });

  margolusRuleEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".segmented-btn");
    if (!btn) return;
    state.margolusRule = btn.dataset.rule;
    margolusRuleEl.querySelectorAll(".segmented-btn").forEach((b) => {
      const active = b === btn;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-checked", String(active));
    });
    addMarkerAll(`Margolus rule: ${state.margolusRule}`);
  });

