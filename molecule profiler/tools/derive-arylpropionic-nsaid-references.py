# Derives homologue references on two 2-arylpropanoic acid templates: the
# 4-substituted series that carries ibuprofen, butibufen, xenbucin,
# alminoprofen, loxoprofen and suprofen, and the 3-substituted series that
# carries ketoprofen and fenoprofen.
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree. Rows whose
# structure or display name the library already stores are skipped.
# Templates reserve ring digits 1 and 2, so interpolated rings use 3 upwards.

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

GROUPS = {
    "C": ("CH3", "methyl"),
    "CC": ("C2H5", "ethyl"),
    "CCC": ("C3H7", "propyl"),
    "C(C)C": ("C3H7", "propan-2-yl"),
    "CC(C)": ("C3H7", "(propan-2-yl)"),
    "CC(C)C": ("C4H9", "(2-methylpropyl)"),
    "CCCC": ("C4H9", "butyl"),
    "CC(C)CC": ("C5H11", "(3-methylbutyl)"),
    "CO": ("CH3O", "methoxy"),
    "c3ccccc3": ("C6H5", "phenyl"),
    "c3ccccc3O": ("C6H5O", "phenoxy"),
    "c3cc(F)ccc3O": ("C6H4FO", "(4-fluorophenoxy)"),
    "O=C(c3ccccc3)": ("C7H5O", "benzoyl"),
    "O=C(c3ccc(F)cc3)": ("C7H4FO", "(4-fluorobenzoyl)"),
    "O=C(c3cccs3)": ("C5H3OS", "(thiophene-2-carbonyl)"),
    "O=C3CCCC3C": ("C6H9O", "[(2-oxocyclopentyl)methyl]"),
    "C=C(C)CN": ("C4H8N", "[(2-methylprop-2-enyl)amino]"),
}


ATOM = re.compile(r"([A-Z][a-z]?)(\d*)")
LETTERS = re.compile(r"[^a-z]")


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


def group_name(value):
    name = GROUPS[value][1]
    if name is None:
        raise SystemExit("FAIL group %r carries no name" % value)
    return name


