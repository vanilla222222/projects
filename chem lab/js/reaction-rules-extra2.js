Object.assign(RX_FORMULA_TAGS, {
  Cl2Pd: 'palladium2', ClCu: 'copperChloride', BrCu: 'copperBromide', CCuN: 'copperCyanide', 'I−': 'iodide', 'NO2−': 'nitrite',
  'BF4−': 'fluoroborate', C6H10N2O4: 'azodicarboxylate', C8H14N2O4: 'azodicarboxylate', C7H7ClO2S: 'sulfonylChloride',
  CH3ClO2S: 'sulfonylChloride', Cl3OP: 'pocl3', 'C3H9S+': 'sulfonium', CeCl3: 'cerium', MnO2: 'manganeseDioxide',
  Zn: 'zinc', Fe: 'iron', 'ClO−': 'hypochlorite',
});

Object.assign(RX_FORMULA_GUARDS, {
  C6H10N2O4: (g) => g.bonds.some((b) => b.order === 2 && g.getAtom(b.atomA).element === 'N' && g.getAtom(b.atomB).element === 'N'),
  C8H14N2O4: (g) => g.bonds.some((b) => b.order === 2 && g.getAtom(b.atomA).element === 'N' && g.getAtom(b.atomB).element === 'N'),
  C7H7ClO2S: (g, ids) => ids.some((id) => g.getAtom(id).element === 'S' && rxNeighbors(g, id).some((n) => n.atom.element === 'Cl')),
  CH3ClO2S: (g, ids) => ids.some((id) => g.getAtom(id).element === 'S' && rxNeighbors(g, id).some((n) => n.atom.element === 'Cl')),
});

Object.assign(RX_ADDITIVE_TAGS, {
  naio4: ['periodate'], naclo2: ['chlorite'], tempo: ['tempo'], mg: ['magnesium'], sncl2: ['tinChloride'], ag2o: ['silverOxide'],
  tollens: ['tollens'], hbf4: ['fluoroborate', 'strongAcid'], me3soi: ['sulfoxonium'], p2o5: ['dehydrant'],
});

RX_SPECIES_DETECTORS.push((g, ids) => {
  const cu = ids.map((id) => g.getAtom(id)).find((a) => a.element === 'Cu' && a.charge === -1);
  const carbons = cu ? rxCarbonNeighbors(g, cu.id) : [];
  return carbons.length === 2 ? { tag: 'cuprate', metal: cu.id, carbons: carbons.map((n) => n.atom.id) } : null;
});

RX_AIR_SENSITIVE.push('gilman-conjugate', 'gilman-ketone', 'corey-house', 'grignard-formation', 'reformatsky', 'corey-chaykovsky');

function rxyCleanAlkenes(g) {
  g.alkeneSpecs = (g.alkeneSpecs || []).filter((spec) => {
    const b = g.getBond(spec.a, spec.b);
    return b && b.order === 2;
  });
}

function rxyOximes(s) {
  const g = s.graph;
  return g.atoms.filter((a) => a.element === 'N' && !a.charge).flatMap((n) => {
    const c = rxNeighbors(g, n.id).find((x) => x.bond.order === 2 && x.atom.element === 'C');
    const o = rxNeighbors(g, n.id).find((x) => x.bond.order === 1 && x.atom.element === 'O' && rxHydrogens(g, x.atom.id) === 1);
    return c && o ? [{ n: n.id, c: c.atom.id, o: o.atom.id }] : [];
  });
}

function rxyPrimaryAmides(s) {
  return s.info.carbonyls.filter((c) => c.kind === 'amide' && rxHydrogens(s.graph, c.hetero) === 2);
}

function rxyDiols(s) {
  const g = s.graph;
  const out = [];
  s.info.alcohols.forEach((a, i) => s.info.alcohols.slice(i + 1).forEach((b) => {
    if (g.getBond(a.c, b.c)) {
      out.push({ a, b });
    }
  }));
  return out;
}

function rxyNitro(s) {
  const g = s.graph;
  return g.atoms.filter((a) => a.element === 'N').flatMap((n) => {
    const os = rxNeighbors(g, n.id).filter((x) => x.atom.element === 'O' && rxNeighbors(g, x.atom.id).length === 1);
    const c = rxNeighbors(g, n.id).find((x) => x.atom.element === 'C');
    return os.length === 2 && c && rxNeighbors(g, n.id).length === 3 ? [{ n: n.id, os: os.map((x) => x.atom.id), c: c.atom.id }] : [];
  });
}

function rxyAnilines(s) {
  const g = s.graph;
  return g.atoms.filter((a) => a.element === 'N' && !a.charge && rxHydrogens(g, a.id) === 2 && rxNeighbors(g, a.id).length === 1 &&
    s.info.aromatic.atoms.has(rxNeighbors(g, a.id)[0].atom.id)).map((a) => ({ n: a.id, c: rxNeighbors(g, a.id)[0].atom.id }));
}

function rxyDiazonium(s) {
  const g = s.graph;
  return g.atoms.filter((a) => a.element === 'N' && a.charge === 1).flatMap((n) => {
    const t = rxNeighbors(g, n.id).find((x) => x.bond.order === 3 && x.atom.element === 'N');
    const c = rxNeighbors(g, n.id).find((x) => x.atom.element === 'C' && s.info.aromatic.atoms.has(x.atom.id));
    return t && c ? [{ n: n.id, t: t.atom.id, c: c.atom.id }] : [];
  });
}

function rxyRing(s, atom) {
  return s.info.aromatic.rings.find((r) => r.length === 6 && r.includes(atom)) || null;
}

function rxyAtPosition(ring, atom, offset) {
  return ring[(ring.indexOf(atom) + offset + 6) % 6];
}

function rxyIsWithdrawing(g, id) {
  const a = g.getAtom(id);
  if (a.element === 'N') {
    return rxNeighbors(g, id).filter((n) => n.atom.element === 'O' && rxNeighbors(g, n.atom.id).length === 1).length === 2;
  }
  return a.element === 'C' && rxNeighbors(g, id).some((n) => (n.bond.order === 2 && n.atom.element === 'O') || (n.bond.order === 3 && n.atom.element === 'N'));
}

function rxyOutside(g, id, ring) {
  return rxNeighbors(g, id).filter((n) => !ring.includes(n.atom.id)).map((n) => n.atom.id);
}

function rxyMigrant(g, from, exclude) {
  const options = rxNeighbors(g, from).filter((n) => !exclude.includes(n.atom.id) && n.atom.element === 'C').map((n) => n.atom.id);
  const aromatic = options.find((id) => rxNeighbors(g, id).some((n) => n.bond.order === 2 && n.atom.element === 'C'));
  if (aromatic) {
    return aromatic;
  }
  return options.sort((p, q) => rxCarbonNeighbors(g, q).length - rxCarbonNeighbors(g, p).length || rxsBranchSize(g, q, from) - rxsBranchSize(g, p, from))[0];
}

function rxyAcidCatalyst(ctx) {
  return ctx.has('strongAcid') || ctx.conditions.solvents.includes('acoh');
}

function rxyCuprateGroup(g, entry) {
  const map = rxMerge(g, entry.graph, entry.ids);
  rxRemoveBranch(g, map.get(entry.carbons[1]), map.get(entry.metal));
  g.removeAtom(map.get(entry.metal));
  return map.get(entry.carbons[0]);
}

function rxySmiles(g) {
  try {
    return computeProperties(g, g.atoms.map((a) => a.id)).smiles;
  } catch (error) {
    return '';
  }
}

function rxyRuleBeckmann(ctx) {
  const acid = ctx.has('strongAcid') || ctx.has('pocl3') || ctx.has('dehydrant');
  if (!acid) {
    return [];
  }
  return ctx.substrates.flatMap((s) => rxyOximes(s).slice(0, 1).map((ox) => {
    const g = rxCloneGraph(s.graph);
    const carbons = rxCarbonNeighbors(g, ox.c);
    g.removeAtom(ox.o);
    if (carbons.length < 2) {
      rxSetOrder(g, ox.c, ox.n, 3);
      return rxOutcome('beckmann-nitrile', 'Aldoxime dehydration', 'Elimination', g,
        'An aldoxime has an H on carbon, so instead of a group migrating the activated oxime simply loses water and gives the nitrile.',
        { score: 13, byproducts: ['H₂O'], consumes: [rxUse(s, 1)] });
    }
    const m = rxyMigrant(g, ox.c, [ox.n]);
    rxSetOrder(g, ox.c, ox.n, 1);
    rxSetOrder(g, ox.c, m, 0);
    g.addBond(ox.n, m);
    rxsReplace(g, m, ox.c, ox.n, false);
    rxAttach(g, 'O', ox.c, 2);
    const cyclic = rxRings(g, 9).some((r) => r.includes(ox.n) && r.includes(ox.c));
    const out = rxOutcome('beckmann', 'Beckmann rearrangement', 'Rearrangement', g,
      'Acid turns the oxime OH into a leaving group. The group anti to it migrates from carbon to nitrogen as water leaves, and the nitrilium ion is trapped by water; tautomerisation gives the amide' +
        (cyclic ? ', so the cyclic oxime ring-expands to a lactam.' : '.') + ' The migrating group keeps its configuration.',
      { score: 15, byproducts: ['H₂O (catalytic acid)'], consumes: [rxUse(s, 1)] });
    if (ctx.temperature < 80) {
      out.warnings.push('The Beckmann rearrangement is normally run hot (H₂SO₄ or polyphosphoric acid, 100–130 °C).');
    }
    out.warnings.push('Only the group anti to the OH migrates; E/Z oxime mixtures of unsymmetrical ketones give amide mixtures. The larger group is shown migrating.');
    return out;
  }));
}

