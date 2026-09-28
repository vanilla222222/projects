"use strict";

  /* ============================================================
     CANVAS SIZING
     ============================================================ */

  function boardPixelSize() {
    if (state.gridShape === "hex") {
      const hexWidth = SQRT3 * state.hexRadius;
      return { w: hexWidth * state.cols + hexWidth / 2, h: 1.5 * state.hexRadius * (state.rows - 1) + 2 * state.hexRadius };
    }
    if (state.gridShape === "tri") {
      const h = state.triWidth * (SQRT3 / 2);
      return { w: (state.cols + 1) * (state.triWidth / 2), h: state.rows * h };
    }
    return { w: state.cellSize * state.cols, h: state.cellSize * state.rows };
  }

  function setCanvasPixelSize(pxW, pxH) {
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = pxW + "px";
    canvas.style.height = pxH + "px";
    canvas.width = Math.round(pxW * dpr);
    canvas.height = Math.round(pxH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    boardViewport.style.width = pxW + "px";
    boardViewport.style.height = pxH + "px";
  }

  function fitCanvas() {
    const availW = canvasFrameEl.clientWidth - 4;
    const availH = canvasFrameEl.clientHeight - 4;

    if (state.gridShape === "hex") {
      const rW = availW / ((state.cols + 0.5) * SQRT3);
      const rH = availH / (1.5 * (state.rows - 1) + 2);
      state.hexRadius = Math.max(2, Math.min(rW, rH, 26));
    } else if (state.gridShape === "tri") {
      const wByWidth = (2 * availW) / (state.cols + 1);
      const wByHeight = availH / (state.rows * (SQRT3 / 2));
      state.triWidth = Math.max(4, Math.min(wByWidth, wByHeight, 40));
    } else {
      state.cellSize = Math.max(
        2,
        Math.min(Math.floor(availW / state.cols), Math.floor(availH / state.rows), 34)
      );
    }
    const { w, h } = boardPixelSize();
    setCanvasPixelSize(w, h);
    render();
  }

  /* ============================================================
     RENDER
     ============================================================ */

  function render() {
    const useGL = usingWebGL();
    canvas.hidden = false;
    glCanvasEl.hidden = !useGL;
    if (useGL) {
      renderWebGL();
      renderOverlayOnly();
    } else if (state.gridShape === "hex") {
      renderHex();
    } else if (state.gridShape === "tri") {
      renderTri();
    } else {
      renderSquare();
    }
  }

  // WebGL mode draws the grid itself on #board-gl; #board is kept as a
  // transparent overlay on top for the selection outline + stamp ghost only.
  function renderOverlayOnly() {
    const { w, h } = boardPixelSize();
    ctx.clearRect(0, 0, w, h);
    drawSelectionOverlay();
    drawStampGhostOverlay();
  }

  function drawSelectionOverlay() {
    if (selectedCells.size === 0) return;
    ctx.strokeStyle = "#6bc5ff";
    ctx.lineWidth = 2;
    if (state.gridShape === "hex") {
      const r = state.hexRadius;
      const hexWidth = SQRT3 * r;
      const originX = hexWidth / 2;
      const originY = r;
      for (const i of selectedCells) {
        const x = i % state.cols;
        const y = Math.floor(i / state.cols);
        const rowOffset = (y % 2 === 1) ? hexWidth / 2 : 0;
        hexPath(originX + hexWidth * x + rowOffset, originY + 1.5 * r * y, r, 0.98);
        ctx.stroke();
      }
    } else if (state.gridShape === "tri") {
      const w = state.triWidth, h = w * (SQRT3 / 2);
      for (const i of selectedCells) {
        const x = i % state.cols;
        const y = Math.floor(i / state.cols);
        triPath(x, y, w, h, 0.98);
        ctx.stroke();
      }
    } else {
      const size = state.cellSize;
      for (const i of selectedCells) {
        const x = i % state.cols;
        const y = Math.floor(i / state.cols);
        ctx.strokeRect(x * size + 1, y * size + 1, size - 2, size - 2);
      }
    }
  }

  function renderSquare() {
    const size = state.cellSize;
    const w = state.cols * size;
    const h = state.rows * size;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#070911";
    ctx.fillRect(0, 0, w, h);

    ctx.shadowBlur = size > 5 ? 4 : 0;

    for (let t = 0; t < teams.length; t++) {
      ctx.fillStyle = teams[t].color;
      ctx.shadowColor = ctx.fillStyle;
      for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
          const s = grid[idx(x, y)];
          if (ownerOf(s) === t) {
            ctx.globalAlpha = stateAlpha(s);
            ctx.fillRect(x * size + 1, y * size + 1, size - 1, size - 1);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (state.showGrid && size >= 5) {
      ctx.strokeStyle = "#1b212b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= state.cols; x++) { ctx.moveTo(x * size + 0.5, 0); ctx.lineTo(x * size + 0.5, h); }
      for (let y = 0; y <= state.rows; y++) { ctx.moveTo(0, y * size + 0.5); ctx.lineTo(w, y * size + 0.5); }
      ctx.stroke();
    }

    drawSelectionOverlay();
    drawStampGhostOverlay();
  }

  function hexPath(cx, cy, r, inset) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 180) * (60 * i - 30);
      const px = cx + r * inset * Math.cos(ang);
      const py = cy + r * inset * Math.sin(ang);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function renderHex() {
    const r = state.hexRadius;
    const hexWidth = SQRT3 * r;
    const originX = hexWidth / 2;
    const originY = r;
    const w = hexWidth * state.cols + hexWidth / 2;
    const h = 1.5 * r * (state.rows - 1) + 2 * r;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#070911";
    ctx.fillRect(0, 0, w, h);

    if (state.showGrid && state.cols * state.rows <= 10000) {
      ctx.strokeStyle = "#1b212b";
      ctx.lineWidth = 1;
      for (let y = 0; y < state.rows; y++) {
        const rowOffset = (y % 2 === 1) ? hexWidth / 2 : 0;
        for (let x = 0; x < state.cols; x++) {
          const cx = originX + hexWidth * x + rowOffset;
          const cy = originY + 1.5 * r * y;
          hexPath(cx, cy, r, 0.98);
          ctx.stroke();
        }
      }
    }

    ctx.shadowBlur = r > 8 ? 4 : 0;

    for (let t = 0; t < teams.length; t++) {
      ctx.fillStyle = teams[t].color;
      ctx.shadowColor = ctx.fillStyle;
      for (let y = 0; y < state.rows; y++) {
        const rowOffset = (y % 2 === 1) ? hexWidth / 2 : 0;
        for (let x = 0; x < state.cols; x++) {
          const s = grid[idx(x, y)];
          if (ownerOf(s) === t) {
            const cx = originX + hexWidth * x + rowOffset;
            const cy = originY + 1.5 * r * y;
            ctx.globalAlpha = stateAlpha(s);
            hexPath(cx, cy, r, 0.92);
            ctx.fill();
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    drawSelectionOverlay();
    drawStampGhostOverlay();
  }

  function triVertices(x, y, w, h) {
    const up = (x + y) % 2 === 0;
    const left = x * (w / 2);
    const right = left + w;
    const midX = left + w / 2;
    const top = y * h;
    const bottom = (y + 1) * h;
    return up ? [[left, bottom], [right, bottom], [midX, top]] : [[left, top], [right, top], [midX, bottom]];
  }

  function triPath(x, y, w, h, inset) {
    const v = triVertices(x, y, w, h);
    const cx = (v[0][0] + v[1][0] + v[2][0]) / 3;
    const cy = (v[0][1] + v[1][1] + v[2][1]) / 3;
    ctx.beginPath();
    v.forEach(([px, py], i) => {
      const ix = cx + (px - cx) * inset;
      const iy = cy + (py - cy) * inset;
      if (i === 0) ctx.moveTo(ix, iy); else ctx.lineTo(ix, iy);
    });
    ctx.closePath();
  }

  function renderTri() {
    const w = state.triWidth;
    const h = w * (SQRT3 / 2);
    const totalW = (state.cols + 1) * (w / 2);
    const totalH = state.rows * h;

    ctx.clearRect(0, 0, totalW, totalH);
    ctx.fillStyle = "#070911";
    ctx.fillRect(0, 0, totalW, totalH);

    if (state.showGrid && state.cols * state.rows <= 10000) {
      ctx.strokeStyle = "#1b212b";
      ctx.lineWidth = 1;
      for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
          triPath(x, y, w, h, 0.98);
          ctx.stroke();
        }
      }
    }

    ctx.shadowBlur = w > 12 ? 4 : 0;

    for (let t = 0; t < teams.length; t++) {
      ctx.fillStyle = teams[t].color;
      ctx.shadowColor = ctx.fillStyle;
      for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
          const s = grid[idx(x, y)];
          if (ownerOf(s) === t) {
            ctx.globalAlpha = stateAlpha(s);
            triPath(x, y, w, h, 0.88);
            ctx.fill();
          }
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    drawSelectionOverlay();
    drawStampGhostOverlay();
  }

  function updateStats() {
    statGen.textContent = state.generation;
    const pops = populationByTeam();
    pops.forEach((p, t) => {
      const el = document.getElementById(`stat-pop-${t}`);
      if (el) el.textContent = p;
    });
    statSize.textContent = `${state.cols}×${state.rows}`;
    pops.forEach((p, t) => { if (charts[t]) charts[t].syncCurrent(p); });

    const totalPop = pops.reduce((a, b) => a + b, 0);
    statTotalPop.textContent = totalPop;

    let leadT = -1, leadP = 0;
    pops.forEach((p, t) => { if (p > leadP) { leadP = p; leadT = t; } });
    if (leadT === -1) {
      statLeading.textContent = "—";
      statLeading.style.color = "";
    } else {
      statLeading.textContent = `Team ${leadT + 1}`;
      statLeading.style.color = teams[leadT].color;
    }

    if (boardStablePeriod > 0) {
      statStability.textContent = boardStablePeriod === 1 ? "Static" : `Cycling ×${boardStablePeriod}`;
      statStability.classList.add("is-stable");
    } else {
      statStability.textContent = "Evolving";
      statStability.classList.remove("is-stable");
    }
  }
