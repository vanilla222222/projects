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
const run = (code) => vm.runInContext(code, ctx);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }

check('STOCK_BUILTIN.length >= 461', true, 'The expanded common-stock catalog is registered');
check(`(()=>{const seen=new Set();return STOCK_BUILTIN.every(e=>{const key=stockCanonical(e.smiles);if(!key||seen.has(key))return false;seen.add(key);return true;});})()`, true, 'Every stock entry parses and has a unique canonical identity');
for (const name of ['nitromethane', 'benzoin', 'benzil', '2-phenylethylamine', 'piperonyl alcohol', 'veratraldehyde', 'eugenol', 'safrole', '1,2-dimethoxyethane', 'hydrobenzoin']) {
  ctx.stockName = name;
  check(`(()=>{const e=STOCK_BUILTIN.find(x=>x.name===stockName);return !!e&&e.tier===2&&!!stockTier(e.smiles);})()`, true, 'Common building block is available to the built-in policy: ' + name);
}
check(`moleculeSame(stockTier(STOCK_BUILTIN.find(x=>x.name==='nitromethane').smiles).smiles,'CN(=O)=O')`, true, 'Nitroalkane stock lookup preserves molecular identity');

function pathSearch(start, target, options) {
  ctx.pathStart = start; ctx.pathTarget = target; ctx.pathOptions = options;
  return run('var feedJob=pathFinderCreate(pathStart,pathTarget,pathOptions);while(feedJob.status==="running")feedJob.step(100);feedJob;');
}
pathSearch('O=CC1=CC=CC=C1', 'O=N(CC(O)C1=CC=CC=C1)=O', { stockPolicy: 'builtin', maxDepth: 1, budgetMs: 15000, maxBranch: 12 });
check('feedJob.status', 'found', 'Path Finder uses stocked nitromethane in a one-step Henry route');
check(`feedJob.routes.some(route=>route.length===1&&route[0].candidate.transform==='henry'&&retroForwardCheck(route[0].candidate,route[0].candidate.product.smiles))`, true, 'The Henry planner edge is forward verified');
pathSearch('O=CC1=CC=CC=C1', 'O=C(C(=O)C1=CC=CC=C1)C1=CC=CC=C1', { stockPolicy: 'builtin', maxDepth: 2, budgetMs: 25000, maxBranch: 16, maxRoutes: 12 });
check('feedJob.status', 'found', 'Path Finder finds a two-step benzaldehyde to benzil route');
check(`feedJob.routes.some(route=>{const ids=route.map(link=>link.candidate.transform);return ids.includes('benzoin')&&ids.includes('benzoin-oxidation')&&route.every(link=>retroForwardCheck(link.candidate,link.candidate.product.smiles));})`, true, 'Benzoin condensation and oxidation form a verified two-step sequence');
check(`['henry','benzoin','benzoin-oxidation','staudinger','appel','cyanohydrin','wacker','simmons-smith'].every(id=>RETRO_TRANSFORMS.some(x=>x.id===id))`, true, 'All new reverse methods are registered in the public engine');
check(`['henry','benzoin-oxidation'].every(id=>RX_RULES.some(x=>x.id===id))`, true, 'Both new forward rules are registered in the public engine');
console.log('Feedstock and planner expansion: ' + checks + ' checks passed.');
