'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js'&&m[1]!=='js/reaction-scope.js')vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});
vm.runInContext(fs.readFileSync(path.join(root,'js/reaction-scope.js'),'utf8'),ctx,{filename:'reaction-scope.js'});
const run=c=>vm.runInContext(c,ctx);let checks=0;const check=(c,e,label)=>{assert.equal(run(c),e,label);checks++;};
run(`function scopeFixture(s,conditions){const compounds=[{smiles:s,role:'reactant',fragment:smilesToFragment(s)}],c={...defaultReactionConditions(),solvents:['dcm'],additives:['dmp'],...conditions},prediction=predictReaction(compounds,c);return {compounds,c,prediction,report:reactionScopeAssess(compounds,c,prediction.best)};}`);

for(const kind of ['racemic','diastereomers','relative']){
 ctx.kind=kind;
 check(`(()=>{const f=scopeFixture('CCO');const o={...f.prediction.best,products:[{...f.prediction.best.products[0],stereo:{kind}}]};const r=reactionScopeAssess(f.compounds,f.c,o);return r.reasons.some(x=>x.code===(kind==='relative'?'relative-stereochemistry':'stereochemical-mixture'))&&r.stereochemistry.products[0].kind===kind;})()`,true,'Stereo metadata: '+kind);
}
check(`(()=>{const f=scopeFixture('CCO');const o={...f.prediction.best,ratio:[75,25]};const r=reactionScopeAssess(f.compounds,f.c,o);return r.stereochemistry.ratioStatus==='heuristic'&&r.reasons.some(x=>x.code==='heuristic-stereoratio');})()`,true,'Fixed ratios are not measured selectivity');
check(`(()=>{const f=scopeFixture('CCO');return reactionScopeAssess(f.compounds,f.c,f.prediction.best).stereochemistry.ratioStatus;})()`,'not-assigned','Missing ratio remains unassigned');
check(`(()=>{const f=scopeFixture('CCO');const o={...f.prediction.best,minor:[{...f.prediction.best.products[0],stereo:{kind:'relative'}}]};return reactionScopeAssess(f.compounds,f.c,o).reasons.some(x=>x.code==='relative-stereochemistry');})()`,true,'Minor products included');
check(`(()=>{const f=scopeFixture('CCO');const o={...f.prediction.best,ratio:[75,25]};const before=JSON.stringify(o);reactionScopeAssess(f.compounds,f.c,o);return before===JSON.stringify(o);})()`,true,'Outcome unchanged');
check(`(()=>{const compounds=['CCC(C)=O','[Na+].[BH4-]'].map((smiles,i)=>({smiles,fragment:smilesToFragment(smiles),role:i?'reagent':'reactant'}));const c={...defaultReactionConditions(),solvents:['ethanol']};const p=predictReaction(compounds,c);return reactionScopeAssess(compounds,c,p.best).reasons.some(r=>r.code==='stereochemical-mixture');})()`,true,'Actual achiral ketone reduction is audited as a mixture');
console.log('Stereo audit: '+checks+' checks passed');
