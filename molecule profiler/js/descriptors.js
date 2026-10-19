'use strict';

const TPSA_NITROGEN = [
  { heavy: 3, h: 0, charge: 0, aromatic: false, ring3: false, value: 3.24 },
  { heavy: 3, h: 0, charge: 0, aromatic: false, ring3: true, value: 3.01 },
  { heavy: 2, h: 0, charge: 0, aromatic: false, ring3: false, value: 12.36 },
  { heavy: 1, h: 0, charge: 0, aromatic: false, ring3: false, value: 23.79 },
  { heavy: 2, h: 1, charge: 0, aromatic: false, ring3: false, value: 12.03 },
  { heavy: 2, h: 1, charge: 0, aromatic: false, ring3: true, value: 21.94 },
  { heavy: 1, h: 1, charge: 0, aromatic: false, ring3: false, value: 23.85 },
  { heavy: 1, h: 2, charge: 0, aromatic: false, ring3: false, value: 26.02 },
  { heavy: 0, h: 3, charge: 0, aromatic: false, ring3: false, value: 27.64 },
  { heavy: 2, h: 0, charge: 0, aromatic: true, ring3: false, value: 12.89 },
  { heavy: 3, h: 0, charge: 0, aromatic: true, ring3: false, aromBonds: 3, value: 4.41 },
  { heavy: 3, h: 0, charge: 0, aromatic: true, ring3: false, aromBonds: 2, value: 4.93 },
  { heavy: 2, h: 1, charge: 0, aromatic: true, ring3: false, value: 15.79 },
  { heavy: 4, h: 0, charge: 1, aromatic: false, ring3: false, value: 0.0 },
  { heavy: 3, h: 0, charge: 1, aromatic: false, ring3: false, value: 3.01 },
  { heavy: 1, h: 0, charge: 1, aromatic: false, ring3: false, value: 4.36 },
  { heavy: 3, h: 1, charge: 1, aromatic: false, ring3: false, value: 4.44 },
  { heavy: 2, h: 2, charge: 1, aromatic: false, ring3: false, value: 16.61 },
  { heavy: 1, h: 3, charge: 1, aromatic: false, ring3: false, value: 27.64 },
  { heavy: 2, h: 1, charge: 1, aromatic: false, ring3: false, value: 13.6 },
  { heavy: 3, h: 0, charge: 1, aromatic: true, ring3: false, aromBonds: 3, value: 4.1 },
  { heavy: 3, h: 0, charge: 1, aromatic: true, ring3: false, aromBonds: 2, value: 3.88 },
  { heavy: 2, h: 1, charge: 1, aromatic: true, ring3: false, value: 14.14 }
];

const TPSA_OXYGEN = [
  { heavy: 2, h: 0, charge: 0, aromatic: false, ring3: false, value: 9.23 },
  { heavy: 2, h: 0, charge: 0, aromatic: false, ring3: true, value: 12.53 },
  { heavy: 1, h: 0, charge: 0, aromatic: false, ring3: false, value: 17.07 },
  { heavy: 1, h: 1, charge: 0, aromatic: false, ring3: false, value: 20.23 },
  { heavy: 0, h: 2, charge: 0, aromatic: false, ring3: false, value: 20.23 },
  { heavy: 2, h: 0, charge: 0, aromatic: true, ring3: false, value: 13.14 },
  { heavy: 1, h: 0, charge: -1, aromatic: false, ring3: false, value: 23.06 },
  { heavy: 0, h: 1, charge: -1, aromatic: false, ring3: false, value: 23.06 }
];

const TPSA_SULFUR = [
  { heavy: 2, h: 0, charge: 0, aromatic: false, value: 25.3 },
  { heavy: 1, h: 0, charge: 0, aromatic: false, value: 32.09 },
  { heavy: 1, h: 1, charge: 0, aromatic: false, value: 38.8 },
  { heavy: 3, h: 0, charge: 0, aromatic: false, value: 19.21 },
  { heavy: 4, h: 0, charge: 0, aromatic: false, value: 8.38 },
  { heavy: 2, h: 0, charge: 0, aromatic: true, value: 28.24 },
  { heavy: 3, h: 0, charge: 0, aromatic: true, value: 21.7 }
];

const TPSA_PHOSPHORUS = [
  { heavy: 3, h: 1, charge: 0, value: 23.47 },
  { heavy: 3, h: 0, charge: 0, value: 13.59 },
  { heavy: 4, h: 0, charge: 0, value: 9.81 },
  { heavy: 2, h: 0, charge: 0, value: 34.14 }
];

function atomInThreeRing(mol, atom) {
  return atom.rings.some((index) => mol.rings[index].length === 3);
}

function tpsaContribution(mol, atom) {
  const heavy = atom.degree;
  const h = atom.totalH;
  const charge = atom.charge || 0;
  const aromatic = !!atom.aromatic;
  const ring3 = atomInThreeRing(mol, atom);

  let table = null;
  if (atom.element === 'N') table = TPSA_NITROGEN;
  else if (atom.element === 'O') table = TPSA_OXYGEN;
  else return 0;

  const aromBonds = atom.neighbors.filter((link) => mol.bonds[link.bond].aromatic).length;
  const fitsBonds = (row) => row.aromBonds === undefined || row.aromBonds === aromBonds;
  const pool = table.filter((row) => row.heavy === heavy && row.h === h && row.charge === charge
    && row.aromatic === aromatic);
  let match = pool.find((row) => row.ring3 === ring3 && fitsBonds(row));
  if (!match) match = pool.find(fitsBonds);
  if (!match) match = pool[0];
  if (!match) {
    match = table.find((row) => row.heavy === heavy && row.h === h && row.charge === charge);
  }
  if (!match) return atom.element === 'N' ? 30.5 - heavy * 8.2 + h * 1.5 : 28.5 - heavy * 8.6 + h * 1.5;
  return match.value;
}

