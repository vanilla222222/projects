// Additional bounded rules. Each source describes the chemical transformation;
// none experimentally validates the predicted outcome for an arbitrary query.
const RX4_SOURCES = {
  finkelstein: { title: 'Harding, UCLA: Finkelstein reaction', url: 'https://www.chem.ucla.edu/~harding/IGOC/F/finkelstein_reaction.html', kind: 'teaching' },
  sulfoxide: { title: 'Johnson and Keiser, Organic Syntheses: methyl phenyl sulfoxide (1966)', url: 'https://doi.org/10.15227/orgsyn.046.0078', kind: 'primary' },
  sulfone: { title: 'University of Calgary, sulfide oxidation', url: 'https://www.chem.ucalgary.ca/courses/353/Carey5th/Ch16/ch16-7-2.html', kind: 'teaching' },
  disulfide: { title: 'Zeynizadeh, iodine oxidative coupling of thiols in wet acetonitrile (2002)', url: 'https://doi.org/10.3184/030823402103170781', kind: 'primary' },
};

// Accept actual periodate ions as well as the existing NaIO4 additive.
RX_SPECIES_DETECTORS.push((g, ids) => {
  const iodine = ids.map((id) => g.getAtom(id)).find((a) => a.element === 'I');
  if (!iodine || ids.length !== 5) return null;
  const neighbors = rxNeighbors(g, iodine.id);
  return neighbors.length === 4 && neighbors.every((n) => n.atom.element === 'O' && rxNeighbors(g, n.atom.id).length === 1)
    ? { tag: 'periodate', atom: iodine.id } : null;
});

function rx4SimpleSulfur(g, oxygens) {
  // Exclude thiols, disulfides, sulfonamides, sulfonium ions and aromatic S.
  const aromatic = rxAromaticRings(g).atoms;
  return g.atoms.filter((a) => {
    if (a.element !== 'S' || a.charge || aromatic.has(a.id)) return false;
    const n = rxNeighbors(g, a.id);
    return n.length === 2 + oxygens && n.filter((x) => x.atom.element === 'C' && x.bond.order === 1).length === 2 &&
      n.filter((x) => x.atom.element === 'O' && !x.atom.charge && x.bond.order === 2 && rxNeighbors(g, x.atom.id).length === 1).length === oxygens;
  }).map((a) => a.id);
}

function rx4AccessibleHalide(s, halogen) {
  return s.info.halides.filter((h) => (!halogen || halogen.includes(h.halogen)) && h.degree <= 1 &&
    !rxCarbonNeighbors(s.graph, h.c).some((n) => rxCarbonNeighbors(s.graph, n.atom.id, h.c).length >= 3));
}

function rx4RuleFinkelstein(ctx) {
  const iodide = ctx.get('iodide');
  const cation = ctx.get('cation');
  const metal = cation && cation.graph && cation.graph.getAtom(cation.ids[0]);
  if (!iodide || !metal || !['Na', 'K'].includes(metal.element) || ctx.has('H2O') || !ctx.conditions.solvents.includes('acetone')) return [];
  return ctx.substrates.flatMap((s) => {
    const sites = rx4AccessibleHalide(s, ['Cl', 'Br']);
    if (sites.length !== 1 || s.info.halides.length !== 1) return [];
    const h = sites[0], g = rxCloneGraph(s.graph);
    const replacement = rxAttach(g, 'I', h.c);
    rxsReplace(g, h.c, h.x, replacement.id, true);
    g.removeAtom(h.x);
    return [rxOutcome('finkelstein', 'Finkelstein halide exchange', 'Substitution (SN2)', g,
      'Iodide replaces a methyl or accessible primary chloride/bromide. In acetone, precipitation of the alkali-metal chloride/bromide can favour exchange.',
      { score: 14, consumes: [rxUse(s, 1), rxUse(iodide, 1)], byproducts: ['alkali-metal ' + (h.halogen === 'Cl' ? 'chloride' : 'bromide')],
        warnings: ['Restricted to one methyl/primary halide site; secondary, tertiary, neopentyl, vinyl and aryl halides are outside this rule.'] })];
  });
}

function rx4RuleSulfideSulfoxide(ctx) {
  if (!ctx.has('periodate') || !ctx.has('H2O') || ctx.conditions.temperature > 5 || ctx.conditions.temperature < 0) return [];
  return ctx.substrates.flatMap((s) => {
    const sites = rx4SimpleSulfur(s.graph, 0);
    if (sites.length !== 1 || s.graph.atoms.filter((a) => a.element === 'S').length !== 1 || rxyDiols(s).length) return [];
    const g = rxCloneGraph(s.graph);
    rxAttach(g, 'O', sites[0], 2);
    return [rxOutcome('sulfide-sulfoxide', 'Periodate oxidation to sulfoxide', 'Sulfur oxidation', g,
      'Periodate transfers oxygen to a neutral thioether to give a sulfoxide. This model uses cold aqueous conditions and excludes substrates with a competing vicinal diol.',
      { score: 14, consumes: [rxUse(s, 1), rxUse(ctx.get('periodate'), 1)], byproducts: ['iodate'],
        warnings: ['Sulfur stereochemistry is unspecified; a nonsymmetric sulfide can give stereoisomeric sulfoxides. Control of overoxidation and conversion requires experimental review.'] })];
  });
}

