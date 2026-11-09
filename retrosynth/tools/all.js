'use strict';
// Run every suite and say what happened.  `node tools/all.js [--quiet]`
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const quiet = process.argv.includes('--quiet');
const only = process.argv.find((a) => a.startsWith('--only='));
const dir = __dirname;
const suites = fs.readdirSync(dir)
  .filter((f) => f.endsWith('-test.js'))
  .filter((f) => !only || f.includes(only.slice(7)))
  .sort();

let worst = 0;
const results = [];
const started = Date.now();
for (const file of suites) {
  const t0 = Date.now();
  const run = spawnSync(process.execPath, [path.join(dir, file)], { encoding: 'utf8' });
  const text = ((run.stdout || '') + (run.stderr || '')).trim();
  const lines = text.split('\n').filter(Boolean);
  const summary = [...lines].reverse()
    .find((l) => /\d+\s+checks|checks passed|invariants/.test(l)) || lines[lines.length - 1] || '(no output)';
  if (run.status !== 0) worst = 1;
  results.push({ name: path.basename(file, '.js'), ms: Date.now() - t0,
    ok: run.status === 0, summary: summary.trim(), text });
  if (!quiet) console.log('\n===== ' + file + ' =====\n' + text);
}

console.log('\n' + '='.repeat(72));
for (const r of results) {
  console.log((r.ok ? 'ok   ' : 'FAIL ') + r.name.padEnd(20)
    + String(r.ms + 'ms').padStart(7) + '  ' + r.summary.slice(0, 70));
}
console.log('\n' + results.length + ' suites in '
  + ((Date.now() - started) / 1000).toFixed(1) + 's: '
  + (worst ? 'FAILURES' : 'all passed'));
process.exit(worst);
