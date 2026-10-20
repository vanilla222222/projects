#!/usr/bin/env python3
"""Independent chemical examples for the reference-diversity report."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('diversity', Path(__file__).with_name('receptor-diversity-audit.py'))
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


def record(smiles):
    return {'librarySmiles': smiles, 'identityKey': m.profile_scaffold(smiles)[0]}


class DiversityTests(unittest.TestCase):
    def test_substituents_share_ring_scaffold(self):
        r = m.summarize([record(s) for s in ['Cc1ccccc1', 'Oc1ccccc1', 'Cc1ccccc1', 'c1ccncc1']])
        self.assertEqual(r['sourcedProfiles'], 3)
        self.assertEqual(r['distinctRingScaffolds'], 2)
        self.assertEqual(r['largestRingScaffoldProfiles'], 2)

    def test_acyclic_molecules_are_not_one_scaffold(self):
        r = m.summarize([record('CCCCCC'), record('CCCCCO')])
        self.assertEqual(r['sourcedProfiles'], 2)
        self.assertEqual(r['acyclicProfiles'], 2)
        self.assertEqual(r['distinctRingScaffolds'], 0)
        self.assertIsNone(r['largestRingScaffoldFractionOfRingProfiles'])

    def test_bond_types_are_not_genericized(self):
        r = m.summarize([record('c1ccccc1'), record('C1CCCCC1')])
        self.assertEqual(r['distinctRingScaffolds'], 2)

    def test_charge_aliases_do_not_inflate_profiles(self):
        self.assertEqual(m.summarize([record('CCNCC'), record('CC[NH2+]CC')])['sourcedProfiles'], 1)

    def test_stereo_profiles_can_share_a_scaffold(self):
        r = m.summarize([record('C[C@H]1CCCCN1'), record('C[C@@H]1CCCCN1')])
        self.assertEqual(r['sourcedProfiles'], 2)
        self.assertEqual(r['distinctRingScaffolds'], 1)

    def test_tampered_identity_and_invalid_graph_fail(self):
        with self.assertRaises(ValueError):
            m.summarize([{'librarySmiles': 'CCCCCC', 'identityKey': '0'*64}])
        for smiles in ['invalid', 'CC.CC']:
            with self.assertRaises(ValueError):
                m.profile_scaffold(smiles)

    def test_empty_panel(self):
        r = m.summarize([])
        self.assertEqual(r['sourcedProfiles'], 0)
        self.assertEqual(r['ringScaffolds'], [])


if __name__ == '__main__':
    unittest.main()
