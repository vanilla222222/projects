"use strict";

  /* ============================================================
     BOARD PAN / ZOOM
     ============================================================ */

  function applyBoardTransform() {
    boardViewport.style.transform =
      `translate(${state.boardView.panX}px, ${state.boardView.panY}px) scale(${state.boardView.zoom})`;
    boardZoomValue.textContent = `${Math.round(state.boardView.zoom * 100)}%`;
  }

  function zoomBoardAt(factor, clientX, clientY) {
    const rect = canvasFrameEl.getBoundingClientRect();
    const cx = clientX - rect.left - rect.width / 2;
    const cy = clientY - rect.top - rect.height / 2;
    const newZoom = clamp(state.boardView.zoom * factor, 0.25, 8);
    const ratio = newZoom / state.boardView.zoom;
    state.boardView.panX = cx - (cx - state.boardView.panX) * ratio;
    state.boardView.panY = cy - (cy - state.boardView.panY) * ratio;
    state.boardView.zoom = newZoom;
    applyBoardTransform();
  }

  function zoomBoardCenter(factor) {
    state.boardView.zoom = clamp(state.boardView.zoom * factor, 0.25, 8);
    applyBoardTransform();
  }

  function resetBoardView() {
    state.boardView.zoom = 1;
    state.boardView.panX = 0;
    state.boardView.panY = 0;
    applyBoardTransform();
  }

  canvasFrameEl.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1 / 0.9;
    zoomBoardAt(factor, e.clientX, e.clientY);
  }, { passive: false });

  boardZoomIn.addEventListener("click", () => zoomBoardCenter(1.25));
  boardZoomOut.addEventListener("click", () => zoomBoardCenter(0.8));
  boardZoomReset.addEventListener("click", resetBoardView);

