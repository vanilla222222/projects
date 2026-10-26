# Derives homologue references on two antiestrogen templates: the
# triarylethylene aminoethers (tamoxifen, afimoxifene, endoxifen, droloxifene
# and idoxifene series) and the 3,4-diarylhex-3-ene phenols and their ethers
# (diethylstilbestrol and dimestrol series).
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree. Templates
# reserve ring digits 1 and 2, so interpolated rings use 3 upwards. Rows are
# skipped when their structure or their name is already stored.

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
    "C": ("CH3", "methoxy"),
    "CC": ("C2H5", "ethoxy"),
    "CCC": ("C3H7", "propoxy"),
    "C(C)C": ("C3H7", "propan-2-yloxy"),
    "C(=O)C": ("C2H3O", "acetyloxy"),
    "C(=O)CC": ("C3H5O", "propanoyloxy"),
    "c3ccccc3": ("C6H5", "phenyl"),
    "c3ccc(O)cc3": ("C6H5O", "4-hydroxyphenyl"),
    "c3cccc(O)c3": ("C6H5O", "3-hydroxyphenyl"),
    "c3ccc(F)cc3": ("C6H4F", "4-fluorophenyl"),
    "c3ccc(Cl)cc3": ("C6H4Cl", "4-chlorophenyl"),
    "c3ccc(Br)cc3": ("C6H4Br", "4-bromophenyl"),
    "c3ccc(I)cc3": ("C6H4I", "4-iodophenyl"),
    "c3ccc(C)cc3": ("C7H7", "4-methylphenyl"),
    "c3cccc(C)c3": ("C7H7", "3-methylphenyl"),
    "c3ccc(OC)cc3": ("C7H7O", "4-methoxyphenyl"),
    "c3ccc(C#N)cc3": ("C7H4N", "4-cyanophenyl"),
    "c3ccc(O)c(C)c3": ("C7H7O", "4-hydroxy-3-methylphenyl"),
    "c3ccc(O)c(OC)c3": ("C7H7O2", "4-hydroxy-3-methoxyphenyl"),
    "c3cccs3": ("C4H3S", "thiophen-2-yl"),
}

AMINES = {
    "N(C)C": ("C2H6N", ["methyl", "methyl"]),
    "NC": ("CH4N", ["methyl"]),
    "N": ("H2N", []),
    "N(CC)CC": ("C4H10N", ["ethyl", "ethyl"]),
    "N(C)CC": ("C3H8N", ["methyl", "ethyl"]),
    "N(CCC)CCC": ("C6H14N", ["propyl", "propyl"]),
    "N3CCCC3": ("C4H8N", None),
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


def slot_formula(value):
    if value in AMINES:
        return parse_formula(AMINES[value][0])
    if value not in GROUPS:
        raise SystemExit("FAIL unknown group %r" % value)
    return parse_formula(GROUPS[value][0])


def group_name(value):
    name = GROUPS[value][1]
    if name is None:
        raise SystemExit("FAIL group %r carries no name" % value)
    return name


def amine_names(value):
    names = AMINES[value][1]
    if names is None:
        raise SystemExit("FAIL amine %r carries no name" % value)
    return names


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


def wrap(inner, stem):
    if "(" in inner:
        return "{4-[" + inner + "]" + stem + "}"
    return "[4-(" + inner + ")" + stem + "]"


def name_triarylethylene(v):
    inner = join(collapse([("1", enclose(group_name(v["AR1"]))),
                           ("2", enclose(group_name(v["AR2"])))]),
                 "but-1-en-1-yl")
    items = [("2", wrap(inner, "phenoxy"))]
    for nm in amine_names(v["AM"]):
        items.append(("N", nm))
    return join(collapse(items), "ethanamine")


def bracket(text):
    return ("[" + text + "]") if "(" in text else ("(" + text + ")")


def name_diarylhexene(v):
    inner = join(collapse([("4", enclose(group_name(v["AR"])))]),
                 "hex-3-en-3-yl")
    core = bracket(inner)
    if not v["E"]:
        return join(collapse([("4", core)]), "phenol")
    return join(collapse([("1", group_name(v["E"])), ("4", core)]), "benzene")


ARYLS = ["c3ccccc3", "c3ccc(O)cc3", "c3ccc(F)cc3", "c3ccc(Cl)cc3",
         "c3ccc(C)cc3", "c3ccc(OC)cc3", "c3cccc(O)c3", "c3ccc(Br)cc3",
         "c3cccc(C)c3", "c3ccc(C#N)cc3", "c3ccc(O)c(C)c3",
         "c3ccc(O)c(OC)c3", "c3cccs3", "c3ccc(I)cc3"]

AMS = ["N(C)C", "NC", "N(CC)CC", "N(C)CC", "N", "N(CCC)CCC"]

ETHERS = ["", "C", "CC", "C(C)C", "C(=O)C", "CCC", "C(=O)CC"]

FAMILIES = [
    {
        "cls": "SERM",
        "template": "CCC(=C({AR1})c1ccc(OCC{AM})cc1){AR2}",
        "nulls": {"AR1": "c3ccccc3", "AR2": "c3ccccc3", "AM": "N(C)C"},
        "slots": {"AR1": ARYLS, "AR2": ARYLS, "AM": AMS},
        "name": name_triarylethylene,
        "target": 40,
        "anchors": {
            "Tamoxifen": {},
            "Afimoxifene": {"AR2": "c3ccc(O)cc3"},
            "Endoxifen": {"AR2": "c3ccc(O)cc3", "AM": "NC"},
            "Droloxifene": {"AR2": "c3cccc(O)c3"},
            "Idoxifene": {"AR2": "c3ccc(I)cc3", "AM": "N3CCCC3"},
        },
    },
    {
        "cls": "Synthetic estrogen",
        "template": "CCC(=C(CC){AR})c1ccc(O{E})cc1",
        "nulls": {"AR": "c3ccc(O)cc3", "E": ""},
        "slots": {"AR": ARYLS, "E": ETHERS},
        "name": name_diarylhexene,
        "target": 39,
        "anchors": {
            "Diethylstilbestrol": {},
            "Dimestrol": {"AR": "c3ccc(OC)cc3", "E": "C"},
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
                for sym, n in slot_formula(v).items():
                    tally[sym] = tally.get(sym, 0) + n
                for sym, n in slot_formula(fam["nulls"][k]).items():
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
