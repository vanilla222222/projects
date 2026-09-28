const LAYOUT_SETTINGS = {
  bondLength: 50,
  componentGap: 75,
  crowdDistance: 0.8,
};

function layoutAdjacency(graph, atomIds) {
  const idSet = new Set(atomIds);
  const adj = new Map(atomIds.map((id) => [id, []]));
  graph.bonds.forEach((bond) => {
    if (idSet.has(bond.atomA) && idSet.has(bond.atomB)) {
      adj.get(bond.atomA).push({ id: bond.atomB, order: bond.order });
      adj.get(bond.atomB).push({ id: bond.atomA, order: bond.order });
    }
  });
  return adj;
}

function layoutComponents(adj, atomIds) {
  const seen = new Set();
  const components = [];
  atomIds.forEach((start) => {
    if (seen.has(start)) {
      return;
    }
    const comp = [];
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const v = stack.pop();
      comp.push(v);
      adj.get(v).forEach((n) => {
        if (!seen.has(n.id)) {
          seen.add(n.id);
          stack.push(n.id);
        }
      });
    }
    components.push(comp);
  });
  return components;
}

function layoutFindRings(adj, atomIds) {
  const edgeKey = (a, b) => (a < b ? a + ':' + b : b + ':' + a);
  const edges = [];
  const edgeIndex = new Map();
  atomIds.forEach((a) => {
    adj.get(a).forEach((n) => {
      if (a < n.id) {
        edgeIndex.set(edgeKey(a, n.id), edges.length);
        edges.push([a, n.id]);
      }
    });
  });
  const components = layoutComponents(adj, atomIds).length;
  const cyclomatic = edges.length - atomIds.length + components;
  if (cyclomatic <= 0) {
    return [];
  }
  const candidates = [];
  const seen = new Set();
  edges.forEach(([a, b]) => {
    const prev = new Map([[a, null]]);
    const queue = [a];
    let found = false;
    while (queue.length && !found) {
      const cur = queue.shift();
      for (const n of adj.get(cur)) {
        if ((cur === a && n.id === b) || prev.has(n.id)) {
          continue;
        }
        prev.set(n.id, cur);
        if (n.id === b) {
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
    for (let at = b; at !== null; at = prev.get(at)) {
      cycle.push(at);
    }
    const sig = cycle.slice().sort((x, y) => x - y).join(',');
    if (!seen.has(sig)) {
      seen.add(sig);
      candidates.push(cycle);
    }
  });
  candidates.sort((x, y) => x.length - y.length);
  const basis = [];
  const rings = [];
  const toVector = (cycle) => {
    const v = new Set();
    cycle.forEach((id, i) => v.add(edgeIndex.get(edgeKey(id, cycle[(i + 1) % cycle.length]))));
    return v;
  };
  const reduce = (vector) => {
    let v = new Set(vector);
    basis.forEach((row) => {
      if (v.has(row.pivot)) {
        const next = new Set(v);
        row.vector.forEach((e) => (next.has(e) ? next.delete(e) : next.add(e)));
        v = next;
      }
    });
    return v;
  };
  for (const cycle of candidates) {
    if (rings.length >= cyclomatic) {
      break;
    }
    const reduced = reduce(toVector(cycle));
    if (reduced.size === 0) {
      continue;
    }
    const pivot = Math.min(...reduced);
    basis.forEach((row) => {
      if (row.vector.has(pivot)) {
        reduced.forEach((e) => (row.vector.has(e) ? row.vector.delete(e) : row.vector.add(e)));
      }
    });
    basis.push({ pivot, vector: reduced });
    rings.push(cycle);
  }
  return rings;
}

function layoutRingSystems(rings) {
  const parent = rings.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < rings.length; i++) {
    for (let j = i + 1; j < rings.length; j++) {
      if (rings[i].some((id) => rings[j].includes(id))) {
        parent[find(i)] = find(j);
      }
    }
  }
  const groups = new Map();
  rings.forEach((ring, i) => {
    const root = find(i);
    if (!groups.has(root)) {
      groups.set(root, []);
    }
    groups.get(root).push(ring);
  });
  return Array.from(groups.values()).map((systemRings) => {
    const atoms = new Set();
    systemRings.forEach((ring) => ring.forEach((id) => atoms.add(id)));
    return { rings: systemRings, atoms };
  });
}

function layoutArc(from, to, count, away, L) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.max(1e-6, Math.hypot(dx, dy));
  const steps = count + 1;
  const ratio = d / L;
  let theta;
  if (ratio >= steps) {
    theta = 1e-3;
  } else {
    let lo = 1e-6;
    let hi = (2 * Math.PI) / steps;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      const value = Math.sin((steps * mid) / 2) / Math.sin(mid / 2);
      if (value > ratio) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    theta = (lo + hi) / 2;
  }
  const R = L / (2 * Math.sin(theta / 2));
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  let nx = -dy / d;
  let ny = dx / d;
  if (nx * away.x + ny * away.y < 0) {
    nx = -nx;
    ny = -ny;
  }
  const offset = R * Math.cos((steps * theta) / 2);
  const cx = mx - nx * offset;
  const cy = my - ny * offset;
  const start = Math.atan2(from.y - cy, from.x - cx);
  const candidates = [1, -1].map((sign) => {
    const points = [];
    for (let i = 1; i <= count; i++) {
      const angle = start + sign * theta * i;
      points.push({ x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) });
    }
    const midAngle = start + (sign * theta * steps) / 2;
    const bulge = (Math.cos(midAngle) * R + cx - mx) * nx + (Math.sin(midAngle) * R + cy - my) * ny;
    return { points, bulge };
  });
  candidates.sort((a, b) => b.bulge - a.bulge);
  return candidates[0].points;
}

