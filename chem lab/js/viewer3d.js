const VIEWER3D_TABS = ['3d', 'chair', 'newman', 'fischer', 'haworth'];

const VIEWER3D_EXAMPLES = {
  chair: { name: 'menthol', smiles: 'CC(C)[C@@H]1CC[C@@H](C)C[C@H]1O', hint: 'Draw a cyclohexane or a pyranose sugar ring, with wedge/hash bonds for the substituents.' },
  newman: { name: 'butane', smiles: 'CCCC', hint: 'Draw a chain with a single bond between two non-terminal atoms, such as butane.' },
  fischer: { name: 'D-glucose (open chain)', smiles: 'OC[C@@H](O)[C@@H](O)[C@H](O)[C@@H](O)C=O', hint: 'Draw an open-chain sugar or amino acid and set its stereocentres with wedge/hash bonds.' },
  haworth: { name: 'β-D-glucopyranose', smiles: 'OC[C@H]1O[C@@H](O)[C@H](O)[C@@H](O)[C@@H]1O', hint: 'Draw a sugar ring: five or six members with one ring O and OH/CH2OH groups on the carbons.' },
};

const VIEWER3D_BALL = { H: 0.26, C: 0.38, N: 0.36, O: 0.35, F: 0.33, S: 0.46, P: 0.46, Cl: 0.45, Br: 0.5, I: 0.56 };

function viewer3dHexToRgb(color) {
  const hex = String(color).trim().replace('#', '');
  if (/^[0-9a-f]{3}$/i.test(hex)) {
    return hex.split('').map((c) => parseInt(c + c, 16));
  }
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [0, 2, 4].map((k) => parseInt(hex.slice(k, k + 2), 16));
  }
  const m = String(color).match(/(\d+)\D+(\d+)\D+(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [180, 180, 180];
}

function viewer3dShade(rgb, f) {
  const c = rgb.map((v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

function viewer3dSubscript(text) {
  return String(text).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
}

function viewer3dMatMul(a, b) {
  const out = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out.push(a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c]);
    }
  }
  return out;
}

function viewer3dAxisRotation(x, y, z, angle) {
  const len = Math.hypot(x, y, z) || 1;
  const ux = x / len;
  const uy = y / len;
  const uz = z / len;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * ux * ux + c, t * ux * uy - s * uz, t * ux * uz + s * uy,
    t * ux * uy + s * uz, t * uy * uy + c, t * uy * uz - s * ux,
    t * ux * uz - s * uy, t * uy * uz + s * ux, t * uz * uz + c,
  ];
}

