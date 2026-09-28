const INTERACTION_SETTINGS = {
  atomHitRadius: 10,
  bondHitRadius: 6,
  bondLength: 50,
  angleSnapSteps: [30, 36],
  dragThreshold: 4,
  flashClassDurationMs: 400,
  ghostRadius: 60,
  ghostSnapTolerance: 15,
  mergeRadius: 12,
  mergeRadiusMax: 18,
  maxCharge: 3,
  wheelZoomSpeed: 0.0015,
  pinchWheelZoomSpeed: 0.01,
  touchSlop: 8,
  doubleTapMs: 350,
  doubleTapDistance: 24,
  longPressMs: 550,
  arrowSnapDegrees: 15,
  minArrowLength: 12,
  textHitPad: 4,
};

class Interactions {
  constructor(canvas, graph, renderer) {
    this.canvas = canvas;
    this.graph = graph;
    this.renderer = renderer;
    this.selectedElement = 'C';
    this.selectedStamp = null;
    this.tool = 'draw';
    this.spaceHeld = false;
    this.dragOriginAtomId = null;
    this.dragStart = null;
    this.dragMove = null;
    this.panStart = null;
    this.erasing = false;
    this.moving = false;
    this.flashClassTimer = null;
    this.ghost = null;
    this.ghostSignature = null;
    this.hover = null;
    this.lastScreenPoint = null;
    this.selection = new Set();
    this.renderer.selection = this.selection;
    this.annotationSelection = new Set();
    this.renderer.annotationSelection = this.annotationSelection;
    this.marquee = null;
    this.arrowDrag = null;
    this.arrowStyle = 'forward';
    this.curlyStyle = 'electron';
  }

  setSelectedElement(element) {
    this.selectedElement = element;
    this.selectedStamp = null;
  }

  setSelectedStamp(stampKey) {
    this.selectedStamp = stampKey;
  }

  setTool(tool) {
    this.tool = tool;
    this.canvas.classList.toggle('tool-move', tool === 'move');
    this.canvas.classList.toggle('tool-erase', tool === 'erase');
    this.canvas.classList.toggle('tool-select', tool === 'select');
    this.canvas.classList.toggle('tool-arrow', tool === 'arrow' || tool === 'curly');
    this.canvas.classList.toggle('tool-text', tool === 'text');
    this.canvas.classList.toggle('tool-plus', tool === 'plus');
    this.updateGhost(null);
  }

  setSpaceHeld(held) {
    this.spaceHeld = held;
    this.canvas.classList.toggle('panning-ready', held);
  }

  bind() {
    this.canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
    window.addEventListener('mouseup', (event) => this.onMouseUp(event));
    this.canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
    window.addEventListener('mousemove', (event) => {
      if (event.target !== this.canvas && (this.panStart || this.dragMove || this.marquee || this.arrowDrag)) {
        this.onMouseMove(event);
      }
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.updateGhost(null);
      this.setHover(null);
      this.lastScreenPoint = null;
    });
    this.canvas.addEventListener('contextmenu', (event) => this.onContextMenu(event));
    this.canvas.addEventListener('wheel', (event) => this.onWheel(event), { passive: false });
    this.touch = { pending: null, active: false, last: null, pinch: null, lastTap: null };
    this.canvas.addEventListener('touchstart', (event) => this.onTouchStart(event), { passive: false });
    this.canvas.addEventListener('touchmove', (event) => this.onTouchMove(event), { passive: false });
    this.canvas.addEventListener('touchend', (event) => this.onTouchEnd(event), { passive: false });
    this.canvas.addEventListener('touchcancel', (event) => this.onTouchEnd(event), { passive: false });
  }

  touchMouseEvent(point, detail) {
    return {
      clientX: point.x,
      clientY: point.y,
      button: 0,
      shiftKey: false,
      altKey: false,
      detail: detail || 1,
      target: this.canvas,
      preventDefault() {},
    };
  }

  touchPinchState(touches) {
    const a = { x: touches[0].clientX, y: touches[0].clientY };
    const b = { x: touches[1].clientX, y: touches[1].clientY };
    const rect = this.canvas.getBoundingClientRect();
    return {
      distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      mid: { x: (a.x + b.x) / 2 - rect.left, y: (a.y + b.y) / 2 - rect.top },
    };
  }

  beginTouchPress() {
    clearTimeout(this.touch.longPress);
    const pending = this.touch.pending;
    this.touch.pending = null;
    const lastTap = this.touch.lastTap;
    const repeat =
      lastTap &&
      pending.time - lastTap.time < INTERACTION_SETTINGS.doubleTapMs &&
      Math.hypot(pending.point.x - lastTap.point.x, pending.point.y - lastTap.point.y) < INTERACTION_SETTINGS.doubleTapDistance;
    this.touch.detail = repeat ? 2 : 1;
    this.onMouseMove(this.touchMouseEvent(pending.point));
    this.onMouseDown(this.touchMouseEvent(pending.point, this.touch.detail));
    this.touch.active = true;
    this.touch.last = pending.point;
  }

  endTouchPress(point) {
    if (!this.touch.active) {
      return;
    }
    this.touch.active = false;
    this.onMouseUp(this.touchMouseEvent(point, this.touch.detail));
    this.touch.lastTap = this.touch.detail === 2 ? null : { point, time: Date.now() };
  }

  onTouchStart(event) {
    event.preventDefault();
    if (event.touches.length >= 2) {
      clearTimeout(this.touch.longPress);
      this.touch.pending = null;
      if (this.touch.active) {
        this.endTouchPress(this.touch.last);
      }
      const state = this.touchPinchState(event.touches);
      this.touch.pinch = {
        distance: state.distance,
        mid: state.mid,
        view: { x: this.renderer.view.x, y: this.renderer.view.y, scale: this.renderer.view.scale },
      };
      this.updateGhost(null);
      this.setHover(null);
      return;
    }
    if (this.touch.pinch || this.touch.active) {
      return;
    }
    const touch = event.changedTouches[0];
    const pending = { point: { x: touch.clientX, y: touch.clientY }, time: Date.now() };
    this.touch.pending = pending;
    clearTimeout(this.touch.longPress);
    this.touch.longPress = setTimeout(() => {
      if (this.touch.pending === pending) {
        this.touch.pending = null;
        this.onContextMenu(this.touchMouseEvent(pending.point));
      }
    }, INTERACTION_SETTINGS.longPressMs);
  }

  onTouchMove(event) {
    event.preventDefault();
    const pinch = this.touch.pinch;
    if (pinch) {
      if (event.touches.length < 2) {
        return;
      }
      const state = this.touchPinchState(event.touches);
      const view = this.renderer.view;
      const scale = Math.min(RENDER_SETTINGS.maxScale, Math.max(RENDER_SETTINGS.minScale, pinch.view.scale * (state.distance / pinch.distance)));
      const worldX = (pinch.mid.x - pinch.view.x) / pinch.view.scale;
      const worldY = (pinch.mid.y - pinch.view.y) / pinch.view.scale;
      view.scale = scale;
      view.x = state.mid.x - worldX * scale;
      view.y = state.mid.y - worldY * scale;
      this.renderer.render();
      if (this.onViewChange) {
        this.onViewChange();
      }
      return;
    }
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    const point = { x: touch.clientX, y: touch.clientY };
    const pending = this.touch.pending;
    if (pending) {
      if (Math.hypot(point.x - pending.point.x, point.y - pending.point.y) < INTERACTION_SETTINGS.touchSlop) {
        return;
      }
      this.beginTouchPress();
    }
    if (this.touch.active) {
      this.touch.last = point;
      this.onMouseMove(this.touchMouseEvent(point));
    }
  }

