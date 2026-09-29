const RX_FORMULA_TAGS = {
  Br2: 'Br2', Cl2: 'Cl2', I2: 'I2', BrH: 'HBr', ClH: 'HCl', HI: 'HI', H2: 'H2', H2O: 'H2O', H3N: 'ammonia',
  'HO−': 'hydroxide', 'BH4−': 'borohydride', 'AlH4−': 'alanate', BH3: 'borane',
  'MnO4−': 'permanganate', 'ClCrO3−': 'pcc', O3: 'ozone', C7H5ClO3: 'mcpba', Cl2OS: 'socl2', Br3P: 'pbr3',
  C4H4BrNO2: 'nbs', 'CH3BN−': 'mildHydride', 'C6H10BO6−': 'mildHydride', H2O2: 'hydrogenPeroxide', 'CN−': 'cyanide', 'N3−': 'azide', 'H−': 'hydride',
  H2O4S: 'strongAcid', H3O4P: 'strongAcid', C7H8O3S: 'strongAcid',
  AlCl3: 'lewis', Br3Fe: 'lewis', BF3: 'lewis', Cl2Zn: 'lewis', Cl3Fe: 'lewis',
  C6H15N: 'amineBase', C5H5N: 'amineBase', C8H12N4: 'radicalInitiator', 'CO32−': 'weakBase',
  'Na+': 'cation', 'K+': 'cation', 'Li+': 'cation', 'C5H6N+': 'cation',
};

const RX_ADDITIVE_TAGS = {
  hcl: ['strongAcid'], hbr: ['strongAcid'], pdc: ['hydrogenationCatalyst'], pt: ['hydrogenationCatalyst'],
  ni: ['hydrogenationCatalyst'], lindlar: ['lindlar'], hgso4: ['mercury'], nanh3: ['dissolvingMetal'], peroxide: ['radicalInitiator'], pdpph3: ['palladium0'],
};

const RX_FORMULA_GUARDS = {};

const RX_SPECIES_DETECTORS = [];

const RX_TEMPERATURES = { dehydrationTertiary: 25, dehydrationSecondary: 80, dehydrationPrimary: 170, etherMin: 110, coldPermanganate: 10, e1: 50 };

function rxNeighbors(g, id) {
  return g.bondsForAtom(id).map((b) => ({ bond: b, atom: g.getAtom(b.atomA === id ? b.atomB : b.atomA) }));
}

function rxHydrogens(g, id) {
  const a = g.getAtom(id);
  return implicitHydrogenCount(a.element, a.charge || 0, g.totalBondOrder(id));
}

function rxCarbonNeighbors(g, id, exclude) {
  return rxNeighbors(g, id).filter((n) => n.atom.element === 'C' && n.atom.id !== exclude);
}

function rxIsSp3(g, id) {
  return rxNeighbors(g, id).every((n) => n.bond.order === 1);
}

function rxCloneGraph(graph) {
  const g = new Graph();
  graph.atoms.forEach((a) => g.atoms.push(Object.assign({}, a)));
  graph.bonds.forEach((b) => g.bonds.push(Object.assign({}, b)));
  g.nextAtomId = graph.nextAtomId;
  g.nextBondId = graph.nextBondId;
  rxsCopy(g, graph);
  return g;
}

function rxAttach(g, element, toId, order, charge) {
  const near = g.getAtom(toId);
  const atom = g.addAtom(element, near.x + 30, near.y + 30);
  if (charge) {
    atom.charge = charge;
  }
  g.addBond(toId, atom.id).order = order || 1;
  return atom;
}

function rxSetOrder(g, a, b, order) {
  const bond = g.getBond(a, b);
  if (order === 0) {
    g.removeBond(bond.id);
  } else {
    bond.order = order;
  }
}

function rxMerge(target, source, ids) {
  const map = new Map();
  ids.forEach((id) => {
    const a = source.getAtom(id);
    const n = target.addAtom(a.element, a.x + 200, a.y);
    if (a.charge) {
      n.charge = a.charge;
    }
    map.set(id, n.id);
  });
  source.bonds.forEach((b) => {
    if (map.has(b.atomA) && map.has(b.atomB)) {
      target.addBond(map.get(b.atomA), map.get(b.atomB)).order = b.order;
    }
  });
  rxsMergeSpecs(target, source, map);
  return map;
}

function rxRemoveBranch(g, fromId, keepId) {
  const seen = new Set([keepId, fromId]);
  const queue = [fromId];
  while (queue.length) {
    const id = queue.shift();
    rxNeighbors(g, id).forEach((n) => {
      if (!seen.has(n.atom.id)) {
        seen.add(n.atom.id);
        queue.push(n.atom.id);
      }
    });
  }
  seen.delete(keepId);
  seen.forEach((id) => g.removeAtom(id));
}

function rxRings(g, maxSize) {
  const rings = [];
  const seen = new Set();
  g.atoms.forEach((startAtom) => {
    const start = startAtom.id;
    const path = [start];
    const walk = (id) => {
      rxNeighbors(g, id).forEach((n) => {
        const next = n.atom.id;
        if (next === start && path.length >= 3) {
          const key = path.slice().sort((x, y) => x - y).join(',');
          if (!seen.has(key)) {
            seen.add(key);
            rings.push(path.slice());
          }
          return;
        }
        if (path.length >= maxSize || next < start || path.includes(next)) {
          return;
        }
        path.push(next);
        walk(next);
        path.pop();
      });
    };
    walk(start);
  });
  return rings;
}

function rxPiCount(g, ring, pool) {
  const ringSet = new Set(ring);
  const donorN = ring.some((id) => g.getAtom(id).element === 'N' && !g.getAtom(id).charge && rxNeighbors(g, id).every((n) => n.bond.order === 1));
  let total = 0;
  let exo = 0;
  for (const id of ring) {
    const atom = g.getAtom(id);
    const bonds = rxNeighbors(g, id);
    if (bonds.some((n) => n.bond.order === 3)) {
      return -1;
    }
    const doubles = bonds.filter((n) => n.bond.order === 2);
    if (doubles.length > 1) {
      return -1;
    }
    if (doubles.length) {
      const d = doubles[0].atom;
      if (ringSet.has(d.id) || pool.has(d.id)) {
        total += 1;
      } else if (atom.element === 'C' && ['O', 'N', 'S'].includes(d.element) && donorN) {
        exo += 1;
      } else {
        return -1;
      }
    } else if (atom.element === 'C') {
      if (atom.charge === -1) {
        total += 2;
      } else if (atom.charge !== 1) {
        return -1;
      }
    } else if (['N', 'O', 'S', 'Se', 'P'].includes(atom.element) && !atom.charge && bonds.length <= 3) {
      total += 2;
    } else {
      return -1;
    }
  }
  return exo > 1 ? -1 : total;
}

function rxAromaticRings(g) {
  const rings = rxRings(g, 7).filter((r) => r.length >= 5);
  const huckel = (n) => n >= 2 && (n - 2) % 4 === 0;
  let current = rings.filter((r) => rxPiCount(g, r, new Set(g.atoms.map((a) => a.id))) >= 0);
  for (let pass = 0; pass < 6; pass += 1) {
    const pool = new Set(current.flat());
    const next = current.filter((r) => huckel(rxPiCount(g, r, pool)));
    const pending = current.filter((r) => !next.includes(r));
    pending.forEach((r) => current.forEach((q) => {
      const shared = r.filter((id) => q.includes(id));
      if (shared.length !== 2) {
        return;
      }
      const union = r.concat(q.filter((id) => !shared.includes(id)));
      const count = rxPiCount(g, union, pool);
      if (huckel(count) && rxPiCount(g, r, pool) >= 0 && rxPiCount(g, q, pool) >= 0) {
        next.push(r);
      }
    }));
    const unique = [...new Set(next)];
    if (unique.length === current.length) {
      current = unique;
      break;
    }
    current = unique;
  }
  const rings6 = current.filter((r) => r.length === 6);
  const ordered = rings6.concat(current.filter((r) => r.length !== 6));
  return { rings: ordered, atoms: new Set(ordered.flat()) };
}

function rxCarbonylKind(g, c, o) {
  const others = rxNeighbors(g, c).filter((n) => n.atom.id !== o);
  const hetero = others.find((n) => n.atom.element !== 'C' && n.bond.order === 1);
  let kind = 'ketone';
  if (others.some((n) => n.bond.order > 1)) {
    kind = 'other';
  } else if (hetero) {
    const h = hetero.atom;
    if (h.element === 'O') {
      const acyl = rxNeighbors(g, h.id).some((n) => n.atom.id !== c && rxNeighbors(g, n.atom.id).some((m) => m.bond.order === 2 && m.atom.element === 'O'));
      kind = h.charge ? 'carboxylate' : rxHydrogens(g, h.id) > 0 ? 'acid' : acyl ? 'anhydride' : 'ester';
    } else if (h.element === 'N') {
      kind = 'amide';
    } else if (h.element === 'Cl') {
      kind = 'acylChloride';
    } else {
      kind = 'other';
    }
  } else if (rxHydrogens(g, c) > 0) {
    kind = 'aldehyde';
  }
  return { c, o, kind, hetero: hetero ? hetero.atom.id : null };
}

function rxAnalyze(graph) {
  const aromatic = rxAromaticRings(graph);
  const aro = aromatic.atoms;
  const res = { graph, aromatic, alkenes: [], alkynes: [], carbonyls: [], alcohols: [], halides: [], amines: [], nitriles: [], dienes: [], arylHalides: [], epoxides: [] };
  graph.bonds.forEach((b) => {
    const A = graph.getAtom(b.atomA);
    const B = graph.getAtom(b.atomB);
    if (A.element === 'C' && B.element === 'C' && !aro.has(A.id) && !aro.has(B.id) && !A.charge && !B.charge) {
      if (b.order === 2) {
        res.alkenes.push({ a: A.id, b: B.id });
      } else if (b.order === 3) {
        res.alkynes.push({ a: A.id, b: B.id });
      }
    }
    const pair = [A, B];
    const c = pair.find((x) => x.element === 'C');
    const other = c && pair.find((x) => x !== c);
    if (c && other && b.order === 2 && other.element === 'O' && !aro.has(c.id)) {
      res.carbonyls.push(rxCarbonylKind(graph, c.id, other.id));
    }
    if (c && other && b.order === 3 && other.element === 'N' && !other.charge) {
      res.nitriles.push({ c: c.id, n: other.id });
    }
  });
  graph.atoms.forEach((atom) => {
    if (atom.charge) {
      return;
    }
    const n = rxNeighbors(graph, atom.id);
    if (atom.element === 'O' && rxHydrogens(graph, atom.id) === 1 && n.length === 1 && n[0].atom.element === 'C' && rxIsSp3(graph, n[0].atom.id)) {
      res.alcohols.push({ o: atom.id, c: n[0].atom.id, degree: rxCarbonNeighbors(graph, n[0].atom.id).length });
    }
    if (['Cl', 'Br', 'I'].includes(atom.element) && n.length === 1 && n[0].atom.element === 'C') {
      if (rxIsSp3(graph, n[0].atom.id)) {
        res.halides.push({ x: atom.id, c: n[0].atom.id, degree: rxCarbonNeighbors(graph, n[0].atom.id).length, halogen: atom.element });
      } else {
        res.arylHalides.push({ x: atom.id, c: n[0].atom.id });
      }
    }
    if (atom.element === 'O' && n.length === 2 && n.every((x) => x.atom.element === 'C' && x.bond.order === 1)) {
      const link = graph.getBond(n[0].atom.id, n[1].atom.id);
      if (link && link.order === 1) {
        res.epoxides.push({ o: atom.id, a: n[0].atom.id, b: n[1].atom.id });
      }
    }
    if (atom.element === 'N' && rxHydrogens(graph, atom.id) >= 1 && n.every((x) => x.bond.order === 1 && x.atom.element === 'C' &&
      !rxNeighbors(graph, x.atom.id).some((m) => m.bond.order === 2 && m.atom.element === 'O'))) {
      res.amines.push({ n: atom.id, h: rxHydrogens(graph, atom.id) });
    }
  });
  res.alkenes.forEach((e1, i) => {
    res.alkenes.slice(i + 1).forEach((e2) => {
      [[e1.a, e1.b], [e1.b, e1.a]].forEach(([x1, y1]) => {
        [[e2.a, e2.b], [e2.b, e2.a]].forEach(([y2, x2]) => {
          const link = graph.getBond(y1, y2);
          if (link && link.order === 1) {
            res.dienes.push([x1, y1, y2, x2]);
          }
        });
      });
    });
  });
  return res;
}

function rxSubstitution(g, id, other) {
  return rxCarbonNeighbors(g, id, other).length;
}

function rxMarkovnikov(g, a, b) {
  const sa = rxSubstitution(g, a, b);
  const sb = rxSubstitution(g, b, a);
  return { more: sa >= sb ? a : b, less: sa >= sb ? b : a, tie: sa === sb };
}

function rxMostSubstitutedAlkene(g, alkenes) {
  return alkenes.slice().sort((p, q) => (rxSubstitution(g, q.a, q.b) + rxSubstitution(g, q.b, q.a)) - (rxSubstitution(g, p.a, p.b) + rxSubstitution(g, p.b, p.a)))[0];
}

function rxEliminate(g, c, leavingId, mode, anti) {
  const betas = rxCarbonNeighbors(g, c).filter((n) => n.bond.order === 1 && rxIsSp3(g, n.atom.id) && rxHydrogens(g, n.atom.id) > 0)
    .map((n) => ({ id: n.atom.id, subst: rxSubstitution(g, n.atom.id, c), h: rxHydrogens(g, n.atom.id) }));
  if (!betas.length) {
    return null;
  }
  betas.sort((p, q) => (mode === 'hofmann' ? p.subst - q.subst || q.h - p.h : q.subst - p.subst));
  const choices = new Set(betas.map((b) => b.subst));
  const geometry = anti ? rxsEliminationGeometry(g, c, betas[0].id, leavingId) : null;
  g.removeAtom(leavingId);
  rxSetOrder(g, c, betas[0].id, 2);
  rxsDrop(g, c);
  rxsDrop(g, betas[0].id);
  rxsAlkene(g, c, betas[0].id, geometry ? geometry.na : null, geometry ? geometry.nb : null, geometry ? geometry.cis : false);
  return { beta: betas[0].id, regio: choices.size > 1, stereospecific: Boolean(geometry) };
}

function rxCationShift(g, c) {
  const carbons = rxCarbonNeighbors(g, c);
  if (carbons.length !== 2 || carbons.some((n) => n.bond.order !== 1 || !rxIsSp3(g, n.atom.id))) {
    return null;
  }
  const options = carbons.map((n) => {
    const id = n.atom.id;
    const others = rxCarbonNeighbors(g, id, c);
    if (others.length === 2 && rxHydrogens(g, id) > 0) {
      return { from: id, kind: 'hydride', rank: 2 };
    }
    const methyl = others.length === 3 ? others.find((o) => rxNeighbors(g, o.atom.id).length === 1) : null;
    return methyl ? { from: id, kind: 'methyl', group: methyl.atom.id, rank: 1 } : null;
  }).filter(Boolean).sort((p, q) => q.rank - p.rank);
  return options[0] || null;
}

function rxApplyShift(g, c, shift, moving) {
  if (shift.kind === 'methyl') {
    rxSetOrder(g, shift.group, shift.from, 0);
    g.addBond(shift.group, c);
  }
  rxSetOrder(g, moving, c, 0);
  g.addBond(moving, shift.from);
  rxsDrop(g, c);
  rxsDrop(g, shift.from);
}

function rxShiftText(shift) {
  return shift.kind === 'hydride' ? '1,2-hydride shift' : '1,2-methyl shift';
}

function rxCationMechanism(source, spec) {
  const c = spec.c;
  const base = rxCloneGraph(source);
  const picture = { anchor: c, charges: [], add: [], arrows: [], caption: spec.caption };
  if (spec.pi) {
    rxSetOrder(base, spec.pi.a, spec.pi.b, 1);
    const other = spec.pi.a === c ? spec.pi.b : spec.pi.a;
    picture.add.push({ key: 'hx', text: spec.pi.text, from: other, away: c, distance: 1.4 });
    picture.arrows.push({ from: [spec.pi.a, spec.pi.b], to: 'hx' });
  } else {
    base.removeAtom(spec.leaving);
    if (spec.protonated) {
      picture.charges.push([spec.leaving, 1]);
    }
    picture.arrows.push({ from: [c, spec.leaving], to: spec.leaving });
  }
  const degree = ['methyl', 'primary', 'secondary', 'tertiary'][Math.min(3, rxCarbonNeighbors(base, c).length)];
  const first = { graph: base, anchor: c, charges: [[c, 1]], label: degree + ' carbocation' };
  const steps = [first];
  let center = c;
  if (spec.shift) {
    const sh = spec.shift;
    first.label += ', ' + rxShiftText(sh);
    if (sh.kind === 'hydride') {
      first.hydrogens = [sh.from];
      first.arrows = [{ from: [sh.from, 'H' + sh.from], to: c }];
    } else {
      first.arrows = [{ from: [sh.from, sh.group], to: c }];
    }
    const moved = rxCloneGraph(base);
    if (sh.kind === 'methyl') {
      rxSetOrder(moved, sh.group, sh.from, 0);
      moved.addBond(sh.group, c);
    }
    steps.push({ graph: moved, anchor: sh.from, charges: [[sh.from, 1]], label: 'tertiary carbocation' });
    center = sh.from;
  }
  if (spec.beta !== undefined && spec.beta !== null) {
    const last = steps[steps.length - 1];
    last.hydrogens = (last.hydrogens || []).concat(spec.beta);
    last.arrows = (last.arrows || []).concat({ from: [spec.beta, 'H' + spec.beta], to: [spec.beta, center] });
    last.label += ' → loses H⁺';
  } else if (spec.capture) {
    steps[steps.length - 1].label += ' + ' + spec.capture;
  }
  picture.intermediates = steps;
  return rxMechanism(source, picture);
}

function rxComponentFragment(g, ids) {
  const set = new Set(ids);
  const atoms = g.atoms.filter((a) => set.has(a.id)).map((a) => Object.assign({ id: a.id, element: a.element, x: a.x, y: a.y }, a.charge ? { charge: a.charge } : {},
    a.abbr ? { abbr: a.abbr } : {}, a.abbrHidden ? { abbrHidden: true } : {}));
  const bonds = g.bonds.filter((b) => set.has(b.atomA) && set.has(b.atomB)).map((b) => ({ atomA: b.atomA, atomB: b.atomB, order: b.order, stereo: b.stereo || null }));
  return { format: 'chemical-graph-fragment', atoms, bonds };
}

function rxAbbreviatePhenyls(g, centers) {
  const rings = rxAromaticRings(g).rings.filter((r) => r.length === 6 && r.every((id) => g.getAtom(id).element === 'C'));
  centers.forEach((center) => rxNeighbors(g, center).forEach((n) => {
    const ring = rings.find((r) => r.includes(n.atom.id) && !r.includes(center));
    if (ring && ring.every((id) => id === n.atom.id || rxNeighbors(g, id).every((x) => ring.includes(x.atom.id)))) {
      n.atom.abbr = 'Ph';
      ring.filter((id) => id !== n.atom.id).forEach((id) => {
        g.getAtom(id).abbrHidden = true;
      });
    }
  }));
}

