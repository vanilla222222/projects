"use strict";
(function(root){
 const MODULES=[
  {id:'adme',name:'ADME & developability',description:'Descriptors, skin permeation, drug-likeness and RDKit medicinal-chemistry filters.',compute:'RDKit QED, SA score, PAINS, Brenk, NIH and ZINC filters'},
  {id:'conformers',name:'3D structures & force fields',description:'Generate conformers, optimize coordinates and inspect atom types and partial charges.',compute:'ETKDGv3, MMFF94 / UFF; export SDF and force-field JSON'},
  {id:'screen',name:'3D reference screening',description:'Compare a query with local reference structures using 2D fingerprints and 3D shape.',compute:'Morgan Tanimoto, aligned shape and pharmacophore-color overlap'},
  {id:'fragments',name:'Fragment replacements',description:'Inspect BRICS fragments and make validated substitutions at a single attachment boundary.',compute:'RDKit BRICS and single-boundary substructure replacement'},
  {id:'dock',name:'Docking',description:'Run a local ligand–receptor docking search using your prepared receptor and search box.',compute:'Independent AutoDock Vina engine; ligand preparation with Meeko'},
  {id:'sidechains',name:'Amino-acid builder',description:'Start with explicit amino-acid structures and inspect their stereochemistry.',compute:'Local structures; 3D generation and force-field inspection'}
 ];
 const SIDECHAINS=[['Alanine','N[C@@H](C)C(=O)O'],['Valine','N[C@@H](C(C)C)C(=O)O'],['Leucine','N[C@@H](CC(C)C)C(=O)O'],['Phenylalanine','N[C@@H](Cc1ccccc1)C(=O)O'],['Serine','N[C@@H](CO)C(=O)O'],['Cysteine','N[C@@H](CS)C(=O)O'],['Lysine','N[C@@H](CCCCN)C(=O)O'],['Glycine','NCC(=O)O'],['Norvaline','N[C@@H](CCC)C(=O)O'],['Norleucine','N[C@@H](CCCC)C(=O)O'],['Phenylglycine','N[C@@H](c1ccccc1)C(=O)O'],['Cyclohexylalanine','N[C@@H](CC1CCCCC1)C(=O)O']].map(([name,smiles])=>({name,smiles,scope:'Local starting structure; inspect the explicitly supplied stereochemistry.'}));
 function localADME(smiles){const mol=buildMolecule(parseSmiles(smiles)),d=describe(mol),v=evaluate(d),charged=mol.atoms.some(a=>a.charge),polar=tpsa(mol,{includeSulfurPhosphorus:true}),screen=boiledEgg({...d,tpsa:polar}),applicable=!charged&&!smiles.includes('.')&&Number.isFinite(d.logp)&&Number.isFinite(d.mw);return {formula:d.formula,mw:d.mw,tpsa:polar,wlogp:d.logp,esol:v.logS,bioavailability:v.bioavailability.score,hia:applicable?screen.hia:null,bbb:applicable?screen.bbb:null,logKp:applicable?0.71*d.logp-0.0061*d.mw-6.3:null,skinMethod:'Potts–Guy equation with local WLOGP; log10(cm/s). Not a measurement.',scope:applicable?'Local calculations for the supplied structure.':'Passive permeability screens withheld for charged or disconnected structures.'};}
 function vina(text){
  if(String(text).length>2097152)throw Error('Pose file limit is 2 MB.');const poses=[];let pose=null;
  const begin=()=>({model:poses.length+1,energy:null,rmsdLower:null,rmsdUpper:null,atoms:[]});
  for(const line of String(text).split(/\r?\n/)){
   if(/^MODEL\b/.test(line)){if(pose?.atoms.length)poses.push(pose);pose=begin();pose.model=Number(line.slice(5).trim())||poses.length+1;}
   else if(/^REMARK VINA RESULT:/.test(line)){pose=pose||begin();const values=line.split(':')[1].trim().split(/\s+/).map(Number);if(values.length<3||values.some(v=>!Number.isFinite(v)))throw Error('Invalid Vina result numbers.');[pose.energy,pose.rmsdLower,pose.rmsdUpper]=values;}
   else if(/^(ATOM  |HETATM)/.test(line)){pose=pose||begin();const fields=[line.slice(30,38),line.slice(38,46),line.slice(46,54)], [x,y,z]=fields.map(Number);if(fields.some(s=>!s.trim())||[x,y,z].some(v=>!Number.isFinite(v)||Math.abs(v)>100000)||line.length<54)throw Error('Invalid atom coordinates.');pose.atoms.push({x,y,z,label:line.slice(12,16).trim(),type:line.trim().split(/\s+/).at(-1)});if(pose.atoms.length>10000)throw Error('Atom limit is 10,000 per pose.');}
   else if(/^ENDMDL/.test(line)){if(pose?.atoms.length)poses.push(pose);pose=null;}
   if(poses.length>200)throw Error('Pose limit is 200.');
  }if(pose?.atoms.length)poses.push(pose);if(poses.length>200)throw Error('Pose limit is 200.');if(!poses.length)throw Error('No PDBQT/PDB atom coordinates were found.');return poses;
 }
 function mol2(text){
  if(String(text).length>1048576)throw Error('Mol2 limit is 1 MB.');let section='',atoms=[],bonds=0;
  for(const line of String(text).split(/\r?\n/)){if(line.startsWith('@<TRIPOS>')){section=line.slice(9).trim();continue;}if(!line.trim()||line.startsWith('#'))continue;
   if(section==='ATOM'){const f=line.trim().split(/\s+/),coords=f.slice(2,5).map(Number);if(f.length<6||coords.some(n=>!Number.isFinite(n)))throw Error('Invalid Mol2 atom.');atoms.push({id:Number(f[0]),type:f[5],coordinates:coords,charge:f[8]===undefined?null:Number(f[8])});}else if(section==='BOND')bonds++;
  }if(!atoms.length||atoms.length>10000||new Set(atoms.map(a=>a.id)).size!==atoms.length||atoms.some(a=>!Number.isInteger(a.id)||a.charge!==null&&!Number.isFinite(a.charge)))throw Error('Invalid or empty Mol2 atom block.');
  return {atoms:atoms.length,bonds,hydrogens:atoms.filter(a=>/^H(?:\.|$)/.test(a.type)).length,partialCharge:atoms.every(a=>a.charge!==null)?atoms.reduce((n,a)=>n+a.charge,0):null,coordinateScope:atoms.every(a=>a.coordinates[2]===0)?'All z coordinates are zero; verify that a suitable 3D conformation was prepared.':'Coordinates present; 3D geometry and force-field suitability are not validated.'};
 }

 function smi(molecules){return molecules.map(m=>m.smiles+'\t'+String(m.name||'Molecule').replace(/[\r\n\t]/g,' ')).join('\n')+'\n';}
 root.ResearchTools={MODULES,SIDECHAINS,localADME,vina,mol2,smi};
})(globalThis);
