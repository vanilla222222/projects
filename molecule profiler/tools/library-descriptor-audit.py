#!/usr/bin/env python3
"""Compare every current library graph's Crippen logP/MR with RDKit (read-only).

This is algorithm equivalence, not measured-property validation. Requires RDKit
and Node.js. Reports all differences above 1e-7 and never silently skips entries.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
from rdkit import Chem, rdBase
from rdkit.Chem import Crippen

ROOT = Path(__file__).resolve().parents[1]

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--output', type=Path, required=True)
    args = ap.parse_args()
    code = """
for(const file of ['smiles','mol','smarts','descriptors','rules'])Object.assign(global,require('./js/'+file+'.js'));
console.log(JSON.stringify(require('./data/library.js').LIBRARY.map(entry=>{
 try{return {...entry,computed:crippen(buildMolecule(parseSmiles(entry.smiles)))};}
 catch(error){return {...entry,error:String(error.message)};}
})));
"""
    rows = json.loads(subprocess.check_output(['node', '-e', code], cwd=ROOT, text=True))
    errors, differences, values = [], [], {'logp': [], 'mr': []}
    for row in rows:
        mol = Chem.MolFromSmiles(row['smiles'])
        if row.get('error') or mol is None:
            errors.append({'name': row['name'], 'error': row.get('error', 'RDKit parse failure')})
            continue
        expected = {'logp': Crippen.MolLogP(mol), 'mr': Crippen.MolMR(mol)}
        diff = {key: row['computed'][key] - expected[key] for key in expected}
        for key in expected:
            values[key].append(abs(diff[key]))
        if any(abs(v) > 1e-7 for v in diff.values()):
            differences.append({'name': row['name'], 'smiles': row['smiles'], 'expected': expected,
                                'actual': {k: row['computed'][k] for k in expected}, 'difference': diff})
    summary = {key: {'compared': len(v), 'meanAbsoluteDifference': sum(v)/len(v) if v else None,
                     'maxAbsoluteDifference': max(v) if v else None,
                     'within1e_7': sum(d <= 1e-7 for d in v),
                     'above0_05': sum(d > 0.05 for d in v),
                     'above0_5': sum(d > 0.5 for d in v)} for key, v in values.items()}
    sources = ['data/library.js', 'js/smiles.js', 'js/mol.js', 'js/descriptors.js', 'tools/library-descriptor-audit.py']
    report = {'schemaVersion': 1, 'rdkitVersion': rdBase.rdkitVersion,
              'scope': 'Same-graph computed Crippen logP and molar refractivity; not experimental accuracy or identity verification.',
              'sourceSha256': {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in sources},
              'entries': len(rows), 'errors': errors, 'summary': summary, 'differences': differences}
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: report[k] for k in ['entries', 'errors', 'summary']}, indent=2))
    if errors:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
