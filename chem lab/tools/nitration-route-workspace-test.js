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
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }
run(`
function nrStep(from,to,conditions={additives:['hno3','h2so4']}){
 return {from,to,ruleId:'nitration',compounds:[{smiles:from,role:'reactant'}],conditions};
}
function nrStatus(from,to,conditions){return routeWorkspaceValidateStep(nrStep(from,to,conditions)).status;}
`);
const benzene='C1=CC=CC=C1',toluene='CC1=CC=CC=C1';
ctx.benzene=benzene;ctx.toluene=toluene;

check(`nrStatus(benzene,'O=[N+]([O-])C1=CC=CC=C1')`,'verified','Charge-separated nitrobenzene target verifies against the neutral forward depiction');
check(`nrStatus(benzene,'O=N(=O)C1=CC=CC=C1')`,'verified','Neutral nitrobenzene target verifies');
check(`routeWorkspaceValidateStep(nrStep(benzene,'O=[N+]([O-])C1=CC=CC=C1')).ruleId`,'nitration','The verified step retains the nitration rule');
check(`nrStatus(toluene,'CC1=CC=CC=C1[N+]([O-])=O')`,'verified','Charge-separated ortho minor product verifies');
check(`nrStatus(toluene,'CC1=CC=C(C=C1)[N+]([O-])=O')`,'verified','Charge-separated para main product verifies');
check(`nrStatus(toluene,'CC1=CC=CC(=C1)[N+]([O-])=O')`,'unverified','Unsupported meta product remains unverified');
check(`nrStatus(benzene,'O=[N+]([O-])C1=CC=CC=C1O')`,'unverified','An extra substituent cannot be introduced by product normalization');
check(`nrStatus(benzene,'O=[N+]([O-])C1=CC=CC=C1',{additives:['hno3']})`,'unverified','Missing sulfuric acid still fails forward verification');
check(`routeWorkspaceValidateStep({...nrStep(benzene,'O=[N+]([O-])C1=CC=CC=C1'),ruleId:'sulfonation'}).status`,'unverified','A mismatched reaction rule remains unverified');
check(`routeWorkspaceValidateStep({...nrStep(benzene,'O=[N+]([O-])C1=CC=CC=C1'),from:'CC'}).status`,'invalid','Starting-material identity remains strict');

check(`routeWorkspaceKey('O=[N+]([O-])C1=CC=CC=C1')!==routeWorkspaceKey('O=N(=O)C1=CC=CC=C1')`,true,'The general strict workspace key is unchanged');
check(`routeWorkspaceProductKey('O=[N+]([O-])C1=CC=CC=C1')===routeWorkspaceProductKey('O=N(=O)C1=CC=CC=C1')`,true,'Full product identity normalizes only the nitro depiction');
check(`routeWorkspaceProductKey('N[C@H](C)O')!==routeWorkspaceProductKey('N[C@@H](C)O')`,true,'Full product identity preserves enantiomer distinctions');
check(`routeWorkspaceProductKey('NCCC1=CC=CC=C1[N+]([O-])=O')!==routeWorkspaceProductKey('NCCC1=CC=C(C=C1)[N+]([O-])=O')`,true,'Full product identity preserves positional isomer distinctions');
check(`pathFinderMaterialKey('O=[N+]([O-])C1=CC=CC=C1')!==pathFinderMaterialKey('O=N(=O)C1=CC=CC=C1')`,true,'Strict stock identity remains unchanged');

run(`var nrRoute=routeWorkspaceNormalize({version:1,start:benzene,target:'O=[N+]([O-])C1=CC=CC=C1',steps:[nrStep(benzene,'O=[N+]([O-])C1=CC=CC=C1')]});`);
check(`routeWorkspaceValidate(nrRoute).status`,'verified','A normalized saved nitration route validates end to end');
check(`routeWorkspaceValidate(nrRoute).issues.length`,0,'The saved route remains continuous');
check(`routeWorkspaceCsv(nrRoute).includes(',verified,')`,true,'CSV export records the repaired verification status');
check(`(()=>{const before=JSON.stringify(nrRoute);routeWorkspaceValidate(nrRoute);return JSON.stringify(nrRoute)===before;})()`,true,'Validation does not mutate the saved route');
check(`retroDisconnectSmiles('O=[N+]([O-])C1=CC=CC=C1',{protect:false,budgetMs:10000}).candidates.some(c=>c.transform==='eas-nitration'&&retroForwardCheck(c,'O=[N+]([O-])C1=CC=CC=C1'))`,true,'The original forward-verified reverse nitration path remains available');
console.log('Nitration Route Workspace: ' + checks + ' checks passed.');
