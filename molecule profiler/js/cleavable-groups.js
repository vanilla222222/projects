'use strict';
// Existing-group transformations, distinct from parent-regenerating attachments.
(function(root){
 const SOURCES={
  'ether-hemiacetal':{title:'Soft Alkyl Ether Prodrugs of a Model Phenolic Drug (experimental reaction-class precedent)',url:'https://doi.org/10.3390/molecules14104231'},
  'hydroxymethyl-linker':{title:'Bioreversible amine carbamates and hydroxymethyl linker precedents',url:'https://pubmed.ncbi.nlm.nih.gov/2892933/'},
  'nh-hydroxymethyl':{title:'Hydrolysis of N-(hydroxyalkyl) amides: stability limits for prodrug design',url:'https://www.sciencedirect.com/science/article/pii/0378517384900449'},
  'carbamic-acid':{title:'Alexander et al.: Bioreversible acyloxyalkyl carbamates for amines',url:'https://pubmed.ncbi.nlm.nih.gov/2892933/'},
  imine:{title:'NMR studies of Schiff bases: imines in aqueous solution',url:'https://www.sciencedirect.com/science/article/pii/0022236474901541'},
  oxime:{title:'Hydrolytic Stability of Hydrazones and Oximes',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC2743602/'},
  hydrazone:{title:'Hydrolytic Stability of Hydrazones and Oximes',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC2743602/'},
  phosphate:{title:'Hydrolysis of pharmaceutically relevant phosphate monoester monoanions',url:'https://pubmed.ncbi.nlm.nih.gov/8429495/'},
  'n-oxide':{title:'Comparison of aromatic and tertiary amine N-oxides as bioreductive compounds',url:'https://pubmed.ncbi.nlm.nih.gov/10974206/'},
  ether:{title:'Anisole homologues: O-dealkylation and competing oxidation in rat liver microsomes',url:'https://pubmed.ncbi.nlm.nih.gov/1492425/'},
  ester:{title:'In vitro hydrolysis and transesterification of the ester prodrug CDP323',url:'https://pubmed.ncbi.nlm.nih.gov/24179032/'},
  carbonate:{title:'Phosphoryloxymethyl carbamates and carbonates: regeneration and instability studies',url:'https://pubmed.ncbi.nlm.nih.gov/8234176/'},
  carbamate:{title:'Synthesis and evaluation of carbamate prodrugs of a phenolic compound',url:'https://pubmed.ncbi.nlm.nih.gov/17268110/'},
  thioester:{title:'Alacepril deacetylation in rat tissue preparations',url:'https://pubmed.ncbi.nlm.nih.gov/3513776/'},
  acetal:{title:'Acetals as pH-sensitive linkages for drug delivery',url:'https://pubmed.ncbi.nlm.nih.gov/15546191/'},
  disulfide:{title:'Glutathione-releasable disulfide drug conjugate: design and evaluation',url:'https://www.sciencedirect.com/science/article/abs/pii/S0223523415301252'}
 };
 const parse=s=>buildMolecule(parseSmiles(s));
 const clone=m=>({atoms:m.atoms.map(a=>({...a,order:a.order?.slice(),neighbors:[],rings:[],explicitH:a.totalH,implicitH:0})),bonds:m.bonds.map(b=>({...b})),smiles:m.smiles});
 const ns=(m,i)=>m.bonds.flatMap(b=>b.a===i?[{id:b.b,bond:b}]:b.b===i?[{id:b.a,bond:b}]:[]);
 const serialize=m=>writeSmiles(clone(m));
 function prepared(input){
  try{
   const p=root.ProdrugCandidates?.prepareParent(input);if(!p||p.mol.atoms.length>120||!root.ProdrugCandidates.validGraph(p.mol))return null;
   return Pharmacology.exactGraph(p.mol,parse(serialize(p.mol)))?p:null;
  }catch(_){return null;}
 }
 function pathways(input){
  const p=prepared(input);if(!p)return [];
  const m=p.mol,rows=[];
  const add=(kind,anchors,cutBonds,action,label,note,extra={})=>rows.push({id:kind+'-'+anchors.join('-')+'-'+rows.length,kind,atoms:anchors.map(i=>p.inputAtoms[i]),cutBonds:cutBonds.map(([a,b])=>[p.inputAtoms[a],p.inputAtoms[b]]),localCuts:cutBonds,action,label,note,source:SOURCES[kind],normalization:p.normalization,...extra});
  m.atoms.forEach((a,i)=>{
   const links=ns(m,i);
   // Formal fragmentation hypotheses for exposed linker intermediates only.
   if(a.element==='C'&&!a.aromatic&&!a.charge&&!a.chirality&&a.totalH<=2&&links.length>=2&&links.every(n=>n.bond.order===1&&['C','N','O'].includes(m.atoms[n.id].element))){
    const oh=links.find(n=>{const o=m.atoms[n.id];return o.element==='O'&&!o.charge&&o.totalH===1&&ns(m,n.id).length===1;});
    const anchor=oh&&links.find(n=>n.id!==oh.id&&['N','O'].includes(m.atoms[n.id].element));
    if(anchor){
     const x=m.atoms[anchor.id],xn=ns(m,anchor.id),carbonyl=n=>m.atoms[n.id].element==='C'&&ns(m,n.id).some(v=>v.bond.order===2&&m.atoms[v.id].element==='O');
     const nLinked=a.totalH===2&&links.length===2&&x.element==='N'&&!x.aromatic&&!x.charge&&!x.chirality&&xn.every(n=>n.bond.order===1&&m.atoms[n.id].element==='C')&&xn.some(carbonyl);
     const oLinked=a.totalH===2&&links.length===2&&x.element==='O'&&!x.charge&&!x.totalH&&xn.length===2&&xn.some(n=>n.id!==i&&carbonyl(n)&&ns(m,n.id).some(v=>v.bond.order===1&&m.atoms[v.id].element==='N'));
     const hemiacetal=x.element==='O'&&!x.charge&&!x.totalH&&xn.length===2&&xn.every(n=>n.bond.order===1&&m.atoms[n.id].element==='C')&&xn.some(n=>n.id!==i&&!carbonyl(n))&&links.filter(n=>m.atoms[n.id].element==='O').length===2&&links.every(n=>['C','O'].includes(m.atoms[n.id].element));
     if(hemiacetal)add('ether-hemiacetal',[anchor.id,i,oh.id],[[anchor.id,i]],'linker-fragmentation','Soft ether: hemiacetal / hemiketal fragmentation','Formal fragmentation exposes a phenol or alcohol plus an aldehyde or ketone. Phenolic soft-ether precedents support the reaction class; other scaffolds and substituted linkers are extrapolations. No physiological rate or conversion is assigned.',{linkerCarbon:i,linkerOxygen:oh.id,linkerAnchor:anchor.id});
     if(nLinked||oLinked)add(nLinked?'nh-hydroxymethyl':'hydroxymethyl-linker',[anchor.id,i,oh.id],[[anchor.id,i]],'linker-fragmentation','Hydroxymethyl linker fragmentation','Formal fragmentation exposes an N–H or O–H group and formaldehyde. This is a possible intermediate step, not evidence of physiological release; N-hydroxymethyl amides can be too stable for useful conversion.',{linkerCarbon:i,linkerOxygen:oh.id,linkerAnchor:anchor.id});
    }
   }
   if(a.element==='C'&&!a.aromatic&&!a.charge&&links.length===3){
    const oxo=links.find(n=>n.bond.order===2&&m.atoms[n.id].element==='O'&&!m.atoms[n.id].charge);
    const oh=links.find(n=>n.bond.order===1&&m.atoms[n.id].element==='O'&&!m.atoms[n.id].charge&&m.atoms[n.id].totalH===1&&ns(m,n.id).length===1);
    const n=links.find(n=>{const x=m.atoms[n.id];return n.bond.order===1&&x.element==='N'&&!x.aromatic&&!x.charge&&!x.chirality&&ns(m,n.id).every(v=>v.bond.order===1&&m.atoms[v.id].element==='C');});
    if(oxo&&oh&&n)add('carbamic-acid',[i,n.id,oh.id],[[i,n.id]],'decarboxylation','Carbamic acid decarboxylation','Formal decarboxylation can expose an amine plus carbon dioxide. The step has no assigned rate or physiological conversion probability.',{carbamicCarbon:i,carbamicOxygen:oh.id,carbamicNitrogen:n.id});
   }
   if(a.element==='N'&&!a.aromatic&&[0,1].includes(a.charge||0)){
    const double=links.filter(n=>n.bond.order===2&&m.atoms[n.id].element==='C'&&!m.atoms[n.id].aromatic&&!m.atoms[n.id].charge),single=links.filter(n=>n.bond.order===1);
    if(double.length===1&&links.length===1+single.length&&single.length<=1&&single.every(n=>['C','N','O'].includes(m.atoms[n.id].element))){
     const c=double[0].id,cn=ns(m,c);
     if(cn.every(n=>n.id===i||n.bond.order===1&&['C','H'].includes(m.atoms[n.id].element))){
      const partner=single[0]&&m.atoms[single[0].id],kind=partner?.element==='O'?'oxime':partner?.element==='N'?'hydrazone':'imine';
      add(kind,[i,c,...single.map(n=>n.id)],[[c,i]],'imine-hydrolysis',kind[0].toUpperCase()+kind.slice(1)+' hydrolysis','Formal C=N hydrolysis can restore a carbonyl and a nitrogen-containing product. Equilibrium, pH and substitution strongly affect release; oximes can be particularly stable. No rapid or physiological cleavage is inferred.');
     }
    }
   }
   if(a.element==='P'&&!a.charge&&!a.chirality&&links.length===4&&links.filter(n=>n.bond.order===2&&m.atoms[n.id].element==='O').length===1&&links.every(n=>m.atoms[n.id].element==='O'&&[1,2].includes(n.bond.order))){
    for(const n of links){const o=m.atoms[n.id],on=ns(m,n.id);if(n.bond.order===1&&!o.charge&&!o.totalH&&on.length===2&&on.every(x=>x.bond.order===1)&&on.some(x=>x.id!==i&&m.atoms[x.id].element==='C'))add('phosphate',[i,n.id],[[n.id,i]],'hydrolysis','Phosphate ester: one dephosphorylation step','Formal P–O ester hydrolysis exposes an OH group and a phosphate fragment. The supplied charge state is retained; phosphatase recognition, pKa, speed and subsequent steps are not predicted.');}
   }
   if(a.element==='N'&&a.charge===1&&!a.totalH&&!a.chirality){
    const oxygen=links.find(n=>n.bond.order===1&&m.atoms[n.id].element==='O'&&m.atoms[n.id].charge===-1&&ns(m,n.id).length===1);
    if(oxygen&&links.length===(a.aromatic?3:4)&&links.filter(n=>n.id!==oxygen.id).every(n=>m.atoms[n.id].element==='C'&&(a.aromatic?n.bond.aromatic:n.bond.order===1)))add('n-oxide',[i,oxygen.id],[[i,oxygen.id]],'n-oxide-reduction','N-oxide reductive deoxygenation','Formal reduction restores an amine or aromatic nitrogen and water. Enzymatic conversion, oxygen dependence and activity of the product remain compound-specific.');
   }
   if(a.element==='O'&&!a.charge&&!a.totalH&&links.length===2&&links.every(n=>n.bond.order===1&&m.atoms[n.id].element==='C')){
    const carbonyls=links.filter(n=>ns(m,n.id).some(x=>x.bond.order===2&&m.atoms[x.id].element==='O'));
    if(carbonyls.length===1){
     const c=carbonyls[0].id,other=links.find(n=>n.id!==c).id,cn=ns(m,c),single=cn.filter(n=>n.bond.order===1&&n.id!==i);
     if(single.length<=1&&cn.filter(n=>n.bond.order===2&&m.atoms[n.id].element==='O').length===1&&cn.every(n=>n.bond.order<=2)){
      const branch=single[0]&&m.atoms[single[0].id],kind=branch?.element==='O'?'carbonate':branch?.element==='N'?'carbamate':!branch||branch.element==='C'?'ester':null;
      if(kind)add(kind,[i,c],[[i,c]],'hydrolysis',kind==='ester'?(m.atoms[other].aromatic?'Aryl ester hydrolysis':'Ester / lactone hydrolysis'):kind==='carbonate'?'Carbonate: first hydrolysis step':'Carbamate: first hydrolysis step',kind==='ester'?'Possible ester hydrolysis; enzyme recognition, rate and human occurrence are unknown.':'Only the first hydrolysis products are shown. The carbonic/carbamic acid intermediate is not assumed to complete a fragmentation cascade.');
     }
    }else if(!carbonyls.length){
     for(const n of links){
      const c=m.atoms[n.id],cn=ns(m,n.id);
      if(c.aromatic||c.charge||c.totalH<1||cn.some(x=>x.bond.order!==1||x.id!==i&&!['C','H'].includes(m.atoms[x.id].element)))continue;
      const other=links.find(x=>x.id!==n.id).id,aryl=m.atoms[other].aromatic;
      add('ether',[i,n.id,other],[[i,n.id]],'ether',aryl?'Benzene / aryl–O–alkyl: O-dealkylation':'Aliphatic / benzyl ether: oxidative O-dealkylation','Oxidation at an alkyl carbon bearing hydrogen could expose an OH group and form an aldehyde or ketone. Competing oxidation may dominate; a motif does not establish a human metabolic pathway.',{oxidizedCarbon:n.id});
     }
    }
   }
   if(a.element==='S'&&!a.charge&&!a.totalH&&!a.chirality&&links.length===2&&links.every(n=>n.bond.order===1&&m.atoms[n.id].element==='C')){
    const c=links.find(n=>ns(m,n.id).some(x=>x.bond.order===2&&m.atoms[x.id].element==='O'));
    if(c&&ns(m,c.id).every(x=>x.id===i||m.atoms[x.id].element==='C'||x.bond.order===2&&m.atoms[x.id].element==='O'))add('thioester',[i,c.id],[[i,c.id]],'hydrolysis','Thioester hydrolysis','Possible thiol and carboxylic-acid products; competing acyl transfer and oxidation are not assessed.');
   }
   if(a.element==='C'&&!a.aromatic&&!a.charge&&links.every(n=>n.bond.order===1&&['C','O','H'].includes(m.atoms[n.id].element))){
    const oxygens=links.filter(n=>m.atoms[n.id].element==='O');
    if(oxygens.length===2&&oxygens.every(n=>{const o=m.atoms[n.id],on=ns(m,n.id);return !o.charge&&!o.totalH&&on.length===2&&on.every(x=>x.bond.order===1&&m.atoms[x.id].element==='C');}))add('acetal',[i,...oxygens.map(n=>n.id)],oxygens.map(n=>[i,n.id]),'acetal','Acetal / ketal hydrolysis','Chemical hydrolysis hypothesis: pH, substitution and ring structure control lability. No physiological acid-triggered release is inferred.',{oxidizedCarbon:i});
   }
  });
  m.bonds.forEach(b=>{
   if(b.order!==1||m.atoms[b.a].element!=='S'||m.atoms[b.b].element!=='S')return;
   if([b.a,b.b].every(i=>{const a=m.atoms[i],links=ns(m,i);return !a.charge&&!a.totalH&&!a.chirality&&links.length===2&&links.every(n=>n.bond.order===1&&([b.a,b.b].includes(n.id)||m.atoms[n.id].element==='C'));}))add('disulfide',[b.a,b.b],[[b.a,b.b]],'disulfide','Disulfide reduction','Two thiol ends are the formal reduction products. Reductant, accessibility, redox equilibrium and any later payload release remain unknown.');
  });
  return rows;
 }
 function sites(input){
  const byAtom=new Map();for(const path of pathways(input))for(const atom of path.atoms){
   if(!byAtom.has(atom))byAtom.set(atom,{atom,index:atom,element:input.atoms[atom].element,kind:'existing '+path.kind,designs:[]});
   if(!byAtom.get(atom).kind.includes('existing '+path.kind))byAtom.get(atom).kind+=' / existing '+path.kind;
   byAtom.get(atom).designs.push({id:'cleave:'+path.id,name:'Explore '+path.label+' · input bond '+path.cutBonds.map(([a,b])=>(a+1)+'–'+(b+1)).join(', '),mode:'existing-cleavage'});
  }return [...byAtom.values()];
 }
 function preview(input,pathId,selectedAtom){
  const result={version:1,status:'unavailable',mode:'existing-cleavage',products:[],reasons:[],inputRegenerated:false,evidenceLevel:'Unvalidated transformation hypothesis'};
  try{
   const path=pathways(input).find(p=>p.id===pathId&&p.atoms.includes(selectedAtom)),p=prepared(input);
   if(!p||!path){result.reasons.push('Choose a compatible existing group at the selected input atom.');return result;}
   const g=clone(p.mol),cut=(a,b)=>{g.bonds=g.bonds.filter(x=>!((x.a===a&&x.b===b)||(x.a===b&&x.b===a)));},setH=(i,h)=>{g.atoms[i].totalH=h;g.atoms[i].explicitH=h;g.atoms[i].implicitH=0;};
   const addO=(carbon,order,h)=>{const index=g.atoms.length;g.atoms.push({index,element:'O',aromatic:false,charge:0,totalH:h,explicitH:h,implicitH:0,chirality:null,order:[]});g.bonds.push({a:carbon,b:index,order,aromatic:false});};
   result.stereoChanges=[];
   const planarize=i=>{if(g.atoms[i].chirality)result.stereoChanges.push({inputAtom:p.inputAtoms[i],change:'Reacting tetrahedral carbon becomes a planar carbonyl; its prior tetrahedral stereo is removed.'});g.atoms[i].chirality=null;g.atoms[i].order=null;};
   path.localCuts.forEach(([a,b])=>cut(a,b));
   if(path.action==='linker-fragmentation'){
    planarize(path.linkerCarbon);setH(path.linkerAnchor,g.atoms[path.linkerAnchor].totalH+1);setH(path.linkerOxygen,0);
    const b=g.bonds.find(b=>(b.a===path.linkerCarbon&&b.b===path.linkerOxygen)||(b.b===path.linkerCarbon&&b.a===path.linkerOxygen));b.order=2;b.dir=0;
   }else if(path.action==='decarboxylation'){
    setH(path.carbamicNitrogen,g.atoms[path.carbamicNitrogen].totalH+1);setH(path.carbamicOxygen,0);
    const b=g.bonds.find(b=>(b.a===path.carbamicCarbon&&b.b===path.carbamicOxygen)||(b.b===path.carbamicCarbon&&b.a===path.carbamicOxygen));b.order=2;b.dir=0;
   }else if(path.action==='ether'){
    const [oxygen,carbon]=path.localCuts[0];setH(oxygen,1);setH(carbon,g.atoms[carbon].totalH-1);planarize(carbon);addO(carbon,2,0);
   }else if(path.action==='hydrolysis'){
    const [leaving,carbonyl]=path.localCuts[0];setH(leaving,1);addO(carbonyl,1,1);
   }else if(path.action==='imine-hydrolysis'){
    const [carbon,nitrogen]=path.localCuts[0];
    if(stereoAnalyse(p.mol).bonds.some(b=>b.specified&&[carbon,nitrogen].includes(b.a)&&[carbon,nitrogen].includes(b.b)))result.stereoChanges.push({inputAtom:p.inputAtoms[carbon],change:'Reacting C=N geometry is consumed by hydrolysis; remote specified double-bond geometry is retained.'});
    setH(nitrogen,g.atoms[nitrogen].totalH+2);planarize(carbon);addO(carbon,2,0);
   }else if(path.action==='n-oxide-reduction'){
    const [nitrogen,oxygen]=path.localCuts[0];g.atoms[nitrogen].charge=0;g.atoms[oxygen].charge=0;setH(oxygen,2);
   }else if(path.action==='disulfide'){
    path.localCuts[0].forEach(i=>setH(i,1));
   }else if(path.action==='acetal'){
    path.localCuts.forEach(([,oxygen])=>setH(oxygen,1));planarize(path.oxidizedCarbon);addO(path.oxidizedCarbon,2,0);
   }
   // A consumed C=N no longer has E/Z geometry. Keep shared markers if they
   // still specify an adjacent, unchanged double bond in a conjugated system.
   g.bonds.forEach(b=>{if(b.dir&&!g.bonds.some(d=>d.order===2&&(d.a===b.a||d.b===b.a||d.a===b.b||d.b===b.b)))b.dir=0;});
   const edited=buildMolecule(g),smiles=serialize(edited),parsed=parse(smiles);
   if(!root.ProdrugCandidates.validGraph(edited)||!Pharmacology.exactGraph(edited,parsed))throw Error('Product graph validation failed.');
   result.products=smiles.split('.').map((s,i)=>({name:'Hypothetical product '+(i+1),smiles:s,evidenceLevel:result.evidenceLevel}));
   result.status='predicted-products';result.pathway={id:path.id,kind:path.kind,label:path.label,atoms:path.atoms,cutBonds:path.cutBonds};result.inputSmiles=input.smiles;result.selectedAtom=selectedAtom;result.source=path.source;result.normalization=path.normalization?{...path.normalization,scope:'Recognized counterions omitted. These transformations concern the organic component, not the complete salt or solution protonation.'}:null;result.hypothesis=path.note;
   result.limitations=['These products differ from the input. This preview does not regenerate or validate a prodrug of the original molecule.','No rate, enzyme specificity, human conversion, activity, ADME benefit or safety is predicted.','Sources describe reaction classes in other compounds; they do not establish this pathway for the selected molecule.','All fragments, including potentially reactive carbonyls and intermediates, are shown without ranking any as the active product.','Any new oxygen is a formal oxidation/hydrolysis input. Product isotope tracing is not an experimental assignment.'];
   if(result.normalization)result.limitations.push(result.normalization.scope);
  }catch(e){result.products=[];result.reasons.push('Transformation unavailable: '+e.message);}
  return result;
 }

 // Redesign of an existing ether, NOT a parent-regenerating attachment.
 const ETHER_ACYLS=[['acetate','Acetate','C'],['propionate','Propionate','CC'],['butyrate','Butyrate','CCC'],['isobutyrate','Isobutyrate','C(C)C'],['pivalate','Pivalate','C(C)(C)C'],['benzoate','Benzoate','c1ccccc1'],['hemisuccinate','Hemisuccinate','CCC(=O)O']];
 function etherTargets(input){
  const p=prepared(input);if(!p)return [];
  return pathways(input).filter(path=>path.kind==='ether').flatMap(path=>{
   const [o,c]=path.localCuts[0],m=p.mol,a=m.atoms[c];
   // Replacing a specified stereocentre would require a stereochemical design.
   if(a.chirality||a.totalH<1)return [];
   const gone=new Set(),q=[c];while(q.length){const i=q.pop();if(gone.has(i))continue;gone.add(i);ns(m,i).forEach(n=>{if(n.id!==o)q.push(n.id);});}
   if(m.bonds.filter(b=>gone.has(b.a)!==gone.has(b.b)).length!==1)return [];
   const indices=new Map(),g=clone(m);g.atoms=g.atoms.filter((a,i)=>{if(gone.has(i))return false;indices.set(i,indices.size);return true;});
   for(const a of g.atoms){if(a.order)a.order=a.order.map(i=>i===null?null:indices.get(i));if(a.chirality&&a.order?.some(i=>i===undefined))return [];}
   g.bonds=g.bonds.filter(b=>indices.has(b.a)&&indices.has(b.b)).map(b=>({...b,a:indices.get(b.a),b:indices.get(b.b)}));
   const anchor=g.atoms[indices.get(o)];anchor.totalH=anchor.explicitH=1;anchor.implicitH=0;
   try{const target=serialize(g);if(!root.ProdrugCandidates.validGraph(parse(target))||!Pharmacology.exactGraph(buildMolecule(g),parse(target)))return [];
    const other=ns(m,o).find(n=>n.id!==c).id,aryl=m.atoms[other].aromatic,methyl=a.totalH===3&&ns(m,c).length===1;
    const groupKind=methyl?'methoxy':ns(m,c).some(n=>n.id!==o&&m.atoms[n.id].aromatic)?'benzyloxy':'alkoxy';
    const groupLabel=(methyl?'Methoxy':groupKind==='benzyloxy'?'Benzyloxy':'Alkoxy')+(aryl?' on aromatic ring':' ether')+' · O'+(p.inputAtoms[o]+1)+'–C'+(p.inputAtoms[c]+1)+(aryl?' · ring C'+(p.inputAtoms[other]+1):'');
    return [{id:'redesign:'+p.inputAtoms[c]+'-'+p.inputAtoms[o],carbon:c,oxygen:o,atom:p.inputAtoms[c],oxygenAtom:p.inputAtoms[o],groupKind,groupLabel,releaseTargetSmiles:target,normalization:p.normalization}];
   }catch(_){return [];}
  });
 }
 function redesignSites(input){
  const map=new Map();for(const t of etherTargets(input))for(const atom of [t.atom,t.oxygenAtom]){
   if(!map.has(atom))map.set(atom,{atom,element:input.atoms[atom].element,kind:t.groupLabel+' · ester-triggered redesign · different release target',designs:[]});
   map.get(atom).designs.push(...ETHER_ACYLS.map(([id,name])=>({id:t.id+':'+id,name:name+' '+t.groupKind+' soft ether · modify C'+(t.atom+1)+' · releases OH analogue',mode:'redesign'})));
  }return [...map.values()];
 }
 function redesign(input,id,atom){
  const result={version:1,status:'unavailable',mode:'ether-redesign',parentRecoveryVerified:false,inputRegenerated:false,experimentalValidation:false,reasons:[]};
  try{
   const t=etherTargets(input).find(t=>id.startsWith(t.id+':')&&[t.atom,t.oxygenAtom].includes(atom)),acyl=ETHER_ACYLS.find(a=>id===t?.id+':'+a[0]),p=prepared(input);
   if(!t||!acyl||!p)throw Error('Select a supported acyclic ether carbon bearing hydrogen.');
   const g=clone(p.mol),part=clone(parse('OC(=O)'+acyl[2])),offset=g.atoms.length;
   g.atoms[t.carbon].totalH--;g.atoms[t.carbon].explicitH=g.atoms[t.carbon].totalH;g.atoms[t.carbon].implicitH=0;
   part.atoms[0].totalH=part.atoms[0].explicitH=0;part.atoms[0].implicitH=0;
   part.atoms.forEach(a=>{if(a.order)a.order=a.order.map(i=>i===null?null:i+offset);});
   g.atoms.push(...part.atoms);g.bonds.push(...part.bonds.map(b=>({...b,a:b.a+offset,b:b.b+offset})),{a:t.carbon,b:offset,order:1,aromatic:false});
   const smiles=serialize(g),m=parse(smiles);if(!root.ProdrugCandidates.validGraph(m)||!Pharmacology.exactGraph(buildMolecule(g),m))throw Error('Redesign identity / valence validation failed.');
   return {...result,status:'designed',id,name:acyl[1]+' ester-triggered ether redesign',smiles,releaseTargetSmiles:t.releaseTargetSmiles,selectedAtom:atom,modifiedCarbon:t.atom,normalization:t.normalization,source:SOURCES['ether-hemiacetal'],hypothesis:'Ester hydrolysis → exposed hemiacetal / hemiketal → phenol or alcohol plus a carbonyl byproduct.',limitations:['The release target is the OH analogue, not the original methoxy / alkoxy input. Original-molecule recovery is not claimed.','This is a structural redesign, not a synthesis procedure or evidence of biological activation.','The new ester replaces a carbon-bound hydrogen; the ether oxygen remains neutral and two-coordinate.','New linker stereochemistry is unspecified. Existing specified linker stereocentres and cyclic ether bonds are excluded.','Phenolic soft-ether evidence supports the reaction class only; aliphatic and substituted linker designs are extrapolations.','No rate, enzyme recognition, ADME benefit, activity or safety is predicted. All release fragments are retained in the pathway view.']};
  }catch(e){result.reasons.push(e.message);return result;}
 }
 root.CleavableGroups={pathways,sites,preview,redesignSites,redesignGroups:input=>etherTargets(input).map(t=>({id:t.id,atom:t.atom,oxygenAtom:t.oxygenAtom,kind:t.groupKind,label:t.groupLabel})),redesign,sources:SOURCES};if(typeof module!=='undefined'&&module.exports)module.exports=root.CleavableGroups;
})(globalThis);
