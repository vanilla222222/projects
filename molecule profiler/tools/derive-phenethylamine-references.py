# Derives homologue references on three phenethylamine templates: the
# 2,5-dialkoxy-4-substituted phenethylamines, the
# 1-(2,5-dimethoxy-4-substituted phenyl)butan-2-amines (4C series) and the
# beta-alkoxy phenethylamines (BOB/BOD series).
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree. Templates
# reserve ring digit 1, so interpolated rings would use 2 upwards.

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
    "O": ("HO", "hydroxy"),
    "OC": ("CH3O", "methoxy"),
    "OCC": ("C2H5O", "ethoxy"),
    "OCCC": ("C3H7O", "propoxy"),
    "OC(C)C": ("C3H7O", "propan-2-yloxy"),
    "OC(F)F": ("CHF2O", "(difluoromethoxy)"),
    "SC": ("CH3S", "methylsulfanyl"),
    "SCC": ("C2H5S", "ethylsulfanyl"),
    "SCCC": ("C3H7S", "propylsulfanyl"),
    "SC(C)C": ("C3H7S", "propan-2-ylsulfanyl"),
    "C": ("CH3", "methyl"),
    "CC": ("C2H5", "ethyl"),
    "CCC": ("C3H7", "propyl"),
    "C(C)C": ("C3H7", "propan-2-yl"),
    "C(F)(F)F": ("CF3", "(trifluoromethyl)"),
    "Br": ("Br", "bromo"),
    "I": ("I", "iodo"),
    "Cl": ("Cl", "chloro"),
    "F": ("F", "fluoro"),
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

def ring_name(items):
    return join(collapse(items), "phenyl")


def name_dialkoxy(v):
    items = [("2", group_name(v["O2"])), ("4", group_name(v["R4"])),
             ("5", group_name(v["O5"]))]
    return "2-(%s)ethanamine" % ring_name(items)


def name_butanamine(v):
    items = [("2", "methoxy"), ("4", group_name(v["R4"])), ("5", "methoxy")]
    return "1-(%s)butan-2-amine" % ring_name(items)


def name_beta_alkoxy(v):
    items = [("2", "methoxy"), ("4", group_name(v["R4"])), ("5", "methoxy")]
    ring = ring_name(items)
    b = group_name(v["B"])
    return join([pref(ring, "2-(" + ring + ")"), pref(b, "2-" + b)],
                "ethanamine")


FAMILIES = [
    {
        "cls": "Phenethylamine",
        "template": "NCCc1c({O2})cc({R4})c({O5})c1",
        "nulls": {"O2": "OC", "R4": "Br", "O5": "OC"},
        "slots": {
            "O2": ["OC", "OCC", "OCCC", "OC(C)C"],
            "R4": ["Br", "C", "CC", "I", "SC", "SCC", "CCC", "SCCC",
                   "C(F)(F)F", "Cl", "F", "C(C)C"],
            "O5": ["OC", "OCC", "OCCC", "OC(C)C"],
        },
        "name": name_dialkoxy,
        "target": 10,
        "anchors": {
            "2CB-2-EtO": {"O2": "OCC"},
            "2CD-2-EtO": {"O2": "OCC", "R4": "C"},
            "2CD-5-EtO": {"R4": "C", "O5": "OCC"},
            "2CE-5-EtO": {"R4": "CC", "O5": "OCC"},
            "2CE-5iPrO": {"R4": "CC", "O5": "OC(C)C"},
            "2CT-5-EtO": {"R4": "SC", "O5": "OCC"},
            "ASR-2001": {"O5": "OCCC"},
        },
    },
    {
        "cls": "Phenethylamine",
        "template": "CCC(N)Cc1c(OC)cc({R4})c(OC)c1",
        "nulls": {"R4": "Br"},
        "slots": {
            "R4": ["Br", "C", "I", "CCC", "SCC", "C(F)(F)F", "CC", "SC",
                   "Cl", "F", "SCCC", "C(C)C", "SC(C)C", "OC", "OCC",
                   "OC(F)F"],
        },
        "name": name_butanamine,
        "target": 7,
        "anchors": {
            "4C-B": {},
            "4C-D": {"R4": "C"},
            "4C-I": {"R4": "I"},
            "4C-P": {"R4": "CCC"},
            "4C-T-2": {"R4": "SCC"},
            "4C-TFM": {"R4": "C(F)(F)F"},
        },
    },
    {
        "cls": "Phenethylamine",
        "template": "NCC({B})c1c(OC)cc({R4})c(OC)c1",
        "nulls": {"B": "OC", "R4": "Br"},
        "slots": {
            "B": ["OC", "O", "OCC", "OCCC", "OC(C)C"],
            "R4": ["Br", "C", "I", "CC", "SC", "CCC", "SCC", "Cl", "F",
                   "C(F)(F)F"],
        },
        "name": name_beta_alkoxy,
        "target": 9,
        "anchors": {
            "BOB": {},
            "BOD": {"R4": "C"},
            "BOHB": {"B": "O"},
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
