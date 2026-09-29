const SPECTRA_SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';

const SPECTRA_PUZZLE_ELEMENTS = new Set(['C', 'H', 'N', 'O', 'S', 'F', 'Cl', 'Br', 'I']);

const SPECTRA_TABS = ['h', 'c', 'ir', 'ms'];

function spectraSubscript(text) {
  return String(text).replace(/\d/g, (d) => SPECTRA_SUBSCRIPTS[Number(d)]);
}

function spectraGraphFromSmiles(smiles) {
  const fragment = smilesToFragment(smiles);
  const graph = new Graph();
  const map = new Map();
  fragment.atoms.forEach((a) => {
    const atom = graph.addAtom(a.element, a.x, a.y);
    if (a.charge) {
      atom.charge = a.charge;
    }
    if (a.hydrogens !== undefined && a.hydrogens !== null) {
      atom.hydrogens = a.hydrogens;
    }
    map.set(a.id, atom.id);
  });
  fragment.bonds.forEach((b) => {
    const bond = graph.addBond(map.get(b.atomA), map.get(b.atomB));
    bond.order = b.order;
  });
  return { graph, ids: graph.atoms.map((a) => a.id) };
}

function spectraFormulaCounts(formula) {
  const counts = {};
  String(formula).replace(/([A-Z][a-z]?)(\d*)/g, (m, el, n) => {
    counts[el] = (counts[el] || 0) + (n === '' ? 1 : Number(n));
    return m;
  });
  return counts;
}

function spectraUnsaturation(formula) {
  const c = spectraFormulaCounts(formula);
  const x = (c.F || 0) + (c.Cl || 0) + (c.Br || 0) + (c.I || 0);
  return (c.C || 0) - ((c.H || 0) + (c.D || 0) + x) / 2 + (c.N || 0) / 2 + 1;
}

