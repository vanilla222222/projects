'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, performance, setTimeout, clearTimeout });
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/<script src="([^"]+)"/g)) {
  if (match[1] !== 'js/app.js') vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), context, { filename: match[1] });
}
const run = (code) => vm.runInContext(code, context);
let checks = 0;
function check(code, expected, label) { assert.equal(run(code), expected, label); checks++; }
run(`function protectionSearch(start,target,options){const j=pathFinderCreate(start,target,Object.assign({maxDepth:3,maxRoutes:1,stockPolicy:'custom',availableMaterials:['CC(=O)Cl'],forbiddenRules:['fischer']},options));while(j.status==='running')j.step(100);return j;}
var protectedJob=protectionSearch('NCCO','NCCOC(C)=O');`);
check('protectedJob.status', 'found', 'Free amine competing with O-acylation gets a supported route');
check('protectedJob.route.length', 3, 'Protection and deprotection are separate counted steps');
check(`protectedJob.route.map(l=>l.candidate.planning.kind).join(',')`, 'protect,reaction,deprotect', 'Visible planning roles');
check(`protectedJob.route.every(l=>l.candidate.planning.group==='Boc' && /competes/.test(l.candidate.planning.reason))`, true, 'Protecting group and reason attached to each step');
check(`protectedJob.route.every(l=>retroForwardCheck(l.candidate,l.to))`, true, 'Every protecting/main/deprotecting step forward verified');
check(`protectedJob.route.slice(1).every((l,i)=>l.fromKey===protectedJob.route[i].toKey)`, true, 'Protected intermediates connect');
check(`protectedJob.route[0].fromKey===pathFinderKey('NCCO') && protectedJob.route[2].toKey===pathFinderKey('NCCOC(C)=O')`, true, 'Unprotected endpoints retained');
check(`protectionSearch('NCCO','NCCOC(C)=O',{maxDepth:1}).status==='found'`, false, 'One step cannot hide a protection triplet');
check(`protectionSearch('NCCO','NCCOC(C)=O',{maxDepth:2}).status==='found'`, false, 'Two steps cannot hide a protection triplet');
for (const depth of [6,7,8,9,10]) check(`pathFinderCreate('CCO','CCO',{maxDepth:${depth}}).options.maxDepth`, depth, 'Step setting ' + depth);
check(`pathFinderCreate('CCO','CCO',{maxDepth:6}).options.maxNodes`, 200, 'Longer search has expanded node budget');
check(`pathFinderCreate('CCO','CCO',{maxDepth:10}).options.budgetMs`, 30000, 'Longer search has explicit thirty-second processing budget');
check(`pathFinderCreate('CCO','CCO',{maxDepth:3}).options.maxNodes`, 60, 'Short search retains bounded budget');
check(`pathFinderCreate('CCO','CCO',{maxDepth:10,maxNodes:2,budgetMs:50}).options.maxNodes`, 2, 'Explicit smaller budget honored');
check(`protectionSearch('NCCO','NCCOC(C)=O',{forbiddenRules:['fischer','protection']}).status==='found'`, false, 'Protection rule exclusion applies to substeps');
check(`(()=>{const j=protectionSearch('NCCO','NCCOC(C)=O',{forbiddenReagents:['Boc2O']});return j.status==='found'&&j.route.every(l=>l.candidate.planning.group!=='Boc');})()`, true, 'Protection reagent exclusion selects an independent compatible alternative');
check(`(()=>{const j=protectionSearch('NCCO','NCCOC(C)=O',{forbiddenReagents:['TFA']});return j.status==='found'&&j.route.every(l=>l.candidate.planning.group!=='Boc');})()`, true, 'Deprotection reagent exclusion selects an alternative removal strategy');
check(`protectionSearch('NCCO','NCCOC(C)=O',{forbiddenReagents:['Boc2O','CbzCl','Fmoc-Cl']}).status==='found'`, false, 'All encoded amine installation reagents excluded');
check(`protectionSearch('NCCO','NCCOC(C)=O',{availableMaterials:[]}).status==='found'`, false, 'Other main-step building block still required');
check(`(()=>{const j=protectionSearch('CC(C)(C)OC(=O)NCCO','CC(C)(C)OC(=O)NCCOC(C)=O',{maxDepth:1});return j.status==='found' && j.route.length===1 && !j.route[0].candidate.planning;})()`, true, 'Already protected amine does not add needless protection');
check(`(()=>{const j=protectionSearch('NC[C@H](O)C','NC[C@H](OC(C)=O)C');return j.status==='found' && j.route.length===3 && j.route[2].toKey===pathFinderKey('NC[C@H](OC(C)=O)C') && j.route[0].fromKey===pathFinderKey('NC[C@H](O)C');})()`, true, 'Pre-existing tetrahedral stereochemistry preserved');
check(`(()=>{const j=protectionSearch('[13CH2](N)CO','[13CH2](N)COC(C)=O');return j.status==='found' && j.route.every(l=>l.to.includes('13C'));})()`, true, 'Isotope identity survives the full triplet');
check(`retroProtectTry({}, {transform:{rule:'grignard'}}, {kind:'amine'})`, null, 'No invented generic Boc compatibility with Grignard');
check(`(()=>{const c={compounds:[{smiles:'NCCC=O',fragment:smilesToFragment('NCCC=O'),role:'reactant'},{smiles:'C[Mg]Br',fragment:smilesToFragment('C[Mg]Br'),role:'reagent'}],conditions:defaultReactionConditions()};return /N–H/.test(pathFinderAmineConflict(c));})()`, true, 'Reactive N-H incompatibility is identified explicitly');
check(`(()=>{const j=pathFinderCreate('NCCC=O','NCCC(O)C',{maxDepth:1,maxRoutes:1,stockPolicy:'custom',availableMaterials:['C[Mg]Br']});while(j.status==='running')j.step(100);return j.status!=='found' && /N–H/.test(pathFinderExplanation(j));})()`, true, 'Unsupported organometallic protection is explained, not returned as a route');
check(`(()=>{const j=protectionSearch('NCCO','NCCOC(C)=O');const doc=routeWorkspaceNormalize({version:1,name:'Protected O-acylation',start:j.start,target:j.target,steps:j.route});return routeWorkspaceValidate(doc).status==='verified' && doc.steps.every(s=>s.planning && s.planning.group==='Boc');})()`, true, 'Expanded route stays verified and annotated in workspace');
// Mechanical depth checks use a synthetic chain; these are search-budget tests,
// not assertions that carbon-chain growth is a real supported transformation.
check(`(()=>{const original=retroDisconnectSteps;try{retroDisconnectSteps=function*(graph){const text='C'.repeat(graph.atoms.length);return {candidates:graph.atoms.length<2?[]:[{transform:'depth-fixture',name:'Synthetic depth fixture',precursors:[{smiles:text.slice(1),role:'reactant'}],compounds:[{smiles:text.slice(1),role:'reactant',fragment:smilesToFragment(text.slice(1))}],conditions:defaultReactionConditions(),product:{smiles:text},reagents:[],minor:false}]};};const j=pathFinderCreate('C','CCCCCCC',{maxDepth:6,maxRoutes:1,stockPolicy:'custom'});while(j.status==='running')j.step(100);return j.status==='found' && j.route.length===6;}finally{retroDisconnectSteps=original}})()`, true, 'A six-step chain can be traversed');
check(`(()=>{const original=retroDisconnectSteps;try{retroDisconnectSteps=function*(graph){const text='C'.repeat(graph.atoms.length);return {candidates:graph.atoms.length<2?[]:[{transform:'depth-fixture',name:'Synthetic depth fixture',precursors:[{smiles:text.slice(1),role:'reactant'}],compounds:[{smiles:text.slice(1),role:'reactant',fragment:smilesToFragment(text.slice(1))}],conditions:defaultReactionConditions(),product:{smiles:text},reagents:[],minor:false}]};};const j=pathFinderCreate('C','CCCCCCCCCCC',{maxDepth:10,maxRoutes:1,stockPolicy:'custom'});while(j.status==='running')j.step(100);return j.status==='found' && j.route.length===10;}finally{retroDisconnectSteps=original}})()`, true, 'A ten-step chain can be traversed');
const nodes = Object.fromEntries(['path-start','path-target','path-run','path-cancel','path-status','path-results','path-example','path-depth','path-search-limits'].map((id) => [id, { value: id === 'path-depth' ? '3' : '', textContent: '', events: {}, addEventListener(type, fn) { this.events[type] = fn; }, focus() {} }]));
context.document = { getElementById(id) { return nodes[id] || null; }, createElement() { return {}; } };
run('var protectionController=createPathFinder({});');
assert.match(nodes['path-search-limits'].textContent, /60 structures and 12 seconds/); checks++;
nodes['path-depth'].value = '10'; nodes['path-depth'].events.change();
assert.match(nodes['path-search-limits'].textContent, /200 structures and 30 seconds/); checks++;
nodes['path-depth'].value = '5'; nodes['path-depth'].events.change();
assert.match(nodes['path-search-limits'].textContent, /60 structures and 12 seconds/); checks++;
console.log('Amine protection and extended depth: ' + checks + ' checks passed.');
