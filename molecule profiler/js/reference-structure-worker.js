'use strict';
importScripts(...['smiles.js','mol.js','stereo.js','fingerprints.js','pharmacology.js','reference-structure.js','../data/library.js','../data/curated-references.js','curated-references.js'].map(p=>p+'?v=2026-10-25-discovery-6'));
self.onmessage=async({data})=>{try{const result=await ReferenceStructure.search(CuratedReferences.library(LIBRARY),data.smiles,data.options,{progress:p=>self.postMessage({id:data.id,progress:p})});self.postMessage({id:data.id,result});}catch(e){self.postMessage({id:data.id,error:e.message});}};
