'use strict';
const assert=require('node:assert/strict'),{evaluate}=require('./retrieval-evaluate.js');
for(const file of ['smiles','mol','stereo','fingerprints'])Object.assign(global,require('../js/'+file+'.js'));
// Independent uncached reference, preserving the historical loop and tie order.
function reference(sets,byName,score){
 const trials=[];
 for(const set of sets){if(set.ligands.length<2)continue;for(const held of set.ligands){
  const scored=sets.map(other=>{let best=-1;for(const name of other.ligands){if(name===held)continue;const value=score(byName.get(held),byName.get(name));if(value>best)best=value;}return {index:other.index,gene:other.gene,value:best};})
   .filter(row=>row.value>=0).sort((a,b)=>b.value-a.value||a.index-b.index);
  trials.push({index:set.index,gene:set.gene,key:set.key,held,rank:scored.findIndex(row=>row.index===set.index)+1,
   scoredTargets:scored.length,topGene:scored[0].gene,topScore:scored[0].value,ligands:set.ligands.length});
 }}return trials;
}
const structures={A:'CCO',Alias:'OCC',B:'CCCO',C:'c1ccccc1',D:'c1ccncc1',R:'N[C@@H](C)C(=O)O',S:'N[C@H](C)C(=O)O'};
const sets=[{index:0,gene:'A',key:'A',ligands:['A','Alias','B','R']},{index:1,gene:'B',key:'B',ligands:['A','C','D','R','S']},
 {index:2,gene:'n/a',key:'n/a::one',ligands:['C','D']},{index:3,gene:'n/a',key:'n/a::two',ligands:['D']},{index:4,gene:'Empty',key:'Empty',ligands:[]}];
for(const method of ['ecfp4','ecfp6','fcfp4','ecfp4s','pairs'])for(const metric of [tanimoto,dice]){
 const byName=new Map(Object.entries(structures).map(([name,s])=>[name,fingerprint(buildMolecule(parseSmiles(s)),method)]));
 let uncachedCalls=0;const expected=reference(sets,byName,(a,b)=>{uncachedCalls++;return metric(a,b);});
 const actual=evaluate(sets,byName,metric);
 assert.deepEqual(actual.trials,expected,method+' trial/rank/score equivalence');
 assert.ok(actual.similarityCalls<uncachedCalls/2,'shared references and held-out names must avoid repeated comparisons');
 assert.ok(actual.similarityCalls<=byName.size*(byName.size-1));
 assert.equal(actual.queries,7);
 const symmetric=evaluate(sets,byName,metric,{symmetric:true});
 assert.deepEqual(symmetric.trials,expected,method+' symmetric-cache equivalence');
 assert.ok(symmetric.similarityCalls<=byName.size*(byName.size-1)/2);
 assert.ok(symmetric.similarityCalls<actual.similarityCalls);
 assert.equal(symmetric.pairCacheBytes,byName.size*(byName.size+1)/2*8);
 const fallback=evaluate(sets,byName,metric,{symmetric:true,maxCacheBytes:0});
 assert.deepEqual(fallback.trials,expected,'budget fallback preserves every trial');
 assert.equal(fallback.pairCacheBytes,0);
}
const values=new Map(Object.keys(structures).map((name,i)=>[name,i+1]));
const asymmetric=(a,b)=>a/10+b/100;
assert.deepEqual(evaluate(sets,values,asymmetric).trials,reference(sets,values,asymmetric),'comparison direction must remain unchanged');
assert.deepEqual(evaluate([],new Map(),tanimoto).trials,[]);
assert.throws(()=>evaluate([],new Map(),tanimoto,{maxCacheBytes:-1}),RangeError);
console.log('Cached retrieval: exact uncached trial/rank/score agreement across 5 fingerprints × 2 metrics, ties, aliases, shared ligands, empty/singleton sets; fewer than half the similarity calls');
// The measured protocol now follows the app's nearest / mean-top-three / order ties.
const ranking=require('../js/target-ranking'),library=Object.entries(structures).map(([name,smiles])=>({name,smiles}));
const targetRows=sets.map(s=>({gene:s.gene,name:s.key,ligands:s.ligands}));
const engine={parse:s=>buildMolecule(parseSmiles(s)),fingerprint,tanimoto,dice},index=ranking.createIndex(library,targetRows,engine);
for(const method of ['ecfp4','ecfp6','fcfp4','ecfp4s','pairs'])for(const metric of ['tanimoto','dice']){
 const fps=new Map([...index.entries].map(([n,e])=>[n,e.fps[method]]));
 for(const trial of evaluate(sets,fps,engine[metric],{symmetric:true,tieBreak:'meanTop3'}).trials){
  const q=ranking.query(engine.parse(structures[trial.held]),index),actual=ranking.rank(q,index,{mode:'legacy',method,metric,excludeNames:[trial.held]});
  assert.equal(trial.rank,actual.findIndex(r=>r.order===trial.index)+1,'App/evaluator rank parity including shared names and aliases');assert.equal(trial.topScore,actual[0].score);assert.equal(trial.topGene,actual[0].target.gene);
 }
}
console.log('App/evaluator parity: every toy holdout and tie across five fingerprints and both metrics passed');