function rxMechanism(g, spec) {
  try {
    const m = rxCloneGraph(g);
    const anchor = spec.anchor;
    const L = LAYOUT_SETTINGS.bondLength;
    (spec.orders || []).forEach(([a, b, o]) => {
      if (m.getBond(a, b)) {
        rxSetOrder(m, a, b, o);
      } else {
        m.addBond(a, b).order = o;
      }
    });
    const ids = m.connectedComponents().find((c) => c.atomIds.includes(anchor)).atomIds.slice();
    computeLayout(m, ids).forEach((p, id) => {
      const atom = m.getAtom(id);
      atom.x = p.x;
      atom.y = p.y;
    });
    const unit = (x, y) => {
      const d = Math.hypot(x, y) || 1;
      return { x: x / d, y: y / d };
    };
    const added = new Map();
    const labels = [];
    const followers = [];
    const place = (item) => {
      const c = m.getAtom(item.from);
      let dir;
      if (item.perpTo !== undefined) {
        const o = m.getAtom(item.perpTo);
        const u = unit(o.x - c.x, o.y - c.y);
        dir = { x: -u.y * item.side, y: u.x * item.side };
      } else {
        const o = m.getAtom(item.away);
        dir = unit(c.x - o.x, c.y - o.y);
      }
      return { x: c.x + dir.x * L * (item.distance || 1), y: c.y + dir.y * L * (item.distance || 1) };
    };
    (spec.add || []).forEach((item) => {
      const at = place(item);
      if (item.text) {
        const label = { kind: 'text', x: at.x, y: at.y, text: item.text };
        labels.push(label);
        followers.push([item.from, label]);
        added.set(item.key, label);
        return;
      }
      const atom = m.addAtom(item.element, at.x, at.y);
      if (item.charge) {
        atom.charge = item.charge;
      }
      if (item.bond) {
        m.addBond(item.from, atom.id);
      }
      ids.push(atom.id);
      added.set(item.key, atom);
    });
    const ref = (k) => (typeof k === 'string' ? added.get(k).id || k : k);
    (spec.remove || []).forEach(([a, b]) => rxSetOrder(m, ref(a), ref(b), 0));
    const moved = new Set();
    (spec.remove || []).forEach(([a, b]) => {
      const comps = m.connectedComponents().filter((c) => c.atomIds.some((id) => ids.includes(id)));
      const home = comps.find((c) => c.atomIds.includes(anchor));
      const side = [ref(a), ref(b)].find((id) => !home.atomIds.includes(id));
      if (side === undefined || moved.has(side)) {
        return;
      }
      const part = comps.find((c) => c.atomIds.includes(side)).atomIds;
      const partner = m.getAtom(side === ref(a) ? ref(b) : ref(a));
      const u = unit(m.getAtom(side).x - partner.x, m.getAtom(side).y - partner.y);
      part.forEach((id) => {
        moved.add(id);
        m.getAtom(id).x += u.x * L * (spec.spread || 0.8);
        m.getAtom(id).y += u.y * L * (spec.spread || 0.8);
      });
      followers.filter(([id]) => part.includes(id)).forEach(([, label]) => {
        label.x += u.x * L * (spec.spread || 0.8);
        label.y += u.y * L * (spec.spread || 0.8);
      });
    });
    (spec.charges || []).forEach(([id, c]) => {
      m.getAtom(ref(id)).charge = c;
    });
    const at = (k) => (typeof k === 'string' ? added.get(k) : m.getAtom(k));
    const centroid = (list) => ({ x: list.reduce((sum, a) => sum + a.x, 0) / list.length, y: list.reduce((sum, a) => sum + a.y, 0) / list.length });
    const curve = (arrow, find, middle, inside) => {
      const point = (k) => (Array.isArray(k) ? { x: (find(k[0]).x + find(k[1]).x) / 2, y: (find(k[0]).y + find(k[1]).y) / 2 } : { x: find(k).x, y: find(k).y });
      let p1 = point(arrow.from);
      let p2 = point(arrow.to);
      if (Array.isArray(arrow.from) && arrow.from.includes(arrow.to)) {
        const end = find(arrow.to);
        const along = unit(end.x - p1.x, end.y - p1.y);
        const side = Math.hypot(p1.x - along.y - middle.x, p1.y + along.x - middle.y) > Math.hypot(p1.x + along.y - middle.x, p1.y - along.x - middle.y) ? 1 : -1;
        const n = { x: -along.y * side, y: along.x * side };
        p1 = { x: p1.x - along.x * L * 0.1 + n.x * L * 0.2, y: p1.y - along.y * L * 0.1 + n.y * L * 0.2 };
        p2 = { x: end.x + n.x * L * 0.5 + along.x * L * 0.3, y: end.y + n.y * L * 0.5 + along.y * L * 0.3 };
        const control = (bend) => ({ x: (p1.x + p2.x) / 2 - (p2.y - p1.y) * bend, y: (p1.y + p2.y) / 2 + (p2.x - p1.x) * bend });
        const bend = Math.hypot(control(0.5).x - middle.x, control(0.5).y - middle.y) > Math.hypot(control(-0.5).x - middle.x, control(-0.5).y - middle.y) ? 0.5 : -0.5;
        return { kind: 'arrow', style: 'electron', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, bend };
      }
      if (!Array.isArray(arrow.from)) {
        const u = unit(p2.x - p1.x, p2.y - p1.y);
        p1 = { x: p1.x + u.x * L * 0.3, y: p1.y + u.y * L * 0.3 };
      }
      if (!Array.isArray(arrow.to)) {
        const u = unit(p2.x - p1.x, p2.y - p1.y);
        p2 = { x: p2.x - u.x * L * 0.3, y: p2.y - u.y * L * 0.3 };
      }
      const control = (bend) => ({ x: (p1.x + p2.x) / 2 - (p2.y - p1.y) * bend, y: (p1.y + p2.y) / 2 + (p2.x - p1.x) * bend });
      const gap = (bend) => Math.hypot(control(bend).x - middle.x, control(bend).y - middle.y);
      const bend = (inside ? gap(0.5) < gap(-0.5) : gap(0.5) > gap(-0.5)) ? 0.5 : -0.5;
      return { kind: 'arrow', style: 'electron', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, bend };
    };
    const all = ids.map((id) => m.getAtom(id));
    const middle = spec.inside ? centroid(spec.inside.map((k) => at(k))) : centroid(all);
    const arrows = spec.arrows.map((arrow) => curve(arrow, at, middle, Boolean(spec.inside)));
    rxAbbreviatePhenyls(m, spec.abbreviate || []);
    const steps = [];
    const intermediates = spec.intermediates || (spec.intermediate ? [spec.intermediate] : []);
    intermediates.forEach((step) => {
      const n = rxCloneGraph(step.graph || g);
      const stepAnchor = step.anchor !== undefined ? step.anchor : anchor;
      const nIds = n.connectedComponents().find((c) => c.atomIds.includes(stepAnchor)).atomIds.slice();
      const explicit = new Map();
      (step.hydrogens || []).forEach((id) => {
        const h = n.addAtom('H', n.getAtom(id).x, n.getAtom(id).y);
        n.addBond(id, h.id);
        nIds.push(h.id);
        explicit.set('H' + id, h.id);
      });
      (step.charges || []).forEach(([id, c]) => {
        n.getAtom(id).charge = c;
      });
      rxAbbreviatePhenyls(n, spec.abbreviate || []);
      computeLayout(n, nIds).forEach((p, id) => {
        n.getAtom(id).x = p.x;
        n.getAtom(id).y = p.y;
      });
      const xs = ids.map((id) => m.getAtom(id).x).concat(labels.map((l) => l.x + L * 0.3), steps.filter((a) => a.kind === 'text').map((a) => a.x + a.text.length * 3));
      const ys = ids.map((id) => m.getAtom(id).y);
      const right = Math.max(...xs);
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      const nxs = nIds.map((id) => n.getAtom(id).x);
      const nys = nIds.map((id) => n.getAtom(id).y);
      const dx = right + L * 2.2 - Math.min(...nxs);
      const dy = cy - (Math.min(...nys) + Math.max(...nys)) / 2;
      const map = new Map();
      nIds.forEach((id) => {
        const a = n.getAtom(id);
        const copy = m.addAtom(a.element, a.x + dx, a.y + dy);
        copy.charge = a.charge || 0;
        if (a.abbr) {
          copy.abbr = a.abbr;
        }
        if (a.abbrHidden) {
          copy.abbrHidden = true;
        }
        map.set(id, copy.id);
        ids.push(copy.id);
      });
      n.bonds.filter((b) => map.has(b.atomA) && map.has(b.atomB)).forEach((b) => {
        m.addBond(map.get(b.atomA), map.get(b.atomB)).order = b.order;
      });
      steps.push({ kind: 'arrow', style: 'forward', x1: right + L * 0.5, y1: cy, x2: right + L * 1.6, y2: cy });
      const find = (k) => m.getAtom(map.get(typeof k === 'string' ? explicit.get(k) : k));
      const stepMiddle = centroid(nIds.map((id) => m.getAtom(map.get(id))));
      (step.arrows || []).forEach((arrow) => steps.push(curve(arrow, find, stepMiddle, false)));
      if (step.label) {
        steps.push({ kind: 'text', x: (Math.min(...nxs) + Math.max(...nxs)) / 2 + dx, y: Math.max(...nys) + dy + L * 0.9, text: step.label });
      }
    });
    m.bonds.forEach((b) => {
      b.stereo = null;
    });
    const fragment = rxComponentFragment(m, ids);
    fragment.annotations = arrows.concat(labels, steps);
    return { fragment, caption: spec.caption || '' };
  } catch (error) {
    return null;
  }
}

function rxProductList(g) {
  const neutral = [];
  const ions = [];
  g.connectedComponents().forEach((comp) => {
    let smiles = '';
    try {
      smiles = computeProperties(g, comp.atomIds).smiles;
    } catch (error) {
      smiles = '';
    }
    if (!smiles) {
      return;
    }
    const charge = comp.atomIds.reduce((s, id) => s + (g.getAtom(id).charge || 0), 0);
    const hasCharge = comp.atomIds.some((id) => g.getAtom(id).charge);
    const real = hasCharge ? { fragment: null, stereo: null } : rxsRealize(g, comp.atomIds);
    (hasCharge ? ions : neutral).push({ smiles, size: comp.atomIds.length, charge, fragment: real.fragment, stereo: real.stereo });
  });
  const items = neutral.slice();
  if (ions.length) {
    ions.sort((p, q) => q.size - p.size);
    items.push({ smiles: ions.map((x) => x.smiles).join('.'), size: ions[0].size, fragment: null });
  }
  items.sort((p, q) => q.size - p.size);
  const out = [];
  items.forEach((item) => {
    const found = out.find((x) => x.smiles === item.smiles);
    if (found) {
      found.count += 1;
    } else {
      out.push(Object.assign({ smiles: item.smiles, isomericSmiles: rxIsomericSmiles(item), count: 1 }, item.fragment ? { fragment: item.fragment } : {}, item.stereo ? { stereo: item.stereo } : {}));
    }
  });
  return out;
}

function rxIsomericSmiles(item) {
  if (!item.fragment) {
    return item.smiles;
  }
  try {
    return reactionGraphProperties(reactionFragmentGraph(item.fragment)).isomericSmiles || item.smiles;
  } catch (error) {
    return item.smiles;
  }
}

function rxUse(entry, need) {
  return entry && entry.compound ? { compound: entry.compound, need } : null;
}

function rxNeutralName(info) {
  if (!info || !info.graph) {
    return '';
  }
  const g = rxCloneGraph(info.graph);
  const keep = new Set(info.ids);
  g.atoms.filter((a) => !keep.has(a.id)).map((a) => a.id).forEach((id) => g.removeAtom(id));
  g.atoms.forEach((a) => {
    if (a.charge === -1) {
      delete a.charge;
    }
  });
  const ids = g.atoms.map((a) => a.id);
  const formula = computeProperties(g, ids).formula;
  if (formula === 'H2O') {
    return 'H₂O';
  }
  try {
    return nameStructure(g, ids) || formula;
  } catch (error) {
    return formula;
  }
}

function rxSaltName(ctx, halogen) {
  const cation = ctx.get('cation');
  const metal = cation && cation.graph.getAtom(cation.ids[0]);
  return (metal && metal.element !== 'C' ? metal.element : 'M') + halogen;
}

function rxOutcome(id, name, type, g, reason, extra) {
  return Object.assign({ id, name, type, products: rxProductList(g), minor: [], byproducts: [], warnings: [], consumes: [], reason, score: 10 }, extra || {});
}

function rxHint(text) {
  return { hint: text };
}

function rxSpeciesTag(g, ids) {
  const props = computeProperties(g, ids);
  const tag = RX_FORMULA_TAGS[props.formula];
  if (tag && (!RX_FORMULA_GUARDS[props.formula] || RX_FORMULA_GUARDS[props.formula](g, ids))) {
    return { tag, formula: props.formula };
  }
  for (const detect of RX_SPECIES_DETECTORS) {
    const found = detect(g, ids, props);
    if (found) {
      return Object.assign({ formula: props.formula }, found);
    }
  }
  const anion = ids.map((id) => g.getAtom(id)).find((a) => a.charge === -1);
  if (anion && anion.element === 'O' && rxNeighbors(g, anion.id).length === 1 && rxNeighbors(g, anion.id)[0].atom.element === 'C') {
    const carbon = rxNeighbors(g, anion.id)[0].atom;
    return { tag: 'alkoxide', atom: anion.id, bulky: rxCarbonNeighbors(g, carbon.id).length >= 3, formula: props.formula };
  }
  if (anion && anion.element === 'N' && rxNeighbors(g, anion.id).length === 2) {
    return { tag: 'amideBase', atom: anion.id, formula: props.formula };
  }
  const mg = ids.map((id) => g.getAtom(id)).find((a) => a.element === 'Mg' || a.element === 'Li');
  if (mg) {
    const carbon = rxNeighbors(g, mg.id).find((n) => n.atom.element === 'C');
    if (carbon) {
      return { tag: 'grignard', metal: mg.id, carbon: carbon.atom.id, formula: props.formula };
    }
  }
  return null;
}

function reactionContext(compounds, conditions) {
  const c = normalizeReactionConditions(conditions);
  const ctx = {
    conditions: c,
    temperature: reactionEffectiveTemperature(c),
    species: new Map(),
    substrates: [],
    solventNucleophiles: [],
    organicCatalysts: [],
    protic: false,
    polarAprotic: false,
    light: c.energy === 'light',
  };
  ctx.has = (tag) => ctx.species.has(tag);
  ctx.get = (tag) => ctx.species.get(tag);
  const add = (tag, info) => {
    if (!ctx.species.has(tag)) {
      ctx.species.set(tag, info || {});
    }
  };
  const addSolventMolecule = (smiles) => {
    const g = reactionFragmentGraph(smilesToFragment(smiles));
    const info = rxAnalyze(g);
    if (smiles === 'O') {
      add('H2O', { graph: g, ids: g.atoms.map((a) => a.id) });
      ctx.protic = true;
      ctx.solventNucleophiles.push({ graph: g, atom: g.atoms[0].id, name: 'water' });
    } else if (info.alcohols.length) {
      ctx.protic = true;
      ctx.solventNucleophiles.push({ graph: g, atom: info.alcohols[0].o, name: smiles, alcohol: info.alcohols[0] });
    }
  };
  const scan = (fragment, compound) => {
    const g = reactionFragmentGraph(fragment);
    let organic = false;
    g.connectedComponents().forEach((comp) => {
      const tag = rxSpeciesTag(g, comp.atomIds);
      if (tag) {
        add(tag.tag, Object.assign({ graph: g, ids: comp.atomIds, compound }, tag));
      } else if (comp.atomIds.some((id) => g.getAtom(id).element === 'C')) {
        organic = true;
      }
    });
    return { g, organic };
  };
  const heteroarenes = [];
  (compounds || []).forEach((compound) => {
    if (!compound.fragment) {
      return;
    }
    if (compound.role === 'solvent') {
      addSolventMolecule(compound.smiles);
      scan(compound.fragment, compound);
      return;
    }
    const { g, organic } = scan(compound.fragment, compound);
    if (organic && compound.role !== 'catalyst') {
      const keep = new Set();
      g.connectedComponents().forEach((comp) => {
        if (!rxSpeciesTag(g, comp.atomIds) && comp.atomIds.some((id) => g.getAtom(id).element === 'C')) {
          comp.atomIds.forEach((id) => keep.add(id));
        }
      });
      g.atoms.filter((a) => !keep.has(a.id)).map((a) => a.id).forEach((id) => g.removeAtom(id));
      g.stereoSpecs = rxsCapture(g);
      g.alkeneSpecs = rxsCaptureAlkenes(g);
      ctx.substrates.push({ compound, graph: g, info: rxAnalyze(g) });
    } else if (organic) {
      ctx.organicCatalysts.push({ compound, graph: g, info: rxAnalyze(g) });
    } else if (compound.role === 'reactant') {
      heteroarenes.push({ compound, g });
    }
  });
  if (!ctx.substrates.length) {
    heteroarenes.forEach(({ compound, g }) => {
      const ring = rxAromaticRings(g).atoms;
      const keep = new Set();
      g.connectedComponents().forEach((comp) => {
        if (comp.atomIds.some((id) => ring.has(id)) && comp.atomIds.every((id) => !g.getAtom(id).charge)) {
          comp.atomIds.forEach((id) => keep.add(id));
        }
      });
      if (!keep.size) {
        return;
      }
      g.atoms.filter((a) => !keep.has(a.id)).map((a) => a.id).forEach((id) => g.removeAtom(id));
      g.stereoSpecs = rxsCapture(g);
      g.alkeneSpecs = rxsCaptureAlkenes(g);
      ctx.substrates.push({ compound, graph: g, info: rxAnalyze(g) });
    });
  }
  c.additives.forEach((id) => {
    const additive = reactionAdditive(id);
    (RX_ADDITIVE_TAGS[id] || []).forEach((tag) => add(tag));
    if (additive.smiles) {
      scan(smilesToFragment(additive.smiles), null);
    }
  });
  if (ctx.has('HBr') || ctx.has('HCl') || ctx.has('HI')) {
    add('strongAcid');
  }
  if (c.atmosphere === 'h2') {
    add('H2');
  }
  if (c.atmosphere === 'o2') {
    add('O2');
  }
  if (ctx.light) {
    add('light');
  }
  c.solvents.forEach((id) => {
    const solvent = reactionSolvent(id);
    if (solvent.protic) {
      ctx.protic = true;
    }
    if (['dmso', 'dmf', 'mecn', 'acetone'].includes(id)) {
      ctx.polarAprotic = true;
    }
    if (solvent.smiles) {
      addSolventMolecule(solvent.smiles);
    }
  });
  if (ctx.has('H2O')) {
    ctx.protic = true;
  }
  return ctx;
}

function rxRuleHydrogenation(ctx) {
  if (!ctx.has('H2')) {
    return [];
  }
  const lindlar = ctx.has('lindlar');
  const catalyst = lindlar || ctx.has('hydrogenationCatalyst');
  return ctx.substrates.flatMap((s) => {
    const { alkenes, alkynes } = s.info;
    if (!alkenes.length && !alkynes.length) {
      return s.info.aromatic.rings.length ? [rxHint('Aromatic rings resist catalytic hydrogenation under ordinary conditions.')] : [];
    }
    if (!catalyst) {
      return [rxHint('H₂ does not add to C=C or C≡C by itself — add a metal catalyst (Pd/C, PtO₂ or Raney Ni).')];
    }
    const g = rxCloneGraph(s.graph);
    if (lindlar) {
      if (!alkynes.length) {
        return [rxHint('Lindlar catalyst is poisoned so that it only reduces alkynes; this substrate has none.')];
      }
      alkynes.forEach((x) => {
        rxSetOrder(g, x.a, x.b, 2);
        rxsAlkene(g, x.a, x.b, null, null, true);
      });
      return [rxOutcome('lindlar', 'Lindlar hydrogenation', 'Reduction', g,
        'The poisoned Pd catalyst stops at the alkene. H₂ adds syn across the triple bond, so the product is the cis (Z) alkene.',
        { consumes: [rxUse(s, 1), rxUse(ctx.get('H2'), alkynes.length)] })];
    }
    alkenes.concat(alkynes).forEach((x) => rxSetOrder(g, x.a, x.b, 1));
    rxsFaceAdd(g, [], new Map(alkenes.flatMap((x) => [[x.a, 1], [x.b, 1]])));
    const out = rxOutcome('hydrogenation', 'Catalytic hydrogenation', 'Addition (reduction)', g,
      'H₂ adds syn to every C=C and C≡C on the metal surface. Aromatic rings and C=O groups survive under these conditions.',
      { consumes: [rxUse(s, 1), rxUse(ctx.get('H2'), alkenes.length + 2 * alkynes.length)] });
    if (s.info.carbonyls.length) {
      out.warnings.push('Carbonyl groups are left untouched; use NaBH₄ or LiAlH₄ to reduce them.');
    }
    return [out];
  });
}

function rxRuleHalogenAddition(ctx) {
  const halogen = ['Br2', 'Cl2'].find((t) => ctx.has(t));
  if (!halogen || ctx.has('lewis') && ctx.substrates.every((s) => !s.info.alkenes.length && !s.info.alkynes.length)) {
    return ctx.has('I2') ? [rxHint('I₂ adds to alkenes reversibly and the diiodide usually falls apart again.')] : [];
  }
  const x = halogen === 'Br2' ? 'Br' : 'Cl';
  const water = ctx.has('H2O');
  return ctx.substrates.flatMap((s) => {
    const { alkenes, alkynes } = s.info;
    const g = rxCloneGraph(s.graph);
    if (alkenes.length) {
      const e = rxMostSubstitutedAlkene(g, alkenes);
      rxSetOrder(g, e.a, e.b, 1);
      const out = water
        ? (() => {
          const m = rxMarkovnikov(g, e.a, e.b);
          const o = rxAttach(g, 'O', m.more);
          const xl = rxAttach(g, x, m.less);
          rxsFaceAdd(g, [[m.more, o.id, 1], [m.less, xl.id, -1]]);
          return rxOutcome('halohydrin', 'Halohydrin formation', 'Electrophilic addition', g,
            'The alkene attacks ' + halogen + ' to give a cyclic halonium ion. Water, present in large excess, opens it at the more substituted carbon, so OH ends up there and ' + x + ' on the other carbon, anti to each other.',
            { byproducts: ['H' + x], consumes: [rxUse(s, 1), rxUse(ctx.get(halogen), 1)] });
        })()
        : (() => {
          const xa = rxAttach(g, x, e.a);
          const xb = rxAttach(g, x, e.b);
          rxsFaceAdd(g, [[e.a, xa.id, 1], [e.b, xb.id, -1]]);
          return rxOutcome('halogenation', halogen === 'Br2' ? 'Bromination of an alkene' : 'Chlorination of an alkene', 'Electrophilic addition', g,
            'The π bond attacks ' + halogen + ' to form a cyclic halonium ion; ' + x + '⁻ then opens it from the back face, so the two ' + x + ' atoms add anti.',
            { consumes: [rxUse(s, 1), rxUse(ctx.get(halogen), 1)] });
        })();
      out.score = 12;
      if (alkenes.length > 1) {
        out.warnings.push('Only the most substituted C=C is shown reacting (1 equivalent).');
      }
      return [out];
    }
    if (alkynes.length) {
      const e = alkynes[0];
      rxSetOrder(g, e.a, e.b, 2);
      const xa = rxAttach(g, x, e.a);
      const xb = rxAttach(g, x, e.b);
      rxsAlkene(g, e.a, e.b, xa.id, xb.id, false);
      return [rxOutcome('halogenation-alkyne', 'Halogenation of an alkyne', 'Electrophilic addition', g,
        'One equivalent of ' + halogen + ' adds anti across the triple bond to give the (E)-dihaloalkene; a second equivalent would give the tetrahalide.', { score: 11, consumes: [rxUse(s, 1), rxUse(ctx.get(halogen), 1)] })];
    }
    return [];
  });
}

function rxRuleHydrohalogenation(ctx) {
  const acid = ['HBr', 'HCl', 'HI'].find((t) => ctx.has(t));
  if (!acid) {
    return [];
  }
  const x = acid.slice(1);
  const radical = acid === 'HBr' && (ctx.has('radicalInitiator') || ctx.has('light') || ctx.has('hydrogenPeroxide'));
  return ctx.substrates.flatMap((s) => {
    const { alkenes, alkynes } = s.info;
    const g = rxCloneGraph(s.graph);
    const target = alkenes.length ? rxMostSubstitutedAlkene(g, alkenes) : alkynes[0];
    if (!target) {
      return [];
    }
    const m = rxMarkovnikov(g, target.a, target.b);
    rxSetOrder(g, target.a, target.b, alkenes.length ? 1 : 2);
    const shift = !radical && alkenes.length ? rxCationShift(g, m.more) : null;
    const halogen = rxAttach(g, x, radical ? m.less : m.more);
    const plain = shift ? rxCloneGraph(g) : null;
    if (shift) {
      rxApplyShift(g, m.more, shift, halogen.id);
    }
    const out = radical
      ? rxOutcome('hbr-radical', 'Anti-Markovnikov HBr addition', 'Radical addition', g,
        'The peroxide or light makes Br• radicals. Br• adds to the less substituted carbon so that the more stable radical forms, which puts Br on the less substituted carbon (anti-Markovnikov).', { score: 13 })
      : rxOutcome('hydrohalogenation', 'Hydrohalogenation (' + acid + ')', 'Electrophilic addition', g,
        'H⁺ adds to the less substituted carbon to give the more stable carbocation, and ' + x + '⁻ bonds to it (Markovnikov).', { score: 12 });
    out.consumes = [rxUse(s, 1), rxUse(ctx.get(acid), 1)];
    if (!radical && alkenes.length) {
      out.mechanism = rxCationMechanism(s.graph, { c: m.more, pi: { a: target.a, b: target.b, text: 'H–' + x }, shift, capture: x + '⁻',
        caption: 'The C=C takes H⁺ from H' + x + ' at the less substituted carbon; ' + (shift ? 'the carbocation rearranges, then ' : '') + x + '⁻ adds to the cation.' });
    }
    if (shift) {
      out.reason += ' Here the secondary carbocation first rearranges by a ' + rxShiftText(shift) + ' to a more stable tertiary carbocation, so ' + x + ' ends up on the neighbouring carbon.';
      out.minor = rxProductList(plain);
      out.warnings.push('Some unrearranged product forms when ' + x + '⁻ captures the secondary cation before it shifts.');
    }
    if (!alkenes.length) {
      out.name += ' of an alkyne';
      out.reason += ' With one equivalent the product stops at the vinyl halide.';
    }
    if (m.tie && !radical) {
      out.warnings.push('Both alkene carbons are equally substituted, so a mixture of regioisomers is expected.');
    }
    if (!radical && acid !== 'HBr' && (ctx.has('radicalInitiator') || ctx.has('light'))) {
      out.warnings.push('The peroxide effect only works with HBr; ' + acid + ' still adds Markovnikov.');
    }
    if (!radical && !shift && rxCarbonNeighbors(g, m.more).some((n) => rxSubstitution(g, n.atom.id, m.more) > rxSubstitution(g, m.more, n.atom.id))) {
      out.warnings.push('A neighbouring carbon is more substituted, so a hydride or methyl shift of the carbocation may give a rearranged product.');
    }
    return [out];
  });
}

