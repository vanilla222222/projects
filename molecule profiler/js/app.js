'use strict';

const GLOSSARY = {
  name: ['Name', 'The label you typed before the SMILES, or a generated one. It is only used to identify rows and tabs.'],
  smiles: ['SMILES', 'The structure you entered, as written. Everything on this page is derived from it: the parser builds an atom and bond graph, finds rings, decides aromaticity, kekulizes and then counts hydrogens from a valence model.'],
  formula: ['Molecular formula', 'Element counts in Hill order, with hydrogens added by the valence model rather than taken from the SMILES text.'],
  mw: ['Molecular weight', 'Average mass in g/mol, summed from standard atomic weights including the implicit hydrogens.'],
  exactMass: ['Monoisotopic mass', 'Mass using the most abundant isotope of each element. This is the number a mass spectrometer compares against, and it differs from the average molecular weight.'],
  heavyAtoms: ['Heavy atoms', 'Every atom except hydrogen. Several filters are written in terms of this count rather than molecular weight.'],
  carbons: ['Carbon atoms', 'Total carbons, aromatic and aliphatic. Muegge’s filter rejects fragments with four or fewer.'],
  heteroatoms: ['Heteroatoms', 'Non-carbon, non-hydrogen atoms. A molecule with at most one is usually too greasy to be a drug candidate, which is why Muegge’s filter asks for more than one.'],
  charge: ['Formal charge', 'Sum of the formal charges written in the SMILES. It decides which branch of the bioavailability score applies, since anions behave differently.'],
  rings: ['Rings', 'Size of the smallest set of smallest rings: the number of independent cycles in the graph, which equals bonds minus atoms plus connected components.'],
  aromaticRings: ['Aromatic rings', 'Rings whose atoms were either written lowercase or satisfy a Hückel π-electron count of 4n+2.'],
  aromaticAtoms: ['Aromatic atoms', 'Atoms belonging to at least one aromatic ring after perception.'],
  rotatableBonds: ['Rotatable bonds', 'Single, acyclic bonds between two non-terminal heavy atoms, using the strict definition: triple-bond neighbours, CF₃, CCl₃, CBr₃ and tert-butyl groups are excluded, and so are amide and amidine-like bonds, whose rotation is hindered by conjugation.'],
  hbd: ['H-bond donors', 'Lipinski’s count: every hydrogen attached to a nitrogen or oxygen. It overcounts in the chemical sense but it is what the rule of five was calibrated on.'],
  hba: ['H-bond acceptors', 'Lipinski’s count: every nitrogen and oxygen atom, whether or not it can really accept a hydrogen bond.'],
  hbdStrict: ['Donors (strict)', 'Only nitrogens and oxygens carrying a hydrogen that are plausible donors, skipping amide nitrogens and similar. Shown for comparison; the filters use the Lipinski count.'],
  hbaStrict: ['Acceptors (strict)', 'Only nitrogens and oxygens with an available lone pair, skipping amide nitrogens, pyrrole-type nitrogens and nitro oxygens. Shown for comparison.'],
  tpsa: ['TPSA', 'Topological polar surface area in Å², by Ertl’s method: each nitrogen and oxygen contributes a value from a fitted table keyed on its bonding, and the contributions are summed. It tracks membrane permeability well; above roughly 140 Å² oral absorption tends to drop.'],
  fractionCsp3: ['Fraction Csp³', 'Share of carbons that are saturated. A low value means a flat, mostly aromatic molecule, which correlates with poorer solubility and more promiscuous binding.'],
  mr: ['Molar refractivity', 'Wildman–Crippen molar refractivity, a size-and-polarisability measure in cm³/mol. Ghose’s filter wants it between 40 and 130.'],
  logp: ['WLOGP', 'Octanol/water partition coefficient by the Wildman–Crippen atom-contribution method: every heavy atom and hydrogen is assigned one of 68 types and their contributions are summed. Higher means greasier.'],
  logS: ['Log S (ESOL)', 'Predicted decadic logarithm of aqueous solubility in mol/L, using Delaney’s ESOL equation from log P, molecular weight, rotatable bonds and the aromatic atom fraction. It is a linear fit, so treat it as an estimate, not a measurement.'],
  solubility: ['Solubility class', 'A plain-language band for the predicted log S, from insoluble below −10 up to highly soluble above 0.'],
  crippenTypes: ['Atom types', 'How many distinct Wildman–Crippen atom types the molecule contains. The table below lists them.'],
  abs: ['Bioavailability score', 'Martin’s probability that a compound exceeds 10% oral bioavailability in rat. Anions are scored from polar surface area alone (0.85, 0.56 or 0.11); everything else scores 0.55 if it passes the rule of five and 0.17 if it does not.'],
  lead: ['Lead-likeness', 'Whether the molecule is small and simple enough to be a starting point rather than a finished drug: molecular weight 250–350, log P at most 3.5 and at most 7 rotatable bonds.'],
  Lipinski: ['Lipinski rule of five', 'Pfizer’s oral-bioavailability filter: molecular weight at most 500, log P at most 5, at most 5 H-bond donors and at most 10 acceptors. One violation is tolerated.'],
  Ghose: ['Ghose filter', 'A drug-likeness window from a comparison of drug and non-drug databases: molecular weight 160–480, log P −0.4 to 5.6, molar refractivity 40–130 and 20–70 heavy atoms.'],
  Veber: ['Veber rules', 'From a GSK study of rat oral bioavailability: at most 10 rotatable bonds and TPSA at most 140 Å². Flexibility and polarity, not weight, were the properties that mattered.'],
  Egan: ['Egan egg', 'Pharmacia’s absorption model, which keeps log P at or below 5.88 and TPSA at or below 131.6 Å².'],
  Muegge: ['Muegge filter', 'Bayer’s pharmacophore-point filter, the strictest of the five: weight 200–600, log P −2 to 5, TPSA at most 150 Å², at most 7 rings, more than 4 carbons, more than 1 heteroatom, at most 15 rotatable bonds, at most 10 acceptors and at most 5 donors.'],
  hia: ['Passive absorption', 'Whether the molecule falls inside the outer region of the TPSA-against-log P plot, which the BOILED-Egg model associates with passive gastrointestinal absorption.'],
  bbb: ['Brain penetration', 'Whether the molecule falls inside the inner region of the same plot, associated with crossing the blood–brain barrier. Being outside it is desirable for a drug that should stay out of the brain.'],
  LIPO: ['LIPO', 'Lipophilicity as WLOGP. The favourable band is −0.7 to 5.0.'],
  SIZE: ['SIZE', 'Molecular weight. The favourable band is 150 to 500 g/mol.'],
  POLAR: ['POLAR', 'Topological polar surface area. The favourable band is 20 to 130 Å².'],
  INSOLU: ['INSOLU', 'Predicted log S. The favourable band is −6 to 0; further left means less soluble.'],
  INSATU: ['INSATU', 'Fraction of saturated carbons. At least 0.25 is favourable; a lower value means an unusually flat molecule.'],
  FLEX: ['FLEX', 'Rotatable bonds. Up to 9 is favourable.'],
  atomIndex: ['Atom', 'Position of the atom in the parsed structure, counting from one in the order it appears in the SMILES.'],
  atomElement: ['Element', 'Chemical element, with a lowercase marker if the atom ended up aromatic.'],
  atomH: ['H', 'Hydrogens on the atom: those written explicitly in brackets plus those added by the valence model.'],
  atomType: ['Type', 'Which of the 68 Wildman–Crippen atom types the atom matched. The rules are tried in a fixed order and the first match wins.'],
  atomLogp: ['Δ log P', 'The atom type’s contribution to WLOGP, including its hydrogens.'],
  atomMr: ['Δ MR', 'The atom type’s contribution to molar refractivity, including its hydrogens.']
};

