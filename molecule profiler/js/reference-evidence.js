'use strict';
// Inspector disclosure only: dossiers already consume curated evidence directly.
(function(root){
 function forEntry(entry,{catalog=root.LibraryCatalog,curated=root.CuratedReferences,data=root.CURATED_REFERENCES}={}){
  const out=(catalog?.receptorEvidence(entry)||[]).slice(),seen=new Set();
  const key=e=>JSON.stringify([e.receptorId,e.provider,e.evidenceKind||'',e.sourceAction||'',e.species,e.assay,e.endpoint,e.sourceUrl]);
  const unique=[];for(const e of out){const k=key(e);if(!seen.has(k)){seen.add(k);unique.push(e);}}
  for(const record of curated?.forEntry(entry,data)||[])for(const [index,e]of record.evidence.entries()){
   const classified=e.kind==='source_classification'&&e.action&&e.receptorId&&e.sourceProvider==='IUPHAR/BPS Guide to PHARMACOLOGY'&&e.sourceRecord;
   const functional=e.kind==='functional_assay'&&e.action&&e.receptorId;
   if((!classified&&!functional)||e.species!=='Homo sapiens'||e.rankEligible===false)continue;
   const row={receptorId:e.receptorId,provider:classified?e.sourceProvider:'Curated primary assay',evidenceKind:e.kind,
    sourceType:classified?'Curated action classification':'Measured functional assay',sourceAction:e.action.replace(/_/g,' '),
    species:e.species,sourceTarget:e.target,assay:e.assay,endpoint:e.endpoint,sourceUrl:e.sourceUrl,
    sourceFile:e.sourceFile,sourceSha256:e.sourceSha256,sourceLocation:e.sourceLocation,recordId:record.id,evidenceIndex:index,
    comment:e.context||record.note,hostSpecies:e.hostSpecies,testedForm:e.testedForm,librarySmiles:entry.smiles};
   const k=key(row);if(!seen.has(k)){seen.add(k);unique.push(row);}
  }
  return unique;
 }
 const api={forEntry};root.ReferenceEvidence=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
