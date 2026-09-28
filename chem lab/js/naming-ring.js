let lastRingStereoLocants = null;
function takeLastRingStereoLocants() {
  const locants = lastRingStereoLocants;
  lastRingStereoLocants = null;
  return locants;
}

let lastRingDisplayLocants = null;
let lastAromaticNumbering = null;
function takeLastRingDisplayLocants() {
  const locants = lastRingDisplayLocants;
  lastRingDisplayLocants = null;
  return locants;
}

function trimToRing(atomIds, bonds) {
  const remaining = new Set(atomIds);
  let active = bonds.slice();
  for (;;) {
    const degree = new Map();
    remaining.forEach((id) => degree.set(id, 0));
    active.forEach((bond) => {
      degree.set(bond.atomA, (degree.get(bond.atomA) || 0) + 1);
      degree.set(bond.atomB, (degree.get(bond.atomB) || 0) + 1);
    });
    const leaves = Array.from(remaining).filter((id) => (degree.get(id) || 0) < 2);
    if (leaves.length === 0) {
      return { remaining, active };
    }
    leaves.forEach((id) => remaining.delete(id));
    active = active.filter(
      (bond) => remaining.has(bond.atomA) && remaining.has(bond.atomB)
    );
  }
}

function orderRing(remaining, active) {
  const adjacency = new Map();
  remaining.forEach((id) => adjacency.set(id, []));
  active.forEach((bond) => {
    adjacency.get(bond.atomA).push(bond.atomB);
    adjacency.get(bond.atomB).push(bond.atomA);
  });
  for (const list of adjacency.values()) {
    if (list.length !== 2) {
      return null;
    }
  }

  const startId = Array.from(remaining).sort((a, b) => a - b)[0];
  const ring = [startId];
  const seen = new Set([startId]);
  let previousId = null;
  let currentId = startId;
  for (;;) {
    const options = adjacency.get(currentId).filter((id) => id !== previousId);
    const nextId = options[0];
    if (nextId === undefined) {
      return null;
    }
    if (nextId === startId) {
      break;
    }
    if (seen.has(nextId)) {
      return null;
    }
    seen.add(nextId);
    ring.push(nextId);
    previousId = currentId;
    currentId = nextId;
  }
  if (ring.length !== remaining.size) {
    return null;
  }
  return ring;
}

function cycleBondOrders(graph, cycle) {
  const orders = [];
  for (let i = 0; i < cycle.length; i++) {
    const bond = graph.getBond(cycle[i], cycle[(i + 1) % cycle.length]);
    if (!bond) {
      return null;
    }
    orders.push(bond.order);
  }
  return orders;
}

function hasAlternatingOrders(orders) {
  return orders.every(
    (order, i) =>
      (order === 1 || order === 2) && order !== orders[(i + 1) % orders.length]
  );
}

function ringBondLocant(locants, bondIndex, size) {
  const a = locants[bondIndex];
  const b = locants[(bondIndex + 1) % size];
  const low = Math.min(a, b);
  const high = Math.max(a, b);
  return low === 1 && high === size ? size : low;
}

function chooseRingNumbering(size, principal, unsaturations, substituents, anchorIndex) {
  let best = null;
  const starts = [];
  if (anchorIndex === undefined || anchorIndex === null) {
    for (let start = 0; start < size; start++) {
      starts.push(start);
    }
  } else {
    starts.push(anchorIndex);
  }
  for (const start of starts) {
    for (const direction of [1, -1]) {
      const locants = [];
      for (let position = 0; position < size; position++) {
        locants.push(((((position - start) * direction) % size) + size) % size + 1);
      }
      const key = [];
      if (principal) {
        principal.locants
          .map((index) => locants[index])
          .sort((a, b) => a - b)
          .forEach((locant) => key.push(locant));
      }
      unsaturations
        .map((entry) => ringBondLocant(locants, entry.index, size))
        .sort((a, b) => a - b)
        .forEach((locant) => key.push(locant));
      substituents
        .map((entry) => locants[entry.index])
        .sort((a, b) => a - b)
        .forEach((locant) => key.push(locant));
      const cited = citationOrderLocants(substituents, locants);
      const order = best ? compareLocantLists(key, best.key) : -1;
      if (order < 0 || (order === 0 && compareLocantLists(cited, best.cited) < 0)) {
        best = { key, locants, cited };
      }
    }
  }
  return best ? best.locants : null;
}

