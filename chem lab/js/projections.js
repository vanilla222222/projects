const CHAIR_A_VALUES = {
  Me: 1.74, Et: 1.79, iPr: 2.15, tBu: 4.9, Ph: 2.8, OH: 0.87, OMe: 0.6, NH2: 1.4,
  F: 0.25, Cl: 0.53, Br: 0.48, I: 0.47, CO2H: 1.35, CO2Me: 1.27, CN: 0.2, CH2OH: 1.8, vinyl: 1.7,
};

const CHAIR_DEFAULT_A = 1.7;

const PROJ_RT_25C = 0.593;

const NEWMAN_HOLD = 400;

const NEWMAN_RELAX_STEPS = 600;

const PROJ_HETERO = new Set(['O', 'N', 'S', 'F', 'Cl', 'Br', 'I', 'P']);

function projHeavyNeighbors(ctx, id) {
  return ctx.nbrs.get(id) || [];
}

function projHydrogens(ctx, id) {
  return ctx.h.get(id) || 0;
}

function projLabel(ctx, fromId, id, left, depth) {
  const el = ctx.el.get(id);
  const d = depth === undefined ? 0 : depth;
  if (el === 'H') {
    return 'H';
  }
  const nbrs = projHeavyNeighbors(ctx, id).filter((n) => n.id !== fromId);
  const h = projHydrogens(ctx, id);
  const hText = h ? `H${h > 1 ? h : ''}` : '';
  const flip = (right, leftText) => (left ? leftText : right);
  if (['F', 'Cl', 'Br', 'I'].includes(el) && !nbrs.length) {
    return el;
  }
  if (el === 'O' || el === 'S') {
    if (!nbrs.length) {
      return flip(`${el}${hText}`, `${hText}${el}`);
    }
    if (nbrs.length === 1 && ctx.el.get(nbrs[0].id) === 'C' && projHydrogens(ctx, nbrs[0].id) === 3 && projHeavyNeighbors(ctx, nbrs[0].id).length === 1) {
      return flip(`${el}CH3`, `H3C${el}`);
    }
    return flip(`${el}R`, `R${el}`);
  }
  if (el === 'N') {
    if (!nbrs.length) {
      return flip(`N${hText}`, `${hText}N`);
    }
    if (nbrs.length === 1 && nbrs[0].order === 3) {
      return flip('NC', 'CN');
    }
    return flip(`N${hText}R`, `R${hText}N`);
  }
  if (el !== 'C') {
    return el + hText;
  }
  if (ctx.isAromatic(id)) {
    const ring = ctx.cycles.find((c) => c.includes(id));
    const phenyl = ring && ring.length === 6 && ring.every((a) => ctx.el.get(a) === 'C')
      && ring.every((a) => a === id || projHeavyNeighbors(ctx, a).length === 2);
    return phenyl ? 'Ph' : 'Ar';
  }
  const doubleO = nbrs.find((n) => n.order === 2 && ctx.el.get(n.id) === 'O');
  const tripleN = nbrs.find((n) => n.order === 3 && ctx.el.get(n.id) === 'N');
  if (tripleN) {
    return flip('CN', 'NC');
  }
  if (doubleO) {
    const rest = nbrs.filter((n) => n.id !== doubleO.id);
    if (!rest.length) {
      return flip('CHO', 'OHC');
    }
    if (rest.length === 1 && ctx.el.get(rest[0].id) === 'O') {
      const o = rest[0].id;
      const oNbrs = projHeavyNeighbors(ctx, o).filter((n) => n.id !== id);
      if (!oNbrs.length) {
        return flip('COOH', 'HOOC');
      }
      if (oNbrs.length === 1 && projHydrogens(ctx, oNbrs[0].id) === 3) {
        return flip('COOCH3', 'H3COOC');
      }
      return flip('COOR', 'ROOC');
    }
    if (rest.length === 1 && ctx.el.get(rest[0].id) === 'N') {
      return flip('CONH2', 'H2NOC');
    }
    if (rest.length === 1 && ctx.el.get(rest[0].id) === 'C' && projHydrogens(ctx, rest[0].id) === 3 && projHeavyNeighbors(ctx, rest[0].id).length === 1) {
      return flip('COCH3', 'H3COC');
    }
    return flip('COR', 'ROC');
  }
  if (!nbrs.length) {
    return flip(`C${hText}`, `${hText}C`);
  }
  if (nbrs.length === 2 && h === 1 && nbrs.every((n) => n.order === 1 && ctx.el.get(n.id) === 'C' && projHydrogens(ctx, n.id) === 3 && projHeavyNeighbors(ctx, n.id).length === 1)) {
    return flip('CH(CH3)2', '(H3C)2CH');
  }
  if (nbrs.length === 3 && h === 0 && nbrs.every((n) => n.order === 1 && ctx.el.get(n.id) === 'C' && projHydrogens(ctx, n.id) === 3 && projHeavyNeighbors(ctx, n.id).length === 1)) {
    return flip('C(CH3)3', '(H3C)3C');
  }
  if (nbrs.length === 1 && nbrs[0].order === 2 && ctx.el.get(nbrs[0].id) === 'C' && projHydrogens(ctx, nbrs[0].id) === 2) {
    return flip('CH=CH2', 'H2C=HC');
  }
  if (nbrs.length === 1 && nbrs[0].order === 1 && d < 4) {
    const inner = projLabel(ctx, id, nbrs[0].id, left, d + 1);
    if (inner === 'R' || inner.length > 14) {
      return flip(`C${hText}R`, `RC${hText}`);
    }
    return left ? `${inner}C${hText}` : `C${hText}${inner}`;
  }
  return flip(`C${hText}R`, `RC${hText}`);
}

