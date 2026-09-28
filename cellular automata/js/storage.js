"use strict";

  /* ============================================================
     DATA — export/import settings, board, graph, and stamps as JSON
     ============================================================ */

  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function wireImportButton(button, fileInput, handler) {
    button.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          handler(JSON.parse(reader.result));
        } catch (err) {
          console.error("AUTOMATON import error:", err);
          alert("That file couldn't be read as valid JSON for this import.");
        }
        fileInput.value = "";
      };
      reader.readAsText(file);
    });
  }

  function rleEncode(arr) {
    const out = [];
    let i = 0;
    while (i < arr.length) {
      let j = i;
      while (j < arr.length && arr[j] === arr[i]) j++;
      out.push([arr[i], j - i]);
      i = j;
    }
    return out;
  }

  function rleDecode(rle, length) {
    const out = new Uint8Array(length);
    let i = 0;
    for (const [v, count] of rle) {
      for (let k = 0; k < count && i < length; k++) out[i++] = v;
    }
    return out;
  }

  /* ---- Settings: ruleset, boundary, shape, neighborhood, noise, appearance ---- */

  function exportSettings() {
    return {
      version: 4,
      type: "automaton-settings",
      cols: state.cols,
      rows: state.rows,
      wrap: state.wrap,
      gridShape: state.gridShape,
      neighborhood: state.neighborhood,
      updateScheme: state.updateScheme,
      margolusRule: state.margolusRule,
      noise: state.noise,
      noiseMode: state.noiseMode,
      showGrid: state.showGrid,
      genPerSec: state.genPerSec,
      renderer: state.renderer,
      syncRuleset: state.syncRuleset,
      teams: teams.map((t) => ({
        color: t.color,
        numStates: t.numStates,
        interaction: t.interaction,
        syncGenerations: t.syncGenerations,
        birth: [...t.birth],
        survive: [...t.survive],
        birthByGen: t.birthByGen.map((s) => [...s]),
        surviveByGen: t.surviveByGen.map((s) => [...s]),
        killedByEnemyGen: t.killedByEnemyGen.map((rows) => rows.map((s) => [...s])),
        killedSyncGenerations: t.killedSyncGenerations.slice(),
      })),
    };
  }

  function importSettings(data) {
    if (!data || typeof data !== "object") return;

    state.noise = Math.round(Math.max(0, Number(data.noise) || 0) * 10) / 10;
    state.noiseMode = ["full", "birth", "death", "untouched"].includes(data.noiseMode) ? data.noiseMode : "full";
    noiseModeEl.querySelectorAll(".segmented-btn").forEach((b) => {
      const active = b.dataset.mode === state.noiseMode;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-checked", String(active));
    });
    state.showGrid = data.showGrid !== undefined ? !!data.showGrid : state.showGrid;
    state.genPerSec = Math.max(1, Number(data.genPerSec) || state.genPerSec);
    state.syncRuleset = !!data.syncRuleset;
    syncRulesetInput.checked = state.syncRuleset;

    if (Array.isArray(data.teams) && data.teams.length >= 2) {
      const n = clamp(data.teams.length, 2, 6);
      teams = data.teams.slice(0, n).map((t, i) => {
        const base = makeDefaultTeam(i);
        return {
          color: t.color || base.color,
          numStates: clamp(Number(t.numStates) || 2, 2, MAX_GENERATIONS),
          interaction: ["ignore", "health", "independent"].includes(t.interaction) ? t.interaction : "ignore",
          syncGenerations: t.syncGenerations !== undefined ? !!t.syncGenerations : true,
          birth: new Set(Array.isArray(t.birth) ? t.birth : [3]),
          survive: new Set(Array.isArray(t.survive) ? t.survive : [2, 3]),
          birthByGen: Array.isArray(t.birthByGen) && t.birthByGen.length
            ? base.birthByGen.map((s, gi) => new Set(Array.isArray(t.birthByGen[gi]) ? t.birthByGen[gi] : s))
            : base.birthByGen,
          surviveByGen: Array.isArray(t.surviveByGen) && t.surviveByGen.length
            ? base.surviveByGen.map((s, gi) => new Set(Array.isArray(t.surviveByGen[gi]) ? t.surviveByGen[gi] : s))
            : base.surviveByGen,
          killedByEnemyGen: Array.isArray(t.killedByEnemyGen) && t.killedByEnemyGen.length
            ? base.killedByEnemyGen.map((rows, ei) =>
                Array.isArray(t.killedByEnemyGen[ei])
                  ? rows.map((s, gi) => new Set(Array.isArray(t.killedByEnemyGen[ei][gi]) ? t.killedByEnemyGen[ei][gi] : s))
                  : rows)
            : base.killedByEnemyGen,
          killedSyncGenerations: Array.isArray(t.killedSyncGenerations) && t.killedSyncGenerations.length
            ? base.killedSyncGenerations.map((v, ei) => (t.killedSyncGenerations[ei] !== undefined ? !!t.killedSyncGenerations[ei] : v))
            : base.killedSyncGenerations,
        };
      });
      state.numTeams = n;
      if (state.activeTeam >= n) state.activeTeam = 0;
      teamCountInput.value = n;
      rebuildEncodingTables();
      syncGraphPanelsToTeamCount();
      rebuildColorTabs();
      rebuildTeamColorFields();
      rebuildTeamStatPops();
    }

    noiseInput.value = state.noise;
    showGridInput.checked = state.showGrid;
    speedInput.value = state.genPerSec;

    setBoundary(!!data.wrap);
    setNeighborhood(data.neighborhood === "vonneumann" ? "vonneumann" : "moore");
    setGridShape(data.gridShape === "hex" ? "hex" : data.gridShape === "tri" ? "tri" : "square");
    setRenderer(data.renderer === "webgl" ? "webgl" : "canvas2d");
    state.margolusRule = ["rotateCW", "rotateCCW", "bbm", "critters", "tron"].includes(data.margolusRule) ? data.margolusRule : "rotateCW";
    margolusRuleEl.querySelectorAll(".segmented-btn").forEach((b) => {
      const active = b.dataset.rule === state.margolusRule;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-checked", String(active));
    });
    setUpdateScheme(data.updateScheme === "margolus" ? "margolus" : "standard");

    if (data.cols && data.rows && (Number(data.cols) !== state.cols || Number(data.rows) !== state.rows)) {
      resizeBoard(Number(data.cols), Number(data.rows), "Settings import (resize)");
    }

    setActiveTeam(state.activeTeam);
    addMarkerAll("Settings imported");
  }

  btnSettingsExport.addEventListener("click", () => downloadJSON(exportSettings(), "automaton-settings.json"));
  wireImportButton(btnSettingsImport, fileSettingsImport, (data) => importSettings(data));

  /* ---- Board: cell contents, run-length encoded ---- */

  function exportBoard() {
    return {
      version: 2,
      type: "automaton-board",
      cols: state.cols,
      rows: state.rows,
      gridShape: state.gridShape,
      numTeams: state.numTeams,
      generation: state.generation,
      cellsRLE: rleEncode(Array.from(grid)),
    };
  }

  function importBoard(data) {
    if (!data || !data.cols || !data.rows) return;
    const newCols = clamp(Number(data.cols), 4, BOARD_MAX);
    const newRows = clamp(Number(data.rows), 4, BOARD_MAX);

    if (data.numTeams && Number(data.numTeams) !== state.numTeams) {
      setNumTeams(Number(data.numTeams));
    }

    state.cols = newCols;
    state.rows = newRows;
    colsInput.value = newCols;
    rowsInput.value = newRows;
    allocateGrids();
    selectedCells.clear();

    if (data.gridShape && data.gridShape !== state.gridShape) {
      setGridShape(data.gridShape === "hex" ? "hex" : data.gridShape === "tri" ? "tri" : "square");
    } else {
      fitCanvas();
    }

    if (Array.isArray(data.cellsRLE)) {
      grid.set(rleDecode(data.cellsRLE, newCols * newRows));
    }
    state.generation = clamp(Number(data.generation) || 0, 0, 1e9);
    resetStabilityTracking();

    const pops = populationByTeam();
    pops.forEach((p, t) => { if (charts[t]) charts[t].resetHistory("Board imported", p); });
    if (globalChart) globalChart.resetHistory("Board imported", pops.reduce((a, b) => a + b, 0));
    updateStats();
    render();
  }

  btnBoardExport.addEventListener("click", () => downloadJSON(exportBoard(), "automaton-board.json"));
  wireImportButton(btnBoardImport, fileBoardImport, (data) => importBoard(data));

  /* ---- Graph: metrics history for every team ---- */

  function exportGraphJSON() {
    return {
      version: 3,
      type: "automaton-graph",
      generation: state.generation,
      teams: charts.map((c) => (c ? c.exportData() : null)),
      global: globalChart ? globalChart.exportData() : null,
    };
  }

  function importGraphJSON(data) {
    if (!data || !Array.isArray(data.teams)) return;
    data.teams.forEach((d, t) => { if (charts[t] && d) charts[t].importData(d); });
    if (globalChart && data.global) globalChart.importData(data.global);
  }

  btnGraphExport.addEventListener("click", () => downloadJSON(exportGraphJSON(), "automaton-graph.json"));
  wireImportButton(btnGraphImport, fileGraphImport, (data) => importGraphJSON(data));

  /* ---- Stamps: saved patterns, locked to the grid shape they were captured on ---- */

  function exportStamps() {
    return { version: 2, type: "automaton-stamps", stamps: stampLibrary, folders: stampFolders };
  }

  function importStamps(data) {
    if (!data || !Array.isArray(data.stamps)) return;
    const folderIdMap = new Map();
    if (Array.isArray(data.folders)) {
      for (const f of data.folders) {
        if (!f) continue;
        const newId = stampFolderIdCounter++;
        folderIdMap.set(f.id, newId);
        stampFolders.push({ id: newId, name: String(f.name || "Folder").slice(0, 24), collapsed: !!f.collapsed });
      }
    }
    for (const s of data.stamps) {
      if (!s || !Array.isArray(s.cells)) continue;
      stampLibrary.push({
        id: stampIdCounter++,
        name: String(s.name || "Imported stamp").slice(0, 24),
        gridShape: s.gridShape === "hex" ? "hex" : s.gridShape === "tri" ? "tri" : "square",
        w: Number(s.w) || 1,
        h: Number(s.h) || 1,
        cells: s.cells
          .filter((c) => c && typeof c.dx === "number" && typeof c.dy === "number")
          .map((c) => ({ dx: c.dx, dy: c.dy, v: Number(c.v) || 0 })),
        folderId: s.folderId != null && folderIdMap.has(s.folderId) ? folderIdMap.get(s.folderId) : null,
      });
    }
    saveStampsToStorage();
    renderStampList();
  }

  btnStampsExport.addEventListener("click", () => downloadJSON(exportStamps(), "automaton-stamps.json"));
  wireImportButton(btnStampsImport, fileStampsImport, (data) => importStamps(data));

