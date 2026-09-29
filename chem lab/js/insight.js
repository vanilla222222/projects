const INSIGHT_ELECTRONEGATIVITY = {
  H: 2.2, D: 2.2, Li: 0.98, Be: 1.57, B: 2.04, C: 2.55, N: 3.04, O: 3.44, F: 3.98,
  Na: 0.93, Mg: 1.31, Al: 1.61, Si: 1.9, P: 2.19, S: 2.58, Cl: 3.16,
  K: 0.82, Ca: 1.0, Zn: 1.65, Ga: 1.81, Ge: 2.01, As: 2.18, Se: 2.55, Br: 2.96,
  Rb: 0.82, Sr: 0.95, In: 1.78, Sn: 1.96, Sb: 2.05, Te: 2.1, I: 2.66, Xe: 2.6,
  Cs: 0.79, Ba: 0.89, Tl: 1.62, Pb: 2.33, Bi: 2.02, Po: 2.0, At: 2.2, Kr: 3.0,
};

const INSIGHT_HYBRID_ELEMENTS = new Set(['B', 'C', 'N', 'O', 'P', 'S', 'Si', 'Se']);

const GASTEIGER_PARAMS = {
  H: { '*': [7.17, 6.24, -0.56] },
  C: { sp3: [7.98, 9.18, 1.88], sp2: [8.79, 9.32, 1.51], sp: [10.39, 9.45, 0.73] },
  N: { sp3: [11.54, 10.82, 1.36], sp2: [12.87, 11.15, 0.85], sp: [15.68, 11.7, -0.27] },
  O: { sp3: [14.18, 12.92, 1.39], sp2: [17.07, 13.79, 0.47] },
  F: { sp3: [14.66, 13.85, 2.31] },
  Cl: { sp3: [11.0, 9.69, 1.35] },
  Br: { sp3: [10.08, 8.47, 1.16] },
  I: { sp3: [9.9, 7.96, 0.96] },
  S: { sp3: [10.14, 9.13, 1.38], so: [10.14, 9.13, 1.38], so2: [12.0, 10.81, 1.2], sp2: [10.88, 9.49, 1.33] },
  P: { sp3: [8.9, 8.24, 0.96], sp2: [9.665, 8.53, 0.735] },
  Si: { sp3: [7.3, 6.567, 0.657], sp2: [7.905, 6.748, 0.443], sp: [9.065, 7.027, -0.002] },
  B: { sp3: [5.98, 6.82, 1.605], sp2: [6.42, 6.807, 1.322] },
};

const GASTEIGER_SETTINGS = { iterations: 6, damping: 0.5, hydrogenIonization: 20.02 };

function insightElectronegativity(element) {
  if (Object.prototype.hasOwnProperty.call(INSIGHT_ELECTRONEGATIVITY, element)) {
    return INSIGHT_ELECTRONEGATIVITY[element];
  }
  return isMetalElement(element) ? 1.3 : 2.2;
}

function insightValenceElectrons(element) {
  if (element === 'H' || element === 'D') {
    return 1;
  }
  const info = periodicElement(element);
  if (!info || isMetalElement(element)) {
    return null;
  }
  if (info.group >= 13) {
    return info.group - 10;
  }
  return info.group >= 1 && info.group <= 2 ? info.group : null;
}

function insightContext(graph, atomIds) {
  const ctx = propContext(graph, atomIds);
  ctx.h = new Map(ctx.ids.map((id) => {
    const atom = graph.getAtom(id);
    return [id, Number.isInteger(atom.hydrogens) && atom.hydrogens >= 0 ? atom.hydrogens : ctx.hydrogens.get(id)];
  }));
  ctx.bondSum = (id) => ctx.nbrs.get(id).reduce((s, n) => s + n.order, 0);
  return ctx;
}

function insightPiNeighbor(ctx, neighborId, fromId) {
  if (ctx.isAromatic(neighborId)) {
    return true;
  }
  if (!['B', 'C', 'N', 'O'].includes(ctx.el.get(neighborId))) {
    return false;
  }
  return ctx.nbrs.get(neighborId).some((m) => m.id !== fromId && m.order >= 2);
}

