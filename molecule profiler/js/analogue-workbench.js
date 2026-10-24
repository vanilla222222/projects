'use strict';
(function(root){
 const cache=new Map(),finite=Number.isFinite,keys=['mw','logp','tpsa','logS','hbd','hba','rotatableBonds','charge','rings','fractionCsp3'];
 function calculate(smiles){
  if(cache.has(smiles))return cache.get(smiles);
  const mol=buildMolecule(parseSmiles(smiles)),d=describe(mol),v=evaluate(d),bbb=root.CandidateInfo?.basic({smiles},{catalog:[]}).bbb||{available:false,label:'Unavailable',reason:'BBB screen unavailable.'};
  const value={properties:{formula:d.formula,mw:d.mw,exactMass:d.exactMass,logp:d.logp,tpsa:typeof tpsa==='function'?tpsa(mol,{includeSulfurPhosphorus:true}):d.tpsa,logS:v.logS,hbd:d.hbdStrict,hba:d.hbaStrict,rotatableBonds:d.rotatableBonds,charge:d.charge,rings:d.rings,fractionCsp3:d.fractionCsp3,bbb},fp:fingerprint(mol,'ecfp4s')};
  if(cache.size>=300)cache.delete(cache.keys().next().value);cache.set(smiles,value);return value;
 }
 function build(record,generated){
  const parent=calculate(record.smiles);const rows=generated.rows.map((r,index)=>{try{const result=calculate(r.smiles);return {...r,index,properties:result.properties,delta:Object.fromEntries(keys.map(k=>[k,finite(result.properties[k])&&finite(parent.properties[k])?result.properties[k]-parent.properties[k]:null])),similarity:tanimoto(parent.fp,result.fp)};}catch(e){return {...r,index,error:'Descriptor calculation unavailable: '+e.message,properties:null,delta:{},similarity:null};}});
  return {...generated,input:{name:record.name,smiles:record.smiles,properties:parent.properties},rows,methods:{similarity:'Local stereo-aware ECFP4s Tanimoto; structural resemblance only.',properties:'Existing browser descriptors, WLOGP and ESOL estimates. BBB is the available passive screen, not measured brain penetration.'}};
 }
 function filterSort(rows,options={}){
  for(const key of ['maxMw','maxLogp','minSimilarity'])if(options[key]!=null&&!finite(options[key]))throw Error('Enter finite numeric filter values.');
  if(options.maxMw!=null&&options.maxMw<=0)throw Error('Maximum MW must be greater than zero.');if(options.minSimilarity!=null&&(options.minSimilarity<0||options.minSimilarity>1))throw Error('Minimum similarity must be between 0 and 1.');
  const term=(options.search||'').trim().toLowerCase(),key=options.sort||'index',sign=options.direction==='desc'?-1:1;
  const value=r=>key==='name'?r.name:key==='index'?r.index:key==='similarity'?r.similarity:key.startsWith('delta-')?r.delta?.[key.slice(6)]:r.properties?.[key];
  return rows.filter(r=>(!options.selectedOnly||r.shortlisted)&&(!term||[r.name,r.smiles,r.familyLabel,r.site.label,r.properties?.formula].join(' ').toLowerCase().includes(term))&&(!options.family||r.family===options.family)&&(options.maxMw==null||finite(r.properties?.mw)&&r.properties.mw<=options.maxMw)&&(options.maxLogp==null||finite(r.properties?.logp)&&r.properties.logp<=options.maxLogp)&&(options.minSimilarity==null||finite(r.similarity)&&r.similarity>=options.minSimilarity)).slice().sort((a,b)=>{const x=value(a),y=value(b),missing=v=>v==null||typeof v==='number'&&!finite(v);if(missing(x)||missing(y))return missing(x)===missing(y)?a.index-b.index:missing(x)?1:-1;return sign*(typeof x==='string'?x.localeCompare(y):x-y)||a.index-b.index;});
 }
 function csv(report,rows=report.rows){
  const cell=v=>{let s=String(v??'');if(/^\s*[=+@-]/.test(s)&&!/^\s*-?\d+(?:\.\d+)?(?:e[+-]?\d+)?\s*$/i.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  const headers=['number','name','smiles','formula','edit_family','edit','input_atom','shortlisted','similarity_ecfp4s',...keys.flatMap(k=>[k,'delta_'+k]),'bbb_passive_screen','bbb_reason','experimental_validation','scope'];
  return [headers,...rows.map(r=>[r.index+1,r.name,r.smiles,r.properties?.formula,r.familyLabel,r.edit,r.site.atom+1,!!r.shortlisted,r.similarity,...keys.flatMap(k=>[r.properties?.[k],r.delta?.[k]]),r.properties?.bbb?.available?r.properties.bbb.label:'Unavailable',r.properties?.bbb?.reason,false,'Unvalidated structural analogue; no activity, ADME improvement or synthesis route established'])].map(row=>row.map(cell).join(',')).join('\n')+'\n';
 }
 const api={build,filterSort,keys,csv};root.AnalogueWorkbench=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
