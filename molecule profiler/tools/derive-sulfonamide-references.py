# Derives homologue references for the Sulfonamide class on two templates, both
# built on the benzenesulfonamide parent hydride: the ring-substituted primary
# benzenesulfonamides (the carbonic-anhydrase / sulfanilamide series the class
# already stores) and the N-substituted benzenesulfonamides (the N-alkyl,
# N,N-dialkyl and N-aryl sulfonanilide series).
#
# The 15 rows data/library.js already carries under cls 'Sulfonamide' are all
# primary benzenesulfonamides bearing one para substituent, so that is what the
# class denotes here; the N1-heteroaryl sulfanilamides are stored under
# 'Antibacterial'/'Antibiotic' and the thiazides under 'Diuretic', and neither
# sub-family is derived here.
#
# Each template is proven before use by regenerating structures the library
# stores FROM EXTERNAL SOURCES (the JSON-style rows carrying a "source" key)
# and requiring a canonical-SMILES match after stereochemistry is stripped, so
# a stored entry written in a different atom order still proves the template.
# The 15 hand-written Sulfonamide rows are deliberately not used as anchors.
# Molecular formulae are composed differentially: the parent scaffold formula
# plus the formula of each substituent group, minus the formula of the group the
# null slot carries; RDKit then recomputes the formula from the assembled
# structure and the two must agree.
#
# Numbering: the sulfonamide group is the principal characteristic group and
# fixes C1 of the benzene ring, so the ring is numbered in whichever of the two
# directions (tabulated as RING_A and RING_B) gives the prefixes the lower
# locant set, with the locant of the alphabetically first prefix breaking a tie.
# The sulfonamide nitrogen takes the locant N; ring substituents take numerals.
# The old sulfanilamide N1/N4 convention is NOT used: an amino group on the ring
# is cited as 4-amino, not N4-amino, which is why 4-amino-N-methylbenzene-
# sulfonamide is written that way rather than as N1-methylsulfanilamide.
#
# Groups that would outrank a sulfonamide as principal characteristic group
# (carboxy, carbamoyl, a second sulfamoyl) appear only in anchor-only table
# entries, marked False, which are proven but never emitted.
#
# Template A reserves ring digit 1 and its ring-substituent groups take 2 and 3.
# Template B reserves ring digit 1, its N-substituent groups take 2 and its
# ring-substituent groups take 3. Rows are skipped when their structure or their
# name is already stored; both the hand-written and the externally sourced row
# styles of data/library.js are read when collecting those structures and names.

import argparse
import itertools
import os
import re
import sys

from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")

LIBRARY = "/home/user/projects/molecule profiler/data/library.js"

ENTRY = re.compile(
    r"\{ name: '([^']*)', cls: '([^']*)', formula: '([^']*)', smiles: '([^']*)'"
)

SOURCED = re.compile(
    r'\{"name":"([^"]*)","cls":"([^"]*)","formula":"([^"]*)","smiles":"([^"]*)"'
)

ATOM = re.compile(r"([A-Z][a-z]?)(\d*)")
LETTERS = re.compile(r"[^a-z]")

