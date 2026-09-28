const RXS_STEREO_TEXT = {
  racemic: 'racemic (formed with its enantiomer)',
  meso: 'meso (achiral)',
  single: 'single enantiomer',
  diastereomers: 'mixture of diastereomers',
  relative: 'relative configuration shown (achiral)',
};

function rxsHeavy(g, id) {
  return g.bondsForAtom(id).map((b) => (b.atomA === id ? b.atomB : b.atomA));
}

function rxsHCount(g, id) {
  const a = g.getAtom(id);
  return implicitHydrogenCount(a.element, a.charge || 0, g.totalBondOrder(id));
}

function rxsTriple(r) {
  const s = (p, q) => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
  const a = s(r[0], r[3]);
  const b = s(r[1], r[3]);
  const c = s(r[2], r[3]);
  return a.x * (b.y * c.z - b.z * c.y) + a.y * (b.z * c.x - b.x * c.z) + a.z * (b.x * c.y - b.y * c.x);
}

function rxsUnit(v) {
  const n = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return n < 1e-9 ? null : { x: v.x / n, y: v.y / n, z: v.z / n };
}

function rxsTetrahedral(g, id) {
  const heavy = rxsHeavy(g, id);
  const h = rxsHCount(g, id);
  if (heavy.length + h !== 4 || h > 1 || heavy.length < 3 || g.bondsForAtom(id).some((b) => b.order !== 1)) {
    return null;
  }
  return h ? heavy.concat([null]) : heavy;
}

function rxsDrawnVectors(g, center, ids, bond) {
  const c = g.getAtom(center);
  const z = bond.stereo === 'wedge' ? 1 : -1;
  return ids.map((id) => {
    if (id === null) {
      return { x: 0, y: 0, z: -z };
    }
    const a = g.getAtom(id);
    return { x: a.x - c.x, y: -(a.y - c.y), z: id === bond.atomB ? z : 0 };
  });
}

function rxsCapture(g) {
  const specs = [];
  g.atoms.forEach((atom) => {
    const stereo = g.bondsForAtom(atom.id).filter((b) => b.stereo && b.atomA === atom.id);
    const ids = stereo.length === 1 && rxsTetrahedral(g, atom.id);
    if (!ids) {
      return;
    }
    const v = rxsTriple(rxsDrawnVectors(g, atom.id, ids, stereo[0]));
    if (Math.abs(v) > 1e-9) {
      specs.push({ center: atom.id, ids, parity: Math.sign(v), origin: 'input' });
    }
  });
  return specs;
}

function rxsCaptureAlkenes(g) {
  const ids = g.atoms.map((a) => a.id);
  return findStereoDoubleBonds(g, ids).map((r) => {
    const bond = g.bonds.find((b) => b.id === r.bondId);
    const pick = (end, other) => {
      const subs = rxsHeavy(g, end).filter((n) => n !== other);
      while (subs.length < 2) {
        subs.push(null);
      }
      return cipRankSubstituents(g, end, subs).order[0].atomId;
    };
    return { a: bond.atomA, b: bond.atomB, na: pick(bond.atomA, bond.atomB), nb: pick(bond.atomB, bond.atomA), cis: r.type === 'Z' };
  }).filter((s) => s.na !== null && s.nb !== null);
}

function rxsCopy(g, source) {
  g.stereoSpecs = (source.stereoSpecs || []).map((s) => Object.assign({}, s, { ids: s.ids.slice() }));
  g.alkeneSpecs = (source.alkeneSpecs || []).map((s) => Object.assign({}, s));
}

function rxsMergeSpecs(target, source, map) {
  const m = (id) => (id === null ? null : map.get(id));
  (source.stereoSpecs || []).filter((s) => map.has(s.center) && s.ids.every((id) => id === null || map.has(id))).forEach((s) => {
    (target.stereoSpecs = target.stereoSpecs || []).push({ center: map.get(s.center), ids: s.ids.map(m), parity: s.parity, origin: s.origin });
  });
  (source.alkeneSpecs || []).filter((s) => [s.a, s.b, s.na, s.nb].every((id) => id === null || map.has(id))).forEach((s) => {
    (target.alkeneSpecs = target.alkeneSpecs || []).push({ a: map.get(s.a), b: map.get(s.b), na: m(s.na), nb: m(s.nb), cis: s.cis });
  });
}