function layoutSegmentsCross(p1, p2, p3, p4) {
  const side = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  return side(p1, p2, p3) * side(p1, p2, p4) < 0 && side(p3, p4, p1) * side(p3, p4, p2) < 0;
}

function layoutBestRun(pos, adj, system, anchorA, anchorB, runIds, away, L) {
  const count = runIds.length;
  const a = pos.get(anchorA);
  const b = pos.get(anchorB);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.max(1e-6, Math.hypot(dx, dy));
  const nx = -dy / d;
  const ny = dx / d;
  const candidates = [
    layoutArc(a, b, count, away, L),
    layoutArc(a, b, count, { x: -away.x, y: -away.y }, L),
  ];
  [0.3, 0.6, 0.9, 1.2].forEach((height) => {
    [1, -1].forEach((sign) => {
      const h = height * L;
      const radius = (h * h + (d / 2) * (d / 2)) / (2 * h);
      const cx = (a.x + b.x) / 2 - sign * nx * (radius - h);
      const cy = (a.y + b.y) / 2 - sign * ny * (radius - h);
      const startAngle = Math.atan2(a.y - cy, a.x - cx);
      let sweep = Math.atan2(b.y - cy, b.x - cx) - startAngle;
      const midAngle = Math.atan2((a.y + b.y) / 2 + sign * ny * h - cy, (a.x + b.x) / 2 + sign * nx * h - cx);
      let toMid = midAngle - startAngle;
      if (toMid < 0) {
        toMid += Math.PI * 2;
      }
      if (sweep < 0) {
        sweep += Math.PI * 2;
      }
      if (toMid > sweep) {
        sweep -= Math.PI * 2;
      }
      const points = [];
      for (let i = 1; i <= count; i++) {
        const angle = startAngle + (sweep * i) / (count + 1);
        points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
      }
      candidates.push(points);
    });
  });
  const placedBonds = [];
  pos.forEach((p, id) => {
    adj.get(id).forEach((nb) => {
      if (id < nb.id && pos.has(nb.id) && system.atoms.has(nb.id)) {
        placedBonds.push([p, pos.get(nb.id)]);
      }
    });
  });
  const limit = L * LAYOUT_SETTINGS.crowdDistance;
  const ignore = new Set([anchorA, anchorB]);
  const branchCount = (i) => adj.get(runIds[i]).filter((nb) => !system.atoms.has(nb.id)).length;
  const score = (points) => {
    let total = 0;
    points.forEach((p, i) => {
      total += layoutCrowding(pos, p, ignore, L) * 4;
      const branches = branchCount(i);
      if (branches > 0) {
        pos.forEach((q) => {
          const gap = Math.hypot(p.x - q.x, p.y - q.y);
          if (gap < L * 1.3) {
            total += (L * 1.3 - gap) * branches * 0.5;
          }
        });
      }
      for (let j = i + 2; j < points.length; j++) {
        const q = points[j];
        const gap = Math.hypot(p.x - q.x, p.y - q.y);
        if (gap < limit) {
          total += (limit - gap) * 4;
        }
      }
    });
    const chain = [a].concat(points, [b]);
    for (let i = 0; i + 1 < chain.length; i++) {
      const p = chain[i];
      const q = chain[i + 1];
      total += Math.abs(Math.hypot(p.x - q.x, p.y - q.y) - L);
      placedBonds.forEach(([u, v]) => {
        if (layoutSegmentsCross(p, q, u, v)) {
          total += L * 3;
        }
      });
    }
    return total;
  };
  let best = candidates[0];
  let bestScore = score(best) - 1e-6;
  candidates.slice(1).forEach((points) => {
    const s = score(points);
    if (s < bestScore) {
      best = points;
      bestScore = s;
    }
  });
  return best;
}

