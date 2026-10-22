// Bounded reverse edits for the expanded reaction library. Every candidate still
// passes the normal forward verifier; matching a shape alone never proves a route.
function retro3One(t, edit, reagents, conditions) {
  const p = retroSinglePiece(t, edit);
  return p ? retroSpec([{ smiles: p.smiles, role: 'reactant' }], reagents || [], conditions || {}) : null;
}

function retro3AmineSites(g, oxide) {
  return g.atoms.filter((a) => {
    if (a.element !== 'N') return false;
    const n = rxNeighbors(g, a.id);
    if (n.length !== (oxide ? 4 : 3) || n.filter((x) => x.atom.element === 'C' && x.bond.order === 1).length !== 3) return false;
    if (!oxide) return !a.charge;
    // The charge-separated amine oxide representation preserves nitrogen's
    // octet and agrees with the forward rule and independent identity checks.
    return n.filter((x) => x.atom.element === 'O' && rxNeighbors(g, x.atom.id).length === 1 &&
      a.charge === 1 && x.atom.charge === -1 && x.bond.order === 1).length === 1;
  });
}

RETRO_TRANSFORMS.push(
  { id: 'hydroxy-acid-lactonization', name: 'Lactone from hydroxy acid', rule: 'hydroxy-acid-lactonization', group: 'Cyclization',
    match(t) {
      return t.info.carbonyls.filter((c) => c.kind === 'ester').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => {
        // A ring cut retains a single precursor; acyclic esters give two pieces
        // and are rejected here rather than proposed as intramolecular routes.
        return retro3One(t, (g) => { if (!retroBreak(g, c.c, c.hetero)) return false; rxAttach(g, 'O', c.c); }, [],
          { additives: ['h2so4'], solvents: ['toluene'], temperature: 80 });
      }).filter(Boolean);
    } },
  { id: 'rosenmund-reduction', name: 'Aldehyde from acyl chloride (Rosenmund)', rule: 'rosenmund-reduction', group: 'Reduction',
    match(t) {
      return t.info.carbonyls.filter((c) => c.kind === 'aldehyde').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => retro3One(t,
        (g) => { rxAttach(g, 'Cl', c.c); }, [], { additives: ['rosenmund'], atmosphere: 'h2', solvents: ['toluene'], temperature: 25 })).filter(Boolean);
    } },
  { id: 'peracid-aldehyde-oxidation', name: 'Carboxylic acid from aldehyde (peracid)', rule: 'peracid-aldehyde-oxidation', group: 'Oxidation',
    match(t) {
      return t.info.carbonyls.filter((c) => c.kind === 'acid').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => retro3One(t,
        (g) => { g.removeAtom(c.hetero); }, [RETRO_REAGENTS.mcpba], { solvents: ['dcm'], temperature: 20 })).filter(Boolean);
    } },
  { id: 'anhydride-formation', name: 'Anhydride from acyl chloride and carboxylate', rule: 'anhydride-formation', group: 'Acyl substitution',
    match(t) {
      return t.info.carbonyls.filter((c) => c.kind === 'anhydride').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => {
        const pieces = retroEdit(t, (g) => {
          if (!retroCut(g, c.c, c.hetero)) return false;
          rxAttach(g, 'Cl', c.c); g.getAtom(c.hetero).charge = -1;
        });
        return pieces && pieces.length === 2 ? retroSpec(retroReactants(pieces), [], { solvents: ['dcm'], temperature: 20 }) : null;
      }).filter(Boolean);
    } },
  { id: 'intramolecular-williamson', name: 'Cyclic ether from haloalcohol', rule: 'intramolecular-williamson', group: 'Cyclization',
    match(t) {
      return t.graph.atoms.filter((o) => o.element === 'O' && !o.charge && rxNeighbors(t.graph, o.id).length === 2 &&
        rxNeighbors(t.graph, o.id).every((x) => x.atom.element === 'C' && x.bond.order === 1)).slice(0, RETRO_LIMITS.maxPerTransform).flatMap((o) =>
        rxNeighbors(t.graph, o.id).filter((x) => rxHydrogens(t.graph, x.atom.id) === 2).map((x) => retro3One(t, (g) => {
          if (!retroBreak(g, o.id, x.atom.id)) return false; rxAttach(g, 'Br', x.atom.id);
        }, [], { solvents: ['thf'], additives: ['nah'], temperature: 20 })).filter(Boolean));
    } },
  { id: 'amine-n-oxidation', name: 'Tertiary amine oxide from amine', rule: 'amine-n-oxidation', group: 'Nitrogen',
    match(t) {
      return retro3AmineSites(t.graph, true).slice(0, RETRO_LIMITS.maxPerTransform).map((n) => {
        const oxygen = rxNeighbors(t.graph, n.id).find((x) => x.atom.element === 'O').atom.id;
        return retro3One(t, (g) => { g.removeAtom(oxygen); g.getAtom(n.id).charge = 0; }, [RETRO_REAGENTS.mcpba], { solvents: ['dcm'], temperature: 20 });
      }).filter(Boolean);
    } },
  { id: 'amine-oxide-deoxygenation', name: 'Tertiary amine from amine oxide', rule: 'amine-oxide-deoxygenation', group: 'Nitrogen',
    match(t) {
      return retro3AmineSites(t.graph, false).slice(0, RETRO_LIMITS.maxPerTransform).map((n) => retro3One(t, (g) => {
        g.getAtom(n.id).charge = 1; const o = rxAttach(g, 'O', n.id); o.charge = -1;
      }, [{ smiles: 'CC(=O)OC=O', role: 'reagent', label: 'Acetic formic anhydride' }], { solvents: ['dcm'], temperature: 20 })).filter(Boolean);
    } },
  { id: 'sulfoxide-deoxygenation', name: 'Aryl sulfide from sulfoxide', rule: 'sulfoxide-deoxygenation', group: 'Sulfur',
    match(t) {
      return rx4SimpleSulfur(t.graph, 0).slice(0, RETRO_LIMITS.maxPerTransform).map((s) => retro3One(t,
        (g) => { rxAttach(g, 'O', s, 2); }, [{ smiles: 'ClP(Cl)Cl', role: 'reagent', label: 'PCl3' }], { solvents: ['dcm'], temperature: 20 })).filter(Boolean);
    } },
  { id: 'thiol-acylation', name: 'Thioester from thiol and acyl chloride', rule: 'thiol-acylation', group: 'Sulfur',
    match(t) {
      return t.info.carbonyls.filter((c) => c.hetero !== null && t.graph.getAtom(c.hetero).element === 'S').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => {
        const pieces = retroEdit(t, (g) => { if (!retroCut(g, c.c, c.hetero)) return false; rxAttach(g, 'Cl', c.c); });
        return pieces && pieces.length === 2 ? retroSpec(retroReactants(pieces), [], { solvents: ['dcm'], additives: ['et3n'], temperature: 20 }) : null;
      }).filter(Boolean);
    } },
  { id: 'thioester-hydrolysis', name: 'Carboxylic acid from methyl thioester', rule: 'thioester-hydrolysis', group: 'Hydrolysis',
    match(t) {
      return t.info.carbonyls.filter((c) => c.kind === 'acid').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => retro3One(t, (g) => {
        g.getAtom(c.hetero).element = 'S'; rxAttach(g, 'C', c.hetero);
      }, [], { solvents: ['water'], additives: ['hcl'], temperature: 80 })).filter(Boolean);
    } },
  { id: 'sulfonyl-chloride-hydrolysis', name: 'Sulfonic acid from sulfonyl chloride', rule: 'sulfonyl-chloride-hydrolysis', group: 'Sulfur',
    match(t) {
      return t.graph.atoms.filter((s) => {
        const n = rxNeighbors(t.graph, s.id);
        return s.element === 'S' && !s.charge && n.length === 4 && n.filter((x) => x.atom.element === 'O' && x.bond.order === 2).length === 2 &&
          n.filter((x) => x.atom.element === 'C' && x.bond.order === 1).length === 1 && n.some((x) => x.atom.element === 'O' && x.bond.order === 1 && rxHydrogens(t.graph, x.atom.id) === 1);
      }).slice(0, RETRO_LIMITS.maxPerTransform).map((s) => {
        const oxygen = rxNeighbors(t.graph, s.id).find((x) => x.atom.element === 'O' && x.bond.order === 1).atom.id;
        return retro3One(t, (g) => { g.getAtom(oxygen).element = 'Cl'; }, [], { solvents: ['water'], temperature: 20 });
      }).filter(Boolean);
    } },
  { id: 'nitrile-peroxide-hydration', name: 'Primary amide from nitrile', rule: 'nitrile-peroxide-hydration', group: 'Amides',
    match(t) {
      return t.info.carbonyls.filter((c) => c.kind === 'amide' && rxHydrogens(t.graph, c.hetero) === 2).slice(0, RETRO_LIMITS.maxPerTransform).map((c) => retro3One(t,
        (g) => { g.removeAtom(c.o); return retroOrder(g, c.c, c.hetero, 3); }, [{ smiles: 'OO', role: 'reagent', label: 'H2O2' }],
        { solvents: ['dmso', 'water'], additives: ['naoh'], temperature: 20 })).filter(Boolean);
    } },
  { id: 'thiol-ene', name: 'Thioether from terminal alkene and thiol', rule: 'thiol-ene', group: 'Sulfur',
    match(t) {
      return rx4SimpleSulfur(t.graph, 0).slice(0, RETRO_LIMITS.maxPerTransform).flatMap((s) => rxNeighbors(t.graph, s).flatMap((end) => {
        if (rxHydrogens(t.graph, end.atom.id) !== 2) return [];
        return rxCarbonNeighbors(t.graph, end.atom.id).filter((inner) => rxHydrogens(t.graph, inner.atom.id) >= 2 && inner.bond.order === 1).map((inner) => {
          const pieces = retroEdit(t, (g) => { if (!retroCut(g, s, end.atom.id)) return false; return retroOrder(g, end.atom.id, inner.atom.id, 2); });
          return pieces && pieces.length === 2 ? retroSpec(retroReactants(pieces), [], { solvents: ['dcm'], energy: 'light', temperature: 20 }) : null;
        }).filter(Boolean);
      }));
    } }
);
