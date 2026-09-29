(function () {
  const canvas = document.getElementById('editor-canvas');
  const ctx = canvas.getContext('2d');
  const graph = new Graph();
  const renderer = new Renderer(ctx, graph);
  renderer.valenceMarks = true;
  const interactions = new Interactions(canvas, graph, renderer);

  let lastCanvasSize = null;
  let spectraView = null;
  let viewer3d = null;
  let retroView = null;

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    if (lastCanvasSize) {
      renderer.view.x += (rect.width - lastCanvasSize.width) / 2;
      renderer.view.y += (rect.height - lastCanvasSize.height) / 2;
    }
    lastCanvasSize = { width: rect.width, height: rect.height };
    renderer.pixelRatio = ratio;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    renderer.render();
  }

  const panel = document.getElementById('info-panel');
  const panelBody = document.getElementById('info-body');
  let panelAnchor = null;
  let panelSignature = null;

  function escapeHtml(text) {
    return String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function fmt(value, digits) {
    return Number(value).toFixed(digits);
  }

  function row(label, value) {
    return '<tr><td>' + label + '</td><td>' + value + '</td></tr>';
  }

  function copyBlock(title, text, placeholder) {
    const inner = text
      ? '<div class="info-value" data-copy="' + escapeHtml(text) + '" title="Click to copy">' + escapeHtml(text) + '</div>'
      : '<div class="info-value muted">' + placeholder + '</div>';
    return '<div class="info-block"><h3>' + title + '</h3>' + inner + '</div>';
  }

  function buildPanel(atomIds) {
    const charged = atomIds.some((id) => graph.getAtom(id).charge);
    const p = computeProperties(graph, atomIds);
    const names = nameStructureDetailed(graph, atomIds);
    const short = names.common && names.common !== names.full ? names.common : null;
    let html = copyBlock('Full name', names.full, charged ? 'No name available for this ion' : '');
    html += copyBlock('Short name', short, 'No shorter name available');
    if (charged) {
      const ions = graph.connectedComponents()
        .filter((c) => c.atomIds.some((id) => graph.getAtom(id).charge))
        .map((c) => c.atomIds);
      const salt = ions.length > 1 ? nameSaltDetailed(graph, ions) : null;
      if (salt) {
        html += copyBlock('Salt name', salt.full, '');
        if (salt.common && salt.common !== salt.full) {
          html += copyBlock('Salt short name', salt.common, '');
        }
      }
    }
    html += copyBlock('SMILES', p.smiles, '');
    if (p.deuterium) {
      html += '<div class="info-note">SMILES and PubChem data describe the non-deuterated compound.</div>';
    }
    html += '<div class="info-block"><h3>Tier 1 &mdash; composition</h3><table class="info-table">' +
      row('Formula', '<span class="formula">' + formulaHtml(p.formula) + '</span>') +
      (p.charge ? row('Net charge', (p.charge > 0 ? '+' : '\u2212') + Math.abs(p.charge)) : '') +
      row('Average mass', fmt(p.averageMass, 3) + ' g/mol') +
      row('Exact mass', fmt(p.exactMass, 4)) +
      row('Heavy atoms / H', p.heavyAtoms + ' / ' + p.hydrogens) +
      (p.deuterium ? row('Deuterium atoms', p.deuterium) : '') +
      row('Rings (aromatic)', p.rings + ' (' + p.aromaticRings + ')') +
      row('H-bond donors / acceptors', p.donors + ' / ' + p.acceptors) +
      row('Rotatable bonds', p.rotatable) +
      row('TPSA', fmt(p.tpsa, 1) + ' \u00c5\u00b2') +
      '</table></div>';
    const flags = p.lipinski.length
      ? '<span class="info-flag">' + p.lipinski.length + ' violation(s): ' + p.lipinski.join(', ') + '</span>'
      : '<span class="info-ok">passes</span>';
    const veber = p.veber.length
      ? '<span class="info-flag">' + p.veber.join(', ') + '</span>'
      : '<span class="info-ok">passes</span>';
    html += '<div class="info-block"><h3>Tier 2 &mdash; estimates</h3><table class="info-table">' +
      row('logP (Crippen-style)', fmt(p.logP, 2)) +
      row('Lipinski rule of 5', flags) +
      row('Veber rules', veber) +
      '</table></div>';
    html += '<div class="info-block"><h3>Ionizable groups</h3>' +
      (p.ionizable.length
        ? '<ul class="info-list">' + p.ionizable.map((g) => '<li>' + g.label + ' &mdash; ' + g.note + '</li>').join('') + '</ul>'
        : '<div class="info-note">None detected</div>') + '</div>';
    html += insightPanelHtml(atomIds);
    panelSmiles = p.smiles;
    html += '<div class="info-block" id="pubchem-box">' + pubchemPrompt() + '</div>';
    html += '<div class="info-note">logP and TPSA follow the Wildman-Crippen and Ertl methods. Click a value to copy it.</div>';
    return html;
  }

  let panelSmiles = null;

  function pubchemPrompt() {
    if (pubchemCache.has(panelSmiles)) {
      return pubchemHtml(pubchemCache.get(panelSmiles));
    }
    return '<h3>PubChem</h3><button type="button" id="pubchem-button">Look up on PubChem</button>' +
      '<div class="info-note">Sends this structure (as SMILES) to pubchem.ncbi.nlm.nih.gov.</div>';
  }

  function pubchemHtml(r) {
    if (!r.found) {
      return '<h3>PubChem</h3><div class="info-note">Not found in PubChem. This exact structure is not a known compound.</div>';
    }
    const list = (items) => '<ul class="info-list">' + items.map((t) => '<li>' + escapeHtml(t) + '</li>').join('') + '</ul>';
    const group = (title, body) => (body ? '<details class="info-group" open><summary>' + title + '</summary>' + body + '</details>' : '');
    let html = '<h3>PubChem &mdash; CID ' + r.cid + '</h3>';
    let ids = '<table class="info-table">';
    if (r.title) {
      ids += row('Title', escapeHtml(r.title));
    }
    if (r.iupac) {
      ids += row('IUPAC name', escapeHtml(r.iupac));
    }
    if (r.cas) {
      ids += row('CAS', escapeHtml(r.cas));
    }
    if (r.synonyms.length) {
      ids += row('Also known as', escapeHtml(r.synonyms.join('; ')));
    }
    if (r.inchikey) {
      ids += row('InChIKey', '<span class="info-value-inline" data-copy="' + escapeHtml(r.inchikey) + '" title="Click to copy">' + escapeHtml(r.inchikey) + '</span>');
    }
    if (r.inchi) {
      ids += row('InChI', '<span class="info-value-inline" data-copy="' + escapeHtml(r.inchi) + '" title="Click to copy">copy</span>');
    }
    if (r.xlogp !== undefined) {
      ids += row('XLogP3', r.xlogp);
    }
    if (r.complexity !== undefined) {
      ids += row('Complexity', r.complexity);
    }
    if (r.charge !== undefined) {
      ids += row('Charge', r.charge);
    }
    ids += '</table>';
    html += group('Identifiers', ids);
    html += group('Measured properties', r.traits.length
      ? '<table class="info-table">' + r.traits.map((t) => row(t.label, t.values.map(escapeHtml).join('<br>'))).join('') + '</table>'
      : '');
    if (r.safety) {
      let body = '<div>' + (r.safety.signal ? '<span class="' + (r.safety.signal === 'Danger' ? 'info-flag' : '') + '">' + escapeHtml(r.safety.signal) + '</span>' : '') +
        (r.safety.pictograms.length ? ' &mdash; ' + escapeHtml(r.safety.pictograms.join(', ')) : '') + '</div>';
      body += list(r.safety.hazards);
      html += group('Safety (GHS)', body);
    }
    const tox = r.toxicity;
    if (tox.summary || tox.values.length) {
      html += group('Toxicity', (tox.values.length ? list(tox.values) : '') + (tox.summary ? '<div class="info-note">' + escapeHtml(tox.summary) + '</div>' : ''));
    }
    const ph = r.pharmacology;
    let pharm = '';
    if (ph.mesh.length) {
      pharm += '<h4>Pharmacological classes (MeSH)</h4>' + list(ph.mesh);
    }
    if (ph.classes.length) {
      pharm += '<h4>Drug classes</h4>' + list(ph.classes);
    }
    if (ph.atc.length) {
      pharm += '<h4>ATC code</h4>' + list(ph.atc);
    }
    if (ph.mechanism.length) {
      pharm += '<h4>Mechanism of action</h4>' + ph.mechanism.map((t) => '<div class="info-note">' + escapeHtml(t) + '</div>').join('');
    }
    html += group('Pharmacology', pharm);
    if (r.spectra.length) {
      html += group('Spectra available', list(r.spectra));
    }
    const receptors = '<div id="chembl-box"><button type="button" id="chembl-button" data-key="' + escapeHtml(r.inchikey || '') + '" data-ids="' + escapeHtml(r.chemblIds.join(',')) + '">Load receptor data</button>' +
      '<div class="info-note">Queries Open Targets (agonist/antagonist roles, clinical drugs only) and ChEMBL (measured Ki, when its server is up).</div></div>';
    html += group('Receptors', receptors);
    const q = encodeURIComponent(r.title || r.inchikey || '');
    const links = [
      ['PubChem', 'https://pubchem.ncbi.nlm.nih.gov/compound/' + r.cid],
      ['Spectra', 'https://pubchem.ncbi.nlm.nih.gov/compound/' + r.cid + '#section=Spectral-Information'],
      ['Literature', 'https://pubchem.ncbi.nlm.nih.gov/compound/' + r.cid + '#section=Literature'],
      ['Patents', 'https://pubchem.ncbi.nlm.nih.gov/compound/' + r.cid + '#section=Patents'],
      ['ChEMBL', 'https://www.ebi.ac.uk/chembl/g/#search_results/all/query=' + encodeURIComponent(r.inchikey || '')],
      ['DrugBank', 'https://go.drugbank.com/unearth/q?searcher=drugs&query=' + encodeURIComponent(r.inchikey || '')],
      ['Wikipedia', 'https://en.wikipedia.org/wiki/Special:Search?search=' + q],
      ['PDSP Ki', 'https://pdsp.unc.edu/databases/kidb.php'],
    ];
    html += '<div class="info-note">' + links.map(([label, url]) => '<a href="' + url + '" target="_blank" rel="noopener">' + label + '</a>').join(' &middot; ') +
      '<br>Values come from PubChem records and may vary by source.</div>';
    return html;
  }

  function chemblHtml(data) {
    let html = '';
    if (data.mechanisms.length) {
      html += '<h4>Mechanism of action (' + escapeHtml(data.chemblId) + ')</h4><ul class="info-list">' +
        data.mechanisms.map((m) => '<li><b>' + escapeHtml(m.action || '') + '</b> &mdash; ' + escapeHtml(m.text || '') +
          (m.targets.length ? '<br>' + escapeHtml(m.targets.join('; ')) : '') + '</li>').join('') + '</ul>';
    } else if (data.drug) {
      html += '<div class="info-note">' + escapeHtml(data.drug.name) + ' is a known drug, but no mechanism is annotated.</div>';
    } else {
      html += '<div class="info-note">No agonist/antagonist annotation. These are curated only for clinical drugs, not research chemicals.</div>';
    }
    if (data.ki.length) {
      html += '<h4>Strongest human binding (Ki)</h4><table class="info-table">' +
        data.ki.map((k) => row(escapeHtml(k.target), k.nM + ' nM')).join('') + '</table>';
    } else if (data.kiError) {
      html += '<div class="info-note">Measured Ki unavailable: the ChEMBL server is not responding.</div>';
    } else {
      html += '<div class="info-note">No measured human Ki values found in ChEMBL.</div>';
    }
    return html;
  }

  async function runChembl(button) {
    const box = document.getElementById('chembl-box');
    box.innerHTML = '<div class="info-note">Looking up...</div>';
    try {
      const ids = button.dataset.ids ? button.dataset.ids.split(',') : [];
      box.innerHTML = chemblHtml(await receptorData(ids, button.dataset.key));
    } catch (error) {
      box.innerHTML = '<div class="info-note">Lookup failed: ' + escapeHtml(error.message) + '</div>';
    }
  }

  async function runPubchem() {
    const smiles = panelSmiles;
    const box = document.getElementById('pubchem-box');
    box.innerHTML = '<h3>PubChem</h3><div class="info-note">Looking up...</div>';
    let html;
    try {
      html = pubchemHtml(await pubchemLookup(smiles));
    } catch (error) {
      html = '<h3>PubChem</h3><div class="info-note">Lookup failed: ' + escapeHtml(error.message) + '</div><button type="button" id="pubchem-button">Retry</button>';
    }
    if (panelSmiles === smiles) {
      const current = document.getElementById('pubchem-box');
      if (current) {
        current.innerHTML = html;
      }
    }
  }

  function closePanel() {
    panel.hidden = true;
    document.body.classList.remove('panel-open');
    panelAnchor = null;
    panelSignature = null;
    resizeCanvas();
  }

  function refreshPanel() {
    if (panelAnchor === null) {
      return;
    }
    const component = graph.connectedComponents().find((c) => c.atomIds.includes(panelAnchor));
    if (!component) {
      closePanel();
      return;
    }
    const signature = graph.atoms.filter((a) => component.atomIds.includes(a.id)).map((a) => a.id + a.element).join() + '|' +
      graph.bonds.filter((b) => component.atomIds.includes(b.atomA)).map((b) => b.atomA + '-' + b.atomB + ':' + b.order).join();
    if (signature === panelSignature) {
      return;
    }
    panelSignature = signature;
    panelBody.innerHTML = buildPanel(component.atomIds);
  }

  function openPanel(box) {
    panelAnchor = box.atomIds[0];
    panelSignature = null;
    const wasHidden = panel.hidden;
    panel.hidden = false;
    document.body.classList.add('panel-open');
    if (wasHidden) {
      resizeCanvas();
    }
    refreshPanel();
  }

  panelBody.addEventListener('click', (event) => {
    if (event.target.id === 'chembl-button') {
      runChembl(event.target);
      return;
    }
    if (event.target.id === 'pubchem-button') {
      runPubchem();
      return;
    }
    if (event.target.id === 'spectra-open-button') {
      spectraView.open();
      return;
    }
    if (event.target.id === 'resonance-open-button') {
      const component = graph.connectedComponents().find((c) => c.atomIds.includes(panelAnchor));
      if (component) {
        openResonance(component.atomIds);
      }
      return;
    }
    const target = event.target.closest('[data-copy]');
    if (target) {
      copyText(target.dataset.copy).then(() => {
        target.style.outline = '1px solid var(--ok)';
        setTimeout(() => { target.style.outline = ''; }, 600);
        toast('Copied to clipboard', { kind: 'ok', duration: 1500 });
      }, () => {});
    }
  });
  document.getElementById('info-close').addEventListener('click', closePanel);
  interactions.onNameContext = openPanel;

  const toastStack = document.getElementById('toast-stack');

  function toast(message, options) {
    const opts = options || {};
    const element = document.createElement('div');
    element.className = 'toast' + (opts.kind ? ' ' + opts.kind : '');
    const text = document.createElement('span');
    text.textContent = message;
    element.appendChild(text);
    const dismiss = () => {
      if (!element.parentNode) {
        return;
      }
      element.classList.add('leaving');
      setTimeout(() => element.remove(), 200);
    };
    if (opts.action) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = opts.action.label;
      button.addEventListener('click', () => {
        opts.action.run();
        dismiss();
      });
      element.appendChild(button);
    }
    toastStack.appendChild(element);
    while (toastStack.children.length > 3) {
      toastStack.firstElementChild.remove();
    }
    setTimeout(dismiss, opts.duration || 2600);
  }

  function storageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      return;
    }
  }

  function serializeGraph() {
    return JSON.stringify({
      format: 'chemical-graph-constructor',
      version: 1,
      atoms: graph.atoms,
      bonds: graph.bonds,
      nextAtomId: graph.nextAtomId,
      nextBondId: graph.nextBondId,
      annotations: graph.annotations,
      nextAnnotationId: graph.nextAnnotationId,
    });
  }

  function sanitizeAnnotations(list) {
    if (!Array.isArray(list)) {
      return [];
    }
    const seen = new Set();
    return list
      .filter((a) => a && Number.isFinite(a.id) && !seen.has(a.id) && seen.add(a.id))
      .map((a) => {
        if (a.kind === 'arrow' && [a.x1, a.y1, a.x2, a.y2].every(Number.isFinite)) {
          const arrow = { id: a.id, kind: 'arrow', x1: a.x1, y1: a.y1, x2: a.x2, y2: a.y2, style: ARROW_STYLES.includes(a.style) ? a.style : 'forward' };
          if (isCurvedArrow(arrow)) {
            arrow.bend = arrowBend(a);
          } else {
            ARROW_LABEL_SLOTS.forEach((slot) => {
              if (typeof a[slot] === 'string' && a[slot].trim()) {
                arrow[slot] = a[slot].slice(0, 200);
              }
            });
          }
          return arrow;
        }
        if (a.kind === 'text' && Number.isFinite(a.x) && Number.isFinite(a.y) && typeof a.text === 'string' && a.text.trim()) {
          return { id: a.id, kind: 'text', x: a.x, y: a.y, text: a.text.slice(0, 500) };
        }
        if (a.kind === 'plus' && Number.isFinite(a.x) && Number.isFinite(a.y)) {
          return { id: a.id, kind: 'plus', x: a.x, y: a.y };
        }
        if (a.kind === 'bracket' && Array.isArray(a.atomIds) && a.atomIds.length > 0 && a.atomIds.every(Number.isFinite)) {
          const bracket = { id: a.id, kind: 'bracket', atomIds: Array.from(new Set(a.atomIds)), n: typeof a.n === 'string' && a.n.trim() ? a.n.slice(0, 8) : 'n' };
          if (typeof a.label === 'string' && a.label.trim()) {
            bracket.label = a.label.slice(0, 200);
          }
          return bracket;
        }
        return null;
      })
      .filter((a) => a);
  }

  function loadGraphState(data) {
    if (!data || !Array.isArray(data.atoms) || !Array.isArray(data.bonds)) {
      return false;
    }
    const atoms = data.atoms
      .filter((a) => a && Number.isFinite(a.id) && Number.isFinite(a.x) && Number.isFinite(a.y) && Object.prototype.hasOwnProperty.call(MAX_VALENCE, a.element))
      .map((a) => {
        const atom = { id: a.id, element: a.element, x: a.x, y: a.y };
        if (Number.isInteger(a.charge) && a.charge !== 0 && Math.abs(a.charge) <= INTERACTION_SETTINGS.maxCharge && a.element !== 'D') {
          atom.charge = a.charge;
        }
        if (typeof a.abbr === 'string' && Object.prototype.hasOwnProperty.call(ABBREVIATIONS, a.abbr)) {
          atom.abbr = a.abbr;
        }
        if (a.abbrHidden === true) {
          atom.abbrHidden = true;
        }
        return atom;
      });
    const ids = new Set(atoms.map((a) => a.id));
    const bonds = data.bonds
      .filter((b) => b && ids.has(b.atomA) && ids.has(b.atomB) && b.atomA !== b.atomB && [1, 2, 3].includes(b.order))
      .map((b, index) => ({
        id: Number.isFinite(b.id) ? b.id : index + 1,
        atomA: b.atomA,
        atomB: b.atomB,
        order: b.order,
        stereo: b.stereo === 'wedge' || b.stereo === 'hash' ? b.stereo : null,
      }));
    graph.atoms = atoms;
    graph.bonds = bonds;
    graph.nextAtomId = Math.max(Number(data.nextAtomId) || 0, ...atoms.map((a) => a.id + 1), 1);
    graph.nextBondId = Math.max(Number(data.nextBondId) || 0, ...bonds.map((b) => b.id + 1), 1);
    graph.annotations = sanitizeAnnotations(data.annotations);
    graph.nextAnnotationId = Math.max(Number(data.nextAnnotationId) || 0, ...graph.annotations.map((a) => a.id + 1), 1);
    return true;
  }

  let restoredSession = false;
  try {
    const saved = JSON.parse(storageGet('autosave') || 'null');
    restoredSession = !!saved && loadGraphState(saved) && !graph.isEmpty();
  } catch (error) {
    restoredSession = false;
  }

  const history = new History(graph);
  const undoButton = document.getElementById('undo-button');
  const redoButton = document.getElementById('redo-button');
  const syncHistoryButtons = () => {
    undoButton.disabled = !history.canUndo();
    redoButton.disabled = !history.canRedo();
  };

  const statusCounts = document.getElementById('status-counts');
  const statusFormula = document.getElementById('status-formula');
  const statusMass = document.getElementById('status-mass');
  const statusHover = document.getElementById('status-hover');
  const statusTool = document.getElementById('status-tool');
  const statusValence = document.getElementById('status-valence');
  const zoomReadout = document.getElementById('zoom-reset-button');
  let statusSignature = null;

  const plural = (count, word) => count + ' ' + word + (count === 1 ? '' : 's');

  function structureSignature() {
    return interactions.selection.size + '#' + graph.atoms.map((a) => a.id + a.element + (a.charge || '')).join() + '|' +
      graph.bonds.map((b) => b.atomA + '-' + b.atomB + ':' + b.order + (b.stereo || '')).join() + '|' +
      graph.annotations.length + '#' + interactions.annotationSelection.size;
  }

  function updateValenceStatus() {
    const problems = valenceProblems(graph);
    statusValence.hidden = problems.length === 0;
    if (!problems.length) {
      return;
    }
    const fixable = problems.filter((p) => p.fix).length;
    statusValence.textContent = '\u26a0 ' + plural(problems.length, 'valence problem') + (fixable ? ' · Fix' : '');
    statusValence.disabled = fixable === 0;
    statusValence.title = problems.map((p) => p.message + (p.fix ? ' → ' + p.fix.label : ' (no automatic fix)')).join('\n');
  }

  function fixValenceProblems() {
    const fixed = fixAllValenceProblems(graph);
    renderer.render();
    const left = valenceProblems(graph).length;
    if (fixed) {
      toast('Fixed ' + plural(fixed, 'valence problem') + (left ? ' · ' + left + ' need a manual edit' : ''), { kind: left ? 'warn' : 'ok' });
    } else {
      toast('No automatic fix available', { kind: 'warn' });
    }
  }

  statusValence.addEventListener('click', fixValenceProblems);

  function updateStructureStatus() {
    const signature = structureSignature();
    if (signature === statusSignature) {
      return;
    }
    statusSignature = signature;
    updateValenceStatus();
    const components = graph.connectedComponents();
    if (graph.isEmpty()) {
      statusCounts.textContent = 'Empty canvas';
      statusFormula.textContent = '';
      statusMass.textContent = '';
      return;
    }
    const selected = interactions.selectedAtomIds().length + interactions.annotationSelection.size;
    const annotationCount = graph.annotations.length ? ' · ' + plural(graph.annotations.length, 'annotation') : '';
    statusCounts.textContent = plural(graph.atoms.length, 'atom') + ' · ' + plural(graph.bonds.length, 'bond') +
      ' · ' + plural(components.length, 'molecule') + annotationCount + (selected ? ' · ' + selected + ' selected' : '');
    const formulas = [];
    const masses = [];
    components.slice(0, 4).forEach((component) => {
      try {
        const props = computeProperties(graph, component.atomIds);
        formulas.push(props.formula);
        masses.push(props);
      } catch (error) {
        formulas.push('?');
      }
    });
    statusFormula.innerHTML = formulas.map(formulaHtml).join(' + ') + (components.length > 4 ? ' + …' : '');
    if (components.length === 1 && masses.length === 1) {
      statusMass.textContent = 'M ' + masses[0].averageMass.toFixed(2) + ' g/mol · exact ' + masses[0].exactMass.toFixed(4);
    } else if (components.length > 1 && components.length <= 4 && masses.length === components.length) {
      statusMass.textContent = 'ΣM ' + masses.reduce((sum, p) => sum + p.averageMass, 0).toFixed(2) + ' g/mol';
    } else {
      statusMass.textContent = '';
    }
  }

  const BOND_NAMES = { 1: 'Single', 2: 'Double', 3: 'Triple' };
  const ARROW_LABELS = { forward: 'Reaction arrow', equilibrium: 'Equilibrium arrow', resonance: 'Resonance arrow', retro: 'Retrosynthetic arrow', electron: 'Electron-pushing arrow', fishhook: 'Fishhook arrow (one electron)' };
  const ELEMENT_NAMES = { C: 'Carbon', N: 'Nitrogen', O: 'Oxygen', S: 'Sulfur', P: 'Phosphorus', D: 'Deuterium', F: 'Fluorine', Cl: 'Chlorine', Br: 'Bromine', I: 'Iodine', B: 'Boron', Si: 'Silicon', Se: 'Selenium', Li: 'Lithium', Na: 'Sodium', K: 'Potassium', Cs: 'Caesium', Mg: 'Magnesium', Ca: 'Calcium', Zn: 'Zinc', Sn: 'Tin' };
  fillElementTable(ELEMENT_NAMES, (element) => element.name);

  function updateHoverStatus(hover) {
    if (!hover) {
      statusHover.textContent = '';
      return;
    }
    if (hover.type === 'atom') {
      const atom = graph.getAtom(hover.id);
      if (!atom) {
        statusHover.textContent = '';
        return;
      }
      const hydrogens = renderer.implicitHydrogens(atom);
      const charge = atom.charge ? ' (' + (atom.charge > 0 ? '+' : '\u2212') + Math.abs(atom.charge) + ')' : '';
      statusHover.textContent = (ELEMENT_NAMES[atom.element] || atom.element) + charge + ' · ' +
        plural(graph.bondsForAtom(atom.id).length, 'bond') +
        (hydrogens ? ' · ' + hydrogens + ' H' : '') +
        insightHoverText(atom.id) +
        (renderer.problemAtoms.has(atom.id) ? ' · \u26a0 valence problem, right-click to fix' : ' — element key to change, +/− charge, Del to delete');
    } else if (hover.type === 'bond') {
      const bond = graph.getBondById(hover.id);
      if (!bond) {
        statusHover.textContent = '';
        return;
      }
      const a = graph.getAtom(bond.atomA);
      const b = graph.getAtom(bond.atomB);
      const kind = bond.stereo ? (bond.stereo === 'wedge' ? 'Wedge' : 'Hash') : BOND_NAMES[bond.order];
      statusHover.textContent = kind + ' bond ' + a.element + '–' + b.element +
        ' — click to cycle, 1/2/3 order, W/H stereo';
    } else if (hover.type === 'annotation') {
      const annotation = graph.getAnnotation(hover.id);
      if (annotation && annotation.kind === 'arrow' && annotation.style === 'forward') {
        const balance = schemeBalance(graph, annotation);
        if (balance.complete) {
          statusHover.textContent = schemeBalanceText(balance);
          return;
        }
      }
      if (annotation && annotation.kind === 'bracket') {
        const label = renderer.polymerLabel(annotation);
        statusHover.textContent = 'Polymer brackets · (' + polymerSubscript(polymerRepeatFormula(graph, annotation)) + ')' + (annotation.n || 'n').replace('n', 'ₙ') +
          (label ? ' · ' + label : '') + ' — right-click to rename, Del to delete';
        return;
      }
      statusHover.textContent = !annotation ? '' : annotation.kind === 'arrow'
        ? ARROW_LABELS[annotation.style] + ' — drag to move, click with the arrow tool to change style, Del to delete'
        : annotation.kind === 'plus'
          ? 'Plus sign — drag to move, Del to delete'
          : 'Text label — drag to move, double-click to edit, Del to delete';
    } else {
      statusHover.textContent = 'Click to copy name · right-click for properties · middle-click to save as stamp';
    }
  }

  const TOOL_HINTS = {
    draw: 'Draw — click to place, drag from an atom to bond, drag empty space to pan',
    select: 'Select — drag a box, Shift adds, double-click selects a molecule, drag a selection to move it',
    move: 'Move — drag a molecule or the selection; Shift-drag moves one atom',
    erase: 'Erase — click or drag across atoms, bonds and annotations',
    arrow: 'Arrow — drag to draw (snaps to 15°, Shift for free angle), click an arrow to change its style',
    curly: 'Curly arrow — drag from an atom or bond to where the electrons go (snaps to atoms and bond midpoints); click an arrow to switch two-electron / fishhook',
    text: 'Text — click to add a label, click a label to edit it; Enter to finish, Shift+Enter for a new line',
    plus: 'Plus — click to place a + between reactants or products; drag a + to move it',
  };

  function updateToolStatus() {
    statusTool.textContent = TOOL_HINTS[interactions.tool];
    zoomReadout.textContent = Math.round(renderer.view.scale * 100) + '%';
  }

  interactions.onHoverChange = (hover) => {
    updateHoverStatus(hover);
    if (spectraView) {
      spectraView.hoverAtom(hover && hover.type === 'atom' ? hover.id : null);
    }
  };
  interactions.onViewChange = updateToolStatus;
  interactions.onBlocked = (elements) => {
    const unique = Array.from(new Set(elements));
    toast('Valence limit reached' + (unique.length ? ' for ' + unique.join(' / ') : ''), { kind: 'warn', duration: 1800 });
  };
  interactions.onMerged = (merged, failed) => {
    if (merged) {
      toast('Merged ' + plural(merged, 'atom') + (failed ? ' · ' + failed + ' could not merge (valence)' : ''), { kind: failed ? 'warn' : 'ok', duration: 2000 });
    } else if (failed) {
      toast('Could not merge — valence limit', { kind: 'warn', duration: 2000 });
    }
  };
  renderer.onCopied = (label) => toast('Copied “' + label + '”', { kind: 'ok', duration: 1800 });

  const textEditor = document.getElementById('annotation-editor');
  let textEditing = null;

  const substructureState = { text: '', query: null, matches: [], index: -1, signature: null, timer: null };

  renderer.afterRender = () => {
    if (pruneBrackets(graph) > 0) {
      renderer.render();
      return;
    }
    interactions.selection.forEach((id) => {
      if (!graph.getAtom(id)) {
        interactions.selection.delete(id);
      }
    });
    interactions.annotationSelection.forEach((id) => {
      if (!graph.getAnnotation(id)) {
        interactions.annotationSelection.delete(id);
      }
    });
    positionTextEditor();
    refreshPanel();
    refreshSubstructure();
    if (!interactions.moving && history.commit()) {
      storageSet('autosave', history.states[history.index]);
    }
    syncHistoryButtons();
    updateStructureStatus();
    updateToolStatus();
    if (spectraView) {
      spectraView.structureChanged();
    }
  };

  const stepHistory = (direction) => {
    if (direction < 0 ? history.undo() : history.redo()) {
      interactions.updateGhost(null);
      interactions.setHover(null);
      storageSet('autosave', history.states[history.index]);
      renderer.render();
      return true;
    }
    return false;
  };
  undoButton.addEventListener('click', () => stepHistory(-1));
  redoButton.addEventListener('click', () => stepHistory(1));

  const elementButtons = Array.from(document.querySelectorAll('.element-button'));
  const stampButtons = Array.from(document.querySelectorAll('.stamp-button'));
  const currentChip = document.getElementById('current-chip');
  const currentLabel = document.getElementById('current-label');

  function updateCurrentChip() {
    if (interactions.selectedStamp) {
      const button = stampButtons.find((b) => b.dataset.stamp === interactions.selectedStamp);
      currentLabel.textContent = 'Stamp: ' + (button ? button.textContent.replace(/^[^A-Za-z0-9]+/, '').trim() : interactions.selectedStamp);
      currentChip.style.setProperty('--chip-color', 'var(--lab-cyan)');
    } else {
      currentLabel.textContent = ELEMENT_NAMES[interactions.selectedElement] || interactions.selectedElement;
      currentChip.style.setProperty('--chip-color', colorForElement(interactions.selectedElement, renderer.theme));
    }
  }

  const elementMore = document.getElementById('element-more');
  const elementMoreLabel = document.getElementById('element-more-label');

  function paintElementMore() {
    const element = interactions.selectedElement;
    const inTable = !interactions.selectedStamp && !elementButtons.some((b) => b.dataset.element === element);
    elementMore.classList.toggle('selected', inTable);
    elementMoreLabel.textContent = inTable ? element + ' \u00b7 ' + (ELEMENT_NAMES[element] || element) : 'More elements';
    if (inTable) {
      elementMore.style.setProperty('--accent', colorForElement(element, renderer.theme));
    } else {
      elementMore.style.removeProperty('--accent');
    }
  }

  function selectElement(element) {
    const button = elementButtons.find((b) => b.dataset.element === element);
    if (!button && !periodicElement(element)) {
      return;
    }
    elementButtons.forEach((other) => other.classList.remove('selected'));
    if (button) {
      button.classList.add('selected');
    }
    stampButtons.forEach((other) => other.classList.remove('selected'));
    interactions.setSelectedElement(element);
    if (interactions.tool !== 'draw') {
      setTool('draw');
    }
    updateCurrentChip();
    paintElementMore();
  }

  elementButtons.forEach((button) => {
    button.addEventListener('click', () => selectElement(button.dataset.element));
  });

  const ptableOverlay = document.getElementById('ptable-overlay');
  const ptableGrid = document.getElementById('ptable-grid');
  const ptableSearch = document.getElementById('ptable-search');
  const ptableInfo = document.getElementById('ptable-info');
  const ptableLegend = document.getElementById('ptable-legend');
  const PTABLE_CATEGORY_LABELS = {
    alkali: 'Alkali metal',
    alkaline: 'Alkaline earth metal',
    transition: 'Transition metal',
    'post-transition': 'Post-transition metal',
    metalloid: 'Metalloid',
    nonmetal: 'Nonmetal',
    halogen: 'Halogen',
    noble: 'Noble gas',
    lanthanide: 'Lanthanide',
    actinide: 'Actinide',
  };
  const ptableCells = [];
  let ptablePick = null;
  let ptableCurrent = null;

  function ptableCell(symbol, row, column) {
    const element = periodicElement(symbol);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'ptable-cell';
    cell.dataset.element = symbol;
    cell.style.gridRow = String(row);
    cell.style.gridColumn = String(column);
    const number = document.createElement('span');
    number.className = 'ptable-number';
    number.textContent = symbol === 'D' ? '\u00b2H' : String(element.number);
    const label = document.createElement('span');
    label.className = 'ptable-symbol';
    label.textContent = symbol;
    cell.append(number, label);
    cell.title = ELEMENT_NAMES[symbol] || element.name;
    cell.addEventListener('click', () => choosePeriodicElement(symbol));
    cell.addEventListener('mouseenter', () => showPeriodicInfo(symbol));
    cell.addEventListener('focus', () => showPeriodicInfo(symbol));
    ptableCells.push(cell);
    ptableGrid.appendChild(cell);
  }

  function buildPeriodicTable() {
    PERIODIC_ELEMENTS.forEach((element) => {
      if (element.group) {
        ptableCell(element.symbol, element.period, element.group);
        return;
      }
      const series = element.category === 'lanthanide' ? 0 : 1;
      const first = series === 0 ? 57 : 89;
      ptableCell(element.symbol, 9 + series, 3 + element.number - first);
    });
    ptableCell('D', 1, 2);
    [['La\u2013Lu', 6], ['Ac\u2013Lr', 7]].forEach(([text, row]) => {
      const placeholder = document.createElement('div');
      placeholder.className = 'ptable-placeholder';
      placeholder.style.gridRow = String(row);
      placeholder.style.gridColumn = '3';
      placeholder.textContent = text;
      ptableGrid.appendChild(placeholder);
    });
    const gap = document.createElement('div');
    gap.className = 'ptable-gap';
    gap.style.gridRow = '8';
    ptableGrid.appendChild(gap);
    Object.keys(PTABLE_CATEGORY_LABELS).forEach((category) => {
      const swatch = document.createElement('span');
      swatch.dataset.category = category;
      swatch.textContent = PTABLE_CATEGORY_LABELS[category];
      ptableLegend.appendChild(swatch);
    });
  }

  function paintPeriodicTable() {
    ptableCells.forEach((cell) => cell.style.setProperty('--accent', colorForElement(cell.dataset.element, renderer.theme)));
    Array.from(ptableLegend.children).forEach((swatch) => {
      const table = renderer.theme === 'light' ? ELEMENT_CATEGORY_COLORS_LIGHT : ELEMENT_CATEGORY_COLORS;
      swatch.style.setProperty('--swatch', table[swatch.dataset.category]);
    });
  }

  function showPeriodicInfo(symbol) {
    const element = periodicElement(symbol);
    if (!element) {
      ptableInfo.textContent = '';
      return;
    }
    const name = ELEMENT_NAMES[symbol] || element.name;
    const mass = symbol === 'D' ? 2.014 : element.mass;
    const category = symbol === 'D' ? 'Isotope of hydrogen' : PTABLE_CATEGORY_LABELS[element.category];
    ptableInfo.innerHTML = '';
    const bold = document.createElement('b');
    bold.textContent = symbol + ' \u00b7 ' + name;
    ptableInfo.append(bold, document.createTextNode('  \u2014  Z = ' + element.number + ' \u00b7 ' + mass.toFixed(3) + ' g/mol \u00b7 ' + category));
  }

  function ptableMatches(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      return [];
    }
    const scored = [];
    ptableCells.forEach((cell) => {
      const symbol = cell.dataset.element;
      const element = periodicElement(symbol);
      const name = (ELEMENT_NAMES[symbol] || element.name).toLowerCase();
      let score = -1;
      if (symbol.toLowerCase() === q || (symbol !== 'D' && String(element.number) === q)) {
        score = 0;
      } else if (name.startsWith(q)) {
        score = 1;
      } else if (symbol.toLowerCase().startsWith(q)) {
        score = 2;
      } else if (name.includes(q)) {
        score = 3;
      }
      if (score >= 0) {
        scored.push({ cell, score });
      }
    });
    return scored.sort((a, b) => a.score - b.score).map((entry) => entry.cell);
  }

  function filterPeriodicTable() {
    const matches = ptableMatches(ptableSearch.value);
    const active = ptableSearch.value.trim() !== '';
    ptableCells.forEach((cell) => {
      cell.classList.toggle('dim', active && !matches.includes(cell));
      cell.classList.toggle('match', active && matches[0] === cell);
    });
    showPeriodicInfo(matches.length ? matches[0].dataset.element : ptableCurrent);
  }

  function openPeriodicTable(onPick, current) {
    if (!ptableCells.length) {
      buildPeriodicTable();
    }
    ptablePick = onPick || selectElement;
    ptableCurrent = current || interactions.selectedElement;
    paintPeriodicTable();
    ptableCells.forEach((cell) => cell.classList.toggle('current', cell.dataset.element === ptableCurrent));
    ptableSearch.value = '';
    filterPeriodicTable();
    ptableOverlay.hidden = false;
    ptableSearch.focus();
  }

  function closePeriodicTable() {
    ptableOverlay.hidden = true;
    ptablePick = null;
  }

  function choosePeriodicElement(symbol) {
    const pick = ptablePick;
    closePeriodicTable();
    if (pick) {
      pick(symbol);
    }
  }

  ptableSearch.addEventListener('input', filterPeriodicTable);
  ptableSearch.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const matches = ptableMatches(ptableSearch.value);
      if (matches.length) {
        choosePeriodicElement(matches[0].dataset.element);
      }
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      closePeriodicTable();
    }
  });
  ptableOverlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePeriodicTable();
    }
  });
  ptableOverlay.addEventListener('click', (event) => {
    if (event.target === ptableOverlay) {
      closePeriodicTable();
    }
  });
  document.getElementById('ptable-close').addEventListener('click', closePeriodicTable);
  elementMore.addEventListener('click', () => openPeriodicTable());

  const STAMP_THUMB_GRIDS = ['stamp-buttons', 'stamp-buttons-hetero', 'stamp-buttons-saturated', 'stamp-buttons-fused', 'stamp-buttons-amino', 'stamp-buttons-sugars', 'stamp-buttons-bases'];

  elementButtons.forEach((button) => {
    const info = periodicElement(button.dataset.element);
    if (!info) {
      return;
    }
    const number = document.createElement('span');
    number.className = 'tile-number';
    number.textContent = info.number;
    const mass = document.createElement('span');
    mass.className = 'tile-mass';
    mass.textContent = Number(info.mass).toFixed(2);
    button.prepend(number);
    button.insertBefore(mass, button.querySelector('kbd'));
    button.style.setProperty('--tile-category', ELEMENT_CATEGORY_COLORS[info.category] || 'var(--border)');
  });

  function drawStampThumbnails() {
    document.querySelectorAll(STAMP_THUMB_GRIDS.map((id) => '#' + id + ' .stamp-button[data-stamp]').join(', ')).forEach((button) => {
      let canvas = button.querySelector('canvas.stamp-thumb');
      if (!canvas) {
        const text = button.firstChild && button.firstChild.nodeType === 3 ? button.firstChild : null;
        if (text) {
          text.textContent = text.textContent.replace(/^[^A-Za-z0-9(]+/, '');
        }
        canvas = document.createElement('canvas');
        canvas.className = 'stamp-thumb';
        canvas.setAttribute('aria-hidden', 'true');
        button.prepend(canvas);
      }
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || canvas.dataset.theme === renderer.theme) {
        return;
      }
      canvas.dataset.theme = renderer.theme;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      const thumbGraph = new Graph();
      try {
        placeStamp(thumbGraph, button.dataset.stamp, { x: 0, y: 0 }, null);
      } catch (error) {
        return;
      }
      const thumb = new Renderer(canvas.getContext('2d'), thumbGraph);
      thumb.theme = renderer.theme;
      thumb.pixelRatio = ratio;
      thumb.showGrid = false;
      thumb.showEmptyHint = false;
      thumb.showNames = false;
      thumb.strokeScale = 2.4;
      thumb.minLabelPx = 10;
      const bounds = thumb.contentBounds();
      if (!bounds) {
        return;
      }
      const pad = 5;
      const scale = Math.min(0.42, (rect.width - pad * 2) / Math.max(1, bounds.maxX - bounds.minX), (rect.height - pad * 2) / Math.max(1, bounds.maxY - bounds.minY));
      thumb.view = { scale, x: rect.width / 2 - ((bounds.minX + bounds.maxX) / 2) * scale, y: rect.height / 2 - ((bounds.minY + bounds.maxY) / 2) * scale };
      thumb.render();
    });
  }

  function paintElementAccents() {
    elementButtons.forEach((button) => {
      button.style.setProperty('--accent', colorForElement(button.dataset.element, renderer.theme));
    });
    drawStampThumbnails();
    paintElementMore();
    if (ptableCells.length) {
      paintPeriodicTable();
    }
  }

  const savedContainer = document.getElementById('stamp-buttons-saved');
  const savedSection = document.getElementById('saved-section');
  let savedStamps = [];
  try {
    savedStamps = JSON.parse(storageGet('savedStamps') || '[]');
  } catch (error) {
    savedStamps = [];
  }

  const persistSaved = () => storageSet('savedStamps', JSON.stringify(savedStamps));

  const deselectStamp = () => {
    stampButtons.forEach((other) => other.classList.remove('selected'));
    interactions.setSelectedStamp(null);
    selectElement(interactions.selectedElement || 'C');
  };

  function selectStamp(key) {
    const button = stampButtons.find((b) => b.dataset.stamp === key);
    if (!button) {
      return;
    }
    stampButtons.forEach((other) => other.classList.remove('selected'));
    button.classList.add('selected');
    elementButtons.forEach((other) => other.classList.remove('selected'));
    interactions.setSelectedStamp(key);
    if (interactions.tool !== 'draw') {
      setTool('draw');
    }
    interactions.updateGhost(null);
    updateCurrentChip();
    paintElementMore();
  }

  const wireStampButton = (button) => {
    button.addEventListener('click', () => {
      if (button.classList.contains('selected')) {
        deselectStamp();
        return;
      }
      selectStamp(button.dataset.stamp);
    });
  };

  stampButtons.forEach(wireStampButton);

  const renderSaved = () => {
    savedContainer.innerHTML = '';
    savedSection.hidden = savedStamps.length === 0;
    savedStamps.forEach((saved) => {
      CUSTOM_STAMPS[saved.key] = saved;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'stamp-button';
      button.dataset.stamp = saved.key;
      button.textContent = saved.label;
      button.title = saved.label + ' — right-click to remove';
      if (interactions.selectedStamp === saved.key) {
        button.classList.add('selected');
      }
      wireStampButton(button);
      button.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (interactions.selectedStamp === saved.key) {
          deselectStamp();
        }
        delete CUSTOM_STAMPS[saved.key];
        savedStamps = savedStamps.filter((other) => other.key !== saved.key);
        persistSaved();
        renderSaved();
        toast('Removed saved stamp “' + saved.label + '”');
      });
      savedContainer.appendChild(button);
    });
    stampButtons.length = 0;
    document.querySelectorAll('.stamp-button').forEach((b) => stampButtons.push(b));
    applySearch();
  };

  const recentContainer = document.getElementById('stamp-buttons-recent');
  const recentSection = document.getElementById('recent-section');
  let recentStructures = [];
  try {
    recentStructures = validRecentList(JSON.parse(storageGet(RECENT_SETTINGS.storageKey) || '[]'));
  } catch (error) {
    recentStructures = [];
  }

  const renderRecent = () => {
    Object.keys(CUSTOM_STAMPS).forEach((key) => {
      if (key.startsWith('recent:') && !recentStructures.some((entry) => entry.key === key)) {
        delete CUSTOM_STAMPS[key];
      }
    });
    recentContainer.innerHTML = '';
    recentSection.hidden = recentStructures.length === 0;
    recentStructures.forEach((entry) => {
      CUSTOM_STAMPS[entry.key] = entry;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'stamp-button';
      button.dataset.stamp = entry.key;
      button.textContent = entry.label;
      button.title = entry.label + (entry.label === entry.smiles ? '' : ' — ' + entry.smiles) + ' — right-click to forget';
      if (interactions.selectedStamp === entry.key) {
        button.classList.add('selected');
      }
      wireStampButton(button);
      button.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (interactions.selectedStamp === entry.key) {
          deselectStamp();
        }
        recentStructures = recentStructures.filter((other) => other.key !== entry.key);
        storageSet(RECENT_SETTINGS.storageKey, JSON.stringify(recentStructures));
        renderRecent();
      });
      recentContainer.appendChild(button);
    });
    stampButtons.length = 0;
    document.querySelectorAll('.stamp-button').forEach((b) => stampButtons.push(b));
    applySearch();
  };

  function rememberRecent(atomIds) {
    const idSet = atomIds ? new Set(atomIds) : null;
    const entries = graph.connectedComponents()
      .filter((component) => !idSet || component.atomIds.some((id) => idSet.has(id)))
      .map((component) => {
        let label = '';
        try {
          label = renderer.nameFor(component.atomIds);
        } catch (error) {
          label = '';
        }
        return recentEntryFromGraph(graph, component.atomIds, label);
      })
      .filter(Boolean);
    if (entries.length === 0) {
      return;
    }
    if (interactions.selectedStamp && interactions.selectedStamp.startsWith('recent:')) {
      deselectStamp();
    }
    recentStructures = mergeRecent(recentStructures, entries);
    storageSet(RECENT_SETTINGS.storageKey, JSON.stringify(recentStructures));
    renderRecent();
  }

  interactions.onSaveStamp = (atomId) => {
    const component = graph.connectedComponents().find((c) => c.atomIds.includes(atomId));
    if (!component) {
      return;
    }
    const ids = new Set(component.atomIds);
    let label;
    try {
      label = renderer.nameFor(component.atomIds);
    } catch (error) {
      label = '';
    }
    label = (label || 'Saved ' + (savedStamps.length + 1)).slice(0, 28);
    const key = 'custom:' + Date.now();
    savedStamps.push({
      key,
      label,
      atoms: graph.atoms
        .filter((a) => ids.has(a.id))
        .map((a) => (a.charge ? { id: a.id, element: a.element, x: a.x, y: a.y, charge: a.charge } : { id: a.id, element: a.element, x: a.x, y: a.y })),
      bonds: graph.bonds
        .filter((b) => ids.has(b.atomA))
        .map((b) => ({ atomA: b.atomA, atomB: b.atomB, order: b.order })),
    });
    persistSaved();
    savedSection.classList.remove('collapsed');
    renderSaved();
    component.atomIds.forEach((id) => renderer.flashAtom(id));
    toast('Saved “' + label + '” as a stamp', { kind: 'ok' });
  };

  const searchInput = document.getElementById('stamp-search');
  const searchEmpty = document.getElementById('search-empty');

  function applySearch() {
    const query = searchInput.value.trim().toLowerCase();
    let anyMatch = false;
    document.querySelectorAll('.sidebar-section').forEach((section) => {
      if (section.dataset.section === 'elements') {
        section.style.display = query ? 'none' : '';
        return;
      }
      const buttons = Array.from(section.querySelectorAll('.stamp-button'));
      let visible = 0;
      buttons.forEach((button) => {
        const match = !query || button.textContent.toLowerCase().includes(query);
        button.hidden = !match;
        visible += match ? 1 : 0;
      });
      anyMatch = anyMatch || visible > 0;
      section.style.display = query && visible === 0 ? 'none' : '';
      if (query && visible > 0) {
        section.classList.add('search-open');
      } else {
        section.classList.remove('search-open');
      }
    });
    searchEmpty.hidden = !query || anyMatch;
    document.querySelectorAll('.sidebar-section').forEach((section) => {
      const collapsed = collapsedSections.has(section.dataset.section) && !section.classList.contains('search-open');
      section.classList.toggle('collapsed', collapsed);
    });
    drawStampThumbnails();
  }

  let collapsedSections = new Set();
  try {
    collapsedSections = new Set(JSON.parse(storageGet('collapsedSections') || '[]'));
  } catch (error) {
    collapsedSections = new Set();
  }
  const DEFAULT_COLLAPSED_SECTIONS = ['amino', 'sugars', 'bases'];
  let expandedSections = new Set();
  try {
    expandedSections = new Set(JSON.parse(storageGet('expandedSections') || '[]'));
  } catch (error) {
    expandedSections = new Set();
  }
  DEFAULT_COLLAPSED_SECTIONS.filter((key) => !expandedSections.has(key)).forEach((key) => collapsedSections.add(key));

  document.querySelectorAll('.sidebar-section').forEach((section) => {
    section.querySelector('.section-toggle').addEventListener('click', () => {
      const key = section.dataset.section;
      if (section.classList.contains('collapsed')) {
        collapsedSections.delete(key);
        expandedSections.add(key);
      } else {
        collapsedSections.add(key);
        expandedSections.delete(key);
      }
      storageSet('collapsedSections', JSON.stringify(Array.from(collapsedSections)));
      storageSet('expandedSections', JSON.stringify(Array.from(expandedSections).filter((name) => DEFAULT_COLLAPSED_SECTIONS.includes(name))));
      applySearch();
    });
  });

  searchInput.addEventListener('input', applySearch);
  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const first = stampButtons.find((b) => !b.hidden && b.closest('.sidebar-section').style.display !== 'none');
      if (first) {
        selectStamp(first.dataset.stamp);
        searchInput.blur();
      }
    } else if (event.key === 'Escape') {
      searchInput.value = '';
      applySearch();
      searchInput.blur();
    }
  });

  renderSaved();
  renderRecent();

  const toolButtons = Array.from(document.querySelectorAll('.tool-button'));

  function setTool(tool) {
    interactions.setTool(tool);
    toolButtons.forEach((button) => button.classList.toggle('selected', button.dataset.tool === tool));
    updateToolStatus();
  }

  toolButtons.forEach((button) => button.addEventListener('click', () => setTool(button.dataset.tool)));

  document.getElementById('zoom-in-button').addEventListener('click', () => {
    renderer.zoomCentered(1.25);
  });
  document.getElementById('zoom-out-button').addEventListener('click', () => {
    renderer.zoomCentered(0.8);
  });
  zoomReadout.addEventListener('click', () => {
    renderer.zoomCentered(1 / renderer.view.scale);
  });
  document.getElementById('fit-button').addEventListener('click', () => renderer.fitToContent());

  function clearCanvas() {
    if (graph.isEmpty()) {
      return;
    }
    rememberRecent();
    graph.clear();
    interactions.selection.clear();
    interactions.annotationSelection.clear();
    interactions.setHover(null);
    interactions.updateGhost(null);
    renderer.render();
    toast('Canvas cleared', { action: { label: 'Undo', run: () => stepHistory(-1) }, duration: 5000 });
  }

  document.getElementById('clear-button').addEventListener('click', clearCanvas);

  function positionTextEditor() {
    if (!textEditing) {
      return;
    }
    const screen = renderer.toScreen(textEditing.point);
    const scale = renderer.view.scale;
    textEditor.style.left = canvas.offsetLeft + screen.x + 'px';
    textEditor.style.top = canvas.offsetTop + screen.y + 'px';
    textEditor.style.fontSize = 15 * scale + 'px';
    textEditor.style.lineHeight = RENDER_SETTINGS.annotationLineHeight * scale + 'px';
    textEditor.rows = Math.max(1, textEditor.value.split('\n').length);
  }

  function closeTextEditor(commit) {
    if (!textEditing) {
      return;
    }
    const editing = textEditing;
    textEditing = null;
    renderer.editingAnnotationId = null;
    textEditor.hidden = true;
    renderer.editingArrowLabel = null;
    const text = textEditor.value.replace(/\s+$/, '').replace(/^\s*\n/, '');
    if (editing.bracketLabel) {
      if (commit && graph.getAnnotation(editing.bracketLabel.id)) {
        if (text.trim() && text.trim() !== polymerName(graph, editing.bracketLabel)) {
          editing.bracketLabel.label = text.trim().slice(0, 200);
        } else {
          delete editing.bracketLabel.label;
        }
      }
    } else if (editing.arrowLabel) {
      const { arrow, slot } = editing.arrowLabel;
      if (commit && graph.getAnnotation(arrow.id)) {
        if (text.trim()) {
          arrow[slot] = text.slice(0, 200);
        } else {
          delete arrow[slot];
        }
      }
    } else if (commit && editing.annotation && graph.getAnnotation(editing.annotation.id)) {
      if (text.trim()) {
        editing.annotation.text = text;
      } else {
        graph.removeAnnotation(editing.annotation.id);
      }
    } else if (commit && !editing.annotation && text.trim()) {
      graph.addAnnotation({ kind: 'text', x: editing.point.x, y: editing.point.y, text });
    }
    renderer.render();
  }

  function openTextEditor(annotation, point) {
    closeTextEditor(true);
    textEditing = { annotation, point: annotation ? { x: annotation.x, y: annotation.y } : point };
    renderer.editingAnnotationId = annotation ? annotation.id : null;
    textEditor.value = annotation ? annotation.text : '';
    textEditor.hidden = false;
    positionTextEditor();
    renderer.render();
    setTimeout(() => {
      if (textEditing) {
        textEditor.focus();
        textEditor.select();
      }
    }, 0);
  }

  function openArrowLabelEditor(arrow, slot) {
    closeTextEditor(true);
    const lines = Math.max(1, String(arrow[slot] || '').split('\n').length);
    textEditing = { arrowLabel: { arrow, slot }, point: arrowLabelAnchor(arrow, slot, lines * RENDER_SETTINGS.annotationLineHeight) };
    renderer.editingArrowLabel = { id: arrow.id, slot };
    textEditor.value = arrow[slot] || '';
    textEditor.hidden = false;
    positionTextEditor();
    renderer.render();
    setTimeout(() => {
      if (textEditing) {
        textEditor.focus();
        textEditor.select();
      }
    }, 0);
  }

  textEditor.addEventListener('input', positionTextEditor);
  textEditor.addEventListener('keydown', (event) => {
    event.stopPropagation();
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      closeTextEditor(true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeTextEditor(false);
    }
  });
  textEditor.addEventListener('blur', () => closeTextEditor(true));
  interactions.onEditText = openTextEditor;

  function allSmiles() {
    return graph.connectedComponents()
      .map((component) => {
        try {
          return computeProperties(graph, component.atomIds).smiles;
        } catch (error) {
          return '';
        }
      })
      .filter((smiles) => smiles)
      .join('.');
  }

  function copyAllSmiles() {
    const smiles = allSmiles();
    if (!smiles) {
      toast('Nothing to copy yet — draw a molecule first', { kind: 'warn' });
      return;
    }
    rememberRecent();
    copyText(smiles).then(
      () => toast('Copied SMILES: ' + smiles, { kind: 'ok' }),
      () => toast('Could not access the clipboard', { kind: 'warn' })
    );
  }

  document.getElementById('smiles-button').addEventListener('click', copyAllSmiles);

  function fragmentSmiles(fragment) {
    const temp = new Graph();
    const idMap = new Map();
    fragment.atoms.forEach((a) => {
      const atom = temp.addAtom(a.element, a.x, a.y);
      if (a.charge) {
        atom.charge = a.charge;
      }
      idMap.set(a.id, atom.id);
    });
    fragment.bonds.forEach((b) => {
      const bond = temp.addBond(idMap.get(b.atomA), idMap.get(b.atomB));
      if (bond) {
        bond.order = b.order;
        bond.stereo = b.stereo;
      }
    });
    return temp.connectedComponents()
      .map((component) => {
        try {
          return computeProperties(temp, component.atomIds).smiles;
        } catch (error) {
          return '';
        }
      })
      .filter((smiles) => smiles)
      .join('.');
  }

  function copySmilesFor(atomIds) {
    const smiles = fragmentSmiles(interactions.extractFragment(atomIds));
    if (!smiles) {
      toast('Could not build SMILES for this structure', { kind: 'warn' });
      return;
    }
    copyText(smiles).then(
      () => toast('Copied SMILES: ' + smiles, { kind: 'ok' }),
      () => toast('Could not access the clipboard', { kind: 'warn' })
    );
  }

  function copyMolfileFor(atomIds) {
    let text;
    try {
      text = graphToMolfile(graph, atomIds, renderer.nameFor(atomIds) || '');
    } catch (error) {
      toast(error.message, { kind: 'warn' });
      return;
    }
    copyText(text).then(
      () => toast('Copied MOL block · ' + plural(atomIds.length, 'atom'), { kind: 'ok' }),
      () => toast('Could not access the clipboard', { kind: 'warn' })
    );
  }

  function moleculeRecords(atomIds) {
    const components = graph.connectedComponents().filter((component) => !atomIds || atomIds.includes(component.atomIds[0]));
    return components.map((component) => {
      let title = '';
      try {
        title = renderer.nameFor(component.atomIds) || '';
      } catch (error) {
        title = '';
      }
      return { atomIds: component.atomIds, title };
    });
  }

  function exportMolfile(atomIds) {
    const records = moleculeRecords(atomIds);
    if (records.length === 0) {
      toast('Nothing to export yet', { kind: 'warn' });
      return;
    }
    let text;
    try {
      text = records.length === 1 ? graphToMolfile(graph, records[0].atomIds, records[0].title) : graphToSdf(graph, records);
    } catch (error) {
      toast(error.message, { kind: 'warn' });
      return;
    }
    const single = records.length === 1;
    const base = single ? (records[0].title || 'molecule').replace(/[^\w\-]+/g, '_').slice(0, 60) : fileBaseName();
    downloadBlob(new Blob([text], { type: 'chemical/x-mdl-molfile' }), base + (single ? '.mol' : '.sdf'));
    toast(single ? 'Exported MOL file' : 'Exported SDF · ' + plural(records.length, 'molecule'), { kind: 'ok' });
  }

  function importMolfile(text, center) {
    const fragment = molfileToFragment(text);
    const ids = insertSmilesFragment(fragment, center);
    const count = fragment.titles.length;
    const repairs = fragment.chargeRepairs ? ' · added ' + plural(fragment.chargeRepairs, 'missing charge') : '';
    toast('Imported ' + (count > 1 ? plural(count, 'molecule') + ' · ' : '') + plural(ids.length, 'atom') + repairs, { kind: repairs ? 'warn' : 'ok', duration: repairs ? 3200 : 1800 });
    return ids;
  }

  let clipboardFragment = null;
  try {
    clipboardFragment = JSON.parse(storageGet('clipboard') || 'null');
  } catch (error) {
    clipboardFragment = null;
  }

  function readClipboard() {
    try {
      const stored = JSON.parse(storageGet('clipboard') || 'null');
      if (stored && Array.isArray(stored.atoms)) {
        clipboardFragment = stored;
      }
    } catch (error) {
      return clipboardFragment;
    }
    return clipboardFragment;
  }

  function fragmentSummary(atomCount, annotationCount) {
    return [atomCount ? plural(atomCount, 'atom') : '', annotationCount ? plural(annotationCount, 'annotation') : '']
      .filter((part) => part)
      .join(' + ');
  }

  function copyAtoms(atomIds, verb) {
    const annotationIds = interactions.annotationTargets(atomIds);
    if (atomIds.length === 0 && annotationIds.length === 0) {
      toast('Select something first — drag a box with the Select tool (V) or press Ctrl+A', { kind: 'warn' });
      return false;
    }
    clipboardFragment = interactions.extractFragment(atomIds, annotationIds);
    storageSet('clipboard', JSON.stringify(clipboardFragment));
    const smiles = atomIds.length ? fragmentSmiles(clipboardFragment) : '';
    if (smiles) {
      copyText(smiles).catch(() => {});
    }
    toast((verb || 'Copied') + ' ' + fragmentSummary(atomIds.length, annotationIds.length) + (smiles ? ' · SMILES on clipboard' : ''), { kind: 'ok', duration: 1800 });
    return true;
  }

  function cutAtoms(atomIds) {
    if (copyAtoms(atomIds, 'Cut')) {
      interactions.deleteAtoms(atomIds);
    }
  }

  function pasteAt(worldPoint) {
    const fragment = readClipboard();
    if (!fragmentHasContent(fragment)) {
      toast('Clipboard is empty — copy a selection with Ctrl+C first', { kind: 'warn' });
      return;
    }
    const center = worldPoint || pasteCenter();
    const ids = interactions.insertFragment(fragment, center);
    renderer.render();
    toast('Pasted ' + fragmentSummary(ids.length, interactions.annotationSelection.size), { kind: 'ok', duration: 1500 });
  }

  function fragmentHasContent(fragment) {
    return !!fragment && Array.isArray(fragment.atoms) &&
      (fragment.atoms.length > 0 || (Array.isArray(fragment.annotations) && fragment.annotations.length > 0));
  }

  function pasteCenter() {
    if (interactions.lastScreenPoint) {
      return renderer.toWorld(interactions.lastScreenPoint);
    }
    const size = renderer.viewportSize();
    return renderer.toWorld({ x: size.width / 2, y: size.height / 2 });
  }

  function freeCenterFor(fragment, center) {
    if (graph.atoms.length === 0) {
      return center;
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    fragment.atoms.forEach((a) => {
      minX = Math.min(minX, a.x);
      maxX = Math.max(maxX, a.x);
      minY = Math.min(minY, a.y);
      maxY = Math.max(maxY, a.y);
    });
    const halfW = (maxX - minX) / 2;
    const halfH = (maxY - minY) / 2;
    const clash = (c) => graph.atoms.some((atom) =>
      atom.x > c.x - halfW - 40 && atom.x < c.x + halfW + 40 && atom.y > c.y - halfH - 40 && atom.y < c.y + halfH + 40);
    if (!clash(center)) {
      return center;
    }
    const existing = renderer.contentBounds();
    return { x: existing.maxX + 75 + halfW, y: (existing.minY + existing.maxY) / 2 };
  }

  function insertSmilesFragment(fragment, center) {
    const ids = interactions.insertFragment(fragment, freeCenterFor(fragment, center || pasteCenter()));
    rememberRecent(ids);
    const bounds = renderer.contentBounds(ids);
    const size = renderer.viewportSize();
    const topLeft = renderer.toScreen({ x: bounds.minX, y: bounds.minY });
    const bottomRight = renderer.toScreen({ x: bounds.maxX, y: bounds.maxY });
    if (topLeft.x < 0 || topLeft.y < 0 || bottomRight.x > size.width || bottomRight.y > size.height) {
      renderer.fitToContent();
    } else {
      renderer.render();
    }
    ids.forEach((id) => renderer.flashAtom(id));
    return ids;
  }

  function handlePastedText(raw) {
    if (looksLikeMolfile(raw)) {
      try {
        importMolfile(raw, null);
      } catch (error) {
        toast('Could not read MOL data — ' + error.message, { kind: 'warn', duration: 3200 });
      }
      return;
    }
    const text = (raw || '').trim();
    const internal = readClipboard();
    const hasInternal = !!(internal && internal.atoms && internal.atoms.length);
    if (text && !/\s/.test(text) && text.length <= 2000 && (!hasInternal || text !== fragmentSmiles(internal))) {
      try {
        const fragment = smilesToFragment(text);
        const ids = insertSmilesFragment(fragment, null);
        toast('Imported SMILES · ' + plural(ids.length, 'atom'), { kind: 'ok', duration: 1800 });
        return;
      } catch (error) {
        if (!hasInternal) {
          toast(looksLikeSmiles(text) ? 'Could not read SMILES — ' + error.message : 'Clipboard does not contain a structure or SMILES', { kind: 'warn', duration: 3200 });
          return;
        }
      }
    }
    pasteAt(null);
  }

  let pasteFallbackTimer = null;

  document.addEventListener('paste', (event) => {
    if (isTyping(event.target) || document.body.dataset.view === 'reactions') {
      return;
    }
    event.preventDefault();
    clearTimeout(pasteFallbackTimer);
    pasteFallbackTimer = null;
    closeContextMenu();
    handlePastedText(event.clipboardData ? event.clipboardData.getData('text/plain') : '');
  });

  function cleanUp(atomIds) {
    const ids = atomIds && atomIds.length ? atomIds : graph.atoms.map((a) => a.id);
    if (ids.length === 0) {
      toast('Nothing to clean up yet', { kind: 'warn', duration: 1600 });
      return;
    }
    const moved = cleanupLayout(graph, ids);
    renderer.render();
    toast(moved ? 'Cleaned up ' + plural(moved, 'atom') : 'Layout already clean', { kind: 'ok', duration: 1600 });
  }

  document.getElementById('cleanup-button').addEventListener('click', () => cleanUp(interactions.selectedAtomIds()));

  const importOverlay = document.getElementById('import-overlay');
  const importInput = document.getElementById('import-input');
  const importCanvas = document.getElementById('import-canvas');
  const importMessage = document.getElementById('import-message');
  const importInsert = document.getElementById('import-insert');
  const importOnline = document.getElementById('import-online');
  let importFragment = null;
  let importPoint = null;
  let importTimer = null;

  function renderImportPreview() {
    const rect = importCanvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    importCanvas.width = Math.max(1, Math.round(rect.width * ratio));
    importCanvas.height = Math.max(1, Math.round(rect.height * ratio));
    const temp = new Graph();
    if (importFragment) {
      const idMap = new Map();
      importFragment.atoms.forEach((a) => {
        const atom = temp.addAtom(a.element, a.x, a.y);
        if (a.charge) {
          atom.charge = a.charge;
        }
        idMap.set(a.id, atom.id);
      });
      importFragment.bonds.forEach((b) => {
        const bond = temp.addBond(idMap.get(b.atomA), idMap.get(b.atomB));
        if (bond) {
          bond.order = b.order;
          bond.stereo = b.stereo;
        }
      });
    }
    const preview = new Renderer(importCanvas.getContext('2d'), temp);
    preview.theme = renderer.theme;
    preview.pixelRatio = ratio;
    preview.showGrid = false;
    preview.showEmptyHint = false;
    preview.showNames = false;
    preview.fitToContent(36);
  }

  function updateImport() {
    const text = importInput.value.trim();
    importFragment = null;
    importInput.classList.remove('invalid');
    importMessage.className = '';
    importOnline.hidden = true;
    if (!text) {
      importMessage.textContent = 'Type or paste a SMILES string or a name';
    } else {
      let fromName = null;
      try {
        try {
          importFragment = smilesToFragment(text);
        } catch (smilesError) {
          fromName = nameToSmiles(text);
          if (!fromName) {
            importOnline.hidden = !/[a-z]{3}/i.test(text);
            throw new Error(/[a-z]{3}/i.test(text)
              ? 'Not a recognized name or valid SMILES (' + smilesError.message + ')'
              : smilesError.message);
          }
          importFragment = smilesToFragment(fromName.smiles);
        }
        const temp = new Graph();
        const idMap = new Map();
        importFragment.atoms.forEach((a) => {
          const atom = temp.addAtom(a.element, a.x, a.y);
          if (a.charge) {
            atom.charge = a.charge;
          }
          idMap.set(a.id, atom.id);
        });
        importFragment.bonds.forEach((b) => {
          const bond = temp.addBond(idMap.get(b.atomA), idMap.get(b.atomB));
          if (bond) {
            bond.order = b.order;
            bond.stereo = b.stereo;
          }
        });
        const parts = temp.connectedComponents().map((c) => {
          const props = computeProperties(temp, c.atomIds);
          let name = '';
          if (!c.atomIds.some((id) => temp.getAtom(id).charge)) {
            try {
              name = nameStructure(temp, c.atomIds) || '';
            } catch (error) {
              name = '';
            }
          }
          return (name ? name + ' · ' : '') + props.formula;
        });
        importMessage.textContent = (fromName ? 'Name recognized \u2192 ' : '') + parts.join('  +  ');
        importMessage.className = 'ok';
      } catch (error) {
        importInput.classList.add('invalid');
        importMessage.textContent = error.message;
        importMessage.className = 'error';
      }
    }
    importInsert.disabled = !importFragment;
    renderImportPreview();
  }

  function openImport(worldPoint) {
    closeContextMenu();
    importPoint = worldPoint || null;
    importOverlay.hidden = false;
    importInput.focus();
    importInput.select();
    updateImport();
  }

  function closeImport() {
    importOverlay.hidden = true;
    importInput.blur();
  }

  function commitImport() {
    if (!importFragment) {
      return;
    }
    const size = renderer.viewportSize();
    const center = importPoint || renderer.toWorld({ x: size.width / 2, y: size.height / 2 });
    closeImport();
    const ids = insertSmilesFragment(importFragment, center);
    toast('Imported ' + plural(ids.length, 'atom'), { kind: 'ok', duration: 1600 });
  }

  importInput.addEventListener('input', () => {
    clearTimeout(importTimer);
    importTimer = setTimeout(updateImport, 120);
  });
  importInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      clearTimeout(importTimer);
      updateImport();
      commitImport();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeImport();
    }
  });
  document.getElementById('import-button').addEventListener('click', () => openImport(null));
  document.getElementById('import-close').addEventListener('click', closeImport);
  document.getElementById('import-cancel').addEventListener('click', closeImport);
  importInsert.addEventListener('click', commitImport);
  importOnline.addEventListener('click', async () => {
    const query = importInput.value.trim();
    if (!query) {
      return;
    }
    importOnline.disabled = true;
    importMessage.textContent = 'Searching PubChem\u2026';
    importMessage.className = '';
    try {
      const response = await fetch('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/' + encodeURIComponent(query) + '/property/IsomericSMILES,SMILES/JSON');
      const data = response.ok ? await response.json() : null;
      const props = data && data.PropertyTable && data.PropertyTable.Properties && data.PropertyTable.Properties[0];
      const smiles = props && (props.IsomericSMILES || props.SMILES);
      if (!smiles) {
        throw new Error('No PubChem match for \u201c' + query + '\u201d');
      }
      if (importInput.value.trim() === query) {
        importInput.value = smiles;
        updateImport();
      }
    } catch (error) {
      importMessage.textContent = error.message === 'Failed to fetch' ? 'PubChem is unreachable' : error.message;
      importMessage.className = 'error';
    } finally {
      importOnline.disabled = false;
    }
  });
  importOverlay.addEventListener('click', (event) => {
    if (event.target === importOverlay) {
      closeImport();
    }
  });
  importOverlay.querySelectorAll('[data-smiles]').forEach((button) => {
    button.addEventListener('click', () => {
      importInput.value = button.dataset.smiles;
      updateImport();
      importInput.focus();
    });
  });

  function duplicateAtoms(atomIds) {
    const annotationIds = interactions.annotationTargets(atomIds);
    if (atomIds.length === 0 && annotationIds.length === 0) {
      toast('Select or hover a molecule to duplicate', { kind: 'warn' });
      return;
    }
    const bounds = renderer.contentBounds(atomIds, annotationIds);
    const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
    const offset = Math.max(40, Math.min(bounds.maxX - bounds.minX + 50, 400));
    interactions.insertFragment(interactions.extractFragment(atomIds, annotationIds), { x: center.x + offset, y: center.y });
    renderer.render();
  }

  function selectAll() {
    if (graph.isEmpty()) {
      return;
    }
    interactions.setSelection(graph.atoms.map((a) => a.id));
    graph.annotations.forEach((a) => interactions.annotationSelection.add(a.id));
    interactions.selectionChanged();
  }

  function requireTarget(action) {
    const ids = interactions.targetAtomIds();
    if (ids.length === 0 && interactions.annotationSelection.size === 0) {
      toast('Select atoms or hover a molecule first', { kind: 'warn', duration: 1800 });
      return;
    }
    action(ids);
  }

  const contextMenu = document.getElementById('context-menu');

  function closeContextMenu() {
    if (contextMenu.hidden) {
      return false;
    }
    contextMenu.hidden = true;
    contextMenu.innerHTML = '';
    return true;
  }

  function openContextMenu(entries, client) {
    contextMenu.innerHTML = '';
    entries.forEach((entry) => {
      if (entry.separator) {
        const sep = document.createElement('div');
        sep.className = 'cm-sep';
        contextMenu.appendChild(sep);
      } else if (entry.title) {
        const title = document.createElement('div');
        title.className = 'cm-title';
        title.textContent = entry.title;
        title.title = entry.title;
        contextMenu.appendChild(title);
      } else if (entry.chips) {
        const row = document.createElement('div');
        row.className = 'cm-chips';
        entry.chips.forEach((chip) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'cm-chip' + (chip.active ? ' active' : '');
          button.textContent = chip.label;
          if (chip.title) {
            button.title = chip.title;
          }
          if (chip.color) {
            button.style.setProperty('--chip', chip.color);
          }
          button.addEventListener('click', () => {
            closeContextMenu();
            chip.run();
          });
          row.appendChild(button);
        });
        contextMenu.appendChild(row);
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cm-item' + (entry.danger ? ' danger' : '');
        button.setAttribute('role', 'menuitem');
        button.disabled = !!entry.disabled;
        const label = document.createElement('span');
        label.textContent = entry.label;
        button.appendChild(label);
        if (entry.kbd) {
          const kbd = document.createElement('kbd');
          kbd.textContent = entry.kbd;
          button.appendChild(kbd);
        }
        button.addEventListener('click', () => {
          closeContextMenu();
          entry.run();
        });
        contextMenu.appendChild(button);
      }
    });
    contextMenu.hidden = false;
    const rect = contextMenu.getBoundingClientRect();
    const x = Math.min(client.x, window.innerWidth - rect.width - 8);
    const y = client.y + rect.height > window.innerHeight - 8 ? Math.max(8, client.y - rect.height) : client.y;
    contextMenu.style.left = Math.max(8, x) + 'px';
    contextMenu.style.top = y + 'px';
  }

  function moleculeEntries(ids) {
    return [
      { label: 'Properties', run: () => openPanel({ atomIds: ids }) },
      { label: 'Resonance structures', kbd: 'Alt+R', run: () => openResonance(ids) },
      { label: 'Find isomers', kbd: 'Alt+I', run: () => openIsomers(ids) },
      { label: 'Predicted spectra', kbd: 'Alt+N', run: () => spectraView.open() },
      { label: '3D & projections', kbd: 'Alt+D', run: () => viewer3d.open() },
      { label: 'Retrosynthesis…', kbd: 'Alt+T', run: () => openRetro(ids) },
      {
        label: 'Copy name',
        run: () => {
          const name = renderer.nameFor(ids);
          if (name) {
            renderer.copyName(name);
          } else {
            toast('No name available for this structure', { kind: 'warn' });
          }
        },
      },
      { label: 'Copy SMILES', run: () => copySmilesFor(ids) },
      { label: 'Copy MOL block', run: () => copyMolfileFor(ids) },
      { label: 'Save as MOL file', run: () => exportMolfile(ids) },
      { label: 'Select molecule', kbd: 'dbl-click', run: () => interactions.setSelection(ids) },
      { separator: true },
      { label: 'Duplicate', kbd: 'Ctrl+D', run: () => duplicateAtoms(ids) },
      { label: 'Rotate 90°', kbd: '}', run: () => interactions.rotateAtoms(ids, 90) },
      { label: 'Flip horizontal', kbd: 'X', run: () => interactions.flipAtoms(ids, 'horizontal') },
      { label: 'Flip vertical', kbd: 'Y', run: () => interactions.flipAtoms(ids, 'vertical') },
      { label: 'Clean up structure', kbd: 'K', run: () => cleanUp(ids) },
      { label: 'Save as stamp', run: () => interactions.onSaveStamp(ids[0]) },
      { separator: true },
      { label: 'Delete molecule', danger: true, run: () => interactions.deleteAtoms(ids) },
    ];
  }

  function selectionEntries(ids) {
    return [
      { title: plural(ids.length, 'atom') + ' selected' },
      { label: 'Copy', kbd: 'Ctrl+C', run: () => copyAtoms(ids) },
      { label: 'Cut', kbd: 'Ctrl+X', run: () => cutAtoms(ids) },
      { label: 'Duplicate', kbd: 'Ctrl+D', run: () => duplicateAtoms(ids) },
      { label: 'Copy SMILES', run: () => copySmilesFor(ids) },
      { label: 'Polymer brackets', kbd: 'Alt+B', run: () => addPolymerBrackets(ids) },
      { label: 'Find isomers', kbd: 'Alt+I', run: () => openIsomers(ids) },
      { label: 'Retrosynthesis…', kbd: 'Alt+T', run: () => openRetro(ids) },
      { separator: true },
      { label: 'Rotate 90°', kbd: '}', run: () => interactions.rotateAtoms(ids, 90) },
      { label: 'Flip horizontal', kbd: 'X', run: () => interactions.flipAtoms(ids, 'horizontal') },
      { label: 'Flip vertical', kbd: 'Y', run: () => interactions.flipAtoms(ids, 'vertical') },
      { label: 'Clean up structure', kbd: 'K', run: () => cleanUp(ids) },
      { separator: true },
      { label: 'Delete', kbd: 'Del', danger: true, run: () => interactions.deleteAtoms(ids) },
      { label: 'Clear selection', kbd: 'Esc', run: () => interactions.clearSelection() },
    ];
  }

  const MENU_ELEMENTS = ['C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br'];

  const CHARGE_CHOICES = [-2, -1, 0, 1, 2];

  function abbreviationEntries(atom) {
    const ids = interactions.componentAtomIds(atom.id);
    return [
      { title: atom.abbr + ' group (abbreviation)' },
      {
        label: 'Expand ' + atom.abbr,
        run: () => {
          expandAbbreviation(graph, atom.id);
          renderer.render();
        },
      },
      { label: 'Delete group', kbd: 'Del', danger: true, run: () => interactions.deleteAtoms([atom.id]) },
      { separator: true },
    ].concat(moleculeEntries(ids));
  }

  function collapseEntries(atom) {
    return abbreviationMatches(graph, atom.id).slice(0, 3).map((match) => ({
      label: 'Collapse to ' + match.key,
      run: () => {
        collapseAbbreviation(graph, match);
        interactions.setSelection([]);
      },
    }));
  }

  function atomEntries(atom) {
    if (atom.abbr) {
      return abbreviationEntries(atom);
    }
    const ids = interactions.componentAtomIds(atom.id);
    const collapse = collapseEntries(atom);
    const problem = valenceProblems(graph).find((p) => p.atomId === atom.id);
    const fixEntries = !problem ? [] : [{
      label: problem.fix ? 'Fix valence: ' + problem.fix.label : problem.message,
      disabled: !problem.fix,
      run: () => {
        applyValenceFix(graph, problem);
        renderer.render();
      },
    }];
    return [
      { title: (ELEMENT_NAMES[atom.element] || atom.element) + ' atom' },
    ].concat(fixEntries, [
      {
        chips: MENU_ELEMENTS.concat(MENU_ELEMENTS.includes(atom.element) ? [] : [atom.element]).map((element) => ({
          label: element,
          active: atom.element === element,
          color: colorForElement(element, renderer.theme),
          title: ELEMENT_NAMES[element],
          run: () => interactions.setAtomElement(atom, element),
        })).concat([{
          label: 'More\u2026',
          title: 'Pick any element from the periodic table',
          run: () => openPeriodicTable((element) => interactions.setAtomElement(atom, element), atom.element),
        }]),
      },
      {
        chips: CHARGE_CHOICES.map((charge) => ({
          label: charge === 0 ? '0' : chargeText(charge),
          active: (atom.charge || 0) === charge,
          title: charge === 0 ? 'Neutral' : 'Formal charge ' + (charge > 0 ? '+' : '\u2212') + Math.abs(charge),
          run: () => interactions.setAtomCharge(atom, charge),
        })),
      },
    ]).concat(collapse, [
      { label: 'Delete atom', kbd: 'Del', danger: true, run: () => interactions.deleteAtoms([atom.id]) },
      { separator: true },
    ], moleculeEntries(ids));
  }

  const BOND_CHOICES = [
    { label: 'Single', kind: 1 },
    { label: 'Double', kind: 2 },
    { label: 'Triple', kind: 3 },
    { label: 'Wedge', kind: 'wedge' },
    { label: 'Hash', kind: 'hash' },
  ];

  function bondEntries(bond) {
    const a = graph.getAtom(bond.atomA);
    const b = graph.getAtom(bond.atomB);
    const current = bond.stereo || bond.order;
    const entries = [
      { title: (bond.stereo ? (bond.stereo === 'wedge' ? 'Wedge' : 'Hash') : BOND_NAMES[bond.order]) + ' bond ' + a.element + '–' + b.element },
      {
        chips: BOND_CHOICES.map((choice) => ({
          label: choice.label,
          active: current === choice.kind,
          run: () => interactions.setBondKind(bond, choice.kind),
        })),
      },
    ];
    if (bond.stereo) {
      entries.push({ label: 'Reverse stereo direction', run: () => interactions.setBondKind(bond, bond.stereo) });
    }
    entries.push({
      label: 'Delete bond',
      kbd: 'Del',
      danger: true,
      run: () => {
        graph.removeBond(bond.id);
        interactions.setHover(null);
        renderer.render();
      },
    });
    entries.push({ separator: true });
    return entries.concat(moleculeEntries(interactions.componentAtomIds(bond.atomA)));
  }

  function canvasEntries(world) {
    const fragment = readClipboard();
    const hasClipboard = fragmentHasContent(fragment);
    return [
      { label: 'Paste here', kbd: 'Ctrl+V', disabled: !hasClipboard, run: () => pasteAt(world) },
      { label: 'Import SMILES here…', run: () => openImport(world) },
      { label: 'Add text label here', kbd: 'T', run: () => openTextEditor(null, world) },
      { label: 'Select all', kbd: 'Ctrl+A', disabled: graph.isEmpty(), run: selectAll },
      { separator: true },
      { label: 'Fit to screen', kbd: '0', disabled: graph.isEmpty(), run: () => renderer.fitToContent() },
      { label: 'Zoom to 100%', run: () => renderer.zoomCentered(1 / renderer.view.scale) },
      { label: 'Copy all SMILES', kbd: 'Ctrl+⇧+C', disabled: graph.atoms.length === 0, run: copyAllSmiles },
      { label: 'Clean up everything', kbd: 'K', disabled: graph.atoms.length === 0, run: () => cleanUp(null) },
      { label: 'Export PNG', disabled: graph.isEmpty(), run: () => exportPng() },
      { label: 'Export SVG', disabled: graph.isEmpty(), run: () => exportSvg() },
      { label: 'Export MOL / SDF', disabled: graph.atoms.length === 0, run: () => exportMolfile(null) },
      { separator: true },
      { label: 'Clear canvas', danger: true, disabled: graph.isEmpty(), run: () => clearCanvas() },
    ];
  }

  function annotationEntries(annotation) {
    const remove = () => {
      graph.removeAnnotation(annotation.id);
      interactions.setHover(null);
      renderer.render();
    };
    if (annotation.kind === 'plus') {
      return [
        { title: 'Plus sign' },
        { label: 'Delete plus', kbd: 'Del', danger: true, run: remove },
      ];
    }
    if (annotation.kind === 'bracket') {
      return [
        { title: 'Polymer brackets' },
        { label: 'Rename…', run: () => openBracketEditor(annotation) },
        { separator: true },
        { label: 'Delete brackets', kbd: 'Del', danger: true, run: remove },
      ];
    }
    if (annotation.kind === 'text') {
      return [
        { title: 'Text label' },
        { label: 'Edit text…', run: () => openTextEditor(annotation) },
        { separator: true },
        { label: 'Delete label', kbd: 'Del', danger: true, run: remove },
      ];
    }
    const curved = isCurvedArrow(annotation);
    return [{ title: ARROW_LABELS[annotation.style] }]
      .concat(ARROW_STYLES.filter((style) => isCurvedArrow({ style }) === curved).map((style) => ({
        label: (style === annotation.style ? '✓ ' : '') + ARROW_LABELS[style],
        disabled: style === annotation.style,
        run: () => interactions.setArrowStyle(annotation, style),
      })))
      .concat([{ label: 'Reverse direction', run: () => interactions.reverseArrow(annotation) }])
      .concat(curved
        ? [{ label: 'Flip curve', run: () => interactions.flipArrowBend(annotation) }]
        : [
          { label: (annotation.above ? 'Edit' : 'Add') + ' text above arrow…', run: () => openArrowLabelEditor(annotation, 'above') },
          { label: (annotation.below ? 'Edit' : 'Add') + ' text below arrow…', run: () => openArrowLabelEditor(annotation, 'below') },
          { label: 'Place + signs', run: () => {
            const added = schemeAutoPlus(graph, annotation);
            renderer.render();
            toast(added ? 'Added ' + plural(added, 'plus sign') : 'No + signs needed', { kind: added ? 'ok' : 'info', duration: 1800 });
          } },
          { label: 'Check mass balance', run: () => {
          const balance = schemeBalance(graph, annotation);
          toast(schemeBalanceText(balance), { kind: balance.balanced ? 'ok' : 'warn', duration: 4500 });
        } }])
      .concat([
        { separator: true },
        { label: 'Delete arrow', kbd: 'Del', danger: true, run: remove },
      ]);
  }

  interactions.onContext = (hit, client, world) => {
    const selected = interactions.selectedAtomIds();
    const inSelection = hit && (
      (hit.type === 'atom' && interactions.selection.has(hit.id)) ||
      (hit.type === 'bond' && interactions.selection.has(hit.bond.atomA) && interactions.selection.has(hit.bond.atomB))
    );
    let entries;
    if (hit && hit.type === 'annotation') {
      entries = annotationEntries(hit.annotation);
    } else if (inSelection && selected.length > 1) {
      entries = selectionEntries(selected);
    } else if (hit && hit.type === 'name') {
      entries = [{ title: hit.box.label }].concat(moleculeEntries(hit.box.atomIds));
    } else if (hit && hit.type === 'atom') {
      entries = atomEntries(hit.atom);
    } else if (hit && hit.type === 'bond') {
      entries = bondEntries(hit.bond);
    } else if (selected.length) {
      entries = selectionEntries(selected).concat([{ separator: true }], canvasEntries(world));
    } else {
      entries = canvasEntries(world);
    }
    openContextMenu(entries, client);
  };

  const closeMenuOutside = (event) => {
    if (!contextMenu.hidden && !contextMenu.contains(event.target)) {
      closeContextMenu();
    }
  };
  document.addEventListener('mousedown', closeMenuOutside, true);
  document.addEventListener('touchstart', closeMenuOutside, { capture: true, passive: true });
  window.addEventListener('blur', closeContextMenu);
  window.addEventListener('resize', closeContextMenu);
  canvas.addEventListener('wheel', closeContextMenu, { passive: true });

  function largestComponent() {
    const components = graph.connectedComponents();
    if (interactions.hover && (interactions.hover.type === 'atom' || interactions.hover.type === 'bond')) {
      const atomId = interactions.hover.type === 'atom' ? interactions.hover.id : (graph.getBondById(interactions.hover.id) || {}).atomA;
      const hovered = components.find((c) => c.atomIds.includes(atomId));
      if (hovered) {
        return hovered;
      }
    }
    return components.sort((a, b) => b.atomIds.length - a.atomIds.length)[0] || null;
  }

  document.getElementById('info-button').addEventListener('click', () => {
    const component = largestComponent();
    if (!component) {
      toast('Draw a molecule to see its properties', { kind: 'warn' });
      return;
    }
    openPanel({ atomIds: component.atomIds });
  });

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function fileBaseName() {
    const component = largestComponent();
    let name = '';
    if (component) {
      try {
        name = renderer.nameFor(component.atomIds) || '';
      } catch (error) {
        name = '';
      }
    }
    const slug = name.replace(/[^A-Za-z0-9,()\-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return slug || 'molecule';
  }

  function saveDrawing() {
    if (graph.isEmpty()) {
      toast('Nothing to save yet', { kind: 'warn' });
      return;
    }
    rememberRecent();
    downloadBlob(new Blob([serializeGraph()], { type: 'application/json' }), fileBaseName() + '.json');
    toast('Drawing saved', { kind: 'ok' });
  }

  const openInput = document.getElementById('open-input');
  openInput.addEventListener('change', () => {
    const file = openInput.files && openInput.files[0];
    openInput.value = '';
    if (!file) {
      return;
    }
    file.text().then((text) => {
      if (looksLikeMolfile(text)) {
        try {
          importMolfile(text, null);
        } catch (error) {
          toast('Could not read ' + file.name + ' — ' + error.message, { kind: 'warn', duration: 3600 });
        }
        return;
      }
      let data = null;
      try {
        data = JSON.parse(text);
      } catch (error) {
        data = null;
      }
      if (data && typeof data === 'object' && Array.isArray(data.atoms)) {
        rememberRecent();
      }
      if (!loadGraphState(data)) {
        toast('That file is not a saved drawing', { kind: 'warn' });
        return;
      }
      interactions.setHover(null);
      interactions.updateGhost(null);
      interactions.clearSelection();
      renderer.fitToContent();
      toast('Opened ' + file.name, { kind: 'ok' });
    });
  });

  document.getElementById('save-button').addEventListener('click', saveDrawing);
  document.getElementById('open-button').addEventListener('click', () => openInput.click());

  function exportFrame() {
    const bounds = renderer.contentBounds();
    if (!bounds) {
      toast('Nothing to export yet', { kind: 'warn' });
      return null;
    }
    const pad = 40;
    const top = 60;
    const width = Math.max(200, bounds.maxX - bounds.minX + pad * 2);
    return {
      width,
      height: bounds.maxY - bounds.minY + pad + top,
      view: { x: width / 2 - (bounds.minX + bounds.maxX) / 2, y: top - bounds.minY, scale: 1 },
    };
  }

  function renderExport(ctx, frame, scale) {
    const exporter = new Renderer(ctx, graph);
    exporter.theme = renderer.theme;
    exporter.pixelRatio = scale;
    exporter.showGrid = false;
    exporter.showEmptyHint = false;
    exporter.nameCache = renderer.nameCache;
    exporter.insight = Object.assign({}, renderer.insight);
    exporter.insightCache = renderer.insightCache;
    exporter.matchAtoms = renderer.matchAtoms;
    exporter.matchBonds = renderer.matchBonds;
    exporter.view = frame.view;
    exporter.render();
  }

  function exportSvg() {
    const frame = exportFrame();
    if (!frame) {
      return;
    }
    rememberRecent();
    const ctx = new SvgContext(frame.width, frame.height);
    renderExport(ctx, frame, 1);
    downloadBlob(new Blob([ctx.toSvg()], { type: 'image/svg+xml' }), fileBaseName() + '.svg');
    toast('Exported SVG', { kind: 'ok' });
  }

  function exportPng() {
    const frame = exportFrame();
    if (!frame) {
      return;
    }
    rememberRecent();
    const scale = 2;
    const off = document.createElement('canvas');
    off.width = Math.round(frame.width * scale);
    off.height = Math.round(frame.height * scale);
    renderExport(off.getContext('2d'), frame, scale);
    off.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, fileBaseName() + '.png');
        toast('Exported PNG', { kind: 'ok' });
      }
    }, 'image/png');
  }

  document.getElementById('export-button').addEventListener('click', exportPng);
  document.getElementById('export-svg-button').addEventListener('click', exportSvg);

  function applyTheme(theme) {
    renderer.theme = theme;
    document.body.dataset.theme = theme;
    storageSet('theme', theme);
    paintElementAccents();
    updateCurrentChip();
    renderer.render();
    reactionLab.repaint();
    if (spectraView) {
      spectraView.repaint();
    }
  }

  const locantsButton = document.getElementById('locants-button');
  function setLocants(show) {
    renderer.showLocants = show;
    locantsButton.classList.toggle('active', show);
    locantsButton.setAttribute('aria-pressed', show ? 'true' : 'false');
    storageSet('showLocants', show ? '1' : '0');
    renderer.render();
  }
  locantsButton.addEventListener('click', () => {
    setLocants(!renderer.showLocants);
    toast(renderer.showLocants ? 'Locant numbers shown' : 'Locant numbers hidden', { duration: 1400 });
  });
  if (storageGet('showLocants') === '1') {
    setLocants(true);
  }

  const INSIGHT_KEYS = {
    electrons: { storage: 'insightElectrons', label: 'Lone pairs & radicals' },
    hybridization: { storage: 'insightHybridization', label: 'Hybridization' },
    oxidation: { storage: 'insightOxidation', label: 'Oxidation states' },
    heatmap: { storage: 'insightHeatmap', label: 'Partial charges' },
    acidBase: { storage: 'insightAcidBase', label: 'Acid/base sites' },
  };
  const insightButton = document.getElementById('insight-button');
  const insightMenu = document.getElementById('insight-menu');
  const insightChecks = Array.from(insightMenu.querySelectorAll('input[data-insight]'));
  const substructureInput = document.getElementById('substructure-input');
  const substructurePrev = document.getElementById('substructure-prev');
  const substructureNext = document.getElementById('substructure-next');
  const substructureStatus = document.getElementById('substructure-status');

  function syncInsightButton() {
    const on = renderer.insightActive() || renderer.matchAtoms.size > 0;
    insightButton.classList.toggle('active', on);
    insightButton.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function setInsight(key, show, announce) {
    renderer.insight[key] = show;
    insightChecks.forEach((input) => {
      if (input.dataset.insight === key) {
        input.checked = show;
      }
    });
    storageSet(INSIGHT_KEYS[key].storage, show ? '1' : '0');
    syncInsightButton();
    renderer.render();
    if (announce) {
      toast(INSIGHT_KEYS[key].label + (show ? ' shown' : ' hidden'), { duration: 1400 });
    }
  }

  function positionInsightMenu() {
    const rect = insightButton.getBoundingClientRect();
    const width = insightMenu.offsetWidth || 272;
    insightMenu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) + 'px';
    insightMenu.style.top = (rect.bottom + 6) + 'px';
  }

  function openInsightMenu() {
    closeContextMenu();
    insightMenu.hidden = false;
    insightButton.setAttribute('aria-expanded', 'true');
    positionInsightMenu();
  }

  function closeInsightMenu() {
    if (insightMenu.hidden) {
      return;
    }
    insightMenu.hidden = true;
    insightButton.setAttribute('aria-expanded', 'false');
    if (insightMenu.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  insightButton.addEventListener('click', () => {
    if (insightMenu.hidden) {
      openInsightMenu();
    } else {
      closeInsightMenu();
    }
  });
  insightChecks.forEach((input) => {
    input.addEventListener('change', () => setInsight(input.dataset.insight, input.checked, false));
  });
  document.addEventListener('mousedown', (event) => {
    if (!insightMenu.hidden && !insightMenu.contains(event.target) && !insightButton.contains(event.target)) {
      closeInsightMenu();
    }
  }, true);
  insightMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && event.target !== substructureInput) {
      event.preventDefault();
      event.stopPropagation();
      closeInsightMenu();
      insightButton.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (!insightMenu.hidden) {
      positionInsightMenu();
    }
  });
  Object.keys(INSIGHT_KEYS).forEach((key) => {
    if (storageGet(INSIGHT_KEYS[key].storage) === '1') {
      setInsight(key, true, false);
    }
  });

  function insightSigned(value, digits) {
    return renderer.insightNumber(value, digits);
  }

  function insightHoverText(atomId) {
    if (!renderer.insightActive()) {
      return '';
    }
    const data = renderer.insightForAtom(atomId);
    if (!data) {
      return '';
    }
    const parts = [];
    if (data.info.hybridization) {
      parts.push(data.info.hybridization.replace('2', '²').replace('3', '³'));
    }
    parts.push('OS ' + insightSigned(data.info.oxidationState, 0));
    if (!data.unparameterized && Number.isFinite(data.charge)) {
      parts.push('δ ' + insightSigned(data.charge, 2));
    }
    if (data.info.lonePairs) {
      parts.push(plural(data.info.lonePairs, 'lone pair'));
    }
    if (data.info.radical) {
      parts.push('radical');
    }
    return ' · ' + parts.join(' · ');
  }

  function insightPanelHtml(atomIds) {
    let html = '';
    try {
      const sites = acidBaseSites(graph, atomIds);
      const items = sites.acids.map((s) => '<li>Acid &middot; ' + escapeHtml(s.group) + ' &mdash; pK<sub>a</sub> &asymp; ' + renderer.insightRange(s) + '</li>')
        .concat(sites.bases.map((s) => '<li>Base &middot; ' + escapeHtml(s.group) + ' &mdash; pK<sub>aH</sub> &asymp; ' + renderer.insightRange(s) + '</li>'));
      html += '<div class="info-block"><h3>Acid/base sites</h3>' +
        (items.length ? '<ul class="info-list">' + items.join('') + '</ul>' : '<div class="info-note">None detected</div>') +
        '<div class="info-note">Typical ranges for the functional group in water, not a prediction for this exact molecule.</div></div>';
    } catch (error) {
      html += '';
    }
    let count = null;
    try {
      count = resonanceContributors(graph, atomIds).length;
    } catch (error) {
      count = null;
    }
    if (count !== null) {
      html += '<div class="info-block"><h3>Resonance</h3><table class="info-table">' +
        row('Contributors', (count >= RESONANCE_SETTINGS.max ? count + '+' : String(count)) +
          '<button type="button" class="info-button-inline" id="resonance-open-button">Open viewer</button>') +
        '</table></div>';
    }
    html += '<div class="info-block"><h3>Spectra</h3><table class="info-table">' +
      row('¹H, ¹³C, IR, MS', '<button type="button" class="info-button-inline" id="spectra-open-button">Predicted spectra</button>') +
      '</table></div>';
    return html;
  }

  function graphSignature() {
    return graph.atoms.map((a) => a.id + a.element + (a.charge || '')).join(';') + '|' +
      graph.bonds.map((b) => b.atomA + '-' + b.atomB + ':' + b.order).join(';');
  }

  function applySubstructureMatches() {
    renderer.matchAtoms = new Set();
    renderer.matchBonds = new Set();
    substructureState.matches.forEach((m) => {
      m.atoms.forEach((id) => renderer.matchAtoms.add(id));
      m.bonds.forEach((id) => renderer.matchBonds.add(id));
    });
    const count = substructureState.matches.length;
    substructurePrev.disabled = count === 0;
    substructureNext.disabled = count === 0;
    if (substructureState.query && !substructureState.query.error) {
      const capped = count >= SUBSTRUCTURE_SETTINGS.maxMatches ? '+' : '';
      substructureStatus.textContent = count === 0 ? 'No matches' : (count === 1 ? '1 match' : count + capped + ' matches') +
        (substructureState.index >= 0 ? ' · showing ' + (substructureState.index + 1) : '');
      substructureStatus.className = count ? 'ok' : '';
    }
    syncInsightButton();
  }

  function runSubstructure() {
    substructureState.timer = null;
    const text = substructureInput.value.trim();
    substructureState.text = text;
    substructureState.index = -1;
    substructureState.signature = graphSignature();
    substructureInput.classList.remove('invalid');
    if (!text) {
      substructureState.query = null;
      substructureState.matches = [];
      substructureStatus.textContent = '';
      substructureStatus.className = '';
      applySubstructureMatches();
      renderer.render();
      return;
    }
    const query = substructureQuery(text);
    substructureState.query = query;
    if (query.error) {
      substructureState.matches = [];
      substructureInput.classList.add('invalid');
      substructureStatus.textContent = query.error;
      substructureStatus.className = 'error';
    } else {
      substructureState.matches = substructureMatches(graph, query);
    }
    applySubstructureMatches();
    renderer.render();
  }

  function refreshSubstructure() {
    if (!substructureState.query || substructureState.query.error) {
      return;
    }
    const signature = graphSignature();
    if (signature === substructureState.signature) {
      return;
    }
    substructureState.signature = signature;
    substructureState.matches = substructureMatches(graph, substructureState.query);
    substructureState.index = -1;
    applySubstructureMatches();
    renderer.render();
  }

  function clearSubstructure() {
    clearTimeout(substructureState.timer);
    substructureInput.value = '';
    runSubstructure();
  }

  function stepSubstructure(direction) {
    const count = substructureState.matches.length;
    if (!count) {
      return;
    }
    substructureState.index = substructureState.index < 0
      ? (direction > 0 ? 0 : count - 1)
      : (substructureState.index + direction + count) % count;
    const atoms = substructureState.matches[substructureState.index].atoms.map((id) => graph.getAtom(id)).filter(Boolean);
    const cx = atoms.reduce((sum, a) => sum + a.x, 0) / atoms.length;
    const cy = atoms.reduce((sum, a) => sum + a.y, 0) / atoms.length;
    const size = renderer.viewportSize();
    renderer.view.x = size.width / 2 - cx * renderer.view.scale;
    renderer.view.y = size.height / 2 - cy * renderer.view.scale;
    applySubstructureMatches();
    renderer.render();
  }

  substructureInput.addEventListener('input', () => {
    clearTimeout(substructureState.timer);
    substructureState.timer = setTimeout(runSubstructure, 160);
  });
  substructureInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (substructureState.timer) {
        clearTimeout(substructureState.timer);
        runSubstructure();
      }
      stepSubstructure(event.shiftKey ? -1 : 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (substructureInput.value) {
        clearSubstructure();
      } else {
        closeInsightMenu();
        insightButton.focus();
      }
    }
  });
  substructurePrev.addEventListener('click', () => stepSubstructure(-1));
  substructureNext.addEventListener('click', () => stepSubstructure(1));

  function focusSubstructure() {
    openInsightMenu();
    substructureInput.focus();
    substructureInput.select();
  }

  const resonanceOverlay = document.getElementById('resonance-overlay');
  const resonanceGrid = document.getElementById('resonance-grid');
  const resonanceSummary = document.getElementById('resonance-summary');
  const resonancePlace = document.getElementById('resonance-place');
  const resonanceHint = document.getElementById('resonance-hint');
  let resonanceList = [];
  let resonanceSource = null;
  let resonanceSelected = -1;

  function structureThumbnail(structure) {
    const thumb = document.createElement('canvas');
    const ratio = window.devicePixelRatio || 1;
    thumb.width = Math.round(180 * ratio);
    thumb.height = Math.round(140 * ratio);
    const preview = new Renderer(thumb.getContext('2d'), structure);
    preview.theme = renderer.theme;
    preview.pixelRatio = ratio;
    preview.showGrid = false;
    preview.showEmptyHint = false;
    preview.showNames = false;
    preview.fitToContent(30);
    return thumb;
  }

  function selectResonance(index) {
    resonanceSelected = index;
    Array.from(resonanceGrid.querySelectorAll('.resonance-card')).forEach((card) => {
      card.classList.toggle('selected', Number(card.dataset.index) === index);
    });
    resonancePlace.disabled = index < 0;
    resonanceHint.textContent = index < 0 ? 'Click a structure to select it' : 'Contributor ' + (index + 1) + ' selected';
  }

  function openResonance(atomIds) {
    closeContextMenu();
    closeInsightMenu();
    if (!atomIds || atomIds.length === 0) {
      toast('Draw a molecule to see its resonance structures', { kind: 'warn' });
      return;
    }
    try {
      resonanceList = resonanceContributors(graph, atomIds);
    } catch (error) {
      toast('Could not compute resonance structures — ' + error.message, { kind: 'warn', duration: 3000 });
      return;
    }
    resonanceSource = atomIds.slice();
    resonanceGrid.innerHTML = '';
    resonanceOverlay.hidden = false;
    const majors = resonanceList.filter((r) => r.label === 'major').length;
    if (resonanceList.length <= 1) {
      resonanceSummary.textContent = 'Only one contributor — this structure has no significant resonance forms.';
    } else {
      resonanceSummary.textContent = plural(resonanceList.length, 'contributor') +
        (resonanceList.length >= RESONANCE_SETTINGS.max ? ' (limit reached)' : '') +
        ' · ' + majors + ' major' + (resonanceList[0].normalized ? ' · nitro groups drawn charge-separated' : '');
    }
    resonanceList.forEach((contributor, index) => {
      if (index > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'resonance-arrow';
        arrow.textContent = '↔';
        resonanceGrid.appendChild(arrow);
      }
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'resonance-card';
      card.dataset.index = String(index);
      card.title = contributor.moves.length ? contributor.moves.join(', ') : 'As drawn';
      card.appendChild(structureThumbnail(contributor.graph));
      const caption = document.createElement('span');
      caption.className = 'resonance-caption' + (contributor.label === 'major' ? ' major' : '');
      caption.textContent = contributor.label;
      card.appendChild(caption);
      card.addEventListener('click', () => selectResonance(index));
      card.addEventListener('dblclick', () => {
        selectResonance(index);
        placeResonance();
      });
      resonanceGrid.appendChild(card);
    });
    selectResonance(-1);
    if (resonanceList.length <= 1) {
      resonanceHint.textContent = '';
    }
  }

  function closeResonance() {
    resonanceOverlay.hidden = true;
    resonanceGrid.innerHTML = '';
    resonanceList = [];
    resonanceSelected = -1;
  }

  function placeResonance() {
    const contributor = resonanceList[resonanceSelected];
    if (!contributor) {
      return;
    }
    const fragment = {
      atoms: contributor.graph.atoms.map((a) => {
        const atom = { id: a.id, element: a.element, x: a.x, y: a.y };
        if (a.charge) {
          atom.charge = a.charge;
        }
        return atom;
      }),
      bonds: contributor.graph.bonds.map((b) => ({ atomA: b.atomA, atomB: b.atomB, order: b.order, stereo: b.stereo || null })),
    };
    const source = renderer.contentBounds(resonanceSource.filter((id) => graph.getAtom(id)));
    const xs = fragment.atoms.map((a) => a.x);
    const halfW = (Math.max(...xs) - Math.min(...xs)) / 2;
    const center = source
      ? { x: source.maxX + 75 + halfW, y: (source.minY + source.maxY) / 2 }
      : null;
    closeResonance();
    const ids = insertSmilesFragment(fragment, center);
    toast('Placed resonance contributor · ' + plural(ids.length, 'atom'), { kind: 'ok', duration: 1600 });
  }

  function openResonanceForTarget() {
    const component = largestComponent();
    openResonance(component ? component.atomIds : null);
  }

  document.getElementById('resonance-button').addEventListener('click', openResonanceForTarget);
  document.getElementById('resonance-close').addEventListener('click', closeResonance);
  document.getElementById('resonance-cancel').addEventListener('click', closeResonance);
  resonancePlace.addEventListener('click', placeResonance);
  resonanceOverlay.addEventListener('click', (event) => {
    if (event.target === resonanceOverlay) {
      closeResonance();
    }
  });

  const isomerOverlay = document.getElementById('isomer-overlay');
  const isomerFormula = document.getElementById('isomer-formula');
  const isomerStable = document.getElementById('isomer-stable');
  const isomerSort = document.getElementById('isomer-sort');
  const isomerFind = document.getElementById('isomer-find');
  const isomerStop = document.getElementById('isomer-stop');
  const isomerSummary = document.getElementById('isomer-summary');
  const isomerGrid = document.getElementById('isomer-grid');
  const isomerPager = document.getElementById('isomer-pager');
  const isomerPrev = document.getElementById('isomer-prev');
  const isomerNext = document.getElementById('isomer-next');
  const isomerPageLabel = document.getElementById('isomer-page');
  const isomerPlace = document.getElementById('isomer-place');
  const isomerHint = document.getElementById('isomer-hint');
  const ISOMER_PAGE_SIZE = 48;
  let isomerJob = null;
  let isomerTimer = null;
  let isomerItems = [];
  let isomerPageIndex = 0;
  let isomerSelected = -1;
  let isomerSource = null;
  let isomerNaming = false;

  function isomerItemName(item) {
    if (item.name === undefined) {
      try {
        item.name = nameStructure(item.graph, item.graph.atoms.map((a) => a.id)) || '';
      } catch (error) {
        item.name = '';
      }
    }
    return item.name;
  }

  function isomerStatusText(job) {
    const count = job.isomers.length;
    if (!job.done) {
      return 'Searching… ' + plural(count, 'isomer') + ' so far';
    }
    if (job.complete) {
      return plural(count, 'isomer') + (isomerStable.checked ? ' (stable only)' : '');
    }
    if (job.stoppedBy === 'limit') {
      return count + '+ shown, stopped at limit';
    }
    if (job.stoppedBy === 'time') {
      return plural(count, 'isomer') + ' shown, stopped at the ' + ISOMER_SETTINGS.timeBudgetMs / 1000 + ' s time limit';
    }
    return plural(count, 'isomer') + ' shown, search cancelled';
  }

  function sortIsomers() {
    if (isomerSort.value === 'name') {
      isomerItems.sort((a, b) => isomerItemName(a).localeCompare(isomerItemName(b)) || a.key.localeCompare(b.key));
    } else {
      isomerItems.sort((a, b) => a.branching - b.branching || a.key.localeCompare(b.key));
    }
  }

  function selectIsomer(index) {
    isomerSelected = index;
    Array.from(isomerGrid.querySelectorAll('.isomer-card')).forEach((card) => {
      card.classList.toggle('selected', Number(card.dataset.index) === index);
    });
    isomerPlace.disabled = index < 0;
    isomerHint.textContent = index < 0 ? (isomerItems.length ? 'Click a structure to select it' : '') : (isomerItemName(isomerItems[index]) || 'Isomer ' + (index + 1)) + ' selected';
  }

  function renderIsomerPage() {
    isomerGrid.innerHTML = '';
    const pages = Math.max(1, Math.ceil(isomerItems.length / ISOMER_PAGE_SIZE));
    isomerPageIndex = Math.min(isomerPageIndex, pages - 1);
    const start = isomerPageIndex * ISOMER_PAGE_SIZE;
    isomerItems.slice(start, start + ISOMER_PAGE_SIZE).forEach((item, offset) => {
      const index = start + offset;
      const name = isomerItemName(item);
      if (!item.laidOut) {
        isomerLayout(item.graph);
        item.laidOut = true;
      }
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'isomer-card';
      card.dataset.index = String(index);
      card.title = name || isomerFormulaText(isomerCountsFor(item.graph));
      card.appendChild(structureThumbnail(item.graph));
      const caption = document.createElement('span');
      caption.className = 'isomer-caption';
      caption.textContent = name || '(unnamed)';
      card.appendChild(caption);
      card.addEventListener('click', () => selectIsomer(index));
      card.addEventListener('dblclick', () => {
        selectIsomer(index);
        placeIsomer();
      });
      isomerGrid.appendChild(card);
    });
    isomerPager.hidden = pages <= 1;
    isomerPageLabel.textContent = 'Page ' + (isomerPageIndex + 1) + ' of ' + pages;
    isomerPrev.disabled = isomerPageIndex === 0;
    isomerNext.disabled = isomerPageIndex >= pages - 1;
    selectIsomer(isomerSelected >= start && isomerSelected < start + ISOMER_PAGE_SIZE ? isomerSelected : -1);
  }

  function isomerCountsFor(structure) {
    const counts = {};
    structure.atoms.forEach((atom) => {
      counts[atom.element] = (counts[atom.element] || 0) + 1;
      const h = implicitHydrogenCount(atom.element, atom.charge || 0, structure.totalBondOrder(atom.id));
      if (h > 0) {
        counts.H = (counts.H || 0) + h;
      }
    });
    return counts;
  }

  function stopIsomerTimer() {
    clearTimeout(isomerTimer);
    isomerTimer = null;
  }

  function finishIsomers() {
    isomerFind.disabled = false;
    isomerStop.disabled = true;
    isomerItems = isomerJob.isomers.map((entry) => ({ graph: entry.graph, key: entry.key, branching: isomerBranching(entry.graph) }));
    isomerSummary.textContent = isomerStatusText(isomerJob);
    isomerPageIndex = 0;
    isomerSelected = -1;
    if (isomerSort.value === 'name') {
      nameAllIsomers();
    } else {
      sortIsomers();
      renderIsomerPage();
    }
  }

  function nameAllIsomers() {
    isomerNaming = true;
    let next = 0;
    const run = () => {
      const started = Date.now();
      while (next < isomerItems.length && Date.now() - started < ISOMER_SETTINGS.stepMs) {
        isomerItemName(isomerItems[next]);
        next++;
      }
      if (next < isomerItems.length) {
        isomerHint.textContent = 'Naming ' + next + ' / ' + isomerItems.length + '…';
        isomerTimer = setTimeout(run, 0);
        return;
      }
      isomerTimer = null;
      isomerNaming = false;
      sortIsomers();
      renderIsomerPage();
    };
    run();
  }

  function runIsomers() {
    stopIsomerTimer();
    isomerNaming = false;
    const counts = parseFormula(isomerFormula.value);
    isomerItems = [];
    isomerGrid.innerHTML = '';
    isomerPager.hidden = true;
    selectIsomer(-1);
    if (counts.error) {
      isomerSummary.textContent = counts.error;
      return;
    }
    isomerJob = isomerEnumerator(counts, { stableOnly: isomerStable.checked });
    if (isomerJob.error) {
      isomerSummary.textContent = isomerJob.error === 'too large'
        ? 'Too many heavy atoms — the isomer search is limited to ' + ISOMER_SETTINGS.maxHeavy
        : 'This formula cannot form a neutral structure';
      isomerJob = null;
      return;
    }
    isomerFind.disabled = true;
    isomerStop.disabled = false;
    const job = isomerJob;
    const tick = () => {
      if (job !== isomerJob) {
        return;
      }
      if (job.step(ISOMER_SETTINGS.stepMs)) {
        isomerTimer = null;
        finishIsomers();
        return;
      }
      isomerSummary.textContent = isomerStatusText(job);
      isomerTimer = setTimeout(tick, 0);
    };
    isomerSummary.textContent = isomerStatusText(job);
    isomerTimer = setTimeout(tick, 0);
  }

  function cancelIsomers() {
    if (isomerJob && !isomerJob.done) {
      isomerJob.cancelled = true;
    }
  }

  function openIsomers(atomIds) {
    closeContextMenu();
    closeInsightMenu();
    const ids = (atomIds || []).filter((id) => graph.getAtom(id));
    isomerSource = ids.length ? ids : null;
    if (ids.length) {
      isomerFormula.value = molecularFormula(graph, ids);
    }
    isomerOverlay.hidden = false;
    if (isomerFormula.value.trim()) {
      runIsomers();
    } else {
      isomerSummary.textContent = 'Enter a molecular formula, e.g. C6H14';
    }
    setTimeout(() => isomerFormula.focus(), 0);
  }

  function closeIsomers() {
    stopIsomerTimer();
    if (isomerJob) {
      isomerJob.cancelled = true;
    }
    isomerJob = null;
    isomerNaming = false;
    isomerOverlay.hidden = true;
    isomerGrid.innerHTML = '';
    isomerItems = [];
    isomerSelected = -1;
    isomerFind.disabled = false;
    isomerStop.disabled = true;
  }

  function placeIsomer() {
    const item = isomerItems[isomerSelected];
    if (!item) {
      return;
    }
    const fragment = {
      atoms: item.graph.atoms.map((a) => ({ id: a.id, element: a.element, x: a.x, y: a.y })),
      bonds: item.graph.bonds.map((b) => ({ atomA: b.atomA, atomB: b.atomB, order: b.order, stereo: null })),
    };
    const source = isomerSource ? renderer.contentBounds(isomerSource.filter((id) => graph.getAtom(id))) : null;
    const xs = fragment.atoms.map((a) => a.x);
    const halfW = (Math.max(...xs) - Math.min(...xs)) / 2;
    const center = source ? { x: source.maxX + 75 + halfW, y: (source.minY + source.maxY) / 2 } : null;
    const name = isomerItemName(item);
    closeIsomers();
    const ids = insertSmilesFragment(fragment, center);
    toast('Placed ' + (name || 'isomer') + ' · ' + plural(ids.length, 'atom'), { kind: 'ok', duration: 1600 });
  }

  function openIsomersForTarget() {
    const selected = interactions.selectedAtomIds();
    if (selected.length) {
      openIsomers(selected);
      return;
    }
    const component = largestComponent();
    openIsomers(component ? component.atomIds : null);
  }

  function addPolymerBrackets(ids) {
    const atomIds = Array.from(new Set(ids)).filter((id) => graph.getAtom(id));
    const bracket = { kind: 'bracket', atomIds, n: 'n' };
    if (!bracketValid(graph, bracket)) {
      toast('Select one repeat unit with exactly two bonds leaving it', { kind: 'warn', duration: 3000 });
      return;
    }
    graph.annotations
      .filter((a) => a.kind === 'bracket' && a.atomIds.length === atomIds.length && a.atomIds.every((id) => atomIds.includes(id)))
      .forEach((a) => graph.removeAnnotation(a.id));
    const added = graph.addAnnotation(bracket);
    renderer.render();
    const label = renderer.polymerLabel(added);
    toast('Polymer brackets' + (label ? ' · ' + label : ''), { kind: 'ok', duration: 1800 });
  }

  function openBracketEditor(bracket) {
    closeTextEditor(true);
    const geometry = renderer.bracketGeometry(bracket);
    if (!geometry || !geometry.labelBox) {
      return;
    }
    const box = geometry.labelBox;
    textEditing = { bracketLabel: bracket, point: { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 } };
    renderer.editingAnnotationId = bracket.id;
    textEditor.value = geometry.label;
    textEditor.hidden = false;
    positionTextEditor();
    renderer.render();
    setTimeout(() => {
      if (textEditing) {
        textEditor.focus();
        textEditor.select();
      }
    }, 0);
  }

  document.getElementById('isomer-close').addEventListener('click', closeIsomers);
  document.getElementById('isomer-cancel').addEventListener('click', closeIsomers);
  isomerFind.addEventListener('click', runIsomers);
  isomerStop.addEventListener('click', cancelIsomers);
  isomerPlace.addEventListener('click', placeIsomer);
  isomerPrev.addEventListener('click', () => {
    isomerPageIndex = Math.max(0, isomerPageIndex - 1);
    renderIsomerPage();
  });
  isomerNext.addEventListener('click', () => {
    isomerPageIndex++;
    renderIsomerPage();
  });
  isomerSort.addEventListener('change', () => {
    if (!isomerItems.length || isomerNaming) {
      return;
    }
    if (isomerSort.value === 'name') {
      nameAllIsomers();
    } else {
      sortIsomers();
      renderIsomerPage();
    }
  });
  isomerStable.addEventListener('change', () => {
    if (isomerFormula.value.trim()) {
      runIsomers();
    }
  });
  isomerFormula.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runIsomers();
    }
  });
  isomerOverlay.addEventListener('click', (event) => {
    if (event.target === isomerOverlay) {
      closeIsomers();
    }
  });

  const shareButton = document.getElementById('share-button');
  const shareMenu = document.getElementById('share-menu');

  function positionShareMenu() {
    const rect = shareButton.getBoundingClientRect();
    const width = shareMenu.offsetWidth || 240;
    shareMenu.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)) + 'px';
    shareMenu.style.top = (rect.bottom + 6) + 'px';
  }

  function openShareMenu() {
    closeContextMenu();
    closeInsightMenu();
    shareMenu.hidden = false;
    shareButton.setAttribute('aria-expanded', 'true');
    positionShareMenu();
  }

  function closeShareMenu() {
    if (shareMenu.hidden) {
      return;
    }
    shareMenu.hidden = true;
    shareButton.setAttribute('aria-expanded', 'false');
    if (shareMenu.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  shareButton.addEventListener('click', () => {
    if (shareMenu.hidden) {
      openShareMenu();
    } else {
      closeShareMenu();
    }
  });
  document.addEventListener('mousedown', (event) => {
    if (!shareMenu.hidden && !shareMenu.contains(event.target) && !shareButton.contains(event.target)) {
      closeShareMenu();
    }
  }, true);
  shareMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeShareMenu();
      shareButton.focus();
    }
  });
  window.addEventListener('resize', () => {
    if (!shareMenu.hidden) {
      positionShareMenu();
    }
  });
  document.getElementById('share-link-button').addEventListener('click', () => {
    closeShareMenu();
    copyShareLink();
  });
  document.getElementById('notebook-button').addEventListener('click', () => {
    closeShareMenu();
    openNotebook();
  });

  function shareCompress(text) {
    const bytes = shareUtf8Encode(text);
    if (typeof CompressionStream !== 'function') {
      return Promise.resolve(sharePackPayload(bytes, false));
    }
    return Promise.resolve()
      .then(() => new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer())
      .then((buffer) => sharePackPayload(new Uint8Array(buffer), true))
      .catch(() => sharePackPayload(bytes, false));
  }

  function shareInflate(bytes) {
    if (typeof DecompressionStream !== 'function') {
      return Promise.reject(new Error('this browser cannot read compressed links'));
    }
    const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
    const chunks = [];
    let total = 0;
    const pump = () => reader.read().then(({ done, value }) => {
      if (done) {
        const out = new Uint8Array(total);
        let offset = 0;
        chunks.forEach((chunk) => {
          out.set(chunk, offset);
          offset += chunk.length;
        });
        return out;
      }
      total += value.length;
      if (total > SHARE_MAX_JSON_LENGTH) {
        reader.cancel().catch(() => {});
        throw new Error('the link is too large');
      }
      chunks.push(value);
      return pump();
    });
    return pump().catch((error) => {
      throw new Error(error && /too large|cannot read/.test(error.message) ? error.message : 'the link payload is damaged');
    });
  }

  function shareDecompress(payload) {
    return Promise.resolve().then(() => {
      const unpacked = shareUnpackPayload(payload);
      if (unpacked.error) {
        throw new Error(unpacked.error);
      }
      return unpacked.compressed ? shareInflate(unpacked.bytes) : unpacked.bytes;
    }).then((bytes) => {
      try {
        return shareUtf8Decode(bytes);
      } catch (error) {
        throw new Error('the link payload is damaged');
      }
    });
  }

  function shareBaseUrl() {
    return window.location.href.split('#')[0];
  }

  function copySmilesLink() {
    const smiles = allSmiles();
    if (!smiles) {
      toast('Nothing to share yet', { kind: 'warn' });
      return;
    }
    const url = shareUrl(shareBaseUrl(), 'smiles', smiles);
    copyText(url).then(
      () => toast('SMILES link copied (no stereo or annotations)', { kind: 'ok', duration: 3200 }),
      () => toast('Could not copy the link', { kind: 'warn' }));
  }

  function copyShareLink() {
    if (graph.isEmpty()) {
      toast('Nothing to share yet', { kind: 'warn' });
      return;
    }
    shareCompress(shareEncodeGraph(serializeGraph())).then((payload) => {
      const url = shareUrl(shareBaseUrl(), 'g', payload);
      return copyText(url).then(() => {
        const long = url.length > SHARE_LINK_WARN_LENGTH;
        const message = long
          ? 'Share link copied · ' + url.length.toLocaleString() + ' characters, may be too long for some chat apps'
          : 'Share link copied';
        toast(message, { kind: long ? 'warn' : 'ok', action: { label: 'SMILES link instead', run: copySmilesLink }, duration: long ? 7000 : 4500 });
      });
    }).catch(() => toast('Could not copy the share link', { kind: 'warn' }));
  }

  function clearShareHash() {
    if (window.location.hash) {
      window.history.replaceState(null, '', shareBaseUrl());
    }
  }

  function applySharedState(apply) {
    if (document.body.dataset.view === 'reactions') {
      setView('editor');
    }
    closeShareMenu();
    if (!graph.isEmpty()) {
      rememberRecent();
    }
    interactions.setHover(null);
    interactions.updateGhost(null);
    interactions.clearSelection();
    apply();
    renderer.fitToContent();
    toast('Loaded shared structure · Undo restores your previous drawing', { kind: 'ok', action: { label: 'Undo', run: () => stepHistory(-1) }, duration: 6000 });
  }

  function loadShareHash() {
    const parsed = shareParseHash(window.location.hash);
    if (!parsed) {
      return;
    }
    clearShareHash();
    const fail = (reason) => toast('Could not open the shared link — ' + reason, { kind: 'warn', duration: 4200 });
    if (parsed.kind === 'smiles') {
      if (!parsed.payload) {
        fail('the SMILES is empty or malformed');
        return;
      }
      let fragment = null;
      try {
        fragment = smilesToFragment(parsed.payload);
      } catch (error) {
        fail(error.message);
        return;
      }
      applySharedState(() => {
        graph.clear();
        insertSmilesFragment(fragment, null);
      });
      return;
    }
    shareDecompress(parsed.payload).then((text) => {
      const state = shareDecodeGraph(text);
      if (state.error) {
        fail(state.error);
        return;
      }
      if (!state.atoms.every((a) => Object.prototype.hasOwnProperty.call(MAX_VALENCE, a.element))) {
        fail('the link contains an unknown element');
        return;
      }
      if (state.atoms.length === 0 && state.annotations.length === 0) {
        fail('the link contains an empty drawing');
        return;
      }
      applySharedState(() => loadGraphState(state));
    }, (error) => fail(error.message));
  }

  const notebookOverlay = document.getElementById('notebook-overlay');
  const notebookTitle = document.getElementById('notebook-title');
  const notebookNotes = document.getElementById('notebook-notes');
  const notebookSummary = document.getElementById('notebook-summary');
  const notebookChecks = Array.from(notebookOverlay.querySelectorAll('input[data-section]'));
  const printRoot = document.getElementById('print-root');

  function notebookTargets() {
    const selected = new Set(interactions.selectedAtomIds());
    return graph.connectedComponents()
      .filter((component) => selected.size === 0 || component.atomIds.some((id) => selected.has(id)))
      .map((component) => component.atomIds);
  }

  function structureSvg(ids) {
    const fragment = interactions.extractFragment(ids);
    const temp = new Graph();
    temp.atoms = fragment.atoms.map((a) => Object.assign({}, a));
    temp.bonds = graph.bonds.filter((b) => ids.includes(b.atomA) && ids.includes(b.atomB)).map((b) => Object.assign({}, b));
    temp.annotations = (fragment.annotations || []).map((a) => Object.assign({}, a, a.atomIds ? { atomIds: a.atomIds.slice() } : {}));
    const sizer = new Renderer(new SvgContext(10, 10), temp);
    const bounds = sizer.contentBounds();
    if (!bounds) {
      return '';
    }
    const pad = 30;
    const width = Math.max(120, bounds.maxX - bounds.minX + pad * 2);
    const height = Math.max(80, bounds.maxY - bounds.minY + pad * 2);
    const ctx = new SvgContext(width, height);
    const exporter = new Renderer(ctx, temp);
    exporter.theme = 'light';
    exporter.pixelRatio = 1;
    exporter.showGrid = false;
    exporter.showEmptyHint = false;
    exporter.showNames = false;
    exporter.view = { x: width / 2 - (bounds.minX + bounds.maxX) / 2, y: height / 2 - (bounds.minY + bounds.maxY) / 2, scale: 1 };
    exporter.render();
    return ctx.toSvg().replace(/^<\?xml[^>]*>\s*/, '');
  }

  function buildNotebook() {
    const targets = notebookTargets();
    if (targets.length === 0) {
      toast('Draw a molecule to fill the notebook', { kind: 'warn' });
      return null;
    }
    const sections = {};
    notebookChecks.forEach((input) => {
      sections[input.dataset.section] = input.checked;
    });
    const entries = [];
    const svgs = [];
    targets.forEach((ids) => {
      try {
        entries.push(notebookEntry(graph, ids, { field: 400, sections }));
      } catch (error) {
        return;
      }
      let svg = '';
      try {
        svg = structureSvg(ids);
      } catch (error) {
        svg = '';
      }
      svgs.push(svg);
    });
    if (entries.length === 0) {
      toast('Could not describe these structures', { kind: 'warn' });
      return null;
    }
    const meta = { title: notebookTitle.value.trim(), notes: notebookNotes.value, date: new Date().toISOString().slice(0, 10), appName: NOTEBOOK_APP_NAME };
    return { entries, svgs, meta };
  }

  function notebookFileName() {
    const slug = notebookTitle.value.trim().replace(/[^A-Za-z0-9,()\-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
    return (slug || fileBaseName()) + '-notebook';
  }

  function openNotebook() {
    closeShareMenu();
    const targets = notebookTargets();
    if (targets.length === 0) {
      toast('Draw a molecule to fill the notebook', { kind: 'warn' });
      return;
    }
    const scope = interactions.selectedAtomIds().length ? 'from the selection' : 'on the canvas';
    notebookSummary.textContent = plural(targets.length, 'structure') + ' ' + scope;
    notebookOverlay.hidden = false;
    notebookTitle.focus();
  }

  function closeNotebook() {
    notebookOverlay.hidden = true;
  }

  function downloadNotebook(kind) {
    const book = buildNotebook();
    if (!book) {
      return;
    }
    rememberRecent();
    if (kind === 'md') {
      downloadBlob(new Blob([notebookMarkdown(book.entries, book.meta, book.svgs)], { type: 'text/markdown' }), notebookFileName() + '.md');
      toast('Notebook exported as Markdown', { kind: 'ok' });
    } else {
      downloadBlob(new Blob([notebookHtml(book.entries, book.meta, book.svgs)], { type: 'text/html' }), notebookFileName() + '.html');
      toast('Notebook exported as HTML', { kind: 'ok' });
    }
  }

  function printNotebook() {
    const book = buildNotebook();
    if (!book) {
      return;
    }
    printRoot.innerHTML = '<style>' + NOTEBOOK_CSS + '</style>' + notebookBody(book.entries, book.meta, book.svgs);
    document.body.classList.add('printing');
    window.print();
  }

  window.addEventListener('afterprint', () => {
    document.body.classList.remove('printing');
    printRoot.innerHTML = '';
  });
  document.getElementById('notebook-close').addEventListener('click', closeNotebook);
  document.getElementById('notebook-html').addEventListener('click', () => downloadNotebook('html'));
  document.getElementById('notebook-md').addEventListener('click', () => downloadNotebook('md'));
  document.getElementById('notebook-print').addEventListener('click', printNotebook);
  notebookOverlay.addEventListener('click', (event) => {
    if (event.target === notebookOverlay) {
      closeNotebook();
    }
  });
  window.addEventListener('hashchange', loadShareHash);

  const INSIGHT_SHORTCUTS = {
    KeyL: () => setInsight('electrons', !renderer.insight.electrons, true),
    KeyH: () => setInsight('hybridization', !renderer.insight.hybridization, true),
    KeyO: () => setInsight('oxidation', !renderer.insight.oxidation, true),
    KeyP: () => setInsight('heatmap', !renderer.insight.heatmap, true),
    KeyA: () => setInsight('acidBase', !renderer.insight.acidBase, true),
    KeyS: focusSubstructure,
    KeyR: openResonanceForTarget,
    KeyN: () => spectraView.toggle(),
    KeyU: () => spectraView.startPuzzle(),
    KeyI: openIsomersForTarget,
    KeyB: () => addPolymerBrackets(interactions.selectedAtomIds()),
    KeyD: () => viewer3d.open(),
    KeyT: () => openRetro(null),
    KeyK: copyShareLink,
    KeyJ: openNotebook,
  };

  document.getElementById('theme-button').addEventListener('click', () => {
    applyTheme(renderer.theme === 'dark' ? 'light' : 'dark');
  });

  const helpOverlay = document.getElementById('help-overlay');
  const toggleHelp = (show) => {
    helpOverlay.hidden = show === undefined ? !helpOverlay.hidden : !show;
  };
  document.getElementById('help-button').addEventListener('click', () => toggleHelp(true));
  document.getElementById('help-button-side').addEventListener('click', () => toggleHelp(true));
  document.getElementById('help-close').addEventListener('click', () => toggleHelp(false));
  helpOverlay.addEventListener('click', (event) => {
    if (event.target === helpOverlay) {
      toggleHelp(false);
    }
  });

  const ELEMENT_KEYS = { c: 'C', n: 'N', o: 'O', s: 'S', p: 'P', d: 'D', f: 'F', l: 'Cl', b: 'Br', i: 'I' };
  const RING_KEYS = { 3: 'cyclopropane', 4: 'cyclobutane', 5: 'cyclopentane', 6: 'cyclohexane', 7: 'cycloheptane', 8: 'cyclooctane' };

  function isTyping(target) {
    return target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
  }

  document.addEventListener('keydown', (event) => {
    if (!ptableOverlay.hidden || document.body.dataset.view === 'reactions') {
      return;
    }
    if (!resonanceOverlay.hidden) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeResonance();
      }
      return;
    }
    if (!isomerOverlay.hidden) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeIsomers();
      }
      return;
    }
    if (!notebookOverlay.hidden) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeNotebook();
      }
      return;
    }
    if (viewer3d && viewer3d.isOpen()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        viewer3d.close();
      }
      return;
    }
    if (retroView && retroView.isOpen()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        retroView.close();
      }
      return;
    }
    if (isTyping(event.target) || !importOverlay.hidden) {
      if (!importOverlay.hidden && event.key === 'Escape') {
        closeImport();
      }
      return;
    }
    const key = event.key.toLowerCase();
    if (!contextMenu.hidden) {
      if (event.key === 'Escape') {
        closeContextMenu();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const items = Array.from(contextMenu.querySelectorAll('.cm-item:not(:disabled)'));
        const index = items.indexOf(document.activeElement);
        const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
        items[(next + items.length) % items.length].focus();
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        return;
      }
      closeContextMenu();
    }
    if (event.ctrlKey || event.metaKey) {
      if (key === 'a') {
        event.preventDefault();
        selectAll();
      } else if (key === 'c' && event.shiftKey) {
        event.preventDefault();
        copyAllSmiles();
      } else if (key === 'c') {
        if (String(window.getSelection() || '').trim() && interactions.selection.size === 0 && interactions.annotationSelection.size === 0) {
          return;
        }
        event.preventDefault();
        copyAtoms(interactions.targetAtomIds());
      } else if (key === 'x') {
        event.preventDefault();
        cutAtoms(interactions.targetAtomIds());
      } else if (key === 'v') {
        clearTimeout(pasteFallbackTimer);
        pasteFallbackTimer = setTimeout(() => {
          pasteFallbackTimer = null;
          pasteAt(null);
        }, 80);
      } else if (key === 'd') {
        event.preventDefault();
        duplicateAtoms(interactions.targetAtomIds());
      } else if (key === 'z') {
        event.preventDefault();
        stepHistory(event.shiftKey ? 1 : -1);
      } else if (key === 'y') {
        event.preventDefault();
        stepHistory(1);
      } else if (key === 's') {
        event.preventDefault();
        saveDrawing();
      } else if (key === 'o') {
        event.preventDefault();
        openInput.click();
      }
      return;
    }
    if (event.altKey) {
      const shortcut = INSIGHT_SHORTCUTS[event.code];
      if (shortcut && !event.shiftKey) {
        event.preventDefault();
        shortcut();
      }
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) {
        interactions.setSpaceHeld(true);
      }
      return;
    }
    if (event.key === 'Escape') {
      if (!helpOverlay.hidden) {
        toggleHelp(false);
      } else if (!insightMenu.hidden) {
        closeInsightMenu();
      } else if (!shareMenu.hidden) {
        closeShareMenu();
      } else if (interactions.clearSelection()) {
        return;
      } else if (substructureState.text) {
        clearSubstructure();
      } else if (interactions.selectedStamp) {
        deselectStamp();
      } else if (interactions.tool !== 'draw') {
        setTool('draw');
      } else if (!panel.hidden) {
        closePanel();
      }
      return;
    }
    if (event.key === '?') {
      toggleHelp();
      return;
    }
    if (!helpOverlay.hidden) {
      return;
    }
    if (event.key === '/') {
      event.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (interactions.deleteHovered()) {
        event.preventDefault();
      }
      return;
    }
    if (event.key === '+' || event.key === '=' || event.key === '-' || event.key === '_') {
      const delta = event.key === '+' || event.key === '=' ? 1 : -1;
      const applied = interactions.adjustHoveredCharge(delta);
      if (applied === null) {
        renderer.zoomCentered(delta > 0 ? 1.25 : 0.8);
      } else {
        updateHoverStatus(interactions.hover);
      }
      return;
    }
    if (event.key === '0') {
      renderer.fitToContent();
      return;
    }
    if (event.key === '#') {
      setLocants(!renderer.showLocants);
      return;
    }
    const NUDGE = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (NUDGE[event.key]) {
      const ids = interactions.targetAtomIds();
      if (ids.length || interactions.annotationSelection.size) {
        event.preventDefault();
        const step = event.shiftKey ? 25 : 5;
        interactions.translateAtoms(ids, NUDGE[event.key][0] * step, NUDGE[event.key][1] * step);
      }
      return;
    }
    const ROTATIONS = { '[': -15, ']': 15, '{': -90, '}': 90 };
    if (ROTATIONS[event.key]) {
      requireTarget((ids) => interactions.rotateAtoms(ids, ROTATIONS[event.key]));
      return;
    }
    if (interactions.hoveredBond()) {
      const bondKinds = { 1: 1, 2: 2, 3: 3, w: 'wedge', h: 'hash' };
      if (Object.prototype.hasOwnProperty.call(bondKinds, key)) {
        interactions.setHoveredBond(bondKinds[key]);
        updateHoverStatus(interactions.hover);
        return;
      }
    }
    if (event.shiftKey && event.code === 'Digit6') {
      selectStamp('benzene');
      return;
    }
    if (RING_KEYS[event.key]) {
      selectStamp(RING_KEYS[event.key]);
      return;
    }
    if (key === 'x' || key === 'y') {
      requireTarget((ids) => interactions.flipAtoms(ids, key === 'x' ? 'horizontal' : 'vertical'));
      return;
    }
    if (key === 'v') {
      setTool(interactions.tool === 'select' ? 'draw' : 'select');
      return;
    }
    if (key === 'k') {
      cleanUp(interactions.targetAtomIds().length ? interactions.targetAtomIds() : null);
      return;
    }
    if (key === 'm') {
      setTool(interactions.tool === 'move' ? 'draw' : 'move');
      return;
    }
    if (key === 'e') {
      setTool(interactions.tool === 'erase' ? 'draw' : 'erase');
      return;
    }
    if (key === 'a') {
      setTool(interactions.tool === 'arrow' ? 'draw' : 'arrow');
      return;
    }
    if (key === 'u') {
      setTool(interactions.tool === 'curly' ? 'draw' : 'curly');
      return;
    }
    if (key === 't') {
      setTool(interactions.tool === 'text' ? 'draw' : 'text');
      return;
    }
    if (key === 'g') {
      setTool(interactions.tool === 'plus' ? 'draw' : 'plus');
      return;
    }
    if (key === 'q') {
      event.preventDefault();
      const hovered = interactions.hoveredAtom();
      if (hovered && !hovered.abbr) {
        openPeriodicTable((element) => {
          interactions.setAtomElement(hovered, element);
          updateHoverStatus(interactions.hover);
        }, hovered.element);
      } else {
        openPeriodicTable();
      }
      return;
    }
    if (ELEMENT_KEYS[key]) {
      const applied = interactions.setHoveredElement(ELEMENT_KEYS[key]);
      if (applied === null) {
        selectElement(ELEMENT_KEYS[key]);
      } else {
        updateHoverStatus(interactions.hover);
      }
    }
  });

  document.addEventListener('keyup', (event) => {
    if (event.key === ' ') {
      interactions.setSpaceHeld(false);
    }
  });

  window.addEventListener('blur', () => interactions.setSpaceHeld(false));

  const storedTheme = storageGet('theme');
  renderer.theme = storedTheme === 'light' ? 'light' : 'dark';
  document.body.dataset.theme = renderer.theme;
  paintElementAccents();
  updateCurrentChip();

  interactions.bind();
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  if (document.fonts && document.fonts.load) {
    Promise.all([RENDER_SETTINGS.labelFont, RENDER_SETTINGS.subscriptFont, RENDER_SETTINGS.annotationFont].map((font) => document.fonts.load(font)))
      .then(() => {
        renderer.render();
        document.querySelectorAll('canvas.stamp-thumb').forEach((canvas) => delete canvas.dataset.theme);
        drawStampThumbnails();
      })
      .catch(() => {});
  }
  const startupShare = shareParseHash(window.location.hash);
  if (restoredSession) {
    renderer.fitToContent();
    if (!startupShare) {
      toast('Restored your previous drawing', { action: { label: 'Clear', run: clearCanvas }, duration: 4500 });
    }
  }
  function editorSmilesList() {
    const selected = Array.from(interactions.selection);
    const ids = selected.length ? selected : graph.atoms.map((a) => a.id);
    if (ids.length === 0) {
      return [];
    }
    const parts = fragmentSmiles(interactions.extractFragment(ids)).split('.').filter((x) => x);
    const ions = parts.filter((x) => /[+-]\d*\]/.test(x));
    const neutral = parts.filter((x) => !ions.includes(x));
    return ions.length ? neutral.concat(ions.join('.')) : neutral;
  }

  const viewTabs = Array.from(document.querySelectorAll('.view-tab'));
  const reactionView = document.getElementById('reaction-view');

  function setView(view) {
    const reactions = view === 'reactions';
    document.body.dataset.view = reactions ? 'reactions' : 'editor';
    reactionView.hidden = !reactions;
    viewTabs.forEach((tab) => {
      const on = tab.dataset.view === document.body.dataset.view;
      tab.classList.toggle('selected', on);
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    closeContextMenu();
    storageSet('view', document.body.dataset.view);
    if (reactions) {
      reactionLab.show();
    } else {
      resizeCanvas();
    }
  }

  function placeSchemeBelow(fragment) {
    setView('editor');
    let center = null;
    if (graph.atoms.length || graph.annotations.length) {
      const bounds = renderer.contentBounds();
      const ys = fragment.atoms.map((a) => a.y).concat(0);
      center = { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY + 110 + (Math.max.apply(null, ys) - Math.min.apply(null, ys)) / 2 };
    }
    const ids = insertSmilesFragment(fragment, center);
    renderer.fitToContent();
    return ids;
  }

  function openRetro(ids) {
    closeContextMenu();
    closeInsightMenu();
    retroView.open(ids && ids.length ? ids : null);
  }

  const reactionLab = createReactionLab({
    theme: () => renderer.theme,
    storageGet,
    storageSet,
    editorSmiles: editorSmilesList,
    sendScheme(fragment) {
      const ids = placeSchemeBelow(fragment);
      toast('Reaction scheme added (' + plural(ids.length, 'atom') + ')', { kind: 'ok', duration: 2200 });
    },
  });
  spectraView = createSpectraView({
    graph,
    renderer,
    storageGet,
    storageSet,
    toast,
    copyText,
    downloadBlob,
    insertSmiles: (fragment) => insertSmilesFragment(fragment, null),
    targetAtomIds: () => {
      const component = largestComponent();
      return component ? component.atomIds : null;
    },
    onLayout: resizeCanvas,
  });
  document.getElementById('spectra-button').addEventListener('click', () => spectraView.toggle());
  viewer3d = createViewer3d({
    graph,
    renderer,
    storageGet,
    storageSet,
    toast,
    downloadBlob,
    targetAtomIds: () => {
      const selected = interactions.selectedAtomIds().find((id) => graph.getAtom(id));
      const component = selected !== undefined
        ? graph.connectedComponents().find((c) => c.atomIds.includes(selected))
        : largestComponent();
      return component ? component.atomIds : [];
    },
    hoveredBondId: () => (interactions.hover && interactions.hover.type === 'bond' ? interactions.hover.id : null),
  });
  document.getElementById('viewer-button').addEventListener('click', () => viewer3d.open());
  retroView = createRetroView({
    graph,
    toast,
    structureThumbnail,
    targetAtomIds: () => {
      const selected = interactions.selectedAtomIds().find((id) => graph.getAtom(id));
      const component = selected !== undefined
        ? graph.connectedComponents().find((c) => c.atomIds.includes(selected))
        : largestComponent();
      return component ? component.atomIds : [];
    },
    sendScheme(fragment, steps) {
      placeSchemeBelow(fragment);
      toast('Route added to the canvas (' + plural(steps, 'step') + ')', { kind: 'ok', duration: 2200 });
    },
    openInLab(compounds, conditions) {
      reactionLab.state.compounds = [];
      reactionLab.state.conditions = normalizeReactionConditions(JSON.parse(JSON.stringify(conditions)));
      compounds.forEach((c) => {
        const added = reactionLab.addSmiles(c.smiles, c.role);
        if (added && c.label) {
          added.label = c.label;
        }
      });
      setView('reactions');
    },
  });
  document.getElementById('retro-button').addEventListener('click', () => openRetro(null));
  viewTabs.forEach((tab) => tab.addEventListener('click', () => setView(tab.dataset.view)));
  if (storageGet('view') === 'reactions') {
    setView('reactions');
  } else {
    document.body.dataset.view = 'editor';
  }

  syncHistoryButtons();
  if (startupShare) {
    loadShareHash();
  }
})();
