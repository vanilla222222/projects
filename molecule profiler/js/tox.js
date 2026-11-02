'use strict';

const TOX_ENDPOINTS = ['Genotoxicity', 'Carcinogenicity', 'Neurotoxicity', 'Cardiotoxicity'];

const BASIC_AMINE = '[$([NX3;!$(N[!#6;!#1]);!$(NC=[O,N,S]);!$(Nc);!$(N=*);!$(N#*)]),$([NX4+;!$(N[!#6;!#1])])]';

function aromaticRingSystems(mol) {
  const rings = [];
  mol.rings.forEach((ring, index) => { if (ring.aromatic) rings.push(index); });
  const parent = rings.map((_, index) => index);
  const find = (index) => {
    let root = index;
    while (parent[root] !== root) root = parent[root];
    return root;
  };
  for (let i = 0; i < rings.length; i += 1) {
    for (let j = i + 1; j < rings.length; j += 1) {
      const shared = mol.rings[rings[i]].some((id) => mol.rings[rings[j]].indexOf(id) !== -1);
      if (!shared) continue;
      const a = find(i);
      const b = find(j);
      if (a !== b) parent[a] = b;
    }
  }
  const groups = new Map();
  rings.forEach((_, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(rings[index]);
  });
  const found = [];
  groups.forEach((group) => {
    const atoms = [];
    group.forEach((index) => mol.rings[index].forEach((id) => {
      if (atoms.indexOf(id) === -1) atoms.push(id);
    }));
    atoms.sort((a, b) => a - b);
    found.push({
      rings: group.length,
      atoms: atoms,
      carbonOnly: atoms.every((id) => mol.atoms[id].element === 'C')
    });
  });
  return found.sort((a, b) => b.rings - a.rings);
}

function computedToxRules(mol, d, v) {
  const rules = [];

  const systems = aromaticRingSystems(mol);
  const pah = systems.filter((system) => system.rings >= 3 && system.carbonOnly);
  rules.push({
    name: 'Polycyclic aromatic hydrocarbon',
    endpoint: 'Carcinogenicity',
    source: 'Benigni-Bossa',
    ref: 'benigniBossa',
    pattern: 'fused aromatic system, 3+ rings, carbon only',
    count: pah.length,
    atoms: pah.length ? pah[0].atoms : [],
    note: 'Benigni-Bossa SA6, and an Ames toxicophore in its own right: three or more fused all-carbon aromatic rings are epoxidised to bay-region diol epoxides that alkylate guanine. Ring fusion cannot be written as a substructure query, so this one is counted from the ring perception instead of matched.'
  });

  const heteroFused = systems.filter((system) => system.rings >= 3 && !system.carbonOnly);
  rules.push({
    name: 'Fused polycyclic heteroaromatic',
    endpoint: 'Carcinogenicity',
    source: 'Computed',
    ref: 'computed',
    pattern: 'fused aromatic system, 3+ rings, with heteroatoms',
    count: heteroFused.length,
    atoms: heteroFused.length ? heteroFused[0].atoms : [],
    note: 'The same geometry with a ring nitrogen or oxygen: planar, intercalating and often metabolically activated, but far weaker evidence than for the hydrocarbons, and shared by many purine-derived drugs.'
  });

  const amines = smartsMatches(compileSmarts(BASIC_AMINE), mol, {});
  const herg = amines.length > 0 && d.logp >= 3.7 && d.mw >= 250;
  rules.push({
    name: 'hERG rule of thumb',
    endpoint: 'Cardiotoxicity',
    source: 'hERG heuristic',
    ref: 'herg',
    pattern: 'basic amine and WLOGP >= 3.7 and MW >= 250',
    count: herg ? 1 : 0,
    atoms: herg ? amines.map((match) => match[0]).sort((a, b) => a - b) : [],
    note: 'A protonatable amine on a lipophilic scaffold is the pharmacophore of the hERG potassium channel blockers, and QT prolongation is the commonest reason a late-stage candidate is dropped. A crude three-term rule, not a model.'
  });

  rules.push({
    name: 'Predicted CNS exposure',
    endpoint: 'Neurotoxicity',
    source: 'Computed',
    ref: 'computed',
    pattern: 'BOILED-Egg yolk region (WLOGP and TPSA)',
    context: true,
    count: v.egg.bbb ? 1 : 0,
    atoms: [],
    note: 'Not a toxicity. It is the precondition for one: a compound that does not reach the brain cannot be directly neurotoxic there, so the other neurotoxicity flags only matter alongside this one.'
  });

  return rules;
}

