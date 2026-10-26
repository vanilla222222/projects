'use strict';
// Historical name-holdout protocol; preserve comparison direction as well as values.
// Cache computation only; retain score-only ranking and original target-order ties.
function evaluate(sets,byName,score,options={}){
 // Symmetric metrics may opt into a bounded triangular cache. Generic callers
 // retain directional scoring; oversized datasets fall back to per-query caches.
 const names=[...new Set(sets.flatMap(set=>set.ligands))],ids=new Map(names.map((name,i)=>[name,i]));
 const cells=names.length*(names.length+1)/2,bytes=cells*Float64Array.BYTES_PER_ELEMENT;
 const budget=options.maxCacheBytes??64*1024*1024;
 if(!Number.isSafeInteger(budget)||budget<0)throw new RangeError('Invalid pair-cache budget');
 const pairs=options.symmetric===true&&Number.isSafeInteger(bytes)&&bytes<=budget?new Float64Array(cells).fill(NaN):null;
 const rankings=new Map(),trials=[];let similarityCalls=0;
 function compare(held,name){
  let cell;
  if(pairs){const a=ids.get(held),b=ids.get(name),hi=Math.max(a,b),lo=Math.min(a,b);cell=hi*(hi+1)/2+lo;
   if(!Number.isNaN(pairs[cell]))return pairs[cell];}
  const value=score(byName.get(held),byName.get(name));similarityCalls++;
  if(pairs)pairs[cell]=value;
  return value;
 }
 function ranking(held){
  if(rankings.has(held))return rankings.get(held);
  const scored=[],values=new Map();
  function similarity(name){if(!values.has(name))values.set(name,compare(held,name));return values.get(name);}
  for(const other of sets){
   let best=-1;const scores=[];
   for(const name of other.ligands){if(name===held)continue;const value=similarity(name);if(value>best)best=value;scores.push(value);}
   if(best>=0)scored.push({index:other.index,gene:other.gene,value:best,mean:scores.sort((a,b)=>b-a).slice(0,3).reduce((a,b)=>a+b,0)/Math.min(3,scores.length)});
  }
  scored.sort((a,b)=>b.value-a.value||(options.tieBreak==='meanTop3'?b.mean-a.mean:0)||a.index-b.index);
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
 return {trials,similarityCalls,queries:rankings.size,pairCacheBytes:pairs?pairs.byteLength:0};
}
module.exports={evaluate};
