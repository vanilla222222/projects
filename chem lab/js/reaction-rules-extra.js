Object.assign(RX_FORMULA_TAGS, {
  C13H22N2: 'carbodiimide', C8H17N3: 'carbodiimide', C7H10N2: 'dmap', C3H4N2: 'amineBase', C9H16N2: 'amineBase',
  C10H18O5: 'boc2o', C6H15ClSi: 'silylChloride', C3H9ClSi: 'silylChloride', C9H21ClSi: 'silylChloride',
  'F−': 'fluoride', 'C16H36N+': 'quaternaryAmmonium', 'Cs+': 'cation', 'O4P3−': 'weakBase', 'HCO3−': 'weakBase',
  C8H19Al: 'dibal', O4Os: 'osmium', C5H11NO2: 'nmo', 'H2N−': 'sodamide', CH2I2: 'diiodomethane', C4H10Zn: 'diethylzinc',
  CuI: 'copper', H4N2: 'hydrazine', H3NO: 'hydroxylamine', C4H6HgO4: 'mercuricAcetate', CrO3: 'jones',
  C18H15P: 'triphenylphosphine', CBr4: 'tetrahalomethane', CCl4: 'tetrahalomethane', C2HF3O2: 'strongAcid',
  C2Cl2O2: 'oxalylChloride', C2H6OS: 'dmso',
});

Object.assign(RX_FORMULA_GUARDS, {
  C5H11NO2: (g, ids) => ids.some((id) => g.getAtom(id).element === 'N' && rxNeighbors(g, id).some((n) => n.atom.element === 'O' && rxHydrogens(g, n.atom.id) === 0 && (n.bond.order === 2 || n.atom.charge === -1))),
  C7H10N2: (g, ids) => ids.some((id) => g.getAtom(id).element === 'N' && rxCarbonNeighbors(g, id).length === 3 && rxNeighbors(g, id).every((n) => n.bond.order === 1)),
  C3H4N2: (g) => !g.bonds.some((b) => g.getAtom(b.atomA).element === 'N' && g.getAtom(b.atomB).element === 'N'),
  C9H16N2: (g) => g.bonds.some((b) => b.order === 2 && [g.getAtom(b.atomA).element, g.getAtom(b.atomB).element].sort().join('') === 'CN'),
  C2H6OS: (g, ids) => ids.some((id) => g.getAtom(id).element === 'S' && rxCarbonNeighbors(g, id).length === 2),
  CH2I2: (g, ids) => ids.some((id) => g.getAtom(id).element === 'C' && rxNeighbors(g, id).filter((n) => n.atom.element === 'I').length === 2),
});

Object.assign(RX_ADDITIVE_TAGS, {
  pdoac2: ['palladium0'], grubbs: ['metathesis'], znhg: ['zincAmalgam'], zncu: ['zincCopper'], dmp: ['dmp'], piperidine: ['amineBase'],
});

RX_AIR_SENSITIVE.push('enolate-alkylation', 'acetylide-alkylation', 'acetylide-addition', 'dibal', 'grignard-carboxylation', 'grignard-nitrile', 'simmons-smith');

function rxxBase(ctx, tags) {
  const tag = tags.find((t) => ctx.has(t));
  return tag ? { tag, entry: ctx.get(tag) } : null;
}

function rxxWater(ctx) {
  return ctx.has('H2O') || ctx.solventNucleophiles.some((n) => n.name === 'water');
}

function rxxJoin(target, other) {
  const g = rxCloneGraph(target.graph);
  const map = rxMerge(g, other.graph, other.graph.atoms.map((a) => a.id));
  return { g, map };
}

function rxxAddCation(ctx, g) {
  const cation = ctx.get('cation');
  const metal = cation && cation.ids.length === 1 ? cation.graph.getAtom(cation.ids[0]) : null;
  if (metal) {
    const ion = g.addAtom(metal.element, 0, 0);
    ion.charge = metal.charge;
  }
}

function rxxInertWarning(ctx, out) {
  if (['air', 'o2'].includes(ctx.conditions.atmosphere)) {
    out.warnings.push('Degas the solvent and run under N₂ or Ar: O₂ oxidises the Pd(0) catalyst and promotes homocoupling.');
  }
}

function rxxArylHalides(ctx) {
  const rank = { I: 0, Br: 1, Cl: 2 };
  return ctx.substrates.flatMap((s) => s.info.arylHalides.map((x) => ({ s, x: x.x, c: x.c, halogen: s.graph.getAtom(x.x).element })))
    .sort((p, q) => rank[p.halogen] - rank[q.halogen]);
}

function rxxHalides(ctx) {
  return ctx.substrates.flatMap((s) => s.info.halides.map((h) => Object.assign({ s }, h))).sort((p, q) => p.degree - q.degree);
}

function rxxBoronic(s) {
  const g = s.graph;
  const b = g.atoms.find((a) => a.element === 'B' && rxNeighbors(g, a.id).filter((n) => n.atom.element === 'O').length >= 2 && rxCarbonNeighbors(g, a.id).length === 1);
  return b ? { b: b.id, c: rxCarbonNeighbors(g, b.id)[0].atom.id } : null;
}

function rxxTerminalAlkyne(s) {
  const g = s.graph;
  for (const x of s.info.alkynes) {
    if (rxHydrogens(g, x.a) === 1) {
      return { t: x.a, i: x.b };
    }
    if (rxHydrogens(g, x.b) === 1) {
      return { t: x.b, i: x.a };
    }
  }
  return null;
}

function rxxTerminalAlkenes(s) {
  const g = s.graph;
  return s.info.alkenes.flatMap((e) => [[e.a, e.b], [e.b, e.a]]
    .filter(([t, i]) => rxHydrogens(g, t) === 2 && rxHydrogens(g, i) >= 1)
    .map(([t, i]) => ({ t, i })));
}

function rxxPhenols(s) {
  const g = s.graph;
  return g.atoms.filter((a) => a.element === 'O' && !a.charge && rxHydrogens(g, a.id) === 1 && rxNeighbors(g, a.id).length === 1 &&
    s.info.aromatic.atoms.has(rxNeighbors(g, a.id)[0].atom.id)).map((a) => ({ o: a.id, c: rxNeighbors(g, a.id)[0].atom.id }));
}

function rxxThiols(s) {
  const g = s.graph;
  return g.atoms.filter((a) => a.element === 'S' && !a.charge && rxHydrogens(g, a.id) === 1 && rxNeighbors(g, a.id).length === 1 &&
    rxNeighbors(g, a.id)[0].atom.element === 'C').map((a) => a.id);
}

function rxxActiveMethylene(s) {
  const g = s.graph;
  const acceptors = new Set(s.info.carbonyls.filter((c) => ['ketone', 'aldehyde', 'ester', 'acid'].includes(c.kind)).map((c) => c.c).concat(s.info.nitriles.map((n) => n.c)));
  const hit = g.atoms.find((a) => a.element === 'C' && !a.charge && rxIsSp3(g, a.id) && rxHydrogens(g, a.id) > 0 &&
    rxNeighbors(g, a.id).filter((n) => acceptors.has(n.atom.id)).length >= 2);
  return hit ? { c: hit.id, groups: rxNeighbors(g, hit.id).filter((n) => acceptors.has(n.atom.id)).map((n) => n.atom.id) } : null;
}

function rxxEnones(s) {
  const g = s.graph;
  const out = [];
  s.info.alkenes.forEach((e) => {
    [[e.a, e.b], [e.b, e.a]].forEach(([alpha, beta]) => {
      const acc = s.info.carbonyls.find((c) => ['ketone', 'aldehyde', 'ester'].includes(c.kind) && g.getBond(alpha, c.c));
      const nitrile = s.info.nitriles.find((n) => g.getBond(alpha, n.c));
      if ((acc || nitrile) && rxHydrogens(g, beta) > 0) {
        out.push({ alpha, beta, kind: acc ? acc.kind : 'nitrile' });
      }
    });
  });
  return out;
}

function rxxSubstituents(g, id, exclude) {
  return rxNeighbors(g, id).filter((n) => n.atom.id !== exclude).map((n) => n.atom.id);
}

function rxxSetE(g, a, b) {
  const sa = rxxSubstituents(g, a, b);
  const sb = rxxSubstituents(g, b, a);
  if (sa.length === 1 && sb.length === 1) {
    rxsAlkene(g, a, b, sa[0], sb[0], false);
  }
}

function rxxOxoCarbonyls(s) {
  return s.info.carbonyls.filter((c) => c.kind === 'aldehyde' || c.kind === 'ketone');
}

function rxxRuleSuzuki(ctx) {
  const boron = ctx.substrates.map((s) => ({ s, b: rxxBoronic(s) })).find((x) => x.b);
  if (!boron) {
    return [];
  }
  const aryl = rxxArylHalides(ctx).find((x) => x.s !== boron.s);
  if (!aryl) {
    return [rxHint('A boronic acid couples with an aryl or vinyl halide (Suzuki coupling); add an aryl bromide or iodide as the partner.')];
  }
  if (!ctx.has('palladium0')) {
    return [rxHint('The Suzuki coupling needs a palladium catalyst such as Pd(PPh₃)₄ or Pd(OAc)₂.')];
  }
  const base = rxxBase(ctx, ['weakBase', 'hydroxide', 'alkoxide']);
  if (!base) {
    return [rxHint('Suzuki couplings need a base (K₂CO₃, Cs₂CO₃, K₃PO₄ or NaOH) to activate the boronic acid for transmetalation.')];
  }
  const { g, map } = rxxJoin(aryl.s, boron.s);
  const bc = map.get(boron.b.c);
  rxRemoveBranch(g, map.get(boron.b.b), bc);
  g.removeAtom(aryl.x);
  g.addBond(aryl.c, bc);
  const out = rxOutcome('suzuki', 'Suzuki–Miyaura coupling', 'Pd-catalysed cross-coupling', g,
    'Pd(0) inserts into the C–' + aryl.halogen + ' bond (oxidative addition). The base turns the boronic acid into a boronate that hands its carbon to palladium (transmetalation), and reductive elimination joins the two carbons and regenerates Pd(0).',
    { score: 14, byproducts: ['boric acid / borate salts', 'the halide salt of the base'], consumes: [rxUse(aryl.s, 1), rxUse(boron.s, 1), rxUse(base.entry, 2)] });
  if (aryl.halogen === 'Cl') {
    out.warnings.push('Aryl chlorides are sluggish in Suzuki couplings; use the bromide or iodide, or a bulky electron-rich ligand (SPhos, XPhos).');
  }
  rxxInertWarning(ctx, out);
  return [out];
}

