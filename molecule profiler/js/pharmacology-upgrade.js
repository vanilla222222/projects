'use strict';
(function(root){
 const finite=x=>Number.isFinite(x)&&x>0;
 function halfLifePlotInput(snapshot){
  if(!snapshot)return {reason:'Analyze a structure to explore a decay scenario.'};
  const scenario=snapshot.scenarios||{},inputs=scenario.inputs||{};
  const hasParameters=inputs.clearanceLPerHour!=null||inputs.volumeL!=null;
  if(hasParameters){
   if(!finite(scenario.halfLifeHours))return {reason:'Complete both positive clearance and volume inputs; no previous curve is retained.'};
   return {halfLifeHours:scenario.halfLifeHours,sourceLabel:'User-supplied clearance and one-compartment volume',evidenceLabel:'Conditional calculation',contextLabel:'ln(2) × Vd / CL. Supplied parameters are not inferred measurements.'};
  }
  const observations=snapshot.observations||[];
  if(observations.length){
   const row=observations[0],reported=String(row.reported||'');
   if(reported==='20 min (parent aspirin)')return {halfLifeHours:1/3,sourceLabel:'Reported parent aspirin half-life: 20 minutes',evidenceLabel:'Source observation used in an idealized elimination scenario',contextLabel:row.population,sourceUrl:row.sourceUrl};
   const range=/^(\d+(?:\.\d+)?)[–-](\d+(?:\.\d+)?) h$/.exec(reported);
   if(range&&finite(+range[1])&&+range[2]>=+range[1])return {halfLifeHours:(+range[1]+ +range[2])/2,intervalHours:[+range[1],+range[2]],sourceLabel:'Reported '+reported+'; curve uses an illustrative midpoint',evidenceLabel:'Reported range, not an exact individual half-life',contextLabel:row.population,sourceUrl:row.sourceUrl};
   return {reason:'The reported observation ('+reported+') does not define an exact decay curve. Supply clearance and volume for a conditional scenario.'};
  }
  const p=snapshot.predictions&&snapshot.predictions.halfLife;
  if(p&&p.available&&finite(p.value))return {halfLifeHours:p.value,intervalHours:finite(p.lower)&&finite(p.upper)?[p.lower,p.upper]:undefined,sourceLabel:'Exploratory structure-based human IV half-life estimate',evidenceLabel:'Measured-endpoint regression with limited accuracy',contextLabel:'The shaded envelope propagates the input half-life interval; it is not a validated concentration or effect interval.'};
  return {reason:p&&p.reason||'No applicable half-life estimate is available. Supply clearance and volume to explore a conditional scenario.'};
 }
 root.PKResearchUpgrade={halfLifePlotInput};
 if(!root.document||!root.PharmacologyUI)return;
 const doc=root.document,$=id=>doc.getElementById(id),make=(tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
 const pk=$('pk-predictions'),panel=$('prodrug-panel');
 if(!pk||!panel)return;
 const chartHost=make('section');chartHost.id='pk-decay-view';chartHost.className='pk-research-extension';pk.closest('article').append(chartHost);
 const decay=typeof createPKDecayView==='function'?createPKDecayView(chartHost):null;
 const designs=make('section');designs.id='prodrug-candidate-designs';designs.className='pk-research-extension';
 designs.append(make('h3','Quick candidates — start with up to 25 designs'),make('p','Compatible methoxy/alkoxy ethers, alcohols, phenols, acids/carboxylates, amines, thiols and carbonyls share this batch. Ether redesigns release a different OH analogue; parent-recovery designs target the original input. All are unvalidated and separate from documented prodrugs above. A reversible graph edit does not establish enzymatic cleavage, parent release in the body, absorption, safety or efficacy.'));
 const candidateStatus=make('p');candidateStatus.setAttribute('role','status');const cards=make('div');cards.className='quick-candidate-groups';
 const infoControls=make('div');infoControls.className='candidate-info-controls';const orderLabel=make('label','Metabolite order '),metaboliteOrder=make('select');metaboliteOrder.id='candidate-metabolite-order';
 for(const [value,label] of [['priority','Highest rule priority'],['mass','Largest molecular weight']]){const option=make('option',label);option.value=value;metaboliteOrder.append(option);}orderLabel.append(metaboliteOrder);
 const infoStatus=make('p');infoStatus.id='candidate-info-status';infoStatus.setAttribute('role','status');infoControls.append(orderLabel,infoStatus);
 const methods=make('details');methods.className='candidate-info-methods';methods.append(make('summary','About names, BBB estimates and metabolite ranking'),make('p','Names are exact-graph reference-library labels where available; otherwise they are descriptive design labels, not generated IUPAC names. Formula describes the candidate as drawn; isotope labels remain in SMILES.'),make('p','BBB is a local BOILED-Egg-style passive-permeation screen from WLOGP and TPSA, including sulfur and phosphorus contributions. Charged structures are not assessed. It does not predict transporters, efflux, dose or measured brain exposure, and is not a SwissADME result.'),make('p','Top 3 means highest uncalibrated rule priority by default, not measured abundance or the dominant human metabolites. The mass option selects the largest products in the bounded generated pool. Predictions cover up to two generations and 40 total nodes. Fewer than three products are shown when rules or graph checks do not support three; cap and rule failures are reported. Small coproducts may be omitted by the underlying engine. Formal prodrug release targets remain separate.'));
 const bbbSource=make('a','BOILED-Egg model publication');bbbSource.href='https://doi.org/10.1002/cmdc.201600182';bbbSource.target='_blank';bbbSource.rel='noopener noreferrer';methods.append(bbbSource);
 const more=make('button','Generate another 5');more.id='quick-candidates-more';more.type='button';const moreStatus=make('p');moreStatus.id='quick-candidates-more-status';moreStatus.setAttribute('role','status');
 designs.append(candidateStatus,more,moreStatus,infoControls,methods,cards);panel.append(designs);
 let informationToken=0,predictionTimer=null,informationJobs=[],informationResult=null,informationSnapshot=null;
 function cancelInformation(){informationToken++;if(predictionTimer!==null)root.clearTimeout(predictionTimer);predictionTimer=null;}
 function renderMetabolites(host,report){
  host.replaceChildren(make('h5','Top 3 predicted metabolites'));
  if(!report||report.status==='pending'){host.append(make('p','Predicting metabolites…'));return;}
  if(!report.rows?.length){host.append(make('p',report.reason||'No supported metabolites.'));if(report.ruleErrors)host.append(make('small',report.ruleErrors+' reaction rule(s) failed.'));if(report.truncated)host.append(make('small','Product budget reached; only a limited pool was assessed.'));return;}
  const list=make('ol');for(const row of report.rows){const item=make('li');item.append(make('strong',row.name.value),make('span',row.formula+' · '+row.molecularWeight.toFixed(1)+' g/mol'),make('small',row.transformation+' · phase '+row.phase+' · generation '+row.generation));const structure=make('details');structure.append(make('summary','Product SMILES'),make('code',row.smiles));item.append(structure);list.append(item);}host.append(list);
  const flags=[report.order==='mass'?'Largest by molecular weight in generated pool.':'Ranked by rule priority; not measured abundance.'];if(report.truncated)flags.push('Product budget reached; ranking covers a limited pool.');if(report.ruleErrors)flags.push(report.ruleErrors+' reaction rule(s) failed.');if(report.excluded)flags.push(report.excluded+' duplicate or unsupported product(s) excluded.');host.append(make('small',flags.join(' ')));
 }
 function scheduleInformation(){
  cancelInformation();const token=informationToken,jobs=informationJobs.slice(),snapshot=informationSnapshot,result=informationResult;let completed=0;
  if(!jobs.length){infoStatus.textContent='';metaboliteOrder.disabled=true;return;}metaboliteOrder.disabled=false;
  for(const job of jobs){job.row.information.metabolites={status:'pending',rows:[],order:metaboliteOrder.value};renderMetabolites(job.host,job.row.information.metabolites);}
  infoStatus.textContent='Metabolite summaries: 0 / '+jobs.length+' complete.';
  const next=()=>{
   if(token!==informationToken||snapshot!==root.PharmacologyUI.getSnapshot()||snapshot?.prodrugCandidates!==result)return;
   const job=jobs[completed],report=root.CandidateInfo.metabolites(job.row,{order:metaboliteOrder.value});job.row.information.metabolites=report;renderMetabolites(job.host,report);completed++;
   infoStatus.textContent='Metabolite summaries: '+completed+' / '+jobs.length+' complete.';
   if(completed<jobs.length)predictionTimer=root.setTimeout(next,0);else predictionTimer=null;
  };predictionTimer=root.setTimeout(next,0);
 }
 metaboliteOrder.addEventListener('change',scheduleInformation);
 let current=null,moreBusy=false,moreEpoch=0;
 function moreState(){const result=root.PharmacologyUI.getSnapshot()?.prodrugCandidates,count=result?.rows?.length||0;return {busy:moreBusy,count,canGenerate:!!current&&!moreBusy&&count<100&&!!result?.sampling&&!result.sampling.shortfall};}
 function syncMore(){more.disabled=!moreState().canGenerate;doc.dispatchEvent(new CustomEvent('molecule-profiler:candidate-generation',{detail:moreState()}));}
 function generateMore(){
  if(!moreState().canGenerate)return;const record=current,snapshot=root.PharmacologyUI.getSnapshot(),previous=snapshot.prodrugCandidates,token=moreEpoch;moreBusy=true;moreStatus.textContent='Checking up to five additional unique designs…';syncMore();
  root.setTimeout(()=>{if(token!==moreEpoch||record!==current||snapshot!==root.PharmacologyUI.getSnapshot())return;
   try{const generated=root.ProdrugCandidates.generateQuick(record.mol,{limit:Math.min(100,previous.rows.length+5)}),old=new Map(previous.rows.map(r=>[r.smiles,r])),newRows=generated.rows.filter(r=>!old.has(r.smiles));
    const rows=previous.rows.concat(newRows.slice(0,5)),result={...generated,rows,candidates:rows};if(rows.length===previous.rows.length)result.sampling={...(generated.sampling||previous.sampling),shortfall:5};
    updateCandidates(record,result);moreStatus.textContent=(rows.length-previous.rows.length)+' additional unique design(s); '+rows.length+' total. '+(result.sampling?.shortfall?'No more designs passed within the supported sampling bounds.':rows.length>=100?'Session limit of 100 designs reached.':'Existing designs and checks retained.');
    doc.dispatchEvent(new CustomEvent('molecule-profiler:candidates',{detail:{smiles:record.smiles,added:rows.length-previous.rows.length,total:rows.length}}));
   }catch(e){moreStatus.textContent='Additional generation unavailable: '+e.message+'. Existing designs retained.';}finally{moreBusy=false;syncMore();}
  },0);
 }
 more.addEventListener('click',generateMore);root.QuickCandidatesUI={generateMore,getState:moreState};
 function updateCurve(){
  if(!decay)return;
  const snapshot=root.PharmacologyUI.getSnapshot(),input=halfLifePlotInput(snapshot);
  if(!current||!snapshot||snapshot.inputSmiles!==current.smiles||!finite(input.halfLifeHours)){decay.clear(input.reason||'Curve unavailable for this structure.');if(snapshot)snapshot.decayPlot=null;return;}
  decay.setEstimate({...input,subjectKey:current.smiles,subjectLabel:current.name||'Selected parent compound'});
  snapshot.decayPlot=decay.getData();
 }
 chartHost.addEventListener('change',()=>{const s=root.PharmacologyUI.getSnapshot();if(s&&decay)s.decayPlot=decay.getData();});
 function updateCandidates(record,providedResult=null){
  cancelInformation();informationJobs=[];informationResult=null;informationSnapshot=null;infoStatus.textContent='';cards.replaceChildren();const snapshot=root.PharmacologyUI.getSnapshot();
  if(!root.ProdrugCandidates){candidateStatus.textContent='Candidate enumeration is unavailable.';return;}
  try{
   const result=providedResult||root.ProdrugCandidates.generateQuick(record.mol);if(snapshot)snapshot.prodrugCandidates=result;
   const rows=result.rows||result.candidates||[];
   candidateStatus.textContent=(result.reasons||[]).join(' ')||(rows.length+' unvalidated structural candidates generated.');
   if(result.sampling){const sampling=result.sampling;candidateStatus.textContent+=' Target: '+sampling.target+' designs across up to five positions; '+sampling.positionCounts.map(s=>s.element+(s.atom+1)+(s.kind?.includes('ether redesign')?' ('+s.kind+')':'')+': '+s.count).join(' · ')+'.';}
   const groups=new Map();
   rows.forEach((row,index)=>{
    if(!groups.has(row.site.atom)){const group=make('details');group.className='quick-candidate-group';group.open=groups.size===0;const count=rows.filter(r=>r.site.atom===row.site.atom).length;group.append(make('summary','Position '+record.mol.atoms[row.site.atom].element+(row.site.atom+1)+(row.designMode==='ether-redesign'?' · '+row.site.kind:'')+' · '+count+' distinct design'+(count===1?'':'s')));const grid=make('div');grid.className='prodrug-candidate-grid';group.append(grid);cards.append(group);groups.set(row.site.atom,grid);}

    const card=make('article');card.className='prodrug-candidate-card';card.append(make('h4',(index+1)+'. '+row.name));
    let metaboliteHost=null;
    if(root.CandidateInfo){
     const info=root.CandidateInfo.basic(row,{parentName:record.name});row.information=info;
     const facts=make('dl');facts.className='candidate-basic-info';facts.setAttribute('aria-label','Candidate basic information');
     for(const [label,value,kind] of [['Name',info.name.value,info.name.kind],['Formula',info.formula||'Unavailable',info.isotopes?.length?'Isotope labels retained in SMILES.':null],['BBB penetration',info.bbb.label,info.bbb.reason||'Passive-permeation estimate; not measured brain exposure.']]){const term=make('dt',label),definition=make('dd',value);definition.className=label==='Formula'?'candidate-formula':label==='Name'?'candidate-display-name':'candidate-bbb';if(kind)definition.append(make('small',kind));facts.append(term,definition);}card.append(facts);
     const metabolites=make('section');metabolites.className='candidate-metabolites';metaboliteHost=metabolites;informationJobs.push({row,host:metabolites});
    }
    if(typeof depictSvg==='function'){try{const preview=make('div');preview.className='prodrug-candidate-structure';preview.innerHTML=depictSvg(buildMolecule(parseSmiles(row.smiles)),{title:row.name+' — unvalidated design'});card.append(preview);}catch(_){/* SMILES remains available if depiction is unsupported. */}}
    card.append(make('code',row.smiles),make('p','Release hypothesis: '+row.activationHypothesis));
    if(row.designMode==='ether-redesign'){card.append(make('p','DIFFERENT RELEASE TARGET — OH analogue. Original methoxy / alkoxy input recovery is not claimed.'),make('code',row.releaseTargetSmiles),make('p','Two-step formal release graph checked; biological activation remains unvalidated.'));}
    else card.append(make('p','Structural parent recovery: '+(row.parentRecoveryVerified?'checked; biological release remains unverified.':'not established.')));
    if(metaboliteHost)card.append(metaboliteHost);
    const limitations=make('ul');(row.limitations||[]).forEach(text=>limitations.append(make('li',text)));card.append(limitations);
    const sources=row.sources&&row.sources.length?row.sources:[{url:row.sourceUrl,title:'Reaction-class source'}];
    sources.forEach(source=>{const url=source.url||source.sourceUrl;if(!/^https:\/\//.test(url||''))return;const a=make('a',source.title||source.label||'Class reference');a.href=url;a.target='_blank';a.rel='noopener noreferrer';const p=make('p');p.append(a);card.append(p);});
    const button=make('button','Analyze candidate structure');button.type='button';button.dataset.pharmSmiles=row.smiles;button.dataset.pharmName='Unvalidated candidate '+(index+1);card.append(button);groups.get(row.site.atom).append(card);
   });
   informationResult=result;informationSnapshot=snapshot;scheduleInformation();syncMore();
  }catch(error){candidateStatus.textContent='No candidate design inferred: '+error.message;if(snapshot)snapshot.prodrugCandidates={status:'unavailable',rows:[],reason:error.message};}
 }
 const originalRender=root.PharmacologyUI.render;
 root.PharmacologyUI.render=function(record,ranks){
  moreEpoch++;moreBusy=false;moreStatus.textContent='';const changed=!current||current.smiles!==record.smiles;current=null;if(decay&&changed)decay.clear('Updating selected structure…');cards.replaceChildren();candidateStatus.textContent='';
  originalRender(record,ranks);current=record;updateCurve();updateCandidates(record);syncMore();
  const examples=$('prodrug-examples');if(examples&&/No hypothetical derivative/.test(examples.textContent))examples.textContent='No documented prodrug for this exact active graph in the curated set. Generated designs below have a different evidence level.';
  panel.querySelectorAll('.hint').forEach(e=>{if(e.textContent.includes('No novel prodrug structures are generated.'))e.textContent=e.textContent.replace('No novel prodrug structures are generated.','Generated candidates below are hypotheses, not documented prodrugs.');});
 };
 for(const id of ['pk-clearance','pk-volume'])if($(id))$(id).addEventListener('input',updateCurve);
})(globalThis);
