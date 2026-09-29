const ATOMIC_MASS = { H: 1.008, D: 2.014, C: 12.011, N: 14.007, O: 15.999, S: 32.06, P: 30.974, F: 18.998, Cl: 35.45, Br: 79.904, I: 126.904 , B: 10.81, Si: 28.085, Se: 78.971, Li: 6.94, Na: 22.99, K: 39.098, Cs: 132.905, Mg: 24.305, Ca: 40.078, Zn: 65.38, Sn: 118.71 };
const MONO_MASS = { H: 1.00782503, D: 2.01410178, C: 12, N: 14.003074, O: 15.9949146, S: 31.9720707, P: 30.973762, F: 18.9984032, Cl: 34.9688527, Br: 78.9183376, I: 126.904473 , B: 11.0093054, Si: 27.9769265, Se: 79.9165218, Li: 7.0160034, Na: 22.9897693, K: 38.9637065, Cs: 132.905452, Mg: 23.9850417, Ca: 39.9625909, Zn: 63.9291422, Sn: 119.9021947 };
fillElementTable(ATOMIC_MASS, (element) => element.mass);
fillElementTable(MONO_MASS, (element) => element.monoMass);

function propContext(graph, atomIds) {
  const ids = atomIds.slice();
  const idSet = new Set(ids);
  const nbrs = new Map(ids.map((id) => [id, []]));
  const bonds = [];
  graph.bonds.forEach((bond) => {
    if (idSet.has(bond.atomA) && idSet.has(bond.atomB)) {
      nbrs.get(bond.atomA).push({ id: bond.atomB, order: bond.order });
      nbrs.get(bond.atomB).push({ id: bond.atomA, order: bond.order });
      bonds.push(bond);
    }
  });
  const el = new Map(ids.map((id) => [id, graph.getAtom(id).element]));
  const charge = new Map(ids.map((id) => [id, graph.getAtom(id).charge || 0]));
  const hydrogens = new Map(ids.map((id) => [
    id,
    implicitHydrogenCount(el.get(id), charge.get(id), nbrs.get(id).reduce((s, n) => s + n.order, 0)),
  ]));
  const ctx = { graph, ids, idSet, nbrs, bonds, el, charge, hydrogens };
  propFindRings(ctx);
  return ctx;
}

function propFindRings(ctx) {
  const ringBondKeys = new Set();
  const cycles = [];
  const seen = new Set();
  const key = (a, b) => (a < b ? a + ':' + b : b + ':' + a);
  ctx.bonds.forEach((bond) => {
    const prev = new Map([[bond.atomA, null]]);
    const queue = [bond.atomA];
    let found = false;
    while (queue.length && !found) {
      const cur = queue.shift();
      for (const n of ctx.nbrs.get(cur)) {
        if ((cur === bond.atomA && n.id === bond.atomB) || prev.has(n.id)) {
          continue;
        }
        prev.set(n.id, cur);
        if (n.id === bond.atomB) {
          found = true;
          break;
        }
        queue.push(n.id);
      }
    }
    if (!found) {
      return;
    }
    const cycle = [];
    for (let at = bond.atomB; at !== null; at = prev.get(at)) {
      cycle.push(at);
    }
    cycle.forEach((id, i) => ringBondKeys.add(key(id, cycle[(i + 1) % cycle.length])));
    const sig = cycle.slice().sort((a, b) => a - b).join(',');
    if (!seen.has(sig) && cycle.length <= 12) {
      seen.add(sig);
      cycles.push(cycle);
    }
  });
  ctx.cycles = cycles;
  ctx.ringBondKeys = ringBondKeys;
  ctx.ringAtoms = new Set();
  cycles.forEach((c) => c.forEach((id) => ctx.ringAtoms.add(id)));
  const inSystem = (id) => ctx.ringAtoms.has(id);
  ctx.aromaticAtoms = new Set();
  ctx.aromaticRings = 0;
  cycles.forEach((cycle) => {
    if (cycle.length !== 5 && cycle.length !== 6 && cycle.length !== 7) {
      return;
    }
    let electrons = 0;
    for (const id of cycle) {
      const sp2 = ctx.nbrs.get(id).some((n) => n.order === 2 && inSystem(n.id));
      const exo = !sp2 && ctx.el.get(id) === 'C' && ctx.nbrs.get(id).some((n) => n.order === 2 && !inSystem(n.id) && ctx.el.get(n.id) !== 'C');
      const donor = !sp2 && ['N', 'O', 'S'].includes(ctx.el.get(id)) && ctx.nbrs.get(id).every((n) => n.order === 1);
      if (sp2) {
        electrons += 1;
      } else if (exo) {
        electrons += 0;
      } else if (donor) {
        electrons += 2;
      } else {
        return;
      }
    }
    if ((electrons - 2) % 4 === 0) {
      ctx.aromaticRings += 1;
      cycle.forEach((id) => ctx.aromaticAtoms.add(id));
    }
  });
  ctx.isRingBond = (a, b) => ringBondKeys.has(key(a, b));
  ctx.isAromatic = (id) => ctx.aromaticAtoms.has(id);
}

