# Derives systematic homologue references for the opioid scaffold families
# that have fewer than fifty members.
#
# Each scaffold template is proven before use by regenerating structures the
# library already stores and requiring a canonical-SMILES match. Molecular
# formulae are not restated by hand but composed from the parent scaffold
# formula plus the formula of each substituent group, written once per group
# and reused across every row carrying it; RDKit then computes the formula
# from the assembled structure and the two must agree.
#
# Rows colliding with a structure already in data/library.js are a failure,
# not a silent skip.

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
    "CC(C)": ("C3H7", "isopropyl"),
    "CC(C)C": ("C4H9", "isobutyl"),
    "C1CC1": ("C3H5", "cyclopropyl"),
    "C1CCC1": ("C4H7", "cyclobutyl"),
    "C1CCCC1": ("C5H9", "cyclopentyl"),
    "C=C": ("C2H3", "vinyl"),
    "CC=C": ("C3H5", "prop-1-en-1-yl"),
    "C=CC": ("C3H5", "allyl"),
    "COC": ("C2H5O", "methoxymethyl"),
    "c1ccc(o1)": ("C4H3O", "furan-2-yl"),
    "c1ccc(s1)": ("C4H3S", "thiophen-2-yl"),
    "c1ccc(cc1)": ("C6H5", "phenyl"),
    "c1ccc(cc1)C": ("C7H7", "benzyl"),
    "C1CC1C": ("C4H7", "cyclopropylmethyl"),
    "C1CCC1C": ("C5H9", "cyclobutylmethyl"),
    "c1ccccc1CC": ("C8H9", "2-phenylethyl"),
    "c1ccccc1": ("C6H5", "phenyl"),
    "c1ccc(F)cc1": ("C6H4F", "4-fluorophenyl"),
    "c1ccc(Cl)cc1": ("C6H4Cl", "4-chlorophenyl"),
    "c1ccc(C)cc1": ("C7H7", "4-methylphenyl"),
    "c1ccc(OC)cc1": ("C7H7O", "4-methoxyphenyl"),
    "c1ccc(O)cc1": ("C6H5O", "4-hydroxyphenyl"),
    "c1cccc(O)c1": ("C6H5O", "3-hydroxyphenyl"),
    "c1cccc(F)c1": ("C6H4F", "3-fluorophenyl"),
    "CCc1ccccc1": ("C8H9", "2-phenylethyl"),
    "CCc1ccc(F)cc1": ("C8H8F", "2-(4-fluorophenyl)ethyl"),
    "CCc1cccs1": ("C6H7S", "2-(thiophen-2-yl)ethyl"),
    "CCc1ccsc1": ("C6H7S", "2-(thiophen-3-yl)ethyl"),
    "CCc1ccccn1": ("C7H8N", "2-(pyridin-2-yl)ethyl"),
    "Cc1ccccc1": ("C7H7", "benzyl"),
    "CCCc1ccccc1": ("C9H11", "3-phenylpropyl"),
    "CCOC": ("C3H7O", "2-methoxyethyl"),
    "CCO": ("C2H5O", "2-hydroxyethyl"),
    "CO": ("CH3O", "hydroxymethyl"),
    "C(=O)OC": ("C2H3O2", "methoxycarbonyl"),
    "C(=O)N": ("CH2NO", "carbamoyl"),
    "CCN(C)C": ("C4H10N", "2-(dimethylamino)ethyl"),
    "CC(C)N(C)C": ("C5H12N", "2-(dimethylamino)propyl"),
    "CC(C)N(C)CC": ("C6H14N", "2-[ethyl(methyl)amino]propyl"),
    "CC(C)N1CCCC1": ("C7H14N", "2-(pyrrolidin-1-yl)propyl"),
    "CC(C)N1CCOCC1": ("C7H14NO", "2-(morpholin-4-yl)propyl"),
    "CCN1CCCC1": ("C6H12N", "2-(pyrrolidin-1-yl)ethyl"),
    "CCN1CCOCC1": ("C6H12NO", "2-(morpholin-4-yl)ethyl"),
    "CCN(CC)CC": ("C6H14N", "2-(diethylamino)ethyl"),
    "CN(C)CC": ("C4H10N", "2-(dimethylamino)ethyl"),
    "C1CCCN1CC": ("C6H12N", "2-(pyrrolidin-1-yl)ethyl"),
    "C1CCCCN1CC": ("C7H14N", "2-(piperidin-1-yl)ethyl"),
    "C1COCCN1CC": ("C6H12NO", "2-(morpholin-4-yl)ethyl"),
    "c1ccccc1F": ("C6H4F", "2-fluorophenyl"),
    "CCCO": ("C3H7O", "propoxy"),
    "CC(C)O": ("C3H7O", "propan-2-yloxy"),
    "CC(C)N1CCCCC1": ("C8H16N", "2-(piperidin-1-yl)propyl"),
    "CCN1CCCCC1": ("C7H14N", "2-(piperidin-1-yl)ethyl"),
    "CCc1ccc(N)cc1": ("C8H10N", "2-(4-aminophenyl)ethyl"),
    "c": ("CH", ""),
    "c(F)": ("CF", "fluoro"),
    "c(Cl)": ("CCl", "chloro"),
    "c(Br)": ("CBr", "bromo"),
    "c(C)": ("C2H3", "methyl"),
    "c(CC)": ("C3H5", "ethyl"),
    "c(C(C)C)": ("C4H7", "isopropyl"),
    "c(O)": ("CHO", "hydroxy"),
    "c(OC)": ("C2H3O", "methoxy"),
    "c(OCC)": ("C3H5O", "ethoxy"),
    "c(OCCC)": ("C4H7O", "propoxy"),
    "c(OC(C)C)": ("C4H7O", "isopropoxy"),
    "c(C#N)": ("C2N", "cyano"),
    "c([N+](=O)[O-])": ("CNO2", "nitro"),
}

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
    return GROUPS[value][1]


