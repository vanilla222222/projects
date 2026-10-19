'use strict';

const META_DEPTH = 2;
const META_FRAGMENT_FLOOR = 5;
const META_MAX_NODES = 120;
const META_PHASES = ['I', 'II'];

const META_KEY_ROUNDS = 4;

function metaboliteInvariant(mol, atom) {
  return [atom.element, atom.aromatic ? 1 : 0, atom.charge || 0, atom.totalH,
    atom.neighbors.length, atom.rings.length ? 1 : 0, atom.isotope || 0].join('|');
}

function metaboliteShells(mol) {
  let codes = mol.atoms.map((atom) => hash32(metaboliteInvariant(mol, atom)));
  const layers = [codes.slice()];
  for (let round = 1; round <= META_KEY_ROUNDS; round += 1) {
    const next = codes.slice();
    mol.atoms.forEach((atom, index) => {
      const pairs = atom.neighbors.map((link) => {
        const bond = mol.bonds[link.bond];
        return (bond.aromatic ? 4 : bond.order) + ':' + codes[link.atom];
      });
      pairs.sort();
      next[index] = hash32(round + '|' + codes[index] + '|' + pairs.join('|'));
    });
    codes = next;
    layers.push(codes.slice());
  }
  return layers;
}

function metaboliteKey(mol, d) {
  const parts = metaboliteShells(mol).map((layer) => layer.slice().sort((a, b) => a - b).join(','));
  return (d && d.formula ? d.formula : mol.atoms.length) + '|' + parts.join('/');
}

function metaboliteRecord(smiles) {
  const mol = buildMolecule(parseSmiles(smiles));
  const d = describe(mol);
  return { smiles: smiles, mol: mol, d: d, v: evaluate(d) };
}

function metaboliteFragments(result) {
  const pieces = [];
  result.fragments.forEach((smiles) => {
    let record = null;
    try { record = metaboliteRecord(smiles); } catch (error) { return; }
    pieces.push(record);
  });
  if (!pieces.length) return { kept: [], released: [] };
  const kept = pieces.filter((piece) => piece.mol.atoms.length >= META_FRAGMENT_FLOOR);
  if (!kept.length) {
    let best = pieces[0];
    pieces.forEach((piece) => { if (piece.mol.atoms.length > best.mol.atoms.length) best = piece; });
    return { kept: [best], released: pieces.filter((piece) => piece !== best) };
  }
  return { kept: kept, released: pieces.filter((piece) => kept.indexOf(piece) === -1) };
}

function metabolicNotes(mol) {
  const found = [];
  METABOLIC_NOTES.forEach((entry) => {
    const matches = smartsMatches(compileSmarts(entry.smarts), mol, {});
    if (!matches.length) return;
    const atoms = [];
    matches.forEach((match) => match.forEach((index) => {
      if (atoms.indexOf(index) === -1) atoms.push(index);
    }));
    atoms.sort((a, b) => a - b);
    found.push({ name: entry.name, enzyme: entry.enzyme, note: entry.note, count: matches.length, atoms: atoms });
  });
  return found;
}

function metaboliteTox(record) {
  if (!record.tox) record.tox = toxScan(record);
  return record.tox;
}

function newToxHits(node, root) {
  const before = new Set();
  metaboliteTox(root).rows.forEach((row) => { if (row.count > 0) before.add(row.name); });
  return metaboliteTox(node).rows.filter((row) => row.count > 0 && !row.context && !before.has(row.name));
}

