# Derives homologue references on four phenethylamine-family templates:
# the 3,4,5-trisubstituted 2-arylethylamines and 1-arylpropan-2-amines
# (scaline series), the N-benzyl 2,5-dimethoxyphenethylamines, and the
# 2-amino-1-arylalkan-1-ones (cathinone series).
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
    "N": ("NH2", None),
    "CN": ("CH4N", None),
    "CCN": ("C2H6N", None),
    "CCCN": ("C3H8N", None),
    "CC(C)N": ("C3H8N", None),
    "CN(C)": ("C2H6N", None),
    "CCN(CC)": ("C4H10N", None),
    "C3CCCN3": ("C4H8N", None),
    "C3CCCCN3": ("C5H10N", None),
    "NC": ("CH4N", None),
    "N(C)C": ("C2H6N", None),
    "NCC": ("C2H6N", None),
    "CO": ("CH3O", "methoxy"),
    "CCO": ("C2H5O", "ethoxy"),
    "OC": ("CH3O", "methoxy"),
    "OCC": ("C2H5O", "ethoxy"),
    "OCCC": ("C3H7O", "propoxy"),
    "OCCCC": ("C4H9O", "butoxy"),
    "OC(C)C": ("C3H7O", "propan-2-yloxy"),
    "OCC(C)C": ("C4H9O", "2-methylpropoxy"),
    "OCC=C": ("C3H5O", "prop-2-en-1-yloxy"),
    "OCC(C)=C": ("C4H7O", "2-methylprop-2-en-1-yloxy"),
    "OCC3CC3": ("C4H7O", "cyclopropylmethoxy"),
    "OCCF": ("C2H4FO", "2-fluoroethoxy"),
    "OCCCF": ("C3H6FO", "3-fluoropropoxy"),
    "OCC(F)F": ("C2H3F2O", "2,2-difluoroethoxy"),
    "OCC(F)(F)F": ("C2H2F3O", "2,2,2-trifluoroethoxy"),
    "OC(F)F": ("CHF2O", "difluoromethoxy"),
    "OC(F)(F)F": ("CF3O", "trifluoromethoxy"),
    "SC": ("CH3S", "methylsulfanyl"),
    "SCC": ("C2H5S", "ethylsulfanyl"),
    "SCCC": ("C3H7S", "propylsulfanyl"),
    "SCCCC": ("C4H9S", "butylsulfanyl"),
    "SC(C)C": ("C3H7S", "propan-2-ylsulfanyl"),
    "C": ("CH3", "methyl"),
    "CC": ("C2H5", "ethyl"),
    "CCC": ("C3H7", None),
    "CCCC": ("C4H9", None),
    "CCCCC": ("C5H11", None),
    "CC(C)C": ("C4H9", None),
    "O": ("HO", "hydroxy"),
    "F": ("F", "fluoro"),
    "Cl": ("Cl", "chloro"),
    "Br": ("Br", "bromo"),
    "": ("H", ""),
    "c": ("CH", ""),
    "c(C)": ("C2H3", "methyl"),
    "c(CC)": ("C3H5", "ethyl"),
    "c(CCC)": ("C4H7", "propyl"),
    "c(CCCC)": ("C5H9", "butyl"),
    "c(C(C)C)": ("C4H7", "propan-2-yl"),
    "c(C(C)(C)C)": ("C5H9", "tert-butyl"),
    "c(F)": ("CF", "fluoro"),
    "c(Cl)": ("CCl", "chloro"),
    "c(Br)": ("CBr", "bromo"),
    "c(I)": ("CI", "iodo"),
    "c(OC)": ("C2H3O", "methoxy"),
    "c(SC)": ("C2H3S", "methylsulfanyl"),
    "c(SCC)": ("C3H5S", "ethylsulfanyl"),
    "c(SCCC)": ("C4H7S", "propylsulfanyl"),
    "c(SCCCC)": ("C5H9S", "butylsulfanyl"),
    "c(SC(C)C)": ("C4H7S", "propan-2-ylsulfanyl"),
    "c(C#N)": ("C2N", "cyano"),
    "c(C(F)(F)F)": ("C2F3", "trifluoromethyl"),
}

SCAL_N = {"N": None, "CN": ("methyl", "N-methyl"),
          "CN(C)": ("dimethyl", "N,N-dimethyl"),
          "CCN": ("ethyl", "N-ethyl"), "CCCN": ("propyl", "N-propyl")}

SCALB_N = {"N": None, "NC": ("methyl", "N-methyl"),
           "N(C)C": ("dimethyl", "N,N-dimethyl"),
           "NCC": ("ethyl", "N-ethyl")}

CATH_N = {"CN": ("methylamino", "(methylamino)"),
          "CCN": ("ethylamino", "(ethylamino)"),
          "CCCN": ("propylamino", "(propylamino)"),
          "CC(C)N": ("propanylamino", "(propan-2-ylamino)"),
          "CN(C)": ("dimethylamino", "(dimethylamino)"),
          "CCN(CC)": ("diethylamino", "(diethylamino)"),
          "C3CCCN3": ("pyrrolidinyl", "(pyrrolidin-1-yl)"),
          "C3CCCCN3": ("piperidinyl", "(piperidin-1-yl)"),
          "N": ("amino", "amino")}

