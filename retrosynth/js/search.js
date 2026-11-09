'use strict';
// The three questions, answered.
//
// Best-first over states, where a state is the set of molecules still to be
// made. The target alone is the start; a state whose molecules are all
// purchasable is a finished route. One step replaces a molecule with the
// precursors a transform proposes.
//
// chem lab expands a tree to a fixed depth with no ordering between branches,
// which is why three steps is its practical ceiling: there is nothing to tell
// it which branch deserves the next second. Here every state carries a cost,
// the frontier is a heap, and the weights that build the cost are the ones the
// settings expose - so "cheapest materials" and "fewest steps" are a dial
// rather than two different programs.

const SE = (typeof require === 'function' && typeof module !== 'undefined')
  ? {
    smiles: require('./smiles.js'),
    transforms: require('./transforms.js'),
    stock: require('./stock.js'),
    forward: require('./forward.js'),
  }
  : (typeof RETRO !== 'undefined'
    ? { smiles: RETRO.smiles, transforms: RETRO.transforms, stock: RETRO.stock,
      forward: RETRO.forward } : null);

// --- fingerprints, for "how alike are these two" --------------------------
// Circular atom environments to radius two, hashed. Enough to rank analogues
// and to steer a path search toward its starting material; not a substitute
// for a real descriptor.
function fingerprint(mol) {
  const bits = new Set();
  let labels = mol.atoms.map((atom, i) => atom.el + (atom.arom ? 'a' : '')
    + (atom.charge || '') + ':' + mol.degree(i) + ':' + mol.hydrogens(i));
  for (const label of labels) bits.add(label);
  for (let round = 0; round < 2; round += 1) {
    const next = labels.map((label, i) => {
      const around = mol.adjacency[i]
        .map((l) => (l.bond.arom ? 'a' : l.bond.order) + labels[l.other])
        .sort().join(',');
      return label + '{' + around + '}';
    });
    for (const label of next) bits.add(label);
    labels = next;
  }
  return bits;
}

function similarity(a, b) {
  let shared = 0;
  for (const bit of a) if (b.has(bit)) shared += 1;
  const union = a.size + b.size - shared;
  return union ? shared / union : 0;
}

// --- cost -----------------------------------------------------------------
// The weights are normalised, so only their ratios matter and a user who
// turns everything up gets the same answer as one who turns everything down.
function costModel(settings) {
  const raw = {
    steps: settings.weightSteps,
    cost: settings.weightCost,
    precedent: settings.weightPrecedent,
    convergence: settings.weightConvergence,
    protection: settings.weightProtection,
  };
  const total = Object.values(raw).reduce((a, b) => a + b, 0) || 1;
  const w = {};
  for (const [key, value] of Object.entries(raw)) w[key] = value / total;

  return function stepCost(step, state) {
    let cost = w.steps * 1;
    // Protection and deprotection buy nothing by themselves.
    if (step.family === 'protection' || step.family === 'deprotection') {
      cost += w.protection * 2;
    }
    // A step that hands back two pieces of similar size is convergent, which
    // is worth something: two short branches beat one long chain.
    if (step.precursors.length > 1) {
      const sizes = step.precursors.map((p) => p.length).sort((x, y) => y - x);
      const balance = sizes[1] / sizes[0];
      cost -= w.convergence * balance;
    }
    // A step that would give a mixture is worth having and worth charging for:
    // in practice it means a protecting group, which is an extra two steps.
    if (step.verdict && step.verdict.checked && step.verdict.selective === false) {
      cost += w.protection * 1.5;
    }
    // Making the problem bigger has to cost something, or the search wanders.
    const grew = step.precursors.join('').length - step.product.length;
    cost += w.cost * Math.max(0, grew) / 40;
    void state;
    return Math.max(0.05, cost);
  };
}

