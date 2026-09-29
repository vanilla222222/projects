const RETRO_LIMITS = { maxDepth: 3, budgetMs: 1500, maxHeavy: 60, maxPerTransform: 4, maxCandidates: 30, maxGrignardCarbons: 12, protectingGroupPenalty: 2, fgiPenalty: 1, maxProtectTries: 3 };

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
  boc2o: { smiles: 'CC(C)(C)OC(=O)OC(=O)OC(C)(C)C', role: 'reagent', label: 'Boc2O' },
  cbzcl: { smiles: 'O=C(Cl)OCc1ccccc1', role: 'reagent', label: 'CbzCl' },
  fmoccl: { smiles: 'O=C(Cl)OCC1c2ccccc2-c2ccccc21', role: 'reagent', label: 'Fmoc-Cl' },
  tbscl: { smiles: 'CC(C)(C)[Si](C)(C)Cl', role: 'reagent', label: 'TBSCl' },
  tbdpscl: { smiles: 'CC(C)(C)[Si](Cl)(c1ccccc1)c1ccccc1', role: 'reagent', label: 'TBDPSCl' },
  tipscl: { smiles: 'CC(C)[Si](Cl)(C(C)C)C(C)C', role: 'reagent', label: 'TIPSCl' },
  bnbr: { smiles: 'BrCc1ccccc1', role: 'reagent', label: 'BnBr' },
  pmbcl: { smiles: 'COc1ccc(CCl)cc1', role: 'reagent', label: 'PMBCl' },
  tfa: { smiles: 'OC(=O)C(F)(F)F', role: 'reagent', label: 'TFA' },
  tbaf: { smiles: 'CCCC[N+](CCCC)(CCCC)CCCC.[F-]', role: 'reagent', label: 'TBAF' },
  isobutylene: { smiles: 'C=C(C)C', role: 'reagent', label: 'isobutylene' },
  ethyleneGlycol: { smiles: 'OCCO', role: 'reactant', label: 'ethylene glycol' },
  propanediol: { smiles: 'OCCCO', role: 'reactant', label: '1,3-propanediol' },
};

function retroIds(g) {
  return g.atoms.map((a) => a.id);
}

function retroClone(graph, ids, out) {
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
        if (b.stereo) {
          bond.stereo = b.stereo;
        }
      }
    }
  });
  if (out) {
    out.map = map;
  }
  return g;
}

function retroProps(g, ids) {
  try {
    const props = computeProperties(g, ids || retroIds(g));
    return { smiles: props.smiles || '', isomericSmiles: props.isomericSmiles || props.smiles || '' };
  } catch (error) {
    return { smiles: '', isomericSmiles: '' };
  }
}

function retroCanonical(g, ids) {
  return retroProps(g, ids).smiles;
}

function retroHeavyKey(g, ids) {
  return (ids || retroIds(g)).map((id) => g.getAtom(id).element).filter((e) => e !== 'H').sort().join(',');
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
  (g.retroCuts = g.retroCuts || []).push([a, b]);
  return true;
}

function retroBreak(g, a, b) {
  const bond = g.getBond(a, b);
  if (!bond) {
    return false;
  }
  g.removeBond(bond.id);
  (g.retroCuts = g.retroCuts || []).push([a, b]);
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
    ids: new Set(c.atomIds),
    elements: new Set(c.atomIds.map((id) => g.getAtom(id).element)),
    carbon: c.atomIds.some((id) => g.getAtom(id).element === 'C'),
  })).filter((p) => p.smiles);
}

function retroEdit(t, edit) {
  const out = {};
  const g = retroClone(t.graph, null, out);
  g.retroCuts = [];
  if (edit(g) === false || !retroValid(g)) {
    return null;
  }
  const pieces = retroPieces(g);
  if (!pieces.length) {
    return null;
  }
  const back = new Map();
  out.map.forEach((to, from) => back.set(to, from));
  pieces.cuts = g.retroCuts.map((pair) => pair.map((id) => back.get(id))).filter((pair) => pair.every((id) => id !== undefined));
  if (t.edits) {
    t.edits.push({ transform: t.currentTransform || null, pieces, cuts: pieces.cuts, graph: g, map: out.map, back, changed: null });
  }
  return pieces;
}

