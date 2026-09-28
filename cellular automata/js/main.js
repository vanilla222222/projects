"use strict";

  /* ============================================================
     INIT
     ============================================================ */

  function seedTeams() {
    teams.forEach((team, t) => {
      const val = teamAliveValue(t);
      const angle = (t / teams.length) * Math.PI * 2 - Math.PI / 2;
      const cx = Math.round(state.cols / 2 + Math.cos(angle) * state.cols * 0.3 - 5);
      const cy = Math.round(state.rows / 2 + Math.sin(angle) * state.rows * 0.3 - 4);
      randomBlockColor(clamp(cx, 0, state.cols - 10), clamp(cy, 0, state.rows - 8), val);
    });
  }

  function init() {
    rebuildEncodingTables();
    initSettingsPanelCollapse();

    syncGraphPanelsToTeamCount();
    rebuildColorTabs();
    rebuildTeamColorFields();
    rebuildTeamStatPops();
    setActiveTeam(0);

    updateBrushSwatches();
    loadStampsFromStorage();
    renderStampList();
    updateStampSaveRowVisibility();

    initWebGL();
    updateRendererAvailability();

    setBoundary(false);
    setNeighborhood("moore");
    setGridShape("square");
    setRenderer("canvas2d");

    suppressMarkers = false;

    seedTeams();

    const pops = populationByTeam();
    pops.forEach((p, t) => { if (charts[t]) charts[t].resetHistory(null, p); });
    if (globalChart) globalChart.resetHistory(null, pops.reduce((a, b) => a + b, 0));

    updateStats();
    applyBoardTransform();
    fitCanvas();
    setTimeout(() => { canvasHint.style.transition = "opacity 0.6s"; }, 10);
  }

  window.addEventListener("resize", () => {
    fitCanvas();
    charts.forEach((c) => { if (c) c.render(); });
    if (globalChart) globalChart.render();
  });

  init();
