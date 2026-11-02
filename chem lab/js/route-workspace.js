const ROUTE_WORKSPACE_LIMITS = { routes: 30, steps: 20, importBytes: 1000000 };
const ROUTE_WORKSPACE_STORAGE = 'chemgraph.route-workspace.v1';

// Boundary records describe planning assumptions, not isolation or purity proof.
function routeHandoffNormalize(raw,flags) {
  const f=flags||{},carry=f.onePot===true||f.freshMixture===false;
  if(raw!==undefined&&raw!==null&&(typeof raw!=='object'||Array.isArray(raw)))throw new Error('Handoff must be an object.');
  const r=raw||{},mode=r.mode===undefined?(carry?'carryover':'isolated'):r.mode;
  if(!['isolated','carryover'].includes(mode))throw new Error('Unknown handoff mode.');
  if((mode==='isolated'&&carry)||(mode==='carryover'&&f.freshMixture===true))throw new Error('Conflicting fresh-mixture and carryover records.');
  return {mode,basis:r.basis==='model-assumption'||(!raw&&f.freshMixture!==true&&!carry)?'model-assumption':'recorded-plan'};
}

function routeWorkupNormalize(raw) {
  if(raw!==undefined&&raw!==null&&(typeof raw!=='object'||Array.isArray(raw)))throw new Error('Work-up must be an object.');
  const r=raw||{},status=r.status===undefined?'assumed':r.status;
  if(r.notes!==undefined&&typeof r.notes!=='string')throw new Error('Work-up notes must be text.');
  if(!['assumed','recorded','none'].includes(status))throw new Error('Unknown work-up status.');
  const notes=typeof r.notes==='string'?r.notes.slice(0,800):'';
  if(status==='recorded'&&!notes.trim())throw new Error('A recorded work-up needs a description; the model does not validate its procedure.');
  return {status,notes};
}

function routeWorkupAssess(step,checked) {
  const s=step.candidate||step,id=(checked&&checked.outcome&&checked.outcome.id)||(s.outcome&&s.outcome.id)||s.outcomeId||s.ruleId;
  const record=routeWorkupNormalize(step.workup||s.workup),required=['grignard','grignard-carboxylation','grignard-nitrile','reduction-lialh4','dibal'].includes(id);
  const blockers=required&&record.status==='none'?[{code:'endpoint-workup',message:'The '+id+' neutral endpoint includes a separate protonating/hydrolytic work-up assumption. Recording no work-up does not establish that endpoint.'}]:[];
  return {record,required,blockers,message:required?'The neutral endpoint includes a separate work-up assumption; a note is not experimental validation.':'No additional work-up requirement is encoded for this reaction class; absence of a flag does not establish that work-up is unnecessary.'};
}

function routeHandoffAssess(previous,next) {
  const a=previous.candidate||previous,b=next.candidate||next;
  const record=routeHandoffNormalize(next.handoff||b.handoff,{freshMixture:next.freshMixture===undefined?b.freshMixture:next.freshMixture,onePot:next.onePot||b.onePot});
  const blockers=record.mode==='carryover'?[{code:'unsupported-carryover',message:'Only the selected product is represented at the next step. Carry-over mixture composition, work-up and one-pot compatibility are not modeled.'}]:[];
  const potentials=[],warnings=[];
  try{
    const context=s=>reactionContext((s.compounds||[...(s.precursors||[]),...(s.reagents||[])]).map(c=>({...c,fragment:c.fragment||smilesToFragment(c.isomericSmiles||c.smiles)})),s.conditions||{});
    const before=context(a),after=context(b),any=(c,tags)=>tags.some(t=>c.has(t));
    const sensitive=['grignard','alanate','hydride','amideBase'],oxidants=['permanganate','jones','pcc','dmp','mcpba','ozone'],reducers=['alanate','borohydride','H2','grignard'];
    if(any(before,sensitive)&&(after.protic||any(after,['H2O','strongAcid'])))potentials.push({code:'reactive-reagent-to-protic-stage',message:'Prior moisture/proton-sensitive reagents could meet a protic or acidic next stage if retained.'});
    if((before.protic||any(before,['H2O','strongAcid']))&&any(after,sensitive))potentials.push({code:'protic-carryover',message:'Prior protic medium or acid could consume sensitive reagents in the next stage if retained.'});
    if((any(before,oxidants)&&any(after,reducers))||(any(before,reducers)&&any(after,oxidants)))potentials.push({code:'oxidant-reductant-carryover',message:'Recorded oxidizing and reducing inputs could conflict across this boundary if retained.'});
  }catch(error){warnings.push('Potential carry-over chemistry could not be assessed from these records.');}
  return {record,status:blockers.length?'blocked':'assumed-separated',blockers,potentials,warnings,
    message:record.mode==='isolated'?'Separate preparation of a fresh mixture is assumed. Isolation, purity and removal of prior inputs are not established.':'A one-pot/carry-over sequence cannot be verified by independent step replay.'};
}

function routeWorkspaceKey(smiles) {
  if (typeof moleculeIdentity === 'function') return moleculeIdentity(smiles).key;
  const graph = reactionFragmentGraph(smilesToFragment(smiles));
  const props = reactionGraphProperties(graph);
  return props.isomericSmiles || props.smiles;
}

function routeWorkspaceProductKey(smiles) {
  if (typeof moleculeIdentityGraph !== 'function' || typeof rxNeighbors !== 'function') return routeWorkspaceKey(smiles);
  const g = moleculeIdentityGraph(smiles);
  // Nitration emits neutral N(=O)=O while saved targets may use the equivalent
  // charge-separated nitro depiction. Normalize only that group and retain the
  // full stereochemical key; stock and route-continuity identity stay strict.
  g.atoms.filter((a) => a.element === 'N').forEach((n) => {
    const neighbors = rxNeighbors(g, n.id), oxygens = neighbors.filter((x) => x.atom.element === 'O' && rxNeighbors(g, x.atom.id).length === 1);
    if (neighbors.length !== 3 || oxygens.length !== 2 || !neighbors.some((x) => x.atom.element === 'C')) return;
    n.charge = 0;
    oxygens.forEach((x) => { x.atom.charge = 0; g.getBond(n.id, x.atom.id).order = 2; });
  });
  return moleculeIdentity(g).key;
}

function routeWorkspaceSmiles(value) {
  if (typeof value !== 'string' || value.length > 5000 || !value.trim()) throw new Error('Every structure needs a valid name or SMILES.');
  const parsed = reactionParseCompound(value.trim());
  return reactionIsomericSmiles(parsed.fragment, parsed.smiles);
}

