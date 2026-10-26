// Aromatic-ring disconnections are independently filtered by the class-specific
// forward rule, including the supported heteroaryl partner combinations.
for(const kind of ['negishi','kumada','stille'])RETRO_TRANSFORMS.push({id:kind,name:kind[0].toUpperCase()+kind.slice(1)+' biaryl disconnection',rule:kind,group:'Cross-coupling',match(t){
 const bonds=t.graph.bonds.filter(b=>b.order===1&&t.aromatic.has(b.atomA)&&t.aromatic.has(b.atomB));
 return bonds.slice(0,RETRO_LIMITS.maxPerTransform).flatMap(b=>[[b.atomA,b.atomB],[b.atomB,b.atomA]].map(([a,c])=>{
  const thienylDonor=kind==='stille'&&rxNeighbors(t.graph,c).some(n=>n.atom.element==='S'&&t.aromatic.has(n.atom.id));
  const pieces=retroEdit(t,g=>{
   if(!retroCut(g,a,c))return false;rxAttach(g,'Br',a);
   const metal=rxAttach(g,kind==='negishi'?'Zn':kind==='kumada'?'Mg':'Sn',c);
   if(kind==='stille'){for(let i=0;i<3;i++){let last=metal.id;for(let j=0;j<(thienylDonor?4:1);j++)last=rxAttach(g,'C',last).id;}}else rxAttach(g,'Br',metal.id);
  });
  if(!pieces||pieces.length!==2)return null;
  const conditions=kind==='stille'?{solvents:['nmp'],additives:['pdc','cui','asph3'],temperature:100,atmosphere:'n2'}:
   {solvents:['thf'],additives:[kind==='negishi'?'pdpph3':'nicl2dppp'],temperature:25,atmosphere:'n2'};
  return retroSpec(retroReactants(pieces),[],conditions);
 }).filter(Boolean));
}});

