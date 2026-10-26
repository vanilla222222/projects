# Derives homologue references on the 1-aryl-2,3,4,5-tetrahydro-1H-3-benzazepine
# template, the dopamine D1 scaffold of the SKF and SCH series.
#
# The template is proven before use by regenerating structures the library
# already stores from external sources and requiring a canonical-SMILES match
# after stereochemistry is stripped, so a stored entry written in a different
# atom order still proves the template. The six hand-written SKF and SCH rows
# are deliberately not used as anchors. Molecular formulae are composed from
# the parent scaffold formula plus the formula of each substituent group,
# written once per group; RDKit then recomputes the formula from the assembled
# structure and the two must agree.
#
# Ring numbering runs C1, C2, N3, C4, C5, C5a, C6, C7, C8, C9, C9a, so the
# aromatic slot holds positions 6, 7, 8 and 9 in that order. The seven-membered
# ring is symmetric about N3, so the two numbering directions tabulated as
# BENZAZEPINE_A and BENZAZEPINE_B are both admissible; the direction giving the
# hydroxy suffix the lower locant set is chosen, then the direction giving the
# prefixes the lower locant set. Hydroxy groups on the C1 aryl ring are cited
# as prefixes, which requires the benzazepine ring to carry at least as many
# hydroxy groups as the aryl ring; combinations that would move the principal
# characteristic group onto the aryl ring are rejected.
#
# The template reserves ring digits 1 and 2, its aryl slot uses 3, and its N-3
# slot uses 5. Rows are skipped when their structure or their name is already
# stored; both the hand-written and the externally sourced row styles of
# data/library.js are read when collecting those stored structures and names.

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

SOURCED = re.compile(
    r'\{"name":"([^"]*)","cls":"([^"]*)","formula":"([^"]*)","smiles":"([^"]*)"'
)

ATOM = re.compile(r"([A-Z][a-z]?)(\d*)")
LETTERS = re.compile(r"[^a-z]")

BENZAZEPINE_ARYLS = {
    "c3ccccc3": ("C6H5", "phenyl", 0),
    "c3ccc(O)cc3": ("C6H5O", "4-hydroxyphenyl", 1),
    "c3cc(C)ccc3": ("C7H7", "3-methylphenyl", 0),
    "c3ccc(Cl)cc3": ("C6H4Cl", "4-chlorophenyl", 0),
    "c3ccc(F)cc3": ("C6H4F", "4-fluorophenyl", 0),
    "c3cc(Cl)ccc3": ("C6H4Cl", "3-chlorophenyl", 0),
    "c3ccc(C)cc3": ("C7H7", "4-methylphenyl", 0),
    "c3ccc(OC)cc3": ("C7H7O", "4-methoxyphenyl", 0),
    "c3cc(O)ccc3": ("C6H5O", "3-hydroxyphenyl", 1),
    "c3cc(F)ccc3": ("C6H4F", "3-fluorophenyl", 0),
    "c3c(F)cccc3": ("C6H4F", "2-fluorophenyl", 0),
    "c3c(Cl)cccc3": ("C6H4Cl", "2-chlorophenyl", 0),
    "c3ccc(Br)cc3": ("C6H4Br", "4-bromophenyl", 0),
    "c3cc(Cl)c(Cl)cc3": ("C6H3Cl2", "3,4-dichlorophenyl", 0),
    "c3cc(C(F)(F)F)ccc3": ("C7H4F3", "3-(trifluoromethyl)phenyl", 0),
    "c3cc(O)c(O)cc3": ("C6H4O2", "3,4-dihydroxyphenyl", 2),
    "c3cc(OC)c(OC)cc3": ("C8H9O2", "3,4-dimethoxyphenyl", 0),
    "c3ccccn3": ("C5H4N", "pyridin-2-yl", 0),
    "c3cccnc3": ("C5H4N", "pyridin-3-yl", 0),
    "c3ccncc3": ("C5H4N", "pyridin-4-yl", 0),
}

