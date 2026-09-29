const GEO3D_SETTINGS = {
  bondLength: 1.5,
  wedgeZ: 0.8,
  pucker: 0.25,
  jitter: 0.05,
  maxSteps: 2000,
  forceTol: 0.02,
  maxMove: 0.2,
  dtStart: 0.02,
  dtMax: 0.06,
  conformerRmsd: 0.3,
  conformerCount: 10,
  timeBudgetMs: 2500,
  maxHeavy: 200,
};

const GEO3D_SINGLE_RADII = {
  H: 0.32, B: 0.84, C: 0.76, N: 0.71, O: 0.66, F: 0.64, Si: 1.11, P: 1.07, S: 1.05, Cl: 0.99, Se: 1.2, Br: 1.14, I: 1.33,
};

const GEO3D_SP2_RADII = { C: 0.73, N: 0.68, O: 0.63 };

const GEO3D_SP_RADII = { C: 0.69, N: 0.66 };

const GEO3D_DOUBLE_RADII = { C: 0.67, N: 0.6, O: 0.55, S: 0.94, P: 1.02, Si: 1.07, Se: 1.07 };

const GEO3D_TRIPLE_RADII = { C: 0.6, N: 0.54, O: 0.53, P: 0.94 };

const GEO3D_AROMATIC_RADII = { C: 0.695, N: 0.665, O: 0.68, S: 1.02, P: 1.05, Se: 1.15 };

const GEO3D_H_BONDS = { C: 1.09, N: 1.01, O: 0.97, S: 1.34, P: 1.42, B: 1.19, Si: 1.48, Se: 1.46 };

const GEO3D_VDW_RADII = {
  H: 1.2, B: 1.92, C: 1.7, N: 1.55, O: 1.52, F: 1.47, Si: 2.1, P: 1.8, S: 1.8, Cl: 1.75, Se: 1.9, Br: 1.85, I: 1.98,
};

const GEO3D_TORSION_V = { C: 2.119, N: 0.45, O: 0.3, S: 0.484, Si: 1.225, P: 2.4, Se: 0.3 };

const GEO3D_FORCE = {
  bond: 700,
  angle: 100,
  angleH: 70,
  improper: 15,
  vdw: 2,
  vdw14: 0.5,
  vdwScale: 1.1,
  chiral: 20,
  chiralFloor: 1,
  ez: 30,
};

