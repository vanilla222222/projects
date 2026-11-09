'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const settings = require('../js/settings.js');
const smiles = require('../js/smiles.js');
const search = require('../js/search.js');
const analogues = require('../js/analogues.js');
const { conditionsAllowed } = require('../js/transforms.js');

const canonical = smiles.canonical;
const target = canonical('CCCCCC'), intermediate = canonical('CCCCC');
const named = canonical('CCCC'), other = canonical('CCC'), leaf = canonical('CC');
const step = (product, precursors, transform) => ({
  product, precursors, transform, family:'test', name:transform, reagents:[],
});
const synthetic = new Map([
  [target, [step(target, [intermediate, other], 'finish')]],
  [intermediate, [step(intermediate, [named], 'prepare')]],
  [named, [step(named, [target], 'cycle')]],
  [other, [step(other, [leaf], 'prepare-a'), step(other, [leaf], 'prepare-b')]],
]);
const engine = search.makeEngine(settings.normalize({ verify:'off' }), {
  stock:{ has:m => m === target || m === intermediate || m === leaf },
  disconnect:mol => synthetic.get(smiles.canonicalWrite(mol)) || [],
});
const answer = engine.path(target, named);
assert.equal(answer.ok, true);
assert.equal(answer.routes.length, 2, 'different transforms survive identical stock states');
for (const route of answer.routes) {
  assert.equal(route.steps.at(-1).product, target);
  assert.ok(route.steps.slice(0, -1).every(s => s.product !== target));
  assert.ok(route.sources.some(s => s.smiles === named && s.source === 'named start'));
}
assert.equal(engine.path(target, named, { deadline:Date.now() - 1 }).stop, 'time-limit');

const limited = search.makeEngine(settings.normalize({ catalogue:'inventory', inventory:['CCCC'] }));
assert.equal(limited.buyable(leaf), false);
assert.equal(limited.stock.source(named), 'inventory');
assert.equal(limited.route(named).stop, 'already-in-stock');
const expired = analogues.analogues('c1ccccc1', settings.normalize({ mode:'analogues' }),
  { route(){ throw new Error('search must stop before starting a route'); } }, { deadline:Date.now() - 1 });
assert.equal(expired.stop, 'time-limit');

const js = name => fs.readFileSync(path.resolve(__dirname, '../js', name), 'utf8');
const messages = [];
const worker = vm.createContext({ self:{ postMessage:message => messages.push(message) } });
worker.importScripts = (...files) => {
  for (const file of files) vm.runInContext(js(file), worker, { filename:file });
};
vm.runInContext(js('worker.js'), worker, { filename:'worker.js' });
worker.self.onmessage({ data:settings.normalize({ target:'O=C(NCc1ccccc1)c1ccc(-c2ccncc2)cc1' }) });
assert.equal(messages.at(-1).type, 'result');
assert.ok(messages.at(-1).result.routes.length);
const restricted = {
  allowCryogenic:false, allowPressure:false, allowPhotochemistry:false,
  allowElectrochemistry:false, allowAirSensitive:false,
};
for (const conditions of [{ temperature:-78 }, { pressureAtm:2 }, { photochemical:true },
  { electrochemical:true }, { airSensitive:true }]) {
  assert.equal(conditionsAllowed(conditions, restricted), false);
  assert.equal(conditionsAllowed(conditions, {}), true);
}
assert.equal(conditionsAllowed({ temperature:-77, pressureAtm:1 }, restricted), true);
worker.self.onmessage({ data:settings.normalize({ target:'O=C(NCc1ccccc1)c1ccc(-c2ccncc2)cc1', ...restricted }) });
assert.equal(messages.at(-1).type, 'result');
assert.ok(messages.at(-1).result.routes.length);
assert.match(messages.at(-1).result.conditionNotice, /unknown/);
worker.self.onmessage({ data:settings.normalize({ target:'CCO', banHazards:['pyrophoric'] }) });
assert.equal(messages.at(-1).type, 'error');
assert.match(messages.at(-1).message, /not supported/);
console.log('Stocked-target paths, route diversity, exact inventory, deadlines, and worker messages passed.');
