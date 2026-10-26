// Nitrogen interconversions with explicit single-site scope. Class references
// support the chemistry, not experimental success for any generated substrate.
const RX9_SOURCES = {
  pyrOx: {title:'Mosher et al., Organic Syntheses 33,79 (1953): pyridine N-oxide',url:'https://doi.org/10.15227/orgsyn.033.0079',kind:'primary'},
  pyrRed: {title:'Hamana, Yakugaku Zasshi 75,121–123 (1955): pyridine N-oxide/PCl3',url:'https://doi.org/10.1248/yakushi1947.75.2_121',kind:'primary'},
  cope: {title:'UCLA Illustrated Glossary: Cope elimination',url:'https://www.chem.ucla.edu/~harding/IGOC/C/cope_elimination.html',kind:'teaching'},
  gabriel: {title:'McMurry, OpenStax Organic Chemistry 24.6: Gabriel amine synthesis',url:'https://openstax.org/books/organic-chemistry/pages/24-6-synthesis-of-amines',kind:'teaching'},
  gabrielHydrazine: {title:'Gibson review, The Gabriel Synthesis of Primary Amines, Angew. Chem. Int. Ed. 7,919 (1968)',url:'https://doi.org/10.1002/anie.196809191',kind:'teaching'},
  imine: {title:'McMurry, OpenStax Organic Chemistry 19.8: reversible imine/enamine chemistry',url:'https://openstax.org/books/organic-chemistry/pages/19-8-nucleophilic-addition-of-amines-imine-and-enamine-formation',kind:'teaching'},
};
RX_SPECIES_DETECTORS.push((g,ids)=>{
  if(ids.length!==5||ids.some(id=>g.getAtom(id).charge))return null;
  const atoms=ids.map(id=>g.getAtom(id)),c=atoms.find(a=>a.element==='C'&&rxNeighbors(g,a.id).some(n=>n.atom.element==='O'&&n.bond.order===2));
  if(!c||atoms.filter(a=>a.element==='C').length!==2||atoms.filter(a=>a.element==='O').length!==3)return null;
  const methyl=rxCarbonNeighbors(g,c.id),peroxy=rxNeighbors(g,c.id).find(n=>n.atom.element==='O'&&n.bond.order===1);
  if(methyl.length!==1||rxHydrogens(g,methyl[0].atom.id)!==3||!peroxy)return null;
  const tail=rxNeighbors(g,peroxy.atom.id).filter(n=>n.atom.id!==c.id);
  return tail.length===1&&tail[0].atom.element==='O'&&tail[0].bond.order===1&&rxNeighbors(g,tail[0].atom.id).length===1?{tag:'peraceticAcid',atom:c.id}:null;
});
function rx9Simple(g,allowed,charged=[]) {return g.atoms.every(a=>allowed.includes(a.element)&&(!a.charge||charged.includes(a.id)));}
function rx9Pyridine(g,oxide) {
  const ar=rxAromaticRings(g).atoms,ns=g.atoms.filter(a=>a.element==='N');
  if(ns.length!==1||ar.size!==6||!ar.has(ns[0].id))return null;
  const n=ns[0],neighbors=rxNeighbors(g,n.id),o=neighbors.find(x=>x.atom.element==='O');
  if(oxide){if(n.charge!==1||!o||o.atom.charge!==-1||o.bond.order!==1||rxNeighbors(g,o.atom.id).length!==1||g.atoms.filter(a=>a.element==='O').length!==1||!rx9Simple(g,['C','N','O','H','D','F','Cl','Br','I'],[n.id,o.atom.id]))return null;}
  else if(n.charge||neighbors.length!==2||!rx9Simple(g,['C','N','H','D','F','Cl','Br','I']))return null;
  if(g.bonds.some(b=>b.order>1&&!ar.has(b.atomA)))return null;
  return {n:n.id,o:o&&o.atom.id};
}
function rx9RulePyrOx(ctx) {
  if(!ctx.has('peraceticAcid')||ctx.temperature<60||ctx.temperature>90||!ctx.conditions.solvents.includes('acoh'))return [];
  return ctx.substrates.flatMap(s=>{const p=rx9Pyridine(s.graph,false);if(!p)return [];const g=rxCloneGraph(s.graph);g.getAtom(p.n).charge=1;rxAttach(g,'O',p.n,1,-1);return [rxOutcome('pyridine-n-oxidation','Peracetic acid pyridine N-oxidation','Oxidation',g,'Peracetic acid transfers oxygen to a pyridine-type nitrogen. The charge-separated free N-oxide shown assumes the separate isolation/work-up stage.',{score:15,consumes:[rxUse(s,1),rxUse(ctx.get('peraceticAcid'),1)],byproducts:['acetic acid'],warnings:['Only one six-membered pyridine ring with carbon/halocarbon substitution is encoded; other heterocycles, oxidizable substituents and multiple nitrogens are excluded.','The acidic medium may contain protonated species; no speciation, yield or reaction-time model is supplied.']})];});
}
function rx9RulePyrRed(ctx) {
  if(!ctx.has('phosphorusTrichloride')||ctx.has('mcpba')||ctx.has('peraceticAcid')||ctx.has('hydrogenPeroxide')||ctx.protic||ctx.has('H2O')||ctx.temperature<0||ctx.temperature>30||!ctx.conditions.solvents.some(x=>['chloroform','etoac'].includes(x)))return [];
  return ctx.substrates.flatMap(s=>{const p=rx9Pyridine(s.graph,true);if(!p)return [];const g=rxCloneGraph(s.graph);g.removeAtom(p.o);g.getAtom(p.n).charge=0;return [rxOutcome('pyridine-oxide-deoxygenation','PCl3 pyridine N-oxide deoxygenation','Reduction',g,'Oxygen transfer to phosphorus(III) restores the pyridine nitrogen without retaining the N-oxide oxygen.',{score:15,consumes:[rxUse(s,1),rxUse(ctx.get('phosphorusTrichloride'),1)],byproducts:['phosphorus oxychloride'],warnings:['The supported subset is one pyridine N-oxide in dry chloroform or ethyl acetate; other oxygen groups and polyaza/fused heterocycles are excluded.']})];});
}
function rx9RuleCope(ctx) {
  if(ctx.temperature<100||ctx.temperature>180||ctx.protic||ctx.has('strongAcid')||ctx.has('mcpba')||ctx.has('hydrogenPeroxide'))return [];
  return ctx.substrates.flatMap(s=>{const xs=rx7AmineOxides(s.graph);if(xs.length!==1)return [];const x=xs[0];if(!rx9Simple(s.graph,['C','N','O','H','D'],[x.n,x.o])||s.graph.atoms.filter(a=>a.element==='N').length!==1||s.graph.atoms.filter(a=>a.element==='O').length!==1||s.info.alkenes.length||s.info.alkynes.length||s.graph.bonds.length!==s.graph.atoms.length-1)return [];
    const arms=rxCarbonNeighbors(s.graph,x.n),methyl=arms.filter(a=>rxHydrogens(s.graph,a.atom.id)===3),long=arms.filter(a=>rxHydrogens(s.graph,a.atom.id)!==3);
    if(methyl.length!==2||long.length!==1)return [];const alpha=long[0].atom.id,betas=rxCarbonNeighbors(s.graph,alpha).filter(a=>a.atom.id!==x.n);
    if(rxHydrogens(s.graph,alpha)!==2||betas.length!==1||rxHydrogens(s.graph,betas[0].atom.id)<1)return [];
    // Require a terminal alkene endpoint, avoiding E/Z/syn conformer guessing.
    const beta=betas[0].atom.id;if(rxNeighbors(s.graph,beta).some(n=>['H','D'].includes(n.atom.element)))return [];
    const g=rxCloneGraph(s.graph);rxSetOrder(g,x.n,alpha,0);rxSetOrder(g,alpha,beta,2);g.getAtom(x.n).charge=0;g.getAtom(x.o).charge=0;rxsDrop(g,alpha);rxsDrop(g,beta);
    return [rxOutcome('cope-elimination','Cope elimination of dimethylalkylamine N-oxide','Elimination',g,'Thermal syn elimination removes the single supported alkyl arm as a terminal alkene and retains N-oxide oxygen in N,N-dimethylhydroxylamine.',{score:15,consumes:[rxUse(s,1)],warnings:['Only an acyclic N,N-dimethyl-N-primary-alkyl N-oxide with one eliminable arm is encoded. The accessible syn conformer is assumed; no rate or stereoselectivity is predicted.','Cyclic, internally substituted alpha-carbon, multiple-arm and isotope-explicit beta-H cases are excluded. Both alkene and hydroxylamine are retained as products.']})];});
}
function rx9Phthalimide(g) {
  const ns=g.atoms.filter(a=>a.element==='N'&&!a.charge),aromatic=rxAromaticRings(g),ar=aromatic.atoms;if(ns.length!==1||!ar.size||g.atoms.filter(a=>a.element==='O').length!==2)return null;
  const n=ns[0],cs=rxNeighbors(g,n.id).filter(a=>a.atom.element==='C'&&a.bond.order===1&&rxNeighbors(g,a.atom.id).some(q=>q.atom.element==='O'&&q.bond.order===2));
  if(cs.length!==2)return null;
  const ringEnds=cs.map(c=>rxCarbonNeighbors(g,c.atom.id).find(q=>ar.has(q.atom.id)));
  if(ringEnds.some(x=>!x)||!g.getBond(ringEnds[0].atom.id,ringEnds[1].atom.id))return null;
  // Aryl substituents on the N-alkyl arm add aromatic atoms elsewhere in the
  // molecule. Validate the phthalimide benzene ring, not a whole-molecule
  // aromatic-atom count, so N-benzyl and similar supported substrates survive.
  const phthalimideRing=aromatic.rings.some(ring=>ring.length===6&&ring.every(id=>g.getAtom(id).element==='C')&&ringEnds.every(q=>ring.includes(q.atom.id)));
  if(!phthalimideRing)return null;
  const other=rxNeighbors(g,n.id).filter(q=>!cs.some(c=>c.atom.id===q.atom.id));
  return {n:n.id,cs:cs.map(c=>c.atom.id),other};
}
function rx9RuleGabriel(ctx) {
  if(!ctx.has('hydroxide')||ctx.has('H2O')||ctx.has('strongAcid')||!ctx.conditions.solvents.includes('dmf'))return [];
  const ims=ctx.substrates.flatMap(s=>{const p=rx9Phthalimide(s.graph);return p&&rxHydrogens(s.graph,p.n)===1&&s.graph.atoms.length===11?[{s,p}]:[];});
  const hs=ctx.substrates.flatMap(s=>s.info.halides.map(h=>({s,h}))).filter(x=>rx9Simple(x.s.graph,['C','H','D','Cl','Br','I'])&&x.s.info.halides.length===1&&x.h.degree<=1&&rxHydrogens(x.s.graph,x.h.c)>=2&&!rxCarbonNeighbors(x.s.graph,x.h.c).some(n=>rxCarbonNeighbors(x.s.graph,n.atom.id).length>=4));
  if(ims.length!==1||hs.length!==1||ctx.substrates.length!==2)return [];const im=ims[0],h=hs[0];if(h.s.info.alkenes.length||h.s.info.alkynes.length)return [];
  const g=rxCloneGraph(im.s.graph),map=rxMerge(g,h.s.graph,h.s.graph.atoms.map(a=>a.id));g.removeAtom(map.get(h.h.x));g.addBond(im.p.n,map.get(h.h.c));
  return [rxOutcome('gabriel-alkylation','Gabriel phthalimide N-alkylation','Substitution',g,'Base generates phthalimide anion, followed by SN2 substitution at one methyl/primary alkyl halide. The isolable N-alkylphthalimide is a separate step from amine release.',{score:15,consumes:[rxUse(im.s,1),rxUse(h.s,1)],byproducts:['halide salt','water'],warnings:['The base-activation stage precedes alkylation in DMF; only methyl/primary non-neopentyl electrophiles are encoded. Aryl/vinyl, secondary and multifunctional halides are excluded.']})];
}
function rx9RuleGabrielRelease(ctx) {
  if(!ctx.has('hydrazine')||!ctx.conditions.solvents.includes('ethanol')||ctx.temperature<50||ctx.temperature>100||ctx.has('strongAcid')||ctx.has('hydroxide'))return [];
  return ctx.substrates.flatMap(s=>{const p=rx9Phthalimide(s.graph);if(!p||p.other.length!==1||p.other[0].atom.element!=='C'||!rxIsSp3(s.graph,p.other[0].atom.id)||!rx9Simple(s.graph,['C','N','O','H','D','F','Cl','Br','I']))return [];const g=rxCloneGraph(s.graph);p.cs.forEach(c=>rxSetOrder(g,p.n,c,0));
    const h=ctx.get('hydrazine'),map=rxMerge(g,h.graph,h.ids),n=h.ids.filter(id=>h.graph.getAtom(id).element==='N');if(n.length!==2)return [];g.addBond(p.cs[0],map.get(n[0]));g.addBond(p.cs[1],map.get(n[1]));
    return [rxOutcome('gabriel-hydrazinolysis','Gabriel phthalimide hydrazinolysis','Deprotection',g,'Hydrazine replaces the N-alkyl imide nitrogen at both acyl centers. The original nitrogen becomes the primary amine; the hydrazine nitrogens form phthalhydrazide.',{score:15,consumes:[rxUse(s,1),rxUse(h,1)],warnings:['Only one unsubstituted phthalimide ring carrying an sp3-carbon substituent is encoded; no extra N/O functionality is supported. Both free amine and phthalhydrazide are shown; protonation, precipitation and conversion are not calculated.']})];});
}
function rx9ImineSites(g,enamine) {
  if(!rx9Simple(g,['C','N','H','D','F','Cl','Br','I'])||g.atoms.filter(a=>a.element==='N').length!==1)return [];
  const n=g.atoms.find(a=>a.element==='N'),ns=rxNeighbors(g,n.id),ar=rxAromaticRings(g).atoms;
  if(enamine){if(ns.length!==3||ns.some(x=>x.atom.element!=='C'||x.bond.order!==1))return [];return ns.filter(c=>!ar.has(c.atom.id)).flatMap(c=>rxNeighbors(g,c.atom.id).filter(b=>b.atom.element==='C'&&b.bond.order===2&&!ar.has(b.atom.id)).map(b=>({n:n.id,c:c.atom.id,beta:b.atom.id})));}
  if(ns.length!==2||ns.some(x=>x.atom.element!=='C'))return [];const c=ns.filter(x=>x.bond.order===2);return c.length===1?[{n:n.id,c:c[0].atom.id}]:[];
}
function rx9Hydrolysis(ctx,enamine) {
  if(!ctx.has('strongAcid')||!ctx.has('H2O')||ctx.has('alanate')||ctx.has('borohydride')||ctx.has('mildHydride'))return [];
  return ctx.substrates.flatMap(s=>{const sites=rx9ImineSites(s.graph,enamine);if(sites.length!==1)return [];const x=sites[0],g=rxCloneGraph(s.graph);rxSetOrder(g,x.n,x.c,0);if(enamine){rxSetOrder(g,x.c,x.beta,1);rxsDrop(g,x.c);rxsDrop(g,x.beta);}if(g.connectedComponents().length!==2)return [];rxAttach(g,'O',x.c,2);
    return [rxOutcome(enamine?'enamine-hydrolysis':'imine-hydrolysis',enamine?'Aqueous acid enamine hydrolysis':'Aqueous acid imine hydrolysis','Hydrolysis',g,'Aqueous acid reverses condensation, regenerating the carbonyl compound and '+(enamine?'secondary':'primary')+' amine. The nitrogen-containing coproduct is retained.',{score:15,consumes:[rxUse(s,1)],warnings:['One acyclic C–N cleavage site on an otherwise carbon/halocarbon skeleton is encoded; cyclic imines/enamines and extra functionality are excluded.','Neutral amine connectivity is shown after work-up; in the acidic reaction mixture it is largely protonated. No equilibrium conversion is calculated.']})];});
}
function rx9AcylAzide(g) {
  if(!rx9Simple(g,['C','O','N','H','D','F','Cl','Br','I'],g.atoms.filter(a=>a.element==='N').map(a=>a.id))||g.atoms.filter(a=>a.element==='N').length!==3||g.atoms.filter(a=>a.element==='O').length!==1)return null;
  const cs=rxAnalyze(g).carbonyls;if(cs.length!==1)return null;const c=cs[0],n=rxNeighbors(g,c.c).find(q=>q.atom.element==='N'&&q.bond.order===1),r=rxCarbonNeighbors(g,c.c);if(!n||r.length!==1)return null;
  const mid=rxNeighbors(g,n.atom.id).find(q=>q.atom.element==='N'&&q.bond.order===2);if(!mid||mid.atom.charge!==1)return null;const end=rxNeighbors(g,mid.atom.id).find(q=>q.atom.id!==n.atom.id&&q.atom.element==='N'&&q.bond.order===2&&q.atom.charge===-1);return end&&rxNeighbors(g,end.atom.id).length===1?{c:c.c,o:c.o,n:n.atom.id,mid:mid.atom.id,end:end.atom.id,r:r[0].atom.id}:null;
}
function rx9RuleCurtius(ctx) {
  if(!ctx.has('H2O')||ctx.temperature<60||ctx.temperature>120||ctx.has('alanate')||ctx.has('borohydride')||ctx.has('hydrogenationCatalyst'))return [];
  return ctx.substrates.flatMap(s=>{const x=rx9AcylAzide(s.graph);if(!x||s.info.alkenes.length||s.info.alkynes.length)return [];const g=rxCloneGraph(s.graph);rxsReplace(g,x.r,x.c,x.n,false);g.addBond(x.r,x.n);[x.c,x.o,x.mid,x.end].forEach(id=>g.removeAtom(id));g.getAtom(x.n).charge=0;
    return [rxOutcome('curtius-hydrolysis','Curtius rearrangement with aqueous work-up','Rearrangement',g,'Thermal migration of the carbon substituent to the acyl-bound nitrogen gives an isocyanate. Aqueous hydrolysis and decarboxylation leave a primary amine with one fewer carbon.',{score:15,consumes:[rxUse(s,1)],byproducts:['N2','CO2'],warnings:['A thermal rearrangement followed by a separate aqueous work-up is assumed. Only one simple acyl azide without competing functionality is encoded.','The neutral amine is shown after work-up, not as an acidic-mixture speciation prediction. Acyl azide handling, thermal behavior and practical feasibility require specialist review; this structural rule supplies no preparation or operating procedure.']})];});
}
// Extend the core imine descriptor with the ammonia case used by the
// primary-amine reverse transform. Ordinary imine formation and substrate
// amines continue through the original implementation unchanged.
function rx9AmmoniaReductive(ctx) {
 if(!ctx.has('mildHydride')||!ctx.has('ammonia'))return [];
 const carbonyls=ctx.substrates.flatMap(s=>s.info.carbonyls.filter(c=>['aldehyde','ketone'].includes(c.kind)).map(c=>({s,c})));
 const amines=ctx.substrates.flatMap(s=>s.info.amines.map(a=>({s,a}))).filter(x=>!carbonyls.some(c=>c.s===x.s));
 if(!carbonyls.length||amines.length)return [];
 const {s,c}=carbonyls[0],nh3=ctx.get('ammonia'),g=rxCloneGraph(s.graph),map=rxMerge(g,nh3.graph,nh3.ids);
 g.removeAtom(c.o);g.addBond(map.get(nh3.ids[0]),c.c);
 return [rxOutcome('reductive-amination','Reductive amination with ammonia','Imine formation + reduction',g,'Ammonia and the carbonyl compound form a primary imine, which the mild hydride reduces as it forms to give the primary amine.',{score:13,byproducts:['H₂O','borate salts (after work-up)'],consumes:[rxUse(s,1),rxUse(nh3,1),rxUse(ctx.get('mildHydride'),1)],warnings:['Mildly acidic conditions can accelerate imine formation; this structural rule does not predict speciation, selectivity or yield.']})];
}
const rx9CoreImineRule=RX_RULES.find(rule=>rule.id==='imine'),rx9CoreImineRun=rx9CoreImineRule&&rx9CoreImineRule.run;
if(rx9CoreImineRule)rx9CoreImineRule.run=function(ctx){return rx9CoreImineRun(ctx).concat(rx9AmmoniaReductive(ctx));};

