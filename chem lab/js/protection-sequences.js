// Bounded ordering of already installed protecting groups. Every visible edge
// is a fresh forward prediction, not an assumed orthogonality-table operation.
const PROTECTION_SEQUENCE_SCOPE = 'Existing protecting groups only; at most four removal steps. Unknown or conflicting survival blocks retained groups. One copy of each removed group type is supported; selective partial cleavage of repeated groups, relative cleavage rates, full-substrate compatibility and experimental feasibility are not established.';

function protectionSequenceRecipes() {
  return [
    {id:'fmoc',groups:['fmoc'],reagents:[],conditions:{additives:['piperidine'],solvents:['dmf']},outcomes:['fmoc-deprotection']},
    {id:'hydrogenolysis',groups:['cbz','benzyl','pmb','benzyl-ester'],reagents:[{smiles:'[H][H]',role:'reagent',label:'H2'}],conditions:{additives:['pdc'],solvents:['ethanol']},outcomes:['hydrogenolysis']},
    {id:'fluoride',groups:['tms','tbs','tips','tbdps','silyl'],reagents:[{smiles:'CCCC[N+](CCCC)(CCCC)CCCC.[F-]',role:'reagent',label:'TBAF'}],conditions:{solvents:['thf']},outcomes:['silyl-deprotection']},
    {id:'acid',groups:['boc','tbu-ester'],reagents:[{smiles:'OC(=O)C(F)(F)F',role:'reagent',label:'TFA'}],conditions:{solvents:['dcm']},outcomes:['boc-deprotection','tbu-ester-deprotection']},
    {id:'aqueous-acid',groups:['acetal'],reagents:[],conditions:{additives:['hcl'],solvents:['water']},outcomes:['acetal-hydrolysis']},
    {id:'oxidative',groups:['pmb'],reagents:[],conditions:{additives:['ddq'],solvents:['dcm','water']},outcomes:['pmb-deprotection']},
    {id:'ester-hydrolysis',groups:['methyl-ester'],reagents:[],conditions:{additives:['naoh'],solvents:['water'],temperature:80},outcomes:['saponification']},
  ];
}

function protectionSequenceStructure(value) {
  const graph=protectionGraph(value);
  if(graph.connectedComponents().length!==1)throw new Error('Use a single connected intermediate.');
  if(graph.atoms.length>120)throw new Error('Protecting-group sequence planning is limited to 120 atoms.');
  const identity=moleculeIdentity(graph);
  return {graph,key:identity.key,smiles:identity.isomericSmiles||identity.smiles};
}

function protectionSequenceCounts(sites) {
  return sites.reduce((out,s)=>{out[s.id]=(out[s.id]||0)+1;return out;},{});
}

function protectionSequenceStep(source,recipe,outcome,product,report,removed) {
  const from=source.smiles,to=product.isomericSmiles||product.smiles;
  const groups=[...new Set(removed.map(s=>s.id))],label=[...new Set(removed.map(s=>s.label))].join(' + ');
  const compounds=[{smiles:from,role:'reactant',fragment:smilesToFragment(from),equiv:1},...recipe.reagents.map(r=>({...r,fragment:smilesToFragment(r.smiles),equiv:1}))];
  const conditions=normalizeReactionConditions({...defaultReactionConditions(),...recipe.conditions});
  const reason='Remove '+label+' using an encoded forward-verified transformation. '+(report.sites.some(s=>!groups.includes(s.id))?'Other recognized protecting groups must have compatible preservation reports for this step.':'No other recognized protecting group is retained in this intermediate.');
  const candidate={
    transform:'protection-sequence-'+recipe.id,name:'Remove '+label,outcomeName:'Remove '+label,
    group:'Protecting groups',rule:outcome.rule,outcomeRule:outcome.rule,outcomeId:outcome.id,ruleId:outcome.id,
    precursors:[{smiles:from,isomericSmiles:from,role:'reactant'}],reagents:recipe.reagents.map(r=>({...r})),
    compounds,conditions,outcome,product,minor:false,
    labels:reactionConditionLabels(conditions,compounds),
    planning:{kind:'deprotect',group:label,groupId:groups.join(','),reason},
    compatibility:{status:'compatible',preserved:report.sites.filter(s=>!groups.includes(s.id)),removed:groups},
  };
  return {from,to,fromKey:source.key,toKey:moleculeIdentity(to).key,precursor:0,candidate};
}

