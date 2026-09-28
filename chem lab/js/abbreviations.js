const ABBREVIATIONS = {
  Me: { smiles: 'C', label: 'Me' },
  Et: { smiles: 'CC', label: 'Et' },
  iPr: { smiles: 'C(C)C', label: 'iPr' },
  tBu: { smiles: 'C(C)(C)C', label: 'tBu' },
  Ph: { smiles: 'c1ccccc1', label: 'Ph' },
  Bn: { smiles: 'Cc1ccccc1', label: 'Bn' },
  Ac: { smiles: 'C(C)=O', label: 'Ac' },
  Boc: { smiles: 'C(=O)OC(C)(C)C', label: 'Boc' },
  Cbz: { smiles: 'C(=O)OCc1ccccc1', label: 'Cbz' },
  TMS: { smiles: '[Si](C)(C)C', label: 'TMS' },
  TBS: { smiles: '[Si](C)(C)C(C)(C)C', label: 'TBS' },
  OMe: { smiles: 'OC', label: 'OMe', left: 'MeO' },
  OAc: { smiles: 'OC(C)=O', label: 'OAc', left: 'AcO' },
  OTs: { smiles: 'OS(=O)(=O)c1ccc(C)cc1', label: 'OTs', left: 'TsO' },
  OMs: { smiles: 'OS(C)(=O)=O', label: 'OMs', left: 'MsO' },
  CF3: { smiles: 'C(F)(F)F', label: 'CF3', left: 'F3C' },
  CO2Me: { smiles: 'C(=O)OC', label: 'CO2Me', left: 'MeO2C' },
  CN: { smiles: 'C#N', label: 'CN', left: 'NC' },
  NO2: { smiles: 'N(=O)=O', label: 'NO2', left: 'O2N' },
};

const ABBREVIATION_SETTINGS = {
  stampPrefix: 'abbr:',
  maxGroupAtoms: 24,
};

function abbreviationKeyForStamp(stampKey) {
  const prefix = ABBREVIATION_SETTINGS.stampPrefix;
  if (typeof stampKey !== 'string' || !stampKey.startsWith(prefix)) {
    return null;
  }
  const key = stampKey.slice(prefix.length);
  return Object.prototype.hasOwnProperty.call(ABBREVIATIONS, key) ? key : null;
}

function abbreviationFragment(key) {
  const definition = ABBREVIATIONS[key];
  if (!definition) {
    return null;
  }
  if (!definition.fragment) {
    const full = smilesToFragment('C' + definition.smiles);
    const dummy = full.atoms[0].id;
    definition.fragment = {
      format: full.format,
      atoms: full.atoms.slice(1),
      bonds: full.bonds.filter((bond) => bond.atomA !== dummy && bond.atomB !== dummy),
    };
  }
  return definition.fragment;
}

function abbreviationLabel(atom, side) {
  const definition = ABBREVIATIONS[atom.abbr];
  if (!definition) {
    return atom.abbr;
  }
  return side < 0 ? definition.left || definition.label : definition.label;
}

function placeAbbreviation(graph, key, point, originAtomId) {
  const fragment = abbreviationFragment(key);
  if (!fragment) {
    return null;
  }
  const hasOrigin = originAtomId !== null && originAtomId !== undefined;
  const created = placeCustomStamp(graph, fragment, point, originAtomId, fragment.atoms[0].id);
  if (!created) {
    return null;
  }
  const anchor = created[0];
  if (!hasOrigin) {
    const dx = point.x - anchor.x;
    const dy = point.y - anchor.y;
    created.forEach((atom) => {
      atom.x += dx;
      atom.y += dy;
    });
  }
  anchor.abbr = key;
  created.slice(1).forEach((atom) => {
    atom.abbrHidden = true;
  });
  return created;
}

function abbreviationHiddenIds(graph) {
  const hidden = new Set();
  graph.atoms.forEach((atom) => {
    if (atom.abbr) {
      graph.abbreviationMembers(atom.id).forEach((id) => hidden.add(id));
    }
  });
  return hidden;
}

function withAbbreviationMembers(graph, atomIds) {
  const result = new Set(atomIds);
  atomIds.forEach((id) => {
    const atom = graph.getAtom(id);
    if (atom && atom.abbr) {
      graph.abbreviationMembers(id).forEach((member) => result.add(member));
    }
  });
  return Array.from(result);
}

