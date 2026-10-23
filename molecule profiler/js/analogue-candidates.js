'use strict';
// Single local edits of the input graph; no named-molecule catalogue gate.
(function(root){
 const parse=s=>buildMolecule(parseSmiles(s));
 const clone=m=>({atoms:m.atoms.map(a=>({...a,order:a.order?.slice(),neighbors:[],rings:[]})),bonds:m.bonds.map(b=>({...b}))});
 const serialize=m=>writeSmiles(clone(m));
 function generate(parent,options={}){
  const rows=[],reasons=[],skipped=[],report={version:1,status:'unavailable',rows,reasons,skipped,evidenceLevel:'Unvalidated structural designs',scope:'Single aromatic CH substitutions (F, methyl, OH) and terminal halogen exchanges. No activity, ADME improvement or synthesis feasibility is predicted.'};
  const fail=s=>{reasons.push(s);return report;};
  try{
   if(!parent?.atoms?.length||!Array.isArray(parent.bonds))return fail('A parsed molecular graph is required.');
   if(parent.atoms.length>120)return fail('Use at most 120 atoms for interactive enumeration.');
   if(parent.components!==1)return fail('Use one connected structure; salt mixtures are not normalized.');
   // Reuse the existing closed-shell chemistry screen, without its model-only
   // isotope exclusion: this generator makes no kinetic prediction.
   const chemistry=root.PKApplicability.assess({...parent,atoms:parent.atoms.map(a=>({...a,isotope:null}))});
   if(!chemistry.eligible)return fail(chemistry.reasons.join(' '));
   if(!Pharmacology.exactGraph(parent,parse(serialize(parent))))return fail('Parent isotope/stereochemical identity did not survive serialization.');
   const requested=options.limit===undefined?12:Number(options.limit),limit=Number.isFinite(requested)?Math.min(60,Math.max(0,Math.floor(requested))):12;
   const edits=[];
   parent.atoms.forEach((a,i)=>{
    if(a.element==='C'&&a.aromatic&&!a.charge&&a.totalH===1)for(const [element,h,label] of [['F',0,'Fluoro'],['C',3,'Methyl'],['O',1,'Hydroxy']])edits.push({atom:i,element,h,label,append:true});
    if(['F','Cl','Br','I'].includes(a.element)&&!a.charge&&!a.isotope&&parent.bonds.filter(b=>b.a===i||b.b===i).length===1)for(const element of ['F','Cl','Br','I'])if(element!==a.element)edits.push({atom:i,element,label:a.element+' → '+element});
   });
   const seen=[];
   // Visit each site before trying another substitution at the same site.
   edits.sort((a,b)=>Number(a.append&&a.element!=='F')-Number(b.append&&b.element!=='F'));
   for(const edit of edits){
    if(rows.length>=limit)break;
    try{
     const g=clone(parent),a=g.atoms[edit.atom];
     if(edit.append){a.totalH=0;a.implicitH=0;a.explicitH=0;g.bonds.push({a:edit.atom,b:g.atoms.length,order:1,aromatic:false});g.atoms.push({element:edit.element,aromatic:false,charge:0,totalH:edit.h,explicitH:edit.h,implicitH:0});}
     else a.element=edit.element;
     const smiles=serialize(g),mol=parse(smiles);
     if(!root.PKApplicability.assess({...mol,atoms:mol.atoms.map(a=>({...a,isotope:null}))}).eligible||!Pharmacology.exactGraph(mol,parse(serialize(mol))))throw new Error('Graph validation failed');
     if(Pharmacology.exactGraph(parent,mol)||seen.some(m=>Pharmacology.exactGraph(m,mol)))continue;
     seen.push(mol);rows.push({id:'analogue-'+(rows.length+1),name:edit.label+' variant at atom '+(edit.atom+1),smiles,site:{atom:edit.atom},edit:edit.label,evidenceLevel:'Unvalidated structural design',experimentalValidation:false,limitations:['Local graph edit only; biological activity, selectivity, metabolism and safety are unknown.','Retained supported isotope, tetrahedral and double-bond stereo labels; no new experimental stereochemical assignment.','Analyze the candidate for descriptors or export SMILES for external ADME research.']});
    }catch(_){skipped.push({atom:edit.atom,edit:edit.label,reason:'Candidate failed graph validation.'});}
   }
   report.status=rows.length?'generated':'unavailable';
   reasons.push(rows.length?rows.length+' unique structural variants generated.':limit===0?'Candidate limit is zero.':'No supported aromatic CH or terminal halogen edit passed validation.');
  }catch(e){reasons.push('Enumeration unavailable: '+e.message);}
  return report;
 }
 root.AnalogueCandidates={generate};if(typeof module!=='undefined'&&module.exports)module.exports=root.AnalogueCandidates;
})(globalThis);
