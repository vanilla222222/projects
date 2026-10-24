import json,subprocess,hashlib
from pathlib import Path
from rdkit import Chem
from rdkit.Chem import rdMolDescriptors
root=Path(__file__).resolve().parents[1]
r=json.loads((root/'validation/named-library-batch-001.json').read_text());p=root/r['sourceFile'];assert hashlib.sha256(p.read_bytes()).hexdigest()==r['sourceSha256']
s={x['id'].removeprefix('CHEBI:'):x for x in json.loads(p.read_text())['rows']}
a=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./data/library').LIBRARY))"],cwd=root));seen={Chem.MolToSmiles(Chem.MolFromSmiles(x['smiles']),True)for x in a[:r['baseEntries']]}
assert len(a)>=r['total']==13476 and len(r['records'])==5000
for x in r['records']:
 t=s[x['id']];m=Chem.MolFromSmiles(x['librarySmiles']);key=Chem.MolToSmiles(m,True)
 assert x['name']==t['name'] and key not in seen;seen.add(key)
 assert Chem.MolToInchiKey(m)==t['inchiKey']
 assert key==Chem.MolToSmiles(Chem.MolFromSmiles(t['smiles']),True)==Chem.MolToSmiles(Chem.MolFromSmiles(x['browserRoundTripSmiles']),True)
 assert rdMolDescriptors.CalcMolFormula(m)==x['formula']
print('5000 source names, formulas, InChIKeys, unique exact graphs and browser stereo round-trips passed.')
