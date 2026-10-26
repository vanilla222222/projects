'use strict';
(function(root){
 function create(model){
  function trace(name){const d=model.dossier(name);if(!d)return null;const claims=new Map(),normalize=a=>a.toLowerCase().replace(/ /g,'_').replace(/^full_agonist$/,'agonist');
   function add(type,key,label,o){if(!claims.has(key))claims.set(key,{id:key,type,label,target:o.target||'',species:o.species,witnesses:[]});const c=claims.get(key);if(!c.witnesses.some(w=>w.id===o.id))c.witnesses.push(o);}
   for(const o of d.observations){const prefix=o.target+'|'+o.species;
    if(o.action&&['functional_assay','source_classification','imported_classification'].includes(o.kind)){const action=normalize(o.action);add('action','action|'+prefix+'|'+action,'Reported '+action.replace(/_/g,' ')+' at '+o.target,o);}
    if(o.kind==='imported_binding')add('binding','binding|'+prefix,'Imported binding observations at '+o.target,o);
    if(typeof o.value==='number'&&Number.isFinite(o.value)&&['functional_assay','control_comparison'].includes(o.kind)){const metric=root.ReferenceSAR.endpoint(o)||'reported endpoint';add('measurement','measurement|'+prefix+'|'+metric+'|'+o.unit,metric+' observations at '+o.target,o);}
    if(o.negativeControl)add('control','control|'+prefix,'Source-designated control for '+o.target,o);
    if(o.kind==='measured_property')add('property','property|'+prefix+'|'+o.unit,'Measured property: '+o.target,o);
    if(o.kind==='stereo_comparison'&&!o.negativeControl)add('context','context|'+prefix,'Source stereochemical comparison: '+o.target,o);
   }
   for(const r of d.records)for(const [i,rel]of (r.relationships||[]).entries()){const a=r.compounds[rel.from],b=r.compounds[rel.to];if(!a.libraryNames.includes(name)&&!b.libraryNames.includes(name))continue;const o=d.observations.find(o=>o.recordId===r.id);if(!o)continue;add('relationship','relationship|'+r.id+'|'+i,rel.kind.replace(/_/g,' ')+': '+a.name+' → '+b.name,o);}
   const identities=[],seen=new Set();for(const r of d.records)for(const c of r.compounds.filter(c=>c.libraryNames.includes(name))){const key=c.sourceUrl+'|'+c.inchiKey;if(seen.has(key))continue;seen.add(key);identities.push({name:c.sourceName||c.name,sourceUrl:c.sourceUrl,inchiKey:c.inchiKey,smiles:c.smiles,formula:c.formula,provider:c.identitySource.provider,identifierOrigin:c.identitySource.identifierOrigin||c.identitySource.keyOrigin||'Source-provided identifier',sourceSha256:c.identitySource.sourceSha256||'',raw:c.identitySource});}
   const reviews=model.reviewItems().filter(r=>r.name===name);for(const c of claims.values()){c.reviews=reviews.filter(r=>r.kind==='identity'||r.target===c.target);c.sources=[...new Set(c.witnesses.map(o=>o.sourceUrl).filter(Boolean))];}
   return {name,label:d.label,entry:d.entry,identityWarnings:d.identityWarnings,identityCorrection:d.identityCorrection,identities,claims:[...claims.values()],scope:'Claims link to imported source observations, not independent replications. Assay-specific results and database classifications remain distinct; no claim is transferred to another graph.'};
  }
  return {trace};
 }
 const api={create};root.ReferenceClaims=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
