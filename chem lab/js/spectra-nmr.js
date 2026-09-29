const SPECTRA_HALOGENS = new Set(['F', 'Cl', 'Br', 'I']);

const NMR_AROMATIC_INCREMENTS = {
  CH3: { c: [9.3, 0.7, -0.1, -2.9], h: [-0.2, -0.12, -0.22] },
  CH2R: { c: [15.6, -0.5, 0, -2.6], h: [-0.14, -0.06, -0.17] },
  CHR2: { c: [20.1, -2.0, 0, -2.5], h: [-0.13, -0.08, -0.18] },
  CR3: { c: [22.1, -3.4, -0.4, -3.1], h: [0.02, -0.08, -0.21] },
  CF3: { c: [2.6, -3.1, 0.4, 3.4], h: [0.32, 0.14, 0.2] },
  CH2O: { c: [12.4, -1.2, 0.2, -1.1], h: [-0.07, -0.07, -0.07] },
  CH2X: { c: [9.1, 0, 0.2, -0.2], h: [0, 0, 0] },
  CH2N: { c: [15.0, -1.5, -0.2, -2.0], h: [-0.05, -0.05, -0.05] },
  'C=C': { c: [9.1, -2.4, 0.2, -0.5], h: [0.06, -0.03, -0.1] },
  CCH: { c: [-6.2, 3.6, -0.4, -0.3], h: [0.15, -0.02, -0.01] },
  Ar: { c: [13.0, -1.1, 0.5, -1.0], h: [0.37, 0.2, 0.1] },
  CHO: { c: [8.2, 1.2, 0.5, 5.8], h: [0.56, 0.22, 0.29] },
  COR: { c: [8.9, 0.1, -0.1, 4.4], h: [0.62, 0.14, 0.21] },
  COAr: { c: [9.1, 1.5, -0.2, 3.8], h: [0.47, 0.13, 0.22] },
  COOH: { c: [2.1, 1.6, -0.1, 5.2], h: [0.77, 0.13, 0.27] },
  'COO-': { c: [8.0, 1.0, 0, 3.0], h: [0.4, 0.1, 0.1] },
  COOR: { c: [2.0, 1.2, -0.1, 4.3], h: [0.71, 0.1, 0.21] },
  CONR2: { c: [5.0, -1.2, 0.1, 3.4], h: [0.61, 0.1, 0.17] },
  COCl: { c: [4.7, 2.7, 0.3, 6.6], h: [0.84, 0.22, 0.36] },
  CN: { c: [-15.7, 3.6, 0.7, 4.3], h: [0.36, 0.18, 0.28] },
  'C=N': { c: [7.0, -1.0, 0, 1.5], h: [0.4, 0.1, 0.1] },
  OH: { c: [26.9, -12.8, 1.4, -7.4], h: [-0.56, -0.12, -0.45] },
  'O-': { c: [39.6, -8.2, 1.9, -13.6], h: [-0.9, -0.3, -0.8] },
  OR: { c: [31.4, -14.4, 1.0, -7.7], h: [-0.48, -0.09, -0.44] },
  OAr: { c: [27.6, -11.2, -0.3, -6.9], h: [-0.29, -0.05, -0.23] },
  OCOR: { c: [22.4, -7.1, -0.4, -3.2], h: [-0.25, 0.03, -0.13] },
  NH2: { c: [18.2, -13.4, 0.8, -10.0], h: [-0.68, -0.2, -0.6] },
  NR2: { c: [22.4, -15.7, 0.8, -11.8], h: [-0.66, -0.18, -0.67] },
  NAr: { c: [14.7, -10.6, 0.9, -7.6], h: [-0.3, -0.05, -0.4] },
  NCO: { c: [9.7, -8.1, 0.2, -4.4], h: [0.12, -0.07, -0.28] },
  NO2: { c: [19.9, -4.9, 0.9, 6.1], h: [0.87, 0.2, 0.35] },
  'N+': { c: [19.4, -5.1, 1.5, 2.4], h: [0.6, 0.3, 0.3] },
  F: { c: [35.1, -14.3, 0.9, -4.5], h: [-0.26, 0, -0.2] },
  Cl: { c: [6.4, 0.2, 1.0, -2.0], h: [0.03, -0.02, -0.09] },
  Br: { c: [-5.4, 3.4, 2.2, -1.0], h: [0.18, -0.08, -0.04] },
  I: { c: [-32.2, 9.9, 2.6, -7.3], h: [0.39, -0.21, 0] },
  SH: { c: [2.1, 0.7, 0.3, -3.2], h: [-0.08, -0.16, -0.22] },
  SR: { c: [10.2, -1.9, 0.4, -3.6], h: [-0.08, -0.1, -0.24] },
  SOR: { c: [17.6, -5.0, 1.1, 2.4], h: [0.33, 0.22, 0.22] },
  SO2R: { c: [12.3, -1.4, 0.8, 5.1], h: [0.6, 0.25, 0.33] },
  Si: { c: [11.6, 4.9, -0.7, 0.4], h: [0.22, -0.02, -0.02] },
  fused6: { c: [5.6, -0.5, 0, -2.6], h: [0.4, 0.08, 0.04] },
  fused5X: { c: [0, -17.4, 0, -8.6], h: [0.04, 0, -0.24] },
  fused5C: { c: [0, -7.7, 0, -6.5], h: [0.29, 0, -0.17] },
};

const NMR_H_ALPHA = {
  Ar: [[1.5, 1.28, 1.4], 0.38],
  'C=C': [[0.85, 0.7, 0.65], 0.1],
  CCH: [[0.94, 0.8, 0.85], 0.15],
  CHO: [[1.34, 1.05, 1.0], 0.3],
  COR: [[1.31, 1.07, 1.0], 0.2],
  COAr: [[1.75, 1.55, 1.5], 0.25],
  COOH: [[1.24, 1.01, 1.0], 0.25],
  'COO-': [[1.0, 0.9, 0.9], 0.2],
  COOR: [[1.19, 0.95, 0.95], 0.25],
  CONR2: [[1.2, 0.9, 0.9], 0.25],
  COCl: [[1.8, 1.5, 1.5], 0.3],
  CN: [[1.24, 0.99, 1.0], 0.44],
  'C=N': [[1.1, 0.9, 0.9], 0.2],
  OH: [[2.55, 2.35, 2.45], 0.36],
  'O-': [[2.55, 2.35, 2.45], 0.36],
  OR: [[2.36, 2.11, 2.1], 0.33],
  OAr: [[2.94, 2.6, 2.6], 0.45],
  OCOR: [[2.86, 2.75, 3.4], 0.4],
  NH2: [[1.45, 1.2, 1.3], 0.15],
  NR2: [[1.45, 1.2, 1.3], 0.15],
  NAr: [[1.98, 1.75, 1.8], 0.25],
  NCO: [[2.0, 1.9, 2.2], 0.2],
  NO2: [[3.45, 3.05, 3.0], 0.72],
  'N+': [[2.2, 2.0, 2.0], 0.4],
  SH: [[1.24, 1.2, 1.3], 0.3],
  SR: [[1.24, 1.2, 1.3], 0.3],
  SOR: [[1.76, 1.5, 1.5], 0.35],
  SO2R: [[2.1, 1.6, 1.6], 0.4],
  F: [[3.4, 3.18, 3.2], 0.49],
  Cl: [[2.19, 2.2, 2.2], 0.62],
  Br: [[1.82, 2.05, 2.2], 0.81],
  I: [[1.3, 1.83, 2.2], 0.97],
  other: [[0.5, 0.5, 0.5], 0.1],
};

