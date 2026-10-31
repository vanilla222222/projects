#!/usr/bin/env python3
"""Offline primary-row parity, graph identity and tamper checks for batch four."""
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import unittest
from rdkit import Chem
from rdkit.Chem import rdMolDescriptors

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('freesolv004',ROOT/'tools/import-freesolv-properties-004.py')
builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
class FreeSolvBatchFour(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
    cls.snapshot=json.loads((ROOT/builder.SNAPSHOT).read_text())
    code="const raw=require('./data/library.js').LIBRARY,d=require('./data/curated-references.js').CURATED_REFERENCES;console.log(JSON.stringify({raw,effective:require('./js/curated-references.js').library(raw,d)}));"
    cls.current=json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT,text=True))
    cls.raw=(ROOT/builder.TABLE).read_bytes()
    cls.lines=cls.raw.decode().splitlines()
    cls.rows={line.split(';',1)[0]:(i,line,[f.strip() for f in line.split(';',9)]) for i,line in enumerate(cls.lines,1) if line and not line.startswith('#')}
    cls.records=[json.loads((ROOT/('data/curated-reference-entries/property-freesolv4-'+slug+'.json')).read_text()) for _,_,slug in builder.SELECTION]

 def test_pinned_full_source_bytes_and_snapshot(self):
    self.assertEqual(hashlib.sha256(self.raw).hexdigest(),'2d13f095713bc39b85f85dd7b4e5483fbb12fc694bf253bb1d92a4c4d484f260')
    self.assertEqual(hashlib.sha1(b'blob '+str(len(self.raw)).encode()+b'\0'+self.raw).hexdigest(),'6c6dbf5d27e646db5a540288ece636f9c915f363')
    self.assertEqual(self.snapshot['sourceRevision'],'134cd763f95d54d818fc0618095aa01cbe470fc3')
    self.assertEqual(len(self.records),100);self.assertEqual(len({s[0] for s in builder.SELECTION}),100)
    for file,blob in self.snapshot['sourceFileGitBlobs'].items():
     raw=(ROOT/file).read_bytes()
     self.assertEqual(hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest(),blob)
     self.assertEqual(hashlib.sha256(raw).hexdigest(),self.snapshot['sourceFileSha256'][file])

 def test_all_one_hundred_experimental_columns_uncertainty_notes_and_references(self):
    defaults=0;estimates=0;unresolved=0;multiple=0
    for (source_id,name,slug),record in zip(builder.SELECTION,self.records):
     lineno,raw,f=self.rows[source_id];e=record['evidence'][0];c=record['compounds'][0]
     self.assertEqual(record['id'],'property-freesolv4-'+slug);self.assertEqual(c['name'],name);self.assertNotIn('sourceName',c)
     self.assertEqual(e['kind'],'measured_property');self.assertEqual(e['target'],'Hydration free energy')
     self.assertEqual(e['value'],float(f[3]));self.assertEqual(e['uncertainty'],float(f[4]))
     self.assertEqual(e['sourceRecord'],raw);self.assertEqual(e['sourceRow'],lineno);self.assertEqual(e['sourceId'],source_id)
     self.assertEqual(e['experimentalReference'],f[7]);self.assertEqual(e['context'],f[9]);self.assertEqual(e['relation'],'=');self.assertEqual(e['unit'],'kcal/mol')
     default='assigned a default value' in f[9].lower()
     self.assertEqual(e['uncertaintyKind'],'source-assigned default uncertainty' if default else 'source-reported estimate')
     defaults+=default;estimates+=not default
     urls=['https://doi.org/'+d for d in re.findall(r'10\.\d{4,9}/[^\s,;]+',f[7])]
     self.assertEqual(e['originalReferences'],urls)
     if urls:self.assertEqual(e['originalReference'],urls[0]);multiple+=len(urls)>1
     else:self.assertNotIn('originalReference',e);self.assertEqual(f[7],'SAMPL4_Guthrie');unresolved+=1
     for field in ['sd','standardDeviation','action','panel']:self.assertNotIn(field,e)
     self.assertIn(raw,self.snapshot['rows']);self.assertIn(c['identitySource']['sourceRecord'],self.snapshot['ligands'])
    self.assertEqual((defaults,estimates,unresolved,multiple),(92,8,2,1))
    ethion=next(r for r in self.records if r['compounds'][0]['name']=='chloridazon')['evidence'][0]
    self.assertEqual(ethion['uncertainty'],1.93);self.assertEqual(ethion['uncertaintyKind'],'source-assigned default uncertainty')

 def test_valid_coincident_experimental_and_calculated_columns(self):
    _,_,fields=self.rows['mobley_1261349']
    self.assertEqual(float(fields[3]),float(fields[5]))
    evidence=next(r['evidence'][0] for r in self.records if r['evidence'][0]['sourceId']=='mobley_1261349')
    self.assertEqual(evidence['value'],float(fields[3]))

 def test_full_exact_graph_formula_derived_identifiers_and_existing_reuse(self):
    for record in self.records:
     c=record['compounds'][0];mol=Chem.MolFromSmiles(c['smiles']);canonical=Chem.MolToSmiles(mol,isomericSmiles=True)
     self.assertEqual(c['formula'],rdMolDescriptors.CalcMolFormula(mol));self.assertEqual(c['inchiKey'],Chem.MolToInchiKey(mol))
     self.assertIn('RDKit-derived',c['identitySource']['identifierOrigin'])
     identity=c['identitySource']['sourceRecord'];self.assertEqual(identity['sourceSMILES'],identity['smiles']);self.assertEqual(identity['smiles'],c['smiles'])
     self.assertEqual(identity['rawRow'],record['evidence'][0]['sourceRecord'])
     for scope in ['raw','effective']:
      matches=[e for e in self.current[scope] if e['name']==c['name']];self.assertEqual(len(matches),1)
      self.assertEqual(Chem.MolToSmiles(Chem.MolFromSmiles(matches[0]['smiles']),isomericSmiles=True),canonical)
      self.assertEqual(matches[0]['formula'],c['formula'])

 def test_conditions_license_and_no_duplicate_previous_measurements(self):
    previous=set()
    for path in (ROOT/'data/curated-reference-entries').glob('*.json'):
     if path.name.startswith('property-freesolv4-'):continue
     r=json.loads(path.read_text())
     if any(e['kind']=='measured_property' for e in r['evidence']):previous.update(re.findall(r'mobley_\d+',path.read_text()))
    self.assertTrue(previous.isdisjoint(s[0] for s in builder.SELECTION))
    for r in self.records:
     e=r['evidence'][0]
     self.assertIn('Not specified',e['conditions']['temperature']);self.assertIn('Not specified',e['conditions']['pH'])
     self.assertIn('Gas to water',e['conditions']['phaseTransfer'])
     license=r['compounds'][0]['identitySource']['licenseMetadata']
     self.assertEqual(license['observedAtRevision'],'6c7d19b4b565537365ffd22006aa2cd4643200c6')
     self.assertIn('original source restrictions may remain',license['scope'])

 def test_missing_wrong_raw_or_effective_graph_and_formula_fail(self):
    for scope in ['raw','effective']:
     for mode in ['missing','graph','formula']:
      current=json.loads(json.dumps(self.current));name=builder.SELECTION[0][1]
      if mode=='missing':current[scope]=[e for e in current[scope] if e['name']!=name]
      else:
       entry=next(e for e in current[scope] if e['name']==name);entry['smiles' if mode=='graph' else 'formula']='C' if mode=='graph' else 'CH4'
      with self.assertRaises(ValueError):builder.build(library=current['raw'],effective=current['effective'])

 def test_immutable_table_tamper_rejected(self):
    with tempfile.TemporaryDirectory() as directory:
     root=Path(directory)
     for name in builder.SOURCE_BLOBS:
      (root/name).parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/name,root/name)
     with (root/builder.TABLE).open('ab') as stream:stream.write(b'\n')
     with self.assertRaisesRegex(ValueError,'Pinned source blob changed'):builder.build(root,self.current['raw'],self.current['effective'])

 def test_readonly_deterministic_generated_outputs(self):
    names=['data/library.js','data/curated-references.js',builder.SNAPSHOT]+['data/curated-reference-entries/'+r['id']+'.json' for r in self.records]+list(builder.SOURCE_BLOBS)
    before={p:(ROOT/p).read_bytes() for p in names}
    for name,text in builder.build().items():self.assertEqual(before[name],text.encode())
    subprocess.check_call([__import__('sys').executable,'-B',str(ROOT/'tools/import-freesolv-properties-004.py'),'--check'],cwd=ROOT)
    self.assertEqual(before,{p:(ROOT/p).read_bytes() for p in names})

 def test_shared_config_rejects_duplicate_selection_and_unsafe_paths(self):
    kwargs={'selection':builder.SELECTION, 'record_prefix':builder.PREFIX,
            'snapshot_path':builder.SNAPSHOT, 'scope_count_word':'One hundred'}
    for change in [{'selection':[builder.SELECTION[0],builder.SELECTION[0]]},
                   {'record_prefix':''}, {'snapshot_path':'../outside.json'}]:
     with self.assertRaises(ValueError):builder.core.build(**{**kwargs,**change})

 def test_shared_core_preserves_every_published_batch002_byte(self):
    for name,text in builder.core.build().items():
     self.assertEqual((ROOT/name).read_bytes(),text.encode())
    original_selection=list(builder.core.SELECTION)
    builder.build()
    self.assertEqual(builder.core.SELECTION,original_selection,'Wrapper must not mutate shared configuration')


if __name__=='__main__':unittest.main()
