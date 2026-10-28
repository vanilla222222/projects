// Explicit, user-requested masks across a bounded route. These are not claims
// that protection is necessary or optimal for the selected transformation.
function protectionProgramChoice(id) {
  if (id === 'tbs') return {kind:'alcohol',pg:RETRO_PROTECTION.alcohol};
  const pg = retroProtectionChoices('amine').find(p => p.id === id);
  return pg ? {kind:'amine',pg} : null;
}

function protectionProgramMasks(smiles, choice, requireUnique) {
  const g = retroFromSmiles(smiles), info = rxAnalyze(g);
  const sites = choice.kind === 'amine' ? info.amines.filter(a => a.h > 0).map(a => [a.n]) : info.alcohols.map(a => [a.o]);
  if (!sites.length || requireUnique && sites.length !== 1) throw new Error('Requested '+choice.pg.label+' installation needs exactly one eligible '+choice.kind+' in the starting intermediate; selective installation across repeated sites is unsupported.');
  if (sites.length > 4) throw new Error('Too many possible protected target sites for this bounded search.');
  return [...new Set(sites.map(atoms => {
    const clone=rxCloneGraph(g);
    if (!choice.pg.apply(clone,atoms) || !retroValid(clone)) throw new Error('The requested protection is outside the graph-edit scope.');
    return retroProps(clone).isomericSmiles;
  }))];
}

function protectionProgramTargetOrder(from, targets) {
  const startFeatures=pathFinderFingerprint(from);
  const distance=smiles=>{
    const features=pathFinderFingerprint(smiles),keys=new Set([...Object.keys(startFeatures),...Object.keys(features)]);
    return [...keys].reduce((n,key)=>{
      const have=features[key]||0,want=startFeatures[key]||0;
      return n+(have<want?6*(want-have):have-want);
    },0);
  };
  return targets.map((smiles,index)=>({smiles,index,distance:distance(smiles)})).sort((a,b)=>a.distance-b.distance||(a.smiles<b.smiles?-1:a.smiles>b.smiles?1:a.index-b.index)).map(x=>x.smiles);
}

function protectionProgramBlocked(candidate, options) {
  const split = value => (Array.isArray(value)?value:String(value||'').split(/[\n,]+/)).map(s=>String(s).trim().toLowerCase()).filter(Boolean);
  const ruleText = [candidate.rule,candidate.outcomeRule,candidate.outcomeId,candidate.name,candidate.transform].filter(Boolean).join(' ').toLowerCase();
  if (split(options.forbiddenRules).some(s=>ruleText.includes(s))) return 'A planned protection operation is excluded by the reaction filters.';
  const materials = (candidate.compounds||[]).filter(c=>c.role!=='reactant').concat(candidate.reagents||[]);
  const conditions = candidate.conditions || {};
  (conditions.additives||[]).forEach(id=>materials.push(reactionAdditive(id)||{id}));
  (conditions.solvents||[]).forEach(id=>materials.push(reactionSolvent(id)||{id}));
  for (const filter of split(options.forbiddenReagents)) {
    let key='';try{key=pathFinderMaterialKey(reactionParseCompound(filter).smiles);}catch(_){/* Named filters also match labels. */}
    if(materials.some(m=>{
      if([m.label,m.name,m.id,m.smiles].filter(Boolean).some(s=>String(s).toLowerCase().includes(filter)))return true;
      try{return key&&m.smiles&&pathFinderMaterialKey(m.isomericSmiles||m.smiles)===key;}catch(_){return false;}
    }))return 'A planned protection reagent or solvent is excluded by the material filters.';
  }
  const assessment=routeStepAssessment(candidate);
  return assessment.blockers.length?assessment.blockers.map(b=>b.message).join(' '):null;
}

function protectionProgramInstall(from, choice, options) {
  const to=protectionProgramMasks(from,choice,true)[0],pg=choice.pg;
  const spec=retroSpec([{smiles:from,role:'reactant'}],pg.protect,pg.protectConditions);
  const verified=retroTryVerify(spec,to);
  if(!verified || verified.minor)throw new Error('No main forward prediction verifies '+pg.label+' installation on this intermediate.');
  const candidate={transform:'managed-install-'+pg.id,name:'Install '+pg.label,outcomeName:'Install '+pg.label,group:'Protecting groups',
    rule:verified.outcome.rule,outcomeRule:verified.outcome.rule,outcomeId:verified.outcome.id,
    compounds:verified.compounds,conditions:verified.conditions,outcome:verified.outcome,product:verified.product,minor:false,
    precursors:[retroPrecursorInfo({smiles:from,role:'reactant'})],reagents:pg.protect,
    labels:reactionConditionLabels(verified.conditions,verified.compounds),
    planning:{kind:'protect',group:pg.label,groupId:pg.id,reason:'Explicitly requested '+pg.label+' mask; installation, main-step survival and final removal are checked separately. Necessity is not inferred.'}};
  const blocked=protectionProgramBlocked(candidate,options);if(blocked)throw new Error(blocked);
  return {from,to,fromKey:pathFinderKey(from),toKey:pathFinderKey(to),precursor:0,candidate};
}