function rxRuleHydration(ctx) {
  if (!ctx.has('H2O')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const { alkenes, alkynes } = s.info;
    if (!alkenes.length && !alkynes.length) {
      return [];
    }
    if (!ctx.has('strongAcid')) {
      return [rxHint('Water alone does not add to C=C — an acid catalyst (H₂SO₄ or H₃PO₄) is needed for hydration.')];
    }
    const g = rxCloneGraph(s.graph);
    if (alkenes.length) {
      const e = rxMostSubstitutedAlkene(g, alkenes);
      const m = rxMarkovnikov(g, e.a, e.b);
      rxSetOrder(g, e.a, e.b, 1);
      rxAttach(g, 'O', m.more);
      const out = rxOutcome('hydration', 'Acid-catalysed hydration', 'Electrophilic addition', g,
        'H⁺ adds to give the more stable carbocation, water attacks it, and loss of H⁺ leaves the Markovnikov alcohol.');
      if (ctx.temperature >= 100) {
        out.warnings.push('At high temperature the equilibrium shifts back towards the alkene (dehydration).');
      }
      return [out];
    }
    if (!ctx.has('mercury')) {
      return [rxHint('Alkyne hydration needs HgSO₄ as well as aqueous acid.')];
    }
    const e = alkynes[0];
    const m = rxMarkovnikov(g, e.a, e.b);
    rxSetOrder(g, e.a, e.b, 1);
    rxAttach(g, 'O', m.more, 2);
    return [rxOutcome('alkyne-hydration', 'Hg²⁺-catalysed alkyne hydration', 'Electrophilic addition', g,
      'Water adds Markovnikov across the triple bond to give an enol, which tautomerises to the ketone (a methyl ketone from a terminal alkyne).', { score: 11 })];
  });
}

function rxRuleHydroboration(ctx) {
  if (!ctx.has('borane')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    if (!s.info.alkenes.length) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    const e = rxMostSubstitutedAlkene(g, s.info.alkenes);
    const m = rxMarkovnikov(g, e.a, e.b);
    rxSetOrder(g, e.a, e.b, 1);
    const o = rxAttach(g, 'O', m.less);
    rxsFaceAdd(g, [[m.less, o.id, 1]], new Map([[m.more, 1]]));
    const out = rxOutcome('hydroboration', 'Hydroboration–oxidation', 'Addition', g,
      'BH₃ adds H and B syn in one step, with boron going to the less hindered carbon. Oxidation replaces B with OH, which gives the anti-Markovnikov alcohol.',
      { score: 12, byproducts: ['B(OH)₃ (from the oxidation)'], consumes: [rxUse(s, 1), rxUse(ctx.get('borane'), 1 / 3)] });
    if (!ctx.has('hydroxide') || !ctx.has('hydrogenPeroxide')) {
      out.warnings.push('Assumes the usual oxidative work-up (H₂O₂, NaOH) after the borane step.');
    }
    return [out];
  });
}

function rxRuleEpoxidation(ctx) {
  if (!ctx.has('mcpba')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    if (!s.info.alkenes.length) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    const e = rxMostSubstitutedAlkene(g, s.info.alkenes);
    rxSetOrder(g, e.a, e.b, 1);
    const o = rxAttach(g, 'O', e.a);
    g.addBond(o.id, e.b);
    rxsFaceAdd(g, [[e.a, o.id, 1], [e.b, o.id, 1]]);
    return [rxOutcome('epoxidation', 'Epoxidation (mCPBA)', 'Oxidation', g,
      'The peroxyacid delivers one O atom to the C=C in a single concerted step, so the alkene’s geometry is kept in the epoxide.',
      { score: 12, byproducts: ['3-chlorobenzoic acid'], consumes: [rxUse(s, 1), rxUse(ctx.get('mcpba'), 1)] })];
  });
}

function rxRuleOzonolysis(ctx) {
  if (!ctx.has('ozone')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    if (!s.info.alkenes.length) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    s.info.alkenes.forEach((e) => {
      rxSetOrder(g, e.a, e.b, 0);
      rxAttach(g, 'O', e.a, 2);
      rxAttach(g, 'O', e.b, 2);
    });
    return [rxOutcome('ozonolysis', 'Ozonolysis', 'Oxidative cleavage', g,
      'O₃ adds across the C=C to give an ozonide, which a reductive work-up (Zn or Me₂S) splits into two carbonyl compounds.',
      { score: 12, byproducts: ['DMSO or ZnO (from the Me₂S or Zn work-up)'], consumes: [rxUse(s, 1), rxUse(ctx.get('ozone'), s.info.alkenes.length)], warnings: ['Assumes a reductive work-up; an oxidative work-up (H₂O₂) would turn aldehydes into carboxylic acids.'] })];
  });
}

function rxOxidizeAlcohol(g, alcohol, strong) {
  rxSetOrder(g, alcohol.c, alcohol.o, 2);
  if (strong && alcohol.degree <= 1) {
    rxAttach(g, 'O', alcohol.c);
  }
}

function rxRuleOxidation(ctx) {
  const permanganate = ctx.has('permanganate');
  if (!permanganate && !ctx.has('pcc')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const out = [];
    const oxidizable = s.info.alcohols.filter((a) => a.degree < 3);
    if (oxidizable.length) {
      const g = rxCloneGraph(s.graph);
      oxidizable.forEach((a) => rxOxidizeAlcohol(g, a, permanganate));
      out.push(rxOutcome(permanganate ? 'oxidation-kmno4' : 'oxidation-pcc', permanganate ? 'Oxidation with KMnO₄' : 'PCC oxidation', 'Oxidation', g,
        permanganate
          ? 'KMnO₄ is a strong oxidant: secondary alcohols become ketones and primary alcohols go all the way to carboxylic acids.'
          : 'PCC is a mild, anhydrous oxidant: primary alcohols stop at the aldehyde and secondary alcohols give ketones.',
        { score: 12, byproducts: permanganate ? ['MnO₂'] : ['Cr(IV) species', 'pyridinium chloride'],
          consumes: [rxUse(s, 1), rxUse(ctx.get(permanganate ? 'permanganate' : 'pcc'), permanganate ? oxidizable.reduce((n, a) => n + (a.degree <= 1 ? 4 / 3 : 2 / 3), 0) : oxidizable.length)] }));
    } else if (s.info.alcohols.length) {
      out.push(rxHint('Tertiary alcohols have no H on the carbinol carbon, so they are not oxidised.'));
    }
    if (permanganate && s.info.alkenes.length && !oxidizable.length) {
      const g = rxCloneGraph(s.graph);
      if (ctx.temperature <= RX_TEMPERATURES.coldPermanganate) {
        s.info.alkenes.forEach((e) => {
          rxSetOrder(g, e.a, e.b, 1);
          const oa = rxAttach(g, 'O', e.a);
          const ob = rxAttach(g, 'O', e.b);
          rxsFaceAdd(g, [[e.a, oa.id, 1], [e.b, ob.id, 1]]);
        });
        out.push(rxOutcome('dihydroxylation', 'Syn-dihydroxylation', 'Oxidation', g,
          'Cold, dilute KMnO₄ adds across the C=C through a cyclic manganate ester, so both OH groups add syn to give a 1,2-diol.',
          { score: 12, byproducts: ['MnO₂'], consumes: [rxUse(s, 1), rxUse(ctx.get('permanganate'), 2 / 3 * s.info.alkenes.length)] }));
      } else {
        const removed = [];
        s.info.alkenes.forEach((e) => {
          const before = [e.a, e.b].map((id) => ({ id, h: rxHydrogens(g, id), terminal: rxNeighbors(g, id).length === 1 }));
          rxSetOrder(g, e.a, e.b, 0);
          before.forEach(({ id, h, terminal }) => {
            if (h >= 2 && terminal) {
              removed.push(id);
              return;
            }
            rxAttach(g, 'O', id, 2);
            if (h >= 1) {
              rxAttach(g, 'O', id);
            }
          });
        });
        removed.forEach((id) => g.removeAtom(id));
        out.push(rxOutcome('permanganate-cleavage', 'Oxidative cleavage (hot KMnO₄)', 'Oxidative cleavage', g,
          'Hot, concentrated KMnO₄ cuts the C=C completely. Carbons that carried H become carboxylic acids, fully substituted carbons become ketones and a terminal CH₂ is lost as CO₂.',
          { score: 12, byproducts: ['MnO₂'].concat(removed.length ? ['CO₂'] : []) }));
      }
    }
    if (permanganate && !oxidizable.length && !s.info.alkenes.length) {
      const ring = s.info.aromatic.atoms;
      const benzylic = s.graph.atoms.filter((a) => a.element === 'C' && !ring.has(a.id) && rxIsSp3(s.graph, a.id) &&
        rxHydrogens(s.graph, a.id) > 0 && rxNeighbors(s.graph, a.id).some((n) => ring.has(n.atom.id)));
      if (benzylic.length) {
        const g = rxCloneGraph(s.graph);
        benzylic.forEach((a) => {
          rxCarbonNeighbors(g, a.id).filter((n) => !ring.has(n.atom.id)).forEach((n) => rxSetOrder(g, a.id, n.atom.id, 0));
        });
        const keep = new Set();
        const stack = [...ring];
        while (stack.length) {
          const id = stack.pop();
          if (!keep.has(id)) {
            keep.add(id);
            rxNeighbors(g, id).forEach((n) => stack.push(n.atom.id));
          }
        }
        g.atoms.filter((a) => !keep.has(a.id)).map((a) => a.id).forEach((id) => g.removeAtom(id));
        benzylic.forEach((a) => {
          rxAttach(g, 'O', a.id, 2);
          rxAttach(g, 'O', a.id);
        });
        out.push(rxOutcome('side-chain-oxidation', 'Side-chain oxidation', 'Oxidation', g,
          'Hot KMnO₄ attacks the benzylic C–H. Whatever the length of the alkyl chain, it is cut back to a carboxylic acid on the ring.', { score: 11, byproducts: ['MnO₂', 'CO₂ (from any extra chain carbons)'] }));
      }
    }
    return out;
  });
}

function rxRuleReduction(ctx) {
  const strong = ctx.has('alanate');
  if (!strong && !ctx.has('borohydride')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const g = rxCloneGraph(s.graph);
    let changed = false;
    let hydride = 0;
    const skipped = [];
    s.info.carbonyls.forEach((c) => {
      if (c.kind === 'aldehyde' || c.kind === 'ketone') {
        rxSetOrder(g, c.c, c.o, 1);
        hydride += 1;
        changed = true;
      } else if (!strong) {
        skipped.push(c.kind);
      } else if (c.kind === 'acid' || c.kind === 'acylChloride') {
        g.removeAtom(c.hetero);
        rxSetOrder(g, c.c, c.o, 1);
        hydride += c.kind === 'acid' ? 3 : 2;
        changed = true;
      } else if (c.kind === 'ester') {
        rxSetOrder(g, c.c, c.hetero, 0);
        rxSetOrder(g, c.c, c.o, 1);
        hydride += 2;
        changed = true;
      } else if (c.kind === 'amide') {
        g.removeAtom(c.o);
        hydride += 2;
        changed = true;
      }
    });
    if (strong) {
      s.info.nitriles.forEach((n) => {
        rxSetOrder(g, n.c, n.n, 1);
        hydride += 2;
        changed = true;
      });
    }
    if (!changed) {
      return skipped.length ? [rxHint('NaBH₄ is too mild to reduce esters, acids or amides — use LiAlH₄.')] : [];
    }
    const felkin = rxFelkinPair(g, s.info.carbonyls.filter((c) => c.kind === 'ketone' || c.kind === 'aldehyde'), () => null);
    const simple = s.info.carbonyls.length === 1 && ['ketone', 'aldehyde'].includes(s.info.carbonyls[0].kind) && !(strong && s.info.nitriles.length) ? s.info.carbonyls[0] : null;
    const mechanism = simple ? rxMechanism(g, { anchor: simple.c, orders: [[simple.c, simple.o, 2]], add: [{ key: 'h', text: 'H⁻', from: simple.c, away: simple.o, distance: 1.6 }],
      arrows: [{ from: 'h', to: simple.c }, { from: [simple.c, simple.o], to: simple.o }],
      intermediate: { charges: [[simple.o, -1]], hydrogens: [simple.c], label: 'tetrahedral alkoxide' },
      caption: 'Hydride adds to the C=O carbon; the π electrons move onto oxygen, giving a tetrahedral alkoxide that is protonated to the alcohol on work-up.' }) : null;
    const out = rxOutcome(strong ? 'reduction-lialh4' : 'reduction-nabh4', strong ? 'LiAlH₄ reduction' : 'NaBH₄ reduction', 'Reduction', g,
      strong
        ? 'Hydride from LiAlH₄ attacks each carbonyl carbon. Aldehydes and ketones give alcohols; acids and esters give primary alcohols (an ester also releases its alcohol part); amides give amines and nitriles give primary amines.'
        : 'Hydride from NaBH₄ adds to the C=O carbon and the alkoxide is protonated on work-up. Aldehydes give primary alcohols and ketones give secondary alcohols.',
      { score: 12, mechanism, byproducts: [strong ? 'aluminium and lithium salts (after work-up)' : 'borate salts (after work-up)'],
        consumes: [rxUse(s, 1), rxUse(ctx.get(strong ? 'alanate' : 'borohydride'), hydride / 4)] });
    rxFelkinApply(out, felkin, 'hydride');
    out.warnings.push('Each ' + (strong ? 'AlH₄⁻' : 'BH₄⁻') + ' can deliver four hydrides, so ' + (Math.round(hydride / 4 * 100) / 100) + ' equiv is the theoretical minimum; in practice ' +
      (strong ? '1–2 equiv of LiAlH₄ is' : '1–2 equiv of NaBH₄ is') + ' used, because some hydride is lost to the solvent or moisture.');
    if (skipped.length) {
      out.warnings.push('Ester, acid or amide groups are left untouched by NaBH₄.');
    }
    if (strong && ctx.protic) {
      out.warnings.push('LiAlH₄ reacts violently with water and alcohols — run it in dry ether or THF and add water only in the work-up.');
    }
    if (s.info.alkenes.length) {
      out.warnings.push('Isolated C=C bonds are not reduced by metal hydrides.');
    }
    if (!strong && ctx.substrates.some((x) => x !== s && x.info.amines.some((a) => a.h >= 1))) {
      out.warnings.push('NaBH₄ reduces the aldehyde or ketone before the imine can form; for a reductive amination use NaBH₃CN or NaBH(OAc)₃, or form the imine first and then add NaBH₄.');
    }
    return [out];
  });
}

function rxFelkinPair(g, carbonyls, nucleophile) {
  if (carbonyls.length !== 1) {
    return null;
  }
  const c = carbonyls[0];
  const minor = rxCloneGraph(g);
  const info = rxsFelkin(g, c.c, c.o, nucleophile(), false);
  if (!info) {
    return null;
  }
  rxsFelkin(minor, c.c, c.o, nucleophile(), true);
  return Object.assign({ minor }, info);
}

function rxFelkinApply(out, felkin, nucleophile) {
  if (!felkin) {
    return;
  }
  out.minor = rxProductList(felkin.minor);
  out.ratio = [75, 25];
  out.reason += ' The neighbouring stereocentre makes the two faces of the C=O different (Felkin–Anh): the largest group' + (felkin.polar ? ' (here the electronegative one)' : '') +
    ' sits perpendicular to the C=O, and ' + nucleophile + ' comes in anti to it, past the smallest group. That gives the Felkin diastereomer as the major product.';
  out.warnings.push('The anti-Felkin diastereomer forms as a minor product; selectivity is typically only 2:1 to 5:1.');
  if (felkin.polar && nucleophile !== 'hydride') {
    out.warnings.push('An α-OR or α-NR₂ group can chelate Mg²⁺ with the C=O oxygen, which locks the other conformation and can reverse the selectivity (Cram chelate model).');
  }
}

function rxRuleEpoxideOpening(ctx) {
  const substrates = ctx.substrates.filter((s) => s.info.epoxides.length);
  if (!substrates.length) {
    return [];
  }
  const hx = ['HBr', 'HCl', 'HI'].find((t) => ctx.has(t));
  const acid = Boolean(hx) || ctx.has('strongAcid');
  const anion = rxNucleophiles(ctx).find((n) => n.tag !== 'amideBase');
  const hydride = ctx.has('alanate');
  return substrates.flatMap((s) => {
    const e = s.info.epoxides[0];
    const sa = rxSubstitution(s.graph, e.a, e.b);
    const sb = rxSubstitution(s.graph, e.b, e.a);
    const more = sa >= sb ? e.a : e.b;
    const less = more === e.a ? e.b : e.a;
    let nuc = null;
    let attacked = less;
    let mode = 'basic';
    if (acid) {
      nuc = hx ? { halogen: hx.slice(1), name: hx.slice(1) === 'Br' ? 'bromide' : hx.slice(1) === 'Cl' ? 'chloride' : 'iodide' } : ctx.solventNucleophiles[0];
      if (!nuc) {
        return [rxHint('Acid-catalysed epoxide opening needs a nucleophile, such as water, an alcohol or HX.')];
      }
      attacked = more;
      mode = 'acid';
    } else if (hydride) {
      mode = 'hydride';
    } else if (anion) {
      nuc = anion;
    } else {
      return [];
    }
    const other = attacked === e.a ? e.b : e.a;
    const g = rxCloneGraph(s.graph);
    rxSetOrder(g, attacked, e.o, 0);
    let nuId = null;
    if (mode === 'acid' && nuc.halogen) {
      nuId = rxAttach(g, nuc.halogen, attacked).id;
    } else if (nuc) {
      const comp = nuc.graph.connectedComponents().find((c) => c.atomIds.includes(nuc.atom)).atomIds;
      const map = rxMerge(g, nuc.graph, comp);
      const atom = g.getAtom(map.get(nuc.atom));
      if (atom.charge === -1) {
        delete atom.charge;
      }
      g.addBond(atom.id, attacked);
      nuId = atom.id;
    }
    const inputAt = (id) => {
      const spec = rxsSpecAt(s.graph, id);
      return spec && spec.origin === 'input' ? spec : null;
    };
    if (inputAt(e.a) || inputAt(e.b)) {
      const all = s.graph.atoms.map((a) => a.id);
      if (rxsIsMeso(s.graph, all, findStereocenters(s.graph, all))) {
        g.stereoSpecs.forEach((x) => {
          x.origin = 'new';
        });
      }
      const spec = rxsSpecAt(g, attacked);
      if (spec && nuId === null && spec.ids.includes(null)) {
        rxsDrop(g, attacked);
      } else {
        rxsReplace(g, attacked, e.o, nuId, true);
      }
    } else if (nuId !== null && rxRings(s.graph, 8).some((r) => r.includes(e.a) && r.includes(e.b) && !r.includes(e.o))) {
      rxsFaceAdd(g, [[other, e.o, 1], [attacked, nuId, -1]]);
    }
    const nucName = mode === 'hydride' ? 'Hydride' : nuc.name === 'O' ? 'Water' : /^C+O$/.test(nuc.name) ? 'The alcohol' : nuc.name.charAt(0).toUpperCase() + nuc.name.slice(1);
    const reason = mode === 'acid'
      ? 'Acid protonates the epoxide oxygen. The C–O bond to the more substituted carbon is longer and carries more positive charge, so ' + nucName.toLowerCase() + ' attacks that carbon, from the back face. The two groups end up anti (trans).'
      : mode === 'hydride'
        ? 'LiAlH₄ delivers hydride to the less hindered epoxide carbon (Sₙ2), so the OH is left on the more substituted carbon.'
        : nucName + ' opens the strained ring by direct Sₙ2 attack at the less hindered carbon, from the face opposite the oxygen. That carbon is inverted and the product is the trans (anti) alcohol after work-up.';
    const mechanism = nuId !== null ? rxMechanism(g, { anchor: attacked, remove: [[nuId, attacked]], orders: [[attacked, e.o, 1]],
      charges: mode === 'acid' ? [[e.o, 1]] : nuc.halogen || ctx.solventNucleophiles.includes(nuc) ? [] : [[nuId, -1]],
      arrows: [{ from: nuId, to: attacked }, { from: [attacked, e.o], to: e.o }],
      caption: mode === 'acid' ? 'The protonated epoxide is opened at the carbon that best carries positive charge.' : 'Sₙ2 at the less hindered carbon; ring strain drives the C–O bond to break.' }) : null;
    const out = rxOutcome(mode === 'acid' ? 'epoxide-acid' : 'epoxide-base', mode === 'acid' ? 'Acid-catalysed epoxide opening' : 'Epoxide ring opening', 'Nucleophilic ring opening', g, reason,
      { score: 13, mechanism, consumes: [rxUse(s, 1), mode === 'hydride' ? rxUse(ctx.get('alanate'), 1 / 4) : mode === 'acid' && nuc.halogen ? rxUse(ctx.get(hx), 1) : nuc && !ctx.solventNucleophiles.includes(nuc) ? rxUse(ctx.get(nuc.tag), 1) : null] });
    if (mode === 'acid' && sa === sb && rxsClasses(s.graph, s.graph.atoms.map((a) => a.id)).get(e.a) !== rxsClasses(s.graph, s.graph.atoms.map((a) => a.id)).get(e.b)) {
      out.warnings.push('Both epoxide carbons are equally substituted, so a mixture of regioisomers forms.');
    } else if (mode === 'acid' && Math.max(sa, sb) < 2) {
      out.warnings.push('With only primary and secondary carbons, some attack at the less substituted carbon also happens under acid.');
    }
    if (mode === 'hydride' && ctx.protic) {
      out.warnings.push('LiAlH₄ reacts violently with water and alcohols — run it in dry ether or THF and add water only in the work-up.');
    }
    return [out];
  });
}

function rxRuleDissolvingMetal(ctx) {
  if (!ctx.has('dissolvingMetal')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const internal = s.info.alkynes.filter((x) => rxCarbonNeighbors(s.graph, x.a, x.b).length && rxCarbonNeighbors(s.graph, x.b, x.a).length);
    if (!internal.length) {
      return s.info.alkynes.length ? [rxHint('Na/NH₃ just deprotonates a terminal alkyne; the trans reduction needs an internal C≡C.')]
        : s.info.alkenes.length ? [rxHint('Na/NH₃ does not reduce isolated C=C bonds.')] : [];
    }
    const g = rxCloneGraph(s.graph);
    internal.forEach((x) => {
      rxSetOrder(g, x.a, x.b, 2);
      rxsAlkene(g, x.a, x.b, null, null, false);
    });
    return [rxOutcome('dissolving-metal', 'Dissolving-metal reduction', 'Reduction', g,
      'Na gives an electron to the triple bond to make a radical anion, which NH₃ protonates; a second electron and proton follow. The vinyl radical and anion are most stable with the two groups trans, so the product is the (E) alkene, the opposite of Lindlar’s cis.',
      { score: 13, byproducts: ['NaNH₂'], consumes: [rxUse(s, 1)] })];
  });
}