const NMR_VINYL_Z = {
  alkyl: [0.45, -0.22, -0.28],
  CH2O: [0.64, -0.01, -0.02],
  CH2X: [0.7, 0.11, -0.04],
  CH2N: [0.58, -0.1, -0.08],
  CF3: [0.66, 0.61, 0.32],
  'C=C': [1.0, -0.09, -0.23],
  CCH: [0.47, 0.38, 0.12],
  Ar: [1.38, 0.36, -0.07],
  CHO: [1.02, 0.95, 1.17],
  COR: [1.1, 1.12, 0.87],
  COAr: [1.1, 1.12, 0.87],
  COOH: [0.97, 1.41, 0.71],
  'COO-': [0.7, 0.8, 0.5],
  COOR: [0.8, 1.18, 0.55],
  CONR2: [1.37, 0.98, 0.46],
  COCl: [1.11, 1.46, 1.01],
  CN: [0.27, 0.75, 0.55],
  'C=N': [0.9, 0.9, 0.6],
  OH: [1.22, -1.07, -1.21],
  'O-': [1.22, -1.07, -1.21],
  OR: [1.22, -1.07, -1.21],
  OAr: [1.21, -0.6, -1.0],
  OCOR: [2.11, -0.35, -0.64],
  NH2: [0.8, -1.26, -1.21],
  NR2: [0.8, -1.26, -1.21],
  NAr: [0.8, -0.9, -1.0],
  NCO: [2.08, -0.57, -0.72],
  NO2: [1.87, 1.32, 0.62],
  'N+': [1.4, 0.6, 0.5],
  SH: [1.11, -0.29, -0.13],
  SR: [1.11, -0.29, -0.13],
  SOR: [1.27, 0.67, 0.41],
  SO2R: [1.55, 1.16, 0.93],
  F: [1.54, -0.4, -1.02],
  Cl: [1.08, 0.18, 0.13],
  Br: [1.07, 0.45, 0.55],
  I: [1.14, 0.81, 0.88],
  other: [0.4, 0, 0],
};

const NMR_C_GROUP = {
  Ar: { a: 23.8, b: 7.5, g: -2, pen: 'c' },
  'C=C': { a: 21.7, b: 6, g: -2, pen: 'c' },
  CCH: { a: 5.6, b: 5, g: -3, pen: 'c' },
  CHO: { a: 33.5, b: -0.2, g: -2, pen: 'c' },
  COR: { a: 33.2, b: 1.1, g: -2, pen: 'c' },
  COAr: { a: 28.9, b: 1.1, g: -2, pen: 'c' },
  COOH: { a: 23.1, b: 2, g: -2, pen: 'c' },
  'COO-': { a: 26, b: 2, g: -2, pen: 'c' },
  COOR: { a: 23.3, b: 2, g: -2, pen: 'c' },
  CONR2: { a: 23.8, b: 2.5, g: -2, pen: 'c' },
  COCl: { a: 35, b: 3, g: -2, pen: 'c' },
  CN: { a: 4.2, b: 3, g: -3, pen: '' },
  'C=N': { a: 20, b: 3, g: -2, pen: 'c' },
  O: { a: 51.5, b: 11, g: -5.5, pen: 'x' },
  N: { a: 28, b: 11, g: -5, pen: 'x' },
  NCO: { a: 25, b: 9, g: -5, pen: 'x' },
  'N+': { a: 30, b: 8, g: -5, pen: 'x' },
  S: { a: 10, b: 9, g: -3, pen: 'x' },
  NO2: { a: 64.8, b: 3, g: -4.5, pen: '' },
  SOR: { a: 43, b: 6, g: -3, pen: '' },
  SO2R: { a: 45, b: 6, g: -3, pen: '' },
  F: { a: 75, b: 8, g: -6, pen: '' },
  Cl: { a: 30, b: 10, g: -4, pen: '' },
  Br: { a: 18, b: 10.5, g: -3, pen: '' },
  I: { a: -12, b: 11, g: -1, pen: '' },
  other: { a: 10, b: 5, g: -2, pen: '' },
};

const NMR_ALKENE_C = {
  Ar: [12.5, -11.0], 'C=C': [13.6, -7.0], CCH: [-1.0, 5.0], CHO: [15.3, 14.5], COR: [13.8, 4.7], COAr: [13.8, 4.7],
  COOH: [5.0, 9.8], 'COO-': [9.0, 3.0], COOR: [6.3, 7.0], CONR2: [8.0, 5.0], COCl: [8.1, 14.0], CN: [-15.1, 14.2], 'C=N': [10, 2],
  OH: [28.8, -39.5], 'O-': [28.8, -39.5], OR: [28.8, -39.5], OAr: [28.0, -36.0], OCOR: [18.4, -26.7],
  NH2: [28.0, -32.0], NR2: [28.0, -32.0], NAr: [20.0, -30.0], NCO: [10.0, -25.0], NO2: [22.3, -0.9], 'N+': [19.8, -10.6],
  SH: [9.0, -12.9], SR: [9.0, -12.9], SOR: [14.4, 7.9], SO2R: [14.4, 7.9],
  F: [24.9, -34.3], Cl: [2.6, -6.1], Br: [-8.6, -0.9], I: [-38.1, 7.0], other: [0, 0],
};

const NMR_GP_STERIC = { 1: [0, 0, -1.1, -3.4], 2: [0, 0, -2.5, -7.2], 3: [0, -3.7, -9.5, -15], 4: [-1.5, -8.4, -15, -25] };

const NMR_RING_CORRECTION = { 3: -18.7, 4: -2.9, 5: -8.9, 6: -5.2, 7: -1.0 };

