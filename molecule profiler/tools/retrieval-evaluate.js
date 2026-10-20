'use strict';
// Historical name-holdout protocol; preserve comparison direction as well as values.
// Cache computation only; retain score-only ranking and original target-order ties.
function evaluate(sets,byName,score){
 // Retain rankings for shared held-out names, and only one query's
 // reference similarities at a time; avoid a quadratic similarity matrix.
 const rankings=new Map(),trials=[];let similarityCalls=0;
 function ranking(held){
  if(rankings.has(held))return rankings.get(held);
  const scored=[],values=new Map();
  function similarity(name){if(!values.has(name)){values.set(name,score(byName.get(held),byName.get(name)));similarityCalls++;}return values.get(name);}
  for(const other of sets){
   let best=-1;
   for(const name of other.ligands){if(name===held)continue;const value=similarity(name);if(value>best)best=value;}
   if(best>=0)scored.push({index:other.index,gene:other.gene,value:best});
  }
  scored.sort((a,b)=>b.value-a.value||a.index-b.index);
  const result={ranks:new Map(scored.map((row,i)=>[row.index,i+1])),scoredTargets:scored.length,
   topGene:scored[0]?.gene,topScore:scored[0]?.value};
  rankings.set(held,result);return result;
 }
 for(const set of sets){
  if(set.ligands.length<2)continue;
  for(const held of set.ligands){const ranked=ranking(held);
   trials.push({index:set.index,gene:set.gene,key:set.key,held,rank:ranked.ranks.get(set.index)||0,
    scoredTargets:ranked.scoredTargets,topGene:ranked.topGene,topScore:ranked.topScore,ligands:set.ligands.length});
  }
 }
 return {trials,similarityCalls,queries:rankings.size};
}
module.exports={evaluate};