function rxxRuleHeck(ctx) {
  if (!ctx.has('palladium0')) {
    return [];
  }
  const aryl = rxxArylHalides(ctx)[0];
  const alkene = aryl ? ctx.substrates.filter((s) => s !== aryl.s).map((s) => ({ s, e: rxxTerminalAlkenes(s)[0] })).find((x) => x.e) : null;
  if (!alkene) {
    return [];
  }
  const base = rxxBase(ctx, ['amineBase', 'weakBase', 'alkoxide']);
  if (!base) {
    return [rxHint('The Heck reaction needs a base (Et₃N or K₂CO₃) to remove HX and regenerate the Pd(0) catalyst.')];
  }
  const { g, map } = rxxJoin(aryl.s, alkene.s);
  const t = map.get(alkene.e.t);
  const i = map.get(alkene.e.i);
  g.removeAtom(aryl.x);
  g.addBond(aryl.c, t);
  rxxSetE(g, i, t);
  const out = rxOutcome('heck', 'Heck reaction', 'Pd-catalysed cross-coupling', g,
    'Pd(0) inserts into the C–' + aryl.halogen + ' bond, the alkene inserts into the Pd–C bond with the aryl group going to the less hindered terminal carbon, and syn β-hydride elimination releases the trans (E) substituted alkene. The base mops up HX so Pd(0) is regenerated.',
    { score: 13, byproducts: ['the base hydrohalide salt'], consumes: [rxUse(aryl.s, 1), rxUse(alkene.s, 1), rxUse(base.entry, 1)] });
  if (ctx.temperature < 60) {
    out.warnings.push('Heck couplings are normally run hot (80–120 °C, e.g. in DMF or MeCN).');
  }
  rxxInertWarning(ctx, out);
  return [out];
}

function rxxRuleSonogashira(ctx) {
  if (!ctx.has('palladium0')) {
    return [];
  }
  const aryl = rxxArylHalides(ctx)[0];
  const alkyne = aryl ? ctx.substrates.filter((s) => s !== aryl.s).map((s) => ({ s, a: rxxTerminalAlkyne(s) })).find((x) => x.a) : null;
  if (!alkyne) {
    return [];
  }
  const base = rxxBase(ctx, ['amineBase', 'weakBase']);
  if (!base) {
    return [rxHint('The Sonogashira coupling needs an amine base (Et₃N or iPr₂NH) to deprotonate the alkyne and remove HX.')];
  }
  const { g, map } = rxxJoin(aryl.s, alkyne.s);
  g.removeAtom(aryl.x);
  g.addBond(aryl.c, map.get(alkyne.a.t));
  const copper = ctx.has('copper');
  const out = rxOutcome('sonogashira', 'Sonogashira coupling', 'Pd/Cu-catalysed cross-coupling', g,
    'Cu(I) and the amine turn the terminal alkyne into a copper acetylide, which transfers the alkynyl group to the aryl–Pd(II) species formed by oxidative addition; reductive elimination gives the aryl alkyne.',
    { score: copper ? 14 : 12, byproducts: ['the amine hydrohalide salt'], consumes: [rxUse(aryl.s, 1), rxUse(alkyne.s, 1), rxUse(base.entry, 1)] });
  if (!copper) {
    out.warnings.push('The classic Sonogashira uses CuI (1–5 mol%) as a co-catalyst; copper-free versions need special ligands and heat.');
  } else {
    out.warnings.push('With Cu and O₂ present, the alkyne can dimerise (Glaser coupling); keep the flask oxygen-free.');
  }
  rxxInertWarning(ctx, out);
  return [out];
}

function rxxRuleBuchwald(ctx) {
  if (!ctx.has('palladium0')) {
    return [];
  }
  const aryl = rxxArylHalides(ctx)[0];
  const amine = aryl ? ctx.substrates.filter((s) => s !== aryl.s).flatMap((s) => s.info.amines.map((a) => ({ s, a }))).find(Boolean) : null;
  if (!amine) {
    return [];
  }
  const base = rxxBase(ctx, ['alkoxide', 'amideBase', 'hydride', 'weakBase']);
  if (!base) {
    return [rxHint('Buchwald–Hartwig amination needs a strong base such as NaOtBu, KOtBu or Cs₂CO₃.')];
  }
  const { g, map } = rxxJoin(aryl.s, amine.s);
  g.removeAtom(aryl.x);
  g.addBond(aryl.c, map.get(amine.a.n));
  const out = rxOutcome('buchwald-hartwig', 'Buchwald–Hartwig amination', 'Pd-catalysed C–N coupling', g,
    'Pd(0) inserts into the C–' + aryl.halogen + ' bond; the amine binds to palladium and is deprotonated by the base, and reductive elimination forms the new aryl C–N bond.',
    { score: 13, byproducts: ['the halide salt of the base', 'the conjugate acid of the base'], consumes: [rxUse(aryl.s, 1), rxUse(amine.s, 1.2), rxUse(base.entry, 1.4)] });
  out.warnings.push('A bulky phosphine ligand (BINAP, XPhos, BrettPhos) is normally added with the Pd source.');
  rxxInertWarning(ctx, out);
  return [out];
}

function rxxRuleCarbodiimide(ctx) {
  const acid = ctx.substrates.flatMap((s) => s.info.carbonyls.filter((c) => c.kind === 'acid').map((c) => ({ s, c })))[0];
  if (!acid) {
    return [];
  }
  const others = ctx.substrates.filter((s) => s !== acid.s);
  const amines = others.flatMap((s) => s.info.amines.map((a) => ({ s, atom: a.n, kind: 'amine' })));
  const alcohols = others.flatMap((s) => s.info.alcohols.map((a) => ({ s, atom: a.o, kind: 'alcohol' })).concat(rxxPhenols(s).map((p) => ({ s, atom: p.o, kind: 'alcohol' }))));
  const agent = ctx.get('carbodiimide');
  if (!agent) {
    return amines.length ? [rxHint('A carboxylic acid and an amine just form an ammonium carboxylate salt at room temperature. Activate the acid first with a coupling reagent (DCC, EDC) or by making the acid chloride (SOCl₂).')] : [];
  }
  const partner = amines[0] || alcohols[0];
  if (!partner) {
    return [rxHint('DCC or EDC activates the acid as an O-acylisourea; add an amine (amide) or an alcohol (ester) to capture it.')];
  }
  const g = rxCloneGraph(acid.s.graph);
  g.removeAtom(acid.c.hetero);
  const map = rxMerge(g, partner.s.graph, partner.s.graph.atoms.map((a) => a.id));
  g.addBond(map.get(partner.atom), acid.c.c);
  const urea = agent.formula === 'C13H22N2' ? 'dicyclohexylurea (DCU, filtered off)' : 'the water-soluble urea from EDC (washed out)';
  const amide = partner.kind === 'amine';
  const out = rxOutcome(amide ? 'amide-coupling' : 'steglich', amide ? 'Carbodiimide amide coupling' : 'Steglich esterification', 'Nucleophilic acyl substitution', g,
    'The carbodiimide adds the carboxylate to give an O-acylisourea, a very reactive activated ester. ' + (amide ? 'The amine' : 'The alcohol') +
      ' attacks its carbonyl carbon and the urea leaves, giving ' + (amide ? 'the amide' : 'the ester') + ' under mild, neutral conditions.',
    { score: 14, byproducts: [urea], consumes: [rxUse(acid.s, 1), rxUse(partner.s, 1), rxUse(agent, 1.1)] });
  if (!amide && !ctx.has('dmap')) {
    out.warnings.push('Without DMAP (5–10 mol%) the O-acylisourea slowly rearranges to an unreactive N-acylurea; DMAP is what makes the Steglich esterification work.');
  }
  if (amide) {
    out.warnings.push('HOBt or HOAt is often added to suppress racemisation of α-stereocentres (e.g. in peptide couplings).');
  }
  return [out];
}

function rxxRuleAcidChloride(ctx) {
  const reagent = ['socl2', 'oxalylChloride'].find((t) => ctx.has(t));
  if (!reagent) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const acids = s.info.carbonyls.filter((c) => c.kind === 'acid');
    if (!acids.length) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    acids.forEach((c) => {
      g.getAtom(c.hetero).element = 'Cl';
    });
    const out = rxOutcome('acid-chloride', 'Acid → acyl chloride', 'Nucleophilic acyl substitution', g,
      reagent === 'socl2'
        ? 'The acid attacks SOCl₂ to form an acyl chlorosulfite; chloride adds to the carbonyl and the leaving group falls apart to SO₂ and HCl, which bubble off.'
        : 'Oxalyl chloride (with a drop of DMF, which forms the Vilsmeier reagent) converts the acid into the acyl chloride; the by-products CO, CO₂ and HCl are all gases.',
      { score: 13, byproducts: reagent === 'socl2' ? ['SO₂', 'HCl'] : ['CO', 'CO₂', 'HCl'], consumes: [rxUse(s, 1), rxUse(ctx.get(reagent), acids.length)] });
    if (s.info.alcohols.length) {
      out.warnings.push('The alcohol OH in this molecule will also react with the chlorinating agent.');
    }
    return [out];
  });
}

