# Derives homologue references on three phytoestrogen templates: the
# 2-arylchromen-4-ones (flavones), the 3-arylchromen-4-ones (isoflavones)
# and the 2-aryl-2,3-dihydrochromen-4-ones (flavanones).
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
    "(O)": ("HO", "hydroxy"),
    "(OC)": ("CH3O", "methoxy"),
    "c3ccccc3": ("C6H5", "phenyl"),
    "c3ccc(O)cc3": ("C6H5O", "(4-hydroxyphenyl)"),
    "c3cccc(O)c3": ("C6H5O", "(3-hydroxyphenyl)"),
    "c3ccc(O)c(O)c3": ("C6H5O2", "(3,4-dihydroxyphenyl)"),
    "c3ccc(O)cc3O": ("C6H5O2", "(2,4-dihydroxyphenyl)"),
    "c3cc(O)c(O)c(O)c3": ("C6H5O3", "(3,4,5-trihydroxyphenyl)"),
    "c3ccc(OC)cc3": ("C7H7O", "(4-methoxyphenyl)"),
    "c3ccc(OC)c(O)c3": ("C7H7O2", "(3-hydroxy-4-methoxyphenyl)"),
    "c3ccc(O)c(OC)c3": ("C7H7O2", "(4-hydroxy-3-methoxyphenyl)"),
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
def ring_items(v):
    items = []
    for loc in ("5", "6", "7", "8"):
        val = v["R" + loc]
        if val:
            items.append((loc, group_name(val)))
    return items


def name_flavone(v):
    items = [("2", group_name(v["AR"]))] + ring_items(v)
    return join(collapse(items), "chromen-4-one")


def name_isoflavone(v):
    items = [("3", group_name(v["AR"]))] + ring_items(v)
    return join(collapse(items), "chromen-4-one")


def name_flavanone(v):
    items = [("2", group_name(v["AR"]))] + ring_items(v)
    return join(collapse(items), "2,3-dihydrochromen-4-one")


ARYLS = ["c3ccc(O)cc3", "c3ccccc3", "c3ccc(O)c(O)c3", "c3ccc(OC)cc3",
         "c3cccc(O)c3", "c3ccc(O)cc3O", "c3cc(O)c(O)c(O)c3",
         "c3ccc(OC)c(O)c3", "c3ccc(O)c(OC)c3"]

OXY = ["", "(O)", "(OC)"]

FAMILIES = [
    {
        "cls": "Phytoestrogen",
        "template": "O=c1c{R3}c({AR})oc2c{R8}c{R7}c{R6}c{R5}c12",
        "nulls": {"R3": "", "AR": "c3ccccc3", "R8": "", "R7": "", "R6": "",
                  "R5": ""},
        "slots": {
            "R3": ["", "(O)"],
            "AR": ARYLS,
            "R8": OXY,
            "R7": ["(O)", "", "(OC)"],
            "R6": OXY,
            "R5": ["(O)", "", "(OC)"],
        },
        "name": name_flavone,
        "target": 10,
        "anchors": {
            "Chrysin": {"R7": "(O)", "R5": "(O)"},
            "7-Hydroxyflavone": {"R7": "(O)"},
            "Apigenin": {"AR": "c3ccc(O)cc3", "R7": "(O)", "R5": "(O)"},
            "Luteolin": {"AR": "c3ccc(O)c(O)c3", "R7": "(O)", "R5": "(O)"},
            "Baicalein": {"R7": "(O)", "R6": "(O)", "R5": "(O)"},
            "Kaempferol": {"R3": "(O)", "AR": "c3ccc(O)cc3", "R7": "(O)",
                           "R5": "(O)"},
            "Galangin": {"R3": "(O)", "R7": "(O)", "R5": "(O)"},
            "Myricetin": {"R3": "(O)", "AR": "c3cc(O)c(O)c(O)c3",
                          "R7": "(O)", "R5": "(O)"},
        },
    },
    {
        "cls": "Phytoestrogen",
        "template": "O=c1c({AR})coc2c{R8}c{R7}c{R6}c{R5}c12",
        "nulls": {"AR": "c3ccc(O)cc3", "R8": "", "R7": "(O)", "R6": "",
                  "R5": ""},
        "slots": {
            "AR": ARYLS,
            "R8": OXY,
            "R7": ["(O)", "", "(OC)"],
            "R6": OXY,
            "R5": ["", "(O)", "(OC)"],
        },
        "name": name_isoflavone,
        "target": 9,
        "anchors": {
            "Daidzein": {},
            "Formononetin": {"AR": "c3ccc(OC)cc3"},
            "Biochanin A": {"AR": "c3ccc(OC)cc3", "R5": "(O)"},
            "Prunetin": {"R7": "(OC)", "R5": "(O)"},
        },
    },
    {
        "cls": "Phytoestrogen",
        "template": "O=C1CC({AR})Oc2c{R8}c{R7}c{R6}c{R5}c21",
        "nulls": {"AR": "c3ccc(O)cc3", "R8": "", "R7": "(O)", "R6": "",
                  "R5": "(O)"},
        "slots": {
            "AR": ARYLS,
            "R8": OXY,
            "R7": ["(O)", "", "(OC)"],
            "R6": OXY,
            "R5": ["(O)", "", "(OC)"],
        },
        "name": name_flavanone,
        "target": 7,
        "anchors": {
            "Naringenin": {},
            "Liquiritigenin": {"R5": ""},
            "Hesperetin": {"AR": "c3ccc(OC)c(O)c3"},
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
