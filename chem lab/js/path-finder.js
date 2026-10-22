// Target-directed, bounded search. Each edge is generated and checked by the
// existing forward reaction rules. Other building blocks must be in local stock.
const PATH_FINDER_LIMITS = { maxDepth: 3, maxNodes: 60, maxBranch: 24, budgetMs: 12000, sliceMs: 25 };

function pathFinderKey(smiles) {
  const graph = reactionFragmentGraph(smilesToFragment(smiles));
  if (graph.connectedComponents().length !== 1) throw new Error('Use one connected molecule for each endpoint.');
  if (graph.atoms.length > RETRO_LIMITS.maxHeavy) throw new Error('Each endpoint must have at most ' + RETRO_LIMITS.maxHeavy + ' atoms.');
  const props = reactionGraphProperties(graph);
  return props.isomericSmiles || props.smiles;
}

function pathFinderCreate(startSmiles, targetSmiles, options) {
  const opts = Object.assign({}, PATH_FINDER_LIMITS, options || {});
  opts.maxDepth = Math.max(1, Math.min(5, Number(opts.maxDepth) || 3));
  opts.maxNodes = Math.max(1, Math.min(200, Number(opts.maxNodes) || 60));
  opts.budgetMs = Math.max(1, Math.min(30000, Number(opts.budgetMs) || 12000));
  const start = pathFinderKey(startSmiles);
  const target = pathFinderKey(targetSmiles);
  const job = { start, target, options: opts, status: start === target ? 'identical' : 'running', route: [], expanded: 0, truncated: false, elapsedMs: 0 };
  const queue = [{ smiles: target, chain: [], ancestors: new Set([target]) }];
  const seen = new Set([target]);
  let current = null;
  const key = (smiles) => { try { return pathFinderKey(smiles); } catch (error) { return ''; } };
  const stocked = (smiles) => {
    const stock = typeof stockTier === 'function' ? stockTier(smiles) : null;
    return stock && stock.tier <= 2;
  };
  const attach = (node, candidates) => {
    for (const candidate of candidates.slice(0, opts.maxBranch)) {
      if (candidate.pgSteps || candidate.stereo === 'mismatch' || candidate.stereo === 'racemic') continue;
      // Exact isomeric product matching avoids treating enantiomers as identical.
      if (!candidate.product || key(candidate.product.isomericSmiles || candidate.product.smiles) !== node.smiles) continue;
      const precursors = candidate.precursors || [];
      const keys = precursors.map((p) => key(p.isomericSmiles || p.smiles));
      for (let i = 0; i < precursors.length; i++) {
        const carried = keys[i];
        if (!carried || node.ancestors.has(carried)) continue;
        if (precursors.some((p, j) => j !== i && !stocked(p.smiles))) continue;
        const link = { candidate, precursor: i, from: carried, to: node.smiles };
        const chain = node.chain.concat([link]);
        if (carried === start) {
          job.route = chain.reverse();
          job.status = 'found';
          return;
        }
        if (chain.length < opts.maxDepth && !seen.has(carried)) {
          seen.add(carried);
          queue.push({ smiles: carried, chain, ancestors: new Set([...node.ancestors, carried]) });
        }
      }
    }
  };
  job.step = (sliceMs) => {
    if (job.status !== 'running') return job;
    const began = retroNow();
    const until = began + Math.max(1, sliceMs || opts.sliceMs);
    while (job.status === 'running' && retroNow() < until) {
      if (job.elapsedMs + retroNow() - began >= opts.budgetMs) { job.status = 'budget'; break; }
      if (!current) {
        if (job.expanded >= opts.maxNodes) { job.status = 'budget'; break; }
        const node = queue.shift();
        if (!node) { job.status = 'exhausted'; break; }
        const graph = retroFromSmiles(node.smiles);
        current = { node, iterator: retroDisconnectSteps(graph, retroIds(graph), { protect: false }) };
        job.expanded++;
      }
      const next = current.iterator.next();
      if (next.done) {
        const result = next.value || {};
        job.truncated = job.truncated || !!result.truncated;
        attach(current.node, result.candidates || []);
        current = null;
      }
    }
    job.elapsedMs += retroNow() - began;
    return job;
  };
  job.cancel = () => { if (job.status === 'running') job.status = 'cancelled'; current = null; return job; };
  return job;
}

