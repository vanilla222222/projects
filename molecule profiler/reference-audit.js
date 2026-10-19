'use strict';
// Pure, dependency-free diagnostics. Exact-SMILES duplicates are not canonical duplicates.
// Does not claim chemical validity or experimental verification.
(function(root){
 function auditLibrary(library,targets,profiles){
  const rows=Array.isArray(library)?library:[],ts=Array.isArray(targets)?targets:[],ps=Array.isArray(profiles)?profiles:[];
  const duplicate=(key,normalize)=>{
   const seen=new Map(),found=[];
   rows.forEach((r,i)=>{const raw=String(r[key]||'').trim();if(!raw)return;const k=normalize?raw.toLowerCase():raw;if(seen.has(k))found.push({value:raw,first:seen.get(k),next:i});else seen.set(k,i)});
   return found;
  };
  const names=new Set(rows.map(r=>String(r.name||'').trim().toLowerCase()));
  const targetRows=ts.map(t=>({gene:String(t.gene||'n/a'),name:String(t.name||''),family:String(t.family||'Unknown'),ligands:(Array.isArray(t.ligands)?t.ligands:[]).length,missingLigands:(Array.isArray(t.ligands)?t.ligands:[]).filter(n=>!names.has(String(n).toLowerCase()))}));
  const classCounts={};rows.forEach(r=>{const k=String(r.cls||'Unclassified');classCounts[k]=(classCounts[k]||0)+1});
  const sortedClasses=Object.entries(classCounts).map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name));
  const missingFormula=rows.filter(r=>!String(r.formula||'').trim()).length;
  const missingSmiles=rows.filter(r=>!String(r.smiles||'').trim()).length;
  const missingName=rows.filter(r=>!String(r.name||'').trim()).length;
  const duplicateNames=duplicate('name',true),duplicateSmiles=duplicate('smiles',false);
  const missingProfiles=ps.filter(p=>!names.has(String(p.name||'').toLowerCase())).map(p=>p.name);
  const emptyTargets=targetRows.filter(t=>t.ligands===0).length;
  const sparseTargets=targetRows.filter(t=>t.ligands<3).length;
  const orphanedLigands=targetRows.flatMap(t=>t.missingLigands.map(name=>({gene:t.gene,name})));
  return {entries:rows.length,missingFormula,missingSmiles,missingName,duplicateNames,duplicateSmiles,classes:sortedClasses,profiles:ps.length,missingProfiles,targets:targetRows.length,emptyTargets,sparseTargets,orphanedLigands,targetRows};
 }
 const api={auditLibrary};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.ReferenceAudit=api;
})(typeof globalThis!=='undefined'?globalThis:this);