function projGroupLabel(graph, ctx, fromId, id, side) {
  if (id === null || id === undefined || id < 0) {
    return 'H';
  }
  const context = ctx || insightContext(graph, graph.atoms.map((a) => a.id));
  return projLabel(context, fromId, id, side === 'left', 0);
}

function projAValueGroup(ctx, ringId, id) {
  const el = ctx.el.get(id);
  if (['F', 'Cl', 'Br', 'I'].includes(el)) {
    return el;
  }
  const nbrs = projHeavyNeighbors(ctx, id).filter((n) => n.id !== ringId);
  const h = projHydrogens(ctx, id);
  if (el === 'O') {
    if (!nbrs.length) {
      return 'OH';
    }
    return nbrs.length === 1 && ctx.el.get(nbrs[0].id) === 'C' ? 'OMe' : null;
  }
  if (el === 'N') {
    return !nbrs.length && h === 2 ? 'NH2' : null;
  }
  if (el !== 'C') {
    return null;
  }
  if (ctx.isAromatic(id)) {
    return 'Ph';
  }
  if (nbrs.some((n) => n.order === 3 && ctx.el.get(n.id) === 'N')) {
    return 'CN';
  }
  const doubleO = nbrs.find((n) => n.order === 2 && ctx.el.get(n.id) === 'O');
  if (doubleO) {
    const single = nbrs.find((n) => n.order === 1 && ctx.el.get(n.id) === 'O');
    if (single) {
      return projHeavyNeighbors(ctx, single.id).length === 1 ? 'CO2H' : 'CO2Me';
    }
    return null;
  }
  if (nbrs.length === 1 && nbrs[0].order === 2 && ctx.el.get(nbrs[0].id) === 'C') {
    return 'vinyl';
  }
  if (!nbrs.length && h === 3) {
    return 'Me';
  }
  if (nbrs.length === 1 && h === 2) {
    const other = nbrs[0].id;
    if (ctx.el.get(other) === 'O' && projHeavyNeighbors(ctx, other).length === 1) {
      return 'CH2OH';
    }
    if (ctx.el.get(other) === 'C' && nbrs[0].order === 1) {
      return 'Et';
    }
    return null;
  }
  const carbons = nbrs.filter((n) => n.order === 1 && ctx.el.get(n.id) === 'C');
  if (nbrs.length === 2 && h === 1 && carbons.length === 2) {
    return 'iPr';
  }
  if (nbrs.length === 3 && h === 0 && carbons.length === 3) {
    return 'tBu';
  }
  return null;
}

