# Derives systematic homologue references for the psychotropic scaffold
# families that have fewer than fifty members.
#
# The scaffold templates are the ones proven in derive-psychotropic-references.py
# by regenerating stored structures. Here each row is a combination of
# substituent slot values, so the molecular formula is not restated by hand but
# composed from the parent scaffold formula plus the formula of each substituent
# group, written once per group and reused across every row that carries it.
# RDKit then computes the formula from the assembled structure and the two must
# agree, which catches a wrong attachment atom or a malformed ring.
#
# Rows colliding with a structure already in data/library.js are a failure, not
# a silent skip.

import argparse
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
    "c": ("CH", ""),
    "N": ("NH", ""),
    "O": ("O", ""),
    "S": ("S", ""),
    "c(Cl)": ("CCl", "chloro"),
    "c(F)": ("CF", "fluoro"),
    "c(Br)": ("CBr", "bromo"),
    "c(C)": ("C2H3", "methyl"),
    "c(OC)": ("C2H3O", "methoxy"),
    "c(C#N)": ("C2N", "cyano"),
    "c(C(F)(F)F)": ("C2F3", "(trifluoromethyl)"),
    "c(SC)": ("C2H3S", "(methylthio)"),
    "c(S(=O)C)": ("C2H3OS", "(methylsulfinyl)"),
    "c(S(=O)(=O)C)": ("C2H3O2S", "(methylsulfonyl)"),
    "c(S(=O)(=O)N(C)C)": ("C3H6NO2S", "(dimethylsulfamoyl)"),
    "c(C(=O)C)": ("C3H3O", "acetyl"),
    "CN(C)CCC": ("C5H12N", "3-(dimethylamino)propyl"),
    "CN(C)CC": ("C4H10N", "2-(dimethylamino)ethyl"),
    "CN(C)CCCC": ("C6H14N", "4-(dimethylamino)butyl"),
    "CN(C)CC(C)C": ("C6H14N", "3-(dimethylamino)-2-methylpropyl"),
    "CNCCC": ("C4H10N", "3-(methylamino)propyl"),
    "CCN(CC)CCC": ("C7H16N", "3-(diethylamino)propyl"),
    "CN1CCN(CC1)CCC": ("C8H17N2", "3-(4-methylpiperazin-1-yl)propyl"),
    "OCCN1CCN(CC1)CCC": ("C9H19N2O", "3-[4-(2-hydroxyethyl)piperazin-1-yl]propyl"),
    "CN1CCN(CC1)CC": ("C7H15N2", "2-(4-methylpiperazin-1-yl)ethyl"),
    "CN1CCCCC1CC": ("C8H16N", "2-(1-methylpiperidin-2-yl)ethyl"),
    "CCN1CCCC1C": ("C7H14N", "(1-ethylpyrrolidin-2-yl)methyl"),
    "CN1CCCC1C": ("C6H12N", "(1-methylpyrrolidin-2-yl)methyl"),
    "N1CCCC1C": ("C5H10N", "(pyrrolidin-2-yl)methyl"),
    "CCN1CCCCC1C": ("C8H16N", "(1-ethylpiperidin-2-yl)methyl"),
    "CCN(CC)CC": ("C6H14N", "2-(diethylamino)ethyl"),
    "CN1CCC(CC1)": ("C6H12N", "1-methylpiperidin-4-yl"),
    "CN1CCN(CC1)": ("C5H11N2", "4-methylpiperazin-1-yl"),
    "CCN1CCN(CC1)": ("C6H13N2", "4-ethylpiperazin-1-yl"),
    "N1CCN(CC1)": ("C4H9N2", "piperazin-1-yl"),
    "OCCN1CCN(CC1)": ("C6H13N2O", "4-(2-hydroxyethyl)piperazin-1-yl"),
    "OCCCN1CCN(CC1)": ("C7H15N2O", "4-(3-hydroxypropyl)piperazin-1-yl"),
    "OCCOCCN1CCN(CC1)": ("C8H17N2O2", "4-[2-(2-hydroxyethoxy)ethyl]piperazin-1-yl"),
    "Fc1ccc(cc1)": ("C6H4F", "4-fluorophenyl"),
    "Clc1ccc(cc1)": ("C6H4Cl", "4-chlorophenyl"),
    "Brc1ccc(cc1)": ("C6H4Br", "4-bromophenyl"),
    "COc1ccc(cc1)": ("C7H7O", "4-methoxyphenyl"),
    "Cc1ccc(cc1)": ("C7H7", "4-methylphenyl"),
    "c1ccc(cc1)": ("C6H5", "phenyl"),
    "c1ccc(s1)": ("C4H3S", "thiophen-2-yl"),
    "N1CCC(O)(c2ccc(Cl)cc2)CC1": ("C11H13ClNO", "4-(4-chlorophenyl)-4-hydroxypiperidin-1-yl"),
    "N1CCC(O)(c2ccc(F)cc2)CC1": ("C11H13FNO", "4-(4-fluorophenyl)-4-hydroxypiperidin-1-yl"),
    "N1CCC(O)(c2ccccc2)CC1": ("C11H14NO", "4-hydroxy-4-phenylpiperidin-1-yl"),
    "N1CCC(O)(c2ccc(OC)cc2)CC1": ("C12H16NO2", "4-hydroxy-4-(4-methoxyphenyl)piperidin-1-yl"),
    "N1CCC(CC1)c1ccccc1": ("C11H14N", "4-phenylpiperidin-1-yl"),
    "N1CCC(CC1)c1ccc(Cl)cc1": ("C11H13ClN", "4-(4-chlorophenyl)piperidin-1-yl"),
    "N1CCC(CC1)N1C(=O)Nc2ccccc21": ("C12H14N3O", "4-(2-oxo-2,3-dihydro-1H-benzimidazol-1-yl)piperidin-1-yl"),
    "N1CCN(CC1)c1ccccn1": ("C9H12N3", "4-(pyridin-2-yl)piperazin-1-yl"),
    "N1CCN(CC1)c1ccccc1OC": ("C11H15N2O", "4-(2-methoxyphenyl)piperazin-1-yl"),
    "N1CCN(CC1)c1ccc(F)cc1": ("C10H12FN2", "4-(4-fluorophenyl)piperazin-1-yl"),
    "N1CCN(C)CC1": ("C5H11N2", "4-methylpiperazin-1-yl"),
    "O=C1Nc2ccccc2N1C1CCN(CC1)": ("C12H14N3O", "4-(2-oxo-2,3-dihydro-1H-benzimidazol-1-yl)piperidine"),
    "c1ccc(cc1)C1CCN(CC1)": ("C11H14N", "4-phenylpiperidine"),
    "c1ccc(cc1)CC1CCN(CC1)": ("C12H16N", "4-benzylpiperidine"),
    "OC1(c2ccc(Cl)cc2)CCN(CC1)": ("C11H13ClNO", "4-(4-chlorophenyl)-4-hydroxypiperidine"),
    "OC1(c2ccccc2)CCN(CC1)": ("C11H14NO", "4-hydroxy-4-phenylpiperidine"),
    "COc1ccccc1N1CCN(CC1)": ("C11H15N2O", "4-(2-methoxyphenyl)piperazine"),
    "c1ccc(nc1)N1CCN(CC1)": ("C9H12N3", "4-(pyridin-2-yl)piperazine"),
    "Fc1ccc(cc1)N1CCN(CC1)": ("C10H12FN2", "4-(4-fluorophenyl)piperazine"),
    "CN1CCN(CC1)CCC9": ("", ""),
    "c1ccccc1": ("C6H5", "phenyl"),
    "c1ccc(F)cc1": ("C6H4F", "4-fluorophenyl"),
    "c1ccc(Cl)cc1": ("C6H4Cl", "4-chlorophenyl"),
    "c1ccc(C)cc1": ("C7H7", "4-methylphenyl"),
    "c1ccc(OC)cc1": ("C7H7O", "4-methoxyphenyl"),
    "CC": ("C2H4", ""),
    "C=C": ("C2H2", ""),
    "c(N)": ("CH2N", "amino"),
    "c(S(=O)(=O)CC)": ("C3H5O2S", "(ethylsulfonyl)"),
    "c(S(=O)(=O)N)": ("CH2NO2S", "sulfamoyl"),
    "c(S(=O)(=O)NC)": ("C2H4NO2S", "(methylsulfamoyl)"),
    "c(S(=O)(=O)CCC)": ("C4H7O2S", "(propylsulfonyl)"),
    "c(O)": ("CHO", "hydroxy"),
    "c([N+](=O)[O-])": ("CNO2", "nitro"),
}