function insightAtomInfo(ctx, id) {
  const e = ctx.el.get(id);
  const charge = ctx.charge.get(id);
  const nbrs = ctx.nbrs.get(id);
  const h = ctx.h.get(id);
  const bondSum = ctx.bondSum(id);
  let oxidationState = charge;
  const en = insightElectronegativity(e);
  nbrs.forEach((n) => {
    const other = insightElectronegativity(ctx.el.get(n.id));
    if (other > en) {
      oxidationState += n.order;
    } else if (other < en) {
      oxidationState -= n.order;
    }
  });
  const hydrogenEn = INSIGHT_ELECTRONEGATIVITY.H;
  if (hydrogenEn > en) {
    oxidationState += h;
  } else if (hydrogenEn < en) {
    oxidationState -= h;
  }
  const valence = insightValenceElectrons(e);
  const info = { formalCharge: charge, lonePairs: 0, radical: false, hybridization: null, stericNumber: null, oxidationState };
  if (valence === null || (isMetalElement(e) && nbrs.length === 0)) {
    return info;
  }
  const left = valence - charge - bondSum - h;
  if (left > 0) {
    info.lonePairs = Math.floor(left / 2);
    info.radical = left % 2 === 1;
  }
  if (!INSIGHT_HYBRID_ELEMENTS.has(e)) {
    return info;
  }
  const steric = nbrs.length + h + info.lonePairs + (info.radical ? 1 : 0);
  info.stericNumber = steric;
  let hybridization = steric === 4 ? 'sp3' : steric === 3 ? 'sp2' : steric === 2 ? 'sp' : null;
  const doubles = nbrs.filter((n) => n.order === 2).length;
  if (nbrs.some((n) => n.order === 3) || (doubles === 2 && nbrs.length + h === 2)) {
    hybridization = 'sp';
  } else if (ctx.isAromatic(id)) {
    hybridization = 'sp2';
  } else if (hybridization === 'sp3' && info.lonePairs > 0 && ['N', 'O', 'S'].includes(e) && nbrs.some((n) => insightPiNeighbor(ctx, n.id, id))) {
    hybridization = 'sp2';
  }
  info.hybridization = hybridization;
  return info;
}

function insightAtoms(graph, atomIds) {
  const ctx = insightContext(graph, atomIds);
  return new Map(ctx.ids.map((id) => [id, insightAtomInfo(ctx, id)]));
}

function insightIsHypervalentNitro(ctx, id) {
  if (ctx.el.get(id) !== 'N' || ctx.charge.get(id) !== 0 || ctx.bondSum(id) !== 5) {
    return false;
  }
  return ctx.nbrs.get(id).filter((n) => n.order === 2 && ctx.el.get(n.id) === 'O' && ctx.nbrs.get(n.id).length === 1).length >= 1;
}

function gasteigerType(ctx, id, info) {
  const e = ctx.el.get(id);
  const table = GASTEIGER_PARAMS[e];
  if (!table) {
    return null;
  }
  if (['F', 'Cl', 'Br', 'I'].includes(e)) {
    return table.sp3;
  }
  if (e === 'S') {
    const oxo = ctx.nbrs.get(id).filter((n) => n.order === 2 && ctx.el.get(n.id) === 'O').length;
    if (oxo >= 2) {
      return table.so2;
    }
    if (oxo === 1) {
      return table.so;
    }
  }
  const hyb = info.hybridization || 'sp3';
  if (table[hyb]) {
    return table[hyb];
  }
  if (hyb === 'sp' && table.sp2) {
    return table.sp2;
  }
  return table.sp3 || null;
}

function gasteigerConjugated(ctx, infos, a, b, order) {
  if (order >= 2) {
    return true;
  }
  const piLike = (id) => ctx.isAromatic(id) || ctx.nbrs.get(id).some((n) => n.order >= 2) || infos.get(id).hybridization === 'sp2' || infos.get(id).hybridization === 'sp';
  const hasPi = (id) => ctx.isAromatic(id) || ctx.nbrs.get(id).some((n) => n.order >= 2);
  return piLike(a) && piLike(b) && (hasPi(a) || hasPi(b));
}

