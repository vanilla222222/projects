'use strict';
(function(root){
 const text=v=>v==null?'':String(v);
 const species=v=>/^(human|homo sapiens)$/i.test(text(v))?'Homo sapiens':text(v)||'Not reported';
 const metric=e=>{if(e.metric)return e.metric;const found=[...new Set((e.endpoint||'').match(/\b(?:EC50|IC50|Ki|Kd)\b/g)||[])];return found.length===1?found[0]:'';};
 function primaryReferences(source){
  const candidates=[...(Array.isArray(source.originalReferences)?source.originalReferences:[]),source.originalReference],out=new Set();
  for(const candidate of candidates){if(typeof candidate!=='string')continue;try{const url=new URL(candidate.trim());if(url.protocol==='https:'&&url.hostname&&!url.username&&!url.password)out.add(url.href);}catch(_){}}
  return [...out];
 }
 function createModel({entries,catalog,curated,data,reviewData={decisions:[]}}){
  const byName=new Map(entries.map(e=>[e.name,e])),cache=new WeakMap();
  function observations(entry){
   if(cache.has(entry))return cache.get(entry);
   const out=[];
   for(const r of curated.forEntry(entry,data)){
    const ci=r.compounds.findIndex(c=>c.libraryNames.includes(entry.name));if(ci<0)continue;
    for(const [i,e]of r.evidence.entries()){
     // Multi-compound records retain participant-specific values, never their partner's.
     const values=Array.isArray(e.values)?e.values.filter(v=>v.compound===ci):[null];
     for(const v of values)out.push({id:r.id+':'+i+':'+ci,recordId:r.id,compoundIndex:ci,kind:e.kind,target:e.receptorId||e.target||'',targetLabel:e.target||e.receptorId||'',species:e.kind==='measured_property'?null:species(e.species),hostSpecies:e.kind==='measured_property'?null:e.hostSpecies||'Not reported',action:e.action||'',assay:e.kind==='measured_property'?e.assay||null:e.assay||'Not reported',metric:e.kind==='measured_property'?e.metric||e.target||'Measured property':metric(e),value:v?v.value:e.value,relation:v?v.relation:e.relation,unit:v?v.unit:e.unit,sd:e.sd,lower:e.lower,upper:e.upper,uncertainty:e.uncertainty,uncertaintyKind:e.uncertaintyKind,originalReference:e.originalReference||'',originalReferences:primaryReferences(e),originalReferenceLabel:e.experimentalReference||e.originalReferenceLabel||'',referenceStatus:e.referenceStatus||'',efficacy:e.efficacy,conditions:e.conditions,testedForm:e.kind==='measured_property'?e.testedForm||null:e.testedForm||'Not reported',endpoint:e.endpoint||'',sourceUrl:e.sourceUrl,sourceSha256:e.sourceSha256||'',sourceLocation:e.sourceLocation||'',context:e.context||r.note||'',role:r.compounds[ci].role,negativeControl:(r.relationships||[]).some(l=>l.kind==='negative_control'&&l.to===ci),raw:e});
    }
   }
   for(const [i,e]of catalog.receptorEvidence(entry).entries()){
    if(e.provider==='ChEMBL curated action classification'){
     if(e.classificationTransferStatus!=='exact_source_graph'||e.librarySmiles!==entry.smiles||!['agonist','antagonist'].includes(e.actions?.[0]))continue;
     out.push({id:'import:chembl-classification:'+e.activityId+':'+e.receptorId,kind:'imported_classification',provider:e.provider,target:e.receptorId,targetLabel:e.receptorId,species:species(e.species),hostSpecies:'Not reported',action:e.actions[0],actions:e.actions,sourceAction:e.sourceAction,assay:e.assay||'Not reported',testedForm:'Not reported',endpoint:'Explicit source action classification; no functional measurement assigned',sourceUrl:e.sourceUrl,sourceSha256:e.sourceSha256,sourceFile:e.sourceFile,sourceLocation:e.sourceLocation,sourceRelease:e.sourceRelease,activityId:e.activityId,assayId:e.assayId,documentId:e.documentId,documentJournal:e.documentJournal,documentYear:e.documentYear,chemblMoleculeId:e.chemblMoleculeId,chemblTargetId:e.chemblTargetId,documentUrl:e.documentUrl,moleculeUrl:e.moleculeUrl,targetUrl:e.targetUrl,activityUrl:e.activityUrl,context:e.context,raw:e});
     continue;
    }
    if(e.provider==='ChEMBL'){
     // Source graph equivalence is checked by the builder. The stored-graph
     // witness also prevents stale generated rows attaching to an edited entry.
     if(e.numericalTransferStatus!=='exact_source_graph'||e.librarySmiles!==entry.smiles)continue;
     const typed=['Ki','Kd'].includes(e.metric)&&e.relation==='='&&e.unit==='nM'&&Number.isFinite(e.value)&&e.value>0;
     if(!typed)continue;
     out.push({id:'import:chembl:'+e.activityId+':'+e.receptorId,kind:'imported_binding',provider:e.provider,target:e.receptorId,targetLabel:e.sourceTarget||e.receptorId,species:species(e.species),hostSpecies:'Not reported',action:'',assay:e.assay||'Not reported',metric:typed?e.metric:'',value:typed?e.value:undefined,unit:typed?e.unit:'',relation:typed?e.relation:'',testedForm:'Not reported',endpoint:e.endpoint||'',sourceUrl:e.sourceUrl,sourceSha256:e.sourceSha256||'',sourceFile:e.sourceFile||'',sourceLocation:e.sourceLocation||'',sourceRelease:e.sourceRelease||'',activityId:e.activityId,assayId:e.assayId,documentId:e.documentId,documentJournal:e.documentJournal,documentYear:e.documentYear,chemblMoleculeId:e.chemblMoleculeId,chemblTargetId:e.chemblTargetId,documentUrl:e.documentUrl,moleculeUrl:e.moleculeUrl,assayUrl:e.assayUrl,targetUrl:e.targetUrl,activityUrl:e.activityUrl,originalMetric:e.originalMetric,originalValue:e.originalValue,originalUnit:e.originalUnit,originalRelation:e.originalRelation,assayOrganism:e.assayOrganism,assayType:e.assayType,assayConfidence:e.assayConfidence,assayDescription:e.assayDescription,assayTissue:e.assayTissue,assayCellType:e.assayCellType,context:'ChEMBL-curated binding observation, not independent remeasurement. Binding does not establish functional action, selectivity, safety or clinical efficacy.',raw:e});
     continue;
    }
    out.push({id:'import:'+i,sourceEndpoint:e.sourceEndpoint,originalEndpoint:e.originalEndpoint,publicationIds:e.publicationIds||[],publicationUrls:e.publicationUrls||[],externalUrls:e.externalUrls||[],patentIds:e.patentIds||[],sourceRecord:e.sourceRecord,provider:e.provider,actions:e.actions||[],sourceAction:e.sourceAction,sourceLigandType:e.sourceLigandType,sourceSha256:e.sourceSha256||'',sourceFile:e.sourceFile||'',sourceLocation:e.sourceLocation||'',kind:e.bindingEvidence?'imported_binding':'imported_classification',target:e.receptorId,targetLabel:e.sourceTarget||e.receptorId,species:species(e.species),hostSpecies:'Not reported',action:e.sourceAction||'',assay:e.assay||'Not reported',metric:e.bindingEvidence?e.affinityUnits||'':'',value:e.bindingEvidence&&e.affinityMedian!==''&&Number.isFinite(Number(e.affinityMedian))?Number(e.affinityMedian):undefined,unit:e.bindingEvidence?'source scale':'',relation:'=',testedForm:'Not reported',endpoint:[e.affinityUnits,e.affinityMedian,e.comment].filter(Boolean).join(' · '),sourceUrl:e.sourceUrl,context:'Imported source row; target action and affinity fields retain their original scope.',raw:e});
   }
   cache.set(entry,out);return out;
  }
  function dossier(name){const entry=byName.get(name);if(!entry)return null;
   const meta=data.entries[name],guarded=meta?.librarySmiles===entry.smiles;
   return {entry,label:catalog.displayName(entry),aliases:catalog.aliasesFor(entry),identity:catalog.nameRecord(entry),identityCorrection:entry.identityCorrection,records:curated.forEntry(entry,data),observations:observations(entry),tags:catalog.tagsFor(entry),identityWarnings:guarded?meta.identityConflicts||[]:[],bindingIdentityWarnings:catalog.receptorEvidence(entry).filter(e=>e.provider==='ChEMBL'&&(e.numericalTransferStatus==='excluded_graph_mismatch'||e.librarySmiles&&e.librarySmiles!==entry.smiles)).map(e=>({activityId:e.activityId,target:e.receptorId,sourceUrl:e.sourceUrl}))};
  }
  function comparison(names){
   const compounds=[...new Set(names)].map(name=>dossier(name)).filter(Boolean),groups=new Map();
   for(const d of compounds)for(const o of d.observations){
    if(!o.target||['identity_reference','documented_relationship'].includes(o.kind))continue;
    // No conversion, averaging, ranking or cross-study pooling. Unknown context
    // stays in a separate observation group rather than implying comparability.
    const property=o.kind==='measured_property',missing=property?(!o.conditions||!Object.keys(o.conditions).length||/(?:not (?:specified|reported|available)|unknown)/i.test(JSON.stringify(o.conditions))):o.assay==='Not reported'||o.species==='Not reported';
    const key=JSON.stringify([o.target,o.species,o.hostSpecies,o.assay,o.testedForm,o.metric,o.unit,o.kind,o.conditions||null,o.sourceUrl,missing?[d.entry.name,o.id]:null]);
    if(!groups.has(key))groups.set(key,{key,target:o.target,species:o.species,hostSpecies:o.hostSpecies,assay:o.assay,testedForm:o.testedForm,metric:o.metric,unit:o.unit,kind:o.kind,conditions:o.conditions,sourceUrl:o.sourceUrl,incomplete:missing,observations:[]});
    groups.get(key).observations.push({name:d.entry.name,observation:o});
   }
   return {compounds,groups:[...groups.values()]};
  }
  const isTarget=o=>o.target&&!['identity_reference','documented_relationship','measured_property'].includes(o.kind);
  let familyIndex=null;
  function families(){if(!familyIndex){familyIndex=new Map();for(const entry of entries)for(const tag of catalog.tagsFor(entry)){if(!/^(Family motif: |Series: )/.test(tag))continue;if(!familyIndex.has(tag))familyIndex.set(tag,[]);familyIndex.get(tag).push(entry);}}
   return [...familyIndex].map(([tag,items])=>({tag,count:items.length})).sort((a,b)=>a.tag.localeCompare(b.tag));
  }
  function members(family){families();return familyIndex.get(family)||[];}
  function cell(name,target,selectedSpecies='all'){
   const d=dossier(name),evidence=d?d.observations.filter(o=>isTarget(o)&&o.target===target&&(selectedSpecies==='all'||o.species===selectedSpecies)):[],states=new Set();
   for(const o of evidence){
    if(o.kind==='functional_assay')states.add('Measured functional');
    else if(o.kind==='imported_binding')states.add('Binding measurement');
    else if(o.kind==='control_comparison'&&typeof o.value==='number')states.add(o.negativeControl&&['>','>='].includes(o.relation)?'Low activity bound':'Assay measurement');
    else if(o.kind==='stereo_comparison'&&o.negativeControl)states.add('Control designation');
    else if(['source_classification','imported_classification'].includes(o.kind)&&o.action)states.add('Curated action');
    else states.add('Source context');
   }
   if(d?.identityWarnings.length&&evidence.length)states.add('Identity review');
   return {name,target,evidence,states:states.size?[...states]:['No imported evidence']};
  }
  function matrix({family,target='',selectedSpecies='all',page=1,perPage=20,targetPage=1,targetsPerPage=6,onlyEvidence=false}={}){
   let matching=members(family);const targets=[...new Set(matching.flatMap(e=>observations(e).filter(o=>isTarget(o)&&(selectedSpecies==='all'||o.species===selectedSpecies)).map(o=>o.target)))].sort();
   if(onlyEvidence)matching=matching.filter(e=>observations(e).some(o=>isTarget(o)&&(selectedSpecies==='all'||o.species===selectedSpecies)&&(!target||o.target===target)));
   const pages=Math.max(1,Math.ceil(matching.length/perPage)),current=Math.min(Math.max(1,page),pages),targetPages=Math.max(1,Math.ceil(targets.length/targetsPerPage)),tp=Math.min(Math.max(1,targetPage),targetPages),columns=target?[target]:targets.slice((tp-1)*targetsPerPage,tp*targetsPerPage);
   return {total:matching.length,familyTotal:members(family).length,page:current,pages,targetPage:tp,targetPages,targets,columns,rows:matching.slice((current-1)*perPage,current*perPage).map(e=>({name:e.name,label:catalog.displayName(e),cells:columns.map(t=>cell(e.name,t,selectedSpecies))}))};
  }
  let reviewCache=null;
  function reviewItems(){if(reviewCache)return reviewCache;const actionApi=root.ReferenceActions||(typeof module!=='undefined'&&module.exports?require('./reference-actions'):null);const result=[],decisions=new Map(reviewData.decisions.map(d=>[d.id,d]));
   for(const entry of entries){const meta=data.entries[entry.name];
    if(meta?.librarySmiles===entry.smiles)for(const conflict of meta.identityConflicts||[]){
     const r=data.records.find(r=>r.id===conflict.curatedReferenceId),id='identity:'+entry.name,decision=decisions.get(id);
     result.push({id,kind:'identity',name:entry.name,label:catalog.displayName(entry),target:'Identity',status:decision?.status||'unresolved',reason:r?.note||'The legacy graph disagrees with the reviewed source identity. Source pharmacology is not transferred.',history:decision?.history||[],evidence:[],sourceUrl:conflict.sourceUrl,relatedNames:r?.compounds.flatMap(c=>c.libraryNames)||[]});
    }
    const groups=new Map();for(const o of observations(entry)){if(!actionApi?.canonicalActions(o).length||!isTarget(o))continue;const key=JSON.stringify([o.target,o.species]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);}
    for(const evidence of groups.values()){const actions=actionApi.reviewActions(evidence);if(actions.length<2)continue;
     const first=evidence[0],id='action:'+entry.name+':'+first.target+':'+first.species,decision=decisions.get(id);
     result.push({id,kind:'action',name:entry.name,label:catalog.displayName(entry),target:first.target,species:first.species,actions,status:decision?.status||'unresolved',reason:'Different action classifications occur for this stored graph and target species. This is a review candidate: pathway, assay conditions and efficacy definitions may explain the difference. It is not an automatic finding that either source is wrong.',history:decision?.history||[],evidence,relatedNames:[]});
    }
   }
   for(const entry of entries){const f=entry.identityCorrection;if(!f)continue;const id='identity:'+entry.name,decision=decisions.get(id);
    result.push({id,kind:'identity',name:entry.name,label:catalog.displayName(entry),target:'Identity',status:decision?.status||'unresolved',reason:f.reason,history:decision?.history||[],evidence:[],sourceUrl:f.sourceUrl,relatedNames:data.records.find(r=>r.id===f.sourceReferenceId)?.compounds[f.compoundIndex].libraryNames||[],correction:f});
   }
   reviewCache=result.sort((a,b)=>(a.kind==='identity'?0:1)-(b.kind==='identity'?0:1)||a.label.localeCompare(b.label)||a.target.localeCompare(b.target));return reviewCache;
  }
  function reviews({kind='all',query='',page=1,perPage=12}={}){const term=query.trim().toLowerCase(),items=reviewItems().filter(r=>(kind==='all'||r.kind===kind)&&[r.name,r.label,r.target,r.status].join(' ').toLowerCase().includes(term)),pages=Math.max(1,Math.ceil(items.length/perPage)),current=Math.min(Math.max(page,1),pages);return {total:items.length,page:current,pages,items:items.slice((current-1)*perPage,current*perPage)};}
  let queueBase=null;
  function curationBase(){if(queueBase)return queueBase;const tasks=[];
   for(const r of reviewItems().filter(r=>!r.status.startsWith('resolved_')))tasks.push({id:'review:'+r.id,category:'review',priority:r.kind==='identity'?0:1,title:(r.kind==='identity'?'Resolve identity: ':'Review action differences: ')+r.label+' · '+r.target,reason:r.reason,count:1,names:[r.name],reviewId:r.id,reviewKind:r.kind,target:r.target,sourceUrls:[...new Set([r.sourceUrl,...r.evidence.map(o=>o.sourceUrl)].filter(Boolean))]});
   for(const f of families()){const candidates=members(f.tag).filter(e=>{const obs=observations(e).filter(isTarget);return obs.some(o=>['source_classification','imported_classification','imported_binding'].includes(o.kind))&&!obs.some(o=>o.kind==='functional_assay');});
    if(candidates.length)tasks.push({id:'functional:'+f.tag,category:'functional',priority:2,title:'Add functional evidence: '+f.tag.replace(/^(Family motif: |Series: )/,''),reason:candidates.length+' entries have imported classifications or binding evidence but no directly measured functional observation in this index. Prioritize named, identity-checked references and primary assay sources; do not infer action from affinity or family.',count:candidates.length,names:candidates.map(e=>e.name),family:f.tag,sourceUrls:[...new Set(candidates.flatMap(e=>observations(e).filter(isTarget).map(o=>o.sourceUrl)).filter(Boolean))]});
   }
   const assays=new Map();for(const e of entries)for(const o of observations(e).filter(isTarget)){
    if(!['functional_assay','control_comparison','stereo_comparison'].includes(o.kind))continue;
    if(o.kind==='functional_assay'&&o.value===undefined)tasks.push({id:'quantitative:'+e.name+':'+o.id,category:'functional',priority:2,title:'Recover quantitative result: '+catalog.displayName(e),reason:'A functional observation is documented, but no numerical result is transcribed. Review the cited primary result before adding a value.',count:1,names:[e.name],target:o.target,sourceUrls:[o.sourceUrl].filter(Boolean)});
    const key=JSON.stringify([o.target,o.species,o.hostSpecies,o.assay,o.sourceUrl]);if(!assays.has(key))assays.set(key,[]);assays.get(key).push({name:e.name,o});
   }
   let assayIndex=0;for(const group of assays.values()){const measured=group.filter(({o})=>o.kind==='functional_assay'||(o.kind==='control_comparison'&&typeof o.value==='number'));if(!measured.length||group.some(({o})=>o.negativeControl))continue;const first=measured[0].o,names=[...new Set(measured.map(x=>x.name))];
    tasks.push({id:'control:'+assayIndex++,category:'controls',priority:3,title:'Link assay-matched controls: '+first.target,reason:'No negative-control relationship is imported for this reported target/species/host/assay/source group. This does not establish that the original study lacked controls. Verify the source and detection limits before importing a control.',count:names.length,names,target:first.target,assay:first.assay,species:first.species,sourceUrls:[first.sourceUrl].filter(Boolean)});
   }
   queueBase=tasks;return tasks;
  }
  function curationQueue({category='all',query='',minimumScaffolds=3,page=1,perPage=12}={}){
   const threshold=[2,3,5].includes(Number(minimumScaffolds))?Number(minimumScaffolds):3;
   const diversity=(data.panelCoverage||[]).filter(p=>p.ringScaffolds<threshold).map(p=>({id:'diversity:'+p.gene,category:'diversity',priority:4,title:'Broaden curated scaffold coverage: '+p.gene,reason:p.ringScaffolds+' ring scaffolds across '+p.distinctIsomericGraphs+' curated isomeric graphs; '+p.acyclicProfiles+' acyclic profiles. Below the selected planning threshold of '+threshold+' ring scaffolds. This is curated-panel coverage, not whole-library coverage or predictive accuracy. Seek source-backed references with distinct scaffolds and appropriate assays.',count:p.ringScaffolds,target:p.gene,names:[...new Set(data.records.filter(r=>r.panel?.gene===p.gene).flatMap(r=>r.compounds.flatMap(c=>c.libraryNames)))],sourceUrls:[...new Set(data.records.filter(r=>r.panel?.gene===p.gene).flatMap(r=>r.evidence.map(e=>e.sourceUrl)).filter(Boolean))]}));
   const term=query.trim().toLowerCase(),all=curationBase().concat(diversity).sort((a,b)=>a.priority-b.priority||a.title.localeCompare(b.title)),filtered=all.filter(t=>(category==='all'||t.category===category)&&[t.title,t.reason,...t.names].join(' ').toLowerCase().includes(term)),pages=Math.max(1,Math.ceil(filtered.length/perPage)),current=Math.min(Math.max(page,1),pages);
   return {total:filtered.length,page:current,pages,minimumScaffolds:threshold,items:filtered.slice((current-1)*perPage,current*perPage),categoryCounts:Object.fromEntries(['review','functional','controls','diversity'].map(c=>[c,all.filter(t=>t.category===c).length]))};
  }
  return {entries,byName,observations,dossier,comparison,families,members,cell,matrix,isTarget,reviews,reviewItems,curationQueue};
 }
 const api={createModel,species,metric,primaryReferences};root.ReferenceResearch=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
