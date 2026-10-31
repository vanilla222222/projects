// Compare route records using transparent counts. This does not estimate
// experimental feasibility, yield, cost, environmental impact or safety.
function routeComparisonKey(smiles) {
  return typeof moleculeIdentity === 'function' ? moleculeIdentity(smiles).key : pathFinderMaterialKey(smiles);
}

function routeComparisonName(smiles) {
  try { return typeof retroViewName === 'function' ? retroViewName(smiles) : smiles; }
  catch (error) { return smiles; }
}

function routeComparisonEvidence(candidate) {
  if (candidate.outcome && candidate.outcome.evidence) return candidate.outcome.evidence;
  if (typeof reactionRuleDescriptor === 'function') {
    return reactionRuleDescriptor(candidate.outcomeRule || candidate.rule || candidate.transform) || null;
  }
  return null;
}

function routeComparisonInventory(job) {
  const listed = new Set([routeComparisonKey(job.start)]);
  const options = job.options || {};
  (options.availableMaterials || []).forEach((text) => {
    try { listed.add(routeComparisonKey(reactionParseCompound(text).smiles)); } catch (error) { /* Invalid historical inventory is not available. */ }
  });
  return (smiles) => {
    let key;
    try { key = routeComparisonKey(smiles); } catch (error) { return 'Identity could not be checked'; }
    if (listed.has(key)) return 'Available in your list or starting material';
    if (options.stockPolicy === 'custom') return 'Not available in your list';
    if (typeof stockTier !== 'function') return 'Stock availability not checked';
    try {
      const stock = stockTier(smiles);
      if (stock && stock.tier <= 2 && stock.smiles && routeComparisonKey(stock.smiles) === key) return 'Local stock tier ' + stock.tier;
    } catch (error) { /* An unresolved stock identity is not a match. */ }
    return 'Not available under this inventory policy';
  };
}

