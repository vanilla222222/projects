#!/usr/bin/env python3
"""Structural motif boundaries; no pharmacology inferred from substructure."""
import importlib.util
import json
from pathlib import Path
import unittest
from rdkit import Chem

ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
    spec=importlib.util.spec_from_file_location(name,ROOT/path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module

tax=load('structural_taxonomy','tools/library-taxonomy.py')
builder=load('structural_tag_builder','tools/build-library-tags.py')
CASES={
 'Quinuclidine scaffolds': {
  'yes':['N12CCC(CC1)CC2','[NH+]12CCC(CC1)CC2','C[N+]12CCC(CC1)CC2','CC(=O)[N+]12CCC(CC1)CC2','O[C@H]1CN2CCC1CC2','O[C@@H]1CN2CCC1CC2'],
  'no':['CN1C2CCC1CC2','N1CCCC1','N1CCCCC1','N12CCCCC1CC2','O=C1CN2CCC1CC2','C1CCNCC1']},
 '1,4-Dihydropyridine scaffolds': {
  'yes':['N1C=CCC=C1','CN1C=CCC=C1','[NH2+]1C=CCC=C1','C[N+]1(C)C=CCC=C1','CC(=O)N1C=CCC=C1','N1C(C)=C[C@H](C)C=C1','N1C(C)=C[C@@H](C)C=C1'],
  'no':['n1ccccc1','N1CCCCC1','N1CC=CC=C1','N1C=CC(=O)C=C1','N1C=CCCC=C1','N1C=CC=C1']},
 'Diphenylmethane scaffolds': {
  'yes':['c1ccccc1Cc1ccccc1','CN(C)C(c1ccccc1)c1ccccc1','Cl[C@H](c1ccccc1)c1ccc(F)cc1','C[N+](C)(C)C(c1ccccc1)c1ccccc1'],
  'no':['c1ccccc1-c1ccccc1','c1ccccc1CCc1ccccc1','O=C(c1ccccc1)c1ccccc1']},
 'Tetralin scaffolds': {
  'yes':['c1ccc2c(c1)CCCC2','N[C@H]1CCCc2ccccc21','[NH3+][C@@H]1CCCc2ccccc21'],
  'no':['c1ccc2ccccc2c1','c1ccc2c(c1)CCC2','c1ccc2c(c1)CCCCC2','c1ccc2c(c1)CCCO2','O=C1CCCc2ccccc21']},
 '2,3-Dihydrobenzofuran scaffolds': {
  'yes':['c1ccc2c(c1)CCO2','C[C@H]1COc2ccccc21','[NH3+]C[C@@H]1COc2ccccc21'],
  'no':['c1ccc2occc2c1','c1ccc2c(c1)CCCO2','c1ccc2c(c1)CO2','O=C1COc2ccccc21']},
 'Tetrahydroisoquinoline scaffolds': {
  'yes':['c1ccc2c(c1)CNCC2','C[N+]1(C)CCc2ccccc2C1','C[C@H]1NCCc2ccccc21','C[C@@H]1[NH2+]CCc2ccccc21'],
  'no':['c1ccc2cnccc2c1','c1ccc2c(c1)CCCN2','c1ccc2c(c1)CNC2','O=C1NCCc2ccccc21']},
 'Chromane scaffolds': {
  'yes':['c1ccc2c(c1)CCCO2','C[C@H]1CCc2ccccc2O1','[NH3+]C[C@@H]1CCc2ccccc2O1'],
  'no':['c1ccc2occc2c1','c1ccc2c(c1)CCO2','c1ccc2c(c1)CCCCO2','O=C1CCOc2ccccc21']},
}

class ChemicalClassTagsTest(unittest.TestCase):
 def test_distinct_definitions_across_taxonomy_expansion_and_composed(self):
    expansion=load('structural_expansion','tools/library-expansion-50.py')
    composed=json.loads((ROOT/'data/family-definitions.json').read_text())['definitions']
    names=[name for name,_ in tax.RINGS+tax.SERIES+expansion.DEFINITIONS]+[d['name'] for d in composed]
    self.assertEqual(len(names),len(set(names)), 'Structural definitions must not duplicate composed family names')
    for name in CASES:self.assertEqual(names.count(name),1)
    self.assertEqual(names.count('1,3-Benzodioxoles'),1)

 def test_positive_negative_stereo_charge_and_ring_boundaries(self):
    patterns=dict(tax.compile_patterns(tax.RINGS+tax.SERIES))
    for name,groups in CASES.items():
     for expected,smiles_list in [(True,groups['yes']),(False,groups['no'])]:
      for smiles in smiles_list:
       with self.subTest(name=name,smiles=smiles):
        mol=Chem.MolFromSmiles(smiles);self.assertIsNotNone(mol)
        self.assertEqual(mol.HasSubstructMatch(patterns[name]),expected)
        tags=builder.tags_for({'name':'Structural fixture','cls':'Test','smiles':smiles})
        self.assertEqual('Family motif: '+name in tags,expected)
        self.assertFalse(any(t.startswith(('Action:','Agonist:','Antagonist:','Receptor:')) for t in tags))

if __name__=='__main__':unittest.main()