function projRingFaces(graph, ctx, ring) {
  const inRing = new Set(ring);
  return ring.map((id) => {
    const subs = projHeavyNeighbors(ctx, id).filter((n) => !inRing.has(n.id)).map((n) => n.id);
    const hCount = projHydrogens(ctx, id);
    const faces = new Map();
    graph.bondsForAtom(id).forEach((b) => {
      if (b.stereo && b.atomA === id && subs.includes(b.atomB)) {
        faces.set(b.atomB, b.stereo === 'wedge' ? 'up' : 'down');
      }
    });
    const known = [...faces.values()];
    const items = subs.map((sub) => {
      let face = faces.get(sub) || null;
      if (!face && known.length) {
        face = known[0] === 'up' ? 'down' : 'up';
      }
      return { atomId: sub, face };
    });
    if (items.length === 2 && !known.length) {
      items[0].face = 'up';
      items[1].face = 'down';
    }
    const used = new Set(items.map((s) => s.face).filter(Boolean));
    for (let k = 0; k < hCount; k++) {
      const face = !used.has('up') ? 'up' : !used.has('down') ? 'down' : null;
      if (face) {
        used.add(face);
      }
      items.push({ atomId: null, face: items.length === 1 && !items[0].face ? null : face, hydrogen: true });
    }
    return items;
  });
}

function projChairRings(ctx) {
  return ctx.cycles.filter((cycle) => {
    if (cycle.length !== 6 || cycle.some((id) => ctx.isAromatic(id))) {
      return false;
    }
    for (let k = 0; k < 6; k++) {
      const a = cycle[k];
      const b = cycle[(k + 1) % 6];
      const bond = projHeavyNeighbors(ctx, a).find((n) => n.id === b);
      if (!bond || bond.order !== 1) {
        return false;
      }
    }
    const els = cycle.map((id) => ctx.el.get(id));
    const oxygens = els.filter((e) => e === 'O').length;
    if (els.every((e) => e === 'C')) {
      return cycle.every((id) => projHeavyNeighbors(ctx, id).every((n) => n.order === 1));
    }
    return oxygens === 1 && els.filter((e) => e === 'C').length === 5;
  });
}

function projRotateRing(ctx, cycle) {
  const oIndex = cycle.findIndex((id) => ctx.el.get(id) === 'O');
  let start = oIndex;
  if (start < 0) {
    start = cycle.findIndex((id) => projHeavyNeighbors(ctx, id).some((n) => !cycle.includes(n.id)));
    if (start < 0) {
      start = 0;
    }
  }
  return cycle.slice(start).concat(cycle.slice(0, start));
}