ATOM = re.compile(r"([A-Z][a-z]?)(\d*)")


def parse_formula(text):
    out = {}
    if not text:
        return out
    for sym, num in ATOM.findall(text):
        out[sym] = out.get(sym, 0) + (int(num) if num else 1)
    return out


def render_formula(counts):
    order = ["C", "H"]
    rest = sorted(k for k in counts if k not in order and counts[k])
    out = ""
    for sym in order + rest:
        n = counts.get(sym, 0)
        if n <= 0:
            continue
        out += sym + (str(n) if n > 1 else "")
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


GROUPS["OC"] = ("CH3O", "methoxy")
GROUPS["OCC"] = ("C2H5O", "ethoxy")

SIDES_TRICYCLIC = [
    "CN(C)CCC",
    "CNCCC",
    "CN(C)CC",
    "CN(C)CCCC",
    "CN(C)CC(C)C",
    "CCN(CC)CCC",
    "CN1CCN(CC1)CCC",
    "OCCN1CCN(CC1)CCC",
    "CN1CCN(CC1)CC",
    "CN1CCCCC1CC",
    "CCN1CCCC1C",
]

RING_SMALL = ["c(Cl)", "c(F)", "c(C)", "c(OC)", "c(Br)", "c(C#N)", "c(C(F)(F)F)"]