function routeWorkspaceNormalize(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.steps) || raw.steps.length > ROUTE_WORKSPACE_LIMITS.steps) throw new Error('A route must contain at most ' + ROUTE_WORKSPACE_LIMITS.steps + ' steps.');
  if (raw.version !== undefined && raw.version !== 1) throw new Error('Unsupported route version.');
  const roles = ['reactant', 'reagent', 'catalyst', 'solvent'];
  const steps = raw.steps.map((link, index) => {
    if (!link || typeof link !== 'object') throw new Error('Invalid route step ' + (index + 1) + '.');
    const source = link.candidate || link;
    const compounds = source.compounds;
    if (!Array.isArray(compounds) || !compounds.length || compounds.length > REACTION_LIMITS.maxCompounds) throw new Error('Step ' + (index + 1) + ' needs 1–' + REACTION_LIMITS.maxCompounds + ' compounds.');
    const rawYield = link.yield !== undefined ? link.yield : source.yield;
    if (rawYield !== undefined && rawYield !== null && rawYield !== '' && (!Number.isFinite(Number(rawYield)) || Number(rawYield) < 0 || Number(rawYield) > 100)) throw new Error('Step ' + (index + 1) + ' yield must be between 0 and 100%.');
    return {
      handoff: index?routeHandoffNormalize(link.handoff||source.handoff,{freshMixture:link.freshMixture===undefined?source.freshMixture:link.freshMixture,onePot:raw.onePot||link.onePot||source.onePot}):null,
      workup:routeWorkupNormalize(link.workup||source.workup),
      fromState:reactionMaterialStateNormalize(link.fromState||source.fromState),
      toState:reactionMaterialStateNormalize(link.toState||source.toState),
      from: routeWorkspaceSmiles(link.from),
      to: routeWorkspaceSmiles(link.to),
      name: String(source.outcomeName || source.name || 'Reaction step').slice(0, 120),
      ruleId: String(source.outcomeId || source.ruleId || source.id || '').slice(0, 100),
      yield: rawYield === undefined || rawYield === null || rawYield === '' ? null : Number(rawYield),
      planning: source.planning && ['protect', 'reaction', 'deprotect'].includes(source.planning.kind) ? { kind: source.planning.kind, group: String(source.planning.group || '').slice(0, 80), groupId: String(source.planning.groupId || '').slice(0, 80), reason: String(source.planning.reason || '').slice(0, 800) } : null,
      compounds: compounds.map((c) => {
        if (!c || !roles.includes(c.role)) throw new Error('Step ' + (index + 1) + ' has an invalid compound role.');
        const equiv = c.equiv === undefined || c.equiv === null || String(c.equiv).trim() === '' ? '1' : String(c.equiv).slice(0, 20);
        if (!reactionParseAmount(equiv)) throw new Error('Step ' + (index + 1) + ' has an invalid compound amount or equivalents value.');
        return { smiles: routeWorkspaceSmiles(c.isomericSmiles || c.smiles), role: c.role, equiv, label: String(c.label || '').slice(0, 80), materialState:reactionMaterialStateNormalize(c.materialState) };
      }),
      conditions: normalizeReactionConditions(source.conditions || {}),
    };
  });
  return {
    version: 1,
    id: String(raw.id || 'route-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)).slice(0, 100),
    name: String(raw.name || 'Untitled route').slice(0, 120),
    start: routeWorkspaceSmiles(raw.start || (steps[0] && steps[0].from)),
    target: routeWorkspaceSmiles(raw.target || (steps.length && steps[steps.length - 1].to)),
    researchProtocol:(raw.researchProtocol||raw.options?.research)&&typeof planningSettingsNormalize==='function'?planningSettingsNormalize(raw.researchProtocol||raw.options.research):null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt.slice(0, 40) : new Date().toISOString(),
    steps,
  };
}

function routeWorkspaceCompounds(step) {
  return step.compounds.map((c) => {
    const fragment = smilesToFragment(c.smiles);
    const info = reactionDescribeFragment(fragment);
    return Object.assign({}, c, { input: c.smiles, fragment, name: info.name, formula: info.formula, mass: info.mass });
  });
}

function routeWorkspaceValidateStep(step) {
  try {
    const from = routeWorkspaceKey(step.from);
    const target = routeWorkspaceProductKey(step.to);
    const compounds = routeWorkspaceCompounds(step);
    if (!compounds.some((c) => c.role === 'reactant' && routeWorkspaceKey(c.smiles) === from)) return { status: 'invalid', message: 'The starting intermediate is missing from this step’s reactants.' };
    const prediction = predictReaction(compounds, normalizeReactionConditions(step.conditions));
    const outcomes = [prediction.best].concat(prediction.alternatives || []).filter(Boolean);
    const outcome = outcomes.find((o) => (!step.ruleId || o.id === step.ruleId) && (o.products || []).concat(o.minor || []).some((p) => {
      try { return routeWorkspaceProductKey(p.isomericSmiles || p.smiles) === target; } catch (error) { return false; }
    }));
    if(outcome&&typeof rxsStereoTargetConflict==='function'){
      const selected=(outcome.products||[]).concat(outcome.minor||[]).find(p=>routeWorkspaceProductKey(p.isomericSmiles||p.smiles)===target);
      const conflict=rxsStereoTargetConflict(selected,step.to);
      if(conflict)return {status:'unverified',message:conflict,ruleId:outcome.id,outcome};
    }
    if (outcome && outcome.partialConversion) return {status:'unverified',message:'This is a one-site partial-conversion alternative; selective preparation is not established by the current rules.',ruleId:outcome.id,outcome};
    if (outcome && typeof routeStepAssessment === 'function') {
      const assessment = routeStepAssessment({outcome,compounds,conditions:step.conditions});
      if (assessment.blockers.length) return {status:'unverified',message:assessment.blockers.map(b=>b.message).join(' '),ruleId:outcome.id,outcome,assessment};
    }
    if (outcome && typeof reactionScopeAssess === 'function') {
      const scope = reactionScopeAssess(compounds,step.conditions,outcome);
      if (scope.status === 'conflict') return {status:'unverified',message:scope.reasons.filter(r=>r.level==='conflict').map(r=>r.message).join(' ')||'Condition/substrate scope conflict.',ruleId:outcome.id,outcome,scope};
    }
    if(outcome){const workup=routeWorkupAssess(step,{outcome});if(workup.blockers.length)return {status:'unverified',message:workup.blockers.map(b=>b.message).join(' '),outcome,workup};}
    return outcome ? { status: 'verified', message: 'Target reproduced by ' + outcome.name + ' in the current rule model.', ruleId: outcome.id, outcome, compounds }
      : { status: 'unverified', message: 'The current rules did not reproduce the selected target with these inputs and conditions.' };
  } catch (error) { return { status: 'invalid', message: error.message }; }
}

function routeWorkspaceValidate(route) {
  const steps = route.steps.map(step=>{
    const checked=routeWorkspaceValidateStep(step);
    try{
      checked.workup=routeWorkupAssess(step,checked);
      if(checked.workup.blockers.length&&checked.status==='verified'){checked.status='unverified';checked.message=checked.workup.blockers.map(b=>b.message).join(' ');}
    }catch(error){checked.status='invalid';checked.message=error.message;}
    return checked;
  });
  const handoffs=route.steps.slice(1).map((step,i)=>{
    try{return {...routeHandoffAssess(route.steps[i],{...step,onePot:route.onePot||step.onePot}),beforeStep:i+2};}
    catch(error){return {status:'blocked',beforeStep:i+2,blockers:[{code:'invalid-handoff',message:error.message}],potentials:[],warnings:[],message:error.message};}
  });
  const issues = [];
  const same = (a, b) => { try { return routeWorkspaceKey(a) === routeWorkspaceKey(b); } catch (error) { return false; } };
  if (!route.steps.length) {
    if (!same(route.start, route.target)) issues.push('The route has no steps between its different endpoints.');
  } else {
    if (!same(route.start, route.steps[0].from)) issues.push('The first step does not begin at the route’s starting material.');
    route.steps.slice(1).forEach((step, i) => { if (!same(route.steps[i].to, step.from)) issues.push('Steps ' + (i + 1) + ' and ' + (i + 2) + ' are disconnected.'); });
    if (!same(route.target, route.steps[route.steps.length - 1].to)) issues.push('The last step does not reach the route’s target.');
  }
  return { status: issues.length || steps.some((s) => s.status === 'invalid') ? 'invalid' : steps.some((s) => s.status !== 'verified')||handoffs.some(h=>h.status==='blocked') ? 'unverified' : 'verified', issues, steps, handoffs };
}

