const RESONANCE_SETTINGS = { max: 12, expansions: 400, octetDeficit: 10, chargePair: 4, wrongAtom: 3, majorWindow: 1 };

const RESONANCE_PERIOD_TWO = new Set(['B', 'C', 'N', 'O', 'F']);

function resonanceModel(graph, atomIds) {
  const ctx = insightContext(graph, atomIds);
  const index = new Map(ctx.ids.map((id, i) => [id, i]));
  const bonds = graph.bonds.filter((b) => index.has(b.atomA) && index.has(b.atomB));
  const adj = ctx.ids.map(() => []);
  bonds.forEach((b, k) => {
    adj[index.get(b.atomA)].push({ bond: k, other: index.get(b.atomB) });
    adj[index.get(b.atomB)].push({ bond: k, other: index.get(b.atomA) });
  });
  return {
    graph,
    ids: ctx.ids,
    index,
    bonds,
    adj,
    el: ctx.ids.map((id) => ctx.el.get(id)),
    ve: ctx.ids.map((id) => insightValenceElectrons(ctx.el.get(id))),
    h: ctx.ids.map((id) => ctx.h.get(id)),
    fixedH: ctx.ids.map((id) => Number.isInteger(graph.getAtom(id).hydrogens)),
    en: ctx.ids.map((id) => insightElectronegativity(ctx.el.get(id))),
  };
}

function resonanceBondSum(model, state, i) {
  return model.adj[i].reduce((s, e) => s + state.orders[e.bond], 0);
}

function resonanceLeft(model, state, i) {
  if (model.ve[i] === null) {
    return 0;
  }
  return model.ve[i] - state.charges[i] - resonanceBondSum(model, state, i) - model.h[i];
}

function resonanceShell(model, state, i) {
  return model.ve[i] - state.charges[i] + resonanceBondSum(model, state, i) + model.h[i];
}

function resonanceGraph(model, state) {
  const copy = new Graph();
  model.ids.forEach((id, i) => {
    const atom = Object.assign({}, model.graph.getAtom(id));
    if (state.charges[i]) {
      atom.charge = state.charges[i];
    } else {
      delete atom.charge;
    }
    copy.atoms.push(atom);
  });
  model.bonds.forEach((b, k) => copy.bonds.push(Object.assign({}, b, { order: state.orders[k] })));
  copy.nextAtomId = model.graph.nextAtomId;
  copy.nextBondId = model.graph.nextBondId;
  return copy;
}

function resonanceClone(state, move) {
  return { orders: state.orders.slice(), charges: state.charges.slice(), moves: state.moves.concat(move) };
}

function resonancePairs(state) {
  let pos = 0;
  let neg = 0;
  state.charges.forEach((c) => {
    if (c > 0) {
      pos += c;
    } else if (c < 0) {
      neg -= c;
    }
  });
  return Math.min(pos, neg);
}

function resonanceSignature(model, state) {
  const orders = state.orders.map(String);
  if (state.charges.some((c) => c !== 0)) {
    const g = resonanceGraph(model, state);
    kekuleRings(g, model.ids).forEach((ring) => {
      ring.forEach((id, k) => {
        const bond = g.getBond(id, ring[(k + 1) % 6]);
        const at = model.bonds.findIndex((b) => b.id === bond.id);
        orders[at] = 'a';
      });
    });
  }
  return orders.join('') + '|' + state.charges.join(',');
}

function resonanceNormalize(model, state) {
  let changed = false;
  model.ids.forEach((id, i) => {
    if (model.el[i] !== 'N' || state.charges[i] !== 0 || resonanceBondSum(model, state, i) !== 5) {
      return;
    }
    const oxo = model.adj[i].find((e) => state.orders[e.bond] === 2 && model.el[e.other] === 'O' && model.adj[e.other].length === 1 && state.charges[e.other] === 0);
    if (!oxo) {
      return;
    }
    state.orders[oxo.bond] = 1;
    state.charges[i] = 1;
    state.charges[oxo.other] = -1;
    changed = true;
  });
  return changed;
}

function resonanceValid(model, state, base, baseProblems) {
  for (let i = 0; i < model.ids.length; i++) {
    if (Math.abs(state.charges[i]) > 1 && state.charges[i] !== base.charges[i]) {
      return false;
    }
    if (model.ve[i] === null) {
      continue;
    }
    if (resonanceLeft(model, state, i) < 0) {
      return false;
    }
    if (RESONANCE_PERIOD_TWO.has(model.el[i]) && resonanceShell(model, state, i) > Math.max(8, resonanceShell(model, base, i))) {
      return false;
    }
    if (!model.fixedH[i] && implicitHydrogenCount(model.el[i], state.charges[i], resonanceBondSum(model, state, i)) !== model.h[i]) {
      return false;
    }
  }
  if (resonancePairs(state) > resonancePairs(base) + 1) {
    return false;
  }
  const problems = valenceProblems(resonanceGraph(model, state));
  return problems.every((p) => baseProblems.has(p.atomId));
}

