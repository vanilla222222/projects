'use strict';

const STEREO_SPHERES = 10;
const STEREO_NODE_CAP = 4000;
const STEREO_LONE_PAIR = -1;
const STEREO_DATIVE_CORE = ['P', 'S', 'As', 'Se'];

function stereoZ(element) {
  if (element === '*') return 0;
  if (typeof SMARTS_Z !== 'undefined' && SMARTS_Z[element]) return SMARTS_Z[element];
  if (typeof ATOMIC_NUMBER !== 'undefined' && ATOMIC_NUMBER[element]) return ATOMIC_NUMBER[element];
  return 0;
}

function stereoClasses(mol) {
  const n = mol.atoms.length;
  let labels = mol.atoms.map((atom) => [
    stereoZ(atom.element), atom.degree, atom.charge + 8, atom.totalH,
    atom.aromatic ? 1 : 0, atom.ringCount, atom.isotope || 0
  ].join(','));
  let classes = stereoCompress(labels);
  let count = new Set(classes).size;
  for (let pass = 0; pass < n + 2; pass += 1) {
    const next = mol.atoms.map((atom, id) => classes[id] + '|' + atom.neighbors
      .map((link) => classes[link.atom] + '-' + mol.bonds[link.bond].order)
      .sort().join(';'));
    const grown = stereoCompress(next);
    const size = new Set(grown).size;
    classes = grown;
    if (size === count) break;
    count = size;
  }
  return classes;
}

function stereoCompress(labels) {
  const unique = [...new Set(labels)].sort();
  const index = new Map(unique.map((value, i) => [value, i]));
  return labels.map((value) => index.get(value));
}

function stereoNeighbourList(mol, id) {
  const atom = mol.atoms[id];
  const listed = Array.isArray(atom.order)
    ? atom.order.filter((slot) => slot === null || typeof slot === 'number')
    : [];
  const seen = new Set(listed.filter((slot) => slot !== null));
  const extra = atom.neighbors.map((link) => link.atom).filter((other) => !seen.has(other));
  const out = listed.concat(extra);
  const hydrogens = atom.totalH - out.filter((slot) => slot === null).length;
  if (hydrogens === 1 && !listed.some((slot) => slot === null)) out.unshift(null);
  return out;
}

function stereoPhantom(z) {
  return { z: z, children: [], seq: [[z]] };
}

function stereoDativeBond(mol, bond) {
  if ((bond.order || 1) !== 2) return false;
  const heavy = STEREO_DATIVE_CORE;
  const tip = ['O', 'S', 'N', 'Se'];
  const pair = (x, y) => heavy.includes(x.element) && tip.includes(y.element)
    && y.degree === 1 && y.totalH === 0 && x.degree + x.totalH >= 3;
  return pair(mol.atoms[bond.a], mol.atoms[bond.b]) || pair(mol.atoms[bond.b], mol.atoms[bond.a]);
}

function stereoTreeNode(mol, atom, parent, path, depth, budget) {
  const node = stereoPhantom(stereoZ(mol.atoms[atom].element));
  if (depth <= 0 || budget.n > STEREO_NODE_CAP) return node;
  budget.n += 1;
  const data = mol.atoms[atom];
  const next = path.concat(atom);
  data.neighbors.forEach((link) => {
    const bond = mol.bonds[link.bond];
    const extra = stereoDativeBond(mol, bond) ? 0 : Math.max(0, (bond.order || 1) - 1);
    const z = stereoZ(mol.atoms[link.atom].element);
    for (let k = 0; k < extra; k += 1) node.children.push(stereoPhantom(z));
    if (link.atom === parent) return;
    if (next.indexOf(link.atom) >= 0) { node.children.push(stereoPhantom(z)); return; }
    node.children.push(stereoTreeNode(mol, link.atom, atom, next, depth - 1, budget));
  });
  for (let k = 0; k < data.totalH; k += 1) node.children.push(stereoPhantom(1));
  return node;
}

function stereoTreeCompare(a, b) {
  const depth = Math.max(a.seq.length, b.seq.length);
  for (let d = 0; d < depth; d += 1) {
    const left = a.seq[d] || [];
    const right = b.seq[d] || [];
    const width = Math.max(left.length, right.length);
    for (let i = 0; i < width; i += 1) {
      const x = left[i] === undefined ? 0 : left[i];
      const y = right[i] === undefined ? 0 : right[i];
      if (x !== y) return y - x;
    }
  }
  return 0;
}

