Object.assign(RX_FORMULA_TAGS, {
  HNO3: 'nitricAcid', O3S: 'sulfurTrioxide', C15H11ClO2: 'fmocReagent', C19H15NO5: 'fmocReagent', C8H7ClO2: 'cbzReagent',
  C8H9ClO: 'pmbChloride', C16H19ClSi: 'silylChloride', C8Cl2N2O2: 'ddq', C4H10N2Si: 'tmsDiazomethane',
});

Object.assign(RX_FORMULA_GUARDS, {
  C15H11ClO2: (g, ids) => Boolean(rxzChloroformate(g, ids)),
  C19H15NO5: (g, ids) => Boolean(rxzChloroformate(g, ids)),
  C8H7ClO2: (g, ids) => Boolean(rxzChloroformate(g, ids)),
  C8H9ClO: (g, ids) => ids.some((id) => g.getAtom(id).element === 'C' && rxHydrogens(g, id) === 2 && rxNeighbors(g, id).some((n) => n.atom.element === 'Cl') &&
    rxNeighbors(g, id).some((n) => rxAromaticRings(g).atoms.has(n.atom.id))),
  C16H19ClSi: (g, ids) => ids.some((id) => g.getAtom(id).element === 'Si' && rxNeighbors(g, id).some((n) => n.atom.element === 'Cl')),
  O3S: (g, ids) => ids.some((id) => g.getAtom(id).element === 'S'),
});

Object.assign(RX_ADDITIVE_TAGS, {
  h2so4: ['sulfuricAcid'], so3: ['sulfurTrioxide'], h3po2: ['hypophosphorous'], can: ['can'],
});

function rxzChloroformate(g, ids) {
  const set = new Set(ids);
  for (const id of ids) {
    const c = g.getAtom(id);
    if (c.element !== 'C') {
      continue;
    }
    const n = rxNeighbors(g, id);
    const oxo = n.find((x) => x.atom.element === 'O' && x.bond.order === 2);
    const ether = n.find((x) => x.atom.element === 'O' && x.bond.order === 1 && rxNeighbors(g, x.atom.id).some((m) => m.atom.id !== id && m.atom.element === 'C'));
    const leaving = n.find((x) => x.bond.order === 1 && (x.atom.element === 'Cl' || (x.atom.element === 'O' && x.atom.id !== (ether && ether.atom.id) &&
      rxNeighbors(g, x.atom.id).some((m) => m.atom.element === 'N'))));
    if (oxo && ether && leaving && set.has(leaving.atom.id)) {
      return { c: id, ether: ether.atom.id, leaving: leaving.atom.id };
    }
  }
  return null;
}

function rxzSulfuric(ctx) {
  return ctx.has('sulfuricAcid') || [...ctx.species.values()].some((v) => v && v.formula === 'H2O4S');
}

function rxzAmineBase(ctx) {
  return (ctx.conditions.additives || []).some((id) => ['piperidine', 'dbu'].includes(id)) || [...ctx.species.values()].some((v) => v && v.formula === 'C9H16N2');
}

function rxzAcids(s) {
  return s.info.carbonyls.filter((c) => c.kind === 'acid');
}

function rxzTertButylEsters(s) {
  const g = s.graph;
  return s.info.carbonyls.flatMap((c) => {
    const n = rxNeighbors(g, c.c);
    if (n.some((x) => x.atom.element === 'N')) {
      return [];
    }
    const o = n.find((x) => x.atom.element === 'O' && x.bond.order === 1);
    const t = o ? rxCarbonNeighbors(g, o.atom.id).find((x) => x.atom.id !== c.c && rxCarbonNeighbors(g, x.atom.id).length === 3 &&
      rxCarbonNeighbors(g, x.atom.id).every((m) => rxNeighbors(g, m.atom.id).length === 1)) : null;
    return t ? [{ c: c.c, o: o.atom.id, t: t.atom.id }] : [];
  });
}

