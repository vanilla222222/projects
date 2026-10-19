'use strict';

const SMARTS_Z = {
  H: 1, He: 2, Li: 3, Be: 4, B: 5, C: 6, N: 7, O: 8, F: 9, Ne: 10,
  Na: 11, Mg: 12, Al: 13, Si: 14, P: 15, S: 16, Cl: 17, Ar: 18,
  K: 19, Ca: 20, Fe: 26, Cu: 29, Zn: 30, As: 33, Se: 34, Br: 35,
  Rb: 37, Sn: 50, I: 53, Cs: 55, Pt: 78, Au: 79, Hg: 80
};

const SMARTS_TWO_LETTER = new Set(['Cl', 'Br', 'Si', 'Se', 'Na', 'Li', 'Be', 'Ne', 'Mg', 'Al',
  'Ar', 'Ca', 'Fe', 'Cu', 'Zn', 'As', 'Rb', 'Sn', 'Cs', 'Pt', 'Au', 'Hg', 'He']);

const SMARTS_AROMATIC_TWO = new Set(['se', 'as', 'te', 'si']);

const SMARTS_ORGANIC = new Set(['B', 'C', 'N', 'O', 'P', 'S', 'F', 'Cl', 'Br', 'I']);

const SMARTS_AROMATIC_ORGANIC = new Set(['b', 'c', 'n', 'o', 'p', 's']);

function smartsError(message, pattern) {
  const error = new Error(message + ' in SMARTS "' + pattern + '"');
  error.smarts = true;
  return error;
}

function parseSmarts(pattern) {
  const atoms = [];
  const bonds = [];
  const ringOpen = new Map();
  const stack = [];
  let previous = null;
  let pendingBond = null;
  let i = 0;

  const addAtom = (expr) => {
    const atom = { expr: expr, index: atoms.length, neighbors: [] };
    atoms.push(atom);
    return atom;
  };

  const addBond = (a, b, expr) => {
    const index = bonds.length;
    bonds.push({ a: a, b: b, expr: expr || { kind: 'default' } });
    atoms[a].neighbors.push({ atom: b, bond: index });
    atoms[b].neighbors.push({ atom: a, bond: index });
  };

  const connect = (atom) => {
    if (previous !== null) addBond(previous, atom.index, pendingBond);
    pendingBond = null;
    previous = atom.index;
  };

  const readBondExpr = () => {
    const start = i;
    while (i < pattern.length && '-=#:~@/\\!&,;'.indexOf(pattern.charAt(i)) >= 0) {
      if (pattern.charAt(i) === '-' && /\d/.test(pattern.charAt(i + 1) || '') && false) break;
      i += 1;
    }
    if (i === start) return null;
    return parseBondExpr(pattern.slice(start, i), pattern);
  };

  while (i < pattern.length) {
    const ch = pattern.charAt(i);

    if (ch === '(') { stack.push(previous); i += 1; continue; }
    if (ch === ')') {
      if (!stack.length) throw smartsError('Unbalanced bracket', pattern);
      previous = stack.pop();
      i += 1;
      continue;
    }
    if (ch === '.') { previous = null; pendingBond = null; i += 1; continue; }

    if ('-=#:~@/\\!'.indexOf(ch) >= 0) {
      const expr = readBondExpr();
      if (!expr) throw smartsError('Bad bond expression', pattern);
      pendingBond = expr;
      continue;
    }

    if (ch === '%' || /\d/.test(ch)) {
      let label;
      if (ch === '%') { label = pattern.substr(i + 1, 2); i += 3; } else { label = ch; i += 1; }
      if (previous === null) throw smartsError('Ring closure with no preceding atom', pattern);
      if (ringOpen.has(label)) {
        const open = ringOpen.get(label);
        ringOpen.delete(label);
        addBond(open.atom, previous, open.bond || pendingBond);
        pendingBond = null;
      } else {
        ringOpen.set(label, { atom: previous, bond: pendingBond });
        pendingBond = null;
      }
      continue;
    }

    if (ch === '[') {
      const close = findSmartsClose(pattern, i);
      const body = pattern.slice(i + 1, close);
      i = close + 1;
      connect(addAtom(parseAtomExpr(body, pattern)));
      continue;
    }

    if (ch === '*') { i += 1; connect(addAtom({ kind: 'any' })); continue; }
    if (ch === 'a') { i += 1; connect(addAtom({ kind: 'aromatic' })); continue; }
    if (ch === 'A') { i += 1; connect(addAtom({ kind: 'aliphatic' })); continue; }

    const two = pattern.substr(i, 2);
    if (SMARTS_ORGANIC.has(two)) {
      i += 2;
      connect(addAtom({ kind: 'element', symbol: two, aromatic: false }));
      continue;
    }
    if (SMARTS_ORGANIC.has(ch)) {
      i += 1;
      connect(addAtom({ kind: 'element', symbol: ch, aromatic: false }));
      continue;
    }
    if (SMARTS_AROMATIC_ORGANIC.has(ch)) {
      i += 1;
      connect(addAtom({ kind: 'element', symbol: ch.toUpperCase(), aromatic: true }));
      continue;
    }
    throw smartsError('Unsupported character "' + ch + '"', pattern);
  }

  if (stack.length) throw smartsError('Unclosed branch', pattern);
  if (ringOpen.size) throw smartsError('Unclosed ring bond', pattern);
  if (!atoms.length) throw smartsError('Empty pattern', pattern);

  return { atoms: atoms, bonds: bonds, source: pattern, order: smartsOrder(atoms) };
}