function stereoTreeSort(node) {
  node.children.forEach(stereoTreeSort);
  node.children.sort(stereoTreeCompare);
  const seq = [[node.z]];
  for (let d = 1; d <= STEREO_SPHERES; d += 1) {
    const level = [];
    node.children.forEach((child) => {
      const part = child.seq[d - 1];
      if (part) part.forEach((z) => level.push(z));
    });
    if (!level.length) break;
    seq.push(level);
  }
  node.seq = seq;
  return node;
}

function stereoBranch(mol, root, center) {
  if (root === null) return stereoPhantom(1);
  if (root === STEREO_LONE_PAIR) return stereoPhantom(0);
  const budget = { n: 0 };
  return stereoTreeSort(stereoTreeNode(mol, root, center, [], STEREO_SPHERES, budget));
}

function stereoCipRanks(mol, center, neighbours) {
  const branches = neighbours.map((slot) => ({ slot: slot, tree: stereoBranch(mol, slot, center) }));
  const sorted = branches.slice().sort((a, b) => stereoTreeCompare(a.tree, b.tree));
  const ranks = new Map();
  let tied = false;
  sorted.forEach((branch, i) => {
    if (i > 0 && stereoTreeCompare(sorted[i - 1].tree, branch.tree) === 0) {
      tied = true;
      ranks.set(branch.slot, ranks.get(sorted[i - 1].slot));
      return;
    }
    ranks.set(branch.slot, i + 1);
  });
  return { ranks: ranks, tied: tied, order: sorted.map((branch) => branch.slot) };
}

function stereoPermutationParity(from, to) {
  const work = from.slice();
  let swaps = 0;
  for (let i = 0; i < to.length; i += 1) {
    if (work[i] === to[i]) continue;
    const at = work.indexOf(to[i], i);
    if (at < 0) return null;
    const hold = work[i];
    work[i] = work[at];
    work[at] = hold;
    swaps += 1;
  }
  return swaps % 2;
}

function stereoConjugated(mol, id) {
  const atom = mol.atoms[id];
  return atom.neighbors.some((link) => mol.atoms[link.atom].aromatic
    || (mol.bonds[link.bond].order || 1) > 1
    || mol.atoms[link.atom].neighbors.some((step) => step.atom !== id
      && (mol.bonds[step.bond].order || 1) > 1
      && ['O', 'S', 'N'].includes(mol.atoms[step.atom].element)));
}

function stereoLonePairSite(mol, id) {
  const atom = mol.atoms[id];
  if (atom.degree + atom.totalH !== 3) return false;
  if (atom.totalH > 1) return false;
  if (['S', 'Se', 'P', 'As'].includes(atom.element)) return true;
  if (atom.element !== 'N' || atom.ringCount < 2) return false;
  return !stereoConjugated(mol, id);
}

function stereoTetrahedralCandidate(mol, id) {
  const atom = mol.atoms[id];
  if (atom.aromatic) return false;
  if (atom.totalH > 1) return false;
  if (!['C', 'Si', 'N', 'P', 'S', 'Se', 'Ge', 'Sn', 'As'].includes(atom.element)) return false;
  const saturated = atom.degree + atom.totalH === 4;
  if (!saturated && !stereoLonePairSite(mol, id)) return false;
  if (atom.element === 'N' && saturated && atom.charge !== 1 && atom.ringCount < 2) return false;
  return true;
}

function stereoTetrahedralTag(atom) {
  if (!atom.chirality) return null;
  const match = String(atom.chirality).match(/^(@{1,2})(TH[12])?$/);
  if (!match) return null;
  let tag = match[1];
  if (match[2] === 'TH2') tag = tag === '@' ? '@@' : '@';
  return tag;
}

