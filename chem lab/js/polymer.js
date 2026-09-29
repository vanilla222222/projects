const POLYMER_MONOMER_NAMES = {
  propene: 'propylene',
  'prop-1-ene': 'propylene',
  chloroethene: 'vinyl chloride',
  fluoroethene: 'vinyl fluoride',
  bromoethene: 'vinyl bromide',
  ethenol: 'vinyl alcohol',
  'ethenyl acetate': 'vinyl acetate',
  '1,1-dichloroethene': 'vinylidene chloride',
  '1,1-difluoroethene': 'vinylidene fluoride',
  '2-methylpropene': 'isobutylene',
  '2-methylprop-1-ene': 'isobutylene',
  '2-chlorobuta-1,3-diene': 'chloroprene',
};

const POLYMER_KNOWN_UNITS = [
  { name: 'poly(ethylene terephthalate)', smiles: 'OCCOC(=O)c1ccc(cc1)C(=O)', tail: 12 },
  { name: 'nylon-6', smiles: 'NCCCCCC(=O)', tail: 6 },
  { name: 'nylon-6,6', smiles: 'NCCCCCCNC(=O)CCCCC(=O)', tail: 14 },
  { name: 'poly(oxyethylene)', smiles: 'OCC', tail: 2 },
  { name: 'poly(oxymethylene)', smiles: 'OC', tail: 1 },
];

const POLYMER_SUBSCRIPTS = '₀₁₂₃₄₅₆₇₈₉';

function polymerSubscript(text) {
  return String(text).replace(/\d/g, (d) => POLYMER_SUBSCRIPTS[Number(d)]);
}

function bracketCrossings(graph, atomIds) {
  const inside = new Set(atomIds);
  return graph.bonds
    .filter((b) => inside.has(b.atomA) !== inside.has(b.atomB))
    .map((b) => (inside.has(b.atomA) ? { bond: b, inner: b.atomA, outer: b.atomB } : { bond: b, inner: b.atomB, outer: b.atomA }));
}

function bracketValid(graph, bracket) {
  return !!bracket && Array.isArray(bracket.atomIds) && bracket.atomIds.length > 0 &&
    bracket.atomIds.every((id) => graph.getAtom(id)) && bracketCrossings(graph, bracket.atomIds).length === 2;
}

function pruneBrackets(graph) {
  const stale = graph.annotations.filter((a) => a.kind === 'bracket' && !bracketValid(graph, a));
  stale.forEach((a) => graph.removeAnnotation(a.id));
  return stale.length;
}

function polymerRepeatCounts(graph, atomIds) {
  const counts = {};
  atomIds.forEach((id) => {
    const atom = graph.getAtom(id);
    if (!atom) {
      return;
    }
    counts[atom.element] = (counts[atom.element] || 0) + 1;
    const h = implicitHydrogenCount(atom.element, atom.charge || 0, graph.totalBondOrder(id));
    if (h > 0) {
      counts.H = (counts.H || 0) + h;
    }
  });
  return counts;
}

function polymerRepeatFormula(graph, bracket) {
  return isomerFormulaText(polymerRepeatCounts(graph, bracket.atomIds));
}

function polymerUnitGraph(graph, atomIds) {
  const unit = new Graph();
  const map = new Map();
  atomIds.forEach((id) => {
    const atom = graph.getAtom(id);
    const copy = unit.addAtom(atom.element, atom.x, atom.y);
    if (atom.charge) {
      copy.charge = atom.charge;
    }
    map.set(id, copy.id);
  });
  graph.bonds.forEach((b) => {
    if (map.has(b.atomA) && map.has(b.atomB)) {
      unit.addBond(map.get(b.atomA), map.get(b.atomB)).order = b.order;
    }
  });
  return { unit, map };
}

function polymerPath(graph, from, to) {
  const previous = new Map([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === to) {
      break;
    }
    graph.bondsForAtom(cur).forEach((b) => {
      const next = b.atomA === cur ? b.atomB : b.atomA;
      if (!previous.has(next)) {
        previous.set(next, cur);
        queue.push(next);
      }
    });
  }
  if (!previous.has(to)) {
    return null;
  }
  const path = [];
  for (let cur = to; cur !== null; cur = previous.get(cur)) {
    path.unshift(cur);
  }
  return path;
}

