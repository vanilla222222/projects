#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, setTimeout, clearTimeout });
const files = ['elements', 'graph', 'valence', 'stereo', 'naming-core', 'naming-chain', 'naming-ring', 'naming-scaffolds', 'naming-general', 'common-names-extra', 'naming-elements', 'properties', 'layout', 'smiles', 'reactions', 'reaction-stereo', 'reaction-rules', 'reaction-rules-extra', 'reaction-rules-extra2', 'reaction-aromatic', 'reaction-rules-extra3', 'reaction-rules-extra4', 'reaction-catalog'];
files.forEach((name) => vm.runInContext(fs.readFileSync(path.join(root, 'js', name + '.js'), 'utf8'), context, { filename: name + '.js' }));
const core = path.join(root, 'js/reaction-evidence-core.js');
if (fs.existsSync(core)) vm.runInContext(fs.readFileSync(core, 'utf8'), context, { filename: core });
const before = JSON.parse(vm.runInContext('JSON.stringify(REACTION_CATALOG_CURATED)', context));
vm.runInContext(fs.readFileSync(path.join(root, 'js/reaction-evidence-named.js'), 'utf8'), context, { filename: 'reaction-evidence-named.js' });
const descriptors = JSON.parse(vm.runInContext('JSON.stringify(reactionCatalog())', context));
const coreIds = new Set('hydrogenation,hydroboration,halide,fischer,reduction,acid-chloride,acyl,amide-dehydration,amide-hydrolysis,enolate-alkylation,ester-exchange,saponification,nitrile-hydrolysis,sulfonylation,acetylide,hydration,alpha-halogenation,dehydration,grignard-extra,grignard,grignard-formation,radical,wittig,halogenation,nitration,sulfonation,aromatic,snar,aldol,claisen,cyanide-carbonyl,knoevenagel,mannich,michael,robinson,oxidation,oxidation-extra,epoxide,epoxide-closure,hydrohalogenation,epoxidation,osmium,ozonolysis,periodate,mild-oxidants,wacker,alcohol-halide,double-elimination,hofmann-elimination,williamson'.split(','));
const owned = descriptors.filter((d) => !coreIds.has(d.id));
assert.equal(owned.length, 54, 'named-rule partition includes exhaustive O-methylation/O-ethylation and remains complete');
const after = JSON.parse(vm.runInContext('JSON.stringify(REACTION_CATALOG_CURATED)', context));
let checks = 1;
for (const d of owned) {
  assert.ok(after[d.id], d.id + ': explicit curated record');
  assert.ok(d.scope.length > 65 && !/conditions and substrate patterns encoded/.test(d.scope), d.id + ': implementation-specific scope');
  assert.ok(d.references.length, d.id + ': chemistry source');
  assert.ok(d.assumptions.length > 2, d.id + ': assumption beyond global defaults');
  assert.ok(d.limitations.length > 2, d.id + ': limitation beyond global defaults');
  assert.equal(d.experimentalValidation, false, d.id + ': no experimental validation claim');
  for (const source of d.references) {
    assert.ok(source.title.length > 20, d.id + ': attributed source');
    assert.ok(['primary', 'teaching'].includes(source.kind), d.id + ': primary or authored teaching reference');
    assert.equal(new URL(source.url).protocol, 'https:', d.id + ': source URL');
  }
  checks += 9;
}
for (const id of coreIds) {
  assert.deepEqual(after[id], before[id], id + ': named audit preserves core-owned metadata');
  checks++;
}
const byId = Object.fromEntries(owned.map((d) => [d.id, d]));
for (const [id, expected] of Object.entries({
  'sonogashira': /copper-free/,
  'beckmann': /anti-periplanar/,
  'luche': /solvent is not enforced/,
  'halolactonization': /bromine extension/,
  'pmb-protection': /CAN/,
  'arene-hydrogenation': /thresholds are local heuristics/,
  'ester-protection': /specialized protection reagent/,
})) {
  assert.match(byId[id].limitations.join(' '), expected, id + ': branch-specific caveat survives descriptor merge');
  checks++;
}
console.log('Named reaction evidence: ' + checks + ' checks passed (' + owned.length + ' descriptors).');