  onTouchEnd(event) {
    event.preventDefault();
    if (this.touch.pinch) {
      if (event.touches.length === 0) {
        this.touch.pinch = null;
      }
      return;
    }
    if (this.touch.pending) {
      const point = this.touch.pending.point;
      this.beginTouchPress();
      this.endTouchPress(point);
    } else if (this.touch.active && event.touches.length === 0) {
      const touch = event.changedTouches[0];
      this.endTouchPress(touch ? { x: touch.clientX, y: touch.clientY } : this.touch.last);
    }
    this.updateGhost(null);
    this.setHover(null);
  }

  screenPointFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  pointFromEvent(event) {
    return this.renderer.toWorld(this.screenPointFromEvent(event));
  }

  hiddenAtomIds() {
    return this.renderer.hiddenAtoms || new Set();
  }

  atomAt(point) {
    const hidden = this.hiddenAtomIds();
    for (let i = this.graph.atoms.length - 1; i >= 0; i--) {
      const atom = this.graph.atoms[i];
      if (hidden.has(atom.id)) {
        continue;
      }
      if (Math.hypot(atom.x - point.x, atom.y - point.y) <= INTERACTION_SETTINGS.atomHitRadius) {
        return atom;
      }
    }
    return null;
  }

  bondAt(point) {
    const hidden = this.hiddenAtomIds();
    for (let i = this.graph.bonds.length - 1; i >= 0; i--) {
      const bond = this.graph.bonds[i];
      if (hidden.has(bond.atomA) || hidden.has(bond.atomB)) {
        continue;
      }
      const a = this.graph.getAtom(bond.atomA);
      const b = this.graph.getAtom(bond.atomB);
      if (!a || !b) {
        continue;
      }
      if (distanceToSegment(point, a, b) <= INTERACTION_SETTINGS.bondHitRadius) {
        return bond;
      }
    }
    return null;
  }

  annotationAt(point) {
    for (let i = this.graph.annotations.length - 1; i >= 0; i--) {
      const annotation = this.graph.annotations[i];
      if (annotation.kind === 'arrow') {
        const path = arrowPathPoints(annotation);
        for (let k = 1; k < path.length; k++) {
          if (distanceToSegment(point, path[k - 1], path[k]) <= INTERACTION_SETTINGS.bondHitRadius + 2) {
            return annotation;
          }
        }
        continue;
      }
      const box = this.renderer.annotationBounds(annotation);
      const pad = INTERACTION_SETTINGS.textHitPad;
      if (point.x >= box.minX - pad && point.x <= box.maxX + pad && point.y >= box.minY - pad && point.y <= box.maxY + pad) {
        return annotation;
      }
    }
    return null;
  }

  hitTest(event) {
    const screen = this.screenPointFromEvent(event);
    const nameBox = this.renderer.nameAt(screen);
    if (nameBox) {
      return { type: 'name', id: nameBox.atomIds[0], box: nameBox };
    }
    const point = this.renderer.toWorld(screen);
    if (this.tool === 'arrow' || this.tool === 'curly') {
      const arrow = this.annotationAt(point);
      if (arrow && arrow.kind === 'arrow') {
        return { type: 'annotation', id: arrow.id, annotation: arrow };
      }
    }
    const atom = this.atomAt(point);
    if (atom) {
      return { type: 'atom', id: atom.id, atom };
    }
    const bond = this.bondAt(point);
    if (bond) {
      return { type: 'bond', id: bond.id, bond };
    }
    const annotation = this.annotationAt(point);
    if (annotation) {
      return { type: 'annotation', id: annotation.id, annotation };
    }
    return null;
  }

  setHover(hover) {
    this.hover = hover;
    this.renderer.setHover(hover);
    if (this.onHoverChange) {
      this.onHoverChange(hover);
    }
  }

  componentAtomIds(atomId) {
    const component = this.graph.connectedComponents().find((c) => c.atomIds.includes(atomId));
    return component ? component.atomIds : [atomId];
  }

  onWheel(event) {
    event.preventDefault();
    const lineScale = event.deltaMode === 1 ? 16 : 1;
    const trackpadScroll = !event.ctrlKey && event.deltaMode === 0 && (event.deltaX !== 0 || !Number.isInteger(event.deltaY));
    if (trackpadScroll) {
      this.renderer.panBy(-event.deltaX, -event.deltaY);
    } else {
      const speed = event.ctrlKey && Math.abs(event.deltaY) < 50 ? INTERACTION_SETTINGS.pinchWheelZoomSpeed : INTERACTION_SETTINGS.wheelZoomSpeed;
      const factor = Math.exp(-event.deltaY * speed * lineScale);
      this.renderer.zoomAt(this.screenPointFromEvent(event), factor);
    }
    if (this.onViewChange) {
      this.onViewChange();
    }
  }

  beginPan(event) {
    this.panStart = { screen: this.screenPointFromEvent(event), view: { x: this.renderer.view.x, y: this.renderer.view.y } };
    this.canvas.classList.add('panning');
    this.updateGhost(null);
  }

  onMouseDown(event) {
    if (event.button === 1) {
      event.preventDefault();
      const hit = this.hitTest(event);
      if (!hit) {
        this.beginPan(event);
        return;
      }
      if (hit.type === 'annotation') {
        return;
      }
      const atomId = hit.type === 'name' ? hit.box.atomIds[0] : hit.type === 'atom' ? hit.id : hit.bond.atomA;
      if (this.onSaveStamp) {
        this.onSaveStamp(atomId);
      }
      return;
    }
    if (event.button !== 0) {
      return;
    }
    if (this.spaceHeld) {
      this.beginPan(event);
      return;
    }
    const hit = this.hitTest(event);
    if (hit && hit.type === 'name') {
      this.renderer.copyName(hit.box.label);
      return;
    }
    const point = this.pointFromEvent(event);
    if (this.tool === 'erase') {
      this.erasing = true;
      this.eraseAt(point);
      return;
    }
    if (this.tool === 'arrow' || this.tool === 'curly') {
      this.beginArrow(point, hit);
      return;
    }
    if (this.tool === 'plus' && !(hit && hit.type === 'annotation')) {
      this.graph.addAnnotation({ kind: 'plus', x: point.x, y: point.y });
      this.renderer.render();
      return;
    }
    if (this.tool === 'text') {
      this.requestTextEdit(hit && hit.type === 'annotation' && hit.annotation.kind === 'text' ? hit.annotation : null, point);
      return;
    }
    if (hit && hit.type === 'annotation') {
      this.annotationPress(event, point, hit.annotation);
      return;
    }
    const atom = hit && hit.type === 'atom' ? hit.atom : null;
    const bond = hit && hit.type === 'bond' ? hit.bond : null;
    if (!atom && !bond && (this.tool === 'select' || event.shiftKey)) {
      this.beginMarquee(event, event.shiftKey);
      return;
    }
    if (this.tool === 'select') {
      this.selectPress(event, point, atom, bond);
      return;
    }
    if (this.tool === 'move' || (event.shiftKey && atom)) {
      if (!atom && !bond) {
        this.beginPan(event);
        return;
      }
      const seedId = atom ? atom.id : bond.atomA;
      let atomIds;
      let annotationIds = [];
      if (this.tool === 'move' && this.selection.has(seedId) && !event.shiftKey) {
        atomIds = this.selectedAtomIds();
        annotationIds = Array.from(this.annotationSelection);
      } else {
        const wholeMolecule = this.tool === 'move' ? !event.shiftKey || !atom : false;
        atomIds = wholeMolecule ? this.componentAtomIds(seedId) : [seedId];
      }
      this.beginDragMove(point, atomIds, null, annotationIds);
      return;
    }
    if (this.selection.size > 0) {
      this.clearSelection();
    }
    if (!atom && this.commitGhost(point)) {
      return;
    }
    this.dragStart = point;
    this.dragStartScreen = this.screenPointFromEvent(event);
    this.dragOriginAtomId = atom ? atom.id : null;
  }

