# Derives homologue references on three kinase-inhibitor templates: the
# 6,7-disubstituted 4-anilinoquinazolines (gefitinib family), the
# 4-(4-carbamoylaminophenoxy)-N-methylpyridine-2-carboxamides (sorafenib
# family) and the 4-(pyrazol-4-yl)-7H-pyrrolo[2,3-d]pyrimidines
# (ruxolitinib family).
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
    "CO": ("CH3O", "methoxy"),
    "COCCO": ("C3H7O2", "(2-methoxyethoxy)"),
    "OC": ("CH3O", "methoxy"),
    "OCCOC": ("C3H7O2", "(2-methoxyethoxy)"),
    "OCCC": ("C3H7O", "propoxy"),
    "OCCCN3CCOCC3": ("C7H14NO2", "(3-morpholin-4-ylpropoxy)"),
    "OCCN3CCOCC3": ("C6H12NO2", "(2-morpholin-4-ylethoxy)"),
    "OCC3CCN(C)CC3": ("C7H14NO", "[(1-methylpiperidin-4-yl)methoxy]"),
    "OCCCN3CCCC3": ("C7H14NO", "(3-pyrrolidin-1-ylpropoxy)"),
    "OCCCN3CCN(C)CC3": ("C8H17N2O", "[3-(4-methylpiperazin-1-yl)propoxy]"),
    "c3ccc(F)c(Cl)c3": ("C6H3ClF", "(3-chloro-4-fluorophenyl)"),
    "c3cccc(C#C)c3": ("C8H5", "(3-ethynylphenyl)"),
    "c3ccc(Br)cc3F": ("C6H3BrF", "(4-bromo-2-fluorophenyl)"),
    "c3ccc(Cl)cc3": ("C6H4Cl", "(4-chlorophenyl)"),
    "c3ccc(F)cc3": ("C6H4F", "(4-fluorophenyl)"),
    "c3cccc(Cl)c3": ("C6H4Cl", "(3-chlorophenyl)"),
    "c3ccc(Cl)c(Cl)c3": ("C6H3Cl2", "(3,4-dichlorophenyl)"),
    "c3cccc(C(F)(F)F)c3": ("C7H4F3", "[3-(trifluoromethyl)phenyl]"),
    "c3ccc(C)cc3": ("C7H7", "(4-methylphenyl)"),
    "c3ccc(Cl)c(C(F)(F)F)c3": ("C7H3ClF3", None),
    "c3ccc(C(F)(F)F)cc3": ("C7H4F3", None),
    "c3ccccc3": ("C6H5", None),
    "C3CC3": ("C3H5", None),
    "": ("H", None),
    "(F)": ("F", None),
    "(Cl)": ("Cl", None),
    "(C)": ("CH3", None),
    "N#CCC(C3CCCC3)": ("C8H12N", None),
    "N#CCC(C3CCC3)": ("C7H10N", None),
    "N#CCC(C3CCCCC3)": ("C9H14N", None),
    "N#CCC(C(C)C)": ("C6H10N", None),
    "N#CCC(CC)": ("C5H8N", None),
    "N#CCC(c3ccccc3)": ("C9H8N", None),
    "C3CCCC3": ("C5H9", None),
}

ARCARB = {
    "c3ccc(Cl)c(C(F)(F)F)c3":
        "[4-chloro-3-(trifluoromethyl)phenyl]carbamoylamino",
    "c3ccc(Cl)cc3": "(4-chlorophenyl)carbamoylamino",
    "c3ccc(C(F)(F)F)cc3": "[4-(trifluoromethyl)phenyl]carbamoylamino",
    "c3ccc(F)cc3": "(4-fluorophenyl)carbamoylamino",
    "c3ccccc3": "phenylcarbamoylamino",
    "C3CC3": "cyclopropylcarbamoylamino",
}

YSUB = {"": "", "(F)": "-3-fluoro", "(Cl)": "-3-chloro", "(C)": "-3-methyl"}

PYRROLO = "4-(7H-pyrrolo[2,3-d]pyrimidin-4-yl)pyrazol-1-yl"

