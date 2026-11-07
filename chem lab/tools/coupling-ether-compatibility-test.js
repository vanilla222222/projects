'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
const run=c=>vm.runInContext(c,ctx);let checks=0;const check=(code,want,label)=>{assert.equal(run(code),want,label);checks++;};
run(`function ceFixture(smiles,additives,temperature=80){
 const compounds=smiles.map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:'reactant',equiv:i?'3':'1'}));
 const conditions={...defaultReactionConditions(),solvents:['thf'],additives,temperature,atmosphere:'n2'};
 const before=JSON.stringify(compounds),prediction=predictReaction(compounds,conditions);
 return {compounds,conditions,prediction,unchanged:before===JSON.stringify(compounds),outcomes:[prediction.best,...prediction.alternatives].filter(Boolean)};
}
function ceGet(f,id){return f.outcomes.find(o=>o.id===id);}
const cePd=['pdpph3','k2co3'];
const ceP='P(c1ccccc1)(c1ccccc1)c1ccccc1';
const ceM=()=>ceFixture(['CCO','Oc1ccccc1',ceP],['dead'],25);
const ceW=()=>ceFixture(['CCBr','Oc1ccccc1'],['k2co3'],25);
const ceBoth=()=>ceFixture(['CCO','CCBr','Oc1ccccc1',ceP],['dead','nah'],25);
`);
for(const [id,partner] of [['suzuki','OB(O)c1ccccc1'],['heck','C=CC(=O)OC'],['sonogashira','C#CC']]){
 Object.assign(ctx,{id,partner});
 check("!!ceGet(ceFixture(['Brc1ccccc1',partner],cePd),id)",true,'Simple '+id+' branch is retained');
 check("ceGet(ceFixture(['Brc1ccccc1',partner],cePd),id).compatibilityConflicts.length",0,'One site pair is unflagged: '+id);
 check("ceGet(ceFixture(['Brc1ccc(Br)cc1',partner],cePd),id).compatibilityConflicts.some(c=>c.code==='coupling-sites'&&c.counts.halideSites===2)",true,'Multiple halide sites flagged: '+id);
 check("routeStepAssessment({outcome:ceGet(ceFixture(['Brc1ccc(Br)cc1',partner],cePd),id)}).blockers.some(b=>b.code==='coupling-sites')",true,'Planner gate retains '+id+' ambiguity');
 check("ceFixture(['Brc1ccc(Br)cc1',partner],cePd).unchanged",true,'Input graph immutability '+id);
}
check("ceGet(ceFixture(['Brc1ccccc1','OB(O)c1ccc(B(O)O)cc1'],cePd),'suzuki').compatibilityConflicts.some(c=>c.counts&&c.counts.boronSites===2)",true,'Multiple boron sites counted instead of first match');
check("ceGet(ceFixture(['Brc1ccccc1','C=CCC=C'],cePd),'heck').compatibilityConflicts.some(c=>c.counts&&c.counts.alkeneSites===2)",true,'Two terminal alkene sites counted');
check("ceGet(ceFixture(['Brc1ccccc1','C=C'],cePd),'heck').compatibilityConflicts.length",0,'Ethene is one bond site, not two competing orientations');
check("ceGet(ceFixture(['Brc1ccccc1','C#CCC#C'],cePd),'sonogashira').compatibilityConflicts.some(c=>c.counts&&c.counts.alkyneSites===2)",true,'Two terminal alkyne sites counted');
check("ceGet(ceFixture(['Brc1ccccc1','C#C'],cePd),'sonogashira').compatibilityConflicts.length",0,'Acetylene is one triple-bond site');
check("(()=>{const f=ceFixture(['Brc1ccccc1','OB(O)c1ccccc1','C=CC(=O)OC'],cePd);return ['suzuki','heck'].every(id=>ceGet(f,id).compatibilityConflicts.some(c=>c.code==='coupling-pathway-overlap'));})()",true,'Concurrent coupling families retain unresolved pathway metadata');
check("ceGet(ceM(),'mitsunobu').compatibilityConflicts.length",0,'Separate Mitsunobu recipe stays supported');
check("ceGet(ceW(),'williamson').compatibilityConflicts.length",0,'Separate Williamson recipe stays supported');
check("moleculeSame(ceGet(ceM(),'mitsunobu').products[0].isomericSmiles,ceGet(ceW(),'williamson').products[0].isomericSmiles)",true,'Independent recipes can produce the same ether');
for(const id of ['mitsunobu','williamson']){ctx.id=id;
 check("ceGet(ceBoth(),id).compatibilityConflicts.some(c=>c.code==='ether-activation-overlap')",true,'Mixed activation explicitly flagged for '+id);
 check("routeStepAssessment({outcome:ceGet(ceBoth(),id)}).status",'blocked','Mixed recipe cannot silently become clean '+id+' route');
}
check("ceGet(ceFixture(['OCCO','Oc1ccccc1',ceP],['dead']),'mitsunobu').compatibilityConflicts.some(c=>c.counts&&c.counts.alcoholSites===2)",true,'Mitsunobu does not silently select one polyol site');
check("ceGet(ceFixture(['CCO','Oc1ccc(O)cc1',ceP],['dead']),'mitsunobu').compatibilityConflicts.some(c=>c.counts&&c.counts.acidicPartnerSites===2)",true,'Multiple phenolic partners counted');
check("ceGet(ceFixture(['CCBr','Oc1ccc(O)cc1'],['k2co3']),'williamson').compatibilityConflicts.some(c=>c.counts&&c.counts.oxygenDonorSites===2)",true,'Williamson polyphenol ambiguity recorded');
check("ceGet(ceFixture(['BrCCBr','Oc1ccccc1'],['k2co3']),'williamson').compatibilityConflicts.some(c=>c.counts&&c.counts.halideSites===2)",true,'Williamson multiple leaving groups recorded');
check("(()=>{const f=ceBoth(),o=ceGet(f,'mitsunobu');return reactionScopeAssess(f.compounds,f.conditions,o).reasons.some(r=>r.code==='ether-activation-overlap');})()",true,'Scope replay recomputes mixed activation');
check("(()=>{const f=ceBoth(),o=ceGet(f,'mitsunobu'),before=JSON.stringify(o);reactionScopeAssess(f.compounds,f.conditions,o);return before===JSON.stringify(o);})()",true,'Scope audit does not mutate saved branch');
check("(()=>{const r=retroDisconnectSmiles('CCOc1ccccc1',{protect:false,budgetMs:10000});return ['mitsunobu-ether','williamson'].every(id=>r.candidates.some(c=>c.transform===id&&!routeStepAssessment(c).blockers.length&&retroForwardCheck(c,'CCOc1ccccc1')));})()",true,'Public retrosynthesis retains both independently verified ether routes');
check("routeStepAssessment({outcome:ceGet(ceM(),'mitsunobu')}).status",'no-encoded-conflict','Clean Mitsunobu recipe passes the complete assessment');
check("routeStepAssessment({outcome:ceGet(ceW(),'williamson')}).status",'no-encoded-conflict','Clean Williamson recipe passes the complete assessment');
check("(()=>{const f=ceM();return routeWorkspaceValidateStep({from:'CCO',to:'CCOc1ccccc1',ruleId:'mitsunobu',compounds:f.compounds,conditions:f.conditions}).status;})()",'verified','Saved Mitsunobu recipe independently verifies');
check("(()=>{const f=ceW();return routeWorkspaceValidateStep({from:'CCBr',to:'CCOc1ccccc1',ruleId:'williamson',compounds:f.compounds,conditions:f.conditions}).status;})()",'verified','Saved Williamson recipe independently verifies');
check("(()=>{const f=ceBoth();return routeWorkspaceValidateStep({from:'CCO',to:'CCOc1ccccc1',ruleId:'mitsunobu',compounds:f.compounds,conditions:f.conditions}).status;})()",'unverified','Saved mixed-activation branch cannot appear verified');
check("(()=>{const f=ceBoth(),o=ceGet(f,'mitsunobu');return reactionScopeAssess(f.compounds.filter(c=>c.smiles!=='CCBr'),f.conditions,o).reasons.every(r=>r.code!=='ether-activation-overlap');})()",true,'Removing the halide clears stale overlap metadata');
check("ceGet(ceFixture(['CCO','CCBr','Oc1ccccc1',ceP],['k2co3']),'williamson').compatibilityConflicts.every(c=>c.code!=='ether-activation-overlap')",true,'PPh3 without azo reagent does not enable Mitsunobu');
check("ceGet(ceFixture(['CCO','CCBr','Oc1ccccc1','[Na+].[O-]CC',ceP],['dead']),'williamson').compatibilityConflicts.some(c=>c.code==='ether-activation-overlap')",true,'Preformed alkoxide Williamson route also participates in overlap');
check("moleculeSame(ceGet(ceFixture(['C[C@H](O)CC','Oc1ccccc1',ceP],['dead']),'mitsunobu').products[0].isomericSmiles,'C[C@@H](Oc1ccccc1)CC')",true,'Mitsunobu retains encoded inversion in an independent recipe');
check("moleculeSame(ceGet(ceFixture(['C[C@H](Br)CC','Oc1ccccc1'],['k2co3']),'williamson').products[0].isomericSmiles,'C[C@@H](Oc1ccccc1)CC')",true,'Williamson retains encoded inversion at the halide carbon');
check("ceGet(ceFixture(['Brc1ccccc1','C=CC(=O)OC'],cePd,25),'heck').compatibilityWarnings.some(w=>w.code==='coupling-temperature-review')",true,'Low-temperature Heck retains a review warning instead of a universal rejection');
check("ceGet(ceFixture(['Brc1ccccc1','C#CC'],cePd),'sonogashira').compatibilityWarnings.some(w=>w.code==='coupling-catalyst-review')",true,'Copper-free branch carries its catalyst scope limit');
check("(()=>{const f=ceFixture(['Brc1ccccc1','C#CC'],[...cePd,'cui']);f.conditions.atmosphere='air';const p=predictReaction(f.compounds,f.conditions),o=[p.best,...p.alternatives].find(o=>o.id==='sonogashira');return o.compatibilityWarnings.some(w=>w.code==='coupling-oxidative-competition')&&routeStepAssessment({outcome:o}).warnings.some(w=>w.includes('Cu/oxygen'));})()",true,'Recorded Cu/oxygen concern reaches route assessment');
check("(()=>{const f=ceFixture(['Brc1ccccc1','C=CC(=O)OC'],cePd,25),o=ceGet(f,'heck');return reactionScopeAssess(f.compounds,f.conditions,o).reasons.some(r=>r.code==='coupling-temperature-review'&&r.level==='uncertain');})()",true,'Condition warnings remain uncertainty rather than invented impossibility');
for(const [id,partner] of [['suzuki','OB(O)c1ccccc1'],['heck','C=CC(=O)OC'],['sonogashira','C#CC']]){Object.assign(ctx,{id,partner});check("!!ceGet(ceFixture(['Brc1ccccc1',partner],['pdpph3']),id)",false,'Missing required base does not enable '+id);}
console.log('Coupling and ether compatibility: '+checks+' checks passed.');