function buildRingPrefix(substituents, locants, showLocants) {
  return assembleSubstituentPrefix(
    substituents.map((entry) => ({ name: entry.name, locant: locants[entry.index] })),
    showLocants
  );
}

function selectRingPrincipal(candidates) {
  const groups = candidates.filter((group) => group.locants.length > 0);
  const principal = groups.length > 0 ? groups[0] : null;
  return { ok: true, principal, demoted: groups.slice(1) };
}

function demoteSecondaryGroups(demoted, substituents) {
  for (const group of demoted) {
    const prefixName = SECONDARY_PREFIX_NAMES[group.kind];
    if (!prefixName) {
      return false;
    }
    for (const index of group.locants) {
      substituents.push({ name: prefixName, index });
    }
  }
  return true;
}

function classifyBenzenePrincipal(name) {
  if (name === 'carboxy') {
    return { rank: 0, build: (prefix) => prefix + 'benzoic acid' };
  }
  const ester = /^([a-z]+)oxycarbonyl$/.exec(name);
  if (ester) {
    return { rank: 1, build: (prefix) => ester[1] + 'yl ' + prefix + 'benzoate' };
  }
  const amide = /^(?:\((N[^()]*)carbamoyl\)|(carbamoyl))$/.exec(name);
  if (amide) {
    const nPrefix = amide[1] || '';
    return { rank: 2, build: (prefix) => (nPrefix && prefix ? prefix.replace(/-$/, '') + '-' + nPrefix : nPrefix + prefix) + 'benzamide' };
  }
  if (name === 'cyano') {
    return { rank: 3, build: (prefix) => prefix + 'benzonitrile' };
  }
  if (name === 'formyl') {
    return { rank: 4, build: (prefix) => prefix + 'benzaldehyde' };
  }
  return null;
}

function nameBenzenePrincipalRing(size, acc) {
  let chosen = null;
  acc.substituents.forEach((entry, position) => {
    const info = classifyBenzenePrincipal(entry.name);
    if (info && (!chosen || info.rank < chosen.info.rank)) {
      chosen = { info, position, entry };
    }
  });
  if (!chosen) {
    return null;
  }
  const rivals = acc.substituents.filter((entry) => {
    const info = classifyBenzenePrincipal(entry.name);
    return info && info.rank === chosen.info.rank;
  });
  if (rivals.length > 1) {
    return null;
  }
  const others = acc.substituents.filter((entry, position) => position !== chosen.position);
  acc.hydroxyls.forEach((index) => others.push({ name: 'hydroxy', index }));
  acc.thiols.forEach((index) => others.push({ name: 'mercapto', index }));
  acc.amines.forEach((index) => others.push({ name: 'amino', index }));
  const locants = chooseRingNumbering(size, { locants: [chosen.entry.index] }, [], others);
  if (!locants) {
    return null;
  }
  const prefix = buildRingPrefix(others, locants, true);
  if (prefix === null) {
    return null;
  }
  lastAromaticNumbering = locants;
  return chosen.info.build(prefix ? prefix + (chosen.info.rank === 2 ? '' : '') : '');
}

function nameAromaticRing(size, acc) {
  if (acc.carbonyls.length > 0) {
    return null;
  }
  const benzeneAcid = nameBenzenePrincipalRing(size, acc);
  if (benzeneAcid) {
    return benzeneAcid;
  }
  const selection = selectRingPrincipal([
    { kind: 'alcohol', locants: acc.hydroxyls },
    { kind: 'thiol', locants: acc.thiols },
    { kind: 'amine', locants: acc.amines },
  ]);
  if (!selection.ok || !demoteSecondaryGroups(selection.demoted, acc.substituents)) {
    return null;
  }
  const principal = selection.principal;
  const locants = chooseRingNumbering(size, principal, [], acc.substituents);
  if (!locants) {
    return null;
  }
  const principalLocants = principal
    ? principal.locants.map((index) => locants[index]).sort((a, b) => a - b)
    : null;
  const showLocants = acc.substituents.length + (principalLocants ? principalLocants.length : 0) > 1;
  const prefix = buildRingPrefix(acc.substituents, locants, showLocants);
  if (prefix === null) {
    return null;
  }
  const core = attachSuffix(
    'benzen',
    principal ? { kind: principal.kind, locants: showLocants ? principalLocants : [1] } : null,
    showLocants
  );
  if (core === null) {
    return null;
  }
  lastAromaticNumbering = locants;
  return prefix + core;
}
function findRingHeteroatoms(graph, ring) {
  const found = [];
  let invalid = false;
  ring.forEach((id, index) => {
    const atom = graph.getAtom(id);
    if (!atom) {
      invalid = true;
      return;
    }
    if (atom.element === 'C') {
      return;
    }
    if (atom.element !== 'N' && atom.element !== 'O' && atom.element !== 'S') {
      invalid = true;
      return;
    }
    found.push({ index, element: atom.element });
  });
  if (invalid || found.length > 2) {
    return 'invalid';
  }
  return found.length === 0 ? null : found;
}