function routeWorkspaceOutcomeProduct(step, outcome) {
  if (!outcome) return null;
  const target = routeWorkspaceProductKey(step.to);
  const match = (p) => {
    try { return routeWorkspaceProductKey(p.isomericSmiles || p.smiles) === target; }
    catch (error) { return false; }
  };
  const major = (outcome.products || []).find(match);
  if (major) return { product: major, minor: false };
  const minor = (outcome.minor || []).find(match);
  return minor ? { product: minor, minor: true } : null;
}

function routeWorkspaceStepYield(step, checked) {
  if (Number.isFinite(step.yield)) return Math.max(0, Math.min(100, step.yield));
  if(checked&&checked.status!=='verified')return null;
  const outcome = checked && checked.outcome;
  const selected = routeWorkspaceOutcomeProduct(step, outcome);
  if (!selected) return null;
  const ratio = outcome.ratio && outcome.minor && outcome.minor.length === 1 ? outcome.ratio : null;
  const selectivity = ratio ? ratio[selected.minor ? 1 : 0] : 100;
  const conversion = outcome.stoichiometry && Number.isFinite(outcome.stoichiometry.conversion) ? Math.min(1, outcome.stoichiometry.conversion) : 1;
  return Math.max(0, Math.min(100, Math.round(selectivity * conversion)));
}

function routeWorkspaceYield(route, report) {
  const checked = report || routeWorkspaceValidate(route);
  if (checked.status !== 'verified' || !route.steps.length) return null;
  const yields = route.steps.map((step, i) => routeWorkspaceStepYield(step, checked.steps[i]));
  return yields.some((value) => !Number.isFinite(value)) ? null : reactionRouteYield(yields.map((value) => ({ yield: value })));
}