function chairAnalysis(graph, atomIds, options) {
  const opts = options || {};
  const ids = atomIds.filter((id) => graph.getAtom(id));
  const ctx = insightContext(graph, ids);
  const rings = projChairRings(ctx).map((cycle) => projRotateRing(ctx, cycle));
  if (!rings.length) {
    const six = ctx.cycles.filter((cycle) => cycle.length === 6);
    if (six.length && six.every((cycle) => cycle.some((id) => ctx.isAromatic(id)))) {
      return { applicable: false, reason: 'Aromatic rings such as benzene are flat, so they have no chair; needs a saturated six-membered carbocycle or a pyranose ring', rings: [] };
    }
    return { applicable: false, reason: 'Needs a saturated six-membered carbocycle or a pyranose ring', rings: [] };
  }
  const ringIndex = Math.max(0, Math.min(rings.length - 1, opts.ringIndex || 0));
  const ring = rings[ringIndex];
  const faces = projRingFaces(graph, ctx, ring);
  const substituted = faces.filter((items) => items.some((item) => !item.hydrogen)).length;
  const substituents = [];
  let ambiguous = false;
  faces.forEach((items, i) => {
    if (substituted === 1 && items.length && items.every((item) => !item.face)) {
      items.forEach((item, k) => {
        item.face = k === 0 ? 'up' : 'down';
      });
    }
    items.forEach((item) => {
      if (item.hydrogen) {
        substituents.push({ ringPosition: i, ringAtomId: ring[i], atomId: null, face: item.face, group: 'H', aValue: 0, known: true, hydrogen: true });
        return;
      }
      const group = projAValueGroup(ctx, ring[i], item.atomId);
      const aValue = group ? CHAIR_A_VALUES[group] : CHAIR_DEFAULT_A;
      if (!item.face) {
        ambiguous = true;
      }
      substituents.push({
        ringPosition: i,
        ringAtomId: ring[i],
        atomId: item.atomId,
        face: item.face,
        group: group || 'R',
        aValue,
        known: Boolean(group),
        hydrogen: false,
        labelLeft: projLabel(ctx, ring[i], item.atomId, true, 0),
        labelRight: projLabel(ctx, ring[i], item.atomId, false, 0),
      });
    });
  });
  substituents.forEach((s) => {
    if (!s.face) {
      s.axialA = null;
      s.axialB = null;
      return;
    }
    const upAxialA = s.ringPosition % 2 === 0;
    s.axialA = (s.face === 'up') === upAxialA;
    s.axialB = !s.axialA;
  });
  const heavySubs = substituents.filter((s) => !s.hydrogen && s.face);
  const energyA = heavySubs.filter((s) => s.axialA).reduce((sum, s) => sum + s.aValue, 0);
  const energyB = heavySubs.filter((s) => s.axialB).reduce((sum, s) => sum + s.aValue, 0);
  const deltaG = Math.abs(energyA - energyB);
  const k = Math.exp(deltaG / PROJ_RT_25C);
  const major = (100 * k) / (1 + k);
  const stable = deltaG < 1e-9 ? null : energyA < energyB ? 'A' : 'B';
  return {
    applicable: true,
    rings: rings.map((r, i) => ({ index: i, atomIds: r, label: `Ring ${i + 1} (${r.some((id) => ctx.el.get(id) === 'O') ? 'pyranose' : 'cyclohexane'})` })),
    ringIndex,
    ring,
    ringElements: ring.map((id) => ctx.el.get(id)),
    substituents,
    ambiguous,
    energies: { A: energyA, B: energyB },
    deltaG,
    stable,
    ratio: stable === 'A' ? [major, 100 - major] : stable === 'B' ? [100 - major, major] : [50, 50],
  };
}

function projCarbonChain(ctx, ids) {
  const carbons = ids.filter((id) => ctx.el.get(id) === 'C');
  if (!carbons.length) {
    return [];
  }
  const cSet = new Set(carbons);
  const bfs = (start) => {
    const prev = new Map([[start, null]]);
    const queue = [start];
    let last = start;
    while (queue.length) {
      const u = queue.shift();
      last = u;
      projHeavyNeighbors(ctx, u).forEach((n) => {
        if (cSet.has(n.id) && !prev.has(n.id)) {
          prev.set(n.id, u);
          queue.push(n.id);
        }
      });
    }
    const path = [];
    for (let v = last; v !== null; v = prev.get(v)) {
      path.push(v);
    }
    return path;
  };
  let best = [];
  const seen = new Set();
  carbons.forEach((c) => {
    if (seen.has(c)) {
      return;
    }
    const first = bfs(c);
    first.forEach((x) => seen.add(x));
    const path = bfs(first[0]);
    if (path.length > best.length) {
      best = path;
    }
  });
  return best;
}

function projOxidation(ctx, id) {
  return projHeavyNeighbors(ctx, id).reduce((sum, n) => sum + (PROJ_HETERO.has(ctx.el.get(n.id)) ? n.order : 0), 0);
}

function projFischerTemplateVolume(order) {
  const pos = { up: [0, 1, -1], down: [0, -1, -1], left: [-1, 0, 1], right: [1, 0, 1] };
  const r = order.map((k) => pos[k]);
  const a = [r[0][0] - r[3][0], r[0][1] - r[3][1], r[0][2] - r[3][2]];
  const b = [r[1][0] - r[3][0], r[1][1] - r[3][1], r[1][2] - r[3][2]];
  const c = [r[2][0] - r[3][0], r[2][1] - r[3][1], r[2][2] - r[3][2]];
  return a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
}

function projPotentialCenter(graph, ctx, id) {
  if (ctx.el.get(id) !== 'C') {
    return false;
  }
  const nbrs = projHeavyNeighbors(ctx, id);
  const hCount = projHydrogens(ctx, id);
  if (nbrs.some((n) => n.order !== 1) || nbrs.length + hCount !== 4 || hCount > 1) {
    return false;
  }
  const neighborIds = nbrs.map((n) => n.id).concat(hCount ? [null] : []);
  return !cipRankSubstituents(graph, id, neighborIds).ties;
}

