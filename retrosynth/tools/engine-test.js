'use strict';
// The chemistry: what the engine sees, what it proposes, and where it stops.
//
// A retrosynthesis engine fails in a way that looks like success - it returns
// a confident route made of reactions that do not work. So the checks here are
// mostly about refusal: that a transform does not fire where its group is
// absent, that a disconnection hands back pieces which really do recombine to
// the target, and that the stopping rule means something.

const S = require('../js/smiles.js');
const G = require('../js/groups.js');
const T = require('../js/transforms.js');
const K = require('../js/stock.js');
const E = require('../js/search.js');
const A = require('../js/analogues.js');
const SET = require('../js/settings.js');

let checks = 0;
let failures = 0;
function ok(cond, label) {
  checks += 1;
  if (!cond) { failures += 1; console.log('FAIL: ' + label); }
}

// --- functional groups ----------------------------------------------------
const GROUP_CASES = [
  ['CC(=O)Nc1ccccc1', 'amides', 1, 'acetanilide is an amide'],
  ['CC(=O)Nc1ccccc1', 'esters', 0, 'and is not an ester'],
  ['CCOC(C)=O', 'esters', 1, 'ethyl acetate'],
  ['CC(O)=O', 'acids', 1, 'acetic acid'],
  ['CC(O)=O', 'alcohols', 0, 'whose OH is not an alcohol'],
  ['OB(O)c1ccccc1', 'boronics', 1, 'phenylboronic acid'],
  ['Brc1ccccc1', 'arylHalides', 1, 'bromobenzene'],
  ['CCBr', 'halides', 1, 'an alkyl halide'],
  ['CCBr', 'arylHalides', 0, 'which is not aromatic'],
  ['N#Cc1ccccc1', 'nitriles', 1, 'benzonitrile'],
  ['N#Cc1ccccc1', 'amines', 0, 'whose nitrogen is not an amine'],
  ['CS(=O)(=O)Nc1ccccc1', 'sulfonamides', 1, 'a sulfonamide'],
  ['CC(C)(C)OC(=O)NCC', 'carbamates', 1, 'a Boc group'],
  ['CC(C)(C)OC(=O)NCC', 'amides', 0, 'which is not a plain amide'],
  ['C[Si](C)(C)OCC', 'silylEthers', 1, 'a TBS-like ether'],
  ['O=[N+]([O-])c1ccccc1', 'nitros', 1, 'nitrobenzene'],
  ['C1CO1', 'epoxides', 1, 'ethylene oxide'],
  ['CCOCC', 'ethers', 1, 'diethyl ether'],
  ['c1ccccc1', 'aromaticRings', 1, 'benzene'],
  ['C1CCCCC1', 'aromaticRings', 0, 'cyclohexane is not aromatic'],
  ['CC(O)C', 'alcohols', 1, 'isopropanol'],
  ['Oc1ccccc1', 'phenols', 1, 'phenol'],
  ['Oc1ccccc1', 'alcohols', 0, 'which is not an alcohol'],
];
for (const [smiles, group, count, what] of GROUP_CASES) {
  const found = G.groupsOf(S.parse(smiles))[group];
  ok(found.length === count,
    what + ': expected ' + count + ' ' + group + ', found ' + found.length);
}

// --- transforms propose, and propose the right pieces ---------------------
function proposes(smiles, id) {
  return T.disconnect(S.parse(smiles)).filter((d) => d.transform === id);
}
const TRANSFORM_CASES = [
  ['CC(=O)Nc1ccccc1', 'amide-coupling', ['CC(O)=O', 'Nc1ccccc1'], 'acetanilide into acid and aniline'],
  ['c1ccccc1-c1ccncc1', 'suzuki', ['Brc1ccccc1', 'OB(O)c1ccncc1'], 'a biaryl into halide and boronic acid'],
  ['CC(=O)Oc1ccccc1C(=O)O', 'esterification', ['CC(O)=O', 'Oc1ccccc1C(O)=O'], 'aspirin'],
  ['CCNc1ccccc1', 'buchwald', ['Brc1ccccc1', 'CCN'], 'an aryl amine'],
  ['CC(O)c1ccccc1', 'carbonyl-reduction', ['CC(=O)c1ccccc1'], 'an alcohol from its ketone'],
];
for (const [smiles, id, expected, what] of TRANSFORM_CASES) {
  const found = proposes(smiles, id);
  ok(found.length > 0, what + ': ' + id + ' proposed nothing');
  if (!found.length) continue;
  const want = expected.map((e) => S.canonical(e)).sort().join(' + ');
  const got = found.map((f) => f.precursors.join(' + '));
  ok(got.includes(want), what + ': expected ' + want + ', got ' + got.join(' | '));
}

