#!/usr/bin/env python3
"""Frozen scaffold split. Test data never selects weights, calibration or threshold."""
import os
os.environ['OPENBLAS_NUM_THREADS']='1';os.environ['OMP_NUM_THREADS']='1'
import base64,collections,csv,hashlib,io,json,math,zlib,urllib.request
from pathlib import Path
import numpy as np,sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import balanced_accuracy_score,roc_auc_score,brier_score_loss,confusion_matrix
from rdkit import Chem,rdBase,DataStructs,RDLogger
from rdkit.Chem import Crippen,Descriptors,rdMolDescriptors,rdFingerprintGenerator
from rdkit.Chem.Scaffolds import MurckoScaffold
RDLogger.DisableLog('rdApp.*')
ROOT=Path(__file__).resolve().parents[1];SEED=20261024
source=next(d for d in json.loads((ROOT/'validation/benchmark-sources.json').read_text())['datasets'] if d['id']=='bbbp')
cache=ROOT/'.bbb-cache';cache.mkdir(exist_ok=True);file=cache/'bbbp.csv'
raw=file.read_bytes() if file.exists() else urllib.request.urlopen(source['url'],timeout=45).read()
assert hashlib.sha256(raw).hexdigest()==source['sha256'];file.write_bytes(raw)
groups={};excluded=collections.Counter();gen=rdFingerprintGenerator.GetMorganGenerator(radius=2,fpSize=2048)
for row in csv.DictReader(io.StringIO(raw.decode())):
 try:
  m=Chem.MolFromSmiles(row['smiles']);label=int(row['p_np'])
  if m is None or label not in (0,1):raise ValueError('invalid')
  if len(Chem.GetMolFrags(m))!=1 or any(a.GetFormalCharge() for a in m.GetAtoms()):raise ValueError('charged/disconnected')
  if m.GetNumHeavyAtoms()>120 or any(a.GetAtomicNum() not in (1,6,7,8,9,15,16,17,35,53) or a.GetNumRadicalElectrons() for a in m.GetAtoms()):raise ValueError('unsupported')
  key=Chem.MolToSmiles(m,isomericSmiles=False);groups.setdefault(key,[]).append((m,label))
 except Exception as e:excluded[str(e)]+=1
rows=[]
for key,items in sorted(groups.items()):
 if len({y for _,y in items})!=1:excluded['conflicting stereochemistry-agnostic graph']+=len(items);continue
 excluded['duplicate graph']+=len(items)-1;m,y=items[0];fp=gen.GetFingerprint(m);bits=np.zeros(2048,dtype=np.uint8);DataStructs.ConvertToNumpyArray(fp,bits)
 scaffold=MurckoScaffold.MurckoScaffoldSmiles(mol=m,includeChirality=False) or '<all acyclic compounds>'
 rows.append({'key':key,'scaffold':scaffold,'fp':fp,'bits':bits,'y':y,'d':[Descriptors.MolWt(m),Crippen.MolLogP(m),rdMolDescriptors.CalcTPSA(m,includeSandP=True)]})
# Entire scaffold groups move together; all acyclic structures share one group.
scaffolds={}
for i,r in enumerate(rows):scaffolds.setdefault(r['scaffold'],[]).append(i)
ordered=sorted(scaffolds,key=lambda s:hashlib.sha256((str(SEED)+s).encode()).hexdigest())
splits={'train':[],'calibration':[],'test':[]};targets={'train':.7,'calibration':.15,'test':.15}
for scaffold in ordered:
 name=min(splits,key=lambda k:len(splits[k])/targets[k]);splits[name].extend(scaffolds[scaffold])
for a in splits:
 assert len({rows[i]['y'] for i in splits[a]})==2
 for b in splits:
  if a!=b:assert not ({rows[i]['scaffold'] for i in splits[a]}&{rows[i]['scaffold'] for i in splits[b]})