function propMass(ctx, table) {
  let total = 0;
  ctx.ids.forEach((id) => {
    total += table[ctx.el.get(id)] + ctx.hydrogens.get(id) * table.H;
  });
  return total;
}

function propHydrogenCount(ctx) {
  return ctx.ids.reduce((s, id) => s + ctx.hydrogens.get(id), 0);
}

function propHillFormula(ctx) {
  const counts = {};
  ctx.ids.forEach((id) => {
    const e = ctx.el.get(id);
    counts[e] = (counts[e] || 0) + 1;
  });
  const h = propHydrogenCount(ctx);
  if (h) {
    counts.H = h;
  }
  const keys = Object.keys(counts).filter((k) => k !== 'C' && k !== 'H').sort();
  const order = counts.C ? ['C'].concat(counts.H ? ['H'] : [], keys) : Object.keys(counts).sort();
  return order.map((k) => k + (counts[k] > 1 ? counts[k] : '')).join('') + chargeText(propNetCharge(ctx));
}

function propNetCharge(ctx) {
  return ctx.ids.reduce((s, id) => s + ctx.charge.get(id), 0);
}

function propTpsa(ctx) {
  let total = 0;
  ctx.ids.forEach((id) => {
    const e = ctx.el.get(id);
    const h = ctx.hydrogens.get(id);
    const n = ctx.nbrs.get(id);
    const deg = n.length;
    const dbl = n.filter((x) => x.order === 2).length;
    const tri = n.filter((x) => x.order === 3).length;
    const arom = ctx.isAromatic(id);
    if (e === 'N') {
      if (arom) {
        total += dbl ? 12.89 : h ? 15.79 : 4.93;
      } else if (tri) {
        total += 23.79;
      } else if (dbl) {
        total += h ? 23.85 : deg === 2 ? 12.36 : 3.01;
      } else if (h === 2) {
        total += 26.02;
      } else if (h === 1) {
        total += 12.03;
      } else {
        total += 3.24;
      }
    } else if (e === 'O') {
      if (arom) {
        total += 13.14;
      } else if (dbl) {
        total += 17.07;
      } else if (h) {
        total += 20.23;
      } else {
        total += 9.23;
      }
    }
  });
  return total;
}

function propHydrogenBonding(ctx) {
  let donors = 0;
  let acceptors = 0;
  ctx.ids.forEach((id) => {
    const e = ctx.el.get(id);
    if (e === 'N' || e === 'O') {
      acceptors += 1;
      if (ctx.hydrogens.get(id) > 0) {
        donors += 1;
      }
    }
  });
  return { donors, acceptors };
}

function propRotatableBonds(ctx) {
  let count = 0;
  ctx.bonds.forEach((bond) => {
    if (bond.order !== 1 || ctx.isRingBond(bond.atomA, bond.atomB)) {
      return;
    }
    const a = ctx.nbrs.get(bond.atomA);
    const b = ctx.nbrs.get(bond.atomB);
    if (a.length < 2 || b.length < 2) {
      return;
    }
    const amide = (c, n) =>
      ctx.el.get(c) === 'C' && ctx.el.get(n) === 'N' &&
      ctx.nbrs.get(c).some((x) => x.order === 2 && ctx.el.get(x.id) === 'O');
    if (amide(bond.atomA, bond.atomB) || amide(bond.atomB, bond.atomA)) {
      return;
    }
    if (a.some((x) => x.order === 3) || b.some((x) => x.order === 3)) {
      return;
    }
    count += 1;
  });
  return count;
}

