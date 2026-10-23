// Three bounded biaryl cross-couplings. Distinct metal-transfer reagents and
// catalyst regimes are recognized structurally, rather than by formula alone.
const RX13_SOURCES = {
 negishi:{title:'Negishi, King and Okukado, selective biaryl synthesis from arylzincs and aryl halides (1977)',url:'https://doi.org/10.1021/jo00430a041',kind:'primary'},
 kumada:{title:'Tamao, Sumitani and Kumada, nickel-phosphine cross-coupling of Grignard reagents (1972)',url:'https://doi.org/10.1021/ja00767a075',kind:'primary'},
 stille:{title:'Organic Syntheses 77,135: Pd/C-CuI Stille coupling (2000)',url:'https://doi.org/10.15227/orgsyn.077.0135',kind:'primary'},
 tin:{title:'Organic Syntheses 67,86: organotin coupling and transfer order (1989)',url:'https://doi.org/10.15227/orgsyn.067.0086',kind:'primary'},
};
REACTION_ADDITIVES.push({id:'nicl2dppp',name:'NiCl₂(dppp)',group:'Catalyst',label:'NiCl2(dppp)',smiles:''});
RX_ADDITIVE_TAGS.nicl2dppp=['nickelPhosphineCoupling'];
REACTION_SOLVENTS.push({id:'nmp',name:'N-Methyl-2-pyrrolidone (NMP)',smiles:'CN1CCCC1=O',bp:202,dielectric:32,protic:false});
REACTION_ADDITIVES.push({id:'asph3',name:'Triphenylarsine (AsPh₃)',group:'Ligand',label:'AsPh3',smiles:''});
RX_ADDITIVE_TAGS.asph3=['stilleArsineLigand'];
function rx13Organometallic(g,ids,metal) {
 const atoms=ids.map(id=>g.getAtom(id));
 if(atoms.some(a=>a.charge||!['C','H','D','Br','Cl','I',metal].includes(a.element)))return null;
 const metals=atoms.filter(a=>a.element===metal);if(metals.length!==1)return null;
 const m=metals[0],ns=rxNeighbors(g,m.id),aro=rxAromaticRings(g).atoms;
 if(aro.size!==6||rxAnalyze(g).alkenes.length||rxAnalyze(g).alkynes.length)return null;
 const aryl=ns.filter(n=>n.atom.element==='C'&&aro.has(n.atom.id)&&n.bond.order===1);
 if(aryl.length!==1)return null;
 if(metal==='Sn'){
   const methyls=ns.filter(n=>n.atom.element==='C'&&n.bond.order===1&&rxHydrogens(g,n.atom.id)===3&&rxNeighbors(g,n.atom.id).length===1);
   if(ns.length!==4||methyls.length!==3||atoms.some(a=>['Cl','Br','I'].includes(a.element)))return null;
 }else{
   const halides=ns.filter(n=>['Cl','Br','I'].includes(n.atom.element)&&n.bond.order===1&&rxNeighbors(g,n.atom.id).length===1);
   if(ns.length!==2||halides.length!==1||atoms.filter(a=>['Cl','Br','I'].includes(a.element)).length!==1)return null;
 }
 return {metal:m.id,carbon:aryl[0].atom.id};
}
RX_SPECIES_DETECTORS.push((g,ids)=>{
 for(const [metal,tag]of [['Zn','arylZincHalide'],['Sn','arylTrimethylTin']]){
  const hit=rx13Organometallic(g,ids,metal);if(hit)return {...hit,tag};
 }
 return null;
});
function rx13Rule(ctx,kind) {
 if(ctx.protic||ctx.has('H2O')||ctx.has('strongAcid')||!['n2','ar'].includes(ctx.conditions.atmosphere)||ctx.substrates.length!==1)return [];
 const mode=kind==='negishi'?'Zn':kind==='kumada'?'Mg':'Sn';
 const donor=ctx.get(kind==='negishi'?'arylZincHalide':kind==='kumada'?'grignard':'arylTrimethylTin');
 if(!donor||!donor.graph)return [];
 const d=rx13Organometallic(donor.graph,donor.ids,mode);if(!d)return [];
 const s=ctx.substrates[0],g=s.graph,halides=s.info.arylHalides;
 if(halides.length!==1||!['Br','I'].includes(g.getAtom(halides[0].x).element)||s.info.aromatic.atoms.size!==6||
    g.atoms.some(a=>a.charge||!['C','H','D','Br','I'].includes(a.element))||g.atoms.filter(a=>['Br','I'].includes(a.element)).length!==1||s.info.alkenes.length||s.info.alkynes.length)return [];
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
 return [rxOutcome(kind,name,'Cross-coupling',p,'The encoded catalyst couples the aryl halide with the aryl group transferred from '+mode+', forming the biaryl C–C bond.',
 {score:15,consumes:[rxUse(s,1),rxUse(donor,1)],byproducts:[mode==='Sn'?'trimethyltin halide':mode+' halide salts'],warnings:[
  'Only one aryl bromide/iodide and one simple carbocyclic aryl-transfer reagent are modeled. Ligand choice, catalyst loading, homocoupling and conversion are not predicted.',
  kind==='stille'?'The modeled Pd/C-CuI-AsPh3 regime assumes aryl transfer over the three tin-bound methyl groups. Organotin residues and separation are not simulated.':'Dry, inert conditions are required; carbonyls, protic groups, heteroarenes and competing electrophiles are excluded rather than assigned universal compatibility.',
 ]})];
}
[
 ['negishi','Negishi arylzinc cross-coupling','One carbocyclic aryl Br/I + one neutral Ar–Zn–Cl/Br/I; Pd(0) in dry THF at 0–80 °C under N2/Ar.',[RX13_SOURCES.negishi]],
 ['kumada','Kumada aryl Grignard cross-coupling','One carbocyclic aryl Br/I + one neutral Ar–Mg–Cl/Br/I; dedicated NiCl2(dppp) in dry THF at 0–70 °C under N2/Ar.',[RX13_SOURCES.kumada]],
 ['stille','Stille arylstannane cross-coupling','One carbocyclic aryl Br/I + Ar–SnMe3; Pd/C, CuI and AsPh3 in dry NMP at 60–120 °C under N2/Ar.',[RX13_SOURCES.stille,RX13_SOURCES.tin]],
].forEach(([id,name,scope,references])=>RX_RULES.push({id,name,run:ctx=>rx13Rule(ctx,id),catalog:{family:'Cross-coupling',scope,
 assumptions:['Net aryl–aryl transfer is encoded; catalyst activation and work-up are not explicitly simulated.'],
 limitations:['Only simple single-ring carbocyclic aryl partners with hydrocarbon substituents are encoded. No alkyl/vinyl transfer, multiple halides, heteroarenes, reactive heteroatom functions, ligand screening or experimental feasibility prediction. References support the reaction class and reagent/catalyst regimes, not every modeled substrate.'],references}}));