function abbreviationLocked(graph, atomId) {
  const atom = graph.getAtom(atomId);
  if (!atom || !atom.abbr) {
    return false;
  }
  const members = new Set(graph.abbreviationMembers(atomId));
  return graph.bondsForAtom(atomId).some((bond) => !members.has(bond.atomA === atomId ? bond.atomB : bond.atomA));
}

function expandAbbreviation(graph, anchorId) {
  const anchor = graph.getAtom(anchorId);
  if (!anchor || !anchor.abbr) {
    return false;
  }
  graph.abbreviationMembers(anchorId).forEach((id) => {
    delete graph.getAtom(id).abbrHidden;
  });
  delete anchor.abbr;
  return true;
}

function abbreviationSignature(graph, anchorId, memberIds) {
  const inGroup = new Set(memberIds.concat([anchorId]));
  const visit = (id, path) => {
    const atom = graph.getAtom(id);
    const parts = [];
    graph.bondsForAtom(id).forEach((bond) => {
      const next = bond.atomA === id ? bond.atomB : bond.atomA;
      if (!inGroup.has(next)) {
        return;
      }
      if (path.includes(next)) {
        if (next !== path[path.length - 2]) {
          parts.push('r' + bond.order);
        }
        return;
      }
      parts.push(bond.order + visit(next, path.concat([next])));
    });
    return atom.element + (atom.charge || '') + '[' + parts.sort().join(',') + ']';
  };
  return visit(anchorId, [anchorId]);
}

function abbreviationDefinitionSignature(key) {
  const definition = ABBREVIATIONS[key];
  if (definition.signature === undefined) {
    const fragment = abbreviationFragment(key);
    const graph = new Graph();
    const map = new Map();
    fragment.atoms.forEach((a) => {
      const atom = graph.addAtom(a.element, a.x, a.y);
      if (a.charge) {
        atom.charge = a.charge;
      }
      map.set(a.id, atom.id);
    });
    fragment.bonds.forEach((b) => {
      graph.addBond(map.get(b.atomA), map.get(b.atomB)).order = b.order;
    });
    const anchorId = map.get(fragment.atoms[0].id);
    definition.signature = abbreviationSignature(graph, anchorId, graph.atoms.map((a) => a.id).filter((id) => id !== anchorId));
    definition.size = graph.atoms.length;
  }
  return definition.signature;
}

function abbreviationSide(graph, anchorId, attachmentId) {
  const members = [];
  const seen = new Set([anchorId, attachmentId]);
  const queue = [anchorId];
  while (queue.length) {
    const id = queue.shift();
    const atom = graph.getAtom(id);
    if (atom.abbr || atom.abbrHidden) {
      return null;
    }
    for (const bond of graph.bondsForAtom(id)) {
      const next = bond.atomA === id ? bond.atomB : bond.atomA;
      if (next === attachmentId && id !== anchorId) {
        return null;
      }
      if (seen.has(next)) {
        continue;
      }
      seen.add(next);
      members.push(next);
      if (members.length >= ABBREVIATION_SETTINGS.maxGroupAtoms) {
        return null;
      }
      queue.push(next);
    }
  }
  return members;
}

function abbreviationMatches(graph, atomId) {
  const component = graph.connectedComponents().find((c) => c.atomIds.includes(atomId));
  if (!component || component.atomIds.length < 2) {
    return [];
  }
  const matches = [];
  const seen = new Set();
  component.atomIds.forEach((anchorId) => {
    graph.bondsForAtom(anchorId).forEach((bond) => {
      const attachmentId = bond.atomA === anchorId ? bond.atomB : bond.atomA;
      if (bond.order !== 1) {
        return;
      }
      const members = abbreviationSide(graph, anchorId, attachmentId);
      if (!members || (anchorId !== atomId && !members.includes(atomId))) {
        return;
      }
      const signature = abbreviationSignature(graph, anchorId, members);
      Object.keys(ABBREVIATIONS).forEach((key) => {
        if (abbreviationDefinitionSignature(key) !== signature || ABBREVIATIONS[key].size !== members.length + 1) {
          return;
        }
        const id = key + ':' + anchorId;
        if (!seen.has(id)) {
          seen.add(id);
          matches.push({ key, anchorId, memberIds: members, attachmentId });
        }
      });
    });
  });
  matches.sort((p, q) => p.memberIds.length - q.memberIds.length);
  return matches;
}

function collapseAbbreviation(graph, match) {
  const anchor = graph.getAtom(match.anchorId);
  if (!anchor || anchor.abbr) {
    return false;
  }
  anchor.abbr = match.key;
  match.memberIds.forEach((id) => {
    graph.getAtom(id).abbrHidden = true;
  });
  return true;
}
