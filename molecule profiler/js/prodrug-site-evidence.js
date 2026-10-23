'use strict';
(function(root){
 // Reference annotations only. No structural edits or generalized activation
 // rules are created, and evidence is never transferred by similarity.
 const ANNOTATIONS=[
  {id:'valacyclovir',name:'Valacyclovir',category:'ester',atom:6,element:'O',kind:'Ester attachment oxygen',
   explanation:'The highlighted oxygen belongs to the documented valine ester. The recorded relationship is hydrolysis to acyclovir; acyclovir requires subsequent intracellular activation.'},
  {id:'enalapril',name:'Enalapril',category:'ester',atom:2,element:'O',kind:'Ethyl ester oxygen',
   explanation:'The highlighted oxygen belongs to the documented ethyl ester. De-esterification gives enalaprilat; this observation is specific to this drug pair.'},
  {id:'capecitabine',name:'Capecitabine',category:'carbamate',atom:8,element:'N',kind:'Carbamate-linked nitrogen',
   explanation:'The highlighted nitrogen is a structural annotation of the reference carbamate. The documented conversion to fluorouracil is multistep; a single cleavage at this atom is not claimed to release fluorouracil.'},
  {id:'parecoxib',name:'Parecoxib',category:'amide',atom:4,element:'N',kind:'N-acylsulfonamide nitrogen',
   explanation:'Parecoxib is a documented amide prodrug of valdecoxib. This N-acylsulfonamide reference is compound-specific; its hydrolysis evidence is not transferred to ordinary amides or arbitrary amines. The regulatory product is the sodium salt; the displayed reference is the neutral structure.'}
 ];
 const EXTRA_RELATIONSHIPS=[{
  prodrug:{name:'Parecoxib',smiles:'CCC(=O)NS(=O)(=O)c1ccc(-c2c(-c3ccccc3)noc2C)cc1',sourceUrl:'https://pubchem.ncbi.nlm.nih.gov/compound/119828'},
  active:{name:'Valdecoxib',smiles:'Cc1onc(-c2ccccc2)c1-c1ccc(S(N)(=O)=O)cc1',sourceUrl:'https://pubchem.ncbi.nlm.nih.gov/compound/119607'},
  activation:'Documented enzymatic hydrolysis to valdecoxib',sourceUrl:'https://www.ema.europa.eu/en/documents/scientific-discussion/dynastat-epar-scientific-discussion_en.pdf'
 }];
 const parse=s=>buildMolecule(parseSmiles(s));
 function references(data){
  return ANNOTATIONS.flatMap(a=>{
   const r=(data&&data.relationships||[]).concat(EXTRA_RELATIONSHIPS).find(r=>r.prodrug.name===a.name);
   if(!r)return [];
   try{
    const mol=parse(r.prodrug.smiles),atom=mol.atoms[a.atom];
    if(!atom||atom.element!==a.element)return [];
    const bonds=mol.bonds.filter(b=>b.a===a.atom||b.b===a.atom),neighbors=bonds.map(b=>b.a===a.atom?b.b:b.a);
    // Guard against a changed structure silently moving a fixed annotation.
    if(!neighbors.some(i=>mol.atoms[i].element==='C'&&mol.bonds.some(b=>(b.a===i||b.b===i)&&b.order===2&&mol.atoms[b.a===i?b.b:b.a].element==='O')))return [];
    return [{...a,prodrug:{...r.prodrug},active:{...r.active},activation:r.activation,sourceUrl:r.sourceUrl,
     evidenceLevel:'Documented compound relationship',siteEvidence:'Structural annotation on this exact reference prodrug',mol}];
   }catch(_){return [];}
  });
 }
 function assess(reference,atomIndex){
  if(!reference||!Number.isInteger(atomIndex)||atomIndex<0||atomIndex>=reference.mol.atoms.length)return {status:'unsupported',reason:'Choose a valid atom in a curated reference structure.'};
  const supported=atomIndex===reference.atom;
  return {status:supported?'documented-reference-site':'unsupported-site',referenceId:reference.id,referenceSmiles:reference.prodrug.smiles,
   selectedAtom:atomIndex,displayAtom:atomIndex+1,element:reference.mol.atoms[atomIndex].element,category:reference.category,
   evidenceLevel:supported?reference.evidenceLevel:'No site-specific annotation in this reference set',
   siteEvidence:supported?reference.siteEvidence:null,sourceUrl:supported?reference.sourceUrl:null,
   relationship:supported?{prodrug:reference.prodrug.name,active:reference.active.name,activation:reference.activation}:null,
   explanation:supported?reference.explanation:'No supported transformation is documented at this selected reference atom. Evidence from another site is not transferred here.',
   limitations:['Atom numbers follow the displayed reference SMILES parse order; they are not IUPAC ring locants or atom numbers in another input.',
    'A documented drug relationship does not establish conversion speed, completeness, exposure, safety or efficacy for an individual.',
    'This viewer filters existing evidence. It does not generate analogues, infer a pathway for another compound or predict parent regeneration.']};
 }
 function inspectInput(mol,atomIndex){
  if(!mol||!Array.isArray(mol.atoms)||!Array.isArray(mol.bonds)||!Number.isInteger(atomIndex)||!mol.atoms[atomIndex])return {status:'unsupported',explanation:'Choose a valid atom in the parsed input molecule.'};
  const a=mol.atoms[atomIndex];
  return {status:'structural-observation',selectedAtom:atomIndex,displayAtom:atomIndex+1,element:a.element,isotope:a.isotope||null,charge:a.charge||0,
   neighbors:mol.bonds.filter(b=>b.a===atomIndex||b.b===atomIndex).length,hydrogens:a.totalH,
   evidenceLevel:'Input structure only',relationship:null,siteEvidence:null,sourceUrl:null,
   explanation:'Selected input atom '+(atomIndex+1)+' ('+a.element+'). No compound-specific activation evidence is assigned to this site by the current reference set.',
   limitations:['Atom numbers follow this input SMILES parse order, not IUPAC ring numbering.',
    'These are structural observations, not a prediction of cleavage, metabolic activation or parent regeneration.']};
 }
 const api={references,assess,inspectInput};root.ProdrugSiteEvidence=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(!root.document||!root.PharmacologyUI)return;
 const doc=root.document,panel=doc.getElementById('prodrug-panel');if(!panel)return;
 const data=typeof PHARMACOLOGY_EVIDENCE!=='undefined'?PHARMACOLOGY_EVIDENCE:null;
 const cases=references(data),make=(tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=String(text);return e;};
 const host=make('section');host.id='prodrug-site-evidence';host.className='pk-research-extension';
 host.append(make('h3','Molecule sites and prodrug evidence'),make('p','Inspect any analyzed input molecule, or choose a documented reference. Select an atom to highlight it and check the available evidence. Atom numbers follow the displayed SMILES, not IUPAC ring locants.'));
 const context=make('p');context.id='prodrug-site-context';context.setAttribute('role','status');
 const controls=make('div');controls.className='prodrug-site-controls';
 const typeLabel=make('label','Reference evidence class '),typeSelect=make('select');typeSelect.id='prodrug-reference-type';
 [['all','All classes'],['ester','Esters'],['amide','Amides'],['carbamate','Carbamates']].forEach(([id,label])=>{const o=make('option',label);o.value=id;typeSelect.append(o);});typeLabel.append(typeSelect);
 const refLabel=make('label','Displayed molecule '),refSelect=make('select');refSelect.id='prodrug-reference-select';
 const empty=make('option','Choose a documented reference');empty.value='';refSelect.append(empty);
 refLabel.append(refSelect);
 function populate(preferred){
  refSelect.replaceChildren(empty);
  if(current){const o=make('option','Current input molecule · structural inspection');o.value='__input__';refSelect.append(o);}
  cases.filter(c=>typeSelect.value==='all'||c.category===typeSelect.value).forEach(c=>{const o=make('option',c.prodrug.name+' → '+c.active.name+' · '+c.category);o.value=c.id;refSelect.append(o);});
  refSelect.value=preferred||'';
 }
 const atomLabel=make('label','Displayed atom '),atomSelect=make('select');atomSelect.id='prodrug-reference-atom';atomLabel.append(atomSelect);
 const check=make('button','Check evidence for selected site');check.id='prodrug-reference-check';check.type='button';
 controls.append(typeLabel,refLabel,atomLabel,check);
 const depiction=make('div');depiction.className='prodrug-site-depiction';
 const smiles=make('code'),output=make('div');output.id='prodrug-reference-result';output.setAttribute('aria-live','polite');
 host.append(context,controls,depiction,smiles,output);panel.append(host);
 const theoreticalLabel=make('label'),theoretical=make('input');theoretical.type='checkbox';theoretical.id='prodrug-input-theoretical';
 theoreticalLabel.append(theoretical,doc.createTextNode(' Mark current input as theoretical / unvalidated'));
 const banner=make('p','THEORETICAL ONLY — experimental testing required. No biological conversion or parent regeneration is established.');banner.className='prodrug-theoretical-banner';banner.id='prodrug-theoretical-banner';banner.setAttribute('role','note');banner.hidden=true;
 controls.after(theoreticalLabel,banner);
 let current=null;
 const selected=()=>refSelect.value==='__input__'&&current?{isInput:true,id:'current-input',mol:current.mol,atom:0,prodrug:{name:current.name||'Current input molecule',smiles:current.smiles}}:cases.find(c=>c.id===refSelect.value);
 const clearSnapshot=()=>{const s=root.PharmacologyUI.getSnapshot();if(s)s.prodrugSiteEvidence=null;};
 function draw(){
  depiction.replaceChildren();const c=selected();if(!c||typeof depictSvg!=='function')return;
  try{depiction.innerHTML=depictSvg(c.mol,{highlight:[Number(atomSelect.value)],title:c.prodrug.name+'; selected atom '+(Number(atomSelect.value)+1)});}catch(_){depiction.append(make('p','Structure preview unavailable; SMILES and atom list remain available.'));}
 }
 function inspect(){
  output.replaceChildren();const c=selected();clearSnapshot();if(!c)return;
  const report=c.isInput?{...inspectInput(c.mol,Number(atomSelect.value)),inputStatus:theoretical.checked?'theoretical-unvalidated':'structure-only'}:assess(c,Number(atomSelect.value));
  const snapshot=root.PharmacologyUI.getSnapshot();if(snapshot&&current&&snapshot.inputSmiles===current.smiles)snapshot.prodrugSiteEvidence={inputSmiles:current.smiles,...report};
  output.append(make('strong',report.status==='documented-reference-site'?'Documented relationship · annotated reference site':report.status==='structural-observation'?'Input atom · no documented activation evidence':'Unsupported reference site'),make('p',report.explanation));
  if(c.isInput&&report.status==='structural-observation')output.append(make('p','Element: '+report.element+' · graph neighbors: '+report.neighbors+' · formal charge: '+report.charge+' · attached hydrogens: '+report.hydrogens));
  if(report.relationship)output.append(make('p',report.relationship.prodrug+' → '+report.relationship.active+' · '+report.relationship.activation),make('p',report.siteEvidence+' · '+report.category));
  if(report.sourceUrl&&/^https:\/\//.test(report.sourceUrl)){const a=make('a','Compound-specific relationship source');a.href=report.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';output.append(a);}
  const list=make('ul');(report.limitations||[]).forEach(t=>list.append(make('li',t)));output.append(list);
 }
 function choose(){
  clearSnapshot();output.replaceChildren();atomSelect.replaceChildren();depiction.replaceChildren();smiles.textContent='';
  const c=selected();atomSelect.disabled=!c;check.disabled=!c;
  theoreticalLabel.hidden=!c||!c.isInput;banner.hidden=!c||!c.isInput||!theoretical.checked;
  if(!c)return;
  c.mol.atoms.forEach((a,i)=>{const o=make('option','Atom '+(i+1)+' · '+a.element+(!c.isInput&&i===c.atom?' · annotated '+c.kind:''));o.value=String(i);atomSelect.append(o);});
  atomSelect.value=String(c.atom);smiles.textContent=c.prodrug.smiles;draw();inspect();
 }
 refSelect.addEventListener('change',()=>{choose();context.textContent=refSelect.value==='__input__'?'Inspecting the current input structure. Reference evidence is not transferred to it.':'Inspecting a named reference independently from the current input molecule.';});
 typeSelect.addEventListener('change',()=>{populate(current?'__input__':'');choose();context.textContent='Reference filter updated. The current input remains available for structural inspection.';});
 atomSelect.addEventListener('change',()=>{clearSnapshot();output.replaceChildren(make('p','Selection changed. Check evidence for this displayed site.'));draw();});
 check.addEventListener('click',inspect);
 theoretical.addEventListener('change',()=>{banner.hidden=!theoretical.checked;inspect();});
 const originalRender=root.PharmacologyUI.render;
 root.PharmacologyUI.render=function(record,ranks){
  const sameInput=current&&current.smiles===record.smiles;
  if(!sameInput)theoretical.checked=false;
  current=null;choose();originalRender(record,ranks);current=record;
  const match=cases.find(c=>Pharmacology.exactGraph(record.mol,c.mol)||Pharmacology.exactGraph(record.mol,parse(c.active.smiles)));
  typeSelect.value='all';populate(match?match.id:'__input__');choose();
  context.textContent=match?'Exact reference relationship matched. The structure and atom indices below belong to the named reference prodrug. Choose Current input molecule to inspect your original atom order.':'Inspecting your current molecule. No exact compound match in this '+cases.length+'-reference set; other compounds’ evidence does not apply to this input.';
 };
 populate('');choose();context.textContent='Analyze a molecule, or choose a documented reference to inspect.';
})(globalThis);
