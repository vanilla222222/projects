'use strict';
// Transparent physicochemical data only; no pharmacological rankings or synthesis routes.
(function(root){
 const VERSION='1.1';
 const METRICS=[
  ['formula','text','','calculated','Parsed structure'],
  ['mw','number','g/mol','calculated','Atomic-mass sum'],
  ['exactMass','number','Da','calculated','Monoisotopic mass'],
  ['heavyAtoms','integer','count','calculated','Non-hydrogen atom count'],
  ['charge','integer','e','calculated','Molecular formal charge'],
  ['tpsa','number','Å²','calculated','Topological fragment method'],
  ['hbdStrict','integer','count','calculated','Hydrogen-bond donor count'],
  ['hbaStrict','integer','count','calculated','Hydrogen-bond acceptor count'],
  ['rotatableBonds','integer','count','calculated','Graph perception'],
  ['rings','integer','count','calculated','Ring perception'],
  ['fractionCsp3','number','unitless','calculated','Fraction sp3 carbon'],
  ['logp','number','log10','estimated','Wildman–Crippen'],
  ['mr','number','cm³/mol','estimated','Atom contributions'],
  ['logS','number','log10(mol/L)','estimated','ESOL regression']
 ];
 const HEAD={
  molecules:['molecule_id','name','input_smiles','formula','status'],
  descriptors:['molecule_id','descriptor','value','unit','value_type','evidence_type','method'],
  validation:['dataset_key','dataset_name','sample_size','mae','rmse','r2','source_url','limitations'],
  quality:['molecule_id','issue','severity','details'],
  data_dictionary:['file','column','meaning']
 };
 const MEANING={molecule_id:'Unique within this package, not an external identifier',name:'User-supplied or generated label',
  input_smiles:'Input SMILES, not canonicalized',formula:'Graph-derived molecular formula',status:'Input processing status',
  descriptor:'Descriptor code',value:'Numeric or text output, blank when missing',unit:'Unit where specified',
  value_type:'Declared type',evidence_type:'Calculated or estimated',method:'Algorithm family',
  dataset_key:'Validation dataset identifier',dataset_name:'Validation set description',
  sample_size:'Number of validation records',mae:'Mean absolute error',rmse:'Root mean square error',
  r2:'Coefficient of determination',source_url:'Source supplied by dataset metadata',
  limitations:'Interpretation caveats',issue:'Quality warning category',severity:'Severity label',
  details:'Details of warning',file:'Table containing the field',column:'Column identifier',meaning:'Field definition'};
 function cell(x){let s=String(x==null?'':x);if(/^\s*[=+@-]/.test(s)&&!/^\s*-\d+(?:\.\d+)?(?:e[+-]?\d+)?\s*$/i.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
 function csv(keys,rows){return '\uFEFF'+[keys,...rows].map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';}
 function finite(x){return typeof x==='number'&&Number.isFinite(x)?x:'';}
 function createPackage(records,datasets,issues,settings){
  const source=Array.isArray(records)?records:[],validation=datasets||{},bad=Array.isArray(issues)?issues:[],meta=settings||{};
  const molecules=[],descriptors=[],quality=[],seen=new Map();
  const counts={exact_duplicate:0,missing_descriptor:0,input_error:0},missingByDescriptor={};
  source.forEach((r,i)=>{
   const id='mol-'+String(i+1).padStart(4,'0'),smiles=String(r.smiles||''),d=r.d||{},v=r.v||{};
   molecules.push([id,r.name||'Molecule '+(i+1),smiles,d.formula||'','analyzed']);
   if(seen.has(smiles)){quality.push([id,'exact_duplicate','info','Same text SMILES as '+seen.get(smiles)]);counts.exact_duplicate++;}else seen.set(smiles,id);
   for(const [key,type,unit,evidence,method] of METRICS){
    const raw=key==='logS'?v.logS:d[key];
    const val=type==='text'?String(raw==null?'':raw):finite(raw);
    descriptors.push([id,key,val,unit,type,evidence,method]);
    if(val===''){quality.push([id,'missing_descriptor','warning',key+' is unavailable']);counts.missing_descriptor++;missingByDescriptor[key]=(missingByDescriptor[key]||0)+1;}
   }
  });
  for(const issue of bad){quality.push(['','input_error','warning','Line '+(issue.line||'?')+': '+String(issue.reason||'Invalid input')]);counts.input_error++;}
  const validationRows=Object.entries(validation).map(([key,set])=>[key,set.label||key,finite(set.n),finite(set.mae),
   finite(set.rmse),finite(set.r2),/^https:\/\//.test(set.source||'')?set.source:'',
   set.note||'Dataset-level error is not per-molecule uncertainty']);
  const dictionary=Object.entries(HEAD).flatMap(([file,columns])=>columns.map(col=>[file+'.csv',col,MEANING[col]||'See application methods']));
  const contents={
   'molecules.csv':csv(HEAD.molecules,molecules),
   'descriptors.csv':csv(HEAD.descriptors,descriptors),
   'validation.csv':csv(HEAD.validation,validationRows),
   'quality.csv':csv(HEAD.quality,quality),
   'data_dictionary.csv':csv(HEAD.data_dictionary,dictionary)
  };
  const files=Object.entries(contents).map(([name,content])=>({name,content}));
  const manifest={schemaVersion:VERSION,application:'Molecule Profiler',
   createdAt:meta.createdAt||new Date().toISOString(),applicationRevision:meta.revision||null,
   applicationAssetToken:meta.assetToken||null,
   analysisSettings:meta.analysisSettings||{},moleculeCount:source.length,inputErrorCount:bad.length,
   files:files.map(f=>({name:f.name,bytes:ResearchZip.utf8(f.content).length,
    crc32:ResearchZip.crc32(ResearchZip.utf8(f.content)).toString(16).padStart(8,'0')})),
   integrityAlgorithm:'CRC-32 (accidental corruption check, not a cryptographic authenticity guarantee)',
   referenceLibraryCount:meta.referenceLibraryCount==null?null:meta.referenceLibraryCount,
   qualitySummary:{counts,missingByDescriptor},
   qualityScope:'Duplicates use exact input SMILES text, not molecular canonicalization.',
   caveats:['Calculated and estimated properties are not measurements.',
    'Labels and input structures have not undergone independent identity verification.',
    'Validation statistics are aggregate dataset metrics, not individual uncertainties.',
    'Biological-activity and target rankings are intentionally not included.']};
  files.push({name:'manifest.json',content:JSON.stringify(manifest,null,2)+'\n'});
  files.push({name:'README.txt',content:'MOLECULE PROFILER RESEARCH EXPORT\n'
   +'Read manifest.json and data_dictionary.csv first.\n'
   +'Join molecules.csv and descriptors.csv by molecule_id.\n'
   +'CSV is UTF-8 with BOM and CRLF line endings; missing numeric values are blank.\n'
   +'These outputs are computational, not laboratory measurements.\n'});
  return {files,manifest};
 }
 const api={VERSION,METRICS,HEAD,cell,csv,createPackage};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.ResearchPackage=api;
})(typeof globalThis!=='undefined'?globalThis:this);
