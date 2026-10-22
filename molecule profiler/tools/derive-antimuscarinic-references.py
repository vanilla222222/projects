# Derives homologue references on four antimuscarinic templates: the
# tropan-3-yl esters (atropine series), the 1,1-dialkylpiperidin-3-yl esters
# (mepenzolate series), the 2-(trialkylammonio)ethyl esters (oxyphenonium
# and propantheline series) and the benzhydryl ether aminoethanes
# (diphenhydramine and orphenadrine series).
#
# Each template is proven before use by regenerating structures the library
# already stores and requiring a canonical-SMILES match. Molecular formulae
# are composed from the parent scaffold formula plus the formula of each
# substituent group, written once per group; RDKit then recomputes the
# formula from the assembled structure and the two must agree, charge
# included. Templates reserve ring digits 1 and 2, so interpolated rings
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
    "C": ("CH3", "methyl"),
    "CC": ("C2H5", "ethyl"),
    "CCC": ("C3H7", "propyl"),
    "CC(C)": ("C3H7", "propan-2-yl"),
    "C(C)C": ("C3H7", "propan-2-yl"),
    "CCCC": ("C4H9", "butyl"),
    "CC(C)C": ("C4H9", "2-methylpropyl"),
    "CCCCC": ("C5H11", "pentyl"),
    "c3ccccc3": ("C6H5", "phenyl"),
    "c3ccccc3C": ("C7H7", "2-methylphenyl"),
    "c3ccc(C)cc3": ("C7H7", "4-methylphenyl"),
    "c3ccc(Cl)cc3": ("C6H4Cl", "4-chlorophenyl"),
    "c3ccc(F)cc3": ("C6H4F", "4-fluorophenyl"),
    "c3ccc(OC)cc3": ("C7H7O", "4-methoxyphenyl"),
    "c3cccs3": ("C4H3S", "thiophen-2-yl"),
    "C(O)(c3ccccc3)c3ccccc3": ("C13H11O", "2-hydroxy-2,2-diphenylacetate"),
    "C(O)(c3ccccc3)C3CCCCC3": ("C13H17O",
                               "2-cyclohexyl-2-hydroxy-2-phenylacetate"),
    "C(O)(c3cccs3)c3cccs3": ("C9H7OS2",
                             "2-hydroxy-2,2-dithiophen-2-ylacetate"),
    "C(CO)c3ccccc3": ("C8H9O", "3-hydroxy-2-phenylpropanoate"),
    "C(O)c3ccccc3": ("C7H7O", "2-hydroxy-2-phenylacetate"),
    "C3c4ccccc4Oc4ccccc43": ("C13H9O", "9H-xanthene-9-carboxylate"),
    "C(O)(c3ccccc3)C3CCCC3": ("C12H15O",
                              "2-cyclopentyl-2-hydroxy-2-phenylacetate"),
    "C(O)(C3CCCCC3)C3CCCCC3": ("C13H23O", "2,2-dicyclohexyl-2-hydroxyacetate"),
    "C(O)(c3ccccc3)c3cccs3": ("C11H9OS",
                              "2-hydroxy-2-phenyl-2-thiophen-2-ylacetate"),
    "C(c3ccccc3)c3ccccc3": ("C13H11", "2,2-diphenylacetate"),
    "C(O)(C)c3ccccc3": ("C8H9O", "2-hydroxy-2-phenylpropanoate"),
    "C(O)(c3ccccc3)c3ccc(F)cc3": ("C13H10FO",
                                  "2-(4-fluorophenyl)-2-hydroxy-2-phenylacetate"),
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


def name_tropane_ester(v):
    head = join(collapse([("8", group_name(v["NA"]))]),
                "8-azabicyclo[3.2.1]octan-3-yl")
    return head + " " + group_name(v["ACID"])


def name_piperidinium_ester(v):
    head = join(collapse([("1", group_name(v["NA"])), ("1", "methyl")]),
                "piperidin-1-ium-3-yl")
    return head + " " + group_name(v["ACID"])


def name_ammonio_ester(v):
    alkyls = plain([group_name(v["NA"]), group_name(v["NB"]), "methyl"])
    head = "-".join(text for _, text in sorted(alkyls))
    return "%s-[2-(%s)oxyethyl]azanium" % (head, acyl(group_name(v["ACID"])))


