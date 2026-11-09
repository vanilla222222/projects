'use strict';
(function(root){
 const parse=s=>buildMolecule(parseSmiles(s));
 const ns=(m,i)=>m.bonds.flatMap(b=>b.a===i?[{id:b.b,bond:b}]:b.b===i?[{id:b.a,bond:b}]:[]);
 const EVIDENCE='Reaction-class hypothesis · unvalidated for this molecule';
 const CHOLESTEROL='CC(C)CCC[C@@H](C)[C@H]1CC[C@H]2[C@@H]3CC=C4C[C@H](CC[C@]4(C)[C@H]3CC[C@]12C)O';
 const BRAIN_STEROL_SOURCE={title:'Lipid transport at the blood-brain interface',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8044814/',kind:'review'};
 function scan(input){
  if(!input?.atoms?.length)return {atoms:[],reasons:['Analyze a molecule first.']};
  const report=root.ProdrugCandidates.generate(input,{limit:0}),paths=root.CleavableGroups.pathways(input),prepared=root.ProdrugCandidates.prepareParent(input),organic=new Set(prepared?.inputAtoms||[]);
  const redesigns=root.CleavableGroups.redesignSites(input);
  const sites=new Map((report.eligibleSites||[]).map(s=>[s.atom,s]));
  const globalBlock=!report.eligibleSites?report.reasons.join(' '):null;
  const atoms=input.atoms.map((a,atom)=>{
   const attachment=sites.get(atom),existing=paths.filter(p=>p.atoms.includes(atom)),links=ns(input,atom);
   const redesign=redesigns.find(s=>s.atom===atom);
   const options=(attachment?.designs||[]).map(d=>({...d,mode:'design',evidenceLevel:EVIDENCE})).concat(existing.map(p=>({id:'cleave:'+p.id,name:p.label,mode:'cleavage',evidenceLevel:EVIDENCE}))).concat((redesign?.designs||[]).map(d=>({...d,evidenceLevel:EVIDENCE})));
   let reason;
   if(options.length)reason=[attachment?'Recognized '+attachment.kind+' handle; '+attachment.designs.length+' attachment templates.':'',existing.length?existing.length+' existing-group pathway(s) involve this atom.':'',redesign?'Ester-triggered ether redesigns release a different OH analogue.':''].filter(Boolean).join(' ');
   else if(prepared?.normalization&&!organic.has(atom))reason='Recognized inorganic counterion; omitted from organic-component design and pathway checks.';
   else if(globalBlock)reason='Input-level check: '+globalBlock;
   else if(a.element==='O'&&links.length===1&&links[0].bond.order===2)reason='Carbonyl oxygen is not a free OH handle. Select the adjacent carbonyl carbon for eligible condensation designs.';
   else if(a.element==='O'&&!a.totalH&&links.length===2)reason='No free O–H handle. No supported existing ether, ester or linker transformation matched this oxygen in its current environment.';
   else if(a.element==='N'&&a.aromatic)reason='This aromatic nitrogen environment does not match the supported pyridine-like N-oxide or existing-group rules.';
   else if(a.element==='N'&&links.length>=4)reason='Four-coordinate nitrogen has no supported attachment handle in its supplied charge and bonding state.';
   else if(a.element==='N')reason='This nitrogen does not match the supported amine, carbonyl-linked N–H, imine or exposed-linker rules; bonding, hydrogen, charge or stereo constraints prevent an option.';
   else if(a.element==='C')reason=a.aromatic?'Aromatic carbon is not a direct cleavable attachment handle in this builder. Nearby heteroatom pathways are assessed separately.':'This carbon does not match a supported aldehyde/ketone, acetal, linker or other existing transformation site.';
   else if(['F','Cl','Br','I','H'].includes(a.element))reason='No supported prodrug attachment or existing-group release rule targets this atom.';
   else reason='No implemented attachment or transformation rule matches this atom’s current bonding and charge state.';
   return {atom,element:a.element,compatible:!!options.length,options,reason,evidenceLevel:options.length?EVIDENCE:'Structural observation · no supported rule',kind:[attachment?.kind,...existing.map(p=>p.kind),redesign?.kind].filter(Boolean).join(' / ')||'No supported option'};
  });
  return {version:1,inputSmiles:input.smiles,atoms,compatibleAtoms:atoms.filter(a=>a.compatible).length,normalization:report.normalization||null,reasons:globalBlock?[globalBlock]:[],scope:'Rule coverage, not a ranking of efficacy, cleavage speed or safety.'};
 }
 function comparison(input,rows){
  const prepared=root.ProdrugCandidates.prepareParent(input);if(!prepared)return {rows:[],reason:'A supported parent structure is required.'};
  const parent=prepared.normalization?prepared.normalization.parentSmiles:input.smiles;
  const descriptors=smiles=>{try{const d=describe(parse(smiles));return {mw:d.mw,logp:d.logp,tpsa:d.tpsa,hbd:d.hbdStrict,hba:d.hbaStrict,rotatableBonds:d.rotatableBonds,charge:d.charge};}catch(_){return null;}};
  const baseline=descriptors(parent),seen=[];
  const entries=[{name:prepared.normalization?'Organic input component':'Input molecule',smiles:parent,role:'parent',evidenceLevel:'Input structure'}];
  for(const row of rows.slice(0,12)){
   if(!row?.parentRecoveryVerified||row.experimentalValidation!==false)continue;
   try{const m=parse(row.smiles);if(seen.some(s=>Pharmacology.exactGraph(m,parse(s))))continue;seen.push(row.smiles);entries.push({name:row.name,smiles:row.smiles,role:'candidate',evidenceLevel:EVIDENCE,site:row.site,designObjective:row.designObjective||'general',bbbDesign:row.bbbDesign?JSON.parse(JSON.stringify(row.bbbDesign)):null,designLimitations:Array.isArray(row.limitations)?row.limitations.slice():[],sources:Array.isArray(row.sources)?JSON.parse(JSON.stringify(row.sources)):[]});}catch(_){}
  }
  return {version:1,normalization:prepared.normalization,rows:entries.map(row=>{const values=descriptors(row.smiles);return {...row,values,delta:values&&baseline?Object.fromEntries(Object.keys(values).map(k=>[k,values[k]-baseline[k]])):null};}),scope:'MW, TPSA, strict hydrogen-bond counts, rotatable bonds and formal charge are calculated; WLOGP is an estimate. These are local descriptors, not SwissADME results or evidence of improved ADME.'};
 }
 function bbbReview(input,rows){
  const compared=comparison(input,rows),parent=compared.rows.find(r=>r.role==='parent')||null;
  const reviewed=compared.rows.filter(r=>r.role==='candidate').map(row=>{
   let passiveScreen={available:false,label:'Not assessed',reason:'CandidateInfo passive-screen model unavailable.'};
   try{if(root.CandidateInfo?.basic)passiveScreen=root.CandidateInfo.basic({name:row.name,smiles:row.smiles}).bbb;}catch(_){}
   const cautions=[];
   if(Number.isFinite(parent?.values?.logp)&&parent.values.logp>=5&&row.delta?.logp>0)cautions.push('The parent already has estimated WLOGP ≥ 5. This design increases lipophilicity further; that change alone is not evidence of improved brain delivery.');
   if(Number.isFinite(parent?.values?.tpsa)&&parent.values.tpsa<=40&&row.delta?.tpsa<=0)cautions.push('The parent already has TPSA ≤ 40 Å². Maintaining or lowering TPSA is only a descriptor change, not independent evidence of brain exposure.');
   if(passiveScreen.available&&passiveScreen.label.startsWith('Unlikely'))cautions.push('This structure falls outside the local passive-screen BBB region. The screen does not measure transporters, efflux, carrier oxidation or brain activation.');
   return {...row,passiveScreen,cautions,bbbDesign:row.bbbDesign||{strategy:'BBB-oriented design metadata unavailable',rationale:'No design rationale was supplied.',requirements:[],scope:'No BBB transport or activation claim is assigned.'},brainDeliveryEstablished:false,biologicalConversionEstablished:false};
  });
  const parentCautions=[];
  try{if(parent&&Pharmacology.exactGraph(parse(parent.smiles),parse(CHOLESTEROL)))parentCautions.push({topic:'Cholesterol-specific physiology',text:'Most brain cholesterol is synthesized locally, and direct peripheral sterol/lipoprotein transfer into brain is restricted. A passive-screen label or increased lipophilicity does not overcome this physiology or establish brain delivery.',source:{...BRAIN_STEROL_SOURCE}});}catch(_){}
  return {version:1,status:reviewed.length?'reviewed':'no-candidates',objective:'BBB-oriented structural design',inputSmiles:input?.smiles||null,parent,parentCautions,rows:reviewed,excluded:Math.max(0,(rows||[]).length-reviewed.length),noCombinedScore:true,scope:'Structures, exact parent-graph recovery, property deltas and a local passive WLOGP/TPSA screen are reported separately. No candidate is asserted to cross the BBB, achieve brain exposure, release the parent in brain tissue or be an experimentally established prodrug.',limitations:['The passive screen omits efflux, transporters, ionization in vivo, dose, peripheral stability and exposure.','Formal ester reversal does not establish enzymatic conversion, useful release rates or brain-selective activation.','For redox-carrier designs, carrier oxidation, lock-in and the subsequent activation sequence are not simulated.']};
 }
 // A route retains a frontier of every fragment. Only the user-selected fragment
 // is consumed at each step; duplicate fragments are separate equivalents.
 function start(smiles,targetSmiles=null){
  parse(smiles);if(targetSmiles)parse(targetSmiles);
  return {version:1,startSmiles:smiles,targetSmiles,steps:[],frontier:[{id:'p0',smiles,fromStep:0}],nextId:1,evidenceLevel:EVIDENCE,scope:'A user-selected sequence of formal transformations, not a predicted dominant metabolic pathway.'};
 }
 function options(route){
  if(!route||route.steps.length>=4)return [];
  return route.frontier.flatMap(product=>{
   try{return root.CleavableGroups.pathways(parse(product.smiles)).map(p=>({productId:product.id,smiles:product.smiles,pathId:p.id,atom:p.atoms[0],kind:p.kind,label:p.label}));}catch(_){return [];}
  });
 }
 function advance(route,option){
  if(!options(route).some(o=>o.productId===option?.productId&&o.pathId===option.pathId&&o.atom===option.atom))throw Error('Choose a currently available fragment and pathway.');
  const product=route.frontier.find(p=>p.id===option.productId),report=root.CleavableGroups.preview(parse(product.smiles),option.pathId,option.atom);
  if(report.status!=='predicted-products')throw Error(report.reasons.join(' '));
  const next=JSON.parse(JSON.stringify(route)),step=next.steps.length+1;
  const products=report.products.map(p=>({...p,id:'p'+next.nextId++,fromStep:step}));
  next.frontier=next.frontier.filter(p=>p.id!==option.productId).concat(products);
  const kind=report.pathway.kind,formalInput=kind==='ether'?'One oxygen atom added formally; oxidant and cofactors are not specified.':['disulfide','n-oxide'].includes(kind)?'Two hydrogen equivalents added formally; reductant is not specified.':['hydroxymethyl-linker','nh-hydroxymethyl','carbamic-acid','ether-hemiacetal'].includes(kind)?'No additional atoms in this formal fragmentation.':'One water molecule added in formal hydrolysis.';
  next.steps.push({number:step,formalInput,consumed:product,pathway:report.pathway,products,source:report.source,hypothesis:report.hypothesis,limitations:report.limitations,stereoChanges:report.stereoChanges,normalization:report.normalization});
  next.targetPresent=!!next.targetSmiles&&next.frontier.some(p=>Pharmacology.exactGraph(parse(p.smiles),parse(next.targetSmiles)));
  return next;
 }
 root.ProdrugExplorer={scan,comparison,bbbReview,start,options,advance,evidenceLevel:EVIDENCE};
})(globalThis);
