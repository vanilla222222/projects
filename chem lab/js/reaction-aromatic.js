const RXA_HALOGEN = {
  F: { h: 3.0, k: 0.7, induct: 0.3 },
  Cl: { h: 2.0, k: 0.4, induct: 0.2 },
  Br: { h: 1.5, k: 0.3, induct: 0.2 },
  I: { h: 1.2, k: 0.2, induct: 0.1 },
};

function rxaEigenvalues(input) {
  const n = input.length;
  const a = input.map((row) => row.slice());
  for (let sweep = 0; sweep < 60; sweep += 1) {
    let off = 0;
    for (let p = 0; p < n; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        off += a[p][q] * a[p][q];
      }
    }
    if (off < 1e-18) {
      break;
    }
    for (let p = 0; p < n; p += 1) {
      for (let q = p + 1; q < n; q += 1) {
        if (Math.abs(a[p][q]) < 1e-14) {
          continue;
        }
        const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k += 1) {
          const akp = a[k][p];
          const akq = a[k][q];
          a[k][p] = c * akp - s * akq;
          a[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k += 1) {
          const apk = a[p][k];
          const aqk = a[q][k];
          a[p][k] = c * apk - s * aqk;
          a[q][k] = s * apk + c * aqk;
        }
      }
    }
  }
  return a.map((row, i) => row[i]);
}

function rxaPiSystem(g, aromatic, options) {
  const opts = options || {};
  const centers = [];
  const index = new Map();
  const bonds = [];
  const ringKey = new Set();
  aromatic.rings.forEach((r) => r.forEach((a, i) => r.forEach((b, j) => {
    if (i !== j) {
      ringKey.add(a + ':' + b);
    }
  })));
  const add = (id, h, e) => {
    index.set(id, centers.length);
    centers.push({ id, h, e });
    return centers.length - 1;
  };
  const induct = (id, value) => {
    centers[index.get(id)].h += value;
  };
  aromatic.atoms.forEach((id) => {
    const atom = g.getAtom(id);
    const single = rxNeighbors(g, id).every((n) => n.bond.order === 1);
    let h = 0;
    let e = 1;
    if (atom.element === 'C') {
      e = atom.charge === 1 ? 0 : atom.charge === -1 ? 2 : 1;
    } else if (atom.element === 'N') {
      if (atom.charge > 0) {
        h = 2.0;
        e = single ? 2 : 1;
      } else if (single) {
        h = 1.0;
        e = 2;
      } else {
        h = opts.protonate ? 2.0 : 0.5;
      }
    } else if (atom.element === 'O') {
      h = atom.charge > 0 ? 2.5 : 2.0;
      e = atom.charge > 0 ? 1 : 2;
    } else if (atom.element === 'S' || atom.element === 'Se') {
      h = 0.5;
      e = 2;
    } else {
      h = 0.5;
      e = single ? 2 : 1;
    }
    add(id, h, e);
  });
  const hetK = (id) => {
    const el = g.getAtom(id).element;
    return el === 'S' || el === 'Se' ? 0.9 : el === 'O' ? 0.8 : 1;
  };
  g.bonds.forEach((b) => {
    if (index.has(b.atomA) && index.has(b.atomB)) {
      const k = ringKey.has(b.atomA + ':' + b.atomB) ? Math.min(hetK(b.atomA), hetK(b.atomB)) : 0.8;
      bonds.push([index.get(b.atomA), index.get(b.atomB), k]);
    }
  });
  const link = (from, id, h, e, k) => {
    const i = add(id, h, e);
    bonds.push([index.get(from), i, k]);
    return i;
  };
  aromatic.atoms.forEach((ring) => {
    rxNeighbors(g, ring).filter((n) => !aromatic.atoms.has(n.atom.id) && n.bond.order === 1 && !index.has(n.atom.id)).forEach((n) => {
      const x = n.atom;
      const rest = rxNeighbors(g, x.id).filter((m) => m.atom.id !== ring);
      if (RXA_HALOGEN[x.element]) {
        const p = RXA_HALOGEN[x.element];
        link(ring, x.id, p.h, 2, p.k);
        induct(ring, p.induct);
      } else if (x.element === 'O') {
        const acyl = rest.some((m) => rxNeighbors(g, m.atom.id).some((q) => q.bond.order === 2 && q.atom.element === 'O'));
        if (x.charge === -1) {
          link(ring, x.id, 1.0, 2, 1.0);
        } else {
          link(ring, x.id, acyl ? 2.5 : 2.0, 2, acyl ? 0.6 : 0.8);
        }
      } else if (x.element === 'N') {
        const terminalO = rest.filter((m) => m.atom.element === 'O' && rxNeighbors(g, m.atom.id).length === 1);
        if (terminalO.length === 2) {
          const i = link(ring, x.id, 2.0, 1, 0.8);
          terminalO.forEach((m, j) => {
            add(m.atom.id, 1.0, j ? 2 : 1);
            bonds.push([i, index.get(m.atom.id), 1]);
          });
        } else if (x.charge > 0 || rest.some((m) => m.bond.order > 1)) {
          induct(ring, 1.0);
        } else {
          const acyl = rest.some((m) => rxNeighbors(g, m.atom.id).some((q) => q.bond.order === 2 && q.atom.element === 'O'));
          link(ring, x.id, acyl ? 2.0 : 1.5, 2, acyl ? 0.7 : 0.9);
        }
      } else if (x.element === 'S' && rest.every((m) => m.bond.order === 1)) {
        link(ring, x.id, 1.0, 2, 0.6);
      } else if (x.element === 'S') {
        induct(ring, 1.0);
      } else if (x.element === 'C') {
        const multi = rest.find((m) => m.bond.order > 1);
        if (multi && ['O', 'N', 'S'].includes(multi.atom.element)) {
          const i = link(ring, x.id, 0, 1, 0.9);
          add(multi.atom.id, multi.atom.element === 'N' ? 0.5 : 1.0, 1);
          bonds.push([i, index.get(multi.atom.id), 1]);
        } else if (multi && multi.atom.element === 'C' && !index.has(multi.atom.id)) {
          const i = link(ring, x.id, 0, 1, 0.9);
          add(multi.atom.id, 0, 1);
          bonds.push([i, index.get(multi.atom.id), 1]);
        } else if (rest.filter((m) => m.atom.element === 'F').length === 3) {
          induct(ring, 0.6);
        } else if (!multi) {
          induct(ring, -0.5);
        }
      }
    });
  });
  return { centers, bonds, index };
}