const HETERO_SENIORITY = { O: 0, S: 1, N: 2 };

function chooseHeteroRingNumbering(size, heteroList, principal, unsaturations, substituents, allowedStarts) {
  let best = null;
  const starts = allowedStarts && allowedStarts.length ? allowedStarts : heteroList.map((h) => h.index);
  for (const start of starts) {
    for (const direction of [1, -1]) {
      const locants = [];
      for (let position = 0; position < size; position++) {
        locants.push(((((position - start) * direction) % size) + size) % size + 1);
      }
      const heteroInfo = heteroList
        .map((h) => ({ element: h.element, locant: locants[h.index] }))
        .sort((a, b) => HETERO_SENIORITY[a.element] - HETERO_SENIORITY[b.element] || a.locant - b.locant);
      const key = heteroInfo.map((h) => h.locant);
      if (principal) {
        principal.locants
          .map((index) => locants[index])
          .sort((a, b) => a - b)
          .forEach((locant) => key.push(locant));
      }
      unsaturations
        .map((entry) => ringBondLocant(locants, entry.index, size))
        .sort((a, b) => a - b)
        .forEach((locant) => key.push(locant));
      substituents
        .map((entry) => locants[entry.index])
        .sort((a, b) => a - b)
        .forEach((locant) => key.push(locant));
      const cited = citationOrderLocants(substituents, locants);
      const order = best ? compareLocantLists(key, best.key) : -1;
      if (order < 0 || (order === 0 && compareLocantLists(cited, best.cited) < 0)) {
        best = { key, locants, heteroInfo, cited };
      }
    }
  }
  return best;
}

const DIHETEROCYCLE_NAMES = {
  '6:NN:1': { stem: 'pyridazin', bare: 'pyridazine' },
  '6:NN:2': { stem: 'pyrimidin', bare: 'pyrimidine' },
  '6:NN:3': { stem: 'pyrazin', bare: 'pyrazine' },
  '5:NN:1': { stem: 'pyrazol', bare: 'pyrazole' },
  '5:NN:2': { stem: 'imidazol', bare: 'imidazole' },
  '5:ON:1': { stem: 'isoxazol', bare: 'isoxazole' },
  '5:ON:2': { stem: 'oxazol', bare: 'oxazole' },
  '5:SN:1': { stem: 'isothiazol', bare: 'isothiazole' },
  '5:SN:2': { stem: 'thiazol', bare: 'thiazole' },
};

