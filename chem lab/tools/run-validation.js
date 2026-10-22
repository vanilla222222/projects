#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
let failed = 0;
let checked = 0;
for (const filename of fs.readdirSync(path.join(root, 'js')).filter((f) => f.endsWith('.js')).sort()) {
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
console.log('\nValidation: ' + suites.length + ' suites, ' + failed + ' total failures.');
process.exitCode = failed ? 1 : 0;
