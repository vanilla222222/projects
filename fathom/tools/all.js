'use strict';
// Run every suite and say what happened. `node tools/all.js`.
//
// Twenty-one files is past the point where running them by hand is reasonable, and a
// suite nobody runs is a suite that is not protecting anything. `--quiet` prints only the
// summary line from each; without it, each suite's own output comes through, which is
// where the useful tables live (the ladder, the roster by layer, the biome shares).

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const quiet = process.argv.includes('--quiet');
const only = process.argv.find(a => a.startsWith('--only='));
const dir = __dirname;

const suites = fs.readdirSync(dir)
  .filter(f => f.endsWith('-test.js'))
  .filter(f => !only || f.includes(only.slice(7)))
  .sort();

const results = [];
let worstCode = 0;
const started = Date.now();

for (const file of suites) {
  const name = path.basename(file, '.js');
  const t0 = Date.now();
  const run = spawnSync(process.execPath, [path.join(dir, file)], { encoding: 'utf8' });
  const ms = Date.now() - t0;
  const out = (run.stdout || '') + (run.stderr || '');
  // Most suites end with a line saying how much they checked, but several print a table
  // after it - the biome shares, the roster by layer, the ladder - so the last line is
  // the wrong one to quote. Take the last line that looks like a count instead.
  const lines = out.trim().split('\n').filter(Boolean);
  const counted = [...lines].reverse()
    .find(l => /\d+\s+(checks|invariants)|checks passed|passed across/.test(l));
  const summary = (counted || lines[lines.length - 1] || '(no output)').trim();
  const failed = run.status !== 0;
  if (failed) worstCode = 1;
  results.push({ name, ms, failed, summary, out });
  if (!quiet) {
    process.stdout.write('\n── ' + name + ' '
      + '─'.repeat(Math.max(2, 58 - name.length)) + '\n');
    process.stdout.write(out.trim() + '\n');
  }
}

const pad = Math.max(...results.map(r => r.name.length));
process.stdout.write('\n' + '='.repeat(72) + '\n');
for (const r of results) {
  process.stdout.write((r.failed ? 'FAIL  ' : 'ok    ')
    + r.name.padEnd(pad + 2)
    + String(r.ms + 'ms').padStart(7) + '  '
    + r.summary.slice(0, 60) + '\n');
}

const broken = results.filter(r => r.failed);
process.stdout.write('\n' + results.length + ' suites in '
  + ((Date.now() - started) / 1000).toFixed(1) + 's: '
  + (broken.length ? broken.length + ' FAILED (' + broken.map(r => r.name).join(', ') + ')'
    : 'all passed') + '\n');

if (broken.length && quiet) {
  for (const r of broken) {
    process.stdout.write('\n── ' + r.name + ' ──\n');
    process.stdout.write(r.out.split('\n').filter(l => l.startsWith('FAIL')).slice(0, 12)
      .join('\n') + '\n');
  }
}

process.exit(worstCode);
