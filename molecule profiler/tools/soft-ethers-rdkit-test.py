#!/usr/bin/env python3
"""Independent identity and balanced ester / hemiacetal cascade verification."""
import json,subprocess
from collections import Counter
from pathlib import Path
from rdkit import Chem,rdBase
root=Path(__file__).resolve().parents[1]
rows=json.loads(subprocess.check_output(['node','tools/soft-ethers-test.js','--json'],cwd=root))
def mol(s):
 m=Chem.MolFromSmiles(s)
 assert m is not None,s
 assert all(a.GetNumRadicalElectrons()==0 for a in m.GetAtoms()),s
 return m
def key(s):return Chem.MolToSmiles(mol(s),isomericSmiles=True)
def composition(m):return Counter((a.GetAtomicNum(),a.GetIsotope()) for a in Chem.AddHs(m).GetAtoms())
seen={}
for row in rows:
 candidate=mol(row['smiles']);target=mol(row['releaseTargetSmiles'])
 assert key(row['releaseTargetSmiles']) not in [key(s) for s in row['input'].split('.')]
 # Every proposed neutral ether oxygen stays two-coordinate; no oxonium acylation.
 assert all(a.GetDegree()<=2 for a in candidate.GetAtoms() if a.GetAtomicNum()==8 and a.GetFormalCharge()==0)
 seen.setdefault(row['input'],[]).append(key(row['smiles']))
 for step in row['route']['steps']:
  before=mol(step['consumed']['smiles']);expected=composition(before)
  if step['pathway']['kind']=='ester':expected[(8,0)]+=1;expected[(1,0)]+=2
  else:assert step['pathway']['kind']=='ether-hemiacetal'
  products=[mol(p['smiles']) for p in step['products']];actual=Counter()
  for m in products:actual.update(composition(m))
  assert actual==expected,(row['input'],step)
  assert sum(Chem.GetFormalCharge(m) for m in products)==Chem.GetFormalCharge(before)
 assert key(row['releaseTargetSmiles']) in [key(p['smiles']) for p in row['route']['frontier']]
 if row['input']=='COc1ccccc1':assert key(row['releaseTargetSmiles'])==key('Oc1ccccc1')
 if row['input']=='COc1ccc(C[C@H](N)C)cc1':assert key(row['releaseTargetSmiles'])==key('Oc1ccc(C[C@H](N)C)cc1')
 if row['input']=='COc1ccc(/C=C/C)cc1':assert key(row['releaseTargetSmiles'])==key('Oc1ccc(/C=C/C)cc1')
 if row['input']=='CO[C@H](C)CC':assert key(row['releaseTargetSmiles'])==key('O[C@H](C)CC')
# Symmetry-equivalent input sites may produce identical graphs; variants at each bond remain distinct.
for input,keys in seen.items():assert len(set(keys))>=7,input
print(f'RDKit {rdBase.rdkitVersion}: {len(rows)} ester-triggered ether redesigns and {2*len(rows)} release steps passed sanitization, target identity, isotope/atom and charge balance.')
