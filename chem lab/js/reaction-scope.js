// Query-level audit of encoded scope. Replaying a rule proves only that the
// current implementation reproduces its branch; it does not validate chemistry.
function reactionScopeAssess(compounds, rawConditions, outcome) {
  const reasons=[],conditions=[],sites=[],limitations=[
    'Supported means reproduced by the current encoded branch, not experimentally validated.',
    'Site lists cover recognized motifs only. Relative rates, product ratios and unencoded substrate effects are not predicted.',
  ];
  const raw=rawConditions&&typeof rawConditions==='object'?rawConditions:{}, normalized=normalizeReactionConditions(raw);
  const note=(code,message,level)=>reasons.push({code,message,level:level||'uncertain'});
  const field=(name,status,message)=>conditions.push({field:name,status,message,value:normalized[name]});
  ['solvents','additives'].forEach(name=>{
    const lookup=name==='solvents'?reactionSolvent:reactionAdditive;
    if(raw[name]!==undefined&&!Array.isArray(raw[name])) {field(name,'uncertain','A list was expected.');note('invalid-'+name,'The recorded '+name+' field is not a list.');return;}
    const values=raw[name]||[],unknown=values.filter(id=>!lookup(id));
    if(unknown.length){field(name,'uncertain','Unrecognized values: '+unknown.map(String).join(', '));note('unknown-'+name,'Unrecognized '+name+' were dropped by normalization: '+unknown.map(String).join(', '));}
    else if(values.length>normalized[name].length&&values.some((id,i)=>id!=='none'&&values.indexOf(id)===i&&!normalized[name].includes(id))) {field(name,'uncertain','Some recorded values exceed the supported limit.');note('truncated-'+name,'Some '+name+' exceed the supported condition limit.');}
    else field(name,'recorded',values.length?'Recognized condition IDs.':'No '+name+' recorded; absence is not a guarantee of a solvent-free or additive-free experiment.');
  });
  ['temperature','pressure'].forEach(name=>{
    const value=raw[name],n=Number(value);
    if(value===undefined||value===null||value===''||!Number.isFinite(n)||n!==normalized[name]){field(name,'uncertain','A missing, invalid or out-of-range value was defaulted, rounded or clamped.');note('normalized-'+name,'The recorded '+name+' is missing or was changed during normalization.');}
    else field(name,'recorded','The supplied numeric value is retained by the model.');
  });
  [['atmosphere',REACTION_ATMOSPHERES],['energy',REACTION_ENERGY]].forEach(([name,list])=>{
    if(!list.some(item=>item.id===raw[name])){field(name,'uncertain','No recognized value was recorded; the model default was used.');note('unknown-'+name,'The '+name+' was not recorded with a recognized ID.');}
    else field(name,'recorded','Recognized condition ID.');
  });
  if(raw.reflux===true&&!normalized.reflux)note('unresolved-reflux','Reflux was requested without a recognized solvent boiling point.');
  ['time','concentration','notes'].forEach(name=>{if(typeof raw[name]==='string'&&raw[name].trim())note('unmodelled-'+name,'The '+name+' text is recorded but is not interpreted as a kinetic, concentration or reagent constraint.');});
  const knownKeys=new Set(Object.keys(defaultReactionConditions()));
  Object.keys(raw).filter(key=>!knownKeys.has(key)).forEach(key=>note('unknown-condition','The condition field '+key+' is not interpreted by this model.'));
  let context=null,entry=null,reproduced=false,descriptor=null;
  const input=Array.isArray(compounds)?compounds:[];
  try {
    const prepared=input.map(c=>c.fragment?c:Object.assign({},c,{fragment:smilesToFragment(c.isomericSmiles||c.smiles)}));
    context=reactionContext(prepared,normalized);
    if(context.has('alanate')&&context.protic)note('alanate-protic-medium','LiAlH4 is incompatible with the recorded water or protic solvent during the reaction. A later aqueous work-up must be recorded separately from the reaction medium.','conflict');
    if(context.has('grignard')||(outcome&&outcome.id==='grignard-formation')){
      const solventConflicts=rxGrignardReactiveSolvents(context);
      if(solventConflicts.length)note('grignard-reactive-medium','Recorded solvent electrophiles ('+solventConflicts.map(s=>s.name).join(', ')+') can react with the organometallic reagent. The intended solvent-independent product is not established.','conflict');
    }
    if(outcome&&rxLoadingConflict(outcome))note('reagent-loading',rxLoadingConflict(outcome),'conflict');
    if(!outcome)note('missing-outcome','No selected outcome is available for a scope audit.');
    else {
      const rule=RX_RULES.find(r=>r.id===outcome.rule)||RX_RULES.find(r=>r.id===outcome.id);
      descriptor=rule&&typeof reactionRuleDescriptor==='function'?reactionRuleDescriptor(rule.id):null;
      if(!rule)note('unknown-rule','The selected outcome is not linked to a registered forward rule.');
      else {
        const productKeys=o=>(o.products||[]).map(p=>moleculeIdentity(p.isomericSmiles||p.smiles).key).sort().join('|');
        const expected=productKeys(outcome);
        reproduced=!!expected&&(rule.run(context)||[]).some(o=>o.id===outcome.id&&productKeys(o)===expected);
        if(!reproduced)note('branch-mismatch','The selected forward-rule branch does not reproduce these product identities under the recorded conditions.','conflict');
      }
      if(!descriptor||!descriptor.references.length)note('missing-evidence','No linked reaction-class source is recorded for this rule.');
      if(!descriptor||/Detailed scope has not yet been curated/.test(descriptor.scope))note('uncurated-scope','Detailed rule scope is not curated; a matched pattern is insufficient for a broader substrate claim.');
      if(typeof rxChemoEntry==='function'&&Array.isArray(outcome.consumes))entry=rxChemoEntry(context,outcome);
      if(!entry&&typeof RX_CHEMOSELECTIVITY!=='undefined')entry=RX_CHEMOSELECTIVITY.find(e=>!e.acylating&&e.tags&&e.tags.every(tag=>context.has(tag)))||null;
      // These exact existing branches enumerate alcohol sites but do not have
      // their own RX_CHEMOSELECTIVITY entry. Reuse their encoded attack class.
      if(!entry&&context.has('dmp')&&(outcome.id==='oxidation-dmp'||outcome.rule==='site-resolved-oxidation'))entry={id:'dmp',attacks:['alcohol']};
    }
    entry=rxChemoConditionEntry(entry,context);
    context.substrates.forEach(s=>{
      const compoundIndex=prepared.indexOf(s.compound),groups=rxChemoGroups(s.graph);
      const original=reactionFragmentGraph(s.compound.fragment),index=new Map(original.atoms.map((a,i)=>[a.id,i+1]));
      Object.keys(groups).forEach(group=>groups[group].forEach(atomIds=>{
        const susceptible=rxChemoSiteSusceptible(s.graph,entry,group,atomIds,s.info);
        sites.push({compoundIndex,substrateSmiles:s.compound.isomericSmiles||s.compound.smiles,group,label:typeof RX_CHEMO_GROUP_LABELS!=='undefined'&&RX_CHEMO_GROUP_LABELS[group]||group,atomIds:atomIds.slice(),atomIndices:atomIds.map(id=>index.get(id)),susceptible});
      }));
    });
  } catch(error) {note('audit-incomplete','The scope audit could not complete: '+error.message);}
  const stereochemistry={products:[],ratio:null,ratioStatus:'not-assigned'};
  if(outcome){
    ['products','minor'].forEach(role=>(outcome[role]||[]).forEach((product,index)=>{
      if(product.stereo)stereochemistry.products.push({role,index,kind:product.stereo.kind,text:product.stereo.text||''});
    }));
    if(stereochemistry.products.some(p=>['racemic','diastereomers'].includes(p.kind)))note('stereochemical-mixture','The encoded outcome reports a racemic or diastereomeric mixture; a single drawn structure does not establish stereopure preparation.');
    if(stereochemistry.products.some(p=>p.kind==='relative'))note('relative-stereochemistry','Only relative stereochemistry is recorded; absolute configuration is not established.');
    if(Array.isArray(outcome.ratio)){
      stereochemistry.ratio=outcome.ratio.slice();stereochemistry.ratioStatus='heuristic';
      note('heuristic-stereoratio','The displayed product ratio is an encoded heuristic, not a substrate-specific measured or calculated selectivity.');
    }
  }
  const competing=outcome&&outcome.chemoselectivity&&outcome.chemoselectivity.competing||[];
  const partial=!!(outcome&&outcome.partialConversion),susceptible=sites.filter(s=>s.susceptible);
  let selectivityStatus='not-assessed';
  if(partial){selectivityStatus='unestablished';note('partial-selectivity','The selected site is a partial-conversion alternative. No kinetic preference or selective preparation is established.');}
  else if(competing.length){selectivityStatus='conflict';note('competing-sites','The encoded rule leaves '+competing.map(s=>s.group+' ('+s.count+')').join(', ')+' susceptible to further reaction.','conflict');}
  else if(entry&&susceptible.length>1){selectivityStatus='multiple-sites';note('multiple-sites','Multiple recognized susceptible sites are present. The reproduced bulk product does not establish a kinetic site preference.');}
  else if(entry&&susceptible.length===1)selectivityStatus='single-recognized-site';
  else note('selectivity-unassessed','No applicable susceptible-site model is encoded for this branch; absence of flagged competition is not established selectivity.');
  const status=reasons.some(r=>r.level==='conflict')?'conflict':reasons.length?'uncertain':'supported';
  return {status,reasons,conditions,normalizedConditions:normalized,rule:descriptor,modelReproduced:reproduced,sites,stereochemistry,
    selectivity:{status:selectivityStatus,selected:outcome&&outcome.site?Object.assign({},outcome.site):null,susceptibleCount:susceptible.length,competing},limitations};
}