function geo3dRandom(seed) {
  let s = (Number(seed) >>> 0) || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function geo3dVdwRadius(element) {
  return Object.prototype.hasOwnProperty.call(GEO3D_VDW_RADII, element) ? GEO3D_VDW_RADII[element] : 1.8;
}

function geo3dSingleRadius(element, hyb) {
  if (hyb === 'sp2' && GEO3D_SP2_RADII[element]) {
    return GEO3D_SP2_RADII[element];
  }
  if (hyb === 'sp' && GEO3D_SP_RADII[element]) {
    return GEO3D_SP_RADII[element];
  }
  if (Object.prototype.hasOwnProperty.call(GEO3D_SINGLE_RADII, element)) {
    return GEO3D_SINGLE_RADII[element];
  }
  const info = typeof periodicElement === 'function' ? periodicElement(element) : null;
  return info && isMetalElement(element) ? 1.35 : 1.2;
}

function geo3dBondLength(a, b, order) {
  if (a.element === 'H' || b.element === 'H') {
    const other = a.element === 'H' ? b : a;
    if (other.element === 'H') {
      return 0.74;
    }
    return GEO3D_H_BONDS[other.element] || geo3dSingleRadius(other.element, other.hyb) + 0.32;
  }
  const table = order === 1.5 ? GEO3D_AROMATIC_RADII : order === 2 ? GEO3D_DOUBLE_RADII : order === 3 ? GEO3D_TRIPLE_RADII : null;
  if (table && table[a.element] && table[b.element]) {
    return table[a.element] + table[b.element];
  }
  const ra = geo3dSingleRadius(a.element, order === 1 ? a.hyb : null);
  const rb = geo3dSingleRadius(b.element, order === 1 ? b.hyb : null);
  const sum = ra + rb;
  return order > 1 ? sum - 0.1332 * sum * Math.log(order) : sum;
}

function geo3dIdealAngle(hyb, count) {
  if (hyb === 'sp') {
    return Math.PI;
  }
  if (hyb === 'sp2') {
    return (120 * Math.PI) / 180;
  }
  if (!hyb && count === 3) {
    return (109.47 * Math.PI) / 180;
  }
  return (109.47 * Math.PI) / 180;
}

function geo3dBuild(graph, atomIds) {
  const ids = atomIds.filter((id) => graph.getAtom(id));
  const idSet = new Set(ids);
  const ctx = insightContext(graph, ids);
  const atoms = [];
  const index = new Map();
  ids.forEach((id) => {
    const atom = graph.getAtom(id);
    const info = insightAtomInfo(ctx, id);
    let hyb = info.hybridization;
    if (!hyb) {
      const nbrs = ctx.nbrs.get(id);
      const doubles = nbrs.filter((n) => n.order === 2).length;
      hyb = nbrs.some((n) => n.order === 3) || doubles >= 2 ? 'sp' : doubles === 1 || ctx.isAromatic(id) ? 'sp2' : 'sp3';
    }
    index.set(id, atoms.length);
    atoms.push({ id, element: atom.element, x: 0, y: 0, z: 0, implicitH: false, hyb, aromatic: ctx.isAromatic(id), parent: null });
  });
  const bonds = [];
  graph.bonds.forEach((bond) => {
    if (!idSet.has(bond.atomA) || !idSet.has(bond.atomB)) {
      return;
    }
    const aromatic = ctx.isAromatic(bond.atomA) && ctx.isAromatic(bond.atomB) && ctx.isRingBond(bond.atomA, bond.atomB);
    bonds.push({ id: bond.id, atomA: bond.atomA, atomB: bond.atomB, order: aromatic ? 1.5 : bond.order, stereo: bond.stereo || null, ring: ctx.isRingBond(bond.atomA, bond.atomB) });
  });
  let nextH = -1;
  ids.forEach((id) => {
    const count = ctx.h.get(id) || 0;
    for (let k = 0; k < count; k++) {
      const hid = nextH--;
      index.set(hid, atoms.length);
      atoms.push({ id: hid, element: 'H', x: 0, y: 0, z: 0, implicitH: true, hyb: null, aromatic: false, parent: id });
      bonds.push({ id: hid, atomA: id, atomB: hid, order: 1, stereo: null, ring: false });
    }
  });
  return { graph, atomIds: ids, ctx, atoms, bonds, index };
}

function geo3dNeighbors(model) {
  const nbrs = model.atoms.map(() => []);
  model.bonds.forEach((b) => {
    const i = model.index.get(b.atomA);
    const j = model.index.get(b.atomB);
    nbrs[i].push({ j, bond: b });
    nbrs[j].push({ j: i, bond: b });
  });
  return nbrs;
}

function geo3dStartCoordinates(model, rng) {
  const graph = model.graph;
  const heavy = model.atomIds;
  const lengths = [];
  model.bonds.forEach((b) => {
    if (b.id < 0) {
      return;
    }
    const a = graph.getAtom(b.atomA);
    const c = graph.getAtom(b.atomB);
    lengths.push(Math.hypot(a.x - c.x, a.y - c.y));
  });
  lengths.sort((a, b) => a - b);
  const median = lengths.length ? lengths[Math.floor(lengths.length / 2)] : 1;
  const scale = median > 1e-6 ? GEO3D_SETTINGS.bondLength / median : 1;
  let cx = 0;
  let cy = 0;
  heavy.forEach((id) => {
    cx += graph.getAtom(id).x;
    cy += graph.getAtom(id).y;
  });
  cx /= Math.max(1, heavy.length);
  cy /= Math.max(1, heavy.length);
  const pos = model.atoms.map(() => ({ x: 0, y: 0, z: 0 }));
  heavy.forEach((id) => {
    const a = graph.getAtom(id);
    pos[model.index.get(id)] = { x: (a.x - cx) * scale, y: -(a.y - cy) * scale, z: 0 };
  });
  const puckered = new Set();
  model.ctx.cycles.forEach((cycle) => {
    if (cycle.length !== 6 || cycle.some((id) => model.atoms[model.index.get(id)].hyb !== 'sp3')) {
      return;
    }
    cycle.forEach((id, k) => {
      if (!puckered.has(id)) {
        puckered.add(id);
        pos[model.index.get(id)].z += (k % 2 ? 1 : -1) * GEO3D_SETTINGS.pucker;
      }
    });
  });
  const zSum = new Map();
  model.bonds.forEach((b) => {
    if (!b.stereo) {
      return;
    }
    const sign = b.stereo === 'wedge' ? 1 : -1;
    pos[model.index.get(b.atomB)].z += sign * GEO3D_SETTINGS.wedgeZ;
    zSum.set(b.atomA, (zSum.get(b.atomA) || 0) + sign);
  });
  const nbrs = geo3dNeighbors(model);
  heavy.forEach((id) => {
    const i = model.index.get(id);
    const hs = nbrs[i].filter((n) => model.atoms[n.j].implicitH).map((n) => n.j);
    if (!hs.length) {
      return;
    }
    const heavyN = nbrs[i].filter((n) => !model.atoms[n.j].implicitH).map((n) => n.j);
    let sx = 0;
    let sy = 0;
    heavyN.forEach((j) => {
      const dx = pos[j].x - pos[i].x;
      const dy = pos[j].y - pos[i].y;
      const len = Math.hypot(dx, dy) || 1;
      sx += dx / len;
      sy += dy / len;
    });
    let dx = -sx;
    let dy = -sy;
    let len = Math.hypot(dx, dy);
    if (len < 1e-3) {
      if (heavyN.length) {
        const j = heavyN[0];
        dx = -(pos[j].y - pos[i].y);
        dy = pos[j].x - pos[i].x;
      } else {
        dx = 1;
        dy = 0;
      }
      len = Math.hypot(dx, dy) || 1;
    }
    dx /= len;
    dy /= len;
    const px = -dy;
    const py = dx;
    const hyb = model.atoms[i].hyb;
    const bondLen = GEO3D_H_BONDS[model.atoms[i].element] || 1.05;
    const stereoZ = zSum.has(id) && zSum.get(id) !== 0 ? -Math.sign(zSum.get(id)) : 0;
    hs.forEach((h, k) => {
      let v;
      if (hs.length === 1) {
        v = stereoZ ? { x: dx * 0.45, y: dy * 0.45, z: stereoZ * 0.9 } : { x: dx, y: dy, z: hyb === 'sp3' && heavyN.length === 3 ? 0.9 : 0 };
      } else {
        const start = hyb === 'sp2' ? 0 : Math.PI / 2;
        const theta = start + (k * 2 * Math.PI) / hs.length;
        const cone = hyb === 'sp2' ? Math.PI / 3 : (heavyN.length === 0 ? Math.PI / 2 : 1.23);
        const along = Math.cos(cone);
        const across = Math.sin(cone);
        v = {
          x: dx * along + across * Math.cos(theta) * px,
          y: dy * along + across * Math.cos(theta) * py,
          z: across * Math.sin(theta),
        };
      }
      const vl = Math.hypot(v.x, v.y, v.z) || 1;
      pos[h] = { x: pos[i].x + (v.x / vl) * bondLen, y: pos[i].y + (v.y / vl) * bondLen, z: pos[i].z + (v.z / vl) * bondLen };
    });
  });
  pos.forEach((p) => {
    p.x += (rng() - 0.5) * 2 * GEO3D_SETTINGS.jitter;
    p.y += (rng() - 0.5) * 2 * GEO3D_SETTINGS.jitter;
    p.z += (rng() - 0.5) * 2 * GEO3D_SETTINGS.jitter;
  });
  pos.forEach((p, i) => {
    model.atoms[i].x = p.x;
    model.atoms[i].y = p.y;
    model.atoms[i].z = p.z;
  });
}

function geo3dRestraints(model) {
  const graph = model.graph;
  const idSet = new Set(model.atomIds);
  const chiral = [];
  const ez = [];
  const nbrs = geo3dNeighbors(model);
  model.atomIds.forEach((id) => {
    const bonds = graph.bondsForAtom(id).filter((b) => idSet.has(b.atomA) && idSet.has(b.atomB));
    if (!bonds.some((b) => b.stereo && b.atomA === id) || bonds.some((b) => b.order !== 1)) {
      return;
    }
    const i = model.index.get(id);
    const hs = nbrs[i].filter((n) => model.atoms[n.j].implicitH).map((n) => n.j);
    const heavy = bonds.map((b) => (b.atomA === id ? b.atomB : b.atomA));
    if (heavy.length + hs.length !== 4 || hs.length > 1) {
      return;
    }
    const neighborIds = hs.length ? heavy.concat([null]) : heavy;
    const volume = tetrahedralVolume(graph, id, neighborIds);
    if (Math.abs(volume) < 1e-9) {
      return;
    }
    const idx = neighborIds.map((n) => (n === null ? hs[0] : model.index.get(n)));
    chiral.push({ center: i, n: idx, sign: volume > 0 ? 1 : -1 });
  });
  graph.bonds.forEach((bond) => {
    if (bond.order !== 2 || !idSet.has(bond.atomA) || !idSet.has(bond.atomB) || model.ctx.isRingBond(bond.atomA, bond.atomB)) {
      return;
    }
    const other = (at, not) => graph.bondsForAtom(at)
      .filter((b) => b.id !== bond.id && idSet.has(b.atomA) && idSet.has(b.atomB))
      .map((b) => (b.atomA === at ? b.atomB : b.atomA))
      .filter((n) => n !== not);
    const subA = other(bond.atomA, bond.atomB);
    const subB = other(bond.atomB, bond.atomA);
    if (!subA.length || !subB.length) {
      return;
    }
    const a = graph.getAtom(bond.atomA);
    const b = graph.getAtom(bond.atomB);
    const pa = graph.getAtom(subA[0]);
    const pb = graph.getAtom(subB[0]);
    const ax = b.x - a.x;
    const ay = b.y - a.y;
    const sideA = Math.sign(ax * (pa.y - a.y) - ay * (pa.x - a.x));
    const sideB = Math.sign(ax * (pb.y - b.y) - ay * (pb.x - b.x));
    if (!sideA || !sideB) {
      return;
    }
    ez.push({
      i: model.index.get(subA[0]),
      j: model.index.get(bond.atomA),
      k: model.index.get(bond.atomB),
      l: model.index.get(subB[0]),
      target: sideA === sideB ? 0 : Math.PI,
    });
  });
  return { chiral, ez };
}

function geo3dForceField(model) {
  const atoms = model.atoms;
  const n = atoms.length;
  const nbrs = geo3dNeighbors(model);
  const bondTerms = [];
  model.bonds.forEach((b) => {
    const i = model.index.get(b.atomA);
    const j = model.index.get(b.atomB);
    bondTerms.push([i, j, geo3dBondLength(atoms[i], atoms[j], b.order), GEO3D_FORCE.bond]);
  });
  const angleTerms = [];
  const extra13 = [];
  atoms.forEach((a, c) => {
    const list = nbrs[c];
    if (list.length < 2) {
      return;
    }
    if (list.length > 4) {
      for (let x = 0; x < list.length; x++) {
        for (let y = x + 1; y < list.length; y++) {
          extra13.push([list[x].j, list[y].j]);
        }
      }
      return;
    }
    const theta = geo3dIdealAngle(a.hyb, list.length);
    for (let x = 0; x < list.length; x++) {
      for (let y = x + 1; y < list.length; y++) {
        const i = list[x].j;
        const j = list[y].j;
        const k = atoms[i].element === 'H' || atoms[j].element === 'H' ? GEO3D_FORCE.angleH : GEO3D_FORCE.angle;
        const linear = theta > Math.PI - 1e-6;
        angleTerms.push([i, c, j, Math.cos(theta), linear ? k : k / (Math.sin(theta) ** 2), linear ? 1 : 0]);
      }
    }
  });
  const torsionTerms = [];
  model.bonds.forEach((b) => {
    const j = model.index.get(b.atomA);
    const k = model.index.get(b.atomB);
    const hj = atoms[j].hyb;
    const hk = atoms[k].hyb;
    if (b.order === 3 || hj === 'sp' || hk === 'sp' || atoms[j].element === 'H' || atoms[k].element === 'H') {
      return;
    }
    const left = nbrs[j].filter((x) => x.j !== k).map((x) => x.j);
    const right = nbrs[k].filter((x) => x.j !== j).map((x) => x.j);
    const count = left.length * right.length;
    if (!count) {
      return;
    }
    let V = 0;
    let fold = 0;
    let sign = 1;
    if (hj === 'sp3' && hk === 'sp3') {
      const vj = GEO3D_TORSION_V[atoms[j].element] || 1;
      const vk = GEO3D_TORSION_V[atoms[k].element] || 1;
      V = Math.sqrt(vj * vk);
      fold = 3;
      sign = 1;
    } else if (hj === 'sp2' && hk === 'sp2') {
      const hetero = ['N', 'O'].includes(atoms[j].element) || ['N', 'O'].includes(atoms[k].element);
      V = b.order === 2 ? 30 : b.order === 1.5 ? 25 : hetero ? 10 : 5;
      fold = 2;
      sign = -1;
    } else {
      return;
    }
    left.forEach((i) => right.forEach((l) => torsionTerms.push([i, j, k, l, V / count, fold, sign])));
  });
  const improperTerms = [];
  atoms.forEach((a, c) => {
    if (a.hyb === 'sp2' && nbrs[c].length === 3) {
      improperTerms.push([c, nbrs[c][0].j, nbrs[c][1].j, nbrs[c][2].j, GEO3D_FORCE.improper]);
    }
  });
  const dist = new Uint8Array(n * n).fill(9);
  for (let s = 0; s < n; s++) {
    dist[s * n + s] = 0;
    let frontier = [s];
    for (let d = 1; d <= 3 && frontier.length; d++) {
      const next = [];
      frontier.forEach((u) => nbrs[u].forEach((x) => {
        if (dist[s * n + x.j] > d) {
          dist[s * n + x.j] = d;
          next.push(x.j);
        }
      }));
      frontier = next;
    }
  }
  const vdwTerms = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = dist[i * n + j];
      if (d < 3) {
        continue;
      }
      const r0 = GEO3D_FORCE.vdwScale * (geo3dVdwRadius(atoms[i].element) + geo3dVdwRadius(atoms[j].element));
      vdwTerms.push([i, j, r0, GEO3D_FORCE.vdw * (d === 3 ? GEO3D_FORCE.vdw14 : 1)]);
    }
  }
  extra13.forEach(([i, j]) => {
    const r0 = 1.3 * (geo3dSingleRadius(atoms[i].element) + geo3dSingleRadius(atoms[j].element));
    vdwTerms.push([i, j, r0, GEO3D_FORCE.vdw * 4]);
  });
  const restraints = model.restraints || { chiral: [], ez: [] };
  return {
    n,
    bonds: bondTerms,
    angles: angleTerms,
    torsions: torsionTerms,
    impropers: improperTerms,
    vdw: vdwTerms,
    chiral: restraints.chiral,
    ez: restraints.ez,
    nbrs,
    dist,
  };
}

