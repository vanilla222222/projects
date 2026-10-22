# Derives homologue references on three ACE inhibitor templates: the
# N-(1-carboxy-3-phenylpropyl)alanyl prolines (enalapril/lisinopril family),
# the same dipeptide on 1,2,3,4-tetrahydroisoquinoline-3-carboxylic acid
# (quinapril/moexipril family) and the 3-sulfanyl-2-methylpropanoyl prolines
# (captopril/zofenopril family).
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
    "O": ("HO", None),
    "CO": ("CH3O", None),
    "CCO": ("C2H5O", None),
    "CCCO": ("C3H7O", None),
    "CC(C)O": ("C3H7O", None),
    "CCCCO": ("C4H9O", None),
    "(OC)": ("CH3O", "methoxy"),
    "C": ("CH3", None),
    "CC": ("C2H5", None),
    "CCC": ("C3H7", None),
    "CCCC": ("C4H9", None),
    "CCCCN": ("C4H10N", None),
    "C(C)C": ("C3H7", None),
    "CC(C)C": ("C4H9", None),
    "CCSC": ("C3H7S", None),
    "CCc1ccccc1": ("C8H9", None),
    "CCc1ccc(F)cc1": ("C8H8F", None),
    "CCc1cccc(F)c1": ("C8H8F", None),
    "CCc1ccc(Cl)cc1": ("C8H8Cl", None),
    "CCc1ccc(OC)cc1": ("C9H11O", None),
    "CCc1ccc(C)cc1": ("C9H11", None),
    "CCC1CCCCC1": ("C8H15", None),
    "CS": ("CH3S", None),
    "CCS": ("C2H5S", None),
    "S": ("HS", None),
    "CSC(=O)c2ccccc2": ("C8H7OS", None),
    "CSC(C)=O": ("C3H5OS", None),
    "(Sc2ccccc2)": ("C6H5S", None),
    "(SC)": ("CH3S", None),
    "(Sc2ccc(C)cc2)": ("C7H7S", None),
}

ALKOXY = {
    "CCO": "ethoxy",
    "CO": "methoxy",
    "CCCO": "propoxy",
    "CC(C)O": "propan-2-yloxy",
    "CCCCO": "butoxy",
}

ESTER_CHAIN = {
    "CCc1ccccc1": "4-phenylbutan-2-yl",
    "CCc1ccc(F)cc1": "4-(4-fluorophenyl)butan-2-yl",
    "CCc1cccc(F)c1": "4-(3-fluorophenyl)butan-2-yl",
    "CCc1ccc(Cl)cc1": "4-(4-chlorophenyl)butan-2-yl",
    "CCc1ccc(OC)cc1": "4-(4-methoxyphenyl)butan-2-yl",
    "CCc1ccc(C)cc1": "4-(4-methylphenyl)butan-2-yl",
    "CCC1CCCCC1": "4-cyclohexylbutan-2-yl",
    "CCC": "pentan-2-yl",
    "CCCC": "hexan-2-yl",
}

ACID_CHAIN = {
    "CCc1ccccc1": "1-carboxy-3-phenylpropyl",
    "CCc1ccc(F)cc1": "1-carboxy-3-(4-fluorophenyl)propyl",
    "CCc1cccc(F)c1": "1-carboxy-3-(3-fluorophenyl)propyl",
    "CCc1ccc(Cl)cc1": "1-carboxy-3-(4-chlorophenyl)propyl",
    "CCc1ccc(OC)cc1": "1-carboxy-3-(4-methoxyphenyl)propyl",
    "CCc1ccc(C)cc1": "1-carboxy-3-(4-methylphenyl)propyl",
    "CCC1CCCCC1": "1-carboxy-3-cyclohexylpropyl",
    "CCC": "1-carboxybutyl",
    "CCCC": "1-carboxypentyl",
}

ACYL_STEM = {
    "C": "propanoyl",
    "CC": "butanoyl",
    "CCC": "pentanoyl",
    "CCCCN": "hexanoyl",
    "C(C)C": "butanoyl",
    "CC(C)C": "pentanoyl",
    "CO": "propanoyl",
    "CCSC": "butanoyl",
}

ACYL_EXTRA = {
    "C": [],
    "CC": [],
    "CCC": [],
    "CCCCN": [("6", "amino")],
    "C(C)C": [("3", "methyl")],
    "CC(C)C": [("4", "methyl")],
    "CO": [("3", "hydroxy")],
    "CCSC": [("4", "methylsulfanyl")],
}

THIOL_ACYL = {
    ("C", "CS"): "2-methyl-3-sulfanylpropanoyl",
    ("C", "CCS"): "2-methyl-4-sulfanylbutanoyl",
    ("C", "CSC(=O)c2ccccc2"): "3-benzoylsulfanyl-2-methylpropanoyl",
    ("C", "CSC(C)=O"): "3-acetylsulfanyl-2-methylpropanoyl",
    ("C", "S"): "2-sulfanylpropanoyl",
    ("", "CS"): "3-sulfanylpropanoyl",
    ("", "CCS"): "4-sulfanylbutanoyl",
    ("", "CSC(=O)c2ccccc2"): "3-benzoylsulfanylpropanoyl",
    ("", "CSC(C)=O"): "3-acetylsulfanylpropanoyl",
    ("", "S"): "2-sulfanylacetyl",
    ("CC", "CS"): "2-(sulfanylmethyl)butanoyl",
    ("CC", "CCS"): "2-ethyl-4-sulfanylbutanoyl",
    ("CC", "CSC(=O)c2ccccc2"): "2-(benzoylsulfanylmethyl)butanoyl",
    ("CC", "CSC(C)=O"): "2-(acetylsulfanylmethyl)butanoyl",
    ("CC", "S"): "2-sulfanylbutanoyl",
}

