'use strict';
const assert = require('node:assert/strict');
const { propertyEvidenceRows, propertyEvidenceWarnings } = require('../js/evidence-report.js');
const base = { mw: 180.16, tpsa: 63.6, logp: 1.3, logS: -2.1, mr: 44.3, hbd: 1, hba: 4, rotatableBonds: 3, charge: 0, heavyAtoms: 13 };
const rows = propertyEvidenceRows(base);
assert.equal(rows.length, 8);
assert.equal(rows.find(x => x.label === 'Aqueous log S').value, -2.1);
assert.equal(rows.find(x => x.label === 'WLOGP').tier, 'estimated');
assert.equal(rows.find(x => x.label === 'Molecular weight').tier, 'calculated');
assert.deepEqual(propertyEvidenceWarnings(base), []);
assert.ok(propertyEvidenceWarnings({ ...base, charge: 1 }).some(x => x.includes('Charged')));
assert.ok(propertyEvidenceWarnings({ ...base, logp: 9 }).some(x => x.includes('Extreme')));
assert.equal(propertyEvidenceRows({ ...base, logS: NaN }).find(x => x.label === 'Aqueous log S').value, null);
assert.ok(propertyEvidenceWarnings({ ...base, logS: NaN }).some(x => x.includes('solubility estimate is unavailable')));
const withValidation = propertyEvidenceRows(base, {
  logS: {n:1128,mae:0.84,rmse:1.10,r2:0.72,source:'https://example.com/logs'},
  logSBlind: {n:56,mae:0.83,rmse:1.03,r2:0.61,source:'https://example.com/blind'},
  logPNeutral: {n:2049,mae:0.86,rmse:1.18,r2:-0.18,source:'https://example.com/logd'}
});
assert.ok(withValidation.find(x=>x.label==='Aqueous log S').validation.includes('Independent set'));
assert.ok(withValidation.find(x=>x.label==='WLOGP').validation.includes('Neutral-only log D comparison'));
assert.equal(withValidation.find(x=>x.label==='Molecular weight').validation, '');
console.log('Descriptor evidence checks passed');
