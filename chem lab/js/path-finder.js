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

// A cheap graph-count distance orders equally deep frontier entries. It never
// supplies a reaction, excludes a branch, or serves as a feasibility score.
function pathFinderFingerprint(smiles) {
  const g = reactionFragmentGraph(smilesToFragment(smiles)), counts = {};
  const add = key => { counts[key] = (counts[key] || 0) + 1; };
  g.atoms.forEach(a => {
    add('atom:' + a.element + ':' + (a.isotope || 0));
    const environment = rxNeighbors(g, a.id).map(n => n.atom.element + ':' + n.bond.order).sort().join(',');
    add('env:' + a.element + ':' + (a.isotope || 0) + ':' + environment);
  });
  g.bonds.forEach(b => add('bond:' + [g.getAtom(b.atomA).element,g.getAtom(b.atomB).element].sort().join('-') + ':' + b.order));
  return counts;
}

function pathFinderHeavyCount(smiles) {
  try { return reactionFragmentGraph(smilesToFragment(smiles)).atoms.filter((a) => a.element !== 'H').length; }
  catch (error) { return 1000; }
}

function pathFinderDefaultMaterial(smiles) {
  let stock = null;
  try { stock = typeof stockTier === 'function' ? stockTier(smiles) : null; } catch (error) { /* An unavailable entry only affects ordering. */ }
  return { tier: stock && stock.tier <= 2 ? stock.tier : 4, heavy: pathFinderHeavyCount(smiles) };
}

function pathFinderMaterialSummary(precursors, describe) {
  const material = describe || pathFinderDefaultMaterial, seen = new Set(), out = { stock: 0, heavy: 0, count: 0 };
  (precursors || []).forEach((p) => {
    const smiles = p.isomericSmiles || p.smiles || String(p);
    let key = smiles;
    try { key = pathFinderMaterialKey(smiles); } catch (error) { /* Keep a stable textual fallback for ranking only. */ }
    if (seen.has(key)) return;
    seen.add(key);
    const info = material(smiles);
    out.stock += info.tier;
    out.heavy += info.heavy;
    out.count++;
  });
  return out;
}