function tpsaSulfurPhosphorus(mol, atom) {
  const heavy = atom.degree;
  const h = atom.totalH;
  const charge = atom.charge || 0;
  const aromatic = !!atom.aromatic;
  if (atom.element === 'S') {
    const match = TPSA_SULFUR.find((row) => row.heavy === heavy && row.h === h
      && row.charge === charge && row.aromatic === aromatic);
    return match ? match.value : 0;
  }
  if (atom.element === 'P') {
    const match = TPSA_PHOSPHORUS.find((row) => row.heavy === heavy && row.h === h && row.charge === charge);
    return match ? match.value : 0;
  }
  return 0;
}

function tpsa(mol, options) {
  const includeSP = !!(options && options.includeSulfurPhosphorus);
  let total = 0;
  mol.atoms.forEach((atom) => {
    if (atom.element === 'N' || atom.element === 'O') total += tpsaContribution(mol, atom);
    else if (includeSP) total += tpsaSulfurPhosphorus(mol, atom);
  });
  return Math.max(0, total);
}

const CRIPPEN = {
  C1: [0.1441, 2.503], C2: [0.0, 2.433], C3: [-0.2035, 2.753], C4: [-0.2051, 2.731],
  C5: [-0.2783, 5.007], C6: [0.1551, 3.513], C7: [0.0017, 3.888], C8: [0.08452, 2.464],
  C9: [-0.1444, 2.412], C10: [-0.0516, 2.488], C11: [0.1193, 2.582], C12: [-0.0967, 2.576],
  C13: [-0.5443, 4.041], C14: [0.0, 3.257], C15: [0.245, 3.564], C16: [0.198, 3.18],
  C17: [0.0, 3.104], C18: [0.1581, 3.35], C19: [0.2955, 4.346], C20: [0.2713, 3.904],
  C21: [0.136, 3.509], C22: [0.4619, 4.067], C23: [0.5437, 3.853], C24: [0.1893, 2.673],
  C25: [-0.8186, 3.135], C26: [0.264, 4.305], C27: [0.2148, 2.693], CS: [0.08129, 3.243],
  H1: [0.123, 1.057], H2: [-0.2677, 1.395], H3: [0.2142, 0.9627], H4: [0.298, 1.805],
  HS: [0.1125, 1.112],
  N1: [-1.019, 2.262], N2: [-0.7096, 2.173], N3: [-1.027, 2.827], N4: [-0.5188, 3.0],
  N5: [0.08387, 1.757], N6: [0.1836, 2.428], N7: [-0.3187, 1.839], N8: [-0.4458, 2.819],
  N9: [0.01508, 1.725], N10: [-1.95, 0.0], N11: [-0.3239, 2.202], N12: [-1.119, 0.0],
  N13: [-0.3396, 0.2604], N14: [0.2887, 3.359],
  NS: [-0.4806, 2.134],
  O1: [0.1552, 1.08], O2: [-0.2893, 0.8238], O3: [-0.0684, 1.085], O4: [-0.4195, 1.182],
  O5: [0.0335, 3.367], O6: [-0.3339, 0.7774], O7: [-1.189, 0.0], O8: [0.1788, 3.135],
  O9: [-0.1526, 0.0], O10: [0.1129, 0.2215], O11: [0.4833, 0.389], O12: [-1.326, 0.0],
  OS: [-0.1188, 0.6865],
  F: [0.4202, 1.108], Cl: [0.6895, 5.853], Br: [0.8456, 8.927], I: [0.8857, 14.02],
  Hal: [-2.996, 0.0],
  P: [0.8612, 6.92],
  S1: [0.6482, 7.591], S2: [-0.0024, 7.365], S3: [0.6237, 6.691],
  Me1: [-0.3808, 5.754],
  ZERO: [0.0, 0.0]
};