function gasteigerStartCharges(ctx, infos) {
  const formal = new Map(ctx.ids.map((id) => [id, ctx.charge.get(id)]));
  ctx.ids.forEach((id) => {
    if (!insightIsHypervalentNitro(ctx, id)) {
      return;
    }
    const oxo = ctx.nbrs.get(id).find((n) => n.order === 2 && ctx.el.get(n.id) === 'O' && ctx.nbrs.get(n.id).length === 1);
    formal.set(id, formal.get(id) + 1);
    formal.set(oxo.id, formal.get(oxo.id) - 1);
  });
  const start = new Map(ctx.ids.map((id) => [id, 0]));
  ctx.ids.forEach((id) => {
    const own = formal.get(id);
    if (!own || Math.abs(start.get(id)) > 1e-12) {
      return;
    }
    let total = own;
    const marked = [id];
    ctx.nbrs.get(id).forEach((n) => {
      if (!gasteigerConjugated(ctx, infos, id, n.id, n.order)) {
        return;
      }
      ctx.nbrs.get(n.id).forEach((m) => {
        if (m.id === id || !gasteigerConjugated(ctx, infos, n.id, m.id, m.order) || ctx.el.get(m.id) !== ctx.el.get(id)) {
          return;
        }
        total += formal.get(m.id);
        marked.push(m.id);
      });
    });
    marked.forEach((m) => start.set(m, total / marked.length));
  });
  return start;
}

function gasteigerCharges(graph, atomIds) {
  const ctx = insightContext(graph, atomIds);
  const infos = new Map(ctx.ids.map((id) => [id, insightAtomInfo(ctx, id)]));
  const params = new Map();
  const unparameterized = new Set();
  ctx.ids.forEach((id) => {
    const p = gasteigerType(ctx, id, infos.get(id));
    if (p) {
      params.set(id, p);
    } else {
      unparameterized.add(id);
    }
  });
  const hp = GASTEIGER_PARAMS.H['*'];
  const q = gasteigerStartCharges(ctx, infos);
  const qh = new Map(ctx.ids.map((id) => [id, 0]));
  const ionization = (p) => p[0] + p[1] + p[2];
  const energy = (p, value) => p[0] + value * (p[1] + p[2] * value);
  let damp = GASTEIGER_SETTINGS.damping;
  for (let iteration = 0; iteration < GASTEIGER_SETTINGS.iterations; iteration++) {
    const chi = new Map();
    const chiH = new Map();
    ctx.ids.forEach((id) => {
      if (params.has(id)) {
        chi.set(id, energy(params.get(id), q.get(id)));
        const count = ctx.h.get(id);
        chiH.set(id, count > 0 ? energy(hp, qh.get(id) / count) : 0);
      }
    });
    const dq = new Map(ctx.ids.map((id) => [id, 0]));
    const dqh = new Map(ctx.ids.map((id) => [id, 0]));
    ctx.ids.forEach((id) => {
      if (!params.has(id)) {
        return;
      }
      const own = params.get(id);
      ctx.nbrs.get(id).forEach((n) => {
        if (!params.has(n.id)) {
          return;
        }
        const dx = chi.get(n.id) - chi.get(id);
        const scale = dx < 0 ? ionization(params.get(n.id)) : ionization(own);
        dq.set(id, dq.get(id) + dx / scale);
      });
      const count = ctx.h.get(id);
      if (count > 0) {
        const dx = chiH.get(id) - chi.get(id);
        const scale = dx < 0 ? GASTEIGER_SETTINGS.hydrogenIonization : ionization(own);
        const per = dx / scale;
        dq.set(id, dq.get(id) + count * per);
        dqh.set(id, dqh.get(id) - count * per);
      }
    });
    ctx.ids.forEach((id) => {
      q.set(id, q.get(id) + damp * dq.get(id));
      qh.set(id, qh.get(id) + damp * dqh.get(id));
    });
    damp *= GASTEIGER_SETTINGS.damping;
  }
  const charges = new Map();
  const heavy = new Map();
  ctx.ids.forEach((id) => {
    const value = unparameterized.has(id) ? 0 : q.get(id);
    heavy.set(id, value);
    charges.set(id, value + (unparameterized.has(id) ? 0 : qh.get(id)));
  });
  charges.hydrogenCharges = new Map(ctx.ids.map((id) => [id, unparameterized.has(id) ? 0 : qh.get(id)]));
  charges.heavyCharges = heavy;
  charges.unparameterized = unparameterized;
  return charges;
}

function insightHasOxo(ctx, id, element) {
  return ctx.nbrs.get(id).some((n) => n.order === 2 && ctx.el.get(n.id) === (element || 'O'));
}

