'use strict';

const DEPICT_BOND = 1;
const DEPICT_CLASH = 0.72;

function depictVec(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function depictDistance(p, q) {
  return Math.hypot(p.x - q.x, p.y - q.y);
}

function depictRingBonds(ring) {
  const keys = [];
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    keys.push(a < b ? a + ':' + b : b + ':' + a);
  }
  return keys;
}

function depictLayoutRings(mol) {
  const covered = new Set();
  const kept = [];
  mol.rings.slice().sort((a, b) => a.length - b.length).forEach((ring) => {
    const keys = depictRingBonds(ring);
    if (keys.some((key) => !covered.has(key))) {
      kept.push(ring);
      keys.forEach((key) => covered.add(key));
    }
  });
  return kept;
}

function depictSystems(mol, rings) {
  const owner = new Map();
  const systems = [];
  rings.forEach((ring, index) => {
    const touching = new Set();
    ring.forEach((id) => {
      rings.forEach((other, otherIndex) => {
        if (otherIndex === index || !owner.has(otherIndex)) return;
        if (other.indexOf(id) >= 0) touching.add(owner.get(otherIndex));
      });
    });
    const list = [...touching];
    if (!list.length) {
      owner.set(index, systems.length);
      systems.push([index]);
      return;
    }
    const keep = list[0];
    systems[keep].push(index);
    owner.set(index, keep);
    list.slice(1).forEach((merge) => {
      systems[merge].forEach((ringIndex) => { owner.set(ringIndex, keep); systems[keep].push(ringIndex); });
      systems[merge] = [];
    });
  });
  const compact = [];
  const remap = new Map();
  systems.forEach((system, index) => {
    if (!system.length) return;
    remap.set(index, compact.length);
    compact.push(system);
  });
  const atomSystem = new Map();
  compact.forEach((system, index) => {
    system.forEach((ringIndex) => {
      rings[ringIndex].forEach((id) => atomSystem.set(id, index));
    });
  });
  return { systems: compact, atomSystem };
}

function depictArcAngle(span, segments) {
  if (segments <= 1) return 0;
  let low = 1e-6;
  let high = (2 * Math.PI) / segments - 1e-6;
  for (let i = 0; i < 60; i += 1) {
    const mid = (low + high) / 2;
    const value = Math.sin((segments * mid) / 2) / Math.sin(mid / 2);
    if (value > span) low = mid; else high = mid;
  }
  return (low + high) / 2;
}

function depictRotate(point, center, angle) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: center.y + dx * Math.sin(angle) + dy * Math.cos(angle)
  };
}

function depictArc(from, to, count, away) {
  const segments = count + 1;
  const span = depictDistance(from, to);
  if (segments === 1 || span < 1e-9) return null;
  const theta = depictArcAngle(Math.min(span, segments - 1e-6), segments);
  const radius = 1 / (2 * Math.sin(theta / 2));
  const half = Math.sqrt(Math.max(radius * radius - (span * span) / 4, 0));
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const along = depictVec(from.x, from.y, to.x, to.y);
  const normal = { x: Math.cos(along + Math.PI / 2), y: Math.sin(along + Math.PI / 2) };
  const best = { score: -Infinity, points: null };
  [1, -1].forEach((side) => {
    const center = { x: mid.x + normal.x * half * side, y: mid.y + normal.y * half * side };
    [1, -1].forEach((turn) => {
      const landing = depictRotate(from, center, theta * segments * turn);
      if (depictDistance(landing, to) > 0.05) return;
      const points = [];
      for (let i = 1; i <= count; i += 1) points.push(depictRotate(from, center, theta * i * turn));
      const centroid = points.reduce((sum, point) => ({ x: sum.x + point.x / count, y: sum.y + point.y / count }), { x: 0, y: 0 });
      const score = away ? depictDistance(centroid, away) : 0;
      if (score > best.score) { best.score = score; best.points = points; }
    });
  });
  return best.points;
}

