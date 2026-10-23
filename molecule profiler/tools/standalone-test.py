"""Independent engine and HTTP contract regression checks."""
import argparse,json,math,sys,threading,urllib.request,urllib.error
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'standalone'))
from engine import analysis,conformers,screen,fragments,replace,molecule,docking
from rdkit import Chem
from server import Handler,ROOT
from http.server import ThreadingHTTPServer
from functools import partial

def rejects(call):
 try:call()
 except (ValueError,TypeError):return
 raise AssertionError('Expected input rejection')

r=analysis({'smiles':'CC(=O)Oc1ccccc1C(=O)O'})
assert r['formula']=='C9H8O4' and 0<r['qed']<1 and 1<=r['syntheticAccessibility']<=10
assert math.isclose(r['skinLogKp'],.71*r['logp']-.0061*r['mw']-6.3)
assert analysis({'smiles':'C[NH3+]'})['skinLogKp'] is None
assert analysis({'smiles':'O=[N+]([O-])c1ccccc1'})['alerts']
for smiles in ['bad','CC.O','[Na+]','[CH3]','C'*121]:rejects(lambda:molecule(smiles))
for count in [0,11,1.5,True,'5',None]:rejects(lambda:conformers({'smiles':'CCO','count':count}))
r=conformers({'smiles':'CCO','count':2})
assert r['method']=='MMFF94' and len(r['conformers'])==2 and len(r['forcefield']['atoms'])==9
assert abs(sum(a['partialCharge'] for a in r['forcefield']['atoms']))<1e-6
assert all(Chem.MolFromMolBlock(c['molblock']) is not None and math.isfinite(c['energy']) for c in r['conformers'])
r=screen({'smiles':'CCO','references':[{'name':'self','smiles':'CCO'},{'name':'bad','smiles':'bad'}]})
assert r['rows'][0]['tanimoto2D']==1 and r['rows'][0]['shape3D']>.999 and 'error' in r['rows'][1]
assert len(fragments({'smiles':'CCCOCc1ccccc1'})['fragments'])>1
r=replace({'smiles':'COc1ccccc1','query':'[CH3]O','replacement':'F'})
assert len(r['products'])==1 and r['products'][0]['smiles']=='Fc1ccccc1'
r=replace({'smiles':'C[C@H](O)CC[C@H](F)Cl','query':'[OH]','replacement':'N'})
assert r['products'][0]['attachmentStereochemistryCleared']
assert len(Chem.FindMolChiralCenters(Chem.MolFromSmiles(r['products'][0]['smiles']),includeUnassigned=False))==1
assert not replace({'smiles':'C1CCCCC1','query':'CC','replacement':'F'})['products']

server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(ROOT)))
thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
base='http://127.0.0.1:'+str(server.server_port)
def request(path,data=None,origin=None):
 headers={'Content-Type':'application/json'}
 if origin:headers['Origin']=origin
 req=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),headers=headers)
 try:
  with urllib.request.urlopen(req,timeout=30) as response:return response.status,json.load(response)
 except urllib.error.HTTPError as error:return error.code,json.load(error)
try:
 assert request('/api/status')[1]['engine']=='independent-local-v1'
 status,result=request('/api/analyze',{'smiles':'CCO'});assert status==200 and result['result']['formula']=='C2H6O'
 assert request('/api/analyze',{'smiles':'CC.O'})[0]==400
 assert request('/api/arbitrary',{})[0]==404
 assert request('/api/analyze',[],origin=base)[0]==400
 assert request('/api/analyze',{},origin='https://foreign.example')[0]==403
 with urllib.request.urlopen(base+'/') as response:assert b'Independent research workbench' in response.read()
finally:server.shutdown();server.server_close()

parser=argparse.ArgumentParser();parser.add_argument('--receptor',type=Path);parser.add_argument('--center',nargs=3,type=float,default=[15.190,53.903,16.917]);args=parser.parse_args()
if args.receptor:
 r=docking({'smiles':'CCO','receptor':args.receptor.read_text(),'center':args.center,'size':[12,12,12]})
 assert 'MODEL' in r['poses'] and 'REMARK VINA RESULT:' in r['poses'] and r['energies']
 print('Real Vina docking and Meeko ligand preparation passed.')
print('Standalone engine and HTTP contract checks passed.')
