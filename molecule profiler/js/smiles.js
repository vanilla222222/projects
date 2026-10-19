'use strict';

const ORGANIC_SUBSET = ['Cl', 'Br', 'B', 'C', 'N', 'O', 'P', 'S', 'F', 'I', 'b', 'c', 'n', 'o', 'p', 's'];

const AROMATIC_LOWER = new Set(['b', 'c', 'n', 'o', 'p', 's', 'se', 'as', 'te']);

const ELEMENT_SYMBOLS = new Set([
  'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne',
  'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar',
  'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn',
  'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr',
  'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd',
  'In', 'Sn', 'Sb', 'Te', 'I', 'Xe',
  'Cs', 'Ba', 'La', 'Ce', 'Pr', 'Nd', 'Pm', 'Sm', 'Eu', 'Gd', 'Tb', 'Dy',
  'Ho', 'Er', 'Tm', 'Yb', 'Lu', 'Hf', 'Ta', 'W', 'Re', 'Os', 'Ir', 'Pt',
  'Au', 'Hg', 'Tl', 'Pb', 'Bi', 'Po', 'At', 'Rn', 'Fr', 'Ra', 'Ac', 'Th',
  'Pa', 'U', 'Np', 'Pu'
]);

const BOND_ORDERS = { '-': 1, '=': 2, '#': 3, '$': 4, ':': 1, '/': 1, '\\': 1 };

function bondDirection(symbol) {
  if (symbol === '/') return 1;
  if (symbol === '\\') return -1;
  return 0;
}

function smilesError(message, position) {
  const err = new Error(message);
  err.position = position;
  return err;
}

function parseSmiles(text) {
  const src = String(text || '').trim();
  if (!src) throw smilesError('Empty input', 0);

  const atoms = [];
  const bonds = [];
  const ringOpen = new Map();
  const stack = [];
  let previous = null;
  let pendingBond = null;
  let pendingDot = false;
  let i = 0;

  const addAtom = (atom) => {
    atom.index = atoms.length;
    atom.order = [];
    atoms.push(atom);
    return atom;
  };

  const addBond = (a, b, order, aromatic, position, dir) => {
    if (a === b) throw smilesError('Atom bonded to itself', position);
    const exists = bonds.some((bond) => (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a));
    if (exists) throw smilesError('Duplicate bond between the same two atoms', position);
    bonds.push({ a, b, order, aromatic: !!aromatic, dir: dir || 0 });
  };

  const connect = (atom, position) => {
    if (pendingDot) {
      pendingDot = false;
      pendingBond = null;
      previous = atom.index;
      return;
    }
    if (previous !== null) {
      const symbol = pendingBond;
      const bothAromatic = atoms[previous].aromatic && atom.aromatic;
      let order;
      let aromatic;
      if (symbol === null) {
        order = bothAromatic ? 1 : 1;
        aromatic = bothAromatic;
      } else {
        order = BOND_ORDERS[symbol];
        aromatic = symbol === ':';
      }
      addBond(previous, atom.index, order, aromatic, position, bondDirection(symbol));
      atoms[previous].order.push(atom.index);
      atom.order.push(previous);
    }
    pendingBond = null;
    previous = atom.index;
  };

  while (i < src.length) {
    const ch = src[i];

    if (ch === ' ' || ch === '\t') break;

    if (ch === '(') {
      if (previous === null) throw smilesError('Branch opens before any atom', i);
      stack.push(previous);
      i += 1;
      continue;
    }

    if (ch === ')') {
      if (!stack.length) throw smilesError('Unmatched closing parenthesis', i);
      previous = stack.pop();
      i += 1;
      continue;
    }

    if (ch === '.') {
      pendingDot = true;
      previous = null;
      i += 1;
      continue;
    }

    if (ch === '<' && src[i + 1] === '-') {
      if (pendingBond !== null) throw smilesError('Two bond symbols in a row', i);
      pendingBond = '-';
      i += 2;
      continue;
    }

    if (ch in BOND_ORDERS) {
      if (pendingBond !== null) throw smilesError('Two bond symbols in a row', i);
      pendingBond = ch;
      if (ch === '-' && src[i + 1] === '>') { i += 2; continue; }
      i += 1;
      continue;
    }

    if (ch === '%') {
      const digits = src.slice(i + 1, i + 3);
      if (!/^\d\d$/.test(digits)) throw smilesError('Ring label after % needs two digits', i);
      i = closeOrOpenRing(digits, i, i + 3);
      continue;
    }

    if (/\d/.test(ch)) {
      i = closeOrOpenRing(ch, i, i + 1);
      continue;
    }

    if (ch === '[') {
      const end = src.indexOf(']', i);
      if (end < 0) throw smilesError('Unclosed bracket atom', i);
      const atom = parseBracketAtom(src.slice(i + 1, end), i);
      addAtom(atom);
      connect(atom, i);
      if (atom.chirality && atom.explicitH) atom.order.push(null);
      i = end + 1;
      continue;
    }

    const two = src.slice(i, i + 2);
    const symbol = ORGANIC_SUBSET.includes(two) ? two : (ORGANIC_SUBSET.includes(ch) ? ch : null);
    if (symbol) {
      const aromatic = AROMATIC_LOWER.has(symbol);
      const atom = addAtom({
        element: aromatic ? symbol.toUpperCase() : symbol,
        aromatic,
        charge: 0,
        explicitH: null,
        isotope: null,
        bracket: false,
        chirality: null
      });
      connect(atom, i);
      i += symbol.length;
      continue;
    }

    if (AROMATIC_LOWER.has(two)) {
      const atom = addAtom({
        element: two.charAt(0).toUpperCase() + two.charAt(1),
        aromatic: true,
        charge: 0,
        explicitH: null,
        isotope: null,
        bracket: false,
        chirality: null
      });
      connect(atom, i);
      i += 2;
      continue;
    }

    throw smilesError('Unexpected character "' + ch + '"', i);
  }

  function closeOrOpenRing(label, position, next) {
    if (previous === null) throw smilesError('Ring label before any atom', position);
    const key = String(Number(label));
    if (ringOpen.has(key)) {
      const open = ringOpen.get(key);
      ringOpen.delete(key);
      const symbol = pendingBond || open.bond;
      const bothAromatic = atoms[open.atom].aromatic && atoms[previous].aromatic;
      const order = symbol ? BOND_ORDERS[symbol] : 1;
      const aromatic = symbol ? symbol === ':' : bothAromatic;
      const dir = pendingBond ? -bondDirection(pendingBond) : bondDirection(open.bond);
      addBond(open.atom, previous, order, aromatic, position, dir);
      const slot = atoms[open.atom].order.indexOf(open.slot);
      if (slot >= 0) atoms[open.atom].order[slot] = previous;
      atoms[previous].order.push(open.atom);
      pendingBond = null;
    } else {
      const slot = { ring: key };
      atoms[previous].order.push(slot);
      ringOpen.set(key, { atom: previous, bond: pendingBond, slot: slot });
      pendingBond = null;
    }
    return next;
  }

  if (stack.length) throw smilesError('Unclosed branch parenthesis', src.length);
  if (ringOpen.size) throw smilesError('Unclosed ring label ' + [...ringOpen.keys()].join(', '), src.length);
  if (pendingBond !== null) throw smilesError('Trailing bond symbol', src.length);
  if (!atoms.length) throw smilesError('No atoms found', 0);

  return { atoms, bonds, smiles: src };
}