function rxaPiEnergy(system, skip) {
  const keep = system.centers.map((c, i) => i).filter((i) => i !== skip);
  const pos = new Map(keep.map((i, j) => [i, j]));
  const m = keep.map((i) => keep.map((j) => (i === j ? system.centers[i].h : 0)));
  system.bonds.forEach(([a, b, k]) => {
    if (pos.has(a) && pos.has(b)) {
      m[pos.get(a)][pos.get(b)] = k;
      m[pos.get(b)][pos.get(a)] = k;
    }
  });
  let electrons = system.centers.reduce((sum, c) => sum + c.e, 0) - (skip === undefined ? 0 : 2);
  let energy = 0;
  rxaEigenvalues(m).sort((x, y) => y - x).forEach((x) => {
    const take = Math.min(2, Math.max(0, electrons));
    energy += take * x;
    electrons -= take;
  });
  return energy;
}

function rxaSites(g, aromatic, options) {
  const opts = options || {};
  const system = rxaPiSystem(g, aromatic, options);
  const base = rxaPiEnergy(system);
  const substituted = (id) => g.getAtom(id).element === 'C' && rxNeighbors(g, id).some((n) => !aromatic.atoms.has(n.atom.id) && n.atom.element !== 'H');
  const sites = [];
  aromatic.atoms.forEach((id) => {
    const atom = g.getAtom(id);
    if (atom.element !== 'C' || atom.charge || rxHydrogens(g, id) < 1) {
      return;
    }
    const near = rxNeighbors(g, id).filter((n) => aromatic.atoms.has(n.atom.id)).map((n) => n.atom.id);
    const crowd = near.filter(substituted).length;
    const outside = (n) => aromatic.atoms.has(n.atom.id) && !aromatic.rings.some((r) => r.includes(id) && r.includes(n.atom.id));
    const flank = near.filter((c) => rxNeighbors(g, c).some((n) => outside(n) && ['N', 'O', 'S', 'Se'].includes(n.atom.element) &&
      rxNeighbors(g, n.atom.id).every((m) => m.bond.order === 1))).length;
    const peri = near.filter((c) => rxNeighbors(g, c).some((n) => n.atom.id !== id && outside(n) && n.atom.element === 'C')).length;
    const pyridinium = opts.protonate && aromatic.rings.some((r) => r.includes(id) && r.some((a) => g.getAtom(a).element === 'N' &&
      rxNeighbors(g, a).some((n) => n.bond.order === 2)));
    const le = base - rxaPiEnergy(system, system.index.get(id));
    sites.push({ atom: id, le, score: le + 0.04 * crowd + 0.1 * flank + 0.08 * peri + (pyridinium ? 0.3 : 0) });
  });
  return sites.sort((p, q) => p.score - q.score);
}

