'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),ctx=vm.createContext({console,performance,setTimeout,clearTimeout});
const loaded=new Set();
for(const m of fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g))if(m[1]!=='js/app.js'){loaded.add(m[1]);vm.runInContext(fs.readFileSync(path.join(root,m[1]),'utf8'),ctx,{filename:m[1]});}
if(!loaded.has('js/reaction-cascade.js'))vm.runInContext(fs.readFileSync(path.join(root,'js/reaction-cascade.js'),'utf8'),ctx,{filename:'reaction-cascade.js'});
const run=c=>vm.runInContext(c,ctx);let checks=0;const check=(c,e,label)=>{assert.equal(run(c),e,label);checks++;};
run(`const cascadeStages=[{reagents:[{smiles:'[O-][Mn](=O)(=O)=O.[K+]',role:'reagent'}],target:'CC(=O)O'},{freshMixture:true,reagents:[{smiles:'CCO',role:'reactant'}],conditions:{additives:['h2so4']},target:'CCOC(C)=O'}];`);
check(`(()=>{const r=reactionCascadeRun('CCO',cascadeStages);return r.status==='complete'&&r.route.length===2&&r.route.every(l=>retroForwardCheck(l.candidate,l.to))&&moleculeSame(r.target,'CCOC(C)=O');})()`,true,'Two fresh mixtures produce independently replayable connected steps');
check(`(()=>{const r=reactionCascadeRun('CCO',cascadeStages);return r.stages[0].branches.some(b=>b.byproducts.includes('MnO₂'));})()`,true,'Named byproducts are retained with branch provenance');
check(`reactionCascadeRun('CCO',[cascadeStages[0],{...cascadeStages[1],freshMixture:false}]).status`,'blocked','No one-pot compatibility inferred');
check(`reactionCascadeRun('CCO',Array(7).fill(cascadeStages[0])).status`,'invalid','Six-stage limit applies');
check(`reactionCascadeRun('CCO',[{...cascadeStages[0],target:'CCN'}]).status`,'unsupported','Unreproduced requested target cannot be carried');
check(`reactionCascadeRun('CCO',[{reagents:[]}]).status`,'unsupported','Unknown reaction stops the sequence');
check(`(()=>{const r=reactionCascadeRun('OCC(O)CC',[{reagents:[],conditions:{solvents:['dcm'],additives:['dmp']}}]);return r.status==='ambiguous'&&r.stages[0].branches.some(b=>b.partialConversion);})()`,true,'Alternative sites retained and require explicit branch selection');
check(`reactionCascadeRun('OCC(O)CC',[{reagents:[],conditions:{solvents:['dcm'],additives:['dmp']},target:'O=CC(O)CC'}]).status`,'blocked','Selecting a partial-conversion branch does not certify preparation');
console.log('Reaction cascade: '+checks+' focused checks passed.');
