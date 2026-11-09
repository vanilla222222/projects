#!/usr/bin/env python3
"""Independent RDKit oracle for Chem Lab's exported structures and products.

Run from any directory after installing RDKit from PyPI:
  python -m pip install --target /tmp/chem-rdkit rdkit
  PYTHONPATH=/tmp/chem-rdkit python 'chem lab/tools/rdkit-validation.py'

The default command updates rdkit-validation-report.json and exits nonzero on
any disagreement. Use --check to validate without rewriting the committed report.
"""
from __future__ import annotations

import argparse
import collections
import datetime
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import sys

try:
    from rdkit import Chem, rdBase
    from rdkit.Chem import rdMolDescriptors
except ImportError:
    raise SystemExit("RDKit is required; install the official PyPI 'rdkit' package (see this script's docstring).")

HERE = Path(__file__).resolve().parent


def canonical(mol):
    if mol is None:
        raise ValueError("RDKit could not parse/sanitize the structure")
    Chem.AssignStereochemistry(mol, cleanIt=True, force=True)
    return Chem.MolToSmiles(mol, canonical=True, isomericSmiles=True)


def canonical_connectivity(mol):
    copy = Chem.Mol(mol)
    Chem.RemoveStereochemistry(copy)
    return canonical(copy)


def parse_smiles(text):
    mol = Chem.MolFromSmiles(text, sanitize=True)
    if mol is None:
        raise ValueError("RDKit rejected SMILES: " + str(text))
    return mol


