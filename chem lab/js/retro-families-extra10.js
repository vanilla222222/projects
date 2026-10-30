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

// Reverse nitroaldol, selective enone-reduction, rearrangement and
// alcohol-coupling coverage. Exact forward replay remains the acceptance gate.
const RETRO21_REAGENTS = {
  cerium: { smiles: 'Cl[Ce](Cl)Cl', role: 'reagent', label: 'CeCl3' },
  pph3: { smiles: 'P(c1ccccc1)(c1ccccc1)c1ccccc1', role: 'reagent', label: 'PPh3' },
  dead: { smiles: 'CCOC(=O)N=NC(=O)OCC', role: 'reagent', label: 'DEAD' },
};

RETRO_TRANSFORMS.push(
  { id: 'henry', name: 'Beta-nitro alcohol from a carbonyl and a nitroalkane', rule: 'henry', group: 'Carbon–carbon formation', match(t) {
    const g = t.graph, out = [], seen = new Set();
    rxyNitro(t).forEach((nitro) => {
      t.info.alcohols.filter((a) => g.getBond(nitro.c, a.c) && g.getBond(nitro.c, a.c).order === 1).forEach((a) => {
        const pieces = retroEdit(t, (h) => {
          if (!retroCut(h, nitro.c, a.c)) return false;
          rxSetOrder(h, a.c, a.o, 2);
          rxsDrop(h, nitro.c);
          rxsDrop(h, a.c);
        });
        if (!pieces || pieces.length !== 2) return;
        const signature = retroKey(pieces);
        if (seen.has(signature)) return;
        seen.add(signature);
        out.push(retroSpec(retroReactants(pieces), [RETRO17_REAGENTS.triethylamine], { solvents: ['ethanol'], temperature: 25 }));
      });
    });
    return out.slice(0, RETRO_LIMITS.maxPerTransform);
  } },
  { id: 'luche', name: 'Allylic alcohol from an enone by Luche reduction', rule: 'luche', group: 'Reduction', match(t) {
    const g = t.graph, out = [], seen = new Set();
    t.info.alcohols.filter((a) => rxHydrogens(g, a.c) >= 1).forEach((a) => {
      rxCarbonNeighbors(g, a.c).filter((n) => t.info.alkenes.some((e) => e.a === n.atom.id || e.b === n.atom.id)).forEach(() => {
        const piece = retroSinglePiece(t, (h) => {
          rxSetOrder(h, a.c, a.o, 2);
          rxsDrop(h, a.c);
        });
        if (!piece || seen.has(piece.smiles)) return;
        seen.add(piece.smiles);
        out.push(retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO_REAGENTS.nabh4, RETRO21_REAGENTS.cerium], { solvents: ['methanol'], temperature: 25 }));
      });
    });
    return out.slice(0, RETRO_LIMITS.maxPerTransform);
  } },
  { id: 'hofmann-rearrangement', name: 'Primary amine from a primary amide with one fewer carbon', rule: 'hofmann-rearrangement', group: 'Rearrangement', match(t) {
    const g = t.graph, out = [], seen = new Set();
    t.info.amines.filter((a) => a.h === 2).forEach((a) => {
      const neighbors = rxCarbonNeighbors(g, a.n);
      if (neighbors.length !== 1) return;
      const r = neighbors[0].atom.id;
      const piece = retroSinglePiece(t, (h) => {
        rxSetOrder(h, r, a.n, 0);
        const c = rxAttach(h, 'C', a.n);
        rxAttach(h, 'O', c.id, 2);
        h.addBond(c.id, r);
        rxsDrop(h, a.n);
        rxsDrop(h, r);
      });
      if (!piece || seen.has(piece.smiles)) return;
      seen.add(piece.smiles);
      out.push(retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO_REAGENTS.bromine, RETRO_REAGENTS.hydroxide], { solvents: ['water'], temperature: 25 }));
    });
    return out.slice(0, RETRO_LIMITS.maxPerTransform);
  } },
  { id: 'mitsunobu', name: 'Ester from a primary or secondary alcohol and a carboxylic acid', rule: 'mitsunobu', group: 'Esters', match(t) {
    const g = t.graph, out = [], seen = new Set();
    t.info.carbonyls.filter((c) => c.kind === 'ester').forEach((ester) => {
      rxCarbonNeighbors(g, ester.hetero).filter((n) => n.atom.id !== ester.c && rxIsSp3(g, n.atom.id) && rxCarbonNeighbors(g, n.atom.id).length <= 2).forEach((n) => {
        const pieces = retroEdit(t, (h) => {
          if (!retroCut(h, ester.c, ester.hetero)) return false;
          rxAttach(h, 'O', ester.c);
          rxsDrop(h, n.atom.id);
        });
        if (!pieces || pieces.length !== 2) return;
        const signature = retroKey(pieces);
        if (seen.has(signature)) return;
        seen.add(signature);
        out.push(retroSpec(retroReactants(pieces), [RETRO21_REAGENTS.pph3, RETRO21_REAGENTS.dead], { solvents: ['thf'], temperature: 25 }));
      });
    });
    return out.slice(0, RETRO_LIMITS.maxPerTransform);
  } }
);