function fischerProjection(graph, atomIds) {
  const ids = atomIds.filter((id) => graph.getAtom(id));
  const ctx = insightContext(graph, ids);
  if (ctx.cycles.length) {
    return { applicable: false, reason: 'Fischer projections need an acyclic molecule' };
  }
  let chain = projCarbonChain(ctx, ids);
  if (chain.length < 3) {
    return { applicable: false, reason: 'Needs a carbon chain of three or more atoms' };
  }
  const centers = new Map(findStereocenters(graph, ids).map((c) => [c.atomId, c.type]));
  if (!chain.slice(1, -1).some((id) => centers.has(id))) {
    const idSet = new Set(ids);
    const wedged = graph.bonds.some((b) => b.stereo && idSet.has(b.atomA) && idSet.has(b.atomB));
    if (!wedged && ids.some((id) => projPotentialCenter(graph, ctx, id))) {
      return { applicable: false, reason: 'Draw wedge/hash bonds to set the stereocentres' };
    }
    return { applicable: false, reason: 'Needs a stereocentre on the longest carbon chain' };
  }
  const forward = chain.map((id) => projOxidation(ctx, id));
  const backward = forward.slice().reverse();
  let reverse = false;
  for (let k = 0; k < forward.length; k++) {
    if (forward[k] !== backward[k]) {
      reverse = backward[k] > forward[k];
      break;
    }
  }
  if (reverse) {
    chain = chain.slice().reverse();
  }
  const rows = [];
  rows.push({ type: 'end', atomId: chain[0], label: projLabel(ctx, chain[1], chain[0], false, 0) });
  for (let k = 1; k < chain.length - 1; k++) {
    const id = chain[k];
    const up = chain[k - 1];
    const down = chain[k + 1];
    const subs = projHeavyNeighbors(ctx, id).filter((n) => n.id !== up && n.id !== down).map((n) => n.id);
    const hCount = projHydrogens(ctx, id);
    if (!centers.has(id) || subs.length + hCount !== 2) {
      const doubleO = projHeavyNeighbors(ctx, id).find((n) => n.order === 2 && ctx.el.get(n.id) === 'O');
      let label;
      if (doubleO && subs.length === 1) {
        label = 'C=O';
      } else {
        label = `C${hCount ? `H${hCount > 1 ? hCount : ''}` : ''}${subs.map((s) => projLabel(ctx, id, s, false, 0)).join('')}`;
      }
      rows.push({ type: 'group', atomId: id, label });
      continue;
    }
    const s1 = subs[0];
    const s2 = subs.length > 1 ? subs[1] : null;
    const neighborIds = [up, down, s1, s2];
    let leftId = s1;
    let rightId = s2;
    const type = centers.get(id);
    const cip = cipRankSubstituents(graph, id, neighborIds);
    if (!cip.ties) {
      const where = new Map([[up, 'up'], [down, 'down'], [s1, 'left'], [s2, 'right']]);
      const placement = cip.order.map((node) => where.get(node.atomId));
      const templateType = projFischerTemplateVolume(placement) < 0 ? 'R' : 'S';
      if (templateType !== type) {
        leftId = s2;
        rightId = s1;
      }
    } else {
      const actual = tetrahedralVolume(graph, id, neighborIds);
      const template = projFischerTemplateVolume(['up', 'down', 'left', 'right']);
      if (Math.sign(actual) !== Math.sign(template)) {
        leftId = s2;
        rightId = s1;
      }
    }
    rows.push({
      type: 'center',
      atomId: id,
      config: type,
      leftId,
      rightId,
      left: leftId === null ? 'H' : projLabel(ctx, id, leftId, true, 0),
      right: rightId === null ? 'H' : projLabel(ctx, id, rightId, false, 0),
    });
  }
  rows.push({ type: 'end', atomId: chain[chain.length - 1], label: projLabel(ctx, chain[chain.length - 2], chain[chain.length - 1], false, 0) });
  const centerRows = rows.filter((r) => r.type === 'center');
  const amino = rows[0].label === 'COOH' && centerRows.length && centerRows[0] === rows[1] && [centerRows[0].left, centerRows[0].right].some((l) => l === 'NH2' || l === 'H2N');
  const bottom = amino ? centerRows[0] : centerRows[centerRows.length - 1];
  let dl = null;
  if (bottom) {
    if (bottom.right !== 'H' && bottom.left === 'H') {
      dl = 'D';
    } else if (bottom.left !== 'H' && bottom.right === 'H') {
      dl = 'L';
    }
  }
  let meso = false;
  if (centerRows.length >= 2) {
    meso = rows.every((row, k) => {
      const mirror = rows[rows.length - 1 - k];
      if (row.type !== mirror.type) {
        return false;
      }
      if (row.type === 'center') {
        return row.left === mirror.left && row.right === mirror.right && row.config !== mirror.config;
      }
      return row.label === mirror.label;
    });
  }
  return { applicable: true, chain, rows, dl: meso ? null : dl, dlFrom: bottom ? bottom.atomId : null, meso };
}

