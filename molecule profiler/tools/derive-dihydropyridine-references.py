# Derives homologue references on two 1,4-dihydropyridine-3,5-dicarboxylate
# templates: the 2,6-dimethyl core of nifedipine and the 2-substituted
# (aminoalkoxymethyl) core of amlodipine.
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree.

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
    "C": ("CH3", "methyl"),
    "CC": ("C2H5", "ethyl"),
    "CCC": ("C3H7", "propyl"),
    "CCCC": ("C4H9", "butyl"),
    "CCCCC": ("C5H11", "pentyl"),
    "C(C)C": ("C3H7", "propan-2-yl"),
    "CC(C)C": ("C4H9", "2-methylpropyl"),
    "C(C)(C)C": ("C4H9", "tert-butyl"),
    "CCC(C)C": ("C5H11", "3-methylbutyl"),
    "CCOC": ("C3H7O", "2-methoxyethyl"),
    "CCOCC": ("C4H9O", "2-ethoxyethyl"),
    "CCCOC": ("C4H9O", "3-methoxypropyl"),
    "CC(C)=O": ("C3H5O", "2-oxopropyl"),
    "CC=Cc3ccccc3": ("C9H9", "3-phenylprop-2-enyl"),
    "Cc3ccccc3": ("C7H7", "benzyl"),
    "C3CCCC3": ("C5H9", "cyclopentyl"),
    "C3CCCCC3": ("C6H11", "cyclohexyl"),
    "CCN(C)C": ("C4H10N", "2-(dimethylamino)ethyl"),
    "CC(F)(F)F": ("C2H2F3", "2,2,2-trifluoroethyl"),
    "CC#N": ("C2H2N", "cyanomethyl"),
    "C#N": ("CN", "cyano"),
    "CO": ("CH3O", "hydroxymethyl"),
    "CN": ("CH4N", "aminomethyl"),
    "COC": ("C2H5O", "methoxymethyl"),
    "COCC": ("C3H7O", "ethoxymethyl"),
    "COCCN": ("C3H8NO", "2-aminoethoxymethyl"),
    "COCCNC": ("C4H10NO", "2-(methylamino)ethoxymethyl"),
    "COCCCN": ("C4H10NO", "3-aminopropoxymethyl"),
    "c5ccccc5": ("C6H5", "phenyl"),
    "c5ccccc5[N+](=O)[O-]": ("C6H4NO2", "2-nitrophenyl"),
    "c5cccc([N+](=O)[O-])c5": ("C6H4NO2", "3-nitrophenyl"),
    "c5ccc([N+](=O)[O-])cc5": ("C6H4NO2", "4-nitrophenyl"),
    "c5ccccc5Cl": ("C6H4Cl", "2-chlorophenyl"),
    "c5cccc(Cl)c5": ("C6H4Cl", "3-chlorophenyl"),
    "c5ccc(Cl)cc5": ("C6H4Cl", "4-chlorophenyl"),
    "c5cccc(Cl)c5Cl": ("C6H3Cl2", "2,3-dichlorophenyl"),
    "c5ccccc5F": ("C6H4F", "2-fluorophenyl"),
    "c5cccc(F)c5": ("C6H4F", "3-fluorophenyl"),
    "c5ccccc5Br": ("C6H4Br", "2-bromophenyl"),
    "c5cccc(Br)c5": ("C6H4Br", "3-bromophenyl"),
    "c5ccccc5C#N": ("C7H4N", "2-cyanophenyl"),
    "c5cccc(C#N)c5": ("C7H4N", "3-cyanophenyl"),
    "c5ccccc5C": ("C7H7", "2-methylphenyl"),
    "c5ccccc5OC": ("C7H7O", "2-methoxyphenyl"),
    "c5cccc6nonc56": ("C6H3N2O", "2,1,3-benzoxadiazol-4-yl"),
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


STEM = "1,4-dihydropyridine-3,5-dicarboxylate"


def esters(a, b):
    if a == b:
        return MULT[2] + a + " "
    parts = sorted([pref(a, a), pref(b, b)])
    return "3-%s 5-%s " % (enclose(parts[0][1]), enclose(parts[1][1]))


def esters_fixed(a, b):
    if a == b:
        return MULT[2] + a + " "
    return "3-%s 5-%s " % (enclose(a), enclose(b))


def name_dimethyl_dhp(v):
    items = [("2", "methyl"),
             ("4", enclose(group_name(v["AR"]))),
             ("6", "methyl")]
    return esters(group_name(v["E3"]), group_name(v["E5"])) + join(
        collapse(items), STEM)


def name_substituted_dhp(v):
    items = [("2", enclose(group_name(v["R2"]))),
             ("4", enclose(group_name(v["AR"]))),
             ("6", "methyl")]
    return esters_fixed(group_name(v["E3"]), group_name(v["E5"])) + join(
        collapse(items), STEM)


