'use strict';
(function(root){
 const parse=s=>buildMolecule(parseSmiles(s));
 const bondLabel=b=>b.aromatic?1.5:b.order;
 const stereoCache=new WeakMap();
 function stereoLabels(mol){if(stereoCache.has(mol))return stereoCache.get(mol);const s=stereoAnalyse(mol),result={unresolved:!!s.undetermined,atoms:new Map(s.centers.filter(c=>c.stereogenic).map(c=>[c.atom,c.specified?c.label:'?'])),bonds:new Map(s.bonds.filter(c=>c.stereogenic).map(c=>[[c.a,c.b].sort((a,b)=>a-b).join('/'),c.specified?c.label:'?']))};stereoCache.set(mol,result);return result;}
 function mapping(query,target,{exact=false,stereo=false,budget=30000}={}){
  if(query.atoms.length>target.atoms.length||(exact&&(query.atoms.length!==target.atoms.length||query.bonds.length!==target.bonds.length)))return {status:'no-match'};
  const edges=m=>{const out=new Map();for(const b of m.bonds)out.set([b.a,b.b].sort((a,b)=>a-b).join('/'),bondLabel(b));return out;},qe=edges(query),te=edges(target);
  const fit=(a,b)=>a.element===b.element&&!!a.aromatic===!!b.aromatic&&(a.charge||0)===(b.charge||0)&&(exact?(a.isotope||0)===(b.isotope||0)&&a.totalH===b.totalH&&a.degree===b.degree:(!a.isotope||a.isotope===b.isotope)&&a.degree<=b.degree&&(!a.bracket||!a.explicitH||a.totalH===b.totalH));
  const choices=query.atoms.map(a=>target.atoms.flatMap((b,i)=>fit(a,b)?[i]:[]));if(choices.some(c=>!c.length))return {status:'no-match'};
  if(exact&&stereo){const a=stereoLabels(query),b=stereoLabels(target);if(a.unresolved||b.unresolved)return {status:'unresolved'};for(let i=0;i<choices.length;i++)choices[i]=choices[i].filter(j=>(a.atoms.get(i)||'')===(b.atoms.get(j)||''));if(choices.some(c=>!c.length))return {status:'no-match'};for(const [key,value]of qe)qe.set(key,value+'|'+(a.bonds.get(key)||''));for(const [key,value]of te)te.set(key,value+'|'+(b.bonds.get(key)||''));}
  const order=query.atoms.map((_,i)=>i).sort((a,b)=>choices[a].length-choices[b].length||query.atoms[b].degree-query.atoms[a].degree),map=new Array(query.atoms.length).fill(-1),used=new Set();let steps=0,exhausted=false;
  function visit(depth){if(++steps>budget){exhausted=true;return false;}if(depth===order.length)return true;const a=order[depth];for(const b of choices[a]){if(used.has(b))continue;let good=true;for(let x=0;x<map.length;x++){if(map[x]<0)continue;const q=qe.get([a,x].sort((a,b)=>a-b).join('/')),t=te.get([b,map[x]].sort((a,b)=>a-b).join('/'));if((q!==undefined&&q!==t)||(exact&&q!==t)){good=false;break;}}if(!good)continue;map[a]=b;used.add(b);if(visit(depth+1))return true;map[a]=-1;used.delete(b);if(exhausted)return false;}return false;}
  return visit(0)?{status:'match',mapping:map.slice()}:{status:exhausted?'unresolved':'no-match'};
 }
 function prepare(smiles,{mode='identity',stereo=true,threshold=0.5}={}){
  if(!['identity','substructure','similarity'].includes(mode))throw Error('Choose identity, substructure or similarity search.');
  if(typeof smiles!=='string'||!smiles.trim()||smiles.length>2000)throw Error('Enter a SMILES structure (up to 2,000 characters).');
  const mol=parse(smiles.trim());if(mol.atoms.some(a=>a.element==='*'))throw Error('Use a concrete SMILES query; wildcard/SMARTS queries are not supported.');if(!mol.atoms.length||mol.atoms.length>80)throw Error('Search queries support 1–80 explicit atoms.');
  if(mode==='substructure'&&stereo)throw Error('Substructure search is topological. Choose ignore stereochemistry; explicit charge and isotope constraints are retained.');
  if(mode==='identity'&&stereo&&stereoAnalyse(mol).undetermined)throw Error('The query contains stereochemistry the current parser cannot resolve.');
  if(!Number.isFinite(Number(threshold))||threshold<0||threshold>1)throw Error('Similarity threshold must be between zero and one.');
  return {mol,mode,stereo,threshold:Number(threshold),fp:mode==='similarity'?fingerprint(mol,stereo?'ecfp4s':'ecfp4'):null};
 }
 function match(prepared,smiles,{budget=30000}={}){
  let mol;try{mol=parse(smiles);}catch(_){return {status:'unresolved'};}
  if(prepared.mode==='similarity'){const score=tanimoto(prepared.fp,fingerprint(mol,prepared.stereo?'ecfp4s':'ecfp4'));return {status:score>=prepared.threshold?'match':'no-match',score};}
  const result=mapping(prepared.mol,mol,{exact:prepared.mode==='identity',stereo:prepared.mode==='identity'&&prepared.stereo,budget});
  return result;
 }
 async function search(entries,smiles,options={},hooks={}){
  const prepared=prepare(smiles,options),hits=[];let unresolved=0,total=0,scanned=0;
  for(let i=0;i<entries.length;i++){
   if(hooks.cancelled?.())return {cancelled:true,hits:[],scanned,total,unresolved};const e=entries[i],r=match(prepared,e.smiles,options);scanned++;
   if(r.status==='unresolved')unresolved++;if(r.status==='match'){total++;hits.push({name:e.name,smiles:e.smiles,mapping:r.mapping,score:r.score});hits.sort((a,b)=>(b.score||0)-(a.score||0)||a.name.localeCompare(b.name));if(hits.length>100)hits.pop();}
   if(i%100===99){hooks.progress?.({scanned,total,unresolved});await new Promise(r=>setTimeout(r,0));}
  }
  return {hits,scanned,total,unresolved,mode:prepared.mode,stereo:prepared.stereo};
 }
 // A small connectivity sketcher serializes its spanning forest and ring closures.
 // It does not assign stereochemistry, isotopes or charges.
 function sketchSmiles(atoms,bonds){
  if(!atoms.length)throw Error('Add an atom to the sketch.');if(atoms.length>80)throw Error('Sketch supports up to 80 atoms.');
  const adjacent=atoms.map(()=>[]),tree=new Set(),seen=new Set(),children=atoms.map(()=>[]),rings=atoms.map(()=>[]),roots=[];let ring=0;
  bonds.forEach((b,i)=>{if(b.a===b.b||!atoms[b.a]||!atoms[b.b])throw Error('Invalid sketch bond.');adjacent[b.a].push({atom:b.b,bond:i});adjacent[b.b].push({atom:b.a,bond:i});});
  for(let i=0;i<atoms.length;i++){const maximum={C:4,N:3,O:2,S:6,P:5,F:1,Cl:1,Br:1,I:1}[atoms[i].element];if(maximum&&adjacent[i].reduce((n,l)=>n+bonds[l.bond].order,0)>maximum)throw Error('Sketch has an over-valent '+atoms[i].element+' atom.');}
  function walk(a){seen.add(a);for(const l of adjacent[a])if(!seen.has(l.atom)){tree.add(l.bond);children[a].push(l);walk(l.atom);}}
  atoms.forEach((_,i)=>{if(!seen.has(i)){roots.push(i);walk(i);}});
  const symbol=b=>({1:'',2:'=',3:'#',1.5:':'})[b.order]??'';
  bonds.forEach((b,i)=>{if(tree.has(i))return;const n=++ring,id=n<10?String(n):'%'+n;rings[b.a].push(symbol(b)+id);rings[b.b].push(id);});
  function write(a){if(!/^(C|N|O|S|P|F|Cl|Br|I|c|n|o|s)$/.test(atoms[a].element))throw Error('Unsupported sketch element.');return atoms[a].element+rings[a].join('')+children[a].map(l=>'('+symbol(bonds[l.bond])+write(l.atom)+')').join('');}
  const smiles=roots.map(write).join('.');parse(smiles);return smiles;
 }
 const api={parse,mapping,prepare,match,search,sketchSmiles};root.ReferenceStructure=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
