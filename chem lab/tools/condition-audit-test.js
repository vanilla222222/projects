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
run(`function mediumFixture(solvents,reagent='[Li+].[AlH4-]'){
 const compounds=['CC(C)=O',reagent].map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant'}));
 const conditions={...defaultReactionConditions(),solvents};
 const prediction=predictReaction(compounds,conditions);
 return reactionScopeAssess(compounds,conditions,prediction.best);
}`);
for(const solvent of ['water','ethanol','methanol']){ctx.solvent=solvent;check("mediumFixture([solvent]).reasons.some(r=>r.code==='alanate-protic-medium'&&r.level==='conflict')",true,'Protic solvent conflict '+solvent);}
for(const solvent of ['ether','thf']){ctx.solvent=solvent;check("mediumFixture([solvent]).reasons.some(r=>r.code==='alanate-protic-medium')",false,'Dry medium remains supported '+solvent);}
check("mediumFixture(['ethanol'],'[Na+].[BH4-]').reasons.some(r=>r.code==='alanate-protic-medium')",false,'Mild borohydride does not inherit alanate constraint');
check("mediumFixture(['ether','water']).status",'conflict','An ether cosolvent does not hide recorded water');
console.log('Condition audit: '+checks+' checks passed');
