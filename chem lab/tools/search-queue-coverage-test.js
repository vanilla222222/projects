'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console, performance, setTimeout, clearTimeout });
for (const match of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g)) {
  if (match[1] !== 'js/app.js') vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), ctx, { filename: match[1] });
}
const run = code => vm.runInContext(code, ctx);
let checks=0;
function check(code, expected, label) { assert.equal(run(code),expected,label);checks++; }
run(`var queueJob={truncated:false,diagnostics:{}};var pending=[];var seen=new Set();`);
check("pathFinderQueuePush(queueJob,pending,seen,1,'a',{key:'a'})",true,'First branch admitted');
check("pathFinderQueuePush(queueJob,pending,seen,1,'a',{key:'a'})",false,'Duplicate branch is ignored');
check("queueJob.truncated",false,'Duplicate is not a search omission');
check("pathFinderQueuePush(queueJob,pending,seen,1,'b',{key:'b'})",false,'Full queue remains bounded');
check("queueJob.truncated&&queueJob.diagnostics.queue===1&&pending.length===1&&!seen.has('b')",true,'Omitted branch is reported without growing queue or marking visited');
check("pathFinderExplanation(queueJob).includes('pending-search queue was full')",true,'User explanation includes the specific limit');
run('pending.shift()');
check("pathFinderQueuePush(queueJob,pending,seen,1,'b',{key:'b'})",true,'Previously omitted branch can be admitted when capacity frees');
console.log('Search queue coverage: '+checks+' checks passed');