RING4 = {
    "": [],
    "(Sc2ccccc2)": [("4", "phenylsulfanyl")],
    "(SC)": [("4", "methylsulfanyl")],
    "(Sc2ccc(C)cc2)": [("4", "(4-methylphenyl)sulfanyl")],
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


def amino_substituent(v):
    if v["R1"] == "O":
        return ACID_CHAIN[v["SIDE"]]
    chain = ESTER_CHAIN[v["SIDE"]]
    gap = "-" if chain[0].isdigit() else ""
    return "1-%s-1-oxo%s%s" % (ALKOXY[v["R1"]], gap, chain)


def acyl_name(v):
    sub = amino_substituent(v)
    parts = [pref(sub, "2-[[%s]amino]" % sub)]
    for loc, nm in ACYL_EXTRA[v["ALA"]]:
        parts.append(pref(nm, loc + "-" + nm))
    return join(parts, ACYL_STEM[v["ALA"]])


def name_proline_dipeptide(v):
    return "1-[%s]pyrrolidine-2-carboxylic acid" % acyl_name(v)


def name_tetrahydroisoquinoline(v):
    acyl = acyl_name(v)
    items = []
    for loc, key in (("6", "X6"), ("7", "X7")):
        if v[key]:
            items.append((loc, group_name(v[key])))
    parts = [pref(acyl, "2-[%s]" % acyl)] + collapse(items)
    return join(parts, "1,2,3,4-tetrahydroisoquinoline-3-carboxylic acid")


def name_thiol_proline(v):
    acyl = THIOL_ACYL[(v["R2"], v["TH"])]
    parts = [pref(acyl, "1-[%s]" % acyl)]
    for loc, nm in RING4[v["R4"]]:
        parts.append(pref(nm, loc + "-" + nm))
    return join(parts, "pyrrolidine-2-carboxylic acid")


FAMILIES = [
    {
        "cls": "ACE inhibitor",
        "template": "{R1}C(=O)C({SIDE})NC({ALA})C(=O)N1CCCC1C(=O)O",
        "nulls": {"R1": "CCO", "SIDE": "CCc1ccccc1", "ALA": "C"},
        "slots": {
            "R1": ["CCO", "O", "CO", "CCCO", "CC(C)O", "CCCCO"],
            "SIDE": ["CCc1ccccc1", "CCc1ccc(F)cc1", "CCC", "CCCC",
                     "CCc1ccc(Cl)cc1", "CCc1ccc(OC)cc1", "CCC1CCCCC1",
                     "CCc1cccc(F)c1", "CCc1ccc(C)cc1"],
            "ALA": ["C", "CC", "CCC", "CCCCN", "C(C)C", "CC(C)C", "CO", "CCSC"],
        },
        "name": name_proline_dipeptide,
        "target": 12,
        "anchors": {
            "Enalapril": {},
            "Enalaprilat": {"R1": "O"},
            "Lisinopril": {"R1": "O", "ALA": "CCCCN"},
        },
    },
    {
        "cls": "ACE inhibitor",
        "template": "{R1}C(=O)C({SIDE})NC({ALA})C(=O)N1Cc2cc{X6}c{X7}cc2CC1C(=O)O",
        "nulls": {"R1": "CCO", "SIDE": "CCc1ccccc1", "ALA": "C", "X6": "",
                  "X7": ""},
        "slots": {
            "R1": ["CCO", "O", "CO", "CCCO"],
            "SIDE": ["CCc1ccccc1", "CCc1ccc(F)cc1", "CCC",
                     "CCc1ccc(Cl)cc1", "CCC1CCCCC1"],
            "ALA": ["C", "CC", "CCC", "CCCCN"],
            "X6": ["", "(OC)"],
            "X7": ["", "(OC)"],
        },
        "name": name_tetrahydroisoquinoline,
        "target": 8,
        "anchors": {
            "Quinapril": {},
            "Quinaprilat": {"R1": "O"},
            "Moexipril": {"X6": "(OC)", "X7": "(OC)"},
            "Moexiprilat": {"R1": "O", "X6": "(OC)", "X7": "(OC)"},
        },
    },
    {
        "cls": "ACE inhibitor",
        "template": "{R2}C({TH})C(=O)N1CC{R4}CC1C(=O)O",
        "nulls": {"R2": "C", "TH": "CS", "R4": ""},
        "slots": {
            "R2": ["C", "", "CC"],
            "TH": ["CS", "CCS", "CSC(=O)c2ccccc2", "CSC(C)=O", "S"],
            "R4": ["", "(Sc2ccccc2)", "(SC)", "(Sc2ccc(C)cc2)"],
        },
        "name": name_thiol_proline,
        "target": 6,
        "anchors": {
            "Captopril": {},
            "Zofenoprilat": {"R4": "(Sc2ccccc2)"},
            "Zofenopril": {"TH": "CSC(=O)c2ccccc2", "R4": "(Sc2ccccc2)"},
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
