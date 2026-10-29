// Reverse cleavage, olefination and lactonization coverage. Every proposal is
// gated by exact forward replay before it can enter a route.
const RETRO20_REAGENTS = {
  ozone: { smiles: '[O-][O+]=O', role: 'reagent', label: 'O3' },
  dms: { smiles: 'CSC', role: 'reagent', label: 'Me2S' },
  periodate: { smiles: '[Na+].[O-][I+3]([O-])([O-])[O-]', role: 'reagent', label: 'NaIO4' },
  hydride: { smiles: '[Na+].[H-]', role: 'reagent', label: 'NaH' },
  carbonate: { smiles: '[Na+].[Na+].[O-]C([O-])=O', role: 'reagent', label: 'Na2CO3' },
  iodine: { smiles: 'II', role: 'reagent', label: 'I2' },
};

function retro20OxoPairs(t) {
  const carbonyls = t.info.carbonyls.filter((c) => c.kind === 'aldehyde' || c.kind === 'ketone');
  const pairs = [];
  carbonyls.forEach((a, i) => carbonyls.slice(i + 1).forEach((b) => {
    if (!t.graph.getBond(a.c, b.c)) pairs.push([a, b]);
  }));
  return pairs;
}

function retro20ClearAlkene(g, a, b) {
  g.alkeneSpecs = (g.alkeneSpecs || []).filter((s) => !((s.a === a && s.b === b) || (s.a === b && s.b === a)));
}

RETRO_TRANSFORMS.push(
  { id: 'ozonolysis', name: 'Two carbonyls from an alkene by oxidative cleavage', rule: 'ozonolysis', group: 'Oxidative cleavage', match(t) {
    const out = [], seen = new Set();
    retro20OxoPairs(t).forEach(([a, b]) => {
      const piece = retroSinglePiece(t, (g) => {
        g.removeAtom(a.o);
        g.removeAtom(b.o);
        const bond = g.addBond(a.c, b.c);
        if (!bond) return false;
        bond.order = 2;
      });
      if (!piece || seen.has(piece.smiles)) return;
      seen.add(piece.smiles);
      out.push(retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO20_REAGENTS.ozone, RETRO20_REAGENTS.dms],
        { solvents: ['dcm'], temperature: -78 }));
    });
    return out.slice(0, RETRO_LIMITS.maxPerTransform);
  } },
  { id: 'periodate', name: 'Two carbonyls from a vicinal diol by periodate cleavage', rule: 'periodate', group: 'Oxidative cleavage', match(t) {
    const out = [], seen = new Set();
    retro20OxoPairs(t).forEach(([a, b]) => {
      const piece = retroSinglePiece(t, (g) => {
        const bond = g.addBond(a.c, b.c);
        if (!bond) return false;
        bond.order = 1;
        rxSetOrder(g, a.c, a.o, 1);
        rxSetOrder(g, b.c, b.o, 1);
        rxsDrop(g, a.c);
        rxsDrop(g, b.c);
      });
      if (!piece || seen.has(piece.smiles)) return;
      seen.add(piece.smiles);
      out.push(retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO20_REAGENTS.periodate],
        { solvents: ['water'], temperature: 25 }));
    });
    return out.slice(0, RETRO_LIMITS.maxPerTransform);
  } },
  { id: 'hwe', name: 'E-alkene from a carbonyl and an activated phosphonate', rule: 'hwe', group: 'Carbon–carbon formation', match(t) {
    const g = t.graph, out = [], seen = new Set();
    const acceptors = new Set(t.info.carbonyls.filter((c) => ['ester', 'ketone', 'aldehyde', 'acid'].includes(c.kind)).map((c) => c.c).concat(t.info.nitriles.map((n) => n.c)));
    t.info.alkenes.forEach((e) => [[e.a, e.b], [e.b, e.a]].forEach(([active, carbonyl]) => {
      if (rxNeighbors(g, active).filter((n) => n.atom.id !== carbonyl).length !== 1 || rxNeighbors(g, carbonyl).filter((n) => n.atom.id !== active).length !== 1) return;
      if (!rxCarbonNeighbors(g, active).some((n) => acceptors.has(n.atom.id))) return;
      const pieces = retroEdit(t, (h) => {
        if (!retroCut(h, active, carbonyl)) return false;
        rxAttach(h, 'O', carbonyl, 2);
        const p = rxAttach(h, 'P', active);
        rxAttach(h, 'O', p.id, 2);
        for (let i = 0; i < 2; i++) {
          const o = rxAttach(h, 'O', p.id);
          const c = rxAttach(h, 'C', o.id);
          rxAttach(h, 'C', c.id);
        }
        retro20ClearAlkene(h, active, carbonyl);
      });
      if (!pieces || pieces.length !== 2) return;
      const phosphonate = pieces.find((p) => p.elements.has('P'));
      const oxo = pieces.find((p) => !p.elements.has('P'));
      if (!phosphonate || !oxo) return;
      const signature = [oxo.smiles, phosphonate.smiles].sort().join('|');
      if (seen.has(signature)) return;
      seen.add(signature);
      out.push(retroSpec([{ smiles: oxo.smiles, role: 'reactant' }, { smiles: phosphonate.smiles, role: 'reactant', label: 'Triethyl phosphonate donor' }],
        [RETRO20_REAGENTS.hydride], { solvents: ['thf'], temperature: 25, atmosphere: 'n2' }));
    }));
    return out.slice(0, RETRO_LIMITS.maxPerTransform);
  } },
  { id: 'halolactonization', name: 'Halomethyl lactone from an unsaturated carboxylic acid', rule: 'halolactonization', group: 'Ring formation', match(t) {
    const g = t.graph, out = [], seen = new Set();
    const rings = rxRings(g, 6).filter((ring) => ring.length === 5 || ring.length === 6);
    t.info.carbonyls.filter((c) => c.kind === 'ester').forEach((ester) => {
      rings.filter((ring) => ring.includes(ester.c) && ring.includes(ester.hetero)).forEach((ring) => {
        const near = rxCarbonNeighbors(g, ester.hetero).map((n) => n.atom.id).find((id) => id !== ester.c && ring.includes(id));
        if (!near) return;
        t.info.halides.filter((h) => ['Br', 'I'].includes(h.halogen) && !ring.includes(h.c) && g.getBond(near, h.c)).forEach((h) => {
          const piece = retroSinglePiece(t, (clone) => {
            const oxygenBond = clone.getBond(ester.hetero, near);
            if (!oxygenBond) return false;
            clone.removeBond(oxygenBond.id);
            clone.removeAtom(h.x);
            rxSetOrder(clone, near, h.c, 2);
            rxsDrop(clone, near);
            rxsDrop(clone, h.c);
            rxsDrop(clone, ester.hetero);
            retro20ClearAlkene(clone, near, h.c);
          });
          if (!piece || seen.has(piece.smiles)) return;
          seen.add(piece.smiles);
          const halogen = h.halogen === 'Br' ? RETRO_REAGENTS.bromine : RETRO20_REAGENTS.iodine;
          out.push(retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [halogen, RETRO20_REAGENTS.carbonate],
            { solvents: ['water'], temperature: 25 }));
        });
      });
    });
    return out.slice(0, RETRO_LIMITS.maxPerTransform);
  } }
);