function rxsSpecAt(g, center) {
  return (g.stereoSpecs || []).find((s) => s.center === center) || null;
}

function rxsDrop(g, center) {
  g.stereoSpecs = (g.stereoSpecs || []).filter((s) => s.center !== center);
}

function rxsReplace(g, center, oldId, newId, invert) {
  const spec = rxsSpecAt(g, center);
  if (spec && spec.ids.includes(oldId)) {
    spec.ids[spec.ids.indexOf(oldId)] = newId;
    if (invert) {
      spec.parity = -spec.parity;
    }
  }
}

function rxsParityFor(spec, order) {
  const perm = order.map((id) => spec.ids.indexOf(id));
  if (perm.some((i) => i < 0)) {
    return 0;
  }
  let sign = 1;
  const seen = perm.slice();
  for (let i = 0; i < seen.length; i++) {
    for (let j = i + 1; j < seen.length; j++) {
      if (seen[i] > seen[j]) {
        sign = -sign;
      }
    }
  }
  return spec.parity * sign;
}

function rxsPlanePoint(atom) {
  return { x: atom.x, y: -atom.y, z: 0 };
}

function rxsCenterFrom(g, center, pos, hz) {
  const ids = rxsTetrahedral(g, center);
  if (!ids) {
    return null;
  }
  const c = pos(center);
  const vec = (id) => {
    const p = pos(id);
    return rxsUnit({ x: p.x - c.x, y: p.y - c.y, z: p.z - c.z });
  };
  const heavy = ids.filter((id) => id !== null).map(vec);
  if (heavy.some((v) => !v)) {
    return null;
  }
  const vectors = heavy.slice();
  if (ids.length > heavy.length) {
    let h = null;
    if (hz) {
      h = { x: 0, y: 0, z: hz };
    } else {
      const flat = heavy.filter((v) => Math.abs(v.z) < 1e-6);
      h = rxsUnit(flat.reduce((s, v) => ({ x: s.x - v.x, y: s.y - v.y, z: 0 }), { x: 0, y: 0, z: 0 }));
    }
    if (!h) {
      return null;
    }
    vectors.push(h);
  }
  const v = rxsTriple(vectors);
  return Math.abs(v) < 1e-6 ? null : { center, ids, parity: Math.sign(v), origin: 'new' };
}

function rxsAddCenters(g, centers, pos, hydrogens) {
  g.stereoSpecs = (g.stereoSpecs || []).filter((s) => !centers.includes(s.center));
  centers.forEach((center) => {
    const spec = rxsCenterFrom(g, center, pos, hydrogens && hydrogens.get(center));
    if (spec) {
      g.stereoSpecs.push(spec);
    }
  });
}

function rxsFaceAdd(g, added, hydrogens) {
  const base = new Map();
  const pos = (id) => base.get(id) || rxsPlanePoint(g.getAtom(id));
  const centers = [];
  added.forEach(([center, id, z]) => {
    if (!centers.includes(center)) {
      centers.push(center);
    }
    const partner = added.find((x) => x[1] === id && x[0] !== center);
    const c = rxsPlanePoint(g.getAtom(center));
    const d = partner ? rxsPlanePoint(g.getAtom(partner[0])) : c;
    const len = partner ? Math.hypot(d.x - c.x, d.y - c.y) : 40;
    base.set(id, { x: (c.x + d.x) / 2, y: (c.y + d.y) / 2, z: z * len });
  });
  (hydrogens || new Map()).forEach((z, center) => {
    if (!centers.includes(center)) {
      centers.push(center);
    }
  });
  rxsAddCenters(g, centers, pos, hydrogens);
}

function rxsAlkene(g, a, b, na, nb, cis) {
  g.alkeneSpecs = (g.alkeneSpecs || []).filter((s) => !((s.a === a && s.b === b) || (s.a === b && s.b === a)));
  g.alkeneSpecs.push({ a, b, na, nb, cis });
}

