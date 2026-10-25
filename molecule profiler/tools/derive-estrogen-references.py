# Derives homologue references on four estrogen templates: the
# estra-1,3,5(10)-triene-3,17-diol 3-ethers and 17-esters (the estradiol
# series), the estra-1,3,5(10)-trien-17-ones (the estrone series), the
# ring-A-oxygenated estradiols (the catechol-oestrogen series) and the
# 3,4-bis(aryl)alkanes (the hexestrol series).
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a stereo-stripped canonical-SMILES match.
# Molecular formulae are composed from the parent scaffold formula plus the
# formula of each substituent group, written once per group; RDKit then
# recomputes the formula from the assembled structure and the two must
# agree. The templates reserve ring digits 1 and 2, so interpolated rings
# use 3 upwards. Rows are skipped when their structure or their name is
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
    "C": ("CH3", "methoxy"),
    "CC": ("C2H5", "ethoxy"),
    "C(C)C": ("C3H7", "propan-2-yloxy"),
    "C3CCCC3": ("C5H9", "cyclopentyloxy"),
    "C(=O)C": ("C2H3O", "acetyloxy"),
    "C(=O)CC": ("C3H5O", "propanoyloxy"),
    "C(=O)CCC": ("C4H7O", "butanoyloxy"),
    "C(=O)CCCC": ("C5H9O", "pentanoyloxy"),
    "C(=O)CCCCC": ("C6H11O", "hexanoyloxy"),
    "C(=O)CCCCCC": ("C7H13O", "heptanoyloxy"),
    "C(=O)CCCCCCCCCC": ("C11H21O", "undecanoyloxy"),
    "C(=O)C(C)C": ("C4H7O", "2-methylpropanoyloxy"),
    "C(=O)CC(C)C": ("C5H9O", "3-methylbutanoyloxy"),
    "C(=O)C3CCCCC3": ("C7H11O", "cyclohexanecarbonyloxy"),
    "C(=O)CCC3CCCC3": ("C8H13O", "3-cyclopentylpropanoyloxy"),
    "C(=O)c3ccccc3": ("C7H5O", "benzoyloxy"),
    "(C)": ("CH3", "methyl"),
    "(CC)": ("C2H5", "ethyl"),
    "(CCC)": ("C3H7", "propyl"),
    "(CCCC)": ("C4H9", "butyl"),
    "(C#C)": ("C2H", "ethynyl"),
    "(O)": ("HO", "hydroxy"),
    "(OC)": ("CH3O", "methoxy"),
    "(F)": ("F", "fluoro"),
    "(Cl)": ("Cl", "chloro"),
    "c3ccc(O)cc3": ("C6H5O", "4-hydroxyphenyl"),
    "c3ccc(O)c(C)c3": ("C7H7O", "4-hydroxy-3-methylphenyl"),
    "c3ccc(O)c(OC)c3": ("C7H7O2", "4-hydroxy-3-methoxyphenyl"),
    "c3ccc(OC)cc3": ("C7H7O", "4-methoxyphenyl"),
    "c3ccc(F)cc3": ("C6H4F", "4-fluorophenyl"),
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




ALKANE = {4: "butane", 5: "pentane", 6: "hexane", 7: "heptane", 8: "octane",
          9: "nonane", 10: "decane"}


def estratriene_stem(locs):
    if not locs:
        return "estra-1,3,5(10)-triene"
    tail = "ol" if len(locs) == 1 else MULT[len(locs)] + "ol"
    head = "estra-1,3,5(10)-trien" + ("" if tail[0] in "aeiou" else "e")
    return head + "-" + ",".join(locs) + "-" + tail


def name_estradiol_ester(v):
    items = []
    locs = []
    if v["X17"]:
        items.append(("17", enclose(group_name(v["X17"]))))
    if v["E3"]:
        items.append(("3", enclose(group_name(v["E3"]))))
    else:
        locs.append("3")
    if v["E17"]:
        items.append(("17", enclose(group_name(v["E17"]))))
    else:
        locs.append("17")
    items.sort(key=lambda t: int(t[0]))
    return join(collapse(items), estratriene_stem(locs))


def name_estrone(v):
    items = []
    if v["R2"]:
        items.append(("2", enclose(group_name(v["R2"]))))
    items.append(("3", enclose(group_name(v["E3"])) if v["E3"] else "hydroxy"))
    if v["R4"]:
        items.append(("4", enclose(group_name(v["R4"]))))
    if v["R16"]:
        items.append(("16", enclose(group_name(v["R16"]))))
    return join(collapse(items), "estra-1,3,5(10)-trien-17-one")


def name_estradiol_ring(v):
    items = []
    locs = ["3", "17"]
    for loc, key in (("2", "R2"), ("4", "R4")):
        if v[key] == "(O)":
            locs.append(loc)
        elif v[key]:
            items.append((loc, enclose(group_name(v[key]))))
    if v["X17"]:
        items.append(("17", enclose(group_name(v["X17"]))))
    items.sort(key=lambda t: int(t[0]))
    locs.sort(key=int)
    return join(collapse(items), estratriene_stem(locs))


