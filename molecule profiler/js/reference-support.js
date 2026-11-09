'use strict';
// Coverage of imported observations, not evidence quality or predicted activity.
(function(root){
 const DEFINITIONS=Object.freeze([
  {key:'measuredPhysical',label:'Measured physical properties'},
  {key:'standardizedBinding',label:'Standardized ChEMBL binding'},
  {key:'functionalAssay',label:'Functional assay observations'},
  {key:'sourceAction',label:'Source action classifications'},
  {key:'noImportedObservations',label:'No imported observations'}
 ].map(Object.freeze));
 const knownActions=new Set(['agonist','full_agonist','partial_agonist','antagonist','inverse_agonist','modulator','pam','nam','neutral_allosteric','channel_blocker','channel_opener','inhibitor','activator','biased']);
 const recognized=value=>knownActions.has(String(value||'').trim().toLowerCase().replace(/\s+/g,'_'));
 const finish=state=>Object.freeze({...state,noImportedObservations:state.observationCount===0});
 const blank=()=>({measuredPhysical:false,standardizedBinding:false,functionalAssay:false,sourceAction:false,observationCount:0});
 const empty=finish(blank());
 function create({curatedData,receptorData}={}){
  const index=new Map(),records=new Map((curatedData?.records||[]).map(r=>[r.id,r]));
  function state(name,smiles){if(!index.has(name))index.set(name,new Map());const graphs=index.get(name);if(!graphs.has(smiles))graphs.set(smiles,blank());return graphs.get(smiles);}
  for(const [name,entry]of Object.entries(curatedData?.entries||{})){
   if(typeof entry.librarySmiles!=='string')continue;const support=state(name,entry.librarySmiles);
   for(const id of new Set(entry.recordIds||[])){
    const record=records.get(id),ci=record?.compounds?.findIndex(c=>(c.libraryNames||[]).includes(name));if(ci==null||ci<0)continue;
    for(const e of record.evidence||[]){const n=Array.isArray(e.values)?e.values.filter(v=>v.compound===ci).length:1;if(!n)continue;
     support.observationCount+=n;
     if(e.kind==='measured_property')support.measuredPhysical=true;
     if(e.kind==='functional_assay')support.functionalAssay=true;
     if(e.kind==='source_classification'&&recognized(e.action))support.sourceAction=true;
    }
   }
  }
  for(const [name,entry]of Object.entries(receptorData?.entries||{})){
   if(typeof entry.librarySmiles!=='string')continue;const support=state(name,entry.librarySmiles);
   for(const e of entry.evidence||[]){
    if(e.provider==='ChEMBL'){
     if(e.numericalTransferStatus!=='exact_source_graph'||e.librarySmiles!==entry.librarySmiles||!['Ki','Kd'].includes(e.metric)||e.relation!=='='||e.unit!=='nM'||!Number.isFinite(e.value)||e.value<=0)continue;
     support.standardizedBinding=true;
    }else if(e.provider==='ChEMBL curated action classification'){
     if(e.classificationTransferStatus!=='exact_source_graph'||e.librarySmiles!==entry.librarySmiles||!['agonist','antagonist'].includes(e.actions?.[0]))continue;
     support.sourceAction=true;
    }else if(e.provider==='IUPHAR/BPS Guide to PHARMACOLOGY'&&(e.actions||[]).some(recognized))support.sourceAction=true;
    support.observationCount++;
   }
  }
  for(const graphs of index.values())for(const [smiles,support]of graphs)graphs.set(smiles,finish(support));
  function get(entry){return entry&&index.get(entry.name)?.get(entry.smiles)||empty;}
  function summary(entries){const counts=Object.fromEntries(DEFINITIONS.map(d=>[d.key,0]));for(const entry of entries||[]){const support=get(entry);for(const d of DEFINITIONS)if(support[d.key])counts[d.key]++;}return counts;}
  return Object.freeze({get,summary});
 }
 const cache=new WeakMap(),missing=Object.freeze({});
 function forDatasets(curatedData,receptorData){const c=curatedData||missing,r=receptorData||missing;let receptors=cache.get(c);if(!receptors){receptors=new WeakMap();cache.set(c,receptors);}if(!receptors.has(r))receptors.set(r,create({curatedData,receptorData}));return receptors.get(r);}
 const api={DEFINITIONS,create,forDatasets,get:entry=>forDatasets(root.CURATED_REFERENCES,root.LIBRARY_RECEPTOR_METADATA).get(entry)};
 root.ReferenceSupport=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