X=np.asarray([r['bits'] for r in rows]);y=np.asarray([r['y'] for r in rows]);train,cal,test=[splits[k] for k in ['train','calibration','test']]
forest=RandomForestClassifier(n_estimators=120,max_depth=10,min_samples_leaf=3,max_features='sqrt',class_weight='balanced_subsample',random_state=SEED,n_jobs=1).fit(X[train],y[train])
rawcal=np.clip(forest.predict_proba(X[cal])[:,1],1e-6,1-1e-6);calibrator=LogisticRegression(C=10,random_state=SEED).fit(np.log(rawcal/(1-rawcal)).reshape(-1,1),y[cal])
def calibrate(p):
 p=np.clip(p,1e-6,1-1e-6);z=calibrator.coef_[0,0]*np.log(p/(1-p))+calibrator.intercept_[0];return 1/(1+np.exp(-z))
cp=calibrate(rawcal);threshold=max(np.linspace(.1,.9,81),key=lambda t:(balanced_accuracy_score(y[cal],cp>=t),-abs(t-.5)))
def metrics(labels,predictions,prob=None):
 tn,fp,fn,tp=confusion_matrix(labels,predictions,labels=[0,1]).ravel();n=len(labels);out={'n':n,'tp':int(tp),'tn':int(tn),'fp':int(fp),'fn':int(fn),'accuracy':float((tp+tn)/n),'balancedAccuracy':float(balanced_accuracy_score(labels,predictions)),'sensitivity':float(tp/(tp+fn)) if tp+fn else None,'specificity':float(tn/(tn+fp)) if tn+fp else None}
 if prob is not None:out.update(rocAuc=float(roc_auc_score(labels,prob)),brier=float(brier_score_loss(labels,prob)))
 return out
p=calibrate(forest.predict_proba(X[test])[:,1]);sim=np.asarray([max(DataStructs.BulkTanimotoSimilarity(rows[i]['fp'],[rows[j]['fp'] for j in train])) for i in test]);ranges=np.asarray([rows[i]['d'] for i in train]);lower=ranges.min(axis=0);upper=ranges.max(axis=0)
gate=np.asarray([sim[k]>=.35 and np.all(np.asarray(rows[i]['d'])>=lower) and np.all(np.asarray(rows[i]['d'])<=upper) for k,i in enumerate(test)])
# Comparator evaluates the pre-existing browser passive screen on the same structures.
import subprocess
job={'endpoint':'bbb','rows':[{'smiles':rows[i]['key'],'observed':int(y[i])} for i in test]}
comparison=json.loads(subprocess.check_output(['node',str(ROOT/'tools/benchmark-worker.js')],input=json.dumps(job),text=True,cwd=ROOT));passive=[r for r in comparison['rows'] if r['status']=='scored'];full=metrics(y[test],p>=threshold,p);subset=metrics(y[np.asarray(test)[gate]],(p>=threshold)[gate],p[gate]) if len(set(y[np.asarray(test)[gate]]))==2 else None
baseline=float(brier_score_loss(y[test],np.full(len(test),y[train].mean())))
report={'schemaVersion':1,'modelId':'bbb-scaffold-rf-v1','source':source,'seed':SEED,'rdkit':rdBase.rdkitVersion,'sklearn':sklearn.__version__,'sourceRows':2050,'curatedRows':len(rows),'exclusions':dict(excluded),'split':{k:{'n':len(v),'positive':int(y[v].sum()),'scaffolds':len({rows[i]['scaffold'] for i in v}),'identitySha256':hashlib.sha256('\n'.join(sorted(rows[i]['key'] for i in v)).encode()).hexdigest()} for k,v in splits.items()},'scaffoldOverlap':0,'threshold':float(threshold),'thresholdSelection':'Calibration split only; maximum balanced accuracy on a fixed 0.10–0.90 grid.','fullTest':full,'applicableTest':subset,'testCoverage':float(gate.mean()),'passiveSameTest':comparison['metrics'],'passiveScored':len(passive),'passiveMatchedApplicableTest':metrics(y[np.asarray(test)[gate]],np.asarray([r['predicted'] for r in comparison['rows']])[gate]),'brierConstantTrainingPrevalence':baseline,'calibration':'Platt sigmoid fitted only to held-out calibration scaffold groups; test probabilities never fitted.','applicability':'Neutral connected supported structures, Morgan-2/2048 maximum training similarity >=0.35, and MW/WLOGP/TPSA within training ranges. Fixed before test evaluation.','scope':'Internal scaffold-held-out BBBP validation only. No external prospective validation, measured brain exposure, efflux/P-gp prediction or clinical validation. Labels include mechanisms beyond passive permeability. Stereochemistry is not modeled; stereochemistry-agnostic duplicate/conflicting graphs were curated together.'}
# Preserve row pairing and whole-scaffold dependence in evaluation uncertainty.
from importlib.util import spec_from_file_location,module_from_spec
spec=spec_from_file_location('bbb_statistics',ROOT/'tools/bbb-statistics.py');stats=module_from_spec(spec);spec.loader.exec_module(stats)
paired=[]
for k,i in enumerate(test):
 c=comparison['rows'][k];assert c['smiles']==rows[i]['key'] and c['observed']==int(y[i])
 paired.append(dict(smiles=rows[i]['key'],scaffold=rows[i]['scaffold'],observed=int(y[i]),modelProbability=float(p[k]),modelPrediction=int(p[k]>=threshold),passivePrediction=c['predicted'] if c['status']=='scored' else None,passiveStatus=c['status'],applicable=bool(gate[k])))
