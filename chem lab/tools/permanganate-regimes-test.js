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
run(`function permFixture(smiles,temperature,solvents=['water'],additives=[]){
 const compounds=[{smiles,fragment:smilesToFragment(smiles),role:'reactant',equiv:'1'},
 {smiles:'[O-][Mn](=O)(=O)=O.[K+]',fragment:smilesToFragment('[O-][Mn](=O)(=O)=O.[K+]'),role:'reagent',equiv:'2'}];
 const conditions={...defaultReactionConditions(),temperature,solvents,additives};const before=JSON.stringify(compounds);
 const r=predictReaction(compounds,conditions);
 return {outcomes:[r.best,...r.alternatives].filter(Boolean),hints:r.hints,compounds,conditions,unchanged:before===JSON.stringify(compounds)};
}`);
check("permFixture('Cc1ccccc1',0,['water'],['naoh']).outcomes.some(o=>o.id==='side-chain-oxidation')",false,'Cold permanganate is not labelled hot benzylic oxidation');
check("permFixture('CC=CC',11).outcomes.some(o=>o.id==='permanganate-cleavage')",false,'An 11 C input is not labelled hot cleavage');
check("permFixture('CC=CC',0,['water'],['naoh']).outcomes.some(o=>o.id==='dihydroxylation')",true,'Explicit cold aqueous alkali retains the diol branch');
for(const temperature of [-5,0,10]){
 ctx.temperature=temperature;
 check("permFixture('C=C',temperature,['water'],['naoh']).outcomes.some(o=>o.id==='dihydroxylation'&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,'OCCO')))",true,'Cold alkaline model bound '+temperature);
 check("permFixture('C=C',temperature,['water'],['naoh']).outcomes.some(o=>o.id==='permanganate-cleavage')",false,'Cold branch does not also cleave '+temperature);
}
for(const temperature of [11,25,59]){
 ctx.temperature=temperature;
 check("permFixture('CC=CC',temperature).outcomes.some(o=>['dihydroxylation','permanganate-cleavage'].includes(o.id))",false,'Intermediate regime is unresolved '+temperature);
 check("permFixture('Cc1ccccc1',temperature).outcomes.some(o=>o.id==='side-chain-oxidation')",false,'No heated side-chain claim '+temperature);
}
for(const temperature of [60,80]){
 ctx.temperature=temperature;
 check("permFixture('CCC=CC',temperature).outcomes.some(o=>o.id==='permanganate-cleavage'&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,'CCC(=O)O'))&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,'CC(=O)O')))",true,'Hot cleavage endpoint '+temperature);
 check("permFixture('CCc1ccccc1',temperature).outcomes.some(o=>o.id==='side-chain-oxidation'&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,'O=C(O)c1ccccc1')))",true,'Heated benzylic endpoint '+temperature);
}
for(const [temperature,solvents,additives] of [
 [0,['water'],[]],[0,['water'],['h2so4']],[80,['water'],['naoh']],
 [80,['dcm'],[]],[80,['none'],[]],[0,['methanol'],['naoh']],
 [80,['water','ethanol'],[]],[0,['water','acetone'],['naoh']]
]){
 ctx.temperature=temperature;ctx.solvents=solvents;ctx.additives=additives;
 check("permFixture('CC=CC',temperature,solvents,additives).outcomes.some(o=>['dihydroxylation','permanganate-cleavage'].includes(o.id))",false,'Unencoded pH/medium does not force a product '+JSON.stringify([temperature,solvents,additives]));
}
check("permFixture('CCC=CC',80,['water'],['h2so4']).outcomes.some(o=>o.id==='permanganate-cleavage')",true,'Heated aqueous acid branch retained');
check("permFixture('CC(C)(C)c1ccccc1',80).outcomes.some(o=>o.id==='side-chain-oxidation')",false,'No benzylic hydrogen gives no side-chain proposal');
check("permFixture('BrCc1ccccc1',80).outcomes.some(o=>o.id==='side-chain-oxidation')",false,'Unencoded hetero-substituted benzylic carbon excluded');
check("permFixture('[13CH3]c1ccccc1',80).outcomes.some(o=>o.id==='side-chain-oxidation'&&o.products.some(p=>moleculeSame(p.fragment||p.smiles,'O=[13C](O)c1ccccc1')))",true,'Benzylic carbon isotope retained');
run("var hotCompetition=permFixture('Cc1ccc(C=C)cc1',80);var hotOutcome=hotCompetition.outcomes.find(o=>o.id==='permanganate-cleavage');");
check("hotOutcome.chemoselectivity.competing.some(c=>c.group==='benzylicAlkyl')",true,'Heated alkene cleavage does not hide benzylic competition');
check("routeStepAssessment({outcome:hotOutcome,compounds:hotCompetition.compounds,conditions:hotCompetition.conditions}).status",'blocked','Unresolved heated competition cannot become a verified route');
check("reactionScopeAssess(hotCompetition.compounds,hotCompetition.conditions,hotOutcome).status",'conflict','Scope audit agrees with hot competition');
run("var coldCompetition=permFixture('Cc1ccc(C=C)cc1',0,['water'],['naoh']);var coldOutcome=coldCompetition.outcomes.find(o=>o.id==='dihydroxylation');");
check("!!coldOutcome&&!coldOutcome.chemoselectivity?.competing.some(c=>c.group==='benzylicAlkyl')",true,'Cold branch does not inherit hot benzylic susceptibility');
check("reactionScopeAssess(coldCompetition.compounds,coldCompetition.conditions,coldOutcome).sites.some(s=>s.group==='benzylicAlkyl'&&s.susceptible)",false,'Cold audit preserves condition-specific susceptibility');
check("permFixture('Cc1ccc(CO)cc1',80).outcomes.find(o=>o.id==='oxidation-kmno4').chemoselectivity.competing.some(c=>c.group==='benzylicAlkyl')",true,'Hot alcohol-only product is not assumed selective over an alkyl side chain');
for(const [smiles,temperature,additives] of [['C=C',0,['naoh']],['CCC=CC',80,[]],['CCc1ccccc1',80,[]]]){
 ctx.smiles=smiles;ctx.temperature=temperature;ctx.additives=additives;
 check("permFixture(smiles,temperature,['water'],additives).unchanged",true,'Inputs unchanged '+smiles);
}
check("(()=>{const f=permFixture('Cc1ccccc1',80);const o=f.outcomes.find(o=>o.id==='side-chain-oxidation');return reactionScopeAssess(f.compounds,{...f.conditions,temperature:0},o).status;})()",'conflict','Changing recorded temperature invalidates a stale hot outcome');
check("RX_CHEMOSELECTIVITY.find(e=>e.id==='permanganate').attacks.includes('benzylicAlkyl')",false,'Condition-specific sites never mutate the shared registry');
console.log('Permanganate regimes: '+checks+' checks passed');