function geo3dTorsionGrad(p, i, j, k, l, g, dEdPhi) {
  const fx = p[3 * i] - p[3 * j];
  const fy = p[3 * i + 1] - p[3 * j + 1];
  const fz = p[3 * i + 2] - p[3 * j + 2];
  const gx = p[3 * j] - p[3 * k];
  const gy = p[3 * j + 1] - p[3 * k + 1];
  const gz = p[3 * j + 2] - p[3 * k + 2];
  const hx = p[3 * l] - p[3 * k];
  const hy = p[3 * l + 1] - p[3 * k + 1];
  const hz = p[3 * l + 2] - p[3 * k + 2];
  const ax = fy * gz - fz * gy;
  const ay = fz * gx - fx * gz;
  const az = fx * gy - fy * gx;
  const bx = hy * gz - hz * gy;
  const by = hz * gx - hx * gz;
  const bz = hx * gy - hy * gx;
  const a2 = ax * ax + ay * ay + az * az;
  const b2 = bx * bx + by * by + bz * bz;
  const gl = Math.sqrt(gx * gx + gy * gy + gz * gz);
  if (a2 < 1e-10 || b2 < 1e-10 || gl < 1e-8) {
    return null;
  }
  if (!g) {
    return null;
  }
  const fg = fx * gx + fy * gy + fz * gz;
  const hg = hx * gx + hy * gy + hz * gz;
  const ca = -gl / a2;
  const cb = gl / b2;
  const cfa = fg / (a2 * gl);
  const chb = hg / (b2 * gl);
  g[3 * i] += dEdPhi * ca * ax;
  g[3 * i + 1] += dEdPhi * ca * ay;
  g[3 * i + 2] += dEdPhi * ca * az;
  g[3 * l] += dEdPhi * cb * bx;
  g[3 * l + 1] += dEdPhi * cb * by;
  g[3 * l + 2] += dEdPhi * cb * bz;
  g[3 * j] += dEdPhi * (-ca * ax + cfa * ax - chb * bx);
  g[3 * j + 1] += dEdPhi * (-ca * ay + cfa * ay - chb * by);
  g[3 * j + 2] += dEdPhi * (-ca * az + cfa * az - chb * bz);
  g[3 * k] += dEdPhi * (-cb * bx - cfa * ax + chb * bx);
  g[3 * k + 1] += dEdPhi * (-cb * by - cfa * ay + chb * by);
  g[3 * k + 2] += dEdPhi * (-cb * bz - cfa * az + chb * bz);
  return null;
}

