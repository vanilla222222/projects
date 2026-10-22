# Derives homologue references on three anticonvulsant templates: the
# 5,5-disubstituted imidazolidine-2,4-diones (hydantoins), the 5-aryl
# barbituric acids and the dibenzo[b,f]azepine-5-carboxamides.
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
    "C": ("CH3", "methyl"),
    "CC": ("C2H5", "ethyl"),
    "CCC": ("C3H7", "propyl"),
    "CC(C)": ("C3H7", "propan-2-yl"),
    "CCCC": ("C4H9", "butyl"),
    "C=CC": ("C3H5", "prop-2-en-1-yl"),
    "c3ccccc3": ("C6H5", "phenyl"),
    "c3cc(C)ccc3": ("C7H7", "(4-methylphenyl)"),
    "(C)": ("CH3", "methyl"),
    "(CC)": ("C2H5", "ethyl"),
    "(CCC)": ("C3H7", "propyl"),
    "(C(C)C)": ("C3H7", "propan-2-yl"),
    "(c3ccccc3)": ("C6H5", "phenyl"),
    "(c3ccc(F)cc3)": ("C6H4F", "(4-fluorophenyl)"),
    "(c3ccc(Cl)cc3)": ("C6H4Cl", "(4-chlorophenyl)"),
    "(c3ccc(C)cc3)": ("C7H7", "(4-methylphenyl)"),
    "(c3ccc(OC)cc3)": ("C7H7O", "(4-methoxyphenyl)"),
    "C=C": ("C2H2", None),
    "CC(F)": ("C2H3F", None),
    "CC(=O)": ("C2H2O", None),
    "CC(O)": ("C2H4O", None),
    "CC(OC)": ("C3H6O", None),
    "CC(N)": ("C2H5N", None),
    "CC(OC(C)=O)": ("C4H6O2", None),
    "C3OC3": ("C2H2O", None),
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
DIHYDRO = "10,11-dihydro-5H-dibenzo[b,f]azepine-5-carboxamide"

BRIDGE = {
    "C=C": ("", "5H-dibenzo[b,f]azepine-5-carboxamide"),
    "CC(F)": ("10-fluoro", DIHYDRO),
    "CC(=O)": ("10-oxo", DIHYDRO),
    "CC(O)": ("10-hydroxy", DIHYDRO),
    "CC(OC)": ("10-methoxy", DIHYDRO),
    "CC(N)": ("10-amino", DIHYDRO),
    "CC(OC(C)=O)": ("10-acetyloxy", DIHYDRO),
    "C3OC3": ("", "10,11-epoxy-10,11-dihydro-5H-dibenzo[b,f]"
                  "azepine-5-carboxamide"),
}


def ring_items(v, locants):
    items = []
    for loc, slot in locants:
        if v[slot]:
            items.append((loc, group_name(v[slot])))
    return items


def name_hydantoin(v):
    items = ring_items(v, (("3", "N3"), ("5", "R5a"), ("5", "R5b")))
    return join(collapse(items), "imidazolidine-2,4-dione")


def name_barbiturate(v):
    items = ring_items(v, (("1", "N1"), ("5", "R5a"), ("5", "R5b")))
    return join(collapse(items), "barbituric acid")


def name_dibenzazepine(v):
    extra, stem = BRIDGE[v["B"]]
    parts = []
    if extra:
        parts.append(pref(extra, extra))
    if v["R"]:
        nm = group_name(v["R"])
        parts.append(pref(nm, "N-" + nm))
    return join(parts, stem)


FAMILIES = [
    {
        "cls": "Anticonvulsant",
        "template": "{R5a}C1{R5b}NC(=O)N{N3}C1=O",
        "nulls": {"R5a": "c3ccccc3", "R5b": "(c3ccccc3)", "N3": ""},
        "anchors": {
            "Phenytoin": {},
            "Nirvanol": {"R5a": "CC"},
            "Mephenytoin": {"R5a": "CC", "N3": "(C)"},
            "Ethotoin": {"R5b": "", "N3": "(CC)"},
        },
        "slots": {
            "R5a": ["c3ccccc3", "CC", "CCC", "CC(C)", "C", "c3cc(C)ccc3"],
            "R5b": ["(c3ccccc3)", "", "(C)", "(CC)", "(CCC)",
                    "(c3ccc(F)cc3)"],
            "N3": ["", "(C)", "(CC)"],
        },
        "target": 10,
        "name": name_hydantoin,
    },
    {
        "cls": "Anticonvulsant",
        "template": "{R5a}C1{R5b}C(=O)NC(=O)N{N1}C1=O",
        "nulls": {"R5a": "CC", "R5b": "(c3ccccc3)", "N1": ""},
        "anchors": {
            "Phenobarbital": {},
            "Mephobarbital": {"N1": "(C)"},
            "Barbital": {"R5b": "(CC)"},
            "Metharbital": {"R5b": "(CC)", "N1": "(C)"},
        },
        "slots": {
            "R5a": ["CC", "C", "CCC", "CC(C)", "C=CC", "CCCC"],
            "R5b": ["(c3ccccc3)", "(c3ccc(F)cc3)", "(c3ccc(Cl)cc3)",
                    "(c3ccc(C)cc3)", "(c3ccc(OC)cc3)"],
            "N1": ["", "(C)"],
        },
        "target": 8,
        "name": name_barbiturate,
    },
    {
        "cls": "Anticonvulsant",
        "template": "{R}NC(=O)N1c2ccccc2{B}c2ccccc21",
        "nulls": {"R": "", "B": "C=C"},
        "anchors": {
            "Carbamazepine": {},
            "Oxcarbazepine": {"B": "CC(=O)"},
            "Eslicarbazepine": {"B": "CC(O)"},
            "Carbamazepine-10,11-epoxide": {"B": "C3OC3"},
            "Eslicarbazepine acetate": {"B": "CC(OC(C)=O)"},
        },
        "slots": {
            "R": ["", "C", "CC", "CCC", "CC(C)"],
            "B": ["C=C", "CC(=O)", "CC(O)", "CC(F)", "CC(OC)",
                  "CC(N)", "CC(OC(C)=O)", "C3OC3"],
        },
        "target": 8,
        "name": name_dibenzazepine,
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
