"use strict";

  /* ============================================================
     TOOL — paint / select (for stamp capture) / stamp (armed placement)
     ============================================================ */

  function updateStampSaveRowVisibility() {
    stampSaveRow.hidden = !(state.tool === "select" && selectedCells.size > 0);
  }

  function setTool(tool) {
    state.tool = tool;
    const isSelect = tool === "select";
    btnToolPaint.classList.toggle("is-active", tool === "paint");
    btnToolPaint.setAttribute("aria-checked", String(tool === "paint"));
    btnToolSelect.classList.toggle("is-active", isSelect);
    btnToolSelect.setAttribute("aria-checked", String(isSelect));

    if (tool !== "select") {
      selectedCells.clear();
      updateStampSaveRowVisibility();
    }
    if (tool !== "stamp") {
      armedStamp = null;
      armedOrientation = { rot: 0, flipH: false, flipV: false };
      stampHoverCell = null;
      renderStampList();
    }
    updateStampArmToolbar();
    stampCaptureHint.textContent = isSelect
      ? "Click/drag tiles on the board to outline a pattern, then save it below. Esc returns to painting."
      : "Click \"Select cells\", then click/drag tiles on the board to outline a pattern. Esc returns to painting.";
    render();
  }

  btnToolPaint.addEventListener("click", () => setTool("paint"));
  btnToolSelect.addEventListener("click", () => setTool(state.tool === "select" ? "paint" : "select"));

  btnStampClearSelection.addEventListener("click", () => {
    selectedCells.clear();
    updateStampSaveRowVisibility();
    render();
  });

  btnStampSave.addEventListener("click", () => {
    if (selectedCells.size === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const i of selectedCells) {
      const x = i % state.cols, y = Math.floor(i / state.cols);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const cells = [...selectedCells].map((i) => {
      const x = i % state.cols, y = Math.floor(i / state.cols);
      return { dx: x - minX, dy: y - minY, v: grid[i] };
    });
    const name = stampNameInput.value.trim() || `Stamp ${stampIdCounter}`;
    stampLibrary.push({
      id: stampIdCounter++,
      name,
      gridShape: state.gridShape,
      w: maxX - minX + 1,
      h: maxY - minY + 1,
      cells,
      folderId: null,
    });
    stampNameInput.value = "";
    selectedCells.clear();
    updateStampSaveRowVisibility();
    setTool("paint");
    saveStampsToStorage();
    renderStampList();
  });

  function renderStampPreview(canvasEl, stamp) {
    const size = 96;
    canvasEl.width = size;
    canvasEl.height = size;
    const pctx = canvasEl.getContext("2d");
    pctx.clearRect(0, 0, size, size);
    const span = Math.max(stamp.w, stamp.h, 1);
    const cell = size / span;
    const offsetX = (size - stamp.w * cell) / 2;
    const offsetY = (size - stamp.h * cell) / 2;
    for (const c of stamp.cells) {
      const owner = ownerOf(c.v);
      if (owner === null) continue;
      pctx.fillStyle = teams[owner] ? teams[owner].color : "#7c8797";
      pctx.globalAlpha = stateAlpha(c.v);
      pctx.fillRect(offsetX + c.dx * cell, offsetY + c.dy * cell, Math.max(1, cell - 0.6), Math.max(1, cell - 0.6));
    }
    pctx.globalAlpha = 1;
  }

  /* ---- folders: group stamps for organization; stamp.folderId === null
     means "ungrouped". Stamps can be dragged to reorder or to move between
     folders; folder collapse state and stamp order both persist. ---- */

  function stampsInFolder(folderId) {
    return stampLibrary.filter((s) => (s.folderId || null) === folderId);
  }

  function armStamp(stamp) {
    armedStamp = { id: stamp.id, name: stamp.name, gridShape: stamp.gridShape, w: stamp.w, h: stamp.h, cells: stamp.cells.map((c) => ({ ...c })) };
    armedOrientation = { rot: 0, flipH: false, flipV: false };
    state.tool = "stamp";
    selectedCells.clear();
    updateStampSaveRowVisibility();
    btnToolPaint.classList.remove("is-active");
    btnToolPaint.setAttribute("aria-checked", "false");
    btnToolSelect.classList.remove("is-active");
    btnToolSelect.setAttribute("aria-checked", "false");
    updateStampArmToolbar();
    renderStampList();
  }

  function moveDraggedStamp(draggedId, targetFolderId, beforeStampId) {
    if (!draggedId || draggedId === beforeStampId) return;
    const fromIndex = stampLibrary.findIndex((s) => s.id === draggedId);
    if (fromIndex === -1) return;
    const [dragged] = stampLibrary.splice(fromIndex, 1);
    dragged.folderId = targetFolderId;
    if (beforeStampId != null) {
      const toIndex = stampLibrary.findIndex((s) => s.id === beforeStampId);
      stampLibrary.splice(toIndex === -1 ? stampLibrary.length : toIndex, 0, dragged);
    } else {
      stampLibrary.push(dragged);
    }
    saveStampsToStorage();
    renderStampList();
  }

  function renderStampChip(stamp) {
    const locked = stamp.gridShape !== state.gridShape;
    const chip = document.createElement("div");
    chip.className = "stamp-chip" + (armedStamp && armedStamp.id === stamp.id ? " is-armed" : "") + (locked ? " is-locked" : "");
    chip.title = locked
      ? `Captured on a ${stamp.gridShape} grid — switch grid shape to use it`
      : "Click to arm, then click the board to place. Drag to reorder or drop onto a folder.";
    chip.draggable = true;

    const preview = document.createElement("canvas");
    preview.className = "stamp-chip-preview";
    chip.appendChild(preview);

    const meta = document.createElement("div");
    meta.className = "stamp-chip-meta";

    const name = document.createElement("span");
    name.className = "stamp-chip-name";
    name.textContent = stamp.name;
    meta.appendChild(name);

    const tag = document.createElement("span");
    tag.className = "stamp-chip-tag";
    tag.textContent = stamp.gridShape;
    meta.appendChild(tag);

    const del = document.createElement("button");
    del.type = "button";
    del.className = "stamp-chip-del";
    del.textContent = "×";
    del.setAttribute("aria-label", `Delete stamp ${stamp.name}`);
    del.addEventListener("click", (ev) => {
      ev.stopPropagation();
      stampLibrary = stampLibrary.filter((s) => s.id !== stamp.id);
      if (armedStamp && armedStamp.id === stamp.id) setTool("paint");
      saveStampsToStorage();
      renderStampList();
    });
    meta.appendChild(del);

    chip.appendChild(meta);

    chip.addEventListener("click", () => {
      if (locked) return;
      if (armedStamp && armedStamp.id === stamp.id) setTool("paint");
      else armStamp(stamp);
    });

    chip.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", String(stamp.id));
      e.dataTransfer.effectAllowed = "move";
      chip.classList.add("is-dragging");
    });
    chip.addEventListener("dragend", () => chip.classList.remove("is-dragging"));
    chip.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      chip.classList.add("is-drop-target");
    });
    chip.addEventListener("dragleave", () => chip.classList.remove("is-drop-target"));
    chip.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      chip.classList.remove("is-drop-target");
      moveDraggedStamp(Number(e.dataTransfer.getData("text/plain")), stamp.folderId || null, stamp.id);
    });

    renderStampPreview(preview, stamp);
    return chip;
  }

  function renderStampGroup(container, folderId, stamps) {
    const grid = document.createElement("div");
    grid.className = "stamp-grid";
    grid.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      grid.classList.add("is-drop-target");
    });
    grid.addEventListener("dragleave", () => grid.classList.remove("is-drop-target"));
    grid.addEventListener("drop", (e) => {
      e.preventDefault();
      grid.classList.remove("is-drop-target");
      moveDraggedStamp(Number(e.dataTransfer.getData("text/plain")), folderId, null);
    });
    stamps.forEach((s) => grid.appendChild(renderStampChip(s)));
    container.appendChild(grid);
  }

  function renderStampList() {
    stampListEl.innerHTML = "";
    stampEmptyHint.hidden = stampLibrary.length > 0;

    stampFolders.forEach((folder) => {
      const folderEl = document.createElement("div");
      folderEl.className = "stamp-folder" + (folder.collapsed ? " is-collapsed" : "");

      const header = document.createElement("div");
      header.className = "stamp-folder-header";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "stamp-folder-toggle";
      toggle.setAttribute("aria-expanded", String(!folder.collapsed));
      toggle.innerHTML = '<svg class="chevron-icon" viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2.5 4.5l3.5 3 3.5-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      toggle.addEventListener("click", () => {
        folder.collapsed = !folder.collapsed;
        saveStampsToStorage();
        renderStampList();
      });
      header.appendChild(toggle);

      const name = document.createElement("span");
      name.className = "stamp-folder-name";
      name.textContent = `${folder.name} (${stampsInFolder(folder.id).length})`;
      header.appendChild(name);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "stamp-folder-del";
      del.textContent = "×";
      del.setAttribute("aria-label", `Delete folder ${folder.name}`);
      del.addEventListener("click", (ev) => {
        ev.stopPropagation();
        stampLibrary.forEach((s) => { if ((s.folderId || null) === folder.id) s.folderId = null; });
        stampFolders = stampFolders.filter((f) => f.id !== folder.id);
        saveStampsToStorage();
        renderStampList();
      });
      header.appendChild(del);

      header.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        header.classList.add("is-drop-target");
      });
      header.addEventListener("dragleave", () => header.classList.remove("is-drop-target"));
      header.addEventListener("drop", (e) => {
        e.preventDefault();
        header.classList.remove("is-drop-target");
        moveDraggedStamp(Number(e.dataTransfer.getData("text/plain")), folder.id, null);
      });

      folderEl.appendChild(header);
      if (!folder.collapsed) renderStampGroup(folderEl, folder.id, stampsInFolder(folder.id));
      stampListEl.appendChild(folderEl);
    });

    const ungrouped = stampsInFolder(null);
    if (ungrouped.length > 0 || stampFolders.length > 0) {
      renderStampGroup(stampListEl, null, ungrouped);
    }
  }

  btnFolderNew.addEventListener("click", () => {
    folderNewRow.hidden = false;
    folderNameInput.value = "";
    folderNameInput.focus();
  });
  btnFolderCancel.addEventListener("click", () => { folderNewRow.hidden = true; });
  btnFolderCreate.addEventListener("click", () => {
    const name = folderNameInput.value.trim() || `Folder ${stampFolderIdCounter}`;
    stampFolders.push({ id: stampFolderIdCounter++, name, collapsed: false });
    folderNewRow.hidden = true;
    saveStampsToStorage();
    renderStampList();
  });
  folderNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btnFolderCreate.click();
    else if (e.key === "Escape") btnFolderCancel.click();
  });

