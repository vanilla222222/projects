/* Incremental, forward-verified AND/OR retrosynthesis search.
   Molecule nodes are OR choices; candidate nodes are AND requirements.
   Nothing is reported as solved until every required precursor is stocked
   or recursively solved. All search state is local to the returned job. */
function rsearchKey(smiles) {
  if (typeof molecularIdentity === 'function') return molecularIdentity(smiles).key;
  if (typeof moleculeIdentity === 'function') return moleculeIdentity(smiles).key;
  const graph = reactionFragmentGraph(smilesToFragment(smiles));
  return computeProperties(graph, graph.atoms.map((a) => a.id)).isomericSmiles;
}
function rsearchStock(smiles, maxTier) {
  const info = stockTier(smiles);
  return info && info.tier <= maxTier ? info : null;
}
function rsearchCandidateKey(candidate, target) {
  return [rsearchKey(target), candidate.transform, candidate.precursors.map((p) => rsearchKey(p.smiles)).sort().join('.')].join('|');
}
function rsearchCreate(target, options) {
  const opts = Object.assign({ maxDepth: 6, maxNodes: 1800, maxBranch: 7, maxRoutes: 5, budgetMs: 12000, sliceMs: 10, stockMaxTier: 3 }, options || {});
  opts.maxDepth = Math.max(1, Math.min(8, Number(opts.maxDepth) || 6));
  const rootSmiles = computeProperties(reactionFragmentGraph(smilesToFragment(target)), null).isomericSmiles;
  const root = { type: 'molecule', smiles: rootSmiles, key: rsearchKey(rootSmiles), depth: 0, state: 'open', stock: null, children: [], parent: null, path: new Set() };
  const job = {
    root, options: opts, status: 'running', started: Date.now(), elapsed: 0,
    expanded: 0, generated: 0, verified: 0, rejected: 0, duplicates: 0,
    nodes: new Map([[root.key, root]]), queue: [root], solutions: [], truncated: false,
    diagnostics: { unverified: 0, errors: 0 }, cancelled: false,
  };
  function finish(status) {
    if (job.status !== 'running') return;
    job.status = status;
    job.elapsed = Date.now() - job.started;
    job.solutions = rsearchEnumerate(job.root, opts.maxRoutes);
  }
  job.cancel = () => { job.cancelled = true; finish('cancelled'); return job; };
  job.step = () => {
    if (job.status !== 'running') return job;
    const sliceStart = Date.now();
    while (job.queue.length && Date.now() - sliceStart < opts.sliceMs) {
      if (Date.now() - job.started >= opts.budgetMs) { finish('budget'); break; }
      if (job.expanded >= opts.maxNodes) { job.truncated = true; finish('budget'); break; }
      const node = job.queue.shift();
      if (node.state !== 'open') continue;
      rsearchExpand(job, node);
      if (job.root.state === 'solved' && rsearchEnumerate(job.root, opts.maxRoutes).length >= opts.maxRoutes) { finish('found'); break; }
      if (job.root.state === 'dead') { finish('exhausted'); break; }
    }
    job.elapsed = Date.now() - job.started;
    if (job.status === 'running' && !job.queue.length) finish(job.root.state === 'solved' ? 'found' : 'exhausted');
    return job;
  };
  job.trees = () => rsearchEnumerate(job.root, opts.maxRoutes);
  job.explanation = () => rsearchExplanation(job);
  return job;
}
function rsearchExpand(job, node) {
  job.expanded++;
  if (node.depth >= job.options.maxDepth) { node.state = 'dead'; return rsearchUpdate(job, node); }
  let candidates;
  try {
    const path = new Set(node.path); path.add(node.key);
    candidates = retroCandidates(node.smiles).filter((candidate) => {
      if (!retroTryVerify(candidate, node.smiles)) { job.rejected++; return false; }
      job.verified++;
      return true;
    });
    const seen = new Set();
    candidates = candidates.filter((c) => {
      const key = rsearchCandidateKey(c, node.smiles);
      if (seen.has(key)) { job.duplicates++; return false; }
      seen.add(key); return true;
    });
    candidates.sort((a, b) => rsearchCandidateCost(a) - rsearchCandidateCost(b));
    const accept = typeof job.options.candidateFilter === 'function' ? job.options.candidateFilter : () => true;
    candidates.filter((c) => {
      if (!c.precursors.every((p) => !path.has(p.smiles))) return false;
      try { return accept(c, node) !== false; } catch (error) { return false; }
    }).slice(0, job.options.maxBranch).forEach((candidate) => {
      const and = { type: 'candidate', candidate, state: 'open', children: [], parent: node, depth: node.depth };
      node.children.push(and);
      candidate.precursors.forEach((p) => {
        let smiles;
        try { smiles = computeProperties(reactionFragmentGraph(smilesToFragment(p.smiles)), null).isomericSmiles; }
        catch (error) { smiles = p.smiles; }
        const key = rsearchKey(smiles);
        let child = job.nodes.get(key);
        // A molecule at a shallower depth cannot be shared with a deeper path:
        // its availability is identical, but its remaining recursion budget is not.
        if (child && child.depth <= node.depth + 1 && !path.has(key)) {
          and.children.push(child);
          child.parents = child.parents || [];
          child.parents.push(and);
        } else {
          child = { type: 'molecule', smiles, key, depth: node.depth + 1, state: 'open', stock: null, children: [], parent: and, parents: [], path: new Set(path) };
          and.children.push(child);
          if (!job.nodes.has(key) || job.nodes.get(key).depth > child.depth) job.nodes.set(key, child);
          let stock = null;
          if (depth > 0) {
            try {
              stock = typeof job.options.stockOverride === 'function'
                ? job.options.stockOverride(smiles, rsearchStock(smiles, job.options.stockMaxTier))
                : rsearchStock(smiles, job.options.stockMaxTier);
            } catch (error) { stock = null; }
          }
          if (stock) { child.stock = stock; child.state = 'solved'; }
          else if (path.has(key)) child.state = 'dead';
          else job.queue.push(child);
        }
      });
      if (!and.children.length) and.state = 'dead';
    });
  } catch (error) {
    job.diagnostics.errors++;
  }
  job.generated += node.children.length;
  if (!node.children.length) node.state = 'dead';
  rsearchUpdate(job, node);
}
function rsearchCandidateCost(candidate) {
  const unavailable = candidate.precursors.filter((p) => !stockTier(p.smiles)).length;
  return unavailable * 100 + candidate.precursors.length * 10 + (candidate.minor ? 3 : 0);
}
function rsearchUpdate(job, changed) {
  const visited = new Set();
  function update(node) {
    if (!node || visited.has(node)) return;
    visited.add(node);
    const old = node.state;
    if (node.type === 'molecule') {
      if (node.stock) node.state = 'solved';
      else if (node.children.some((c) => c.state === 'solved')) node.state = 'solved';
      else if (node.depth >= job.options.maxDepth || (node.children.length && node.children.every((c) => c.state === 'dead'))) node.state = 'dead';
    } else {
      if (node.children.length && node.children.every((c) => c.state === 'solved')) node.state = 'solved';
      else if (!node.children.length || node.children.some((c) => c.state === 'dead')) node.state = 'dead';
    }
    if (old !== node.state) {
      if (node.parent) update(node.parent);
      (node.parents || []).forEach(update);
    }
  }
  update(changed);
  // Newly linked DAG nodes may already be solved/dead. A bounded fixed-point
  // pass keeps shared-parent propagation deterministic without recursion.
  for (let i = 0; i < 4; i++) job.nodes.forEach(update);
}
function rsearchEnumerate(root, limit) {
  const out = [];
  function molecule(node) {
    if (node.stock) return [{ target: node.smiles, stock: node.stock, children: [] }];
    for (const and of node.children) {
      if (and.state !== 'solved') continue;
      const branches = and.children.map(molecule);
      if (branches.some((b) => !b.length)) continue;
      let combos = [{}];
      branches.forEach((trees) => {
        const next = [];
        combos.forEach((combo) => trees.forEach((tree, i) => {
          const copy = Object.assign({}, combo); copy[i] = tree; next.push(copy);
        }));
        combos = next.slice(0, limit - out.length);
      });
      combos.forEach((combo) => out.push({ target: node.smiles, candidate: and.candidate, children: and.children.map((_, i) => combo[i]) }));
      if (out.length >= limit) return out;
    }
    return out;
  }
  return root.state === 'solved' ? molecule(root).slice(0, limit) : [];
}
function rsearchTreeMetrics(tree) {
  const metrics = { steps: 0, depth: 0, feedstocks: 0, minor: 0, stockTier: 0 };
  const leaves = new Set();
  function walk(node, depth) {
    metrics.depth = Math.max(metrics.depth, depth);
    if (node.stock) { leaves.add(rsearchKey(node.target)); metrics.stockTier = Math.max(metrics.stockTier, node.stock.tier); return; }
    metrics.steps++;
    if (node.candidate.minor) metrics.minor++;
    node.children.forEach((c) => walk(c, depth + 1));
  }
  walk(tree, 0); metrics.feedstocks = leaves.size;
  return metrics;
}
function rsearchScore(tree) {
  const m = rsearchTreeMetrics(tree);
  return [m.steps, m.depth, m.stockTier, m.feedstocks, m.minor];
}
function rsearchExplanation(job) {
  const bits = [`${job.expanded} structures expanded`, `${job.verified} forward-verified transforms`, `${(job.elapsed / 1000).toFixed(1)} s`];
  if (job.rejected) bits.push(`${job.rejected} candidates failed forward verification`);
  if (job.duplicates) bits.push(`${job.duplicates} duplicate transforms removed`);
  if (job.truncated) bits.push('the search limit truncated some alternatives');
  return bits.join('; ') + '. A tree is returned only when every leaf is in stock; no route found within these limits does not establish that synthesis is impossible.';
}