function createViewer3d(deps) {
  const overlay = document.getElementById('viewer-overlay');
  const dialog = overlay.querySelector('.viewer-dialog');
  const canvas = document.getElementById('viewer-canvas');
  const stage = canvas.parentElement;
  const ctx2d = canvas.getContext('2d');
  const tip = document.getElementById('viewer-tip');
  const status = document.getElementById('viewer-status');
  const tabs = Array.from(overlay.querySelectorAll('.viewer-tab'));
  const panes = Array.from(overlay.querySelectorAll('.viewer-pane'));
  const styleSelect = document.getElementById('viewer-style');
  const hToggle = document.getElementById('viewer-hydrogens');
  const spinToggle = document.getElementById('viewer-spin');
  const measureToggle = document.getElementById('viewer-measure-toggle');
  const measureOut = document.getElementById('viewer-measure');
  const minimizeButton = document.getElementById('viewer-minimize');
  const exportButton = document.getElementById('viewer-export');
  const conformerList = document.getElementById('viewer-conformers');
  const ringSelect = document.getElementById('viewer-ring');
  const chairInfo = document.getElementById('viewer-chair-info');
  const bondSelect = document.getElementById('viewer-bond');
  const angleSlider = document.getElementById('viewer-angle');
  const angleValue = document.getElementById('viewer-angle-value');
  const newmanInfo = document.getElementById('viewer-newman-info');
  const curveCanvas = document.getElementById('viewer-curve');
  const fischerInfo = document.getElementById('viewer-fischer-info');
  const haworthInfo = document.getElementById('viewer-haworth-info');
  const closeButton = document.getElementById('viewer-close');
  const unavailable = document.getElementById('viewer-unavailable');
  const unavailableReason = document.getElementById('viewer-unavailable-reason');
  const unavailableHint = document.getElementById('viewer-unavailable-hint');
  const exampleButton = document.getElementById('viewer-example-button');
  const exampleBanner = document.getElementById('viewer-example');
  const exampleName = document.getElementById('viewer-example-name');
  const backButton = document.getElementById('viewer-back');

  const state = {
    open: false,
    tab: '3d',
    graph: null,
    ids: [],
    homeIds: [],
    example: null,
    reasons: {},
    model: null,
    conformers: [],
    confIndex: 0,
    job: null,
    timer: null,
    spinFrame: null,
    rot: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    center: { x: 0, y: 0, z: 0 },
    zoom: 1,
    style: 'ball',
    showH: true,
    measure: false,
    picks: [],
    hover: -1,
    stereo: new Map(),
    projected: [],
    drag: null,
    chair: null,
    ringIndex: 0,
    newmanBond: null,
    angle: 180,
    newman: null,
    curve: null,
    curveKey: '',
    curveTimer: null,
    fischer: null,
    haworth: null,
    hoverBond: null,
  };

  try {
    const saved = JSON.parse(deps.storageGet('viewer3d') || '{}') || {};
    if (['ball', 'stick', 'space'].includes(saved.style)) {
      state.style = saved.style;
    }
    if (typeof saved.showH === 'boolean') {
      state.showH = saved.showH;
    }
    if (VIEWER3D_TABS.includes(saved.tab)) {
      state.tab = saved.tab;
    }
  } catch (error) {
    state.style = 'ball';
  }

  function persist() {
    try {
      deps.storageSet('viewer3d', JSON.stringify({ style: state.style, showH: state.showH, tab: state.tab }));
    } catch (error) {
      return;
    }
  }

  function palette() {
    const style = getComputedStyle(dialog);
    const v = (name, fallback) => (style.getPropertyValue(name) || '').trim() || fallback;
    return {
      bg: v('--bg-app', '#111318'),
      panel: v('--bg-elevated', '#1c1f26'),
      text: v('--text-primary', '#e5e7eb'),
      muted: v('--text-muted', '#9ca3af'),
      border: v('--border', '#374151'),
      accent: v('--lab-cyan', '#22d3ee'),
      alt: v('--lab-violet', '#a78bfa'),
      ok: v('--ok', '#34d399'),
      font: v('--font-ui', 'sans-serif'),
      mono: v('--font-mono', 'monospace'),
    };
  }

  function sizeCanvas(target, host) {
    const rect = host.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (target.width !== Math.round(w * ratio) || target.height !== Math.round(h * ratio)) {
      target.width = Math.round(w * ratio);
      target.height = Math.round(h * ratio);
    }
    target.style.width = w + 'px';
    target.style.height = h + 'px';
    return { w, h, ratio };
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function atomName(model, index) {
    const atom = model.atoms[index];
    if (atom.element === 'H') {
      const parent = model.index.get(atom.parent);
      return parent === undefined ? 'H' : `H on ${atomName(model, parent)}`;
    }
    return `${atom.element}${model.atomIds.indexOf(atom.id) + 1}`;
  }

  function stopJob() {
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = null;
    }
    if (state.job) {
      state.job.cancelled = true;
      state.job = null;
    }
    if (state.curveTimer) {
      clearTimeout(state.curveTimer);
      state.curveTimer = null;
    }
  }

  function stopSpin() {
    if (state.spinFrame) {
      cancelAnimationFrame(state.spinFrame);
      state.spinFrame = null;
    }
  }

  function fitView() {
    const model = state.model;
    if (!model) {
      return;
    }
    const heavy = model.atoms.filter((a) => a.element !== 'H');
    const pts = heavy.length ? heavy : model.atoms;
    const c = { x: 0, y: 0, z: 0 };
    pts.forEach((a) => {
      c.x += a.x / pts.length;
      c.y += a.y / pts.length;
      c.z += a.z / pts.length;
    });
    state.center = c;
    state.zoom = 1;
  }

  function currentModel() {
    return state.conformers[state.confIndex] || state.model;
  }

  function computeStereo() {
    state.stereo = new Map();
    const model = currentModel();
    if (!model) {
      return;
    }
    try {
      model3dStereo(model).forEach((s) => {
        if (s.type) {
          state.stereo.set(s.atomId, s.type);
        }
      });
    } catch (error) {
      state.stereo = new Map();
    }
  }

  function renderConformers() {
    const list = state.conformers;
    const min = list.length ? list[0].energy : 0;
    conformerList.innerHTML = list.map((m, i) => `<li><button type="button" data-index="${i}" class="${i === state.confIndex ? 'active' : ''}"><span>#${i + 1}</span><span>${(m.energy - min).toFixed(2)}</span></button></li>`).join('');
  }

  function setStatus(text) {
    status.textContent = text || '';
  }

  function pumpSearch() {
    const job = state.job;
    if (!job || job.cancelled) {
      return;
    }
    const done = job.step(40);
    const current = currentModel();
    state.conformers = job.conformers.slice(0, GEO3D_SETTINGS.conformerCount);
    const found = state.conformers.indexOf(current);
    state.confIndex = found >= 0 ? found : 0;
    renderConformers();
    if (done) {
      state.job = null;
      state.timer = null;
      const min = state.conformers.length ? state.conformers[0].energy : 0;
      state.conformers.forEach((c) => {
        c.relEnergy = c.energy - min;
      });
      setStatus(`${state.conformers.length} conformer${state.conformers.length === 1 ? '' : 's'} · energies relative, arbitrary units`);
      if (state.tab === 'newman') {
        refreshNewman(true);
      }
      draw();
      return;
    }
    setStatus(`Searching conformers… ${state.conformers.length} found`);
    draw();
    state.timer = setTimeout(pumpSearch, 0);
  }

  function evaluateTabs() {
    const graph = state.graph;
    const ids = state.ids;
    const reasons = {};
    try {
      state.chair = chairAnalysis(graph, ids, { ringIndex: state.ringIndex });
    } catch (error) {
      state.chair = { applicable: false, reason: 'Chair analysis failed' };
    }
    try {
      state.fischer = fischerProjection(graph, ids);
    } catch (error) {
      state.fischer = { applicable: false, reason: 'Fischer projection failed' };
    }
    try {
      state.haworth = haworthProjection(graph, ids);
    } catch (error) {
      state.haworth = { applicable: false, reason: 'Haworth projection failed' };
    }
    const bonds = state.model ? newmanBonds(state.model) : [];
    if (!state.chair.applicable) {
      reasons.chair = state.chair.reason;
    }
    if (!state.fischer.applicable) {
      reasons.fischer = state.fischer.reason;
    }
    if (!state.haworth.applicable) {
      reasons.haworth = state.haworth.reason;
    }
    if (!bonds.length) {
      reasons.newman = 'Needs a rotatable single bond between two non-terminal atoms';
    }
    tabs.forEach((tab) => {
      const key = tab.dataset.tab;
      const reason = reasons[key];
      tab.classList.toggle('unavailable', Boolean(reason));
      tab.title = reason ? `Not available: ${reason}` : '';
    });
    bondSelect.innerHTML = bonds.map((b) => `<option value="${b.bondId}">${escapeHtml(b.label)}</option>`).join('');
    if (bonds.length) {
      const hovered = !state.example && deps.hoveredBondId ? deps.hoveredBondId() : null;
      state.newmanBond = newmanDefaultBond(state.model, hovered);
      bondSelect.value = String(state.newmanBond);
    } else {
      state.newmanBond = null;
      state.newman = null;
    }
    if (state.chair.applicable) {
      ringSelect.innerHTML = state.chair.rings.map((r) => `<option value="${r.index}">${escapeHtml(r.label)}</option>`).join('');
      ringSelect.value = String(state.chair.ringIndex);
      ringSelect.disabled = state.chair.rings.length < 2;
    } else {
      ringSelect.innerHTML = '';
      ringSelect.disabled = true;
    }
    state.reasons = reasons;
    return reasons;
  }

  function load(graph, ids) {
    let model;
    try {
      model = embed3d(graph, ids, { seed: 1 });
    } catch (error) {
      deps.toast('Could not build a 3D model for this structure', { kind: 'error' });
      return false;
    }
    stopJob();
    state.graph = graph;
    state.ids = ids;
    state.model = model;
    state.picks = [];
    state.hover = -1;
    state.curve = null;
    state.curveKey = '';
    state.ringIndex = 0;
    state.conformers = [state.model];
    state.confIndex = 0;
    state.rot = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    fitView();
    computeStereo();
    evaluateTabs();
    renderMeasure();
    renderConformers();
    renderExample();
    return true;
  }

  function startSearch() {
    state.job = conformerSearch3d(state.graph, state.ids, { seed: 1 });
    setStatus('Searching conformers…');
    state.timer = setTimeout(pumpSearch, 30);
  }

  function renderExample() {
    exampleBanner.hidden = !state.example;
    exampleName.textContent = state.example ? state.example.name : '';
  }

  function renderUnavailable() {
    const reason = state.tab === '3d' ? null : state.reasons[state.tab];
    const example = VIEWER3D_EXAMPLES[state.tab];
    unavailable.hidden = !reason;
    if (!reason) {
      return;
    }
    unavailableReason.textContent = reason;
    unavailableHint.textContent = example ? example.hint : '';
    exampleButton.hidden = !example;
    exampleButton.textContent = example ? `Show example: ${example.name}` : '';
  }

  function showExample(tab) {
    const example = VIEWER3D_EXAMPLES[tab];
    if (!example) {
      return;
    }
    let built;
    try {
      built = graphFromSmiles3d(example.smiles);
    } catch (error) {
      deps.toast('Could not build the example', { kind: 'error' });
      return;
    }
    const previous = state.example;
    state.example = example;
    if (!load(built.graph, built.ids)) {
      state.example = previous;
      renderExample();
      return;
    }
    selectTab(tab);
    startSearch();
  }

  function backToMolecule() {
    const ids = state.homeIds.filter((id) => deps.graph.getAtom(id));
    if (!ids.length) {
      return;
    }
    state.example = null;
    if (!load(deps.graph, ids)) {
      return;
    }
    selectTab(state.tab);
    startSearch();
  }

  function open() {
    const ids = deps.targetAtomIds();
    const heavy = ids.filter((id) => deps.graph.getAtom(id) && deps.graph.getAtom(id).element !== 'H');
    if (!heavy.length) {
      deps.toast('Draw a molecule first', { kind: 'warn' });
      return;
    }
    if (heavy.length > GEO3D_SETTINGS.maxHeavy) {
      deps.toast(`Too large for the 3D viewer (${heavy.length} heavy atoms, limit ${GEO3D_SETTINGS.maxHeavy})`, { kind: 'warn' });
      return;
    }
    const previous = state.example;
    state.example = null;
    if (!load(deps.graph, ids)) {
      state.example = previous;
      return;
    }
    state.homeIds = ids;
    overlay.hidden = false;
    state.open = true;
    styleSelect.value = state.style;
    hToggle.checked = state.showH;
    spinToggle.checked = false;
    measureToggle.checked = false;
    state.measure = false;
    renderMeasure();
    selectTab(state.tab);
    startSearch();
  }

  function close() {
    stopJob();
    stopSpin();
    state.open = false;
    overlay.hidden = true;
    tip.hidden = true;
  }

  function selectTab(tab) {
    const button = tabs.find((t) => t.dataset.tab === tab);
    if (!button) {
      return;
    }
    state.tab = tab;
    persist();
    tabs.forEach((t) => {
      t.classList.toggle('active', t === button);
      t.setAttribute('aria-selected', t === button ? 'true' : 'false');
    });
    panes.forEach((p) => {
      p.hidden = p.dataset.pane !== tab;
    });
    tip.hidden = true;
    stage.classList.toggle('viewer-rotatable', tab === '3d');
    renderUnavailable();
    if (tab === 'newman') {
      refreshNewman(true);
    }
    if (tab === 'chair') {
      renderChairInfo();
    }
    if (tab === 'fischer') {
      renderFischerInfo();
    }
    if (tab === 'haworth') {
      renderHaworthInfo();
    }
    if (tab === '3d' && spinToggle.checked) {
      startSpin();
    } else {
      stopSpin();
    }
    draw();
  }

  function project(model, w, h) {
    const heavy = model.atoms.filter((a) => a.element !== 'H');
    const pts = heavy.length ? heavy : model.atoms;
    let radius = 1;
    pts.forEach((a) => {
      radius = Math.max(radius, Math.hypot(a.x - state.center.x, a.y - state.center.y, a.z - state.center.z));
    });
    const scale = (Math.min(w, h) * 0.42 * state.zoom) / (radius + 1.2);
    const R = state.rot;
    return model.atoms.map((a) => {
      const x = a.x - state.center.x;
      const y = a.y - state.center.y;
      const z = a.z - state.center.z;
      const vx = R[0] * x + R[1] * y + R[2] * z;
      const vy = R[3] * x + R[4] * y + R[5] * z;
      const vz = R[6] * x + R[7] * y + R[8] * z;
      const persp = 1 / (1 - vz / 40);
      return { sx: w / 2 + vx * scale * persp, sy: h / 2 - vy * scale * persp, z: vz, s: scale * persp };
    });
  }

  function atomRadius(element) {
    if (state.style === 'space') {
      return geo3dVdwRadius(element);
    }
    if (state.style === 'stick') {
      return element === 'H' ? 0.1 : 0.15;
    }
    return VIEWER3D_BALL[element] || 0.42;
  }

  function draw3d(w, h, colors) {
    const model = currentModel();
    if (!model) {
      return;
    }
    const pr = project(model, w, h);
    state.projected = pr;
    const theme = deps.renderer.theme;
    const visible = model.atoms.map((a) => state.showH || a.element !== 'H');
    const items = [];
    model.atoms.forEach((a, i) => {
      if (visible[i]) {
        items.push({ kind: 'atom', i, z: pr[i].z });
      }
    });
    if (state.style !== 'space') {
      model.bonds.forEach((b) => {
        const i = model.index.get(b.atomA);
        const j = model.index.get(b.atomB);
        if (!visible[i] || !visible[j]) {
          return;
        }
        items.push({ kind: 'half', i, j, order: b.order, z: (pr[i].z * 3 + pr[j].z) / 4 - 0.01 });
        items.push({ kind: 'half', i: j, j: i, order: b.order, z: (pr[j].z * 3 + pr[i].z) / 4 - 0.01 });
      });
    }
    items.sort((p, q) => p.z - q.z);
    const bondRadius = state.style === 'stick' ? 0.15 : 0.09;
    items.forEach((item) => {
      const a = pr[item.i];
      const atom = model.atoms[item.i];
      const rgb = viewer3dHexToRgb(colorForElement(atom.element, theme));
      if (item.kind === 'half') {
        const b = pr[item.j];
        const mx = (a.sx + b.sx) / 2;
        const my = (a.sy + b.sy) / 2;
        const width = Math.max(1.2, bondRadius * 2 * a.s);
        const lines = state.style === 'stick' ? [0] : item.order === 2 ? [-1, 1] : item.order === 3 ? [-1.6, 0, 1.6] : item.order === 1.5 ? [0, 1] : [0];
        const dx = b.sx - a.sx;
        const dy = b.sy - a.sy;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const gap = width * (item.order === 3 ? 1.1 : 1.2);
        lines.forEach((off, k) => {
          const ox = nx * off * gap * (item.order === 1.5 ? 1.4 : 1);
          const oy = ny * off * gap * (item.order === 1.5 ? 1.4 : 1);
          const w1 = item.order === 1.5 && k === 1 ? width * 0.6 : lines.length > 1 ? width * 0.8 : width;
          ctx2d.setLineDash(item.order === 1.5 && k === 1 ? [w1 * 1.5, w1 * 1.5] : []);
          ctx2d.lineCap = item.order === 1.5 && k === 1 ? 'butt' : 'round';
          ctx2d.strokeStyle = viewer3dShade(rgb, -0.45);
          ctx2d.lineWidth = w1;
          ctx2d.beginPath();
          ctx2d.moveTo(a.sx + ox, a.sy + oy);
          ctx2d.lineTo(mx + ox, my + oy);
          ctx2d.stroke();
          ctx2d.strokeStyle = viewer3dShade(rgb, 0.05);
          ctx2d.lineWidth = w1 * 0.55;
          ctx2d.beginPath();
          ctx2d.moveTo(a.sx + ox - w1 * 0.12, a.sy + oy - w1 * 0.12);
          ctx2d.lineTo(mx + ox - w1 * 0.12, my + oy - w1 * 0.12);
          ctx2d.stroke();
        });
        ctx2d.setLineDash([]);
        return;
      }
      const r = Math.max(2, atomRadius(atom.element) * a.s);
      const g = ctx2d.createRadialGradient(a.sx - r * 0.35, a.sy - r * 0.4, r * 0.1, a.sx, a.sy, r);
      g.addColorStop(0, viewer3dShade(rgb, 0.65));
      g.addColorStop(0.45, viewer3dShade(rgb, 0));
      g.addColorStop(1, viewer3dShade(rgb, -0.55));
      ctx2d.fillStyle = g;
      ctx2d.beginPath();
      ctx2d.arc(a.sx, a.sy, r, 0, Math.PI * 2);
      ctx2d.fill();
      const pickIndex = state.picks.indexOf(item.i);
      if (pickIndex >= 0 || item.i === state.hover) {
        ctx2d.strokeStyle = pickIndex >= 0 ? colors.accent : colors.alt;
        ctx2d.lineWidth = 2;
        ctx2d.beginPath();
        ctx2d.arc(a.sx, a.sy, r + 3, 0, Math.PI * 2);
        ctx2d.stroke();
      }
    });
    if (state.picks.length > 1) {
      ctx2d.strokeStyle = colors.accent;
      ctx2d.lineWidth = 1.5;
      ctx2d.setLineDash([5, 4]);
      ctx2d.beginPath();
      state.picks.forEach((i, k) => {
        if (k === 0) {
          ctx2d.moveTo(pr[i].sx, pr[i].sy);
        } else {
          ctx2d.lineTo(pr[i].sx, pr[i].sy);
        }
      });
      ctx2d.stroke();
      ctx2d.setLineDash([]);
    }
    ctx2d.fillStyle = colors.muted;
    ctx2d.font = `12px ${colors.font}`;
    ctx2d.textAlign = 'left';
    ctx2d.textBaseline = 'bottom';
    const model0 = state.conformers[0];
    const rel = model0 ? model.energy - model0.energy : 0;
    ctx2d.fillText(`Conformer ${state.confIndex + 1}/${state.conformers.length} · E ${model.energy.toFixed(2)} (ΔE ${rel.toFixed(2)}, relative, arbitrary units)`, 12, h - 10);
  }

  function chairPoints(flip) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const theta = (Math.PI / 3) * (i + 1);
      const z = (i % 2 === 0 ? 1 : -1) * (flip ? -1 : 1) * 0.25;
      pts.push({ x: Math.cos(theta), y: Math.sin(theta), z, theta });
    }
    return pts;
  }

  function drawChair(cx, cy, size, flip, analysis, colors, title, stable) {
    const pts = chairPoints(flip);
    const scr = (p) => ({ x: cx + p.x * size, y: cy - (p.z * 1.2 + p.y * 0.3) * size });
    const ring = pts.map(scr);
    ctx2d.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % 6];
      const front = a.y + b.y < 0;
      ctx2d.strokeStyle = colors.text;
      ctx2d.lineWidth = front ? 3 : 1.6;
      ctx2d.beginPath();
      ctx2d.moveTo(ring[i].x, ring[i].y);
      ctx2d.lineTo(ring[(i + 1) % 6].x, ring[(i + 1) % 6].y);
      ctx2d.stroke();
    }
    analysis.ringElements.forEach((el, i) => {
      if (el !== 'C') {
        ctx2d.fillStyle = colors.bg;
        ctx2d.beginPath();
        ctx2d.arc(ring[i].x, ring[i].y, 9, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.fillStyle = colorForElement(el, deps.renderer.theme);
        ctx2d.font = `bold 14px ${colors.font}`;
        ctx2d.textAlign = 'center';
        ctx2d.textBaseline = 'middle';
        ctx2d.fillText(el, ring[i].x, ring[i].y);
      }
    });
    analysis.substituents.forEach((s) => {
      const p = pts[s.ringPosition];
      const axial = flip ? s.axialB : s.axialA;
      const upPucker = p.z > 0;
      let dir;
      if (axial === null || axial === undefined) {
        return;
      }
      if (axial) {
        dir = { x: 0, y: 0, z: upPucker ? 1 : -1 };
      } else {
        dir = { x: Math.cos(p.theta) * 0.95, y: Math.sin(p.theta) * 0.95, z: upPucker ? -0.33 : 0.33 };
      }
      const len = s.hydrogen ? 0.4 : 0.6;
      const end = { x: p.x + dir.x * len, y: p.y + dir.y * len, z: p.z + dir.z * len };
      const a = scr(p);
      const b = scr(end);
      const highlight = !s.hydrogen && axial;
      ctx2d.strokeStyle = s.hydrogen ? colors.muted : highlight ? colors.alt : colors.text;
      ctx2d.lineWidth = s.hydrogen ? 1 : 1.8;
      ctx2d.beginPath();
      ctx2d.moveTo(a.x, a.y);
      ctx2d.lineTo(b.x, b.y);
      ctx2d.stroke();
      const left = b.x < a.x - 2;
      const text = s.hydrogen ? 'H' : viewer3dSubscript(left ? s.labelLeft : s.labelRight);
      ctx2d.font = `${s.hydrogen ? 11 : 13}px ${colors.font}`;
      ctx2d.fillStyle = s.hydrogen ? colors.muted : highlight ? colors.alt : colors.text;
      ctx2d.textAlign = Math.abs(b.x - a.x) < 3 ? 'center' : left ? 'right' : 'left';
      ctx2d.textBaseline = b.y < a.y - 2 ? 'bottom' : b.y > a.y + 2 ? 'top' : 'middle';
      ctx2d.fillText(text, b.x + (left ? -2 : Math.abs(b.x - a.x) < 3 ? 0 : 2), b.y);
    });
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'top';
    ctx2d.font = `${stable ? 'bold ' : ''}13px ${colors.font}`;
    ctx2d.fillStyle = stable ? colors.ok : colors.muted;
    ctx2d.fillText(title, cx, cy + size * 1.55);
  }

  function drawChairTab(w, h, colors) {
    const analysis = state.chair;
    if (!analysis || !analysis.applicable) {
      return;
    }
    const size = Math.min(w / 7.5, h / 4.2);
    const eA = analysis.energies.A;
    const eB = analysis.energies.B;
    drawChair(w * 0.25, h * 0.45, size, false, analysis, colors, `Chair A · axial strain ${eA.toFixed(2)} kcal/mol`, analysis.stable === 'A');
    drawChair(w * 0.75, h * 0.45, size, true, analysis, colors, `Chair B · axial strain ${eB.toFixed(2)} kcal/mol`, analysis.stable === 'B');
    ctx2d.fillStyle = colors.muted;
    ctx2d.font = `22px ${colors.font}`;
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText('⇌', w / 2, h * 0.45 - size * 1.3);
    ctx2d.font = `12px ${colors.font}`;
    ctx2d.fillText('Ring flip · axial substituents highlighted', w / 2, h - 20);
  }

  function drawNewmanTab(w, h, colors) {
    const data = state.newman;
    if (!data) {
      return;
    }
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.16;
    const spoke = r * 2.1;
    const pos = (angle, len) => ({ x: cx + Math.sin((angle * Math.PI) / 180) * len, y: cy - Math.cos((angle * Math.PI) / 180) * len });
    const label = (s, len, color) => {
      const p = pos(s.angle, len + 14);
      ctx2d.fillStyle = color;
      ctx2d.font = `${s.label === 'H' ? '' : 'bold '}14px ${colors.font}`;
      ctx2d.textAlign = 'center';
      ctx2d.textBaseline = 'middle';
      const left = Math.sin((s.angle * Math.PI) / 180) < -0.3;
      ctx2d.fillText(viewer3dSubscript(s.label === 'H' ? 'H' : left ? projGroupLabel(state.graph, currentModel().ctx, s.parentId, s.atomId, 'left') : s.label), p.x, p.y);
    };
    ctx2d.lineCap = 'round';
    data.back.forEach((s) => {
      const a = pos(s.angle, r);
      const b = pos(s.angle, spoke);
      ctx2d.strokeStyle = s.reference ? colors.alt : colors.muted;
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      ctx2d.moveTo(a.x, a.y);
      ctx2d.lineTo(b.x, b.y);
      ctx2d.stroke();
      label(Object.assign({ parentId: data.backAtomId }, s), spoke, s.reference ? colors.alt : colors.muted);
    });
    ctx2d.fillStyle = colors.bg;
    ctx2d.strokeStyle = colors.text;
    ctx2d.lineWidth = 2;
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, r, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.stroke();
    data.front.forEach((s) => {
      const b = pos(s.angle, spoke * 0.95);
      ctx2d.strokeStyle = s.reference ? colors.accent : colors.text;
      ctx2d.lineWidth = 2.4;
      ctx2d.beginPath();
      ctx2d.moveTo(cx, cy);
      ctx2d.lineTo(b.x, b.y);
      ctx2d.stroke();
      label(Object.assign({ parentId: data.frontAtomId }, s), spoke * 0.95, s.reference ? colors.accent : colors.text);
    });
    ctx2d.fillStyle = colors.text;
    ctx2d.beginPath();
    ctx2d.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.font = `bold 15px ${colors.font}`;
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'top';
    ctx2d.fillText(`${Math.round(data.dihedral)}° · ${data.name}`, cx, 14);
    ctx2d.font = `12px ${colors.font}`;
    ctx2d.fillStyle = colors.muted;
    ctx2d.fillText('Front carbon: spokes · back carbon: circle', cx, h - 26);
  }

  function drawFischerTab(w, h, colors) {
    const f = state.fischer;
    if (!f || !f.applicable) {
      return;
    }
    const rows = f.rows;
    const step = Math.min(64, (h - 90) / Math.max(1, rows.length - 1));
    const top = h / 2 - (step * (rows.length - 1)) / 2;
    const cx = w / 2;
    const arm = Math.min(70, w * 0.12);
    ctx2d.lineCap = 'round';
    ctx2d.strokeStyle = colors.text;
    ctx2d.lineWidth = 2;
    const yAt = (k) => top + k * step;
    const gapFor = (row) => (row.type === 'center' ? 0 : 12);
    for (let k = 0; k < rows.length - 1; k++) {
      ctx2d.beginPath();
      ctx2d.moveTo(cx, yAt(k) + gapFor(rows[k]));
      ctx2d.lineTo(cx, yAt(k + 1) - gapFor(rows[k + 1]));
      ctx2d.stroke();
    }
    ctx2d.textBaseline = 'middle';
    rows.forEach((row, k) => {
      const y = yAt(k);
      if (row.type !== 'center') {
        ctx2d.fillStyle = colors.text;
        ctx2d.font = `bold 15px ${colors.font}`;
        ctx2d.textAlign = 'center';
        ctx2d.fillText(viewer3dSubscript(row.label), cx, y);
        return;
      }
      ctx2d.strokeStyle = colors.text;
      ctx2d.beginPath();
      ctx2d.moveTo(cx - arm, y);
      ctx2d.lineTo(cx + arm, y);
      ctx2d.stroke();
      ctx2d.font = `15px ${colors.font}`;
      ctx2d.fillStyle = row.left === 'H' ? colors.muted : colors.text;
      ctx2d.textAlign = 'right';
      ctx2d.fillText(viewer3dSubscript(row.left), cx - arm - 6, y);
      ctx2d.fillStyle = row.right === 'H' ? colors.muted : colors.text;
      ctx2d.textAlign = 'left';
      ctx2d.fillText(viewer3dSubscript(row.right), cx + arm + 6, y);
      ctx2d.fillStyle = row.atomId === f.dlFrom && f.dl ? colors.alt : colors.muted;
      ctx2d.font = `11px ${colors.font}`;
      ctx2d.fillText(`(${row.config})`, cx + 6, y - 11);
    });
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'top';
    ctx2d.fillStyle = colors.accent;
    ctx2d.font = `bold 16px ${colors.font}`;
    ctx2d.fillText(f.meso ? 'meso' : f.dl ? `${f.dl}-configured` : 'Fischer projection', cx, 12);
    ctx2d.fillStyle = colors.muted;
    ctx2d.font = `12px ${colors.font}`;
    ctx2d.textBaseline = 'bottom';
    ctx2d.fillText('Horizontal bonds point toward you, vertical bonds away', cx, h - 10);
  }

  function drawHaworthTab(w, h, colors) {
    const hw = state.haworth;
    if (!hw || !hw.applicable) {
      return;
    }
    const layout6 = [[0.5, -0.36], [1, 0], [0.55, 0.36], [-0.55, 0.36], [-1, 0], [-0.5, -0.36]];
    const layout5 = [[0, -0.4], [0.9, 0], [0.5, 0.36], [-0.5, 0.36], [-0.9, 0]];
    const layout = hw.ringSize === 6 ? layout6 : layout5;
    const size = Math.min(w * 0.28, h * 0.4);
    const cx = w / 2;
    const cy = h / 2 + 10;
    const pts = layout.map(([x, y]) => ({ x: cx + x * size, y: cy + y * size }));
    ctx2d.lineCap = 'round';
    ctx2d.lineJoin = 'round';
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const front = layout[i][1] > 0 || layout[(i + 1) % pts.length][1] > 0;
      const both = layout[i][1] >= 0 && layout[(i + 1) % pts.length][1] >= 0 && front;
      ctx2d.strokeStyle = colors.text;
      ctx2d.lineWidth = both ? 6 : front ? 3.5 : 1.8;
      ctx2d.beginPath();
      ctx2d.moveTo(a.x, a.y);
      ctx2d.lineTo(b.x, b.y);
      ctx2d.stroke();
    }
    const o = pts[0];
    ctx2d.fillStyle = colors.bg;
    ctx2d.beginPath();
    ctx2d.arc(o.x, o.y, 10, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.fillStyle = colorForElement('O', deps.renderer.theme);
    ctx2d.font = `bold 15px ${colors.font}`;
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'middle';
    ctx2d.fillText('O', o.x, o.y);
    const arm = size * 0.3;
    hw.positions.forEach((p, i) => {
      if (i === 0) {
        return;
      }
      const base = pts[i];
      [['up', -1], ['down', 1]].forEach(([face, sign]) => {
        const text = p[face];
        if (!text) {
          return;
        }
        const len = text === 'H' ? arm * 0.65 : arm;
        ctx2d.strokeStyle = text === 'H' ? colors.muted : colors.text;
        ctx2d.lineWidth = 1.8;
        ctx2d.beginPath();
        ctx2d.moveTo(base.x, base.y);
        ctx2d.lineTo(base.x, base.y + sign * len);
        ctx2d.stroke();
        const left = layout[i][0] < -0.1;
        const labelText = text === 'H' ? 'H' : left && text === 'OH' ? 'HO' : left && text === 'CH2OH' ? 'HOCH2' : text;
        ctx2d.fillStyle = text === 'H' ? colors.muted : colors.text;
        ctx2d.font = `${text === 'H' ? '' : 'bold '}14px ${colors.font}`;
        ctx2d.textAlign = 'center';
        ctx2d.textBaseline = sign < 0 ? 'bottom' : 'top';
        ctx2d.fillText(viewer3dSubscript(labelText), base.x, base.y + sign * (len + 3));
      });
    });
    ctx2d.fillStyle = colors.accent;
    ctx2d.font = `bold 16px ${colors.font}`;
    ctx2d.textAlign = 'center';
    ctx2d.textBaseline = 'top';
    ctx2d.fillText(`${hw.label ? hw.label + ' ' : ''}${hw.kind}`, cx, 12);
    ctx2d.fillStyle = colors.muted;
    ctx2d.font = `12px ${colors.font}`;
    ctx2d.textBaseline = 'bottom';
    ctx2d.fillText('Ring oxygen at the back right, anomeric carbon on the right', cx, h - 10);
  }

  function draw() {
    if (!state.open) {
      return;
    }
    const { w, h, ratio } = sizeCanvas(canvas, stage);
    const colors = palette();
    ctx2d.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx2d.fillStyle = colors.bg;
    ctx2d.fillRect(0, 0, w, h);
    if (state.tab === '3d') {
      draw3d(w, h, colors);
    } else if (state.tab === 'chair') {
      drawChairTab(w, h, colors);
    } else if (state.tab === 'newman') {
      drawNewmanTab(w, h, colors);
      drawCurve();
    } else if (state.tab === 'fischer') {
      drawFischerTab(w, h, colors);
    } else if (state.tab === 'haworth') {
      drawHaworthTab(w, h, colors);
    }
  }

  function renderMeasure() {
    const model = currentModel();
    if (!state.measure) {
      measureOut.textContent = '';
      return;
    }
    if (!model || !state.picks.length) {
      measureOut.textContent = 'Click 2 atoms for a distance, 3 for an angle, 4 for a dihedral.';
      return;
    }
    const at = state.picks.map((i) => model.atoms[i]);
    const names = state.picks.map((i) => atomName(model, i)).join(' – ');
    let value = '';
    if (at.length === 2) {
      value = `Distance ${distance3d(at[0], at[1]).toFixed(3)} Å`;
    } else if (at.length === 3) {
      value = `Angle ${angle3d(at[0], at[1], at[2]).toFixed(1)}°`;
    } else if (at.length === 4) {
      value = `Dihedral ${dihedral3d(at[0], at[1], at[2], at[3]).toFixed(1)}°`;
    }
    measureOut.innerHTML = `<div>${escapeHtml(names)}</div>${value ? `<strong>${escapeHtml(value)}</strong>` : ''}`;
  }

  function renderChairInfo() {
    const a = state.chair;
    if (!a || !a.applicable) {
      chairInfo.textContent = a ? a.reason : '';
      return;
    }
    const subs = a.substituents.filter((s) => !s.hydrogen);
    const stable = a.stable ? `Chair ${a.stable}` : 'Equal';
    const rows = subs.map((s) => {
      const where = a.stable === 'B' ? s.axialB : s.axialA;
      const pos = where === null ? '?' : where ? 'axial' : 'equatorial';
      return `<tr><td>C${s.ringPosition + 1}</td><td>${escapeHtml(viewer3dSubscript(s.labelRight))}</td><td>${s.face || '?'}</td><td>${pos}</td><td>${s.aValue.toFixed(2)}${s.known ? '' : '*'}</td></tr>`;
    }).join('');
    chairInfo.innerHTML = `<dl class="viewer-facts"><dt>ΔG</dt><dd>${a.deltaG.toFixed(2)} kcal/mol</dd><dt>More stable</dt><dd>${stable}</dd><dt>Ratio (25 °C)</dt><dd>${a.ratio[0].toFixed(a.ratio[0] > 99 || a.ratio[0] < 1 ? 2 : 1)} : ${a.ratio[1].toFixed(a.ratio[1] > 99 || a.ratio[1] < 1 ? 2 : 1)} (A : B)</dd></dl>`
      + (rows ? `<table class="viewer-table"><thead><tr><th>Pos</th><th>Group</th><th>Face</th><th>In ${a.stable || 'A'}</th><th>A</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="viewer-note">No substituents on this ring.</p>')
      + (subs.some((s) => !s.known) ? '<p class="viewer-note">* Unknown group: default A-value 1.7.</p>' : '')
      + (a.ambiguous ? '<p class="viewer-note">Some ring stereocentres have no wedge or hash, so their faces are unknown.</p>' : '');
  }

  function renderFischerInfo() {
    const f = state.fischer;
    if (!f || !f.applicable) {
      fischerInfo.textContent = f ? f.reason : '';
      return;
    }
    const centers = f.rows.filter((r) => r.type === 'center');
    fischerInfo.innerHTML = `<dl class="viewer-facts"><dt>Chain</dt><dd>${f.chain.length} carbons</dd><dt>Stereocentres</dt><dd>${centers.map((r) => r.config).join(', ')}</dd><dt>Series</dt><dd>${f.meso ? 'meso (internal mirror plane)' : f.dl ? f.dl : '—'}</dd></dl>`
      + '<p class="viewer-note">Most oxidized carbon at the top. D/L comes from the stereocentre farthest from it (the α-carbon for amino acids).</p>';
  }

  function renderHaworthInfo() {
    const hw = state.haworth;
    if (!hw || !hw.applicable) {
      haworthInfo.textContent = hw ? hw.reason : '';
      return;
    }
    const rows = hw.positions.slice(1).map((p) => `<tr><td>${p.role}</td><td>${escapeHtml(viewer3dSubscript(p.up || '—'))}</td><td>${escapeHtml(viewer3dSubscript(p.down || '—'))}</td></tr>`).join('');
    haworthInfo.innerHTML = `<dl class="viewer-facts"><dt>Ring</dt><dd>${hw.kind}</dd><dt>Anomer</dt><dd>${hw.anomer || 'undefined'}</dd><dt>Series</dt><dd>${hw.dl || '—'}</dd></dl>`
      + `<table class="viewer-table"><thead><tr><th>Atom</th><th>Up</th><th>Down</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function refreshNewman(recomputeCurve) {
    const model = currentModel();
    if (!model || state.newmanBond === null) {
      state.newman = null;
      newmanInfo.textContent = '';
      return;
    }
    if (recomputeCurve || state.newman === null || state.newman.bondId !== state.newmanBond) {
      const base = newmanData(model, state.newmanBond, null, { relax: false });
      if (base) {
        state.angle = Math.round(base.startDihedral) % 360;
      }
    }
    state.newman = newmanData(model, state.newmanBond, state.angle);
    angleSlider.value = String(Math.round(state.angle));
    angleValue.textContent = `${Math.round(state.angle)}°`;
    const key = `${state.newmanBond}|${state.confIndex}|${state.conformers.length}|${model.energy.toFixed(4)}`;
    if (state.curveKey !== key) {
      state.curveKey = key;
      state.curve = null;
      if (state.curveTimer) {
        clearTimeout(state.curveTimer);
      }
      state.curveTimer = setTimeout(() => {
        state.curveTimer = null;
        if (!state.open) {
          return;
        }
        state.curve = newmanCurve(currentModel(), state.newmanBond, 10);
        renderNewmanInfo();
        draw();
      }, 20);
    }
    renderNewmanInfo();
  }

  function renderNewmanInfo() {
    const d = state.newman;
    if (!d) {
      newmanInfo.textContent = '';
      return;
    }
    const rel = state.curve ? d.energy - state.curve.min : null;
    newmanInfo.innerHTML = `<dl class="viewer-facts"><dt>Dihedral</dt><dd>${Math.round(d.dihedral)}°</dd><dt>Conformation</dt><dd>${escapeHtml(d.name)}</dd><dt>Energy</dt><dd>${rel === null ? 'computing…' : `${rel.toFixed(2)} above minimum`}</dd></dl>`
      + '<p class="viewer-note">Relaxed force-field scan, relative, arbitrary units.</p>';
  }

  function drawCurve() {
    const { w, h, ratio } = sizeCanvas(curveCanvas, curveCanvas.parentElement);
    const c = curveCanvas.getContext('2d');
    const colors = palette();
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.clearRect(0, 0, w, h);
    const curve = state.curve;
    const padL = 28;
    const padB = 30;
    const padT = 8;
    const plotW = w - padL - 8;
    const plotH = h - padB - padT;
    c.strokeStyle = colors.border;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(padL, padT);
    c.lineTo(padL, padT + plotH);
    c.lineTo(padL + plotW, padT + plotH);
    c.stroke();
    c.fillStyle = colors.muted;
    c.font = `10px ${colors.font}`;
    c.textAlign = 'center';
    c.textBaseline = 'top';
    [0, 60, 120, 180, 240, 300, 360].forEach((a) => {
      c.fillText(String(a), padL + (a / 360) * plotW, padT + plotH + 2);
    });
    [[0, 'syn'], [60, 'g'], [120, 'ecl'], [180, 'anti'], [240, 'ecl'], [300, 'g']].forEach(([a, t]) => {
      c.fillText(t, padL + (a / 360) * plotW, padT + plotH + 14);
    });
    if (!curve) {
      c.textBaseline = 'middle';
      c.fillText(state.newmanBond === null ? '' : 'computing…', padL + plotW / 2, padT + plotH / 2);
      return;
    }
    const max = Math.max(1e-6, ...curve.points.map((p) => p.rel));
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    c.fillText(max.toFixed(1), padL - 3, padT + 4);
    c.fillText('0', padL - 3, padT + plotH);
    c.strokeStyle = colors.accent;
    c.lineWidth = 2;
    c.beginPath();
    curve.points.forEach((p, k) => {
      const x = padL + (p.angle / 360) * plotW;
      const y = padT + plotH - (p.rel / max) * plotH;
      if (k === 0) {
        c.moveTo(x, y);
      } else {
        c.lineTo(x, y);
      }
    });
    c.stroke();
    if (state.newman) {
      const x = padL + (state.newman.dihedral / 360) * plotW;
      const y = padT + plotH - Math.min(1, (state.newman.energy - curve.min) / max) * plotH;
      c.strokeStyle = colors.alt;
      c.lineWidth = 1;
      c.setLineDash([3, 3]);
      c.beginPath();
      c.moveTo(x, padT);
      c.lineTo(x, padT + plotH);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = colors.alt;
      c.beginPath();
      c.arc(x, y, 4, 0, Math.PI * 2);
      c.fill();
    }
  }

  function pickAtom(x, y) {
    const model = currentModel();
    if (!model || !state.projected.length) {
      return -1;
    }
    let best = -1;
    let bestZ = -Infinity;
    state.projected.forEach((p, i) => {
      if (!state.showH && model.atoms[i].element === 'H') {
        return;
      }
      const r = Math.max(6, atomRadius(model.atoms[i].element) * p.s);
      if (Math.hypot(p.sx - x, p.sy - y) <= r && p.z > bestZ) {
        best = i;
        bestZ = p.z;
      }
    });
    return best;
  }

  function showTip(index, x, y) {
    const model = currentModel();
    if (index < 0 || !model) {
      tip.hidden = true;
      return;
    }
    const atom = model.atoms[index];
    const parts = [atomName(model, index)];
    if (atom.element !== 'H' && atom.hyb) {
      parts.push(atom.hyb);
    }
    const stereo = state.stereo.get(atom.id);
    if (stereo) {
      parts.push(`(${stereo})`);
    }
    tip.textContent = parts.join(' · ');
    tip.hidden = false;
    tip.style.left = `${Math.round(x + 14)}px`;
    tip.style.top = `${Math.round(y + 12)}px`;
  }

  function startSpin() {
    stopSpin();
    const tick = () => {
      if (!state.open || state.tab !== '3d' || !spinToggle.checked) {
        state.spinFrame = null;
        return;
      }
      state.rot = viewer3dMatMul(viewer3dAxisRotation(0, 1, 0, 0.01), state.rot);
      draw();
      state.spinFrame = requestAnimationFrame(tick);
    };
    state.spinFrame = requestAnimationFrame(tick);
  }

  function localPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (state.tab !== '3d') {
      return;
    }
    const p = localPoint(event);
    state.drag = { x: p.x, y: p.y, startX: p.x, startY: p.y, moved: false };
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      state.drag.capture = false;
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (state.tab !== '3d') {
      return;
    }
    const p = localPoint(event);
    if (state.drag) {
      const dx = p.x - state.drag.x;
      const dy = p.y - state.drag.y;
      if (Math.hypot(p.x - state.drag.startX, p.y - state.drag.startY) > 3) {
        state.drag.moved = true;
      }
      if (dx || dy) {
        const angle = Math.hypot(dx, dy) * 0.01;
        state.rot = viewer3dMatMul(viewer3dAxisRotation(-dy, -dx, 0, -angle), state.rot);
      }
      state.drag.x = p.x;
      state.drag.y = p.y;
      tip.hidden = true;
      draw();
      return;
    }
    const index = pickAtom(p.x, p.y);
    if (index !== state.hover) {
      state.hover = index;
      draw();
    }
    showTip(index, p.x, p.y);
  });

  canvas.addEventListener('pointerup', (event) => {
    if (state.tab !== '3d' || !state.drag) {
      return;
    }
    const moved = state.drag.moved;
    state.drag = null;
    if (moved || !state.measure) {
      return;
    }
    const p = localPoint(event);
    const index = pickAtom(p.x, p.y);
    if (index < 0) {
      return;
    }
    const existing = state.picks.indexOf(index);
    if (existing >= 0) {
      state.picks.splice(existing, 1);
    } else if (state.picks.length >= 4) {
      state.picks = [index];
    } else {
      state.picks.push(index);
    }
    renderMeasure();
    draw();
  });

  canvas.addEventListener('pointerleave', () => {
    tip.hidden = true;
    if (state.hover >= 0) {
      state.hover = -1;
      draw();
    }
  });

  canvas.addEventListener('wheel', (event) => {
    if (state.tab !== '3d') {
      return;
    }
    event.preventDefault();
    state.zoom = Math.max(0.2, Math.min(8, state.zoom * Math.exp(-event.deltaY * 0.0015)));
    draw();
  }, { passive: false });

  canvas.addEventListener('dblclick', (event) => {
    if (state.tab !== '3d') {
      return;
    }
    const p = localPoint(event);
    const index = pickAtom(p.x, p.y);
    const model = currentModel();
    if (index >= 0 && model) {
      const a = model.atoms[index];
      state.center = { x: a.x, y: a.y, z: a.z };
    } else {
      fitView();
    }
    draw();
  });

  tabs.forEach((tab) => tab.addEventListener('click', () => selectTab(tab.dataset.tab)));

  styleSelect.addEventListener('change', () => {
    state.style = styleSelect.value;
    persist();
    draw();
  });

  hToggle.addEventListener('change', () => {
    state.showH = hToggle.checked;
    state.picks = state.picks.filter((i) => state.showH || currentModel().atoms[i].element !== 'H');
    persist();
    renderMeasure();
    draw();
  });

  spinToggle.addEventListener('change', () => {
    if (spinToggle.checked) {
      startSpin();
    } else {
      stopSpin();
    }
  });

  measureToggle.addEventListener('change', () => {
    state.measure = measureToggle.checked;
    state.picks = [];
    stage.classList.toggle('viewer-measuring', state.measure);
    renderMeasure();
    draw();
  });

  conformerList.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-index]');
    if (!button) {
      return;
    }
    state.confIndex = Number(button.dataset.index);
    computeStereo();
    renderConformers();
    renderMeasure();
    draw();
  });

  minimizeButton.addEventListener('click', () => {
    const model = currentModel();
    if (!model) {
      return;
    }
    const before = model.energy;
    const result = minimize3d(model);
    computeStereo();
    renderConformers();
    renderMeasure();
    draw();
    deps.toast(`Minimized: E ${before.toFixed(2)} → ${result.energy.toFixed(2)} (relative, arbitrary units)`);
  });

  exportButton.addEventListener('click', () => {
    canvas.toBlob((blob) => {
      if (blob) {
        deps.downloadBlob(blob, `molecule-${state.tab}.png`);
      }
    }, 'image/png');
  });

  ringSelect.addEventListener('change', () => {
    state.ringIndex = Number(ringSelect.value) || 0;
    state.chair = chairAnalysis(state.graph, state.ids, { ringIndex: state.ringIndex });
    renderChairInfo();
    draw();
  });

  bondSelect.addEventListener('change', () => {
    state.newmanBond = Number(bondSelect.value);
    refreshNewman(true);
    draw();
  });

  angleSlider.addEventListener('input', () => {
    state.angle = Number(angleSlider.value);
    refreshNewman(false);
    draw();
  });

  exampleButton.addEventListener('click', () => showExample(state.tab));

  backButton.addEventListener('click', backToMolecule);

  closeButton.addEventListener('click', close);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      close();
    }
  });

  window.addEventListener('resize', () => {
    if (state.open) {
      draw();
    }
  });

  return {
    open,
    close,
    isOpen: () => state.open,
    selectTab,
    showExample,
    backToMolecule,
    redraw: draw,
    state,
  };
}
