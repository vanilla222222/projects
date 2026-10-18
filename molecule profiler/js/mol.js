'use strict';

const DEFAULT_VALENCES = {
  H: [1], B: [3], C: [4], N: [3, 5], O: [2], F: [1],
  Si: [4], P: [3, 5], S: [2, 4, 6], Cl: [1, 3, 5, 7],
  As: [3, 5], Se: [2, 4, 6], Br: [1, 3, 5, 7], Te: [2, 4, 6], I: [1, 3, 5, 7],
  Li: [1], Na: [1], K: [1], Rb: [1], Cs: [1],
  Be: [2], Mg: [2], Ca: [2], Sr: [2], Ba: [2],
  Al: [3], Ga: [3], In: [3], Sn: [4], Pb: [4], Bi: [3], Sb: [3, 5]
};

const GROUP_15_16 = new Set(['N', 'P', 'As', 'O', 'S', 'Se', 'Te']);

const ATOMIC_WEIGHT = {
  H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011,
  N: 14.007, O: 15.999, F: 18.998, Ne: 20.18, Na: 22.99, Mg: 24.305,
  Al: 26.982, Si: 28.085, P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948,
  K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996,
  Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38,
  Ga: 69.723, Ge: 72.63, As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798,
  Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.224, Nb: 92.906, Mo: 95.95,
  Tc: 98, Ru: 101.07, Rh: 102.91, Pd: 106.42, Ag: 107.87, Cd: 112.41,
  In: 114.82, Sn: 118.71, Sb: 121.76, Te: 127.6, I: 126.904, Xe: 131.29,
  Cs: 132.91, Ba: 137.33, La: 138.91, Pt: 195.08, Au: 196.97, Hg: 200.59,
  Tl: 204.38, Pb: 207.2, Bi: 208.98, U: 238.03
};

const MONOISOTOPIC_WEIGHT = {
  H: 1.0078250319, He: 4.0026032, Li: 7.0160045, Be: 9.0121822, B: 11.0093055,
  C: 12.0, N: 14.0030740052, O: 15.9949146221, F: 18.99840322, Ne: 19.9924401759,
  Na: 22.98976967, Mg: 23.9850419, Al: 26.98153844, Si: 27.9769265327,
  P: 30.97376151, S: 31.97207069, Cl: 34.96885271, Ar: 39.962383123,
  K: 38.9637069, Ca: 39.9625912, Fe: 55.9349421, Cu: 62.9296011, Zn: 63.9291466,
  As: 74.9215964, Se: 79.9165218, Br: 78.9183376, Rb: 84.9117893, Sn: 119.9021947,
  I: 126.904468, Cs: 132.905447, Pt: 194.9647911, Au: 196.9665687, Hg: 201.970626
};

const ELECTRONEGATIVE = new Set(['N', 'O', 'F', 'S', 'P', 'Cl', 'Br', 'I', 'Se', 'As', 'B', 'Si', 'Te']);

function buildMolecule(parsed) {
  const atoms = parsed.atoms.map((atom) => Object.assign({}, atom, {
    neighbors: [],
    implicitH: 0,
    totalH: 0,
    rings: [],
    ringCount: 0,
    degree: 0
  }));
  const bonds = parsed.bonds.map((bond) => Object.assign({}, bond, { ring: false }));

  bonds.forEach((bond, bondIndex) => {
    atoms[bond.a].neighbors.push({ atom: bond.b, bond: bondIndex });
    atoms[bond.b].neighbors.push({ atom: bond.a, bond: bondIndex });
  });
  atoms.forEach((atom) => { atom.degree = atom.neighbors.length; });

  const mol = { atoms, bonds, smiles: parsed.smiles, rings: [] };

  perceiveRings(mol);
  perceiveAromaticity(mol);
  kekulize(mol);
  assignHydrogens(mol);
  indexRingSystems(mol);
  return mol;
}

function bondKey(a, b) {
  return a < b ? a + ':' + b : b + ':' + a;
}

function findBond(mol, a, b) {
  return mol.bonds.find((bond) => (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a));
}