function retroChanged(t, record) {
  if (record.changed) {
    return record.changed;
  }
  const h = record.graph;
  const changed = new Set();
  t.graph.atoms.forEach((a) => {
    const b = h.getAtom(record.map.get(a.id));
    if (!b || b.element !== a.element || (b.charge || 0) !== (a.charge || 0)) {
      changed.add(a.id);
    }
  });
  t.graph.bonds.forEach((b) => {
    const x = record.map.get(b.atomA);
    const y = record.map.get(b.atomB);
    const hb = h.getAtom(x) && h.getAtom(y) ? h.getBond(x, y) : null;
    if (!hb || hb.order !== b.order) {
      changed.add(b.atomA);
      changed.add(b.atomB);
    }
  });
  h.bonds.forEach((hb) => {
    const a = record.back.get(hb.atomA);
    const c = record.back.get(hb.atomB);
    if (a === undefined || c === undefined || !t.graph.getBond(a, c)) {
      [a, c].filter((id) => id !== undefined).forEach((id) => changed.add(id));
    }
  });
  record.changed = changed;
  return changed;
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

const RETRO_DIAZONIUM = {
  Cl: { additives: ['nano2', 'hcl', 'cucl'], solvents: ['water'], temperature: 0 },
  Br: { additives: ['nano2', 'hcl', 'cubr'], solvents: ['water'], temperature: 0 },
  CN: { additives: ['nano2', 'hcl', 'cucn'], solvents: ['water'], temperature: 0 },
  F: { additives: ['nano2', 'hbf4'], temperature: 100 },
  I: { additives: ['nano2', 'hcl', 'ki'], solvents: ['water'], temperature: 0 },
  OH: { additives: ['nano2', 'h2so4'], solvents: ['water'], temperature: 100 },
};

let retroReagentCanonicalCache = null;

function retroReagentKey(smiles, keys) {
  if (!retroReagentCanonicalCache) {
    retroReagentCanonicalCache = new Map();
    Object.keys(RETRO_REAGENTS).forEach((key) => {
      retroReagentCanonicalCache.set(retroCanonicalSmiles(RETRO_REAGENTS[key].smiles), key);
    });
  }
  const key = retroReagentCanonicalCache.get(smiles);
  return key && (!keys || keys.includes(key)) ? key : null;
}

function retroFormulaLabel(smiles) {
  try {
    const g = retroFromSmiles(smiles);
    return computeProperties(g, retroIds(g)).formula;
  } catch (error) {
    return smiles;
  }
}

function retroTerminal(g, id) {
  return rxNeighbors(g, id).length === 1;
}

function retroArylGroups(t) {
  const g = t.graph;
  const out = [];
  g.atoms.forEach((a) => {
    if (t.aromatic.has(a.id)) {
      return;
    }
    const ring = rxNeighbors(g, a.id).find((n) => t.aromatic.has(n.atom.id) && n.bond.order === 1);
    if (!ring) {
      return;
    }
    const others = rxNeighbors(g, a.id).filter((n) => n.atom.id !== ring.atom.id);
    let kind = null;
    let drop = [];
    if (a.element === 'N' && others.length === 2 && others.every((n) => n.atom.element === 'O' && retroTerminal(g, n.atom.id))) {
      kind = 'nitro';
      drop = [a.id].concat(others.map((n) => n.atom.id));
    } else if (a.element === 'S' && others.length === 3 && others.every((n) => n.atom.element === 'O' && retroTerminal(g, n.atom.id))) {
      kind = 'sulfo';
      drop = [a.id].concat(others.map((n) => n.atom.id));
    } else if (['F', 'Cl', 'Br', 'I'].includes(a.element)) {
      kind = a.element;
    } else if (a.element === 'O' && !others.length && !a.charge) {
      kind = 'OH';
    } else if (a.element === 'C' && others.length === 1 && others[0].atom.element === 'N' && others[0].bond.order === 3) {
      kind = 'CN';
      drop = [others[0].atom.id];
    }
    if (kind) {
      out.push({ x: a.id, c: ring.atom.id, kind, drop });
    }
  });
  return out;
}

function retroActivatedArene(t) {
  return retroArylGroups(t).some((s) => s.kind === 'nitro' || s.kind === 'CN');
}

function retroAreneFromGroup(t, kinds) {
  return retroUniquePieces(retroArylGroups(t).filter((s) => kinds.includes(s.kind)).map((s) => retroSinglePiece(t, (h) => {
    s.drop.concat(s.drop.length ? [] : [s.x]).forEach((id) => h.removeAtom(id));
  })));
}

function retroAnilines(t) {
  const list = [];
  retroArylGroups(t).filter((s) => RETRO_DIAZONIUM[s.kind]).forEach((s) => {
    const piece = retroSinglePiece(t, (h) => {
      s.drop.forEach((id) => h.removeAtom(id));
      h.getAtom(s.x).element = 'N';
    });
    if (piece) {
      list.push(Object.assign(piece, { kind: s.kind }));
    }
  });
  return list;
}

function retroKey(pieces) {
  return pieces.map((p) => p.smiles).sort().join('.');
}

function retroArylBonds(t, partner) {
  const g = t.graph;
  const out = [];
  g.bonds.forEach((b) => {
    if (b.order !== 1) {
      return;
    }
    [[b.atomA, b.atomB], [b.atomB, b.atomA]].forEach(([ar, x]) => {
      if (t.aromatic.has(ar) && g.getAtom(ar).element === 'C' && partner(x, ar)) {
        out.push({ ar, x });
      }
    });
  });
  return out;
}

function retroVinylCarbon(t, id) {
  const g = t.graph;
  return g.getAtom(id).element === 'C' && !t.aromatic.has(id) && rxNeighbors(g, id).some((n) => n.bond.order === 2 && n.atom.element === 'C');
}

function retroCouplingPieces(t, bonds, edit) {
  const out = [];
  const seen = new Set();
  bonds.forEach((bond) => {
    const pieces = retroEdit(t, (h) => {
      if (!retroCut(h, bond.ar, bond.x)) {
        return false;
      }
      return edit(h, bond);
    });
    if (!pieces || pieces.length !== 2) {
      return;
    }
    const key = retroKey(pieces);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(pieces);
    }
  });
  return out.slice(0, RETRO_LIMITS.maxPerTransform);
}

function retroHalidePair(pieces, halogen) {
  const halide = pieces.find((p) => p.elements.has(halogen));
  const other = pieces.find((p) => p !== halide);
  return halide && other ? [{ smiles: halide.smiles, role: 'reactant' }, { smiles: other.smiles, role: 'reactant' }] : null;
}

function retroEwgCarbon(g, id, skip) {
  return rxNeighbors(g, id).some((n) => n.atom.id !== skip && n.atom.element === 'C' &&
    rxNeighbors(g, n.atom.id).some((m) => (m.atom.element === 'O' && m.bond.order === 2) || (m.atom.element === 'N' && m.bond.order === 3)));
}

function retroAcceptorCarbons(t) {
  const list = t.info.carbonyls.filter((c) => ['ketone', 'aldehyde', 'ester'].includes(c.kind)).map((c) => c.c);
  return list.concat(t.info.nitriles.map((n) => n.c));
}

function retroBetaKetoEsters(t) {
  const g = t.graph;
  const out = [];
  t.info.carbonyls.filter((e) => e.kind === 'ester').forEach((e) => {
    rxCarbonNeighbors(g, e.c).filter((a) => rxIsSp3(g, a.atom.id)).forEach((a) => {
      t.info.carbonyls.filter((k) => k.kind === 'ketone' && k.c !== e.c && g.getBond(k.c, a.atom.id)).forEach((k) => {
        out.push({ e, a: a.atom.id, k, ring: !retroSide(g, a.atom.id, k.c) });
      });
    });
  });
  return out;
}

function retroEthoxyAcyl(h, c) {
  const o = rxAttach(h, 'O', c);
  const c1 = rxAttach(h, 'C', o.id);
  rxAttach(h, 'C', c1.id);
}

function retroTertButyl(g, o, from) {
  const c = rxNeighbors(g, o).find((n) => n.atom.id !== from && n.atom.element === 'C');
  return c && rxNeighbors(g, c.atom.id).filter((n) => n.atom.id !== o && n.atom.element === 'C' && rxNeighbors(g, n.atom.id).length === 1).length === 3 ? c.atom.id : null;
}

function retroCarbamates(t) {
  const g = t.graph;
  const out = [];
  t.info.carbonyls.forEach((c) => {
    const n = rxNeighbors(g, c.c).find((x) => x.atom.element === 'N' && x.bond.order === 1);
    const o = rxNeighbors(g, c.c).find((x) => x.atom.element === 'O' && x.bond.order === 1 && x.atom.id !== c.o);
    if (!n || !o) {
      return;
    }
    const pieces = retroEdit(t, (h) => {
      if (!retroCut(h, c.c, n.atom.id)) {
        return false;
      }
      rxAttach(h, 'Cl', c.c);
      return true;
    });
    if (!pieces || pieces.length !== 2) {
      return;
    }
    const amine = pieces.find((p) => !p.elements.has('Cl'));
    const chloroformate = pieces.find((p) => p !== amine);
    if (amine && chloroformate && amine.elements.has('N')) {
      out.push({ amine, chloroformate, boc: !!retroTertButyl(g, o.atom.id, c.c) });
    }
  });
  return out.slice(0, RETRO_LIMITS.maxPerTransform);
}

function retroConjugating(t, id, partner) {
  const g = t.graph;
  return rxNeighbors(g, id).some((n) => n.atom.id !== partner && (t.aromatic.has(n.atom.id) ||
    rxNeighbors(g, n.atom.id).some((m) => (m.bond.order === 2 && m.atom.element === 'O') || (m.bond.order === 3 && m.atom.element === 'N'))));
}

