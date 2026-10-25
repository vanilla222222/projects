# Derives homologue references on two aromatase-inhibitor templates: the
# bis(aryl)(azol-1-yl)methanes (letrozole, vorozole, bifonazole and
# liarozole series) and the androst-4-ene-3,17-diones (formestane and
# androstenetrione series). Each template is proven against structures the
# library already stores by canonical-SMILES match, formulae are composed
# from the parent plus each substituent group and rechecked with RDKit, and
# rows whose structure or name is already stored are skipped.

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
    "c3ccc(C#N)cc3": ("C7H4N", "4-cyanophenyl"),
    "c3cccc(C#N)c3": ("C7H4N", "3-cyanophenyl"),
    "c3ccc(Cl)cc3": ("C6H4Cl", "4-chlorophenyl"),
    "c3cccc(Cl)c3": ("C6H4Cl", "3-chlorophenyl"),
    "c3ccc(F)cc3": ("C6H4F", "4-fluorophenyl"),
    "c3ccccc3": ("C6H5", "phenyl"),
    "c3ccc4[nH]cnc4c3": ("C7H5N2", "1H-benzimidazol-5-yl"),
    "c3ccc4c(c3)nnn4C": ("C7H6N3", "1-methylbenzotriazol-5-yl"),
    "c3ccc(-c4ccccc4)cc3": ("C12H9", "4-phenylphenyl"),
    "c3ccc(C)cc3": ("C7H7", "4-methylphenyl"),
    "c3ccc(OC)cc3": ("C7H7O", "4-methoxyphenyl"),
    "c3ccc(Br)cc3": ("C6H4Br", "4-bromophenyl"),
    "c3ccncc3": ("C5H4N", "pyridin-4-yl"),
    "n3cncn3": ("C2H2N3", "1H-1,2,4-triazole"),
    "n3ccnc3": ("C3H3N2", "1H-imidazole"),
    "C": ("CH2", None),
    "C(C)": ("C2H4", "methyl"),
    "C(O)": ("CH2O", "hydroxy"),
    "C(F)": ("CHF", "fluoro"),
    "C(=O)": ("CO", "oxo"),
    "C(=C)": ("C2H2", "methylidene"),
    "=C": ("CH", None),
    "=C(O)": ("CHO", "hydroxy"),
    "=C(C)": ("C2H3", "methyl"),
    "=C(F)": ("CF", "fluoro"),
    "=C(Cl)": ("CCl", "chloro"),
    "=C(N)": ("CH2N", "amino"),
    "=C(OC)": ("C2H3O", "methoxy"),
    "=C(C#N)": ("C2N", "cyano"),
    "=C(OC(C)=O)": ("C3H3O2", "acetyloxy"),
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



STEROID_NULLS = {"S4": "=C", "S6": "C", "S7": "C", "S15": "C", "S16": "C"}

STEROID_LOCANTS = [("4", "S4"), ("6", "S6"), ("7", "S7"),
                   ("15", "S15"), ("16", "S16")]


def name_diaryl_azole(v):
    aryls = sorted([group_name(v["AR1"]), group_name(v["AR2"])],
                   key=lambda t: (LETTERS.sub("", t.lower()), t))
    if aryls[0] == aryls[1]:
        core = "[bis(%s)methyl]" % aryls[0]
    else:
        core = "[%s-%smethyl]" % (enclose(aryls[0]), enclose(aryls[1]))
    return join(collapse([("1", core)]), group_name(v["AZ"]))


def name_androstenedione(v):
    items = [(loc, group_name(v[k])) for loc, k in STEROID_LOCANTS
             if v[k] != STEROID_NULLS[k]]
    return join(collapse(items), "androst-4-ene-3,17-dione")


ARYLS = ["c3ccc(C#N)cc3", "c3ccc(Cl)cc3", "c3ccc(F)cc3", "c3ccccc3",
         "c3cccc(C#N)c3", "c3cccc(Cl)c3", "c3ccc4[nH]cnc4c3",
         "c3ccc4c(c3)nnn4C", "c3ccc(-c4ccccc4)cc3", "c3ccc(C)cc3",
         "c3ccc(OC)cc3", "c3ccc(Br)cc3", "c3ccncc3"]

AZOLES = ["n3cncn3", "n3ccnc3"]

S4 = ["=C", "=C(O)", "=C(C)", "=C(N)", "=C(F)", "=C(OC)", "=C(Cl)",
      "=C(C#N)"]

S6 = ["C", "C(=C)", "C(C)", "C(O)", "C(F)"]

S7 = ["C", "C(C)", "C(O)", "C(F)"]

S15 = ["C", "C(C)", "C(O)"]

S16 = ["C", "C(O)", "C(C)", "C(F)"]

FAMILIES = [
    {
        "cls": "Aromatase inhibitor",
        "template": "C({AR1})({AR2}){AZ}",
        "nulls": {"AR1": "c3ccc(C#N)cc3", "AR2": "c3ccc(C#N)cc3",
                  "AZ": "n3cncn3"},
        "slots": {"AR1": ARYLS, "AR2": ARYLS, "AZ": AZOLES},
        "name": name_diaryl_azole,
        "target": 14,
        "anchors": {
            "Letrozole": {},
            "Vorozole": {"AR1": "c3ccc(Cl)cc3",
                         "AR2": "c3ccc4c(c3)nnn4C"},
            "Bifonazole": {"AR1": "c3ccc(-c4ccccc4)cc3",
                           "AR2": "c3ccccc3", "AZ": "n3ccnc3"},
            "Liarozole": {"AR1": "c3cccc(Cl)c3",
                          "AR2": "c3ccc4[nH]cnc4c3", "AZ": "n3ccnc3"},
        },
    },
    {
        "cls": "Aromatase inhibitor",
        "template": "CC12CCC3C({S7}{S6}C4{S4}C(=O)CCC43C)C1{S15}{S16}C2=O",
        "nulls": dict(STEROID_NULLS),
        "slots": {"S4": S4, "S6": S6, "S7": S7, "S15": S15, "S16": S16},
        "name": name_androstenedione,
        "target": 14,
        "anchors": {
            "Formestane": {"S4": "=C(O)"},
            "Androstenetrione": {"S6": "C(=O)"},
            "16a-Hydroxyandrostenedione": {"S16": "C(O)"},
            "6-Methyleneandrostenedione": {"S6": "C(=C)"},
            "4-Acetoxyandrostenedione": {"S4": "=C(OC(C)=O)"},
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
