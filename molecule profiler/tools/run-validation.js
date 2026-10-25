'use strict';
// Run locally with: node tools/run-validation.js
// Requires Node.js 18+. This is not a substitute for RDKit or browser tests.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const provenance = require('./validation-provenance.js');
const sourceBefore = provenance.capture(root);
const scripts = [
  'reference-audit-test.js',
  'curated-references-test.js',
  'receptor-catalog-test.js',
  'receptor-coverage-test.js',
  'receptor-diversity-report-test.js',
  'chembl-binding-test.js',
  'target-ranking-test.js',
  'target-ranking-metrics-test.js',
  'metabolism-engine-test.js',
  'evidence-report-test.js',
  'screen-coverage-test.js',
  'property-validation.js',
  'descriptor-conformance-test.js',
  'metabolism-cases.js',
  'retrieval-benchmark.js',
  'retrieval-evaluate-test.js',
  'ui-integration-test.js',
  'interaction-test.js',
  'cooperative-batch-test.js',
  'analysis-lifecycle-test.js',
  'validation-provenance-test.js',
  'comparison-test.js',
  'library-catalog-test.js',
  'library-metadata-report-test.js',
  'family-reference-test.js',
  'family-pharmacology-test.js',
  'pharmacology-test.js',
  'pk-applicability-test.js',
  'prodrug-candidates-test.js',
  'quick-candidates-test.js',
  'candidate-info-test.js',
  'cleavable-groups-test.js',
  'soft-ethers-test.js',
  'analogue-candidates-test.js',
  'directional-smiles-test.js',
  'prodrug-explorer-test.js',
  'prodrug-priority-test.js',
  'sim-pagination-test.js',
  'batch-browser-test.js',
  'input-workflow-test.js',
  'file-import-test.js',
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
  // Exhaustive retrieval grows with the reference dataset; keep a separate,
  // bounded budget rather than applying its cost to every regression script.
  const timeoutMs = script === 'retrieval-benchmark.js' ? 300000 : 120000;
  const testStarted = process.hrtime.bigint();
  process.stdout.write('RUN ' + script + ' (timeout ' + timeoutMs / 1000 + 's)\n');
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
    cwd: root, encoding: 'utf8', timeout: timeoutMs
  });
  const durationMs = Math.round(Number(process.hrtime.bigint() - testStarted) / 1e6);
  const passed = !result.error && result.status === 0;
  outcomes.push({script,passed,durationMs,timeoutMs,signal:result.signal || null,status:result.status,error:result.error ? String(result.error) : null,
    stdout:result.stdout || '',stderr:result.stderr || ''});
  process.stdout.write((passed ? 'PASS ' : 'FAIL ') + script + '\n');
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) process.stderr.write(String(result.error) + '\n');
  if (!passed) failed += 1;
}
process.stdout.write('\n' + (scripts.length - failed) + '/' + scripts.length + ' Node validation scripts passed.\n');
const sourceAfter = provenance.capture(root);
const sourceIntegrity = provenance.compare(sourceBefore, sourceAfter);
if (!sourceIntegrity.stable) process.stderr.write('Source changed during validation; rerun against a stable checkout.\n');
const report = { schemaVersion:1, started, finished:new Date().toISOString(),
  node:process.version, platform:process.platform, cwd:root,
  source:{before:sourceBefore,after:sourceAfter,integrity:sourceIntegrity},
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
if (process.exitCode !== 2) process.exitCode = failed || !sourceIntegrity.stable ? 1 : 0;
