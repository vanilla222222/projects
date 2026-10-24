'use strict';
(function(root){
 const FORMAT='molecule-profiler-notebook-v1',MAX=25*1024*1024,MAX_SNAPSHOT=5*1024*1024;
 const clone=x=>JSON.parse(JSON.stringify(x)),id=()=>root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 function size(x){return new TextEncoder().encode(JSON.stringify(x)).length;}
 function capture(input,snapshot,settings={}){
  if(!input||typeof input.smiles!=='string'||!input.smiles||input.smiles.length>4000||!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw Error('An analyzed structure and snapshot are required.');
  const title=String(settings.title||input.name||'Research project').trim(),notes=String(settings.notes||'');if(!title||title.length>160||notes.length>20000)throw Error('Title limit: 160 characters; notes limit: 20,000.');
  const selected=Array.isArray(settings.selected)?settings.selected:[];if(selected.length>25||selected.some(s=>typeof s.smiles!=='string'||s.smiles.length>4000))throw Error('Select at most 25 bounded design structures.');
  const revision={createdAt:new Date().toISOString(),title,notes,input:{name:String(input.name||'Input').slice(0,160),smiles:input.smiles},selectedDesigns:selected.map(s=>({id:String(s.id||'').slice(0,160),name:String(s.name||'Design').slice(0,300),smiles:s.smiles})),versions:clone(settings.versions||{}),snapshot:clone(snapshot)};
  if(size(revision)>MAX_SNAPSHOT)throw Error('Revision exceeds 5 MB. Export the full analysis separately or reduce its stored detail.');return revision;
 }
 function validate(project){
  if(!project||project.format!==FORMAT||!Array.isArray(project.revisions)||!project.revisions.length||project.revisions.length>10||size(project)>MAX)throw Error('Use a valid notebook backup: at most 10 revisions / 25 MB.');
  const revisions=project.revisions.map(r=>{if(!r||typeof r.createdAt!=='string'||!Number.isFinite(Date.parse(r.createdAt)))throw Error('Invalid revision timestamp.');return {...capture(r.input,r.snapshot,{title:r.title,notes:r.notes,selected:r.selectedDesigns,versions:r.versions}),createdAt:r.createdAt};});
  return {format:FORMAT,id:typeof project.id==='string'?project.id.slice(0,100):id(),createdAt:revisions[0].createdAt,updatedAt:revisions.at(-1).createdAt,archived:!!project.archived,revisions};
 }
 let dbPromise=null;
 function open(){if(!root.indexedDB)return Promise.reject(Error('Browser storage is unavailable. Use JSON export/import backups.'));if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const request=root.indexedDB.open('molecule-profiler-notebooks',1);request.onupgradeneeded=()=>request.result.createObjectStore('projects',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>{dbPromise=null;reject(request.error||Error('Could not open notebook storage.'));};request.onblocked=()=>{dbPromise=null;reject(Error('Close other app tabs to complete the storage upgrade.'));};});return dbPromise;}
 async function list(){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readonly'),r=tx.objectStore('projects').getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));r.onerror=()=>reject(r.error);});}
 async function save(revision,projectId=null){const safe=validate({format:FORMAT,revisions:[revision]}).revisions[0],db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects'),key=projectId||id(),request=store.get(key);let result,error;
  request.onsuccess=()=>{try{const prior=request.result;if(projectId&&!prior)throw Error('The selected project no longer exists. Save as a new project.');if(prior?.revisions.length>=10)throw Error('Ten revisions are retained. Export this project and save a new project to continue; no history was deleted.');result=validate(prior?{...prior,revisions:prior.revisions.concat(safe)}:{format:FORMAT,id:key,revisions:[safe]});store.put(result);}catch(e){error=e;tx.abort();}};
  tx.oncomplete=()=>resolve(result);tx.onerror=tx.onabort=()=>reject(error||tx.error||Error('Storage quota or transaction error. Previous saved revisions were retained.'));
 });}
 async function importProject(text){if(typeof text!=='string'||text.length>MAX)throw Error('Notebook import limit is 25 MB.');const project=validate(JSON.parse(text));project.importedFrom=project.id;project.id=id();project.archived=false;const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').add(project);tx.oncomplete=()=>resolve(project);tx.onerror=tx.onabort=()=>reject(tx.error||Error('Import failed; no existing project was replaced.'));});}
 async function archive(projectId,archived=true){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite'),store=tx.objectStore('projects'),r=store.get(projectId);r.onsuccess=()=>{if(r.result)store.put({...r.result,archived:!!archived});};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error);});}
 const api={FORMAT,capture,validate,list,save,importProject,archive,exportProject:p=>JSON.stringify(validate(p),null,2),close:async()=>{if(dbPromise)(await dbPromise).close();dbPromise=null;}};root.ProjectNotebooks=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