function findSmartsClose(pattern, open) {
  let depth = 0;
  for (let k = open; k < pattern.length; k += 1) {
    const ch = pattern.charAt(k);
    if (ch === '[') depth += 1;
    else if (ch === ']') { depth -= 1; if (!depth) return k; }
  }
  throw smartsError('Unclosed atom bracket', pattern);
}

function parseAtomExpr(body, pattern) {
  const cursor = { text: body, i: 0, pattern: pattern };
  const expr = parseAtomOr(cursor, ';');
  if (cursor.i < body.length) throw smartsError('Trailing "' + body.slice(cursor.i) + '"', pattern);
  return expr;
}

function parseAtomOr(cursor, separator) {
  const terms = [separator === ';' ? parseAtomOr(cursor, ',') : parseAtomAnd(cursor)];
  while (cursor.i < cursor.text.length && cursor.text.charAt(cursor.i) === separator) {
    cursor.i += 1;
    terms.push(separator === ';' ? parseAtomOr(cursor, ',') : parseAtomAnd(cursor));
  }
  if (terms.length === 1) return terms[0];
  return { kind: separator === ';' ? 'and' : 'or', terms: terms };
}

function parseAtomAnd(cursor) {
  const terms = [parseAtomNot(cursor)];
  for (;;) {
    const ch = cursor.text.charAt(cursor.i);
    if (ch === '&') { cursor.i += 1; terms.push(parseAtomNot(cursor)); continue; }
    if (cursor.i < cursor.text.length && ch !== ',' && ch !== ';' && ch !== ')') {
      terms.push(parseAtomNot(cursor));
      continue;
    }
    break;
  }
  if (terms.length === 1) return terms[0];
  return { kind: 'and', terms: terms };
}

function parseAtomNot(cursor) {
  if (cursor.text.charAt(cursor.i) === '!') {
    cursor.i += 1;
    return { kind: 'not', term: parseAtomNot(cursor) };
  }
  return parseAtomPrimitive(cursor);
}

function readSmartsNumber(cursor) {
  const match = cursor.text.slice(cursor.i).match(/^\d+/);
  if (!match) return null;
  cursor.i += match[0].length;
  return Number(match[0]);
}