function rxxMigration(g, r, aromatic) {
  if (aromatic.has(r)) {
    return 3.5;
  }
  if (rxNeighbors(g, r).some((n) => n.bond.order > 1)) {
    return 3;
  }
  return [0, 1, 2, 4, 5][rxCarbonNeighbors(g, r).length] || 0;
}

function rxxRuleBaeyerVilliger(ctx) {
  if (!ctx.has('mcpba')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const target = rxxOxoCarbonyls(s)[0];
    if (!target) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    const aromatic = s.info.aromatic.atoms;
    const groups = rxCarbonNeighbors(g, target.c).map((n) => n.atom.id).sort((p, q) => rxxMigration(g, q, aromatic) - rxxMigration(g, p, aromatic));
    let reason;
    if (target.kind === 'aldehyde') {
      rxAttach(g, 'O', target.c);
      reason = 'With an aldehyde the hydrogen migrates best, so the Baeyer–Villiger oxidation simply gives the carboxylic acid.';
    } else {
      const r = groups[0];
      rxSetOrder(g, target.c, r, 0);
      const o = rxAttach(g, 'O', target.c);
      g.addBond(o.id, r);
      rxsReplace(g, r, target.c, o.id, false);
      const ring = rxRings(s.graph, 8).some((x) => x.includes(target.c) && x.includes(r));
      reason = 'The peroxyacid adds to the C=O to give the Criegee intermediate; as the weak O–O bond breaks, the group best able to carry positive charge (tertiary > secondary ≈ aryl > primary > methyl) migrates from carbon to oxygen with retention of configuration. ' +
        (ring ? 'For a cyclic ketone this inserts an O into the ring, giving a lactone.' : 'An O atom is inserted between the carbonyl carbon and that group, giving an ester.');
    }
    const out = rxOutcome('baeyer-villiger', 'Baeyer–Villiger oxidation', 'Oxidation (rearrangement)', g, reason,
      { score: s.info.alkenes.length ? 9 : 13, byproducts: ['3-chlorobenzoic acid'], consumes: [rxUse(s, 1), rxUse(ctx.get('mcpba'), 1)] });
    if (s.info.alkenes.length) {
      out.warnings.push('mCPBA epoxidises C=C bonds faster than it oxidises ketones, so the epoxide forms first.');
    }
    return [out];
  });
}

function rxxRuleNitrileHydrolysis(ctx) {
  const hydroxide = ctx.get('hydroxide');
  const acid = ctx.has('strongAcid') && rxxWater(ctx);
  if (!hydroxide && !acid) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    if (!s.info.nitriles.length) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    s.info.nitriles.forEach((n) => {
      g.removeAtom(n.n);
      rxAttach(g, 'O', n.c, 2);
      rxAttach(g, 'O', n.c, 1, hydroxide ? -1 : 0);
    });
    if (hydroxide) {
      rxxAddCation(ctx, g);
    }
    const hot = ctx.temperature >= 80;
    const out = rxOutcome('nitrile-hydrolysis', 'Nitrile hydrolysis', 'Addition–hydrolysis', g,
      (hydroxide ? 'Hydroxide adds to the C≡N carbon' : 'The protonated nitrile is attacked by water') +
        '; tautomerisation gives an amide, which is hydrolysed further to the ' + (hydroxide ? 'carboxylate salt (acidify the work-up for the free acid)' : 'carboxylic acid') + ', releasing the nitrogen as ' + (hydroxide ? 'NH₃.' : 'NH₄⁺.'),
      { score: hot ? 12 : 9, byproducts: [hydroxide ? 'NH₃' : 'NH₄⁺ salt'], consumes: [rxUse(s, 1), hydroxide ? rxUse(hydroxide, s.info.nitriles.length) : null] });
    if (!hot) {
      out.warnings.push('Nitrile hydrolysis is slow: it needs prolonged heating at reflux. Under mild conditions it can stop at the amide.');
    }
    return [out];
  });
}

function rxxRuleAmideHydrolysis(ctx) {
  const hydroxide = ctx.get('hydroxide');
  const acid = ctx.has('strongAcid') && rxxWater(ctx);
  if (!hydroxide && !acid) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const amides = s.info.carbonyls.filter((c) => c.kind === 'amide' && rxNeighbors(s.graph, c.c).filter((n) => n.atom.element !== 'C').length === 2);
    if (!amides.length) {
      return [];
    }
    if (ctx.temperature < 80) {
      return [rxHint('Amides are the least reactive acid derivatives; hydrolysis needs hours of heating with strong acid or base.')];
    }
    const g = rxCloneGraph(s.graph);
    amides.forEach((c) => {
      rxSetOrder(g, c.c, c.hetero, 0);
      rxAttach(g, 'O', c.c, 1, hydroxide ? -1 : 0);
    });
    if (hydroxide) {
      rxxAddCation(ctx, g);
    }
    return [rxOutcome('amide-hydrolysis', 'Amide hydrolysis', 'Nucleophilic acyl substitution', g,
      (hydroxide ? 'Hydroxide adds to the amide C=O and, on prolonged heating, expels the amide nitrogen; the acid is left as its carboxylate salt.'
        : 'The protonated amide is attacked by water and the amine leaves; in acid it ends up as its ammonium salt, which drives the reaction.') +
        ' The C–N bond breaks, releasing the ' + (amides.length === 1 && rxRings(s.graph, 8).some((r) => r.includes(amides[0].c) && r.includes(amides[0].hetero)) ? 'ring-opened amino acid.' : 'carboxylic acid and the amine.'),
      { score: 11, consumes: [rxUse(s, 1), hydroxide ? rxUse(hydroxide, amides.length) : null] })];
  });
}

function rxxRuleHydrazine(ctx) {
  const hydrazine = ctx.get('hydrazine');
  const hydroxylamine = ctx.get('hydroxylamine');
  if (!hydrazine && !hydroxylamine) {
    return [];
  }
  const wolff = hydrazine && (ctx.has('hydroxide') || ctx.has('alkoxide'));
  return ctx.substrates.flatMap((s) => {
    const targets = rxxOxoCarbonyls(s);
    if (!targets.length) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    if (wolff) {
      targets.forEach((c) => g.removeAtom(c.o));
      const out = rxOutcome('wolff-kishner', 'Wolff–Kishner reduction', 'Reduction (deoxygenation)', g,
        'Hydrazine condenses with the C=O to give a hydrazone. Strong base then removes the N–H protons in turn, N₂ is lost and the carbanion is protonated, so the C=O becomes a CH₂ group.',
        { score: 14, byproducts: ['N₂', 'H₂O'], consumes: [rxUse(s, 1), rxUse(hydrazine, targets.length)] });
      if (ctx.temperature < 150) {
        out.warnings.push('The Wolff–Kishner reduction needs about 200 °C (Huang-Minlon: KOH, N₂H₄ in refluxing ethylene glycol).');
      }
      out.warnings.push('The strongly basic conditions suit acid-sensitive substrates; for base-sensitive ones use the Clemmensen reduction instead.');
      return [out];
    }
    const hydro = Boolean(hydrazine);
    targets.forEach((c) => {
      g.getAtom(c.o).element = 'N';
      rxAttach(g, hydro ? 'N' : 'O', c.o);
    });
    const out = rxOutcome(hydro ? 'hydrazone' : 'oxime', hydro ? 'Hydrazone formation' : 'Oxime formation', 'Nucleophilic addition–elimination', g,
      (hydro ? 'Hydrazine' : 'Hydroxylamine') + ' adds to the C=O and water is lost from the carbinolamine, giving the C=N–' + (hydro ? 'NH₂ hydrazone.' : 'OH oxime.') +
        ' The α-effect makes these nitrogen nucleophiles especially reactive, and the products are stable crystalline derivatives.',
      { score: 12, byproducts: ['H₂O'], consumes: [rxUse(s, 1), rxUse(hydro ? hydrazine : hydroxylamine, targets.length)] });
    if (hydro) {
      out.warnings.push('Add KOH and heat strongly (≈200 °C) to go on to the Wolff–Kishner reduction.');
    } else {
      out.warnings.push('Unsymmetrical ketones give E/Z oxime mixtures; acid (Beckmann rearrangement) converts oximes to amides.');
    }
    return [out];
  });
}

function rxxRuleClemmensen(ctx) {
  if (!ctx.has('zincAmalgam')) {
    return [];
  }
  if (!ctx.has('strongAcid')) {
    return [rxHint('The Clemmensen reduction uses zinc amalgam in concentrated HCl; add HCl.')];
  }
  return ctx.substrates.flatMap((s) => {
    const targets = rxxOxoCarbonyls(s);
    if (!targets.length) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    targets.forEach((c) => g.removeAtom(c.o));
    const out = rxOutcome('clemmensen', 'Clemmensen reduction', 'Reduction (deoxygenation)', g,
      'Electron transfer from the zinc surface in hot concentrated HCl reduces the C=O all the way to CH₂. It works best for aryl ketones, e.g. after a Friedel–Crafts acylation.',
      { score: 13, byproducts: ['ZnCl₂', 'H₂O'], consumes: [rxUse(s, 1)] });
    out.warnings.push('The strongly acidic conditions destroy acid-sensitive groups; use the Wolff–Kishner reduction for those.');
    return [out];
  });
}