def name_benzhydryl_ether(v):
    aryls = sorted([group_name(v["AR1"]), group_name(v["AR2"])],
                   key=lambda t: LETTERS.sub("", t.lower()))
    if aryls[0] == aryls[1]:
        core = "benzhydryloxy" if aryls[0] == "phenyl" \
            else "[bis(%s)methoxy]" % aryls[0]
    else:
        core = "[%s-%smethoxy]" % (enclose(aryls[0]), enclose(aryls[1]))
    items = [("2", core), ("N", group_name(v["NA"])), ("N", group_name(v["NB"]))]
    return join(collapse(items), "ethanamine")


PALKYLS = ["C", "CC", "CCC", "CC(C)", "CCCC", "CC(C)C", "CCCCC"]

BALKYLS = ["C", "CC", "CCC", "C(C)C", "CCCC", "CC(C)C", "CCCCC"]

ACIDS = ["C(O)(c3ccccc3)c3ccccc3", "C(O)(c3ccccc3)C3CCCCC3",
         "C(O)(c3cccs3)c3cccs3", "C(CO)c3ccccc3", "C(O)c3ccccc3",
         "C3c4ccccc4Oc4ccccc43", "C(O)(c3ccccc3)C3CCCC3",
         "C(O)(C3CCCCC3)C3CCCCC3", "C(O)(c3ccccc3)c3cccs3",
         "C(c3ccccc3)c3ccccc3", "C(O)(C)c3ccccc3",
         "C(O)(c3ccccc3)c3ccc(F)cc3"]

ARYLS = ["c3ccccc3", "c3ccc(Cl)cc3", "c3ccc(F)cc3", "c3ccccc3C",
         "c3ccc(C)cc3", "c3ccc(OC)cc3", "c3cccs3"]

FAMILIES = [
    {
        "cls": "Antimuscarinic",
        "template": "{NA}N1C2CCC1CC(C2)OC(=O){ACID}",
        "nulls": {"NA": "C", "ACID": "C(CO)c3ccccc3"},
        "slots": {
            "NA": PALKYLS,
            "ACID": ["C(CO)c3ccccc3"] + [a for a in ACIDS
                                         if a != "C(CO)c3ccccc3"],
        },
        "name": name_tropane_ester,
        "target": 8,
        "anchors": {
            "Atropine": {},
            "Homatropine": {"ACID": "C(O)c3ccccc3"},
        },
    },
    {
        "cls": "Antimuscarinic",
        "charge": "+",
        "template": "C[N+]1({NA})CCCC(OC(=O){ACID})C1",
        "nulls": {"NA": "C", "ACID": "C(O)(c3ccccc3)c3ccccc3"},
        "slots": {"NA": BALKYLS, "ACID": ACIDS},
        "name": name_piperidinium_ester,
        "target": 8,
        "anchors": {
            "Mepenzolate": {},
            "Pipenzolate": {"NA": "CC"},
        },
    },
    {
        "cls": "Antimuscarinic",
        "charge": "+",
        "template": "{NA}[N+]({NB})(C)CCOC(=O){ACID}",
        "nulls": {"NA": "CC", "NB": "CC",
                  "ACID": "C(O)(c3ccccc3)C3CCCCC3"},
        "slots": {
            "NA": PALKYLS,
            "NB": BALKYLS,
            "ACID": ["C(O)(c3ccccc3)C3CCCCC3"] + [a for a in ACIDS
                                                  if a != "C(O)(c3ccccc3)C3CCCCC3"],
        },
        "name": name_ammonio_ester,
        "target": 8,
        "anchors": {
            "Oxyphenonium": {},
            "Methantheline": {"ACID": "C3c4ccccc4Oc4ccccc43"},
            "Propantheline": {"NA": "CC(C)", "NB": "C(C)C",
                              "ACID": "C3c4ccccc4Oc4ccccc43"},
        },
    },
    {
        "cls": "Antimuscarinic",
        "template": "C({AR1})({AR2})OCCN({NA}){NB}",
        "nulls": {"AR1": "c3ccccc3", "AR2": "c3ccccc3", "NA": "C", "NB": "C"},
        "slots": {"AR1": ARYLS, "AR2": ARYLS, "NA": BALKYLS, "NB": BALKYLS},
        "name": name_benzhydryl_ether,
        "target": 7,
        "anchors": {
            "Diphenhydramine": {},
            "Orphenadrine": {"AR2": "c3ccccc3C"},
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
