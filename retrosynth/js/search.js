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

  const sizes = new Map();
  function size(text) {
    if (!sizes.has(text)) {
      try { sizes.set(text, SE.smiles.parse(text).atoms.filter(atom => atom.el !== 'H').length); }
      catch (err) { void err; sizes.set(text, 0); }
    }
    return sizes.get(text);
  }

  return function stepCost(step) {
    let cost = w.steps * 1;
    // Protection and deprotection buy nothing by themselves.
    if (step.family === 'protection' || step.family === 'deprotection') {
      cost += w.protection * 2;
    }
    // A step that hands back two pieces of similar size is convergent, which
    // is worth something: two short branches beat one long chain.
    if (step.precursors.length > 1) {
      const pieceSizes = step.precursors.map(size).sort((x, y) => y - x);
      const balance = pieceSizes[1] / (pieceSizes[0] || 1);
      cost -= w.convergence * balance;
    }
    // A step that would give a mixture is worth having and worth charging for:
    // in practice it means a protecting group, which is an extra two steps.
    if (step.verdict && step.verdict.checked && step.verdict.selective === false) {
      cost += w.protection * 1.5;
    }
    // Making the problem bigger has to cost something, or the search wanders.
    const grew = step.precursors.reduce((sum, precursor) => sum + size(precursor), 0) - size(step.product);
    cost += w.cost * Math.max(0, grew) / 40;
    if (step.verdict) {
      if (!step.verdict.checked) cost += w.precedent * 0.8;
      else if (!step.verdict.selective) cost += w.precedent * 0.4;
    }
    return Math.max(0.05, cost);
  };
}

