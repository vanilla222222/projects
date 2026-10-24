#!/usr/bin/env python3
"""Independent sanitization, graph uniqueness and exact edit/stereo parity."""
import json, subprocess
from pathlib import Path
from rdkit import Chem, rdBase
root=Path(__file__).resolve().parents[1]
fixtures=json.loads(subprocess.check_output(['node','tools/analogue-candidates-test.js','--json'],cwd=root))
count=0
for fixture in fixtures:
    parent=Chem.MolFromSmiles(fixture['parent'])
    assert parent is not None
    seen=set()
    for row in fixture['report']['rows']:
        candidate=Chem.MolFromSmiles(row['smiles'])
        assert candidate is not None,(fixture['parent'],row)
        canonical=Chem.MolToSmiles(candidate,isomericSmiles=True)
        assert canonical not in seen,('duplicate graph',fixture['parent'],row)
        seen.add(canonical)
        if row['operation']=='append':
            fragment=Chem.MolFromSmiles(row['fragment'])
            expected=Chem.RWMol(Chem.CombineMols(parent,fragment))
            site=expected.GetAtomWithIdx(row['site']['atom'])
            if site.GetNumExplicitHs():site.SetNumExplicitHs(site.GetNumExplicitHs()-1)
            anchor=expected.GetAtomWithIdx(parent.GetNumAtoms())
            if anchor.GetNumExplicitHs():anchor.SetNumExplicitHs(anchor.GetNumExplicitHs()-1)
            expected.AddBond(row['site']['atom'],parent.GetNumAtoms(),Chem.BondType.SINGLE)
        else:
            expected=Chem.RWMol(parent)
            site=expected.GetAtomWithIdx(row['site']['atom'])
            site.SetAtomicNum(Chem.GetPeriodicTable().GetAtomicNumber(row['replacement']['element']))
            site.SetNumExplicitHs(row['replacement']['hydrogens'])
        expected=expected.GetMol()
        Chem.SanitizeMol(expected)
        assert canonical==Chem.MolToSmiles(expected,isomericSmiles=True),('edit/stereo mismatch',fixture['parent'],row['name'],canonical,Chem.MolToSmiles(expected,isomericSmiles=True))
        count+=1
print(f'RDKit {rdBase.rdkitVersion}: {count} analogues across {len(fixtures)} inputs sanitize, remain unique and match independent edits including isotope/stereo identity.')