function insightIsCarbonylCarbon(ctx, id) {
  return ctx.el.get(id) === 'C' && ctx.nbrs.get(id).some((n) => n.order === 2 && (ctx.el.get(n.id) === 'O' || ctx.el.get(n.id) === 'S'));
}

function insightIsNitro(ctx, id) {
  if (ctx.el.get(id) !== 'N') {
    return false;
  }
  const oxygens = ctx.nbrs.get(id).filter((n) => ctx.el.get(n.id) === 'O' && ctx.nbrs.get(n.id).length === 1);
  return oxygens.length === 2 && oxygens.some((n) => n.order === 2);
}

function insightRingNeighbors(ctx, ipso) {
  const ring = ctx.cycles.find((c) => c.length === 6 && c.includes(ipso) && c.every((x) => ctx.isAromatic(x)));
  if (!ring) {
    return { ortho: [], para: [] };
  }
  const inRing = new Set(ring);
  const dist = new Map([[ipso, 0]]);
  const queue = [ipso];
  while (queue.length) {
    const cur = queue.shift();
    ctx.nbrs.get(cur).forEach((n) => {
      if (inRing.has(n.id) && !dist.has(n.id)) {
        dist.set(n.id, dist.get(cur) + 1);
        queue.push(n.id);
      }
    });
  }
  return { ortho: ring.filter((x) => dist.get(x) === 1), para: ring.filter((x) => dist.get(x) === 3) };
}

function insightNitroOrthoPara(ctx, ipso) {
  const pos = insightRingNeighbors(ctx, ipso);
  return pos.ortho.concat(pos.para).some((r) => ctx.nbrs.get(r).some((n) => insightIsNitro(ctx, n.id)));
}

function insightSite(atomId, hydrogenOn, group, lo, hi, note) {
  const site = { atomId, group, pKa: [lo, hi], note };
  if (hydrogenOn !== null) {
    site.hydrogenOn = hydrogenOn;
  }
  return site;
}

