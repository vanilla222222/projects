// Bounded nitrogen and sulfur transformations. Sources establish reaction classes;
// they do not experimentally validate predictions for user-supplied molecules.
const RX7_SOURCES = {
  nox: { title: 'Xiang et al., tertiary amine oxidation with mCPBA, Advanced Science (2022)', url: 'https://doi.org/10.1002/advs.202200173', kind: 'primary' },
  denox: { title: 'Deoxygenation of tertiary amine N-oxides with acetic formic anhydride, Chemistry Letters (1985)', url: 'https://doi.org/10.1246/cl.1985.1517', kind: 'primary' },
  desox: { title: 'Reduction of aromatic sulphoxides by phosphorus trichloride (1969)', url: 'https://doi.org/10.1039/J39690002424', kind: 'primary' },
  acyl: { title: 'Direct thioesterification from carboxylic acids and thiols (2002), introduction: acyl chlorides and thiols', url: 'https://doi.org/10.1039/B109834A', kind: 'primary' },
  hydro: { title: 'McMurry, OpenStax Organic Chemistry 21.8: thioester acyl substitution', url: 'https://openstax.org/books/organic-chemistry/pages/21-8-chemistry-of-thioesters-and-acyl-phosphates-biological-carboxylic-acid-derivatives', kind: 'teaching' },
  sulfonyl: { title: 'Ivanov et al., solvation bifunctional catalysis of sulfonyl chloride hydrolysis (2005)', url: 'https://doi.org/10.1007/PL00021981', kind: 'primary' },
  nitrile: { title: 'Efficient conversion of nitriles to amides with basic hydrogen peroxide in DMSO (1989)', url: 'https://doi.org/10.1055/s-1989-27441', kind: 'primary' },
  ene: { title: 'Renzi et al., Purple-Light Promoted Thiol-ene Reaction of Alkenes (2023)', url: 'https://doi.org/10.1002/adsc.202300990', kind: 'primary' },
};

RX_SPECIES_DETECTORS.push((g, ids) => {
  const atoms = ids.map(id => g.getAtom(id));
  if (atoms.some(a => a.charge)) return null;
  const ps = atoms.filter(a => a.element === 'P');
  if (ids.length === 4 && ps.length === 1 && rxNeighbors(g, ps[0].id).length === 3 &&
      rxNeighbors(g, ps[0].id).every(n => n.atom.element === 'Cl' && n.bond.order === 1 && rxNeighbors(g,n.atom.id).length===1)) return {tag:'phosphorusTrichloride',atom:ps[0].id};
  // Exact mixed formic/acetic anhydride topology, not its molecular formula.
  if (ids.length !== 6 || atoms.filter(a=>a.element==='C').length !== 3 || atoms.filter(a=>a.element==='O').length !== 3) return null;
  const bridge = atoms.find(a=>a.element==='O' && rxNeighbors(g,a.id).length===2 && rxNeighbors(g,a.id).every(n=>n.atom.element==='C'&&n.bond.order===1));
  if (!bridge) return null;
  const ends = rxNeighbors(g,bridge.id).map(n=>n.atom.id);
  if (!ends.every(id=>rxNeighbors(g,id).some(n=>n.atom.element==='O'&&n.bond.order===2))) return null;
  const formyl = ends.filter(id=>rxHydrogens(g,id)===1 && rxCarbonNeighbors(g,id).length===0);
  const acetyl = ends.filter(id=>rxCarbonNeighbors(g,id).length===1 && rxHydrogens(g,rxCarbonNeighbors(g,id)[0].atom.id)===3);
  return formyl.length===1 && acetyl.length===1 ? {tag:'aceticFormicAnhydride',atom:bridge.id}:null;
});

