'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
let checks=0;const check=(code,expected,label)=>{assert.equal(vm.runInContext(code,ctx),expected,label);checks++;};
vm.runInContext(`function siteFixture(smiles,id,extra=[]){const compounds=[{smiles,role:'reactant'},{smiles:'C[Mg]Br',role:'reagent'},...extra.map(smiles=>({smiles,role:'reactant'}))].map(c=>({...c,equiv:2,fragment:smilesToFragment(c.smiles)})),conditions={...defaultReactionConditions(),solvents:['ether']},before=JSON.stringify(compounds),p=predictReaction(compounds,conditions);return {compounds,conditions,out:[p.best,...p.alternatives].find(o=>o&&o.id===id),unchanged:before===JSON.stringify(compounds)};}`,ctx);
for(const [s,id] of [['O=CCCC=O','grignard'],['CC(=O)CCC(C)=O','grignard'],['COC(=O)CCC(=O)OC','grignard'],['N#CCCC#N','grignard-nitrile'],['CC(=O)CCC#N','grignard']]){
 Object.assign(ctx,{s,id});
 check('!!siteFixture(s,id).out',true,'First-site endpoint remains inspectable '+s);
 check("siteFixture(s,id).out.compatibilityConflicts.some(c=>c.code==='grignard-competing-sites')",true,'Several electrophiles require selectivity evidence '+s);
 check("routeStepAssessment({outcome:siteFixture(s,id).out}).status",'blocked','Planner blocks selective preparation '+s);
 check('siteFixture(s,id).unchanged',true,'Inputs unchanged '+s);
 check("(()=>{const f=siteFixture(s,id);return routeWorkspaceValidateStep({from:s,to:f.out.products[0].isomericSmiles,ruleId:id,compounds:f.compounds,conditions:f.conditions}).status;})()",'unverified','Saved route cannot certify first-site product '+s);
}
for(const [s,id] of [['CCC=O','grignard'],['CC(=O)C','grignard'],['CC(=O)OC','grignard'],['CCC#N','grignard-nitrile'],['O=C=O','grignard-carboxylation']]){Object.assign(ctx,{s,id});check("siteFixture(s,id).out.compatibilityConflicts.length",0,'Single electrophile control '+s);}
check("siteFixture('CC=O','grignard',['CCC=O']).out.compatibilityConflicts.some(c=>c.code==='grignard-competing-sites')",true,'Separate aldehyde inputs also require selectivity');
check("(()=>{const f=siteFixture('CCC=O','grignard'),changed=[...f.compounds,{smiles:'CCC=O',role:'reactant',fragment:smilesToFragment('CCC=O')}];return reactionScopeAssess(changed,f.conditions,f.out).reasons.some(r=>r.code==='grignard-competing-sites'&&r.level==='conflict');})()",true,'Scope replay catches a newly added electrophile');
console.log('Grignard site selectivity: '+checks+' checks passed.');