function rxyRuleHofmannRearrangement(ctx) {
  const halogen = ['Br2', 'Cl2'].find((t) => ctx.has(t)) || (ctx.has('hypochlorite') ? 'hypochlorite' : null);
  if (!halogen || !(ctx.has('hydroxide') || ctx.has('alkoxide') || halogen === 'hypochlorite')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => rxyPrimaryAmides(s).slice(0, 1).map((am) => {
    const g = rxCloneGraph(s.graph);
    const r = rxCarbonNeighbors(g, am.c)[0].atom.id;
    rxSetOrder(g, am.c, r, 0);
    g.addBond(am.hetero, r);
    rxsReplace(g, r, am.c, am.hetero, false);
    g.removeAtom(am.o);
    g.removeAtom(am.c);
    return rxOutcome('hofmann-rearrangement', 'Hofmann rearrangement', 'Rearrangement', g,
      'Base and the halogen give an N-haloamide; deprotonation makes it lose halide as the R group migrates from carbon to nitrogen, giving an isocyanate. Water adds to the isocyanate and the carbamic acid loses CO₂, leaving an amine with one carbon fewer.',
      { score: 15, byproducts: ['CO₂ (as carbonate)', 'the halide salt'], consumes: [rxUse(s, 1), rxUse(ctx.get(halogen), 1), rxUse(ctx.get('hydroxide'), 4)] });
  }));
}

function rxyRulePinacol(ctx) {
  if (!ctx.has('strongAcid')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => rxyDiols(s).slice(0, 1).flatMap(({ a, b }) => {
    const g = rxCloneGraph(s.graph);
    const rank = (alc) => alc.degree + 2 * rxCarbonNeighbors(g, alc.c).filter((n) => s.info.aromatic.atoms.has(n.atom.id)).length;
    const [cat, mig] = rank(a) >= rank(b) ? [a, b] : [b, a];
    if (rank(cat) < 3) {
      return [];
    }
    const hydride = rxHydrogens(g, mig.c) > 0;
    const moving = hydride ? null : rxyMigrant(g, mig.c, [cat.c, mig.o]);
    g.removeAtom(cat.o);
    if (moving) {
      rxSetOrder(g, mig.c, moving, 0);
      g.addBond(cat.c, moving);
    }
    rxSetOrder(g, mig.c, mig.o, 2);
    rxsDrop(g, cat.c);
    rxsDrop(g, mig.c);
    const ring = moving && rxRings(s.graph, 8).some((r) => r.includes(moving) && r.includes(mig.c) && r.includes(cat.c));
    return [rxOutcome('pinacol', 'Pinacol rearrangement', 'Rearrangement', g,
      'Acid protonates the OH whose loss gives the more stable carbocation. A ' + (hydride ? 'hydride' : 'group') + ' on the neighbouring carbinol carbon then shifts across (1,2-shift), and the oxygen lone pair turns the new cation into a protonated C=O, which loses H⁺.' +
        (ring ? ' Here a ring bond migrates, so the ring contracts.' : ''),
      { score: 15, byproducts: ['H₂O'], consumes: [rxUse(s, 1)] })];
  }));
}

function rxyMethylKetones(s) {
  const g = s.graph;
  return s.info.carbonyls.filter((c) => c.kind === 'ketone').flatMap((c) => {
    const me = rxCarbonNeighbors(g, c.c).find((n) => rxHydrogens(g, n.atom.id) === 3);
    return me ? [Object.assign({ me: me.atom.id }, c)] : [];
  });
}

function rxyRuleHaloform(ctx) {
  const tag = ['I2', 'Br2', 'Cl2'].find((t) => ctx.has(t));
  const bleach = ctx.has('hypochlorite');
  if (!(tag && ctx.has('hydroxide')) && !bleach) {
    return [];
  }
  const x = tag ? tag.slice(0, -1) : 'Cl';
  return ctx.substrates.flatMap((s) => rxyMethylKetones(s).slice(0, 1).map((k) => {
    const g = rxCloneGraph(s.graph);
    g.removeAtom(k.me);
    rxAttach(g, 'O', k.c, 1, -1);
    rxxAddCation(ctx, g);
    const cx = g.addAtom('C', g.getAtom(k.c).x + 120, g.getAtom(k.c).y);
    [0, 1, 2].forEach(() => rxAttach(g, x, cx.id));
    const out = rxOutcome('haloform', x === 'I' ? 'Haloform reaction (iodoform)' : 'Haloform reaction', 'α-Halogenation / C–C cleavage', g,
      'Base forms the enolate of the methyl group, which is halogenated; each halogen makes the remaining H more acidic, so the CH₃ becomes CX₃. Hydroxide then adds to the C=O and expels ⁻CX₃ (a good leaving group), giving the carboxylate and CH' + x + '₃.',
      { score: 15, byproducts: ['H₂O', 'the halide salt'], consumes: [rxUse(s, 1), rxUse(ctx.get(tag || 'hypochlorite'), 3), rxUse(ctx.get('hydroxide'), 4)] });
    if (x === 'I') {
      out.warnings.push('Iodoform (CHI₃) precipitates as a yellow solid — the classic test for methyl ketones.');
    }
    return out;
  }));
}

function rxyRuleAlphaHalogenation(ctx) {
  const tag = ['Br2', 'Cl2', 'I2'].find((t) => ctx.has(t));
  if (!tag || !rxyAcidCatalyst(ctx) || ctx.has('pbr3')) {
    return [];
  }
  const x = tag.slice(0, -1);
  return ctx.substrates.flatMap((s) => rxxOxoCarbonyls(s).slice(0, 1).flatMap((c) => {
    const g = rxCloneGraph(s.graph);
    const alphas = rxAlphaCarbons(g, c.c);
    if (!alphas.length) {
      return [];
    }
    const alpha = alphas[alphas.length - 1];
    rxAttach(g, x, alpha);
    const out = rxOutcome('alpha-halogenation', 'Acid-catalysed α-halogenation', 'α-Substitution (via enol)', g,
      'Acid catalyses formation of the enol; the more substituted enol forms fastest, and its C=C attacks ' + tag + '. Loss of H⁺ from the oxonium ion regenerates the C=O with ' + x + ' on the α-carbon. The electron-withdrawing halogen slows further enolisation, so the reaction stops at one halogen.',
      { score: 13, byproducts: ['H' + x], consumes: [rxUse(s, 1), rxUse(ctx.get(tag), 1)] });
    if (alphas.length > 1 && new Set(alphas.map((id) => rxCarbonNeighbors(g, id).length)).size > 1) {
      out.warnings.push('Under basic conditions the less substituted side reacts instead, and every α-H is replaced.');
    }
    return [out];
  }));
}

function rxyRuleHvz(ctx) {
  if (!ctx.has('Br2')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => s.info.carbonyls.filter((c) => c.kind === 'acid').slice(0, 1).flatMap((c) => {
    const g = rxCloneGraph(s.graph);
    const alpha = rxAlphaCarbons(g, c.c)[0];
    if (!alpha) {
      return [];
    }
    if (!ctx.has('pbr3')) {
      return [rxHint('Carboxylic acids barely enolise, so Br₂ alone does not brominate them; add catalytic PBr₃ (Hell–Volhard–Zelinsky).')];
    }
    rxAttach(g, 'Br', alpha);
    return [rxOutcome('hvz', 'Hell–Volhard–Zelinsky bromination', 'α-Substitution (via enol)', g,
      'PBr₃ converts the acid into the acyl bromide, which enolises far more readily. The enol is brominated at the α-carbon, and exchange with more acid (or water on work-up) returns the α-bromo carboxylic acid.',
      { score: 15, byproducts: ['HBr'], consumes: [rxUse(s, 1), rxUse(ctx.get('Br2'), 1), rxUse(ctx.get('pbr3'), 0.3)] })];
  }));
}

function rxyRulePeriodate(ctx) {
  if (!ctx.has('periodate')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const diols = rxyDiols(s);
    if (!diols.length) {
      return s.info.alkenes.length ? [rxHint('NaIO₄ only cleaves 1,2-diols; dihydroxylate the alkene first (OsO₄/NMO), or use OsO₄ with NaIO₄ together (Lemieux–Johnson).')] : [];
    }
    const g = rxCloneGraph(s.graph);
    const { a, b } = diols[0];
    rxSetOrder(g, a.c, b.c, 0);
    rxSetOrder(g, a.c, a.o, 2);
    rxSetOrder(g, b.c, b.o, 2);
    rxsDrop(g, a.c);
    rxsDrop(g, b.c);
    return [rxOutcome('periodate', 'Periodate (Malaprade) diol cleavage', 'Oxidative cleavage', g,
      'Periodate forms a cyclic iodate ester with the two neighbouring OH groups; it then fragments, breaking the C–C bond and leaving a C=O on each carbon.',
      { score: 15, byproducts: ['NaIO₃', 'H₂O'], consumes: [rxUse(s, 1)] })];
  });
}

function rxyRuleWacker(ctx) {
  if (!ctx.has('palladium2')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => rxxTerminalAlkenes(s).slice(0, 1).flatMap((e) => {
    if (!rxxWater(ctx)) {
      return [rxHint('The Wacker oxidation needs water as the oxygen source (DMF/H₂O is typical).')];
    }
    const g = rxCloneGraph(s.graph);
    rxSetOrder(g, e.t, e.i, 1);
    rxAttach(g, 'O', e.i, 2);
    rxyCleanAlkenes(g);
    const out = rxOutcome('wacker', 'Wacker oxidation', 'Pd-catalysed oxidation', g,
      'The alkene binds to Pd(II) and water attacks the more substituted carbon (Markovnikov). β-Hydride elimination and tautomerisation give the methyl ketone and Pd(0), which CuCl₂/O₂ re-oxidises to Pd(II).',
      { score: 14, byproducts: ['H₂O (from O₂)'], consumes: [rxUse(s, 1)] });
    if (!ctx.has('copperChloride') && ctx.conditions.atmosphere !== 'o2') {
      out.warnings.push('Pd is only catalytic if it is re-oxidised: add CuCl (or CuCl₂) and run under O₂, otherwise a full equivalent of PdCl₂ is used up.');
    }
    return [out];
  }));
}

