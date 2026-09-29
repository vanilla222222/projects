const IR_INTENSITY_DEPTH = { s: 0.85, m: 0.55, w: 0.25 };

function irBand(list, from, to, intensity, shape, label, atoms) {
  const existing = list.find((b) => b.label === label && b.from === from && b.to === to);
  if (existing) {
    atoms.forEach((a) => {
      if (!existing.atoms.includes(a)) {
        existing.atoms.push(a);
      }
    });
    return;
  }
  list.push({ from, to, center: Math.round((from + to) / 2), intensity, shape, label, atoms: atoms.slice() });
}

function irOopPattern(env, ring) {
  const inRing = new Set(ring);
  const subst = ring.map((a) => env.nb(a).some((n) => !inRing.has(n.id)) || env.el(a) !== 'C');
  const count = subst.filter(Boolean).length;
  if (count === 1) {
    return 'mono';
  }
  if (count === 2) {
    const idx = ring.map((a, i) => (subst[i] ? i : -1)).filter((i) => i >= 0);
    const d = Math.min(Math.abs(idx[0] - idx[1]), 6 - Math.abs(idx[0] - idx[1]));
    return d === 1 ? 'ortho' : d === 2 ? 'meta' : 'para';
  }
  return count === 0 ? 'none' : 'poly';
}

