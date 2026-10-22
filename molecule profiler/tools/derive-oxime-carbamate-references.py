# Derives homologue references on the oxime carbamate anticholinesterase
# template, the methylcarbamoyl oximes of alkyl and alkylsulfanyl ketones.
#
# The template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree. Only ketone
# pairs carrying a written parent-ketone name are emitted.

import argparse
import itertools
import os
import re
import sys

from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ENTRY = re.compile(
    r"\{ name: '([^']*)', cls: '([^']*)', formula: '([^']*)', smiles: '([^']*)'"
)

TEMPLATE = "{NSUB}C(=O)ON=C({R1}){R2}"

NULLS = {"NSUB": "CN", "R1": "C", "R2": "SC"}

GROUPS = {
    "CN": ("CH4N", "methylcarbamoyl"),
    "CCN": ("C2H6N", "ethylcarbamoyl"),
    "CCCN": ("C3H8N", "propylcarbamoyl"),
    "CC(C)N": ("C3H8N", "propan-2-ylcarbamoyl"),
    "CN(C)": ("C2H6N", "dimethylcarbamoyl"),
    "C": ("CH3", None),
    "CC": ("C2H5", None),
    "CCC": ("C3H7", None),
    "C(C)C": ("C3H7", None),
    "C(C)(C)C": ("C4H9", None),
    "SC": ("CH3S", None),
    "CSC": ("C2H5S", None),
    "CCSC": ("C3H7S", None),
    "C(C)(C)SC": ("C4H9S", None),
    "C(C)CSC": ("C4H9S", None),
    "CS(C)(=O)=O": ("C2H5O2S", None),
    "C(C)(C)S(C)(=O)=O": ("C4H9O2S", None),
    "C(=O)N(C)C": ("C3H6NO", None),
}

KETONE = {
    ("C", "CC"): "butan-2-one",
    ("C", "CCC"): "pentan-2-one",
    ("C", "C(C)C"): "3-methylbutan-2-one",
    ("C", "C(C)(C)C"): "3,3-dimethylbutan-2-one",
    ("C", "CSC"): "1-(methylsulfanyl)propan-2-one",
    ("C", "CCSC"): "4-(methylsulfanyl)butan-2-one",
    ("C", "C(C)(C)SC"): "3-methyl-3-(methylsulfanyl)butan-2-one",
    ("C", "C(C)CSC"): "3-methyl-4-(methylsulfanyl)butan-2-one",
    ("C", "CS(C)(=O)=O"): "1-(methanesulfonyl)propan-2-one",
    ("C", "C(C)(C)S(C)(=O)=O"): "3-methanesulfonyl-3-methylbutan-2-one",
    ("C", "C(=O)N(C)C"): "N,N-dimethyl-2-oxopropanamide",
    ("CC", "CSC"): "1-(methylsulfanyl)butan-2-one",
    ("CC", "C(C)(C)C"): "2,2-dimethylpentan-3-one",
    ("CC", "CCSC"): "1-(methylsulfanyl)pentan-3-one",
}

SLOTS = {
    "NSUB": ["CN", "CCN", "CCCN", "CN(C)", "CC(C)N"],
    "R1": ["C", "CC"],
    "R2": ["SC", "CC", "CCC", "C(C)C", "C(C)(C)C", "CSC", "CCSC",
           "C(C)(C)SC", "C(C)CSC", "CS(C)(=O)=O",
           "C(C)(C)S(C)(=O)=O", "C(=O)N(C)C"],
}

ANCHORS = {
    "Methomyl": {"NSUB": "CN", "R1": "C", "R2": "SC"},
    "Butocarboxim": {"NSUB": "CN", "R1": "C", "R2": "C(C)SC"},
    "Thiofanox": {"NSUB": "CN", "R1": "CSC", "R2": "C(C)(C)C"},
    "Oxamyl": {"NSUB": "CN", "R1": "SC", "R2": "C(=O)N(C)C"},
}

TARGET = 14