function rxyRuleMildOxidants(ctx) {
  const out = [];
  if (ctx.has('chlorite')) {
    ctx.substrates.forEach((s) => {
      const ald = s.info.carbonyls.filter((c) => c.kind === 'aldehyde');
      if (!ald.length) {
        return;
      }
      const g = rxCloneGraph(s.graph);
      ald.forEach((c) => rxAttach(g, 'O', c.c));
      const o = rxOutcome('pinnick', 'Pinnick oxidation', 'Oxidation', g,
        'Chlorous acid (from NaClO₂ at pH ≈ 4) adds to the aldehyde and the adduct fragments to the carboxylic acid and HOCl. Alkenes, alcohols and stereocentres elsewhere are untouched.',
        { score: 15, byproducts: ['HOCl (scavenged)', 'NaCl'], consumes: [rxUse(s, 1)] });
      o.warnings.push('Add a scavenger such as 2-methyl-2-butene to destroy the HOCl before it chlorinates alkenes.');
      out.push(o);
    });
  }
  if (ctx.has('manganeseDioxide')) {
    ctx.substrates.forEach((s) => {
      const g = rxCloneGraph(s.graph);
      const activated = s.info.alcohols.filter((a) => a.degree <= 2 && rxNeighbors(g, a.c).some((n) => s.info.aromatic.atoms.has(n.atom.id) ||
        s.info.alkenes.some((e) => e.a === n.atom.id || e.b === n.atom.id)));
      if (!activated.length) {
        if (s.info.alcohols.length) {
          out.push(rxHint('MnO₂ only oxidises allylic and benzylic alcohols; ordinary alcohols need PCC, DMP or Swern.'));
        }
        return;
      }
      activated.forEach((a) => {
        rxOxidizeAlcohol(g, a, false);
        rxsDrop(g, a.c);
      });
      out.push(rxOutcome('mno2', 'MnO₂ oxidation', 'Oxidation', g,
        'Activated MnO₂ removes the weak allylic/benzylic C–H by a radical pathway, giving the conjugated aldehyde or ketone. Saturated alcohols react far too slowly, so they survive.',
        { score: 14, byproducts: ['MnO', 'H₂O'], consumes: [rxUse(s, 1)] }));
    });
  }
  if (ctx.has('tollens')) {
    ctx.substrates.forEach((s) => {
      const ald = s.info.carbonyls.filter((c) => c.kind === 'aldehyde');
      if (!ald.length) {
        if (rxxOxoCarbonyls(s).length) {
          out.push(rxHint('Ketones give a negative Tollens test — Ag⁺ is too weak an oxidant to break the C–C bonds.'));
        }
        return;
      }
      const g = rxCloneGraph(s.graph);
      ald.forEach((c) => rxAttach(g, 'O', c.c, 1, -1));
      const nh4 = g.addAtom('N', g.getAtom(ald[0].c).x + 120, g.getAtom(ald[0].c).y);
      nh4.charge = 1;
      out.push(rxOutcome('tollens', 'Tollens oxidation (silver mirror)', 'Oxidation', g,
        'Ag(NH₃)₂⁺ oxidises the aldehyde to the carboxylate in basic ammonia; the silver is reduced to Ag(0), which coats the glass as a mirror.',
        { score: 14, byproducts: ['Ag (mirror)', 'NH₃'], consumes: [rxUse(s, 1)] }));
    });
  }
  if (ctx.has('tempo')) {
    ctx.substrates.forEach((s) => {
      const primary = s.info.alcohols.filter((a) => a.degree <= 1);
      if (!primary.length) {
        return;
      }
      if (!ctx.has('hypochlorite')) {
        out.push(rxHint('TEMPO is only the catalyst; add a stoichiometric co-oxidant such as NaOCl (bleach).'));
        return;
      }
      const g = rxCloneGraph(s.graph);
      primary.forEach((a) => rxOxidizeAlcohol(g, a, false));
      out.push(rxOutcome('tempo', 'TEMPO / bleach (Anelli) oxidation', 'Oxidation', g,
        'NaOCl oxidises TEMPO to its oxoammonium ion, which takes a hydride from the alcohol. Primary alcohols react much faster than secondary ones, so they stop cleanly at the aldehyde.',
        { score: 14, byproducts: ['NaCl', 'H₂O'], consumes: [rxUse(s, 1), rxUse(ctx.get('hypochlorite'), primary.length)] }));
    });
  }
  return out;
}

function rxyRuleLuche(ctx) {
  if (!ctx.has('borohydride') || !ctx.has('cerium')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const enones = rxxEnones(s).filter((e) => e.kind === 'ketone' || e.kind === 'aldehyde');
    if (!enones.length) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    rxxOxoCarbonyls(s).forEach((c) => rxSetOrder(g, c.c, c.o, 1));
    return [rxOutcome('luche', 'Luche reduction', 'Reduction (1,2-selective)', g,
      'CeCl₃ in methanol converts NaBH₄ into harder methoxyborohydrides and activates the C=O, so hydride adds directly to the carbonyl carbon (1,2-addition) rather than to the β-carbon. The C=C is kept, giving the allylic alcohol.',
      { score: 15, byproducts: ['borate salts'], consumes: [rxUse(s, 1), rxUse(ctx.get('borohydride'), 1)] })];
  });
}

function rxyRuleNitroReduction(ctx) {
  const hydrogen = ctx.has('H2') && ctx.has('hydrogenationCatalyst');
  const metal = (ctx.has('iron') || ctx.has('zinc')) && ctx.has('strongAcid');
  const tin = ctx.has('tinChloride');
  if (!hydrogen && !metal && !tin) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const nitro = rxyNitro(s);
    if (!nitro.length) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    nitro.forEach((x) => {
      x.os.forEach((o) => g.removeAtom(o));
      g.getAtom(x.n).charge = 0;
    });
    if (hydrogen) {
      s.info.alkenes.concat(s.info.alkynes).forEach((e) => rxSetOrder(g, e.a, e.b, 1));
      rxyCleanAlkenes(g);
    }
    const reagent = hydrogen ? 'H₂ on the metal surface' : tin ? 'SnCl₂' : ctx.has('iron') ? 'Fe in acid' : 'Zn in acid';
    const out = rxOutcome('nitro-reduction', 'Nitro group reduction', 'Reduction', g,
      reagent + ' reduces the nitro group in 2-electron steps — nitroso, then hydroxylamine, then amine — removing both oxygens as water.' +
        (hydrogen && (s.info.alkenes.length || s.info.alkynes.length) ? ' Catalytic hydrogenation also saturates the C=C/C≡C bonds; use Fe/HCl or SnCl₂ to keep them.' : ''),
      { score: 14, byproducts: ['H₂O'], consumes: [rxUse(s, 1)] });
    if (metal || tin) {
      out.warnings.push('In acid the amine is obtained as its ammonium salt; basify on work-up to free the amine.');
    }
    return [out];
  });
}

function rxyRuleBirch(ctx) {
  if (!ctx.has('dissolvingMetal')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const g = rxCloneGraph(s.graph);
    const ring = s.info.aromatic.rings.find((r) => r.length === 6 && r.every((id) => g.getAtom(id).element === 'C' &&
      s.info.aromatic.rings.filter((q) => q.includes(id)).length === 1));
    if (!ring || s.info.alkynes.length) {
      return [];
    }
    if (!ctx.solventNucleophiles.some((n) => n.alcohol)) {
      return [rxHint('The Birch reduction needs an alcohol (EtOH or t-BuOH) in the NH₃ as a proton source.')];
    }
    const subs = ring.map((id) => rxyOutside(g, id, ring));
    let i = subs.findIndex((list) => list.some((id) => rxyIsWithdrawing(g, id)));
    const ewg = i >= 0;
    if (!ewg) {
      i = Math.max(0, subs.findIndex((list) => list.length > 0));
    }
    ring.forEach((id, k) => rxSetOrder(g, id, ring[(k + 1) % 6], 1));
    const pairs = ewg ? [[1, 2], [4, 5]] : [[0, 1], [3, 4]];
    pairs.forEach(([p, q]) => rxSetOrder(g, ring[(i + p) % 6], ring[(i + q) % 6], 2));
    return [rxOutcome('birch', 'Birch reduction', 'Dissolving-metal reduction', g,
      'Solvated electrons from Na in NH₃ add to the ring one at a time, each followed by protonation by the alcohol, giving the non-conjugated 1,4-cyclohexadiene. ' +
        (ewg ? 'An electron-withdrawing group stabilises the carbanion at its own carbon, so that carbon ends up sp³.' : 'An electron-donating group keeps its carbon on a remaining C=C.'),
      { score: 14, byproducts: ['NaOR', 'NaNH₂'], consumes: [rxUse(s, 1)] })];
  });
}

function rxyRuleGilman(ctx) {
  const cuprate = ctx.get('cuprate');
  if (!cuprate) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const acyl = s.info.carbonyls.find((c) => c.kind === 'acylChloride');
    const enone = rxxEnones(s).find((e) => ['ketone', 'aldehyde', 'ester'].includes(e.kind));
    const halide = s.info.halides.filter((h) => h.degree <= 2).concat(s.info.arylHalides.filter((x) => s.graph.getAtom(x.x).element !== 'Cl'))[0];
    if (!acyl && !enone && !halide) {
      return rxxOxoCarbonyls(s).length ? [rxHint('Gilman cuprates are too soft to add to ordinary ketones and aldehydes; they add 1,4 to enones and couple with acid chlorides and halides.')] : [];
    }
    const g = rxCloneGraph(s.graph);
    const r = rxyCuprateGroup(g, cuprate);
    if (acyl) {
      g.removeAtom(acyl.hetero);
      g.addBond(acyl.c, r);
      return [rxOutcome('gilman-ketone', 'Cuprate + acid chloride → ketone', 'Organocuprate acylation', g,
        'The cuprate transfers one R group to the acid chloride; unlike a Grignard it does not add again to the ketone it forms, so the reaction stops cleanly at the ketone.',
        { score: 15, byproducts: ['RCu', 'LiCl'], consumes: [rxUse(s, 1), rxUse(cuprate, 1)] })];
    }
    if (enone) {
      rxSetOrder(g, enone.alpha, enone.beta, 1);
      g.addBond(enone.beta, r);
      rxyCleanAlkenes(g);
      return [rxOutcome('gilman-conjugate', 'Cuprate conjugate (1,4-) addition', 'Conjugate addition', g,
        'The soft cuprate adds its R group to the β-carbon of the enone (1,4-addition) rather than to the C=O; the lithium enolate is protonated on work-up.',
        { score: 15, byproducts: ['RCu', 'LiOH (work-up)'], consumes: [rxUse(s, 1), rxUse(cuprate, 1)] })];
    }
    g.removeAtom(halide.x);
    g.addBond(halide.c, r);
    return [rxOutcome('corey-house', 'Corey–House coupling', 'Organocuprate coupling', g,
      'The cuprate displaces the halide (oxidative addition at Cu then reductive elimination), joining the two carbon groups in a new C–C bond.',
      { score: 13, byproducts: ['RCu', 'LiX'], consumes: [rxUse(s, 1), rxUse(cuprate, 1)] })];
  });
}

