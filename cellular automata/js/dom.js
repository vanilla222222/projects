"use strict";

  /* ============================================================
     DOM REFS
     ============================================================ */

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const glCanvasEl = document.getElementById("board-gl");
  const canvasFrameEl = document.getElementById("canvas-frame");
  const boardViewport = document.getElementById("board-viewport");
  const canvasHint = document.getElementById("canvas-hint");

  const statGen = document.getElementById("stat-gen");
  const statTotalPop = document.getElementById("stat-total-pop");
  const statLeading = document.getElementById("stat-leading");
  const statStability = document.getElementById("stat-stability");
  const statTeamPopsEl = document.getElementById("stat-team-pops");
  const statSize = document.getElementById("stat-size");

  const btnRendererCanvas = document.getElementById("btn-renderer-canvas");
  const btnRendererWebgl = document.getElementById("btn-renderer-webgl");
  const boardZoomIn = document.getElementById("board-zoom-in");
  const boardZoomOut = document.getElementById("board-zoom-out");
  const boardZoomReset = document.getElementById("board-zoom-reset");
  const boardZoomValue = document.getElementById("board-zoom-value");

  const btnPlay = document.getElementById("btn-play");
  const iconPlay = document.getElementById("icon-play");
  const iconPause = document.getElementById("icon-pause");
  const playLabel = document.getElementById("play-label");
  const btnStep = document.getElementById("btn-step");
  const btnRandom = document.getElementById("btn-random");
  const btnClear = document.getElementById("btn-clear");

  const speedInput = document.getElementById("speed");
  const speedDec = document.getElementById("speed-dec");
  const speedInc = document.getElementById("speed-inc");

  const teamCountInput = document.getElementById("team-count");
  const colorTabsEl = document.getElementById("color-tabs");
  const syncRulesetInput = document.getElementById("sync-ruleset");

  const statesInput = document.getElementById("states-count");
  const syncGenerationsRow = document.getElementById("sync-generations-row");
  const syncGenerationsInput = document.getElementById("sync-generations");
  const interactionBlock = document.getElementById("interaction-block");
  const interactionModeEl = document.getElementById("interaction-mode");
  const rulesetMatricesEl = document.getElementById("ruleset-matrices");

  const colsInput = document.getElementById("cols");
  const rowsInput = document.getElementById("rows");
  const btnResize = document.getElementById("btn-resize");

  const btnFinite = document.getElementById("btn-finite");
  const btnWrap = document.getElementById("btn-wrap");
  const boundaryHint = document.getElementById("boundary-hint");

  const btnSquare = document.getElementById("btn-square");
  const btnHex = document.getElementById("btn-hex");
  const btnTri = document.getElementById("btn-tri");
  const gridShapeBlock = document.getElementById("grid-shape-block");

  const updateSchemeEl = document.getElementById("update-scheme");
  const margolusRuleBlock = document.getElementById("margolus-rule-block");
  const margolusRuleEl = document.getElementById("margolus-rule");

  const btnMoore = document.getElementById("btn-moore");
  const btnVN = document.getElementById("btn-vn");
  const neighborhoodHint = document.getElementById("neighborhood-hint");
  const neighborhoodBlock = document.getElementById("neighborhood-block");

  const noiseInput = document.getElementById("noise");
  const noiseDec = document.getElementById("noise-dec");
  const noiseInc = document.getElementById("noise-inc");
  const noiseModeEl = document.getElementById("noise-mode");

  const teamColorFieldsEl = document.getElementById("team-color-fields");
  const showGridInput = document.getElementById("show-grid");

  const brushSwatchesEl = document.getElementById("brush-swatches");
  const brushColorLabel = document.getElementById("brush-color-label");
  const brushSizeInput = document.getElementById("brush-size");
  const brushSizeValue = document.getElementById("brush-size-value");

  const btnToolPaint = document.getElementById("btn-tool-paint");
  const btnToolSelect = document.getElementById("btn-tool-select");
  const stampCaptureHint = document.getElementById("stamp-capture-hint");
  const stampSaveRow = document.getElementById("stamp-save-row");
  const stampNameInput = document.getElementById("stamp-name");
  const btnStampSave = document.getElementById("btn-stamp-save");
  const btnStampClearSelection = document.getElementById("btn-stamp-clear-selection");
  const stampListEl = document.getElementById("stamp-library");
  const stampEmptyHint = document.getElementById("stamp-empty-hint");
  const btnStampsExport = document.getElementById("btn-stamps-export");
  const btnStampsImport = document.getElementById("btn-stamps-import");
  const fileStampsImport = document.getElementById("file-stamps-import");

  const stampArmToolbar = document.getElementById("stamp-arm-toolbar");
  const stampArmName = document.getElementById("stamp-arm-name");
  const btnStampRotate = document.getElementById("btn-stamp-rotate");
  const btnStampFlipH = document.getElementById("btn-stamp-flip-h");
  const btnStampFlipV = document.getElementById("btn-stamp-flip-v");

  const btnFolderNew = document.getElementById("btn-folder-new");
  const folderNewRow = document.getElementById("folder-new-row");
  const folderNameInput = document.getElementById("folder-name-input");
  const btnFolderCreate = document.getElementById("btn-folder-create");
  const btnFolderCancel = document.getElementById("btn-folder-cancel");

  const btnSettingsExport = document.getElementById("btn-settings-export");
  const btnSettingsImport = document.getElementById("btn-settings-import");
  const fileSettingsImport = document.getElementById("file-settings-import");
  const btnBoardExport = document.getElementById("btn-board-export");
  const btnBoardImport = document.getElementById("btn-board-import");
  const fileBoardImport = document.getElementById("file-board-import");
  const btnGraphExport = document.getElementById("btn-graph-export");
  const btnGraphImport = document.getElementById("btn-graph-import");
  const fileGraphImport = document.getElementById("file-graph-import");

  const graphPanelsContainer = document.getElementById("graph-panels-container");

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function hexToRgb01(hex) {
    const v = hex.replace("#", "");
    return [
      parseInt(v.substring(0, 2), 16) / 255,
      parseInt(v.substring(2, 4), 16) / 255,
      parseInt(v.substring(4, 6), 16) / 255,
    ];
  }
  function hexToRgba(hex, alpha) {
    const [r, g, b] = hexToRgb01(hex);
    return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${alpha})`;
  }

