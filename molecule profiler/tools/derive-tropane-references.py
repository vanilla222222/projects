# Derives homologue references on two tropane templates: the
# 3-aryl-8-azabicyclo[3.2.1]octane-2-carboxylates (phenyltropanes) and the
# 8-azabicyclo[3.2.1]octan-3-yl esters.
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
    "C": ("CH3", None),
    "CC": ("C2H5", None),
    "CCC": ("C3H7", None),
    "CCCC": ("C4H9", None),
    "CC(C)": ("C3H7", None),
    "c3ccccc3": ("C6H5", "phenyl"),
    "c3ccc(F)cc3": ("C6H4F", "4-fluorophenyl"),
    "c3ccc(Cl)cc3": ("C6H4Cl", "4-chlorophenyl"),
    "c3ccc(Br)cc3": ("C6H4Br", "4-bromophenyl"),
    "c3ccc(I)cc3": ("C6H4I", "4-iodophenyl"),
    "c3ccc(C)cc3": ("C7H7", "4-methylphenyl"),
    "c3ccc(CC)cc3": ("C8H9", "4-ethylphenyl"),
    "c3ccc(OC)cc3": ("C7H7O", "4-methoxyphenyl"),
    "c3ccc(SC)cc3": ("C7H7S", "4-(methylsulfanyl)phenyl"),
    "c3ccc(C(F)(F)F)cc3": ("C7H4F3", "4-(trifluoromethyl)phenyl"),
    "c3ccc(C#N)cc3": ("C7H4N", "4-cyanophenyl"),
    "c3ccc(N)cc3": ("C6H6N", "4-aminophenyl"),
    "c3cccc(Cl)c3": ("C6H4Cl", "3-chlorophenyl"),
    "c3cccc(F)c3": ("C6H4F", "3-fluorophenyl"),
    "c3ccc(Cl)c(Cl)c3": ("C6H3Cl2", "3,4-dichlorophenyl"),
    "c3ccc(F)c(F)c3": ("C6H3F2", "3,4-difluorophenyl"),
    "C(=O)c3ccccc3": ("C7H5O", None),
    "C(=O)c3ccc(F)cc3": ("C7H4FO", None),
    "C(=O)c3ccc(Cl)cc3": ("C7H4ClO", None),
    "C(=O)c3ccc(C)cc3": ("C8H7O", None),
    "C(=O)c3ccc(OC)cc3": ("C8H7O2", None),
    "C(=O)C(O)c3ccccc3": ("C8H7O2", None),
    "C(=O)C(CO)c3ccccc3": ("C9H9O2", None),
    "C(=O)C(O)(c3ccccc3)c3ccccc3": ("C14H11O2", None),
    "C(=O)C3CCCCC3": ("C7H11O", None),
    "C(=O)CC": ("C3H5O", None),
    "C(=O)CCC": ("C4H7O", None),
    "C(=O)C(C)C": ("C4H7O", None),
    "C(=O)c3ccco3": ("C5H3O2", None),
    "C(=O)c3cccs3": ("C5H3OS", None),
    "C(c3ccccc3)c3ccccc3": ("C13H11", None),
}

EST = {"C": "methyl", "CC": "ethyl", "CCC": "propyl", "CC(C)": "propan-2-yl"}

NSUB = {"": None, "C": "methyl", "CC": "ethyl", "CCC": "propyl",
        "CCCC": "butyl", "CC(C)": "propan-2-yl"}