function rx7Simple(g, allowed, chargedIds) {
  const permitted = new Set(chargedIds || []);
  return g.atoms.every(a=>allowed.includes(a.element) && (!a.charge || permitted.has(a.id)));
}
function rx7ColdDry(ctx) {
  return !ctx.protic && !ctx.has('H2O') && !ctx.has('strongAcid') && ctx.conditions.solvents.includes('dcm') && ctx.temperature>=0 && ctx.temperature<=25;
}
function rx7TertiaryNitrogens(g) {
  return g.atoms.filter(a=>a.element==='N' && !a.charge && rxNeighbors(g,a.id).length===3 &&
    rxNeighbors(g,a.id).every(n=>n.atom.element==='C'&&n.bond.order===1&&rxIsSp3(g,n.atom.id)));
}
function rx7AmineOxides(g) {
  return g.atoms.filter(a=>a.element==='N'&&a.charge===1).flatMap(a=>{
    const ns=rxNeighbors(g,a.id), os=ns.filter(n=>n.atom.element==='O'&&n.atom.charge===-1&&n.bond.order===1&&rxNeighbors(g,n.atom.id).length===1);
    return ns.length===4&&os.length===1&&ns.filter(n=>n.atom.element==='C'&&n.bond.order===1&&rxIsSp3(g,n.atom.id)).length===3 ? [{n:a.id,o:os[0].atom.id}]:[];
  });
}
function rx7RuleNOxidation(ctx) {
  if (!ctx.has('mcpba') || !rx7ColdDry(ctx)) return [];
  return ctx.substrates.flatMap(s=>{
    const ns=rx7TertiaryNitrogens(s.graph);
    if(ns.length!==1 || s.graph.atoms.filter(a=>a.element==='N').length!==1 || !rx7Simple(s.graph,['C','H','D','N','F','Cl','Br','I']) || s.info.alkenes.length||s.info.alkynes.length) return [];
    const g=rxCloneGraph(s.graph);g.getAtom(ns[0].id).charge=1;rxAttach(g,'O',ns[0].id,1,-1);
    return [rxOutcome('amine-n-oxidation','Tertiary amine N-oxidation','Oxygen transfer',g,'A peracid transfers oxygen to one trialkylamine nitrogen; the endpoint is represented as the charge-separated N+–O− amine oxide.',{score:16,consumes:[rxUse(s,1),rxUse(ctx.get('mcpba'),1)],byproducts:['m-chlorobenzoic acid'],warnings:['Only a single trialkylamine on a saturated carbon/halocarbon skeleton is modeled; competing sulfur, alkene and carbonyl oxidation are excluded.','No nitrogen stereochemistry is assigned. Cold conditions are required; thermal Cope elimination of N-oxides with beta hydrogens is not included in this endpoint.']})];
  });
}
function rx7RuleNODeoxygenation(ctx) {
  if(!ctx.has('aceticFormicAnhydride')||!rx7ColdDry(ctx))return [];
  return ctx.substrates.flatMap(s=>{
    const sites=rx7AmineOxides(s.graph);if(sites.length!==1)return [];
    const x=sites[0];if(!rx7Simple(s.graph,['C','H','D','N','O','F','Cl','Br','I'],[x.n,x.o])||s.graph.atoms.filter(a=>a.element==='N').length!==1||s.graph.atoms.filter(a=>a.element==='O').length!==1||s.info.alkenes.length||s.info.alkynes.length)return [];
    const g=rxCloneGraph(s.graph);g.removeAtom(x.o);g.getAtom(x.n).charge=0;
    return [rxOutcome('amine-oxide-deoxygenation','Trialkylamine N-oxide deoxygenation','Reduction',g,'Acetic formic anhydride removes the oxygen of a trialkylamine N-oxide, returning the parent tertiary amine.',{score:16,consumes:[rxUse(s,1),rxUse(ctx.get('aceticFormicAnhydride'),1)],warnings:['Restricted to one saturated trialkylamine N-oxide in dry DCM at 0–25 °C. Aromatic N-oxides, other oxygen functions and thermal rearrangements are outside scope.']})];
  });
}
function rx7RuleSODeoxygenation(ctx) {
  if(!ctx.has('phosphorusTrichloride')||!rx7ColdDry(ctx))return [];
  return ctx.substrates.flatMap(s=>{
    const sites=rx4SimpleSulfur(s.graph,1),ar=s.info.aromatic.atoms;
    if(sites.length!==1||s.graph.atoms.filter(a=>a.element==='S').length!==1||s.graph.atoms.filter(a=>a.element==='O').length!==1||!rx7Simple(s.graph,['C','H','D','S','O','F','Cl','Br','I'])||s.info.alkenes.length||s.info.alkynes.length||!rxCarbonNeighbors(s.graph,sites[0]).some(n=>ar.has(n.atom.id)))return [];
    const g=rxCloneGraph(s.graph),o=rxNeighbors(g,sites[0]).find(n=>n.atom.element==='O');g.removeAtom(o.atom.id);
    return [rxOutcome('sulfoxide-deoxygenation','PCl3 deoxygenation of aryl sulfoxide','Reduction',g,'Oxygen transfer from an aryl-substituted sulfoxide to phosphorus(III) gives the corresponding thioether.',{score:16,consumes:[rxUse(s,1),rxUse(ctx.get('phosphorusTrichloride'),1)],byproducts:['phosphorus oxychloride'],warnings:['Only one neutral S=O with at least one directly bound aromatic carbon is encoded; sulfones, charged S+–O− forms and other reactive heteroatoms are excluded.']})];
  });
}
function rx7Thioesters(g) {
  return rxAnalyze(g).carbonyls.flatMap(c=>{
    const ss=rxNeighbors(g,c.c).filter(n=>n.atom.element==='S'&&!n.atom.charge&&n.bond.order===1&&rxNeighbors(g,n.atom.id).length===2&&rxNeighbors(g,n.atom.id).every(x=>x.atom.element==='C'&&x.bond.order===1));
    return ss.length===1?[{c:c.c,o:c.o,s:ss[0].atom.id}]:[];
  });
}
function rx7RuleThiolAcylation(ctx) {
  if(!ctx.has('amineBase')||ctx.has('H2O')||ctx.protic||ctx.has('strongAcid'))return [];
  const acids=ctx.substrates.flatMap(s=>s.info.carbonyls.filter(c=>c.kind==='acylChloride').map(c=>({s,c})));
  const thiols=ctx.substrates.flatMap(s=>rxxThiols(s).map(id=>({s,id})));
  if(acids.length!==1||thiols.length!==1||acids[0].s===thiols[0].s)return [];
  const a=acids[0],t=thiols[0];
  if(!rx7Simple(a.s.graph,['C','H','D','O','Cl','F','Br','I'])||a.s.info.carbonyls.length!==1||a.s.graph.atoms.filter(x=>x.element==='O').length!==1||!rx7Simple(t.s.graph,['C','H','D','S','F','Cl','Br','I'])||t.s.graph.atoms.filter(x=>x.element==='S').length!==1)return [];
  const g=rxCloneGraph(a.s.graph),map=rxMerge(g,t.s.graph,t.s.graph.atoms.map(x=>x.id));g.removeAtom(a.c.hetero);g.addBond(a.c.c,map.get(t.id));
  return [rxOutcome('thiol-acylation','Acyl chloride + thiol to thioester','Nucleophilic acyl substitution',g,'The thiol replaces chloride at the acyl carbon; an added amine base traps the HCl formed.',{score:16,consumes:[rxUse(a.s,1),rxUse(t.s,1)],byproducts:['amine hydrochloride'],warnings:['One acyl chloride and one monothiol are modeled. Amines, alcohols, multiple acyl sites and intramolecular thiolactonization are excluded.']})];
}
function rx7RuleThioesterHydrolysis(ctx) {
  if(!ctx.has('H2O')||!ctx.has('strongAcid')||ctx.temperature<60)return [];
  return ctx.substrates.flatMap(s=>{
    const sites=rx7Thioesters(s.graph);if(sites.length!==1||s.info.carbonyls.length!==1||s.graph.atoms.filter(a=>a.element==='S').length!==1||s.graph.atoms.filter(a=>a.element==='O').length!==1||!rx7Simple(s.graph,['C','H','D','S','O','F','Cl','Br','I']))return [];
    const x=sites[0],g=rxCloneGraph(s.graph);rxSetOrder(g,x.c,x.s,0);
    // Exclude cyclic thioesters: this bounded rule reports two separate products.
    if(g.connectedComponents().length!==2)return [];
    rxAttach(g,'O',x.c);
    return [rxOutcome('thioester-hydrolysis','Acid hydrolysis of thioester','Nucleophilic acyl substitution',g,'Water replaces the thioalkoxy group at the acyl carbon under heated aqueous acid, giving a neutral carboxylic acid and thiol.',{score:16,consumes:[rxUse(s,1)],warnings:['The endpoint assumes aqueous acid and proton transfer; no reaction time or conversion is predicted. Cyclic thioesters and competing functional groups are outside scope.']})];
  });
}
function rx7SulfonylChlorides(g) {
  return g.atoms.filter(a=>a.element==='S'&&!a.charge).flatMap(a=>{
    const ns=rxNeighbors(g,a.id),cl=ns.filter(n=>n.atom.element==='Cl'&&n.bond.order===1&&rxNeighbors(g,n.atom.id).length===1);
    return ns.length===4&&cl.length===1&&ns.filter(n=>n.atom.element==='O'&&!n.atom.charge&&n.bond.order===2&&rxNeighbors(g,n.atom.id).length===1).length===2&&ns.filter(n=>n.atom.element==='C'&&n.bond.order===1).length===1 ? [{s:a.id,cl:cl[0].atom.id}]:[];
  });
}
function rx7RuleSulfonylHydrolysis(ctx) {
  if(!ctx.has('H2O')||ctx.has('hydroxide')||ctx.has('amineBase')||ctx.temperature<0||ctx.temperature>60)return [];
  const candidates=ctx.substrates.slice(), reagent=ctx.get('sulfonylChloride');
  if(reagent&&reagent.graph){const graph=rxCloneGraph(reagent.graph),keep=new Set(reagent.ids);graph.atoms.filter(a=>!keep.has(a.id)).forEach(a=>graph.removeAtom(a.id));candidates.push({graph,compound:reagent.compound,info:rxAnalyze(graph)});}
  if(candidates.length!==1)return [];
  const s=candidates[0],sites=rx7SulfonylChlorides(s.graph);
  if(sites.length!==1||!rx7Simple(s.graph,['C','H','D','S','O','Cl','F','Br','I'])||s.graph.atoms.filter(a=>a.element==='S').length!==1||s.graph.atoms.filter(a=>a.element==='O').length!==2)return [];
  const g=rxCloneGraph(s.graph);g.removeAtom(sites[0].cl);rxAttach(g,'O',sites[0].s);
  return [rxOutcome('sulfonyl-chloride-hydrolysis','Sulfonyl chloride hydrolysis','Substitution at sulfur',g,'Water replaces chloride at sulfonyl sulfur, producing the sulfonic acid connectivity.',{score:16,consumes:[rxUse(s,1)],byproducts:['HCl'],warnings:['The acid is shown in its neutral connectivity convention; actual aqueous sulfonic acids are largely dissociated. Rates are not modeled. Added bases and other competing nucleophiles are excluded.']})];
}
function rx7RuleNitrileHydration(ctx) {
  if(!ctx.has('hydrogenPeroxide')||!ctx.has('hydroxide')||!ctx.has('H2O')||!ctx.conditions.solvents.includes('dmso')||ctx.temperature<0||ctx.temperature>30||ctx.has('strongAcid'))return [];
  return ctx.substrates.flatMap(s=>{
    if(s.info.nitriles.length!==1||!rx7Simple(s.graph,['C','H','D','N','F','Cl','Br','I'])||s.graph.atoms.filter(a=>a.element==='N').length!==1||s.info.alkenes.length||s.info.alkynes.length)return [];
    const x=s.info.nitriles[0],g=rxCloneGraph(s.graph);rxSetOrder(g,x.c,x.n,1);rxAttach(g,'O',x.c,2);
    return [rxOutcome('nitrile-peroxide-hydration','Alkaline peroxide nitrile to amide','Hydration',g,'Basic hydrogen peroxide converts one nitrile to the primary amide; the nitrile nitrogen is retained in the product.',{score:17,consumes:[rxUse(s,1),rxUse(ctx.get('hydrogenPeroxide'),1)],warnings:['Only one nitrile on a carbon/halocarbon skeleton is encoded in aqueous DMSO at 0–30 °C. Oxidizable sulfur/amine sites, extra nitriles and C=C/C≡C are excluded.','The amide endpoint is specific to this peroxide hydration model; it is not a universal mild hydrolysis stopping rule.']})];
  });
}
function rx7RuleThiolEne(ctx) {
  if(!ctx.has('light')||!ctx.conditions.solvents.includes('dcm')||ctx.temperature<0||ctx.temperature>30||ctx.has('hydrogenPeroxide')||ctx.has('mcpba')||ctx.has('strongAcid'))return [];
  const enes=ctx.substrates.filter(s=>s.info.alkenes.length===1&&rx7Simple(s.graph,['C','H','D','F','Cl','Br','I'])&&!s.info.alkynes.length);
  const thiols=ctx.substrates.filter(s=>rx7Simple(s.graph,['C','H','D','S','F','Cl','Br','I'])&&rxxThiols(s).length===1&&s.graph.atoms.filter(a=>a.element==='S').length===1&&!s.info.alkenes.length&&!s.info.alkynes.length);
  if(enes.length!==1||thiols.length!==1||ctx.substrates.length!==2)return [];
  const e=enes[0],t=thiols[0],bond=e.info.alkenes[0],ends=[bond.a,bond.b],terminal=ends.filter(id=>rxHydrogens(e.graph,id)===2&&rxNeighbors(e.graph,id).length===1);
  if(!terminal.length)return [];
  const end=terminal[0],inner=ends.find(id=>id!==end);
  // Restrict to CH2=CH-R (or ethylene), so addition creates no new stereocentre.
  if(rxHydrogens(e.graph,inner)<1||rxNeighbors(e.graph,inner).some(n=>n.atom.id!==end&&n.bond.order!==1))return [];
  const g=rxCloneGraph(e.graph),map=rxMerge(g,t.graph,t.graph.atoms.map(a=>a.id));rxSetOrder(g,end,inner,1);g.addBond(end,map.get(rxxThiols(t)[0]));
  return [rxOutcome('thiol-ene','Photochemical terminal-alkene hydrothiolation','Radical addition',g,'Light-driven thiyl-radical addition attaches sulfur to the terminal alkene carbon. Hydrogen transfer gives the anti-Markovnikov thioether.',{score:16,consumes:[rxUse(e,1),rxUse(t,1)],warnings:['The light setting assumes an appropriate purple-light irradiation setup; wavelength, photon flux and oxygen control are not simulated.','Only one CH2=CH-R/ethylene partner and one monothiol are encoded. No stereoselectivity, polymerization, internal alkenes or polyfunctional competition is predicted.']})];
}
const RX7_RULE_DATA = [
 ['amine-n-oxidation','Tertiary amine N-oxidation',rx7RuleNOxidation,'Oxidation','One saturated trialkylamine, mCPBA, dry DCM at 0–25 °C; no other heteroatom functionality.',RX7_SOURCES.nox],
 ['amine-oxide-deoxygenation','Trialkylamine N-oxide deoxygenation',rx7RuleNODeoxygenation,'Reduction','One saturated charge-separated trialkylamine N-oxide, acetic formic anhydride, dry DCM at 0–25 °C.',RX7_SOURCES.denox],
 ['sulfoxide-deoxygenation','Aryl sulfoxide deoxygenation',rx7RuleSODeoxygenation,'Reduction','One neutral aryl-substituted sulfoxide, PCl3, dry DCM at 0–25 °C; no other oxygen or nitrogen functions.',RX7_SOURCES.desox],
 ['thiol-acylation','Acyl chloride + thiol',rx7RuleThiolAcylation,'Acyl substitution','One acyl chloride and one separate simple monothiol with amine base; no added water, protic solvent or acid.',RX7_SOURCES.acyl],
 ['thioester-hydrolysis','Thioester hydrolysis',rx7RuleThioesterHydrolysis,'Hydrolysis','One acyclic thioester with no extra oxygen/sulfur/nitrogen functionality, aqueous strong acid at ≥60 °C.',RX7_SOURCES.hydro],
 ['sulfonyl-chloride-hydrolysis','Sulfonyl chloride hydrolysis',rx7RuleSulfonylHydrolysis,'Hydrolysis','One simple sulfonyl chloride in water at 0–60 °C without competing nucleophiles or base.',RX7_SOURCES.sulfonyl],
 ['nitrile-peroxide-hydration','Nitrile to primary amide (peroxide)',rx7RuleNitrileHydration,'Hydration','One nitrile, H2O2 and hydroxide in aqueous DMSO at 0–30 °C; otherwise carbon/halocarbon skeleton.',RX7_SOURCES.nitrile],
 ['thiol-ene','Photochemical thiol–ene',rx7RuleThiolEne,'Addition','One hydrocarbon CH2=CH-R or ethylene plus one simple monothiol under light in DCM at 0–30 °C.',RX7_SOURCES.ene],
];
RX7_RULE_DATA.forEach(([id,name,run,family,scope,reference])=>RX_RULES.push({id,name,run,catalog:{family,scope,assumptions:['The encoded conditions and sequential work-up assumptions apply; displayed products are structural model endpoints.'],limitations:['Restricted single-site chemistry only; rates, yields, conversions and experimental compatibility are not predicted. See outcome warnings for transformation-specific exclusions.'],references:[reference]}}));