function resonanceExpand(model, state) {
  const out = [];
  model.ids.forEach((id, x) => {
    const charge = state.charges[x];
    const left = resonanceLeft(model, state, x);
    const lonePair = model.ve[x] !== null && charge <= 0 && left >= 2;
    const cation = charge > 0 && RESONANCE_PERIOD_TWO.has(model.el[x]) && resonanceShell(model, state, x) < 8;
    if (!lonePair && !cation) {
      return;
    }
    model.adj[x].forEach((xy) => {
      if (state.orders[xy.bond] >= 3) {
        return;
      }
      if (lonePair && state.orders[xy.bond] !== 1) {
        return;
      }
      const y = xy.other;
      model.adj[y].forEach((yz) => {
        const z = yz.other;
        if (z === x || state.orders[yz.bond] < 2) {
          return;
        }
        if (lonePair) {
          const next = resonanceClone(state, 'lone pair → π');
          next.orders[xy.bond] += 1;
          next.orders[yz.bond] -= 1;
          next.charges[x] += 1;
          next.charges[z] -= 1;
          out.push(next);
        }
        if (cation) {
          const next = resonanceClone(state, 'π → cation');
          next.orders[xy.bond] += 1;
          next.orders[yz.bond] -= 1;
          next.charges[x] -= 1;
          next.charges[z] += 1;
          out.push(next);
        }
      });
    });
  });
  const g = resonanceGraph(model, state);
  kekuleRings(g, model.ids).forEach((ring) => {
    const next = resonanceClone(state, 'ring flip');
    ring.forEach((id, k) => {
      const bond = g.getBond(id, ring[(k + 1) % 6]);
      const at = model.bonds.findIndex((b) => b.id === bond.id);
      next.orders[at] = 3 - next.orders[at];
    });
    out.push(next);
  });
  return out;
}

function resonanceScore(model, state, negativeEn, positiveEn) {
  let score = resonancePairs(state) * RESONANCE_SETTINGS.chargePair;
  model.ids.forEach((id, i) => {
    const c = state.charges[i];
    if (['C', 'N', 'O'].includes(model.el[i]) && model.ve[i] !== null && resonanceShell(model, state, i) < 8) {
      score += RESONANCE_SETTINGS.octetDeficit;
    }
    if (c < 0 && model.en[i] < negativeEn) {
      score += RESONANCE_SETTINGS.wrongAtom * -c;
    }
    if (c > 0 && model.en[i] > positiveEn) {
      score += RESONANCE_SETTINGS.wrongAtom * c;
    }
  });
  return score;
}

function resonanceContributors(graph, atomIds, options) {
  const max = (options && options.max) || RESONANCE_SETTINGS.max;
  const model = resonanceModel(graph, atomIds);
  const base = {
    orders: model.bonds.map((b) => b.order),
    charges: model.ids.map((id) => graph.getAtom(id).charge || 0),
    moves: [],
  };
  const normalized = resonanceNormalize(model, base);
  const baseProblems = new Set(valenceProblems(resonanceGraph(model, base)).map((p) => p.atomId));
  const seen = new Set([resonanceSignature(model, base)]);
  const found = [base];
  for (let i = 0, expansions = 0; i < found.length && found.length < max && expansions < RESONANCE_SETTINGS.expansions; i++, expansions++) {
    for (const next of resonanceExpand(model, found[i])) {
      if (found.length >= max) {
        break;
      }
      const sig = resonanceSignature(model, next);
      if (seen.has(sig) || !resonanceValid(model, next, base, baseProblems)) {
        continue;
      }
      seen.add(sig);
      found.push(next);
    }
  }
  const moved = new Set();
  found.forEach((s) => s.orders.forEach((o, k) => {
    if (o !== base.orders[k]) {
      moved.add(k);
    }
  }));
  model.bonds.forEach((b, k) => {
    if (found.length >= max || moved.has(k) || base.orders[k] < 2) {
      return;
    }
    const a = model.index.get(b.atomA);
    const c = model.index.get(b.atomB);
    const pair = model.el[a] === 'C' ? [a, c] : model.el[c] === 'C' ? [c, a] : null;
    if (!pair || !['O', 'N'].includes(model.el[pair[1]])) {
      return;
    }
    const next = resonanceClone(base, 'polarize C=' + model.el[pair[1]]);
    next.orders[k] -= 1;
    next.charges[pair[0]] += 1;
    next.charges[pair[1]] -= 1;
    const sig = resonanceSignature(model, next);
    if (seen.has(sig) || !resonanceValid(model, next, base, baseProblems)) {
      return;
    }
    seen.add(sig);
    found.push(next);
  });
  let negativeEn = -Infinity;
  let positiveEn = Infinity;
  found.forEach((s) => s.charges.forEach((c, i) => {
    if (c < 0) {
      negativeEn = Math.max(negativeEn, model.en[i]);
    } else if (c > 0) {
      positiveEn = Math.min(positiveEn, model.en[i]);
    }
  }));
  const results = found.map((s) => ({
    graph: resonanceGraph(model, s),
    charges: new Map(model.ids.map((id, i) => [id, s.charges[i]])),
    score: resonanceScore(model, s, negativeEn, positiveEn),
    label: 'minor',
    moves: s.moves,
  }));
  const best = Math.min(...results.map((r) => r.score));
  results.forEach((r) => {
    r.label = r.score <= best + RESONANCE_SETTINGS.majorWindow ? 'major' : 'minor';
  });
  if (normalized) {
    results[0].normalized = true;
  }
  const first = results[0];
  const rest = results.slice(1).map((r, i) => ({ r, i })).sort((p, q) => p.r.score - q.r.score || p.i - q.i).map((p) => p.r);
  return [first].concat(rest);
}
