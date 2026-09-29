const RETRO_LIMITS = { maxDepth: 3, budgetMs: 1500, maxHeavy: 60, maxPerTransform: 4, maxCandidates: 30, maxGrignardCarbons: 12 };

const RETRO_REAGENTS = {
  water: { smiles: 'O', role: 'solvent', label: 'H2O' },
  borane: { smiles: 'B', role: 'reagent', label: 'BH3; H2O2, NaOH' },
  nabh4: { smiles: '[Na+].[BH4-]', role: 'reagent', label: 'NaBH4' },
  hydroxide: { smiles: '[Na+].[OH-]', role: 'reagent', label: 'NaOH' },
  socl2: { smiles: 'ClS(Cl)=O', role: 'reagent', label: 'SOCl2' },
  pbr3: { smiles: 'BrP(Br)Br', role: 'reagent', label: 'PBr3' },
  Cl: { smiles: 'Cl', role: 'reagent', label: 'HCl' },
  Br: { smiles: 'Br', role: 'reagent', label: 'HBr' },
  I: { smiles: 'I', role: 'reagent', label: 'HI' },
  h2: { smiles: '[H][H]', role: 'reagent', label: 'H2' },
  pcc: { smiles: '[O-][Cr](=O)(=O)Cl.c1cc[nH+]cc1', role: 'reagent', label: 'PCC' },
  kmno4: { smiles: '[O-][Mn](=O)(=O)=O.[K+]', role: 'reagent', label: 'KMnO4' },
  cyanide: { smiles: '[C-]#N.[Na+]', role: 'reagent', label: 'NaCN' },
  mcpba: { smiles: 'OOC(=O)c1cccc(Cl)c1', role: 'reagent', label: 'mCPBA' },
  ethoxide: { smiles: 'CC[O-].[Na+]', role: 'reagent', label: 'NaOEt' },
  tertButoxide: { smiles: 'CC(C)(C)[O-].[K+]', role: 'reagent', label: 'KOtBu' },
  bromine: { smiles: 'BrBr', role: 'reagent', label: 'Br2' },
  chlorine: { smiles: 'ClCl', role: 'reagent', label: 'Cl2' },
  cyanoborohydride: { smiles: '[Na+].[BH3-]C#N', role: 'reagent', label: 'NaBH3CN' },
};

function retroIds(g) {
  return g.atoms.map((a) => a.id);
}

function retroClone(graph, ids) {
  const keep = new Set((ids || retroIds(graph)).filter((id) => {
    const a = graph.getAtom(id);
    return a && a.element !== 'H';
  }));
  const g = new Graph();
  const map = new Map();
  graph.atoms.forEach((a) => {
    if (!keep.has(a.id)) {
      return;
    }
    const b = g.addAtom(a.element, a.x || 0, a.y || 0);
    if (a.charge) {
      b.charge = a.charge;
    }
    map.set(a.id, b.id);
  });
  graph.bonds.forEach((b) => {
    if (map.has(b.atomA) && map.has(b.atomB)) {
      const bond = g.addBond(map.get(b.atomA), map.get(b.atomB));
      if (bond) {
        bond.order = b.order;
      }
    }
  });
  return g;
}

function retroCanonical(g, ids) {
  try {
    return computeProperties(g, ids || retroIds(g)).smiles || '';
  } catch (error) {
    return '';
  }
}

function retroFromSmiles(smiles) {
  return reactionFragmentGraph(smilesToFragment(smiles));
}

function retroCanonicalSmiles(smiles) {
  try {
    return retroCanonical(retroFromSmiles(smiles));
  } catch (error) {
    return '';
  }
}

function retroSkeleton(g, ids) {
  return (ids || retroIds(g)).filter((id) => ['C', 'N', 'O', 'S', 'P'].includes(g.getAtom(id).element)).length;
}

function retroStereocentres(g, ids) {
  try {
    return findStereocenters(g, ids || retroIds(g)).length;
  } catch (error) {
    return 0;
  }
}

