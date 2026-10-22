// Coverage gaps identified after the 102-rule audit: terminal alkyne -> aldehyde,
// BH3 reduction of an acid, and cleavage of an aryl methyl ether with BBr3.
// These are deliberately narrow structural models, not experimental findings.
const RX5_SIA2BH = 'B(C(C)C(C)C)C(C)C(C)C';
const RX5_SOURCES = {
  alkyne: { title: 'McMurry, Organic Chemistry (OpenStax), 9.4: hydration of alkynes', url: 'https://openstax.org/books/organic-chemistry/pages/9-4-hydration-of-alkynes', kind: 'teaching' },
  acid: { title: 'McMurry, Organic Chemistry (OpenStax), 21.3: carboxylic acid reduction with BH3/THF', url: 'https://openstax.org/books/organic-chemistry/pages/21-3-reactions-of-carboxylic-acids', kind: 'teaching' },
  ether: { title: 'McOmie and West, Organic Syntheses 49, 50 (1969): aryl methyl ether cleavage', url: 'https://doi.org/10.15227/orgsyn.049.0050', kind: 'primary' },
};

RX_SPECIES_DETECTORS.push((g, ids) => {
  const atoms = ids.map((id) => g.getAtom(id));
  if (atoms.some((a) => a.charge)) return null;
  const borons = atoms.filter((a) => a.element === 'B');
  if (borons.length !== 1) return null;
  const b = borons[0], neighbors = rxNeighbors(g, b.id);
  if (ids.length === 4 && neighbors.length === 3 && neighbors.every((n) => n.atom.element === 'Br' && n.bond.order === 1 && rxNeighbors(g, n.atom.id).length === 1)) return { tag: 'bbr3', atom: b.id };
  // Sia2BH has two B-CH(CH3)-CH(CH3)2 arms. Formula alone cannot distinguish
  // it from differently branched dialkylboranes with different selectivity.
  const methyl = (id) => g.getAtom(id).element === 'C' && rxNeighbors(g, id).length === 1 && rxHydrogens(g, id) === 3;
  const arm = (n) => {
    if (n.atom.element !== 'C' || n.bond.order !== 1 || rxHydrogens(g, n.atom.id) !== 1) return false;
    const next = rxNeighbors(g, n.atom.id).filter((x) => x.atom.id !== b.id);
    if (next.length !== 2 || next.some((x) => x.bond.order !== 1 || x.atom.element !== 'C')) return false;
    const distal = next.find((x) => !methyl(x.atom.id));
    return next.filter((x) => methyl(x.atom.id)).length === 1 && !!distal && rxHydrogens(g, distal.atom.id) === 1 &&
      rxNeighbors(g, distal.atom.id).filter((x) => x.atom.id !== n.atom.id).length === 2 &&
      rxNeighbors(g, distal.atom.id).filter((x) => x.atom.id !== n.atom.id).every((x) => x.bond.order === 1 && methyl(x.atom.id));
  };
  return ids.length === 11 && atoms.every((a) => ['B', 'C'].includes(a.element)) && neighbors.length === 2 && neighbors.every(arm)
    ? { tag: 'sia2bh', atom: b.id } : null;
});

function rx5SimpleSkeleton(g, allowed) {
  return g.atoms.every((a) => !a.charge && allowed.includes(a.element));
}

function rx5TerminalAlkyneSites(s) {
  return s.info.alkynes.map((e) => {
    const ends = [e.a, e.b];
    const terminal = ends.filter((id) => rxHydrogens(s.graph, id) === 1 && rxNeighbors(s.graph, id).length === 1);
    return terminal.length === 1 ? { terminal: terminal[0], inner: ends.find((id) => id !== terminal[0]) } : null;
  }).filter(Boolean);
}

function rx5RuleAlkyneHydroboration(ctx) {
  if (!ctx.has('sia2bh') || !ctx.has('hydrogenPeroxide') || !ctx.has('hydroxide') || !ctx.conditions.solvents.includes('thf')) return [];
  return ctx.substrates.flatMap((s) => {
    const sites = rx5TerminalAlkyneSites(s);
    if (sites.length !== 1 || s.info.alkynes.length !== 1 || s.info.alkenes.length || !rx5SimpleSkeleton(s.graph, ['C', 'H', 'D', 'F', 'Cl', 'Br', 'I'])) return [];
    const site = sites[0], g = rxCloneGraph(s.graph);
    rxSetOrder(g, site.terminal, site.inner, 1);
    rxAttach(g, 'O', site.terminal, 2);
    return [rxOutcome('alkyne-hydroboration-oxidation', 'Terminal alkyne hydroboration–oxidation', 'Addition and tautomerization', g,
      'The bulky dialkylborane directs the net hydration toward the terminal carbon. Oxidative work-up gives an enol, represented here after tautomerization as the aldehyde.',
      { score: 14, consumes: [rxUse(s, 1), rxUse(ctx.get('sia2bh'), 1), rxUse(ctx.get('hydrogenPeroxide'), 1)], warnings: [
        'Hydroboration followed by peroxide/base work-up is assumed to be sequential, not simultaneous reagent addition.',
        'Only one terminal alkyne on a hydrocarbon/halocarbon skeleton is modeled; no internal-alkyne regioselectivity or competing alkene addition is predicted.',
      ] })];
  });
}