function spectraPuzzlePool(nameSmiles) {
  const seen = new Set();
  const pool = [];
  Object.keys(nameSmiles).forEach((name) => {
    const smiles = nameSmiles[name];
    if (seen.has(smiles) || /\[\d/.test(smiles) || smiles.includes('.')) {
      return;
    }
    seen.add(smiles);
    let built;
    try {
      built = spectraGraphFromSmiles(smiles);
    } catch (error) {
      return;
    }
    const { graph, ids } = built;
    const heavy = ids.filter((id) => graph.getAtom(id).element !== 'H');
    if (heavy.length < 3 || heavy.length > 14) {
      return;
    }
    if (!ids.every((id) => SPECTRA_PUZZLE_ELEMENTS.has(graph.getAtom(id).element) && !graph.getAtom(id).charge)) {
      return;
    }
    if (!heavy.some((id) => graph.getAtom(id).element === 'C') || graph.connectedComponents().length !== 1) {
      return;
    }
    let signals = 0;
    try {
      signals = predictProtonNmr(graph, ids).signals.length;
    } catch (error) {
      return;
    }
    if (signals < 1) {
      return;
    }
    const difficulty = heavy.length <= 7 ? 'easy' : heavy.length <= 10 ? 'medium' : 'hard';
    pool.push({ name, smiles, heavy: heavy.length, difficulty });
  });
  return pool;
}

function spectraSameStructure(graphA, idsA, graphB, idsB) {
  const joint = new Graph();
  const add = (graph, ids) => {
    const map = new Map();
    ids.forEach((id) => {
      const a = graph.getAtom(id);
      const atom = joint.addAtom(a.element, a.x || 0, a.y || 0);
      if (a.charge) {
        atom.charge = a.charge;
      }
      if (a.hydrogens !== undefined && a.hydrogens !== null) {
        atom.hydrogens = a.hydrogens;
      }
      map.set(id, atom.id);
    });
    const idSet = new Set(ids);
    graph.bonds.forEach((b) => {
      if (idSet.has(b.atomA) && idSet.has(b.atomB)) {
        const bond = joint.addBond(map.get(b.atomA), map.get(b.atomB));
        bond.order = b.order;
      }
    });
    return ids.map((id) => map.get(id));
  };
  const a = add(graphA, idsA);
  const b = add(graphB, idsB);
  const classes = propSymmetryClasses(propContext(joint, a.concat(b)));
  const key = (list) => list.map((id) => classes.get(id)).sort((x, y) => x - y).join(',');
  return key(a) === key(b);
}

function spectraPuzzleCheck(graph, atomIds, targetSmiles) {
  const target = spectraGraphFromSmiles(targetSmiles);
  const mine = computeProperties(graph, atomIds);
  const theirs = computeProperties(target.graph, target.ids);
  const yours = spectraSubscript(mine.formula);
  const wanted = spectraSubscript(theirs.formula);
  if (mine.formula !== theirs.formula) {
    return { status: 'formula', correct: false, message: 'Formula differs: you have ' + yours + ', target is ' + wanted, yourFormula: mine.formula, targetFormula: theirs.formula };
  }
  if (mine.smiles === theirs.smiles || spectraSameStructure(graph, atomIds, target.graph, target.ids)) {
    return { status: 'correct', correct: true, message: 'Correct!', yourFormula: mine.formula, targetFormula: theirs.formula };
  }
  return { status: 'isomer', correct: false, message: 'Formula matches but structure differs', yourFormula: mine.formula, targetFormula: theirs.formula };
}

function spectraFunctionalGroups(graph, atomIds) {
  const env = spectraEnv(graph, atomIds);
  const found = [];
  const push = (name) => {
    if (!found.includes(name)) {
      found.push(name);
    }
  };
  const names = { ketone: 'ketone', aldehyde: 'aldehyde', acid: 'carboxylic acid', carboxylate: 'carboxylate', ester: 'ester', amide: 'amide', acidHalide: 'acid halide', anhydride: 'anhydride', thioester: 'thioester', carbonic: 'carbonate/urea/carbamate' };
  env.heavy.forEach((id) => {
    const e = env.el(id);
    if (spectraIsCarbonyl(env, id)) {
      push(names[spectraCarbonylKind(env, id).kind] || 'carbonyl');
    }
    if (e === 'O' && env.h(id) > 0 && !env.nb(id).some((n) => spectraIsCarbonyl(env, n.id))) {
      push(env.nb(id).some((n) => env.aromatic(n.id)) ? 'phenol' : 'alcohol');
    }
    if (e === 'O' && env.h(id) === 0 && env.nb(id).length === 2 && env.nb(id).every((n) => env.el(n.id) === 'C' && !spectraIsCarbonyl(env, n.id)) && !env.aromatic(id)) {
      push('ether');
    }
    if (e === 'N' && spectraIsNitro(env, id)) {
      push('nitro');
    } else if (e === 'N' && !env.aromatic(id) && env.nb(id).every((n) => n.order === 1) && !env.nb(id).some((n) => spectraIsCarbonyl(env, n.id))) {
      push('amine');
    }
    if (e === 'C' && env.nb(id).some((n) => n.order === 3 && env.el(n.id) === 'N')) {
      push('nitrile');
    }
    if (e === 'C' && env.nb(id).some((n) => n.order === 3 && env.el(n.id) === 'C')) {
      push('alkyne');
    }
    if (e === 'C' && !env.aromatic(id) && env.nb(id).some((n) => n.order === 2 && env.el(n.id) === 'C' && !env.aromatic(n.id))) {
      push('alkene');
    }
    if (SPECTRA_HALOGENS.has(e)) {
      push(e === 'F' ? 'fluoride' : e === 'Cl' ? 'chloride' : e === 'Br' ? 'bromide' : 'iodide');
    }
    if (e === 'S' && env.h(id) > 0) {
      push('thiol');
    } else if (e === 'S' && env.nb(id).filter((n) => n.order === 2 && env.el(n.id) === 'O').length >= 1) {
      push('sulfoxide/sulfone');
    } else if (e === 'S' && !env.aromatic(id)) {
      push('sulfide');
    }
  });
  if (spectraAromaticRings(env).length) {
    push(env.heavy.some((id) => env.aromatic(id) && env.el(id) !== 'C') ? 'heteroaromatic ring' : 'aromatic ring');
  }
  return found;
}

function spectraFixed(value, digits) {
  return Number(value).toFixed(digits);
}

function spectraCarbonField(field) {
  return Math.round(field * 0.2515);
}

function spectraPeakList(tab, data, options) {
  const opts = options || {};
  const field = opts.field || 400;
  if (tab === 'h') {
    const parts = data.signals.map((s) => {
      const mult = (s.broad ? 'br ' : '') + s.multiplicity;
      const j = s.J && s.J.length && !s.broad && s.multiplicity !== 'm' ? ', J = ' + s.J.map((x) => spectraFixed(x, 1)).join(', ') + ' Hz' : '';
      return spectraFixed(s.shift, 2) + ' (' + mult + j + ', ' + s.count + 'H)';
    });
    return 'Predicted ¹H NMR (' + field + ' MHz, CDCl₃) δ ' + parts.join(', ') + '.';
  }
  if (tab === 'c') {
    return 'Predicted ¹³C NMR (' + spectraCarbonField(field) + ' MHz, CDCl₃) δ ' + data.signals.map((s) => spectraFixed(s.shift, 1)).join(', ') + '.';
  }
  if (tab === 'ir') {
    return 'Predicted IR ν̃ ' + data.map((b) => b.center + ' (' + b.intensity + (b.shape !== 'sharp' ? ', br' : '') + ')').join(', ') + ' cm⁻¹.';
  }
  const peaks = data.peaks.filter((p) => p.intensity >= 5 || p.mz === data.molecularIon.mz).slice().sort((a, b) => b.mz - a.mz);
  return 'Predicted EI-MS m/z (%) ' + peaks.map((p) => p.mz + ' (' + (p.mz === data.molecularIon.mz ? 'M⁺•, ' : '') + Math.round(p.intensity) + ')').join(', ') + '.';
}

function createSpectraView(deps) {
  const dock = document.getElementById('spectra-dock');
  const plotCanvas = document.getElementById('spectra-canvas');
  const plotWrap = plotCanvas.parentElement;
  const plotCtx = plotCanvas.getContext('2d');
  const table = document.getElementById('spectra-table');
  const emptyNote = document.getElementById('spectra-empty');
  const title = document.getElementById('spectra-title');
  const tabs = Array.from(dock.querySelectorAll('.spectra-tab'));
  const fieldSelect = document.getElementById('spectra-field');
  const zoomButton = document.getElementById('spectra-ms-zoom');
  const puzzleBar = document.getElementById('spectra-puzzle-bar');
  const puzzleInfo = document.getElementById('spectra-puzzle-info');
  const puzzleFeedback = document.getElementById('spectra-puzzle-feedback');
  const puzzleHints = document.getElementById('spectra-hints');
  const difficultySelect = document.getElementById('spectra-difficulty');
  const button = document.getElementById('spectra-button');

  const saved = (() => {
    try {
      return JSON.parse(deps.storageGet('spectraDock') || '{}') || {};
    } catch (error) {
      return {};
    }
  })();
  const record = (() => {
    try {
      return Object.assign({ streak: 0, solved: 0 }, JSON.parse(deps.storageGet('spectraPuzzle') || '{}'));
    } catch (error) {
      return { streak: 0, solved: 0 };
    }
  })();
  const state = {
    open: false,
    tab: SPECTRA_TABS.includes(saved.tab) ? saved.tab : 'h',
    height: Number(saved.height) || 300,
    field: 400,
    zoom: false,
    signature: null,
    target: null,
    data: null,
    timer: null,
    hits: [],
    hover: -1,
    atomHover: null,
    puzzle: null,
    pool: null,
  };

  function saveDock() {
    deps.storageSet('spectraDock', JSON.stringify({ open: state.open, tab: state.tab, height: state.height }));
  }

  function savePuzzle() {
    deps.storageSet('spectraPuzzle', JSON.stringify({ streak: record.streak, solved: record.solved }));
  }

  function escape(text) {
    return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function colors() {
    const style = getComputedStyle(dock);
    const v = (name, fallback) => (style.getPropertyValue(name) || '').trim() || fallback;
    return {
      bg: v('--bg-elevated', '#1c1f26'),
      text: v('--text-primary', '#e5e7eb'),
      muted: v('--text-muted', '#9ca3af'),
      border: v('--border', '#374151'),
      line: v('--lab-cyan', '#22d3ee'),
      alt: v('--lab-violet', '#a78bfa'),
      peak: v('--spectra-peak', '#f59e0b'),
      font: v('--font-ui', 'sans-serif'),
      mono: v('--font-mono', 'monospace'),
    };
  }

  function structureSignature(graph, ids) {
    const set = new Set(ids);
    return ids.map((id) => {
      const a = graph.getAtom(id);
      return id + a.element + (a.charge || '') + (a.hydrogens === undefined || a.hydrogens === null ? '' : 'h' + a.hydrogens) + '@' + Math.round(a.x) + ',' + Math.round(a.y);
    }).join(';') + '|' + graph.bonds.filter((b) => set.has(b.atomA)).map((b) => b.atomA + '-' + b.atomB + ':' + b.order).join(';');
  }

  function currentTarget() {
    if (state.puzzle) {
      return { graph: state.puzzle.graph, ids: state.puzzle.ids };
    }
    const ids = deps.targetAtomIds();
    return ids && ids.length ? { graph: deps.graph, ids } : null;
  }

  function compute(target) {
    const { graph, ids } = target;
    const out = { formula: '', h: null, c: null, ir: null, ms: null, errors: [] };
    try {
      out.formula = computeProperties(graph, ids).formula;
    } catch (error) {
      out.formula = '';
    }
    try {
      out.h = predictProtonNmr(graph, ids, { field: state.field });
    } catch (error) {
      out.errors.push('h');
    }
    try {
      out.c = predictCarbonNmr(graph, ids);
    } catch (error) {
      out.errors.push('c');
    }
    try {
      out.ir = predictIrBands(graph, ids);
    } catch (error) {
      out.errors.push('ir');
    }
    try {
      out.ms = predictMassSpectrum(graph, ids);
    } catch (error) {
      out.errors.push('ms');
    }
    return out;
  }

  function refresh(force) {
    if (!state.open) {
      return;
    }
    const target = currentTarget();
    const signature = target ? (state.puzzle ? 'puzzle:' + state.puzzle.smiles : '') + structureSignature(target.graph, target.ids) + '|' + state.field : '';
    if (!force && signature === state.signature) {
      return;
    }
    state.signature = signature;
    state.target = target;
    state.data = target ? compute(target) : null;
    state.hover = -1;
    setPeakAtoms(null);
    draw();
  }

  function scheduleRefresh() {
    if (!state.open) {
      return;
    }
    clearTimeout(state.timer);
    state.timer = setTimeout(() => refresh(false), 180);
  }

  function items() {
    const d = state.data;
    if (!d) {
      return [];
    }
    if (state.tab === 'h') {
      return d.h ? d.h.signals : [];
    }
    if (state.tab === 'c') {
      return d.c ? d.c.signals : [];
    }
    if (state.tab === 'ir') {
      return d.ir || [];
    }
    if (!d.ms) {
      return [];
    }
    return d.ms.peaks.filter((p) => p.intensity >= 1 || p.mz === d.ms.molecularIon.mz);
  }

  function setPeakAtoms(list) {
    const next = new Set(list || []);
    const same = next.size === deps.renderer.peakAtoms.size && Array.from(next).every((id) => deps.renderer.peakAtoms.has(id));
    if (same) {
      return;
    }
    deps.renderer.peakAtoms = next;
    deps.renderer.render();
  }

  function sizeCanvas() {
    const rect = plotWrap.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (plotCanvas.width !== Math.round(w * ratio) || plotCanvas.height !== Math.round(h * ratio)) {
      plotCanvas.width = Math.round(w * ratio);
      plotCanvas.height = Math.round(h * ratio);
    }
    plotCanvas.style.width = w + 'px';
    plotCanvas.style.height = h + 'px';
    return { w, h, ratio };
  }

  function axisTicks(from, to, count) {
    const span = Math.abs(to - from);
    const raw = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    const out = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
      out.push(Math.round(v * 1000) / 1000);
    }
    return out;
  }

  function plotRange() {
    const d = state.data;
    if (state.tab === 'h') {
      const max = d.h && d.h.signals.length ? Math.max.apply(null, d.h.signals.map((s) => s.shift)) : 10;
      return { from: Math.max(10, Math.ceil(max + 0.8)), to: -0.5, unit: 'δ (ppm)' };
    }
    if (state.tab === 'c') {
      const max = d.c && d.c.signals.length ? Math.max.apply(null, d.c.signals.map((s) => s.shift)) : 200;
      return { from: Math.max(220, Math.ceil((max + 10) / 10) * 10), to: -5, unit: 'δ (ppm)' };
    }
    if (state.tab === 'ir') {
      return { from: 4000, to: 400, unit: 'wavenumber (cm⁻¹)' };
    }
    const m = d.ms && d.ms.molecularIon ? d.ms.molecularIon.mz : 100;
    if (state.zoom) {
      return { from: m - 4, to: m + 7, unit: 'm/z' };
    }
    return { from: 10, to: Math.ceil((m + 12) / 10) * 10, unit: 'm/z' };
  }

  function draw() {
    const c = colors();
    const { w, h, ratio } = sizeCanvas();
    const g = plotCtx;
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.fillStyle = c.bg;
    g.fillRect(0, 0, w, h);
    state.hits = [];
    const list = items();
    emptyNote.hidden = !!state.data;
    title.textContent = headerText();
    zoomButton.hidden = state.tab !== 'ms';
    fieldSelect.hidden = state.tab !== 'h';
    tabs.forEach((t) => {
      const on = t.dataset.tab === state.tab;
      t.classList.toggle('selected', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    renderTable(list);
    if (!state.data) {
      return;
    }
    const pad = { l: state.tab === 'h' || state.tab === 'c' ? 16 : 44, r: 16, t: 26, b: 34 };
    const range = plotRange();
    const px = (x) => pad.l + ((x - range.from) / (range.to - range.from)) * (w - pad.l - pad.r);
    const baseY = h - pad.b;
    const topY = pad.t;
    g.strokeStyle = c.border;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(pad.l, baseY + 0.5);
    g.lineTo(w - pad.r, baseY + 0.5);
    g.stroke();
    g.fillStyle = c.muted;
    g.font = '11px ' + c.font;
    g.textAlign = 'center';
    g.textBaseline = 'top';
    axisTicks(range.from, range.to, Math.max(4, Math.floor((w - pad.l - pad.r) / 70))).forEach((v) => {
      const x = px(v);
      g.beginPath();
      g.moveTo(x + 0.5, baseY);
      g.lineTo(x + 0.5, baseY + 4);
      g.stroke();
      g.fillText(String(v), x, baseY + 6);
    });
    g.textAlign = 'right';
    g.fillText(range.unit, w - pad.r, baseY + 19);
    const highlight = new Set();
    if (state.hover >= 0) {
      highlight.add(state.hover);
    }
    if (state.atomHover !== null && !state.puzzle) {
      list.forEach((item, i) => {
        if ((item.atoms || []).includes(state.atomHover) && state.tab !== 'ms') {
          highlight.add(i);
        }
      });
    }
    if (state.tab === 'h' || state.tab === 'c') {
      drawNmr(g, c, list, range, px, baseY, topY, w, highlight);
    } else if (state.tab === 'ir') {
      drawIr(g, c, list, range, px, baseY, topY, w, highlight, pad);
    } else {
      drawMs(g, c, list, range, px, baseY, topY, highlight, pad);
    }
    g.fillStyle = c.muted;
    g.font = '10px ' + c.font;
    g.textAlign = 'left';
    g.textBaseline = 'top';
    g.fillText('predicted', pad.l + 2, 6);
  }

  function drawNmr(g, c, list, range, px, baseY, topY, w, highlight) {
    const nucleus = state.tab === 'h' ? '1H' : '13C';
    const points = Math.min(6000, Math.max(1200, Math.round(w * 4)));
    const curve = nmrLineShape(list, { nucleus, field: state.field, from: range.from, to: range.to, points });
    const max = curve.reduce((m, p) => Math.max(m, p.y), 0) || 1;
    const scale = (baseY - topY - 30) / max;
    g.strokeStyle = c.line;
    g.lineWidth = 1.2;
    g.beginPath();
    curve.forEach((p, i) => {
      const x = px(p.x);
      const y = baseY - p.y * scale;
      if (i === 0) {
        g.moveTo(x, y);
      } else {
        g.lineTo(x, y);
      }
    });
    g.stroke();
    const labelled = [];
    list.forEach((s, i) => {
      const x = px(s.shift);
      let peakY = baseY;
      curve.forEach((p) => {
        if (Math.abs(p.x - s.shift) < Math.abs(range.to - range.from) / points * 30) {
          peakY = Math.min(peakY, baseY - p.y * scale);
        }
      });
      state.hits.push({ x, index: i });
      if (highlight.has(i)) {
        g.fillStyle = c.peak;
        g.globalAlpha = 0.18;
        g.fillRect(x - 9, topY - 6, 18, baseY - topY + 6);
        g.globalAlpha = 1;
      }
      const label = state.tab === 'h' ? s.count + 'H ' + (s.broad ? 'br ' : '') + s.multiplicity : spectraFixed(s.shift, 1);
      g.font = '11px ' + c.font;
      const tw = g.measureText(label).width;
      let y = Math.max(topY - 2, peakY - 6);
      labelled.forEach((l) => {
        if (Math.abs(l.x - x) < (tw + l.w) / 2 + 2 && Math.abs(l.y - y) < 12) {
          y = l.y - 12;
        }
      });
      labelled.push({ x, y, w: tw });
      g.fillStyle = highlight.has(i) ? c.peak : c.text;
      g.textAlign = 'center';
      g.textBaseline = 'bottom';
      g.fillText(label, x, y);
    });
  }

  function drawIr(g, c, list, range, px, baseY, topY, w, highlight, pad) {
    const curve = irSpectrum(list, { from: range.from, to: range.to, points: Math.max(900, Math.round(w * 2)) });
    const py = (t) => baseY - (t / 100) * (baseY - topY);
    g.fillStyle = c.muted;
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    [0, 50, 100].forEach((t) => {
      g.fillText(t + '', pad.l - 6, py(t));
      g.strokeStyle = c.border;
      g.globalAlpha = 0.4;
      g.beginPath();
      g.moveTo(pad.l, py(t) + 0.5);
      g.lineTo(w - pad.r, py(t) + 0.5);
      g.stroke();
      g.globalAlpha = 1;
    });
    g.save();
    g.translate(12, (baseY + topY) / 2);
    g.rotate(-Math.PI / 2);
    g.textAlign = 'center';
    g.fillText('%T', 0, 0);
    g.restore();
    list.forEach((b, i) => {
      if (highlight.has(i)) {
        g.fillStyle = c.peak;
        g.globalAlpha = 0.2;
        g.fillRect(Math.min(px(b.from), px(b.to)) - 2, topY, Math.abs(px(b.to) - px(b.from)) + 4, baseY - topY);
        g.globalAlpha = 1;
      }
    });
    g.strokeStyle = c.line;
    g.lineWidth = 1.2;
    g.beginPath();
    curve.forEach((p, i) => {
      if (i === 0) {
        g.moveTo(px(p.x), py(p.y));
      } else {
        g.lineTo(px(p.x), py(p.y));
      }
    });
    g.stroke();
    const labelled = [];
    list.forEach((b, i) => {
      const x = px(b.center);
      state.hits.push({ x, index: i });
      if (b.intensity === 'w' && !highlight.has(i)) {
        return;
      }
      const label = String(b.center);
      g.font = '10px ' + c.font;
      const tw = g.measureText(label).width;
      if (labelled.some((l) => Math.abs(l - x) < tw + 2)) {
        return;
      }
      labelled.push(x);
      const point = curve.reduce((best, p) => (Math.abs(p.x - b.center) < Math.abs(best.x - b.center) ? p : best), curve[0]);
      g.fillStyle = highlight.has(i) ? c.peak : c.muted;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      g.fillText(label, x, Math.min(baseY - 12, py(point.y) + 3));
    });
  }

  function drawMs(g, c, list, range, px, baseY, topY, highlight, pad) {
    const py = (v) => baseY - (v / 100) * (baseY - topY - 12);
    g.fillStyle = c.muted;
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    [0, 50, 100].forEach((t) => g.fillText(t + '', pad.l - 6, py(t)));
    const m = state.data.ms.molecularIon.mz;
    const width = state.zoom ? 10 : 2;
    list.forEach((p, i) => {
      if (p.mz < range.from || p.mz > range.to) {
        return;
      }
      const x = px(p.mz);
      state.hits.push({ x, index: i });
      g.fillStyle = highlight.has(i) ? c.peak : p.mz >= m ? c.alt : c.line;
      g.fillRect(x - width / 2, py(p.intensity), width, baseY - py(p.intensity));
      if (p.intensity >= 15 || state.zoom || highlight.has(i) || p.mz === m) {
        g.fillStyle = highlight.has(i) ? c.peak : c.text;
        g.textAlign = 'center';
        g.textBaseline = 'bottom';
        g.font = '10px ' + c.font;
        g.fillText(state.zoom ? p.mz + ' (' + Math.round(p.intensity) + ')' : String(p.mz), x, py(p.intensity) - 2);
      }
    });
  }

  function headerText() {
    if (state.puzzle) {
      const d = state.data;
      const f = d ? d.formula : '';
      return 'Unknown · ' + spectraSubscript(f) + ' · DoU ' + spectraUnsaturation(f);
    }
    if (!state.data) {
      return '';
    }
    return 'Predicted for ' + spectraSubscript(state.data.formula);
  }

  function renderTable(list) {
    const hide = !!state.puzzle;
    let head;
    let rows;
    if (!state.data) {
      table.innerHTML = '';
      return;
    }
    if (state.tab === 'h') {
      head = ['δ (ppm)', 'Mult.', 'J (Hz)', 'Int.'];
      rows = list.map((s) => [spectraFixed(s.shift, 2), (s.broad ? 'br ' : '') + s.multiplicity, s.J.length && !s.broad ? s.J.map((x) => spectraFixed(x, 1)).join(', ') : '', s.count + 'H', s.note]);
    } else if (state.tab === 'c') {
      head = ['δ (ppm)', 'Type', 'Atoms'];
      rows = list.map((s) => [spectraFixed(s.shift, 1), s.type, String(s.count), s.note]);
    } else if (state.tab === 'ir') {
      head = ['ν̃ (cm⁻¹)', 'Int.', 'Shape'];
      rows = list.map((b) => [b.from + '–' + b.to, b.intensity, b.shape, b.label]);
    } else {
      head = ['m/z', 'Rel. int.', 'Loss'];
      rows = list.slice().sort((a, b) => b.intensity - a.intensity).slice(0, 40).map((p) => [String(p.mz), spectraFixed(p.intensity, 1), p.lost, p.label]);
    }
    if (!hide) {
      head.push('Assignment');
    }
    const order = state.tab === 'ms' ? list.slice().sort((a, b) => b.intensity - a.intensity).slice(0, 40).map((p) => list.indexOf(p)) : list.map((x, i) => i);
    table.innerHTML = '<thead><tr>' + head.map((x) => '<th>' + escape(x) + '</th>').join('') + '</tr></thead><tbody>' +
      rows.map((r, k) => '<tr data-index="' + order[k] + '"' + (order[k] === state.hover ? ' class="hot"' : '') + '>' + r.slice(0, head.length).map((x) => '<td>' + escape(x) + '</td>').join('') + '</tr>').join('') + '</tbody>';
  }

  function hoverIndex(index) {
    if (index === state.hover) {
      return;
    }
    state.hover = index;
    const list = items();
    if (!state.puzzle && index >= 0 && list[index] && state.target && state.target.graph === deps.graph) {
      setPeakAtoms(list[index].atoms);
    } else {
      setPeakAtoms(null);
    }
    draw();
  }

  plotCanvas.addEventListener('mousemove', (event) => {
    const rect = plotCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    let best = -1;
    let dist = 10;
    state.hits.forEach((hit) => {
      const d = Math.abs(hit.x - x);
      if (d < dist) {
        dist = d;
        best = hit.index;
      }
    });
    hoverIndex(best);
  });
  plotCanvas.addEventListener('mouseleave', () => hoverIndex(-1));
  table.addEventListener('mouseover', (event) => {
    const rowEl = event.target.closest('tr[data-index]');
    hoverIndex(rowEl ? Number(rowEl.dataset.index) : -1);
  });
  table.addEventListener('mouseleave', () => hoverIndex(-1));

  function setTab(tab) {
    if (!SPECTRA_TABS.includes(tab)) {
      return;
    }
    state.tab = tab;
    state.hover = -1;
    setPeakAtoms(null);
    saveDock();
    draw();
  }
  tabs.forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tab)));

  function applyHeight() {
    dock.style.height = state.height + 'px';
  }

  function setOpen(open) {
    state.open = open;
    dock.hidden = !open;
    button.classList.toggle('active', open);
    button.setAttribute('aria-pressed', open ? 'true' : 'false');
    if (open) {
      applyHeight();
    } else {
      clearTimeout(state.timer);
      setPeakAtoms(null);
      state.signature = null;
    }
    saveDock();
    deps.onLayout();
    if (open) {
      refresh(true);
    }
  }

  function toggle() {
    setOpen(!state.open);
  }

  const handle = document.getElementById('spectra-resize');
  handle.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    const startY = event.clientY;
    const startH = state.height;
    handle.setPointerCapture(event.pointerId);
    const move = (e) => {
      const max = Math.max(180, window.innerHeight * 0.75);
      state.height = Math.round(Math.min(max, Math.max(150, startH + (startY - e.clientY))));
      applyHeight();
      deps.onLayout();
      draw();
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      saveDock();
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });

  fieldSelect.addEventListener('change', () => {
    state.field = Number(fieldSelect.value) || 400;
    refresh(true);
  });
  zoomButton.addEventListener('click', () => {
    state.zoom = !state.zoom;
    zoomButton.classList.toggle('active', state.zoom);
    zoomButton.textContent = state.zoom ? 'Full spectrum' : 'Isotope zoom';
    draw();
  });

  function peakListText() {
    const d = state.data;
    if (!d) {
      return '';
    }
    const source = state.tab === 'h' ? d.h : state.tab === 'c' ? d.c : state.tab === 'ir' ? d.ir : d.ms;
    return source ? spectraPeakList(state.tab, source, { field: state.field }) : '';
  }

  document.getElementById('spectra-copy').addEventListener('click', () => {
    const text = peakListText();
    if (!text) {
      deps.toast('Draw a molecule to see its predicted spectra', { kind: 'warn' });
      return;
    }
    state.lastCopied = text;
    deps.copyText(text).then(() => deps.toast('Peak list copied', { kind: 'ok', duration: 1500 }), () => {});
  });

  document.getElementById('spectra-export').addEventListener('click', () => {
    if (!state.data) {
      deps.toast('Draw a molecule to see its predicted spectra', { kind: 'warn' });
      return;
    }
    plotCanvas.toBlob((blob) => {
      if (blob) {
        deps.downloadBlob(blob, 'spectrum-' + state.tab + '.png');
      }
    }, 'image/png');
  });

  document.getElementById('spectra-close').addEventListener('click', () => setOpen(false));

  function updatePuzzleInfo() {
    puzzleInfo.textContent = 'Streak ' + record.streak + ' · solved ' + record.solved;
  }

  function startPuzzle() {
    if (!state.pool) {
      state.pool = spectraPuzzlePool(NAME_SMILES);
    }
    const level = difficultySelect.value;
    const pool = state.pool.filter((p) => level === 'any' || p.difficulty === level);
    const choices = pool.length ? pool : state.pool;
    if (!choices.length) {
      deps.toast('No puzzle molecules available', { kind: 'warn' });
      return;
    }
    const previous = state.puzzle ? state.puzzle.smiles : null;
    let entry = choices[Math.floor(Math.random() * choices.length)];
    if (entry.smiles === previous && choices.length > 1) {
      entry = choices[(choices.indexOf(entry) + 1) % choices.length];
    }
    startPuzzleWith(entry);
  }

  function startPuzzleWith(entry) {
    const built = spectraGraphFromSmiles(entry.smiles);
    state.puzzle = { name: entry.name, smiles: entry.smiles, difficulty: entry.difficulty, graph: built.graph, ids: built.ids, hints: 0, finished: false };
    puzzleBar.hidden = false;
    dock.classList.add('puzzle-mode');
    puzzleFeedback.textContent = 'Draw the unknown on the canvas, then press Check.';
    puzzleFeedback.className = 'spectra-feedback';
    puzzleHints.innerHTML = '';
    updatePuzzleInfo();
    if (!state.open) {
      setOpen(true);
    } else {
      refresh(true);
    }
  }

  function endPuzzle() {
    state.puzzle = null;
    puzzleBar.hidden = true;
    dock.classList.remove('puzzle-mode');
    refresh(true);
  }

  function feedback(text, kind) {
    puzzleFeedback.textContent = text;
    puzzleFeedback.className = 'spectra-feedback' + (kind ? ' ' + kind : '');
  }

  function checkPuzzle() {
    if (!state.puzzle) {
      return;
    }
    const ids = deps.targetAtomIds();
    if (!ids || !ids.length) {
      feedback('Draw your answer on the canvas first.', 'warn');
      return;
    }
    let result;
    try {
      result = spectraPuzzleCheck(deps.graph, ids, state.puzzle.smiles);
    } catch (error) {
      feedback('Could not read the drawing.', 'warn');
      return;
    }
    if (result.correct) {
      if (!state.puzzle.finished) {
        record.streak += 1;
        record.solved += 1;
        savePuzzle();
      }
      state.puzzle.finished = true;
      feedback('Correct — it is ' + state.puzzle.name + '!', 'ok');
      updatePuzzleInfo();
    } else {
      feedback(result.message, 'warn');
    }
  }

  function hintPuzzle() {
    const p = state.puzzle;
    if (!p) {
      return;
    }
    const d = state.data;
    const hints = [];
    if (d && d.ir) {
      const key = d.ir.filter((b) => b.intensity !== 'w' && !/C–H (stretch \(sp³\)|bend)/.test(b.label));
      hints.push('IR: ' + (key.length ? key.map((b) => b.center + ' cm⁻¹ ' + b.label).join('; ') : 'only C–H bands'));
    }
    const groups = spectraFunctionalGroups(p.graph, p.ids);
    hints.push('Functional groups: ' + (groups.length ? groups.join(', ') : 'none (hydrocarbon skeleton)'));
    if (d && d.h) {
      hints.push('¹H: ' + d.h.signals.map((s) => spectraFixed(s.shift, 2) + ' ' + s.note).join('; '));
    }
    if (p.hints >= hints.length) {
      feedback('No more hints — try Give up to see the answer.', 'warn');
      return;
    }
    const item = document.createElement('div');
    item.className = 'spectra-hint';
    item.textContent = hints[p.hints];
    puzzleHints.appendChild(item);
    p.hints += 1;
  }

  function giveUp() {
    const p = state.puzzle;
    if (!p) {
      return;
    }
    if (!p.finished) {
      record.streak = 0;
      savePuzzle();
    }
    p.finished = true;
    try {
      deps.insertSmiles(smilesToFragment(p.smiles));
    } catch (error) {
      deps.toast('Could not place the answer', { kind: 'warn' });
    }
    feedback('Answer: ' + p.name + ' (' + p.smiles + ')', '');
    updatePuzzleInfo();
  }

  document.getElementById('spectra-puzzle').addEventListener('click', startPuzzle);
  document.getElementById('spectra-check').addEventListener('click', checkPuzzle);
  document.getElementById('spectra-hint').addEventListener('click', hintPuzzle);
  document.getElementById('spectra-giveup').addEventListener('click', giveUp);
  document.getElementById('spectra-next').addEventListener('click', startPuzzle);
  document.getElementById('spectra-puzzle-exit').addEventListener('click', endPuzzle);

  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (state.open) {
        draw();
      }
    }).observe(plotWrap);
  }

  if (saved.open) {
    setOpen(true);
  }

  return {
    toggle,
    open: () => setOpen(true),
    close: () => setOpen(false),
    isOpen: () => state.open,
    setTab,
    structureChanged: scheduleRefresh,
    refreshNow: () => refresh(false),
    repaint: () => {
      if (state.open) {
        draw();
      }
    },
    hoverAtom(id) {
      const next = id === undefined ? null : id;
      if (next === state.atomHover) {
        return;
      }
      state.atomHover = next;
      if (state.open && !state.puzzle) {
        draw();
      }
    },
    startPuzzle,
    startPuzzleWith,
    endPuzzle,
    inPuzzle: () => !!state.puzzle,
    peakListText,
    highlightedIndices: () => {
      const list = items();
      return list.map((item, i) => ((item.atoms || []).includes(state.atomHover) ? i : -1)).filter((i) => i >= 0);
    },
    hoverSignal: hoverIndex,
    state,
  };
}