BENZAZEPINE_NS = {
    "": ("H", None),
    "(C)": ("CH3", "methyl"),
    "(CC)": ("C2H5", "ethyl"),
    "(CC=C)": ("C3H5", "prop-2-en-1-yl"),
    "(CCC)": ("C3H7", "propyl"),
    "(Cc5ccccc5)": ("C7H7", "benzyl"),
    "(CC5CC5)": ("C4H7", "(cyclopropylmethyl)"),
    "(CC(C)C)": ("C4H9", "2-methylpropyl"),
    "(CCCC)": ("C4H9", "butyl"),
}

BENZAZEPINE_RING = {
    "cc(O)c(O)c": ("C4H4O2", [("7", "hydroxy"), ("8", "hydroxy")]),
    "c(Cl)c(O)c(O)c": ("C4H3ClO2", [("6", "chloro"), ("7", "hydroxy"),
                                    ("8", "hydroxy")]),
    "cc(Cl)c(O)c": ("C4H3ClO", [("7", "chloro"), ("8", "hydroxy")]),
    "cc(Br)c(O)c": ("C4H3BrO", [("7", "bromo"), ("8", "hydroxy")]),
    "cc(F)c(O)c": ("C4H3FO", [("7", "fluoro"), ("8", "hydroxy")]),
    "cc(C)c(O)c": ("C5H6O", [("7", "methyl"), ("8", "hydroxy")]),
    "cc(O)cc": ("C4H4O", [("7", "hydroxy")]),
    "ccc(O)c": ("C4H4O", [("8", "hydroxy")]),
    "cccc": ("C4H4", []),
    "cc(OC)c(OC)c": ("C6H8O2", [("7", "methoxy"), ("8", "methoxy")]),
    "cc(O)c(OC)c": ("C5H6O2", [("7", "hydroxy"), ("8", "methoxy")]),
    "cc(OC)c(O)c": ("C5H6O2", [("7", "methoxy"), ("8", "hydroxy")]),
    "c(C)c(O)c(O)c": ("C5H6O2", [("6", "methyl"), ("7", "hydroxy"),
                                 ("8", "hydroxy")]),
    "c(F)c(O)c(O)c": ("C4H3FO2", [("6", "fluoro"), ("7", "hydroxy"),
                                  ("8", "hydroxy")]),
    "c(Br)c(O)c(O)c": ("C4H3BrO2", [("6", "bromo"), ("7", "hydroxy"),
                                    ("8", "hydroxy")]),
    "cc(O)c(Cl)c": ("C4H3ClO", [("7", "hydroxy"), ("8", "chloro")]),
    "c(Cl)ccc": ("C4H3Cl", [("6", "chloro")]),
    "cc(Cl)cc": ("C4H3Cl", [("7", "chloro")]),
    "ccc(Cl)c": ("C4H3Cl", [("8", "chloro")]),
    "cc(F)cc": ("C4H3F", [("7", "fluoro")]),
    "ccc(F)c": ("C4H3F", [("8", "fluoro")]),
    "cc(OC)cc": ("C5H6O", [("7", "methoxy")]),
    "ccc(OC)c": ("C5H6O", [("8", "methoxy")]),
}

BENZAZEPINE_A = {"6": "6", "7": "7", "8": "8", "9": "9", "AR": "1"}
BENZAZEPINE_B = {"6": "9", "7": "8", "8": "7", "9": "6", "AR": "5"}


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


def wrap(text):
    if "-" not in text and "," not in text:
        return text
    return ("[" + text + "]") if "(" in text else ("(" + text + ")")


MULT = {2: "di", 3: "tri", 4: "tetra", 5: "penta", 6: "hexa"}


def collapse(items):
    order = []
    byname = {}
    for loc, nm in sorted(items, key=lambda item: int(item[0])):
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


