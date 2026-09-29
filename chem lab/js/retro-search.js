const RSEARCH_LIMITS = { maxDepth: 5, budgetMs: 20000, maxBranch: 6, maxRoutes: 20, stockMaxTier: 2, nodeBudgetMs: 1500, maxNodes: 400, afterSolved: 12, cacheSize: 400, sliceMs: 40 };

const RSEARCH_WEIGHTS = { steps: 10, longest: 5, yieldLoss: 0.3, stock: 4, pg: 6, convergent: -3, simplification: -1 };

const rsearchCache = new Map();

function rsearchClearCache() {
  rsearchCache.clear();
}

function rsearchCacheSet(smiles, result) {
  if (rsearchCache.size >= RSEARCH_LIMITS.cacheSize) {
    rsearchCache.delete(rsearchCache.keys().next().value);
  }
  rsearchCache.set(smiles, result);
}

function rsearchStock(smiles, maxTier) {
  const info = typeof stockTier === 'function' ? stockTier(smiles) : null;
  if (info && info.tier <= maxTier) {
    return info;
  }
  if (smiles.startsWith('Br[Mg]') || smiles.startsWith('Cl[Mg]') || smiles.startsWith('I[Mg]')) {
    const halide = typeof stockTier === 'function' ? stockTier(smiles.replace('[Mg]', '')) : null;
    if (halide && halide.tier <= maxTier) {
      return { tier: halide.tier, source: 'grignard', name: halide.name };
    }
  }
  return null;
}

function rsearchMolecule(job, smiles, depth, path) {
  let node = job.nodes.get(smiles);
  if (node) {
    if (depth < node.depth) {
      node.depth = depth;
      node.path = path;
    }
    return node;
  }
  let heavy = 0;
  let skeleton = 0;
  try {
    const g = retroFromSmiles(smiles);
    heavy = g.atoms.filter((a) => a.element !== 'H').length;
    skeleton = retroSkeleton(g);
  } catch (error) {
    heavy = 0;
  }
  node = { smiles, heavy, skeleton, depth, path, stock: depth > 0 ? rsearchStock(smiles, job.options.stockMaxTier) : null, ands: [], parents: [], state: 'open', solved: false, dead: false, order: job.nodes.size };
  job.nodes.set(smiles, node);
  if (!node.stock) {
    job.frontier.push(node);
  }
  return node;
}

function rsearchAttach(job, node, candidates) {
  const path = new Set(node.path);
  path.add(node.smiles);
  candidates.filter((c) => c.precursors.every((p) => !path.has(p.smiles))).slice(0, job.options.maxBranch).forEach((candidate) => {
    const and = { candidate, parent: node, children: [], solved: false, dead: false };
    and.children = candidate.precursors.map((p) => {
      const child = rsearchMolecule(job, p.smiles, node.depth + 1, path);
      child.parents.push(and);
      return child;
    });
    node.ands.push(and);
  });
  node.state = 'expanded';
}

function rsearchUpdate(job) {
  let changed = true;
  while (changed) {
    changed = false;
    job.nodes.forEach((node) => {
      node.ands.forEach((and) => {
        if (!and.solved && and.children.every((c) => c.solved)) {
          and.solved = true;
          changed = true;
        }
        if (!and.dead && and.children.some((c) => c.dead)) {
          and.dead = true;
          changed = true;
        }
      });
      if (!node.solved && (node.stock || node.ands.some((a) => a.solved))) {
        node.solved = true;
        changed = true;
      }
      const hopeless = !node.stock && ((node.state === 'expanded' && node.ands.every((a) => a.dead)) || (node.state === 'open' && node.depth >= job.options.maxDepth));
      if (!node.dead && hopeless) {
        node.dead = true;
        changed = true;
      }
    });
  }
}

function rsearchRelevant(job, node) {
  return node === job.root || node.parents.some((and) => !and.dead);
}

function rsearchNext(job) {
  let best = -1;
  for (let i = 0; i < job.frontier.length; i++) {
    const node = job.frontier[i];
    if (node.state !== 'open' || node.solved || node.dead || node.depth >= job.options.maxDepth || !rsearchRelevant(job, node)) {
      continue;
    }
    const f = node.heavy + node.depth;
    const b = best >= 0 ? job.frontier[best] : null;
    if (!b || f < b.heavy + b.depth || (f === b.heavy + b.depth && node.order < b.order)) {
      best = i;
    }
  }
  if (best < 0) {
    return null;
  }
  return job.frontier.splice(best, 1)[0];
}

function rsearchBegin(job, node) {
  node.state = 'expanding';
  const cached = rsearchCache.get(node.smiles);
  if (cached) {
    rsearchAttach(job, node, cached.candidates);
    job.expanded += 1;
    job.cacheHits += 1;
    rsearchUpdate(job);
    return;
  }
  let iterator = null;
  try {
    const g = retroFromSmiles(node.smiles);
    iterator = retroDisconnectSteps(g, retroIds(g), {});
  } catch (error) {
    iterator = null;
  }
  if (!iterator) {
    rsearchAttach(job, node, []);
    job.expanded += 1;
    rsearchUpdate(job);
    return;
  }
  job.current = { node, iterator, ms: 0, next: iterator.next() };
}

