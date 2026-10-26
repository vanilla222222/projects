#!/usr/bin/env python3
"""Offline enrichment of existing library graphs from twelve pinned FreeSolv rows.

No library structures, source snapshots, target panels or assay actions are changed.
Run --check to compare deterministic generated records without writing anything.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
from rdkit import Chem, rdBase
from rdkit.Chem import rdMolDescriptors

ROOT = Path(__file__).resolve().parents[1]
DATA_COMMIT = '134cd763f95d54d818fc0618095aa01cbe470fc3'
LICENSE_COMMIT = '6c7d19b4b565537365ffd22006aa2cd4643200c6'
BASE_URL = 'https://github.com/MobleyLab/FreeSolv/blob/'
TABLE = 'validation/sources/freesolv-database-134cd763.txt'
SNAPSHOT = 'validation/sources/freesolv-properties-001.json'
SOURCE_BLOBS = {
    TABLE: '6c6dbf5d27e646db5a540288ece636f9c915f363',
    'validation/sources/freesolv-README-134cd763.md': 'b374bba5195d7b662f5342086af744b6735ec7f7',
    'validation/sources/freesolv-LICENSE-6c7d19b4.txt': '53883b1c7add1f76201c2ba4c1d1d17e5cb7ed18',
    'validation/sources/freesolv-README-6c7d19b4.md': '0a6b4a320ebf653e5d40d8b6bffdd51acc72db82',
}
SELECTION = [
    ('mobley_1873346', 'Toluene', 'toluene'),
    ('mobley_2451097', 'benzonitrile', 'benzonitrile'),
    ('mobley_2689721', 'Cyclohexane', 'cyclohexane'),
    ('mobley_296847', 'Pyridine', 'pyridine'),
    ('mobley_2996632', 'Chloroform', 'chloroform'),
    ('mobley_313406', '1-Propanol', '1-propanol'),
    ('mobley_3867265', 'Acetone', 'acetone'),
    ('mobley_4883284', 'Aniline', 'aniline'),
    ('mobley_6973347', 'Ethyl acetate', 'ethyl-acetate'),
    ('mobley_7295828', 'Anisole', 'anisole'),
    ('mobley_7326982', '2-Propanol', '2-propanol'),
    ('mobley_7532833', 'acetonitrile', 'acetonitrile'),
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def git_blob(data):
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def encode(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def graph(smiles):
    molecule = Chem.MolFromSmiles(smiles)
    if molecule is None:
        raise ValueError('Invalid stored/source graph: ' + smiles)
    return Chem.MolToSmiles(molecule, isomericSmiles=True)


def source_rows(text):
    rows = {}
    for line_number, line in enumerate(text.splitlines(), 1):
        if not line or line.startswith('#'):
            continue
        fields = [part.strip() for part in line.split(';', 9)]
        if len(fields) != 10 or fields[0] in rows:
            raise ValueError('Malformed or duplicate FreeSolv row at line ' + str(line_number))
        rows[fields[0]] = (line_number, line, fields)
    return rows


def build(root=ROOT, library=None):
    source_hashes = {}
    for path, expected in SOURCE_BLOBS.items():
        raw = (root / path).read_bytes()
        if git_blob(raw) != expected:
            raise ValueError('Pinned source blob changed: ' + path)
        source_hashes[path] = sha(raw)
    raw = (root / TABLE).read_bytes()
    rows = source_rows(raw.decode())
    if library is None:
        library = json.loads(subprocess.check_output([
            'node', '-e', "console.log(JSON.stringify(require('./data/library').LIBRARY))"
        ], cwd=root, text=True))
    names = {}
    for entry in library:
        if entry['name'] in names:
            raise ValueError('Duplicate stable library key: ' + entry['name'])
        names[entry['name']] = entry
    selected, ligands = [], []
    for row_id, name, slug in SELECTION:
        line_number, line, fields = rows[row_id]
        if name not in names:
            raise ValueError('No existing named graph; refusing a new structure: ' + name)
        if graph(names[name]['smiles']) != graph(fields[1]):
            raise ValueError('Existing name labels a different graph: ' + name)
        mol = Chem.MolFromSmiles(fields[1])
        formula = rdMolDescriptors.CalcMolFormula(mol)
        if names[name]['formula'] != formula:
            raise ValueError('Existing formula disagrees with source graph: ' + name)
        identity = {
            'sourceId': row_id, 'sourceName': fields[2], 'sourceSMILES': fields[1],
            'smiles': fields[1], 'formula': formula, 'inchiKey': Chem.MolToInchiKey(mol),
            'identifierOrigin': 'RDKit-derived from the exact source SMILES; not a source-supplied registry identifier',
            'formulaOrigin': 'RDKit-derived from the exact source SMILES',
            'rawRow': line,
        }
        selected.append((row_id, name, slug, line_number, line, fields, identity))
        ligands.append(identity)
    license_metadata = {
        'license': 'CC BY 4.0', 'observedAtRevision': LICENSE_COMMIT,
        'sourceUrl': BASE_URL + LICENSE_COMMIT + '/LICENSE',
        'statementUrl': BASE_URL + LICENSE_COMMIT + '/README.md#license',
        'scope': 'Official 2026 licensing statement, recorded separately from the 2017 data revision. Maintainers license the data to the extent it is theirs to license; original source restrictions may remain.',
    }
    snapshot = {
        'schemaVersion': 1, 'provider': 'FreeSolv / Mobley laboratory',
        'sourceRevision': DATA_COMMIT, 'sourceGitBlob': SOURCE_BLOBS[TABLE],
        'sourceUrl': BASE_URL + DATA_COMMIT + '/database.txt',
        'sourceFile': TABLE, 'sourceSha256': source_hashes[TABLE],
        'sourceFileSha256': source_hashes, 'sourceFileGitBlobs': SOURCE_BLOBS,
        'licenseMetadata': license_metadata, 'rdkitVersion': rdBase.rdkitVersion,
        'selection': [{'sourceId': row_id, 'stableLibraryKey': name} for row_id, name, _ in SELECTION],
        'rows': [s[4] for s in selected], 'ligands': ligands,
        'scope': 'Experimental hydration free-energy columns only; calculated GAFF values are not imported as measurements. Twelve source compounds enrich existing library graphs only. Missing experimental temperature and pH remain unknown.',
    }
    snapshot_text = encode(snapshot)
    snapshot_sha = sha(snapshot_text.encode())
    output = {SNAPSHOT: snapshot_text}
    for row_id, name, slug, line_number, line, fields, identity in selected:
        value, uncertainty = float(fields[3]), float(fields[4])
        if not all(math.isfinite(n) for n in [value, uncertainty]) or uncertainty < 0:
            raise ValueError('Invalid experimental value/uncertainty: ' + row_id)
        default = 'assigned a default value' in fields[9]
        uncertainty_kind = 'source-assigned default uncertainty' if default else 'source-reported estimate'
        reference_dois = re.findall(r'10\.\d{4,9}/[^\s,;]+', fields[7])
        if not reference_dois:
            raise ValueError('No original experimental reference DOI: ' + row_id)
        reference_urls = ['https://doi.org/' + doi for doi in reference_dois]
        url = BASE_URL + DATA_COMMIT + '/database.txt#L' + str(line_number)
        evidence = {
            'kind': 'measured_property', 'target': 'Hydration free energy',
            'endpoint': fields[3] + ' kcal/mol; ' + uncertainty_kind + ' ' + fields[4] + ' kcal/mol',
            'relation': '=', 'value': value, 'unit': 'kcal/mol',
            'uncertainty': uncertainty, 'uncertaintyKind': uncertainty_kind,
            'sourceUrl': url, 'originalReference': reference_urls[0],
            'originalReferences': reference_urls, 'experimentalReference': fields[7],
            'sourceFile': SNAPSHOT, 'sourceSha256': snapshot_sha,
            'sourceRecord': line, 'sourceRow': line_number, 'sourceId': row_id,
            'sourceLocation': 'database.txt line ' + str(line_number) + ', experimental value/uncertainty columns 4 and 5',
            'sourceGitBlob': SOURCE_BLOBS[TABLE], 'sourceTableSha256': source_hashes[TABLE],
            'conditions': {
                'temperature': 'Not specified on this database row',
                'pH': 'Not specified on this database row',
                'phaseTransfer': 'Gas to water; retain the FreeSolv dataset standard-state convention',
            },
            'context': fields[9],
        }
        record = {
            'id': 'property-freesolv-' + slug,
            'title': name + ' — experimental hydration free energy',
            'collections': ['Measured properties'],
            'compounds': [{
                'name': name, 'sourceName': fields[2], 'smiles': fields[1],
                'formula': identity['formula'], 'inchiKey': identity['inchiKey'],
                'sourceUrl': url, 'role': 'measured-property reference',
                'identitySource': {
                    'provider': 'FreeSolv / Mobley laboratory',
                    'identifierOrigin': identity['identifierOrigin'],
                    'formulaOrigin': identity['formulaOrigin'],
                    'license': 'CC BY 4.0', 'licenseMetadata': license_metadata,
                    'sourceFile': SNAPSHOT, 'sourceSha256': snapshot_sha,
                    'sourceGitBlob': SOURCE_BLOBS[TABLE],
                    'sourceTableSha256': source_hashes[TABLE], 'sourceRecord': identity,
                },
            }],
            'evidence': [evidence],
            'note': 'Experimental FreeSolv hydration free energy, not aqueous solubility, pKa, logP, logD or receptor evidence. Calculated GAFF columns are excluded. Source-listed uncertainty is an estimate or assigned default, never a transcribed SD. No experimental temperature or pH is inferred from simulation conditions. Stored library names and graphs are unchanged.',
            'reviewedDate': '2026-10-26',
        }
        output['data/curated-reference-entries/' + record['id'] + '.json'] = encode(record)
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    output = build()
    expected = {str(p.relative_to(ROOT)) for p in (ROOT / 'data/curated-reference-entries').glob('property-freesolv-*.json')}
    actual = {path for path in output if path.startswith('data/')}
    if expected - actual or (args.check and expected != actual):
        raise ValueError('Generated FreeSolv entry inventory is stale')
    for name, text in output.items():
        path = ROOT / name
        if args.check:
            if not path.exists() or path.read_bytes() != text.encode('utf-8'):
                raise ValueError('Stale generated file: ' + name)
        else:
            path.write_bytes(text.encode('utf-8'))
    print(('Checked' if args.check else 'Wrote') + ' 12 existing-graph FreeSolv property records and one source snapshot')


if __name__ == '__main__':
    main()
