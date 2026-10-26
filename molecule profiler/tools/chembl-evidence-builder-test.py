#!/usr/bin/env python3
"""Offline checks for source-pinned ChEMBL binding projection; no data writes."""
import copy,importlib.util,json,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('receptor_tags',ROOT/'tools/build-receptor-tags.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
class ProjectionTest(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.index,cls.paths=builder.chembl_snapshot_index()
  cls.key=next(k for k,v in cls.index.items() if v[0]['activity']['type']=='pA2')
  cls.selected,cls.panel,cls.provenance=cls.index[cls.key]
  cls.entry=cls.selected['entry']
  batch=json.loads((ROOT/cls.provenance['sourceFile']).read_text())
  cls.annotation=next(a for a in batch['annotations'] if (a['receptorId'],a['activityId'])==cls.key)
 def project(self,a=None,e=None,index=None):
  return builder.chembl_evidence(a or self.annotation,e or self.entry,index or self.index,0)
 def altered(self,part,field,value):
  selected=copy.deepcopy(self.selected);selected[part][field]=value
  return {self.key:(selected,self.panel,self.provenance)}
 def test_source_standardization_is_separate(self):
  e=self.project();self.assertEqual(e['metric'],'Kd');self.assertEqual(e['originalMetric'],'pA2')
  self.assertEqual(e['originalValue'],self.selected['activity']['value'])
  self.assertEqual(e['value'],float(self.selected['activity']['standard_value']))
  self.assertEqual(e['numericalTransferStatus'],'exact_source_graph');self.assertEqual(e['actions'],[])
  self.assertEqual(e['sourceSha256'],builder.digest(ROOT/e['sourceFile']))
  self.assertEqual(e['librarySmiles'],self.entry['smiles']);self.assertEqual(len(self.paths),6)
 def test_class_label_is_not_an_identity_witness(self):
  e=self.project(e={**self.entry,'cls':'Updated editorial label'})
  self.assertEqual(e['value'],float(self.selected['activity']['standard_value']))
 def test_stale_library_witness_rejected(self):
  e={**self.entry,'smiles':'CCO'}
  with self.assertRaisesRegex(AssertionError,'Stale ChEMBL library witness'):self.project(e=e)
 def test_source_id_mismatch_rejected(self):
  with self.assertRaisesRegex(AssertionError,'identifier mismatch'):self.project(index=self.altered('activity','document_chembl_id','CHEMBL0'))
 def test_source_endpoint_mismatch_rejected(self):
  with self.assertRaisesRegex(AssertionError,'endpoint differs'):self.project(index=self.altered('activity','standard_value','42'))
 def test_source_graph_mismatch_excludes_result(self):
  e=self.project(index=self.altered('activity','canonical_smiles','CCO'))
  self.assertEqual(e['numericalTransferStatus'],'excluded_graph_mismatch')
  for key in ['metric','relation','value','unit']:self.assertNotIn(key,e)
  self.assertIn('sourceUrl',e);self.assertIn('sourceSha256',e)
 def test_tautomer_group_key_is_not_identity(self):
  # The grouping hash remains untouched, but a distinct source graph still fails.
  e=self.project(index=self.altered('activity','canonical_smiles','CC[NH2+]CC'))
  self.assertEqual(e['numericalTransferStatus'],'excluded_graph_mismatch')
 def test_duplicate_snapshot_rejected(self):
  batch={'sourceDatabase':{'chembl_db_version':'test'},'panels':[{'gene':self.key[0],'selected':[self.selected,self.selected]}]}
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);(root/'validation').mkdir();(root/'validation/chembl-receptor-binding-batch.json').write_text(json.dumps(batch))
   with self.assertRaisesRegex(AssertionError,'Duplicate retained ChEMBL'):builder.chembl_snapshot_index(root)
if __name__=='__main__':unittest.main()