function rxaRingClass(g, aromatic, atom) {
  const rings = aromatic.rings.filter((r) => r.includes(atom));
  const rich = (r) => r.length === 5 && r.some((id) => ['N', 'O', 'S', 'Se'].includes(g.getAtom(id).element) &&
    rxNeighbors(g, id).every((n) => n.bond.order === 1));
  const excessive = rings.some(rich);
  const fusedRich = !excessive && aromatic.rings.some((q) => rich(q) && rings.some((r) => r.filter((id) => q.includes(id)).length === 2));
  const deficient = rings.some((r) => r.some((id) => g.getAtom(id).element === 'N' && (g.getAtom(id).charge > 0 ||
    rxNeighbors(g, id).some((n) => n.bond.order === 2))));
  return { excessive, fusedRich, deficient, rings };
}

function rxaEasPlan(s, options) {
  const g = s.graph;
  const aromatic = s.info.aromatic;
  const benzene = (r) => r.length === 6 && r.every((id) => g.getAtom(id).element === 'C');
  if (aromatic.rings.length === 1 && benzene(aromatic.rings[0])) {
    const ring = aromatic.rings[0];
    const pos = rxEasPosition(g, ring);
    const ringSet = new Set(ring);
    const strength = Math.max(-9, ...ring.map((id) => (rxSubstituentEffect(g, id, ringSet) || { strength: -9 }).strength));
    return Object.assign(pos, { activated: strength >= 2, strongDonor: strength >= 3, excessive: false, deficient: false, fused: false });
  }
  const sites = rxaSites(g, aromatic, options);
  if (!sites.length) {
    return { atom: null };
  }
  const best = sites[0];
  const minor = sites.find((x) => x.score - best.score > 1e-6 && x.score - best.score < 0.12);
  const cls = rxaRingClass(g, aromatic, best.atom);
  const ringSet = new Set(cls.rings.flat());
  const effects = [...ringSet].map((id) => rxSubstituentEffect(g, id, aromatic.atoms)).filter((x) => x);
  const strength = effects.length ? Math.max(...effects.map((x) => x.strength)) : 0;
  const deactivated = effects.some((x) => x.strength <= -2) || cls.deficient;
  const fused = cls.rings.some((r) => aromatic.rings.some((q) => q !== r && q.filter((id) => r.includes(id)).length === 2)) ||
    aromatic.rings.some((q) => !cls.rings.includes(q) && q.filter((id) => ringSet.has(id)).length === 2);
  let note = 'Hückel localisation energies pick the position whose arenium (σ-complex) intermediate loses the least π stabilisation.';
  if (cls.excessive) {
    note = 'The five-membered heteroaromatic ring is π-excessive: the heteroatom lone pair stabilises the cationic intermediate, so it reacts much faster than benzene at the position shown.';
  } else if (fused) {
    note = 'In fused arenes the electrophile goes where the σ-complex keeps the most intact aromatic sextets (e.g. α in naphthalene, 9 in anthracene).';
  } else if (cls.deficient) {
    note = 'The ring nitrogen makes the ring π-deficient; substitution is sluggish and goes to the position meta to nitrogen.';
  }
  return {
    atom: best.atom,
    minorAtom: minor ? minor.atom : null,
    ratio: minor ? (minor.score - best.score < 0.04 ? [60, 40] : [80, 20]) : null,
    deactivated,
    activated: strength >= 2 || cls.excessive || cls.fusedRich || best.le < 2.2,
    strongDonor: strength >= 3 || cls.excessive,
    excessive: cls.excessive,
    deficient: cls.deficient && !effects.some((x) => x.strength >= 2),
    fused,
    note,
    sites,
  };
}