function stereoTetrahedral(mol) {
  const classes = stereoClasses(mol);
  const out = [];
  mol.atoms.forEach((atom, id) => {
    const tag = stereoTetrahedralTag(atom);
    if (!stereoTetrahedralCandidate(mol, id) && !tag) return;
    const neighbours = stereoNeighbourList(mol, id);
    if (neighbours.length === 3 && stereoLonePairSite(mol, id)) neighbours.push(STEREO_LONE_PAIR);
    if (neighbours.length !== 4) return;
    const heavy = neighbours.filter((slot) => slot !== null && slot !== STEREO_LONE_PAIR);
    const duplicate = heavy.some((a, i) => heavy.some((b, j) => j > i && classes[a] === classes[b]));
    const cip = stereoCipRanks(mol, id, neighbours);
    const stereogenic = !duplicate && !cip.tied;
    if (!stereogenic && !tag) return;
    let label = null;
    if (tag && !cip.tied && atom.element !== 'N') {
      const target = [cip.order[3], cip.order[0], cip.order[1], cip.order[2]];
      const parity = stereoPermutationParity(neighbours, target);
      if (parity !== null) {
        const effective = parity ? (tag === '@' ? '@@' : '@') : tag;
        label = effective === '@' ? 'R' : 'S';
      }
    }
    out.push({
      atom: id,
      element: atom.element,
      specified: !!tag,
      stereogenic: stereogenic,
      label: label,
      undetermined: !!tag && label === null,
      tag: tag || null,
      neighbours: neighbours
    });
  });
  return out;
}

function stereoBondDirection(mol, bondIndex, reference) {
  const bond = mol.bonds[bondIndex];
  if (!bond.dir) return 0;
  return bond.a === reference ? bond.dir : -bond.dir;
}

function stereoDoubleBondEnd(mol, end, other) {
  const atom = mol.atoms[end];
  const links = atom.neighbors.filter((link) => link.atom !== other);
  if (!links.length || links.length > 2) return null;
  return links;
}

function stereoDoubleBondCandidate(mol, bond, index) {
  if (bond.order !== 2 || bond.aromatic) return false;
  const smallRing = mol.rings.some((ring) => ring.length < 8 && ring.indexOf(bond.a) >= 0 && ring.indexOf(bond.b) >= 0);
  if (smallRing) return false;
  const ends = [bond.a, bond.b];
  return ends.every((end, i) => {
    const atom = mol.atoms[end];
    if (!['C', 'N', 'Si'].includes(atom.element)) return false;
    if (atom.element === 'N' && atom.totalH > 0) return false;
    const links = stereoDoubleBondEnd(mol, end, ends[1 - i]);
    if (!links) return false;
    const cumulated = atom.neighbors.some((link) => link.bond !== index
      && (mol.bonds[link.bond].order || 1) > 1);
    if (cumulated) return false;
    if (links.length + atom.totalH === 2) return true;
    return atom.element === 'N' && links.length === 1 && atom.totalH === 0;
  });
}

function stereoDoubleBonds(mol) {
  const classes = stereoClasses(mol);
  const out = [];
  mol.bonds.forEach((bond, index) => {
    if (!stereoDoubleBondCandidate(mol, bond, index)) return;
    const ends = [bond.a, bond.b];
    const sides = [];
    let stereogenic = true;
    let specified = true;
    ends.forEach((end, i) => {
      const other = ends[1 - i];
      const links = stereoDoubleBondEnd(mol, end, other);
      const slots = links.map((link) => link.atom);
      if (mol.atoms[end].totalH === 1) slots.push(null);
      if (slots.length === 1 && mol.atoms[end].element === 'N') slots.push(STEREO_LONE_PAIR);
      if (slots.length !== 2) { stereogenic = false; return; }
      const a = slots[0];
      const b = slots[1];
      const real = (slot) => slot !== null && slot !== STEREO_LONE_PAIR;
      if (real(a) && real(b) && classes[a] === classes[b]) stereogenic = false;
      const cip = stereoCipRanks(mol, end, slots);
      if (cip.tied) stereogenic = false;
      const senior = cip.order[0];
      const link = links.find((item) => item.atom === senior);
      const direction = link ? stereoBondDirection(mol, link.bond, end) : 0;
      const marked = links.some((item) => stereoBondDirection(mol, item.bond, end) !== 0);
      if (!marked) specified = false;
      let sign = direction;
      if (!sign && marked) {
        const partner = links.find((item) => item.atom !== senior);
        sign = partner ? -stereoBondDirection(mol, partner.bond, end) : 0;
      }
      if (!sign && marked && (senior === null || senior === STEREO_LONE_PAIR)) {
        const only = links[0];
        sign = -stereoBondDirection(mol, only.bond, end);
      }
      sides.push(sign);
    });
    if (sides.length !== 2) return;
    let label = null;
    if (specified && stereogenic && sides[0] && sides[1]) {
      label = sides[0] === sides[1] ? 'Z' : 'E';
    }
    if (!stereogenic && !label) return;
    out.push({
      bond: index,
      a: bond.a,
      b: bond.b,
      specified: specified && !!sides[0] && !!sides[1],
      stereogenic: stereogenic,
      label: label,
      undetermined: specified && label === null
    });
  });
  return out;
}

