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

// Nitrile/Grignard, acetylide, condensation and hydrolysis coverage. Reverse
// edits remain bounded and are exposed only after the established forward rule
// reproduces the requested target.
const RETRO17_REAGENTS = {
  triethylamine: { smiles: 'CCN(CC)CC', role: 'reagent', label: 'Triethylamine' },
};

RETRO_TRANSFORMS.push(
  { id: 'grignard-nitrile', name: 'Ketone from nitrile and Grignard reagent', rule: 'grignard-nitrile', group: 'Carbon–carbon formation', match(t) {
    const g = t.graph;
    return t.info.carbonyls.filter((c) => c.kind === 'ketone').slice(0, RETRO_LIMITS.maxPerTransform).flatMap((c) =>
      rxCarbonNeighbors(g, c.c).map((n) => {
        const r = n.atom.id;
        const pieces = retroEdit(t, (h) => {
          h.removeAtom(c.o);
          rxAttach(h, 'N', c.c, 3);
          if (!retroCut(h, c.c, r)) return false;
          const mg = rxAttach(h, 'Mg', r);
          rxAttach(h, 'Br', mg.id);
        });
        if (!pieces || pieces.length !== 2) return null;
        const nitrile = pieces.find((p) => p.elements.has('N'));
        const grignard = pieces.find((p) => p.elements.has('Mg'));
        return nitrile && grignard ? retroSpec([{ smiles: nitrile.smiles, role: 'reactant' },
          { smiles: grignard.smiles, role: 'reagent', label: retroGrignardLabel(grignard.smiles) }], [], { solvents: ['ether'], atmosphere: 'n2' }) : null;
      })).filter(Boolean);
  } },
  { id: 'acetylide-alkylation', name: 'Internal alkyne from terminal alkyne and methyl/primary alkyl bromide', rule: 'acetylide-alkylation', group: 'Carbon–carbon formation', match(t) {
    const g = t.graph, out = [], seen = new Set();
    t.info.alkynes.forEach((e) => [[e.a, e.b], [e.b, e.a]].forEach(([terminal, other]) => {
      const neighbor = rxCarbonNeighbors(g, terminal).find((n) => n.atom.id !== other);
      if (!neighbor) return;
      const r = neighbor.atom.id, bond = g.getBond(terminal, r);
      if (!bond || bond.order !== 1 || !rxIsSp3(g, r) || t.aromatic.has(r) || rxCarbonNeighbors(g, r).filter((n) => n.atom.id !== terminal).length > 1) return;
      const pieces = retroEdit(t, (h) => {
        if (!retroCut(h, terminal, r)) return false;
        rxAttach(h, 'Br', r);
      });
      if (!pieces || pieces.length !== 2) return;
      const signature = pieces.map((p) => p.smiles).sort().join('|');
      if (seen.has(signature)) return;
      seen.add(signature);
      out.push(retroSpec(retroReactants(pieces), [RETRO15_REAGENTS.sodamide], { solvents: ['thf'], atmosphere: 'n2' }));
    }));
    return out.slice(0, RETRO_LIMITS.maxPerTransform);
  } },
  { id: 'knoevenagel', name: 'Activated alkene from carbonyl and active methylene donor', rule: 'knoevenagel', group: 'Condensation', match(t) {
    const g = t.graph;
    const acceptors = new Set(t.info.carbonyls.filter((c) => ['ketone', 'aldehyde', 'ester', 'acid'].includes(c.kind)).map((c) => c.c).concat(t.info.nitriles.map((n) => n.c)));
    return t.info.alkenes.slice(0, RETRO_LIMITS.maxPerTransform).flatMap((e) => [[e.a, e.b], [e.b, e.a]].map(([active, carbonyl]) => {
      if (rxNeighbors(g, active).filter((n) => acceptors.has(n.atom.id)).length < 2) return null;
      const pieces = retroEdit(t, (h) => {
        if (!retroCut(h, active, carbonyl)) return false;
        rxAttach(h, 'O', carbonyl, 2);
        rxsDrop(h, active);
        rxsDrop(h, carbonyl);
        h.alkeneSpecs = [];
      });
      return pieces && pieces.length === 2 ? retroSpec(retroReactants(pieces), [RETRO17_REAGENTS.triethylamine],
        { solvents: ['ethanol'], temperature: 25 }) : null;
    })).filter(Boolean);
  } },
  { id: 'amide-hydrolysis', name: 'Carboxylic acid from primary amide by acidic hydrolysis', rule: 'amide-hydrolysis', group: 'Nucleophilic acyl substitution', match(t) {
    return t.info.carbonyls.filter((c) => c.kind === 'acid').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => {
      const piece = retroSinglePiece(t, (g) => {
        g.getAtom(c.hetero).element = 'N';
        rxsReplace(g, c.c, c.hetero, c.hetero, true);
      });
      return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO_REAGENTS.Cl],
        { solvents: ['water'], temperature: 100 });
    }).filter(Boolean);
  } }
);

