# Derives homologue references on three carbamate templates: the ring
# substituted aryl N-methylcarbamate insecticides (isoprocarb, propoxur,
# metolcarb and methiocarb series), the 2,2-dialkylpropane-1,3-diyl
# dicarbamate muscle relaxants (meprobamate, carisoprodol and tybamate
# series) and the meta substituted aryl N,N-dialkylcarbamate
# cholinesterase inhibitors (neostigmine and rivastigmine series).
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a stereo-stripped canonical-SMILES match.
# Molecular formulae are composed from the parent scaffold formula plus the
# formula of each substituent group, written once per group; RDKit then
# recomputes the formula from the assembled structure and the two must
# agree. Templates reserve ring digits 1 and 2, so interpolated rings use
# 3 upwards. Rows are skipped when their structure or their name is
# already stored.

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
    "CCCC": ("C4H9", "butyl"),
    "CCCCC": ("C5H11", "pentyl"),
    "CC(C)": ("C3H7", "propan-2-yl"),
    "C(C)C": ("C3H7", "propan-2-yl"),
    "C(C)CC": ("C4H9", "butan-2-yl"),
    "C(C)(C)C": ("C4H9", "tert-butyl"),
    "CC(C)C": ("C4H9", "2-methylpropyl"),
    "OC": ("CH3O", "methoxy"),
    "OC(C)C": ("C3H7O", "propan-2-yloxy"),
    "CSCC": ("C3H7S", "ethylsulfanylmethyl"),
    "SC": ("CH3S", "methylsulfanyl"),
    "Cl": ("Cl", "chloro"),
    "F": ("F", "fluoro"),
    "c3ccccc3": ("C6H5", "phenyl"),
    "C3CCCCC3": ("C6H11", "cyclohexyl"),
    "(C)": ("CH3", "methyl"),
    "(CC)": ("C2H5", "ethyl"),
    "(C(C)C)": ("C3H7", "propan-2-yl"),
    "(C(C)(C)C)": ("C4H9", "tert-butyl"),
    "(Cl)": ("Cl", "chloro"),
    "(F)": ("F", "fluoro"),
    "(OC)": ("CH3O", "methoxy"),
    "(SC)": ("CH3S", "methylsulfanyl"),
    "(N(C)C)": ("C2H6N", "dimethylamino"),
    "(C#N)": ("CN", "cyano"),
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

def plain(names):
    order = []
    byname = {}
    for nm in names:
        if nm not in byname:
            byname[nm] = 0
            order.append(nm)
        byname[nm] += 1
    parts = []
    for nm in order:
        n = byname[nm]
        parts.append(pref(nm, nm if n == 1 else MULT[n] + nm))
    return parts


def acyl(name):
    if name.endswith("carboxylate"):
        return name[:-len("carboxylate")] + "carbonyl"
    return name[:-3] + "yl"



RING_WAYS = (
    {"M3": "3", "P4": "4", "M5": "5", "O2": "6"},
    {"O2": "2", "M5": "3", "P4": "4", "M3": "5"},
)


def name_aryl_methylcarbamate(v):
    best = None
    for way in RING_WAYS:
        items = sorted(((way[k], group_name(v[k])) for k in way if v[k]),
                       key=lambda t: (t[0], LETTERS.sub("", t[1].lower())))
        score = (tuple(int(loc) for loc, _ in items),
                 tuple(LETTERS.sub("", nm.lower()) for _, nm in items))
        if best is None or score < best[0]:
            best = (score, items)
    ring = enclose(join(collapse(best[1]), "phenyl"))
    return ring + " N-methylcarbamate"


def name_propanediyl_dicarbamate(v):
    head = "carbamoyloxy" if not v["NA"] \
        else "(%scarbamoyloxy)" % group_name(v["NA"])
    items = [("2", group_name(v["R2"])), ("2", group_name(v["R1"])),
             ("3", head)]
    chain = join(collapse(items), "propyl")
    tail = "carbamate" if not v["NB"] \
        else "N-%scarbamate" % group_name(v["NB"])
    return "[%s] %s" % (chain, tail)


def name_aryl_dialkylcarbamate(v):
    items = []
    if v["M3"]:
        items.append(("3", group_name(v["M3"])))
    ring = enclose(join(collapse(items), "phenyl"))
    alkyls = plain([group_name(v["NA"]), "methyl"])
    if len(alkyls) == 1:
        tail = "N,N-" + alkyls[0][1] + "carbamate"
    else:
        tail = "-".join("N-" + text for _, text in sorted(alkyls)) + "carbamate"
    return "%s %s" % (ring, tail)


FAMILIES = [
    {
        "cls": "Carbamate",
        "template": "CNC(=O)Oc1cc{M3}c{P4}c{M5}c1{O2}",
        "nulls": {"M3": "", "P4": "", "M5": "", "O2": ""},
        "slots": {
            "O2": ["", "C(C)C", "C(C)CC", "OC(C)C", "CSCC", "C", "CC",
                   "C(C)(C)C", "Cl", "OC", "SC", "F"],
            "M3": ["", "(C)", "(CC)", "(C(C)C)", "(Cl)", "(OC)"],
            "P4": ["", "(SC)", "(C)", "(N(C)C)", "(C(C)(C)C)", "(Cl)",
                   "(F)", "(OC)"],
            "M5": ["", "(C)"],
        },
        "name": name_aryl_methylcarbamate,
        "target": 12,
        "anchors": {
            "Isoprocarb": {"O2": "C(C)C"},
            "Propoxur": {"O2": "OC(C)C"},
            "Fenobucarb": {"O2": "C(C)CC"},
            "Ethiofencarb": {"O2": "CSCC"},
            "Metolcarb": {"M3": "(C)"},
            "Methiocarb": {"M3": "(C)", "P4": "(SC)", "M5": "(C)"},
        },
    },
    {
        "cls": "Carbamate",
        "template": "{R2}C({R1})(COC(=O)N{NA})COC(=O)N{NB}",
        "nulls": {"R2": "CCC", "R1": "C", "NA": "", "NB": ""},
        "slots": {
            "NB": ["", "C(C)C", "CCCC", "CC", "C", "CCC", "C(C)(C)C",
                   "CC(C)C", "CCCCC", "c3ccccc3", "C3CCCCC3"],
            "NA": ["", "C", "CC"],
            "R2": ["CCC", "CC", "CCCC", "C", "CC(C)", "CCCCC"],
            "R1": ["C", "CC", "CCC"],
        },
        "name": name_propanediyl_dicarbamate,
        "target": 11,
        "anchors": {
            "Meprobamate": {},
            "Carisoprodol": {"NB": "C(C)C"},
            "Tybamate": {"NB": "CCCC"},
        },
    },
    {
        "cls": "Carbamate",
        "template": "{NA}N(C)C(=O)Oc1cccc{M3}c1",
        "nulls": {"NA": "C", "M3": ""},
        "slots": {
            "NA": ["C", "CC", "CCC", "CC(C)", "CCCC"],
            "M3": ["", "(C)", "(CC)", "(C(C)C)", "(C(C)(C)C)", "(N(C)C)",
                   "(SC)", "(OC)", "(Cl)", "(F)", "(C#N)"],
        },
        "name": name_aryl_dialkylcarbamate,
        "target": 8,
        "anchors": {
            "Neostigmine": {"M3": "([N+](C)(C)C)"},
            "Rivastigmine": {"NA": "CC", "M3": "(C(C)N(C)C)"},
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
