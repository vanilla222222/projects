#!/usr/bin/env python3
"""Offline source parity tests: no conversion, sorting or uncertainty inference."""
import copy
import importlib.util
import json
from collections import Counter
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('receptor_builder',ROOT/'tools/build-receptor-tags.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)

class EndpointTests(unittest.TestCase):
 def test_all_source_rows_are_literal_and_immutable(self):
  rows=json.loads((ROOT/'validation/sources/receptor-actions-iuphar.json').read_text())['interactions'];before=copy.deepcopy(rows);counts=Counter()
  for row in rows:
   result=builder.iuphar_endpoints(row)
   self.assertEqual(result['sourceRecord'],row)
   self.assertEqual(result['sourceEndpoint'],dict(scale=row['Affinity Units'],high=row['Affinity High'],median=row['Affinity Median'],low=row['Affinity Low']))
   self.assertEqual(result['originalEndpoint'],dict(metric=row['Original Affinity Units'],highNm=row['Original Affinity High nm'],medianNm=row['Original Affinity Median nm'],lowNm=row['Original Affinity Low nm'],relation=row['Original Affinity Relation']))
   self.assertEqual(result['publicationIds'],list(dict.fromkeys(filter(None,row['PubMed ID'].split('|')))))
   self.assertEqual(result['publicationUrls'],['https://pubmed.ncbi.nlm.nih.gov/'+p+'/' for p in result['publicationIds']])
   self.assertEqual(result['externalUrls'],list(dict.fromkeys(filter(None,row['Webpage URLs'].split('|')))))
   self.assertEqual(result['patentIds'],list(dict.fromkeys(filter(None,row['Patent Numbers'].split('|')))))
   if row['Affinity Median']:counts['median']+=1
   if row['Affinity High'] and row['Affinity Low']:counts['range']+=1
   if row['PubMed ID']:counts['publications']+=1
   for field in ['value','lower','upper','sd','uncertainty','action']:self.assertNotIn(field,result)
  self.assertEqual(len(rows),2029);self.assertEqual(counts,{'median':1182,'range':708,'publications':1856});self.assertEqual(rows,before)

 def test_range_direction_and_relation_are_not_reinterpreted(self):
  row={'Affinity Units':'pKi','Affinity High':'8.3','Affinity Low':'7.8','Affinity Median':'','Original Affinity Units':'Ki','Original Affinity High nm':'5.0','Original Affinity Low nm':'15.0','Original Affinity Median nm':'','Original Affinity Relation':'~'}
  result=builder.iuphar_endpoints(row)
  self.assertEqual(result['sourceEndpoint']['high'],'8.3');self.assertEqual(result['originalEndpoint']['highNm'],'5.0');self.assertEqual(result['originalEndpoint']['lowNm'],'15.0');self.assertEqual(result['originalEndpoint']['relation'],'~')
  for relation in ['', '>', '<']:
   row['Original Affinity Relation']=relation
   self.assertEqual(builder.iuphar_endpoints(row)['originalEndpoint']['relation'],relation)

 def test_unsafe_or_invalid_reference_links_are_excluded(self):
  result=builder.iuphar_endpoints({'PubMed ID':'123|bad|123|456','Webpage URLs':'javascript:alert(1)|https://example.org/source|https://u:p@example.org/|https://example.org/source','Patent Numbers':'WO123|WO456'})
  self.assertEqual(result['publicationIds'],['123','456']);self.assertEqual(result['externalUrls'],['https://example.org/source']);self.assertEqual(result['patentIds'],['WO123','WO456']);self.assertEqual(result['originalEndpoint']['relation'],'')

if __name__=='__main__':unittest.main()
