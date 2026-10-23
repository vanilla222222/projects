// Three bounded biaryl cross-couplings. Distinct metal-transfer reagents and
// catalyst regimes are recognized structurally, rather than by formula alone.
const RX13_SOURCES = {
 negishi:{title:'Negishi, King and Okukado, selective biaryl synthesis from arylzincs and aryl halides (1977)',url:'https://doi.org/10.1021/jo00430a041',kind:'primary'},
 kumada:{title:'Tamao, Sumitani and Kumada, nickel-phosphine cross-coupling of Grignard reagents (1972)',url:'https://doi.org/10.1021/ja00767a075',kind:'primary'},
 stille:{title:'Organic Syntheses 77,135: Pd/C-CuI Stille coupling (2000)',url:'https://doi.org/10.15227/orgsyn.077.0135',kind:'primary'},
 kumadaHetero:{title:'Tamao et al., nickel-phosphine Grignard coupling of heterocyclic compounds (1982)',url:'https://doi.org/10.1016/0040-4020(82)80117-8',kind:'primary'},
 tin:{title:'Organic Syntheses 67,86: organotin coupling and transfer order (1989)',url:'https://doi.org/10.15227/orgsyn.067.0086',kind:'primary'},
};
REACTION_ADDITIVES.push({id:'nicl2dppp',name:'NiCl₂(dppp)',group:'Catalyst',label:'NiCl2(dppp)',smiles:''});
RX_ADDITIVE_TAGS.nicl2dppp=['nickelPhosphineCoupling'];
REACTION_SOLVENTS.push({id:'nmp',name:'N-Methyl-2-pyrrolidone (NMP)',smiles:'CN1CCCC1=O',bp:202,dielectric:32,protic:false});
REACTION_ADDITIVES.push({id:'asph3',name:'Triphenylarsine (AsPh₃)',group:'Ligand',label:'AsPh3',smiles:''});
RX_ADDITIVE_TAGS.asph3=['stilleArsineLigand'];
// A single neutral phenyl, pyridyl or thienyl ring; other heterocycle classes
// remain outside the chosen catalyst/substrate evidence rather than inferred.
function rx13Ring(g, ids) {
 const keep=new Set(ids||g.atoms.map(a=>a.id)),data=rxAromaticRings(g);
 const rings=data.rings.filter(r=>r.every(id=>keep.has(id)));
 if(rings.length!==1)return null;
 const ring=rings[0],members=new Set(ring),atoms=ring.map(id=>g.getAtom(id));
 if([...data.atoms].filter(id=>keep.has(id)).length!==ring.length)return null;
 let type=null;
 if(ring.length===6&&atoms.every(a=>a.element==='C'))type='phenyl';
 else if(ring.length===6&&atoms.filter(a=>a.element==='N').length===1&&atoms.every(a=>['C','N'].includes(a.element)))type='pyridyl';
 else if(ring.length===5&&atoms.filter(a=>a.element==='S').length===1&&atoms.every(a=>['C','S'].includes(a.element)))type='thienyl';
 if(!type||atoms.some(a=>a.charge||(['N','S'].includes(a.element)&&(rxHydrogens(g,a.id)>0||rxNeighbors(g,a.id).length!==2))))return null;
 return {type,members,hetero:atoms.find(a=>a.element!=='C')};
}
function rx13TinLigand(g,id,metal) {
 const chain=[];let previous=metal,current=id;
 while(current!==undefined&&chain.length<5){
  const atom=g.getAtom(current);if(!atom||atom.element!=='C'||atom.charge)return null;
  chain.push(current);const ns=rxNeighbors(g,current).filter(n=>n.atom.id!==previous);
  if(ns.some(n=>n.bond.order!==1||n.atom.element!=='C'))return null;
  if(!ns.length)break;if(ns.length!==1)return null;previous=current;current=ns[0].atom.id;
 }
 if(chain.length===1&&rxHydrogens(g,chain[0])===3)return 'Me';
 if(chain.length===4&&chain.every((id,i)=>rxHydrogens(g,id)===(i===3?3:2)))return 'nBu';
 return null;
}
function rx13Organometallic(g,ids,metal) {
 const atoms=ids.map(id=>g.getAtom(id)),ring=rx13Ring(g,ids);
 if(!ring||atoms.some(a=>a.charge||(!['C','H','D','Br','Cl','I',metal].includes(a.element)&&!ring.members.has(a.id))))return null;
 if(metal==='Zn'&&ring.type!=='phenyl'||metal==='Sn'&&ring.type==='pyridyl')return null;
 const metals=atoms.filter(a=>a.element===metal);if(metals.length!==1)return null;
 const m=metals[0],ns=rxNeighbors(g,m.id),info=rxAnalyze(g);
 if(info.alkenes.length||info.alkynes.length)return null;
 const aryl=ns.filter(n=>n.atom.element==='C'&&ring.members.has(n.atom.id)&&n.bond.order===1);
 if(aryl.length!==1)return null;
 if(ring.type!=='phenyl'&&!g.getBond(aryl[0].atom.id,ring.hetero.id))return null;
 let tinLigand=null;
 if(metal==='Sn'){
  const alkyls=ns.filter(n=>n.atom.id!==aryl[0].atom.id&&n.atom.element==='C'&&n.bond.order===1).map(n=>rx13TinLigand(g,n.atom.id,m.id));
  if(ns.length!==4||alkyls.length!==3||!alkyls.every(x=>x&&x===alkyls[0])||atoms.some(a=>['Cl','Br','I'].includes(a.element)))return null;
  tinLigand=alkyls[0];
 }else{
  const halides=ns.filter(n=>['Cl','Br','I'].includes(n.atom.element)&&n.bond.order===1&&rxNeighbors(g,n.atom.id).length===1);
  if(ns.length!==2||halides.length!==1||atoms.filter(a=>['Cl','Br','I'].includes(a.element)).length!==1)return null;
 }
 return {metal:m.id,carbon:aryl[0].atom.id,ringType:ring.type,tinLigand};
}
RX_SPECIES_DETECTORS.push((g,ids)=>{
 for(const [metal,tag]of [['Zn','arylZincHalide'],['Sn','arylTrialkylTin']]){
  const hit=rx13Organometallic(g,ids,metal);if(hit)return {...hit,tag};
 }
 return null;
});
function rx13Rule(ctx,kind) {
 if(ctx.protic||ctx.has('H2O')||ctx.has('strongAcid')||!['n2','ar'].includes(ctx.conditions.atmosphere)||ctx.substrates.length!==1)return [];
 const mode=kind==='negishi'?'Zn':kind==='kumada'?'Mg':'Sn';
 const donor=ctx.get(kind==='negishi'?'arylZincHalide':kind==='kumada'?'grignard':'arylTrialkylTin');
 if(!donor||!donor.graph)return [];
 const d=rx13Organometallic(donor.graph,donor.ids,mode);if(!d)return [];
 const s=ctx.substrates[0],g=s.graph,halides=s.info.arylHalides,ring=rx13Ring(g);
 if(!ring||halides.length!==1||!['Br','I'].includes(g.getAtom(halides[0].x).element)||
    g.atoms.some(a=>a.charge||(!['C','H','D','Br','I'].includes(a.element)&&!ring.members.has(a.id)))||
    g.atoms.filter(a=>['Br','I'].includes(a.element)).length!==1||s.info.alkenes.length||s.info.alkynes.length)return [];
 // The Ni(dppp) primary study supports pyridyl/thienyl electrophiles. The
 // current Pd regimes retain carbocyclic electrophiles; Stille also accepts
 // the source-supported 2-thienyl tin partner.
 if(kind!=='kumada'&&ring.type!=='phenyl')return [];
 if(kind==='kumada'){
   if(!ctx.has('nickelPhosphineCoupling')||!ctx.conditions.solvents.includes('thf')||ctx.temperature<0||ctx.temperature>70)return [];
 }else if(kind==='negishi'){
   if(!ctx.has('palladium0')||!ctx.conditions.solvents.includes('thf')||ctx.temperature<0||ctx.temperature>80)return [];
 }else{
   if(!ctx.conditions.additives.includes('pdc')||!ctx.has('copper')||!ctx.has('stilleArsineLigand')||!ctx.conditions.solvents.includes('nmp')||ctx.temperature<60||ctx.temperature>120)return [];
 }
 const p=rxCloneGraph(g),map=rxMerge(p,donor.graph,donor.ids),carbon=map.get(d.carbon);
 rxRemoveBranch(p,map.get(d.metal),carbon);p.removeAtom(halides[0].x);p.addBond(halides[0].c,carbon,1);
 const name={negishi:'Negishi biaryl coupling',kumada:'Kumada biaryl coupling',stille:'Stille biaryl coupling'}[kind];
 return [rxOutcome(kind,name,'Cross-coupling',p,'The encoded catalyst couples the aromatic halide with the aromatic group transferred from '+mode+', forming the biaryl C–C bond.',
 {score:15,consumes:[rxUse(s,1),rxUse(donor,1)],byproducts:[mode==='Sn'?(d.tinLigand==='nBu'?'tributyltin halide':'trimethyltin halide'):mode+' halide salts'],warnings:[
  'One single-ring aromatic bromide/iodide and one structurally checked transfer reagent are modeled. Ligand choice, catalyst loading, homocoupling and conversion are not predicted.',
  kind==='stille'?'The modeled Pd/C-CuI-AsPh3 regime assumes aromatic transfer over three identical methyl or n-butyl tin ligands; competing alkyl transfer and organotin residues are not quantified.':'Dry, inert conditions are required. Only the stated phenyl/pyridyl/thienyl subset is encoded; nitrogen coordination, sulfur effects and substrate-specific catalyst activity are not predicted. Carbonyls, O-H/N-H and competing electrophiles remain excluded.',
 ]})];
}
[
 ['negishi','Negishi arylzinc cross-coupling','One carbocyclic aryl Br/I + one neutral Ar–Zn–Cl/Br/I; Pd(0) in dry THF at 0–80 °C under N2/Ar.',[RX13_SOURCES.negishi]],
 ['kumada','Kumada aryl Grignard cross-coupling','One phenyl, pyridyl or thienyl Br/I + phenyl, 2-pyridyl or 2-thienyl MgCl/Br/I; dedicated NiCl2(dppp), dry THF, 0–70 °C, N2/Ar.',[RX13_SOURCES.kumada,RX13_SOURCES.kumadaHetero]],
 ['stille','Stille arylstannane cross-coupling','One carbocyclic aryl Br/I + phenyl or 2-thienyl SnMe3/Sn(n-Bu)3; Pd/C, CuI and AsPh3 in dry NMP at 60–120 °C under N2/Ar.',[RX13_SOURCES.stille,RX13_SOURCES.tin]],
].forEach(([id,name,scope,references])=>RX_RULES.push({id,name,run:ctx=>rx13Rule(ctx,id),catalog:{family:'Cross-coupling',scope,
 assumptions:['Net aryl–aryl transfer is encoded; catalyst activation and work-up are not explicitly simulated.'],
 limitations:['Only one phenyl, pyridyl or thienyl ring per partner with hydrocarbon substituents, and only the class-specific combinations stated above. No furyl, N-H heterocycles, fused/multiple rings, alkyl/vinyl transfer, multiple halides, carbonyls or exocyclic heteroatom functions. Heteroaryl Negishi remains outside this Pd regime. Primary sources establish reaction classes, not success of every encoded pair; the Stille source uses a 2-thienyl tributylstannane.'],references}}));