const NMR_HETERO5 = {
  N: { c: [118.2, 108.2], h: [6.74, 6.24] },
  O: { c: [142.8, 109.7], h: [7.42, 6.38] },
  S: { c: [125.4, 127.2], h: [7.31, 7.1] },
  Se: { c: [131.0, 129.8], h: [7.88, 7.23] },
};

const NMR_PYRIDINE = { c: [149.9, 123.8, 136.0], h: [8.62, 7.29, 7.68] };

const NMR_J = { vicinal: 7, aldehyde: 2.5, ortho: 8, hetero5: 3.5, cis: 10, trans: 17, geminal: 2 };

const NMR_MULTIPLET_NAMES = ['s', 'd', 't', 'q', 'quint', 'sext', 'sept'];

function spectraEnv(graph, atomIds) {
  const ctx = insightContext(graph, atomIds);
  const isHeavy = (id) => ctx.el.get(id) !== 'H' && ctx.el.get(id) !== 'D';
  const heavy = ctx.ids.filter(isHeavy);
  const hn = new Map();
  const hCount = new Map();
  const dCount = new Map();
  heavy.forEach((id) => {
    const list = ctx.nbrs.get(id).filter((n) => isHeavy(n.id));
    hn.set(id, list);
    const explicitH = ctx.nbrs.get(id).filter((n) => ctx.el.get(n.id) === 'H').length;
    hCount.set(id, ctx.h.get(id) + explicitH);
    dCount.set(id, ctx.nbrs.get(id).filter((n) => ctx.el.get(n.id) === 'D').length);
  });
  const env = { graph, ctx, heavy, hn, hCount, dCount, cache: new Map() };
  env.classes = propSymmetryClasses(ctx);
  env.cls = (id) => env.classes.get(id);
  env.el = (id) => ctx.el.get(id);
  env.nb = (id) => hn.get(id) || [];
  env.h = (id) => hCount.get(id) || 0;
  env.aromatic = (id) => ctx.isAromatic(id);
  env.charge = (id) => ctx.charge.get(id);
  env.inRing = (id) => ctx.ringAtoms.has(id);
  env.ringBond = (a, b) => ctx.isRingBond(a, b);
  env.pos = (id) => {
    const atom = graph.getAtom(id);
    return { x: atom.x || 0, y: atom.y || 0 };
  };
  return env;
}

function spectraIsSp3Carbon(env, id) {
  return env.el(id) === 'C' && !env.aromatic(id) && env.nb(id).every((n) => n.order === 1);
}

function spectraOxo(env, id) {
  return env.nb(id).find((n) => n.order === 2 && (env.el(n.id) === 'O' || env.el(n.id) === 'S')) || null;
}

function spectraIsCarbonyl(env, id) {
  return env.el(id) === 'C' && !!env.nb(id).find((n) => n.order === 2 && env.el(n.id) === 'O');
}

function spectraCarbonylKind(env, c) {
  if (env.cache.has('ck' + c)) {
    return env.cache.get('ck' + c);
  }
  const oxo = env.nb(c).find((n) => n.order === 2 && env.el(n.id) === 'O');
  const others = env.nb(c).filter((n) => !oxo || n.id !== oxo.id);
  const hetero = others.filter((n) => n.order === 1 && ['O', 'N', 'S', 'F', 'Cl', 'Br', 'I'].includes(env.el(n.id)));
  const carbons = others.filter((n) => env.el(n.id) === 'C');
  const conj = carbons.some((n) => env.aromatic(n.id) || env.nb(n.id).some((m) => m.id !== c && m.order >= 2 && env.el(m.id) === 'C'));
  const aryl = carbons.some((n) => env.aromatic(n.id));
  const formyl = env.h(c) > 0;
  let kind = 'ketone';
  let hetId = null;
  if (hetero.length >= 2) {
    kind = 'carbonic';
  } else if (hetero.length === 1) {
    const x = hetero[0].id;
    hetId = x;
    const e = env.el(x);
    if (e === 'O') {
      if (env.charge(x) < 0) {
        kind = 'carboxylate';
      } else if (env.h(x) > 0) {
        kind = 'acid';
      } else if (env.nb(x).some((m) => m.id !== c && spectraIsCarbonyl(env, m.id))) {
        kind = 'anhydride';
      } else {
        kind = 'ester';
      }
    } else if (e === 'N') {
      kind = 'amide';
    } else if (e === 'S') {
      kind = 'thioester';
    } else {
      kind = 'acidHalide';
    }
  } else if (formyl) {
    kind = 'aldehyde';
  }
  let ring = 0;
  env.ctx.cycles.forEach((cycle) => {
    if (cycle.includes(c) && (ring === 0 || cycle.length < ring)) {
      ring = cycle.length;
    }
  });
  const result = { kind, conj, aryl, formyl, ring, hetId, oxoId: oxo ? oxo.id : null };
  env.cache.set('ck' + c, result);
  return result;
}

function spectraCarbonylKey(env, c) {
  const k = spectraCarbonylKind(env, c);
  switch (k.kind) {
    case 'aldehyde': return 'CHO';
    case 'ketone': return k.aryl ? 'COAr' : 'COR';
    case 'acid': return 'COOH';
    case 'carboxylate': return 'COO-';
    case 'amide': return 'CONR2';
    case 'acidHalide': return 'COCl';
    case 'thioester': return 'COR';
    default: return 'COOR';
  }
}

function spectraIsNitro(env, id) {
  if (env.el(id) !== 'N') {
    return false;
  }
  return env.nb(id).filter((n) => env.el(n.id) === 'O' && env.nb(n.id).length === 1).length === 2;
}