function protectionProgramCreate(startSmiles,targetSmiles,options) {
  const opts=Object.assign({},PATH_FINDER_LIMITS,options||{});
  opts.maxDepth=Math.max(1,Math.min(10,Math.floor(Number(opts.maxDepth)||5)));
  const requested=(Array.isArray(opts.managedProtectingGroups)?opts.managedProtectingGroups:String(opts.managedProtectingGroups||'').split(/[\s,]+/)).map(s=>String(s).trim().toLowerCase()).filter(Boolean);
  const choices=requested.map(protectionProgramChoice);
  if(!requested.length||requested.length>2||new Set(requested).size!==requested.length||choices.some(c=>!c)||new Set(choices.map(c=>c.kind)).size!==choices.length)throw new Error('Request boc, cbz or fmoc for one amine and/or tbs for one alcohol. At most two distinct functional-group kinds are supported.');
  if(opts.allowedProtectingGroups && requested.some(id=>!opts.allowedProtectingGroups.includes(id)))throw new Error('Requested masks conflict with the allowed protecting groups setting.');
  if(opts.maxDepth<2*choices.length+1)throw new Error('Allow at least '+(2*choices.length+1)+' steps for the requested installation, main reaction and removal operations.');
  const start=pathFinderStructure(startSmiles),target=pathFinderStructure(targetSmiles);
  const diagnostics={candidates:0,inventory:0,reagents:0,rules:0,stereo:0,compatibility:0,protection:0,protectionMessages:[],noDisconnections:0,depth:0,branch:0,missingMaterials:[],rejected:[]};
  const job={start:start.smiles,target:target.smiles,options:opts,status:'running',route:[],routes:[],expanded:0,elapsedMs:0,truncated:false,diagnostics,termination:''};
  const orders=choices.length===2?[choices,choices.slice().reverse()]:[choices];
  let active=null,orderIndex=0,pending=[];
  const budget=Math.max(1,Math.min(30000,Number(options&&options.budgetMs)||(opts.maxDepth>5?30000:12000)));
  const nodeLimit=Math.max(1,Math.min(200,Number(options&&options.maxNodes)||(opts.maxDepth>5?200:60)));
  const fail=message=>{diagnostics.protection++;if(diagnostics.protectionMessages.length<8&&!diagnostics.protectionMessages.includes(message))diagnostics.protectionMessages.push(message);};
  job.cancel=()=>{if(active)active.search.cancel();job.status='cancelled';job.termination='cancelled';return job;};
  job.step=sliceMs=>{
    if(job.status!=='running')return job;
    const began=retroNow();
    try {
      if(!active){
        if(job.expanded>=nodeLimit){job.status=job.routes.length?'found':'budget';job.termination='node-limit';job.truncated=true;return job;}
        if(!pending.length && orderIndex>=orders.length){job.status=job.routes.length?'found':'exhausted';job.termination='exhausted';return job;}
        try{
          if(!pending.length){
            const order=orders[orderIndex++],installs=[];let from=start.smiles,targets=[target.smiles];
            for(const choice of order){const link=protectionProgramInstall(from,choice,opts);installs.push(link);from=link.to;targets=[...new Set(targets.flatMap(t=>protectionProgramMasks(t,choice,false)))];if(targets.length>4)throw new Error('Protected target proposals exceed the four-candidate bound.');}
            targets=protectionProgramTargetOrder(from,targets);
            for(const protectedTarget of targets)pending.push({from,protectedTarget,installs,removals:null});
          }
          if(!pending.length)return job;
          const proposal=pending.shift();
          if(!proposal.removals){
            proposal.removals=protectionSequencePlan(proposal.protectedTarget,target.smiles,{maxDepth:choices.length,maxRoutes:2,maxNodes:16,budgetMs:Math.min(250,Math.max(1,budget-job.elapsedMs)),forbiddenRules:opts.forbiddenRules,forbiddenReagents:opts.forbiddenReagents,removeGroups:requested});
            if(!proposal.removals.routes.length){fail('No compatible final removal order: '+proposal.removals.diagnostics.blocked.join(' '));return job;}
          }
          const mainDepth=opts.maxDepth-proposal.installs.length-Math.min(...proposal.removals.routes.map(r=>r.steps.length));
          const search=pathFinderCreate(proposal.from,proposal.protectedTarget,Object.assign({},opts,{maxDepth:mainDepth,maxNodes:nodeLimit-job.expanded,allowedProtectingGroups:[],managedProtectingGroups:[],streamCandidates:true,budgetMs:Math.max(1,budget-job.elapsedMs)}));
          active={search,installs:proposal.installs,removals:proposal.removals};
        }catch(error){fail(error.message);return job;}
      }
      const previousExpanded=active.search.expanded;active.search.step(sliceMs);job.expanded+=active.search.expanded-previousExpanded;
      if(active.search.status!=='running'){
        for(const main of active.search.routes)for(const removal of active.removals.routes){
          const protectedMain=main.map(link=>({...link,candidate:{...link.candidate,planning:{kind:'reaction',group:requested.join(' + '),groupId:requested.join(','),reason:'The explicitly requested masks must remain installed throughout this main-route step.'}}}));
          const route=active.installs.concat(protectedMain,removal.steps);
          if(route.length>opts.maxDepth || route.some(l=>protectionProgramBlocked(l.candidate,opts)||!retroForwardCheck(l.candidate,l.to)))continue;
          const ledger=protectionRouteAudit(route,requested);if(ledger.conflicts.length){fail(ledger.conflicts.join(' '));continue;}
          job.routes.push(route);job.route=job.routes[0];
          if(job.routes.length>=Math.min(5,Number(opts.maxRoutes)||3)){job.status='found';job.termination='route-limit';return job;}
        }
        if(!active.search.routes.length)fail('The protected endpoints were not connected within the encoded main-reaction rules and search limits.');
        job.truncated=job.truncated||active.search.truncated||active.search.status==='budget';active=null;
      }
    } finally {
      job.elapsedMs+=retroNow()-began;
      if(job.status==='running'&&job.elapsedMs>=budget){job.status=job.routes.length?'found':'budget';job.termination='time-limit';job.truncated=true;}
    }
    return job;
  };
  return job;
}