function pathFinderRouteRank(route, describe) {
  const extras = route.flatMap((link) => link.candidate.precursors.filter((p, i) => i !== link.precursor));
  const materials = pathFinderMaterialSummary(extras, describe);
  return [route.length, materials.stock, materials.heavy,
    route.filter((link) => link.candidate.minor).length, materials.count];
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
  const startFeatures = pathFinderFingerprint(start.smiles), priorities = new Map();
  const priority = smiles => {
    if (!priorities.has(smiles)) {
      const features = pathFinderFingerprint(smiles), keys = new Set([...Object.keys(startFeatures),...Object.keys(features)]);
      // Temporary disconnections are cheaper than losing the starting skeleton.
      priorities.set(smiles, [...keys].reduce((n, k) => {
        const have = features[k] || 0, want = startFeatures[k] || 0;
        return n + (have < want ? 6 * (want - have) : have - want);
      }, 0));
    }
    return priorities.get(smiles);
  };
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
  const diagnostics = { candidates: 0, inventory: 0, reagents: 0, rules: 0, stereo: 0, compatibility: 0, rejected: [], protection: 0, protectionMessages: opts.allowedProtectingGroups && !opts.allowedProtectingGroups.length ? ['Automatic protection planning is disabled.'] : [], noDisconnections: 0, depth: 0, branch: 0, missingMaterials: [] };
  const job = { start: start.smiles, target: target.smiles, options: opts, status: start.key === target.key ? 'identical' : 'running', route: [], routes: [], expanded: 0, truncated: false, elapsedMs: 0, diagnostics, termination: '' };
  const queue = [{ smiles: target.smiles, key: target.key, chain: [], ancestors: new Set([target.key]) }];
  const queued = new Set(), expanded = new Map(), routeKeys = new Set();
  let current = null;
  const materials = new Map();
  const material = (smiles) => {
    if (!materials.has(smiles)) {
      const s = structure(smiles);
      let tier = 4, inStock = false;
      if (s && available.has(s.key)) { tier = 0; inStock = true; }
      else {
        const stock = opts.stockPolicy === 'builtin' && typeof stockTier === 'function' ? stockTier(smiles) : null;
        if (stock && stock.tier <= 2 && s) {
          // A connectivity-only stock hit must not supply a specified stereoisomer.
          try { inStock = !!stock.smiles && pathFinderMaterialKey(stock.smiles) === s.key; } catch (error) { inStock = false; }
          if (inStock) tier = stock.tier;
        }
      }
      materials.set(smiles, { available: inStock, tier, heavy: pathFinderHeavyCount(smiles) });
    }
    return materials.get(smiles);
  };
  const stocked = (smiles) => material(smiles).available;
  const compareRanks = (a, b) => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) - (b[i] || 0);
    return 0;
  };
  const choiceRank = (candidate, carried) => {
    const precursor = candidate.precursors[carried], carriedStructure = precursor && structure(precursor.isomericSmiles || precursor.smiles);
    const direct = carriedStructure && carriedStructure.key === start.key ? 0 : 1;
    const extras = candidate.precursors.filter((p, i) => i !== carried);
    const missing = extras.filter((p) => !stocked(p.isomericSmiles || p.smiles)).length;
    const summary = pathFinderMaterialSummary(extras, material);
    // Inventory and material simplicity remain the primary criteria. When those
    // tie, follow the precursor closest to the requested start before exploring
    // valid but needlessly growing branches such as reverse rearrangements.
    const startDistance = carriedStructure ? priority(carriedStructure.smiles) : 0;
    return [direct, missing, summary.stock, summary.heavy, summary.count, startDistance];
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
  if (opts.recipeTree && start.key !== target.key) {
    return pathFinderRecipeCreate(start, target, opts, { available, material, ruleBlocked, reagentBlocked, structure });
  }
  const signature = (link) => [link.candidate.transform, link.candidate.rule, link.candidate.outcomeId, link.fromKey, link.toKey, JSON.stringify(link.candidate.conditions || {}), (link.candidate.compounds || []).map((p) => p.smiles + ':' + p.role).sort().join('|')].join('~');
  const rankRoutes = () => {
    job.routes.sort((a, b) => {
      const ra = pathFinderRouteRank(a, material), rb = pathFinderRouteRank(b, material);
      for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return ra[i] - rb[i];
      return a.map(signature).join('/').localeCompare(b.map(signature).join('/'));
    });
    job.route = job.routes[0] || [];
  };
  const finish = (reason) => { job.termination = reason; job.status = job.routes.length ? 'found' : reason === 'exhausted' ? 'exhausted' : 'budget'; rankRoutes(); };
  // Expanded structures are reused by multiple chains. These assessments depend
  // only on the candidate, so repeat them once per candidate rather than once
  // per chain; per-job weak caches cannot leak results between planner settings.
  const assessmentCache = new WeakMap(), preservationCache = new WeakMap();
  const candidateAssessment = (candidate) => {
    if (typeof routeStepAssessment !== 'function') return null;
    if (!assessmentCache.has(candidate)) assessmentCache.set(candidate, routeStepAssessment(candidate));
    return assessmentCache.get(candidate);
  };
  const candidatePreservationConflict = (candidate) => {
    if (!preservationCache.has(candidate)) preservationCache.set(candidate, pathFinderProtectionConflict(candidate));
    return preservationCache.get(candidate);
  };
  const attach = (node, candidates) => {
    if (!candidates.length) diagnostics.noDisconnections++;
    // Discovery order matters under branch/route limits. Prefer a disconnection
    // whose other precursors are available, common and structurally simple;
    // forward verification and every rejection filter remain unchanged.
    const ordered = candidates.map((candidate, index) => {
      let best = null;
      candidate.precursors.forEach((p, i) => {
        const rank = choiceRank(candidate, i);
        if (!best || compareRanks(rank, best) < 0) best = rank;
      });
      return { candidate, index, rank: best || [0, 0, 0, 0] };
    }).sort((a, b) => compareRanks(a.rank, b.rank) || a.index - b.index);
    if (ordered.length > opts.maxBranch) { diagnostics.branch += ordered.length - opts.maxBranch; job.truncated = true; }
    for (const item of ordered.slice(0, opts.maxBranch)) {
      const candidate = item.candidate;
      diagnostics.candidates++;
      const assessment = candidateAssessment(candidate);
      if (assessment) {
        if (assessment.blockers.length) {
          diagnostics.compatibility++;
          assessment.blockers.forEach(b => {
            const record = { reaction: candidate.name, target: node.smiles, code: b.code, reason: b.message };
            if (diagnostics.rejected.length < 12 && !diagnostics.rejected.some(r => r.reaction === record.reaction && r.target === record.target && r.code === record.code)) diagnostics.rejected.push(record);
          });
          continue;
        }
      }
      if (candidate.pgSteps && opts.allowedProtectingGroups && !opts.allowedProtectingGroups.includes(candidate.protection && candidate.protection.id)) {
        diagnostics.protection++;
        const reason = opts.allowedProtectingGroups.length ? 'The required protecting group is excluded by the allowed protecting groups setting.' : 'Automatic protection planning is disabled.';
        if (!diagnostics.protectionMessages.includes(reason)) diagnostics.protectionMessages.push(reason);
        continue;
      }
      if (candidate.stereo === 'mismatch' || candidate.stereo === 'racemic') { diagnostics.stereo++; continue; }
      const preservationConflict = candidate.pgSteps ? null : candidatePreservationConflict(candidate);
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
      const sameProduct = product && (product.key === node.key || typeof retroProductIdentity === 'function' &&
        retroProductIdentity(candidate.product.isomericSmiles || candidate.product.smiles) === retroProductIdentity(node.smiles));
      if (!sameProduct) { diagnostics.stereo++; continue; }
      if (ruleBlocked(candidate)) { diagnostics.rules++; continue; }
      if (reagentBlocked(candidate)) { diagnostics.reagents++; continue; }
      const precursors = candidate.precursors || [];
      const parts = precursors.map((p) => structure(p.isomericSmiles || p.smiles));
      const precursorOrder = precursors.map((p, i) => ({ i, direct: parts[i] && parts[i].key === start.key ? 0 : 1, rank: choiceRank(candidate, i) }))
        .sort((a, b) => a.direct - b.direct || compareRanks(a.rank, b.rank) || a.i - b.i);
      for (const choice of precursorOrder) {
        const i = choice.i;
        const carried = parts[i];
        if (!carried || node.ancestors.has(carried.key)) continue;
        const missing = precursors.filter((p, j) => j !== i && !stocked(p.isomericSmiles || p.smiles));
        if (missing.length) {
          diagnostics.inventory++;
          missing.forEach((p) => { if (!diagnostics.missingMaterials.includes(p.smiles)) diagnostics.missingMaterials.push(p.smiles); });
          // These are examples from rejected branches, not required ingredients.
          // Keep the simplest examples instead of letting exotic early dead ends
          // fill the diagnostic list.
          diagnostics.missingMaterials.sort((a, b) => material(a).heavy - material(b).heavy || a.localeCompare(b));
          if (diagnostics.missingMaterials.length > 8) diagnostics.missingMaterials.length = 8;
          continue;
        }
        const links = candidate.pgSteps ? pathFinderProtectionLinks(candidate, carried, node)
          : [{ candidate, precursor: i, from: carried.smiles, to: node.smiles, fromKey: carried.key, toKey: node.key }];
        if (!links) { diagnostics.protection++; continue; }
        if (links.some((link) => { const report = candidateAssessment(link.candidate); return report && report.blockers.length; })) { diagnostics.compatibility++; continue; }
        if (links.some((link) => candidatePreservationConflict(link.candidate))) { diagnostics.protection++; continue; }
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
          queue.push({ smiles: carried.smiles, key: carried.key, chain, priority: priority(carried.smiles), ancestors: new Set([...node.ancestors, carried.key]) });
        }
      }
    }
  };
  let sequenceTried = false;
  job.step = (sliceMs) => {
    if (job.status !== 'running') return job;
    const began = retroNow(), until = began + Math.max(1, sliceMs || opts.sliceMs);
    if (!sequenceTried && typeof pathFinderSequenceRoutes === 'function') {
      sequenceTried = true;
      const sequenceRoutes = pathFinderSequenceRoutes(start,target,opts,{ruleBlocked,reagentBlocked,stocked});
      sequenceRoutes.forEach(route => {const id=route.map(signature).join('/');if(!routeKeys.has(id)){routeKeys.add(id);job.routes.push(route);}});
      rankRoutes();
      if (job.routes.length >= opts.maxRoutes) {finish('route-limit');job.elapsedMs+=retroNow()-began;return job;}
    }
    while (job.status === 'running' && retroNow() < until) {
      if (job.elapsedMs + retroNow() - began >= opts.budgetMs) { finish('time-limit'); break; }
      if (!current) {
        // Short searches retain breadth-first route discovery. Extended searches
        // use the graph-count distance as the primary guide so a deep, productive
        // branch is not trapped behind every shallow dead end.
        let nextIndex = 0;
        for (let i = 1; i < queue.length; i++) {
          const a = queue[i], b = queue[nextIndex];
          const closer = (a.priority || 0) < (b.priority || 0);
          // A small depth penalty keeps valid chain-lengthening transforms from
          // flooding an extended best-first search with increasingly deep branches.
          const aScore = (a.priority || 0) + a.chain.length;
          const bScore = (b.priority || 0) + b.chain.length;
          if (extended ? aScore < bScore || aScore === bScore && a.chain.length < b.chain.length
            : a.chain.length < b.chain.length || a.chain.length === b.chain.length && closer) nextIndex = i;
        }
        const node = queue.splice(nextIndex, 1)[0];
        if (!node) { finish('exhausted'); break; }
        if (expanded.has(node.key)) { attach(node, expanded.get(node.key)); continue; }
        if (job.expanded >= opts.maxNodes) { finish('node-limit'); break; }
        const graph = retroFromSmiles(node.smiles);
        current = { node, iterator: retroDisconnectSteps(graph, retroIds(graph), { protect: !opts.allowedProtectingGroups || opts.allowedProtectingGroups.length > 0, emitCandidates: !!opts.streamCandidates }), streamed: new Set() };
        job.expanded++;
      }
      const next = current.iterator.next();
      if (!next.done && next.value && next.value.phase === 'candidate') {
        // Managed one-step searches can accept a verified direct route before
        // unrelated disconnections finish. Every candidate still uses attach's
        // ordinary compatibility, inventory and forward-identity checks.
        current.streamed.add(next.value.candidate);
        attach(current.node, [next.value.candidate]);
        continue;
      }
      if (next.done) {
        const result = next.value || {};
        job.truncated = job.truncated || !!result.truncated;
        diagnostics.compatibility += (result.compatibilityRejected || []).length;
        (result.compatibilityRejected || []).forEach(record => {
          if (!diagnostics.rejected.some(r => r.reaction === record.reaction && r.target === record.target && r.code === record.code)) {
            if (diagnostics.rejected.length >= 12) diagnostics.rejected.pop();
            diagnostics.rejected.unshift(record);
          }
        });
        (result.forwardRejected || []).forEach(record => {
          if (diagnostics.rejected.length < 12 && !diagnostics.rejected.some(r => r.reaction === record.reaction && r.target === record.target && r.code === record.code)) diagnostics.rejected.push(record);
        });
        (result.protectionNeeds || []).forEach((need) => {
          diagnostics.protection++;
          if (diagnostics.protectionMessages.length < 4 && !diagnostics.protectionMessages.includes(need.reason)) diagnostics.protectionMessages.push(need.reason);
        });
        expanded.set(current.node.key, result.candidates || []);
        attach(current.node, (result.candidates || []).filter(candidate => !current.streamed.has(candidate)));
        current = null;
      }
    }
    job.elapsedMs += retroNow() - began;
    return job;
  };
  job.cancel = () => { if (job.status === 'running') { job.status = 'cancelled'; job.termination = 'cancelled'; rankRoutes(); } current = null; return job; };
  return job;
}

