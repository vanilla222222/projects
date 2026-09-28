let lastChainStereoLocants = null;

function takeLastChainStereoLocants() {
  const locants = lastChainStereoLocants;
  lastChainStereoLocants = null;
  return locants;
}

function nameForChain(graph, idSet, adjacency, chain, cyanoIds) {
  const chainIndex = new Map();
  chain.forEach((id, index) => chainIndex.set(id, index));
  const chainSet = new Set(chain);
  const visited = new Set(chain);
  const cyanoEntries = [];
  (cyanoIds || []).forEach((cyanoId) => {
    const links = adjacency.get(cyanoId) || [];
    const anchor = links.find((n) => chainIndex.has(n.id));
    const nitrogen = links.find((n) => n.order === 3);
    if (anchor && nitrogen) {
      chainSet.add(cyanoId);
      visited.add(cyanoId);
      visited.add(nitrogen.id);
      cyanoEntries.push({ name: 'cyano', index: chainIndex.get(anchor.id) });
    }
  });

  const acc = createAttachmentAccumulator();
  const substituents = acc.substituents;
  cyanoEntries.forEach((entry) => substituents.push(entry));
  const hydroxyls = acc.hydroxyls;
  const carbonyls = acc.carbonyls;
  const amines = acc.amines;
  const unsaturations = [];

  for (let i = 0; i < chain.length - 1; i++) {
    const bond = graph.getBond(chain[i], chain[i + 1]);
    if (!bond) {
      return null;
    }
    if (bond.order === 2 || bond.order === 3) {
      unsaturations.push({ kind: bond.order, index: i });
    }
  }

  for (let i = 0; i < chain.length; i++) {
    const carbonId = chain[i];
    const neighbors = adjacency.get(carbonId) || [];
    for (const neighbor of neighbors) {
      if (chainIndex.has(neighbor.id) && Math.abs(chainIndex.get(neighbor.id) - i) !== 1) {
        return null;
      }
    }
    if (
      !collectCoreAttachments(graph, adjacency, carbonId, i, chainSet, acc, visited, true)
    ) {
      return null;
    }
  }

  if (visited.size !== idSet.size) {
    return null;
  }

  const alcohols = hydroxyls.slice();
  const acids = [];
  const aldehydes = [];
  const ketones = [];
  for (const index of carbonyls) {
    const degree = chainDegreeAt(chain.length, index);
    const paired = alcohols.indexOf(index);
    if (paired !== -1) {
      if (degree > 1) {
        return null;
      }
      alcohols.splice(paired, 1);
      acids.push(index);
    } else if (degree <= 1) {
      aldehydes.push(index);
    } else {
      ketones.push(index);
    }
  }

  for (const index of acc.nitriles) {
    if (chainDegreeAt(chain.length, index) > 1) {
      return null;
    }
  }

  const groups = [
    { kind: 'acid', locants: acids },
    { kind: 'nitrile', locants: acc.nitriles },
    { kind: 'aldehyde', locants: aldehydes },
    { kind: 'ketone', locants: ketones },
    { kind: 'alcohol', locants: alcohols },
    { kind: 'thiol', locants: acc.thiols },
    { kind: 'amine', locants: amines },
  ].filter((group) => group.locants.length > 0);

  const principal = groups.length > 0 ? groups[0] : null;
  if (acc.nitriles.length > 0 && principal.kind !== 'nitrile') {
    return null;
  }
  for (const group of groups.slice(1)) {
    const prefixName = SECONDARY_PREFIX_NAMES[group.kind];
    if (!prefixName) {
      return null;
    }
    for (const index of group.locants) {
      substituents.push({ name: prefixName, index });
    }
  }
  const chainLength = chain.length;
  const root = NAME_ROOTS[chainLength];
  if (!root) {
    return null;
  }

  const forward = {
    suffixLocants: principal
      ? principal.locants.map((index) => index + 1).sort((a, b) => a - b)
      : null,
    unsaturation: unsaturations.map((entry) => entry.index + 1).sort((a, b) => a - b),
    doubles: unsaturations.filter((entry) => entry.kind === 2).map((entry) => entry.index + 1).sort((a, b) => a - b),
    substituents: substituents.map((entry) => entry.index + 1).sort((a, b) => a - b),
  };
  const reverse = {
    suffixLocants: principal
      ? principal.locants.map((index) => chainLength - index).sort((a, b) => a - b)
      : null,
    unsaturation: unsaturations
      .map((entry) => chainLength - 1 - entry.index)
      .sort((a, b) => a - b),
    doubles: unsaturations
      .filter((entry) => entry.kind === 2)
      .map((entry) => chainLength - 1 - entry.index)
      .sort((a, b) => a - b),
    substituents: substituents
      .map((entry) => chainLength - entry.index)
      .sort((a, b) => a - b),
  };
  forward.cited = citationOrderLocants(substituents, chain.map((id, index) => index + 1));
  reverse.cited = citationOrderLocants(substituents, chain.map((id, index) => chainLength - index));
  const useReverse = shouldReverseChain(forward, reverse);
  const terminalPrincipal = principal && ['acid', 'nitrile', 'aldehyde'].includes(principal.kind);
  const ambiguousShortChain = chainLength === 2 && !terminalPrincipal && (principal ? substituents.length > 0 : substituents.length > 1);
  const showLocants = chainLength >= 3 || ambiguousShortChain;

  let stem;
  if (unsaturations.length <= 1) {
    let unsaturation = null;
    if (unsaturations.length === 1) {
      const entry = unsaturations[0];
      unsaturation = {
        kind: entry.kind,
        locant: useReverse ? chainLength - 1 - entry.index : entry.index + 1,
      };
    }
    stem = buildStem(root, unsaturation, chainLength >= 3);
  } else {
    stem = buildMultiUnsaturationStem(
      root,
      unsaturations.map((entry) => ({
        kind: entry.kind,
        locant: useReverse ? chainLength - 1 - entry.index : entry.index + 1,
      }))
    );
    if (stem === null) {
      return null;
    }
  }

  const core = attachSuffix(
    stem,
    principal
      ? {
          kind: principal.kind,
          locants: (useReverse
            ? principal.locants.map((index) => chainLength - index)
            : principal.locants.map((index) => index + 1)
          ).sort((a, b) => a - b),
        }
      : null,
    showLocants
  );
  if (core === null) {
    return null;
  }

  const prefix = buildSubstituentPrefix(substituents, chainLength, useReverse, showLocants);
  if (prefix === null) {
    return null;
  }
  const chainLocants = new Map();
  chain.forEach((id, index) => {
    chainLocants.set(id, useReverse ? chainLength - index : index + 1);
  });
  lastChainStereoLocants = chainLocants;
  return prefix + core;
}

