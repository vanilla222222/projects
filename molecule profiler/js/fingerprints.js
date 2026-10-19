'use strict';

const FP_METHODS = [
  { key: 'ecfp4', label: 'ECFP4', kind: 'morgan', radius: 2, features: false,
    blurb: 'Circular atom environments out to two bonds, by element and connectivity.' },
  { key: 'ecfp6', label: 'ECFP6', kind: 'morgan', radius: 3, features: false,
    blurb: 'Circular atom environments out to three bonds, so larger fragments must match.' },
  { key: 'fcfp4', label: 'FCFP4', kind: 'morgan', radius: 2, features: true,
    blurb: 'Circular environments described by pharmacophore role rather than element.' },
  { key: 'ecfp4s', label: 'ECFP4 (stereo)', kind: 'morgan', radius: 2, features: false, chirality: true,
    blurb: 'ECFP4 with the perceived R/S and E/Z configuration folded into the atom and bond codes, so enantiomers no longer look identical.' },
  { key: 'pairs', label: 'Atom pairs', kind: 'pairs', radius: 0, features: false,
    blurb: 'Every pair of atoms, typed and keyed by the bond distance between them.' }
];

function hash32(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function bondCode(bond) {
  if (bond.aromatic) return 4;
  return bond.order;
}

function stereoCodes(mol) {
  const atoms = mol.atoms.map(() => '');
  const bonds = mol.bonds.map(() => '');
  if (typeof stereoAnalyse !== 'function') return { atoms, bonds };
  const analysis = stereoAnalyse(mol);
  analysis.centers.forEach((item) => {
    if (item.label) atoms[item.atom] = item.label;
    else if (item.specified) atoms[item.atom] = '?';
  });
  analysis.bonds.forEach((item) => {
    if (item.label === undefined || item.label === null) return;
    const link = mol.atoms[item.a].neighbors.find((entry) => entry.atom === item.b);
    if (link) bonds[link.bond] = item.label;
  });
  return { atoms, bonds };
}

function piElectrons(mol, atom) {
  if (atom.aromatic) return 1;
  let count = 0;
  atom.neighbors.forEach((link) => {
    const bond = mol.bonds[link.bond];
    if (bond.order > 1) count += bond.order - 1;
  });
  return count;
}

const HALOGENS = ['F', 'Cl', 'Br', 'I'];

function links(mol, atom) {
  return atom.neighbors.map((link) => ({ atom: mol.atoms[link.atom], bond: mol.bonds[link.bond] }));
}

function hasDoubleTo(mol, atom, elements) {
  return links(mol, atom).some((link) => (
    !link.bond.aromatic && link.bond.order === 2 && elements.includes(link.atom.element)
  ));
}

function nextToCarbonylCentre(mol, atom) {
  return links(mol, atom).some((link) => (
    !link.bond.aromatic && link.bond.order === 1
    && hasDoubleTo(mol, link.atom, ['O', 'N', 'P', 'S'])
  ));
}

function isDonor(mol, atom) {
  if (atom.element === 'N') {
    if (atom.aromatic) return atom.totalH === 1 && atom.charge === 0;
    if (atom.totalH === 0) return false;
    return atom.valence === 3 || (atom.valence === 4 && atom.charge === 1);
  }
  if (atom.element !== 'O' && atom.element !== 'S') return false;
  if (atom.aromatic) return false;
  return atom.totalH === 1 && atom.charge === 0;
}

function isAcceptor(mol, atom) {
  const chalcogen = atom.element === 'O' || atom.element === 'S';

  if (chalcogen && !atom.aromatic) {
    if (atom.charge < 0) return true;
    if (atom.valence === 2 && atom.totalH === 0) return true;
    if (atom.valence === 2 && atom.totalH === 1) return !nextToCarbonylCentre(mol, atom);
    return false;
  }

  if (chalcogen && atom.aromatic) {
    if (atom.charge !== 0) return false;
    const ringNeighbours = links(mol, atom).filter((link) => link.bond.aromatic);
    if (ringNeighbours.some((link) => link.atom.aromatic && link.atom.element === 'N')) return false;
    return !ringNeighbours.some((link) => (
      link.atom.aromatic && link.atom.element === 'C'
      && links(mol, link.atom).some((inner) => (
        inner.bond.aromatic && inner.atom.aromatic && inner.atom.element === 'N'
      ))
    ));
  }

  if (atom.element !== 'N') return false;
  if (atom.aromatic) return atom.totalH === 0 && atom.charge === 0;
  return atom.valence === 3 && !nextToCarbonylCentre(mol, atom);
}

function plainCarbonNeighbours(mol, atom, allowAromatic) {
  return links(mol, atom).filter((link) => {
    const other = link.atom;
    const carbonLike = allowAromatic ? (other.element === 'C' || other.aromatic) : (other.element === 'C' && !other.aromatic);
    if (!carbonLike) return false;
    return !hasDoubleTo(mol, other, ['O']);
  }).length;
}

function isBasic(mol, atom) {
  if (atom.element !== 'N') return false;
  if (atom.charge === 1) return true;
  if (atom.charge !== 0 || atom.aromatic) return false;
  if (atom.totalH === 2) return plainCarbonNeighbours(mol, atom, true) >= 1;
  if (atom.totalH === 1) return plainCarbonNeighbours(mol, atom, true) >= 2;
  if (atom.totalH === 0) return plainCarbonNeighbours(mol, atom, false) >= 3;
  return false;
}

function isAcidic(mol, atom) {
  if (atom.aromatic) return false;
  if (atom.element !== 'C' && atom.element !== 'S') return false;
  if (!hasDoubleTo(mol, atom, ['O', 'S', 'P'])) return false;
  return links(mol, atom).some((link) => (
    !link.bond.aromatic && link.bond.order === 1 && link.atom.element === 'O'
    && (link.atom.totalH === 1 || link.atom.charge === -1)
  ));
}

const FEATURES = [
  ['donor', isDonor],
  ['acceptor', isAcceptor],
  ['aromatic', (mol, atom) => atom.aromatic],
  ['halogen', (mol, atom) => HALOGENS.includes(atom.element)],
  ['basic', isBasic],
  ['acidic', isAcidic]
];

function featureBits(mol, atom) {
  let bits = 0;
  FEATURES.forEach((entry, index) => {
    if (entry[1](mol, atom)) bits |= (1 << index);
  });
  return bits;
}

function featureInvariant(mol, atom) {
  return 'F' + featureBits(mol, atom);
}

function elementInvariant(mol, atom) {
  return [
    'E', atom.element, atom.degree, atom.totalH, atom.charge,
    atom.rings.length ? 1 : 0
  ].join('|');
}

function morganFingerprint(mol, radius, features, chirality) {
  const describe = features ? featureInvariant : elementInvariant;
  const stereo = chirality ? stereoCodes(mol) : null;
  let invariants = mol.atoms.map((atom, index) => hash32(describe(mol, atom)
    + (stereo ? '/' + stereo.atoms[index] : '')));
  const counts = new Map();
  const bump = (code) => counts.set(code, (counts.get(code) || 0) + 1);

  invariants.forEach(bump);

  let shells = mol.atoms.map(() => new Set());
  const dead = mol.atoms.map((atom) => atom.neighbors.length === 0);
  const seen = new Set();

  for (let round = 1; round <= radius; round += 1) {
    const nextInvariants = invariants.slice();
    const nextShells = shells.map((set) => set);
    const pending = [];

    mol.atoms.forEach((atom, index) => {
      if (dead[index]) return;
      const coverage = new Set(shells[index]);
      const pairs = [];
      atom.neighbors.forEach((link) => {
        pairs.push(bondCode(mol.bonds[link.bond])
          + (stereo ? stereo.bonds[link.bond] : '') + ':' + invariants[link.atom]);
        coverage.add(link.bond);
        shells[link.atom].forEach((item) => coverage.add(item));
      });
      pairs.sort();
      nextShells[index] = coverage;
      nextInvariants[index] = hash32(round + '|' + invariants[index] + '|' + pairs.join('|'));
      pending.push({ index, stamp: [...coverage].sort((a, b) => a - b).join(','), code: nextInvariants[index] });
    });

    pending.forEach((entry) => {
      if (seen.has(entry.stamp)) {
        dead[entry.index] = true;
        return;
      }
      seen.add(entry.stamp);
      bump(entry.code);
    });

    invariants = nextInvariants;
    shells = nextShells;
  }

  return counts;
}

function distanceMatrix(mol) {
  const n = mol.atoms.length;
  const rows = [];
  for (let start = 0; start < n; start += 1) {
    const row = new Array(n).fill(-1);
    row[start] = 0;
    const queue = [start];
    for (let head = 0; head < queue.length; head += 1) {
      const current = queue[head];
      mol.atoms[current].neighbors.forEach((link) => {
        if (row[link.atom] >= 0) return;
        row[link.atom] = row[current] + 1;
        queue.push(link.atom);
      });
    }
    rows.push(row);
  }
  return rows;
}

function pairAtomType(mol, atom) {
  return atom.element + piElectrons(mol, atom) + atom.degree;
}

function atomPairFingerprint(mol, maxDistance) {
  const limit = maxDistance || 10;
  const distances = distanceMatrix(mol);
  const types = mol.atoms.map((atom) => pairAtomType(mol, atom));
  const counts = new Map();
  for (let i = 0; i < mol.atoms.length; i += 1) {
    for (let j = i + 1; j < mol.atoms.length; j += 1) {
      const d = distances[i][j];
      if (d < 1 || d > limit) continue;
      const ends = [types[i], types[j]].sort();
      const code = hash32('P|' + ends[0] + '|' + ends[1] + '|' + d);
      counts.set(code, (counts.get(code) || 0) + 1);
    }
  }
  return counts;
}

function fingerprint(mol, methodKey) {
  const method = FP_METHODS.find((entry) => entry.key === methodKey) || FP_METHODS[0];
  const counts = method.kind === 'pairs'
    ? atomPairFingerprint(mol)
    : morganFingerprint(mol, method.radius, method.features, method.chirality);
  const keys = [...counts.keys()].sort((a, b) => a - b);
  return { method: method.key, counts, keys, bits: new Set(keys) };
}

function foldBits(fp, nBits) {
  const size = nBits || 2048;
  const words = new Uint32Array(Math.ceil(size / 32));
  fp.keys.forEach((code) => {
    const bit = code % size;
    words[bit >>> 5] |= (1 << (bit & 31));
  });
  return words;
}

function tanimoto(a, b) {
  const small = a.bits.size <= b.bits.size ? a.bits : b.bits;
  const large = small === a.bits ? b.bits : a.bits;
  let shared = 0;
  small.forEach((code) => { if (large.has(code)) shared += 1; });
  const union = a.bits.size + b.bits.size - shared;
  return union ? shared / union : 0;
}

function dice(a, b) {
  const small = a.bits.size <= b.bits.size ? a.bits : b.bits;
  const large = small === a.bits ? b.bits : a.bits;
  let shared = 0;
  small.forEach((code) => { if (large.has(code)) shared += 1; });
  const total = a.bits.size + b.bits.size;
  return total ? (2 * shared) / total : 0;
}

function sharedCount(a, b) {
  const small = a.bits.size <= b.bits.size ? a.bits : b.bits;
  const large = small === a.bits ? b.bits : a.bits;
  let shared = 0;
  small.forEach((code) => { if (large.has(code)) shared += 1; });
  return shared;
}

if (typeof module !== 'undefined' && module.exports) {
  if (typeof stereoAnalyse !== 'function') {
    global.stereoAnalyse = require('./stereo.js').stereoAnalyse;
  }
  module.exports = {
    FP_METHODS,
    featureBits,
    fingerprint,
    morganFingerprint,
    atomPairFingerprint,
    foldBits,
    tanimoto,
    dice,
    sharedCount,
    hash32,
    distanceMatrix
  };
}