// Opt-in convergent search. Unlike the linear planner, an unavailable precursor
// is not an automatic rejection: it must become a solved child or remain a dead
// branch. A returned tree therefore has available leaves and verified reactions.
function pathFinderRecipeCreate(start, target, options, helpers) {
  const opts = Object.assign({}, options, { recipeTree: true, maxDepth: Math.min(8, options.maxDepth) });
  const diagnostics = { candidates: 0, inventory: 0, reagents: 0, rules: 0, stereo: 0, compatibility: 0, rejected: [], protection: 0, protectionMessages: opts.allowedProtectingGroups && !opts.allowedProtectingGroups.length ? ['Automatic protection planning is disabled.'] : [], noDisconnections: 0, depth: 0, branch: 0, missingMaterials: [] };
  const reject = (candidate, node, code, reason, kind) => {
    if (kind && Object.prototype.hasOwnProperty.call(diagnostics, kind)) diagnostics[kind]++;
    if (reason && diagnostics.rejected.length < 12 && !diagnostics.rejected.some(r => r.reaction === candidate.name && r.target === node.smiles && r.code === code)) {
      diagnostics.rejected.push({ reaction: candidate.name, target: node.smiles, code, reason });
    }
    return false;
  };
  const candidateFilter = (candidate, node) => {
    diagnostics.candidates++;
    if (helpers.ruleBlocked(candidate)) return reject(candidate, node, 'rule-filter', 'Excluded by the reaction filter.', 'rules');
    if (helpers.reagentBlocked(candidate)) return reject(candidate, node, 'reagent-filter', 'Excluded by the reagent or solvent filter.', 'reagents');
    if (candidate.pgSteps && opts.allowedProtectingGroups && !opts.allowedProtectingGroups.includes(candidate.protection && candidate.protection.id)) {
      const reason = opts.allowedProtectingGroups.length ? 'The required protecting group is excluded by the allowed protecting groups setting.' : 'Automatic protection planning is disabled.';
      if (!diagnostics.protectionMessages.includes(reason)) diagnostics.protectionMessages.push(reason);
      return reject(candidate, node, 'protection-filter', reason, 'protection');
    }
    if (candidate.stereo === 'mismatch' || candidate.stereo === 'racemic') return reject(candidate, node, 'stereo', 'The required stereochemistry is not preserved.', 'stereo');
    const product = candidate.product && helpers.structure(candidate.product.isomericSmiles || candidate.product.smiles);
    const sameProduct = product && (product.key === pathFinderKey(node.smiles) || typeof retroProductIdentity === 'function' &&
      retroProductIdentity(candidate.product.isomericSmiles || candidate.product.smiles) === retroProductIdentity(node.smiles));
    if (!sameProduct || !retroForwardCheck(candidate, node.smiles)) return reject(candidate, node, 'forward-verification', 'The generated inputs and conditions did not reproduce this tree node.', 'stereo');
    if (typeof routeStepAssessment === 'function') {
      const assessment = routeStepAssessment(candidate);
      if (assessment.blockers.length) {
        diagnostics.compatibility++;
        assessment.blockers.forEach(b => reject(candidate, node, b.code, b.message));
        return false;
      }
    }
    const preservationConflict = candidate.pgSteps ? null : pathFinderProtectionConflict(candidate);
    if (preservationConflict) {
      if (diagnostics.protectionMessages.length < 4 && !diagnostics.protectionMessages.includes(preservationConflict)) diagnostics.protectionMessages.push(preservationConflict);
      return reject(candidate, node, 'protection-survival', preservationConflict, 'protection');
    }
    const amineConflict = pathFinderAmineConflict(candidate);
    if (amineConflict) {
      if (diagnostics.protectionMessages.length < 4 && !diagnostics.protectionMessages.includes(amineConflict)) diagnostics.protectionMessages.push(amineConflict);
      return reject(candidate, node, 'amine-compatibility', amineConflict, 'protection');
    }
    return true;
  };
  const search = rsearchCreate(target.smiles, {
    maxDepth: opts.maxDepth, maxNodes: opts.maxNodes, maxBranch: Math.min(8, opts.maxBranch), maxRoutes: opts.maxRoutes,
    budgetMs: opts.budgetMs, sliceMs: opts.sliceMs, stockOverride: (smiles) => {
      const info = helpers.material(smiles);
      return info.available ? { tier: info.tier, source: info.tier === 0 ? 'inventory' : 'local-stock', smiles } : null;
    }, candidateFilter,
  });
  const job = { start: start.smiles, target: target.smiles, options: opts, status: 'running', route: [], routes: [], recipeTrees: [], expanded: 0, truncated: false, elapsedMs: 0, diagnostics, termination: '' };
  const sync = () => {
    job.expanded = search.expanded;
    job.elapsedMs = search.elapsedMs;
    job.truncated = !!search.truncated;
    job.recipeTrees = search.routes || [];
    job.routes = job.recipeTrees;
    if (search.status === 'running') job.status = 'running';
    else if (job.recipeTrees.length) job.status = 'found';
    else if (search.status === 'cancelled') job.status = 'cancelled';
    else if (search.status === 'budget') job.status = 'budget';
    else job.status = 'exhausted';
    if (search.status !== 'running') job.termination = search.status === 'done' ? 'exhausted' : search.status === 'budget' ? 'time-limit' : search.status;
    return job;
  };
  job.step = (sliceMs) => { if (search.status === 'running') search.step(sliceMs); return sync(); };
  job.cancel = () => { if (search.status === 'running') search.cancel(); return sync(); };
  return sync();
}

