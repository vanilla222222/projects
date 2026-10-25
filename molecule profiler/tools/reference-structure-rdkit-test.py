#!/usr/bin/env python3
"""Independent reference checks for graph identity and specified stereochemistry."""
import json,subprocess
from pathlib import Path
from rdkit import Chem
root=Path(__file__).resolve().parents[1]
smiles=['COc1cc(CCN)c(OC)cc1Br','N[C@@H](C)C(=O)O','C/C=C/C','CC[O-]','[13CH3]CO','c1ccncc1','C1CC2CCC1C2','O=C1NCC(=O)N1']
cases=[]
for s in smiles:
 m=Chem.MolFromSmiles(s)
 for i in range(6):cases.append({'query':s,'target':Chem.MolToSmiles(m,doRandom=True),'stereo':True,'expected':'match'})
for a,b in [('N[C@@H](C)C(=O)O','N[C@H](C)C(=O)O'),('C/C=C/C','C/C=C\\C'),('[13CH3]CO','CCO'),('CC[O-]','CCO')]:
 for stereo in [True,False]:
  am,bm=Chem.MolFromSmiles(a),Chem.MolFromSmiles(b)
  if not stereo:Chem.RemoveStereochemistry(am);Chem.RemoveStereochemistry(bm)
  cases.append({'query':a,'target':b,'stereo':stereo,'expected':'match' if Chem.MolToSmiles(am)==Chem.MolToSmiles(bm) else 'no-match'})
script="""for(const f of ['smiles','mol','stereo','fingerprints'])Object.assign(global,require('./js/'+f));const chem=require('./js/reference-structure'),cases=JSON.parse(require('fs').readFileSync(0,'utf8'));for(const c of cases){const result=chem.match(chem.prepare(c.query,{stereo:c.stereo}),c.target);if(result.status!==c.expected)throw Error(JSON.stringify({case:c,result}));}console.log(cases.length+' RDKit-referenced identity/stereo/isotope/charge and randomized serialization cases passed');"""
subprocess.run(['node','-e',script],input=json.dumps(cases).encode(),cwd=root,check=True)
