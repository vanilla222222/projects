"""Independent local compute. No remote services, Swiss models or credentials."""
import math
from pathlib import Path
from rdkit import Chem, rdBase, RDConfig, DataStructs
from rdkit.Chem import AllChem, Descriptors, Crippen, QED, rdMolDescriptors, BRICS, rdShapeAlign, rdFingerprintGenerator
from rdkit.Chem.FilterCatalog import FilterCatalog, FilterCatalogParams
import importlib.util

_spec=importlib.util.spec_from_file_location('local_sa',str(Path(RDConfig.RDContribDir)/'SA_Score'/'sascorer.py'))
_sa=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_sa)

def molecule(smiles):
 if not isinstance(smiles,str) or len(smiles)>4000:raise ValueError('Use a SMILES string of at most 4,000 characters.')
 mol=Chem.MolFromSmiles(smiles)
 if mol is None or mol.GetNumHeavyAtoms()>120 or mol.GetNumHeavyAtoms()==0 or len(Chem.GetMolFrags(mol))!=1:raise ValueError('Use one valid connected molecule with 1–120 heavy atoms.')
 if any(a.GetNumRadicalElectrons() for a in mol.GetAtoms()):raise ValueError('Radicals are outside this compute subset.')
 if any(a.GetAtomicNum() not in (1,5,6,7,8,9,14,15,16,17,35,53) for a in mol.GetAtoms()):raise ValueError('This compute subset supports H, B, C, N, O, F, Si, P, S, Cl, Br and I.')
 return mol

def capabilities():
 import importlib.util
 return {'project':'Molecule Profiler','engine':'independent-local-v1','rdkit':rdBase.rdkitVersion,'available':['adme','conformers','forcefield','screen','fragments','replace'], 'docking':all(importlib.util.find_spec(p) is not None for p in ['vina','meeko','gemmi']), 'unavailable':{'cypInhibition':'No trained model supplied.','pgpSubstrate':'No trained model supplied.','clinicalMetaboliteAbundance':'No calibrated abundance model supplied.'},'privacy':'All structures are processed on this server; no remote services are contacted.'}

def analysis(data):
 mol=molecule(data.get('smiles'));logp=Crippen.MolLogP(mol);mw=Descriptors.MolWt(mol)
 params=FilterCatalogParams()
 for group in [FilterCatalogParams.FilterCatalogs.PAINS,FilterCatalogParams.FilterCatalogs.BRENK,FilterCatalogParams.FilterCatalogs.NIH,FilterCatalogParams.FilterCatalogs.ZINC]:params.AddCatalog(group)
 catalog=FilterCatalog(params)
 alerts=[{'name':e.GetDescription(),'catalog':e.GetProp('FilterSet') if 'FilterSet' in e.GetPropList() else 'RDKit filter'} for e in catalog.GetMatches(mol)]
 return {'smiles':Chem.MolToSmiles(mol),'formula':rdMolDescriptors.CalcMolFormula(mol),'mw':mw,'logp':logp,'tpsa':rdMolDescriptors.CalcTPSA(mol,includeSandP=True),'qed':QED.qed(mol),'syntheticAccessibility':_sa.calculateScore(mol),'skinLogKp':None if any(a.GetFormalCharge() for a in mol.GetAtoms()) else 0.71*logp-0.0061*mw-6.3,'alerts':alerts,'stereocenters':[{'atom':i+1,'configuration':label} for i,label in Chem.FindMolChiralCenters(mol,includeUnassigned=True)],'scope':'Calculated descriptors and empirical scores. SA is not a synthesis route or reaction-yield prediction; alerts are not a safety verdict.'}

def conformer(smiles,count=1):
 mol=Chem.AddHs(molecule(smiles));params=AllChem.ETKDGv3();params.randomSeed=20261023;params.numThreads=1;params.maxIterations=400
 ids=list(AllChem.EmbedMultipleConfs(mol,numConfs=count,params=params))
 if not ids:raise ValueError('3D embedding failed; no coordinates fabricated.')
 if AllChem.MMFFHasAllMoleculeParams(mol):method='MMFF94';out=AllChem.MMFFOptimizeMoleculeConfs(mol,numThreads=1,maxIters=300)
 elif AllChem.UFFHasAllMoleculeParams(mol):method='UFF';out=AllChem.UFFOptimizeMoleculeConfs(mol,numThreads=1,maxIters=300)
 else:raise ValueError('No complete MMFF94 or UFF parameter coverage for this molecule.')
 ranked=sorted(zip(ids,out),key=lambda v:v[1][1]);return mol,method,ranked