function rxRuleGrignard(ctx) {
  const reagent = ctx.get('grignard');
  if (!reagent) {
    return [];
  }
  const quench = ctx.protic || ctx.substrates.some((s) => s.info.alcohols.length || s.info.carbonyls.some((c) => c.kind === 'acid'));
  const rGraph = rxCloneGraph(reagent.graph);
  rxNeighbors(rGraph, reagent.metal).forEach((n) => {
    if (n.atom.id !== reagent.carbon) {
      rGraph.removeAtom(n.atom.id);
    }
  });
  rGraph.removeAtom(reagent.metal);
  const rIds = rGraph.connectedComponents().find((comp) => comp.atomIds.includes(reagent.carbon)).atomIds;
  if (quench) {
    const g = new Graph();
    rxMerge(g, rGraph, rIds);
    return [rxOutcome('grignard-quench', 'Grignard reagent destroyed', 'Acid–base', g,
      'Grignard reagents are very strong bases. Any O–H in the flask (water, an alcohol or an acid) protonates the carbanion before it can attack the carbonyl, leaving just the alkane.',
      { score: 14, byproducts: ['Mg(OH)X salts'], warnings: ['Use a dry ether solvent (Et₂O or THF) under N₂ and add acid only in the work-up.'] })];
  }
  return ctx.substrates.flatMap((s) => {
    const target = s.info.carbonyls.find((c) => c.kind === 'aldehyde' || c.kind === 'ketone') || s.info.carbonyls.find((c) => c.kind === 'ester');
    if (!target) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    let added = null;
    const addR = () => {
      const map = rxMerge(g, rGraph, rIds);
      added = map.get(reagent.carbon);
      g.addBond(added, target.c);
    };
    let reason = 'The carbanion carbon of the Grignard reagent attacks the C=O carbon. Acidic work-up then protonates the alkoxide, giving ' +
      (target.kind === 'aldehyde' ? (rxHydrogens(s.graph, target.c) >= 2 ? 'a primary alcohol (from formaldehyde).' : 'a secondary alcohol.') : 'a tertiary alcohol.');
    if (target.kind === 'ester') {
      rxSetOrder(g, target.c, target.hetero, 0);
      addR();
      addR();
      reason = 'The first equivalent adds and expels the alkoxide to give a ketone, which is more reactive than the ester and takes a second equivalent. The result is a tertiary alcohol with two identical R groups.';
    } else {
      addR();
    }
    rxSetOrder(g, target.c, target.o, 1);
    const felkin = target.kind === 'ester' ? null : rxFelkinPair(g, [target], () => added);
    const mechanism = target.kind === 'ester' ? null : rxMechanism(g, { anchor: target.c, remove: [[added, target.c]], orders: [[target.c, target.o, 2]], charges: [[added, -1]],
      add: [{ key: 'mg', text: '⁺MgX', from: added, away: target.c, distance: 1.1 }], intermediate: { charges: [[target.o, -1]], label: 'magnesium alkoxide' },
      arrows: [{ from: added, to: target.c }, { from: [target.c, target.o], to: target.o }], caption: 'The C–Mg carbon acts as a carbanion and adds to the C=O carbon.' });
    const out = rxOutcome('grignard', 'Grignard addition', 'Nucleophilic addition', g, reason,
      { score: 13, mechanism, byproducts: ['Mg salts (MgX₂ / Mg(OH)X after acidic work-up)'], consumes: [rxUse(s, 1), rxUse(reagent, target.kind === 'ester' ? 2 : 1)] });
    rxFelkinApply(out, felkin, 'the Grignard carbon');
    if (target.kind === 'ester') {
      out.warnings.push('The double addition uses 2 equivalents of Grignard reagent; a slight excess (2.2–3 equiv) is normally added.');
    }
    return [out];
  });
}

function rxRuleAlcoholToHalide(ctx) {
  const reagent = ['socl2', 'pbr3', 'HBr', 'HCl', 'HI'].find((t) => ctx.has(t));
  if (!reagent) {
    return [];
  }
  const x = { socl2: 'Cl', pbr3: 'Br', HBr: 'Br', HCl: 'Cl', HI: 'I' }[reagent];
  return ctx.substrates.flatMap((s) => {
    if (!s.info.alcohols.length || ((reagent === 'HBr' || reagent === 'HCl' || reagent === 'HI') && (s.info.alkenes.length || s.info.alkynes.length))) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    const inversion = reagent === 'pbr3' || (reagent === 'socl2' && ctx.has('amineBase'));
    s.info.alcohols.forEach((a) => {
      g.getAtom(a.o).element = x;
      const acid = reagent !== 'socl2' && reagent !== 'pbr3';
      if (acid && a.degree >= 2) {
        rxsDrop(g, a.c);
      } else if (acid || inversion) {
        rxsReplace(g, a.c, a.o, a.o, true);
      }
    });
    const tertiary = s.info.alcohols.some((a) => a.degree === 3);
    const acidic = reagent !== 'socl2' && reagent !== 'pbr3';
    const alcohol = s.info.alcohols[0];
    const single = acidic && s.info.alcohols.length === 1 && alcohol.degree >= 2;
    const shift = single && alcohol.degree === 2 ? rxCationShift(s.graph, alcohol.c) : null;
    const plain = shift ? rxCloneGraph(g) : null;
    if (shift) {
      rxApplyShift(g, alcohol.c, shift, alcohol.o);
    }
    const reason = reagent === 'socl2'
      ? 'SOCl₂ turns OH into a chlorosulfite leaving group, which chloride displaces; SO₂ and HCl bubble off.' +
        (ctx.has('amineBase') ? ' With pyridine present, free Cl⁻ attacks from the back (Sₙ2), so a stereocentre is inverted.' : ' Without a base the chloride is delivered from the same face (Sₙi), so a stereocentre keeps its configuration.')
      : reagent === 'pbr3'
        ? 'PBr₃ turns OH into a good leaving group, which Br⁻ displaces by Sₙ2 (with inversion); there are no carbocations, so no rearrangement.'
        : 'The acid protonates OH so it leaves as water; ' + x + '⁻ then substitutes (Sₙ1 for tertiary and secondary alcohols, Sₙ2 for primary).';
    const n = s.info.alcohols.length;
    const out = rxOutcome('alcohol-halide', 'Alcohol → alkyl halide', 'Substitution', g, reason, {
      score: 11,
      byproducts: reagent === 'socl2' ? ['SO₂', 'HCl'] : reagent === 'pbr3' ? ['H₃PO₃'] : ['H₂O'],
      consumes: [rxUse(s, 1), rxUse(ctx.get(reagent), reagent === 'pbr3' ? n / 3 : n)],
      mechanism: single ? rxCationMechanism(s.graph, { c: alcohol.c, leaving: alcohol.o, protonated: true, shift, capture: x + '⁻',
        caption: 'The protonated OH leaves as water; ' + (shift ? 'the cation rearranges, then ' : '') + x + '⁻ captures the carbocation.' }) : null,
    });
    if (shift) {
      out.reason += ' Here the secondary carbocation rearranges by a ' + rxShiftText(shift) + ' to a tertiary carbocation first, so ' + x + ' ends up on the neighbouring carbon.';
      out.minor = rxProductList(plain);
      out.warnings.push('Some unrearranged ' + x + ' product forms from capture before the shift.');
    }
    if (tertiary && (reagent === 'socl2' || reagent === 'pbr3')) {
      out.warnings.push('SOCl₂ and PBr₃ work poorly on tertiary alcohols; HCl or HBr is the usual choice there.');
    }
    return [out];
  });
}

function rxRuleDehydration(ctx) {
  const acid = ctx.has('strongAcid') && !ctx.has('HBr') && !ctx.has('HCl') && !ctx.has('HI');
  if (!acid) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    if (!s.info.alcohols.length || s.info.alkenes.length || ctx.has('H2O')) {
      return [];
    }
    const alcohol = s.info.alcohols.slice().sort((p, q) => q.degree - p.degree)[0];
    const need = alcohol.degree >= 3 ? RX_TEMPERATURES.dehydrationTertiary : alcohol.degree === 2 ? RX_TEMPERATURES.dehydrationSecondary : RX_TEMPERATURES.dehydrationPrimary;
    const t = ctx.temperature;
    if (alcohol.degree <= 1 && t >= RX_TEMPERATURES.etherMin && t < need) {
      const g = rxCloneGraph(s.graph);
      const map = rxMerge(g, s.graph, s.graph.atoms.map((a) => a.id));
      g.removeAtom(map.get(alcohol.o));
      g.addBond(alcohol.o, map.get(alcohol.c));
      return [rxOutcome('ether-condensation', 'Acid-catalysed ether formation', 'Substitution (Sₙ2)', g,
        'At about 140 °C one protonated alcohol is displaced by a second alcohol molecule (Sₙ2), giving a symmetrical ether and water. Heating above about 170 °C favours elimination to the alkene instead.',
        { score: 11, byproducts: ['H₂O'] })];
    }
    if (t < need) {
      return [rxHint('Dehydrating a ' + ['methyl', 'primary', 'secondary', 'tertiary'][Math.min(alcohol.degree, 3)] + ' alcohol needs about ' + need + ' °C with the acid catalyst.')];
    }
    const g = rxCloneGraph(s.graph);
    const result = rxEliminate(g, alcohol.c, alcohol.o, 'zaitsev');
    if (!result) {
      return [rxHint('There is no β-hydrogen next to the carbinol carbon, so an elimination is not possible.')];
    }
    const out = rxOutcome('dehydration', 'Acid-catalysed dehydration', alcohol.degree >= 2 ? 'Elimination (E1)' : 'Elimination (E2)', g,
      'The acid protonates OH so it leaves as water. Loss of a β-H then forms the C=C, and the more substituted (Zaitsev) alkene is the major product.',
      { score: 11, byproducts: ['H₂O'], consumes: [rxUse(s, 1)] });
    const shift = alcohol.degree === 2 ? rxCationShift(s.graph, alcohol.c) : null;
    const moved = shift ? rxCloneGraph(s.graph) : null;
    let shifted = null;
    if (shift) {
      rxApplyShift(moved, alcohol.c, shift, alcohol.o);
      shifted = rxEliminate(moved, shift.from, alcohol.o, 'zaitsev');
      if (shifted && rxProductList(moved)[0].smiles === out.products[0].smiles) {
        shifted = null;
      }
    }
    if (alcohol.degree >= 2) {
      out.mechanism = rxCationMechanism(s.graph, { c: alcohol.c, leaving: alcohol.o, protonated: true, shift: shifted ? shift : null, beta: shifted ? shifted.beta : result.beta,
        caption: 'The protonated OH leaves as water; ' + (shifted ? 'the cation rearranges, then ' : '') + 'loss of a β-H⁺ forms the C=C.' });
    }
    if (shifted) {
      out.minor = out.products;
      out.products = rxProductList(moved);
      out.reason += ' Here the secondary carbocation first rearranges by a ' + rxShiftText(shift) + ', and the tertiary cation then gives the more substituted alkene.';
      out.warnings.push('The unrearranged alkene forms as a minor product.');
    } else if (result.regio) {
      const other = rxCloneGraph(s.graph);
      rxEliminate(other, alcohol.c, alcohol.o, 'hofmann');
      out.minor = rxProductList(other);
      out.ratio = [80, 20];
      out.warnings.push('The less substituted alkene forms as a minor product.');
    }
    if (!shifted && alcohol.degree === 2 && rxCarbonNeighbors(g, alcohol.c).some((n) => rxSubstitution(g, n.atom.id, alcohol.c) >= 2)) {
      out.warnings.push('The secondary carbocation can rearrange by a 1,2-shift before elimination.');
    }
    return [out];
  });
}

function rxRuleEsterification(ctx) {
  const acids = ctx.substrates.flatMap((s) => s.info.carbonyls.filter((c) => c.kind === 'acid').map((c) => ({ s, c })));
  if (!acids.length) {
    return [];
  }
  const partners = ctx.substrates.flatMap((s) => s.info.alcohols.map((a) => ({ graph: s.graph, alcohol: a, s })))
    .concat(ctx.solventNucleophiles.filter((n) => n.alcohol).map((n) => ({ graph: n.graph, alcohol: n.alcohol })));
  const acid = acids[0];
  const partner = partners.find((p) => p.s !== acid.s);
  if (!partner) {
    return [];
  }
  if (!ctx.has('strongAcid')) {
    return [rxHint('A carboxylic acid and an alcohol only form an ester with an acid catalyst (H₂SO₄ or TsOH) and heat.')];
  }
  const g = rxCloneGraph(acid.s.graph);
  g.removeAtom(acid.c.hetero);
  const map = rxMerge(g, partner.graph, partner.graph.connectedComponents().find((comp) => comp.atomIds.includes(partner.alcohol.o)).atomIds);
  g.addBond(map.get(partner.alcohol.o), acid.c.c);
  const out = rxOutcome('fischer', 'Fischer esterification', 'Nucleophilic acyl substitution', g,
    'The acid protonates the C=O, the alcohol adds to the carbonyl carbon, and water is lost from the tetrahedral intermediate. The reaction is an equilibrium, so excess alcohol or removal of water drives it forward.',
    { score: 12, byproducts: ['H₂O'], consumes: [rxUse(acid.s, 1), partner.s ? rxUse(partner.s, 1) : null] });
  const halide = ['HBr', 'HI'].find((t) => ctx.has(t));
  if (halide && partner.s) {
    out.score = 10;
    out.warnings.push(halide + ' is not a good esterification catalyst: its halide ion turns the alcohol into an alkyl halide first. Use H₂SO₄ or TsOH instead.');
  }
  if (ctx.temperature < 50) {
    out.warnings.push('Fischer esterification is slow at room temperature — it is normally run at reflux.');
  }
  return [out];
}

function rxRuleAcylation(ctx) {
  const chlorides = ctx.substrates.flatMap((s) => s.info.carbonyls.filter((c) => c.kind === 'acylChloride').map((c) => ({ s, c })));
  if (!chlorides.length || ctx.has('lewis')) {
    return [];
  }
  const acyl = chlorides[0];
  const partners = ctx.substrates.filter((s) => s !== acyl.s).flatMap((s) =>
    s.info.amines.map((n) => ({ graph: s.graph, atom: n.n, kind: 'amine' })).concat(s.info.alcohols.map((a) => ({ graph: s.graph, atom: a.o, kind: 'alcohol' }))));
  if (ctx.has('ammonia')) {
    const nh3 = ctx.get('ammonia');
    partners.unshift({ graph: nh3.graph, atom: nh3.ids[0], kind: 'amine' });
  }
  ctx.solventNucleophiles.forEach((n) => partners.push({ graph: n.graph, atom: n.atom, kind: n.alcohol ? 'alcohol' : 'water' }));
  if (ctx.has('H2O') && !partners.some((p) => p.kind === 'water')) {
    const w = ctx.get('H2O');
    partners.push({ graph: w.graph, atom: w.ids[0], kind: 'water' });
  }
  const partner = partners[0];
  if (!partner) {
    return [];
  }
  const partnerSub = ctx.substrates.find((x) => x.graph === partner.graph);
  const g = rxCloneGraph(acyl.s.graph);
  g.removeAtom(acyl.c.hetero);
  const map = rxMerge(g, partner.graph, partner.graph.connectedComponents().find((comp) => comp.atomIds.includes(partner.atom)).atomIds);
  g.addBond(map.get(partner.atom), acyl.c.c);
  const product = { amine: 'an amide', alcohol: 'an ester', water: 'the carboxylic acid' }[partner.kind];
  const out = rxOutcome('acyl-substitution', 'Acyl chloride + ' + (partner.kind === 'water' ? 'water' : partner.kind === 'amine' ? 'amine' : 'alcohol'), 'Nucleophilic acyl substitution', g,
    'The nucleophile adds to the very electrophilic acyl chloride carbon, and chloride, an excellent leaving group, is expelled to give ' + product + '.',
    { score: 13, byproducts: [ctx.has('amineBase') ? 'HCl (trapped by the added base as its ammonium salt)' : 'HCl'] });
  const baseMissing = partner.kind === 'amine' && !ctx.has('amineBase') && !ctx.has('hydroxide');
  out.consumes = [rxUse(acyl.s, 1), partnerSub ? rxUse(partnerSub, baseMissing ? 2 : 1) : null];
  if (baseMissing) {
    out.byproducts = ['the amine hydrochloride (second equivalent of amine)'];
    out.warnings.push('The HCl formed protonates the amine. Add a base (Et₃N, pyridine or a second equivalent of amine) to keep it nucleophilic.');
  }
  return [out];
}

function rxRuleSaponification(ctx) {
  const hydroxide = ctx.get('hydroxide');
  return ctx.substrates.flatMap((s) => {
    const ester = s.info.carbonyls.find((c) => c.kind === 'ester');
    if (!ester) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    if (hydroxide) {
      rxSetOrder(g, ester.c, ester.hetero, 0);
      rxAttach(g, 'O', ester.c, 1, -1);
      const cation = ctx.species.get('cation');
      const metal = cation && cation.graph.getAtom(cation.ids[0]);
      if (metal) {
        const ion = g.addAtom(metal.element, 0, 0);
        ion.charge = metal.charge;
      }
      return [rxOutcome('saponification', 'Saponification', 'Nucleophilic acyl substitution', g,
        'Hydroxide adds to the ester C=O and expels the alkoxide. The carboxylic acid formed is deprotonated at once, which makes base hydrolysis irreversible; acidifying the work-up gives the free acid.',
        { score: 12, consumes: [rxUse(s, 1), rxUse(hydroxide, 1)] })];
    }
    if (ctx.has('H2O') && ctx.has('strongAcid') && !ctx.substrates.some((x) => x.info.carbonyls.some((c) => c.kind === 'acid'))) {
      rxSetOrder(g, ester.c, ester.hetero, 0);
      rxAttach(g, 'O', ester.c);
      return [rxOutcome('ester-hydrolysis', 'Acid-catalysed ester hydrolysis', 'Nucleophilic acyl substitution', g,
        'This is the reverse of Fischer esterification: a large excess of water pushes the equilibrium towards the carboxylic acid and the alcohol.', { score: 10 })];
    }
    return [];
  });
}

function rxNucleophiles(ctx) {
  const list = [];
  const push = (tag, name, extra) => {
    const sp = ctx.get(tag);
    if (sp) {
      const atom = sp.atom || sp.ids.find((id) => sp.graph.getAtom(id).charge === -1) || sp.ids[0];
      list.push(Object.assign({ tag, name, graph: sp.graph, atom, ids: sp.ids }, extra));
    }
  };
  push('cyanide', 'cyanide', { base: false });
  push('azide', 'azide', { base: false });
  push('hydroxide', 'hydroxide', { base: true });
  const alkoxide = ctx.get('alkoxide');
  if (alkoxide) {
    push('alkoxide', 'alkoxide', { base: true, bulky: alkoxide.bulky });
  }
  push('amideBase', 'amide base', { base: true, bulky: true });
  return list;
}

