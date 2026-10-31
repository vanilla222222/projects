'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = vm.createContext({ console, performance, setTimeout, clearTimeout });
for (const match of fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"/g)) {
  if (match[1] !== 'js/app.js') vm.runInContext(fs.readFileSync(path.join(root, match[1]), 'utf8'), context, { filename: match[1] });
}
const run = (code) => vm.runInContext(code, context);
run(`function organoPredict(list,conditions) { return predictReaction(list.map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant'})),{...defaultReactionConditions(),solvents:['thf'],...(conditions||{})}); }
function organoIds(list,conditions) { const p=organoPredict(list,conditions);return [p.best,...p.alternatives].filter(Boolean).map(o=>o.id); }`);
let checks = 0;
const check = (code, expected, label) => { assert.equal(run(code), expected, label); checks++; };
// Authored reaction-class reference: John McMurry, OpenStax Organic Chemistry
// 17.5, Alcohols from Carbonyl Compounds: Grignard Reaction.
for (const smiles of ['NCCC=O', 'CNCCC=O', 'CC(C)(C)OC(=O)NCCC=O', 'CN([2H])CCC=O']) {
  context.substrate = smiles;
  check(`organoPredict([substrate,'C[Mg]Br']).best.id`, 'grignard-quench', 'N-H or N-D donor prevents the modeled addition: ' + smiles);
  check(`organoIds([substrate,'C[Mg]Br']).includes('grignard')`, false, 'No competing false addition: ' + smiles);
}
check(`organoIds(['CN(C)CCC=O','C[Mg]Br']).includes('grignard')`, true, 'Tertiary amine without N-H is not automatically quenched');
check(`organoPredict(['CCC=O','C[Mg]Br','O']).best.id`, 'grignard-quench', 'Explicit reagent water is not an implicit staged work-up');
check(`organoPredict(['CCC=O','C[Mg]Br','Cl']).best.id`, 'grignard-quench', 'Acid in the modeled mixture quenches the donor');
check(`organoIds(['NCCC#N','C[Mg]Br']).includes('grignard-nitrile')`, false, 'Nitrile branch shares N-H compatibility check');
check(`organoIds(['CCC#N','C[Mg]Br']).includes('grignard-nitrile')`, true, 'Compatible nitrile branch remains available');
check(`organoIds(['NCCBr'],{additives:['mg']}).includes('grignard-formation')`, false, 'N-H substrate blocks organomagnesium formation');
check(`organoIds(['CCBr'],{additives:['mg']}).includes('grignard-formation')`, true, 'Compatible formation remains available');
run(`function nitrileFixture(s,r='C[Mg]Br'){const inputs=[s,r].map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant'})),before=JSON.stringify(inputs),p=predictReaction(inputs,{...defaultReactionConditions(),solvents:['ether']});return {out:[p.best,...p.alternatives].find(o=>o&&o.id==='grignard-nitrile'),unchanged:before===JSON.stringify(inputs)};}`);
for(const [s,r,p] of [['C[13C]#[15N]','C[Mg]Br','C[13C](=O)C'],['CC#N','[13CH3][Mg]Br','CC(=O)[13CH3]'],['COCC#[15N]','C[Mg]Br','COCC(=O)C']]){
  Object.assign(context,{s,r,p});
  check('nitrileFixture(s,r).out.products.some(x=>moleculeSame(x.isomericSmiles||x.smiles,p))',true,'Hydrolysis preserves carbon labels and introduces oxygen: '+s);
  check('nitrileFixture(s,r).unchanged',true,'Inputs remain unchanged: '+s);
}
check("nitrileFixture('C[13C]#[15N]').out.workupAtoms.nitrogenIsotopes[0]",15,'Departing nitrogen isotope is recorded as nitrogen');
check("nitrileFixture('C[13C]#[15N]').out.products.every(p=>!p.isomericSmiles.includes('15O'))",true,'Nitrogen isotope never becomes oxygen isotope');
check("nitrileFixture('CC#N').out.workupAtoms.oxygenSource.includes('separate')",true,'Ketone oxygen has explicit assumed work-up provenance');
check("nitrileFixture('CC#N').out.productSurvival.status",'workup-boundary','Hydrolytic ketone is not co-exposed to the dry Grignard mixture');
console.log('Organometallic compatibility: ' + checks + ' checks passed.');
