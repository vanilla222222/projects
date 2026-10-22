'use strict';
// Shared motifs describe reference support, never functional action or affinity.
(function(root){
 const DEFINITIONS=[
  ['indole','Indole ring system','c1ccc2nccc2c1'],
  ['tryptamine','Indole–ethylamine motif','NCCc1cnc2ccccc12'],
  ['phenethylamine','Phenethylamine-related linker','NCCc1ccccc1'],
  ['pyridine','Pyridine ring','c1ccncc1'],
  ['piperidine','Piperidine ring','N1CCCCC1'],
  ['piperazine','Piperazine ring','N1CCNCC1'],
  ['morpholine','Morpholine ring','O1CCNCC1'],
  ['benzimidazole','Benzimidazole ring system','n1cnc2ccccc21'],
  ['amide','Amide linkage','NC(=O)'],
  ['ester','Ester linkage','C(=O)OC'],
  ['phenol','Phenolic hydroxyl','c[OH]'],
  ['carboxyl','Carboxylic acid','C(=O)[OH]'],
  ['sulfonamide','Sulfonamide linkage','S(=O)(=O)N']
 ];
 const compiled=new Map();
 function detect(mol){return DEFINITIONS.filter(([id,,pattern])=>{
  if(!compiled.has(id))compiled.set(id,compileSmarts(pattern));
  return smartsMatches(compiled.get(id),mol,{}).length>0;
 }).map(x=>x[0]);}
 function reference(entry,metadata){const data=metadata||root.REFERENCE_MOTIFS;const r=data?.entries?.[entry.name];return r&&r.librarySmiles===entry.smiles?r.motifs:[];}
 function label(id){return DEFINITIONS.find(x=>x[0]===id)?.[1]||id;}
 const api={DEFINITIONS,detect,reference,label};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.StructuralEvidence=api;
})(typeof globalThis!=='undefined'?globalThis:this);
