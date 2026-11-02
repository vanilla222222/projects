// PubChem annotations, fetched only on explicit lookup or an opt-in automatic
// setting. API contract: https://pubchem.ncbi.nlm.nih.gov/pug_view/
const PHYSICAL_PROPERTIES_API='https://pubchem.ncbi.nlm.nih.gov';
function physicalTemperatureParse(text,kind){
 const raw=String(text||'').slice(0,1000),clean=raw.replace(/\u2212/g,'-');
 const match=clean.match(/(-?\d+(?:\.\d+)?)(?:\s*(?:to|–|—|-)\s*(-?\d+(?:\.\d+)?))?\s*(?:°\s*|deg(?:rees)?\.?\s*)?(C|F|K)\b/i);
 if(!match)return {raw,usable:false,reason:'No supported temperature value/unit.'};
 const convert=n=>match[3].toUpperCase()==='K'?n-273.15:match[3].toUpperCase()==='F'?(n-32)*5/9:n;
 const a=convert(Number(match[1])),b=convert(Number(match[2]||match[1])),minC=Math.min(a,b),maxC=Math.max(a,b);
 let reason='';if(/decomp|sublim|hydrate|polymorph|amorph|estim|predic|calculat|comput|\bcalc\b|±|\d[eE][+-]?\d|[<>≤≥]|approx|about|~|ca\./i.test(clean))reason='Qualified/decomposition/form-specific value; not used for automatic phase.';
 if(minC< -273.15||maxC>6000)reason='Temperature outside supported physical-data bounds.';
 const normalPressure=/760\s*(?:mm\s*hg|torr)|101(?:\.3(?:25)?)?\s*kpa|(?:^|\s)1(?:\.0+)?\s*atm\b|normal boiling/i.test(clean);
 if(kind==='boiling'&&!normalPressure)reason='Boiling pressure absent or not explicitly near one atmosphere.';
 return {raw,minC,maxC,usable:!reason,reason,normalPressure};
}
function physicalPropertiesAnnotations(data,kind){
 const record=data?.Record||{},references=new Map((record.Reference||[]).map(r=>[r.ReferenceNumber,r])),rows=[];
 const walk=sections=>(sections||[]).forEach(s=>{if(s.TOCHeading===(kind==='melting'?'Melting Point':'Boiling Point'))(s.Information||[]).forEach(info=>{
  const source=references.get(info.ReferenceNumber)||{},value=info.Value||{};
  const texts=(value.StringWithMarkup||[]).map(x=>x.String);if(Array.isArray(value.Number))value.Number.forEach(n=>texts.push(n+' '+(value.Unit||'')));
  texts.slice(0,30).forEach(text=>{const parsed=physicalTemperatureParse([text,info.Name,info.Description].filter(Boolean).join(' '),kind);rows.push({...parsed,kind,source:String(source.SourceName||'PubChem annotation').slice(0,160),url:/^https?:\/\//.test(source.URL||'')?source.URL:'',citation:(info.Reference||[]).map(String).join('; ').slice(0,600)});});
 });walk(s.Section);});walk(record.Section);return rows.slice(0,60);
}
function physicalPropertiesPhaseFromRecord(record){
 if(record?.status!=='ready')return null;
 const melting=(record.melting||[]).filter(r=>r.usable),boiling=(record.boiling||[]).filter(r=>r.usable),temperature=25;
 let phase=null;
 if(melting.length&&melting.every(r=>temperature<r.minC)&&!boiling.some(r=>temperature>r.maxC))phase='S';
 else if(boiling.length&&boiling.every(r=>temperature>r.maxC)&&(!melting.length||melting.every(r=>temperature>r.maxC)))phase='G';
 else if(melting.length&&boiling.length&&melting.every(r=>temperature>r.maxC)&&boiling.every(r=>temperature<r.minC))phase='L';
 return phase?{phase,solvent:'',automatic:true,basis:'pubchem'}:null;
}
function physicalPropertiesCatalogAllows(smiles,phase){
 const record=physicalPropertiesDefaultClient().get(smiles);if(record?.status!=='ready')return true;
 const mp=(record.melting||[]).filter(r=>r.usable),bp=(record.boiling||[]).filter(r=>r.usable),t=25;
 if([...mp,...bp].some(r=>r.minC<=t&&r.maxC>=t))return false;
 if(phase==='S')return !mp.some(r=>t>r.maxC)&&!bp.some(r=>t>r.maxC);
 if(phase==='L')return !mp.some(r=>t<r.minC)&&!bp.some(r=>t>r.maxC);
 if(phase==='G')return !mp.some(r=>t<r.minC)&&!bp.some(r=>t<r.minC);return true;
}
function physicalPropertiesClient(options){
 const o=options||{},records=new Map(),pending=new Map();let queue=Promise.resolve(),lastRequest=0;
 const sleep=o.pause||((ms)=>new Promise(resolve=>setTimeout(resolve,ms))),now=o.now||Date.now;
 const request=(url,init)=>{
  const task=queue.catch(()=>{}).then(async()=>{const wait=500-(now()-lastRequest);if(wait>0)await sleep(wait);lastRequest=now();
   const controller=typeof AbortController==='function'?new AbortController():null,timer=controller?setTimeout(()=>controller.abort(),15000):null;
   try{const response=await (o.fetcher||fetch)(url,{...init,credentials:'omit',referrerPolicy:'no-referrer',...(controller?{signal:controller.signal}:{})});if(response.status===404)return null;if(!response.ok)throw Error('PubChem returned HTTP '+response.status+'. Try again later.');const text=await response.text();if(text.length>2000000)throw Error('PubChem response exceeds the supported size.');return JSON.parse(text);}finally{if(timer)clearTimeout(timer);}
  });queue=task.then(()=>{},()=>{});return task;
 };
 const key=smiles=>reactionIsomericSmiles(smilesToFragment(smiles),smiles);
 const persist=()=>{if(!o.storage)return;try{let entries=[...records.entries()].filter(([,r])=>r.status==='ready').slice(-40),text=JSON.stringify(entries);while(text.length>200000&&entries.length){entries.shift();text=JSON.stringify(entries);}o.storage.setItem('chem-lab-pubchem-phase-cache',text);}catch(error){}};
 if(o.storage){try{const text=o.storage.getItem('chem-lab-pubchem-phase-cache');if(text&&text.length<=200000){const saved=JSON.parse(text);if(Array.isArray(saved))saved.slice(-40).forEach(([smiles,r])=>{if(r?.status!=='ready'||!Number.isSafeInteger(r.cid)||r.cid<=0||!Array.isArray(r.melting)||!Array.isArray(r.boiling)||r.melting.length>60||r.boiling.length>60)return;const age=Date.now()-Date.parse(r.fetchedAt);if(!Number.isFinite(age)||age< -60000||age>7*86400000||key(smiles)!==smiles||key(r.smiles)!==smiles)return;const rows=(list,kind)=>list.map(row=>({...physicalTemperatureParse(row.raw,kind),kind,source:String(row.source||'PubChem annotation').slice(0,160),url:/^https?:\/\//.test(row.url||'')?String(row.url).slice(0,2000):'',citation:String(row.citation||'').slice(0,600)}));records.set(smiles,{status:'ready',cid:r.cid,smiles,fetchedAt:r.fetchedAt,url:PHYSICAL_PROPERTIES_API+'/compound/'+r.cid,melting:rows(r.melting,'melting'),boiling:rows(r.boiling,'boiling')});});}}catch(error){}}

 return {get(smiles){try{return records.get(key(smiles))||null;}catch(error){return null;}},async lookup(smiles,force=false){
  const id=key(smiles);if(pending.has(id))return pending.get(id);if(!force&&records.has(id)&&records.get(id).status!=='loading')return records.get(id);
  const previous=records.get(id);records.set(id,{status:'loading'});
  const task=(async()=>{try{
   const identity=await request(PHYSICAL_PROPERTIES_API+'/rest/pug/compound/smiles/property/IsomericSMILES/JSON',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'smiles='+encodeURIComponent(id)});
   const matches=identity?.PropertyTable?.Properties;if(!Array.isArray(matches)||matches.length!==1)throw Error('PubChem did not return one unambiguous compound.');
   const hit=matches[0],returned=hit.SMILES||hit.IsomericSMILES;
   if(!Number.isSafeInteger(hit.CID)||hit.CID<=0||!returned||!moleculeSame(id,returned))throw Error('PubChem structure differs from this exact structure/isotope/stereochemistry; no phase applied.');
   const base=PHYSICAL_PROPERTIES_API+'/rest/pug_view/data/compound/'+hit.CID+'/JSON?heading=';
   const [mp,bp]=await Promise.all([request(base+'Melting+Point'),request(base+'Boiling+Point')]);
   [mp,bp].filter(Boolean).forEach(data=>{if(data.Record?.RecordNumber!==hit.CID)throw Error('PubChem annotation identity mismatch.');});
   const record={status:'ready',cid:hit.CID,smiles:id,melting:physicalPropertiesAnnotations(mp,'melting'),boiling:physicalPropertiesAnnotations(bp,'boiling'),fetchedAt:new Date().toISOString(),url:PHYSICAL_PROPERTIES_API+'/compound/'+hit.CID};records.set(id,record);persist();return record;
  }catch(error){const record={status:'error',message:error.name==='AbortError'?'PubChem lookup timed out.':String(error.message||error).slice(0,300)};if(previous?.status==='ready'){const retained={...previous,refreshError:record.message};records.set(id,retained);return retained;}records.set(id,record);return record;}finally{pending.delete(id);}})();pending.set(id,task);return task;
 }};
}
function physicalPropertiesDefaultClient(){if(!physicalPropertiesDefaultClient.value){let storage=null;try{storage=localStorage;}catch(error){}physicalPropertiesDefaultClient.value=physicalPropertiesClient({storage});}return physicalPropertiesDefaultClient.value;}
function physicalPropertiesCachedPhase(smiles){return physicalPropertiesPhaseFromRecord(physicalPropertiesDefaultClient().get(smiles));}
function physicalPropertiesAutoEnabled(value){
 if(typeof value==='boolean'){physicalPropertiesAutoEnabled.value=value;try{localStorage.setItem('chem-lab-pubchem-phase-auto',JSON.stringify(value));}catch(error){}}
 if(typeof physicalPropertiesAutoEnabled.value!=='boolean'){try{physicalPropertiesAutoEnabled.value=localStorage.getItem('chem-lab-pubchem-phase-auto')==='true';}catch(error){physicalPropertiesAutoEnabled.value=false;}}return physicalPropertiesAutoEnabled.value;
}
function physicalPropertiesAutoControl(onChange){
 const box=document.createElement('label'),input=document.createElement('input'),label=document.createElement('span');box.className='rx-purification-toggle';input.type='checkbox';input.checked=physicalPropertiesAutoEnabled();label.textContent='Auto-fetch PubChem MP/BP (sends structures; up to 20 per session)';input.addEventListener('change',()=>{physicalPropertiesAutoEnabled(input.checked);onChange();});box.append(input,label);return box;
}
function physicalPropertiesElement(smiles,onUpdate){
 const box=document.createElement('details'),title=document.createElement('summary'),body=document.createElement('div'),button=document.createElement('button'),status=document.createElement('p'),values=document.createElement('div'),client=physicalPropertiesDefaultClient();box.className='physical-properties';button.type='button';button.textContent='Look up PubChem melting / boiling points';box.append(title,body);body.append(button,status,values);
 const render=()=>{values.replaceChildren();const record=client.get(smiles);title.textContent='Melting / boiling point data';button.disabled=record?.status==='loading';
  if(!record){status.textContent='Not fetched. Lookup sends this structure to PubChem.';return;}if(record.status==='loading'){status.textContent='Fetching PubChem annotations…';return;}if(record.status==='error'){status.textContent=record.message;return;}
  status.textContent=(record.refreshError?'Refresh failed; retained last fetched data. ':'')+'CID '+record.cid+' · fetched '+record.fetchedAt.slice(0,10)+'. Phase inference is for 25 °C / near 1 atm; no pressure/solubility model.';button.textContent='Refresh PubChem data';
  const all=[...record.melting,...record.boiling];if(!all.length)values.textContent='No melting/boiling annotations were found.';
  all.slice(0,20).forEach(row=>{const line=document.createElement('p'),link=document.createElement('a');line.textContent=(row.kind==='melting'?'MP: ':'BP: ')+row.raw+' · '+row.source+(row.usable?'':' · not used for phase: '+row.reason)+' ';link.href=row.url||record.url;link.textContent='Source';link.target='_blank';link.rel='noopener noreferrer';line.append(link);values.append(line);});
 };
 const lookup=async(force)=>{button.disabled=true;const task=client.lookup(smiles,force);render();await task;render();onUpdate?.();};button.addEventListener('click',()=>lookup(true));render();
 const record=client.get(smiles);if(record?.status==='loading')lookup(false);else if(!record&&physicalPropertiesAutoEnabled()){const seen=physicalPropertiesAutoEnabled.seen||(physicalPropertiesAutoEnabled.seen=new Set()),key=reactionIsomericSmiles(smilesToFragment(smiles),smiles);if(seen.has(key)||seen.size<20){seen.add(key);lookup(false);}}
 return box;
}
