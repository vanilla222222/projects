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
run(`function rankFixture(reagents,conditions){return [{precursor:0,candidate:{precursors:[{smiles:'C'}],reagents:reagents.map(smiles=>({smiles,role:'reagent'})),conditions}}];}`);
check("pathFinderProcessBurden(rankFixture(['O','O'],{solvents:['none']}))",1,'Duplicate reagent identity counted once');
check("pathFinderProcessBurden(rankFixture(['CCO','OCC'],{}))",1,'Equivalent SMILES count once');
check("pathFinderProcessBurden(rankFixture([],{solvents:['ether'],additives:['dmp']}))",2,'Solvent and additive entries counted');
check("pathFinderProcessBurden(rankFixture([],{}))",0,'Absent records do not invent materials');
check("JSON.stringify(pathFinderRouteRank(rankFixture([],{})).slice(0,7))===JSON.stringify(pathFinderRouteRank(rankFixture(['O'],{})).slice(0,7))",true,'Existing ranking priorities retained');
check("pathFinderRouteMetrics(rankFixture([],{})).processMaterials<pathFinderRouteMetrics(rankFixture(['O'],{})).processMaterials",true,'Material burden breaks an otherwise equal tie');
check("pathFinderProcessBurden([...rankFixture(['O'],{}),...rankFixture(['O'],{})])",1,'Repeated entries across steps are deduplicated');
console.log('Route burden ranking: '+checks+' checks passed');