function buildVirtualAcid(graph, adjacency, acylId, blockedId, heteroId) {
  const virtual = new Graph();
  const idMap = new Map();
  const queue = [acylId];
  const seen = new Set([acylId]);
  const order = [];
  while (queue.length > 0) {
    const id = queue.shift();
    order.push(id);
    if (id === heteroId) {
      continue;
    }
    for (const entry of adjacency.get(id) || []) {
      if (!seen.has(entry.id)) {
        seen.add(entry.id);
        queue.push(entry.id);
      }
    }
  }
  order.forEach((id) => {
    const atom = graph.getAtom(id);
    idMap.set(id, virtual.addAtom(id === heteroId ? 'O' : atom.element, 0, 0).id);
  });
  order.forEach((id) => {
    for (const entry of adjacency.get(id) || []) {
      if (idMap.has(entry.id) && id < entry.id) {
        const bond = virtual.addBond(idMap.get(id), idMap.get(entry.id));
        if (bond) {
          bond.order = entry.order;
        }
      }
    }
  });
  return { virtual, ids: order.map((id) => idMap.get(id)), atomCount: order.length };
}

function acylStemFromAcid(acidName) {
  if (acidName === 'ethanoic acid') {
    return 'acet';
  }
  if (acidName === 'methanoic acid') {
    return 'form';
  }
  if (!acidName || !acidName.endsWith('oic acid') || /(di|tri|tetra)oic acid$/.test(acidName)) {
    return null;
  }
  return acidName.slice(0, -'oic acid'.length);
}

