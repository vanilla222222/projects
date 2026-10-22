# Derives systematic homologue references for two steroid ester series:
# the 17-acyloxypregn-4-ene-3,20-diones (progestins) and the
# 17-acyloxy-11-hydroxypregnane 3,20-diones (corticosteroids).
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree. Substituent
# rings use digits 5 and 6 so they cannot collide with the template core,
# which reserves 1 to 4.

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
    "CC(=O)": ("C2H3O", "acetyloxy"),
    "CCC(=O)": ("C3H5O", "propanoyloxy"),
    "CCCC(=O)": ("C4H7O", "butanoyloxy"),
    "CCCCC(=O)": ("C5H9O", "pentanoyloxy"),
    "CCCCCC(=O)": ("C6H11O", "hexanoyloxy"),
    "CCCCCCC(=O)": ("C7H13O", "heptanoyloxy"),
    "CCCCCCCC(=O)": ("C8H15O", "octanoyloxy"),
    "CC(C)C(=O)": ("C4H7O", "2-methylpropanoyloxy"),
    "CC(C)CC(=O)": ("C5H9O", "3-methylbutanoyloxy"),
    "C5CCCCC5C(=O)": ("C7H11O", "cyclohexanecarbonyloxy"),
    "c5ccccc5C(=O)": ("C7H5O", "benzoyloxy"),
    "CCOC(=O)": ("C3H5O2", "ethoxycarbonyloxy"),
    "CC": ("C2H4", ""),
    "CC(C)": ("C3H6", "methyl"),
    "CC(F)": ("C2H3F", "fluoro"),
    "CC(Cl)": ("C2H3Cl", "chloro"),
    "C=C": ("C2H2", ""),
    "C=C(C)": ("C3H4", "methyl"),
    "C=C(F)": ("C2HF", "fluoro"),
    "C=C(Cl)": ("C2HCl", "chloro"),
    "C": ("CH2", ""),
    "C(C)": ("C2H4", "methyl"),
    "": ("H", ""),
    "(C)": ("CH3", "methyl"),
    "(F)": ("F", "fluoro"),
    "(Cl)": ("Cl", "chloro"),
    "CO": ("CH3O", "hydroxy"),
    "CCl": ("CH2Cl", "chloro"),
    "CF": ("CH2F", "fluoro"),
    "CBr": ("CH2Br", "bromo"),
    "CS": ("CH3S", "sulfanyl"),
    "SCF": ("CH2FS", ""),
}

ATOM = re.compile(r"([A-Z][a-z]?)(\d*)")

MULT = {2: "di", 3: "tri", 4: "tetra"}


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
    return GROUPS[value][1]