function rxzCarbamates(s) {
  const g = s.graph;
  const aro = s.info.aromatic.atoms;
  return s.info.carbonyls.flatMap((c) => {
    const n = rxNeighbors(g, c.c).find((x) => x.atom.element === 'N' && x.bond.order === 1);
    const o = rxNeighbors(g, c.c).find((x) => x.atom.element === 'O' && x.bond.order === 1);
    if (!n || !o) {
      return [];
    }
    const ch2 = rxCarbonNeighbors(g, o.atom.id).find((x) => x.atom.id !== c.c && rxHydrogens(g, x.atom.id) === 2);
    if (!ch2) {
      return [];
    }
    const next = rxCarbonNeighbors(g, ch2.atom.id).filter((x) => x.atom.id !== o.atom.id);
    const fluorenyl = next.find((x) => rxHydrogens(g, x.atom.id) === 1 && rxCarbonNeighbors(g, x.atom.id).filter((m) => aro.has(m.atom.id)).length === 2);
    const benzyl = next.find((x) => aro.has(x.atom.id));
    const kind = fluorenyl ? 'Fmoc' : benzyl ? 'Cbz' : null;
    return kind ? [{ kind, c: c.c, n: n.atom.id }] : [];
  });
}

function rxzPmbEthers(s) {
  const g = s.graph;
  const aro = s.info.aromatic.atoms;
  const methoxy = (ring) => ring.some((id) => rxNeighbors(g, id).some((n) => n.atom.element === 'O' && rxNeighbors(g, n.atom.id).some((m) => m.atom.id !== id &&
    m.atom.element === 'C' && rxNeighbors(g, m.atom.id).length === 1)));
  return g.atoms.flatMap((a) => {
    if (a.element !== 'C' || aro.has(a.id) || rxHydrogens(g, a.id) !== 2) {
      return [];
    }
    const aryl = rxNeighbors(g, a.id).find((n) => aro.has(n.atom.id));
    const o = rxNeighbors(g, a.id).find((n) => n.atom.element === 'O' && n.bond.order === 1);
    if (!aryl || !o || rxNeighbors(g, o.atom.id).length !== 2) {
      return [];
    }
    const other = rxNeighbors(g, o.atom.id).find((n) => n.atom.id !== a.id);
    const ring = s.info.aromatic.rings.find((r) => r.includes(aryl.atom.id));
    if (other.atom.element !== 'C' || rxNeighbors(g, other.atom.id).some((m) => m.bond.order === 2 && m.atom.element === 'O') || !ring || !methoxy(ring)) {
      return [];
    }
    return [{ ch2: a.id, o: o.atom.id }];
  });
}

function rxzSulfonicAcids(s) {
  const g = s.graph;
  return g.atoms.filter((a) => a.element === 'S').flatMap((sAtom) => {
    const n = rxNeighbors(g, sAtom.id);
    const ring = n.find((x) => x.atom.element === 'C' && s.info.aromatic.atoms.has(x.atom.id));
    const oxo = n.filter((x) => x.atom.element === 'O' && x.bond.order === 2).length;
    const oh = n.filter((x) => x.atom.element === 'O' && x.bond.order === 1 && rxHydrogens(g, x.atom.id) === 1).length;
    return ring && oxo === 2 && oh === 1 && n.length === 4 ? [{ s: sAtom.id, c: ring.atom.id }] : [];
  });
}

function rxzEasProducts(s, pos, attach) {
  const g = rxCloneGraph(s.graph);
  attach(g, pos.atom);
  const out = { g, minor: [], ratio: null };
  if (pos.minorAtom) {
    const other = rxCloneGraph(s.graph);
    attach(other, pos.minorAtom);
    out.minor = rxProductList(other);
    out.ratio = pos.ratio;
  }
  return out;
}

function rxzAttachNitro(g, id) {
  const n = rxAttach(g, 'N', id);
  rxAttach(g, 'O', n.id, 2);
  rxAttach(g, 'O', n.id, 2);
}

function rxzAttachSulfo(g, id) {
  const sAtom = rxAttach(g, 'S', id);
  rxAttach(g, 'O', sAtom.id, 2);
  rxAttach(g, 'O', sAtom.id, 2);
  rxAttach(g, 'O', sAtom.id);
}