function rxyRuleGrignardFormation(ctx) {
  if (!ctx.has('magnesium')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const rank = { I: 0, Br: 1, Cl: 2 };
    const pick = s.info.halides.map((h) => ({ x: h.x, c: h.c })).concat(s.info.arylHalides)
      .sort((p, q) => rank[s.graph.getAtom(p.x).element] - rank[s.graph.getAtom(q.x).element])[0];
    if (!pick) {
      return [];
    }
    if (ctx.protic || ctx.has('H2O')) {
      return [rxHint('Grignard reagents are destroyed by water and alcohols; make them in dry ether or THF.')];
    }
    const g = rxCloneGraph(s.graph);
    rxSetOrder(g, pick.c, pick.x, 0);
    const mg = g.addAtom('Mg', g.getAtom(pick.c).x + 30, g.getAtom(pick.c).y);
    g.addBond(pick.c, mg.id);
    g.addBond(mg.id, pick.x);
    rxsDrop(g, pick.c);
    const out = rxOutcome('grignard-formation', 'Grignard reagent formation', 'Oxidative insertion', g,
      'Magnesium metal inserts into the C–X bond by single-electron transfer, reversing the polarity of the carbon: it becomes a strongly nucleophilic, basic carbanion equivalent.',
      { score: 14, consumes: [rxUse(s, 1)] });
    if (!['ether', 'thf'].some((id) => ctx.conditions.solvents.includes(id))) {
      out.warnings.push('Use diethyl ether or THF: the ether oxygens coordinate and stabilise RMgX.');
    }
    out.warnings.push('A crystal of I₂ or a little 1,2-dibromoethane helps start the reaction on the Mg surface.');
    return [out];
  });
}

function rxyRuleReformatsky(ctx) {
  if (!ctx.has('zinc')) {
    return [];
  }
  const bromo = ctx.substrates.flatMap((s) => s.info.halides.map((h) => ({ s, h, ester: s.info.carbonyls.find((c) => c.kind === 'ester' && s.graph.getBond(c.c, h.c)) })))
    .find((x) => x.ester);
  const carb = bromo && ctx.substrates.filter((s) => s !== bromo.s).map((s) => ({ s, c: rxxOxoCarbonyls(s)[0] })).find((x) => x.c);
  if (!carb) {
    return [];
  }
  const { g, map } = rxxJoin(bromo.s, carb.s);
  g.removeAtom(bromo.h.x);
  rxSetOrder(g, map.get(carb.c.c), map.get(carb.c.o), 1);
  g.addBond(bromo.h.c, map.get(carb.c.c));
  return [rxOutcome('reformatsky', 'Reformatsky reaction', 'Organozinc addition', g,
    'Zinc inserts into the C–Br bond of the α-bromo ester to give a zinc enolate. It is mild enough not to attack the ester, but adds to the aldehyde or ketone; acidic work-up gives the β-hydroxy ester.',
    { score: 15, byproducts: ['ZnBr(OH)'], consumes: [rxUse(bromo.s, 1), rxUse(carb.s, 1)] })];
}

function rxyRuleMitsunobu(ctx) {
  if (!ctx.has('triphenylphosphine') || !ctx.has('azodicarboxylate')) {
    return [];
  }
  const alc = ctx.substrates.flatMap((s) => s.info.alcohols.map((a) => ({ s, a }))).sort((p, q) => p.a.degree - q.a.degree)[0];
  if (!alc) {
    return [];
  }
  if (alc.a.degree >= 3) {
    return [rxHint('Tertiary alcohols do not undergo the Mitsunobu reaction: the Sₙ2 step is too hindered.')];
  }
  const nuc = ctx.substrates.filter((s) => s !== alc.s).flatMap((s) => s.info.carbonyls.filter((c) => c.kind === 'acid').map((c) => ({ s, o: c.hetero, kind: 'ester' }))
    .concat(rxxPhenols(s).map((p) => ({ s, o: p.o, kind: 'ether' }))))[0];
  if (!nuc) {
    return [rxHint('The Mitsunobu reaction needs an acidic nucleophile (pKa < 13) such as a carboxylic acid or phenol.')];
  }
  const { g, map } = rxxJoin(alc.s, nuc.s);
  const o = map.get(nuc.o);
  rxsReplace(g, alc.a.c, alc.a.o, o, true);
  g.removeAtom(alc.a.o);
  g.addBond(alc.a.c, o);
  return [rxOutcome('mitsunobu', 'Mitsunobu reaction', 'Substitution (Sₙ2, inversion)', g,
    'PPh₃ adds to DEAD/DIAD, and the resulting betaine deprotonates the acidic nucleophile and activates the alcohol as an alkoxyphosphonium ion. The nucleophile then displaces Ph₃P=O by backside attack, so the alcohol carbon is inverted.',
    { score: 16, byproducts: ['Ph₃P=O', 'the hydrazine dicarboxylate'], consumes: [rxUse(alc.s, 1), rxUse(nuc.s, 1.2), rxUse(ctx.get('triphenylphosphine'), 1.2), rxUse(ctx.get('azodicarboxylate'), 1.2)] })];
}

function rxyRuleSulfonylation(ctx) {
  const reagent = ctx.get('sulfonylChloride');
  if (!reagent) {
    return [];
  }
  const s0 = reagent.ids.find((id) => reagent.graph.getAtom(id).element === 'S');
  const cl = reagent.ids.find((id) => reagent.graph.getAtom(id).element === 'Cl');
  const tosyl = reagent.ids.some((id) => reagent.graph.getAtom(id).element === 'C' && rxNeighbors(reagent.graph, id).some((n) => n.bond.order === 2 && n.atom.element === 'C'));
  const label = tosyl ? 'Ts' : 'Ms';
  return ctx.substrates.flatMap((s) => {
    const alc = s.info.alcohols.slice().sort((p, q) => p.degree - q.degree)[0];
    const amine = s.info.amines[0];
    const site = alc ? alc.o : amine ? amine.n : null;
    if (!site) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    const map = rxMerge(g, reagent.graph, reagent.ids.filter((id) => id !== cl));
    g.addBond(site, map.get(s0));
    const out = rxOutcome(alc ? 'sulfonate' : 'sulfonamide', alc ? (tosyl ? 'Tosylation' : 'Mesylation') + ' of an alcohol' : 'Sulfonamide formation', 'Substitution at sulfur', g,
      alc ? 'The alcohol oxygen attacks sulfur and chloride leaves; the base removes the HCl. The C–O bond is never broken, so the carbon keeps its configuration, and O' + label + ' is now an excellent leaving group for Sₙ2 or E2.'
        : 'The amine nitrogen attacks sulfur and displaces chloride, giving the sulfonamide (the basis of the Hinsberg test).',
      { score: 14, byproducts: ['the base hydrochloride'], consumes: [rxUse(s, 1), rxUse(reagent, 1.2)] });
    if (!ctx.has('amineBase')) {
      out.warnings.push('Add pyridine or Et₃N to neutralise the HCl formed.');
    }
    return [out];
  });
}

function rxyAllylEthers(s) {
  const g = s.graph;
  const out = [];
  g.atoms.filter((a) => a.element === 'O' && !a.charge).forEach((o) => {
    const ns = rxNeighbors(g, o.id);
    if (ns.length !== 2 || ns.some((n) => n.bond.order !== 1 || n.atom.element !== 'C')) {
      return;
    }
    [[ns[0].atom.id, ns[1].atom.id], [ns[1].atom.id, ns[0].atom.id]].forEach(([ca, cv]) => {
      if (!rxIsSp3(g, ca) || s.info.aromatic.atoms.has(ca)) {
        return;
      }
      const allyl = s.info.alkenes.flatMap((e) => [[e.a, e.b], [e.b, e.a]]).find(([cb]) => g.getBond(ca, cb) && cb !== cv);
      if (!allyl) {
        return;
      }
      const [cb, cc] = allyl;
      if (s.info.aromatic.atoms.has(cv)) {
        const ring = rxyRing(s, cv);
        const ortho = ring ? [1, -1].map((k) => rxyAtPosition(ring, cv, k)).find((id) => rxHydrogens(g, id) > 0) : null;
        if (ortho) {
          out.push({ o: o.id, ca, cb, cc, cv, cv2: ortho, aryl: true });
        }
        return;
      }
      const vinyl = s.info.alkenes.flatMap((e) => [[e.a, e.b], [e.b, e.a]]).find(([x]) => x === cv);
      if (vinyl) {
        out.push({ o: o.id, ca, cb, cc, cv, cv2: vinyl[1], aryl: false });
      }
    });
  });
  return out;
}

