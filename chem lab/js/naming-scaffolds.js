let lastScaffoldStereoLocants = null;
function takeLastScaffoldStereoLocants() {
  const locants = lastScaffoldStereoLocants;
  lastScaffoldStereoLocants = null;
  return locants;
}

function matchEthylamineChain(graph, adjacency, coreIds, coreAtomId, allowAlphaBranch) {
  const external = (adjacency.get(coreAtomId) || []).filter(
    (entry) => !coreIds.has(entry.id)
  );
  if (external.length !== 1 || external[0].order !== 1) {
    return null;
  }
  const alpha = external[0].id;
  if (elementOf(graph, alpha) !== 'C') {
    return null;
  }
  const alphaNeighbors = (adjacency.get(alpha) || []).filter(
    (entry) => entry.id !== coreAtomId
  );
  if (alphaNeighbors.length !== 1 && !(allowAlphaBranch && alphaNeighbors.length === 2)) {
    return null;
  }
  let betaEntry = null;
  let alphaSubstituent = null;
  let alphaBranchAtoms = [];
  if (alphaNeighbors.length === 1) {
    betaEntry = alphaNeighbors[0];
  } else {
    for (let i = 0; i < 2; i++) {
      const candidateBeta = alphaNeighbors[i];
      const candidateBranch = alphaNeighbors[1 - i];
      if (candidateBeta.order !== 1 || coreIds.has(candidateBeta.id)) {
        continue;
      }
      if (elementOf(graph, candidateBeta.id) !== 'C') {
        continue;
      }
      const candidateBetaNeighbors = adjacency.get(candidateBeta.id) || [];
      if (candidateBetaNeighbors.length !== 2 && candidateBetaNeighbors.length !== 3) {
        continue;
      }
      if (candidateBranch.order !== 1 || coreIds.has(candidateBranch.id)) {
        continue;
      }
      const resolved = resolveAlkylBranch(graph, adjacency, candidateBranch.id, alpha);
      if (!resolved) {
        continue;
      }
      betaEntry = candidateBeta;
      alphaSubstituent = resolved.name;
      alphaBranchAtoms = resolved.atoms;
      break;
    }
    if (!betaEntry) {
      return null;
    }
  }
  if (!betaEntry || betaEntry.order !== 1 || coreIds.has(betaEntry.id)) {
    return null;
  }
  const beta = betaEntry.id;
  if (elementOf(graph, beta) !== 'C') {
    return null;
  }
  const betaNeighbors = adjacency.get(beta) || [];
  if (betaNeighbors.length !== 2 && !(allowAlphaBranch && betaNeighbors.length === 3)) {
    return null;
  }
  const betaOthers = betaNeighbors.filter((entry) => entry.id !== alpha);
  const nitrogenEntry = betaOthers.find((entry) => elementOf(graph, entry.id) === 'N');
  if (!nitrogenEntry || nitrogenEntry.order !== 1 || coreIds.has(nitrogenEntry.id)) {
    return null;
  }
  const nitrogen = nitrogenEntry.id;
  let aminoCarbonSubstituent = null;
  let aminoCarbonAtoms = [];
  const aminoCarbonBranch = betaOthers.find((entry) => entry.id !== nitrogen);
  if (aminoCarbonBranch) {
    if (aminoCarbonBranch.order !== 1 || coreIds.has(aminoCarbonBranch.id)) {
      return null;
    }
    const resolved = resolveAlkylBranch(graph, adjacency, aminoCarbonBranch.id, beta);
    if (!resolved) {
      return null;
    }
    aminoCarbonSubstituent = resolved.name;
    aminoCarbonAtoms = resolved.atoms;
  }
  const extras = (adjacency.get(nitrogen) || []).filter((entry) => entry.id !== beta);
  if (extras.length > 2) {
    return null;
  }
  const atoms = [alpha, beta, nitrogen].concat(alphaBranchAtoms, aminoCarbonAtoms);
  const substituents = [];
  for (const extra of extras) {
    if (extra.order !== 1 || coreIds.has(extra.id)) {
      return null;
    }
    const resolved = resolveAminoSubstituent(graph, adjacency, extra.id, nitrogen);
    if (!resolved) {
      return null;
    }
    substituents.push(resolved.name);
    resolved.atoms.forEach((id) => atoms.push(id));
  }
  return { alpha, beta, nitrogen, substituents, atoms, alphaSubstituent: aminoCarbonSubstituent, betaSubstituent: alphaSubstituent };
}
function namePhenethylamine(graph, idSet, adjacency, ring, ringSet) {
  const matches = [];
  ring.forEach((id, index) => {
    const match = matchEthylamineChain(graph, adjacency, ringSet, id);
    if (match) {
      matches.push({ index, match });
    }
  });
  if (matches.length === 0) {
    return null;
  }
  if (matches.length > 1) {
    return { blocked: true, name: null };
  }
  const anchor = matches[0];
  const skip = new Set(ringSet);
  const visited = new Set(ringSet);
  anchor.match.atoms.forEach((id) => {
    skip.add(id);
    visited.add(id);
  });
  const acc = createAttachmentAccumulator();
  for (let i = 0; i < ring.length; i++) {
    if (!collectCoreAttachments(graph, adjacency, ring[i], i, skip, acc, visited, true)) {
      return { blocked: true, name: null };
    }
  }
  if (visited.size !== idSet.size) {
    return { blocked: true, name: null };
  }
  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return { blocked: true, name: null };
  }
  const locants = chooseRingNumbering(ring.length, null, [], entries, anchor.index);
  if (!locants) {
    return { blocked: true, name: null };
  }
  const prefix = buildRingPrefix(entries, locants, true);
  if (prefix === null) {
    return { blocked: true, name: null };
  }
  const nitrogenPrefix = buildNitrogenPrefix(anchor.match.substituents);
  if (nitrogenPrefix === null) {
    return { blocked: true, name: null };
  }
  return {
    blocked: false,
    name:
      [prefix, nitrogenPrefix].filter((part) => part !== '').join('-') +
      'phenethylamine',
  };
}
function matchAmphetamineChain(graph, adjacency, coreIds, coreAtomId) {
  const external = (adjacency.get(coreAtomId) || []).filter(
    (entry) => !coreIds.has(entry.id)
  );
  if (external.length !== 1 || external[0].order !== 1) {
    return null;
  }
  const alpha = external[0].id;
  if (elementOf(graph, alpha) !== 'C') {
    return null;
  }
  const alphaNeighbors = adjacency.get(alpha) || [];
  if (alphaNeighbors.length !== 2) {
    return null;
  }
  const betaEntry = alphaNeighbors.filter((entry) => entry.id !== coreAtomId)[0];
  if (!betaEntry || betaEntry.order !== 1 || coreIds.has(betaEntry.id)) {
    return null;
  }
  const beta = betaEntry.id;
  if (elementOf(graph, beta) !== 'C') {
    return null;
  }
  const betaNeighbors = adjacency.get(beta) || [];
  if (betaNeighbors.length !== 3) {
    return null;
  }
  const others = betaNeighbors.filter((entry) => entry.id !== alpha);
  if (others.length !== 2) {
    return null;
  }
  for (const entry of others) {
    if (entry.order !== 1 || coreIds.has(entry.id)) {
      return null;
    }
  }
  const nitrogenCandidates = others.filter((entry) => elementOf(graph, entry.id) === 'N');
  const methylCandidates = others.filter((entry) => elementOf(graph, entry.id) === 'C');
  if (nitrogenCandidates.length !== 1 || methylCandidates.length !== 1) {
    return null;
  }
  const nitrogen = nitrogenCandidates[0].id;
  const methyl = methylCandidates[0].id;
  const methylNeighbors = adjacency.get(methyl) || [];
  if (methylNeighbors.length !== 1) {
    return null;
  }
  const extras = (adjacency.get(nitrogen) || []).filter((entry) => entry.id !== beta);
  if (extras.length > 2) {
    return null;
  }
  const atoms = [alpha, beta, methyl, nitrogen];
  const substituents = [];
  for (const extra of extras) {
    if (extra.order !== 1 || coreIds.has(extra.id)) {
      return null;
    }
    if (elementOf(graph, extra.id) !== 'C') {
      return null;
    }
    const branch = collectBranch(graph, adjacency, extra.id, nitrogen);
    if (!branch) {
      return null;
    }
    const name = ALKYL_PREFIXES[branch.length];
    if (!name) {
      return null;
    }
    substituents.push(name);
    branch.forEach((id) => atoms.push(id));
  }
  return { alpha, beta, methyl, nitrogen, substituents, atoms };
}
function nameAmphetamine(graph, idSet, adjacency, ring, ringSet) {
  const matches = [];
  ring.forEach((id, index) => {
    const match = matchAmphetamineChain(graph, adjacency, ringSet, id);
    if (match) {
      matches.push({ index, match });
    }
  });
  if (matches.length === 0) {
    return null;
  }
  if (matches.length > 1) {
    return { blocked: true, name: null };
  }
  const anchor = matches[0];
  const skip = new Set(ringSet);
  const visited = new Set(ringSet);
  anchor.match.atoms.forEach((id) => {
    skip.add(id);
    visited.add(id);
  });
  const acc = createAttachmentAccumulator();
  for (let i = 0; i < ring.length; i++) {
    if (!collectCoreAttachments(graph, adjacency, ring[i], i, skip, acc, visited, true)) {
      return { blocked: true, name: null };
    }
  }
  if (visited.size !== idSet.size) {
    return { blocked: true, name: null };
  }
  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return { blocked: true, name: null };
  }
  const locants = chooseRingNumbering(ring.length, null, [], entries, anchor.index);
  if (!locants) {
    return { blocked: true, name: null };
  }
  const prefix = buildRingPrefix(entries, locants, true);
  if (prefix === null) {
    return { blocked: true, name: null };
  }
  const nitrogenPrefix = buildNitrogenPrefix(anchor.match.substituents);
  if (nitrogenPrefix === null) {
    return { blocked: true, name: null };
  }
  return {
    blocked: false,
    name:
      [prefix, nitrogenPrefix].filter((part) => part !== '').join('-') +
      'amphetamine',
  };
}
function arcBetween(cycle, fromIndex, toIndex) {
  const arc = [];
  let cursor = (fromIndex + 1) % cycle.length;
  while (cursor !== toIndex) {
    arc.push(cycle[cursor]);
    cursor = (cursor + 1) % cycle.length;
    if (arc.length > cycle.length) {
      return null;
    }
  }
  return arc;
}

function extractFusedCore(atomIds, bonds, coreAtomIds, coreBonds) {
  const trimmed = trimToRing(coreAtomIds || atomIds, coreBonds || bonds);
  const core = trimmed.remaining;
  const active = trimmed.active;
  if (core.size !== 9 || active.length !== 10) {
    return null;
  }
  const degree = new Map();
  core.forEach((id) => degree.set(id, 0));
  active.forEach((bond) => {
    degree.set(bond.atomA, (degree.get(bond.atomA) || 0) + 1);
    degree.set(bond.atomB, (degree.get(bond.atomB) || 0) + 1);
  });
  const fusion = [];
  for (const id of core) {
    const value = degree.get(id);
    if (value === 3) {
      fusion.push(id);
    } else if (value !== 2) {
      return null;
    }
  }
  if (fusion.length !== 2) {
    return null;
  }
  const first = fusion[0];
  const second = fusion[1];
  const shared = active.filter(
    (bond) =>
      (bond.atomA === first && bond.atomB === second) ||
      (bond.atomA === second && bond.atomB === first)
  );
  if (shared.length !== 1) {
    return null;
  }
  const perimeterBonds = active.filter((bond) => bond !== shared[0]);
  const perimeter = orderRing(core, perimeterBonds);
  if (!perimeter || perimeter.length !== 9) {
    return null;
  }
  const firstIndex = perimeter.indexOf(first);
  const secondIndex = perimeter.indexOf(second);
  if (firstIndex === -1 || secondIndex === -1) {
    return null;
  }
  const arcOne = arcBetween(perimeter, firstIndex, secondIndex);
  const arcTwo = arcBetween(perimeter, secondIndex, firstIndex);
  if (!arcOne || !arcTwo) {
    return null;
  }
  if (arcOne.length === 3 && arcTwo.length === 4) {
    return { core, fusionA: first, fusionB: second, fiveArc: arcOne, sixArc: arcTwo };
  }
  if (arcOne.length === 4 && arcTwo.length === 3) {
    return { core, fusionA: second, fusionB: first, fiveArc: arcTwo, sixArc: arcOne };
  }
  return null;
}

function indoleOrientations(graph, core) {
  const five = core.fiveArc;
  const options = [];
  if (elementOf(graph, five[0]) === 'N') {
    options.push({
      n1: five[0],
      c2: five[1],
      c3: five[2],
      c3a: core.fusionB,
      c7a: core.fusionA,
    });
  }
  if (elementOf(graph, five[2]) === 'N') {
    options.push({
      n1: five[2],
      c2: five[1],
      c3: five[0],
      c3a: core.fusionA,
      c7a: core.fusionB,
    });
  }
  return options;
}

function nameIndole(graph, idSet, adjacency, core, orientation) {
  const fiveBonds = [
    [orientation.n1, orientation.c2, 1],
    [orientation.c2, orientation.c3, 2],
    [orientation.c3, orientation.c3a, 1],
    [orientation.c3a, orientation.c7a, 2],
    [orientation.c7a, orientation.n1, 1],
  ];
  for (const expected of fiveBonds) {
    const bond = graph.getBond(expected[0], expected[1]);
    if (!bond || bond.order !== expected[2]) {
      return null;
    }
  }
  const sixOrder =
    orientation.c3a === core.fusionB ? core.sixArc.slice() : core.sixArc.slice().reverse();
  const sixOrders = cycleBondOrders(
    graph,
    [orientation.c3a].concat(sixOrder, [orientation.c7a])
  );
  if (!sixOrders || !hasAlternatingOrders(sixOrders)) {
    return null;
  }

  const coreIds = core.core;
  const chain = matchEthylamineChain(graph, adjacency, coreIds, orientation.c3, true);
  const skip = new Set(coreIds);
  const visited = new Set(coreIds);
  if (chain) {
    chain.atoms.forEach((id) => {
      skip.add(id);
      visited.add(id);
    });
  }

  const acc = createAttachmentAccumulator();
  const positions = [
    { id: orientation.n1, locant: 1 },
    { id: orientation.c2, locant: 2 },
    { id: sixOrder[0], locant: 4 },
    { id: sixOrder[1], locant: 5 },
    { id: sixOrder[2], locant: 6 },
    { id: sixOrder[3], locant: 7 },
  ];
  if (!chain) {
    positions.push({ id: orientation.c3, locant: 3 });
  }
  for (const position of positions) {
    if (
      !collectCoreAttachments(
        graph,
        adjacency,
        position.id,
        position.locant,
        skip,
        acc,
        visited,
        true
      )
    ) {
      return null;
    }
  }
  for (const fusionId of [orientation.c3a, orientation.c7a]) {
    const external = (adjacency.get(fusionId) || []).filter(
      (entry) => !skip.has(entry.id)
    );
    if (external.length > 0) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }

  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return null;
  }
  const ringPrefix = assembleSubstituentPrefix(
    entries.map((entry) => ({ name: entry.name, locant: entry.index })),
    true
  );
  if (ringPrefix === null) {
    return null;
  }
  if (!chain) {
    return ringPrefix + 'indole';
  }
  const nitrogenPrefix = buildNitrogenPrefix(chain.substituents);
  if (nitrogenPrefix === null) {
    return null;
  }
  const alphaPrefix = [
    chain.alphaSubstituent ? 'alpha-' + chain.alphaSubstituent : '',
    chain.betaSubstituent ? 'beta-' + chain.betaSubstituent : '',
  ].filter((part) => part !== '').join('-');
  return (
    [ringPrefix, alphaPrefix, nitrogenPrefix].filter((part) => part !== '').join('-') +
    'tryptamine'
  );
}