function parseAtomPrimitive(cursor) {
  const text = cursor.text;
  const ch = text.charAt(cursor.i);
  if (!ch) throw smartsError('Atom expression ended early', cursor.pattern);

  if (ch === '*') { cursor.i += 1; return { kind: 'any' }; }
  if (ch === 'a') { cursor.i += 1; return { kind: 'aromatic' }; }
  if (ch === 'A') { cursor.i += 1; return { kind: 'aliphatic' }; }

  if (ch === '$') {
    if (text.charAt(cursor.i + 1) !== '(') throw smartsError('Expected "(" after "$"', cursor.pattern);
    let depth = 0;
    let k = cursor.i + 1;
    for (; k < text.length; k += 1) {
      if (text.charAt(k) === '(') depth += 1;
      else if (text.charAt(k) === ')') { depth -= 1; if (!depth) break; }
    }
    if (depth) throw smartsError('Unclosed recursive SMARTS', cursor.pattern);
    const inner = text.slice(cursor.i + 2, k);
    cursor.i = k + 1;
    return { kind: 'recursive', query: parseSmarts(inner), cache: new Map() };
  }

  if (ch === '#') {
    cursor.i += 1;
    const value = readSmartsNumber(cursor);
    if (value === null) throw smartsError('Expected atomic number after "#"', cursor.pattern);
    return { kind: 'atomicNumber', value: value };
  }

  if (ch === '+' || ch === '-') {
    cursor.i += 1;
    let total = ch === '+' ? 1 : -1;
    while (text.charAt(cursor.i) === ch) { cursor.i += 1; total += ch === '+' ? 1 : -1; }
    const explicit = readSmartsNumber(cursor);
    if (explicit !== null) total = ch === '+' ? explicit : -explicit;
    return { kind: 'charge', value: total };
  }

  if ('HDXvRr'.indexOf(ch) >= 0) {
    const two = text.substr(cursor.i, 2);
    if (!(ch === 'H' && SMARTS_TWO_LETTER.has(two)) && !(ch === 'D' && SMARTS_TWO_LETTER.has(two))) {
      cursor.i += 1;
      const value = readSmartsNumber(cursor);
      if (ch === 'H') return { kind: 'hcount', value: value === null ? 1 : value };
      if (ch === 'D') return { kind: 'degree', value: value === null ? 1 : value };
      if (ch === 'X') return { kind: 'connectivity', value: value === null ? 1 : value };
      if (ch === 'v') return { kind: 'valence', value: value === null ? 1 : value };
      if (ch === 'R') {
        if (value === null) return { kind: 'inRing' };
        return { kind: 'ringCount', value: value };
      }
      if (value === null) return { kind: 'inRing' };
      return { kind: 'ringSize', value: value };
    }
  }

  const twoLower = text.substr(cursor.i, 2);
  if (SMARTS_AROMATIC_TWO.has(twoLower)) {
    cursor.i += 2;
    return {
      kind: 'element',
      symbol: twoLower.charAt(0).toUpperCase() + twoLower.charAt(1),
      aromatic: true
    };
  }
  if (SMARTS_TWO_LETTER.has(twoLower)) {
    cursor.i += 2;
    return { kind: 'element', symbol: twoLower, aromatic: false };
  }
  if (/[A-Z]/.test(ch)) {
    cursor.i += 1;
    if (!SMARTS_Z[ch]) throw smartsError('Unknown element "' + ch + '"', cursor.pattern);
    return { kind: 'element', symbol: ch, aromatic: false };
  }
  if (/[a-z]/.test(ch)) {
    cursor.i += 1;
    const symbol = ch.toUpperCase();
    if (!SMARTS_Z[symbol]) throw smartsError('Unknown aromatic element "' + ch + '"', cursor.pattern);
    return { kind: 'element', symbol: symbol, aromatic: true };
  }
  throw smartsError('Unsupported atom primitive "' + ch + '"', cursor.pattern);
}