function spectraGroup(env, from, x) {
  const e = env.el(x);
  if (SPECTRA_HALOGENS.has(e)) {
    return e;
  }
  const others = env.nb(x).filter((n) => n.id !== from);
  if (e === 'O') {
    if (env.charge(x) < 0) {
      return 'O-';
    }
    if (env.h(x) > 0 || others.length === 0) {
      return 'OH';
    }
    const o = others[0].id;
    if (spectraIsCarbonyl(env, o) || spectraOxo(env, o) || (env.el(o) !== 'C' && env.nb(o).some((m) => m.order === 2))) {
      return 'OCOR';
    }
    if (env.aromatic(o) || env.nb(o).some((m) => m.order === 2 && env.el(m.id) === 'C')) {
      return 'OAr';
    }
    return 'OR';
  }
  if (e === 'N') {
    if (spectraIsNitro(env, x)) {
      return 'NO2';
    }
    if (env.charge(x) > 0 && env.nb(x).every((n) => n.order === 1)) {
      return 'N+';
    }
    if (others.some((n) => spectraIsCarbonyl(env, n.id) || (env.el(n.id) === 'S' && env.nb(n.id).some((m) => m.order === 2)))) {
      return 'NCO';
    }
    if (others.some((n) => env.aromatic(n.id))) {
      return 'NAr';
    }
    if (env.aromatic(x)) {
      return 'NAr';
    }
    return env.h(x) >= 2 ? 'NH2' : 'NR2';
  }
  if (e === 'S') {
    const oxo = env.nb(x).filter((n) => n.order === 2 && env.el(n.id) === 'O').length;
    if (oxo >= 2) {
      return 'SO2R';
    }
    if (oxo === 1) {
      return 'SOR';
    }
    return env.h(x) > 0 ? 'SH' : 'SR';
  }
  if (e === 'Si') {
    return 'Si';
  }
  if (e !== 'C') {
    return 'other';
  }
  if (env.aromatic(x)) {
    return 'Ar';
  }
  if (spectraIsCarbonyl(env, x)) {
    return spectraCarbonylKey(env, x);
  }
  if (env.nb(x).some((n) => n.order === 3)) {
    const t = env.nb(x).find((n) => n.order === 3);
    return env.el(t.id) === 'N' ? 'CN' : 'CCH';
  }
  const dbl = env.nb(x).find((n) => n.order === 2);
  if (dbl) {
    return env.el(dbl.id) === 'C' ? 'C=C' : 'C=N';
  }
  const subs = others.map((n) => env.el(n.id));
  if (subs.filter((s) => s === 'F').length >= 2) {
    return 'CF3';
  }
  if (subs.includes('O')) {
    return 'CH2O';
  }
  if (subs.some((s) => SPECTRA_HALOGENS.has(s))) {
    return 'CH2X';
  }
  if (subs.includes('N')) {
    return 'CH2N';
  }
  const carbons = subs.length;
  return carbons === 0 ? 'CH3' : carbons === 1 ? 'CH2R' : carbons === 2 ? 'CHR2' : 'CR3';
}

function spectraIsAlkylKey(key) {
  return ['CH3', 'CH2R', 'CHR2', 'CR3', 'CF3', 'CH2O', 'CH2X', 'CH2N'].includes(key);
}

function spectraAromaticRings(env) {
  if (!env.cache.has('arRings')) {
    env.cache.set('arRings', env.ctx.cycles.filter((c) => (c.length === 5 || c.length === 6) && c.every((id) => env.aromatic(id))));
  }
  return env.cache.get('arRings');
}

function spectraRingOf(env, id) {
  const rings = spectraAromaticRings(env).filter((c) => c.includes(id));
  if (rings.length === 0) {
    return null;
  }
  const hetero = rings.find((c) => c.length === 5 && c.some((a) => env.el(a) !== 'C'));
  if (hetero && rings.length > 1) {
    return hetero;
  }
  return rings.find((c) => c.length === 6 && c.some((a) => env.el(a) !== 'C')) || rings.find((c) => c.length === 6) || rings[0];
}

function spectraRingDistance(ring, a, b) {
  const i = ring.indexOf(a);
  const j = ring.indexOf(b);
  const d = Math.abs(i - j);
  return Math.min(d, ring.length - d);
}

function spectraRingSubstituents(env, ring, atom) {
  const inRing = new Set(ring);
  const subs = [];
  const other = spectraAromaticRings(env).find((c) => c !== ring && c.includes(atom) && c.filter((x) => inRing.has(x)).length >= 2);
  if (other) {
    if (other.length === 6) {
      subs.push('fused6');
    } else {
      const hetero = other.some((x) => env.el(x) !== 'C');
      const bondedToHetero = env.nb(atom).some((n) => other.includes(n.id) && !inRing.has(n.id) && env.el(n.id) !== 'C');
      subs.push(hetero && bondedToHetero ? 'fused5X' : hetero ? 'fused5C' : 'fused6');
    }
  }
  env.nb(atom).forEach((n) => {
    if (inRing.has(n.id) || (other && other.includes(n.id))) {
      return;
    }
    if (n.order === 2 && env.el(n.id) === 'O') {
      subs.push('COR');
      return;
    }
    subs.push(spectraGroup(env, atom, n.id));
  });
  return subs;
}

function spectraPrincipalHetero(env, ring) {
  const cands = ring.filter((a) => env.el(a) !== 'C');
  const pyrrole = cands.find((a) => env.nb(a).every((n) => n.order === 1) && (env.el(a) !== 'N' || env.nb(a).length === 3 || env.h(a) > 0));
  return pyrrole || cands.find((a) => env.el(a) !== 'N') || null;
}

function spectraAromaticShift(env, id, nucleus) {
  const ring = spectraRingOf(env, id);
  const key = nucleus === 'C' ? 'c' : 'h';
  if (!ring) {
    return nucleus === 'C' ? 128.5 : 7.3;
  }
  let shift;
  const notes = [];
  if (ring.length === 6) {
    const ns = ring.filter((a) => env.el(a) === 'N');
    if (ns.length) {
      const dists = ns.map((n) => spectraRingDistance(ring, id, n)).sort((a, b) => a - b);
      const base = NMR_PYRIDINE[key];
      const ref = nucleus === 'C' ? 128.5 : 7.36;
      shift = dists[0] === 0 ? ref : base[dists[0] - 1];
      dists.slice(1).forEach((d) => {
        if (d > 0) {
          shift += (base[d - 1] - ref) * 0.5;
        }
      });
      notes.push('pyridine-type ring');
    } else {
      shift = nucleus === 'C' ? 128.5 : 7.36;
    }
    ring.forEach((r) => {
      const d = spectraRingDistance(ring, id, r);
      spectraRingSubstituents(env, ring, r).forEach((s) => {
        const inc = NMR_AROMATIC_INCREMENTS[s];
        if (!inc) {
          return;
        }
        if (nucleus === 'C') {
          shift += inc.c[d];
        } else if (d > 0) {
          shift += inc.h[d - 1];
        }
      });
    });
    return shift;
  }
  const x = spectraPrincipalHetero(env, ring);
  const table = x ? (NMR_HETERO5[env.el(x)] || NMR_HETERO5.N) : { c: [128.5, 128.5], h: [7.0, 7.0] };
  const dx = x ? spectraRingDistance(ring, id, x) : 1;
  shift = dx === 0 ? (nucleus === 'C' ? 128.5 : 7.3) : table[key][Math.min(dx, 2) - 1];
  ring.filter((a) => a !== x && env.el(a) === 'N').forEach((n) => {
    const d = spectraRingDistance(ring, id, n);
    if (d === 1) {
      shift += nucleus === 'C' ? 15 : 1.0;
    } else if (d === 2) {
      shift += nucleus === 'C' ? -3 : 0.3;
    }
  });
  const fusedAtoms = ring.filter((a) => spectraAromaticRings(env).some((c) => c !== ring && c.includes(a)));
  if (fusedAtoms.length) {
    if (fusedAtoms.includes(id)) {
      shift += nucleus === 'C' ? 18.5 : 0;
    } else if (dx === 1) {
      shift += nucleus === 'C' ? 6 : 0.46;
    } else {
      shift += nucleus === 'C' ? -5.6 : 0.31;
    }
  }
  ring.forEach((r) => {
    const d = spectraRingDistance(ring, id, r);
    if (d > 1 || fusedAtoms.includes(r)) {
      return;
    }
    spectraRingSubstituents(env, ring, r).forEach((s) => {
      const inc = NMR_AROMATIC_INCREMENTS[s];
      if (!inc || s.startsWith('fused')) {
        return;
      }
      if (nucleus === 'C') {
        shift += inc.c[d] * 0.8;
      } else if (d === 1) {
        shift += inc.h[0] * 0.8;
      }
    });
  });
  return shift;
}