function rxRuleHalide(ctx) {
  const nucs = rxNucleophiles(ctx);
  const substrates = ctx.substrates.filter((s) => s.info.halides.length);
  const arylOnly = ctx.substrates.filter((s) => !s.info.halides.length && s.info.arylHalides.length);
  const hints = nucs.length && arylOnly.length ? [rxHint('Halogens on aromatic or vinyl carbons do not undergo Sₙ2 or E2 under these conditions.')] : [];
  if (!substrates.length || ctx.has('lewis')) {
    return hints;
  }
  const bulky = nucs.find((n) => n.bulky);
  const strongBase = nucs.find((n) => n.base && !n.bulky);
  const softNuc = nucs.find((n) => !n.base);
  const solventNuc = ctx.solventNucleophiles[0];
  return hints.concat(substrates.flatMap((s) => {
    const h = s.info.halides.slice().sort((p, q) => ({ I: 3, Br: 2, Cl: 1 }[q.halogen] - { I: 3, Br: 2, Cl: 1 }[p.halogen]))[0];
    const d = h.degree;
    const hasBetaH = rxCarbonNeighbors(s.graph, h.c).some((n) => rxIsSp3(s.graph, n.atom.id) && rxHydrogens(s.graph, n.atom.id) > 0);
    const substitute = (nuc, id, name, type, reason, extra, at) => {
      const site = at || { graph: s.graph, c: h.c };
      const g = rxCloneGraph(site.graph);
      g.removeAtom(h.x);
      const comp = nuc.graph.connectedComponents().find((c) => c.atomIds.includes(nuc.atom)).atomIds;
      const map = rxMerge(g, nuc.graph, comp);
      const atom = g.getAtom(map.get(nuc.atom));
      const anionic = atom.charge === -1;
      if (atom.charge === -1) {
        delete atom.charge;
      }
      g.addBond(atom.id, site.c);
      const mechanism = id === 'sn2' ? rxMechanism(g, { anchor: h.c, remove: [[atom.id, h.c]], charges: anionic ? [[atom.id, -1]] : [],
        add: [{ key: 'x', element: h.halogen, from: h.c, away: atom.id, bond: true }], arrows: [{ from: atom.id, to: h.c }, { from: [h.c, 'x'], to: 'x' }],
        caption: 'Backside attack: the new bond forms as the C–' + h.halogen + ' bond breaks.' }) : null;
      if (id === 'sn1') {
        rxsDrop(g, site.c);
      } else {
        rxsReplace(g, h.c, h.x, atom.id, true);
      }
      const fromSolvent = ctx.solventNucleophiles.includes(nuc);
      return rxOutcome(id, name, type, g, reason, Object.assign({
        score: 11,
        byproducts: [fromSolvent ? 'H' + h.halogen : rxSaltName(ctx, h.halogen)],
        consumes: [rxUse(s, 1), fromSolvent ? null : rxUse(ctx.get(nuc.tag), 1)],
        mechanism,
      }, extra));
    };
    const eliminate = (mode, id, reason, extra, base) => {
      const g = rxCloneGraph(s.graph);
      const result = rxEliminate(g, h.c, h.x, mode, id !== 'e1');
      const mechanism = result && id === 'e1' ? rxCationMechanism(s.graph, { c: h.c, leaving: h.x, beta: result.beta,
        caption: 'The C–' + h.halogen + ' bond ionises first; the solvent then removes a β-H⁺ from the carbocation.' }) : result ? rxMechanism(g, { anchor: h.c, orders: [[h.c, result.beta, 1]],
        add: [{ key: 'x', element: h.halogen, from: h.c, perpTo: result.beta, side: 1, bond: true }, { key: 'h', element: 'H', from: result.beta, perpTo: h.c, side: 1, bond: true },
          { key: 'b', text: 'B:⁻', from: result.beta, perpTo: h.c, side: 1, distance: 2.6 }],
        arrows: [{ from: 'b', to: 'h' }, { from: [result.beta, 'h'], to: [result.beta, h.c] }, { from: [h.c, 'x'], to: 'x' }],
        caption: 'One concerted step: the base takes the β-H while the C–' + h.halogen + ' bond, anti-periplanar to it, breaks.' }) : null;
      const out = rxOutcome(id, mode === 'hofmann' && result && result.regio ? 'E2 elimination (Hofmann)' : id === 'e1' ? 'E1 elimination' : 'E2 elimination', id === 'e1' ? 'Elimination (E1)' : 'Elimination (E2)', g, reason, Object.assign({
        score: 11,
        byproducts: base ? [rxNeutralName(ctx.get(base.tag)), rxSaltName(ctx, h.halogen)].filter(Boolean) : ['H' + h.halogen],
        consumes: [rxUse(s, 1), base ? rxUse(ctx.get(base.tag), 1) : null],
        mechanism,
      }, extra));
      if (result && result.regio) {
        const other = rxCloneGraph(s.graph);
        rxEliminate(other, h.c, h.x, mode === 'hofmann' ? 'zaitsev' : 'hofmann', id !== 'e1');
        out.minor = out.minor.concat(rxProductList(other));
        out.ratio = mode === 'hofmann' ? [70, 30] : [80, 20];
        out.warnings.push(mode === 'hofmann' ? 'Some of the more substituted (Zaitsev) alkene also forms.' : 'Some of the less substituted (Hofmann) alkene also forms.');
      }
      if (result && result.stereospecific) {
        out.reason += ' Because H and ' + h.halogen + ' must be anti-periplanar, the configuration of the two stereocentres fixes the alkene geometry.';
      }
      return out;
    };
    const withMinor = (out, other) => {
      if (other) {
        out.minor = out.minor.concat(other.products.filter((p) => !out.minor.some((m) => m.smiles === p.smiles)));
        delete out.ratio;
      }
      return out;
    };
    const sn2Reason = (nuc) => nuc.name.charAt(0).toUpperCase() + nuc.name.slice(1) + ' attacks the carbon from the side opposite the leaving ' + h.halogen +
      ' in one concerted step (Sₙ2), which inverts that carbon.' + (ctx.polarAprotic ? ' A polar aprotic solvent leaves the nucleophile unsolvated and speeds this up.' : ctx.protic ? ' A protic solvent hydrogen-bonds to the nucleophile and slows Sₙ2; DMSO or DMF would be faster.' : '');
    if (bulky && hasBetaH) {
      return [eliminate('hofmann', 'e2-hofmann', 'A bulky base cannot reach the carbon for Sₙ2. Instead it removes the most accessible β-H, anti-periplanar to the leaving group, and gives mainly the less substituted (Hofmann) alkene.', { score: 13 }, bulky)];
    }
    if (d >= 3) {
      if (strongBase && hasBetaH) {
        return [eliminate('zaitsev', 'e2', 'Tertiary carbons are too hindered for Sₙ2, so the strong base removes a β-H in a concerted E2 and gives the more substituted (Zaitsev) alkene.', { score: 13 }, strongBase)];
      }
      if (solventNuc && !strongBase) {
        if (ctx.temperature >= RX_TEMPERATURES.e1 && hasBetaH) {
          return [withMinor(eliminate('zaitsev', 'e1', 'Ionisation gives a tertiary carbocation. Heat favours loss of a β-H (E1) over capture by the solvent, giving the Zaitsev alkene.',
            { warnings: ['The Sₙ1 substitution product also forms in significant amounts, and under purely solvolytic conditions it can rival the alkene; lower temperatures favour it further.'] }), substitute(solventNuc, 'sn1', '', '', ''))];
        }
        const out = substitute(solventNuc, 'sn1', 'Sₙ1 solvolysis', 'Substitution (Sₙ1)', 'The C–' + h.halogen + ' bond ionises on its own in the polar protic solvent to give a flat tertiary carbocation. The solvent then captures it, so a stereocentre would come out racemic.',
          { mechanism: rxCationMechanism(s.graph, { c: h.c, leaving: h.x, capture: 'solvent', caption: 'Slow ionisation gives the carbocation, which the solvent captures.' }) });
        out.warnings.push('Some E1 alkene also forms, and more of it on heating.');
        return [withMinor(out, hasBetaH ? eliminate('zaitsev', 'e1', '') : null)];
      }
      return softNuc ? [rxHint('Tertiary halides do not undergo Sₙ2; the nucleophile cannot reach the crowded carbon.')] : [];
    }
    if (d === 2) {
      if (softNuc) {
        return [substitute(softNuc, 'sn2', 'Sₙ2 substitution', 'Substitution (Sₙ2)', sn2Reason(softNuc))];
      }
      if (strongBase && hasBetaH) {
        return [withMinor(eliminate('zaitsev', 'e2', 'A secondary halide with a strong, basic nucleophile mostly undergoes E2, giving the more substituted (Zaitsev) alkene.',
          { score: 12, warnings: ['Some Sₙ2 substitution product also forms, and more of it at low temperature.'] }, strongBase), substitute(strongBase, 'sn2', '', '', ''))];
      }
      if (solventNuc && ctx.temperature >= RX_TEMPERATURES.e1) {
        const shift = rxCationShift(s.graph, h.c);
        const moved = shift ? rxCloneGraph(s.graph) : null;
        if (shift) {
          rxApplyShift(moved, h.c, shift, h.x);
        }
        const out = substitute(solventNuc, 'sn1', 'Sₙ1 solvolysis', 'Substitution (Sₙ1)', 'Heated in a protic solvent with no strong nucleophile, a secondary halide slowly ionises and is captured by the solvent.' +
          (shift ? ' The secondary carbocation rearranges by a ' + rxShiftText(shift) + ' to a tertiary one before the solvent captures it.' : ''),
          { mechanism: rxCationMechanism(s.graph, { c: h.c, leaving: h.x, shift, capture: 'solvent', caption: 'Slow ionisation gives a secondary carbocation' + (shift ? ', which rearranges before' : ', then') + ' the solvent captures it.' }) },
          shift ? { graph: moved, c: shift.from } : null);
        out.warnings.push('Secondary substrates give a slow mixture of Sₙ1, E1 and Sₙ2 products.');
        if (shift) {
          out.minor = substitute(solventNuc, 'sn1', '', '', '').products;
        }
        return [out];
      }
      return [];
    }
    const nuc = softNuc || strongBase;
    if (!nuc) {
      return [];
    }
    const out = substitute(nuc, nuc.tag === 'alkoxide' ? 'williamson' : 'sn2', nuc.tag === 'alkoxide' ? 'Williamson ether synthesis' : 'Sₙ2 substitution', 'Substitution (Sₙ2)', sn2Reason(nuc), { score: 12 });
    if (nuc.base && ctx.temperature >= 80 && d === 1 && hasBetaH) {
      out.warnings.push('At high temperature some E2 alkene competes, even for a primary halide.');
      withMinor(out, eliminate('zaitsev', 'e2', '', {}, nuc));
    }
    return [out];
  }));
}

function rxRadicalSites(g, info, mode) {
  const aro = info.aromatic.atoms;
  const alkeneAtoms = new Set(info.alkenes.flatMap((e) => [e.a, e.b]));
  return g.atoms.filter((a) => a.element === 'C' && !aro.has(a.id) && rxIsSp3(g, a.id) && rxHydrogens(g, a.id) > 0).map((a) => {
    const n = rxNeighbors(g, a.id);
    const benzylic = n.some((x) => aro.has(x.atom.id));
    const allylic = n.some((x) => alkeneAtoms.has(x.atom.id));
    return { id: a.id, benzylic, allylic, rank: (benzylic || allylic ? 10 : 0) + rxCarbonNeighbors(g, a.id).length };
  }).filter((x) => mode !== 'nbs' || x.benzylic || x.allylic).sort((p, q) => q.rank - p.rank);
}

function rxRuleRadicalHalogenation(ctx) {
  const initiated = ctx.has('light') || ctx.has('radicalInitiator') || ctx.temperature >= 250;
  const out = [];
  if (ctx.has('nbs')) {
    ctx.substrates.forEach((s) => {
      const site = rxRadicalSites(s.graph, s.info, 'nbs')[0];
      if (!site) {
        return;
      }
      const g = rxCloneGraph(s.graph);
      rxAttach(g, 'Br', site.id);
      const res = rxOutcome('nbs', site.benzylic ? 'Benzylic bromination (NBS)' : 'Allylic bromination (NBS)', 'Radical substitution', g,
        'NBS keeps the Br₂ concentration very low, so Br• takes the weakest C–H (allylic or benzylic, where the radical is resonance-stabilised) instead of adding to the C=C.',
        { score: 13, byproducts: ['succinimide'], consumes: [rxUse(s, 1), rxUse(ctx.get('nbs'), 1)] });
      if (!initiated) {
        res.warnings.push('NBS brominations need light or a radical initiator (AIBN or a peroxide).');
      }
      out.push(res);
    });
    return out;
  }
  const halogen = ['Br2', 'Cl2'].find((t) => ctx.has(t));
  if (!halogen || ctx.has('lewis')) {
    return out;
  }
  ctx.substrates.forEach((s) => {
    if (s.info.alkenes.length || s.info.alkynes.length) {
      return;
    }
    const sites = rxRadicalSites(s.graph, s.info);
    if (!sites.length) {
      return;
    }
    if (!initiated) {
      out.push(rxHint(halogen + ' only substitutes C–H on alkanes with light (hν), a radical initiator or strong heat.'));
      return;
    }
    const g = rxCloneGraph(s.graph);
    const x = halogen === 'Br2' ? 'Br' : 'Cl';
    rxAttach(g, x, sites[0].id);
    const res = rxOutcome('radical-halogenation', 'Radical ' + (x === 'Br' ? 'bromination' : 'chlorination'), 'Radical substitution', g,
      'Light splits ' + halogen + ' into radicals. In the chain reaction ' + x + '• takes the H that leaves the most stable carbon radical (benzylic > 3° > 2° > 1°).' +
      (x === 'Br' ? ' Bromination is highly selective.' : ''), { score: 11, byproducts: ['H' + x], consumes: [rxUse(s, 1), rxUse(ctx.get(halogen), 1)] });
    if (sites[1] && sites[1].rank !== sites[0].rank) {
      const other = rxCloneGraph(s.graph);
      rxAttach(other, x, sites.find((z) => z.rank !== sites[0].rank).id);
      res.minor = rxProductList(other);
    }
    if (x === 'Cl' && new Set(sites.map((z) => z.rank)).size > 1) {
      res.warnings.push('Chlorination is not very selective, so every C–H position gives some product; only the major one is shown.');
    }
    res.warnings.push('Multiple halogenation happens unless the alkane is in excess.');
    out.push(res);
  });
  return out;
}

function rxSubstituentEffect(g, ringAtom, ringSet) {
  const subs = rxNeighbors(g, ringAtom).filter((n) => !ringSet.has(n.atom.id));
  if (!subs.length) {
    return null;
  }
  const a = subs[0].atom;
  const n = rxNeighbors(g, a.id).filter((x) => x.atom.id !== ringAtom);
  if (a.charge > 0) {
    return { dir: 'meta', strength: -3 };
  }
  if (a.element === 'O' || (a.element === 'N' && n.every((x) => x.bond.order === 1))) {
    const acylated = n.some((x) => rxNeighbors(g, x.atom.id).some((m) => m.bond.order === 2 && m.atom.element === 'O'));
    return { dir: 'op', strength: acylated ? 2 : 3 };
  }
  if (['F', 'Cl', 'Br', 'I'].includes(a.element)) {
    return { dir: 'op', strength: 0.5 };
  }
  if (a.element === 'C') {
    if (n.some((x) => x.bond.order > 1 && ['O', 'N'].includes(x.atom.element)) || n.filter((x) => x.atom.element === 'F').length === 3) {
      return { dir: 'meta', strength: -2 };
    }
    return { dir: 'op', strength: 1 };
  }
  return { dir: 'meta', strength: -2 };
}

function rxEasPosition(g, ring) {
  const ringSet = new Set(ring);
  const subs = ring.map((id, i) => ({ i, effect: rxSubstituentEffect(g, id, ringSet) })).filter((x) => x.effect);
  const free = (i) => {
    const id = ring[((i % 6) + 6) % 6];
    return rxHydrogens(g, id) > 0 ? id : null;
  };
  if (!subs.length) {
    return { atom: ring.find((id) => rxHydrogens(g, id) > 0), deactivated: false, note: '' };
  }
  subs.sort((p, q) => q.effect.strength - p.effect.strength);
  const lead = subs[0];
  const order = lead.effect.dir === 'op' ? [3, 1, -1] : [2, -2];
  const candidates = order.map((k) => free(lead.i + k)).filter((x) => x);
  const atom = candidates[0];
  return {
    atom,
    minorAtom: lead.effect.dir === 'op' ? candidates.find((x) => x !== atom) || null : null,
    ratio: lead.effect.dir !== 'op' ? null : lead.effect.strength >= 2 ? [90, 10] : lead.effect.strength >= 1 ? [65, 35] : [85, 15],
    deactivated: subs.some((x) => x.effect.strength <= -2),
    note: lead.effect.dir === 'op'
      ? 'The substituent is an ortho/para director; para is shown because it is less hindered (some ortho product also forms).'
      : 'The electron-withdrawing substituent directs the electrophile meta.',
  };
}

function rxEasExhaustive(s) {
  const g = s.graph;
  const ring = s.info.aromatic.rings.length === 1 && s.info.aromatic.rings[0].length === 6 ? s.info.aromatic.rings[0] : null;
  if (!ring) {
    return null;
  }
  const donor = ring.findIndex((id) => rxNeighbors(g, id).some((n) => !ring.includes(n.atom.id) && ['O', 'N'].includes(n.atom.element) &&
    (rxHydrogens(g, n.atom.id) > 0 || n.atom.charge === -1) && rxNeighbors(g, n.atom.id).every((m) => m.bond.order === 1 &&
    !rxNeighbors(g, m.atom.id).some((q) => q.bond.order === 2 && q.atom.element === 'O'))));
  if (donor < 0) {
    return null;
  }
  const sites = [1, 3, 5].map((k) => ring[(donor + k) % 6]).filter((id) => rxHydrogens(g, id) > 0);
  return sites.length > 1 ? sites : null;
}

function rxRuleAromatic(ctx) {
  const halogen = ['Br2', 'Cl2'].find((t) => ctx.has(t));
  const lewis = ctx.has('lewis');
  const acidic = ctx.has('strongAcid');
  const arenes = ctx.substrates.filter((s) => s.info.aromatic.rings.length).map((s) => ({ s, pos: rxaEasPlan(s, { protonate: acidic || lewis }) }))
    .filter((x) => x.pos.atom);
  const out = [];
  if (!lewis) {
    const ready = halogen ? arenes.filter((x) => x.pos.activated && !x.s.info.alkenes.length && !x.s.info.alkynes.length) : [];
    if (!ready.length) {
      return halogen && ctx.substrates.some((s) => s.info.aromatic.rings.length && !s.info.alkenes.length && !s.info.alkynes.length)
        ? [rxHint('Benzene rings do not react with ' + halogen + ' alone — add a Lewis acid (FeBr₃ or AlCl₃) to activate the halogen.')]
        : [];
    }
    const x = halogen === 'Br2' ? 'Br' : 'Cl';
    const label = x === 'Br' ? 'bromination' : 'chlorination';
    ready.forEach(({ s, pos }) => {
      const all = (ctx.conditions.solvents || []).includes('water') ? rxEasExhaustive(s) : null;
      const g = rxCloneGraph(s.graph);
      (all || [pos.atom]).forEach((id) => rxAttach(g, x, id));
      if (all) {
        out.push(rxOutcome('eas-exhaustive', 'Exhaustive aromatic ' + label, 'Electrophilic aromatic substitution', g,
          'The free OH/NH₂ group activates the ring so strongly that ' + halogen + ' reacts without a Lewis acid. In water every open ortho and para position is substituted, and the polyhalogenated product precipitates.',
          { score: 13, byproducts: ['H' + x], consumes: [rxUse(s, 1), rxUse(ctx.get(halogen), all.length)] }));
        return;
      }
      const res = rxOutcome('eas-halogenation', 'Aromatic ' + label, 'Electrophilic aromatic substitution', g,
        'The ring is electron-rich enough to polarise ' + halogen + ' itself, so no Lewis acid is needed. ' + pos.note,
        { score: 12, byproducts: ['H' + x], consumes: [rxUse(s, 1), rxUse(ctx.get(halogen), 1)],
          warnings: [pos.excessive ? 'π-Excessive heteroaromatics polyhalogenate easily; use one equivalent at low temperature (or NBS).' : 'Use one equivalent of halogen at low temperature to stop at monosubstitution.'] });
      if (pos.minorAtom) {
        const other = rxCloneGraph(s.graph);
        rxAttach(other, x, pos.minorAtom);
        res.minor = rxProductList(other);
        res.ratio = pos.ratio;
      }
      out.push(res);
    });
    return out;
  }
  arenes.forEach(({ s, pos }) => {
    if (pos.deficient && !pos.activated) {
      if (halogen && ctx.temperature >= 200) {
        const g = rxCloneGraph(s.graph);
        const x = halogen === 'Br2' ? 'Br' : 'Cl';
        rxAttach(g, x, pos.atom);
        out.push(rxOutcome('eas-halogenation', 'Aromatic ' + (x === 'Br' ? 'bromination' : 'chlorination'), 'Electrophilic aromatic substitution', g,
          'The ring nitrogen withdraws electron density and binds the Lewis acid, so only forcing heat drives substitution. ' + pos.note,
          { score: 9, byproducts: ['H' + x], consumes: [rxUse(s, 1), rxUse(ctx.get(halogen), 1)], warnings: ['Yields are low; pyridine-type rings need ≥ 200 °C (or oleum) for electrophilic substitution.'] }));
      } else {
        out.push(rxHint('π-Deficient rings (pyridine-type N) resist electrophilic substitution: the nitrogen binds the Lewis acid. Halogenation needs ≥ 200 °C; Friedel–Crafts fails outright.'));
      }
      return;
    }
    if (halogen) {
      const g = rxCloneGraph(s.graph);
      const x = halogen === 'Br2' ? 'Br' : 'Cl';
      rxAttach(g, x, pos.atom);
      const res = rxOutcome('eas-halogenation', 'Aromatic ' + (x === 'Br' ? 'bromination' : 'chlorination'), 'Electrophilic aromatic substitution', g,
        'The Lewis acid polarises ' + halogen + ' into an ' + x + '⁺ equivalent. The ring attacks it to form an arenium ion, and loss of H⁺ restores aromaticity. ' + pos.note,
        { score: 12, byproducts: ['H' + x], consumes: [rxUse(s, 1), rxUse(ctx.get(halogen), 1)] });
      if (pos.minorAtom) {
        const other = rxCloneGraph(s.graph);
        rxAttach(other, x, pos.minorAtom);
        res.minor = rxProductList(other);
        res.ratio = pos.ratio;
      }
      out.push(res);
      return;
    }
    const partner = ctx.substrates.find((p) => p !== s && (p.info.halides.length || p.info.carbonyls.some((c) => c.kind === 'acylChloride')));
    if (!partner) {
      return;
    }
    if (pos.deactivated) {
      out.push(rxHint('Friedel–Crafts reactions fail on strongly deactivated rings (nitro, carbonyl, CF₃ or cationic substituents).'));
      return;
    }
    const g = rxCloneGraph(s.graph);
    const acylChloride = partner.info.carbonyls.find((c) => c.kind === 'acylChloride');
    const pg = rxCloneGraph(partner.graph);
    let carbon;
    let res;
    if (acylChloride) {
      pg.removeAtom(acylChloride.hetero);
      carbon = acylChloride.c;
      const map = rxMerge(g, pg, pg.atoms.map((a) => a.id));
      g.addBond(pos.atom, map.get(carbon));
      res = rxOutcome('fc-acylation', 'Friedel–Crafts acylation', 'Electrophilic aromatic substitution', g,
        'AlCl₃ pulls off chloride to give a resonance-stabilised acylium ion, which does not rearrange. The ring attacks it to give an aryl ketone, which is deactivated, so only one acyl group goes on. ' + pos.note,
        { score: 13, byproducts: ['HCl'], consumes: [rxUse(s, 1), rxUse(partner, 1)], warnings: ['The ketone product complexes AlCl₃, so a full equivalent of Lewis acid is needed.'] });
    } else {
      const h = partner.info.halides[0];
      carbon = h.c;
      let shifted = false;
      if (h.degree === 1) {
        const better = rxCarbonNeighbors(pg, h.c).find((n) => rxSubstitution(pg, n.atom.id, h.c) >= 1 && rxHydrogens(pg, n.atom.id) > 0);
        if (better) {
          carbon = better.atom.id;
          shifted = true;
        }
      }
      pg.removeAtom(h.x);
      const map = rxMerge(g, pg, pg.atoms.map((a) => a.id));
      g.addBond(pos.atom, map.get(carbon));
      res = rxOutcome('fc-alkylation', 'Friedel–Crafts alkylation', 'Electrophilic aromatic substitution', g,
        'AlCl₃ pulls off the halide to make a carbocation (or a polarised complex), which the ring attacks. ' +
        (shifted ? 'The primary cation rearranges by a 1,2-hydride shift first, so the ring ends up bonded to the more substituted carbon. ' : '') + pos.note,
        { score: 12, byproducts: ['HCl'], consumes: [rxUse(s, 1), rxUse(partner, 1)], warnings: ['The alkylated product is more reactive than the starting arene, so polyalkylation is common; use excess arene.'] });
    }
    if (pos.excessive && rxaRingClass(s.graph, s.info.aromatic, pos.atom).rings.some((r) => r.some((id) => ['N', 'O'].includes(s.graph.getAtom(id).element)))) {
      res.warnings.push('Pyrroles and furans polymerise with AlCl₃; milder Lewis acids (BF₃·OEt₂, SnCl₄, ZnCl₂) are used in practice.');
    }
    out.push(res);
  });
  return out;
}

