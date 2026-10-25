# Derives homologue references on the 7-acylamino-3-substituted cephem
# scaffold: one neutral family carrying the C2 carboxylic acid and one
# zwitterionic family whose C3 quaternary-ammonio methyl balances the C2
# carboxylate. Each family is proven against structures the library already
# stores by a stereo-stripped canonical-SMILES match, formulae are composed
# from the parent scaffold plus per-group differences and rechecked by RDKit,
# and rows whose structure or name is already stored are skipped. Templates
# reserve ring digits 1 and 2 for the cephem bicycle, so substituent rings
# use 3 upwards.

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
    "C=C": ("C2H3", "ethenyl"),
    "Cl": ("Cl", "chloro"),
    "OC": ("CH3O", "methoxy"),
    "COC": ("C2H5O", "(methoxymethyl)"),
    "COC(C)=O": ("C3H5O2", "[(acetyloxy)methyl]"),
    "COC(N)=O": ("C2H4NO2", "[(carbamoyloxy)methyl]"),
    "CSc3nnnn3C": ("C3H5N4S", "[(1-methyltetrazol-5-yl)sulfanylmethyl]"),
    "CSc3nnc(C)s3": ("C4H5N2S2",
                     "[(5-methyl-1,3,4-thiadiazol-2-yl)sulfanylmethyl]"),
    "CSc3nncs3": ("C3H3N2S2", "[(1,3,4-thiadiazol-2-yl)sulfanylmethyl]"),
    "CSc3cn[nH]n3": ("C3H4N3S", "[(1H-triazol-4-yl)sulfanylmethyl]"),
    "CSc3nnnn3CCN(C)C": ("C6H12N5S",
                         "[[1-[2-(dimethylamino)ethyl]tetrazol-5-yl]"
                         "sulfanylmethyl]"),
    "C[n+]3ccccc3": ("C6H7N", "(pyridin-1-ium-1-ylmethyl)"),
    "C[n+]3(C)CCCC3": ("C6H13N", "[(1-methylpyrrolidin-1-ium-1-yl)methyl]"),
    "C[n+]3ccc(C)cc3": ("C7H9N", "[(4-methylpyridin-1-ium-1-yl)methyl]"),
    "C[n+]3cccc(C)c3": ("C7H9N", "[(3-methylpyridin-1-ium-1-yl)methyl]"),
    "C[n+]3ccc(N)cc3": ("C6H8N2", "[(4-aminopyridin-1-ium-1-yl)methyl]"),
    "C[n+]3ccc(C(N)=O)cc3": ("C7H8N2O",
                             "[(4-carbamoylpyridin-1-ium-1-yl)methyl]"),
    "C[n+]3(CC)CCCC3": ("C7H15N", "[(1-ethylpyrrolidin-1-ium-1-yl)methyl]"),
    "C(N)c3ccccc3": ("C7H8N", "2-amino-2-phenylacetate"),
    "C(N)c3ccc(O)cc3": ("C7H8NO", "2-amino-2-(4-hydroxyphenyl)acetate"),
    "C(N)C3=CCCC=C3": ("C7H10N",
                       "2-amino-2-(cyclohexa-1,4-dien-1-yl)acetate"),
    "C(O)c3ccccc3": ("C7H7O", "2-hydroxy-2-phenylacetate"),
    "Cc3cccs3": ("C5H5S", "2-(thiophen-2-yl)acetate"),
    "Cc3csc(N)n3": ("C4H5N2S", "2-(2-amino-1,3-thiazol-4-yl)acetate"),
    "CSc3ccncc3": ("C6H6NS", "2-(pyridin-4-ylsulfanyl)acetate"),
    "CSCC#N": ("C3H4NS", "2-(cyanomethylsulfanyl)acetate"),
    "CC#N": ("C2H2N", "2-cyanoacetate"),
    "Cn3cnnn3": ("C2H3N4", "2-(tetrazol-1-yl)acetate"),
    "C(=NOC)c3csc(N)n3": ("C5H6N3OS",
                          "2-(2-amino-1,3-thiazol-4-yl)-2-methoxyiminoacetate"),
    "C(=NO)c3csc(N)n3": ("C4H4N3OS",
                         "2-(2-amino-1,3-thiazol-4-yl)-2-hydroxyiminoacetate"),
    "C(=NOCC(=O)O)c3csc(N)n3": ("C6H6N3O3S",
                                "2-(2-amino-1,3-thiazol-4-yl)-2-"
                                "(carboxymethoxyimino)acetate"),
    "C(=NOC)c3ccco3": ("C6H6NO2",
                       "2-(furan-2-yl)-2-methoxyiminoacetate"),
    "C(=NOC(C)(C)C(=O)O)c3csc(N)n3": (
        "C8H10N3O3S",
        "2-(2-amino-1,3-thiazol-4-yl)-2-(2-carboxypropan-2-yl)oxyiminoacetate"),
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


ACID_STEM = "8-oxo-5-thia-1-azabicyclo[4.2.0]oct-2-ene-2-carboxylic acid"

SALT_STEM = "8-oxo-5-thia-1-azabicyclo[4.2.0]oct-2-ene-2-carboxylate"