ESTER = {
    "C(=O)c3ccccc3": "benzoate",
    "C(=O)c3ccc(F)cc3": "4-fluorobenzoate",
    "C(=O)c3ccc(Cl)cc3": "4-chlorobenzoate",
    "C(=O)c3ccc(C)cc3": "4-methylbenzoate",
    "C(=O)c3ccc(OC)cc3": "4-methoxybenzoate",
    "C(=O)C(O)c3ccccc3": "2-hydroxy-2-phenylacetate",
    "C(=O)C(CO)c3ccccc3": "3-hydroxy-2-phenylpropanoate",
    "C(=O)C(O)(c3ccccc3)c3ccccc3": "2-hydroxy-2,2-diphenylacetate",
    "C(=O)C3CCCCC3": "cyclohexanecarboxylate",
    "C(=O)CC": "propanoate",
    "C(=O)CCC": "butanoate",
    "C(=O)C(C)C": "2-methylpropanoate",
    "C(=O)c3ccco3": "furan-2-carboxylate",
    "C(=O)c3cccs3": "thiophene-2-carboxylate",
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


def name_phenyltropane(v):
    ar = group_name(v["AR"])
    parts = [pref(ar, "3-" + enclose(ar))]
    ns = NSUB[v["NS"]]
    if ns is not None:
        parts.append(pref(ns, "8-" + ns))
    return "%s %s" % (EST[v["EST"]],
                      join(parts, "8-azabicyclo[3.2.1]octane-2-carboxylate"))


def name_tropanyl_ester(v):
    parts = []
    ns = NSUB[v["NS"]]
    if ns is not None:
        parts.append(pref(ns, "8-" + ns))
    core = join(parts, "8-azabicyclo[3.2.1]octan-3-yl")
    return "(%s) %s" % (core, ESTER[v["AC"]])


ARS = ["c3ccccc3", "c3ccc(F)cc3", "c3ccc(Cl)cc3", "c3ccc(C)cc3",
       "c3ccc(I)cc3", "c3ccc(Br)cc3", "c3ccc(OC)cc3", "c3ccc(CC)cc3",
       "c3ccc(C(F)(F)F)cc3", "c3ccc(C#N)cc3", "c3ccc(N)cc3",
       "c3ccc(SC)cc3", "c3cccc(Cl)c3", "c3cccc(F)c3",
       "c3ccc(Cl)c(Cl)c3", "c3ccc(F)c(F)c3"]

ACS = ["C(=O)c3ccccc3", "C(=O)c3ccc(F)cc3", "C(=O)c3ccc(Cl)cc3",
       "C(=O)c3ccc(C)cc3", "C(=O)c3ccc(OC)cc3", "C(=O)C(O)c3ccccc3",
       "C(=O)C(CO)c3ccccc3", "C(=O)C(O)(c3ccccc3)c3ccccc3",
       "C(=O)c3ccco3", "C(=O)c3cccs3", "C(=O)C3CCCCC3", "C(=O)CC",
       "C(=O)CCC", "C(=O)C(C)C"]

FAMILIES = [
    {
        "cls": "Tropane",
        "template": "{EST}OC(=O)C1C({AR})CC2CCC1N2{NS}",
        "nulls": {"EST": "C", "AR": "c3ccccc3", "NS": "C"},
        "slots": {"EST": ["C", "CC", "CCC", "CC(C)"], "AR": ARS,
                  "NS": ["C", "", "CC", "CCC"]},
        "anchors": {
            "Troparil": {"EST": "C", "AR": "c3ccccc3", "NS": "C"},
            "Beta-CFT": {"EST": "C", "AR": "c3ccc(F)cc3", "NS": "C"},
            "RTI-31": {"EST": "C", "AR": "c3ccc(Cl)cc3", "NS": "C"},
            "RTI-32": {"EST": "C", "AR": "c3ccc(C)cc3", "NS": "C"},
            "RTI-55": {"EST": "C", "AR": "c3ccc(I)cc3", "NS": "C"},
            "Dichloropane": {"EST": "C", "AR": "c3ccc(Cl)c(Cl)c3",
                             "NS": "C"},
        },
        "name": name_phenyltropane,
        "target": 10,
    },
    {
        "cls": "Tropane",
        "template": "{NS}N1C2CCC1CC(O{AC})C2",
        "nulls": {"NS": "C", "AC": "C(=O)c3ccccc3"},
        "slots": {"NS": ["C", "", "CC", "CCC", "CC(C)", "CCCC"],
                  "AC": ACS},
        "anchors": {
            "Tropacocaine": {"NS": "C", "AC": "C(=O)c3ccccc3"},
            "Nortropacocaine": {"NS": "", "AC": "C(=O)c3ccccc3"},
            "Tropine": {"NS": "C", "AC": ""},
            "Nortropine": {"NS": "", "AC": ""},
            "Homatropine": {"NS": "C", "AC": "C(=O)C(O)c3ccccc3"},
            "Tropanyl benzilate": {"NS": "C",
                                   "AC": "C(=O)C(O)(c3ccccc3)c3ccccc3"},
            "Etybenzatropine": {"NS": "CC",
                                "AC": "C(c3ccccc3)c3ccccc3"},
        },
        "name": name_tropanyl_ester,
        "target": 12,
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
            built = flat(fam["template"].format(**vals))
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