function rxRuleDielsAlder(ctx) {
  const dieneSubs = ctx.substrates.filter((s) => s.info.dienes.length);
  if (!dieneSubs.length) {
    return [];
  }
  const ewg = (s, e) => [e.a, e.b].some((id) => rxNeighbors(s.graph, id).some((n) => n.atom.element === 'C' &&
    rxNeighbors(s.graph, n.atom.id).some((m) => m.bond.order >= 2 && ['O', 'N'].includes(m.atom.element))));
  const out = [];
  dieneSubs.forEach((d) => {
    const dienophiles = ctx.substrates.filter((p) => p !== d && (p.info.alkenes.length || p.info.alkynes.length))
      .map((p) => {
        const alkene = p.info.alkenes.find((e) => ewg(p, e)) || p.info.alkenes[0];
        const alkyne = p.info.alkynes[0];
        const e = alkene || alkyne;
        return { p, e, triple: !alkene, activated: ewg(p, e), diene: p.info.dienes.length > 0 };
      })
      .sort((a, b) => Number(b.activated) - Number(a.activated) || Number(a.diene) - Number(b.diene));
    const best = dienophiles[0];
    if (!best || (best.diene && !best.activated && d.info.dienes.length && dieneSubs.indexOf(d) > 0)) {
      return;
    }
    const diene = d.info.dienes[0];
    const [c1, c2, c3, c4] = diene;
    const chain = new Set(diene);
    const donor = (id) => rxNeighbors(d.graph, id).filter((n) => !chain.has(n.atom.id))
      .reduce((sum, n) => sum + (['O', 'N', 'S'].includes(n.atom.element) ? 2 : n.atom.element === 'C' ? 1 : 0), 0);
    const nuc1 = donor(c2) + donor(c4);
    const nuc4 = donor(c3) + donor(c1);
    const pg = best.p.graph;
    const hasEwg = (id, other) => rxNeighbors(pg, id).some((n) => n.atom.id !== other && n.atom.element === 'C' &&
      rxNeighbors(pg, n.atom.id).some((m) => m.bond.order >= 2 && ['O', 'N'].includes(m.atom.element)));
    const ewgA = hasEwg(best.e.a, best.e.b);
    const ewgB = hasEwg(best.e.b, best.e.a);
    let first = best.e.a;
    let second = best.e.b;
    let regio = '';
    if (ewgA !== ewgB && nuc1 !== nuc4) {
      const alpha = ewgA ? best.e.a : best.e.b;
      const beta = ewgA ? best.e.b : best.e.a;
      first = nuc1 > nuc4 ? beta : alpha;
      second = nuc1 > nuc4 ? alpha : beta;
      const onTerminus = donor(c1) !== donor(c4);
      regio = onTerminus ? 'ortho' : 'para';
    }
    let mergeMap = null;
    const map0 = (id) => mergeMap.get(id);
    const build = (exo) => {
      const g = rxCloneGraph(d.graph);
      const map = rxMerge(g, pg, pg.atoms.map((a) => a.id));
      mergeMap = mergeMap || map;
      rxSetOrder(g, c1, c2, 1);
      rxSetOrder(g, c2, c3, 2);
      rxSetOrder(g, c3, c4, 1);
      rxSetOrder(g, map.get(first), map.get(second), best.triple ? 2 : 1);
      g.addBond(c1, map.get(first));
      g.addBond(c4, map.get(second));
      const ewgAtoms = [first, second].flatMap((id) => rxNeighbors(pg, id).filter((n) => n.atom.id !== first && n.atom.id !== second && n.atom.element === 'C' &&
        rxNeighbors(pg, n.atom.id).some((m) => m.bond.order >= 2 && ['O', 'N'].includes(m.atom.element))).map((n) => map.get(n.atom.id)));
      if (!best.triple) {
        rxsDielsAlder(g, diene, map.get(first), map.get(second), ewgAtoms, exo);
      }
      return { g, ewgAtoms };
    };
    const { g, ewgAtoms } = build(false);
    const df = rxMechanism(g, { anchor: c1, remove: [[c1, map0(first)], [c4, map0(second)]], orders: [[c1, c2, 2], [c2, c3, 1], [c3, c4, 2], [map0(first), map0(second), best.triple ? 3 : 2]],
      arrows: [{ from: [c1, c2], to: [c2, c3] }, { from: [c3, c4], to: [c4, map0(second)] }, { from: [map0(first), map0(second)], to: [map0(first), c1] }], inside: [c1, c2, c3, c4, map0(first), map0(second)],
      caption: 'Six π electrons move in one concerted, cyclic step.', spread: 0.45 });
    const res = rxOutcome('diels-alder', 'Diels–Alder cycloaddition', 'Pericyclic [4+2] cycloaddition', g,
      'The s-cis diene and the dienophile form two new σ bonds in one concerted, suprafacial step, giving a cyclohexene. The dienophile’s cis/trans geometry is kept in the ring' +
      (best.activated ? ', and the electron-withdrawing group prefers the endo position, tucked under the diene (secondary orbital overlap).' : '.') +
      (best.activated && ctx.has('lewis') ? ' The Lewis acid binds the dienophile’s C=O and lowers its LUMO, so the reaction is faster and more endo-selective.' : '') +
      (regio ? ' The substituent on the diene steers the regiochemistry: the “' + regio + '” product forms, with the two groups ' + (regio === 'ortho' ? 'on neighbouring ring carbons (1,2).' : 'across the ring (1,4).') : ''),
      { score: best.activated ? 14 : 11, consumes: [rxUse(d, 1), rxUse(best.p, 1)], mechanism: df });
    if (best.activated && ewgAtoms.length && !best.triple) {
      const facial = [c1, c4].some((id) => rxNeighbors(d.graph, id).some((n) => !chain.has(n.atom.id)));
      res.minor = facial ? rxProductList(build(true).g) : [];
      if (res.minor.length) {
        res.ratio = ctx.has('lewis') ? [95, 5] : [80, 20];
      }
      res.warnings.push(res.minor.length ? 'Endo is the kinetic product; the exo isomer forms as a minor product, and heating for long periods lets it build up via retro-Diels–Alder.'
        : 'Endo is the kinetic product; heating for long periods can let the exo isomer build up via retro-Diels–Alder.');
    }
    if (!best.activated) {
      res.warnings.push('An unactivated dienophile reacts slowly; heat or an electron-withdrawing group (C=O, CN) on it helps.');
    }
    if (ctx.temperature > 200) {
      res.warnings.push('Very high temperatures favour the retro-Diels–Alder reaction.');
    }
    out.push(res);
  });
  return out;
}

function rxDieneDonor(g, diene) {
  const chain = new Set(diene);
  const donor = (id) => rxNeighbors(g, id).filter((n) => !chain.has(n.atom.id))
    .reduce((sum, n) => sum + (['O', 'N', 'S'].includes(n.atom.element) ? 2 : n.atom.element === 'C' ? 1 : 0), 0);
  const [c1, c2, c3, c4] = diene;
  return { first: donor(c2) + donor(c4), last: donor(c3) + donor(c1), oxygen: diene.some((id) => rxNeighbors(g, id).some((n) => !chain.has(n.atom.id) && n.atom.element === 'O')) };
}

function rxRuleHeteroDielsAlder(ctx) {
  const dieneSubs = ctx.substrates.filter((s) => s.info.dienes.length);
  const out = [];
  dieneSubs.forEach((d) => {
    const partner = ctx.substrates.find((p) => p !== d && !p.info.alkenes.length && !p.info.alkynes.length && p.info.carbonyls.some((c) => c.kind === 'aldehyde'));
    if (!partner) {
      return;
    }
    const carbonyl = partner.info.carbonyls.find((c) => c.kind === 'aldehyde');
    const pg = partner.graph;
    const activated = rxNeighbors(pg, carbonyl.c).some((n) => n.atom.id !== carbonyl.o && n.atom.element === 'C' &&
      rxNeighbors(pg, n.atom.id).some((m) => m.bond.order >= 2 && ['O', 'N'].includes(m.atom.element)));
    const diene = d.info.dienes[0];
    const push = rxDieneDonor(d.graph, diene);
    if (!ctx.has('lewis') && !activated) {
      out.push(rxHint('An aldehyde C=O is a weak dienophile — add a Lewis acid (BF₃ or ZnCl₂) to run a hetero-Diels–Alder, ideally with an electron-rich diene such as Danishefsky’s diene.'));
      return;
    }
    const [c1, c2, c3, c4] = diene;
    const g = rxCloneGraph(d.graph);
    const map = rxMerge(g, pg, pg.atoms.map((a) => a.id));
    const toFirst = push.first >= push.last ? carbonyl.c : carbonyl.o;
    const toLast = toFirst === carbonyl.c ? carbonyl.o : carbonyl.c;
    rxSetOrder(g, c1, c2, 1);
    rxSetOrder(g, c2, c3, 2);
    rxSetOrder(g, c3, c4, 1);
    rxSetOrder(g, map.get(carbonyl.c), map.get(carbonyl.o), 1);
    g.addBond(c1, map.get(toFirst));
    g.addBond(c4, map.get(toLast));
    const mech = rxMechanism(g, { anchor: c1, remove: [[c1, map.get(toFirst)], [c4, map.get(toLast)]],
      orders: [[c1, c2, 2], [c2, c3, 1], [c3, c4, 2], [map.get(carbonyl.c), map.get(carbonyl.o), 2]],
      arrows: [{ from: [c1, c2], to: [c2, c3] }, { from: [c3, c4], to: [c4, map.get(toLast)] }, { from: [map.get(toFirst), map.get(toLast)], to: [map.get(toFirst), c1] }],
      inside: [c1, c2, c3, c4, map.get(toFirst), map.get(toLast)], spread: 0.45, caption: 'The C=O π bond takes the place of a C=C in the six-electron cyclic shift.' });
    const res = rxOutcome('hetero-diels-alder', 'Hetero-Diels–Alder', 'Pericyclic [4+2] cycloaddition', g,
      'The C=O of the aldehyde acts as the dienophile. ' + (ctx.has('lewis') ? 'The Lewis acid binds the carbonyl oxygen and lowers the LUMO. ' : '') +
      'The electrophilic carbonyl carbon bonds to the nucleophilic end of the diene and the oxygen closes onto the other end, giving a dihydropyran.',
      { score: 13, consumes: [rxUse(d, 1), rxUse(partner, 1)], mechanism: mech });
    if (!push.oxygen) {
      res.warnings.push('Plain dienes react sluggishly with aldehydes; alkoxy dienes (Danishefsky’s diene) are the usual partners.');
    } else {
      res.warnings.push('With a silyl enol ether diene, acidic work-up hydrolyses the adduct to a 2,3-dihydro-4H-pyran-4-one.');
    }
    out.push(res);
  });
  return out;
}

function rxRuleIntramolecularDielsAlder(ctx) {
  const out = [];
  ctx.substrates.filter((s) => s.info.dienes.length).forEach((s) => {
    const g0 = s.graph;
    const diene = s.info.dienes[0];
    const inDiene = new Set(diene);
    const tethers = [];
    s.info.alkenes.filter((e) => !inDiene.has(e.a) && !inDiene.has(e.b)).forEach((e) => {
      [[diene[0], diene[3]], [diene[3], diene[0]]].forEach(([t, other]) => {
        [[e.a, e.b], [e.b, e.a]].forEach(([near, far]) => {
          const dist = new Map([[t, 0]]);
          const queue = [t];
          while (queue.length) {
            const cur = queue.shift();
            rxNeighbors(g0, cur).forEach((n) => {
              const id = n.atom.id;
              if (!dist.has(id) && !inDiene.has(id) && id !== far && n.bond.order === 1 || id === near && !dist.has(id)) {
                dist.set(id, dist.get(cur) + 1);
                if (id !== near) {
                  queue.push(id);
                }
              }
            });
          }
          const length = dist.get(near);
          if (length === 4 || length === 5) {
            tethers.push({ t, other, near, far, length });
          }
        });
      });
    });
    tethers.sort((p, q) => p.length - q.length);
    const best = tethers[0];
    if (!best) {
      return;
    }
    const [c1, c2, c3, c4] = diene;
    const g = rxCloneGraph(g0);
    rxSetOrder(g, c1, c2, 1);
    rxSetOrder(g, c2, c3, 2);
    rxSetOrder(g, c3, c4, 1);
    rxSetOrder(g, best.near, best.far, 1);
    g.addBond(best.t, best.near);
    g.addBond(best.other, best.far);
    const [t1, t2] = best.t === c1 ? [c1, c2] : [c4, c3];
    const [o2, o1] = best.t === c1 ? [c3, c4] : [c2, c1];
    const mech = rxMechanism(g, { anchor: c1, remove: [[best.t, best.near], [best.other, best.far]], orders: [[c1, c2, 2], [c2, c3, 1], [c3, c4, 2], [best.near, best.far, 2]],
      arrows: [{ from: [t1, t2], to: [t2, o2] }, { from: [o2, o1], to: [o1, best.far] }, { from: [best.near, best.far], to: [best.near, t1] }],
      inside: [c1, c2, c3, c4, best.near, best.far], caption: 'The same six-electron shift as an intermolecular Diels–Alder, but the tether holds the partners together.' });
    const res = rxOutcome('intramolecular-diels-alder', 'Intramolecular Diels–Alder', 'Pericyclic [4+2] cycloaddition', g,
      'The diene and the alkene are joined by a ' + (best.length - 1) + '-atom tether, so the cycloaddition happens inside one molecule. It builds the cyclohexene and a fused ' +
      (best.length + 1) + '-membered ring in one step, and is much faster than the intermolecular version because the partners never have to find each other.',
      { score: 13, consumes: [rxUse(s, 1)], mechanism: mech });
    res.warnings.push('Whether the new ring fusion is cis or trans depends on the tether and on an endo or exo transition state, so only the connectivity is predicted here.');
    res.warnings.push(best.length === 4
      ? 'As a rough guide, thermal reactions with a 3-atom tether often give cis/trans hydrindane mixtures; a C=O on the dienophile or a Lewis acid tends to favour one isomer.'
      : 'As a rough guide, a 4-atom tether more often favours the trans-fused decalin through the less strained chair-like transition state, but substituents can reverse this.');
    if (ctx.temperature < 80) {
      res.warnings.push('Unactivated intramolecular Diels–Alder reactions usually need heating (often 150–200 °C).');
    }
    out.push(res);
  });
  return out;
}

const RX_AIR_SENSITIVE = ['grignard', 'reduction-lialh4', 'hydroboration'];

function rxCompoundLabel(compound) {
  return compound.label || compound.name || compound.formula || compound.input || '?';
}

function rxStoichiometry(outcome, compounds) {
  const rows = [];
  const sheet = compounds && typeof reactionStoichiometry === 'function' ? reactionStoichiometry(compounds, reactionScaleMmol(compounds, 1)) : [];
  (outcome.consumes || []).filter((x) => x && x.compound && x.need > 0 && x.compound.role !== 'solvent' && x.compound.role !== 'catalyst').forEach((x) => {
    const found = rows.find((r) => r.compound === x.compound);
    if (found) {
      found.need += x.need;
      return;
    }
    const line = sheet.find((r) => r.compound === x.compound);
    const have = line && line.equiv > 0 ? line.equiv : parseFloat(x.compound.equiv);
    rows.push({ compound: x.compound, label: rxCompoundLabel(x.compound), need: x.need, have: have > 0 ? have : 1 });
  });
  if (!rows.length) {
    return null;
  }
  const extent = Math.min.apply(null, rows.map((r) => r.have / r.need));
  rows.forEach((r) => {
    r.ratio = r.have / r.need;
    r.status = Math.abs(r.ratio - extent) < 1e-9 ? 'limiting' : 'excess';
    r.leftover = r.have - r.need * extent;
  });
  if (rows.every((r) => r.status === 'limiting')) {
    rows.forEach((r) => {
      r.status = 'exact';
    });
  }
  const base = rows[0];
  const conversion = Math.min(1, extent / base.ratio);
  const limiting = rows.find((r) => r.status === 'limiting') || null;
  if (limiting && limiting !== base && conversion < 0.999) {
    outcome.warnings.push(rxFormatEquiv(limiting.have) + ' equiv of ' + limiting.label + ' is not enough: the reaction needs ' + rxFormatEquiv(limiting.need) +
      ' per ' + base.label + ', so at most ' + Math.round(conversion * 100) + '% of the ' + base.label + ' can react. Use at least ' + rxFormatEquiv(limiting.need * base.have) + ' equiv.');
  }
  let multiplier = 1;
  while (multiplier < 12 && !rows.every((r) => Math.abs(r.need * multiplier - Math.round(r.need * multiplier)) < 1e-6)) {
    multiplier += 1;
  }
  return { rows, extent, conversion, limiting, multiplier };
}

function rxFormatEquiv(value) {
  return String(Math.round(value * 100) / 100);
}

const RX_CHEMOSELECTIVITY = [
  { id: 'borohydride', label: 'NaBH₄', tags: ['borohydride'], attacks: ['aldehyde', 'ketone'] },
  { id: 'alanate', label: 'LiAlH₄', tags: ['alanate'], attacks: ['aldehyde', 'ketone', 'acylChloride', 'ester', 'acid', 'epoxide', 'amide', 'nitrile'] },
  { id: 'hydrogenation', label: 'H₂ with a metal catalyst', tags: ['H2', 'hydrogenationCatalyst'], attacks: ['alkyne', 'alkene', 'nitro', 'benzylEther', 'cbz'], advice: 'if the alkene must be reduced, protect the alcohol as a TBS ether instead of a benzyl ether, since TBS survives H₂/Pd' },
  { id: 'organometallic', label: 'the organometallic reagent', tags: ['grignard'], attacks: ['aldehyde', 'ketone', 'acylChloride', 'ester', 'epoxide', 'nitrile'] },
  { id: 'peracid', label: 'mCPBA', tags: ['mcpba'], attacks: ['alkene', 'ketone'] },
  { id: 'permanganate', label: 'KMnO₄', tags: ['permanganate'], attacks: ['aldehyde', 'alkene', 'alcohol'] },
  { id: 'chromium', label: 'the chromium(VI) oxidant', tags: ['jones'], attacks: ['aldehyde', 'alcohol'] },
  { id: 'pcc', label: 'PCC', tags: ['pcc'], attacks: ['alcohol'] },
  { id: 'ozone', label: 'O₃', tags: ['ozone'], attacks: ['alkene', 'alkyne'] },
  { id: 'borane', label: 'BH₃', tags: ['borane'], attacks: ['alkene', 'alkyne', 'aldehyde', 'acid', 'ketone'] },
  { id: 'fluoride', label: 'fluoride', tags: ['fluoride'], attacks: ['silylEther'] },
  { id: 'acid', label: 'the strong acid', tags: ['strongAcid'], attacks: ['boc', 'tBuEster', 'silylEther'] },
  { id: 'acylation', label: 'the acylating agent', acylating: true, attacks: ['amine', 'thiol', 'alcohol'] },
];

const RX_PROTECTION_SUGGESTIONS = {
  amine: 'protect the amine as its Boc carbamate (Boc₂O, Et₃N; removed later with TFA)',
  alcohol: 'protect the alcohol as a TBS ether (TBSCl, imidazole; removed later with TBAF)',
  aldehyde: 'protect the aldehyde as a cyclic acetal (ethylene glycol, TsOH; removed later with aqueous acid)',
  ketone: 'protect the ketone as a cyclic acetal (ethylene glycol, TsOH; removed later with aqueous acid)',
  acid: 'protect the acid as its tert-butyl ester (isobutylene, H₂SO₄; removed later with TFA)',
  terminalAlkyne: 'protect the terminal alkyne as its TMS alkyne (n-BuLi, then TMSCl; removed later with K₂CO₃/MeOH)',
  thiol: 'protect the thiol as a trityl thioether (TrCl; removed later with TFA and a silane)',
  benzylEther: 'protect the alcohol as a TBS ether rather than a benzyl ether, since TBS survives H₂/Pd',
};

const RX_CHEMO_GROUP_LABELS = {
  aldehyde: 'aldehyde', ketone: 'ketone', ester: 'ester', acid: 'carboxylic acid', amide: 'amide', acylChloride: 'acyl chloride',
  nitrile: 'nitrile', epoxide: 'epoxide', alkene: 'C=C', alkyne: 'C≡C', terminalAlkyne: 'terminal alkyne', nitro: 'nitro group',
  benzylEther: 'benzyl ether', cbz: 'Cbz group', amine: 'amine', alcohol: 'alcohol', thiol: 'thiol', boc: 'Boc group',
  tBuEster: 'tert-butyl ester', silylEther: 'silyl ether',
};

function rxChemoGroups(g) {
  const info = rxAnalyze(g);
  const groups = {};
  const add = (group, atoms) => {
    (groups[group] = groups[group] || []).push(atoms);
  };
  const tBu = (id) => {
    const a = g.getAtom(id);
    return a.element === 'C' && rxCarbonNeighbors(g, id).length === 3 && rxCarbonNeighbors(g, id).filter((n) => rxHydrogens(g, n.atom.id) === 3).length === 3;
  };
  const benzylic = (id) => {
    const a = g.getAtom(id);
    return a.element === 'C' && rxHydrogens(g, id) === 2 && rxCarbonNeighbors(g, id).some((n) => info.aromatic.atoms.has(n.atom.id));
  };
  info.carbonyls.forEach((c) => {
    const ether = rxNeighbors(g, c.c).find((n) => n.atom.element === 'O' && n.atom.id !== c.o && n.bond.order === 1 && !n.atom.charge);
    if ((c.kind === 'ester' || c.kind === 'amide') && ether) {
      const alkyl = rxNeighbors(g, ether.atom.id).find((n) => n.atom.id !== c.c);
      const onN = rxNeighbors(g, c.c).some((n) => n.atom.element === 'N');
      if (alkyl && onN && tBu(alkyl.atom.id)) {
        add('boc', [c.c, c.o]);
        return;
      }
      if (alkyl && onN && benzylic(alkyl.atom.id)) {
        add('cbz', [c.c, c.o]);
        return;
      }
      if (alkyl && tBu(alkyl.atom.id)) {
        add('tBuEster', [c.c, c.o]);
        return;
      }
    }
    if (RX_CHEMO_GROUP_LABELS[c.kind]) {
      add(c.kind, [c.c, c.o]);
    }
  });
  info.nitriles.forEach((n) => add('nitrile', [n.c, n.n]));
  info.epoxides.forEach((e) => add('epoxide', [e.o, e.a, e.b]));
  info.alkenes.forEach((e) => add('alkene', [e.a, e.b]));
  info.alkynes.forEach((e) => {
    add('alkyne', [e.a, e.b]);
    if (rxHydrogens(g, e.a) || rxHydrogens(g, e.b)) {
      add('terminalAlkyne', [e.a, e.b]);
    }
  });
  info.amines.forEach((a) => add('amine', [a.n]));
  info.alcohols.forEach((a) => add('alcohol', [a.o]));
  g.atoms.forEach((atom) => {
    const n = rxNeighbors(g, atom.id);
    if (atom.element === 'N' && atom.charge === 1 && n.filter((x) => x.atom.element === 'O').length === 2 && n.some((x) => x.atom.element === 'C')) {
      add('nitro', [atom.id]);
    }
    if (atom.element === 'S' && !atom.charge && n.length === 1 && n[0].atom.element === 'C' && rxHydrogens(g, atom.id) === 1) {
      add('thiol', [atom.id]);
    }
    if (atom.element === 'O' && !atom.charge && n.length === 2 && n.every((x) => x.bond.order === 1)) {
      if (n.some((x) => x.atom.element === 'Si') && n.some((x) => x.atom.element === 'C')) {
        add('silylEther', [atom.id]);
      } else if (n.every((x) => x.atom.element === 'C' && !rxNeighbors(g, x.atom.id).some((m) => m.bond.order === 2 && m.atom.element === 'O')) &&
        n.some((x) => benzylic(x.atom.id)) && !g.getBond(n[0].atom.id, n[1].atom.id)) {
        add('benzylEther', [atom.id]);
      }
    }
  });
  return groups;
}

function rxChemoEntry(ctx, outcome) {
  const consumed = (compound) => compound && outcome.consumes.some((u) => u && u.compound === compound);
  const acylating = ctx.substrates.filter((s) => consumed(s.compound) && s.info.carbonyls.some((c) => c.kind === 'acylChloride' || c.kind === 'anhydride'));
  return RX_CHEMOSELECTIVITY.find((entry) => {
    if (entry.acylating) {
      return acylating.length > 0 && ctx.substrates.some((s) => consumed(s.compound) && !acylating.includes(s));
    }
    if (!entry.tags.every((tag) => ctx.has(tag))) {
      return false;
    }
    const carriers = entry.tags.map((tag) => ctx.get(tag).compound).filter(Boolean);
    return !carriers.length || carriers.some(consumed);
  }) || null;
}

