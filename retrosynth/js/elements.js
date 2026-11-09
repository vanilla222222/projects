'use strict';
// What the engine knows about atoms.
//
// chem lab allows nine elements: C N O S P F Cl Br I. That is enough to teach
// an undergraduate course and it rules out most of modern synthesis by
// construction - no boron means no Suzuki coupling, no silicon means TBS and
// TMS protection cannot be represented as chemistry rather than as a label, and
// no lithium, zinc, tin or palladium means no organometallics beyond a Grignard
// special case. Every one of those is a reaction class a real route needs, so
// the table starts wider.

// Valences a neutral atom will accept. A list, not a single number: sulfur is
// commonly 2, 4 or 6, phosphorus 3 or 5, and collapsing that to one value makes
// every sulfone and phosphate look like a valence error.
const VALENCES = {
  H: [1],
  B: [3], C: [4], N: [3], O: [2], F: [1],
  Si: [4], P: [3, 5], S: [2, 4, 6], Cl: [1],
  Ge: [4], As: [3, 5], Se: [2, 4, 6], Br: [1],
  Sn: [4], Te: [2], I: [1, 3, 5, 7],
  // Metals that appear in reagents. Their valence is not really a fixed number
  // in the organic sense; these are the counts that let a Grignard, an
  // organolithium or a cuprate be written down without tripping the checker.
  Li: [1], Na: [1], K: [1], Mg: [2], Ca: [2], Zn: [2], Cu: [1, 2],
  Pd: [0, 2, 4], Ni: [0, 2], Fe: [2, 3], Al: [3], Ti: [4], Cr: [3, 6], Mn: [2, 7],
};

// Written without brackets in SMILES when their valence is ordinary.
const ORGANIC_SUBSET = new Set(['B', 'C', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I']);

// Can sit in an aromatic ring and be written lower case.
const AROMATIC_CAPABLE = new Set(['B', 'C', 'N', 'O', 'P', 'S', 'Se', 'Si', 'Te', 'As']);

const METALS = new Set(['Li', 'Na', 'K', 'Mg', 'Ca', 'Zn', 'Cu', 'Pd', 'Ni',
  'Fe', 'Al', 'Ti', 'Cr', 'Mn', 'Sn']);

// Monoisotopic masses, for formula and mass reporting.
const MASSES = {
  H: 1.00783, B: 11.00931, C: 12, N: 14.00307, O: 15.99491, F: 18.99840,
  Si: 27.97693, P: 30.97376, S: 31.97207, Cl: 34.96885, Ge: 73.92118,
  As: 74.92160, Se: 79.91652, Br: 78.91834, Sn: 119.90220, Te: 129.90622,
  I: 126.90447, Li: 7.01600, Na: 22.98977, K: 38.96371, Mg: 23.98504,
  Ca: 39.96259, Zn: 63.92914, Cu: 62.92960, Pd: 105.90348, Ni: 57.93535,
  Fe: 55.93494, Al: 26.98154, Ti: 47.94794, Cr: 51.94051, Mn: 54.93805,
};

// Every real element symbol. Separate from VALENCES on purpose: that table is
// "what the engine can put in a molecule", this is "what is a real element".
// The two get confused the moment someone bans osmium or mercury from their
// reagents - entirely reasonable, and neither is something you would bond into
// a structure here.
const SYMBOLS = new Set(('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe '
  + 'Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba '
  + 'La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn '
  + 'Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv '
  + 'Ts Og').split(' '));

function isElementSymbol(text) {
  return SYMBOLS.has(text);
}

function valencesFor(element) {
  return VALENCES[element] || null;
}

function isKnown(element) {
  return Object.prototype.hasOwnProperty.call(VALENCES, element);
}

function isMetal(element) {
  return METALS.has(element);
}

function canBeAromatic(element) {
  return AROMATIC_CAPABLE.has(element);
}

function inOrganicSubset(element) {
  return ORGANIC_SUBSET.has(element);
}

function massOf(element) {
  return MASSES[element] || 0;
}

// How many hydrogens an atom carries implicitly, given what it is already
// bonded to. The rule is the lowest valence that covers the bonds already made;
// anything above the highest known valence is hypervalent and gets none.
function implicitHydrogens(element, charge, bondOrderSum, aromatic) {
  const valences = VALENCES[element];
  if (!valences || METALS.has(element)) {
    return 0;
  }
  // A charge shifts how many bonds the atom wants: N+ behaves like carbon,
  // O- like fluorine. Boron is the exception that proves it, wanting fewer.
  const shift = element === 'B' ? -(charge || 0) : (charge || 0);
  // An aromatic atom has already spent part of its valence on the ring's
  // delocalised bonding, which the integer bond orders do not show.
  const used = bondOrderSum + (aromatic ? 1 : 0);
  for (const valence of valences) {
    const target = valence + shift;
    if (used <= target) {
      return target - used;
    }
  }
  return 0;
}

const EXPORTS_elements = {
  VALENCES, MASSES, SYMBOLS, isElementSymbol, valencesFor, isKnown, isMetal,
  canBeAromatic, inOrganicSubset, massOf, implicitHydrogens,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_elements;
} else if (typeof RETRO !== 'undefined') {
  RETRO.elements = EXPORTS_elements;
}
