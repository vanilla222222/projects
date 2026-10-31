const RSEARCH_LIMITS = { maxDepth: 5, budgetMs: 20000, maxBranch: 6, maxRoutes: 20, stockMaxTier: 2, nodeBudgetMs: 1500, maxNodes: 400, afterSolved: 12, cacheSize: 400, sliceMs: 40 };

const RSEARCH_WEIGHTS = { steps: 10, longest: 5, yieldLoss: 0, stock: 4, pg: 6, convergent: -3, simplification: -1, materials: 1, feedstocks: 1, stereo: 4, scope: 2, minor: 2 };

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

function rsearchStockIdentity(smiles, info) {
  if (!info || !info.smiles) return null;
  try {
    const requested = typeof pathFinderMaterialKey === 'function' ? pathFinderMaterialKey(smiles) : moleculeIdentity(smiles).key;
    const supplied = typeof pathFinderMaterialKey === 'function' ? pathFinderMaterialKey(info.smiles) : moleculeIdentity(info.smiles).key;
    // Connectivity or name matches are not enough to supply a specified
    // stereoisomer. Keep this policy aligned with Path Finder inventory.
    return requested === supplied ? info : null;
  } catch (error) {
    return null;
  }
}

function rsearchStock(smiles, maxTier) {
  const info = typeof stockTier === 'function' ? stockTier(smiles) : null;
  const matched = info && info.tier <= maxTier ? rsearchStockIdentity(smiles, info) : null;
  if (matched) return matched;
  if (smiles.startsWith('Br[Mg]') || smiles.startsWith('Cl[Mg]') || smiles.startsWith('I[Mg]')) {
    const halideSmiles = smiles.replace('[Mg]', '');
    const halide = typeof stockTier === 'function' ? stockTier(halideSmiles) : null;
    if (halide && halide.tier <= maxTier && rsearchStockIdentity(halideSmiles, halide)) {
      return { tier: halide.tier, source: 'grignard', name: halide.name, smiles: halide.smiles };
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
  let stock = null;
  if (depth > 0) {
    try {
      stock = typeof job.options.stockOverride === 'function'
        ? job.options.stockOverride(smiles, rsearchStock(smiles, job.options.stockMaxTier))
        : rsearchStock(smiles, job.options.stockMaxTier);
    } catch (error) { stock = null; }
  }
  node = { smiles, heavy, skeleton, depth, path, stock, ands: [], parents: [], state: 'open', solved: false, dead: false, order: job.nodes.size };
  job.nodes.set(smiles, node);
  if (!node.stock) {
    job.frontier.push(node);
  }
  return node;
}

function rsearchAttach(job, node, candidates) {
  const path = new Set(node.path);
  path.add(node.smiles);
  const accept = typeof job.options.candidateFilter === 'function' ? job.options.candidateFilter : () => true;
  const accepted = candidates.filter((c) => {
    if (!c.precursors.every((p) => !path.has(p.smiles))) return false;
    try { return accept(c, node) !== false; } catch (error) { return false; }
  });
  const ordered = typeof job.options.candidateOrder === 'function' ? job.options.candidateOrder(accepted) : accepted;
  let selected = ordered.slice(0, job.options.maxBranch);
  if (typeof job.options.candidateBranchKey === 'function') {
    const keys = new Set();
    selected = ordered.filter(candidate => {
      const key = job.options.candidateBranchKey(candidate);
      if (keys.has(key)) return true;
      if (keys.size >= job.options.maxBranch) return false;
      keys.add(key); return true;
    });
  }
  selected.forEach((candidate) => {
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
  job.truncated = job.truncated || !!result.truncated;
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

function rsearchEnumerate(job, node, ancestors, limit, remaining = job.options.maxDepth) {
  if (node.stock && node !== job.root) {
    return [{ target: node.smiles, candidate: null, children: [], stock: node.stock, skeleton: node.skeleton }];
  }
  const out = [], buckets = [];
  const diverseRoot = job.options.diverseRootEnumeration && node === job.root;
  const path = new Set(ancestors);
  path.add(node.smiles);
  for (const and of node.ands) {
    if (!and.solved || and.children.some((c) => path.has(c.smiles))) {
      continue;
    }
    // Node depths describe the shortest graph path, not this route branch.
    // Charge every explicit protection/reaction operation on the current path.
    const cost = rsearchCandidateSteps(and.candidate).length;
    if (cost > remaining) continue;
    let combos = [[]];
    for (const child of and.children) {
      const options = rsearchEnumerate(job, child, path, limit, remaining - cost);
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
    const branch = [];
    combos.forEach((children) => {
      if (diverseRoot) branch.push({ target: node.smiles, candidate: and.candidate, children, stock: null, skeleton: node.skeleton });
      else if (out.length < limit) {
        out.push({ target: node.smiles, candidate: and.candidate, children, stock: null, skeleton: node.skeleton });
      }
    });
    if (diverseRoot) buckets.push(branch);
    if (!diverseRoot && out.length >= limit) {
      break;
    }
  }
  if (diverseRoot) {
    for (let round=0; out.length<limit && buckets.some(bucket=>bucket[round]); round++) {
      buckets.forEach(bucket=>{if(bucket[round]&&out.length<limit)out.push(bucket[round]);});
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
  const ranked = rsearchSort(routes, 'score');
  job.routeRecipes = ranked;
  job.routes = typeof job.options.routeSelector === 'function' ? job.options.routeSelector(ranked).slice(0, job.options.maxRoutes) : ranked.slice(0, job.options.maxRoutes);
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
  const job = { target: smiles, options: opts, status: 'running', routes: [], nodes: new Map(), frontier: [], current: null, expanded: 0, cacheHits: 0, elapsedMs: 0, solvedAt: null, root: null, truncated: false };
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
  if (Array.isArray(candidate.pgSteps)&&candidate.pgSteps.length) {
    return candidate.pgSteps.map((s) => ({ outcome: s.outcome, minor: s.minor, pg: s.role !== 'step' }));
  }
  return [{ outcome: candidate.outcome, minor: candidate.minor, pg: candidate.group === 'Protecting groups' }];
}

function rsearchScore(route) {
  const metrics = { steps: 0, longest: 0, convergent: false, yield: 100, yieldModel: 'linear-product-or-convergent-bottleneck', complexity: [], stock: 0, pg: 0, materials: 0, feedstocks: 0, stereoConcerns: 0, scopeGaps: 0, minor: 0, scoreBasis:'structural-and-recorded-scope', score: 0 };
  const materialRecords=[],feedstocks=new Set();
  const walk = (node) => {
    if (!node.candidate) {
      feedstocks.add(routePlanningMaterialKey(node.target||node.smiles||''));
      metrics.stock = Math.max(metrics.stock, node.stock ? node.stock.tier : 99);
      return { longest: 0, fraction: 1 };
    }
    materialRecords.push({candidate:node.candidate});
    routePlanningOperations(node.candidate).forEach(c=>{
      const facts=routePlanningStepFacts(c);
      metrics.pg+=facts.protection?1:0;metrics.stereoConcerns+=facts.stereoConcern?1:0;metrics.scopeGaps+=facts.gaps.length;metrics.minor+=facts.minor?1:0;
    });
    const steps = rsearchCandidateSteps(node.candidate);
    let fraction = 1;
    steps.forEach((s) => {
      fraction *= rsearchStepYield(s.outcome, s.minor) / 100;
    });
    metrics.steps += steps.length;
    const largest = Math.max.apply(null, node.candidate.precursors.map((p) => p.skeleton).concat([0]));
    const skeleton = node.skeleton !== undefined ? node.skeleton : node.candidate.product && node.candidate.product.smiles ? retroSkeleton(retroFromSmiles(node.candidate.product.smiles)) : largest;
    metrics.complexity.push(Math.max(0, skeleton - largest));
    const branches = node.children.map(walk);
    if (node.children.filter((c) => c.candidate).length >= 2) {
      metrics.convergent = true;
    }
    // Multiplying independent branches invents a serial yield penalty and
    // systematically undervalues convergence. Without stoichiometry and
    // isolation data, use the weakest cumulative branch as a conservative
    // planning bottleneck; linear routes retain ordinary step-yield products.
    if (branches.length) fraction *= Math.min.apply(null, branches.map((b) => b.fraction));
    return { longest: steps.length + Math.max.apply(null, branches.map((b) => b.longest).concat([0])), fraction };
  };
  const result = walk(route);
  metrics.materials=routePlanningProcessBurden(materialRecords);
  metrics.feedstocks=feedstocks.size;
  metrics.longest = result.longest;
  metrics.yield = Math.round(result.fraction * 1000) / 10;
  const simplification = metrics.complexity.length ? metrics.complexity.reduce((s, x) => s + x, 0) / metrics.complexity.length : 0;
  const w = RSEARCH_WEIGHTS;
  metrics.scoreContributions={operations:w.steps*metrics.steps,longestSequence:w.longest*metrics.longest,
    materials:w.materials*metrics.materials,feedstocks:w.feedstocks*metrics.feedstocks,
    stereoConcerns:w.stereo*metrics.stereoConcerns,scopeGaps:w.scope*metrics.scopeGaps,minorProducts:w.minor*metrics.minor,
    stock:w.stock*Math.max(0,metrics.stock-1),protection:w.pg*metrics.pg,
    convergence:metrics.convergent?w.convergent:0,simplification:w.simplification*simplification};
  metrics.score=Math.round(Object.values(metrics.scoreContributions).reduce((sum,value)=>sum+value,0)*10)/10;
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
