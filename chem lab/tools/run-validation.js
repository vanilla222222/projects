#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const options = new Set(process.argv.slice(2));
if ([...options].some((flag) => !['--rdkit', '--browser'].includes(flag))) throw new Error('Use --rdkit and/or --browser for optional independent and UI checks.');
let failed = 0;
let checked = 0;
for (const filename of fs.readdirSync(path.join(root, 'js')).filter((f) => /\.m?js$/.test(f)).sort()) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, 'js', filename)], { encoding: 'utf8' });
  checked++;
  if (result.status !== 0) { failed++; process.stderr.write(result.stderr || String(result.error || 'Syntax check failed')); }
}
console.log('Syntax checks: ' + checked + ' scripts, ' + failed + ' failures.');
const suites = fs.readdirSync(__dirname).filter((f) => f.endsWith('test.js')).sort().concat(['chemistry-benchmark.js']);
for (const filename of suites) {
  console.log('\nRunning ' + filename);
  const result = spawnSync(process.execPath, [path.join(__dirname, filename)], { stdio: 'inherit', timeout: 120000 });
  if (result.status !== 0) { failed++; if (result.error) console.error(result.error.message); }
}
let optional = 0;
if (options.has('--rdkit')) {
  optional++;
  const result = spawnSync(process.env.CHEM_PYTHON || 'python3', [path.join(__dirname, 'rdkit-validation.py'), '--check'], { stdio: 'inherit', timeout: 120000 });
  if (result.status !== 0) { failed++; if (result.error) console.error(result.error.message); }
}
if (options.has('--browser')) {
  optional++;
  const result = spawnSync(process.execPath, [path.join(__dirname, 'browser-ui-smoke.mjs')], { stdio: 'inherit', timeout: 180000 });
  if (result.status !== 0) { failed++; if (result.error) console.error(result.error.message); }
}
console.log('\nValidation: ' + suites.length + ' suites, ' + optional + ' optional checks, ' + failed + ' total failures.');
process.exitCode = failed ? 1 : 0;