function rxsEliminationGeometry(g, c, beta, leaving) {
  const sa = rxsSpecAt(g, c);
  const sb = rxsSpecAt(g, beta);
  if (!sa || !sb || !sb.ids.includes(null) || !sa.ids.includes(leaving)) {
    return null;
  }
  const a = sa.ids.filter((id) => id !== leaving && id !== beta);
  const b = sb.ids.filter((id) => id !== null && id !== c);
  if (a.length !== 2 || b.length !== 2) {
    return null;
  }
  const pa = rxsParityFor(sa, [leaving, beta, a[0], a[1]]);
  const pb = rxsParityFor(sb, [null, c, b[0], b[1]]);
  if (!pa || !pb) {
    return null;
  }
  const cis = pa * pb === 1;
  return a[0] === null ? { na: a[1], nb: b[0], cis: !cis } : { na: a[0], nb: b[0], cis };
}

function rxsValid(g, spec) {
  if (!g.getAtom(spec.center)) {
    return false;
  }
  const ids = rxsTetrahedral(g, spec.center);
  if (!ids || ids.length !== spec.ids.length || ids.includes(null) !== spec.ids.includes(null)) {
    return false;
  }
  return ids.every((id) => spec.ids.includes(id));
}

function rxsResolveAlkene(g, spec) {
  const bond = g.getBond(spec.a, spec.b);
  if (!bond || bond.order !== 2) {
    return null;
  }
  const ids = g.connectedComponents().find((c) => c.atomIds.includes(spec.a)).atomIds;
  if (isRingDoubleBond(g, ids, bond)) {
    return null;
  }
  const pick = (end, other, want) => {
    const subs = rxsHeavy(g, end).filter((n) => n !== other);
    if (!subs.length || subs.length > 2 || (want !== null && !subs.includes(want))) {
      return undefined;
    }
    if (want !== null) {
      return want;
    }
    while (subs.length < 2) {
      subs.push(null);
    }
    const ranked = cipRankSubstituents(g, end, subs);
    return ranked.ties ? undefined : ranked.order[0].atomId;
  };
  const na = pick(spec.a, spec.b, spec.na);
  const nb = pick(spec.b, spec.a, spec.nb);
  if (na === undefined || nb === undefined || na === null || nb === null) {
    return null;
  }
  return { a: spec.a, b: spec.b, na, nb, cis: spec.cis };
}

function rxsEnforceAlkene(g, spec) {
  const A = g.getAtom(spec.a);
  const B = g.getAtom(spec.b);
  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const side = (p) => Math.sign(dx * (p.y - A.y) - dy * (p.x - A.x));
  const same = side(g.getAtom(spec.na)) === side(g.getAtom(spec.nb));
  if (same === spec.cis) {
    return;
  }
  const branch = new Set([spec.b]);
  const queue = [spec.b];
  while (queue.length) {
    rxsHeavy(g, queue.shift()).forEach((n) => {
      if (!branch.has(n) && n !== spec.a) {
        branch.add(n);
        queue.push(n);
      }
    });
  }
  branch.delete(spec.b);
  const len = dx * dx + dy * dy;
  branch.forEach((id) => {
    const p = g.getAtom(id);
    const t = ((p.x - A.x) * dx + (p.y - A.y) * dy) / len;
    const fx = A.x + t * dx;
    const fy = A.y + t * dy;
    p.x = 2 * fx - p.x;
    p.y = 2 * fy - p.y;
  });
}

function rxsWedge(g, ids, spec, centers, used) {
  const set = new Set(ids);
  const bonds = g.bondsForAtom(spec.center).filter((b) => !used.has(b.id));
  const other = (b) => (b.atomA === spec.center ? b.atomB : b.atomA);
  const rank = (b) => (isRingDoubleBond(g, ids, b) ? 4 : 0) + (centers.has(other(b)) ? 2 : 0) + (rxsHeavy(g, other(b)).length > 1 ? 1 : 0);
  const choices = bonds.filter((b) => set.has(other(b))).sort((p, q) => rank(p) - rank(q));
  for (const bond of choices) {
    const n = other(bond);
    bond.atomA = spec.center;
    bond.atomB = n;
    bond.stereo = 'wedge';
    const v = rxsTriple(rxsDrawnVectors(g, spec.center, spec.ids, bond));
    if (Math.abs(v) < 1e-9) {
      bond.stereo = null;
      continue;
    }
    if (Math.sign(v) !== spec.parity) {
      bond.stereo = 'hash';
    }
    used.add(bond.id);
    return true;
  }
  return false;
}

