'use strict';
(function(root){
 const labels={agonist:'agonist',partial_agonist:'partial agonist',antagonist:'antagonist',inverse_agonist:'inverse agonist',biased:'biased agonist',modulator:'allosteric modulator',pam:'positive allosteric modulator (PAM)',nam:'negative allosteric modulator (NAM)',neutral_allosteric:'neutral allosteric ligand',channel_blocker:'channel blocker',channel_opener:'channel opener',inhibitor:'inhibitor',activator:'activator'};
 const normalize=value=>String(value||'').trim().toLowerCase().replace(/\s+/g,'_').replace(/^full_agonist$/,'agonist');
 function canonicalActions(observation){
  if(!['functional_assay','source_classification','imported_classification'].includes(observation.kind))return [];
  const source=Array.isArray(observation.actions)?observation.actions:['functional_assay','source_classification'].includes(observation.kind)?[observation.action]:[];
  let actions=[...new Set(source.map(normalize).filter(a=>Object.prototype.hasOwnProperty.call(labels,a)))];
  if(actions.some(a=>['partial_agonist','biased'].includes(a)))actions=actions.filter(a=>a!=='agonist');
  if(actions.some(a=>['pam','nam','neutral_allosteric'].includes(a)))actions=actions.filter(a=>a!=='modulator');
  return actions;
 }
 function label(action){return labels[normalize(action)]||'';}
 const directions=[['agonist','partial_agonist','antagonist','inverse_agonist'],['pam','nam','neutral_allosteric'],['channel_blocker','channel_opener'],['inhibitor','activator']];
 function reviewActions(observations){
  const witnesses=observations.map(o=>({o,actions:canonicalActions(o)})),conflicting=new Set();
  for(let i=0;i<witnesses.length;i++)for(let j=i+1;j<witnesses.length;j++){
   const a=witnesses[i],b=witnesses[j];if(a.o.target!==b.o.target||a.o.species!==b.o.species)continue;
   for(const family of directions)for(const x of a.actions)for(const y of b.actions)if(x!==y&&family.includes(x)&&family.includes(y)){conflicting.add(x);conflicting.add(y);}
  }
  return [...conflicting];
 }
 const api={canonicalActions,label,reviewActions};root.ReferenceActions=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