function nameDiheterocycle(graph, idSet, adjacency, ring, heteroList, ringOrders) {
  const size = ring.length;
  if (size !== 5 && size !== 6) {
    return null;
  }

  let allowedStarts;
  if (size === 6) {
    if (!hasAlternatingOrders(ringOrders)) {
      return null;
    }
    allowedStarts = heteroList.map((h) => h.index);
  } else {
    allowedStarts = heteroList.filter((h) => hasFuranPattern(ringOrders, h.index)).map((h) => h.index);
    if (allowedStarts.length === 0) {
      return null;
    }
  }

  const ringSet = new Set(ring);
  const visited = new Set(ring);
  const acc = createAttachmentAccumulator();
  for (let i = 0; i < size; i++) {
    if (!collectCoreAttachments(graph, adjacency, ring[i], i, ringSet, acc, visited, true)) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }
  if (acc.carbonyls.length > 0) {
    return null;
  }

  const selection = selectRingPrincipal([
    { kind: 'alcohol', locants: acc.hydroxyls },
    { kind: 'thiol', locants: acc.thiols },
    { kind: 'amine', locants: acc.amines },
  ]);
  if (!selection.ok || !demoteSecondaryGroups(selection.demoted, acc.substituents)) {
    return null;
  }
  const principal = selection.principal;

  const best = chooseHeteroRingNumbering(size, heteroList, principal, [], acc.substituents, allowedStarts);
  if (!best) {
    return null;
  }
  const gap = best.heteroInfo[1].locant - best.heteroInfo[0].locant;
  const key = size + ':' + best.heteroInfo.map((h) => h.element).join('') + ':' + gap;
  const info = DIHETEROCYCLE_NAMES[key];
  if (!info) {
    return null;
  }

  const locants = best.locants;
  const principalLocants = principal
    ? principal.locants.map((index) => locants[index]).sort((a, b) => a - b)
    : null;
  const showLocants = acc.substituents.length + (principalLocants ? principalLocants.length : 0) > 0;
  const prefix = buildRingPrefix(acc.substituents, locants, showLocants);
  if (prefix === null) {
    return null;
  }
  const core = principal
    ? attachSuffix(info.stem, { kind: principal.kind, locants: principalLocants }, showLocants)
    : info.bare;
  if (core === null) {
    return null;
  }
  return prefix + core;
}

function hasFuranPattern(orders, heteroIndex) {
  const size = orders.length;
  return (
    size === 5 &&
    orders[heteroIndex] === 1 &&
    orders[(heteroIndex + 1) % 5] === 2 &&
    orders[(heteroIndex + 2) % 5] === 1 &&
    orders[(heteroIndex + 3) % 5] === 2 &&
    orders[(heteroIndex + 4) % 5] === 1
  );
}

const HETEROCYCLE_NAMES = {
  '6:N': { stem: 'pyridin', bare: 'pyridine' },
  '5:N': { stem: 'pyrrol', bare: 'pyrrole' },
  '5:O': { stem: 'furan', bare: 'furan' },
  '5:S': { stem: 'thiophen', bare: 'thiophene' },
};

function nameHeterocycle(graph, idSet, adjacency, ring, hetero, ringOrders) {
  const size = ring.length;
  const key = size + ':' + hetero.element;
  const info = HETEROCYCLE_NAMES[key];
  if (!info) {
    return null;
  }
  if (size === 6) {
    if (!hasAlternatingOrders(ringOrders)) {
      return null;
    }
  } else if (size === 5) {
    if (!hasFuranPattern(ringOrders, hetero.index)) {
      return null;
    }
  } else {
    return null;
  }

  const ringSet = new Set(ring);
  const visited = new Set(ring);
  const acc = createAttachmentAccumulator();
  for (let i = 0; i < size; i++) {
    if (!collectCoreAttachments(graph, adjacency, ring[i], i, ringSet, acc, visited, true)) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }
  if (acc.carbonyls.length > 0) {
    return null;
  }

  const selection = selectRingPrincipal([
    { kind: 'alcohol', locants: acc.hydroxyls },
    { kind: 'thiol', locants: acc.thiols },
    { kind: 'amine', locants: acc.amines },
  ]);
  if (!selection.ok || !demoteSecondaryGroups(selection.demoted, acc.substituents)) {
    return null;
  }
  const principal = selection.principal;

  const locants = chooseRingNumbering(size, principal, [], acc.substituents, hetero.index);
  if (!locants) {
    return null;
  }
  const principalLocants = principal
    ? principal.locants.map((index) => locants[index]).sort((a, b) => a - b)
    : null;
  const showLocants = acc.substituents.length + (principalLocants ? principalLocants.length : 0) > 0;
  const prefix = buildRingPrefix(acc.substituents, locants, showLocants);
  if (prefix === null) {
    return null;
  }
  const core = principal
    ? attachSuffix(info.stem, { kind: principal.kind, locants: principalLocants }, showLocants)
    : info.bare;
  if (core === null) {
    return null;
  }
  return prefix + core;
}

