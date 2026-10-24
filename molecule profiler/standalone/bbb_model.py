"""Non-executable numerical artifact; local BBBP-label research classifier."""
import base64,hashlib,json,math,zlib
from functools import lru_cache
from pathlib import Path
from rdkit import Chem,DataStructs,rdBase
from rdkit.Chem import Crippen,Descriptors,rdMolDescriptors,rdFingerprintGenerator
ROOT=Path(__file__).resolve().parents[1]
@lru_cache(maxsize=1)
def load():
 model=json.loads((ROOT/'data/bbb-research-model.json').read_text())
 if model['schemaVersion']!=1 or hashlib.sha256(model['payload'].encode()).hexdigest()!=model['payloadSha256']:raise ValueError('BBB model integrity check failed.')
 payload=json.loads(zlib.decompress(base64.b64decode(model['payload'])))
 model['trees']=payload['trees'];model['fingerprints']=[DataStructs.CreateFromBinaryText(bytes.fromhex(v)) for v in payload['domainFingerprints']]
 return model

def predict(data):
 smiles=data.get('smiles');result={'modelId':'bbb-scaffold-rf-v1','available':False,'probability':None,'label':None,'scope':'Experimental probability of the historical BBBP dataset label for supported neutral structures. Not a probability of brain penetration in a person. Passive permeability, transporter activity and exposure are not separated by these labels.'}
 if not isinstance(smiles,str) or not smiles or len(smiles)>4000:return {**result,'reason':'Provide a bounded SMILES string.'}
 m=Chem.MolFromSmiles(smiles)
 if m is None:return {**result,'reason':'Invalid molecular structure.'}
 if len(Chem.GetMolFrags(m))!=1 or any(a.GetFormalCharge() for a in m.GetAtoms()):return {**result,'reason':'Charged or disconnected input is outside this model; no neutralization is performed.'}
 if not 1<=m.GetNumHeavyAtoms()<=120 or any(a.GetAtomicNum() not in (1,6,7,8,9,15,16,17,35,53) or a.GetNumRadicalElectrons() for a in m.GetAtoms()):return {**result,'reason':'Unsupported elements, radicals or molecular size.'}
 model=load()
 if model['rdkit']!=rdBase.rdkitVersion:return {**result,'reason':'RDKit version differs from model training; prediction withheld for reproducibility.'}
 fp=rdFingerprintGenerator.GetMorganGenerator(radius=2,fpSize=2048).GetFingerprint(m);similarity=max(DataStructs.BulkTanimotoSimilarity(fp,model['fingerprints']));d=[Descriptors.MolWt(m),Crippen.MolLogP(m),rdMolDescriptors.CalcTPSA(m,includeSandP=True)]
 domain={'maximumTrainingSimilarity':similarity,'minimumSimilarity':model['minimumSimilarity'],'descriptors':dict(zip(['mw','wlogp','tpsa'],d))}
 if similarity<model['minimumSimilarity'] or any(x<lo or x>hi for x,lo,hi in zip(d,*model['ranges'])):return {**result,'domain':domain,'reason':'Outside fingerprint-similarity or descriptor applicability bounds. No class or probability is shown.'}
 probs=[]
 for tree in model['trees']:
  i=0
  while tree[i][0]!=-1:
   left,right,feature,threshold,_=tree[i];i=left if int(fp[feature])<=threshold else right
  probs.append(tree[i][4])
 raw=min(1-1e-6,max(1e-6,sum(probs)/len(probs)));a,b=model['calibration'];z=a*math.log(raw/(1-raw))+b;p=1/(1+math.exp(-max(-700,min(700,z))))
 return {**result,'available':True,'probability':p,'threshold':model['threshold'],'label':'Dataset penetrant label' if p>=model['threshold'] else 'Dataset nonpenetrant label','domain':domain,'stereochemistry':'Fingerprints ignore stereochemistry; no stereoisomer-specific performance is claimed.','validation':'Internal scaffold-held-out validation; see the bundled report for coverage and errors.'}