function toxScan(record) {
  const patterns = TOXALERTS.map((alert) => {
    const matches = smartsMatches(compileSmarts(alert.smarts), record.mol, {});
    const atoms = [];
    matches.forEach((match) => match.forEach((index) => {
      if (atoms.indexOf(index) === -1) atoms.push(index);
    }));
    atoms.sort((a, b) => a - b);
    return {
      name: alert.name,
      endpoint: alert.endpoint,
      source: alert.source,
      ref: alert.ref,
      cite: alert.cite,
      pattern: alert.smarts,
      smarts: true,
      count: matches.length,
      atoms: atoms,
      note: alert.note
    };
  });
  const computed = computedToxRules(record.mol, record.d, record.v);
  const rows = patterns.concat(computed);
  const byEndpoint = TOX_ENDPOINTS.map((endpoint) => ({
    endpoint: endpoint,
    hits: rows.filter((row) => row.endpoint === endpoint && row.count > 0 && !row.context),
    context: rows.filter((row) => row.endpoint === endpoint && row.context),
    total: rows.filter((row) => row.endpoint === endpoint && !row.context).length
  }));
  return {
    rows: rows,
    byEndpoint: byEndpoint,
    hits: rows.filter((row) => row.count > 0 && !row.context),
    scored: rows.filter((row) => !row.context).length
  };
}

const DEPENDENCE_BANDS = [
  [0.85, 'close analogue of a dependence-liability drug'],
  [0.65, 'shares a scaffold with a dependence-liability drug'],
  [0.45, 'distant structural resemblance only'],
  [0, 'no close relative in the labelled set']
];

function dependenceProfile(record, methodKey, score) {
  const query = fingerprint(record.mol, methodKey);
  const needed = new Set(DEPENDENCE.map((drug) => drug.name));
  TARGETS.forEach((target) => {
    if (REWARD_TARGETS.indexOf(target.gene) !== -1) target.ligands.forEach((name) => needed.add(name));
  });
  const byName = new Map();
  SIMILARITY_REFERENCE_POOL.forEach((entry) => {
    if (!needed.has(entry.name)) return;
    const fp = fingerprint(buildMolecule(parseSmiles(entry.smiles)), methodKey);
    byName.set(entry.name, { entry: entry, fp: fp });
  });

  const neighbours = [];
  DEPENDENCE.forEach((drug) => {
    const item = byName.get(drug.name);
    if (!item) return;
    neighbours.push({ drug: drug, entry: item.entry, value: score(query, item.fp) });
  });
  neighbours.sort((a, b) => b.value - a.value);

  const liable = neighbours.filter((row) => row.drug.liability === 'high' || row.drug.liability === 'moderate');
  const best = liable.length ? liable[0] : null;
  const top = best ? best.value : 0;
  const band = DEPENDENCE_BANDS.find(([floor]) => top >= floor)[1];

  const rewards = [];
  TARGETS.forEach((target) => {
    if (REWARD_TARGETS.indexOf(target.gene) === -1) return;
    const scored = [];
    target.ligands.forEach((name) => {
      const item = byName.get(name);
      if (!item) return;
      scored.push({ value: score(query, item.fp), entry: item.entry });
    });
    if (!scored.length) return;
    scored.sort((a, b) => b.value - a.value);
    rewards.push({ target: target, value: scored[0].value, nearest: scored[0].entry });
  });
  rewards.sort((a, b) => b.value - a.value);

  return { neighbours: neighbours, best: best, top: top, band: band, rewards: rewards };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TOX_ENDPOINTS, BASIC_AMINE, aromaticRingSystems, computedToxRules, toxScan, dependenceProfile };
}
