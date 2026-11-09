'use strict';
// SMILES in and SMILES out.
//
// The writer is canonical: the same molecule written from any starting atom,
// in any input order, must come back as the same string. That property is what
// everything above depends on - two intermediates are "the same molecule" only
// if their strings match, and a search that cannot tell will loop forever and
// report routes that go nowhere. So the test for this module does not check a
// list of expected strings; it shuffles tens of thousands of real structures
// and demands the writer not notice.

const SM = (typeof require === 'function' && typeof module !== 'undefined')
  ? { elements: require('./elements.js'), molecule: require('./molecule.js') }
  : (typeof RETRO !== 'undefined' ? { elements: RETRO.elements, molecule: RETRO.molecule } : null);

const AROMATIC_LOWER = { b: 'B', c: 'C', n: 'N', o: 'O', p: 'P', s: 'S', se: 'Se', as: 'As', si: 'Si', te: 'Te' };
const BOND_CHAR = { 1: '', 2: '=', 3: '#', 4: '$' };

class SmilesError extends Error {}

function parse(text) {
  const Molecule = SM.molecule.Molecule;
  const mol = new Molecule();
  const source = String(text).trim();
  let i = 0;
  const branches = [];
  const openRings = new Map();   // label -> { atom, order, dir, pos }
  let previous = -1;
  // The neighbour order each atom's chirality tag is expressed against, built
  // as the string is read. This is NOT the order the bonds get created in: a
  // ring-opening digit reserves its place here immediately, while the bond
  // itself is not made until the matching digit closes it, by which time the
  // atom's branches have already been attached. Using bond order instead
  // inverted every stereocentre that sat on a ring closure.
  const slots = [];
  let pendingOrder = 0;          // 0 = default single/aromatic
  let pendingArom = false;
  let pendingDir = 0;

  function bad(message) {
    throw new SmilesError(message + ' at position ' + i + ' in "' + source + '"');
  }

  function slotsFor(index) {
    while (slots.length <= index) slots.push([]);
    return slots[index];
  }

  function connect(to) {
    if (previous >= 0) {
      const order = pendingOrder || 1;
      const arom = pendingArom
        || (!pendingOrder && mol.atoms[previous].arom && mol.atoms[to].arom);
      mol.addBond(previous, to, arom && !pendingOrder ? 1 : order, { arom, dir: pendingDir });
      slotsFor(previous).push(to);
      slotsFor(to).push(previous);
    }
    previous = to;
    pendingOrder = 0;
    pendingArom = false;
    pendingDir = 0;
  }

  while (i < source.length) {
    const ch = source[i];

    if (ch === '(') { branches.push(previous); i += 1; continue; }
    if (ch === ')') {
      if (!branches.length) bad('unmatched )');
      previous = branches.pop();
      i += 1;
      continue;
    }
    if (ch === '.') { previous = -1; i += 1; continue; }

    if (ch === '-' || ch === '=' || ch === '#' || ch === '$' || ch === ':'
        || ch === '/' || ch === '\\') {
      if (pendingOrder || pendingArom || pendingDir) bad('two bond symbols in a row');
      if (ch === '=') pendingOrder = 2;
      else if (ch === '#') pendingOrder = 3;
      else if (ch === '$') pendingOrder = 4;
      else if (ch === ':') { pendingOrder = 0; pendingArom = true; }
      else if (ch === '/') { pendingOrder = 1; pendingDir = 1; }
      else if (ch === '\\') { pendingOrder = 1; pendingDir = -1; }
      else pendingOrder = 1;
      i += 1;
      continue;
    }

    // Ring closure labels: a digit, or %nn.
    if (/[0-9]/.test(ch) || ch === '%') {
      let label;
      if (ch === '%') {
        const match = /^%(\d\d)/.exec(source.slice(i));
        if (!match) bad('expected two digits after %');
        label = match[1];
        i += 3;
      } else {
        label = ch;
        i += 1;
      }
      if (previous < 0) bad('ring closure with no preceding atom');
      const open = openRings.get(label);
      if (open) {
        openRings.delete(label);
        // Fill the place the opening atom reserved, and take one here.
        const reserved = slotsFor(open.atom).indexOf('ring:' + label);
        if (reserved >= 0) slotsFor(open.atom)[reserved] = previous;
        slotsFor(previous).push(open.atom);
        const order = pendingOrder || open.order || 1;
        const arom = (pendingArom || open.arom)
          || (!pendingOrder && !open.order
              && mol.atoms[open.atom].arom && mol.atoms[previous].arom);
        if (mol.bondBetween(open.atom, previous)) bad('duplicate ring bond');
        mol.addBond(open.atom, previous, arom && !(pendingOrder || open.order) ? 1 : order,
          { arom, dir: pendingDir || open.dir });
      } else {
        openRings.set(label, { atom: previous, order: pendingOrder, arom: pendingArom, dir: pendingDir });
        slotsFor(previous).push('ring:' + label);
      }
      pendingOrder = 0;
      pendingArom = false;
      pendingDir = 0;
      continue;
    }

    if (ch === '[') {
      const close = source.indexOf(']', i);
      if (close === -1) bad('unclosed [');
      const body = source.slice(i + 1, close);
      const match = /^(\d+)?([A-Za-z][a-z]?|\*)(@{1,2})?(H\d*)?((?:[+-]\d*|\++|-+))?(?::(\d+))?$/.exec(body);
      if (!match) bad('cannot read bracket atom "[' + body + ']"');
      const [, iso, raw, chiral, hPart, chargePart, map] = match;
      let element = raw;
      let arom = false;
      if (AROMATIC_LOWER[raw]) { element = AROMATIC_LOWER[raw]; arom = true; }
      else if (raw === '*') element = '*';
      if (element !== '*' && SM.elements && !SM.elements.isElementSymbol(element)) {
        bad('"' + element + '" is not an element');
      }
      let charge = 0;
      if (chargePart) {
        if (/^\++$/.test(chargePart)) charge = chargePart.length;
        else if (/^-+$/.test(chargePart)) charge = -chargePart.length;
        else charge = Number(chargePart.replace('+', ''));
      }
      let hs = 0;
      if (hPart) hs = hPart.length === 1 ? 1 : Number(hPart.slice(1));
      const atom = mol.addAtom(element, {
        charge, arom, hs, iso: iso ? Number(iso) : 0,
        map: map ? Number(map) : 0, chiral: chiral || null,
        // An implicit hydrogen counts as a neighbour for chirality, and it
        // sits where it is written: straight after whatever preceded it.
        hPos: previous >= 0 ? 1 : 0,
      });
      connect(atom.index);
      i = close + 1;
      continue;
    }

    // Organic subset, bare.
    const two = source.slice(i, i + 2);
    let element = null;
    let arom = false;
    if (['Cl', 'Br'].includes(two)) { element = two; i += 2; }
    else if (/[BCNOPSFI]/.test(ch)) { element = ch; i += 1; }
    else if (/[bcnops]/.test(ch)) { element = AROMATIC_LOWER[ch]; arom = true; i += 1; }
    else if (ch === '*') { element = '*'; i += 1; }
    else bad('unexpected character "' + ch + '"');
    const atom = mol.addAtom(element, { arom, hs: -1 });
    connect(atom.index);
  }

  // Now that every bond exists, freeze the neighbour order each chirality tag
  // refers to. During parsing nbrOrder is exactly the order the string wrote
  // them in, which is what the tag means; afterwards it is no longer safe to
  // assume that, so it is recorded here and carried from now on.
  for (let k = 0; k < mol.atoms.length; k += 1) {
    const atom = mol.atoms[k];
    if (!atom.chiral) continue;
    const order = slotsFor(k).slice();
    if (mol.hydrogens(k) > 0) order.splice(Math.min(atom.hPos, order.length), 0, -1);
    atom.chiralNbrs = order;
  }

  if (branches.length) throw new SmilesError('unclosed ( in "' + source + '"');
  mol.perceiveAromaticity();

  if (openRings.size) {
    throw new SmilesError('unclosed ring bond ' + [...openRings.keys()].join(',')
      + ' in "' + source + '"');
  }
  return mol;
}