function layoutSystemQuality(ids, bonds, pos, L) {
  const limit = L * LAYOUT_SETTINGS.crowdDistance;
  const bonded = new Set(bonds.map(([u, v]) => u + ',' + v));
  let score = 0;
  bonds.forEach(([u, v]) => {
    const p = pos.get(u);
    const q = pos.get(v);
    const dev = (Math.hypot(p.x - q.x, p.y - q.y) - L) / L;
    score += dev * dev * 10;
  });
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (bonded.has(ids[i] + ',' + ids[j]) || bonded.has(ids[j] + ',' + ids[i])) {
        continue;
      }
      const p = pos.get(ids[i]);
      const q = pos.get(ids[j]);
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d < limit) {
        score += ((limit - d) / L) * ((limit - d) / L) * 10;
      }
    }
  }
  for (let i = 0; i < bonds.length; i++) {
    for (let j = i + 1; j < bonds.length; j++) {
      const [a, b] = bonds[i];
      const [c, e] = bonds[j];
      if (a === c || a === e || b === c || b === e) {
        continue;
      }
      if (layoutSegmentsCross(pos.get(a), pos.get(b), pos.get(c), pos.get(e))) {
        score += 1;
      }
    }
  }
  return score;
}

function layoutRefineSystem(system, adj, pos, L, evaluate) {
  const ids = Array.from(system.atoms);
  const bonds = [];
  ids.forEach((id) => {
    adj.get(id).forEach((nb) => {
      if (id < nb.id && system.atoms.has(nb.id)) {
        bonds.push([id, nb.id]);
      }
    });
  });
  const measure = evaluate || ((p) => layoutSystemQuality(ids, bonds, p, L));
  const before = measure(pos);
  if (before < 0.05) {
    return pos;
  }
  const neighbors = ids.map((id) => adj.get(id).filter((nb) => system.atoms.has(nb.id)).map((nb) => ids.indexOf(nb.id)));
  const xs = ids.map((id) => pos.get(id).x);
  const ys = ids.map((id) => pos.get(id).y);
  ids.forEach((id, i) => {
    const count = adj.get(id).filter((nb) => !system.atoms.has(nb.id)).length;
    const inner = neighbors[i].map((j) => ({ x: xs[j], y: ys[j] }));
    layoutStubPoints({ x: xs[i], y: ys[i] }, inner, count, L).forEach((stub) => {
      neighbors.push([i]);
      neighbors[i].push(neighbors.length - 1);
      xs.push(stub.x);
      ys.push(stub.y);
    });
  });
  const n = xs.length;
  const hops = xs.map((_, start) => {
    const dist = new Array(n).fill(Infinity);
    dist[start] = 0;
    const queue = [start];
    while (queue.length > 0) {
      const cur = queue.shift();
      neighbors[cur].forEach((nb) => {
        if (dist[nb] === Infinity) {
          dist[nb] = dist[cur] + 1;
          queue.push(nb);
        }
      });
    }
    return dist;
  });
  const target = (k) => (k === 1 ? L : k === 2 ? L * Math.sqrt(3) : L * (0.8 * k + 0.2));
  for (let iter = 0; iter < 300; iter++) {
    for (let i = 0; i < n; i++) {
      let sx = 0;
      let sy = 0;
      let sw = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) {
          continue;
        }
        const t = target(hops[i][j]);
        const w = 1 / (t * t);
        const dx = xs[i] - xs[j];
        const dy = ys[i] - ys[j];
        const d = Math.hypot(dx, dy) || 1e-3;
        sx += w * (xs[j] + (t * dx) / d);
        sy += w * (ys[j] + (t * dy) / d);
        sw += w;
      }
      xs[i] = sx / sw;
      ys[i] = sy / sw;
    }
  }
  const refined = new Map();
  ids.forEach((id, i) => refined.set(id, { x: xs[i], y: ys[i] }));
  const after = measure(refined);
  return after < before ? refined : pos;
}

function layoutStubPoints(p, inner, count, L) {
  let dx = 0;
  let dy = 0;
  inner.forEach((q) => {
    const d = Math.hypot(p.x - q.x, p.y - q.y) || 1;
    dx += (p.x - q.x) / d;
    dy += (p.y - q.y) / d;
  });
  const base = Math.hypot(dx, dy) < 1e-3 ? 0 : Math.atan2(dy, dx);
  const points = [];
  for (let j = 0; j < count; j++) {
    const angle = base + (j - (count - 1) / 2) * (Math.PI * 0.4);
    points.push({ x: p.x + Math.cos(angle) * L, y: p.y + Math.sin(angle) * L });
  }
  return points;
}

function layoutSubstituentRoom(system, adj, pos, L) {
  const limit = L * LAYOUT_SETTINGS.crowdDistance;
  let score = 0;
  system.atoms.forEach((id) => {
    const branches = adj.get(id).filter((nb) => !system.atoms.has(nb.id)).length;
    if (branches === 0) {
      return;
    }
    const inner = adj.get(id).filter((nb) => system.atoms.has(nb.id)).map((nb) => pos.get(nb.id));
    layoutStubPoints(pos.get(id), inner, branches, L).forEach((probe) => {
      system.atoms.forEach((other) => {
        if (other === id) {
          return;
        }
        const q = pos.get(other);
        const d = Math.hypot(probe.x - q.x, probe.y - q.y);
        if (d < limit) {
          score += ((limit - d) / L) * 10;
        }
      });
    });
  });
  return score;
}