function geo3dPhi(p, i, j, k, l) {
  const fx = p[3 * i] - p[3 * j];
  const fy = p[3 * i + 1] - p[3 * j + 1];
  const fz = p[3 * i + 2] - p[3 * j + 2];
  const gx = p[3 * j] - p[3 * k];
  const gy = p[3 * j + 1] - p[3 * k + 1];
  const gz = p[3 * j + 2] - p[3 * k + 2];
  const hx = p[3 * l] - p[3 * k];
  const hy = p[3 * l + 1] - p[3 * k + 1];
  const hz = p[3 * l + 2] - p[3 * k + 2];
  const ax = fy * gz - fz * gy;
  const ay = fz * gx - fx * gz;
  const az = fx * gy - fy * gx;
  const bx = hy * gz - hz * gy;
  const by = hz * gx - hx * gz;
  const bz = hx * gy - hy * gx;
  const al = Math.sqrt(ax * ax + ay * ay + az * az);
  const bl = Math.sqrt(bx * bx + by * by + bz * bz);
  const gl = Math.sqrt(gx * gx + gy * gy + gz * gz);
  if (al < 1e-8 || bl < 1e-8 || gl < 1e-8) {
    return 0;
  }
  const cos = (ax * bx + ay * by + az * bz) / (al * bl);
  const cx = by * az - bz * ay;
  const cy = bz * ax - bx * az;
  const cz = bx * ay - by * ax;
  const sin = (cx * gx + cy * gy + cz * gz) / (al * bl * gl);
  return Math.atan2(sin, cos);
}

function geo3dTriple(p, c, a, b, d, g, scale) {
  const ux = p[3 * a] - p[3 * d];
  const uy = p[3 * a + 1] - p[3 * d + 1];
  const uz = p[3 * a + 2] - p[3 * d + 2];
  const vx = p[3 * b] - p[3 * d];
  const vy = p[3 * b + 1] - p[3 * d + 1];
  const vz = p[3 * b + 2] - p[3 * d + 2];
  const wx = p[3 * c] - p[3 * d];
  const wy = p[3 * c + 1] - p[3 * d + 1];
  const wz = p[3 * c + 2] - p[3 * d + 2];
  const V = ux * (vy * wz - vz * wy) + uy * (vz * wx - vx * wz) + uz * (vx * wy - vy * wx);
  if (g && scale) {
    const gux = vy * wz - vz * wy;
    const guy = vz * wx - vx * wz;
    const guz = vx * wy - vy * wx;
    const gvx = wy * uz - wz * uy;
    const gvy = wz * ux - wx * uz;
    const gvz = wx * uy - wy * ux;
    const gwx = uy * vz - uz * vy;
    const gwy = uz * vx - ux * vz;
    const gwz = ux * vy - uy * vx;
    g[3 * a] += scale * gux;
    g[3 * a + 1] += scale * guy;
    g[3 * a + 2] += scale * guz;
    g[3 * b] += scale * gvx;
    g[3 * b + 1] += scale * gvy;
    g[3 * b + 2] += scale * gvz;
    g[3 * c] += scale * gwx;
    g[3 * c + 1] += scale * gwy;
    g[3 * c + 2] += scale * gwz;
    g[3 * d] -= scale * (gux + gvx + gwx);
    g[3 * d + 1] -= scale * (guy + gvy + gwy);
    g[3 * d + 2] -= scale * (guz + gvz + gwz);
  }
  return V;
}