function depictOrderRing(mol, ring) {
  const set = new Set(ring);
  const inRing = new Map();
  ring.forEach((id) => {
    inRing.set(id, mol.atoms[id].neighbors.map((link) => link.atom).filter((other) => set.has(other)));
  });
  const order = [ring[0]];
  const used = new Set([ring[0]]);
  const walk = () => {
    if (order.length === ring.length) {
      return inRing.get(order[order.length - 1]).indexOf(order[0]) >= 0;
    }
    const options = inRing.get(order[order.length - 1]).filter((id) => !used.has(id));
    for (let i = 0; i < options.length; i += 1) {
      order.push(options[i]);
      used.add(options[i]);
      if (walk()) return true;
      used.delete(options[i]);
      order.pop();
    }
    return false;
  };
  return walk() ? order : ring.slice();
}

function depictSystemLocal(mol, ordered) {
  const local = new Map();
  const seed = ordered[0];
  const radius = 0.5 / Math.sin(Math.PI / seed.length);
  const step = (2 * Math.PI) / seed.length;
  seed.forEach((id, index) => {
    local.set(id, { x: Math.cos(step * index) * radius, y: Math.sin(step * index) * radius });
  });

  const done = new Set([0]);
  let guard = 0;
  while (done.size < ordered.length && guard < 400) {
    guard += 1;
    let pick = -1;
    let bestCount = -1;
    ordered.forEach((ring, index) => {
      if (done.has(index)) return;
      const count = ring.filter((id) => local.has(id)).length;
      if (count > bestCount) { bestCount = count; pick = index; }
    });
    if (pick < 0) break;
    const ring = ordered[pick];
    done.add(pick);
    if (ring.every((id) => local.has(id))) continue;

    const anchors = [...local.values()];
    const reference = anchors.reduce((sum, point) => ({
      x: sum.x + point.x / anchors.length,
      y: sum.y + point.y / anchors.length
    }), { x: 0, y: 0 });

    const placedInRing = ring.filter((id) => local.has(id));
    if (placedInRing.length <= 1) {
      const pivot = placedInRing[0];
      const base = pivot === undefined ? { x: 0, y: 0 } : local.get(pivot);
      let direction = depictVec(reference.x, reference.y, base.x, base.y);
      if (!Number.isFinite(direction)) direction = 0;
      const ringRadius = 0.5 / Math.sin(Math.PI / ring.length);
      const center = { x: base.x + Math.cos(direction) * ringRadius, y: base.y + Math.sin(direction) * ringRadius };
      const ringStep = (2 * Math.PI) / ring.length;
      const at = pivot === undefined ? 0 : ring.indexOf(pivot);
      if (pivot === undefined) local.set(ring[0], base);
      for (let i = 1; i < ring.length; i += 1) {
        const id = ring[(at + i) % ring.length];
        if (!local.has(id)) local.set(id, depictRotate(base, center, ringStep * i));
      }
      continue;
    }

    for (let cursor = 0; cursor < ring.length; cursor += 1) {
      if (local.has(ring[cursor])) continue;
      if (!local.has(ring[(cursor - 1 + ring.length) % ring.length])) continue;
      const run = [];
      let walk = cursor;
      while (!local.has(ring[walk % ring.length]) && run.length < ring.length) {
        run.push(ring[walk % ring.length]);
        walk += 1;
      }
      const before = local.get(ring[(cursor - 1 + ring.length) % ring.length]);
      const after = local.get(ring[walk % ring.length]);
      const points = depictArc(before, after, run.length, reference);
      if (points) {
        run.forEach((id, index) => { local.set(id, points[index]); });
      } else {
        let angle = depictVec(reference.x, reference.y, before.x, before.y);
        run.forEach((id, index) => {
          const from = index === 0 ? before : local.get(run[index - 1]);
          if (index) angle += Math.PI / 3;
          local.set(id, { x: from.x + Math.cos(angle), y: from.y + Math.sin(angle) });
        });
      }
      cursor = walk;
    }
  }
  return local;
}

function depictPlaceSystem(mol, rings, system, coords, entry, incoming) {
  const ordered = system.map((ringIndex) => depictOrderRing(mol, rings[ringIndex]))
    .sort((a, b) => b.length - a.length);
  const local = depictSystemLocal(mol, ordered);
  if (!local.has(entry)) return;

  const members = [...local.keys()];
  const centroid = members.reduce((sum, id) => ({
    x: sum.x + local.get(id).x / members.length,
    y: sum.y + local.get(id).y / members.length
  }), { x: 0, y: 0 });

  const base = local.get(entry);
  const outward = depictVec(base.x, base.y, centroid.x, centroid.y);
  const turn = Number.isFinite(outward) ? incoming - outward : incoming;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  const target = coords[entry];
  members.forEach((id) => {
    if (coords[id]) return;
    const dx = local.get(id).x - base.x;
    const dy = local.get(id).y - base.y;
    coords[id] = { x: target.x + dx * cos - dy * sin, y: target.y + dx * sin + dy * cos };
  });
}

