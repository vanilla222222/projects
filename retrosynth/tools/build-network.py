"""Build the connected core of the reaction corpus, for path search in the page.

Usage: python3 -I tools/build-network.py <reactions.csv> <out-dir>

The engine answers "how do I make this". A different and cheaper question is
"is there a documented path from this molecule to that one" - every edge being
a real patent reaction rather than a proposal. That needs no chemistry at
runtime, only a graph, so it can run in the browser.

Shipping the whole corpus would mean 100,508 molecules and 4.1MB of SMILES, and
almost all of it would be dead weight: a molecule can only sit in the middle of
a path if it is both *made* by some reaction and *used* by another, and just
1,924 molecules qualify. Keeping those plus everything one hop from them gives
7,044 molecules and 6,538 edges - about 270KB of SMILES, which a page can load.

That ratio is itself the headline finding, and the page says so: USPTO-50k is
largely a bag of unconnected single steps rather than a synthesis graph, so most
pairs of molecules have no path at all and the ones that do are short.
"""
import csv
import json
import os
import sys
from collections import defaultdict

from rdkit import Chem, RDLogger

RDLogger.DisableLog('rdApp.*')


def canon(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    for atom in mol.GetAtoms():
        atom.SetAtomMapNum(0)
    return Chem.MolToSmiles(mol)


def main(source, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    outgoing = defaultdict(set)
    incoming = defaultdict(set)
    # (reactant, product) -> the reaction that did it, for provenance
    evidence = {}

    rows = 0
    with open(source, newline='') as handle:
        for row in csv.DictReader(handle):
            rows += 1
            reactants, product = row['rxn_smiles'].split('>>')
            made = canon(product)
            if not made:
                continue
            for piece in reactants.split('.'):
                used = canon(piece)
                if not used or used == made:
                    continue
                outgoing[used].add(made)
                incoming[made].add(used)
                evidence.setdefault((used, made), (row['id'], int(row['class'])))

    molecules = set(outgoing) | set(incoming)
    middle = {m for m in molecules if outgoing.get(m) and incoming.get(m)}
    core = set(middle)
    for m in middle:
        core |= outgoing[m] | incoming[m]

    index = {smiles: i for i, smiles in enumerate(sorted(core))}
    edges = []
    for source_mol, targets in outgoing.items():
        if source_mol not in index:
            continue
        for target_mol in targets:
            if target_mol not in index:
                continue
            patent, klass = evidence[(source_mol, target_mol)]
            edges.append([index[source_mol], index[target_mol], klass, patent])

    payload = {
        'molecules': sorted(core),
        'edges': edges,
        'corpus': {
            'reactions': rows,
            'molecules_total': len(molecules),
            'intermediates': len(middle),
            'core_molecules': len(core),
            'core_edges': len(edges),
        },
    }
    path = os.path.join(out_dir, 'network.json')
    with open(path, 'w') as handle:
        json.dump(payload, handle, separators=(',', ':'))

    print(json.dumps({**payload['corpus'],
                      'file_kb': round(os.path.getsize(path) / 1024)}, indent=1))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