// Classify alkene geometry as well as tetrahedral stereochemistry. Strict
// molecular identity avoids treating equivalent slash spellings as different.
function retroTarget(graph, ids) {
  const out = {};
  const g = retroClone(graph, ids, out);
  const allIds = retroIds(g);
  const map = new Map();
  out.map.forEach((to, from) => map.set(to, from));
  const props = retroProps(g, allIds);
  let stereocentres = [];
  try {
    stereocentres = findStereocenters(g, allIds).map((c) => ({ atomId: map.get(c.atomId), type: c.type }));
  } catch (error) {
    stereocentres = [];
  }
  return {
    graph: g,
    map,
    info: rxAnalyze(g),
    aromatic: rxAromaticRings(g).atoms,
    smiles: props.smiles,
    isomericSmiles: props.isomericSmiles,
    stereocentres,
    stereo: /[@/\\]/.test(props.isomericSmiles),
    skeleton: retroSkeleton(g, allIds),
    heavy: retroHeavyKey(g, allIds),
    components: g.connectedComponents().length,
  };
}

function retroStereoSame(product, target) {
  const left = product && (product.fragment || product.isomericSmiles || product.smiles);
  const right = target && (target.fragment || target.isomericSmiles || target.smiles || target);
  if (!left || !right) return false;
  if (typeof moleculeSame === 'function') {
    try { return moleculeSame(left, right); } catch (error) { return false; }
  }
  return left === right;
}

function retroStereoClass(t, spec, verified) {
  if (!t.stereo) {
    return { stereo: null, precursors: null };
  }
  const iso = spec.precursors.map((p) => Object.assign({}, p, { smiles: retroPieceIsomeric(t, spec.record, p.smiles) }));
  const run = (list) => retroTryVerify({ precursors: list, reagents: spec.reagents, conditions: spec.conditions }, t.smiles);
  const kind = (v) => (v && v.product && v.product.stereo && v.product.stereo.kind) || '';
  if (iso.some((p) => p.smiles.includes('@'))) {
    const direct = run(iso);
    if (direct && retroStereoSame(direct.product, t.isomericSmiles)) {
      return { stereo: 'retained', precursors: iso };
    }
    const mirror = iso.map((p) => Object.assign({}, p, { smiles: retroMirror(p.smiles) }));
    const flipped = run(mirror);
    if (flipped && retroStereoSame(flipped.product, t.isomericSmiles)) {
      return { stereo: 'retained', precursors: mirror };
    }
    return ['racemic', 'diastereomers'].includes(kind(direct)) ? { stereo: 'racemic', precursors: iso } : { stereo: 'mismatch', precursors: iso };
  }
  const set = retroStereoSame(verified.product, t.isomericSmiles) && kind(verified) !== 'racemic';
  return { stereo: set ? 'set' : 'racemic', precursors: iso };
}

// The HWE donor is common stock. Register it before stockBuiltinMap's lazy
// initialization so inventory-aware Path Finder routes can use this transform.
if (!STOCK_BUILTIN.some((entry) => entry.smiles === 'CCOC(CP(=O)(OCC)OCC)=O')) {
  STOCK_BUILTIN.push({ smiles: 'CCOC(CP(=O)(OCC)OCC)=O', tier: 2, name: 'triethyl phosphonoacetate' });
}