function rxzRuleNitration(ctx) {
  if (!ctx.has('nitricAcid')) {
    return [];
  }
  const arenes = ctx.substrates.filter((s) => s.info.aromatic.rings.length);
  if (!arenes.length) {
    return [];
  }
  if (!rxzSulfuric(ctx)) {
    return [rxHint('Nitric acid alone nitrates benzene rings only slowly — add concentrated H₂SO₄ (mixed acid) to generate the nitronium ion NO₂⁺.')];
  }
  const out = [];
  arenes.forEach((s) => {
    const pos = rxaEasPlan(s, { protonate: true });
    if (!pos.atom) {
      return;
    }
    if (pos.deficient && !pos.activated) {
      out.push(rxHint('π-Deficient rings (pyridine-type N) are protonated by mixed acid and resist nitration; only forcing conditions give low yields.'));
      return;
    }
    const made = rxzEasProducts(s, pos, rxzAttachNitro);
    const res = rxOutcome('nitration', 'Aromatic nitration', 'Electrophilic aromatic substitution', made.g,
      'H₂SO₄ protonates HNO₃, which loses water to give the nitronium ion NO₂⁺. The ring attacks NO₂⁺ to form an arenium ion, and loss of H⁺ restores aromaticity. ' + pos.note,
      { score: pos.deactivated ? 11 : 13, byproducts: ['H₂O'], consumes: [rxUse(s, 1), rxUse(ctx.get('nitricAcid'), 1)], minor: made.minor });
    if (made.ratio) {
      res.ratio = made.ratio;
    }
    const g = s.graph;
    const phenol = rxxPhenols(s).length > 0;
    const aniline = rxyAnilines(s).length > 0 || g.atoms.some((a) => a.element === 'N' && !a.charge && rxHydrogens(g, a.id) > 0 &&
      rxNeighbors(g, a.id).some((n) => s.info.aromatic.atoms.has(n.atom.id)) && rxNeighbors(g, a.id).every((n) => !s.info.carbonyls.some((c) => c.c === n.atom.id)));
    if (pos.deactivated) {
      res.warnings.push('The ring is deactivated: nitration is slow and needs forcing conditions (fuming HNO₃, heat).');
    } else {
      res.warnings.push('Keep the mixture cool (below about 50 °C) to stop at mononitration; a second nitration is not shown.');
    }
    if (phenol) {
      res.warnings.push('Phenols are oxidised by mixed acid and over-nitrate (to picric acid); use dilute HNO₃ in the cold instead.');
    }
    if (aniline) {
      res.warnings.push('In mixed acid the amine is protonated to an anilinium ion, a meta director, and the ring is also oxidised; acetylate to the acetanilide first, nitrate, then hydrolyse.');
    }
    out.push(res);
  });
  return out;
}

function rxzRuleSulfonation(ctx) {
  const out = [];
  if (ctx.has('sulfurTrioxide')) {
    ctx.substrates.filter((s) => s.info.aromatic.rings.length).forEach((s) => {
      const pos = rxaEasPlan(s, { protonate: true });
      if (!pos.atom || (pos.deficient && !pos.activated)) {
        return;
      }
      const made = rxzEasProducts(s, pos, rxzAttachSulfo);
      const res = rxOutcome('sulfonation', 'Aromatic sulfonation', 'Electrophilic aromatic substitution', made.g,
        'SO₃ (in fuming H₂SO₄, or as HSO₃⁺) is the electrophile. The ring attacks sulfur to form an arenium ion, and loss of H⁺ gives the arenesulfonic acid. Unlike most EAS reactions, sulfonation is reversible. ' + pos.note,
        { score: pos.deactivated ? 11 : 13, consumes: [rxUse(s, 1)], minor: made.minor });
      if (made.ratio) {
        res.ratio = made.ratio;
      }
      if (pos.deactivated) {
        res.warnings.push('The ring is deactivated: sulfonation needs hot oleum and is slow.');
      }
      out.push(res);
    });
    return out;
  }
  if (ctx.has('strongAcid') && rxxWater(ctx)) {
    ctx.substrates.forEach((s) => {
      const hit = rxzSulfonicAcids(s)[0];
      if (!hit) {
        return;
      }
      if (ctx.temperature < 100) {
        out.push(rxHint('Desulfonation needs dilute aqueous acid at 100 °C or above (steam).'));
        return;
      }
      const g = rxCloneGraph(s.graph);
      rxRemoveBranch(g, hit.s, hit.c);
      out.push(rxOutcome('desulfonation', 'Desulfonation', 'Electrophilic aromatic substitution (reverse)', g,
        'Sulfonation is reversible: in hot dilute aqueous acid the ring is protonated at the carbon bearing SO₃H and SO₃ is lost, giving back the arene. This lets SO₃H serve as a removable blocking group.',
        { score: 14, byproducts: ['H₂SO₄'], consumes: [rxUse(s, 1)] }));
    });
  }
  return out;
}