function parseBracketAtom(body, position) {
  let rest = body;
  let isotope = null;

  const isotopeMatch = rest.match(/^(\d+)/);
  if (isotopeMatch) {
    isotope = Number(isotopeMatch[1]);
    rest = rest.slice(isotopeMatch[1].length);
  }

  const symbolMatch = rest.match(/^(se|as|te|[a-z]|[A-Z][a-z]?|\*)/);
  if (!symbolMatch) throw smilesError('Bracket atom has no element symbol', position);
  const raw = symbolMatch[1];
  rest = rest.slice(raw.length);

  const aromatic = raw === raw.toLowerCase() && raw !== '*';
  let element;
  if (raw === '*') element = '*';
  else if (aromatic) element = raw.charAt(0).toUpperCase() + raw.slice(1);
  else element = raw;

  if (element !== '*' && !ELEMENT_SYMBOLS.has(element)) {
    throw smilesError('Unknown element "' + raw + '"', position);
  }

  let chirality = null;
  const chiralMatch = rest.match(/^@{1,2}(TH|AL|SP|TB|OH)?\d*/);
  if (chiralMatch && chiralMatch[0]) {
    chirality = chiralMatch[0];
    rest = rest.slice(chiralMatch[0].length);
  }

  let explicitH = 0;
  const hMatch = rest.match(/^H(\d+)?/);
  if (hMatch) {
    explicitH = hMatch[1] ? Number(hMatch[1]) : 1;
    rest = rest.slice(hMatch[0].length);
  }

  let charge = 0;
  const chargeMatch = rest.match(/^([+-])(\d+|[+-]*)/);
  if (chargeMatch) {
    const sign = chargeMatch[1] === '+' ? 1 : -1;
    const tail = chargeMatch[2];
    if (/^\d+$/.test(tail)) charge = sign * Number(tail);
    else charge = sign * (1 + tail.length);
    rest = rest.slice(chargeMatch[0].length);
  }

  const mapMatch = rest.match(/^:\d+/);
  if (mapMatch) rest = rest.slice(mapMatch[0].length);

  if (rest.length) throw smilesError('Could not read bracket atom "[' + body + ']"', position);

  return {
    element,
    aromatic,
    charge,
    explicitH,
    isotope,
    bracket: true,
    chirality
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseSmiles, bondDirection, ELEMENT_SYMBOLS, AROMATIC_LOWER };
}
