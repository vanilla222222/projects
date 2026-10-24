'use strict';
(function(root){
 const parse=s=>buildMolecule(parseSmiles(s));
 function assess(inputSmiles,candidate){
  const result={schemaVersion:1,status:'review-required',routeEstablished:false,experimentalStability:null,protectingGroupsRequired:null,flags:[],handles:[],scope:'Structural preparation-review flags, not a validated synthesis-feasibility score, reaction route, yield, stability or safety prediction. Protection requirements depend on a proposed route and conditions. SA scores alone cannot answer these questions.'};
  const add=(id,title,observation,needed)=>result.flags.push({id,title,observation,informationNeeded:needed});
  try{
   const input=parse(inputSmiles),mol=parse(candidate.smiles),handles=root.ProdrugCandidates.sites(input);result.handles=handles.map(h=>({inputAtom:h.atom+1,kind:h.kind,selected:h.atom===candidate.site?.atom}));
   const other=result.handles.filter(h=>!h.selected);if(other.length)add('chemoselectivity','Selectivity / protection review',other.length+' other recognized attachment handle(s) remain in the input.','A route-specific chemoselectivity assessment. Protecting groups may be needed; this program does not determine that they are mandatory.');
   if(candidate.designMode==='ether-redesign')add('precursor','Redesign precursor needed','The design adds an ester trigger at an ether-bearing carbon. The original saturated methoxy/alkoxy oxygen is not a free alcohol handle.','An experimentally supported precursor and preparation plan; the graph edit is not a demonstrated one-step derivatization.');
   if(['n-carbamate','n-linker','ether-redesign'].includes(candidate.cleavage))add('cascade','Multistep linker compatibility','Release requires a trigger/intermediate sequence rather than one arbitrary cleavable bond.','Preparation, isolation, storage stability and activation measurements for every relevant intermediate.');
   if(candidate.cleavage.startsWith('carbonyl-'))add('condensation','Condensation / isomer review','The design replaces a carbonyl with a C=N derivative; equilibrium and geometric isomers may matter.','Isomer assignment, reaction equilibrium and hydrolytic-stability measurements.');
   const stereo=stereoAnalyse(mol);if(stereo.centerUnspecified||stereo.bondUnspecified||stereo.undetermined)add('stereo','Stereochemical assignment',stereo.centerUnspecified+' unspecified tetrahedral center(s), '+stereo.bondUnspecified+' unspecified double-bond geometry assignment(s), '+stereo.undetermined+' unresolved stereo analysis item(s).','Determine which isomers are made and whether separation/characterization is needed. Counts do not establish synthetic accessibility.');
   for(const [id,pattern,title] of [['peroxide','OO','Peroxide linkage'],['acyl-halide','C(=O)[F,Cl,Br,I]','Acyl halide motif'],['anhydride','C(=O)OC(=O)','Acid anhydride motif']])if(hasSmartsMatch(pattern,mol))add(id,title,'A '+title.toLowerCase()+' is present in the generated graph.','Review moisture, reagent and storage compatibility under proposed conditions. A motif alone does not quantify stability or risk.');
   const i=candidate.site?.atom,a=input.atoms[i];if(a){const ns=input.bonds.flatMap(b=>b.a===i?[b.b]:b.b===i?[b.a]:[]);if(ns.some(j=>input.bonds.filter(b=>b.a===j||b.b===j).length>=4))add('crowding','Local substitution review','The selected atom is adjacent to an atom with four graph neighbors.','Assess steric access in a proposed preparation; graph degree does not predict conversion or yield.');}
   add('route','Preparation evidence missing','No molecule-specific synthetic route, isolated yield or identity/purity measurement is attached to this generated design.','A sourced preparation plan and analytical characterization. This remains required even when no other review flags are found.');
  }catch(e){result.status='unavailable';result.reason='Preparation review could not be completed: '+e.message;}
  return result;
 }
 root.SynthesisReview={assess};const original=root.CandidateDashboard.build;root.CandidateDashboard.build=function(record,candidates){const report=original(record,candidates);for(const row of report.rows)row.synthesis=assess(record.smiles,row.candidate);return report;};
})(globalThis);
