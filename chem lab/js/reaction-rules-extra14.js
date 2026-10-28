// Carbonyl coupling and oxidation methods added with matching reverse transforms.
// Each rule is deliberately bounded; reverse candidates still require exact
// forward replay before Path Finder or the retrosynthesis view can expose them.
const RX14_SOURCES = {
  benzil: { title: 'Organic Syntheses 6,6: oxidation of benzoin to benzil (1926)', url: 'https://doi.org/10.15227/orgsyn.006.0006', kind: 'primary' },
  henry: { title: 'Luzzio, The Henry reaction: recent examples (2001)', url: 'https://doi.org/10.1016/S0040-4020(00)00965-0', kind: 'review' },
};

function rx14Simple(g, elements) {
  return g.atoms.every((a) => !a.charge && elements.includes(a.element));
}

function rx14AlphaHydroxyKetone(s) {
  const g = s.graph;
  if (s.info.carbonyls.length !== 1 || s.info.carbonyls[0].kind !== 'ketone' ||
      s.info.alcohols.length !== 1 || g.atoms.filter((a) => a.element === 'O').length !== 2 ||
      !rx14Simple(g, ['C', 'H', 'D', 'O']) || s.info.alkenes.length || s.info.alkynes.length) return null;
  const c = s.info.carbonyls[0], a = s.info.alcohols[0], bond = g.getBond(c.c, a.c);
  if (!bond || bond.order !== 1 || a.degree > 2) return null;
  return { c, a };
}

function rx14RuleBenzoinOxidation(ctx) {
  if (!ctx.has('nitricAcid') || ctx.has('hydroxide') || ctx.temperature < 60 || ctx.temperature > 120 ||
      !ctx.conditions.solvents.some((x) => ['water', 'acoh'].includes(x))) return [];
  return ctx.substrates.flatMap((s) => {
    const hit = rx14AlphaHydroxyKetone(s);
    if (!hit) return [];
    const g = rxCloneGraph(s.graph);
    rxSetOrder(g, hit.a.c, hit.a.o, 2);
    rxsDrop(g, hit.a.c);
    return [rxOutcome('benzoin-oxidation', 'Benzoin oxidation to an alpha-diketone', 'Oxidation', g,
      'The secondary alcohol beside the ketone is oxidized to a second carbonyl, giving the adjacent alpha-diketone.',
      { score: 16, consumes: [rxUse(s, 1), rxUse(ctx.get('nitricAcid'), 1)], byproducts: ['nitrogen oxides', 'water'],
        warnings: ['Only one otherwise simple alpha-hydroxy ketone is modeled. Nitric-acid oxidation is represented as a net endpoint; ring nitration, over-oxidation, conversion and work-up are not predicted.'] })];
  });
}

function rx14Nitroalkane(s) {
  const g = s.graph, nitro = rxyNitro(s);
  if (nitro.length !== 1 || g.atoms.filter((a) => a.element === 'N').length !== 1 ||
      g.atoms.filter((a) => a.element === 'O').length !== 2 || s.info.carbonyls.length || s.info.alcohols.length ||
      s.info.alkenes.length || s.info.alkynes.length || s.info.aromatic.atoms.size ||
      !rx14Simple(g, ['C', 'H', 'D', 'N', 'O'])) return null;
  const c = g.getAtom(nitro[0].c);
  if (!c || !rxIsSp3(g, c.id) || rxHydrogens(g, c.id) < 1 || rxCarbonNeighbors(g, c.id).length > 2) return null;
  return { nitro: nitro[0], c: c.id };
}

function rx14HenryCarbonyl(s) {
  const g = s.graph;
  if (s.info.carbonyls.length !== 1 || !['aldehyde', 'ketone'].includes(s.info.carbonyls[0].kind) ||
      g.atoms.filter((a) => a.element === 'O').length !== 1 || !rx14Simple(g, ['C', 'H', 'D', 'O']) ||
      s.info.alkenes.length || s.info.alkynes.length) return null;
  return s.info.carbonyls[0];
}

function rx14RuleHenry(ctx) {
  const base = ctx.has('amineBase') || ctx.has('alkoxide') || ctx.has('hydroxide');
  if (!base || ctx.has('strongAcid') || ctx.temperature < 0 || ctx.temperature > 40 || ctx.substrates.length !== 2 ||
      !ctx.conditions.solvents.some((x) => ['none', 'ethanol', 'methanol', 'thf'].includes(x))) return [];
  const nitro = ctx.substrates.map((s) => ({ s, hit: rx14Nitroalkane(s) })).filter((x) => x.hit);
  const carbonyl = ctx.substrates.map((s) => ({ s, hit: rx14HenryCarbonyl(s) })).filter((x) => x.hit);
  if (nitro.length !== 1 || carbonyl.length !== 1 || nitro[0].s === carbonyl[0].s) return [];
  const a = carbonyl[0], b = nitro[0], g = rxCloneGraph(a.s.graph);
  const map = rxMerge(g, b.s.graph, b.s.graph.atoms.map((x) => x.id));
  rxSetOrder(g, a.hit.c, a.hit.o, 1);
  g.addBond(a.hit.c, map.get(b.hit.c));
  rxsDrop(g, a.hit.c);
  rxsDrop(g, map.get(b.hit.c));
  return [rxOutcome('henry', 'Henry nitroaldol reaction', 'Carbon–carbon formation', g,
    'Base forms the nitroalkane nitronate, which adds to the carbonyl carbon. Protonation gives the beta-nitro alcohol.',
    { score: 16, consumes: [rxUse(a.s, 1), rxUse(b.s, 1)],
      warnings: ['Only one simple aldehyde/ketone and one otherwise unfunctionalized alpha-H nitroalkane are modeled. New stereocentres are unspecified; diastereoselectivity, enantioselectivity, retro-Henry reaction and dehydration are not predicted.'] })];
}

[
  ['benzoin-oxidation', 'Benzoin oxidation to an alpha-diketone', rx14RuleBenzoinOxidation, 'Oxidation',
    'One simple alpha-hydroxy ketone with no other oxygen or C=C/C≡C functionality; nitric acid in water or acetic acid at 60–120 °C.', RX14_SOURCES.benzil],
  ['henry', 'Henry nitroaldol reaction', rx14RuleHenry, 'Carbon–carbon formation',
    'One simple aldehyde/ketone plus one alpha-H nitroalkane without other functionality; amine/alkoxide/hydroxide base at 0–40 °C in the stated solvents.', RX14_SOURCES.henry],
].forEach(([id, name, run, family, scope, reference]) => RX_RULES.push({ id, name, run,
  catalog: { family, scope,
    assumptions: ['The displayed product is a net structural endpoint after proton transfer/work-up; catalysis and intermediate speciation are not explicitly simulated.'],
    limitations: ['The encoded substrate bounds do not establish experimental feasibility, conversion, yield or selectivity for a particular pair.'],
    references: [reference] } }));
