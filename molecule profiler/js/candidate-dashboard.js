'use strict';
(function(root){
 const parse=s=>buildMolecule(parseSmiles(s));
 function properties(smiles,name){
  const m=parse(smiles),d=describe(m),basic=root.CandidateInfo.basic({smiles,name},{catalog:[]}),v=evaluate(d);
  return {formula:d.formula,mw:d.mw,logp:d.logp,tpsa:typeof tpsa==='function'?tpsa(m,{includeSulfurPhosphorus:true}):d.tpsa,logS:v.logS,hbd:d.hbdStrict,hba:d.hbaStrict,rotatableBonds:d.rotatableBonds,charge:d.charge,bbb:basic.bbb};
 }
 function build(record,candidates){
  const baseline=properties(record.smiles,record.name),parent={name:record.name||'Input molecule',smiles:record.smiles,properties:baseline};
  const rows=candidates.slice(0,25).map((candidate,index)=>{try{const values=properties(candidate.smiles,candidate.name),delta=Object.fromEntries(['mw','logp','tpsa','logS','hbd','hba','rotatableBonds','charge'].map(k=>[k,values[k]-baseline[k]]));return {index,candidate,experimentalValidation:false,name:candidate.name,smiles:candidate.smiles,site:candidate.site,properties:values,delta,releaseKind:candidate.designMode==='ether-redesign'?'different-analogue':candidate.normalization?'organic-component':'original-input',declaredTargetSmiles:candidate.releaseTargetSmiles||candidate.recoveredParentSmiles||null,release:null};}catch(e){return {index,candidate,experimentalValidation:false,name:candidate.name,smiles:candidate.smiles,error:e.message,release:null};}});
  return {version:1,input:parent,rows,scope:'Calculated properties, local empirical estimates and unvalidated formal release routes. Differences do not establish an ADME or clinical improvement.'};
 }
 function filterSort(rows,options={}){
  const term=(options.search||'').trim().toLowerCase(),dir=options.direction==='desc'?-1:1,key=options.sort||'index';
  const value=r=>key==='index'?r.index:key==='steps'?r.release?.status==='formal-route-found'?r.release.steps.length:null:r.properties?.[key];
  return rows.filter(r=>(!term||[r.name,r.smiles,r.site?.label,r.properties?.formula].join(' ').toLowerCase().includes(term))&&(!options.kind||r.releaseKind===options.kind)&&(!options.bbb||r.properties?.bbb.available&&String(r.properties.bbb.label.startsWith('Likely'))===options.bbb)).slice().sort((a,b)=>{const x=value(a),y=value(b),xn=!Number.isFinite(x),yn=!Number.isFinite(y);return xn||yn?xn===yn?a.index-b.index:xn?1:-1:dir*(x-y)||a.index-b.index;});
 }
 function csv(report){
  const headers=['number','name','smiles','formula','site_input_atom','mw','delta_mw','wlogp','delta_wlogp','tpsa','delta_tpsa','esol_logS','delta_esol_logS','bbb_screen','release_kind','declared_target_smiles','release_status','formal_steps','checked_target_smiles'];
  const cell=v=>{let s=String(v??'');if(/^\s*[=+@-]/.test(s)&&!/^\s*-\d+(?:\.\d+)?(?:e[+-]?\d+)?\s*$/i.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  return [headers,...report.rows.map(r=>[r.index+1,r.name,r.smiles,r.properties?.formula,r.site?.atom===undefined?'':r.site.atom+1,r.properties?.mw,r.delta?.mw,r.properties?.logp,r.delta?.logp,r.properties?.tpsa,r.delta?.tpsa,r.properties?.logS,r.delta?.logS,r.properties?.bbb?.label,r.releaseKind,r.declaredTargetSmiles,r.release?.status||'not-checked',r.release?.status==='formal-route-found'?r.release.steps.length:null,r.release?.releaseTarget.smiles])].map(r=>r.map(cell).join(',')).join('\n')+'\n';
 }
 root.CandidateDashboard={build,filterSort,csv,properties};
})(globalThis);
