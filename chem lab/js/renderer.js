const RENDER_FONT_FAMILY = '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif';

const RENDER_SETTINGS = {
  bondWidth: 2.2,
  bondSpacing: 9,
  innerBondInset: 0.14,
  wedgeWidth: 10,
  hashSpacing: 5,
  hashWidth: 1.6,
  gridSpacing: 24,
  gridDotRadius: 1,
  labelSize: 18,
  subscriptSize: 13,
  chargeSize: 12,
  labelWeight: 500,
  labelGap: 3,
  minLabelPx: 11,
  maxLabelBoost: 1.9,
  chargeRadius: 5,
  labelFont: '500 18px ' + RENDER_FONT_FAMILY,
  subscriptFont: '500 13px ' + RENDER_FONT_FAMILY,
  chargeFont: '600 12px ' + RENDER_FONT_FAMILY,
  mergeRingRadius: 14,
  labelClearRadius: 11,
  carbonDotRadius: 3,
  flashRadius: 16,
  flashDurationMs: 400,
  nameFont: '500 12.5px ' + RENDER_FONT_FAMILY,
  nameOffset: 18,
  nameMaxWidth: 520,
  namePadX: 9,
  namePadY: 5,
  ghostAlpha: 0.38,
  ghostRingRadius: 16,
  hoverAtomRadius: 13,
  hoverBondWidth: 12,
  minScale: 0.2,
  maxScale: 5,
  nameCacheLimit: 300,
  locantFont: '600 10px ' + RENDER_FONT_FAMILY,
  locantOffset: 13,
  locantLabelOffset: 17,
  locantOutwardBias: 0.6,
  locantNameLift: 10,
  annotationFont: '400 15px ' + RENDER_FONT_FAMILY,
  annotationLineHeight: 20,
  annotationSubFont: '400 11px ' + RENDER_FONT_FAMILY,
  annotationSubDrop: 4,
  plusSize: 20,
  plusWidth: 1.8,
  arrowWidth: 1.6,
  arrowHeadLength: 12,
  arrowHeadWidth: 4.5,
  arrowHeadNotch: 0.28,
  arrowGap: 3,
  curvedArrowTrim: 3,
  curvedArrowAtomTrim: 6,
  curvedArrowLabelTrim: 13,
};

const ARROW_STYLES = ['forward', 'equilibrium', 'resonance', 'retro', 'electron', 'fishhook'];

const RENDER_THEMES = {
  dark: {
    background: '#0d1016',
    grid: 'rgba(255, 255, 255, 0.05)',
    bond: '#dde1e8',
    bondGlow: 'rgba(0, 0, 0, 0)',
    glowBlur: 0,
    name: '#b7bdf0',
    nameBg: 'rgba(22, 26, 38, 0.92)',
    nameBorder: 'rgba(124, 140, 248, 0.28)',
    nameHoverBorder: 'rgba(124, 140, 248, 0.85)',
    copied: '#7fe3a1',
    hover: '79, 209, 224',
    selection: '124, 140, 248',
    problem: '248, 113, 113',
    ghostRing: '125, 211, 252',
    flash: '248, 113, 113',
    emptyTitle: 'rgba(230, 233, 239, 0.55)',
    emptyText: 'rgba(139, 147, 163, 0.7)',
    locant: '#f5b86b',
    locantBg: 'rgba(13, 16, 23, 0.82)',
  },
  light: {
    background: '#fbfcfe',
    grid: 'rgba(15, 23, 42, 0.09)',
    bond: '#1f2937',
    bondGlow: 'rgba(0, 0, 0, 0)',
    glowBlur: 0,
    name: '#3b44a8',
    nameBg: 'rgba(255, 255, 255, 0.95)',
    nameBorder: 'rgba(79, 92, 214, 0.25)',
    nameHoverBorder: 'rgba(79, 92, 214, 0.8)',
    copied: '#15803d',
    hover: '8, 145, 178',
    selection: '79, 92, 214',
    problem: '220, 38, 38',
    ghostRing: '14, 116, 144',
    flash: '220, 38, 38',
    emptyTitle: 'rgba(30, 41, 59, 0.55)',
    emptyText: 'rgba(71, 85, 105, 0.7)',
    locant: '#b45309',
    locantBg: 'rgba(251, 252, 254, 0.85)',
  },
};

const IMPLICIT_H_VALENCE = { N: 3, O: 2, S: 2, P: 3, B: 3, Si: 4, Se: 2, Sn: 4 };
fillElementTable(IMPLICIT_H_VALENCE, (element) => (element.implicitHydrogens && ['metalloid', 'post-transition'].includes(element.category) ? element.valences[0] : undefined));

class Renderer {
  constructor(ctx, graph) {
    this.ctx = ctx;
    this.graph = graph;
    this.flashedAtomIds = new Set();
    this.flashTimers = new Map();
    this.ghost = null;
    this.hover = null;
    this.view = { x: 0, y: 0, scale: 1 };
    this.pixelRatio = 1;
    this.theme = 'dark';
    this.showGrid = true;
    this.showEmptyHint = true;
    this.showNames = true;
    this.showLocants = false;
    this.nameCache = new Map();
    this.locantCache = new Map();
    this.nameBoxes = [];
    this.selection = new Set();
    this.valenceMarks = false;
    this.problemAtoms = new Set();
    this.marquee = null;
    this.mergeTargets = [];
    this.annotationSelection = new Set();
    this.arrowDraft = null;
    this.editingAnnotationId = null;
    this.editingArrowLabel = null;
    this.strokeScale = 1;
    this.minLabelPx = RENDER_SETTINGS.minLabelPx;
  }

  get palette() {
    return RENDER_THEMES[this.theme] || RENDER_THEMES.dark;
  }

  viewportSize() {
    return {
      width: this.ctx.canvas.width / this.pixelRatio,
      height: this.ctx.canvas.height / this.pixelRatio,
    };
  }

  toWorld(point) {
    return {
      x: (point.x - this.view.x) / this.view.scale,
      y: (point.y - this.view.y) / this.view.scale,
    };
  }

  toScreen(point) {
    return {
      x: point.x * this.view.scale + this.view.x,
      y: point.y * this.view.scale + this.view.y,
    };
  }

  zoomAt(screenPoint, factor) {
    const scale = Math.min(
      RENDER_SETTINGS.maxScale,
      Math.max(RENDER_SETTINGS.minScale, this.view.scale * factor)
    );
    const ratio = scale / this.view.scale;
    this.view.x = screenPoint.x - (screenPoint.x - this.view.x) * ratio;
    this.view.y = screenPoint.y - (screenPoint.y - this.view.y) * ratio;
    this.view.scale = scale;
    this.render();
  }