// Reverse coverage for the existing alpha-bromination, sulfur substitution and
// beta-keto-acid rules. Exact forward replay remains mandatory for each proposal.
function retro22Sulfonyl(t, element) {
  const g = t.graph, out = [];
  g.atoms.filter((a) => a.element === 'S' && !a.charge).forEach((s) => {
    const ns = rxNeighbors(g, s.id);
    if (ns.length !== 4 || ns.filter((n) => n.atom.element === 'O' && n.bond.order === 2).length !== 2 ||
        ns.filter((n) => n.atom.element === 'C' && n.bond.order === 1).length !== 1) return;
    ns.filter((n) => n.atom.element === element && !n.atom.charge && n.bond.order === 1).forEach((n) => {
      // Alcohol sulfonates must retain an organic O substituent; a sulfonic
      // acid is hydrolysis chemistry rather than an alcohol sulfonylation.
      if (element === 'O' && !rxCarbonNeighbors(g, n.atom.id).length) return;
      const pieces = retroEdit(t, (h) => {
        if (!retroCut(h, s.id, n.atom.id)) return false;
        rxAttach(h, 'Cl', s.id);
      });
      if (!pieces || pieces.length !== 2) return;
      const chloride = pieces.find((p) => p.ids.has(s.id));
      const nucleophile = pieces.find((p) => p !== chloride);
      if (!chloride || !nucleophile) return;
      out.push(retroSpec([{smiles: nucleophile.smiles, role: 'reactant'},
        {smiles: chloride.smiles, role: 'reagent'}], [],
        {solvents: ['dcm'], additives: ['et3n'], temperature: 25}));
    });
  });
  return out.slice(0, RETRO_LIMITS.maxPerTransform);
}

RETRO_TRANSFORMS.push(
  { id: 'hvz', name: 'Alpha-bromo acid from carboxylic acid (HVZ)', rule: 'hvz', group: 'Alpha substitution', match(t) {
    const g = t.graph;
    return t.info.carbonyls.filter((c) => c.kind === 'acid').slice(0, RETRO_LIMITS.maxPerTransform).flatMap((c) =>
      rxCarbonNeighbors(g, c.c).filter((n) => rxIsSp3(g, n.atom.id)).flatMap((n) =>
        rxNeighbors(g, n.atom.id).filter((x) => x.atom.element === 'Br' && x.bond.order === 1).map((x) => {
          const piece = retroSinglePiece(t, (h) => { h.removeAtom(x.atom.id); rxsDrop(h, n.atom.id); });
          return piece && retroSpec([{smiles: piece.smiles, role: 'reactant'}],
            [RETRO_REAGENTS.bromine, RETRO_REAGENTS.pbr3], {temperature: 60});
        }))).filter(Boolean).slice(0, RETRO_LIMITS.maxPerTransform);
  } },
  { id: 'sulfonate', name: 'Sulfonate ester from alcohol and sulfonyl chloride', rule: 'sulfonate', group: 'Sulfur',
    match(t) { return retro22Sulfonyl(t, 'O'); } },
  { id: 'sulfonamide', name: 'Sulfonamide from amine and sulfonyl chloride', rule: 'sulfonamide', group: 'Sulfur',
    match(t) { return retro22Sulfonyl(t, 'N'); } },
  { id: 'beta-keto-decarboxylation', name: 'Ketone from beta-keto acid by decarboxylation', rule: 'decarboxylation', group: 'Carbon–carbon cleavage', match(t) {
    const g = t.graph;
    return t.info.carbonyls.filter((c) => c.kind === 'ketone').slice(0, RETRO_LIMITS.maxPerTransform).flatMap((c) =>
      rxCarbonNeighbors(g, c.c).filter((n) => rxIsSp3(g, n.atom.id) && rxHydrogens(g, n.atom.id) > 0).map((n) => {
        const piece = retroSinglePiece(t, (h) => {
          const acid = rxAttach(h, 'C', n.atom.id);
          rxAttach(h, 'O', acid.id, 2);
          rxAttach(h, 'O', acid.id);
          rxsDrop(h, n.atom.id);
        });
        return piece && retroSpec([{smiles: piece.smiles, role: 'reactant'}], [], {temperature: 140});
      })).filter(Boolean).slice(0, RETRO_LIMITS.maxPerTransform);
  } }
);
// Acyl-substitution alternatives backed by the existing forward rules. Carbon
// donors remain explicit precursors, including a transesterification alcohol.
const RETRO23_REAGENTS = {
  dcc: {smiles: 'C1CCC(CC1)N=C=NC1CCCCC1', role: 'reagent', label: 'DCC'},
};