const CRIPPEN_HETERO = ['N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I'];
const EXOTIC_FOR_C13 = (el) => !['C', 'N', 'O', 'S', 'F', 'Cl', 'Br', 'I', 'H'].includes(el);
const EXOTIC_FOR_C27 = (el) => !['C', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I', 'H'].includes(el);
const ME1_ELEMENTS = new Set([
  'Li', 'Na', 'K', 'Rb', 'Cs', 'Be', 'Mg', 'Ca', 'Sr', 'Ba',
  'B', 'Al', 'Ga', 'In', 'Tl', 'Si', 'Ge', 'Sn', 'Pb',
  'As', 'Sb', 'Bi', 'Se', 'Te', 'Po'
]);

function crippenContext(mol, atom) {
  const links = atom.neighbors.map((link) => ({
    atom: mol.atoms[link.atom],
    order: mol.bonds[link.bond].order,
    aromaticBond: mol.bonds[link.bond].aromatic
  }));
  return {
    el: atom.element,
    arom: !!atom.aromatic,
    charge: atom.charge || 0,
    h: atom.totalH,
    degree: atom.degree,
    x: atom.degree + atom.totalH,
    links,
    heavy: links.map((link) => link.atom),
    aromaticBonds: links.filter((link) => link.aromaticBond).length,
    singleTo: (test) => links.filter((link) => link.order === 1 && !link.aromaticBond && test(link.atom)),
    doubleTo: (test) => links.filter((link) => link.order === 2 && test(link.atom)),
    tripleTo: (test) => links.filter((link) => link.order === 3 && test(link.atom))
  };
}

const ALIPHATIC_HEAVY = (a) => !a.aromatic;
const ALIPHATIC_HETERO = (a) => !a.aromatic && CRIPPEN_HETERO.includes(a.element);
const ALIPHATIC_CARBON = (a) => !a.aromatic && a.element === 'C';
const ANY_HEAVY = () => true;
const AROMATIC_ANY = (a) => a.aromatic;
const AROMATIC_CARBON = (a) => a.aromatic && a.element === 'C';

function carbonSubstituentType(c) {
  const sub = c.links.find((link) => !link.aromaticBond && link.order === 1);
  return sub ? sub.atom : null;
}

const CARBON_RULES = [
  ['C1', (c) => c.h === 4],
  ['C1', (c) => c.h === 3 && c.heavy.filter(ALIPHATIC_CARBON).length === 1],
  ['C1', (c) => c.h === 2 && c.heavy.filter(ALIPHATIC_CARBON).length === 2],
  ['C2', (c) => c.h === 1 && c.heavy.filter(ALIPHATIC_CARBON).length === 3],
  ['C2', (c) => c.h === 0 && c.heavy.filter(ALIPHATIC_CARBON).length === 4],
  ['C3', (c) => c.h === 3 && c.heavy.some(ALIPHATIC_HETERO)],
  ['C3', (c) => c.h === 2 && c.x === 4 && c.heavy.every(ALIPHATIC_HEAVY)
    && c.heavy.some(ALIPHATIC_HETERO)],
  ['C4', (c) => c.h === 1 && c.x === 4 && c.heavy.every(ALIPHATIC_HEAVY)
    && c.heavy.some(ALIPHATIC_HETERO)],
  ['C4', (c) => c.h === 0 && c.x === 4 && c.heavy.every(ALIPHATIC_HEAVY)
    && c.heavy.some(ALIPHATIC_HETERO)],
  ['C5', (c) => !c.arom && c.doubleTo((a) => a.element !== 'C' && !a.aromatic).length > 0],
  ['C6', (c) => c.h === 2 && c.doubleTo(ALIPHATIC_CARBON).length > 0],
  ['C6', (c) => c.h === 1 && c.doubleTo(ALIPHATIC_CARBON).length > 0
    && c.links.filter((link) => link.order !== 2).every((link) => ALIPHATIC_HEAVY(link.atom))],
  ['C6', (c) => c.h === 0 && c.degree === 3 && c.doubleTo(ALIPHATIC_CARBON).length > 0
    && c.links.filter((link) => link.order !== 2).every((link) => ALIPHATIC_HEAVY(link.atom))],
  ['C6', (c) => c.doubleTo(ALIPHATIC_CARBON).length === 2],
  ['C7', (c) => c.x === 2 && c.tripleTo(ALIPHATIC_HEAVY).length > 0],
  ['C8', (c) => c.h === 3 && c.heavy.some(AROMATIC_CARBON)],
  ['C9', (c) => c.h === 3 && c.heavy.some(AROMATIC_ANY)],
  ['C10', (c) => c.h === 2 && c.x === 4 && c.heavy.some(AROMATIC_ANY)],
  ['C11', (c) => c.h === 1 && c.x === 4 && c.heavy.some(AROMATIC_ANY)],
  ['C12', (c) => c.h === 0 && c.x === 4 && c.heavy.some(AROMATIC_ANY)],
  ['C13', (c) => c.arom && c.h === 0
    && c.singleTo((a) => !a.aromatic && EXOTIC_FOR_C13(a.element)).length > 0],
  ['C14', (c) => c.arom && c.heavy.some((a) => a.element === 'F')],
  ['C15', (c) => c.arom && c.heavy.some((a) => a.element === 'Cl')],
  ['C16', (c) => c.arom && c.heavy.some((a) => a.element === 'Br')],
  ['C17', (c) => c.arom && c.heavy.some((a) => a.element === 'I')],
  ['C18', (c) => c.arom && c.h >= 1],
  ['C19', (c) => c.arom && c.aromaticBonds >= 3],
  ['C20', (c) => c.arom && c.aromaticBonds === 2 && c.singleTo(AROMATIC_ANY).length > 0],
  ['C21', (c) => c.arom && c.aromaticBonds === 2 && c.singleTo(ALIPHATIC_CARBON).length > 0],
  ['C22', (c) => c.arom && c.aromaticBonds === 2
    && c.singleTo((a) => !a.aromatic && a.element === 'N').length > 0],
  ['C23', (c) => c.arom && c.aromaticBonds === 2
    && c.singleTo((a) => !a.aromatic && a.element === 'O').length > 0],
  ['C24', (c) => c.arom && c.aromaticBonds === 2
    && c.singleTo((a) => !a.aromatic && a.element === 'S').length > 0],
  ['C25', (c) => c.arom && c.aromaticBonds === 2
    && c.doubleTo((a) => ['C', 'N', 'O'].includes(a.element)).length > 0],
  ['C26', (c) => !c.arom && c.doubleTo((a) => a.element === 'C').length > 0
    && c.heavy.some(AROMATIC_ANY)],
  ['C26', (c) => !c.arom && c.doubleTo(AROMATIC_CARBON).length > 0],
  ['C27', (c) => c.x === 4 && c.heavy.some((a) => !a.aromatic && EXOTIC_FOR_C27(a.element))]
];

const NITROGEN_RULES = [
  ['N1', (c) => c.charge === 0 && c.h === 2 && c.heavy.some(ALIPHATIC_HEAVY) && !c.arom],
  ['N2', (c) => c.charge === 0 && c.h === 1 && !c.arom
    && c.heavy.filter(ALIPHATIC_HEAVY).length >= 2],
  ['N3', (c) => c.charge === 0 && c.h === 2 && !c.arom && c.heavy.some(AROMATIC_ANY)],
  ['N4', (c) => c.charge === 0 && c.h === 1 && !c.arom && c.heavy.some(AROMATIC_ANY)
    && c.degree >= 2],
  ['N13', (c) => c.charge === 0 && c.h === 0 && !c.arom && c.degree >= 3
    && c.doubleTo(ANY_HEAVY).length >= 2],
  ['N14', (c) => c.charge === 0 && c.h === 0 && !c.arom && c.degree === 2
    && c.doubleTo(ANY_HEAVY).length >= 2],
  ['N5', (c) => c.charge === 0 && c.h === 1 && !c.arom && c.doubleTo(ANY_HEAVY).length > 0],
  ['N6', (c) => c.charge === 0 && c.h === 0 && !c.arom && c.doubleTo(ANY_HEAVY).length > 0
    && c.degree >= 2],
  ['N7', (c) => c.charge === 0 && c.h === 0 && !c.arom
    && c.heavy.filter(ALIPHATIC_HEAVY).length === 3],
  ['N8', (c) => c.charge === 0 && c.h === 0 && !c.arom && c.heavy.some(AROMATIC_ANY)
    && c.degree === 3],
  ['N9', (c) => c.charge === 0 && !c.arom && c.tripleTo(ALIPHATIC_HEAVY).length > 0],
  ['N11', (c) => c.arom && c.charge === 0],
  ['N10', (c) => c.charge > 0 && c.h >= 1 && !c.arom],
  ['N12', (c) => c.charge > 0 && c.arom],
  ['N13', (c) => c.charge > 0 && c.h === 0 && !c.arom && c.degree >= 3],
  ['N14', (c) => c.charge !== 0]
];

const OXYGEN_RULES = [
  ['O1', (c) => c.arom],
  ['O2', (c) => c.h >= 1 && c.charge === 0],
  ['O3', (c) => !c.arom && c.charge === 0 && c.degree === 2
    && c.heavy.every(ALIPHATIC_HEAVY) && c.links.every((link) => link.order === 1)],
  ['O4', (c) => !c.arom && c.charge === 0 && c.degree === 2 && c.heavy.some(AROMATIC_ANY)
    && c.links.every((link) => link.order === 1)],
  ['O5', (c) => c.doubleTo((a) => a.element === 'N' || a.element === 'O').length > 0],
  ['O5', (c) => c.charge < 0 && c.degree === 1 && c.heavy.some((a) => a.element === 'N')],
  ['O6', (c) => c.charge < 0 && c.degree === 1 && c.heavy.some((a) => a.element === 'S')],
  ['O6', (c) => c.charge === 0 && c.doubleTo((a) => a.element === 'S').length > 0],
  ['O12', (c) => c.charge < 0 && c.carboxylate],
  ['O7', (c) => c.charge < 0 && c.degree === 1
    && c.heavy.every((a) => a.element !== 'N' && a.element !== 'S')],
  ['O8', (c) => c.doubleTo(AROMATIC_ANY).length > 0],
  ['O9', (c) => c.carbonyl && c.carbonylKind === 'O9'],
  ['O10', (c) => c.carbonyl && c.carbonylKind === 'O10'],
  ['O11', (c) => c.carbonyl && c.carbonylKind === 'O11']
];

function classifyCarbonylOxygen(mol, atom, c) {
  const link = c.links.find((entry) => entry.order === 2 && entry.atom.element === 'C');
  if (!link) return null;
  const carbon = link.atom;
  const others = carbon.neighbors
    .filter((entry) => mol.atoms[entry.atom] !== atom)
    .map((entry) => mol.atoms[entry.atom])
    .filter((other) => other !== atom);
  const carbonH = carbon.totalH;
  const isHetero = (a) => a.element !== 'C' && a.element !== 'H';

  if (carbonH >= 1) {
    if (others.some(AROMATIC_CARBON)) return 'O10';
    if (others.some((a) => ALIPHATIC_CARBON(a))) return 'O9';
    if (others.some((a) => a.element === 'N' || a.element === 'O')) return 'O9';
    if (!others.length) return 'O9';
    return 'O9';
  }
  if (others.every(isHetero) && others.length >= 2) return 'O11';
  if (others.some(AROMATIC_ANY) && others.some((a) => a.element === 'C')) return 'O10';
  if (others.some(AROMATIC_CARBON) && others.some(ALIPHATIC_HEAVY)) return 'O10';
  if (others.some(ALIPHATIC_CARBON) && others.every(ALIPHATIC_HEAVY)) return 'O9';
  return 'O9';
}

const SULFUR_RULES = [
  ['S2', (c) => c.charge !== 0],
  ['S2', (c) => c.charge === 0
    && c.doubleTo((a) => ['N', 'O', 'P', 'S'].includes(a.element)).length > 0],
  ['S1', (c) => !c.arom],
  ['S3', (c) => c.arom]
];

function applyRules(rules, context, fallback) {
  for (let k = 0; k < rules.length; k += 1) {
    if (rules[k][1](context)) return rules[k][0];
  }
  return fallback;
}

function crippenAtomType(mol, atom) {
  const c = crippenContext(mol, atom);

  switch (atom.element) {
    case 'C': return applyRules(CARBON_RULES, c, 'CS');
    case 'N': return applyRules(NITROGEN_RULES, c, 'NS');
    case 'O': {
      c.carbonyl = c.doubleTo((a) => a.element === 'C' && !a.aromatic).length > 0;
      c.carbonylKind = c.carbonyl ? classifyCarbonylOxygen(mol, atom, c) : null;
      c.carboxylate = c.charge < 0 && c.degree === 1 && c.heavy.some((a) => {
        if (a.element !== 'C') return false;
        return a.neighbors.some((link) => mol.bonds[link.bond].order === 2
          && mol.atoms[link.atom].element === 'O');
      });
      return applyRules(OXYGEN_RULES, c, 'OS');
    }
    case 'S': return applyRules(SULFUR_RULES, c, 'S1');
    case 'P': return 'P';
    case 'F': return c.charge === 0 ? 'F' : 'Hal';
    case 'Cl': return c.charge === 0 ? 'Cl' : 'Hal';
    case 'Br': return c.charge === 0 ? 'Br' : 'Hal';
    case 'I': return c.charge === 0 ? 'I' : 'Hal';
    default:
      if (ME1_ELEMENTS.has(atom.element)) return 'Me1';
      return 'ZERO';
  }
}

function crippenHydrogenType(mol, atom) {
  const element = atom.element;
  if (element === 'C' || element === 'H') return 'H1';

  if (element === 'O') {
    const neighbor = atom.neighbors.length ? mol.atoms[atom.neighbors[0].atom] : null;
    if (!neighbor) return 'HS';
    if (neighbor.element === 'C') {
      const sp3 = !neighbor.aromatic
        && neighbor.neighbors.every((link) => mol.bonds[link.bond].order === 1)
        && neighbor.degree + neighbor.totalH === 4;
      if (sp3 || neighbor.aromatic) return 'H2';
      const conjugated = neighbor.neighbors.some((link) => {
        const bond = mol.bonds[link.bond];
        return bond.order === 2 && ['C', 'N', 'O', 'S'].includes(mol.atoms[link.atom].element);
      });
      if (conjugated) return 'H4';
      return 'H2';
    }
    if (neighbor.element === 'N') return 'H3';
    if (neighbor.element === 'O' || neighbor.element === 'S') return 'H4';
    return 'H2';
  }

  if (element === 'N') return 'H3';
  if (element !== 'C' && element !== 'N' && element !== 'O') return 'H2';
  return 'HS';
}

function crippen(mol) {
  let logp = 0;
  let mr = 0;
  const types = [];
  mol.atoms.forEach((atom) => {
    const type = crippenAtomType(mol, atom);
    const row = CRIPPEN[type] || CRIPPEN.ZERO;
    let atomLogp = row[0];
    let atomMr = row[1];

    if (atom.totalH > 0) {
      const hType = crippenHydrogenType(mol, atom);
      const hRow = CRIPPEN[hType] || CRIPPEN.HS;
      atomLogp += atom.totalH * hRow[0];
      atomMr += atom.totalH * hRow[1];
    }

    logp += atomLogp;
    mr += atomMr;
    types.push({ atom: atom.index, type, logp: atomLogp, mr: atomMr });
  });
  return { logp, mr, types };
}

function lipinskiHBD(mol) {
  let count = 0;
  mol.atoms.forEach((atom) => {
    if (atom.element === 'N' || atom.element === 'O') count += atom.totalH;
  });
  return count;
}

function lipinskiHBA(mol) {
  return mol.atoms.filter((atom) => atom.element === 'N' || atom.element === 'O').length;
}

function strictHBD(mol) {
  return mol.atoms.filter((atom) => {
    if (atom.element === 'N' || atom.element === 'O') return atom.totalH > 0;
    return atom.element === 'S' && atom.charge === 0 && atom.totalH === 1;
  }).length;
}

function hbaValence(mol, atom) {
  const orders = atom.neighbors.reduce((sum, link) => sum + mol.bonds[link.bond].order, 0);
  return orders + (atom.totalH || 0);
}

function hbaWithdrawn(mol, index, atom) {
  return atom.neighbors.some((link) => {
    if (mol.bonds[link.bond].order !== 1) return false;
    const partner = mol.atoms[link.atom];
    return partner.neighbors.some((inner) => {
      if (inner.atom === index) return false;
      const bond = mol.bonds[inner.bond];
      if (bond.order !== 2 || bond.ring) return false;
      return ['O', 'N', 'P', 'S'].includes(mol.atoms[inner.atom].element);
    });
  });
}

function strictHBA(mol) {
  return mol.atoms.filter((atom, index) => {
    if (atom.aromatic) {
      if (atom.charge !== 0) return false;
      if (atom.element === 'O' || atom.element === 'S') return true;
      return atom.element === 'N' && atom.totalH === 0 && atom.degree === 2;
    }
    if (atom.element === 'O' || atom.element === 'S') {
      if (atom.charge < 0) return true;
      if (atom.charge !== 0) return false;
      if (hbaValence(mol, atom) !== 2) return false;
      if (atom.totalH === 1) return !hbaWithdrawn(mol, index, atom);
      return atom.totalH === 0;
    }
    if (atom.element !== 'N') return false;
    if (atom.charge !== 0) return false;
    if (hbaValence(mol, atom) !== 3) return false;
    return !hbaWithdrawn(mol, index, atom);
  }).length;
}

function inTripleBond(mol, atom) {
  return atom.neighbors.some((link) => mol.bonds[link.bond].order === 3);
}

function isBulkyCarbon(mol, atom) {
  if (atom.element !== 'C') return false;
  const heavy = atom.neighbors.map((link) => mol.atoms[link.atom]);
  const halides = ['F', 'Cl', 'Br'];
  for (let k = 0; k < halides.length; k += 1) {
    if (heavy.filter((other) => other.element === halides[k]).length >= 3) return true;
  }
  const methyls = heavy.filter((other) => other.element === 'C' && other.totalH === 3 && other.degree === 1);
  return methyls.length >= 3;
}

function isAmidineCarbon(mol, atom) {
  if (atom.element !== 'C' || atom.aromatic || atom.degree !== 3) return false;
  const doubleHetero = atom.neighbors.some((link) => {
    const other = mol.atoms[link.atom];
    return mol.bonds[link.bond].order === 2 && !other.aromatic
      && ['N', 'O', 'S'].includes(other.element);
  });
  if (!doubleHetero) return false;
  return atom.neighbors.some((link) => {
    const bond = mol.bonds[link.bond];
    const other = mol.atoms[link.atom];
    if (bond.order !== 1 || bond.ring) return false;
    if (other.element === 'N' || other.element === 'O') return true;
    return other.element === 'S' && other.degree > 1;
  });
}

function isAmidineHeteroatom(mol, atom) {
  const self = atom.element === 'N' || atom.element === 'O'
    || (atom.element === 'S' && atom.degree > 1);
  if (!self) return false;
  return atom.neighbors.some((link) => {
    const bond = mol.bonds[link.bond];
    if (bond.order !== 1 || bond.ring) return false;
    return isAmidineCarbon(mol, mol.atoms[link.atom]);
  });
}

function rotatableEndBasic(mol, atom) {
  if (atom.degree < 2) return false;
  if (inTripleBond(mol, atom)) return false;
  return !isBulkyCarbon(mol, atom);
}

function rotatableEndStrict(mol, atom) {
  if (!rotatableEndBasic(mol, atom)) return false;
  if (isAmidineCarbon(mol, atom)) return false;
  return !isAmidineHeteroatom(mol, atom);
}

function rotatableBonds(mol) {
  let count = 0;
  mol.bonds.forEach((bond) => {
    if (bond.order !== 1 || bond.aromatic || bond.ring) return;
    const a = mol.atoms[bond.a];
    const b = mol.atoms[bond.b];
    const forward = rotatableEndStrict(mol, a) && rotatableEndBasic(mol, b);
    const reverse = rotatableEndStrict(mol, b) && rotatableEndBasic(mol, a);
    if (forward || reverse) count += 1;
  });
  return count;
}

function maxBondOrder(mol, atom) {
  let best = 1;
  for (const link of atom.neighbors) {
    const order = mol.bonds[link.bond].order;
    if (order > best) best = order;
  }
  return best;
}

function fractionCsp3(mol) {
  const carbons = mol.atoms.filter((atom) => atom.element === 'C');
  if (!carbons.length) return 0;
  const sp3 = carbons.filter((atom) => !atom.aromatic && maxBondOrder(mol, atom) === 1).length;
  return sp3 / carbons.length;
}

function aromaticProportion(mol) {
  const heavy = mol.atoms.filter((atom) => atom.element !== 'H');
  if (!heavy.length) return 0;
  return heavy.filter((atom) => atom.aromatic).length / heavy.length;
}

function countRingsAromatic(mol) {
  return mol.rings.filter((ring) => ring.aromatic).length;
}

function heavyAtoms(mol) {
  return mol.atoms.filter((atom) => atom.element !== 'H').length;
}

function heteroatoms(mol) {
  return mol.atoms.filter((atom) => atom.element !== 'C' && atom.element !== 'H').length;
}

function carbonCount(mol) {
  return mol.atoms.filter((atom) => atom.element === 'C').length;
}

function formalCharge(mol) {
  return mol.atoms.reduce((sum, atom) => sum + (atom.charge || 0), 0);
}

const HALOGEN_ELEMENTS = ['F', 'Cl', 'Br', 'I'];

const HK_ALPHA = {
  'C.sp3': 0.0, 'C.sp2': -0.13, 'C.sp': -0.22,
  'N.sp3': -0.04, 'N.sp2': -0.20, 'N.sp': -0.29,
  'O.sp3': -0.04, 'O.sp2': -0.20,
  'P.sp3': 0.43, 'P.sp2': 0.30,
  'S.sp3': 0.35, 'S.sp2': 0.22,
  F: -0.07, Cl: 0.29, Br: 0.48, I: 0.73
};

const VALENCE_ELECTRONS = {
  H: 1, B: 3, C: 4, N: 5, O: 6, F: 7, Si: 4, P: 5, S: 6, Cl: 7,
  As: 5, Se: 6, Br: 7, Te: 6, I: 7
};

const ATOMIC_NUMBER = {
  H: 1, B: 5, C: 6, N: 7, O: 8, F: 9, Si: 14, P: 15, S: 16, Cl: 17,
  As: 33, Se: 34, Br: 35, Te: 52, I: 53
};

const LONE_PAIR_ELEMENTS = new Set(['N', 'O', 'P', 'S', 'Se']);

function conjugatedLonePair(mol, atom) {
  if (!LONE_PAIR_ELEMENTS.has(atom.element)) return false;
  if (atom.element === 'S' || atom.element === 'P') return false;
  return atom.neighbors.some((link) => {
    const other = mol.atoms[link.atom];
    if (other.element === 'S' || other.element === 'P') return false;
    return other.aromatic || maxBondOrder(mol, other) > 1;
  });
}

function hybridization(mol, atom) {
  if (atom.aromatic) return 'sp2';
  const order = maxBondOrder(mol, atom);
  const bulky = (atom.element === 'S' || atom.element === 'P') && atom.degree + atom.totalH >= 3;
  if (bulky) return 'sp3';
  const doubles = atom.neighbors.filter((link) => mol.bonds[link.bond].order === 2).length;
  if (doubles >= 2) return 'sp';
  if (order >= 3) return 'sp';
  if (order === 2) return 'sp2';
  return conjugatedLonePair(mol, atom) ? 'sp2' : 'sp3';
}

function hallKierAlpha(mol) {
  let total = 0;
  mol.atoms.forEach((atom) => {
    if (atom.element === 'H') return;
    const keyed = HK_ALPHA[atom.element + '.' + hybridization(mol, atom)];
    const plain = HK_ALPHA[atom.element];
    if (typeof keyed === 'number') total += keyed;
    else if (typeof plain === 'number') total += plain;
  });
  return total;
}

function heavyDegrees(mol) {
  return mol.atoms.map((atom) => (
    atom.element === 'H' ? 0 : atom.neighbors.filter((link) => mol.atoms[link.atom].element !== 'H').length
  ));
}

function valenceDegrees(mol) {
  return mol.atoms.map((atom) => {
    if (atom.element === 'H') return 0;
    const zv = VALENCE_ELECTRONS[atom.element];
    if (!zv) return 0;
    const hydrogens = atom.totalH;
    const z = ATOMIC_NUMBER[atom.element] || 6;
    if (z <= 10) return zv - hydrogens;
    return (zv - hydrogens) / (z - zv - 1);
  });
}

function chiIndices(mol) {
  const delta = heavyDegrees(mol);
  const valence = valenceDegrees(mol);
  let chi0 = 0;
  let chi0v = 0;
  mol.atoms.forEach((atom, index) => {
    if (atom.element === 'H') return;
    if (delta[index] > 0) chi0 += 1 / Math.sqrt(delta[index]);
    if (valence[index] > 0) chi0v += 1 / Math.sqrt(valence[index]);
  });
  let chi1 = 0;
  let chi1v = 0;
  mol.bonds.forEach((bond) => {
    if (mol.atoms[bond.a].element === 'H' || mol.atoms[bond.b].element === 'H') return;
    const product = delta[bond.a] * delta[bond.b];
    if (product > 0) chi1 += 1 / Math.sqrt(product);
    const valenceProduct = valence[bond.a] * valence[bond.b];
    if (valenceProduct > 0) chi1v += 1 / Math.sqrt(valenceProduct);
  });
  return { chi0, chi1, chi0v, chi1v };
}

function pathsOfLength(mol, length) {
  const heavy = (index) => mol.atoms[index].element !== 'H';
  const found = new Set();
  const walk = (tail, used) => {
    if (used.length === length) {
      found.add(used.slice().sort((a, b) => a - b).join(','));
      return;
    }
    mol.atoms[tail].neighbors.forEach((link) => {
      if (!heavy(link.atom) || used.includes(link.bond)) return;
      used.push(link.bond);
      walk(link.atom, used);
      used.pop();
    });
  };
  mol.atoms.forEach((atom, index) => { if (heavy(index)) walk(index, []); });
  return found.size;
}

function kappaShapes(mol) {
  const atoms = heavyAtoms(mol);
  const alpha = hallKierAlpha(mol);
  const bonds = mol.bonds.filter((bond) => (
    mol.atoms[bond.a].element !== 'H' && mol.atoms[bond.b].element !== 'H'
  )).length;
  const p2 = pathsOfLength(mol, 2);
  const p3 = pathsOfLength(mol, 3);
  const a = atoms + alpha;
  const kappa1 = bonds + alpha > 0 ? (a * (a - 1) * (a - 1)) / ((bonds + alpha) * (bonds + alpha)) : 0;
  const kappa2 = p2 + alpha !== 0 ? ((a - 1) * (a - 2) * (a - 2)) / ((p2 + alpha) * (p2 + alpha)) : 0;
  let kappa3 = 0;
  if (p3 + alpha !== 0) {
    const lead = atoms % 2 ? a - 1 : a - 2;
    kappa3 = (lead * (a - 3) * (a - 3)) / ((p3 + alpha) * (p3 + alpha));
  }
  return { hallKierAlpha: alpha, kappa1, kappa2, kappa3 };
}

function ringIsAliphatic(mol, ring) {
  return cycleBondList(mol, ring).some((bond) => !bond.aromatic);
}

function cycleBondList(mol, ring) {
  const list = [];
  for (let k = 0; k < ring.length; k += 1) {
    const bond = findBond(mol, ring[k], ring[(k + 1) % ring.length]);
    if (bond) list.push(bond);
  }
  return list;
}

function countAliphaticRings(mol) {
  return mol.rings.filter((ring) => ringIsAliphatic(mol, ring)).length;
}

function countSaturatedRings(mol) {
  return mol.rings.filter((ring) => (
    cycleBondList(mol, ring).every((bond) => !bond.aromatic && bond.order === 1)
      && ring.every((id) => !mol.atoms[id].aromatic)
  )).length;
}

function countHeterocycles(mol) {
  return mol.rings.filter((ring) => ring.some((id) => (
    mol.atoms[id].element !== 'C' && mol.atoms[id].element !== 'H'
  ))).length;
}

function countHalogens(mol) {
  return mol.atoms.filter((atom) => HALOGEN_ELEMENTS.includes(atom.element)).length;
}

function countAmideBonds(mol) {
  let total = 0;
  mol.bonds.forEach((bond) => {
    const a = mol.atoms[bond.a];
    const b = mol.atoms[bond.b];
    const pair = a.element === 'C' && b.element === 'N' ? [bond.a, bond.b]
      : (b.element === 'C' && a.element === 'N' ? [bond.b, bond.a] : null);
    if (!pair) return;
    if (bond.order !== 1 || a.aromatic || b.aromatic) return;
    const carbon = mol.atoms[pair[0]];
    const carbonyl = carbon.neighbors.some((link) => (
      mol.atoms[link.atom].element === 'O' && mol.bonds[link.bond].order === 2
    ));
    if (carbonyl) total += 1;
  });
  return total;
}

function countSpiroAtoms(mol) {
  const spiro = new Set();
  for (let i = 0; i < mol.rings.length; i += 1) {
    for (let j = i + 1; j < mol.rings.length; j += 1) {
      const shared = mol.rings[i].filter((id) => mol.rings[j].includes(id));
      if (shared.length === 1) spiro.add(shared[0]);
    }
  }
  return spiro.size;
}

function countBridgeheadAtoms(mol) {
  const bridge = new Set();
  for (let i = 0; i < mol.rings.length; i += 1) {
    const keysI = new Set(cycleBondKeys(mol.rings[i]));
    for (let j = i + 1; j < mol.rings.length; j += 1) {
      const sharedKeys = cycleBondKeys(mol.rings[j]).filter((key) => keysI.has(key));
      if (sharedKeys.length < 2) continue;
      const incident = new Map();
      sharedKeys.forEach((key) => {
        key.split(':').map(Number).forEach((id) => incident.set(id, (incident.get(id) || 0) + 1));
      });
      incident.forEach((count, id) => { if (count === 1) bridge.add(id); });
    }
  }
  return bridge.size;
}

function largestRing(mol) {
  return mol.rings.reduce((best, ring) => Math.max(best, ring.length), 0);
}

function describe(mol) {
  const crippenResult = crippen(mol);
  return {
    formula: molecularFormula(mol),
    mw: molecularWeight(mol),
    exactMass: exactMass(mol),
    heavyAtoms: heavyAtoms(mol),
    carbons: carbonCount(mol),
    heteroatoms: heteroatoms(mol),
    aromaticAtoms: mol.atoms.filter((atom) => atom.aromatic).length,
    aromaticProportion: aromaticProportion(mol),
    rings: mol.rings.length,
    aromaticRings: countRingsAromatic(mol),
    tpsa: tpsa(mol),
    logp: crippenResult.logp,
    mr: crippenResult.mr,
    hbd: lipinskiHBD(mol),
    hba: lipinskiHBA(mol),
    hbdStrict: strictHBD(mol),
    hbaStrict: strictHBA(mol),
    rotatableBonds: rotatableBonds(mol),
    fractionCsp3: fractionCsp3(mol),
    charge: formalCharge(mol),
    aliphaticRings: countAliphaticRings(mol),
    saturatedRings: countSaturatedRings(mol),
    heterocycles: countHeterocycles(mol),
    largestRing: largestRing(mol),
    halogens: countHalogens(mol),
    amideBonds: countAmideBonds(mol),
    spiroAtoms: countSpiroAtoms(mol),
    bridgeheadAtoms: countBridgeheadAtoms(mol),
    chi: chiIndices(mol),
    shape: kappaShapes(mol),
    crippenTypes: crippenResult.types
  };
}

if (typeof module !== 'undefined' && module.exports) {
  const molModule = require('./mol.js');
  global.findBond = molModule.findBond;
  global.cycleBondKeys = molModule.cycleBondKeys;
  global.molecularFormula = molModule.molecularFormula;
  global.molecularWeight = molModule.molecularWeight;
  global.exactMass = molModule.exactMass;
  module.exports = {
    describe, tpsa, crippen, rotatableBonds, fractionCsp3,
    chiIndices, kappaShapes, hallKierAlpha, countAmideBonds, countHeterocycles,
    lipinskiHBD, lipinskiHBA, strictHBD, strictHBA, CRIPPEN, crippenAtomType
  };
}