function pathFinderRecipeRender(container, job, deps) {
  const make = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = String(text); if (cls) el.className = cls; return el; };
  const name = (smiles) => { try { return retroViewName(smiles); } catch (error) { return smiles; } };
  const startKey = pathFinderKey(job.start);
  const renderNode = (node, isRoot) => {
    const item = make('li', undefined, isRoot ? 'path-recipe-target' : 'path-recipe-node');
    if (!node.candidate) {
      let starting = false;
      try { starting = pathFinderKey(node.target) === startKey; } catch (error) { /* Keep the generic available label. */ }
      item.append(make('span', (starting ? 'Starting material: ' : 'Available building block: ') + name(node.target), 'path-recipe-leaf'));
      item.append(make('code', node.target, 'path-smiles'));
      return item;
    }
    const c = node.candidate;
    item.append(make('h4', (isRoot ? 'Target: ' : 'Prepare intermediate: ') + name(node.target)));
    item.append(make('p', c.outcomeName || c.name, 'path-recipe-reaction'));
    item.append(make('code', node.target, 'path-smiles'));
    const labels = c.labels || {};
    item.append(make('p', 'Reagents and conditions: ' + ([labels.above, labels.below].filter(Boolean).join(' · ') || 'Not recorded.')));
    if (c.minor) item.append(make('p', 'The selected node is a minor predicted product.'));
    if (deps.openInLab) {
      const open = make('button', 'Open this reaction in Reactions', 'text-button'); open.type = 'button';
      open.addEventListener('click', () => deps.openInLab(c.compounds || [], c.conditions || {})); item.append(open);
    }
    if (node.children.length) {
      item.append(make('p', 'Required precursors — each is either available or prepared by its own verified branch:'));
      const children = make('ol', undefined, 'path-recipe-children');
      node.children.forEach(child => children.append(renderNode(child, false)));
      item.append(children);
    }
    return item;
  };
  container.replaceChildren();
  job.recipeTrees.forEach((tree, index) => {
    const leaves = new Map();
    const collect = (node) => {
      if (!node.candidate) {
        try { leaves.set(pathFinderMaterialKey(node.target), node.target); } catch (error) { leaves.set(node.target, node.target); }
      }
      (node.children || []).forEach(collect);
    };
    collect(tree);
    const metrics = tree.metrics || rsearchScore(tree), wrapper = make('section', undefined, 'path-route path-recipe');
    wrapper.append(make('h3', 'Recipe ' + (index + 1) + ' · ' + metrics.steps + ' reaction step' + (metrics.steps === 1 ? '' : 's') + ' · ' + leaves.size + ' available feedstock' + (leaves.size === 1 ? '' : 's')));
    wrapper.append(make('p', 'Read from the available leaves toward the target. Every reaction node is forward verified; intermediates are recipes, not assumed inventory.'));
    const root = make('ol', undefined, 'path-recipe-root'); root.append(renderNode(tree, true)); wrapper.append(root);
    container.append(wrapper);
  });
}