def conformers(data):
 raw=data.get('count',5)
 if isinstance(raw,bool) or not isinstance(raw,(int,float)) or not math.isfinite(raw) or int(raw)!=raw:raise ValueError('Conformer count must be an integer.')
 count=int(raw)
 if count<1 or count>10:raise ValueError('Generate 1–10 conformers.')
 mol,method,ranked=conformer(data.get('smiles'),count);props=AllChem.MMFFGetMoleculeProperties(mol) if method=='MMFF94' else None
 rows=[]
 for cid,(flag,energy) in ranked:
  conf=mol.GetConformer(cid);rows.append({'id':cid,'energy':energy,'converged':flag==0,'molblock':Chem.MolToMolBlock(mol,confId=cid),'atoms':[{'element':a.GetSymbol(),'x':conf.GetAtomPosition(a.GetIdx()).x,'y':conf.GetAtomPosition(a.GetIdx()).y,'z':conf.GetAtomPosition(a.GetIdx()).z} for a in mol.GetAtoms()]})
 atoms=[{'atom':a.GetIdx()+1,'element':a.GetSymbol(),'type':props.GetMMFFAtomType(a.GetIdx()) if props else None,'partialCharge':props.GetMMFFPartialCharge(a.GetIdx()) if props else None} for a in mol.GetAtoms()]
 bonds=[]
 for b in mol.GetBonds():
  i,j=b.GetBeginAtomIdx(),b.GetEndAtomIdx();p=props.GetMMFFBondStretchParams(mol,i,j) if props else AllChem.GetUFFBondStretchParams(mol,i,j)
  bonds.append({'a':i+1,'b':j+1,'order':b.GetBondTypeAsDouble(),'stretchParameters':list(p) if p else None})
 return {'method':method,'conformers':rows,'forcefield':{'atoms':atoms,'bonds':bonds,'scope':'MMFF atom types/charges and bond-stretch parameters, or available UFF bond parameters. This is not a complete simulation topology.'},'scope':'Generated gas-phase conformers; relative energies are comparable only within this molecule and force field. No bound pose is established.'}

def screen(data):
 refs=data.get('references',[])
 if not isinstance(refs,list) or not 1<=len(refs)<=20:raise ValueError('Provide 1–20 reference molecules.')
 query,_,qrank=conformer(data.get('smiles'));query=Chem.RemoveHs(query);gen=rdFingerprintGenerator.GetMorganGenerator(radius=2,fpSize=2048);qfp=gen.GetFingerprint(query);rows=[]
 for item in refs:
  try:
   ref,_,_=conformer(item.get('smiles'));ref=Chem.RemoveHs(ref)
   shape,color=rdShapeAlign.AlignMol(query,ref,useColors=True)
   rows.append({'name':str(item.get('name','Reference')),'smiles':item['smiles'],'tanimoto2D':DataStructs.TanimotoSimilarity(qfp,gen.GetFingerprint(ref)),'shape3D':shape,'color3D':color})
  except Exception:rows.append({'name':str(item.get('name','Reference')),'smiles':str(item.get('smiles','')),'error':'Reference could not be embedded or aligned.'})
 rows.sort(key=lambda r:r.get('shape3D',-1),reverse=True)
 return {'rows':rows,'scope':'One generated conformer per molecule; shape ordering is not a target probability, affinity or activity prediction.'}

def fragments(data):
 mol=molecule(data.get('smiles'));parts=sorted(BRICS.BRICSDecompose(mol));return {'fragments':parts,'scope':'BRICS retrosynthetic fragments; no biological equivalence or synthesis route is established.'}