function reactionScopeElement(report) {
  const make=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);return el;};
  const box=make('details');box.className='rx-evidence reaction-scope';
  const labels={supported:'Reproduced encoded scope',uncertain:'Scope needs review',conflict:'Encoded conflict'};
  box.append(make('summary','Substrate and condition scope · '+(labels[report.status]||labels.uncertain)));
  box.append(make('p','Selected forward branch reproduced: '+(report.modelReproduced?'yes':'no')+'. Site assessment: '+report.selectivity.status+'.'));
  const list=make('ul');report.reasons.forEach(r=>list.append(make('li',r.message)));box.append(list);
  const conditionList=make('ul');report.conditions.forEach(c=>conditionList.append(make('li',c.field+': '+c.status+'. '+c.message)));box.append(make('strong','Recorded conditions'),conditionList);
  if(report.selectivity.selected)box.append(make('p','Selected inspection site: '+report.selectivity.selected.label+' in '+report.selectivity.selected.substrateSmiles+'.'));
  const siteList=make('ul');report.sites.forEach(s=>siteList.append(make('li','Input '+(s.compoundIndex+1)+' · '+s.label+' · atoms '+s.atomIndices.join(', ')+(s.susceptible?' · susceptible in the encoded reagent model':''))));box.append(make('strong','Recognized input sites'),siteList);
  report.limitations.forEach(text=>box.append(make('p',text)));return box;
}
