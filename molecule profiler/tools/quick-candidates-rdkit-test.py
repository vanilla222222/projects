#!/usr/bin/env python3
"""Independent validation of the expanded Quick candidate structures."""
import json
import subprocess
from pathlib import Path
from rdkit import Chem, rdBase
root=Path(__file__).resolve().parents[1]
data=json.loads(subprocess.check_output(['node','tools/quick-candidates-test.js','--json'],cwd=root))
checked=0
for fixture in data:
    parent=Chem.MolFromSmiles(fixture['parent'])
    assert parent is not None
    report=fixture['report']
    if report.get('normalization'):
        parent=Chem.MolFromSmiles(report['normalization']['parentSmiles'])
    parent_key=Chem.MolToSmiles(parent,isomericSmiles=True)
    seen=set()
    for row in report['rows']:
        mol=Chem.MolFromSmiles(row['smiles']);recovered=Chem.MolFromSmiles(row['recoveredParentSmiles'])
        assert mol is not None and recovered is not None,row
        assert not any(a.GetNumRadicalElectrons() for a in mol.GetAtoms()),row
        assert len(Chem.GetMolFrags(mol))==1,row
        key=Chem.MolToSmiles(mol,isomericSmiles=True)
        assert key!=parent_key and key not in seen,row
        seen.add(key)
        assert Chem.MolToSmiles(recovered,isomericSmiles=True)==parent_key,row
        a,b=row['attachment']['parentAtom'],row['attachment']['promoietyAtom']
        assert mol.GetBondBetweenAtoms(a,b) is not None,row
        if row['cleavage'].startswith('carbonyl-'):
            # Independently remove the complete C=N-derived branch and restore
            # a carbonyl oxygen. This also covers substituted oxime/hydrazone ends.
            edit=Chem.RWMol(mol);edit.RemoveBond(a,b)
            branch=next(set(g) for g in Chem.GetMolFrags(edit) if b in g)
            assert a not in branch,row
            anchor=a-sum(i<a for i in branch)
            for i in sorted(branch,reverse=True):edit.RemoveAtom(i)
            oxygen=edit.AddAtom(Chem.Atom('O'));edit.AddBond(anchor,oxygen,Chem.BondType.DOUBLE)
            restored=edit.GetMol();Chem.SanitizeMol(restored)
            assert Chem.MolToSmiles(restored,isomericSmiles=True)==parent_key,row
        checked+=1
print(f'RDKit {rdBase.rdkitVersion}: {checked} Quick candidates across {len(data)} inputs passed sanitization, canonical distinctness, attachment and recovered parent isotope/stereo/charge checks, with independent carbonyl-branch reversal.')
