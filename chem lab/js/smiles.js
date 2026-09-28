class SmilesError extends Error {
  constructor(message, position) {
    super(position === undefined ? message : message + ' (at position ' + (position + 1) + ')');
    this.position = position;
  }
}

const SMILES_ORGANIC = ['Cl', 'Br', 'B', 'C', 'N', 'O', 'P', 'S', 'F', 'I', 'b', 'c', 'n', 'o', 'p', 's'];
const SMILES_SUPPORTED = new Set(PERIODIC_ELEMENTS.map((element) => element.symbol));
const SMILES_AROMATIC = new Set(['c', 'n', 'o', 's', 'p', 'se']);

function parseSmiles(text) {
  const src = String(text || '').trim();
  if (!src) {
    throw new SmilesError('Empty SMILES');
  }
  if (/\s/.test(src)) {
    throw new SmilesError('SMILES cannot contain spaces', src.search(/\s/));
  }
  const atoms = [];
  const bonds = [];
  const openRings = new Map();
  const stack = [];
  let prev = null;
  let pendingBond = null;
  let pendingBondPos = 0;
  let i = 0;

  const addAtom = (atom, pos) => {
    atom.index = atoms.length;
    atom.pos = pos;
    atom.nbrs = [];
    atom.hasPreceding = prev !== null;
    atoms.push(atom);
    if (prev !== null) {
      connect(prev, atom.index, pendingBond, pos);
    }
    pendingBond = null;
    prev = atom.index;
  };

  const connect = (a, b, symbol, pos) => {
    if (a === b || bonds.some((bond) => (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a))) {
      throw new SmilesError('Duplicate or self bond', pos);
    }
    const bond = { a, b, symbol, index: bonds.length };
    bonds.push(bond);
    atoms[a].nbrs.push(b);
    atoms[b].nbrs.push(a);
    return bond;
  };

  while (i < src.length) {
    const ch = src[i];
    if (ch === '(') {
      if (prev === null) {
        throw new SmilesError('Branch has no preceding atom', i);
      }
      stack.push(prev);
      i += 1;
      continue;
    }
    if (ch === ')') {
      if (stack.length === 0) {
        throw new SmilesError('Unmatched )', i);
      }
      if (pendingBond) {
        throw new SmilesError('Bond symbol before )', i);
      }
      prev = stack.pop();
      i += 1;
      continue;
    }
    if ('-=#$:/\\'.includes(ch)) {
      if (pendingBond) {
        throw new SmilesError('Two bond symbols in a row', i);
      }
      if (ch === '$') {
        throw new SmilesError('Quadruple bonds are not supported', i);
      }
      pendingBond = ch;
      pendingBondPos = i;
      i += 1;
      continue;
    }
    if (ch === '.') {
      if (pendingBond) {
        throw new SmilesError('Bond symbol before .', i);
      }
      prev = null;
      i += 1;
      continue;
    }
    if (/[0-9%]/.test(ch)) {
      if (prev === null) {
        throw new SmilesError('Ring bond digit has no atom', i);
      }
      let num;
      const pos = i;
      if (ch === '%') {
        const m = /^%(\d\d)/.exec(src.slice(i));
        if (!m) {
          throw new SmilesError('% must be followed by two digits', i);
        }
        num = Number(m[1]);
        i += 3;
      } else {
        num = Number(ch);
        i += 1;
      }
      if (openRings.has(num)) {
        const open = openRings.get(num);
        openRings.delete(num);
        const symbol = pendingBond || open.symbol;
        if (pendingBond && open.symbol && pendingBond !== open.symbol && !('/\\'.includes(pendingBond) && '/\\'.includes(open.symbol))) {
          throw new SmilesError('Ring bond ' + num + ' has conflicting bond symbols', pos);
        }
        const bond = connect(open.atom, prev, symbol, pos);
        atoms[open.atom].nbrs.pop();
        atoms[open.atom].nbrs[open.slot] = prev;
        bond.ringFromOpen = !pendingBond;
      } else {
        openRings.set(num, { atom: prev, symbol: pendingBond, slot: atoms[prev].nbrs.length, pos });
        atoms[prev].nbrs.push(null);
      }
      pendingBond = null;
      continue;
    }
    if (ch === '[') {
      const end = src.indexOf(']', i);
      if (end === -1) {
        throw new SmilesError('Unclosed [', i);
      }
      const body = src.slice(i + 1, end);
      const m = /^(\d*)([A-Z][a-z]?|[a-z][a-z]?|\*)(@@|@)?(H\d?)?([+-]+\d*|[+-]\d+)?(:\d+)?$/.exec(body);
      if (!m) {
        throw new SmilesError('Cannot read bracket atom [' + body + ']', i);
      }
      let symbol = m[2];
      const aromatic = SMILES_AROMATIC.has(symbol);
      if (aromatic) {
        symbol = symbol[0].toUpperCase() + symbol.slice(1);
      }
      if (!SMILES_SUPPORTED.has(symbol)) {
        throw new SmilesError('Element ' + m[2] + ' is not supported', i);
      }
      const isotope = m[1] ? Number(m[1]) : null;
      let hcount = m[4] ? (m[4].length > 1 ? Number(m[4].slice(1)) : 1) : 0;
      let charge = 0;
      if (m[5]) {
        const signs = m[5].match(/[+-]/g);
        const digits = m[5].replace(/[+-]/g, '');
        const sign = signs[0] === '+' ? 1 : -1;
        charge = digits ? sign * Number(digits) : sign * signs.length;
      }
      if (symbol === 'H' && isotope === 2) {
        symbol = 'D';
      }
      addAtom({ element: symbol, aromatic, bracket: true, hcount, charge, chiral: m[3] || null, isotope }, i);
      i = end + 1;
      continue;
    }
    const organic = SMILES_ORGANIC.find((s) => src.startsWith(s, i));
    if (!organic) {
      throw new SmilesError('Unexpected character "' + ch + '"', i);
    }
    if (organic === 'b') {
      throw new SmilesError('Aromatic boron is not supported', i);
    }
    const aromatic = SMILES_AROMATIC.has(organic);
    addAtom({ element: aromatic ? organic.toUpperCase() : organic, aromatic, bracket: false, hcount: null, charge: 0, chiral: null }, i);
    i += organic.length;
  }
  if (pendingBond) {
    throw new SmilesError('SMILES ends with a bond symbol', pendingBondPos);
  }
  if (stack.length) {
    throw new SmilesError('Unclosed (', src.length - 1);
  }
  if (openRings.size) {
    const open = openRings.values().next().value;
    throw new SmilesError('Ring bond ' + openRings.keys().next().value + ' is never closed', open.pos);
  }
  bonds.forEach((bond) => {
    const s = bond.symbol;
    if (s === '=') {
      bond.order = 2;
    } else if (s === '#') {
      bond.order = 3;
    } else if (s === ':') {
      bond.order = 1;
      bond.aromatic = true;
    } else if (s === '-' || s === '/' || s === '\\') {
      bond.order = 1;
    } else {
      bond.order = 1;
      bond.aromatic = atoms[bond.a].aromatic && atoms[bond.b].aromatic;
    }
  });
  return { atoms, bonds, text: src };
}