function rxaKekulize(g, atoms, needs) {
  const want = [...needs].filter((id) => atoms.has(id));
  const matched = new Map();
  const options = (id) => rxNeighbors(g, id).filter((n) => needs.has(n.atom.id) && atoms.has(n.atom.id) && !matched.has(n.atom.id)).map((n) => n.atom.id);
  const solve = () => {
    const open = want.filter((id) => !matched.has(id));
    if (!open.length) {
      return true;
    }
    const pick = open.reduce((best, id) => (options(id).length < options(best).length ? id : best), open[0]);
    for (const other of options(pick)) {
      matched.set(pick, other);
      matched.set(other, pick);
      if (solve()) {
        return true;
      }
      matched.delete(pick);
      matched.delete(other);
    }
    return false;
  };
  if (!solve()) {
    return false;
  }
  matched.forEach((b, a) => {
    if (a < b) {
      rxSetOrder(g, a, b, 2);
    }
  });
  return true;
}

function rxaDearomatize(g, aromatic, saturate) {
  const atoms = aromatic.atoms;
  const needs = new Set([...atoms].filter((id) => !saturate.includes(id) &&
    rxNeighbors(g, id).some((n) => n.bond.order === 2 && atoms.has(n.atom.id))));
  g.bonds.filter((b) => atoms.has(b.atomA) && atoms.has(b.atomB) && b.order === 2).forEach((b) => {
    b.order = 1;
  });
  return rxaKekulize(g, atoms, needs);
}

function rxaParaPair(s) {
  const g = s.graph;
  const aromatic = s.info.aromatic;
  const sites = rxaSites(g, aromatic).slice().sort((p, q) => p.le - q.le);
  for (const site of sites) {
    const ring = aromatic.rings.find((r) => r.length === 6 && r.includes(site.atom) && r.every((id) => g.getAtom(id).element === 'C'));
    if (!ring) {
      continue;
    }
    const partner = ring[(ring.indexOf(site.atom) + 3) % 6];
    if (rxHydrogens(g, partner) > 0) {
      return { a: site.atom, b: partner, ring, le: site.le };
    }
  }
  return null;
}

function rxaFusedSystem(s) {
  const rings = s.info.aromatic.rings;
  return rings.length > 1 && rings.some((r) => rings.some((q) => q !== r && q.filter((id) => r.includes(id)).length === 2));
}

function rxaRuleBirchFused(ctx) {
  if (!ctx.has('dissolvingMetal') || !ctx.solventNucleophiles.some((n) => n.alcohol)) {
    return [];
  }
  return ctx.substrates.filter((s) => rxaFusedSystem(s) && !s.info.alkynes.length).flatMap((s) => {
    const pair = rxaParaPair(s);
    const g = rxCloneGraph(s.graph);
    if (!pair || !rxaDearomatize(g, s.info.aromatic, [pair.a, pair.b])) {
      return [];
    }
    return [rxOutcome('birch-fused', 'Birch reduction of a fused arene', 'Dissolving-metal reduction', g,
      'Fused arenes accept electrons more easily than benzene. The radical anion is protonated at the positions whose reduction leaves the most intact benzene rings, so only one ring is reduced (naphthalene → 1,4-dihydronaphthalene, anthracene → 9,10-dihydroanthracene).',
      { score: 14, byproducts: ['NaOR', 'NaNH₂'], consumes: [rxUse(s, 1)] })];
  });
}