function retro23AcylPartners(t, kind, esterDonor) {
  return t.info.carbonyls.filter((c) => c.kind === kind).slice(0, RETRO_LIMITS.maxPerTransform).map((c) => {
    const pieces = retroEdit(t, (g) => {
      if (!retroCut(g, c.c, c.hetero)) return false;
      const oxygen = rxAttach(g, 'O', c.c);
      if (esterDonor) rxAttach(g, 'C', oxygen.id);
    });
    return pieces && pieces.length === 2 ? pieces : null;
  }).filter(Boolean);
}

RETRO_TRANSFORMS.push(
  {id: 'amide-coupling', name: 'Amide from acid and amine by carbodiimide coupling', rule: 'amide-coupling', group: 'Amides', match(t) {
    return retro23AcylPartners(t, 'amide', false).map((pieces) =>
      retroSpec(retroReactants(pieces), [RETRO23_REAGENTS.dcc], {solvents: ['dcm'], temperature: 25}));
  }},
  {id: 'steglich', name: 'Ester from acid and alcohol by Steglich coupling', rule: 'steglich', group: 'Esters', match(t) {
    return retro23AcylPartners(t, 'ester', false).map((pieces) =>
      retroSpec(retroReactants(pieces), [RETRO23_REAGENTS.dcc], {solvents: ['dcm'], additives: ['dmap'], temperature: 25}));
  }},
  {id: 'ester-aminolysis', name: 'Amide from methyl ester and amine or ammonia', rule: 'aminolysis', group: 'Amides', match(t) {
    return retro23AcylPartners(t, 'amide', true).map((pieces) =>
      retroSpec(retroReactants(pieces), [], {solvents: ['ethanol'], temperature: 80}));
  }},
  {id: 'transesterification', name: 'Methyl or ethyl ester by alcohol exchange', rule: 'transesterification', group: 'Esters', match(t) {
    return t.info.carbonyls.filter((c) => c.kind === 'ester').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => {
      const pieces = retroEdit(t, (g) => {
        if (!retroCut(g, c.c, c.hetero)) return false;
        const alcoholIds = g.connectedComponents().find((component) => component.atomIds.includes(c.hetero)).atomIds;
        const alcohol = retroCanonical(g, alcoholIds);
        // Limit this proposal to the two encoded bulk alcohol solvents. Use
        // the opposite ester so a no-change exchange cannot become a route.
        const methyl = moleculeSame(alcohol, 'CO'), ethyl = moleculeSame(alcohol, 'CCO');
        if (!methyl && !ethyl) return false;
        const oxygen = rxAttach(g, 'O', c.c), carbon = rxAttach(g, 'C', oxygen.id);
        if (methyl) rxAttach(g, 'C', carbon.id);
      });
      if (!pieces || pieces.length !== 2) return null;
      const alcohol = pieces.find((p) => p.ids.has(c.hetero));
      const ester = pieces.find((p) => p !== alcohol);
      if (!alcohol || !ester) return null;
      return retroSpec([{smiles: ester.smiles, role: 'reactant'}, {smiles: alcohol.smiles, role: 'solvent'}], [],
        {solvents: ['none'], additives: ['h2so4'], temperature: 60});
    }).filter(Boolean);
  }}
);
// Nitrogen condensations preserve the donor atoms (and their isotope labels).
function retro24Condensation(t, terminal) {
  const g = t.graph;
  const sites = g.atoms.filter((a) => a.element === 'N' && !a.charge).map((n) => {
    const ns = rxNeighbors(g, n.id);
    if (ns.length !== 2) return null;
    const carbon = ns.find((x) => x.atom.element === 'C' && x.bond.order === 2);
    const end = ns.find((x) => x.atom.element === terminal && !x.atom.charge && x.bond.order === 1 &&
      rxNeighbors(g, x.atom.id).length === 1 && rxHydrogens(g, x.atom.id) === (terminal === 'O' ? 1 : 2));
    return carbon && end ? {n: n.id, c: carbon.atom.id} : null;
  }).filter(Boolean);
  if (!sites.length || sites.length > RETRO_LIMITS.maxPerTransform) return [];
  const pieces = retroEdit(t, (h) => {
    for (const site of sites) {
      if (!retroCut(h, site.c, site.n)) return false;
      rxAttach(h, 'O', site.c, 2);
      rxsDrop(h, site.c);
    }
  });
  if (!pieces || pieces.length !== sites.length + 1) return [];
  const carbonyl = pieces.find((p) => sites.every((s) => p.ids.has(s.c)));
  if (!carbonyl) return [];
  return [retroSpec([{smiles: carbonyl.smiles, role: 'reactant'},
    ...pieces.filter((p) => p !== carbonyl).map((p) => ({smiles: p.smiles, role: 'reagent'}))], [],
    {solvents: ['ethanol'], temperature: 25})];
}

