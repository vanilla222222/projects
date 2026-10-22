# Derives homologue references on four antimetabolite templates: the
# 5-substituted uracil of fluorouracil, its 2'-deoxyribonucleoside as in
# floxuridine and trifluridine, the 2-substituted adenine riboside
# of fludarabine, and the N10-substituted aminopterin/methotrexate antifolate.
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
    "F": ("F", "fluoro"),
    "Cl": ("Cl", "chloro"),
    "Br": ("Br", "bromo"),
    "I": ("I", "iodo"),
    "C": ("CH3", "methyl"),
    "CC": ("C2H5", "ethyl"),
    "CCC": ("C3H7", "propyl"),
    "C=CC": ("C3H5", "prop-2-enyl"),
    "C#CC": ("C3H3", "prop-2-ynyl"),
    "c3ccccc3C": ("C7H7", "benzyl"),
    "FC(F)(F)": ("CF3", "trifluoromethyl"),
    "N": ("H2N", "amino"),
    "O": ("HO", "hydroxy"),
    "S": ("HS", "sulfanyl"),
    "CN": ("CH4N", "methylamino"),
    "CCN": ("C2H6N", "ethylamino"),
    "CO": ("CH3O", "methoxy"),
    "N#C": ("CN", "cyano"),
    "C=C": ("C2H3", "ethenyl"),
    "(F)": ("F", "fluoro"),
    "(Cl)": ("Cl", "chloro"),
    "(Br)": ("Br", "bromo"),
    "(I)": ("I", "iodo"),
    "(C)": ("CH3", "methyl"),
    "(CC)": ("C2H5", "ethyl"),
    "(N)": ("H2N", "amino"),
    "(O)": ("HO", "hydroxy"),
    "(C(F)(F)F)": ("CF3", "trifluoromethyl"),
    "(C#N)": ("CN", "cyano"),
    "(C=C)": ("C2H3", "ethenyl"),
    "(C#C)": ("C2H", "ethynyl"),
    "(OC)": ("CH3O", "methoxy"),
    "(SC)": ("CH3S", "methylsulfanyl"),
    "(CO)": ("CH3O", "hydroxymethyl"),
    "(CF)": ("CH2F", "fluoromethyl"),
    "(CCC)": ("C3H7", "propyl"),
    "(C(C)C)": ("C3H7", "propan-2-yl"),
    "(C#CC)": ("C3H3", "prop-2-ynyl"),
    "CCCC": ("C4H9", "butyl"),
    "CC(C)C": ("C4H9", "2-methylpropyl"),
}

DEOXYRIBOSE = "[4-hydroxy-5-(hydroxymethyl)oxolan-2-yl]"

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


def name_uracil(v):
    items = []
    if v["X5"]:
        items.append(("5", group_name(v["X5"])))
    return join(collapse(items), "1H-pyrimidine-2,4-dione")


def name_deoxynucleoside(v):
    items = [("1", DEOXYRIBOSE)]
    if v["X5"]:
        items.append(("5", group_name(v["X5"])))
    return join(collapse(items), "pyrimidine-2,4-dione")


def name_purine_riboside(v):
    core = [("6", "amino")]
    if v["X2"]:
        core.append(("2", group_name(v["X2"])))
    purinyl = "(" + join(collapse(core), "purin-9-yl") + ")"
    items = [("2", purinyl), ("5", "(hydroxymethyl)")]
    return join(collapse(items), "oxolane-3,4-diol")


def name_antifolate(v):
    bridge = "(2,4-diaminopteridin-6-yl)methyl"
    if v["N10"]:
        bridge = bridge + "-" + group_name(v["N10"])
    return "2-[[4-[%samino]benzoyl]amino]pentanedioic acid" % bridge


FAMILIES = [
    {
        "cls": "Antimetabolite",
        "template": "{X5}c1c[nH]c(=O)[nH]c1=O",
        "nulls": {"X5": "F"},
        "slots": {
            "X5": ["F", "", "C", "Cl", "Br", "I", "CC", "FC(F)(F)",
                   "N", "O", "S", "N#C", "C=C"],
        },
        "name": name_uracil,
        "target": 8,
        "anchors": {
            "Fluorouracil": {},
            "Uracil": {"X5": ""},
            "Thymine": {"X5": "C"},
        },
    },
    {
        "cls": "Antimetabolite",
        "template": "OCC1OC(n2cc{X5}c(=O)[nH]c2=O)CC1O",
        "nulls": {"X5": "(F)"},
        "slots": {
            "X5": ["(F)", "(C(F)(F)F)", "(I)", "(C)", "(Cl)", "(Br)",
                   "(CC)", "(C#C)", "(C=C)", "(C#N)", "(N)", "(O)",
                   "(OC)", "(SC)", "(CO)", "(CF)", "(CCC)",
                   "(C(C)C)", "(C#CC)"],
        },
        "name": name_deoxynucleoside,
        "target": 9,
        "anchors": {
            "Floxuridine": {},
            "Trifluridine": {"X5": "(C(F)(F)F)"},
            "Idoxuridine": {"X5": "(I)"},
            "Thymidine": {"X5": "(C)"},
        },
    },
    {
        "cls": "Antimetabolite",
        "template": "Nc1nc{X2}nc2c1ncn2C1OC(CO)C(O)C1O",
        "nulls": {"X2": "(F)"},
        "slots": {
            "X2": ["(F)", "", "(Cl)", "(Br)", "(C)", "(N)", "(OC)",
                   "(C#N)", "(CC)"],
        },
        "name": name_purine_riboside,
        "target": 6,
        "anchors": {
            "Fludarabine": {},
            "Adenosine": {"X2": ""},
        },
    },
    {
        "cls": "Antimetabolite",
        "template": ("{N10}N(Cc1cnc2nc(N)nc(N)c2n1)c1ccc(cc1)"
                     "C(=O)NC(CCC(=O)O)C(=O)O"),
        "nulls": {"N10": "C"},
        "slots": {
            "N10": ["C", "", "CC", "CCC", "C=CC", "C#CC", "c3ccccc3C",
                    "CCCC", "CC(C)C"],
        },
        "name": name_antifolate,
        "target": 6,
        "anchors": {
            "Methotrexate": {},
            "Aminopterin": {"N10": ""},
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
