'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
const run=c=>vm.runInContext(c,ctx);let checks=0;const check=(c,e,label)=>{assert.equal(run(c),e,label);checks++;};
run(`function pgPredict(s){const c=[{smiles:s,fragment:smilesToFragment(s),role:'reactant'}],conditions={...defaultReactionConditions(),atmosphere:'h2',additives:['pdc']};const p=predictReaction(c,conditions);return [p.best,...p.alternatives].filter(Boolean).find(o=>o.id==='hydrogenolysis');}`);
for(const [smiles,expected]of [['C=CCNC(=O)OCc1ccccc1','CCCN'],['C#CCNC(=O)OCc1ccccc1','CCCN'],['C=CCOCc1ccccc1','CCCO'],['O=[N+]([O-])c1ccc(NC(=O)OCc2ccccc2)cc1','Nc1ccc(N)cc1']]){
 check(`(()=>{const o=pgPredict(${JSON.stringify(smiles)});return !!o&&o.products.some(p=>moleculeSame(p.isomericSmiles||p.smiles,${JSON.stringify(expected)}));})()`,true,'Hydrogenolysis includes competing reductions '+smiles);
 check(`pgPredict(${JSON.stringify(smiles)}).warnings.some(w=>w.includes('reduction is included'))`,true,'Explicit co-reduction warning');
}
check(`(()=>{const o=pgPredict('C=CCNC(=O)OCc1ccccc1');return !o.products.some(p=>moleculeSame(p.isomericSmiles||p.smiles,'C=CCN'));})()`,true,'No invented selective Cbz removal preserving alkene');
check(`pgPredict('C=CCNC(=O)OCc1ccccc1').protectionAssessment.status`,'conflict','Live group-preservation assessment attached');
run(`var pgRoute=routeWorkspaceNormalize({version:1,start:'C=CCNC(=O)OCc1ccccc1',target:'CCCN',steps:[{from:'C=CCNC(=O)OCc1ccccc1',to:'CCCN',name:'Cbz removal with alkene reduction',ruleId:'hydrogenolysis',planning:{kind:'deprotect',group:'Cbz',groupId:'cbz',reason:'Intentional cleavage'},compounds:[{smiles:'C=CCNC(=O)OCc1ccccc1',role:'reactant'}],conditions:{atmosphere:'h2',additives:['pdc']}}]});`);
check(`pgRoute.steps[0].planning.groupId`,'cbz','Stable group ID survives normalization');
check(`routeWorkspaceValidate(pgRoute).status`,'verified','Intentional removal product is independently reproduced');
check(`routeWorkspaceCsv(pgRoute).includes('Group preservation notes')&&routeWorkspaceCsv(pgRoute).includes('hydrogenolysis')&&routeWorkspaceCsv(pgRoute).includes('conflict')`,true,'CSV includes recalculated preservation warnings');
console.log('Protection/reaction/workspace integration: '+checks+' checks passed.');