function retroSilylEthers(t) {
  const g = t.graph;
  const out = [];
  g.atoms.filter((si) => si.element === 'Si').forEach((si) => {
    rxNeighbors(g, si.id).filter((o) => o.atom.element === 'O' && o.bond.order === 1 && rxNeighbors(g, o.atom.id).length === 2).forEach((o) => {
      const pieces = retroEdit(t, (h) => {
        if (!retroCut(h, si.id, o.atom.id)) {
          return false;
        }
        rxAttach(h, 'Cl', si.id);
        return true;
      });
      if (!pieces || pieces.length !== 2) {
        return;
      }
      const silyl = pieces.find((p) => p.ids.has(si.id));
      const alcohol = pieces.find((p) => p !== silyl);
      const key = retroReagentKey(silyl.smiles, ['tbscl', 'tbdpscl', 'tipscl']);
      if (key) {
        out.push({ si: si.id, o: o.atom.id, atoms: [o.atom.id, si.id], alcohol, silyl, key });
      }
    });
  });
  return out;
}

function retroBenzylEthers(t) {
  const g = t.graph;
  const out = [];
  g.atoms.filter((o) => o.element === 'O' && !o.charge && rxNeighbors(g, o.id).length === 2).forEach((o) => {
    rxNeighbors(g, o.id).filter((ch2) => ch2.atom.element === 'C' && rxHydrogens(g, ch2.atom.id) === 2 &&
      rxCarbonNeighbors(g, ch2.atom.id).some((n) => t.aromatic.has(n.atom.id))).forEach((ch2) => {
      [['Br', 'bnbr', { additives: ['nah'], solvents: ['thf'] }], ['Cl', 'pmbcl', { additives: ['nah'], solvents: ['dmf'] }]].forEach(([halogen, key, conditions]) => {
        const pieces = retroEdit(t, (h) => {
          if (!retroCut(h, o.id, ch2.atom.id)) {
            return false;
          }
          rxAttach(h, halogen, ch2.atom.id);
          return true;
        });
        if (!pieces || pieces.length !== 2) {
          return;
        }
        const benzyl = pieces.find((p) => p.ids.has(ch2.atom.id));
        const alcohol = pieces.find((p) => p !== benzyl);
        if (retroReagentKey(benzyl.smiles, [key])) {
          out.push({ o: o.id, ch2: ch2.atom.id, atoms: [o.id, ch2.atom.id], alcohol, benzyl, key, conditions });
        }
      });
    });
  });
  return out;
}