// Additional carbon-carbon and heterocycle disconnections. These graph edits
// only propose inputs; the corresponding forward rule must reproduce the exact
// target before a route candidate is exposed.
function retro8One(t,edit,conditions,reagents){
 const piece=retroSinglePiece(t,edit);
 return piece&&retroSpec([{smiles:piece.smiles,role:'reactant'}].concat(reagents||[]),[],conditions||{});
}
RETRO_TRANSFORMS.push(
 {id:'tishchenko',name:'Aromatic ester from Tishchenko disproportionation',rule:'tishchenko',group:'Ester formation',match(t){
  return t.info.carbonyls.filter(c=>c.kind==='ester').slice(0,RETRO_LIMITS.maxPerTransform).map(c=>retro8One(t,g=>{
   rxRemoveBranch(g,c.hetero,c.c);
  },{solvents:['none'],additives:['na-obn'],temperature:25})).filter(Boolean);
 }},
 {id:'perkin-condensation',name:'Unsaturated acid from Perkin condensation',rule:'perkin-condensation',group:'Carbon–carbon formation',match(t){
  return t.info.carbonyls.filter(c=>c.kind==='acid').slice(0,RETRO_LIMITS.maxPerTransform).flatMap(c=>rxCarbonNeighbors(t.graph,c.c).flatMap(a=>
   rxCarbonNeighbors(t.graph,a.atom.id).filter(b=>b.atom.id!==c.c&&b.bond.order===2).map(b=>retro8One(t,g=>{
    rxRemoveBranch(g,a.atom.id,b.atom.id);rxAttach(g,'O',b.atom.id,2);rxsDrop(g,b.atom.id);
   },{solvents:['none'],additives:['naoac'],temperature:160},[{smiles:'CC(=O)OC(C)=O',role:'reactant',label:'Acetic anhydride'}]))).filter(Boolean));
 }},
 {id:'benzilic-rearrangement',name:'Alpha-hydroxy acid from benzilic rearrangement',rule:'benzilic-rearrangement',group:'Rearrangement',match(t){
  return t.info.carbonyls.filter(c=>c.kind==='acid').slice(0,RETRO_LIMITS.maxPerTransform).flatMap(c=>t.info.alcohols.filter(a=>t.graph.getBond(c.c,a.c)&&rxCarbonNeighbors(t.graph,a.c).filter(n=>n.atom.id!==c.c).length===2).map(a=>retro8One(t,g=>{
   const migrating=rxCarbonNeighbors(g,a.c).find(n=>n.atom.id!==c.c&&t.aromatic.has(n.atom.id));if(!migrating)return false;rxSetOrder(g,a.c,migrating.atom.id,0);g.addBond(c.c,migrating.atom.id);g.removeAtom(c.hetero);g.removeAtom(a.o);rxAttach(g,'O',a.c,2);
  },{solvents:['water'],additives:['naoh'],temperature:80}))).filter(Boolean);
 }},
 {id:'mcmurry',name:'Alkene from McMurry carbonyl self-coupling',rule:'mcmurry',group:'Coupling',match(t){
  return t.info.alkenes.slice(0,RETRO_LIMITS.maxPerTransform).flatMap(e=>[e.a,e.b].map(keep=>retro8One(t,g=>{
   const remove=keep===e.a?e.b:e.a;rxRemoveBranch(g,remove,keep);rxAttach(g,'O',keep,2);rxsDrop(g,keep);
  },{solvents:['thf'],additives:['mcmurry'],temperature:60,atmosphere:'n2'}))).filter(Boolean);
 }},
 {id:'acyloin-cyclization',name:'Cyclic acyloin from intramolecular diester condensation',rule:'acyloin-cyclization',group:'Cyclization',match(t){
  return t.info.carbonyls.filter(c=>c.kind==='ketone').slice(0,RETRO_LIMITS.maxPerTransform).flatMap(c=>t.info.alcohols.filter(a=>t.graph.getBond(c.c,a.c)).map(a=>retro8One(t,g=>{
   if(!retroBreak(g,c.c,a.c))return false;rxSetOrder(g,a.c,a.o,2);
   [c.c,a.c].forEach(id=>{const o=rxAttach(g,'O',id);rxAttach(g,'C',o.id);});
  },{solvents:['ether'],additives:['acyloin'],temperature:25,atmosphere:'n2'}))).filter(Boolean);
 }},
 {id:'paal-knorr-thiophene',name:'Thiophene from Paal–Knorr dicarbonyl cyclization',rule:'paal-knorr-thiophene',group:'Heterocycle formation',match(t){
  return rxAromaticRings(t.graph).rings.filter(ring=>ring.length===5&&ring.filter(id=>t.graph.getAtom(id).element==='S').length===1&&ring.every(id=>['C','S'].includes(t.graph.getAtom(id).element))).slice(0,RETRO_LIMITS.maxPerTransform).map(ring=>{
   const s=ring.find(id=>t.graph.getAtom(id).element==='S'),ends=rxNeighbors(t.graph,s).filter(n=>ring.includes(n.atom.id));
   if(ends.length!==2)return null;
   return retro8One(t,g=>{
    if(!retroBreak(g,s,ends[0].atom.id)||!retroBreak(g,s,ends[1].atom.id))return false;
    g.removeAtom(s);ring.filter(id=>id!==s).forEach(id=>rxNeighbors(g,id).filter(n=>ring.includes(n.atom.id)).forEach(n=>rxSetOrder(g,id,n.atom.id,1)));
    ends.forEach(n=>rxAttach(g,'O',n.atom.id,2));
   },{solvents:['toluene'],additives:['p2s5'],temperature:110});
  }).filter(Boolean);
 }},
 {id:'hantzsch-thiazole',name:'Thiazole from Hantzsch thioamide and alpha-haloketone',rule:'hantzsch-thiazole',group:'Heterocycle formation',match(t){
  return rxAromaticRings(t.graph).rings.filter(ring=>ring.length===5&&['N','S'].every(x=>ring.filter(id=>t.graph.getAtom(id).element===x).length===1)&&ring.every(id=>['C','N','S'].includes(t.graph.getAtom(id).element))).slice(0,RETRO_LIMITS.maxPerTransform).map(ring=>{
   const s=ring.find(id=>t.graph.getAtom(id).element==='S'),n=ring.find(id=>t.graph.getAtom(id).element==='N');
   const central=ring.find(id=>t.graph.getAtom(id).element==='C'&&t.graph.getBond(id,s)&&t.graph.getBond(id,n));
   if(central===undefined)return null;
   const alpha=rxNeighbors(t.graph,s).find(x=>ring.includes(x.atom.id)&&x.atom.id!==central),carbonyl=rxNeighbors(t.graph,n).find(x=>ring.includes(x.atom.id)&&x.atom.id!==central);
   if(!alpha||!carbonyl)return null;
   const pieces=retroEdit(t,g=>{
    if(!retroBreak(g,s,alpha.atom.id)||!retroBreak(g,n,carbonyl.atom.id))return false;
    rxSetOrder(g,central,n,1);rxSetOrder(g,central,s,2);rxSetOrder(g,alpha.atom.id,carbonyl.atom.id,1);
    rxAttach(g,'O',carbonyl.atom.id,2);rxAttach(g,'Cl',alpha.atom.id);
   });
   return pieces&&pieces.length===2?retroSpec(retroReactants(pieces),[],{solvents:['ethanol'],temperature:60}):null;
  }).filter(Boolean);
 }}
);

