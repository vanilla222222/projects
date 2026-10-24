#!/usr/bin/env python3
"""Select additional source-named ChEBI identities, without generating chemistry."""
import argparse,gzip,hashlib,html,importlib.util,json,re,subprocess
from pathlib import Path
from collections import Counter
from rdkit import Chem,RDLogger
from rdkit.Chem import rdMolDescriptors
ROOT=Path(__file__).resolve().parents[1];RDLogger.DisableLog('rdApp.*')
def main():
 p=argparse.ArgumentParser();p.add_argument('--sdf',required=True,type=Path);args=p.parse_args();source=args.sdf
 digest=hashlib.sha256(source.read_bytes()).hexdigest()
 if digest!='4c85cb84a4240167fb80063a1d4cb6b584e1b1ff535afc67efd3d6f2f5a88b49':raise ValueError('Unexpected source snapshot')
 data=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify({library:require('./data/library').LIBRARY,names:require('./data/library-names').LIBRARY_NAME_METADATA.entries}))"],cwd=ROOT,text=True))
 names={e['name'].casefold()for e in data['library']}|{r['preferredName'].casefold()for r in data['names'].values()};graphs=set();keys=set()
 for e in data['library']:
  m=Chem.MolFromSmiles(e['smiles']);graphs.add(Chem.MolToSmiles(m,True));keys.add(Chem.MolToInchiKey(m))
 rows=[];counts=Counter();buf=[]
 for line in gzip.open(source,'rt'):
  if line.strip()!='$$$$':buf.append(line);continue
  block=''.join(buf);buf=[];counts['sourceRecords']+=1
  f=dict(re.findall(r'>\s*<([^>]+)>[^\n]*\n(.*?)(?=\n\n|\Z)',block,re.S));name=html.unescape(re.sub('<[^>]+>','',f.get('ChEBI NAME',''))).strip()
  if f.get('STAR')!='3' or not name or name.casefold()in names or re.match(r'^(?:CHEBI|CHEMBL|SCHEMBL|CID|ZINC|DTXSID|AKOS|UNII)[:\s_-]*\d',name,re.I)or re.fullmatch(r'(?:[A-Z][a-z]?\d*)+',name)or re.fullmatch(r'\d{2,7}-\d\d-\d',name)or any(c in name for c in '\r\n\t'):counts['existingOrInvalidName']+=1;continue
  if re.search(r'\b(?:sodium|potassium|calcium|magnesium|lithium|hydrochloride|hydrobromide|tosylate|mesylate|besylate|metilsulfate|metiodide)\b',name,re.I)or 'zwitterion'in name:counts['saltOrChargeFormName']+=1;continue
  m=Chem.MolFromInchi(f.get('INCHI',''))
  if m is None or not 2<=m.GetNumHeavyAtoms()<=120 or len(Chem.GetMolFrags(m))!=1 or Chem.GetFormalCharge(m)!=0 or not any(a.GetAtomicNum()==6 for a in m.GetAtoms())or any(a.GetSymbol()not in {'C','H','N','O','S','P','F','Cl','Br','I'}or a.GetNumRadicalElectrons()or a.GetIsotope()for a in m.GetAtoms()):counts['unsupported']+=1;continue
  s=Chem.MolToSmiles(m,True);key=Chem.MolToInchiKey(m)
  if key!=f.get('INCHIKEY')or rdMolDescriptors.CalcMolFormula(m)!=f.get('FORMULA'):counts['sourceIdentityMismatch']+=1;continue
  if s in graphs or key in keys:counts['existingIdentity']+=1;continue
  rows.append({'id':f['ChEBI ID'].removeprefix('CHEBI:'),'name':name,'sourceInchi':f['INCHI'],'originalSourceSmiles':f.get('SMILES'),'smiles':s,'inchiKey':key,'formula':f['FORMULA'],'provider':'ChEBI','sourceUrl':'https://www.ebi.ac.uk/chebi/searchId.do?chebiId='+f['ChEBI ID'],'sourceSnapshot':'2026-10-06','license':'CC BY 4.0'})
  names.add(name.casefold());graphs.add(s);keys.add(key)
 rows.sort(key=lambda r:(len(r['name'])>60,bool(re.search(r'[\[\]{}]',r['name'])),len(r['name']),int(r['id'])))
 # Spread the source selection across established structural families before filling.
 spec=importlib.util.spec_from_file_location('tags',ROOT/'tools/build-library-tags.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
 pools=[[]for _ in mod.FAMILY_MOTIFS]
 for i,r in enumerate(rows):
  m=Chem.MolFromSmiles(r['smiles'])
  for j,(_,pattern)in enumerate(mod.FAMILY_MOTIFS):
   if m.HasSubstructMatch(pattern):pools[j].append(i)
 selected={}
 for step in range(100):
  for pool in pools:
   if step<len(pool):selected.setdefault(pool[step],None)
   if len(selected)>=8000:break
  if len(selected)>=8000:break
 for i in range(len(rows)):
  if len(selected)>=10000:break
  selected.setdefault(i,None)
 metadata={'provider':'ChEBI','sourceUrl':'https://ftp.ebi.ac.uk/pub/databases/chebi/SDF/chebi_3_stars.sdf.gz','sourceSha256':digest,'sourceSnapshot':'2026-10-06','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','attribution':'ChEBI, EMBL-EBI','representation':'Source InChI with exact full InChIKey and formula agreement. Original source SMILES retained as evidence. No graph enumeration.','selection':'Round-robin across existing structural motifs, then shortest source names; source names include systematic names.','counts':dict(counts),'eligiblePool':len(rows),'preparationToolSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
 if len(selected)<5000:raise ValueError('Insufficient unique qualified source identities: '+str(len(selected)))
 path=ROOT/'validation/sources/chebi-named-batch-002.json';path.write_text(json.dumps({'metadata':metadata,'rows':[rows[i]for i in selected]},ensure_ascii=False,separators=(',',':'))+'\n');print(json.dumps({'eligiblePool':len(rows),'selected':len(selected),'counts':dict(counts)}))
if __name__=='__main__':main()