function rxyDienes15(s) {
  const g = s.graph;
  const sides = s.info.alkenes.flatMap((e) => [[e.a, e.b], [e.b, e.a]]);
  for (const [c1, c2] of sides) {
    for (const n3 of rxCarbonNeighbors(g, c2, c1)) {
      const c3 = n3.atom.id;
      if (!rxIsSp3(g, c3) || n3.bond.order !== 1) {
        continue;
      }
      for (const n4 of rxCarbonNeighbors(g, c3, c2)) {
        const c4 = n4.atom.id;
        if (!rxIsSp3(g, c4)) {
          continue;
        }
        const end = sides.find(([c5, c6]) => c5 !== c2 && c6 !== c2 && g.getBond(c4, c5) && c5 !== c3 && c6 !== c1 && !g.getBond(c1, c6));
        if (end) {
          return [c1, c2, c3, c4, end[0], end[1]];
        }
      }
    }
  }
  return null;
}

function rxyRuleSigmatropic(ctx) {
  const hot = ctx.temperature >= 100;
  return ctx.substrates.flatMap((s) => {
    const ether = rxyAllylEthers(s)[0];
    if (ether) {
      if (!hot) {
        return [rxHint('The Claisen rearrangement of an allyl ' + (ether.aryl ? 'aryl' : 'vinyl') + ' ether needs heat (≈150–200 °C).')];
      }
      const g = rxCloneGraph(s.graph);
      const e = ether;
      rxSetOrder(g, e.o, e.ca, 0);
      rxSetOrder(g, e.cb, e.cc, 1);
      rxSetOrder(g, e.ca, e.cb, 2);
      g.addBond(e.cc, e.cv2);
      if (!e.aryl) {
        rxSetOrder(g, e.cv, e.cv2, 1);
        rxSetOrder(g, e.cv, e.o, 2);
      }
      rxsDrop(g, e.ca);
      rxyCleanAlkenes(g);
      const out = rxOutcome('claisen-rearrangement', e.aryl ? 'Aromatic Claisen rearrangement' : 'Claisen rearrangement', '[3,3]-Sigmatropic rearrangement', g,
        'Six atoms (C=C–C–O–C=C) reorganise through a chair-like cyclic transition state: the C–O bond breaks as a new C–C bond forms at the far end of the allyl group, which is attached by its terminal carbon.' +
          (e.aryl ? ' The dienone formed at the ortho carbon tautomerises back to the aromatic phenol.' : ' The product is a γ,δ-unsaturated carbonyl compound.'),
        { score: 15, consumes: [rxUse(s, 1)] });
      if (ctx.temperature < (e.aryl ? 180 : 150)) {
        out.warnings.push('Typical temperatures are ' + (e.aryl ? '180–220 °C (e.g. neat or in N,N-diethylaniline).' : '150–200 °C.'));
      }
      return [out];
    }
    const d = rxyDienes15(s);
    if (!d) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    const [c1, c2, c3, c4, c5, c6] = d;
    const oh = s.info.alcohols.find((a) => a.c === c3 || a.c === c4);
    const anionic = oh && (ctx.has('hydride') || ctx.has('alkoxide'));
    if (!hot && !anionic) {
      return [rxHint('Cope rearrangements of 1,5-dienes need strong heating (≈150–300 °C); an oxy-Cope alkoxide (KH, 18-crown-6) goes at room temperature.')];
    }
    rxSetOrder(g, c3, c4, 0);
    g.addBond(c1, c6);
    rxSetOrder(g, c1, c2, 1);
    rxSetOrder(g, c5, c6, 1);
    rxSetOrder(g, c2, c3, 2);
    rxSetOrder(g, c4, c5, 2);
    if (oh) {
      const partner = oh.c === c3 ? c2 : c5;
      rxSetOrder(g, oh.c, partner, 1);
      rxSetOrder(g, oh.c, oh.o, 2);
    }
    [c1, c3, c4, c6].forEach((id) => rxsDrop(g, id));
    rxyCleanAlkenes(g);
    if (!oh && rxySmiles(g) === rxySmiles(s.graph)) {
      return [rxHint('This 1,5-diene rearranges into itself (a degenerate Cope rearrangement), so heating gives no new product.')];
    }
    return [rxOutcome(oh ? (anionic ? 'anionic-oxy-cope' : 'oxy-cope') : 'cope', oh ? (anionic ? 'Anionic oxy-Cope rearrangement' : 'Oxy-Cope rearrangement') : 'Cope rearrangement', '[3,3]-Sigmatropic rearrangement', g,
      'The 1,5-diene reorganises through a chair-like six-membered transition state: the central σ bond breaks, a new σ bond forms between the two ends, and both π bonds shift inward.' +
        (oh ? ' The OH ends up on a C=C, and this enol tautomerises to the carbonyl, which makes the reaction irreversible.' + (anionic ? ' As the alkoxide it is accelerated by about 10¹⁰ and runs at room temperature.' : '') : ' The equilibrium favours the more substituted (or less strained) diene.'),
      { score: oh ? 15 : 13, consumes: [rxUse(s, 1)] })];
  });
}

function rxyRulePaalKnorr(ctx) {
  const out = [];
  ctx.substrates.forEach((s) => {
    const g0 = s.graph;
    const oxo = rxxOxoCarbonyls(s);
    let found = null;
    oxo.forEach((p, i) => oxo.slice(i + 1).forEach((q) => {
      rxCarbonNeighbors(g0, p.c).forEach((na) => rxCarbonNeighbors(g0, na.atom.id, p.c).forEach((nb) => {
        if (!found && g0.getBond(nb.atom.id, q.c) && [na.atom.id, nb.atom.id].every((id) => rxIsSp3(g0, id) && rxHydrogens(g0, id) > 0)) {
          found = { p, q, ca: na.atom.id, cb: nb.atom.id };
        }
      }));
    }));
    if (!found) {
      return;
    }
    const amine = ctx.substrates.filter((x) => x !== s).flatMap((x) => x.info.amines.filter((a) => a.h === 2).map((a) => ({ s: x, a })))[0];
    const ammonia = ctx.get('ammonia');
    if (!amine && !ammonia && !ctx.has('strongAcid')) {
      return;
    }
    const joined = amine ? rxxJoin(s, amine.s) : { g: rxCloneGraph(s.graph), map: new Map() };
    const g = joined.g;
    const { p, q, ca, cb } = found;
    if (amine || ammonia) {
      const n = amine ? joined.map.get(amine.a.n) : g.addAtom('N', (g.getAtom(p.c).x + g.getAtom(q.c).x) / 2, g.getAtom(p.c).y - 40).id;
      g.removeAtom(p.o);
      g.removeAtom(q.o);
      g.addBond(p.c, n);
      g.addBond(q.c, n);
    } else {
      g.removeAtom(q.o);
      rxSetOrder(g, p.c, p.o, 1);
      g.addBond(p.o, q.c);
    }
    rxSetOrder(g, p.c, ca, 2);
    rxSetOrder(g, cb, q.c, 2);
    rxsDrop(g, ca);
    rxsDrop(g, cb);
    const pyrrole = Boolean(amine || ammonia);
    out.push(rxOutcome(pyrrole ? 'paal-knorr-pyrrole' : 'paal-knorr-furan', pyrrole ? 'Paal–Knorr pyrrole synthesis' : 'Paal–Knorr furan synthesis', 'Condensation / cyclisation', g,
      pyrrole ? 'The amine condenses with one C=O to form a hemiaminal and then attacks the second C=O intramolecularly; two dehydrations make the aromatic pyrrole ring.'
        : 'Acid makes one C=O into its enol, whose OH attacks the other protonated C=O to close a five-membered ring; loss of water gives the aromatic furan.',
      { score: 15, byproducts: [pyrrole ? '2 H₂O' : 'H₂O'], consumes: [rxUse(s, 1), amine ? rxUse(amine.s, 1) : rxUse(ammonia, 1)] }));
  });
  return out;
}

function rxyRuleHalolactonization(ctx) {
  const tag = ['I2', 'Br2'].find((t) => ctx.has(t));
  if (!tag || !ctx.has('weakBase')) {
    return [];
  }
  const x = tag.slice(0, -1);
  return ctx.substrates.flatMap((s) => s.info.carbonyls.filter((c) => c.kind === 'acid').slice(0, 1).flatMap((acid) => {
    const g = rxCloneGraph(s.graph);
    const options = s.info.alkenes.flatMap((e) => [[e.a, e.b], [e.b, e.a]])
      .map(([a, b]) => ({ a, b, size: rxPathLength(g, acid.c, a) + 2, far: rxPathLength(g, acid.c, b) + 2 }))
      .filter((o) => (o.size === 5 || o.size === 6) && o.far > o.size)
      .sort((p, q) => p.size - q.size);
    if (!options.length) {
      return [];
    }
    const o = options[0];
    rxSetOrder(g, o.a, o.b, 1);
    g.addBond(acid.hetero, o.a);
    const xa = rxAttach(g, x, o.b);
    rxsFaceAdd(g, [[o.a, acid.hetero, 1], [o.b, xa.id, -1]]);
    rxyCleanAlkenes(g);
    return [rxOutcome(x === 'I' ? 'iodolactonization' : 'bromolactonization', x === 'I' ? 'Iodolactonisation' : 'Bromolactonisation', 'Electrophilic cyclisation', g,
      'The base makes the carboxylate. ' + tag + ' forms a halonium ion on the alkene, and the carboxylate opens it intramolecularly from the opposite face (' + o.size + '-exo, anti addition), giving a ' + (o.size === 5 ? 'γ' : 'δ') + '-lactone with ' + x + ' on the exocyclic carbon.',
      { score: 15, byproducts: ['H' + x + ' (as salt)'], consumes: [rxUse(s, 1), rxUse(ctx.get(tag), 1)] })];
  }));
}