CATH_AL = {"C": "propan-1-one", "CC": "butan-1-one", "CCC": "pentan-1-one",
           "CCCC": "hexan-1-one", "CCCCC": "heptan-1-one",
           "CC(C)C": "4-methylpentan-1-one"}

MULT = {2: "di", 3: "tri", 4: "tetra"}

ATOM = re.compile(r"([A-Z][a-z]?)(\d*)")


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


def aryl(prefixes):
    by = {}
    for locant, sub in prefixes:
        if not sub:
            continue
        by.setdefault(sub, []).append(locant)
    if not by:
        return "phenyl"
    parts = []
    for sub in sorted(by):
        locs = sorted(by[sub])
        parts.append("%s-%s%s" % (",".join(str(x) for x in locs),
                                  MULT.get(len(locs), ""), sub))
    return "-".join(parts) + "phenyl"


def enclose(text):
    return text if text == "phenyl" else "(" + text + ")"


LETTERS = re.compile(r"[^a-z]")


def pref(sub, text):
    return (LETTERS.sub("", sub.lower()), text)


def join(parts, stem):
    return "-".join(text for _, text in sorted(parts)) + stem


def trimethoxy(v):
    return aryl([(3, group_name(v["O3"])), (4, group_name(v["O4"])),
                 (5, group_name(v["O5"]))])


def name_scaline_a(v):
    ring = trimethoxy(v)
    parts = [pref(ring, "2-" + enclose(ring))]
    nsub = SCAL_N[v["N"]]
    if nsub is not None:
        parts.append(pref(nsub[0], nsub[1]))
    return join(parts, "ethan-1-amine")


def name_scaline_b(v):
    ring = trimethoxy(v)
    parts = [pref(ring, "1-" + enclose(ring))]
    nsub = SCALB_N[v["N"]]
    if nsub is not None:
        parts.append(pref(nsub[0], nsub[1]))
    return join(parts, "propan-2-amine")


def name_benzyl(v):
    ring = aryl([(2, "methoxy"), (4, group_name(v["R4"])), (5, "methoxy")])
    if v["BZ"] == "":
        benzyl = pref("phenylmethyl", "N-(phenylmethyl)")
    else:
        sub = group_name(v["BZ"])
        benzyl = pref(sub + "phenylmethyl",
                      "N-[(2-%sphenyl)methyl]" % sub)
    return join([pref(ring, "2-" + enclose(ring)), benzyl], "ethan-1-amine")


def name_cathinone(v):
    ring = aryl([(4, group_name(v["P4"]))])
    key, text = CATH_N[v["N"]]
    return join([pref(ring, "1-" + enclose(ring)), pref(key, "2-" + text)],
                CATH_AL[v["AL"]])


OXY = ["OC", "OCC", "OCCC", "OC(C)C", "OCC(C)C", "OCC=C", "OCC(C)=C",
       "OCC3CC3", "OCCF", "OCCCF", "OCC(F)F", "OCC(F)(F)F", "OC(F)F",
       "OC(F)(F)F", "SC", "SCC", "SCCC", "SCCCC", "SC(C)C", "OCCCC"]

R4S = ["c", "c(Br)", "c(Cl)", "c(I)", "c(F)", "c(C)", "c(CC)", "c(CCC)",
       "c(C(C)C)", "c(SC)", "c(SCC)", "c(SCCC)", "c(SC(C)C)", "c(C#N)",
       "c(C(F)(F)F)", "c(OC)", "c(CCCC)", "c(C(C)(C)C)", "c(SCCCC)"]

