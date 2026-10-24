#!/usr/bin/env python3
"""Prepare an offline, pinned source selection; never enumerate molecules."""
import gzip,re,json,hashlib,subprocess,html,importlib.util,argparse
from pathlib import Path
from collections import Counter
from rdkit import Chem,RDLogger
from rdkit.Chem import rdMolDescriptors
RDLogger.DisableLog('rdApp.*')
ROOT=Path(__file__).resolve().parents[1]
sp=importlib.util.spec_from_file_location('patterns',ROOT/'tools/library-expansion-50.py');defs=importlib.util.module_from_spec(sp);sp.loader.exec_module(defs)
PAT=[Chem.MolFromSmarts(s)for _,s in defs.DEFINITIONS]
parser=argparse.ArgumentParser();parser.add_argument('--sdf',type=Path,required=True);args=parser.parse_args();source=args.sdf
assert hashlib.sha256(source.read_bytes()).hexdigest()=='4c85cb84a4240167fb80063a1d4cb6b584e1b1ff535afc67efd3d6f2f5a88b49','ChEBI source snapshot checksum mismatch'
baseline=re.sub(r'  // BEGIN NAMED BATCH expansion-50.*?  // END NAMED BATCH expansion-50\n','',(ROOT/'data/library.js').read_text(),flags=re.S)
a=json.loads(subprocess.check_output(['node','-e',"const fs=require('fs'),vm=require('vm'),c={};vm.createContext(c);vm.runInContext(JSON.parse(fs.readFileSync(0,'utf8'))+';globalThis.x=LIBRARY',c);console.log(JSON.stringify({rows:c.x,names:require('./data/library-names').LIBRARY_NAME_METADATA.entries}));"],cwd=ROOT,input=json.dumps(baseline),text=True))
names={e['name'].casefold()for e in a['rows']}|{r['preferredName'].casefold()for r in a['names'].values()}
graphs={Chem.MolToSmiles(Chem.MolFromSmiles(e['smiles']),True)for e in a['rows']};keys={Chem.MolToInchiKey(Chem.MolFromSmiles(e['smiles']))for e in a['rows']}
rows=[];counts=Counter();buf=[]
for line in gzip.open(source,'rt'):
 if line.strip()!='$$$$':buf.append(line);continue
 block=''.join(buf);buf=[];counts['sourceRecords']+=1
 f=dict(re.findall(r'>\s*<([^>]+)>[^\n]*\n(.*?)(?=\n\n|\Z)',block,re.S));name=html.unescape(re.sub('<[^>]+>','',f.get('ChEBI NAME',''))).strip()
 if f.get('STAR')!='3' or not name or name.casefold()in names or re.match(r'^(?:CHEBI|CHEMBL|SCHEMBL|CID|ZINC|AKOS|UNII)[:\s-]*\d',name,re.I)or re.fullmatch(r'(?:[A-Z][a-z]?\d*)+',name):counts['existingOrInvalidName']+=1;continue
 if re.search(r'\b(?:sodium|potassium|calcium|magnesium|lithium|hydrochloride|hydrobromide|tosylate|mesylate|besylate|metilsulfate|metiodide)\b',name,re.I)or 'zwitterion'in name:counts['saltOrChargeFormName']+=1;continue
 m=Chem.MolFromInchi(f.get('INCHI',''))
 if m is None or not 2<=m.GetNumHeavyAtoms()<=120 or len(Chem.GetMolFrags(m))!=1 or Chem.GetFormalCharge(m)!=0 or not any(a.GetAtomicNum()==6 for a in m.GetAtoms())or any(a.GetSymbol()not in {'C','H','N','O','S','P','F','Cl','Br','I'}or a.GetNumRadicalElectrons()or a.GetIsotope()for a in m.GetAtoms()):counts['unsupported']+=1;continue
 s=Chem.MolToSmiles(m,True);key=Chem.MolToInchiKey(m)
 if key!=f.get('INCHIKEY')or rdMolDescriptors.CalcMolFormula(m)!=f.get('FORMULA'):counts['sourceIdentityMismatch']+=1;continue
 if s in graphs or key in keys:counts['existingIdentity']+=1;continue
 matches=[i for i,p in enumerate(PAT)if m.HasSubstructMatch(p)]
 if not matches:counts['noRequestedTag']+=1;continue
 rows.append({'id':f['ChEBI ID'].removeprefix('CHEBI:'),'name':name,'smiles':s,'sourceInchi':f['INCHI'],'originalSourceSmiles':f.get('SMILES'),'inchiKey':key,'formula':f['FORMULA'],'provider':'ChEBI','sourceUrl':'https://www.ebi.ac.uk/chebi/searchId.do?chebiId='+f['ChEBI ID'],'sourceSnapshot':'2026-10-06','license':'CC BY 4.0','matches':matches})
 names.add(name.casefold());keys.add(key);graphs.add(s)
rows.sort(key=lambda r:(len(r['name'])>60,bool(re.search(r'[\[\]{}]',r['name'])),len(r['name']),int(r['id'])))
availability=[sum(i in r['matches']for r in rows)for i in range(50)]
chosen={}
for i in sorted(range(50),key=lambda i:availability[i]):
 for r in [r for r in rows if i in r['matches']][:100]:chosen[r['id']]=r
# Provide enough independently sourced unique additions for a 2500-compound target.
for r in rows:
 if len(chosen)>=4000:break
 chosen.setdefault(r['id'],r)
metadata={'provider':'ChEBI','sourceUrl':'https://ftp.ebi.ac.uk/pub/databases/chebi/SDF/chebi_3_stars.sdf.gz','sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceSnapshot':'2026-10-06','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','attribution':'ChEBI, EMBL-EBI','representation':'Supplied InChI with full InChIKey and formula agreement; original SMILES retained.','counts':dict(counts),'availableByTag':[{'tag':n,'newSourceCandidates':availability[i]}for i,(n,_)in enumerate(defs.DEFINITIONS)]}
p=ROOT/'validation/sources/library-50-selection.json';p.write_text(json.dumps({'metadata':metadata,'rows':list(chosen.values())},ensure_ascii=False)+'\n')
print(json.dumps({'qualifiedPool':len(rows),'selectedForBrowserChecks':len(chosen),'tags':metadata['availableByTag']},indent=2))