function rxyRuleSnar(ctx) {
  const rank = { F: 0, Cl: 1, Br: 2, I: 3 };
  const sites = ctx.substrates.flatMap((s) => {
    const g = s.graph;
    return g.atoms.filter((a) => rank[a.element] !== undefined && rxNeighbors(g, a.id).length === 1 && s.info.aromatic.atoms.has(rxNeighbors(g, a.id)[0].atom.id))
      .map((a) => {
        const c = rxNeighbors(g, a.id)[0].atom.id;
        const ring = rxyRing(s, c);
        const ringN = ring ? [1, -1, 3].filter((k) => g.getAtom(rxyAtPosition(ring, c, k)).element === 'N').length : 0;
        const act = ringN + (ring ? [1, -1, 3].filter((k) => rxyOutside(g, rxyAtPosition(ring, c, k), ring).some((id) => rxyIsWithdrawing(g, id))).length : 0);
        return { s, x: a.id, c, act, ringN, halogen: a.element };
      });
  }).sort((p, q) => q.act - p.act || rank[p.halogen] - rank[q.halogen]);
  const site = sites[0];
  if (!site || ctx.has('palladium0')) {
    return [];
  }
  const amine = ctx.substrates.filter((x) => x !== site.s).flatMap((x) => x.info.amines.map((a) => ({ s: x, a })))[0];
  const alkoxide = ctx.get('alkoxide');
  const hydroxide = ctx.get('hydroxide');
  if (!amine && !alkoxide && !hydroxide) {
    return [];
  }
  if (!site.act) {
    return [rxHint('Nucleophilic aromatic substitution needs a strong electron-withdrawing group (NO₂, CN, C=O) ortho or para to the halogen; otherwise use a Pd-catalysed coupling.')];
  }
  let g;
  let nu;
  if (amine) {
    const joined = rxxJoin(site.s, amine.s);
    g = joined.g;
    nu = joined.map.get(amine.a.n);
  } else if (alkoxide) {
    g = rxCloneGraph(site.s.graph);
    const map = rxMerge(g, alkoxide.graph, alkoxide.ids);
    nu = map.get(alkoxide.atom);
    g.getAtom(nu).charge = 0;
  } else {
    g = rxCloneGraph(site.s.graph);
    nu = g.addAtom('O', g.getAtom(site.c).x + 30, g.getAtom(site.c).y).id;
  }
  g.removeAtom(site.x);
  g.addBond(site.c, nu);
  const out = rxOutcome('snar', 'Nucleophilic aromatic substitution (SₙAr)', 'Addition–elimination', g,
    'The nucleophile adds to the carbon bearing the halogen, and the negative charge of this Meisenheimer complex is delocalised onto ' + (site.ringN ? 'the ring nitrogen ortho/para to it' : 'the ortho/para electron-withdrawing group' + (site.act > 1 ? 's' : '')) +
      '. Loss of ' + site.halogen + '⁻ restores the aromatic ring.' + (site.halogen === 'F' ? ' Fluoride is the best leaving group here because the addition step is rate-limiting and F makes the carbon most electrophilic.' : ''),
    { score: 15, byproducts: ['H' + site.halogen + ' (as salt)'], consumes: [rxUse(site.s, 1), amine ? rxUse(amine.s, 2) : rxUse(alkoxide || hydroxide, 1)] });
  if (ctx.temperature < 50 && site.act < 2) {
    out.warnings.push('With a single activating group SₙAr usually needs heating (80–150 °C) in a polar aprotic solvent.');
  }
  return [out];
}

function rxyRuleDiazonium(ctx) {
  const nitrite = ctx.has('nitrite') && ctx.has('strongAcid');
  const out = [];
  ctx.substrates.forEach((s) => {
    const pre = rxyDiazonium(s)[0];
    const aniline = nitrite && !pre ? rxyAnilines(s)[0] : null;
    if (!pre && !aniline) {
      return;
    }
    const g = rxCloneGraph(s.graph);
    const c = pre ? pre.c : aniline.c;
    const partner = ctx.substrates.filter((x) => x !== s).flatMap((x) => {
      const activated = rxxPhenols(x).map((p) => p.c).concat(x.graph.atoms.filter((a) => a.element === 'N' && rxHydrogens(x.graph, a.id) === 0 && rxNeighbors(x.graph, a.id).length === 3 &&
        rxNeighbors(x.graph, a.id).some((n) => x.info.aromatic.atoms.has(n.atom.id))).map((a) => rxNeighbors(x.graph, a.id).find((n) => x.info.aromatic.atoms.has(n.atom.id)).atom.id));
      return activated.flatMap((ipso) => {
        const ring = rxyRing(x, ipso);
        const target = ring ? [3, 1, -1].map((k) => rxyAtPosition(ring, ipso, k)).find((id) => rxHydrogens(x.graph, id) > 0) : null;
        return target ? [{ s: x, target }] : [];
      });
    })[0];
    const replace = (element, order) => {
      g.atoms.filter((a) => a.element === 'N' && rxPathLength(g, c, a.id) <= 2).map((a) => a.id).forEach((id) => g.removeAtom(id));
      const atom = rxAttach(g, element, c);
      if (order === 3) {
        rxAttach(g, 'N', atom.id, 3);
      }
    };
    const via = pre ? 'The diazonium ion' : 'Nitrous acid (from NaNO₂ and acid) converts the ArNH₂ into the diazonium ion ArN₂⁺, which';
    let o;
    if (partner) {
      const joined = rxxJoin(s, partner.s);
      const gj = joined.g;
      const n1 = pre ? pre.n : aniline.n;
      let n2 = pre ? pre.t : null;
      if (!pre) {
        n2 = rxAttach(gj, 'N', n1, 2).id;
      } else {
        rxSetOrder(gj, n1, n2, 2);
        gj.getAtom(n1).charge = 0;
      }
      gj.addBond(n2, joined.map.get(partner.target));
      o = rxOutcome('azo-coupling', 'Azo coupling', 'Electrophilic aromatic substitution', gj,
        via + ' is a weak electrophile that attacks only strongly activated rings (phenols, anilines), normally para to the activating group, giving a coloured azo compound Ar–N=N–Ar′.',
        { score: 15, byproducts: ['HCl'], consumes: [rxUse(s, 1), rxUse(partner.s, 1)] });
      if (rxxPhenols(partner.s).length && !ctx.has('hydroxide')) {
        o.warnings.push('Phenols couple as their phenoxide ions; run the coupling in mildly basic solution (NaOH, pH 8–10).');
      }
    } else if (ctx.has('copperChloride') || ctx.has('copperBromide') || ctx.has('copperCyanide')) {
      const kind = ctx.has('copperCyanide') ? 'CN' : ctx.has('copperBromide') ? 'Br' : 'Cl';
      if (kind === 'CN') {
        replace('C', 3);
      } else {
        replace(kind);
      }
      o = rxOutcome('sandmeyer', 'Sandmeyer reaction', 'Radical substitution (Cu-catalysed)', g,
        via + ' takes an electron from Cu(I); N₂ is lost to give an aryl radical, which picks up ' + kind + ' from the Cu(II) species.',
        { score: 15, byproducts: ['N₂'], consumes: [rxUse(s, 1)] });
    } else if (ctx.has('iodide')) {
      replace('I');
      o = rxOutcome('diazonium-iodide', 'Diazonium → aryl iodide', 'Substitution (–N₂)', g,
        via + ' is displaced by iodide without any copper catalyst; N₂ is the leaving group.', { score: 15, byproducts: ['N₂'], consumes: [rxUse(s, 1)] });
    } else if (ctx.has('fluoroborate') && ctx.temperature >= 50) {
      replace('F');
      o = rxOutcome('balz-schiemann', 'Balz–Schiemann reaction', 'Substitution (–N₂)', g,
        via + ' precipitates as its BF₄⁻ salt; heating the dry salt releases N₂ and BF₃, and fluoride from BF₄⁻ captures the aryl cation.',
        { score: 15, byproducts: ['N₂', 'BF₃'], consumes: [rxUse(s, 1)] });
    } else if (ctx.has('hypophosphorous')) {
      g.atoms.filter((a) => a.element === 'N' && rxPathLength(g, c, a.id) <= 2).map((a) => a.id).forEach((id) => g.removeAtom(id));
      o = rxOutcome('deamination', 'Deamination (H₃PO₂)', 'Reduction (–N₂)', g,
        via + ' is reduced by hypophosphorous acid: a radical chain replaces N₂ with H, so ArNH₂ becomes ArH. This removes an amino group after it has been used to direct substitution.',
        { score: 15, byproducts: ['N₂', 'H₃PO₃'], consumes: [rxUse(s, 1)] });
    } else if (rxxWater(ctx) && ctx.temperature >= 40) {
      replace('O');
      o = rxOutcome('diazonium-phenol', 'Diazonium hydrolysis → phenol', 'Substitution (–N₂)', g,
        via + ' loses N₂ on warming in water; water captures the aryl cation, giving the phenol.', { score: 14, byproducts: ['N₂', 'H⁺'], consumes: [rxUse(s, 1)] });
    } else if (!pre) {
      g.getAtom(aniline.n).charge = 1;
      rxAttach(g, 'N', aniline.n, 3);
      const cl = g.addAtom(ctx.has('fluoroborate') ? 'F' : 'Cl', g.getAtom(aniline.n).x + 60, g.getAtom(aniline.n).y);
      cl.charge = -1;
      o = rxOutcome('diazotization', 'Diazotisation', 'N-Nitrosation / dehydration', g,
        'NaNO₂ and acid give the nitrosonium ion NO⁺, which the amine attacks; proton shifts and loss of water give the aryl diazonium ion ArN₂⁺ — a versatile intermediate for Sandmeyer, iodide, Schiemann and azo-coupling reactions.',
        { score: 13, byproducts: ['H₂O', 'NaCl'], consumes: [rxUse(s, 1), rxUse(ctx.get('nitrite'), 1)] });
      if (ctx.has('fluoroborate')) {
        o.warnings.push('Shown with a halide counter-ion; with HBF₄ the ArN₂⁺ BF₄⁻ salt precipitates. Heat the dry salt for the Balz–Schiemann fluorination.');
      }
    } else {
      return;
    }
    if (!pre && ctx.temperature > 10 && o.id !== 'diazonium-phenol' && o.id !== 'balz-schiemann') {
      o.warnings.push('Diazotise at 0–5 °C: warm aryl diazonium salts lose N₂ and give phenols.');
    }
    out.push(o);
  });
  return out;
}

