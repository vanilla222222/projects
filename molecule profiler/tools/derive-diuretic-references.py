# Derives homologue references on four diuretic templates: the
# 3,4-dihydro-2H-1,2,4-benzothiadiazine-7-sulfonamide 1,1-dioxides
# (thiazides), the 4-oxo-1,2,3,4-tetrahydroquinazoline-6-sulfonamides,
# the 4-chloro-3-sulfamoylbenzamides and the 4-aryloxy-5-sulfamoyl-
# benzoic acids (loop diuretics).
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
    "Cl": ("Cl", "chloro"),
    "Br": ("Br", "bromo"),
    "F": ("F", "fluoro"),
    "C": ("CH3", "methyl"),
    "C(F)(F)F": ("CF3", "(trifluoromethyl)"),
    "OC": ("CH3O", "methoxy"),
    "(C)": ("CH3", "methyl"),
    "(CC)": ("C2H5", "ethyl"),
    "(CCC)": ("C3H7", "propyl"),
    "(CCCC)": ("C4H9", "butyl"),
    "(C(C)C)": ("C3H7", "(propan-2-yl)"),
    "(CC(C)C)": ("C4H9", "(2-methylpropyl)"),
    "(CC=C)": ("C3H5", "(prop-2-enyl)"),
    "(CCl)": ("CH2Cl", "(chloromethyl)"),
    "(C(Cl)Cl)": ("CHCl2", "(dichloromethyl)"),
    "(C(F)(F)F)": ("CF3", "(trifluoromethyl)"),
    "(CC3CCCC3)": ("C6H11", "(cyclopentylmethyl)"),
    "(CC3CCCCC3)": ("C7H13", "(cyclohexylmethyl)"),
    "(CC3CCC3)": ("C4H7", "(cyclopropylmethyl)"),
    "(Cc3ccccc3)": ("C7H7", "(phenylmethyl)"),
    "(CSCC(F)(F)F)": ("C3H4F3S", "(2,2,2-trifluoroethylsulfanylmethyl)"),
    "(CSCC=C)": ("C4H7S", "(prop-2-enylsulfanylmethyl)"),
    "(CSCc3ccccc3)": ("C8H9S", "(phenylmethylsulfanylmethyl)"),
    "(CSC)": ("C2H5S", "(methylsulfanylmethyl)"),
    "(COC)": ("C2H5O", "(methoxymethyl)"),
    "(c3ccccc3)": ("C6H5", "phenyl"),
    "(c3ccccc3C)": ("C7H7", "(2-methylphenyl)"),
    "(c3ccc(C)cc3)": ("C7H7", "(4-methylphenyl)"),
    "(c3ccccc3Cl)": ("C6H4Cl", "(2-chlorophenyl)"),
    "(c3c(C)cccc3C)": ("C8H9", "(2,6-dimethylphenyl)"),
    "NN3C(C)CCCC3C": ("C7H15N2", "(2,6-dimethylpiperidin-1-yl)"),
    "NN3C(C)Cc4ccccc43": ("C9H11N2", "(2-methyl-2,3-dihydro-1H-indol-1-yl)"),
    "NN3CCc4ccccc43": ("C8H9N2", "(2,3-dihydro-1H-indol-1-yl)"),
    "NN3CCCCC3": ("C5H11N2", "(piperidin-1-yl)"),
    "NN3CCCC3": ("C4H9N2", "(pyrrolidin-1-yl)"),
    "NN3CCCCCC3": ("C6H13N2", "(azepan-1-yl)"),
    "NN3CCOCC3": ("C4H9N2O", "(morpholin-4-yl)"),
    "NN3C(C)CCCC3": ("C6H13N2", "(2-methylpiperidin-1-yl)"),
    "NC3CCCCC3": ("C6H12N", "cyclohexyl"),
    "NC3CCCC3": ("C5H10N", "cyclopentyl"),
    "Nc3ccccc3": ("C6H6N", "phenyl"),
    "Nc3ccc(C)cc3": ("C7H8N", "(4-methylphenyl)"),
    "Nc3c(C)cccc3C": ("C8H10N", "(2,6-dimethylphenyl)"),
    "NCCN3CCCCC3": ("C7H15N2", "[2-(piperidin-1-yl)ethyl]"),
    "NCCCC": ("C4H10N", "(butylamino)"),
    "NCCC": ("C3H8N", "(propylamino)"),
    "NCC": ("C2H6N", "(ethylamino)"),
    "NCCCCC": ("C5H12N", "(pentylamino)"),
    "NCC3CCCC3": ("C6H12N", "[(cyclopentylmethyl)amino]"),
    "NCc3ccccc3": ("C7H8N", "[(phenylmethyl)amino]"),
    "NCC=C": ("C3H6N", "(prop-2-enylamino)"),
    "NC(C)C": ("C3H8N", "(propan-2-ylamino)"),
    "N3CCCC3": ("C4H8N", "(pyrrolidin-1-yl)"),
    "N3CCCCC3": ("C5H10N", "(piperidin-1-yl)"),
    "c3ccccc3": ("C6H5", "phenoxy"),
    "c3ccc(F)cc3": ("C6H4F", "(4-fluorophenoxy)"),
    "c3ccc(C)cc3": ("C7H7", "(4-methylphenoxy)"),
    "c3ccc(Cl)cc3": ("C6H4Cl", "(4-chlorophenoxy)"),
    "c3ccc(OC)cc3": ("C7H7O", "(4-methoxyphenoxy)"),
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


