'use strict';
// Local candidate summaries. Names are exact library labels or descriptive;
// BBB and metabolic ranking are screens, never measured exposure/abundance.
(function(root){
 const parse=s=>buildMolecule(parseSmiles(s));
 const serialize=m=>writeSmiles({atoms:m.atoms.map(a=>({...a,order:a.order?.slice(),neighbors:[],rings:[]})),bonds:m.bonds.map(b=>({...b}))});
 const exact=(a,b)=>!!root.Pharmacology?.exactGraph(a,b);
 const nameIndices=new WeakMap(),metabolismCache=new Map();
 const SOURCE={title:'Daina and Zoete: A BOILED-Egg to predict absorption and brain penetration',url:'https://doi.org/10.1002/cmdc.201600182'};
 function libraryName(mol,formula,catalog){
  const entries=catalog||(typeof LIBRARY!=='undefined'?(root.CuratedReferences?.library(LIBRARY)||LIBRARY):[]);
  let index=nameIndices.get(entries);if(!index){index=new Map();for(const entry of entries){if(!entry.formula||!entry.smiles)continue;if(!index.has(entry.formula))index.set(entry.formula,[]);index.get(entry.formula).push({entry,mol:null});}nameIndices.set(entries,index);}
  for(const item of index.get(formula)||[]){try{item.mol=item.mol||parse(item.entry.smiles);if(exact(mol,item.mol))return {value:item.entry.name,kind:'Exact-graph reference-library label'};}catch(_){}}
  return null;
 }
 function basic(row,options={}){
  const result={version:1,status:'unavailable',name:{value:row?.name||'Unnamed design',kind:'Descriptive design label; not an IUPAC name'},formula:null,bbb:{available:false,label:'Not assessed',reason:'Structure or descriptor calculation unavailable.'}};
  try{
   const mol=parse(row.smiles),d=describe(mol);
   result.status='calculated';result.formula=d.formula;result.molecularWeight=d.mw;
   result.isotopes=mol.atoms.filter(a=>a.isotope).map(a=>({element:a.element,isotope:a.isotope}));
   result.name=libraryName(mol,d.formula,options.catalog)||{value:(options.parentName?options.parentName+' — ':'')+(row.name||'Unnamed design'),kind:'Descriptive design label; not an IUPAC name'};
   const polar=typeof tpsa==='function'?tpsa(mol,{includeSulfurPhosphorus:true}):d.tpsa;
   const unsupported=mol.atoms.some(a=>!['C','H','N','O','F','P','S','Cl','Br','I'].includes(a.element))||d.crippenTypes?.some(t=>t.type==='ZERO');
   const reason=mol.atoms.some(a=>a.charge)?'Supplied structure is charged; passive BBB screening is not assessed for this charge state.':row.smiles.includes('.')?'Disconnected structures are outside this candidate BBB screen.':unsupported?'Unsupported descriptor chemistry for this BBB screen.':!Number.isFinite(d.logp)||!Number.isFinite(polar)||typeof boiledEgg!=='function'?'BBB model or descriptors unavailable.':null;
   result.bbb={available:!reason,label:reason?'Not assessed':boiledEgg({...d,tpsa:polar}).bbb?'Likely · passive screen':'Unlikely · passive screen',reason,model:'Local BOILED-Egg-style WLOGP / TPSA screen',wlogp:d.logp,tpsa:polar,source:SOURCE,scope:'Not measured brain penetration or a SwissADME result. Efflux, transporters, ionization in vivo, dose and exposure are not predicted.'};
  }catch(_){/* Explicit unavailable fields survive a malformed structure. */}
  return result;
 }
 function metabolites(row,options={}){
  const order=options.order==='mass'?'mass':'priority';
  const summary={version:1,status:'unavailable',rows:[],order,ranking:order==='mass'?'Largest molecular weight among the generated pool':'Highest uncalibrated rule weight among the generated pool',scope:'Rule-generated hypotheses, not measured abundance, dominant human metabolites or validated conversion. Up to two transformation generations; duplicate grouping in the underlying engine is approximate and small coproducts may be omitted.'};
  try{
   if(typeof metabolicTree!=='function'||typeof evaluate!=='function')return {...summary,reason:'Metabolism engine unavailable.'};
   let pool=metabolismCache.get(row.smiles);
   if(!pool){
    const mol=parse(row.smiles),d=describe(mol),tree=metabolicTree({name:row.name,smiles:row.smiles,mol,d,v:evaluate(d)},{depth:2,maxNodes:40,includeToxicity:false});
    pool={candidates:tree.metabolites,parent:mol,truncated:tree.truncated,ruleErrors:tree.diagnostics.ruleErrors.length,generated:tree.metabolites.length};
    if(metabolismCache.size>=32)metabolismCache.delete(metabolismCache.keys().next().value);metabolismCache.set(row.smiles,pool);
   }
   const ordered=pool.candidates.slice().sort((a,b)=>order==='mass'?b.d.mw-a.d.mw||b.score-a.score||a.smiles.localeCompare(b.smiles):b.score-a.score||a.depth-b.depth||a.smiles.localeCompare(b.smiles));
   const rows=[],graphs=[];let excluded=0,examined=0;
   for(const node of ordered){
    if(rows.length===3)break;examined++;
    try{
     const m=parse(node.smiles);
     if(!root.ProdrugCandidates?.validGraph(m)||!exact(m,parse(serialize(m)))||exact(m,pool.parent)||graphs.some(g=>exact(g,m))){excluded++;continue;}
     const descriptor=describe(m);if(!Number.isFinite(node.score)||!Number.isFinite(descriptor.mw)){excluded++;continue;}
     graphs.push(m);rows.push({smiles:node.smiles,formula:descriptor.formula,molecularWeight:descriptor.mw,name:libraryName(m,descriptor.formula,options.catalog)||{value:node.rule+' product',kind:'Transformation description; not an IUPAC name'},transformation:node.rule,enzyme:node.enzyme,phase:node.phase,generation:node.depth,heuristicWeight:node.score});
    }catch(_){excluded++;}
   }
   return {...summary,status:rows.length?'predicted':'no-supported-products',rows,generated:pool.generated,examined,truncated:pool.truncated,ruleErrors:pool.ruleErrors,excluded,maxNodes:40,depth:2,reason:rows.length?null:'No product passed the current rule, valence and identity checks. No metabolites are invented to fill three slots.'};
  }catch(_){return {...summary,reason:'Metabolism calculation unavailable for this structure.'};}
 }
 root.CandidateInfo={basic,metabolites,clearCache:()=>metabolismCache.clear(),source:SOURCE};
})(globalThis);
