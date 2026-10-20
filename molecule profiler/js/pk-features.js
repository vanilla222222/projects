'use strict';
// Identical feature implementation for browser inference and offline fitting.
(function(root){
 const DESCRIPTORS=['mw','logp','tpsa','hbd','hba','rotatableBonds','fractionCsp3','rings','heavyAtoms','charge','aromaticRings','amideBonds'];
 function features(mol,d,fp){
  const bits=Array(256).fill(0);for(const k of fp.counts.keys())bits[(k>>>0)%256]=1;
  const values=DESCRIPTORS.map(k=>d[k]);if(values.some(v=>!Number.isFinite(v)))throw Error('Non-finite model feature');
  return {values:values.concat(bits),bits};
 }
 function similarity(a,b){let both=0,either=0;for(let i=0;i<256;i++){both+=a[i]&&b[i]?1:0;either+=a[i]||b[i]?1:0;}return either?both/either:0;}
 function tree(x,nodes){let i=0;for(let steps=0;steps<=nodes.length;steps++){const n=nodes[i];if(n[0]===-1)return n[1];i=Math.fround(x[n[0]])<=n[1]?n[2]:n[3];}throw Error('Invalid prediction tree');}
 const decoded=new WeakMap();
 function predict(model,feature){
  if(!model.enabled)return {available:false,reason:'This experimental model did not beat its held-out median baseline.'};
  if(!decoded.has(model))decoded.set(model,model.trainingBits.map(s=>Array.from(s,c=>Number(c))));
  const distance=decoded.get(model).reduce((best,s)=>Math.max(best,similarity(feature.bits,s)),0);
  const outside=feature.values.slice(0,DESCRIPTORS.length).some((v,i)=>v<model.bounds[i][0]||v>model.bounds[i][1]);
  if(outside||distance<0.25)return {available:false,outsideDomain:true,nearestTrainingSimilarity:distance,reason:'Outside model applicability checks; numerical estimate withheld.'};
  const point=model.trees.reduce((sum,t)=>sum+tree(feature.values,t),0)/model.trees.length;
  const invert=v=>model.transform==='log10'?10**v:v;
  return {available:true,value:invert(point),lower:invert(point-model.residualRadius),upper:invert(point+model.residualRadius),
   nearestTrainingSimilarity:distance,outsideDomain:outside||distance<0.25,units:model.units,
   scope:'Experimental descriptor/fingerprint regression; interval is based on calibration residuals, not a clinical or guaranteed individual range.'};
 }
 const api={DESCRIPTORS,features,similarity,tree,predict};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.PKFeatures=api;
})(typeof globalThis!=='undefined'?globalThis:this);
