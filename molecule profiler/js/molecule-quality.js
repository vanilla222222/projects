'use strict';
// Non-predictive data quality indicators. Warnings are NOT toxicity/safety predictions.
(function(root){
 const KEYS=[
  ['mw','Molecular weight','d'],['tpsa','Topological polar surface area','d'],
  ['logp','WLOGP estimate','d'],['logS','Aqueous log S estimate','v'],
  ['heavyAtoms','Heavy atom count','d'],['rings','Ring count','d']
 ];
 function evaluate(record,options){
  const o=options||{},d=record&&record.d||{},v=record&&record.v||{},issues=[];
  const add=(code,severity,reason)=>issues.push({code,severity,reason});
  for(const [key,label,source] of KEYS) {
   const value=(source==='v'?v:d)[key];
   if(typeof value!=='number'||!Number.isFinite(value))add('missing_'+key,'warning',label+' is missing or non-finite.');
  }
  if(typeof d.heavyAtoms==='number'&&d.heavyAtoms===0)add('empty_structure','warning','No heavy atoms were described; verify the input.');
  if(typeof d.charge==='number'&&d.charge!==0)add('charged_structure','caution','Charged structure: neutral-compound empirical estimates may not be applicable.');
  if(typeof d.mw==='number'&&d.mw>700)add('high_mass','caution','Molecular weight exceeds a conservative model-review threshold (700 g/mol).');
  if(typeof d.logp==='number'&&Number.isFinite(d.logp)&&(d.logp< -2||d.logp>7))add('extreme_logp','caution','WLOGP is outside the -2 to 7 review window; model extrapolation may be unreliable.');
  const seen=o.seen;
  const smiles=String(record&&record.smiles||'');
  if(seen instanceof Map){
   if(seen.has(smiles))add('duplicate_input','info','Exact SMILES text duplicates '+seen.get(smiles)+'.');
   else seen.set(smiles,o.id||'another input');
  }
  return {issues,missing:issues.filter(x=>x.code.startsWith('missing_')).length,
    status:issues.some(x=>x.severity==='warning')?'review':issues.length?'caution':'complete',
    notes:'This is an input/data-quality review, not a safety or biological-activity assessment. Duplicate comparison is text-only; thresholds are conservative review flags, not validated applicability intervals.'};
 }
 const api={KEYS,evaluate};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MoleculeQuality=api;
})(typeof globalThis!=='undefined'?globalThis:this);
