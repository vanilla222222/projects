'use strict';
const assert = require('node:assert/strict');
const { LIBRARY } = require('../data/library.js');
const { GROUPS, groupFor, catalogSummary, catalogQuery, catalogCsv } = require('../js/library-catalog.js');
const sample = [
  { name: 'Beta', cls: 'Ester reference', formula: 'C2H4O2', smiles: 'CC(=O)O' },
  { name: 'alpha', cls: 'Fragment', formula: 'CH4', smiles: 'C' },
  { name: '=formula injection', cls: 'Other', formula: 'CO2', smiles: 'O=C=O' },
  { name: 'Gamma', cls: 'ESOL reference', formula: 'H2O', smiles: 'O' }
];
assert.equal(GROUPS.length, 7);
assert.equal(groupFor(sample[0]), 'series');
assert.equal(groupFor(sample[1]), 'fragment');
assert.equal(groupFor(sample[2]), 'other');
assert.equal(groupFor(sample[3]), 'esol');
assert.equal(catalogSummary(sample).total, 4);
assert.equal(catalogQuery(sample, { group: 'series' }).total, 1);
assert.equal(catalogQuery(sample, { query: 'beta c2h4o2' }).total, 1);
assert.equal(catalogQuery(sample, { query: 'missing' }).total, 0);
assert.equal(catalogQuery(sample, { cls: 'Fragment' }).rows[0].entry.name, 'alpha');
assert.equal(catalogQuery(sample, { sort: 'name' }).rows[0].entry.name, '=formula injection');
assert.equal(catalogQuery(sample, { page: 999, perPage: 25 }).page, 1);
assert.equal(catalogSummary(sample.concat(sample[0])).duplicateNames, 1);
assert.equal(catalogSummary(sample.concat(sample[0])).duplicateExactSmiles, 1);
assert.equal(catalogQuery(sample, { group: 'unrecognized' }).total, 4);
const csv = catalogCsv(sample, { group: 'other' });
assert.ok(csv.includes("'=formula injection"), 'Spreadsheet formula must not be executable');
assert.ok(!csv.includes('Beta'), 'CSV must honor collection filter');
assert.equal(csv.split('\r\n').filter(Boolean).length, 2);
const all = catalogSummary(LIBRARY);
assert.equal(all.total, LIBRARY.length);
assert.equal(Object.values(all.groups).reduce((a,b) => a+b, 0), LIBRARY.length);
assert.equal(all.groups.series, 500, 'Unexpected change in 500 class-labelled homolog series');
assert.equal(all.groups.esol, 342, 'Unexpected change in ESOL-labelled subset');
assert.equal(LIBRARY.filter(entry => entry.propertyOnly === true).length, 842, 'Expected 842 explicit property-only rows');
for (const entry of LIBRARY) {
  const expected = ['ESOL reference', 'Ester reference', 'Ether reference', 'Ketone reference'].includes(entry.cls);
  assert.equal(entry.propertyOnly === true, expected, 'Incorrect propertyOnly flag for ' + entry.name);
}
assert.equal(all.groups.fragment, 74, 'Unexpected change in fragment set');
assert.equal(all.missingNames, 0);
assert.equal(all.missingSmiles, 0);
const sourced=LIBRARY.filter(entry=>entry.source?.provider==='DrugCentral');
assert.ok(sourced.length>2000);
assert.equal(catalogQuery(LIBRARY,{group:'sourced'}).total,sourced.length);
const compound=sourced.find(e=>e.name==='capmatinib');assert.ok(compound);
for(const term of [compound.name,compound.source.cas,compound.source.inchiKey,'DrugCentral '+compound.source.id]){
 assert.ok(catalogQuery(LIBRARY,{query:term,group:'sourced'}).rows.some(r=>r.entry===compound));
}
assert.equal(groupFor({...compound,smiles:'CC'}),'other','Stale source metadata cannot label a changed graph');
assert.ok(catalogCsv([compound],{}).includes(compound.source.url));
console.log('Library catalogue and provenance-grouping checks passed:', all.total, 'entries');
const aliasEntry={name:'Alias fixture',smiles:'c1ccncc1',cls:'Test'};
const aliasContext={tags:{entries:{'Alias fixture':{librarySmiles:aliasEntry.smiles,tags:['Family motif: Pyridines']}}}};
assert.equal(catalogQuery([aliasEntry],{tag:'Pyridine motif'},aliasContext).total,1);
// Display capitalization does not rewrite stable keys, aliases or source witnesses.
const labels=require('../js/library-catalog'),rawNames={entries:{ulotaront:{librarySmiles:'CCO',preferredName:'ulotaront',sourceUrl:'https://example.org/source'},rimonabant:{librarySmiles:'CCC',preferredName:'rimonabant',sourceUrl:'https://example.org/source'},mCPP:{librarySmiles:'CCN',preferredName:'mCPP',sourceUrl:'https://example.org/source'}}};
for(const [name,smiles,label]of [['ulotaront','CCO','Ulotaront'],['rimonabant','CCC','Rimonabant'],['mCPP','CCN','mCPP']]){const e={name,smiles};assert.equal(labels.displayName(e,{names:rawNames}),label);assert.equal(labels.nameRecord(e,{names:rawNames}).preferredName,name);assert.equal(e.name,name);}