function retro24PaalKnorr(t, element) {
  const g = t.graph, out = [];
  const rings = rxAromaticRings(g).rings.filter((r) => r.length === 5 &&
    r.filter((id) => g.getAtom(id).element === element).length === 1 &&
    r.every((id) => ['C', element].includes(g.getAtom(id).element)));
  rings.slice(0, RETRO_LIMITS.maxPerTransform).forEach((ring) => {
    const hetero = ring.find((id) => g.getAtom(id).element === element);
    if (g.getAtom(hetero).charge) return;
    const ends = rxNeighbors(g, hetero).filter((n) => ring.includes(n.atom.id)).map((n) => n.atom.id);
    if (ends.length !== 2) return;
    // Both oxygen orientations can matter for labelled furans. Pyrrole keeps
    // its nitrogen in the explicit amine/ammonia precursor instead.
    const orientations = element === 'O' ? [ends, ends.slice().reverse()] : [ends];
    orientations.forEach(([a, b]) => {
      const pieces = retroEdit(t, (h) => {
        if (!retroBreak(h, hetero, b)) return false;
        if (element === 'N' && !retroCut(h, hetero, a)) return false;
        ring.filter((id) => id !== hetero).forEach((id) => rxNeighbors(h, id)
          .filter((n) => ring.includes(n.atom.id) && n.atom.id !== hetero)
          .forEach((n) => rxSetOrder(h, id, n.atom.id, 1)));
        if (element === 'O') rxSetOrder(h, hetero, a, 2);
        else rxAttach(h, 'O', a, 2);
        rxAttach(h, 'O', b, 2);
      });
      if (!pieces || pieces.length !== (element === 'O' ? 1 : 2)) return;
      out.push(retroSpec(retroReactants(pieces), [],
        {solvents: ['ethanol'], additives: element === 'O' ? ['h2so4'] : [], temperature: 80}));
    });
  });
  return out.slice(0, RETRO_LIMITS.maxPerTransform);
}