function rxxRuleAcetylide(ctx) {
  const grignard = ctx.get('grignard');
  const lithium = grignard && grignard.graph.getAtom(grignard.metal).element === 'Li' ? grignard : null;
  const base = ctx.get('sodamide') || ctx.get('amideBase') || lithium;
  if (!base) {
    return [];
  }
  const alkyne = ctx.substrates.map((s) => ({ s, a: rxxTerminalAlkyne(s) })).find((x) => x.a);
  if (!alkyne) {
    return [];
  }
  const halide = rxxHalides(ctx).find((h) => h.s !== alkyne.s);
  const carbonyl = ctx.substrates.filter((s) => s !== alkyne.s).flatMap((s) => rxxOxoCarbonyls(s).map((c) => ({ s, c })))[0];
  if (halide && halide.degree >= 2) {
    return [rxHint('Acetylide ions are strong bases: with secondary and tertiary alkyl halides they cause E2 elimination instead of substitution.')];
  }
  const partner = halide || carbonyl;
  if (!partner) {
    return [rxHint('The base deprotonates the terminal alkyne (pKa ≈ 25) to an acetylide; add a methyl or primary alkyl halide, or an aldehyde or ketone, for it to attack.')];
  }
  const { g, map } = rxxJoin(alkyne.s, partner.s);
  const t = alkyne.a.t;
  if (halide) {
    const hc = map.get(halide.c);
    rxsReplace(g, hc, map.get(halide.x), t, true);
    g.removeAtom(map.get(halide.x));
    g.addBond(t, hc);
    return [rxOutcome('acetylide-alkylation', 'Acetylide alkylation', 'Substitution (Sₙ2)', g,
      'The strong base removes the acidic terminal alkyne C–H. The acetylide ion is an excellent carbon nucleophile and displaces the halide by Sₙ2, forming a new C–C bond and an internal alkyne.',
      { score: 14, byproducts: ['the metal halide salt', base === lithium ? 'butane' : 'NH₃'], consumes: [rxUse(alkyne.s, 1), rxUse(halide.s, 1), rxUse(base, 1)] })];
  }
  const cc = map.get(carbonyl.c.c);
  g.addBond(t, cc);
  rxSetOrder(g, cc, map.get(carbonyl.c.o), 1);
  return [rxOutcome('acetylide-addition', 'Acetylide addition to C=O', 'Nucleophilic addition', g,
    'The acetylide ion adds to the carbonyl carbon like a Grignard reagent; aqueous work-up protonates the alkoxide to give a propargylic alcohol.',
    { score: 14, byproducts: [base === lithium ? 'butane' : 'NH₃', 'metal salts (after work-up)'], consumes: [rxUse(alkyne.s, 1), rxUse(carbonyl.s, 1), rxUse(base, 1)] })];
}

function rxxRuleWilliamson(ctx) {
  const strong = rxxBase(ctx, ['hydride']);
  const weak = rxxBase(ctx, ['weakBase', 'hydroxide']);
  if (!strong && !weak) {
    return [];
  }
  const halides = rxxHalides(ctx);
  if (!halides.length) {
    return [];
  }
  const donors = ctx.substrates.flatMap((s) => rxxPhenols(s).map((p) => ({ s, o: p.o, phenol: true }))
    .concat(strong ? s.info.alcohols.map((a) => ({ s, o: a.o, phenol: false })) : []));
  const pair = donors.map((d) => ({ d, h: halides.find((h) => h.s !== d.s) })).find((x) => x.h);
  if (!pair) {
    return [];
  }
  const { d, h } = pair;
  if (h.degree >= 3) {
    return [rxHint('Tertiary alkyl halides undergo E2 elimination with alkoxides; make the ether the other way round (tertiary alkoxide + primary halide).')];
  }
  const base = strong || weak;
  const { g, map } = rxxJoin(d.s, h.s);
  const hc = map.get(h.c);
  rxsReplace(g, hc, map.get(h.x), d.o, true);
  g.removeAtom(map.get(h.x));
  g.addBond(d.o, hc);
  const out = rxOutcome('williamson', 'Williamson ether synthesis', 'Substitution (Sₙ2)', g,
    (d.phenol ? 'The base deprotonates the phenol (pKa ≈ 10) to a phenoxide' : 'NaH deprotonates the alcohol irreversibly (H₂ bubbles off) to give an alkoxide') +
      ', which displaces the halide from the alkyl halide by Sₙ2 to form the ether.',
    { score: h.degree === 2 ? 11 : 13, byproducts: [strong ? 'H₂' : 'H₂O / HCO₃⁻', 'the metal halide salt'], consumes: [rxUse(d.s, 1), rxUse(h.s, 1), rxUse(base.entry, 1)] });
  if (h.degree === 2) {
    out.warnings.push('With a secondary halide, E2 elimination competes strongly with the substitution.');
  }
  if (!ctx.polarAprotic) {
    out.warnings.push('A polar aprotic solvent (DMF, DMSO, acetone or THF) speeds up the Sₙ2 step.');
  }
  return [out];
}

function rxxRuleEnolateAlkylation(ctx) {
  const halides = rxxHalides(ctx).filter((h) => h.degree <= 1);
  if (!halides.length) {
    return [];
  }
  const soft = rxxBase(ctx, ['alkoxide', 'hydride', 'weakBase', 'amideBase']);
  const lda = ctx.get('amideBase');
  const options = ctx.substrates.flatMap((s) => {
    const h = halides.find((x) => x.s !== s);
    if (!h) {
      return [];
    }
    const active = rxxActiveMethylene(s);
    if (active && soft) {
      return [{ s, h, alpha: active.c, active: true }];
    }
    const carbonyl = lda ? s.info.carbonyls.find((c) => ['ketone', 'ester'].includes(c.kind) && rxAlphaCarbons(s.graph, c.c).length) : null;
    return carbonyl ? [{ s, h, alpha: rxAlphaCarbons(s.graph, carbonyl.c)[0], active: false }] : [];
  });
  const pick = options[0];
  if (!pick) {
    return [];
  }
  const { g, map } = rxxJoin(pick.s, pick.h.s);
  const hc = map.get(pick.h.c);
  rxsReplace(g, hc, map.get(pick.h.x), pick.alpha, true);
  g.removeAtom(map.get(pick.h.x));
  g.addBond(pick.alpha, hc);
  const out = rxOutcome(pick.active ? 'malonic-alkylation' : 'enolate-alkylation', pick.active ? 'Active-methylene alkylation' : 'Enolate alkylation', 'Substitution (Sₙ2)', g,
    pick.active
      ? 'The CH between the two electron-withdrawing groups is acidic (pKa ≈ 11–13), so a mild base forms a stabilised enolate that alkylates by Sₙ2. This is the key step of the malonic ester and acetoacetic ester syntheses; hydrolysis and heating then remove a CO₂H group.'
      : 'LDA removes an α-H quickly and irreversibly. At −78 °C it takes the more accessible proton, giving the kinetic (less substituted) enolate, which attacks the alkyl halide by Sₙ2.',
    { score: 15, byproducts: ['the metal halide salt'], consumes: [rxUse(pick.s, 1), rxUse(pick.h.s, 1), rxUse(pick.active ? soft.entry : lda, 1)] });
  if (pick.active) {
    out.warnings.push('A second alkylation is possible; use one equivalent of base and halide for the mono-alkylated product.');
  } else if (ctx.temperature > -20) {
    out.warnings.push('Form the kinetic enolate at −78 °C; at higher temperatures it equilibrates towards the more substituted (thermodynamic) enolate.');
  }
  return [out];
}

function rxxRuleMichael(ctx) {
  const acceptors = ctx.substrates.flatMap((s) => rxxEnones(s).map((e) => ({ s, e })));
  if (!acceptors.length) {
    return [];
  }
  const base = rxxBase(ctx, ['alkoxide', 'hydroxide', 'weakBase', 'amineBase', 'hydride']);
  const donors = ctx.substrates.flatMap((s) => {
    const list = [];
    const active = rxxActiveMethylene(s);
    if (active && base) {
      list.push({ s, atom: active.c, kind: 'enolate' });
    }
    rxxThiols(s).forEach((id) => list.push({ s, atom: id, kind: 'thiol' }));
    s.info.amines.forEach((a) => list.push({ s, atom: a.n, kind: 'amine' }));
    return list;
  });
  const options = [];
  donors.forEach((d) => {
    acceptors.filter((a) => a.s !== d.s && (d.kind !== 'amine' || ['ester', 'nitrile'].includes(a.e.kind))).forEach((a) => options.push({ d, a }));
  });
  const pick = options[0];
  if (!pick) {
    return [];
  }
  const { d, a } = pick;
  const { g, map } = rxxJoin(d.s, a.s);
  const alpha = map.get(a.e.alpha);
  const beta = map.get(a.e.beta);
  rxSetOrder(g, alpha, beta, 1);
  g.addBond(d.atom, beta);
  const label = { enolate: 'Michael addition', thiol: 'Thia-Michael addition', amine: 'Aza-Michael addition' }[d.kind];
  const out = rxOutcome('michael', label, 'Conjugate (1,4-) addition', g,
    (d.kind === 'enolate' ? 'The base forms a stabilised enolate from the 1,3-dicarbonyl compound' : d.kind === 'thiol' ? 'The thiol (or its thiolate)' : 'The amine') +
      ', a soft nucleophile, adds to the β-carbon of the α,β-unsaturated acceptor rather than to its C=O. The enolate formed is protonated at the α-carbon, giving the 1,4-adduct.',
    { score: d.kind === 'enolate' ? 15 : d.kind === 'thiol' ? 14 : 12, consumes: [rxUse(d.s, 1), rxUse(a.s, 1), d.kind === 'enolate' && base ? rxUse(base.entry, 0.1) : null] });
  if (d.kind === 'enolate' && a.e.kind === 'ketone') {
    out.warnings.push('With a ketone acceptor, the Michael adduct can go on to an intramolecular aldol condensation (Robinson annulation) under stronger conditions.');
  }
  return [out];
}