function polymerMonomerName(unit) {
  const ids = unit.atoms.map((a) => a.id);
  let name = '';
  try {
    name = nameStructure(unit, ids) || '';
  } catch (error) {
    name = '';
  }
  name = name.replace(/^\([0-9EZRS,]+\)-/, '');
  return POLYMER_MONOMER_NAMES[name] || name;
}

function polymerAdditionName(graph, atomIds, crossings) {
  if (crossings.some((c) => c.bond.order !== 1)) {
    return null;
  }
  const { unit, map } = polymerUnitGraph(graph, atomIds);
  const head = map.get(crossings[0].inner);
  const tail = map.get(crossings[1].inner);
  if (head === tail) {
    return null;
  }
  const path = polymerPath(unit, head, tail);
  if (!path || path.some((id) => unit.getAtom(id).element !== 'C')) {
    return null;
  }
  const bonds = path.slice(1).map((id, i) => unit.getBond(path[i], id));
  const orders = bonds.map((b) => b.order).join('');
  if (orders === '1') {
    bonds[0].order = 2;
  } else if (orders === '121') {
    bonds[0].order = 2;
    bonds[1].order = 1;
    bonds[2].order = 2;
  } else {
    return null;
  }
  const name = polymerMonomerName(unit);
  return name ? 'poly(' + name + ')' : null;
}

function polymerAromatize(el, adj, n) {
  const marks = [];
  const walk = (start, cur, depth, path, lastOrder) => {
    for (let next = 0; next < n; next++) {
      const order = adj[cur * n + next];
      if (!order || order > 2 || order === lastOrder) {
        continue;
      }
      if (next === start && depth === 5) {
        marks.push(path.concat([start]));
        continue;
      }
      if (depth < 5 && !path.includes(next)) {
        walk(start, next, depth + 1, path.concat([next]), order);
      }
    }
  };
  for (let i = 0; i < n; i++) {
    walk(i, i, 0, [i], 0);
  }
  const out = adj.slice();
  marks.forEach((cycle) => {
    for (let k = 1; k < cycle.length; k++) {
      out[cycle[k - 1] * n + cycle[k]] = 4;
      out[cycle[k] * n + cycle[k - 1]] = 4;
    }
  });
  return out;
}

function polymerTrimerKey(el, adj, head, tail, link) {
  const n = el.length;
  const m = n * 3;
  const big = new Array(m * m).fill(0);
  for (let copy = 0; copy < 3; copy++) {
    const off = copy * n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        big[(off + i) * m + off + j] = adj[i * n + j];
      }
    }
    const from = off + tail;
    const to = ((copy + 1) % 3) * n + head;
    big[from * m + to] = link;
    big[to * m + from] = link;
  }
  const bigEl = [].concat(el, el, el);
  return isomerCanonicalString(bigEl, polymerAromatize(bigEl, big, m));
}

function polymerKnownUnits() {
  POLYMER_KNOWN_UNITS.forEach((entry) => {
    if (entry.key !== undefined) {
      return;
    }
    const mol = smilesStripHydrogens(parseSmiles(entry.smiles));
    smilesKekulize(mol);
    const built = smilesBuildGraph(mol);
    const state = isomerStateFromGraph(built.graph);
    entry.key = polymerTrimerKey(state.el, state.adj, state.index.get(built.ids[0]), state.index.get(built.ids[entry.tail]), 1);
  });
  return POLYMER_KNOWN_UNITS;
}

function polymerKnownName(graph, atomIds, crossings) {
  const state = isomerStateFromGraph(graph, atomIds);
  const key = polymerTrimerKey(state.el, state.adj, state.index.get(crossings[0].inner), state.index.get(crossings[1].inner), crossings[0].bond.order);
  const hit = polymerKnownUnits().find((entry) => entry.key === key);
  return hit ? hit.name : null;
}

function polymerName(graph, bracket) {
  if (!bracketValid(graph, bracket)) {
    return '';
  }
  const atomIds = bracket.atomIds.slice();
  const crossings = bracketCrossings(graph, atomIds);
  return polymerAdditionName(graph, atomIds, crossings) ||
    polymerKnownName(graph, atomIds, crossings) ||
    'poly[(' + polymerSubscript(polymerRepeatFormula(graph, bracket)) + ')]';
}
