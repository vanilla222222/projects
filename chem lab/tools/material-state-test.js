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
for(const phase of ['S','L','G'])check(`reactionMaterialStateLabel({phase:'${phase}',solvent:'ignored'})`,phase,'Phase label');
check(`reactionMaterialStateLabel({phase:'Aq',solvent:'ethanol'})`,'Aq(ethanol)','Explicit solvent');
check(`reactionMaterialStateLabel({phase:'Aq'})`,'State unassigned','No solvent is invented');
check(`reactionMaterialStateNormalize({phase:'plasma'}).phase`,'unknown','Whitelist');
check(`reactionMaterialStateNormalize({phase:'Aq',solvent:'x'.repeat(200)}).solvent.length`,80,'Bounded import');
run(`var c=retroCompound({smiles:'CCO',role:'reactant'});c.materialState={phase:'L'};var restored=restoreReactionState(serializeReactionState({compounds:[c],conditions:{},route:[],productStates:{'CC=O':{phase:'G'}}}));`);
check('restored.compounds[0].materialState.phase','L','Input phase round trip');
check(`restored.productStates['CC=O'].phase`,'G','Product phase round trip');
check(`restoreReactionState(JSON.stringify({format:'chemical-graph-reaction',compounds:[{smiles:'CCO'}]})).compounds[0].materialState.phase`,'unknown','Legacy remains unassigned');
run(`var outcome={name:'Metadata fixture',products:[],minor:[]};var prod={smiles:'CC=O',materialState:{phase:'G'}};var step=reactionRouteStep([c],defaultReactionConditions(),outcome,prod,false,null);var route=reactionRouteRestore(reactionRouteSerialize([step]));`);
check('route[0].from.materialState.phase','L','Carried starting form');check('route[0].to.materialState.phase','G','Carried product form');
check(`buildRouteScheme(route).annotations.some(a=>a.text==='2 · G')`,true,'Canvas export retains phase');
check(`moleculeSame({...c,materialState:{phase:'S'}}.smiles,c.smiles)`,true,'Chemical identity unchanged');
run(`var wr=routeWorkspaceNormalize({version:1,start:'CCO',target:'CC=O',steps:[{from:'CCO',to:'CC=O',fromState:{phase:'L'},toState:{phase:'Aq',solvent:'water'},compounds:[{smiles:'CCO',role:'reactant',equiv:'1',materialState:{phase:'L'}}],conditions:{}}]});var imported=routeWorkspaceImport(JSON.stringify(wr))[0];`);
check('imported.steps[0].fromState.phase','L','Workspace input form survives export');check('imported.steps[0].toState.solvent','water','Workspace solvent survives export');check('imported.steps[0].compounds[0].materialState.phase','L','Workspace compound form survives');
// Exercise the real controls with a minimal DOM, including the conditional
// solvent field; state strings are assigned as text, never HTML.
context.document={createElement(tag){return {tag,children:[],events:{},append(...nodes){this.children.push(...nodes)},setAttribute(){},addEventListener(name,fn){this.events[name]=fn}}}};
run(`var picked;var control=reactionMaterialStateControl({phase:'S'},value=>picked=value);`);
check('control.children[0].children.length',5,'All state choices plus unassigned');
check('control.children[1].hidden',true,'Solvent hidden for neat states');
run(`control.children[0].value='Aq';control.children[0].events.change();control.children[1].value='ethyl acetate';control.children[1].events.input();`);
check('control.children[1].hidden',false,'Solution exposes solvent');check(`reactionMaterialStateLabel(picked)`,'Aq(ethyl acetate)','Solvent change saved');
run(`control.children[0].value='G';control.children[0].events.change();`);
check('picked.solvent','','Switching to gas clears solvent');
console.log('Material state tracking: '+checks+' checks passed.');
