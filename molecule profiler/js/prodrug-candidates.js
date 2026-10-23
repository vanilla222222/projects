'use strict';
(function(root){
 // Structural design hypotheses only. The reverse edit checks identity, not
 // biological activation, enzyme recognition, efficacy or delivery benefit.
 const SOURCES={
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
   if(a.charge||oxo.length)return [];
   if(carbon.aromatic)return site('phenol','phenolic oxygen',OH_DESIGNS);
   if(cn.every(n=>n.bond.order===1)&&cn.filter(n=>m.atoms[n.id].element==='O').length===1)return site('alcohol','alcohol oxygen',OH_DESIGNS);
   return [];
  });
 }
 function attach(m,site,design){
  const g=cloneGraph(m),part=parse(design.fragment),offset=g.atoms.length;
  const atoms=part.atoms.map(cloneAtom);atoms.forEach(a=>{if(a.order)a.order=a.order.map(id=>id===null?null:id+offset);});
  atoms[0].totalH=Math.max(0,atoms[0].totalH-1);atoms[0].explicitH=atoms[0].totalH;atoms[0].implicitH=0;
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
  return {atoms,bonds};
 }
 function recoverParent(candidateSmiles,cleavage,parent){
  if(!['o-acyl','o-phosphate','acid-ester','n-carbamate','n-oxide'].includes(cleavage))return {verified:false,smiles:null};
  try{
   const m=parse(candidateSmiles);
   for(let anchor=0;anchor<m.atoms.length;anchor++){
    const a=m.atoms[anchor],ns=neighbors(m,anchor),nitrogen=cleavage.startsWith('n-');
    if(a.element!==(nitrogen?'N':'O')||ns.some(n=>n.bond.order!==1))continue;
    if(nitrogen?(cleavage==='n-oxide'?a.charge!==1||ns.length!==4:a.charge||![2,3].includes(ns.length)):a.charge||ns.length!==2)continue;
    for(const n of ns){
     const atom=m.atoms[n.id],neighborsOfBranch=neighbors(m,n.id),oxo=neighborsOfBranch.filter(x=>x.bond.order===2&&m.atoms[x.id].element==='O');
     const carbonyl=atom.element==='C'&&oxo.length===1;
     if(cleavage==='o-acyl'&&!carbonyl)continue;
     if(cleavage==='o-phosphate'&&(atom.element!=='P'||oxo.length!==1))continue;
     if(cleavage==='acid-ester'&&(atom.element!=='C'||carbonyl||!ns.some(x=>x.id!==n.id&&m.atoms[x.id].element==='C'&&neighbors(m,x.id).some(y=>y.bond.order===2&&m.atoms[y.id].element==='O'))))continue;
     if(cleavage==='n-carbamate'&&(!carbonyl||!neighborsOfBranch.some(x=>x.bond.order===1&&m.atoms[x.id].element==='O')))continue;
     if(cleavage==='n-oxide'&&(atom.element!=='O'||atom.charge!==-1||neighborsOfBranch.length!==1))continue;
     const restores=nitrogen?(cleavage==='n-oxide'?[{hydrogens:0,charge:0},{hydrogens:1,charge:1}]:[{hydrogens:a.totalH+1,charge:0},{hydrogens:a.totalH+2,charge:1}]):[{hydrogens:1,charge:0},{hydrogens:0,charge:-1}];
     for(const restore of restores){
      const recovered=removeBranch(m,anchor,n.id,restore);if(!recovered)continue;
      const smiles=serialized(recovered);if(exact(parent,parse(smiles)))return {verified:true,smiles};
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
 function generate(parent,options){
  const rows=[],reasons=[],skipped=[];
  const report={version:2,status:'unavailable',rows,candidates:rows,reasons,skipped,evidenceLevel:'Unvalidated structural designs',scope:'At most five single-site ester, phosphate, amine-carbamate or N-oxide hypotheses. Structural parent recovery does not establish biological conversion or prodrug status.'};
  const fail=message=>{reasons.push(message);return report;};
  try{
   if(!parent||!Array.isArray(parent.atoms)||!Array.isArray(parent.bonds))return fail('A parsed molecular graph is required.');
   if(parent.atoms.length>120)return fail('The bounded generator accepts at most 120 atoms.');
   if(!connected(parent))return fail('Use one connected parent structure; salts and mixtures are not normalized for design.');
   if(parent.atoms.some(a=>!['C','H','N','O','F','P','S','Cl','Br','I'].includes(a.element)))return fail('Unsupported element in this bounded design subset.');
   if(!supportedValences(parent))return fail('Radical or unsupported valence states are outside this design subset.');
   if(/[\\/]/.test(parent.smiles||''))return fail('Directional alkene stereochemistry cannot yet be preserved by the design serializer; no candidate was generated.');
   if(!exact(parent,parse(serialized(parent))))return fail('The complete parent isotope/stereochemical identity could not be verified after serialization.');
   const sites=freeSites(parent);report.eligibleSites=sites.map(({designs,...site})=>site);
   if(!sites.length){report.status='no-compatible-site';return fail('No compatible site for the current ester, phosphate, amine-carbamate or tertiary-amine N-oxide design classes. This is a coverage limit, not evidence that no prodrug is possible.');}
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
      limitations:COMMON_LIMITS.concat(design.limitations||[],parent.atoms[site.atom].charge!==site.charge?['The design changes the handle charge; reverse checking restores the input charge state by bookkeeping, not a pKa or physiological protonation model.']:[],sites.length>1?['This is a single-site design on a molecule with several eligible handles; selective preparation and competing activation are not established.']:[]),
      evidenceLevel:'Unvalidated structural design',designStatus:'hypothesis',sourceUrl:design.sources[0].url,sources:design.sources.map(s=>Object.assign({},s)),referenceScope:'Reaction-class precedents only; no molecule-specific experimental evidence.',parentRecoveryVerified:true,recoveredParentSmiles:recovery.smiles,experimentalValidation:false});
    }catch(error){skipped.push({site:site.label,promoiety:design.name,reason:'The proposed structure could not be validated.'});}
   }
   if(rows.length){report.status='generated';reasons.push(rows.length+' unique unvalidated candidate'+(rows.length===1?'':'s')+' generated. No ranking of clinical benefit is made.');}
   else reasons.push('No candidate passed the bounded structure and exact-parent recovery checks.');
  }catch(error){reasons.push('Candidate generation unavailable for this structure: '+error.message);}
  return report;
 }
 const api={generate,recoverParent,sources:SOURCES};root.ProdrugCandidates=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