function depictPenalty(mol, coords, pairs) {
  let total = 0;
  for (let i = 0; i < pairs.length; i += 1) {
    const [a, b, floor] = pairs[i];
    const d = depictDistance(coords[a], coords[b]);
    if (d < floor) {
      const gap = floor - d;
      total += gap * gap * (d < DEPICT_CLASH ? 25 : 1);
    }
  }
  return total;
}

function depictPairs(mol) {
  const close = new Set();
  mol.bonds.forEach((bond) => {
    close.add(bond.a + ':' + bond.b);
    close.add(bond.b + ':' + bond.a);
  });
  mol.atoms.forEach((atom, id) => {
    atom.neighbors.forEach((one) => {
      atom.neighbors.forEach((two) => {
        if (one.atom === two.atom) return;
        close.add(one.atom + ':' + two.atom);
      });
    });
  });
  const bonded = new Set();
  mol.bonds.forEach((bond) => {
    bonded.add(bond.a + ':' + bond.b);
    bonded.add(bond.b + ':' + bond.a);
  });
  const pairs = [];
  for (let i = 0; i < mol.atoms.length; i += 1) {
    for (let j = i + 1; j < mol.atoms.length; j += 1) {
      if (bonded.has(i + ':' + j)) continue;
      pairs.push([i, j, close.has(i + ':' + j) ? 0.9 : 1.2]);
    }
  }
  return pairs;
}

function depictBridges(mol) {
  const bridges = [];
  mol.bonds.forEach((bond, index) => {
    if (bond.ring) return;
    if (mol.atoms[bond.a].neighbors.length < 2 || mol.atoms[bond.b].neighbors.length < 2) return;
    const side = new Set([bond.b]);
    const queue = [bond.b];
    while (queue.length) {
      const current = queue.shift();
      mol.atoms[current].neighbors.forEach((link) => {
        if (link.bond === index || side.has(link.atom)) return;
        side.add(link.atom);
        queue.push(link.atom);
      });
    }
    if (side.has(bond.a)) return;
    const other = [];
    for (let i = 0; i < mol.atoms.length; i += 1) if (!side.has(i)) other.push(i);
    const move = side.size <= other.length ? [...side] : other;
    const pivot = side.size <= other.length ? bond.a : bond.b;
    const axis = side.size <= other.length ? bond.b : bond.a;
    bridges.push({ move, pivot, axis });
  });
  return bridges;
}

function depictMirror(coords, move, pivot, axis) {
  const angle = depictVec(coords[pivot].x, coords[pivot].y, coords[axis].x, coords[axis].y);
  const cos = Math.cos(2 * angle);
  const sin = Math.sin(2 * angle);
  move.forEach((id) => {
    const dx = coords[id].x - coords[pivot].x;
    const dy = coords[id].y - coords[pivot].y;
    coords[id] = {
      x: coords[pivot].x + dx * cos + dy * sin,
      y: coords[pivot].y + dx * sin - dy * cos
    };
  });
}

function depictUnfold(mol, coords) {
  const pairs = depictPairs(mol);
  if (!pairs.length) return coords;
  const bridges = depictBridges(mol);
  let best = depictPenalty(mol, coords, pairs);
  for (let pass = 0; pass < 4 && best > 1e-9; pass += 1) {
    let improved = false;
    bridges.forEach((bridge) => {
      const snapshot = coords.map((point) => ({ x: point.x, y: point.y }));
      depictMirror(coords, bridge.move, bridge.pivot, bridge.axis);
      const score = depictPenalty(mol, coords, pairs);
      if (score < best - 1e-9) { best = score; improved = true; } else {
        for (let i = 0; i < coords.length; i += 1) coords[i] = snapshot[i];
      }
    });
    if (!improved) break;
  }
  return coords;
}

