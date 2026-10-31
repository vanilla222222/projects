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
const check = (code, expected, label) => { assert.equal(run(code), expected, label); checks++; };
const start = 'NCCC1=CC=CC=C1';
const target = 'BrC1=CC(=C(C=C1OC)CCN)OC';
ctx.start = start; ctx.target = target;

check(`retroProductIdentity('O=[N+]([O-])C1=CC=CC=C1') === retroProductIdentity('O=N(=O)C1=CC=CC=C1')`, true, 'Nitro resonance forms match');
check(`retroProductIdentity('O=[N+]([O-])C1=CC=CC=C1') === retroProductIdentity('O=[N+]([O-])C1=CC=CC=C1O')`, false, 'Different structures remain distinct');
check(`retroProductIdentity('NCCC1=CC=CC=C1[N+]([O-])=O') === retroProductIdentity('NCCC1=CC=C(C=C1)[N+]([O-])=O')`, false, 'Nitro positional isomers remain distinct');
check(`pathFinderMaterialKey('O=[N+]([O-])C1=CC=CC=C1') !== pathFinderMaterialKey('O=N(=O)C1=CC=CC=C1')`, true, 'Strict stock identity is unchanged');

const nitroTarget = 'NCCC1=CC=CC=C1[N+]([O-])=O';
ctx.nitroTarget = nitroTarget;
check(`(()=>{const t=retroTarget(retroFromSmiles(nitroTarget));t.edits=[];t.currentTransform='eas-nitration';return RETRO_TRANSFORMS.find(x=>x.id==='eas-nitration').match(t).some(s=>{const v=retroTryVerify(s,t.smiles);return v&&v.minor&&v.outcome.id==='nitration'&&s.precursors.length===1&&pathFinderKey(s.precursors[0].smiles)===pathFinderKey(start);});})()`, true, 'Charge-separated ortho nitration reverse verifies from the requested start');
check(`retroDisconnectSmiles(nitroTarget,{protect:false,budgetMs:10000}).candidates.some(c=>c.transform==='eas-nitration'&&c.precursors.some(p=>pathFinderKey(p.smiles)===pathFinderKey(start)))`, true, 'Public reverse search exposes the nitration link');

check(`(()=>{const g=retroFromSmiles(target),before=JSON.stringify(g),t=retroTarget(g);t.edits=[];t.currentTransform='williamson';const specs=RETRO_TRANSFORMS.find(x=>x.id==='williamson').match(t);return specs.length===2&&specs.every(s=>!!retroTryVerify(s,t.smiles))&&JSON.stringify(g)===before;})()`, true, 'Both target aryl methyl ethers disconnect without mutating the target');
check(`retroDisconnectSmiles(target,{protect:false,budgetMs:10000}).candidates.filter(c=>c.transform==='williamson').length`, 2, 'Public reverse search exposes both methoxy disconnections');
check(`retroDisconnectSmiles(target,{protect:false,budgetMs:10000}).candidates.filter(c=>c.transform==='williamson').every(c=>c.precursors.some(p=>p.smiles==='BrC')&&c.conditions.additives.includes('nah'))`, true, 'Methylation precursors and conditions are retained');

run(`var aromaticJob=pathFinderCreate(start,target,{maxDepth:10,budgetMs:30000});while(aromaticJob.status==='running')aromaticJob.step(100);`);
check('aromaticJob.status', 'found', 'Exact requested Path Finder search succeeds');
check('aromaticJob.routes.length', 3, 'The requested route count is returned');
check('aromaticJob.route.length', 9, 'The best route fits depth ten');
// Site compatibility can interleave ether formation with phenol generation;
// retain the transformation counts while verifying every complete route below.
check(`JSON.stringify(aromaticJob.route.map(link=>['williamson','mitsunobu-ether'].includes(link.candidate.transform)?'ether-formation':link.candidate.transform).sort())`, JSON.stringify(['eas-nitration','nitro-reduction','diazonium-phenol','eas-nitration','nitro-reduction','diazonium-phenol','ether-formation','ether-formation','eas-halogenation'].sort()), 'The aromatic route retains required transformation counts across valid operation orders');
check('aromaticJob.routes.every(route=>route.every(link=>!routeStepAssessment(link.candidate).blockers.length))', true, 'Every returned route also passes the current compatibility gate');
check('aromaticJob.route[0].fromKey===pathFinderKey(start)&&aromaticJob.route.at(-1).toKey===pathFinderKey(target)', true, 'Route endpoints match the requested structures');
check('aromaticJob.route.every((link,i,a)=>retroForwardCheck(link.candidate,link.to)&&(!i||a[i-1].toKey===link.fromKey))', true, 'Every route edge is continuous and forward verified');
check('aromaticJob.routes.every(route=>route.length===9&&route.every(link=>retroForwardCheck(link.candidate,link.to)))', true, 'All returned alternatives are forward verified');
check('aromaticJob.elapsedMs<30000', true, 'The exact search finishes within its budget');
console.log('Aromatic Path Finder regression: ' + checks + ' checks passed.');