function spectraSp3Shift(env, c) {
  const heavy = env.nb(c).length;
  const alphaVals = [];
  let shift = -2.3;
  const dist = new Map([[c, 0]]);
  const frontier = [];
  const expandable = (from, x) => spectraIsSp3Carbon(env, x) || (['O', 'N', 'S'].includes(env.el(x)) && env.nb(x).every((n) => n.order === 1) && !spectraIsNitro(env, x));
  const ringOf = (id) => env.ctx.cycles.find((cy) => cy.includes(c) && cy.includes(id));
  env.nb(c).forEach((n) => {
    dist.set(n.id, 1);
    const x = n.id;
    if (spectraIsSp3Carbon(env, x)) {
      shift += 9.1;
      const dx = env.nb(x).length;
      shift += NMR_GP_STERIC[Math.min(Math.max(heavy, 1), 4)][Math.min(Math.max(dx, 1), 4) - 1];
      frontier.push([x, c]);
      return;
    }
    const e = env.el(x);
    let key;
    if (e === 'O') {
      key = 'O';
    } else if (e === 'N') {
      const g = spectraGroup(env, c, x);
      key = g === 'NO2' ? 'NO2' : g === 'NCO' ? 'NCO' : g === 'N+' ? 'N+' : 'N';
    } else if (e === 'S') {
      const g = spectraGroup(env, c, x);
      key = g === 'SOR' || g === 'SO2R' ? g : 'S';
    } else {
      key = spectraGroup(env, c, x);
    }
    const t = NMR_C_GROUP[key] || NMR_C_GROUP.other;
    let value = t.a;
    if (t.pen === 'x') {
      value -= 3 * Math.max(0, heavy - 2);
    } else if (t.pen === 'c') {
      value -= 3 * Math.max(0, heavy - 1);
    }
    alphaVals.push({ value, hetero: t.pen !== 'c' && key !== 'CN' });
    if (expandable(c, x)) {
      frontier.push([x, c]);
    }
  });
  const hetero = alphaVals.filter((a) => a.hetero).map((a) => a.value).sort((a, b) => b - a);
  const damp = [1, 0.85, 0.8, 0.75];
  hetero.forEach((v, i) => { shift += v * damp[Math.min(i, 3)]; });
  alphaVals.filter((a) => !a.hetero).forEach((a) => { shift += a.value; });
  const typeKey = (from, y) => {
    if (spectraIsSp3Carbon(env, y)) {
      return 'Csp3';
    }
    const e = env.el(y);
    if (e === 'O') {
      return 'O';
    }
    if (e === 'N') {
      return spectraIsNitro(env, y) ? 'NO2' : 'N';
    }
    if (e === 'S') {
      const g = spectraGroup(env, from, y);
      return g === 'SOR' || g === 'SO2R' ? g : 'S';
    }
    return spectraGroup(env, from, y);
  };
  for (let depth = 2; depth <= 3; depth++) {
    const next = [];
    frontier.forEach(([x, prev]) => {
      env.nb(x).forEach((m) => {
        const y = m.id;
        if (y === prev || dist.has(y)) {
          return;
        }
        dist.set(y, depth);
        let key = typeKey(x, y);
        if (key !== 'Csp3' && env.el(y) === 'C' && ringOf(y)) {
          key = 'Csp3';
        }
        if (key === 'Csp3') {
          shift += depth === 2 ? 9.4 : -2.5;
        } else {
          const t = NMR_C_GROUP[key] || NMR_C_GROUP.other;
          shift += depth === 2 ? t.b : t.g;
        }
        if (depth === 2 && expandable(x, y)) {
          next.push([y, x]);
        }
      });
    });
    frontier.length = 0;
    next.forEach((f) => frontier.push(f));
  }
  let ring = 0;
  env.ctx.cycles.forEach((cy) => {
    if (cy.includes(c) && !cy.every((a) => env.aromatic(a)) && (ring === 0 || cy.length < ring)) {
      ring = cy.length;
    }
  });
  if (NMR_RING_CORRECTION[ring]) {
    shift += NMR_RING_CORRECTION[ring];
  }
  return shift;
}

function spectraAlkeneShift(env, c, b) {
  let shift = 123.3;
  const side = (atom, partner, alphaIdx) => {
    env.nb(atom).forEach((n) => {
      if (n.id === partner) {
        return;
      }
      const key = spectraGroup(env, atom, n.id);
      if (spectraIsAlkylKey(key) || (spectraIsSp3Carbon(env, n.id))) {
        shift += alphaIdx === 0 ? 10.6 : -7.9;
        env.nb(n.id).forEach((m) => {
          if (m.id === atom) {
            return;
          }
          shift += alphaIdx === 0 ? 7.2 : -1.8;
          if (spectraIsSp3Carbon(env, m.id)) {
            env.nb(m.id).forEach((z) => {
              if (z.id !== n.id) {
                shift += alphaIdx === 0 ? -1.5 : 1.5;
              }
            });
          }
        });
        return;
      }
      const inc = NMR_ALKENE_C[key] || NMR_ALKENE_C.other;
      shift += inc[alphaIdx];
    });
  };
  side(c, b, 0);
  side(b, c, 1);
  return shift;
}