# A ring slot holds the five ring atoms a2..a6 that follow the attachment atom
# c1, which carries the sulfonamide group. a2/a6 are ortho, a3/a5 meta and a4
# para, so para-chloro is written ccc(Cl)cc.
#
# value = (fragment formula, [(slot position, prefix name)], emit?)
BENZENE_RING = {
    # anchor-only: the three externally sourced structures that prove template A
    "ccc(NCc2ccccc2)cc": ("C12H12N", [], False),
    "ccc(C(=O)NCc2ccccc2)cc": ("C13H12NO", [], False),
    "c(F)cc(-c2oc(C)nc2C3CCCCC3)cc": ("C15H17FNO", [], False),

    "c(Cl)cccc": ("C5H4Cl", [("a2", "chloro")], True),
    "cc(Cl)ccc": ("C5H4Cl", [("a3", "chloro")], True),
    "c(F)cccc": ("C5H4F", [("a2", "fluoro")], True),
    "cc(F)ccc": ("C5H4F", [("a3", "fluoro")], True),
    "c(C)cccc": ("C6H7", [("a2", "methyl")], True),
    "cc(C)ccc": ("C6H7", [("a3", "methyl")], True),
    "c(OC)cccc": ("C6H7O", [("a2", "methoxy")], True),
    "cc(OC)ccc": ("C6H7O", [("a3", "methoxy")], True),
    "c(O)cccc": ("C5H5O", [("a2", "hydroxy")], True),
    "cc(O)ccc": ("C5H5O", [("a3", "hydroxy")], True),
    "c([N+](=O)[O-])cccc": ("C5H4NO2", [("a2", "nitro")], True),
    "cc([N+](=O)[O-])ccc": ("C5H4NO2", [("a3", "nitro")], True),
    "c(N)cccc": ("C5H6N", [("a2", "amino")], True),
    "cc(N)ccc": ("C5H6N", [("a3", "amino")], True),
    "c(Br)cccc": ("C5H4Br", [("a2", "bromo")], True),
    "cc(Br)ccc": ("C5H4Br", [("a3", "bromo")], True),
    "cc(C(F)(F)F)ccc": ("C6H4F3", [("a3", "(trifluoromethyl)")], True),
    "ccc(C(F)(F)F)cc": ("C6H4F3", [("a4", "(trifluoromethyl)")], True),
    "c(CC)cccc": ("C7H9", [("a2", "ethyl")], True),
    "cc(CC)ccc": ("C7H9", [("a3", "ethyl")], True),
    "ccc(CC)cc": ("C7H9", [("a4", "ethyl")], True),
    "cc(C(C)C)ccc": ("C8H11", [("a3", "propan-2-yl")], True),
    "ccc(C(C)C)cc": ("C8H11", [("a4", "propan-2-yl")], True),
    "c(I)cccc": ("C5H4I", [("a2", "iodo")], True),
    "cc(I)ccc": ("C5H4I", [("a3", "iodo")], True),
    "ccc(I)cc": ("C5H4I", [("a4", "iodo")], True),
    "cc(Cl)c(Cl)cc": ("C5H3Cl2", [("a3", "chloro"), ("a4", "chloro")], True),
    "c(Cl)cc(Cl)cc": ("C5H3Cl2", [("a2", "chloro"), ("a4", "chloro")], True),
    "c(Cl)ccc(Cl)c": ("C5H3Cl2", [("a2", "chloro"), ("a5", "chloro")], True),
    "cc(OC)c(OC)cc": ("C7H9O2", [("a3", "methoxy"), ("a4", "methoxy")], True),
    "c(C)cc(C)cc": ("C7H9", [("a2", "methyl"), ("a4", "methyl")], True),
    "cc(Cl)c(C)cc": ("C6H6Cl", [("a3", "chloro"), ("a4", "methyl")], True),
    "cc([N+](=O)[O-])c(Cl)cc": ("C5H3ClNO2",
                                [("a3", "nitro"), ("a4", "chloro")], True),
    "cc(C)c(C)cc": ("C7H9", [("a3", "methyl"), ("a4", "methyl")], True),
}

# The same five-atom ring slot for template B, written with ring digit 3 so the
# N-substituent groups can keep digit 2.
NSUB_RING = {
    # anchor-only: the three externally sourced structures that prove template B
    "ccc(C(=O)O)cc": ("C6H5O2", [], False),
    "c(C)ccc([N+](=O)[O-])c": ("C6H6NO2", [], False),
    "ccc(OP(=S)(OC)OC)cc": ("C7H10O3PS", [], False),

    "ccccc": ("C5H5", [], True),
    "ccc(C)cc": ("C6H7", [("a4", "methyl")], True),
    "ccc(Cl)cc": ("C5H4Cl", [("a4", "chloro")], True),
    "ccc(OC)cc": ("C6H7O", [("a4", "methoxy")], True),
    "ccc([N+](=O)[O-])cc": ("C5H4NO2", [("a4", "nitro")], True),
    "ccc(N)cc": ("C5H6N", [("a4", "amino")], True),
    "ccc(F)cc": ("C5H4F", [("a4", "fluoro")], True),
    "ccc(Br)cc": ("C5H4Br", [("a4", "bromo")], True),
    "c(C)cccc": ("C6H7", [("a2", "methyl")], True),
    "cc([N+](=O)[O-])ccc": ("C5H4NO2", [("a3", "nitro")], True),
}

# value = (fragment formula, prefix name, how many copies on the nitrogen).
# The fragment formula counts the substituent groups PLUS the hydrogens the
# nitrogen still carries, because the null slot is a disubstituted nitrogen with
# none: a monosubstituted slot therefore carries one hydrogen of its own.
NITROGEN_SUBS = {
    "(C)": ("CH4", "methyl", 1),
    "(CC)": ("C2H6", "ethyl", 1),
    "(C)(C)": ("C2H6", "methyl", 2),
    "(CCC)": ("C3H8", "propyl", 1),
    "(C(C)C)": ("C3H8", "propan-2-yl", 1),
    "(CCCC)": ("C4H10", "butyl", 1),
    "(CC)(CC)": ("C4H10", "ethyl", 2),
    "(c2ccccc2)": ("C6H6", "phenyl", 1),
    "(Cc2ccccc2)": ("C7H8", "benzyl", 1),
    "(C2CCCCC2)": ("C6H12", "cyclohexyl", 1),
}