function protectionRouteAudit(route,managedIds) {
  const rows=[],conflicts=[];
  for(const [i,link] of route.entries()) {
    const c=link.candidate||link,before=protectionSequenceCounts(protectionGroups(link.from)),after=protectionSequenceCounts(protectionGroups(link.to));
    const ids=[...new Set([...Object.keys(before),...Object.keys(after)])];
    const report=protectionAssess(link.from,c.compounds,c.conditions);
    const tracked=managedIds || (c.planning&&c.planning.kind==='reaction'?String(c.planning.groupId||'').split(',').filter(Boolean):[]);
    if(!c.planning || !['protect','deprotect'].includes(c.planning.kind))tracked.forEach(id=>{
      if((before[id]||0)!==(after[id]||0))conflicts.push('Step '+(i+1)+': requested '+id+' mask count changes during the main route.');
    });
    const retained=report.sites.filter(s=>(after[s.id]||0)>0);
    retained.filter(s=>s.status!=='compatible').forEach(s=>conflicts.push('Step '+(i+1)+': '+s.label+' retention is '+s.status+'. '+s.reasons.join(' ')));
    rows.push({step:i+1,installed:ids.filter(id=>(after[id]||0)>(before[id]||0)),removed:ids.filter(id=>(before[id]||0)>(after[id]||0)),retained:ids.filter(id=>before[id]&&after[id]),before,after,assessment:report});
  }
  return {status:conflicts.length?'conflict':'no-encoded-conflict',rows,conflicts,scope:'Recognized group counts and encoded survival only. Similar motifs may be native functional groups. Selective installation/removal across repeated sites and universal orthogonality are not inferred.'};
}

function protectionRouteElement(report) {
  const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=String(text);return e;};
  const root=make('details');root.append(make('summary','Whole-route protecting-group ledger · '+report.status),make('p',report.scope));
  const table=make('table'),body=make('tbody'),head=make('tr');['Step','Installed','Retained','Removed'].forEach(x=>head.append(make('th',x)));body.append(head);
  report.rows.forEach(r=>{const tr=make('tr');[r.step,r.installed.join(', ')||'—',r.retained.join(', ')||'—',r.removed.join(', ')||'—'].forEach(x=>tr.append(make('td',x)));body.append(tr);});table.append(body);root.append(table);report.conflicts.forEach(t=>root.append(make('p',t)));return root;
}
