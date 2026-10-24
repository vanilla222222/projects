#!/usr/bin/env python3
"""Check every new record independently against pinned source identities and baseline."""
import json,subprocess,hashlib,re
from pathlib import Path
from rdkit import Chem,RDLogger
from rdkit.Chem import rdMolDescriptors
RDLogger.DisableLog('rdApp.*');root=Path(__file__).resolve().parents[1]
r=json.loads((root/'validation/named-library-batch-002.json').read_text());p=root/r['sourceFile'];sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert sha(p)==r['sourceSha256'];assert sha(root/'tools/import-named-batch-002.py')==r['toolSha256']
source=json.loads(p.read_text());assert sha(root/'tools/prepare-named-batch-002.py')==source['metadata']['preparationToolSha256'];s={x['id']:x for x in source['rows']}
a=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./data/library').LIBRARY))"],cwd=root));assert len(a)>=r['total']==21037 and r['added']==5000
text=(root/'data/library.js').read_text();text=re.sub(r'  // BEGIN NAMED BATCH ([^\n]+).*?  // END NAMED BATCH \1\n',lambda m:m[0] if m[1] in {'001','amine-study','expansion-50','002'} else '',text,flags=re.S);base=re.sub(r'  // BEGIN NAMED BATCH 002.*?  // END NAMED BATCH 002\n','',text,flags=re.S);assert hashlib.sha256(base.encode()).hexdigest()==r['baseLibrarySha256'];assert hashlib.sha256(text.encode()).hexdigest()==r['librarySha256']
canon=lambda m:Chem.MolToSmiles(m,isomericSmiles=True)
seen={canon(Chem.MolFromSmiles(x['smiles']))for x in a[:r['baseEntries']]};keys={Chem.MolToInchiKey(Chem.MolFromSmiles(x['smiles']))for x in a[:r['baseEntries']]};names={x['name'].casefold()for x in a[:r['baseEntries']]}
actual={x['source']['id']:x for x in a[r['baseEntries']:r['total']]};assert len(actual)==5000
for x in r['records']:
 t=s[x['id']];e=actual[x['id']];m=Chem.MolFromSmiles(x['librarySmiles']);key=canon(m);ik=Chem.MolToInchiKey(m)
 assert x['name']==t['name']==e['name'] and key not in seen and ik not in keys and x['name'].casefold() not in names
 seen.add(key);keys.add(ik);names.add(x['name'].casefold())
 assert ik==t['inchiKey']==e['source']['inchiKey']
 assert key==canon(Chem.MolFromInchi(t['sourceInchi']))==canon(Chem.MolFromSmiles(x['browserRoundTripSmiles']))==e['smiles']
 assert rdMolDescriptors.CalcMolFormula(m)==x['formula']==t['formula']==e['formula']
 assert len(Chem.GetMolFrags(m))==1 and Chem.GetFormalCharge(m)==0 and not any(at.GetNumRadicalElectrons()or at.GetIsotope()for at in m.GetAtoms())
 assert e['source']['batch']=='002' and e['source']['librarySmiles']==e['smiles'] and e['source']['url']==t['sourceUrl']
print('Batch 002: 5000 real source names, unique exact graphs/full InChIKeys, stereo, formulas, browser round trips, provenance and byte-exact preservation of earlier library passed.')
