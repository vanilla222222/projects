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
 designs.append(make('h3','Generated research candidates — up to five'),make('p','These are unvalidated structural designs, separate from documented prodrugs above. A reversible graph edit does not establish enzymatic cleavage, parent release in the body, absorption, safety or efficacy.'));
 const candidateStatus=make('p');candidateStatus.setAttribute('role','status');const cards=make('div');cards.className='prodrug-candidate-grid';designs.append(candidateStatus,cards);panel.append(designs);
 let current=null;
 function updateCurve(){
  if(!decay)return;
  const snapshot=root.PharmacologyUI.getSnapshot(),input=halfLifePlotInput(snapshot);
  if(!current||!snapshot||snapshot.inputSmiles!==current.smiles||!finite(input.halfLifeHours)){decay.clear(input.reason||'Curve unavailable for this structure.');if(snapshot)snapshot.decayPlot=null;return;}
  decay.setEstimate({...input,subjectKey:current.smiles,subjectLabel:current.name||'Selected parent compound'});
  snapshot.decayPlot=decay.getData();
 }
 chartHost.addEventListener('change',()=>{const s=root.PharmacologyUI.getSnapshot();if(s&&decay)s.decayPlot=decay.getData();});
 function updateCandidates(record){
  cards.replaceChildren();const snapshot=root.PharmacologyUI.getSnapshot();
  if(!root.ProdrugCandidates){candidateStatus.textContent='Candidate enumeration is unavailable.';return;}
  try{
   const result=root.ProdrugCandidates.generate(record.mol,{limit:5});if(snapshot)snapshot.prodrugCandidates=result;
   const rows=result.rows||result.candidates||[];
   candidateStatus.textContent=rows.length+' unvalidated candidate'+(rows.length===1?'':'s')+' generated. '+(result.reasons||[]).join(' ');
   rows.forEach((row,index)=>{
    const card=make('article');card.className='prodrug-candidate-card';card.append(make('h4',(index+1)+'. '+row.name));
    if(typeof depictSvg==='function'){try{const preview=make('div');preview.className='prodrug-candidate-structure';preview.innerHTML=depictSvg(buildMolecule(parseSmiles(row.smiles)),{title:row.name+' — unvalidated design'});card.append(preview);}catch(_){/* SMILES remains available if depiction is unsupported. */}}
    card.append(make('code',row.smiles),make('p','Release hypothesis: '+row.activationHypothesis),make('p','Structural parent recovery: '+(row.parentRecoveryVerified?'checked; biological release remains unverified.':'not established.')));
    const limitations=make('ul');(row.limitations||[]).forEach(text=>limitations.append(make('li',text)));card.append(limitations);
    const sources=row.sources&&row.sources.length?row.sources:[{url:row.sourceUrl,title:'Reaction-class source'}];
    sources.forEach(source=>{const url=source.url||source.sourceUrl;if(!/^https:\/\//.test(url||''))return;const a=make('a',source.title||source.label||'Class reference');a.href=url;a.target='_blank';a.rel='noopener noreferrer';const p=make('p');p.append(a);card.append(p);});
    const button=make('button','Analyze candidate structure');button.type='button';button.dataset.pharmSmiles=row.smiles;button.dataset.pharmName='Unvalidated candidate '+(index+1);card.append(button);cards.append(card);
   });
  }catch(error){candidateStatus.textContent='No candidate design inferred: '+error.message;if(snapshot)snapshot.prodrugCandidates={status:'unavailable',rows:[],reason:error.message};}
 }
 const originalRender=root.PharmacologyUI.render;
 root.PharmacologyUI.render=function(record,ranks){
  const changed=!current||current.smiles!==record.smiles;current=null;if(decay&&changed)decay.clear('Updating selected structure…');cards.replaceChildren();candidateStatus.textContent='';
  originalRender(record,ranks);current=record;updateCurve();updateCandidates(record);
  const examples=$('prodrug-examples');if(examples&&/No hypothetical derivative/.test(examples.textContent))examples.textContent='No documented prodrug for this exact active graph in the curated set. Generated designs below have a different evidence level.';
  panel.querySelectorAll('.hint').forEach(e=>{if(e.textContent.includes('No novel prodrug structures are generated.'))e.textContent=e.textContent.replace('No novel prodrug structures are generated.','Generated candidates below are hypotheses, not documented prodrugs.');});
 };
 for(const id of ['pk-clearance','pk-volume'])if($(id))$(id).addEventListener('input',updateCurve);
})(globalThis);