const PROP_SMILES_ORGANIC = new Set(['B', 'C', 'N', 'O', 'S', 'P', 'F', 'Cl', 'Br', 'I']);
const PROP_HETERO = new Set(['N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I']);
const PROP_HALOGEN_AROMATIC = { F: 0, Cl: 0.245, Br: 0.198, I: 0 };
const PROP_HALOGEN = { F: 0.4202, Cl: 0.6895, Br: 0.8456, I: 0.8857 };

function propNeighbors(ctx, id) {
  return ctx.nbrs.get(id).map((n) => ({
    id: n.id,
    order: n.order,
    el: ctx.el.get(n.id),
    arom: ctx.isAromatic(n.id),
    aromBond: ctx.isAromatic(id) && ctx.isAromatic(n.id) && ctx.isRingBond(id, n.id),
  }));
}

function propCarbonLogP(ctx, id) {
  const h = ctx.hydrogens.get(id);
  const n = propNeighbors(ctx, id);
  const x = n.length + h;
  const single = n.filter((v) => v.order === 1 || v.aromBond);
  const dbl = n.filter((v) => v.order === 2 && !v.aromBond);
  const aliph = (v) => !v.arom;
  const aliphC = (v) => v.el === 'C' && !v.arom;
  const het = (v) => PROP_HETERO.has(v.el);
  if (ctx.isAromatic(id)) {
    const ab = n.filter((v) => v.aromBond);
    const ex = n.filter((v) => !v.aromBond);
    if (ex.length === 0) {
      return h ? 0.1581 : 0.2955;
    }
    const e = ex[0];
    if (e.order === 2) {
      return -0.8186;
    }
    if (e.el === 'F' || e.el === 'Cl' || e.el === 'Br' || e.el === 'I') {
      return PROP_HALOGEN_AROMATIC[e.el];
    }
    if (ab.length === 3) {
      return 0.2955;
    }
    if (e.arom) {
      return 0.2713;
    }
    if (e.el === 'C') {
      return 0.136;
    }
    if (e.el === 'N') {
      return 0.4619;
    }
    if (e.el === 'O') {
      return 0.5437;
    }
    if (e.el === 'S') {
      return 0.1893;
    }
    return 0.08129;
  }
  if (h === 4 || (h === 3 && single.length === 1 && aliphC(single[0])) || (h === 2 && single.length === 2 && single.every(aliphC) && x === 4)) {
    return 0.1441;
  }
  if ((h === 1 && x === 4 && single.length === 3 && single.every(aliphC)) || (h === 0 && x === 4 && single.length === 4 && single.every(aliphC))) {
    return 0;
  }
  if (h === 3 && single.length === 1 && het(single[0])) {
    return -0.2035;
  }
  if (x === 4 && dbl.length === 0 && n.every((v) => v.order === 1)) {
    const hetN = n.filter(het).length;
    if (h === 2 && hetN >= 1 && n.length === 2 && aliph(n[0]) && aliph(n[1])) {
      return -0.2035;
    }
    if ((h === 1 || h === 0) && hetN >= 1 && n.every(aliph)) {
      return -0.2051;
    }
  }
  if (dbl.length === 1 && dbl[0].el !== 'C' && !dbl[0].arom) {
    return -0.2783;
  }
  const doubleC = dbl.filter(aliphC);
  if (doubleC.length && n.filter((v) => v.order === 1 || v.aromBond).every(aliph)) {
    return 0.1551;
  }
  if (n.some((v) => v.order === 3)) {
    return 0.0017;
  }
  if (h === 3 && single.length === 1 && single[0].arom && single[0].el === 'C') {
    return 0.08452;
  }
  if (h === 3 && single.length === 1 && single[0].arom) {
    return -0.1444;
  }
  if (x === 4 && single.some((v) => v.arom) && n.every((v) => v.order === 1)) {
    return h === 2 ? -0.0516 : h === 1 ? 0.1193 : -0.0967;
  }
  if (doubleC.length) {
    return 0.264;
  }
  if (dbl.some((v) => v.arom)) {
    return 0.264;
  }
  return 0.08129;
}

