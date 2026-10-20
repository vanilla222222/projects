#!/usr/bin/env python3
"""Name/graph policy, structural tag examples, and stored-source verification."""
import importlib.util
import json
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]


def load(name,file):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name(file))
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module


names=load('names','curate-library-names.py')
tags=load('tags','build-library-tags.py')


class MetadataTests(unittest.TestCase):
    def test_name_preference_and_identifier_rejection(self):
        self.assertEqual(names.choose_name({'Title':'Aspirin','IUPACName':'2-acetyloxybenzoic acid'})[0],'Aspirin')
        self.assertEqual(names.choose_name({'Title':'CHEMBL123','IUPACName':'ethanol'})[0],'ethanol')
        self.assertFalse(names.usable_name('64-17-5'))
        self.assertEqual(names.choose_name({'Title':'CHEMBL123'}),('',''))

    def test_stereo_and_charge_are_not_silently_collapsed(self):
        a='N[C@H](C)C(=O)O';b='N[C@@H](C)C(=O)O'
        self.assertNotEqual(names.canonical(a),names.canonical(b))
        self.assertNotEqual(names.tautomer_family(a),names.tautomer_family(b))
        self.assertNotEqual(names.tautomer_family('CN(C)C'),names.tautomer_family('C[NH+](C)C'))

    def test_tautomer_names_need_explicit_qualification(self):
        self.assertNotEqual(names.canonical('CC(=O)C'),names.canonical('C=C(O)C'))
        self.assertEqual(names.tautomer_family('CC(=O)C'),names.tautomer_family('C=C(O)C'))

    def test_structural_tags(self):
        def entry(s):return {'name':'Example','cls':'Reference','smiles':s}
        aspirin=tags.tags_for(entry('CC(=O)Oc1ccccc1C(=O)O'))
        self.assertIn('Ester motif',aspirin);self.assertIn('Carboxylic acid motif',aspirin)
        self.assertIn('Aromatic',aspirin);self.assertNotIn('Amide motif',aspirin)
        methane=tags.tags_for(entry('C'))
        self.assertGreaterEqual(len(methane),10);self.assertIn('Rings: 0',methane)
        self.assertIn('Graph charge: positive',tags.tags_for(entry('C[NH+](C)C')))
        self.assertIn('Stereo: specified tetrahedral centers',tags.tags_for(entry('N[C@H](C)C(=O)O')))
        self.assertFalse(any(x.startswith('Binding:') for x in aspirin))

    def test_every_display_name_against_its_source_graph(self):
        code="const {LIBRARY:l}=require('./data/library'),{LIBRARY_NAME_METADATA:n}=require('./data/library-names');console.log(JSON.stringify({library:l,names:n.entries}));"
        data=json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT,text=True))
        library={e['name']:e for e in data['library']}
        report=json.loads((ROOT/'validation/library-name-provenance.json').read_text())
        sources={r['referenceId']:r for r in report['records']}
        for key,record in data['names'].items():
            self.assertEqual(record['librarySmiles'],library[key]['smiles'])
            source=sources[key]['sourceResponse']
            source_smiles=source.get('SMILES',source.get('IsomericSMILES',source.get('canonical_smiles')))
            if record.get('matchType')=='tautomer-standardized':
                self.assertIn('standardized form',record['nameKind'])
                self.assertEqual(names.Chem.MolToInchiKey(names.Chem.MolFromSmiles(record['librarySmiles'])),source['InChIKey'])
                self.assertEqual(names.tautomer_family(record['librarySmiles']),names.tautomer_family(source_smiles))
            else:
                self.assertEqual(names.canonical(record['librarySmiles']),names.canonical(source_smiles))
            expected=source.get('pref_name') or names.choose_name(source)[0]
            self.assertEqual(record['preferredName'],expected)


if __name__=='__main__':
    unittest.main()
