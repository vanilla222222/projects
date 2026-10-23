'use strict';
(function(root){
 const parse=s=>buildMolecule(parseSmiles(s)),exact=(a,b)=>Pharmacology.exactGraph(a,b);
 const CATALOG=[
  {name:'Formaldehyde',smiles:'C=O',concern:'NIOSH identifies irritation and a potential occupational carcinogenic hazard.',source:{title:'NIOSH Pocket Guide: Formaldehyde',url:'https://www.cdc.gov/niosh/npg/npgd0293.html'}},
  {name:'Methanol',smiles:'CO',concern:'NIOSH identifies nervous-system and visual toxicity hazards.',source:{title:'NIOSH Pocket Guide: Methyl alcohol',url:'https://www.cdc.gov/niosh/npg/npgd0397.html'}},
  {name:'Hydrazine',smiles:'NN',concern:'NIOSH identifies systemic toxicity and a potential occupational carcinogenic hazard.',source:{title:'NIOSH Pocket Guide: Hydrazine',url:'https://www.cdc.gov/niosh/npg/npgd0329.html'}},
  {name:'Hydroxylamine',smiles:'NO',concern:'ICSC identifies corrosive effects and effects on blood.',source:{title:'ILO/WHO International Chemical Safety Card 0661: Hydroxylamine',url:'https://chemicalsafety.ilo.org/dyn/icsc/showcard.display?p_card_id=0661&p_lang=en&p_version=1'}}
 ];
 const catalogGraphs=CATALOG.map(c=>parse(c.smiles));
 function fragments(route){
  const rows=[];let removedTarget=false;
  for(const p of route.frontier){
   const mol=parse(p.smiles);
   if(!removedTarget&&exact(mol,parse(route.targetSmiles))){removedTarget=true;continue;}
   const prior=rows.find(r=>exact(parse(r.smiles),mol));if(prior){prior.equivalents++;continue;}
   // Hazard identity ignores isotopic labels only. Charge is not neutralized.
   const unlabelled={...mol,atoms:mol.atoms.map(a=>({...a,isotope:null}))};
   const index=catalogGraphs.findIndex(g=>exact(g,unlabelled)),entry=CATALOG[index];
   rows.push({smiles:p.smiles,equivalents:1,catalogMatch:!!entry,name:entry?.name||'Unlisted formal product',concern:entry?.concern||'Not covered by this four-species concern catalog; no safety conclusion is available.',source:entry?.source||null,matchScope:entry?'Connectivity, charge and supported stereo match; isotopic labels ignored for hazard lookup. Isotope-specific effects are not assessed.':null});
  }
  return rows;
 }
 function findRoute(smiles,targetSmiles,limits={}){
  const maxStates=Math.max(1,Math.min(32,Math.floor(limits.maxStates||32))),maxAttempts=96;
  const initial=root.ProdrugExplorer.start(smiles,targetSmiles),queue=[initial],seen=new Set([smiles]);let visited=0,attempts=0,truncated=false,depthLimit=false;
  while(queue.length&&visited<maxStates&&attempts<maxAttempts){
   const route=queue.shift();visited++;
   if(route.steps.length>=4){depthLimit=true;continue;}
   for(const option of root.ProdrugExplorer.options(route)){
    if(attempts>=maxAttempts){truncated=true;break;}attempts++;
    try{
     const next=root.ProdrugExplorer.advance(route,option);
     if(next.targetPresent)return {status:'found',steps:next.steps.length,route:next,visited,attempts,maxStates,maxSteps:4,reason:'A formal route reaches the exact parent within the exploration bounds. This is not a dominant-pathway or rate prediction.'};
     const key=next.frontier.map(p=>p.smiles).sort().join('|');
     if(!seen.has(key)){seen.add(key);if(queue.length<maxStates)queue.push(next);else truncated=true;}
    }catch(_){/* A matched motif may fail product validation; it is not a supported step. */}
   }
  }
  const bounded=truncated||queue.length>0||depthLimit;
  return {status:bounded?'bounded-unresolved':'no-supported-route',steps:null,route:null,visited,attempts,maxStates,maxSteps:4,reason:bounded?'The parent was not reached within the four-step / '+maxStates+'-state / 96-attempt search bounds. Unexplored or unsupported routes may exist.':'No implemented sequence reached the supplied parent charge, isotope and stereo state. Missing rules or protonation steps may explain the gap.'};
 }
 function evidence(parent,candidate,relationships,sources){
  for(const r of relationships){
   if(r.evidenceType!=='documented_relationship'||!/^https:\/\//.test(r.sourceUrl||''))continue;
   try{if(exact(candidate,parse(r.prodrug.smiles))&&exact(parent,parse(r.active.smiles)))return {kind:'exact-curated-pair',order:0,label:'Exact curated compound pair',relationship:{prodrug:r.prodrug.name,parent:r.active.name,activation:r.activation},sources:[{title:r.prodrug.name+' → '+r.active.name,url:r.sourceUrl}],scope:'Both complete graphs match a stored compound relationship. This is a literature match, not new experimental validation or evidence about exposure or benefit.'};}catch(_){}
  }
  const references=(sources||[]).filter(s=>/^https:\/\//.test(s.url||''));
  return {kind:references.length?'class-precedent':'no-linked-source',order:references.length?1:2,label:references.length?'Reaction-class precedent only':'No linked class source',sources:references,scope:'No exact candidate/parent pair was found in the curated relationship set. Class sources do not validate this individual design.'};
 }
 function assess(input,candidates,options={}){
  const prepared=root.ProdrugCandidates.prepareParent(input),rows=[],excluded=[];
  if(!prepared)return {version:1,rows,excluded,reason:'A supported input structure is required.'};
  const relationships=options.relationships||(typeof PHARMACOLOGY_EVIDENCE!=='undefined'?PHARMACOLOGY_EVIDENCE.relationships:[]),parent=prepared.mol;
  const handles=root.ProdrugCandidates.sites(input),compared=root.ProdrugExplorer.comparison(input,candidates);
  const seen=[];
  for(const row of candidates.slice(0,12)){
   try{
    if(!row?.parentRecoveryVerified||row.experimentalValidation!==false)throw Error('Candidate has no verified structural recovery record.');
    const mol=parse(row.smiles);if(seen.some(m=>exact(m,mol)))continue;
    const recovery=root.ProdrugCandidates.recoverParent(row.smiles,row.cleavage,input);if(!recovery.verified)throw Error('Exact recovery of this input was not verified.');
    seen.push(mol);
    const route=findRoute(row.smiles,recovery.smiles,options.limits),byproducts=route.route?fragments(route.route):null;
    const startPaths=root.CleavableGroups.pathways(mol),first=route.route?.steps[0].pathway;
    const alternatives=startPaths.filter(p=>!first||p.id!==first.id).filter((p,i,all)=>all.findIndex(x=>x.kind===p.kind&&JSON.stringify(x.cutBonds)===JSON.stringify(p.cutBonds))===i);
    const otherHandles=handles.filter(s=>s.atom!==row.site?.atom).map(s=>({atom:s.atom,element:s.element,kind:s.kind,sameKind:s.kind===row.site?.kind}));
    const properties=compared.rows.find(c=>c.role==='candidate'&&exact(parse(c.smiles),mol));
    rows.push({id:row.id,name:row.name,smiles:row.smiles,site:row.site,evidence:evidence(parent,mol,relationships,row.sources),route,byproducts,
     concernMatches:byproducts?byproducts.filter(p=>p.catalogMatch).length:null,unlistedProducts:byproducts?byproducts.filter(p=>!p.catalogMatch).length:null,
     properties:properties?{values:properties.values,delta:properties.delta}:null,
     competing:{otherHandles,otherHandleCount:otherHandles.length,sameKindHandleCount:otherHandles.filter(s=>s.sameKind).length,alternativeTransformations:alternatives.map(p=>({kind:p.kind,label:p.label,cutBonds:p.cutBonds})),alternativeCount:alternatives.length,sameClassAlternativeCount:first?alternatives.filter(p=>p.kind===first.kind).length:null,scope:'Other rule matches and available handles, not measured competition, selectivity or reaction probabilities.'},
     experimentalValidation:false,scope:'Independent review criteria; no combined score, clinical priority, dose, safety level or ADME benefit is inferred.'});
   }catch(e){excluded.push({name:row?.name||'Candidate',reason:e.message});}
  }
  return {version:1,inputSmiles:input.smiles,normalization:prepared.normalization,rows,excluded,concernCatalog:{version:1,reviewed:'2026-10-23',species:CATALOG.map(c=>c.name),scope:'Limited chemical-identity catalog. Concern counts are coverage observations, not severity, exposure or safety scores.'},scope:'Research review criteria, not a validated ranking model. Routes are bounded structural searches. Byproduct concerns are a limited chemical-identity lookup, not toxicology or exposure predictions.'};
 }
 function sort(rows,key='evidence',direction='asc'){
  const getter={evidence:r=>r.evidence.order,steps:r=>r.route.steps,concerns:r=>r.concernMatches,alternatives:r=>r.competing.alternativeCount,handles:r=>r.competing.otherHandleCount,mw:r=>Math.abs(r.properties?.delta?.mw),tpsa:r=>Math.abs(r.properties?.delta?.tpsa),logp:r=>Math.abs(r.properties?.delta?.logp)}[key];
  if(!getter)return rows.slice();const sign=direction==='desc'?-1:1;
  return rows.map((row,index)=>({row,index})).sort((a,b)=>{
   const av=getter(a.row),bv=getter(b.row),an=!Number.isFinite(av),bn=!Number.isFinite(bv);
   if(an||bn)return an===bn?a.index-b.index:an?1:-1;
   return sign*(av-bv)||a.index-b.index;
  }).map(x=>x.row);
 }
 root.ProdrugPriority={assess,findRoute,sort,catalog:CATALOG};
})(globalThis);
