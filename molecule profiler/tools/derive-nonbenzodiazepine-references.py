# Derives homologue references on three sedative-hypnotic templates: the
# 2,3-disubstituted quinazolin-4-ones (methaqualone family), the
# 1-substituted cyclohexyl carbamates (ethinamate family) and the
# 2-halo-N-carbamoylalkanamides (carbromal family).
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree. Templates
# reserve ring digits 1 and 2, so interpolated rings use 3 upwards.

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
    "": ("H", None),
    "C": ("CH3", "methyl"),
    "CC": ("C2H5", "ethyl"),
    "CCC": ("C3H7", "propyl"),
    "CCCC": ("C4H9", None),
    "CCCCC": ("C5H11", None),
    "CC(C)": ("C3H7", "propan-2-yl"),
    "C(C)C": ("C3H7", None),
    "FC": ("CH2F", "(fluoromethyl)"),
    "ClC": ("CH2Cl", "(chloromethyl)"),
    "CC=C": ("C3H5", None),
    "(C(C)C)": ("C3H7", None),
    "CO": ("CH3O", "methoxy"),
    "CCO": ("C2H5O", "(2-hydroxyethyl)"),
    "CC(O)CO": ("C3H7O2", "(2,3-dihydroxypropyl)"),
    "c3ccccc3": ("C6H5", "phenyl"),
    "c3ccccc3C": ("C7H7", "(2-methylphenyl)"),
    "c3cccc(C)c3": ("C7H7", "(3-methylphenyl)"),
    "c3ccc(C)cc3": ("C7H7", "(4-methylphenyl)"),
    "c3ccccc3Cl": ("C6H4Cl", "(2-chlorophenyl)"),
    "c3ccc(Cl)cc3": ("C6H4Cl", "(4-chlorophenyl)"),
    "c3ccccc3F": ("C6H4F", "(2-fluorophenyl)"),
    "c3ccccc3OC": ("C7H7O", "(2-methoxyphenyl)"),
    "(N)": ("NH2", "amino"),
    "(C)": ("CH3", "methyl"),
    "(F)": ("F", "fluoro"),
    "(Cl)": ("Cl", "chloro"),
    "(OC)": ("CH3O", "methoxy"),
    "(CC)": ("C2H5", None),
    "(Br)": ("Br", None),
    "C#C": ("C2H", None),
    "C#CC": ("C3H3", None),
    "C#CCC": ("C4H5", None),
    "C=C": ("C2H3", None),
    "C=CC": ("C3H5", None),
}

CARB = {
    "C#C": "(1-ethynylcyclohexyl) carbamate",
    "C#CC": "(1-prop-2-ynylcyclohexyl) carbamate",
    "C#CCC": "(1-but-3-ynylcyclohexyl) carbamate",
    "C=C": "(1-ethenylcyclohexyl) carbamate",
    "C=CC": "(1-prop-2-enylcyclohexyl) carbamate",
    "CC": "(1-ethylcyclohexyl) carbamate",
    "C": "(1-methylcyclohexyl) carbamate",
    "c3ccccc3": "(1-phenylcyclohexyl) carbamate",
}

