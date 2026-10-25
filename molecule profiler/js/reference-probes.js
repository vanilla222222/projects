'use strict';
(function(root){
 function create(model,data){let cache=null;
  function candidates(){if(cache)return cache;const probes=new Map();
   for(const r of data.records)for(const [ci,c]of r.compounds.entries()){
    if(!/^(chemical )?probe$/i.test(c.role||''))continue;
    const names=c.libraryNames.filter(n=>model.dossier(n)?.records.some(x=>x.id===r.id));if(!names.length)continue;const key=c.inchiKey+'|'+names.slice().sort().join('|');if(!probes.has(key))probes.set(key,{name:names[0],names,label:model.dossier(names[0]).label,contexts:[],controls:[],caveats:[],counterScreens:[]});const p=probes.get(key),observations=model.observations(model.byName.get(names[0])).filter(o=>o.recordId===r.id);
    for(const o of observations){p.contexts.push(o);if(o.raw.counterScreen===true)p.counterScreens.push(o);}p.caveats.push({text:r.note,sourceUrls:[...new Set(r.evidence.map(e=>e.sourceUrl))]});
    for(const rel of r.relationships||[]){if(rel.kind!=='negative_control'||rel.from!==ci)continue;const control=r.compounds[rel.to],controlName=control.libraryNames.find(n=>model.dossier(n)?.records.some(x=>x.id===r.id));if(!controlName)continue;const evidence=model.observations(model.byName.get(controlName)).filter(o=>o.recordId===r.id),matched=observations.some(a=>evidence.some(b=>a.kind==='control_comparison'&&b.kind==='control_comparison'&&a.target===b.target&&a.species!=='Not reported'&&a.species===b.species&&a.assay!=='Not reported'&&a.assay===b.assay&&a.sourceUrl===b.sourceUrl));p.controls.push({name:controlName,label:model.dossier(controlName).label,recordId:r.id,evidence,matched,scope:matched?'Explicit assay-matched control relation':'Related source-designated control; equivalence to another domain/assay is not established'});}
   }
   cache=[...probes.values()];for(const p of cache){p.contexts=[...new Map(p.contexts.map(o=>[o.id,o])).values()];p.controls=[...new Map(p.controls.map(c=>[c.recordId+':'+c.name,c])).values()];}return cache;
  }
  function find({target='',assay='',species='all',requireMatchedControl=false}={}){const q=target.trim().toLowerCase(),a=assay.trim().toLowerCase();return candidates().map(p=>({...p,matchingContexts:p.contexts.filter(o=>(!q||[o.target,o.targetLabel].join(' ').toLowerCase().includes(q))&&(!a||o.assay.toLowerCase().includes(a))&&(species==='all'||o.species===species))})).filter(p=>p.matchingContexts.length&&(!requireMatchedControl||p.controls.some(c=>c.matched&&c.evidence.some(o=>p.matchingContexts.some(m=>m.target===o.target&&m.assay===o.assay&&m.species===o.species&&m.sourceUrl===o.sourceUrl)))));}
  return {candidates,find};
 }
 const api={create};root.ReferenceProbes=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