  beginDragMove(point, atomIds, clickSelection, annotationIds) {
    this.dragMove = {
      start: point,
      clickSelection,
      origins: withAbbreviationMembers(this.graph, atomIds)
        .map((id) => this.graph.getAtom(id))
        .filter((target) => target)
        .map((target) => ({ atom: target, x: target.x, y: target.y })),
      annotations: (annotationIds || [])
        .map((id) => this.graph.getAnnotation(id))
        .filter((target) => target)
        .map((target) => ({ annotation: target, base: Object.assign({}, target) })),
    };
    this.moving = true;
    this.canvas.classList.add('panning');
    this.updateGhost(null);
  }

  annotationPress(event, point, annotation) {
    if (event.detail >= 2 && annotation.kind === 'text') {
      this.requestTextEdit(annotation, point);
      return;
    }
    if (this.tool === 'select') {
      if (event.shiftKey) {
        if (this.annotationSelection.has(annotation.id)) {
          this.annotationSelection.delete(annotation.id);
        } else {
          this.annotationSelection.add(annotation.id);
        }
        this.selectionChanged();
        return;
      }
      if (!this.annotationSelection.has(annotation.id)) {
        this.setSelection([]);
        this.annotationSelection.add(annotation.id);
        this.selectionChanged();
      }
      this.beginDragMove(point, this.selectedAtomIds(), null, Array.from(this.annotationSelection));
      return;
    }
    if (this.tool === 'move' && this.annotationSelection.has(annotation.id)) {
      this.beginDragMove(point, this.selectedAtomIds(), null, Array.from(this.annotationSelection));
      return;
    }
    if (this.tool !== 'move') {
      this.clearSelection();
    }
    this.beginDragMove(point, [], null, [annotation.id]);
  }

  requestTextEdit(annotation, point) {
    this.updateGhost(null);
    if (this.onEditText) {
      this.onEditText(annotation, annotation ? { x: annotation.x, y: annotation.y } : point);
    }
  }

  beginArrow(point, hit) {
    this.arrowDrag = {
      start: this.tool === 'curly' ? this.curlySnap(point) : point,
      hitId: hit && hit.type === 'annotation' && hit.annotation.kind === 'arrow' ? hit.id : null,
    };
    this.renderer.arrowDraft = null;
    this.updateGhost(null);
  }

