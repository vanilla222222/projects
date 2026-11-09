'use strict';
// The SMILES layer, which everything else stands on.
//
// A parser that is quietly wrong corrupts every transform above it, and a
// writer that is not canonical makes the search unable to tell when it has
// seen a molecule before. So the properties checked here are the two that
// matter rather than a list of expected strings:
//
//   round trip   parse -> write -> parse gives the same molecule
//   canonical    the same molecule always writes the same string, from any
//                starting atom and any input order
//
// The large corpus run lives in tools/corpus-check.js, which compares against
// RDKit over thousands of patent structures. This suite is the fast one.

const S = require('../js/smiles.js');
const { Molecule } = require('../js/molecule.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}
function throws(fn, label) {
  checks += 1;
  try { fn(); failures += 1; console.log('FAIL (expected a throw): ' + label); }
  catch (err) { void err; }
}

// Structures chosen for the features they exercise, not for variety.
const CASES = [
  ['CCO', 'a chain'],
  ['CC(C)C', 'a branch'],
  ['C1CC1', 'a small ring'],
  ['c1ccccc1', 'aromatic ring, lower case'],
  ['c1ccc2ccccc2c1', 'fused aromatics, two ring closures'],
  ['CC(=O)Oc1ccccc1C(=O)O', 'aspirin'],
  ['[Na+].[Cl-]', 'two components and charges'],
  ['O=[N+]([O-])c1ccccc1', 'a charge-separated nitro group'],
  ['N[C@@H](C)C(=O)O', 'a stereocentre'],
  ['N[C@H](C)C(=O)O', 'the other stereocentre'],
  ['F/C=C/F', 'trans alkene'],
  ['F/C=C\\F', 'cis alkene'],
  ['[13CH4]', 'an isotope'],
  ['C[NH3+]', 'explicit hydrogens in brackets'],
  ['CC(C)(C)OC(=O)N1CCC(O)(C#C[Si](C)(C)C)CC1', 'silicon, a triple bond, a quaternary centre'],
  ['OB(O)c1ccccc1', 'a boronic acid, which chem lab cannot represent at all'],
  ['CS(=O)(=O)O', 'hypervalent sulfur'],
  ['C%10CCCCC%10', 'a two-digit ring closure'],
  ['c1ccsc1', 'an aromatic heteroatom'],
  ['[Mg+2]', 'a doubly charged metal'],
];

for (const [smiles, what] of CASES) {
  let mol;
  try { mol = S.parse(smiles); } catch (err) {
    ok(false, 'could not parse ' + what + ' (' + smiles + '): ' + err.message);
    continue;
  }
  ok(mol.atoms.length > 0, what + ' parsed to an empty molecule');

  const written = S.canonicalWrite(mol);
  ok(!!written, what + ' wrote an empty string');

  // Round trip: the canonical form must itself be canonical.
  ok(S.canonical(written) === written,
    what + ' is not a fixed point: ' + written + ' -> ' + S.canonical(written));

  // And it must describe the same thing: same formula, same atom and bond counts.
  const again = S.parse(written);
  ok(again.formula() === mol.formula(),
    what + ' changed formula: ' + mol.formula() + ' -> ' + again.formula());
  ok(again.atoms.length === mol.atoms.length && again.bonds.length === mol.bonds.length,
    what + ' changed size');

  // Order independence: rebuild with the atoms renumbered and demand the
  // identical string. This is the property the search depends on.
  const perm = mol.atoms.map((_, i) => i).reverse();
  ok(S.canonicalWrite(mol.subgraph(perm)) === written,
    what + ' writes differently when its atoms are renumbered:\n    '
    + written + '\n    ' + S.canonicalWrite(mol.subgraph(perm)));
}

// --- the same molecule, written differently, must agree ------------------
const SAME = [
  ['CCO', 'OCC', 'ethanol from either end'],
  ['c1ccccc1', 'C1=CC=CC=C1', 'benzene aromatic or kekulised'],
  ['CC(=O)Oc1ccccc1C(=O)O', 'O=C(O)c1ccccc1OC(C)=O', 'aspirin from the other end'],
  ['N[C@@H](C)C(=O)O', 'C[C@H](N)C(=O)O', 'alanine, tag and order both changed'],
  ['[Na+].[Cl-]', '[Cl-].[Na+]', 'components in either order'],
];
for (const [a, b, what] of SAME) {
  ok(S.canonical(a) === S.canonical(b),
    what + ' should agree:\n    ' + S.canonical(a) + '\n    ' + S.canonical(b));
}

// --- and genuinely different molecules must not ---------------------------
const DIFFERENT = [
  ['N[C@@H](C)C(=O)O', 'N[C@H](C)C(=O)O', 'enantiomers'],
  ['F/C=C/F', 'F/C=C\\F', 'cis and trans'],
  ['CCO', 'CCS', 'oxygen and sulfur'],
  ['c1ccccc1', 'C1CCCCC1', 'benzene and cyclohexane'],
  ['[NH4+]', 'N', 'charged and neutral'],
  ['[13CH4]', 'C', 'labelled and unlabelled'],
];
for (const [a, b, what] of DIFFERENT) {
  ok(S.canonical(a) !== S.canonical(b),
    what + ' should differ, both gave ' + S.canonical(a));
}

// --- hydrogen counting ----------------------------------------------------
for (const [smiles, index, expected, what] of [
  ['C', 0, 4, 'methane'],
  ['c1ccccc1', 0, 1, 'an aromatic CH'],
  ['[NH4+]', 0, 4, 'ammonium'],
  ['CS(=O)(=O)O', 1, 0, 'a sulfone sulfur'],
  ['OB(O)O', 1, 0, 'boric acid boron'],
  ['C#N', 0, 1, 'a nitrile carbon'],
]) {
  const mol = S.parse(smiles);
  ok(mol.hydrogens(index) === expected,
    what + ' should have ' + expected + ' hydrogens, got ' + mol.hydrogens(index));
}

// --- broken input is refused, not guessed --------------------------------
for (const bad of ['C1CC', 'CC)', 'CC(', '[Zz]', 'C[', '%1', 'C##C']) {
  throws(() => S.parse(bad), 'accepted malformed SMILES "' + bad + '"');
}

// --- a molecule built by hand, not parsed --------------------------------
{
  const mol = new Molecule();
  const a = mol.addAtom('C').index;
  const b = mol.addAtom('C').index;
  const o = mol.addAtom('O').index;
  mol.addBond(a, b, 1);
  mol.addBond(b, o, 2);
  ok(mol.formula() === 'C2H4O', 'a hand-built acetaldehyde has formula ' + mol.formula());
  ok(S.canonical(S.canonicalWrite(mol)) === S.canonicalWrite(mol),
    'a hand-built molecule does not write canonically');
}

// --- components -----------------------------------------------------------
{
  const mol = S.parse('CCO.c1ccccc1.[Na+]');
  ok(mol.components().length === 3, 'expected three components, got ' + mol.components().length);
  const sizes = mol.components().map((c) => c.atoms.length).sort();
  ok(sizes.join(',') === '1,3,6', 'component sizes were ' + sizes.join(','));
}

// --- rings ----------------------------------------------------------------
for (const [smiles, count, what] of [
  ['CCO', 0, 'a chain has no rings'],
  ['C1CC1', 1, 'cyclopropane'],
  ['c1ccc2ccccc2c1', 2, 'naphthalene has two rings in the basis'],
  ['C1CC2CCC1CC2', 2, 'a bicycle'],
]) {
  ok(S.parse(smiles).rings().length === count,
    what + ': expected ' + count + ', got ' + S.parse(smiles).rings().length);
}

console.log('\n' + CASES.length + ' structures round-tripped, canonical under renumbering');
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