function smilesStripHydrogens(mol) {
  const removed = new Set();
  mol.atoms.forEach((atom) => {
    if (atom.element !== 'H') {
      return;
    }
    if (atom.charge || atom.nbrs.length !== 1 || mol.atoms[atom.nbrs[0]].element === 'H') {
      return;
    }
    const host = mol.atoms[atom.nbrs[0]];
    host.hcount = (host.hcount || 0) + 1;
    host.explicitH = (host.explicitH || 0) + 1;
    host.nbrs = host.nbrs.map((n) => (n === atom.index ? 'H' : n));
    removed.add(atom.index);
  });
  if (removed.size === 0) {
    return mol;
  }
  const remap = new Map();
  const atoms = mol.atoms.filter((a) => !removed.has(a.index));
  atoms.forEach((a, index) => remap.set(a.index, index));
  atoms.forEach((a) => {
    a.index = remap.get(a.index);
    a.nbrs = a.nbrs.map((n) => (n === 'H' ? 'H' : remap.get(n)));
  });
  const bonds = mol.bonds
    .filter((b) => !removed.has(b.a) && !removed.has(b.b))
    .map((b) => Object.assign({}, b, { a: remap.get(b.a), b: remap.get(b.b) }));
  return { atoms, bonds, text: mol.text };
}