ATOM = re.compile(r"([A-Z][a-z]?)(\d*)")


def parse_formula(text):
    out = {}
    for sym, num in ATOM.findall(text or ""):
        out[sym] = out.get(sym, 0) + (int(num) if num else 1)
    return out


def render_formula(counts):
    order = ["C", "H"]
    rest = sorted(k for k in counts if k not in order and counts[k])
    out = ""
    for sym in order + rest:
        n = counts.get(sym, 0)
        if n > 1:
            out += sym + str(n)
        elif n == 1:
            out += sym
    return out


def group_formula(value):
    if value not in GROUPS:
        raise SystemExit("FAIL unknown group %r" % value)
    return parse_formula(GROUPS[value][0])


def flat(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    Chem.RemoveStereochemistry(mol)
    return Chem.MolToSmiles(mol)


def main():
    argparse.ArgumentParser().parse_args()

    lib = open(os.path.join(ROOT, "data", "library.js")).read()
    stored = {}
    seen = {}
    for m in ENTRY.finditer(lib):
        name, cls, formula, smiles = m.groups()
        stored[name] = smiles
        key = flat(smiles)
        if key:
            seen[key] = name

    fails = []
    for name, vals in ANCHORS.items():
        if vals is None:
            continue
        if name not in stored:
            fails.append("anchor %s absent from library" % name)
            continue
        built = flat(TEMPLATE.format(**vals))
        want = flat(stored[name])
        if built is None or built != want:
            fails.append("anchor %s mismatch\n  built %s\n  want  %s"
                         % (name, built, want))
    proven = sum(1 for v in ANCHORS.values() if v is not None)
    if proven < 2:
        fails.append("%d anchors, need 2" % proven)
    if fails:
        for f in fails:
            print("FAIL " + f, file=sys.stderr)
        raise SystemExit(1)

    parent = TEMPLATE.format(**NULLS)
    pmol = Chem.MolFromSmiles(parent)
    if pmol is None:
        raise SystemExit("FAIL parent will not parse: %s" % parent)
    base = parse_formula(CalcMolFormula(pmol))

    keys = sorted(SLOTS)
    idx = [range(len(SLOTS[k])) for k in keys]
    order = sorted(itertools.product(*idx), key=lambda t: (sum(t), t))

    out = []
    made = 0
    skipped = 0
    for t in order:
        if made >= TARGET:
            break
        vals = {k: SLOTS[k][i] for k, i in zip(keys, t)}
        if all(vals[k] == NULLS[k] for k in vals):
            continue
        ketone = KETONE.get((vals["R1"], vals["R2"]))
        if ketone is None:
            continue
        counts = dict(base)
        for k, v in vals.items():
            for sym, n in group_formula(v).items():
                counts[sym] = counts.get(sym, 0) + n
            for sym, n in group_formula(NULLS[k]).items():
                counts[sym] = counts.get(sym, 0) - n
        stated = render_formula(counts)
        smiles = TEMPLATE.format(**vals)
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            fails.append("will not parse: %s" % smiles)
            continue
        got = CalcMolFormula(mol)
        if got != stated:
            fails.append("formula %s stated, %s computed: %s"
                         % (stated, got, smiles))
            continue
        key = flat(smiles)
        if key in seen:
            skipped += 1
            continue
        seen[key] = "new"
        name = "%s O-(%s)oxime" % (ketone, GROUPS[vals["NSUB"]][1])
        out.append("  { name: '%s', cls: 'Cholinesterase inhibitor', "
                   "formula: '%s', smiles: '%s' },\n" % (name, stated, smiles))
        made += 1

    if made < TARGET:
        fails.append("only %d of %d (%d collisions skipped)"
                     % (made, TARGET, skipped))
    if fails:
        for f in fails:
            print("FAIL " + f, file=sys.stderr)
        raise SystemExit(1)

    sys.stdout.write("".join(out))
    print("%d new rows" % len(out), file=sys.stderr)


if __name__ == "__main__":
    main()