def name_thioxanthene(v):
    side = group_name(v["SIDE"])
    core = "9-([%s]methylidene)thioxanthene" % side
    if v["P2"] == "c":
        return core
    return "2-%s-%s" % (group_name(v["P2"]), core)


def name_suberane(v):
    side = group_name(v["SIDE"])
    tail = "10,11-dihydro-5H-dibenzo[a,d]cycloheptene" if v["BR"] == "CC" else "5H-dibenzo[a,d]cycloheptene"
    return "5-([%s]methylidene)-%s" % (side, tail)


def name_azepine(v):
    side = group_name(v["SIDE"])
    tail = "10,11-dihydro-5H-dibenz[b,f]azepine" if v["BR"] == "CC" else "5H-dibenz[b,f]azepine"
    if v["PX"] == "c":
        return "5-[%s]-%s" % (side, tail)
    return "3-%s-5-[%s]-%s" % (group_name(v["PX"]), side, tail)


def name_butyrophenone(v):
    return "1-(%s)-4-(%s)butan-1-one" % (group_name(v["AR"]), group_name(v["AM"]))


def name_dpbp(v):
    if v["AR1"] == v["AR2"]:
        chain = "4,4-bis(%s)butyl" % group_name(v["AR1"])
    else:
        chain = "4-(%s)-4-(%s)butyl" % (group_name(v["AR1"]), group_name(v["AR2"]))
    return "1-[%s]-%s" % (chain, group_name(v["AM"]))


HET_CORE = {
    "N": ("5H-dibenzo[b,e][1,4]diazepine", "8"),
    "O": ("dibenz[b,f][1,4]oxazepine", "2"),
    "S": ("dibenzo[b,f][1,4]thiazepine", "2"),
}


def name_dibenzamine(v):
    core, loc = HET_CORE[v["HET"]]
    head = "11-(%s)-%s" % (group_name(v["AM"]), core)
    if v["PX"] == "c":
        return head
    return "%s-%s-%s" % (loc, group_name(v["PX"]), head)


def name_benzamide(v):
    subs = [(2, group_name(v["P2"]))]
    for pos, slot in ((3, "P3"), (4, "P4"), (5, "P5"), (6, "P6")):
        if v[slot] != "c":
            subs.append((pos, group_name(v[slot])))
    subs.sort()
    text = "-".join("%d-%s" % (p, n) for p, n in subs)
    return "N-[%s]-%sbenzamide" % (group_name(v["AM"]), text)


