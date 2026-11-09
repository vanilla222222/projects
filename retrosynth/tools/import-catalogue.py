"""Import a supplier catalogue as the engine's purchasable stock.

Usage: python3 -I tools/import-catalogue.py <buyables.json.gz> <out-dir>

Expects the ASKCOS buyables shape: a gzipped JSON list of
{"smiles": ..., "ppg": price per gram, "source": ...}.

This replaces the corpus-derived stand-in in build-stock.py, and the difference
is not cosmetic. Where the search is allowed to stop decides what fraction of
targets can be solved at all, and a stock derived from the corpus was the
binding constraint on every measurement taken before this: 3,489 molecules
against a catalogue's 280,000.

Prices are kept. They are not used for search yet, but "cheapest route" is a
better objective than "fewest steps" and the data is here for it.
"""
import gzip
import json
import os
import sys
from collections import Counter

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
    with gzip.open(source) as handle:
        entries = json.load(handle)

    stats = Counter()
    priced = {}
    for entry in entries:
        stats['rows'] += 1
        one = canon(entry.get('smiles', ''))
        if one is None:
            stats['unparseable'] += 1
            continue
        price = entry.get('ppg')
        # Canonicalisation collapses duplicates that differ only in how the
        # supplier wrote them; keep the cheapest offer for each.
        if one not in priced or (price is not None and price < priced[one]):
            if one in priced:
                stats['duplicate'] += 1
            priced[one] = price if price is not None else float('inf')

    stock = sorted(priced)
    with open(os.path.join(out_dir, 'stock.json'), 'w') as handle:
        json.dump(stock, handle)
    with open(os.path.join(out_dir, 'stock-prices.json'), 'w') as handle:
        json.dump({k: (v if v != float('inf') else None) for k, v in priced.items()}, handle)

    report = {
        'catalogue': os.path.basename(source),
        'rows': stats['rows'],
        'unparseable': stats['unparseable'],
        'duplicates_collapsed': stats['duplicate'],
        'stock_size': len(stock),
        'note': 'Supplier catalogue (eMolecules via ASKCOS). Prices are per gram.',
    }
    with open(os.path.join(out_dir, 'stock-report.json'), 'w') as handle:
        json.dump(report, handle, indent=1)
    print(json.dumps(report, indent=1))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
