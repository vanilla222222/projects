#!/usr/bin/env python3
"""Offline numerical, identity and provenance checks for local RDKit descriptors."""
import hashlib
import importlib.util
import json
import subprocess
import unittest
from pathlib import Path
from rdkit import Chem, rdBase
from rdkit.Chem import Descriptors, Crippen, Lipinski, rdMolDescriptors

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('chembl_properties_builder', ROOT/'tools/build-chembl-properties.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class PropertiesTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        code = "const raw=require('./data/library.js').LIBRARY,curated=require('./js/curated-references.js'),references=require('./data/curated-references.js').CURATED_REFERENCES;console.log(JSON.stringify({data:require('./data/chembl-properties.js').CHEMBL_CALCULATED_PROPERTIES,library:curated.library(raw,references),rawLibrary:raw,references,annotations:require('./data/receptor-ligand-annotations.js').RECEPTOR_LIGAND_ANNOTATIONS}));"
        cls.current = json.loads(subprocess.check_output(['node','-e',code], cwd=ROOT, text=True))
        cls.data = cls.current['data']

    def test_all_effective_keys_and_associated_chembl_graphs(self):
        by_name = {e['name']:e for e in self.current['library']}
        annotations = [a for a in self.current['annotations'] if a.get('chemblMoleculeId')]
        self.assertEqual(set(self.data['entries']), set(by_name))
        self.assertEqual(self.data['chemblEntryCount'],len({a['ligandName'] for a in annotations}))
        self.assertEqual(self.data['entryCount'], len(self.data['entries']))
        self.assertEqual(self.data['annotationCount'],len(annotations))
        for name,record in self.data['entries'].items():
            self.assertEqual(record['librarySmiles'],by_name[name]['smiles'])
            matched = [a for a in annotations if a['ligandName']==name]
            self.assertEqual(record['chemblMoleculeIds'],sorted({a['chemblMoleculeId'] for a in matched}))
            self.assertEqual(record['sourceReleases'],sorted({a['sourceRelease'] for a in matched if a.get('sourceRelease')}))
            self.assertEqual(record['annotationCount'],len(matched))
            self.assertTrue(all(a['librarySmiles']==record['librarySmiles'] for a in matched))

    def test_reviewed_replacements_and_overlay_entries(self):
        raw={e['name']:e for e in self.current['rawLibrary']}
        for fix in self.current['references']['identityCorrections']:
            stored=self.data['entries'][fix['name']]['librarySmiles']
            self.assertEqual(stored,fix['after']['smiles'])
            self.assertNotEqual(stored,raw[fix['name']]['smiles'])
        for entry in self.current['references']['extraLibrary']:
            self.assertEqual(self.data['entries'][entry['name']]['librarySmiles'],entry['smiles'])

    def test_unannotated_entries_get_only_calculated_descriptors(self):
        ordinary={'name':'Unannotated reference','smiles':'CCO'}
        data=builder.build([ordinary],[],{})
        self.assertEqual(data['entryCount'],1)
        self.assertEqual(data['chemblEntryCount'],0)
        self.assertEqual(data['annotationCount'],0)
        record=data['entries'][ordinary['name']]
        self.assertEqual(record['calculated'],builder.descriptors('CCO'))
        self.assertEqual(record['chemblMoleculeIds'],[])
        self.assertEqual(record['sourceReleases'],[])
        self.assertEqual(record['annotationCount'],0)
        for key in ['evidence','tags','actions','measured_property']:
            self.assertNotIn(key,record)

    def test_independent_numerical_recalculation(self):
        self.assertEqual(self.data['rdkitVersion'], rdBase.rdkitVersion)
        for record in self.data['entries'].values():
            mol=Chem.MolFromSmiles(record['librarySmiles']); actual=record['calculated']
            expected={'molecularWeight':Descriptors.MolWt(mol),'exactMass':Descriptors.ExactMolWt(mol),
                'cLogP':Crippen.MolLogP(mol),'tpsa':rdMolDescriptors.CalcTPSA(mol,includeSandP=False),
                'hbd':Lipinski.NumHDonors(mol),'hba':Lipinski.NumHAcceptors(mol),
                'rotatableBonds':rdMolDescriptors.CalcNumRotatableBonds(mol,rdMolDescriptors.NumRotatableBondsOptions.Strict),
                'formalCharge':Chem.GetFormalCharge(mol),'heavyAtoms':rdMolDescriptors.CalcNumHeavyAtoms(mol)}
            self.assertEqual(set(actual),set(expected))
            for key,value in expected.items(): self.assertAlmostEqual(actual[key],value,delta=0.00000051)

    def test_known_values_and_salts_preserved(self):
        ethanol=builder.descriptors('CCO')
        self.assertAlmostEqual(ethanol['molecularWeight'],46.069,places=3)
        self.assertAlmostEqual(ethanol['tpsa'],20.23,places=2)
        self.assertEqual((ethanol['hbd'],ethanol['hba'],ethanol['heavyAtoms']),(1,1,3))
        ion=builder.descriptors('C[NH3+]'); salt=builder.descriptors('C[NH3+].[Cl-]')
        self.assertEqual(ion['formalCharge'],1);self.assertEqual(salt['formalCharge'],0)
        self.assertEqual(salt['heavyAtoms'],ion['heavyAtoms']+1)
        self.assertGreater(salt['molecularWeight'],ion['molecularWeight']+35)

    def test_stale_graph_missing_names_and_duplicates_fail_closed(self):
        entry={'name':'fixture','smiles':'CCO'}
        ann={'ligandName':'fixture','librarySmiles':'CCO','chemblMoleculeId':'CHEMBL1'}
        for library,annotations in [([], [ann]),([entry],[dict(ann,librarySmiles='CO')]),([entry,entry],[ann])]:
            with self.assertRaises(ValueError):builder.build(library,annotations,{})
        with self.assertRaises(ValueError):builder.descriptors('invalid(')

    def test_hashed_inputs_methods_and_calculated_scope(self):
        self.assertEqual(self.data['kind'],'locally_calculated_descriptors')
        self.assertIn('not ChEMBL-reported', self.data['label'])
        self.assertIn('no parent selection', self.data['scope'])
        self.assertEqual(set(self.data['methods']),set(builder.METHODS))
        for name in builder.INPUTS:
            self.assertEqual(self.data['sourceHashes'][name],hashlib.sha256((ROOT/name).read_bytes()).hexdigest())
        report=json.loads((ROOT/'validation/chembl-properties.json').read_text())
        self.assertEqual(report['dataSha256'],hashlib.sha256((ROOT/'data/chembl-properties.js').read_bytes()).hexdigest())

    def test_check_outputs_deterministic_and_readonly(self):
        names=(*builder.INPUTS,'data/chembl-properties.js','validation/chembl-properties.json')
        before={n:(ROOT/n).read_bytes() for n in names}
        for name,content in builder.outputs().items():self.assertEqual(content,before[name])
        self.assertEqual(before,{n:(ROOT/n).read_bytes() for n in names})

if __name__=='__main__':unittest.main()
