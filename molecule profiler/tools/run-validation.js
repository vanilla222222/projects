'use strict';
// Run locally with: node tools/run-validation.js
// Requires Node.js 18+. This is not a substitute for RDKit or browser tests.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const scripts = [
  'reference-audit-test.js',
  'evidence-report-test.js',
  'screen-coverage-test.js',
  'property-validation.js',
  'metabolism-cases.js',
  'retrieval-benchmark.js',
  'ui-integration-test.js',
  'comparison-test.js',
  'library-catalog-test.js',
  'sim-pagination-test.js'
];
let failed = 0;
for (const script of scripts) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
    cwd: root, encoding: 'utf8', timeout: 120000
  });
  const passed = !result.error && result.status === 0;
  process.stdout.write((passed ? 'PASS ' : 'FAIL ') + script + '\n');
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) process.stderr.write(String(result.error) + '\n');
  if (!passed) failed += 1;
}
process.stdout.write('\n' + (scripts.length - failed) + '/' + scripts.length + ' Node validation scripts passed.\n');
process.exitCode = failed ? 1 : 0;
