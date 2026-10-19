#!/usr/bin/env python3
"""Check systematically named reference entries against the structure their own name specifies.

Run: python tools/verify-systematic-names.py [--json report.json]

For a name like "undecyl tetradecanoate" or "methyl propyl ketone" the name fixes the
structure completely, so the expected SMILES can be derived from the name rather than
recalled. Entries whose stored structure disagrees with their name are reported as
mismatches. Names outside the grammar below are counted as uncovered and never guessed at.

This verifies that a name and a structure agree. It is not a source of chemical identity
for trivially named compounds, and it makes no pharmacological claim.
"""
import argparse
import ast
import json
import re
from pathlib import Path

from rdkit import Chem, RDLogger

RDLogger.DisableLog("rdApp.*")
LIBRARY = Path(__file__).resolve().parents[1] / "data" / "library.js"
ENTRY = re.compile(r"\{ name: '((?:\\.|[^'\\])*)', cls: '((?:\\.|[^'\\])*)', formula: '((?:\\.|[^'\\])*)', smiles: '((?:\\.|[^'\\])*)'(?:, propertyOnly: true)? \}")

STEM = {"meth": 1, "eth": 2, "prop": 3, "but": 4, "pent": 5, "hex": 6, "hept": 7,
        "oct": 8, "non": 9, "dec": 10, "undec": 11, "dodec": 12, "tridec": 13,
        "tetradec": 14, "pentadec": 15, "hexadec": 16, "heptadec": 17,
        "octadec": 18, "nonadec": 19, "eicos": 20, "icos": 20}
BRANCHED = {"isopropyl": "CC(C)", "isobutyl": "CC(C)C", "isopentyl": "CC(C)CC",
            "isoamyl": "CC(C)CC", "sec-butyl": "CCC(C)", "tert-butyl": "CC(C)(C)",
            "neopentyl": "CC(C)(C)C"}
TRIVIAL_ACYL = {"formate": 1, "acetate": 2, "propionate": 3, "butyrate": 4,
                "valerate": 5, "caproate": 6, "enanthate": 7, "caprylate": 8,
                "pelargonate": 9, "caprate": 10, "laurate": 12, "myristate": 14,
                "palmitate": 16, "stearate": 18}

def alkyl(word):
    """SMILES fragment for an alkyl substituent, written to be prefixed to a heteroatom."""
    word = word.lower()
    if word in BRANCHED:
        return BRANCHED[word]
    if word.endswith("yl") and word[:-2] in STEM:
        return "C" * STEM[word[:-2]]
    return None

def acyl_carbons(word):
    word = word.lower()
    if word in TRIVIAL_ACYL:
        return TRIVIAL_ACYL[word]
    if word.endswith("oate") and word[:-4].rstrip("an") in STEM:
        return STEM[word[:-4].rstrip("an")]
    if word.endswith("anoate") and word[:-6] in STEM:
        return STEM[word[:-6]]
    return None

def expected(name):
    """SMILES the name specifies, or None when the name is outside the grammar."""
    n = name.strip().lower()
    parts = n.split()
    if len(parts) == 3 and parts[2] == "ketone":
        a, b = alkyl(parts[0]), alkyl(parts[1])
        if a and b and "(" not in a + b:
            return a + "C(=O)" + b
        return None
    if len(parts) == 3 and parts[2] == "ether":
        a, b = alkyl(parts[0]), alkyl(parts[1])
        if a and b:
            return a + "O" + b
        return None
    if len(parts) == 2:
        a, c = alkyl(parts[0]), acyl_carbons(parts[1])
        if a and c:
            return a + "OC(=O)" + "C" * (c - 1)
        return None
    m = re.fullmatch(r"(\d+)-([a-z]+)an(?:-\1-)?one", n)
    if m:
        pos, stem = int(m.group(1)), m.group(2)
        if stem in STEM and 1 < pos <= STEM[stem]:
            total = STEM[stem]
            return "C" * (pos - 1) + "C(=O)" + "C" * (total - pos)
        return None
    if n == "acetone":
        return "CC(=O)C"
    m = re.fullmatch(r"([a-z]+)ane", n)
    if m and m.group(1) in STEM:
        return "C" * STEM[m.group(1)]
    m = re.fullmatch(r"(\d+)-([a-z]+)anol", n)
    if m and m.group(2) in STEM and 0 < int(m.group(1)) <= STEM[m.group(2)]:
        pos, total = int(m.group(1)), STEM[m.group(2)]
        return "C" * (pos - 1) + "C(O)" + "C" * (total - pos)
    return None

def canonical(smiles):
    mol = Chem.MolFromSmiles(smiles)
    return Chem.MolToSmiles(mol) if mol else None

def run():
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", type=Path)
    args = parser.parse_args()
    text = LIBRARY.read_text(encoding="utf8")
    rows = [dict(name=ast.literal_eval("'" + m[1] + "'"), cls=ast.literal_eval("'" + m[2] + "'"),
                 smiles=ast.literal_eval("'" + m[4] + "'")) for m in ENTRY.finditer(text)]
    checked, agree, mismatches, uncovered = 0, 0, [], 0
    for row in rows:
        want = expected(row["name"])
        if want is None:
            uncovered += 1
            continue
        checked += 1
        got, ref = canonical(row["smiles"]), canonical(want)
        if got is not None and got == ref:
            agree += 1
        else:
            mismatches.append({"name": row["name"], "cls": row["cls"],
                               "stored": row["smiles"], "nameImplies": want})
    report = {"entries": len(rows), "covered": checked, "uncovered": uncovered,
              "agree": agree, "mismatches": mismatches}
    print(json.dumps({k: v for k, v in report.items() if k != "mismatches"}, indent=2))
    for item in mismatches:
        print("MISMATCH %-26s stored %-28s name implies %s"
              % (item["name"][:26], item["stored"][:28], item["nameImplies"]))
    if args.json:
        args.json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf8")
    raise SystemExit(1 if mismatches else 0)

if __name__ == "__main__":
    run()
