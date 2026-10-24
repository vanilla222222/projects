#!/usr/bin/env python3
"""RDKit audit classification regressions; all work uses temporary files."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from rdkit import Chem
from rdkit.Chem import rdMolDescriptors
spec=importlib.util.spec_from_file_location('audit',Path(__file__).with_name('rdkit-library-audit.py'))
audit=importlib.util.module_from_spec(spec);spec.loader.exec_module(audit)

class AuditTests(unittest.TestCase):
    def run_audit(self,smiles,formula,json_entry=False):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);library=root/'library.js';output=root/'report.json'
            library.write_text(json.dumps({'name':'Fixture','cls':'Test','formula':formula,'smiles':smiles},separators=(',',':'))+',\n' if json_entry else "{ name: 'Fixture', cls: 'Test', formula: '"+formula+"', smiles: '"+smiles+"' }")
            old_library,old_args=audit.LIBRARY,sys.argv
            try:
                audit.LIBRARY=library;sys.argv=['audit','--output',str(output)]
                with contextlib.redirect_stdout(io.StringIO()):audit.run()
                return json.loads(output.read_text())
            finally:
                audit.LIBRARY=old_library;sys.argv=old_args
    def test_valid_nonaromatic_sulfur_ring_is_review_flag(self):
        smiles='O=C1CSC=N1';mol=Chem.MolFromSmiles(smiles);self.assertIsNotNone(mol)
        report=self.run_audit(smiles,rdMolDescriptors.CalcMolFormula(mol))
        self.assertEqual(report['counts']['nonAromaticSulfurRings'],1)
        self.assertEqual(report['counts']['invalidSmiles'],0)
    def test_sourced_json_entries_are_not_silently_skipped(self):
        report=self.run_audit('CCO','C2H6O',json_entry=True)
        self.assertEqual(report['entries'],1)
        self.assertEqual(report['counts']['formulaMismatches'],0)
    def test_formula_contradiction_still_fails(self):
        with self.assertRaises(SystemExit) as result:self.run_audit('CCO','C99H99')
        self.assertEqual(result.exception.code,1)
    def test_unreadable_structure_still_fails(self):
        with self.assertRaises(SystemExit) as result:self.run_audit('not_smiles','C2H6O')
        self.assertEqual(result.exception.code,1)
if __name__=='__main__':unittest.main()
