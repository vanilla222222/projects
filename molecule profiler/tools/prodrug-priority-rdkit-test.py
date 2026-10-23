#!/usr/bin/env python3
"""Independently check routes selected by the bounded research review search."""
import json
import subprocess
from collections import Counter
from pathlib import Path
from rdkit import Chem, rdBase
root=Path(__file__).resolve().parents[1]
reports=json.loads(subprocess.check_output(['node','tools/prodrug-priority-test.js','--json'],cwd=root))
def mol(s):
    m=Chem.MolFromSmiles(s)
    assert m is not None,s
    return m
def key(s): return Chem.MolToSmiles(mol(s),isomericSmiles=True)
def composition(m): return Counter((a.GetAtomicNum(),a.GetIsotope()) for a in Chem.AddHs(m).GetAtoms())
steps=routes=0
for fixture in reports:
    row=fixture['review'];route=row['route']['route']
    if route is None:
        assert row['byproducts'] is None and row['concernMatches'] is None
        continue
    routes+=1
    for step in route['steps']:
        before=mol(step['consumed']['smiles']);expected=composition(before);kind=step['pathway']['kind']
        if kind not in ('hydroxymethyl-linker','nh-hydroxymethyl','carbamic-acid'):
            if kind not in ('disulfide','n-oxide'): expected[(8,0)]+=1
            if kind!='ether': expected[(1,0)]+=2
        actual=Counter();charge=0
        for p in step['products']:
            m=mol(p['smiles']);actual.update(composition(m));charge+=Chem.GetFormalCharge(m)
        assert expected==actual,(fixture,step,expected,actual)
        assert charge==Chem.GetFormalCharge(before),step
        steps+=1
    frontier=[key(p['smiles']) for p in route['frontier']]
    assert key(fixture['parent']) in frontier,fixture
    frontier.remove(key(fixture['parent']))
    reported=[]
    for p in row['byproducts']: reported += [key(p['smiles'])]*p['equivalents']
    assert sorted(frontier)==sorted(reported),fixture
print(f'RDKit {rdBase.rdkitVersion}: {routes} automatically found routes / {steps} steps passed independent product, charge, atom/isotope balance and parent stereo checks; all remaining fragment equivalents match the research report.')