const RX9_RULE_DATA = [
 ['pyridine-n-oxidation','Pyridine N-oxidation',rx9RulePyrOx,'Oxidation','One pyridine ring on a carbon/halocarbon skeleton; peracetic acid in acetic acid at 60–90 °C; free N-oxide after work-up.',RX9_SOURCES.pyrOx],
 ['pyridine-oxide-deoxygenation','Pyridine N-oxide deoxygenation',rx9RulePyrRed,'Reduction','One pyridine N-oxide and PCl3 in dry chloroform/ethyl acetate at 0–30 °C.',RX9_SOURCES.pyrRed],
 ['cope-elimination','Cope amine-oxide elimination',rx9RuleCope,'Elimination','Acyclic N,N-dimethyl-N-primary-alkyl amine oxide with one eliminable arm; 100–180 °C and no added oxidant/strong acid.',RX9_SOURCES.cope],
 ['gabriel-alkylation','Gabriel phthalimide alkylation',rx9RuleGabriel,'Substitution','Unsubstituted phthalimide, hydroxide activation, methyl/primary non-neopentyl monohalide in DMF; activation and alkylation are sequential.',RX9_SOURCES.gabriel],
 ['gabriel-hydrazinolysis','Gabriel phthalimide amine release',rx9RuleGabrielRelease,'Deprotection','One N-alkylphthalimide with no other N/O functionality, hydrazine in ethanol at 50–100 °C.',RX9_SOURCES.gabrielHydrazine],
 ['imine-hydrolysis','Imine hydrolysis',ctx=>rx9Hydrolysis(ctx,false),'Hydrolysis','One neutral N-carbon-substituted imine cleavable into two pieces with aqueous strong acid; no additional N/O sites or hydride.',RX9_SOURCES.imine],
 ['enamine-hydrolysis','Enamine hydrolysis',ctx=>rx9Hydrolysis(ctx,true),'Hydrolysis','One neutral tertiary N-carbon-substituted enamine cleavable into two pieces with aqueous strong acid; no additional N/O sites or hydride.',RX9_SOURCES.imine],
 ['curtius-hydrolysis','Curtius rearrangement/hydrolysis',rx9RuleCurtius,'Rearrangement','One simple R–C(O)–N=N+=N− acyl azide; heat 60–120 °C then aqueous work-up; no other N/O functionality or C=C/C≡C.',RX9_SOURCES.gabriel],
];
RX9_RULE_DATA.forEach(([id,name,run,family,scope,source])=>RX_RULES.push({id,name,run,catalog:{family,scope,assumptions:['The stated sequential stages and isolated-product convention apply; no rate or conversion is measured.'],limitations:['Only the encoded single-site subset is supported; no general chemoselectivity, yield, concentration or experimental feasibility is established.'],references:[source]}}));

// Hydrazine and base alone do not justify full Wolff–Kishner deoxygenation.
// Below the activation threshold, preserve the original hydrazone prediction
// instead of returning a hot-reaction product with only a warning attached.
const rx9HydrazineTemperatureRule=RX_RULES.find(rule=>rule.id==='hydrazine');
if(rx9HydrazineTemperatureRule){
 const rx9HydrazineTemperatureRun=rx9HydrazineTemperatureRule.run;
 rx9HydrazineTemperatureRule.run=function(ctx){
  if(ctx.temperature<150&&ctx.get('hydrazine')&&(ctx.has('hydroxide')||ctx.has('alkoxide'))){
   const cool=Object.create(ctx),has=ctx.has;
   cool.has=tag=>tag==='hydroxide'||tag==='alkoxide'?false:has(tag);
   return rx9HydrazineTemperatureRun(cool);
  }
  return rx9HydrazineTemperatureRun(ctx);
 };
}