const EXAMPLES = [
  ['aspirin', 'CC(=O)Oc1ccccc1C(=O)O'],
  ['caffeine', 'Cn1cnc2c1c(=O)n(C)c(=O)n2C'],
  ['ibuprofen', 'CC(C)Cc1ccc(cc1)C(C)C(=O)O'],
  ['paracetamol', 'CC(=O)Nc1ccc(O)cc1'],
  ['morphine', 'CN1CCC23c4c5ccc(O)c4OC2C(O)C=CC3C1C5'],
  ['atorvastatin', 'CC(C)c1c(C(=O)Nc2ccccc2)c(-c2ccccc2)c(-c2ccc(F)cc2)n1CCC(O)CC(O)CC(=O)O'],
  ['metformin', 'CN(C)C(=N)N=C(N)N'],
  ['ciprofloxacin', 'OC(=O)c1cn(C2CC2)c2cc(N3CCNCC3)c(F)cc2c1=O'],
  ['sucrose', 'OCC1OC(OC2(CO)OC(CO)C(O)C2O)C(O)C(O)C1O'],
  ['diazepam', 'CN1c2ccc(Cl)cc2C(=Nc2ccccc2)CC1=O']
];

const BATCH_COLUMNS = [
  ['name', 'Name', (d) => d.name],
  ['formula', 'Formula', (d) => d.formula],
  ['mw', 'MW', (d) => d.mw.toFixed(2)],
  ['logp', 'WLOGP', (d) => d.logp.toFixed(2)],
  ['tpsa', 'TPSA', (d) => d.tpsa.toFixed(1)],
  ['logS', 'Log S', (d) => d.logS.toFixed(2)],
  ['hbd', 'HBD', (d) => d.hbd],
  ['hba', 'HBA', (d) => d.hba],
  ['rotatableBonds', 'RotB', (d) => d.rotatableBonds],
  ['rings', 'Rings', (d) => d.rings],
  ['fractionCsp3', 'Csp3', (d) => d.fractionCsp3.toFixed(2)],
  ['abs', 'ABS', (d) => d.abs.toFixed(2)],
  ['Lipinski', 'Filters', (d) => d.passed + '/' + d.total]
];

