# Derives homologue references on two substituted-benzamide templates, the
# dopamine D2/D3 antagonist scaffold of the sulpiride, metoclopramide and
# raclopride series.
#
# Template A is the N-[(pyrrolidin-2-yl)methyl]benzamide of the "-pride"
# antipsychotics: slots are the pyrrolidine N-substituent and the benzene
# ring. template.format(**nulls) is sulpiride.
#
# Template B is the open-chain / piperidinyl benzamide of the prokinetic and
# clebopride series: slots are the amide N-substituent and the same benzene
# ring. template.format(**nulls) is metoclopramide.
#
# Each template is proven before use by regenerating structures the library
# already stores FROM EXTERNAL SOURCES (the rows carrying a "source" key) and
# requiring a canonical-SMILES match after stereochemistry is stripped, so a
# stored entry written in a different atom order still proves the template.
# The hand-written 'Benzamide antipsychotic' and 'Substituted benzamide' rows
# are deliberately not used as anchors. Molecular formulae are composed from
# the parent scaffold formula plus the formula of each substituent group,
# written once per group; RDKit then recomputes the formula from the assembled
# structure and the two must agree.
#
# Numbering: C1 of the benzamide is the carboxamide carbon, so the ring slot
# holds positions 2, 3, 4, 5 and 6 in the order written. Both directions
# round the ring are admissible, tabulated as RING_A and RING_B; the direction
# giving the ring prefixes the lower locant set is chosen, ties being broken
# by giving the lower locant to the prefix cited first in alphanumerical
# order (this is what makes raclopride 2-hydroxy-6-methoxy rather than
# 6-hydroxy-2-methoxy). The carboxamide is the suffix, so hydroxy and amino
# groups are always cited as prefixes and no suffix competition arises.
#
# Template A reserves ring digit 1 for the pyrrolidine and 2 for the benzene;
# template B reserves 2 for the benzene. Substituent groups take digits 3 and
# 4. Rows are skipped when their structure or their name is already stored;
# both the hand-written and the externally sourced row styles of
# data/library.js are read when collecting those stored structures and names.

import argparse
import itertools
import os
import re
import sys

from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")

ROOT = os.environ.get(
    "BENZAMIDE_ROOT", "/home/user/projects/molecule profiler")

ENTRY = re.compile(
    r"\{ name: '([^']*)', cls: '([^']*)', formula: '([^']*)', smiles: '([^']*)'"
)

SOURCED = re.compile(
    r'\{"name":"([^"]*)","cls":"([^"]*)","formula":"([^"]*)","smiles":"([^"]*)"'
)

ATOM = re.compile(r"([A-Z][a-z]?)(\d*)")
LETTERS = re.compile(r"[^a-z]")

