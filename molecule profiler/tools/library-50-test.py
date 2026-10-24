"""Independent full source, uniqueness, representation and per-tag quota checks."""
import json,hashlib,subprocess,importlib.util,gzip,re,html
from pathlib import Path
from rdkit import Chem,RDLogger
from rdkit.Chem import rdMolDescriptors
RDLogger.DisableLog('rdApp.*');root=Path(__file__).resolve().parents[1];r=json.loads((root/'validation/library-50-import.json').read_text())
for f,h in r['sourceHashes'].items():assert hashlib.sha256((root/f).read_bytes()).hexdigest()==h,f
spec=importlib.util.spec_from_file_location('defs',root/'tools/library-expansion-50.py');d=importlib.util.module_from_spec(spec);spec.loader.exec_module(d);patterns={n:Chem.MolFromSmarts(s)for n,s in d.DEFINITIONS};assert len(patterns)==50
rows=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./data/library').LIBRARY))"],cwd=root));base=rows[:r['baseEntries']];new=rows[r['baseEntries']:r['total']];assert len(new)==r['added']==2500 and len(rows)>=r['total']
text=(root/'data/library.js').read_text();text=re.sub(r'  // BEGIN NAMED BATCH ([^\n]+).*?  // END NAMED BATCH \1\n',lambda m:m[0] if m[1] in {'001','amine-study','expansion-50'} else '',text,flags=re.S);before=re.sub(r'  // BEGIN NAMED BATCH expansion-50.*?  // END NAMED BATCH expansion-50\n','',text,flags=re.S);assert hashlib.sha256(before.encode()).hexdigest()==r['baseLibrarySha256']
seen={Chem.MolToSmiles(Chem.MolFromSmiles(x['smiles']),True)for x in base};names={x['name'].casefold()for x in base};by={(x['source']['provider'],x['source']['id']):x for x in new}
source=json.loads((root/'validation/sources/library-50-selection.json').read_text());sources={('ChEBI',x['id']):x for x in source['rows']}
for x in json.loads((root/'validation/sources/library-50-pubchem.json').read_text())['PropertyTable']['Properties']:sources[('PubChem',str(x['CID']))]={'name':x['Title'],'sourceInchi':x['InChI'],'inchiKey':x['InChIKey'],'formula':x['MolecularFormula']}
counts={n:0 for n in patterns}
for x in r['records']:
 key=(x['provider'],x['id']);actual=by[key];s=sources[key];assert actual['name']==x['name']==s['name']
 m=Chem.MolFromSmiles(actual['smiles']);graph=Chem.MolToSmiles(m,True);assert graph not in seen and actual['name'].casefold()not in names;seen.add(graph);names.add(actual['name'].casefold())
 assert graph==Chem.MolToSmiles(Chem.MolFromInchi(s['sourceInchi']),True)==Chem.MolToSmiles(Chem.MolFromSmiles(x['browserRoundTripSmiles']),True)
 assert rdMolDescriptors.CalcMolFormula(m)==s['formula']==actual['formula'] and Chem.MolToInchiKey(m)==s['inchiKey']
 matches={n for n,p in patterns.items()if m.HasSubstructMatch(p)};assert matches==set(x['matchedTags'])
 for name in matches:counts[name]+=1
for c in r['coverage']:
 n=c['tag'].removeprefix('Family motif: ');assert c['newCount']==counts[n]and c['shortfall']==max(0,50-counts[n])
lookup={x['name']:Chem.MolFromSmiles(x['smiles'])for x in rows}
for name,tag in [('25I-NBOMe','NBOMe phenethylamines'),('25I-NBOH','NBOH phenethylamines'),('25D-NBF','NBF phenethylamines'),('25B-NBMD','NBMD-related phenethylamines'),('Caffeine','Xanthines'),('Testosterone','Steroid carbon-ring scaffolds')]:assert lookup[name].HasSubstructMatch(patterns[tag]),(name,tag)
assert not lookup['25I-NBOMe'].HasSubstructMatch(patterns['NBOH phenethylamines'])
assert not lookup['25I-NBOH'].HasSubstructMatch(patterns['NBOMe phenethylamines'])
print('Independent QA: 2500 source names, exact identities/stereo, formulas, novelty, 50 tag assignments and honest quota counts passed.')
