# Derives homologue references on three nicotinic ligand templates: the
# 3-(pyrrolidin-2-yl)pyridine of nornicotine and anabasine, the
# 5-(pyridin-3-yl)pyrrolidin-2-one of cotinine, and the
# N-(1-azabicyclo[2.2.2]octan-3-yl)arylamide of PNU-282987.
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree. Only the
# difference between a slot value and its null value enters the tally, so a
# ring-size slot is written with two spellings of the same group.

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
    "C=CC": ("C3H5", "prop-2-enyl"),
    "c3ccccc3C": ("C7H7", "benzyl"),
    "(C)": ("CH3", "methyl"),
    "(O)": ("HO", "hydroxy"),
    "(OC)": ("CH3O", "methoxy"),
    "(F)": ("F", "fluoro"),
    "(Cl)": ("Cl", "chloro"),
    "(Br)": ("Br", "bromo"),
    "c3ccc(Cl)cc3": ("C6H4Cl", None),
    "c3cc4ccoc4cn3": ("C7H4NO", None),
    "c3ccccc3": ("C6H5", None),
    "c3ccc(F)cc3": ("C6H4F", None),
    "c3ccc(C)cc3": ("C7H7", None),
    "c3ccc(OC)cc3": ("C7H7O", None),
    "c3ccc(Br)cc3": ("C6H4Br", None),
    "c3ccc(C#N)cc3": ("C7H4N", None),
    "c3cccnc3": ("C5H4N", None),
    "c3ccncc3": ("C5H4N", None),
    "c3cccs3": ("C4H3S", None),
    "c3ccsc3": ("C4H3S", None),
    "c3ccco3": ("C4H3O", None),
    "c3ccc(Cl)nc3": ("C5H3ClN", None),
}

RING = {"C": "pyrrolidin-2-yl", "CC": "piperidin-2-yl"}

PYRIDYL = {
    "": "pyridin-3-yl",
    "(C)": "(6-methylpyridin-3-yl)",
    "(Cl)": "(6-chloropyridin-3-yl)",
    "(F)": "(6-fluoropyridin-3-yl)",
    "(OC)": "(6-methoxypyridin-3-yl)",
    "(Br)": "(6-bromopyridin-3-yl)",
}

AMIDE = {
    "c3ccc(Cl)cc3": "4-chlorobenzamide",
    "c3cc4ccoc4cn3": "furo[2,3-c]pyridine-5-carboxamide",
    "c3ccccc3": "benzamide",
    "c3ccc(F)cc3": "4-fluorobenzamide",
    "c3ccc(C)cc3": "4-methylbenzamide",
    "c3ccc(OC)cc3": "4-methoxybenzamide",
    "c3ccc(Br)cc3": "4-bromobenzamide",
    "c3ccc(C#N)cc3": "4-cyanobenzamide",
    "c3cccnc3": "pyridine-3-carboxamide",
    "c3ccncc3": "pyridine-4-carboxamide",
    "c3cccs3": "thiophene-2-carboxamide",
    "c3ccsc3": "thiophene-3-carboxamide",
    "c3ccco3": "furan-2-carboxamide",
    "c3ccc(Cl)nc3": "6-chloropyridine-3-carboxamide",
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



MULT = {2: "di", 3: "tri", 4: "tetra", 5: "penta"}


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


def name_pyridylazacycle(v):
    ring = RING[v["RG"]]
    if v["NR"]:
        sub = "(1-" + group_name(v["NR"]) + ring + ")"
    else:
        sub = ring
    items = [("3", sub)]
    if v["P"]:
        items.append(("6", group_name(v["P"])))
    return join(collapse(items), "pyridine")


def name_pyrrolidinone(v):
    items = []
    if v["NR"]:
        items.append(("1", group_name(v["NR"])))
    if v["X4"]:
        items.append(("4", group_name(v["X4"])))
    items.append(("5", PYRIDYL[v["P"]]))
    return join(collapse(items), "pyrrolidin-2-one")


def name_quinuclidinyl_amide(v):
    tail = AMIDE[v["AR"]]
    gap = "-" if tail[0].isdigit() else ""
    return "N-(1-azabicyclo[2.2.2]octan-3-yl)" + gap + tail


FAMILIES = [
    {
        "cls": "Nicotinic ligand",
        "template": "{NR}N1C{RG}CC1c1ccc{P}nc1",
        "nulls": {"NR": "", "RG": "C", "P": ""},
        "slots": {
            "NR": ["", "C", "CC", "CCC", "C=CC", "c3ccccc3C"],
            "RG": ["C", "CC"],
            "P": ["", "(C)", "(Cl)", "(F)", "(OC)", "(Br)"],
        },
        "name": name_pyridylazacycle,
        "target": 10,
        "anchors": {
            "Nornicotine": {},
            "Anabasine": {"RG": "CC"},
        },
    },
    {
        "cls": "Nicotinic ligand",
        "template": "{NR}N1C(=O)CC{X4}C1c1ccc{P}nc1",
        "nulls": {"NR": "C", "X4": "", "P": ""},
        "slots": {
            "NR": ["C", "", "CC", "CCC", "c3ccccc3C"],
            "X4": ["", "(O)", "(C)", "(OC)"],
            "P": ["", "(C)", "(Cl)", "(F)", "(OC)"],
        },
        "name": name_pyrrolidinone,
        "target": 9,
        "anchors": {
            "Cotinine": {},
            "Norcotinine": {"NR": ""},
            "3-Hydroxycotinine": {"X4": "(O)"},
        },
    },
    {
        "cls": "Nicotinic ligand",
        "template": "O=C(NC1CN2CCC1CC2){AR}",
        "nulls": {"AR": "c3ccc(Cl)cc3"},
        "slots": {
            "AR": ["c3ccc(Cl)cc3", "c3cc4ccoc4cn3", "c3ccccc3",
                   "c3ccc(F)cc3", "c3cccnc3", "c3ccc(C)cc3",
                   "c3ccc(OC)cc3", "c3ccc(Cl)nc3", "c3cccs3",
                   "c3ccncc3", "c3ccsc3", "c3ccc(Br)cc3",
                   "c3ccc(C#N)cc3", "c3ccco3"],
        },
        "name": name_quinuclidinyl_amide,
        "target": 8,
        "anchors": {
            "PNU-282987": {},
            "PHA-543613": {"AR": "c3cc4ccoc4cn3"},
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
