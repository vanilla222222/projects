// Intramolecular substitutions are distinct from the two-substrate Williamson
// rule. Restrict this graph edit to unambiguous five/six-membered ether closure.
function rx8RuleCyclicEther(ctx) {
  if (!ctx.has('hydride') || ctx.protic || ctx.has('strongAcid') ||
      !ctx.conditions.solvents.some((s) => ['thf', 'dmf'].includes(s))) return [];
  return ctx.substrates.flatMap((s) => {
    const g = s.graph;
    if (s.info.alcohols.length !== 1 || s.info.halides.length !== 1 ||
        g.atoms.filter((a) => a.element === 'O').length !== 1 ||
        g.atoms.filter((a) => ['Cl', 'Br', 'I'].includes(a.element)).length !== 1 ||
        g.atoms.some((a) => a.charge || !['C', 'O', 'H', 'D', 'Cl', 'Br', 'I'].includes(a.element)) ||
        g.bonds.some((b) => b.order !== 1) || g.bonds.length !== g.atoms.length - 1) return [];
    const alcohol = s.info.alcohols[0], halide = s.info.halides[0];
    const ringSize = rxPathLength(g, alcohol.o, halide.c) + 1;
    if (![5, 6].includes(ringSize) || halide.degree !== 1 || rxHydrogens(g, halide.c) < 2 ||
        rxCarbonNeighbors(g, halide.c).some((n) => rxCarbonNeighbors(g, n.atom.id).length >= 4)) return [];
    // Explicit O-H/D replacement would require tracking the departing isotope.
    if (rxNeighbors(g, alcohol.o).some((n) => ['H', 'D'].includes(n.atom.element))) return [];
    const product = rxCloneGraph(g);
    product.removeAtom(halide.x);
    product.addBond(alcohol.o, halide.c, 1);
    return [rxOutcome('intramolecular-williamson', 'Intramolecular Williamson ether cyclization', 'Ring formation', product,
      'Hydride base generates the alkoxide, which displaces the tethered primary halide to close a ' + ringSize + '-membered cyclic ether.',
      { score: 14, consumes: [rxUse(s, 1), rxUse(ctx.get('hydride'), 1)], byproducts: ['H2', 'metal halide'], warnings: [
        'Dilution and conditions favoring intramolecular substitution are assumed; intermolecular oligomerization, conversion and yield are not calculated.',
        'Only acyclic monohalo monohydroxyl substrates closing five- or six-membered rings at a primary, non-neopentyl carbon are modeled.',
      ] })];
  });
}

RX_RULES.push({ id: 'intramolecular-williamson', name: 'Intramolecular Williamson cyclic ethers', run: rx8RuleCyclicEther,
  catalog: { family: 'Ring formation', scope: 'One neutral acyclic saturated haloalcohol with a primary non-neopentyl Cl/Br/I site, exactly one OH and one halogen, giving a five- or six-membered ether; hydride base in THF or DMF without protic solvent or strong acid.',
    assumptions: ['Dilution favors ring closure over intermolecular substitution; hydride deprotonation precedes the intramolecular SN2 step.'],
    limitations: ['No three/four/seven-membered or larger closure, fused/bridged substrates, secondary/tertiary electrophiles, extra heteroatoms or explicit O-H/D isotopes; no concentration, rate, yield or oligomerization model.'],
    references: [{ title: 'Illinois State University, Organic Chemistry 230 Chapter 9 review: cyclic ethers via Williamson synthesis and ring-closure rates', url: 'https://bpb-us-e2.wpmucdn.com/about.illinoisstate.edu/dist/3/399/files/2023/04/230_C9_Rev.pdf', kind: 'teaching' },
      { title: 'McMurry, OpenStax Organic Chemistry, 18.2: Preparing Ethers', url: 'https://openstax.org/books/organic-chemistry/pages/18-2-preparing-ethers', kind: 'teaching' }] } });
