// These disconnections are candidates only; the existing retrosynthesis engine
// forward-checks every precursor set with the corresponding registered rule.
RETRO_TRANSFORMS.push(
  { id: 'finkelstein', name: 'Alkyl iodide by Finkelstein exchange', rule: 'finkelstein', group: 'Halides',
    match(t) {
      return rx4AccessibleHalide({ graph: t.graph, info: t.info }, ['I']).slice(0, RETRO_LIMITS.maxPerTransform).map((site) => {
        const p = retroSinglePiece(t, (g) => { g.getAtom(site.x).element = 'Br'; });
        return p && retroSpec([{ smiles: p.smiles, role: 'reactant' }], [{ smiles: '[Na+].[I-]', role: 'reagent', label: 'NaI' }], { solvents: ['acetone'] });
      }).filter(Boolean);
    } },
  { id: 'sulfide-sulfoxide', name: 'Sulfoxide from thioether', rule: 'sulfide-sulfoxide', group: 'Sulfur',
    match(t) {
      return rx4SimpleSulfur(t.graph, 1).slice(0, RETRO_LIMITS.maxPerTransform).map((s) => {
        const oxygen = rxNeighbors(t.graph, s).find((n) => n.atom.element === 'O');
        const p = retroSinglePiece(t, (g) => { g.removeAtom(oxygen.atom.id); });
        return p && retroSpec([{ smiles: p.smiles, role: 'reactant' }], [], { additives: ['naio4'], solvents: ['methanol', 'water'], temperature: 0 });
      }).filter(Boolean);
    } },
  { id: 'sulfoxide-sulfone', name: 'Sulfone from sulfoxide', rule: 'sulfoxide-sulfone', group: 'Sulfur',
    match(t) {
      return rx4SimpleSulfur(t.graph, 2).slice(0, RETRO_LIMITS.maxPerTransform).map((s) => {
        const oxygen = rxNeighbors(t.graph, s).find((n) => n.atom.element === 'O');
        const p = retroSinglePiece(t, (g) => { g.removeAtom(oxygen.atom.id); });
        return p && retroSpec([{ smiles: p.smiles, role: 'reactant' }], [{ smiles: 'OOC(=O)c1cccc(Cl)c1', role: 'reagent', label: 'mCPBA' }], { solvents: ['dcm'] });
      }).filter(Boolean);
    } },
  { id: 'thiol-disulfide', name: 'Symmetric disulfide from monothiol', rule: 'thiol-disulfide', group: 'Sulfur',
    match(t) {
      const bonds = rxzDisulfideBonds(t.graph);
      if (bonds.length !== 1) return [];
      const b = bonds[0];
      const pieces = retroEdit(t, (g) => retroCut(g, b.atomA, b.atomB));
      if (!pieces || pieces.length !== 2 || pieces[0].smiles !== pieces[1].smiles) return [];
      return [retroSpec([{ smiles: pieces[0].smiles, role: 'reactant' }], [{ smiles: 'II', role: 'reagent', label: 'I2' }], { solvents: ['mecn', 'water'] })];
    } }
);
