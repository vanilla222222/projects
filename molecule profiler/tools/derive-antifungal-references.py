# Derives homologue references on four antifungal templates: the
# 1-(2-aryl-2-aralkyloxyethyl)azoles (miconazole family), the
# 1-azolyl-2-aryl-alkan-2-ols (fluconazole family), the
# 1-aryloxy-3,3-dimethyl-1-azolylbutan-2-ones and -2-ols (triadimefon
# family) and the N-methyl-1-(naphthalen-1-yl)methanamines (allylamines).
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
    "n1ccnc1": ("C3H3N2", "(imidazol-1-yl)"),
    "n1cncn1": ("C2H2N3", "(1,2,4-triazol-1-yl)"),
    "c3ccc(Cl)cc3Cl": ("C6H3Cl2", "(2,4-dichlorophenyl)"),
    "c3ccc(F)cc3F": ("C6H3F2", "(2,4-difluorophenyl)"),
    "c3c(Cl)cccc3Cl": ("C6H3Cl2", "(2,6-dichlorophenyl)"),
    "c3cc(Cl)cc(Cl)c3": ("C6H3Cl2", "(3,5-dichlorophenyl)"),
    "c3ccc(Cl)cc3": ("C6H4Cl", "(4-chlorophenyl)"),
    "c3ccc(F)cc3": ("C6H4F", "(4-fluorophenyl)"),
    "c3ccc(Br)cc3": ("C6H4Br", "(4-bromophenyl)"),
    "c3ccc(C)cc3": ("C7H7", "(4-methylphenyl)"),
    "c3ccccc3": ("C6H5", "phenyl"),
    "c3ccc(OC)cc3": ("C7H7O", "(4-methoxyphenyl)"),
    "C=C": ("C2H3", None),
    "CC": ("C2H5", "ethyl"),
    "CCC": ("C3H7", "propyl"),
    "CCCC": ("C4H9", "butyl"),
    "CCCCC": ("C5H11", "pentyl"),
    "CCCCCC": ("C6H13", "hexyl"),
    "CC(C)C": ("C4H9", "(2-methylpropyl)"),
    "C(=O)": ("CO", None),
    "C(O)": ("CH2O", None),
    "CC=CC#CC(C)(C)C": ("C9H13", None),
    "CC=Cc3ccccc3": ("C9H9", None),
    "CC=Cc3ccc(Cl)cc3": ("C9H8Cl", None),
    "CC=Cc3ccc(F)cc3": ("C9H8F", None),
    "CC=CC(C)(C)C": ("C7H13", None),
    "Cc3ccccc3": ("C7H7", None),
    "Cc3ccc(Cl)cc3": ("C7H6Cl", None),
}

AZOLE = {"n1ccnc1": "imidazole", "n1cncn1": "1,2,4-triazole"}

OXY = {
    "c3ccc(Cl)cc3Cl": "[(2,4-dichlorophenyl)methoxy]",
    "c3c(Cl)cccc3Cl": "[(2,6-dichlorophenyl)methoxy]",
    "c3ccc(Cl)cc3": "[(4-chlorophenyl)methoxy]",
    "c3ccc(F)cc3": "[(4-fluorophenyl)methoxy]",
    "c3ccc(Br)cc3": "[(4-bromophenyl)methoxy]",
    "c3ccc(C)cc3": "[(4-methylphenyl)methoxy]",
    "c3ccccc3": "(phenylmethoxy)",
    "C=C": "prop-2-enoxy",
}

ALKANOL = {"CC": "butan-2-ol", "CCC": "pentan-2-ol", "CCCC": "hexan-2-ol",
           "CCCCC": "heptan-2-ol", "CCCCCC": "octan-2-ol",
           "CC(C)C": "4-methylpentan-2-ol"}

OXO = {"C(=O)": "butan-2-one", "C(O)": "butan-2-ol"}

