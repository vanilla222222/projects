'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
const run=c=>vm.runInContext(c,ctx);let checks=0;const check=(c,e,label)=>{assert.equal(run(c),e,label);checks++;};
run(`function sitePredict(s,reagents,c){const inputs=[{smiles:s,fragment:smilesToFragment(s),role:'reactant'},...reagents.map(smiles=>({smiles,fragment:smilesToFragment(smiles),role:'reagent'}))];const r=predictReaction(inputs,{...defaultReactionConditions(),...c});return [r.best,...r.alternatives].filter(Boolean).filter(o=>o.partialConversion);}
function multiSearch(options){const j=pathFinderCreate('CC(C)(C)OC(=O)NCCNC(=O)OCc1ccccc1','NCCN',{maxDepth:2,maxRoutes:1,stockPolicy:'custom',...options});while(j.status==='running')j.step(100);return j;}`);
check(`sitePredict('OCCCOC',[],{solvents:['dcm'],additives:['dmp']}).length`,0,'A single alcohol does not acquire fake site alternatives');
check(`sitePredict('OCC(O)CC',[],{solvents:['dcm'],additives:['dmp']}).length`,2,'Two inequivalent alcohols expose two alternatives');
check(`sitePredict('OCCO',[],{solvents:['dcm'],additives:['dmp']}).length`,1,'Equivalent sites deduplicate');
check(`sitePredict('CC(=O)CCC=O',['[Na+].[BH4-]'],{solvents:['methanol']}).length`,2,'Two carbonyl alternatives');
check(`sitePredict('OCC(O)CC',[],{solvents:['water'],additives:['dmp']}).length`,0,'Incompatible water excluded');
check(`(()=>{const j=multiSearch();return j.status==='found'&&j.route.length===2&&j.route.map(l=>l.candidate.planning.groupId).join(',')==='cbz,boc'&&j.route.every(l=>retroForwardCheck(l.candidate,l.to));})()`,true,'Path Finder uses verified compatible multi-group order');
check(`multiSearch({forbiddenReagents:['TFA'],budgetMs:200}).status==='found'`,false,'Per-step reagent exclusion retained');
check(`multiSearch({maxDepth:1,budgetMs:200}).status==='found'`,false,'Removal steps cannot hide in one edge');
check(`(()=>{const j=multiSearch(),r=routeWorkspaceNormalize({start:j.start,target:j.target,steps:j.route});return routeWorkspaceValidate(r).status==='verified'&&r.steps.every(s=>s.planning.kind==='deprotect');})()`,true,'Multi-group route saves to workspace');
check(`(()=>{const step={from:'OCC(O)CC',to:'O=CC(O)CC',ruleId:sitePredict('OCC(O)CC',[],{solvents:['dcm'],additives:['dmp']})[0].id,compounds:[{smiles:'OCC(O)CC',role:'reactant'}],conditions:{solvents:['dcm'],additives:['dmp']}};const p=sitePredict('OCC(O)CC',[],step.conditions)[0];step.to=p.products[0].isomericSmiles||p.products[0].smiles;return routeWorkspaceValidateStep(step).status;})()`,'unverified','Partial site enumeration is not upgraded to selective synthesis evidence');
console.log('Complex-substrate integration: '+checks+' focused checks passed.');
