// Bounded target-directed search. Every edge comes from forward-checked retro
// candidates; inventory policy applies to additional building blocks, not reagents.
const PATH_FINDER_LIMITS = { maxDepth: 3, maxNodes: 60, maxBranch: 24, maxRoutes: 3, budgetMs: 12000, sliceMs: 25 };

function pathFinderStructure(smiles) {
  const graph = reactionFragmentGraph(smilesToFragment(smiles));
  if (graph.connectedComponents().length !== 1) throw new Error('Use one connected molecule for each endpoint or building block.');
  if (graph.atoms.length > RETRO_LIMITS.maxHeavy) throw new Error('Each endpoint must have at most ' + RETRO_LIMITS.maxHeavy + ' atoms.');
  const props = typeof moleculeIdentity === 'function' ? moleculeIdentity(graph) : reactionGraphProperties(graph);
  const text = props.isomericSmiles || props.smiles;
  return { key: props.key || text, smiles: text };
}

// Retain a parseable representation for callers; equality uses the shared key.
function pathFinderKey(smiles) { return pathFinderStructure(smiles).key; }

function pathFinderMaterialKey(smiles) {
  if (typeof moleculeIdentity === 'function') return moleculeIdentity(smiles).key;
  const props = reactionGraphProperties(reactionFragmentGraph(smilesToFragment(smiles)));
  return props.isomericSmiles || props.smiles;
}

function pathFinderRouteRank(route) {
  return [route.length, route.filter((link) => link.candidate.minor).length,
    route.reduce((n, link) => n + Math.max(0, link.candidate.precursors.length - 1), 0)];
}

function pathFinderProtectionLinks(candidate, carried, destination) {
  if (!candidate.pgSteps || !candidate.protection) return null;
  const selected = pathFinderStructure(candidate.protection.precursor);
  if (selected.key !== carried.key || candidate.pgSteps.length !== 3) return null;
  const links = [];
  let from = carried;
  for (const step of candidate.pgSteps) {
    const product = pathFinderStructure(step.product.isomericSmiles || step.product.smiles);
    const precursors = step.precursors.map(retroPrecursorInfo);
    const precursor = precursors.findIndex((p) => pathFinderKey(p.isomericSmiles || p.smiles) === from.key);
    if (precursor < 0) return null;
    const kind = step.role === 'step' ? 'reaction' : step.role;
    const group = candidate.protection.label;
    const functionalGroup = candidate.protection.group;
    const name = kind === 'protect' ? 'Protect ' + functionalGroup + ' with ' + group : kind === 'deprotect' ? 'Remove ' + group + ' and restore the ' + functionalGroup : step.outcome.name + ' with the ' + functionalGroup + ' protected';
    const c = {
      transform: kind === 'reaction' ? candidate.transform : step.outcome.rule || step.outcome.id,
      name, group: kind === 'reaction' ? candidate.group : 'Protecting groups',
      rule: step.outcome.rule, outcomeRule: step.outcome.rule, outcomeId: step.outcome.id,
      outcomeName: name, precursors, reagents: step.reagents, conditions: step.conditions,
      compounds: step.compounds, outcome: step.outcome, product: step.product,
      minor: step.minor, labels: reactionConditionLabels(step.conditions, step.compounds),
      planning: { kind, group, groupId: candidate.protection.id, reason: candidate.protection.reason, compatibility: candidate.protection.compatibility || null },
    };
    // Keep each visible substep independently checkable; the combined candidate
    // must not hide a failed or discontinuous protecting-group operation.
    if (!retroForwardCheck(c, product.smiles)) return null;
    links.push({ candidate: c, precursor, from: from.smiles, to: product.smiles, fromKey: from.key, toKey: product.key });
    from = product;
  }
  return from.key === destination.key ? links : null;
}

