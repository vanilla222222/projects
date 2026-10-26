#!/usr/bin/env python3
"""Independent offline checks for the pinned experimental FreeSolv enrichment."""
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from rdkit import Chem
from rdkit.Chem import rdMolDescriptors

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('freesolv_importer', Path(__file__).with_name('import-freesolv-properties.py'))
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)
EXPECTED = {
    'mobley_1873346': (-0.90, 0.20), 'mobley_2451097': (-4.10, 0.60),
    'mobley_2689721': (1.23, 0.60), 'mobley_296847': (-4.69, 0.60),
    'mobley_2996632': (-1.08, 0.60), 'mobley_313406': (-4.85, 0.60),
    'mobley_3867265': (-3.80, 0.60), 'mobley_4883284': (-5.49, 0.60),
    'mobley_6973347': (-2.94, 0.60), 'mobley_7295828': (-2.45, 0.60),
    'mobley_7326982': (-4.74, 0.60), 'mobley_7532833': (-3.88, 0.60),
}


def canonical(smiles):
    return Chem.MolToSmiles(Chem.MolFromSmiles(smiles), isomericSmiles=True)


class FreeSolvPropertiesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.table = ROOT / 'validation/sources/freesolv-database-134cd763.txt'
        cls.raw = cls.table.read_bytes()
        cls.source = {}
        for number, line in enumerate(cls.raw.decode().splitlines(), 1):
            if line and not line.startswith('#'):
                fields = [s.strip() for s in line.split(';')]
                cls.source[fields[0]] = (number, line, fields)
        cls.snapshot_path = ROOT / 'validation/sources/freesolv-properties-001.json'
        cls.snapshot_bytes = cls.snapshot_path.read_bytes()
        cls.snapshot = json.loads(cls.snapshot_bytes)
        cls.records = [json.loads(p.read_bytes()) for p in sorted((ROOT / 'data/curated-reference-entries').glob('property-freesolv-*.json'))]
        cls.library = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./data/library').LIBRARY))"], cwd=ROOT, text=True))
        cls.by_name = {e['name']: e for e in cls.library}

    def test_primary_table_bytes_and_blob(self):
        # Independently reconstruct Git's object header, not the importer's helper.
        self.assertEqual(len(self.raw), 144897)
        digest = hashlib.sha1(b'blob ' + str(len(self.raw)).encode() + b'\0' + self.raw).hexdigest()
        self.assertEqual(digest, '6c6dbf5d27e646db5a540288ece636f9c915f363')
        self.assertEqual(hashlib.sha256(self.raw).hexdigest(), self.snapshot['sourceSha256'])
        self.assertEqual(self.snapshot['sourceRevision'], '134cd763f95d54d818fc0618095aa01cbe470fc3')
        self.assertEqual(self.snapshot['sourceGitBlob'], digest)

    def test_experimental_columns_and_original_rows(self):
        self.assertEqual(len(self.records), 12)
        self.assertEqual(set(EXPECTED), {r['evidence'][0]['sourceId'] for r in self.records})
        for record in self.records:
            e = record['evidence'][0]
            number, raw_row, fields = self.source[e['sourceId']]
            self.assertEqual(len(fields), 10, 'Selected source rows must have the documented field layout')
            self.assertEqual(e['sourceRecord'], raw_row)
            self.assertIn(raw_row, self.snapshot['rows'])
            self.assertEqual(e['sourceRow'], number)
            self.assertEqual((e['value'], e['uncertainty']), EXPECTED[e['sourceId']])
            self.assertEqual(e['value'], float(fields[3]))
            self.assertEqual(e['uncertainty'], float(fields[4]))
            self.assertNotEqual(e['value'], float(fields[5]), 'Calculated GAFF values cannot be measurements')
            self.assertEqual(e['unit'], 'kcal/mol')
            self.assertEqual(e['relation'], '=')
            self.assertEqual(e['kind'], 'measured_property')
            self.assertEqual(e['experimentalReference'], fields[7])
            self.assertEqual(e['originalReference'], 'https://doi.org/' + fields[7])
            self.assertEqual(e['originalReferences'], [e['originalReference']])
            self.assertEqual(e['sourceSha256'], hashlib.sha256(self.snapshot_bytes).hexdigest())
            self.assertEqual(e['sourceTableSha256'], hashlib.sha256(self.raw).hexdigest())
            self.assertNotIn('action', e)
            self.assertNotIn('panel', record)

    def test_default_uncertainties_are_not_sd(self):
        defaults = []
        for record in self.records:
            e = record['evidence'][0]
            fields = self.source[e['sourceId']][2]
            expected = 'source-assigned default uncertainty' if 'assigned a default value' in fields[9] else 'source-reported estimate'
            self.assertEqual(e['uncertaintyKind'], expected)
            self.assertNotIn('sd', e)
            if 'default' in expected:
                defaults.append(e['sourceId'])
                self.assertEqual(e['uncertainty'], 0.60)
            else:
                self.assertEqual(e['sourceId'], 'mobley_1873346')
                self.assertEqual(e['uncertainty'], 0.20)
        self.assertEqual(len(defaults), 11)

    def test_identity_witnesses_reuse_exact_existing_graphs(self):
        ligands = {x['sourceId']: x for x in self.snapshot['ligands']}
        for record in self.records:
            c, e = record['compounds'][0], record['evidence'][0]
            row = self.source[e['sourceId']][2]
            source_mol = Chem.MolFromSmiles(row[1])
            existing = self.by_name[c['name']]
            self.assertEqual(canonical(c['smiles']), canonical(row[1]))
            self.assertEqual(canonical(existing['smiles']), canonical(row[1]))
            self.assertEqual(c['formula'], rdMolDescriptors.CalcMolFormula(source_mol))
            self.assertEqual(c['formula'], existing['formula'])
            self.assertEqual(c['inchiKey'], Chem.MolToInchiKey(source_mol))
            source_identity = c['identitySource']['sourceRecord']
            self.assertEqual(source_identity, ligands[e['sourceId']])
            self.assertEqual(source_identity['rawRow'], self.source[e['sourceId']][1])
            self.assertEqual(source_identity['sourceSMILES'], row[1])
            self.assertEqual(source_identity['smiles'], row[1])
            self.assertIn('RDKit-derived', source_identity['identifierOrigin'])
            self.assertEqual(c['identitySource']['sourceSha256'], hashlib.sha256(self.snapshot_bytes).hexdigest())
        self.assertEqual(canonical(self.by_name['Acetone']['smiles']), canonical(self.by_name['methyl methyl ketone']['smiles']))

    def test_conditions_are_not_invented_and_license_has_separate_revision(self):
        for record in self.records:
            e = record['evidence'][0]
            self.assertEqual(e['conditions']['temperature'], 'Not specified on this database row')
            self.assertEqual(e['conditions']['pH'], 'Not specified on this database row')
            self.assertIn('Gas to water', e['conditions']['phaseTransfer'])
            license_metadata = record['compounds'][0]['identitySource']['licenseMetadata']
            self.assertEqual(license_metadata['observedAtRevision'], '6c7d19b4b565537365ffd22006aa2cd4643200c6')
            self.assertNotEqual(license_metadata['observedAtRevision'], self.snapshot['sourceRevision'])
            self.assertIn('original source restrictions', license_metadata['scope'])

    def test_missing_or_conflicting_existing_identity_is_rejected(self):
        chosen_name = importer.SELECTION[0][1]
        with self.assertRaisesRegex(ValueError, 'refusing a new structure'):
            importer.build(library=[e for e in self.library if e['name'] != chosen_name])
        with self.assertRaisesRegex(ValueError, 'different graph'):
            importer.build(library=[{**e, 'smiles':'CCO'} if e['name'] == chosen_name else e for e in self.library])
        with self.assertRaisesRegex(ValueError, 'formula disagrees'):
            importer.build(library=[{**e, 'formula':'CH4'} if e['name'] == chosen_name else e for e in self.library])

    def test_changed_primary_source_cannot_be_rehashed_into_agreement(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for relative in importer.SOURCE_BLOBS:
                target = root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(ROOT / relative, target)
            with (root / importer.TABLE).open('ab') as stream:
                stream.write(b'# altered source\n')
            with self.assertRaisesRegex(ValueError, 'Pinned source blob changed'):
                importer.build(root=root, library=self.library)

    def test_check_is_deterministic_and_does_not_write(self):
        paths = [ROOT / 'data/library.js', self.snapshot_path]
        paths += [ROOT / p for p in importer.SOURCE_BLOBS]
        paths += list((ROOT / 'data/curated-reference-entries').glob('property-freesolv-*.json'))
        before = {p: p.read_bytes() for p in paths}
        subprocess.run([sys.executable, '-B', str(Path(__file__).with_name('import-freesolv-properties.py')), '--check'], cwd=ROOT, check=True)
        self.assertEqual(before, {p:p.read_bytes() for p in paths})


if __name__ == '__main__':
    unittest.main()
