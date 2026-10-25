'use strict';
(function(root){
 const text=v=>v==null?'':String(v);
 const species=v=>/^(human|homo sapiens)$/i.test(text(v))?'Homo sapiens':text(v)||'Not reported';
 const metric=e=>e.metric||(/^(EC50|IC50|Ki|Kd)\b/.exec(e.endpoint||'')||[])[1]||'';
 function createModel({entries,catalog,curated,data}){
  const byName=new Map(entries.map(e=>[e.name,e])),cache=new WeakMap();
  function observations(entry){
   if(cache.has(entry))return cache.get(entry);
   const out=[];
   for(const r of curated.forEntry(entry,data)){
    const ci=r.compounds.findIndex(c=>c.libraryNames.includes(entry.name));if(ci<0)continue;
    for(const [i,e]of r.evidence.entries()){
     // Multi-compound records retain participant-specific values, never their partner's.
     const values=Array.isArray(e.values)?e.values.filter(v=>v.compound===ci):[null];
     for(const v of values)out.push({id:r.id+':'+i+':'+ci,recordId:r.id,compoundIndex:ci,kind:e.kind,target:e.receptorId||e.target||'',targetLabel:e.target||e.receptorId||'',species:species(e.species),hostSpecies:e.hostSpecies||'Not reported',action:e.action||'',assay:e.assay||'Not reported',metric:metric(e),value:v?v.value:e.value,relation:v?v.relation:e.relation,unit:v?v.unit:e.unit,sd:e.sd,lower:e.lower,upper:e.upper,uncertaintyKind:e.uncertaintyKind,efficacy:e.efficacy,conditions:e.conditions,testedForm:e.testedForm||'Not reported',endpoint:e.endpoint||'',sourceUrl:e.sourceUrl,sourceSha256:e.sourceSha256||'',sourceLocation:e.sourceLocation||'',context:e.context||r.note||'',role:r.compounds[ci].role,raw:e});
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
  return {entries,byName,observations,dossier,comparison};
 }
 const api={createModel,species,metric};root.ReferenceResearch=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
