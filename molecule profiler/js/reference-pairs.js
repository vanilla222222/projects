'use strict';
(function(root){
 function create(model,data){const cache=new Map(),valid=g=>g.names.filter(n=>model.byName.get(n)?.smiles===g.librarySmiles[n]&&model.dossier(n).records.some(r=>g.recordIds.includes(r.id)));
  function pair(index){if(cache.has(index))return cache.get(index);const p=data.pairs[index],a=data.graphs[p.a],b=data.graphs[p.b],namesA=valid(a),namesB=valid(b),effects=[];if(!namesA.length||!namesB.length)return null;
   for(const g of model.comparison(namesA.concat(namesB)).groups){if(g.incomplete||!['functional_assay','control_comparison'].includes(g.kind))continue;const exact=g.observations.filter(({name,observation:o})=>!model.dossier(name).identityWarnings.length&&typeof o.value==='number'&&Number.isFinite(o.value)&&o.value>0&&(o.relation||'=')==='='&&['nM','µM','uM','M'].includes(o.unit)&&['EC50','IC50','Ki','Kd'].includes(root.ReferenceSAR.endpoint(o))),dedupe=list=>[...new Map(list.map(x=>[x.observation.id,x])).values()],as=dedupe(exact.filter(x=>namesA.includes(x.name))),bs=dedupe(exact.filter(x=>namesB.includes(x.name)));
    for(const aa of as)for(const bb of bs){const oa=aa.observation,ob=bb.observation;if(root.ReferenceSAR.endpoint(oa)!==root.ReferenceSAR.endpoint(ob))continue;const ratio=ob.value/oa.value;if(!Number.isFinite(ratio)||ratio<=0)continue;effects.push({target:g.target,metric:root.ReferenceSAR.endpoint(oa),unit:g.unit,species:g.species,hostSpecies:g.hostSpecies,assay:g.assay,testedForm:g.testedForm,sourceUrl:g.sourceUrl,a:oa,b:ob,foldBoverA:ratio,deltaP:-Math.log10(ratio)});}
   }
   const result={index,...p,namesA,namesB,labelA:model.dossier(namesA[0]).label,labelB:model.dossier(namesB[0]).label,smilesA:a.smiles,smilesB:b.smiles,effects};cache.set(index,result);return result;
  }
  function results({family='',target='',onlyComparable=false,cliffFold=100,page=1,perPage=12}={}){const threshold=Number(cliffFold);if(!Number.isFinite(threshold)||threshold<1)throw Error('Choose a finite fold-change threshold of at least one.');const members=family?new Set(model.members(family).map(e=>e.name)):null,items=[];
   for(let i=0;i<data.pairs.length;i++){const p=pair(i);if(!p||(members&&(!p.namesA.some(n=>members.has(n))||!p.namesB.some(n=>members.has(n)))))continue;if(target&&!p.namesA.some(n=>model.observations(model.byName.get(n)).some(o=>o.target===target)))continue;if(target&&!p.namesB.some(n=>model.observations(model.byName.get(n)).some(o=>o.target===target)))continue;const effects=p.effects.filter(e=>!target||e.target===target).map(e=>({...e,cliffCandidate:Math.abs(e.deltaP)>=Math.log10(threshold)}));if(onlyComparable&&!effects.length)continue;items.push({...p,effects});}
   const pages=Math.max(1,Math.ceil(items.length/perPage)),current=Math.min(Math.max(1,page),pages);return {total:items.length,page:current,pages,items:items.slice((current-1)*perPage,current*perPage),graphScope:data.graphs.length,cliffFold:threshold};
  }
  return {pair,results};
 }
 const api={create};root.ReferencePairs=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
