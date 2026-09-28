const CIP_ATOMIC_NUMBERS = {
  H: 1, D: 1, He: 2, Li: 3, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10,
  Na: 11, Mg: 12, Si: 14, P: 15, S: 16, Cl: 17, K: 19, Ca: 20, Zn: 30, Se: 34, Br: 35, Sn: 50, I: 53, Cs: 55,
};

fillElementTable(CIP_ATOMIC_NUMBERS, (element) => element.number);

function cipAtomicNumber(element) {
  return Object.prototype.hasOwnProperty.call(CIP_ATOMIC_NUMBERS, element)
    ? CIP_ATOMIC_NUMBERS[element]
    : 0;
}

function cipMassRank(element) {
  return element === 'D' ? 2 : 1;
}

function cipChildren(graph, atomId, parentId, visited) {
  const atom = graph.getAtom(atomId);
  if (!atom) return [];
  const children = [];
  graph.bondsForAtom(atomId).forEach((bond) => {
    const neighborId = bond.atomA === atomId ? bond.atomB : bond.atomA;
    const neighborAtom = graph.getAtom(neighborId);
    if (!neighborAtom) return;
    const extraDuplicates = bond.order - 1;
    if (neighborId === parentId) {
      for (let i = 0; i < extraDuplicates; i++) {
        children.push({ atomId: null, element: neighborAtom.element, duplicate: true, visited });
      }
      return;
    }
    const isRingClosure = visited.has(neighborId);
    children.push({
      atomId: neighborId,
      element: neighborAtom.element,
      duplicate: isRingClosure,
      visited: isRingClosure ? visited : new Set(visited).add(atomId),
    });
    for (let i = 0; i < extraDuplicates; i++) {
      children.push({ atomId: null, element: neighborAtom.element, duplicate: true, visited });
    }
  });
  return children;
}

const PHANTOM_NODE = { atomId: null, element: null, duplicate: true, visited: new Set() };

const CIP_BUDGET = { remaining: 0 };

function cipSortChildren(graph, parentId, children) {
  children.sort((x, y) => cipAtomicNumber(y.element) - cipAtomicNumber(x.element));
  for (let i = 1; i < children.length; i++) {
    if (CIP_BUDGET.remaining <= 0) return;
    for (let j = i; j > 0 && cipAtomicNumber(children[j].element) === cipAtomicNumber(children[j - 1].element); j--) {
      const cmp = cipCompareNodes(
        graph,
        Object.assign({ parentId }, children[j]),
        Object.assign({ parentId }, children[j - 1])
      );
      if (cmp <= 0) break;
      const swap = children[j];
      children[j] = children[j - 1];
      children[j - 1] = swap;
    }
  }
}

function cipCompareNodes(graph, nodeA, nodeB) {
  CIP_BUDGET.remaining -= 1;
  const za = nodeA.element ? cipAtomicNumber(nodeA.element) : 0;
  const zb = nodeB.element ? cipAtomicNumber(nodeB.element) : 0;
  if (za !== zb) return za - zb;
  if (za === 0) return 0;
  if ((nodeA.element === 'H' || nodeA.element === 'D') && (nodeB.element === 'H' || nodeB.element === 'D')) {
    const ma = cipMassRank(nodeA.element);
    const mb = cipMassRank(nodeB.element);
    if (ma !== mb) return ma - mb;
  }

  const childrenA = nodeA.duplicate || nodeA.atomId === null
    ? []
    : cipChildren(graph, nodeA.atomId, nodeA.parentId, nodeA.visited || new Set());
  const childrenB = nodeB.duplicate || nodeB.atomId === null
    ? []
    : cipChildren(graph, nodeB.atomId, nodeB.parentId, nodeB.visited || new Set());

  cipSortChildren(graph, nodeA.atomId, childrenA);
  cipSortChildren(graph, nodeB.atomId, childrenB);

  const maxLen = Math.max(childrenA.length, childrenB.length);
  for (let i = 0; i < maxLen; i++) {
    const ca = childrenA[i] || PHANTOM_NODE;
    const cb = childrenB[i] || PHANTOM_NODE;
    const zca = ca.element ? cipAtomicNumber(ca.element) : 0;
    const zcb = cb.element ? cipAtomicNumber(cb.element) : 0;
    if (zca !== zcb) return zca - zcb;
  }
  for (let i = 0; i < maxLen; i++) {
    const ca = childrenA[i] || PHANTOM_NODE;
    const cb = childrenB[i] || PHANTOM_NODE;
    if (!ca.element && !cb.element) continue;
    const cmp = cipCompareNodes(
      graph,
      Object.assign({ parentId: nodeA.atomId }, ca),
      Object.assign({ parentId: nodeB.atomId }, cb)
    );
    if (cmp !== 0) return cmp;
  }
  return 0;
}