function pathFinderProtectionConflict(candidate) {
  if (typeof protectionAssess !== 'function' || typeof protectionGroups !== 'function') return null;
  try {
    const products = candidate.outcome && candidate.outcome.products || (candidate.product ? [candidate.product] : []);
    const remaining = new Set(products.flatMap((p) => protectionGroups(p.fragment || p.isomericSmiles || p.smiles)).map((s) => s.id));
    for (const compound of (candidate.compounds || []).filter((c) => c.role === 'reactant')) {
      const source = compound.fragment || compound.isomericSmiles || compound.smiles;
      const report = protectionAssess(source, candidate.compounds, candidate.conditions);
      const failed = (report.sites || []).find((site) => remaining.has(site.id) && site.status !== 'compatible');
      if (failed) return failed.label + ' is retained in the predicted product, but its survival is ' + failed.status + ': ' + (failed.reasons || []).join(' ');
    }
  } catch (error) { return 'Protecting-group survival could not be assessed for this candidate.'; }
  return null;
}

function pathFinderAmineConflict(candidate) {
  // Acid-base incompatibility, not a blanket guess about protection. Original
  // authored reference: OpenStax Organic Chemistry 17.5 (Grignard reaction).
  // Boc still has N-H for a primary amine and cannot solve this automatically.
  try {
    const ctx = reactionContext(candidate.compounds || [], candidate.conditions || {});
    if (ctx.has('grignard') && ctx.substrates.some((s) => s.graph.atoms.some((a) => a.element === 'N' && rxHydrogens(s.graph, a.id) > 0))) {
      return 'An N–H group would consume the Grignard reagent. No compatible forward-verified amine-protection plan is supported for this step.';
    }
  } catch (error) { /* Invalid inputs are rejected by structure/forward checks. */ }
  return null;
}