function protectionSequencePlan(start,target,options) {
  const opts=options||{},diagnostics={expanded:0,forwardPredictions:0,blocked:[],truncated:false};
  const result={status:'unavailable',start:'',target:'',routes:[],diagnostics,scope:PROTECTION_SEQUENCE_SCOPE};
  const note=text=>{if(!diagnostics.blocked.includes(text)&&diagnostics.blocked.length<12)diagnostics.blocked.push(text);};
  const split=value=>(Array.isArray(value)?value:String(value||'').split(/[\n,]+/)).map(s=>String(s).trim()).filter(Boolean);
  const forbiddenRules=split(opts.forbiddenRules).map(s=>s.toLowerCase());
  const forbiddenReagents=split(opts.forbiddenReagents).map(text=>{let key=null;try{key=moleculeIdentity(reactionParseCompound(text).smiles).key;}catch(_){/* Text filters also support solvent/catalyst names. */}return {text:text.toLowerCase(),key};});
  const allowed=opts.removeGroups==null?null:new Set(split(opts.removeGroups).map(s=>s.toLowerCase()));
  const preserve=new Set(split(opts.preserveGroups).map(s=>s.toLowerCase()));
  const knownGroups=new Set(protectionCatalog().map(g=>g.id));
  if([...(allowed||[]),...preserve].some(id=>!knownGroups.has(id))){result.status='invalid';note('Use supported protecting-group IDs in removal and preservation filters.');return result;}
  const maxDepth=Math.max(1,Math.min(4,Math.floor(Number(opts.maxDepth)||4)));
  const maxNodes=Math.max(1,Math.min(64,Math.floor(Number(opts.maxNodes)||32)));
  const maxRoutes=Math.max(1,Math.min(5,Math.floor(Number(opts.maxRoutes)||3)));
  const budgetMs=Math.max(1,Math.min(2000,Number(opts.budgetMs)||1000)),began=performance.now();
  let first,destination;
  try{first=protectionSequenceStructure(start);destination=protectionSequenceStructure(target);}catch(error){result.status='invalid';note(error.message);return result;}
  result.start=first.smiles;result.target=destination.smiles;
  if(first.key===destination.key){result.status='found';result.routes.push({start:first.smiles,target:destination.smiles,steps:[],scope:PROTECTION_SEQUENCE_SCOPE});return result;}
  const initialSites=protectionGroups(first.graph),targetSites=protectionGroups(destination.graph);
  const initialCounts=protectionSequenceCounts(initialSites),targetCounts=protectionSequenceCounts(targetSites);
  if(!initialSites.length){note('No recognized installed protecting group is available for removal.');return result;}
  if(targetSites.some(s=>(targetCounts[s.id]||0)>(initialCounts[s.id]||0))){note('This planner removes existing protection; it does not install new groups.');return result;}
  const queue=[{source:first,steps:[]}],seen=new Map([[first.key,0]]),routeKeys=new Set();
  while(queue.length&&result.routes.length<maxRoutes){
    if(diagnostics.expanded>=maxNodes||performance.now()-began>=budgetMs){diagnostics.truncated=true;break;}
    const node=queue.shift();diagnostics.expanded++;
    if(node.steps.length>=maxDepth)continue;
    const before=protectionGroups(node.source.graph),counts=protectionSequenceCounts(before),info=rxAnalyze(node.source.graph);
    if(info.carbonyls.some(c=>['acylChloride','anhydride'].includes(c.kind))){note('Removal in the presence of an activated acyl chloride/anhydride is outside the compatibility scope.');continue;}
    for(const recipe of protectionSequenceRecipes()){
      const available=before.filter(s=>recipe.groups.includes(s.id)&&!preserve.has(s.id)&&(allowed===null||allowed.has(s.id)));
      if(!available.length)continue;
      if(available.some(s=>counts[s.id]>1)){note('Selective removal among multiple copies of '+available.find(s=>counts[s.id]>1).label+' is not encoded.');continue;}
      // Do not turn a deprotection search into a hidden hydrogenation plan.
      if(recipe.id==='hydrogenolysis'&&(info.alkenes.length||info.alkynes.length||info.nitriles.length||info.carbonyls.some(c=>['aldehyde','ketone'].includes(c.kind))||typeof rxyNitro==='function'&&rxyNitro({graph:node.source.graph}).length)){
        note('Hydrogenolysis is not offered while an alkene, alkyne, nitro, nitrile or aldehyde/ketone presents an unsupported competing reduction.');continue;
      }
      const compounds=[{smiles:node.source.smiles,fragment:smilesToFragment(node.source.smiles),role:'reactant',equiv:1},...recipe.reagents.map(r=>({...r,fragment:smilesToFragment(r.smiles),equiv:1}))];
      const conditions=normalizeReactionConditions({...defaultReactionConditions(),...recipe.conditions});
      const labels=reactionConditionLabels(conditions,compounds);
      const reagentText=[recipe.id,...recipe.reagents.map(r=>r.label||r.smiles),labels.above,labels.below,...conditions.solvents,...conditions.additives].join(' ').toLowerCase();
      if(forbiddenReagents.some(b=>reagentText.includes(b.text)||b.key&&recipe.reagents.some(r=>moleculeIdentity(r.smiles).key===b.key))){note('A removal reagent, catalyst or solvent is excluded by the supplied filters.');continue;}
      const context=reactionContext(compounds,conditions),report=protectionAssess(node.source.graph,context);
      const prediction=predictReaction(compounds,conditions);diagnostics.forwardPredictions++;
      for(const outcome of [prediction.best,...prediction.alternatives].filter(o=>o&&recipe.outcomes.includes(o.id))){
        if(forbiddenRules.some(text=>[outcome.id,outcome.rule,outcome.name].join(' ').toLowerCase().includes(text))){note('A removal reaction is excluded by the supplied filters.');continue;}
        for(const product of outcome.products||[]){
          let next;try{next=protectionSequenceStructure(product.isomericSmiles||product.smiles);}catch(_){continue;}
          const after=protectionGroups(next.graph),afterCounts=protectionSequenceCounts(after);
          if(after.length>=before.length||after.some(s=>(afterCounts[s.id]||0)>(counts[s.id]||0)))continue;
          const removed=before.filter(s=>(afterCounts[s.id]||0)<(counts[s.id]||0));
          if(!removed.length||removed.some(s=>!recipe.groups.includes(s.id)||preserve.has(s.id)||allowed!==null&&!allowed.has(s.id)))continue;
          const failed=report.sites.find(s=>(afterCounts[s.id]||0)>0&&s.status!=='compatible');
          if(failed){note(failed.label+' must survive '+recipe.id+', but compatibility is '+failed.status+': '+failed.reasons.join(' '));continue;}
          const link=protectionSequenceStep(node.source,recipe,outcome,product,report,removed),steps=node.steps.concat(link);
          if(next.key===destination.key){const key=steps.map(s=>s.candidate.outcomeId+':'+s.toKey).join('|');if(!routeKeys.has(key)&&result.routes.length<maxRoutes){routeKeys.add(key);result.routes.push({start:first.smiles,target:destination.smiles,steps,scope:PROTECTION_SEQUENCE_SCOPE});}continue;}
          if(steps.length<maxDepth&&(!seen.has(next.key)||seen.get(next.key)>=steps.length)){seen.set(next.key,steps.length);queue.push({source:next,steps});}
        }
      }
    }
  }
  result.status=result.routes.length?'found':diagnostics.truncated?'exhausted':'unavailable';
  if(!result.routes.length&&!diagnostics.blocked.length)note('No compatible forward-verified removal order reaches the selected target within the supported subset.');
  return result;
}
