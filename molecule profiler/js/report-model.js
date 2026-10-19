'use strict';
// Transparent descriptor summary: presents existing values, never predicts new properties.
(function(root) {
  const METRICS = Object.freeze([
    {key:'mw',label:'Molecular weight',unit:'g/mol',digits:2,source:'d',kind:'Calculated'},
    {key:'tpsa',label:'TPSA',unit:'Å²',digits:1,source:'d',kind:'Calculated'},
    {key:'logp',label:'WLOGP',unit:'',digits:2,source:'d',kind:'Estimated'},
    {key:'logS',label:'Aqueous log S',unit:'',digits:2,source:'v',kind:'Estimated'},
    {key:'hbd',label:'H-bond donors',unit:'',digits:0,source:'d',kind:'Rule-counted'},
    {key:'hba',label:'H-bond acceptors',unit:'',digits:0,source:'d',kind:'Rule-counted'},
    {key:'rotatableBonds',label:'Rotatable bonds',unit:'',digits:0,source:'d',kind:'Rule-counted'},
    {key:'rings',label:'Ring count',unit:'',digits:0,source:'d',kind:'Rule-counted'}
  ]);
  function asText(value,digits) {
    if(typeof value==='number')return Number.isFinite(value)?value.toFixed(digits):'Unavailable';
    return value==null || value===''?'Unavailable':String(value);
  }
  function summarize(record,datasets,warnFunction) {
    if(!record)return null;
    const d=record.d||{},v=record.v||{},data=datasets||{};
    const metrics=METRICS.map(item=>({
      ...item,
      value:asText(item.source==='v'?v[item.key]:d[item.key],item.digits)
    }));
    const sol=data.logS,blind=data.logSBlind,neutral=data.logPNeutral;
    const evidence=[];
    if(sol&&Number.isFinite(sol.mae))evidence.push({
      title:'Solubility · original fit data',detail:'n='+sol.n+', MAE '+sol.mae+', RMSE '+asText(sol.rmse,3)+', R² '+asText(sol.r2,3),
      url:typeof sol.source==='string'&&sol.source.startsWith('https://')?sol.source:null,
      caveat:'Development-set error is not independent predictive accuracy.'
    });
    if(blind&&Number.isFinite(blind.mae))evidence.push({
      title:'Solubility · independent set',detail:'n='+blind.n+', MAE '+blind.mae+', RMSE '+asText(blind.rmse,3)+', R² '+asText(blind.r2,3),
      url:typeof blind.source==='string'&&blind.source.startsWith('https://')?blind.source:null,
      caveat:'Aggregate test error, not an uncertainty estimate for this molecule.'
    });
    if(neutral&&Number.isFinite(neutral.mae))evidence.push({
      title:'WLOGP vs neutral-only log D',detail:'n='+neutral.n+', MAE '+neutral.mae+', RMSE '+asText(neutral.rmse,3),
      url:typeof neutral.source==='string'&&neutral.source.startsWith('https://')?neutral.source:null,
      caveat:'Log D at pH 7.4 is not identical to log P for ionizable compounds.'
    });
    const warnings=typeof warnFunction==='function'?warnFunction({...d,logS:v.logS}):[];
    return {name:String(record.name||'Unnamed molecule'),smiles:String(record.smiles||''),formula:asText(d.formula),
      metrics,evidence,warnings:Array.isArray(warnings)?warnings:[],
      limitation:'Descriptors are derived from the input structure; WLOGP and aqueous solubility are estimated. Structural filters and similarity do not demonstrate safety, efficacy, or biological activity.'};
  }
  const api={METRICS,asText,summarize};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.MoleculeReport=api;
})(typeof globalThis!=='undefined'?globalThis:this);
