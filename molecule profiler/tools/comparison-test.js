'use strict';
const assert = require('node:assert/strict');
const { FIELDS, comparisonRows, comparisonCsv, display } = require('../js/comparison-data.js');
const records = [
  { name: 'Example A', d: {formula:'C2H6O',mw:46.07,exactMass:46.0419,tpsa:20.2,logp:-0.3,mr:12.7,hbd:1,hba:1,rotatableBonds:0,rings:0,aromaticRings:0,fractionCsp3:1,charge:0},v:{logS:-0.5}},
  { name: 'Example B', d: {formula:'C3H8O',mw:60.10,exactMass:60.0575,tpsa:20.2,logp:0.1,mr:17.3,hbd:1,hba:1,rotatableBonds:1,rings:0,aromaticRings:0,fractionCsp3:1,charge:0},v:{logS:-1.1}},
  { name: '=bad name', d: {formula:'C2H6O',mw:46.07,exactMass:46.0419,tpsa:20.2,logp:-0.3,mr:12.7,hbd:1,hba:1,rotatableBonds:0,rings:0,aromaticRings:0,fractionCsp3:1,charge:0},v:{logS:NaN}}
];
assert.ok(FIELDS.length >= 12);
const rows = comparisonRows(records,[0,1],0,false);
assert.equal(rows.length,FIELDS.length);
const mass = rows.find(row=>row.field.key==='mw');
assert.ok(Math.abs(mass.cells[1].delta-14.03)<1e-9);
assert.equal(mass.cells[0].delta,0);
assert.equal(comparisonRows(records,[0,1],0,true).some(row=>row.field.key==='tpsa'),false);
const swapped = comparisonRows(records,[0,1],1,false).find(row=>row.field.key==='mw');
assert.ok(Math.abs(swapped.cells[0].delta+14.03)<1e-9);
assert.equal(display(NaN,2),'Unavailable');
assert.equal(comparisonRows(records,[0,2],0,false).find(row=>row.field.key==='logS').cells[1].delta,null);
const csv=comparisonCsv(records,[0,2],0,false);
assert.ok(csv.includes("'=bad name"),'Spreadsheet-formula injection not escaped');
assert.ok(csv.includes('Molecular weight'));
assert.ok(!csv.includes('NaN'));
console.log('Comparison data regression checks passed');