// --- the engine -----------------------------------------------------------
function makeEngine(settings, options) {
  const o = options || {};
  const stock = o.stock || SE.stock.makeStock(SE.smiles, {
    inventory: settings.inventory,
    catalogue: settings.catalogue === 'inventory' ? [] : undefined,
    maxHeavyAtoms: settings.catalogue === 'inventory' ? 0 : undefined,
  });
  const stepCost = costModel(settings);
  const ranking = settings.routeRanking || 'balanced';
  const expansions = new Map();
  const stats = { expanded: 0, cached: 0, reused: 0, rejected: 0 };

  function expand(smiles) {
    const hit = expansions.get(smiles);
    if (hit) { stats.cached += 1; return hit; }
    let steps = [];
    try {
      const mol = SE.smiles.parse(smiles);
      steps = (o.disconnect || SE.transforms.disconnect)(mol, settings);
    } catch (err) { void err; steps = []; }
    // Run each one forwards before trusting it. A disconnection looks at one
    // site; the reaction sees every site, and the difference is the whole
    // reason a route can be chemically literate and still wrong.
    if (settings.verify !== 'off' && SE.forward) {
      const kept = [];
      for (const step of steps) {
        const verdict = SE.forward.verify(step);
        step.verdict = verdict;
        if (settings.verify === 'strict' && (!verdict.checked || !verdict.ok || !verdict.selective)) {
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

  function selectRoutes(routes) {
    const order = ranking;
    if (order !== 'balanced') {
      const metric = { shortest:r => r.depth, confidence:r => r.ranking.uncertain,
        stock:r => r.ranking.assumed }[order];
      routes.sort((a, b) => metric(a) - metric(b) || a.cost - b.cost || a.depth - b.depth);
    }
    const seen = new Set();
    const distinct = [], variants = [];
    for (const route of routes) {
      const final = route.steps.at(-1);
      const key = JSON.stringify([final.product, final.precursors.slice().sort()]);
      (seen.has(key) ? variants : distinct).push(route);
      seen.add(key);
    }
    return distinct.concat(variants).slice(0, settings.maxRoutes);
  }

  // A minimal binary heap, because sorting the frontier every push is what
  // makes a naive best-first search slow enough to look like a depth limit.
  function heap() {
    const items = [];
    const precedes = (a, b) => a.order < b.order || (a.order === b.order && a.priority < b.priority);
    return {
      get size() { return items.length; },
      push(item) {
        items.push(item);
        let i = items.length - 1;
        while (i > 0) {
          const parent = (i - 1) >> 1;
          if (!precedes(items[i], items[parent])) break;
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
            if (left < items.length && precedes(items[left], items[small])) small = left;
            if (right < items.length && precedes(items[right], items[small])) small = right;
            if (small === i) break;
            [items[small], items[i]] = [items[i], items[small]];
            i = small;
          }
        }
        return top;
      },
    };
  }

  const stateKey = pending => JSON.stringify(pending.slice().sort());
  const stepKey = step => JSON.stringify([step.product, step.transform, step.precursors.slice().sort()]);
  const routeKey = steps => JSON.stringify(steps.map(stepKey).sort());

  function run(target, terminal, goalTest, guide, config, expandStock){
    const started = Date.now();
    const deadline = Math.min(started + settings.budgetMs, config?.deadline ?? Infinity);
    const frontier = heap();
    const labels = new Map();
    const routes = [];
    const completed = new Set();
    const routeLimit = settings.maxRoutes === 1 && ranking === 'balanced'
      ? 1 : settings.maxRoutes * 2;
    const maxLabels = Math.min(6, settings.maxRoutes);
    const depthLimit = config?.depthLimit ?? settings.maxDepth;
    const maxStates = config?.stateLimit ?? 40000;
    let popped = 0, queued = 0, depthLimited = false, stateLimited = false, lastUpdate = started;

    function remember(node) {
      const key = node.key + ':' + node.steps.length;
      const group = labels.get(key) || [];
      if (group.some(other => other.signature === node.signature)) return false;
      if (group.length >= maxLabels) {
        const worst = group.reduce((a, b) => a.cost >= b.cost ? a : b);
        if (worst.cost <= node.cost) return false;
        worst.pruned = true;
        group.splice(group.indexOf(worst), 1);
      }
      group.push(node);
      queued += 1;
      labels.set(key, group);
      return true;
    }

    const first = { priority:0, order:0, pending:[target], steps:[], cost:0, key:stateKey([target]),
      signature:'[]', parent:null };
    remember(first);
    frontier.push(first);

    while (frontier.size && Date.now() < deadline && !stateLimited) {
      const node = frontier.pop();
      if (node.pruned) continue;
      popped += 1;
      if (config?.onProgress && Date.now() - lastUpdate >= 160) {
        lastUpdate = Date.now();
        config.onProgress({ explored:popped, frontier:frontier.size, found:routes.length,
          elapsedMs:lastUpdate - started });
      }

      const unmade = node.pending.filter(m => !terminal(m));
      if (goalTest(node)) {
        if (!completed.has(node.signature)) {
          completed.add(node.signature);
          const startsFrom = node.pending.slice().sort();
          const sources = startsFrom.map(smiles => ({ smiles, source:config?.namedStart === smiles
            ? 'named start' : stock.source?.(smiles) || 'stock' }));
          routes.push({
            steps:node.steps.slice().reverse(),
            cost:Number(node.cost.toFixed(3)),
            depth:node.steps.length,
            startsFrom,
            sources,
            ranking:{
              preference:ranking,
              uncertain:node.steps.filter(step => !step.verdict?.selective).length,
              assumed:sources.filter(entry => entry.source === 'assumed small molecule').length,
            },
          });
        }
        if (routes.length >= routeLimit) break;
        continue;
      }
      if (node.steps.length >= depthLimit) { depthLimited = true; continue; }

      // In path mode an orderable intermediate can still need to be made from
      // the named input. Never expand that input once it is reached.
      const work = unmade.length ? unmade : expandStock ? node.pending.filter(m => m !== config?.namedStart) : [];
      const focuses = [...new Set(work)].sort((a, b) => b.length - a.length);
      if (unmade.length) focuses.splice(1);
      for (const focus of focuses) {
        for (const step of expand(focus)) {
          if (Date.now() >= deadline || stateLimited) break;
          const index = node.pending.indexOf(focus);
          const pending = node.pending.slice(0, index).concat(node.pending.slice(index + 1), step.precursors);
          const key = stateKey(pending);
          // A product cannot depend on itself through any earlier reaction.
          const ancestors = [focus];
          for (const product of ancestors) {
            for (const earlier of node.steps) {
              if (earlier.precursors.includes(product) && !ancestors.includes(earlier.product)) ancestors.push(earlier.product);
            }
          }
          if (step.precursors.some(precursor => ancestors.includes(precursor))) continue;
          let repeated = false;
          for (let old = node; old; old = old.parent) {
            if (old.key === key) { repeated = true; break; }
          }
          if (repeated) continue;
          const steps = node.steps.concat(step);
          const cost = node.cost + stepCost(step);
          const remaining = pending.filter(m => !terminal(m)).length;
          const order = settings.strategy === 'depth' ? -steps.length
            : settings.strategy === 'breadth' ? steps.length : 0;
          const next = { order, priority:cost + remaining + (guide ? guide(pending) : 0),
            pending, cost, steps, key, signature:routeKey(steps), parent:node };
          if (!remember(next)) { stats.reused += 1; continue; }
          frontier.push(next);
          if (queued >= maxStates) stateLimited = true;
        }
      }
    }

    if (settings.strategy === 'breadth') routes.sort((a, b) => a.depth - b.depth || a.cost - b.cost);
    else if (settings.strategy !== 'depth') routes.sort((a, b) => a.cost - b.cost || a.depth - b.depth);
    return {
      routes,
      explored:popped,
      queued,
      seconds:Number(((Date.now() - started) / 1000).toFixed(2)),
      stop:routes.length >= routeLimit ? 'route-limit'
        : stateLimited ? 'state-limit' : Date.now() >= deadline ? 'time-limit' : depthLimited ? 'depth-limit' : 'exhausted',
      stats:{ ...stats },
    };
  }

  function search(target, terminal, goalTest, guide, config, expandStock) {
    if (settings.strategy !== 'iterative') {
      const found = run(target, terminal, goalTest, guide, config, expandStock);
      return { ...found, routes:selectRoutes(found.routes) };
    }
    const started = Date.now();
    const deadline = Math.min(started + settings.budgetMs, config?.deadline ?? Infinity);
    let explored = 0, queued = 0, found;
    const routes = new Map();
    for (let depthLimit = 1; depthLimit <= settings.maxDepth; depthLimit += 1) {
      found = run(target, terminal, goalTest, guide, {
        ...config, deadline, depthLimit, stateLimit:40000 - queued,
        onProgress: config?.onProgress && (progress => config.onProgress({
          ...progress, depthLimit, explored:explored + progress.explored,
          found:Math.max(routes.size, progress.found), elapsedMs:Date.now() - started,
        })),
      }, expandStock);
      explored += found.explored;
      queued += found.queued;
      for (const route of found.routes) routes.set(routeKey(route.steps), route);
      if (found.stop !== 'depth-limit') break;
    }
    const ordered = [...routes.values()].sort((a, b) => a.depth - b.depth || a.cost - b.cost);
    return { ...found, explored, queued, routes:selectRoutes(ordered),
      seconds:Number(((Date.now() - started) / 1000).toFixed(2)) };
  }

  function failureReason(found, word) {
    if (found.stop === 'time-limit') return 'Time limit reached without finding a ' + word;
    if (found.stop === 'state-limit') return 'Search size limit reached without finding a ' + word;
    if (found.stop === 'depth-limit') return 'No ' + word + ' found within the step limit';
    return 'No ' + word + ' found with these rules and starting materials';
  }

  return {
    stock,
    expand,
    buyable,

    // Mode 2: a target, worked back to what you can order.
    route(target, config) {
      const start = SE.smiles.canonical(target);
      if (buyable(start)) {
        return { ok:true, target:start, stop:'already-in-stock', source:stock.source?.(start),
          reason:'Target matches the selected stock policy', routes:[] };
      }
      const found = search(start, buyable, node => node.pending.every(buyable), null, config);
      return { ok: found.routes.length > 0, mode: 'route', target: start, ...found,
        reason: found.routes.length ? 'solved' : failureReason(found, 'route') };
    },

    // Mode 1: from one named molecule to another.
    path(target, from, config) {
      const start = SE.smiles.canonical(target);
      const want = SE.smiles.canonical(from);
      if (start === want) {
        return { ok:true, target:start, stop:'same-molecule', reason:'The target is the starting material', routes:[] };
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
      const terminal = m => m === want || buyable(m);
      const found = search(start, terminal,
        node => node.steps.length > 0 && node.pending.includes(want) && node.pending.every(terminal),
        // Pull the search towards the starting material rather than merely
        // filtering at the end; without it the search finds the cheapest
        // chemistry available and never arrives.
        (pending) => -1.4 * Math.max(...pending.map(near), 0), { ...config, namedStart:want }, true);
      return { ok: found.routes.length > 0, mode: 'path', target: start, start: want,
        ...found, reason: found.routes.length ? 'found' : failureReason(found, 'path') };
    },
  };
}

const EXPORTS_search = { makeEngine, fingerprint, similarity, costModel };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_search;
} else if (typeof RETRO !== 'undefined') {
  RETRO.search = EXPORTS_search;
}
