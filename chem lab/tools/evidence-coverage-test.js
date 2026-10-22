'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, performance, setTimeout, clearTimeout });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/<script src="([^"]+)"/g)) {
  if (match[1] !== 'js/app.js') vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), context, { filename: match[1] });
}
const rows = vm.runInContext('reactionCatalog()', context);
assert.equal(rows.length, vm.runInContext('RX_RULES.length', context));
assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
for (const row of rows) {
  assert.ok(row.references.length, row.id + ': missing reaction-class reference');
  assert.ok(row.scope && !/not yet been curated|detailed scope.*not.*recorded/i.test(row.scope), row.id + ': generic scope');
  assert.ok(row.assumptions.length && row.limitations.length, row.id + ': missing model limits');
  assert.equal(row.experimentalValidation, false, row.id + ': no claimed experimental validation');
  for (const reference of row.references) {
    const url = new URL(reference.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(reference.title && !url.username && !url.password, row.id + ': source attribution');
  }
}
console.log('Evidence coverage: ' + rows.length + '/' + rows.length + ' rules have scoped, attributed reaction-class references; implementation validation is separate.');
