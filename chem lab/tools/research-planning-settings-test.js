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
run(`function policyCandidate(conditions={},extra={}){return {name:'Recorded reaction',rule:'fischer',precursors:[{smiles:'CCO',role:'reactant'}],compounds:[retroCompound({smiles:'CCO',role:'reactant'})],conditions:normalizeReactionConditions(conditions),product:{smiles:'CC=O'},outcome:{id:'fixture',products:[{smiles:'CC=O'}],warnings:[],evidence:{scope:'Bounded recorded scope',references:[{url:'https://example.org/source'}]}},...extra};}
function policyReasons(settings,candidate=policyCandidate(),target='CC=O'){return planningPolicyCreate(settings,{start:'CCO',target:'CC(=O)O'}).check(candidate,target);}`);
for(const [settings,conditions] of [[{maxTemperature:50},{temperature:80}],[{minTemperature:0},{temperature:-10}],[{allowCryogenic:false},{temperature:-10}],[{allowPressure:false},{pressure:5}],[{allowPhotochemistry:false},{energy:'light'}],[{avoidAcid:true},{additives:['h2so4']}],[{avoidBase:true},{additives:['et3n']}],[{avoidWater:true},{solvents:['water']}],[{avoidAirSensitive:true},{atmosphere:'n2'}],[{allowSpecialCatalysts:false},{additives:['pdpph3']}]] ){
 check(`policyReasons(${JSON.stringify(settings)},policyCandidate(${JSON.stringify(conditions)})).length>0`,true,'Recorded condition/equipment exclusion');
 check(`policyReasons({},policyCandidate(${JSON.stringify(conditions)})).length`,0,'Default policy does not invent extra exclusions');
}
check(`policyReasons({allowElectrochemistry:false},policyCandidate({}, {name:'Electrochemical oxidation'})).length>0`,true,'Recorded electrochemistry');
check(`policyReasons({allowElectrochemistry:false},policyCandidate({}, {name:'Electrophilic addition'})).length`,0,'No substring confusion with electrophilic chemistry');
check(`policyReasons({excludedIntermediates:['CC=O']}).some(r=>r.code==='intermediate-policy')`,true,'Exact intermediate exclusion');
check(`policyReasons({forbiddenGroups:['aldehyde']}).some(r=>r.code==='intermediate-policy')`,true,'Functional group exclusion');
check(`policyReasons({excludedIntermediates:['CCO']}).length`,0,'Requested start permitted');
check(`policyReasons({evidence:'curated'}).length`,0,'Curated evidence positive control');
check(`policyReasons({evidence:'referenced'},policyCandidate({}, {rule:'unknown-fixture',outcome:{id:'x',products:[],warnings:[]}})).length>0`,true,'Missing source excluded');
check(`policyReasons({selectivity:'strict'},policyCandidate({}, {outcome:{id:'x',products:[],warnings:['Unresolved selectivity']}})).length>0`,true,'Strict selectivity');
check(`policyReasons({selectivity:'review'},policyCandidate({}, {outcome:{id:'x',products:[],warnings:['Unresolved selectivity']}})).length`,0,'Review preserves warning without claiming certainty');
check(`policyReasons({maxChromatography:0}).length>0`,true,'Unknown method cannot meet hard chromatography limit');
check(`planningPolicyCreate({maxChromatography:0}).routeCheck([{candidate:policyCandidate({}, {purification:{method:'chromatography'}})}]).length>0`,true,'Known chromatography count enforced');
check(`policyReasons({maxChromatography:0},policyCandidate({}, {purification:{method:'crystallization'}})).length`,0,'Recorded nonchromatographic method');
check(`planningPolicyCreate({stereochemistry:'resolution'}).routeCheck([{candidate:policyCandidate()}]).length>0`,true,'No invented resolution');
check(`planningStereoAllowed({stereo:'racemic'},'CC(O)C',planningSettingsNormalize({stereochemistry:'mixtures'}))`,true,'Mixtures permitted only when unspecified');
check(`planningStereoAllowed({stereo:'racemic'},'N[C@H](O)C',planningSettingsNormalize({stereochemistry:'mixtures'}))`,false,'Mixture cannot meet specified stereotarget');
check(`planningStereoAllowed({stereo:'racemic'},'CC(O)C',planningSettingsNormalize({stereochemistry:'exact'}))`,false,'Exact setting excludes mixtures');
run(`var protectedCandidate={...policyCandidate(),pgSteps:[policyCandidate({temperature:25}),policyCandidate({temperature:120})]};`);
check(`policyReasons({maxTemperature:50},protectedCandidate).some(r=>r.message.includes('Operation 2'))`,true,'Protection substeps audited individually');
for(const invalid of [{minTemperature:100,maxTemperature:0},{maxNodes:201},{budgetMs:50000},{priority:'magic'},{allowPressure:'false'}]){assert.throws(()=>run(`planningSettingsNormalize(${JSON.stringify(invalid)})`));checks++;}
assert.throws(()=>run(`planningPolicyCreate({excludedIntermediates:['invalid structure here']})`));checks++;
run(`function researchSearch(research,tree=false){const j=pathFinderCreate('CCO','CC=O',{maxDepth:1,maxRoutes:1,budgetMs:3000,recipeTree:tree,research});while(j.status==='running')j.step(100);return j;}`);
check(`researchSearch({}).status`,'found','Real default route');
for(const tree of [false,true])check(`researchSearch({minTemperature:200,maxTemperature:250},${tree}).status==='found'`,false,'Temperature exclusion reaches both planners');
check(`researchSearch({stereochemistry:'resolution'}).routes.length`,0,'Resolution requirement reaches completed linear routes');
check(`researchSearch({stereochemistry:'resolution'},true).routes.length`,0,'Resolution requirement reaches completed recipe trees');
check(`pathFinderCreate('CCO','CC=O',{research:{budgetMs:500,maxNodes:3,maxBranch:2}}).options.maxNodes`,3,'Explicit node budget forwarded');
run(`var simple=[{candidate:policyCandidate({temperature:25})}],hot=[{candidate:policyCandidate({temperature:150})}];`);
check(`planningRouteRank(simple,[1],planningSettingsNormalize({priority:'conditions'}))[0]<planningRouteRank(hot,[1],planningSettingsNormalize({priority:'conditions'}))[0]`,true,'Condition ranking changes ordering');
check(`planningRouteRank([{candidate:policyCandidate({}, {purification:{method:'extraction'}})}],[1],planningSettingsNormalize({purificationPreference:'extraction'}))[0]<planningRouteRank([{candidate:policyCandidate({}, {purification:{method:'chromatography'}})}],[1],planningSettingsNormalize({purificationPreference:'extraction'}))[0]`,true,'Recorded purification preference changes ordering');
run(`function stereoResearchSearch(target,policy){const j=pathFinderCreate('CCC(=O)C',target,{maxDepth:1,maxRoutes:1,budgetMs:3000,research:{stereochemistry:policy}});while(j.status==='running')j.step(100);return j;}`);
check(`stereoResearchSearch('CCC(O)C','mixtures').status`,'found','A real unspecified secondary alcohol permits the modeled mixture');
check(`stereoResearchSearch('CC[C@H](O)C','mixtures').routes.length`,0,'Mixture setting cannot reach a specified enantiomer by achiral reduction');
check(`routeWorkspaceNormalize({version:1,start:'CCO',target:'CC=O',options:{research:{priority:'conditions',maxTemperature:50}},steps:[{from:'CCO',to:'CC=O',compounds:[{smiles:'CCO',role:'reactant'}],conditions:{}}]}).researchProtocol.maxTemperature`,50,'Saved routes retain research protocol');
check(`planningRouteRank([{candidate:policyCandidate({}, {purification:{method:'extraction'}})}],[1],planningSettingsNormalize({priority:'conditions',purificationPreference:'extraction'}))[1]<planningRouteRank([{candidate:policyCandidate({}, {purification:{method:'chromatography'}})}],[1],planningSettingsNormalize({priority:'conditions',purificationPreference:'extraction'}))[1]`,true,'Method preference breaks ties under other primary objectives');
console.log('Research planning policies: '+checks+' checks passed.');
