'use strict';
(function(root){
 const workerURL=new URL('python-worker.js?v=2026-10-24-python',document.currentScript?.src||new URL('js/python-kernel.js',document.baseURI).href);
 function create(onOutput=()=>{}){
  let worker=null,pending=null,sequence=0,ready=false,versions=null;
  function stop(reason='Python stopped. Variables cleared; code retained.'){
   worker?.terminate();worker=null;ready=false;versions=null;
   if(pending){clearTimeout(pending.timer);pending.reject(Error(reason));pending=null;}
  }
  function request(type,data={}){
   if(pending)return Promise.reject(Error('Python is busy. Stop it before starting another task.'));
   if(!worker){
    try{worker=new Worker(workerURL);}catch(e){return Promise.reject(e);}
    worker.onmessage=e=>{const m=e.data;if(!pending||m.id!==pending.id)return;if(m.type==='output'){onOutput(m.stream,m.text);return;}const job=pending;pending=null;clearTimeout(job.timer);if(m.type==='error')job.reject(Error(m.message));else job.resolve(m);};
    worker.onerror=e=>{e.preventDefault?.();stop(e.message||'Python worker failed to load.');};
    worker.onmessageerror=()=>stop('Python returned an unreadable message.');
   }
   return new Promise((resolve,reject)=>{const id=++sequence;pending={id,resolve,reject,timer:setTimeout(()=>stop('Python timed out after two minutes. Run again for a fresh interpreter.'),120000)};try{worker.postMessage({id,type,...data});}catch(e){stop(e.message);}});
  }
  async function initialize(){if(!ready){const r=await request('init');versions=r.versions;ready=true;}return versions;}
  return {initialize,async run(code,context){await initialize();await request('run',{code,context});return versions;},stop,get ready(){return ready;}};
 }
 root.BrowserPython={create};
})(globalThis);
