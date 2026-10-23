RETRO_TRANSFORMS.push({ id: 'amino-acid-lactamization', name: 'Lactam from tethered amino acid', rule: 'amino-acid-lactamization', group: 'Cyclization',
  match(t) {
    return t.info.carbonyls.filter(c => c.kind === 'amide').slice(0, RETRO_LIMITS.maxPerTransform).flatMap(c => {
      const nitrogens = rxNeighbors(t.graph, c.c).filter(n => n.atom.element === 'N' && n.bond.order === 1);
      return nitrogens.map(n => {
        const piece = retroSinglePiece(t, g => { rxSetOrder(g, c.c, n.atom.id, 0); rxAttach(g, 'O', c.c); });
        return piece && retroSpec([{smiles:piece.smiles,role:'reactant'}], [{smiles:'C1CCC(CC1)N=C=NC1CCCCC1',role:'reagent',label:'DCC'}], {solvents:['dmf'],temperature:25});
      }).filter(Boolean);
    });
  } });