function layoutRingSystem(system, adj, L) {
  const rings = system.rings.slice();
  const shared = (ring) => rings.reduce((s, other) => s + (other === ring ? 0 : ring.filter((id) => other.includes(id)).length), 0);
  rings.sort((a, b) => shared(b) - shared(a) || b.length - a.length);
  const ids = Array.from(system.atoms);
  const bonds = [];
  ids.forEach((id) => {
    adj.get(id).forEach((nb) => {
      if (id < nb.id && system.atoms.has(nb.id)) {
        bonds.push([id, nb.id]);
      }
    });
  });
  const evaluate = (pos) => layoutSystemQuality(ids, bonds, pos, L) + layoutSubstituentRoom(system, adj, pos, L);
  let best = layoutRefineSystem(system, adj, layoutRingSystemFrom(system, adj, L, rings), L, evaluate);
  let bestScore = evaluate(best);
  if (bestScore < 0.05 || rings.length < 2) {
    return best;
  }
  for (let k = 1; k < rings.length; k++) {
    const order = [rings[k]].concat(rings.filter((_, i) => i !== k));
    const pos = layoutRefineSystem(system, adj, layoutRingSystemFrom(system, adj, L, order), L, evaluate);
    const s = evaluate(pos);
    if (s < bestScore - 1e-6) {
      best = pos;
      bestScore = s;
    }
  }
  return best;
}