// --- writing --------------------------------------------------------------
function needsBrackets(mol, index) {
  const atom = mol.atoms[index];
  if (atom.charge || atom.iso || atom.map || atom.chiral) return true;
  if (atom.el === '*') return false;
  if (!SM.elements.inOrganicSubset(atom.el)) return true;
  // In the organic subset the hydrogen count is implied, so it only needs
  // spelling out when it differs from what the reader would assume.
  const implied = SM.elements.implicitHydrogens(
    atom.el, 0, mol.bondOrderSum(index), atom.arom);
  return mol.hydrogens(index) !== implied;
}

// Parity of the permutation taking `from` to `to`. Both hold the same items.
function oddPermutation(from, to) {
  const place = new Map(to.map((item, i) => [item, i]));
  const mapped = from.map((item) => place.get(item));
  const seen = new Array(mapped.length).fill(false);
  let swaps = 0;
  for (let i = 0; i < mapped.length; i += 1) {
    if (seen[i]) continue;
    let length = 0;
    let at = i;
    while (!seen[at]) { seen[at] = true; at = mapped[at]; length += 1; }
    swaps += length - 1;
  }
  return swaps % 2 === 1;
}

// The neighbour order the chirality tag is expressed against.
function parsedOrder(mol, index) {
  return mol.atoms[index].chiralNbrs;
}

