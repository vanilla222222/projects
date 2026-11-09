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

const alternatives = [
  step(target, [leaf], 'finish-a'), step(target, [leaf], 'finish-b'),
  { ...step(target, [other], 'finish-c'), family:'protection' },
];
const comparison = {
  stock:{ has:m => m === leaf || m === other,
    source:m => m === leaf ? 'assumed small molecule' : 'inventory' },
  disconnect:() => alternatives,
};
const diverse = search.makeEngine(settings.normalize({ verify:'off', maxRoutes:2 }), comparison).route(target);
assert.deepEqual(diverse.routes.map(route => route.steps[0].transform), ['finish-a', 'finish-c']);
const stockComparison = search.makeEngine(settings.normalize({ verify:'off', maxRoutes:2, routeRanking:'stock' }),
  comparison).route(target);
assert.equal(stockComparison.routes[0].steps[0].transform, 'finish-c');

const limited = search.makeEngine(settings.normalize({ catalogue:'inventory', inventory:['CCCC'] }));
assert.equal(limited.buyable(leaf), false);
assert.equal(limited.stock.source(named), 'inventory');
assert.equal(limited.route(named).stop, 'already-in-stock');
const expired = analogues.analogues('c1ccccc1', settings.normalize({ mode:'analogues' }),
  { route(){ throw new Error('search must stop before starting a route'); } }, { deadline:Date.now() - 1 });
assert.equal(expired.stop, 'time-limit');

const transforms = require('../js/transforms.js');
const forward = require('../js/forward.js');
for (const [id, product, precursors, checked] of [
  ['acid-reduction','CCCO',['CCC(=O)O'],true],
  ['aldehyde-oxidation','CCC(=O)O',['CCC=O'],true],
  ['nitrile-reduction','CCCN',['CCC#N'],true],
  ['amide-reduction','CCCN',['CCC(N)=O'],true],
  ['alcohol-dehydration','CC=C',['CCCO'],true],
  ['imine-condensation','CC=NC',['CC=O','CN'],true],
  ['acetal-formation','COC(C)OC',['CC=O','CO','CO'],true],
  ['diels-alder','C1=CCCCC1',['C=CC=C','C=C'],true],
]) {
  const expected = precursors.map(canonical).sort();
  const options = transforms.disconnect(smiles.parse(product));
  const candidate = options.find(option => option.transform === id
    && JSON.stringify(option.precursors) === JSON.stringify(expected));
  assert.ok(candidate, id + ' proposes expected precursors');
  const verification = forward.verify(candidate);
  assert.equal(verification.checked, checked, id);
  if (checked) assert.equal(verification.ok, true, id + ' reproduces the modelled target');
}
const strategyGraph = new Map([
  [target, [{ ...step(target, [leaf], 'short'), family:'protection' }, step(target, [intermediate], 'long')]],
  [intermediate, [step(intermediate, [named], 'middle')]],
  [named, [step(named, [leaf], 'last')]],
]);
for (const [strategy, depth] of [['best-first',3], ['breadth',1], ['depth',3], ['iterative',1]]) {
  const strategyEngine = search.makeEngine(settings.normalize({ strategy, verify:'off', maxRoutes:1,
    weightSteps:0, weightCost:0, weightPrecedent:0, weightConvergence:0, weightProtection:1 }), {
    stock:{ has:m => m === leaf },
    disconnect:mol => strategyGraph.get(smiles.canonicalWrite(mol)) || [],
  });
  assert.equal(strategyEngine.route(target).routes[0].depth, depth, strategy);
}

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
console.log('Stocked-target paths, route diversity, exact inventory, deadlines, eight reactions, four search methods, and worker messages passed.');