const SATURATED_HETEROCYCLE_NAMES = {
  '3:O': { stem: 'oxiran', bare: 'oxirane' },
  '3:N': { stem: 'aziridin', bare: 'aziridine' },
  '3:S': { stem: 'thiiran', bare: 'thiirane' },
  '4:O': { stem: 'oxetan', bare: 'oxetane' },
  '4:S': { stem: 'thietan', bare: 'thietane' },
  '6:O': { stem: 'oxan', bare: 'oxane' },
  '6:S': { stem: 'thian', bare: 'thiane' },
  '7:O': { stem: 'oxepan', bare: 'oxepane' },
  '6:N': { stem: 'piperidin', bare: 'piperidine' },
  '5:N': { stem: 'pyrrolidin', bare: 'pyrrolidine' },
  '4:N': { stem: 'azetidin', bare: 'azetidine' },
  '5:O': { stem: 'tetrahydrofuran', bare: 'tetrahydrofuran' },
  '5:S': { stem: 'tetrahydrothiophen', bare: 'tetrahydrothiophene' },
  '7:N': { stem: 'azepan', bare: 'azepane' },
  '7:S': { stem: 'thiepan', bare: 'thiepane' },
  '8:N': { stem: 'azocan', bare: 'azocane' },
  '8:O': { stem: 'oxocan', bare: 'oxocane' },
  '8:S': { stem: 'thiocan', bare: 'thiocane' },
};

function nameSaturatedHeterocycle(graph, idSet, adjacency, ring, hetero, ringOrders) {
  if (!ringOrders.every((order) => order === 1)) {
    return null;
  }
  const size = ring.length;
  const key = size + ':' + hetero.element;
  const info = SATURATED_HETEROCYCLE_NAMES[key];
  if (!info) {
    return null;
  }

  const ringSet = new Set(ring);
  const visited = new Set(ring);
  const acc = createAttachmentAccumulator();
  for (let i = 0; i < size; i++) {
    if (!collectCoreAttachments(graph, adjacency, ring[i], i, ringSet, acc, visited, true)) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }
  if (acc.carbonyls.length > 0) {
    return null;
  }

  const selection = selectRingPrincipal([
    { kind: 'alcohol', locants: acc.hydroxyls },
    { kind: 'thiol', locants: acc.thiols },
    { kind: 'amine', locants: acc.amines },
  ]);
  if (!selection.ok || !demoteSecondaryGroups(selection.demoted, acc.substituents)) {
    return null;
  }
  const principal = selection.principal;

  const locants = chooseRingNumbering(size, principal, [], acc.substituents, hetero.index);
  if (!locants) {
    return null;
  }
  const principalLocants = principal
    ? principal.locants.map((index) => locants[index]).sort((a, b) => a - b)
    : null;
  const showLocants = acc.substituents.length + (principalLocants ? principalLocants.length : 0) > 0;
  const prefix = buildRingPrefix(acc.substituents, locants, showLocants);
  if (prefix === null) {
    return null;
  }
  const core = principal
    ? attachSuffix(info.stem, { kind: principal.kind, locants: principalLocants }, showLocants)
    : info.bare;
  if (core === null) {
    return null;
  }
  const ringLocantMap = new Map();
  ring.forEach((id, index) => ringLocantMap.set(id, locants[index]));
  lastRingStereoLocants = ringLocantMap;
  return prefix + core;
}