function parseBondExpr(body, pattern) {
  const cursor = { text: body, i: 0, pattern: pattern };
  const expr = parseBondOr(cursor, ';');
  if (cursor.i < body.length) throw smartsError('Trailing bond text "' + body.slice(cursor.i) + '"', pattern);
  return expr;
}

function parseBondOr(cursor, separator) {
  const terms = [separator === ';' ? parseBondOr(cursor, ',') : parseBondAnd(cursor)];
  while (cursor.i < cursor.text.length && cursor.text.charAt(cursor.i) === separator) {
    cursor.i += 1;
    terms.push(separator === ';' ? parseBondOr(cursor, ',') : parseBondAnd(cursor));
  }
  if (terms.length === 1) return terms[0];
  return { kind: separator === ';' ? 'and' : 'or', terms: terms };
}

function parseBondAnd(cursor) {
  const terms = [parseBondNot(cursor)];
  for (;;) {
    const ch = cursor.text.charAt(cursor.i);
    if (ch === '&') { cursor.i += 1; terms.push(parseBondNot(cursor)); continue; }
    if (cursor.i < cursor.text.length && ch !== ',' && ch !== ';') {
      terms.push(parseBondNot(cursor));
      continue;
    }
    break;
  }
  if (terms.length === 1) return terms[0];
  return { kind: 'and', terms: terms };
}

function parseBondNot(cursor) {
  if (cursor.text.charAt(cursor.i) === '!') {
    cursor.i += 1;
    return { kind: 'not', term: parseBondNot(cursor) };
  }
  const ch = cursor.text.charAt(cursor.i);
  cursor.i += 1;
  if (ch === '-') return { kind: 'single' };
  if (ch === '=') return { kind: 'double' };
  if (ch === '#') return { kind: 'triple' };
  if (ch === ':') return { kind: 'aromaticBond' };
  if (ch === '~') return { kind: 'anyBond' };
  if (ch === '@') return { kind: 'ringBond' };
  if (ch === '/' || ch === '\\') return { kind: 'single' };
  throw smartsError('Unsupported bond symbol "' + ch + '"', cursor.pattern);
}

function smartsOrder(atoms) {
  const order = [];
  const seen = new Array(atoms.length).fill(false);
  for (let start = 0; start < atoms.length; start += 1) {
    if (seen[start]) continue;
    const stack = [start];
    seen[start] = true;
    while (stack.length) {
      const current = stack.pop();
      order.push(current);
      atoms[current].neighbors.forEach((link) => {
        if (!seen[link.atom]) { seen[link.atom] = true; stack.push(link.atom); }
      });
    }
  }
  return order;
}

function atomExprMatches(expr, mol, atom) {
  switch (expr.kind) {
    case 'any': return true;
    case 'aromatic': return !!atom.aromatic;
    case 'aliphatic': return !atom.aromatic;
    case 'element':
      if (atom.element !== expr.symbol) return false;
      return expr.aromatic ? !!atom.aromatic : !atom.aromatic;
    case 'atomicNumber': return SMARTS_Z[atom.element] === expr.value;
    case 'charge': return (atom.charge || 0) === expr.value;
    case 'hcount': return atom.totalH === expr.value;
    case 'degree': return atom.degree === expr.value;
    case 'connectivity': return atom.degree + atom.totalH === expr.value;
    case 'valence': return atom.valence === expr.value;
    case 'inRing': return atom.rings.length > 0;
    case 'ringCount': return atom.rings.length === expr.value;
    case 'ringSize': {
      if (!atom.rings.length) return false;
      let smallest = Infinity;
      atom.rings.forEach((index) => {
        const size = mol.rings[index].length;
        if (size < smallest) smallest = size;
      });
      return smallest === expr.value;
    }
    case 'and': return expr.terms.every((term) => atomExprMatches(term, mol, atom));
    case 'or': return expr.terms.some((term) => atomExprMatches(term, mol, atom));
    case 'not': return !atomExprMatches(expr.term, mol, atom);
    case 'recursive': return recursiveMatches(expr, mol, atom);
    default: return false;
  }
}

