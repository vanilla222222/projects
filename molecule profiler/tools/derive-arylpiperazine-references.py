# Derives homologue references on two dopaminergic templates: the
# 1-arylpiperazines (the mCPP, pCPP, pFPP, TFMPP, 2-NP, quipazine and MK-212
# series) and the 2-aminotetralins (the DPAT and UH-232 series).
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match after stereochemistry
# is stripped, so a stored entry written in a different atom order still
# proves the template. Molecular formulae are composed from the parent
# scaffold formula plus the formula of each substituent group, written once
# per group; RDKit then recomputes the formula from the assembled structure
# and the two must agree.
#
# The aminotetralins carry two parent hydrides. When no hydroxy group is
# present the amine is the principal characteristic group and the parent is
# 1,2,3,4-tetrahydronaphthalen-2-amine, whose numbering puts the methyl at 1
# and the aromatic positions at 5 to 8. When a hydroxy group is present it
# outranks the amine, the parent becomes 5,6,7,8-tetrahydronaphthalen-n-ol,
# and the ring is renumbered in whichever of the two directions gives the
# hydroxy groups the lower locant set; the amine is then cited as a prefix.
# The two directions are tabulated as TETRALIN_A and TETRALIN_B.
#
# The piperazine template reserves ring digit 1, its aryl slot uses 2 and 3,
# and its N-4 slot uses 4. The aminotetralin template reserves 1 and 2. Rows
# are skipped when their structure or their name is already stored; both the
# hand-written and the externally sourced row styles of data/library.js are
# read when collecting those stored structures and names.

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

PIPERAZINE_ARYLS = {
    "c2cc(Cl)ccc2": ("C6H4Cl", "3-chlorophenyl"),
    "c2ccc(Cl)cc2": ("C6H4Cl", "4-chlorophenyl"),
    "c2ccc(F)cc2": ("C6H4F", "4-fluorophenyl"),
    "c2cc(C(F)(F)F)ccc2": ("C7H4F3", "3-(trifluoromethyl)phenyl"),
    "c2ccccc2": ("C6H5", "phenyl"),
    "c2c(OC)cccc2": ("C7H7O", "2-methoxyphenyl"),
    "c2c(Cl)cccc2": ("C6H4Cl", "2-chlorophenyl"),
    "c2cc(F)ccc2": ("C6H4F", "3-fluorophenyl"),
    "c2c(F)cccc2": ("C6H4F", "2-fluorophenyl"),
    "c2ccc(C(F)(F)F)cc2": ("C7H4F3", "4-(trifluoromethyl)phenyl"),
    "c2ccc(OC)cc2": ("C7H7O", "4-methoxyphenyl"),
    "c2cc(OC)ccc2": ("C7H7O", "3-methoxyphenyl"),
    "c2ccc(C)cc2": ("C7H7", "4-methylphenyl"),
    "c2c(C)cccc2": ("C7H7", "2-methylphenyl"),
    "c2cc(C)ccc2": ("C7H7", "3-methylphenyl"),
    "c2ccc(Br)cc2": ("C6H4Br", "4-bromophenyl"),
    "c2cc(Cl)c(Cl)cc2": ("C6H3Cl2", "3,4-dichlorophenyl"),
    "c2cc(Cl)cc(Cl)c2": ("C6H3Cl2", "3,5-dichlorophenyl"),
    "c2c(Cl)ccc(Cl)c2": ("C6H3Cl2", "2,5-dichlorophenyl"),
    "c2c(Cl)cc(Cl)cc2": ("C6H3Cl2", "2,4-dichlorophenyl"),
    "c2cc(F)c(F)cc2": ("C6H3F2", "3,4-difluorophenyl"),
    "c2cc(OC)c(OC)cc2": ("C8H9O2", "3,4-dimethoxyphenyl"),
    "c2c(C)cc(C)cc2": ("C8H9", "2,4-dimethylphenyl"),
    "c2ccc3ccccc3c2": ("C10H7", "naphthalen-2-yl"),
    "c2ccc3ccccc3n2": ("C9H6N", "quinolin-2-yl"),
    "c2ccccn2": ("C5H4N", "pyridin-2-yl"),
    "c2ncccn2": ("C4H3N2", "pyrimidin-2-yl"),
    "c2cncc(Cl)n2": ("C4H2ClN2", "6-chloropyrazin-2-yl"),
}

PIPERAZINE_NS = {
    "": ("H", None),
    "C": ("CH3", "methyl"),
    "CC": ("C2H5", "ethyl"),
    "CCC": ("C3H7", "propyl"),
    "CC(C)": ("C3H7", "propan-2-yl"),
    "c4ccccc4C": ("C7H7", "benzyl"),
    "C4CC4C": ("C4H7", "(cyclopropylmethyl)"),
    "C=CC": ("C3H5", "prop-2-en-1-yl"),
    "CC(C)C": ("C4H9", "2-methylpropyl"),
    "CCCC": ("C4H9", "butyl"),
}