def composition(formula, charge=0):
    # RDKit reports Hill formula whereas the app may use another ordering or D.
    # Compare element counts, normalizing explicitly labelled deuterium to H.
    core = formula
    if charge:
        signs = ["+"] if charge > 0 else ["−", "-"]
        suffixes = signs if abs(charge) == 1 else [text for sign in signs for text in (str(abs(charge)) + sign, sign + str(abs(charge)))]
        for suffix in suffixes:
            if core.endswith(suffix):
                core = core[:-len(suffix)]
                break
        else:
            raise ValueError("Formula does not encode its declared charge: " + formula)
    values = collections.Counter()
    for el, count in re.findall(r"([A-Z][a-z]?)(\d*)", core):
        values["H" if el == "D" else el] += int(count or 1)
    return dict(sorted(values.items()))


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--check", action="store_true", help="Do not replace the saved report")
    options = args.parse_args()
    fixture_bytes = (HERE / "rdkit-fixtures.json").read_bytes()
    fixtures = json.loads(fixture_bytes)
    legacy_fixture_bytes = (HERE / "chemistry-fixtures.json").read_bytes()
    legacy_fixtures = json.loads(legacy_fixture_bytes)
    bridge = subprocess.run(["node", str(HERE / "export-rdkit-cases.js")], capture_output=True, text=True, check=True)
    exported = json.loads(bridge.stdout)
    records = []

    def check(category, case, actual, expected):
        if isinstance(expected, float):
            passed = isinstance(actual, (int, float)) and math.isfinite(actual) and abs(actual - expected) <= fixtures["tolerances"]["exactMassDa"]
        else:
            passed = actual == expected
        records.append({"category": category, "case": case, "passed": passed, "actual": actual, "expected": expected})

    for row in exported["structures"]:
        label = row["id"]
        try:
            if row.get("error"):
                raise ValueError("App export failed: " + row["error"])
            reference = parse_smiles(row["smiles"])
            app_smiles = parse_smiles(row["exported"])
            app_mol = Chem.MolFromMolBlock(row["molblock"], sanitize=True, removeHs=True, strictParsing=True)
            expected = canonical(reference)
            check("SMILES_identity", label, canonical(app_smiles), expected)
            check("MOL_identity", label, canonical(app_mol), expected)
            check("formula_composition", label, composition(row["properties"]["formula"], row["properties"]["charge"]), composition(rdMolDescriptors.CalcMolFormula(reference), Chem.GetFormalCharge(reference)))
            check("formal_charge", label, row["properties"]["charge"], Chem.GetFormalCharge(reference))
            check("heavy_atoms", label, row["properties"]["heavyAtoms"], reference.GetNumHeavyAtoms())
            # The new CIP finder may replace E/Z enums with cis/trans state;
            # isolate it from the independently inspected alkene representation.
            cip_labels = sorted(label for _, label in Chem.FindMolChiralCenters(Chem.Mol(reference), includeUnassigned=False, useLegacyImplementation=False))
            check("tetrahedral_CIP", label, row["tetrahedral"], cip_labels)
            stereo_labels = {Chem.BondStereo.STEREOE: "E", Chem.BondStereo.STEREOZ: "Z"}
            check("double_bond_stereo", label, row["doubleBond"], sorted(stereo_labels[bond.GetStereo()] for bond in reference.GetBonds() if bond.GetStereo() in stereo_labels))
            # RDKit's exact molecular mass includes electron-mass correction for
            # net ionic charge; use that same explicitly stated convention.
            check("exact_mass_Da", label, row["properties"]["exactMass"], rdMolDescriptors.CalcExactMolWt(reference))
        except Exception as error:
            check("structure_error", label, str(error), "No export, parse or sanitization error")

    for row in exported["pairs"]:
        label = row["a"] + " vs " + row["b"]
        try:
            if row.get("error"):
                raise ValueError(row["error"])
            oracle = canonical(parse_smiles(row["a"])) == canonical(parse_smiles(row["b"]))
            check("fixture_identity_expectation", label, oracle, row["same"])
            check("shared_identity_vs_RDKit", label, row["actual"], oracle)
        except Exception as error:
            check("pair_error", label, str(error), "No identity oracle error")

    for row in exported["reactions"]:
        try:
            if row.get("error"):
                raise ValueError(row["error"])
            check("reaction_rule_found", row["label"], row["found"], True)
            key = canonical_connectivity if row.get("comparison") == "connectivity" else canonical
            actual = sorted(key(parse_smiles(s)) for s in row["actual"])
            expected = sorted(key(parse_smiles(s)) for s in row.get("countedProducts", row["products"]))
            check("reaction_products_vs_RDKit", row["label"], actual, expected)
            if "positionalProducts" in row:
                actual_positions = sorted(set(canonical_connectivity(parse_smiles(s)) for s in row["actualPositional"]))
                expected_positions = sorted(set(canonical_connectivity(parse_smiles(s)) for s in row["positionalProducts"]))
                check("positional_products_vs_RDKit", row["label"], actual_positions, expected_positions)
        except Exception as error:
            check("reaction_error", row["label"], str(error), "No product parse or sanitization error")

    for row in exported.get("routePlans", []):
        try:
            if row.get("error"):
                raise ValueError(row["error"])
            check("route_plan_found", row["id"], row["status"], "found")
            check("route_plan_steps", row["id"], len(row["steps"]), len(row["expectedProducts"]))
            check("route_plan_operations", row["id"], [step["planning"] for step in row["steps"]], row["expectedKinds"])
            expected_from = canonical(parse_smiles(row["start"]))
            for index, (step, expected_product) in enumerate(zip(row["steps"], row["expectedProducts"])):
                case = row["id"] + ":step-" + str(index + 1)
                actual_from = canonical(parse_smiles(step["from"]))
                expected_to = canonical(parse_smiles(expected_product))
                check("route_intermediate_identity", case, canonical(parse_smiles(step["to"])), expected_to)
                check("route_step_continuity", case, actual_from, expected_from)
                check("route_carried_reactant", case, actual_from in [canonical(parse_smiles(s)) for s in step["reactants"]], True)
                check("route_forward_rule_found", case, step["found"], True)
                check("route_forward_product_identity", case, expected_to in [canonical(parse_smiles(s)) for s in step["products"]], True)
                expected_from = expected_to
            check("route_final_target_identity", row["id"], expected_from, canonical(parse_smiles(row["target"])))
        except Exception as error:
            check("route_plan_error", row["id"], str(error), "No structural planning-oracle error")

    failures = [r for r in records if not r["passed"]]
    counts = collections.Counter(r["category"] for r in records)
    report = {
        "schemaVersion": 1,
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "rdkitVersion": rdBase.rdkitVersion,
        "fixtureSha256": hashlib.sha256(fixture_bytes).hexdigest(),
        "fixtureFilesSha256": {"rdkit-fixtures.json": hashlib.sha256(fixture_bytes).hexdigest(),
                               "chemistry-fixtures.json": hashlib.sha256(legacy_fixture_bytes).hexdigest()},
        "exportSha256": hashlib.sha256(bridge.stdout.encode()).hexdigest(),
        "appScriptSha256": exported["scriptSha256"],
        "sources": {**legacy_fixtures["sources"], **fixtures["sources"]},
        "massConvention": "RDKit CalcExactMolWt, including electron-mass correction for net charge; tolerance 0.00002 Da.",
        "scope": "Finite structure-export, descriptor, reaction-product and encoded route-continuity regression against an independently implemented toolkit; not experimental reaction/route validation, nomenclature validation or a chemical-space accuracy estimate.",
        "structures": len(exported["structures"]), "identityPairs": len(exported["pairs"]), "reactions": len(exported["reactions"]),
        "routePlans": len(exported.get("routePlans", [])),
        "checks": len(records), "passed": len(records) - len(failures), "failed": len(failures),
        "categories": dict(sorted(counts.items())), "failures": failures,
    }
    if not options.check:
        (HERE / "rdkit-validation-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print("RDKit independent validation: {passed}/{checks} checks passed; {failed} failed ({structures} structures, {identityPairs} identity pairs, {reactions} reaction fixtures, {routePlans} encoded route plans).".format(**report))
    for failure in failures:
        print(json.dumps(failure))
    return bool(failures)


if __name__ == "__main__":
    sys.exit(main())