function rxaRuleAreneHydrogenation(ctx) {
  if (!ctx.has('H2') || !ctx.has('hydrogenationCatalyst')) {
    return [];
  }
  const pressure = Number(ctx.conditions.pressure) || 1;
  const forcing = pressure >= 50 || ctx.temperature >= 150;
  const heated = pressure >= 3 || ctx.temperature >= 60;
  return ctx.substrates.filter((s) => s.info.aromatic.rings.length && !s.info.alkenes.length && !s.info.alkynes.length).flatMap((s) => {
    const g = rxCloneGraph(s.graph);
    const rings = s.info.aromatic.rings;
    if (forcing) {
      g.bonds.filter((b) => s.info.aromatic.atoms.has(b.atomA) && s.info.aromatic.atoms.has(b.atomB)).forEach((b) => {
        b.order = 1;
      });
      const hetero = [...s.info.aromatic.atoms].some((id) => g.getAtom(id).element !== 'C');
      const count = [...s.info.aromatic.atoms].filter((id) => rxNeighbors(s.graph, id).some((n) => n.bond.order === 2 && s.info.aromatic.atoms.has(n.atom.id))).length / 2;
      return [rxOutcome('arene-hydrogenation', 'Arene hydrogenation', 'Catalytic hydrogenation', g,
        'Under high H₂ pressure and/or high temperature the catalyst overcomes the aromatic stabilisation, and every ring is fully saturated (benzene → cyclohexane' + (hetero ? ', pyridine → piperidine' : '') + '). All-cis delivery from the metal surface is typical for substituted rings.',
        { score: 11, consumes: [rxUse(s, 1), rxUse(ctx.get('H2'), count)], warnings: ['Rh/C or Ru/C are the usual catalysts at lower pressures; Pd/C is sluggish for arenes.'] })];
    }
    const benzo = rings.length === 2 && rxaFusedSystem(s) && rings.every((r) => r.length === 6 && r.every((id) => g.getAtom(id).element === 'C'));
    if (!heated || !benzo) {
      return [];
    }
    const ranked = rings.map((r) => ({ r, subs: r.filter((id) => rxNeighbors(g, id).some((n) => !s.info.aromatic.atoms.has(n.atom.id))).length }))
      .sort((p, q) => p.subs - q.subs);
    const ring = ranked[0].r;
    const other = ranked[1].r;
    const saturate = ring.filter((id) => !other.includes(id));
    if (!rxaDearomatize(g, s.info.aromatic, saturate)) {
      return [];
    }
    return [rxOutcome('arene-hydrogenation', 'Partial arene hydrogenation', 'Catalytic hydrogenation', g,
      'A fused arene loses less resonance energy than benzene when one ring is reduced, so with heat or moderate pressure it stops at the tetralin stage; the remaining benzene ring needs forcing conditions.',
      { score: 11, consumes: [rxUse(s, 1), rxUse(ctx.get('H2'), 2)] })];
  });
}

function rxaDienophile(p) {
  const ewg = (e) => [e.a, e.b].some((id) => rxNeighbors(p.graph, id).some((n) => n.atom.element === 'C' &&
    rxNeighbors(p.graph, n.atom.id).some((m) => m.bond.order >= 2 && ['O', 'N'].includes(m.atom.element))));
  const alkene = p.info.alkenes.find(ewg);
  const alkyne = p.info.alkynes.find(ewg);
  return alkene ? { p, e: alkene, triple: false } : alkyne ? { p, e: alkyne, triple: true } : null;
}