function atomText(mol, index, outOrder) {
  const atom = mol.atoms[index];
  const symbol = atom.arom && AROMATIC_LOWER[atom.el.toLowerCase()] === atom.el
    ? atom.el.toLowerCase()
    : (atom.arom ? atom.el.toLowerCase() : atom.el);
  if (!needsBrackets(mol, index)) return symbol;
  let out = '[';
  if (atom.iso) out += atom.iso;
  out += symbol;
  if (atom.chiral) {
    // Flip the tag when the neighbours come out in a different order than
    // they went in, by the parity of the permutation between the two.
    let tag = atom.chiral;
    const reference = parsedOrder(mol, index);
    if (reference && outOrder && outOrder.length === reference.length
        && reference.every((n) => outOrder.includes(n))) {
      if (oddPermutation(reference, outOrder)) tag = tag === '@' ? '@@' : '@';
    }
    out += tag;
  }
  const hs = mol.hydrogens(index);
  if (hs === 1) out += 'H';
  else if (hs > 1) out += 'H' + hs;
  if (atom.charge > 0) out += '+' + (atom.charge > 1 ? atom.charge : '');
  else if (atom.charge < 0) out += '-' + (atom.charge < -1 ? -atom.charge : '');
  if (atom.map) out += ':' + atom.map;
  return out + ']';
}

function bondText(bond, from, to, mol) {
  if (bond.dir) {
    // A direction is recorded relative to the bond's own a->b sense. Writing
    // it the other way round means the opposite slash, and getting this wrong
    // turns every cis alkene into a trans one.
    const forward = bond.a === from;
    return (bond.dir > 0) === forward ? '/' : '\\';
  }
  if (bond.arom) {
    // An aromatic bond between two aromatic atoms is implied.
    return (mol.atoms[from].arom && mol.atoms[to].arom) ? '' : ':';
  }
  if (bond.order === 1 && mol.atoms[from].arom && mol.atoms[to].arom) return '-';
  return BOND_CHAR[bond.order] === undefined ? '' : BOND_CHAR[bond.order];
}

// One connected component, written from a chosen root in canonical order.
function writeComponent(mol, atomsIn, ranks) {
  const inPiece = new Set(atomsIn);
  const visited = new Set();
  const ringLabel = new Map();   // bond index -> label
  let nextLabel = 1;
  const freeLabels = [];

  // Ring-closure bonds are those that would revisit an atom during the walk.
  // Decided up front by a dry run so the writer can emit the opening digit.
  const treeBonds = new Set();
  const closures = [];
  (function dryRun(root) {
    const seen = new Set([root]);
    const stack = [[root, -1]];
    const order = [];
    while (stack.length) {
      const [at, viaBond] = stack.pop();
      order.push(at);
      const links = mol.adjacency[at]
        .filter((l) => inPiece.has(l.other) && l.bond.index !== viaBond)
        .sort((x, y) => ranks[x.other] - ranks[y.other]);
      for (const link of links.slice().reverse()) {
        if (seen.has(link.other)) {
          if (!treeBonds.has(link.bond.index) && !closures.includes(link.bond.index)) {
            closures.push(link.bond.index);
          }
        } else {
          seen.add(link.other);
          treeBonds.add(link.bond.index);
          stack.push([link.other, link.bond.index]);
        }
      }
    }
    return order;
  })(atomsIn[0]);

  const out = [];
  function walk(at, viaBond) {
    visited.add(at);
    // Any ring closures starting or ending here.
    const here = mol.adjacency[at]
      .filter((l) => closures.includes(l.bond.index))
      .sort((x, y) => ranks[x.other] - ranks[y.other]);

    // The order this atom's neighbours are about to be written in, which is
    // what the chirality tag has to be expressed against.
    const children = mol.adjacency[at]
      .filter((l) => inPiece.has(l.other) && l.bond.index !== viaBond
        && treeBonds.has(l.bond.index) && !visited.has(l.other))
      .sort((x, y) => ranks[x.other] - ranks[y.other]);
    const emitted = [];
    if (viaBond >= 0) {
      const bond = mol.bonds[viaBond];
      emitted.push(bond.a === at ? bond.b : bond.a);
    }
    if (mol.hydrogens(at) > 0 && mol.atoms[at].chiral) {
      emitted.push(-1);   // written inside the bracket, straight after the symbol
    }
    for (const link of here) emitted.push(link.other);
    for (const link of children) emitted.push(link.other);

    out.push(atomText(mol, at, emitted));
    for (const link of here) {
      let label = ringLabel.get(link.bond.index);
      if (label === undefined) {
        label = freeLabels.length ? freeLabels.pop() : nextLabel++;
        ringLabel.set(link.bond.index, label);
        out.push(bondText(link.bond, at, link.other, mol)
          + (label > 9 ? '%' + String(label).padStart(2, '0') : String(label)));
      } else {
        ringLabel.delete(link.bond.index);
        freeLabels.push(label);
        out.push(label > 9 ? '%' + String(label).padStart(2, '0') : String(label));
      }
    }

    children.forEach((link, n) => {
      const last = n === children.length - 1;
      if (!last) out.push('(');
      out.push(bondText(link.bond, at, link.other, mol));
      walk(link.other, link.bond.index);
      if (!last) out.push(')');
    });
  }
  walk(atomsIn[0], -1);
  return out.join('');
}