function smilesAllowedValences(atom) {
  const element = periodicElement(atom.element);
  if (element && isMetalElement(atom.element) && element.maxValence > 0 && element.valences.length === 1 && element.valences[0] === 0) {
    return Array.from({ length: element.maxValence + 1 }, (_, i) => i);
  }
  if ((atom.element === 'H' || atom.element === 'D') && !atom.charge) {
    return [0, 1];
  }
  if (atom.charge) {
    return [valenceFor(atom.element, atom.charge)];
  }
  return STANDARD_VALENCES[atom.element] || [];
}

function smilesKekulize(mol) {
  const aromaticBonds = mol.bonds.filter((b) => b.aromatic);
  if (aromaticBonds.length === 0) {
    return;
  }
  const bondSum = (atom) => mol.bonds.reduce((s, b) => s + ((b.a === atom.index || b.b === atom.index) && !b.aromatic ? b.order : 0), 0);
  const aromaticCount = (atom) => aromaticBonds.filter((b) => b.a === atom.index || b.b === atom.index).length;
  const needs = new Set();
  mol.atoms.forEach((atom) => {
    if (!atom.aromatic) {
      return;
    }
    const used = bondSum(atom) + aromaticCount(atom) + (atom.bracket ? atom.hcount : 0);
    const valences = smilesAllowedValences(atom);
    const target = atom.bracket ? valences.find((v) => v >= used) : valences[0];
    if (target !== undefined && target - used >= 1) {
      needs.add(atom.index);
    }
  });
  const candidates = aromaticBonds.filter((b) => needs.has(b.a) && needs.has(b.b));
  const matched = new Set();
  const chosen = new Set();
  let steps = 0;
  const solve = () => {
    if (++steps > 200000) {
      return false;
    }
    let best = null;
    let bestOptions = null;
    for (const id of needs) {
      if (matched.has(id)) {
        continue;
      }
      const options = candidates.filter((b) => (b.a === id || b.b === id) && !matched.has(b.a) && !matched.has(b.b));
      if (best === null || options.length < bestOptions.length) {
        best = id;
        bestOptions = options;
        if (options.length === 0) {
          break;
        }
      }
    }
    if (best === null) {
      return true;
    }
    for (const bond of bestOptions) {
      matched.add(bond.a);
      matched.add(bond.b);
      chosen.add(bond);
      if (solve()) {
        return true;
      }
      matched.delete(bond.a);
      matched.delete(bond.b);
      chosen.delete(bond);
    }
    return false;
  };
  if (!solve()) {
    const bad = mol.atoms.find((a) => needs.has(a.index));
    throw new SmilesError('Could not assign alternating double bonds to the aromatic ring (check [nH] hydrogens)', bad ? bad.pos : undefined);
  }
  aromaticBonds.forEach((bond) => {
    bond.order = chosen.has(bond) ? 2 : 1;
  });
}

