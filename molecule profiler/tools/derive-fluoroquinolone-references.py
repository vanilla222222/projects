# Derives homologue references on two quinolone-carboxylic-acid templates:
# the 6-fluoro-4-oxoquinoline-3-carboxylic acid core varied at N1, C7 and C8
# (the norfloxacin, ciprofloxacin and gatifloxacin series) and the
# 6-fluoro-4-oxo-1,8-naphthyridine-3-carboxylic acid core varied at N1 and C7
# (the enoxacin series). Each template is proven before use by regenerating
# structures the library already stores and requiring a stereo-stripped
# canonical-SMILES match. Molecular formulae are composed from the parent
# scaffold formula plus the formula of each substituent group, written once
# per group; RDKit then recomputes the formula from the assembled structure
# and the two must agree. Templates reserve ring digits 1 and 2 for the
# bicycle, so substituent rings use 3 upwards. Rows are skipped when their
# structure or their name is already stored.

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
    "[H]": ("H", None),
    "C": ("CH3", "methyl"),
    "F": ("F", "fluoro"),
    "Cl": ("Cl", "chloro"),
    "OC": ("CH3O", "methoxy"),
    "CC": ("C2H5", "ethyl"),
    "CCC": ("C3H7", "propyl"),
    "CC(C)": ("C3H7", "propan-2-yl"),
    "CC(C)(C)": ("C4H9", "tert-butyl"),
    "C3CC3": ("C3H5", "cyclopropyl"),
    "FCC": ("C2H4F", "2-fluoroethyl"),
    "CN": ("CH4N", "methylamino"),
    "c3cc(F)ccc3": ("C6H4F", "4-fluorophenyl"),
    "Fc3cc(F)ccc3": ("C6H3F2", "2,4-difluorophenyl"),
    "N4CCNCC4": ("C4H9N2", "piperazin-1-yl"),
    "N4CCN(C)CC4": ("C5H11N2", "4-methylpiperazin-1-yl"),
    "N4CC(C)NCC4": ("C5H11N2", "3-methylpiperazin-1-yl"),
    "N4CCN(CC)CC4": ("C6H13N2", "4-ethylpiperazin-1-yl"),
    "N4CCCC4": ("C4H8N", "pyrrolidin-1-yl"),
    "N4CC(N)CC4": ("C4H9N2", "3-aminopyrrolidin-1-yl"),
    "N4CC(N)CCC4": ("C5H11N2", "3-aminopiperidin-1-yl"),
    "N4CC(N)CCCC4": ("C6H13N2", "3-aminoazepan-1-yl"),
    "N4CC(O)C4": ("C3H6NO", "3-hydroxyazetidin-1-yl"),
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

def plain(names):
    order = []
    byname = {}
    for nm in names:
        if nm not in byname:
            byname[nm] = 0
            order.append(nm)
        byname[nm] += 1
    parts = []
    for nm in order:
        n = byname[nm]
        parts.append(pref(nm, nm if n == 1 else MULT[n] + nm))
    return parts


def acyl(name):
    if name.endswith("carboxylate"):
        return name[:-len("carboxylate")] + "carbonyl"
    return name[:-3] + "yl"



def name_quinolone(v):
    items = [("4", "oxo"), ("6", "fluoro"),
             ("1", enclose(group_name(v["N1"]))),
             ("7", enclose(group_name(v["C7"])))]
    if GROUPS[v["C8"]][1] is not None:
        items.append(("8", enclose(group_name(v["C8"]))))
    return join(collapse(items), "quinoline-3-carboxylic acid")


def name_naphthyridinone(v):
    items = [("4", "oxo"), ("6", group_name(v["C6"])),
             ("1", enclose(group_name(v["N1"]))),
             ("7", enclose(group_name(v["C7"])))]
    return join(collapse(items), "1,8-naphthyridine-3-carboxylic acid")


N1S = ["CC", "C3CC3", "Fc3cc(F)ccc3", "FCC", "c3cc(F)ccc3", "CC(C)",
       "CC(C)(C)"]

C7S = ["N4CCNCC4", "N4CCN(C)CC4", "N4CC(C)NCC4", "N4CC(N)CC4", "N4CCCC4",
       "N4CCN(CC)CC4", "N4CC(N)CCC4", "N4CC(N)CCCC4", "N4CC(O)C4"]

C8S = ["[H]", "F", "Cl", "OC"]

FAMILIES = [
    {
        "cls": "Fluoroquinolone",
        "template": "{N1}n1cc(C(=O)O)c(=O)c2cc(F)c({C7})c({C8})c21",
        "nulls": {"N1": "CC", "C7": "N4CCNCC4", "C8": "[H]"},
        "slots": {"N1": N1S, "C7": C7S, "C8": C8S},
        "name": name_quinolone,
        "target": 23,
        "anchors": {
            "Norfloxacin": {},
            "Pefloxacin": {"C7": "N4CCN(C)CC4"},
            "Ciprofloxacin": {"N1": "C3CC3"},
            "Enrofloxacin": {"N1": "C3CC3", "C7": "N4CCN(CC)CC4"},
            "Lomefloxacin": {"C7": "N4CC(C)NCC4", "C8": "F"},
            "Fleroxacin": {"N1": "FCC", "C7": "N4CCN(C)CC4", "C8": "F"},
            "Sarafloxacin": {"N1": "c3cc(F)ccc3"},
            "Difloxacin": {"N1": "c3cc(F)ccc3", "C7": "N4CCN(C)CC4"},
            "Amifloxacin": {"N1": "CN", "C7": "N4CCN(C)CC4"},
            "Gatifloxacin": {"N1": "C3CC3", "C7": "N4CC(C)NCC4", "C8": "OC"},
            "Clinafloxacin": {"N1": "C3CC3", "C7": "N4CC(N)CC4", "C8": "Cl"},
            "Besifloxacin": {"N1": "C3CC3", "C7": "N4CC(N)CCCC4", "C8": "Cl"},
        },
    },
    {
        "cls": "Fluoroquinolone",
        "template": "{N1}n1cc(C(=O)O)c(=O)c2cc({C6})c({C7})nc21",
        "nulls": {"N1": "CC", "C6": "F", "C7": "N4CCNCC4"},
        "slots": {"N1": N1S, "C6": ["F"], "C7": C7S},
        "name": name_naphthyridinone,
        "target": 12,
        "anchors": {
            "Enoxacin": {},
            "Nalidixic acid": {"C6": "[H]", "C7": "C"},
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
    stored_names = set()
    seen = {}
    for m in ENTRY.finditer(lib):
        name, cls, formula, smiles = m.groups()
        stored[name] = smiles
        stored_names.add(name)
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
            stated = render_formula(tally) + fam.get("charge", "")
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
            row = fam["name"](vals)
            if row in stored_names:
                skipped += 1
                continue
            seen[key] = "new"
            stored_names.add(row)
            out.append("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
                       % (row, fam["cls"], stated, smiles))
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