function haworthProjection(graph, atomIds) {
  const ids = atomIds.filter((id) => graph.getAtom(id));
  const ctx = insightContext(graph, ids);
  const ring = ctx.cycles.find((cycle) => {
    if (cycle.length !== 5 && cycle.length !== 6) {
      return false;
    }
    const els = cycle.map((id) => ctx.el.get(id));
    if (els.filter((e) => e === 'O').length !== 1 || els.filter((e) => e === 'C').length !== cycle.length - 1) {
      return false;
    }
    const carriers = cycle.filter((id) => ctx.el.get(id) === 'C' && projHeavyNeighbors(ctx, id).some((n) => {
      if (cycle.includes(n.id)) {
        return false;
      }
      if (ctx.el.get(n.id) === 'O') {
        return true;
      }
      return ctx.el.get(n.id) === 'C' && projHeavyNeighbors(ctx, n.id).some((m) => m.id !== id && ctx.el.get(m.id) === 'O');
    }));
    return carriers.length >= 4;
  });
  if (!ring) {
    return { applicable: false, reason: 'Needs a pyranose or furanose ring (one O and four or more C bearing OH/CH2OH)' };
  }
  const oIndex = ring.findIndex((id) => ctx.el.get(id) === 'O');
  const n = ring.length;
  const prev = ring[(oIndex + n - 1) % n];
  const next = ring[(oIndex + 1) % n];
  const exoO = (id) => projHeavyNeighbors(ctx, id).some((x) => !ring.includes(x.id) && ctx.el.get(x.id) === 'O');
  let dir = 1;
  if (!exoO(next) && exoO(prev)) {
    dir = -1;
  }
  const ordered = [];
  for (let k = 0; k < n; k++) {
    ordered.push(ring[(oIndex + dir * k + n * 2) % n]);
  }
  const pts = ordered.map((id) => {
    const a = graph.getAtom(id);
    return { x: a.x, y: -a.y };
  });
  let area = 0;
  for (let k = 0; k < n; k++) {
    const p = pts[k];
    const q = pts[(k + 1) % n];
    area += p.x * q.y - q.x * p.y;
  }
  const flip = area > 0;
  const faces = projRingFaces(graph, ctx, ordered);
  const positions = ordered.map((id, k) => {
    const items = faces[k];
    const entry = { atomId: id, element: ctx.el.get(id), role: k === 0 ? 'O' : `C${k}`, up: null, down: null, upId: null, downId: null };
    if (k === 0) {
      return entry;
    }
    items.forEach((item) => {
      let face = item.face;
      if (face && flip) {
        face = face === 'up' ? 'down' : 'up';
      }
      if (!face) {
        return;
      }
      const label = item.hydrogen ? 'H' : projLabel(ctx, id, item.atomId, false, 0);
      if (face === 'up' && entry.up === null) {
        entry.up = label;
        entry.upId = item.atomId;
      } else if (face === 'down' && entry.down === null) {
        entry.down = label;
        entry.downId = item.atomId;
      }
    });
    return entry;
  });
  const last = positions[n - 1];
  const isTerminal = (sid) => sid !== null && sid !== undefined && ctx.el.get(sid) === 'C';
  let dl = null;
  let terminalFace = null;
  if (isTerminal(last.upId)) {
    terminalFace = 'up';
  } else if (isTerminal(last.downId)) {
    terminalFace = 'down';
  }
  if (terminalFace) {
    dl = terminalFace === 'up' ? 'D' : 'L';
  }
  const anomeric = positions[1];
  let anomer = null;
  const anomericFace = anomeric.up && anomeric.up !== 'H' && ctx.el.get(anomeric.upId) === 'O' ? 'up'
    : anomeric.down && anomeric.down !== 'H' && ctx.el.get(anomeric.downId) === 'O' ? 'down' : null;
  const anomericDefined = graph.bondsForAtom(anomeric.atomId).some((b) => b.stereo && b.atomA === anomeric.atomId);
  if (anomericFace && terminalFace && anomericDefined) {
    anomer = anomericFace === terminalFace ? 'β' : 'α';
  }
  const label = [anomer, dl].filter(Boolean).join('-');
  return {
    applicable: true,
    ringSize: n,
    kind: n === 6 ? 'pyranose' : 'furanose',
    positions,
    anomer,
    dl,
    label,
  };
}

