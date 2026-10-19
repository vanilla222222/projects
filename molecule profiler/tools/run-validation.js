'use strict';
// Run locally with: node tools/run-validation.js
// Requires Node.js 18+. This is not a substitute for RDKit or browser tests.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
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
  'sim-pagination-test.js',
  'batch-browser-test.js',
  'input-workflow-test.js',
  'report-model-test.js',
  'full-csv-export-test.js',
  'research-package-test.js',
  'descriptor-stats-test.js',
  'molecule-quality-test.js',
  'research-zip-external-test.js'
];
const started = new Date().toISOString();
const outcomes = [];
let failed = 0;
for (const script of scripts) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
    cwd: root, encoding: 'utf8', timeout: 120000
  });
  const passed = !result.error && result.status === 0;
  outcomes.push({script,passed,status:result.status,error:result.error ? String(result.error) : null,
    stdout:result.stdout || '',stderr:result.stderr || ''});
  process.stdout.write((passed ? 'PASS ' : 'FAIL ') + script + '\n');
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) process.stderr.write(String(result.error) + '\n');
  if (!passed) failed += 1;
}
process.stdout.write('\n' + (scripts.length - failed) + '/' + scripts.length + ' Node validation scripts passed.\n');
const report = { schemaVersion:1, started, finished:new Date().toISOString(),
  node:process.version, platform:process.platform, cwd:root,
  total:scripts.length, passed:scripts.length-failed, failed, results:outcomes };
const reportArg = process.argv.indexOf('--report');
if (reportArg !== -1) {
  const target = process.argv[reportArg + 1];
  if (!target || target.startsWith('--')) {
    process.stderr.write('Usage: node tools/run-validation.js --report <path>\n');
    process.exitCode = 2;
  } else {
    try {
      fs.writeFileSync(path.resolve(process.cwd(),target),JSON.stringify(report,null,2)+'\n');
      process.stdout.write('Wrote validation diagnostics to '+target+'\n');
    } catch(error) {
      process.stderr.write('Could not write validation report: '+String(error)+'\n');
      process.exitCode = 2;
    }
  }
}
if (process.exitCode !== 2) process.exitCode = failed ? 1 : 0;