function nameMethylenedioxyScaffold(graph, idSet, adjacency, core) {
  const bridge = core.fiveArc;
  if (bridge.length !== 3) {
    return null;
  }
  const bridgeElements = bridge.map((id) => elementOf(graph, id));
  if (bridgeElements[0] !== 'O' || bridgeElements[1] !== 'C' || bridgeElements[2] !== 'O') {
    return null;
  }
  const coreIds = core.core;
  for (const id of bridge) {
    const external = (adjacency.get(id) || []).filter((entry) => !coreIds.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }
  const fusionA = core.fusionA;
  const fusionB = core.fusionB;
  const sixArc = core.sixArc;
  if (
    elementOf(graph, fusionA) !== 'C' ||
    elementOf(graph, fusionB) !== 'C' ||
    sixArc.some((id) => elementOf(graph, id) !== 'C')
  ) {
    return null;
  }
  const ringAtoms = [fusionA].concat(sixArc.slice().reverse(), [fusionB]);
  const benzeneOrders = cycleBondOrders(graph, ringAtoms);
  if (!benzeneOrders || !hasAlternatingOrders(benzeneOrders)) {
    return null;
  }
  for (const fusionId of [fusionA, fusionB]) {
    const external = (adjacency.get(fusionId) || []).filter((entry) => !coreIds.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }

  const matches = [];
  [1, 2, 3, 4].forEach((ringIndex) => {
    const id = ringAtoms[ringIndex];
    const amph = matchAmphetamineChain(graph, adjacency, coreIds, id);
    if (amph) {
      matches.push({ index: ringIndex, kind: 'amphetamine', match: amph });
      return;
    }
    const phen = matchEthylamineChain(graph, adjacency, coreIds, id);
    if (phen) {
      matches.push({ index: ringIndex, kind: 'phenethylamine', match: phen });
    }
  });
  if (matches.length > 1) {
    return null;
  }
  if (matches.length === 0) {
    return nameMethylenedioxyGenericScaffold(graph, idSet, adjacency, coreIds, ringAtoms);
  }
  const anchor = matches[0];

  const skip = new Set(coreIds);
  const visited = new Set(coreIds);
  anchor.match.atoms.forEach((id) => {
    skip.add(id);
    visited.add(id);
  });

  const acc = createAttachmentAccumulator();
  for (let i = 1; i <= 4; i++) {
    if (i === anchor.index) {
      continue;
    }
    if (!collectCoreAttachments(graph, adjacency, ringAtoms[i], i, skip, acc, visited, true)) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }
  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return null;
  }

  const bridgeEntries = [{ index: 0 }, { index: 5 }];
  const locants = chooseRingNumbering(6, null, [], entries.concat(bridgeEntries), anchor.index);
  if (!locants) {
    return null;
  }

  const bridgeLocants = [locants[0], locants[5]].sort((a, b) => a - b);
  const bridgePrefix = bridgeLocants.join(',') + '-methylenedioxy';
  const substituentPrefix = assembleSubstituentPrefix(
    entries.map((entry) => ({ name: entry.name, locant: locants[entry.index] })),
    true
  );
  if (substituentPrefix === null) {
    return null;
  }
  const corePrefix = [bridgePrefix, substituentPrefix].filter((part) => part !== '').sort().join('-');

  const nitrogenPrefix = buildNitrogenPrefix(anchor.match.substituents);
  if (nitrogenPrefix === null) {
    return null;
  }
  const suffix = anchor.kind === 'amphetamine' ? 'amphetamine' : 'phenethylamine';
  return [corePrefix, nitrogenPrefix].filter((part) => part !== '').join('-') + suffix;
}

function nameMethylenedioxyGenericScaffold(graph, idSet, adjacency, coreIds, ringAtoms) {
  const skip = new Set(coreIds);
  const visited = new Set(coreIds);
  const acc = createAttachmentAccumulator();
  for (let i = 1; i <= 4; i++) {
    if (!collectCoreAttachments(graph, adjacency, ringAtoms[i], i, skip, acc, visited, true)) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }
  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return null;
  }

  const bridgeEntries = [{ index: 0 }, { index: 5 }];
  const locants = chooseRingNumbering(6, null, [], entries.concat(bridgeEntries), null);
  if (!locants) {
    return null;
  }

  const bridgeLocants = [locants[0], locants[5]].sort((a, b) => a - b);
  const bridgePrefix = bridgeLocants.join(',') + '-methylenedioxy';
  const substituentPrefix = assembleSubstituentPrefix(
    entries.map((entry) => ({ name: entry.name, locant: locants[entry.index] })),
    true
  );
  if (substituentPrefix === null) {
    return null;
  }
  const corePrefix = [bridgePrefix, substituentPrefix].filter((part) => part !== '').sort().join('-');
  return corePrefix + 'benzene';
}

function benzofuranOrientations(graph, core, heteroElement) {
  const hetero = heteroElement || 'O';
  const five = core.fiveArc;
  const options = [];
  if (
    elementOf(graph, five[0]) === hetero &&
    elementOf(graph, five[1]) === 'C' &&
    elementOf(graph, five[2]) === 'C'
  ) {
    options.push({ o1: five[0], c2: five[1], c3: five[2], c3a: core.fusionB, c7a: core.fusionA });
  }
  if (
    elementOf(graph, five[2]) === hetero &&
    elementOf(graph, five[1]) === 'C' &&
    elementOf(graph, five[0]) === 'C'
  ) {
    options.push({ o1: five[2], c2: five[1], c3: five[0], c3a: core.fusionA, c7a: core.fusionB });
  }
  return options;
}

function nameBenzofuranScaffold(graph, idSet, adjacency, core, orientation, ringName) {
  const fiveBonds = [
    [orientation.o1, orientation.c2, 1],
    [orientation.c2, orientation.c3, 2],
    [orientation.c3, orientation.c3a, 1],
    [orientation.c3a, orientation.c7a, 2],
    [orientation.c7a, orientation.o1, 1],
  ];
  for (const expected of fiveBonds) {
    const bond = graph.getBond(expected[0], expected[1]);
    if (!bond || bond.order !== expected[2]) {
      return null;
    }
  }
  const sixOrder =
    orientation.c3a === core.fusionB ? core.sixArc.slice() : core.sixArc.slice().reverse();
  const sixOrders = cycleBondOrders(
    graph,
    [orientation.c3a].concat(sixOrder, [orientation.c7a])
  );
  if (!sixOrders || !hasAlternatingOrders(sixOrders)) {
    return null;
  }

  const coreIds = core.core;
  const matches = [];
  [0, 1, 2, 3].forEach((i) => {
    const id = sixOrder[i];
    const amph = matchAmphetamineChain(graph, adjacency, coreIds, id);
    if (amph) {
      matches.push({ locant: i + 4, kind: 'amphetamine', match: amph });
      return;
    }
    const phen = matchEthylamineChain(graph, adjacency, coreIds, id);
    if (phen) {
      matches.push({ locant: i + 4, kind: 'phenethylamine', match: phen });
    }
  });
  if (matches.length > 1) {
    return null;
  }
  if (matches.length === 0) {
    return nameBenzofuranGenericScaffold(graph, idSet, adjacency, core, orientation, sixOrder, ringName);
  }
  const anchor = matches[0];

  const skip = new Set(coreIds);
  const visited = new Set(coreIds);
  anchor.match.atoms.forEach((id) => {
    skip.add(id);
    visited.add(id);
  });

  for (const fusionId of [orientation.c3a, orientation.c7a]) {
    const external = (adjacency.get(fusionId) || []).filter((entry) => !skip.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }

  const acc = createAttachmentAccumulator();
  const positions = [
    { id: orientation.c2, locant: 2 },
    { id: orientation.c3, locant: 3 },
    { id: sixOrder[0], locant: 4 },
    { id: sixOrder[1], locant: 5 },
    { id: sixOrder[2], locant: 6 },
    { id: sixOrder[3], locant: 7 },
  ];
  for (const position of positions) {
    if (position.locant === anchor.locant) {
      continue;
    }
    if (
      !collectCoreAttachments(
        graph,
        adjacency,
        position.id,
        position.locant,
        skip,
        acc,
        visited,
        true
      )
    ) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }

  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return null;
  }

  let aminoPart;
  if (anchor.match.substituents.length === 0) {
    aminoPart = 'amino';
  } else if (anchor.match.substituents.length === 1) {
    aminoPart = anchor.match.substituents[0] + 'amino';
  } else if (
    anchor.match.substituents.length === 2 &&
    anchor.match.substituents[0] === anchor.match.substituents[1]
  ) {
    aminoPart = 'di' + anchor.match.substituents[0] + 'amino';
  } else {
    return null;
  }
  const chainSuffix = anchor.kind === 'amphetamine' ? 'propyl' : 'ethyl';
  const branchName = '(2-' + aminoPart + chainSuffix + ')';

  const allEntries = entries
    .map((entry) => ({ name: entry.name, locant: entry.index }))
    .concat([{ name: branchName, locant: anchor.locant }]);
  const prefix = assembleSubstituentPrefix(allEntries, true);
  if (prefix === null) {
    return null;
  }
  return prefix + (ringName || 'benzofuran');
}

function nameBenzofuranGenericScaffold(graph, idSet, adjacency, core, orientation, sixOrder, ringName) {
  const coreIds = core.core;
  for (const fusionId of [orientation.c3a, orientation.c7a]) {
    const external = (adjacency.get(fusionId) || []).filter((entry) => !coreIds.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }

  const skip = new Set(coreIds);
  const visited = new Set(coreIds);
  const acc = createAttachmentAccumulator();
  const positions = [
    { id: orientation.c2, locant: 2 },
    { id: orientation.c3, locant: 3 },
    { id: sixOrder[0], locant: 4 },
    { id: sixOrder[1], locant: 5 },
    { id: sixOrder[2], locant: 6 },
    { id: sixOrder[3], locant: 7 },
  ];
  for (const position of positions) {
    if (
      !collectCoreAttachments(graph, adjacency, position.id, position.locant, skip, acc, visited, true)
    ) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }

  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return null;
  }
  const prefix = assembleSubstituentPrefix(
    entries.map((entry) => ({ name: entry.name, locant: entry.index })),
    true
  );
  if (prefix === null) {
    return null;
  }
  return prefix + (ringName || 'benzofuran');
}

function extractNaphthaleneCore(atomIds, bonds) {
  const trimmed = trimToRing(atomIds, bonds);
  const core = trimmed.remaining;
  const active = trimmed.active;
  if (core.size !== 10 || active.length !== 11) {
    return null;
  }
  const degree = new Map();
  core.forEach((id) => degree.set(id, 0));
  active.forEach((bond) => {
    degree.set(bond.atomA, (degree.get(bond.atomA) || 0) + 1);
    degree.set(bond.atomB, (degree.get(bond.atomB) || 0) + 1);
  });
  const fusion = [];
  for (const id of core) {
    const value = degree.get(id);
    if (value === 3) {
      fusion.push(id);
    } else if (value !== 2) {
      return null;
    }
  }
  if (fusion.length !== 2) {
    return null;
  }
  const first = fusion[0];
  const second = fusion[1];
  const shared = active.filter(
    (bond) =>
      (bond.atomA === first && bond.atomB === second) ||
      (bond.atomA === second && bond.atomB === first)
  );
  if (shared.length !== 1) {
    return null;
  }
  const perimeterBonds = active.filter((bond) => bond !== shared[0]);
  const perimeter = orderRing(core, perimeterBonds);
  if (!perimeter || perimeter.length !== 10) {
    return null;
  }
  const firstIndex = perimeter.indexOf(first);
  const secondIndex = perimeter.indexOf(second);
  if (firstIndex === -1 || secondIndex === -1) {
    return null;
  }
  const arcOne = arcBetween(perimeter, firstIndex, secondIndex);
  const arcTwo = arcBetween(perimeter, secondIndex, firstIndex);
  if (!arcOne || !arcTwo || arcOne.length !== 4 || arcTwo.length !== 4) {
    return null;
  }
  return { core, fusionA: first, fusionB: second, arcOne, arcTwo };
}

function naphthaleneLocantOrders(arcOne, arcTwo) {
  const reverseOne = arcOne.slice().reverse();
  const reverseTwo = arcTwo.slice().reverse();
  return [
    arcOne.concat(arcTwo),
    reverseOne.concat(reverseTwo),
    arcTwo.concat(arcOne),
    reverseTwo.concat(reverseOne),
  ];
}

function isNaphthalenoidAromatic(graph, core, ringA, ringB) {
  const ordersA = cycleBondOrders(graph, ringA);
  const ordersB = cycleBondOrders(graph, ringB);
  if (!ordersA || !ordersB) {
    return false;
  }
  if (hasAlternatingOrders(ordersA) && hasAlternatingOrders(ordersB)) {
    return true;
  }
  const perimeter = [core.fusionA].concat(core.arcOne, [core.fusionB], core.arcTwo);
  const perimeterOrders = cycleBondOrders(graph, perimeter);
  const fusionBond = graph.getBond(core.fusionA, core.fusionB);
  return Boolean(
    perimeterOrders &&
      hasAlternatingOrders(perimeterOrders) &&
      fusionBond &&
      fusionBond.order === 1
  );
}

function nameNaphthalene(graph, idSet, adjacency, core) {
  for (const id of core.core) {
    if (elementOf(graph, id) !== 'C') {
      return null;
    }
  }
  const ringA = [core.fusionA].concat(core.arcOne, [core.fusionB]);
  const ringB = [core.fusionB].concat(core.arcTwo, [core.fusionA]);
  if (!isNaphthalenoidAromatic(graph, core, ringA, ringB)) {
    return null;
  }

  const skip = new Set(core.core);
  const visited = new Set(core.core);
  for (const fusionId of [core.fusionA, core.fusionB]) {
    const external = (adjacency.get(fusionId) || []).filter((entry) => !skip.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }

  const naturalOrder = core.arcOne.concat(core.arcTwo);
  const acc = createAttachmentAccumulator();
  for (let i = 0; i < naturalOrder.length; i++) {
    if (!collectCoreAttachments(graph, adjacency, naturalOrder[i], i, skip, acc, visited, true)) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }

  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return null;
  }

  const orientations = naphthaleneLocantOrders(core.arcOne, core.arcTwo);
  let best = null;
  for (const order of orientations) {
    const locants = new Array(naturalOrder.length);
    naturalOrder.forEach((id, naturalIndex) => {
      locants[naturalIndex] = order.indexOf(id) + 1;
    });
    const key = entries
      .map((entry) => locants[entry.index])
      .sort((a, b) => a - b);
    if (!best || compareLocantLists(key, best.key) < 0) {
      best = { key, locants };
    }
  }
  if (!best) {
    return null;
  }

  const ringPrefix = assembleSubstituentPrefix(
    entries.map((entry) => ({ name: entry.name, locant: best.locants[entry.index] })),
    true
  );
  if (ringPrefix === null) {
    return null;
  }
  return ringPrefix + 'naphthalene';
}

