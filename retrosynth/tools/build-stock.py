"""Derive a starting-material catalogue from the reaction corpus.

Usage: python3 -I tools/build-stock.py <reactions.csv> <out-dir>

A real engine terminates at compounds you can buy, which means a supplier
catalogue. Lacking one, this derives a defensible stand-in from the corpus
itself: a molecule that chemists repeatedly *start* from and never *make* is,
for practical purposes, something they bought.

Concretely a molecule qualifies when it appears as a reactant at least
`MIN_USES` times and is never a recorded product. The two conditions matter
together - "never a product" alone would admit every one-off exotic reagent
that happens not to be synthesised in this corpus, which would let the search
declare victory on something nobody can actually obtain.

This is an approximation and the engine should say so. It is deliberately
pluggable: any file of SMILES, one per line, can replace it, and a supplier
catalogue is the right thing to use when there is one.
"""
import sys, csv, json, os
from collections import Counter

from rdkit import Chem, RDLogger

RDLogger.DisableLog('rdApp.*')

MIN_USES = 3


def canon(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    for atom in mol.GetAtoms():
        atom.SetAtomMapNum(0)
    return Chem.MolToSmiles(mol)


def main(source, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    as_reactant = Counter()
    as_product = set()
    rows = 0

    with open(source, newline='') as handle:
        for row in csv.DictReader(handle):
            rows += 1
            reactants, product = row['rxn_smiles'].split('>>')
            made = canon(product)
            if made:
                as_product.add(made)
            for piece in reactants.split('.'):
                one = canon(piece)
                if one:
                    as_reactant[one] += 1

    stock = sorted(m for m, n in as_reactant.items()
                   if n >= MIN_USES and m not in as_product)

    with open(os.path.join(out_dir, 'stock.json'), 'w') as handle:
        json.dump(stock, handle)

    report = {
        'source_rows': rows,
        'distinct_reactants': len(as_reactant),
        'distinct_products': len(as_product),
        'min_uses': MIN_USES,
        'stock_size': len(stock),
        'note': ('Derived from the corpus, not a supplier catalogue: molecules '
                 'used as reactants at least %d times and never recorded as a '
                 'product. An approximation of buyability, not a guarantee of '
                 'it.' % MIN_USES),
    }
    with open(os.path.join(out_dir, 'stock-report.json'), 'w') as handle:
        json.dump(report, handle, indent=1)
    print(json.dumps(report, indent=1))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
