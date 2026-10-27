// Bounded oxygen/acyl chemistry. References describe reaction classes; the
// graph rules do not establish experimental feasibility or conversion.
const RX6_SOURCES = {
  anhydride: { title: 'McMurry, OpenStax Organic Chemistry 21.5: Chemistry of acid anhydrides', url: 'https://openstax.org/books/organic-chemistry/pages/21-5-chemistry-of-acid-anhydrides', kind: 'teaching' },
  lactone: { title: 'WHO/JECFA, Alicyclic and aromatic-fused ring lactones: hydroxy-acid lactonization', url: 'https://inchem.org/documents/jecfa/jecmono/v52je13.htm', kind: 'teaching' },
  rosenmund: { title: 'Fuson et al., Organic Syntheses 23, 57 (1943), mesitaldehyde, Method B', url: 'https://doi.org/10.15227/orgsyn.023.0057', kind: 'primary' },
  peracid: { title: 'University of Calgary, Carey Ch17: Baeyer–Villiger reaction', url: 'https://www3.chem.ucalgary.ca/courses/351/Carey5th/Ch17/ch17-3-5-2.html', kind: 'teaching' },
};
REACTION_ADDITIVES.push({ id: 'rosenmund', name: 'Pd/BaSO₄ (Rosenmund catalyst)', group: 'Catalyst', label: 'Pd/BaSO4', smiles: '' });
RX_ADDITIVE_TAGS.rosenmund = ['rosenmundCatalyst'];
function rx6Neutral(g, allowed) { return g.atoms.every(a => !a.charge && allowed.includes(a.element)); }
function rx6Anhydride(s) {
  const cs = s.info.carbonyls;
  if (cs.length !== 2 || cs.some(c => c.kind !== 'anhydride') || cs[0].hetero !== cs[1].hetero || !rx6Neutral(s.graph, ['C','O','H','D','F','Cl','Br','I'])) return null;
  if (s.graph.atoms.filter(a => a.element === 'O').length !== 3) return null;
  return { left: cs[0], right: cs[1], bridge: cs[0].hetero };
}
function rx6AnhydrideSymmetric(s, site) {
  const g = rxCloneGraph(s.graph);
  g.removeAtom(site.bridge);
  rxAttach(g, 'O', site.left.c); rxAttach(g, 'O', site.right.c);
  const parts = rxProductList(g);
  return parts.length === 1 && parts[0].count === 2;
}
function rx6Out(id, name, g, s, extra) {
  const type = id.includes('reduction') ? 'Reduction' : id.includes('oxidation') ? 'Oxidation' : id.includes('lactonization') ? 'Cyclization' : 'Nucleophilic acyl substitution';
  return rxOutcome(id, name, type, g,
    name + ' is represented as a net structural transformation; intermediates, kinetics and work-up speciation are outside the model.',
    Object.assign({score:14, consumes:[rxUse(s,1)], warnings:['The encoded substrate and condition limits are conservative; no yield or general chemoselectivity is predicted.']},extra||{}));
}
function rx6RuleAnhydrideHydrolysis(ctx) {
  if (!ctx.has('H2O') || ctx.has('alanate')) return [];
  return ctx.substrates.flatMap(s => {
    const a=rx6Anhydride(s); if(!a)return [];
    const g=rxCloneGraph(s.graph); rxSetOrder(g,a.left.c,a.bridge,0); rxAttach(g,'O',a.left.c);
    // Neutral acids are shown only for neutral/acidic hydrolysis. Base gives
    // carboxylates and requires two equivalents for an acyclic anhydride.
    if(ctx.has('hydroxide')) {g.getAtom(a.bridge).charge=-1; rxNeighbors(g,a.left.c).find(n=>n.atom.element==='O'&&n.bond.order===1).atom.charge=-1;}
    return [rx6Out('anhydride-hydrolysis','Acid anhydride hydrolysis',g,s,{consumes:[rxUse(s,1),rxUse(ctx.get('H2O'),1)],warnings:[ctx.has('hydroxide')?'Carboxylate products are shown before acid work-up; counterions and exact base demand are not modeled.':'Both acid fragments are retained; a cyclic anhydride opens to a diacid.']})];
  });
}
function rx6HydroxyPartners(ctx, source) {
  const ps=[];
  ctx.substrates.filter(s=>s!==source).forEach(s=>{
    const aro=rxAromaticRings(s.graph).atoms;
    const oh=s.graph.atoms.filter(a=>a.element==='O'&&!a.charge&&rxHydrogens(s.graph,a.id)===1&&rxNeighbors(s.graph,a.id).length===1&&rxNeighbors(s.graph,a.id)[0].atom.element==='C'&&(rxIsSp3(s.graph,rxNeighbors(s.graph,a.id)[0].atom.id)||aro.has(rxNeighbors(s.graph,a.id)[0].atom.id)));
    const acids=s.info.carbonyls.filter(c=>c.kind==='acid');
    const compatibleO=s.info.carbonyls.length===acids.length&&acids.length<=1&&s.graph.atoms.filter(a=>a.element==='O').length===1+2*acids.length;
    if(oh.length===1&&compatibleO&&!s.info.amines.length&&rx6Neutral(s.graph,['C','O','H','D','F','Cl','Br','I']))ps.push({s,graph:s.graph,atom:oh[0].id});
  });
  ctx.solventNucleophiles.filter(n=>n.alcohol).forEach(n=>ps.push({graph:n.graph,atom:n.atom}));
  return ps;
}
function rx6RuleAnhydrideAlcoholysis(ctx) {
  if(ctx.has('H2O')||ctx.has('alanate')||ctx.has('hydroxide')||ctx.has('ammonia'))return [];
  return ctx.substrates.flatMap(s=>{
    const a=rx6Anhydride(s); if(!a||!rx6AnhydrideSymmetric(s,a))return [];
    const ps=rx6HydroxyPartners(ctx,s); if(ps.length!==1||(!ctx.has('strongAcid')&&!ctx.has('amineBase')))return [];
    const p=ps[0],g=rxCloneGraph(s.graph);rxSetOrder(g,a.left.c,a.bridge,0);const m=rxMerge(g,p.graph,p.graph.atoms.map(x=>x.id));g.addBond(a.left.c,m.get(p.atom));
    return [rx6Out('anhydride-alcoholysis','Anhydride esterification of alcohol or phenol',g,s,{consumes:[rxUse(s,1),p.s?rxUse(p.s,1):null],warnings:['One OH/phenol partner and a symmetric acyclic anhydride are modeled. The other acyl half is retained as a carboxylic acid.']})];
  });
}
function rx6RuleAnhydrideAminolysis(ctx) {
  if(ctx.has('strongAcid')||ctx.has('H2O')||ctx.has('alanate'))return [];
  return ctx.substrates.flatMap(s=>{
    const a=rx6Anhydride(s);if(!a||!rx6AnhydrideSymmetric(s,a))return [];
    const ps=ctx.substrates.filter(p=>p!==s&&p.info.amines.length===1&&rx6Neutral(p.graph,['C','N','O','H','D','F','Cl','Br','I'])&&p.graph.atoms.filter(x=>x.element==='N').length===1).map(p=>({s:p,graph:p.graph,atom:p.info.amines[0].n}));
    if(ctx.has('ammonia')){const p=ctx.get('ammonia');ps.push({graph:p.graph,atom:p.ids[0],species:p});}if(ps.length!==1)return [];
    const p=ps[0],g=rxCloneGraph(s.graph);rxSetOrder(g,a.left.c,a.bridge,0);const m=rxMerge(g,p.graph,p.graph.atoms.map(x=>x.id));g.addBond(a.left.c,m.get(p.atom));
    return [rx6Out('anhydride-aminolysis','Anhydride amide formation',g,s,{consumes:[rxUse(s,1),rxUse(p.s||p.species,1)],warnings:['Primary/secondary monoamines or ammonia are modeled. The acid coproduct can form an ammonium salt; proton transfer and excess-amine demand are not simulated.']})];
  });
}
function rx6RuleAnhydrideReduction(ctx) {
  if(!ctx.has('alanate')||ctx.protic||ctx.has('strongAcid')||!ctx.conditions.solvents.some(x=>['ether','thf'].includes(x)))return [];
  return ctx.substrates.flatMap(s=>{const a=rx6Anhydride(s);if(!a||s.info.alkenes.length||s.info.alkynes.length)return [];const g=rxCloneGraph(s.graph);g.removeAtom(a.bridge);rxSetOrder(g,a.left.c,a.left.o,1);rxSetOrder(g,a.right.c,a.right.o,1);return [rx6Out('anhydride-reduction','LiAlH₄ reduction of acid anhydride',g,s,{consumes:[rxUse(s,1),rxUse(ctx.get('alanate'),1)],warnings:['Both acyl carbons become primary alcohols after a separate hydrolytic work-up. Cyclic anhydrides give diols; borohydride alone is not accepted.']})];});
}
function rx6RuleAnhydrideFormation(ctx) {
  const p=ctx.get('carboxylate');if(!p||ctx.protic||ctx.has('strongAcid')||['hydroxide','alanate','ammonia','alkoxide','thiolate','cyanide','azide','grignard'].some(tag=>ctx.has(tag)))return [];
  const pi=rxAnalyze(p.graph);if(ctx.substrates.length!==1||p.ids.filter(id=>p.graph.getAtom(id).element==='O').length!==2||pi.carbonyls.length!==1||pi.carbonyls[0].kind!=='carboxylate'||p.ids.some(id=>!['C','O','H','D','F','Cl','Br','I'].includes(p.graph.getAtom(id).element)))return [];
  return ctx.substrates.flatMap(s=>{const cs=s.info.carbonyls;if(cs.length!==1||cs[0].kind!=='acylChloride'||!rx6Neutral(s.graph,['C','O','H','D','F','Cl','Br','I'])||s.graph.atoms.filter(x=>x.element==='O').length!==1)return [];const g=rxCloneGraph(s.graph);g.removeAtom(cs[0].hetero);const m=rxMerge(g,p.graph,p.ids);g.getAtom(m.get(p.atom)).charge=0;g.addBond(cs[0].c,m.get(p.atom));return [rx6Out('anhydride-formation','Acyl chloride + carboxylate to anhydride',g,s,{consumes:[rxUse(s,1),rxUse(p,1)],byproducts:['chloride salt'],warnings:['One acyl chloride and one monocarboxylate component are modeled in an aprotic medium; no competition with other nucleophiles is predicted.']})];});
}
function rx6CarbonPath(g,start,end) {const queue=[[start]],seen=new Set();while(queue.length){const p=queue.shift(),last=p[p.length-1];if(last===end)return p;if(seen.has(last))continue;seen.add(last);rxNeighbors(g,last).filter(n=>n.atom.element==='C'&&n.bond.order===1&&!seen.has(n.atom.id)).forEach(n=>queue.push(p.concat(n.atom.id)));}return null;}
function rx6RuleLactonization(ctx) {
  if(!ctx.has('strongAcid')||ctx.has('H2O')||ctx.has('hydroxide')||ctx.temperature<40)return [];
  return ctx.substrates.flatMap(s=>{const cs=s.info.carbonyls,oh=s.info.alcohols;if(cs.length!==1||cs[0].kind!=='acid'||oh.length!==1||oh[0].degree>2||!rx6Neutral(s.graph,['C','O','H','D','F','Cl','Br','I'])||s.graph.atoms.filter(a=>a.element==='O').length!==3||s.info.alkenes.length||s.info.alkynes.length)return [];const p=rx6CarbonPath(s.graph,cs[0].c,oh[0].c);if(!p||![4,5].includes(p.length)||s.graph.bonds.length!==s.graph.atoms.length-1)return [];const g=rxCloneGraph(s.graph);g.removeAtom(cs[0].hetero);g.addBond(cs[0].c,oh[0].o);return [rx6Out('hydroxy-acid-lactonization','Hydroxy acid to five/six-membered lactone',g,s,{byproducts:['H₂O'],warnings:['Acid-catalysed intramolecular esterification is reversible. A water-removing stage is assumed; concentration, equilibrium and competing oligomerization are not modeled.']})];});
}
function rx6RuleRosenmund(ctx) {
  if(!ctx.has('rosenmundCatalyst')||!ctx.has('H2')||ctx.protic||!ctx.conditions.solvents.includes('toluene'))return [];
  return ctx.substrates.flatMap(s=>{const cs=s.info.carbonyls;if(cs.length!==1||cs[0].kind!=='acylChloride'||rxCarbonNeighbors(s.graph,cs[0].c).length!==1||!rx6Neutral(s.graph,['C','O','Cl','H','D'])||s.graph.atoms.filter(a=>a.element==='O').length!==1||s.graph.atoms.filter(a=>a.element==='Cl').length!==1||s.info.alkenes.length||s.info.alkynes.length)return [];const g=rxCloneGraph(s.graph);g.removeAtom(cs[0].hetero);return [rx6Out('rosenmund-reduction','Rosenmund acyl chloride to aldehyde',g,s,{consumes:[rxUse(s,1),rxUse(ctx.get('H2'),1)],byproducts:['HCl'],warnings:['A dedicated Pd/BaSO₄ catalyst is required; ordinary Pd/C is not treated as selectively stopping at aldehyde. Only otherwise hydrocarbon acyl chlorides are encoded; catalyst poisoning and overreduction require review.']})];});
}
function rx6RulePeracidAldehyde(ctx) {
  if(!ctx.has('mcpba'))return [];
  return ctx.substrates.flatMap(s=>{const cs=s.info.carbonyls;if(cs.length!==1||cs[0].kind!=='aldehyde'||s.info.alkenes.length||s.info.alkynes.length||!rx6Neutral(s.graph,['C','O','H','D','F','Cl','Br','I'])||s.graph.atoms.filter(a=>a.element==='O').length!==1||rxNeighbors(s.graph,cs[0].c).some(n=>['H','D'].includes(n.atom.element)))return [];const g=rxCloneGraph(s.graph);rxAttach(g,'O',cs[0].c);return [rx6Out('peracid-aldehyde-oxidation','Peracid aldehyde to carboxylic acid',g,s,{consumes:[rxUse(s,1),rxUse(ctx.get('mcpba'),1)],byproducts:['m-chlorobenzoic acid'],warnings:['Hydrogen migration is modeled for a single otherwise hydrocarbon/halocarbon aldehyde. Explicit aldehydic H/D and competing oxidation sites are excluded; no isotope migration is invented.']})];});
}
const RX6_DEFINITIONS = [
 ['anhydride-hydrolysis','Acid anhydride hydrolysis',rx6RuleAnhydrideHydrolysis,'Hydrolysis','One neutral anhydride, acyclic or cyclic, water present; no additional oxygen groups.',RX6_SOURCES.anhydride],
 ['anhydride-alcoholysis','Anhydride alcohol/phenol acylation',rx6RuleAnhydrideAlcoholysis,'Acyl substitution','Symmetric acyclic anhydride and one alcohol/phenol partner with no other oxygen group except one carboxylic acid; acid or amine-base activation; no water/base hydrolysis.',RX6_SOURCES.anhydride],
 ['anhydride-aminolysis','Anhydride amide formation',rx6RuleAnhydrideAminolysis,'Acyl substitution','Symmetric acyclic anhydride plus one neutral primary/secondary monoamine or ammonia; no strong acid/water.',RX6_SOURCES.anhydride],
 ['anhydride-reduction','LiAlH₄ anhydride reduction',rx6RuleAnhydrideReduction,'Reduction','One anhydride in dry ether/THF, no C=C/C≡C, LiAlH₄ present.',RX6_SOURCES.anhydride],
 ['anhydride-formation','Acyl chloride/carboxylate anhydride formation',rx6RuleAnhydrideFormation,'Acyl substitution','One simple acyl chloride and a monocarboxylate, no protic medium or added strong acid/hydroxide/hydride.',RX6_SOURCES.anhydride],
 ['hydroxy-acid-lactonization','Gamma/delta hydroxy acid lactonization',rx6RuleLactonization,'Cyclization','Acyclic saturated monohydroxy monocarboxylic acid, five/six-membered closure, acid and at least 40 °C; no added water.',RX6_SOURCES.lactone],
 ['rosenmund-reduction','Rosenmund acyl chloride reduction',rx6RuleRosenmund,'Reduction','One acyl chloride on an otherwise hydrocarbon skeleton; H₂, dedicated Pd/BaSO₄ additive and toluene; no protic solvent.',RX6_SOURCES.rosenmund],
 ['peracid-aldehyde-oxidation','Peracid oxidation of aldehyde',rx6RulePeracidAldehyde,'Oxidation','Single aldehyde with implicit aldehydic H and no other oxygen, C=C/C≡C, N/S or charged group; mCPBA.',RX6_SOURCES.peracid],
];
RX6_DEFINITIONS.forEach(([id,name,run,family,scope,source])=>RX_RULES.push({id,name,run,catalog:{family,scope,assumptions:['Net isolated product structure is represented; reagent loading, equilibrium and conversion are not measured.'],limitations:['Only the stated functional-group subset is encoded; ambiguous regioselectivity, unsupported competitors and substrate-specific feasibility require review.'],references:[source]}}));
// Peracid epoxidation is favored over Baeyer–Villiger oxidation when the same
// substrate contains C=C. Leave those substrates to the dedicated epoxidation
// rule instead of also returning a contradictory ketone-insertion product.
const rx6BaeyerVilligerRule=RX_RULES.find(rule=>rule.id==='baeyer-villiger');
if(rx6BaeyerVilligerRule){
 const rx6BaeyerVilligerRun=rx6BaeyerVilligerRule.run;
 rx6BaeyerVilligerRule.run=function(ctx){
  if(!ctx.substrates.some(s=>s.info.alkenes.length))return rx6BaeyerVilligerRun(ctx);
  const selective=Object.create(ctx);
  selective.substrates=ctx.substrates.filter(s=>!s.info.alkenes.length);
  return rx6BaeyerVilligerRun(selective);
 };
}