# Benzene ring, written as the five atoms at positions 2, 3, 4, 5 and 6 in
# that order. Value: (formula contributed, [(written position, prefix)]).
BENZAMIDE_RING = {
    "c(OC)ccc(S(N)(=O)=O)c": (
        "C6H8NO3S", [("2", "methoxy"), ("5", "sulfamoyl")]),
    "c(OC)cc(N)c(Cl)c": (
        "C6H7ClNO", [("2", "methoxy"), ("4", "amino"), ("5", "chloro")]),
    "c(OC)cc(N)c(S(=O)(=O)CC)c": (
        "C8H12NO3S", [("2", "methoxy"), ("4", "amino"),
                      ("5", "(ethylsulfonyl)")]),
    "c(OC)ccc(S(=O)(=O)CC)c": (
        "C8H11O3S", [("2", "methoxy"), ("5", "(ethylsulfonyl)")]),
    "c(OC)ccc(S(=O)(=O)C)c": (
        "C7H9O3S", [("2", "methoxy"), ("5", "(methylsulfonyl)")]),
    "c(OC)cc(N)c(S(N)(=O)=O)c": (
        "C6H9N2O3S", [("2", "methoxy"), ("4", "amino"), ("5", "sulfamoyl")]),
    "c(OC)ccc(Cl)c": ("C6H6ClO", [("2", "methoxy"), ("5", "chloro")]),
    "c(OC)c(Br)ccc(OC)": (
        "C7H8BrO2", [("2", "methoxy"), ("3", "bromo"), ("6", "methoxy")]),
    "c(O)c(Cl)cc(Cl)c(OC)": (
        "C6H5Cl2O2", [("2", "hydroxy"), ("3", "chloro"), ("5", "chloro"),
                      ("6", "methoxy")]),
    "c(OC)c(OC)cc(S(N)(=O)=O)c": (
        "C7H10NO4S", [("2", "methoxy"), ("3", "methoxy"), ("5", "sulfamoyl")]),
    "c(OC)cc(N)c(S(=O)(=O)NC)c": (
        "C7H11N2O3S", [("2", "methoxy"), ("4", "amino"),
                       ("5", "(methylsulfamoyl)")]),
    "c(OC)cc(N)c(Br)c": (
        "C6H7BrNO", [("2", "methoxy"), ("4", "amino"), ("5", "bromo")]),
    "c(OC)cc(NC)c(Cl)c": (
        "C7H9ClNO", [("2", "methoxy"), ("4", "(methylamino)"),
                     ("5", "chloro")]),
    "c(OCC)cc(N)c(Cl)c": (
        "C7H9ClNO", [("2", "ethoxy"), ("4", "amino"), ("5", "chloro")]),
    "c(OCC)cc(N)c([N+](=O)[O-])c": (
        "C7H9N2O3", [("2", "ethoxy"), ("4", "amino"), ("5", "nitro")]),
    "c(OC)cccc": ("C6H7O", [("2", "methoxy")]),
    "c(OC)ccc(Br)c": ("C6H6BrO", [("2", "methoxy"), ("5", "bromo")]),
    "c(OC)ccc(F)c": ("C6H6FO", [("2", "methoxy"), ("5", "fluoro")]),
    "c(OC)ccc([N+](=O)[O-])c": (
        "C6H6NO3", [("2", "methoxy"), ("5", "nitro")]),
    "c(OC)cc(N)cc": ("C6H8NO", [("2", "methoxy"), ("4", "amino")]),
    "c(OC)c(OC)ccc": ("C7H9O2", [("2", "methoxy"), ("3", "methoxy")]),
    "c(OC)cccc(OC)": ("C7H9O2", [("2", "methoxy"), ("6", "methoxy")]),
    "c(OC)ccc(C)c": ("C7H9O", [("2", "methoxy"), ("5", "methyl")]),
    "c(O)c(Cl)cc(Cl)c(O)": (
        "C5H3Cl2O2", [("2", "hydroxy"), ("3", "chloro"), ("5", "chloro"),
                      ("6", "hydroxy")]),
    "c(O)cccc(OC)": ("C6H7O2", [("2", "hydroxy"), ("6", "methoxy")]),
    "c(OC)c(Cl)ccc(OC)": (
        "C7H8ClO2", [("2", "methoxy"), ("3", "chloro"), ("6", "methoxy")]),
    "c(OCC)ccc(S(N)(=O)=O)c": (
        "C7H10NO3S", [("2", "ethoxy"), ("5", "sulfamoyl")]),
    "c(OC)cc(Cl)cc": ("C6H6ClO", [("2", "methoxy"), ("4", "chloro")]),
    "c(OC)cc(N)c(C)c": (
        "C7H10NO", [("2", "methoxy"), ("4", "amino"), ("5", "methyl")]),
    "c(OC)ccc(S(N)(=O)=O)c(Cl)": (
        "C6H7ClNO3S", [("2", "methoxy"), ("5", "sulfamoyl"), ("6", "chloro")]),
}

# Pyrrolidine N-substituent of template A. Prefix slot: its last atom bonds
# forward to the ring nitrogen.
PYRROLIDINE_NS = {
    "CC": ("C2H5", "ethyl"),
    "": ("H", None),
    "C": ("CH3", "methyl"),
    "CCC": ("C3H7", "propyl"),
    "C=CC": ("C3H5", "prop-2-en-1-yl"),
    "CC(C)": ("C3H7", "propan-2-yl"),
    "c3ccccc3C": ("C7H7", "benzyl"),
    "CCCC": ("C4H9", "butyl"),
    "C3CC3C": ("C4H7", "(cyclopropylmethyl)"),
    "CC(C)C": ("C4H9", "2-methylpropyl"),
}

# Amide N-substituent of template B. Branch slot: its first atom bonds back
# to the amide nitrogen.
BENZAMIDE_AMINES = {
    "CCN(CC)CC": ("C6H14N", "2-(diethylamino)ethyl"),
    "CCN(C)C": ("C4H10N", "2-(dimethylamino)ethyl"),
    "C3CCN(Cc4ccccc4)CC3": ("C12H16N", "1-benzylpiperidin-4-yl"),
    "C3CCCN(Cc4ccccc4)C3": ("C12H16N", "1-benzylpiperidin-3-yl"),
    "CCCN(CC)CC": ("C7H16N", "3-(diethylamino)propyl"),
    "C3CCN(C)CC3": ("C6H12N", "1-methylpiperidin-4-yl"),
    "C3CCN(CC)CC3": ("C7H14N", "1-ethylpiperidin-4-yl"),
    "CCCN(C)C": ("C5H12N", "3-(dimethylamino)propyl"),
    "CC3CCN(CC)CC3": ("C8H16N", "(1-ethylpiperidin-4-yl)methyl"),
    "C3CCCN(C)C3": ("C6H12N", "1-methylpiperidin-3-yl"),
}

RING_A = {"2": "2", "3": "3", "4": "4", "5": "5", "6": "6"}
RING_B = {"2": "6", "3": "5", "4": "4", "5": "3", "6": "2"}


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
    if "{" in text:
        raise SystemExit("FAIL enclosure depth exceeded: " + text)
    if "[" in text:
        return "{" + text + "}"
    return ("[" + text + "]") if "(" in text else ("(" + text + ")")