function rxChemoselectivity(ctx, outcome) {
  outcome.chemoselectivity = null;
  const entry = rxChemoEntry(ctx, outcome);
  const main = outcome.products[0];
  if (!entry || !main) {
    return null;
  }
  const consumed = ctx.substrates.filter((s) => outcome.consumes.some((u) => u && u.compound === s.compound) &&
    !(entry.acylating && s.info.carbonyls.some((c) => c.kind === 'acylChloride' || c.kind === 'anhydride')));
  if (!consumed.length) {
    return null;
  }
  const before = {};
  consumed.forEach((s) => {
    const groups = rxChemoGroups(s.graph);
    Object.keys(groups).forEach((group) => {
      before[group] = (before[group] || []).concat(groups[group]);
    });
  });
  let after = {};
  try {
    after = rxChemoGroups(reactionFragmentGraph(smilesToFragment(main.smiles)));
  } catch (error) {
    return null;
  }
  const count = (map, group) => (map[group] || []).length;
  const changed = entry.attacks.filter((group) => count(before, group) > count(after, group));
  if (!changed.length) {
    return null;
  }
  const competing = entry.attacks.filter((group) => count(before, group) > 0 && count(after, group) > 0)
    .map((group) => ({ group, count: count(after, group), atoms: before[group].reduce((all, atoms) => all.concat(atoms), []) }));
  if (!competing.length && changed.length < 2) {
    return null;
  }
  const name = (group) => RX_CHEMO_GROUP_LABELS[group] || group;
  const target = competing.length ? competing[0].group : changed[changed.length - 1];
  const guard = changed.find((group) => group !== target && RX_PROTECTION_SUGGESTIONS[group]);
  let suggestion = '';
  if (guard) {
    suggestion = 'To react only at the ' + name(target) + ', first ' + RX_PROTECTION_SUGGESTIONS[guard] + '.';
  } else if (entry.advice) {
    suggestion = 'To keep the ' + name(changed[0]) + ', ' + entry.advice + '.';
  } else if (RX_PROTECTION_SUGGESTIONS[target]) {
    suggestion = 'To keep the ' + name(target) + ' untouched, first ' + RX_PROTECTION_SUGGESTIONS[target] + '.';
  }
  const text = competing.length
    ? 'Chemoselectivity: ' + entry.label + ' reacted at the ' + changed.map(name).join(' and ') + ' but can also attack the ' + competing.map((c) => name(c.group)).join(' and ') + ' in this molecule, so expect a mixture unless one site is protected.'
    : 'Chemoselectivity: ' + entry.label + ' reacted at both the ' + changed.map(name).join(' and the ') + '; it cannot tell these groups apart.';
  outcome.chemoselectivity = { reagent: entry.id, label: entry.label, changed, competing, suggestion };
  outcome.warnings.push(text);
  return outcome.chemoselectivity;
}

function rxAlphaCarbons(g, c) {
  return rxCarbonNeighbors(g, c).filter((n) => n.bond.order === 1 && rxIsSp3(g, n.atom.id) && rxHydrogens(g, n.atom.id) > 0)
    .map((n) => n.atom.id)
    .sort((p, q) => rxCarbonNeighbors(g, p).length - rxCarbonNeighbors(g, q).length || rxHydrogens(g, q) - rxHydrogens(g, p));
}

function rxEnolateBase(ctx) {
  if (ctx.has('amideBase')) {
    return { kind: 'lda', entry: ctx.get('amideBase') };
  }
  if (ctx.has('hydride')) {
    return { kind: 'hydride', entry: ctx.get('hydride') };
  }
  if (ctx.has('alkoxide')) {
    return { kind: 'alkoxide', entry: ctx.get('alkoxide') };
  }
  if (ctx.has('hydroxide')) {
    return { kind: 'hydroxide', entry: ctx.get('hydroxide') };
  }
  return null;
}

function rxPathLength(g, from, to) {
  const seen = new Map([[from, 0]]);
  const queue = [from];
  while (queue.length) {
    const id = queue.shift();
    if (id === to) {
      return seen.get(id);
    }
    rxNeighbors(g, id).forEach((n) => {
      if (!seen.has(n.atom.id)) {
        seen.set(n.atom.id, seen.get(id) + 1);
        queue.push(n.atom.id);
      }
    });
  }
  return Infinity;
}

function rxIntramolecularEnolate(s, donorKinds, acceptorKinds) {
  const g = s.graph;
  const options = [];
  s.info.carbonyls.filter((d) => donorKinds.includes(d.kind)).forEach((d) => {
    rxAlphaCarbons(g, d.c).forEach((alpha) => {
      s.info.carbonyls.filter((t) => t !== d && acceptorKinds.includes(t.kind)).forEach((t) => {
        const ring = rxPathLength(g, alpha, t.c) + 1;
        if (ring === 5 || ring === 6) {
          options.push({ d, alpha, t, ring });
        }
      });
    });
  });
  options.sort((p, q) => q.ring - p.ring || (p.t.kind === 'aldehyde' ? -1 : 0) - (q.t.kind === 'aldehyde' ? -1 : 0));
  return options[0] || null;
}

function rxJoinCarbonyls(donor, acceptor) {
  const g = rxCloneGraph(donor.s.graph);
  let map = null;
  if (acceptor.s !== donor.s || acceptor.copy) {
    map = rxMerge(g, acceptor.s.graph, acceptor.s.graph.atoms.map((a) => a.id));
  }
  const id = (x) => (map ? map.get(x) : x);
  return { g, accC: id(acceptor.c.c), accO: id(acceptor.c.o), accHetero: acceptor.c.hetero === null ? null : id(acceptor.c.hetero), id };
}

function rxEnolateMechanism(g, alpha, accC, accO, label, caption) {
  return rxMechanism(g, { anchor: alpha, orders: [[accC, accO, 2]], remove: [[alpha, accC]], charges: [[alpha, -1]],
    arrows: [{ from: alpha, to: accC }, { from: [accC, accO], to: accO }], intermediate: { charges: [[accO, -1]], label }, caption });
}

function rxRuleAldol(ctx) {
  const base = rxEnolateBase(ctx);
  const pool = ctx.substrates.map((s) => ({ s, list: s.info.carbonyls.filter((c) => c.kind === 'aldehyde' || c.kind === 'ketone') })).filter((x) => x.list.length);
  if (!pool.length || !base) {
    return [];
  }
  let donor = null;
  let acceptor = null;
  let alpha = null;
  let mode = 'self';
  const warnings = [];
  const intra = pool.map((x) => (x.list.length >= 2 ? rxIntramolecularEnolate(x.s, ['aldehyde', 'ketone'], ['aldehyde', 'ketone']) : null)).find(Boolean);
  if (intra) {
    const s = ctx.substrates.find((x) => x.info.carbonyls.includes(intra.d));
    donor = { s, c: intra.d };
    acceptor = { s, c: intra.t };
    alpha = intra.alpha;
    mode = 'intra';
  } else {
    const entries = pool.map((x) => ({ s: x.s, c: x.list[0], alphas: rxAlphaCarbons(x.s.graph, x.list[0].c) }));
    const enol = entries.filter((e) => e.alphas.length);
    const non = entries.filter((e) => !e.alphas.length);
    if (!enol.length) {
      return [rxHint('Neither carbonyl compound has an α-H, so no enolate can form (with concentrated NaOH, an aldehyde like this undergoes the Cannizzaro reaction instead).')];
    }
    if (entries.length >= 2 && non.length) {
      donor = enol[0];
      acceptor = non[0];
      mode = 'crossed';
    } else if (entries.length >= 2) {
      const ketone = enol.find((e) => e.c.kind === 'ketone');
      const aldehyde = enol.find((e) => e.c.kind === 'aldehyde');
      donor = ketone && aldehyde ? ketone : enol[0];
      acceptor = ketone && aldehyde ? aldehyde : enol[1];
      mode = 'crossed';
      warnings.push(base.kind === 'lda'
        ? 'Both partners have α-H atoms: form the enolate of ' + rxCompoundLabel(donor.s.compound) + ' with LDA at −78 °C first, then add the other carbonyl compound, or a mixture forms.'
        : 'Both partners have α-H atoms, so up to four aldol products can form; the one shown (ketone enolate + aldehyde) is usually the main one. Pre-forming the enolate with LDA avoids the mixture.');
    } else {
      donor = enol[0];
      acceptor = { s: donor.s, c: donor.c, copy: true };
    }
    alpha = donor.alphas[0];
  }
  const joined = rxJoinCarbonyls(donor, acceptor);
  const gAdd = joined.g;
  const { accC, accO } = joined;
  gAdd.addBond(alpha, accC);
  rxSetOrder(gAdd, accC, accO, 1);
  const arylAcceptor = rxCarbonNeighbors(acceptor.s.graph, acceptor.c.c).some((n) => acceptor.s.info.aromatic.atoms.has(n.atom.id));
  const canDehydrate = rxHydrogens(gAdd, alpha) > 0;
  const dehydrate = canDehydrate && (ctx.temperature >= 60 || arylAcceptor);
  const mechanism = rxEnolateMechanism(gAdd, alpha, accC, accO, 'β-alkoxide',
    'The enolate (drawn as its carbanion) adds to the C=O carbon; the alkoxide is then protonated' + (dehydrate ? ', and on heating OH⁻ is lost (E1cB) to give the C=C.' : '.'));
  let g = gAdd;
  if (dehydrate) {
    g = rxCloneGraph(gAdd);
    g.removeAtom(accO);
    rxSetOrder(g, alpha, accC, 2);
    const inRing = rxRings(g, 8).some((r) => r.includes(alpha) && r.includes(accC));
    const accSubs = rxNeighbors(g, accC).filter((n) => n.atom.id !== alpha);
    const alphaSubs = rxNeighbors(g, alpha).filter((n) => n.atom.id !== accC && n.atom.id !== donor.c.c);
    if (!inRing && accSubs.length === 1 && alphaSubs.length <= 1) {
      rxsAlkene(g, alpha, accC, donor.c.c, accSubs[0].atom.id, false);
    }
  }
  const name = mode === 'intra' ? 'Intramolecular aldol' + (dehydrate ? ' condensation' : '') : (mode === 'crossed' ? 'Crossed aldol' : 'Aldol') + (dehydrate ? ' condensation' : ' addition');
  const out = rxOutcome(dehydrate ? 'aldol-condensation' : 'aldol', arylAcceptor && dehydrate && mode === 'crossed' ? 'Claisen–Schmidt condensation' : name,
    dehydrate ? 'Enolate addition–elimination' : 'Enolate addition', g,
    'The base removes an α-H to give an enolate, which adds to the C=O carbon of ' + (mode === 'intra' ? 'the other carbonyl group in the same molecule, closing a ' + rxRings(gAdd, 8).filter((r) => r.includes(alpha) && r.includes(accC)).map((r) => r.length).sort()[0] + '-membered ring' : mode === 'crossed' ? 'the partner' : 'a second molecule') +
      '; protonation gives the β-hydroxy carbonyl compound.' +
      (dehydrate ? ' ' + (arylAcceptor && ctx.temperature < 60 ? 'Because the new C=C is conjugated with the aromatic ring and the C=O,' : 'On heating,') + ' the β-OH is eliminated (E1cB) to give the α,β-unsaturated carbonyl compound, normally as the (E) isomer.' : ''),
    { score: 12, mechanism, byproducts: dehydrate ? ['H₂O'] : [],
      consumes: [rxUse(donor.s, mode === 'self' ? 2 : 1), mode === 'crossed' ? rxUse(acceptor.s, 1) : null, base.kind === 'lda' ? rxUse(base.entry, 1) : null] });
  out.warnings.push(...warnings);
  if (!dehydrate && rxCarbonNeighbors(gAdd, accC).length >= 2) {
    out.warnings.push('The new stereocentre(s) form as a racemic mixture; syn/anti selectivity is not predicted.');
  }
  if (!dehydrate && canDehydrate) {
    out.warnings.push('Heating (≥ 60 °C) eliminates water to give the conjugated enone (aldol condensation).');
  }
  if (!dehydrate && mode === 'self' && donor.c.kind === 'ketone') {
    out.warnings.push('The equilibrium for a ketone self-aldol lies on the starting-material side; heating to the enone drives it forward.');
  }
  if (mode === 'crossed' && acceptor.c.kind === 'aldehyde' && !acceptor.alphas && donor.c.kind === 'ketone' && rxAlphaCarbons(gAdd, donor.c.c).some((a) => a !== alpha)) {
    out.warnings.push('With two or more equivalents of the aldehyde, the α-carbon on the other side of the ketone reacts too (e.g. acetone + 2 PhCHO gives dibenzylideneacetone).');
  }
  return [out];
}

function rxEsterAlkoxyName(g, c, hetero) {
  const h = rxCloneGraph(g);
  rxSetOrder(h, c, hetero, 0);
  const comp = h.connectedComponents().find((x) => x.atomIds.includes(hetero));
  return rxNeutralName({ graph: h, ids: comp.atomIds });
}

function rxRuleClaisen(ctx) {
  const base = rxEnolateBase(ctx);
  const esters = ctx.substrates.map((s) => ({ s, list: s.info.carbonyls.filter((c) => c.kind === 'ester') })).filter((x) => x.list.length);
  if (!esters.length || !base || base.kind === 'hydroxide') {
    return [];
  }
  let donor = null;
  let acceptor = null;
  let alpha = null;
  let mode = 'self';
  const warnings = [];
  const intra = esters.map((x) => (x.list.length >= 2 ? rxIntramolecularEnolate(x.s, ['ester'], ['ester']) : null)).find(Boolean);
  if (intra) {
    const s = ctx.substrates.find((x) => x.info.carbonyls.includes(intra.d));
    donor = { s, c: intra.d };
    acceptor = { s, c: intra.t };
    alpha = intra.alpha;
    mode = 'dieckmann';
  } else {
    const entries = esters.map((x) => ({ s: x.s, c: x.list[0], alphas: rxAlphaCarbons(x.s.graph, x.list[0].c) }));
    const ketones = ctx.substrates.filter((s) => !esters.some((x) => x.s === s)).map((s) => {
      const c = s.info.carbonyls.find((k) => k.kind === 'ketone');
      return c ? { s, c, alphas: rxAlphaCarbons(s.graph, c.c) } : null;
    }).filter((x) => x && x.alphas.length);
    const enol = entries.filter((e) => e.alphas.length);
    const non = entries.filter((e) => !e.alphas.length);
    if (ketones.length) {
      donor = ketones[0];
      acceptor = non[0] || entries[0];
      mode = 'ketone';
    } else if (!enol.length) {
      return [rxHint('None of the esters has an α-H, so no ester enolate can form for a Claisen condensation.')];
    } else if (entries.length >= 2 && non.length) {
      donor = enol[0];
      acceptor = non[0];
      mode = 'crossed';
    } else {
      donor = enol[0];
      acceptor = { s: donor.s, c: donor.c, copy: true };
      if (entries.length >= 2) {
        warnings.push('Both esters have α-H atoms, so a crossed Claisen gives a mixture; only the self-condensation of ' + rxCompoundLabel(donor.s.compound) + ' is shown.');
      }
    }
    alpha = donor.alphas[0];
  }
  if (mode !== 'ketone' && rxHydrogens(donor.s.graph, alpha) < 2) {
    return [rxHint('The ester’s α-carbon has only one H, so the β-keto ester cannot be deprotonated and the Claisen equilibrium lies on the starting-material side.')];
  }
  const joined = rxJoinCarbonyls(donor, acceptor);
  const gAdd = joined.g;
  const { accC, accO, accHetero } = joined;
  gAdd.addBond(alpha, accC);
  rxSetOrder(gAdd, accC, accO, 1);
  const leaving = rxEsterAlkoxyName(gAdd, accC, accHetero);
  const mechanism = rxEnolateMechanism(gAdd, alpha, accC, accO, 'tetrahedral intermediate',
    'The ester enolate (drawn as its carbanion) adds to the ester C=O; the tetrahedral intermediate then expels the alkoxide.');
  const g = rxCloneGraph(gAdd);
  rxRemoveBranch(g, accHetero, accC);
  rxSetOrder(g, accC, accO, 2);
  const names = { self: 'Claisen condensation', crossed: 'Crossed Claisen condensation', dieckmann: 'Dieckmann condensation', ketone: 'Claisen condensation (ketone + ester)' };
  const out = rxOutcome(mode === 'dieckmann' ? 'dieckmann' : 'claisen', names[mode], 'Enolate acylation', g,
    'The base removes an α-H to make an enolate, which adds to the ' + (mode === 'dieckmann' ? 'other ester group of the same molecule, closing a ring' : 'ester C=O') +
      '. The tetrahedral intermediate expels the alkoxide, giving a ' + (mode === 'ketone' ? '1,3-dicarbonyl compound' : 'β-keto ester') +
      '. The base then deprotonates its doubly activated CH₂ — that last, favourable step drives the reaction, so a full equivalent of base is needed; acid work-up gives the neutral product.',
    { score: 13, mechanism, byproducts: leaving ? [leaving] : [],
      consumes: [rxUse(donor.s, mode === 'self' ? 2 : 1), mode === 'crossed' || mode === 'ketone' ? rxUse(acceptor.s, 1) : null, rxUse(base.entry, 1)] });
  out.warnings.push(...warnings);
  if (base.kind === 'alkoxide' && leaving) {
    const baseName = rxNeutralName(base.entry);
    if (baseName && baseName !== leaving) {
      out.warnings.push('The alkoxide base does not match the ester’s alkoxy group, so transesterification will scramble the esters; use the matching alkoxide (e.g. NaOEt for ethyl esters).');
    }
  }
  return [out];
}

function rxAcetalCarbons(g) {
  return g.atoms.filter((a) => a.element === 'C' && rxIsSp3(g, a.id)).map((a) => {
    const oxygens = rxNeighbors(g, a.id).filter((n) => n.atom.element === 'O' && rxNeighbors(g, n.atom.id).length === 2 &&
      rxNeighbors(g, n.atom.id).every((m) => m.atom.element === 'C' && rxIsSp3(g, m.atom.id)));
    return oxygens.length === 2 ? { c: a.id, oxygens: oxygens.map((n) => n.atom.id) } : null;
  }).filter(Boolean);
}

function rxRuleAcetal(ctx) {
  const out = [];
  const carbonyls = ctx.substrates.flatMap((s) => s.info.carbonyls.filter((c) => c.kind === 'aldehyde' || c.kind === 'ketone').map((c) => ({ s, c })));
  const diol = ctx.substrates.map((s) => {
    const pairs = [];
    s.info.alcohols.forEach((a, i) => s.info.alcohols.slice(i + 1).forEach((b) => {
      const d = rxPathLength(s.graph, a.o, b.o);
      if (d === 3 || d === 4) {
        pairs.push([a, b]);
      }
    }));
    return pairs.length ? { s, pair: pairs[0] } : null;
  }).find((x) => x && !carbonyls.some((c) => c.s === x.s));
  const mono = ctx.substrates.flatMap((s) => s.info.alcohols.map((a) => ({ graph: s.graph, atom: a.o, s })))
    .filter((x) => !carbonyls.some((c) => c.s === x.s))
    .concat(ctx.solventNucleophiles.filter((n) => n.alcohol).map((n) => ({ graph: n.graph, atom: n.alcohol.o, solvent: true })));
  if (carbonyls.length && (diol || mono.length)) {
    if (!ctx.has('strongAcid')) {
      return [rxHint('Aldehydes and ketones only form acetals with alcohols under acid catalysis (TsOH or H₂SO₄), with the water removed.')];
    }
    const { s, c } = carbonyls[0];
    const g = rxCloneGraph(s.graph);
    g.removeAtom(c.o);
    let firstO = null;
    let hemi = null;
    if (diol) {
      const map = rxMerge(g, diol.s.graph, diol.s.graph.atoms.map((a) => a.id));
      diol.pair.forEach((a) => g.addBond(map.get(a.o), c.c));
      firstO = map.get(diol.pair[0].o);
      hemi = rxCloneGraph(g);
      rxSetOrder(hemi, map.get(diol.pair[1].o), c.c, 0);
    } else {
      const partner = mono[0];
      const comp = partner.graph.connectedComponents().find((x) => x.atomIds.includes(partner.atom)).atomIds;
      const first = rxMerge(g, partner.graph, comp);
      const second = rxMerge(g, partner.graph, comp);
      g.addBond(first.get(partner.atom), c.c);
      g.addBond(second.get(partner.atom), c.c);
      firstO = first.get(partner.atom);
      hemi = rxCloneGraph(g);
      rxRemoveBranch(hemi, second.get(partner.atom), c.c);
    }
    const hemiO = rxAttach(hemi, 'O', c.c);
    const mechanism = rxMechanism(hemi, { anchor: c.c, orders: [[c.c, hemiO.id, 2]], remove: [[firstO, c.c]],
      arrows: [{ from: firstO, to: c.c }, { from: [c.c, hemiO.id], to: hemiO.id }], intermediate: { label: 'hemiacetal' },
      caption: 'Acid activates the C=O and the alcohol adds, giving a hemiacetal. Protonating its OH and losing water gives an oxocarbenium ion, which a second alcohol oxygen traps.' });
    const res = rxOutcome('acetal', diol ? 'Cyclic acetal formation' : 'Acetal formation', 'Nucleophilic addition (acid-catalysed)', g,
      'Under acid catalysis the alcohol adds to the C=O to give a hemiacetal; loss of water and addition of a second alcohol oxygen gives the acetal' +
        (diol ? ', here a ' + (rxPathLength(diol.s.graph, diol.pair[0].o, diol.pair[1].o) + 2) + '-membered cyclic acetal from the diol' : '') +
        '. Acetals are stable to bases, nucleophiles and hydrides, so they are used to protect aldehydes and ketones; aqueous acid removes them again.',
      { score: 12, mechanism, byproducts: ['H₂O'], consumes: [rxUse(s, 1), diol ? rxUse(diol.s, 1) : mono[0].s ? rxUse(mono[0].s, 2) : null] });
    res.warnings.push('Acetal formation is an equilibrium: remove the water (Dean–Stark trap or molecular sieves) to drive it.');
    out.push(res);
  }
  if (ctx.has('strongAcid') && ctx.has('H2O')) {
    ctx.substrates.forEach((s) => {
      const acetal = rxAcetalCarbons(s.graph).find((x) => !s.info.carbonyls.some((c) => c.c === x.c));
      if (!acetal) {
        return;
      }
      const g = rxCloneGraph(s.graph);
      acetal.oxygens.forEach((o) => rxSetOrder(g, acetal.c, o, 0));
      rxAttach(g, 'O', acetal.c, 2);
      const byproducts = [];
      g.connectedComponents().filter((comp) => !comp.atomIds.includes(acetal.c)).forEach((comp) => {
        const name = rxNeutralName({ graph: g, ids: comp.atomIds });
        if (name && !byproducts.includes(name)) {
          byproducts.push(name);
        }
        comp.atomIds.forEach((id) => g.removeAtom(id));
      });
      out.push(rxOutcome('acetal-hydrolysis', 'Acetal hydrolysis', 'Deprotection (acid-catalysed)', g,
        'Aqueous acid protonates an acetal oxygen; the alcohol leaves to give an oxocarbenium ion, water adds, and the same steps repeat to release the aldehyde or ketone.',
        { score: 12, byproducts, consumes: [rxUse(s, 1)] }));
    });
  }
  return out;
}