def flat(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    Chem.RemoveStereochemistry(mol)
    return Chem.MolToSmiles(mol)


def collapse(prefixes):
    by = {}
    for locant, sub in prefixes:
        if not sub:
            continue
        by.setdefault(sub, []).append(locant)
    parts = []
    for sub in sorted(by):
        locs = sorted(by[sub])
        parts.append((sub, "%s-%s%s" % (",".join(str(x) for x in locs),
                                        MULT.get(len(locs), ""), sub)))
    return parts


def assemble(parts, stem, detached):
    parts = sorted(parts)
    head = "-".join(text for _, text in parts)
    if not head:
        return detached + stem
    joiner = "-" if detached else ""
    return head + joiner + detached + stem


def name_progestin(v):
    stem = "pregna-4,6-diene" if v["C6"].startswith("C=") else "pregn-4-ene"
    detached = "19-nor" if v["C10"] == "" else ""
    acyl = group_name(v["ACYL"])
    prefixes = collapse([(6, group_name(v["C6"]))])
    prefixes.append((acyl, "17-(%s)" % acyl))
    return assemble(prefixes, stem, detached) + "-3,20-dione"


def name_corticosteroid(v):
    stem = "pregna-1,4-diene" if v["A"] == "C=C" else "pregn-4-ene"
    prefixes = [(6, group_name(v["C6"])), (9, group_name(v["C9"])),
                (11, "hydroxy"), (16, group_name(v["C16"])),
                (21, group_name(v["C21"]))]
    acyl = group_name(v["ACYL"])
    parts = collapse(prefixes)
    parts.append((acyl, "17-(%s)" % acyl))
    return assemble(parts, stem, "") + "-3,20-dione"


FAMILIES = [
    {
        "cls": "Progestin",
        "template": "{ACYL}OC1(C(C)=O)CCC2C3{C6}C4=CC(=O)CCC4{C10}C3CCC21C",
        "nulls": {"ACYL": "CC(=O)", "C6": "CC", "C10": "(C)"},
        "slots": {
            "ACYL": ["CC(=O)", "CCC(=O)", "CCCC(=O)", "CCCCC(=O)",
                     "CCCCCC(=O)", "CCCCCCC(=O)", "CCCCCCCC(=O)",
                     "CC(C)C(=O)", "CC(C)CC(=O)", "C5CCCCC5C(=O)",
                     "c5ccccc5C(=O)"],
            "C6": ["CC", "CC(C)", "C=C(C)", "C=C(Cl)", "C=C", "CC(F)",
                   "CC(Cl)", "C=C(F)"],
            "C10": ["(C)", ""],
        },
        "anchors": {
            "Hydroxyprogesterone acetate": {"ACYL": "CC(=O)", "C6": "CC",
                                            "C10": "(C)"},
            "Hydroxyprogesterone caproate": {"ACYL": "CCCCCC(=O)", "C6": "CC",
                                             "C10": "(C)"},
            "Hydroxyprogesterone enanthate": {"ACYL": "CCCCCCC(=O)",
                                              "C6": "CC", "C10": "(C)"},
            "Medroxyprogesterone acetate": {"ACYL": "CC(=O)", "C6": "CC(C)",
                                            "C10": "(C)"},
            "Chlormadinone acetate": {"ACYL": "CC(=O)", "C6": "C=C(Cl)",
                                      "C10": "(C)"},
            "Nomegestrol acetate": {"ACYL": "CC(=O)", "C6": "C=C(C)",
                                    "C10": ""},
            "Gestonorone caproate": {"ACYL": "CCCCCC(=O)", "C6": "CC",
                                     "C10": ""},
        },
        "name": name_progestin,
        "target": 10,
    },
    {
        "cls": "Corticosteroid",
        "template": ("{ACYL}OC1(C(=O){C21}){C16}CC2C3{C6}C4=CC(=O){A}"
                     "C4(C)C3{C9}C(O)CC21C"),
        "nulls": {"ACYL": "CC(=O)", "C21": "CO", "C16": "C", "C6": "CC",
                  "A": "CC", "C9": ""},
        "slots": {
            "ACYL": ["CC(=O)", "CCC(=O)", "CCCC(=O)", "CCCCC(=O)",
                     "CC(C)C(=O)", "CC(C)CC(=O)", "CCCCCC(=O)",
                     "c5ccccc5C(=O)", "CCOC(=O)"],
            "C21": ["CO", "CCl", "CF", "CS", "CBr"],
            "C16": ["C", "C(C)"],
            "C6": ["CC", "CC(C)", "CC(F)"],
            "A": ["CC", "C=C"],
            "C9": ["", "(F)", "(Cl)"],
        },
        "anchors": {
            "Hydrocortisone butyrate": {"ACYL": "CCCC(=O)", "C21": "CO",
                                        "C16": "C", "C6": "CC", "A": "CC",
                                        "C9": ""},
            "Hydrocortisone valerate": {"ACYL": "CCCCC(=O)", "C21": "CO",
                                        "C16": "C", "C6": "CC", "A": "CC",
                                        "C9": ""},
            "Betamethasone valerate": {"ACYL": "CCCCC(=O)", "C21": "CO",
                                       "C16": "C(C)", "C6": "CC", "A": "C=C",
                                       "C9": "(F)"},
            "Clobetasol propionate": {"ACYL": "CCC(=O)", "C21": "CCl",
                                      "C16": "C(C)", "C6": "CC", "A": "C=C",
                                      "C9": "(F)"},
            "Fluticasone propionate": {"ACYL": "CCC(=O)", "C21": "SCF",
                                       "C16": "C(C)", "C6": "CC(F)",
                                       "A": "C=C", "C9": "(F)"},
        },
        "name": name_corticosteroid,
        "target": 10,
    },
]


def combos(slots):
    keys = sorted(slots)
    idx = [range(len(slots[k])) for k in keys]
    rows = sorted(itertools.product(*idx), key=lambda t: (sum(t), t))
    for t in rows:
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
            counts_f = dict(base)
            for k, v in vals.items():
                for sym, n in group_formula(v).items():
                    counts_f[sym] = counts_f.get(sym, 0) + n
                for sym, n in group_formula(fam["nulls"][k]).items():
                    counts_f[sym] = counts_f.get(sym, 0) - n
            stated = render_formula(counts_f)
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
