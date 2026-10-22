# Derives homologue references on three antiviral templates: the
# 5-substituted 2'-deoxyuridines (idoxuridine family), the
# adamantan-1-yl amines (amantadine family) and the acyclic
# 9-substituted guanines (acyclovir family).
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree. The
# adamantane template needs ring digits 1 to 3, so interpolated rings
# would use 4 upwards; the other two templates reserve digits 1 and 2.

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
    "I": ("I", "iodo"),
    "Br": ("Br", "bromo"),
    "Cl": ("Cl", "chloro"),
    "F": ("F", "fluoro"),
    "C": ("CH3", "methyl"),
    "CC": ("C2H5", "ethyl"),
    "C#C": ("C2H", "ethynyl"),
    "C=C": ("C2H3", "ethenyl"),
    "C#N": ("CN", "cyano"),
    "C(F)(F)F": ("CF3", "(trifluoromethyl)"),
    "C=CBr": ("C2H2Br", "(2-bromoethenyl)"),
    "C=CCl": ("C2H2Cl", "(2-chloroethenyl)"),
    "N": ("NH2", None),
    "NC": ("CH4N", None),
    "NCC": ("C2H6N", None),
    "CN": ("CH4N", None),
    "CCN": ("C2H6N", None),
    "CC(N)": ("C2H6N", None),
    "CCC(N)": ("C3H8N", None),
    "CC(C)(N)": ("C3H8N", None),
    "CCO": ("C2H5O", None),
    "CCCO": ("C3H7O", None),
    "CCCCO": ("C4H9O", None),
    "CC(O)CO": ("C3H7O2", None),
    "CCC(CO)CO": ("C5H11O2", None),
    "COCCO": ("C3H7O2", None),
    "COC(CO)CO": ("C4H9O3", None),
    "CCOCCO": ("C4H9O2", None),
}

ADAMANTANE = {
    "N": "adamantan-1-amine",
    "NC": "1-adamantylmethanamine",
    "NCC": "2-(1-adamantyl)ethanamine",
    "CC(N)": "1-(1-adamantyl)ethanamine",
    "CCC(N)": "1-(1-adamantyl)propan-1-amine",
    "CC(C)(N)": "2-(1-adamantyl)propan-2-amine",
    "CN": "N-methyladamantan-1-amine",
    "CCN": "N-ethyladamantan-1-amine",
}

PURINE = {
    "COCCO": ("hydroxyethoxymethyl", "(2-hydroxyethoxymethyl)"),
    "COC(CO)CO": ("dihydroxypropanyloxymethyl",
                  "(1,3-dihydroxypropan-2-yloxymethyl)"),
    "CCC(CO)CO": ("hydroxyhydroxymethylbutyl",
                  "[4-hydroxy-3-(hydroxymethyl)butyl]"),
    "CCO": ("hydroxyethyl", "(2-hydroxyethyl)"),
    "CCCO": ("hydroxypropyl", "(3-hydroxypropyl)"),
    "CCCCO": ("hydroxybutyl", "(4-hydroxybutyl)"),
    "CC(O)CO": ("dihydroxypropyl", "(2,3-dihydroxypropyl)"),
    "CCOCCO": ("hydroxyethoxyethyl", "[2-(2-hydroxyethoxy)ethyl]"),
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

DEOXYRIBOSE = "1-[4-hydroxy-5-(hydroxymethyl)oxolan-2-yl]"


def name_deoxyuridine(v):
    x = group_name(v["X"])
    parts = [pref("hydroxyhydroxymethyloxolanyl", DEOXYRIBOSE),
             pref(x, "5-" + x)]
    return join(parts, "pyrimidine-2,4-dione")


def name_adamantanamine(v):
    return ADAMANTANE[v["R"]]


def name_guanine(v):
    key, text = PURINE[v["R"]]
    parts = [pref("amino", "2-amino"), pref(key, "9-" + text)]
    return join(parts, "1H-purin-6-one")


FAMILIES = [
    {
        "cls": "Antiviral",
        "template": "O=c1[nH]c(=O)n(C2CC(O)C(CO)O2)cc1{X}",
        "nulls": {"X": "I"},
        "slots": {
            "X": ["I", "C=CBr", "Br", "Cl", "F", "CC", "C#C", "C=C",
                  "C#N", "C(F)(F)F", "C=CCl"],
        },
        "name": name_deoxyuridine,
        "target": 4,
        "anchors": {
            "Idoxuridine": {},
            "Brivudine": {"X": "C=CBr"},
        },
    },
    {
        "cls": "Antiviral",
        "template": "{R}C12CC3CC(CC(C3)C1)C2",
        "nulls": {"R": "N"},
        "slots": {
            "R": ["N", "CC(N)", "NC", "NCC", "CC(C)(N)", "CCC(N)",
                  "CN", "CCN"],
        },
        "name": name_adamantanamine,
        "target": 4,
        "anchors": {
            "Amantadine": {},
            "Rimantadine": {"R": "CC(N)"},
        },
    },
    {
        "cls": "Antiviral",
        "template": "Nc1nc2c(ncn2{R})c(=O)[nH]1",
        "nulls": {"R": "COCCO"},
        "slots": {
            "R": ["COCCO", "COC(CO)CO", "CCC(CO)CO", "CCO", "CCCO",
                  "CCCCO", "CC(O)CO", "CCOCCO"],
        },
        "name": name_guanine,
        "target": 4,
        "anchors": {
            "Acyclovir": {},
            "Ganciclovir": {"R": "COC(CO)CO"},
            "Penciclovir": {"R": "CCC(CO)CO"},
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
