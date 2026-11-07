#!/usr/bin/env python3
"""Build local RDKit descriptors for every effective reference graph, offline.

Historical ChEMBL module/export names are retained for consumer compatibility.
Associated ChEMBL identifiers remain metadata, not a calculation eligibility gate.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
from rdkit import Chem, rdBase
from rdkit.Chem import Crippen, Descriptors, Lipinski, rdMolDescriptors

ROOT = Path(__file__).resolve().parents[1]
INPUTS = ('data/library.js', 'data/curated-references.js',
          'js/curated-references.js', 'data/receptor-ligand-annotations.js')
SCOPE = 'Exact stored library graph, including disconnected fragments and formal charge; no parent selection, neutralization, salt stripping or tautomer standardization.'
METHODS = {
    'molecularWeight': {'method': 'rdkit.Chem.Descriptors.MolWt', 'unit': 'g/mol'},
    'exactMass': {'method': 'rdkit.Chem.Descriptors.ExactMolWt', 'unit': 'Da'},
    'cLogP': {'method': 'rdkit.Chem.Crippen.MolLogP (Wildman-Crippen)', 'unit': 'dimensionless'},
    'tpsa': {'method': 'rdkit.Chem.rdMolDescriptors.CalcTPSA (includeSandP=False)', 'unit': 'angstrom^2'},
    'hbd': {'method': 'rdkit.Chem.Lipinski.NumHDonors', 'unit': 'count'},
    'hba': {'method': 'rdkit.Chem.Lipinski.NumHAcceptors', 'unit': 'count'},
    'rotatableBonds': {'method': 'rdkit.Chem.rdMolDescriptors.CalcNumRotatableBonds (Strict)', 'unit': 'count'},
    'formalCharge': {'method': 'rdkit.Chem.GetFormalCharge', 'unit': 'elementary charge'},
    'heavyAtoms': {'method': 'rdkit.Chem.rdMolDescriptors.CalcNumHeavyAtoms', 'unit': 'count'},
}

def descriptors(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError('Unparseable exact library graph')
    result = dict(zip(METHODS, [Descriptors.MolWt(mol), Descriptors.ExactMolWt(mol),
        Crippen.MolLogP(mol), rdMolDescriptors.CalcTPSA(mol, includeSandP=False),
        Lipinski.NumHDonors(mol), Lipinski.NumHAcceptors(mol),
        rdMolDescriptors.CalcNumRotatableBonds(mol, rdMolDescriptors.NumRotatableBondsOptions.Strict),
        Chem.GetFormalCharge(mol), rdMolDescriptors.CalcNumHeavyAtoms(mol)]))
    if not all(math.isfinite(value) for value in result.values()):
        raise ValueError('Non-finite calculated descriptor')
    return {key: round(value, 6) if isinstance(value, float) else value for key, value in result.items()}

def build(library, annotations, source_hashes):
    by_name = {}
    for entry in library:
        if entry['name'] in by_name:
            raise ValueError('Duplicate library name: ' + entry['name'])
        by_name[entry['name']] = entry
    grouped = {}
    for annotation in annotations:
        if not annotation.get('chemblMoleculeId'):
            continue
        name = annotation['ligandName']
        entry = by_name.get(name)
        if entry is None or entry['smiles'] != annotation.get('librarySmiles'):
            raise ValueError('Missing or stale ChEMBL-annotated library graph: ' + name)
        grouped.setdefault(name, []).append(annotation)
    entries = {}
    for name in sorted(by_name):
        entry = by_name[name]
        records = grouped.get(name, [])
        entries[name] = {'librarySmiles': entry['smiles'], 'calculated': descriptors(entry['smiles']),
            'chemblMoleculeIds': sorted({a['chemblMoleculeId'] for a in records}),
            'sourceReleases': sorted({a['sourceRelease'] for a in records if a.get('sourceRelease')}),
            'annotationCount': len(records)}
    return {'schemaVersion': 1, 'kind': 'locally_calculated_descriptors',
        'label': 'Calculated locally with RDKit; not ChEMBL-reported or experimentally measured properties.',
        'scope': SCOPE, 'rdkitVersion': rdBase.rdkitVersion, 'methods': METHODS,
        'limitations': ['cLogP is a model estimate, not measured logP or pH-dependent logD.',
            'Descriptors describe the complete stored graph; salt or multicomponent descriptors may have limited physical interpretation.',
            'No pKa, solubility, receptor action, selectivity or clinical inference is made.'],
        'sourceHashes': source_hashes, 'entryCount': len(entries),
        'chemblEntryCount': len(grouped), 'annotationCount': sum(len(v) for v in grouped.values()),
        'entries': entries}

def outputs(root=ROOT):
    before = {name: hashlib.sha256((root/name).read_bytes()).hexdigest() for name in INPUTS}
    code = "const raw=require('./data/library.js').LIBRARY,curated=require('./js/curated-references.js'),data=require('./data/curated-references.js').CURATED_REFERENCES;console.log(JSON.stringify({library:curated.library(raw,data),annotations:require('./data/receptor-ligand-annotations.js').RECEPTOR_LIGAND_ANNOTATIONS}));"
    current = json.loads(subprocess.check_output(['node', '-e', code], cwd=root, text=True))
    after = {name: hashlib.sha256((root/name).read_bytes()).hexdigest() for name in INPUTS}
    if before != after:
        raise ValueError('Inputs changed while reading reference descriptor sources')
    data = build(current['library'], current['annotations'], before)
    serialized = json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    js = "'use strict';\n// Generated local RDKit descriptors; not ChEMBL-reported or measured properties.\nconst CHEMBL_CALCULATED_PROPERTIES = " + serialized + ";\nif(typeof module!=='undefined'&&module.exports)module.exports={CHEMBL_CALCULATED_PROPERTIES};\nif(typeof globalThis!=='undefined')globalThis.CHEMBL_CALCULATED_PROPERTIES=CHEMBL_CALCULATED_PROPERTIES;\n"
    report = {k:v for k,v in data.items() if k != 'entries'}
    report['sourceSha256'] = before
    report['dataSha256'] = hashlib.sha256(js.encode()).hexdigest()
    report['toolSha256'] = hashlib.sha256((root/'tools/build-chembl-properties.py').read_bytes()).hexdigest()
    report['generator'] = 'tools/build-chembl-properties.py'
    return {'data/chembl-properties.js': js.encode(), 'validation/chembl-properties.json': (json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2)+'\n').encode()}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify deterministic outputs without writing')
    args = parser.parse_args()
    for name, content in outputs().items():
        path = ROOT/name
        if args.check:
            if not path.exists() or path.read_bytes() != content:
                raise SystemExit('Stale calculated properties; run tools/build-chembl-properties.py: ' + name)
        else:
            path.write_bytes(content)
    print('Effective-reference local RDKit descriptors ' + ('checked' if args.check else 'generated'))

if __name__ == '__main__':
    main()