JAK = {
    "N#CCC(C3CCCC3)": "3-cyclopentyl-3-[%s]propanenitrile" % PYRROLO,
    "N#CCC(C3CCC3)": "3-cyclobutyl-3-[%s]propanenitrile" % PYRROLO,
    "N#CCC(C3CCCCC3)": "3-cyclohexyl-3-[%s]propanenitrile" % PYRROLO,
    "N#CCC(C(C)C)": "4-methyl-3-[%s]pentanenitrile" % PYRROLO,
    "N#CCC(CC)": "3-[%s]pentanenitrile" % PYRROLO,
    "N#CCC(c3ccccc3)": "3-phenyl-3-[%s]propanenitrile" % PYRROLO,
    "C3CCCC3": "1-cyclopentyl-4-(7H-pyrrolo[2,3-d]pyrimidin-4-yl)pyrazole",
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

def name_quinazoline(v):
    an = group_name(v["AN"])
    r7 = group_name(v["R7"])
    r6 = group_name(v["R6"])
    parts = [pref(an, "N-" + an)]
    if r7 == r6:
        mult = "bis" if r7[0] in "([" else "di"
        parts.append(pref(r7, "6,7-" + mult + r7))
    else:
        parts.append(pref(r7, "7-" + r7))
        parts.append(pref(r6, "6-" + r6))
    return join(parts, "quinazolin-4-amine")


def name_diaryl_urea(v):
    return "4-[4-[%s]%sphenoxy]-N-methylpyridine-2-carboxamide" % (
        ARCARB[v["AR"]], YSUB[v["Y"]])


def name_jak(v):
    return JAK[v["R"]]


FAMILIES = [
    {
        "cls": "Kinase inhibitor",
        "template": "{R7}c1cc2ncnc(N{AN})c2cc1{R6}",
        "nulls": {"R7": "CO", "AN": "c3ccc(F)c(Cl)c3",
                  "R6": "OCCCN3CCOCC3"},
        "slots": {
            "R7": ["CO", "COCCO"],
            "AN": ["c3ccc(F)c(Cl)c3", "c3cccc(C#C)c3", "c3ccc(Br)cc3F",
                   "c3ccc(Cl)cc3", "c3cccc(Cl)c3", "c3ccc(F)cc3",
                   "c3ccc(Cl)c(Cl)c3", "c3cccc(C(F)(F)F)c3",
                   "c3ccc(C)cc3"],
            "R6": ["OCCCN3CCOCC3", "OCCOC", "OCC3CCN(C)CC3",
                   "OCCN3CCOCC3", "OCCCN3CCCC3", "OCCCN3CCN(C)CC3",
                   "OC", "OCCC"],
        },
        "name": name_quinazoline,
        "target": 5,
        "anchors": {
            "Gefitinib": {},
            "Erlotinib": {"R7": "COCCO", "AN": "c3cccc(C#C)c3",
                          "R6": "OCCOC"},
        },
    },
    {
        "cls": "Kinase inhibitor",
        "template": "CNC(=O)c1cc(Oc2ccc(NC(=O)N{AR})c{Y}c2)ccn1",
        "nulls": {"AR": "c3ccc(Cl)c(C(F)(F)F)c3", "Y": ""},
        "slots": {
            "AR": ["c3ccc(Cl)c(C(F)(F)F)c3", "c3ccc(Cl)cc3",
                   "c3ccc(C(F)(F)F)cc3", "c3ccc(F)cc3", "c3ccccc3",
                   "C3CC3"],
            "Y": ["", "(F)", "(Cl)", "(C)"],
        },
        "name": name_diaryl_urea,
        "target": 4,
        "anchors": {
            "Sorafenib": {},
            "Regorafenib": {"Y": "(F)"},
        },
    },
    {
        "cls": "Kinase inhibitor",
        "template": "{R}n1cc(cn1)c1ncnc2[nH]ccc12",
        "nulls": {"R": "N#CCC(C3CCCC3)"},
        "slots": {
            "R": ["N#CCC(C3CCCC3)", "N#CCC(C3CCC3)", "N#CCC(C3CCCCC3)",
                  "N#CCC(C(C)C)", "N#CCC(CC)", "N#CCC(c3ccccc3)",
                  "C3CCCC3"],
        },
        "name": name_jak,
        "target": 4,
        "anchors": {
            "Ruxolitinib": {},
            "Baricitinib": {"R": "CCS(=O)(=O)N3CC(CC#N)(C3)"},
            "Upadacitinib": {"R": "CCC3CN(C(=O)NCC(F)(F)F)CC3"},
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