function pathFinderCreate(startSmiles, targetSmiles, options) {
  const opts = Object.assign({}, PATH_FINDER_LIMITS, options || {});
  opts.maxDepth = Math.max(1, Math.min(10, Math.floor(Number(opts.maxDepth) || 3)));
  const extended = opts.maxDepth > 5;
  opts.maxNodes = Math.max(1, Math.min(200, Number(options && options.maxNodes) || (extended ? 200 : 60)));
  opts.maxBranch = Math.max(1, Math.min(60, Number(opts.maxBranch) || 24));
  opts.maxRoutes = Math.max(1, Math.min(5, Number(opts.maxRoutes) || 3));
  opts.budgetMs = Math.max(1, Math.min(30000, Number(options && options.budgetMs) || (extended ? 30000 : 12000)));
  opts.stockPolicy = opts.stockPolicy === 'custom' ? 'custom' : 'builtin';
  const cache = new Map();
  const structure = (smiles) => {
    if (!cache.has(smiles)) { try { cache.set(smiles, pathFinderStructure(smiles)); } catch (error) { cache.set(smiles, null); } }
    return cache.get(smiles);
  };
  const start = pathFinderStructure(startSmiles), target = pathFinderStructure(targetSmiles);
  const available = new Set([start.key]);
  (opts.availableMaterials || []).forEach((text) => {
    const parsed = reactionParseCompound(text);
    available.add(pathFinderStructure(parsed.smiles).key);
  });
  const split = (values) => (Array.isArray(values) ? values : String(values || '').split(/[\n,]+/)).map((s) => String(s).trim()).filter(Boolean);
  const forbiddenRules = split(opts.forbiddenRules).map((s) => s.toLowerCase());
  opts.allowedProtectingGroups = options && options.allowedProtectingGroups !== undefined
    ? split(options.allowedProtectingGroups).map((id) => id.toLowerCase()) : null;
  const forbiddenReagents = split(opts.forbiddenReagents).map((text) => {
    let key = '';
    try { key = pathFinderMaterialKey(reactionParseCompound(text).smiles); } catch (error) { /* Named catalyst labels need no structure. */ }
    return { text: text.toLowerCase(), key };
  });
  const diagnostics = { candidates: 0, inventory: 0, reagents: 0, rules: 0, stereo: 0, protection: 0, protectionMessages: opts.allowedProtectingGroups && !opts.allowedProtectingGroups.length ? ['Automatic protection planning is disabled.'] : [], noDisconnections: 0, depth: 0, branch: 0, missingMaterials: [] };
  const job = { start: start.smiles, target: target.smiles, options: opts, status: start.key === target.key ? 'identical' : 'running', route: [], routes: [], expanded: 0, truncated: false, elapsedMs: 0, diagnostics, termination: '' };
  const queue = [{ smiles: target.smiles, key: target.key, chain: [], ancestors: new Set([target.key]) }];
  const queued = new Set(), expanded = new Map(), routeKeys = new Set();
  let current = null;
  const stocked = (smiles) => {
    const s = structure(smiles);
    if (s && available.has(s.key)) return true;
    const stock = opts.stockPolicy === 'builtin' && typeof stockTier === 'function' ? stockTier(smiles) : null;
    if (!stock || stock.tier > 2 || !s) return false;
    // A connectivity-only stock hit must not supply a specified stereoisomer.
    try { return !!stock.smiles && pathFinderMaterialKey(stock.smiles) === s.key; } catch (error) { return false; }
  };
  const ruleBlocked = (c) => {
    const labels = [c.rule, c.transform, c.outcomeRule, c.outcomeId, c.name, c.outcomeName].filter(Boolean).map((x) => String(x).toLowerCase());
    return forbiddenRules.some((filter) => labels.some((label) => label.includes(filter)));
  };
  const reagentBlocked = (c) => {
    const reagents = (c.compounds || []).filter((p) => p.role !== 'reactant').concat(c.reagents || []);
    const conditions = c.conditions || {};
    (conditions.additives || []).forEach((id) => { const a = reactionAdditive(id); reagents.push(a || { label: id }); });
    (conditions.solvents || []).forEach((id) => { const a = typeof reactionSolvent === 'function' ? reactionSolvent(id) : null; reagents.push(a || { label: id }); });
    return forbiddenReagents.some((filter) => reagents.some((p) => {
      const labels = [p.label, p.name, p.id, p.smiles, p.input].filter(Boolean).map((x) => String(x).toLowerCase());
      let same = false;
      try { same = !!filter.key && !!p.smiles && pathFinderMaterialKey(p.isomericSmiles || p.smiles) === filter.key; } catch (error) { /* Unresolved label: compare text below. */ }
      return same || labels.some((label) => label.includes(filter.text));
    }));
  };
  const signature = (link) => [link.candidate.transform, link.candidate.rule, link.candidate.outcomeId, link.fromKey, link.toKey, JSON.stringify(link.candidate.conditions || {}), (link.candidate.compounds || []).map((p) => p.smiles + ':' + p.role).sort().join('|')].join('~');
  const rankRoutes = () => {
    job.routes.sort((a, b) => {
      const ra = pathFinderRouteRank(a), rb = pathFinderRouteRank(b);
      for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
      return a.map(signature).join('/').localeCompare(b.map(signature).join('/'));
    });
    job.route = job.routes[0] || [];
  };
  const finish = (reason) => { job.termination = reason; job.status = job.routes.length ? 'found' : reason === 'exhausted' ? 'exhausted' : 'budget'; rankRoutes(); };
  const attach = (node, candidates) => {
    if (!candidates.length) diagnostics.noDisconnections++;
    if (candidates.length > opts.maxBranch) { diagnostics.branch += candidates.length - opts.maxBranch; job.truncated = true; }
    for (const candidate of candidates.slice(0, opts.maxBranch)) {
      diagnostics.candidates++;
      if (candidate.pgSteps && opts.allowedProtectingGroups && !opts.allowedProtectingGroups.includes(candidate.protection && candidate.protection.id)) {
        diagnostics.protection++;
        const reason = opts.allowedProtectingGroups.length ? 'The required protecting group is excluded by the allowed protecting groups setting.' : 'Automatic protection planning is disabled.';
        if (!diagnostics.protectionMessages.includes(reason)) diagnostics.protectionMessages.push(reason);
        continue;
      }
      if (candidate.stereo === 'mismatch' || candidate.stereo === 'racemic') { diagnostics.stereo++; continue; }
      const preservationConflict = candidate.pgSteps ? null : pathFinderProtectionConflict(candidate);
      if (preservationConflict) {
        diagnostics.protection++;
        if (diagnostics.protectionMessages.length < 4 && !diagnostics.protectionMessages.includes(preservationConflict)) diagnostics.protectionMessages.push(preservationConflict);
        continue;
      }
      const amineConflict = pathFinderAmineConflict(candidate);
      if (amineConflict) {
        diagnostics.protection++;
        if (!diagnostics.protectionMessages.includes(amineConflict) && diagnostics.protectionMessages.length < 4) diagnostics.protectionMessages.push(amineConflict);
        continue;
      }
      const product = candidate.product && structure(candidate.product.isomericSmiles || candidate.product.smiles);
      if (!product || product.key !== node.key) { diagnostics.stereo++; continue; }
      if (ruleBlocked(candidate)) { diagnostics.rules++; continue; }
      if (reagentBlocked(candidate)) { diagnostics.reagents++; continue; }
      const precursors = candidate.precursors || [];
      const parts = precursors.map((p) => structure(p.isomericSmiles || p.smiles));
      for (let i = 0; i < precursors.length; i++) {
        const carried = parts[i];
        if (!carried || node.ancestors.has(carried.key)) continue;
        const missing = precursors.filter((p, j) => j !== i && !stocked(p.isomericSmiles || p.smiles));
        if (missing.length) {
          diagnostics.inventory++;
          missing.forEach((p) => { if (diagnostics.missingMaterials.length < 8 && !diagnostics.missingMaterials.includes(p.smiles)) diagnostics.missingMaterials.push(p.smiles); });
          continue;
        }
        const links = candidate.pgSteps ? pathFinderProtectionLinks(candidate, carried, node)
          : [{ candidate, precursor: i, from: carried.smiles, to: node.smiles, fromKey: carried.key, toKey: node.key }];
        if (!links) { diagnostics.protection++; continue; }
        if (links.some((link) => pathFinderProtectionConflict(link.candidate))) { diagnostics.protection++; continue; }
        if (links.some((link) => ruleBlocked(link.candidate))) { diagnostics.rules++; continue; }
        if (links.some((link) => reagentBlocked(link.candidate))) { diagnostics.reagents++; continue; }
        if (links.some((link) => link.candidate.precursors.some((p, j) => j !== link.precursor && !stocked(p.isomericSmiles || p.smiles)))) { diagnostics.inventory++; continue; }
        const chain = node.chain.concat(links.slice().reverse());
        if (chain.length > opts.maxDepth) { diagnostics.depth++; continue; }
        if (carried.key === start.key) {
          const route = chain.slice().reverse(), id = route.map(signature).join('/');
          if (!routeKeys.has(id)) { routeKeys.add(id); job.routes.push(route); rankRoutes(); }
          if (job.routes.length >= opts.maxRoutes) { finish('route-limit'); return; }
          continue;
        }
        if (chain.length >= opts.maxDepth) { diagnostics.depth++; continue; }
        const id = chain.map(signature).join('/');
        if (!queued.has(id) && queue.length < opts.maxNodes * opts.maxBranch) {
          queued.add(id);
          queue.push({ smiles: carried.smiles, key: carried.key, chain, ancestors: new Set([...node.ancestors, carried.key]) });
        }
      }
    }
  };
  job.step = (sliceMs) => {
    if (job.status !== 'running') return job;
    const began = retroNow(), until = began + Math.max(1, sliceMs || opts.sliceMs);
    while (job.status === 'running' && retroNow() < until) {
      if (job.elapsedMs + retroNow() - began >= opts.budgetMs) { finish('time-limit'); break; }
      if (!current) {
        const node = queue.shift();
        if (!node) { finish('exhausted'); break; }
        if (expanded.has(node.key)) { attach(node, expanded.get(node.key)); continue; }
        if (job.expanded >= opts.maxNodes) { finish('node-limit'); break; }
        const graph = retroFromSmiles(node.smiles);
        current = { node, iterator: retroDisconnectSteps(graph, retroIds(graph), { protect: !opts.allowedProtectingGroups || opts.allowedProtectingGroups.length > 0 }) };
        job.expanded++;
      }
      const next = current.iterator.next();
      if (next.done) {
        const result = next.value || {};
        job.truncated = job.truncated || !!result.truncated;
        (result.protectionNeeds || []).forEach((need) => {
          diagnostics.protection++;
          if (diagnostics.protectionMessages.length < 4 && !diagnostics.protectionMessages.includes(need.reason)) diagnostics.protectionMessages.push(need.reason);
        });
        expanded.set(current.node.key, result.candidates || []);
        attach(current.node, result.candidates || []);
        current = null;
      }
    }
    job.elapsedMs += retroNow() - began;
    return job;
  };
  job.cancel = () => { if (job.status === 'running') { job.status = 'cancelled'; job.termination = 'cancelled'; rankRoutes(); } current = null; return job; };
  return job;
}