function layoutRingSystemFrom(system, adj, L, ringOrder) {
  const pos = new Map();
  const rings = ringOrder.slice();
  const first = rings.shift();
  const R = L / (2 * Math.sin(Math.PI / first.length));
  first.forEach((id, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / first.length;
    pos.set(id, { x: R * Math.cos(angle), y: R * Math.sin(angle) });
  });
  while (rings.length) {
    const priority = (ring) => {
      const placed = ring.filter((id) => pos.has(id)).length;
      return placed >= 2 ? placed : placed === 1 ? 1000 : 2000;
    };
    rings.sort((a, b) => priority(a) - priority(b));
    const ring = rings.shift();
    const placedCount = ring.filter((id) => pos.has(id)).length;
    if (placedCount === ring.length) {
      continue;
    }
    if (placedCount === 0) {
      rings.push(ring);
      continue;
    }
    if (placedCount === 1) {
      const pivotId = ring.find((id) => pos.has(id));
      const pivot = pos.get(pivotId);
      const placedNbrs = adj.get(pivotId).filter((n) => pos.has(n.id)).map((n) => pos.get(n.id));
      let dx = 0;
      let dy = 0;
      placedNbrs.forEach((p) => {
        dx += pivot.x - p.x;
        dy += pivot.y - p.y;
      });
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const r = L / (2 * Math.sin(Math.PI / ring.length));
      const cx = pivot.x + ux * r;
      const cy = pivot.y + uy * r;
      const k = ring.indexOf(pivotId);
      const base = Math.atan2(pivot.y - cy, pivot.x - cx);
      ring.forEach((id, i) => {
        if (id === pivotId) {
          return;
        }
        const angle = base + (2 * Math.PI * ((i - k + ring.length) % ring.length)) / ring.length;
        pos.set(id, { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
      });
      continue;
    }
    const n = ring.length;
    const start = ring.findIndex((id, i) => pos.has(id) && !pos.has(ring[(i + 1) % n]));
    let i = start;
    let guard = 0;
    while (guard++ < n) {
      const anchorA = ring[i];
      const run = [];
      let j = (i + 1) % n;
      while (!pos.has(ring[j])) {
        run.push(ring[j]);
        j = (j + 1) % n;
      }
      if (run.length) {
        const anchorB = ring[j];
        const a = pos.get(anchorA);
        const b = pos.get(anchorB);
        const others = [];
        [anchorA, anchorB].forEach((anchor) => {
          adj.get(anchor).forEach((nb) => {
            if (pos.has(nb.id) && nb.id !== anchorA && nb.id !== anchorB && system.atoms.has(nb.id)) {
              others.push(pos.get(nb.id));
            }
          });
        });
        if (others.length === 0) {
          pos.forEach((p) => others.push(p));
        }
        const ox = others.reduce((s, p) => s + p.x, 0) / others.length;
        const oy = others.reduce((s, p) => s + p.y, 0) / others.length;
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const points = layoutBestRun(pos, adj, system, anchorA, anchorB, run, { x: mx - ox, y: my - oy }, L);
        run.forEach((id, index) => pos.set(id, points[index]));
      }
      i = j;
      if (i === start) {
        break;
      }
    }
  }
  return pos;
}

function layoutIsLinear(adj, id) {
  const n = adj.get(id);
  return n.length === 2 && (n.some((x) => x.order === 3) || n.every((x) => x.order === 2));
}

function layoutCrowding(pos, point, ignore, L) {
  let score = 0;
  const limit = L * LAYOUT_SETTINGS.crowdDistance;
  pos.forEach((p, id) => {
    if (ignore.has(id)) {
      return;
    }
    const d = Math.hypot(p.x - point.x, p.y - point.y);
    if (d < limit) {
      score += limit - d;
    }
  });
  return score;
}

function layoutOverlapScore(pos, adj, L) {
  const limit = L * LAYOUT_SETTINGS.crowdDistance;
  const entries = Array.from(pos.entries());
  let score = 0;
  for (let i = 0; i < entries.length; i++) {
    const [ida, a] = entries[i];
    for (let j = i + 1; j < entries.length; j++) {
      const [idb, b] = entries[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < limit && !adj.get(ida).some((n) => n.id === idb)) {
        score += (limit - d) * (limit - d);
      }
    }
  }
  return score;
}

function layoutSide(adj, keepId, sideId) {
  const side = new Set([sideId]);
  const stack = [sideId];
  while (stack.length) {
    const v = stack.pop();
    for (const n of adj.get(v)) {
      if (v === sideId && n.id === keepId) {
        continue;
      }
      if (n.id === keepId) {
        return null;
      }
      if (!side.has(n.id)) {
        side.add(n.id);
        stack.push(n.id);
      }
    }
  }
  return side;
}

function layoutReflect(pos, side, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const out = new Map(pos);
  side.forEach((id) => {
    const p = pos.get(id);
    const t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    const fx = a.x + dx * t;
    const fy = a.y + dy * t;
    out.set(id, { x: 2 * fx - p.x, y: 2 * fy - p.y });
  });
  return out;
}

function layoutRotate(pos, side, center, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const out = new Map(pos);
  side.forEach((id) => {
    const p = pos.get(id);
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    out.set(id, { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos });
  });
  return out;
}

function layoutRelieve(adj, comp, pos, ringBondKeys, L) {
  const key = (a, b) => (a < b ? a + ':' + b : b + ':' + a);
  const flips = [];
  comp.forEach((u) => {
    adj.get(u).forEach((n) => {
      if (u < n.id && n.order === 1 && !ringBondKeys.has(key(u, n.id))) {
        [[u, n.id], [n.id, u]].forEach(([keep, sideId]) => {
          const side = layoutSide(adj, keep, sideId);
          if (side && side.size > 1 && side.size <= comp.length / 2 + 1) {
            flips.push({ keep, sideId, side });
          }
        });
      }
    });
  });
  let current = pos;
  let score = layoutOverlapScore(current, adj, L);
  for (let round = 0; round < 12 && score > 1e-6; round++) {
    let best = null;
    const consider = (candidate) => {
      const s = layoutOverlapScore(candidate, adj, L);
      if (s < score - 1e-6 && (!best || s < best.score)) {
        best = { pos: candidate, score: s };
      }
    };
    flips.forEach((flip) => consider(layoutReflect(current, flip.side, current.get(flip.keep), current.get(flip.sideId))));
    if (!best) {
      flips.filter((flip) => adj.get(flip.keep).length >= 4).forEach((flip) => {
        [-0.61, -0.35, 0.35, 0.61].forEach((angle) => consider(layoutRotate(current, flip.side, current.get(flip.keep), angle)));
      });
    }
    if (!best) {
      break;
    }
    current = best.pos;
    score = best.score;
  }
  return current;
}

function layoutComponent(adj, comp, systems, L) {
  const pos = new Map();
  const turn = new Map();
  const systemOf = new Map();
  systems.forEach((system) => system.atoms.forEach((id) => systemOf.set(id, system)));
  const compSet = new Set(comp);
  const compSystems = systems.filter((s) => compSet.has(s.atoms.values().next().value));
  const localLayouts = new Map();
  compSystems.forEach((system) => localLayouts.set(system, layoutRingSystem(system, adj, L)));
  const queue = [];
  if (compSystems.length) {
    const biggest = compSystems.slice().sort((a, b) => b.atoms.size - a.atoms.size)[0];
    localLayouts.get(biggest).forEach((p, id) => pos.set(id, { x: p.x, y: p.y }));
    biggest.atoms.forEach((id) => queue.push(id));
  } else {
    const start = comp.slice().sort((a, b) => adj.get(a).length - adj.get(b).length || a - b)[0];
    pos.set(start, { x: 0, y: 0 });
    turn.set(start, 1);
    queue.push(start);
  }
  const placeSystem = (system, entryId, from, dir) => {
    const local = localLayouts.get(system);
    const entry = local.get(entryId);
    let cx = 0;
    let cy = 0;
    local.forEach((p) => {
      cx += p.x;
      cy += p.y;
    });
    cx /= local.size;
    cy /= local.size;
    let vx = cx - entry.x;
    let vy = cy - entry.y;
    if (Math.hypot(vx, vy) < 1e-6) {
      vx = 1;
      vy = 0;
    }
    const target = { x: from.x + dir.x * L, y: from.y + dir.y * L };
    const best = [1, -1].map((mirror) => {
      const angle = Math.atan2(dir.y, dir.x) - Math.atan2(vy * mirror, vx);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const placed = new Map();
      local.forEach((p, id) => {
        const lx = p.x - entry.x;
        const ly = (p.y - entry.y) * mirror;
        placed.set(id, { x: target.x + lx * cos - ly * sin, y: target.y + lx * sin + ly * cos });
      });
      let score = 0;
      placed.forEach((p) => {
        score += layoutCrowding(pos, p, new Set(), L);
      });
      return { placed, score };
    }).sort((a, b) => a.score - b.score)[0];
    best.placed.forEach((p, id) => {
      pos.set(id, p);
      queue.push(id);
    });
  };
  while (queue.length) {
    const u = queue.shift();
    const up = pos.get(u);
    const pending = adj.get(u).filter((n) => !pos.has(n.id)).map((n) => n.id);
    if (pending.length === 0) {
      continue;
    }
    const placedDirs = adj.get(u)
      .filter((n) => pos.has(n.id))
      .map((n) => Math.atan2(pos.get(n.id).y - up.y, pos.get(n.id).x - up.x));
    const angles = [];
    if (placedDirs.length === 0) {
      const step = (2 * Math.PI) / pending.length;
      pending.forEach((_, i) => angles.push(-Math.PI / 6 + step * i));
    } else if (placedDirs.length === 1 && !systemOf.has(u)) {
      const incoming = placedDirs[0] + Math.PI;
      const k = pending.length;
      if (k === 1) {
        if (layoutIsLinear(adj, u)) {
          angles.push(incoming);
        } else {
          const sign = -(turn.get(u) || 1);
          const options = [sign, -sign].map((s) => {
            const angle = incoming + (s * Math.PI) / 3;
            const point = { x: up.x + Math.cos(angle) * L, y: up.y + Math.sin(angle) * L };
            return { angle, s, score: layoutCrowding(pos, point, new Set([u]), L) };
          });
          const pick = options[1].score + 1e-6 < options[0].score ? options[1] : options[0];
          angles.push(pick.angle);
        }
      } else if (k === 2) {
        angles.push(incoming - Math.PI / 3, incoming + Math.PI / 3);
      } else {
        const spread = (2 * Math.PI) / (k + 1);
        for (let i = 0; i < k; i++) {
          angles.push(placedDirs[0] + spread * (i + 1));
        }
      }
    } else {
      const sorted = placedDirs.map((a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).sort((a, b) => a - b);
      let bestGap = -1;
      let gapStart = 0;
      let bestScore = Infinity;
      const gaps = sorted.map((a, i) => ({ start: a, size: (i === sorted.length - 1 ? sorted[0] + 2 * Math.PI : sorted[i + 1]) - a }));
      const widest = Math.max(...gaps.map((g) => g.size));
      gaps.forEach((gap) => {
        let score = (widest - gap.size) * L * 0.1;
        for (let i = 0; i < pending.length; i++) {
          const angle = gap.start + (gap.size * (i + 1)) / (pending.length + 1);
          score += layoutCrowding(pos, { x: up.x + Math.cos(angle) * L, y: up.y + Math.sin(angle) * L }, new Set([u]), L);
        }
        if (score < bestScore - 1e-6) {
          bestScore = score;
          bestGap = gap.size;
          gapStart = gap.start;
        }
      });
      if (sorted.length === 1) {
        bestGap = 2 * Math.PI;
      }
      pending.forEach((_, i) => angles.push(gapStart + (bestGap * (i + 1)) / (pending.length + 1)));
    }
    pending.forEach((v, i) => {
      if (pos.has(v)) {
        return;
      }
      const angle = angles[i];
      const dir = { x: Math.cos(angle), y: Math.sin(angle) };
      const system = systemOf.get(v);
      if (system) {
        placeSystem(system, v, up, dir);
        return;
      }
      pos.set(v, { x: up.x + dir.x * L, y: up.y + dir.y * L });
      const cross = placedDirs.length ? Math.sin(angle - placedDirs[0] - Math.PI) : Math.sin(angle);
      turn.set(v, cross >= 0 ? 1 : -1);
      queue.push(v);
    });
  }
  const ringBondKeys = new Set();
  systems.forEach((system) => system.rings.forEach((ring) => ring.forEach((id, i) => {
    const next = ring[(i + 1) % ring.length];
    ringBondKeys.add(id < next ? id + ':' + next : next + ':' + id);
  })));
  return layoutRelieve(adj, comp, pos, ringBondKeys, L);
}

function computeLayout(graph, atomIds, options) {
  const L = (options && options.bondLength) || LAYOUT_SETTINGS.bondLength;
  const adj = layoutAdjacency(graph, atomIds);
  const rings = layoutFindRings(adj, atomIds);
  const systems = layoutRingSystems(rings);
  const components = layoutComponents(adj, atomIds);
  const result = new Map();
  let cursor = 0;
  const placed = components.map((comp) => {
    const pos = layoutComponent(adj, comp, systems, L);
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    pos.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    return { pos, minX, maxX, minY, maxY };
  });
  placed.forEach((entry) => {
    const dx = cursor - entry.minX;
    const dy = -(entry.minY + entry.maxY) / 2;
    entry.pos.forEach((p, id) => result.set(id, { x: p.x + dx, y: p.y + dy }));
    cursor += entry.maxX - entry.minX + LAYOUT_SETTINGS.componentGap;
  });
  const width = cursor - LAYOUT_SETTINGS.componentGap;
  result.forEach((p) => {
    p.x -= width / 2;
  });
  return result;
}

function layoutSideOf(graph, keepId, sideId) {
  const side = new Set([sideId]);
  const stack = [sideId];
  while (stack.length) {
    const v = stack.pop();
    graph.bondsForAtom(v).forEach((bond) => {
      const w = bond.atomA === v ? bond.atomB : bond.atomA;
      if (w === keepId && v === sideId) {
        return;
      }
      if (!side.has(w)) {
        side.add(w);
        stack.push(w);
      }
    });
  }
  return side.has(keepId) ? null : side;
}

function layoutDoubleBondRefs(graph, bond) {
  const refA = graph.bondsForAtom(bond.atomA).filter((b) => b !== bond).map((b) => (b.atomA === bond.atomA ? b.atomB : b.atomA));
  const refB = graph.bondsForAtom(bond.atomB).filter((b) => b !== bond).map((b) => (b.atomA === bond.atomB ? b.atomB : b.atomA));
  return { refA, refB };
}

function layoutSameSide(graph, atomBId, atomCId, refA, refB) {
  const b = graph.getAtom(atomBId);
  const c = graph.getAtom(atomCId);
  const x = graph.getAtom(refA);
  const y = graph.getAtom(refB);
  const cross = (p) => (c.x - b.x) * (p.y - b.y) - (c.y - b.y) * (p.x - b.x);
  const s1 = cross(x);
  const s2 = cross(y);
  if (Math.abs(s1) < 1e-6 || Math.abs(s2) < 1e-6) {
    return null;
  }
  return Math.sign(s1) === Math.sign(s2);
}

function layoutToggleStereo(bond) {
  if (bond.stereo === 'wedge') {
    bond.stereo = 'hash';
  } else if (bond.stereo === 'hash') {
    bond.stereo = 'wedge';
  }
}

function enforceDoubleBondGeometry(graph, bond, refA, refB, wantSame) {
  const same = layoutSameSide(graph, bond.atomA, bond.atomB, refA, refB);
  if (same === null || same === wantSame) {
    return false;
  }
  const side = layoutSideOf(graph, bond.atomA, bond.atomB);
  if (!side) {
    return false;
  }
  const b = graph.getAtom(bond.atomA);
  const c = graph.getAtom(bond.atomB);
  const dx = c.x - b.x;
  const dy = c.y - b.y;
  const len2 = dx * dx + dy * dy;
  side.forEach((id) => {
    const p = graph.getAtom(id);
    const t = ((p.x - b.x) * dx + (p.y - b.y) * dy) / len2;
    const fx = b.x + dx * t;
    const fy = b.y + dy * t;
    p.x = 2 * fx - p.x;
    p.y = 2 * fy - p.y;
  });
  graph.bonds.forEach((other) => {
    if (other.stereo && side.has(other.atomA)) {
      layoutToggleStereo(other);
    }
  });
  return true;
}

function tetrahedralVolume(graph, centerId, neighborIds) {
  const center = graph.getAtom(centerId);
  const bonds = graph.bondsForAtom(centerId);
  const stereoBonds = bonds.filter((b) => b.stereo && b.atomA === centerId);
  if (stereoBonds.length === 0) {
    return 0;
  }
  const zFor = (id) => {
    const bond = stereoBonds.find((b) => b.atomB === id);
    return bond ? (bond.stereo === 'wedge' ? 1 : -1) : 0;
  };
  const zSum = stereoBonds.reduce((s, b) => s + (b.stereo === 'wedge' ? 1 : -1), 0);
  const r = neighborIds.map((id) => {
    if (id === null) {
      return { x: 0, y: 0, z: zSum > 0 ? -1 : zSum < 0 ? 1 : 0 };
    }
    const a = graph.getAtom(id);
    return { x: a.x - center.x, y: -(a.y - center.y), z: zFor(id) };
  });
  if (r.length === 3) {
    r.push({ x: 0, y: 0, z: zSum > 0 ? -1 : 1 });
  }
  const sub = (p, q) => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
  const a = sub(r[0], r[3]);
  const b = sub(r[1], r[3]);
  const c = sub(r[2], r[3]);
  return a.x * (b.y * c.z - b.z * c.y) - a.y * (b.x * c.z - b.z * c.x) + a.z * (b.x * c.y - b.y * c.x);
}

function captureStereo(graph, atomIds) {
  const idSet = new Set(atomIds);
  const doubles = [];
  graph.bonds.forEach((bond) => {
    if (bond.order !== 2 || !idSet.has(bond.atomA) || !idSet.has(bond.atomB)) {
      return;
    }
    if (!layoutSideOf(graph, bond.atomA, bond.atomB)) {
      return;
    }
    const { refA, refB } = layoutDoubleBondRefs(graph, bond);
    if (refA.length === 0 || refB.length === 0) {
      return;
    }
    const x = Math.min(...refA);
    const y = Math.min(...refB);
    const same = layoutSameSide(graph, bond.atomA, bond.atomB, x, y);
    if (same !== null) {
      doubles.push({ bond, refA: x, refB: y, same });
    }
  });
  const centers = [];
  const seen = new Set();
  graph.bonds.forEach((bond) => {
    if (!bond.stereo || !idSet.has(bond.atomA) || seen.has(bond.atomA)) {
      return;
    }
    seen.add(bond.atomA);
    const neighbors = graph.bondsForAtom(bond.atomA).map((b) => (b.atomA === bond.atomA ? b.atomB : b.atomA)).sort((p, q) => p - q);
    if (neighbors.length < 3 || neighbors.length > 4) {
      return;
    }
    const volume = tetrahedralVolume(graph, bond.atomA, neighbors);
    if (Math.abs(volume) > 1e-6) {
      centers.push({ atomId: bond.atomA, neighbors, sign: Math.sign(volume) });
    }
  });
  return { doubles, centers };
}

function restoreStereo(graph, captured) {
  captured.doubles.forEach((entry) => {
    if (graph.bonds.includes(entry.bond)) {
      enforceDoubleBondGeometry(graph, entry.bond, entry.refA, entry.refB, entry.same);
    }
  });
  captured.centers.forEach((entry) => {
    const volume = tetrahedralVolume(graph, entry.atomId, entry.neighbors);
    if (Math.abs(volume) > 1e-6 && Math.sign(volume) !== entry.sign) {
      graph.bondsForAtom(entry.atomId).forEach((b) => {
        if (b.stereo && b.atomA === entry.atomId) {
          layoutToggleStereo(b);
        }
      });
    }
  });
}

function alignPositions(oldPos, newPos) {
  const ids = Array.from(newPos.keys()).filter((id) => oldPos.has(id));
  if (ids.length === 0) {
    return newPos;
  }
  const mean = (map) => {
    let x = 0;
    let y = 0;
    ids.forEach((id) => {
      x += map.get(id).x;
      y += map.get(id).y;
    });
    return { x: x / ids.length, y: y / ids.length };
  };
  const po = mean(oldPos);
  const pn = mean(newPos);
  const fit = (mirror) => {
    let sxx = 0;
    let sxy = 0;
    ids.forEach((id) => {
      const o = oldPos.get(id);
      const n = newPos.get(id);
      const qx = (n.x - pn.x) * mirror;
      const qy = n.y - pn.y;
      const px = o.x - po.x;
      const py = o.y - po.y;
      sxx += qx * px + qy * py;
      sxy += qx * py - qy * px;
    });
    const angle = Math.atan2(sxy, sxx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const out = new Map();
    let err = 0;
    newPos.forEach((n, id) => {
      const qx = (n.x - pn.x) * mirror;
      const qy = n.y - pn.y;
      const p = { x: po.x + qx * cos - qy * sin, y: po.y + qx * sin + qy * cos };
      out.set(id, p);
      if (oldPos.has(id)) {
        const o = oldPos.get(id);
        err += (p.x - o.x) ** 2 + (p.y - o.y) ** 2;
      }
    });
    return { out, err };
  };
  const a = fit(1);
  const b = fit(-1);
  return a.err <= b.err ? a.out : b.out;
}

function cleanupLayout(graph, atomIds) {
  const adj = layoutAdjacency(graph, graph.atoms.map((a) => a.id));
  const wanted = new Set(atomIds);
  const components = layoutComponents(adj, graph.atoms.map((a) => a.id)).filter((comp) => comp.some((id) => wanted.has(id)));
  let moved = 0;
  components.forEach((comp) => {
    if (comp.length < 2) {
      return;
    }
    const captured = captureStereo(graph, comp);
    const oldPos = new Map(comp.map((id) => {
      const a = graph.getAtom(id);
      return [id, { x: a.x, y: a.y }];
    }));
    const aligned = alignPositions(oldPos, computeLayout(graph, comp));
    aligned.forEach((p, id) => {
      const atom = graph.getAtom(id);
      atom.x = p.x;
      atom.y = p.y;
    });
    restoreStereo(graph, captured);
    comp.forEach((id) => {
      const atom = graph.getAtom(id);
      const old = oldPos.get(id);
      if (Math.hypot(atom.x - old.x, atom.y - old.y) > 0.5) {
        moved += 1;
      }
    });
  });
  return moved;
}