function spectraCarbonylShift(env, c) {
  const k = spectraCarbonylKind(env, c);
  let shift;
  switch (k.kind) {
    case 'ketone': {
      shift = 206.5;
      env.nb(c).forEach((n) => {
        if (spectraIsSp3Carbon(env, n.id)) {
          shift += 1.2 * env.nb(n.id).filter((m) => m.id !== c && env.el(m.id) === 'C').length;
        }
      });
      shift += k.ring === 5 ? 10 : k.ring === 6 ? 2 : k.ring === 4 ? 0 : k.ring === 7 ? 5 : 0;
      if (k.conj) {
        shift -= 10;
      }
      break;
    }
    case 'aldehyde':
      shift = k.conj ? 192.4 : 202.0;
      break;
    case 'acid':
      shift = k.conj ? 172.0 : 177.5;
      break;
    case 'carboxylate':
      shift = 178;
      break;
    case 'ester':
      shift = k.conj ? 166.8 : 171.2;
      break;
    case 'amide':
      shift = k.conj ? 168 : 170.5;
      break;
    case 'acidHalide':
      shift = 170.2;
      break;
    case 'anhydride':
      shift = 166.8;
      break;
    case 'thioester':
      shift = 196;
      break;
    default:
      shift = 156;
  }
  if (k.formyl && (k.kind === 'amide' || k.kind === 'ester' || k.kind === 'acid')) {
    shift = k.kind === 'amide' ? 162.6 : k.kind === 'ester' ? 161.3 : 166.3;
  }
  if (k.ring && k.kind !== 'ketone' && k.kind !== 'aldehyde' && k.ring <= 5) {
    shift += 4;
  }
  return { shift, kind: k.kind };
}

function spectraCarbonShift(env, c) {
  const nb = env.nb(c);
  if (env.aromatic(c)) {
    return { shift: spectraAromaticShift(env, c, 'C'), note: 'aromatic' };
  }
  if (spectraIsCarbonyl(env, c)) {
    const r = spectraCarbonylShift(env, c);
    return { shift: r.shift, note: 'C=O ' + r.kind, type: 'C=O' };
  }
  const triple = nb.find((n) => n.order === 3);
  if (triple) {
    if (env.el(triple.id) === 'N') {
      const other = nb.find((n) => n.id !== triple.id);
      return { shift: other && (env.aromatic(other.id) || env.nb(other.id).some((m) => m.order === 2)) ? 118.8 : other ? 117.7 : 110, note: 'nitrile C≡N', type: 'C≡N' };
    }
    const other = nb.find((n) => n.id !== triple.id);
    const partner = triple.id;
    const partnerSub = env.nb(partner).find((n) => n.id !== c);
    const aryl = other && (env.aromatic(other.id) || env.nb(other.id).some((m) => m.order === 2));
    const partnerAryl = partnerSub && (env.aromatic(partnerSub.id) || env.nb(partnerSub.id).some((m) => m.order === 2));
    let shift;
    if (!other) {
      shift = partnerAryl ? 77.2 : partnerSub ? 68.5 : 71.9;
    } else if (aryl) {
      shift = partnerSub ? 89.5 : 83.6;
    } else {
      shift = partnerSub ? (partnerAryl ? 86 : 80) : 84.0;
    }
    return { shift, note: 'alkyne C≡C' };
  }
  const doubles = nb.filter((n) => n.order === 2);
  if (doubles.length === 2) {
    return { shift: doubles.every((n) => env.el(n.id) === 'C') ? 210 : 125, note: 'cumulated' };
  }
  if (doubles.length === 1) {
    const partner = doubles[0].id;
    const pe = env.el(partner);
    if (pe === 'C') {
      if (env.nb(partner).filter((n) => n.order === 2).length === 2) {
        return { shift: 76, note: 'allene terminus' };
      }
      return { shift: spectraAlkeneShift(env, c, partner), note: 'alkene C=C' };
    }
    if (pe === 'S') {
      return { shift: 200, note: 'thiocarbonyl C=S', type: 'C=S' };
    }
    if (pe === 'N') {
      const oxime = env.nb(partner).some((n) => n.id !== c && env.el(n.id) === 'O');
      return { shift: oxime ? 155 : 162, note: oxime ? 'oxime C=N' : 'imine C=N' };
    }
    return { shift: 150, note: 'C=' + pe };
  }
  return { shift: spectraSp3Shift(env, c), note: 'sp3' };
}

function spectraCarbonType(env, c, override) {
  if (override) {
    return override;
  }
  const h = env.h(c) + env.dCount.get(c);
  return h >= 3 ? 'CH3' : h === 2 ? 'CH2' : h === 1 ? 'CH' : 'C';
}

function spectraGroupByClass(env, ids) {
  const groups = new Map();
  ids.forEach((id) => {
    const k = env.cls(id);
    if (!groups.has(k)) {
      groups.set(k, []);
    }
    groups.get(k).push(id);
  });
  return Array.from(groups.values());
}

function predictCarbonNmr(graph, atomIds) {
  const env = spectraEnv(graph, atomIds);
  const carbons = env.heavy.filter((id) => env.el(id) === 'C');
  const signals = spectraGroupByClass(env, carbons).map((atoms) => {
    const r = spectraCarbonShift(env, atoms[0]);
    const type = spectraCarbonType(env, atoms[0], r.type);
    return { shift: Math.round(r.shift * 10) / 10, atoms: atoms.slice(), count: atoms.length, type, note: r.note };
  });
  signals.sort((a, b) => b.shift - a.shift);
  return { signals, nucleus: '13C' };
}

function spectraSide(env, a, b, p) {
  const pa = env.pos(a);
  const pb = env.pos(b);
  const v = (pb.x - pa.x) * (p.y - pa.y) - (pb.y - pa.y) * (p.x - pa.x);
  return v > 1e-6 ? 1 : v < -1e-6 ? -1 : 0;
}

