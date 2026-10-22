# Derives homologue references on two pyrazolone templates: the
# 1,5-dimethyl-2-phenylpyrazol-3-one of antipyrine and the
# 1,2-diphenylpyrazolidine-3,5-dione of phenylbutazone.
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree.

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
    "CCCC": ("C4H9", "butyl"),
    "CCCCC": ("C5H11", "pentyl"),
    "CCCCCC": ("C6H13", "hexyl"),
    "CC(C)C": ("C4H9", "2-methylpropyl"),
    "C=CC": ("C3H5", "prop-2-enyl"),
    "OCC": ("C2H5O", "2-hydroxyethyl"),
    "c3ccccc3C": ("C7H7", "benzyl"),
    "c3ccccc3CC": ("C8H9", "2-phenylethyl"),
    "C3CCCCC3C": ("C7H13", "cyclohexylmethyl"),
    "CC(=O)CC": ("C4H7O", "3-oxobutyl"),
    "CC(C)=CC": ("C5H9", "3-methylbut-2-enyl"),
    "CC(O)CC": ("C4H9O", "3-hydroxybutyl"),
    "c3ccccc3SCC": ("C8H9S", "2-phenylsulfanylethyl"),
    "(C)": ("CH3", "methyl"),
    "(CC)": ("C2H5", "ethyl"),
    "(CCC)": ("C3H7", "propyl"),
    "(CCCC)": ("C4H9", "butyl"),
    "(C(C)(C)C)": ("C4H9", "tert-butyl"),
    "(F)": ("F", "fluoro"),
    "(OC)": ("CH3O", "methoxy"),
    "(C#N)": ("CN", "cyano"),
    "(NCC)": ("C2H6N", "ethylamino"),
    "(N(CC)CC)": ("C4H10N", "diethylamino"),
    "(NC(=O)CC)": ("C3H6NO", "propanoylamino"),
    "(c3ccccc3)": ("C6H5", "phenyl"),
    "(Cc3ccccc3)": ("C7H7", "benzyl"),
    "(SC)": ("CH3S", "methylsulfanyl"),
    "(C(=O)C)": ("C2H3O", "acetyl"),
    "(O)": ("HO", "hydroxy"),
    "(Cl)": ("Cl", "chloro"),
}

ARYL = {
    "": "phenyl",
    "(O)": "(4-hydroxyphenyl)",
    "(C)": "(4-methylphenyl)",
    "(Cl)": "(4-chlorophenyl)",
    "(OC)": "(4-methoxyphenyl)",
    "(F)": "(4-fluorophenyl)",
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


def name_antipyrine(v):
    items = [("1", group_name(v["N1"])), ("2", ARYL[v["P4"]])]
    if v["C4"]:
        items.append(("4", group_name(v["C4"])))
    items.append(("5", group_name(v["C5"])))
    return join(collapse(items), "pyrazol-3-one")


def name_butazone(v):
    items = [("1", ARYL[v["P2"]]), ("2", "phenyl"), ("4", group_name(v["R4"]))]
    return join(collapse(items), "pyrazolidine-3,5-dione")


FAMILIES = [
    {
        "cls": "Pyrazolone",
        "template": "{C5}c1c{C4}c(=O)n(-c2ccc{P4}cc2)n1{N1}",
        "nulls": {"C5": "C", "C4": "", "P4": "", "N1": "C"},
        "slots": {
            "C4": ["", "(C)", "(CC)", "(CCC)", "(OC)", "(F)", "(C#N)",
                   "(NCC)", "(N(CC)CC)", "(SC)", "(C(=O)C)", "(CCCC)",
                   "(c3ccccc3)", "(Cc3ccccc3)", "(C(C)(C)C)", "(NC(=O)CC)"],
            "P4": ["", "(O)", "(C)", "(Cl)", "(OC)", "(F)"],
            "N1": ["C", "CC", "CCC"],
            "C5": ["C", "CC"],
        },
        "name": name_antipyrine,
        "target": 15,
        "anchors": {
            "Antipyrine": {},
            "Propyphenazone": {"C4": "(C(C)C)"},
            "4-Aminoantipyrine": {"C4": "(N)"},
            "4-Hydroxyantipyrine": {"C4": "(O)"},
            "4-Chloroantipyrine": {"C4": "(Cl)"},
            "4-Bromoantipyrine": {"C4": "(Br)"},
            "Aminophenazone": {"C4": "(N(C)C)"},
        },
    },
    {
        "cls": "Pyrazolone",
        "template": "{R4}C1C(=O)N(c2ccccc2)N(c2ccc{P2}cc2)C1=O",
        "nulls": {"R4": "CCCC", "P2": ""},
        "slots": {
            "R4": ["CCCC", "CCC", "CCCCC", "CCCCCC", "CC(C)C", "C=CC",
                   "c3ccccc3C", "c3ccccc3CC", "OCC", "C3CCCCC3C", "CC", "C"],
            "P2": ["", "(O)", "(C)", "(Cl)", "(OC)", "(F)"],
        },
        "name": name_butazone,
        "target": 12,
        "anchors": {
            "Phenylbutazone": {},
            "Oxyphenbutazone": {"P2": "(O)"},
            "Kebuzone": {"R4": "CC(=O)CC"},
            "Feprazone": {"R4": "CC(C)=CC"},
            "gamma-Hydroxyphenylbutazone": {"R4": "CC(O)CC"},
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