TETRALIN_RING = {
    "ccc(O)c": ("C4H4O", [("7", "hydroxy")]),
    "cccc(O)": ("C4H4O", [("8", "hydroxy")]),
    "cc(O)cc": ("C4H4O", [("6", "hydroxy")]),
    "c(O)ccc": ("C4H4O", [("5", "hydroxy")]),
    "cccc": ("C4H4", []),
    "cc(O)c(O)c": ("C4H4O2", [("6", "hydroxy"), ("7", "hydroxy")]),
    "ccc(OC)c": ("C5H6O", [("7", "methoxy")]),
    "cccc(OC)": ("C5H6O", [("8", "methoxy")]),
    "cc(OC)cc": ("C5H6O", [("6", "methoxy")]),
    "c(OC)ccc": ("C5H6O", [("5", "methoxy")]),
    "cc(OC)c(OC)c": ("C6H8O2", [("6", "methoxy"), ("7", "methoxy")]),
    "ccc(F)c": ("C4H3F", [("7", "fluoro")]),
    "ccc(Cl)c": ("C4H3Cl", [("7", "chloro")]),
    "cc(Cl)cc": ("C4H3Cl", [("6", "chloro")]),
    "ccc(C)c": ("C5H6", [("7", "methyl")]),
    "ccc(Br)c": ("C4H3Br", [("7", "bromo")]),
    "c(O)ccc(O)": ("C4H4O2", [("5", "hydroxy"), ("8", "hydroxy")]),
    "cc(O)c(OC)c": ("C5H6O2", [("6", "hydroxy"), ("7", "methoxy")]),
}

TETRALIN_AMINES = {
    "N(CCC)CCC": ("C6H14N", "propyl", 2),
    "N(C)C": ("C2H6N", "methyl", 2),
    "N(CC)CC": ("C4H10N", "ethyl", 2),
    "NCCC": ("C3H8N", "propyl", 1),
    "NC": ("CH4N", "methyl", 1),
    "N": ("H2N", None, 0),
    "NCC": ("C2H6N", "ethyl", 1),
    "NCCCC": ("C4H10N", "butyl", 1),
    "N(CCCC)CCCC": ("C8H18N", "butyl", 2),
}

TETRALIN_METHYLS = {
    "": ("H", None),
    "C": ("CH3", "methyl"),
}

TETRALIN_A = {"5": "1", "6": "2", "7": "3", "8": "4", "AM": "6", "M": "5"}
TETRALIN_B = {"5": "4", "6": "3", "7": "2", "8": "1", "AM": "7", "M": "8"}


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


def name_piperazine(fam, v):
    aryl = fam["tables"]["AR"][v["AR"]][1]
    rname = fam["tables"]["R"][v["R"]][1]
    if rname is None:
        return "1-" + wrap(aryl) + "piperazine"
    first, second = aryl, rname
    if LETTERS.sub("", rname.lower()) < LETTERS.sub("", aryl.lower()):
        first, second = rname, aryl
    return "1-" + wrap(first) + "-4-" + wrap(second) + "piperazine"


def amino_prefix(nm, count):
    if count == 0:
        return "amino"
    if count == 1:
        return "(" + nm + "amino)"
    return "(" + MULT[count] + nm + "amino)"


def name_tetralin(fam, v):
    ring = fam["tables"]["AR"][v["AR"]][1]
    mname = fam["tables"]["M"][v["M"]][1]
    nm, count = fam["tables"]["AM"][v["AM"]][1], fam["tables"]["AM"][v["AM"]][2]
    ols = [p for p, label in ring if label == "hydroxy"]
    if not ols:
        items = [(p, wrap(label)) for p, label in ring]
        if mname is not None:
            items.append(("1", mname))
        for _ in range(count):
            items.append(("N", nm))
        return join(collapse(items), "1,2,3,4-tetrahydronaphthalen-2-amine")

    options = []
    for tag, mp in (("A", TETRALIN_A), ("B", TETRALIN_B)):
        olset = sorted(int(mp[p]) for p in ols)
        rest = sorted([int(mp[p]) for p, label in ring if label != "hydroxy"]
                      + [int(mp["AM"])]
                      + ([int(mp["M"])] if mname is not None else []))
        options.append((olset, rest, tag, mp))
    options.sort(key=lambda opt: (opt[0], opt[1], opt[2]))
    olset, _, _, mp = options[0]

    items = [(mp[p], wrap(label)) for p, label in ring if label != "hydroxy"]
    items.append((mp["AM"], amino_prefix(nm, count)))
    if mname is not None:
        items.append((mp["M"], mname))
    locs = ",".join(str(x) for x in olset)
    if len(olset) == 1:
        stem = "5,6,7,8-tetrahydronaphthalen-" + locs + "-ol"
    else:
        stem = "5,6,7,8-tetrahydronaphthalene-" + locs + "-" + MULT[len(olset)] + "ol"
    return join(collapse(items), stem)


FAMILIES = [
    {
        "cls": "Arylpiperazine",
        "template": "{R}N1CCN(CC1){AR}",
        "nulls": {"R": "", "AR": "c2cc(Cl)ccc2"},
        "tables": {"R": PIPERAZINE_NS, "AR": PIPERAZINE_ARYLS},
        "name": name_piperazine,
        "target": 43,
        "anchors": {
            "mCPP": {},
            "pCPP": {"AR": "c2ccc(Cl)cc2"},
            "pFPP": {"AR": "c2ccc(F)cc2"},
            "TFMPP": {"AR": "c2cc(C(F)(F)F)ccc2"},
            "2-NP": {"AR": "c2ccc3ccccc3c2"},
            "Quipazine": {"AR": "c2ccc3ccccc3n2"},
        },
    },
    {
        "cls": "Aminotetralin",
        "template": "C1({AM})CCc2{AR}c2C1{M}",
        "nulls": {"AM": "N(CCC)CCC", "AR": "ccc(O)c", "M": ""},
        "tables": {"AM": TETRALIN_AMINES, "AR": TETRALIN_RING,
                   "M": TETRALIN_METHYLS},
        "name": name_tetralin,
        "target": 49,
        "anchors": {
            "8-OH-DPAT": {"AR": "cccc(O)"},
            "UH-232": {"AR": "cccc(OC)", "M": "C"},
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
        proven = len(fam["anchors"])
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
