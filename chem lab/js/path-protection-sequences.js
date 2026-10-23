// Adapt forward-verified multi-group removal sequences to ordinary route links.
// All existing Path Finder reagent/rule/inventory filters still apply per edge.
function pathFinderSequenceRoutes(start, target, opts, filters) {
  if (typeof protectionSequencePlan !== 'function' || typeof protectionGroups !== 'function' ||
      protectionGroups(start.smiles).length < 2 || protectionGroups(target.smiles).length >= protectionGroups(start.smiles).length) return [];
  const result = protectionSequencePlan(start.smiles,target.smiles,{maxSteps:Math.min(4,opts.maxDepth),maxDepth:Math.min(4,opts.maxDepth),maxRoutes:opts.maxRoutes,maxNodes:Math.min(64,opts.maxNodes),budgetMs:Math.min(500,opts.budgetMs)});
  return (result.routes || []).flatMap(route => {
    if (!route.steps.length || route.steps.length > opts.maxDepth) return [];
    const links = [];
    let previous = start.key;
    for (const step of route.steps) {
      const detail = step.candidate || step;
      const from = pathFinderStructure(step.from), to = pathFinderStructure(step.to);
      if (from.key !== previous) return [];
      const precursors = detail.compounds.filter(c => c.role === 'reactant').map(retroPrecursorInfo);
      const precursor = precursors.findIndex(p => pathFinderKey(p.isomericSmiles||p.smiles) === from.key);
      if (precursor < 0) return [];
      const candidate = {transform:'protection-sequence-'+(detail.planning && detail.planning.groupId || detail.groupId),name:detail.name,group:'Protecting groups',
        rule:detail.outcome.rule,outcomeRule:detail.outcome.rule,outcomeId:detail.outcome.id,outcomeName:detail.name,
        precursors,reagents:detail.compounds.filter(c=>c.role!=='reactant'),compounds:detail.compounds,conditions:detail.conditions,
        outcome:detail.outcome,product:detail.outcome.products.find(p=>moleculeSame(p.isomericSmiles||p.smiles,to.smiles)),minor:false,
        planning:detail.planning,labels:reactionConditionLabels(detail.conditions,detail.compounds)};
      if (!candidate.product || filters.ruleBlocked(candidate) || filters.reagentBlocked(candidate) ||
          pathFinderProtectionConflict(candidate) || !retroForwardCheck(candidate,to.smiles) ||
          precursors.some((p,i)=>i!==precursor&&!filters.stocked(p.isomericSmiles||p.smiles))) return [];
      links.push({candidate,precursor,from:from.smiles,to:to.smiles,fromKey:from.key,toKey:to.key}); previous=to.key;
    }
    return previous===target.key?[links]:[];
  });
}