function createPathFinder(deps) {
  const get = (id) => document.getElementById(id);
  const start = get('path-start');
  const target = get('path-target');
  const run = get('path-run');
  const cancel = get('path-cancel');
  const status = get('path-status');
  const results = get('path-results');
  let job = null;
  let token = 0;
  const element = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
  const name = (smiles) => { try { return retroViewName(smiles); } catch (error) { return smiles; } };
  const finish = () => {
    run.disabled = false;
    cancel.disabled = true;
    const stats = ' ' + job.expanded + ' structures searched in ' + (job.elapsedMs / 1000).toFixed(1) + ' s.';
    if (job.status === 'identical') { status.textContent = 'The endpoints describe the same structure; no reaction is needed.'; return; }
    if (job.status !== 'found') {
      status.textContent = (job.status === 'cancelled' ? 'Search cancelled.' : 'No route found within these rules and limits.') + stats + ' This does not establish that synthesis is impossible.';
      return;
    }
    status.textContent = 'Rule-verified candidate route found: ' + job.route.length + ' step' + (job.route.length === 1 ? '' : 's') + '.' + stats;
    job.route.forEach((link, i) => {
      const c = link.candidate;
      const card = element('article', undefined, 'path-step');
      card.append(element('h3', (i + 1) + '. ' + (c.outcomeName || c.name)));
      card.append(element('p', name(link.from) + ' → ' + name(link.to), 'path-equation'));
      const smiles = element('code', link.from + ' → ' + link.to, 'path-smiles');
      card.append(smiles);
      if (deps.thumbnail) { const structures = element('div', undefined, 'path-structures'); structures.append(deps.thumbnail(retroFromSmiles(link.from)), element('span', '→'), deps.thumbnail(retroFromSmiles(link.to))); card.append(structures); }
      const others = c.precursors.filter((p, j) => j !== link.precursor).map((p) => name(p.smiles));
      if (others.length) card.append(element('p', 'Additional building blocks: ' + others.join(', ')));
      card.append(element('p', 'Reagents and conditions: ' + [c.labels && c.labels.above, c.labels && c.labels.below].filter(Boolean).join(' · ')));
      if (c.minor) card.append(element('p', 'The selected target is a minor predicted product.'));
      const open = element('button', 'Open step in Reactions', 'text-button');
      open.type = 'button';
      open.addEventListener('click', () => deps.openInLab(c.compounds, c.conditions));
      card.append(open);
      results.append(card);
    });
  };
  run.addEventListener('click', () => {
    const id = ++token;
    if (job) job.cancel();
    results.replaceChildren();
    try {
      const a = reactionParseCompound(start.value);
      const b = reactionParseCompound(target.value);
      job = pathFinderCreate(a.smiles, b.smiles, { maxDepth: Number(get('path-depth').value) });
    } catch (error) { status.textContent = error.message; return; }
    run.disabled = true;
    cancel.disabled = false;
    const tick = () => {
      if (id !== token) return;
      try { job.step(); } catch (error) { job.cancel(); status.textContent = 'Search failed: ' + error.message; run.disabled = false; cancel.disabled = true; return; }
      if (job.status !== 'running') { finish(); return; }
      status.textContent = 'Searching supported transformations… ' + job.expanded + ' structures checked. You can cancel at any time.';
      setTimeout(tick, 0);
    };
    setTimeout(tick, 0);
  });
  cancel.addEventListener('click', () => { if (job) { ++token; job.cancel(); finish(); } });
  [start, target].forEach((input) => input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !run.disabled) run.click(); }));
  get('path-example').addEventListener('click', () => { start.value = 'ethanol'; target.value = 'ethanal'; });
  return { show() { start.focus(); } };
}
