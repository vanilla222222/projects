'use strict';
// Sorting and paging operate on existing calculated batch rows; no chemical predictions.
(function(root) {
  const NUMERIC = new Set(['mw','logp','tpsa','logS','hbd','hba','rotatableBonds','rings','fractionCsp3','abs']);
  const COLUMNS = new Set(['name','formula',...NUMERIC]);
  const COLLATOR = new Intl.Collator('en', {numeric:true,sensitivity:'base'});
  function browseBatch(records, options) {
    const rows = Array.isArray(records) ? records : [];
    const o = options || {};
    const filter = String(o.filter || '').trim().toLowerCase();
    const sort = COLUMNS.has(o.sort) ? o.sort : 'name';
    const desc = o.desc === true;
    const perPage = Number.isInteger(o.perPage) && o.perPage > 0 ? o.perPage : 50;
     const matches = rows.map((record,index)=>({record,index})).filter(({record})=>
      !filter || [record.name,record.smiles,record.row && record.row.formula].some(v=>String(v == null?'':v).toLowerCase().includes(filter))
    );
    matches.sort((a,b)=>{
      const value = r=>sort==='name'?r.record.name:(r.record.row||{})[sort];
      const x=value(a),y=value(b);
      const bad=v=>v==null || (typeof v==='number' && !Number.isFinite(v));
      if (bad(x)||bad(y)) return bad(x)===bad(y)?a.index-b.index:bad(x)?1:-1;
      const d=NUMERIC.has(sort)?Number(x)-Number(y):COLLATOR.compare(String(x),String(y));
      return (desc?-d:d)||a.index-b.index;
    });
    const pages=Math.max(1,Math.ceil(matches.length/perPage));
    const wanted=Number(o.page);
    const page=Number.isFinite(wanted)?Math.min(pages,Math.max(1,Math.floor(wanted))):1;
    const offset=(page-1)*perPage, visible=matches.slice(offset,offset+perPage);
    return {visible,total:matches.length,overall:rows.length,page,pages,from:matches.length?offset+1:0,to:matches.length?offset+visible.length:0};
  }
  const api={browseBatch,NUMERIC,COLUMNS};
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  root.BatchBrowser=api;
})(typeof globalThis!=='undefined'?globalThis:this);