def allow_benzazepine(fam, v):
    aryl_ols = fam["tables"]["AR"][v["AR"]][2]
    ring = fam["tables"]["ARO"][v["ARO"]][1]
    ring_ols = len([p for p, label in ring if label == "hydroxy"])
    return aryl_ols <= ring_ols


def name_benzazepine(fam, v):
    aryl = fam["tables"]["AR"][v["AR"]][1]
    rname = fam["tables"]["R"][v["R"]][1]
    ring = fam["tables"]["ARO"][v["ARO"]][1]
    ols = [p for p, label in ring if label == "hydroxy"]

    options = []
    for tag, mp in (("A", BENZAZEPINE_A), ("B", BENZAZEPINE_B)):
        olset = sorted(int(mp[p]) for p in ols)
        rest = sorted([int(mp[p]) for p, label in ring if label != "hydroxy"]
                      + [int(mp["AR"])]
                      + ([3] if rname is not None else []))
        options.append((olset, rest, tag, mp))
    options.sort(key=lambda opt: (opt[0], opt[1], opt[2]))
    olset, _, _, mp = options[0]

    items = [(mp[p], wrap(label)) for p, label in ring if label != "hydroxy"]
    items.append((mp["AR"], wrap(aryl)))
    if rname is not None:
        items.append(("3", wrap(rname)))

    if not ols:
        stem = "2,3,4,5-tetrahydro-1H-3-benzazepine"
    else:
        locs = ",".join(str(x) for x in olset)
        if len(olset) == 1:
            stem = "2,3,4,5-tetrahydro-1H-3-benzazepin-" + locs + "-ol"
        else:
            stem = ("2,3,4,5-tetrahydro-1H-3-benzazepine-" + locs + "-"
                    + MULT[len(olset)] + "ol")
    return join(collapse(items), stem)


FAMILIES = [
    {
        "cls": "Benzazepine",
        "template": "C1({AR})CN{R}CCc2{ARO}c12",
        "nulls": {"AR": "c3ccccc3", "R": "", "ARO": "cc(O)c(O)c"},
        "tables": {"AR": BENZAZEPINE_ARYLS, "R": BENZAZEPINE_NS,
                   "ARO": BENZAZEPINE_RING},
        "name": name_benzazepine,
        "allow": allow_benzazepine,
        "target": 44,
        "anchors": {
            "1-phenyl-2,3,4,5-tetrahydro-1H-3-benzazepine-7,8-diol": {},
            "SCH 23390": {"R": "(C)", "ARO": "cc(Cl)c(O)c"},
            "N-allyl-1-phenyl-2,3,4,5-tetrahydro-3-benzazepine-7,8-diol": {
                "R": "(CC=C)"},
            "N-methyl-6-chloro-1-(3-methylphenyl)-2,3,4,5-tetrahydro-"
            "3-benzazepine-7,8-diol": {
                "AR": "c3cc(C)ccc3", "R": "(C)", "ARO": "c(Cl)c(O)c(O)c"},
            "N-allyl-6-chloro-1-(3-methylphenyl)-2,3,4,5-tetrahydro-"
            "3-benzazepinium-7,8-diol": {
                "AR": "c3cc(C)ccc3", "R": "(CC=C)", "ARO": "c(Cl)c(O)c(O)c"},
            "CHEMBL588": {"AR": "c3ccc(O)cc3", "ARO": "c(Cl)c(O)c(O)c"},
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
    for pattern in (ENTRY, SOURCED):
        for m in pattern.finditer(lib):
            name, cls, formula, smiles = m.groups()
            stored[name] = smiles
            stored_names.add(name)
            key = flat(smiles)
            if key:
                seen.setdefault(key, name)

    fails = []
    for fam in FAMILIES:
        fam["slots"] = {k: list(fam["tables"][k]) for k in fam["tables"]}
        proven = 0
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
                continue
            proven += 1
        if proven < 2:
            fails.append("%s: %d anchors proven, need 2" % (fam["cls"], proven))
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
            if not fam["allow"](fam, vals):
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
