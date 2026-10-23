# Derives homologue references on four antihistamine templates: the
# diarylpropylamines (chlorphenamine series), the benzhydrylpiperazines
# (cyclizine and hydroxyzine series), the benzocycloheptapyridinylidene
# piperidines (loratadine series) and the 10-aminoalkylphenothiazines
# (promethazine series).
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree, charge
# included. Templates reserve ring digits 1, 2, 4 and 5, so interpolated
# substituent rings use 3. Rows are skipped when their structure or their
# name is already stored.

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
    "C(C)C": ("C3H7", "propan-2-yl"),
    "CC(C)": ("C3H7", "propan-2-yl"),
    "CCCC": ("C4H9", "butyl"),
    "CC(C)C": ("C4H9", "2-methylpropyl"),
    "OCC": ("C2H5O", "2-hydroxyethyl"),
    "COCC": ("C3H7O", "2-methoxyethyl"),
    "C3CC3C": ("C4H7", "cyclopropylmethyl"),
    "c3ccccc3C": ("C7H7", "benzyl"),
    "c3ccccc3CC": ("C8H9", "2-phenylethyl"),
    "c3ccccc3": ("C6H5", "phenyl"),
    "c3ccccn3": ("C5H4N", "pyridin-2-yl"),
    "c3cccnc3": ("C5H4N", "pyridin-3-yl"),
    "c3ccc(Cl)cc3": ("C6H4Cl", "4-chlorophenyl"),
    "c3ccc(F)cc3": ("C6H4F", "4-fluorophenyl"),
    "c3ccc(Br)cc3": ("C6H4Br", "4-bromophenyl"),
    "c3ccc(C)cc3": ("C7H7", "4-methylphenyl"),
    "c3ccc(OC)cc3": ("C7H7O", "4-methoxyphenyl"),
    "c3cccs3": ("C4H3S", "thiophen-2-yl"),
    "CN(C)CC": ("C4H10N", "2-(dimethylamino)ethyl"),
    "CN(C)CCC": ("C5H12N", "3-(dimethylamino)propyl"),
    "CN(C)C(C)C": ("C5H12N", "2-(dimethylamino)propyl"),
    "CN(C)CC(C)C": ("C6H14N", "3-(dimethylamino)-2-methylpropyl"),
    "CCN(CC)CC": ("C6H14N", "2-(diethylamino)ethyl"),
    "CCN(CC)CCC": ("C7H16N", "3-(diethylamino)propyl"),
    "C3CCCN3CC": ("C6H12N", "2-pyrrolidin-1-ylethyl"),
    "C3CCCN3CCC": ("C7H14N", "3-pyrrolidin-1-ylpropyl"),
    "C3CCCCN3CCC": ("C8H16N", "3-piperidin-1-ylpropyl"),
    "(Cl)": ("Cl", "chloro"),
    "(F)": ("F", "fluoro"),
    "(Br)": ("Br", "bromo"),
    "(C)": ("CH3", "methyl"),
    "(OC)": ("CH3O", "methoxy"),
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

def aryl_parts(loc, names):
    first, second = sorted(names, key=lambda t: LETTERS.sub("", t.lower()))
    if first == second:
        mult = "bis(%s)" % first if "-" in first else "di" + first
        return [pref(first, loc + "," + loc + "-" + mult)]
    return [pref(first, loc + "-" + enclose(first)),
            pref(second, loc + "-" + enclose(second))]


def name_propylamine(v):
    parts = aryl_parts("3", [group_name(v["AR1"]), group_name(v["AR2"])])
    parts += collapse([("N", group_name(v["NA"])), ("N", group_name(v["NB"]))])
    return join(parts, "propan-1-amine")


def name_piperazine(v):
    aryls = sorted([group_name(v["AR1"]), group_name(v["AR2"])],
                   key=lambda t: LETTERS.sub("", t.lower()))
    if aryls[0] == aryls[1]:
        core = "benzhydryl" if aryls[0] == "phenyl" \
            else "[bis(%s)methyl]" % aryls[0]
    else:
        core = "[%s-%smethyl]" % (enclose(aryls[0]), enclose(aryls[1]))
    return join(collapse([("1", core), ("4", group_name(v["R"]))]),
                "piperazine")


