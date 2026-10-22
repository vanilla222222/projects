# Derives homologue references on three arylacetic acid templates: the
# diphenylamine and diphenyl-ether acetic acids that carry diclofenac,
# fenclofenac and aceclofenac, the 1-acylindol-3-ylacetic acids that carry
# indometacin, cinmetacin and acemetacin, and the 5-aroylpyrrol-2-ylacetic
# acids that carry tolmetin and zomepirac.
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree. Rows whose
# structure or display name the library already stores are skipped.
# Templates reserve ring digits 1 and 2, so interpolated rings use 3 upwards.

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
    "CO": ("CH3O", "methoxy"),
    "CCO": ("C2H5O", "ethoxy"),
    "F": ("F", "fluoro"),
    "Cl": ("Cl", "chloro"),
    "Cc3ccccc3": ("C7H7", "benzyl"),
    "(C)": ("CH3", "methyl"),
    "(CC)": ("C2H5", "ethyl"),
    "(Cl)": ("Cl", "chloro"),
    "(c3ccccc3)": ("C6H5", "phenyl"),
    "N": ("NH", None),
    "O": ("O", None),
    "S": ("S", None),
    "N(C)": ("CH3N", None),
    "c3ccccc3": ("C6H5", "phenyl"),
    "c3ccc(Cl)cc3": ("C6H4Cl", "(4-chlorophenyl)"),
    "c3ccc(F)cc3": ("C6H4F", "(4-fluorophenyl)"),
    "c3ccc(C)cc3": ("C7H7", "(4-methylphenyl)"),
    "c3c(Cl)cccc3": ("C6H4Cl", "(2-chlorophenyl)"),
    "c3c(Cl)cccc3Cl": ("C6H3Cl2", "(2,6-dichlorophenyl)"),
    "c3ccc(Cl)cc3Cl": ("C6H3Cl2", "(2,4-dichlorophenyl)"),
    "c3c(F)cccc3F": ("C6H3F2", "(2,6-difluorophenyl)"),
    "c3c(C)cccc3C": ("C8H9", "(2,6-dimethylphenyl)"),
    "OC(=O)": ("CHO2", None),
    "NC(=O)": ("CH2NO", None),
    "ONC(=O)": ("CH2NO2", None),
    "OC(=O)COC(=O)": ("C3H3O4", None),
    "C(=O)O": ("CHO2", None),
    "C(=O)N": ("CH2NO", None),
    "C(=O)NO": ("CH2NO2", None),
    "C(=O)OCC(=O)O": ("C3H3O4", None),
    "C(=O)C": ("C2H3O", "acetyl"),
    "C(=O)c3ccccc3": ("C7H5O", "benzoyl"),
    "C(=O)c3ccc(Cl)cc3": ("C7H4ClO", "(4-chlorobenzoyl)"),
    "C(=O)c3ccc(F)cc3": ("C7H4FO", "(4-fluorobenzoyl)"),
    "C(=O)c3ccc(C)cc3": ("C8H7O", "(4-methylbenzoyl)"),
    "C(=O)c3ccc(OC)cc3": ("C8H7O2", "(4-methoxybenzoyl)"),
    "C(=O)C=Cc3ccccc3": ("C9H7O", "(3-phenylprop-2-enoyl)"),
    "O=C(c3ccccc3)": ("C7H5O", "benzoyl"),
    "O=C(c3ccc(Cl)cc3)": ("C7H4ClO", "(4-chlorobenzoyl)"),
    "O=C(c3ccc(F)cc3)": ("C7H4FO", "(4-fluorobenzoyl)"),
    "O=C(c3ccc(C)cc3)": ("C8H7O", "(4-methylbenzoyl)"),
    "O=C(c3ccc(OC)cc3)": ("C8H7O2", "(4-methoxybenzoyl)"),
    "O=C(c3cccs3)": ("C5H3OS", "(thiophene-2-carbonyl)"),
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


def wrap(text):
    if "(" not in text:
        return "(" + text + ")"
    if "[" not in text:
        return "[" + text + "]"
    return "{" + text + "}"


HEADS = {
    "OC(=O)": "2-%sacetic acid",
    "NC(=O)": "2-%sacetamide",
    "ONC(=O)": "N-hydroxy-2-%sacetamide",
    "OC(=O)COC(=O)": "2-[(2-%sacetyl)oxy]acetic acid",
    "C(=O)O": "2-%sacetic acid",
    "C(=O)N": "2-%sacetamide",
    "C(=O)NO": "N-hydroxy-2-%sacetamide",
    "C(=O)OCC(=O)O": "2-[(2-%sacetyl)oxy]acetic acid",
}


def aryloxy(name):
    if name.endswith("phenyl"):
        return name[:-2] + "oxy"
    if name.endswith("phenyl)"):
        return name[:-3] + "oxy)"
    return name + "oxy"


