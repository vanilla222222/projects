#!/usr/bin/env python3
"""All retained assay rows independently checked without writing compiled data."""
import copy,importlib.util,json,subprocess,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('builder',ROOT/'tools/build-receptor-tags.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
FIELDS={'assayFormatId':'bao_format','assayFormat':'bao_label','assayTypeDescription':'assay_type_description','assayConfidenceDescription':'confidence_description','assayRelationshipType':'relationship_type','assayRelationshipDescription':'relationship_description','assaySubcellularFraction':'assay_subcellular_fraction','assayTestType':'assay_test_type'}
class AssayContextTests(unittest.TestCase):
 def test_all_retained_source_rows(self):
  index,_=builder.chembl_snapshot_index();data=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify({library:require('./data/library').LIBRARY,annotations:require('./data/receptor-ligand-annotations').RECEPTOR_LIGAND_ANNOTATIONS}))"],cwd=ROOT,text=True));entries={e['name']:e for e in data['library']};counts={'binding':0,'classification':0,'pa2':0,'time':0}
  for i,a in enumerate(data['annotations']):
   if a.get('curationSource')!='chembl-human-binding-v1':continue
   selected,_,_=index[(a['receptorId'],a['activityId'])];before=copy.deepcopy(selected);result=builder.chembl_evidence(a,entries[a['ligandName']],index,i);raw=selected['activity'];assay=selected['assay'];counts['binding']+=1
   for key,field in FIELDS.items():self.assertEqual(result[key],assay.get(field))
   self.assertEqual(result['sourceActivityProperties'],raw['activity_properties']);counts['time']+=bool(raw['activity_properties'])
   self.assertEqual(result['value'],float(raw['standard_value']));self.assertEqual(result['metric'],raw['standard_type']);self.assertEqual(result['actions'],[])
   if raw['type']=='pA2':counts['pa2']+=1;self.assertEqual(result['originalMetric'],'pA2');self.assertEqual(result['metric'],'Kd')
   classified=builder.chembl_action_evidence(result,index)
   if classified:
    counts['classification']+=1
    for key in [*FIELDS,'sourceActivityProperties']:self.assertEqual(classified[key],result[key])
    for key in ['value','metric','unit','relation']:self.assertNotIn(key,classified)
   self.assertEqual(selected,before,'Projection must not mutate pinned source data')
  self.assertEqual(counts,{'binding':1881,'classification':31,'pa2':5,'time':22})
 def test_missing_context_remains_unknown(self):
  index,_=builder.chembl_snapshot_index();key=next(iter(index));selected,panel,provenance=index[key];batch=json.loads((ROOT/provenance['sourceFile']).read_text());a=next(a for a in batch['annotations'] if (a['receptorId'],a['activityId'])==key);selected=copy.deepcopy(selected)
  for field in FIELDS.values():selected['assay'].pop(field,None)
  # relationship_type is an eligibility guard, so keep its source-required code.
  selected['assay']['relationship_type']='D'
  result=builder.chembl_evidence(a,selected['entry'],{key:(selected,panel,provenance)},0)
  for key,field in FIELDS.items():self.assertEqual(result[key],'D' if field=='relationship_type' else None)
if __name__=='__main__':unittest.main()