function rx5RuleBoraneAcidReduction(ctx) {
  if (!ctx.has('borane') || !ctx.conditions.solvents.includes('thf') || ctx.protic || ctx.has('hydrogenPeroxide') || ctx.has('strongAcid')) return [];
  return ctx.substrates.flatMap((s) => {
    const acids = s.info.carbonyls.filter((c) => c.kind === 'acid');
    if (acids.length !== 1 || s.info.carbonyls.length !== 1 || s.info.alkenes.length || s.info.alkynes.length ||
      !rx5SimpleSkeleton(s.graph, ['C', 'H', 'D', 'O', 'F', 'Cl', 'Br', 'I'])) return [];
    const acid = acids[0];
    if (s.graph.atoms.some((a) => a.element === 'O' && a.id !== acid.hetero &&
      (rxHydrogens(s.graph, a.id) || rxNeighbors(s.graph, a.id).some((n) => n.atom.element === 'O')))) return [];
    const g = rxCloneGraph(s.graph);
    g.removeAtom(acid.o);
    return [rxOutcome('borane-acid-reduction', 'BH3 reduction of carboxylic acid', 'Reduction', g,
      'BH3/THF reduces the selected neutral carboxylic acid to the primary alcohol. The free alcohol shown assumes the subsequent hydrolytic work-up.',
      { score: 14, consumes: [rxUse(s, 1), rxUse(ctx.get('borane'), 1)], warnings: [
        'The free alcohol is the net product after work-up; boron-bound intermediates and reagent demand are not simulated.',
        'This rule excludes extra carbonyls, alkenes/alkynes, free hydroxyl groups and nitrogen/sulfur sites rather than asserting general chemoselectivity.',
      ] })];
  });
}

function rx5ArylMethoxySites(g) {
  const aromatic = rxAromaticRings(g).atoms;
  return g.atoms.filter((a) => a.element === 'O' && !a.charge).flatMap((o) => {
    const n = rxNeighbors(g, o.id);
    if (n.length !== 2 || !n.every((x) => x.atom.element === 'C' && x.bond.order === 1)) return [];
    const aryl = n.find((x) => aromatic.has(x.atom.id));
    const methyl = n.find((x) => !aromatic.has(x.atom.id) && rxHydrogens(g, x.atom.id) === 3 && rxNeighbors(g, x.atom.id).length === 1);
    return aryl && methyl ? [{ o: o.id, aryl: aryl.atom.id, methyl: methyl.atom.id }] : [];
  });
}

function rx5RuleArylDemethylation(ctx) {
  if (!ctx.has('bbr3') || ctx.protic || !ctx.conditions.solvents.includes('dcm') || ctx.temperature < -80 || ctx.temperature > 25) return [];
  return ctx.substrates.flatMap((s) => {
    const sites = rx5ArylMethoxySites(s.graph);
    if (sites.length !== 1 || s.graph.atoms.filter((a) => a.element === 'O').length !== 1 || s.info.alkenes.length || s.info.alkynes.length ||
      !rx5SimpleSkeleton(s.graph, ['C', 'H', 'D', 'O', 'F', 'Cl', 'Br', 'I'])) return [];
    const g = rxCloneGraph(s.graph);
    g.removeAtom(sites[0].methyl);
    return [rxOutcome('aryl-ether-demethylation', 'BBr3 cleavage of aryl methyl ether', 'Ether cleavage', g,
      'BBr3 activates the aryl methyl ether and cleavage removes the methyl group. The phenol shown is the net product after hydrolysis of the boron-bound intermediate.',
      { score: 14, consumes: [rxUse(s, 1), rxUse(ctx.get('bbr3'), 1)], warnings: [
        'A dry ether-cleavage stage followed by a separate hydrolytic work-up is assumed.',
        'Only one aryl methyl ether on an otherwise hydrocarbon/halocarbon skeleton is modeled; diaryl ethers, ethyl ethers and multisite cleavage are excluded.',
      ] })];
  });
}

RX_RULES.push(
  { id: 'alkyne-hydroboration-oxidation', name: 'Terminal alkyne to aldehyde (Sia2BH)', run: rx5RuleAlkyneHydroboration,
    catalog: { family: 'Addition', scope: 'Exactly one terminal C≡C and no alkene on a neutral hydrocarbon/halocarbon skeleton; Sia2BH, explicit peroxide and hydroxide work-up, THF.', assumptions: ['Hydroboration and oxidative work-up occur sequentially; the aldehyde tautomer is the endpoint.'], limitations: ['No acetylene, internal/multiple alkynes, competing C=C or heteroatom-rich substrates; rates and regioselectivity outside this subset are not modeled.'], references: [RX5_SOURCES.alkyne] } },
  { id: 'borane-acid-reduction', name: 'BH3/THF carboxylic acid reduction', run: rx5RuleBoraneAcidReduction,
    catalog: { family: 'Reduction', scope: 'One neutral carboxylic acid in THF, without added protic solvent, peroxide or strong acid; no other carbonyl, C=C/C≡C, free OH, nitrogen or sulfur site.', assumptions: ['The isolated endpoint is the primary alcohol after a separate hydrolytic work-up.'], limitations: ['This is a conservative subset of BH3 chemistry, not a general selectivity claim; boron speciation and reagent loading are not simulated.'], references: [RX5_SOURCES.acid] } },
  { id: 'aryl-ether-demethylation', name: 'BBr3 aryl methyl ether cleavage', run: rx5RuleArylDemethylation,
    catalog: { family: 'Protecting groups', scope: 'One aryl O–CH3 group and no other oxygen functionality on a neutral hydrocarbon/halocarbon skeleton; BBr3 in DCM, -80 to 25 °C, no added protic solvent.', assumptions: ['Dry cleavage precedes hydrolysis; the reported endpoint is the free phenol.'], limitations: ['No diaryl/ethyl ethers, multiple methoxy groups, C=C/C≡C or heteroatom-rich substrates; no work-up or conversion model.'], references: [RX5_SOURCES.ether] } }
);