function rsearchAdvance(job, until) {
  const cur = job.current;
  while (!cur.next.done && retroNow() < until) {
    const t0 = retroNow();
    const go = !(cur.next.value.phase === 'spec' && cur.ms > job.options.nodeBudgetMs);
    try {
      cur.next = cur.iterator.next(go);
    } catch (error) {
      cur.next = { done: true, value: { candidates: [], truncated: true } };
    }
    cur.ms += retroNow() - t0;
  }
  if (!cur.next.done) {
    return;
  }
  const result = cur.next.value || { candidates: [], truncated: true };
  if (!result.truncated && !result.reason) {
    rsearchCacheSet(cur.node.smiles, { candidates: result.candidates });
  }
  rsearchAttach(job, cur.node, result.candidates || []);
  job.expanded += 1;
  job.current = null;
  rsearchUpdate(job);
}

function rsearchRouteKey(route) {
  const keys = [];
  const walk = (r) => {
    if (r.candidate) {
      keys.push(r.target + '|' + r.candidate.key);
    }
    r.children.forEach(walk);
  };
  walk(route);
  return keys.sort().join('\n');
}

function rsearchEnumerate(job, node, ancestors, limit) {
  if (node.stock && node !== job.root) {
    return [{ target: node.smiles, candidate: null, children: [], stock: node.stock, skeleton: node.skeleton }];
  }
  const out = [];
  const path = new Set(ancestors);
  path.add(node.smiles);
  for (const and of node.ands) {
    if (!and.solved || and.children.some((c) => path.has(c.smiles))) {
      continue;
    }
    let combos = [[]];
    for (const child of and.children) {
      const options = rsearchEnumerate(job, child, path, limit);
      const next = [];
      combos.forEach((combo) => options.forEach((option) => {
        if (next.length < limit) {
          next.push(combo.concat([option]));
        }
      }));
      combos = next;
      if (!combos.length) {
        break;
      }
    }
    combos.forEach((children) => {
      if (out.length < limit) {
        out.push({ target: node.smiles, candidate: and.candidate, children, stock: null, skeleton: node.skeleton });
      }
    });
    if (out.length >= limit) {
      break;
    }
  }
  return out;
}

function rsearchFinish(job, status) {
  if (job.status !== 'running') {
    return;
  }
  job.status = status;
  job.current = null;
  rsearchUpdate(job);
  const seen = new Set();
  const routes = [];
  rsearchEnumerate(job, job.root, new Set(), job.options.maxRoutes * 4).forEach((route) => {
    const key = rsearchRouteKey(route);
    if (!seen.has(key)) {
      seen.add(key);
      route.metrics = rsearchScore(route);
      routes.push(route);
    }
  });
  job.routes = rsearchSort(routes, 'score').slice(0, job.options.maxRoutes);
}

function rsearchProgress(job) {
  const fraction = job.status !== 'running' ? 1 : Math.min(0.99, Math.max(job.elapsedMs / job.options.budgetMs, job.expanded / job.options.maxNodes));
  return {
    done: job.status !== 'running',
    progress: fraction,
    status: job.status,
    expanded: job.expanded,
    open: job.frontier.filter((n) => n.state === 'open' && !n.dead).length,
    routes: job.routes.length,
    solved: job.root.solved,
    elapsedMs: Math.round(job.elapsedMs),
    cacheHits: job.cacheHits,
  };
}

function rsearchStep(job, sliceMs) {
  if (job.status !== 'running') {
    return rsearchProgress(job);
  }
  const start = retroNow();
  const until = start + Math.max(1, sliceMs || job.options.sliceMs);
  while (job.status === 'running' && retroNow() < until) {
    if (job.elapsedMs + (retroNow() - start) > job.options.budgetMs) {
      rsearchFinish(job, 'budget');
      break;
    }
    if (job.current) {
      rsearchAdvance(job, until);
      continue;
    }
    if (job.root.solved && job.solvedAt === null) {
      job.solvedAt = job.expanded;
    }
    const exhausted = job.expanded >= job.options.maxNodes || (job.solvedAt !== null && job.expanded - job.solvedAt >= job.options.afterSolved);
    const node = exhausted ? null : rsearchNext(job);
    if (!node) {
      rsearchFinish(job, 'done');
      break;
    }
    rsearchBegin(job, node);
  }
  job.elapsedMs += retroNow() - start;
  return rsearchProgress(job);
}

