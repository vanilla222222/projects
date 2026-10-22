# Derives systematic homologue references for the aryloxypropanolamine
# beta-blocker scaffold and for the two local-anaesthetic scaffolds
# (the 2,6-dialkylanilide and the 4-substituted benzoate ester).
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group and reused across every row
# carrying it; RDKit then recomputes the formula from the assembled
# structure and the two must agree.

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
    "CC(C)": ("C3H7", "propan-2-yl"),
    "CC(C)(C)": ("C4H9", "tert-butyl"),
    "CC(C)C": ("C4H9", "2-methylpropyl"),
    "C1CCCC1": ("C5H9", "cyclopentyl"),
    "C1CCCCC1": ("C6H11", "cyclohexyl"),
    "c1ccccc1CC": ("C8H9", "2-phenylethyl"),
    "C(C)C": ("C3H7", "propan-2-yl"),
    "Cl": ("Cl", "chloro"),
    "F": ("F", "fluoro"),
    "OC": ("CH3O", "methoxy"),
    "c": ("CH", ""),
    "c(C)": ("C2H3", "methyl"),
    "c(CC)": ("C3H5", "ethyl"),
    "c(Cl)": ("CCl", "chloro"),
    "c(F)": ("CF", "fluoro"),
    "c(O)": ("CHO", "hydroxy"),
    "c(OC)": ("C2H3O", "methoxy"),
    "c(OCCC)": ("C4H7O", "propoxy"),
    "c(C#N)": ("C2N", "cyano"),
    "c(CO)": ("C2H3O", "hydroxymethyl"),
    "c(CCOC)": ("C4H7O", "2-methoxyethyl"),
    "c(CC(N)=O)": ("C3H4NO", "2-amino-2-oxoethyl"),
    "c(NC(C)=O)": ("C3H4NO", "acetamido"),
    "c(C(N)=O)": ("C2H2NO", "carbamoyl"),
    "c(CCC(=O)OC)": ("C5H7O2", "3-methoxy-3-oxopropyl"),
    "c(N)": ("CH2N", "amino"),
    "c(NC)": ("C2H4N", "(methylamino)"),
    "c(NCC)": ("C3H6N", "(ethylamino)"),
    "c(NCCC)": ("C4H8N", "(propylamino)"),
    "c(NCCCC)": ("C5H10N", "(butylamino)"),
    "c(NCCCCC)": ("C6H12N", "(pentylamino)"),
    "c(N(C)C)": ("C3H6N", "(dimethylamino)"),
    "CCN(CC)C": ("C5H12N", ""),
    "CN1CCCCC1": ("C6H12N", ""),
    "CCN1CCCCC1": ("C7H14N", ""),
    "CCCN1CCCCC1": ("C8H16N", ""),
    "CCCCN1CCCCC1": ("C9H18N", ""),
    "CCCCCN1CCCCC1": ("C10H20N", ""),
    "CN1CCCC1": ("C5H10N", ""),
    "CCCN1CCCC1": ("C7H14N", ""),
    "CCCCN1CCCC1": ("C8H16N", ""),
    "CCCN(CC)C(CC)": ("C7H16N", ""),
    "CCCNC(C)": ("C4H10N", ""),
    "CCNC(C)": ("C3H8N", ""),
    "CCCCNC(C)": ("C5H12N", ""),
    "CN(C)C": ("C3H8N", ""),
    "CCN(CC)": ("C4H10N", "diethylamino"),
    "CN(C)": ("C2H6N", "dimethylamino"),
    "CCCN(CCC)": ("C6H14N", "dipropylamino"),
    "CCCCN(CCCC)": ("C8H18N", "dibutylamino"),
    "CC(C)N(C(C)C)": ("C6H14N", "di(propan-2-yl)amino"),
    "C1CCCCN1": ("C5H10N", "piperidin-1-yl"),
    "C1CCCN1": ("C4H8N", "pyrrolidin-1-yl"),
    "C1COCCN1": ("C4H8NO", "morpholin-4-yl"),
}

ANILIDE_AM = {
    "CCN(CC)C": ("2-(diethylamino)", "acetamide"),
    "CN(C)C": ("2-(dimethylamino)", "acetamide"),
    "CN1CCCCC1": ("1-methyl", "piperidine-2-carboxamide"),
    "CCN1CCCCC1": ("1-ethyl", "piperidine-2-carboxamide"),
    "CCCN1CCCCC1": ("1-propyl", "piperidine-2-carboxamide"),
    "CCCCN1CCCCC1": ("1-butyl", "piperidine-2-carboxamide"),
    "CCCCCN1CCCCC1": ("1-pentyl", "piperidine-2-carboxamide"),
    "CN1CCCC1": ("1-methyl", "pyrrolidine-2-carboxamide"),
    "CCCN1CCCC1": ("1-propyl", "pyrrolidine-2-carboxamide"),
    "CCCCN1CCCC1": ("1-butyl", "pyrrolidine-2-carboxamide"),
    "CCCN(CC)C(CC)": ("2-[ethyl(propyl)amino]", "butanamide"),
    "CCCNC(C)": ("2-(propylamino)", "propanamide"),
    "CCNC(C)": ("2-(ethylamino)", "propanamide"),
    "CCCCNC(C)": ("2-(butylamino)", "propanamide"),
}

