'use strict';
const assert=require('node:assert/strict');
const {summarize,asText,METRICS}=require('../js/report-model.js');
const obj={name:'Water',smiles:'O',d:{formula:'H2O',mw:18.015,tpsa:0,logp:-1.234,hbd:2,hba:1,rotatableBonds:0,rings:0,charge:0},v:{logS:-0.5}};
const data={logS:{n:1128,mae:0.843,rmse:1.099,r2:0.725,source:'https://example.org/dev'},
 logSBlind:{n:56,mae:0.83,rmse:1.031,r2:0.614,source:'https://example.org/blind'},
 logPNeutral:{n:2049,mae:0.86,rmse:1.179,r2:-0.184,source:'https://example.org/neutral'}};
assert.equal(summarize(null,data),null);
assert.equal(METRICS.length,8);
const report=summarize(obj,data,()=>['Charged structure caveat']);
assert.equal(report.name,'Water');
assert.equal(report.formula,'H2O');
assert.equal(report.metrics.find(x=>x.key==='mw').value,'18.02');
assert.equal(report.metrics.find(x=>x.key==='logp').value,'-1.23');
assert.equal(report.metrics.find(x=>x.key==='logS').kind,'Estimated');
assert.equal(report.evidence.length,3);
assert.equal(report.evidence[1].title,'Solubility · independent set');
assert.equal(report.evidence[1].url,'https://example.org/blind');
assert.ok(report.evidence[1].caveat.includes('not an uncertainty'));
assert.equal(report.warnings.length,1);
assert.equal(summarize({...obj,v:{logS:NaN}},{}).metrics.find(x=>x.key==='logS').value,'Unavailable');
assert.equal(asText(Infinity,2),'Unavailable');
assert.equal(summarize(obj,{logS:{n:3,mae:0.4,source:'javascript:alert(1)'}}).evidence[0].url,null);
console.log('Molecule summary and report methodology regression checks passed');
