'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
const run=c=>vm.runInContext(c,ctx);let checks=0;
const check=(c,e,label)=>{assert.equal(run(c),e,label);checks++;};
run(`const handoffRaw={version:1,start:'CCO',target:'CCO',steps:[
 {from:'CCO',to:'CC=O',compounds:[{smiles:'CCO',role:'reactant'}],conditions:{solvents:['dcm'],additives:['dmp']}},
 {from:'CC=O',to:'CCO',compounds:[{smiles:'CC=O',role:'reactant'},{smiles:'[Na+].[BH4-]',role:'reagent'}],conditions:{solvents:['ether']}}
]};
const handoffRoute=routeWorkspaceNormalize(handoffRaw);
const grigRaw={start:'CC=O',target:'CC(O)C',steps:[{from:'CC=O',to:'CC(O)C',compounds:[{smiles:'CC=O',role:'reactant'},{smiles:'C[Mg]Br',role:'reagent'}],conditions:{solvents:['ether'],atmosphere:'n2'}}]};
const grigRoute=routeWorkspaceNormalize(grigRaw);
function handoffMode(mode){return {...handoffRoute,steps:[handoffRoute.steps[0],{...handoffRoute.steps[1],handoff:{mode}}]};}
`);
check('handoffRoute.steps[1].handoff.mode','isolated','Legacy recipes explicitly normalize to separate mixtures');
check('handoffRoute.steps[1].handoff.basis','model-assumption','Isolation default is identified as a model assumption');
check('handoffRoute.steps[0].handoff',null,'No artificial boundary before first step');
check('routeWorkspaceValidate(handoffRoute).status','verified','Independent steps still verify with separated-mixture assumption');
check('routeWorkspaceValidate(handoffRoute).handoffs[0].status','assumed-separated','Boundary verification does not claim demonstrated isolation');
check("routeWorkspaceValidate(handoffRoute).handoffs[0].potentials.some(p=>p.code==='oxidant-reductant-carryover')",true,'Prior oxidant to next reductant is a potential carryover conflict');
check("routeWorkspaceValidate(handoffMode('carryover')).status",'unverified','Individually valid steps do not certify one-pot handoff');
check("routeWorkspaceValidate(handoffMode('carryover')).handoffs[0].blockers[0].code",'unsupported-carryover','Explicit reason survives independent step replay');
check("routeWorkspaceValidate({...handoffRoute,onePot:true}).status",'unverified','Direct route validation cannot bypass global one-pot flag');
check("routeWorkspaceValidate(routeWorkspaceNormalize({...handoffRaw,onePot:true})).status",'unverified','Import preserves global one-pot intent at each boundary');
check("routeWorkspaceNormalize({...handoffRaw,steps:[handoffRaw.steps[0],{...handoffRaw.steps[1],freshMixture:false}]}).steps[1].handoff.mode",'carryover','Legacy false fresh-mixture flag cannot be silently dropped');
check("routeWorkspaceNormalize({...handoffRaw,steps:[handoffRaw.steps[0],{...handoffRaw.steps[1],freshMixture:true}]}).steps[1].handoff.basis",'recorded-plan','Explicit fresh mixture is a recorded plan, not isolation proof');
check("routeWorkspaceImport(JSON.stringify(handoffMode('carryover')))[0].steps[1].handoff.mode",'carryover','Carryover survives JSON roundtrip');
check("routeWorkspaceValidate(routeWorkspaceImport(JSON.stringify(handoffMode('carryover')))[0]).status",'unverified','Roundtrip does not launder unsupported sequence');
check("routeWorkspaceYield(handoffMode('carryover'))",null,'Blocked handoff does not receive overall yield estimate');
check("(()=>{try{routeWorkspaceScalePlan(handoffMode('carryover'),'product',1,'g');return false;}catch(e){return /every step verified/.test(e.message);}})()",true,'Scale planning cannot bypass blocked route handoff');
check("routeWorkspaceCsv(handoffMode('carryover')).includes('Boundary assessment,Boundary explanation')",true,'CSV exposes boundary status and explanation');
check("routeWorkspaceCsv(handoffMode('carryover')).includes('Carry-over mixture composition')",true,'CSV includes the blocking handoff reason');
check('routeWorkspaceValidate(grigRoute).status','verified','Neutral Grignard endpoint retains explicit assumed work-up');
check('routeWorkspaceValidate(grigRoute).steps[0].workup.required',true,'Work-up requirement covers final endpoint too');
check("routeWorkspaceValidate({...grigRoute,steps:[{...grigRoute.steps[0],workup:{status:'none'}}]}).status",'unverified','No-work-up record cannot establish neutral Grignard endpoint');
check("routeWorkspaceValidateStep({...grigRoute.steps[0],workup:{status:'none'}}).status",'unverified','Single-step validation also enforces endpoint work-up');
check("routeWorkspaceValidate({...grigRoute,steps:[{...grigRoute.steps[0],workup:{status:'recorded',notes:'Separate work-up described in source record; purity unvalidated.'}}]}).status",'verified','Descriptive work-up record is accepted as a planning assumption');
for(const raw of ["{mode:'one-pot'}","'carryover'","{mode:''}","{mode:'isolated'}"]){ctx.raw=raw;const flags=raw==="{mode:'isolated'}"?'{freshMixture:false}':'{}';check(`(()=>{try{routeHandoffNormalize(${raw},${flags});return false;}catch(e){return true;}})()`,true,'Malformed or contradictory boundary rejected '+raw);}
for(const raw of ["{status:'recorded'}","{status:'unknown'}","{status:''}","{notes:{text:'not a string'}}"]){check(`(()=>{try{routeWorkupNormalize(${raw});return false;}catch(e){return true;}})()`,true,'Malformed work-up record rejected '+raw);}
check("(()=>{const before=JSON.stringify(handoffRoute);routeWorkspaceValidate(handoffRoute);return before===JSON.stringify(handoffRoute);})()",true,'Boundary validation does not mutate route');
check("(()=>{const a=grigRoute.steps[0],b={compounds:[{smiles:'CC(O)C',role:'reactant'}],conditions:{solvents:['water']}};return routeHandoffAssess(a,b).potentials.some(p=>p.code==='reactive-reagent-to-protic-stage');})()",true,'Prior reactive reagent to protic next-stage is recorded as a possibility');
check("routeHandoffAssess({compounds:[],conditions:{solvents:['water'],additives:['h2so4']}},grigRoute.steps[0]).potentials.some(p=>p.code==='protic-carryover')",true,'Prior protic/acidic mixture to organometallic stage flagged');
check("routeHandoffAssess({compounds:[],conditions:{solvents:['ether']}},{compounds:[],conditions:{solvents:['ether']},handoff:{mode:'carryover'}}).status",'blocked','Absence of recognized hazards is not one-pot verification');
check("routeWorkupNormalize({status:'recorded',notes:'x'.repeat(1000)}).notes.length",800,'Record text is bounded');
check("routeWorkspaceCsv({...grigRoute,steps:[{...grigRoute.steps[0],workup:{status:'recorded',notes:'=SUM(1,2)'}}]}).includes(\"'=SUM\")",true,'Exported work-up notes retain CSV injection protection');
run(`const hs=[{reagents:[{smiles:'[O-][Mn](=O)(=O)=O.[K+]',role:'reagent',equiv:'2'}],target:'CC(=O)O'},
 {freshMixture:true,reagents:[{smiles:'CCO',role:'reactant'}],conditions:{additives:['h2so4']},target:'CCOC(C)=O'}];`);
check("reactionCascadeRun('CCO',hs).handoffs[0].record.mode",'isolated','Cascade records explicitly prepared boundary');
check("reactionCascadeRun('CCO',[hs[0],{...hs[1],freshMixture:false}]).status",'blocked','Cascade still refuses carryover');
check("reactionCascadeRun('CCO',[hs[0],{...hs[1],freshMixture:false}]).handoffs[0].blockers[0].code",'unsupported-carryover','Cascade keeps structured blocked boundary for review');
check("reactionCascadeRun('CC=O',[{reagents:[{smiles:'C[Mg]Br'}],conditions:{solvents:['ether']},target:'CC(O)C',workup:{status:'none'}}]).status",'blocked','Cascade final neutral endpoint cannot skip modeled work-up');
check("reactionCascadeRun('CCO',[hs[0],{...hs[1],freshMixture:undefined,handoff:{mode:'isolated'}}]).stages[1].freshMixture",true,'Explicit isolated handoff and stage freshness record agree');
console.log('Route handoff and work-up: '+checks+' checks passed.');