function retroAcetals(t) {
  const g = t.graph;
  const out = [];
  g.atoms.filter((c) => c.element === 'C' && rxIsSp3(g, c.id)).forEach((c) => {
    const oxygens = rxNeighbors(g, c.id).filter((n) => n.atom.element === 'O' && n.bond.order === 1 && rxNeighbors(g, n.atom.id).length === 2);
    if (oxygens.length !== 2) {
      return;
    }
    const pieces = retroEdit(t, (h) => {
      oxygens.forEach((o) => retroBreak(h, c.id, o.atom.id));
      rxAttach(h, 'O', c.id, 2);
      return true;
    });
    if (!pieces || pieces.length !== 2) {
      return;
    }
    const diol = pieces.find((p) => p.ids.has(oxygens[0].atom.id) && p.ids.has(oxygens[1].atom.id));
    const carbonyl = pieces.find((p) => p.ids.has(c.id));
    const key = diol && retroReagentKey(diol.smiles, ['ethyleneGlycol', 'propanediol']);
    if (key && carbonyl) {
      out.push({ c: c.id, oxygens: oxygens.map((o) => o.atom.id), atoms: [c.id].concat(oxygens.map((o) => o.atom.id)), carbonyl, diol, key });
    }
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
      const ok = (id) => g.getAtom(id).element === 'C' && !t.aromatic.has(id) && rxIsSp3(g, id) && rxHydrogens(g, id) >= 1 &&
        rxNeighbors(g, id).every((n) => n.atom.element === 'C');
      const bonds = g.bonds.filter((b) => b.order === 1 && ok(b.atomA) && ok(b.atomB));
      const useful = bonds.filter((b) => retroConjugating(t, b.atomA, b.atomB) || retroConjugating(t, b.atomB, b.atomA));
      const piece = (b) => retroSinglePiece(t, (h) => retroOrder(h, b.atomA, b.atomB, 2));
      let list = useful.map(piece);
      if (!useful.length) {
        const fallback = bonds.filter((b) => !retroSide(g, b.atomA, b.atomB)).concat(bonds.filter((b) => retroSide(g, b.atomA, b.atomB)));
        for (const b of fallback) {
          const p = piece(b);
          if (p) {
            list = [p];
            break;
          }
        }
      }
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
              retroBreak(h, a3, a4);
              retroBreak(h, a5, a6);
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
  {
    id: 'eas-nitration', name: 'Aromatic nitration', rule: 'nitration', group: 'Aromatics',
    match: (t) => retroAreneFromGroup(t, ['nitro']).map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [], { additives: ['hno3', 'h2so4'] })),
  },
  {
    id: 'eas-sulfonation', name: 'Aromatic sulfonation', rule: 'sulfonation', group: 'Aromatics',
    match: (t) => retroAreneFromGroup(t, ['sulfo']).map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [], { additives: ['so3'] })),
  },
  {
    id: 'snar', name: 'Nucleophilic aromatic substitution', rule: 'snar', group: 'Aromatics',
    match: (t) => {
      if (!retroActivatedArene(t)) {
        return [];
      }
      const g = t.graph;
      const out = [];
      const seen = new Set();
      retroArylBonds(t, (x) => ['O', 'N', 'S'].includes(g.getAtom(x).element) && !g.getAtom(x).charge && !t.aromatic.has(x) &&
        rxNeighbors(g, x).length === 2 && rxNeighbors(g, x).every((n) => n.bond.order === 1 && n.atom.element === 'C') ||
        (g.getAtom(x).element === 'N' && rxNeighbors(g, x).length === 3 && rxNeighbors(g, x).every((n) => n.bond.order === 1 && n.atom.element === 'C'))).forEach((bond) => {
        const element = g.getAtom(bond.x).element;
        ['F', 'Cl'].forEach((halogen) => {
          const pieces = retroEdit(t, (h) => {
            if (!retroCut(h, bond.ar, bond.x)) {
              return false;
            }
            rxAttach(h, halogen, bond.ar);
            if (element !== 'N') {
              h.getAtom(bond.x).charge = -1;
            }
            return true;
          });
          const pair = pieces && pieces.length === 2 ? retroHalidePair(pieces, halogen) : null;
          if (!pair || seen.has(retroKey(pieces))) {
            return;
          }
          seen.add(retroKey(pieces));
          if (element === 'N') {
            out.push(retroSpec(pair, [], { solvents: ['dmso'], temperature: 100 }));
          } else {
            const salt = pair[1].smiles + '.[Na+]';
            out.push(retroSpec([pair[0]], [{ smiles: salt, role: 'reagent', label: retroFormulaLabel(salt) }], {}));
          }
        });
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'sandmeyer', name: 'Sandmeyer reaction', rule: 'diazonium', group: 'Aromatics',
    match: (t) => retroUniquePieces(retroAnilines(t).filter((p) => ['Cl', 'Br', 'CN'].includes(p.kind)))
      .map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [], RETRO_DIAZONIUM[p.kind])),
  },
  {
    id: 'schiemann', name: 'Balz–Schiemann reaction', rule: 'diazonium', group: 'Aromatics',
    match: (t) => retroUniquePieces(retroAnilines(t).filter((p) => p.kind === 'F'))
      .map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [], RETRO_DIAZONIUM.F)),
  },
  {
    id: 'diazonium-iodide', name: 'Diazonium iodide substitution', rule: 'diazonium', group: 'Aromatics',
    match: (t) => retroUniquePieces(retroAnilines(t).filter((p) => p.kind === 'I'))
      .map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [], RETRO_DIAZONIUM.I)),
  },
  {
    id: 'diazonium-phenol', name: 'Phenol from a diazonium salt', rule: 'diazonium', group: 'Aromatics',
    match: (t) => retroUniquePieces(retroAnilines(t).filter((p) => p.kind === 'OH'))
      .map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [], RETRO_DIAZONIUM.OH)),
  },
  {
    id: 'azo-coupling', name: 'Azo coupling', rule: 'diazonium', group: 'Aromatics',
    match: (t) => {
      const g = t.graph;
      const out = [];
      g.bonds.filter((b) => b.order === 2 && g.getAtom(b.atomA).element === 'N' && g.getAtom(b.atomB).element === 'N').forEach((b) => {
        [[b.atomA, b.atomB], [b.atomB, b.atomA]].forEach(([n1, n2]) => {
          const aryl = (id, other) => rxNeighbors(g, id).filter((n) => n.atom.id !== other).every((n) => t.aromatic.has(n.atom.id));
          if (!aryl(n1, n2) || !aryl(n2, n1)) {
            return;
          }
          const pieces = retroEdit(t, (h) => {
            rxNeighbors(h, n2).filter((n) => n.atom.id !== n1).forEach((n) => retroBreak(h, n2, n.atom.id));
            h.removeAtom(n2);
            return true;
          });
          if (!pieces || pieces.length !== 2) {
            return;
          }
          const amine = pieces.find((p) => p.ids.has(n1));
          const partner = pieces.find((p) => p !== amine);
          if (amine && partner && (partner.elements.has('O') || partner.elements.has('N'))) {
            out.push(retroSpec([{ smiles: amine.smiles, role: 'reactant' }, { smiles: partner.smiles, role: 'reactant' }], [], { additives: ['nano2', 'hcl'], solvents: ['water'], temperature: 0 }));
          }
        });
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'suzuki', name: 'Suzuki coupling', rule: 'suzuki', group: 'Couplings',
    match: (t) => retroCouplingPieces(t, retroArylBonds(t, (x) => t.aromatic.has(x) || retroVinylCarbon(t, x))
      .flatMap((b) => t.aromatic.has(b.x) ? [b] : [b, { ar: b.x, x: b.ar }]), (h, bond) => {
      rxAttach(h, 'Br', bond.ar);
      const boron = rxAttach(h, 'B', bond.x);
      rxAttach(h, 'O', boron.id);
      rxAttach(h, 'O', boron.id);
      return true;
    }).map((pieces) => {
      const halide = pieces.find((p) => p.elements.has('Br'));
      const boronic = pieces.find((p) => p !== halide);
      return retroSpec([{ smiles: halide.smiles, role: 'reactant' }, { smiles: boronic.smiles, role: 'reactant' }], [], { additives: ['pdpph3', 'k2co3'], atmosphere: 'n2' });
    }),
  },
  {
    id: 'heck', name: 'Heck reaction', rule: 'heck', group: 'Couplings',
    match: (t) => retroCouplingPieces(t, retroArylBonds(t, (x) => retroVinylCarbon(t, x)), (h, bond) => {
      rxAttach(h, 'I', bond.ar);
      return true;
    }).map((pieces) => retroSpec(retroHalidePair(pieces, 'I'), [], { additives: ['pdoac2', 'et3n'], temperature: 100 })),
  },
  {
    id: 'sonogashira', name: 'Sonogashira coupling', rule: 'sonogashira', group: 'Couplings',
    match: (t) => retroCouplingPieces(t, retroArylBonds(t, (x) => t.graph.getAtom(x).element === 'C' && rxNeighbors(t.graph, x).some((n) => n.bond.order === 3 && n.atom.element === 'C')), (h, bond) => {
      rxAttach(h, 'I', bond.ar);
      return true;
    }).map((pieces) => retroSpec(retroHalidePair(pieces, 'I'), [], { additives: ['pdpph3', 'cui', 'et3n'] })),
  },
  {
    id: 'buchwald-hartwig', name: 'Buchwald–Hartwig amination', rule: 'buchwald-hartwig', group: 'Couplings',
    match: (t) => {
      if (retroActivatedArene(t)) {
        return [];
      }
      const amines = new Set(retroAmineNitrogens(t));
      return retroCouplingPieces(t, retroArylBonds(t, (x) => amines.has(x) && rxCarbonNeighbors(t.graph, x).length >= 2), (h, bond) => {
        rxAttach(h, 'Br', bond.ar);
        return true;
      }).map((pieces) => retroSpec(retroHalidePair(pieces, 'Br'), [], { additives: ['pdoac2', 'kotbu'] }));
    },
  },
  {
    id: 'enolate-alkylation', name: 'Enolate alkylation', rule: 'enolate-alkylation', group: 'Enolates',
    match: (t) => {
      const g = t.graph;
      const out = [];
      const seen = new Set();
      t.info.carbonyls.filter((c) => c.kind === 'ketone' || c.kind === 'ester').forEach((c) => {
        rxCarbonNeighbors(g, c.c).filter((a) => rxIsSp3(g, a.atom.id)).forEach((a) => {
          rxCarbonNeighbors(g, a.atom.id).filter((r) => r.atom.id !== c.c && rxIsSp3(g, r.atom.id) && rxCarbonNeighbors(g, r.atom.id).length <= 2).forEach((r) => {
            const pieces = retroEdit(t, (h) => {
              if (!retroCut(h, a.atom.id, r.atom.id)) {
                return false;
              }
              rxAttach(h, 'I', r.atom.id);
              return true;
            });
            const pair = pieces && pieces.length === 2 ? retroHalidePair(pieces, 'I') : null;
            if (pair && !seen.has(retroKey(pieces))) {
              seen.add(retroKey(pieces));
              out.push(retroSpec([pair[1], pair[0]], [], { additives: ['lda'], solvents: ['thf'], temperature: -78 }));
            }
          });
        });
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'michael', name: 'Michael addition', rule: 'michael', group: 'Enolates',
    match: (t) => {
      const g = t.graph;
      const out = [];
      const seen = new Set();
      retroAcceptorCarbons(t).forEach((e) => {
        rxCarbonNeighbors(g, e).filter((a) => rxIsSp3(g, a.atom.id) && rxHydrogens(g, a.atom.id) >= 1).forEach((a) => {
          rxCarbonNeighbors(g, a.atom.id).filter((b) => b.atom.id !== e && rxIsSp3(g, b.atom.id)).forEach((b) => {
            rxNeighbors(g, b.atom.id).filter((d) => d.atom.id !== a.atom.id && d.bond.order === 1 &&
              ((d.atom.element === 'C' && rxIsSp3(g, d.atom.id) && retroEwgCarbon(g, d.atom.id, b.atom.id)) || d.atom.element === 'S')).forEach((d) => {
              const pieces = retroEdit(t, (h) => {
                if (!retroCut(h, b.atom.id, d.atom.id)) {
                  return false;
                }
                retroOrder(h, a.atom.id, b.atom.id, 2);
                return true;
              });
              if (!pieces || pieces.length !== 2 || seen.has(retroKey(pieces))) {
                return;
              }
              seen.add(retroKey(pieces));
              const donor = pieces.find((p) => p.ids.has(d.atom.id));
              const acceptor = pieces.find((p) => p !== donor);
              out.push(retroSpec([{ smiles: donor.smiles, role: 'reactant' }, { smiles: acceptor.smiles, role: 'reactant' }], [],
                d.atom.element === 'S' ? {} : { additives: ['naoet'], solvents: ['ethanol'] }));
            });
          });
        });
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'claisen', name: 'Claisen condensation', rule: 'claisen', group: 'Enolates',
    match: (t) => {
      const out = [];
      const seen = new Set();
      retroBetaKetoEsters(t).filter((x) => !x.ring).forEach((x) => {
        const pieces = retroEdit(t, (h) => {
          if (!retroCut(h, x.a, x.k.c)) {
            return false;
          }
          retroEthoxyAcyl(h, x.k.c);
          return true;
        });
        if (!pieces || pieces.length !== 2 || seen.has(retroKey(pieces))) {
          return;
        }
        seen.add(retroKey(pieces));
        out.push(retroSpec(retroReactants(retroUniquePieces(pieces)), [], { additives: ['naoet'], solvents: ['ethanol'] }));
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'dieckmann', name: 'Dieckmann condensation', rule: 'claisen', group: 'Enolates',
    match: (t) => retroUniquePieces(retroBetaKetoEsters(t).filter((x) => x.ring).map((x) => retroSinglePiece(t, (h) => {
      retroBreak(h, x.a, x.k.c);
      retroEthoxyAcyl(h, x.k.c);
    }))).map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [], { additives: ['naoet'], solvents: ['ethanol'] })),
  },
  {
    id: 'robinson', name: 'Robinson annulation', rule: 'robinson', group: 'Enolates',
    match: (t) => {
      const g = t.graph;
      const out = [];
      const seen = new Set();
      t.info.carbonyls.filter((c) => c.kind === 'ketone').forEach((k) => {
        rxCarbonNeighbors(g, k.c).forEach((al) => {
          const be = rxNeighbors(g, al.atom.id).find((n) => n.bond.order === 2 && n.atom.element === 'C' && !t.aromatic.has(n.atom.id));
          if (!be || t.aromatic.has(al.atom.id)) {
            return;
          }
          rxCarbonNeighbors(g, k.c).filter((x) => x.atom.id !== al.atom.id && rxIsSp3(g, x.atom.id)).forEach((aa) => {
            rxCarbonNeighbors(g, aa.atom.id).filter((x) => x.atom.id !== k.c && rxIsSp3(g, x.atom.id)).forEach((ab) => {
              rxCarbonNeighbors(g, ab.atom.id).filter((x) => x.atom.id !== aa.atom.id && g.getBond(x.atom.id, be.atom.id)).forEach((ca) => {
                const pieces = retroEdit(t, (h) => {
                  retroBreak(h, al.atom.id, be.atom.id);
                  retroBreak(h, ab.atom.id, ca.atom.id);
                  rxAttach(h, 'O', be.atom.id, 2);
                  retroOrder(h, aa.atom.id, ab.atom.id, 2);
                  return true;
                });
                if (!pieces || pieces.length !== 2 || seen.has(retroKey(pieces))) {
                  return;
                }
                seen.add(retroKey(pieces));
                const donor = pieces.find((p) => p.ids.has(be.atom.id));
                const enone = pieces.find((p) => p !== donor);
                out.push(retroSpec([{ smiles: donor.smiles, role: 'reactant' }, { smiles: enone.smiles, role: 'reactant' }], [], { additives: ['naoet'], solvents: ['ethanol'], temperature: 78 }));
              });
            });
          });
        });
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'mannich', name: 'Mannich reaction', rule: 'mannich', group: 'Enolates',
    match: (t) => {
      const g = t.graph;
      const out = [];
      const seen = new Set();
      const amines = new Set(retroAmineNitrogens(t));
      t.info.carbonyls.filter((c) => c.kind === 'ketone' || c.kind === 'aldehyde').forEach((k) => {
        rxCarbonNeighbors(g, k.c).filter((a) => rxIsSp3(g, a.atom.id)).forEach((a) => {
          rxCarbonNeighbors(g, a.atom.id).filter((b) => b.atom.id !== k.c && rxHydrogens(g, b.atom.id) === 2).forEach((b) => {
            rxNeighbors(g, b.atom.id).filter((n) => amines.has(n.atom.id)).forEach((n) => {
              const pieces = retroEdit(t, (h) => {
                if (!retroCut(h, a.atom.id, b.atom.id) || !retroCut(h, b.atom.id, n.atom.id)) {
                  return false;
                }
                rxAttach(h, 'O', b.atom.id, 2);
                return true;
              });
              if (!pieces || pieces.length !== 3 || seen.has(retroKey(pieces))) {
                return;
              }
              seen.add(retroKey(pieces));
              const order = [a.atom.id, b.atom.id, n.atom.id].map((id) => pieces.find((p) => p.ids.has(id)));
              out.push(retroSpec(retroReactants(order), [], { additives: ['hcl'], solvents: ['ethanol'] }));
            });
          });
        });
      });
      return out.slice(0, RETRO_LIMITS.maxPerTransform);
    },
  },
  {
    id: 'boc-install', name: 'Boc protection', rule: 'protection', group: 'Protecting groups',
    match: (t) => retroCarbamates(t).filter((x) => x.boc)
      .map((x) => retroSpec([{ smiles: x.amine.smiles, role: 'reactant' }], [RETRO_REAGENTS.boc2o], {})),
  },
  {
    id: 'cbz-install', name: 'Cbz protection', rule: 'carbamate-protection', group: 'Protecting groups',
    match: (t) => retroCarbamates(t).filter((x) => retroReagentKey(x.chloroformate.smiles, ['cbzcl']))
      .map((x) => retroSpec([{ smiles: x.amine.smiles, role: 'reactant' }], [RETRO_REAGENTS.cbzcl], { additives: ['et3n'] })),
  },
  {
    id: 'fmoc-install', name: 'Fmoc protection', rule: 'carbamate-protection', group: 'Protecting groups',
    match: (t) => retroCarbamates(t).filter((x) => retroReagentKey(x.chloroformate.smiles, ['fmoccl']))
      .map((x) => retroSpec([{ smiles: x.amine.smiles, role: 'reactant' }], [RETRO_REAGENTS.fmoccl], { additives: ['k2co3'] })),
  },
  {
    id: 'silyl-install', name: 'Silyl ether protection', rule: 'protection', group: 'Protecting groups',
    match: (t) => retroSilylEthers(t).slice(0, RETRO_LIMITS.maxPerTransform)
      .map((x) => retroSpec([{ smiles: x.alcohol.smiles, role: 'reactant' }], [RETRO_REAGENTS[x.key]], { additives: ['imidazole'], solvents: ['dmf'] })),
  },
  {
    id: 'benzyl-ether-install', name: 'Benzyl or PMB ether protection', rule: 'williamson', group: 'Protecting groups',
    match: (t) => retroBenzylEthers(t).slice(0, RETRO_LIMITS.maxPerTransform)
      .map((x) => retroSpec([{ smiles: x.alcohol.smiles, role: 'reactant' }], [RETRO_REAGENTS[x.key]], x.conditions)),
  },
  {
    id: 'acetal-install', name: 'Cyclic acetal protection', rule: 'acetal', group: 'Protecting groups',
    match: (t) => retroAcetals(t).slice(0, RETRO_LIMITS.maxPerTransform)
      .map((x) => retroSpec([{ smiles: x.carbonyl.smiles, role: 'reactant' }, { smiles: x.diol.smiles, role: 'reactant' }], [], { additives: ['tsoh'], solvents: ['toluene'], temperature: 110 })),
  },
  {
    id: 'tbu-ester-install', name: 'tert-Butyl ester protection', rule: 'ester-protection', group: 'Protecting groups',
    match: (t) => {
      const g = t.graph;
      return retroUniquePieces(t.info.carbonyls.filter((c) => c.kind === 'ester').map((c) => {
        const tbu = retroTertButyl(g, c.hetero, c.c);
        if (!tbu) {
          return null;
        }
        const drop = [tbu].concat(rxCarbonNeighbors(g, tbu).filter((n) => n.atom.id !== c.hetero).map((n) => n.atom.id));
        return retroSinglePiece(t, (h) => drop.forEach((id) => h.removeAtom(id)));
      })).map((p) => retroSpec([{ smiles: p.smiles, role: 'reactant' }], [RETRO_REAGENTS.isobutylene], { additives: ['h2so4'] }));
    },
  },
];

const RETRO_DROPPED_TRANSFORMS = [
  { id: 'hydro-deamination', name: 'Diazonium reduction (H₃PO₂)', reason: 'The forward deamination rule works, but a retro step ArH ← ArNH₂ would match every arene C–H and flood each aromatic target with amine precursors, so it stays forward only.' },
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

function retroVerify(spec, targetSmiles, sink) {
  let compounds = null;
  try {
    compounds = spec.precursors.concat(spec.reagents).map(retroCompound);
  } catch (error) {
    return null;
  }
  const conditions = normalizeReactionConditions(spec.conditions);
  const result = predictReaction(compounds, conditions);
  if (sink) {
    sink.result = result;
  }
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

function retroTryVerify(spec, targetSmiles, sink) {
  try {
    return retroVerify(spec, targetSmiles, sink);
  } catch (error) {
    return null;
  }
}

function retroSpecKey(spec) {
  return JSON.stringify([spec.precursors.map((p) => p.smiles + '@' + p.role).sort(), spec.reagents.map((r) => r.smiles).sort(), normalizeReactionConditions(spec.conditions)]);
}

function retroPrecursorInfo(item) {
  const g = retroFromSmiles(item.smiles);
  const ids = retroIds(g);
  return {
    smiles: item.smiles,
    isomericSmiles: item.isomericSmiles || item.smiles,
    role: item.role,
    label: item.label || '',
    skeleton: retroSkeleton(g, ids),
    stereocentres: retroStereocentres(g, ids),
    heavy: retroHeavyKey(g, ids),
    common: retroCommonName(item.smiles),
    stock: typeof stockTier === 'function' ? stockTier(item.smiles) : null,
  };
}

function retroCompare(p, q) {
  return p.rank.adjusted - q.rank.adjusted
    || (p.rank.stereo || 0) - (q.rank.stereo || 0)
    || p.rank.largest - q.rank.largest
    || p.rank.stereocentres - q.rank.stereocentres
    || q.rank.common - p.rank.common
    || (p.minor ? 1 : 0) - (q.minor ? 1 : 0)
    || p.rank.total - q.rank.total;
}

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
    stereo: props.isomericSmiles.includes('@'),
    skeleton: retroSkeleton(g, allIds),
    heavy: retroHeavyKey(g, allIds),
    components: g.connectedComponents().length,
  };
}

function retroNow() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function retroSpecRecord(t, spec, from) {
  let best = null;
  let score = 0;
  for (let i = from; i < t.edits.length; i++) {
    const smiles = new Set(t.edits[i].pieces.map((p) => p.smiles));
    const hits = spec.precursors.filter((p) => smiles.has(p.smiles)).length;
    if (hits > score) {
      best = t.edits[i];
      score = hits;
    }
  }
  return best;
}

function retroMirror(smiles) {
  return smiles.replace(/@@|@/g, (m) => (m === '@@' ? '@' : '@@'));
}

function retroPieceIsomeric(t, record, smiles) {
  const piece = record && record.pieces.find((p) => p.smiles === smiles);
  if (!piece) {
    return smiles;
  }
  const touched = new Set([...retroChanged(t, record)].map((id) => record.map.get(id)));
  const out = {};
  const g = retroClone(record.graph, [...piece.ids], out);
  const back = new Map();
  out.map.forEach((to, from) => back.set(to, from));
  g.bonds.forEach((b) => {
    if (b.stereo && touched.has(back.get(b.atomA))) {
      b.stereo = null;
    }
  });
  const props = retroProps(g);
  if (props.smiles !== smiles || !props.isomericSmiles) {
    return smiles;
  }
  return [...piece.ids].some((id) => touched.has(id)) ? props.isomericSmiles.replace(/[/\\]/g, '') : props.isomericSmiles;
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
    if (direct && direct.product.isomericSmiles === t.isomericSmiles) {
      return { stereo: 'retained', precursors: iso };
    }
    const mirror = iso.map((p) => Object.assign({}, p, { smiles: retroMirror(p.smiles) }));
    const flipped = run(mirror);
    if (flipped && flipped.product.isomericSmiles === t.isomericSmiles) {
      return { stereo: 'retained', precursors: mirror };
    }
    return ['racemic', 'diastereomers'].includes(kind(direct)) ? { stereo: 'racemic', precursors: iso } : { stereo: 'mismatch', precursors: iso };
  }
  const set = verified.product.isomericSmiles === t.isomericSmiles && kind(verified) !== 'racemic';
  return { stereo: set ? 'set' : 'racemic', precursors: iso };
}

function retroRank(t, group, precursors, stereo) {
  const rank = {
    largest: Math.max.apply(null, precursors.map((p) => p.skeleton)),
    penalty: group === 'Protecting groups' ? RETRO_LIMITS.protectingGroupPenalty : 0,
    total: precursors.reduce((s, p) => s + p.skeleton, 0),
    stereocentres: precursors.reduce((s, p) => s + p.stereocentres, 0),
    common: precursors.filter((p) => p.common).length,
    fgi: precursors.length === 1 && precursors[0].heavy === t.heavy ? 1 : 0,
    stereo: stereo === 'racemic' ? 1 : 0,
  };
  rank.adjusted = rank.largest + rank.penalty + rank.fgi * RETRO_LIMITS.fgiPenalty;
  return rank;
}

function retroEditAtoms(t, record) {
  if (!record) {
    return { bonds: [], changedAtoms: [] };
  }
  return {
    bonds: record.cuts.map((pair) => pair.map((id) => t.map.get(id))),
    changedAtoms: [...retroChanged(t, record)].map((id) => t.map.get(id)).sort((a, b) => a - b),
  };
}

function retroCandidate(t, spec, verified) {
  const stereo = retroStereoClass(t, spec, verified);
  if (stereo.stereo === 'mismatch') {
    return null;
  }
  const precursors = spec.precursors.map((p, i) => retroPrecursorInfo(Object.assign({}, p, { isomericSmiles: stereo.precursors ? stereo.precursors[i].smiles : p.smiles })));
  const edit = retroEditAtoms(t, spec.record);
  return {
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
    labels: reactionConditionLabels(verified.conditions, verified.compounds),
    key: spec.key,
    bonds: edit.bonds,
    changedAtoms: edit.changedAtoms,
    stereo: stereo.stereo,
    rank: retroRank(t, spec.transform.group, precursors, stereo.stereo),
  };
}

function retroTertButylOn(g, id) {
  const q = rxAttach(g, 'C', id);
  for (let i = 0; i < 3; i++) {
    rxAttach(g, 'C', q.id);
  }
  return q;
}

function retroProtectAmine(g, atoms) {
  const n = atoms[0];
  if (!g.getAtom(n) || rxHydrogens(g, n) < 1) {
    return false;
  }
  const c = rxAttach(g, 'C', n);
  rxAttach(g, 'O', c.id, 2);
  retroTertButylOn(g, rxAttach(g, 'O', c.id).id);
  return true;
}

function retroProtectAlcohol(g, atoms) {
  const o = atoms[0];
  if (!g.getAtom(o) || rxHydrogens(g, o) < 1) {
    return false;
  }
  const si = rxAttach(g, 'Si', o);
  rxAttach(g, 'C', si.id);
  rxAttach(g, 'C', si.id);
  retroTertButylOn(g, si.id);
  return true;
}

function retroProtectCarbonyl(g, atoms) {
  const bond = g.getAtom(atoms[0]) && g.getAtom(atoms[1]) ? g.getBond(atoms[0], atoms[1]) : null;
  if (!bond || bond.order !== 2) {
    return false;
  }
  bond.order = 1;
  const o2 = rxAttach(g, 'O', atoms[0]);
  const c1 = rxAttach(g, 'C', atoms[1]);
  const c2 = rxAttach(g, 'C', c1.id);
  g.addBond(c2.id, o2.id);
  return true;
}

function retroProtectAcid(g, atoms) {
  if (!g.getAtom(atoms[0])) {
    return false;
  }
  const oh = rxNeighbors(g, atoms[0]).find((n) => n.atom.element === 'O' && n.bond.order === 1 && rxHydrogens(g, n.atom.id) >= 1);
  if (!oh) {
    return false;
  }
  retroTertButylOn(g, oh.atom.id);
  return true;
}

const RETRO_PROTECTION = {
  amine: { label: 'Boc', protect: [RETRO_REAGENTS.boc2o], protectConditions: {}, deprotect: [RETRO_REAGENTS.tfa], deprotectConditions: {}, apply: retroProtectAmine },
  alcohol: { label: 'TBS', protect: [RETRO_REAGENTS.tbscl], protectConditions: { additives: ['imidazole'], solvents: ['dmf'] }, deprotect: [RETRO_REAGENTS.tbaf], deprotectConditions: { solvents: ['thf'] }, apply: retroProtectAlcohol },
  ketone: { label: 'ethylene acetal', protect: [RETRO_REAGENTS.ethyleneGlycol], protectConditions: { additives: ['tsoh'], solvents: ['toluene'], temperature: 110 }, deprotect: [RETRO_REAGENTS.water], deprotectConditions: { additives: ['hcl'], solvents: ['water'] }, apply: retroProtectCarbonyl },
  aldehyde: { label: 'ethylene acetal', protect: [RETRO_REAGENTS.ethyleneGlycol], protectConditions: { additives: ['tsoh'], solvents: ['toluene'], temperature: 110 }, deprotect: [RETRO_REAGENTS.water], deprotectConditions: { additives: ['hcl'], solvents: ['water'] }, apply: retroProtectCarbonyl },
  acid: { label: 'tert-butyl ester', protect: [RETRO_REAGENTS.isobutylene], protectConditions: { additives: ['h2so4'] }, deprotect: [RETRO_REAGENTS.tfa], deprotectConditions: {}, apply: retroProtectAcid },
};

function retroGuardedAtoms(t) {
  if (!t.guarded) {
    const saved = t.currentTransform;
    t.currentTransform = null;
    t.guarded = new Set();
    retroSilylEthers(t).concat(retroBenzylEthers(t), retroAcetals(t)).forEach((x) => x.atoms.forEach((id) => t.guarded.add(id)));
    t.currentTransform = saved;
  }
  return t.guarded;
}

function retroProtectOptions(t, spec, chemo) {
  const kinds = new Set((chemo.changed || []).concat((chemo.competing || []).map((c) => c.group)));
  const changed = retroChanged(t, spec.record);
  const guarded = retroGuardedAtoms(t);
  const groups = rxChemoGroups(t.graph);
  const options = [];
  Object.keys(RETRO_PROTECTION).forEach((kind) => {
    if (kinds.has(kind)) {
      (groups[kind] || []).filter((atoms) => atoms.every((id) => !changed.has(id) && !guarded.has(id))).forEach((atoms) => options.push({ kind, atoms }));
    }
  });
  return options.slice(0, RETRO_LIMITS.maxProtectTries);
}

function retroProtectTry(t, spec, option) {
  const pg = RETRO_PROTECTION[option.kind];
  const record = spec.record;
  const hAtoms = option.atoms.map((id) => record.map.get(id));
  const pOut = {};
  const pGraph = retroClone(record.graph, null, pOut);
  if (!pg.apply(pGraph, hAtoms.map((id) => pOut.map.get(id))) || !retroValid(pGraph)) {
    return null;
  }
  const piece = record.pieces.find((p) => p.ids.has(hAtoms[0]));
  const protectedPiece = retroPieces(pGraph).find((p) => p.ids.has(pOut.map.get(hAtoms[0])));
  const index = piece ? spec.precursors.findIndex((p) => p.smiles === piece.smiles) : -1;
  if (index < 0 || !protectedPiece) {
    return null;
  }
  const tOut = {};
  const tGraph = retroClone(t.graph, null, tOut);
  if (!pg.apply(tGraph, option.atoms.map((id) => tOut.map.get(id))) || !retroValid(tGraph)) {
    return null;
  }
  const protectedTarget = retroCanonical(tGraph);
  if (!protectedTarget || protectedTarget === t.smiles) {
    return null;
  }
  const protectSpec = retroSpec([{ smiles: piece.smiles, role: 'reactant' }], pg.protect, pg.protectConditions);
  const protect = retroTryVerify(protectSpec, protectedPiece.smiles);
  if (!protect) {
    return null;
  }
  const stepSpec = retroSpec(spec.precursors.map((p, i) => (i === index ? Object.assign({}, p, { smiles: protectedPiece.smiles }) : p)), spec.reagents, spec.conditions);
  const step = retroTryVerify(stepSpec, protectedTarget);
  if (!step) {
    return null;
  }
  const deprotectSpec = retroSpec([{ smiles: protectedTarget, role: 'reactant' }], pg.deprotect, pg.deprotectConditions);
  const deprotect = retroTryVerify(deprotectSpec, t.smiles);
  if (!deprotect) {
    return null;
  }
  const pgSteps = [['protect', protectSpec, protect], ['step', stepSpec, step], ['deprotect', deprotectSpec, deprotect]].map(([role, s, v]) => ({
    role,
    precursors: s.precursors,
    reagents: s.reagents,
    target: v.product.smiles,
    compounds: v.compounds,
    conditions: v.conditions,
    outcome: v.outcome,
    product: v.product,
    minor: v.minor,
  }));
  return { option, pg, precursor: piece.smiles, protectedPrecursor: protectedPiece.smiles, protectedTarget, pgSteps };
}

function retroProtectPlan(spec, target) {
  const attempt = spec.attempt || {};
  const outcome = attempt.verified ? attempt.verified.outcome : attempt.result && attempt.result.best;
  const chemo = outcome && outcome.chemoselectivity;
  if (!spec.record || !chemo || spec.transform.group === 'Protecting groups') {
    return null;
  }
  for (const option of retroProtectOptions(target, spec, chemo)) {
    const plan = retroProtectTry(target, spec, option);
    if (plan) {
      return retroProtectCandidate(target, spec, plan);
    }
  }
  return null;
}

function retroProtectCandidate(t, spec, plan) {
  const step = plan.pgSteps[1];
  const precursors = spec.precursors.map(retroPrecursorInfo);
  const edit = retroEditAtoms(t, spec.record);
  const groupLabel = (typeof RX_CHEMO_GROUP_LABELS === 'object' && RX_CHEMO_GROUP_LABELS[plan.option.kind]) || plan.option.kind;
  return {
    transform: spec.transform.id,
    name: spec.transform.name + ' with ' + plan.pg.label + '-protected ' + groupLabel,
    group: 'Protecting groups',
    rule: spec.transform.rule,
    outcomeRule: step.outcome.rule,
    outcomeId: step.outcome.id,
    outcomeName: step.outcome.name,
    precursors,
    reagents: spec.reagents.slice(),
    conditions: step.conditions,
    compounds: step.compounds,
    outcome: step.outcome,
    product: plan.pgSteps[2].product,
    minor: plan.pgSteps.some((s) => s.minor),
    labels: reactionConditionLabels(step.conditions, step.compounds),
    key: 'pg:' + plan.option.kind + ':' + plan.option.atoms.join(',') + ':' + spec.key,
    bonds: edit.bonds,
    changedAtoms: edit.changedAtoms,
    stereo: null,
    protection: { group: plan.option.kind, label: plan.pg.label, atoms: plan.option.atoms.map((id) => t.map.get(id)), precursor: plan.precursor, protectedPrecursor: plan.protectedPrecursor, protectedTarget: plan.protectedTarget },
    pgSteps: plan.pgSteps,
    rank: retroRank(t, 'Protecting groups', precursors, null),
  };
}

function* retroDisconnectSteps(graph, ids, options) {
  const start = retroNow();
  const t = retroTarget(graph, ids);
  const out = { smiles: t.smiles, isomericSmiles: t.isomericSmiles, stereocentres: t.stereocentres, candidates: [], tried: 0, truncated: false, reason: '', ms: 0 };
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
  const planning = !(options && options.protect === false);
  t.edits = [];
  const specs = [];
  const seen = new Set();
  let stopped = false;
  for (const transform of RETRO_TRANSFORMS) {
    if ((yield { phase: 'match', transform }) === false) {
      stopped = true;
      break;
    }
    const first = t.edits.length;
    t.currentTransform = transform.id;
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
        specs.push(Object.assign(spec, { transform, key, record: retroSpecRecord(t, spec, first) }));
      }
    });
  }
  t.currentTransform = null;
  const keys = new Set();
  for (const spec of stopped ? [] : specs) {
    if ((yield { phase: 'spec', spec }) === false) {
      stopped = true;
      break;
    }
    out.tried += 1;
    const sink = {};
    const verified = retroTryVerify(spec, t.smiles, sink);
    spec.attempt = { verified, result: sink.result || null };
    if (verified) {
      const candidate = retroCandidate(t, spec, verified);
      if (candidate) {
        out.candidates.push(candidate);
      }
    }
    if (planning && (!verified || verified.outcome.chemoselectivity)) {
      const plan = retroProtectPlan(spec, t);
      if (plan && !keys.has(plan.key)) {
        keys.add(plan.key);
        out.candidates.push(plan);
      }
    }
    spec.attempt = null;
  }
  out.truncated = stopped;
  out.candidates.sort(retroCompare);
  out.candidates = out.candidates.slice(0, RETRO_LIMITS.maxCandidates);
  out.ms = Math.round(retroNow() - start);
  return out;
}

function retroDisconnect(graph, ids, options) {
  const start = retroNow();
  const budget = (options && options.budgetMs) || RETRO_LIMITS.budgetMs;
  const steps = retroDisconnectSteps(graph, ids, options);
  let step = steps.next();
  while (!step.done) {
    step = steps.next(!(step.value.phase === 'spec' && retroNow() - start > budget));
  }
  return step.value;
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
    const next = chain[i + 1];
    const previous = next ? c.precursors[link.precursor].smiles : null;
    if (c.pgSteps) {
      let carried = previous === c.protection.precursor ? previous : null;
      c.pgSteps.forEach((s) => {
        s.compounds.forEach(retroDescribe);
        const step = reactionRouteStep(s.compounds, s.conditions, s.outcome, s.product, s.minor, carried);
        if (step) {
          steps.push(step);
        }
        carried = s.product.smiles;
      });
      continue;
    }
    c.compounds.forEach(retroDescribe);
    const step = reactionRouteStep(c.compounds, c.conditions, c.outcome, c.product, c.minor, previous);
    if (step) {
      steps.push(step);
    }
  }
  return steps;
}

function retroForwardCheck(candidate, targetSmiles) {
  if (candidate.pgSteps) {
    return candidate.pgSteps.every((s, i) => {
      const verified = retroTryVerify({ precursors: s.precursors, reagents: s.reagents, conditions: s.conditions }, i === candidate.pgSteps.length - 1 ? targetSmiles : s.target);
      return !!verified && verified.minor === s.minor;
    });
  }
  const spec = { precursors: candidate.precursors.map((p) => ({ smiles: p.smiles, role: p.role, label: p.label })), reagents: candidate.reagents, conditions: candidate.conditions };
  const verified = retroVerify(spec, targetSmiles);
  return !!verified && verified.minor === candidate.minor;
}