function rxzAcylate(ctx, hit, reagent) {
  const g = rxCloneGraph(hit.s.graph);
  const map = rxMerge(g, reagent.graph, reagent.ids);
  const cf = rxzChloroformate(reagent.graph, reagent.ids);
  rxRemoveBranch(g, map.get(cf.leaving), map.get(cf.c));
  g.addBond(hit.a.n, map.get(cf.c));
  return { g, osu: reagent.graph.getAtom(cf.leaving).element === 'O' };
}

function rxzRuleCarbamates(ctx) {
  const out = [];
  const base = rxxBase(ctx, ['weakBase', 'hydroxide', 'amineBase']);
  [['fmocReagent', 'Fmoc', 'fmoc-protection'], ['cbzReagent', 'Cbz', 'cbz-protection']].forEach(([tag, label, id]) => {
    const reagent = ctx.get(tag);
    if (!reagent || !reagent.graph) {
      return;
    }
    const hit = ctx.substrates.map((s) => ({ s, a: s.info.amines.slice().sort((p, q) => q.h - p.h)[0] })).find((x) => x.a);
    if (!hit) {
      return;
    }
    const made = rxzAcylate(ctx, hit, reagent);
    const o = rxOutcome(id, label + ' protection', 'Protecting group (N)', made.g,
      'The amine attacks the carbonyl of ' + (label === 'Fmoc' ? (made.osu ? 'Fmoc-OSu' : 'Fmoc-Cl') : 'benzyl chloroformate (CbzCl)') + ' and the leaving group is expelled, giving the carbamate. ' +
        (label === 'Fmoc' ? 'The Fmoc group is stable to acid and is removed by a secondary amine base (piperidine).' : 'The Cbz group is stable to mild acid and base, and is removed by hydrogenolysis (H₂, Pd/C).'),
      { score: 15, byproducts: [made.osu ? 'N-hydroxysuccinimide' : 'HCl (as its salt with the base)'], consumes: [rxUse(hit.s, 1), rxUse(reagent, 1.1)] });
    if (!base && !made.osu) {
      o.warnings.push('Add a base (NaHCO₃, Na₂CO₃ or Et₃N) to take up the HCl, otherwise half the amine is lost as its hydrochloride.');
    }
    out.push(o);
  });
  const secondary = ctx.substrates.some((s) => s.info.amines.some((a) => a.h === 1 && !rxzCarbamates(s).length));
  if (rxzAmineBase(ctx) || secondary) {
    ctx.substrates.forEach((s) => {
      const hit = rxzCarbamates(s).find((x) => x.kind === 'Fmoc');
      if (!hit) {
        return;
      }
      const g = rxCloneGraph(s.graph);
      rxRemoveBranch(g, hit.c, hit.n);
      out.push(rxOutcome('fmoc-deprotection', 'Fmoc deprotection', 'Protecting group removal (E1cB)', g,
        'The amine base removes the acidic fluorenyl C9–H; E1cB elimination releases dibenzofulvene and the carbamate anion, which loses CO₂ to give the free amine. Excess piperidine traps the dibenzofulvene.',
        { score: 15, byproducts: ['dibenzofulvene (as its piperidine adduct)', 'CO₂'], consumes: [rxUse(s, 1)] }));
    });
  }
  return out;
}