function propNitrogenLogP(ctx, id) {
  const h = ctx.hydrogens.get(id);
  const n = propNeighbors(ctx, id);
  if (ctx.isAromatic(id)) {
    return -0.3239;
  }
  const single = n.filter((v) => v.order === 1);
  const dbl = n.filter((v) => v.order === 2);
  const oxy = n.filter((v) => v.el === 'O');
  if (oxy.length >= 2 && dbl.length === 1) {
    return -0.3396;
  }
  if (n.some((v) => v.order === 3)) {
    return 0.01508;
  }
  if (dbl.length) {
    return h === 1 && n.length === 1 ? 0.08387 : n.length === 2 ? 0.1836 : -0.4806;
  }
  const arom = single.filter((v) => v.arom).length;
  if (h === 2) {
    return arom ? -1.027 : -1.019;
  }
  if (h === 1) {
    return arom ? -0.5188 : -0.7096;
  }
  if (arom) {
    return -0.4458;
  }
  return -0.3187;
}

function propOxygenLogP(ctx, id) {
  const h = ctx.hydrogens.get(id);
  const n = propNeighbors(ctx, id);
  if (ctx.isAromatic(id)) {
    return 0.1552;
  }
  if (h > 0) {
    return -0.2893;
  }
  const dbl = n.find((v) => v.order === 2);
  if (dbl) {
    if (dbl.el === 'N' || dbl.el === 'O') {
      return 0.0335;
    }
    if (dbl.el === 'S') {
      return -0.3339;
    }
    if (dbl.el !== 'C') {
      return -0.1188;
    }
    if (dbl.arom) {
      return 0.1788;
    }
    const subs = propNeighbors(ctx, dbl.id).filter((v) => v.id !== id);
    const hc = ctx.hydrogens.get(dbl.id);
    const nonC = (v) => v.el !== 'C';
    if (hc >= 2) {
      return -0.1526;
    }
    if (subs.length && subs.length <= 2 && subs.every(nonC)) {
      return 0.4833;
    }
    if (hc === 1) {
      return subs[0].arom && subs[0].el === 'C' ? 0.1129 : -0.1526;
    }
    const [p, q] = subs;
    const aliphC = (v) => v.el === 'C' && !v.arom;
    if ((aliphC(p) && !q.arom) || (aliphC(q) && !p.arom)) {
      return -0.1526;
    }
    return 0.1129;
  }
  if (n.length === 2 && n.every((v) => !v.arom)) {
    return -0.0684;
  }
  if (n.length === 2 && n.some((v) => v.arom)) {
    return -0.4195;
  }
  return -0.1188;
}

function propHydrogenLogP(ctx, id) {
  const e = ctx.el.get(id);
  if (e === 'C') {
    return 0.123;
  }
  if (e === 'N') {
    return 0.2142;
  }
  if (e === 'O') {
    const n = propNeighbors(ctx, id);
    const c = n.find((v) => v.el === 'C');
    if (c && !c.arom) {
      const cn = propNeighbors(ctx, c.id);
      if (cn.some((v) => v.order === 2 && v.id !== id)) {
        return 0.298;
      }
    }
    if (n.some((v) => v.el === 'O' || v.el === 'S')) {
      return 0.298;
    }
    if (n.some((v) => v.el === 'N')) {
      return 0.2142;
    }
    return -0.2677;
  }
  if (e === 'S') {
    return -0.2677;
  }
  return -0.2677;
}

