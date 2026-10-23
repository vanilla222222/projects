// Bounded heterocumulene, sulfur-transfer and heterocycle chemistry. Sources
// support reaction classes; local structural products are not experimental data.
const RX11_SOURCES = {
 isocyanate:{title:'Zamani et al., Polyurethane Recycling: Conversion of Carbamates (2022), isocyanate side reactions',url:'https://ris.utwente.nl/ws/files/289629877/Zamani_2022_Polyurethane_recycling_conversion_o.pdf',kind:'primary'},
 carbamate:{title:'Vandenabeele-Trambouze et al., isocyanate reactions with amines and alcohols (2001)',url:'https://www.sciencedirect.com/science/article/abs/pii/S1093019100000691',kind:'primary'},
 thiourea:{title:'N-urethane-protected amino alkyl isothiocyanates and thioureidopeptides (2009)',url:'https://pubmed.ncbi.nlm.nih.gov/19537728/',kind:'primary'},
 oxime:{title:'Ac2O/K2CO3/DMSO: nitriles from aldoximes (2013)',url:'https://doi.org/10.1016/j.tetlet.2013.11.079',kind:'primary'},
 thionation:{title:'Bak et al., Towards Symmetric Thioamides: Microwave-Aided Synthesis of Terephthalic Acid Derivatives (2023)',url:'https://www.mdpi.com/1424-8247/16/7/984',kind:'primary'},
 thiol:{title:'University of Calgary, Carey Ch15: thiourea/isothiouronium preparation of thiols',url:'https://chem.ucalgary.ca/courses/350/Carey5th/Ch15/ch15-6-2.html',kind:'teaching'},
 thiophene:{title:'Manonmaniam Sundaranar University, Organic Chemistry II: Paal–Knorr thiophene synthesis',url:'https://www.msuniv.ac.in/images/distance%20education/learning%20materials/ug%20pg/ug/bsc_chemistry/III%20Year%20-%20DJY3A%20-%20Organic%20Chemistry%20II.pdf',kind:'teaching'},
 thiazole:{title:'Kinetics of Thiazole Formation Using alpha-Halo Ketones and Thioamides (2022)',url:'https://www.orientjchem.org/vol38no4/kinetics-of-thiazole-formation-using-%CE%B1-halo-ketones-and-thioamides/',kind:'primary'},
};
REACTION_ADDITIVES.push({id:'p2s5',name:'P₂S₅ / P₄S₁₀',group:'Reagent',label:'P2S5',smiles:''});
RX_ADDITIVE_TAGS.p2s5=['phosphorusSulfide'];
function rx11Simple(g,allowed,charged=[]) {return g.atoms.every(a=>allowed.includes(a.element)&&(!a.charge||charged.includes(a.id)));}
function rx11Cumulenes(s,element) {
 if(!rx11Simple(s.graph,['C','N',element,'H','D','F','Cl','Br','I'])||s.graph.atoms.filter(a=>a.element==='N').length!==1||s.graph.atoms.filter(a=>a.element===element).length!==1)return [];
 return s.graph.atoms.filter(a=>a.element==='C').flatMap(c=>{
  const ns=rxNeighbors(s.graph,c.id),n=ns.find(x=>x.atom.element==='N'&&x.bond.order===2),x=ns.find(x=>x.atom.element===element&&x.bond.order===2);
  return ns.length===2&&n&&x&&rxNeighbors(s.graph,x.atom.id).length===1&&rxNeighbors(s.graph,n.atom.id).length===2&&rxCarbonNeighbors(s.graph,n.atom.id).some(q=>q.atom.id!==c.id&&q.bond.order===1)?[{c:c.id,n:n.atom.id,x:x.atom.id}]:[];
 });
}
function rx11Amine(s) {
 const ns=s.info.amines;
 return ns.length===1&&rx11Simple(s.graph,['C','N','H','D','F','Cl','Br','I'])&&s.graph.atoms.filter(a=>a.element==='N').length===1?ns[0]:null;
}
function rx11IsocyanateAddition(ctx,kind) {
 const element=kind==='thiourea'?'S':'O';
 if(ctx.has('strongAcid')||ctx.has('H2O')||ctx.has('alanate')||ctx.has('borohydride')||ctx.has('grignard')||ctx.temperature<0||ctx.temperature>100)return [];
 const acceptors=ctx.substrates.flatMap(s=>rx11Cumulenes(s,element).map(x=>({s,x})));
 if(acceptors.length!==1||ctx.substrates.length!==2)return [];
 const a=acceptors[0],partners=ctx.substrates.filter(s=>s!==a.s).flatMap(s=>{
  if(kind==='carbamate')return s.info.alcohols.length===1&&s.graph.atoms.filter(a=>a.element==='O').length===1&&rx11Simple(s.graph,['C','O','H','D','F','Cl','Br','I'])?[{s,atom:s.info.alcohols[0].o}]:[];
  const amine=rx11Amine(s);return amine?[{s,atom:amine.n}]:[];
 });
 if(partners.length!==1||kind!=='carbamate'&&ctx.protic||kind==='carbamate'&&ctx.conditions.solvents.some(v=>['water','methanol','ethanol','ipa','tbuoh','acoh'].includes(v)))return [];
 const p=partners[0],g=rxCloneGraph(a.s.graph),m=rxMerge(g,p.s.graph,p.s.graph.atoms.map(a=>a.id));rxSetOrder(g,a.x.c,a.x.n,1);g.addBond(a.x.c,m.get(p.atom));
 const id=kind==='thiourea'?'isothiocyanate-thiourea':kind==='carbamate'?'isocyanate-carbamate':'isocyanate-urea';
 return [rxOutcome(id,kind==='thiourea'?'Isothiocyanate + amine to thiourea':kind==='carbamate'?'Isocyanate + alcohol to carbamate':'Isocyanate + amine to urea','Nucleophilic addition',g,'The nucleophile adds to the heterocumulene carbon and proton transfer converts C=N to a single C–N bond. Both complete substrate skeletons are retained.',{score:15,consumes:[rxUse(a.s,1),rxUse(p.s,1)],warnings:['Only one simple monofunctional heterocumulene and one monoamine/alcohol are encoded. Water, acids and competing O/N/S sites are excluded; no catalyst, rate or conversion guarantee is inferred.']})];
}
function rx11IsocyanateHydrolysis(ctx) {
 if(!ctx.has('H2O')||ctx.temperature<0||ctx.temperature>100)return [];
 return ctx.substrates.flatMap(s=>rx11Cumulenes(s,'O').map(x=>{const g=rxCloneGraph(s.graph);g.removeAtom(x.c);g.removeAtom(x.x);return rxOutcome('isocyanate-hydrolysis','Isocyanate hydrolysis/decarboxylation','Hydrolysis',g,'Water adds to the isocyanate, giving a carbamic acid which loses CO2 and furnishes the primary amine connectivity after work-up.',{score:14,consumes:[rxUse(s,1)],byproducts:['CO2'],warnings:['Excess aqueous work-up is assumed. The generated amine can react with remaining isocyanate to form urea; this rule does not establish selective isolation, speciation or yield.']});}));
}
function rx11OximeDehydration(ctx) {
 if(!ctx.conditions.solvents.includes('dmso')||!ctx.has('weakBase')||ctx.has('H2O')||ctx.has('strongAcid'))return [];
 const ac=ctx.substrates.find(s=>{const x=rx6Anhydride(s);return x&&s.graph.atoms.length===7&&s.graph.atoms.filter(a=>a.element==='C'&&rxHydrogens(s.graph,a.id)===3).length===2;});
 if(!ac)return [];
 return ctx.substrates.filter(s=>s!==ac&&rx11Simple(s.graph,['C','N','O','H','D','F','Cl','Br','I'])&&s.graph.atoms.filter(a=>a.element==='N').length===1&&s.graph.atoms.filter(a=>a.element==='O').length===1).flatMap(s=>{
  const ns=s.graph.atoms.filter(a=>a.element==='N');const n=ns[0],c=rxNeighbors(s.graph,n.id).find(q=>q.atom.element==='C'&&q.bond.order===2),o=rxNeighbors(s.graph,n.id).find(q=>q.atom.element==='O'&&q.bond.order===1);
  if(!c||!o||rxHydrogens(s.graph,c.atom.id)!==1||rxNeighbors(s.graph,n.id).length!==2||rxHydrogens(s.graph,o.atom.id)!==1||rxNeighbors(s.graph,o.atom.id).length!==1||rxNeighbors(s.graph,c.atom.id).some(q=>['H','D'].includes(q.atom.element)))return [];
  const g=rxCloneGraph(s.graph);g.removeAtom(o.atom.id);rxSetOrder(g,c.atom.id,n.id,3);rxsDrop(g,c.atom.id);rxsDrop(g,n.id);
  return [rxOutcome('aldoxime-dehydration','Aldoxime to nitrile (Ac2O/base)','Dehydration',g,'Acetic anhydride activates the oxime oxygen; elimination gives the corresponding nitrile without changing the carbon skeleton.',{score:15,consumes:[rxUse(s,1),rxUse(ac,1)],warnings:['Only an aldoxime with implicit aldehydic H and no other N/O/S group is encoded in dry DMSO with carbonate-type base. Ketoximes and explicit reactive H/D isotope sites are excluded.']})];
 });
}
function rx11Thioamides(g) {
 if(!rx11Simple(g,['C','N','S','H','D','F','Cl','Br','I'])||g.atoms.filter(a=>a.element==='N').length!==1||g.atoms.filter(a=>a.element==='S').length!==1)return [];
 return g.atoms.filter(a=>a.element==='C').flatMap(c=>{const ns=rxNeighbors(g,c.id),s=ns.find(n=>n.atom.element==='S'&&n.bond.order===2),n=ns.find(n=>n.atom.element==='N'&&n.bond.order===1);return s&&n&&rxNeighbors(g,s.atom.id).length===1&&rxHydrogens(g,n.atom.id)===2&&rxNeighbors(g,n.atom.id).length===1&&rxCarbonNeighbors(g,c.id).length===1?[{c:c.id,s:s.atom.id,n:n.atom.id}]:[];});
}
function rx11AmideThionation(ctx) {
 if(!ctx.has('phosphorusSulfide')||ctx.protic||ctx.has('H2O')||ctx.temperature<80||!ctx.conditions.solvents.includes('toluene'))return [];
 return ctx.substrates.flatMap(s=>{const cs=s.info.carbonyls;if(cs.length!==1||cs[0].kind!=='amide'||!rx11Simple(s.graph,['C','N','O','H','D','F','Cl','Br','I'])||s.graph.atoms.filter(a=>a.element==='O').length!==1||s.graph.atoms.filter(a=>a.element==='N').length!==1)return [];const g=rxCloneGraph(s.graph);g.removeAtom(cs[0].o);rxAttach(g,'S',cs[0].c,2);return [rxOutcome('amide-thionation','Amide to thioamide (P2S5)','Sulfur transfer',g,'The carbonyl oxygen of one amide is replaced by sulfur from phosphorus sulfide; the amide C–N skeleton is retained.',{score:15,consumes:[rxUse(s,1)],warnings:['A simple monoamide in dry heated toluene is the bounded model. Other carbonyls/heteroatom groups and reagent stoichiometry/speciation are not modeled; conversion is not established.']})];});
}
function rx11Thiourea(s) {const g=s.graph;return g.atoms.length===4&&g.atoms.filter(a=>a.element==='N'&&!a.charge&&rxHydrogens(g,a.id)===2).length===2&&g.atoms.some(a=>a.element==='C'&&rxNeighbors(g,a.id).filter(n=>n.atom.element==='S'&&n.bond.order===2).length===1);}
function rx11ThioureaAlkylation(ctx) {
 if(ctx.has('strongAcid')||ctx.has('hydroxide')||ctx.has('hydride')||!ctx.conditions.solvents.includes('ethanol'))return [];
 const ts=ctx.substrates.filter(rx11Thiourea),hs=ctx.substrates.flatMap(s=>s.info.halides.map(h=>({s,h}))).filter(x=>rx11Simple(x.s.graph,['C','H','D','Cl','Br','I'])&&x.s.info.halides.length===1&&x.h.degree<=1&&!x.s.info.alkenes.length&&!x.s.info.alkynes.length&&!rxCarbonNeighbors(x.s.graph,x.h.c).some(n=>rxCarbonNeighbors(x.s.graph,n.atom.id).length>=4));
 if(ts.length!==1||hs.length!==1||ctx.substrates.length!==2)return [];const t=ts[0],h=hs[0],g=rxCloneGraph(t.graph),m=rxMerge(g,h.s.graph,h.s.graph.atoms.map(a=>a.id)),s=g.atoms.find(a=>a.element==='S'),c=rxNeighbors(g,s.id)[0].atom.id,n=rxNeighbors(g,c).find(q=>q.atom.element==='N').atom;
 g.removeAtom(m.get(h.h.x));rxSetOrder(g,c,s.id,1);rxSetOrder(g,c,n.id,2);n.charge=1;g.addBond(s.id,m.get(h.h.c));
 return [rxOutcome('thiourea-s-alkylation','Thiourea S-alkylation','Substitution',g,'Thiourea sulfur displaces the primary alkyl halide to give the S-alkylisothiouronium cation. Thiol release is a separate hydrolysis step.',{score:15,consumes:[rxUse(t,1),rxUse(h.s,1)],byproducts:['halide counterion'],warnings:['Only methyl/primary non-neopentyl monohalides and unsubstituted thiourea are encoded. The cation is shown separately from its halide counterion; no salt isolation or yield is predicted.']})];
}
function rx11Isothiouronium(g) {
 if(g.atoms.filter(a=>a.element==='S').length!==1||g.atoms.filter(a=>a.element==='N').length!==2||!rx11Simple(g,['C','N','S','H','D','F','Cl','Br','I'],g.atoms.filter(a=>a.element==='N').map(a=>a.id)))return null;
 const s=g.atoms.find(a=>a.element==='S');if(s.charge||rxNeighbors(g,s.id).length!==2)return null;
 const c=rxNeighbors(g,s.id).find(q=>q.atom.element==='C'&&rxNeighbors(g,q.atom.id).filter(n=>n.atom.element==='N').length===2);if(!c)return null;
 const ns=rxNeighbors(g,c.atom.id).filter(n=>n.atom.element==='N');if(ns.length!==2||ns.some(n=>rxHydrogens(g,n.atom.id)!==2||rxNeighbors(g,n.atom.id).length!==1)||ns.filter(n=>n.bond.order===2&&n.atom.charge===1).length!==1||ns.filter(n=>n.bond.order===1&&!n.atom.charge).length!==1)return null;
 return {s:s.id,c:c.atom.id,ns:ns.map(n=>n.atom.id)};
}
function rx11IsothiouroniumHydrolysis(ctx) {
 if(!ctx.has('H2O')||!ctx.has('hydroxide')||ctx.temperature<40)return [];
 return ctx.substrates.flatMap(s=>{const x=rx11Isothiouronium(s.graph);if(!x)return [];const g=rxCloneGraph(s.graph);rxSetOrder(g,x.s,x.c,0);x.ns.forEach(id=>{rxSetOrder(g,x.c,id,1);g.getAtom(id).charge=0;});rxAttach(g,'O',x.c,2);return [rxOutcome('isothiouronium-hydrolysis','Isothiouronium hydrolysis to thiol','Hydrolysis',g,'Hydrolysis releases the sulfur-containing alkyl fragment as a thiol after protonating work-up; the central carbon and both original nitrogens are retained as urea.',{score:15,consumes:[rxUse(s,1)],warnings:['Neutral thiol connectivity assumes a separate protonating work-up; the basic reaction mixture can contain thiolate. Counterions, equilibrium and conversion are not modeled. Both thiol and urea are retained.']})];});
}
function rx11Diketone(s) {
 const cs=s.info.carbonyls;if(cs.length!==2||cs.some(c=>!['ketone','aldehyde'].includes(c.kind))||!rx11Simple(s.graph,['C','O','H','D','F','Cl','Br','I'])||s.graph.atoms.filter(a=>a.element==='O').length!==2||s.info.alkenes.length||s.info.alkynes.length||s.graph.bonds.length!==s.graph.atoms.length-1)return null;
 const [p,q]=cs;for(const a of rxCarbonNeighbors(s.graph,p.c))for(const b of rxCarbonNeighbors(s.graph,a.atom.id)){if(b.atom.id!==p.c&&s.graph.getBond(b.atom.id,q.c)&&rxHydrogens(s.graph,a.atom.id)>=1&&rxHydrogens(s.graph,b.atom.id)>=1)return {p,q,a:a.atom.id,b:b.atom.id};}return null;
}
function rx11PaalThiophene(ctx) {
 if(!ctx.has('phosphorusSulfide')||ctx.protic||ctx.has('H2O')||ctx.temperature<80)return [];
 return ctx.substrates.flatMap(s=>{const x=rx11Diketone(s);if(!x)return [];const g=rxCloneGraph(s.graph);g.removeAtom(x.p.o);g.removeAtom(x.q.o);const sulfur=rxAttach(g,'S',x.p.c);g.addBond(sulfur.id,x.q.c);rxSetOrder(g,x.p.c,x.a,2);rxSetOrder(g,x.b,x.q.c,2);[x.p.c,x.a,x.b,x.q.c].forEach(id=>rxsDrop(g,id));return [rxOutcome('paal-knorr-thiophene','Paal–Knorr thiophene synthesis','Heterocycle formation',g,'Sulfur transfer and cyclodehydration of a 1,4-dicarbonyl produce the aromatic five-membered thiophene ring.',{score:15,consumes:[rxUse(s,1)],warnings:['Only one acyclic 1,4-dicarbonyl with no additional O/N/S functionality is encoded under dry heated phosphorus-sulfide conditions. Sulfur-reagent loading, furan competition and conversion are not simulated.']})];});
}
function rx11Hantzsch(ctx) {
 if(!ctx.conditions.solvents.includes('ethanol')||ctx.temperature<40||ctx.has('hydroxide')||ctx.has('alanate')||ctx.has('grignard'))return [];
 const ts=ctx.substrates.flatMap(s=>rx11Thioamides(s.graph).map(x=>({s,x}))),ks=ctx.substrates.flatMap(s=>s.info.carbonyls.filter(c=>c.kind==='ketone').flatMap(c=>s.info.halides.filter(h=>s.graph.getBond(c.c,h.c)&&rxHydrogens(s.graph,h.c)===2).map(h=>({s,c,h})))).filter(x=>x.s.info.carbonyls.length===1&&x.s.info.halides.length===1&&x.s.graph.atoms.filter(a=>a.element==='O').length===1&&rx11Simple(x.s.graph,['C','O','H','D','Cl','Br','I']));
 if(ts.length!==1||ks.length!==1||ctx.substrates.length!==2)return [];const t=ts[0],k=ks[0],g=rxCloneGraph(t.s.graph),m=rxMerge(g,k.s.graph,k.s.graph.atoms.map(a=>a.id));g.removeAtom(m.get(k.c.o));g.removeAtom(m.get(k.h.x));rxSetOrder(g,t.x.c,t.x.s,1);rxSetOrder(g,t.x.c,t.x.n,2);g.addBond(t.x.s,m.get(k.h.c));g.addBond(t.x.n,m.get(k.c.c));rxSetOrder(g,m.get(k.h.c),m.get(k.c.c),2);[t.x.n,t.x.c,m.get(k.h.c),m.get(k.c.c)].forEach(id=>rxsDrop(g,id));
 return [rxOutcome('hantzsch-thiazole','Hantzsch thiazole synthesis','Heterocycle formation',g,'Sulfur alkylation of the primary thioamide at the alpha-haloketone is followed by N–C ring closure and dehydration, giving a 2,4-disubstituted thiazole.',{score:15,consumes:[rxUse(t.s,1),rxUse(k.s,1)],byproducts:['HX','H2O'],warnings:['Only one primary thioamide and one alpha-CH2 monohaloketone are encoded in heated ethanol. Other heteroatom functions and substituted alpha stereocentres are excluded; no rate or yield is calculated.']})];
}
const RX11_RULE_DATA=[
 ['isocyanate-urea','Isocyanate + amine to urea',c=>rx11IsocyanateAddition(c,'urea'),'Addition','Simple monoisocyanate plus separate primary/secondary monoamine; dry nonprotic conditions, 0–100 °C.',RX11_SOURCES.isocyanate],
 ['isocyanate-carbamate','Isocyanate + alcohol to carbamate',c=>rx11IsocyanateAddition(c,'carbamate'),'Addition','Simple monoisocyanate and one monoalcohol, with no added protic solvent, water or strong acid, 0–100 °C.',RX11_SOURCES.carbamate],
 ['isothiocyanate-thiourea','Isothiocyanate + amine to thiourea',c=>rx11IsocyanateAddition(c,'thiourea'),'Addition','Simple monoisothiocyanate and separate primary/secondary monoamine under dry nonprotic conditions.',RX11_SOURCES.thiourea],
 ['isocyanate-hydrolysis','Isocyanate hydrolysis/decarboxylation',rx11IsocyanateHydrolysis,'Hydrolysis','One simple monoisocyanate under excess aqueous work-up, 0–100 °C; urea competition remains unresolved.',RX11_SOURCES.isocyanate],
 ['aldoxime-dehydration','Aldoxime dehydration to nitrile',rx11OximeDehydration,'Dehydration','Single aldoxime with implicit aldehydic H, acetic anhydride and carbonate base in dry DMSO; no other N/O group.',RX11_SOURCES.oxime],
 ['amide-thionation','P2S5 amide thionation',rx11AmideThionation,'Sulfur transfer','One simple monoamide without other O/N functionality in dry toluene, phosphorus sulfide, at least 80 °C.',RX11_SOURCES.thionation],
 ['thiourea-s-alkylation','Thiourea S-alkylation',rx11ThioureaAlkylation,'Substitution','Unsubstituted thiourea and one methyl/primary non-neopentyl alkyl monohalide in ethanol; cation endpoint.',RX11_SOURCES.thiol],
 ['isothiouronium-hydrolysis','Isothiouronium to thiol',rx11IsothiouroniumHydrolysis,'Hydrolysis','One S-alkylisothiouronium cation in heated aqueous hydroxide, followed by protonating work-up; urea coproduct retained.',RX11_SOURCES.thiol],
 ['paal-knorr-thiophene','Paal–Knorr thiophene',rx11PaalThiophene,'Heterocycle formation','One acyclic simple 1,4-dicarbonyl with alpha hydrogens, dry phosphorus sulfide and heat ≥80 °C.',RX11_SOURCES.thiophene],
 ['hantzsch-thiazole','Hantzsch thiazole',rx11Hantzsch,'Heterocycle formation','One primary thioamide and one simple alpha-CH2 monohaloketone, heated ethanol; no competing functionality.',RX11_SOURCES.thiazole],
];
RX11_RULE_DATA.forEach(([id,name,run,family,scope,reference])=>RX_RULES.push({id,name,run,catalog:{family,scope,assumptions:['Net isolated connectivity and the stated separate work-up are represented; no conversion or rate is measured.'],limitations:['Only the bounded single-site substrate/condition patterns are encoded; experimental selectivity, loading and yield require independent review.'],references:[reference]}}));