// Anhydride disconnections. Alcoholysis and aminolysis duplicate the acyl half
// of the target to recover the symmetric anhydride required by the forward
// rules; the released alcohol or amine remains a separate precursor.
function retro8AnhydrideAcyl(t,c,nucleophile,conditions){
 if(t.graph.atoms.length*2>RETRO_LIMITS.maxHeavy)return null;
 const pieces=retroEdit(t,g=>{
  if(!retroCut(g,c.c,nucleophile))return false;
  const copy=rxMerge(g,t.graph,retroIds(t.graph));
  rxRemoveBranch(g,copy.get(nucleophile),copy.get(c.c));
  const bridge=rxAttach(g,'O',c.c);
  g.addBond(copy.get(c.c),bridge.id);
 });
 return pieces&&pieces.length===2?retroSpec(retroReactants(pieces),[],conditions):null;
}
RETRO_TRANSFORMS.push(
 {id:'anhydride-hydrolysis',name:'Diacid from cyclic anhydride hydrolysis',rule:'anhydride-hydrolysis',group:'Hydrolysis',match(t){
  if(t.components!==1||t.graph.atoms.filter(a=>a.element==='O').length!==4)return [];
  const acids=t.info.carbonyls.filter(c=>c.kind==='acid');if(acids.length!==2)return [];
  return acids.slice(0,RETRO_LIMITS.maxPerTransform).flatMap(left=>acids.filter(right=>right.c!==left.c).map(right=>retro8One(t,g=>{
   g.removeAtom(right.hetero);g.addBond(left.hetero,right.c);
  },{solvents:['water'],temperature:25}))).filter(Boolean);
 }},
 {id:'anhydride-alcoholysis',name:'Ester from symmetric anhydride alcoholysis',rule:'anhydride-alcoholysis',group:'Ester formation',match(t){
  return t.info.carbonyls.filter(c=>c.kind==='ester').slice(0,RETRO_LIMITS.maxPerTransform).map(c=>retro8AnhydrideAcyl(t,c,c.hetero,{solvents:['none'],additives:['et3n'],temperature:25})).filter(Boolean);
 }},
 {id:'anhydride-aminolysis',name:'Amide from symmetric anhydride aminolysis',rule:'anhydride-aminolysis',group:'Amide formation',match(t){
  return t.info.carbonyls.filter(c=>c.kind==='amide').slice(0,RETRO_LIMITS.maxPerTransform).map(c=>retro8AnhydrideAcyl(t,c,c.hetero,{solvents:['none'],temperature:25})).filter(Boolean);
 }},
 {id:'anhydride-reduction',name:'Diol from cyclic anhydride reduction',rule:'anhydride-reduction',group:'Reduction',match(t){
  if(t.components!==1||t.graph.atoms.filter(a=>a.element==='O').length!==2)return [];
  const alcohols=t.info.alcohols.filter(a=>a.degree<=2&&rxHydrogens(t.graph,a.c)>=2);if(alcohols.length!==2)return [];
  return [alcohols].slice(0,RETRO_LIMITS.maxPerTransform).map(([left,right])=>{
   const piece=retroSinglePiece(t,g=>{
    rxSetOrder(g,left.c,left.o,2);rxSetOrder(g,right.c,right.o,2);
    const bridge=rxAttach(g,'O',left.c);g.addBond(right.c,bridge.id);
   });
   return piece&&retroSpec([{smiles:piece.smiles,role:'reactant'}],[{smiles:'[Li+].[AlH4-]',role:'reagent',label:'LiAlH4'}],{solvents:['thf'],temperature:0,atmosphere:'n2'});
  }).filter(Boolean);
 }}
);