function rxsChiralCenters(g, ids) {
  return ids.filter((id) => {
    const n = rxsTetrahedral(g, id);
    if (!n) {
      return false;
    }
    try {
      return !cipRankSubstituents(g, id, n).ties;
    } catch (error) {
      return false;
    }
  });
}

function rxsClasses(g, ids) {
  const set = new Set(ids);
  let label = new Map(ids.map((id) => {
    const a = g.getAtom(id);
    return [id, a.element + ':' + rxsHeavy(g, id).length + ':' + rxsHCount(g, id) + ':' + (a.charge || 0)];
  }));
  let count = new Set(label.values()).size;
  for (let i = 0; i < ids.length; i++) {
    const next = new Map(ids.map((id) => [id, label.get(id) + '|' + g.bondsForAtom(id).filter((b) => set.has(b.atomA) && set.has(b.atomB))
      .map((b) => b.order + label.get(b.atomA === id ? b.atomB : b.atomA)).sort().join(',')]));
    const keys = Array.from(new Set(next.values())).sort();
    label = new Map(ids.map((id) => [id, String(keys.indexOf(next.get(id)))]));
    if (keys.length === count) {
      break;
    }
    count = keys.length;
  }
  return label;
}

function rxsIsMeso(g, ids, centers) {
  if (centers.length < 2) {
    return false;
  }
  const classes = rxsClasses(g, ids);
  const left = centers.slice();
  while (left.length) {
    const c = left.shift();
    const i = left.findIndex((d) => classes.get(d.atomId) === classes.get(c.atomId) && d.type !== c.type);
    if (i < 0) {
      return false;
    }
    left.splice(i, 1);
  }
  return true;
}

function rxsBridgehead(g, id) {
  const heavy = rxsHeavy(g, id);
  return heavy.length === 3 && heavy.every((start) => {
    const seen = new Set([id, start]);
    const stack = [start];
    while (stack.length) {
      const cur = stack.pop();
      for (const n of rxsHeavy(g, cur)) {
        if (n === id && cur !== start) {
          return true;
        }
        if (!seen.has(n)) {
          seen.add(n);
          stack.push(n);
        }
      }
    }
    return false;
  });
}

function rxsSmallRingPair(g, a, b) {
  const na = rxsHeavy(g, a).filter((n) => n !== b);
  const nb = rxsHeavy(g, b).filter((n) => n !== a);
  return na.some((x) => nb.includes(x) || nb.some((y) => rxsHeavy(g, x).includes(y)));
}

function rxsOnlyBridgeheads(g, centers) {
  return centers.length > 0 && centers.every((id) => rxsBridgehead(g, id) &&
    rxsHeavy(g, id).filter((n) => centers.includes(n)).every((n) => rxsSmallRingPair(g, id, n)));
}

function rxsFusedJunction(g, spec, centers) {
  return spec.ids.includes(null) && rxsBridgehead(g, spec.center) &&
    rxsHeavy(g, spec.center).some((n) => centers.has(n) && rxsBridgehead(g, n) && !rxsSmallRingPair(g, spec.center, n));
}

function rxsHydrogenWedge(g, spec, centers) {
  const c = g.getAtom(spec.center);
  const heavy = rxsHeavy(g, spec.center).map((id) => g.getAtom(id));
  const partner = heavy.find((a) => centers.has(a.id));
  let dx = partner ? c.x - partner.x : -heavy.reduce((sum, a) => sum + a.x - c.x, 0);
  let dy = partner ? c.y - partner.y : -heavy.reduce((sum, a) => sum + a.y - c.y, 0);
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) {
    return null;
  }
  const bond = Math.hypot(heavy[0].x - c.x, heavy[0].y - c.y) || 40;
  dx /= length;
  dy /= length;
  const v = rxsTriple(spec.ids.map((id) => {
    if (id === null) {
      return { x: dx, y: -dy, z: 1 };
    }
    const a = g.getAtom(id);
    return { x: a.x - c.x, y: -(a.y - c.y), z: 0 };
  }));
  if (Math.abs(v) < 1e-9) {
    return null;
  }
  return { atom: spec.center, x: c.x + dx * bond * 0.6, y: c.y + dy * bond * 0.6, stereo: Math.sign(v) === spec.parity ? 'wedge' : 'hash' };
}

