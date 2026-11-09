'use strict';
// Close relatives of a molecule, and whether you could make them.
//
// The question behind this mode is a medicinal chemist's, not a synthetic
// one's: "something like this, that I can actually get to". So it is two
// halves - propose neighbours in structure space, then put each through the
// route search and throw away the ones that cannot be reached. An analogue
// nobody can make is a picture, not a suggestion.
//
// The edits are deliberately the small ones a real series is built from.
// Nothing here invents a scaffold: it swaps what hangs off one, which is what
// `vary` controls.

const AN = (typeof require === 'function' && typeof module !== 'undefined')
  ? { smiles: require('./smiles.js'), search: require('./search.js'), groups: require('./groups.js') }
  : (typeof RETRO !== 'undefined'
    ? { smiles: RETRO.smiles, search: RETRO.search, groups: RETRO.groups } : null);

// What can replace a hydrogen on an aromatic ring. The classic first pass of
// a structure-activity series.
const AROMATIC_SUBSTITUENTS = [
  { label: 'fluoro', build: (mol, at) => bond(mol, at, 'F') },
  { label: 'chloro', build: (mol, at) => bond(mol, at, 'Cl') },
  { label: 'bromo', build: (mol, at) => bond(mol, at, 'Br') },
  { label: 'methyl', build: (mol, at) => bond(mol, at, 'C') },
  { label: 'methoxy', build: (mol, at) => { const o = bond(mol, at, 'O'); bond(mol, o, 'C'); return o; } },
  { label: 'trifluoromethyl', build: (mol, at) => {
    const c = bond(mol, at, 'C');
    bond(mol, c, 'F'); bond(mol, c, 'F'); bond(mol, c, 'F');
    return c;
  } },
  { label: 'nitrile', build: (mol, at) => { const c = bond(mol, at, 'C'); bond(mol, c, 'N', 3); return c; } },
  { label: 'hydroxy', build: (mol, at) => bond(mol, at, 'O') },
  { label: 'amino', build: (mol, at) => bond(mol, at, 'N') },
];

// Swaps that leave the shape alone and change the electronics.
const ATOM_SWAPS = [
  ['F', 'Cl'], ['Cl', 'F'], ['Cl', 'Br'], ['Br', 'Cl'], ['Br', 'I'],
  ['O', 'S'], ['S', 'O'],
];

function bond(mol, from, element, order) {
  const atom = mol.addAtom(element, {});
  mol.addBond(from, atom.index, order || 1);
  return atom.index;
}

function proposals(mol, vary) {
  const out = [];
  const seen = new Set();
  const add = (copy, how) => {
    let smiles;
    try { smiles = AN.smiles.canonicalWrite(copy); } catch (err) { void err; return; }
    if (!smiles || seen.has(smiles)) return;
    seen.add(smiles);
    out.push({ smiles, change: how });
  };

  // 1. Hang something new on an aromatic CH.
  if (vary === 'substituents' || vary === 'any' || vary === 'rings') {
    for (let i = 0; i < mol.atoms.length; i += 1) {
      const atom = mol.atoms[i];
      if (!atom.arom || atom.el !== 'C' || mol.hydrogens(i) < 1) continue;
      for (const substituent of AROMATIC_SUBSTITUENTS) {
        const copy = mol.clone();
        substituent.build(copy, i);
        add(copy, 'added ' + substituent.label);
      }
    }
  }

  // 2. Take a small substituent off again, which is as much a part of a
  //    series as adding one.
  if (vary === 'substituents' || vary === 'any') {
    for (let i = 0; i < mol.atoms.length; i += 1) {
      if (mol.degree(i) !== 1) continue;
      const anchor = mol.adjacency[i][0];
      if (!mol.atoms[anchor.other].arom) continue;
      const keep = mol.atoms.map((_, k) => k).filter((k) => k !== i);
      add(mol.subgraph(keep), 'removed a ' + mol.atoms[i].el);
    }
  }

  // 3. Swap one atom for a near neighbour in the periodic table.
  if (vary === 'substituents' || vary === 'rings' || vary === 'any') {
    for (let i = 0; i < mol.atoms.length; i += 1) {
      for (const [from, to] of ATOM_SWAPS) {
        if (mol.atoms[i].el !== from) continue;
        if (mol.atoms[i].arom && !['O', 'S', 'N'].includes(to)) continue;
        const copy = mol.clone();
        copy.atoms[i].el = to;
        add(copy, from + ' to ' + to);
      }
    }
  }

  // 4. Grow or shrink a saturated chain by one carbon - the homologue.
  if (vary === 'any' || vary === 'scaffold') {
    for (let i = 0; i < mol.atoms.length; i += 1) {
      const atom = mol.atoms[i];
      if (atom.el !== 'C' || atom.arom || mol.degree(i) !== 1) continue;
      const copy = mol.clone();
      bond(copy, i, 'C');
      add(copy, 'one carbon longer');
    }
  }

  return out;
}

function analogues(target, settings, engine) {
  const want = AN.smiles.canonical(target);
  const mol = AN.smiles.parse(want);
  const reference = AN.search.fingerprint(mol);

  const scored = [];
  for (const candidate of proposals(mol, settings.analogueVary)) {
    if (candidate.smiles === want) continue;
    let score;
    try {
      score = AN.search.similarity(reference,
        AN.search.fingerprint(AN.smiles.parse(candidate.smiles)));
    } catch (err) { void err; continue; }
    if (score < settings.analogueSimilarity) continue;
    scored.push({ ...candidate, similarity: Number(score.toFixed(3)) });
  }
  scored.sort((a, b) => b.similarity - a.similarity);

  const out = [];
  let checked = 0;
  for (const candidate of scored) {
    if (out.length >= settings.analogueCount) break;
    if (!settings.analogueRoutable) { out.push(candidate); continue; }
    // Only the ones a route can actually reach. This is the expensive half,
    // so it runs on a short budget per analogue rather than the full one.
    checked += 1;
    const found = engine.route(candidate.smiles);
    if (!found.ok) continue;
    out.push({ ...candidate, route: found.routes[0] });
  }

  return {
    ok: out.length > 0,
    mode: 'analogues',
    target: want,
    proposed: scored.length,
    routeChecked: checked,
    analogues: out,
    reason: out.length ? 'found' : 'nothing close enough survived',
  };
}

const EXPORTS_analogues = { analogues, proposals };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_analogues;
} else if (typeof RETRO !== 'undefined') {
  RETRO.analogues = EXPORTS_analogues;
}