  curlySnap(point) {
    const atom = this.atomAt(point);
    if (atom) {
      return { x: atom.x, y: atom.y };
    }
    const bond = this.bondAt(point);
    if (bond) {
      const a = this.graph.getAtom(bond.atomA);
      const b = this.graph.getAtom(bond.atomB);
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    return point;
  }

  arrowEnd(start, point, free) {
    if (this.tool === 'curly') {
      return this.curlySnap(point);
    }
    if (free) {
      return point;
    }
    const step = (INTERACTION_SETTINGS.arrowSnapDegrees * Math.PI) / 180;
    const angle = Math.round(Math.atan2(point.y - start.y, point.x - start.x) / step) * step;
    const length = Math.hypot(point.x - start.x, point.y - start.y);
    return { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length };
  }

  setArrowStyle(annotation, style) {
    annotation.style = style;
    if (isCurvedArrow(annotation)) {
      this.curlyStyle = style;
      if (!Number.isFinite(annotation.bend)) {
        annotation.bend = defaultArrowBend(Math.hypot(annotation.x2 - annotation.x1, annotation.y2 - annotation.y1));
      }
    } else {
      this.arrowStyle = style;
    }
    this.renderer.render();
  }

  cycleArrowStyle(annotation) {
    const family = ARROW_STYLES.filter((style) => isCurvedArrow({ style }) === isCurvedArrow(annotation));
    const index = family.indexOf(annotation.style);
    this.setArrowStyle(annotation, family[(index + 1) % family.length]);
  }

  flipArrowBend(annotation) {
    annotation.bend = -arrowBend(annotation);
    this.renderer.render();
  }

  reverseArrow(annotation) {
    const x1 = annotation.x1;
    const y1 = annotation.y1;
    annotation.x1 = annotation.x2;
    annotation.y1 = annotation.y2;
    annotation.x2 = x1;
    annotation.y2 = y1;
    this.renderer.render();
  }

  finishArrow() {
    const drag = this.arrowDrag;
    const draft = this.renderer.arrowDraft;
    this.arrowDrag = null;
    this.renderer.arrowDraft = null;
    if (draft && Math.hypot(draft.x2 - draft.x1, draft.y2 - draft.y1) >= INTERACTION_SETTINGS.minArrowLength) {
      const arrow = { kind: 'arrow', x1: draft.x1, y1: draft.y1, x2: draft.x2, y2: draft.y2, style: draft.style };
      if (isCurvedArrow(arrow)) {
        arrow.bend = defaultArrowBend(Math.hypot(arrow.x2 - arrow.x1, arrow.y2 - arrow.y1));
      }
      this.graph.addAnnotation(arrow);
      this.renderer.render();
      return;
    }
    const target = drag.hitId !== null ? this.graph.getAnnotation(drag.hitId) : null;
    if (target) {
      this.cycleArrowStyle(target);
      return;
    }
    this.renderer.render();
  }

  moveAnnotation(annotation, base, dx, dy) {
    if (annotation.kind === 'arrow') {
      annotation.x1 = base.x1 + dx;
      annotation.y1 = base.y1 + dy;
      annotation.x2 = base.x2 + dx;
      annotation.y2 = base.y2 + dy;
    } else {
      annotation.x = base.x + dx;
      annotation.y = base.y + dy;
    }
  }

  selectPress(event, point, atom, bond) {
    let ids = atom ? [atom.id] : [bond.atomA, bond.atomB];
    if (event.detail >= 2) {
      ids = this.componentAtomIds(ids[0]);
    }
    if (event.shiftKey) {
      const allSelected = ids.every((id) => this.selection.has(id));
      ids.forEach((id) => (allSelected ? this.selection.delete(id) : this.selection.add(id)));
      this.selectionChanged();
      return;
    }
    const alreadySelected = ids.every((id) => this.selection.has(id));
    if (!alreadySelected) {
      this.setSelection(ids);
    }
    this.beginDragMove(point, this.selectedAtomIds(), alreadySelected && event.detail < 2 ? ids : null, Array.from(this.annotationSelection));
  }

  beginMarquee(event, additive) {
    const screen = this.screenPointFromEvent(event);
    this.marquee = {
      start: screen,
      base: additive ? new Set(this.selection) : new Set(),
      annotationBase: additive ? new Set(this.annotationSelection) : new Set(),
    };
    if (!additive) {
      this.selection.clear();
      this.annotationSelection.clear();
    }
    this.renderer.marquee = { x0: screen.x, y0: screen.y, x1: screen.x, y1: screen.y };
    this.updateGhost(null);
    this.selectionChanged();
  }

  updateMarquee(screen) {
    const start = this.marquee.start;
    const rect = {
      x0: Math.min(start.x, screen.x),
      y0: Math.min(start.y, screen.y),
      x1: Math.max(start.x, screen.x),
      y1: Math.max(start.y, screen.y),
    };
    this.renderer.marquee = rect;
    const a = this.renderer.toWorld({ x: rect.x0, y: rect.y0 });
    const b = this.renderer.toWorld({ x: rect.x1, y: rect.y1 });
    this.selection.clear();
    this.marquee.base.forEach((id) => this.selection.add(id));
    const hidden = this.hiddenAtomIds();
    this.graph.atoms.forEach((atom) => {
      if (!hidden.has(atom.id) && atom.x >= a.x && atom.x <= b.x && atom.y >= a.y && atom.y <= b.y) {
        this.selection.add(atom.id);
      }
    });
    this.annotationSelection.clear();
    this.marquee.annotationBase.forEach((id) => this.annotationSelection.add(id));
    this.graph.annotations.forEach((annotation) => {
      const box = this.renderer.annotationBounds(annotation);
      if (box.minX >= a.x && box.maxX <= b.x && box.minY >= a.y && box.maxY <= b.y) {
        this.annotationSelection.add(annotation.id);
      }
    });
    this.selectionChanged();
  }

  selectedAtomIds() {
    return withAbbreviationMembers(this.graph, Array.from(this.selection).filter((id) => this.graph.getAtom(id)));
  }

  setSelection(ids) {
    this.selection.clear();
    this.annotationSelection.clear();
    ids.forEach((id) => this.selection.add(id));
    this.selectionChanged();
  }

  clearSelection() {
    if (this.selection.size === 0 && this.annotationSelection.size === 0) {
      return false;
    }
    this.selection.clear();
    this.annotationSelection.clear();
    this.selectionChanged();
    return true;
  }

  selectionChanged() {
    this.renderer.render();
    if (this.onSelectionChange) {
      this.onSelectionChange();
    }
  }

  hoveredComponentIds() {
    if (!this.hover || (this.hover.type !== 'atom' && this.hover.type !== 'bond')) {
      return [];
    }
    if (this.hover.type === 'bond') {
      const bond = this.graph.getBondById(this.hover.id);
      return bond ? this.componentAtomIds(bond.atomA) : [];
    }
    return this.graph.getAtom(this.hover.id) ? this.componentAtomIds(this.hover.id) : [];
  }

  targetAtomIds() {
    const selected = this.selectedAtomIds();
    return selected.length || this.annotationSelection.size ? selected : this.hoveredComponentIds();
  }

  centroid(atomIds) {
    const bounds = this.renderer.contentBounds(atomIds);
    return bounds ? { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 } : null;
  }

  selectedAnnotationIds() {
    return Array.from(this.annotationSelection).filter((id) => this.graph.getAnnotation(id));
  }

  annotationTargets(atomIds) {
    const hidden = this.hiddenAtomIds();
    return atomIds.every((id) => this.selection.has(id) || hidden.has(id)) ? this.selectedAnnotationIds() : [];
  }

  transformAtoms(atomIds, transform) {
    atomIds = withAbbreviationMembers(this.graph, atomIds);
    const annotationIds = this.annotationTargets(atomIds);
    const bounds = this.renderer.contentBounds(atomIds, annotationIds);
    if (!bounds) {
      return false;
    }
    const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
    const o = transform(0, 0);
    const ex = transform(1, 0);
    const ey = transform(0, 1);
    const mirrored = (ex.x - o.x) * (ey.y - o.y) - (ex.y - o.y) * (ey.x - o.x) < 0;
    const apply = (target, xKey, yKey) => {
      const next = transform(target[xKey] - center.x, target[yKey] - center.y);
      target[xKey] = center.x + next.x;
      target[yKey] = center.y + next.y;
    };
    atomIds.forEach((id) => apply(this.graph.getAtom(id), 'x', 'y'));
    annotationIds.forEach((id) => {
      const annotation = this.graph.getAnnotation(id);
      if (annotation.kind === 'arrow') {
        apply(annotation, 'x1', 'y1');
        apply(annotation, 'x2', 'y2');
        if (mirrored && isCurvedArrow(annotation)) {
          annotation.bend = -arrowBend(annotation);
        }
      } else {
        apply(annotation, 'x', 'y');
      }
    });
    this.updateGhost(null);
    this.renderer.render();
    return true;
  }

  rotateAtoms(atomIds, degrees) {
    const angle = (degrees * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return this.transformAtoms(atomIds, (x, y) => ({ x: x * cos - y * sin, y: x * sin + y * cos }));
  }

  flipAtoms(atomIds, axis) {
    return this.transformAtoms(atomIds, (x, y) => (axis === 'horizontal' ? { x: -x, y } : { x, y: -y }));
  }

  translateAtoms(atomIds, dx, dy) {
    return this.transformAtoms(atomIds, (x, y) => ({ x: x + dx, y: y + dy }));
  }

  deleteAtoms(atomIds) {
    const annotationIds = this.annotationTargets(atomIds);
    if (atomIds.length === 0 && annotationIds.length === 0) {
      return false;
    }
    atomIds.forEach((id) => {
      this.graph.removeAtom(id);
      this.selection.delete(id);
    });
    annotationIds.forEach((id) => {
      this.graph.removeAnnotation(id);
      this.annotationSelection.delete(id);
    });
    this.setHover(null);
    this.updateGhost(null);
    this.selectionChanged();
    return true;
  }

  extractFragment(atomIds, annotationIds) {
    const ids = new Set(atomIds);
    const fragment = {
      format: 'chemical-graph-fragment',
      atoms: this.graph.atoms
        .filter((a) => ids.has(a.id))
        .map((a) => {
          const entry = { id: a.id, element: a.element, x: a.x, y: a.y };
          if (a.charge) {
            entry.charge = a.charge;
          }
          if (a.abbr) {
            entry.abbr = a.abbr;
          }
          if (a.abbrHidden) {
            entry.abbrHidden = true;
          }
          return entry;
        }),
      bonds: this.graph.bonds
        .filter((b) => ids.has(b.atomA) && ids.has(b.atomB))
        .map((b) => ({ atomA: b.atomA, atomB: b.atomB, order: b.order, stereo: b.stereo || null })),
    };
    if (annotationIds && annotationIds.length) {
      fragment.annotations = annotationIds
        .map((id) => this.graph.getAnnotation(id))
        .filter((a) => a)
        .map((a) => Object.assign({}, a));
    }
    return fragment;
  }

  annotationPoints(annotation) {
    return annotation.kind === 'arrow'
      ? [{ x: annotation.x1, y: annotation.y1 }, { x: annotation.x2, y: annotation.y2 }]
      : [{ x: annotation.x, y: annotation.y }];
  }

  insertFragment(fragment, center) {
    const annotations = fragment && Array.isArray(fragment.annotations)
      ? fragment.annotations.filter((a) => a && (
        (a.kind === 'arrow' && [a.x1, a.y1, a.x2, a.y2].every(Number.isFinite)) ||
        (a.kind === 'plus' && Number.isFinite(a.x) && Number.isFinite(a.y)) ||
        (a.kind === 'text' && Number.isFinite(a.x) && Number.isFinite(a.y) && typeof a.text === 'string' && a.text.trim())))
      : [];
    if (!fragment || !Array.isArray(fragment.atoms) || (fragment.atoms.length === 0 && annotations.length === 0)) {
      return [];
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    fragment.atoms.concat(...annotations.map((a) => this.annotationPoints(a))).forEach((a) => {
      minX = Math.min(minX, a.x);
      minY = Math.min(minY, a.y);
      maxX = Math.max(maxX, a.x);
      maxY = Math.max(maxY, a.y);
    });
    const dx = center.x - (minX + maxX) / 2;
    const dy = center.y - (minY + maxY) / 2;
    const idMap = new Map();
    fragment.atoms.forEach((a) => {
      if (!Object.prototype.hasOwnProperty.call(MAX_VALENCE, a.element) || !Number.isFinite(a.x) || !Number.isFinite(a.y)) {
        return;
      }
      const atom = this.graph.addAtom(a.element, a.x + dx, a.y + dy);
      if (Number.isInteger(a.charge) && a.charge !== 0 && a.element !== 'D' && Math.abs(a.charge) <= INTERACTION_SETTINGS.maxCharge) {
        atom.charge = a.charge;
      }
      if (typeof a.abbr === 'string' && Object.prototype.hasOwnProperty.call(ABBREVIATIONS, a.abbr)) {
        atom.abbr = a.abbr;
      }
      if (a.abbrHidden === true) {
        atom.abbrHidden = true;
      }
      idMap.set(a.id, atom.id);
    });
    (fragment.bonds || []).forEach((b) => {
      if (!idMap.has(b.atomA) || !idMap.has(b.atomB)) {
        return;
      }
      const bond = this.graph.addBond(idMap.get(b.atomA), idMap.get(b.atomB));
      if (bond) {
        bond.order = [1, 2, 3].includes(b.order) ? b.order : 1;
        bond.stereo = bond.order === 1 && (b.stereo === 'wedge' || b.stereo === 'hash') ? b.stereo : null;
      }
    });
    const newIds = Array.from(idMap.values());
    const hidden = abbreviationHiddenIds(this.graph);
    this.graph.atoms.forEach((atom) => {
      if (atom.abbrHidden && !hidden.has(atom.id)) {
        delete atom.abbrHidden;
      }
    });
    const annotationIds = annotations.map((a) => {
      const copy = a.kind === 'arrow'
        ? { kind: 'arrow', x1: a.x1 + dx, y1: a.y1 + dy, x2: a.x2 + dx, y2: a.y2 + dy, style: ARROW_STYLES.includes(a.style) ? a.style : 'forward' }
        : a.kind === 'plus'
          ? { kind: 'plus', x: a.x + dx, y: a.y + dy }
          : { kind: 'text', x: a.x + dx, y: a.y + dy, text: a.text.slice(0, 500) };
      if (isCurvedArrow(copy)) {
        copy.bend = arrowBend(a);
      } else if (copy.kind === 'arrow') {
        ARROW_LABEL_SLOTS.forEach((slot) => {
          if (typeof a[slot] === 'string' && a[slot].trim()) {
            copy[slot] = a[slot].slice(0, 200);
          }
        });
      }
      return this.graph.addAnnotation(copy).id;
    });
    this.selection.clear();
    this.annotationSelection.clear();
    newIds.filter((id) => !hidden.has(id)).forEach((id) => this.selection.add(id));
    annotationIds.forEach((id) => this.annotationSelection.add(id));
    this.selectionChanged();
    return newIds;
  }

  onMouseMove(event) {
    const screen = this.screenPointFromEvent(event);
    this.lastScreenPoint = screen;
    if (this.panStart) {
      this.renderer.view.x = this.panStart.view.x + screen.x - this.panStart.screen.x;
      this.renderer.view.y = this.panStart.view.y + screen.y - this.panStart.screen.y;
      this.renderer.render();
      return;
    }
    if (this.marquee) {
      this.updateMarquee(screen);
      return;
    }
    if (this.arrowDrag) {
      const start = this.arrowDrag.start;
      const end = this.arrowEnd(start, this.renderer.toWorld(screen), event.shiftKey);
      const long = Math.hypot(end.x - start.x, end.y - start.y) >= INTERACTION_SETTINGS.dragThreshold;
      this.renderer.arrowDraft = long ? { x1: start.x, y1: start.y, x2: end.x, y2: end.y, style: this.tool === 'curly' ? this.curlyStyle : this.arrowStyle } : null;
      if (this.renderer.arrowDraft && isCurvedArrow(this.renderer.arrowDraft)) {
        this.renderer.arrowDraft.bend = defaultArrowBend(Math.hypot(end.x - start.x, end.y - start.y));
      }
      this.renderer.render();
      return;
    }
    if (
      this.dragStart &&
      this.dragOriginAtomId === null &&
      Math.hypot(screen.x - this.dragStartScreen.x, screen.y - this.dragStartScreen.y) > INTERACTION_SETTINGS.dragThreshold * 2
    ) {
      this.panStart = { screen: this.dragStartScreen, view: { x: this.renderer.view.x, y: this.renderer.view.y } };
      this.dragStart = null;
      this.canvas.classList.add('panning');
      this.updateGhost(null);
      this.onMouseMove(event);
      return;
    }
    const point = this.renderer.toWorld(screen);
    if (this.dragMove) {
      const dx = point.x - this.dragMove.start.x;
      const dy = point.y - this.dragMove.start.y;
      this.dragMove.origins.forEach((entry) => {
        entry.atom.x = entry.x + dx;
        entry.atom.y = entry.y + dy;
      });
      this.dragMove.annotations.forEach((entry) => this.moveAnnotation(entry.annotation, entry.base, dx, dy));
      this.renderer.mergeTargets = event.altKey ? [] : this.mergePairs(this.dragMove.origins.map((entry) => entry.atom.id)).map((pair) => pair.target);
      this.renderer.render();
      return;
    }
    if (this.erasing) {
      this.eraseAt(point);
      return;
    }
    const hit = this.hitTest(event);
    this.canvas.classList.toggle('over-name', !!hit && hit.type === 'name');
    this.setHover(hit ? { type: hit.type, id: hit.id } : null);
    if (this.dragStart) {
      this.updateGhost(this.computeDragGhost(point));
      return;
    }
    if (this.tool !== 'draw') {
      return;
    }
    this.updateGhost(this.computeGhost(point));
  }

  computeDragGhost(point) {
    if (this.dragOriginAtomId === null) {
      return null;
    }
    const origin = this.graph.getAtom(this.dragOriginAtomId);
    if (!origin || Math.hypot(point.x - this.dragStart.x, point.y - this.dragStart.y) < INTERACTION_SETTINGS.dragThreshold) {
      return null;
    }
    const target = this.atomAt(point);
    if (target && target.id !== origin.id) {
      if (this.graph.getBond(origin.id, target.id)) {
        return null;
      }
      return { mode: 'connect', originAtomId: origin.id, targetAtomId: target.id };
    }
    if (target) {
      return null;
    }
    return {
      mode: 'place',
      originAtomId: origin.id,
      element: this.selectedStamp ? 'C' : this.selectedElement,
      point: snappedBondTarget(this.graph, origin, point),
    };
  }

  eraseAt(point) {
    const atom = this.atomAt(point);
    if (atom) {
      this.graph.removeAtom(atom.id);
      this.setHover(null);
      this.renderer.render();
      return;
    }
    const bond = this.bondAt(point);
    if (bond) {
      this.graph.removeBond(bond.id);
      this.setHover(null);
      this.renderer.render();
      return;
    }
    const annotation = this.annotationAt(point);
    if (annotation) {
      this.graph.removeAnnotation(annotation.id);
      this.annotationSelection.delete(annotation.id);
      this.setHover(null);
      this.renderer.render();
    }
  }

  nearestGhostOrigin(point) {
    let nearest = null;
    let nearestDistance = Infinity;
    const hidden = this.hiddenAtomIds();
    this.graph.atoms.forEach((atom) => {
      if (hidden.has(atom.id) || abbreviationLocked(this.graph, atom.id)) {
        return;
      }
      const distance = Math.hypot(atom.x - point.x, atom.y - point.y);
      if (distance <= INTERACTION_SETTINGS.atomHitRadius) {
        return;
      }
      if (distance > INTERACTION_SETTINGS.ghostRadius || distance >= nearestDistance) {
        return;
      }
      nearest = atom;
      nearestDistance = distance;
    });
    return nearest;
  }

  atomNear(point, tolerance, excludedAtomId) {
    const hidden = this.hiddenAtomIds();
    for (let i = this.graph.atoms.length - 1; i >= 0; i--) {
      const atom = this.graph.atoms[i];
      if (atom.id === excludedAtomId || hidden.has(atom.id) || abbreviationLocked(this.graph, atom.id)) {
        continue;
      }
      if (Math.hypot(atom.x - point.x, atom.y - point.y) <= tolerance) {
        return atom;
      }
    }
    return null;
  }

  computeGhost(point) {
    if (this.selectedStamp || this.tool !== 'draw') {
      return null;
    }
    if (this.atomAt(point) || this.bondAt(point)) {
      return null;
    }
    const origin = this.nearestGhostOrigin(point);
    if (!origin) {
      return null;
    }
    if (!canAddBond(this.graph, origin.id, 1, this.selectedElement)) {
      return null;
    }

    const target = snappedBondTarget(this.graph, origin, point);
    const existing = this.atomNear(
      target,
      INTERACTION_SETTINGS.ghostSnapTolerance,
      origin.id
    );
    if (existing) {
      if (this.graph.getBond(origin.id, existing.id)) {
        return null;
      }
      if (!canAddBond(this.graph, existing.id, 1, origin.id)) {
        return null;
      }
      return { mode: 'connect', originAtomId: origin.id, targetAtomId: existing.id };
    }

    if (maxValenceFor(this.selectedElement) < 1) {
      return null;
    }
    return {
      mode: 'place',
      originAtomId: origin.id,
      element: this.selectedElement,
      point: target,
    };
  }

  updateGhost(ghost) {
    const signature = ghostSignature(ghost);
    if (signature === this.ghostSignature) {
      return;
    }
    this.ghostSignature = signature;
    this.ghost = ghost;
    this.renderer.setGhost(ghost);
  }

  commitGhost(point) {
    const ghost = this.computeGhost(point);
    if (!ghost) {
      return false;
    }
    if (ghost.mode === 'place') {
      const newAtom = this.graph.addAtom(ghost.element, ghost.point.x, ghost.point.y);
      this.graph.addBond(ghost.originAtomId, newAtom.id);
    } else {
      if (this.graph.getBond(ghost.originAtomId, ghost.targetAtomId)) {
        return false;
      }
      this.graph.addBond(ghost.originAtomId, ghost.targetAtomId);
    }
    this.updateGhost(null);
    this.renderer.render();
    return true;
  }

  onMouseUp(event) {
    if (this.panStart && (event.button === 0 || event.button === 1)) {
      this.panStart = null;
      this.canvas.classList.remove('panning');
      if (this.onViewChange) {
        this.onViewChange();
      }
      return;
    }
    if (event.button !== 0) {
      return;
    }
    if (this.erasing) {
      this.erasing = false;
      return;
    }
    if (this.arrowDrag) {
      this.finishArrow();
      return;
    }
    if (this.marquee) {
      this.marquee = null;
      this.renderer.marquee = null;
      this.selectionChanged();
      return;
    }
    if (this.dragMove) {
      const drag = this.dragMove;
      this.dragMove = null;
      this.moving = false;
      this.canvas.classList.remove('panning');
      const moved = drag.origins.some((entry) => entry.atom.x !== entry.x || entry.atom.y !== entry.y) ||
        drag.annotations.some((entry) => ['x', 'y', 'x1', 'y1'].some((key) => entry.annotation[key] !== entry.base[key]));
      this.renderer.mergeTargets = [];
      if (!moved && drag.clickSelection) {
        this.setSelection(drag.clickSelection);
      }
      if (moved && !event.altKey && drag.origins.length) {
        this.mergeMovedAtoms(drag.origins.map((entry) => entry.atom.id));
      }
      this.renderer.render();
      return;
    }
    if (!this.dragStart) {
      return;
    }
    const start = this.dragStart;
    const originAtomId = this.dragOriginAtomId;
    this.dragStart = null;
    this.dragOriginAtomId = null;
    this.updateGhost(null);

    const point = this.pointFromEvent(event);
    const moved = Math.hypot(point.x - start.x, point.y - start.y) >= INTERACTION_SETTINGS.dragThreshold;

    if (originAtomId !== null) {
      if (!moved) {
        return;
      }
      const target = this.atomAt(point);
      if (target && target.id !== originAtomId) {
        this.bondExistingAtoms(originAtomId, target.id);
      } else if (!target) {
        if (this.selectedStamp) {
          this.attachStamp(originAtomId, point);
        } else {
          this.growChain(originAtomId, point);
        }
      }
      this.renderer.render();
      return;
    }

    if (moved) {
      return;
    }

    const bond = this.bondAt(point);
    if (bond) {
      this.cycleBondOrder(bond);
    } else if (this.selectedStamp) {
      this.placeStandaloneStamp(point);
    } else {
      const atom = this.graph.addAtom(this.selectedElement, point.x, point.y);
      if (ALKALI_METALS.has(atom.element)) {
        atom.charge = 1;
      } else if (DIVALENT_METALS.has(atom.element)) {
        atom.charge = 2;
      }
    }
    this.renderer.render();
  }

  mergePairs(movingIds) {
    const blocked = (id) => {
      const atom = this.graph.getAtom(id);
      return !atom || !!atom.abbr || !!atom.abbrHidden;
    };
    const moving = new Set(movingIds);
    const radius = Math.min(INTERACTION_SETTINGS.mergeRadius / this.renderer.view.scale, INTERACTION_SETTINGS.mergeRadiusMax);
    const candidates = [];
    const stationary = this.graph.atoms.filter((a) => !moving.has(a.id) && !blocked(a.id));
    movingIds.forEach((id) => {
      const atom = this.graph.getAtom(id);
      if (!atom || blocked(id)) {
        return;
      }
      stationary.forEach((other) => {
        const d = Math.hypot(other.x - atom.x, other.y - atom.y);
        if (d <= radius) {
          candidates.push({ source: id, target: other.id, d });
        }
      });
    });
    candidates.sort((a, b) => a.d - b.d);
    const usedSource = new Set();
    const usedTarget = new Set();
    const pairs = [];
    candidates.forEach((c) => {
      if (usedSource.has(c.source) || usedTarget.has(c.target)) {
        return;
      }
      usedSource.add(c.source);
      usedTarget.add(c.target);
      pairs.push(c);
    });
    return pairs;
  }

  mergeMovedAtoms(movingIds) {
    const pairs = this.mergePairs(movingIds);
    if (pairs.length === 0) {
      return 0;
    }
    let ox = 0;
    let oy = 0;
    pairs.forEach((pair) => {
      const source = this.graph.getAtom(pair.source);
      const target = this.graph.getAtom(pair.target);
      ox += target.x - source.x;
      oy += target.y - source.y;
    });
    ox /= pairs.length;
    oy /= pairs.length;
    movingIds.forEach((id) => {
      const atom = this.graph.getAtom(id);
      atom.x += ox;
      atom.y += oy;
    });
    let merged = 0;
    pairs.forEach((pair) => {
      if (this.mergeAtomInto(pair.source, pair.target)) {
        merged += 1;
      }
    });
    if (merged > 0) {
      this.setSelection(this.selectedAtomIds().concat(pairs.map((pair) => pair.target)).filter((id) => this.graph.getAtom(id)));
    }
    if (this.onMerged) {
      this.onMerged(merged, pairs.length - merged);
    }
    return merged;
  }

  mergeAtomInto(sourceId, targetId) {
    const source = this.graph.getAtom(sourceId);
    const target = this.graph.getAtom(targetId);
    if (!source || !target) {
      return false;
    }
    const snapshot = this.graph.bonds.map((b) => Object.assign({}, b));
    const atomIndex = this.graph.atoms.indexOf(source);
    this.graph.bondsForAtom(sourceId).forEach((bond) => {
      const other = bond.atomA === sourceId ? bond.atomB : bond.atomA;
      const existing = other === targetId ? null : this.graph.getBond(targetId, other);
      if (other === targetId || existing) {
        if (existing && bond.order > existing.order) {
          existing.order = bond.order;
          existing.stereo = null;
        }
        this.graph.removeBond(bond.id);
      } else if (bond.atomA === sourceId) {
        bond.atomA = targetId;
      } else {
        bond.atomB = targetId;
      }
    });
    const neighbors = this.graph.bondsForAtom(targetId).map((b) => (b.atomA === targetId ? b.atomB : b.atomA));
    const valid = this.bondsStayValid(targetId) && neighbors.every((id) => this.bondsStayValid(id));
    if (!valid) {
      this.graph.bonds = snapshot;
      return false;
    }
    this.graph.atoms.splice(atomIndex, 1);
    this.selection.delete(sourceId);
    return true;
  }

  attachStamp(originAtomId, point) {
    if (!canAddBond(this.graph, originAtomId, 1) || abbreviationLocked(this.graph, originAtomId)) {
      this.flash([originAtomId]);
      return;
    }
    const placed = placeStamp(this.graph, this.selectedStamp, point, originAtomId);
    if (!placed) {
      this.flash([originAtomId]);
    }
  }

  placeStandaloneStamp(point) {
    placeStamp(this.graph, this.selectedStamp, point, null);
  }

  onContextMenu(event) {
    event.preventDefault();
    const hit = this.hitTest(event);
    if (this.onContext && !(event.shiftKey && hit && hit.type !== 'name')) {
      this.updateGhost(null);
      this.onContext(hit, { x: event.clientX, y: event.clientY }, this.pointFromEvent(event));
      return;
    }
    if (!hit) {
      return;
    }
    if (hit.type === 'name') {
      if (this.onNameContext) {
        this.onNameContext(hit.box);
      }
      return;
    }
    if (hit.type === 'atom') {
      this.graph.removeAtom(hit.id);
    } else if (hit.type === 'annotation') {
      this.graph.removeAnnotation(hit.id);
    } else {
      this.graph.removeBond(hit.id);
    }
    this.setHover(null);
    this.updateGhost(null);
    this.renderer.render();
  }

  hoveredAtom() {
    return this.hover && this.hover.type === 'atom' ? this.graph.getAtom(this.hover.id) : null;
  }

  hoveredBond() {
    return this.hover && this.hover.type === 'bond'
      ? this.graph.bonds.find((b) => b.id === this.hover.id) || null
      : null;
  }

  bondsStayValid(atomId) {
    return this.graph.bondsForAtom(atomId).every((bond) => {
      bond.order -= 1;
      const ok =
        canAddBond(this.graph, bond.atomA, 1, bond.atomB) &&
        canAddBond(this.graph, bond.atomB, 1, bond.atomA);
      bond.order += 1;
      return ok;
    });
  }

  setHoveredElement(element) {
    const atom = this.hoveredAtom();
    if (!atom) {
      return null;
    }
    return this.setAtomElement(atom, element);
  }

  setAtomElement(atom, element) {
    if (atom.element === element) {
      return true;
    }
    if (atom.abbr) {
      this.flash([atom.id]);
      return false;
    }
    const previous = atom.element;
    const previousCharge = atom.charge;
    atom.element = element;
    if (element === 'D') {
      delete atom.charge;
    }
    if (!this.bondsStayValid(atom.id)) {
      atom.element = previous;
      if (previousCharge) {
        atom.charge = previousCharge;
      }
      this.flash([atom.id]);
      return false;
    }
    this.renderer.render();
    return true;
  }

  adjustHoveredCharge(delta) {
    const atom = this.hoveredAtom();
    if (!atom) {
      return null;
    }
    return this.setAtomCharge(atom, (atom.charge || 0) + delta);
  }

  setAtomCharge(atom, charge) {
    const previous = atom.charge || 0;
    if (previous === charge) {
      return true;
    }
    if (atom.element === 'D' || atom.abbr || Math.abs(charge) > INTERACTION_SETTINGS.maxCharge) {
      this.flash([atom.id]);
      return false;
    }
    if (charge) {
      atom.charge = charge;
    } else {
      delete atom.charge;
    }
    if (!this.bondsStayValid(atom.id)) {
      if (previous) {
        atom.charge = previous;
      } else {
        delete atom.charge;
      }
      this.flash([atom.id]);
      return false;
    }
    this.renderer.render();
    return true;
  }

  setHoveredBond(kind) {
    const bond = this.hoveredBond();
    if (!bond) {
      return null;
    }
    return this.setBondKind(bond, kind);
  }

  setBondKind(bond, kind) {
    if (kind === 'wedge' || kind === 'hash') {
      if (bond.order === 1 && bond.stereo === kind) {
        const atomA = bond.atomA;
        bond.atomA = bond.atomB;
        bond.atomB = atomA;
      } else {
        bond.order = 1;
        bond.stereo = kind;
      }
      this.renderer.render();
      return true;
    }
    const delta = kind - bond.order;
    if (delta > 0) {
      const okA = canAddBond(this.graph, bond.atomA, delta, bond.atomB);
      const okB = canAddBond(this.graph, bond.atomB, delta, bond.atomA);
      if (!okA || !okB) {
        this.flash([bond.atomA, bond.atomB]);
        return false;
      }
    }
    bond.order = kind;
    bond.stereo = null;
    this.renderer.render();
    return true;
  }

  hoveredAnnotation() {
    return this.hover && this.hover.type === 'annotation' ? this.graph.getAnnotation(this.hover.id) : null;
  }

  deleteHovered() {
    if (this.selection.size > 0 || this.annotationSelection.size > 0) {
      return this.deleteAtoms(this.selectedAtomIds());
    }
    const annotation = this.hoveredAnnotation();
    if (annotation) {
      this.graph.removeAnnotation(annotation.id);
      this.setHover(null);
      this.renderer.render();
      return true;
    }
    const atom = this.hoveredAtom();
    const bond = this.hoveredBond();
    if (!atom && !bond) {
      return false;
    }
    if (atom) {
      this.graph.removeAtom(atom.id);
    } else {
      this.graph.removeBond(bond.id);
    }
    this.setHover(null);
    this.updateGhost(null);
    this.renderer.render();
    return true;
  }

  growChain(originAtomId, releasePoint) {
    const origin = this.graph.getAtom(originAtomId);
    if (!origin) {
      return;
    }
    if (!canAddBond(this.graph, originAtomId, 1, this.selectedElement) || abbreviationLocked(this.graph, originAtomId)) {
      this.flash([originAtomId]);
      return;
    }
    if (maxValenceFor(this.selectedElement) < 1) {
      this.flash([originAtomId]);
      return;
    }

    const target = snappedBondTarget(this.graph, origin, releasePoint);
    const newAtom = this.graph.addAtom(this.selectedElement, target.x, target.y);
    this.graph.addBond(originAtomId, newAtom.id);
  }

  bondExistingAtoms(atomAId, atomBId) {
    if (this.graph.getBond(atomAId, atomBId)) {
      return;
    }
    const okA = canAddBond(this.graph, atomAId, 1, atomBId) && !abbreviationLocked(this.graph, atomAId);
    const okB = canAddBond(this.graph, atomBId, 1, atomAId) && !abbreviationLocked(this.graph, atomBId);
    if (!okA || !okB) {
      this.flash([atomAId, atomBId]);
      return;
    }
    this.graph.addBond(atomAId, atomBId);
  }

  cycleBondOrder(bond) {
    if (bond.order === 1 && bond.stereo === 'wedge') {
      bond.stereo = 'hash';
      return;
    }
    if (bond.order === 1 && bond.stereo === 'hash') {
      bond.stereo = null;
      return;
    }
    if (bond.order === 3) {
      bond.order = 1;
      bond.stereo = 'wedge';
      return;
    }
    const okA = canAddBond(this.graph, bond.atomA, 1, bond.atomB);
    const okB = canAddBond(this.graph, bond.atomB, 1, bond.atomA);
    if (!okA || !okB) {
      bond.order = 1;
      bond.stereo = 'wedge';
      return;
    }
    bond.order += 1;
  }

  flash(atomIds) {
    atomIds.forEach((id) => this.renderer.flashAtom(id));
    this.canvas.classList.add('valence-blocked');
    if (this.flashClassTimer) {
      clearTimeout(this.flashClassTimer);
    }
    this.flashClassTimer = setTimeout(() => {
      this.canvas.classList.remove('valence-blocked');
      this.flashClassTimer = null;
    }, INTERACTION_SETTINGS.flashClassDurationMs);
    if (this.onBlocked) {
      const elements = atomIds
        .map((id) => this.graph.getAtom(id))
        .filter((a) => a)
        .map((a) => a.element);
      this.onBlocked(elements);
    }
  }
}

function referenceAngleFor(graph, origin) {
  const bonds = graph.bondsForAtom(origin.id);
  if (bonds.length === 0) {
    return null;
  }
  const bond = bonds[0];
  const neighborId = bond.atomA === origin.id ? bond.atomB : bond.atomA;
  const neighbor = graph.getAtom(neighborId);
  if (!neighbor) {
    return null;
  }
  return Math.atan2(neighbor.y - origin.y, neighbor.x - origin.x);
}

function snappedBondTarget(graph, origin, point) {
  const reference = referenceAngleFor(graph, origin);
  const angle = snapAngle(
    Math.atan2(point.y - origin.y, point.x - origin.x),
    INTERACTION_SETTINGS.angleSnapSteps,
    reference
  );
  return {
    x: origin.x + Math.cos(angle) * INTERACTION_SETTINGS.bondLength,
    y: origin.y + Math.sin(angle) * INTERACTION_SETTINGS.bondLength,
  };
}

function ghostSignature(ghost) {
  if (!ghost) {
    return null;
  }
  if (ghost.mode === 'connect') {
    return 'connect:' + ghost.originAtomId + ':' + ghost.targetAtomId;
  }
  return (
    'place:' +
    ghost.originAtomId +
    ':' +
    ghost.element +
    ':' +
    Math.round(ghost.point.x) +
    ':' +
    Math.round(ghost.point.y)
  );
}

function snapAngleCandidates(stepDegreesList, baseDegrees) {
  const base = baseDegrees || 0;
  const degrees = [];
  stepDegreesList.forEach((stepDegrees) => {
    for (let value = 0; value < 360; value += stepDegrees) {
      const rotated = ((value + base) % 360 + 360) % 360;
      if (degrees.indexOf(rotated) === -1) {
        degrees.push(rotated);
      }
    }
  });
  return degrees.map((value) => (value * Math.PI) / 180);
}

function snapAngle(angleRadians, stepDegreesList, referenceAngleRadians) {
  const baseDegrees =
    referenceAngleRadians === null || referenceAngleRadians === undefined
      ? 0
      : (referenceAngleRadians * 180) / Math.PI;
  const candidates = snapAngleCandidates(stepDegreesList, baseDegrees);
  let best = candidates[0];
  let bestDelta = Infinity;
  candidates.forEach((candidate) => {
    let delta = (angleRadians - candidate) % (Math.PI * 2);
    if (delta > Math.PI) {
      delta -= Math.PI * 2;
    }
    if (delta < -Math.PI) {
      delta += Math.PI * 2;
    }
    delta = Math.abs(delta);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = candidate;
    }
  });
  return best;
}

function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}
