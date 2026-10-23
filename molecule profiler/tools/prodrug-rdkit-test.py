#!/usr/bin/env python3
"""Independent optional graph check. Requires Node.js and Python RDKit."""
import json
import subprocess
from pathlib import Path
from rdkit import Chem, rdBase

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = [
    'CCO', 'Oc1ccccc1', 'CC(=O)O', 'CC(=O)[O-]', 'CCN', 'CCNC',
    'N1CCCCC1', 'CN1CCCCC1', 'CCN(C)C', 'CC[NH3+]', 'CC[NH2+]C',
    'CC[NH+](C)C', '[NH3+]CC(=O)[O-]', '[15NH2]CC', '[13CH3]CO',
    'CC[18OH]', 'N[C@H](C)F', 'C[C@H](O)C(=O)O', 'NCCO',
    '[O-][N+](=O)c1ccc(O)cc1', 'NCc1ccccc1', 'CNCCc1ccccc1', 'CCS', 'CC[S-]', 'Sc1ccccc1', 'NCCS',
    'CC(=O)N', 'CNC(=O)C', 'O=C1NCCC1', 'O=C1NC(=O)CC1',
    'O=C1[N-]C(=O)CC1', 'c1ccncc1', 'c1cc[nH+]cc1', '[O-]c1ccccc1',
    'CC[O-]', '[Cl-].CC[NH3+]', '[Na+].CC(=O)[O-]', '[Cl-].[NH3+][C@H](C)CO',
]
NODE = r"""
const fs=require('node:fs'),vm=require('node:vm');
for(const name of ['smiles','mol','smarts','stereo','transform','pharmacology','prodrug-candidates'])
 vm.runInThisContext(fs.readFileSync('js/'+name+'.js','utf8'));
const input=JSON.parse(fs.readFileSync(0,'utf8'));
console.log(JSON.stringify(input.map(smiles=>({smiles,report:ProdrugCandidates.generate(buildMolecule(parseSmiles(smiles)))}))));
"""
reports = json.loads(subprocess.check_output(['node', '-e', NODE], input=json.dumps(FIXTURES).encode(), cwd=ROOT))
checked = 0
for fixture in reports:
    parent = Chem.MolFromSmiles(fixture['smiles'])
    assert parent is not None
    parent_key = Chem.MolToSmiles(parent, isomericSmiles=True)
    if fixture['report'].get('normalization'):
        fragments = [m for m in Chem.GetMolFrags(parent, asMols=True) if any(a.GetAtomicNum() == 6 for a in m.GetAtoms())]
        assert len(fragments) == 1
        parent_key = Chem.MolToSmiles(fragments[0], isomericSmiles=True)
        normalized = Chem.MolFromSmiles(fixture['report']['normalization']['parentSmiles'])
        assert Chem.MolToSmiles(normalized, isomericSmiles=True) == parent_key
    rows = fixture['report']['rows']
    assert rows, fixture['smiles']
    seen = set()
    for row in rows:
        candidate = Chem.MolFromSmiles(row['smiles'])
        recovered = Chem.MolFromSmiles(row['recoveredParentSmiles'])
        assert candidate is not None, row
        assert recovered is not None, row
        candidate_key = Chem.MolToSmiles(candidate, isomericSmiles=True)
        attachment = row['attachment']
        assert candidate.GetBondBetweenAtoms(attachment['parentAtom'], attachment['promoietyAtom']) is not None, row
        assert candidate_key != parent_key and candidate_key not in seen, row
        assert len(Chem.GetMolFrags(candidate)) == 1, row
        assert Chem.MolToSmiles(recovered, isomericSmiles=True) == parent_key, row
        seen.add(candidate_key)
        checked += 1
print(f'RDKit {rdBase.rdkitVersion}: {checked} candidates across {len(FIXTURES)} parents sanitized, distinct and independently matched to their recovered isotope/stereo/charge identity.')