function perceiveRings(mol) {
  const n = mol.atoms.length;
  const seen = new Array(n).fill(false);
  let components = 0;
  for (let start = 0; start < n; start += 1) {
    if (seen[start]) continue;
    components += 1;
    const queue = [start];
    seen[start] = true;
    while (queue.length) {
      const current = queue.shift();
      mol.atoms[current].neighbors.forEach((link) => {
        if (!seen[link.atom]) { seen[link.atom] = true; queue.push(link.atom); }
      });
    }
  }
  mol.components = components;
  mol.cyclomatic = mol.bonds.length - n + components;

  if (mol.cyclomatic <= 0) { mol.rings = []; return; }

  const candidates = [];
  const signatures = new Set();
  mol.bonds.forEach((bond, bondIndex) => {
    const cycle = shortestCycleThrough(mol, bondIndex);
    if (!cycle) return;
    const signature = cycle.slice().sort((a, b) => a - b).join(',');
    if (signatures.has(signature)) return;
    signatures.add(signature);
    candidates.push(cycle);
  });

  candidates.sort((a, b) => a.length - b.length);

  const chosen = [];
  const covered = new Set();
  candidates.forEach((cycle) => {
    if (chosen.length >= mol.cyclomatic) return;
    const keys = cycleBondKeys(cycle);
    if (keys.some((key) => !covered.has(key))) {
      chosen.push(cycle);
      keys.forEach((key) => covered.add(key));
    }
  });

  mol.rings = chosen;
  chosen.forEach((ring, ringIndex) => {
    ring.forEach((id) => {
      mol.atoms[id].rings.push(ringIndex);
      mol.atoms[id].ringCount += 1;
    });
    cycleBondKeys(ring).forEach((key) => {
      const [a, b] = key.split(':').map(Number);
      const bond = findBond(mol, a, b);
      if (bond) bond.ring = true;
    });
  });
}

function cycleBondKeys(cycle) {
  const keys = [];
  for (let k = 0; k < cycle.length; k += 1) keys.push(bondKey(cycle[k], cycle[(k + 1) % cycle.length]));
  return keys;
}