function routeWorkspaceAmountMg(amount, unit) {
  if ((typeof amount === 'string' && !amount.trim()) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('Enter a positive scale amount.');
  const normalized = String(unit || '').toLowerCase().replace('μ', 'µ');
  if (!['g', 'mg', 'µg', 'ug'].includes(normalized)) throw new Error('Choose g, mg, or µg.');
  const factor = normalized === 'g' ? 1000 : normalized === 'mg' ? 1 : 0.001;
  const mg = Number(amount) * factor;
  if (!Number.isFinite(mg) || mg <= 0) throw new Error('The scale amount is outside the supported numeric range.');
  return mg;
}

function routeWorkspaceScaleBases(route) {
  const bases = [{ id: 'product', kind: 'product', label: 'Final product: ' + route.target }];
  route.steps.forEach((step, stepIndex) => step.compounds.forEach((compound, compoundIndex) => {
    if (compound.role === 'reactant') bases.push({ id: 'reactant:' + stepIndex + ':' + compoundIndex, kind: 'reactant', stepIndex, compoundIndex, label: 'Step ' + (stepIndex + 1) + ' reactant: ' + (compound.label || compound.smiles) });
  }));
  return bases;
}

function routeWorkspaceStepCalculation(route, index, scaleMmol, report) {
  const step = route.steps[index], checked = report.steps[index];
  if (!checked || checked.status !== 'verified' || !checked.compounds) throw new Error('Scale planning requires every route step to be verified.');
  if (!Number.isFinite(scaleMmol) || scaleMmol <= 0) throw new Error('The calculated route scale is not positive and finite.');
  const yieldPct = routeWorkspaceStepYield(step, checked);
  const selected = routeWorkspaceOutcomeProduct(step, checked.outcome);
  if (!Number.isFinite(yieldPct) || !selected) throw new Error('Step ' + (index + 1) + ' has no usable yield estimate.');
  const rows = reactionMaterialRows(checked.compounds, step.conditions, scaleMmol);
  const outcome = checked.outcome;
  const needs = outcome.stoichiometry ? outcome.stoichiometry.rows : (outcome.consumes || []).filter((x) => x && x.compound && x.need > 0 && x.compound.role !== 'solvent' && x.compound.role !== 'catalyst');
  const carriedRow = rows.find((row) => row.role === 'reactant' && routeWorkspaceKey(row.compound.smiles) === routeWorkspaceKey(step.from));
  const base = needs[0];
  const baseRow = base ? rows.find((row) => row.compound === base.compound) : carriedRow;
  const baseNeed = base ? base.need : 1;
  const productMmol = baseRow && baseNeed > 0 && baseRow.mmol !== null ? baseRow.mmol * (selected.product.count || 1) / baseNeed * yieldPct / 100 : null;
  const productMw = reactionProductMass(step.to);
  if (!Number.isFinite(productMmol) || !carriedRow || !Number.isFinite(carriedRow.mmol) || carriedRow.mmol <= 0 || !Number.isFinite(productMw) || productMw <= 0) throw new Error('Step ' + (index + 1) + ' does not have enough stoichiometry or molecular-mass data for route scaling.');
  return { scaleMmol, yield: yieldPct, productMmol, productMg: productMmol * productMw, carriedMmol: carriedRow.mmol, rows };
}

function routeWorkspaceScalePlan(route, basisId, amount, unit, report) {
  const checked = report || routeWorkspaceValidate(route);
  if (checked.status !== 'verified' || !route.steps.length) throw new Error('Scale planning requires a non-empty route with every step verified.');
  const basis = routeWorkspaceScaleBases(route).find((item) => item.id === basisId);
  if (!basis) throw new Error('Choose a final product or step reactant as the scale basis.');
  const amountMg = routeWorkspaceAmountMg(amount, unit);
  const calculations = new Array(route.steps.length);
  const close = (actual, expected) => Math.abs(actual - expected) <= Math.max(1e-12, Math.abs(expected) * 1e-7);
  const calculate = (index, scale) => routeWorkspaceStepCalculation(route, index, scale, checked);
  const setProductDriven = (index, requiredProductMmol) => {
    const unitStep = calculate(index, 1);
    if (unitStep.productMmol <= 0) throw new Error('A zero-yield step cannot produce a positive product target.');
    const scaled = calculate(index, requiredProductMmol / unitStep.productMmol);
    if (!close(scaled.productMmol, requiredProductMmol)) throw new Error('Fixed-amount inputs in step ' + (index + 1) + ' prevent proportional route scaling; use equivalents instead.');
    calculations[index] = scaled;
  };
  if (basis.kind === 'product') {
    const productMw = reactionProductMass(route.target);
    if (!Number.isFinite(productMw) || productMw <= 0) throw new Error('The final product has no usable molecular mass.');
    let required = amountMg / productMw;
    for (let i = route.steps.length - 1; i >= 0; i -= 1) {
      setProductDriven(i, required);
      required = calculations[i].carriedMmol;
    }
  } else {
    const compound = route.steps[basis.stepIndex].compounds[basis.compoundIndex];
    const basisMw = reactionProductMass(compound.smiles);
    if (!Number.isFinite(basisMw) || basisMw <= 0) throw new Error('The selected reactant has no usable molecular mass.');
    const basisMmol = amountMg / basisMw;
    const unitBasis = calculate(basis.stepIndex, 1);
    const basisRow = unitBasis.rows[basis.compoundIndex];
    if (!basisRow || !Number.isFinite(basisRow.mmol) || basisRow.mmol <= 0) throw new Error('The selected reactant has no scalable amount.');
    calculations[basis.stepIndex] = calculate(basis.stepIndex, basisMmol / basisRow.mmol);
    if (!close(calculations[basis.stepIndex].rows[basis.compoundIndex].mmol, basisMmol)) throw new Error('This reactant uses a fixed amount rather than equivalents and cannot be used as a proportional scale basis.');
    for (let i = basis.stepIndex - 1; i >= 0; i -= 1) setProductDriven(i, calculations[i + 1].carriedMmol);
    for (let i = basis.stepIndex + 1; i < route.steps.length; i += 1) {
      const requiredCarried = calculations[i - 1].productMmol;
      const unitStep = calculate(i, 1);
      const scaled = calculate(i, requiredCarried / unitStep.carriedMmol);
      if (!close(scaled.carriedMmol, requiredCarried)) throw new Error('Fixed-amount inputs in step ' + (i + 1) + ' prevent proportional route scaling; use equivalents instead.');
      calculations[i] = scaled;
    }
  }
  const finalStep = calculations[calculations.length - 1];
  return { basis, amountMg, overallYield: routeWorkspaceYield(route, checked), startingMmol: calculations[0].carriedMmol, finalProductMmol: finalStep.productMmol, finalProductMg: finalStep.productMg, steps: calculations };
}

function routeWorkspaceQuantityText(value, unit) {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const text = abs >= 100 ? String(Number(value.toFixed(1))) : abs >= 1 ? value.toFixed(2) : String(Number(value.toPrecision(3)));
  return text + (unit ? ' ' + unit : '');
}

function routeWorkspaceMassText(mg) {
  if (!Number.isFinite(mg)) return '—';
  if (Math.abs(mg) >= 1000) return routeWorkspaceQuantityText(mg / 1000, 'g');
  if (Math.abs(mg) >= 1) return routeWorkspaceQuantityText(mg, 'mg');
  return routeWorkspaceQuantityText(mg * 1000, 'µg');
}

function routeWorkspaceStockInfo(smiles) {
  if (!smiles || typeof stockTier !== 'function') return { tier: null, source: '', label: 'Availability not checked', review: true };
  try {
    const info = stockTier(smiles);
    if (!info) return { tier: null, source: '', label: 'Not listed; verify availability', review: true };
    const source = info.source === 'user' ? 'User stock' : info.source === 'builtin' ? 'Built-in stock' : 'Name-only match';
    return { tier: info.tier, source: info.source, name: info.name || '', label: source + ' · tier ' + info.tier + (info.tier > 2 ? '; verify availability' : ''), review: info.tier > 2 };
  } catch (error) {
    return { tier: null, source: '', label: 'Availability could not be checked', review: true };
  }
}

function routeWorkspaceRowSmiles(row, step) {
  if (row.compound && row.compound.smiles) return row.compound.smiles;
  if (row.role === 'solvent' && typeof REACTION_SOLVENTS !== 'undefined') {
    const ids = step && step.conditions ? step.conditions.solvents : [];
    const match = REACTION_SOLVENTS.find((item) => item.smiles && item.name === row.name && ids.includes(item.id));
    return match ? match.smiles : '';
  }
  return '';
}

function routeWorkspaceAggregateMaterials(route, stepRows) {
  const intermediates = new Set(route.steps.slice(0, -1).map((step) => routeWorkspaceKey(step.to)));
  const groups = new Map();
  (stepRows || []).forEach((rows, stepIndex) => (rows || []).forEach((row) => {
    const smiles = routeWorkspaceRowSmiles(row, route.steps[stepIndex]);
    let structureKey = '';
    try { structureKey = smiles ? routeWorkspaceKey(smiles) : ''; } catch (error) { /* Keep an unresolved material separate by its displayed label. */ }
    if (structureKey && intermediates.has(structureKey)) return;
    const name = String(row.name || (row.compound && row.compound.smiles) || 'Unspecified material');
    const key = structureKey ? 'structure:' + structureKey : 'label:' + row.role + ':' + name;
    if (!groups.has(key)) {
      const stock = routeWorkspaceStockInfo(smiles);
      groups.set(key, { name, smiles, stockTier: stock.tier, stockSource: stock.source, stockLabel: stock.label, stockReview: stock.review, roles: new Set(), steps: new Set(), hazards: new Set(), mmol: 0, mg: 0, mL: 0, mmolKnown: false, mgKnown: false, mLKnown: false, mmolIncomplete: false, mgIncomplete: false, mLIncomplete: false });
    }
    const entry = groups.get(key);
    entry.roles.add(row.role || 'material');
    entry.steps.add(stepIndex + 1);
    (row.hazard || []).forEach((code) => entry.hazards.add(String(code)));
    ['mmol', 'mg', 'mL'].forEach((field) => {
      if (Number.isFinite(row[field])) { entry[field] += row[field]; entry[field + 'Known'] = true; }
      else entry[field + 'Incomplete'] = true;
    });
  }));
  return [...groups.values()].map((entry) => Object.assign(entry, {
    roles: [...entry.roles], steps: [...entry.steps], hazards: [...entry.hazards].sort(),
    mmol: entry.mmolKnown ? entry.mmol : null, mg: entry.mgKnown ? entry.mg : null, mL: entry.mLKnown ? entry.mL : null,
  })).sort((a, b) => a.name.localeCompare(b.name));
}

function routeWorkspaceComparison(routes, targetSmiles) {
  const target = routeWorkspaceProductKey(targetSmiles);
  return (routes || []).filter((route) => {
    try { return routeWorkspaceProductKey(route.target) === target; } catch (error) { return false; }
  }).map((route) => {
    const report = routeWorkspaceValidate(route);
    const materials = report.status === 'verified' ? routeWorkspaceAggregateMaterials(route, report.steps.map((checked, index) => reactionMaterialRows(checked.compounds, route.steps[index].conditions, 1))) : [];
    return {
      id: route.id, name: route.name, start: route.start, target: route.target, status: report.status,
      overallYield: routeWorkspaceYield(route, report), stepCount: route.steps.length,
      protectionSteps: route.steps.filter((step) => step.planning && ['protect', 'deprotect'].includes(step.planning.kind)).length,
      materialCount: materials.length,
      stockRecognized: materials.filter((entry) => Number.isFinite(entry.stockTier) && entry.stockTier <= 2).length,
      stockReview: materials.filter((entry) => entry.stockReview).length,
      hazardMaterials: materials.filter((entry) => entry.hazards.length).length,
    };
  });
}

function routeWorkspaceAggregateAmount(entry, field, unit) {
  if (!entry[field + 'Known']) return '—';
  const text = field === 'mg' ? routeWorkspaceMassText(entry[field]) : routeWorkspaceQuantityText(entry[field], unit);
  return entry[field + 'Incomplete'] ? '≥ ' + text + ' (partial)' : text;
}

function routeWorkspaceMaterialsCsv(materials) {
  const rows = [['Material', 'SMILES', 'Roles', 'Steps', 'Stock', 'Stock source', 'mmol', 'mmol partial', 'Mass (mg)', 'Mass partial', 'Volume (mL)', 'Volume partial', 'Hazard codes']];
  (materials || []).forEach((entry) => rows.push([entry.name, entry.smiles, entry.roles.join('; '), entry.steps.join('; '), entry.stockLabel, entry.stockSource, entry.mmol === null ? '' : entry.mmol, entry.mmolIncomplete ? 'yes' : 'no', entry.mg === null ? '' : entry.mg, entry.mgIncomplete ? 'yes' : 'no', entry.mL === null ? '' : entry.mL, entry.mLIncomplete ? 'yes' : 'no', entry.hazards.join('; ')]));
  return rows.map((row) => row.map(routeWorkspaceCsvEscape).join(',')).join('\r\n');
}

function routeWorkspaceCsvEscape(value) {
  let text = String(value === null || value === undefined ? '' : value);
  if (/^[\s]*[=+@-]/.test(text) && !/^\s*-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\s*$/.test(text)) text = "'" + text;
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

function routeWorkspaceCsv(route) {
  const report = routeWorkspaceValidate(route);
  const overallYield = routeWorkspaceYield(route, report);
  const rows = [['Route', route.name], ['Starting material', route.start], ['Target', route.target], ['Route status', report.status], ['Estimated overall yield (%)', overallYield === null ? '' : overallYield], ['Continuity issues', report.issues.join('; ')], [], ['Step', 'Reaction', 'Rule', 'From SMILES', 'Target SMILES', 'Compounds (role: SMILES)', 'Temperature (°C)', 'Solvents', 'Additives', 'Atmosphere', 'Energy', 'Pressure (atm)', 'Reflux', 'Time', 'Concentration', 'Notes', 'Verification', 'Explanation', 'Step role', 'Protecting group', 'Planning rationale', 'Group preservation', 'Group preservation notes', 'Estimated yield (%)','Boundary before step','Boundary basis','Work-up status','Work-up notes','Boundary assessment','Boundary explanation']];
  route.steps.forEach((s, i) => rows.push([i + 1, s.name, s.ruleId, s.from, s.to, s.compounds.map((c) => c.role + ': ' + c.smiles).join('\n'), s.conditions.temperature, s.conditions.solvents.join('; '), s.conditions.additives.join('; '), s.conditions.atmosphere, s.conditions.energy, s.conditions.pressure, s.conditions.reflux, s.conditions.time, s.conditions.concentration, s.conditions.notes, report.steps[i].status, report.steps[i].message, s.planning ? s.planning.kind : '', s.planning ? s.planning.group : '', s.planning ? s.planning.reason : '', report.steps[i].outcome && report.steps[i].outcome.protectionAssessment ? report.steps[i].outcome.protectionAssessment.status : '', report.steps[i].outcome && report.steps[i].outcome.protectionAssessment ? report.steps[i].outcome.protectionAssessment.sites.map(site => (site.label || site.id) + ': ' + site.status + '. ' + (site.reasons || []).join(' ')).join('\n') : '', routeWorkspaceStepYield(s, report.steps[i]),i?(s.handoff||routeHandoffNormalize()).mode:'initial mixture',i?(s.handoff||routeHandoffNormalize()).basis:'',routeWorkupNormalize(s.workup).status,routeWorkupNormalize(s.workup).notes,i?report.handoffs[i-1].status:'',i?report.handoffs[i-1].message+' '+report.handoffs[i-1].blockers.map(b=>b.message).join(' '):'']));
  return rows.map((row) => row.map(routeWorkspaceCsvEscape).join(',')).join('\r\n');
}

function routeWorkspaceImport(text) {
  if (typeof text !== 'string' || text.length > ROUTE_WORKSPACE_LIMITS.importBytes) throw new Error('Route JSON must be smaller than 1 MB.');
  const raw = JSON.parse(text);
  const routes = raw && raw.format === 'chem-lab-route-workspace' ? raw.routes : [raw];
  if (raw && raw.format === 'chem-lab-route-workspace' && raw.version !== 1) throw new Error('Unsupported workspace version.');
  if (!Array.isArray(routes) || routes.length > ROUTE_WORKSPACE_LIMITS.routes) throw new Error('Import contains too many routes.');
  return routes.map(routeWorkspaceNormalize);
}

function createRouteWorkspace(deps) {
  const root = deps.container;
  const element = (tag, text, cls) => { const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (cls) el.className = cls; return el; };
  const button = (label, fn) => { const b = element('button', label, 'text-button'); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const storage = deps.storage || (typeof localStorage !== 'undefined' ? localStorage : null);
  let routes = [];
  let selected = '';
  let scalePrefs = { routeId: '', basis: 'product', amount: '1', unit: 'g' };
  let loadError = '';
  try { const saved = storage && storage.getItem(ROUTE_WORKSPACE_STORAGE); if (saved) routes = routeWorkspaceImport(saved); } catch (error) { loadError = 'Saved routes could not be loaded: ' + error.message; }
  const heading = element('div', undefined, 'workspace-heading');
  heading.append(element('h2', 'Route workspace'), element('p', 'Save and edit candidate routes, inspect intermediates, and recheck every step against the current reaction rules.'));
  const controls = element('div', undefined, 'workspace-controls');
  const picker = element('select'); picker.setAttribute('aria-label', 'Saved route');
  const message = element('p', loadError || 'Save a route from Path Finder, or import a route JSON file.', 'workspace-message'); message.setAttribute('role', 'status'); message.setAttribute('aria-live', 'polite');
  const content = element('div', undefined, 'workspace-content');
  const file = element('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true;
  const current = () => routes.find((r) => r.id === selected) || null;
  const persist = () => {
    try { if (storage) storage.setItem(ROUTE_WORKSPACE_STORAGE, JSON.stringify({ format: 'chem-lab-route-workspace', version: 1, routes })); return true; }
    catch (error) { message.textContent = 'Your edits remain in this session, but could not be saved: ' + error.message; return false; }
  };
  const download = (name, type, text) => {
    if (deps.download) return deps.download(name, type, text);
    const url = URL.createObjectURL(new Blob([text], { type }));
    const anchor = element('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const labelInput = (text, value, type) => { const wrap = element('label', text); const input = element(type === 'textarea' ? 'textarea' : 'input'); if (type !== 'textarea') input.type = type || 'text'; input.value = value; wrap.append(input); return { wrap, input }; };
  const simpleName = (smiles) => { try { return retroViewName(smiles); } catch (error) { return smiles; } };
  const redraw = () => {
    picker.replaceChildren();
    routes.forEach((r) => { const option = element('option', r.name); option.value = r.id; picker.append(option); });
    picker.value = selected;
    picker.disabled = !routes.length;
    content.replaceChildren();
    const route = current();
    if (!route) { content.append(element('p', 'No route selected. Path Finder has a Save route button for each candidate route.')); return; }
    content.append(reactionPurificationControl(redraw));if(typeof physicalPropertiesAutoControl==='function')content.append(physicalPropertiesAutoControl(redraw));
    const report = routeWorkspaceValidate(route);
    const meta = element('div', undefined, 'workspace-meta');
    const name = labelInput('Route name', route.name);
    name.input.addEventListener('change', () => { route.name = name.input.value.trim().slice(0, 120) || 'Untitled route'; persist(); redraw(); });
    const start = labelInput('Starting material (name or SMILES)', route.start);
    const target = labelInput('Target (name or SMILES)', route.target);
    meta.append(name.wrap, start.wrap, target.wrap, button('Update endpoints', () => {
      try { const a = routeWorkspaceSmiles(start.input.value), b = routeWorkspaceSmiles(target.input.value); route.start = a; route.target = b; if (persist()) message.textContent = 'Endpoints updated. Continuity was rechecked.'; redraw(); } catch (error) { message.textContent = error.message; }
    }));
    if(route.researchProtocol){const protocol=element('details');protocol.append(element('summary','Recorded search protocol'),element('p','Historical search settings; edits to this saved route are checked chemically but do not rerun the search constraints.'),element('pre',JSON.stringify(route.researchProtocol,null,2)));content.append(protocol);}
    content.append(meta, element('p', simpleName(route.start) + ' → ' + simpleName(route.target), 'workspace-equation'), element('p', 'Route status: ' + report.status + '. ' + (report.issues.join(' ') || 'Intermediates connect in the current order.'), 'workspace-status ' + report.status));
    content.append(element('p','Step verification assumes separately prepared mixtures and any recorded endpoint work-up. It does not verify isolation, purity or one-pot compatibility.'));
    report.handoffs.forEach(h=>content.append(element('p','Before step '+h.beforeStep+': '+h.message+' '+h.blockers.map(b=>b.message).join(' ')+' '+h.potentials.map(p=>'If carried over: '+p.message).join(' '))));
    const overallYield = routeWorkspaceYield(route, report);
    content.append(element('p', overallYield === null ? 'Estimated overall yield: unavailable until every step is verified.' : 'Estimated overall yield: ' + overallYield + '% (product of the step-yield estimates).', 'workspace-yield'));
    const comparisons = routeWorkspaceComparison(routes, route.target);
    if (comparisons.length) {
      const comparison = element('section', undefined, 'workspace-comparison');
      comparison.append(element('h3', 'Saved-route comparison'), element('p', 'Routes to this target are compared descriptively, without prices or an overall feasibility score. Stock recognition uses the local stock list; hazard counts cover only notes encoded in the reagent library.'));
      const table = element('table', undefined, 'workspace-comparison-table');
      const head = element('tr'); ['Route', 'Starting material', 'Steps', 'Estimated yield', 'Stock recognized', 'Hazard-noted materials', 'Protection steps', 'Status', ''].forEach((text) => head.append(element('th', text)));
      const thead = element('thead'); thead.append(head); table.append(thead);
      const body = element('tbody');
      comparisons.forEach((summary) => {
        const line = element('tr'); if (summary.id === route.id) line.className = 'is-selected';
        [summary.name, simpleName(summary.start), summary.stepCount, summary.overallYield === null ? '—' : summary.overallYield + '%', summary.stockRecognized + ' / ' + summary.materialCount + (summary.stockReview ? ' · ' + summary.stockReview + ' review' : ''), summary.hazardMaterials, summary.protectionSteps, summary.status].forEach((text) => line.append(element('td', String(text))));
        const action = element('td'); action.append(button('Open', () => { selected = summary.id; redraw(); })); line.append(action); body.append(line);
      });
      table.append(body); comparison.append(table); content.append(comparison);
    }
    if (scalePrefs.routeId !== route.id) scalePrefs = { routeId: route.id, basis: 'product', amount: '1', unit: 'g' };
    const planner = element('section', undefined, 'workspace-scale');
    planner.append(element('h3', 'Route scale planner'), element('p', 'Target a final product amount or enter the amount of any step reactant. The planner scales upstream and downstream materials using route stoichiometry and estimated step yields.'));
    const scaleControls = element('div', undefined, 'workspace-scale-controls');
    const basisLabel = element('label', 'Scale basis');
    const basisSelect = element('select'); basisSelect.setAttribute('aria-label', 'Scale basis');
    const bases = routeWorkspaceScaleBases(route);
    if (!bases.some((item) => item.id === scalePrefs.basis)) scalePrefs.basis = 'product';
    bases.forEach((item) => { const option = element('option', item.label); option.value = item.id; basisSelect.append(option); });
    basisSelect.value = scalePrefs.basis; basisLabel.append(basisSelect);
    const amount = labelInput('Amount', scalePrefs.amount, 'number'); amount.input.min = '0'; amount.input.step = 'any'; amount.input.setAttribute('aria-label', 'Scale amount');
    const unitLabel = element('label', 'Unit');
    const unitSelect = element('select'); unitSelect.setAttribute('aria-label', 'Scale unit');
    [['g', 'g'], ['mg', 'mg'], ['µg', 'µg']].forEach(([value, text]) => { const option = element('option', text); option.value = value; unitSelect.append(option); });
    unitSelect.value = scalePrefs.unit; unitLabel.append(unitSelect);
    const scaleResults = element('div', undefined, 'workspace-scale-results');
    const clearScale = () => { scalePrefs.basis = basisSelect.value; scalePrefs.amount = amount.input.value; scalePrefs.unit = unitSelect.value; scaleResults.replaceChildren(); };
    basisSelect.addEventListener('change', clearScale); amount.input.addEventListener('input', clearScale); unitSelect.addEventListener('change', clearScale);
    scaleControls.append(basisLabel, amount.wrap, unitLabel, button('Calculate materials', () => {
      clearScale();
      try {
        const plan = routeWorkspaceScalePlan(route, basisSelect.value, amount.input.value, unitSelect.value, report);
        scaleResults.append(element('p', 'Expected final product: ' + routeWorkspaceMassText(plan.finalProductMg) + ' (' + routeWorkspaceQuantityText(plan.finalProductMmol, 'mmol') + '). Starting intermediate required: ' + routeWorkspaceQuantityText(plan.startingMmol, 'mmol') + '.', 'workspace-scale-summary'));
        const consolidated = routeWorkspaceAggregateMaterials(route, plan.steps.map((stepPlan) => stepPlan.rows));
        const materials = element('section', undefined, 'workspace-consolidated');
        materials.append(element('h4', 'Consolidated external materials'), element('p', 'Identical materials are combined across steps; intermediates produced earlier in the route are excluded. A partial total means at least one occurrence lacks quantity data. Stock and hazard notes require review and are not a complete availability or safety assessment.'));
        const materialTable = element('table', undefined, 'workspace-materials workspace-consolidated-table');
        const materialHead = element('tr'); ['Material', 'Roles', 'Steps', 'Stock', 'mmol', 'Mass', 'Volume', 'Hazard codes'].forEach((text) => materialHead.append(element('th', text)));
        const materialThead = element('thead'); materialThead.append(materialHead); materialTable.append(materialThead);
        const materialBody = element('tbody');
        consolidated.forEach((entry) => {
          const line = element('tr');
          const values = [entry.name, entry.roles.join(', '), entry.steps.join(', '), entry.stockLabel, routeWorkspaceAggregateAmount(entry, 'mmol', 'mmol'), routeWorkspaceAggregateAmount(entry, 'mg'), routeWorkspaceAggregateAmount(entry, 'mL', 'mL'), entry.hazards.join(', ') || '—'];
          values.forEach((text, index) => { const cell = element('td', text); if (index === 3 && entry.stockReview) cell.className = 'workspace-stock-review'; line.append(cell); });
          materialBody.append(line);
        });
        materialTable.append(materialBody);
        materials.append(materialTable, button('Export materials CSV', () => download('chem-lab-materials.csv', 'text/csv;charset=utf-8', routeWorkspaceMaterialsCsv(consolidated))));
        scaleResults.append(materials);
        plan.steps.forEach((stepPlan, index) => {
          const block = element('section', undefined, 'workspace-scale-step');
          block.append(element('h4', 'Step ' + (index + 1) + ': ' + route.steps[index].name), element('p', 'Reaction scale ' + routeWorkspaceQuantityText(stepPlan.scaleMmol, 'mmol') + ' · estimated yield ' + stepPlan.yield + '% · expected step product ' + routeWorkspaceMassText(stepPlan.productMg) + '.'));
          const table = element('table', undefined, 'workspace-materials');
          const head = element('tr'); ['Material', 'Role', 'equiv', 'mmol', 'Mass', 'Volume'].forEach((text) => head.append(element('th', text)));
          const thead = element('thead'); thead.append(head); table.append(thead);
          const body = element('tbody');
          stepPlan.rows.forEach((row) => {
            const line = element('tr');
            [row.name || (row.compound && row.compound.smiles) || 'Material', row.role, row.equiv === null ? '—' : routeWorkspaceQuantityText(row.equiv, ''), routeWorkspaceQuantityText(row.mmol, ''), routeWorkspaceMassText(row.mg), routeWorkspaceQuantityText(row.mL, 'mL')].forEach((text) => line.append(element('td', text)));
            body.append(line);
          });
          table.append(body); block.append(table); scaleResults.append(block);
        });
      } catch (error) { scaleResults.append(element('p', error.message, 'workspace-status invalid')); }
    }));
    planner.append(scaleControls, scaleResults); content.append(planner);
    if (typeof protectionRouteAudit === 'function' && typeof protectionRouteElement === 'function') content.append(protectionRouteElement(protectionRouteAudit(route.steps)));
    route.steps.forEach((step, index) => {
      const card = element('article', undefined, 'workspace-step');
      card.append(element('h3', (index + 1) + '. ' + step.name), element('p', report.steps[index].status + ': ' + report.steps[index].message, 'workspace-status ' + report.steps[index].status));
      if (step.planning) card.append(element('p', (step.planning.kind === 'protect' ? 'Install protecting group' : step.planning.kind === 'deprotect' ? 'Remove protecting group' : 'Protected reaction') + (step.planning.group ? ' · ' + step.planning.group : '') + ': ' + step.planning.reason, 'workspace-planning'));
      const estimatedYield = routeWorkspaceStepYield(step, report.steps[index]);
      const yieldField = labelInput('Step yield estimate (%)', estimatedYield === null ? '' : String(estimatedYield), 'number');
      yieldField.input.min = '0'; yieldField.input.max = '100'; yieldField.input.step = '1'; yieldField.input.disabled = estimatedYield === null;
      yieldField.input.setAttribute('aria-label', 'Step ' + (index + 1) + ' yield (%)');
      yieldField.input.title = 'Default: model selectivity times maximum conversion. You can replace it with an isolated-yield estimate.';
      yieldField.wrap.className = 'workspace-yield-control';
      yieldField.input.addEventListener('change', () => {
        const value = Number(yieldField.input.value);
        if (!Number.isFinite(value) || value < 0 || value > 100 || yieldField.input.value.trim() === '') { message.textContent = 'Step yield must be between 0 and 100%.'; return; }
        step.yield = Math.round(value); persist(); redraw();
      });
      card.append(yieldField.wrap);
      const verifiedOutcome = report.steps[index].outcome;
      if (verifiedOutcome && verifiedOutcome.protectionAssessment && typeof protectionAssessmentElement === 'function') card.append(protectionAssessmentElement(verifiedOutcome.protectionAssessment));
      if (typeof reactionEvidenceElement === 'function' && verifiedOutcome && verifiedOutcome.evidence) card.append(reactionEvidenceElement(verifiedOutcome.evidence, true));
      if (typeof reactionScopeAssess === 'function' && typeof reactionScopeElement === 'function' && verifiedOutcome) card.append(reactionScopeElement(reactionScopeAssess(step.compounds,step.conditions,verifiedOutcome)));
      if (typeof reactionAtomMapping === 'function' && typeof reactionMappingElement === 'function') {
        const inspect = element('details'); inspect.append(element('summary', 'Inspect product atom correspondence'));
        let mapped = false;
        inspect.addEventListener('toggle', () => { if (inspect.open && !mapped) { mapped = true; inspect.append(reactionMappingElement(reactionAtomMapping(step.compounds, step.to))); } });
        card.append(inspect);
      }
      const structures = element('div', undefined, 'workspace-structures');
      step.fromState=reactionMaterialStateResolve(step.fromState,step.from,step.conditions);step.toState=reactionMaterialStateResolve(step.toState,step.to,step.conditions);
      [step.from, step.to].forEach((smiles, i) => {
        if (i) structures.append(element('span', '→'));
        const block = element('div');
        if (deps.thumbnail) { try { block.append(deps.thumbnail(retroFromSmiles(smiles))); } catch (error) { block.append(element('span', 'Structure preview unavailable')); } }
        const phaseControls=reactionMaterialStateControl(i?step.toState:step.fromState,value=>{if(i)step.toState=reactionMaterialStateResolve(value,step.to,step.conditions);else{step.fromState=reactionMaterialStateResolve(value,step.from,step.conditions);step.compounds.filter(c=>routeWorkspaceKey(c.smiles)===routeWorkspaceKey(step.from)).forEach(c=>c.materialState=value);}persist();refreshPurification();});
        block.append(element('p',simpleName(smiles)),element('code',smiles),phaseControls);if(typeof physicalPropertiesElement==='function')block.append(physicalPropertiesElement(smiles,()=>{const key=i?'toState':'fromState';step[key]=reactionMaterialStateResolve(step[key],smiles,step.conditions);phaseControls.updateMaterialState(step[key]);persist();refreshPurification();}));structures.append(block);
      });
      card.append(structures);
      const purificationBox=element('div');
      const refreshPurification=()=>{purificationBox.replaceChildren();if(reactionPurificationEnabled())purificationBox.append(reactionPurificationElement(reactionPurificationPlan({smiles:step.to},step.toState)));};
      refreshPurification();card.append(purificationBox);
      const actions = element('div', undefined, 'workspace-actions');
      const up = button('Move up', () => { [route.steps[index - 1], route.steps[index]] = [route.steps[index], route.steps[index - 1]]; persist(); redraw(); }); up.disabled = index === 0;
      const down = button('Move down', () => { [route.steps[index + 1], route.steps[index]] = [route.steps[index], route.steps[index + 1]]; persist(); redraw(); }); down.disabled = index === route.steps.length - 1;
      actions.append(up, down, button('Delete step', () => { route.steps.splice(index, 1); persist(); redraw(); }), button('Open in Reactions', () => { if (deps.openInLab) deps.openInLab(step.compounds, step.conditions); }));
      card.append(actions);
      const boundaryEditor=element('details');boundaryEditor.append(element('summary','Isolation and work-up assumptions'));
      const modeLabel=element('label','Boundary before this step '),mode=element('select');mode.setAttribute('aria-label','Boundary before step '+(index+1));
      [['isolated','Separate fresh mixture (assumed isolation)'],['carryover','Carry-over / one pot (unsupported)']].forEach(([value,text])=>{const option=element('option',text);option.value=value;mode.append(option);});
      mode.value=(step.handoff||routeHandoffNormalize()).mode;mode.disabled=index===0;modeLabel.append(mode);
      const workLabel=element('label','Endpoint work-up '),work=element('select');work.setAttribute('aria-label','Work-up status step '+(index+1));
      [['assumed','Assumed by model'],['recorded','Described in record (procedure unvalidated)'],['none','No work-up recorded']].forEach(([value,text])=>{const option=element('option',text);option.value=value;work.append(option);});
      work.value=routeWorkupNormalize(step.workup).status;workLabel.append(work);
      const workNotes=labelInput('Work-up description',routeWorkupNormalize(step.workup).notes,'textarea');
      boundaryEditor.append(modeLabel,workLabel,workNotes.wrap,element('p',report.steps[index].workup?report.steps[index].workup.message:''),button('Save boundary assumptions',()=>{
        try{const nextWorkup=routeWorkupNormalize({status:work.value,notes:workNotes.input.value});const nextHandoff=index?routeHandoffNormalize({mode:mode.value}):null;step.workup=nextWorkup;step.handoff=nextHandoff;persist();redraw();}
        catch(error){message.textContent=error.message;}
      }));card.append(boundaryEditor);
      const editor = element('details'); editor.append(element('summary', 'Edit inputs and conditions'));
      const fields = element('div', undefined, 'workspace-fields');
      const from = labelInput('Starting intermediate (name or SMILES)', step.from);
      const to = labelInput('Target intermediate (name or SMILES)', step.to);
      const compounds = labelInput('Compounds: one role | equivalents | name or SMILES per line', step.compounds.map((c) => c.role + ' | ' + c.equiv + ' | ' + c.smiles).join('\n'), 'textarea');
      const temperature = labelInput('Temperature (°C)', step.conditions.temperature, 'number');
      const solvents = labelInput('Solvents (IDs separated by commas, e.g. water, ethanol)', step.conditions.solvents.join(', '));
      const additives = labelInput('Additives (IDs separated by commas, e.g. h2so4)', step.conditions.additives.join(', '));
      const notes = labelInput('Notes', step.conditions.notes || '', 'textarea');
      fields.append(from.wrap, to.wrap, compounds.wrap, temperature.wrap, solvents.wrap, additives.wrap, notes.wrap);
      editor.append(fields, button('Apply edits and recheck', () => {
        try {
          const next = Object.assign({}, step, { from: routeWorkspaceSmiles(from.input.value), to: routeWorkspaceSmiles(to.input.value), ruleId: '', compounds: compounds.input.value.split(/\r?\n/).filter((line) => line.trim()).map((line) => {
            const parts = line.split('|');
            if (parts.length === 2) return { role: parts[0].trim(), equiv: '1', smiles: parts[1].trim() };
            if (parts.length < 3) throw new Error('Use role | equivalents | name or SMILES for each compound.');
            return { role: parts[0].trim(), equiv: parts[1].trim(), smiles: parts.slice(2).join('|').trim() };
          }), conditions: Object.assign({}, step.conditions, { temperature: Number(temperature.input.value), solvents: solvents.input.value.split(',').map((s) => s.trim()).filter(Boolean), additives: additives.input.value.split(',').map((s) => s.trim()).filter(Boolean), notes: notes.input.value }) });
          route.steps[index] = routeWorkspaceNormalize(Object.assign({}, route, { steps: route.steps.map((s,i)=>i===index?next:s) })).steps[index];
          const result = routeWorkspaceValidateStep(route.steps[index]);
          if (result.status === 'verified') { route.steps[index].name = result.outcome.name; route.steps[index].ruleId = result.ruleId; }
          if (persist()) message.textContent = 'Edits saved; step is ' + result.status + '.';
          redraw();
        } catch (error) { message.textContent = error.message; }
      }));
      card.append(editor); content.append(card);
    });
    content.append(element('p', 'Verified means reproduced by the supported rule model. Overall yield multiplies the step estimates; each default step estimate is model selectivity times maximum conversion. Material amounts use that yield model, the entered stoichiometry, and molecular masses. These are planning estimates, not guaranteed experimental yields or validated laboratory procedures.', 'workspace-caveat'));
  };
  picker.addEventListener('change', () => { selected = picker.value; redraw(); });
  controls.append(picker, button('Recheck route', () => { redraw(); message.textContent = 'Route rechecked against the current rules.'; }), button('Export JSON', () => { const route = current(); if (route) download('chem-lab-route.json', 'application/json', JSON.stringify(route, null, 2)); }), button('Export CSV', () => { const route = current(); if (route) download('chem-lab-route.csv', 'text/csv;charset=utf-8', routeWorkspaceCsv(route)); }), button('Import JSON', () => file.click()), button('Delete route', () => {
    if (!current()) return;
    routes = routes.filter((r) => r.id !== selected); selected = routes[0] ? routes[0].id : ''; persist(); redraw();
  }));
  file.addEventListener('change', async () => {
    try {
      const item = file.files && file.files[0]; if (!item) return;
      if (item.size > ROUTE_WORKSPACE_LIMITS.importBytes) throw new Error('Route JSON must be smaller than 1 MB.');
      const imported = routeWorkspaceImport(await item.text());
      if (routes.length + imported.length > ROUTE_WORKSPACE_LIMITS.routes) throw new Error('Delete a saved route before importing more (maximum ' + ROUTE_WORKSPACE_LIMITS.routes + ').');
      imported.forEach((r) => { r.id = 'route-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8); });
      routes.push(...imported); selected = imported[0] ? imported[0].id : selected;
      if (persist()) message.textContent = 'Imported ' + imported.length + ' route(s). Verification was recomputed.';
      redraw();
    } catch (error) { message.textContent = 'Import failed: ' + error.message; }
    finally { file.value = ''; }
  });
  root.append(heading, controls, file, message, content);
  selected = routes[0] ? routes[0].id : '';
  redraw();
  return {
    addRoute(raw) {
      if (routes.length >= ROUTE_WORKSPACE_LIMITS.routes) throw new Error('At most ' + ROUTE_WORKSPACE_LIMITS.routes + ' routes can be saved.');
      const route = routeWorkspaceNormalize(raw); route.id = 'route-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      routes.push(route); selected = route.id; const saved = persist(); redraw(); if (saved) message.textContent = 'Route saved. You can rename it and edit individual steps.'; return route;
    },
    show() { redraw(); picker.focus(); },
  };
}
