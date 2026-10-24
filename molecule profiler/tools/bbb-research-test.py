import hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'standalone'))
from bbb_model import load,predict
m=load();report=json.loads((ROOT/'validation/bbb-research-model.json').read_text())
assert report['scaffoldOverlap']==0 and sum(s['n'] for s in report['split'].values())==report['curatedRows']
assert len({s['identitySha256'] for s in report['split'].values()})==3
assert report['fullTest']['n']==270 and report['applicableTest']['n']==190
assert report['fullTest']['brier']<report['brierConstantTrainingPrevalence']
assert m['trainingCodeSha256']==hashlib.sha256((ROOT/'tools/train-bbb-research.py').read_bytes()).hexdigest()
for s in ['[Na+]','CCN.Cl','C[NH3+]','bad','[CH3]','[Fe]']:
 r=predict({'smiles':s});assert not r['available'] and r['probability'] is None
for s in ['CC(=O)Oc1ccccc1C(=O)O','Cn1c(=O)c2c(ncn2C)n(C)c1=O','CCCCCCCCCCCCCCCCCCCCCCCCCCCCCC']:
 r=predict({'smiles':s})
 if r['available']:assert 0<=r['probability']<=1 and r['domain']['maximumTrainingSimilarity']>=.35
 else:assert r['probability'] is None
assert len(m['trees'])==120 and len(m['fingerprints'])==1244
print('BBB research: artifact integrity, scaffold audit, held-out reporting, applicability and abstention checks passed.')
