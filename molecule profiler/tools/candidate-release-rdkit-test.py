"""Independent graph, isotope/stereo identity and per-step atom-balance checks."""
import collections,json,subprocess
from pathlib import Path
from rdkit import Chem
ROOT=Path(__file__).resolve().parents[1]
fixtures=json.loads(subprocess.check_output(['node','tools/candidate-dashboard-test.js','--json'],cwd=ROOT,text=True))
def graph(s):
 m=Chem.MolFromSmiles(s);assert m is not None,s
 return Chem.MolToSmiles(m,isomericSmiles=True)
def atoms(s):
 m=Chem.AddHs(Chem.MolFromSmiles(s));return collections.Counter((a.GetSymbol(),a.GetIsotope()) for a in m.GetAtoms())
steps=0
for f in fixtures:
 r=f['result'];target=graph(r['releaseTarget']['smiles'])
 if r['releaseTarget']['kind']=='original-input':assert target==graph(f['input'])
 if r['releaseTarget']['kind']=='different-analogue':assert target!=graph(f['input'])
 for s in r['steps']:
  m=Chem.MolFromSmiles(s['reactantSmiles']);graph(s['reactantSmiles'])
  for cut in s['cutBonds']:
   a,b=cut['atoms'];assert m.GetBondBetweenAtoms(a-1,b-1) is not None
   assert [m.GetAtomWithIdx(a-1).GetSymbol(),m.GetAtomWithIdx(b-1).GetSymbol()]==cut['elements']
  before=atoms(s['reactantSmiles'])
  if s['formalInput'].startswith('One water'):before.update(atoms('O'))
  elif s['formalInput'].startswith('One oxygen'):before[('O',0)]+=1
  elif s['formalInput'].startswith('Two hydrogen'):before[('H',0)]+=2
  after=collections.Counter()
  for p in s['products']:graph(p['smiles']);after.update(atoms(p['smiles']))
  assert before==after,(f['input'],s['kind'],before,after)
  steps+=1
 assert any(graph(p['smiles'])==target for s in r['steps'] for p in s['products'])
print(f'RDKit: {len(fixtures)} release routes, {steps} atom-balanced steps and cut-bond identities passed.')
