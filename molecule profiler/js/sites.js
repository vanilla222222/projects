'use strict';

const SITE_MIN = 0.2;
const SITE_MAX = 2.5;

const SITE_RING_EFFECTS = {
  donor: [1.45, 0.80, 1.70],
  alkyl: [1.15, 1.00, 1.20],
  halogen: [0.85, 0.60, 0.90],
  withdraw: [0.40, 0.75, 0.35]
};

const SITE_EFFECT_LABEL = {
  donor: 'donating',
  alkyl: 'weakly donating',
  halogen: 'halogen',
  withdraw: 'withdrawing'
};

const SITE_POSITION_LABEL = ['ortho', 'meta', 'para'];

function siteClamp(value) {
  return Math.min(SITE_MAX, Math.max(SITE_MIN, value));
}

function siteHeavy(mol, atom) {
  return atom.neighbors.filter((link) => mol.atoms[link.atom].element !== 'H');
}

function siteCarbonylLike(mol, atom) {
  return atom.neighbors.some((link) => {
    const bond = mol.bonds[link.bond];
    const other = mol.atoms[link.atom];
    return bond.order >= 2 && !bond.aromatic && (other.element === 'O' || other.element === 'N' || other.element === 'S');
  });
}

function siteHalogenCount(mol, atom) {
  return atom.neighbors.filter((link) => ['F', 'Cl', 'Br', 'I'].includes(mol.atoms[link.atom].element)).length;
}

function siteSulfonyl(mol, atom) {
  if (atom.element !== 'S') return false;
  return atom.neighbors.filter((link) => (
    mol.atoms[link.atom].element === 'O' && mol.bonds[link.bond].order >= 2
  )).length >= 2;
}

function siteSubstituentClass(mol, atom) {
  if (['F', 'Cl', 'Br', 'I'].includes(atom.element)) return 'halogen';
  if (atom.element === 'O') return siteCarbonylLike(mol, atom) ? 'withdraw' : 'donor';
  if (atom.element === 'N') {
    if (siteCarbonylLike(mol, atom)) return 'withdraw';
    if (atom.charge > 0) return 'withdraw';
    return 'donor';
  }
  if (atom.element === 'S') return siteSulfonyl(mol, atom) ? 'withdraw' : 'donor';
  if (atom.element === 'C') {
    if (siteCarbonylLike(mol, atom)) return 'withdraw';
    if (siteHalogenCount(mol, atom) >= 2) return 'withdraw';
    if (atom.neighbors.some((link) => mol.bonds[link.bond].order === 3)) return 'withdraw';
    return 'alkyl';
  }
  return 'alkyl';
}

function siteRingDistances(mol, ring, from) {
  const inRing = new Set(ring);
  const distance = new Map([[from, 0]]);
  let frontier = [from];
  while (frontier.length) {
    const next = [];
    frontier.forEach((id) => {
      mol.atoms[id].neighbors.forEach((link) => {
        if (!inRing.has(link.atom) || distance.has(link.atom)) return;
        distance.set(link.atom, distance.get(id) + 1);
        next.push(link.atom);
      });
    });
    frontier = next;
  }
  return distance;
}

function siteAromatic(mol, index) {
  const atom = mol.atoms[index];
  const ringIndex = atom.rings.find((id) => mol.rings[id].aromatic);
  if (ringIndex === undefined) return { factor: 1, reasons: [] };
  const ring = mol.rings[ringIndex];
  const inRing = new Set(ring);
  const distance = siteRingDistances(mol, ring, index);
  const reasons = [];
  let factor = 1;

  ring.forEach((id) => {
    if (id === index) return;
    const step = distance.get(id);
    if (!step || step > 3) return;
    mol.atoms[id].neighbors.forEach((link) => {
      const other = mol.atoms[link.atom];
      if (inRing.has(link.atom) || other.element === 'H') return;
      const kind = siteSubstituentClass(mol, other);
      const effect = SITE_RING_EFFECTS[kind][Math.min(step, 3) - 1];
      factor *= effect;
      reasons.push(other.element + ' substituent ' + SITE_POSITION_LABEL[Math.min(step, 3) - 1]
        + ', ' + SITE_EFFECT_LABEL[kind] + ' (' + effect.toFixed(2) + ')');
    });
  });

  const crowded = mol.atoms[index].neighbors.filter((link) => {
    if (!inRing.has(link.atom)) return false;
    return siteHeavy(mol, mol.atoms[link.atom]).some((next) => !inRing.has(next.atom));
  }).length;
  if (crowded === 1) { factor *= 0.9; reasons.push('one substituted ring neighbour (0.90)'); }
  if (crowded >= 2) { factor *= 0.65; reasons.push('flanked by two substituted ring neighbours (0.65)'); }

  return { factor: siteClamp(factor), reasons: reasons };
}