function routeComparisonSummaries(job) {
  if (!job || !Array.isArray(job.routes) || job.routes.length > 5) throw new Error('Compare at most five routes from one search.');
  const startKey = routeComparisonKey(job.start), targetKey = routeComparisonKey(job.target);
  const availability = routeComparisonInventory(job);
  return job.routes.map((route, routeIndex) => {
    if (!Array.isArray(route) || !route.length || route.length > 20) throw new Error('Each compared route needs 1–20 steps.');
    if (routeComparisonKey(route[0].from) !== startKey || routeComparisonKey(route[route.length - 1].to) !== targetKey) throw new Error('Compared routes must have the same starting material and target.');
    route.slice(1).forEach((link, i) => {
      if (routeComparisonKey(route[i].to) !== routeComparisonKey(link.from)) throw new Error('A compared route has disconnected intermediates.');
    });
    const blocks = new Map(), reagents = new Map(), assumptions = new Set(), limitations = new Set();
    const material = (item, role) => {
      const smiles = item.isomericSmiles || item.smiles || '';
      const name = item.label || item.name || (smiles ? routeComparisonName(smiles) : item.id) || 'Unspecified material';
      let key = role + ':' + name;
      if (smiles) { try { key = role + ':' + routeComparisonKey(smiles); } catch (error) { key += ':' + smiles; } }
      return { key, smiles, name: String(name), role };
    };
    const steps = route.map((link, index) => {
      const candidate = link.candidate || {}, evidence = routeComparisonEvidence(candidate);
      const precursors = candidate.precursors || [];
      let carried = Number.isInteger(link.precursor) ? link.precursor : -1;
      if (carried < 0 || carried >= precursors.length) carried = precursors.findIndex((p) => {
        try { return routeComparisonKey(p.isomericSmiles || p.smiles) === routeComparisonKey(link.from); } catch (error) { return false; }
      });
      const extraBlocks = precursors.filter((p, j) => j !== carried).map((p) => {
        const entry = material(p, 'building block'); entry.availability = availability(entry.smiles); blocks.set(entry.key, entry); return entry;
      });
      const stepReagents = new Map();
      const addReagent = (item, role) => { const entry = material(item, role); stepReagents.set(entry.key, entry); reagents.set(entry.key, entry); };
      routePlanningOperations(candidate).forEach(operation=>{
        (operation.compounds||[]).filter(p=>p.role!=='reactant').forEach(p=>addReagent(p,p.role||'reagent'));
        (operation.reagents||[]).forEach(p=>addReagent(p,p.role||'reagent'));
        const conditions=operation.conditions||{};
        (conditions.additives||[]).forEach(id=>addReagent(typeof reactionAdditive==='function'&&reactionAdditive(id)||{id},'additive'));
        (conditions.solvents||[]).filter(id=>id!=='none').forEach(id=>addReagent(typeof reactionSolvent==='function'&&reactionSolvent(id)||{id},'solvent'));
      });
      const warnings = [...new Set([...(candidate.outcome && candidate.outcome.warnings || []), ...(candidate.warnings || [])].map(String))];
      const stereoKind = candidate.product && candidate.product.stereo && candidate.product.stereo.kind;
      const stereoConcern = ['racemic', 'mismatch'].includes(candidate.stereo) || ['racemic', 'diastereomers'].includes(stereoKind);
      const stereoWarnings = warnings.filter((text) => /stereo|racem|enantio|diastereom|E\/Z|cis|trans/i.test(text));
      (evidence && evidence.assumptions || []).forEach((text) => assumptions.add(String(text)));
      (evidence && evidence.limitations || []).forEach((text) => limitations.add(String(text)));
      const references = evidence && Array.isArray(evidence.references) ? evidence.references.filter((r) => r && /^https:\/\//.test(r.url || '')) : [];
      const planningFacts={gaps:routePlanningOperations(candidate).flatMap((operation,i)=>routePlanningStepFacts(operation).gaps.map(g=>({...g,operation:i+1})))};
      return {
        planningFacts,
        number: index + 1, link, candidate, name: candidate.outcomeName || candidate.name || 'Reaction step',
        from: link.from, to: link.to, extraBlocks, reagents: [...stepReagents.values()],
        inventoryRecorded: carried >= 0 && precursors.length > 0, evidence, references,
        scope: evidence && evidence.scope || 'No rule-specific scope was recorded for this step.',
        minor: !!candidate.minor, stereoConcern: stereoConcern || stereoWarnings.length > 0,
        stereo: candidate.stereo || stereoKind || 'Not reported', stereoWarnings, warnings,
      };
    });
    return {
      number: routeIndex + 1, route, steps, stepCount: steps.length,
      handoffs:typeof routeHandoffAssess==='function'?route.slice(1).map((link,i)=>routeHandoffAssess(route[i],link)):[],
      workups:typeof routeWorkupAssess==='function'?route.flatMap((link,i)=>{const ops=routePlanningOperations(link.candidate);return ops.map((op,j)=>({...routeWorkupAssess(ops.length===1?link:op),step:i+1,operation:j+1}));}):[],
      ranking:pathFinderRouteMetrics(route),
      scopeGaps:steps.flatMap(s=>s.planningFacts.gaps.map(g=>({step:s.number,...g}))),
      buildingBlocks: [...blocks.values()], reagents: [...reagents.values()],
      sourcedSteps: steps.filter((s) => s.references.length > 0).length,
      minorSteps: steps.filter((s) => s.minor).length,
      stereoConcernSteps: steps.filter((s) => s.stereoConcern).length,
      assumptions: [...assumptions], limitations: [...limitations],
      inventoryComplete: steps.every((s) => s.inventoryRecorded && s.extraBlocks.every((p) => !/Not available|not checked|could not/i.test(p.availability))),
    };
  });
}

function routeComparisonRender(container, job, deps) {
  const make = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = String(text); if (cls) el.className = cls; return el; };
  const summaries = routeComparisonSummaries(job);
  container.replaceChildren();
  const root = make('section', undefined, 'route-comparison');
  root.setAttribute('aria-label', 'Candidate route comparison');
  root.append(make('h3', 'Compare candidate routes'));
  root.append(make('p', 'Counts below are calculated from these route records; materials are counted once per role. Sources document reaction classes; they do not establish that a route works experimentally. No yield, feasibility or safety score is assigned. Path Finder orders routes by operations, protection operations, recorded scope gaps, stereo concerns, minor-product steps, extra building blocks, stock tiers, process-material entries and building-block size. Missing metadata counts as a gap; documentation length does not. These are planning criteria, not cost or experimental success predictions.', 'route-comparison-note'));
  const grid = make('div', undefined, 'route-comparison-grid');
  const addList = (parent, label, entries) => {
    parent.append(make('h5', label));
    if (!entries.length) { parent.append(make('p', 'None recorded.')); return; }
    const list = make('ul'); entries.forEach((text) => list.append(make('li', text))); parent.append(list);
  };
  summaries.forEach((summary) => {
    const card = make('article', undefined, 'route-comparison-card');
    card.append(make('h4', 'Route ' + summary.number));
    const metrics = make('table', undefined, 'route-comparison-metrics');
    const body = make('tbody');
    [['Operations counted for ranking', summary.ranking.steps], ['Protection operations', summary.ranking.protection], ['Recorded scope gaps', summary.ranking.scopeGaps], ['Steps', summary.stepCount], ['Distinct extra building blocks', summary.buildingBlocks.length], ['Distinct reagents / catalysts / solvents / additives', summary.reagents.length], ['Steps with reaction-class sources', summary.sourcedSteps + ' / ' + summary.stepCount], ['Minor-product steps', summary.minorSteps], ['Recorded stereo concerns used for ranking', summary.ranking.stereoConcerns]].forEach(([label, value]) => {
      const row = make('tr'), header = make('th', label); header.setAttribute('scope', 'row'); row.append(header, make('td', value)); body.append(row);
    });
    metrics.append(body); card.append(metrics);
    card.append(make('p', summary.inventoryComplete ? 'Additional building blocks match the search inventory policy.' : 'Additional building-block availability needs review.', 'route-comparison-inventory'));
    addList(card,'Endpoint work-up assumptions',summary.workups.filter(w=>w.required).map(w=>'Step '+w.step+(w.operation>1?', operation '+w.operation:'')+': '+w.record.status+'. '+w.message));
    addList(card,'Step boundaries (planning assumptions)',summary.handoffs.map((h,i)=>'Before step '+(i+2)+': '+h.message+' '+h.potentials.map(p=>'If carried over: '+p.message).join(' ')));
    addList(card, 'Additional building blocks', summary.buildingBlocks.map((p) => p.name + ' — ' + p.availability));
    addList(card, 'Other required materials', summary.reagents.map((p) => p.name + ' (' + p.role + ')'));
    if (typeof protectionRouteAudit === 'function' && typeof protectionRouteElement === 'function') card.append(protectionRouteElement(protectionRouteAudit(summary.route)));
    addList(card, 'Recorded ranking gaps', summary.scopeGaps.map(g=>'Step '+g.step+(g.operation>1?', operation '+g.operation:'')+': '+g.message));
    const assumptions = make('details', undefined, 'route-comparison-assumptions');
    assumptions.append(make('summary', 'Assumptions and limitations requiring review'));
    addList(assumptions, 'Assumptions', summary.assumptions);
    addList(assumptions, 'Limitations', summary.limitations);
    if (summary.sourcedSteps < summary.stepCount) assumptions.append(make('p', 'Some steps have no linked reaction-class source.'));
    card.append(assumptions);
    if (deps.saveRoute) {
      const save = make('button', 'Save route ' + summary.number + ' to workspace', 'text-button'); save.type = 'button';
      save.addEventListener('click', () => deps.saveRoute({ version: 1, start: job.start, target: job.target, steps: summary.route, options: job.options, createdAt: new Date().toISOString() })); card.append(save);
    }
    summary.steps.forEach((step) => {
      const detail = make('details', undefined, 'route-comparison-step');
      detail.append(make('summary', step.number + '. ' + step.name + (step.minor ? ' · minor predicted product' : '')));
      detail.append(make('p', routeComparisonName(step.from) + ' → ' + routeComparisonName(step.to)));
      detail.append(make('code', step.from + ' → ' + step.to, 'route-comparison-smiles'));
      if (deps.thumbnail) {
        const preview = make('div', undefined, 'route-comparison-structures');
        preview.append(deps.thumbnail(retroFromSmiles(step.from)), make('span', '→'), deps.thumbnail(retroFromSmiles(step.to))); detail.append(preview);
      }
      const labels = step.candidate.labels || {};
      detail.append(make('p', 'Conditions: ' + ([labels.above, labels.below].filter(Boolean).join(' · ') || 'Not recorded.')));
      detail.append(make('p', 'Scope: ' + step.scope));
      if (typeof reactionScopeAssess === 'function' && typeof reactionScopeElement === 'function') detail.append(reactionScopeElement(reactionScopeAssess(step.candidate.compounds || [],step.candidate.conditions || {},step.candidate.outcome)));
      if (typeof routeStepAssessment === 'function') {
        const audit = routeStepAssessment(step.candidate);
        detail.append(make('p', 'Substrate review: ' + (audit.blockers.length ? audit.blockers.map(b => b.message).join(' ') : 'No encoded compatibility conflict.')));
        addList(detail, 'Compatibility limits', audit.warnings);
      }
      if (typeof reactionAtomMapping === 'function' && typeof reactionMappingElement === 'function') {
        // Compute on first inspection, rather than spending search time mapping
        // every candidate or blocking first render of a long route.
        const holder = make('div'); detail.append(holder);
        detail.addEventListener('toggle', () => {
          if (!detail.open || holder.childNodes.length) return;
          holder.append(reactionMappingElement(reactionAtomMapping(step.candidate.compounds || [], step.to)));
        });
      }
      if (step.link && step.link.candidate && step.link.candidate.planning) {
        const plan = step.link.candidate.planning;
        detail.append(make('p', 'Protection plan: ' + plan.kind + (plan.group ? ' · ' + plan.group : '') + '. ' + plan.reason));
      }
      detail.append(make('p', 'Stereochemistry: ' + step.stereo + '. Unreported concerns are not evidence of experimental selectivity.'));
      addList(detail, 'Step warnings', step.warnings);
      if (step.candidate.outcome && step.candidate.outcome.protectionAssessment && typeof protectionAssessmentElement === 'function') detail.append(protectionAssessmentElement(step.candidate.outcome.protectionAssessment));
      if (step.evidence && typeof reactionEvidenceElement === 'function') detail.append(reactionEvidenceElement(step.evidence, true));
      else detail.append(make('p', 'Evidence details are unavailable for this step.'));
      if (deps.openInLab) {
        const open = make('button', 'Open step ' + step.number + ' in Reactions', 'text-button'); open.type = 'button';
        open.addEventListener('click', () => deps.openInLab(step.candidate.compounds || [], step.candidate.conditions || {})); detail.append(open);
      }
      card.append(detail);
    });
    grid.append(card);
  });
  root.append(grid); container.append(root);
  return summaries;
}
