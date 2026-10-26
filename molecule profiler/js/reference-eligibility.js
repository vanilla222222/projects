'use strict';
(function(root){
 function create(library,targets,{recordsFor=()=>[],evidenceFor=()=>[]}={}){
  const wanted=new Set(targets.flatMap(t=>t.ligands||[])),byName=new Map(),counts={};
  for(const e of library){let eligible=true,reason='Named structural reference; activity is not inferred from its class';
   if(e.propertyOnly===true){eligible=false;reason='Property or illustrative reference';}
   else if(/^(ChEBI|DrugCentral) named compound$/.test(e.cls)){
    const curated=recordsFor(e).some(r=>r.evidence?.some(o=>['functional_assay','source_classification','control_comparison','stereo_comparison'].includes(o.kind)));
    const imported=evidenceFor(e).some(o=>o.receptorId&&/^https:\/\//.test(o.sourceUrl||''));
    eligible=wanted.has(e.name)||curated||imported;
    reason=eligible?'Named target association or graph-matched source evidence; no selectivity implied':'Bulk structure without an imported target assignment';
   }
   byName.set(e.name,{eligible,reason});counts[reason]=(counts[reason]||0)+1;
  }
  return {byName,counts,eligible:e=>byName.get(e.name)?.eligible===true};
 }
 const api={create};root.ReferenceEligibility=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
