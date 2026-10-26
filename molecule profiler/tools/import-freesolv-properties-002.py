#!/usr/bin/env python3
"""Offline enrichment of existing library graphs from sixty pinned FreeSolv rows.

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
SNAPSHOT = 'validation/sources/freesolv-properties-002.json'
SOURCE_BLOBS = {
    TABLE: '6c6dbf5d27e646db5a540288ece636f9c915f363',
    'validation/sources/freesolv-README-134cd763.md': 'b374bba5195d7b662f5342086af744b6735ec7f7',
    'validation/sources/freesolv-LICENSE-6c7d19b4.txt': '53883b1c7add1f76201c2ba4c1d1d17e5cb7ed18',
    'validation/sources/freesolv-README-6c7d19b4.md': '0a6b4a320ebf653e5d40d8b6bffdd51acc72db82',
}
SELECTION = [
    ('mobley_7378987', 'Caffeine', '7378987'),
    ('mobley_2913224', 'Aspirin', '2913224'),
    ('mobley_5282042', 'Amitriptyline', '5282042'),
    ('mobley_1944394', 'Diphenhydramine', '1944394'),
    ('mobley_337666', 'Fluorouracil', '337666'),
    ('mobley_2078467', 'dexibuprofen', '2078467'),
    ('mobley_2099370', 'dexketoprofen', '2099370'),
    ('mobley_1527293', 'esflurbiprofen', '1527293'),
    ('mobley_6055410', 'Diflunisal', '6055410'),
    ('mobley_4936555', 'Mefenamic acid', '4936555'),
    ('mobley_2295058', 'Methylparaben', '2295058'),
    ('mobley_6201330', 'propylparaben', '6201330'),
    ('mobley_3259411', 'Glycerol', '3259411'),
    ('mobley_4639255', 'Ethylene glycol', '4639255'),
    ('mobley_4587267', 'D-mannitol', '4587267'),
    ('mobley_9534740', 'beta-D-glucose', '9534740'),
    ('mobley_1896013', 'alpha-D-xylose', '1896013'),
    ('mobley_1659169', 'Morpholine', '1659169'),
    ('mobley_951560', 'Piperazine', '951560'),
    ('mobley_6309289', 'piperidine', '6309289'),
    ('mobley_646007', 'pyrrolidine', '646007'),
    ('mobley_6266306', 'azetidine', '6266306'),
    ('mobley_7735340', 'Imidazole', '7735340'),
    ('mobley_5857', 'Quinoline', '5857'),
    ('mobley_2972906', 'Thiophene', '2972906'),
    ('mobley_2837389', '1H-pyrrole', '2837389'),
    ('mobley_1728386', 'benzamide', '1728386'),
    ('mobley_8048190', 'acetamide', '8048190'),
    ('mobley_8011706', 'N,N-dimethylformamide', '8011706'),
    ('mobley_8578590', 'Dimethyl sulfoxide', '8578590'),
    ('mobley_7497999', 'Acetophenone', '7497999'),
    ('mobley_3969312', 'Benzaldehyde', '3969312'),
    ('mobley_5311804', 'Phenylmethanol', '5311804'),
    ('mobley_2850833', 'Salicylaldehyde', '2850833'),
    ('mobley_3515580', 'Guaiacol', '3515580'),
    ('mobley_2613240', 'veratrole', '2613240'),
    ('mobley_2763835', 'Phenetole', '2763835'),
    ('mobley_3034976', 'Acetic acid', '3034976'),
    ('mobley_7758918', 'propionic acid', '7758918'),
    ('mobley_820789', 'butyric acid', '820789'),
    ('mobley_1019269', '1-Butanol', '1019269'),
    ('mobley_5759258', '1-Pentanol', '5759258'),
    ('mobley_3546460', '1-Hexanol', '3546460'),
    ('mobley_36119', '1-Octanol', '36119'),
    ('mobley_1650157', 'tert-butanol', '1650157'),
    ('mobley_7010316', 'Cyclohexanol', '7010316'),
    ('mobley_3682850', 'Cyclohexanone', '3682850'),
    ('mobley_3968043', 'cyclopentanone', '3968043'),
    ('mobley_282648', 'Naphthalene', '282648'),
    ('mobley_637522', 'Anthracene', '637522'),
    ('mobley_7017274', 'Phenanthrene', '7017274'),
    ('mobley_2577969', 'Pyrene', '2577969'),
    ('mobley_2005792', 'Biphenyl', '2005792'),
    ('mobley_9565165', 'Fluorene', '9565165'),
    ('mobley_5094777', 'Indan', '5094777'),
    ('mobley_1424265', 'm-Xylene', '1424265'),
    ('mobley_9478823', 'o-Xylene', '9478823'),
    ('mobley_3234716', 'p-Xylene', '3234716'),
    ('mobley_2859600', 'Styrene', '2859600'),
    ('mobley_1144156', 'Diethyl ether', '1144156'),
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


def build(root=ROOT, library=None, effective=None):
    source_hashes = {}
    for path, expected in SOURCE_BLOBS.items():
        raw = (root / path).read_bytes()
        if git_blob(raw) != expected:
            raise ValueError('Pinned source blob changed: ' + path)
        source_hashes[path] = sha(raw)
    raw = (root / TABLE).read_bytes()
    rows = source_rows(raw.decode())
    if library is None:
        code = "const raw=require('./data/library.js').LIBRARY,d=require('./data/curated-references.js').CURATED_REFERENCES;console.log(JSON.stringify({raw,effective:require('./js/curated-references.js').library(raw,d)}));"
        current = json.loads(subprocess.check_output(['node', '-e', code], cwd=root, text=True))
        library, effective = current['raw'], current['effective']
    if effective is None:
        effective = library
    names, effective_names = {}, {}
    for entries, index in [(library, names), (effective, effective_names)]:
        for entry in entries:
            if entry['name'] in index:
                raise ValueError('Duplicate stable library key: ' + entry['name'])
            index[entry['name']] = entry
    prior_ids, prior_graphs = set(), set()
    for path in (root/'data/curated-reference-entries').glob('*.json'):
        if path.name.startswith('property-freesolv2-'):
            continue
        record = json.loads(path.read_text())
        if any(e['kind']=='measured_property' for e in record['evidence']):
            prior_ids.update(re.findall(r'mobley_\d+', path.read_text()))
            prior_graphs.update(graph(c['smiles']) for c in record['compounds'])
    selected, ligands = [], []
    for row_id, name, slug in SELECTION:
        line_number, line, fields = rows[row_id]
        if row_id in prior_ids or graph(fields[1]) in prior_graphs:
            raise ValueError('Duplicate existing measured-property source or graph: ' + row_id)
        mol = Chem.MolFromSmiles(fields[1])
        formula = rdMolDescriptors.CalcMolFormula(mol)
        for scope, index in [('raw', names), ('effective', effective_names)]:
            if name not in index:
                raise ValueError('No existing '+scope+' named graph; refusing a new structure: ' + name)
            if graph(index[name]['smiles']) != graph(fields[1]):
                raise ValueError('Existing '+scope+' name labels a different graph: ' + name)
            if index[name]['formula'] != formula:
                raise ValueError('Existing '+scope+' formula disagrees with source graph: ' + name)
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
        'scope': 'Experimental hydration free-energy columns only; calculated GAFF values are not imported as measurements. Sixty source compounds enrich existing library graphs only. Missing experimental temperature and pH remain unknown.',
    }
    snapshot_text = encode(snapshot)
    snapshot_sha = sha(snapshot_text.encode())
    output = {SNAPSHOT: snapshot_text}
    for row_id, name, slug, line_number, line, fields, identity in selected:
        value, uncertainty = float(fields[3]), float(fields[4])
        if not all(math.isfinite(n) for n in [value, uncertainty]) or uncertainty < 0:
            raise ValueError('Invalid experimental value/uncertainty: ' + row_id)
        default = 'assigned a default value' in fields[9].lower()
        uncertainty_kind = 'source-assigned default uncertainty' if default else 'source-reported estimate'
        reference_dois = re.findall(r'10\.\d{4,9}/[^\s,;]+', fields[7])
        reference_urls = ['https://doi.org/' + doi for doi in reference_dois]
        url = BASE_URL + DATA_COMMIT + '/database.txt#L' + str(line_number)
        evidence = {
            'kind': 'measured_property', 'target': 'Hydration free energy',
            'endpoint': fields[3] + ' kcal/mol; ' + uncertainty_kind + ' ' + fields[4] + ' kcal/mol',
            'relation': '=', 'value': value, 'unit': 'kcal/mol',
            'uncertainty': uncertainty, 'uncertaintyKind': uncertainty_kind,
            'sourceUrl': url,
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
        if reference_urls:
            evidence['originalReference'] = reference_urls[0]
        else:
            evidence['referenceStatus'] = 'Unresolved source reference label retained verbatim; no DOI inferred'
        record = {
            'id': 'property-freesolv2-' + slug,
            'title': name + ' — experimental hydration free energy',
            'collections': ['Measured properties'],
            'compounds': [{
                'name': name, 'smiles': fields[1],
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
    expected = {str(p.relative_to(ROOT)) for p in (ROOT / 'data/curated-reference-entries').glob('property-freesolv2-*.json')}
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
    print(('Checked' if args.check else 'Wrote') + ' 60 existing-graph FreeSolv property records and one source snapshot')


if __name__ == '__main__':
    main()
