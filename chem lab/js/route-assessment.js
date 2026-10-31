// This layer uses existing rule warnings and protection assessments. It does
// not infer compatibility for substrate classes the rules have not assessed.
function routeStepAssessment(candidate) {
  const c=candidate||{},o=c.outcome||{},blockers=[],warnings=[];
  if (Array.isArray(c.pgSteps)) {
    c.pgSteps.forEach((step,i) => {
      const report=routeStepAssessment({outcome:step.outcome,compounds:step.compounds,conditions:step.conditions});
      report.blockers.forEach(b=>blockers.push({code:b.code,message:'Protection sequence step '+(i+1)+': '+b.message}));
      warnings.push(...report.warnings);
    });
    return {status:blockers.length?'blocked':'no-encoded-conflict',blockers,warnings:[...new Set(warnings)]};
  }
  const loadingConflict=rxLoadingConflict(o);
  if(loadingConflict)blockers.push({code:'reagent-loading',message:loadingConflict});
  if(o.partialConversion)blockers.push({code:'partial-conversion',message:'A partial-conversion site alternative has no established selective preparation.'});
  const chemo=o.chemoselectivity;
  if(chemo&&(chemo.competing||[]).length)blockers.push({code:'competing-sites',message:'The current rule leaves other susceptible sites available to '+(chemo.label||'the reagent')+'. A compatible protection or selectivity model is required.'});
  if(chemo&&!(chemo.competing||[]).length)warnings.push('The rule changes multiple susceptible functional-group classes; review whether this matches the intended product.');
  if(typeof pathFinderProtectionConflict==='function'){
    const reason=pathFinderProtectionConflict(c);if(reason)blockers.push({code:'group-survival',message:reason});
  }
  if(typeof pathFinderAmineConflict==='function'){
    const reason=pathFinderAmineConflict(c);if(reason)blockers.push({code:'proton-donor',message:reason});
  }
  const evidence=o.evidence||(typeof reactionRuleDescriptor==='function'?reactionRuleDescriptor(c.outcomeRule||c.rule||c.transform):null);
  if(!evidence||!(evidence.references||[]).length)warnings.push('No reaction-class source is recorded for this step.');
  warnings.push('Compatibility is checked only against encoded conflicts; a passed check does not establish experimental feasibility.');
  return {status:blockers.length?'blocked':'no-encoded-conflict',blockers,warnings};
}