FAMILIES = [
    {
        "cls": "Dihydropyridine calcium blocker",
        "template": "O=C(O{E3})C1=C(C)NC(C)=C(C(=O)O{E5})C1{AR}",
        "nulls": {"E3": "C", "E5": "C", "AR": "c5cccc([N+](=O)[O-])c5"},
        "slots": {
            "E3": ["C", "CC", "CCOC", "C(C)C", "CC(C)C", "CCC",
                   "CC=Cc3ccccc3", "CCCC", "CC(C)=O", "C3CCCC3",
                   "CCN(C)C", "CCOCC", "C3CCCCC3", "CCC(C)C",
                   "Cc3ccccc3", "CCCOC", "C(C)(C)C", "CCCCC",
                   "CC(F)(F)F", "CC#N"],
            "E5": ["C", "CC", "C(C)C", "CC(C)C", "CCOC", "CCC",
                   "CCCC", "C3CCCC3"],
            "AR": ["c5cccc([N+](=O)[O-])c5", "c5ccccc5[N+](=O)[O-]",
                   "c5cccc(Cl)c5Cl", "c5ccccc5Cl", "c5cccc6nonc56",
                   "c5ccc([N+](=O)[O-])cc5", "c5cccc(Cl)c5",
                   "c5ccccc5F", "c5cccc(F)c5", "c5ccc(Cl)cc5",
                   "c5ccccc5C#N", "c5ccccc5C", "c5ccccc5OC",
                   "c5cccc(C#N)c5", "c5ccccc5Br", "c5cccc(Br)c5",
                   "c5ccccc5"],
        },
        "name": name_dimethyl_dhp,
        "target": 22,
        "anchors": {
            "Nifedipine": {"AR": "c5ccccc5[N+](=O)[O-]"},
            "Nitrendipine": {"E3": "CC"},
            "Nisoldipine": {"E5": "CC(C)C", "AR": "c5ccccc5[N+](=O)[O-]"},
            "Nimodipine": {"E3": "CCOC", "E5": "C(C)C"},
            "Felodipine": {"E3": "CC", "AR": "c5cccc(Cl)c5Cl"},
            "Isradipine": {"E5": "C(C)C", "AR": "c5cccc6nonc56"},
            "Darodipine": {"E3": "CC", "E5": "CC", "AR": "c5cccc6nonc56"},
            "Aranidipine": {"E5": "CC(C)=O", "AR": "c5ccccc5[N+](=O)[O-]"},
            "Pranidipine": {"E5": "CC=Cc3ccccc3"},
            "Cilnidipine": {"E3": "CCOC", "E5": "CC=Cc3ccccc3"},
            "Lacidipine": {"E3": "CC", "E5": "CC",
                           "AR": "c5ccccc5C=CC(=O)OC(C)(C)C"},
            "Clevidipine": {"E3": "COC(=O)CCC", "AR": "c5cccc(Cl)c5Cl"},
            "Nicardipine": {"E5": "CCN(C)Cc5ccccc5"},
            "Barnidipine": {"E5": "C5CCN(Cc6ccccc6)C5"},
            "Benidipine": {"E5": "C5CCCN(Cc6ccccc6)C5"},
            "Manidipine": {"E5": "CCN5CCN(C(c6ccccc6)c6ccccc6)CC5"},
            "Lercanidipine": {"E5": "C(C)(C)CN(C)CCC(c5ccccc5)c5ccccc5"},
        },
    },
    {
        "cls": "Dihydropyridine calcium blocker",
        "template": "O=C(O{E3})C1=C({R2})NC(C)=C(C(=O)O{E5})C1{AR}",
        "nulls": {"E3": "CC", "E5": "C", "R2": "COCCN",
                  "AR": "c5ccccc5Cl"},
        "slots": {
            "R2": ["COCCN", "COCCNC", "COCCCN", "C#N", "COC", "COCC",
                   "CO", "CN", "CC"],
            "E3": ["CC", "C", "C(C)C", "CCOC", "CCC", "CC(C)C"],
            "E5": ["C", "CC", "C(C)C", "CC(C)C"],
            "AR": ["c5ccccc5Cl", "c5cccc([N+](=O)[O-])c5",
                   "c5ccccc5[N+](=O)[O-]", "c5cccc(Cl)c5",
                   "c5ccccc5F", "c5cccc(Cl)c5Cl"],
        },
        "name": name_substituted_dhp,
        "target": 9,
        "anchors": {
            "Amlodipine": {},
            "Nilvadipine": {"R2": "C#N", "E3": "C", "E5": "C(C)C",
                            "AR": "c5cccc([N+](=O)[O-])c5"},
            "Nifedipine": {"R2": "C", "E3": "C", "E5": "C",
                           "AR": "c5ccccc5[N+](=O)[O-]"},
            "Nitrendipine": {"R2": "C", "E3": "CC", "E5": "C",
                             "AR": "c5cccc([N+](=O)[O-])c5"},
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
                for sym, n in group_formula(v).items():
                    tally[sym] = tally.get(sym, 0) + n
                for sym, n in group_formula(fam["nulls"][k]).items():
                    tally[sym] = tally.get(sym, 0) - n
            stated = render_formula(tally) + fam.get("charge", "")
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