function pathFinderExplanation(job) {
  const d = job.diagnostics;
  const reasons = [];
  if (d.rules) reasons.push(d.rules + ' candidates excluded by reaction filters');
  if (d.reagents) reasons.push(d.reagents + ' candidates excluded by reagent/solvent filters');
  if (d.inventory) reasons.push(d.inventory + ' branches need unavailable building blocks');
  if (d.depth) reasons.push(d.depth + ' branches reached the step limit');
  if (d.stereo) reasons.push(d.stereo + ' candidates did not preserve the required structure or stereochemistry');
  if (d.compatibility) reasons.push(d.compatibility + ' candidate branches have unresolved substrate compatibility or selectivity conflicts');
  (d.rejected || []).slice(0, 4).forEach(r => reasons.push(r.reaction + ': ' + r.reason));
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
  // Older saved pages may not contain the selector yet; install it beside the
  // inventory policy without replacing the rest of the Path Finder markup.
  if (!get('path-recipe-tree') && get('path-stock-policy') && get('path-stock-policy').parentElement) {
    const label = element('label', 'Recipe tree'), select = element('select');
    label.htmlFor = 'path-recipe-tree'; select.id = 'path-recipe-tree';
    [['off', 'Off — linear routes only'], ['on', 'On — synthesize unavailable intermediates']].forEach(([id, text]) => {
      const option = element('option', text); option.value = id; select.append(option);
    });
    select.value = 'off'; label.append(select); get('path-stock-policy').parentElement.append(label);
  }
  const value = (id, fallback) => get(id) ? get(id).value : fallback;
  const updateLimits = () => {
    const limits = get('path-search-limits'), recipe = value('path-recipe-tree', 'off') === 'on';
    if (limits) limits.textContent = (Number(value('path-depth', 3)) > 5 ? 'Search is limited to 200 structures and 30 seconds.' : 'Search is limited to 60 structures and 12 seconds.') + (recipe ? ' Recipe depth is capped at 8 and applies to the longest branch.' : '');
  };
  get('path-depth').addEventListener('change', updateLimits);
  if (get('path-recipe-tree')) get('path-recipe-tree').addEventListener('change', updateLimits);
  updateLimits();
  const finish = () => {
    run.disabled = false; cancel.disabled = true;
    results.replaceChildren();
    const stats = ' ' + job.expanded + ' structures searched in ' + (job.elapsedMs / 1000).toFixed(1) + ' s.';
    const rejectionDetails = () => {
      const records = job.diagnostics.rejected || [];
      if (!records.length) return;
      const detail = element('details'), list = element('ul');
      detail.append(element('summary', 'Why candidate branches were rejected (up to 12 examples)'));
      records.forEach(r => list.append(element('li', r.reaction + ' · target ' + r.target + ': ' + r.reason)));
      detail.append(list); results.append(detail);
    };
    if (job.status === 'identical') { status.textContent = 'The endpoints describe the same structure; no reaction is needed.'; return; }
    if (!job.routes.length) {
      const empty = job.options.recipeTree ? 'No complete recipe tree found within these rules and limits.' : 'No route found within these rules and limits.';
      status.textContent = (job.status === 'cancelled' ? 'Search cancelled.' : empty) + stats + ' ' + pathFinderExplanation(job) + ' This does not establish that synthesis is impossible.';
      if (job.diagnostics.missingMaterials.length) results.append(element('p', 'Examples of unavailable building blocks in rejected branches (not required ingredients): ' + job.diagnostics.missingMaterials.map(name).join(', ')));
      rejectionDetails();
      return;
    }
    if (job.options.recipeTree) {
      status.textContent = job.recipeTrees.length + ' rule-verified recipe tree' + (job.recipeTrees.length === 1 ? '' : 's') + ' found.' + stats + ' Every leaf is available under the selected inventory policy; every intermediate has a forward-verified preparation.' + (job.status === 'cancelled' ? ' Search cancelled; partial results retained.' : '');
      pathFinderRecipeRender(results, job, deps); rejectionDetails(); return;
    }
    status.textContent = job.routes.length + ' rule-verified candidate route' + (job.routes.length === 1 ? '' : 's') + ' found.' + stats + ' Ranked by fewer steps, more common and simpler building blocks, fewer minor products, then fewer extra building blocks.' + (job.status === 'cancelled' ? ' Search cancelled; partial results retained.' : '');
    if (typeof routeComparisonRender === 'function') { routeComparisonRender(results, job, deps); rejectionDetails(); return; }
    job.routes.forEach((route, index) => {
      const wrapper = element('section', undefined, 'path-route');
      const rank = pathFinderRouteRank(route);
      wrapper.append(element('h3', 'Route ' + (index + 1) + ' · ' + rank[0] + ' step' + (rank[0] === 1 ? '' : 's') + ' · ' + rank[4] + ' additional building block' + (rank[4] === 1 ? '' : 's')));
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
      const managedProtectingGroups = String(value('path-managed-protection','')).trim();
      const create = managedProtectingGroups && typeof protectionProgramCreate === 'function' ? protectionProgramCreate : pathFinderCreate;
      job = create(a.isomericSmiles || a.smiles, b.isomericSmiles || b.smiles, {
        managedProtectingGroups,
        recipeTree: value('path-recipe-tree', 'off') === 'on',
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
      status.textContent = 'Searching supported transformations… ' + job.expanded + ' structures checked, ' + job.routes.length + (job.options.recipeTree ? ' candidate recipe trees' : ' candidate routes') + ' found. You can cancel at any time.';
      setTimeout(tick, 0);
    };
    setTimeout(tick, 0);
  });
  cancel.addEventListener('click', () => { if (job) { ++token; job.cancel(); finish(); } });
  [start, target].forEach((input) => input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !run.disabled) run.click(); }));
  get('path-example').addEventListener('click', () => { start.value = 'ethanol'; target.value = 'ethanal'; });
  if (get('path-cascade') && typeof createReactionCascade === 'function') createReactionCascade(get('path-cascade'),deps);
  if (get('path-benchmarks') && typeof createRouteBenchmarks === 'function') createRouteBenchmarks(get('path-benchmarks'),deps);
  return { show() { updateLimits(); start.focus(); } };
}