function insightAcidAt(ctx, id) {
  const e = ctx.el.get(id);
  const nbrs = ctx.nbrs.get(id);
  const charge = ctx.charge.get(id);
  if (ctx.h.get(id) <= 0) {
    return null;
  }
  if (e === 'O') {
    if (charge !== 0) {
      return null;
    }
    if (nbrs.length === 0) {
      return insightSite(id, id, 'Water', 15.7, 15.7, 'O–H of water');
    }
    const partner = nbrs[0].id;
    const pe = ctx.el.get(partner);
    if (pe === 'C' && insightHasOxo(ctx, partner)) {
      const alpha = ctx.nbrs.get(partner).filter((n) => ctx.el.get(n.id) === 'C').map((n) => n.id);
      const activated = alpha.some((a) => ctx.nbrs.get(a).some((n) => ['F', 'Cl', 'Br', 'I'].includes(ctx.el.get(n.id)) || (ctx.el.get(n.id) === 'N' && ctx.charge.get(n.id) > 0)));
      return activated
        ? insightSite(partner, id, 'Carboxylic acid', 2, 3, 'acidic; α-halogen or α-ammonium lowers the pKa')
        : insightSite(partner, id, 'Carboxylic acid', 4, 5, 'acidic');
    }
    if (pe === 'S' && ctx.nbrs.get(partner).filter((n) => n.order === 2 && ctx.el.get(n.id) === 'O').length >= 2) {
      return insightSite(partner, id, 'Sulfonic acid', -2, -1, 'strongly acidic');
    }
    if (pe === 'P' && insightHasOxo(ctx, partner)) {
      return insightSite(partner, id, 'Phosphoric/phosphonic acid', 1, 2, 'acidic, first ionization');
    }
    if (pe === 'C' && ctx.isAromatic(partner)) {
      return insightNitroOrthoPara(ctx, partner)
        ? insightSite(id, id, 'Phenol', 7, 8, 'weakly acidic; o/p-nitro lowers the pKa')
        : insightSite(id, id, 'Phenol', 10, 10, 'weakly acidic');
    }
    if (pe === 'C' && nbrs.length === 1) {
      return insightSite(id, id, 'Alcohol', 15, 17, 'very weakly acidic');
    }
    return null;
  }
  if (e === 'S') {
    return charge === 0 && nbrs.length <= 1 && ctx.bondSum(id) + ctx.h.get(id) === 2 ? insightSite(id, id, 'Thiol', 10, 11, 'weakly acidic') : null;
  }
  if (e === 'N') {
    if (charge > 0) {
      if (ctx.isAromatic(id)) {
        return insightSite(id, id, 'Pyridinium N⁺–H', 5, 5, 'acidic cation');
      }
      if (nbrs.some((n) => ctx.isAromatic(n.id))) {
        return insightSite(id, id, 'Anilinium N⁺–H', 4, 5, 'acidic cation');
      }
      return insightSite(id, id, 'Ammonium N⁺–H', 9, 11, 'weakly acidic cation');
    }
    if (charge < 0) {
      return null;
    }
    const acyl = nbrs.filter((n) => n.order === 1 && (insightIsCarbonylCarbon(ctx, n.id) || (ctx.el.get(n.id) === 'S' && insightHasOxo(ctx, n.id)))).length;
    if (acyl >= 2) {
      return insightSite(id, id, 'Imide N–H', 8, 10, 'weakly acidic');
    }
    if (acyl === 1) {
      return insightSite(id, id, 'Amide N–H', 15, 17, 'very weakly acidic');
    }
    if (ctx.isAromatic(id)) {
      return insightSite(id, id, 'Azole N–H', 14, 18, 'very weakly acidic');
    }
    if (nbrs.some((n) => n.order >= 2)) {
      return null;
    }
    if (nbrs.some((n) => ctx.isAromatic(n.id))) {
      return insightSite(id, id, 'Aniline N–H', 28, 31, 'essentially not acidic');
    }
    return insightSite(id, id, 'Amine N–H', 35, 38, 'essentially not acidic');
  }
  if (e === 'C' && charge === 0) {
    if (nbrs.some((n) => n.order === 3 && ctx.el.get(n.id) === 'C')) {
      return insightSite(id, id, 'Terminal alkyne C–H', 25, 25, 'weakly acidic C–H');
    }
    if (nbrs.some((n) => n.order >= 2) || ctx.isAromatic(id)) {
      return null;
    }
    const carbonyls = nbrs.filter((n) => insightIsCarbonylCarbon(ctx, n.id)).map((n) => n.id);
    if (carbonyls.length >= 2) {
      return insightSite(id, id, '1,3-Dicarbonyl C–H', 9, 13, 'acidic C–H between two carbonyls');
    }
    if (carbonyls.length === 1) {
      const c = carbonyls[0];
      const hetero = ctx.nbrs.get(c).filter((n) => n.order === 1 && n.id !== id && ['O', 'N', 'S'].includes(ctx.el.get(n.id)));
      if (hetero.length === 0) {
        return insightSite(id, id, 'Ketone/aldehyde α-C–H', 19, 20, 'weakly acidic C–H');
      }
      if (hetero.some((n) => ctx.el.get(n.id) === 'O' && ctx.h.get(n.id) === 0 && ctx.charge.get(n.id) === 0)) {
        return insightSite(id, id, 'Ester α-C–H', 24, 25, 'weakly acidic C–H');
      }
    }
  }
  return null;
}

