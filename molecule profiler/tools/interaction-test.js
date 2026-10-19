'use strict';
// Exercise application event handlers with minimal DOM doubles. Real-browser
// behavior (focus, layout, downloads) remains the responsibility of browser-e2e.py.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/app.js'), 'utf8');
function functionSource(name, next) {
  return source.slice(source.indexOf('function '+name+'('), source.indexOf('\nfunction '+next+'('));
}
const rows = [2, 0, 1].map(index => ({
  dataset: {index:String(index)}, active:false, attributes:{},
  classList:{toggle(key, value) { rows.find(row => row.classList === this).active = value; }},
  setAttribute(key, value) { this.attributes[key] = value; },
  removeAttribute(key) { delete this.attributes[key]; }
}));
const context = vm.createContext({current:0, document:{querySelectorAll:()=>rows}});
vm.runInContext(functionSource('synchronizeBatchSelection', 'renderBatch'), context);
vm.runInContext('synchronizeBatchSelection()', context);
assert.deepEqual(rows.filter(row => row.active).map(row => row.dataset.index), ['0']);
context.current = 1;
vm.runInContext('synchronizeBatchSelection()', context);
assert.deepEqual(rows.filter(row => row.active).map(row => row.dataset.index), ['1']);
assert.equal(rows[1].attributes['aria-current'], undefined, 'old selection must be cleared');
assert.equal(rows[2].attributes['aria-current'], 'true');
context.current = 99;
vm.runInContext('synchronizeBatchSelection()', context);
assert.equal(rows.filter(row => row.active).length, 0, 'filtered-out selection must not mark another row');

let click;
const theme = vm.createContext({
  records:[], renderCurrent(){ throw Error('no records to render'); },
  localStorage:{getItem(){throw Error('denied');}, setItem(){throw Error('denied');}},
  document:{body:{dataset:{}},getElementById(){return {addEventListener(event, callback){click=callback;}};}}
});
vm.runInContext(source.slice(source.indexOf('function setupTheme()'),
  source.indexOf("\ndocument.getElementById('run').addEventListener")), theme);
vm.runInContext('setupTheme()', theme);
click();
assert.equal(theme.document.body.dataset.theme, 'dark');
click();
assert.equal(theme.document.body.dataset.theme, 'light');
console.log('Batch selection and storage-denied startup regressions passed');
