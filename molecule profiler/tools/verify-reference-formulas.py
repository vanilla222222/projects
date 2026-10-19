#!/usr/bin/env python3
"""Audit molecular formulas without changing the library by default.

Requires: pip install rdkit
Usage: python tools/verify-reference-formulas.py
       python tools/verify-reference-formulas.py --write-missing
       python tools/verify-reference-formulas.py --report path.json

Formula calculations use the input SMILES as written, not an authoritative
chemical identity. This script deliberately does not change nonblank formulas,
rename entries, or infer pharmacological activity.
"""
import argparse
import json
import re
from pathlib import Path
from rdkit import Chem, RDLogger
from rdkit.Chem import rdMolDescriptors

RDLogger.DisableLog("rdApp.error")
LIBRARY = Path(__file__).resolve().parents[1] / "data" / "library.js"
PATTERN = re.compile(
    r"(\{ name: '((?:\\'|[^'])+)', cls: '((?:\\'|[^'])*)', formula: ')((?:\\'|[^'])*)(', smiles: '((?:\\'|[^'])+)' \})"
)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write-missing", action="store_true")
    ap.add_argument("--report", type=Path)
    args = ap.parse_args()
    original = LIBRARY.read_text(encoding="utf-8")
    results = {"entries": 0, "filled": [], "formula_mismatches": [], "invalid_smiles": [], "skipped": []}

    def check(match):
        results["entries"] += 1
        prefix, name, _cls, formula, suffix, smiles = match.groups()
        # JS string literal escaping is not identical to raw SMILES.
        # Only simple escapes are accepted; unusual ones require manual review.
        if "\\'" in smiles or "\\\\" in smiles:
            results["skipped"].append({"name": name, "reason": "escaped SMILES literal"})
            return match.group(0)
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            results["invalid_smiles"].append({"name": name, "smiles": smiles})
            return match.group(0)
        calculated = rdMolDescriptors.CalcMolFormula(mol)
        if formula and formula != calculated:
            results["formula_mismatches"].append({"name": name, "stored": formula, "calculated": calculated})
        if not formula:
            results["filled"].append({"name": name, "formula": calculated})
            if args.write_missing:
                return prefix + calculated + suffix
        return match.group(0)

    updated = PATTERN.sub(check, original)
    results["written"] = bool(args.write_missing and updated != original)
    if results["written"]:
        LIBRARY.write_text(updated, encoding="utf-8")
    if args.report:
        args.report.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(json.dumps({k: (len(v) if isinstance(v, list) else v) for k, v in results.items()}, indent=2))
    if results["invalid_smiles"]:
        print("WARNING: Invalid SMILES remain and require manual review; see report.")

if __name__ == "__main__":
    main()