// A transform must not fire where its group is absent.
const MUST_NOT = [
  ['CCCC', 'amide-coupling', 'butane has no amide'],
  ['CCCC', 'suzuki', 'butane has no biaryl bond'],
  ['c1ccccc1', 'suzuki', 'benzene alone is not a biaryl'],
  ['c1ccc2ccccc2c1', 'suzuki', 'naphthalene is fused, not coupled'],
  ['CCO', 'esterification', 'ethanol is not an ester'],
];
for (const [smiles, id, what] of MUST_NOT) {
  ok(proposes(smiles, id).length === 0, what + ': ' + id + ' fired anyway');
}

// Every disconnection must give back parseable, canonical precursors.
{
  let total = 0;
  for (const smiles of ['CC(=O)Oc1ccccc1C(=O)O', 'O=C(NCc1ccccc1)c1ccc(-c2ccncc2)cc1',
    'CCNc1ccc(C(O)=O)cc1', 'CC(=O)Nc1ccc(Br)cc1', 'CC(O)c1ccccc1', 'C[Si](C)(C)OCC']) {
    for (const step of T.disconnect(S.parse(smiles))) {
      total += 1;
      for (const precursor of step.precursors) {
        ok(S.canonical(precursor) === precursor,
          step.transform + ' produced a non-canonical precursor: ' + precursor);
        ok(S.parse(precursor).atoms.length > 0,
          step.transform + ' produced an empty precursor');
      }
      // Nothing may vanish: the pieces together must hold at least as many
      // heavy atoms as the product, since a disconnection adds reagent atoms
      // rather than losing them.
      const before = S.parse(smiles).atoms.length;
      const after = step.precursors.reduce((n, p) => n + S.parse(p).atoms.length, 0);
      ok(after >= before - 1,
        step.transform + ' lost atoms: ' + before + ' -> ' + after + ' (' + smiles + ')');
    }
  }
  ok(total > 20, 'only ' + total + ' disconnections across the sample');
}

// --- settings actually restrain the engine --------------------------------
{
  const all = T.disconnect(S.parse('c1ccccc1-c1ccncc1'));
  ok(all.some((d) => d.transform === 'suzuki'), 'suzuki should be available by default');
  const banned = T.disconnect(S.parse('c1ccccc1-c1ccncc1'),
    SET.normalize({ banTransforms: ['suzuki'] }));
  ok(!banned.some((d) => d.transform === 'suzuki'), 'banning the transform did not stop it');
  const noFamily = T.disconnect(S.parse('c1ccccc1-c1ccncc1'),
    SET.normalize({ banFamilies: ['coupling'] }));
  ok(!noFamily.some((d) => d.family === 'coupling'), 'banning the family did not stop it');
  const cold = T.disconnect(S.parse('c1ccccc1-c1ccncc1'), SET.normalize({ maxTemp: 25 }));
  ok(!cold.some((d) => d.transform === 'suzuki'),
    'a 90 degree coupling survived a 25 degree ceiling');
}

// --- the stopping rule ----------------------------------------------------
{
  const stock = K.makeStock(S);
  ok(stock.size > 150, 'the catalogue holds only ' + stock.size + ' compounds');
  ok(stock.rejected.length === 0, 'unparseable catalogue entries: ' + stock.rejected.join(', '));
  for (const [smiles, expected, what] of [
    ['CC(O)=O', true, 'acetic acid is buyable'],
    ['Nc1ccccc1', true, 'aniline is buyable'],
    ['OB(O)c1ccncc1', true, 'a common boronic acid is buyable'],
    ['CC(=O)Oc1ccccc1C(=O)O', false, 'aspirin is not a starting material'],
    ['O=C(NCc1ccccc1)c1ccc(-c2ccncc2)cc1', false, 'nor is a biaryl amide'],
  ]) {
    ok(stock.has(S.canonical(smiles)) === expected, what);
  }
  const mine = K.makeStock(S, { inventory: ['CC(=O)Oc1ccccc1C(=O)O'] });
  ok(mine.has(S.canonical('CC(=O)Oc1ccccc1C(=O)O')),
    'something listed as already owned should count as buyable');
}

