'use strict';
(function(root){
 const $=id=>document.getElementById(id),esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const link=(url,text)=>'<a href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">'+esc(text)+'</a>';
 const number=x=>Number.isFinite(x)?Number(x.toPrecision(3)).toString():'Unavailable';
 let current=null,snapshot=null;
 function read(id){const s=$(id).value.trim();return s===''?null:Number(s);}
 function scenarios(){
  if(!current)return;
  const pka=read('pk-pka'),ph=read('pk-ph'),kind=$('pk-ion-kind').value,cl=read('pk-clearance'),vd=read('pk-volume');
  snapshot.scenarios={inputs:{pka,ph,kind,pkaSource:$('pk-pka-source').value,clearanceLPerHour:cl,volumeL:vd},source:'User-supplied parameters, not inferred measurements'};
  $('pk-profile-details').hidden=true;$('pk-profile').tBodies[0].textContent='';
  if(pka===null)$('pk-ion-result').textContent='Enter a sourced pKa to calculate a conditional ionization/logD scenario. No pKa is guessed from a generic amine or acid group.';
  else try{const result=Pharmacology.ionization(pka,ph,kind,current.d.logp);snapshot.scenarios.ionization=result;
   const profile=Pharmacology.ionizationProfile(pka,kind,current.d.logp);snapshot.scenarios.phProfile=profile;
   $('pk-profile').tBodies[0].innerHTML=profile.map(p=>'<tr><th scope="row">'+p.ph+'</th><td>'+number(100*p.neutralFraction)+'</td><td>'+number(p.logD)+'</td></tr>').join('');$('pk-profile-details').hidden=false;
   $('pk-ion-result').textContent='Neutral fraction ≈ '+number(100*result.neutralFraction)+'%; conditional logD ≈ '+number(result.logD)+'. '+result.scope;
  }catch(e){$('pk-ion-result').textContent=e.message;}
  if(cl===null||vd===null)$('pk-half-scenario').textContent='Enter both values for a one-compartment half-life scenario.';
  else try{const h=Pharmacology.halfLife(cl,vd);snapshot.scenarios.halfLifeHours=h;$('pk-half-scenario').textContent='One-compartment scenario: '+number(h)+' h (ln(2) × Vd / CL). This is conditional on supplied parameters and is not an observed terminal half-life.';}catch(e){$('pk-half-scenario').textContent=e.message;}
 }
 function render(record,ranks){
  if(current!==record){$('pk-profile-details').open=false;for(const id of ['pk-pka','pk-pka-source','pk-clearance','pk-volume'])$(id).value='';}
  current=record;
  if(!record.pkPredictions){const feature=PKFeatures.features(record.mol,record.d,fingerprint(record.mol,'ecfp4s'));
   record.pkPredictions=Object.fromEntries(Object.entries(PK_MODELS.models).map(([id,m])=>[id,PKApplicability.predict(m,feature,record.mol)]));}
  const predictions=record.pkPredictions;
  const observed=PHARMACOLOGY_EVIDENCE.halfLifeObservations.filter(r=>Pharmacology.exactGraph(record.mol,buildMolecule(parseSmiles(r.compound.smiles))));
  $('pk-predictions').innerHTML=Object.entries(PK_MODELS.models).map(([id,model])=>{
   const p=predictions[id],metric=model.metrics;
   if(id==='halfLife'&&observed.length)return '<div class="filter"><div class="name">Reported half-life — source context</div><div class="verdict">'+esc(observed[0].reported)+'</div><div class="why">'+esc(observed[0].population)+'. '+link(observed[0].sourceUrl,'Source')+'. A generic model is not substituted for this sourced observation.</div></div>';
   return '<div class="filter"><div class="name">'+(id==='halfLife'?'Exploratory elimination half-life':'Estimated logD at pH 7.4')+'</div>'
    +'<div class="verdict">'+(p.available?number(p.value)+(id==='halfLife'?' h':''):'Unavailable')+'</div>'
    +'<div class="why">'+(p.available?'Calibration-residual interval: '+number(p.lower)+'–'+number(p.upper)+(id==='halfLife'?' h':'')+'. ':esc(p.reason)+' ')
    +'Held-out '+(id==='halfLife'?'geometric mean fold error '+number(10**metric.mae)+'×':'MAE '+number(metric.mae))+'; R² '+number(metric.r2)+'. '
    +(id==='halfLife'?'Limited accuracy; trained on a third-party mirror of a human IV dataset. ':'')
    +'Not a patient-specific prediction.</div></div>';
  }).join('');
  $('pk-observations').innerHTML=observed.length?'<strong>Reported observations (separate from the model):</strong><ul>'+observed.map(r=>'<li>'+esc(r.reported)+' — '+esc(r.population)+'; '+link(r.sourceUrl,'label source')+'</li>').join('')+'</ul>':'No exact-graph clinical half-life observation in the small curated set.';
  const relationships=Pharmacology.prodrugs(record.mol,PHARMACOLOGY_EVIDENCE);
  function relationship(r){return '<li><strong>'+esc(r.prodrug.name)+' → '+esc(r.active.name)+'</strong>: '+esc(r.activation)+'. '+esc(r.note)+' '+link(r.sourceUrl,'Relationship source')+' · '+link(r.prodrug.sourceUrl,'Prodrug structure')+' · '+link(r.active.sourceUrl,'Active structure')+' <button type="button" data-pharm-smiles="'+esc(r.prodrug.smiles)+'" data-pharm-name="'+esc(r.prodrug.name)+'">Analyze prodrug</button> <button type="button" data-pharm-smiles="'+esc(r.active.smiles)+'" data-pharm-name="'+esc(r.active.name)+'">Analyze active</button></li>';}
  $('prodrug-status').textContent=relationships.asProdrug.length?'Documented prodrug relationship matched to the supplied graph.':'No curated exact-graph prodrug match. Status unknown; this is not a negative prodrug prediction.';
  $('prodrug-matches').innerHTML=relationships.asProdrug.length?'<ul>'+relationships.asProdrug.map(relationship).join('')+'</ul>':'';
  $('prodrug-related').textContent=relationships.relatedProdrugForms.length?'Related heavy-atom connectivity: '+relationships.relatedProdrugForms.map(r=>r.prodrug.name).join(', ')+'. Charge, hydrogen counts or stereochemistry differs. These are not confirmed matches and their observations/actions are not transferred to the query.':'';
  $('prodrug-examples').innerHTML=relationships.examplesForActive.length?'<ul>'+relationships.examplesForActive.map(relationship).join('')+'</ul>':'No documented prodrug for this exact active graph in the current set. No hypothetical derivative is invented.';
  $('prodrug-all').innerHTML='<ul>'+PHARMACOLOGY_EVIDENCE.relationships.map(relationship).join('')+'</ul>';
  const curatedReferences=root.CuratedReferences?.matches(record.mol)||[];
  if(root.CuratedReferences){let host=$('curated-reference-evidence');if(!host){const section=document.createElement('section'),heading=document.createElement('h3');heading.textContent='Curated reference evidence';host=document.createElement('div');host.id='curated-reference-evidence';section.append(heading,host);$('prodrug-panel').append(section);}root.CuratedReferences.render(host,curatedReferences);}
  const motifs=StructuralEvidence.detect(record.mol);
  $('prodrug-sites').textContent=motifs.includes('ester')||motifs.includes('amide')?'A potentially cleavable ester/amide motif is present. This is a structural observation only: it does not establish biological cleavage, conversion speed, an active product or prodrug status.':'No ester/amide clue in this limited vocabulary. Other bioactivation mechanisms remain possible.';
  const effects=Pharmacology.effects(ranks,RECEPTOR_REFERENCE_CATALOG);
  $('effect-context').innerHTML=effects.length?effects.map(e=>'<details><summary>'+esc(e.target)+' — conditional functional context</summary><p>'+esc(e.mechanism)+'</p><p><strong>If activated:</strong> '+esc(e.activation)+'</p><p><strong>If blocked:</strong> '+esc(e.blockade)+'</p><p>'+esc(e.scope)+' '+e.sources.map(s=>link(s.url,s.label)).join(' · ')+'</p></details>').join(''):'No receptor context linked to the leading references in this scope. Other targets and effects remain unassessed.';
  snapshot={schemaVersion:1,inputSmiles:record.smiles,name:record.name,chemistryEligibility:PKApplicability.assess(record.mol),modelVersion:'pk-exploratory-v1',modelSourceSha256:PK_MODELS.sourceSha256,
   modelInformation:Object.fromEntries(Object.entries(PK_MODELS.models).map(([id,m])=>[id,{version:m.version,units:m.units,metrics:m.metrics,sourceUrl:m.sourceUrl,transportUrl:m.transportUrl,inputSha256:m.inputSha256}])),
   predictions,preferredHalfLifeEvidence:observed.length?'source_observation':'experimental_model',observations:observed,curatedReferences,prodrugs:relationships,conditionalEffects:effects,queryMotifs:motifs,
   interpretation:'Experimental regressions, documented exact-graph relationships and conditional receptor biology are distinct evidence types. No individual effects, BBB delivery or functional action inferred from motifs or binding similarity.'};
  $('prodrug-enumeration').textContent='';
  const key=$('met-depth').value+'/'+$('met-phase').value+'/'+$('met-budget').value;
  if(record.metabolism?.has(key))updateMetabolism(record,record.metabolism.get(key));
  scenarios();
 }
 function updateMetabolism(record,tree){
  if(!snapshot?.prodrugs||snapshot.inputSmiles!==record.smiles)return;
  snapshot.prodrugEnumeration=snapshot.prodrugs.asProdrug.map(r=>({active:r.active.name,
   enumerated:tree.metabolites.some(node=>Pharmacology.exactGraph(node.mol,buildMolecule(parseSmiles(r.active.smiles)))),
   scope:'Checks whether a documented product is reachable under current heuristic settings; absence is an enumeration gap, not evidence against known conversion.'}));
  $('prodrug-enumeration').textContent=snapshot.prodrugEnumeration.map(r=>r.active+(r.enumerated?' is generated by the current enumeration.':' is documented but not generated under these settings; a heuristic coverage gap.')).join(' ');
 }
 for(const id of ['pk-pka','pk-pka-source','pk-ph','pk-ion-kind','pk-clearance','pk-volume'])$(id).addEventListener('input',scenarios);
 $('prodrug-panel').addEventListener('click',event=>{const button=event.target.closest('button[data-pharm-smiles]');if(!button)return;$('smiles-input').value=button.dataset.pharmName+', '+button.dataset.pharmSmiles;$('run').click();});
 $('pharmacology-export').addEventListener('click',()=>{if(!snapshot)return;const b=new Blob([JSON.stringify(snapshot,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download='pharmacology-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 function safeRender(record,ranks){try{render(record,ranks);}catch(error){
  $('pk-profile-details').hidden=true;$('pk-profile').tBodies[0].textContent='';
  $('pk-ion-result').textContent='Ionization scenario unavailable.';$('pk-half-scenario').textContent='Half-life scenario unavailable.';
  current=record;snapshot={schemaVersion:1,inputSmiles:record.smiles,error:String(error.message),interpretation:'Additional prediction/evidence module unavailable; no result inferred.'};
  for(const id of ['pk-predictions','pk-observations','prodrug-matches','prodrug-examples','prodrug-related','prodrug-all','prodrug-enumeration','prodrug-sites','effect-context'])$(id).textContent='';
  $('pk-predictions').textContent='Additional predictors unavailable: '+error.message;
  $('prodrug-status').textContent='Evidence module unavailable; no prodrug classification made.';
 }}
 const api={render:safeRender,updateMetabolism,getSnapshot:()=>snapshot};root.PharmacologyUI=api;
})(globalThis);