function geo3dEval(ff, p, g) {
  let E = 0;
  if (g) {
    g.fill(0);
  }
  for (const [i, j, r0, k] of ff.bonds) {
    const dx = p[3 * j] - p[3 * i];
    const dy = p[3 * j + 1] - p[3 * i + 1];
    const dz = p[3 * j + 2] - p[3 * i + 2];
    const r = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9;
    const dr = r - r0;
    E += 0.5 * k * dr * dr;
    if (g) {
      const f = (k * dr) / r;
      g[3 * i] -= f * dx;
      g[3 * i + 1] -= f * dy;
      g[3 * i + 2] -= f * dz;
      g[3 * j] += f * dx;
      g[3 * j + 1] += f * dy;
      g[3 * j + 2] += f * dz;
    }
  }
  for (const [i, c, j, cos0, k, linear] of ff.angles) {
    const ux = p[3 * i] - p[3 * c];
    const uy = p[3 * i + 1] - p[3 * c + 1];
    const uz = p[3 * i + 2] - p[3 * c + 2];
    const vx = p[3 * j] - p[3 * c];
    const vy = p[3 * j + 1] - p[3 * c + 1];
    const vz = p[3 * j + 2] - p[3 * c + 2];
    const lu = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1e-9;
    const lv = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1e-9;
    const cos = (ux * vx + uy * vy + uz * vz) / (lu * lv);
    let dEdc;
    if (linear) {
      E += k * (1 + cos);
      dEdc = k;
    } else {
      const d = cos - cos0;
      E += 0.5 * k * d * d;
      dEdc = k * d;
    }
    if (g) {
      const a = dEdc / (lu * lv);
      const gux = a * (vx - (cos * lv * ux) / lu);
      const guy = a * (vy - (cos * lv * uy) / lu);
      const guz = a * (vz - (cos * lv * uz) / lu);
      const gvx = a * (ux - (cos * lu * vx) / lv);
      const gvy = a * (uy - (cos * lu * vy) / lv);
      const gvz = a * (uz - (cos * lu * vz) / lv);
      g[3 * i] += gux;
      g[3 * i + 1] += guy;
      g[3 * i + 2] += guz;
      g[3 * j] += gvx;
      g[3 * j + 1] += gvy;
      g[3 * j + 2] += gvz;
      g[3 * c] -= gux + gvx;
      g[3 * c + 1] -= guy + gvy;
      g[3 * c + 2] -= guz + gvz;
    }
  }
  for (const [i, j, k, l, V, fold, sign] of ff.torsions) {
    const phi = geo3dPhi(p, i, j, k, l);
    E += 0.5 * V * (1 + sign * Math.cos(fold * phi));
    if (g) {
      geo3dTorsionGrad(p, i, j, k, l, g, -0.5 * V * sign * fold * Math.sin(fold * phi));
    }
  }
  for (const [c, a, b, d, k] of ff.impropers) {
    const V = geo3dTriple(p, c, a, b, d, null, 0);
    E += k * V * V;
    if (g) {
      geo3dTriple(p, c, a, b, d, g, 2 * k * V);
    }
  }
  for (const [i, j, r0, k] of ff.vdw) {
    const dx = p[3 * j] - p[3 * i];
    if (dx > r0 || dx < -r0) {
      continue;
    }
    const dy = p[3 * j + 1] - p[3 * i + 1];
    const dz = p[3 * j + 2] - p[3 * i + 2];
    const r2 = dx * dx + dy * dy + dz * dz;
    if (r2 >= r0 * r0) {
      continue;
    }
    const r = Math.sqrt(r2) || 1e-9;
    const d = r0 - r;
    E += k * d * d;
    if (g) {
      const f = (-2 * k * d) / r;
      g[3 * i] -= f * dx;
      g[3 * i + 1] -= f * dy;
      g[3 * i + 2] -= f * dz;
      g[3 * j] += f * dx;
      g[3 * j + 1] += f * dy;
      g[3 * j + 2] += f * dz;
    }
  }
  for (const r of ff.chiral) {
    const V = geo3dTriple(p, r.n[2], r.n[0], r.n[1], r.n[3], null, 0);
    const gap = GEO3D_FORCE.chiralFloor - r.sign * V;
    if (gap > 0) {
      E += GEO3D_FORCE.chiral * gap * gap;
      if (g) {
        geo3dTriple(p, r.n[2], r.n[0], r.n[1], r.n[3], g, -2 * GEO3D_FORCE.chiral * gap * r.sign);
      }
    }
  }
  for (const r of ff.holds || []) {
    const phi = geo3dPhi(p, r.i, r.j, r.k, r.l);
    E += r.force * (1 - Math.cos(phi - r.target));
    if (g) {
      geo3dTorsionGrad(p, r.i, r.j, r.k, r.l, g, r.force * Math.sin(phi - r.target));
    }
  }
  for (const r of ff.ez) {
    const phi = geo3dPhi(p, r.i, r.j, r.k, r.l);
    const c = Math.cos(phi - r.target);
    if (c < 0.5) {
      E += GEO3D_FORCE.ez * (0.5 - c) * (0.5 - c);
      if (g) {
        geo3dTorsionGrad(p, r.i, r.j, r.k, r.l, g, 2 * GEO3D_FORCE.ez * (0.5 - c) * Math.sin(phi - r.target));
      }
    }
  }
  return E;
}

function geo3dPack(model) {
  const p = new Float64Array(model.atoms.length * 3);
  model.atoms.forEach((a, i) => {
    p[3 * i] = a.x;
    p[3 * i + 1] = a.y;
    p[3 * i + 2] = a.z;
  });
  return p;
}

function geo3dUnpack(model, p) {
  model.atoms.forEach((a, i) => {
    a.x = p[3 * i];
    a.y = p[3 * i + 1];
    a.z = p[3 * i + 2];
  });
}