const SATURATED_DIHETEROCYCLE_NAMES = {
  '6:ON:3': { stem: 'morpholin', bare: 'morpholine' },
  '6:SN:3': { stem: 'thiomorpholin', bare: 'thiomorpholine' },
  '6:NN:3': { stem: 'piperazin', bare: 'piperazine' },
  '6:ON:2': { stem: '1,3-oxazinan', bare: '1,3-oxazinane' },
  '6:SN:2': { stem: '1,3-thiazinan', bare: '1,3-thiazinane' },
  '6:NN:1': { stem: 'hexahydropyridazin', bare: 'hexahydropyridazine' },
  '6:NN:2': { stem: 'hexahydropyrimidin', bare: 'hexahydropyrimidine' },
  '6:OO:1': { stem: '1,2-dioxan', bare: '1,2-dioxane' },
  '6:OO:2': { stem: '1,3-dioxan', bare: '1,3-dioxane' },
  '6:OO:3': { stem: '1,4-dioxan', bare: '1,4-dioxane' },
  '6:SS:2': { stem: '1,3-dithian', bare: '1,3-dithiane' },
  '6:SS:3': { stem: '1,4-dithian', bare: '1,4-dithiane' },
  '5:OO:1': { stem: '1,2-dioxolan', bare: '1,2-dioxolane' },
  '5:OO:2': { stem: '1,3-dioxolan', bare: '1,3-dioxolane' },
  '5:SS:1': { stem: '1,2-dithiolan', bare: '1,2-dithiolane' },
  '6:SS:1': { stem: '1,2-dithian', bare: '1,2-dithiane' },
  '5:SS:2': { stem: '1,3-dithiolan', bare: '1,3-dithiolane' },
  '5:NN:1': { stem: 'pyrazolidin', bare: 'pyrazolidine' },
  '5:NN:2': { stem: 'imidazolidin', bare: 'imidazolidine' },
  '5:ON:1': { stem: 'isoxazolidin', bare: 'isoxazolidine' },
  '5:ON:2': { stem: '1,3-oxazolidin', bare: '1,3-oxazolidine' },
  '5:SN:1': { stem: 'isothiazolidin', bare: 'isothiazolidine' },
  '5:SN:2': { stem: '1,3-thiazolidin', bare: '1,3-thiazolidine' },
};

function nameSaturatedDiheterocycle(graph, idSet, adjacency, ring, heteroList, ringOrders) {
  if (!ringOrders.every((order) => order === 1)) {
    return null;
  }
  const size = ring.length;
  if (size !== 6 && size !== 5) {
    return null;
  }
  const allowedStarts = heteroList.map((h) => h.index);

  const ringSet = new Set(ring);
  const visited = new Set(ring);
  const acc = createAttachmentAccumulator();
  for (let i = 0; i < size; i++) {
    if (!collectCoreAttachments(graph, adjacency, ring[i], i, ringSet, acc, visited, true)) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }
  if (acc.carbonyls.length > 0) {
    return null;
  }

  const selection = selectRingPrincipal([
    { kind: 'alcohol', locants: acc.hydroxyls },
    { kind: 'thiol', locants: acc.thiols },
    { kind: 'amine', locants: acc.amines },
  ]);
  if (!selection.ok || !demoteSecondaryGroups(selection.demoted, acc.substituents)) {
    return null;
  }
  const principal = selection.principal;

  const best = chooseHeteroRingNumbering(size, heteroList, principal, [], acc.substituents, allowedStarts);
  if (!best) {
    return null;
  }
  const gap = best.heteroInfo[1].locant - best.heteroInfo[0].locant;
  const key = size + ':' + best.heteroInfo.map((h) => h.element).join('') + ':' + gap;
  const info = SATURATED_DIHETEROCYCLE_NAMES[key];
  if (!info) {
    return null;
  }

  const locants = best.locants;
  const principalLocants = principal
    ? principal.locants.map((index) => locants[index]).sort((a, b) => a - b)
    : null;
  const showLocants = acc.substituents.length + (principalLocants ? principalLocants.length : 0) > 0;
  const prefix = buildRingPrefix(acc.substituents, locants, showLocants);
  if (prefix === null) {
    return null;
  }
  const core = principal
    ? attachSuffix(info.stem, { kind: principal.kind, locants: principalLocants }, showLocants)
    : info.bare;
  if (core === null) {
    return null;
  }
  const ringLocantMap = new Map();
  ring.forEach((id, index) => ringLocantMap.set(id, locants[index]));
  lastRingStereoLocants = ringLocantMap;
  return prefix + (prefix && /^[0-9]/.test(core) ? '-' : '') + core;
}