RETRO_TRANSFORMS.push(
  {id: 'oxime-formation', name: 'Oxime from carbonyl and hydroxylamine', rule: 'oxime', group: 'Nitrogen', match(t) { return retro24Condensation(t, 'O'); }},
  {id: 'hydrazone-formation', name: 'Hydrazone from carbonyl and hydrazine', rule: 'hydrazone', group: 'Nitrogen', match(t) { return retro24Condensation(t, 'N'); }},
  {id: 'paal-knorr-furan', name: 'Furan from 1,4-dicarbonyl by Paal–Knorr cyclization', rule: 'paal-knorr-furan', group: 'Heterocycle formation', match(t) { return retro24PaalKnorr(t, 'O'); }},
  {id: 'paal-knorr-pyrrole', name: 'Pyrrole from 1,4-dicarbonyl and primary amine or ammonia', rule: 'paal-knorr-pyrrole', group: 'Heterocycle formation', match(t) { return retro24PaalKnorr(t, 'N'); }}
);
// Metathesis, trans-alkene reduction and self-disproportionation proposals.
// Product geometry and competing products remain those of the forward model.
RETRO_TRANSFORMS.push(
  {id: 'ring-closing-metathesis', name: 'Cycloalkene from terminal diene by ring-closing metathesis', rule: 'rcm', group: 'Ring formation', match(t) {
    const g = t.graph;
    return t.info.alkenes.filter((e) => [e.a,e.b].every((id) => rxHydrogens(g,id) === 1) &&
      rxRings(g,8).some((ring) => ring.length >= 5 && ring.length <= 8 && ring.includes(e.a) && ring.includes(e.b)))
      .slice(0,RETRO_LIMITS.maxPerTransform).map((e) => {
        const piece = retroSinglePiece(t,(h) => {
          if (!retroBreak(h,e.a,e.b)) return false;
          rxAttach(h,'C',e.a,2); rxAttach(h,'C',e.b,2);
          h.alkeneSpecs = (h.alkeneSpecs || []).filter((s) => ![e.a,e.b].includes(s.a) && ![e.a,e.b].includes(s.b));
        });
        return piece && retroSpec([{smiles:piece.smiles,role:'reactant'}],[],{solvents:['dcm'],additives:['grubbs'],temperature:25});
      }).filter(Boolean);
  }},
  {id: 'cross-metathesis', name: 'Internal alkene from two terminal alkenes by cross-metathesis', rule: 'cross-metathesis', group: 'Carbon–carbon formation', match(t) {
    const g = t.graph;
    return t.info.alkenes.filter((e) => [e.a,e.b].every((id) => rxHydrogens(g,id) === 1))
      .slice(0,RETRO_LIMITS.maxPerTransform).map((e) => {
        const pieces = retroEdit(t,(h) => {
          if (!retroCut(h,e.a,e.b)) return false;
          rxAttach(h,'C',e.a,2); rxAttach(h,'C',e.b,2);
          h.alkeneSpecs = (h.alkeneSpecs || []).filter((s) => ![e.a,e.b].includes(s.a) && ![e.a,e.b].includes(s.b));
        });
        return pieces && pieces.length === 2 ? retroSpec(retroReactants(pieces),[],{solvents:['dcm'],additives:['grubbs'],temperature:25}) : null;
      }).filter(Boolean);
  }},
  {id: 'dissolving-metal', name: 'Trans alkene from internal alkyne by dissolving-metal reduction', rule: 'dissolving-metal', group: 'Reduction', match(t) {
    const g = t.graph;
    return t.info.alkenes.filter((e) => [e.a,e.b].every((id) => rxHydrogens(g,id) === 1) && !!retroSide(g,e.a,e.b))
      .slice(0,RETRO_LIMITS.maxPerTransform).map((e) => {
        const piece = retroSinglePiece(t,(h) => {
          rxSetOrder(h,e.a,e.b,3);
          h.alkeneSpecs = (h.alkeneSpecs || []).filter((s) => ![e.a,e.b].includes(s.a) && ![e.a,e.b].includes(s.b));
        });
        return piece && retroSpec([{smiles:piece.smiles,role:'reactant'}],[],{solvents:['none'],additives:['nanh3'],temperature:-33});
      }).filter(Boolean);
  }},
  {id: 'cannizzaro-alcohol', name: 'Primary alcohol from non-enolizable aldehyde by Cannizzaro reaction', rule: 'cannizzaro', group: 'Disproportionation', match(t) {
    return t.info.alcohols.filter((a) => a.degree <= 1).slice(0,RETRO_LIMITS.maxPerTransform).map((a) => {
      const piece = retroSinglePiece(t,(g) => {rxSetOrder(g,a.c,a.o,2);rxsDrop(g,a.c);});
      return piece && retroSpec([{smiles:piece.smiles,role:'reactant'}],[RETRO_REAGENTS.hydroxide],{solvents:['water'],temperature:25});
    }).filter(Boolean);
  }}
);
// Rearrangement, arene reduction, metal insertion and haloform alternatives.
RETRO_TRANSFORMS.push(
  {id:'pinacol',name:'Ketone from a vicinal diol by Pinacol rearrangement',rule:'pinacol',group:'Rearrangement',match(t) {
    const g=t.graph,out=[];
    t.info.carbonyls.filter(c=>c.kind==='ketone').slice(0,RETRO_LIMITS.maxPerTransform).forEach(c=>
      rxCarbonNeighbors(g,c.c).filter(n=>rxIsSp3(g,n.atom.id)).forEach(n=> {
        const adjacent=n.atom.id,degree=rxCarbonNeighbors(g,adjacent).length;
        if(degree===3&&rxHydrogens(g,adjacent)===1) {
          const piece=retroSinglePiece(t,h=>{rxSetOrder(h,c.c,c.o,1);rxAttach(h,'O',adjacent);rxsDrop(h,c.c);rxsDrop(h,adjacent);});
          if(piece)out.push(retroSpec([{smiles:piece.smiles,role:'reactant'}],[],{solvents:['water'],additives:['h2so4'],temperature:25}));
        }
        if(degree!==4)return;
        rxCarbonNeighbors(g,adjacent).filter(m=>m.atom.id!==c.c&&!g.getBond(c.c,m.atom.id)).forEach(m=> {
          const piece=retroSinglePiece(t,h=> {
            if(!retroBreak(h,adjacent,m.atom.id))return false;
            h.addBond(c.c,m.atom.id);rxSetOrder(h,c.c,c.o,1);rxAttach(h,'O',adjacent);
            rxsDrop(h,c.c);rxsDrop(h,adjacent);
          });
          if(piece)out.push(retroSpec([{smiles:piece.smiles,role:'reactant'}],[],{solvents:['water'],additives:['h2so4'],temperature:25}));
        });
      }));
    return out.slice(0,RETRO_LIMITS.maxPerTransform);
  }},
  {id:'birch',name:'Nonconjugated cyclohexadiene from arene by Birch reduction',rule:'birch',group:'Reduction',match(t) {
    const g=t.graph,rings=rxRings(g,8);
    return rings.filter(r=>r.length===6&&r.every(id=>g.getAtom(id).element==='C'&&!g.getAtom(id).charge&&
      rings.filter(other=>other.includes(id)).length===1)).filter(r=> {
      const doubles=r.map((id,i)=>g.getBond(id,r[(i+1)%6]).order===2?i:-1).filter(i=>i>=0);
      return doubles.length===2&&(doubles[1]-doubles[0])===3;
    }).slice(0,RETRO_LIMITS.maxPerTransform).map(r=> {
      const piece=retroSinglePiece(t,h=>{r.forEach((id,i)=>{rxSetOrder(h,id,r[(i+1)%6],i%2?1:2);rxsDrop(h,id);});});
      return piece&&retroSpec([{smiles:piece.smiles,role:'reactant'}],[],{solvents:['ethanol'],additives:['nanh3'],temperature:-33});
    }).filter(Boolean);
  }},
  {id:'grignard-formation',name:'Grignard reagent from organic halide and magnesium',rule:'grignard-formation',group:'Organometallic preparation',match(t) {
    const g=t.graph;
    return g.atoms.filter(a=>a.element==='Mg'&&!a.charge).slice(0,RETRO_LIMITS.maxPerTransform).map(m=> {
      const ns=rxNeighbors(g,m.id);
      const carbon=ns.find(n=>n.atom.element==='C'&&n.bond.order===1);
      const halogen=ns.find(n=>['Cl','Br','I'].includes(n.atom.element)&&n.bond.order===1&&rxNeighbors(g,n.atom.id).length===1);
      if(ns.length!==2||!carbon||!halogen)return null;
      const piece=retroSinglePiece(t,h=>{h.removeAtom(m.id);h.addBond(carbon.atom.id,halogen.atom.id);rxsDrop(h,carbon.atom.id);});
      return piece&&retroSpec([{smiles:piece.smiles,role:'reactant'}],[],{solvents:['ether'],additives:['mg'],atmosphere:'n2',temperature:25});
    }).filter(Boolean);
  }},
  {id:'haloform-carboxylate',name:'Carboxylate from methyl ketone by haloform cleavage',rule:'haloform',group:'Carbon–carbon cleavage',match(t) {
    return t.info.carbonyls.filter(c=>c.hetero!==null&&t.graph.getAtom(c.hetero).element==='O'&&t.graph.getAtom(c.hetero).charge===-1)
      .slice(0,RETRO_LIMITS.maxPerTransform).map(c=> {
        const piece=retroSinglePiece(t,g=>{g.removeAtom(c.hetero);rxAttach(g,'C',c.c);});
        return piece&&retroSpec([{smiles:piece.smiles,role:'reactant'}],[{smiles:'II',role:'reagent',label:'I2'},{smiles:'[OH-]',role:'reagent',label:'Hydroxide'}],{solvents:['water'],temperature:25});
      }).filter(Boolean);
  }}
);
// Condensation and substitution/elimination alternatives using existing rules.
RETRO_TRANSFORMS.push(
  {id:'imine-formation',name:'Imine from carbonyl and primary amine',rule:'imine',group:'Nitrogen',match(t) {
    const g=t.graph;
    return g.atoms.filter(a=>a.element==='N'&&!a.charge).flatMap(n=> {
      const ns=rxNeighbors(g,n.id);
      if(ns.length!==2||ns.filter(x=>x.atom.element==='C'&&x.bond.order===1).length!==1)return [];
      return ns.filter(x=>x.atom.element==='C'&&x.bond.order===2).map(x=> {
        const pieces=retroEdit(t,h=>{if(!retroCut(h,x.atom.id,n.id))return false;rxAttach(h,'O',x.atom.id,2);rxsDrop(h,x.atom.id);});
        return pieces&&pieces.length===2?retroSpec(retroReactants(pieces),[],{solvents:['toluene'],temperature:25}):null;
      });
    }).filter(Boolean).slice(0,RETRO_LIMITS.maxPerTransform);
  }},
  {id:'enamine-formation',name:'Enamine from carbonyl and secondary amine',rule:'enamine',group:'Nitrogen',match(t) {
    const g=t.graph;
    return g.atoms.filter(a=>a.element==='N'&&!a.charge&&rxNeighbors(g,a.id).length===3&&rxHydrogens(g,a.id)===0&&rxNeighbors(g,a.id).every(n=>n.atom.element==='C'&&n.bond.order===1)).flatMap(n=>
      rxCarbonNeighbors(g,n.id).filter(x=>x.bond.order===1).flatMap(x=>
        rxCarbonNeighbors(g,x.atom.id).filter(y=>y.bond.order===2&&!t.aromatic.has(y.atom.id)).map(y=> {
          const pieces=retroEdit(t,h=> {
            if(!retroCut(h,x.atom.id,n.id))return false;
            rxSetOrder(h,x.atom.id,y.atom.id,1);rxAttach(h,'O',x.atom.id,2);
            rxsDrop(h,x.atom.id);rxsDrop(h,y.atom.id);
          });
          return pieces&&pieces.length===2?retroSpec(retroReactants(pieces),[],{solvents:['toluene'],temperature:25}):null;
        }))).filter(Boolean).slice(0,RETRO_LIMITS.maxPerTransform);
  }},
  {id:'mitsunobu-ether',name:'Aryl alkyl ether from alcohol and phenol by Mitsunobu reaction',rule:'mitsunobu',group:'Ethers',match(t) {
    const g=t.graph;
    return g.atoms.filter(a=>a.element==='O'&&!a.charge).flatMap(o=> {
      const ns=rxNeighbors(g,o.id);
      if(ns.length!==2||ns.some(n=>n.atom.element!=='C'||n.bond.order!==1))return [];
      const aryl=ns.find(n=>t.aromatic.has(n.atom.id));
      const alkyl=ns.find(n=>!t.aromatic.has(n.atom.id)&&rxIsSp3(g,n.atom.id)&&rxCarbonNeighbors(g,n.atom.id).length<=2);
      if(!aryl||!alkyl)return [];
      const pieces=retroEdit(t,h=> {
        if(!retroCut(h,alkyl.atom.id,o.id))return false;
        rxAttach(h,'O',alkyl.atom.id);rxsDrop(h,alkyl.atom.id);
      });
      return pieces&&pieces.length===2?[retroSpec(retroReactants(pieces),[RETRO21_REAGENTS.pph3,RETRO21_REAGENTS.dead],{solvents:['thf'],temperature:25})]:[];
    }).slice(0,RETRO_LIMITS.maxPerTransform);
  }},
  {id:'hofmann-elimination',name:'Terminal alkene from alkyltrimethylammonium by Hofmann elimination',rule:'hofmann-elimination',group:'Elimination',match(t) {
    const pieces=t.info.alkenes.flatMap(e=>[e.a,e.b].filter(id=>rxHydrogens(t.graph,id)===2&&rxNeighbors(t.graph,id).length===1).map(end=>
      retroSinglePiece(t,g=> {
        const other=end===e.a?e.b:e.a;rxSetOrder(g,end,other,1);
        const nitrogen=rxAttach(g,'N',end,1,1);
        for(let i=0;i<3;i++)rxAttach(g,'C',nitrogen.id);
        rxsDrop(g,end);rxsDrop(g,other);
      }))).filter(Boolean);
    return retroUniquePieces(pieces).slice(0,RETRO_LIMITS.maxPerTransform).map(p=>
      retroSpec([{smiles:p.smiles,role:'reactant'}],[RETRO_REAGENTS.hydroxide],{solvents:['none'],temperature:140}));
  }}
);