function rsearchCreate(targetSmiles, options) {
  const opts = Object.assign({}, RSEARCH_LIMITS, options || {});
  opts.maxDepth = Math.max(1, Math.min(8, opts.maxDepth));
  const smiles = retroCanonicalSmiles(targetSmiles) || String(targetSmiles || '');
  const job = { target: smiles, options: opts, status: 'running', routes: [], nodes: new Map(), frontier: [], current: null, expanded: 0, cacheHits: 0, elapsedMs: 0, solvedAt: null, root: null };
  job.root = rsearchMolecule(job, smiles, 0, new Set());
  if (!job.root.smiles || !job.root.heavy) {
    job.status = 'done';
  }
  job.step = (sliceMs) => rsearchStep(job, sliceMs);
  job.cancel = () => {
    rsearchFinish(job, 'cancelled');
    return rsearchProgress(job);
  };
  job.progress = () => rsearchProgress(job);
  return job;
}

function rsearchRun(targetSmiles, options) {
  const job = rsearchCreate(targetSmiles, options);
  let progress = job.step(RSEARCH_LIMITS.sliceMs);
  while (!progress.done) {
    progress = job.step(RSEARCH_LIMITS.sliceMs);
  }
  return job;
}

function rsearchStepYield(outcome, minor) {
  if (!outcome) {
    return 100;
  }
  const ratio = outcome.ratio && outcome.minor && outcome.minor.length === 1 ? outcome.ratio : null;
  const selectivity = ratio ? ratio[minor ? 1 : 0] : 100;
  const conversion = outcome.stoichiometry && Number.isFinite(outcome.stoichiometry.conversion) ? Math.min(1, outcome.stoichiometry.conversion) : 1;
  return Math.max(0, Math.min(100, selectivity * conversion));
}

function rsearchCandidateSteps(candidate) {
  if (candidate.pgSteps) {
    return candidate.pgSteps.map((s) => ({ outcome: s.outcome, minor: s.minor, pg: s.role !== 'step' }));
  }
  return [{ outcome: candidate.outcome, minor: candidate.minor, pg: candidate.group === 'Protecting groups' }];
}

function rsearchScore(route) {
  const metrics = { steps: 0, longest: 0, convergent: false, yield: 100, complexity: [], stock: 0, pg: 0, score: 0 };
  let fraction = 1;
  const walk = (node) => {
    if (!node.candidate) {
      metrics.stock = Math.max(metrics.stock, node.stock ? node.stock.tier : 99);
      return 0;
    }
    const steps = rsearchCandidateSteps(node.candidate);
    steps.forEach((s) => {
      fraction *= rsearchStepYield(s.outcome, s.minor) / 100;
      metrics.pg += s.pg ? 1 : 0;
    });
    metrics.steps += steps.length;
    const largest = Math.max.apply(null, node.candidate.precursors.map((p) => p.skeleton).concat([0]));
    const skeleton = node.skeleton !== undefined ? node.skeleton : node.candidate.product && node.candidate.product.smiles ? retroSkeleton(retroFromSmiles(node.candidate.product.smiles)) : largest;
    metrics.complexity.push(Math.max(0, skeleton - largest));
    const branches = node.children.map(walk);
    if (node.children.filter((c) => c.candidate).length >= 2) {
      metrics.convergent = true;
    }
    return steps.length + Math.max.apply(null, branches.concat([0]));
  };
  metrics.longest = walk(route);
  metrics.yield = Math.round(fraction * 1000) / 10;
  const simplification = metrics.complexity.length ? metrics.complexity.reduce((s, x) => s + x, 0) / metrics.complexity.length : 0;
  const w = RSEARCH_WEIGHTS;
  metrics.score = Math.round((w.steps * metrics.steps + w.longest * metrics.longest + w.yieldLoss * (100 - metrics.yield) +
    w.stock * Math.max(0, metrics.stock - 1) + w.pg * metrics.pg + (metrics.convergent ? w.convergent : 0) + w.simplification * simplification) * 10) / 10;
  return metrics;
}

function rsearchMetrics(route, cache) {
  if (!cache.has(route)) {
    cache.set(route, route.metrics || rsearchScore(route));
  }
  return cache.get(route);
}

function rsearchSort(routes, key) {
  const cache = new Map();
  const field = key || 'score';
  const descending = field === 'yield' || field === 'convergent';
  const value = (route) => {
    const m = rsearchMetrics(route, cache);
    return field === 'convergent' ? (m.convergent ? 1 : 0) : m[field];
  };
  return routes.slice().sort((a, b) => {
    const d = descending ? value(b) - value(a) : value(a) - value(b);
    return d || rsearchMetrics(a, cache).score - rsearchMetrics(b, cache).score;
  });
}

function rsearchFilter(routes, filter) {
  const f = filter || {};
  const cache = new Map();
  return routes.filter((route) => {
    const m = rsearchMetrics(route, cache);
    return (!Number.isFinite(f.maxSteps) || m.steps <= f.maxSteps)
      && (!Number.isFinite(f.minYield) || m.yield >= f.minYield)
      && (!Number.isFinite(f.maxTier) || m.stock <= f.maxTier)
      && (!f.noPG || m.pg === 0);
  });
}