function nameForRing(graph, idSet, adjacency, ring, hetero) {
  const size = ring.length;
  const ringSet = new Set(ring);

  const ringOrders = cycleBondOrders(graph, ring);
  if (!ringOrders) {
    return null;
  }
  if (hetero) {
    if (hetero.length === 1) {
      return (
        nameHeterocycle(graph, idSet, adjacency, ring, hetero[0], ringOrders) ||
        nameSaturatedHeterocycle(graph, idSet, adjacency, ring, hetero[0], ringOrders)
      );
    }
    if (hetero.length === 2) {
      return (
        nameDiheterocycle(graph, idSet, adjacency, ring, hetero, ringOrders) ||
        nameSaturatedDiheterocycle(graph, idSet, adjacency, ring, hetero, ringOrders)
      );
    }
    return null;
  }
  const aromatic = size === 6 && hasAlternatingOrders(ringOrders);
  if (aromatic) {
    const phenethylamine = namePhenethylamine(graph, idSet, adjacency, ring, ringSet);
    if (phenethylamine) {
      return phenethylamine.name;
    }
    const amphetamine = nameAmphetamine(graph, idSet, adjacency, ring, ringSet);
    if (amphetamine) {
      return amphetamine.name;
    }
  }

  const visited = new Set(ring);
  const acc = createAttachmentAccumulator();

  for (let i = 0; i < size; i++) {
    if (
      !collectCoreAttachments(graph, adjacency, ring[i], i, ringSet, acc, visited, true, true)
    ) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }

  if (aromatic) {
    lastAromaticNumbering = null;
    const aromaticName = nameAromaticRing(size, acc);
    if (aromaticName && lastAromaticNumbering) {
      const numbering = lastAromaticNumbering;
      lastRingDisplayLocants = new Map(ring.map((id, index) => [id, numbering[index]]));
    }
    lastAromaticNumbering = null;
    return aromaticName;
  }

  const unsaturations = [];
  ringOrders.forEach((order, index) => {
    if (order === 2 || order === 3) {
      unsaturations.push({ kind: order, index });
    }
  });
  if (unsaturations.length > 1) {
    return null;
  }

  for (const index of acc.carbonyls) {
    if (acc.hydroxyls.indexOf(index) !== -1) {
      return null;
    }
  }

  const selection = selectRingPrincipal([
    { kind: 'ketone', locants: acc.carbonyls },
    { kind: 'oxime', locants: acc.oximes },
    { kind: 'alcohol', locants: acc.hydroxyls },
    { kind: 'thiol', locants: acc.thiols },
    { kind: 'amine', locants: acc.amines },
  ]);
  if (!selection.ok || !demoteSecondaryGroups(selection.demoted, acc.substituents)) {
    return null;
  }
  const principal = selection.principal;

  const root = NAME_ROOTS[size];
  if (!root) {
    return null;
  }

  const locants = chooseRingNumbering(size, principal, unsaturations, acc.substituents);
  if (!locants) {
    return null;
  }
  const loneSuffix =
    unsaturations.length === 0 &&
    ((principal && principal.locants.length === 1 && acc.substituents.length === 0) ||
      (!principal && acc.substituents.length === 1));
  const showLocants = !loneSuffix && (size >= 4 || acc.substituents.length + (principal ? principal.locants.length : 0) > 1);

  const unsaturation =
    unsaturations.length === 1
      ? {
          kind: unsaturations[0].kind,
          locant: ringBondLocant(locants, unsaturations[0].index, size),
        }
      : null;
  const stem = buildStem('cyclo' + root, unsaturation, showLocants);
  const core = attachSuffix(
    stem,
    principal
      ? {
          kind: principal.kind,
          locants: principal.locants.map((index) => locants[index]).sort((a, b) => a - b),
        }
      : null,
    showLocants
  );
  if (core === null) {
    return null;
  }
  const prefix = buildRingPrefix(acc.substituents, locants, showLocants);
  if (prefix === null) {
    return null;
  }
  const ringLocantMap = new Map();
  ring.forEach((id, index) => ringLocantMap.set(id, locants[index]));
  lastRingStereoLocants = ringLocantMap;
  return prefix + core;
}

function deriveRingName(graph, atomIds, bonds, ringAtomIds, ringBonds) {
  lastRingStereoLocants = null;
  lastRingDisplayLocants = null;
  const trimmed = trimToRing(ringAtomIds || atomIds, ringBonds || bonds);
  if (trimmed.remaining.size < MIN_RING_SIZE || trimmed.remaining.size > MAX_RING_SIZE) {
    return null;
  }
  const ring = orderRing(trimmed.remaining, trimmed.active);
  if (!ring) {
    return null;
  }
  const hetero = findRingHeteroatoms(graph, ring);
  if (hetero === 'invalid') {
    return null;
  }
  return nameForRing(graph, new Set(atomIds), buildAdjacency(atomIds, bonds), ring, hetero);
}
