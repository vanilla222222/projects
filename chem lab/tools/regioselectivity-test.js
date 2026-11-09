'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
const run=c=>vm.runInContext(c,ctx);let checks=0;const check=(c,e,label)=>{assert.equal(run(c),e,label);checks++;};
run(`function regioFixture(smiles,id='hydrohalogenation',overrides={}){
 const compounds=[{smiles,fragment:smilesToFragment(smiles),role:'reactant',equiv:'1'}];
 const conditions={...defaultReactionConditions(),solvents:['ether'],...overrides};
 if(['hydrohalogenation','hbr-radical'].includes(id))compounds.push({smiles:'Br',fragment:smilesToFragment('Br'),role:'reagent',equiv:'1'});
 if(id==='hydration'){conditions.solvents=['water'];conditions.additives=['h2so4'];}
 if(id==='hydroboration'){conditions.additives=['naoh'];compounds.push({smiles:'B',fragment:smilesToFragment('B'),role:'reagent',equiv:'1'});}
 if(id==='nitration')conditions.additives=['hno3','h2so4'];
 const before=JSON.stringify(compounds),prediction=predictReaction(compounds,conditions),outcome=[prediction.best,...prediction.alternatives].find(o=>o&&o.id===id);
 return {compounds,conditions,outcome,unchanged:before===JSON.stringify(compounds)};
}
function regioProducts(o){return [...new Set([...o.products,...o.minor].map(p=>moleculeIdentity(p.isomericSmiles||p.smiles).connectivityKey))].sort().join('|');}
`);
for(const id of ['hydrohalogenation','hydration','hydroboration']){ctx.id=id;
 check("regioFixture('CC=CCC',id).outcome.regioselectivity.status",'unresolved','Unequal constitutional orientations are unresolved '+id);
 check("regioFixture('CC=CCC',id).outcome.regioselectivity.representedIsomers",2,'Both tied orientations represented '+id);
 check("routeStepAssessment({outcome:regioFixture('CC=CCC',id).outcome}).blockers.some(b=>b.code==='regioselectivity')",true,'Planner rejects selective preparation '+id);
 check("regioFixture('CC=CC',id).outcome.regioselectivity.status",'equivalent','Symmetric alkene gives equivalent orientations '+id);
 check("regioFixture('CC=CC',id).outcome.minor.length",0,'Equivalent orientation is not duplicated '+id);
 check("regioFixture('C=CC',id).outcome.regioselectivity.status",'heuristic','Class-directed unique site remains a heuristic '+id);
 check("!routeStepAssessment({outcome:regioFixture('C=CC',id).outcome}).blockers.some(b=>b.code==='regioselectivity')",true,'Ordinary class-directed recipe is retained '+id);
 check("regioFixture('C=CCC=C',id).outcome.regioselectivity.status",'unresolved','Multiple alkene sites are not hidden by first-site selection '+id);
 check("regioFixture('CC=CCC',id).unchanged",true,'Alternative generation preserves input '+id);
}
check("regioProducts(regioFixture('CC=CCC').outcome)===['CC(Br)CCC','CCC(Br)CC'].map(s=>moleculeIdentity(s).connectivityKey).sort().join('|')",true,'Fixed 2-pentene HBr reference pair');
check("regioProducts(regioFixture('CC=CCC').outcome)===regioProducts(regioFixture('CCC=CC').outcome)",true,'Input atom order cannot select a different set of tied products');
check("regioProducts(regioFixture('CC=CCC','hydration').outcome)===['CC(O)CCC','CCC(O)CC'].map(s=>moleculeIdentity(s).connectivityKey).sort().join('|')",true,'Hydration positional pair retains oxygen identity');
check("regioFixture('CC=CCC','hbr-radical',{additives:['peroxide']}).outcome.regioselectivity.status",'unresolved','Radical HBr tie also has no assigned dominance');
check("regioFixture('[13CH3]C=CC').outcome.regioselectivity.status",'unresolved','Isotopic distinction is not erased by symmetry comparison');
check("regioFixture('C1=CCCCC1').outcome.regioselectivity.status",'equivalent','Ring symmetry is handled by product connectivity');
check("(()=>{const f=regioFixture('CC=CCC');return reactionScopeAssess(f.compounds,f.conditions,f.outcome).regioselectivity.status;})()",'unresolved','Scope carries the structural regioselectivity record');
check("(()=>{const f=regioFixture('CC=CCC');return reactionScopeAssess(f.compounds,f.conditions,f.outcome).reasons.some(r=>r.code==='regioselectivity'&&r.level==='conflict');})()",true,'Unresolved positional choice is a scope conflict');
check("(()=>{const f=regioFixture('CC=CCC');return routeWorkspaceValidateStep({from:'CC=CCC',to:'CC(Br)CCC',ruleId:'hydrohalogenation',compounds:f.compounds,conditions:f.conditions}).status;})()",'unverified','Saved route cannot certify one drawn tied isomer');
check("(()=>{const f=regioFixture('CC=CCC');return routeWorkspaceValidateStep({from:'CC=CCC',to:'CCC(Br)CC',ruleId:'hydrohalogenation',compounds:f.compounds,conditions:f.conditions}).status;})()",'unverified','Picking the other drawing cannot bypass the same gate');
check("(()=>{const f=regioFixture('Cc1ccccc1','nitration');return f.outcome.regioselectivity.status==='heuristic'&&f.outcome.regioselectivity.representedIsomers===2;})()",true,'Aromatic o/p branches remain explicit ranked heuristics');
check("regioFixture('Cc1ccccc1','nitration').outcome.regioselectivity.ratioBasis",'heuristic, not measured','Legacy aromatic ratios have an explicit epistemic label');
check("routeStepAssessment({outcome:regioFixture('Cc1ccccc1','nitration').outcome}).warnings.some(w=>w.includes('Aromatic site ordering'))",true,'Aromatic ranking caveat reaches planners');
check("(()=>{const f=regioFixture('Cc1ccccc1','nitration'),before=JSON.stringify(f.outcome);reactionScopeAssess(f.compounds,f.conditions,f.outcome);return before===JSON.stringify(f.outcome);})()",true,'Scope replay does not mutate regio records');
check("(()=>{const j=pathFinderCreate('CC=CCC','CC(Br)CCC',{maxDepth:1,maxRoutes:1,budgetMs:4000});while(j.status==='running')j.step(100);return j.status!=='found'&&j.diagnostics.compatibility>0;})()",true,'Path Finder cannot promote the arbitrary tied orientation to a clean route');
check("(()=>{const j=pathFinderCreate('C=CC','CC(Br)C',{maxDepth:1,maxRoutes:1,budgetMs:4000});while(j.status==='running')j.step(100);return j.status==='found';})()",true,'Class-directed control still has a one-step route');
check("(()=>{const f=regioFixture('Cc1ccccc1','nitration'),r=reactionScopeAssess(f.compounds,f.conditions,f.outcome);return r.reasons.some(x=>x.code==='heuristic-regioratio')&&!r.reasons.some(x=>x.code==='heuristic-stereoratio');})()",true,'Aromatic positional ratios are not mislabeled as stereo ratios');
check("(()=>{const f=regioFixture('Cc1ccccc1','nitration'),r=reactionScopeAssess(f.compounds,f.conditions,f.outcome);return Array.isArray(r.regioselectivity.ratio)&&r.stereochemistry.ratio===null;})()",true,'Ratio provenance stays in the regioselectivity record');
console.log('Regioselectivity: '+checks+' checks passed.');
