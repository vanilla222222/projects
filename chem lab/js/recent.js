const RECENT_SETTINGS = {
  storageKey: 'recentStructures',
  limit: 12,
  labelLength: 28,
  minAtoms: 2,
};

function recentEntryFromGraph(graph, atomIds, label) {
  if (!atomIds || atomIds.length < RECENT_SETTINGS.minAtoms) {
    return null;
  }
  const ids = new Set(atomIds);
  let smiles = '';
  try {
    smiles = computeProperties(graph, atomIds).smiles || '';
  } catch (error) {
    smiles = '';
  }
  if (!smiles) {
    return null;
  }
  const text = (label || smiles).slice(0, RECENT_SETTINGS.labelLength);
  return {
    key: 'recent:' + smiles,
    label: text,
    smiles,
    atoms: graph.atoms
      .filter((a) => ids.has(a.id))
      .map((a) => (a.charge ? { id: a.id, element: a.element, x: a.x, y: a.y, charge: a.charge } : { id: a.id, element: a.element, x: a.x, y: a.y })),
    bonds: graph.bonds
      .filter((b) => ids.has(b.atomA) && ids.has(b.atomB))
      .map((b) => ({ atomA: b.atomA, atomB: b.atomB, order: b.order })),
  };
}

function mergeRecent(list, entries, limit) {
  const max = limit || RECENT_SETTINGS.limit;
  const fresh = [];
  const seen = new Set();
  entries.forEach((entry) => {
    if (entry && !seen.has(entry.smiles)) {
      seen.add(entry.smiles);
      fresh.push(entry);
    }
  });
  const kept = (list || []).filter((entry) => entry && entry.smiles && !seen.has(entry.smiles));
  return fresh.concat(kept).slice(0, max);
}

function validRecentList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry) =>
      entry &&
      typeof entry.smiles === 'string' &&
      typeof entry.label === 'string' &&
      Array.isArray(entry.atoms) &&
      Array.isArray(entry.bonds) &&
      entry.atoms.length >= RECENT_SETTINGS.minAtoms &&
      entry.atoms.every((a) => typeof a.element === 'string' && Number.isFinite(a.x) && Number.isFinite(a.y)) &&
      entry.bonds.every((b) => entry.atoms.some((a) => a.id === b.atomA) && entry.atoms.some((a) => a.id === b.atomB))
  ).map((entry) => Object.assign({}, entry, { key: 'recent:' + entry.smiles }));
}