def linkage(x, aryl):
    if x == "O":
        text = aryloxy(aryl)
        return text if "(" in text else text
    if x == "S":
        text = aryl + "sulfanyl"
    elif x == "N":
        text = aryl + "amino"
    else:
        text = aryl + "(methyl)amino"
    return wrap(text)


def name_diarylamine(v):
    core = "2-" + linkage(v["X"], group_name(v["AR"])) + "phenyl"
    return HEADS[v["HEAD"]] % wrap(core)


def name_indoleacetic(v):
    items = []
    for loc, slot in (("1", "N1"), ("2", "R2"), ("5", "R5")):
        if v[slot]:
            items.append((loc, group_name(v[slot])))
    core = join(collapse(items), "1H-indol-3-yl")
    return HEADS[v["ACID"]] % wrap(core)


def name_pyrroleacetic(v):
    items = [("1", group_name(v["N1"]))]
    if v["R4"]:
        items.append(("4", group_name(v["R4"])))
    items.append(("5", group_name(v["ACYL"])))
    core = join(collapse(items), "pyrrol-2-yl")
    return "2-" + wrap(core) + "acetic acid"


FAMILIES = [
    {
        "cls": "Arylacetic acid NSAID",
        "template": "{HEAD}Cc1ccccc1{X}{AR}",
        "nulls": {"HEAD": "OC(=O)", "X": "N", "AR": "c3c(Cl)cccc3Cl"},
        "anchors": {
            "Diclofenac": {},
            "Fenclofenac": {"X": "O", "AR": "c3ccc(Cl)cc3Cl"},
            "Aceclofenac": {"HEAD": "OC(=O)COC(=O)"},
        },
        "slots": {
            "HEAD": ["OC(=O)", "NC(=O)", "ONC(=O)", "OC(=O)COC(=O)"],
            "X": ["N", "O", "S", "N(C)"],
            "AR": ["c3c(Cl)cccc3Cl", "c3ccc(Cl)cc3Cl", "c3ccccc3",
                   "c3ccc(Cl)cc3", "c3c(C)cccc3C", "c3c(Cl)cccc3",
                   "c3c(F)cccc3F", "c3ccc(F)cc3", "c3ccc(C)cc3"],
        },
        "target": 12,
        "name": name_diarylamine,
    },
    {
        "cls": "Arylacetic acid NSAID",
        "template": "{R5}c1ccc2c(c1)c(C{ACID})c{R2}n2{N1}",
        "nulls": {"R5": "CO", "ACID": "C(=O)O", "R2": "(C)",
                  "N1": "C(=O)c3ccc(Cl)cc3"},
        "anchors": {
            "Indomethacin": {},
            "Cinmetacin": {"N1": "C(=O)C=Cc3ccccc3"},
            "Acemetacin": {"ACID": "C(=O)OCC(=O)O"},
        },
        "slots": {
            "R5": ["CO", "", "C", "F", "Cl", "CCO"],
            "R2": ["(C)", "", "(CC)", "(c3ccccc3)"],
            "N1": ["C(=O)c3ccc(Cl)cc3", "C(=O)c3ccccc3", "C(=O)c3ccc(F)cc3",
                   "C(=O)C=Cc3ccccc3", "C(=O)c3ccc(C)cc3", "C(=O)C",
                   "C(=O)c3ccc(OC)cc3"],
            "ACID": ["C(=O)O", "C(=O)N", "C(=O)NO", "C(=O)OCC(=O)O"],
        },
        "target": 12,
        "name": name_indoleacetic,
    },
    {
        "cls": "Arylacetic acid NSAID",
        "template": "{ACYL}c1c{R4}cc(CC(=O)O)n1{N1}",
        "nulls": {"ACYL": "O=C(c3ccc(Cl)cc3)", "R4": "(C)", "N1": "C"},
        "anchors": {
            "Zomepirac": {},
            "Tolmetin": {"ACYL": "O=C(c3ccc(C)cc3)", "R4": ""},
        },
        "slots": {
            "ACYL": ["O=C(c3ccc(Cl)cc3)", "O=C(c3ccc(C)cc3)",
                     "O=C(c3ccccc3)", "O=C(c3ccc(F)cc3)",
                     "O=C(c3ccc(OC)cc3)", "O=C(c3cccs3)"],
            "R4": ["(C)", "", "(Cl)"],
            "N1": ["C", "CC", "Cc3ccccc3", "CCC"],
        },
        "target": 8,
        "name": name_pyrroleacetic,
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
    taken = set()
    seen = {}
    for m in ENTRY.finditer(lib):
        name, cls, formula, smiles = m.groups()
        stored[name] = smiles
        taken.add(name.lower())
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
            label = fam["name"](vals)
            if label.lower() in taken:
                skipped += 1
                continue
            seen[key] = "new"
            taken.add(label.lower())
            out.append("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
                       % (label, fam["cls"], stated, smiles))
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
