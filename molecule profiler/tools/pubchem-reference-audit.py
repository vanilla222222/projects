#!/usr/bin/env python3
"""Read-only, source-linked identity comparison; never infer target activity.

Requires Node.js and RDKit. Example:
python tools/pubchem-reference-audit.py --gene GABRA1 --output validation/pubchem-gabaa.json
Cached PubChem responses permit offline rechecking with --offline --cache PATH.
A match is agreement with a name-resolved database record, not independent
experimental identification or evidence of receptor binding/selectivity.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import json
from pathlib import Path
import subprocess
import time
from urllib.parse import quote
from urllib.request import urlopen, Request
from rdkit import Chem, RDLogger, rdBase

RDLogger.DisableLog('rdApp.error')
ROOT = Path(__file__).resolve().parents[1]


def graph(smiles, stereo=True):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    return Chem.MolToSmiles(mol, isomericSmiles=stereo)


def compare(entry, response):
    props = response.get('PropertyTable', {}).get('Properties', [])
    if len(props) != 1:
        return {'status': 'ambiguous_or_missing_record', 'records': len(props)}
    source = props[0]
    smiles = source.get('SMILES') or source.get('IsomericSMILES')
    if not smiles:
        return {'status': 'missing_source_structure', 'cid': source.get('CID')}
    local_graph, source_graph = graph(entry['smiles']), graph(smiles)
    if local_graph is None or source_graph is None:
        status = 'unreadable_structure'
    elif local_graph == source_graph:
        status = 'matched_isomeric_graph'
    elif graph(entry['smiles'], False) == graph(smiles, False):
        status = 'connectivity_only_stereochemistry_differs'
    else:
        status = 'different_graph_requires_review'
    return {'status': status, 'cid': source['CID'],
            'sourceUrl': 'https://pubchem.ncbi.nlm.nih.gov/compound/' + str(source['CID']),
            'sourceSmiles': smiles, 'sourceFormula': source.get('MolecularFormula'),
            'sourceInchiKey': source.get('InChIKey'),
            'storedFormulaMatchesSource': entry['formula'] == source.get('MolecularFormula'),
            'libraryCanonicalSmiles': local_graph, 'sourceCanonicalSmiles': source_graph}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--gene', default='GABRA1')
    ap.add_argument('--output', type=Path, required=True)
    ap.add_argument('--cache', type=Path, default=Path('/tmp/mp-pubchem-cache'))
    ap.add_argument('--offline', action='store_true')
    args = ap.parse_args()
    code = "const {LIBRARY}=require('./data/library.js'),{TARGETS}=require('./data/targets.js');console.log(JSON.stringify({library:LIBRARY,targets:TARGETS}));"
    dataset = json.loads(subprocess.check_output(['node', '-e', code], cwd=ROOT, text=True))
    targets = [t for t in dataset['targets'] if t['gene'] == args.gene]
    if len(targets) != 1:
        raise SystemExit('Expected exactly one target for --gene')
    wanted = set(targets[0]['ligands'])
    entries = [e for e in dataset['library'] if e['name'] in wanted]
    if len(entries) != len(wanted):
        raise SystemExit('Missing or duplicated target ligand names')
    args.cache.mkdir(parents=True, exist_ok=True)

    def fetch(entry):
        url = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/' + quote(entry['name'], safe='') + '/property/CanonicalSMILES,IsomericSMILES,MolecularFormula,InChIKey/JSON'
        cache = args.cache / (hashlib.sha256(url.encode()).hexdigest() + '.json')
        record = {'name': entry['name'], 'librarySmiles': entry['smiles'], 'libraryFormula': entry['formula'], 'requestUrl': url}
        try:
            if cache.exists():
                envelope = json.loads(cache.read_text())
            else:
                if args.offline:
                    raise ValueError('No cached response in offline mode')
                time.sleep(0.5)
                raw = urlopen(Request(url, headers={'User-Agent': 'MoleculeProfiler-ReferenceAudit/1.0'}), timeout=25).read()
                envelope = {'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'response': json.loads(raw)}
                cache.write_text(json.dumps(envelope) + '\n')
            response = envelope['response']
            record.update(compare(entry, response))
            record['retrievedAt'] = envelope['retrievedAt']
            record['responseSha256'] = hashlib.sha256(json.dumps(response, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
            record['sourceResponse'] = response
        except Exception as exc:
            record.update(status='lookup_failed', error=str(exc))
        return record

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        records = sorted(pool.map(fetch, entries), key=lambda r: r['name'])
    counts = {s: sum(r['status'] == s for r in records) for s in sorted({r['status'] for r in records})}
    report = {'schemaVersion': 1, 'gene': args.gene, 'rdkitVersion': rdBase.rdkitVersion,
              'scope': 'Name-resolved PubChem structure comparison only; no activity, potency or subtype verification.',
              'sourceSha256': {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in ['data/library.js', 'data/targets.js', 'tools/pubchem-reference-audit.py']},
              'counts': counts, 'records': records}
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({'gene': args.gene, 'entries': len(records), 'counts': counts}, indent=2))
    for record in records:
        if record['status'] != 'matched_isomeric_graph':
            print(record['name'] + ': ' + record['status'])
    # Disagreement or unavailable records need review; they are never auto-fixed.
    if counts.get('lookup_failed') or counts.get('different_graph_requires_review') or counts.get('unreadable_structure'):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
