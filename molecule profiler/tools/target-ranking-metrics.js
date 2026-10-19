'use strict';
// A tie is equality of both scientific sorting keys; display order is not evidence.
function positions(rows, positiveKeys, key) {
 const labels=[];
 for(let start=0;start<rows.length;){
  let end=start+1;
  while(end<rows.length&&rows[end].rankScore===rows[start].rankScore&&rows[end].mean===rows[start].mean)end++;
  for(let i=start;i<end;i++)if(positiveKeys.has(key(rows[i].target)))labels.push({key:key(rows[i].target),displayRank:i+1,bestRank:start+1,worstRank:end});
  start=end;
 }
 return {bestRank:labels.length?Math.min(...labels.map(x=>x.displayRank)):null,
  bestPossibleRank:labels.length?Math.min(...labels.map(x=>x.bestRank)):null,
  // Earliest guaranteed positive within a tied block: all negative members first.
  guaranteedRank:labels.length?Math.min(...labels.map(x=>x.worstRank-labels.filter(y=>y.bestRank===x.bestRank).length+1)):null,
  rankableLabels:labels.length,labels};
}
function summarize(results,mode){
 const hit=(rank,k)=>rank!==null&&rank<=k;
 const output={queries:results.length,unrankableQueries:results.filter(r=>r[mode].bestRank===null).length};
 const perTarget=new Map();
 for(const r of results)for(const key of r.positiveKeys){
  if(!perTarget.has(key))perTarget.set(key,{queries:0,guaranteedHits:0,possibleHits:0});
  const t=perTarget.get(key),label=r[mode].labels.find(x=>x.key===key);t.queries++;
  if(label&&label.worstRank<=5)t.guaranteedHits++;
  if(label&&label.bestRank<=5)t.possibleHits++;
 }
 for(const k of [1,5,10])output['top'+k]={display:results.filter(r=>hit(r[mode].bestRank,k)).length/results.length,
  guaranteed:results.filter(r=>hit(r[mode].guaranteedRank,k)).length/results.length,
  possible:results.filter(r=>hit(r[mode].bestPossibleRank,k)).length/results.length};
 const targets=[...perTarget.values()];
 output.targetMacroTop5={targets:targets.length,guaranteed:targets.reduce((s,t)=>s+t.guaranteedHits/t.queries,0)/targets.length,
  possible:targets.reduce((s,t)=>s+t.possibleHits/t.queries,0)/targets.length};
 return output;
}
module.exports={positions,summarize};