function spectraVinylProtons(env, a, b) {
  const subsA = env.nb(a).filter((n) => n.id !== b);
  const subsB = env.nb(b).filter((n) => n.id !== a);
  const hA = env.h(a);
  const bSides = subsB.map((n) => ({ id: n.id, side: spectraSide(env, a, b, env.pos(n.id)) }));
  if (bSides.length === 2 && bSides[0].side === bSides[1].side) {
    bSides[1].side = -bSides[0].side || -1;
    if (bSides[0].side === 0) {
      bSides[0].side = 1;
    }
  } else if (bSides.length === 1 && bSides[0].side === 0) {
    bSides[0].side = 1;
  }
  let hSides;
  if (hA >= 2) {
    hSides = [1, -1];
  } else {
    const s = subsA.length ? spectraSide(env, a, b, env.pos(subsA[0].id)) : 0;
    hSides = [s === 0 ? -1 : -s];
  }
  const bHSides = [];
  if (env.h(b) === 1) {
    const s = bSides.length ? bSides[0].side : 1;
    bHSides.push(-s);
  } else if (env.h(b) >= 2) {
    bHSides.push(1, -1);
  }
  return hSides.map((side) => {
    let shift = 5.25;
    subsA.forEach((n) => {
      const key = spectraGroup(env, a, n.id);
      const z = NMR_VINYL_Z[spectraIsAlkylKey(key) ? (['CH2O', 'CH2X', 'CH2N', 'CF3'].includes(key) ? key : 'alkyl') : key] || NMR_VINYL_Z.other;
      shift += z[0];
    });
    const cisTo = [];
    bSides.forEach((s) => {
      const key = spectraGroup(env, b, s.id);
      const z = NMR_VINYL_Z[spectraIsAlkylKey(key) ? (['CH2O', 'CH2X', 'CH2N', 'CF3'].includes(key) ? key : 'alkyl') : key] || NMR_VINYL_Z.other;
      if (s.side === side) {
        shift += z[1];
        cisTo.push(env.cls(s.id));
      } else {
        shift += z[2];
      }
    });
    const cisH = bHSides.filter((s) => s === side).length;
    const transH = bHSides.filter((s) => s !== side).length;
    return { side, shift, cisKey: cisTo.length ? 'c' + cisTo.sort().join('.') : 'cH', cisH, transH };
  });
}

function spectraExchangeable(env, x) {
  const e = env.el(x);
  const nb = env.nb(x);
  if (e === 'O') {
    if (nb.some((n) => spectraIsCarbonyl(env, n.id) || (env.el(n.id) !== 'C' && env.nb(n.id).some((m) => m.order === 2 && env.el(m.id) === 'O')))) {
      return { shift: 11.5, note: 'CO2H (exchangeable)' };
    }
    if (nb.some((n) => env.aromatic(n.id) || env.nb(n.id).some((m) => m.order === 2 && env.el(m.id) === 'C'))) {
      return { shift: 5.5, note: 'phenol/enol OH (exchangeable)' };
    }
    return { shift: 2.0, note: 'OH (exchangeable)' };
  }
  if (e === 'N') {
    if (env.charge(x) > 0) {
      return { shift: 7.5, note: 'N+–H (exchangeable)' };
    }
    if (nb.some((n) => spectraIsCarbonyl(env, n.id) || (env.el(n.id) === 'S' && env.nb(n.id).some((m) => m.order === 2)))) {
      return { shift: 7.0, note: 'amide NH (exchangeable)' };
    }
    if (env.aromatic(x)) {
      return { shift: 8.0, note: 'aromatic NH (exchangeable)' };
    }
    if (nb.some((n) => env.aromatic(n.id))) {
      return { shift: 3.6, note: 'aryl NH (exchangeable)' };
    }
    return { shift: 1.5, note: 'amine NH (exchangeable)' };
  }
  if (e === 'S') {
    return nb.some((n) => env.aromatic(n.id)) ? { shift: 3.4, note: 'SH (exchangeable)' } : { shift: 1.5, note: 'SH (exchangeable)' };
  }
  return null;
}

function spectraSp3ProtonShift(env, c) {
  const h = env.h(c) + env.dCount.get(c);
  const idx = h >= 3 ? 0 : h === 2 ? 1 : 2;
  const base = [0.86, 1.37, 1.5][idx];
  const alpha = [];
  let beta = 0;
  let gamma = 0;
  const notes = [];
  env.nb(c).forEach((n) => {
    const key = spectraGroup(env, c, n.id);
    if (spectraIsSp3Carbon(env, n.id)) {
      env.nb(n.id).forEach((m) => {
        if (m.id === c) {
          return;
        }
        const k2 = spectraGroup(env, n.id, m.id);
        if (spectraIsSp3Carbon(env, m.id)) {
          env.nb(m.id).forEach((z) => {
            if (z.id !== n.id && !spectraIsSp3Carbon(env, z.id)) {
              gamma += 0.07;
            }
          });
          return;
        }
        const t = NMR_H_ALPHA[k2] || NMR_H_ALPHA.other;
        beta += t[1];
      });
      return;
    }
    const t = NMR_H_ALPHA[key] || NMR_H_ALPHA.other;
    alpha.push(t[0][idx]);
    notes.push(key);
  });
  alpha.sort((a, b) => b - a);
  const damp = [1, 0.85, 0.7, 0.6];
  let shift = base + beta + gamma;
  alpha.forEach((v, i) => { shift += v * damp[Math.min(i, 3)]; });
  let ring = 0;
  env.ctx.cycles.forEach((cy) => {
    if (cy.includes(c) && (ring === 0 || cy.length < ring)) {
      ring = cy.length;
    }
  });
  if (ring === 3) {
    shift -= 1.0;
  }
  const label = ['CH3', 'CH2', 'CH'][idx];
  return { shift, note: notes.length ? label + ' (' + notes.join(', ') + ')' : label };
}

function spectraProtonSites(env) {
  const sites = [];
  env.heavy.forEach((id) => {
    const h = env.h(id);
    if (h === 0) {
      return;
    }
    const e = env.el(id);
    if (e !== 'C') {
      const ex = spectraExchangeable(env, id);
      sites.push({ atom: id, key: 'x' + env.cls(id), h, shift: ex ? ex.shift : 2.0, note: ex ? ex.note : e + '–H', exchangeable: !!ex, kind: 'x' });
      return;
    }
    if (env.aromatic(id)) {
      sites.push({ atom: id, key: 'a' + env.cls(id), h, shift: spectraAromaticShift(env, id, 'H'), note: 'aromatic CH', exchangeable: false, kind: 'ar' });
      return;
    }
    if (spectraIsCarbonyl(env, id)) {
      const k = spectraCarbonylKind(env, id);
      const shift = k.kind === 'aldehyde' ? (k.conj ? 9.95 : 9.77) : 8.05;
      sites.push({ atom: id, key: 'f' + env.cls(id), h, shift, note: k.kind === 'aldehyde' ? 'CHO' : 'formyl H', exchangeable: false, kind: 'cho' });
      return;
    }
    const nb = env.nb(id);
    const triple = nb.find((n) => n.order === 3);
    if (triple) {
      const other = env.nb(triple.id).find((n) => n.id !== id);
      const conj = other && (env.aromatic(other.id) || env.nb(other.id).some((m) => m.order === 2));
      sites.push({ atom: id, key: 't' + env.cls(id), h, shift: conj ? 3.05 : 1.95, note: '≡C–H', exchangeable: false, kind: 'yne' });
      return;
    }
    const dbl = nb.find((n) => n.order === 2 && env.el(n.id) === 'C');
    if (dbl) {
      spectraVinylProtons(env, id, dbl.id).forEach((v) => {
        sites.push({ atom: id, key: 'v' + env.cls(id) + ':' + (h >= 2 ? v.cisKey : ''), h: h >= 2 ? 1 : h, shift: v.shift, note: 'vinyl =CH', exchangeable: false, kind: 'vinyl', vinyl: v, partner: dbl.id });
      });
      return;
    }
    if (nb.some((n) => n.order === 2)) {
      sites.push({ atom: id, key: 'i' + env.cls(id), h, shift: 8.1, note: 'CH=N', exchangeable: false, kind: 'imine' });
      return;
    }
    const r = spectraSp3ProtonShift(env, id);
    sites.push({ atom: id, key: 's' + env.cls(id), h, shift: r.shift, note: r.note, exchangeable: false, kind: 'sp3' });
  });
  return sites;
}