MULT = {2: "di", 3: "tri", 4: "tetra", 5: "penta", 6: "hexa"}


def rank(loc):
    return (0, 0) if loc == "N" else (1, int(loc))


def collapse(items):
    order = []
    byname = {}
    for loc, nm in sorted(items, key=lambda item: rank(item[0])):
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


def amine_pyrrolidine(fam, v):
    rname = fam["tables"]["R"][v["R"]][1]
    if rname is None:
        return "pyrrolidin-2-ylmethyl"
    return wrap("1-" + wrap(rname) + "pyrrolidin-2-yl") + "methyl"


def amine_table(fam, v):
    return fam["tables"]["AM"][v["AM"]][1]


def name_benzamide(fam, v):
    ring = fam["tables"]["ARO"][v["ARO"]][1]
    options = []
    for tag, mp in (("A", RING_A), ("B", RING_B)):
        locs = sorted(int(mp[p]) for p, _ in ring)
        tie = [loc for _, loc in sorted(
            (LETTERS.sub("", label.lower()), int(mp[p])) for p, label in ring)]
        options.append((locs, tie, tag, mp))
    options.sort(key=lambda opt: (opt[0], opt[1], opt[2]))
    mp = options[0][3]

    items = [(mp[p], wrap(label)) for p, label in ring]
    items.append(("N", wrap(fam["amine"](fam, v))))
    return join(collapse(items), "benzamide")


FAMILIES = [
    {
        "cls": "Substituted benzamide",
        "template": "{R}N1CCCC1CNC(=O)c2{ARO}2",
        "nulls": {"R": "CC", "ARO": "c(OC)ccc(S(N)(=O)=O)c"},
        "tables": {"R": PYRROLIDINE_NS, "ARO": BENZAMIDE_RING},
        "amine": amine_pyrrolidine,
        "name": name_benzamide,
        "target": 32,
        "anchors": {
            "levosulpiride": {},
            "veralipride": {"R": "C=CC",
                            "ARO": "c(OC)c(OC)cc(S(N)(=O)=O)c"},
            "alpiropride": {"R": "C=CC",
                            "ARO": "c(OC)cc(N)c(S(=O)(=O)NC)c"},
        },
    },
    {
        "cls": "Substituted benzamide",
        "template": "O=C(N{AM})c2{ARO}2",
        "nulls": {"AM": "CCN(CC)CC", "ARO": "c(OC)cc(N)c(Cl)c"},
        "tables": {"AM": BENZAMIDE_AMINES, "ARO": BENZAMIDE_RING},
        "amine": amine_table,
        "name": name_benzamide,
        "target": 15,
        "anchors": {
            "cisapride": {"AM": "C3CCN(CCCOc4ccc(F)cc4)CC3OC"},
            "mosapride": {"AM": "CC3CN(Cc4ccc(F)cc4)CCO3",
                          "ARO": "c(OCC)cc(N)c(Cl)c"},
            "cinitapride": {"AM": "C3CCN(CC4CC=CCC4)CC3",
                            "ARO": "c(OCC)cc(N)c([N+](=O)[O-])c"},
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
    sourced = {}
    stored_names = set()
    seen = {}
    for pattern in (ENTRY, SOURCED):
        for m in pattern.finditer(lib):
            name, cls, formula, smiles = m.groups()
            stored[name] = smiles
            if pattern is SOURCED:
                sourced[name] = smiles
            stored_names.add(name)
            key = flat(smiles)
            if key:
                seen.setdefault(key, name)

    fails = []
    for fam in FAMILIES:
        fam["slots"] = {k: list(fam["tables"][k]) for k in fam["tables"]}
        proven = 0
        for name, vals in sorted(fam["anchors"].items()):
            if name not in sourced:
                fails.append("anchor %s is not an externally sourced row"
                             % name)
                continue
            full = dict(fam["nulls"])
            full.update(vals)
            built = flat(fam["template"].format(**full))
            want = flat(sourced[name])
            if built is None or built != want:
                fails.append("anchor %s mismatch\n  built %s\n  want  %s"
                             % (name, built, want))
                continue
            proven += 1
            print("proven %s <- %s" % (name, want), file=sys.stderr)
        if proven < 2:
            fails.append("%s %s: %d anchors proven, need 2"
                         % (fam["cls"], fam["template"], proven))
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
        counts.append("%s %d" % (fam["template"], made))
        if made < fam["target"]:
            fails.append("%s: only %d of %d (%d collisions skipped)"
                         % (fam["template"], made, fam["target"], skipped))

    if fails:
        for f in fails:
            print("FAIL " + f, file=sys.stderr)
        raise SystemExit(1)

    sys.stdout.write("".join(out))
    print("%d new rows (%s)" % (len(out), "; ".join(counts)), file=sys.stderr)


if __name__ == "__main__":
    main()