// Epoxide, amide-dehydration, Pinnick and ester-hydrolysis reverse coverage.
// Ring openings and carbonyl edits are proposals only until exact forward replay.
RETRO_TRANSFORMS.push(
  { id: 'epoxide-closure', name: 'Epoxide from vicinal bromohydrin by intramolecular Williamson closure', rule: 'epoxide-closure', group: 'Ring formation', match(t) {
    const g = t.graph, out = [], seen = new Set();
    rxRings(g, 3).filter((ring) => ring.length === 3 && ring.filter((id) => g.getAtom(id).element === 'C').length === 2 && ring.filter((id) => g.getAtom(id).element === 'O').length === 1).forEach((ring) => {
      const oxygen = ring.find((id) => g.getAtom(id).element === 'O');
      ring.filter((id) => g.getAtom(id).element === 'C').forEach((carbon) => {
        const piece = retroSinglePiece(t, (h) => {
          const bond = h.getBond(carbon, oxygen);
          if (!bond) return false;
          h.removeBond(bond.id);
          rxAttach(h, 'Br', carbon);
          rxsDrop(h, carbon);
          rxsDrop(h, oxygen);
        });
        if (!piece || seen.has(piece.smiles)) return;
        seen.add(piece.smiles);
        out.push(retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO_REAGENTS.hydroxide], { solvents: ['water'], temperature: 25 }));
      });
    });
    return out.slice(0, RETRO_LIMITS.maxPerTransform);
  } },
  { id: 'amide-dehydration', name: 'Nitrile from primary amide by dehydration', rule: 'amide-dehydration', group: 'Dehydration', match(t) {
    return t.info.nitriles.slice(0, RETRO_LIMITS.maxPerTransform).map((n) => {
      const piece = retroSinglePiece(t, (g) => {
        rxSetOrder(g, n.c, n.n, 1);
        rxAttach(g, 'O', n.c, 2);
        rxsDrop(g, n.n);
      });
      return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO_REAGENTS.socl2],
        { solvents: ['dcm'], temperature: 25 });
    }).filter(Boolean);
  } },
  { id: 'pinnick', name: 'Carboxylic acid from aldehyde by Pinnick oxidation', rule: 'pinnick', group: 'Oxidation', match(t) {
    return t.info.carbonyls.filter((c) => c.kind === 'acid').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => {
      const piece = retroSinglePiece(t, (g) => { g.removeAtom(c.hetero); rxsDrop(g, c.c); });
      return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [],
        { additives: ['naclo2'], solvents: ['water'], temperature: 25 });
    }).filter(Boolean);
  } },
  { id: 'ester-hydrolysis', name: 'Carboxylic acid from methyl or ethyl ester by acidic hydrolysis', rule: 'ester-hydrolysis', group: 'Nucleophilic acyl substitution', match(t) {
    return t.info.carbonyls.filter((c) => c.kind === 'acid').slice(0, RETRO_LIMITS.maxPerTransform).flatMap((c) =>
      [1, 2].map((carbons) => {
        const piece = retroSinglePiece(t, (g) => {
          let end = c.hetero;
          for (let i = 0; i < carbons; i++) end = rxAttach(g, 'C', end).id;
        });
        return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO_REAGENTS.Cl],
          { solvents: ['water'], temperature: 100 });
      })).filter(Boolean);
  } }
);

// Alpha-halogenation, organozinc addition, ylide epoxidation and alkyne
// elimination. Every disconnection remains subject to exact forward replay.
const RETRO19_REAGENTS = {
  iodine: { smiles: 'II', role: 'reagent', label: 'I2' },
  zinc: { smiles: '[Zn]', role: 'reagent', label: 'Zn' },
  sulfonium: { smiles: 'C[S+](C)C.[I-]', role: 'reagent', label: 'Trimethylsulfonium iodide' },
  hydride: { smiles: '[H-].[Na+]', role: 'reagent', label: 'NaH' },
};

