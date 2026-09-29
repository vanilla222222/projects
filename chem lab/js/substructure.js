const SUBSTRUCTURE_SETTINGS = { maxMatches: 200, maxSteps: 200000 };

function substructureFromSmiles(text) {
  const mol = smilesStripHydrogens(parseSmiles(text));
  if (mol.atoms.length === 0) {
    throw new Error('No atoms in the pattern');
  }
  const { graph, ids, bondMap } = smilesBuildGraph(mol);
  mol.atoms.forEach((atom, i) => {
    const a = graph.getAtom(ids[i]);
    a.aromatic = !!atom.aromatic;
    a.bracket = !!atom.bracket;
  });
  mol.bonds.forEach((b) => {
    bondMap.get(b).aromatic = !!b.aromatic;
  });
  const ctx = propContext(graph, graph.atoms.map((a) => a.id));
  graph.atoms.forEach((a) => {
    if (ctx.isAromatic(a.id)) {
      a.aromatic = true;
    }
  });
  graph.bonds.forEach((b) => {
    if (ctx.isAromatic(b.atomA) && ctx.isAromatic(b.atomB) && ctx.isRingBond(b.atomA, b.atomB)) {
      b.aromatic = true;
    }
  });
  return graph;
}

function substructureQuery(text) {
  const source = String(text || '').trim();
  if (!source) {
    return { error: 'Enter a SMILES pattern or a name' };
  }
  try {
    return substructureFromSmiles(source);
  } catch (error) {
    const key = source.toLowerCase();
    if (typeof NAME_SMILES !== 'undefined' && Object.prototype.hasOwnProperty.call(NAME_SMILES, key)) {
      try {
        return substructureFromSmiles(NAME_SMILES[key]);
      } catch (inner) {
        return { error: 'Could not read the pattern for ' + source };
      }
    }
    return { error: 'Not a valid SMILES pattern or known name' };
  }
}

function substructureOrder(query, targetCounts) {
  const nbrs = new Map(query.atoms.map((a) => [a.id, []]));
  query.bonds.forEach((b) => {
    nbrs.get(b.atomA).push(b);
    nbrs.get(b.atomB).push(b);
  });
  const rarity = (a) => targetCounts.get(a.element) || 0;
  const order = [];
  const parent = new Map();
  const placed = new Set();
  while (placed.size < query.atoms.length) {
    const start = query.atoms.filter((a) => !placed.has(a.id)).sort((a, b) => rarity(a) - rarity(b) || nbrs.get(b.id).length - nbrs.get(a.id).length)[0];
    placed.add(start.id);
    parent.set(start.id, null);
    const queue = [start.id];
    while (queue.length) {
      const cur = queue.shift();
      order.push(cur);
      nbrs.get(cur).forEach((b) => {
        const other = b.atomA === cur ? b.atomB : b.atomA;
        if (!placed.has(other)) {
          placed.add(other);
          parent.set(other, cur);
          queue.push(other);
        }
      });
    }
  }
  return { order, parent, nbrs };
}

function substructureMatches(graph, query, atomIds) {
  if (!query || query.error || !query.atoms || query.atoms.length === 0) {
    return [];
  }
  const ids = atomIds ? Array.from(atomIds) : graph.atoms.map((a) => a.id);
  const ctx = propContext(graph, ids);
  const targetCounts = new Map();
  ctx.ids.forEach((id) => targetCounts.set(ctx.el.get(id), (targetCounts.get(ctx.el.get(id)) || 0) + 1));
  const { order, parent, nbrs } = substructureOrder(query, targetCounts);
  const atomOk = (q, t) => {
    if (q.element !== ctx.el.get(t)) {
      return false;
    }
    if (q.bracket && (q.charge || 0) !== ctx.charge.get(t)) {
      return false;
    }
    return !q.aromatic || ctx.isAromatic(t);
  };
  const bondOk = (qb, ta, tb) => {
    const tBond = graph.getBond(ta, tb);
    if (!tBond) {
      return null;
    }
    const tAromatic = ctx.isAromatic(ta) && ctx.isAromatic(tb) && ctx.isRingBond(ta, tb);
    if (qb.aromatic) {
      return tAromatic ? tBond : null;
    }
    if (tAromatic && qb.order === 1) {
      return null;
    }
    return tBond.order === qb.order ? tBond : null;
  };
  const map = new Map();
  const used = new Set();
  const results = [];
  const seen = new Set();
  let steps = 0;
  const qAtom = new Map(query.atoms.map((a) => [a.id, a]));
  const place = (k) => {
    if (results.length >= SUBSTRUCTURE_SETTINGS.maxMatches || steps > SUBSTRUCTURE_SETTINGS.maxSteps) {
      return;
    }
    if (k === order.length) {
      const atoms = order.map((q) => map.get(q));
      const key = atoms.slice().sort((a, b) => a - b).join(',');
      if (!seen.has(key)) {
        seen.add(key);
        const bonds = query.bonds.map((b) => graph.getBond(map.get(b.atomA), map.get(b.atomB)).id);
        results.push({ atoms, bonds });
      }
      return;
    }
    const qid = order[k];
    const q = qAtom.get(qid);
    const p = parent.get(qid);
    const candidates = p === null ? ctx.ids : ctx.nbrs.get(map.get(p)).map((n) => n.id);
    for (const t of candidates) {
      steps += 1;
      if (used.has(t) || !atomOk(q, t)) {
        continue;
      }
      const ok = nbrs.get(qid).every((b) => {
        const other = b.atomA === qid ? b.atomB : b.atomA;
        return !map.has(other) || bondOk(b, t, map.get(other)) !== null;
      });
      if (!ok) {
        continue;
      }
      map.set(qid, t);
      used.add(t);
      place(k + 1);
      map.delete(qid);
      used.delete(t);
      if (results.length >= SUBSTRUCTURE_SETTINGS.maxMatches) {
        return;
      }
    }
  };
  place(0);
  return results;
}
