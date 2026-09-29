const ISOTOPES = {
  H: [[1.00782503, 0.999885], [2.01410178, 0.000115]],
  D: [[2.01410178, 1]],
  C: [[12, 0.9893], [13.00335484, 0.0107]],
  N: [[14.003074, 0.99636], [15.0001089, 0.00364]],
  O: [[15.9949146, 0.99757], [16.9991317, 0.00038], [17.999161, 0.00205]],
  F: [[18.9984032, 1]],
  Si: [[27.9769265, 0.92223], [28.9764947, 0.04685], [29.9737702, 0.03092]],
  P: [[30.973762, 1]],
  S: [[31.9720707, 0.9499], [32.9714585, 0.0075], [33.9678669, 0.0425], [35.9670808, 0.0001]],
  Cl: [[34.9688527, 0.7576], [36.9659026, 0.2424]],
  Br: [[78.9183376, 0.5069], [80.9162897, 0.4931]],
  I: [[126.904473, 1]],
  B: [[10.012937, 0.199], [11.0093054, 0.801]],
  Se: [[73.9224764, 0.0089], [75.9192136, 0.0937], [76.919914, 0.0763], [77.9173091, 0.2377], [79.9165213, 0.4961], [81.9166994, 0.0873]],
};

const MS_HILL_ORDER = (a, b) => {
  const rank = (e) => (e === 'C' ? 0 : e === 'H' ? 1 : e === 'D' ? 2 : 3);
  return rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0);
};

function msElementIsotopes(el) {
  if (ISOTOPES[el]) {
    return ISOTOPES[el];
  }
  const mono = typeof MONO_MASS !== 'undefined' && MONO_MASS[el] ? MONO_MASS[el] : 0;
  return [[mono, 1]];
}

function msMainMass(el) {
  const list = msElementIsotopes(el);
  return list.reduce((best, x) => (x[1] > best[1] ? x : best), list[0])[0];
}

function msConvolve(a, b, threshold) {
  const out = new Map();
  a.forEach((pa, ka) => {
    b.forEach((pb, kb) => {
      const k = ka + kb;
      const p = pa.p * pb.p;
      const cur = out.get(k) || { p: 0, m: 0 };
      cur.m = (cur.m * cur.p + (pa.m + pb.m) * p) / (cur.p + p);
      cur.p += p;
      out.set(k, cur);
    });
  });
  let max = 0;
  out.forEach((v) => { max = Math.max(max, v.p); });
  out.forEach((v, k) => {
    if (v.p < max * threshold * 0.01) {
      out.delete(k);
    }
  });
  return out;
}

function isotopePattern(formulaCounts, options) {
  const threshold = options && options.threshold !== undefined ? options.threshold : 0.001;
  let dist = new Map([[0, { p: 1, m: 0 }]]);
  Object.keys(formulaCounts).forEach((el) => {
    const n = formulaCounts[el];
    if (!n) {
      return;
    }
    const single = new Map();
    msElementIsotopes(el).forEach(([mass, ab]) => {
      const k = Math.round(mass);
      single.set(k, { p: ab, m: mass });
    });
    let power = single;
    let count = n;
    let acc = null;
    while (count > 0) {
      if (count & 1) {
        acc = acc ? msConvolve(acc, power, threshold) : power;
      }
      count >>= 1;
      if (count > 0) {
        power = msConvolve(power, power, threshold);
      }
    }
    dist = msConvolve(dist, acc, threshold);
  });
  let max = 0;
  dist.forEach((v) => { max = Math.max(max, v.p); });
  const out = [];
  dist.forEach((v, k) => {
    const abundance = (100 * v.p) / max;
    if (abundance >= threshold * 100) {
      out.push({ mz: k, mass: v.m, abundance });
    }
  });
  out.sort((a, b) => a.mz - b.mz);
  return out;
}

function msFormulaString(counts) {
  return Object.keys(counts).filter((e) => counts[e] > 0).sort(MS_HILL_ORDER).map((e) => e + (counts[e] > 1 ? counts[e] : '')).join('');
}

function msNominal(counts) {
  return Object.keys(counts).reduce((sum, e) => sum + Math.round(msMainMass(e)) * counts[e], 0);
}

