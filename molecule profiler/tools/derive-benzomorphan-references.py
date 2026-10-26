# Derives homologue references on two opioid templates: the
# 2-aminocyclohexyl benzamides (the U-47700 and U-48800 series) and the
# benzomorphans, formally 1,2,3,4,5,6-hexahydro-2,6-methano-3-benzazocines
# (the metazocine, cyclazocine, phenazocine and pentazocine series).
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match after stereochemistry
# is stripped, so a stored entry written in a different atom order still
# proves the template. Molecular formulae are composed from the parent
# scaffold formula plus the formula of each substituent group, written once
# per group; RDKit then recomputes the formula from the assembled structure
# and the two must agree. The benzamide template reserves ring digits 1 and
# 2 and the benzomorphan template reserves 1 to 3, so interpolated rings use
# the next digit upwards. Rows are skipped when their structure or their
# name is already stored.

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

ATOM = re.compile(r"([A-Z][a-z]?)(\d*)")
LETTERS = re.compile(r"[^a-z]")

BENZAMIDE_ARYLS = {
    "c2ccccc2": ("C6H5", []),
    "c2ccc(Cl)c(Cl)c2": ("C6H3Cl2", [("3", "chloro"), ("4", "chloro")]),
    "c2ccc(Cl)cc2Cl": ("C6H3Cl2", [("2", "chloro"), ("4", "chloro")]),
    "c2cc(Cl)cc(Cl)c2": ("C6H3Cl2", [("3", "chloro"), ("5", "chloro")]),
    "c2ccc(Cl)c(Cl)c2Cl": ("C6H2Cl3", [("2", "chloro"), ("3", "chloro"), ("4", "chloro")]),
    "c2ccc(Cl)cc2": ("C6H4Cl", [("4", "chloro")]),
    "c2cccc(Cl)c2": ("C6H4Cl", [("3", "chloro")]),
    "c2ccccc2Cl": ("C6H4Cl", [("2", "chloro")]),
    "c2ccc(F)cc2": ("C6H4F", [("4", "fluoro")]),
    "c2cccc(F)c2": ("C6H4F", [("3", "fluoro")]),
    "c2ccc(Br)cc2": ("C6H4Br", [("4", "bromo")]),
    "c2ccc(I)cc2": ("C6H4I", [("4", "iodo")]),
    "c2ccc(C)cc2": ("C7H7", [("4", "methyl")]),
    "c2ccc(OC)cc2": ("C7H7O", [("4", "methoxy")]),
    "c2ccc(C#N)cc2": ("C7H4N", [("4", "cyano")]),
    "c2ccc(C(F)(F)F)cc2": ("C7H4F3", [("4", "trifluoromethyl")]),
    "c2ccc(F)c(F)c2": ("C6H3F2", [("3", "fluoro"), ("4", "fluoro")]),
    "c2ccc(C)c(C)c2": ("C8H9", [("3", "methyl"), ("4", "methyl")]),
    "c2ccc(OC)c(OC)c2": ("C8H9O2", [("3", "methoxy"), ("4", "methoxy")]),
    "c2ccc(Cl)c(F)c2": ("C6H3ClF", [("3", "fluoro"), ("4", "chloro")]),
    "c2ccc(F)c(Cl)c2": ("C6H3ClF", [("3", "chloro"), ("4", "fluoro")]),
    "c2ccc(Cl)cc2F": ("C6H3ClF", [("2", "fluoro"), ("4", "chloro")]),
    "c2ccc(Cl)c(C)c2": ("C7H6Cl", [("3", "methyl"), ("4", "chloro")]),
    "c2ccc(C)c(Cl)c2": ("C7H6Cl", [("3", "chloro"), ("4", "methyl")]),
    "c2ccc(OC)c(Cl)c2": ("C7H6ClO", [("3", "chloro"), ("4", "methoxy")]),
}

BENZAMIDE_NS = {
    "(C)": ("CH3", "methyl"),
    "": ("H", None),
    "(CC)": ("C2H5", "ethyl"),
    "(CCC)": ("C3H7", "propyl"),
    "(C(C)C)": ("C3H7", "propan-2-yl"),
}

BENZAMIDE_AMINES = {
    "CN(C)": ("C2H6N", "[2-(dimethylamino)cyclohexyl]"),
    "CCN(CC)": ("C4H10N", "[2-(diethylamino)cyclohexyl]"),
    "CN": ("CH4N", "[2-(methylamino)cyclohexyl]"),
    "N": ("H2N", "(2-aminocyclohexyl)"),
    "C3CCCN3": ("C4H8N", "[2-(pyrrolidin-1-yl)cyclohexyl]"),
}