BRUR = {
    ("CC", "(Br)"): "2-bromo-N-carbamoyl-2-ethylbutanamide",
    ("C", "(Br)"): "2-bromo-N-carbamoyl-2-methylbutanamide",
    ("CCC", "(Br)"): "2-bromo-N-carbamoyl-2-ethylpentanamide",
    ("CCCC", "(Br)"): "2-bromo-N-carbamoyl-2-ethylhexanamide",
    ("CCCCC", "(Br)"): "2-bromo-N-carbamoyl-2-ethylheptanamide",
    ("C(C)C", "(Br)"): "2-bromo-N-carbamoyl-2-ethyl-3-methylbutanamide",
    ("CC", "(Cl)"): "N-carbamoyl-2-chloro-2-ethylbutanamide",
    ("C", "(Cl)"): "N-carbamoyl-2-chloro-2-methylbutanamide",
    ("CCC", "(Cl)"): "N-carbamoyl-2-chloro-2-ethylpentanamide",
    ("CCCC", "(Cl)"): "N-carbamoyl-2-chloro-2-ethylhexanamide",
    ("CCCCC", "(Cl)"): "N-carbamoyl-2-chloro-2-ethylheptanamide",
    ("C(C)C", "(Cl)"): "N-carbamoyl-2-chloro-2-ethyl-3-methylbutanamide",
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


def enclose(text):
    return text if "-" not in text and "," not in text else "(" + text + ")"



MULT = {2: "di", 3: "tri"}


def collapse(items):
    order = []
    byname = {}
    for loc, nm in items:
        if nm not in byname:
            byname[nm] = []
            order.append(nm)
        byname[nm].append(loc)
    parts = []
    for nm in order:
        locs = byname[nm]
        if len(locs) == 1:
            parts.append(pref(nm, locs[0] + "-" + nm))
        else:
            parts.append(pref(nm, ",".join(locs) + "-" + MULT[len(locs)] + nm))
    return parts

def name_quinazolinone(v):
    r2 = group_name(v["R2"])
    n1 = group_name(v["N1"])
    items = [("2", r2), ("3", n1)]
    if v["R6"]:
        items.append(("6", group_name(v["R6"])))
    return join(collapse(items), "quinazolin-4-one")


def name_cyclohexyl_carbamate(v):
    return CARB[v["R"]]


def name_bromureide(v):
    return BRUR[(v["R1"], v["X"])]


FAMILIES = [
    {
        "cls": "Nonbenzodiazepine hypnotic",
        "template": "{R2}c1nc2ccc{R6}cc2c(=O)n1{N1}",
        "nulls": {"R2": "C", "R6": "", "N1": "c3ccccc3C"},
        "slots": {
            "R2": ["C", "CC", "FC", "CCC", "CC(C)", "ClC", "CO"],
            "R6": ["", "(N)", "(C)", "(F)", "(Cl)", "(OC)"],
            "N1": ["c3ccccc3C", "c3ccccc3Cl", "c3ccccc3F", "c3ccccc3",
                   "c3ccc(C)cc3", "c3ccc(Cl)cc3", "c3ccccc3OC",
                   "c3cccc(C)c3", "CC(O)CO", "CCO"],
        },
        "name": name_quinazolinone,
        "target": 12,
        "anchors": {
            "Methaqualone": {},
            "Mecloqualone": {"N1": "c3ccccc3Cl"},
            "Etaqualone": {"R2": "CC"},
            "Afloqualone": {"R2": "FC", "R6": "(N)"},
            "Diproqualone": {"N1": "CC(O)CO"},
        },
    },
    {
        "cls": "Nonbenzodiazepine hypnotic",
        "template": "{R}C1(OC(N)=O)CCCCC1",
        "nulls": {"R": "C#C"},
        "slots": {
            "R": ["C#C", "C#CC", "C#CCC", "C=CC", "C=C", "CC", "C",
                  "c3ccccc3"],
        },
        "name": name_cyclohexyl_carbamate,
        "target": 5,
        "anchors": {
            "Ethinamate": {},
            "Hexapropymate": {"R": "C#CC"},
        },
    },
    {
        "cls": "Nonbenzodiazepine hypnotic",
        "template": "C({R1}){R2}{X}C(=O)NC(N)=O",
        "nulls": {"R1": "CC", "R2": "(CC)", "X": "(Br)"},
        "slots": {
            "R1": ["CC", "C", "CCC", "CCCC", "C(C)C", "CCCCC"],
            "R2": ["(CC)"],
            "X": ["(Br)", "(Cl)"],
        },
        "name": name_bromureide,
        "target": 6,
        "anchors": {
            "Carbromal": {},
            "Bromisoval": {"R1": "C(C)C", "R2": ""},
            "Apronal": {"R1": "CC=C", "R2": "(C(C)C)", "X": ""},
        },
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
    seen = {}
    for m in ENTRY.finditer(lib):
        name, cls, formula, smiles = m.groups()
        stored[name] = smiles
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
            seen[key] = "new"
            out.append("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
                       % (fam["name"](vals), fam["cls"], stated, smiles))
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
