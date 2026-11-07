#!/usr/bin/env python3
"""Independent retained-source checks; never rebuild or rewrite metadata."""
import copy
import importlib.util
import json
from collections import Counter
from pathlib import Path
import subprocess
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('receptor_builder',ROOT/'tools/build-receptor-tags.py')
builder=importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class SourceActionTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.index,_=builder.chembl_snapshot_index()
  cls.data=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify({library:require('./data/library').LIBRARY,annotations:require('./data/receptor-ligand-annotations').RECEPTOR_LIGAND_ANNOTATIONS}))"],cwd=ROOT,text=True))
  cls.entries={e['name']:e for e in cls.data['library']}

 def test_separate_literal_classifications_and_unchanged_binding(self):
  counts=Counter();classified=[];snapshot=copy.deepcopy(self.data)
  for i,a in enumerate(self.data['annotations']):
   binding=builder.chembl_evidence(a,self.entries[a['ligandName']],self.index,i)
   before=copy.deepcopy(binding);result=builder.chembl_action_evidence(binding,self.index)
   self.assertEqual(binding,before)
   self.assertEqual(binding['actions'],[])
   self.assertTrue(binding['bindingEvidence'])
   raw=self.index[(a['receptorId'],a['activityId'])][0]['activity'].get('action_type')
   expected=raw and raw.get('action_type') in {'AGONIST','ANTAGONIST'} and binding['numericalTransferStatus']=='exact_source_graph'
   self.assertEqual(bool(result),bool(expected))
   if not result:continue
   counts[result['sourceAction']]+=1;classified.append(result)
   self.assertEqual(result['sourceActionRecord'],raw)
   self.assertFalse(result['bindingEvidence'])
   self.assertEqual(result['provider'],'ChEMBL curated action classification')
   self.assertEqual(result['classificationTransferStatus'],'exact_source_graph')
   self.assertEqual(result['species'],'Homo sapiens')
   self.assertEqual(result['sourceSha256'],binding['sourceSha256'])
   for key in ['value','unit','metric','relation','sd','uncertainty','originalValue']:
    self.assertNotIn(key,result,'Classification must not carry a potency measurement')
  self.assertGreater(counts['AGONIST'],0)
  self.assertGreater(counts['ANTAGONIST'],0)
  self.assertEqual(len(classified),sum(counts.values()))
  self.assertEqual(self.data,snapshot)

 def test_unknown_and_binding_agent_are_not_functional_actions(self):
  original=next(a for a in self.data['annotations'] if self.index[(a['receptorId'],a['activityId'])][0]['activity'].get('action_type'))
  binding=builder.chembl_evidence(original,self.entries[original['ligandName']],self.index,0)
  key=(binding['receptorId'],binding['activityId'])
  for value in [None,{}, {'action_type':'BINDING AGENT'},{'action_type':'UNKNOWN'}]:
   selected,panel,provenance=copy.deepcopy(self.index[key]);selected['activity']['action_type']=value
   self.assertIsNone(builder.chembl_action_evidence(binding,{key:(selected,panel,provenance)}))
  excluded={**binding,'numericalTransferStatus':'excluded_graph_mismatch'}
  self.assertIsNone(builder.chembl_action_evidence(excluded,self.index))

 def test_iuphar_class_literal_is_witnessed_not_inferred(self):
  source=json.loads((ROOT/'validation/sources/receptor-actions-iuphar.json').read_text())
  self.assertEqual(set(l['Type'] for l in source['ligands']),{'Synthetic organic','Metabolite','Natural product','Peptide'})
  # Existing canonical PAM/NAM labels retain their explicit allosteric context.
  self.assertEqual(builder.classify({'Type':'Allosteric modulator','Action':'Positive'}),['modulator','pam'])
  self.assertEqual(builder.classify({'Type':'None','Action':'Binding'}),[])

if __name__=='__main__':unittest.main()