function newmanBonds(model) {
  const bonds = rotatableBonds3d(model);
  return bonds.map((b) => {
    const ia = model.atomIds.indexOf(b.atomA);
    const ib = model.atomIds.indexOf(b.atomB);
    return { bondId: b.id, atomA: b.atomA, atomB: b.atomB, label: `${model.atoms[model.index.get(b.atomA)].element}${ia + 1}–${model.atoms[model.index.get(b.atomB)].element}${ib + 1}` };
  });
}

function newmanDefaultBond(model, hoveredBondId) {
  const bonds = newmanBonds(model);
  if (!bonds.length) {
    return null;
  }
  if (hoveredBondId !== null && hoveredBondId !== undefined && bonds.some((b) => b.bondId === hoveredBondId)) {
    return hoveredBondId;
  }
  const ctx = model.ctx;
  const chain = projCarbonChain(ctx, model.atomIds);
  if (chain.length >= 2) {
    const mid = (chain.length - 2) / 2;
    const candidates = [];
    for (let k = 0; k < chain.length - 1; k++) {
      const found = bonds.find((b) => (b.atomA === chain[k] && b.atomB === chain[k + 1]) || (b.atomB === chain[k] && b.atomA === chain[k + 1]));
      if (found) {
        candidates.push({ bond: found, dist: Math.abs(k - mid) });
      }
    }
    candidates.sort((x, y) => x.dist - y.dist);
    if (candidates.length) {
      return candidates[0].bond.bondId;
    }
  }
  const cc = bonds.find((b) => model.atoms[model.index.get(b.atomA)].element === 'C' && model.atoms[model.index.get(b.atomB)].element === 'C');
  return (cc || bonds[0]).bondId;
}

function projSideWeight(model, start, block) {
  return geo3dSide(model, start, block).reduce((sum, i) => sum + (model.atoms[i].element === 'H' ? 1 : 12), 0);
}

function newmanSetup(model, bondId) {
  const bond = model.bonds.find((b) => b.id === bondId);
  if (!bond) {
    return null;
  }
  const j = model.index.get(bond.atomA);
  const k = model.index.get(bond.atomB);
  const nbrs = model.ff.nbrs;
  const front = nbrs[j].filter((x) => x.j !== k).map((x) => x.j);
  const back = nbrs[k].filter((x) => x.j !== j).map((x) => x.j);
  if (!front.length || !back.length) {
    return null;
  }
  const pickRef = (list, block) => list.slice().sort((x, y) => projSideWeight(model, y, block) - projSideWeight(model, x, block) || x - y)[0];
  return { bond, j, k, front, back, fRef: pickRef(front, j), bRef: pickRef(back, k), side: geo3dSide(model, k, j) };
}

function projCopyModel(model) {
  return Object.assign({}, model, { atoms: model.atoms.map((a) => Object.assign({}, a)) });
}