function predictMassSpectrum(graph, atomIds) {
  const env = spectraEnv(graph, atomIds);
  const heavy = env.heavy;
  const empty = { molecularIon: null, peaks: [], basePeak: null };
  if (heavy.length === 0) {
    return empty;
  }
  const countsOf = (atoms, hDelta) => {
    const c = {};
    atoms.forEach((id) => {
      c[env.el(id)] = (c[env.el(id)] || 0) + 1;
      if (env.h(id)) {
        c.H = (c.H || 0) + env.h(id);
      }
      if (env.dCount.get(id)) {
        c.D = (c.D || 0) + env.dCount.get(id);
      }
    });
    if (hDelta) {
      c.H = (c.H || 0) + hDelta;
    }
    return c;
  };
  const molCounts = countsOf(heavy, 0);
  const M = msNominal(molCounts);
  const side = (keep, cut) => {
    const seen = new Set([keep]);
    const stack = [keep];
    while (stack.length) {
      const a = stack.pop();
      env.nb(a).forEach((n) => {
        if ((a === keep && n.id === cut) || seen.has(n.id)) {
          return;
        }
        seen.add(n.id);
        stack.push(n.id);
      });
    }
    return seen.has(cut) ? null : Array.from(seen);
  };
  const candidates = [];
  const add = (atoms, hDelta, score, rule, label) => {
    if (!atoms || atoms.length === 0 || atoms.length === heavy.length && !hDelta) {
      return;
    }
    const counts = countsOf(atoms, hDelta);
    const mz = msNominal(counts);
    if (mz <= 0 || mz >= M) {
      return;
    }
    const lostCounts = {};
    Object.keys(molCounts).forEach((e) => {
      const d = molCounts[e] - (counts[e] || 0);
      if (d > 0) {
        lostCounts[e] = d;
      }
    });
    candidates.push({ mz, score, rule, label: label + ' ' + msFormulaString(counts) + '⁺', lost: msFormulaString(lostCounts), atoms: atoms.slice(), counts });
  };
  const addMass = (mz, score, rule, label, atoms, counts) => {
    if (mz > 0 && mz < M) {
      candidates.push({ mz, score, rule, label, lost: 'M−' + (M - mz), atoms: atoms.slice(), counts: counts || null });
    }
  };
  const isPureAlkyl = (atoms) => atoms.every((id) => spectraIsSp3Carbon(env, id));
  const alkylScore = (atoms, cutAtom) => {
    const carbonNbrs = env.nb(cutAtom).filter((n) => atoms.includes(n.id)).length;
    let s = carbonNbrs >= 3 ? 60 : carbonNbrs === 2 ? 40 : 20;
    if (atoms.length === 4) {
      s += 15;
    } else if (atoms.length === 3) {
      s += 12;
    }
    return s;
  };
  const isAryl = (id) => env.aromatic(id);
  const ringBond = (a, b) => env.ringBond(a, b);

  heavy.forEach((x) => {
    const e = env.el(x);
    if (!['N', 'O', 'S'].includes(e) || env.nb(x).some((n) => n.order !== 1) || spectraIsNitro(env, x)) {
      return;
    }
    if (env.nb(x).some((n) => spectraIsCarbonyl(env, n.id))) {
      return;
    }
    let base = e === 'N' ? 95 : e === 'S' ? 55 : env.h(x) > 0 ? 70 : 65;
    env.nb(x).forEach((c) => {
      if (!spectraIsSp3Carbon(env, c.id)) {
        return;
      }
      env.nb(c.id).forEach((r) => {
        if (r.id === x || ringBond(c.id, r.id)) {
          return;
        }
        const ion = side(c.id, r.id);
        const lost = ion ? heavy.length - ion.length : 0;
        add(ion, 0, base + Math.min(5, lost), 'alpha-cleavage', 'α-cleavage (' + (e === 'N' ? 'iminium' : e === 'O' ? 'oxonium' : 'sulfonium') + ')');
      });
    });
    if (e === 'O' && env.h(x) === 0) {
      env.nb(x).forEach((c) => {
        if (ringBond(x, c.id)) {
          return;
        }
        const alkyl = side(c.id, x);
        if (alkyl && isPureAlkyl(alkyl)) {
          add(alkyl, 0, alkylScore(alkyl, c.id), 'ether C–O', 'C–O cleavage (alkyl cation)');
        }
      });
    }
  });

  heavy.forEach((c) => {
    if (!spectraIsCarbonyl(env, c)) {
      return;
    }
    const k = spectraCarbonylKind(env, c);
    env.nb(c).forEach((r) => {
      if (r.id === k.oxoId || ringBond(c, r.id)) {
        return;
      }
      const ion = side(c, r.id);
      if (!ion) {
        return;
      }
      const lost = heavy.length - ion.length;
      const re = env.el(r.id);
      const others = env.nb(c).filter((n) => n.id !== r.id && n.id !== k.oxoId);
      const aroyl = others.some((n) => isAryl(n.id));
      let score;
      let label;
      if (re === 'O') {
        score = k.kind === 'acid' ? 40 : 90;
        label = k.kind === 'acid' ? 'loss of OH (acylium)' : 'loss of OR (acylium)';
        if (aroyl && k.kind !== 'acid') {
          score = 100;
        }
      } else if (re === 'N') {
        score = 45;
        label = 'loss of NR₂ (acylium)';
      } else if (isAryl(r.id)) {
        score = 40;
        label = 'α-cleavage, loss of aryl (acylium)';
      } else if (k.kind === 'ester' || k.kind === 'acid' || k.kind === 'amide') {
        score = 25;
        label = 'α-cleavage (acyl side)';
      } else if (!aroyl && lost === 1 && env.el(r.id) === 'C') {
        score = 45;
        label = 'α-cleavage, loss of CH₃• (acylium)';
      } else {
        score = aroyl ? 100 : 85;
        label = aroyl ? 'α-cleavage (aroyl acylium)' : 'α-cleavage (acylium)';
      }
      add(ion, 0, score + Math.min(5, lost), 'carbonyl alpha', label);
      if (aroyl && (score >= 90)) {
        const aryl = others.find((n) => isAryl(n.id));
        const phenyl = side(aryl.id, c);
        if (phenyl) {
          add(phenyl, 0, 70, 'aroyl −CO', 'aroyl loses CO');
        }
      }
    });
    if (k.kind === 'aldehyde') {
      addMass(M - 1, 30, 'aldehyde M−1', 'loss of H• (acylium)', heavy);
    }
    env.nb(c).forEach((a) => {
      if (a.id === k.oxoId || !spectraIsSp3Carbon(env, a.id)) {
        return;
      }
      env.nb(a.id).forEach((b) => {
        if (b.id === c || !spectraIsSp3Carbon(env, b.id) || ringBond(a.id, b.id)) {
          return;
        }
        const hasGammaH = env.nb(b.id).some((g) => g.id !== a.id && spectraIsSp3Carbon(env, g.id) && env.h(g.id) > 0);
        if (!hasGammaH) {
          return;
        }
        const ion = side(a.id, b.id);
        add(ion, 1, 75, 'McLafferty', 'McLafferty rearrangement');
      });
    });
  });

  heavy.forEach((b) => {
    if (!spectraIsSp3Carbon(env, b) || !env.nb(b).some((n) => isAryl(n.id))) {
      return;
    }
    env.nb(b).forEach((r) => {
      if (isAryl(r.id) || ringBond(b, r.id)) {
        return;
      }
      const ion = side(b, r.id);
      if (!ion) {
        return;
      }
      const counts = countsOf(ion, 0);
      const tropylium = msFormulaString(counts) === 'C7H7';
      add(ion, 0, tropylium ? 100 : 85, 'benzylic', tropylium ? 'benzylic cleavage (tropylium)' : 'benzylic cleavage');
    });
    if (env.h(b) > 0) {
      const counts = countsOf(heavy, -1);
      const tropylium = msFormulaString(counts) === 'C7H7';
      add(heavy, -1, tropylium ? 100 : 20, 'benzylic', tropylium ? 'loss of H• (tropylium)' : 'loss of H•');
    }
  });

  heavy.forEach((o) => {
    if (env.el(o) !== 'O' || env.h(o) === 0) {
      return;
    }
    const c = env.nb(o)[0];
    if (!c || !spectraIsSp3Carbon(env, c.id)) {
      return;
    }
    const carbons = molCounts.C || 0;
    const counts = Object.assign({}, molCounts);
    counts.O -= 1;
    counts.H -= 2;
    addMass(M - 18, carbons >= 4 ? 60 : 45, 'dehydration', 'loss of H₂O ' + msFormulaString(counts) + '⁺•', heavy.filter((id) => id !== o), counts);
  });

  heavy.forEach((x) => {
    const e = env.el(x);
    if (!['Cl', 'Br', 'I'].includes(e)) {
      return;
    }
    const c = env.nb(x)[0];
    if (!c) {
      return;
    }
    const ion = side(c.id, x);
    if (!ion) {
      return;
    }
    const tertiary = env.nb(c.id).filter((n) => env.el(n.id) === 'C').length >= 3;
    let score = (e === 'Cl' ? 35 : e === 'Br' ? 55 : 65) + (tertiary ? 20 : 0);
    const counts = countsOf(ion, 0);
    if (isAryl(c.id) && msFormulaString(counts) === 'C6H5') {
      score = 45;
    }
    add(ion, 0, score, 'halogen loss', 'loss of ' + e + '•');
  });

  heavy.forEach((m) => {
    if (!spectraIsSp3Carbon(env, m) || env.h(m) !== 3 || env.nb(m).length !== 1) {
      return;
    }
    const c = env.nb(m)[0].id;
    const branched = env.nb(c).filter((n) => env.el(n.id) === 'C').length >= 3;
    const ion = side(c, m);
    add(ion, 0, branched ? 35 : 10, 'M−15', 'loss of CH₃•');
  });

  heavy.forEach((a) => {
    if (!spectraIsSp3Carbon(env, a)) {
      return;
    }
    env.nb(a).forEach((n) => {
      if (!spectraIsSp3Carbon(env, n.id) || ringBond(a, n.id)) {
        return;
      }
      const ion = side(a, n.id);
      if (ion && isPureAlkyl(ion)) {
        add(ion, 0, alkylScore(ion, a), 'alkyl cation', 'alkyl cation');
      }
    });
  });

  const phenylRings = spectraAromaticRings(env).filter((r) => r.length === 6 && r.every((a) => env.el(a) === 'C') && irOopPattern(env, r) === 'mono');
  if (phenylRings.length) {
    const c = { C: 6, H: 5 };
    addMass(77, 25, 'phenyl', 'phenyl C6H5⁺', phenylRings[0], c);
    addMass(51, 10, 'phenyl', 'C4H3⁺ (from 77)', phenylRings[0], { C: 4, H: 3 });
  }

  heavy.forEach((n) => {
    if (!spectraIsNitro(env, n)) {
      return;
    }
    const os = env.nb(n).filter((x) => env.el(x.id) === 'O').map((x) => x.id);
    const rest = heavy.filter((id) => id !== n && !os.includes(id));
    add(rest, 0, 60, 'nitro', 'loss of NO₂•');
    addMass(M - 30, 20, 'nitro', 'loss of NO', heavy.filter((id) => !os.includes(id)));
  });

  if (candidates.some((x) => x.mz === 91 && x.score >= 100)) {
    addMass(65, 12, 'tropylium', 'C5H5⁺ (tropylium −C2H2)', [], { C: 5, H: 5 });
  }

  const byMz = new Map();
  candidates.forEach((x) => {
    const cur = byMz.get(x.mz);
    if (!cur || x.score > cur.score) {
      byMz.set(x.mz, x);
    }
  });
  const aromatic = heavy.some((id) => env.aromatic(id));
  const hasAlcohol = heavy.some((id) => env.el(id) === 'O' && env.h(id) > 0 && env.nb(id).some((n) => spectraIsSp3Carbon(env, n.id)));
  const hasAmine = heavy.some((id) => env.el(id) === 'N' && env.nb(id).every((n) => n.order === 1) && !env.nb(id).some((n) => spectraIsCarbonyl(env, n.id)) && env.charge(id) === 0);
  const hasEther = heavy.some((id) => env.el(id) === 'O' && env.h(id) === 0 && env.nb(id).length === 2 && env.nb(id).every((n) => n.order === 1));
  const hasCarbonyl = heavy.some((id) => spectraIsCarbonyl(env, id));
  const hydrocarbon = heavy.every((id) => env.el(id) === 'C');
  let best = 0;
  byMz.forEach((v) => { best = Math.max(best, v.score); });
  let mScore;
  if (aromatic) {
    mScore = best < 60 ? 100 : 60;
  } else if (hasAlcohol) {
    mScore = 4;
  } else if (hasAmine) {
    mScore = 15;
  } else if (hasEther) {
    mScore = 12;
  } else if (hasCarbonyl) {
    mScore = 25;
  } else if (heavy.some((id) => SPECTRA_HALOGENS.has(env.el(id)))) {
    mScore = 15;
  } else if (hydrocarbon) {
    mScore = Math.max(8, 35 - 2 * heavy.length);
  } else {
    mScore = 30;
  }
  if (byMz.size === 0) {
    mScore = 100;
  }
  const top = Math.max(mScore, best);
  const bins = new Map();
  const put = (mz, intensity, info) => {
    const cur = bins.get(mz);
    if (cur) {
      cur.intensity += intensity;
      if (info && intensity > cur.own) {
        Object.assign(cur, info, { own: intensity, intensity: cur.intensity });
      }
    } else {
      bins.set(mz, Object.assign({ mz, intensity, own: info ? intensity : 0, label: 'isotope', lost: '', atoms: [], rule: 'isotope' }, info || {}));
    }
  };
  const molPattern = isotopePattern(molCounts, { threshold: 0.001 });
  const mainIdx = molPattern.reduce((bi, p, i) => (p.mz === M ? i : bi), 0);
  const mRel = (100 * mScore) / top;
  molPattern.forEach((p, i) => {
    const intensity = (mRel * p.abundance) / molPattern[mainIdx].abundance;
    const info = i === mainIdx ? { label: 'M⁺• ' + msFormulaString(molCounts), lost: '', atoms: heavy.slice(), rule: 'molecular ion' } : { label: (p.mz > M ? 'M+' + (p.mz - M) : 'M−' + (M - p.mz)) + ' isotope', lost: '', atoms: heavy.slice(), rule: 'isotope' };
    put(p.mz, intensity, info);
  });
  byMz.forEach((x) => {
    const rel = (100 * x.score) / top;
    const info = { label: x.label, lost: x.lost, atoms: x.atoms, rule: x.rule };
    if (x.counts && (x.counts.Cl || x.counts.Br)) {
      const pat = isotopePattern(x.counts, { threshold: 0.001 });
      const main = pat.find((p) => p.mz === x.mz) || pat[0];
      pat.forEach((p) => {
        put(p.mz, (rel * p.abundance) / main.abundance, p.mz === x.mz ? info : { label: 'isotope of ' + x.mz, lost: x.lost, atoms: x.atoms, rule: 'isotope' });
      });
    } else {
      put(x.mz, rel, info);
    }
  });
  let peaks = Array.from(bins.values()).map((p) => ({ mz: p.mz, intensity: p.intensity, label: p.label, lost: p.lost, atoms: p.atoms, rule: p.rule }));
  const maxI = peaks.reduce((m, p) => Math.max(m, p.intensity), 0) || 1;
  peaks.forEach((p) => { p.intensity = Math.round((1000 * p.intensity) / maxI) / 10; });
  peaks = peaks.filter((p) => p.intensity >= 0.5).sort((a, b) => a.mz - b.mz);
  const basePeak = peaks.reduce((b, p) => (!b || p.intensity > b.intensity ? p : b), null);
  const exact = molPattern[mainIdx] ? molPattern[mainIdx].mass : 0;
  return { molecularIon: { mz: M, exactMass: exact, formula: msFormulaString(molCounts), pattern: molPattern }, peaks, basePeak: basePeak ? basePeak.mz : null };
}