def cephem_parts(v):
    inner = acyl(group_name(v["ACYL"]))
    if "(" in inner:
        amide = "[[%s]amino]" % inner
    else:
        amide = "[%samino]" % enclose(inner)
    return collapse([("3", group_name(v["C3"])), ("7", amide)])


def name_cephem_acid(v):
    return join(cephem_parts(v), ACID_STEM)


def name_cephem_salt(v):
    return join(cephem_parts(v), SALT_STEM)


C3_NEUTRAL = ["C", "COC(C)=O", "CSc3nnnn3C", "C=C", "Cl", "OC", "COC",
              "CSc3nnc(C)s3", "CSc3nncs3", "CSc3cn[nH]n3", "COC(N)=O",
              "CSc3nnnn3CCN(C)C"]

C3_ONIUM = ["C[n+]3ccccc3", "C[n+]3(C)CCCC3", "C[n+]3ccc(C)cc3",
            "C[n+]3ccc(N)cc3", "C[n+]3cccc(C)c3", "C[n+]3(CC)CCCC3",
            "C[n+]3ccc(C(N)=O)cc3"]

ACYLS = ["C(N)c3ccccc3", "C(N)c3ccc(O)cc3", "C(N)C3=CCCC=C3",
         "C(=NOC)c3csc(N)n3", "Cc3cccs3", "C(=NO)c3csc(N)n3",
         "Cc3csc(N)n3", "C(O)c3ccccc3", "Cn3cnnn3", "CSCC#N",
         "CSc3ccncc3", "CC#N", "C(=NOCC(=O)O)c3csc(N)n3",
         "C(=NOC)c3ccco3"]

ONIUM_ACYLS = ["C(=NOC(C)(C)C(=O)O)c3csc(N)n3", "C(=NOC)c3csc(N)n3",
               "C(=NO)c3csc(N)n3", "C(=NOCC(=O)O)c3csc(N)n3",
               "C(=NOC)c3ccco3", "C(N)c3ccccc3", "Cc3cccs3"]

FAMILIES = [
    {
        "cls": "Cephalosporin",
        "template": "O=C(O)C1=C({C3})CSC2C(NC(=O){ACYL})C(=O)N12",
        "nulls": {"C3": "C", "ACYL": "C(N)c3ccccc3"},
        "slots": {"C3": C3_NEUTRAL, "ACYL": ACYLS},
        "name": name_cephem_acid,
        "target": 28,
        "anchors": {
            "Cefalexin": {},
            "Cefadroxil": {"ACYL": "C(N)c3ccc(O)cc3"},
            "Cephradine": {"ACYL": "C(N)C3=CCCC=C3"},
            "Cefroxadine": {"C3": "OC", "ACYL": "C(N)C3=CCCC=C3"},
            "Cefaclor": {"C3": "Cl"},
            "Cefalotin": {"C3": "COC(C)=O", "ACYL": "Cc3cccs3"},
            "Cefapirin": {"C3": "COC(C)=O", "ACYL": "CSc3ccncc3"},
            "Cefacetrile": {"C3": "COC(C)=O", "ACYL": "CC#N"},
            "Cefotaxime": {"C3": "COC(C)=O", "ACYL": "C(=NOC)c3csc(N)n3"},
            "Cefuroxime": {"C3": "COC(N)=O", "ACYL": "C(=NOC)c3ccco3"},
            "Cefamandole": {"C3": "CSc3nnnn3C", "ACYL": "C(O)c3ccccc3"},
            "Cefmenoxime": {"C3": "CSc3nnnn3C",
                            "ACYL": "C(=NOC)c3csc(N)n3"},
            "Cefotiam": {"C3": "CSc3nnnn3CCN(C)C", "ACYL": "Cc3csc(N)n3"},
            "Cefazolin": {"C3": "CSc3nnc(C)s3", "ACYL": "Cn3cnnn3"},
            "Ceftezole": {"C3": "CSc3nncs3", "ACYL": "Cn3cnnn3"},
            "Cefatrizine": {"C3": "CSc3cn[nH]n3",
                            "ACYL": "C(N)c3ccc(O)cc3"},
            "Cefpodoxime": {"C3": "COC", "ACYL": "C(=NOC)c3csc(N)n3"},
            "Cefixime": {"C3": "C=C", "ACYL": "C(=NOCC(=O)O)c3csc(N)n3"},
            "Cefdinir": {"C3": "C=C", "ACYL": "C(=NO)c3csc(N)n3"},
        },
    },
    {
        "cls": "Cephalosporin",
        "template": "O=C([O-])C1=C({C3})CSC2C(NC(=O){ACYL})C(=O)N12",
        "nulls": {"C3": "C[n+]3ccccc3",
                  "ACYL": "C(=NOC(C)(C)C(=O)O)c3csc(N)n3"},
        "slots": {"C3": C3_ONIUM, "ACYL": ONIUM_ACYLS},
        "name": name_cephem_salt,
        "target": 6,
        "anchors": {
            "Ceftazidime": {},
            "Cefepime": {"C3": "C[n+]3(C)CCCC3",
                         "ACYL": "C(=NOC)c3csc(N)n3"},
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
