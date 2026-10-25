'use strict';
(function(root){
 const text=v=>v==null?'':String(v);
 const species=v=>/^(human|homo sapiens)$/i.test(text(v))?'Homo sapiens':text(v)||'Not reported';
 const metric=e=>e.metric||(/^(EC50|IC50|Ki|Kd)\b/.exec(e.endpoint||'')||[])[1]||'';
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
     for(const v of values)out.push({id:r.id+':'+i+':'+ci,recordId:r.id,compoundIndex:ci,kind:e.kind,target:e.receptorId||e.target||'',targetLabel:e.target||e.receptorId||'',species:species(e.species),hostSpecies:e.hostSpecies||'Not reported',action:e.action||'',assay:e.assay||'Not reported',metric:metric(e),value:v?v.value:e.value,relation:v?v.relation:e.relation,unit:v?v.unit:e.unit,sd:e.sd,lower:e.lower,upper:e.upper,uncertaintyKind:e.uncertaintyKind,efficacy:e.efficacy,conditions:e.conditions,testedForm:e.testedForm||'Not reported',endpoint:e.endpoint||'',sourceUrl:e.sourceUrl,sourceSha256:e.sourceSha256||'',sourceLocation:e.sourceLocation||'',context:e.context||r.note||'',role:r.compounds[ci].role,negativeControl:(r.relationships||[]).some(l=>l.kind==='negative_control'&&l.to===ci),raw:e});
    }
   }
   for(const [i,e]of catalog.receptorEvidence(entry).entries())out.push({id:'import:'+i,kind:e.bindingEvidence?'imported_binding':'imported_classification',target:e.receptorId,targetLabel:e.sourceTarget||e.receptorId,species:species(e.species),hostSpecies:'Not reported',action:e.sourceAction||'',assay:e.assay||'Not reported',metric:e.bindingEvidence?e.affinityUnits||'':'',value:e.bindingEvidence&&e.affinityMedian!==''&&Number.isFinite(Number(e.affinityMedian))?Number(e.affinityMedian):undefined,unit:e.bindingEvidence?'source scale':'',relation:'=',testedForm:'Not reported',endpoint:[e.affinityUnits,e.affinityMedian,e.comment].filter(Boolean).join(' · '),sourceUrl:e.sourceUrl,context:'Imported source row; target action and affinity fields retain their original scope.',raw:e});
   cache.set(entry,out);return out;
  }
  function dossier(name){const entry=byName.get(name);if(!entry)return null;
   const meta=data.entries[name],guarded=meta?.librarySmiles===entry.smiles;
   return {entry,label:catalog.displayName(entry),aliases:catalog.aliasesFor(entry),identity:catalog.nameRecord(entry),records:curated.forEntry(entry,data),observations:observations(entry),tags:catalog.tagsFor(entry),identityWarnings:guarded?meta.identityConflicts||[]:[]};
  }
  function comparison(names){
   const compounds=[...new Set(names)].map(name=>dossier(name)).filter(Boolean),groups=new Map();
   for(const d of compounds)for(const o of d.observations){
    if(!o.target||['identity_reference','documented_relationship'].includes(o.kind))continue;
    // No conversion, averaging, ranking or cross-study pooling. Unknown context
    // stays in a separate observation group rather than implying comparability.
    const missing=o.assay==='Not reported'||o.species==='Not reported';
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
  const normalizeAction=a=>text(a).toLowerCase().replace(/ /g,'_').replace(/^full_agonist$/,'agonist');
  function reviewItems(){if(reviewCache)return reviewCache;const result=[],decisions=new Map(reviewData.decisions.map(d=>[d.id,d]));
   for(const entry of entries){const meta=data.entries[entry.name];
    if(meta?.librarySmiles===entry.smiles)for(const conflict of meta.identityConflicts||[]){
     const r=data.records.find(r=>r.id===conflict.curatedReferenceId),id='identity:'+entry.name,decision=decisions.get(id);
     result.push({id,kind:'identity',name:entry.name,label:catalog.displayName(entry),target:'Identity',status:decision?.status||'unresolved',reason:r?.note||'The legacy graph disagrees with the reviewed source identity. Source pharmacology is not transferred.',history:decision?.history||[],evidence:[],sourceUrl:conflict.sourceUrl,relatedNames:r?.compounds.flatMap(c=>c.libraryNames)||[]});
    }
    const groups=new Map();for(const o of observations(entry)){const a=normalizeAction(o.action);if(!['agonist','partial_agonist','antagonist','inverse_agonist'].includes(a)||!isTarget(o))continue;const key=JSON.stringify([o.target,o.species]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(o);}
    for(const evidence of groups.values()){const actions=[...new Set(evidence.map(o=>normalizeAction(o.action)))];if(actions.length<2)continue;
     const first=evidence[0],id='action:'+entry.name+':'+first.target+':'+first.species,decision=decisions.get(id);
     result.push({id,kind:'action',name:entry.name,label:catalog.displayName(entry),target:first.target,species:first.species,actions,status:decision?.status||'unresolved',reason:'Different action classifications occur for this stored graph and target species. This is a review candidate: pathway, assay conditions and efficacy definitions may explain the difference. It is not an automatic finding that either source is wrong.',history:decision?.history||[],evidence,relatedNames:[]});
    }
   }
   reviewCache=result.sort((a,b)=>(a.kind==='identity'?0:1)-(b.kind==='identity'?0:1)||a.label.localeCompare(b.label)||a.target.localeCompare(b.target));return reviewCache;
  }
  function reviews({kind='all',query='',page=1,perPage=12}={}){const term=query.trim().toLowerCase(),items=reviewItems().filter(r=>(kind==='all'||r.kind===kind)&&[r.name,r.label,r.target,r.status].join(' ').toLowerCase().includes(term)),pages=Math.max(1,Math.ceil(items.length/perPage)),current=Math.min(Math.max(page,1),pages);return {total:items.length,page:current,pages,items:items.slice((current-1)*perPage,current*perPage)};}
  return {entries,byName,observations,dossier,comparison,families,members,cell,matrix,isTarget,reviews,reviewItems};
 }
 const api={createModel,species,metric};root.ReferenceResearch=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
