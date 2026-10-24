'use strict';
(function(root){
 const numeric=['mw','logp','tpsa','logS'],text=(v,n=4000)=>v==null?'':String(v).slice(0,n),finite=v=>typeof v==='number'&&Number.isFinite(v);
 function properties(p={}){if(!p||typeof p!=='object')p={};const b=p.bbb||{};return {...Object.fromEntries(numeric.map(k=>[k,finite(p[k])?p[k]:null])),formula:text(p.formula,300),bbb:{available:b.available===true,label:b.available===true?text(b.label,300):'Unavailable',reason:text(b.reason),scope:text(b.scope),model:text(b.model,300)}};}
 function releaseData(raw){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  const objects=a=>Array.isArray(a)?a.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)):[];
  const product=p=>({formula:text(p.formula,300),smiles:text(p.smiles),isReleaseTarget:p.isReleaseTarget===true});
  return {limitsApplied:Array.isArray(raw.steps)&&raw.steps.length>20||Array.isArray(raw.byproducts)&&raw.byproducts.length>50,status:text(raw.status,100),reason:text(raw.reason),releaseTarget:{status:text(raw.releaseTarget?.status,100),smiles:text(raw.releaseTarget?.smiles)},steps:objects(raw.steps).slice(0,20).map(s=>({number:finite(s.number)?s.number:null,label:text(s.label,1000),reactantSmiles:text(s.reactantSmiles),formalInput:text(s.formalInput),cutBonds:objects(s.cutBonds).slice(0,20).map(b=>({atoms:Array.isArray(b.atoms)?b.atoms.filter(a=>Number.isInteger(a)&&a>0&&a<10000).slice(0,2):[],numbering:text(b.numbering)})),products:objects(s.products).slice(0,50).map(product),source:{url:text(s.source?.url)}})),byproducts:Array.isArray(raw.byproducts)?objects(raw.byproducts).slice(0,50).map(product):null};
 }
 function normalize(data){
  if(!data||data.schemaVersion!==1||!['candidate-comparison','candidate-summary','release-review'].includes(data.kind)||!Array.isArray(data.rows)||data.rows.length>100||!data.input||typeof data.input!=='object')throw Error('Use a supported structured result with at most 100 designs. Raw Python output remains available.');
  const input={name:text(data.input.name,1000),smiles:text(data.input.smiles),properties:properties(data.input.properties)};
  const rows=data.rows.map((r,index)=>{if(!r||typeof r!=='object'||Array.isArray(r))throw Error('Invalid structured candidate row.');const p=properties(r.properties);return {index,name:text(r.name,1000),smiles:text(r.smiles),properties:p,delta:Object.fromEntries(numeric.map(k=>[k,finite(p[k])&&finite(input.properties[k])&&finite(p[k]-input.properties[k])?p[k]-input.properties[k]:null])),releaseKind:text(r.releaseKind,100),declaredTargetSmiles:text(r.declaredTargetSmiles),release:releaseData(r.release),error:text(r.error),experimentalValidation:false};});
  return {schemaVersion:1,kind:data.kind,input,rows,scope:'App descriptors and unvalidated formal release checks. Differences and passive BBB screens do not establish clinical benefit, biological conversion or measured exposure.'};
 }
 function sort(rows,key='index',direction='asc',search=''){
  const sign=direction==='desc'?-1:1,term=search.trim().toLowerCase();
  const value=r=>key==='index'?r.index:key==='name'?r.name||null:key==='formula'?r.properties.formula||null:key.startsWith('delta-')?r.delta[key.slice(6)]:r.properties[key];
  return rows.filter(r=>!term||[r.name,r.smiles,r.properties.formula].join(' ').toLowerCase().includes(term)).slice().sort((a,b)=>{const x=value(a),y=value(b),missing=v=>v==null||typeof v==='number'&&!finite(v);if(missing(x)||missing(y))return missing(x)===missing(y)?a.index-b.index:missing(x)?1:-1;return sign*(typeof x==='string'?x.localeCompare(String(y)):x-y)||a.index-b.index;});
 }
 function csv(report,rows=report.rows){
  const cell=v=>{let s=v==null?'':String(v);if(/^\s*[=+@-]/.test(s)&&!/^\s*-?\d+(?:\.\d+)?(?:e[+-]?\d+)?\s*$/i.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  const row=(r,parent=false)=>[parent?'input':r.index+1,r.name,r.smiles,r.properties.formula,...numeric.flatMap(k=>[r.properties[k],parent?finite(r.properties[k])?0:null:r.delta[k]]),r.properties.bbb.available?r.properties.bbb.label:'Unavailable',r.properties.bbb.reason,'Passive screen; not measured penetration',parent?'input':r.releaseKind,parent?'':r.declaredTargetSmiles,parent?'':r.release?.status||'not-checked',parent?'':r.release?.releaseTarget?.smiles,'Unvalidated'];
  return [['design','name','smiles','formula',...numeric.flatMap(k=>[k,'delta_'+k]),'bbb_screen','bbb_reason','bbb_scope','release_kind','declared_target_smiles','release_status','checked_target_smiles','evidence_status'],row(report.input,true),...rows.map(r=>row(r))].map(r=>r.map(cell).join(',')).join('\n')+'\n';
 }
 const api={normalize,sort,csv,finite};root.PythonResults=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