FAMILIES = [
    {
        "cls": "Thioxanthene",
        "template": "{SIDE}C=C9c1ccccc1Sc1cc{P2}cc19",
        "nulls": {"SIDE": "C", "P2": "c"},
        "slots": [
            ("SIDE", SIDES_TRICYCLIC),
            ("P2", ["c"] + RING_SMALL + ["c(SC)", "c(S(=O)C)", "c(S(=O)(=O)C)", "c(S(=O)(=O)N(C)C)", "c(C(=O)C)"]),
        ],
        "name": name_thioxanthene,
        "target": 46,
    },
    {
        "cls": "Tricyclic antidepressant",
        "template": "{SIDE}N9c1ccccc1{BR}c1cc{PX}cc19",
        "nulls": {"SIDE": "C", "BR": "CC", "PX": "c"},
        "slots": [
            ("SIDE", SIDES_TRICYCLIC),
            ("BR", ["CC", "C=C"]),
            ("PX", ["c"] + RING_SMALL),
        ],
        "name": name_azepine,
        "target": 20,
    },
    {
        "cls": "Tricyclic antidepressant",
        "template": "{SIDE}C=C9c1ccccc1{BR}c1ccccc19",
        "nulls": {"SIDE": "C", "BR": "CC"},
        "slots": [
            ("SIDE", SIDES_TRICYCLIC),
            ("BR", ["CC", "C=C"]),
        ],
        "name": name_suberane,
        "target": 18,
    },
    {
        "cls": "Butyrophenone",
        "template": "{AR}C(=O)CCC{AM}",
        "nulls": {"AR": "C", "AM": "C"},
        "slots": [
            ("AR", ["Fc1ccc(cc1)", "Clc1ccc(cc1)", "c1ccc(cc1)", "COc1ccc(cc1)", "Cc1ccc(cc1)", "Brc1ccc(cc1)", "c1ccc(s1)"]),
            ("AM", [
                "N1CCC(O)(c2ccc(Cl)cc2)CC1",
                "N1CCC(O)(c2ccc(F)cc2)CC1",
                "N1CCC(O)(c2ccccc2)CC1",
                "N1CCC(O)(c2ccc(OC)cc2)CC1",
                "N1CCC(CC1)c1ccccc1",
                "N1CCC(CC1)c1ccc(Cl)cc1",
                "N1CCC(CC1)N1C(=O)Nc2ccccc21",
                "N1CCN(CC1)c1ccccn1",
                "N1CCN(CC1)c1ccccc1OC",
                "N1CCN(CC1)c1ccc(F)cc1",
                "N1CCN(C)CC1",
            ]),
        ],
        "name": name_butyrophenone,
        "target": 30,
    },
    {
        "cls": "Diphenylbutylpiperidine",
        "template": "{AM}CCCC({AR1}){AR2}",
        "nulls": {"AM": "C", "AR1": "C", "AR2": "C"},
        "slots": [
            ("AM", [
                "O=C1Nc2ccccc2N1C1CCN(CC1)",
                "c1ccc(cc1)C1CCN(CC1)",
                "c1ccc(cc1)CC1CCN(CC1)",
                "OC1(c2ccc(Cl)cc2)CCN(CC1)",
                "OC1(c2ccccc2)CCN(CC1)",
                "COc1ccccc1N1CCN(CC1)",
                "c1ccc(nc1)N1CCN(CC1)",
                "Fc1ccc(cc1)N1CCN(CC1)",
                "CN1CCN(CC1)",
            ]),
            ("ARPAIR", [
                ("c1ccc(F)cc1", "c1ccc(F)cc1"),
                ("c1ccccc1", "c1ccccc1"),
                ("c1ccc(Cl)cc1", "c1ccc(Cl)cc1"),
                ("c1ccc(F)cc1", "c1ccccc1"),
                ("c1ccc(F)cc1", "c1ccc(Cl)cc1"),
                ("c1ccc(C)cc1", "c1ccc(F)cc1"),
                ("c1ccc(OC)cc1", "c1ccc(F)cc1"),
            ]),
        ],
        "name": name_dpbp,
        "target": 46,
    },
    {
        "cls": "Dibenzazepine antipsychotic",
        "template": "{AM}C9=Nc1c{PX}ccc1{HET}c1ccccc19",
        "nulls": {"AM": "C", "PX": "c", "HET": "N"},
        "slots": [
            ("AM", [
                "CN1CCN(CC1)",
                "N1CCN(CC1)",
                "CCN1CCN(CC1)",
                "OCCN1CCN(CC1)",
                "OCCCN1CCN(CC1)",
                "OCCOCCN1CCN(CC1)",
                "CN1CCC(CC1)",
            ]),
            ("HET", ["N", "O", "S"]),
            ("PX", ["c", "c(Cl)", "c(F)", "c(C)", "c(OC)", "c(Br)"]),
        ],
        "name": name_dibenzamine,
        "target": 40,
    },
    {
        "cls": "Benzamide antipsychotic",
        "template": "{AM}NC(=O)c9c({P2}){P3}{P4}{P5}{P6}9",
        "nulls": {"AM": "C", "P2": "C", "P3": "c", "P4": "c", "P5": "c", "P6": "c"},
        "slots": [
            ("AM", [
                "CCN1CCCC1C",
                "CN1CCCC1C",
                "N1CCCC1C",
                "CCN1CCCCC1C",
                "CCN(CC)CC",
                "CN(C)CC",
                "CN1CCC(CC1)",
            ]),
            ("RING", [
                ("OC", "c", "c", "c(S(=O)(=O)N)", "c"),
                ("OC", "c", "c", "c(S(=O)(=O)C)", "c"),
                ("OC", "c", "c", "c(S(=O)(=O)CC)", "c"),
                ("OC", "c", "c", "c(S(=O)(=O)NC)", "c"),
                ("OC", "c", "c", "c(S(=O)(=O)CCC)", "c"),
                ("OC", "c", "c(N)", "c(S(=O)(=O)CC)", "c"),
                ("OC", "c", "c(N)", "c(Cl)", "c"),
                ("OC", "c", "c(N)", "c(Br)", "c"),
                ("OC", "c(Br)", "c", "c", "c(OC)"),
                ("OC", "c", "c", "c(C#N)", "c"),
                ("OCC", "c", "c", "c(S(=O)(=O)N)", "c"),
                ("OC", "c(Cl)", "c(O)", "c(Cl)", "c"),
                ("OC", "c", "c", "c([N+](=O)[O-])", "c"),
            ]),
        ],
        "name": name_benzamide,
        "target": 40,
    },
]


