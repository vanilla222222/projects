#!/usr/bin/env python3
"""Offline tests of identity classifications. No external API calls."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('audit', Path(__file__).with_name('pubchem-reference-audit.py'))
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)

class ComparisonTests(unittest.TestCase):
    def result(self, local, source, formula='C2H6O', source_formula='C2H6O'):
        return audit.compare({'smiles': local, 'formula': formula}, {'PropertyTable': {'Properties': [
            {'CID': 702, 'SMILES': source, 'MolecularFormula': source_formula}]}})

    def test_equivalent_ordering(self):
        self.assertEqual(self.result('CCO', 'OCC')['status'], 'matched_isomeric_graph')

    def test_mirror_is_not_identity_match(self):
        result = self.result('N[C@H](C)C(=O)O', 'N[C@@H](C)C(=O)O')
        self.assertEqual(result['status'], 'connectivity_only_stereochemistry_differs')

    def test_different_connectivity(self):
        self.assertEqual(self.result('CCO', 'COC')['status'], 'different_graph_requires_review')

    def test_formula_does_not_prove_identity(self):
        self.assertTrue(self.result('CCO', 'COC')['storedFormulaMatchesSource'])

    def test_formula_disagreement_retained(self):
        self.assertFalse(self.result('CCO', 'OCC', formula='wrong')['storedFormulaMatchesSource'])

    def test_ambiguous_and_missing(self):
        self.assertEqual(audit.compare({'smiles': 'CCO'}, {})['status'], 'ambiguous_or_missing_record')
        result = audit.compare({'smiles': 'CCO'}, {'PropertyTable': {'Properties': [{'CID': 1}]}})
        self.assertEqual(result['status'], 'missing_source_structure')

    def test_invalid_smiles(self):
        self.assertEqual(self.result('invalid', 'CCO')['status'], 'unreadable_structure')

if __name__ == '__main__':
    unittest.main()