function rxxRuleKnoevenagel(ctx) {
  const catalyst = ctx.has('amineBase') || ctx.organicCatalysts.some((c) => c.info.amines.length);
  if (!catalyst) {
    return [];
  }
  const donor = ctx.substrates.map((s) => ({ s, active: rxxActiveMethylene(s) })).find((x) => x.active && rxHydrogens(x.s.graph, x.active.c) === 2);
  const carbonyl = donor ? ctx.substrates.filter((s) => s !== donor.s).flatMap((s) => rxxOxoCarbonyls(s).map((c) => ({ s, c })))
    .sort((p, q) => (p.c.kind === 'aldehyde' ? 0 : 1) - (q.c.kind === 'aldehyde' ? 0 : 1))[0] : null;
  if (!carbonyl) {
    return [];
  }
  const { g, map } = rxxJoin(carbonyl.s, donor.s);
  const dc = map.get(donor.active.c);
  g.removeAtom(carbonyl.c.o);
  g.addBond(carbonyl.c.c, dc).order = 2;
  const acids = donor.active.groups.filter((id) => donor.s.info.carbonyls.some((c) => c.c === id && c.kind === 'acid'));
  const doebner = acids.length === 2 && ctx.has('amineBase');
  if (doebner) {
    rxRemoveBranch(g, map.get(acids[1]), dc);
    rxxSetE(g, carbonyl.c.c, dc);
  }
  const out = rxOutcome('knoevenagel', doebner ? 'Knoevenagel–Doebner condensation' : 'Knoevenagel condensation', 'Condensation', g,
    'The amine catalyst forms a small amount of the stabilised enolate of the active methylene compound (or an iminium ion from the aldehyde). It adds to the C=O, and water is lost to give the conjugated C=C.' +
      (doebner ? ' With malonic acid in pyridine, one CO₂H is lost on heating, giving the (E)-α,β-unsaturated acid.' : ''),
    { score: 14, byproducts: doebner ? ['H₂O', 'CO₂'] : ['H₂O'], consumes: [rxUse(carbonyl.s, 1), rxUse(donor.s, 1)] });
  if (carbonyl.c.kind === 'ketone') {
    out.warnings.push('Ketones react much more slowly than aldehydes in the Knoevenagel condensation.');
  }
  return [out];
}

function rxxRuleDecarboxylation(ctx) {
  return ctx.substrates.flatMap((s) => {
    const g0 = s.graph;
    const carbonylCarbons = new Set(s.info.carbonyls.map((c) => c.c));
    const hit = s.info.carbonyls.filter((c) => c.kind === 'acid').map((c) => ({ c, alpha: rxCarbonNeighbors(g0, c.c).map((n) => n.atom.id)
      .find((a) => rxIsSp3(g0, a) && rxCarbonNeighbors(g0, a, c.c).some((n) => carbonylCarbons.has(n.atom.id))) })).find((x) => x.alpha !== undefined);
    if (!hit) {
      return [];
    }
    if (ctx.temperature < 100) {
      return [rxHint('β-Keto acids and malonic acids lose CO₂ when heated (100–150 °C).')];
    }
    const g = rxCloneGraph(g0);
    rxRemoveBranch(g, hit.c.c, hit.alpha);
    rxsDrop(g, hit.alpha);
    return [rxOutcome('decarboxylation', 'Decarboxylation', 'Pericyclic elimination', g,
      'The acid O–H hydrogen-bonds to the β-carbonyl oxygen, and a six-membered cyclic transition state breaks the C–C bond, releasing CO₂ and an enol that tautomerises to the carbonyl compound.',
      { score: 12, byproducts: ['CO₂'], consumes: [rxUse(s, 1)] })];
  });
}

function rxxRuleCannizzaro(ctx) {
  const hydroxide = ctx.get('hydroxide');
  if (!hydroxide) {
    return [];
  }
  const enolisable = ctx.substrates.some((s) => s.info.carbonyls.some((c) => rxAlphaCarbons(s.graph, c.c).length));
  if (enolisable) {
    return [];
  }
  const target = ctx.substrates.map((s) => ({ s, c: s.info.carbonyls.find((c) => c.kind === 'aldehyde') })).find((x) => x.c);
  if (!target) {
    return [];
  }
  const { s, c } = target;
  const { g, map } = rxxJoin(s, s);
  rxSetOrder(g, c.c, c.o, 1);
  rxAttach(g, 'O', map.get(c.c), 1, -1);
  rxxAddCation(ctx, g);
  const out = rxOutcome('cannizzaro', 'Cannizzaro reaction', 'Disproportionation (redox)', g,
    'With no α-H, the aldehyde cannot form an enolate. Hydroxide adds to one molecule, and the tetrahedral anion transfers a hydride to a second aldehyde: one molecule is oxidised to the carboxylate and the other reduced to the primary alcohol.',
    { score: 12, consumes: [rxUse(s, 2), rxUse(hydroxide, 1)] });
  out.warnings.push('The Cannizzaro reaction needs concentrated NaOH or KOH; acidify the work-up to obtain the free carboxylic acid.');
  return [out];
}

function rxxRuleOsmium(ctx) {
  if (!ctx.has('osmium')) {
    return [];
  }
  const nmo = ctx.has('nmo');
  return ctx.substrates.flatMap((s) => {
    if (!s.info.alkenes.length) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    s.info.alkenes.forEach((e) => {
      rxSetOrder(g, e.a, e.b, 1);
      const oa = rxAttach(g, 'O', e.a);
      const ob = rxAttach(g, 'O', e.b);
      rxsFaceAdd(g, [[e.a, oa.id, 1], [e.b, ob.id, 1]]);
    });
    const out = rxOutcome('dihydroxylation', nmo ? 'Upjohn dihydroxylation' : 'OsO₄ dihydroxylation', 'Oxidation', g,
      'OsO₄ adds across the C=C in a concerted [3+2] cycloaddition to give a cyclic osmate ester, so both O atoms are delivered to the same face. Hydrolysis releases the syn-1,2-diol' +
        (nmo ? ', and NMO re-oxidises the osmium so only a catalytic amount is needed.' : '.'),
      { score: 13, byproducts: nmo ? ['N-methylmorpholine'] : ['osmium(VI) salts'], consumes: [rxUse(s, 1), nmo ? rxUse(ctx.get('nmo'), s.info.alkenes.length) : rxUse(ctx.get('osmium'), s.info.alkenes.length)] });
    if (!nmo) {
      out.warnings.push('OsO₄ is toxic, volatile and expensive; add NMO as co-oxidant so only 1–5 mol% of osmium is needed.');
    }
    return [out];
  });
}

function rxxRuleOxymercuration(ctx) {
  if (!ctx.has('mercuricAcetate')) {
    return [];
  }
  const alcohol = ctx.solventNucleophiles.find((n) => n.alcohol);
  return ctx.substrates.flatMap((s) => {
    if (!s.info.alkenes.length) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    const e = rxMostSubstitutedAlkene(g, s.info.alkenes);
    const m = rxMarkovnikov(g, e.a, e.b);
    rxSetOrder(g, e.a, e.b, 1);
    if (alcohol) {
      const map = rxMerge(g, alcohol.graph, alcohol.graph.connectedComponents().find((comp) => comp.atomIds.includes(alcohol.atom)).atomIds);
      g.addBond(map.get(alcohol.atom), m.more);
    } else {
      rxAttach(g, 'O', m.more);
    }
    const out = rxOutcome(alcohol ? 'alkoxymercuration' : 'oxymercuration', alcohol ? 'Alkoxymercuration–demercuration' : 'Oxymercuration–demercuration', 'Addition (Markovnikov)', g,
      'Hg(OAc)₂ forms a bridged mercurinium ion, so no free carbocation forms and there are no rearrangements. ' + (alcohol ? 'The alcohol solvent' : 'Water') +
        ' opens it at the more substituted carbon (Markovnikov), and NaBH₄ then replaces the C–Hg bond by C–H.',
      { score: 13, byproducts: ['Hg(0)', 'acetic acid'], consumes: [rxUse(s, 1), rxUse(ctx.get('mercuricAcetate'), 1)] });
    if (!ctx.has('borohydride')) {
      out.warnings.push('The organomercury intermediate needs a second step: NaBH₄ in aqueous NaOH (demercuration).');
    }
    out.warnings.push('Mercury compounds are highly toxic; hydroboration–oxidation (anti-Markovnikov) or acid hydration are often preferred.');
    return [out];
  });
}

function rxxRuleSimmonsSmith(ctx) {
  if (!ctx.has('diiodomethane')) {
    return [];
  }
  const zinc = ctx.has('zincCopper') || ctx.has('diethylzinc');
  return ctx.substrates.flatMap((s) => {
    if (!s.info.alkenes.length) {
      return [];
    }
    if (!zinc) {
      return [rxHint('CH₂I₂ needs Zn(Cu) or Et₂Zn to form the zinc carbenoid (ICH₂ZnI) for the Simmons–Smith cyclopropanation.')];
    }
    const g = rxCloneGraph(s.graph);
    s.info.alkenes.forEach((e) => {
      rxSetOrder(g, e.a, e.b, 1);
      const ch2 = rxAttach(g, 'C', e.a);
      g.addBond(ch2.id, e.b);
      rxsFaceAdd(g, [[e.a, ch2.id, 1], [e.b, ch2.id, 1]]);
    });
    return [rxOutcome('simmons-smith', 'Simmons–Smith cyclopropanation', 'Cycloaddition (carbenoid)', g,
      'The zinc carbenoid ICH₂ZnI delivers a CH₂ group to both alkene carbons at once, from one face. The reaction is stereospecific: a cis alkene gives a cis-disubstituted cyclopropane.' +
        (ctx.has('diethylzinc') ? ' Et₂Zn (Furukawa modification) is a more reactive, homogeneous source of the carbenoid.' : ''),
      { score: 13, byproducts: ['ZnI₂'], consumes: [rxUse(s, 1), rxUse(ctx.get('diiodomethane'), s.info.alkenes.length)] })];
  });
}