function depictConstraints(mol, rings) {
  const seen = new Map();
  const add = (a, b, target, weight) => {
    const key = a < b ? a + ':' + b : b + ':' + a;
    if (seen.has(key)) return;
    seen.set(key, true);
    constraints.push({ a, b, target, weight });
  };
  const constraints = [];
  mol.bonds.forEach((bond) => add(bond.a, bond.b, 1, 1));
  rings.forEach((ring, index) => {
    const bridged = rings.some((other, otherIndex) => (
      otherIndex !== index && other.filter((id) => ring.indexOf(id) >= 0).length > 2
    ));
    const order = depictOrderRing(mol, ring);
    const n = order.length;
    const radius = 0.5 / Math.sin(Math.PI / n);
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        const span = Math.min(j - i, n - (j - i));
        if (bridged && span > 1) continue;
        add(order[i], order[j], 2 * radius * Math.sin((Math.PI * span) / n), bridged ? 0.3 : 0.8);
      }
    }
  });
  mol.atoms.forEach((atom, id) => {
    for (let i = 0; i < atom.neighbors.length; i += 1) {
      for (let j = i + 1; j < atom.neighbors.length; j += 1) {
        const a = atom.neighbors[i].atom;
        const b = atom.neighbors[j].atom;
        const count = atom.neighbors.length;
        const angle = count >= 4 ? Math.PI / 2 : (count === 3 ? (2 * Math.PI) / 3 : Math.PI);
        add(a, b, 2 * Math.sin(Math.min(angle, Math.PI) / 2), 0.6);
      }
    }
  });
  return constraints;
}

function depictBondError(mol, coords) {
  let worst = 0;
  mol.bonds.forEach((bond) => {
    worst = Math.max(worst, Math.abs(depictDistance(coords[bond.a], coords[bond.b]) - 1));
  });
  return worst;
}

function depictScore(mol, coords, pairs) {
  let bond = 0;
  mol.bonds.forEach((b) => {
    const gap = depictDistance(coords[b.a], coords[b.b]) - 1;
    bond += gap * gap;
  });
  let hard = 0;
  pairs.forEach(([a, b]) => { if (depictDistance(coords[a], coords[b]) < DEPICT_CLASH) hard += 1; });
  return 60 * hard + depictPenalty(mol, coords, pairs) + 30 * bond;
}