const tip = document.createElement('div');
tip.id = 'tip';
tip.hidden = true;
document.body.appendChild(tip);

let records = [];
let current = 0;

function infoButton(key) {
  if (!GLOSSARY[key]) return '';
  return '<button type="button" class="info" data-tip="' + key + '" aria-label="About this value" tabindex="0">i</button>';
}

function showTip(target) {
  const entry = GLOSSARY[target.dataset.tip];
  if (!entry) return;
  tip.innerHTML = '<strong></strong><span></span>';
  tip.querySelector('strong').textContent = entry[0];
  tip.querySelector('span').textContent = entry[1];
  tip.hidden = false;
  const box = target.getBoundingClientRect();
  const size = tip.getBoundingClientRect();
  let left = box.left + box.width / 2 - size.width / 2;
  left = Math.max(10, Math.min(left, window.innerWidth - size.width - 10));
  let top = box.bottom + 9;
  if (top + size.height > window.innerHeight - 10) top = box.top - size.height - 9;
  tip.style.left = left + 'px';
  tip.style.top = Math.max(10, top) + 'px';
}

function hideTip() {
  tip.hidden = true;
}

document.addEventListener('pointerover', (event) => {
  const target = event.target.closest('.info');
  if (target) showTip(target);
  else if (!event.target.closest('#tip')) hideTip();
});
document.addEventListener('focusin', (event) => {
  const target = event.target.closest('.info');
  if (target) showTip(target);
});
document.addEventListener('focusout', hideTip);
window.addEventListener('scroll', hideTip, true);

function rows(target, entries) {
  target.innerHTML = entries.map(([key, label, value]) => (
    '<dt>' + label + infoButton(key) + '</dt><dd>' + value + '</dd>'
  )).join('');
}