function siteAliphatic(mol, index) {
  const atom = mol.atoms[index];
  const heavy = siteHeavy(mol, atom);
  const reasons = [];
  let factor = 1;

  if (heavy.length <= 1) { factor *= 0.75; reasons.push('primary carbon (0.75)'); }
  else if (heavy.length === 3) { factor *= 1.25; reasons.push('tertiary carbon, weaker C-H (1.25)'); }
  else if (heavy.length >= 4) { factor *= 0.3; reasons.push('no hydrogen to abstract (0.30)'); }

  heavy.forEach((link) => {
    const other = mol.atoms[link.atom];
    if (other.element === 'N' && !siteCarbonylLike(mol, other)) {
      factor *= 1.2;
      reasons.push('alpha to nitrogen (1.20)');
    } else if (other.element === 'O' && !siteCarbonylLike(mol, other)) {
      factor *= 1.1;
      reasons.push('alpha to oxygen (1.10)');
    } else if (other.element === 'C' && siteCarbonylLike(mol, other)) {
      factor *= 0.55;
      reasons.push('next to a carbonyl (0.55)');
    } else if (other.element === 'C' && siteHalogenCount(mol, other) >= 2) {
      factor *= 0.6;
      reasons.push('next to a polyhalogenated carbon (0.60)');
    } else if (siteSulfonyl(mol, other)) {
      factor *= 0.6;
      reasons.push('next to a sulfonyl (0.60)');
    } else if (other.element === 'C' && siteHeavy(mol, other).length >= 4) {
      factor *= 0.85;
      reasons.push('next to a quaternary carbon (0.85)');
    }
  });

  if (atom.rings.length) { factor *= 0.95; reasons.push('ring carbon (0.95)'); }

  return { factor: siteClamp(factor), reasons: reasons };
}

function siteConjugation(mol, index) {
  const atom = mol.atoms[index];
  const reasons = [];
  let factor = 1;
  const carrier = siteHeavy(mol, atom).find((link) => mol.atoms[link.atom].aromatic);
  if (!carrier) return { factor: 1, reasons: reasons };
  const ring = mol.atoms[carrier.atom].rings.map((id) => mol.rings[id]).find((r) => r.aromatic);
  if (!ring) return { factor: 1, reasons: reasons };
  const inRing = new Set(ring);
  const crowded = mol.atoms[carrier.atom].neighbors.filter((link) => {
    if (!inRing.has(link.atom)) return false;
    return siteHeavy(mol, mol.atoms[link.atom]).some((next) => !inRing.has(next.atom) && next.atom !== index);
  }).length;
  if (crowded === 1) { factor *= 0.85; reasons.push('one ortho substituent (0.85)'); }
  if (crowded >= 2) { factor *= 0.55; reasons.push('both ortho positions substituted (0.55)'); }
  return { factor: siteClamp(factor), reasons: reasons };
}

const SITE_ROUTES = {
  'aromatic oxidation': { pick: (mol, id) => mol.atoms[id].aromatic && mol.atoms[id].element === 'C', score: siteAromatic },
  'aliphatic oxidation': { pick: (mol, id) => !mol.atoms[id].aromatic && mol.atoms[id].element === 'C', score: siteAliphatic },
  'O-glucuronidation': { pick: (mol, id) => mol.atoms[id].element === 'O', score: siteConjugation },
  'O-sulfation': { pick: (mol, id) => mol.atoms[id].element === 'O', score: siteConjugation }
};

function siteScore(mol, rule, touched) {
  const handler = SITE_ROUTES[rule.route];
  if (!handler || !touched || !touched.length) return { factor: 1, reasons: [], atom: null };
  const id = touched.find((index) => index >= 0 && index < mol.atoms.length && handler.pick(mol, index));
  if (id === undefined) return { factor: 1, reasons: [], atom: null };
  const result = handler.score(mol, id);
  return { factor: result.factor, reasons: result.reasons, atom: id };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SITE_MIN, SITE_MAX, SITE_RING_EFFECTS, siteScore,
    siteAromatic, siteAliphatic, siteConjugation, siteSubstituentClass
  };
}