function propLogP(ctx) {
  let total = 0;
  ctx.ids.forEach((id) => {
    const e = ctx.el.get(id);
    let heavy = 0;
    if (e === 'C') {
      heavy = propCarbonLogP(ctx, id);
    } else if (e === 'N') {
      heavy = propNitrogenLogP(ctx, id);
    } else if (e === 'O') {
      heavy = propOxygenLogP(ctx, id);
    } else if (e === 'S') {
      const dblHetero = ctx.nbrs.get(id).some((v) => v.order === 2);
      heavy = ctx.isAromatic(id) ? 0.6237 : dblHetero ? -0.0024 : 0.6482;
    } else if (e === 'P') {
      heavy = 0.8612;
    } else if (PROP_HALOGEN[e] !== undefined) {
      heavy = PROP_HALOGEN[e];
    }
    total += heavy + ctx.hydrogens.get(id) * propHydrogenLogP(ctx, id);
  });
  return total;
}

function propIonizable(ctx) {
  const groups = [];
  const count = { acid: 0, phenol: 0, sulfonic: 0, aminePrimary: 0, amineSecondary: 0, amineTertiary: 0, aniline: 0, pyridine: 0, imidazole: 0, amide: 0, thiol: 0 };
  ctx.ids.forEach((id) => {
    const e = ctx.el.get(id);
    const n = ctx.nbrs.get(id);
    const h = ctx.hydrogens.get(id);
    if (e === 'C') {
      const oxo = n.filter((x) => x.order === 2 && ctx.el.get(x.id) === 'O');
      if (oxo.length && n.some((x) => ctx.el.get(x.id) === 'O' && x.order === 1 && ctx.hydrogens.get(x.id) > 0)) {
        count.acid += 1;
      }
      if (oxo.length && n.some((x) => ctx.el.get(x.id) === 'N' && x.order === 1)) {
        count.amide += 1;
      }
    } else if (e === 'O' && h && n.some((x) => ctx.isAromatic(x.id))) {
      count.phenol += 1;
    } else if (e === 'S') {
      if (h) {
        count.thiol += 1;
      }
      if (n.filter((x) => x.order === 2 && ctx.el.get(x.id) === 'O').length === 2 && n.some((x) => ctx.el.get(x.id) === 'O' && x.order === 1 && ctx.hydrogens.get(x.id) > 0)) {
        count.sulfonic += 1;
      }
    } else if (e === 'N') {
      if (ctx.isAromatic(id)) {
        if (n.some((x) => x.order === 2)) {
          const ring = ctx.cycles.find((c) => c.includes(id));
          const ringN = ring ? ring.filter((x) => ctx.el.get(x) === 'N').length : 1;
          ringN === 2 && ring.length === 5 ? (count.imidazole += 1) : (count.pyridine += 1);
        }
        return;
      }
      if (n.some((x) => x.order >= 2)) {
        return;
      }
      if (n.some((x) => ctx.el.get(x.id) === 'C' && ctx.nbrs.get(x.id).some((y) => y.order === 2 && ctx.el.get(y.id) === 'O'))) {
        return;
      }
      if (n.some((x) => ctx.isAromatic(x.id))) {
        count.aniline += 1;
      } else if (h === 2) {
        count.aminePrimary += 1;
      } else if (h === 1) {
        count.amineSecondary += 1;
      } else if (n.every((x) => ctx.el.get(x.id) === 'C')) {
        count.amineTertiary += 1;
      }
    }
  });
  const push = (k, label, note) => {
    if (count[k]) {
      groups.push({ label: label + (count[k] > 1 ? ' x' + count[k] : ''), note });
    }
  };
  push('acid', 'Carboxylic acid', 'acidic, pKa about 4-5');
  push('sulfonic', 'Sulfonic acid', 'strongly acidic, pKa below 0');
  push('phenol', 'Phenol', 'weakly acidic, pKa about 10');
  push('thiol', 'Thiol', 'weakly acidic, pKa about 10');
  push('aminePrimary', 'Primary amine', 'basic, conjugate acid pKa about 10-11');
  push('amineSecondary', 'Secondary amine', 'basic, conjugate acid pKa about 10-11');
  push('amineTertiary', 'Tertiary amine', 'basic, conjugate acid pKa about 9-10');
  push('aniline', 'Aromatic amine', 'weakly basic, conjugate acid pKa about 4-5');
  push('imidazole', 'Imidazole-type nitrogen', 'weakly basic, conjugate acid pKa about 7');
  push('pyridine', 'Pyridine-type nitrogen', 'weakly basic, conjugate acid pKa about 5');
  push('amide', 'Amide', 'neutral at physiological pH');
  return groups;
}