def name_diarylalkane(v):
    a = v["RA"].count("C")
    b = v["RB"].count("C")
    ar1 = enclose(group_name(v["AR1"]))
    ar2 = enclose(group_name(v["AR2"]))
    if a < b or (a == b and pref(ar1, "")[0] <= pref(ar2, "")[0]):
        items = [(str(a + 1), ar1), (str(a + 2), ar2)]
    else:
        items = [(str(b + 1), ar2), (str(b + 2), ar1)]
    return join(collapse(items), ALKANE[a + b + 2])


ETHERS = ["", "C", "C(=O)C", "C3CCCC3", "CC", "C(=O)CC", "C(=O)c3ccccc3",
          "C(C)C"]

ESTERS = ["", "C(=O)CCCC", "C(=O)C", "C(=O)c3ccccc3", "C(=O)CCC3CCCC3",
          "C(=O)CCCCCC", "C(=O)CC", "C(=O)CCC", "C(=O)CCCCCCCCCC",
          "C(=O)CCCCC", "C(=O)C(C)C", "C(=O)CC(C)C", "C(=O)C3CCCCC3"]

C17 = ["", "(C#C)", "(C)", "(CC)"]

RING2 = ["", "(O)", "(OC)", "(C)", "(F)", "(Cl)"]

RING4 = ["", "(O)", "(OC)", "(C)", "(F)"]

C16 = ["", "(O)", "(C)"]

ALKYLS = ["(CC)", "(C)", "(CCC)", "(CCCC)"]

ARYLS = ["c3ccc(O)cc3", "c3ccc(O)c(C)c3", "c3ccc(OC)cc3",
         "c3ccc(O)c(OC)c3", "c3ccc(F)cc3"]

FAMILIES = [
    {
        "cls": "Estrogen",
        "template": "c12ccc(O{E3})cc1CCC1C2CCC2(C)C{X17}(O{E17})CCC12",
        "nulls": {"E3": "", "X17": "", "E17": ""},
        "slots": {"E3": ETHERS, "X17": C17, "E17": ESTERS},
        "name": name_estradiol_ester,
        "target": 12,
        "anchors": {
            "Estradiol": {},
            "Estradiol 3-methyl ether": {"E3": "C"},
            "Estradiol acetate": {"E17": "C(=O)C"},
            "Estradiol valerate": {"E17": "C(=O)CCCC"},
            "Estradiol enanthate": {"E17": "C(=O)CCCCCC"},
            "Estradiol benzoate": {"E17": "C(=O)c3ccccc3"},
            "Estradiol cypionate": {"E17": "C(=O)CCC3CCCC3"},
            "Estradiol undecylate": {"E17": "C(=O)CCCCCCCCCC"},
            "Estradiol dipropionate": {"E3": "C(=O)CC", "E17": "C(=O)CC"},
            "Ethinylestradiol": {"X17": "(C#C)"},
            "Mestranol": {"X17": "(C#C)", "E3": "C"},
            "Quinestrol": {"X17": "(C#C)", "E3": "C3CCCC3"},
        },
    },
    {
        "cls": "Estrogen",
        "template": "c12cc{R2}c(O{E3})c{R4}c1CCC1C2CCC2(C)C(=O)C{R16}CC12",
        "nulls": {"R2": "", "E3": "", "R4": "", "R16": ""},
        "slots": {"R2": RING2, "E3": ETHERS, "R4": RING4, "R16": C16},
        "name": name_estrone,
        "target": 8,
        "anchors": {
            "Estrone": {},
            "Estrone acetate": {"E3": "C(=O)C"},
            "2-Methoxyestrone": {"R2": "(OC)"},
            "16a-Hydroxyestrone": {"R16": "(O)"},
        },
    },
    {
        "cls": "Estrogen",
        "template": "c12cc{R2}c(O)c{R4}c1CCC1C2CCC2(C)C{X17}(O)CCC12",
        "nulls": {"R2": "", "R4": "", "X17": ""},
        "slots": {"R2": RING2, "R4": RING4, "X17": C17},
        "name": name_estradiol_ring,
        "target": 8,
        "anchors": {
            "Estradiol": {},
            "2-Hydroxyestradiol": {"R2": "(O)"},
            "2-Methoxyestradiol": {"R2": "(OC)"},
            "4-Hydroxyestradiol": {"R4": "(O)"},
            "4-Methoxyestradiol": {"R4": "(OC)"},
        },
    },
    {
        "cls": "Estrogen",
        "template": "C{RA}({AR1})C{RB}{AR2}",
        "nulls": {"RA": "(CC)", "RB": "(CC)", "AR1": "c3ccc(O)cc3",
                  "AR2": "c3ccc(O)cc3"},
        "slots": {"RA": ALKYLS, "RB": ALKYLS, "AR1": ARYLS, "AR2": ARYLS},
        "name": name_diarylalkane,
        "target": 5,
        "anchors": {
            "Hexestrol": {},
            "Promethestrol": {"AR1": "c3ccc(O)c(C)c3",
                              "AR2": "c3ccc(O)c(C)c3"},
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