function rxaRuleAromaticDielsAlder(ctx) {
  const out = [];
  ctx.substrates.forEach((s) => {
    const g0 = s.graph;
    const furan = s.info.aromatic.rings.find((r) => r.length === 5 && r.filter((id) => g0.getAtom(id).element === 'O').length === 1 &&
      r.filter((id) => g0.getAtom(id).element === 'C').length === 4);
    let a;
    let b;
    let kind;
    if (furan && s.info.aromatic.rings.length === 1) {
      const o = furan.indexOf(furan.find((id) => g0.getAtom(id).element === 'O'));
      a = furan[(o + 1) % 5];
      b = furan[(o + 4) % 5];
      kind = 'furan';
    } else if (rxaFusedSystem(s)) {
      const pair = rxaParaPair(s);
      if (!pair || pair.le > 2.1) {
        return;
      }
      a = pair.a;
      b = pair.b;
      kind = 'acene';
    } else {
      return;
    }
    const partner = ctx.substrates.filter((p) => p !== s).map(rxaDienophile).find((x) => x);
    if (!partner) {
      return;
    }
    if (kind === 'acene' && ctx.temperature < 80) {
      out.push(rxHint('Anthracene-type acenes add dienophiles across their central ring only on heating (refluxing xylene or toluene).'));
      return;
    }
    const joined = rxxJoin(s, partner.p);
    const g = joined.g;
    if (!rxaDearomatize(g, s.info.aromatic, [a, b])) {
      return;
    }
    const ea = joined.map.get(partner.e.a);
    const eb = joined.map.get(partner.e.b);
    rxSetOrder(g, ea, eb, partner.triple ? 2 : 1);
    g.addBond(a, ea);
    g.addBond(b, eb);
    const res = rxOutcome('aromatic-diels-alder', 'Diels–Alder reaction of an aromatic diene', 'Pericyclic [4+2] cycloaddition', g,
      kind === 'furan'
        ? 'Furan has the least aromatic stabilisation of the common heteroaromatics, so it acts as a cyclic diene. C2 and C5 bond to the dienophile, and the ring oxygen becomes a one-atom bridge (7-oxanorbornene).'
        : 'The central ring of anthracene reacts across C9/C10 because the adduct keeps two intact benzene rings, losing much less aromatic stabilisation than attack at an outer ring would.',
      { score: 13, consumes: [rxUse(s, 1), rxUse(partner.p, 1)] });
    if (kind === 'furan') {
      res.warnings.push('The furan adduct forms reversibly: the endo adduct forms faster but the exo adduct is the thermodynamic product on standing or warming.');
    }
    out.push(res);
  });
  return out;
}

function rxaRuleChichibabin(ctx) {
  const amide = ctx.get('sodamide');
  if (!amide) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const g0 = s.graph;
    const target = [...s.info.aromatic.atoms].filter((id) => g0.getAtom(id).element === 'C' && rxHydrogens(g0, id) > 0 &&
      rxNeighbors(g0, id).some((n) => n.atom.element === 'N' && s.info.aromatic.atoms.has(n.atom.id) && !n.atom.charge &&
        rxNeighbors(g0, n.atom.id).some((m) => m.bond.order === 2) && rxNeighbors(g0, n.atom.id).length === 2))[0];
    if (!target) {
      return [];
    }
    if (ctx.temperature < 80) {
      return [rxHint('The Chichibabin amination needs heat (NaNH₂ in refluxing toluene or xylene, 110–140 °C).')];
    }
    const g = rxCloneGraph(g0);
    rxAttach(g, 'N', target);
    return [rxOutcome('chichibabin', 'Chichibabin amination', 'Nucleophilic aromatic substitution of hydride', g,
      'Amide ion adds to the electron-poor C=N carbon next to the ring nitrogen (a σ-adduct stabilised on N). Loss of hydride, which reacts with NH₂⁻ or the product to release H₂, restores aromaticity, and aqueous work-up gives the 2-amino heteroarene.',
      { score: 13, byproducts: ['H₂'], consumes: [rxUse(s, 1), rxUse(amide, 1)], warnings: ['The sodium salt of the amine forms first; water work-up liberates the free amine.'] })];
  });
}

RX_RULES.push(
  { id: 'birch-fused', name: 'Birch reduction of fused arenes', run: rxaRuleBirchFused },
  { id: 'arene-hydrogenation', name: 'Arene hydrogenation', run: rxaRuleAreneHydrogenation },
  { id: 'aromatic-diels-alder', name: 'Diels–Alder of aromatic dienes', run: rxaRuleAromaticDielsAlder },
  { id: 'chichibabin', name: 'Chichibabin amination', run: rxaRuleChichibabin },
);