// Keep the original dialkyl ether disconnections, but also allow the aryl
// phenol side supported by the forward Williamson rule. The previous filter
// required both oxygen neighbours to be non-aromatic sp3 carbons, making every
// anisole/phenolic-ether reverse candidate impossible.
const retro8WilliamsonTransform=RETRO_TRANSFORMS.find(x=>x.id==='williamson');
if(retro8WilliamsonTransform)retro8WilliamsonTransform.match=function(t){
 const out=[],seen=new Set();
 t.graph.atoms.filter(o=>o.element==='O'&&!o.charge).forEach(o=>{
  const ns=rxNeighbors(t.graph,o.id);
  if(ns.length!==2||!ns.every(x=>x.atom.element==='C'&&x.bond.order===1))return;
  const aryl=ns.filter(x=>t.aromatic.has(x.atom.id));if(aryl.length>1)return;
  ns.filter(x=>!t.aromatic.has(x.atom.id)&&rxIsSp3(t.graph,x.atom.id)&&rxCarbonNeighbors(t.graph,x.atom.id).length<=1).forEach(x=>{
   const pieces=retroEdit(t,g=>{if(!retroCut(g,o.id,x.atom.id))return false;rxAttach(g,'Br',x.atom.id);});
   if(!pieces||pieces.length!==2)return;const key=pieces.map(p=>p.smiles).sort().join('.');if(seen.has(key))return;seen.add(key);
   out.push(retroSpec(retroReactants(pieces),[],{additives:['nah'],solvents:['thf']}));
  });
 });
 return out.slice(0,RETRO_LIMITS.maxPerTransform);
};

// Product verification accepts the two equivalent nitro depictions used by the
// nitration and nitro-reduction rules. Exact identity remains the fast path and
// strict stock/stereochemical matching is deliberately unchanged.
function retroProductIdentity(input) {
 const g=moleculeIdentityGraph(input);
 g.atoms.filter(a=>a.element==='N').forEach(n=>{
  const neighbors=rxNeighbors(g,n.id),os=neighbors.filter(x=>x.atom.element==='O'&&rxNeighbors(g,x.atom.id).length===1);
  if(neighbors.length!==3||os.length!==2||!neighbors.some(x=>x.atom.element==='C'))return;
  n.charge=0;os.forEach(x=>{x.atom.charge=0;g.getBond(n.id,x.atom.id).order=2;});
 });
 return moleculeIdentity(g).connectivityKey;
}
const retro8FindProductExact=retroFindProduct;
retroFindProduct=function(list,smiles){
 const direct=retro8FindProductExact(list,smiles);if(direct)return direct;
 if(typeof moleculeIdentity!=='function')return null;
 try{
  const target=retroProductIdentity(smiles);
  return (list||[]).find(p=>{
   try{return !!p&&retroProductIdentity(p.fragment||p.isomericSmiles||p.smiles)===target;}catch(error){return false;}
  })||null;
 }catch(error){return null;}
};
