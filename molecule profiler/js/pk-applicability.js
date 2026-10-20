'use strict';
// Conservative browser chemistry gate, separate from the frozen model features.
// Passing this screen is not RDKit sanitization or evidence of clinical validity.
(function(root){
 const allowed=new Set(['C','N','O','S','P','F','Cl','Br','I']);
 const neutral={C:[4],N:[3],O:[2],S:[2,4,6],P:[3,5],F:[1],Cl:[1],Br:[1],I:[1]};
 function assess(mol){
  const reasons=[];
  if(!mol?.atoms?.length)return {eligible:false,reasons:['No molecular graph supplied.'],policyVersion:'pk-chemistry-gate-v1'};
  if(mol.components!==1)reasons.push('Disconnected structures and salt mixtures were excluded from model training; supply a single molecular component.');
  const unsupported=[...new Set(mol.atoms.filter(a=>!allowed.has(a.element)).map(a=>a.element))];
  if(unsupported.length)reasons.push('Elements outside the training chemistry: '+unsupported.join(', ')+'.');
  if(mol.atoms.some(a=>a.isotope))reasons.push('Isotope-labelled kinetics are not characterized by these models.');
  let unusual=false;
  for(const a of mol.atoms){
   if(!allowed.has(a.element))continue;
   let valences=neutral[a.element];
   if(a.charge){
    // Only common closed-shell ionic valences are recognized by this gate.
    valences=({C:{'-1':[3],'1':[3]},N:{'-1':[2],'1':[4]},O:{'-1':[1],'1':[3]},S:{'-1':[1],'1':[3]},P:{'1':[4]},F:{'-1':[0]},Cl:{'-1':[0]},Br:{'-1':[0]},I:{'-1':[0]}})[a.element]?.[a.charge]||[];
   }
   if(!valences.includes(a.valence))unusual=true;
  }
  if(unusual)reasons.push('Unrecognized valence or possible open-shell chemistry; browser screening cannot establish a supported closed-shell graph.');
  return {eligible:reasons.length===0,reasons,policyVersion:'pk-chemistry-gate-v1',scope:'Conservative eligibility screen only; no tautomer standardization, full radical assignment or external applicability validation is performed.'};
 }
 function predict(model,feature,mol){
  const chemistry=assess(mol);
  if(!chemistry.eligible)return {available:false,outsideDomain:true,reason:chemistry.reasons.join(' '),chemistry};
  return {...root.PKFeatures.predict(model,feature),chemistry};
 }
 const api={assess,predict};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PKApplicability=api;
})(typeof globalThis!=='undefined'?globalThis:this);
