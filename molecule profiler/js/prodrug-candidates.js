'use strict';
(function(root){
 // Structural design hypotheses only. The reverse edit checks identity, not
 // biological activation, enzyme recognition, efficacy or delivery benefit.
 const SOURCES={
  carbonyl:{title:'Kalia and Raines: Hydrolytic Stability of Hydrazones and Oximes',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC2743602/',kind:'primary'},
  imide:{title:'Phenytoin prodrugs IV: Hydrolysis of 3-(hydroxymethyl)phenytoin esters',url:'https://pubmed.ncbi.nlm.nih.gov/6548518/',kind:'primary'},
  amide:{title:'Bioreversible derivatization of hydantoins by N-hydroxymethylation; comparison with N-hydroxymethyl amides and imides',url:'https://www.sciencedirect.com/science/article/pii/0378517380900514',kind:'primary'},
  thiol:{title:'Disposition and metabolism of alacepril in rats: deacetylation to desacetyl-alacepril',url:'https://pubmed.ncbi.nlm.nih.gov/3513776/',kind:'primary'},
  amine:{title:'Alexander et al. (1988): (Acyloxy)alkyl carbamates as bioreversible prodrugs for primary and secondary amines',url:'https://pubmed.ncbi.nlm.nih.gov/2892933/',kind:'primary'},
  nOxide:{title:'Siim et al. (2000): Comparison of aromatic and tertiary amine N-oxides of acridine DNA intercalators as bioreductive drugs',url:'https://pubmed.ncbi.nlm.nih.gov/10974206/',kind:'primary'},
  ester:{title:'In vitro dermal transport and bioconversion of aliphatic metronidazole esters',url:'https://www.sciencedirect.com/science/article/pii/0378517386901791',kind:'primary'},
  phosphate:{title:'Metronidazole phosphate: a water-soluble prodrug; chemical and human-serum hydrolysis study',url:'https://pubmed.ncbi.nlm.nih.gov/7086647/',kind:'primary'},
  phenolPhosphate:{title:'Phenolic KSP inhibitors and employment of a phosphate prodrug strategy',url:'https://pubmed.ncbi.nlm.nih.gov/16439122/',kind:'primary'},
  acid:{title:'FDA Vasotec label: enalapril ethyl-ester hydrolysis to enalaprilat',url:'https://www.accessdata.fda.gov/drugsatfda_docs/label/2014/018998s079lbl.pdf',kind:'primary'}
 };
 const COMMON_LIMITS=[
  'Unvalidated structural design, not an established prodrug of this parent.',
  'Enzyme recognition, conversion rate and completeness, tissue exposure and pharmacological activity are unknown.',
  'Promoiety-derived byproducts can have their own toxicity; no safety assessment was performed.',
  'No absorption, BBB delivery, duration, half-life, efficacy or safety improvement is predicted.',
  'Sources document design classes in other compounds; they do not validate this generated derivative.'
 ];
 const OH_DESIGNS=[
  {id:'acetyl',name:'O-acetyl ester',fragment:'C(=O)C',cleavage:'o-acyl',hypothesis:'Ester hydrolysis could release the parent alcohol/phenol plus acetic acid; recognition by relevant human esterases is not established.',sources:[SOURCES.ester]},
  {id:'propionyl',name:'O-propionyl ester',fragment:'C(=O)CC',cleavage:'o-acyl',hypothesis:'Ester hydrolysis could release the parent alcohol/phenol plus propionic acid; recognition by relevant human esterases is not established.',sources:[SOURCES.ester]},
  {id:'butyryl',name:'O-butyryl ester',fragment:'C(=O)CCC',cleavage:'o-acyl',hypothesis:'Ester hydrolysis could release the parent alcohol/phenol plus butyric acid; recognition by relevant human esterases is not established.',sources:[SOURCES.ester]},
  {id:'hemisuccinyl',name:'O-hemisuccinate ester',fragment:'C(=O)CCC(=O)O',cleavage:'o-acyl',hypothesis:'Cleavage of the parent-linked ester could release the parent alcohol/phenol and succinic acid. Ionization and any formulation benefit remain untested.',sources:[SOURCES.ester]},
  {id:'phosphate',name:'O-phosphate monoester',fragment:'P(=O)(O)O',cleavage:'o-phosphate',hypothesis:'Phosphatase-mediated cleavage could release the parent alcohol/phenol. Substrate recognition and conversion are not established; no rate is inferred.',sources:[SOURCES.phosphate,SOURCES.phenolPhosphate]}
 ];
 const ACID_DESIGNS=[['methyl','Methyl','C','methanol'],['ethyl','Ethyl','CC','ethanol'],['n-propyl','n-Propyl','CCC','1-propanol'],['isopropyl','Isopropyl','C(C)C','2-propanol'],['n-butyl','n-Butyl','CCCC','1-butanol']].map(([id,name,fragment,alcohol])=>({id,name:name+' carboxylate ester',fragment,cleavage:'acid-ester',hypothesis:'Ester hydrolysis could restore the parent carboxylic acid and release '+alcohol+'. Human enzyme recognition, competing metabolism and complete conversion remain untested.',sources:[SOURCES.acid]}));
 // A terminal ester trigger plus a self-immolative carbamate, rather than
 // treating an arbitrary stable amide as an established cleavable prodrug.
 const AMINE_DESIGNS=[['acetoxy','Acetoxymethyl','C'],['propionyloxy','Propionyloxymethyl','CC'],['butyryloxy','Butyryloxymethyl','CCC'],['isobutyryloxy','Isobutyryloxymethyl','C(C)C'],['pentanoyloxy','Pentanoyloxymethyl','CCCC']].map(([id,name,tail])=>({id:'amine-'+id,name:name+' N-carbamate',fragment:'C(=O)OCOC(=O)'+tail,cleavage:'n-carbamate',hypothesis:'Terminal ester hydrolysis followed by linker fragmentation and decarboxylation could regenerate the parent amine. This multistep activation is a design-class hypothesis, not a demonstrated pathway for this candidate.',sources:[SOURCES.amine],limitations:['The acyloxymethyl linker can release formaldehyde, carbon dioxide and a carboxylic acid; their exposure and toxicity are not assessed.']}));
 const N_OXIDE_DESIGNS=[{id:'n-oxide',name:'Tertiary amine N-oxide',fragment:'[O-]',cleavage:'n-oxide',hypothesis:'Bioreduction of the N-oxide could regenerate the parent tertiary amine. Activity depends on compound, enzymes and oxygen conditions; hypoxia selectivity and human conversion are not inferred.',sources:[SOURCES.nOxide],limitations:['An N-oxide may itself be active or undergo competing reactions. New nitrogen stereochemistry is unassigned; no individual stereoisomer is claimed.']}];
 const THIOL_DESIGNS=[['s-acetyl','S-acetyl','C'],['s-propionyl','S-propionyl','CC'],['s-butyryl','S-butyryl','CCC']].map(([id,name,tail])=>({id,name:name+' thioester',fragment:'C(=O)'+tail,cleavage:'s-acyl',hypothesis:'Thioester hydrolysis could regenerate the parent thiol. Alacepril deacetylation is a precedent in another compound, not proof of human activation of this candidate.',sources:[SOURCES.thiol],limitations:['Thioester reactivity, acyl transfer to biological nucleophiles and competing thiol oxidation are unassessed.']}));
 const NH_LINKER_DESIGNS=[
  {id:'nh-hydroxymethyl',name:'N-hydroxymethyl',fragment:'CO',cleavage:'n-linker',hypothesis:'Breakdown of the N-hydroxymethyl linkage could regenerate the parent N–H compound and formaldehyde. Equilibrium and fragmentation depend strongly on the parent; physiological release is not established.'},
  {id:'nh-acetoxymethyl',name:'N-acetoxymethyl',fragment:'COC(=O)C',cleavage:'n-linker',hypothesis:'Ester hydrolysis followed by N-hydroxymethyl fragmentation could regenerate the parent N–H compound. Both steps remain unvalidated for this structure.'},
  {id:'nh-propionyloxymethyl',name:'N-propionyloxymethyl',fragment:'COC(=O)CC',cleavage:'n-linker',hypothesis:'Ester hydrolysis followed by N-hydroxymethyl fragmentation could regenerate the parent N–H compound. Neither enzyme recognition nor fragmentation is established.'},
  {id:'nh-phosphoryloxymethyl',name:'N-phosphoryloxymethyl',fragment:'COP(=O)(O)O',cleavage:'n-linker',hypothesis:'Dephosphorylation followed by N-hydroxymethyl fragmentation could regenerate the parent N–H compound. Fosphenytoin-class activation is a precedent, not evidence for this new derivative.'}
 ].map(d=>({...d,sources:[SOURCES.imide,SOURCES.amide],limitations:['Hydantoin/imide precedents do not establish release from a different amide or lactam. Formaldehyde release, equilibrium, competing pathways and toxicity are unassessed.']}));
 const AROMATIC_OXIDE_DESIGNS=N_OXIDE_DESIGNS.map(d=>({...d,id:'aromatic-n-oxide',name:'Pyridine-like aromatic N-oxide',cleavage:'aromatic-n-oxide',hypothesis:'Reductive deoxygenation could restore the parent aromatic nitrogen. Aromatic N-oxide studies are compound-specific; reduction, hypoxia selectivity and parent activity are not inferred.',limitations:['Aromatic N-oxides may retain or change biological activity. Reduction of a different aromatic N-oxide is not evidence of release from this candidate.']}));
 const CARBONYL_DESIGNS=[
  {id:'carbonyl-oxime',name:'Carbonyl oxime',fragment:'O',cleavage:'carbonyl-oxime'},
  {id:'carbonyl-hydrazone',name:'Carbonyl hydrazone',fragment:'N',cleavage:'carbonyl-hydrazone'}
 ].map(d=>({...d,operation:'carbonyl-condensation',hypothesis:'Hydrolysis of the C=N linkage could restore the parent carbonyl and release a nitrogen-containing fragment. Hydrolysis may be very slow and reversible; biological release from this candidate is not established.',sources:[SOURCES.carbonyl],limitations:['This design replaces the carbonyl oxygen during a formal condensation. Structural recovery does not demonstrate retention of that oxygen atom in a real reaction.','Oxime/hydrazone E/Z stereochemistry is unassigned. No isomer-specific activity or cleavage is predicted.','Hydroxylamine- or hydrazine-derived byproducts and competing chemistry have not been assessed for safety.']}));
 const cloneAtom=a=>Object.assign({},a,{order:Array.isArray(a.order)?a.order.slice():null,neighbors:[],rings:[]});
 function cloneGraph(m){return {atoms:m.atoms.map(cloneAtom),bonds:m.bonds.map(b=>Object.assign({},b))};}
 function neighbors(m,id){return m.bonds.flatMap(b=>b.a===id?[{id:b.b,bond:b}]:b.b===id?[{id:b.a,bond:b}]:[]);}
 function parse(s){return buildMolecule(parseSmiles(s));}
 function exact(a,b){return typeof Pharmacology!=='undefined'&&Pharmacology.exactGraph(a,b);}
 function serialized(m){return writeSmiles(cloneGraph(m));}
 function connected(m){if(!m.atoms.length)return false;const seen=new Set([0]),q=[0];while(q.length){const id=q.shift();neighbors(m,id).forEach(n=>{if(!seen.has(n.id)){seen.add(n.id);q.push(n.id);}});}return seen.size===m.atoms.length;}
 function freeSites(m){
  return m.atoms.flatMap((a,index)=>{
   const ns=neighbors(m,index),site=(kind,label,designs,hydrogens=0,charge=0)=>[{atom:index,index,kind,label:label+' '+(index+1),element:a.element,designs,hydrogens,charge}];
   if(a.element==='C'&&!a.aromatic&&!a.charge){
    const oxo=ns.filter(n=>n.bond.order===2&&m.atoms[n.id].element==='O'&&!m.atoms[n.id].charge&&neighbors(m,n.id).length===1&&!m.atoms[n.id].isotope);
    if(oxo.length===1&&ns.every(n=>n.id===oxo[0].id||n.bond.order===1&&['C','H'].includes(m.atoms[n.id].element)))return site(a.totalH?'aldehyde carbonyl':'ketone carbonyl','carbonyl carbon',CARBONYL_DESIGNS,a.totalH,0).map(s=>({...s,carbonylOxygen:oxo[0].id}));
   }
   if(a.element==='N'&&a.aromatic&&!a.chirality&&[0,1].includes(a.charge||0)&&a.totalH===(a.charge===1?1:0)&&ns.length===2&&ns.every(n=>m.atoms[n.id].element==='C'&&n.bond.aromatic))return site('pyridine-like nitrogen','aromatic nitrogen',AROMATIC_OXIDE_DESIGNS,0,1);
   if(a.element==='N'&&!a.aromatic&&!a.chirality&&[0,-1].includes(a.charge||0)&&ns.length>=1&&ns.length<=2&&a.totalH===3-ns.length+(a.charge||0)&&ns.every(n=>n.bond.order===1&&m.atoms[n.id].element==='C'&&!m.atoms[n.id].charge)){
    const carbonyls=ns.filter(n=>neighbors(m,n.id).some(x=>x.bond.order===2&&m.atoms[x.id].element==='O')).length;
    const otherConjugation=ns.some(n=>neighbors(m,n.id).some(x=>x.bond.order>=2&&['N','S','P'].includes(m.atoms[x.id].element)));
    if(carbonyls&&!otherConjugation)return site(carbonyls===2?'imide N–H':'amide/lactam N–H','carbonyl-linked nitrogen',NH_LINKER_DESIGNS,3-ns.length-1,0);
   }
   if(a.element==='S'&&[0,-1].includes(a.charge||0)&&a.totalH===(a.charge===-1?0:1)&&ns.length===1&&ns[0].bond.order===1&&m.atoms[ns[0].id].element==='C'&&!m.atoms[ns[0].id].charge&&!neighbors(m,ns[0].id).some(n=>n.bond.order>=2&&['O','S','N'].includes(m.atoms[n.id].element)))return site(a.charge===-1?'thiolate':'thiol','thiol sulfur',THIOL_DESIGNS);
   if(a.element==='N'&&!a.aromatic&&!a.chirality&&[0,1].includes(a.charge||0)&&ns.length>=1&&ns.length<=3&&ns.every(n=>n.bond.order===1&&m.atoms[n.id].element==='C'&&!m.atoms[n.id].charge)){
    // Exclude amides, ureas, carbamates, amidines and related conjugated N.
    const conjugated=ns.some(n=>neighbors(m,n.id).some(x=>x.bond.order>=2&&['N','O','S','P'].includes(m.atoms[x.id].element)));
    const neutralH=3-ns.length;
    if(!conjugated&&a.totalH===neutralH+(a.charge||0))return ns.length===3?site('tertiary amine','amine nitrogen',N_OXIDE_DESIGNS,0,1):site(ns.length===1?'primary amine':'secondary amine','amine nitrogen',AMINE_DESIGNS,neutralH-1,0);
   }
   if(a.element!=='O'||![0,-1].includes(a.charge||0)||a.totalH!==(a.charge===-1?0:1)||ns.length!==1||ns[0].bond.order!==1)return [];
   const carbon=m.atoms[ns[0].id];if(carbon.element!=='C'||carbon.charge)return [];
   const cn=neighbors(m,ns[0].id),oxo=cn.filter(n=>n.bond.order===2&&m.atoms[n.id].element==='O');
   if(oxo.length===1&&cn.every(n=>['C','O'].includes(m.atoms[n.id].element))&&cn.filter(n=>m.atoms[n.id].element==='O').length===2)return site(a.charge===-1?'carboxylate':'carboxylic acid','acid oxygen',ACID_DESIGNS);
   if(oxo.length)return [];
   if(carbon.aromatic)return site(a.charge===-1?'phenolate':'phenol','phenolic oxygen',OH_DESIGNS);
   if(cn.every(n=>n.bond.order===1)&&cn.filter(n=>m.atoms[n.id].element==='O').length===1)return site(a.charge===-1?'alkoxide':'alcohol','alcohol oxygen',OH_DESIGNS);
   return [];
  });
 }
 function attach(m,site,design){
  const g=cloneGraph(m),part=parse(design.fragment),offset=g.atoms.length;
  const atoms=part.atoms.map(cloneAtom);atoms.forEach(a=>{if(a.order)a.order=a.order.map(id=>id===null?null:id+offset);});
  atoms[0].totalH=Math.max(0,atoms[0].totalH-1);atoms[0].explicitH=atoms[0].totalH;atoms[0].implicitH=0;
  if(design.operation==='carbonyl-condensation'){
   const nitrogen=g.atoms[site.carbonylOxygen];nitrogen.element='N';nitrogen.isotope=null;nitrogen.charge=0;nitrogen.totalH=0;nitrogen.explicitH=0;nitrogen.implicitH=0;
   g.atoms.push(...atoms);g.bonds.push(...part.bonds.map(b=>({...b,a:b.a+offset,b:b.b+offset})),{a:site.carbonylOxygen,b:offset,order:1,aromatic:false});return g;
  }
  g.atoms[site.atom].totalH=site.hydrogens;g.atoms[site.atom].implicitH=0;g.atoms[site.atom].explicitH=site.hydrogens;g.atoms[site.atom].charge=site.charge;
  g.atoms.push(...atoms);g.bonds.push(...part.bonds.map(b=>Object.assign({},b,{a:b.a+offset,b:b.b+offset})),{a:site.atom,b:offset,order:1,aromatic:false});
  return g;
 }
 function removeBranch(m,anchor,start,restore){
  const gone=new Set(),q=[start];while(q.length){const id=q.pop();if(id===anchor)return null;if(gone.has(id))continue;gone.add(id);neighbors(m,id).forEach(n=>{if(n.id!==anchor)q.push(n.id);});}
  // The promoiety must attach at a single boundary bond, not be part of a ring.
  const boundaries=m.bonds.filter(b=>gone.has(b.a)!==gone.has(b.b));
  if(boundaries.length!==1)return null;
  const indices=new Map(),atoms=[];m.atoms.forEach((a,i)=>{if(!gone.has(i)){indices.set(i,atoms.length);atoms.push(cloneAtom(a));}});
  for(const a of atoms){if(a.order)a.order=a.order.map(id=>id===null?null:indices.get(id));if(a.chirality&&a.order&&a.order.some(id=>id===undefined))return null;}
  const bonds=m.bonds.filter(b=>indices.has(b.a)&&indices.has(b.b)).map(b=>Object.assign({},b,{a:indices.get(b.a),b:indices.get(b.b)}));
  const atom=atoms[indices.get(anchor)];atom.totalH=restore.hydrogens;atom.implicitH=0;atom.explicitH=restore.hydrogens;atom.charge=restore.charge;
  return {atoms,bonds,anchorIndex:indices.get(anchor)};
 }
 function recoverParent(candidateSmiles,cleavage,parent){
  if(!['o-acyl','o-phosphate','acid-ester','n-carbamate','n-oxide','s-acyl','n-linker','aromatic-n-oxide','carbonyl-oxime','carbonyl-hydrazone'].includes(cleavage))return {verified:false,smiles:null};
  try{
   const normalized=prepareParent(parent);if(!normalized)return {verified:false,smiles:null};parent=normalized.mol;
   const m=parse(candidateSmiles);
   if(cleavage.startsWith('carbonyl-')){
    const terminal=cleavage==='carbonyl-oxime'?'O':'N';
    for(let i=0;i<m.atoms.length;i++){
     const n=m.atoms[i],links=neighbors(m,i);if(n.element!=='N'||n.charge||n.isotope||n.totalH||links.length!==2)continue;
     const carbon=links.find(x=>x.bond.order===2&&m.atoms[x.id].element==='C'&&!m.atoms[x.id].aromatic),end=links.find(x=>x.bond.order===1&&m.atoms[x.id].element===terminal&&neighbors(m,x.id).length===1&&!m.atoms[x.id].charge);
     if(!carbon||!end)continue;
     const recovered=removeBranch(m,i,end.id,{hydrogens:0,charge:0});if(!recovered)continue;
     recovered.atoms[recovered.anchorIndex].element='O';const smiles=serialized(recovered);
     if(exact(parent,parse(smiles)))return {verified:true,smiles,attachment:{parentAtom:carbon.id,promoietyAtom:i},recoveryMode:'carbonyl-restoration'};
    }
    return {verified:false,smiles:null};
   }
   for(let anchor=0;anchor<m.atoms.length;anchor++){
    const a=m.atoms[anchor],ns=neighbors(m,anchor),aromaticOxide=cleavage==='aromatic-n-oxide',nitrogen=cleavage.startsWith('n-')||aromaticOxide;
    if(a.element!==(nitrogen?'N':cleavage==='s-acyl'?'S':'O')||(!aromaticOxide&&ns.some(n=>n.bond.order!==1)))continue;
    if(aromaticOxide?(!a.aromatic||a.charge!==1||ns.length!==3):nitrogen?(cleavage==='n-oxide'?a.charge!==1||ns.length!==4:a.charge||![2,3].includes(ns.length)):a.charge||ns.length!==2)continue;
    for(const n of ns){
     const atom=m.atoms[n.id],neighborsOfBranch=neighbors(m,n.id),oxo=neighborsOfBranch.filter(x=>x.bond.order===2&&m.atoms[x.id].element==='O');
     const carbonyl=atom.element==='C'&&oxo.length===1;
     if(['o-acyl','s-acyl'].includes(cleavage)&&!carbonyl)continue;
     if(cleavage==='o-phosphate'&&(atom.element!=='P'||oxo.length!==1))continue;
     if(cleavage==='acid-ester'&&(atom.element!=='C'||carbonyl||!ns.some(x=>x.id!==n.id&&m.atoms[x.id].element==='C'&&neighbors(m,x.id).some(y=>y.bond.order===2&&m.atoms[y.id].element==='O'))))continue;
     if(cleavage==='n-carbamate'&&(!carbonyl||!neighborsOfBranch.some(x=>x.bond.order===1&&m.atoms[x.id].element==='O')))continue;
     if((cleavage==='n-oxide'||aromaticOxide)&&(atom.element!=='O'||atom.charge!==-1||neighborsOfBranch.length!==1))continue;
     if(cleavage==='n-linker'&&(atom.element!=='C'||atom.aromatic||atom.totalH!==2||neighborsOfBranch.length!==2||!neighborsOfBranch.some(x=>m.atoms[x.id].element==='O')))continue;
     const restores=nitrogen?((cleavage==='n-oxide'||aromaticOxide)?[{hydrogens:0,charge:0},{hydrogens:1,charge:1}]:[{hydrogens:a.totalH+1,charge:0},{hydrogens:a.totalH+2,charge:1},{hydrogens:a.totalH,charge:-1}]):[{hydrogens:1,charge:0},{hydrogens:0,charge:-1}];
     for(const restore of restores){
      const recovered=removeBranch(m,anchor,n.id,restore);if(!recovered)continue;
      const smiles=serialized(recovered);if(exact(parent,parse(smiles)))return {verified:true,smiles,attachment:{parentAtom:anchor,promoietyAtom:n.id},restoredCharge:restore.charge,restoredHydrogens:restore.hydrogens};
     }
    }
   }
  }catch(_){/* A failed parse/identity check is not a confirmed candidate. */}
  return {verified:false,smiles:null};
 }
 function supportedValences(m){
  const neutral={C:[4],H:[1],N:[3],O:[2],F:[1],P:[3,5],S:[2,4,6],Cl:[1],Br:[1],I:[1]};
  const ionic={C:{'-1':[3],'1':[3]},N:{'-1':[2],'1':[4]},O:{'-1':[1],'1':[3]},S:{'-1':[1],'1':[3]},P:{'1':[4]}};
  return m.atoms.every((a,i)=>Number.isFinite(a.totalH)&&(a.charge?(ionic[a.element]?.[a.charge]||[]):(neutral[a.element]||[])).includes(neighbors(m,i).reduce((n,x)=>n+x.bond.order,0)+a.totalH));
 }
 function prepareParent(input){
  if(!input?.atoms?.length||input.atoms.length>128||!Array.isArray(input.bonds))return null;
  if(connected(input))return {mol:input,inputAtoms:input.atoms.map((_,i)=>i),normalization:null};
  const seen=new Set(),groups=[];
  input.atoms.forEach((_,i)=>{if(seen.has(i))return;const group=[],todo=[i];seen.add(i);while(todo.length){const id=todo.pop();group.push(id);neighbors(input,id).forEach(n=>{if(!seen.has(n.id)){seen.add(n.id);todo.push(n.id);}});}groups.push(group.sort((a,b)=>a-b));});
  const organic=groups.filter(g=>g.some(i=>input.atoms[i].element==='C'));
  if(organic.length!==1)return null;
  const selected=new Set(organic[0]),spectators=groups.filter(g=>!selected.has(g[0]));
  const charges={Li:1,Na:1,K:1,Mg:2,Ca:2,F:-1,Cl:-1,Br:-1,I:-1};
  if(!spectators.length||spectators.some(g=>g.length!==1||charges[input.atoms[g[0]].element]!==input.atoms[g[0]].charge||input.atoms[g[0]].totalH!==0)||input.atoms.reduce((n,a)=>n+(a.charge||0),0)!==0)return null;
  const inputAtoms=organic[0],indices=new Map(inputAtoms.map((id,i)=>[id,i]));
  const atoms=inputAtoms.map(id=>{const a=cloneAtom(input.atoms[id]);a.index=indices.get(id);a.explicitH=a.totalH;a.implicitH=0;if(a.order)a.order=a.order.map(x=>x===null?null:indices.get(x));return a;});
  if(atoms.some(a=>a.chirality&&a.order?.some(x=>x===undefined)))return null;
  const bonds=input.bonds.filter(b=>selected.has(b.a)&&selected.has(b.b)).map(b=>({...b,a:indices.get(b.a),b:indices.get(b.b)}));
  const mol=buildMolecule({atoms,bonds,smiles:input.smiles});
  if(!exact(mol,parse(serialized(mol))))return null;
  return {mol,inputAtoms,normalization:{applied:true,policy:'single-organic-component-simple-inorganic-counterions-v1',parentSmiles:serialized(mol),removedAtoms:spectators.flat().map(i=>({inputAtom:i,element:input.atoms[i].element,charge:input.atoms[i].charge,isotope:input.atoms[i].isotope||null})),scope:'Recognized inorganic counterions omitted from design only. Recovery checks the organic parent component, not the complete salt or solution protonation.'}};
 }
 function generate(parent,options){
  let prepared;try{prepared=prepareParent(parent);}catch(_){prepared=null;}
  if(!prepared)return generateSingle(parent,options);
  if(!prepared.normalization)return generateSingle(parent,options);
  const mapped={...options};
  if(options?.atom!==undefined){mapped.atom=Number.isInteger(options.atom)?prepared.inputAtoms.indexOf(options.atom):-1;}
  const report=generateSingle(prepared.mol,mapped);report.normalization=prepared.normalization;report.reasons.push(prepared.normalization.scope);
  const remap=s=>({...s,parentAtom:s.atom,atom:prepared.inputAtoms[s.atom],index:prepared.inputAtoms[s.atom],...(s.carbonylOxygen!==undefined?{parentCarbonylOxygen:s.carbonylOxygen,carbonylOxygen:prepared.inputAtoms[s.carbonylOxygen]}:{}),label:s.label.replace(/\d+$/,String(prepared.inputAtoms[s.atom]+1))});
  report.eligibleSites=(report.eligibleSites||[]).map(remap);
  report.rows.forEach(row=>{row.site=remap(row.site);row.id=row.id.replace(/\d+$/,String(row.site.atom+1));row.name=row.name.replace(/\d+$/,String(row.site.atom+1));row.normalization=prepared.normalization;row.parentRecoveryScope=prepared.normalization.scope;row.limitations.push(prepared.normalization.scope);});
  return report;
 }
 function generateSingle(parent,options){
  const rows=[],reasons=[],skipped=[];
  const report={version:5,status:'unavailable',rows,candidates:rows,reasons,skipped,evidenceLevel:'Unvalidated structural designs',scope:'At most five single-site ester, phosphate, carbamate, thioester, N–H linker, N-oxide or carbonyl-condensation hypotheses. Structural parent recovery does not establish biological conversion or prodrug status.'};
  const fail=message=>{reasons.push(message);return report;};
  try{
   if(!parent||!Array.isArray(parent.atoms)||!Array.isArray(parent.bonds))return fail('A parsed molecular graph is required.');
   if(parent.atoms.length>120)return fail('The bounded generator accepts at most 120 atoms.');
   if(!connected(parent))return fail('Use one connected parent structure; only one organic component with recognized, charge-balanced simple inorganic counterions can be normalized; other mixtures are not modified.');
   if(parent.atoms.some(a=>!['C','H','N','O','F','P','S','Cl','Br','I'].includes(a.element)))return fail('Unsupported element in this bounded design subset.');
   if(!supportedValences(parent))return fail('Radical or unsupported valence states are outside this design subset.');
   if(!exact(parent,parse(serialized(parent))))return fail('The complete parent isotope/stereochemical identity could not be verified after serialization.');
   let sites=freeSites(parent);report.eligibleSites=sites.map(({designs,...site})=>({...site,designs:designs.map(({id,name,cleavage})=>({id,name,cleavage}))}));
   if(options&&options.atom!==undefined){
    if(!Number.isInteger(options.atom)||!parent.atoms[options.atom])return fail('Select a valid input atom.');
    sites=sites.filter(s=>s.atom===options.atom);
   }
   if(options&&options.designId!==undefined){
    sites=sites.map(s=>({...s,designs:s.designs.filter(d=>d.id===options.designId)})).filter(s=>s.designs.length);
   }
   if(!sites.length){report.status='no-compatible-site';return fail('No compatible site for the current ester, phosphate, amine-carbamate, N-oxide, thioester, N–H linker or aldehyde/ketone design classes at the selected site(s). This is a coverage limit, not evidence that no prodrug is possible.');}
   const requested=options&&options.limit!==undefined?Number(options.limit):5;
   const limit=Number.isFinite(requested)?Math.max(0,Math.min(5,Math.floor(requested))):5;
   if(!limit)return fail('Candidate limit is zero.');
   // Round-robin across handles before homologues, rather than hide every site
   // behind five modifications of the first oxygen.
   const structures=[];
   for(let d=0;d<5&&rows.length<limit;d++)for(const site of sites){
    if(rows.length>=limit)break;const design=site.designs[d];if(!design)continue;
    try{
     const smiles=serialized(attach(parent,site,design)),candidate=parse(smiles);
     if(!connected(candidate)||!supportedValences(candidate)||exact(candidate,parent)||structures.some(m=>exact(m,candidate)))continue;
     if(!exact(candidate,parse(serialized(candidate)))){skipped.push({site:site.label,promoiety:design.name,reason:'Candidate stereochemical identity is unresolved or not preserved.'});continue;}
     const recovery=recoverParent(smiles,design.cleavage,parent);if(!recovery.verified){skipped.push({site:site.label,promoiety:design.name,reason:'Exact parent recovery was not verified.'});continue;}
     structures.push(candidate);
     rows.push({id:design.id+'-'+site.element.toLowerCase()+(site.atom+1),name:design.name+' candidate at '+site.element+(site.atom+1),smiles,promoiety:design.name,site:{atom:site.atom,index:site.atom,kind:site.kind,label:site.label},cleavage:design.cleavage,activationHypothesis:design.hypothesis,
      parentRecoveryScope:'Reverse graph edit restores the supplied isotope, stereo and charge state; it does not predict biological release or solution protonation.',
      limitations:COMMON_LIMITS.concat(design.limitations||[],parent.atoms[site.atom].charge!==site.charge?['The design changes the handle charge; reverse checking restores the input charge state by bookkeeping, not a pKa or physiological protonation model.']:[],report.eligibleSites.length>1?['This is a single-site design on a molecule with several eligible handles; selective preparation and competing activation are not established.']:[]),
      evidenceLevel:'Unvalidated structural design',designStatus:'hypothesis',sourceUrl:design.sources[0].url,sources:design.sources.map(s=>Object.assign({},s)),referenceScope:'Reaction-class precedents only; no molecule-specific experimental evidence.',parentRecoveryVerified:true,recoveredParentSmiles:recovery.smiles,attachment:recovery.attachment,experimentalValidation:false});
    }catch(error){skipped.push({site:site.label,promoiety:design.name,reason:'The proposed structure could not be validated.'});}
   }
   if(rows.length){report.status='generated';reasons.push(rows.length+' unique unvalidated candidate'+(rows.length===1?'':'s')+' generated. No ranking of clinical benefit is made.');}
   else reasons.push('No candidate passed the bounded structure and exact-parent recovery checks.');
  }catch(error){reasons.push('Candidate generation unavailable for this structure: '+error.message);}
  return report;
 }
 const api={generate,recoverParent,prepareParent,validGraph:supportedValences,sites:parent=>generate(parent,{limit:0}).eligibleSites||[],sources:SOURCES};root.ProdrugCandidates=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