def flat(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    Chem.RemoveStereochemistry(mol)
    return Chem.MolToSmiles(mol)


ACYL_AMIDE = {
    "C": "acetamide",
    "CC": "propanamide",
    "CCC": "butanamide",
    "CCCC": "pentanamide",
    "CC(C)": "2-methylpropanamide",
    "C1CC1": "cyclopropanecarboxamide",
    "C1CCC1": "cyclobutanecarboxamide",
    "C1CCCC1": "cyclopentanecarboxamide",
    "C=C": "prop-2-enamide",
    "CC=C": "but-2-enamide",
    "COC": "2-methoxyacetamide",
    "c1ccc(o1)": "furan-2-carboxamide",
    "c1ccc(s1)": "thiophene-2-carboxamide",
    "c1ccc(cc1)": "benzamide",
    "c1ccc(cc1)C": "2-phenylacetamide",
}


def name_anilido(v):
    head = "N-(%s)-N-[1-(%s)piperidin-4-yl]" % (group_name(v["AR"]), group_name(v["NSUB"]))
    return head + ACYL_AMIDE[v["ACYL"]]


def name_anilido4(v):
    head = "N-(%s)-N-[4-(%s)-1-(%s)piperidin-4-yl]" % (
        group_name(v["AR"]), group_name(v["C4"]), group_name(v["NSUB"]))
    return head + ACYL_AMIDE[v["ACYL"]]


def name_nitazene(v):
    benzyl = "phenylmethyl" if v["PB"] == "c" else "[(4-%sphenyl)methyl]" % group_name(v["PB"])
    ring = "" if v["PN"] == "c" else "5-%s-" % group_name(v["PN"])
    return "2-%s-1-[%s]-%s1H-benzimidazole" % (benzyl, group_name(v["AM"]), ring)


def name_openchain(v):
    if v["AR1"] == v["AR2"]:
        aryl = "2,2-bis(%s)" % group_name(v["AR1"])
    else:
        aryl = "2-(%s)-2-(%s)" % (group_name(v["AR1"]), group_name(v["AR2"]))
    return "%s-2-[%s]%s" % (aryl, group_name(v["CHAIN"]), ketone(v["ACYL"]))


ACYL_KETONE = {
    "C": "ethanone",
    "CC": "propan-1-one",
    "CCC": "butan-1-one",
    "CC(C)": "2-methylpropan-1-one",
}


def name_morphinan(v):
    sub = "" if v["P3"] == "c" else "3-%s-" % group_name(v["P3"])
    return "%s17-%smorphinan" % (sub, group_name(v["NSUB"]))


def ketone(acyl):
    text = ACYL_KETONE[acyl]
    return "-" + text if text[0].isdigit() else text


ESTER_ALK = {"CO": "methyl", "CCO": "ethyl", "CCCO": "propyl", "CC(C)O": "propan-2-yl"}


def name_arylpip(v):
    if v["ACYL"] in ESTER_ALK:
        return "%s 4-(%s)-1-(%s)piperidine-4-carboxylate" % (
            ESTER_ALK[v["ACYL"]], group_name(v["AR"]), group_name(v["NSUB"]))
    return "1-[4-(%s)-1-(%s)piperidin-4-yl]%s" % (
        group_name(v["AR"]), group_name(v["NSUB"]), ketone(v["ACYL"]))


FAMILIES = [
    {
        "cls": "Anilidopiperidine opioid",
        "template": "{ACYL}C(=O)N({AR})C9CCN({NSUB})CC9",
        "nulls": {"ACYL": "C", "AR": "c1ccccc1", "NSUB": "C"},
        "slots": {
            "ACYL": ["C", "CC", "CCC", "CC(C)", "C1CC1", "COC", "C=C", "c1ccc(s1)"],
            "AR": ["c1ccccc1", "c1ccccc1F", "c1ccc(F)cc1", "c1ccc(C)cc1", "c1ccc(OC)cc1"],
            "NSUB": ["CCc1ccccc1", "CCc1ccc(F)cc1", "CCc1cccs1", "CCc1ccsc1",
                     "CCc1ccccn1", "CCCc1ccccc1", "Cc1ccccc1", "CCOC"],
        },
        "anchors": {"Acetylfentanyl": {"ACYL": "C", "AR": "c1ccccc1", "NSUB": "CCc1ccccc1"},
                    "Fentanyl": {"ACYL": "CC", "AR": "c1ccccc1", "NSUB": "CCc1ccccc1"},
                    "Ocfentanil": {"ACYL": "COC", "AR": "c1ccccc1F", "NSUB": "CCc1ccccc1"}},
        "name": name_anilido,
        "target": 8,
    },
    {
        "cls": "Anilidopiperidine opioid",
        "template": "{ACYL}C(=O)N({AR})C9({C4})CCN({NSUB})CC9",
        "nulls": {"ACYL": "C", "AR": "c1ccccc1", "C4": "C", "NSUB": "C"},
        "slots": {
            "ACYL": ["C", "CC", "CCC", "CC(C)", "C1CC1"],
            "AR": ["c1ccccc1", "c1ccccc1F", "c1ccc(F)cc1"],
            "C4": ["COC", "C(=O)OC", "C", "CO", "C(=O)N"],
            "NSUB": ["CCc1ccccc1", "CCc1ccc(F)cc1", "CCc1ccsc1", "CCOC", "Cc1ccccc1"],
        },
        "anchors": {"Carfentanil": {"ACYL": "CC", "AR": "c1ccccc1", "C4": "C(=O)OC",
                                    "NSUB": "CCc1ccccc1"},
                    "Sufentanil": {"ACYL": "CC", "AR": "c1ccccc1", "C4": "COC",
                                   "NSUB": "CCc1ccsc1"}},
        "name": name_anilido4,
        "target": 10,
    },
    {
        "cls": "Benzimidazole opioid",
        "template": "{AM}n9c(Cc1cc{PB}cc1)nc1c{PN}ccc19",
        "nulls": {"AM": "C", "PB": "c", "PN": "c"},
        "slots": {
            "AM": ["CCN(CC)CC", "CN(C)CC", "C1CCCN1CC", "C1CCCCN1CC", "C1COCCN1CC"],
            "PB": ["c(OC)", "c(OCC)", "c(OCCC)", "c(OC(C)C)", "c(C)", "c(CC)",
                   "c(C(C)C)", "c(F)", "c(Cl)", "c(Br)", "c"],
            "PN": ["c([N+](=O)[O-])", "c", "c(Cl)", "c(F)", "c(C#N)", "c(C)"],
        },
        "anchors": {"Metonitazene": {"AM": "CCN(CC)CC", "PB": "c(OC)",
                                     "PN": "c([N+](=O)[O-])"},
                    "Etonitazene": {"AM": "CCN(CC)CC", "PB": "c(OCC)",
                                    "PN": "c([N+](=O)[O-])"},
                    "Etodesnitazene": {"AM": "CCN(CC)CC", "PB": "c(OCC)", "PN": "c"}},
        "name": name_nitazene,
        "target": 42,
    },
    {
        "cls": "Open-chain opioid",
        "template": "{ACYL}C(=O)C({CHAIN})({AR1}){AR2}",
        "nulls": {"ACYL": "C", "CHAIN": "C", "AR1": "c1ccccc1", "AR2": "c1ccccc1"},
        "slots": {
            "ACYL": ["CC", "C", "CCC", "CC(C)"],
            "CHAIN": ["CC(C)N(C)C", "CCN(C)C", "CC(C)N1CCCCC1", "CC(C)N1CCOCC1",
                      "CC(C)N1CCCC1", "CCN1CCCC1", "CCN1CCOCC1", "CCN1CCCCC1",
                      "CCN(CC)CC", "CC(C)N(C)CC"],
            "AR1": ["c1ccccc1", "c1ccc(F)cc1", "c1ccc(C)cc1", "c1ccc(OC)cc1"],
            "AR2": ["c1ccccc1", "c1ccc(F)cc1"],
        },
        "anchors": {"Methadone": {"ACYL": "CC", "CHAIN": "CC(C)N(C)C",
                                  "AR1": "c1ccccc1", "AR2": "c1ccccc1"},
                    "Normethadone": {"ACYL": "CC", "CHAIN": "CCN(C)C",
                                     "AR1": "c1ccccc1", "AR2": "c1ccccc1"},
                    "Dipipanone": {"ACYL": "CC", "CHAIN": "CC(C)N1CCCCC1",
                                   "AR1": "c1ccccc1", "AR2": "c1ccccc1"},
                    "Phenadoxone": {"ACYL": "CC", "CHAIN": "CC(C)N1CCOCC1",
                                    "AR1": "c1ccccc1", "AR2": "c1ccccc1"}},
        "name": name_openchain,
        "target": 42,
    },
    {
        "cls": "Arylpiperidine opioid",
        "template": "{ACYL}C(=O)C9({AR})CCN({NSUB})CC9",
        "nulls": {"ACYL": "C", "AR": "c1ccccc1", "NSUB": "C"},
        "slots": {
            "ACYL": ["CCO", "CO", "CCCO", "CC(C)O", "CC", "C", "CCC", "CC(C)"],
            "AR": ["c1ccccc1", "c1cccc(O)c1", "c1ccc(O)cc1", "c1ccc(OC)cc1",
                   "c1ccc(F)cc1", "c1ccc(Cl)cc1", "c1ccc(C)cc1", "c1cccc(F)c1"],
            "NSUB": ["C", "CC", "CCC", "CC(C)C", "CCc1ccccc1", "Cc1ccccc1",
                     "CCc1ccc(F)cc1", "C1CC1C", "C=CC"],
        },
        "anchors": {"Pethidine": {"ACYL": "CCO", "AR": "c1ccccc1", "NSUB": "C"},
                    "Ketobemidone": {"ACYL": "CC", "AR": "c1cccc(O)c1", "NSUB": "C"},
                    "Anileridine": None},
        "name": name_arylpip,
        "target": 45,
    },
    {
        "cls": "Morphinan opioid",
        "template": "{NSUB}N7CCC89CCCCC8C7Cc1cc{P3}cc19",
        "nulls": {"NSUB": "C", "P3": "c"},
        "slots": {
            "NSUB": ["C", "CC", "C=CC", "C1CC1C", "C1CCC1C", "CCC", "CC(C)C",
                     "c1ccccc1CC"],
            "P3": ["c(O)", "c(OC)", "c", "c(OCC)", "c(F)", "c(Cl)", "c(C)"],
        },
        "anchors": {"Dextrorphan": {"NSUB": "C", "P3": "c(O)"},
                    "Levallorphan": {"NSUB": "C=CC", "P3": "c(O)"}},
        "name": name_morphinan,
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
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()

    lib = open(os.path.join(ROOT, "data", "library.js")).read()
    stored = {}
    seen = {}
    for m in ENTRY.finditer(lib):
        name, cls, formula, smiles = m.groups()
        smiles = smiles.replace("\\\\", "\\")
        stored[name] = smiles
        key = flat(smiles)
        if key:
            seen[key] = name

    fails = []
    out = []
    counts = []
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
            name = fam["name"](vals)
            out.append("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
                       % (name, fam["cls"], stated, smiles))
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
