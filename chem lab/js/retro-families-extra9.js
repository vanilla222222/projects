// Additional forward-verified disconnections. Graph edits propose precursors;
// retroTryVerify remains the authority on whether a candidate is exposed.
const RETRO14_REAGENTS = {
  nitric: { smiles: 'O[N+](=O)[O-]', role: 'reagent', label: 'Nitric acid' },
  cyanide: RETRO_REAGENTS.cyanide,
  pph3: { smiles: 'C1=CC=C(C=C1)P(C1=CC=CC=C1)C1=CC=CC=C1', role: 'reagent', label: 'Triphenylphosphine' },
  ethoxide: RETRO_REAGENTS.ethoxide,
  pdcl2: { smiles: 'Cl[Pd]Cl', role: 'reagent', label: 'PdCl2' },
  cucl: { smiles: 'Cl[Cu]', role: 'reagent', label: 'CuCl' },
  diiodomethane: { smiles: 'ICI', role: 'reagent', label: 'CH2I2' },
};

function retro14Two(t, edit, reagents, conditions) {
  const pieces = retroEdit(t, edit);
  return pieces && pieces.length === 2 ? retroSpec(retroReactants(pieces), reagents || [], conditions || {}) : null;
}

RETRO_TRANSFORMS.push(
  { id: 'benzoin-oxidation', name: 'Alpha-diketone from an alpha-hydroxy ketone', rule: 'benzoin-oxidation', group: 'Oxidation', match(t) {
    const carbonyls = t.info.carbonyls.filter((c) => c.kind === 'ketone');
    return carbonyls.slice(0, RETRO_LIMITS.maxPerTransform).flatMap((c) => carbonyls.filter((other) => other.c !== c.c && t.graph.getBond(c.c, other.c)).map((other) => {
      const piece = retroSinglePiece(t, (g) => { rxSetOrder(g, other.c, other.o, 1); rxsDrop(g, other.c); });
      return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO14_REAGENTS.nitric], { solvents: ['water'], temperature: 90 });
    })).filter(Boolean);
  } },
  { id: 'henry', name: 'Beta-nitro alcohol from aldehyde/ketone and nitroalkane', rule: 'henry', group: 'Carbon–carbon formation', match(t) {
    const nitro = rxyNitro(t);
    return t.info.alcohols.slice(0, RETRO_LIMITS.maxPerTransform).flatMap((a) => nitro.filter((n) => t.graph.getBond(a.c, n.c)).map((n) => retro14Two(t, (g) => {
      if (!retroCut(g, a.c, n.c)) return false;
      rxSetOrder(g, a.c, a.o, 2);
      rxsDrop(g, a.c);
      rxsDrop(g, n.c);
    }, [RETRO14_REAGENTS.ethoxide], { solvents: ['ethanol'], temperature: 25 }))).filter(Boolean);
  } },
  { id: 'benzoin', name: 'Alpha-hydroxy ketone from aromatic aldehyde self-condensation', rule: 'cyanide-carbonyl', group: 'Carbon–carbon formation', match(t) {
    if (t.info.carbonyls.length !== 1 || t.info.carbonyls[0].kind !== 'ketone') return [];
    const c = t.info.carbonyls[0];
    return t.info.alcohols.filter((a) => t.graph.getBond(c.c, a.c)).slice(0, RETRO_LIMITS.maxPerTransform).map((a) => {
      const pieces = retroEdit(t, (g) => {
        if (!retroCut(g, c.c, a.c)) return false;
        rxSetOrder(g, a.c, a.o, 2);
        rxsDrop(g, a.c);
      });
      if (!pieces || pieces.length !== 2 || pieces[0].smiles !== pieces[1].smiles) return null;
      return retroSpec(retroReactants(pieces), [RETRO14_REAGENTS.cyanide], { solvents: ['ethanol'], temperature: 25 });
    }).filter(Boolean);
  } },
  { id: 'staudinger', name: 'Primary amine from organic azide by Staudinger reduction', rule: 'phosphorus', group: 'Reduction', match(t) {
    return t.graph.atoms.filter((n) => n.element === 'N' && !n.charge && rxHydrogens(t.graph, n.id) === 2 &&
      rxNeighbors(t.graph, n.id).length === 1 && rxNeighbors(t.graph, n.id)[0].atom.element === 'C').slice(0, RETRO_LIMITS.maxPerTransform).map((n) => {
      const piece = retroSinglePiece(t, (g) => {
        const mid = rxAttach(g, 'N', n.id, 2, 1);
        rxAttach(g, 'N', mid.id, 2, -1);
      });
      return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO14_REAGENTS.pph3], { solvents: ['thf', 'water'], temperature: 25 });
    }).filter(Boolean);
  } },
  { id: 'appel', name: 'Alkyl chloride/bromide from alcohol by Appel substitution', rule: 'phosphorus', group: 'Substitution', match(t) {
    return t.graph.atoms.filter((x) => ['Cl', 'Br'].includes(x.element) && rxNeighbors(t.graph, x.id).length === 1 &&
      rxNeighbors(t.graph, x.id)[0].atom.element === 'C' && !t.aromatic.has(rxNeighbors(t.graph, x.id)[0].atom.id)).slice(0, RETRO_LIMITS.maxPerTransform).map((x) => {
      const c = rxNeighbors(t.graph, x.id)[0].atom.id;
      const piece = retroSinglePiece(t, (g) => { g.getAtom(x.id).element = 'O'; rxsReplace(g, c, x.id, x.id, true); });
      if (!piece) return null;
      const tetrahalide = x.element === 'Br' ? 'BrC(Br)(Br)Br' : 'ClC(Cl)(Cl)Cl';
      return retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO14_REAGENTS.pph3,
        { smiles: tetrahalide, role: 'reagent', label: x.element === 'Br' ? 'CBr4' : 'CCl4' }], { solvents: ['dcm'], temperature: 25 });
    }).filter(Boolean);
  } },
  { id: 'cyanohydrin', name: 'Cyanohydrin from aldehyde or ketone', rule: 'cyanide-carbonyl', group: 'Nucleophilic addition', match(t) {
    return t.info.alcohols.slice(0, RETRO_LIMITS.maxPerTransform).flatMap((a) => rxCarbonNeighbors(t.graph, a.c).filter((n) =>
      rxNeighbors(t.graph, n.atom.id).some((x) => x.atom.element === 'N' && x.bond.order === 3 && rxNeighbors(t.graph, x.atom.id).length === 1)).map((cn) => {
      const piece = retroSinglePiece(t, (g) => { rxRemoveBranch(g, cn.atom.id, a.c); rxSetOrder(g, a.c, a.o, 2); rxsDrop(g, a.c); });
      return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO14_REAGENTS.cyanide, RETRO_REAGENTS.Cl], { solvents: ['water'], temperature: 25 });
    })).filter(Boolean);
  } },
  { id: 'wacker', name: 'Methyl ketone from terminal alkene by Wacker oxidation', rule: 'wacker', group: 'Oxidation', match(t) {
    return t.info.carbonyls.filter((c) => c.kind === 'ketone').slice(0, RETRO_LIMITS.maxPerTransform).flatMap((c) =>
      rxCarbonNeighbors(t.graph, c.c).filter((n) => rxHydrogens(t.graph, n.atom.id) === 3).map((me) => {
        const piece = retroSinglePiece(t, (g) => { g.removeAtom(c.o); rxSetOrder(g, c.c, me.atom.id, 2); g.alkeneSpecs = []; });
        return piece && retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO14_REAGENTS.pdcl2, RETRO14_REAGENTS.cucl],
          { solvents: ['dmf', 'water'], temperature: 25, atmosphere: 'o2' });
      })).filter(Boolean);
  } },
  { id: 'simmons-smith', name: 'Cyclopropane from alkene by Simmons–Smith cyclopropanation', rule: 'simmons-smith', group: 'Cyclopropanation', match(t) {
    const out = [], seen = new Set();
    rxRings(t.graph, 3).filter((ring) => ring.length === 3 && ring.every((id) => t.graph.getAtom(id).element === 'C')).forEach((ring) => {
      ring.filter((id) => rxHydrogens(t.graph, id) === 2).forEach((methylene) => {
        const others = ring.filter((id) => id !== methylene);
        const piece = retroSinglePiece(t, (g) => { g.removeAtom(methylene); rxSetOrder(g, others[0], others[1], 2); g.alkeneSpecs = []; });
        if (!piece || seen.has(piece.smiles)) return;
        seen.add(piece.smiles);
        out.push(retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [RETRO14_REAGENTS.diiodomethane],
          { solvents: ['ether'], additives: ['zncu'], temperature: 25, atmosphere: 'n2' }));
      });
    });
    return out.slice(0, RETRO_LIMITS.maxPerTransform);
  } }
);

// Add wholly aliphatic primary amines without duplicating the established
// aromatic/benzylic planner space. Aromatic targets retain the original transform.
const retro14NitroReduction = RETRO_TRANSFORMS.find((x) => x.id === 'nitro-reduction');
if (retro14NitroReduction) {
  const aromaticMatch = retro14NitroReduction.match;
  retro14NitroReduction.group = 'Reduction';
  retro14NitroReduction.match = function(t) {
    if (t.aromatic.size) return aromaticMatch.call(this, t);
    const g = t.graph;
    return retroUniquePieces(g.atoms.filter((a) => a.element === 'N' && !a.charge && rxHydrogens(g, a.id) === 2 &&
      rxNeighbors(g, a.id).length === 1 && rxNeighbors(g, a.id)[0].atom.element === 'C').map((a) => retroSinglePiece(t, (h) => {
      h.getAtom(a.id).charge = 1;
      rxAttach(h, 'O', a.id, 2);
      rxAttach(h, 'O', a.id, 1, -1);
    }))).map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [], { additives: ['fe', 'hcl'] }));
  };
}