function rxzRuleEthers(ctx) {
  const out = [];
  const pmb = ctx.get('pmbChloride');
  if (pmb && pmb.graph) {
    const strong = rxxBase(ctx, ['hydride']);
    const weak = rxxBase(ctx, ['weakBase', 'hydroxide']);
    const donors = ctx.substrates.flatMap((s) => (strong ? s.info.alcohols.slice().sort((p, q) => p.degree - q.degree).map((a) => ({ s, o: a.o, phenol: false })) : [])
      .concat(strong || weak ? rxxPhenols(s).map((p) => ({ s, o: p.o, phenol: true })) : []));
    const d = donors[0];
    if (d) {
      const g = rxCloneGraph(d.s.graph);
      const map = rxMerge(g, pmb.graph, pmb.ids);
      const cl = pmb.ids.find((id) => pmb.graph.getAtom(id).element === 'Cl');
      const ch2 = rxNeighbors(pmb.graph, cl)[0].atom.id;
      g.removeAtom(map.get(cl));
      g.addBond(d.o, map.get(ch2));
      const o = rxOutcome('pmb-protection', 'PMB protection', 'Protecting group (O)', g,
        (d.phenol ? 'The base deprotonates the phenol' : 'NaH deprotonates the alcohol (H₂ is released)') +
          ' and the alkoxide displaces chloride from 4-methoxybenzyl chloride (Sₙ2). The PMB ether is stable to base and mild acid and is removed oxidatively with DDQ or CAN, or by hydrogenolysis.',
        { score: 15, byproducts: [strong ? 'H₂' : 'H₂O / HCO₃⁻', 'the metal chloride'], consumes: [rxUse(d.s, 1), rxUse(pmb, 1.1), rxUse((strong || weak).entry, 1)] });
      if (!ctx.polarAprotic) {
        o.warnings.push('Run the alkylation in DMF or THF; a catalytic iodide (TBAI) speeds it up.');
      }
      out.push(o);
    }
  }
  if (ctx.has('ddq') || ctx.has('can')) {
    const reagent = ctx.has('ddq') ? 'DDQ' : 'CAN';
    ctx.substrates.forEach((s) => {
      const hit = rxzPmbEthers(s)[0];
      if (!hit) {
        return;
      }
      const g = rxCloneGraph(s.graph);
      rxRemoveBranch(g, hit.ch2, hit.o);
      const o = rxOutcome('pmb-deprotection', 'PMB removal (' + reagent + ')', 'Protecting group removal (oxidative)', g,
        reagent + ' oxidises the electron-rich 4-methoxybenzyl group by single-electron transfer to a stabilised benzylic cation; water adds to give a hemiacetal that falls apart to 4-methoxybenzaldehyde and the free alcohol. Plain benzyl ethers survive these conditions.',
        { score: 15, byproducts: ['4-methoxybenzaldehyde', reagent === 'DDQ' ? 'DDQH₂' : 'Ce(III) salts'], consumes: [rxUse(s, 1), rxUse(ctx.get(reagent === 'DDQ' ? 'ddq' : 'can'), 1)] });
      if (!rxxWater(ctx)) {
        o.warnings.push('Add a little water (CH₂Cl₂/H₂O, about 18:1): water is needed to hydrolyse the oxocarbenium intermediate.');
      }
      out.push(o);
    });
  }
  return out;
}

function rxzIsobutylene(s) {
  const g = s.graph;
  if (g.atoms.length !== 4) {
    return null;
  }
  const e = s.info.alkenes.find((x) => [x.a, x.b].some((id) => rxCarbonNeighbors(g, id).length === 3));
  if (!e) {
    return null;
  }
  const t = rxCarbonNeighbors(g, e.a).length === 3 ? e.a : e.b;
  return { t, ch2: t === e.a ? e.b : e.a };
}

