'use strict';
// Fixed-model evaluation; no fitting, endpoint substitution or score tuning.
(function(root){
 const ENDPOINTS={logS:{name:'Aqueous solubility',units:'log10(mol/L)',kind:'regression',model:'Local Delaney ESOL equation'},logP:{name:'Octanol/water log P',units:'log10 partition coefficient',kind:'regression',model:'Local Wildman–Crippen WLOGP'},bbb:{name:'BBB binary labels',units:'0 = nonpenetrant, 1 = penetrant',kind:'classification',model:'Local passive WLOGP/TPSA screen'}};
 function divide(n,d){return d?n/d:null;}
 function wilson(k,n){if(!n)return null;const z=1.96,p=k/n,base=1+z*z/n,center=(p+z*z/(2*n))/base,half=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/base;return [Math.max(0,center-half),Math.min(1,center+half)];}
 function regression(pairs){if(!pairs.length)return null;const n=pairs.length,mean=pairs.reduce((s,p)=>s+p.observed,0)/n,errors=pairs.map(p=>p.predicted-p.observed),sse=errors.reduce((s,e)=>s+e*e,0),sst=pairs.reduce((s,p)=>s+(p.observed-mean)**2,0);return {n,mae:errors.reduce((s,e)=>s+Math.abs(e),0)/n,rmse:Math.sqrt(sse/n),bias:errors.reduce((s,e)=>s+e,0)/n,r2:sst>0?1-sse/sst:null};}
 function classification(pairs){if(!pairs.length)return null;let tp=0,tn=0,fp=0,fn=0;for(const r of pairs){if(r.observed===1)r.predicted===1?tp++:fn++;else r.predicted===1?fp++:tn++;}const n=tp+tn+fp+fn,sensitivity=divide(tp,tp+fn),specificity=divide(tn,tn+fp),denominator=Math.sqrt((tp+fp)*(tp+fn)*(tn+fp)*(tn+fn));return {n,tp,tn,fp,fn,accuracy:(tp+tn)/n,balancedAccuracy:sensitivity===null||specificity===null?null:(sensitivity+specificity)/2,sensitivity,specificity,mcc:divide(tp*tn-fp*fn,denominator),majorityBaseline:Math.max(tp+fn,tn+fp)/n,accuracy95CI:wilson(tp+tn,n),sensitivity95CI:wilson(tp,tp+fn),specificity95CI:wilson(tn,tn+fp)};}
 function parseCSV(text,maxRows=500){
  if(typeof text!=='string'||text.length>1048576)throw Error('Measurement CSV limit is 1 MB.');
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(s=>s.trim());if(!lines.length)throw Error('Provide a CSV with smiles and observed columns.');
  const head=root.InputWorkflow.csvColumns(lines[0],',').map(s=>s.trim().toLowerCase());if(new Set(head).size!==head.length||!head.includes('smiles')||!head.includes('observed'))throw Error('Unique smiles and observed columns are required.');
  if(lines.length-1>maxRows)throw Error('Maximum '+maxRows+' measurement rows.');
  return lines.slice(1).map((line,i)=>{const cells=root.InputWorkflow.csvColumns(line,',');if(cells.length!==head.length)throw Error('Row '+(i+2)+' has a different column count. Multiline quoted fields are not supported.');return Object.fromEntries(head.map((h,j)=>[h,cells[j]]));});
 }
 function evaluateRows(rows,endpoint,options={}){
  if(!ENDPOINTS[endpoint])throw Error('Choose logS, logP or bbb.');if(!Array.isArray(rows)||rows.length>(options.maxRows||500))throw Error('Measurement row limit exceeded.');
  const results=rows.map((r,index)=>({row:index+1,name:String(r.name||''),smiles:String(r.smiles||'').trim(),observed:r.observed,predicted:null,status:'pending',reason:null})),groups=new Map();
  for(const r of results){
   if(r.observed===null||r.observed===undefined||String(r.observed).trim()===''||!Number.isFinite(Number(r.observed))||endpoint==='bbb'&&![0,1].includes(Number(r.observed))){r.status='excluded';r.reason='Invalid observed value or endpoint units.';continue;}r.observed=Number(r.observed);
   try{
    if(!r.smiles||r.smiles.length>4000)throw Error();
    const m=buildMolecule(parseSmiles(r.smiles)),d=describe(m);if(!m.atoms.length||m.atoms.length>120)throw Error();
    const bucket=groups.get(d.formula)||[];let group=bucket.find(g=>root.Pharmacology.exactGraph(g.mol,m));
    if(!group){group={mol:m,d,rows:[]};bucket.push(group);groups.set(d.formula,bucket);}group.rows.push(r);
   }catch(_){r.status='excluded';r.reason='Structure could not be parsed.';}
  }
  for(const bucket of groups.values())for(const group of bucket){
   const [r,...duplicates]=group.rows;
   if(group.rows.some(x=>x.observed!==r.observed)){for(const x of group.rows){x.status='excluded';x.reason='Conflicting labels for the same exact graph.';}continue;}
   for(const x of duplicates){x.status='excluded';x.reason='Duplicate exact graph and measurement; counted once.';}
   const m=group.mol,d=group.d,unsupported=m.atoms.some(a=>!['H','C','N','O','F','P','S','Cl','Br','I'].includes(a.element))||d.crippenTypes?.some(t=>t.type==='ZERO');
   if(r.smiles.includes('.')||unsupported||m.atoms.some(a=>a.charge)){
    r.status='abstained';r.reason=r.smiles.includes('.')?'Disconnected structure.':unsupported?'Unsupported descriptor chemistry.':'Charged input; neutral-property/passive screen withheld.';continue;
   }
   try{const predicted=endpoint==='bbb'?(boiledEgg({...d,tpsa:tpsa(m,{includeSulfurPhosphorus:true})}).bbb?1:0):endpoint==='logS'?esolLogS(d):d.logp;if(!Number.isFinite(predicted))throw Error();r.predicted=predicted;r.status='scored';}catch(_){r.status='abstained';r.reason='Model output unavailable.';}
  }
  const scored=results.filter(r=>r.status==='scored'),reasons={};for(const r of results)if(r.reason)reasons[r.reason]=(reasons[r.reason]||0)+1;
  return {schemaVersion:1,endpoint,...ENDPOINTS[endpoint],inputRows:results.length,scored:scored.length,abstained:results.filter(r=>r.status==='abstained').length,excluded:results.filter(r=>r.status==='excluded').length,coverage:divide(scored.length,results.length),metrics:ENDPOINTS[endpoint].kind==='classification'?classification(scored):regression(scored),reasons,rows:results,scope:'Fixed existing model; no fitting or threshold selection. Metrics apply only to scored structures in this dataset. Coverage and exclusions must be read alongside performance. External data can overlap a published model’s development set; independence is not assumed.'};
 }
 const api={ENDPOINTS,parseCSV,evaluateRows,regression,classification,wilson};root.PredictionBenchmarks=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