function splitLine(line) {
  const comma = line.indexOf(',');
  const tab = line.indexOf('\t');
  let cut = -1;
  if (tab >= 0) cut = tab;
  else if (comma >= 0) cut = comma;
  else {
    const space = line.search(/\s/);
    if (space >= 0) cut = space;
  }
  if (cut < 0) return { name: null, smiles: line.trim() };
  const head = line.slice(0, cut).trim();
  const tail = line.slice(cut + 1).trim();
  if (!tail) return { name: null, smiles: head };
  if (/^[A-Za-z0-9@+\-\[\]()=#$%./\\]+$/.test(head) && head.length > tail.length) {
    return { name: tail, smiles: head };
  }
  return { name: head, smiles: tail };
}

function analyse() {
  const text = document.getElementById('smiles-input').value;
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const status = document.getElementById('status');
  records = [];
  const problems = [];

  lines.forEach((line, index) => {
    const parsed = splitLine(line);
    try {
      const mol = buildMolecule(parseSmiles(parsed.smiles));
      const d = describe(mol);
      const verdicts = evaluate(d);
      records.push({
        name: parsed.name || ('molecule ' + (index + 1)),
        smiles: parsed.smiles,
        mol,
        d,
        v: verdicts
      });
    } catch (error) {
      problems.push(parsed.smiles + ': ' + error.message);
    }
  });

  status.classList.toggle('error', problems.length > 0);
  if (problems.length) status.textContent = problems.join(' | ');
  else status.textContent = records.length ? records.length + ' parsed' : '';

  document.getElementById('export').disabled = records.length === 0;
  document.getElementById('results').hidden = records.length === 0;
  if (!records.length) return;
  current = 0;
  renderTabs();
  renderBatch();
  renderCurrent();
}

function renderTabs() {
  const nav = document.getElementById('molecule-tabs');
  nav.hidden = records.length < 2;
  nav.innerHTML = records.map((record, index) => (
    '<button type="button" role="tab" data-index="' + index + '" aria-selected="'
      + (index === current) + '">' + escapeHtml(record.name) + '</button>'
  )).join('');
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function renderCurrent() {
  const record = records[current];
  if (!record) return;
  const d = record.d;
  const v = record.v;

  rows(document.getElementById('identity'), [
    ['name', 'Name', escapeHtml(record.name)],
    ['smiles', 'SMILES', escapeHtml(record.smiles)],
    ['formula', 'Formula', d.formula],
    ['mw', 'Molecular weight', d.mw.toFixed(2) + ' g/mol'],
    ['exactMass', 'Monoisotopic mass', d.exactMass.toFixed(4)],
    ['heavyAtoms', 'Heavy atoms', d.heavyAtoms],
    ['carbons', 'Carbons', d.carbons],
    ['heteroatoms', 'Heteroatoms', d.heteroatoms],
    ['charge', 'Formal charge', d.charge > 0 ? '+' + d.charge : d.charge]
  ]);

  rows(document.getElementById('physchem'), [
    ['rings', 'Rings', d.rings],
    ['aromaticRings', 'Aromatic rings', d.aromaticRings],
    ['aromaticAtoms', 'Aromatic atoms', d.aromaticAtoms],
    ['rotatableBonds', 'Rotatable bonds', d.rotatableBonds],
    ['hbd', 'H-bond donors', d.hbd],
    ['hba', 'H-bond acceptors', d.hba],
    ['hbdStrict', 'Donors (strict)', d.hbdStrict],
    ['hbaStrict', 'Acceptors (strict)', d.hbaStrict],
    ['tpsa', 'TPSA', d.tpsa.toFixed(2) + ' Å²'],
    ['fractionCsp3', 'Fraction Csp³', d.fractionCsp3.toFixed(2)]
  ]);

  rows(document.getElementById('lipo'), [
    ['logp', 'WLOGP', d.logp.toFixed(2)],
    ['mr', 'Molar refractivity', d.mr.toFixed(2)],
    ['logS', 'Log S (ESOL)', v.logS.toFixed(2)],
    ['solubility', 'Solubility class', v.solubility],
    ['crippenTypes', 'Distinct atom types', new Set(d.crippenTypes.map((entry) => entry.type)).size]
  ]);

  const filters = document.getElementById('filters');
  filters.innerHTML = v.filters.map((filter) => (
    '<div class="filter ' + (filter.pass ? 'pass' : 'fail') + '">'
      + '<div class="name">' + filter.name + infoButton(filter.name) + '</div>'
      + '<div class="verdict">' + (filter.pass ? 'PASS' : 'FAIL') + '</div>'
      + '<div class="why">' + (filter.fails.length ? escapeHtml(filter.fails.join('; ')) : 'no violation') + '</div>'
      + '</div>'
  )).join('');
  document.getElementById('filter-summary').textContent = v.passed + ' of ' + v.total + ' filters passed';

  rows(document.getElementById('druglike-extra'), [
    ['abs', 'Bioavailability score', v.bioavailability.score.toFixed(2) + ' — ' + v.bioavailability.reason],
    ['lead', 'Lead-likeness', v.lead.pass ? 'pass' : escapeHtml(v.lead.fails.join('; '))],
    ['hia', 'Passive absorption', v.egg.hia ? 'likely' : 'unlikely'],
    ['bbb', 'Brain penetration', v.egg.bbb ? 'likely' : 'unlikely']
  ]);

  drawRadar(v.radar);
  drawEgg(d);
  renderAtoms(record);

  document.querySelectorAll('#molecule-tabs button').forEach((button) => {
    button.setAttribute('aria-selected', String(Number(button.dataset.index) === current));
  });
  document.querySelectorAll('#batch tbody tr').forEach((tr, index) => {
    tr.classList.toggle('active', index === current);
  });
}

function drawRadar(axes) {
  const svg = document.getElementById('radar');
  const cx = 160;
  const cy = 148;
  const radius = 104;
  const step = (Math.PI * 2) / axes.length;
  const at = (index, fraction) => {
    const angle = -Math.PI / 2 + index * step;
    return [cx + Math.cos(angle) * radius * fraction, cy + Math.sin(angle) * radius * fraction];
  };
  const polygon = (points) => points.map((point) => point.join(',')).join(' ');

  let out = '';
  for (let ring = 1; ring <= 4; ring += 1) {
    out += '<polygon class="axis-line" fill="none" points="'
      + polygon(axes.map((_, index) => at(index, ring / 4))) + '"/>';
  }
  out += '<polygon class="band" points="'
    + polygon(axes.map((axis, index) => at(index, axis.highFraction))) + '"/>';
  out += '<polygon class="band" fill="var(--bg-raise)" points="'
    + polygon(axes.map((axis, index) => at(index, axis.lowFraction))) + '"/>';
  axes.forEach((axis, index) => {
    const edge = at(index, 1);
    out += '<line class="axis-line" x1="' + cx + '" y1="' + cy + '" x2="' + edge[0] + '" y2="' + edge[1] + '"/>';
  });
  out += '<polygon class="shape" points="'
    + polygon(axes.map((axis, index) => at(index, axis.fraction))) + '"/>';
  axes.forEach((axis, index) => {
    const label = at(index, 1.21);
    const anchor = Math.abs(label[0] - cx) < 6 ? 'middle' : (label[0] > cx ? 'start' : 'end');
    out += '<text class="axis-label" x="' + label[0] + '" y="' + (label[1] + 4)
      + '" text-anchor="' + anchor + '">' + axis.label + '</text>';
    const value = at(index, 1.21);
    out += '<text class="tick-label" x="' + value[0] + '" y="' + (value[1] + 16)
      + '" text-anchor="' + anchor + '">' + formatAxis(axis) + '</text>';
  });
  svg.innerHTML = out;

  const keys = document.getElementById('radar-keys');
  keys.innerHTML = axes.map((axis) => (
    '<span class="key">' + axis.label + infoButton(axis.label) + '</span>'
  )).join('');
}

function formatAxis(axis) {
  if (axis.key === 'size') return axis.value.toFixed(0);
  if (axis.key === 'flex') return String(axis.value);
  return axis.value.toFixed(2);
}

function drawEgg(d) {
  const svg = document.getElementById('egg');
  const left = 46;
  const right = 320;
  const top = 18;
  const bottom = 258;
  const xMin = 0;
  const xMax = 200;
  const yMin = -4;
  const yMax = 8;
  const px = (tpsa) => left + (Math.max(xMin, Math.min(xMax, tpsa)) - xMin) / (xMax - xMin) * (right - left);
  const py = (logp) => bottom - (Math.max(yMin, Math.min(yMax, logp)) - yMin) / (yMax - yMin) * (bottom - top);

  let out = '';
  for (let tick = xMin; tick <= xMax; tick += 50) {
    out += '<line class="axis-line" x1="' + px(tick) + '" y1="' + top + '" x2="' + px(tick) + '" y2="' + bottom + '" opacity="0.5"/>';
    out += '<text class="tick-label" x="' + px(tick) + '" y="' + (bottom + 14) + '" text-anchor="middle">' + tick + '</text>';
  }
  for (let tick = yMin; tick <= yMax; tick += 2) {
    out += '<line class="axis-line" x1="' + left + '" y1="' + py(tick) + '" x2="' + right + '" y2="' + py(tick) + '" opacity="0.5"/>';
    out += '<text class="tick-label" x="' + (left - 8) + '" y="' + (py(tick) + 3.5) + '" text-anchor="end">' + tick + '</text>';
  }
  const ellipse = (shape, cls) => '<ellipse class="' + cls + '" cx="' + px(shape.x) + '" cy="' + py(shape.y)
    + '" rx="' + (px(shape.rx) - px(0)) + '" ry="' + (py(0) - py(shape.ry)) + '"/>';
  out += ellipse(EGG_WHITE, 'egg-white');
  out += ellipse(EGG_YOLK, 'egg-yolk');
  out += '<circle class="point" cx="' + px(d.tpsa) + '" cy="' + py(d.logp) + '" r="5"/>';
  out += '<text class="axis-label" x="' + ((left + right) / 2) + '" y="' + (bottom + 32) + '" text-anchor="middle">TPSA (Å²)</text>';
  out += '<text class="axis-label" x="14" y="' + ((top + bottom) / 2) + '" text-anchor="middle" transform="rotate(-90 14 '
    + ((top + bottom) / 2) + ')">WLOGP</text>';
  svg.innerHTML = out;
}

function renderAtoms(record) {
  const table = document.getElementById('atoms');
  const columns = [
    ['atomIndex', '#'], ['atomElement', 'Element'], ['atomH', 'H'],
    ['atomType', 'Type'], ['atomLogp', 'Δ log P'], ['atomMr', 'Δ MR']
  ];
  table.querySelector('thead').innerHTML = '<tr>' + columns.map(([key, label]) => (
    '<th>' + label + infoButton(key) + '</th>'
  )).join('') + '</tr>';
  table.querySelector('tbody').innerHTML = record.d.crippenTypes.map((entry) => {
    const atom = record.mol.atoms[entry.atom];
    const symbol = atom.aromatic ? atom.element.toLowerCase() : atom.element;
    return '<tr><td>' + (entry.atom + 1) + '</td><td>' + symbol + '</td><td>' + atom.totalH
      + '</td><td>' + entry.type + '</td><td>' + entry.logp.toFixed(4)
      + '</td><td>' + entry.mr.toFixed(3) + '</td></tr>';
  }).join('');
}

function batchRow(record) {
  return {
    name: record.name,
    formula: record.d.formula,
    mw: record.d.mw,
    logp: record.d.logp,
    tpsa: record.d.tpsa,
    logS: record.v.logS,
    hbd: record.d.hbd,
    hba: record.d.hba,
    rotatableBonds: record.d.rotatableBonds,
    rings: record.d.rings,
    fractionCsp3: record.d.fractionCsp3,
    abs: record.v.bioavailability.score,
    passed: record.v.passed,
    total: record.v.total
  };
}

function renderBatch() {
  const table = document.getElementById('batch');
  table.querySelector('thead').innerHTML = '<tr>' + BATCH_COLUMNS.map(([key, label]) => (
    '<th>' + label + infoButton(key) + '</th>'
  )).join('') + '</tr>';
  table.querySelector('tbody').innerHTML = records.map((record, index) => {
    const row = batchRow(record);
    return '<tr data-index="' + index + '">' + BATCH_COLUMNS.map(([, , get]) => (
      '<td>' + escapeHtml(get(row)) + '</td>'
    )).join('') + '</tr>';
  }).join('');
}

function exportCsv() {
  const header = ['name', 'smiles'].concat(BATCH_COLUMNS.map(([key]) => key));
  const lines = [header.join(',')];
  records.forEach((record) => {
    const row = batchRow(record);
    const cells = [record.name, record.smiles].concat(BATCH_COLUMNS.map(([, , get]) => String(get(row))));
    lines.push(cells.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'molecule-profile.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function setupExamples() {
  const host = document.getElementById('examples');
  host.innerHTML = EXAMPLES.map(([name], index) => (
    '<button type="button" class="chip" data-example="' + index + '">' + name + '</button>'
  )).join('') + '<button type="button" class="chip" data-example="all">load all ten</button>';
  host.addEventListener('click', (event) => {
    const button = event.target.closest('[data-example]');
    if (!button) return;
    const input = document.getElementById('smiles-input');
    if (button.dataset.example === 'all') {
      input.value = EXAMPLES.map(([name, smiles]) => name + ', ' + smiles).join('\n');
    } else {
      const pair = EXAMPLES[Number(button.dataset.example)];
      input.value = pair[0] + ', ' + pair[1];
    }
    analyse();
  });
}

function setupTheme() {
  const saved = localStorage.getItem('molecule-profiler-theme');
  if (saved) document.body.dataset.theme = saved;
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = next;
    try { localStorage.setItem('molecule-profiler-theme', next); } catch (error) { /* private mode */ }
    if (records.length) renderCurrent();
  });
}

document.getElementById('run').addEventListener('click', analyse);
document.getElementById('clear').addEventListener('click', () => {
  document.getElementById('smiles-input').value = '';
  document.getElementById('results').hidden = true;
  document.getElementById('status').textContent = '';
  document.getElementById('export').disabled = true;
  records = [];
});
document.getElementById('export').addEventListener('click', exportCsv);
document.getElementById('smiles-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) analyse();
});
document.getElementById('molecule-tabs').addEventListener('click', (event) => {
  const button = event.target.closest('[data-index]');
  if (!button) return;
  current = Number(button.dataset.index);
  renderCurrent();
});
document.getElementById('batch').addEventListener('click', (event) => {
  const row = event.target.closest('tr[data-index]');
  if (!row) return;
  current = Number(row.dataset.index);
  renderCurrent();
  document.getElementById('identity').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

setupExamples();
setupTheme();
document.getElementById('smiles-input').value = 'aspirin, CC(=O)Oc1ccccc1C(=O)O';
analyse();