def name_thiazide(v):
    items = [("6", group_name(v["X"]))]
    for slot, loc in (("N2", "2"), ("R3", "3")):
        if v[slot] != "":
            items.append((loc, group_name(v[slot])))
    items.sort(key=lambda t: t[0])
    parts = collapse(items)
    return join(parts,
                "3,4-dihydro-2H-1,2,4-benzothiadiazine-7-sulfonamide "
                "1,1-dioxide")


def name_quinazolinone(v):
    parts = [pref("chloro", "7-chloro"), pref("oxo", "4-oxo")]
    n = group_name(v["R2"])
    parts.append(pref(n, "2-" + n))
    if v["N3"] != "":
        m = group_name(v["N3"])
        parts.append(pref(m, "3-" + m))
    return join(parts, "1,2,3,4-tetrahydroquinazoline-6-sulfonamide")


def name_benzamide(v):
    n = group_name(v["N"])
    parts = [pref("chloro", "4-chloro"), pref("sulfamoyl", "3-sulfamoyl"),
             pref(n, "N-" + n)]
    return join(parts, "benzamide")


def name_loop(v):
    n = group_name(v["N"])
    a = group_name(v["AR"])
    parts = [pref(n, "3-" + n), pref(a, "4-" + a),
             pref("sulfamoyl", "5-sulfamoyl")]
    return join(parts, "benzoic acid")


R3S = ["", "(C)", "(CC)", "(CCC)", "(CC(C)C)", "(CC3CCCC3)", "(Cc3ccccc3)",
       "(C(Cl)Cl)", "(CSCC(F)(F)F)", "(CCl)", "(CCCC)", "(CC=C)",
       "(CC3CCCCC3)", "(CC3CCC3)", "(CSCC=C)", "(CSCc3ccccc3)", "(CSC)",
       "(COC)", "(C(F)(F)F)", "(c3ccccc3)"]

AMIDES = ["NN3C(C)CCCC3C", "NN3C(C)Cc4ccccc43", "NN3CCCCC3", "NN3CCCC3",
          "NN3C(C)CCCC3", "NN3CCc4ccccc43", "NN3CCCCCC3", "NN3CCOCC3",
          "NC3CCCCC3", "NC3CCCC3", "Nc3c(C)cccc3C", "Nc3ccc(C)cc3",
          "Nc3ccccc3", "NCCN3CCCCC3"]