// --- routes ----------------------------------------------------------------
{
  const settings = SET.normalize({ budgetMs: 8000 });
  const engine = E.makeEngine(settings);
  const TARGETS = [
    ['CC(=O)Oc1ccccc1C(=O)O', 'aspirin'],
    ['CC(=O)Nc1ccc(Br)cc1', 'an acylated bromoaniline'],
    ['c1ccccc1-c1ccncc1', 'a biaryl'],
    ['O=C(NCc1ccccc1)c1ccc(-c2ccncc2)cc1', 'a biaryl amide, which needs two steps'],
  ];
  for (const [smiles, what] of TARGETS) {
    const found = engine.route(smiles);
    ok(found.ok, 'no route to ' + what);
    if (!found.ok) continue;
    const route = found.routes[0];
    ok(route.depth >= 1, what + ' solved in zero steps');
    // Every leaf of a finished route has to be buyable, or the route is a lie.
    ok(route.startsFrom.every((m) => engine.buyable(m)),
      what + ' finished on something unbuyable: '
      + route.startsFrom.filter((m) => !engine.buyable(m)).join(', '));
    // And each step's product must be the previous step's precursor.
    for (let i = 1; i < route.steps.length; i += 1) {
      ok(route.steps[i].precursors.includes(route.steps[i - 1].product),
        what + ' has a break between steps ' + i + ' and ' + (i + 1));
    }
  }
  ok(engine.route('CCO').routes.length === 0,
    'ethanol is already buyable and needs no route');
}

// --- paths -----------------------------------------------------------------
{
  const settings = SET.normalize({ budgetMs: 8000 });
  const engine = E.makeEngine(settings);
  for (const [target, from, what] of [
    ['CC(=O)Oc1ccccc1C(=O)O', 'Oc1ccccc1C(O)=O', 'aspirin from salicylic acid'],
    ['O=C(NCc1ccccc1)c1ccc(-c2ccncc2)cc1', 'OB(O)c1ccncc1', 'a biaryl amide from its boronic acid'],
  ]) {
    const found = engine.path(target, from);
    ok(found.ok, 'no path for ' + what);
    if (!found.ok) continue;
    // The point of this mode: the named start must really be used.
    ok(found.routes[0].startsFrom.includes(S.canonical(from)),
      what + ' found a route that does not use the starting material');
  }
  // And it must refuse to pretend when there is no connection.
  const silly = engine.path('CC(=O)Oc1ccccc1C(=O)O', 'C1CCCCC1');
  ok(!silly.ok || silly.routes[0].startsFrom.includes(S.canonical('C1CCCCC1')),
    'a path was reported that never touches the starting material');
}

// --- analogues --------------------------------------------------------------
{
  const settings = SET.normalize({
    budgetMs: 1200, analogueCount: 6, analogueSimilarity: 0.5, mode: 'analogues',
    target: 'CC(=O)Nc1ccc(Br)cc1',
  });
  const engine = E.makeEngine(settings);
  const found = A.analogues(settings.target, settings, engine);
  ok(found.ok, 'no analogues proposed');
  ok(found.analogues.length <= settings.analogueCount, 'more analogues returned than asked for');
  for (const candidate of found.analogues) {
    ok(candidate.smiles !== found.target, 'the target was returned as its own analogue');
    ok(candidate.similarity >= settings.analogueSimilarity,
      'an analogue below the similarity floor was kept: ' + candidate.similarity);
    ok(S.canonical(candidate.smiles) === candidate.smiles,
      'an analogue is not canonical: ' + candidate.smiles);
    ok(!!candidate.route, 'routable was on, but ' + candidate.smiles + ' has no route');
  }
  // With the filter off, more should survive.
  const loose = SET.normalize({ ...settings, analogueRoutable: false, analogueCount: 30 });
  ok(A.analogues(settings.target, loose, engine).analogues.length
     >= found.analogues.length, 'dropping the route filter returned fewer analogues');
}