function rx4RuleSulfoxideSulfone(ctx) {
  const oxidant = ctx.get('mcpba');
  if (!oxidant) return [];
  return ctx.substrates.flatMap((s) => {
    const sites = rx4SimpleSulfur(s.graph, 1);
    if (sites.length !== 1 || s.graph.atoms.filter((a) => a.element === 'S').length !== 1 || s.info.alkenes.length ||
      s.info.carbonyls.some((c) => c.kind === 'ketone') || s.graph.atoms.some((a) => a.element === 'N')) return [];
    const g = rxCloneGraph(s.graph);
    rxAttach(g, 'O', sites[0], 2);
    return [rxOutcome('sulfoxide-sulfone', 'Peracid oxidation to sulfone', 'Sulfur oxidation', g,
      'A peracid transfers a further oxygen atom to a sulfoxide, giving a sulfone. Competing alkene, ketone and nitrogen oxidation sites are excluded by this bounded rule.',
      { score: 14, consumes: [rxUse(s, 1), rxUse(oxidant, 1)], byproducts: ['m-chlorobenzoic acid'],
        warnings: ['This is the structural oxygen-transfer product; reagent loading, rate and substrate-specific compatibility are not experimentally validated.'] })];
  });
}

function rx4RuleThiolDisulfide(ctx) {
  const iodine = ctx.get('I2');
  if (!iodine || !ctx.has('H2O') || !ctx.conditions.solvents.includes('mecn') || ctx.substrates.length !== 1) return [];
  const s = ctx.substrates[0], sites = rxxThiols(s);
  if (sites.length !== 1 || s.graph.atoms.length * 2 > 60 || s.info.alkenes.length || s.info.alkynes.length ||
    s.graph.atoms.some((a) => !['C', 'H', 'D', 'S', 'F', 'Cl', 'Br', 'I'].includes(a.element)) ||
    s.graph.atoms.filter((a) => a.element === 'S').length !== 1) return [];
  const g = rxCloneGraph(s.graph), copy = rxMerge(g, s.graph, s.graph.atoms.map((a) => a.id));
  g.addBond(sites[0], copy.get(sites[0]));
  return [rxOutcome('thiol-disulfide', 'Iodine oxidation to symmetric disulfide', 'Oxidative coupling', g,
    'Two equivalents of a single monothiol couple at sulfur with iodine in wet acetonitrile. Only the symmetric disulfide is modeled.',
    { score: 14, consumes: [rxUse(s, 2), rxUse(iodine, 1)], byproducts: ['2 HI'],
      warnings: ['Mixed thiols and polyfunctional oxidation-sensitive substrates are outside this rule; mixed-disulfide selectivity is not assumed.'] })];
}

RX_RULES.push(
  { id: 'finkelstein', name: 'Finkelstein halide exchange', run: rx4RuleFinkelstein,
    catalog: { family: 'Substitution', scope: 'One methyl or accessible primary alkyl chloride/bromide with NaI/KI in acetone without added water.', assumptions: ['An alkali-metal iodide supplies iodide; insoluble salt formation is assumed.'], limitations: ['No secondary, tertiary, neopentyl, vinyl or aryl sites; no multisite prediction.'], references: [RX4_SOURCES.finkelstein] } },
  { id: 'sulfide-sulfoxide', name: 'Periodate thioether oxidation', run: rx4RuleSulfideSulfoxide,
    catalog: { family: 'Sulfur oxidation', scope: 'One neutral thioether site, aqueous periodate at 0–5 °C, no vicinal diol.', assumptions: ['Cold conditions limit overoxidation; the displayed S=O representation has unspecified sulfur geometry.'], limitations: ['Sulfur enantioselectivity, competing oxidations and reaction rates are not predicted.'], references: [RX4_SOURCES.sulfoxide] } },
  { id: 'sulfoxide-sulfone', name: 'Peracid sulfoxide oxidation', run: rx4RuleSulfoxideSulfone,
    catalog: { family: 'Sulfur oxidation', scope: 'One neutral S=O sulfoxide with mCPBA and no competing alkene, ketone or nitrogen sites.', assumptions: ['A second oxygen is transferred to sulfur.'], limitations: ['Charge-separated S+–O− input and substrate-specific reagent compatibility require review.'], references: [RX4_SOURCES.sulfone] } },
  { id: 'thiol-disulfide', name: 'Iodine oxidative thiol coupling', run: rx4RuleThiolDisulfide,
    catalog: { family: 'Oxidative coupling', scope: 'One simple neutral monothiol substrate with iodine in wet acetonitrile; product at most 60 heavy atoms.', assumptions: ['Two identical thiol molecules supply the symmetric disulfide.'], limitations: ['No mixed thiols, dithiols, alkene/alkyne substrates or oxygen/nitrogen functionality.'], references: [RX4_SOURCES.disulfide] } }
);