function stereoAngleAt(coords, center, atom) {
  return Math.atan2(coords[atom].y - coords[center].y, coords[atom].x - coords[center].x);
}

function stereoFreeAngle(angles) {
  if (!angles.length) return 0;
  const sorted = angles.slice().sort((a, b) => a - b);
  let best = sorted[0] + Math.PI;
  let span = -1;
  for (let i = 0; i < sorted.length; i += 1) {
    const next = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + Math.PI * 2;
    if (next - sorted[i] > span) {
      span = next - sorted[i];
      best = (sorted[i] + next) / 2;
    }
  }
  return best;
}

function stereoWedgeChoice(mol, center, slots, used) {
  let best = null;
  let score = -1;
  slots.forEach((slot) => {
    if (slot === null || slot === STEREO_LONE_PAIR) return;
    const link = mol.atoms[center].neighbors.find((item) => item.atom === slot);
    if (!link) return;
    const bond = mol.bonds[link.bond];
    if ((bond.order || 1) !== 1) return;
    let value = 1;
    if (!bond.ring) value += 4;
    if (mol.atoms[slot].degree === 1) value += 2;
    if (!used.has(link.bond)) value += 8;
    if (value > score) {
      score = value;
      best = { slot: slot, bond: link.bond };
    }
  });
  return best;
}

function stereoWedges(mol, coords) {
  const out = [];
  const used = new Set();
  stereoTetrahedral(mol).forEach((center) => {
    if (!center.tag) return;
    const id = center.atom;
    const slots = center.neighbours;
    const real = slots.filter((slot) => slot !== null && slot !== STEREO_LONE_PAIR);
    if (real.length < 3) return;
    const free = stereoFreeAngle(real.map((slot) => stereoAngleAt(coords, id, slot)));
    const angleOf = (slot) => (slot === null || slot === STEREO_LONE_PAIR
      ? free : stereoAngleAt(coords, id, slot));
    const choice = stereoWedgeChoice(mol, id, slots, used);
    if (!choice) return;
    const order = [choice.slot].concat(slots.filter((slot) => slot !== choice.slot));
    const parity = stereoPermutationParity(slots, order);
    if (parity === null) return;
    const effective = parity ? (center.tag === '@' ? '@@' : '@') : center.tag;
    const points = order.slice(1).map((slot) => {
      const angle = angleOf(slot);
      return { x: Math.cos(angle), y: Math.sin(angle) };
    });
    const cross = (points[1].x - points[0].x) * (points[2].y - points[0].y)
      - (points[1].y - points[0].y) * (points[2].x - points[0].x);
    if (Math.abs(cross) < 1e-6) return;
    used.add(choice.bond);
    out.push({
      bond: choice.bond,
      from: id,
      to: choice.slot,
      type: (cross > 0) === (effective === '@') ? 'wedge' : 'hash'
    });
  });
  return out;
}

function stereoAnalyse(mol) {
  const centers = stereoTetrahedral(mol);
  const bonds = stereoDoubleBonds(mol);
  const real = centers.filter((item) => item.stereogenic);
  const realBonds = bonds.filter((item) => item.stereogenic);
  return {
    centers: centers,
    bonds: bonds,
    centerCount: real.length,
    centerSpecified: real.filter((item) => item.specified).length,
    centerUnspecified: real.filter((item) => !item.specified).length,
    bondCount: realBonds.length,
    bondSpecified: realBonds.filter((item) => item.specified).length,
    bondUnspecified: realBonds.filter((item) => !item.specified).length,
    undetermined: centers.filter((item) => item.undetermined).length
      + bonds.filter((item) => item.undetermined).length,
    labels: real.filter((item) => item.label).map((item) => (item.atom + 1) + item.label),
    bondLabels: realBonds.filter((item) => item.label).map((item) => (item.a + 1) + '=' + (item.b + 1) + item.label)
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    stereoAnalyse, stereoTetrahedral, stereoDoubleBonds, stereoClasses,
    stereoNeighbourList, stereoCipRanks, stereoZ, stereoTreeCompare, stereoWedges
  };
}
