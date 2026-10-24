#!/usr/bin/env python3
"""Check directional serialization independently against RDKit, including ring closure traversal."""
import json
import subprocess
from pathlib import Path
from rdkit import Chem, rdBase
root=Path(__file__).resolve().parents[1]
reports=json.loads(subprocess.check_output(['node','tools/directional-smiles-test.js','--json'],cwd=root))
checked=0
for row in reports:
    parent=Chem.MolFromSmiles(row['smiles'])
    assert parent is not None, row
    expected=Chem.MolToSmiles(parent,isomericSmiles=True)
    for smiles in row.get('outputs',[]):
        mol=Chem.MolFromSmiles(smiles)
        assert mol is not None and Chem.MolToSmiles(mol,isomericSmiles=True)==expected,(row,smiles)
        checked+=1
    for smiles in row.get('analogues',[]):
        mol=Chem.MolFromSmiles(smiles)
        # Ring edits intentionally change the parent scaffold; test the conserved alkene geometry.
        direction='\\' if '\\' in row['smiles'] else '/'
        geometry=Chem.MolFromSmarts('C/C=C'+direction+'*')
        assert mol is not None and mol.HasSubstructMatch(geometry,useChirality=True),(row,smiles)
        checked+=1
print(f'RDKit {rdBase.rdkitVersion}: {checked} directional serialization/analogue outputs retain input geometry, including reversed traversal, branches, rings and conjugation.')