function rxsRealize(g, ids) {
  const set = new Set(ids);
  let specs = (g.stereoSpecs || []).filter((s) => set.has(s.center) && rxsValid(g, s));
  const input = specs.some((s) => s.origin === 'input');
  const droppedNew = input && specs.some((s) => s.origin === 'new');
  if (input) {
    specs = specs.filter((s) => s.origin === 'input');
  } else if (specs.length === 1 || rxsOnlyBridgeheads(g, specs.map((s) => s.center))) {
    specs = [];
  }
  const alkenes = (g.alkeneSpecs || []).filter((s) => set.has(s.a) && set.has(s.b)).map((s) => rxsResolveAlkene(g, s)).filter(Boolean);
  let fragment = null;
  if (specs.length || alkenes.length || g.keepGeometry) {
    if (!g.keepGeometry) {
      computeLayout(g, ids).forEach((p, id) => {
        const atom = g.getAtom(id);
        atom.x = p.x;
        atom.y = p.y;
      });
    }
    g.bonds.filter((b) => set.has(b.atomA) && set.has(b.atomB)).forEach((b) => {
      b.stereo = null;
    });
    alkenes.forEach((s) => rxsEnforceAlkene(g, s));
    const used = new Set();
    const centers = new Set(specs.map((s) => s.center));
    const hydrogens = [];
    specs.forEach((s) => {
      const h = rxsFusedJunction(g, s, centers) ? rxsHydrogenWedge(g, s, centers) : null;
      if (h) {
        hydrogens.push(h);
      }
      rxsWedge(g, ids, s, centers, used);
    });
    fragment = rxComponentFragment(g, ids);
    if (hydrogens.length) {
      fragment.stereoHydrogens = hydrogens;
    }
  }
  const drawn = specs.length ? findStereocenters(g, ids) : [];
  const chiral = rxsChiralCenters(g, ids);
  const unspecified = drawn.length === 0 && rxsOnlyBridgeheads(g, chiral) ? [] : chiral.filter((id) => !drawn.some((d) => d.atomId === id));
  let kind = '';
  if (drawn.length || unspecified.length) {
    if (input) {
      kind = droppedNew || unspecified.length ? 'diastereomers' : 'single';
    } else if (drawn.length && unspecified.length) {
      kind = 'diastereomers';
    } else if (drawn.length && rxsIsMeso(g, ids, drawn)) {
      kind = 'meso';
    } else {
      kind = 'racemic';
    }
  }
  if (!kind && specs.length) {
    const fused = fragment && fragment.stereoHydrogens && fragment.stereoHydrogens.length === 2 ? fragment.stereoHydrogens : null;
    return { fragment, stereo: { kind: 'relative', text: fused ? (fused[0].stereo === fused[1].stereo ? 'cis' : 'trans') + '-fused rings (achiral)' : RXS_STEREO_TEXT.relative } };
  }
  return { fragment, stereo: kind ? { kind, text: RXS_STEREO_TEXT[kind] } : null };
}

