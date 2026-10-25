'use strict';
importScripts('../data/fingerprint-engine.js?v=2026-10-25-review-6');
importScripts(...['smiles.js','mol.js','stereo.js','fingerprints.js'].map(p=>p+'?v='+FINGERPRINT_ENGINE.sha256));
self.onmessage=({data})=>{try{
 if(data.version!==FINGERPRINT_ENGINE.sha256||!FP_METHODS.some(m=>m.key===data.method)||!Array.isArray(data.smiles))throw Error('Fingerprint worker input/version mismatch');
 const rows=[];let failures=0;for(let i=0;i<data.smiles.length;i++){
  try{rows.push([i,fingerprint(buildMolecule(parseSmiles(data.smiles[i])),data.method)]);}catch(_){failures++;}
  if((i+1)%128===0)self.postMessage({progress:i+1,total:data.smiles.length});
 }
 self.postMessage({version:FINGERPRINT_ENGINE.sha256,rows,failures,total:data.smiles.length});
}catch(e){self.postMessage({error:e.message});}};