function rxzRuleEsters(ctx) {
  const out = [];
  const acids = ctx.substrates.flatMap((s) => rxzAcids(s).map((c) => ({ s, c })));
  const iso = ctx.substrates.map((s) => ({ s, e: rxzIsobutylene(s) })).find((x) => x.e);
  const acid = acids.find((x) => !iso || x.s !== iso.s);
  if (acid && iso && ctx.has('strongAcid')) {
    const { g, map } = rxxJoin(acid.s, iso.s);
    rxSetOrder(g, map.get(iso.e.t), map.get(iso.e.ch2), 1);
    rxyCleanAlkenes(g);
    g.addBond(acid.c.hetero, map.get(iso.e.t));
    out.push(rxOutcome('tbu-ester', 'tert-Butyl ester formation', 'Protecting group (CO₂H)', g,
      'Acid protonates isobutylene to the tert-butyl cation, which the carboxylic acid captures. The tert-butyl ester survives base and nucleophiles and comes off with TFA.',
      { score: 15, consumes: [rxUse(acid.s, 1), rxUse(iso.s, 1)], warnings: ['Use excess isobutylene in a sealed vessel (bp −7 °C).'] }));
  }
  const boc = ctx.get('boc2o');
  if (acid && boc && !iso && ctx.has('dmap') && !ctx.substrates.some((s) => s.info.amines.length)) {
    const g = rxCloneGraph(acid.s.graph);
    const t = rxAttach(g, 'C', acid.c.hetero);
    [0, 1, 2].forEach(() => rxAttach(g, 'C', t.id));
    out.push(rxOutcome('tbu-ester', 'tert-Butyl ester formation (Boc₂O/DMAP)', 'Protecting group (CO₂H)', g,
      'DMAP-catalysed attack of the carboxylate on Boc₂O gives a mixed anhydride; tert-butoxide (from the collapsing carbonate) then acylates at the carbonyl, releasing CO₂ and giving the tert-butyl ester.',
      { score: 15, byproducts: ['CO₂', 'tert-butanol'], consumes: [rxUse(acid.s, 1), rxUse(boc, 1.5)] }));
  }
  const tms = ctx.get('tmsDiazomethane');
  if (acid && tms) {
    const g = rxCloneGraph(acid.s.graph);
    rxAttach(g, 'C', acid.c.hetero);
    const o = rxOutcome('methyl-ester', 'Methyl ester formation (TMSCHN₂)', 'Protecting group (CO₂H)', g,
      'Methanol releases diazomethane from TMSCHN₂; the acid protonates it to the methyldiazonium ion, and the carboxylate attacks the methyl group with loss of N₂.',
      { score: 15, byproducts: ['N₂', 'TMSOMe'], consumes: [rxUse(acid.s, 1), rxUse(tms, 1.2)] });
    if (!ctx.solventNucleophiles.some((n) => n.name === 'CO')) {
      o.warnings.push('Run it in MeOH (or toluene/MeOH): methanol is needed to release the reactive diazomethane.');
    }
    out.push(o);
  }
  const weak = rxxBase(ctx, ['weakBase']);
  const methyl = ctx.substrates.flatMap((s) => s.info.halides.filter((h) => h.degree === 0 && h.halogen !== 'Cl').map((h) => ({ s, h })))[0];
  if (acid && weak && methyl && methyl.s !== acid.s && !tms) {
    const g = rxCloneGraph(acid.s.graph);
    rxAttach(g, 'C', acid.c.hetero);
    const o = rxOutcome('methyl-ester', 'Methyl ester formation (MeI/K₂CO₃)', 'Substitution (Sₙ2)', g,
      'The carbonate deprotonates the acid; the carboxylate displaces iodide from methyl iodide by Sₙ2, giving the methyl ester without touching acid-sensitive groups.',
      { score: 15, byproducts: ['KI', 'KHCO₃'], consumes: [rxUse(acid.s, 1), rxUse(methyl.s, 1.5), rxUse(weak.entry, 1)] });
    if (!ctx.polarAprotic) {
      o.warnings.push('Use DMF or acetone as the solvent for the Sₙ2 step.');
    }
    out.push(o);
  }
  if (ctx.has('strongAcid') && !iso) {
    ctx.substrates.forEach((s) => {
      const esters = rxzTertButylEsters(s);
      if (!esters.length) {
        return;
      }
      const g = rxCloneGraph(s.graph);
      esters.forEach((e) => rxRemoveBranch(g, e.t, e.o));
      const boc = rxxBocCarbonyl(s);
      if (boc) {
        rxRemoveBranch(g, boc.c, boc.n);
      }
      const o = rxOutcome('tbu-ester-deprotection', boc ? 'tert-Butyl ester and Boc removal' : 'tert-Butyl ester cleavage', 'Protecting group removal', g,
        'Acid protonates the ester carbonyl and the tert-butyl group leaves as a stable cation (lost as isobutylene), releasing the free carboxylic acid.' +
          (boc ? ' The Boc carbamate falls apart the same way and loses CO₂, so the amine is freed as well.' : ''),
        { score: boc ? 16 : 15, byproducts: ['isobutylene'].concat(boc ? ['CO₂'] : []), consumes: [rxUse(s, 1)] });
      if (boc) {
        o.warnings.push('TFA cleaves both the tert-butyl ester and the Boc group; they cannot be removed selectively with acid, so both are shown removed.');
      }
      out.push(o);
    });
  }
  return out;
}

RX_RULES.push(
  { id: 'nitration', name: 'Aromatic nitration (HNO₃/H₂SO₄)', run: rxzRuleNitration },
  { id: 'sulfonation', name: 'Aromatic sulfonation and desulfonation', run: rxzRuleSulfonation },
  { id: 'carbamate-protection', name: 'Fmoc and Cbz carbamates', run: rxzRuleCarbamates },
  { id: 'pmb-protection', name: 'PMB ethers (install, DDQ/CAN removal)', run: rxzRuleEthers },
  { id: 'ester-protection', name: 'tert-Butyl and methyl esters', run: rxzRuleEsters },
);