// --- running the step forwards -------------------------------------------
// The check that matters: not "can the cut be undone" - it always can, that
// verifies only bookkeeping - but "if you ran this on these precursors, what
// would you actually get".
{
  const F = require('../js/forward.js');
  ok(F.VERIFIABLE.size >= 15,
    'only ' + F.VERIFIABLE.size + ' transforms have a forward rule');

  const find = (smiles, id) => T.disconnect(S.parse(smiles)).find((d) => d.transform === id);

  // A clean, unambiguous step passes and says it is the only product.
  const clean = find('CC(=O)Nc1ccccc1', 'amide-coupling');
  ok(!!clean, 'the acetanilide amide coupling disappeared');
  const cleanVerdict = F.verify(clean);
  ok(cleanVerdict.checked && cleanVerdict.ok, 'acetanilide should verify forwards');
  ok(cleanVerdict.selective === true, 'acetanilide should be the only product');

  // A step with a second nucleophile present is right and ambiguous. Catching
  // this is the whole point: acylate an amino alcohol and the oxygen is there
  // too, so the route needs a protecting group rather than optimism.
  const amino = find('CC(=O)NCCO', 'amide-coupling');
  ok(!!amino, 'the ethanolamine coupling disappeared');
  const ambiguous = F.verify(amino);
  ok(ambiguous.ok, 'acylating ethanolamine does give the amide');
  ok(ambiguous.selective === false, 'but it is not the only product');
  ok(ambiguous.alternatives.some((a) => a === S.canonical('CC(=O)OCCN')),
    'the competing ester should be named, got ' + ambiguous.alternatives.join(', '));

  // Aspirin from the acid is the textbook example of the same problem.
  const aspirin = find('CC(=O)Oc1ccccc1C(=O)O', 'esterification');
  ok(!!aspirin && F.verify(aspirin).selective === false,
    'esterifying salicylic acid should be flagged as giving a mixture');

  // A transform with no forward rule says so rather than claiming to pass.
  const unchecked = T.disconnect(S.parse('CC(=O)NCCN'))
    .find((d) => !F.VERIFIABLE.has(d.transform));
  if (unchecked) {
    const verdict = F.verify(unchecked);
    ok(verdict.checked === false, 'an unverifiable transform claimed to be checked');
    ok(verdict.ok === true, 'an unverifiable transform should not be treated as failing');
  }

  // Every verifiable transform must survive its own example, or the forward
  // rule and the retro cut disagree about what the reaction is.
  const EXAMPLES = [
    ['CC(=O)Nc1ccccc1', 'amide-coupling'],
    ['CC(=O)Nc1ccccc1', 'amide-from-acyl-chloride'],
    ['c1ccccc1-c1ccncc1', 'suzuki'],
    ['CCNc1ccccc1', 'buchwald'],
    ['CC(O)c1ccccc1', 'carbonyl-reduction'],
    ['Cc1ccc(S(=O)(=O)Nc2ccccc2)cc1', 'sulfonamide'],
    ['CCOCC', 'williamson'],
  ];
  for (const [smiles, id] of EXAMPLES) {
    const step = find(smiles, id);
    ok(!!step, id + ' proposed nothing for ' + smiles);
    if (!step) continue;
    const verdict = F.verify(step);
    ok(verdict.checked, id + ' has no forward rule but was listed as verifiable');
    ok(verdict.ok, id + ' does not survive its own forward check on ' + smiles
      + ': ' + verdict.note);
  }

  // And the setting has to bite.
  const strict = SET.normalize({ budgetMs: 4000, verify: 'strict' });
  const loose = SET.normalize({ budgetMs: 4000, verify: 'off' });
  const strictRun = E.makeEngine(strict).route('CC(=O)Oc1ccccc1C(=O)O');
  const looseRun = E.makeEngine(loose).route('CC(=O)Oc1ccccc1C(=O)O');
  ok(looseRun.ok, 'aspirin should solve when nothing is checked');
  ok(!strictRun.routes.some(route => route.depth === 1 && route.steps[0].transform === 'esterification'),
    'strict checking must reject the ambiguous direct esterification');
  ok(strictRun.routes.every(route => route.steps.every(step => step.verdict.checked && step.verdict.selective)),
    'strict checking must not accept unchecked or ambiguous steps in longer alternatives');
}

console.log('\n' + T.TRANSFORMS.length + ' transforms over '
  + new Set(T.TRANSFORMS.map((t) => t.family)).size + ' families, '
  + K.makeStock(S).size + ' compounds in the catalogue');
console.log(checks + ' checks, ' + failures + ' failures');
process.exit(failures ? 1 : 0);
