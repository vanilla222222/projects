#!/usr/bin/env python3
"""Independent candidate/metabolite formula, graph and ordering checks."""
import json,subprocess
from pathlib import Path
from rdkit import Chem,rdBase
from rdkit.Chem import rdMolDescriptors
root=Path(__file__).resolve().parents[1]
rows=json.loads(subprocess.check_output(['node','tools/candidate-info-test.js','--json'],cwd=root))
products=0
for row in rows:
 m=Chem.MolFromSmiles(row['smiles']);assert m is not None
 assert row['info']['formula']==rdMolDescriptors.CalcMolFormula(m),(row['smiles'],row['info']['formula'])
 seen=set();weight=float('inf')
 for product in row['metabolites']['rows']:
  p=Chem.MolFromSmiles(product['smiles']);assert p is not None,product
  assert not any(a.GetNumRadicalElectrons() for a in p.GetAtoms()),product
  assert product['formula']==rdMolDescriptors.CalcMolFormula(p),product
  assert product['heuristicWeight']<=weight;weight=product['heuristicWeight']
  key=Chem.MolToSmiles(p,isomericSmiles=True)
  assert key not in seen and key!=Chem.MolToSmiles(m,isomericSmiles=True),product
  seen.add(key);products+=1
 assert len(seen)<=3
print(f'RDKit {rdBase.rdkitVersion}: {len(rows)} candidate formulas and {products} predicted product graphs/formulas passed independent validation.')