RETRO_TRANSFORMS.push(
  { id: 'alpha-halogenation', name: 'Alpha-halogenated aldehyde or ketone from the parent carbonyl', rule: 'alpha-halogenation', group: 'Alpha substitution', match(t) {
    const g = t.graph, oxo = new Set(t.info.carbonyls.filter((c) => c.kind === 'aldehyde' || c.kind === 'ketone').map((c) => c.c));
    return t.info.halides.filter((h) => ['Cl', 'Br', 'I'].includes(h.halogen) && rxCarbonNeighbors(g, h.c).some((n) => oxo.has(n.atom.id)))
      .slice(0, RETRO_LIMITS.maxPerTransform).map((h) => {
        const piece = retroSinglePiece(t, (clone) => { clone.removeAtom(h.x); rxsDrop(clone, h.c); });
        const halogen = h.halogen === 'Br' ? RETRO_REAGENTS.bromine : h.halogen === 'Cl' ? RETRO_REAGENTS.chlorine : RETRO19_REAGENTS.iodine;
        return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [halogen, RETRO_REAGENTS.Cl],
          { solvents: ['water'], temperature: 25 });
      }).filter(Boolean);
  } },
  { id: 'reformatsky', name: 'Beta-hydroxy ester from an alpha-bromo ester and an aldehyde or ketone', rule: 'reformatsky', group: 'Carbon–carbon formation', match(t) {
    const g = t.graph, out = [], seen = new Set();
    t.info.carbonyls.filter((c) => c.kind === 'ester').forEach((ester) => {
      rxCarbonNeighbors(g, ester.c).filter((n) => rxIsSp3(g, n.atom.id)).forEach((alpha) => {
        t.info.alcohols.filter((a) => g.getBond(alpha.atom.id, a.c) && g.getBond(alpha.atom.id, a.c).order === 1).forEach((a) => {
          const pieces = retroEdit(t, (h) => {
            if (!retroCut(h, alpha.atom.id, a.c)) return false;
            rxAttach(h, 'Br', alpha.atom.id);
            rxSetOrder(h, a.c, a.o, 2);
            rxsDrop(h, a.c);
          });
          if (!pieces || pieces.length !== 2) return;
          const signature = pieces.map((p) => p.smiles).sort().join('|');
          if (seen.has(signature)) return;
          seen.add(signature);
          out.push(retroSpec(retroReactants(pieces), [RETRO19_REAGENTS.zinc], { solvents: ['ether'], temperature: 25, atmosphere: 'n2' }));
        });
      });
    });
    return out.slice(0, RETRO_LIMITS.maxPerTransform);
  } },
  { id: 'corey-chaykovsky', name: 'Epoxide from an aldehyde or ketone by Corey–Chaykovsky methylenation', rule: 'corey-chaykovsky', group: 'Ring formation', match(t) {
    const g = t.graph, out = [], seen = new Set();
    rxRings(g, 3).filter((ring) => ring.length === 3 && ring.filter((id) => g.getAtom(id).element === 'C').length === 2 && ring.filter((id) => g.getAtom(id).element === 'O').length === 1).forEach((ring) => {
      const oxygen = ring.find((id) => g.getAtom(id).element === 'O');
      ring.filter((id) => g.getAtom(id).element === 'C' && rxHydrogens(g, id) === 2 && rxCarbonNeighbors(g, id).length === 1).forEach((methylene) => {
        const carbonyl = ring.find((id) => id !== methylene && g.getAtom(id).element === 'C');
        const piece = retroSinglePiece(t, (h) => {
          h.removeAtom(methylene);
          rxSetOrder(h, carbonyl, oxygen, 2);
          rxsDrop(h, carbonyl);
        });
        if (!piece || seen.has(piece.smiles)) return;
        seen.add(piece.smiles);
        out.push(retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO19_REAGENTS.sulfonium, RETRO19_REAGENTS.hydride],
          { solvents: ['dmso'], temperature: 25, atmosphere: 'n2' }));
      });
    });
    return out.slice(0, RETRO_LIMITS.maxPerTransform);
  } },
  { id: 'double-elimination', name: 'Alkyne from a vicinal dibromide by double dehydrobromination', rule: 'double-elimination', group: 'Elimination', match(t) {
    return t.info.alkynes.slice(0, RETRO_LIMITS.maxPerTransform).map((e) => {
      const piece = retroSinglePiece(t, (g) => {
        rxSetOrder(g, e.a, e.b, 1);
        rxAttach(g, 'Br', e.a);
        rxAttach(g, 'Br', e.b);
        rxsDrop(g, e.a);
        rxsDrop(g, e.b);
      });
      return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO15_REAGENTS.sodamide],
        { solvents: ['thf'], temperature: 25 });
    }).filter(Boolean);
  } }
);
