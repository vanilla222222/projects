"use strict";

  /* ============================================================
     PAINTING / SELECTING / STAMPING / PANNING
     ============================================================ */

  let painting = false;
  let selectGestureValue = true;
  let boardPanning = false;
  let panStartClientX = 0, panStartClientY = 0, panStartPanX = 0, panStartPanY = 0;
  let touchZoomState = null;

  function hexCellFromPixel(px, py) {
    const r = state.hexRadius;
    const hexWidth = SQRT3 * r;
    const originX = hexWidth / 2;
    const originY = r;
    const approxRow = Math.round((py - originY) / (1.5 * r));

    let best = null;
    let bestDist = Infinity;
    for (let rowCand = approxRow - 1; rowCand <= approxRow + 1; rowCand++) {
      if (rowCand < 0 || rowCand >= state.rows) continue;
      const rowOffset = (rowCand % 2 === 1) ? hexWidth / 2 : 0;
      const approxCol = Math.round((px - originX - rowOffset) / hexWidth);
      for (let colCand = approxCol - 1; colCand <= approxCol + 1; colCand++) {
        if (colCand < 0 || colCand >= state.cols) continue;
        const cx = originX + hexWidth * colCand + rowOffset;
        const cy = originY + 1.5 * r * rowCand;
        const dx = px - cx, dy = py - cy;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) { bestDist = dist; best = { x: colCand, y: rowCand }; }
      }
    }
    return best;
  }

  function triSign(px, py, x1, y1, x2, y2) {
    return (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
  }
  function pointInTriangle(px, py, verts) {
    const [[x1, y1], [x2, y2], [x3, y3]] = verts;
    const d1 = triSign(px, py, x1, y1, x2, y2);
    const d2 = triSign(px, py, x2, y2, x3, y3);
    const d3 = triSign(px, py, x3, y3, x1, y1);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  }
  function triCellFromPixel(px, py) {
    const w = state.triWidth, h = w * (SQRT3 / 2);
    const rowGuess = Math.floor(py / h);
    const colGuess = Math.floor(px / (w / 2));
    for (let dy = -1; dy <= 1; dy++) {
      const row = rowGuess + dy;
      if (row < 0 || row >= state.rows) continue;
      for (let dx = -2; dx <= 2; dx++) {
        const col = colGuess + dx;
        if (col < 0 || col >= state.cols) continue;
        if (pointInTriangle(px, py, triVertices(col, row, w, h))) return { x: col, y: row };
      }
    }
    return null;
  }

  function cellFromEvent(e) {
    const el = activeCanvasEl();
    const rect = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = (clientX - rect.left) / state.boardView.zoom;
    const y = (clientY - rect.top) / state.boardView.zoom;

    if (state.gridShape === "hex") return hexCellFromPixel(x, y);
    if (state.gridShape === "tri") return triCellFromPixel(x, y);

    const cx = Math.floor(x / state.cellSize);
    const cy = Math.floor(y / state.cellSize);
    if (cx < 0 || cx >= state.cols || cy < 0 || cy >= state.rows) return null;
    return { x: cx, y: cy };
  }

  function setSelectionAt(x, y, selected) {
    const i = idx(x, y);
    if (selected) selectedCells.add(i); else selectedCells.delete(i);
    render();
    updateStampSaveRowVisibility();
  }

  /* ---- rotate/flip: transient orientation applied to the armed stamp only,
     never mutates the saved library entry ---- */

  function transformCellsForOrientation(cells, w, h, orientation) {
    let cur = cells.map((c) => ({ dx: c.dx, dy: c.dy, v: c.v }));
    let cw = w, ch = h;
    const rotations = ((orientation.rot % 4) + 4) % 4;
    for (let i = 0; i < rotations; i++) {
      cur = cur.map((c) => ({ dx: ch - 1 - c.dy, dy: c.dx, v: c.v }));
      const t = cw; cw = ch; ch = t;
    }
    if (orientation.flipH) cur = cur.map((c) => ({ dx: cw - 1 - c.dx, dy: c.dy, v: c.v }));
    if (orientation.flipV) cur = cur.map((c) => ({ dx: c.dx, dy: ch - 1 - c.dy, v: c.v }));
    return { cells: cur, w: cw, h: ch };
  }

  function getArmedCells() {
    if (!armedStamp) return null;
    return transformCellsForOrientation(armedStamp.cells, armedStamp.w, armedStamp.h, armedOrientation);
  }

  function updateStampArmToolbar() {
    const show = state.tool === "stamp" && !!armedStamp;
    stampArmToolbar.hidden = !show;
    if (show) stampArmName.textContent = armedStamp.name;
  }

  function setArmedOrientation(next) {
    armedOrientation = next;
    render();
  }

  btnStampRotate.addEventListener("click", () => {
    setArmedOrientation({ ...armedOrientation, rot: (armedOrientation.rot + 1) % 4 });
  });
  btnStampFlipH.addEventListener("click", () => {
    setArmedOrientation({ ...armedOrientation, flipH: !armedOrientation.flipH });
  });
  btnStampFlipV.addEventListener("click", () => {
    setArmedOrientation({ ...armedOrientation, flipV: !armedOrientation.flipV });
  });

  function placeArmedStampAt(c) {
    if (!armedStamp) return;
    const { cells } = getArmedCells();
    for (const cell of cells) {
      const x = c.x + cell.dx;
      const y = c.y + cell.dy;
      if (x < 0 || x >= state.cols || y < 0 || y >= state.rows) continue;
      grid[idx(x, y)] = cell.v;
    }
    render();
    updateStats();
  }

  /* ---- ghost preview: draws the armed stamp at the hovered cell, at
     reduced opacity, before it's committed to the grid ---- */

  function drawStampGhostOverlay() {
    if (state.tool !== "stamp" || !armedStamp || !stampHoverCell) return;
    const { cells } = getArmedCells();
    const baseX = stampHoverCell.x, baseY = stampHoverCell.y;
    ctx.save();
    ctx.globalAlpha = 0.4;
    if (state.gridShape === "hex") {
      const r = state.hexRadius;
      const hexWidth = SQRT3 * r;
      const originX = hexWidth / 2;
      const originY = r;
      for (const cell of cells) {
        const x = baseX + cell.dx, y = baseY + cell.dy;
        if (x < 0 || x >= state.cols || y < 0 || y >= state.rows) continue;
        const owner = ownerOf(cell.v);
        if (owner === null) continue;
        const rowOffset = (y % 2 === 1) ? hexWidth / 2 : 0;
        ctx.fillStyle = teams[owner] ? teams[owner].color : "#7c8797";
        hexPath(originX + hexWidth * x + rowOffset, originY + 1.5 * r * y, r, 0.92);
        ctx.fill();
      }
    } else if (state.gridShape === "tri") {
      const w = state.triWidth, h = w * (SQRT3 / 2);
      for (const cell of cells) {
        const x = baseX + cell.dx, y = baseY + cell.dy;
        if (x < 0 || x >= state.cols || y < 0 || y >= state.rows) continue;
        const owner = ownerOf(cell.v);
        if (owner === null) continue;
        ctx.fillStyle = teams[owner] ? teams[owner].color : "#7c8797";
        triPath(x, y, w, h, 0.88);
        ctx.fill();
      }
    } else {
      const size = state.cellSize;
      for (const cell of cells) {
        const x = baseX + cell.dx, y = baseY + cell.dy;
        if (x < 0 || x >= state.cols || y < 0 || y >= state.rows) continue;
        const owner = ownerOf(cell.v);
        if (owner === null) continue;
        ctx.fillStyle = teams[owner] ? teams[owner].color : "#7c8797";
        ctx.fillRect(x * size + 1, y * size + 1, size - 1, size - 1);
      }
    }
    ctx.restore();
  }

  function paintAt(e) {
    const c = cellFromEvent(e);
    if (!c) return;

    if (state.tool === "select") {
      setSelectionAt(c.x, c.y, selectGestureValue);
      return;
    }

    const value = currentPaintValue();
    let changed = false;
    forEachCellInBrush(c.x, c.y, (x, y) => {
      const i = idx(x, y);
      if (grid[i] !== value) { grid[i] = value; changed = true; }
    });
    if (changed) { render(); updateStats(); }
  }

  function startPan(clientX, clientY) {
    boardPanning = true;
    panStartClientX = clientX;
    panStartClientY = clientY;
    panStartPanX = state.boardView.panX;
    panStartPanY = state.boardView.panY;
    canvasFrameEl.classList.add("is-panning");
  }

  canvasFrameEl.addEventListener("contextmenu", (e) => e.preventDefault());

  canvasFrameEl.addEventListener("mousedown", (e) => {
    if (e.shiftKey || e.button === 1) {
      e.preventDefault();
      startPan(e.clientX, e.clientY);
      return;
    }
    if (e.button !== 0) return;
    activeCanvasEl().focus();
    const c = cellFromEvent(e);
    if (!c) return;

    if (state.tool === "stamp") {
      placeArmedStampAt(c);
      return;
    }
    if (state.tool === "select") {
      painting = true;
      selectGestureValue = !selectedCells.has(idx(c.x, c.y));
      paintAt(e);
      return;
    }

    painting = true;
    paintAt(e);
    canvasHint.style.opacity = "0";
  });

  window.addEventListener("mousemove", (e) => {
    if (boardPanning) {
      state.boardView.panX = panStartPanX + (e.clientX - panStartClientX);
      state.boardView.panY = panStartPanY + (e.clientY - panStartClientY);
      applyBoardTransform();
      return;
    }
    if (painting) paintAt(e);
  });

  canvasFrameEl.addEventListener("mousemove", (e) => {
    if (state.tool !== "stamp" || !armedStamp || painting || boardPanning) return;
    const c = cellFromEvent(e);
    if (c) {
      if (!stampHoverCell || c.x !== stampHoverCell.x || c.y !== stampHoverCell.y) {
        stampHoverCell = c;
        render();
      }
    } else if (stampHoverCell) {
      stampHoverCell = null;
      render();
    }
  });
  canvasFrameEl.addEventListener("mouseleave", () => {
    if (stampHoverCell) { stampHoverCell = null; render(); }
  });

  window.addEventListener("mouseup", () => {
    painting = false;
    boardPanning = false;
    canvasFrameEl.classList.remove("is-panning");
  });

  canvasFrameEl.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const c = cellFromEvent(e);
      if (!c) return;

      if (state.tool === "stamp") { placeArmedStampAt(c); return; }
      if (state.tool === "select") {
        painting = true;
        selectGestureValue = !selectedCells.has(idx(c.x, c.y));
        paintAt(e);
        return;
      }

      painting = true;
      paintAt(e);
      canvasHint.style.opacity = "0";
    } else if (e.touches.length === 2) {
      e.preventDefault();
      painting = false;
      const [t0, t1] = e.touches;
      touchZoomState = {
        startDist: Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY),
        startZoom: state.boardView.zoom,
        startMidX: (t0.clientX + t1.clientX) / 2,
        startMidY: (t0.clientY + t1.clientY) / 2,
        startPanX: state.boardView.panX,
        startPanY: state.boardView.panY,
      };
    }
  }, { passive: false });

  canvasFrameEl.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (e.touches.length === 1 && painting) {
      paintAt(e);
    } else if (e.touches.length === 2 && touchZoomState) {
      const [t0, t1] = e.touches;
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const midX = (t0.clientX + t1.clientX) / 2;
      const midY = (t0.clientY + t1.clientY) / 2;
      state.boardView.zoom = clamp(touchZoomState.startZoom * (dist / touchZoomState.startDist), 0.25, 8);
      state.boardView.panX = touchZoomState.startPanX + (midX - touchZoomState.startMidX);
      state.boardView.panY = touchZoomState.startPanY + (midY - touchZoomState.startMidY);
      applyBoardTransform();
    }
  }, { passive: false });

  canvasFrameEl.addEventListener("touchend", (e) => {
    painting = false;
    if (e.touches.length < 2) touchZoomState = null;
  });

  canvasFrameEl.addEventListener("keydown", (e) => {
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && state.tool !== "paint") { setTool("paint"); return; }
    if (state.tool !== "stamp" || !armedStamp) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (e.key === "r" || e.key === "R") setArmedOrientation({ ...armedOrientation, rot: (armedOrientation.rot + 1) % 4 });
    else if (e.key === "h" || e.key === "H") setArmedOrientation({ ...armedOrientation, flipH: !armedOrientation.flipH });
    else if (e.key === "v" || e.key === "V") setArmedOrientation({ ...armedOrientation, flipV: !armedOrientation.flipV });
  });