function smilesCheckValence(mol) {
  mol.atoms.forEach((atom) => {
    const sum = mol.bonds.reduce((s, b) => s + (b.a === atom.index || b.b === atom.index ? b.order : 0), 0);
    const valences = smilesAllowedValences(atom);
    if (atom.bracket) {
      const total = sum + atom.hcount;
      if (!valences.includes(total)) {
        throw new SmilesError('Unsupported valence for ' + atom.element + (atom.charge ? ' with charge ' + atom.charge : '') + ' (radicals and unusual valences cannot be drawn)', atom.pos);
      }
    } else if (!valences.some((v) => v >= sum)) {
      throw new SmilesError('Too many bonds on ' + atom.element, atom.pos);
    }
  });
}

function smilesBuildGraph(mol) {
  const graph = new Graph();
  const ids = mol.atoms.map((atom) => {
    const a = graph.addAtom(atom.element, 0, 0);
    if (atom.charge && atom.element !== 'D') {
      a.charge = atom.charge;
    }
    return a.id;
  });
  const bondMap = new Map();
  mol.bonds.forEach((b) => {
    const bond = graph.addBond(ids[b.a], ids[b.b]);
    bond.order = b.order;
    bondMap.set(b, bond);
  });
  return { graph, ids, bondMap };
}

function smilesNeutralize(graph) {
  let changed = 0;
  graph.bonds.forEach((bond) => {
    const a = graph.getAtom(bond.atomA);
    const b = graph.getAtom(bond.atomB);
    if (bond.order !== 1 || !a.charge || !b.charge || a.charge + b.charge !== 0 || Math.abs(a.charge) !== 1) {
      return;
    }
    const saved = [a.charge, b.charge];
    delete a.charge;
    delete b.charge;
    const ok = canAddBond(graph, a.id, 1, b.id) && canAddBond(graph, b.id, 1, a.id);
    if (!ok) {
      a.charge = saved[0];
      b.charge = saved[1];
      return;
    }
    bond.order = 2;
    changed += 1;
  });
  return changed;
}

function smilesValidateGraph(graph) {
  graph.atoms.forEach((atom) => {
    graph.bondsForAtom(atom.id).forEach((bond) => {
      bond.order -= 1;
      const ok = canAddBond(graph, bond.atomA, 1, bond.atomB) && canAddBond(graph, bond.atomB, 1, bond.atomA);
      bond.order += 1;
      if (!ok) {
        throw new SmilesError('Structure exceeds the valence rules of the editor at ' + atom.element);
      }
    });
  });
}

function smilesDirectionalSide(mol, bond, atomIndex) {
  const s = bond.symbol;
  if (s !== '/' && s !== '\\') {
    return 0;
  }
  const up = s === '/' ? 1 : -1;
  let left = bond.a;
  if (bond.ringFromOpen !== undefined) {
    left = bond.ringFromOpen ? bond.a : bond.b;
  }
  const substituentIsLeft = left !== atomIndex;
  return substituentIsLeft ? -up : up;
}

function smilesDoubleBondStereo(mol) {
  const specs = [];
  mol.bonds.forEach((db) => {
    if (db.order !== 2 || db.aromatic) {
      return;
    }
    const pick = (atomIndex, otherIndex) => {
      for (const b of mol.bonds) {
        if (b === db || (b.a !== atomIndex && b.b !== atomIndex)) {
          continue;
        }
        const side = smilesDirectionalSide(mol, b, atomIndex);
        if (side) {
          return { ref: b.a === atomIndex ? b.b : b.a, side };
        }
      }
      return null;
    };
    const left = pick(db.a, db.b);
    const right = pick(db.b, db.a);
    if (left && right) {
      specs.push({ bond: db, refA: left.ref, refB: right.ref, same: left.side === right.side });
    }
  });
  return specs;
}