function geo3dFire(ff, p, maxSteps) {
  const n = p.length;
  const g = new Float64Array(n);
  const v = new Float64Array(n);
  let dt = GEO3D_SETTINGS.dtStart;
  let alpha = 0.1;
  let positive = 0;
  let E = geo3dEval(ff, p, g);
  let steps = 0;
  let converged = false;
  for (; steps < maxSteps; steps++) {
    let maxF = 0;
    let power = 0;
    let vv = 0;
    let ff2 = 0;
    for (let i = 0; i < n; i++) {
      const f = -g[i];
      if (Math.abs(f) > maxF) {
        maxF = Math.abs(f);
      }
      power += f * v[i];
      vv += v[i] * v[i];
      ff2 += f * f;
    }
    if (maxF < GEO3D_SETTINGS.forceTol) {
      converged = true;
      break;
    }
    if (power > 0) {
      const scale = ff2 > 0 ? Math.sqrt(vv / ff2) : 0;
      for (let i = 0; i < n; i++) {
        v[i] = (1 - alpha) * v[i] - alpha * g[i] * scale;
      }
      if (positive++ > 5) {
        dt = Math.min(dt * 1.1, GEO3D_SETTINGS.dtMax);
        alpha *= 0.99;
      }
    } else {
      v.fill(0);
      dt *= 0.5;
      alpha = 0.1;
      positive = 0;
    }
    for (let i = 0; i < n; i++) {
      v[i] -= g[i] * dt;
    }
    for (let a = 0; a < n; a += 3) {
      let dx = v[a] * dt;
      let dy = v[a + 1] * dt;
      let dz = v[a + 2] * dt;
      const move = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (move > GEO3D_SETTINGS.maxMove) {
        const s = GEO3D_SETTINGS.maxMove / move;
        dx *= s;
        dy *= s;
        dz *= s;
      }
      p[a] += dx;
      p[a + 1] += dy;
      p[a + 2] += dz;
    }
    E = geo3dEval(ff, p, g);
  }
  return { energy: E, steps, converged };
}

function minimize3d(model, options) {
  const opts = options || {};
  if (!model.ff) {
    model.ff = geo3dForceField(model);
  }
  const p = geo3dPack(model);
  const result = geo3dFire(model.ff, p, opts.maxSteps || GEO3D_SETTINGS.maxSteps);
  geo3dUnpack(model, p);
  model.energy = result.energy;
  return result;
}

function ff3dEnergy(model) {
  if (!model.ff) {
    model.ff = geo3dForceField(model);
  }
  return geo3dEval(model.ff, geo3dPack(model), null);
}

function embed3d(graph, atomIds, options) {
  const opts = options || {};
  const model = geo3dBuild(graph, atomIds);
  const rng = geo3dRandom(opts.seed === undefined ? 1 : opts.seed);
  geo3dStartCoordinates(model, rng);
  model.restraints = geo3dRestraints(model);
  model.ff = geo3dForceField(model);
  if (opts.minimize !== false) {
    minimize3d(model, opts);
  } else {
    model.energy = ff3dEnergy(model);
  }
  return model;
}

function geo3dCopy(model) {
  return Object.assign({}, model, { atoms: model.atoms.map((a) => Object.assign({}, a)) });
}

function geo3dHeavyIndices(model) {
  return model.atoms.map((a, i) => (a.element === 'H' ? -1 : i)).filter((i) => i >= 0);
}

function geo3dJacobi4(m) {
  const a = m.map((row) => row.slice());
  const v = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < 4; p++) {
      for (let q = p + 1; q < 4; q++) {
        off += a[p][q] * a[p][q];
      }
    }
    if (off < 1e-18) {
      break;
    }
    for (let p = 0; p < 4; p++) {
      for (let q = p + 1; q < 4; q++) {
        if (Math.abs(a[p][q]) < 1e-15) {
          continue;
        }
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < 4; k++) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < 4; k++) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < 4; k++) {
          const vkp = v[k][p];
          const vkq = v[k][q];
          v[k][p] = c * vkp - s * vkq;
          v[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  let best = 0;
  for (let k = 1; k < 4; k++) {
    if (a[k][k] > a[best][best]) {
      best = k;
    }
  }
  return { value: a[best][best], vector: [v[0][best], v[1][best], v[2][best], v[3][best]] };
}

function rmsd3d(pointsA, pointsB) {
  const n = Math.min(pointsA.length, pointsB.length);
  if (!n) {
    return 0;
  }
  const center = (pts) => {
    const c = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < n; i++) {
      c.x += pts[i].x / n;
      c.y += pts[i].y / n;
      c.z += pts[i].z / n;
    }
    return c;
  };
  const ca = center(pointsA);
  const cb = center(pointsB);
  let sxx = 0; let sxy = 0; let sxz = 0; let syx = 0; let syy = 0; let syz = 0; let szx = 0; let szy = 0; let szz = 0;
  let ga = 0;
  let gb = 0;
  for (let i = 0; i < n; i++) {
    const ax = pointsA[i].x - ca.x;
    const ay = pointsA[i].y - ca.y;
    const az = pointsA[i].z - ca.z;
    const bx = pointsB[i].x - cb.x;
    const by = pointsB[i].y - cb.y;
    const bz = pointsB[i].z - cb.z;
    ga += ax * ax + ay * ay + az * az;
    gb += bx * bx + by * by + bz * bz;
    sxx += ax * bx; sxy += ax * by; sxz += ax * bz;
    syx += ay * bx; syy += ay * by; syz += ay * bz;
    szx += az * bx; szy += az * by; szz += az * bz;
  }
  const k = [
    [sxx + syy + szz, syz - szy, szx - sxz, sxy - syx],
    [syz - szy, sxx - syy - szz, sxy + syx, szx + sxz],
    [szx - sxz, sxy + syx, -sxx + syy - szz, syz + szy],
    [sxy - syx, szx + sxz, syz + szy, -sxx - syy + szz],
  ];
  const { value } = geo3dJacobi4(k);
  return Math.sqrt(Math.max(0, (ga + gb - 2 * value) / n));
}

function geo3dHeavyRmsd(modelA, modelB) {
  const idx = geo3dHeavyIndices(modelA);
  return rmsd3d(idx.map((i) => modelA.atoms[i]), idx.map((i) => modelB.atoms[i]));
}

function geo3dSide(model, fromIndex, blockIndex) {
  const nbrs = model.ff.nbrs;
  const seen = new Set([fromIndex, blockIndex]);
  const stack = [fromIndex];
  const side = [fromIndex];
  while (stack.length) {
    const u = stack.pop();
    nbrs[u].forEach((x) => {
      if (!seen.has(x.j)) {
        seen.add(x.j);
        side.push(x.j);
        stack.push(x.j);
      }
    });
  }
  return side;
}

