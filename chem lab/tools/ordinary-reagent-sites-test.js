'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
let checks=0;const check=(code,e,label)=>{assert.equal(vm.runInContext(code,ctx),e,label);checks++;};
vm.runInContext(`function ordinaryFixture(start,reagent,id,extra=null,role='reagent'){
 const compounds=[{smiles:start,role:'reactant'},{smiles:reagent,role:'reagent'},...(extra?[{smiles:extra,role}]:[])].map(c=>({...c,equiv:4,fragment:smilesToFragment(c.smiles)})),conditions={...defaultReactionConditions(),solvents:[id==='oxidation-kmno4'?'water':'thf']},before=JSON.stringify(compounds),p=predictReaction(compounds,conditions);
 return {compounds,conditions,out:[p.best,...p.alternatives].find(o=>o&&o.id===id),unchanged:before===JSON.stringify(compounds)};
}`,ctx);
for(const [s,r,id,x] of [['CCC=O','[Na+].[BH4-]','reduction-nabh4','CC(=O)C'],['CC(=O)OC','[Li+].[AlH4-]','reduction-lialh4','CCC#N'],['CCO','[O-][Cr](=O)(=O)Cl.c1cc[nH+]cc1','oxidation-pcc','CCCO'],['CCO','O=S(Cl)Cl','alcohol-halide','CCC(=O)O'],['CCO','[K+].[O-][Mn](=O)(=O)=O','oxidation-kmno4','CCCO'],['CCO','P(c1ccccc1)(c1ccccc1)c1ccccc1.BrC(Br)(Br)Br','appel','CCCO'],['CC(=O)O','O=C(Cl)C(=O)Cl','acid-chloride','CCC(=O)O'],['CC(=O)O','O=S(Cl)Cl','acid-chloride','CCCO']]){
 Object.assign(ctx,{s,r,id,x});
 for(const role of ['reagent','reactant','catalyst']){ctx.role=role;
  check('!!ordinaryFixture(s,r,id,x,role).out',true,'Branch inspectable '+id+' / '+role);
  check("ordinaryFixture(s,r,id,x,role).out.compatibilityConflicts.some(c=>c.code==='reagent-other-input')",true,'Reactive partner role does not imply inertness '+id+' / '+role);
  check("routeStepAssessment({outcome:ordinaryFixture(s,r,id,x,role).out}).status",'blocked','Planner rejects clean selected-input claim '+id+' / '+role);
 }
 check('ordinaryFixture(s,r,id,x).unchanged',true,'Input graphs unchanged '+id);
}
for(const [s,r,id,code] of [['OCCC(=O)O','O=S(Cl)Cl','alcohol-halide','chlorination-other-site'],['OCCC(=O)O','O=S(Cl)Cl','acid-chloride','chlorination-other-site'],['O=N(=O)CCC=O','[Li+].[AlH4-]','reduction-lialh4','hydride-unmodeled-site'],['[O-][N+](=O)CCC=O','[Li+].[AlH4-]','reduction-lialh4','hydride-unmodeled-site'],['CC(=O)OC(=O)CCC=O','[Li+].[AlH4-]','reduction-lialh4','hydride-unmodeled-site']]){
 Object.assign(ctx,{s,r,id,code});check('ordinaryFixture(s,r,id).out.compatibilityConflicts.some(c=>c.code===code)',true,'Unedited susceptible group on same molecule '+s);
 check("(()=>{const f=ordinaryFixture(s,r,id);return routeWorkspaceValidateStep({from:s,to:f.out.products[0].isomericSmiles,ruleId:id,compounds:f.compounds,conditions:f.conditions}).status;})()",'unverified','Saved route rejects unsupported selective endpoint '+s);
}
for(const [s,r,id] of [['O=CCCC=O','[Na+].[BH4-]','reduction-nabh4'],['COC(=O)CCC#N','[Li+].[AlH4-]','reduction-lialh4'],['OCCO','O=S(Cl)Cl','alcohol-halide']]){Object.assign(ctx,{s,r,id});check('ordinaryFixture(s,r,id).out.compatibilityConflicts.length',0,'Modeled exhaustive conversion remains available '+s);}
check("(()=>{const f=ordinaryFixture('CC=O','[Na+].[BH4-]','reduction-nabh4');return reactionScopeAssess([...f.compounds,{smiles:'CCC=O',role:'catalyst',fragment:smilesToFragment('CCC=O')}],f.conditions,f.out).reasons.some(c=>c.code==='reagent-other-input'&&c.level==='conflict');})()",true,'Scope replay catches newly added reactive partner');
console.log('Ordinary reagent sites: '+checks+' checks passed.');
