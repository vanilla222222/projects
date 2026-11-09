'use strict';

const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { canonical } = require('../js/smiles.js');
const { makeEngine } = require('../js/search.js');
const { normalize } = require('../js/settings.js');

const epoxide = 'C1CCC2OC2C1';
const nitroAcetal = 'COC(OC)c1cccc([N+](=O)[O-])c1';
const nitroAldehyde = 'O=Cc1cccc([N+](=O)[O-])c1';
// These fixtures compare structures and disconnections only. The cited
// experimental conditions and stereochemical outcomes are outside the check.
const cases = [
  {
    name:'Cyclohexene oxide via epoxidation',
    reference:'https://doi.org/10.15227/orgsyn.005.0035',
    target:epoxide, stock:['C1=CCCCC1'], expected:['epoxidation'],
  },
  {
    name:'Cyclohexene oxide via chlorohydrin closure',
    reference:'https://doi.org/10.15227/orgsyn.005.0035',
    target:epoxide, stock:['OC1CCCCC1Cl'], expected:['halohydrin-closure'],
  },
  {
    name:'m-Nitrobenzaldehyde dimethyl acetal',
    reference:'https://doi.org/10.15227/orgsyn.029.0072',
    target:nitroAcetal, stock:[nitroAldehyde, 'CO'], expected:['acetal-formation'], strict:true,
  },
  {
    name:'m-Aminobenzaldehyde dimethyl acetal via nitro acetal',
    reference:'https://doi.org/10.15227/orgsyn.029.0006',
    target:'COC(OC)c1cccc(N)c1', stock:[nitroAldehyde, 'CO'],
    expected:['acetal-formation', 'nitro-reduction'], strict:true,
  },
  {
    name:'Bridged cyclopentadiene–maleic anhydride adduct (connectivity only)',
    reference:'https://doi.org/10.1039/B813485E',
    target:'O=C1OC(=O)C2C1C3C=CC2C3', stock:['C1=CCC=C1', 'O=C1OC(=O)C=C1'],
    expected:['diels-alder'],
  },
];
let recovered = 0;
const stops = {};
for (const { name, reference, target, stock, expected, strict } of cases) {
  const start = performance.now();
  const engine = makeEngine(normalize({
    inventory:stock, catalogue:'inventory', maxDepth:3, budgetMs:3000, maxRoutes:10,
    verify:strict ? 'strict' : 'warn',
  }));
  const result = engine.route(target);
  const match = result.routes.find(route => route.steps.map(step => step.transform).join() === expected.join()
    && [...new Set(route.startsFrom)].sort().join() === stock.map(canonical).sort().join());
  console.log(name + ' | ' + (match ? 'recovered' : 'missed') + ' | ' + (performance.now() - start).toFixed(1)
    + ' ms | ' + result.stop + ' | ' + reference);
  assert.ok(match, name);
  if (expected.includes('diels-alder')) assert.equal(match.steps[0].verdict.stereo, true);
  if (match) recovered += 1;
  stops[result.stop] = (stops[result.stop] || 0) + 1;
}

const chiralRisk = 'CC(O)c1ccccc1';
const riskOptions = { catalogue:'inventory', inventory:['CC(=O)c1ccccc1'], maxDepth:1,
  families:['reduction'] };
const warning = makeEngine(normalize({ ...riskOptions, verify:'warn' })).route(chiralRisk);
assert.ok(warning.routes.some(route => route.steps[0].verdict.stereo));
assert.equal(makeEngine(normalize({ ...riskOptions, verify:'strict' })).route(chiralRisk).routes.length, 0);
console.log(recovered + '/' + cases.length + ' published paths recovered, strict stereo regression passed. Stops ' + JSON.stringify(stops));
