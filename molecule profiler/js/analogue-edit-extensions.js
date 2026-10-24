'use strict';
// General graph edits, selected by local connectivity; no named-scaffold or activity rules.
(function(root){
 const families={carbon:'Aliphatic C–H substitutions',dialkyl:'Amine double alkylation',noxygen:'Amine N–O substitutions',homologue:'Acyclic chain length changes',arylExpanded:'Additional aromatic substituents',arylExchange:'Aryl-halogen group replacements',regio:'Pendant alkoxy / halogen relocations',dealkoxy:'Terminal methoxy removal',paired:'Paired aromatic substitutions',fiveRing:'Isolated six-to-five aromatic ring edits',fusion:'Adjacent aromatic ring fusion'};
 const fragments=[['CCC','Propyl'],['C(C)C','Isopropyl'],['CCCC','Butyl'],['C(C)(C)C','tert-Butyl'],['SC','Methylthio'],['SCC','Ethylthio'],['SCCC','Propylthio'],['C(F)F','Difluoromethyl'],['[NH+](=O)[O-]','Nitro'],['C=C','Vinyl'],['C#C','Ethynyl'],['C1CC1','Cyclopropyl'],['C1CCC1','Cyclobutyl']];
 const exchanges=[['F','Fluoro'],['Cl','Chloro'],['Br','Bromo'],['C','Methyl'],['CC','Ethyl'],['O','Hydroxy'],['OC','Methoxy'],['OCC','Ethoxy'],['C#N','Cyano'],['C(F)(F)F','Trifluoromethyl'],...fragments];
 const parse=s=>buildMolecule(parseSmiles(s));
 const links=(g,i)=>g.bonds.flatMap(b=>b.a===i?[{atom:b.b,bond:b}]:b.b===i?[{atom:b.a,bond:b}]:[]);
 const H=(a,h)=>{a.totalH=h;a.explicitH=h;a.implicitH=0;};
 const plain=a=>!a.charge&&!a.chirality&&!a.isotope;
 const single=b=>b.order===1&&!b.aromatic&&!b.dir;
 const carbonyl=(g,i)=>links(g,i).some(n=>n.bond.order>=2&&['N','O','S'].includes(g.atoms[n.atom].element));
 function component(g,start,cutA=-1,cutB=-1,aromaticOnly=false){const seen=new Set([start]),queue=[start];for(const i of queue)for(const n of links(g,i)){if((i===cutA&&n.atom===cutB)||(i===cutB&&n.atom===cutA)||aromaticOnly&&(!n.bond.aromatic||!g.atoms[n.atom].aromatic))continue;if(!seen.has(n.atom)){seen.add(n.atom);queue.push(n.atom);}}return seen;}
 const bridge=(g,a,b)=>!component(g,a,a,b).has(b);
 function catalogue(g){
  const edits=[],aryl=[];let pairs=0,moves=0;
  const add=(atom,family,label,changes,variant=0)=>edits.push({atom,family,label,operation:'extension',changes,siteAtoms:[...new Set([atom,...(changes.sites||[]),changes.to,changes.a,changes.b,changes.root,changes.anchor,changes.replace,...(changes.remove||[])].filter(Number.isInteger))],variant});
  for(let i=0;i<g.atoms.length;i++){
   const a=g.atoms[i],ns=links(g,i);
   if(a.element==='C'&&a.aromatic&&plain(a)&&a.totalH===1){aryl.push(i);fragments.forEach(([f,label],v)=>add(i,'arylExpanded',label+' aromatic substitution',{kind:'appendMany',sites:[i],fragments:[f]},v));}
   if(a.element==='C'&&!a.aromatic&&plain(a)&&a.totalH>0&&ns.every(n=>single(n.bond))){[['C','C–H → C–methyl'],['CC','C–H → C–ethyl'],['O','C–H → C–OH']].forEach(([f,label],v)=>add(i,'carbon',label,{kind:'appendMany',sites:[i],fragments:[f]},v));}
   const amine=a.element==='N'&&plain(a)&&!a.aromatic&&a.totalH>=1&&ns.length>0&&ns.every(n=>single(n.bond)&&g.atoms[n.atom].element==='C'&&!carbonyl(g,n.atom));
   if(amine){if(a.totalH>=2)[[['C','C'],'N,N-dimethyl'],[['C','CC'],'N-methyl-N-ethyl'],[['CC','CC'],'N,N-diethyl']].forEach(([fs,label],v)=>add(i,'dialkyl',label+' substitution',{kind:'appendMany',sites:[i,i],fragments:fs},v));[['O','N-hydroxy'],['OC','N-methoxy']].forEach(([f,label],v)=>add(i,'noxygen',label+' substitution',{kind:'appendMany',sites:[i],fragments:[f]},v));}
   if(['F','Cl','Br','I'].includes(a.element)&&plain(a)&&ns.length===1&&single(ns[0].bond)){const anchor=ns[0].atom,c=g.atoms[anchor];if(c.element==='C'&&c.aromatic&&plain(c)){exchanges.forEach(([f,label],v)=>{if(f!==a.element)add(i,'arylExchange',a.element+' → '+label.toLowerCase(),{kind:'substitute',anchor,remove:[i],fragment:f},v);});add(i,'arylExchange','Remove aryl '+a.element,{kind:'removeBranch',anchor,remove:[i]},exchanges.length);for(const to of component(g,anchor,-1,-1,true)){if(moves>=120)break;if(g.atoms[to].element==='C'&&plain(g.atoms[to])&&g.atoms[to].totalH===1){add(anchor,'regio','Move '+a.element+' C'+(anchor+1)+' → C'+(to+1),{kind:'relocate',from:anchor,to,root:i});moves++;}}}}
   if(a.element==='C'&&!a.aromatic&&plain(a)&&a.totalH===2&&ns.length===2&&ns.every(n=>single(n.bond)&&plain(g.atoms[n.atom]))&&ns.some(n=>g.atoms[n.atom].element==='C')&&ns.every(n=>['C','N','O','S'].includes(g.atoms[n.atom].element)&&!g.atoms[n.atom].aromatic&&!carbonyl(g,n.atom))&&bridge(g,i,ns[0].atom)&&bridge(g,i,ns[1].atom))add(i,'homologue','Remove acyclic methylene',{kind:'contract',atom:i,a:ns[0].atom,b:ns[1].atom});
   if(a.element==='O'&&plain(a)&&!a.aromatic&&a.totalH===0&&ns.length===2&&ns.every(n=>single(n.bond))){const ring=ns.find(n=>g.atoms[n.atom].element==='C'&&g.atoms[n.atom].aromatic),alkyl=ns.find(n=>!g.atoms[n.atom].aromatic&&g.atoms[n.atom].element==='C');if(ring&&alkyl&&!carbonyl(g,alkyl.atom)&&links(g,alkyl.atom).every(n=>single(n.bond))&&plain(g.atoms[ring.atom])&&bridge(g,ring.atom,i)){
    const branch=[...component(g,i,ring.atom,i)];
    if(branch.every(j=>plain(g.atoms[j]))){const system=component(g,ring.atom,-1,-1,true);for(const to of system){if(moves>=120)break;if(g.atoms[to].element==='C'&&plain(g.atoms[to])&&g.atoms[to].totalH===1){add(ring.atom,'regio','Move alkoxy C'+(ring.atom+1)+' → C'+(to+1),{kind:'relocate',from:ring.atom,to,root:i});moves++;}}
     if(branch.length===2&&g.atoms[alkyl.atom].totalH===3)add(ring.atom,'dealkoxy','Remove terminal methoxy',{kind:'removeBranch',anchor:ring.atom,remove:branch});
    }
   }}
  }
  for(const bond of g.bonds){const a=g.atoms[bond.a],b=g.atoms[bond.b];if(single(bond)&&plain(a)&&plain(b)&&!a.aromatic&&!b.aromatic&&((a.element==='C'&&['C','N','O','S'].includes(b.element))||(b.element==='C'&&['N','O','S'].includes(a.element)))&&!carbonyl(g,bond.a)&&!carbonyl(g,bond.b)&&bridge(g,bond.a,bond.b)&&links(g,bond.a).every(n=>!n.bond.dir)&&links(g,bond.b).every(n=>!n.bond.dir))add(bond.a,'homologue','Insert acyclic methylene',{kind:'insert',a:bond.a,b:bond.b});
   if(bond.aromatic&&aryl.includes(bond.a)&&aryl.includes(bond.b)&&a.ringCount===1&&b.ringCount===1)for(const element of ['O','S'])add(bond.a,'fusion','Fuse aromatic '+(element==='O'?'oxygen':'sulfur')+' five-membered ring',{kind:'fuse',a:bond.a,b:bond.b,element});
  }
  for(let x=0;x<aryl.length&&pairs<120;x++){const system=component(g,aryl[x],-1,-1,true);for(let y=x+1;y<aryl.length&&pairs<120;y++){if(!system.has(aryl[y]))continue;for(const fs of [['F','F'],['C','F'],['F','C'],['C','C']]){if(pairs>=120)break;add(aryl[x],'paired','Paired '+fs.join(' / ')+' substitutions at C'+(aryl[x]+1)+' and C'+(aryl[y]+1),{kind:'appendMany',sites:[aryl[x],aryl[y]],fragments:fs},pairs%4);pairs++;}}}
  const done=new Set();for(const i of aryl){const system=[...component(g,i,-1,-1,true)];if(system.length!==6||system.some(j=>g.atoms[j].element!=='C'||!plain(g.atoms[j])||g.atoms[j].ringCount!==1))continue;const key=system.slice().sort((a,b)=>a-b).join(',');if(done.has(key))continue;done.add(key);if(system.some(j=>links(g,j).some(n=>!system.includes(n.atom)&&!bridge(g,j,n.atom))))continue;
   for(const atom of system){if(!aryl.includes(atom))continue;const ns=links(g,atom).filter(n=>n.bond.aromatic);for(const keep of ns){if(!aryl.includes(keep.atom))continue;for(const element of ['O','S'])add(atom,'fiveRing','Six-to-five aromatic '+(element==='O'?'oxygen':'sulfur')+' ring edit',{kind:'heteroContract',atom,a:ns[0].atom,b:ns[1].atom,replace:keep.atom,element});}}
  }
  return {edits,limits:{paired:120,relocations:120},bounded: pairs>=120||moves>=120};
 }
 function append(g,i,fragment){const f=parse(fragment),offset=g.atoms.length;if(g.atoms[i].totalH<1||f.atoms[0].totalH<1)throw Error('No substitutable hydrogen');H(g.atoms[i],g.atoms[i].totalH-1);H(f.atoms[0],f.atoms[0].totalH-1);g.atoms.push(...f.atoms.map(a=>({...a,order:a.order?.map(n=>n==null||n<0?n:n+offset),neighbors:[],rings:[]})));g.bonds.push(...f.bonds.map(b=>({...b,a:b.a+offset,b:b.b+offset})),{a:i,b:offset,order:1,aromatic:false});}
 function remove(g,ids){const removed=new Set(ids),map=new Map();for(let i=0,n=0;i<g.atoms.length;i++)if(!removed.has(i))map.set(i,n++);g.atoms=g.atoms.filter((_,i)=>!removed.has(i)).map(a=>({...a,order:a.order?.filter(n=>n==null||n<0||map.has(n)).map(n=>n==null||n<0?n:map.get(n)),neighbors:[],rings:[]}));g.bonds=g.bonds.filter(b=>map.has(b.a)&&map.has(b.b)).map(b=>({...b,a:map.get(b.a),b:map.get(b.b)}));}
 function apply(g,c){
  if(c.kind==='appendMany'){for(let k=0;k<c.sites.length;k++)append(g,c.sites[k],c.fragments[k]);}
  else if(c.kind==='substitute'||c.kind==='removeBranch'){H(g.atoms[c.anchor],g.atoms[c.anchor].totalH+1);if(c.fragment)append(g,c.anchor,c.fragment);remove(g,c.remove);}
  else if(c.kind==='relocate'){const b=g.bonds.find(b=>(b.a===c.from&&b.b===c.root)||(b.b===c.from&&b.a===c.root));if(!b)throw Error('Missing pendant bond');if(b.a===c.from)b.a=c.to;else b.b=c.to;H(g.atoms[c.from],g.atoms[c.from].totalH+1);H(g.atoms[c.to],g.atoms[c.to].totalH-1);}
  else if(c.kind==='insert'){const index=g.atoms.length;g.bonds=g.bonds.filter(b=>!((b.a===c.a&&b.b===c.b)||(b.b===c.a&&b.a===c.b)));const atom=parse('C').atoms[0];H(atom,2);g.atoms.push({...atom,neighbors:[],rings:[],order:[c.a,c.b]});g.bonds.push({a:c.a,b:index,order:1,aromatic:false},{a:index,b:c.b,order:1,aromatic:false});}
  else if(c.kind==='contract'||c.kind==='heteroContract'){const aromatic=c.kind==='heteroContract';if(aromatic){g.atoms[c.replace].element=c.element;H(g.atoms[c.replace],0);}g.bonds.push({a:c.a,b:c.b,order:1,aromatic});remove(g,[c.atom]);}
  else if(c.kind==='fuse'){const f=parse('OCC'),offset=g.atoms.length;f.atoms[0].element=c.element;for(let k=0;k<3;k++){const a=f.atoms[k];a.aromatic=true;H(a,k===0?0:1);g.atoms.push({...a,neighbors:[],rings:[],order:[]});}H(g.atoms[c.a],g.atoms[c.a].totalH-1);H(g.atoms[c.b],g.atoms[c.b].totalH-1);for(const [a,b]of [[c.a,offset],[offset,offset+1],[offset+1,offset+2],[offset+2,c.b]])g.bonds.push({a,b,order:1,aromatic:true});}
  else throw Error('Unsupported graph edit');
 }
 const api={families,catalogue,apply};root.AnalogueEditExtensions=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
