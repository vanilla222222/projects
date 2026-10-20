#!/usr/bin/env python3
"""Offline evidence-selection checks; no network or repository mutation."""
import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('curation',Path(__file__).with_name('curate-receptor-bindings.py'))
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class EvidenceTests(unittest.TestCase):
    def activity(self,**changes):
        a={'standard_value':'10','standard_type':'Ki','standard_relation':'=','standard_units':'nM',
           'assay_type':'B','target_chembl_id':'CHEMBL1','target_organism':'Homo sapiens','potential_duplicate':0,
           'src_id':1,'document_chembl_id':'CHEMBL2'}
        return {**a,**changes}
    def assay(self,**changes):
        return {'confidence_score':9,'relationship_type':'D','assay_type':'B','target_chembl_id':'CHEMBL1',
                'assay_organism':'Homo sapiens','description':'Human receptor displacement',**changes}
    def test_positive_binding(self):
        self.assertTrue(m.accepted_activity(self.activity(),'CHEMBL1'))
        self.assertTrue(m.accepted_assay(self.assay(),'CHEMBL1'))
    def test_nonbinding_or_censored_values(self):
        for changes in [{'standard_type':'EC50'},{'standard_type':'IC50'},{'standard_relation':'<'},
          {'standard_value':'0'},{'standard_value':'NaN'},{'standard_value':'1001'},{'standard_value':'-1'},
          {'standard_units':'uM'},{'data_validity_comment':'Outside typical range'},
          {'potential_duplicate':1},{'assay_variant_mutation':'D1A'},{'src_id':7},
          {'target_organism':'Rattus norvegicus'},{'target_chembl_id':'other'}]:
            self.assertFalse(m.accepted_activity(self.activity(**changes),'CHEMBL1'),changes)
    def test_assay_mapping_and_species(self):
        for changes in [{'confidence_score':8},{'relationship_type':'H'},{'assay_organism':None},
          {'assay_organism':'Mus musculus'},{'variant_sequence':{'mutation':'A1B'}},
          {'description':'Unknown origin binding'},{'assay_type':'F'}]:
            self.assertFalse(m.accepted_assay(self.assay(**changes),'CHEMBL1'),changes)
    def test_graph_grouping_not_aliases(self):
        self.assertEqual(m.compound('CCNCC')['identityKey'],m.compound('CC[NH2+]CC')['identityKey'])
        self.assertNotEqual(m.compound('N[C@H](C)C(=O)O')['identityKey'],m.compound('N[C@@H](C)C(=O)O')['identityKey'])
    def test_unsupported_graphs(self):
        for smiles in ['CC','CCCCCC.[Cl-]','[Cu+2]','[CH2]CCCC']:
            self.assertIsNone(m.compound(smiles),smiles)
    def test_catalog_target_gates(self):
        record={'id':'HRH3','genes':['HRH3'],'name':'Histamine H3','kind':'GPCR'}
        self.assertEqual(m.target_from_catalog('HRH3',[record])['family'],'GPCR')
        for bad in [{**record,'genes':['HRH3','OTHER']},{**record,'kind':'Ligand-gated channel'},
                    {**record,'id':'OTHER'}]:
            with self.assertRaises(ValueError):m.target_from_catalog('HRH3',[bad])
    def test_target_append_handles_missing_trailing_comma(self):
        text="const TARGETS = [\n{ name: 'Existing', ligands: [] }\n];\n\nif (typeof module !== 'undefined') {}"
        row={'name':'New receptor','gene':'NEW','family':'GPCR','organism':'Human','note':'Binding only','ligands':['CHEMBL1']}
        result=m.append_target_rows(text,[row])
        self.assertIn("ligands: [] },\n  { name: 'New receptor'",result)
        self.assertIn("gene: 'NEW'",result)
        self.assertEqual(result.count("name: 'New receptor'"),1)
        with self.assertRaises(ValueError):m.append_target_rows('invalid file',[row])
    def test_import_preserves_manual_evidence_and_release_history(self):
        manual={'receptorId':'HRH3','action':'agonist','sourceUrl':'https://example.org/experiment'}
        old={'receptorId':'HRH3','curationSource':'chembl-human-binding-v1'}
        other={'receptorId':'HRH4','curationSource':'chembl-human-binding-v1','sourceRelease':'ChEMBL_36'}
        new={'receptorId':'HRH3','curationSource':'chembl-human-binding-v1','sourceRelease':'ChEMBL_37'}
        merged=m.merge_annotations([manual,old,other],[new],['HRH3'],'ChEMBL_37')
        self.assertEqual(merged,[manual,other,new])
        self.assertNotIn('sourceRelease',manual)
        migration=m.merge_annotations([{'receptorId':'HRH4','curationSource':'chembl-human-binding-v1'}],[],[],'ChEMBL_37')
        self.assertEqual(migration[0]['sourceRelease'],'ChEMBL_37')
    def test_js_literals(self):
        self.assertEqual(m.js_string("a'b\\c"),"'a\\'b\\\\c'")

    def test_named_selection_requires_source_preferred_name(self):
        for name in [None, '', '  ', 'CHEMBL123', 'chembl123', '12345-67-8']:
            self.assertIsNone(m.pharmacology_name({'molecule_pref_name':name}))
        for name in ['Morphine', 'N/OFQ', 'SB-612111', '(R)-SKF-38393']:
            self.assertEqual(m.pharmacology_name({'molecule_pref_name':' '+name+' '}),name)
        self.assertIsNone(m.pharmacology_name({'molecule_chembl_id':'CHEMBL123','action_type':'AGONIST'}))

    def test_named_graph_variants_have_distinct_reference_keys(self):
        a={'molecule_pref_name':'MORPHINE','molecule_chembl_id':'CHEMBL70'}
        self.assertEqual(m.new_reference_name(a,{'Morphine'},True),'MORPHINE [CHEMBL70]')
        self.assertEqual(m.new_reference_name(a,set(),True),'MORPHINE')
        self.assertEqual(m.new_reference_name(a,{'Morphine'},False),'CHEMBL70')
        with self.assertRaises(ValueError):m.new_reference_name({'molecule_chembl_id':'CHEMBL70'},set(),True)

if __name__=='__main__':unittest.main()