function nameQuinolineFamily(graph, idSet, adjacency, core) {
  if (elementOf(graph, core.fusionA) !== 'C' || elementOf(graph, core.fusionB) !== 'C') {
    return null;
  }
  const naturalOrder = core.arcOne.concat(core.arcTwo);
  const elements = naturalOrder.map((id) => elementOf(graph, id));
  if (elements.some((element) => element !== 'C' && element !== 'N')) {
    return null;
  }
  const nitrogenAtoms = naturalOrder.filter((id) => elementOf(graph, id) === 'N');
  if (nitrogenAtoms.length !== 1) {
    return null;
  }
  const nitrogenId = nitrogenAtoms[0];

  const ringA = [core.fusionA].concat(core.arcOne, [core.fusionB]);
  const ringB = [core.fusionB].concat(core.arcTwo, [core.fusionA]);
  if (!isNaphthalenoidAromatic(graph, core, ringA, ringB)) {
    return null;
  }

  const skip = new Set(core.core);
  const visited = new Set(core.core);
  for (const fusionId of [core.fusionA, core.fusionB]) {
    const external = (adjacency.get(fusionId) || []).filter((entry) => !skip.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }

  const acc = createAttachmentAccumulator();
  for (let i = 0; i < naturalOrder.length; i++) {
    if (!collectCoreAttachments(graph, adjacency, naturalOrder[i], i, skip, acc, visited, true)) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }
  if (acc.carbonyls.length > 0) {
    return null;
  }

  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return null;
  }

  const nitrogenIndex = naturalOrder.indexOf(nitrogenId);
  const orientations = naphthaleneLocantOrders(core.arcOne, core.arcTwo);
  let best = null;
  for (const order of orientations) {
    const locants = new Array(naturalOrder.length);
    naturalOrder.forEach((id, naturalIndex) => {
      locants[naturalIndex] = order.indexOf(id) + 1;
    });
    const key = [locants[nitrogenIndex]].concat(
      entries.map((entry) => locants[entry.index]).sort((a, b) => a - b)
    );
    if (!best || compareLocantLists(key, best.key) < 0) {
      best = { key, locants };
    }
  }
  if (!best) {
    return null;
  }

  const nitrogenLocant = best.locants[nitrogenIndex];
  const parentBare = nitrogenLocant === 1 ? 'quinoline' : nitrogenLocant === 2 ? 'isoquinoline' : null;
  if (!parentBare) {
    return null;
  }

  const ringPrefix = assembleSubstituentPrefix(
    entries.map((entry) => ({ name: entry.name, locant: best.locants[entry.index] })),
    true
  );
  if (ringPrefix === null) {
    return null;
  }
  return ringPrefix + parentBare;
}

function nameNaphthalenePhenethylamine(graph, idSet, adjacency, core) {
  for (const id of core.core) {
    if (elementOf(graph, id) !== 'C') {
      return null;
    }
  }
  const ringA = [core.fusionA].concat(core.arcOne, [core.fusionB]);
  const ringB = [core.fusionB].concat(core.arcTwo, [core.fusionA]);
  if (!isNaphthalenoidAromatic(graph, core, ringA, ringB)) {
    return null;
  }

  const coreIds = core.core;
  for (const fusionId of [core.fusionA, core.fusionB]) {
    const external = (adjacency.get(fusionId) || []).filter((entry) => !coreIds.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }

  const naturalOrder = core.arcOne.concat(core.arcTwo);
  const matches = [];
  naturalOrder.forEach((id, index) => {
    const amph = matchAmphetamineChain(graph, adjacency, coreIds, id);
    if (amph) {
      matches.push({ index, kind: 'amphetamine', match: amph });
      return;
    }
    const phen = matchEthylamineChain(graph, adjacency, coreIds, id);
    if (phen) {
      matches.push({ index, kind: 'phenethylamine', match: phen });
    }
  });
  if (matches.length !== 1) {
    return null;
  }
  const anchor = matches[0];

  const skip = new Set(coreIds);
  const visited = new Set(coreIds);
  anchor.match.atoms.forEach((id) => {
    skip.add(id);
    visited.add(id);
  });

  const acc = createAttachmentAccumulator();
  for (let i = 0; i < naturalOrder.length; i++) {
    if (i === anchor.index) {
      continue;
    }
    if (!collectCoreAttachments(graph, adjacency, naturalOrder[i], i, skip, acc, visited, true)) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }

  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return null;
  }

  let aminoPart;
  if (anchor.match.substituents.length === 0) {
    aminoPart = 'amino';
  } else if (anchor.match.substituents.length === 1) {
    aminoPart = anchor.match.substituents[0] + 'amino';
  } else if (
    anchor.match.substituents.length === 2 &&
    anchor.match.substituents[0] === anchor.match.substituents[1]
  ) {
    aminoPart = 'di' + anchor.match.substituents[0] + 'amino';
  } else {
    return null;
  }
  const chainSuffix = anchor.kind === 'amphetamine' ? 'propyl' : 'ethyl';
  const branchName = '(2-' + aminoPart + chainSuffix + ')';

  const orientations = naphthaleneLocantOrders(core.arcOne, core.arcTwo);
  let best = null;
  for (const order of orientations) {
    const locants = new Array(naturalOrder.length);
    naturalOrder.forEach((id, naturalIndex) => {
      locants[naturalIndex] = order.indexOf(id) + 1;
    });
    const key = entries
      .map((entry) => locants[entry.index])
      .concat([locants[anchor.index]])
      .sort((a, b) => a - b);
    if (!best || compareLocantLists(key, best.key) < 0) {
      best = { key, locants };
    }
  }
  if (!best) {
    return null;
  }

  const allEntries = entries
    .map((entry) => ({ name: entry.name, locant: best.locants[entry.index] }))
    .concat([{ name: branchName, locant: best.locants[anchor.index] }]);
  const prefix = assembleSubstituentPrefix(allEntries, true);
  if (prefix === null) {
    return null;
  }
  return prefix + 'naphthalene';
}

