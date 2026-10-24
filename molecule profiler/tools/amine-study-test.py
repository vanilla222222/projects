import json,subprocess,hashlib
from pathlib import Path
from rdkit import Chem
from rdkit.Chem import rdMolDescriptors
root=Path(__file__).resolve().parents[1];r=json.loads((root/'validation/amine-study-import.json').read_text());source=root/r['sourceFile'];assert hashlib.sha256(source.read_bytes()).hexdigest()==r['sourceSha256']
s={x['id'].removeprefix('CHEBI:'):x for x in json.loads(source.read_text())['rows']}
a=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./data/library').LIBRARY))"],cwd=root));assert len(a)>=r['total'] and r['added']==61
seen={Chem.MolToSmiles(Chem.MolFromSmiles(x['smiles']),True)for x in a[:r['baseEntries']]}
for x in r['records']:
 t=s[x['id']];m=Chem.MolFromSmiles(x['librarySmiles']);key=Chem.MolToSmiles(m,True)
 assert x['name']==t['name'] and key not in seen;seen.add(key)
 assert Chem.MolToInchiKey(m)==t['inchiKey']
 assert key==Chem.MolToSmiles(Chem.MolFromInchi(t['sourceInchi']),True)==Chem.MolToSmiles(Chem.MolFromSmiles(x['browserRoundTripSmiles']),True)
 assert rdMolDescriptors.CalcMolFormula(m)==x['formula']==t['formula']
print('61 named source compounds: InChI identity, stereo, formulas, browser round-trips and uniqueness passed.')
import importlib.util
spec=importlib.util.spec_from_file_location('tags',root/'tools/build-library-tags.py');tags=importlib.util.module_from_spec(spec);spec.loader.exec_module(tags)
for smiles,wanted,absent in [('CC(=O)NCCc1c[nH]c2ccccc12','N-acyltryptamines (side-chain amides)','Indole-3-carboxamides'),('NC(=O)c1c[nH]c2ccccc12','Indole-3-carboxamides','N-acyltryptamines (side-chain amides)'),('NC(=O)C(N)Cc1c[nH]c2ccccc12','Tryptophanamides','N-acyltryptamines (side-chain amides)')]:
 t=tags.tags_for({'name':'Test','smiles':smiles});assert 'Family motif: '+wanted in t;assert 'Family motif: '+absent not in t
print('Distinct amide motif classifications passed.')