function spectraCouplings(env, site, sites) {
  if (site.exchangeable) {
    return [];
  }
  const byAtom = new Map();
  sites.forEach((s) => {
    if (!byAtom.has(s.atom)) {
      byAtom.set(s.atom, []);
    }
    byAtom.get(s.atom).push(s);
  });
  const partners = [];
  const add = (other, J) => {
    if (other.key !== site.key && !other.exchangeable) {
      partners.push({ key: other.key, h: other.h, J });
    }
  };
  if (site.kind === 'vinyl') {
    (byAtom.get(site.atom) || []).forEach((o) => {
      if (o !== site) {
        add(o, NMR_J.geminal);
      }
    });
    (byAtom.get(site.partner) || []).forEach((o) => {
      if (o.kind !== 'vinyl') {
        return;
      }
      add(o, o.vinyl.side === site.vinyl.side ? NMR_J.cis : NMR_J.trans);
    });
  }
  env.nb(site.atom).forEach((n) => {
    if (site.kind === 'vinyl' && n.id === site.partner) {
      return;
    }
    (byAtom.get(n.id) || []).forEach((o) => {
      if (o.exchangeable || o.kind === 'yne') {
        return;
      }
      if (site.kind === 'ar' || o.kind === 'ar') {
        if (site.kind === 'ar' && o.kind === 'ar') {
          const ring = spectraRingOf(env, site.atom);
          add(o, ring && ring.length === 5 ? NMR_J.hetero5 : NMR_J.ortho);
        }
        return;
      }
      if (site.kind === 'yne') {
        return;
      }
      if (site.kind === 'cho' || o.kind === 'cho') {
        add(o, site.kind === 'vinyl' || o.kind === 'vinyl' ? NMR_J.vicinal : NMR_J.aldehyde);
        return;
      }
      add(o, NMR_J.vicinal);
    });
  });
  const merged = new Map();
  partners.forEach((p) => {
    const k = String(Math.round(p.J));
    merged.set(k, { J: p.J, n: (merged.has(k) ? merged.get(k).n : 0) + p.h });
  });
  return Array.from(merged.values()).sort((a, b) => b.J - a.J);
}

function spectraMultiplicity(sets) {
  if (sets.length === 0) {
    return 's';
  }
  const letter = (n) => (n <= 6 ? NMR_MULTIPLET_NAMES[n] : null);
  if (sets.length === 1) {
    return letter(sets[0].n) || 'm';
  }
  if (sets.length === 2 && sets.every((s) => s.n <= 3)) {
    const short = ['', 'd', 't', 'q'];
    return short[sets[0].n] + short[sets[1].n];
  }
  return 'm';
}

function predictProtonNmr(graph, atomIds, options) {
  const opts = options || {};
  const field = opts.field || 400;
  const env = spectraEnv(graph, atomIds);
  const sites = spectraProtonSites(env);
  const groups = new Map();
  sites.forEach((s) => {
    if (!groups.has(s.key)) {
      groups.set(s.key, []);
    }
    groups.get(s.key).push(s);
  });
  const signals = Array.from(groups.values()).map((list) => {
    const first = list[0];
    const sets = spectraCouplings(env, first, sites);
    const multiplicity = first.exchangeable ? 's' : spectraMultiplicity(sets);
    const atoms = Array.from(new Set(list.map((s) => s.atom)));
    const shift = list.reduce((sum, s) => sum + s.shift, 0) / list.length;
    return {
      shift: Math.round(shift * 100) / 100,
      atoms,
      count: list.reduce((sum, s) => sum + s.h, 0),
      multiplicity,
      J: sets.map((s) => s.J),
      couplings: sets.map((s) => ({ J: s.J, n: s.n })),
      exchangeable: first.exchangeable,
      broad: first.exchangeable,
      note: first.note,
    };
  });
  signals.sort((a, b) => b.shift - a.shift);
  return { signals, field, nucleus: '1H' };
}

function nmrLineShape(signals, options) {
  const opts = options || {};
  const nucleus = opts.nucleus || '1H';
  const field = opts.field || 400;
  const from = opts.from !== undefined ? opts.from : (nucleus === '13C' ? 0 : 0);
  const to = opts.to !== undefined ? opts.to : (nucleus === '13C' ? 220 : 12);
  const points = opts.points || 2000;
  const step = Math.abs(to - from) / Math.max(1, points - 1);
  const lines = [];
  signals.forEach((s) => {
    if (nucleus === '13C') {
      const weight = s.type === 'C' || s.type === 'C=O' || s.type === 'C≡N' ? 0.45 : 1;
      lines.push({ x: s.shift, a: s.count * weight, w: Math.max(0.12, step * 1.5) });
      return;
    }
    const mhz = nucleus === '13C' ? field / 4 : field;
    let sub = [{ off: 0, a: 1 }];
    (s.couplings || []).forEach((c) => {
      const next = [];
      for (let k = 0; k <= c.n; k++) {
        let binom = 1;
        for (let i = 0; i < k; i++) {
          binom = (binom * (c.n - i)) / (i + 1);
        }
        const off = ((k - c.n / 2) * c.J) / mhz;
        sub.forEach((l) => next.push({ off: l.off + off, a: l.a * binom }));
      }
      sub = next;
    });
    const total = sub.reduce((sum, l) => sum + l.a, 0);
    const width = s.broad ? Math.max(12 / mhz, step * 3) : Math.max(0.9 / mhz, step * 1.2);
    sub.forEach((l) => lines.push({ x: s.shift + l.off, a: (s.count * l.a) / total, w: width }));
  });
  const out = [];
  for (let i = 0; i < points; i++) {
    const x = from + (to - from) * (i / Math.max(1, points - 1));
    let y = 0;
    lines.forEach((l) => {
      const d = (x - l.x) / l.w;
      y += l.a / (1 + d * d);
    });
    out.push({ x, y });
  }
  return out;
}