BENZAZOCINE_RING = {
    "O": ("HO", "hydroxy"),
    "OC": ("CH3O", "methoxy"),
    "OCC": ("C2H5O", "ethoxy"),
    "OCCC": ("C3H7O", "propoxy"),
    "OC(C)C": ("C3H7O", "propan-2-yloxy"),
    "OC(=O)C": ("C2H3O2", "acetyloxy"),
    "F": ("F", "fluoro"),
    "Cl": ("Cl", "chloro"),
    "Br": ("Br", "bromo"),
    "C": ("CH3", "methyl"),
    "N": ("H2N", "amino"),
    "C#N": ("CN", "cyano"),
    "C(F)(F)F": ("CF3", "trifluoromethyl"),
}

BENZAZOCINE_NS = {
    "C": ("CH3", "methyl"),
    "": ("H", None),
    "CC": ("C2H5", "ethyl"),
    "CCC": ("C3H7", "propyl"),
    "CCCC": ("C4H9", "butyl"),
    "CC(C)C": ("C4H9", "2-methylpropyl"),
    "C4CC4": ("C3H5", "cyclopropyl"),
    "CC4CC4": ("C4H7", "(cyclopropylmethyl)"),
    "CC4CCC4": ("C5H9", "(cyclobutylmethyl)"),
    "CC4CCCC4": ("C6H11", "(cyclopentylmethyl)"),
    "CC=C(C)C": ("C5H9", "3-methylbut-2-en-1-yl"),
    "CCc4ccccc4": ("C8H9", "2-phenylethyl"),
    "CC=C": ("C3H5", "prop-2-en-1-yl"),
    "CC#C": ("C3H3", "prop-2-yn-1-yl"),
    "CCO": ("C2H5O", "2-hydroxyethyl"),
}


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


def slot_formula(fam, key, value):
    table = fam["tables"][key]
    if value not in table:
        raise SystemExit("FAIL unknown %s group %r" % (key, value))
    return parse_formula(table[value][0])


def slot_name(fam, key, value):
    name = fam["tables"][key][value][1]
    if name is None:
        raise SystemExit("FAIL %s group %r carries no name" % (key, value))
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


MULT = {2: "di", 3: "tri", 4: "tetra", 5: "penta", 6: "hexa"}


def rank(loc):
    return (0, 0) if loc == "N" else (1, int(loc))


def collapse(items):
    order = []
    byname = {}
    for loc, nm in sorted(items, key=lambda item: rank(item[0])):
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


def name_benzamide(fam, v):
    items = [("N", fam["tables"]["AM"][v["AM"]][1])]
    rname = fam["tables"]["R"][v["R"]][1]
    if rname is not None:
        items.append(("N", enclose(rname)))
    items.extend(fam["tables"]["AR"][v["AR"]][1])
    return join(collapse(items), "benzamide")


def name_benzazocine(fam, v):
    items = [("6", "methyl"), ("11", "methyl")]
    rname = fam["tables"]["R"][v["R"]][1]
    if rname is not None:
        items.append(("3", enclose(rname)))
    if v["P"] == "O":
        stem = "1,2,3,4,5,6-hexahydro-2,6-methano-3-benzazocin-8-ol"
    else:
        stem = "1,2,3,4,5,6-hexahydro-2,6-methano-3-benzazocine"
        items.append(("8", enclose(slot_name(fam, "P", v["P"]))))
    return join(collapse(items), stem)


FAMILIES = [
    {
        "cls": "Benzamide opioid",
        "template": "{AM}C1CCCCC1N{R}C(=O){AR}",
        "nulls": {"AM": "CN(C)", "R": "(C)", "AR": "c2ccc(Cl)c(Cl)c2"},
        "tables": {"AM": BENZAMIDE_AMINES, "R": BENZAMIDE_NS, "AR": BENZAMIDE_ARYLS},
        "name": name_benzamide,
        "target": 46,
        "anchors": {
            "U-47700": {},
            "U-48800": {"AR": "c2ccc(Cl)cc2Cl"},
        },
    },
    {
        "cls": "Benzomorphan opioid",
        "template": "CC1C2Cc3ccc({P})cc3C1(C)CCN2{R}",
        "nulls": {"P": "O", "R": "C"},
        "tables": {"P": BENZAZOCINE_RING, "R": BENZAZOCINE_NS},
        "name": name_benzazocine,
        "target": 46,
        "anchors": {
            "Metazocine": {},
            "Cyclazocine": {"R": "CC4CC4"},
            "Phenazocine": {"R": "CCc4ccccc4"},
            "Pentazocine": {"R": "CC=C(C)C"},
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
        fam["slots"] = {k: list(fam["tables"][k]) for k in fam["tables"]}
        for name, vals in fam["anchors"].items():
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
        proven = len(fam["anchors"])
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
                for sym, n in slot_formula(fam, k, v).items():
                    tally[sym] = tally.get(sym, 0) + n
                for sym, n in slot_formula(fam, k, fam["nulls"][k]).items():
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
            row = fam["name"](fam, vals)
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
