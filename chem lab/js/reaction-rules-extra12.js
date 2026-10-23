// Intramolecular amide coupling, distinct from the separate-partner amide rule.
function rx12Lactamization(ctx) {
  if (!ctx.has('carbodiimide') || ctx.protic || ctx.has('H2O') || ctx.has('strongAcid') ||
      ctx.has('hydroxide') || ctx.substrates.length !== 1 || ctx.temperature < 0 || ctx.temperature > 40 ||
      !ctx.conditions.solvents.some(s => ['dmf', 'dcm'].includes(s))) return [];
  const s = ctx.substrates[0], g = s.graph, acids = s.info.carbonyls.filter(c => c.kind === 'acid');
  if (acids.length !== 1 || s.info.carbonyls.length !== 1 || s.info.amines.length !== 1 ||
      g.atoms.some(a => a.charge || !['C','N','O','H','D'].includes(a.element)) ||
      g.atoms.filter(a => a.element === 'O').length !== 2 || g.atoms.filter(a => a.element === 'N').length !== 1 ||
      s.info.alkenes.length || s.info.alkynes.length || g.bonds.length !== g.atoms.length - 1) return [];
  const acid = acids[0], amine = s.info.amines[0], size = rxPathLength(g, acid.c, amine.n) + 1;
  if (![5,6].includes(size)) return [];
  // Activated alpha-stereocentres can epimerize; no retention is assumed here.
  const alpha = new Set(rxCarbonNeighbors(g, acid.c).map(n => n.atom.id));
  if (findStereocenters(g, g.atoms.map(a => a.id)).some(c => alpha.has(c.atomId))) return [];
  const product = rxCloneGraph(g); product.removeAtom(acid.hetero); product.addBond(acid.c, amine.n, 1);
  return [rxOutcome('amino-acid-lactamization', 'Carbodiimide amino-acid lactamization', 'Cyclization', product,
    'Carbodiimide activation of the acid permits intramolecular attack by the amine, closing a ' + size + '-membered lactam.',
    { score: 14, consumes: [rxUse(s, 1), rxUse(ctx.get('carbodiimide'), 1)], byproducts: ['carbodiimide-derived urea'],
      warnings: ['Dilution favoring cyclization is assumed. Oligomerization, N-acylurea formation, rate and conversion are not predicted.',
        'Only one neutral saturated acyclic amino acid giving a five/six-membered lactam is encoded; specified alpha-stereocentres and additional reactive groups are excluded.'] })];
}
RX_RULES.push({ id: 'amino-acid-lactamization', name: 'Carbodiimide amino-acid lactamization', run: rx12Lactamization,
  catalog: { family: 'Cyclization', scope: 'One neutral saturated acyclic monoamino monocarboxylic acid with no extra heteroatom functions or specified acid-alpha stereocentre; five/six-membered closure with carbodiimide in DMF/DCM at 0–40 °C, no added water or strong acid/base.',
    assumptions: ['Dilute intramolecular capture of an activated acid is modeled as a net amide-forming graph edit; reagent-specific conversion is not established.'],
    limitations: ['No macrocyclization, peptide folding, competing sites, racemization prediction, concentration model or yield. The primary paper supports the carbodiimide/lactamization class using an immobilized reagent, not every free DCC/EDC substrate represented here.'],
    references: [{ title: 'Dankers et al., Immobilized Carbodiimide Assisted Flow Combinatorial Protocol to Facilitate Amide Coupling and Lactamization (2020)', url: 'https://doi.org/10.1021/acscombsci.0c00001', kind: 'primary' },
      { title: 'McMurry, OpenStax Organic Chemistry 21.7: Chemistry of Amides', url: 'https://openstax.org/books/organic-chemistry/pages/21-7-chemistry-of-amides', kind: 'teaching' }] } });
