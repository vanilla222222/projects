'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, performance, setTimeout, clearTimeout });
const files = ['elements','graph','valence','stereo','naming-core','naming-chain','naming-ring','naming-scaffolds','naming-general','common-names-extra','naming-elements','properties','layout','smiles','reactions','molecular-identity','reagent-library','reaction-stereo','reaction-rules','reaction-rules-extra','reaction-rules-extra2','reaction-aromatic','reaction-rules-extra3','reaction-rules-extra4','reaction-catalog','reaction-evidence-core'];
files.forEach((name) => vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), context, { filename: name + '.js' }));
const run = (code) => vm.runInContext(code, context);
const ids = run('Array.from(CORE_REACTION_EVIDENCE_IDS)');
assert.equal(ids.length, 50);
assert.equal(new Set(ids).size, ids.length);
let checks = 2;
for (const id of ids) {
  context.testId = id;
  const descriptor = run('reactionRuleDescriptor(testId)');
  assert.ok(descriptor, id + ' is a registered reaction'); checks++;
  assert.ok(descriptor.scope.length > 65 && !/not yet|not recorded|not.*curated/i.test(descriptor.scope), id + ' has an implementation-specific scope'); checks++;
  assert.ok(descriptor.assumptions.length > 2 && descriptor.limitations.length > 2, id + ' has specific assumptions and limitations'); checks++;
  assert.ok(descriptor.references.length > 0, id + ' has a class reference'); checks++;
  assert.ok(descriptor.references.every((reference) => reference.title.length > 12 && /^https:\/\//.test(reference.url) && ['primary','teaching'].includes(reference.kind)), id + ' has attributable reference records'); checks++;
  assert.equal(descriptor.experimentalValidation, false, id + ' makes no experimental validation claim'); checks++;
}
assert.match(run("reactionRuleDescriptor('mild-oxidants').limitations.join(' ')"), /Pinnick and TEMPO/); checks++;
assert.match(run("reactionRuleDescriptor('reduction').scope"), /NaBH4.*LiAlH4/); checks++;
assert.match(run("reactionRuleDescriptor('wacker').limitations.join(' ')"), /catalyst cycle/); checks++;
assert.match(run("reactionRuleDescriptor('grignard-extra').scope"), /protic/); checks++;
assert.match(run("reactionRuleDescriptor('snar').scope"), /ortho\/para/); checks++;
assert.match(run("reactionRuleDescriptor('hofmann-elimination').assumptions.join(' ')"), /already/); checks++;
assert.ok(run("reactionCatalog('SN1').some((entry) => entry.id === 'halide')")); checks++;
// Mutating a view must not change the descriptor used by later predictions.
assert.ok(run("(() => { const d=reactionRuleDescriptor('aldol');d.references[0].title='changed';return reactionRuleDescriptor('aldol').references[0].title!=='changed'; })()")); checks++;
console.log('Core reaction evidence: ' + checks + ' checks passed (50 scoped and sourced rules).');
