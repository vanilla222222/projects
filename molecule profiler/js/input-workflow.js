'use strict';
// Input and export helpers only. This module never predicts chemical properties.
(function(root){
  function csvColumns(line, delimiter) {
    const cells=[];let value='',quoted=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch==='"') {
        if(quoted && line[i+1]==='"'){value+='"';i++;}
        else if(!quoted && value.trim()===''){quoted=true;}
        else if(quoted){quoted=false;}
        else {value+=ch;}
      } else if(ch===delimiter && !quoted){cells.push(value.trim());value='';}
      else {value+=ch;}
    }
    cells.push(value.trim());
    if(quoted)throw new Error('Unterminated quoted field');
    return cells;
  }
  function parseSnapshot(text) {
    let snapshot;
    try { snapshot = JSON.parse(String(text).replace(/^\uFEFF/, '')); }
    catch (_) { throw new Error('Invalid JSON. Choose a Molecule Profiler analysis snapshot.'); }
    if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)
        || snapshot.tool !== 'Molecule Profiler') {
      throw new Error('This is not a Molecule Profiler analysis snapshot.');
    }
    if (snapshot.schemaVersion !== 1) {
      throw new Error('Unsupported snapshot schema version. This application supports version 1.');
    }
    if (!Array.isArray(snapshot.molecules)) throw new Error('Snapshot molecules must be an array.');
    const rows = snapshot.molecules.map((entry, index) => {
      const location = 'Snapshot molecule ' + (index + 1);
      const base = {line:index + 1, location, raw:''};
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return {...base,error:'Molecule record must be an object.'};
      }
      if (typeof entry.smiles !== 'string' || !entry.smiles.trim()) {
        return {...base,error:'A nonempty SMILES string is required.'};
      }
      if (entry.name != null && typeof entry.name !== 'string') {
        return {...base,error:'Molecule name must be text when provided.'};
      }
      // Select input fields explicitly. Stored properties, estimates and other
      // object keys never enter the chemistry engine or application state.
      return {...base,name:entry.name || null,smiles:entry.smiles.trim(),raw:entry.smiles};
    });
    return {format:'snapshot',rows,source:{tool:'Molecule Profiler',schemaVersion:1,
      generatedAt:typeof snapshot.generatedAt === 'string' ? snapshot.generatedAt : null}};
  }
  function parseInputText(text) {
    if (String(text || '').trimStart().startsWith('{')) {
      try { return parseSnapshot(text); }
      catch (error) { return {format:'snapshot',rows:[],error:error.message}; }
    }
    const lines=String(text||'').replace(/\r\n?/g,'\n').split('\n');
    const populated=lines.map((text,index)=>({text,index:index+1})).filter(x=>x.text.trim());
    if(!populated.length)return {rows:[],format:'plain'};
    const first=populated[0].text;
    const delimiter=first.includes('\t')?'\t':',';
    let fields;
    try { fields=csvColumns(first,delimiter).map(x=>x.toLowerCase().trim().replace(/^"|"$/g,'')); } catch(_){fields=[];}
    const nameCol=fields.indexOf('name');
    const smilesCol=fields.indexOf('smiles');
    const hasHeader=smilesCol!==-1 && nameCol!==-1 && nameCol!==smilesCol;
    if(!hasHeader) return {format:'plain',rows:populated.map(x=>({line:x.index,raw:x.text}))};
    const rows=populated.slice(1).map(x=>{
      try{
        const cells=csvColumns(x.text,delimiter);
        if(cells.length!==fields.length) return {line:x.index,error:'Expected '+fields.length+' columns, found '+cells.length+'.',raw:x.text};
        const smiles=cells[smilesCol].trim();
        if(!smiles)return {line:x.index,error:'SMILES field is empty.',raw:x.text};
        return {line:x.index,name:cells[nameCol].trim(),smiles,raw:x.text};
      }catch(e){return {line:x.index,error:e.message,raw:x.text};}
    });
    return {format:delimiter==='\t'?'tsv':'csv',rows};
  }
  function summarizeOutcomes(ok,failures,total) {
    const pass=Number(ok)||0, fail=Array.isArray(failures)?failures.length:0;
    return {total:Number(total)||pass+fail,successes:pass,failures:fail,
      status:pass+' analyzed · '+fail+' skipped'+(total>pass+fail?' · '+(total-pass-fail)+' unprocessed':'')};
  }
  function safeCell(value){
    let text=String(value==null?'':value);
    if(/^\s*[=+@-]/.test(text)&&!/^-\d+(?:\.\d+)?$/.test(text.trim())) text="'"+text;
    return '"'+text.replace(/"/g,'""')+'"';
  }
  function createSnapshot(records, meta) {
    return {
      schemaVersion:1,
      tool:'Molecule Profiler',
      generatedAt:(meta&&meta.generatedAt)||new Date().toISOString(),
      declaration:'Computational descriptors and estimates are not laboratory measurements; no safety or efficacy conclusions are established.',
      restoration:'Reopening this snapshot recalculates supplied structures with the current engine; saved properties are not imported as new results.',
      methodology:'Calculated fields are derived from supplied SMILES; estimated fields are model outputs whose applicability may be limited.',
      molecules:(Array.isArray(records)?records:[]).map((record,index)=>({
        index:index+1,name:record.name,smiles:record.smiles,
        formula:record.d.formula,
        descriptors:{
          molecularWeight:record.d.mw,
          exactMass:record.d.exactMass,
          tpsa:record.d.tpsa,
          hbd:record.d.hbd,hba:record.d.hba,
          rotatableBonds:record.d.rotatableBonds,
          rings:record.d.rings,formalCharge:record.d.charge
        },
        estimates:{
          wlogp:record.d.logp,
          aqueousLogS:record.v.logS,
          molarRefractivity:record.d.mr
        }
      }))
    };
  }
  const api={parseInputText,parseSnapshot,csvColumns,summarizeOutcomes,safeCell,createSnapshot};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.InputWorkflow=api;
})(typeof globalThis!=='undefined'?globalThis:this);
