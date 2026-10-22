#!/usr/bin/env python3
"""Optional independent product sanitization/formula check. Requires RDKit and Node."""
import json
import pathlib
import subprocess
import sys
from rdkit import Chem, rdBase
from rdkit.Chem import rdMolDescriptors
root = pathlib.Path(__file__).resolve().parent.parent
run = subprocess.run(['node',str(root/'tools/metabolism-product-fixture.js')],cwd=root,
                     capture_output=True,text=True,check=True,timeout=120)
fixture = json.loads(run.stdout)
failures = []
for product in fixture['products']:
    mol = Chem.MolFromSmiles(product['smiles'])
    if mol is None:
        failures.append({**product,'issue':'RDKit sanitization failure'})
    elif rdMolDescriptors.CalcMolFormula(mol) != product['formula']:
        failures.append({**product,'issue':'Formula disagreement',
                         'rdkitFormula':rdMolDescriptors.CalcMolFormula(mol)})
print(json.dumps({'rdkit':rdBase.rdkitVersion,'products':len(fixture['products']),
                  'failures':failures,'scope':fixture['scope']},indent=2))
sys.exit(bool(failures))