function geo3dRotateAbout(model, axisFrom, axisTo, indices, angle) {
  const a = model.atoms[axisFrom];
  const b = model.atoms[axisTo];
  let kx = b.x - a.x;
  let ky = b.y - a.y;
  let kz = b.z - a.z;
  const len = Math.sqrt(kx * kx + ky * ky + kz * kz) || 1;
  kx /= len;
  ky /= len;
  kz /= len;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  indices.forEach((i) => {
    const p = model.atoms[i];
    const vx = p.x - b.x;
    const vy = p.y - b.y;
    const vz = p.z - b.z;
    const dot = kx * vx + ky * vy + kz * vz;
    const cx = ky * vz - kz * vy;
    const cy = kz * vx - kx * vz;
    const cz = kx * vy - ky * vx;
    p.x = b.x + vx * c + cx * s + kx * dot * (1 - c);
    p.y = b.y + vy * c + cy * s + ky * dot * (1 - c);
    p.z = b.z + vz * c + cz * s + kz * dot * (1 - c);
  });
}

function rotatableBonds3d(model) {
  const nbrs = model.ff.nbrs;
  const heavyDegree = (i) => nbrs[i].filter((x) => model.atoms[x.j].element !== 'H').length;
  return model.bonds.filter((b) => {
    if (b.order !== 1 || b.ring || b.id < 0) {
      return false;
    }
    const i = model.index.get(b.atomA);
    const j = model.index.get(b.atomB);
    return heavyDegree(i) >= 2 && heavyDegree(j) >= 2 && model.atoms[i].hyb !== 'sp' && model.atoms[j].hyb !== 'sp';
  });
}

function geo3dFlippableRings(model) {
  return model.ctx.cycles.filter((cycle) => cycle.length >= 5 && cycle.length <= 8 && !cycle.every((id) => model.atoms[model.index.get(id)].aromatic)
    && cycle.filter((id) => model.atoms[model.index.get(id)].hyb === 'sp3').length >= 3);
}

function geo3dFlipRing(model, cycle) {
  const idx = cycle.map((id) => model.index.get(id));
  const inRing = new Set(idx);
  const c = { x: 0, y: 0, z: 0 };
  idx.forEach((i) => {
    c.x += model.atoms[i].x / idx.length;
    c.y += model.atoms[i].y / idx.length;
    c.z += model.atoms[i].z / idx.length;
  });
  const nrm = { x: 0, y: 0, z: 0 };
  idx.forEach((i, k) => {
    const p = model.atoms[i];
    const q = model.atoms[idx[(k + 1) % idx.length]];
    const ux = p.x - c.x; const uy = p.y - c.y; const uz = p.z - c.z;
    const vx = q.x - c.x; const vy = q.y - c.y; const vz = q.z - c.z;
    nrm.x += uy * vz - uz * vy;
    nrm.y += uz * vx - ux * vz;
    nrm.z += ux * vy - uy * vx;
  });
  const nl = Math.hypot(nrm.x, nrm.y, nrm.z) || 1;
  nrm.x /= nl;
  nrm.y /= nl;
  nrm.z /= nl;
  const plan = idx.map((i) => {
    const p = model.atoms[i];
    const h = (p.x - c.x) * nrm.x + (p.y - c.y) * nrm.y + (p.z - c.z) * nrm.z;
    const out = { x: p.x - c.x - h * nrm.x, y: p.y - c.y - h * nrm.y, z: p.z - c.z - h * nrm.z };
    const ol = Math.hypot(out.x, out.y, out.z) || 1;
    return { i, h, out: { x: out.x / ol, y: out.y / ol, z: out.z / ol } };
  });
  plan.forEach(({ i, h, out }) => {
    const ring = model.atoms[i];
    const subs = model.ff.nbrs[i].filter((x) => !inRing.has(x.j)).map((x) => x.j);
    const shift = -2 * h;
    ring.x += shift * nrm.x;
    ring.y += shift * nrm.y;
    ring.z += shift * nrm.z;
    subs.forEach((s) => {
      const side = geo3dSide(model, s, i);
      if (side.some((k) => inRing.has(k))) {
        const a = model.atoms[s];
        a.x += shift * nrm.x;
        a.y += shift * nrm.y;
        a.z += shift * nrm.z;
        return;
      }
      side.forEach((k) => {
        model.atoms[k].x += shift * nrm.x;
        model.atoms[k].y += shift * nrm.y;
        model.atoms[k].z += shift * nrm.z;
      });
      const a = model.atoms[s];
      const u = { x: a.x - ring.x, y: a.y - ring.y, z: a.z - ring.z };
      const ul = Math.hypot(u.x, u.y, u.z) || 1;
      const un = (u.x * nrm.x + u.y * nrm.y + u.z * nrm.z) / ul;
      let target;
      if (Math.abs(un) > 0.7) {
        const sgn = Math.sign(un);
        target = { x: 0.33 * sgn * nrm.x + 0.94 * out.x, y: 0.33 * sgn * nrm.y + 0.94 * out.y, z: 0.33 * sgn * nrm.z + 0.94 * out.z };
      } else {
        const sgn = h ? -Math.sign(h) : Math.sign(un) || 1;
        target = { x: sgn * nrm.x, y: sgn * nrm.y, z: sgn * nrm.z };
      }
      geo3dAlignSide(model, i, side, { x: u.x / ul, y: u.y / ul, z: u.z / ul }, target);
    });
  });
}

function geo3dAlignSide(model, pivot, indices, from, to) {
  const tl = Math.hypot(to.x, to.y, to.z) || 1;
  const t = { x: to.x / tl, y: to.y / tl, z: to.z / tl };
  let kx = from.y * t.z - from.z * t.y;
  let ky = from.z * t.x - from.x * t.z;
  let kz = from.x * t.y - from.y * t.x;
  const s = Math.hypot(kx, ky, kz);
  const c = from.x * t.x + from.y * t.y + from.z * t.z;
  if (s < 1e-6) {
    return;
  }
  kx /= s;
  ky /= s;
  kz /= s;
  const b = model.atoms[pivot];
  indices.forEach((i) => {
    const p = model.atoms[i];
    const vx = p.x - b.x;
    const vy = p.y - b.y;
    const vz = p.z - b.z;
    const dot = kx * vx + ky * vy + kz * vz;
    const cx = ky * vz - kz * vy;
    const cy = kz * vx - kx * vz;
    const cz = kx * vy - ky * vx;
    p.x = b.x + vx * c + cx * s + kx * dot * (1 - c);
    p.y = b.y + vy * c + cy * s + ky * dot * (1 - c);
    p.z = b.z + vz * c + cz * s + kz * dot * (1 - c);
  });
}

