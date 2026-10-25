'use strict';
(function(root){
 const finite=v=>typeof v==='number'&&Number.isFinite(v);
 function endpoint(o){if(o.metric)return o.metric;const found=[...new Set((o.endpoint||'').match(/\b(?:EC50|IC50|Ki|Kd)\b/g)||[])];return found.length===1?found[0]:'';}
 function create(model){
  function groups(family,core){const query=root.ReferenceStructure.prepare(core,{mode:'substructure',stereo:false}).mol,members=model.members(family),result=[],mapped=new Map();let unresolved=0;
   for(const g of model.comparison(members.map(e=>e.name)).groups){if(g.incomplete||!['functional_assay','control_comparison'].includes(g.kind))continue;const rows=[],seen=new Set();
    for(const {name,observation:original}of g.observations){const metric=endpoint(original),o={...original,metric};if(!['EC50','IC50','Ki','Kd'].includes(metric)||!finite(o.value)||o.value<=0||(o.relation||'=')!=='='||!['nM','µM','uM','M'].includes(o.unit)||model.dossier(name).identityWarnings.length||seen.has(o.id))continue;
     if(!mapped.has(name)){const mol=root.ReferenceStructure.parse(model.byName.get(name).smiles),match=root.ReferenceStructure.mapping(query,mol);mapped.set(name,{mol,match});if(match.status==='unresolved')unresolved++;}const {mol,match}=mapped.get(name);if(match.status!=='match')continue;seen.add(o.id);rows.push({name,label:model.dossier(name).label,mol,mapping:match.mapping,observation:o});
    }
    if(rows.length)result.push({...g,metric:rows[0].observation.metric,rows});
   }
   return {query,family,groups:result,unresolved,observations:result.reduce((n,g)=>n+g.rows.length,0),scope:'Exact positive numeric measurements only, grouped by reported assay context and source. No cross-study pooling or structure-to-activity prediction.'};
  }
  return {groups};
 }
 function fitCoordinates(reference,target,mapping){const a=mapping.reduce((s,_,i)=>({x:s.x+reference[i].x/mapping.length,y:s.y+reference[i].y/mapping.length}),{x:0,y:0}),b=mapping.reduce((s,j)=>({x:s.x+target[j].x/mapping.length,y:s.y+target[j].y/mapping.length}),{x:0,y:0});let dot=0,cross=0;
  mapping.forEach((j,i)=>{const x=target[j].x-b.x,y=target[j].y-b.y,u=reference[i].x-a.x,v=reference[i].y-a.y;dot+=x*u+y*v;cross+=x*v-y*u;});const angle=Math.atan2(cross,dot),c=Math.cos(angle),s=Math.sin(angle);return target.map(p=>({x:a.x+(p.x-b.x)*c-(p.y-b.y)*s,y:a.y+(p.x-b.x)*s+(p.y-b.y)*c}));
 }
 const api={create,endpoint,fitCoordinates};root.ReferenceSAR=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