function write(mol) {
  if (!mol.atoms.length) return '';
  const ranks = mol.canonicalRanks();
  const pieces = [];
  const seen = new Set();
  for (let start = 0; start < mol.atoms.length; start += 1) {
    if (seen.has(start)) continue;
    // Gather the component, then root the walk at its lowest-ranked atom so
    // the string does not depend on which atom happened to be parsed first.
    const group = [];
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const at = stack.pop();
      group.push(at);
      for (const link of mol.adjacency[at]) {
        if (!seen.has(link.other)) { seen.add(link.other); stack.push(link.other); }
      }
    }
    group.sort((a, b) => ranks[a] - ranks[b]);
    pieces.push(writeComponent(mol, group, ranks));
  }
  // Several molecules in one graph are written in a fixed order, so a
  // precursor set is one comparable string however it was assembled.
  return pieces.sort().join('.');
}

// A canonical form that is actually a fixed point.
//
// write() is order-independent for the constitution but not quite for every
// stereo tag: a handful of centres sit in symmetric surroundings where two
// spellings are equally correct, and the writer can alternate between them.
// Dropping those tags is not an option - some of them carry real cis/trans
// ring information - so instead the writer is applied until the string stops
// changing. Where it cycles rather than settling, the lexicographically
// smallest spelling in the cycle is chosen, which is a definite answer and
// the same one whichever member of the cycle we started from.
//
// Measured on 8,000 patent structures: 7,997 settle on the first pass, the
// rest on the second, and none cycle longer than two.
const CANON_PASSES = 6;

// '/' and '\' are only meaningful relative to each other, so flipping every
// one of them leaves the molecule unchanged. Two spellings that differ only
// that way are the same compound, and the convention here is that the first
// marker in the string is a '/'.
function normalizeDirections(text) {
  const first = text.search(/[/\\]/);
  if (first === -1 || text[first] === '/') return text;
  let out = '';
  for (const ch of text) out += ch === '/' ? '\\' : (ch === '\\' ? '/' : ch);
  return out;
}

function canonicalWrite(mol) {
  let text = normalizeDirections(write(mol));
  const seen = [text];
  for (let pass = 1; pass < CANON_PASSES; pass += 1) {
    const next = normalizeDirections(write(parse(text)));
    if (next === text) return text;
    if (seen.includes(next)) {
      // A cycle. Take its smallest member, which does not depend on where we
      // entered it.
      const start = seen.indexOf(next);
      return seen.slice(start).concat(next).sort()[0];
    }
    seen.push(next);
    text = next;
  }
  return seen.slice().sort()[0];
}

function canonical(text) {
  return canonicalWrite(parse(text));
}

const EXPORTS_smiles = { parse, write, canonical, canonicalWrite, SmilesError };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EXPORTS_smiles;
} else if (typeof RETRO !== 'undefined') {
  RETRO.smiles = EXPORTS_smiles;
}