  zoomCentered(factor) {
    const size = this.viewportSize();
    this.zoomAt({ x: size.width / 2, y: size.height / 2 }, factor);
  }

  panBy(dx, dy) {
    this.view.x += dx;
    this.view.y += dy;
    this.render();
  }

  contentBounds(atomIds, annotationIds) {
    const hidden = abbreviationHiddenIds(this.graph);
    const atoms = (atomIds
      ? atomIds.map((id) => this.graph.getAtom(id)).filter((a) => a)
      : this.graph.atoms).filter((a) => !hidden.has(a.id));
    const annotations = annotationIds
      ? annotationIds.map((id) => this.graph.getAnnotation(id)).filter((a) => a)
      : atomIds
        ? []
        : this.graph.annotations;
    if (atoms.length === 0 && annotations.length === 0) {
      return null;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    atoms.forEach((atom) => {
      minX = Math.min(minX, atom.x);
      minY = Math.min(minY, atom.y);
      maxX = Math.max(maxX, atom.x);
      maxY = Math.max(maxY, atom.y);
    });
    annotations.forEach((annotation) => {
      const box = this.annotationBounds(annotation);
      minX = Math.min(minX, box.minX);
      minY = Math.min(minY, box.minY);
      maxX = Math.max(maxX, box.maxX);
      maxY = Math.max(maxY, box.maxY);
    });
    return { minX, minY, maxX, maxY };
  }

  annotationLines(annotation) {
    return String(annotation.text || '').split('\n');
  }

  labelSegments(line) {
    const segments = [];
    const pattern = /([A-Za-z)\]])(\d+)/g;
    let last = 0;
    let match;
    while ((match = pattern.exec(line)) !== null) {
      const cut = match.index + match[1].length;
      segments.push({ text: line.slice(last, cut), sub: false });
      segments.push({ text: match[2], sub: true });
      last = cut + match[2].length;
    }
    segments.push({ text: line.slice(last), sub: false });
    return segments.filter((segment) => segment.text);
  }

  measureLabelLine(line) {
    const ctx = this.ctx;
    return this.labelSegments(line).reduce((width, segment) => {
      ctx.font = segment.sub ? RENDER_SETTINGS.annotationSubFont : RENDER_SETTINGS.annotationFont;
      return width + ctx.measureText(segment.text).width;
    }, 0);
  }

  annotationBounds(annotation) {
    if (annotation.kind === 'arrow') {
      const pad = RENDER_SETTINGS.arrowHeadWidth + RENDER_SETTINGS.arrowGap;
      if (isCurvedArrow(annotation)) {
        const points = arrowPathPoints(annotation);
        return {
          minX: Math.min(...points.map((p) => p.x)) - pad,
          minY: Math.min(...points.map((p) => p.y)) - pad,
          maxX: Math.max(...points.map((p) => p.x)) + pad,
          maxY: Math.max(...points.map((p) => p.y)) + pad,
        };
      }
      const box = {
        minX: Math.min(annotation.x1, annotation.x2) - pad,
        minY: Math.min(annotation.y1, annotation.y2) - pad,
        maxX: Math.max(annotation.x1, annotation.x2) + pad,
        maxY: Math.max(annotation.y1, annotation.y2) + pad,
      };
      this.arrowLabels(annotation).forEach((label) => {
        const inner = this.annotationBounds(label);
        box.minX = Math.min(box.minX, inner.minX);
        box.minY = Math.min(box.minY, inner.minY);
        box.maxX = Math.max(box.maxX, inner.maxX);
        box.maxY = Math.max(box.maxY, inner.maxY);
      });
      return box;
    }
    if (annotation.kind === 'plus') {
      const half = RENDER_SETTINGS.plusSize / 2 + 2;
      return { minX: annotation.x - half, minY: annotation.y - half, maxX: annotation.x + half, maxY: annotation.y + half };
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.font = RENDER_SETTINGS.annotationFont;
    const lines = this.annotationLines(annotation);
    const width = Math.max(8, ...lines.map((line) => this.measureLabelLine(line)));
    ctx.restore();
    const height = lines.length * RENDER_SETTINGS.annotationLineHeight;
    return {
      minX: annotation.x - width / 2,
      minY: annotation.y - height / 2,
      maxX: annotation.x + width / 2,
      maxY: annotation.y + height / 2,
    };
  }

  fitToContent(padding) {
    const pad = padding === undefined ? 70 : padding;
    const size = this.viewportSize();
    const bounds = this.contentBounds();
    if (!bounds) {
      this.view = { x: 0, y: 0, scale: 1 };
      this.render();
      return;
    }
    const bw = Math.max(1, bounds.maxX - bounds.minX);
    const bh = Math.max(1, bounds.maxY - bounds.minY);
    const scale = Math.min(
      1.6,
      Math.max(
        RENDER_SETTINGS.minScale,
        Math.min((size.width - pad * 2) / bw, (size.height - pad * 2) / bh)
      )
    );
    this.view.scale = scale;
    this.view.x = size.width / 2 - ((bounds.minX + bounds.maxX) / 2) * scale;
    this.view.y = size.height / 2 - ((bounds.minY + bounds.maxY) / 2) * scale + 10;
    this.render();
  }

  setGhost(ghost) {
    this.ghost = ghost || null;
    this.render();
  }

  setHover(hover) {
    const key = (h) => (h ? h.type + ':' + h.id : '');
    if (key(hover) === key(this.hover)) {
      return;
    }
    this.hover = hover || null;
    this.render();
  }

  flashAtom(atomId) {
    if (this.flashTimers.has(atomId)) {
      clearTimeout(this.flashTimers.get(atomId));
    }
    this.flashedAtomIds.add(atomId);
    const timer = setTimeout(() => {
      this.flashedAtomIds.delete(atomId);
      this.flashTimers.delete(atomId);
      this.render();
    }, RENDER_SETTINGS.flashDurationMs);
    this.flashTimers.set(atomId, timer);
    this.render();
  }

  labelBoost() {
    const scale = this.view.scale || 1;
    return Math.min(RENDER_SETTINGS.maxLabelBoost, Math.max(1, this.minLabelPx / (RENDER_SETTINGS.labelSize * scale)));
  }

  atomFont(kind, boost) {
    const weight = kind === 'charge' ? 600 : RENDER_SETTINGS.labelWeight;
    return weight + ' ' + (RENDER_SETTINGS[kind + 'Size'] * boost).toFixed(2) + 'px ' + RENDER_FONT_FAMILY;
  }

  labelTrim(atom, ux, uy) {
    if (atom.element === 'C' && !atom.charge && !atom.abbr) {
      return 0;
    }
    const boost = this.labelBoost();
    const text = atom.abbr ? 'M' : atom.element;
    const ctx = this.ctx;
    ctx.save();
    ctx.font = this.atomFont('label', boost);
    const halfWidth = ctx.measureText(text).width / 2;
    ctx.restore();
    const gap = RENDER_SETTINGS.labelGap * boost;
    const halfHeight = RENDER_SETTINGS.labelSize * boost * 0.36;
    const tx = Math.abs(ux) > 1e-6 ? (halfWidth + gap) / Math.abs(ux) : Infinity;
    const ty = Math.abs(uy) > 1e-6 ? (halfHeight + gap) / Math.abs(uy) : Infinity;
    return Math.min(tx, ty);
  }

  isLabeled(atom) {
    return atom.element !== 'C' || !!atom.abbr || !!atom.charge || this.graph.bondsForAtom(atom.id).length === 0;
  }

  implicitHydrogens(atom) {
    if (atom.charge) {
      return atom.element === 'D' ? 0 : Math.max(0, valenceFor(atom.element, atom.charge) - this.graph.totalBondOrder(atom.id));
    }
    if (atom.element === 'C') {
      return this.graph.bondsForAtom(atom.id).length === 0 ? 4 : 0;
    }
    if (!Object.prototype.hasOwnProperty.call(IMPLICIT_H_VALENCE, atom.element)) {
      return 0;
    }
    return Math.max(0, IMPLICIT_H_VALENCE[atom.element] - this.graph.totalBondOrder(atom.id));
  }

  render() {
    const ctx = this.ctx;
    const ratio = this.pixelRatio;
    const size = this.viewportSize();
    const view = this.view;
    const palette = this.palette;

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, size.width, size.height);
    if (this.showGrid) {
      this.drawGrid(size.width, size.height);
    }

    ctx.setTransform(ratio * view.scale, 0, 0, ratio * view.scale, ratio * view.x, ratio * view.y);
    this.adjacency = this.buildAdjacency();
    this.hiddenAtoms = abbreviationHiddenIds(this.graph);
    this.problemAtoms = this.valenceMarks ? new Set(valenceProblems(this.graph).map((p) => p.atomId)) : new Set();
    this.drawValenceProblems();
    this.drawSelection();
    this.drawHover();
    this.graph.bonds.forEach((bond) => this.drawBond(bond));
    this.graph.atoms.forEach((atom) => this.drawAtom(atom));
    this.drawAnnotations();
    this.drawMergeTargets();
    this.drawGhost();

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (this.showLocants) {
      this.drawLocants();
    }
    this.nameBoxes = [];
    if (this.showNames) {
      this.drawComponentNames();
    }
    if (this.showEmptyHint && this.graph.isEmpty()) {
      this.drawEmptyHint(size.width, size.height);
    }
    this.drawMarquee();
    if (this.afterRender) {
      this.afterRender();
    }
  }

  buildAdjacency() {
    const adjacency = new Map();
    this.graph.atoms.forEach((atom) => adjacency.set(atom.id, []));
    this.graph.bonds.forEach((bond) => {
      if (adjacency.has(bond.atomA) && adjacency.has(bond.atomB)) {
        adjacency.get(bond.atomA).push(bond.atomB);
        adjacency.get(bond.atomB).push(bond.atomA);
      }
    });
    return adjacency;
  }

  smallestRingCenter(atomAId, atomBId) {
    const adjacency = this.adjacency;
    const previous = new Map([[atomAId, null]]);
    let frontier = [atomAId];
    for (let depth = 0; depth < 8 && frontier.length > 0; depth++) {
      const next = [];
      for (const id of frontier) {
        for (const neighbor of adjacency.get(id) || []) {
          if (id === atomAId && neighbor === atomBId) {
            continue;
          }
          if (previous.has(neighbor)) {
            continue;
          }
          previous.set(neighbor, id);
          if (neighbor === atomBId) {
            let x = 0;
            let y = 0;
            let count = 0;
            for (let cursor = atomBId; cursor !== null; cursor = previous.get(cursor)) {
              const atom = this.graph.getAtom(cursor);
              x += atom.x;
              y += atom.y;
              count++;
            }
            return { x: x / count, y: y / count };
          }
          next.push(neighbor);
        }
      }
      frontier = next;
    }
    return null;
  }

  doubleBondSide(bond, a, b, px, py) {
    const center = this.smallestRingCenter(bond.atomA, bond.atomB);
    if (center) {
      const side = (center.x - a.x) * px + (center.y - a.y) * py;
      return side >= 0 ? 1 : -1;
    }
    const degreeA = (this.adjacency.get(a.id) || []).length;
    const degreeB = (this.adjacency.get(b.id) || []).length;
    if ((degreeA === 1 && a.element !== 'C') || (degreeB === 1 && b.element !== 'C')) {
      return 0;
    }
    if (degreeA === 1 && degreeB === 1) {
      return 0;
    }
    let sum = 0;
    [a, b].forEach((atom) => {
      (this.adjacency.get(atom.id) || []).forEach((otherId) => {
        if (otherId === a.id || otherId === b.id) {
          return;
        }
        const other = this.graph.getAtom(otherId);
        const side = (other.x - atom.x) * px + (other.y - atom.y) * py;
        sum += Math.sign(Math.round(side));
      });
    });
    return sum === 0 ? 0 : Math.sign(sum);
  }

  componentSignature(atomIds) {
    const idSet = new Set(atomIds);
    return (
      this.graph.atoms
        .filter((a) => idSet.has(a.id))
        .map((a) => a.id + a.element + (a.charge ? '^' + a.charge : '') + '@' + Math.round(a.x) + ',' + Math.round(a.y))
        .join(';') +
      '|' +
      this.graph.bonds
        .filter((b) => idSet.has(b.atomA))
        .map((b) => b.atomA + '-' + b.atomB + ':' + b.order + (b.stereo || ''))
        .join(';')
    );
  }

  locantsFor(atomIds) {
    const signature = this.componentSignature(atomIds);
    if (this.locantCache.has(signature)) {
      return this.locantCache.get(signature);
    }
    let result = null;
    try {
      const charged = this.graph.atoms.some((a) => atomIds.includes(a.id) && a.charge);
      result = charged || atomIds.length < 2 ? null : nameStructureLocants(this.graph, atomIds);
    } catch (error) {
      result = null;
    }
    if (this.locantCache.size > RENDER_SETTINGS.nameCacheLimit) {
      this.locantCache.clear();
    }
    this.locantCache.set(signature, result);
    return result;
  }

  locantDirection(atom, centroid) {
    const angles = (this.adjacency.get(atom.id) || [])
      .map((id) => this.graph.getAtom(id))
      .filter((other) => other && (other.x !== atom.x || other.y !== atom.y))
      .map((other) => Math.atan2(other.y - atom.y, other.x - atom.x))
      .sort((a, b) => a - b);
    let outX = atom.x - centroid.x;
    let outY = atom.y - centroid.y;
    const outLength = Math.hypot(outX, outY);
    outX = outLength > 1e-6 ? outX / outLength : 0.6;
    outY = outLength > 1e-6 ? outY / outLength : -0.8;
    if (angles.length === 0) {
      return { x: outX, y: outY };
    }
    let best = null;
    angles.forEach((angle, index) => {
      const next = index + 1 < angles.length ? angles[index + 1] : angles[0] + Math.PI * 2;
      const gap = next - angle;
      const middle = angle + gap / 2;
      const direction = { x: Math.cos(middle), y: Math.sin(middle) };
      const score = gap + RENDER_SETTINGS.locantOutwardBias * (direction.x * outX + direction.y * outY);
      if (!best || score > best.score) {
        best = { score, direction };
      }
    });
    return best.direction;
  }

  drawLocants() {
    const ctx = this.ctx;
    const palette = this.palette;
    ctx.save();
    ctx.font = RENDER_SETTINGS.locantFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    this.graph.connectedComponents().forEach((component) => {
      const result = this.locantsFor(component.atomIds);
      if (!result) {
        return;
      }
      const members = component.atomIds.map((id) => this.graph.getAtom(id)).filter(Boolean);
      const centroid = {
        x: members.reduce((sum, a) => sum + a.x, 0) / members.length,
        y: members.reduce((sum, a) => sum + a.y, 0) / members.length,
      };
      result.locants.forEach((locant, id) => {
        const atom = this.graph.getAtom(id);
        if (!atom || this.hiddenAtoms.has(id)) {
          return;
        }
        const direction = this.locantDirection(atom, centroid);
        const center = this.toScreen(atom);
        const distance = (this.isLabeled(atom) ? RENDER_SETTINGS.locantLabelOffset : RENDER_SETTINGS.locantOffset) * Math.min(1.4, Math.max(0.7, this.view.scale));
        const x = center.x + direction.x * distance;
        const y = center.y + direction.y * distance;
        const text = String(locant);
        const width = ctx.measureText(text).width + 4;
        ctx.fillStyle = palette.locantBg;
        this.roundedRect(x - width / 2, y - 6.5, width, 13, 3);
        ctx.fill();
        ctx.fillStyle = palette.locant;
        ctx.fillText(text, x, y + 0.5);
      });
    });
    ctx.restore();
  }

  nameFor(atomIds) {
    const signature = this.componentSignature(atomIds);
    if (this.nameCache.has(signature)) {
      return this.nameCache.get(signature);
    }
    let label = '';
    try {
      label = nameStructure(this.graph, atomIds) || '';
    } catch (error) {
      label = '';
    }
    if (this.nameCache.size > RENDER_SETTINGS.nameCacheLimit) {
      this.nameCache.clear();
    }
    this.nameCache.set(signature, label);
    return label;
  }

  nameAt(screenPoint) {
    return this.nameBoxes.find(
      (b) => screenPoint.x >= b.x0 && screenPoint.x <= b.x1 && screenPoint.y >= b.y0 && screenPoint.y <= b.y1
    ) || null;
  }

  copyName(label) {
    const done = () => {
      this.copiedLabel = label;
      this.render();
      setTimeout(() => {
        this.copiedLabel = null;
        this.render();
      }, 1200);
      if (this.onCopied) {
        this.onCopied(label);
      }
    };
    copyText(label).then(done, () => {});
  }

  roundedRect(x, y, width, height, radius) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  fitText(text, maxWidth) {
    const ctx = this.ctx;
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }
    let low = 0;
    let high = text.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      if (ctx.measureText(text.slice(0, mid) + '…').width <= maxWidth) {
        low = mid;
      } else {
        high = mid - 1;
      }
    }
    return text.slice(0, low) + '…';
  }

  drawComponentNames() {
    const ctx = this.ctx;
    const palette = this.palette;
    const components = this.graph.connectedComponents();
    if (components.length === 0) {
      return;
    }
    ctx.save();
    ctx.font = RENDER_SETTINGS.nameFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    components.forEach((component) => {
      const bounds = this.contentBounds(component.atomIds);
      if (!bounds) {
        return;
      }
      const label = this.nameFor(component.atomIds);
      if (!label) {
        return;
      }
      const top = this.toScreen({ x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY });
      const copied = this.copiedLabel === label;
      const text = this.fitText(copied ? 'Copied ✓  ' + label : label, RENDER_SETTINGS.nameMaxWidth);
      const width = ctx.measureText(text).width + RENDER_SETTINGS.namePadX * 2;
      const height = 13 + RENDER_SETTINGS.namePadY * 2;
      const x = top.x;
      const y = top.y - RENDER_SETTINGS.nameOffset - (this.showLocants ? RENDER_SETTINGS.locantNameLift : 0) - height / 2;
      const box = {
        label,
        atomIds: component.atomIds,
        x0: x - width / 2,
        x1: x + width / 2,
        y0: y - height / 2,
        y1: y + height / 2,
      };
      this.nameBoxes.push(box);
      const hovered = this.hover && this.hover.type === 'name' && this.hover.id === component.atomIds[0];
      this.roundedRect(box.x0, box.y0, width, height, height / 2);
      ctx.fillStyle = palette.nameBg;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = copied ? palette.copied : hovered ? palette.nameHoverBorder : palette.nameBorder;
      ctx.stroke();
      ctx.fillStyle = copied ? palette.copied : palette.name;
      ctx.fillText(text, x, y + 0.5);
    });
    ctx.restore();
  }

  drawEmptyHint(width, height) {
    const ctx = this.ctx;
    const palette = this.palette;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '500 17px ' + RENDER_FONT_FAMILY;
    ctx.fillStyle = palette.emptyTitle;
    ctx.fillText('Click anywhere to place an atom', width / 2, height / 2 - 22);
    ctx.font = '400 13px ' + RENDER_FONT_FAMILY;
    ctx.fillStyle = palette.emptyText;
    ctx.fillText('Drag from an atom to draw a bond · pick a ring stamp on the left', width / 2, height / 2 + 6);
    ctx.fillText('Paste a SMILES string with Ctrl+V · press ? for shortcuts', width / 2, height / 2 + 26);
    ctx.restore();
  }

  drawSelection() {
    if (!this.selection || this.selection.size === 0) {
      return;
    }
    const ctx = this.ctx;
    const rgb = this.palette.selection;
    ctx.save();
    ctx.strokeStyle = 'rgba(' + rgb + ', 0.3)';
    ctx.lineWidth = RENDER_SETTINGS.hoverBondWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    this.graph.bonds.forEach((bond) => {
      if (!this.selection.has(bond.atomA) || !this.selection.has(bond.atomB) || this.hiddenAtoms.has(bond.atomA) || this.hiddenAtoms.has(bond.atomB)) {
        return;
      }
      const a = this.graph.getAtom(bond.atomA);
      const b = this.graph.getAtom(bond.atomB);
      if (a && b) {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
    });
    ctx.stroke();
    ctx.fillStyle = 'rgba(' + rgb + ', 0.22)';
    ctx.strokeStyle = 'rgba(' + rgb + ', 0.9)';
    ctx.lineWidth = 1.5;
    this.selection.forEach((id) => {
      const atom = this.graph.getAtom(id);
      if (!atom || this.hiddenAtoms.has(id)) {
        return;
      }
      ctx.beginPath();
      ctx.arc(atom.x, atom.y, RENDER_SETTINGS.hoverAtomRadius - 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  drawValenceProblems() {
    if (!this.problemAtoms.size) {
      return;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(' + this.palette.problem + ', 0.9)';
    ctx.fillStyle = 'rgba(' + this.palette.problem + ', 0.14)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([3, 3]);
    this.problemAtoms.forEach((id) => {
      const atom = this.graph.getAtom(id);
      if (!atom || this.hiddenAtoms.has(id)) {
        return;
      }
      ctx.beginPath();
      ctx.arc(atom.x, atom.y, RENDER_SETTINGS.hoverAtomRadius + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  drawMarquee() {
    const rect = this.marquee;
    if (!rect) {
      return;
    }
    const ctx = this.ctx;
    const rgb = this.palette.selection;
    ctx.save();
    ctx.fillStyle = 'rgba(' + rgb + ', 0.08)';
    ctx.strokeStyle = 'rgba(' + rgb + ', 0.85)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.fillRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
    ctx.strokeRect(rect.x0 + 0.5, rect.y0 + 0.5, rect.x1 - rect.x0, rect.y1 - rect.y0);
    ctx.restore();
  }

  drawHover() {
    const hover = this.hover;
    if (!hover || (hover.type !== 'atom' && hover.type !== 'bond')) {
      return;
    }
    const ctx = this.ctx;
    const rgb = this.palette.hover;
    ctx.save();
    if (hover.type === 'atom') {
      const atom = this.graph.getAtom(hover.id);
      if (atom) {
        ctx.fillStyle = 'rgba(' + rgb + ', 0.16)';
        ctx.strokeStyle = 'rgba(' + rgb + ', 0.65)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(atom.x, atom.y, RENDER_SETTINGS.hoverAtomRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    } else {
      const bond = this.graph.bonds.find((b) => b.id === hover.id);
      const a = bond && this.graph.getAtom(bond.atomA);
      const b = bond && this.graph.getAtom(bond.atomB);
      if (a && b) {
        ctx.strokeStyle = 'rgba(' + rgb + ', 0.22)';
        ctx.lineWidth = RENDER_SETTINGS.hoverBondWidth;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawAnnotations() {
    const hover = this.hover && this.hover.type === 'annotation' ? this.hover.id : null;
    this.graph.annotations.forEach((annotation) => {
      if (annotation.id === this.editingAnnotationId) {
        return;
      }
      const selected = this.annotationSelection.has(annotation.id);
      if (selected || annotation.id === hover) {
        this.drawAnnotationHighlight(annotation, selected ? this.palette.selection : this.palette.hover, selected ? 0.3 : 0.22);
      }
      if (annotation.kind === 'arrow') {
        this.drawArrow(annotation, 1);
        this.arrowLabels(annotation).forEach((label) => this.drawTextLabel(label));
      } else if (annotation.kind === 'plus') {
        this.drawPlus(annotation);
      } else {
        this.drawTextLabel(annotation);
      }
    });
    if (this.arrowDraft) {
      this.drawArrow(this.arrowDraft, RENDER_SETTINGS.ghostAlpha + 0.2);
    }
  }

  drawAnnotationHighlight(annotation, rgb, alpha) {
    const ctx = this.ctx;
    ctx.save();
    if (annotation.kind === 'arrow') {
      ctx.strokeStyle = 'rgba(' + rgb + ', ' + alpha + ')';
      ctx.lineWidth = RENDER_SETTINGS.hoverBondWidth + 2;
      ctx.lineCap = 'round';
      this.strokePolyline(arrowPathPoints(annotation));
    } else {
      const box = this.annotationBounds(annotation);
      ctx.fillStyle = 'rgba(' + rgb + ', ' + alpha * 0.6 + ')';
      ctx.strokeStyle = 'rgba(' + rgb + ', 0.85)';
      ctx.lineWidth = 1.2;
      this.roundedRect(box.minX - 5, box.minY - 2, box.maxX - box.minX + 10, box.maxY - box.minY + 4, 5);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawPlus(annotation) {
    const ctx = this.ctx;
    const half = RENDER_SETTINGS.plusSize / 2;
    ctx.save();
    ctx.strokeStyle = this.palette.bond;
    ctx.lineWidth = RENDER_SETTINGS.plusWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(annotation.x - half, annotation.y);
    ctx.lineTo(annotation.x + half, annotation.y);
    ctx.moveTo(annotation.x, annotation.y - half);
    ctx.lineTo(annotation.x, annotation.y + half);
    ctx.stroke();
    ctx.restore();
  }

  arrowLabels(arrow) {
    if (isCurvedArrow(arrow)) {
      return [];
    }
    const editing = this.editingArrowLabel;
    return ARROW_LABEL_SLOTS
      .filter((slot) => typeof arrow[slot] === 'string' && arrow[slot].trim())
      .filter((slot) => !(editing && editing.id === arrow.id && editing.slot === slot))
      .map((slot) => {
        const text = arrow[slot];
        const height = text.split('\n').length * RENDER_SETTINGS.annotationLineHeight;
        const anchor = arrowLabelAnchor(arrow, slot, height);
        return { kind: 'text', x: anchor.x, y: anchor.y, text };
      });
  }

  drawTextLabel(annotation) {
    const ctx = this.ctx;
    const lines = this.annotationLines(annotation);
    const lineHeight = RENDER_SETTINGS.annotationLineHeight;
    ctx.save();
    ctx.fillStyle = this.palette.bond;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    lines.forEach((line, index) => {
      const y = annotation.y + (index - (lines.length - 1) / 2) * lineHeight;
      let x = annotation.x - this.measureLabelLine(line) / 2;
      this.labelSegments(line).forEach((segment) => {
        ctx.font = segment.sub ? RENDER_SETTINGS.annotationSubFont : RENDER_SETTINGS.annotationFont;
        ctx.fillText(segment.text, x, segment.sub ? y + RENDER_SETTINGS.annotationSubDrop : y);
        x += ctx.measureText(segment.text).width;
      });
    });
    ctx.restore();
  }

  strokePolyline(points) {
    if (points.length < 2) {
      return;
    }
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.stroke();
  }

  drawCurvedArrow(arrow, alpha) {
    const path = arrowPathPoints(arrow);
    const total = polylineLength(path);
    if (total < 4) {
      return;
    }
    const endTrim = (x, y) => {
      const atom = this.graph.atoms.find((a) => Math.hypot(a.x - x, a.y - y) < 1 && !(this.hiddenAtoms && this.hiddenAtoms.has(a.id)));
      const trim = !atom ? RENDER_SETTINGS.curvedArrowTrim : this.isLabeled(atom) ? RENDER_SETTINGS.curvedArrowLabelTrim : RENDER_SETTINGS.curvedArrowAtomTrim;
      return Math.min(trim, total * 0.25);
    };
    const startTrim = endTrim(arrow.x1, arrow.y1);
    const trim = endTrim(arrow.x2, arrow.y2);
    const head = Math.min(RENDER_SETTINGS.arrowHeadLength, total * 0.35);
    const width = RENDER_SETTINGS.arrowHeadWidth;
    const visible = polylineTrim(path, startTrim, trim);
    const back = polylineTrim(path, startTrim, trim + head);
    if (visible.length < 2 || back.length < 2) {
      return;
    }
    const tip = visible[visible.length - 1];
    const base = back[back.length - 1];
    const length = Math.hypot(tip.x - base.x, tip.y - base.y) || 1;
    const dx = (tip.x - base.x) / length;
    const dy = (tip.y - base.y) / length;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.palette.bond;
    ctx.fillStyle = this.palette.bond;
    ctx.lineWidth = RENDER_SETTINGS.arrowWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const hx = tip.x - dx * head;
    const hy = tip.y - dy * head;
    if (arrow.style === 'fishhook') {
      const inside = Math.sign(dx * (visible[0].y - tip.y) - dy * (visible[0].x - tip.x)) || 1;
      this.strokePolyline(visible);
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(hx + dy * width * 1.3 * inside, hy - dx * width * 1.3 * inside);
      ctx.stroke();
    } else {
      const notch = head * (1 - RENDER_SETTINGS.arrowHeadNotch);
      this.strokePolyline(polylineTrim(path, startTrim, trim + notch));
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(hx - dy * width, hy + dx * width);
      ctx.lineTo(tip.x - dx * notch, tip.y - dy * notch);
      ctx.lineTo(hx + dy * width, hy - dx * width);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawArrow(arrow, alpha) {
    if (isCurvedArrow(arrow)) {
      this.drawCurvedArrow(arrow, alpha);
      return;
    }
    const length = Math.hypot(arrow.x2 - arrow.x1, arrow.y2 - arrow.y1);
    if (length < 1) {
      return;
    }
    const ctx = this.ctx;
    const ux = (arrow.x2 - arrow.x1) / length;
    const uy = (arrow.y2 - arrow.y1) / length;
    const nx = -uy;
    const ny = ux;
    const head = Math.min(RENDER_SETTINGS.arrowHeadLength, length * 0.45);
    const width = RENDER_SETTINGS.arrowHeadWidth;
    const gap = RENDER_SETTINGS.arrowGap;
    const style = ARROW_STYLES.includes(arrow.style) ? arrow.style : 'forward';
    const line = (x1, y1, x2, y2) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    const polygon = (points) => {
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach((p) => ctx.lineTo(p[0], p[1]));
      ctx.closePath();
      ctx.fill();
    };
    const fullHead = (tx, ty, dx, dy) => {
      const bx = tx - dx * head;
      const by = ty - dy * head;
      const notch = head * (1 - RENDER_SETTINGS.arrowHeadNotch);
      polygon([[tx, ty], [bx - dy * width, by + dx * width], [tx - dx * notch, ty - dy * notch], [bx + dy * width, by - dx * width]]);
    };
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.palette.bond;
    ctx.fillStyle = this.palette.bond;
    ctx.lineWidth = RENDER_SETTINGS.arrowWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (style === 'forward') {
      line(arrow.x1, arrow.y1, arrow.x2 - ux * head * 0.7, arrow.y2 - uy * head * 0.7);
      fullHead(arrow.x2, arrow.y2, ux, uy);
    } else if (style === 'resonance') {
      line(arrow.x1 + ux * head * 0.7, arrow.y1 + uy * head * 0.7, arrow.x2 - ux * head * 0.7, arrow.y2 - uy * head * 0.7);
      fullHead(arrow.x2, arrow.y2, ux, uy);
      fullHead(arrow.x1, arrow.y1, -ux, -uy);
    } else if (style === 'equilibrium') {
      const ax1 = arrow.x1 - nx * gap;
      const ay1 = arrow.y1 - ny * gap;
      const ax2 = arrow.x2 - nx * gap;
      const ay2 = arrow.y2 - ny * gap;
      line(ax1, ay1, ax2, ay2);
      polygon([[ax2, ay2], [ax2 - ux * head, ay2 - uy * head], [ax2 - ux * head - nx * width, ay2 - uy * head - ny * width]]);
      const bx1 = arrow.x1 + nx * gap;
      const by1 = arrow.y1 + ny * gap;
      const bx2 = arrow.x2 + nx * gap;
      const by2 = arrow.y2 + ny * gap;
      line(bx1, by1, bx2, by2);
      polygon([[bx1, by1], [bx1 + ux * head, by1 + uy * head], [bx1 + ux * head + nx * width, by1 + uy * head + ny * width]]);
    } else {
      const reach = head * 1.2;
      const spread = width + gap + 1;
      const stop = (reach * gap) / spread;
      line(arrow.x1 + nx * gap, arrow.y1 + ny * gap, arrow.x2 - ux * stop + nx * gap, arrow.y2 - uy * stop + ny * gap);
      line(arrow.x1 - nx * gap, arrow.y1 - ny * gap, arrow.x2 - ux * stop - nx * gap, arrow.y2 - uy * stop - ny * gap);
      ctx.beginPath();
      ctx.moveTo(arrow.x2 - ux * reach + nx * spread, arrow.y2 - uy * reach + ny * spread);
      ctx.lineTo(arrow.x2, arrow.y2);
      ctx.lineTo(arrow.x2 - ux * reach - nx * spread, arrow.y2 - uy * reach - ny * spread);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawMergeTargets() {
    if (!this.mergeTargets || this.mergeTargets.length === 0) {
      return;
    }
    const ctx = this.ctx;
    const rgb = this.palette.ghostRing;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    this.mergeTargets.forEach((id) => {
      const atom = this.graph.getAtom(id);
      if (!atom) {
        return;
      }
      ctx.fillStyle = 'rgba(' + rgb + ', 0.18)';
      ctx.strokeStyle = 'rgba(' + rgb + ', 0.9)';
      ctx.beginPath();
      ctx.arc(atom.x, atom.y, RENDER_SETTINGS.mergeRingRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    ctx.restore();
  }

  drawGhost() {
    const ghost = this.ghost;
    if (!ghost) {
      return;
    }
    const origin = this.graph.getAtom(ghost.originAtomId);
    if (!origin) {
      return;
    }
    const target =
      ghost.mode === 'connect' ? this.graph.getAtom(ghost.targetAtomId) : ghost.point;
    if (!target) {
      return;
    }

    const ctx = this.ctx;
    const palette = this.palette;
    ctx.save();
    ctx.globalAlpha = RENDER_SETTINGS.ghostAlpha;

    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const length = Math.hypot(dx, dy);
    if (length > 0) {
      const ux = dx / length;
      const uy = dy / length;
      const trimA = this.isLabeled(origin) ? RENDER_SETTINGS.labelClearRadius : 0;
      const labeledTarget =
        ghost.mode === 'connect' ? this.isLabeled(target) : ghost.element !== 'C';
      const trimB = labeledTarget ? RENDER_SETTINGS.labelClearRadius : 0;
      if (trimA + trimB < length) {
        ctx.strokeStyle = palette.bond;
        ctx.lineWidth = RENDER_SETTINGS.bondWidth;
        ctx.lineCap = 'round';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(origin.x + ux * trimA, origin.y + uy * trimA);
        ctx.lineTo(target.x - ux * trimB, target.y - uy * trimB);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (ghost.mode === 'connect') {
      const radius = RENDER_SETTINGS.ghostRingRadius;
      const rgb = palette.ghostRing;
      const gradient = ctx.createRadialGradient(target.x, target.y, 0, target.x, target.y, radius);
      gradient.addColorStop(0, 'rgba(' + rgb + ', 0.5)');
      gradient.addColorStop(0.55, 'rgba(' + rgb + ', 0.22)');
      gradient.addColorStop(1, 'rgba(' + rgb + ', 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(target.x, target.y, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (ghost.element === 'C') {
      ctx.fillStyle = colorForElement(ghost.element, this.theme);
      ctx.beginPath();
      ctx.arc(target.x, target.y, RENDER_SETTINGS.carbonDotRadius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.font = RENDER_SETTINGS.labelFont;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = colorForElement(ghost.element, this.theme);
      ctx.fillText(ghost.element, target.x, target.y);
    }

    ctx.restore();
  }

  drawGrid(width, height) {
    const ctx = this.ctx;
    let spacing = RENDER_SETTINGS.gridSpacing * this.view.scale;
    while (spacing < 12) {
      spacing *= 2;
    }
    const radius = RENDER_SETTINGS.gridDotRadius;
    const startX = ((this.view.x % spacing) + spacing) % spacing;
    const startY = ((this.view.y % spacing) + spacing) % spacing;
    ctx.save();
    ctx.fillStyle = this.palette.grid;
    ctx.beginPath();
    for (let x = startX; x < width; x += spacing) {
      for (let y = startY; y < height; y += spacing) {
        ctx.moveTo(x + radius, y);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
      }
    }
    ctx.fill();
    ctx.restore();
  }

  drawBond(bond) {
    const a = this.graph.getAtom(bond.atomA);
    const b = this.graph.getAtom(bond.atomB);
    if (!a || !b || this.hiddenAtoms.has(a.id) || this.hiddenAtoms.has(b.id)) {
      return;
    }

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) {
      return;
    }

    const ux = dx / length;
    const uy = dy / length;
    const trimA = this.labelTrim(a, ux, uy);
    const trimB = this.labelTrim(b, -ux, -uy);
    if (trimA + trimB >= length) {
      return;
    }

    const startX = a.x + ux * trimA;
    const startY = a.y + uy * trimA;
    const endX = b.x - ux * trimB;
    const endY = b.y - uy * trimB;

    const px = -uy;
    const py = ux;

    const ctx = this.ctx;
    const palette = this.palette;
    ctx.save();
    ctx.strokeStyle = palette.bond;
    ctx.fillStyle = palette.bond;
    ctx.lineWidth = RENDER_SETTINGS.bondWidth * this.strokeScale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = palette.bondGlow;
    ctx.shadowBlur = palette.glowBlur;

    const line = (x0, y0, x1, y1) => {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    };

    if (bond.stereo === 'wedge') {
      this.drawWedgeBond(startX, startY, endX, endY, px, py, false);
    } else if (bond.stereo === 'hash') {
      this.drawWedgeBond(startX, startY, endX, endY, px, py, true);
    } else if (bond.order === 2) {
      const side = this.doubleBondSide(bond, a, b, px, py);
      const spacing = RENDER_SETTINGS.bondSpacing;
      if (side === 0) {
        line(startX + px * spacing / 2, startY + py * spacing / 2, endX + px * spacing / 2, endY + py * spacing / 2);
        line(startX - px * spacing / 2, startY - py * spacing / 2, endX - px * spacing / 2, endY - py * spacing / 2);
      } else {
        line(startX, startY, endX, endY);
        const inner = length * RENDER_SETTINGS.innerBondInset;
        const insetA = trimA ? 0 : inner;
        const insetB = trimB ? 0 : inner;
        const ox = px * spacing * side;
        const oy = py * spacing * side;
        line(startX + ux * insetA + ox, startY + uy * insetA + oy, endX - ux * insetB + ox, endY - uy * insetB + oy);
      }
    } else if (bond.order === 3) {
      const spacing = RENDER_SETTINGS.bondSpacing;
      [-spacing, 0, spacing].forEach((offset) => {
        line(startX + px * offset, startY + py * offset, endX + px * offset, endY + py * offset);
      });
    } else {
      line(startX, startY, endX, endY);
    }
    ctx.restore();
  }

  drawWedgeBond(startX, startY, endX, endY, px, py, hashed) {
    const ctx = this.ctx;
    const halfWidth = RENDER_SETTINGS.wedgeWidth / 2;
    if (!hashed) {
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX + px * halfWidth, endY + py * halfWidth);
      ctx.lineTo(endX - px * halfWidth, endY - py * halfWidth);
      ctx.closePath();
      ctx.fill();
      return;
    }
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);
    const steps = Math.max(3, Math.round(length / RENDER_SETTINGS.hashSpacing));
    ctx.lineWidth = RENDER_SETTINGS.hashWidth;
    ctx.lineCap = 'butt';
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const width = halfWidth * t;
      const x = startX + dx * t;
      const y = startY + dy * t;
      ctx.beginPath();
      ctx.moveTo(x + px * width, y + py * width);
      ctx.lineTo(x - px * width, y - py * width);
      ctx.stroke();
    }
  }

  hydrogenSide(atom) {
    const neighbors = this.adjacency.get(atom.id) || [];
    if (neighbors.length === 0) {
      return 1;
    }
    let sum = 0;
    neighbors.forEach((id) => {
      const other = this.graph.getAtom(id);
      const dx = other.x - atom.x;
      const length = Math.hypot(dx, other.y - atom.y) || 1;
      sum += dx / length;
    });
    return sum > 0.2 ? -1 : 1;
  }

  abbreviationSide(atom) {
    let sum = 0;
    (this.adjacency.get(atom.id) || []).forEach((id) => {
      if (this.hiddenAtoms.has(id)) {
        return;
      }
      const other = this.graph.getAtom(id);
      sum += (other.x - atom.x) / (Math.hypot(other.x - atom.x, other.y - atom.y) || 1);
    });
    return sum > 0.2 ? -1 : 1;
  }

  drawAbbreviation(atom, color) {
    const ctx = this.ctx;
    const boost = this.labelBoost();
    const side = this.abbreviationSide(atom);
    const segments = this.labelSegments(abbreviationLabel(atom, side));
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const fontFor = (segment) => this.atomFont(segment.sub ? 'subscript' : 'label', boost);
    const widths = segments.map((segment) => {
      ctx.font = fontFor(segment);
      return ctx.measureText(segment.text).width;
    });
    const total = widths.reduce((sum, w) => sum + w, 0);
    const edge = (segment, index) => {
      ctx.font = fontFor(segment);
      return ctx.measureText(segment.text.charAt(index < 0 ? segment.text.length - 1 : 0)).width;
    };
    const left = side < 0
      ? atom.x + edge(segments[segments.length - 1], -1) / 2 - total
      : atom.x - edge(segments[0], 0) / 2;
    const half = RENDER_SETTINGS.labelSize * boost * 0.5;
    const padding = 1.5 * boost;
    ctx.fillStyle = this.palette.background;
    ctx.fillRect(left - padding, atom.y - half - padding, total + padding * 2, half * 2 + padding * 2);
    ctx.fillStyle = color;
    let x = left;
    segments.forEach((segment, i) => {
      ctx.font = fontFor(segment);
      ctx.fillText(segment.text, x, atom.y + (segment.sub ? RENDER_SETTINGS.labelSize * boost * 0.28 : 0));
      x += widths[i];
    });
    ctx.restore();
  }

  drawChargeMark(charge, x, y, radius, color) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, radius * 0.22);
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    const arm = radius * 0.55;
    ctx.beginPath();
    ctx.moveTo(x - arm, y);
    ctx.lineTo(x + arm, y);
    if (charge > 0) {
      ctx.moveTo(x, y - arm);
      ctx.lineTo(x, y + arm);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawAtom(atom) {
    const ctx = this.ctx;
    const palette = this.palette;
    const flashed = this.flashedAtomIds.has(atom.id);

    if (flashed) {
      const radius = RENDER_SETTINGS.flashRadius;
      const rgb = palette.flash;
      const gradient = ctx.createRadialGradient(atom.x, atom.y, 0, atom.x, atom.y, radius);
      gradient.addColorStop(0, 'rgba(' + rgb + ', 0.55)');
      gradient.addColorStop(0.55, 'rgba(' + rgb + ', 0.25)');
      gradient.addColorStop(1, 'rgba(' + rgb + ', 0)');
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(atom.x, atom.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (!this.isLabeled(atom) || this.hiddenAtoms.has(atom.id)) {
      return;
    }

    const color = flashed ? 'rgb(' + palette.flash + ')' : colorForElement(atom.element, this.theme);
    if (atom.abbr) {
      this.drawAbbreviation(atom, color);
      return;
    }
    const hydrogens = this.implicitHydrogens(atom);
    const boost = this.labelBoost();
    const labelFont = this.atomFont('label', boost);
    const subFont = this.atomFont('subscript', boost);
    const size = RENDER_SETTINGS.labelSize * boost;
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.font = labelFont;
    const elementWidth = ctx.measureText(atom.element).width;
    const hWidth = hydrogens > 0 ? ctx.measureText('H').width : 0;
    ctx.font = subFont;
    const subText = hydrogens > 1 ? String(hydrogens) : '';
    const subWidth = subText ? ctx.measureText(subText).width : 0;
    const side = hydrogens > 0 ? this.hydrogenSide(atom) : 1;
    const groupWidth = hWidth + subWidth;
    const charge = atom.charge || 0;
    const circled = Math.abs(charge) === 1;
    const chargeRadius = RENDER_SETTINGS.chargeRadius * boost;
    ctx.font = this.atomFont('charge', boost);
    const chargeLabel = circled ? '' : chargeText(charge);
    const chargeWidth = circled ? chargeRadius * 2 + boost : chargeLabel ? ctx.measureText(chargeLabel).width + boost : 0;
    const left = atom.x - elementWidth / 2 - (side < 0 ? groupWidth : 0);
    const right = atom.x + elementWidth / 2 + (side > 0 ? groupWidth : 0) + chargeWidth;
    const padding = 1.5 * boost;
    ctx.fillStyle = palette.background;
    ctx.fillRect(left - padding, atom.y - size / 2 - padding, right - left + padding * 2, size + padding * 2);

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.font = labelFont;
    ctx.fillText(atom.element, atom.x, atom.y);
    if (hydrogens > 0) {
      ctx.textAlign = 'left';
      const hx = side > 0 ? atom.x + elementWidth / 2 : left;
      ctx.fillText('H', hx, atom.y);
      if (subText) {
        ctx.font = subFont;
        ctx.fillText(subText, hx + hWidth, atom.y + size * 0.28);
      }
    }
    if (circled) {
      this.drawChargeMark(charge, right - chargeRadius, atom.y - size * 0.42, chargeRadius, color);
    } else if (chargeLabel) {
      ctx.textAlign = 'left';
      ctx.font = this.atomFont('charge', boost);
      ctx.fillText(chargeLabel, right - chargeWidth + boost, atom.y - size * 0.4);
    }
    ctx.restore();
  }
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text).catch(() => fallbackCopyText(text));
  }
  return fallbackCopyText(text);
}

function fallbackCopyText(text) {
  return new Promise((resolve, reject) => {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      document.execCommand('copy');
      resolve();
    } catch (error) {
      reject(error);
    }
    document.body.removeChild(area);
  });
}