function newmanRotated(model, setup, dihedral, relax) {
  const copy = projCopyModel(model);
  const a = copy.atoms;
  const current = dihedral3d(a[setup.fRef], a[setup.j], a[setup.k], a[setup.bRef]);
  geo3dRotateAbout(copy, setup.j, setup.k, setup.side, ((dihedral - current) * Math.PI) / 180);
  const after = dihedral3d(a[setup.fRef], a[setup.j], a[setup.k], a[setup.bRef]);
  const miss = ((after - dihedral) % 360 + 540) % 360 - 180;
  if (Math.abs(miss) > 1) {
    geo3dRotateAbout(copy, setup.j, setup.k, setup.side, ((-2 * (dihedral - current)) * Math.PI) / 180);
  }
  if (relax !== false) {
    copy.ff = Object.assign({}, model.ff, { holds: [{ i: setup.fRef, j: setup.j, k: setup.k, l: setup.bRef, target: (dihedral * Math.PI) / 180, force: NEWMAN_HOLD }] });
    minimize3d(copy, { maxSteps: NEWMAN_RELAX_STEPS });
    copy.ff = model.ff;
    copy.energy = ff3dEnergy(copy);
  }
  return copy;
}

function newmanConformationName(dihedral) {
  const phi = Math.abs((((dihedral % 360) + 540) % 360) - 180);
  if (phi < 30) {
    return 'syn (eclipsed)';
  }
  if (phi < 90) {
    return 'gauche';
  }
  if (phi < 150) {
    return 'eclipsed';
  }
  return 'anti';
}

function newmanData(model, bondId, dihedral, options) {
  const setup = newmanSetup(model, bondId);
  if (!setup) {
    return null;
  }
  const a0 = model.atoms;
  const current = dihedral3d(a0[setup.fRef], a0[setup.j], a0[setup.k], a0[setup.bRef]);
  const target = dihedral === undefined || dihedral === null ? current : dihedral;
  const rotated = newmanRotated(model, setup, target, !(options && options.relax === false));
  const at = rotated.atoms;
  const J = at[setup.j];
  const K = at[setup.k];
  let ax = K.x - J.x;
  let ay = K.y - J.y;
  let az = K.z - J.z;
  const al = Math.hypot(ax, ay, az) || 1;
  ax /= al;
  ay /= al;
  az /= al;
  const perp = (i, base) => {
    const p = at[i];
    const vx = p.x - base.x;
    const vy = p.y - base.y;
    const vz = p.z - base.z;
    const d = vx * ax + vy * ay + vz * az;
    return { x: vx - d * ax, y: vy - d * ay, z: vz - d * az };
  };
  const up = perp(setup.fRef, J);
  const ul = Math.hypot(up.x, up.y, up.z) || 1;
  const ey = { x: up.x / ul, y: up.y / ul, z: up.z / ul };
  const ex = { x: ey.y * -az - ey.z * -ay, y: ey.z * -ax - ey.x * -az, z: ey.x * -ay - ey.y * -ax };
  const angleOf = (i, base) => {
    const v = perp(i, base);
    const x = v.x * ex.x + v.y * ex.y + v.z * ex.z;
    const y = v.x * ey.x + v.y * ey.y + v.z * ey.z;
    return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
  };
  const graphLabel = (i, from) => {
    const atom = at[i];
    if (atom.element === 'H') {
      return 'H';
    }
    return projLabel(model.ctx, at[from].id, atom.id, false, 0);
  };
  const energy = ff3dEnergy(rotated);
  return {
    bondId,
    frontAtomId: J.id,
    backAtomId: K.id,
    front: setup.front.map((i) => ({ atomId: at[i].id, label: graphLabel(i, setup.j), angle: angleOf(i, J), reference: i === setup.fRef })),
    back: setup.back.map((i) => ({ atomId: at[i].id, label: graphLabel(i, setup.k), angle: angleOf(i, K), reference: i === setup.bRef })),
    dihedral: ((target % 360) + 360) % 360,
    startDihedral: ((current % 360) + 360) % 360,
    energy,
    name: newmanConformationName(target),
    model: rotated,
  };
}

function newmanCurve(model, bondId, step, options) {
  const setup = newmanSetup(model, bondId);
  if (!setup) {
    return null;
  }
  const inc = step || 10;
  const points = [];
  for (let d = 0; d <= 360 + 1e-9; d += inc) {
    points.push({ angle: d, energy: ff3dEnergy(newmanRotated(model, setup, d, !(options && options.relax === false))) });
  }
  const min = Math.min(...points.map((p) => p.energy));
  points.forEach((p) => {
    p.rel = p.energy - min;
  });
  return { points, min };
}