function rxxRuleOxidationExtra(ctx) {
  const swern = ctx.has('oxalylChloride') && (ctx.has('dmso') || ctx.conditions.solvents.includes('dmso'));
  const kind = ctx.has('dmp') ? 'dmp' : swern ? 'swern' : ctx.has('jones') ? 'jones' : null;
  if (!kind) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const oxidizable = s.info.alcohols.filter((a) => a.degree < 3);
    if (!oxidizable.length) {
      return s.info.alcohols.length ? [rxHint('Tertiary alcohols have no H on the carbinol carbon, so they are not oxidised.')] : [];
    }
    const g = rxCloneGraph(s.graph);
    oxidizable.forEach((a) => {
      rxsDrop(g, a.c);
      rxOxidizeAlcohol(g, a, kind === 'jones');
    });
    const text = {
      dmp: ['oxidation-dmp', 'Dess–Martin oxidation', 'The hypervalent iodine reagent exchanges an acetate for the alcohol, and an intramolecular deprotonation of the C–H releases the carbonyl compound. It is mild, neutral and fast: primary alcohols stop at the aldehyde.', ['iodinane by-product', 'acetic acid']],
      swern: ['oxidation-swern', 'Swern oxidation', 'DMSO is activated by oxalyl chloride at −78 °C; the alcohol attacks sulfur, and Et₃N forms a sulfur ylide that collapses to the carbonyl compound and dimethyl sulfide. Primary alcohols stop at the aldehyde.', ['dimethyl sulfide (stench)', 'CO', 'CO₂', 'Et₃N·HCl']],
      jones: ['oxidation-jones', 'Jones oxidation', 'Chromic acid (CrO₃ in aqueous H₂SO₄/acetone) forms a chromate ester that eliminates to the carbonyl compound. In water the aldehyde hydrate is oxidised further, so primary alcohols go on to carboxylic acids and secondary alcohols give ketones.', ['Cr(III) salts']],
    }[kind];
    const out = rxOutcome(text[0], text[1], 'Oxidation', g, text[2], { score: 13, byproducts: text[3], consumes: [rxUse(s, 1)] });
    if (kind === 'swern' && !ctx.has('amineBase')) {
      out.warnings.push('The Swern oxidation needs Et₃N (about 5 equiv) for the final elimination step.');
    }
    if (kind === 'swern' && ctx.temperature > -50) {
      out.warnings.push('Keep the Swern oxidation at −78 °C until the base is added; the activated DMSO decomposes above about −60 °C.');
    }
    if (kind === 'jones' && !ctx.has('strongAcid')) {
      out.warnings.push('Jones reagent is CrO₃ in aqueous H₂SO₄; add the acid.');
    }
    if (kind === 'jones') {
      out.warnings.push('Cr(VI) compounds are toxic and carcinogenic; DMP or Swern avoids chromium.');
    }
    return [out];
  });
}

function rxxRuleDibal(ctx) {
  if (!ctx.has('dibal')) {
    return [];
  }
  const cold = ctx.temperature <= -40;
  return ctx.substrates.flatMap((s) => {
    const esters = s.info.carbonyls.filter((c) => c.kind === 'ester');
    const oxo = rxxOxoCarbonyls(s);
    if (!esters.length && !s.info.nitriles.length && !oxo.length) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    esters.forEach((c) => {
      rxSetOrder(g, c.c, c.hetero, 0);
      if (!cold) {
        rxSetOrder(g, c.c, c.o, 1);
      }
    });
    s.info.nitriles.forEach((n) => {
      rxSetOrder(g, n.c, n.n, 2);
      g.getAtom(n.n).element = 'O';
    });
    oxo.forEach((c) => rxSetOrder(g, c.c, c.o, 1));
    const lactone = esters.some((c) => rxRings(s.graph, 8).some((r) => r.includes(c.c) && r.includes(c.hetero)));
    const out = rxOutcome('dibal', 'DIBAL-H reduction', 'Reduction', g,
      'DIBAL-H is a Lewis-acidic hydride: aluminium binds the carbonyl oxygen and delivers one hydride. ' +
        (cold ? 'At −78 °C the tetrahedral intermediate from an ester is stable until work-up, so the reduction stops at the aldehyde; nitriles give an imine that hydrolyses to the aldehyde.'
          : 'Above about −40 °C the intermediate collapses and the aldehyde formed is reduced again, so esters go on to primary alcohols.'),
      { score: cold ? 14 : 12, byproducts: ['aluminium salts (Rochelle’s salt work-up)'], consumes: [rxUse(s, 1), rxUse(ctx.get('dibal'), esters.length * (cold ? 1 : 2) + s.info.nitriles.length + oxo.length)] });
    if (!cold && esters.length) {
      out.warnings.push('Run at −78 °C with one equivalent of DIBAL-H to stop at the aldehyde.');
    }
    if (lactone && cold) {
      out.warnings.push('A lactone gives the lactol (cyclic hemiacetal), which is in equilibrium with the open hydroxy-aldehyde drawn here.');
    }
    return [out];
  });
}

function rxxRuleGrignardExtra(ctx) {
  const reagent = ctx.get('grignard');
  if (!reagent || ctx.protic || ctx.substrates.some((s) => s.info.alcohols.length || s.info.carbonyls.some((c) => ['acid', 'aldehyde', 'ketone', 'ester'].includes(c.kind)))) {
    return [];
  }
  const co2 = ctx.substrates.find((s) => s.graph.atoms.length === 3 && s.graph.atoms.filter((a) => a.element === 'O').length === 2 && s.graph.atoms.some((a) => a.element === 'C'));
  const nitrile = ctx.substrates.map((s) => ({ s, n: s.info.nitriles[0] })).find((x) => x.n);
  if (!co2 && !nitrile) {
    return [];
  }
  const rGraph = rxCloneGraph(reagent.graph);
  rxNeighbors(rGraph, reagent.metal).forEach((n) => {
    if (n.atom.id !== reagent.carbon) {
      rGraph.removeAtom(n.atom.id);
    }
  });
  rGraph.removeAtom(reagent.metal);
  const rIds = rGraph.connectedComponents().find((comp) => comp.atomIds.includes(reagent.carbon)).atomIds;
  if (co2) {
    const g = new Graph();
    const map = rxMerge(g, rGraph, rIds);
    const c = rxAttach(g, 'C', map.get(reagent.carbon));
    rxAttach(g, 'O', c.id, 2);
    rxAttach(g, 'O', c.id);
    return [rxOutcome('grignard-carboxylation', 'Grignard carboxylation', 'Nucleophilic addition', g,
      'The Grignard carbon attacks CO₂ (usually as dry ice) to form a magnesium carboxylate; acidic work-up gives the carboxylic acid with one more carbon than the halide it came from.',
      { score: 14, byproducts: ['Mg salts (after acidic work-up)'], consumes: [rxUse(reagent, 1), rxUse(co2, 1)] })];
  }
  const g = rxCloneGraph(nitrile.s.graph);
  const map = rxMerge(g, rGraph, rIds);
  g.addBond(map.get(reagent.carbon), nitrile.n.c);
  rxSetOrder(g, nitrile.n.c, nitrile.n.n, 2);
  g.getAtom(nitrile.n.n).element = 'O';
  return [rxOutcome('grignard-nitrile', 'Grignard addition to a nitrile', 'Nucleophilic addition', g,
    'The Grignard reagent adds once to the C≡N carbon, giving an imine anion that cannot react further. Aqueous acid in the work-up hydrolyses the imine to a ketone.',
    { score: 13, byproducts: ['NH₄⁺ and Mg salts (after work-up)'], consumes: [rxUse(nitrile.s, 1), rxUse(reagent, 1)] })];
}

function rxxBocCarbonyl(s) {
  const g = s.graph;
  return s.info.carbonyls.map((c) => {
    const n = rxNeighbors(g, c.c).find((x) => x.atom.element === 'N' && x.bond.order === 1);
    const o = rxNeighbors(g, c.c).find((x) => x.atom.element === 'O' && x.bond.order === 1);
    const t = o ? rxCarbonNeighbors(g, o.atom.id).find((x) => x.atom.id !== c.c && rxCarbonNeighbors(g, x.atom.id).length === 3) : null;
    return n && t ? { c: c.c, n: n.atom.id } : null;
  }).find(Boolean) || null;
}

function rxxSilylEther(s) {
  const g = s.graph;
  const si = g.atoms.find((a) => a.element === 'Si' && rxCarbonNeighbors(g, a.id).length === 3 && rxNeighbors(g, a.id).some((n) => n.atom.element === 'O'));
  return si ? { si: si.id, o: rxNeighbors(g, si.id).find((n) => n.atom.element === 'O').atom.id } : null;
}

