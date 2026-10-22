# Derives homologue references on three androstane templates: the
# androst-4-en-3-ones (testosterone series), the estr-4-en-3-ones (the
# 19-nor series) and the saturated androstan-3-ones (the 5-alpha series).
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree. The steroid
# templates reserve ring digits 1 and 2, and every substituent slot is a
# parenthesised branch so no interpolated ring is needed. Names carry no
# stereodescriptors because the derived structures carry no stereocentres.

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
    "(C)": ("CH3", "methyl"),
    "(CC)": ("C2H5", "ethyl"),
    "(C#C)": ("C2H", "ethynyl"),
    "(O)": ("HO", "hydroxy"),
    "(F)": ("F", "fluoro"),
    "(Cl)": ("Cl", "chloro"),
    "CC": ("C2H4", None),
    "C=C": ("C2H2", None),
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

def oxy_items(v, keys):
    items = []
    for loc in keys:
        val = v["X" + loc]
        if val:
            items.append((loc, group_name(val)))
    return items


def name_with(v, keys, stem):
    items = oxy_items(v, keys)
    items.append(("17", "hydroxy"))
    if v["X17"]:
        items.append(("17", group_name(v["X17"])))
    items.sort(key=lambda t: int(t[0]))
    return join(collapse(items), stem)


def name_androstene(v):
    stem = "androsta-1,4-dien-3-one" if v["A"] == "C=C" else "androst-4-en-3-one"
    return name_with(v, ("4", "6", "7", "11"), stem)


def name_estrene(v):
    stem = "estra-1,4-dien-3-one" if v["A"] == "C=C" else "estr-4-en-3-one"
    return name_with(v, ("4", "6", "7", "11"), stem)


def name_androstanone(v):
    return name_with(v, ("1", "2", "4", "6", "7"), "androstan-3-one")


METHYL = ["", "(C)"]
C17 = ["", "(C)", "(CC)", "(C#C)"]

FAMILIES = [
    {
        "cls": "Androgen",
        "template": ("CC12{A}C(=O)C{X4}=C1C{X6}C{X7}C1C2C{X11}CC2(C)"
                     "C{X17}(O)CCC12"),
        "nulls": {"A": "CC", "X4": "", "X6": "", "X7": "", "X11": "",
                  "X17": ""},
        "slots": {
            "A": ["CC", "C=C"],
            "X4": ["", "(Cl)", "(C)", "(F)"],
            "X6": METHYL,
            "X7": METHYL,
            "X11": ["", "(O)"],
            "X17": C17,
        },
        "name": name_androstene,
        "target": 10,
        "anchors": {
            "Testosterone": {},
            "Clostebol": {"X4": "(Cl)"},
            "Boldenone": {"A": "C=C"},
            "11b-Hydroxytestosterone": {"X11": "(O)"},
            "Methandienone": {"A": "C=C", "X17": "(C)"},
        },
    },
    {
        "cls": "Androgen",
        "template": ("C12{A}C(=O)C{X4}=C1C{X6}C{X7}C1C2C{X11}CC2(C)"
                     "C{X17}(O)CCC12"),
        "nulls": {"A": "CC", "X4": "", "X6": "", "X7": "", "X11": "",
                  "X17": ""},
        "slots": {
            "A": ["CC", "C=C"],
            "X4": ["", "(Cl)", "(C)", "(F)"],
            "X7": METHYL,
            "X6": METHYL,
            "X11": ["", "(O)"],
            "X17": C17,
        },
        "name": name_estrene,
        "target": 8,
        "anchors": {
            "Nandrolone": {},
            "Norclostebol": {"X4": "(Cl)"},
            "Trestolone": {"X7": "(C)"},
            "Normethandrone": {"X17": "(C)"},
        },
    },
    {
        "cls": "Androgen",
        "template": ("CC12C{X1}C{X2}C(=O)C{X4}C1C{X6}C{X7}C1C2CCC2(C)"
                     "C{X17}(O)CCC12"),
        "nulls": {"X1": "", "X2": "", "X4": "", "X6": "", "X7": "",
                  "X17": ""},
        "slots": {
            "X1": METHYL,
            "X2": METHYL,
            "X4": ["", "(C)", "(Cl)"],
            "X6": METHYL,
            "X7": METHYL,
            "X17": ["", "(C)", "(CC)"],
        },
        "name": name_androstanone,
        "target": 8,
        "anchors": {
            "Stanolone": {},
            "Mesterolone": {"X1": "(C)"},
            "Drostanolone": {"X2": "(C)"},
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
