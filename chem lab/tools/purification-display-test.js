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
let checks=0;
function check(code,expected,label){assert.equal(run(code),expected,label);checks++;}
check('reactionPurificationEnabled()',false,'Purification initially off');
for(const phase of ['S','L','G','Aq']){
 run(`var plan=reactionPurificationPlan({smiles:'[13CH3]CO',count:2},{phase:'${phase}',solvent:'ethanol'});`);
 check('plan.status','modeled','Assigned state has output');check('plan.output.components.length',1,'Only selected product');check('plan.output.impurities.length',0,'No impurities in idealized output');check('plan.output.components[0].smiles','[13CH3]CO','Isotope identity unchanged');check('plan.output.materialState.phase',phase,'Phase retained');check('plan.output.purity','idealized-pure','Assumption explicit');check('plan.recovery',null,'No invented purification recovery');
}
check(`reactionPurificationPlan({smiles:'CCO'},{}).output`,null,'Unassigned state cannot assert pure output');check(`reactionPurificationPlan({smiles:'CCO'},{phase:'Aq'}).output`,null,'Solution needs solvent');check(`reactionPurificationPlan({smiles:'bad'},{phase:'S'}).output`,null,'Invalid product rejected');
run(`var c=retroCompound({smiles:'CCO',role:'reactant'});var prod={smiles:'CC=O',materialState:{phase:'L'}};var step=reactionRouteStep([c],defaultReactionConditions(),{name:'Metadata fixture',minor:[]},prod,false,null);step.purification=reactionPurificationPlan(prod);var restored=reactionRouteRestore(reactionRouteSerialize([step]));`);
check('restored[0].purification.output.impurities.length',0,'Clean output survives route save');check('restored[0].purification.output.materialState.phase','L','Isolation state survives');
check(`reactionPurificationRestore({...step.purification,output:{...step.purification.output,components:[{smiles:'N'}]}},prod)`,null,'Wrong-product isolation record rejected');
run(`reactionPurificationEnabled(true);`);
check(`buildRouteScheme(restored).annotations.some(a=>a.above==='Purification (idealized)')`,true,'Optional canvas purification arrow');
run(`reactionPurificationEnabled(false);`);
check(`buildRouteScheme(restored).annotations.some(a=>a.above==='Purification (idealized)')`,false,'Disabled view hides purification');
run(`var prediction=predictReaction([c],defaultReactionConditions());var before=JSON.stringify(prediction);reactionPurificationPlan(prod);`);
check('JSON.stringify(prediction)===before',true,'Purification cannot change chemical outcome or alerts');
run(`var limitedInputs=[{smiles:'CC(=O)O',role:'reactant',equiv:1},{smiles:'CONC',role:'reactant',equiv:1},{...RETRO23_REAGENTS.dcc,equiv:0.1}].map(retroCompound);var limited=predictReaction(limitedInputs,normalizeReactionConditions({solvents:['dcm'],additives:['dmap'],temperature:25}));var alert=rxLoadingConflict(limited.best);reactionPurificationPlan(limited.best.products[0],{phase:'S'});`);
check('!!alert',true,'Recipe has a real loading blocker');check('rxLoadingConflict(limited.best)===alert',true,'Purification cannot erase loading blocker');
const saved={};context.localStorage={getItem(k){return saved[k]||null},setItem(k,v){saved[k]=v}};
context.document={createElement(tag){return {tag,children:[],events:{},append(...nodes){this.children.push(...nodes)},setAttribute(){},addEventListener(name,fn){this.events[name]=fn}}}};
run(`var redraws=0;var toggle=reactionPurificationControl(()=>redraws++);toggle.children[0].checked=true;toggle.children[0].events.change();`);
check('redraws',1,'Real toggle refreshes view');check('reactionPurificationEnabled()',true,'Real toggle enables shared setting');assert.equal(saved['chem-lab-show-purification'],'true');checks++;
run(`delete reactionPurificationEnabled.current;`);check('reactionPurificationEnabled()',true,'Setting survives reload');
run(`var output=reactionPurificationElement(reactionPurificationPlan(prod));`);check('output.children[0].textContent','Purification → Pure L','Output heading');
console.log('Purification display: '+checks+' checks passed.');