matched=[r for r in paired if r['passiveStatus']=='scored'];applicable=[r for r in matched if r['applicable']]
report['uncertainty']={'fullMatched':stats.paired_scaffold_intervals(matched),'applicableMatched':stats.paired_scaffold_intervals(applicable),'scope':'Paired comparisons use only the identical structures scored by both methods. Compound-wise McNemar does not settle balanced-accuracy differences or shared-scaffold dependence.'}
report['statisticsCodeSha256']=hashlib.sha256((ROOT/'tools/bbb-statistics.py').read_bytes()).hexdigest()
paired_bytes=(json.dumps({'schemaVersion':1,'modelId':report['modelId'],'threshold':float(threshold),'sourceSha256':source['sha256'],'rows':paired},indent=2)+'\n').encode()
(ROOT/'validation/bbb-heldout-predictions.json').write_bytes(paired_bytes);report['pairedPredictionsSha256']=hashlib.sha256(paired_bytes).hexdigest()
# Export only numerical trees/domain fingerprints, never an executable pickle.
trees=[]
for estimator in forest.estimators_:
 t=estimator.tree_;trees.append([[int(t.children_left[i]),int(t.children_right[i]),int(t.feature[i]),float(t.threshold[i]),float(t.value[i,0,1]/t.value[i,0].sum())] for i in range(t.node_count)])
payload={'trees':trees,'domainFingerprints':[DataStructs.BitVectToBinaryText(rows[i]['fp']).hex() for i in train]};compressed=base64.b64encode(zlib.compress(json.dumps(payload,separators=(',',':')).encode(),9)).decode()
artifact={'schemaVersion':1,'modelId':report['modelId'],'rdkit':rdBase.rdkitVersion,'threshold':float(threshold),'calibration':[float(calibrator.coef_[0,0]),float(calibrator.intercept_[0])],'ranges':[lower.tolist(),upper.tolist()],'minimumSimilarity':.35,'payloadEncoding':'zlib-json-base64','payload':compressed,'payloadSha256':hashlib.sha256(compressed.encode()).hexdigest(),'trainingSourceSha256':source['sha256'],'trainingCodeSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'scope':report['scope']}
(ROOT/'data/bbb-research-model.json').write_text(json.dumps(artifact,separators=(',',':'))+'\n');(ROOT/'validation/bbb-research-model.json').write_text(json.dumps(report,indent=2)+'\n');(ROOT/'data/bbb-research-report.js').write_text('globalThis.BBB_RESEARCH_REPORT = '+json.dumps(report)+';\n')
import sys
sys.path.insert(0,str(ROOT/'standalone'))
from bbb_model import predict
parity=0
for k,i in enumerate(test):
 result=predict({'smiles':rows[i]['key']})
 assert result['available']==bool(gate[k])
 if result['available']:
  assert abs(result['probability']-float(p[k]))<1e-12
  parity+=1
print('Native/exported model parity:',parity,'applicable held-out cases')
print(json.dumps({'split':report['split'],'fullTest':full,'applicableTest':subset,'coverage':report['testCoverage'],'passive':comparison['metrics'],'brierBaseline':baseline,'artifactBytes':(ROOT/'data/bbb-research-model.json').stat().st_size},indent=2))