function insightBaseAt(ctx, id) {
  const e = ctx.el.get(id);
  const nbrs = ctx.nbrs.get(id);
  const charge = ctx.charge.get(id);
  if (e === 'N' && charge === 0) {
    if (ctx.isAromatic(id)) {
      if (nbrs.length !== 2 || ctx.h.get(id) > 0) {
        return null;
      }
      const ring = ctx.cycles.find((c) => c.includes(id) && c.every((x) => ctx.isAromatic(x)));
      const pyrroleN = ring && ring.length === 5 && ring.some((x) => x !== id && ctx.el.get(x) === 'N' && (ctx.h.get(x) > 0 || ctx.nbrs.get(x).length === 3));
      return pyrroleN ? insightSite(id, null, 'Imidazole N3', 7, 7, 'weak base') : insightSite(id, null, 'Pyridine-type N', 5, 5, 'weak base');
    }
    const double = nbrs.find((n) => n.order === 2);
    if (double) {
      const c = double.id;
      if (ctx.el.get(c) !== 'C' || ctx.nbrs.get(c).length !== 3) {
        return null;
      }
      const amino = ctx.nbrs.get(c).filter((n) => n.id !== id && n.order === 1 && ctx.el.get(n.id) === 'N').length;
      if (amino === 2) {
        return insightSite(id, null, 'Guanidine', 13, 13, 'strong base');
      }
      if (amino === 1) {
        return insightSite(id, null, 'Amidine', 12, 12, 'strong base');
      }
      return null;
    }
    if (nbrs.some((n) => n.order === 3)) {
      return null;
    }
    if (nbrs.some((n) => insightIsCarbonylCarbon(ctx, n.id) || ((ctx.el.get(n.id) === 'S' || ctx.el.get(n.id) === 'P') && insightHasOxo(ctx, n.id)) || ctx.el.get(n.id) !== 'C')) {
      return null;
    }
    const aryl = nbrs.find((n) => ctx.isAromatic(n.id));
    if (aryl) {
      return insightNitroOrthoPara(ctx, aryl.id)
        ? insightSite(id, null, 'Aniline', 1, 1, 'very weak base; o/p-nitro')
        : insightSite(id, null, 'Aniline', 4, 5, 'weak base');
    }
    if (nbrs.some((n) => ctx.nbrs.get(n.id).some((m) => m.order >= 2))) {
      return null;
    }
    return nbrs.length === 3
      ? insightSite(id, null, 'Tertiary amine', 9.5, 10.5, 'base')
      : insightSite(id, null, 'Aliphatic amine', 10, 11, 'base');
  }
  if (e === 'O') {
    if (charge < 0) {
      if (nbrs.length !== 1) {
        return null;
      }
      const p = nbrs[0].id;
      if (ctx.el.get(p) === 'C' && insightHasOxo(ctx, p)) {
        return insightSite(id, null, 'Carboxylate', 4, 5, 'weak base');
      }
      if (ctx.el.get(p) === 'C' && ctx.isAromatic(p)) {
        return insightSite(id, null, 'Phenoxide', 10, 10, 'base');
      }
      if (ctx.el.get(p) === 'C' && !ctx.nbrs.get(p).some((n) => n.order >= 2)) {
        return insightSite(id, null, 'Alkoxide', 15, 16, 'strong base');
      }
      return null;
    }
    if (charge !== 0) {
      return null;
    }
    const oxo = nbrs.find((n) => n.order === 2);
    if (oxo) {
      const c = oxo.id;
      if (!insightIsCarbonylCarbon(ctx, c) || nbrs.length !== 1) {
        return null;
      }
      if (ctx.nbrs.get(c).some((n) => n.order === 1 && ctx.el.get(n.id) === 'N')) {
        return insightSite(id, null, 'Amide O', -0.5, -0.5, 'very weak base');
      }
      return insightSite(id, null, 'Carbonyl O', -7, -6, 'very weak base');
    }
    if (nbrs.some((n) => ctx.isAromatic(n.id) || ctx.el.get(n.id) !== 'C' || ctx.nbrs.get(n.id).some((m) => m.order >= 2))) {
      return null;
    }
    return insightSite(id, null, 'Alcohol/ether O', -2, -2, 'very weak base');
  }
  return null;
}

function insightMid(site) {
  return (site.pKa[0] + site.pKa[1]) / 2;
}

function acidBaseSites(graph, atomIds) {
  const ctx = insightContext(graph, atomIds);
  const acids = [];
  const bases = [];
  ctx.ids.forEach((id) => {
    const acid = insightAcidAt(ctx, id);
    if (acid) {
      acids.push(acid);
    }
    const base = insightBaseAt(ctx, id);
    if (base) {
      bases.push(base);
    }
  });
  if (acids.length === 0) {
    const carbon = ctx.ids.filter((id) => ctx.el.get(id) === 'C' && ctx.h.get(id) > 0);
    const sp3 = carbon.find((id) => !ctx.isAromatic(id) && !ctx.nbrs.get(id).some((n) => n.order >= 2));
    if (sp3 !== undefined) {
      acids.push(insightSite(sp3, sp3, 'Alkane C–H', 48, 52, 'not acidic'));
    } else if (carbon.length) {
      acids.push(insightSite(carbon[0], carbon[0], 'Arene/alkene C–H', 43, 45, 'not acidic'));
    }
  }
  acids.sort((a, b) => insightMid(a) - insightMid(b));
  bases.sort((a, b) => insightMid(b) - insightMid(a));
  return { acids, bases, mostAcidic: acids[0] || null, mostBasic: bases[0] || null };
}
