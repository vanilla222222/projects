'use strict';

// Leave-one-out retrieval benchmark for the target-prediction panel.
//
//   node tools/retrieval-benchmark.js            print the report
//   node tools/retrieval-benchmark.js --write    also regenerate data/benchmark.js
//
// For every ligand of every target, the ligand name is removed from the pool.
// Registered targets retain the historical score-only/target-order tie protocol;
// the rank of
// the ligand's own target is recorded. A target with fewer than two ligands
// cannot be measured at all: dropping its only ligand leaves it unscoreable.

const path = require('path');
const fs = require('fs');

const base = path.join(__dirname, '..');
const sm = require(path.join(base, 'js/smiles.js'));
const molmod = require(path.join(base, 'js/mol.js'));
global.parseSmiles = sm.parseSmiles;
Object.assign(global, molmod);
const fp = require(path.join(base, 'js/fingerprints.js'));
const { LIBRARY } = require(path.join(base, 'data/library.js'));
const { TARGETS } = require(path.join(base, 'data/targets.js'));
const {evaluate} = require('./retrieval-evaluate.js');

function median(list) {
  const sorted = [...list].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function recall(rows, k) {
  if (!rows.length) return null;
  return rows.filter((row) => row.rank <= k).length / rows.length;
}

function run(methodKey, metricKey) {
  const score = metricKey === 'dice' ? fp.dice : fp.tanimoto;
  const byName = new Map();
  LIBRARY.forEach((entry) => {
    try {
      byName.set(entry.name, fp.fingerprint(molmod.moleculeFromSmiles(entry.smiles), methodKey));
    } catch (error) { /* an entry the parser rejects is left out, as the page leaves it out */ }
  });

  // Two targets share the placeholder gene symbol "n/a", so rows are keyed by
  // gene and name together; js/app.js builds the same key to look a row up.
  const sets = TARGETS.map((target, index) => ({
    index: index,
    gene: target.gene,
    key: target.gene + '::' + target.name,
    ligands: target.ligands.filter((name) => byName.has(name))
  }));

  // These two bit-set metrics are exactly symmetric. Reuse reverse comparisons
  // without changing fingerprint generation, holdout rules, or target-order ties.
  const {trials}=evaluate(sets,byName,score,{symmetric:true});
  const perTarget=new Map();
  for(const trial of trials){
    if(!perTarget.has(trial.key))perTarget.set(trial.key,[]);
    perTarget.get(trial.key).push(trial);
  }

  const thick = trials.filter((trial) => trial.ligands >= 5);
  const scoredTargets = median(trials.map((trial) => trial.scoredTargets));
  const popularity = new Map(sets.map((set) => [set.index, set.ligands.length]));
  const popRanks = trials.map((trial) => {
    const pool = sets
      .filter((set) => set.ligands.some((name) => name !== trial.held))
      .sort((a, b) => popularity.get(b.index) - popularity.get(a.index) || a.index - b.index);
    return { rank: pool.findIndex((set) => set.index === trial.index) + 1 };
  });

  return {
    method: methodKey,
    metric: metricKey,
    targets: sets.length,
    measurable: perTarget.size,
    unmeasurable: sets.filter((set) => set.ligands.length < 2).map((set) => set.gene),
    trials: trials.length,
    scoredTargets: scoredTargets,
    overall: {
      r1: recall(trials, 1), r5: recall(trials, 5), r10: recall(trials, 10),
      median: median(trials.map((trial) => trial.rank)),
      mean: trials.reduce((sum, trial) => sum + trial.rank, 0) / trials.length
    },
    thick: {
      trials: thick.length,
      r1: recall(thick, 1), r5: recall(thick, 5), r10: recall(thick, 10),
      median: median(thick.map((trial) => trial.rank))
    },
    popularity: {
      r1: recall(popRanks, 1), r5: recall(popRanks, 5), r10: recall(popRanks, 10),
      median: median(popRanks.map((row) => row.rank))
    },
    random: {
      r1: 1 / scoredTargets, r5: 5 / scoredTargets, r10: 10 / scoredTargets,
      median: scoredTargets / 2
    },
    perTarget: [...perTarget.entries()].map(([key, rows]) => ({
      key: key,
      gene: key.split('::')[0],
      n: rows.length,
      r1: recall(rows, 1),
      r5: recall(rows, 5),
      median: median(rows.map((row) => row.rank))
    })).sort((a, b) => b.n - a.n || a.gene.localeCompare(b.gene)),
    worst: [...trials].sort((a, b) => b.rank - a.rank).slice(0, 15)
  };
}

function pct(value) {
  return value === null ? 'n/a' : (value * 100).toFixed(1) + '%';
}

const primary = run('ecfp4', 'tanimoto');

console.log('leave-one-out target retrieval, ' + primary.method + ' / ' + primary.metric);
console.log('  library ' + LIBRARY.length + ' compounds, ' + primary.targets + ' targets, '
  + primary.measurable + ' measurable, ' + primary.unmeasurable.length + ' with fewer than two ligands');
console.log('  ' + primary.trials + ' held-out trials over a median of ' + primary.scoredTargets + ' scored targets');
console.log('  recall@1 ' + pct(primary.overall.r1) + '  recall@5 ' + pct(primary.overall.r5)
  + '  recall@10 ' + pct(primary.overall.r10)
  + '  median rank ' + primary.overall.median + '  mean rank ' + primary.overall.mean.toFixed(1));
console.log('  targets with >=5 ligands (' + primary.thick.trials + ' trials): recall@1 ' + pct(primary.thick.r1)
  + '  recall@5 ' + pct(primary.thick.r5) + '  median rank ' + primary.thick.median);
console.log('  popularity baseline: recall@1 ' + pct(primary.popularity.r1)
  + '  recall@5 ' + pct(primary.popularity.r5) + '  median rank ' + primary.popularity.median);
console.log('  uniform random baseline: recall@1 ' + pct(primary.random.r1)
  + '  recall@5 ' + pct(primary.random.r5) + '  median rank ' + primary.random.median);

console.log('\nother fingerprints');
['ecfp6', 'fcfp4', 'pairs'].forEach((key) => {
  const result = run(key, 'tanimoto');
  console.log('  ' + key.padEnd(6) + ' recall@1 ' + pct(result.overall.r1)
    + '  recall@5 ' + pct(result.overall.r5) + '  median rank ' + result.overall.median);
});
const diced = run('ecfp4', 'dice');
console.log('  ecfp4 with Dice: recall@1 ' + pct(diced.overall.r1)
  + '  recall@5 ' + pct(diced.overall.r5) + '  median rank ' + diced.overall.median);

console.log('\nper target: gene, trials, recall@1, recall@5, median rank');
primary.perTarget.forEach((row) => {
  console.log('  ' + row.gene.padEnd(10) + String(row.n).padStart(3) + '  '
    + pct(row.r1).padStart(6) + '  ' + pct(row.r5).padStart(6) + '  ' + row.median);
});

console.log('\nworst trials');
primary.worst.forEach((trial) => {
  console.log('  ' + trial.gene.padEnd(9) + trial.held.padEnd(28) + 'rank ' + String(trial.rank).padStart(4)
    + ', top was ' + trial.topGene + ' at ' + trial.topScore.toFixed(3));
});

console.log('\nnot measurable (fewer than two resolved ligands)');
console.log('  ' + primary.unmeasurable.join(' '));

if (process.argv.includes('--write')) {
  const payload = {
    generated: new Date().toISOString().slice(0, 10),
    library: LIBRARY.length,
    method: 'ECFP4',
    metric: 'Tanimoto',
    targets: primary.targets,
    measurable: primary.measurable,
    unmeasurable: primary.unmeasurable.length,
    trials: primary.trials,
    scoredTargets: primary.scoredTargets,
    overall: primary.overall,
    thick: primary.thick,
    popularity: primary.popularity,
    random: primary.random,
    perTarget: primary.perTarget.reduce((map, row) => {
      map[row.key] = { n: row.n, r1: Number(row.r1.toFixed(4)), r5: Number(row.r5.toFixed(4)), median: row.median };
      return map;
    }, {})
  };
  const out = "'use strict';\n\n"
    + '// Generated by tools/retrieval-benchmark.js. Do not edit by hand.\n'
    + 'const RETRIEVAL_BENCHMARK = ' + JSON.stringify(payload, null, 2) + ';\n\n'
    + "if (typeof module !== 'undefined' && module.exports) {\n"
    + '  module.exports = { RETRIEVAL_BENCHMARK };\n'
    + '}\n';
  fs.writeFileSync(path.join(base, 'data/benchmark.js'), out);
  console.log('\nwrote data/benchmark.js');
}
