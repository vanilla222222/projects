// Each candidate is passed through the existing forward verifier. These are
// local reverse edits, not claims that the proposed route succeeds in a flask.
RETRO_TRANSFORMS.push(
  { id: 'alkyne-hydroboration-oxidation', name: 'Aldehyde from terminal alkyne', rule: 'alkyne-hydroboration-oxidation', group: 'Carbonyl',
    match(t) {
      return t.info.carbonyls.filter((c) => c.kind === 'aldehyde').slice(0, RETRO_LIMITS.maxPerTransform).flatMap((carbonyl) => {
        const alpha = rxCarbonNeighbors(t.graph, carbonyl.c).filter((n) => n.bond.order === 1 && rxHydrogens(t.graph, n.atom.id) >= 2);
        return alpha.map((n) => {
          const piece = retroSinglePiece(t, (g) => { g.removeAtom(carbonyl.o); return retroOrder(g, carbonyl.c, n.atom.id, 3); });
          return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [
            { smiles: RX5_SIA2BH, role: 'reagent', label: 'Sia2BH' },
            { smiles: 'OO', role: 'reagent', label: 'H2O2 work-up' },
          ], { solvents: ['thf'], additives: ['naoh'] });
        }).filter(Boolean);
      });
    } },
  { id: 'borane-acid-reduction', name: 'Primary alcohol from carboxylic acid (BH3)', rule: 'borane-acid-reduction', group: 'Reduction',
    match(t) {
      return t.info.alcohols.filter((a) => a.degree <= 1 && rxHydrogens(t.graph, a.c) >= 2).slice(0, RETRO_LIMITS.maxPerTransform).map((a) => {
        const piece = retroSinglePiece(t, (g) => { rxAttach(g, 'O', a.c, 2); });
        return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [{ smiles: 'B', role: 'reagent', label: 'BH3' }], { solvents: ['thf'] });
      }).filter(Boolean);
    } },
  { id: 'aryl-ether-demethylation', name: 'Phenol from aryl methyl ether (BBr3)', rule: 'aryl-ether-demethylation', group: 'Protecting groups',
    match(t) {
      return t.graph.atoms.filter((o) => {
        const n = rxNeighbors(t.graph, o.id);
        return o.element === 'O' && !o.charge && n.length === 1 && n[0].bond.order === 1 && t.aromatic.has(n[0].atom.id) && rxHydrogens(t.graph, o.id) === 1;
      }).slice(0, RETRO_LIMITS.maxPerTransform).map((o) => {
        const piece = retroSinglePiece(t, (g) => { rxAttach(g, 'C', o.id); });
        return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [{ smiles: 'BrB(Br)Br', role: 'reagent', label: 'BBr3' }], { solvents: ['dcm'], temperature: 0 });
      }).filter(Boolean);
    } }
);