function cipRankSubstituents(graph, centerId, neighborIds) {
  CIP_BUDGET.remaining = 200000;
  const nodes = neighborIds.map((id) => {
    if (id === null) {
      return Object.assign({ parentId: centerId }, PHANTOM_NODE, { element: 'H' });
    }
    const atom = graph.getAtom(id);
    return {
      atomId: id,
      element: atom.element,
      duplicate: false,
      parentId: centerId,
      visited: new Set([centerId]),
    };
  });
  const indexed = nodes.map((node, index) => ({ node, index }));
  indexed.sort((a, b) => {
    const cmp = cipCompareNodes(graph, b.node, a.node);
    return cmp !== 0 ? cmp : a.index - b.index;
  });
  return { order: indexed.map((entry) => entry.node), ties: hasTie(graph, indexed.map((e) => e.node)) };
}

function hasTie(graph, orderedNodes) {
  for (let i = 0; i < orderedNodes.length - 1; i++) {
    if (cipCompareNodes(graph, orderedNodes[i], orderedNodes[i + 1]) === 0) {
      return true;
    }
  }
  return false;
}

function findStereocenters(graph, atomIds) {
  const idSet = new Set(atomIds);
  const results = [];
  const bondsByAtom = new Map();
  atomIds.forEach((id) => bondsByAtom.set(id, graph.bondsForAtom(id).filter((b) => idSet.has(b.atomA) && idSet.has(b.atomB))));

  atomIds.forEach((atomId) => {
    const bonds = bondsByAtom.get(atomId);
    const stereoBonds = bonds.filter((b) => b.stereo && b.atomA === atomId);
    if (stereoBonds.length !== 1) return;
    const stereoBond = stereoBonds[0];
    const heavyNeighborIds = bonds.map((b) => (b.atomA === atomId ? b.atomB : b.atomA));
    if (heavyNeighborIds.length < 3 || heavyNeighborIds.length > 4) return;
    if (bonds.some((b) => b.order !== 1)) return;

    let neighborIds = heavyNeighborIds.slice();
    let implicitH = null;
    if (neighborIds.length === 3) {
      implicitH = { opposite: stereoBond.stereo };
      neighborIds = neighborIds.concat([null]);
    }

    const { order, ties } = cipRankSubstituents(graph, atomId, neighborIds);
    if (ties) return;

    const center = graph.getAtom(atomId);
    const r = [0, 1, 2, 3].map((i) => {
      const node = order[i];
      if (node.atomId === null) {
        const z = implicitH.opposite === 'wedge' ? -1 : 1;
        return { x: 0, y: 0, z };
      }
      const a = graph.getAtom(node.atomId);
      let z = 0;
      if (node.atomId === stereoBond.atomB) {
        z = stereoBond.stereo === 'wedge' ? 1 : -1;
      }
      return { x: a.x - center.x, y: -(a.y - center.y), z };
    });

    const sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
    const cross = (p, q) => ({
      x: p.y * q.z - p.z * q.y,
      y: p.z * q.x - p.x * q.z,
      z: p.x * q.y - p.y * q.x,
    });
    const dot = (p, q) => p.x * q.x + p.y * q.y + p.z * q.z;

    const a = sub(r[0], r[3]);
    const b = sub(r[1], r[3]);
    const c = sub(r[2], r[3]);
    const volume = dot(a, cross(b, c));
    if (Math.abs(volume) < 1e-9) return;

    results.push({ atomId, type: volume < 0 ? 'R' : 'S' });
  });

  return results;
}

function isRingDoubleBond(graph, atomIds, bond) {
  const idSet = new Set(atomIds);
  const visited = new Set([bond.atomA]);
  const stack = [bond.atomA];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const b of graph.bondsForAtom(current)) {
      if (b.id === bond.id) continue;
      if (!idSet.has(b.atomA) || !idSet.has(b.atomB)) continue;
      const next = b.atomA === current ? b.atomB : b.atomA;
      if (next === bond.atomB) return true;
      if (!visited.has(next)) {
        visited.add(next);
        stack.push(next);
      }
    }
  }
  return false;
}