function rxxBenzylic(s) {
  const g = s.graph;
  const ring = s.info.aromatic.atoms;
  for (const a of g.atoms) {
    if (a.element !== 'C' || ring.has(a.id) || !rxIsSp3(g, a.id) || rxHydrogens(g, a.id) !== 2) {
      continue;
    }
    const aryl = rxNeighbors(g, a.id).find((n) => ring.has(n.atom.id));
    const o = rxNeighbors(g, a.id).find((n) => n.atom.element === 'O');
    if (aryl && o && o.bond.order === 1 && rxNeighbors(g, o.atom.id).length === 2) {
      return { ch2: a.id, o: o.atom.id };
    }
  }
  return null;
}

function rxxRuleProtection(ctx) {
  const out = [];
  const boc = ctx.get('boc2o');
  if (boc) {
    const hit = ctx.substrates.map((s) => ({ s, a: s.info.amines[0] })).find((x) => x.a);
    if (hit) {
      const g = rxCloneGraph(hit.s.graph);
      const c = rxAttach(g, 'C', hit.a.n);
      rxAttach(g, 'O', c.id, 2);
      const o = rxAttach(g, 'O', c.id);
      const t = rxAttach(g, 'C', o.id);
      [0, 1, 2].forEach(() => rxAttach(g, 'C', t.id));
      out.push(rxOutcome('boc-protection', 'Boc protection', 'Protecting group (N)', g,
        'The amine attacks one carbonyl of Boc₂O; the leaving tert-butyl carbonate falls apart to CO₂ and tert-butanol. The Boc carbamate is stable to base, nucleophiles and hydrogenation, and comes off with acid (TFA or HCl).',
        { score: 14, byproducts: ['CO₂', 'tert-butanol'], consumes: [rxUse(hit.s, 1), rxUse(boc, 1.1)] }));
    }
  }
  if (ctx.has('strongAcid')) {
    ctx.substrates.forEach((s) => {
      const hit = rxxBocCarbonyl(s);
      if (hit) {
        const g = rxCloneGraph(s.graph);
        rxRemoveBranch(g, hit.c, hit.n);
        out.push(rxOutcome('boc-deprotection', 'Boc deprotection', 'Protecting group removal', g,
          'Acid protonates the carbamate carbonyl; the tert-butyl group leaves as a stable cation (lost as isobutylene), and the carbamic acid decarboxylates to the free amine, isolated as its ammonium salt.',
          { score: 15, byproducts: ['CO₂', 'isobutylene'], consumes: [rxUse(s, 1)] }));
      }
    });
  }
  const silyl = ctx.get('silylChloride');
  if (silyl) {
    const hit = ctx.substrates.map((s) => ({ s, a: s.info.alcohols.slice().sort((p, q) => p.degree - q.degree)[0] || rxxPhenols(s)[0] })).find((x) => x.a);
    if (hit) {
      const g = rxCloneGraph(hit.s.graph);
      const map = rxMerge(g, silyl.graph, silyl.ids);
      const si = silyl.ids.find((id) => silyl.graph.getAtom(id).element === 'Si');
      const cl = silyl.ids.find((id) => silyl.graph.getAtom(id).element === 'Cl');
      g.removeAtom(map.get(cl));
      g.addBond(hit.a.o, map.get(si));
      const name = { C6H15ClSi: 'TBS', C3H9ClSi: 'TMS', C9H21ClSi: 'TIPS', C16H19ClSi: 'TBDPS' }[silyl.formula] || 'silyl';
      const o = rxOutcome('silyl-protection', name + ' protection', 'Protecting group (O)', g,
        'The alcohol attacks silicon and chloride leaves; imidazole or Et₃N acts as base and nucleophilic catalyst. The ' + name + ' ether survives bases, organometallics, oxidants and most reducing agents, and is removed with fluoride (TBAF) or acid.',
        { score: 14, byproducts: ['the amine hydrochloride'], consumes: [rxUse(hit.s, 1), rxUse(silyl, 1.1)] });
      if (!ctx.has('amineBase') && !ctx.has('dmap')) {
        o.warnings.push('Add a base such as imidazole (in DMF) or Et₃N to take up the HCl.');
      }
      if (hit.s.info.alcohols.length > 1) {
        o.warnings.push('Bulky silyl chlorides pick the least hindered OH first; the primary alcohol is protected here.');
      }
      out.push(o);
    }
  }
  if (ctx.has('fluoride') || (ctx.has('strongAcid') && rxxWater(ctx))) {
    ctx.substrates.forEach((s) => {
      const hit = rxxSilylEther(s);
      if (hit) {
        const g = rxCloneGraph(s.graph);
        rxRemoveBranch(g, hit.si, hit.o);
        out.push(rxOutcome('silyl-deprotection', 'Silyl ether cleavage', 'Protecting group removal', g,
          ctx.has('fluoride') ? 'Fluoride attacks silicon, driven by the very strong Si–F bond (≈ 580 kJ/mol), and releases the alkoxide, which is protonated on work-up.'
            : 'Aqueous acid hydrolyses the silyl ether back to the alcohol.',
          { score: 15, byproducts: ['the silyl fluoride / silanol'], consumes: [rxUse(s, 1)] }));
      }
    });
  }
  if (ctx.has('H2') && ctx.has('hydrogenationCatalyst')) {
    ctx.substrates.forEach((s) => {
      const hit = rxxBenzylic(s);
      if (!hit) {
        return;
      }
      const g = rxCloneGraph(s.graph);
      rxRemoveBranch(g, hit.ch2, hit.o);
      const carbonyl = rxNeighbors(g, hit.o).map((n) => n.atom.id).find((id) => s.info.carbonyls.some((c) => c.c === id));
      const nitrogen = carbonyl !== undefined ? rxNeighbors(g, carbonyl).find((n) => n.atom.element === 'N' && n.bond.order === 1) : null;
      if (nitrogen) {
        rxRemoveBranch(g, carbonyl, nitrogen.atom.id);
      }
      out.push(rxOutcome('hydrogenolysis', nitrogen ? 'Cbz removal (hydrogenolysis)' : 'Benzyl hydrogenolysis', 'Protecting group removal', g,
        'On the Pd surface H₂ cleaves the weak benzylic C–O bond, releasing toluene and the free ' + (nitrogen ? 'carbamic acid, which loses CO₂ to give the amine.' : carbonyl !== undefined ? 'carboxylic acid.' : 'alcohol.'),
        { score: 14, byproducts: ['toluene'].concat(nitrogen ? ['CO₂'] : []), consumes: [rxUse(s, 1), rxUse(ctx.get('H2'), 1)] }));
    });
  }
  return out;
}

function rxxRuleMetathesis(ctx) {
  if (!ctx.has('metathesis')) {
    return [];
  }
  const vinyl = (s) => rxxTerminalAlkenes(s).filter((e) => rxHydrogens(s.graph, e.i) === 1);
  for (const s of ctx.substrates) {
    const list = vinyl(s);
    const pairs = [];
    list.forEach((p, i) => list.slice(i + 1).forEach((q) => {
      const ring = rxPathLength(s.graph, p.i, q.i) + 1;
      if (ring >= 5 && ring <= 8) {
        pairs.push({ p, q, ring });
      }
    }));
    if (pairs.length) {
      const { p, q, ring } = pairs.sort((x, y) => x.ring - y.ring)[0];
      const g = rxCloneGraph(s.graph);
      g.removeAtom(p.t);
      g.removeAtom(q.t);
      g.addBond(p.i, q.i).order = 2;
      return [rxOutcome('rcm', 'Ring-closing metathesis', 'Olefin metathesis', g,
        'The ruthenium carbene (Grubbs catalyst) swaps alkene partners through metallacyclobutane intermediates. Joining the two terminal alkenes closes a ' + ring + '-membered ring, and the release of ethylene gas drives the reaction.',
        { score: 14, byproducts: ['ethylene'], consumes: [rxUse(s, 1)], warnings: ['Run dilute (≈ 0.01–0.05 M) so ring closure beats intermolecular oligomerisation.'] })];
    }
  }
  const partners = ctx.substrates.map((s) => ({ s, e: vinyl(s)[0] })).filter((x) => x.e);
  if (partners.length >= 2) {
    const [a, b] = partners;
    const { g, map } = rxxJoin(a.s, b.s);
    g.removeAtom(a.e.t);
    g.removeAtom(map.get(b.e.t));
    g.addBond(a.e.i, map.get(b.e.i)).order = 2;
    rxxSetE(g, a.e.i, map.get(b.e.i));
    return [rxOutcome('cross-metathesis', 'Cross metathesis', 'Olefin metathesis', g,
      'The Grubbs catalyst exchanges the alkylidene ends of the two alkenes, joining them with an (E)-C=C and releasing ethylene.',
      { score: 11, byproducts: ['ethylene', 'homodimers of each alkene'], consumes: [rxUse(a.s, 1), rxUse(b.s, 1)],
        warnings: ['Cross metathesis of two similar terminal alkenes gives a statistical mixture with both homodimers; use an excess of one partner or an electron-poor partner (e.g. an acrylate).'] })];
  }
  return partners.length ? [rxHint('Metathesis needs two terminal alkenes: either in one molecule (ring-closing) or a second alkene partner (cross metathesis).')] : [];
}

function rxxAzide(s) {
  const g = s.graph;
  const mid = g.atoms.find((a) => a.element === 'N' && a.charge === 1 && rxNeighbors(g, a.id).filter((n) => n.atom.element === 'N').length === 2);
  if (!mid) {
    return null;
  }
  const ends = rxNeighbors(g, mid.id).map((n) => n.atom);
  const inner = ends.find((a) => rxCarbonNeighbors(g, a.id).length === 1);
  const outer = ends.find((a) => a !== inner);
  return inner && outer ? { n: inner.id, mid: mid.id, end: outer.id } : null;
}

