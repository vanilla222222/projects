#!/usr/bin/env python3
"""Independent product identity, atom/isotope and net reaction bookkeeping checks."""
import json
import subprocess
from collections import Counter
from pathlib import Path
from rdkit import Chem, rdBase
ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ['COc1ccccc1','CCOc1ccccc1','CC(C)Oc1ccccc1','COC','COCc1ccccc1','C1COCC1','CC(=O)Oc1ccccc1','O=C1OCCC1','COC(=O)OC','CNC(=O)Oc1ccccc1','CSC(=O)C','COC(C)OC','c1ccc2c(c1)OCO2','CO[C@H](C)OCC','CSSC','S1SCCC1','[13CH3]Oc1ccccc1','C[18O]c1ccccc1','COc1ccc(C[C@H](N)C)cc1','[Cl-].COc1ccc(CC[NH3+])cc1']
NODE = r"""
const fs=require('node:fs'),vm=require('node:vm');
for(const name of ['smiles','mol','smarts','stereo','transform','pharmacology','prodrug-candidates','cleavable-groups'])vm.runInThisContext(fs.readFileSync('js/'+name+'.js','utf8'));
console.log(JSON.stringify(JSON.parse(fs.readFileSync(0,'utf8')).map(s=>{const m=buildMolecule(parseSmiles(s));return {smiles:s,rows:CleavableGroups.pathways(m).map(p=>CleavableGroups.preview(m,p.id,p.atoms[0]))};})));
"""
data = json.loads(subprocess.check_output(['node','-e',NODE],input=json.dumps(FIXTURES).encode(),cwd=ROOT))
def composition(m):
    m = Chem.AddHs(m)
    return Counter((a.GetAtomicNum(),a.GetIsotope()) for a in m.GetAtoms())
checked = 0
for fixture in data:
    parent = Chem.MolFromSmiles(fixture['smiles'])
    assert parent is not None and fixture['rows'], fixture['smiles']
    for row in fixture['rows']:
        assert row['status']=='predicted-products' and row['inputRegenerated'] is False, row
        expected_parent = parent
        if row['normalization']:
            fragments=[m for m in Chem.GetMolFrags(parent,asMols=True) if any(a.GetAtomicNum()==6 for a in m.GetAtoms())]
            assert len(fragments)==1
            expected_parent=fragments[0]
        expected = composition(expected_parent)
        kind = row['pathway']['kind']
        if kind != 'disulfide': expected[(8,0)]+=1
        if kind != 'ether': expected[(1,0)]+=2
        actual=Counter()
        for product in row['products']:
            mol=Chem.MolFromSmiles(product['smiles'])
            assert mol is not None, product
            actual.update(composition(mol))
        assert actual==expected, (fixture['smiles'],row,expected,actual)
        if fixture['smiles']=='COc1ccccc1':
            assert {Chem.MolToSmiles(Chem.MolFromSmiles(p['smiles'])) for p in row['products']}=={'C=O','Oc1ccccc1'}
        if fixture['smiles']=='COc1ccc(C[C@H](N)C)cc1':
            expected_phenol=Chem.MolToSmiles(Chem.MolFromSmiles('Oc1ccc(C[C@H](N)C)cc1'),isomericSmiles=True)
            assert any(Chem.MolToSmiles(Chem.MolFromSmiles(p['smiles']),isomericSmiles=True)==expected_phenol for p in row['products'])
        checked+=1
print(f'RDKit {rdBase.rdkitVersion}: {checked} pathways across {len(FIXTURES)} inputs passed product sanitization, isotope/atom and net reaction bookkeeping checks.')