function propRefineRanks(ctx, invariant, bondLabel, rounds, untilStable) {
  const assign = (labels) => {
    const sorted = Array.from(new Set(labels.values())).sort();
    const next = new Map();
    labels.forEach((v, id) => next.set(id, sorted.indexOf(v)));
    return next;
  };
  let rank = assign(invariant);
  let count = new Set(rank.values()).size;
  for (let round = 0; round < rounds; round++) {
    const labels = new Map();
    ctx.ids.forEach((id) => {
      labels.set(id, String(rank.get(id)).padStart(5, '0') + ':' + ctx.nbrs.get(id).map((x) => bondLabel(id, x) + '.' + String(rank.get(x.id)).padStart(5, '0')).sort().join(','));
    });
    rank = assign(labels);
    const nextCount = new Set(rank.values()).size;
    if (untilStable && nextCount === count) {
      break;
    }
    count = nextCount;
  }
  return rank;
}

function propCanonicalRank(ctx) {
  const invariant = new Map();
  ctx.ids.forEach((id) => {
    const n = ctx.nbrs.get(id);
    invariant.set(id, [ctx.el.get(id), n.length, ctx.hydrogens.get(id), n.map((x) => x.order).sort().join(''), ctx.charge.get(id)].join('|'));
  });
  return propRefineRanks(ctx, invariant, (id, x) => x.order, 6, false);
}

function propSymmetryClasses(ctx) {
  const bondLabel = (id, x) => (ctx.isAromatic(id) && ctx.isAromatic(x.id) && ctx.isRingBond(id, x.id) ? 'a' : String(x.order));
  const invariant = new Map();
  ctx.ids.forEach((id) => {
    const n = ctx.nbrs.get(id);
    invariant.set(id, [ctx.el.get(id), n.length, ctx.hydrogens.get(id), n.map((x) => bondLabel(id, x)).sort().join(''), ctx.charge.get(id), ctx.isAromatic(id) ? 'ar' : ''].join('|'));
  });
  return propRefineRanks(ctx, invariant, bondLabel, ctx.ids.length + 1, true);
}

function propSmiles(ctx) {
  if (ctx.ids.length === 0) {
    return '';
  }
  const rank = propCanonicalRank(ctx);
  const order = (a, b) => rank.get(a) - rank.get(b) || a - b;
  const start = ctx.ids.slice().sort((a, b) => {
    const da = ctx.nbrs.get(a).length;
    const db = ctx.nbrs.get(b).length;
    return da - db || order(a, b);
  })[0];
  const visited = new Set();
  const children = new Map();
  const openings = new Map();
  const closings = new Map();
  const edgeSeen = new Set();
  const ek = (a, b) => (a < b ? a + ':' + b : b + ':' + a);
  const orderOf = (a, b) => ctx.nbrs.get(a).find((x) => x.id === b).order;
  const visit = (v, parent) => {
    visited.add(v);
    children.set(v, []);
    ctx.nbrs.get(v).map((x) => x.id).sort(order).forEach((w) => {
      if (w === parent) {
        return;
      }
      if (visited.has(w)) {
        if (!edgeSeen.has(ek(v, w))) {
          edgeSeen.add(ek(v, w));
          if (!openings.has(w)) {
            openings.set(w, []);
          }
          openings.get(w).push(v);
          if (!closings.has(v)) {
            closings.set(v, []);
          }
          closings.get(v).push(w);
        }
      } else {
        edgeSeen.add(ek(v, w));
        children.get(v).push(w);
        visit(w, v);
      }
    });
  };
  visit(start, null);
  const free = [];
  let nextDigit = 1;
  const digitOf = new Map();
  const digitText = (d) => (d > 9 ? '%' + d : String(d));
  const bondChar = (o) => (o === 2 ? '=' : o === 3 ? '#' : '');
  const atomText = (v) => {
    const q = ctx.charge.get(v);
    const e = ctx.el.get(v);
    if (!q && PROP_SMILES_ORGANIC.has(e)) {
      return e;
    }
    const h = ctx.hydrogens.get(v);
    const mag = Math.abs(q);
    const qText = q ? (q > 0 ? '+' : '-') + (mag > 1 ? mag : '') : '';
    return '[' + (e === 'D' ? '2H' : e) + (h ? 'H' + (h > 1 ? h : '') : '') + qText + ']';
  };
  const write = (v) => {
    let out = atomText(v);
    (closings.get(v) || []).forEach((w) => {
      const d = digitOf.get(ek(v, w));
      out += digitText(d);
      free.push(d);
      free.sort((a, b) => a - b);
    });
    (openings.get(v) || []).forEach((w) => {
      const d = free.length ? free.shift() : nextDigit++;
      digitOf.set(ek(v, w), d);
      out += bondChar(orderOf(v, w)) + digitText(d);
    });
    const kids = children.get(v);
    kids.forEach((w, i) => {
      const piece = bondChar(orderOf(v, w)) + write(w);
      out += i < kids.length - 1 ? '(' + piece + ')' : piece;
    });
    return out;
  };
  return write(start);
}

