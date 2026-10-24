#!/usr/bin/env python3
"""Check every imported name and exact isomeric graph against the pinned source."""
import csv
import hashlib
import io
import json
import re
from pathlib import Path
import subprocess
from rdkit import Chem, rdBase
from rdkit.Chem import rdMolDescriptors

ROOT=Path(__file__).resolve().parents[1]
report=json.loads((ROOT/'validation/named-library-import.json').read_text())
raw=(ROOT/'validation/sources/drugcentral-structures-2021-09-01.tsv').read_bytes()
assert hashlib.sha256(raw).hexdigest()==report['sourceSha256']
assert hashlib.sha256((ROOT/'tools/import-named-library.py').read_bytes()).hexdigest()==report['toolSha256']
historic=re.sub(r'  // BEGIN NAMED BATCH 001.*?  // END NAMED BATCH 001\n','',(ROOT/'data/library.js').read_text(),flags=re.S)
assert hashlib.sha256(historic.encode()).hexdigest()==report['librarySha256']
source={r['ID']:r for r in csv.DictReader(io.StringIO(raw.decode()),delimiter='\t')}
entries=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./data/library').LIBRARY))"],cwd=ROOT,text=True))
added=[e for e in entries if e.get('source',{}).get('provider')=='DrugCentral']
base=[e for e in entries[:report['total']] if e not in added]
assert len(added)==report['added']==len(report['records']) and len(added)>2000
assert len(entries)>=report['total'] and len(base)==report['baseEntries']
assert len({e['name'].casefold()for e in entries})==len(entries)
def canonical(m):return Chem.MolToSmiles(m,isomericSmiles=True)
existing={canonical(Chem.MolFromSmiles(e['smiles'])) for e in base}
records={r['sourceId']:r for r in report['records']}
for entry in added:
    provenance=entry['source'];row=source[provenance['id']];record=records[provenance['id']]
    assert entry['name']==row['INN']==record['name']
    mol=Chem.MolFromSmiles(entry['smiles']);original=Chem.MolFromSmiles(row['SMILES'])
    assert mol is not None and original is not None
    key=canonical(mol)
    assert key==canonical(original)==canonical(Chem.MolFromSmiles(record['browserRoundTripSmiles']))
    assert key not in existing,entry['name'];existing.add(key)
    assert rdMolDescriptors.CalcMolFormula(mol)==entry['formula']==record['formula']
    assert Chem.MolToInchiKey(mol)==row['InChIKey']==provenance['inchiKey']
    assert len(Chem.GetMolFrags(mol))==1 and not any(a.GetNumRadicalElectrons()for a in mol.GetAtoms())
    assert provenance['librarySmiles']==entry['smiles']
    assert provenance['cas']==row['CAS_RN']
    assert provenance['url']=='https://drugcentral.org/drugcard/'+row['ID']
assert report['sourceRows']==len(source)==report['added']+sum(report['rejectionCounts'].values())
print(f'RDKit {rdBase.rdkitVersion}: {len(added)} real source names, exact graphs, stereo/isotopes, InChIKeys, formulas, source links and uniqueness verified; {len(entries)} total library entries.')
