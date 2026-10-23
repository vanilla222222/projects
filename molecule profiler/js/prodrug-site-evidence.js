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
 const api={references,assess};root.ProdrugSiteEvidence=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(!root.document||!root.PharmacologyUI)return;
 const doc=root.document,panel=doc.getElementById('prodrug-panel');if(!panel)return;
 const data=typeof PHARMACOLOGY_EVIDENCE!=='undefined'?PHARMACOLOGY_EVIDENCE:null;
 const cases=references(data),make=(tag,text)=>{const e=doc.createElement(tag);if(text!==undefined)e.textContent=String(text);return e;};
 const host=make('section');host.id='prodrug-site-evidence';host.className='pk-research-extension';
 host.append(make('h3','Documented prodrug site evidence'),make('p','Select a curated reference, choose an atom, then check its evidence. Atom numbers refer to the displayed reference SMILES, not a numbered position on your input molecule.'));
 const context=make('p');context.id='prodrug-site-context';context.setAttribute('role','status');
 const controls=make('div');controls.className='prodrug-site-controls';
 const typeLabel=make('label','Evidence class '),typeSelect=make('select');typeSelect.id='prodrug-reference-type';
 [['all','All classes'],['ester','Esters'],['amide','Amides'],['carbamate','Carbamates']].forEach(([id,label])=>{const o=make('option',label);o.value=id;typeSelect.append(o);});typeLabel.append(typeSelect);
 const refLabel=make('label','Reference compound '),refSelect=make('select');refSelect.id='prodrug-reference-select';
 const empty=make('option','Choose a documented reference');empty.value='';refSelect.append(empty);
 refLabel.append(refSelect);
 function populate(preferred){
  refSelect.replaceChildren(empty);
  cases.filter(c=>typeSelect.value==='all'||c.category===typeSelect.value).forEach(c=>{const o=make('option',c.prodrug.name+' → '+c.active.name+' · '+c.category);o.value=c.id;refSelect.append(o);});
  refSelect.value=preferred||'';
 }
 const atomLabel=make('label','Reference atom '),atomSelect=make('select');atomSelect.id='prodrug-reference-atom';atomLabel.append(atomSelect);
 const check=make('button','Check evidence for selected site');check.id='prodrug-reference-check';check.type='button';
 controls.append(typeLabel,refLabel,atomLabel,check);
 const depiction=make('div');depiction.className='prodrug-site-depiction';
 const smiles=make('code'),output=make('div');output.id='prodrug-reference-result';output.setAttribute('aria-live','polite');
 host.append(context,controls,depiction,smiles,output);panel.append(host);
 let current=null;
 const selected=()=>cases.find(c=>c.id===refSelect.value);
 const clearSnapshot=()=>{const s=root.PharmacologyUI.getSnapshot();if(s)s.prodrugSiteEvidence=null;};
 function draw(){
  depiction.replaceChildren();const c=selected();if(!c||typeof depictSvg!=='function')return;
  try{depiction.innerHTML=depictSvg(c.mol,{highlight:[Number(atomSelect.value)],title:c.prodrug.name+' reference; selected atom '+(Number(atomSelect.value)+1)});}catch(_){depiction.append(make('p','Structure preview unavailable; reference SMILES and atom list remain available.'));}
 }
 function inspect(){
  output.replaceChildren();const c=selected();clearSnapshot();if(!c)return;
  const report=assess(c,Number(atomSelect.value));
  const snapshot=root.PharmacologyUI.getSnapshot();if(snapshot&&current&&snapshot.inputSmiles===current.smiles)snapshot.prodrugSiteEvidence={inputSmiles:current.smiles,...report};
  output.append(make('strong',report.status==='documented-reference-site'?'Documented relationship · annotated reference site':'Unsupported reference site'),make('p',report.explanation));
  if(report.relationship)output.append(make('p',report.relationship.prodrug+' → '+report.relationship.active+' · '+report.relationship.activation),make('p',report.siteEvidence+' · '+report.category));
  if(report.sourceUrl&&/^https:\/\//.test(report.sourceUrl)){const a=make('a','Compound-specific relationship source');a.href=report.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';output.append(a);}
  const list=make('ul');(report.limitations||[]).forEach(t=>list.append(make('li',t)));output.append(list);
 }
 function choose(){
  clearSnapshot();output.replaceChildren();atomSelect.replaceChildren();depiction.replaceChildren();smiles.textContent='';
  const c=selected();atomSelect.disabled=!c;check.disabled=!c;
  if(!c)return;
  c.mol.atoms.forEach((a,i)=>{const o=make('option','Atom '+(i+1)+' · '+a.element+(i===c.atom?' · annotated '+c.kind:''));o.value=String(i);atomSelect.append(o);});
  atomSelect.value=String(c.atom);smiles.textContent=c.prodrug.smiles;draw();inspect();
 }
 refSelect.addEventListener('change',choose);
 typeSelect.addEventListener('change',()=>{populate('');choose();context.textContent='Evidence-class filter changed. Choose a named reference; its evidence applies only to that compound pair.';});
 atomSelect.addEventListener('change',()=>{clearSnapshot();output.replaceChildren(make('p','Selection changed. Check evidence for this reference site.'));draw();});
 check.addEventListener('click',inspect);
 const originalRender=root.PharmacologyUI.render;
 root.PharmacologyUI.render=function(record,ranks){
  current=null;choose();originalRender(record,ranks);current=record;
  const match=cases.find(c=>Pharmacology.exactGraph(record.mol,c.mol)||Pharmacology.exactGraph(record.mol,parse(c.active.smiles)));
  typeSelect.value='all';populate(match?match.id:'');choose();
  context.textContent=match?'Exact reference relationship matched. The structure and atom indices below belong to the named reference prodrug.':'No exact match in this '+cases.length+'-reference site set. You can inspect a named reference independently; its evidence does not apply to the current molecule.';
 };
 populate('');choose();context.textContent='Analyze a molecule, or choose a documented reference to inspect.';
})(globalThis);