RING_A = {"a2": "2", "a3": "3", "a4": "4", "a5": "5", "a6": "6"}
RING_B = {"a2": "6", "a3": "5", "a4": "4", "a5": "3", "a6": "2"}


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


def direction(ring):
    """Pick the ring numbering direction giving the lower locant set."""
    options = []
    for tag, mp in (("A", RING_A), ("B", RING_B)):
        locs = sorted(int(mp[p]) for p, _ in ring)
        alpha = [loc for _, loc in
                 sorted((LETTERS.sub("", nm.lower()), int(mp[p]))
                        for p, nm in ring)]
        options.append((locs, alpha, tag, mp))
    options.sort(key=lambda opt: (opt[0], opt[1], opt[2]))
    return options[0][3]


def allow_ring(fam, v):
    return fam["tables"]["ARO"][v["ARO"]][2]


def name_ring(fam, v):
    ring = fam["tables"]["ARO"][v["ARO"]][1]
    mp = direction(ring)
    items = [(mp[p], wrap(nm)) for p, nm in ring]
    return join(collapse(items), "benzenesulfonamide")


def name_nsub(fam, v):
    ring = fam["tables"]["ARO"][v["ARO"]][1]
    nm, count = fam["tables"]["R"][v["R"]][1], fam["tables"]["R"][v["R"]][2]
    mp = direction(ring)
    items = [(mp[p], wrap(label)) for p, label in ring]
    for _ in range(count):
        items.append(("N", wrap(nm)))
    return join(collapse(items), "benzenesulfonamide")


FAMILIES = [
    {
        "key": "benzenesulfonamide ring",
        "cls": "Sulfonamide",
        "template": "NS(=O)(=O)c1{ARO}1",
        "nulls": {"ARO": "ccc(NCc2ccccc2)cc"},
        "tables": {"ARO": BENZENE_RING},
        "name": name_ring,
        "allow": allow_ring,
        "target": 20,
        "anchors": {
            "benzylsulfamide": {},
            "N-benzyl-4-sulfamoylbenzamide": {
                "ARO": "ccc(C(=O)NCc2ccccc2)cc"},
            "tilmacoxib": {"ARO": "c(F)cc(-c2oc(C)nc2C3CCCCC3)cc"},
        },
    },
    {
        "key": "N-substituted benzenesulfonamide",
        "cls": "Sulfonamide",
        "template": "N{R}S(=O)(=O)c1{ARO}1",
        "nulls": {"R": "(CC)(CC)", "ARO": "ccc(C(=O)O)cc"},
        "tables": {"R": NITROGEN_SUBS, "ARO": NSUB_RING},
        "name": name_nsub,
        "allow": allow_ring,
        "target": 15,
        "anchors": {
            "etebenecid": {},
            "BRL-50481": {"R": "(C)(C)",
                          "ARO": "c(C)ccc([N+](=O)[O-])c"},
            "famphur": {"R": "(C)(C)", "ARO": "ccc(OP(=S)(OC)OC)cc"},
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

    lib = open(LIBRARY, encoding="utf-8").read()
    stored = {}
    stored_names = set()
    sourced = set()
    seen = {}
    for pattern in (ENTRY, SOURCED):
        for m in pattern.finditer(lib):
            name, cls, formula, smiles = m.groups()
            stored[name] = smiles
            stored_names.add(name)
            if pattern is SOURCED:
                sourced.add(name)
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
            if name not in sourced:
                fails.append("anchor %s is not an externally sourced row" % name)
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
            fails.append("%s: %d anchors proven, need 2" % (fam["key"], proven))
        else:
            print("%s: %d anchors proven" % (fam["key"], proven),
                  file=sys.stderr)
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
            fails.append("%s: parent will not parse: %s" % (fam["key"], parent))
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
                fails.append("%s: will not parse: %s" % (fam["key"], smiles))
                continue
            got = CalcMolFormula(mol)
            if got != stated:
                fails.append("%s: formula %s stated, %s computed: %s"
                             % (fam["key"], stated, got, smiles))
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
        counts.append("%s %d" % (fam["key"], made))
        if made < fam["target"]:
            fails.append("%s: only %d of %d (%d collisions skipped)"
                         % (fam["key"], made, fam["target"], skipped))

    if fails:
        for f in fails:
            print("FAIL " + f, file=sys.stderr)
        raise SystemExit(1)

    sys.stdout.write("".join(out))
    print("%d new rows (%s)" % (len(out), "; ".join(counts)), file=sys.stderr)


if __name__ == "__main__":
    main()