LOOPN = ["NCCCC", "N3CCCC3", "NCCC", "NCC", "NCCCCC", "N3CCCCC3",
         "NCC3CCCC3", "NCc3ccccc3", "NCC=C", "NC(C)C"]

FAMILIES = [
    {
        "cls": "Diuretic",
        "template": "NS(=O)(=O)c1cc2c(cc1{X})NC{R3}N{N2}S2(=O)=O",
        "nulls": {"X": "Cl", "N2": "", "R3": ""},
        "slots": {"X": ["Cl", "C(F)(F)F", "Br", "F", "C", "OC"],
                  "N2": ["", "(C)", "(CC)"], "R3": R3S},
        "anchors": {
            "Hydrochlorothiazide": {"X": "Cl", "N2": "", "R3": ""},
            "Hydroflumethiazide": {"X": "C(F)(F)F", "N2": "", "R3": ""},
            "Ethiazide": {"X": "Cl", "N2": "", "R3": "(CC)"},
            "Buthiazide": {"X": "Cl", "N2": "", "R3": "(CC(C)C)"},
            "Cyclopenthiazide": {"X": "Cl", "N2": "", "R3": "(CC3CCCC3)"},
            "Trichlormethiazide": {"X": "Cl", "N2": "", "R3": "(C(Cl)Cl)"},
            "Bendroflumethiazide": {"X": "C(F)(F)F", "N2": "",
                                    "R3": "(Cc3ccccc3)"},
            "Epitizide": {"X": "Cl", "N2": "", "R3": "(CSCC(F)(F)F)"},
            "Altizide": {"X": "Cl", "N2": "", "R3": "(CSCC=C)"},
            "Methyclothiazide": {"X": "Cl", "N2": "(C)", "R3": "(CCl)"},
            "Polythiazide": {"X": "Cl", "N2": "(C)",
                             "R3": "(CSCC(F)(F)F)"},
        },
        "name": name_thiazide,
        "target": 8,
    },
    {
        "cls": "Diuretic",
        "template": "O=C1c2cc(S(N)(=O)=O)c(Cl)cc2NC{R2}N1{N3}",
        "nulls": {"R2": "(CC)", "N3": ""},
        "slots": {"R2": ["(CC)", "(C)", "(CCC)", "(CC(C)C)", "(C(C)C)",
                         "(CCCC)", "(Cc3ccccc3)"],
                  "N3": ["", "(c3ccccc3C)", "(C)", "(c3ccccc3)",
                         "(c3ccc(C)cc3)", "(c3ccccc3Cl)",
                         "(c3c(C)cccc3C)"]},
        "anchors": {
            "Quinethazone": {"R2": "(CC)", "N3": ""},
            "Metolazone": {"R2": "(C)", "N3": "(c3ccccc3C)"},
        },
        "name": name_quinazolinone,
        "target": 4,
    },
    {
        "cls": "Diuretic",
        "template": "O=C({N})c1ccc(Cl)c(S(N)(=O)=O)c1",
        "nulls": {"N": "NN3C(C)CCCC3C"},
        "slots": {"N": AMIDES},
        "anchors": {
            "Clopamide": {"N": "NN3C(C)CCCC3C"},
            "Indapamide": {"N": "NN3C(C)Cc4ccccc43"},
        },
        "name": name_benzamide,
        "target": 8,
    },
    {
        "cls": "Diuretic",
        "template": "OC(=O)c1cc(S(N)(=O)=O)c(O{AR})c({N})c1",
        "nulls": {"AR": "c3ccccc3", "N": "NCCCC"},
        "slots": {"AR": ["c3ccccc3", "c3ccc(F)cc3", "c3ccc(C)cc3",
                         "c3ccc(Cl)cc3", "c3ccc(OC)cc3"],
                  "N": LOOPN},
        "anchors": {
            "Bumetanide": {"AR": "c3ccccc3", "N": "NCCCC"},
            "Piretanide": {"AR": "c3ccccc3", "N": "N3CCCC3"},
        },
        "name": name_loop,
        "target": 4,
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
            built = flat(fam["template"].format(**vals))
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