RNAME = {
    "CC=CC#CC(C)(C)C": ("dimethylheptenynyl", "(6,6-dimethylhept-2-en-4-ynyl)"),
    "CC=Cc3ccccc3": ("phenylprop", "(3-phenylprop-2-enyl)"),
    "CC=Cc3ccc(Cl)cc3": ("chlorophenylprop", "[3-(4-chlorophenyl)prop-2-enyl]"),
    "CC=Cc3ccc(F)cc3": ("fluorophenylprop", "[3-(4-fluorophenyl)prop-2-enyl]"),
    "CC=CC(C)(C)C": ("dimethylpent", "(4,4-dimethylpent-2-enyl)"),
    "Cc3ccccc3": ("phenylmethyl", "(phenylmethyl)"),
    "Cc3ccc(Cl)cc3": ("chlorophenylmethyl", "[(4-chlorophenyl)methyl]"),
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

AROXY = {
    "c3ccc(Cl)cc3": "(4-chlorophenoxy)",
    "c3ccc(F)cc3": "(4-fluorophenoxy)",
    "c3ccccc3": "phenoxy",
    "c3ccc(C)cc3": "(4-methylphenoxy)",
    "c3ccc(OC)cc3": "(4-methoxyphenoxy)",
    "c3ccc(Br)cc3": "(4-bromophenoxy)",
    "c3cc(Cl)cc(Cl)c3": "(3,5-dichlorophenoxy)",
}


def name_azole_ether(v):
    ar = group_name(v["AR"])
    ox = OXY[v["BZ"]]
    parts = sorted([pref(ar, "2-" + ar), pref(ox, "2-" + ox)])
    inner = "-".join(text for _, text in parts) + "ethyl"
    stem = AZOLE[v["AZ"]]
    return "1-[%s]%s%s" % (inner, "-" if stem[0].isdigit() else "", stem)


def name_azolyl_alkanol(v):
    ar = group_name(v["AR"])
    az = group_name(v["AZ"])
    parts = [pref(ar, "2-" + ar), pref(az, "1-" + az)]
    return join(parts, ALKANOL[v["R"]])


def name_aryloxy_butanone(v):
    ao = AROXY[v["AR"]]
    az = group_name(v["AZ"])
    parts = [pref(ao, "1-" + ao), pref("methyl", "3,3-dimethyl"),
             pref(az, "1-" + az)]
    return join(parts, OXO[v["KC"]])


def name_naphthylmethanamine(v):
    key, text = RNAME[v["R"]]
    parts = [pref("methyl", "N-methyl"),
             pref("naphthalenyl", "1-naphthalen-1-yl"),
             pref(key, "N-" + text)]
    return join(parts, "methanamine")


AZS = ["n1ccnc1", "n1cncn1"]
TZS = ["n1cncn1", "n1ccnc1"]

FAMILIES = [
    {
        "cls": "Antifungal",
        "template": "C(C{AZ})({AR})OC{BZ}",
        "nulls": {"AZ": "n1ccnc1", "AR": "c3ccc(Cl)cc3Cl",
                  "BZ": "c3ccc(Cl)cc3Cl"},
        "slots": {
            "AZ": AZS,
            "AR": ["c3ccc(Cl)cc3Cl", "c3ccc(F)cc3F", "c3ccc(Cl)cc3",
                   "c3ccccc3"],
            "BZ": ["c3ccc(Cl)cc3Cl", "c3c(Cl)cccc3Cl", "c3ccc(Cl)cc3",
                   "C=C", "c3ccccc3", "c3ccc(F)cc3", "c3ccc(C)cc3",
                   "c3ccc(Br)cc3"],
        },
        "name": name_azole_ether,
        "target": 4,
        "anchors": {
            "Miconazole": {},
            "Isoconazole": {"BZ": "c3c(Cl)cccc3Cl"},
            "Enilconazole": {"BZ": "C=C"},
        },
    },
    {
        "cls": "Antifungal",
        "template": "OC(C{AZ})({AR}){R}",
        "nulls": {"AZ": "n1cncn1", "AR": "c3ccc(Cl)cc3Cl", "R": "CCCC"},
        "slots": {
            "AZ": TZS,
            "AR": ["c3ccc(Cl)cc3Cl", "c3ccc(F)cc3F", "c3ccc(Cl)cc3",
                   "c3ccc(F)cc3", "c3ccccc3", "c3ccc(Br)cc3",
                   "c3cc(Cl)cc(Cl)c3"],
            "R": ["CCCC", "CCC", "CC", "CCCCC", "CC(C)C", "CCCCCC"],
        },
        "name": name_azolyl_alkanol,
        "target": 4,
        "anchors": {
            "Hexaconazole": {},
            "Fluconazole": {"AR": "c3ccc(F)cc3F", "R": "Cn3cncn3"},
            "Voriconazole": {"AR": "c3ccc(F)cc3F", "R": "C(C)c3ncncc3F"},
        },
    },
    {
        "cls": "Antifungal",
        "template": "CC(C)(C){KC}C(O{AR}){AZ}",
        "nulls": {"KC": "C(=O)", "AR": "c3ccc(Cl)cc3", "AZ": "n1cncn1"},
        "slots": {
            "KC": ["C(=O)", "C(O)"],
            "AR": ["c3ccc(Cl)cc3", "c3ccc(F)cc3", "c3ccccc3",
                   "c3ccc(C)cc3", "c3ccc(OC)cc3", "c3ccc(Br)cc3",
                   "c3cc(Cl)cc(Cl)c3"],
            "AZ": TZS,
        },
        "name": name_aryloxy_butanone,
        "target": 4,
        "anchors": {
            "Triadimefon": {},
            "Triadimenol": {"KC": "C(O)"},
            "Climbazole": {"AZ": "n1ccnc1"},
        },
    },
    {
        "cls": "Antifungal",
        "template": "CN(Cc1cccc2ccccc12){R}",
        "nulls": {"R": "CC=CC#CC(C)(C)C"},
        "slots": {
            "R": ["CC=CC#CC(C)(C)C", "CC=Cc3ccccc3", "CC=Cc3ccc(Cl)cc3",
                  "CC=Cc3ccc(F)cc3", "CC=CC(C)(C)C", "Cc3ccccc3",
                  "Cc3ccc(Cl)cc3"],
        },
        "name": name_naphthylmethanamine,
        "target": 3,
        "anchors": {
            "Terbinafine": {},
            "Naftifine": {"R": "CC=Cc3ccccc3"},
            "Butenafine": {"R": "Cc3ccc(C(C)(C)C)cc3"},
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