function predictIrBands(graph, atomIds) {
  const env = spectraEnv(graph, atomIds);
  const bands = [];
  const heavy = env.heavy;
  heavy.forEach((id) => {
    const e = env.el(id);
    const h = env.h(id);
    const nb = env.nb(id);
    if (e === 'O' && h > 0) {
      const carbonyl = nb.find((n) => spectraIsCarbonyl(env, n.id));
      if (carbonyl) {
        irBand(bands, 2500, 3300, 's', 'very broad', 'O–H stretch (carboxylic acid)', [id]);
      } else if (nb.some((n) => env.aromatic(n.id))) {
        irBand(bands, 3200, 3550, 's', 'broad', 'O–H stretch (phenol)', [id]);
      } else {
        irBand(bands, 3200, 3550, 's', 'broad', 'O–H stretch (alcohol)', [id]);
      }
    }
    if (e === 'N' && h > 0 && env.charge(id) === 0) {
      const amide = nb.some((n) => spectraIsCarbonyl(env, n.id));
      const kind = amide ? 'amide' : 'amine';
      if (h >= 2) {
        irBand(bands, 3330, 3370, 'm', 'sharp', 'N–H stretch (primary ' + kind + ', asym)', [id]);
        irBand(bands, 3170, 3290, 'm', 'sharp', 'N–H stretch (primary ' + kind + ', sym)', [id]);
        irBand(bands, 1580, 1650, 'm', 'sharp', 'N–H bend', [id]);
      } else {
        irBand(bands, 3300, 3500, amide ? 'm' : 'w', 'sharp', 'N–H stretch (secondary ' + kind + ')', [id]);
      }
    }
    if (e === 'S' && h > 0) {
      irBand(bands, 2550, 2600, 'w', 'sharp', 'S–H stretch', [id]);
    }
    if (e === 'C' && h > 0) {
      if (env.aromatic(id)) {
        irBand(bands, 3000, 3100, 'w', 'sharp', 'C–H stretch (aromatic)', [id]);
      } else if (spectraIsCarbonyl(env, id)) {
        if (spectraCarbonylKind(env, id).kind === 'aldehyde') {
          irBand(bands, 2800, 2840, 'w', 'sharp', 'C–H stretch (aldehyde, Fermi pair)', [id]);
          irBand(bands, 2700, 2740, 'w', 'sharp', 'C–H stretch (aldehyde, Fermi pair)', [id]);
        }
      } else if (nb.some((n) => n.order === 3)) {
        irBand(bands, 3260, 3330, 's', 'sharp', '≡C–H stretch', [id]);
      } else if (nb.some((n) => n.order === 2)) {
        irBand(bands, 3010, 3100, 'm', 'sharp', '=C–H stretch (alkene)', [id]);
      } else {
        irBand(bands, 2850, 2960, 's', 'sharp', 'C–H stretch (sp³)', [id]);
      }
    }
  });
  const seenBond = new Set();
  heavy.forEach((a) => {
    env.nb(a).forEach((n) => {
      const b = n.id;
      const key = a < b ? a + ':' + b : b + ':' + a;
      if (seenBond.has(key)) {
        return;
      }
      seenBond.add(key);
      const ea = env.el(a);
      const eb = env.el(b);
      if (n.order === 3) {
        if ((ea === 'C' && eb === 'N') || (ea === 'N' && eb === 'C')) {
          irBand(bands, 2210, 2260, 'm', 'sharp', 'C≡N stretch (nitrile)', [a, b]);
        } else if (ea === 'C' && eb === 'C') {
          if (env.cls(a) !== env.cls(b)) {
            const terminal = env.h(a) > 0 || env.h(b) > 0;
            irBand(bands, terminal ? 2100 : 2190, terminal ? 2140 : 2260, 'w', 'sharp', 'C≡C stretch', [a, b]);
          }
        }
        return;
      }
      if (n.order === 2 && ea === 'C' && eb === 'C' && !env.aromatic(a)) {
        if (env.nb(a).filter((m) => m.order === 2).length === 2 || env.nb(b).filter((m) => m.order === 2).length === 2) {
          irBand(bands, 1940, 1970, 'm', 'sharp', 'C=C=C stretch (allene)', [a, b]);
        } else {
          irBand(bands, 1620, 1680, env.cls(a) === env.cls(b) ? 'w' : 'm', 'sharp', 'C=C stretch (alkene)', [a, b]);
        }
        return;
      }
      if (n.order === 2 && ((ea === 'C' && eb === 'N') || (ea === 'N' && eb === 'C')) && !env.aromatic(a) && !env.aromatic(b)) {
        irBand(bands, 1620, 1690, 'm', 'sharp', 'C=N stretch', [a, b]);
      }
    });
  });
  heavy.forEach((c) => {
    if (!spectraIsCarbonyl(env, c)) {
      return;
    }
    const k = spectraCarbonylKind(env, c);
    const atoms = [c, k.oxoId];
    let center;
    let label;
    switch (k.kind) {
      case 'acidHalide': center = 1800; label = 'C=O stretch (acid chloride)'; break;
      case 'anhydride': center = 1820; label = 'C=O stretch (anhydride, asym)'; break;
      case 'ester': center = 1740; label = 'C=O stretch (ester)'; break;
      case 'aldehyde': center = 1725; label = 'C=O stretch (aldehyde)'; break;
      case 'acid': center = 1710; label = 'C=O stretch (carboxylic acid)'; break;
      case 'carboxylate': center = 1580; label = 'CO₂⁻ stretch (carboxylate)'; break;
      case 'amide': center = 1665; label = 'C=O stretch (amide I)'; break;
      case 'carbonic': center = 1740; label = 'C=O stretch (carbonate/urea/carbamate)'; break;
      case 'thioester': center = 1690; label = 'C=O stretch (thioester)'; break;
      default: center = 1715; label = 'C=O stretch (ketone)';
    }
    if (k.conj && k.kind !== 'amide' && k.kind !== 'carboxylate') {
      center -= 25;
      label = label.replace(')', ', conjugated)');
    }
    if (k.ring === 5) {
      center += k.kind === 'ester' ? 35 : 30;
    } else if (k.ring === 4) {
      center += k.kind === 'amide' ? 85 : 60;
    } else if (k.ring === 3) {
      center += 100;
    }
    if (k.formyl && k.kind === 'amide') {
      center = 1675;
    }
    irBand(bands, center - 15, center + 15, 's', 'sharp', label, atoms.filter((x) => x !== null));
    if (k.kind === 'anhydride') {
      irBand(bands, 1745, 1775, 's', 'sharp', 'C=O stretch (anhydride, sym)', atoms.filter((x) => x !== null));
    }
    if (k.kind === 'amide' && env.h(k.hetId) > 0 && env.h(k.hetId) < 2) {
      irBand(bands, 1510, 1570, 'm', 'sharp', 'N–H bend (amide II)', [k.hetId]);
    }
  });
  spectraAromaticRings(env).filter((ring) => ring.length === 6).forEach((ring) => {
    irBand(bands, 1590, 1610, 'm', 'sharp', 'C=C stretch (aromatic ring)', ring);
    irBand(bands, 1480, 1510, 'm', 'sharp', 'C=C stretch (aromatic ring)', ring);
    if (ring.some((a) => env.el(a) !== 'C')) {
      return;
    }
    const pattern = irOopPattern(env, ring);
    if (pattern === 'mono') {
      irBand(bands, 740, 760, 's', 'sharp', 'C–H out-of-plane (mono)', ring);
      irBand(bands, 690, 710, 's', 'sharp', 'C–H out-of-plane (mono)', ring);
    } else if (pattern === 'ortho') {
      irBand(bands, 735, 770, 's', 'sharp', 'C–H out-of-plane (ortho)', ring);
    } else if (pattern === 'meta') {
      irBand(bands, 770, 810, 's', 'sharp', 'C–H out-of-plane (meta)', ring);
      irBand(bands, 680, 700, 's', 'sharp', 'C–H out-of-plane (meta)', ring);
    } else if (pattern === 'para') {
      irBand(bands, 800, 860, 's', 'sharp', 'C–H out-of-plane (para)', ring);
    }
  });
  heavy.forEach((id) => {
    const e = env.el(id);
    if (e === 'N' && spectraIsNitro(env, id)) {
      const os = env.nb(id).filter((n) => env.el(n.id) === 'O').map((n) => n.id);
      irBand(bands, 1500, 1550, 's', 'sharp', 'NO₂ stretch (asym)', [id].concat(os));
      irBand(bands, 1330, 1370, 's', 'sharp', 'NO₂ stretch (sym)', [id].concat(os));
    }
    if (e === 'S') {
      const oxo = env.nb(id).filter((n) => n.order === 2 && env.el(n.id) === 'O').map((n) => n.id);
      if (oxo.length >= 2) {
        irBand(bands, 1300, 1370, 's', 'sharp', 'SO₂ stretch (asym)', [id].concat(oxo));
        irBand(bands, 1120, 1180, 's', 'sharp', 'SO₂ stretch (sym)', [id].concat(oxo));
      } else if (oxo.length === 1) {
        irBand(bands, 1030, 1070, 's', 'sharp', 'S=O stretch', [id].concat(oxo));
      }
    }
    if (e === 'O' && env.charge(id) === 0 && env.nb(id).every((n) => n.order === 1)) {
      const cs = env.nb(id).filter((n) => env.el(n.id) === 'C');
      if (cs.length === 0) {
        return;
      }
      const acyl = cs.some((n) => spectraIsCarbonyl(env, n.id));
      const aryl = cs.some((n) => env.aromatic(n.id) || env.nb(n.id).some((m) => m.order === 2 && env.el(m.id) === 'C'));
      if (acyl) {
        irBand(bands, 1150, 1300, 's', 'sharp', env.h(id) > 0 ? 'C–O stretch (acid)' : 'C–O stretch (ester)', [id]);
      } else if (aryl) {
        irBand(bands, 1200, 1275, 's', 'sharp', 'C–O stretch (aryl)', [id]);
      } else {
        irBand(bands, 1050, 1150, 's', 'sharp', env.h(id) > 0 ? 'C–O stretch (alcohol)' : 'C–O stretch (ether)', [id]);
      }
    }
    if (e === 'F') {
      irBand(bands, 1000, 1400, 's', 'sharp', 'C–F stretch', [id]);
    }
    if (e === 'Cl') {
      irBand(bands, 600, 800, 's', 'sharp', 'C–Cl stretch', [id]);
    }
    if (e === 'Br') {
      irBand(bands, 500, 600, 's', 'sharp', 'C–Br stretch', [id]);
    }
    if (e === 'I') {
      irBand(bands, 480, 520, 'm', 'sharp', 'C–I stretch', [id]);
    }
  });
  if (heavy.some((id) => env.el(id) === 'C' && spectraIsSp3Carbon(env, id) && env.h(id) >= 2)) {
    const ids = heavy.filter((id) => spectraIsSp3Carbon(env, id) && env.h(id) >= 2);
    irBand(bands, 1440, 1470, 'm', 'sharp', 'C–H bend (CH₂/CH₃)', ids);
  }
  if (heavy.some((id) => spectraIsSp3Carbon(env, id) && env.h(id) === 3)) {
    irBand(bands, 1370, 1385, 'm', 'sharp', 'C–H bend (CH₃ umbrella)', heavy.filter((id) => spectraIsSp3Carbon(env, id) && env.h(id) === 3));
  }
  bands.sort((a, b) => b.center - a.center);
  return bands;
}

function irSpectrum(bands, options) {
  const opts = options || {};
  const from = opts.from !== undefined ? opts.from : 4000;
  const to = opts.to !== undefined ? opts.to : 400;
  const points = opts.points || 1800;
  const out = [];
  for (let i = 0; i < points; i++) {
    const x = from + (to - from) * (i / Math.max(1, points - 1));
    let absorbance = 0;
    bands.forEach((b) => {
      const depth = IR_INTENSITY_DEPTH[b.intensity] || 0.5;
      const half = Math.max(6, (b.to - b.from) / 2);
      if (b.shape === 'sharp') {
        const w = Math.min(30, half);
        const d = (x - b.center) / w;
        absorbance += depth / (1 + d * d);
      } else {
        const sigma = half * (b.shape === 'very broad' ? 0.7 : 0.6);
        const d = (x - b.center) / sigma;
        absorbance += depth * Math.exp(-0.5 * d * d);
      }
    });
    out.push({ x, y: 100 * Math.exp(-absorbance * 1.2) });
  }
  return out;
}