function nameAcidPart(graph, adjacency, acylId, blockedId, heteroId) {
  const built = buildVirtualAcid(graph, adjacency, acylId, blockedId, heteroId);
  let acidName = null;
  try {
    acidName = deriveName(built.virtual, built.ids);
  } catch (error) {
    acidName = null;
  }
  return { stem: acylStemFromAcid(acidName), atomCount: built.atomCount, acidName };
}

function resolvePlainAlkylSide(graph, adjacency, startId, fromId) {
  const resolved = resolveAlkylBranch(graph, adjacency, startId, fromId);
  if (resolved) {
    return resolved;
  }
  const generic = resolveGenericSubstituent(graph, adjacency, startId, fromId);
  if (!generic || generic.atoms.some((id) => elementOf(graph, id) !== 'C')) {
    return null;
  }
  const bare = /^\(.*\)$/.test(generic.name) && !/^\(.*\)\S*\(/.test(generic.name) ? generic.name.slice(1, -1) : generic.name;
  return { name: bare, atoms: generic.atoms };
}

function multipliedAlkylWord(alkyl) {
  if (/[0-9]/.test(alkyl)) {
    return 'bis(' + alkyl + ')';
  }
  return (/^(tert|sec|iso)-/.test(alkyl) ? 'di-' : 'di') + alkyl;
}

const ACYL_HALIDE_WORDS = { F: 'fluoride', Cl: 'chloride', Br: 'bromide', I: 'iodide' };

function classifyAcylEnd(graph, adjacency, carbonId) {
  if (elementOf(graph, carbonId) !== 'C') {
    return null;
  }
  const neighbors = adjacency.get(carbonId) || [];
  const terminal = (n) => (adjacency.get(n.id) || []).length === 1;
  const oxo = neighbors.filter((n) => n.order === 2 && elementOf(graph, n.id) === 'O' && terminal(n));
  if (oxo.length !== 1) {
    return null;
  }
  const rest = neighbors.filter((n) => n.id !== oxo[0].id);
  const carbons = rest.filter((n) => elementOf(graph, n.id) === 'C');
  const others = rest.filter((n) => elementOf(graph, n.id) !== 'C');
  if (carbons.length > 1 || others.length !== 1 || others[0].order !== 1) {
    return null;
  }
  const x = others[0];
  const element = elementOf(graph, x.id);
  if (ACYL_HALIDE_WORDS[element] && terminal(x)) {
    return { kind: 'halide', carbonId, xId: x.id, word: ACYL_HALIDE_WORDS[element], atoms: [] };
  }
  if (element === 'N' && terminal(x)) {
    return { kind: 'amide', carbonId, xId: x.id, atoms: [] };
  }
  if (element === 'O' && (adjacency.get(x.id) || []).length === 2) {
    const alkylEntry = (adjacency.get(x.id) || []).find((n) => n.id !== carbonId);
    if (alkylEntry.order !== 1) {
      return null;
    }
    const alkyl = resolvePlainAlkylSide(graph, adjacency, alkylEntry.id, x.id);
    if (!alkyl) {
      return null;
    }
    return { kind: 'ester', carbonId, xId: x.id, alkyl: alkyl.name, atoms: alkyl.atoms };
  }
  return null;
}

function nameAcylFamily(graph, idSet, adjacency) {
  const ends = [];
  for (const id of idSet) {
    const neighbors = adjacency.get(id) || [];
    const hasOxo = neighbors.some(
      (n) => n.order === 2 && elementOf(graph, n.id) === 'O' && (adjacency.get(n.id) || []).length === 1
    );
    if (!hasOxo || elementOf(graph, id) !== 'C') {
      continue;
    }
    const end = classifyAcylEnd(graph, adjacency, id);
    if (end) {
      ends.push(end);
    }
  }
  if (ends.length === 0 || ends.length > 2) {
    return null;
  }
  const kind = ends[0].kind;
  if (ends.some((end) => end.kind !== kind)) {
    return null;
  }
  if (ends.length === 1 && kind !== 'halide') {
    return null;
  }
  if (kind === 'halide' && ends.some((end) => end.word !== ends[0].word)) {
    return null;
  }
  const removed = new Set();
  ends.forEach((end) => end.atoms.forEach((id) => removed.add(id)));
  if (ends.some((end) => end.atoms.some((id) => ends.some((other) => other.carbonId === id || other.xId === id)))) {
    return null;
  }
  const virtual = new Graph();
  const idMap = new Map();
  const xIds = new Set(ends.map((end) => end.xId));
  for (const id of idSet) {
    if (removed.has(id)) {
      continue;
    }
    idMap.set(id, virtual.addAtom(xIds.has(id) ? 'O' : elementOf(graph, id), 0, 0).id);
  }
  for (const id of idMap.keys()) {
    for (const entry of adjacency.get(id) || []) {
      if (idMap.has(entry.id) && id < entry.id) {
        const bond = virtual.addBond(idMap.get(id), idMap.get(entry.id));
        if (bond) {
          bond.order = entry.order;
        }
      }
    }
  }
  const saved = [lastChainStereoLocants, lastRingStereoLocants, lastRingDisplayLocants, lastSubstituentStereoLocants];
  let acidName = null;
  try {
    acidName = deriveName(virtual, Array.from(idMap.values()));
  } catch (error) {
    acidName = null;
  }
  [lastChainStereoLocants, lastRingStereoLocants, lastRingDisplayLocants, lastSubstituentStereoLocants] = saved;
  if (!acidName) {
    return null;
  }
  if (ends.length === 2) {
    if (!acidName.endsWith('dioic acid')) {
      return null;
    }
    const base = acidName.slice(0, -'dioic acid'.length);
    if (kind === 'halide') {
      return base + 'dioyl di' + ends[0].word;
    }
    if (kind === 'amide') {
      return base + 'diamide';
    }
    const alkyls = ends.map((end) => end.alkyl).sort();
    if (alkyls[0] === alkyls[1]) {
      return multipliedAlkylWord(alkyls[0]) + ' ' + base + 'dioate';
    }
    return alkyls[0] + ' ' + alkyls[1] + ' ' + base + 'dioate';
  }
  const stem = acylStemFromAcid(acidName);
  if (!stem) {
    return null;
  }
  return stem + (stem === 'acet' || stem === 'form' ? 'yl ' : 'oyl ') + ends[0].word;
}

function nameAcyclicAcylDerivative(graph, idSet, adjacency) {
  const family = nameAcylFamily(graph, idSet, adjacency);
  if (family) {
    return family;
  }
  const acyl = [];
  for (const id of idSet) {
    if (elementOf(graph, id) !== 'C') {
      continue;
    }
    const neighbors = adjacency.get(id) || [];
    const oxo = neighbors.filter(
      (n) => n.order === 2 && elementOf(graph, n.id) === 'O' && (adjacency.get(n.id) || []).length === 1
    );
    if (oxo.length !== 1) {
      continue;
    }
    const hetero = neighbors.filter(
      (n) =>
        n.order === 1 &&
        (elementOf(graph, n.id) === 'N' ||
          (elementOf(graph, n.id) === 'O' && (adjacency.get(n.id) || []).length === 2))
    );
    if (hetero.length === 0) {
      continue;
    }
    acyl.push({ id, oxoId: oxo[0].id, hetero, neighbors });
  }
  if (acyl.length === 0) {
    return null;
  }

  const nitrogenSubstituents = (nitrogenId, acylId) => {
    const branches = (adjacency.get(nitrogenId) || []).filter((n) => n.id !== acylId);
    const names = [];
    const atoms = [];
    for (const branch of branches) {
      if (branch.order !== 1) {
        return null;
      }
      const resolved = resolvePlainAlkylSide(graph, adjacency, branch.id, nitrogenId);
      if (!resolved) {
        return null;
      }
      names.push(resolved.name);
      atoms.push(...resolved.atoms);
    }
    return { names, atoms };
  };

  if (acyl.length === 1) {
    const center = acyl[0];
    const others = center.neighbors.filter(
      (n) => n.id !== center.oxoId && !center.hetero.some((h) => h.id === n.id)
    );
    if (center.hetero.length === 2 && others.length === 0) {
      const kinds = center.hetero.map((h) => elementOf(graph, h.id)).sort().join('');
      const covered = new Set([center.id, center.oxoId, ...center.hetero.map((h) => h.id)]);
      const alkylNames = [];
      const nitrogenNames = [];
      if (kinds === 'NN') {
        const perNitrogen = center.hetero.map((h) => nitrogenSubstituents(h.id, center.id));
        if (perNitrogen.some((entry) => entry === null)) {
          return null;
        }
        perNitrogen.forEach((entry) => entry.atoms.forEach((id) => covered.add(id)));
        if (covered.size !== idSet.size) {
          return null;
        }
        const locantNames = [];
        perNitrogen.forEach((entry, index) => {
          const marker = index === 0 ? 'N' : "N'";
          entry.names.forEach((name) => locantNames.push({ name, marker }));
        });
        if (locantNames.length === 0) {
          return 'urea';
        }
        const groups = new Map();
        locantNames.forEach((entry) => {
          if (!groups.has(entry.name)) {
            groups.set(entry.name, []);
          }
          groups.get(entry.name).push(entry.marker);
        });
        const parts = Array.from(groups.keys())
          .sort()
          .map((name) => {
            const markers = groups.get(name).sort();
            const multiplier = markers.length > 1 ? MULTIPLIER_PREFIXES[markers.length] || '' : '';
            return markers.join(',') + '-' + multiplier + name;
          });
        return parts.join('-') + 'urea';
      }
      if (kinds === 'NO') {
        const nitrogen = center.hetero.find((h) => elementOf(graph, h.id) === 'N');
        const oxygen = center.hetero.find((h) => elementOf(graph, h.id) === 'O');
        const nitrogenPart = nitrogenSubstituents(nitrogen.id, center.id);
        const alkylEntry = (adjacency.get(oxygen.id) || []).find((n) => n.id !== center.id);
        const alkyl = alkylEntry ? resolvePlainAlkylSide(graph, adjacency, alkylEntry.id, oxygen.id) : null;
        if (!nitrogenPart || !alkyl) {
          return null;
        }
        nitrogenPart.atoms.forEach((id) => covered.add(id));
        alkyl.atoms.forEach((id) => covered.add(id));
        if (covered.size !== idSet.size) {
          return null;
        }
        const prefix = buildNitrogenPrefix(nitrogenPart.names);
        return alkyl.name + ' ' + (prefix ? prefix + 'carbamate' : 'carbamate');
      }
      if (kinds === 'OO') {
        const sides = center.hetero.map((h) => {
          const entry = (adjacency.get(h.id) || []).find((n) => n.id !== center.id);
          return entry ? resolvePlainAlkylSide(graph, adjacency, entry.id, h.id) : null;
        });
        if (sides.some((s) => s === null)) {
          return null;
        }
        sides.forEach((s) => s.atoms.forEach((id) => covered.add(id)));
        if (covered.size !== idSet.size) {
          return null;
        }
        const names = sides.map((s) => s.name).sort();
        if (names[0] === names[1]) {
          return multipliedAlkylWord(names[0]) + ' carbonate';
        }
        return names[0] + ' ' + names[1] + ' carbonate';
      }
      return null;
    }
    if (center.hetero.length !== 1) {
      return null;
    }
    const hetero = center.hetero[0];
    if (elementOf(graph, hetero.id) === 'O') {
      const alkylEntry = (adjacency.get(hetero.id) || []).find((n) => n.id !== center.id);
      const alkyl = alkylEntry ? resolvePlainAlkylSide(graph, adjacency, alkylEntry.id, hetero.id) : null;
      if (!alkyl) {
        return null;
      }
      const acid = nameAcidPart(graph, adjacency, center.id, hetero.id, hetero.id);
      if (acid.acidName === 'hydroxymethanoic acid' && acid.atomCount + alkyl.atoms.length === idSet.size) {
        return alkyl.name + ' hydrogen carbonate';
      }
      if (!acid.stem || acid.atomCount + alkyl.atoms.length !== idSet.size) {
        return null;
      }
      return alkyl.name + ' ' + acid.stem + (acid.stem === 'acet' || acid.stem === 'form' ? 'ate' : 'oate');
    }
    const substituents = nitrogenSubstituents(hetero.id, center.id);
    if (!substituents) {
      return null;
    }
    const acid = nameAcidPart(graph, adjacency, center.id, hetero.id, hetero.id);
    if (!acid.stem || acid.atomCount + substituents.atoms.length !== idSet.size) {
      return null;
    }
    const prefix = buildNitrogenPrefix(substituents.names);
    if (prefix === null) {
      return null;
    }
    return prefix + acid.stem + 'amide';
  }

  if (acyl.length === 2) {
    const [first, second] = acyl;
    const shared = first.hetero.find(
      (h) => elementOf(graph, h.id) === 'O' && second.hetero.some((s) => s.id === h.id)
    );
    if (!shared) {
      return null;
    }
    const firstAcid = nameAcidPart(graph, adjacency, first.id, shared.id, shared.id);
    const secondAcid = nameAcidPart(graph, adjacency, second.id, shared.id, shared.id);
    if (!firstAcid.acidName || !secondAcid.acidName) {
      return null;
    }
    if (firstAcid.atomCount + secondAcid.atomCount - 1 !== idSet.size) {
      return null;
    }
    const halfEsters = [firstAcid.acidName, secondAcid.acidName].map((n) => {
      const match = n.match(/^(\S+) hydrogen carbonate$/);
      return match ? match[1] : null;
    });
    if (halfEsters.every(Boolean)) {
      halfEsters.sort();
      return (halfEsters[0] === halfEsters[1] ? multipliedAlkylWord(halfEsters[0]) : halfEsters[0] + ' ' + halfEsters[1]) + ' dicarbonate';
    }
    if ([firstAcid.acidName, secondAcid.acidName].some((n) => / /.test(n.replace(/ acid$/, '')))) {
      return null;
    }
    const names = [firstAcid.acidName, secondAcid.acidName].map((n) =>
      n === 'ethanoic acid' ? 'acetic' : n === 'methanoic acid' ? 'formic' : n.replace(/ acid$/, '')
    );
    names.sort();
    if (names[0] === names[1]) {
      return names[0] + ' anhydride';
    }
    return names[0] + ' ' + names[1] + ' anhydride';
  }
  return null;
}

function buildMultiUnsaturationStem(root, entries) {
  const doubles = entries.filter((entry) => entry.kind === 2).map((entry) => entry.locant).sort((a, b) => a - b);
  const triples = entries.filter((entry) => entry.kind === 3).map((entry) => entry.locant).sort((a, b) => a - b);
  const multiplierFor = (count, base) => {
    if (count === 1) {
      return base;
    }
    const multiplier = MULTIPLIER_PREFIXES[count];
    return multiplier ? multiplier + base : null;
  };
  const doubleWord = doubles.length > 0 ? multiplierFor(doubles.length, 'en') : '';
  const tripleWord = triples.length > 0 ? multiplierFor(triples.length, 'yn') : '';
  if (doubleWord === null || tripleWord === null) {
    return null;
  }
  const lead = entries.length > 1 && (doubles.length > 1 || triples.length > 1) && (doubles.length === 0 || triples.length === 0) ? 'a' : '';
  let stem = root + lead;
  if (doubles.length > 0) {
    stem += '-' + doubles.join(',') + '-' + doubleWord;
  }
  if (triples.length > 0) {
    stem += '-' + triples.join(',') + '-' + tripleWord;
  }
  return stem;
}