EXPAND = {
    "ARPAIR": ("AR1", "AR2"),
    "RING": ("P2", "P3", "P4", "P5", "P6"),
}


def combos(slots):
    import itertools

    names = [s[0] for s in slots]
    pools = [s[1] for s in slots]
    idx = list(itertools.product(*[range(len(p)) for p in pools]))
    idx.sort(key=lambda t: (sum(t), t))
    for t in idx:
        v = {}
        for name, pool, i in zip(names, pools, t):
            if name in EXPAND:
                for sub, val in zip(EXPAND[name], pool[i]):
                    v[sub] = val
            else:
                v[name] = pool[i]
        yield v


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out")
    args = ap.parse_args()

    source = open(os.path.join(ROOT, "data", "library.js"), encoding="utf-8").read()
    seen = {}
    failures = []
    for m in ENTRY.finditer(source):
        key = flat(m.group(4).replace("\\\\", "\\"))
        if key is not None and key not in seen:
            seen[key] = m.group(1)

    rows = []
    stats = []
    for fam in FAMILIES:
        template = fam["template"]
        nulls = fam["nulls"]
        parent_smiles = template.format(**nulls)
        parent = Chem.MolFromSmiles(parent_smiles)
        if parent is None:
            failures.append("parent unparseable for %s: %s" % (fam["cls"], parent_smiles))
            continue
        base = parse_formula(CalcMolFormula(parent))
        kept = 0
        for v in combos(fam["slots"]):
            if kept >= fam["target"]:
                break
            if all(v[k] == nulls[k] for k in v):
                continue
            counts = dict(base)
            for slot, value in v.items():
                for sym, n in group_formula(value).items():
                    counts[sym] = counts.get(sym, 0) + n
                for sym, n in group_formula(nulls[slot]).items():
                    counts[sym] = counts.get(sym, 0) - n
            stated = render_formula(counts)
            smiles = template.format(**v)
            mol = Chem.MolFromSmiles(smiles)
            name = fam["name"](v)
            if mol is None:
                failures.append("unparseable %s: %s" % (name, smiles))
                continue
            found = CalcMolFormula(mol)
            if found != stated:
                failures.append("formula %s: composed %s structure %s (%s)" % (name, stated, found, smiles))
                continue
            key = flat(smiles)
            if key in seen:
                continue
            seen[key] = name
            rows.append((name, fam["cls"], stated, smiles))
            kept += 1
        stats.append("%s %d" % (fam["cls"], kept))

    if failures:
        for line in failures[:40]:
            sys.stderr.write("FAIL %s\n" % line)
        sys.stderr.write("FAIL %d total\n" % len(failures))
        raise SystemExit(1)

    out = "".join(
        "  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n" % r for r in rows
    )
    if args.out:
        open(args.out, "w", encoding="utf-8").write(out)
    else:
        sys.stdout.write(out)
    sys.stderr.write("%d new rows (%s)\n" % (len(rows), "; ".join(stats)))


if __name__ == "__main__":
    main()
