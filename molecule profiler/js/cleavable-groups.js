'use strict';
// Existing-group transformations, distinct from parent-regenerating attachments.
(function(root){
 const SOURCES={
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
   const p=root.ProdrugCandidates?.prepareParent(input);if(!p||p.mol.atoms.length>120||/[\\/]/.test(p.mol.smiles||'')||!root.ProdrugCandidates.validGraph(p.mol))return null;
   return Pharmacology.exactGraph(p.mol,parse(serialize(p.mol)))?p:null;
  }catch(_){return null;}
 }
 function pathways(input){
  const p=prepared(input);if(!p)return [];
  const m=p.mol,rows=[];
  const add=(kind,anchors,cutBonds,action,label,note,extra={})=>rows.push({id:kind+'-'+anchors.join('-')+'-'+rows.length,kind,atoms:anchors.map(i=>p.inputAtoms[i]),cutBonds:cutBonds.map(([a,b])=>[p.inputAtoms[a],p.inputAtoms[b]]),localCuts:cutBonds,action,label,note,source:SOURCES[kind],normalization:p.normalization,...extra});
  m.atoms.forEach((a,i)=>{
   const links=ns(m,i);
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
   if(path.action==='ether'){
    const [oxygen,carbon]=path.localCuts[0];setH(oxygen,1);setH(carbon,g.atoms[carbon].totalH-1);planarize(carbon);addO(carbon,2,0);
   }else if(path.action==='hydrolysis'){
    const [leaving,carbonyl]=path.localCuts[0];setH(leaving,1);addO(carbonyl,1,1);
   }else if(path.action==='disulfide'){
    path.localCuts[0].forEach(i=>setH(i,1));
   }else if(path.action==='acetal'){
    path.localCuts.forEach(([,oxygen])=>setH(oxygen,1));planarize(path.oxidizedCarbon);addO(path.oxidizedCarbon,2,0);
   }
   const edited=buildMolecule(g),smiles=serialize(edited),parsed=parse(smiles);
   if(!root.ProdrugCandidates.validGraph(edited)||!Pharmacology.exactGraph(edited,parsed))throw Error('Product graph validation failed.');
   result.products=smiles.split('.').map((s,i)=>({name:'Hypothetical product '+(i+1),smiles:s,evidenceLevel:result.evidenceLevel}));
   result.status='predicted-products';result.pathway={id:path.id,kind:path.kind,label:path.label,atoms:path.atoms,cutBonds:path.cutBonds};result.inputSmiles=input.smiles;result.selectedAtom=selectedAtom;result.source=path.source;result.normalization=path.normalization;result.hypothesis=path.note;
   result.limitations=['These products differ from the input. This preview does not regenerate or validate a prodrug of the original molecule.','No rate, enzyme specificity, human conversion, activity, ADME benefit or safety is predicted.','Sources describe reaction classes in other compounds; they do not establish this pathway for the selected molecule.','All fragments, including potentially reactive carbonyls and intermediates, are shown without ranking any as the active product.','New oxygen is a formal oxidation/hydrolysis input. Product isotope tracing is not an experimental assignment.'];
   if(path.normalization)result.limitations.push(path.normalization.scope);
  }catch(e){result.products=[];result.reasons.push('Transformation unavailable: '+e.message);}
  return result;
 }
 root.CleavableGroups={pathways,sites,preview,sources:SOURCES};if(typeof module!=='undefined'&&module.exports)module.exports=root.CleavableGroups;
})(globalThis);