function smilesApplyChirality(mol, graph, ids) {
  const usedBonds = new Set();
  const ringBond = (a, b) => {
    const bond = graph.getBond(a, b);
    const saved = graph.bonds.slice();
    graph.bonds = graph.bonds.filter((x) => x !== bond);
    const side = layoutSideOf(graph, a, b);
    graph.bonds = saved;
    return !side;
  };
  mol.atoms.forEach((atom) => {
    if (!atom.chiral) {
      return;
    }
    const order = [];
    const implicitH = atom.bracket ? atom.hcount - (atom.explicitH || 0) : 0;
    const nbrs = atom.nbrs.slice();
    if (atom.hasPreceding) {
      order.push(nbrs.shift());
      for (let h = 0; h < implicitH; h++) {
        order.push('H');
      }
    } else {
      for (let h = 0; h < implicitH; h++) {
        order.push('H');
      }
    }
    nbrs.forEach((n) => order.push(n));
    const hCount = order.filter((x) => x === 'H').length;
    if (order.length !== 4 || hCount > 1) {
      return;
    }
    const centerId = ids[atom.index];
    const neighborIds = order.map((n) => (n === 'H' ? null : ids[n]));
    const heavy = neighborIds.filter((n) => n !== null);
    const bonds = heavy.map((n) => graph.getBond(centerId, n));
    if (bonds.some((b) => !b || b.order !== 1)) {
      return;
    }
    const score = (b) => {
      const other = b.atomA === centerId ? b.atomB : b.atomA;
      const otherAtom = mol.atoms[ids.indexOf(other)];
      let s = 0;
      if (usedBonds.has(b)) {
        s += 100;
      }
      if (ringBond(centerId, other)) {
        s += 10;
      }
      if (otherAtom && otherAtom.chiral) {
        s += 5;
      }
      s -= graph.bondsForAtom(other).length === 1 ? 2 : 0;
      return s;
    };
    const chosen = bonds.slice().sort((x, y) => score(x) - score(y))[0];
    if (usedBonds.has(chosen) || chosen.stereo) {
      return;
    }
    if (chosen.atomA !== centerId) {
      chosen.atomB = chosen.atomA;
      chosen.atomA = centerId;
    }
    chosen.stereo = 'wedge';
    usedBonds.add(chosen);
    const volume = tetrahedralVolume(graph, centerId, neighborIds);
    const wantPositive = atom.chiral === '@';
    if (Math.abs(volume) > 1e-9 && (volume > 0) !== wantPositive) {
      chosen.stereo = 'hash';
    }
  });
}

function smilesToFragment(text) {
  let mol = parseSmiles(text);
  mol = smilesStripHydrogens(mol);
  if (mol.atoms.length === 0) {
    throw new SmilesError('No drawable atoms');
  }
  smilesKekulize(mol);
  smilesCheckValence(mol);
  const ezSpecs = smilesDoubleBondStereo(mol);
  const { graph, ids, bondMap } = smilesBuildGraph(mol);
  smilesNeutralize(graph);
  smilesValidateGraph(graph);
  const positions = computeLayout(graph, graph.atoms.map((a) => a.id));
  positions.forEach((p, id) => {
    const atom = graph.getAtom(id);
    atom.x = p.x;
    atom.y = p.y;
  });
  ezSpecs.forEach((spec) => {
    const bond = bondMap.get(spec.bond);
    enforceDoubleBondGeometry(graph, bond, ids[spec.refA], ids[spec.refB], spec.same);
  });
  smilesApplyChirality(mol, graph, ids);
  return {
    format: 'chemical-graph-fragment',
    atoms: graph.atoms.map((a) => (a.charge ? { id: a.id, element: a.element, x: a.x, y: a.y, charge: a.charge } : { id: a.id, element: a.element, x: a.x, y: a.y })),
    bonds: graph.bonds.map((b) => ({ atomA: b.atomA, atomB: b.atomB, order: b.order, stereo: b.stereo || null })),
  };
}

function looksLikeSmiles(text) {
  const t = String(text || '').trim();
  return t.length > 0 && t.length < 2000 && !/\s/.test(t) && /^[A-Za-z0-9@+\-\[\]\(\)=#$:\/\\%.*]+$/.test(t) && /[BCNOPSFIbcnops]/.test(t);
}