function rxyRuleMannich(ctx) {
  const fm = ctx.substrates.map((s) => ({ s, c: s.info.carbonyls.find((c) => c.kind === 'aldehyde' && rxCarbonNeighbors(s.graph, c.c).length === 0) })).find((x) => x.c);
  if (!fm) {
    return [];
  }
  const amine = ctx.substrates.filter((s) => s !== fm.s).flatMap((s) => s.info.amines.map((a) => ({ s, a })))
    .sort((p, q) => p.a.h - q.a.h)[0];
  const ketone = amine && ctx.substrates.filter((s) => s !== fm.s && s !== amine.s).flatMap((s) => rxxOxoCarbonyls(s).filter((c) => rxAlphaCarbons(s.graph, c.c).length).map((c) => ({ s, c })))[0];
  if (!ketone) {
    return [];
  }
  const { g, map } = rxxJoin(ketone.s, fm.s);
  const amap = rxMerge(g, amine.s.graph, amine.s.graph.atoms.map((a) => a.id));
  const alphas = rxAlphaCarbons(g, ketone.c.c);
  const alpha = alphas[alphas.length - 1];
  const ch2 = map.get(fm.c.c);
  g.removeAtom(map.get(fm.c.o));
  g.addBond(alpha, ch2);
  g.addBond(ch2, amap.get(amine.a.n));
  return [rxOutcome('mannich', 'Mannich reaction', 'Aminoalkylation', g,
    'The amine and formaldehyde condense to an iminium ion (CH₂=NR₂⁺). The enol of the ketone attacks it, so a CH₂–NR₂ group is added at the α-carbon, giving a β-amino ketone (Mannich base).',
    { score: 16, byproducts: ['H₂O'], consumes: [rxUse(ketone.s, 1), rxUse(fm.s, 1), rxUse(amine.s, 1)] })];
}

function rxyRuleCyanide(ctx) {
  const cyanide = ctx.get('cyanide');
  if (!cyanide) {
    return [];
  }
  const acid = ctx.has('strongAcid');
  return ctx.substrates.flatMap((s) => {
    const c = rxxOxoCarbonyls(s)[0];
    if (!c || ctx.substrates.some((x) => x.info.halides.length)) {
      return [];
    }
    const aryl = c.kind === 'aldehyde' && rxCarbonNeighbors(s.graph, c.c).some((n) => s.info.aromatic.atoms.has(n.atom.id));
    if (aryl && !acid) {
      const { g, map } = rxxJoin(s, s);
      rxSetOrder(g, c.c, c.o, 1);
      g.addBond(c.c, map.get(c.c));
      return [rxOutcome('benzoin', 'Benzoin condensation', 'Umpolung (acyl anion)', g,
        'Cyanide adds to one aldehyde; the cyanohydrin anion’s C–H is now acidic, and the resulting carbanion (an acyl anion equivalent) attacks a second aldehyde. Loss of cyanide gives the α-hydroxy ketone.',
        { score: 15, consumes: [rxUse(s, 2), rxUse(cyanide, 0.2)] })];
    }
    const g = rxCloneGraph(s.graph);
    rxSetOrder(g, c.c, c.o, 1);
    const cn = rxAttach(g, 'C', c.c);
    rxAttach(g, 'N', cn.id, 3);
    const out = rxOutcome('cyanohydrin', 'Cyanohydrin formation', 'Nucleophilic addition', g,
      'Cyanide adds to the carbonyl carbon and the alkoxide is protonated by HCN, giving the cyanohydrin; the nitrile can later be hydrolysed to an α-hydroxy acid.',
      { score: acid ? 13 : 11, consumes: [rxUse(s, 1), rxUse(cyanide, 1)] });
    if (!acid) {
      out.warnings.push('Cyanohydrin formation is reversible under basic conditions; add acid (NaCN/HCl, generating HCN — extremely toxic) to trap the product.');
    }
    return [out];
  });
}

function rxyRuleCoreyChaykovsky(ctx) {
  const sulfonium = ctx.has('sulfonium');
  const sulfoxonium = ctx.has('sulfoxonium');
  if (!sulfonium && !sulfoxonium) {
    return [];
  }
  const base = rxxBase(ctx, ['hydride', 'amideBase', 'alkoxide']);
  if (!base) {
    return [rxHint('The sulfur ylide is made by deprotonating the sulfonium salt with a strong base such as NaH or n-BuLi (in DMSO/THF).')];
  }
  return ctx.substrates.flatMap((s) => {
    const enone = sulfoxonium ? rxxEnones(s).find((e) => e.kind === 'ketone') : null;
    const c = rxxOxoCarbonyls(s)[0];
    if (!c) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    if (enone) {
      rxSetOrder(g, enone.alpha, enone.beta, 1);
      const ch2 = rxAttach(g, 'C', enone.alpha);
      g.addBond(ch2.id, enone.beta);
      rxyCleanAlkenes(g);
      return [rxOutcome('corey-chaykovsky-cyclopropane', 'Corey–Chaykovsky cyclopropanation', 'Ylide conjugate addition', g,
        'The stabilised sulfoxonium ylide adds reversibly, so it ends up in the conjugate (1,4) position; the enolate then displaces DMSO intramolecularly to close the cyclopropane.',
        { score: 15, byproducts: ['DMSO', 'the iodide salt'], consumes: [rxUse(s, 1), rxUse(base.entry, 1.1)] })];
    }
    rxSetOrder(g, c.c, c.o, 1);
    const ch2 = rxAttach(g, 'C', c.c);
    g.addBond(ch2.id, c.o);
    return [rxOutcome('corey-chaykovsky', 'Corey–Chaykovsky epoxidation', 'Ylide addition', g,
      'Deprotonation gives the sulfur ylide CH₂=SMe₂. It adds to the C=O, and the alkoxide displaces the neutral sulfide in a 3-exo ring closure — unlike a phosphorus ylide, no C=C is formed; the product is an epoxide.',
      { score: 15, byproducts: [sulfonium ? 'Me₂S' : 'DMSO', 'the iodide salt'], consumes: [rxUse(s, 1), rxUse(ctx.get('sulfonium'), 1.1), rxUse(base.entry, 1.1)] })];
  });
}

function rxyRuleRobinson(ctx) {
  const base = rxxBase(ctx, ['hydroxide', 'alkoxide']);
  if (!base) {
    return [];
  }
  const acc = ctx.substrates.flatMap((s) => rxxEnones(s).filter((e) => e.kind === 'ketone').flatMap((e) => {
    const g = s.graph;
    const cm = s.info.carbonyls.find((c) => c.kind === 'ketone' && g.getBond(e.alpha, c.c));
    const me = rxCarbonNeighbors(g, cm.c, e.alpha).find((n) => rxIsSp3(g, n.atom.id) && rxHydrogens(g, n.atom.id) >= 2);
    return me ? [{ s, e, cm, me: me.atom.id }] : [];
  }))[0];
  const donor = acc && ctx.substrates.filter((s) => s !== acc.s).flatMap((s) => s.info.carbonyls.filter((c) => c.kind === 'ketone').map((c) => ({ s, c, alphas: rxAlphaCarbons(s.graph, c.c) })))
    .find((d) => d.alphas.length);
  if (!donor) {
    return [];
  }
  const { g, map } = rxxJoin(donor.s, acc.s);
  const ca = donor.alphas[donor.alphas.length - 1];
  const beta = map.get(acc.e.beta);
  rxSetOrder(g, map.get(acc.e.alpha), beta, 1);
  g.addBond(ca, beta);
  g.removeAtom(donor.c.o);
  g.addBond(map.get(acc.me), donor.c.c).order = 2;
  rxsDrop(g, ca);
  rxyCleanAlkenes(g);
  const out = rxOutcome('robinson', 'Robinson annulation', 'Michael addition + aldol condensation', g,
    'The enolate of the ketone adds to the β-carbon of the enone (Michael addition). The new 1,5-diketone then undergoes an intramolecular aldol reaction — the methyl ketone enolate attacks the other C=O — and dehydration gives a new six-membered cyclohexenone ring.',
    { score: 16, byproducts: ['H₂O'], consumes: [rxUse(donor.s, 1), rxUse(acc.s, 1), rxUse(base.entry, 0.3)] });
  if (ctx.temperature < 60) {
    out.warnings.push('At room temperature the Michael adduct (1,5-diketone) is often isolated; heating drives the aldol condensation and dehydration.');
  }
  return [out];
}

function rxyRuleHofmannElimination(ctx) {
  if (!ctx.has('hydroxide') && !ctx.has('silverOxide')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const g0 = s.graph;
    const n = g0.atoms.find((a) => a.element === 'N' && a.charge === 1 && rxCarbonNeighbors(g0, a.id).length === 4 && rxIsSp3(g0, a.id));
    if (!n) {
      return [];
    }
    const pairs = rxCarbonNeighbors(g0, n.id).flatMap((na) => rxCarbonNeighbors(g0, na.atom.id).filter((nb) => nb.atom.id !== n.id && rxIsSp3(g0, nb.atom.id) && rxHydrogens(g0, nb.atom.id) > 0)
      .map((nb) => ({ a: na.atom.id, b: nb.atom.id, h: rxHydrogens(g0, nb.atom.id) })));
    if (!pairs.length) {
      return [rxHint('Hofmann elimination needs a β-hydrogen on one of the N-alkyl groups.')];
    }
    const pick = pairs.sort((p, q) => q.h - p.h)[0];
    const g = rxCloneGraph(g0);
    rxSetOrder(g, n.id, pick.a, 0);
    rxSetOrder(g, pick.a, pick.b, 2);
    g.getAtom(n.id).charge = 0;
    rxsDrop(g, pick.a);
    rxsDrop(g, pick.b);
    const out = rxOutcome('hofmann-elimination', 'Hofmann elimination', 'E2 elimination', g,
      'Hydroxide (from Ag₂O/H₂O) removes a β-H as the neutral amine leaves. The bulky, poorly leaving –NR₃⁺ group makes the transition state carbanion-like, so the most accessible, most acidic H is removed and the least substituted (Hofmann) alkene forms.',
      { score: 14, byproducts: ['H₂O'], consumes: [rxUse(s, 1)] });
    if (ctx.temperature < 100) {
      out.warnings.push('Heat the quaternary ammonium hydroxide (100–200 °C) to drive the elimination.');
    }
    return [out];
  });
}