function extractAminorexCore(atomIds, bonds) {
  const trimmed = trimToRing(atomIds, bonds);
  const core = trimmed.remaining;
  const active = trimmed.active;
  if (core.size !== 11 || active.length !== 12) {
    return null;
  }
  const degree = new Map();
  core.forEach((id) => degree.set(id, 0));
  active.forEach((bond) => {
    degree.set(bond.atomA, (degree.get(bond.atomA) || 0) + 1);
    degree.set(bond.atomB, (degree.get(bond.atomB) || 0) + 1);
  });
  const junctions = [];
  for (const id of core) {
    const value = degree.get(id);
    if (value === 3) {
      junctions.push(id);
    } else if (value !== 2) {
      return null;
    }
  }
  if (junctions.length !== 2) {
    return null;
  }
  const jA = junctions[0];
  const jB = junctions[1];
  const bridgeBonds = active.filter(
    (bond) =>
      (bond.atomA === jA && bond.atomB === jB) ||
      (bond.atomA === jB && bond.atomB === jA)
  );
  if (bridgeBonds.length !== 1) {
    return null;
  }
  const bridgeBond = bridgeBonds[0];
  const remainderBonds = active.filter((bond) => bond !== bridgeBond);

  const localAdjacency = new Map();
  core.forEach((id) => localAdjacency.set(id, []));
  remainderBonds.forEach((bond) => {
    localAdjacency.get(bond.atomA).push(bond.atomB);
    localAdjacency.get(bond.atomB).push(bond.atomA);
  });

  function componentOf(startId) {
    const seen = new Set([startId]);
    const queue = [startId];
    while (queue.length > 0) {
      const cur = queue.shift();
      for (const next of localAdjacency.get(cur)) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    return seen;
  }

  const compA = componentOf(jA);
  const compB = componentOf(jB);
  if (compA.has(jB) || compB.has(jA) || compA.size + compB.size !== core.size) {
    return null;
  }

  function bondsWithin(comp) {
    return remainderBonds.filter((bond) => comp.has(bond.atomA) && comp.has(bond.atomB));
  }

  const ringA = orderRing(compA, bondsWithin(compA));
  const ringB = orderRing(compB, bondsWithin(compB));
  if (!ringA || !ringB || ringA.length !== 5 || ringB.length !== 6) {
    return null;
  }

  return { core, jA, jB, ringA, ringB };
}

function aminorexOrientation(graph, ringA, jA) {
  const idx = ringA.indexOf(jA);
  if (idx === -1) {
    return null;
  }
  const forward = ringA[(idx + 1) % 5];
  const backward = ringA[(idx + 4) % 5];
  if (elementOf(graph, forward) === 'O') {
    return {
      c5: jA,
      o1: forward,
      c2: ringA[(idx + 2) % 5],
      n3: ringA[(idx + 3) % 5],
      c4: ringA[(idx + 4) % 5],
    };
  }
  if (elementOf(graph, backward) === 'O') {
    return {
      c5: jA,
      o1: backward,
      c2: ringA[(idx + 3) % 5],
      n3: ringA[(idx + 2) % 5],
      c4: ringA[(idx + 1) % 5],
    };
  }
  return null;
}

function nameAminorex(graph, idSet, adjacency, core) {
  const orientation = aminorexOrientation(graph, core.ringA, core.jA);
  if (!orientation) {
    return null;
  }
  const { c5, o1, c2, n3, c4 } = orientation;
  if (
    elementOf(graph, o1) !== 'O' ||
    elementOf(graph, c2) !== 'C' ||
    elementOf(graph, n3) !== 'N' ||
    elementOf(graph, c4) !== 'C'
  ) {
    return null;
  }
  const ringBondSpecs = [
    [c5, o1, 1],
    [o1, c2, 1],
    [c2, n3, 2],
    [n3, c4, 1],
    [c4, c5, 1],
  ];
  for (const spec of ringBondSpecs) {
    const bond = graph.getBond(spec[0], spec[1]);
    if (!bond || bond.order !== spec[2]) {
      return null;
    }
  }

  const coreIds = core.core;
  const visited = new Set(coreIds);

  for (const sealedId of [o1, n3, c5]) {
    const external = (adjacency.get(sealedId) || []).filter((entry) => !coreIds.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }

  const c2External = (adjacency.get(c2) || []).filter((entry) => !coreIds.has(entry.id));
  if (c2External.length !== 1 || c2External[0].order !== 1) {
    return null;
  }
  const aminoN = c2External[0].id;
  if (elementOf(graph, aminoN) !== 'N') {
    return null;
  }
  visited.add(aminoN);
  const aminoSubs = (adjacency.get(aminoN) || []).filter((entry) => entry.id !== c2);
  const nSubNames = [];
  for (const sub of aminoSubs) {
    if (sub.order !== 1 || elementOf(graph, sub.id) !== 'C') {
      return null;
    }
    const branch = collectBranch(graph, adjacency, sub.id, aminoN);
    if (!branch) {
      return null;
    }
    const name = ALKYL_PREFIXES[branch.length];
    if (!name) {
      return null;
    }
    nSubNames.push(name);
    branch.forEach((id) => visited.add(id));
  }

  const c4External = (adjacency.get(c4) || []).filter((entry) => !coreIds.has(entry.id));
  let c4Name = null;
  if (c4External.length === 1) {
    if (c4External[0].order !== 1 || elementOf(graph, c4External[0].id) !== 'C') {
      return null;
    }
    const branch = collectBranch(graph, adjacency, c4External[0].id, c4);
    if (!branch) {
      return null;
    }
    c4Name = ALKYL_PREFIXES[branch.length];
    if (!c4Name) {
      return null;
    }
    branch.forEach((id) => visited.add(id));
  } else if (c4External.length !== 0) {
    return null;
  }

  const ringB = core.ringB;
  const ringBOrders = cycleBondOrders(graph, ringB);
  if (!ringBOrders || !hasAlternatingOrders(ringBOrders)) {
    return null;
  }
  for (const id of ringB) {
    if (elementOf(graph, id) !== 'C') {
      return null;
    }
    const external = (adjacency.get(id) || []).filter((entry) => !coreIds.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }

  if (visited.size !== idSet.size) {
    return null;
  }

  const nPrefix = buildNitrogenPrefix(nSubNames);
  if (nPrefix === null) {
    return null;
  }
  const c4Prefix = c4Name ? '4-' + c4Name : '';
  const parts = [c4Prefix, nPrefix].filter((part) => part !== '');
  lastScaffoldStereoLocants = new Map([
    [c4, 4],
    [c5, 5],
  ]);
  return parts.join('-') + 'aminorex';
}

function deriveFusedName(graph, atomIds, bonds, coreAtomIds, coreBonds) {
  const core = extractFusedCore(atomIds, bonds, coreAtomIds, coreBonds);
  if (core) {
    if (
      elementOf(graph, core.fusionA) === 'C' &&
      elementOf(graph, core.fusionB) === 'C' &&
      core.sixArc.every((id) => elementOf(graph, id) === 'C')
    ) {
      const fiveElements = core.fiveArc.map((id) => elementOf(graph, id));
      if (
        fiveElements.filter((element) => element === 'N').length === 1 &&
        fiveElements.filter((element) => element === 'C').length === 2
      ) {
        const adjacency = buildAdjacency(atomIds, bonds);
        const idSet = new Set(atomIds);
        for (const orientation of indoleOrientations(graph, core)) {
          const name = nameIndole(graph, idSet, adjacency, core, orientation);
          if (name) {
            return name;
          }
        }
      }
    }
    const mdName = nameMethylenedioxyScaffold(
      graph,
      new Set(atomIds),
      buildAdjacency(atomIds, bonds),
      core
    );
    if (mdName) {
      return mdName;
    }
    const bfAdjacency = buildAdjacency(atomIds, bonds);
    const bfIdSet = new Set(atomIds);
    for (const orientation of benzofuranOrientations(graph, core, 'O')) {
      const bfName = nameBenzofuranScaffold(graph, bfIdSet, bfAdjacency, core, orientation, 'benzofuran');
      if (bfName) {
        return bfName;
      }
    }
    for (const orientation of benzofuranOrientations(graph, core, 'S')) {
      const btName = nameBenzofuranScaffold(graph, bfIdSet, bfAdjacency, core, orientation, 'benzothiophene');
      if (btName) {
        return btName;
      }
    }
  }
  const naphthaleneCore = extractNaphthaleneCore(atomIds, bonds);
  if (naphthaleneCore) {
    const idSet = new Set(atomIds);
    const adjacency = buildAdjacency(atomIds, bonds);
    const phenethylName = nameNaphthalenePhenethylamine(graph, idSet, adjacency, naphthaleneCore);
    if (phenethylName) {
      return phenethylName;
    }
    const name = nameNaphthalene(graph, idSet, adjacency, naphthaleneCore);
    if (name) {
      return name;
    }
    const quinolineName = nameQuinolineFamily(graph, idSet, adjacency, naphthaleneCore);
    if (quinolineName) {
      return quinolineName;
    }
  }
  const aminorexCore = extractAminorexCore(atomIds, bonds);
  if (aminorexCore) {
    const idSet = new Set(atomIds);
    const adjacency = buildAdjacency(atomIds, bonds);
    const name = nameAminorex(graph, idSet, adjacency, aminorexCore);
    if (name) {
      return name;
    }
  }
  return null;
}

function extractCarbolineCore(atomIds, bonds) {
  const trimmed = trimToRing(atomIds, bonds);
  const core = trimmed.remaining;
  const active = trimmed.active;
  if (core.size !== 13 || active.length !== 15) {
    return null;
  }
  const degree = new Map();
  core.forEach((id) => degree.set(id, 0));
  active.forEach((bond) => {
    degree.set(bond.atomA, (degree.get(bond.atomA) || 0) + 1);
    degree.set(bond.atomB, (degree.get(bond.atomB) || 0) + 1);
  });
  const fusion = [];
  for (const id of core) {
    const value = degree.get(id);
    if (value === 3) {
      fusion.push(id);
    } else if (value !== 2) {
      return null;
    }
  }
  if (fusion.length !== 4) {
    return null;
  }
  const fusionSet = new Set(fusion);
  const fusionBonds = active.filter(
    (bond) => fusionSet.has(bond.atomA) && fusionSet.has(bond.atomB)
  );
  if (fusionBonds.length !== 3) {
    return null;
  }
  let perimeter = null;
  for (let i = 0; i < fusionBonds.length; i++) {
    for (let j = i + 1; j < fusionBonds.length; j++) {
      const remainder = active.filter(
        (bond) => bond !== fusionBonds[i] && bond !== fusionBonds[j]
      );
      const attempt = orderRing(core, remainder);
      if (attempt && attempt.length === 13) {
        if (perimeter) {
          return null;
        }
        perimeter = attempt;
      }
    }
  }
  if (!perimeter) {
    return null;
  }
  const indices = fusion.map((id) => perimeter.indexOf(id)).sort((a, b) => a - b);
  if (indices.some((index) => index === -1)) {
    return null;
  }
  const gaps = [];
  for (let i = 0; i < 4; i++) {
    const arc = arcBetween(perimeter, indices[i], indices[(i + 1) % 4]);
    if (!arc) {
      return null;
    }
    gaps.push(arc);
  }
  let hingeIndex = -1;
  for (let i = 0; i < 4; i++) {
    if (gaps[i].length === 0) {
      hingeIndex = i;
    }
  }
  if (hingeIndex === -1) {
    return null;
  }
  const lengths = [0, 1, 2, 3].map((offset) => gaps[(hingeIndex + offset) % 4].length);
  if (lengths[0] !== 0 || lengths[1] !== 4 || lengths[2] !== 1 || lengths[3] !== 4) {
    return null;
  }
  const hingeA = perimeter[indices[hingeIndex]];
  const hingeB = perimeter[indices[(hingeIndex + 1) % 4]];
  const arcAfterHingeB = gaps[(hingeIndex + 1) % 4];
  const farFusion = perimeter[indices[(hingeIndex + 2) % 4]];
  const gapArc = gaps[(hingeIndex + 2) % 4];
  const gapAtom = gapArc[0];
  const nearFusion = perimeter[indices[(hingeIndex + 3) % 4]];
  const arcBeforeHingeA = gaps[(hingeIndex + 3) % 4];
  return {
    core,
    hingeA,
    hingeB,
    arcAfterHingeB,
    farFusion,
    gapAtom,
    nearFusion,
    arcBeforeHingeA,
  };
}

function carbolineOrientations(graph, core) {
  return [
    {
      c1: core.arcBeforeHingeA[0],
      c2: core.arcBeforeHingeA[1],
      c3: core.arcBeforeHingeA[2],
      c4: core.arcBeforeHingeA[3],
      c4a: core.hingeA,
      c4b: core.hingeB,
      c5: core.arcAfterHingeB[0],
      c6: core.arcAfterHingeB[1],
      c7: core.arcAfterHingeB[2],
      c8: core.arcAfterHingeB[3],
      c8a: core.farFusion,
      n9: core.gapAtom,
      c9a: core.nearFusion,
    },
    {
      c1: core.arcAfterHingeB[3],
      c2: core.arcAfterHingeB[2],
      c3: core.arcAfterHingeB[1],
      c4: core.arcAfterHingeB[0],
      c4a: core.hingeB,
      c4b: core.hingeA,
      c5: core.arcBeforeHingeA[3],
      c6: core.arcBeforeHingeA[2],
      c7: core.arcBeforeHingeA[1],
      c8: core.arcBeforeHingeA[0],
      c8a: core.nearFusion,
      n9: core.gapAtom,
      c9a: core.farFusion,
    },
  ];
}

function nameCarboline(graph, idSet, adjacency, core, orientation) {
  const pyridineArc = [orientation.c1, orientation.c2, orientation.c3, orientation.c4];
  const pyridineElements = pyridineArc.map((id) => elementOf(graph, id));
  const pattern = pyridineElements.join('');
  if (pattern !== 'CNCC' && pattern !== 'CCNC') {
    return null;
  }
  const gamma = pattern === 'CCNC';
  const ringN = gamma ? orientation.c3 : orientation.c2;
  const benzoArc = [orientation.c5, orientation.c6, orientation.c7, orientation.c8];
  if (benzoArc.some((id) => elementOf(graph, id) !== 'C')) {
    return null;
  }
  if (elementOf(graph, orientation.n9) !== 'N') {
    return null;
  }
  const fusionAtoms = [orientation.c4a, orientation.c4b, orientation.c8a, orientation.c9a];
  if (fusionAtoms.some((id) => elementOf(graph, id) !== 'C')) {
    return null;
  }

  const pyridineRing = [orientation.c9a].concat(pyridineArc, [orientation.c4a]);
  const pyridineOrders = cycleBondOrders(graph, pyridineRing);
  if (!pyridineOrders) {
    return null;
  }
  const saturatedTail = pyridineOrders.slice(2, 5).every((order) => order === 1) && pyridineOrders[5] === 2 && pyridineOrders[0] === 1;
  let hydro = null;
  if (saturatedTail && pyridineOrders[1] === 1) {
    hydro = 'tetra';
  } else if (!gamma && saturatedTail && pyridineOrders[1] === 2) {
    hydro = 'di';
  } else if (!hasAlternatingOrders(pyridineOrders)) {
    return null;
  }

  const benzoRing = [orientation.c4b].concat(benzoArc, [orientation.c8a]);
  const benzoOrders = cycleBondOrders(graph, benzoRing);
  if (!benzoOrders || !hasAlternatingOrders(benzoOrders)) {
    return null;
  }

  const pyrroleRing = [
    orientation.c4a,
    orientation.c4b,
    orientation.c8a,
    orientation.n9,
    orientation.c9a,
  ];
  const pyrroleOrders = cycleBondOrders(graph, pyrroleRing);
  const hydroPyrrole = hydro && pyrroleOrders && pyrroleOrders[0] === 1 && pyrroleOrders[2] === 1 && pyrroleOrders[3] === 1 && pyrroleOrders[4] === 2;
  if (!pyrroleOrders || (!hydroPyrrole && !hasFuranPattern(pyrroleOrders, 3))) {
    return null;
  }

  const coreIds = core.core;
  const skip = new Set(coreIds);
  const visited = new Set(coreIds);

  for (const fusionId of fusionAtoms) {
    const external = (adjacency.get(fusionId) || []).filter((entry) => !skip.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }

  const externalOnN2 = (adjacency.get(ringN) || []).filter(
    (entry) => !skip.has(entry.id)
  );
  if (externalOnN2.length > 0 && hydro !== 'tetra') {
    return null;
  }

  const acc = createAttachmentAccumulator();
  const locants = gamma ? [4, 3, 2, 1, 9, 8, 7, 6, 5] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const positions = [
    orientation.c1, orientation.c2, orientation.c3, orientation.c4,
    orientation.c5, orientation.c6, orientation.c7, orientation.c8, orientation.n9,
  ].map((id, index) => ({ id, locant: locants[index] }));
  for (const position of positions) {
    if (
      !collectCoreAttachments(
        graph,
        adjacency,
        position.id,
        position.locant,
        skip,
        acc,
        visited,
        true
      )
    ) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }

  const allEntries = scaffoldSubstituentEntries(acc);
  if (!allEntries) {
    return null;
  }
  const acids = allEntries.filter((entry) => entry.name === 'carboxy');
  const entries = acids.length === 1 ? allEntries.filter((entry) => entry.name !== 'carboxy') : allEntries;
  const suffix = acids.length === 1 ? '-' + acids[0].index + '-carboxylic acid' : '';
  const prefix = assembleSubstituentPrefix(
    entries.map((entry) => ({ name: entry.name, locant: entry.index })),
    true
  );
  if (prefix === null) {
    return null;
  }
  if (gamma) {
    return hydro === 'tetra'
      ? prefix + (prefix ? '-' : '') + '2,3,4,5-tetrahydro-1H-γ-carboline' + suffix
      : prefix + 'γ-carboline' + suffix;
  }
  if (hydro === 'tetra') {
    return prefix + (prefix ? '-' : '') + '2,3,4,9-tetrahydro-1H-β-carboline' + suffix;
  }
  if (hydro === 'di') {
    return prefix + (prefix ? '-' : '') + '4,9-dihydro-3H-β-carboline' + suffix;
  }
  return prefix + 'β-carboline' + suffix;
}

function nameTetrahydrocarbazole(graph, idSet, adjacency, core, orientation) {
  const satArc = [orientation.c1, orientation.c2, orientation.c3, orientation.c4];
  if (satArc.some((id) => elementOf(graph, id) !== 'C')) {
    return null;
  }
  const benzoArc = [orientation.c5, orientation.c6, orientation.c7, orientation.c8];
  if (benzoArc.some((id) => elementOf(graph, id) !== 'C')) {
    return null;
  }
  if (elementOf(graph, orientation.n9) !== 'N') {
    return null;
  }
  const fusionAtoms = [orientation.c4a, orientation.c4b, orientation.c8a, orientation.c9a];
  if (fusionAtoms.some((id) => elementOf(graph, id) !== 'C')) {
    return null;
  }

  const satRing = [orientation.c9a].concat(satArc, [orientation.c4a]);
  const satOrders = cycleBondOrders(graph, satRing);
  if (!satOrders || satOrders.slice(0, -1).some((order) => order !== 1)) {
    return null;
  }

  const benzoRing = [orientation.c4b].concat(benzoArc, [orientation.c8a]);
  const benzoOrders = cycleBondOrders(graph, benzoRing);
  if (!benzoOrders || !hasAlternatingOrders(benzoOrders)) {
    return null;
  }

  const pyrroleRing = [
    orientation.c4a,
    orientation.c4b,
    orientation.c8a,
    orientation.n9,
    orientation.c9a,
  ];
  const pyrroleOrders = cycleBondOrders(graph, pyrroleRing);
  const hydroPyrrole = pyrroleOrders && pyrroleOrders[0] === 1 && pyrroleOrders[2] === 1 && pyrroleOrders[3] === 1 && pyrroleOrders[4] === 2;
  if (!pyrroleOrders || (!hydroPyrrole && !hasFuranPattern(pyrroleOrders, 3))) {
    return null;
  }

  const coreIds = core.core;
  const skip = new Set(coreIds);
  const visited = new Set(coreIds);

  for (const fusionId of fusionAtoms) {
    const external = (adjacency.get(fusionId) || []).filter((entry) => !skip.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }
  const externalOnN9 = (adjacency.get(orientation.n9) || []).filter(
    (entry) => !skip.has(entry.id)
  );
  if (externalOnN9.length > 0) {
    return null;
  }

  const substituents = [];

  let amideLocant = null;
  for (let i = 0; i < satArc.length; i++) {
    const id = satArc[i];
    const external = (adjacency.get(id) || []).filter((entry) => !skip.has(entry.id));
    if (external.length === 0) {
      continue;
    }
    if (external.length !== 1 || external[0].order !== 1 || amideLocant !== null) {
      return null;
    }
    const resolved = resolveCarboxamideBranch(graph, adjacency, external[0].id, id);
    if (!resolved) {
      return null;
    }
    amideLocant = i + 1;
    resolved.atoms.forEach((atomId) => visited.add(atomId));
    substituents.push({ name: resolved.name, index: amideLocant });
  }

  let aminoLocant = null;
  for (let i = 0; i < benzoArc.length; i++) {
    const id = benzoArc[i];
    const external = (adjacency.get(id) || []).filter((entry) => !skip.has(entry.id));
    if (external.length === 0) {
      continue;
    }
    if (external.length !== 1 || external[0].order !== 1 || aminoLocant !== null) {
      return null;
    }
    const resolved = resolveDirectAminoSubstituent(graph, adjacency, external[0].id, id);
    if (!resolved) {
      return null;
    }
    aminoLocant = i + 5;
    resolved.atoms.forEach((atomId) => visited.add(atomId));
    substituents.push({ name: resolved.name, index: aminoLocant });
  }

  if (visited.size !== idSet.size) {
    return null;
  }

  const prefix = assembleSubstituentPrefix(
    substituents.map((entry) => ({ name: entry.name, locant: entry.index })),
    true
  );
  if (prefix === null) {
    return null;
  }
  return prefix + 'tetrahydrocarbazole';
}

function extractNoramineCore(atomIds, bonds) {
  const trimmed = trimToRing(atomIds, bonds);
  const core = trimmed.remaining;
  const active = trimmed.active;
  if (core.size !== 13 || active.length !== 15) {
    return null;
  }
  const degree = new Map();
  core.forEach((id) => degree.set(id, 0));
  active.forEach((bond) => {
    degree.set(bond.atomA, (degree.get(bond.atomA) || 0) + 1);
    degree.set(bond.atomB, (degree.get(bond.atomB) || 0) + 1);
  });
  const fusion = [];
  for (const id of core) {
    const value = degree.get(id);
    if (value === 3) {
      fusion.push(id);
    } else if (value !== 2) {
      return null;
    }
  }
  if (fusion.length !== 4) {
    return null;
  }
  const fusionSet = new Set(fusion);
  const fusionBonds = active.filter(
    (bond) => fusionSet.has(bond.atomA) && fusionSet.has(bond.atomB)
  );
  if (fusionBonds.length !== 3) {
    return null;
  }
  let perimeter = null;
  for (let i = 0; i < fusionBonds.length; i++) {
    for (let j = i + 1; j < fusionBonds.length; j++) {
      const remainder = active.filter(
        (bond) => bond !== fusionBonds[i] && bond !== fusionBonds[j]
      );
      const attempt = orderRing(core, remainder);
      if (attempt && attempt.length === 13) {
        if (perimeter) {
          return null;
        }
        perimeter = attempt;
      }
    }
  }
  if (!perimeter) {
    return null;
  }
  const indices = fusion.map((id) => perimeter.indexOf(id)).sort((a, b) => a - b);
  if (indices.some((index) => index === -1)) {
    return null;
  }
  const gaps = [];
  for (let i = 0; i < 4; i++) {
    const arc = arcBetween(perimeter, indices[i], indices[(i + 1) % 4]);
    if (!arc) {
      return null;
    }
    gaps.push(arc);
  }
  let hingeIndex = -1;
  for (let i = 0; i < 4; i++) {
    if (gaps[i].length === 0) {
      hingeIndex = i;
    }
  }
  if (hingeIndex === -1) {
    return null;
  }
  const lengths = [0, 1, 2, 3].map((offset) => gaps[(hingeIndex + offset) % 4].length);
  if (lengths[0] !== 0 || lengths[2] !== 2) {
    return null;
  }
  const hingeA = perimeter[indices[hingeIndex]];
  const hingeB = perimeter[indices[(hingeIndex + 1) % 4]];
  const gapAfterHingeB = gaps[(hingeIndex + 1) % 4];
  const midFusion = perimeter[indices[(hingeIndex + 2) % 4]];
  const benzoArc = gaps[(hingeIndex + 2) % 4];
  const farFusion = perimeter[indices[(hingeIndex + 3) % 4]];
  const gapBeforeHingeA = gaps[(hingeIndex + 3) % 4];

  let pyrroleFusion, pyrroleFarFusion, pyrroleArc, satFusion, satFarFusion, satArc;
  let pyrroleFarFusionIsMidFusion, satFarFusionIsMidFusion;
  if (lengths[1] === 3 && lengths[3] === 4) {
    pyrroleFusion = hingeB;
    pyrroleFarFusion = midFusion;
    pyrroleFarFusionIsMidFusion = true;
    pyrroleArc = gapAfterHingeB;
    satFusion = hingeA;
    satFarFusion = farFusion;
    satFarFusionIsMidFusion = false;
    satArc = gapBeforeHingeA;
  } else if (lengths[1] === 4 && lengths[3] === 3) {
    satFusion = hingeB;
    satFarFusion = midFusion;
    satFarFusionIsMidFusion = true;
    satArc = gapAfterHingeB;
    pyrroleFusion = hingeA;
    pyrroleFarFusion = farFusion;
    pyrroleFarFusionIsMidFusion = false;
    pyrroleArc = gapBeforeHingeA;
  } else {
    return null;
  }

  return {
    core,
    pyrroleFusion,
    pyrroleFarFusion,
    pyrroleFarFusionIsMidFusion,
    pyrroleArc,
    benzoArc,
    satFusion,
    satFarFusion,
    satFarFusionIsMidFusion,
    satArc,
  };
}

function noramineOrientations(graph, core) {
  const three = core.pyrroleArc;
  const options = [];
  const c4c5Forward = { c4: core.benzoArc[0], c5: core.benzoArc[1] };
  const c4c5Reverse = { c4: core.benzoArc[1], c5: core.benzoArc[0] };
  const satForward = {
    c9: core.satArc[0],
    c8: core.satArc[1],
    c7: core.satArc[2],
    c6: core.satArc[3],
  };
  const satReverse = {
    c9: core.satArc[3],
    c8: core.satArc[2],
    c7: core.satArc[1],
    c6: core.satArc[0],
  };
  const c4c5 = core.pyrroleFarFusionIsMidFusion ? c4c5Forward : c4c5Reverse;
  const satOrient = core.satFarFusionIsMidFusion ? satReverse : satForward;
  if (elementOf(graph, three[2]) === 'N') {
    options.push(
      Object.assign(
        {
          c3: three[0],
          c2: three[1],
          n1: three[2],
          c3a: core.pyrroleFusion,
          c7a: core.pyrroleFarFusion,
          c9a: core.satFusion,
          c5a: core.satFarFusion,
        },
        c4c5,
        satOrient
      )
    );
  }
  if (elementOf(graph, three[0]) === 'N') {
    options.push(
      Object.assign(
        {
          c3: three[2],
          c2: three[1],
          n1: three[0],
          c3a: core.pyrroleFusion,
          c7a: core.pyrroleFarFusion,
          c9a: core.satFusion,
          c5a: core.satFarFusion,
        },
        c4c5,
        satOrient
      )
    );
  }
  return options;
}

function nameNoramine(graph, idSet, adjacency, core, orientation) {
  const fiveBonds = [
    [orientation.n1, orientation.c2, 1],
    [orientation.c2, orientation.c3, 2],
    [orientation.c3, orientation.c3a, 1],
    [orientation.c3a, orientation.c7a, 2],
    [orientation.c7a, orientation.n1, 1],
  ];
  for (const expected of fiveBonds) {
    const bond = graph.getBond(expected[0], expected[1]);
    if (!bond || bond.order !== expected[2]) {
      return null;
    }
  }

  const benzoRing = [
    orientation.c3a,
    orientation.c7a,
    orientation.c4,
    orientation.c5,
    orientation.c5a,
    orientation.c9a,
  ];
  const benzoOrders = cycleBondOrders(graph, benzoRing);
  if (!benzoOrders || !hasAlternatingOrders(benzoOrders)) {
    return null;
  }

  const satRing = [
    orientation.c5a,
    orientation.c9,
    orientation.c8,
    orientation.c7,
    orientation.c6,
    orientation.c9a,
  ];
  const satOrders = cycleBondOrders(graph, satRing);
  if (!satOrders || satOrders.slice(0, -1).some((order) => order !== 1)) {
    return null;
  }

  const coreIds = core.core;
  const chain = matchEthylamineChain(graph, adjacency, coreIds, orientation.c3, true);
  const skip = new Set(coreIds);
  const visited = new Set(coreIds);
  if (chain) {
    chain.atoms.forEach((id) => {
      skip.add(id);
      visited.add(id);
    });
  }

  const acc = createAttachmentAccumulator();
  const positions = [
    { id: orientation.n1, locant: 1 },
    { id: orientation.c2, locant: 2 },
    { id: orientation.c4, locant: 4 },
    { id: orientation.c5, locant: 5 },
    { id: orientation.c6, locant: 6 },
    { id: orientation.c7, locant: 7 },
    { id: orientation.c8, locant: 8 },
    { id: orientation.c9, locant: 9 },
  ];
  if (!chain) {
    positions.push({ id: orientation.c3, locant: 3 });
  }
  for (const position of positions) {
    if (
      !collectCoreAttachments(
        graph,
        adjacency,
        position.id,
        position.locant,
        skip,
        acc,
        visited,
        true
      )
    ) {
      return null;
    }
  }
  const fusionAtoms = [
    orientation.c3a,
    orientation.c7a,
    orientation.c5a,
    orientation.c9a,
  ];
  for (const fusionId of fusionAtoms) {
    const external = (adjacency.get(fusionId) || []).filter((entry) => !skip.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }

  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return null;
  }
  const ringPrefix = assembleSubstituentPrefix(
    entries.map((entry) => ({ name: entry.name, locant: entry.index })),
    true
  );
  if (ringPrefix === null) {
    return null;
  }
  if (!chain) {
    return null;
  }
  const nitrogenPrefix = buildNitrogenPrefix(chain.substituents);
  if (nitrogenPrefix === null) {
    return null;
  }
  const alphaPrefix = [
    chain.alphaSubstituent ? 'alpha-' + chain.alphaSubstituent : '',
    chain.betaSubstituent ? 'beta-' + chain.betaSubstituent : '',
  ].filter((part) => part !== '').join('-');
  return (
    [ringPrefix, alphaPrefix, nitrogenPrefix].filter((part) => part !== '').join('-') +
    'noramine'
  );
}

function extractDifuranCore(atomIds, bonds) {
  const trimmed = trimToRing(atomIds, bonds);
  const core = trimmed.remaining;
  const active = trimmed.active;
  if (core.size !== 12 || active.length !== 14) {
    return null;
  }
  const degree = new Map();
  core.forEach((id) => degree.set(id, 0));
  active.forEach((bond) => {
    degree.set(bond.atomA, (degree.get(bond.atomA) || 0) + 1);
    degree.set(bond.atomB, (degree.get(bond.atomB) || 0) + 1);
  });
  const fusion = [];
  for (const id of core) {
    const value = degree.get(id);
    if (value === 3) {
      fusion.push(id);
    } else if (value !== 2) {
      return null;
    }
  }
  if (fusion.length !== 4) {
    return null;
  }
  const fusionSet = new Set(fusion);
  const fusionBonds = active.filter(
    (bond) => fusionSet.has(bond.atomA) && fusionSet.has(bond.atomB)
  );
  if (fusionBonds.length !== 2) {
    return null;
  }
  const remainder = active.filter((bond) => !fusionBonds.includes(bond));
  const perimeter = orderRing(core, remainder);
  if (!perimeter || perimeter.length !== 12) {
    return null;
  }
  const indices = fusion.map((id) => perimeter.indexOf(id)).sort((a, b) => a - b);
  if (indices.some((index) => index === -1)) {
    return null;
  }
  const gaps = [];
  for (let i = 0; i < 4; i++) {
    const arc = arcBetween(perimeter, indices[i], indices[(i + 1) % 4]);
    if (!arc) {
      return null;
    }
    gaps.push(arc);
  }
  const lens = gaps.map((gap) => gap.length);
  let rot = -1;
  for (let i = 0; i < 4; i++) {
    if (
      lens[i] === 1 &&
      lens[(i + 1) % 4] === 3 &&
      lens[(i + 2) % 4] === 1 &&
      lens[(i + 3) % 4] === 3
    ) {
      rot = i;
      break;
    }
  }
  if (rot === -1) {
    return null;
  }
  const p0 = perimeter[indices[rot]];
  const freeX = gaps[rot][0];
  const p1 = perimeter[indices[(rot + 1) % 4]];
  const furanBArc = gaps[(rot + 1) % 4];
  const p2 = perimeter[indices[(rot + 2) % 4]];
  const freeY = gaps[(rot + 2) % 4][0];
  const p3 = perimeter[indices[(rot + 3) % 4]];
  const furanAArc = gaps[(rot + 3) % 4];
  return { core, p0, freeX, p1, furanBArc, p2, freeY, p3, furanAArc };
}

function validateFuranArm(graph, fusionA, fusionB, arc) {
  const ring = [fusionA, arc[0], arc[1], arc[2], fusionB];
  let heteroIndex = -1;
  for (let i = 1; i < 4; i++) {
    if (elementOf(graph, ring[i]) === 'O') {
      heteroIndex = i;
    } else if (elementOf(graph, ring[i]) !== 'C') {
      return null;
    }
  }
  if (heteroIndex === -1) {
    return null;
  }
  const orders = cycleBondOrders(graph, ring);
  if (!orders || !hasFuranPattern(orders, heteroIndex)) {
    return null;
  }
  return { o1: ring[heteroIndex] };
}

function validateDihydrofuranArm(graph, fusionA, fusionB, arc) {
  const ring = [fusionA, arc[0], arc[1], arc[2], fusionB];
  const orders = cycleBondOrders(graph, ring);
  if (!orders || orders.slice(0, 4).some((order) => order !== 1)) {
    return null;
  }
  const oIsFirst = elementOf(graph, arc[0]) === 'O';
  const oIsLast = elementOf(graph, arc[2]) === 'O';
  if (oIsFirst === oIsLast) {
    return null;
  }
  if (elementOf(graph, arc[1]) !== 'C') {
    return null;
  }
  const otherArcId = oIsFirst ? arc[2] : arc[0];
  if (elementOf(graph, otherArcId) !== 'C') {
    return null;
  }
  return { o1: oIsFirst ? arc[0] : arc[2] };
}

function nameDifuranGenericCore(graph, idSet, adjacency, skip, visited, candidates, suffix) {
  const acc = createAttachmentAccumulator();
  for (const candidate of candidates) {
    if (
      !collectCoreAttachments(graph, adjacency, candidate.id, candidate.locant, skip, acc, visited, true)
    ) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }
  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return null;
  }
  const prefix = assembleSubstituentPrefix(
    entries.map((entry) => ({ name: entry.name, locant: entry.index })),
    true
  );
  if (prefix === null) {
    return null;
  }
  return prefix + suffix;
}

function nameDifuranSaturatedScaffold(graph, idSet, adjacency, core) {
  const centralRing = [core.p0, core.freeX, core.p1, core.p2, core.freeY, core.p3];
  const centralOrders = cycleBondOrders(graph, centralRing);
  if (!centralOrders || !hasAlternatingOrders(centralOrders)) {
    return null;
  }

  const armB = validateDihydrofuranArm(graph, core.p1, core.p2, core.furanBArc);
  const armA = validateDihydrofuranArm(graph, core.p3, core.p0, core.furanAArc);
  if (!armB || !armA) {
    return null;
  }

  const coreIds = core.core;
  const skip = new Set(coreIds);
  const visited = new Set(coreIds);

  for (const id of core.furanAArc.concat(core.furanBArc)) {
    const external = (adjacency.get(id) || []).filter((entry) => !skip.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }
  for (const id of [core.p0, core.p1, core.p2, core.p3]) {
    const external = (adjacency.get(id) || []).filter((entry) => !skip.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }

  const candidates = [
    { id: core.freeX, locant: 4 },
    { id: core.freeY, locant: 8 },
  ];
  let anchor = null;
  const others = [];
  for (const candidate of candidates) {
    const amph = matchAmphetamineChain(graph, adjacency, skip, candidate.id);
    if (amph) {
      if (anchor) {
        return null;
      }
      anchor = { locant: candidate.locant, kind: 'amphetamine', match: amph };
      continue;
    }
    const phen = matchEthylamineChain(graph, adjacency, skip, candidate.id);
    if (phen) {
      if (anchor) {
        return null;
      }
      anchor = { locant: candidate.locant, kind: 'phenethylamine', match: phen };
    } else {
      others.push(candidate);
    }
  }
  if (!anchor) {
    return nameDifuranGenericCore(graph, idSet, adjacency, skip, visited, candidates, '-2,3,6,7-tetrahydrobenzodifuran');
  }
  anchor.match.atoms.forEach((id) => visited.add(id));

  const acc = createAttachmentAccumulator();
  for (const other of others) {
    if (
      !collectCoreAttachments(graph, adjacency, other.id, other.locant, skip, acc, visited, true)
    ) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }

  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return null;
  }

  let aminoPart;
  if (anchor.match.substituents.length === 0) {
    aminoPart = 'amino';
  } else if (anchor.match.substituents.length === 1) {
    aminoPart = anchor.match.substituents[0] + 'amino';
  } else if (
    anchor.match.substituents.length === 2 &&
    anchor.match.substituents[0] === anchor.match.substituents[1]
  ) {
    aminoPart = 'di' + anchor.match.substituents[0] + 'amino';
  } else {
    return null;
  }
  const chainSuffix = anchor.kind === 'amphetamine' ? 'propyl' : 'ethyl';
  const branchName = '(2-' + aminoPart + chainSuffix + ')';

  const allEntries = entries
    .map((entry) => ({ name: entry.name, locant: entry.index }))
    .concat([{ name: branchName, locant: anchor.locant }]);
  const prefix = assembleSubstituentPrefix(allEntries, true);
  if (prefix === null) {
    return null;
  }
  return prefix + '-2,3,6,7-tetrahydrobenzodifuran';
}

function nameDifuranScaffold(graph, idSet, adjacency, core) {
  const centralRing = [core.p0, core.freeX, core.p1, core.p2, core.freeY, core.p3];
  const centralOrders = cycleBondOrders(graph, centralRing);
  if (!centralOrders || !hasAlternatingOrders(centralOrders)) {
    return null;
  }

  const armB = validateFuranArm(graph, core.p1, core.p2, core.furanBArc);
  const armA = validateFuranArm(graph, core.p3, core.p0, core.furanAArc);
  if (!armB || !armA) {
    return null;
  }

  const coreIds = core.core;
  const skip = new Set(coreIds);
  const visited = new Set(coreIds);

  for (const id of core.furanAArc.concat(core.furanBArc)) {
    const external = (adjacency.get(id) || []).filter((entry) => !skip.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }
  for (const id of [core.p0, core.p1, core.p2, core.p3]) {
    const external = (adjacency.get(id) || []).filter((entry) => !skip.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }

  const candidates = [
    { id: core.freeX, locant: 4 },
    { id: core.freeY, locant: 8 },
  ];
  let anchor = null;
  const others = [];
  for (const candidate of candidates) {
    const amph = matchAmphetamineChain(graph, adjacency, skip, candidate.id);
    if (amph) {
      if (anchor) {
        return null;
      }
      anchor = { locant: candidate.locant, kind: 'amphetamine', match: amph };
      continue;
    }
    const phen = matchEthylamineChain(graph, adjacency, skip, candidate.id);
    if (phen) {
      if (anchor) {
        return null;
      }
      anchor = { locant: candidate.locant, kind: 'phenethylamine', match: phen };
    } else {
      others.push(candidate);
    }
  }
  if (!anchor) {
    return nameDifuranGenericCore(graph, idSet, adjacency, skip, visited, candidates, 'benzodifuran');
  }
  anchor.match.atoms.forEach((id) => visited.add(id));

  const acc = createAttachmentAccumulator();
  for (const other of others) {
    if (
      !collectCoreAttachments(graph, adjacency, other.id, other.locant, skip, acc, visited, true)
    ) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }

  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return null;
  }

  let aminoPart;
  if (anchor.match.substituents.length === 0) {
    aminoPart = 'amino';
  } else if (anchor.match.substituents.length === 1) {
    aminoPart = anchor.match.substituents[0] + 'amino';
  } else if (
    anchor.match.substituents.length === 2 &&
    anchor.match.substituents[0] === anchor.match.substituents[1]
  ) {
    aminoPart = 'di' + anchor.match.substituents[0] + 'amino';
  } else {
    return null;
  }
  const chainSuffix = anchor.kind === 'amphetamine' ? 'propyl' : 'ethyl';
  const branchName = '(2-' + aminoPart + chainSuffix + ')';

  const allEntries = entries
    .map((entry) => ({ name: entry.name, locant: entry.index }))
    .concat([{ name: branchName, locant: anchor.locant }]);
  const prefix = assembleSubstituentPrefix(allEntries, true);
  if (prefix === null) {
    return null;
  }
  return prefix + 'benzodifuran';
}

function deriveTricyclicName(graph, atomIds, bonds, coreAtomIds, coreBonds) {
  const extractAtomIds = coreAtomIds || atomIds;
  const extractBonds = coreBonds || bonds;
  const core = extractCarbolineCore(extractAtomIds, extractBonds);
  if (core) {
    const adjacency = buildAdjacency(atomIds, bonds);
    const idSet = new Set(atomIds);
    for (const orientation of carbolineOrientations(graph, core)) {
      const name = nameCarboline(graph, idSet, adjacency, core, orientation);
      if (name) {
        return name;
      }
    }
  }
  if (core) {
    const adjacency = buildAdjacency(atomIds, bonds);
    const idSet = new Set(atomIds);
    for (const orientation of carbolineOrientations(graph, core)) {
      const name = nameTetrahydrocarbazole(graph, idSet, adjacency, core, orientation);
      if (name) {
        return name;
      }
    }
  }
  const noramineCore = extractNoramineCore(extractAtomIds, extractBonds);
  if (noramineCore) {
    const adjacency = buildAdjacency(atomIds, bonds);
    const idSet = new Set(atomIds);
    for (const orientation of noramineOrientations(graph, noramineCore)) {
      const name = nameNoramine(graph, idSet, adjacency, noramineCore, orientation);
      if (name) {
        return name;
      }
    }
  }
  const difuranCore = extractDifuranCore(extractAtomIds, extractBonds);
  if (difuranCore) {
    const adjacency = buildAdjacency(atomIds, bonds);
    const idSet = new Set(atomIds);
    const swappedCore = {
      core: difuranCore.core,
      p0: difuranCore.p2,
      freeX: difuranCore.freeY,
      p1: difuranCore.p3,
      furanBArc: difuranCore.furanAArc,
      p2: difuranCore.p0,
      freeY: difuranCore.freeX,
      p3: difuranCore.p1,
      furanAArc: difuranCore.furanBArc,
    };
    const firstLocant = (text) => {
      const m = /\d+/.exec(text);
      return m ? parseInt(m[0], 10) : 0;
    };
    const pickDifuran = (namer) => {
      const a = namer(graph, idSet, adjacency, difuranCore);
      const b = namer(graph, idSet, adjacency, swappedCore);
      if (!a || !b) {
        return a || b;
      }
      return firstLocant(b) < firstLocant(a) ? b : a;
    };
    const name = pickDifuran(nameDifuranScaffold);
    if (name) {
      return name;
    }
    const saturatedName = pickDifuran(nameDifuranSaturatedScaffold);
    if (saturatedName) {
      return saturatedName;
    }
  }
  return null;
}

function extractErgolineCore(atomIds, bonds) {
  const trimmed = trimToRing(atomIds, bonds);
  const core = trimmed.remaining;
  const active = trimmed.active;
  if (core.size !== 16 || active.length !== 19) {
    return null;
  }
  const degree = new Map();
  core.forEach((id) => degree.set(id, 0));
  active.forEach((bond) => {
    degree.set(bond.atomA, (degree.get(bond.atomA) || 0) + 1);
    degree.set(bond.atomB, (degree.get(bond.atomB) || 0) + 1);
  });
  const fusion = [];
  for (const id of core) {
    const value = degree.get(id);
    if (value === 3) {
      fusion.push(id);
    } else if (value !== 2) {
      return null;
    }
  }
  if (fusion.length !== 6) {
    return null;
  }
  const fusionSet = new Set(fusion);
  const localAdjacency = new Map();
  core.forEach((id) => localAdjacency.set(id, []));
  active.forEach((bond) => {
    localAdjacency.get(bond.atomA).push(bond.atomB);
    localAdjacency.get(bond.atomB).push(bond.atomA);
  });

  const hubCandidates = fusion.filter((id) =>
    localAdjacency.get(id).every((neighborId) => fusionSet.has(neighborId))
  );
  if (hubCandidates.length !== 1) {
    return null;
  }
  const hub = hubCandidates[0];
  const hubNeighbors = localAdjacency.get(hub);
  if (hubNeighbors.length !== 3) {
    return null;
  }

  function walk(prevId, startId) {
    const chain = [];
    let prev = prevId;
    let cur = startId;
    while (!fusionSet.has(cur)) {
      chain.push(cur);
      const options = localAdjacency.get(cur).filter((id) => id !== prev);
      if (options.length !== 1) {
        return null;
      }
      prev = cur;
      cur = options[0];
    }
    return { chain, landing: cur };
  }

  const walks = [];
  for (const hn of hubNeighbors) {
    const others = localAdjacency.get(hn).filter((id) => id !== hub);
    if (others.length !== 2) {
      return null;
    }
    for (const other of others) {
      const result = walk(hn, other);
      if (!result) {
        return null;
      }
      walks.push({ from: hn, result });
    }
  }

  const hubNeighborSet = new Set(hubNeighbors);
  const internal = walks.filter((w) => hubNeighborSet.has(w.result.landing));
  const external = walks.filter((w) => !hubNeighborSet.has(w.result.landing));
  if (internal.length !== 4 || external.length !== 2) {
    return null;
  }
  const countByNode = new Map();
  hubNeighbors.forEach((id) => countByNode.set(id, 0));
  internal.forEach((w) => {
    countByNode.set(w.from, (countByNode.get(w.from) || 0) + 1);
  });
  const shared = hubNeighbors.filter((id) => countByNode.get(id) === 2);
  const leaves = hubNeighbors.filter((id) => countByNode.get(id) === 1);
  if (shared.length !== 1 || leaves.length !== 2) {
    return null;
  }
  const n2 = shared[0];
  const internalFromN2 = internal.filter((w) => w.from === n2);
  if (internalFromN2.length !== 2) {
    return null;
  }
  const pyrroleWalk = internalFromN2.find((w) => w.result.chain.length === 2);
  const benzoWalk = internalFromN2.find((w) => w.result.chain.length === 3);
  if (!pyrroleWalk || !benzoWalk) {
    return null;
  }
  const n1 = pyrroleWalk.result.landing;
  const n3 = benzoWalk.result.landing;
  if (!leaves.includes(n1) || !leaves.includes(n3) || n1 === n3) {
    return null;
  }

  const n1External = external.find((w) => w.from === n1);
  const n3External = external.find((w) => w.from === n3);
  if (!n1External || !n3External) {
    return null;
  }
  const landingD = n1External.result.landing;
  const landingP = n3External.result.landing;
  const usedSoFar = new Set([hub, n1, n2, n3]);
  if (
    landingD === landingP ||
    usedSoFar.has(landingD) ||
    usedSoFar.has(landingP)
  ) {
    return null;
  }
  if (!localAdjacency.get(landingD).includes(landingP)) {
    return null;
  }

  const cameFromD =
    n1External.result.chain.length > 0
      ? n1External.result.chain[n1External.result.chain.length - 1]
      : n1;
  const dOthers = localAdjacency.get(landingD).filter(
    (id) => id !== landingP && id !== cameFromD
  );
  if (dOthers.length !== 1) {
    return null;
  }
  const ringCWalk = walk(landingD, dOthers[0]);
  if (!ringCWalk || ringCWalk.landing !== landingP || ringCWalk.chain.length !== 4) {
    return null;
  }

  return {
    core,
    hub,
    n1,
    n2,
    n3,
    pyrroleChain: pyrroleWalk.result.chain,
    benzoChain: benzoWalk.result.chain,
    ringDChainFromN1: n1External.result.chain,
    landingD,
    landingP,
    ringCChain: ringCWalk.chain,
  };
}

function ergolineSubName(graph, adjacency, idSet, id, fromId) {
  const branch = collectBranch(graph, adjacency, id, fromId);
  if (branch && ALKYL_PREFIXES[branch.length]) {
    return ALKYL_PREFIXES[branch.length];
  }
  try {
    const ctx = genContext(graph, Array.from(idSet));
    return genSubstituent(ctx, id, fromId, 1);
  } catch (error) {
    return null;
  }
}

function ergolineWrap(name) {
  return /[0-9,]|\s/.test(name) ? '(' + name + ')' : name;
}

function nameErgoline(graph, idSet, adjacency, core) {
  const { hub, n1, n2, n3, pyrroleChain, benzoChain, ringDChainFromN1, landingD, landingP, ringCChain } = core;

  const skeletonCarbons = [hub, n1, n2, n3, landingD, landingP].concat(
    pyrroleChain.slice(1, 2),
    benzoChain,
    ringDChainFromN1,
    ringCChain.slice(1, 3)
  );
  if (skeletonCarbons.some((id) => elementOf(graph, id) !== 'C')) {
    return null;
  }
  if (elementOf(graph, pyrroleChain[0]) !== 'N') {
    return null;
  }
  const n6 = ringCChain[0];
  const c8 = ringCChain[2];
  if (elementOf(graph, n6) !== 'N') {
    return null;
  }

  const pyrroleRing = [n1, pyrroleChain[1], pyrroleChain[0], n2, hub];
  const benzoRing = [n2].concat(benzoChain, [n3, hub]);
  const indoleSet = new Set(pyrroleRing.concat(benzoRing));
  for (const id of indoleSet) {
    if (id === pyrroleChain[0]) {
      continue;
    }
    const doubles = (adjacency.get(id) || []).filter((entry) => entry.order === 2 && indoleSet.has(entry.id));
    if (doubles.length !== 1) {
      return null;
    }
  }

  const ringDBonds = [[n1, ringDChainFromN1[0]]]
    .concat(
      ringDChainFromN1.slice(1).map((id, i) => [ringDChainFromN1[i], id])
    )
    .concat([
      [ringDChainFromN1[ringDChainFromN1.length - 1], landingD],
      [landingD, landingP],
      [landingP, n3],
    ]);
  for (const [a, b] of ringDBonds) {
    const bond = graph.getBond(a, b);
    if (!bond || bond.order !== 1) {
      return null;
    }
  }

  const ringCBonds = [
    [landingD, n6],
    [n6, ringCChain[1]],
    [ringCChain[1], c8],
  ];
  for (const [a, b] of ringCBonds) {
    const bond = graph.getBond(a, b);
    if (!bond || bond.order !== 1) {
      return null;
    }
  }
  const c8c9 = graph.getBond(c8, ringCChain[3]);
  const c9c10 = graph.getBond(ringCChain[3], landingP);
  if (!c8c9 || !c9c10) {
    return null;
  }
  let ene = null;
  if (c8c9.order === 1 && c9c10.order === 2) {
    ene = '9,10';
  } else if (c8c9.order === 2 && c9c10.order === 1) {
    ene = '8,9';
  } else if (c8c9.order === 1 && c9c10.order === 1) {
    ene = 'none';
  } else {
    return null;
  }

  const skip = new Set(core.core);
  const indoleN = pyrroleChain[0];
  const c2 = pyrroleChain[1];
  const c2External = (adjacency.get(c2) || []).filter((entry) => !skip.has(entry.id));
  let c2Name = null;
  if (c2External.length === 1 && c2External[0].order === 1) {
    const c2Sub = c2External[0].id;
    const c2Element = elementOf(graph, c2Sub);
    const halo = { F: 'fluoro', Cl: 'chloro', Br: 'bromo', I: 'iodo' }[c2Element];
    if (halo) {
      c2Name = halo;
    } else if (c2Element === 'C' && (adjacency.get(c2Sub) || []).length === 1) {
      c2Name = 'methyl';
    }
    if (c2Name) {
      skip.add(c2Sub);
    }
  }
  const sealedAtoms = [hub, n1, n2, n3, landingD, landingP].concat(
    pyrroleChain.slice(1),
    benzoChain,
    ringDChainFromN1,
    [ringCChain[1], ringCChain[3]]
  );
  for (const id of sealedAtoms) {
    const external = (adjacency.get(id) || []).filter((entry) => !skip.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }

  const indoleNExternal = (adjacency.get(indoleN) || []).filter((entry) => !skip.has(entry.id));
  let indoleNName = null;
  if (indoleNExternal.length === 0) {
    indoleNName = null;
  } else if (indoleNExternal.length === 1 && indoleNExternal[0].order === 1) {
    const branch = collectBranch(graph, adjacency, indoleNExternal[0].id, indoleN);
    if (branch) {
      indoleNName = ALKYL_PREFIXES[branch.length];
      if (!indoleNName) {
        return null;
      }
    } else {
      const acyl = resolveAcylBranch(graph, adjacency, indoleNExternal[0].id, indoleN);
      if (acyl) {
        indoleNName = acyl.name;
      } else {
        const carbonyl = indoleNExternal[0].id;
        const carbonylRest = (adjacency.get(carbonyl) || []).filter((entry) => entry.id !== indoleN);
        const oxo = carbonylRest.find((entry) => entry.order === 2 && elementOf(graph, entry.id) === 'O' && (adjacency.get(entry.id) || []).length === 1);
        const ringEntry = carbonylRest.find((entry) => entry !== oxo);
        if (!oxo || carbonylRest.length !== 2 || !ringEntry || ringEntry.order !== 1 || elementOf(graph, ringEntry.id) !== 'C') {
          return null;
        }
        const ringOthers = (adjacency.get(ringEntry.id) || []).filter((entry) => entry.id !== carbonyl);
        const isCyclopropyl =
          ringOthers.length === 2 &&
          ringOthers.every((entry) => entry.order === 1 && elementOf(graph, entry.id) === 'C' && (adjacency.get(entry.id) || []).length === 2) &&
          graph.getBond(ringOthers[0].id, ringOthers[1].id);
        if (!isCyclopropyl) {
          return null;
        }
        indoleNName = 'cyclopropanecarbonyl';
        [carbonyl, oxo.id, ringEntry.id, ringOthers[0].id, ringOthers[1].id].forEach((id) => skip.add(id));
      }
    }
  } else {
    return null;
  }

  const n6External = (adjacency.get(n6) || []).filter((entry) => !skip.has(entry.id));
  let n6Name = null;
  if (n6External.length === 0) {
    n6Name = null;
  } else if (n6External.length === 1 && n6External[0].order === 1) {
    const branch = collectBranch(graph, adjacency, n6External[0].id, n6);
    if (branch) {
      n6Name = ALKYL_PREFIXES[branch.length];
      if (!n6Name) {
        return null;
      }
    } else {
      const allyl = resolveAllylBranch(graph, adjacency, n6External[0].id, n6);
      if (allyl) {
        n6Name = allyl.name;
      } else {
        n6Name = ergolineSubName(graph, adjacency, idSet, n6External[0].id, n6);
        if (!n6Name) {
          return null;
        }
        n6Name = ergolineWrap(n6Name);
      }
    }
  } else {
    return null;
  }

  let ergolinePrefix;
  if (c2Name) {
    ergolinePrefix =
      (indoleNName ? '1-' + indoleNName + '-' : '') +
      '2-' + c2Name + '-' +
      (n6Name ? '6-' + n6Name + '-' : '6-nor-');
  } else if (n6Name && indoleNName) {
    ergolinePrefix =
      n6Name === indoleNName
        ? '1,6-di' + n6Name + '-'
        : '1-' + indoleNName + '-6-' + n6Name + '-';
  } else if (n6Name) {
    ergolinePrefix = '6-' + n6Name + '-';
  } else if (indoleNName) {
    ergolinePrefix = '1-' + indoleNName + '-nor-';
  } else {
    ergolinePrefix = '6-nor-';
  }

  const genericErgoline = () => {
    const c8Ext = (adjacency.get(c8) || []).filter((entry) => !skip.has(entry.id));
    const entries = [];
    if (indoleNName) {
      entries.push({ name: indoleNName, locant: 1 });
    }
    if (c2Name) {
      entries.push({ name: c2Name, locant: 2 });
    }
    if (n6Name) {
      entries.push({ name: n6Name, locant: 6 });
    }
    let suffix = '';
    if (c8Ext.length > 1 || (c8Ext.length === 1 && c8Ext[0].order !== 1)) {
      return null;
    }
    if (c8Ext.length === 1) {
      const sub = ergolineSubName(graph, adjacency, idSet, c8Ext[0].id, c8);
      if (!sub) {
        return null;
      }
      if (sub === 'carboxy') {
        suffix = '-8-carboxylic acid';
      } else {
        entries.push({ name: sub, locant: 8 });
      }
    }
    const parent = (ene === 'none' ? '' : ene + '-didehydro') + 'ergoline' + suffix;
    return (entries.length ? genAssemblePrefixes(entries) + (/^\d/.test(parent) ? '-' : '') : '') + parent;
  };
  const lysergyl = () => {
  const c8External = (adjacency.get(c8) || []).filter((entry) => !skip.has(entry.id));
  if (c8External.length !== 1 || c8External[0].order !== 1) {
    return null;
  }
  const carbonylId = c8External[0].id;
  const carbonylAtom = graph.getAtom(carbonylId);
  if (!carbonylAtom || carbonylAtom.element !== 'C') {
    return null;
  }
  const carbonylNeighbors = (adjacency.get(carbonylId) || []).filter(
    (entry) => entry.id !== c8
  );
  if (
    carbonylNeighbors.length === 1 &&
    carbonylNeighbors[0].order === 1 &&
    elementOf(graph, carbonylNeighbors[0].id) === 'O' &&
    (adjacency.get(carbonylNeighbors[0].id) || []).length === 1
  ) {
    return ergolinePrefix + 'lysergol';
  }
  if (carbonylNeighbors.length !== 2) {
    return null;
  }
  const oxygenEntry = carbonylNeighbors.find(
    (entry) => elementOf(graph, entry.id) === 'O' && entry.order === 2
  );
  const nitrogenEntry = carbonylNeighbors.find(
    (entry) => elementOf(graph, entry.id) === 'N' && entry.order === 1
  );
  if (!oxygenEntry || !nitrogenEntry) {
    return null;
  }
  if ((adjacency.get(oxygenEntry.id) || []).length !== 1) {
    return null;
  }
  const amideNitrogenId = nitrogenEntry.id;
  const amideBranches = (adjacency.get(amideNitrogenId) || []).filter(
    (entry) => entry.id !== carbonylId
  );
  if (amideBranches.length === 0) {
    return ergolinePrefix + 'lysergamide';
  }
  if (amideBranches.some((entry) => entry.order !== 1)) {
    return null;
  }
  if (amideBranches.length === 1) {
    const resolved = resolveAminoAlcoholSubstituent(graph, adjacency, amideBranches[0].id, amideNitrogenId);
    const single = resolved ? resolved.name : ergolineSubName(graph, adjacency, idSet, amideBranches[0].id, amideNitrogenId);
    if (!single) {
      return null;
    }
    return ergolinePrefix + 'N-' + ergolineWrap(single) + 'lysergamide';
  }
  if (amideBranches.length !== 2) {
    return null;
  }
  const azetidideEarly = resolveAzetidideRing(graph, adjacency, amideNitrogenId, amideBranches[0].id, amideBranches[1].id);
  if (azetidideEarly) {
    return ergolinePrefix + azetidideEarly.name;
  }
  const seen = new Set([amideNitrogenId, carbonylId, amideBranches[0].id]);
  const walkStack = [amideBranches[0].id];
  let inRing = false;
  while (walkStack.length && !inRing) {
    const cur = walkStack.pop();
    for (const e of adjacency.get(cur) || []) {
      if (e.id === amideBranches[1].id) {
        inRing = true;
        break;
      }
      if (!seen.has(e.id) && !skip.has(e.id)) {
        seen.add(e.id);
        walkStack.push(e.id);
      }
    }
  }
  if (inRing) {
    const ringSub = ergolineSubName(graph, adjacency, idSet, amideNitrogenId, carbonylId);
    const m = ringSub && /^(.*)in-(\d+)-yl$/.exec(ringSub);
    if (!m) {
      return null;
    }
    return (/morphol$/.test(m[1]) ? '4' : m[2]) + '-(' + ergolinePrefix + 'lysergoyl)' + m[1] + 'ine';
  }
  const branchNames = amideBranches.map((entry) => ergolineSubName(graph, adjacency, idSet, entry.id, amideNitrogenId));
  const dialkylFailed = branchNames.some((n) => !n);
  if (!dialkylFailed && branchNames[0] === branchNames[1]) {
    return ergolinePrefix + 'N,N-di' + ergolineWrap(branchNames[0]) + 'lysergamide';
  }
  if (!dialkylFailed) {
    const sorted = branchNames.slice().sort((a, b) => (a.replace(/[^a-z]/g, '') < b.replace(/[^a-z]/g, '') ? -1 : 1));
    return ergolinePrefix + 'N-' + ergolineWrap(sorted[0]) + '-N-' + ergolineWrap(sorted[1]) + 'lysergamide';
  }
  const azetidide = resolveAzetidideRing(
    graph,
    adjacency,
    amideNitrogenId,
    amideBranches[0].id,
    amideBranches[1].id
  );
  if (azetidide) {
    return ergolinePrefix + azetidide.name;
  }
  return null;
  };
  const setErgolineStereoLocants = () => {
    const map = new Map();
    map.set(landingD, 5);
    if (ene !== '8,9') {
      map.set(c8, 8);
    }
    if (ene === 'none') {
      map.set(landingP, 10);
    }
    lastScaffoldStereoLocants = map;
  };

  const lyName = lysergyl();
  if (lyName) {
    setErgolineStereoLocants();
    if (ene === '9,10') {
      return lyName;
    }
    const tag = ene === 'none' ? '9,10-dihydro' : '9,10-dihydro-8,9-didehydro';
    return lyName.replace(/lyserg/, (m, offset) => (offset > 0 && lyName[offset - 1] !== '-' ? '-' : '') + tag + m);
  }
  const generic = genericErgoline();
  if (generic) {
    setErgolineStereoLocants();
  }
  return generic;
}

function extractMorphinanCore(atomIds, bonds) {
  const trimmed = trimToRing(atomIds, bonds);
  const core = trimmed.remaining;
  const active = trimmed.active;
  if (core.size !== 18) {
    return null;
  }
  const degree = new Map();
  core.forEach((id) => degree.set(id, 0));
  active.forEach((bond) => {
    degree.set(bond.atomA, (degree.get(bond.atomA) || 0) + 1);
    degree.set(bond.atomB, (degree.get(bond.atomB) || 0) + 1);
  });
  const localAdjacency = new Map();
  core.forEach((id) => localAdjacency.set(id, []));
  active.forEach((bond) => {
    localAdjacency.get(bond.atomA).push(bond.atomB);
    localAdjacency.get(bond.atomB).push(bond.atomA);
  });

  const hubs = [];
  const fusion = [];
  for (const id of core) {
    const d = degree.get(id);
    if (d === 4) {
      hubs.push(id);
    } else if (d === 3) {
      fusion.push(id);
    } else if (d !== 2) {
      return null;
    }
  }
  if (hubs.length !== 1 || fusion.length !== 6) {
    return null;
  }
  const hub = hubs[0];
  const fusionSet = new Set(fusion);

  function walk(prevId, startId) {
    const chain = [];
    let prev = prevId;
    let cur = startId;
    while (!fusionSet.has(cur)) {
      chain.push(cur);
      const options = localAdjacency.get(cur).filter((id) => id !== prev);
      if (options.length !== 1) {
        return null;
      }
      prev = cur;
      cur = options[0];
    }
    return { chain, landing: cur };
  }

  const hubNeighbors = localAdjacency.get(hub);
  if (hubNeighbors.length !== 4) {
    return null;
  }
  const spokes = [];
  for (const hn of hubNeighbors) {
    const result = walk(hub, hn);
    if (!result) {
      return null;
    }
    spokes.push(result);
  }
  const directSpokes = spokes.filter((s) => s.chain.length === 0);
  const longSpokes = spokes.filter((s) => s.chain.length === 3);
  if (directSpokes.length !== 3 || longSpokes.length !== 1) {
    return null;
  }
  const ringDChain = longSpokes[0].chain;
  const cy = longSpokes[0].landing;

  let furanC = null;
  let arHub = null;
  let cx = null;
  for (const s of directSpokes) {
    const id = s.landing;
    const others = localAdjacency.get(id).filter((n) => n !== hub);
    if (others.length !== 2) {
      return null;
    }
    const othersFusionCount = others.filter((n) => fusionSet.has(n)).length;
    if (othersFusionCount === 2) {
      arHub = id;
    } else if (othersFusionCount === 1) {
      cx = id;
    } else if (othersFusionCount === 0) {
      furanC = id;
    } else {
      return null;
    }
  }
  if (!furanC || !arHub || !cx) {
    return null;
  }

  const cxOthers = localAdjacency.get(cx).filter((n) => n !== hub);
  const cxFusionNeighbor = cxOthers.find((n) => fusionSet.has(n));
  const cxChainStart = cxOthers.find((n) => n !== cxFusionNeighbor);
  if (!cxFusionNeighbor || cxFusionNeighbor !== cy || !cxChainStart) {
    return null;
  }
  const ringCWalk = walk(cx, cxChainStart);
  if (!ringCWalk || ringCWalk.landing !== furanC || ringCWalk.chain.length !== 3) {
    return null;
  }

  const arOthers = localAdjacency.get(arHub).filter((n) => n !== hub);
  if (arOthers.length !== 2) {
    return null;
  }
  let arB = null;
  let arC = null;
  let oRing = null;
  let aromaticChain = null;
  for (const n of arOthers) {
    const nOthers = localAdjacency.get(n).filter((x) => x !== arHub);
    if (nOthers.length !== 2) {
      return null;
    }
    const w1 = walk(n, nOthers[0]);
    const w2 = walk(n, nOthers[1]);
    if (!w1 || !w2) {
      return null;
    }
    if (w1.landing === cy && w1.chain.length === 1) {
      arB = n;
    } else if (w2.landing === cy && w2.chain.length === 1) {
      arB = n;
    } else if (w1.landing === furanC && w1.chain.length === 1) {
      arC = n;
      oRing = w1.chain[0];
      aromaticChain = w2.chain;
    } else if (w2.landing === furanC && w2.chain.length === 1) {
      arC = n;
      oRing = w2.chain[0];
      aromaticChain = w1.chain;
    } else {
      return null;
    }
  }
  if (!arB || !arC || !oRing || !aromaticChain || aromaticChain.length !== 3) {
    return null;
  }

  return {
    core,
    hub,
    cy,
    cx,
    furanC,
    arHub,
    arB,
    arC,
    oRing,
    ringDChain,
    ringCChain: ringCWalk.chain,
    aromaticChain,
  };
}

function morphinanReadSimpleO(graph, adjacency, skip, atomId) {
  const external = (adjacency.get(atomId) || []).filter((entry) => !skip.has(entry.id));
  if (external.length === 0) {
    return { kind: 'none' };
  }
  if (external.length !== 1) {
    return null;
  }
  const entry = external[0];
  if (entry.order === 2 && elementOf(graph, entry.id) === 'O') {
    if ((adjacency.get(entry.id) || []).length !== 1) {
      return null;
    }
    return { kind: 'oxo' };
  }
  if (entry.order !== 1) {
    return null;
  }
  if (elementOf(graph, entry.id) === 'O') {
    const oNeighbors = (adjacency.get(entry.id) || []).filter((e) => e.id !== atomId);
    if (oNeighbors.length === 0) {
      return { kind: 'hydroxy' };
    }
    if (oNeighbors.length !== 1 || oNeighbors[0].order !== 1) {
      return null;
    }
    const carbonId = oNeighbors[0].id;
    if (elementOf(graph, carbonId) !== 'C') {
      return null;
    }
    const cNeighbors = (adjacency.get(carbonId) || []).filter((e) => e.id !== entry.id);
    if (cNeighbors.length === 0) {
      return { kind: 'methoxy' };
    }
    const dbO = cNeighbors.find((e) => e.order === 2 && elementOf(graph, e.id) === 'O');
    const meC = cNeighbors.find((e) => e.order === 1 && elementOf(graph, e.id) === 'C');
    if (
      cNeighbors.length === 2 &&
      dbO &&
      meC &&
      (adjacency.get(dbO.id) || []).length === 1 &&
      (adjacency.get(meC.id) || []).length === 1
    ) {
      return { kind: 'acetoxy' };
    }
    return null;
  }
  return null;
}

function nameMorphinan(graph, idSet, adjacency, core) {
  const { hub, cy, cx, furanC, arHub, arB, arC, oRing, ringDChain, ringCChain, aromaticChain } = core;

  if (
    elementOf(graph, hub) !== 'C' ||
    elementOf(graph, cy) !== 'C' ||
    elementOf(graph, cx) !== 'C' ||
    elementOf(graph, furanC) !== 'C' ||
    elementOf(graph, arHub) !== 'C' ||
    elementOf(graph, arB) !== 'C' ||
    elementOf(graph, arC) !== 'C' ||
    elementOf(graph, oRing) !== 'O' ||
    ringDChain.some((id) => elementOf(graph, id) !== 'C' && id !== ringDChain[2]) ||
    elementOf(graph, ringDChain[2]) !== 'N' ||
    ringCChain.some((id) => elementOf(graph, id) !== 'C') ||
    aromaticChain.some((id) => elementOf(graph, id) !== 'C')
  ) {
    return null;
  }

  const nId = ringDChain[2];
  const skip = new Set(core.core);

  for (const id of [hub, cy, furanC, arHub, arB, arC].concat(ringDChain.slice(0, 2), ringCChain.slice(0, 2), aromaticChain.slice(1))) {
    const external = (adjacency.get(id) || []).filter((entry) => !skip.has(entry.id));
    if (external.length > 0) {
      return null;
    }
  }

  const aromaticBondAB = graph.getBond(arB, aromaticChain[2]);
  const aromaticBondBC = graph.getBond(aromaticChain[2], aromaticChain[1]);
  const aromaticBondCD = graph.getBond(aromaticChain[1], aromaticChain[0]);
  const aromaticBondDE = graph.getBond(aromaticChain[0], arC);
  const aromaticBondEF = graph.getBond(arC, arHub);
  const aromaticBondFA = graph.getBond(arHub, arB);
  const aromaticBonds = [aromaticBondAB, aromaticBondBC, aromaticBondCD, aromaticBondDE, aromaticBondEF, aromaticBondFA];
  if (aromaticBonds.some((b) => !b)) {
    return null;
  }
  const doubleCount = aromaticBonds.filter((b) => b.order === 2).length;
  if (doubleCount !== 3) {
    return null;
  }

  const oRingBond1 = graph.getBond(arC, oRing);
  const oRingBond2 = graph.getBond(oRing, furanC);
  if (!oRingBond1 || oRingBond1.order !== 1 || !oRingBond2 || oRingBond2.order !== 1) {
    return null;
  }

  const hubBonds = [
    graph.getBond(hub, cx),
    graph.getBond(hub, arHub),
    graph.getBond(hub, furanC),
    graph.getBond(hub, ringDChain[0]),
  ];
  if (hubBonds.some((b) => !b || b.order !== 1)) {
    return null;
  }

  const c14c8Bond = graph.getBond(cx, cy);
  const c14ringCBond = graph.getBond(cx, ringCChain[0]);
  if (!c14c8Bond || c14c8Bond.order !== 1 || !c14ringCBond || c14ringCBond.order !== 1) {
    return null;
  }
  const c7c8Bond = graph.getBond(ringCChain[0], ringCChain[1]);
  const c6c7Bond = graph.getBond(ringCChain[1], ringCChain[2]);
  const c6c5Bond = graph.getBond(ringCChain[2], furanC);
  if (!c7c8Bond || !c6c7Bond || c6c7Bond.order !== 1 || !c6c5Bond || c6c5Bond.order !== 1) {
    return null;
  }
  const eneC7C8 = c7c8Bond.order === 2;
  if (!eneC7C8 && c7c8Bond.order !== 1) {
    return null;
  }

  const ringDBonds = [
    graph.getBond(ringDChain[0], ringDChain[1]),
    graph.getBond(ringDChain[1], nId),
    graph.getBond(nId, cy),
  ];
  if (ringDBonds.some((b) => !b || b.order !== 1)) {
    return null;
  }

  const c3Sub = morphinanReadSimpleO(graph, adjacency, skip, aromaticChain[0]);
  if (!c3Sub || (c3Sub.kind !== 'hydroxy' && c3Sub.kind !== 'methoxy' && c3Sub.kind !== 'acetoxy')) {
    return null;
  }
  const c6Sub = morphinanReadSimpleO(graph, adjacency, skip, ringCChain[2]);
  if (!c6Sub) {
    return null;
  }
  const c14Sub = morphinanReadSimpleO(graph, adjacency, skip, cx);
  if (!c14Sub || (c14Sub.kind !== 'none' && c14Sub.kind !== 'hydroxy')) {
    return null;
  }
  const has14OH = c14Sub.kind === 'hydroxy';

  const nExternal = (adjacency.get(nId) || []).filter((entry) => !skip.has(entry.id));
  let nKind = null;
  if (nExternal.length === 1 && nExternal[0].order === 1) {
    const branch = collectBranch(graph, adjacency, nExternal[0].id, nId);
    if (branch && branch.length === 1) {
      nKind = 'methyl';
    } else {
      const allyl = resolveAllylBranch(graph, adjacency, nExternal[0].id, nId);
      if (allyl) {
        nKind = 'allyl';
      } else {
        const cpEntry = nExternal[0];
        const cpNeighbors = (adjacency.get(cpEntry.id) || []).filter((e) => e.id !== nId);
        if (cpNeighbors.length === 1 && cpNeighbors[0].order === 1) {
          const ringAtom = cpNeighbors[0].id;
          const ringNeighbors = (adjacency.get(ringAtom) || []).filter((e) => e.id !== cpEntry.id);
          if (ringNeighbors.length === 2 && ringNeighbors.every((e) => e.order === 1)) {
            const a1 = ringNeighbors[0].id;
            const a2 = ringNeighbors[1].id;
            const a1Neighbors = (adjacency.get(a1) || []).filter((e) => e.id !== ringAtom);
            const a2Neighbors = (adjacency.get(a2) || []).filter((e) => e.id !== ringAtom);
            if (a1Neighbors.length === 1 && a1Neighbors[0].id === a2 && a1Neighbors[0].order === 1) {
              nKind = 'cyclopropylmethyl';
            } else if (
              a1Neighbors.length === 1 &&
              a2Neighbors.length === 1 &&
              a1Neighbors[0].id !== a2
            ) {
              const bId = a1Neighbors[0].id;
              const bNeighbors = (adjacency.get(bId) || []).filter((e) => e.id !== a1);
              if (
                bNeighbors.length === 1 &&
                bNeighbors[0].id === a2 &&
                bNeighbors[0].order === 1 &&
                elementOf(graph, bId) === 'C' &&
                elementOf(graph, a1) === 'C' &&
                elementOf(graph, a2) === 'C' &&
                elementOf(graph, ringAtom) === 'C'
              ) {
                nKind = 'cyclobutylmethyl';
              }
            }
          }
        }
      }
    }
  } else if (nExternal.length === 0) {
    nKind = 'none';
  }
  if (!nKind) {
    return null;
  }

  const key = [nKind, c3Sub.kind, c6Sub.kind, has14OH ? 1 : 0, eneC7C8 ? 1 : 0].join(':');
  const name = MORPHINAN_NAMES[key] || null;
  if (name) {
    lastScaffoldStereoLocants = new Map([
      [furanC, 5],
      [ringCChain[2], 6],
      [cy, 9],
      [hub, 13],
      [cx, 14],
    ]);
  }
  return name;
}

const MORPHINAN_NAMES = {
  'methyl:hydroxy:hydroxy:0:1': 'morphine',
  'methyl:methoxy:hydroxy:0:1': 'codeine',
  'methyl:acetoxy:acetoxy:0:1': 'heroin',
  'allyl:hydroxy:hydroxy:0:1': 'nalorphine',
  'methyl:methoxy:hydroxy:0:0': 'dihydrocodeine',
  'methyl:methoxy:oxo:0:0': 'hydrocodone',
  'methyl:hydroxy:oxo:0:0': 'hydromorphone',
  'methyl:methoxy:oxo:1:0': 'oxycodone',
  'methyl:hydroxy:oxo:1:0': 'oxymorphone',
  'allyl:hydroxy:oxo:1:0': 'naloxone',
  'cyclopropylmethyl:hydroxy:oxo:1:0': 'naltrexone',
  'cyclobutylmethyl:hydroxy:hydroxy:1:0': 'nalbuphine',
};

function findMethylenedioxyBridge(graph, atomIds, adjacency) {
  for (const id of atomIds) {
    if (elementOf(graph, id) !== 'C') {
      continue;
    }
    const neighbors = adjacency.get(id) || [];
    if (neighbors.length !== 2 || neighbors.some((entry) => entry.order !== 1 || elementOf(graph, entry.id) !== 'O')) {
      continue;
    }
    const ends = neighbors.map((entry) => (adjacency.get(entry.id) || []).filter((next) => next.id !== id));
    if (ends.some((list) => list.length !== 1 || list[0].order !== 1 || elementOf(graph, list[0].id) !== 'C')) {
      continue;
    }
    const a = ends[0][0].id;
    const b = ends[1][0].id;
    if (!(adjacency.get(a) || []).some((entry) => entry.id === b)) {
      continue;
    }
    return { atoms: [neighbors[0].id, id, neighbors[1].id], ends: [a, b] };
  }
  return null;
}

function derivePentacyclicName(graph, atomIds, bonds, coreAtomIds, coreBonds) {
  lastScaffoldStereoLocants = null;
  const adjacency = buildAdjacency(atomIds, bonds);
  const idSet = new Set(atomIds);
  const core = extractMorphinanCore(coreAtomIds || atomIds, coreBonds || bonds);
  if (core) {
    return nameMorphinan(graph, idSet, adjacency, core);
  }
  const bridge = findMethylenedioxyBridge(graph, coreAtomIds || atomIds, adjacency);
  if (!bridge) {
    return null;
  }
  const bridgeSet = new Set(bridge.atoms);
  const reducedIds = (coreAtomIds || atomIds).filter((id) => !bridgeSet.has(id));
  const reducedBonds = (coreBonds || bonds).filter((bond) => !bridgeSet.has(bond.atomA) && !bridgeSet.has(bond.atomB));
  const aporphineCore = extractAporphineCore(graph, reducedIds, reducedBonds);
  if (!aporphineCore) {
    return null;
  }
  return nameAporphine(graph, idSet, adjacency, aporphineCore, bridge);
}

function extractMorphinanSkeleton(graph, atomIds) {
  const idSet = new Set(atomIds);
  const allBonds = graph.bonds.filter((bond) => idSet.has(bond.atomA) && idSet.has(bond.atomB));
  const connected = (from, to, skipBond) => {
    const seen = new Set([from]);
    const queue = [from];
    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur === to) {
        return true;
      }
      for (const bond of allBonds) {
        if (bond === skipBond || (bond.atomA !== cur && bond.atomB !== cur)) {
          continue;
        }
        const next = bond.atomA === cur ? bond.atomB : bond.atomA;
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    return false;
  };
  const ringBonds = allBonds.filter((bond) => connected(bond.atomA, bond.atomB, bond));
  const blockOf = new Map();
  for (const bond of ringBonds) {
    const a = blockOf.get(bond.atomA);
    const b = blockOf.get(bond.atomB);
    if (a && b && a !== b) {
      b.forEach((id) => {
        a.add(id);
        blockOf.set(id, a);
      });
    } else if (a || b) {
      const block = a || b;
      block.add(bond.atomA);
      block.add(bond.atomB);
      blockOf.set(bond.atomA, block);
      blockOf.set(bond.atomB, block);
    } else {
      const block = new Set([bond.atomA, bond.atomB]);
      blockOf.set(bond.atomA, block);
      blockOf.set(bond.atomB, block);
    }
  }
  const core = [...new Set(blockOf.values())].find((block) => block.size === 17);
  if (!core) {
    return null;
  }
  const active = ringBonds.filter((bond) => core.has(bond.atomA) && core.has(bond.atomB));
  if (active.length !== 20) {
    return null;
  }
  const localAdjacency = new Map();
  core.forEach((id) => localAdjacency.set(id, []));
  active.forEach((bond) => {
    localAdjacency.get(bond.atomA).push(bond.atomB);
    localAdjacency.get(bond.atomB).push(bond.atomA);
  });
  const hubs = [...core].filter((id) => localAdjacency.get(id).length === 4);
  if (hubs.length !== 1 || [...core].some((id) => localAdjacency.get(id).length > 4)) {
    return null;
  }
  const hub = hubs[0];
  const spokes = [];
  for (const start of localAdjacency.get(hub)) {
    const chain = [];
    let prev = hub;
    let cur = start;
    while (localAdjacency.get(cur).length === 2) {
      chain.push(cur);
      const next = localAdjacency.get(cur).find((id) => id !== prev);
      prev = cur;
      cur = next;
      if (chain.length > 4) {
        return null;
      }
    }
    spokes.push({ chain, landing: cur });
  }
  const lengths = spokes.map((s) => s.chain.length).sort().join(',');
  if (lengths !== '0,0,3,4') {
    return null;
  }
  const nSpoke = spokes.find((s) => s.chain.length === 3);
  const ringCSpoke = spokes.find((s) => s.chain.length === 4);
  if (
    elementOf(graph, nSpoke.chain[2]) !== 'N' ||
    nSpoke.chain.slice(0, 2).some((id) => elementOf(graph, id) !== 'C') ||
    ringCSpoke.chain.some((id) => elementOf(graph, id) !== 'C')
  ) {
    return null;
  }
  const c9 = nSpoke.landing;
  const c14 = ringCSpoke.landing;
  const direct = spokes.filter((s) => s.chain.length === 0).map((s) => s.landing);
  if (!direct.includes(c14) || !localAdjacency.get(c14).includes(c9)) {
    return null;
  }
  if ([hub, c9, c14].some((id) => elementOf(graph, id) !== 'C')) {
    return null;
  }
  return { c9, c13: hub, c14 };
}

function extractAporphineCore(graph, allAtomIds, allBonds) {
  const remaining = trimToRing(allAtomIds, allBonds).remaining;
  const atomIds = allAtomIds.filter((id) => remaining.has(id));
  const bonds = allBonds.filter((bond) => remaining.has(bond.atomA) && remaining.has(bond.atomB));
  if (atomIds.length !== 17 || bonds.length !== 20) {
    return null;
  }
  const adjacency = buildAdjacency(atomIds, bonds);
  const others = (id, ...exclude) => (adjacency.get(id) || []).map((entry) => entry.id).filter((next) => !exclude.includes(next));
  const degree = (id) => (adjacency.get(id) || []).length;
  const bonded = (a, b) => (adjacency.get(a) || []).some((entry) => entry.id === b);
  const single = (id, ...exclude) => {
    const rest = others(id, ...exclude);
    return rest.length === 1 ? rest[0] : null;
  };
  for (const n6 of atomIds) {
    if (elementOf(graph, n6) !== 'N' || degree(n6) !== 2) {
      continue;
    }
    for (const c6a of adjacency.get(n6).map((entry) => entry.id)) {
      const c5 = single(n6, c6a);
      if (degree(c6a) !== 3 || degree(c5) !== 2) {
        continue;
      }
      const c4 = single(c5, n6);
      const c3a = c4 && degree(c4) === 2 ? single(c4, c5) : null;
      if (!c3a || degree(c3a) !== 3) {
        continue;
      }
      for (const c7 of others(c6a, n6)) {
        const c11c = single(c6a, n6, c7);
        if (degree(c7) !== 2 || degree(c11c) !== 3 || !bonded(c11c, c3a)) {
          continue;
        }
        const c7a = single(c7, c6a);
        const c3 = single(c3a, c4, c11c);
        const c11b = single(c11c, c3a, c6a);
        if (!c7a || !c3 || !c11b || degree(c7a) !== 3 || degree(c11b) !== 3) {
          continue;
        }
        const c2 = single(c3, c3a);
        const c1 = c2 ? single(c2, c3) : null;
        if (!c1 || !bonded(c1, c11b)) {
          continue;
        }
        const c11a = single(c11b, c11c, c1);
        if (!c11a || degree(c11a) !== 3 || !bonded(c11a, c7a)) {
          continue;
        }
        const c8 = single(c7a, c7, c11a);
        const c9 = c8 ? single(c8, c7a) : null;
        const c10 = c9 ? single(c9, c8) : null;
        const c11 = c10 ? single(c10, c9) : null;
        if (!c11 || !bonded(c11, c11a)) {
          continue;
        }
        const map = { c1, c2, c3, c3a, c4, c5, n6, c6a, c7, c7a, c8, c9, c10, c11, c11a, c11b, c11c };
        if (new Set(Object.values(map)).size !== 17) {
          continue;
        }
        return map;
      }
    }
  }
  return null;
}

function nameAporphine(graph, idSet, adjacency, core, bridge) {
  const carbons = Object.keys(core).filter((key) => key !== 'n6');
  if (carbons.some((key) => elementOf(graph, core[key]) !== 'C')) {
    return null;
  }
  const ringA = [core.c1, core.c2, core.c3, core.c3a, core.c11c, core.c11b];
  const ringD = [core.c7a, core.c8, core.c9, core.c10, core.c11, core.c11a];
  for (const ring of [ringA, ringD]) {
    const orders = cycleBondOrders(graph, ring);
    if (!orders || !hasAlternatingOrders(orders)) {
      return null;
    }
  }
  const saturated = [
    [core.c3a, core.c4], [core.c4, core.c5], [core.c5, core.n6], [core.n6, core.c6a],
    [core.c6a, core.c7], [core.c7, core.c7a], [core.c6a, core.c11c], [core.c11b, core.c11a],
  ];
  if (saturated.some(([a, b]) => ((adjacency.get(a) || []).find((entry) => entry.id === b) || {}).order !== 1)) {
    return null;
  }
  const coreIds = new Set(Object.values(core).concat(bridge ? bridge.atoms : []));
  const visited = new Set(coreIds);
  for (const key of ['c3a', 'c6a', 'c7a', 'c11a', 'c11b', 'c11c']) {
    if ((adjacency.get(core[key]) || []).some((entry) => !coreIds.has(entry.id))) {
      return null;
    }
  }
  const nSubNames = [];
  for (const extra of (adjacency.get(core.n6) || []).filter((entry) => !coreIds.has(entry.id))) {
    if (extra.order !== 1) {
      return null;
    }
    const resolved = resolveAminoSubstituent(graph, adjacency, extra.id, core.n6);
    if (!resolved) {
      return null;
    }
    nSubNames.push(resolved.name);
    resolved.atoms.forEach((id) => visited.add(id));
  }
  if (nSubNames.length > 1) {
    return null;
  }
  const acc = createAttachmentAccumulator();
  const positions = [[core.c1, 1], [core.c2, 2], [core.c3, 3], [core.c4, 4], [core.c5, 5], [core.c7, 7], [core.c8, 8], [core.c9, 9], [core.c10, 10], [core.c11, 11]];
  for (const [id, locant] of positions) {
    if (!collectCoreAttachments(graph, adjacency, id, locant, coreIds, acc, visited, true)) {
      return null;
    }
  }
  if (visited.size !== idSet.size) {
    return null;
  }
  const entries = scaffoldSubstituentEntries(acc);
  if (!entries) {
    return null;
  }
  if (bridge) {
    const bridgeLocants = bridge.ends.map((id) => (positions.find(([pid]) => pid === id) || [])[1]).sort((a, b) => a - b);
    if (bridgeLocants.some((locant) => locant === undefined)) {
      return null;
    }
    entries.push({ name: 'methylenedioxy', index: bridgeLocants.join(',') });
  }
  const prefix = assembleSubstituentPrefix(
    entries.map((entry) => ({ name: entry.name, locant: entry.index })),
    true
  );
  if (prefix === null) {
    return null;
  }
  if (nSubNames.length === 1 && nSubNames[0] === 'methyl') {
    return prefix + 'aporphine';
  }
  const nPrefix = buildNitrogenPrefix(nSubNames);
  return [prefix, nPrefix].filter((part) => part !== '').join('-') + 'noraporphine';
}

function deriveTetracyclicName(graph, atomIds, bonds, coreAtomIds, coreBonds) {
  lastScaffoldStereoLocants = null;
  const adjacency = buildAdjacency(atomIds, bonds);
  const idSet = new Set(atomIds);
  const core = extractErgolineCore(coreAtomIds || atomIds, coreBonds || bonds);
  if (core) {
    return nameErgoline(graph, idSet, adjacency, core);
  }
  const aporphineCore = extractAporphineCore(graph, coreAtomIds || atomIds, coreBonds || bonds);
  if (aporphineCore) {
    return nameAporphine(graph, idSet, adjacency, aporphineCore);
  }
  return null;
}