function findStereoDoubleBonds(graph, atomIds) {
  const idSet = new Set(atomIds);
  const results = [];
  const seen = new Set();
  graph.bonds.forEach((bond) => {
    if (bond.order !== 2) return;
    if (!idSet.has(bond.atomA) || !idSet.has(bond.atomB)) return;
    if (seen.has(bond.id)) return;
    seen.add(bond.id);
    if (isRingDoubleBond(graph, atomIds, bond)) return;

    const endA = graph.getAtom(bond.atomA);
    const endB = graph.getAtom(bond.atomB);
    if (!endA || !endB) return;

    const substituentsOf = (centerId, otherId) => graph.bondsForAtom(centerId)
      .filter((b) => b.id !== bond.id && b.order === 1 && idSet.has(b.atomA) && idSet.has(b.atomB))
      .map((b) => (b.atomA === centerId ? b.atomB : b.atomA));

    const subsA = substituentsOf(bond.atomA, bond.atomB);
    const subsB = substituentsOf(bond.atomB, bond.atomA);
    if (subsA.length > 2 || subsB.length > 2) return;
    while (subsA.length < 2) subsA.push(null);
    while (subsB.length < 2) subsB.push(null);

    const rankedA = cipRankSubstituents(graph, bond.atomA, subsA);
    const rankedB = cipRankSubstituents(graph, bond.atomB, subsB);
    if (rankedA.ties || rankedB.ties) return;

    const highA = rankedA.order[0].atomId;
    const highB = rankedB.order[0].atomId;
    const otherA = subsA[0] === highA ? subsA[1] : subsA[0];
    const otherB = subsB[0] === highB ? subsB[1] : subsB[0];

    const ax = endB.x - endA.x;
    const ay = endB.y - endA.y;
    const sideOfReal = (pointId, originAtom) => {
      const p = graph.getAtom(pointId);
      const cross = ax * (p.y - originAtom.y) - ay * (p.x - originAtom.x);
      return cross > 0 ? 1 : cross < 0 ? -1 : 0;
    };
    const sideOf = (pointId, otherId, originAtom) => (
      pointId === null ? -sideOfReal(otherId, originAtom) : sideOfReal(pointId, originAtom)
    );

    const sideHighA = sideOf(highA, otherA, endA);
    const sideHighB = sideOf(highB, otherB, endB);
    if (sideHighA === 0 || sideHighB === 0) return;

    results.push({ bondId: bond.id, type: sideHighA === sideHighB ? 'Z' : 'E' });
  });
  return results;
}

function ringCisTransPrefix(graph, atomIds) {
  const idSet = new Set(atomIds);
  const inside = (b) => idSet.has(b.atomA) && idSet.has(b.atomB);
  const ringBond = (b) => b.order === 1 && isRingDoubleBond(graph, atomIds, b);
  const faces = [];
  for (const id of atomIds) {
    const bonds = graph.bondsForAtom(id).filter(inside);
    const stereo = bonds.filter((b) => b.stereo && b.atomA === id);
    if (stereo.length === 0) continue;
    if (stereo.length !== 1 || bonds.length !== 3 || bonds.some((b) => b.order !== 1)) return '';
    const ring = bonds.filter(ringBond);
    if (ring.length !== 2 || ringBond(stereo[0])) return '';
    faces.push({ id, face: stereo[0].stereo === 'wedge' ? 1 : -1 });
  }
  if (faces.length !== 2) return '';
  const seen = new Set([faces[0].id]);
  const stack = [faces[0].id];
  while (stack.length) {
    const current = stack.pop();
    graph.bondsForAtom(current).filter((b) => inside(b) && ringBond(b)).forEach((b) => {
      const next = b.atomA === current ? b.atomB : b.atomA;
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    });
  }
  if (!seen.has(faces[1].id)) return '';
  return faces[0].face === faces[1].face ? 'cis-' : 'trans-';
}

function buildStereoPrefix(graph, atomIds, chainLocants) {
  if (!atomIds || atomIds.length === 0) return '';
  const centers = findStereocenters(graph, atomIds);
  const doubleBonds = findStereoDoubleBonds(graph, atomIds);
  const total = centers.length + doubleBonds.length;
  if (total === 0) return ringCisTransPrefix(graph, atomIds);
  if (total === 1) {
    const type = centers.length === 1 ? centers[0].type : doubleBonds[0].type;
    return '(' + type + ')-';
  }
  if (!chainLocants) return '';
  const descriptors = [];
  for (const center of centers) {
    const locant = chainLocants.get(center.atomId);
    if (locant === undefined) return '';
    descriptors.push({ locant, type: center.type });
  }
  for (const entry of doubleBonds) {
    const bond = graph.bonds.find((b) => b.id === entry.bondId);
    const a = chainLocants.get(bond.atomA);
    const b = chainLocants.get(bond.atomB);
    if (a === undefined || b === undefined || Math.abs(a - b) !== 1) return '';
    descriptors.push({ locant: Math.min(a, b), type: entry.type });
  }
  descriptors.sort((a, b) => parseInt(a.locant, 10) - parseInt(b.locant, 10) || String(a.locant).localeCompare(String(b.locant)));
  const locantSet = new Set(descriptors.map((entry) => entry.locant));
  if (locantSet.size !== descriptors.length) return '';
  return '(' + descriptors.map((entry) => entry.locant + entry.type).join(',') + ')-';
}