function rxyRuleAmideDehydration(ctx) {
  if (!ctx.has('socl2') && !ctx.has('pocl3') && !ctx.has('dehydrant')) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const amides = rxyPrimaryAmides(s);
    if (!amides.length) {
      return [];
    }
    const g = rxCloneGraph(s.graph);
    amides.forEach((am) => {
      g.removeAtom(am.o);
      rxSetOrder(g, am.c, am.hetero, 3);
    });
    return [rxOutcome('amide-dehydration', 'Amide dehydration → nitrile', 'Dehydration', g,
      'The amide oxygen attacks the electrophilic reagent (SOCl₂, POCl₃ or P₂O₅), turning it into a leaving group; two eliminations remove the N–H protons and the activated oxygen, leaving C≡N.',
      { score: 14, byproducts: ctx.has('socl2') ? ['SO₂', 'HCl'] : ['phosphoric acid derivatives', 'HCl'], consumes: [rxUse(s, 1)] })];
  });
}

function rxyRuleDoubleElimination(ctx) {
  const base = ctx.get('sodamide');
  if (!base) {
    return [];
  }
  return ctx.substrates.flatMap((s) => {
    const g0 = s.graph;
    const byC = new Map();
    s.info.halides.forEach((h) => byC.set(h.c, (byC.get(h.c) || []).concat(h.x)));
    let pick = null;
    byC.forEach((xs, c) => {
      if (pick) {
        return;
      }
      if (xs.length === 2) {
        const nb = rxCarbonNeighbors(g0, c).find((n) => rxIsSp3(g0, n.atom.id) && rxHydrogens(g0, n.atom.id) >= 2);
        if (nb) {
          pick = { xs, a: c, b: nb.atom.id, gem: true };
        }
        return;
      }
      const other = [...byC.keys()].find((d) => d !== c && g0.getBond(c, d) && rxHydrogens(g0, c) > 0 && rxHydrogens(g0, d) > 0);
      if (other) {
        pick = { xs: xs.concat(byC.get(other)[0]), a: c, b: other, gem: false };
      }
    });
    if (!pick) {
      return [];
    }
    const g = rxCloneGraph(g0);
    pick.xs.forEach((x) => g.removeAtom(x));
    rxSetOrder(g, pick.a, pick.b, 3);
    rxsDrop(g, pick.a);
    rxsDrop(g, pick.b);
    const terminal = rxHydrogens(g, pick.a) === 1 || rxHydrogens(g, pick.b) === 1;
    const out = rxOutcome('double-elimination', 'Double dehydrohalogenation → alkyne', 'E2 elimination (×2)', g,
      'NaNH₂ removes HX twice from the ' + (pick.gem ? 'geminal' : 'vicinal') + ' dihalide: the first E2 gives a vinyl halide, and the second, harder elimination needs the very strong amide base to form the C≡C.',
      { score: 15, byproducts: ['NaX', 'NH₃'], consumes: [rxUse(s, 1), rxUse(base, terminal ? 3 : 2)] });
    if (terminal) {
      out.warnings.push('A terminal alkyne is deprotonated by NaNH₂ (a third equivalent is used up); aqueous work-up returns the neutral alkyne.');
    }
    return [out];
  });
}

function rxyBreakAcyl(g, c, hetero) {
  rxSetOrder(g, c, hetero, 0);
  if (rxPathLength(g, hetero, c) === Infinity) {
    rxRemoveBranch(g, hetero, c);
  }
}

function rxyRuleEsterExchange(ctx) {
  const out = [];
  ctx.substrates.forEach((s) => {
    const ester = s.info.carbonyls.find((c) => c.kind === 'ester');
    if (!ester) {
      return;
    }
    const amine = ctx.substrates.filter((x) => x !== s).flatMap((x) => x.info.amines.map((a) => ({ s: x, a })))[0];
    const ammonia = ctx.get('ammonia');
    if (amine || ammonia) {
      const joined = amine ? rxxJoin(s, amine.s) : { g: rxCloneGraph(s.graph), map: new Map() };
      const g = joined.g;
      rxyBreakAcyl(g, ester.c, ester.hetero);
      const n = amine ? joined.map.get(amine.a.n) : g.addAtom('N', g.getAtom(ester.c).x + 30, g.getAtom(ester.c).y).id;
      g.addBond(ester.c, n);
      const o = rxOutcome('aminolysis', 'Ester aminolysis', 'Nucleophilic acyl substitution', g,
        'The amine adds to the ester C=O and the tetrahedral intermediate expels the alkoxide, giving the more stable amide and the alcohol.',
        { score: 11, byproducts: ['the alcohol'], consumes: [rxUse(s, 1), amine ? rxUse(amine.s, 1.5) : rxUse(ammonia, 2)] });
      if (ctx.temperature < 60) {
        o.warnings.push('Esters are only moderately reactive toward amines; heat is usually needed (or use the acid chloride instead).');
      }
      out.push(o);
      return;
    }
    const alcohol = ctx.solventNucleophiles.find((n) => n.alcohol);
    const catalyst = ctx.has('strongAcid') ? ctx.get('strongAcid') : ctx.get('alkoxide');
    if (!alcohol || !catalyst) {
      return;
    }
    const g = rxCloneGraph(s.graph);
    rxyBreakAcyl(g, ester.c, ester.hetero);
    const map = rxMerge(g, alcohol.graph, alcohol.graph.atoms.map((a) => a.id));
    g.addBond(ester.c, map.get(alcohol.atom));
    if (rxySmiles(g) === rxySmiles(s.graph)) {
      return;
    }
    out.push(rxOutcome('transesterification', 'Transesterification', 'Nucleophilic acyl substitution', g,
      'The solvent alcohol, in large excess, adds to the ' + (ctx.has('strongAcid') ? 'protonated ' : '') + 'ester C=O and the original alkoxy group leaves; because every step is reversible, the excess alcohol pushes the equilibrium to the new ester.',
      { score: 12, byproducts: ['the displaced alcohol'], consumes: [rxUse(s, 1)] }));
  });
  return out;
}

RX_RULES.push(
  { id: 'beckmann', name: 'Beckmann rearrangement', run: rxyRuleBeckmann },
  { id: 'hofmann-rearrangement', name: 'Hofmann rearrangement', run: rxyRuleHofmannRearrangement },
  { id: 'pinacol', name: 'Pinacol rearrangement', run: rxyRulePinacol },
  { id: 'haloform', name: 'Haloform reaction', run: rxyRuleHaloform },
  { id: 'alpha-halogenation', name: 'Acid-catalysed α-halogenation', run: rxyRuleAlphaHalogenation },
  { id: 'hvz', name: 'Hell–Volhard–Zelinsky', run: rxyRuleHvz },
  { id: 'periodate', name: 'Periodate diol cleavage', run: rxyRulePeriodate },
  { id: 'wacker', name: 'Wacker oxidation', run: rxyRuleWacker },
  { id: 'mild-oxidants', name: 'Pinnick, MnO₂, Tollens and TEMPO oxidations', run: rxyRuleMildOxidants },
  { id: 'luche', name: 'Luche reduction', run: rxyRuleLuche },
  { id: 'nitro-reduction', name: 'Nitro group reduction', run: rxyRuleNitroReduction },
  { id: 'birch', name: 'Birch reduction', run: rxyRuleBirch },
  { id: 'gilman', name: 'Gilman cuprates', run: rxyRuleGilman },
  { id: 'grignard-formation', name: 'Grignard reagent formation', run: rxyRuleGrignardFormation },
  { id: 'reformatsky', name: 'Reformatsky reaction', run: rxyRuleReformatsky },
  { id: 'mitsunobu', name: 'Mitsunobu reaction', run: rxyRuleMitsunobu },
  { id: 'sulfonylation', name: 'Tosylation, mesylation and sulfonamides', run: rxyRuleSulfonylation },
  { id: 'sigmatropic', name: 'Claisen and Cope rearrangements', run: rxyRuleSigmatropic },
  { id: 'paal-knorr', name: 'Paal–Knorr pyrrole and furan synthesis', run: rxyRulePaalKnorr },
  { id: 'halolactonization', name: 'Iodo- and bromolactonisation', run: rxyRuleHalolactonization },
  { id: 'snar', name: 'Nucleophilic aromatic substitution', run: rxyRuleSnar },
  { id: 'diazonium', name: 'Diazotisation, Sandmeyer and azo coupling', run: rxyRuleDiazonium },
  { id: 'mannich', name: 'Mannich reaction', run: rxyRuleMannich },
  { id: 'cyanide-carbonyl', name: 'Cyanohydrin and benzoin', run: rxyRuleCyanide },
  { id: 'corey-chaykovsky', name: 'Corey–Chaykovsky reaction', run: rxyRuleCoreyChaykovsky },
  { id: 'robinson', name: 'Robinson annulation', run: rxyRuleRobinson },
  { id: 'hofmann-elimination', name: 'Hofmann elimination', run: rxyRuleHofmannElimination },
  { id: 'amide-dehydration', name: 'Amide dehydration', run: rxyRuleAmideDehydration },
  { id: 'double-elimination', name: 'Alkyne from dihalide', run: rxyRuleDoubleElimination },
  { id: 'ester-exchange', name: 'Ester aminolysis and transesterification', run: rxyRuleEsterExchange },
);