function pathFinderExplanation(job) {
  const d = job.diagnostics;
  const reasons = [];
  if (d.rules) reasons.push(d.rules + ' candidates excluded by reaction filters');
  if (d.reagents) reasons.push(d.reagents + ' candidates excluded by reagent/solvent filters');
  if (d.inventory) reasons.push(d.inventory + ' branches need unavailable building blocks');
  if (d.depth) reasons.push(d.depth + ' branches reached the step limit');
  if (d.stereo) reasons.push(d.stereo + ' candidates did not preserve the required structure or stereochemistry');
  if (d.protection) reasons.push(d.protection + ' candidate branches need an unsupported or incompatible protection plan');
  (d.protectionMessages || []).forEach((message) => reasons.push(message));
  if (job.truncated) reasons.push('some candidates were omitted by search limits');
  if (job.termination === 'time-limit' || job.termination === 'node-limit') reasons.push('the ' + job.termination.replace('-', ' ') + ' was reached');
  if (!reasons.length) reasons.push('the supported transformations did not connect these endpoints');
  return reasons.join('; ') + '.';
}

function createPathFinder(deps) {
  const get = (id) => document.getElementById(id);
  const start = get('path-start'), target = get('path-target'), run = get('path-run'), cancel = get('path-cancel'), status = get('path-status'), results = get('path-results');
  let job = null, token = 0;
  const element = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
  const name = (smiles) => { try { return retroViewName(smiles); } catch (error) { return smiles; } };
  const value = (id, fallback) => get(id) ? get(id).value : fallback;
  const updateLimits = () => {
    const limits = get('path-search-limits');
    if (limits) limits.textContent = Number(value('path-depth', 3)) > 5 ? 'Search is limited to 200 structures and 30 seconds.' : 'Search is limited to 60 structures and 12 seconds.';
  };
  get('path-depth').addEventListener('change', updateLimits);
  updateLimits();
  const finish = () => {
    run.disabled = false; cancel.disabled = true;
    results.replaceChildren();
    const stats = ' ' + job.expanded + ' structures searched in ' + (job.elapsedMs / 1000).toFixed(1) + ' s.';
    if (job.status === 'identical') { status.textContent = 'The endpoints describe the same structure; no reaction is needed.'; return; }
    if (!job.routes.length) {
      status.textContent = (job.status === 'cancelled' ? 'Search cancelled.' : 'No route found within these rules and limits.') + stats + ' ' + pathFinderExplanation(job) + ' This does not establish that synthesis is impossible.';
      if (job.diagnostics.missingMaterials.length) results.append(element('p', 'Missing building blocks: ' + job.diagnostics.missingMaterials.map(name).join(', ')));
      return;
    }
    status.textContent = job.routes.length + ' rule-verified candidate route' + (job.routes.length === 1 ? '' : 's') + ' found.' + stats + ' Ranked by fewer steps, fewer minor products, then fewer extra building blocks.' + (job.status === 'cancelled' ? ' Search cancelled; partial results retained.' : '');
    if (typeof routeComparisonRender === 'function') { routeComparisonRender(results, job, deps); return; }
    job.routes.forEach((route, index) => {
      const wrapper = element('section', undefined, 'path-route');
      const rank = pathFinderRouteRank(route);
      wrapper.append(element('h3', 'Route ' + (index + 1) + ' · ' + rank[0] + ' step' + (rank[0] === 1 ? '' : 's') + ' · ' + rank[2] + ' additional building block' + (rank[2] === 1 ? '' : 's')));
      if (deps.saveRoute) {
        const save = element('button', 'Save route to workspace', 'text-button'); save.type = 'button';
        save.addEventListener('click', () => deps.saveRoute({ version: 1, start: job.start, target: job.target, steps: route, options: job.options, createdAt: new Date().toISOString() }));
        wrapper.append(save);
      }
      route.forEach((link, i) => {
        const c = link.candidate, card = element('article', undefined, 'path-step');
        card.append(element('h4', (i + 1) + '. ' + (c.outcomeName || c.name)));
        card.append(element('p', name(link.from) + ' → ' + name(link.to), 'path-equation'));
        card.append(element('code', link.from + ' → ' + link.to, 'path-smiles'));
        if (deps.thumbnail) { const structures = element('div', undefined, 'path-structures'); structures.append(deps.thumbnail(retroFromSmiles(link.from)), element('span', '→'), deps.thumbnail(retroFromSmiles(link.to))); card.append(structures); }
        const others = c.precursors.filter((p, j) => j !== link.precursor).map((p) => name(p.smiles));
        if (others.length) card.append(element('p', 'Additional building blocks: ' + others.join(', ')));
        card.append(element('p', 'Reagents and conditions: ' + [c.labels && c.labels.above, c.labels && c.labels.below].filter(Boolean).join(' · ')));
        if (c.minor) card.append(element('p', 'The selected target is a minor predicted product.'));
        if (typeof reactionEvidenceElement === 'function' && c.outcome && c.outcome.evidence) card.append(reactionEvidenceElement(c.outcome.evidence, true));
        const open = element('button', 'Open step in Reactions', 'text-button'); open.type = 'button';
        open.addEventListener('click', () => deps.openInLab(c.compounds, c.conditions)); card.append(open);
        wrapper.append(card);
      });
      results.append(wrapper);
    });
  };
  run.addEventListener('click', () => {
    const id = ++token;
    if (job) job.cancel();
    results.replaceChildren();
    try {
      const a = reactionParseCompound(start.value), b = reactionParseCompound(target.value);
      job = pathFinderCreate(a.isomericSmiles || a.smiles, b.isomericSmiles || b.smiles, {
        maxDepth: Number(value('path-depth', 3)), maxRoutes: Number(value('path-route-count', 3)), stockPolicy: value('path-stock-policy', 'builtin'),
        availableMaterials: String(value('path-inventory', '')).split(/\n/).map((s) => s.trim()).filter(Boolean),
        forbiddenReagents: value('path-forbidden-reagents', ''), forbiddenRules: value('path-forbidden-rules', ''),
        allowedProtectingGroups: value('path-protection-policy', 'auto') === 'off' ? [] : String(value('path-allowed-protecting-groups', '')).trim() ? String(value('path-allowed-protecting-groups', '')).split(/[\s,]+/).filter(Boolean) : undefined,
      });
    } catch (error) { status.textContent = error.message; return; }
    run.disabled = true; cancel.disabled = false;
    const tick = () => {
      if (id !== token) return;
      try { job.step(); } catch (error) { job.cancel(); status.textContent = 'Search failed: ' + error.message; run.disabled = false; cancel.disabled = true; return; }
      if (job.status !== 'running') { finish(); return; }
      status.textContent = 'Searching supported transformations… ' + job.expanded + ' structures checked, ' + job.routes.length + ' candidate routes found. You can cancel at any time.';
      setTimeout(tick, 0);
    };
    setTimeout(tick, 0);
  });
  cancel.addEventListener('click', () => { if (job) { ++token; job.cancel(); finish(); } });
  [start, target].forEach((input) => input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !run.disabled) run.click(); }));
  get('path-example').addEventListener('click', () => { start.value = 'ethanol'; target.value = 'ethanal'; });
  return { show() { updateLimits(); start.focus(); } };
}
