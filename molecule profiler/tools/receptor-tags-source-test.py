#!/usr/bin/env python3
"""Independently check imported identities and action evidence against pinned source rows."""
import json,subprocess,hashlib
from pathlib import Path
from rdkit import Chem
ROOT=Path(__file__).resolve().parents[1]
src=json.loads((ROOT/'validation/sources/receptor-actions-iuphar.json').read_text())
m=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./data/library-receptor-tags').LIBRARY_RECEPTOR_METADATA))"],cwd=ROOT,text=True))
ligands={r['Ligand ID']:r for r in src['ligands']}
def graph(s):return Chem.MolToSmiles(Chem.MolFromSmiles(s),isomericSmiles=True)
checked=0
for name,e in m['entries'].items():
 for a in e['evidence']:
  if a['provider']!='IUPHAR/BPS Guide to PHARMACOLOGY':continue
  row=src['interactions'][a['sourceRow']];ligand=ligands[row['Ligand ID']]
  assert graph(ligand['SMILES'])==graph(e['librarySmiles']),(name,'graph/stereo')
  assert a['species']==row['Target Species']=='Human'
  assert a['receptorId'] in src['targetMapping'][row['Target ID']]
  assert (a['sourceType'],a['sourceAction'])==(row['Type'],row['Action'])
  for action in a['actions']:
   if action in {'full_agonist','partial_agonist','inverse_agonist','antagonist','biased'}:
    assert row['Action']=={'full_agonist':'Full agonist','partial_agonist':'Partial agonist','inverse_agonist':'Inverse agonist','antagonist':'Antagonist','biased':'Biased agonist'}[action]
   if action in {'pam','nam','neutral_allosteric'}:
    assert row['Type']=='Allosteric modulator'
    assert row['Action'] in {'pam':{'Positive','Potentiation'},'nam':{'Negative'},'neutral_allosteric':{'Neutral'}}[action]
   if action=='modulator':assert row['Type']=='Allosteric modulator'
  if row['Type']=='None':assert not a['actions']
  checked+=1
assert checked>1700
print(f'Receptor source audit: {checked} exact-graph human source classifications checked; no binding-only activity inference.')