function depictRelax(mol, coords, pairs, rings, jitter) {
  const constraints = depictConstraints(mol, rings);
  const spread = jitter || 0.00001;
  const work = coords.map((point, index) => ({
    x: point.x + (((index + 1) * 2654435761) % 1000) * spread,
    y: point.y + (((index + 1) * 40503) % 1000) * spread
  }));
  for (let step = 0; step < 400; step += 1) {
    constraints.forEach((constraint) => {
      const a = work[constraint.a];
      const b = work[constraint.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-6;
      const shift = ((d - constraint.target) / d) * 0.5 * constraint.weight;
      a.x += dx * shift; a.y += dy * shift;
      b.x -= dx * shift; b.y -= dy * shift;
    });
    pairs.forEach(([i, j, floor]) => {
      const a = work[i];
      const b = work[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-6;
      if (d >= floor) return;
      const shift = ((d - floor) / d) * 0.25;
      a.x += dx * shift; a.y += dy * shift;
      b.x -= dx * shift; b.y -= dy * shift;
    });
    mol.bonds.forEach((bond) => {
      const a = work[bond.a];
      const b = work[bond.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-6;
      const shift = ((d - 1) / d) * 0.5;
      a.x += dx * shift; a.y += dy * shift;
      b.x -= dx * shift; b.y -= dy * shift;
    });
  }
  return work;
}

function depictLinear(mol, id) {
  const atom = mol.atoms[id];
  if (atom.neighbors.length !== 2) return false;
  return atom.neighbors.some((link) => mol.bonds[link.bond].order === 3)
    || atom.neighbors.every((link) => mol.bonds[link.bond].order === 2);
}

function depictCoordinates(mol) {
  const rings = depictLayoutRings(mol);
  const { systems, atomSystem } = depictSystems(mol, rings);
  const coords = new Array(mol.atoms.length).fill(null);
  const zig = new Array(mol.atoms.length).fill(1);
  const placedSystems = new Set();

  const seeds = [];
  if (systems.length) {
    let biggest = 0;
    systems.forEach((system, index) => {
      const count = new Set(system.flatMap((ringIndex) => rings[ringIndex])).size;
      if (count > new Set(systems[biggest].flatMap((ringIndex) => rings[ringIndex])).size) biggest = index;
    });
    seeds.push(rings[systems[biggest][0]][0]);
  }
  mol.atoms.forEach((atom, id) => { seeds.push(id); });

  seeds.forEach((seed) => {
    if (coords[seed]) return;
    coords[seed] = { x: 0, y: 0 };
    const queue = [seed];
    if (atomSystem.has(seed)) {
      const index = atomSystem.get(seed);
      placedSystems.add(index);
      depictPlaceSystem(mol, rings, systems[index], coords, seed, 0);
      systems[index].forEach((ringIndex) => {
        rings[ringIndex].forEach((member) => { if (queue.indexOf(member) < 0) queue.push(member); });
      });
    }
    while (queue.length) {
      const current = queue.shift();
      const base = coords[current];
      const occupied = mol.atoms[current].neighbors
        .map((link) => link.atom)
        .filter((id) => coords[id])
        .map((id) => depictVec(base.x, base.y, coords[id].x, coords[id].y));
      const waiting = mol.atoms[current].neighbors
        .map((link) => link.atom)
        .filter((id) => !coords[id]);
      if (!waiting.length) continue;

      let angles = [];
      if (!occupied.length) {
        for (let i = 0; i < waiting.length; i += 1) angles.push((i * 2 * Math.PI) / waiting.length);
      } else if (occupied.length === 1 && waiting.length === 1 && !depictLinear(mol, current)) {
        angles = [occupied[0] - zig[current] * (2 * Math.PI) / 3];
      } else if (occupied.length === 1 && waiting.length === 1) {
        angles = [occupied[0] + Math.PI];
      } else {
        const sorted = occupied.slice().sort((a, b) => a - b);
        let gapStart = sorted[0];
        let gapSize = 2 * Math.PI - (sorted[sorted.length - 1] - sorted[0]);
        for (let i = 0; i + 1 < sorted.length; i += 1) {
          const size = sorted[i + 1] - sorted[i];
          if (size > gapSize) { gapSize = size; gapStart = sorted[i]; }
        }
        if (gapStart === sorted[0] && gapSize === 2 * Math.PI - (sorted[sorted.length - 1] - sorted[0])) {
          gapStart = sorted[sorted.length - 1];
        }
        for (let i = 0; i < waiting.length; i += 1) {
          angles.push(gapStart + (gapSize * (i + 1)) / (waiting.length + 1));
        }
      }

      waiting.forEach((id, index) => {
        if (coords[id]) return;
        const angle = angles[index % angles.length];
        if (atomSystem.has(id)) {
          const systemIndex = atomSystem.get(id);
          coords[id] = { x: base.x + Math.cos(angle), y: base.y + Math.sin(angle) };
          if (!placedSystems.has(systemIndex)) {
            placedSystems.add(systemIndex);
            depictPlaceSystem(mol, rings, systems[systemIndex], coords, id, angle);
            systems[systemIndex].forEach((ringIndex) => {
              rings[ringIndex].forEach((member) => { if (queue.indexOf(member) < 0) queue.push(member); });
            });
          }
        } else {
          coords[id] = { x: base.x + Math.cos(angle), y: base.y + Math.sin(angle) };
          zig[id] = -zig[current];
        }
        queue.push(id);
      });
    }
  });

  for (let i = 0; i < coords.length; i += 1) {
    if (!coords[i]) coords[i] = { x: 0, y: 0 };
  }
  const unfolded = depictUnfold(mol, coords);
  const pairs = depictPairs(mol);
  if (depictPenalty(mol, unfolded, pairs) < 1e-9 && depictBondError(mol, unfolded) < 0.01) return unfolded;
  let best = unfolded;
  let bestScore = depictScore(mol, unfolded, pairs);
  [0.00001, 0.0004, 0.0012].forEach((jitter) => {
    if (bestScore < 1e-9) return;
    const relaxed = depictUnfold(mol, depictRelax(mol, unfolded, pairs, rings, jitter));
    const score = depictScore(mol, relaxed, pairs);
    if (score < bestScore) { bestScore = score; best = relaxed; }
  });
  return best;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { depictCoordinates, depictPairs, depictPenalty, depictLayoutRings, depictSystems, depictOrderRing, DEPICT_BOND, DEPICT_CLASH };
}
