#!/usr/bin/env python3
"""Independent RDKit library integrity audit (read-only).

Run: python tools/rdkit-library-audit.py --output rdkit-audit.json
Requires RDKit. Never rewrites the source library.
"""
import argparse
import ast
import collections
import json
import re
from pathlib import Path

from rdkit import Chem, RDLogger
from rdkit.Chem import rdMolDescriptors
from rdkit.Chem.MolStandardize import rdMolStandardize

RDLogger.DisableLog("rdApp.error")
LIBRARY = Path(__file__).resolve().parents[1] / "data" / "library.js"
ENTRY = re.compile(r"\{ name: '((?:\\.|[^'\\])*)', cls: '((?:\\.|[^'\\])*)', formula: '((?:\\.|[^'\\])*)', smiles: '((?:\\.|[^'\\])*)'(?:, propertyOnly: true)? \}")

def unescape(value):
    # Interpret JavaScript's simple string escapes used in this dataset.
    # Preserve literal backslashes used in stereochemical SMILES.
    return ast.literal_eval("'" + value + "'")

def run():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("rdkit-audit.json"))
    args = parser.parse_args()
    text = LIBRARY.read_text(encoding="utf8")
    rows = [dict(name=unescape(m[1]), cls=unescape(m[2]), formula=unescape(m[3]), smiles=unescape(m[4])) for m in ENTRY.finditer(text)]
    # Guard against silently skipping entries when the JS library format changes.
    entry_markers = text.count("{ name: '")
    if len(rows) != entry_markers:
        raise SystemExit(f"Parsed {len(rows)} entries but found {entry_markers} entry markers; inspect library formatting.")
    report = {"schemaVersion": 1, "method": "RDKit structure parsing, formula, stereochemistry and tautomer canonicalization; no identity verification", "entries": len(rows), "invalidSmiles": [], "formulaMismatches": [], "canonicalDuplicates": [], "tautomerGroups": [], "unspecifiedStereocenters": [], "chargedEntries": [], "fragmentedEntries": [], "radicalEntries": [], "nonAromaticSulfurRings": [], "parseFailures": [], "counts": {}}
    canonical = collections.defaultdict(list)
    tautomer = collections.defaultdict(list)
    enumerator = rdMolStandardize.TautomerEnumerator()
    for i, row in enumerate(rows):
        label = {"index": i + 1, "name": row["name"]}
        try:
            mol = Chem.MolFromSmiles(row["smiles"])
            if mol is None:
                report["invalidSmiles"].append({**label, "smiles": row["smiles"]})
                continue
            formula = rdMolDescriptors.CalcMolFormula(mol)
            if row["formula"] != formula:
                report["formulaMismatches"].append({**label, "stored": row["formula"], "calculated": formula})
            key = Chem.MolToSmiles(mol, isomericSmiles=True)
            canonical[key].append(label)
            try:
                taut = Chem.MolToSmiles(enumerator.Canonicalize(mol), isomericSmiles=True)
                tautomer[taut].append((key, label))
            except Exception as exc:
                report["parseFailures"].append({**label, "step": "tautomer", "error": str(exc)})
            centers = Chem.FindMolChiralCenters(mol, includeUnassigned=True)
            unspecified = [idx for idx, chirality in centers if chirality == "?"]
            if unspecified:
                report["unspecifiedStereocenters"].append({**label, "atomIndices": unspecified})
            charge = sum(atom.GetFormalCharge() for atom in mol.GetAtoms())
            if charge:
                report["chargedEntries"].append({**label, "formalCharge": charge})
            if len(Chem.GetMolFrags(mol)) > 1:
                report["fragmentedEntries"].append(label)
            # Nitric oxide and the other diatomic radicals in this library are genuinely
            # open-shell, so an unpaired electron is only evidence of a drawing error on a
            # molecule large enough to be a drawn structure rather than a known radical gas.
            radicals = sum(atom.GetNumRadicalElectrons() for atom in mol.GetAtoms())
            if radicals and mol.GetNumHeavyAtoms() >= 3:
                report["radicalEntries"].append({**label, "radicalElectrons": radicals, "smiles": row["smiles"]})
            # A five-membered ring holding one sulfur plus ring unsaturation is a thiophene in
            # every compound this library covers, so a non-aromatic one marks a mis-drawn ring
            # rather than a real alternative. Oxygen is excluded: furanones and oxazolines are
            # legitimately non-aromatic.
            for ring in mol.GetRingInfo().AtomRings():
                if len(ring) != 5:
                    continue
                atoms = [mol.GetAtomWithIdx(idx) for idx in ring]
                if any(atom.GetIsAromatic() for atom in atoms):
                    continue
                if sum(1 for atom in atoms if atom.GetSymbol() == "S") != 1:
                    continue
                unsaturated = sum(1 for bond in mol.GetBonds()
                                  if bond.GetBeginAtomIdx() in ring and bond.GetEndAtomIdx() in ring
                                  and bond.GetBondType() == Chem.BondType.DOUBLE)
                if unsaturated:
                    report["nonAromaticSulfurRings"].append({**label, "smiles": row["smiles"]})
                    break
        except Exception as exc:
            report["parseFailures"].append({**label, "step": "molecule", "error": str(exc)})
    report["canonicalDuplicates"] = [{"canonicalSmiles": key, "entries": values} for key, values in canonical.items() if len(values) > 1]
    report["tautomerGroups"] = [{"entries": [item[1] for item in values], "distinctCanonicalSmiles": len(set(item[0] for item in values))} for values in tautomer.values() if len(set(item[0] for item in values)) > 1]
    for key in ("invalidSmiles", "formulaMismatches", "canonicalDuplicates", "tautomerGroups", "unspecifiedStereocenters", "chargedEntries", "fragmentedEntries", "radicalEntries", "nonAromaticSulfurRings", "parseFailures"):
        report["counts"][key] = len(report[key])
    args.output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf8")
    print(json.dumps({"entries": len(rows), **report["counts"]}, indent=2))
    # Hard findings: an entry whose own stored fields contradict each other, or whose structure
    # cannot be what it is written as. Duplicates, charges and unassigned stereocentres are
    # reported but not failed, because legitimate entries produce all three.
    hard = {key: report[key] for key in
            ("invalidSmiles", "parseFailures", "formulaMismatches", "radicalEntries", "nonAromaticSulfurRings")
            if report[key]}
    if hard:
        for key, values in hard.items():
            print("FAIL %s: %s" % (key, json.dumps(values, ensure_ascii=False)))
        raise SystemExit(1)

if __name__ == "__main__":
    run()