function metabolicTree(record, options) {
  const settings = options || {};
  const depth = settings.depth || META_DEPTH;
  const phases = settings.phases || META_PHASES;
  const rules = METABOLISM.filter((rule) => phases.indexOf(rule.phase) !== -1);

  const root = {
    id: 0,
    parent: null,
    depth: 0,
    name: record.name || 'parent',
    smiles: record.smiles,
    mol: record.mol,
    d: record.d,
    v: record.v,
    rule: null,
    enzyme: null,
    route: null,
    phase: null,
    weight: 1,
    score: 1,
    touched: [],
    released: [],
    children: [],
    steps: []
  };

  const nodes = [root];
  const byKey = new Map();
  byKey.set(metaboliteKey(record.mol, record.d), root);
  let truncated = false;

  let frontier = [root];
  for (let level = 1; level <= depth; level += 1) {
    const next = [];
    frontier.forEach((parent) => {
      rules.forEach((rule) => {
        let results = [];
        try { results = applyTransform(parent.mol, rule.smirks); } catch (error) { results = []; }
        results.forEach((result) => {
          const split = metaboliteFragments(result);
          split.kept.forEach((piece) => {
            if (nodes.length >= META_MAX_NODES) { truncated = true; return; }
            const key = metaboliteKey(piece.mol, piece.d);
            const seen = byKey.get(key);
            const site = typeof siteScore === 'function'
                  ? siteScore(parent.mol, rule, result.touched || [])
                  : { factor: 1, reasons: [], atom: null };
            const siteWeight = rule.weight * site.factor;
            const step = {
              rule: rule.name,
              enzyme: rule.enzyme,
              route: rule.route,
              phase: rule.phase,
              weight: siteWeight,
              ruleWeight: rule.weight,
              siteFactor: site.factor,
              siteReasons: site.reasons,
              siteAtom: site.atom,
              note: rule.note,
              from: parent.id
            };
            if (seen) {
              if (seen !== parent && seen.steps.every((item) => item.rule !== rule.name || item.from !== parent.id)) {
                seen.steps.push(step);
                const reached = parent.score * siteWeight;
                if (reached > seen.score) {
                  seen.score = reached;
                  seen.weight = siteWeight;
                  seen.siteFactor = site.factor;
                  seen.siteReasons = site.reasons;
                  seen.siteAtom = site.atom;
                }
              }
              return;
            }
            const node = {
              id: nodes.length,
              parent: parent.id,
              depth: level,
              name: rule.name,
              smiles: piece.smiles,
              mol: piece.mol,
              d: piece.d,
              v: piece.v,
              rule: rule.name,
              enzyme: rule.enzyme,
              route: rule.route,
              phase: rule.phase,
              weight: siteWeight,
              ruleWeight: rule.weight,
              siteFactor: site.factor,
              siteReasons: site.reasons,
              siteAtom: site.atom,
              score: parent.score * siteWeight,
              touched: result.touched || [],
              released: split.released.map((piece2) => piece2.smiles),
              children: [],
              steps: [step]
            };
            byKey.set(key, node);
            nodes.push(node);
            parent.children.push(node.id);
            next.push(node);
          });
        });
      });
    });
    frontier = next;
    if (!frontier.length) break;
  }

  const metabolites = nodes.slice(1);
  metabolites.forEach((node) => {
    node.newTox = newToxHits(node, root);
    node.toxHits = metaboliteTox(node).hits;
  });
  metabolites.sort((a, b) => b.score - a.score || a.depth - b.depth);

  const enzymes = new Map();
  metabolites.forEach((node) => {
    if (!enzymes.has(node.enzyme)) enzymes.set(node.enzyme, { enzyme: node.enzyme, count: 0, weight: 0 });
    const row = enzymes.get(node.enzyme);
    row.count += 1;
    row.weight += node.score;
  });
  const routes = [...enzymes.values()].sort((a, b) => b.weight - a.weight);

  return {
    root: root,
    nodes: nodes,
    metabolites: metabolites,
    routes: routes,
    notes: metabolicNotes(record.mol),
    depth: depth,
    phaseI: metabolites.filter((node) => node.phase === 'I').length,
    phaseII: metabolites.filter((node) => node.phase === 'II').length,
    rulesTried: rules.length,
    truncated: truncated
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    META_DEPTH, META_FRAGMENT_FLOOR, META_MAX_NODES,
    META_KEY_ROUNDS, metaboliteKey, metaboliteShells, metaboliteRecord, metaboliteFragments, metabolicNotes, metabolicTree, newToxHits
  };
}