function formulaHtml(formula) {
  const text = String(formula || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const charge = /(\d*[+\u2212])$/.exec(text);
  const body = charge ? text.slice(0, text.length - charge[1].length) : text;
  return body.replace(/([A-Za-z)\]])(\d+)/g, '$1<sub>$2</sub>') + (charge ? '<sup>' + charge[1] + '</sup>' : '');
}

function computePropertiesProtio(graph, atomIds) {
  const ctx = propContext(graph, atomIds);
  const hb = propHydrogenBonding(ctx);
  const mass = propMass(ctx, ATOMIC_MASS);
  const logP = propLogP(ctx);
  const tpsa = propTpsa(ctx);
  const rotatable = propRotatableBonds(ctx);
  const ringCount = ctx.bonds.length - ctx.ids.length + 1;
  const lipinski = [];
  if (mass > 500) {
    lipinski.push('MW above 500');
  }
  if (logP > 5) {
    lipinski.push('logP above 5');
  }
  if (hb.donors > 5) {
    lipinski.push('more than 5 H-bond donors');
  }
  if (hb.acceptors > 10) {
    lipinski.push('more than 10 H-bond acceptors');
  }
  const veber = [];
  if (rotatable > 10) {
    veber.push('more than 10 rotatable bonds');
  }
  if (tpsa > 140) {
    veber.push('TPSA above 140');
  }
  return {
    formula: propHillFormula(ctx),
    averageMass: mass,
    exactMass: propMass(ctx, MONO_MASS),
    heavyAtoms: ctx.ids.length,
    hydrogens: propHydrogenCount(ctx),
    rings: Math.max(0, ringCount),
    aromaticRings: ctx.aromaticRings,
    donors: hb.donors,
    acceptors: hb.acceptors,
    rotatable,
    tpsa,
    logP,
    lipinski,
    veber,
    ionizable: propIonizable(ctx),
    smiles: propSmiles(ctx),
    charge: propNetCharge(ctx),
  };
}

function computeProperties(graph, atomIds) {
  const dCount = atomIds.filter((id) => graph.getAtom(id).element === 'D').length;
  if (dCount === 0) {
    return computePropertiesProtio(graph, atomIds);
  }
  const { copy, ids } = protioCopy(graph, atomIds);
  const p = computePropertiesProtio(copy, ids);
  const hMatch = /H(\d*)/.exec(p.formula);
  const hTotal = hMatch ? (hMatch[1] === '' ? 1 : Number(hMatch[1])) : 0;
  const remaining = Math.max(0, hTotal - dCount);
  const hPart = remaining === 0 ? '' : remaining === 1 ? 'H' : 'H' + remaining;
  const dPart = dCount === 1 ? 'D' : 'D' + dCount;
  p.formula = hMatch ? p.formula.replace(hMatch[0], hPart + dPart) : p.formula + dPart;
  p.averageMass += dCount * (ATOMIC_MASS.D - ATOMIC_MASS.H);
  p.exactMass += dCount * (MONO_MASS.D - MONO_MASS.H);
  p.hydrogens = remaining;
  p.deuterium = dCount;
  return p;
}