function conformerSearch3d(graph, atomIds, options) {
  const opts = Object.assign({ count: GEO3D_SETTINGS.conformerCount, seed: 1, timeBudgetMs: GEO3D_SETTINGS.timeBudgetMs }, options || {});
  const rng = geo3dRandom(opts.seed * 7919 + 13);
  const job = { conformers: [], done: false, trials: 0, maxTrials: 0, cancelled: false, elapsedMs: 0, base: null };
  let rotors = [];
  let rings = [];
  let seedCounter = opts.seed;
  function accept(model) {
    model.energy = ff3dEnergy(model);
    for (let k = 0; k < job.conformers.length; k++) {
      const other = job.conformers[k];
      if (geo3dHeavyRmsd(other, model) < GEO3D_SETTINGS.conformerRmsd) {
        if (model.energy < other.energy - 1e-6) {
          job.conformers[k] = model;
        }
        job.conformers.sort((a, b) => a.energy - b.energy);
        return;
      }
    }
    job.conformers.push(model);
    job.conformers.sort((a, b) => a.energy - b.energy);
    if (job.conformers.length > opts.count * 2) {
      job.conformers.length = opts.count * 2;
    }
  }
  function trial() {
    if (!job.base) {
      job.base = embed3d(graph, atomIds, { seed: seedCounter });
      rotors = rotatableBonds3d(job.base);
      rings = geo3dFlippableRings(job.base);
      job.maxTrials = rotors.length === 0 && rings.length === 0 ? 3 : Math.min(120, 12 + 10 * rotors.length + 8 * rings.length);
      accept(job.base);
      return;
    }
    let model;
    if (job.trials % 6 === 5 || !job.conformers.length) {
      seedCounter += 1;
      model = embed3d(graph, atomIds, { seed: seedCounter });
    } else {
      const pool = job.conformers;
      const pick = pool[Math.floor(Math.pow(rng(), 2) * pool.length)];
      model = geo3dCopy(pick);
      let kicked = false;
      rings.forEach((cycle) => {
        if (rng() < 0.5) {
          geo3dFlipRing(model, cycle);
          kicked = true;
        }
      });
      rotors.forEach((b) => {
        if (rng() < 0.5 || (!kicked && rotors.length === 1)) {
          const i = model.index.get(b.atomA);
          const j = model.index.get(b.atomB);
          const side = geo3dSide(model, j, i);
          const angle = (rng() < 0.5 ? 1 : -1) * ((2 * Math.PI) / 3) + (rng() - 0.5) * 0.4;
          geo3dRotateAbout(model, i, j, side, angle);
          kicked = true;
        }
      });
      if (!kicked && rings.length) {
        geo3dFlipRing(model, rings[Math.floor(rng() * rings.length)]);
      }
      model.atoms.forEach((a) => {
        a.x += (rng() - 0.5) * 0.1;
        a.y += (rng() - 0.5) * 0.1;
        a.z += (rng() - 0.5) * 0.1;
      });
      minimize3d(model);
    }
    accept(model);
  }
  job.step = (ms) => {
    const started = Date.now();
    while (!job.done && !job.cancelled) {
      trial();
      job.trials++;
      const spent = Date.now() - started;
      if (job.trials >= job.maxTrials || job.elapsedMs + spent >= opts.timeBudgetMs) {
        job.done = true;
        break;
      }
      if (spent >= ms) {
        break;
      }
    }
    job.elapsedMs += Date.now() - started;
    if (job.done || job.cancelled) {
      job.conformers.length = Math.min(job.conformers.length, opts.count);
      job.done = true;
    }
    return job.done;
  };
  return job;
}

function conformers3d(graph, atomIds, options) {
  const job = conformerSearch3d(graph, atomIds, options);
  while (!job.step(1e9)) {
    continue;
  }
  const min = job.conformers.length ? job.conformers[0].energy : 0;
  job.conformers.forEach((c) => {
    c.relEnergy = c.energy - min;
  });
  return job.conformers;
}

function dihedral3d(a, b, c, d) {
  const p = [a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z];
  return (geo3dPhi(p, 0, 1, 2, 3) * 180) / Math.PI;
}

function angle3d(a, b, c) {
  const ux = a.x - b.x; const uy = a.y - b.y; const uz = a.z - b.z;
  const vx = c.x - b.x; const vy = c.y - b.y; const vz = c.z - b.z;
  const cos = (ux * vx + uy * vy + uz * vz) / ((Math.hypot(ux, uy, uz) * Math.hypot(vx, vy, vz)) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

function distance3d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function model3dStereo(model, graph, atomIds) {
  const g = graph || model.graph;
  const ids = atomIds || model.atomIds;
  return findStereocenters(g, ids).map((center) => {
    const heavy = g.bondsForAtom(center.atomId).filter((b) => model.index.has(b.atomA) && model.index.has(b.atomB))
      .map((b) => (b.atomA === center.atomId ? b.atomB : b.atomA));
    const neighborIds = heavy.length === 3 ? heavy.concat([null]) : heavy;
    const { order } = cipRankSubstituents(g, center.atomId, neighborIds);
    const hydrogen = model.atoms.find((a) => a.implicitH && a.parent === center.atomId);
    const pts = order.map((node) => (node.atomId === null ? hydrogen : model.atoms[model.index.get(node.atomId)]));
    if (pts.some((p) => !p)) {
      return { atomId: center.atomId, type: null, drawn: center.type };
    }
    const p = [];
    pts.forEach((q) => p.push(q.x, q.y, q.z));
    const V = geo3dTriple(p, 2, 0, 1, 3, null, 0);
    return { atomId: center.atomId, type: V < 0 ? 'R' : 'S', drawn: center.type };
  });
}

function graphFromSmiles3d(smiles) {
  const fragment = smilesToFragment(smiles);
  const graph = new Graph();
  const map = new Map();
  fragment.atoms.forEach((a) => {
    const atom = graph.addAtom(a.element, a.x, a.y);
    if (a.charge) {
      atom.charge = a.charge;
    }
    if (a.hydrogens !== undefined && a.hydrogens !== null) {
      atom.hydrogens = a.hydrogens;
    }
    map.set(a.id, atom.id);
  });
  fragment.bonds.forEach((b) => {
    const bond = graph.addBond(map.get(b.atomA), map.get(b.atomB));
    bond.order = b.order;
    if (b.stereo) {
      bond.stereo = b.stereo;
    }
  });
  return { graph, ids: graph.atoms.map((a) => a.id) };
}
