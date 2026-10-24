'use strict';
// Bounded local graph edits. These are structural hypotheses, not SAR predictions.
(function(root){
 const parse=s=>buildMolecule(parseSmiles(s)),clone=m=>({atoms:m.atoms.map(a=>({...a,order:a.order?.slice(),neighbors:[],rings:[]})),bonds:m.bonds.map(b=>({...b}))}),serialize=m=>writeSmiles(clone(m));
 const FAMILIES={aryl:'Aromatic substituents',aza:'Aromatic C–H → N',halogen:'Halogen exchanges',oxygen:'O–H alkylation',amine:'Amine N–H alkylation',ether:'Methoxy chain extension',functional:'Alcohol handle replacements',sulfur:'Ether O → S',acid:'Carboxylic-acid ester variants',carbonyl:'Carbonyl O/S exchange',heteroN:'Aromatic N–H alkylation',...(root.AnalogueEditExtensions?.families||{})};
 const ARYL=[['F','Fluoro'],['Cl','Chloro'],['Br','Bromo'],['C','Methyl'],['CC','Ethyl'],['O','Hydroxy'],['OC','Methoxy'],['OCC','Ethoxy'],['C#N','Cyano'],['C(F)(F)F','Trifluoromethyl']];
 const same=(a,b)=>root.Pharmacology.exactGraph(a,b),gate=m=>root.PKApplicability.assess({...m,atoms:m.atoms.map(a=>({...a,isotope:null}))});
 const setH=(a,h)=>{a.totalH=h;a.explicitH=h;a.implicitH=0;};
 function links(m,i){return m.bonds.flatMap(b=>b.a===i?[{atom:b.b,bond:b}]:b.b===i?[{atom:b.a,bond:b}]:[]);}
 function carbonylLike(m,i){return links(m,i).some(n=>n.bond.order>=2&&['N','O','S'].includes(m.atoms[n.atom].element));}
 function append(g,i,fragment){const f=parse(fragment),offset=g.atoms.length;if(g.atoms[i].totalH<1||f.atoms[0].totalH<1)throw Error('No substitutable hydrogen');setH(g.atoms[i],g.atoms[i].totalH-1);setH(f.atoms[0],f.atoms[0].totalH-1);for(const a of f.atoms)g.atoms.push({...a,order:a.order?.map(n=>n==null||n<0?n:n+offset),neighbors:[],rings:[]});g.bonds.push(...f.bonds.map(b=>({...b,a:b.a+offset,b:b.b+offset})),{a:i,b:offset,order:1,aromatic:false});}
 function catalogue(parent){
  const edits=[];function add(atom,family,label,operation,extra={}){edits.push({atom,family,label,operation,...extra});}
  parent.atoms.forEach((a,i)=>{const ns=links(parent,i),ordinary=!a.charge&&!a.chirality;
   if(a.element==='C'&&a.aromatic&&ordinary&&a.totalH===1){ARYL.forEach(([fragment,label],variant)=>add(i,'aryl',label+' substitution','append',{fragment,variant}));if(!a.isotope)add(i,'aza','Aromatic C–H → pyridine-like N','replace',{element:'N',h:0});}
   if(['F','Cl','Br','I'].includes(a.element)&&ordinary&&!a.isotope&&ns.length===1&&ns[0].bond.order===1&&parent.atoms[ns[0].atom].element==='C')for(const element of ['F','Cl','Br','I'])if(element!==a.element)add(i,'halogen',a.element+' → '+element,'replace',{element,h:0});
   if(a.element==='O'&&ordinary&&!a.aromatic&&a.totalH===1&&ns.length===1&&ns[0].bond.order===1&&parent.atoms[ns[0].atom].element==='C'&&!carbonylLike(parent,ns[0].atom)){
    [['C','Methyl'],['CC','Ethyl'],['CCC','Propyl'],['CC(C)C','Isobutyl']].forEach(([fragment,label],variant)=>add(i,'oxygen','O-'+label.toLowerCase()+' ether','append',{fragment,variant}));
    if(!a.isotope)for(const [element,h,label] of [['F',0,'OH → F'],['N',2,'OH → NH2'],['S',1,'OH → SH']])add(i,'functional',label,'replace',{element,h});
   }
   if(a.element==='N'&&!a.chirality&&[0,1].includes(a.charge||0)&&!a.aromatic&&a.totalH>0&&a.totalH<=3&&ns.length>0&&ns.every(n=>n.bond.order===1&&parent.atoms[n.atom].element==='C'&&!carbonylLike(parent,n.atom)))[['C','Methyl'],['CC','Ethyl'],['CCC','Propyl'],['CC(C)C','Isobutyl']].forEach(([fragment,label],variant)=>add(i,'amine','N-'+label.toLowerCase()+' analogue','append',{fragment,variant}));
   if(a.element==='O'&&ordinary&&!a.aromatic&&a.totalH===1&&ns.length===1&&ns[0].bond.order===1&&parent.atoms[ns[0].atom].element==='C'&&links(parent,ns[0].atom).some(n=>n.bond.order===2&&parent.atoms[n.atom].element==='O'))[['C','Methyl'],['CC','Ethyl'],['CCC','Propyl']].forEach(([fragment,label],variant)=>add(i,'acid',label+' carboxylate ester','append',{fragment,variant}));
   if(['O','S'].includes(a.element)&&ordinary&&!a.isotope&&!a.aromatic&&a.totalH===0&&ns.length===1&&ns[0].bond.order===2&&parent.atoms[ns[0].atom].element==='C')add(i,'carbonyl',a.element==='O'?'Carbonyl O → S':'Thiocarbonyl S → O','replace',{element:a.element==='O'?'S':'O',h:0});
   if(a.element==='N'&&ordinary&&a.aromatic&&a.totalH===1)[['C','Methyl'],['CC','Ethyl']].forEach(([fragment,label],variant)=>add(i,'heteroN','Aromatic N-'+label.toLowerCase()+' analogue','append',{fragment,variant}));
   if(a.element==='S'&&ordinary&&!a.isotope&&!a.aromatic&&a.totalH===1&&ns.length===1&&ns[0].bond.order===1&&parent.atoms[ns[0].atom].element==='C'&&!carbonylLike(parent,ns[0].atom))add(i,'functional','SH → OH','replace',{element:'O',h:1});
   if(a.element==='O'&&ordinary&&!a.aromatic&&a.totalH===0&&ns.length===2&&ns.every(n=>n.bond.order===1&&parent.atoms[n.atom].element==='C'&&!carbonylLike(parent,n.atom))){
    if(!a.isotope)add(i,'sulfur','Ether O → thioether S','replace',{element:'S',h:0});
    for(const n of ns){const c=parent.atoms[n.atom];if(!c.aromatic&&!c.charge&&!c.chirality&&c.totalH===3&&links(parent,n.atom).length===1)[['C','Methoxy → ethoxy'],['CC','Methoxy → propoxy'],['CCC','Methoxy → butoxy']].forEach(([fragment,label],variant)=>add(n.atom,'ether',label,'append',{fragment,variant,etherOxygen:i}));}
   }
  });
  const extra=root.AnalogueEditExtensions?.catalogue(parent);if(extra){edits.push(...extra.edits);edits.bounded=extra.bounded;edits.limits=extra.limits;}return edits;
 }
 function generate(parent,options={}){
  const rows=[],reasons=[],skipped=[],report={version:3,status:'unavailable',rows,reasons,skipped,evidenceLevel:'Unvalidated structural designs',scope:'Bounded local, paired-site and ring-topology structural edits with browser graph checks. No potency, target affinity, ADME improvement, biological equivalence, prodrug release or synthesis feasibility is inferred.'};
  const fail=s=>{reasons.push(s);return report;};
  try{
   if(!parent?.atoms?.length||!Array.isArray(parent.bonds))return fail('A parsed molecular graph is required.');
   if(parent.atoms.length>120)return fail('Use at most 120 input atoms for bounded interactive enumeration.');
   if(parent.components!==1)return fail('Use one connected structure; salt mixtures are not silently normalized.');
   const chemistry=gate(parent);if(!chemistry.eligible)return fail(chemistry.reasons.join(' '));
   if(!same(parent,parse(serialize(parent))))return fail('Parent isotope/stereochemical identity did not survive serialization.');
   const all=catalogue(parent);report.catalogueLimits=all.limits||{};report.families=Object.entries(FAMILIES).map(([id,label])=>({id,label,matchedEdits:all.filter(e=>e.family===id).length}));
   report.eligibleSites=[...new Set(all.flatMap(e=>e.siteAtoms||[e.atom]))].map(atom=>({atom,element:parent.atoms[atom].element,label:parent.atoms[atom].element+(atom+1),families:[...new Set(all.filter(e=>(e.siteAtoms||[e.atom]).includes(atom)).map(e=>e.family))],matchedEdits:all.filter(e=>(e.siteAtoms||[e.atom]).includes(atom)).length}));
   if(options.atom!==undefined&&(!Number.isInteger(options.atom)||!parent.atoms[options.atom]))return fail('Choose a valid input atom.');
   const selected=options.families===undefined?Object.keys(FAMILIES):options.families;if(!Array.isArray(selected)||selected.some(id=>!Object.hasOwn(FAMILIES,id)))return fail('Choose supported edit families.');
   const requested=options.limit===undefined?25:Number(options.limit),limit=Number.isFinite(requested)?Math.min(100,Math.max(0,Math.floor(requested))):25;
   const edits=all.filter(e=>selected.includes(e.family)&&(options.atom===undefined||(e.siteAtoms||[e.atom]).includes(options.atom))),queues=selected.map(f=>edits.filter(e=>e.family===f).sort((a,b)=>(a.variant||0)-(b.variant||0)||a.atom-b.atom));
   const ordered=[];let cursor=0;while(queues.some(q=>cursor<q.length)){for(const q of queues)if(q[cursor])ordered.push(q[cursor]);cursor++;}
   const seen=[];let attempts=0,duplicates=0;
   for(const edit of ordered){
    if(rows.length>=limit||attempts>=400)break;attempts++;
    try{
     const g=clone(parent),a=g.atoms[edit.atom];if(edit.operation==='extension')root.AnalogueEditExtensions.apply(g,edit.changes);else if(edit.operation==='append')append(g,edit.atom,edit.fragment);else{a.element=edit.element;setH(a,edit.h);}
     if(g.atoms.length>160)throw Error('Candidate exceeds the atom bound');const smiles=serialize(g),mol=parse(smiles);
     if(mol.atoms.filter(a=>a.chirality).length!==parent.atoms.filter(a=>a.chirality).length)throw Error('Existing stereochemical labels were not preserved');
     const labels=m=>m.atoms.filter(a=>a.isotope).map(a=>a.element+':'+a.isotope).sort().join('|');if(labels(mol)!==labels(parent))throw Error('Existing isotope labels were not preserved');
     if(!gate(mol).eligible||!same(mol,parse(serialize(mol))))throw Error('Closed-shell graph or stereochemical round-trip check failed');
     if(same(parent,mol)||seen.some(m=>same(m,mol))){duplicates++;continue;}
     seen.push(mol);rows.push({id:'analogue-'+(rows.length+1),name:edit.label+' at input '+parent.atoms[edit.atom].element+(edit.atom+1),smiles,site:{atom:edit.atom,label:parent.atoms[edit.atom].element+(edit.atom+1)},family:edit.family,familyLabel:FAMILIES[edit.family],edit:edit.label,operation:edit.operation,changes:edit.changes||null,sites:(edit.siteAtoms||[edit.atom]).map(atom=>({atom,label:parent.atoms[atom].element+(atom+1)})),fragment:edit.fragment||null,replacement:edit.operation==='replace'?{element:edit.element,hydrogens:edit.h}:null,evidenceLevel:'Unvalidated structural design',experimentalValidation:false,limitations:['Formal local graph edit; activity, selectivity, metabolism, safety and preparation are unknown.','Input atom numbers refer to the original structure. Retained atoms keep supported isotope and stereo labels; new stereochemistry is unassigned.','Structural similarity and calculated property changes do not establish equivalent biology, improved ADME or a synthetic route.']});
    }catch(error){if(skipped.length<100)skipped.push({atom:edit.atom,edit:edit.label,reason:error.message});}
   }
   report.coverage={matchedEdits:edits.length,attempted:attempts,duplicates,accepted:rows.length,limit,maxCandidates:100,attemptLimit:400,attemptLimitReached:attempts>=400&&attempts<ordered.length,catalogueLimitReached:!!all.bounded,exhausted:attempts>=ordered.length};
   report.status=rows.length?'generated':'unavailable';reasons.push(rows.length?rows.length+' unique unvalidated analogues generated across '+new Set(rows.map(r=>r.family)).size+' edit families.':limit===0?'Candidate limit is zero.':'No compatible edit passed the selected family/site and graph checks.');
   if(!all.length)reasons.push('This input has no supported site in the current edit catalogue. This is a coverage limit, not proof that no analogue is possible.');
  }catch(e){reasons.push('Enumeration unavailable: '+e.message);}
  return report;
 }
 root.AnalogueCandidates={generate,families:FAMILIES};if(typeof module!=='undefined'&&module.exports)module.exports=root.AnalogueCandidates;
})(globalThis);