function rxxRulePhosphorus(ctx) {
  const pph3 = ctx.get('triphenylphosphine');
  const out = [];
  ctx.substrates.forEach((s) => {
    const azide = rxxAzide(s);
    const reagent = pph3 ? 'staudinger' : ctx.has('H2') && ctx.has('hydrogenationCatalyst') ? 'hydrogen' : ctx.has('alanate') ? 'alanate' : null;
    if (!azide || !reagent) {
      return;
    }
    const g = rxCloneGraph(s.graph);
    g.removeAtom(azide.end);
    g.removeAtom(azide.mid);
    const o = rxOutcome(reagent === 'staudinger' ? 'staudinger' : 'azide-reduction', reagent === 'staudinger' ? 'Staudinger reduction' : 'Azide reduction', 'Reduction', g,
      reagent === 'staudinger'
        ? 'PPh₃ attacks the terminal azide nitrogen; N₂ is lost to give an iminophosphorane (R–N=PPh₃), which water hydrolyses to the primary amine and Ph₃P=O.'
        : 'The azide is reduced to the primary amine with loss of N₂. Together with Sₙ2 by azide ion, this is a clean way to make primary amines without over-alkylation.',
      { score: 14, byproducts: reagent === 'staudinger' ? ['N₂', 'Ph₃P=O'] : ['N₂'], consumes: [rxUse(s, 1), reagent === 'staudinger' ? rxUse(pph3, 1) : null] });
    if (reagent === 'staudinger' && !rxxWater(ctx)) {
      o.warnings.push('Add water (e.g. THF/H₂O) to hydrolyse the iminophosphorane to the amine.');
    }
    out.push(o);
  });
  if (pph3 && ctx.has('tetrahalomethane')) {
    const x = ctx.get('tetrahalomethane').formula === 'CBr4' ? 'Br' : 'Cl';
    ctx.substrates.forEach((s) => {
      const alcohols = s.info.alcohols.filter((a) => a.degree < 3);
      if (!alcohols.length) {
        return;
      }
      const g = rxCloneGraph(s.graph);
      alcohols.forEach((a) => {
        g.getAtom(a.o).element = x;
        rxsReplace(g, a.c, a.o, a.o, true);
      });
      out.push(rxOutcome('appel', 'Appel reaction', 'Substitution (Sₙ2)', g,
        'PPh₃ and C' + x + '₄ form a halophosphonium salt that turns the OH into an alkoxyphosphonium leaving group; ' + x + '⁻ displaces it by Sₙ2 with inversion, driven by forming Ph₃P=O. The conditions are neutral, so there are no rearrangements.',
        { score: 13, byproducts: ['Ph₃P=O', 'CH' + x + '₃'], consumes: [rxUse(s, 1), rxUse(pph3, alcohols.length)] }));
    });
  }
  return out;
}

function rxxRuleEpoxideClosure(ctx) {
  const base = rxxBase(ctx, ['hydroxide', 'hydride', 'alkoxide', 'weakBase']);
  if (!base) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const pair = s.info.alcohols.map((a) => ({ a, h: s.info.halides.find((h) => s.graph.getBond(a.c, h.c)) })).find((x) => x.h);
    if (!pair) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    rxsReplace(g, pair.h.c, pair.h.x, pair.a.o, true);
    g.removeAtom(pair.h.x);
    g.addBond(pair.a.o, pair.h.c);
    return [rxOutcome('epoxide-closure', 'Halohydrin → epoxide', 'Intramolecular Sₙ2', g,
      'The base deprotonates the OH, and the alkoxide displaces the neighbouring halide from the back side (intramolecular Williamson). The O and the halogen must be able to sit anti-periplanar, as they are in a trans-halohydrin.',
      { score: 14, byproducts: ['the halide salt', 'H₂O'], consumes: [rxUse(s, 1), rxUse(base.entry, 1)] })];
  });
}

function rxxPhosphonate(s) {
  const g = s.graph;
  const p = g.atoms.find((a) => a.element === 'P' && rxNeighbors(g, a.id).some((n) => n.atom.element === 'O' && n.bond.order === 2) &&
    rxNeighbors(g, a.id).filter((n) => n.atom.element === 'O' && n.bond.order === 1).length === 2 && rxCarbonNeighbors(g, a.id).length === 1);
  if (!p) {
    return null;
  }
  const alpha = rxCarbonNeighbors(g, p.id)[0].atom.id;
  return rxIsSp3(g, alpha) && rxHydrogens(g, alpha) > 0 ? { p: p.id, alpha } : null;
}

function rxxRuleHwe(ctx) {
  const phos = ctx.substrates.map((s) => ({ s, h: rxxPhosphonate(s) })).find((x) => x.h);
  if (!phos) {
    return [];
  }
  const carbonyl = ctx.substrates.filter((s) => s !== phos.s).flatMap((s) => rxxOxoCarbonyls(s).map((c) => ({ s, c })))
    .sort((p, q) => (p.c.kind === 'aldehyde' ? 0 : 1) - (q.c.kind === 'aldehyde' ? 0 : 1))[0];
  if (!carbonyl) {
    return [rxHint('A phosphonate carbanion needs an aldehyde or ketone partner for the Horner–Wadsworth–Emmons reaction.')];
  }
  const base = rxxBase(ctx, ['hydride', 'alkoxide', 'amideBase', 'amineBase', 'weakBase']);
  if (!base) {
    return [rxHint('Deprotonate the phosphonate first: NaH, KOtBu or (with LiCl) DBU.')];
  }
  const { g, map } = rxxJoin(carbonyl.s, phos.s);
  const alpha = map.get(phos.h.alpha);
  rxRemoveBranch(g, map.get(phos.h.p), alpha);
  g.removeAtom(carbonyl.c.o);
  g.addBond(carbonyl.c.c, alpha).order = 2;
  rxxSetE(g, carbonyl.c.c, alpha);
  return [rxOutcome('hwe', 'Horner–Wadsworth–Emmons olefination', 'Olefination', g,
    'The base forms a phosphonate-stabilised carbanion that adds to the C=O; the oxaphosphetane collapses to the alkene and a water-soluble dialkyl phosphate. The additions are reversible, so the more stable (E)-alkene is formed selectively.',
    { score: 14, byproducts: ['dialkyl phosphate salt (water-soluble)'], consumes: [rxUse(carbonyl.s, 1), rxUse(phos.s, 1), rxUse(base.entry, 1)] })];
}

RX_RULES.push(
  { id: 'suzuki', name: 'Suzuki–Miyaura coupling', run: rxxRuleSuzuki },
  { id: 'heck', name: 'Heck reaction', run: rxxRuleHeck },
  { id: 'sonogashira', name: 'Sonogashira coupling', run: rxxRuleSonogashira },
  { id: 'buchwald-hartwig', name: 'Buchwald–Hartwig amination', run: rxxRuleBuchwald },
  { id: 'carbodiimide', name: 'DCC/EDC amide and ester coupling', run: rxxRuleCarbodiimide },
  { id: 'acid-chloride', name: 'Acid → acyl chloride', run: rxxRuleAcidChloride },
  { id: 'baeyer-villiger', name: 'Baeyer–Villiger oxidation', run: rxxRuleBaeyerVilliger },
  { id: 'nitrile-hydrolysis', name: 'Nitrile hydrolysis', run: rxxRuleNitrileHydrolysis },
  { id: 'amide-hydrolysis', name: 'Amide hydrolysis', run: rxxRuleAmideHydrolysis },
  { id: 'hydrazine', name: 'Hydrazone, oxime and Wolff–Kishner', run: rxxRuleHydrazine },
  { id: 'clemmensen', name: 'Clemmensen reduction', run: rxxRuleClemmensen },
  { id: 'acetylide', name: 'Acetylide alkylation and addition', run: rxxRuleAcetylide },
  { id: 'williamson', name: 'Williamson ether synthesis (NaH, phenols)', run: rxxRuleWilliamson },
  { id: 'enolate-alkylation', name: 'Enolate and malonic ester alkylation', run: rxxRuleEnolateAlkylation },
  { id: 'michael', name: 'Michael (conjugate) addition', run: rxxRuleMichael },
  { id: 'knoevenagel', name: 'Knoevenagel condensation', run: rxxRuleKnoevenagel },
  { id: 'decarboxylation', name: 'β-Keto acid decarboxylation', run: rxxRuleDecarboxylation },
  { id: 'cannizzaro', name: 'Cannizzaro reaction', run: rxxRuleCannizzaro },
  { id: 'osmium', name: 'OsO₄ / Upjohn dihydroxylation', run: rxxRuleOsmium },
  { id: 'oxymercuration', name: 'Oxymercuration–demercuration', run: rxxRuleOxymercuration },
  { id: 'simmons-smith', name: 'Simmons–Smith cyclopropanation', run: rxxRuleSimmonsSmith },
  { id: 'oxidation-extra', name: 'DMP, Swern and Jones oxidations', run: rxxRuleOxidationExtra },
  { id: 'dibal', name: 'DIBAL-H reduction', run: rxxRuleDibal },
  { id: 'grignard-extra', name: 'Grignard + CO₂ / nitrile', run: rxxRuleGrignardExtra },
  { id: 'protection', name: 'Boc, silyl and benzyl protecting groups', run: rxxRuleProtection },
  { id: 'metathesis', name: 'Ring-closing and cross metathesis', run: rxxRuleMetathesis },
  { id: 'phosphorus', name: 'Staudinger, azide reduction and Appel', run: rxxRulePhosphorus },
  { id: 'epoxide-closure', name: 'Halohydrin → epoxide', run: rxxRuleEpoxideClosure },
  { id: 'hwe', name: 'Horner–Wadsworth–Emmons', run: rxxRuleHwe },
);