FAMILIES = [
    {
        "cls": "Scaline",
        "template": "{N}CCc1cc({O3})c({O4})c({O5})c1",
        "nulls": {"N": "N", "O3": "OC", "O4": "OCC", "O5": "OC"},
        "slots": {"N": ["N", "CN", "CN(C)", "CCN", "CCCN"],
                  "O3": OXY, "O4": OXY, "O5": OXY},
        "anchors": {
            "Escaline": {"N": "N", "O3": "OC", "O4": "OCC", "O5": "OC"},
            "Proscaline": {"N": "N", "O3": "OC", "O4": "OCCC", "O5": "OC"},
            "Isoproscaline": {"N": "N", "O3": "OC", "O4": "OC(C)C",
                              "O5": "OC"},
            "Allylescaline": {"N": "N", "O3": "OC", "O4": "OCC=C",
                              "O5": "OC"},
            "Metaescaline": {"N": "N", "O3": "OCC", "O4": "OC", "O5": "OC"},
            "4-Thiomescaline": {"N": "N", "O3": "OC", "O4": "SC", "O5": "OC"},
            "3-Thioescaline": {"N": "N", "O3": "SC", "O4": "OCC", "O5": "OC"},
            "5-Thioasymbescaline": {"N": "N", "O3": "OCC", "O4": "OCC",
                                    "O5": "SC"},
            "N-Methylmescaline": {"N": "CN", "O3": "OC", "O4": "OC",
                                  "O5": "OC"},
            "Trichocereine": {"N": "CN(C)", "O3": "OC", "O4": "OC",
                              "O5": "OC"},
            "Cyclopropylmescaline": {"N": "N", "O3": "OC", "O4": "OCC3CC3",
                                     "O5": "OC"},
        },
        "name": name_scaline_a,
        "target": 8,
    },
    {
        "cls": "Scaline",
        "template": "CC({N})Cc1cc({O3})c({O4})c({O5})c1",
        "nulls": {"N": "N", "O3": "OC", "O4": "OCC", "O5": "OC"},
        "slots": {"N": ["N", "NC", "N(C)C", "NCC"],
                  "O3": OXY, "O4": OXY, "O5": OXY},
        "anchors": {
            "3C-E": {"N": "N", "O3": "OC", "O4": "OCC", "O5": "OC"},
            "3C-P": {"N": "N", "O3": "OC", "O4": "OCCC", "O5": "OC"},
            "3C-AL": {"N": "N", "O3": "OC", "O4": "OCC=C", "O5": "OC"},
            "3C-MAL": {"N": "N", "O3": "OC", "O4": "OCC(C)=C", "O5": "OC"},
            "3C-DFE": {"N": "N", "O3": "OC", "O4": "OCC(F)F", "O5": "OC"},
            "3C-FP": {"N": "N", "O3": "OC", "O4": "OCCCF", "O5": "OC"},
        },
        "name": name_scaline_b,
        "target": 6,
    },
    {
        "cls": "N-Benzylphenethylamine",
        "template": "{BZ}c1ccccc1CNCCc2c(OC)c{R4}c(OC)c2",
        "nulls": {"BZ": "CO", "R4": "c(Br)"},
        "slots": {"BZ": ["CO", "O", "F", "", "C", "Cl", "Br"], "R4": R4S},
        "anchors": {
            "25B-NBOMe": {"BZ": "CO", "R4": "c(Br)"},
            "25C-NBOMe": {"BZ": "CO", "R4": "c(Cl)"},
            "25I-NBOMe": {"BZ": "CO", "R4": "c(I)"},
            "25E-NBOMe": {"BZ": "CO", "R4": "c(CC)"},
            "25T-NBOMe": {"BZ": "CO", "R4": "c(SC)"},
            "25H-NBOMe": {"BZ": "CO", "R4": "c"},
            "25CN-NBOMe": {"BZ": "CO", "R4": "c(C#N)"},
            "25B-NBOH": {"BZ": "O", "R4": "c(Br)"},
            "25B-NBF": {"BZ": "F", "R4": "c(Br)"},
            "25B-NB": {"BZ": "", "R4": "c(Br)"},
        },
        "name": name_benzyl,
        "target": 22,
    },
    {
        "cls": "Cathinone",
        "template": "{N}C({AL})C(=O)c1cc{P4}cc1",
        "nulls": {"N": "CN", "AL": "C", "P4": "c"},
        "slots": {
            "N": ["CN", "CCN", "CCCN", "CC(C)N", "CN(C)", "CCN(CC)",
                  "C3CCCN3", "C3CCCCN3", "N"],
            "AL": ["C", "CC", "CCC", "CCCC", "CCCCC", "CC(C)C"],
            "P4": ["c", "c(C)", "c(F)", "c(Cl)", "c(Br)", "c(OC)", "c(CC)",
                   "c(C(F)(F)F)", "c(C#N)", "c(SC)"],
        },
        "anchors": {
            "Methcathinone": {"N": "CN", "AL": "C", "P4": "c"},
            "Ethcathinone": {"N": "CCN", "AL": "C", "P4": "c"},
            "4-Methylethcathinone": {"N": "CCN", "AL": "C", "P4": "c(C)"},
            "4-Fluoromethcathinone": {"N": "CN", "AL": "C", "P4": "c(F)"},
            "4-Chloromethcathinone": {"N": "CN", "AL": "C", "P4": "c(Cl)"},
            "Buphedrone": {"N": "CN", "AL": "CC", "P4": "c"},
            "Pentedrone": {"N": "CN", "AL": "CCC", "P4": "c"},
            "Hexedrone": {"N": "CN", "AL": "CCCC", "P4": "c"},
            "Amfepramone": {"N": "CCN(CC)", "AL": "C", "P4": "c"},
            "Alpha-PVP": {"N": "C3CCCN3", "AL": "CCC", "P4": "c"},
            "Pyrovalerone": {"N": "C3CCCN3", "AL": "CCC", "P4": "c(C)"},
            "Cathinone": {"N": "N", "AL": "C", "P4": "c"},
        },
        "name": name_cathinone,
        "target": 25,
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