// --- the engine -----------------------------------------------------------
function makeEngine(settings, options) {
  const o = options || {};
  const stock = o.stock || SE.stock.makeStock(SE.smiles, {
    inventory: settings.inventory,
    catalogue: settings.catalogue === 'inventory' ? settings.inventory : undefined,
  });
  const stepCost = costModel(settings);
  const expansions = new Map();
  const stats = { expanded: 0, cached: 0, reused: 0, rejected: 0 };

  function expand(smiles) {
    const hit = expansions.get(smiles);
    if (hit) { stats.cached += 1; return hit; }
    let steps = [];
    try {
      const mol = SE.smiles.parse(smiles);
      steps = SE.transforms.disconnect(mol, settings);
    } catch (err) { void err; steps = []; }
    // Run each one forwards before trusting it. A disconnection looks at one
    // site; the reaction sees every site, and the difference is the whole
    // reason a route can be chemically literate and still wrong.
    if (settings.verify !== 'off' && SE.forward) {
      const kept = [];
      for (const step of steps) {
        const verdict = SE.forward.verify(step);
        step.verdict = verdict;
        if (settings.verify === 'strict' && verdict.checked
            && (!verdict.ok || verdict.selective === false)) {
          stats.rejected += 1;
          continue;
        }
        if (verdict.checked && !verdict.ok) { stats.rejected += 1; continue; }
        kept.push(step);
      }
      steps = kept;
    }
    // Keep only the best few per molecule, or the frontier explodes.
    steps.sort((a, b) => stepCost(a) - stepCost(b));
    steps = steps.slice(0, settings.beamWidth);
    expansions.set(smiles, steps);
    stats.expanded += 1;
    return steps;
  }

  function buyable(smiles) { return stock.has(smiles); }

  // A minimal binary heap, because sorting the frontier every push is what
  // makes a naive best-first search slow enough to look like a depth limit.
  function heap() {
    const items = [];
    return {
      get size() { return items.length; },
      push(item) {
        items.push(item);
        let i = items.length - 1;
        while (i > 0) {
          const parent = (i - 1) >> 1;
          if (items[parent].priority <= items[i].priority) break;
          [items[parent], items[i]] = [items[i], items[parent]];
          i = parent;
        }
      },
      pop() {
        const top = items[0];
        const last = items.pop();
        if (items.length) {
          items[0] = last;
          let i = 0;
          for (;;) {
            const left = i * 2 + 1;
            const right = left + 1;
            let small = i;
            if (left < items.length && items[left].priority < items[small].priority) small = left;
            if (right < items.length && items[right].priority < items[small].priority) small = right;
            if (small === i) break;
            [items[small], items[i]] = [items[i], items[small]];
            i = small;
          }
        }
        return top;
      },
    };
  }

  function run(target, goalTest, guide) {
    const started = Date.now();
    const frontier = heap();
    const best = new Map();
    const routes = [];
    const first = [target];
    frontier.push({ priority: 0, pending: first, steps: [], cost: 0 });
    best.set(target, 0);
    let popped = 0;

    while (frontier.size) {
      if (Date.now() - started > settings.budgetMs) break;
      const node = frontier.pop();
      popped += 1;

      const unmade = node.pending.filter((m) => !buyable(m));
      if (goalTest(node)) {
        routes.push({
          steps: node.steps.slice().reverse(),
          cost: Number(node.cost.toFixed(3)),
          depth: node.steps.length,
          startsFrom: node.pending.slice().sort(),
        });
        if (routes.length >= settings.maxRoutes) break;
        continue;
      }
      if (node.steps.length >= settings.maxDepth || !unmade.length) continue;

      // Work on the biggest unfinished molecule: it is the one furthest from
      // being orderable, and leaving it for later only grows the frontier.
      const focus = unmade.slice().sort((a, b) => b.length - a.length)[0];

      for (const step of expand(focus)) {
        const pending = node.pending.filter((m) => m !== focus).concat(step.precursors);
        const key = pending.slice().sort().join('>');
        const cost = node.cost + stepCost(step, node);
        if (best.has(key) && best.get(key) <= cost) { stats.reused += 1; continue; }
        best.set(key, cost);
        const remaining = pending.filter((m) => !buyable(m)).length;
        frontier.push({
          priority: cost + remaining + (guide ? guide(pending) : 0),
          pending, cost, steps: node.steps.concat(step),
        });
      }
    }

    return {
      routes,
      explored: popped,
      seconds: Number(((Date.now() - started) / 1000).toFixed(2)),
      stats: { ...stats },
    };
  }

  return {
    stock,
    expand,
    buyable,

    // Mode 2: a target, worked back to what you can order.
    route(target) {
      const start = SE.smiles.canonical(target);
      if (buyable(start)) {
        return { ok: true, reason: 'that is already something you can buy', routes: [] };
      }
      const found = run(start, (node) => node.pending.every(buyable));
      return { ok: found.routes.length > 0, mode: 'route', target: start, ...found,
        reason: found.routes.length ? 'solved' : 'no route inside the budget' };
    },

    // Mode 1: from one named molecule to another.
    path(target, from) {
      const start = SE.smiles.canonical(target);
      const want = SE.smiles.canonical(from);
      if (start === want) {
        return { ok: true, reason: 'the target is the starting material', routes: [] };
      }
      const wantPrint = fingerprint(SE.smiles.parse(want));
      const closeness = new Map();
      const near = (smiles) => {
        if (closeness.has(smiles)) return closeness.get(smiles);
        let score = 0;
        if (smiles === want) score = 1;
        else {
          try { score = similarity(wantPrint, fingerprint(SE.smiles.parse(smiles))); }
          catch (err) { void err; }
        }
        closeness.set(smiles, score);
        return score;
      };
      const found = run(start,
        (node) => node.steps.length > 0 && node.pending.includes(want)
          && node.pending.every((m) => m === want || buyable(m)),
        // Pull the search towards the starting material rather than merely
        // filtering at the end; without it the search finds the cheapest
        // chemistry available and never arrives.
        (pending) => -1.4 * Math.max(...pending.map(near), 0));
      return { ok: found.routes.length > 0, mode: 'path', target: start, start: want,
        ...found, reason: found.routes.length ? 'found' : 'no path inside the budget' };
    },
  };
}

const EXPORTS_search = { makeEngine, fingerprint, similarity, costModel };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_search;
} else if (typeof RETRO !== 'undefined') {
  RETRO.search = EXPORTS_search;
}
