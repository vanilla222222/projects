'use strict';
let runtime, activeId, outputSize=0, queue=Promise.resolve();
function output(stream,text){
 if(outputSize>=100000)return;
 const line=String(text)+'\n';self.postMessage({id:activeId,type:'output',stream,text:line.slice(0,100000-outputSize)});outputSize+=line.length;
 if(outputSize>=100000)self.postMessage({id:activeId,type:'output',stream:'stderr',text:'\n[Output limited to 100,000 characters.]\n'});
}
async function initialize(){
 if(runtime)return runtime;
 const base=new URL('../vendor/python/',self.location.href).href;
 importScripts(base+'pyodide.js');
 runtime=await loadPyodide({indexURL:base,stdout:t=>output('stdout',t),stderr:t=>output('stderr',t)});
 runtime.setStdin({stdin:()=>{throw Error('Interactive input() is unavailable; put values in your script.');}});
 return runtime;
}
async function handle(m){
 activeId=m.id;outputSize=0;
 try{
  const py=await initialize();
  if(m.type==='init'){self.postMessage({id:m.id,type:'done',versions:{pyodide:py.version,python:py.runPython('import sys; sys.version.split()[0]')}});return;}
  if(m.type!=='run'||typeof m.code!=='string'||m.code.length>100000)throw Error('Invalid Python request.');
  py.globals.set('__profiler_context_json',JSON.stringify(m.context));
  py.runPython("import json as __profiler_json\nanalysis = __profiler_json.loads(__profiler_context_json)\nmolecule = analysis['molecule']\ncandidates = analysis['candidates']\nanalogues = analysis.get('analogues', [])\nanalogue_shortlist = analysis.get('analogue_shortlist', [])\nevidence = analysis['evidence']\nquery_smiles = molecule['smiles']\nprofiler_result = None\ndel __profiler_context_json");
  let result;try{result=await py.runPythonAsync(m.code,{filename:'workspace.py'});if(result!==undefined&&result!==null)output('stdout',String(result));}finally{if(result&&typeof result.destroy==='function')result.destroy();}
  const json=py.runPython("__import__('json').dumps(globals().get('profiler_result'), allow_nan=False)");
  if(json.length>2*1024*1024)throw Error('Structured results exceed 2 MB. Return fewer rows or less detail.');
  self.postMessage({id:m.id,type:'done',structured:JSON.parse(json)});
 }catch(e){self.postMessage({id:m.id,type:'error',message:String(e.message||e)});}finally{activeId=null;}
}
self.onmessage=e=>{queue=queue.then(()=>handle(e.data));};
