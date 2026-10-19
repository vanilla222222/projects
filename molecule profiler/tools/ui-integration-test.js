'use strict';
// Static browser integration contract: catches missing script imports, bad ordering,
// duplicate DOM IDs, and missing evidence/coverage hosts. No browser simulation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*><\/script>/g)].map(x => x[1].split('?')[0]);
assert.ok(scripts.length > 0, 'No external scripts found');
assert.equal(new Set(scripts).size, scripts.length, 'Duplicate external script imports');
for (const script of scripts) {
  assert.ok(!script.startsWith('/') && !script.includes('..'), 'Unexpected script path: ' + script);
  assert.ok(fs.existsSync(path.join(root, script)), 'Missing script file: ' + script);
}
const order = ['js/descriptors.js', 'js/evidence-report.js', 'js/screen-coverage.js', 'js/app.js'];
for (let i = 1; i < order.length; i += 1) {
  assert.ok(scripts.indexOf(order[i - 1]) >= 0 && scripts.indexOf(order[i]) > scripts.indexOf(order[i - 1]),
    'Script dependency order incorrect: ' + order[i]);
}
const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(x => x[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML IDs');
for (const id of ['evidence-descriptors', 'evidence-warnings', 'tox-coverage', 'met-coverage']) {
  assert.ok(ids.includes(id), 'Missing UI element: ' + id);
}
const app = fs.readFileSync(path.join(root, 'js/app.js'), 'utf8');
assert.match(app, /propertyEvidenceRows\(\{\s*\.\.\.d,\s*logS:\s*v\s*&&\s*v\.logS\s*\}\)/,
  'Evidence table must read calculated logS from record.v');
const metabolismRenderer = app.slice(app.indexOf('function renderMetabolism(record) {'));
assert.match(metabolismRenderer, /const coverageSlot = document\.getElementById\('met-coverage'\);\s*if \(coverageSlot\) coverageSlot\.textContent = '';/,
  'Metabolism coverage must clear stale output before early errors');
for (const fn of ['toxicityCoverageReport', 'metabolismCoverageReport']) {
  assert.ok(app.includes(fn + '('), 'Coverage report is not wired: ' + fn);
}
console.log('UI integration contract passed: ' + scripts.length + ' scripts, ' + ids.length + ' unique DOM IDs');