function rxsDielsAlder(g, diene, first, second, ewgAtoms, exo) {
  const [c1, c2, c3, c4] = diene;
  const P = new Map();
  const plane = (id) => rxsPlanePoint(g.getAtom(id));
  const dieneAtoms = new Set();
  const stack = [c1];
  dieneAtoms.add(c1);
  while (stack.length) {
    rxsHeavy(g, stack.pop()).forEach((n) => {
      if (!dieneAtoms.has(n) && n !== first && n !== second) {
        dieneAtoms.add(n);
        stack.push(n);
      }
    });
  }
  dieneAtoms.forEach((id) => P.set(id, plane(id)));
  const p2 = P.get(c2);
  const p3 = P.get(c3);
  const ax = { x: p3.x - p2.x, y: p3.y - p2.y };
  const al = Math.hypot(ax.x, ax.y) || 1;
  const d = { x: ax.x / al, y: ax.y / al };
  const sideOf = (p) => Math.sign(d.x * (p.y - p2.y) - d.y * (p.x - p2.x));
  if (sideOf(P.get(c1)) !== sideOf(P.get(c4))) {
    const branch = new Set([c4]);
    const q = [c4];
    while (q.length) {
      rxsHeavy(g, q.shift()).forEach((n) => {
        if (!branch.has(n) && n !== c3 && n !== second && dieneAtoms.has(n)) {
          branch.add(n);
          q.push(n);
        }
      });
    }
    branch.forEach((id) => {
      const p = P.get(id);
      const t = (p.x - p2.x) * d.x + (p.y - p2.y) * d.y;
      const fx = p2.x + t * d.x;
      const fy = p2.y + t * d.y;
      P.set(id, { x: 2 * fx - p.x, y: 2 * fy - p.y, z: 0 });
    });
  }
  const q1 = plane(first);
  const q2 = plane(second);
  const t1 = P.get(c1);
  const t4 = P.get(c4);
  const h = Math.hypot(t4.x - t1.x, t4.y - t1.y) * 0.6;
  const transform = (s) => {
    const ux = q2.x - q1.x;
    const uy = s * (q2.y - q1.y);
    const vx = t4.x - t1.x;
    const vy = t4.y - t1.y;
    const den = ux * ux + uy * uy || 1;
    const ca = (ux * vx + uy * vy) / den;
    const sa = (ux * vy - uy * vx) / den;
    return (p) => {
      const x = p.x - q1.x;
      const y = s * (p.y - q1.y);
      return { x: t1.x + ca * x - sa * y, y: t1.y + sa * x + ca * y, z: h };
    };
  };
  const mid = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
  const inside = (p) => {
    const ex = t4.x - t1.x;
    const ey = t4.y - t1.y;
    return Math.sign(ex * (p.y - t1.y) - ey * (p.x - t1.x)) === Math.sign(ex * (mid.y - t1.y) - ey * (mid.x - t1.x));
  };
  let map = transform(1);
  const w = ewgAtoms[0];
  if (w !== undefined && inside(map(plane(w))) === Boolean(exo)) {
    map = transform(-1);
  }
  const pos = (id) => P.get(id) || map(plane(id));
  rxsAddCenters(g, [c1, c4, first, second], pos);
}

function rxsBranchSize(g, id, from) {
  const seen = new Set([from, id]);
  const stack = [id];
  while (stack.length && seen.size < 14) {
    rxsHeavy(g, stack.pop()).forEach((n) => {
      if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    });
  }
  return seen.size - 1;
}

function rxsFelkin(g, c, o, nu, anti) {
  const alpha = rxsHeavy(g, c).find((id) => id !== o && id !== nu && rxsSpecAt(g, id) && rxsSpecAt(g, id).ids.includes(c));
  const ids = rxsTetrahedral(g, c);
  if (alpha === undefined || !ids) {
    return null;
  }
  const spec = rxsSpecAt(g, alpha);
  const polar = (id) => id !== null && ['O', 'N', 'S', 'F', 'Cl', 'Br', 'I'].includes(g.getAtom(id).element);
  const size = (id) => (id === null ? -1 : polar(id) ? 1000 : (rxsHeavy(g, id).length - 1) * 10 + rxsBranchSize(g, id, alpha));
  const groups = spec.ids.filter((id) => id !== c).sort((p, q) => size(q) - size(p));
  if (groups.length !== 3 || size(groups[0]) === size(groups[1]) || size(groups[1]) === size(groups[2])) {
    return null;
  }
  const [L, M, S] = groups;
  const around = (deg) => ({ x: -1 / 3, y: 0.943 * Math.cos(deg * Math.PI / 180), z: 0.943 * Math.sin(deg * Math.PI / 180) });
  const model = Math.sign(rxsTriple([{ x: 1, y: 0, z: 0 }, around(90), around(330), around(210)]));
  const mirror = rxsParityFor(spec, [c, L, M, S]) === model ? 1 : -1;
  const vec = (id) => {
    if (id === alpha) {
      return { x: -1, y: 0, z: 0 };
    }
    if (id === o) {
      return { x: 0.5, y: 0.866, z: 0 };
    }
    if (id === nu) {
      return { x: -0.15, y: -0.26, z: (anti ? 0.95 : -0.95) * mirror };
    }
    return { x: 0.5, y: -0.866, z: 0 };
  };
  const parity = Math.sign(rxsTriple(ids.map(vec)));
  g.stereoSpecs = g.stereoSpecs.filter((x) => x.center !== c);
  g.stereoSpecs.push({ center: c, ids, parity, origin: 'input' });
  return { alpha, L, M, S, polar: polar(L) };
}

