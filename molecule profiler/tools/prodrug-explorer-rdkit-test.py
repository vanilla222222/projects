#!/usr/bin/env python3
"""Independent full-cascade identity, charge, stereo and atom/isotope balance."""
import json
import subprocess
from collections import Counter
from pathlib import Path
from rdkit import Chem, rdBase
root=Path(__file__).resolve().parents[1]
routes=json.loads(subprocess.check_output(['node','tools/prodrug-explorer-test.js','--json'],cwd=root))
def mol(s):
    m=Chem.MolFromSmiles(s)
    assert m is not None,s
    return m
def composition(m): return Counter((a.GetAtomicNum(),a.GetIsotope()) for a in Chem.AddHs(m).GetAtoms())
def key(s): return Chem.MolToSmiles(mol(s),isomericSmiles=True)
steps=0
for fixture in routes:
    route=fixture['route']
    total=composition(mol(fixture['candidate']))
    total_charge=Chem.GetFormalCharge(mol(fixture['candidate']))
    for step in route['steps']:
        before=mol(step['consumed']['smiles'])
        expected=composition(before)
        if step['pathway']['kind'] in ('ester','phosphate'):
            expected[(8,0)]+=1;expected[(1,0)]+=2
            total[(8,0)]+=1;total[(1,0)]+=2
        actual=Counter();charge=0
        for p in step['products']:
            m=mol(p['smiles']);actual.update(composition(m));charge+=Chem.GetFormalCharge(m)
        assert expected==actual,(fixture['parent'],step,expected,actual)
        assert charge==Chem.GetFormalCharge(before),step
        steps+=1
    frontier=Counter()
    for p in route['frontier']: frontier.update(composition(mol(p['smiles'])))
    assert frontier==total,fixture
    assert sum(Chem.GetFormalCharge(mol(p['smiles'])) for p in route['frontier'])==total_charge,fixture
    assert key(fixture['parent']) in [key(p['smiles']) for p in route['frontier']],fixture
    if fixture['parent']=='CCN':
        assert {key(p['smiles']) for p in route['frontier']}=={key(s) for s in ['CCN','CC(=O)O','C=O','O=C=O']},fixture
print(f'RDKit {rdBase.rdkitVersion}: {steps} steps in {len(routes)} complete routes passed product sanitization, atom/isotope and charge balance, and independent parent stereo identity.')