function shortestCycleThrough(mol, bondIndex) {
  const bond = mol.bonds[bondIndex];
  const start = bond.a;
  const goal = bond.b;
  const previous = new Map([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    for (const link of mol.atoms[current].neighbors) {
      if (link.bond === bondIndex) continue;
      if (previous.has(link.atom)) continue;
      previous.set(link.atom, current);
      if (link.atom === goal) {
        const path = [];
        let node = goal;
        while (node !== null) { path.push(node); node = previous.get(node); }
        return path;
      }
      queue.push(link.atom);
    }
  }
  return null;
}

function perceiveAromaticity(mol) {
  const flagged = mol.atoms.map((atom) => atom.aromatic);
  mol.atoms.forEach((atom) => { atom.aromatic = false; });

  mol.rings.forEach((ring) => {
    if (ring.length < 5 || ring.length > 7) return;
    if (ring.every((id) => flagged[id])) { ring.aromatic = true; return; }
    const electrons = huckelElectrons(mol, ring, flagged);
    if (electrons !== null && (electrons - 2) % 4 === 0) ring.aromatic = true;
  });

  mol.rings.forEach((ring) => {
    if (!ring.aromatic) return;
    ring.forEach((id) => { mol.atoms[id].aromatic = true; });
    cycleBondKeys(ring).forEach((key) => {
      const [a, b] = key.split(':').map(Number);
      const target = findBond(mol, a, b);
      if (target) target.aromatic = true;
    });
  });
}

function huckelElectrons(mol, ring, flagged) {
  const inRing = new Set(ring);
  let total = 0;
  for (let k = 0; k < ring.length; k += 1) {
    const atom = mol.atoms[ring[k]];
    const element = atom.element;
    const doubleInRing = atom.neighbors.filter((link) => {
      const bond = mol.bonds[link.bond];
      return bond.order === 2 && inRing.has(link.atom);
    }).length;
    const doubleOutside = atom.neighbors.filter((link) => {
      const bond = mol.bonds[link.bond];
      return bond.order === 2 && !inRing.has(link.atom);
    });

    if (doubleInRing >= 1) { total += 1; continue; }
    if (doubleOutside.length) {
      const partner = mol.atoms[doubleOutside[0].atom];
      if (element === 'C' && ELECTRONEGATIVE.has(partner.element)) continue;
      return null;
    }
    if (element === 'N' || element === 'P') {
      if (atom.charge === 1 && atom.degree === 4) return null;
      total += 2;
      continue;
    }
    if (element === 'O' || element === 'S' || element === 'Se') { total += 2; continue; }
    if (element === 'C' && atom.charge === -1) { total += 2; continue; }
    if (element === 'C' && atom.charge === 1) continue;
    if (element === 'B') continue;
    if (element === 'C' && flagged && flagged[atom.index]) { total += 1; continue; }
    return null;
  }
  return total;
}

function kekulize(mol) {
  const aromaticBonds = [];
  mol.bonds.forEach((bond, bondIndex) => {
    if (bond.aromatic && bond.order === 1) aromaticBonds.push(bondIndex);
  });
  if (!aromaticBonds.length) return;

  const involved = new Set();
  aromaticBonds.forEach((bondIndex) => {
    involved.add(mol.bonds[bondIndex].a);
    involved.add(mol.bonds[bondIndex].b);
  });

  const needsPi = new Set();
  involved.forEach((id) => { if (atomNeedsPiBond(mol, id)) needsPi.add(id); });

  const adjacency = new Map();
  involved.forEach((id) => adjacency.set(id, []));
  aromaticBonds.forEach((bondIndex) => {
    const bond = mol.bonds[bondIndex];
    if (!needsPi.has(bond.a) || !needsPi.has(bond.b)) return;
    adjacency.get(bond.a).push({ atom: bond.b, bond: bondIndex });
    adjacency.get(bond.b).push({ atom: bond.a, bond: bondIndex });
  });

  const matched = new Map();
  const order = [...needsPi].sort((a, b) => adjacency.get(a).length - adjacency.get(b).length);
  if (matchPi(order, 0, adjacency, matched)) {
    matched.forEach((bondIndex, id) => {
      if (mol.bonds[bondIndex].a === id) mol.bonds[bondIndex].order = 2;
    });
    matched.forEach((bondIndex) => { mol.bonds[bondIndex].order = 2; });
    mol.kekulized = true;
  } else {
    mol.kekulized = false;
  }
}

function atomNeedsPiBond(mol, id) {
  const atom = mol.atoms[id];
  const hasDouble = atom.neighbors.some((link) => mol.bonds[link.bond].order === 2);
  if (hasDouble) return false;

  const element = atom.element;
  const charge = atom.charge || 0;
  const explicitH = atom.explicitH || 0;
  const heavyDegree = atom.degree;

  if (element === 'C') return charge === 0;
  if (element === 'N' || element === 'P') {
    if (charge === 1) return heavyDegree === 2 || (heavyDegree === 3 && explicitH === 0 && !atom.bracket);
    if (charge === -1) return false;
    if (explicitH > 0) return false;
    return heavyDegree === 2;
  }
  if (element === 'O' || element === 'S' || element === 'Se' || element === 'Te') {
    return charge === 1 && heavyDegree === 2;
  }
  if (element === 'B') return false;
  return false;
}

function matchPi(order, position, adjacency, matched) {
  while (position < order.length && matched.has(order[position])) position += 1;
  if (position >= order.length) return true;
  const id = order[position];
  const options = adjacency.get(id) || [];
  for (const option of options) {
    if (matched.has(option.atom)) continue;
    matched.set(id, option.bond);
    matched.set(option.atom, option.bond);
    if (matchPi(order, position + 1, adjacency, matched)) return true;
    matched.delete(id);
    matched.delete(option.atom);
  }
  return false;
}

function valenceUsed(mol, atom) {
  return atom.neighbors.reduce((sum, link) => sum + mol.bonds[link.bond].order, 0);
}

function assignHydrogens(mol) {
  mol.atoms.forEach((atom) => {
    if (atom.explicitH !== null) {
      atom.implicitH = 0;
      atom.totalH = atom.explicitH;
    } else {
      atom.implicitH = implicitHydrogens(mol, atom);
      atom.totalH = atom.implicitH;
    }
    atom.valence = valenceUsed(mol, atom) + atom.totalH;
  });
}

function implicitHydrogens(mol, atom) {
  const base = DEFAULT_VALENCES[atom.element];
  if (!base) return 0;
  const charge = atom.charge || 0;
  const used = valenceUsed(mol, atom);

  let allowed;
  if (GROUP_15_16.has(atom.element)) allowed = base.map((value) => value + charge);
  else allowed = base.map((value) => value - Math.abs(charge));

  allowed = allowed.filter((value) => value >= 0);
  if (!allowed.length) return 0;

  let target = allowed[allowed.length - 1];
  for (let k = 0; k < allowed.length; k += 1) {
    if (allowed[k] >= used) { target = allowed[k]; break; }
  }
  return Math.max(0, Math.round(target - used));
}

function indexRingSystems(mol) {
  const systems = [];
  const assigned = new Map();
  mol.rings.forEach((ring, ringIndex) => {
    const touching = [];
    ring.forEach((id) => {
      mol.atoms[id].rings.forEach((other) => {
        if (other !== ringIndex && assigned.has(other)) touching.push(assigned.get(other));
      });
    });
    const unique = [...new Set(touching)];
    if (!unique.length) {
      const id = systems.length;
      systems.push([ringIndex]);
      assigned.set(ringIndex, id);
      return;
    }
    const keep = unique[0];
    systems[keep].push(ringIndex);
    assigned.set(ringIndex, keep);
    unique.slice(1).forEach((merge) => {
      systems[merge].forEach((index) => { assigned.set(index, keep); systems[keep].push(index); });
      systems[merge] = [];
    });
  });
  mol.ringSystems = systems.filter((system) => system.length);

  mol.atoms.forEach((atom) => {
    atom.fusedAromatic = atom.rings.filter((index) => mol.rings[index].aromatic).length > 1;
  });
}

function molecularFormula(mol) {
  const counts = {};
  let hydrogens = 0;
  let charge = 0;
  mol.atoms.forEach((atom) => {
    counts[atom.element] = (counts[atom.element] || 0) + 1;
    hydrogens += atom.totalH;
    charge += atom.charge || 0;
  });
  if (hydrogens) counts.H = (counts.H || 0) + hydrogens;

  const order = [];
  if (counts.C) order.push(['C', counts.C]);
  if (counts.H) order.push(['H', counts.H]);
  Object.keys(counts)
    .filter((key) => key !== 'C' && key !== 'H')
    .sort()
    .forEach((key) => order.push([key, counts[key]]));

  let formula = order.map(([el, count]) => el + (count > 1 ? count : '')).join('');
  if (charge > 0) formula += charge > 1 ? '+' + charge : '+';
  else if (charge < 0) formula += charge < -1 ? '-' + Math.abs(charge) : '-';
  return formula;
}

function molecularWeight(mol) {
  let total = 0;
  mol.atoms.forEach((atom) => {
    total += (ATOMIC_WEIGHT[atom.element] || 0) + atom.totalH * ATOMIC_WEIGHT.H;
  });
  return total;
}

function exactMass(mol) {
  let total = 0;
  mol.atoms.forEach((atom) => {
    total += (MONOISOTOPIC_WEIGHT[atom.element] || ATOMIC_WEIGHT[atom.element] || 0)
      + atom.totalH * MONOISOTOPIC_WEIGHT.H;
  });
  return total;
}

function moleculeFromSmiles(text) {
  return buildMolecule(parseSmiles(text));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildMolecule,
    moleculeFromSmiles,
    molecularFormula,
    molecularWeight,
    exactMass,
    valenceUsed,
    findBond,
    ATOMIC_WEIGHT,
    ELECTRONEGATIVE
  };
}
