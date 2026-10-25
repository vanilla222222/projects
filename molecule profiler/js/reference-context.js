'use strict';
(function(root){
 // Non-security change detector; SHA-256 source witnesses are recorded by the builder.
 function manifest(library,targets){let a=0x811c9dc5,b=0x9e3779b9;const add=value=>{const s=JSON.stringify(value);for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),0x01000193);b=Math.imul(b^s.charCodeAt(i),0x85ebca6b);}};
  add('composed-reference-v1');for(const e of library)add([e.name,e.smiles,e.propertyOnly===true]);for(const t of targets)add([t.gene,t.name,t.family,t.organism,t.ligands,t.lookupOnly===true]);
  return {version:'composed-reference-v1',key:(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0'),library:library.length,targets:targets.length,ligandSlots:targets.reduce((n,t)=>n+t.ligands.length,0)};
 }
 function create(library,targets,curated,data){const entries=curated?curated.library(library,data):library,panels=curated?curated.targets(targets,data):targets;return {library:entries,targets:panels,manifest:manifest(entries,panels)};}
 const api={create,manifest};root.ReferenceContext=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