function retroSide(g, from, to) {
  const seen = new Set([to]);
  const queue = [to];
  while (queue.length) {
    const id = queue.shift();
    for (const n of rxNeighbors(g, id)) {
      const next = n.atom.id;
      if (id === to && next === from) {
        continue;
      }
      if (next === from) {
        return null;
      }
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function retroCut(g, a, b) {
  const bond = g.getBond(a, b);
  if (!bond || !retroSide(g, a, b)) {
    return false;
  }
  g.removeBond(bond.id);
  return true;
}

function retroOrder(g, a, b, order) {
  const bond = g.getBond(a, b);
  if (!bond) {
    return false;
  }
  bond.order = order;
  return true;
}

function retroAttachPhenyl(g, to) {
  const ring = [];
  for (let i = 0; i < 6; i++) {
    ring.push(g.addAtom('C', 0, 0).id);
  }
  ring.forEach((id, i) => {
    g.addBond(id, ring[(i + 1) % 6]).order = i % 2 === 0 ? 2 : 1;
  });
  g.addBond(to, ring[0]);
}

function retroValid(g) {
  return g.atoms.every((a) => maxValenceFor(a.element) <= 0 || atomValenceOk(g, a.id));
}

function retroPieces(g) {
  return g.connectedComponents().map((c) => ({
    smiles: retroCanonical(g, c.atomIds),
    elements: new Set(c.atomIds.map((id) => g.getAtom(id).element)),
    carbon: c.atomIds.some((id) => g.getAtom(id).element === 'C'),
  })).filter((p) => p.smiles);
}

function retroEdit(t, edit) {
  const g = retroClone(t.graph);
  if (edit(g) === false || !retroValid(g)) {
    return null;
  }
  const pieces = retroPieces(g);
  return pieces.length ? pieces : null;
}

function retroSpec(precursors, reagents, conditions) {
  return { precursors, reagents: reagents || [], conditions: conditions || {} };
}

function retroReactants(pieces, roles) {
  return pieces.map((p, i) => ({ smiles: p.smiles, role: (roles && roles[i]) || 'reactant' }));
}

function retroSinglePiece(t, edit) {
  const pieces = retroEdit(t, edit);
  return pieces && pieces.length === 1 ? pieces[0] : null;
}

function retroUniquePieces(list) {
  const seen = new Set();
  return list.filter((p) => {
    if (!p || seen.has(p.smiles)) {
      return false;
    }
    seen.add(p.smiles);
    return true;
  }).slice(0, RETRO_LIMITS.maxPerTransform);
}

function retroAlcoholAlkenes(t) {
  const g = t.graph;
  const list = [];
  t.info.alcohols.forEach((al) => {
    rxCarbonNeighbors(g, al.c).forEach((n) => {
      if (!rxIsSp3(g, n.atom.id) || rxHydrogens(g, n.atom.id) < 1) {
        return;
      }
      list.push(retroSinglePiece(t, (h) => {
        h.removeAtom(al.o);
        retroOrder(h, al.c, n.atom.id, 2);
      }));
    });
  });
  return retroUniquePieces(list);
}

function retroHalideAlkenes(t) {
  const g = t.graph;
  const list = [];
  t.info.halides.forEach((hx) => {
    rxCarbonNeighbors(g, hx.c).forEach((n) => {
      if (!rxIsSp3(g, n.atom.id) || rxHydrogens(g, n.atom.id) < 1) {
        return;
      }
      const piece = retroSinglePiece(t, (h) => {
        h.removeAtom(hx.x);
        retroOrder(h, hx.c, n.atom.id, 2);
      });
      if (piece) {
        list.push(Object.assign(piece, { halogen: hx.halogen }));
      }
    });
  });
  return retroUniquePieces(list);
}

function retroAlkeneEnds(t) {
  const out = [];
  t.info.alkenes.forEach((e) => {
    [[e.a, e.b], [e.b, e.a]].forEach(([x, y]) => out.push({ x, y }));
  });
  return out;
}

function retroDehydrationTemperature(degree) {
  if (degree >= 3) {
    return Math.max(25, RX_TEMPERATURES.dehydrationTertiary);
  }
  return degree === 2 ? RX_TEMPERATURES.dehydrationSecondary + 10 : RX_TEMPERATURES.dehydrationPrimary + 10;
}

function retroGrignardLabel(smiles) {
  try {
    const g = retroFromSmiles(smiles);
    return computeProperties(g, retroIds(g)).formula.replace('BrMg', 'MgBr');
  } catch (error) {
    return smiles;
  }
}

function retroAmineNitrogens(t) {
  const g = t.graph;
  return g.atoms.filter((a) => a.element === 'N' && !a.charge && rxNeighbors(g, a.id).length &&
    rxNeighbors(g, a.id).every((n) => n.bond.order === 1 && n.atom.element === 'C' &&
      !rxNeighbors(g, n.atom.id).some((m) => m.bond.order >= 2 && m.atom.element !== 'C'))).map((a) => a.id);
}

function retroSixRings(t, a1, a2) {
  const g = t.graph;
  const out = [];
  const step = (from, prev, avoid) => rxNeighbors(g, from).filter((n) => n.atom.element === 'C' && n.bond.order === 1 && n.atom.id !== prev && !avoid.includes(n.atom.id)).map((n) => n.atom.id);
  step(a2, a1, [a1]).forEach((a3) => {
    step(a3, a2, [a1, a2]).forEach((a4) => {
      step(a4, a3, [a1, a2, a3]).forEach((a5) => {
        step(a5, a4, [a1, a2, a3, a4]).forEach((a6) => {
          const close = g.getBond(a6, a1);
          if (close && close.order === 1) {
            out.push([a1, a2, a3, a4, a5, a6]);
          }
        });
      });
    });
  });
  return out;
}

const RETRO_TRANSFORMS = [
  {
    id: 'hydration', name: 'Alkene hydration', rule: 'hydration', group: 'Alcohols',
    match: (t) => retroAlcoholAlkenes(t).map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.water], { additives: ['h2so4'] })),
  },
  {
    id: 'hydroboration', name: 'Hydroboration–oxidation', rule: 'hydroboration', group: 'Alcohols',
    match: (t) => retroAlcoholAlkenes(t).map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.borane], {})),
  },
  {
    id: 'carbonyl-reduction', name: 'Carbonyl reduction', rule: 'reduction', group: 'Alcohols',
    match: (t) => retroUniquePieces(t.info.alcohols.filter((al) => rxHydrogens(t.graph, al.c) >= 1)
      .map((al) => retroSinglePiece(t, (h) => retroOrder(h, al.c, al.o, 2))))
      .map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.nabh4], { solvents: ['methanol'] })),
  },
  {
    id: 'grignard', name: 'Grignard addition', rule: 'grignard', group: 'Alcohols',
    match: (t) => {
      const g = t.graph;
      const out = [];
      t.info.alcohols.forEach((al) => {
        rxCarbonNeighbors(g, al.c).forEach((n) => {
          const side = retroSide(g, al.c, n.atom.id);
          if (!side || side.size > RETRO_LIMITS.maxGrignardCarbons || [...side].some((id) => g.getAtom(id).element !== 'C')) {
            return;
          }
          const pieces = retroEdit(t, (h) => {
            if (!retroCut(h, al.c, n.atom.id)) {
              return false;
            }
            retroOrder(h, al.c, al.o, 2);
            const mg = rxAttach(h, 'Mg', n.atom.id);
            rxAttach(h, 'Br', mg.id);
            return true;
          });
          if (!pieces || pieces.length !== 2) {
            return;
          }
          const reagent = pieces.find((p) => p.elements.has('Mg'));
          const carbonyl = pieces.find((p) => p !== reagent);
          if (reagent && carbonyl) {
            out.push(retroSpec([{ smiles: carbonyl.smiles, role: 'reactant' }, { smiles: reagent.smiles, role: 'reagent', label: retroGrignardLabel(reagent.smiles) }], [], { solvents: ['ether'] }));
          }
        });
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'alcohol-sn2', name: 'Hydroxide substitution', rule: 'halide', group: 'Alcohols',
    match: (t) => retroUniquePieces(t.info.alcohols.filter((al) => al.degree <= 1)
      .map((al) => retroSinglePiece(t, (h) => {
        h.getAtom(al.o).element = 'Br';
      })))
      .map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.hydroxide], { solvents: ['dmso'] })),
  },
  {
    id: 'halide-from-alcohol', name: 'Alcohol → alkyl halide', rule: 'alcohol-halide', group: 'Halides',
    match: (t) => t.info.halides.slice(0, RETRO_LIMITS.maxPerTransform).map((hx) => {
      const piece = retroSinglePiece(t, (h) => {
        h.getAtom(hx.x).element = 'O';
      });
      if (!piece) {
        return null;
      }
      const reagent = hx.degree >= 3 || hx.halogen === 'I' ? RETRO_REAGENTS[hx.halogen] : hx.halogen === 'Cl' ? RETRO_REAGENTS.socl2 : RETRO_REAGENTS.pbr3;
      return retroSpec([{ smiles: piece.smiles, role: 'reactant' }], [reagent], {});
    }).filter(Boolean),
  },
  {
    id: 'hx-addition', name: 'HX addition to an alkene', rule: 'hydrohalogenation', group: 'Halides',
    match: (t) => {
      const out = [];
      retroHalideAlkenes(t).forEach((p) => {
        out.push(retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS[p.halogen]], {}));
        if (p.halogen === 'Br') {
          out.push(retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.Br], { additives: ['peroxide'] }));
        }
      });
      return out;
    },
  },
  {
    id: 'williamson', name: 'Williamson ether synthesis', rule: 'williamson', group: 'Ethers',
    match: (t) => {
      const g = t.graph;
      const out = [];
      const seen = new Set();
      g.atoms.filter((o) => o.element === 'O' && !o.charge).forEach((o) => {
        const n = rxNeighbors(g, o.id);
        if (n.length !== 2 || !n.every((x) => x.atom.element === 'C' && x.bond.order === 1 && rxIsSp3(g, x.atom.id) && !t.aromatic.has(x.atom.id))) {
          return;
        }
        n.forEach((x) => {
          if (rxCarbonNeighbors(g, x.atom.id).length > 1) {
            return;
          }
          const pieces = retroEdit(t, (h) => {
            if (!retroCut(h, o.id, x.atom.id)) {
              return false;
            }
            rxAttach(h, 'Br', x.atom.id);
            return true;
          });
          if (!pieces || pieces.length !== 2) {
            return;
          }
          const key = pieces.map((p) => p.smiles).sort().join('.');
          if (!seen.has(key)) {
            seen.add(key);
            out.push(retroSpec(retroReactants(pieces), [], { additives: ['nah'], solvents: ['thf'] }));
          }
        });
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'fischer', name: 'Fischer esterification', rule: 'fischer', group: 'Esters',
    match: (t) => t.info.carbonyls.filter((c) => c.kind === 'ester').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => {
      const pieces = retroEdit(t, (h) => {
        if (!retroCut(h, c.c, c.hetero)) {
          return false;
        }
        rxAttach(h, 'O', c.c);
        return true;
      });
      return pieces && pieces.length === 2 ? retroSpec(retroReactants(pieces), [], { additives: ['h2so4'], temperature: 80 }) : null;
    }).filter(Boolean),
  },
  {
    id: 'ester-acyl-chloride', name: 'Ester from an acid chloride', rule: 'acyl', group: 'Esters',
    match: (t) => t.info.carbonyls.filter((c) => c.kind === 'ester').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => {
      const pieces = retroEdit(t, (h) => {
        if (!retroCut(h, c.c, c.hetero)) {
          return false;
        }
        rxAttach(h, 'Cl', c.c);
        return true;
      });
      return pieces && pieces.length === 2 ? retroSpec(retroReactants(pieces), [], { additives: ['pyr'] }) : null;
    }).filter(Boolean),
  },
  {
    id: 'amide-acyl-chloride', name: 'Amide from an acid chloride', rule: 'acyl', group: 'Amides',
    match: (t) => t.info.carbonyls.filter((c) => c.kind === 'amide').slice(0, RETRO_LIMITS.maxPerTransform).map((c) => {
      const pieces = retroEdit(t, (h) => {
        if (!retroCut(h, c.c, c.hetero)) {
          return false;
        }
        rxAttach(h, 'Cl', c.c);
        return true;
      });
      return pieces && pieces.length === 2 ? retroSpec(retroReactants(pieces), [], {}) : null;
    }).filter(Boolean),
  },
  {
    id: 'dehydration', name: 'Alcohol dehydration', rule: 'dehydration', group: 'Alkenes',
    match: (t) => {
      const g = t.graph;
      const list = [];
      retroAlkeneEnds(t).forEach(({ x, y }) => {
        const piece = retroSinglePiece(t, (h) => {
          retroOrder(h, x, y, 1);
          rxAttach(h, 'O', x);
        });
        if (piece) {
          list.push(Object.assign(piece, { degree: rxCarbonNeighbors(g, x).length }));
        }
      });
      return retroUniquePieces(list).map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [], { additives: ['h2so4'], temperature: retroDehydrationTemperature(p.degree) }));
    },
  },
  {
    id: 'e2', name: 'E2 elimination', rule: 'halide', group: 'Alkenes',
    match: (t) => {
      const out = [];
      retroUniquePieces(retroAlkeneEnds(t).map(({ x, y }) => retroSinglePiece(t, (h) => {
        retroOrder(h, x, y, 1);
        rxAttach(h, 'Br', x);
      }))).forEach((p) => {
        out.push(retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.ethoxide], {}));
        out.push(retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.tertButoxide], {}));
      });
      return out;
    },
  },
  {
    id: 'wittig', name: 'Wittig olefination', rule: 'wittig', group: 'Alkenes',
    match: (t) => {
      const out = [];
      retroAlkeneEnds(t).forEach(({ x, y }) => {
        const pieces = retroEdit(t, (h) => {
          if (!retroCut(h, x, y)) {
            return false;
          }
          rxAttach(h, 'O', x, 2);
          const p = rxAttach(h, 'P', y, 2);
          retroAttachPhenyl(h, p.id);
          retroAttachPhenyl(h, p.id);
          retroAttachPhenyl(h, p.id);
          return true;
        });
        if (!pieces || pieces.length !== 2) {
          return;
        }
        const ylide = pieces.find((p) => p.elements.has('P'));
        const carbonyl = pieces.find((p) => p !== ylide);
        if (ylide && carbonyl) {
          out.push(retroSpec([{ smiles: carbonyl.smiles, role: 'reactant' }, { smiles: ylide.smiles, role: 'reactant' }], [], { solvents: ['thf'] }));
        }
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'hydrogenation', name: 'Alkene hydrogenation', rule: 'hydrogenation', group: 'Alkanes',
    match: (t) => {
      const g = t.graph;
      if (t.info.alkenes.length || t.info.alkynes.length) {
        return [];
      }
      const list = [];
      g.bonds.forEach((b) => {
        const ok = (id) => g.getAtom(id).element === 'C' && !t.aromatic.has(id) && rxIsSp3(g, id) && rxHydrogens(g, id) >= 1 &&
          rxNeighbors(g, id).every((n) => n.atom.element === 'C');
        if (b.order === 1 && ok(b.atomA) && ok(b.atomB)) {
          list.push(retroSinglePiece(t, (h) => retroOrder(h, b.atomA, b.atomB, 2)));
        }
      });
      return retroUniquePieces(list).map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.h2], { additives: ['pdc'] }));
    },
  },
  {
    id: 'alcohol-oxidation', name: 'Alcohol oxidation', rule: 'oxidation', group: 'Carbonyls',
    match: (t) => retroUniquePieces(t.info.carbonyls.filter((c) => c.kind === 'ketone' || c.kind === 'aldehyde')
      .map((c) => retroSinglePiece(t, (h) => retroOrder(h, c.c, c.o, 1))))
      .map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.pcc], {})),
  },
  {
    id: 'acid-oxidation', name: 'Oxidation to the acid', rule: 'oxidation', group: 'Carbonyls',
    match: (t) => {
      const g = t.graph;
      const out = [];
      t.info.carbonyls.filter((c) => c.kind === 'acid').slice(0, RETRO_LIMITS.maxPerTransform).forEach((c) => {
        const alcohol = retroSinglePiece(t, (h) => {
          h.removeAtom(c.hetero);
          retroOrder(h, c.c, c.o, 1);
        });
        if (alcohol) {
          out.push(retroSpec([{ smiles: alcohol.smiles, role: 'reactant' }], [RETRO_REAGENTS.kmno4], {}));
        }
        if (rxCarbonNeighbors(g, c.c).some((n) => t.aromatic.has(n.atom.id))) {
          const methyl = retroSinglePiece(t, (h) => {
            h.removeAtom(c.hetero);
            h.removeAtom(c.o);
          });
          if (methyl) {
            out.push(retroSpec([{ smiles: methyl.smiles, role: 'reactant' }], [RETRO_REAGENTS.kmno4], { temperature: 100 }));
          }
        }
      });
      return out;
    },
  },
  {
    id: 'nitrile-hydrolysis', name: 'Nitrile hydrolysis', rule: 'nitrile-hydrolysis', group: 'Carbonyls',
    match: (t) => retroUniquePieces(t.info.carbonyls.filter((c) => c.kind === 'acid' && rxNeighbors(t.graph, c.c).length === 3)
      .map((c) => retroSinglePiece(t, (h) => {
        h.removeAtom(c.hetero);
        h.getAtom(c.o).element = 'N';
        retroOrder(h, c.c, c.o, 3);
      })))
      .map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [], { additives: ['h2so4'], solvents: ['water'], temperature: 100 })),
  },
  {
    id: 'nitrile-sn2', name: 'Cyanide substitution', rule: 'halide', group: 'Carbonyls',
    match: (t) => {
      const g = t.graph;
      const list = [];
      t.info.nitriles.forEach((nt) => {
        rxCarbonNeighbors(g, nt.c).filter((r) => rxIsSp3(g, r.atom.id) && rxCarbonNeighbors(g, r.atom.id).length <= 2).forEach((r) => {
          list.push(retroSinglePiece(t, (h) => {
            h.removeAtom(nt.n);
            h.removeAtom(nt.c);
            rxAttach(h, 'Br', r.atom.id);
          }));
        });
      });
      return retroUniquePieces(list).map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.cyanide], { solvents: ['dmso'] }));
    },
  },
  {
    id: 'aldol', name: 'Aldol reaction', rule: 'aldol', group: 'C–C bonds',
    match: (t) => {
      const g = t.graph;
      const out = [];
      const seen = new Set();
      const push = (pieces, temperature) => {
        if (!pieces || pieces.length < 1 || pieces.length > 2) {
          return;
        }
        const unique = retroUniquePieces(pieces);
        const key = unique.map((p) => p.smiles).sort().join('.') + '@' + temperature;
        if (!seen.has(key)) {
          seen.add(key);
          out.push(retroSpec(retroReactants(unique), [], { additives: ['naoh'], solvents: ['ethanol'], temperature }));
        }
      };
      t.info.carbonyls.filter((c) => c.kind === 'ketone' || c.kind === 'aldehyde').forEach((c) => {
        rxCarbonNeighbors(g, c.c).forEach((alpha) => {
          rxNeighbors(g, alpha.atom.id).filter((b) => b.atom.element === 'C' && b.atom.id !== c.c).forEach((beta) => {
            if (beta.bond.order === 1) {
              const al = t.info.alcohols.find((x) => x.c === beta.atom.id);
              if (al && rxIsSp3(g, alpha.atom.id)) {
                push(retroEdit(t, (h) => {
                  if (!retroCut(h, alpha.atom.id, beta.atom.id)) {
                    return false;
                  }
                  retroOrder(h, beta.atom.id, al.o, 2);
                  return true;
                }), 5);
              }
            } else if (beta.bond.order === 2) {
              push(retroEdit(t, (h) => {
                if (!retroCut(h, alpha.atom.id, beta.atom.id)) {
                  return false;
                }
                rxAttach(h, 'O', beta.atom.id, 2);
                return true;
              }), 80);
            }
          });
        });
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'diels-alder', name: 'Diels–Alder', rule: 'diels-alder', group: 'C–C bonds',
    match: (t) => {
      const out = [];
      const seen = new Set();
      t.info.alkenes.forEach((e) => {
        [[e.a, e.b], [e.b, e.a]].forEach(([a1, a2]) => {
          retroSixRings(t, a1, a2).forEach(([, , a3, a4, a5, a6]) => {
            const pieces = retroEdit(t, (h) => {
              h.removeBond(h.getBond(a3, a4).id);
              h.removeBond(h.getBond(a5, a6).id);
              retroOrder(h, a1, a2, 1);
              retroOrder(h, a6, a1, 2);
              retroOrder(h, a2, a3, 2);
              retroOrder(h, a4, a5, 2);
              return true;
            });
            if (!pieces || pieces.length !== 2) {
              return;
            }
            const key = pieces.map((p) => p.smiles).sort().join('.');
            if (!seen.has(key)) {
              seen.add(key);
              out.push(retroSpec(retroReactants(pieces), [], { temperature: 100 }));
            }
          });
        });
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'alkyne-alkylation', name: 'Acetylide alkylation', rule: 'acetylide', group: 'C–C bonds',
    match: (t) => {
      const g = t.graph;
      const out = [];
      t.info.alkynes.forEach((e) => {
        [[e.a, e.b], [e.b, e.a]].forEach(([x, other]) => {
          rxCarbonNeighbors(g, x, other).filter((r) => rxIsSp3(g, r.atom.id) && rxCarbonNeighbors(g, r.atom.id).length <= 2).forEach((r) => {
            const pieces = retroEdit(t, (h) => {
              if (!retroCut(h, x, r.atom.id)) {
                return false;
              }
              rxAttach(h, 'Br', r.atom.id);
              return true;
            });
            if (pieces && pieces.length === 2) {
              out.push(retroSpec(retroReactants(pieces), [], { additives: ['nanh2'] }));
            }
          });
        });
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'epoxidation', name: 'Epoxidation', rule: 'epoxidation', group: 'C–C bonds',
    match: (t) => retroUniquePieces(t.info.epoxides.filter((ep) => t.graph.getBond(ep.a, ep.b))
      .map((ep) => retroSinglePiece(t, (h) => {
        h.removeAtom(ep.o);
        retroOrder(h, ep.a, ep.b, 2);
      })))
      .map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.mcpba], {})),
  },
  {
    id: 'dihydroxylation', name: 'Dihydroxylation', rule: 'osmium', group: 'C–C bonds',
    match: (t) => {
      const list = [];
      t.info.alcohols.forEach((p, i) => {
        t.info.alcohols.slice(i + 1).forEach((q) => {
          const bond = t.graph.getBond(p.c, q.c);
          if (bond && bond.order === 1) {
            list.push(retroSinglePiece(t, (h) => {
              h.removeAtom(p.o);
              h.removeAtom(q.o);
              retroOrder(h, p.c, q.c, 2);
            }));
          }
        });
      });
      return retroUniquePieces(list).map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [], { additives: ['oso4', 'nmo'] }));
    },
  },
  {
    id: 'eas-halogenation', name: 'Aromatic halogenation', rule: 'aromatic', group: 'Aromatics',
    match: (t) => {
      const list = [];
      t.info.arylHalides.filter((ax) => t.aromatic.has(ax.c) && ['Br', 'Cl'].includes(t.graph.getAtom(ax.x).element)).forEach((ax) => {
        const piece = retroSinglePiece(t, (h) => {
          h.removeAtom(ax.x);
        });
        if (piece) {
          list.push(Object.assign(piece, { halogen: t.graph.getAtom(ax.x).element }));
        }
      });
      return retroUniquePieces(list).map((p) => p.halogen === 'Br'
        ? retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.bromine], { additives: ['febr3'] })
        : retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.chlorine], { additives: ['alcl3'] }));
    },
  },
  {
    id: 'fc-acylation', name: 'Friedel–Crafts acylation', rule: 'aromatic', group: 'Aromatics',
    match: (t) => {
      const g = t.graph;
      const out = [];
      t.info.carbonyls.filter((c) => c.kind === 'ketone').forEach((c) => {
        rxCarbonNeighbors(g, c.c).filter((n) => t.aromatic.has(n.atom.id)).forEach((ar) => {
          const pieces = retroEdit(t, (h) => {
            if (!retroCut(h, c.c, ar.atom.id)) {
              return false;
            }
            rxAttach(h, 'Cl', c.c);
            return true;
          });
          if (pieces && pieces.length === 2) {
            out.push(retroSpec(retroReactants(pieces), [], { additives: ['alcl3'] }));
          }
        });
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'nitro-reduction', name: 'Nitro reduction', rule: 'nitro-reduction', group: 'Aromatics',
    match: (t) => {
      const g = t.graph;
      return retroUniquePieces(g.atoms.filter((a) => a.element === 'N' && !a.charge && rxHydrogens(g, a.id) === 2 &&
        rxNeighbors(g, a.id).length === 1 && t.aromatic.has(rxNeighbors(g, a.id)[0].atom.id)).map((a) => retroSinglePiece(t, (h) => {
        h.getAtom(a.id).charge = 1;
        rxAttach(h, 'O', a.id, 2);
        rxAttach(h, 'O', a.id, 1, -1);
      }))).map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [], { additives: ['fe', 'hcl'] }));
    },
  },
  {
    id: 'reductive-amination', name: 'Reductive amination', rule: 'imine', group: 'Aromatics',
    match: (t) => {
      const g = t.graph;
      const out = [];
      const seen = new Set();
      retroAmineNitrogens(t).forEach((n) => {
        rxNeighbors(g, n).forEach((c) => {
          if (t.aromatic.has(c.atom.id) || !rxIsSp3(g, c.atom.id) || rxHydrogens(g, c.atom.id) < 1 || !rxCarbonNeighbors(g, c.atom.id).length) {
            return;
          }
          const pieces = retroEdit(t, (h) => {
            if (!retroCut(h, n, c.atom.id)) {
              return false;
            }
            rxAttach(h, 'O', c.atom.id, 2);
            return true;
          });
          if (!pieces || pieces.length !== 2) {
            return;
          }
          const key = pieces.map((p) => p.smiles).sort().join('.');
          if (!seen.has(key)) {
            seen.add(key);
            out.push(retroSpec(retroReactants(pieces), [RETRO_REAGENTS.cyanoborohydride], { solvents: ['methanol'] }));
          }
        });
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
];

const RETRO_DROPPED_TRANSFORMS = [
  { id: 'eas-nitration', name: 'Aromatic nitration', reason: 'The forward engine has no nitration rule (HNO₃/H₂SO₄ is not recognised), so a nitration step could never be verified.' },
];

let retroCommonCache = null;

function retroCommonNames() {
  if (retroCommonCache) {
    return retroCommonCache;
  }
  retroCommonCache = new Map();
  Object.keys(typeof NAME_SMILES === 'object' && NAME_SMILES ? NAME_SMILES : {}).forEach((name) => {
    const smiles = retroCanonicalSmiles(NAME_SMILES[name]);
    if (smiles && !retroCommonCache.has(smiles)) {
      retroCommonCache.set(smiles, name);
    }
  });
  return retroCommonCache;
}

function retroCommonName(smiles) {
  return retroCommonNames().get(smiles) || null;
}

function retroCompound(item) {
  const compound = { input: item.smiles, smiles: item.smiles, fragment: smilesToFragment(item.smiles), role: item.role || 'reactant', equiv: '1' };
  if (item.label) {
    compound.label = item.label;
  }
  return compound;
}

function retroFindProduct(list, smiles) {
  return (list || []).find((p) => p && p.smiles === smiles) || null;
}

function retroVerify(spec, targetSmiles) {
  let compounds = null;
  try {
    compounds = spec.precursors.concat(spec.reagents).map(retroCompound);
  } catch (error) {
    return null;
  }
  const conditions = normalizeReactionConditions(spec.conditions);
  const result = predictReaction(compounds, conditions);
  if (!result.best) {
    return null;
  }
  const main = retroFindProduct(result.best.products, targetSmiles);
  if (main) {
    return { compounds, conditions, outcome: result.best, product: main, minor: false };
  }
  const minorOfBest = retroFindProduct(result.best.minor, targetSmiles);
  if (minorOfBest) {
    return { compounds, conditions, outcome: result.best, product: minorOfBest, minor: true };
  }
  for (const alt of result.alternatives) {
    const hit = retroFindProduct(alt.products, targetSmiles) || retroFindProduct(alt.minor, targetSmiles);
    if (hit) {
      return { compounds, conditions, outcome: alt, product: hit, minor: true };
    }
  }
  return null;
}

function retroSpecKey(spec) {
  return JSON.stringify([spec.precursors.map((p) => p.smiles + '@' + p.role).sort(), spec.reagents.map((r) => r.smiles).sort(), normalizeReactionConditions(spec.conditions)]);
}

function retroPrecursorInfo(item) {
  const g = retroFromSmiles(item.smiles);
  const ids = retroIds(g);
  return {
    smiles: item.smiles,
    role: item.role,
    label: item.label || '',
    skeleton: retroSkeleton(g, ids),
    stereocentres: retroStereocentres(g, ids),
    common: retroCommonName(item.smiles),
  };
}

function retroCompare(p, q) {
  return p.rank.largest - q.rank.largest
    || p.rank.stereocentres - q.rank.stereocentres
    || q.rank.common - p.rank.common
    || (p.minor ? 1 : 0) - (q.minor ? 1 : 0)
    || p.rank.total - q.rank.total;
}

function retroTarget(graph, ids) {
  const g = retroClone(graph, ids);
  const allIds = retroIds(g);
  return {
    graph: g,
    info: rxAnalyze(g),
    aromatic: rxAromaticRings(g).atoms,
    smiles: retroCanonical(g, allIds),
    skeleton: retroSkeleton(g, allIds),
    components: g.connectedComponents().length,
  };
}

function retroNow() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function retroDisconnect(graph, ids, options) {
  const start = retroNow();
  const budget = (options && options.budgetMs) || RETRO_LIMITS.budgetMs;
  const t = retroTarget(graph, ids);
  const out = { smiles: t.smiles, candidates: [], tried: 0, truncated: false, reason: '', ms: 0 };
  if (!t.graph.atoms.length || !t.smiles) {
    out.reason = 'empty';
    return out;
  }
  if (t.components !== 1) {
    out.reason = 'components';
    return out;
  }
  if (t.graph.atoms.length > RETRO_LIMITS.maxHeavy) {
    out.reason = 'size';
    return out;
  }
  const specs = [];
  const seen = new Set();
  RETRO_TRANSFORMS.forEach((transform) => {
    let list = [];
    try {
      list = transform.match(t) || [];
    } catch (error) {
      list = [];
    }
    list.forEach((spec) => {
      if (!spec || !spec.precursors.length || spec.precursors.some((p) => !p.smiles || p.smiles === t.smiles)) {
        return;
      }
      const key = retroSpecKey(spec);
      if (!seen.has(key)) {
        seen.add(key);
        specs.push(Object.assign(spec, { transform, key }));
      }
    });
  });
  for (const spec of specs) {
    if (retroNow() - start > budget) {
      out.truncated = true;
      break;
    }
    out.tried += 1;
    let verified = null;
    try {
      verified = retroVerify(spec, t.smiles);
    } catch (error) {
      verified = null;
    }
    if (!verified) {
      continue;
    }
    const precursors = spec.precursors.map(retroPrecursorInfo);
    const labels = reactionConditionLabels(verified.conditions, verified.compounds);
    out.candidates.push({
      transform: spec.transform.id,
      name: spec.transform.name,
      group: spec.transform.group,
      rule: spec.transform.rule,
      outcomeRule: verified.outcome.rule,
      outcomeId: verified.outcome.id,
      outcomeName: verified.outcome.name,
      precursors,
      reagents: spec.reagents.slice(),
      conditions: verified.conditions,
      compounds: verified.compounds,
      outcome: verified.outcome,
      product: verified.product,
      minor: verified.minor,
      labels,
      key: spec.key,
      rank: {
        largest: Math.max.apply(null, precursors.map((p) => p.skeleton)),
        total: precursors.reduce((s, p) => s + p.skeleton, 0),
        stereocentres: precursors.reduce((s, p) => s + p.stereocentres, 0),
        common: precursors.filter((p) => p.common).length,
      },
    });
  }
  out.candidates.sort(retroCompare);
  out.candidates = out.candidates.slice(0, RETRO_LIMITS.maxCandidates);
  out.ms = Math.round(retroNow() - start);
  return out;
}

function retroDisconnectSmiles(smiles, options) {
  const g = retroFromSmiles(smiles);
  return retroDisconnect(g, retroIds(g), options);
}

function retroNode(smiles, depth) {
  return { smiles, depth, result: null };
}

function retroTree(smiles, depth, budget) {
  const tree = {
    maxDepth: Math.max(1, Math.min(RETRO_LIMITS.maxDepth, depth || RETRO_LIMITS.maxDepth)),
    budgetMs: budget || RETRO_LIMITS.budgetMs,
    root: retroNode(smiles, 0),
  };
  retroExpand(tree, tree.root);
  return tree;
}

function retroCanExpand(tree, node) {
  return !!node && node.depth < tree.maxDepth;
}

function retroExpand(tree, node) {
  if (!retroCanExpand(tree, node)) {
    return null;
  }
  if (!node.result) {
    node.result = retroDisconnectSmiles(node.smiles, { budgetMs: tree.budgetMs });
    node.result.candidates.forEach((c) => {
      c.children = c.precursors.map((p) => retroNode(p.smiles, node.depth + 1));
    });
  }
  return node.result;
}

function retroDescribe(compound) {
  if (!compound.name && !compound.formula) {
    const info = reactionDescribeFragment(compound.fragment);
    compound.name = info.name;
    compound.formula = info.formula;
    compound.mass = info.mass;
  }
  return compound;
}

function retroRouteSteps(chain) {
  const steps = [];
  for (let i = chain.length - 1; i >= 0; i--) {
    const link = chain[i];
    const c = link.candidate;
    c.compounds.forEach(retroDescribe);
    const next = chain[i + 1];
    const previous = next ? c.precursors[link.precursor].smiles : null;
    const step = reactionRouteStep(c.compounds, c.conditions, c.outcome, c.product, c.minor, previous);
    if (step) {
      steps.push(step);
    }
  }
  return steps;
}

function retroForwardCheck(candidate, targetSmiles) {
  const spec = { precursors: candidate.precursors.map((p) => ({ smiles: p.smiles, role: p.role, label: p.label })), reagents: candidate.reagents, conditions: candidate.conditions };
  const verified = retroVerify(spec, targetSmiles);
  return !!verified && verified.minor === candidate.minor;
}