MULT = {2: "di", 3: "tri"}

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


def aryl_name(pairs):
    best = None
    for option in (pairs, [(8 - locant, sub) for locant, sub in pairs]):
        by = {}
        for locant, sub in option:
            if not sub:
                continue
            by.setdefault(sub, []).append(locant)
        if not by:
            return "phenyl"
        key = tuple(tuple(sorted(by[sub])) for sub in sorted(by))
        if best is None or key < best[0]:
            best = (key, by)
    by = best[1]
    parts = []
    for sub in sorted(by):
        locs = sorted(by[sub])
        parts.append("%s-%s%s" % (",".join(str(x) for x in locs),
                                  MULT.get(len(locs), ""), sub))
    return "-".join(parts) + "phenyl"


def enclose(text):
    if any(c in text for c in "-,") or text.startswith("("):
        return text if text.startswith("(") else "(" + text + ")"
    return text


def name_blocker(v):
    ring = "phenoxy" if v["P4"] == "c" else "[4-%sphenoxy]" % enclose(group_name(v["P4"]))
    return "1-%s-3-(%samino)propan-2-ol" % (ring, group_name(v["AM"]))


def name_anilide(v):
    head, tail = ANILIDE_AM[v["AM"]]
    aryl = aryl_name([(2, group_name(v["P2"])), (4, group_name(v["P4"])),
                      (6, group_name(v["P6"]))])
    return "%s-N-(%s)%s" % (head, aryl, tail)


def name_ester(v):
    ring = "benzoate" if v["P4"] == "c" else "4-%sbenzoate" % group_name(v["P4"])
    return "2-(%s)ethyl %s" % (group_name(v["AM"]), ring)


FAMILIES = [
    {
        "cls": "Beta blocker",
        "template": "{AM}NCC(O)COc9cc{P4}cc9",
        "nulls": {"AM": "C", "P4": "c"},
        "slots": {
            "AM": ["CC(C)", "CC(C)(C)", "CC", "CCC", "CCCC", "CC(C)C",
                   "C1CCCC1", "C1CCCCC1", "c1ccccc1CC"],
            "P4": ["c(CCOC)", "c(CC(N)=O)", "c(NC(C)=O)", "c(C(N)=O)",
                   "c(CCC(=O)OC)", "c(C)", "c(CC)", "c(Cl)", "c(F)", "c(OC)",
                   "c(C#N)", "c(CO)", "c"],
        },
        "anchors": {"Atenolol": {"AM": "CC(C)", "P4": "c(CC(N)=O)"},
                    "Metoprolol": {"AM": "CC(C)", "P4": "c(CCOC)"},
                    "Practolol": {"AM": "CC(C)", "P4": "c(NC(C)=O)"},
                    "Esmolol": {"AM": "CC(C)", "P4": "c(CCC(=O)OC)"}},
        "name": name_blocker,
        "target": 10,
    },
    {
        "cls": "Local anesthetic",
        "template": "{AM}C(=O)Nc9c({P2})c{P4}cc9{P6}",
        "nulls": {"AM": "CCN(CC)C", "P2": "C", "P4": "c", "P6": "C"},
        "slots": {
            "AM": sorted(ANILIDE_AM),
            "P2": ["C", "CC", "Cl", "F", "OC", "C(C)C"],
            "P4": ["c", "c(C)", "c(Cl)", "c(F)", "c(OC)", "c(C#N)"],
            "P6": ["C", "CC", "Cl", "F", "OC"],
        },
        "anchors": {"Lidocaine": {"AM": "CCN(CC)C", "P2": "C", "P4": "c", "P6": "C"},
                    "Mepivacaine": {"AM": "CN1CCCCC1", "P2": "C", "P4": "c",
                                    "P6": "C"},
                    "Bupivacaine": {"AM": "CCCCN1CCCCC1", "P2": "C", "P4": "c",
                                    "P6": "C"},
                    "Ropivacaine": {"AM": "CCCN1CCCCC1", "P2": "C", "P4": "c",
                                    "P6": "C"},
                    "Etidocaine": {"AM": "CCCN(CC)C(CC)", "P2": "C", "P4": "c",
                                   "P6": "C"}},
        "name": name_anilide,
        "target": 8,
    },
    {
        "cls": "Local anesthetic",
        "template": "{AM}CCOC(=O)c9cc{P4}cc9",
        "nulls": {"AM": "CN(C)", "P4": "c"},
        "slots": {
            "AM": ["CCN(CC)", "CN(C)", "CCCN(CCC)", "CCCCN(CCCC)",
                   "CC(C)N(C(C)C)", "C1CCCCN1", "C1CCCN1", "C1COCCN1"],
            "P4": ["c(N)", "c(NC)", "c(NCC)", "c(NCCC)", "c(NCCCC)",
                   "c(NCCCCC)", "c(N(C)C)", "c(OCCC)", "c(O)", "c(OC)",
                   "c(C)", "c(Cl)", "c"],
        },
        "anchors": {"Procaine": {"AM": "CCN(CC)", "P4": "c(N)"},
                    "Tetracaine": {"AM": "CN(C)", "P4": "c(NCCCC)"},
                    "Butacaine": None},
        "name": name_ester,
        "target": 9,
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
        smiles = smiles.replace("\\\\", "\\")
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