def name_tricyclic(v):
    pip = "piperidin-4-ylidene" if not v["R"] \
        else "1-" + group_name(v["R"]) + "piperidin-4-ylidene"
    items = []
    if v["X"]:
        items.append(("8", group_name(v["X"])))
    items.append(("11", "(" + pip + ")"))
    items.sort(key=lambda t: int(t[0]))
    return join(collapse(items),
                "6,11-dihydro-5H-benzo[5,6]cyclohepta[1,2-b]pyridine")


def name_phenothiazine(v):
    items = []
    if v["X"]:
        items.append(("2", group_name(v["X"])))
    items.append(("10", "[" + group_name(v["SIDE"]) + "]"))
    items.sort(key=lambda t: int(t[0]))
    return join(collapse(items), "10H-phenothiazine")


PALKYLS = ["C", "CC", "CCC", "CC(C)", "CCCC", "CC(C)C"]

BALKYLS = ["C", "CC", "CCC", "C(C)C", "CCCC", "CC(C)C"]

ARYLS = ["c3ccccc3", "c3ccc(Cl)cc3", "c3ccccn3", "c3ccc(F)cc3",
         "c3ccc(C)cc3", "c3ccc(Br)cc3", "c3ccc(OC)cc3", "c3cccnc3",
         "c3cccs3"]

RGROUPS = ["C", "CC", "CCC", "CC(C)", "CCCC", "c3ccccc3C", "OCC", "COCC",
           "c3ccccc3CC", "C3CC3C"]

SIDES = ["CN(C)CCC", "CN(C)C(C)C", "CN(C)CC(C)C", "CN(C)CC", "CCN(CC)CC",
         "CCN(CC)CCC", "C3CCCN3CC", "C3CCCN3CCC", "C3CCCCN3CCC"]

HALO = ["", "(Cl)", "(F)", "(C)", "(Br)", "(OC)"]

FAMILIES = [
    {
        "cls": "Antihistamine",
        "template": "{NA}N({NB})CCC({AR1}){AR2}",
        "nulls": {"NA": "C", "NB": "C", "AR1": "c3ccc(Cl)cc3",
                  "AR2": "c3ccccn3"},
        "slots": {
            "NA": PALKYLS,
            "NB": BALKYLS,
            "AR1": ["c3ccc(Cl)cc3"] + [a for a in ARYLS
                                       if a != "c3ccc(Cl)cc3"],
            "AR2": ["c3ccccn3"] + [a for a in ARYLS if a != "c3ccccn3"],
        },
        "name": name_propylamine,
        "target": 10,
        "anchors": {
            "Chlorpheniramine": {},
            "Chlorphenamine": {"AR1": "c3ccccc3", "AR2": "c3ccc(Cl)cc3"},
        },
    },
    {
        "cls": "Antihistamine",
        "template": "{R}N1CCN(C({AR1}){AR2})CC1",
        "nulls": {"R": "C", "AR1": "c3ccccc3", "AR2": "c3ccccc3"},
        "slots": {"R": RGROUPS, "AR1": ARYLS, "AR2": ARYLS},
        "name": name_piperazine,
        "target": 10,
        "anchors": {
            "Cyclizine": {},
            "Hydroxyzine": {"R": "OCCOCC", "AR2": "c3ccc(Cl)cc3"},
            "Cetirizine": {"R": "OC(=O)COCC", "AR2": "c3ccc(Cl)cc3"},
        },
    },
    {
        "cls": "Antihistamine",
        "template": "{R}N1CCC(=C2c4ccc{X}cc4CCc4cccnc42)CC1",
        "nulls": {"R": "", "X": "(Cl)"},
        "slots": {
            "R": [""] + RGROUPS,
            "X": ["(Cl)"] + [h for h in HALO if h != "(Cl)"],
        },
        "name": name_tricyclic,
        "target": 8,
        "anchors": {
            "Loratadine": {"R": "CCOC(=O)"},
            "Rupatadine": {"R": "Cc3cccnc3C"},
        },
    },
    {
        "cls": "Antihistamine",
        "template": "{SIDE}N1c4ccccc4Sc4ccc{X}cc41",
        "nulls": {"SIDE": "CN(C)CCC", "X": ""},
        "slots": {"SIDE": SIDES, "X": HALO},
        "name": name_phenothiazine,
        "target": 6,
        "anchors": {
            "Promethazine": {"SIDE": "CN(C)C(C)C"},
            "Alimemazine": {"SIDE": "CN(C)CC(C)C"},
            "Chlorpromazine": {"X": "(Cl)"},
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