function rxRuleImine(ctx) {
  const carbonyls = ctx.substrates.flatMap((s) => s.info.carbonyls.filter((c) => c.kind === 'aldehyde' || c.kind === 'ketone').map((c) => ({ s, c })));
  const amines = ctx.substrates.flatMap((s) => s.info.amines.map((a) => ({ s, a })))
    .filter((x) => !carbonyls.some((c) => c.s === x.s))
    .filter((x) => (x.a.h === 2 && rxNeighbors(x.s.graph, x.a.n).length === 1) || (x.a.h === 1 && rxNeighbors(x.s.graph, x.a.n).length === 2));
  if (!carbonyls.length || !amines.length) {
    return [];
  }
  const { s, c } = carbonyls[0];
  const { s: as, a } = amines[0];
  const primary = a.h === 2;
  const reductive = ctx.has('mildHydride');
  const g = rxCloneGraph(s.graph);
  const map = rxMerge(g, as.graph, as.graph.atoms.map((x) => x.id));
  const n = map.get(a.n);
  const carbinol = rxCloneGraph(g);
  carbinol.addBond(n, c.c);
  rxSetOrder(carbinol, c.c, c.o, 1);
  const mechanism = rxMechanism(carbinol, { anchor: c.c, orders: [[c.c, c.o, 2]], remove: [[n, c.c]],
    arrows: [{ from: n, to: c.c }, { from: [c.c, c.o], to: c.o }], intermediate: { label: 'carbinolamine' },
    caption: 'The amine adds to the C=O to give a carbinolamine; acid-catalysed loss of water then gives the ' + (primary ? 'imine' : 'iminium ion') + '.' });
  g.removeAtom(c.o);
  if (reductive) {
    g.addBond(n, c.c);
    const out = rxOutcome('reductive-amination', 'Reductive amination', 'Imine formation + reduction', g,
      'The amine and the carbonyl compound form an ' + (primary ? 'imine' : 'iminium ion') + ', which the mild hydride reduces as it forms. NaBH₃CN and NaBH(OAc)₃ reduce iminium ions much faster than aldehydes or ketones, so the C=O is not reduced first.',
      { score: 13, mechanism, byproducts: ['H₂O', 'borate salts (after work-up)'], consumes: [rxUse(s, 1), rxUse(as, 1), rxUse(ctx.get('mildHydride'), 1)] });
    out.warnings.push('Mildly acidic conditions (pH 5–6, e.g. a little AcOH) speed up iminium formation.');
    return [out];
  }
  if (primary) {
    g.addBond(n, c.c).order = 2;
    const out = rxOutcome('imine', 'Imine formation', 'Nucleophilic addition–elimination', g,
      'The primary amine adds to the C=O to give a carbinolamine, and acid-catalysed loss of water gives the imine (Schiff base).',
      { score: 12, mechanism, byproducts: ['H₂O'], consumes: [rxUse(s, 1), rxUse(as, 1)] });
    out.warnings.push('Imine formation is reversible and fastest at pH ≈ 4–5; remove the water (Dean–Stark or molecular sieves) to drive it.');
    out.warnings.push('Add NaBH₃CN or NaBH(OAc)₃ to reduce the imine in the same pot (reductive amination).');
    return [out];
  }
  const alpha = rxAlphaCarbons(g, c.c)[0];
  if (alpha === undefined) {
    return [rxHint('A secondary amine gives an enamine only when the carbonyl compound has an α-H; without one, only the iminium ion forms.')];
  }
  g.addBond(n, c.c);
  rxSetOrder(g, c.c, alpha, 2);
  const out = rxOutcome('enamine', 'Enamine formation', 'Nucleophilic addition–elimination', g,
    'The secondary amine adds to the C=O and loses water to give an iminium ion. With no N–H to lose, it loses an α-H instead, giving the enamine, which forms on the less substituted side.',
    { score: 12, mechanism, byproducts: ['H₂O'], consumes: [rxUse(s, 1), rxUse(as, 1)] });
  out.warnings.push('Enamine formation needs an acid catalyst (TsOH) and removal of water; enamines hydrolyse back in aqueous acid.');
  return [out];
}

function rxYlide(s) {
  const g = s.graph;
  const p = g.atoms.find((a) => a.element === 'P' && rxCarbonNeighbors(g, a.id).length >= 4);
  if (!p) {
    return null;
  }
  const aromatic = s.info.aromatic.atoms;
  const double = rxNeighbors(g, p.id).find((n) => n.atom.element === 'C' && n.bond.order === 2);
  const carbanion = rxNeighbors(g, p.id).find((n) => n.atom.element === 'C' && n.atom.charge === -1);
  const salt = !double && !carbanion && p.charge === 1 ? rxNeighbors(g, p.id).find((n) => n.atom.element === 'C' && !aromatic.has(n.atom.id) && rxHydrogens(g, n.atom.id) > 0) : null;
  const hit = double || carbanion || salt;
  if (!hit) {
    return null;
  }
  const c = hit.atom.id;
  const subs = rxNeighbors(g, c).filter((n) => n.atom.id !== p.id);
  const stabilised = subs.some((n) => rxNeighbors(g, n.atom.id).some((m) => m.bond.order >= 2 && ['O', 'N'].includes(m.atom.element)));
  const semi = !stabilised && subs.some((n) => aromatic.has(n.atom.id) || rxNeighbors(g, n.atom.id).some((m) => m.bond.order === 2 && m.atom.element === 'C'));
  return { s, p: p.id, c, salt: Boolean(salt), subs: subs.map((n) => n.atom.id), kind: stabilised ? 'stabilised' : semi ? 'semi' : 'unstabilised' };
}

function rxRuleWittig(ctx) {
  const ylides = ctx.substrates.map(rxYlide).filter(Boolean);
  if (!ylides.length) {
    return [];
  }
  const y = ylides[0];
  const carbonyl = ctx.substrates.filter((s) => s !== y.s).flatMap((s) => s.info.carbonyls.filter((c) => c.kind === 'aldehyde' || c.kind === 'ketone').map((c) => ({ s, c })))[0];
  if (!carbonyl) {
    return [rxHint('A phosphorus ylide needs an aldehyde or ketone partner for the Wittig reaction.')];
  }
  const strongBase = ctx.get('grignard') || ctx.get('amideBase') || ctx.get('hydride') || ctx.get('alkoxide');
  if (y.salt && !strongBase) {
    return [rxHint('The phosphonium salt must first be deprotonated to the ylide: add a strong base such as n-BuLi, NaH or KOtBu.')];
  }
  const { s, c } = carbonyl;
  const full = rxCloneGraph(s.graph);
  const map = rxMerge(full, y.s.graph, y.s.graph.atoms.map((a) => a.id));
  const yc = map.get(y.c);
  const p = map.get(y.p);
  full.getAtom(p).charge = 0;
  full.getAtom(yc).charge = 0;
  rxSetOrder(full, yc, p, 1);
  const oxa = rxCloneGraph(full);
  oxa.addBond(c.c, yc);
  rxSetOrder(oxa, c.c, c.o, 1);
  oxa.addBond(c.o, p);
  rxSetOrder(full, c.c, c.o, 0);
  full.addBond(c.o, p).order = 2;
  rxSetOrder(full, yc, p, 0);
  full.addBond(c.c, yc).order = 2;
  const mechanism = rxMechanism(full, { anchor: c.c, orders: [[c.c, c.o, 2], [yc, p, 1], [c.c, yc, 1], [c.o, p, 0]], remove: [[c.c, yc]], charges: [[yc, -1], [p, 1]],
    arrows: [{ from: yc, to: c.c }, { from: [c.c, c.o], to: [c.o, p] }], spread: 1.1, abbreviate: [p], intermediate: { graph: oxa, label: 'oxaphosphetane' },
    caption: 'The ylide (drawn as its Ph₃P⁺–C⁻ resonance form) and the C=O combine in a [2+2] step to give a four-membered oxaphosphetane, which falls apart to the alkene and the very strong P=O bond of Ph₃P=O.' });
  const build = (cis) => {
    const g = rxCloneGraph(full);
    const pc = g.connectedComponents().find((comp) => comp.atomIds.includes(p)).atomIds;
    pc.forEach((id) => g.removeAtom(id));
    const cSubs = rxNeighbors(g, c.c).filter((n) => n.atom.id !== yc);
    const ySubs = rxNeighbors(g, yc).filter((n) => n.atom.id !== c.c);
    if (cis !== null && cSubs.length === 1 && ySubs.length === 1) {
      rxsAlkene(g, c.c, yc, cSubs[0].atom.id, ySubs[0].atom.id, cis);
    }
    return g;
  };
  const stereo = c.kind === 'aldehyde' && y.subs.length === 1;
  const zMajor = y.kind === 'unstabilised';
  const g = build(stereo ? zMajor : null);
  const out = rxOutcome('wittig', 'Wittig reaction', 'Olefination', g,
    'The ylide carbon adds to the C=O and the oxygen bonds to phosphorus, giving an oxaphosphetane that collapses to the alkene and triphenylphosphine oxide. The new C=C sits exactly where the C=O was.' +
      (stereo ? (y.kind === 'stabilised' ? ' A stabilised ylide (C=O or CN on the ylide carbon) reacts reversibly and gives mainly the (E) alkene.' :
        y.kind === 'unstabilised' ? ' An unstabilised (alkyl) ylide reacts fast and irreversibly and gives mainly the (Z) alkene.' : '') : ''),
    { score: 14, mechanism, byproducts: ['Ph₃P=O (triphenylphosphine oxide)'].concat(y.salt ? ['salt of the base'] : []),
      consumes: [rxUse(s, 1), rxUse(y.s, 1), y.salt ? rxUse(strongBase, 1) : null] });
  if (stereo && y.kind !== 'semi') {
    out.minor = rxProductList(build(!zMajor));
    out.ratio = y.kind === 'stabilised' ? [90, 10] : [85, 15];
  } else if (stereo) {
    out.warnings.push('A semi-stabilised ylide (aryl or vinyl on the ylide carbon) usually gives an E/Z mixture; the (E) isomer is drawn.');
    out.products = rxProductList(build(false));
  } else if (c.kind === 'ketone' && y.subs.length === 1) {
    out.warnings.push('With a ketone and a substituted ylide, the alkene forms as an E/Z mixture.');
  }
  if (y.kind === 'stabilised' && c.kind === 'ketone') {
    out.warnings.push('Stabilised ylides react sluggishly with ketones; the Horner–Wadsworth–Emmons reaction is the usual alternative.');
  }
  return [out];
}

const RX_RULES = [
  { id: 'hydrogenation', name: 'Catalytic hydrogenation / Lindlar', run: rxRuleHydrogenation },
  { id: 'halogenation', name: 'X₂ addition and halohydrins', run: rxRuleHalogenAddition },
  { id: 'hydrohalogenation', name: 'HX addition (Markovnikov / peroxide)', run: rxRuleHydrohalogenation },
  { id: 'hydration', name: 'Acid hydration of alkenes and alkynes', run: rxRuleHydration },
  { id: 'hydroboration', name: 'Hydroboration–oxidation', run: rxRuleHydroboration },
  { id: 'epoxidation', name: 'mCPBA epoxidation', run: rxRuleEpoxidation },
  { id: 'ozonolysis', name: 'Ozonolysis', run: rxRuleOzonolysis },
  { id: 'oxidation', name: 'KMnO₄ / PCC oxidations', run: rxRuleOxidation },
  { id: 'reduction', name: 'NaBH₄ / LiAlH₄ reductions', run: rxRuleReduction },
  { id: 'grignard', name: 'Grignard addition', run: rxRuleGrignard },
  { id: 'alcohol-halide', name: 'Alcohol → alkyl halide', run: rxRuleAlcoholToHalide },
  { id: 'dehydration', name: 'Alcohol dehydration / ether formation', run: rxRuleDehydration },
  { id: 'fischer', name: 'Fischer esterification', run: rxRuleEsterification },
  { id: 'acyl', name: 'Acyl chloride substitutions', run: rxRuleAcylation },
  { id: 'saponification', name: 'Ester hydrolysis', run: rxRuleSaponification },
  { id: 'halide', name: 'Sₙ2 / Sₙ1 / E2 / E1 of alkyl halides', run: rxRuleHalide },
  { id: 'radical', name: 'Radical and NBS halogenation', run: rxRuleRadicalHalogenation },
  { id: 'aromatic', name: 'EAS halogenation and Friedel–Crafts', run: rxRuleAromatic },
  { id: 'diels-alder', name: 'Diels–Alder', run: rxRuleDielsAlder },
  { id: 'hetero-diels-alder', name: 'Hetero-Diels–Alder (C=O dienophile)', run: rxRuleHeteroDielsAlder },
  { id: 'intramolecular-diels-alder', name: 'Intramolecular Diels–Alder', run: rxRuleIntramolecularDielsAlder },
  { id: 'epoxide', name: 'Epoxide ring opening', run: rxRuleEpoxideOpening },
  { id: 'dissolving-metal', name: 'Na/NH₃ alkyne reduction', run: rxRuleDissolvingMetal },
  { id: 'wittig', name: 'Wittig olefination', run: rxRuleWittig },
  { id: 'aldol', name: 'Aldol addition and condensation', run: rxRuleAldol },
  { id: 'claisen', name: 'Claisen and Dieckmann condensation', run: rxRuleClaisen },
  { id: 'acetal', name: 'Acetal formation and hydrolysis', run: rxRuleAcetal },
  { id: 'imine', name: 'Imine, enamine and reductive amination', run: rxRuleImine },
];

function rxWhyNot(ctx, o) {
  const use = o.consumes.find((u) => u && ctx.substrates.some((x) => x.compound === u.compound));
  const s = use ? ctx.substrates.find((x) => x.compound === use.compound) : ctx.substrates[0];
  const halide = s && s.info.halides.length ? s.info.halides[0] : null;
  const d = halide ? halide.degree : 0;
  const hot = ctx.temperature >= RX_TEMPERATURES.e1;
  const cation = ['methyl', 'primary', 'secondary', 'tertiary'][Math.min(d, 3)];
  const esters = s ? s.info.carbonyls.some((c) => c.kind === 'ester') : false;
  const table = {
    sn2: [
      ['Sₙ1?', d <= 1 ? 'A ' + cation + ' carbocation is far too unstable to form, so the halide never ionises on its own.' : 'A good nucleophile attacks faster than the C–X bond can ionise' + (ctx.polarAprotic ? ', and the aprotic solvent cannot stabilise a carbocation.' : '.')],
      ['E2?', d <= 1 ? 'Primary carbons are unhindered and the nucleophile is not a strong, bulky base, so substitution wins.' : 'The nucleophile is only weakly basic, so it attacks carbon rather than removing a β-H.'],
    ],
    williamson: [
      ['E2?', 'On a primary (or methyl) halide the unhindered carbon is easy to reach, so the alkoxide substitutes rather than eliminates. Swap the partners if this halide were tertiary.'],
    ],
    e2: [
      ['Sₙ2?', d >= 3 ? 'The tertiary carbon is too crowded for backside attack.' : 'With a strong base, removing an exposed β-H is faster than squeezing in at the ' + cation + ' carbon.'],
      ['E1?', 'A strong base reacts in one concerted step long before the halide could ionise to a carbocation.'],
    ],
    'e2-hofmann': [
      ['Zaitsev alkene?', 'The bulky base cannot reach the internal β-H, so it takes the more exposed one on the less substituted carbon.'],
      ['Sₙ2?', 'A bulky base is a very poor nucleophile.'],
    ],
    sn1: [
      ['Sₙ2?', d >= 3 ? 'The tertiary carbon is too crowded for backside attack.' : 'There is no strong nucleophile, only the weakly nucleophilic solvent.'],
      ['E1?', hot ? 'Elimination does compete when heated; it appears as the minor product.' : 'Below about ' + RX_TEMPERATURES.e1 + ' °C capture by the solvent beats loss of H⁺; heat would favour the alkene.'],
    ],
    e1: [
      ['Sₙ1?', 'Heat favours elimination because it makes two molecules from one (entropy); the substitution product still forms as the minor one.'],
      ['E2?', 'There is no strong base, so the reaction has to go through the carbocation first.'],
    ],
    hydrohalogenation: [
      ['Anti-Markovnikov?', 'That needs HBr together with a peroxide or light, which switches to a radical chain.'],
    ],
    'hbr-radical': [
      ['Markovnikov?', 'The peroxide/light turns HBr into Br• radicals, which add to give the more stable radical instead of a carbocation.'],
    ],
    'alcohol-halide': [
      ['Rearrangement?', ctx.has('socl2') || ctx.has('pbr3') ? 'SOCl₂ and PBr₃ substitute without a free carbocation, so there is nothing to rearrange.' : 'Only secondary cations next to a more substituted carbon shift; the rest are captured where they form.'],
      ['Elimination?', ctx.has('socl2') || ctx.has('pbr3') ? 'The halide substitutes the activated OH directly.' : 'The halide ion is a good nucleophile and captures the cation before it loses H⁺.'],
    ],
    dehydration: [
      ['Substitution?', 'HSO₄⁻ and H₂PO₄⁻ are very poor nucleophiles, and the alkene distils off as it forms. With HBr or HCl you would get the alkyl halide instead.'],
    ],
    grignard: [
      ['Acid–base quench?', 'There is no O–H or N–H in the flask, so the carbanion survives to attack the C=O.'],
    ],
    'reduction-nabh4': esters ? [
      ['Ester reduced too?', 'NaBH₄ is too mild to reduce esters; LiAlH₄ would reduce both.'],
    ] : [],
  };
  const shift = (o.reason.match(/1,2-(hydride|methyl) shift/) || [])[0];
  const rows = (table[o.id] || []).filter(([title]) => !(shift && title === 'Rearrangement?'));
  if (shift) {
    rows.unshift(['Unrearranged product?', 'The ' + shift + ' turns a secondary carbocation into a more stable tertiary one faster than most of it can be trapped, so the unrearranged product is only minor.']);
  }
  return rows.map(([title, text]) => ({ title, text }));
}

function predictReaction(compounds, conditions) {
  const ctx = reactionContext(compounds, conditions);
  if (!ctx.substrates.length) {
    return { best: null, alternatives: [], hints: ['Add at least one organic reactant to predict a product.'] };
  }
  const outcomes = [];
  const hints = [];
  RX_RULES.forEach((rule) => {
    let results = [];
    try {
      results = rule.run(ctx) || [];
    } catch (error) {
      results = [];
    }
    results.forEach((r) => {
      if (r.hint) {
        if (!hints.includes(r.hint)) {
          hints.push(r.hint);
        }
      } else if (r.products.length) {
        r.rule = rule.id;
        outcomes.push(r);
      }
    });
  });
  const assumed = ctx.substrates.filter((s) => (s.graph.alkeneSpecs || []).length && !/[\/\\]/.test(s.compound.smiles || ''));
  outcomes.forEach((o) => {
    o.stoichiometry = rxStoichiometry(o, compounds);
    rxChemoselectivity(ctx, o);
    const used = assumed.filter((s) => o.consumes.some((u) => u && u.compound === s.compound));
    if (used.length && o.products.concat(o.minor).some((p) => p.stereo || p.fragment)) {
      const form = used[0].graph.alkeneSpecs[0].cis ? 'Z' : 'E';
      o.warnings.push('No E/Z geometry was given for the starting alkene, so the (' + form + ') form from the default drawing was assumed; write it with / and \\ in SMILES (C/C=C/C is E, C/C=C\\C is Z) to choose.');
    }
    if (RX_AIR_SENSITIVE.includes(o.id) && ['air', 'o2'].includes(ctx.conditions.atmosphere)) {
      o.warnings.push('This reagent reacts with moisture and O₂ in air — run it under an inert atmosphere (N₂ or Ar).');
    }
  });
  outcomes.sort((p, q) => q.score - p.score);
  outcomes.forEach((o) => {
    o.whyNot = rxWhyNot(ctx, o).concat(hints.map((text) => ({ title: '', text })));
  });
  const unique = [];
  outcomes.forEach((o) => {
    const key = o.id + '|' + o.products.map((p) => p.smiles).join('.');
    if (!unique.some((u) => u.key === key)) {
      unique.push(Object.assign(o, { key }));
    }
  });
  if (!unique.length && !hints.length) {
    hints.push('None of the built-in textbook reactions match these reactants and conditions.');
  }
  return { best: unique[0] || null, alternatives: unique.slice(1), hints: unique.length ? [] : hints };
}

const RX_BRANCH_TEMPERATURES = [0, 25, 60, 90, 180];
const RX_BRANCH_SOLVENTS = ['water', 'ethanol', 'dmso'];
const RX_BRANCH_LIMIT = 6;

function rxConditionVariants(conditions) {
  const c = normalizeReactionConditions(conditions);
  const t = reactionEffectiveTemperature(c);
  const variants = [];
  const push = (kind, label, change, apply) => {
    const next = JSON.parse(JSON.stringify(c));
    apply(next);
    variants.push({ kind, label, change, conditions: next });
  };
  c.additives.forEach((id) => push('remove', reactionAdditive(id).name, { type: 'additive', id, on: false },
    (n) => { n.additives = n.additives.filter((x) => x !== id); }));
  c.solvents.forEach((id) => push('remove', reactionSolvent(id).name, { type: 'solvent', id, on: false },
    (n) => { n.solvents = n.solvents.filter((x) => x !== id); }));
  if (c.energy === 'light') {
    push('remove', 'Light (h\u03bd)', { type: 'energy', id: 'heat' }, (n) => { n.energy = 'heat'; });
  }
  if (c.atmosphere === 'h2' || c.atmosphere === 'o2') {
    push('remove', reactionAtmosphereName(c.atmosphere) + ' atmosphere', { type: 'atmosphere', id: 'air' }, (n) => { n.atmosphere = 'air'; });
  }
  if (c.reflux || t !== 25) {
    push('remove', 'The temperature (' + t + ' \u00b0C)', { type: 'temperature', value: 25 }, (n) => { n.temperature = 25; n.reflux = false; });
  }
  if (c.additives.length < REACTION_LIMITS.maxAdditives) {
    REACTION_ADDITIVES.filter((a) => !c.additives.includes(a.id)).forEach((a) => push('add', '+ ' + a.name, { type: 'additive', id: a.id, on: true },
      (n) => { n.additives.push(a.id); }));
  }
  if (c.solvents.length < REACTION_LIMITS.maxSolvents) {
    RX_BRANCH_SOLVENTS.filter((id) => !c.solvents.includes(id)).forEach((id) => push('add', 'in ' + reactionSolvent(id).name.toLowerCase(), { type: 'solvent', id, on: true },
      (n) => { n.solvents.push(id); }));
  }
  if (c.energy !== 'light') {
    push('add', 'with light (h\u03bd)', { type: 'energy', id: 'light' }, (n) => { n.energy = 'light'; });
  }
  if (c.atmosphere !== 'h2') {
    push('add', 'under H\u2082', { type: 'atmosphere', id: 'h2' }, (n) => { n.atmosphere = 'h2'; });
  }
  RX_BRANCH_TEMPERATURES.filter((x) => Math.abs(x - t) > 5).sort((p, q) => Math.abs(p - t) - Math.abs(q - t))
    .forEach((x) => push('add', 'at ' + x + ' \u00b0C', { type: 'temperature', value: x }, (n) => { n.temperature = x; n.reflux = false; }));
  return variants;
}

function reactionAtmosphereName(id) {
  const a = REACTION_ATMOSPHERES.find((x) => x.id === id);
  return a ? a.name : id;
}

function reactionBranches(compounds, conditions, current) {
  const base = current || predictReaction(compounds, conditions);
  const key = base.best ? base.best.key : '';
  const factors = [];
  const branches = [];
  rxConditionVariants(conditions).forEach((v) => {
    if (v.kind === 'remove' && !base.best) {
      return;
    }
    const result = predictReaction(compounds, v.conditions);
    const next = result.best ? result.best.key : '';
    if (next === key) {
      return;
    }
    if (v.kind === 'remove') {
      factors.push({ label: v.label, change: v.change, outcome: result.best, hints: result.hints });
      return;
    }
    if (!result.best) {
      return;
    }
    const group = branches.find((b) => b.key === next);
    if (!group) {
      branches.push({ key: next, outcome: result.best, variants: [v] });
    } else if (v.change.type !== 'temperature' || !group.variants.some((x) => x.change.type === 'temperature')) {
      group.variants.push(v);
    }
  });
  branches.sort((p, q) => q.outcome.score - p.outcome.score);
  return { factors, branches: branches.slice(0, RX_BRANCH_LIMIT), more: Math.max(0, branches.length - RX_BRANCH_LIMIT) };
}

function reactionProductFragment(product) {
  return product.fragment || smilesToFragment(product.smiles);
}