function recursiveMatches(expr, mol, atom) {
  let table = expr.cache.get(mol);
  if (!table) { table = new Map(); expr.cache.set(mol, table); }
  if (table.has(atom.index)) return table.get(atom.index);
  table.set(atom.index, false);
  const value = smartsMatches(expr.query, mol, { limit: 1, anchor: atom.index }).length > 0;
  table.set(atom.index, value);
  return value;
}

function bondExprMatches(expr, bond) {
  switch (expr.kind) {
    case 'default': return bond.aromatic || bond.order === 1;
    case 'anyBond': return true;
    case 'single': return bond.order === 1 && !bond.aromatic;
    case 'double': return bond.order === 2 && !bond.aromatic;
    case 'triple': return bond.order === 3;
    case 'aromaticBond': return !!bond.aromatic;
    case 'ringBond': return !!bond.ring;
    case 'and': return expr.terms.every((term) => bondExprMatches(term, bond));
    case 'or': return expr.terms.some((term) => bondExprMatches(term, bond));
    case 'not': return !bondExprMatches(expr.term, bond);
    default: return false;
  }
}

function smartsMatches(query, mol, options) {
  const settings = options || {};
  const limit = settings.limit || Infinity;
  const anchor = settings.anchor === undefined ? null : settings.anchor;
  const size = query.atoms.length;
  const map = new Array(size).fill(-1);
  const used = new Array(mol.atoms.length).fill(false);
  const results = [];
  const seen = new Set();

  const bondBetween = (a, b) => mol.bonds.find((bond) => (
    (bond.a === a && bond.b === b) || (bond.a === b && bond.b === a)
  ));

  const fits = (qi, target) => {
    if (used[target]) return false;
    if (!atomExprMatches(query.atoms[qi].expr, mol, mol.atoms[target])) return false;
    return query.atoms[qi].neighbors.every((link) => {
      if (map[link.atom] < 0) return true;
      const bond = bondBetween(target, map[link.atom]);
      if (!bond) return false;
      return bondExprMatches(query.bonds[link.bond].expr, bond);
    });
  };

  const step = (position) => {
    if (position === query.order.length) {
      const key = map.slice().sort((a, b) => a - b).join(',');
      if (!seen.has(key)) { seen.add(key); results.push(map.slice()); }
      return results.length >= limit;
    }
    const qi = query.order[position];
    let candidates = null;
    if (qi === 0 && anchor !== null) candidates = [anchor];
    if (!candidates) {
      const bound = query.atoms[qi].neighbors.find((link) => map[link.atom] >= 0);
      if (bound) candidates = mol.atoms[map[bound.atom]].neighbors.map((link) => link.atom);
    }
    if (!candidates) candidates = mol.atoms.map((atom) => atom.index);

    for (let k = 0; k < candidates.length; k += 1) {
      const target = candidates[k];
      if (!fits(qi, target)) continue;
      map[qi] = target;
      used[target] = true;
      const done = step(position + 1);
      used[target] = false;
      map[qi] = -1;
      if (done) return true;
    }
    return false;
  };

  step(0);
  return results;
}

const SMARTS_CACHE = new Map();

function compileSmarts(pattern) {
  if (!SMARTS_CACHE.has(pattern)) SMARTS_CACHE.set(pattern, parseSmarts(pattern));
  return SMARTS_CACHE.get(pattern);
}

function hasSmartsMatch(pattern, mol) {
  return smartsMatches(compileSmarts(pattern), mol, { limit: 1 }).length > 0;
}

function countSmartsMatches(pattern, mol) {
  return smartsMatches(compileSmarts(pattern), mol, {}).length;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseSmarts, smartsMatches, compileSmarts, hasSmartsMatch, countSmartsMatches
  };
}