def replace(data):
 mol=molecule(data.get('smiles'));query=Chem.MolFromSmarts(str(data.get('query','')));repl=molecule(data.get('replacement'))
 if query is None or query.GetNumAtoms()==0:raise ValueError('Provide a valid fragment SMARTS.')
 matches=mol.GetSubstructMatches(query,useChirality=True);products=[];seen=set()
 for match in matches[:40]:
  selected=set(match);boundary=[b for b in mol.GetBonds() if (b.GetBeginAtomIdx() in selected)!=(b.GetEndAtomIdx() in selected)]
  if len(boundary)!=1:continue
  # Edit exactly this match, avoiding a different symmetric occurrence.
  anchor=boundary[0].GetBeginAtomIdx() if boundary[0].GetBeginAtomIdx() in selected else boundary[0].GetEndAtomIdx()
  sub=Chem.RWMol(mol)
  outside=boundary[0].GetOtherAtomIdx(anchor);bondtype=boundary[0].GetBondType()
  # A new neighbor ordering must not silently invert the attachment center.
  attachmentStereoCleared=sub.GetAtomWithIdx(outside).GetChiralTag()!=Chem.ChiralType.CHI_UNSPECIFIED
  sub.GetAtomWithIdx(outside).SetChiralTag(Chem.ChiralType.CHI_UNSPECIFIED)
  for adjacent in sub.GetAtomWithIdx(outside).GetBonds():
   adjacent.SetStereo(Chem.BondStereo.STEREONONE)
   adjacent.SetBondDir(Chem.BondDir.NONE)
  keep=[i for i in range(mol.GetNumAtoms()) if i not in selected];outsideNew=keep.index(outside)
  for i in sorted(selected,reverse=True):sub.RemoveAtom(i)
  merged=Chem.RWMol(Chem.CombineMols(sub.GetMol(),repl));merged.AddBond(outsideNew,len(keep),bondtype)
  try:
   product=merged.GetMol();Chem.SanitizeMol(product);smiles=Chem.MolToSmiles(product,isomericSmiles=True)
   if smiles in seen:continue
   seen.add(smiles);products.append({'smiles':smiles,'removedAtoms':[i+1 for i in match],'attachmentStereochemistryCleared':attachmentStereoCleared})
  except Exception:continue
 return {'products':products[:20],'scope':'Single-boundary graph replacements attached through replacement atom 1; attachment-center stereochemistry is cleared for review. No bioisosteric activity or experimental evidence is implied.'}

def docking(data):
 from vina import Vina
 from meeko import MoleculePreparation,PDBQTWriterLegacy
 import tempfile
 receptor=data.get('receptor','');center=data.get('center');size=data.get('size')
 if not isinstance(receptor,str) or len(receptor)>2097152 or not any(line.startswith(('ATOM  ','HETATM')) for line in receptor.splitlines()):raise ValueError('Provide a prepared receptor PDBQT file of at most 2 MB.')
 for vector in [center,size]:
  if not isinstance(vector,list) or len(vector)!=3 or any(not isinstance(x,(int,float)) or not math.isfinite(x) for x in vector):raise ValueError('Provide three finite center and box-size values.')
 if any(x<=0 or x>30 for x in size) or math.prod(size)>27000 or any(abs(x)>10000 for x in center):raise ValueError('Box dimensions must be positive and at most 30 Å.')
 mol,_,_=conformer(data.get('smiles'));setup=MoleculePreparation().prepare(mol)[0];ligand,ok,message=PDBQTWriterLegacy.write_string(setup)
 if not ok:raise ValueError('Ligand PDBQT preparation failed: '+str(message))
 with tempfile.TemporaryDirectory(prefix='molecule-profiler-') as directory:
  path=Path(directory)/'receptor.pdbqt';path.write_text(receptor)
  v=Vina(sf_name='vina',cpu=1,seed=20261023,verbosity=0);v.set_receptor(str(path));v.set_ligand_from_string(ligand);v.compute_vina_maps(center=center,box_size=size);v.dock(exhaustiveness=1,n_poses=5)
  poses=v.poses(n_poses=5);energies=v.energies(n_poses=5).tolist()
 return {'poses':poses,'energies':energies,'method':'AutoDock Vina; exhaustiveness 1, up to 5 poses, one CPU, deterministic seed','scope':'Exploratory docking on the supplied prepared receptor. Receptor preparation, protonation and box choice remain user responsibilities. Scores are not experimental affinities.'}

ACTIONS={'analyze':analysis,'conformers':conformers,'screen':screen,'fragments':fragments,'replace':replace,'dock':docking}