def flat(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    Chem.RemoveStereochemistry(mol)
    return Chem.MolToSmiles(mol)


def pref(sub, text):
    return (LETTERS.sub("", sub.lower()), text)


def join(parts, stem):
    head = "-".join(text for _, text in sorted(parts))
    if not head:
        return stem
    return head + ("-" if stem[0].isdigit() else "") + stem


ALPHA = {
    "C": ("propanoic acid", None),
    "CC": ("butanoic acid", None),
    "CCC": ("pentanoic acid", None),
    "C(C)C": ("butanoic acid", "3-methyl"),
}


def namer(locant):
    def name(v):
        sub = group_name(v["R"])
        inner = locant + "-" + sub + "phenyl"
        if "[" in sub:
            body = "{" + inner + "}"
        elif "(" in sub:
            body = "[" + inner + "]"
        else:
            body = "(" + inner + ")"
        stem, extra = ALPHA[v["A"]]
        parts = [pref(sub, "2-" + body)]
        if extra:
            parts.append(pref("methyl", extra))
        return join(parts, stem)
    return name


ALKYL = ["C", "CC", "CCC", "C(C)C"]

FAMILIES = [
    {
        "cls": "Arylpropionic acid NSAID",
        "template": "{R}c1ccc(C({A})C(=O)O)cc1",
        "nulls": {"R": "CC(C)C", "A": "C"},
        "anchors": {
            "Ibuprofen": {},
            "Butibufen": {"A": "CC"},
            "Xenbucin": {"R": "c3ccccc3", "A": "CC"},
            "Alminoprofen": {"R": "C=C(C)CN"},
            "Loxoprofen": {"R": "O=C3CCCC3C"},
            "Suprofen": {"R": "O=C(c3cccs3)"},
        },
        "slots": {
            "R": ["CC(C)C", "CCC", "CC(C)", "CCCC", "c3ccccc3",
                  "O=C(c3ccccc3)", "O=C3CCCC3C", "O=C(c3cccs3)",
                  "C=C(C)CN", "CC(C)CC"],
            "A": ALKYL,
        },
        "target": 18,
        "name": namer("4"),
    },
    {
        "cls": "Arylpropionic acid NSAID",
        "template": "{R}c1cccc(C({A})C(=O)O)c1",
        "nulls": {"R": "O=C(c3ccccc3)", "A": "C"},
        "anchors": {
            "Ketoprofen": {},
            "Fenoprofen": {"R": "c3ccccc3O"},
        },
        "slots": {
            "R": ["O=C(c3ccccc3)", "c3ccccc3O", "O=C(c3ccc(F)cc3)",
                  "c3cc(F)ccc3O", "O=C(c3cccs3)", "c3ccccc3", "CO",
                  "CC(C)C"],
            "A": ALKYL,
        },
        "target": 12,
        "name": namer("3"),
    },
]



def combos(slots):
    keys = sorted(slots)
    idx = [range(len(slots[k])) for k in keys]
    for t in sorted(itertools.product(*idx), key=lambda t: (sum(t), t)):
        yield {k: slots[k][i] for k, i in zip(keys, t)}


def main():
    argparse.ArgumentParser().parse_args()

    lib = open(os.path.join(ROOT, "data", "library.js")).read()
    stored = {}
    taken = set()
    seen = {}
    for m in ENTRY.finditer(lib):
        name, cls, formula, smiles = m.groups()
        stored[name] = smiles
        taken.add(name.lower())
        key = flat(smiles)
        if key:
            seen[key] = name

    fails = []
    for fam in FAMILIES:
        for name, vals in fam["anchors"].items():
            if vals is None:
                continue
            if name not in stored:
                fails.append("anchor %s absent from library" % name)
                continue
            full = dict(fam["nulls"])
            full.update(vals)
            built = flat(fam["template"].format(**full))
            want = flat(stored[name])
            if built is None or built != want:
                fails.append("anchor %s mismatch\n  built %s\n  want  %s"
                             % (name, built, want))
        proven = sum(1 for v in fam["anchors"].values() if v is not None)
        if proven < 2:
            fails.append("%s: %d anchors, need 2" % (fam["cls"], proven))
    if fails:
        for f in fails:
            print("FAIL " + f, file=sys.stderr)
        raise SystemExit(1)

    out = []
    counts = []
    for fam in FAMILIES:
        parent = fam["template"].format(**fam["nulls"])
        pmol = Chem.MolFromSmiles(parent)
        if pmol is None:
            fails.append("%s: parent will not parse: %s" % (fam["cls"], parent))
            continue
        base = parse_formula(CalcMolFormula(pmol))
        made = 0
        skipped = 0
        for vals in combos(fam["slots"]):
            if made >= fam["target"]:
                break
            if all(vals[k] == fam["nulls"][k] for k in vals):
                continue
            tally = dict(base)
            for k, v in vals.items():
                for sym, n in group_formula(v).items():
                    tally[sym] = tally.get(sym, 0) + n
                for sym, n in group_formula(fam["nulls"][k]).items():
                    tally[sym] = tally.get(sym, 0) - n
            stated = render_formula(tally)
            smiles = fam["template"].format(**vals)
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                fails.append("%s: will not parse: %s" % (fam["cls"], smiles))
                continue
            got = CalcMolFormula(mol)
            if got != stated:
                fails.append("%s: formula %s stated, %s computed: %s"
                             % (fam["cls"], stated, got, smiles))
                continue
            key = flat(smiles)
            if key in seen:
                skipped += 1
                continue
            label = fam["name"](vals)
            if label.lower() in taken:
                skipped += 1
                continue
            seen[key] = "new"
            taken.add(label.lower())
            out.append("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
                       % (label, fam["cls"], stated, smiles))
            made += 1
        counts.append("%s %d" % (fam["cls"], made))
        if made < fam["target"]:
            fails.append("%s: only %d of %d (%d collisions skipped)"
                         % (fam["cls"], made, fam["target"], skipped))

    if fails:
        for f in fails:
            print("FAIL " + f, file=sys.stderr)
        raise SystemExit(1)

    sys.stdout.write("".join(out))
    print("%d new rows (%s)" % (len(out), "; ".join(counts)), file=sys.stderr)


if __name__ == "__main__":
    main()
