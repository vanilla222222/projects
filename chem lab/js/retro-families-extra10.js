// Reverse coverage for established forward additions and oxidations. Every
// proposed precursor set still has to reproduce the exact target in retroTryVerify.
const RETRO15_REAGENTS = {
  co2: { smiles: 'O=C=O', role: 'reactant', label: 'Carbon dioxide' },
  sodamide: { smiles: '[Na+].[NH2-]', role: 'reagent', label: 'NaNH2' },
};

RETRO_TRANSFORMS.push(
  { id: 'grignard-carboxylation', name: 'Carboxylic acid from Grignard reagent and carbon dioxide', rule: 'grignard-carboxylation', group: 'Carbon–carbon formation', match(t) {
    const g = t.graph;
    return t.info.carbonyls.filter((c) => c.kind === 'acid').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => {
      const neighbors = rxCarbonNeighbors(g, c.c);
      if (neighbors.length !== 1) return null;
      const r = neighbors[0].atom.id;
      const piece = retroSinglePiece(t, (h) => {
        h.removeAtom(c.o);
        h.removeAtom(c.hetero);
        h.removeAtom(c.c);
        const mg = rxAttach(h, 'Mg', r);
        rxAttach(h, 'Br', mg.id);
      });
      return piece && retroSpec([RETRO15_REAGENTS.co2,
        { smiles: piece.smiles, role: 'reagent', label: retroGrignardLabel(piece.smiles) }], [], { solvents: ['ether'] });
    }).filter(Boolean);
  } },
  { id: 'acetylide-addition', name: 'Propargylic alcohol from carbonyl and terminal alkyne', rule: 'acetylide-addition', group: 'Carbon–carbon formation', match(t) {
    const g = t.graph, alkyneCarbons = new Set(t.info.alkynes.flatMap((e) => [e.a, e.b]));
    return t.info.alcohols.slice(0, RETRO_LIMITS.maxPerTransform).flatMap((a) =>
      rxCarbonNeighbors(g, a.c).filter((n) => alkyneCarbons.has(n.atom.id)).map((n) => {
        const pieces = retroEdit(t, (h) => {
          if (!retroCut(h, a.c, n.atom.id)) return false;
          rxSetOrder(h, a.c, a.o, 2);
          rxsDrop(h, a.c);
        });
        return pieces && pieces.length === 2 ? retroSpec(retroReactants(pieces), [RETRO15_REAGENTS.sodamide], { solvents: ['thf'] }) : null;
      })).filter(Boolean);
  } },
  { id: 'alkyne-hydration', name: 'Ketone from alkyne by Markovnikov hydration', rule: 'alkyne-hydration', group: 'Electrophilic addition', match(t) {
    const g = t.graph;
    return t.info.carbonyls.filter((c) => c.kind === 'ketone').slice(0, RETRO_LIMITS.maxPerTransform).flatMap((c) =>
      rxCarbonNeighbors(g, c.c).map((n) => {
        const piece = retroSinglePiece(t, (h) => {
          h.removeAtom(c.o);
          rxSetOrder(h, c.c, n.atom.id, 3);
        });
        return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO_REAGENTS.water],
          { additives: ['h2so4', 'hgso4'], solvents: ['water'] });
      })).filter(Boolean);
  } },
  { id: 'halohydrin', name: 'Halohydrin from alkene, halogen and water', rule: 'halohydrin', group: 'Electrophilic addition', match(t) {
    const g = t.graph;
    return t.info.alcohols.slice(0, RETRO_LIMITS.maxPerTransform).flatMap((a) =>
      t.info.halides.filter((h) => ['Cl', 'Br'].includes(h.halogen) && g.getBond(a.c, h.c) && g.getBond(a.c, h.c).order === 1).map((h) => {
        const piece = retroSinglePiece(t, (clone) => {
          clone.removeAtom(a.o);
          clone.removeAtom(h.x);
          rxSetOrder(clone, a.c, h.c, 2);
          clone.alkeneSpecs = [];
        });
        if (!piece) return null;
        const halogen = h.halogen === 'Br' ? RETRO_REAGENTS.bromine : RETRO_REAGENTS.chlorine;
        return retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [halogen, RETRO_REAGENTS.water], { solvents: ['water'] });
      })).filter(Boolean);
  } }
);

// Additional acyl-chloride, alkene-addition and cold-DIBAL coverage. These
// proposals use the same mandatory exact-forward-replay gate as the transforms above.
const RETRO16_REAGENTS = {
  mercuricAcetate: { smiles: 'CC(=O)O[Hg]OC(C)=O', role: 'reagent', label: 'Hg(OAc)2' },
  dibal: { smiles: 'CC(C)C[AlH]CC(C)C', role: 'reagent', label: 'DIBAL-H' },
};

RETRO_TRANSFORMS.push(
  { id: 'acid-chloride', name: 'Acyl chloride from carboxylic acid and thionyl chloride', rule: 'acid-chloride', group: 'Nucleophilic acyl substitution', match(t) {
    return t.info.carbonyls.filter((c) => c.kind === 'acylChloride').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => {
      const piece = retroSinglePiece(t, (g) => {
        g.getAtom(c.hetero).element = 'O';
        rxsReplace(g, c.c, c.hetero, c.hetero, true);
      });
      return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO_REAGENTS.socl2],
        { solvents: ['dcm'], temperature: 25 });
    }).filter(Boolean);
  } },
  { id: 'oxymercuration', name: 'Markovnikov alcohol from alkene by oxymercuration–demercuration', rule: 'oxymercuration', group: 'Electrophilic addition', match(t) {
    const list = t.info.alcohols.slice(0, RETRO_LIMITS.maxPerTransform).flatMap((a) =>
      rxCarbonNeighbors(t.graph, a.c).map((n) => retroSinglePiece(t, (g) => {
        g.removeAtom(a.o);
        rxSetOrder(g, a.c, n.atom.id, 2);
        g.alkeneSpecs = [];
      })));
    return retroUniquePieces(list).map((piece) => retroSpec([{ smiles: piece.smiles, role: 'reactant' }],
      [RETRO16_REAGENTS.mercuricAcetate, RETRO_REAGENTS.nabh4], { solvents: ['water'], temperature: 25 }));
  } },
  { id: 'dibal-ester', name: 'Aldehyde from methyl or ethyl ester by cold DIBAL reduction', rule: 'dibal', group: 'Reduction', match(t) {
    return t.info.carbonyls.filter((c) => c.kind === 'aldehyde').slice(0, RETRO_LIMITS.maxPerTransform).flatMap((c) =>
      [1, 2].map((carbons) => {
        const piece = retroSinglePiece(t, (g) => {
          const o = rxAttach(g, 'O', c.c);
          let end = o.id;
          for (let i = 0; i < carbons; i++) end = rxAttach(g, 'C', end).id;
        });
        return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO16_REAGENTS.dibal],
          { solvents: ['toluene'], temperature: -78, atmosphere: 'n2' });
      })).filter(Boolean);
  } },
  { id: 'dibal-nitrile', name: 'Aldehyde from nitrile by cold DIBAL reduction and hydrolysis', rule: 'dibal', group: 'Reduction', match(t) {
    return t.info.carbonyls.filter((c) => c.kind === 'aldehyde').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => {
      const piece = retroSinglePiece(t, (g) => {
        g.removeAtom(c.o);
        rxAttach(g, 'N', c.c, 3);
      });
      return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO16_REAGENTS.dibal],
        { solvents: ['toluene'], temperature: -78, atmosphere: 'n2' });
    }).filter(Boolean);
  } }
);
