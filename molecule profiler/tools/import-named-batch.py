#!/usr/bin/env python3
"""Import a bounded batch of sourced names; no structure/name generation."""
import argparse,hashlib,json,re,subprocess
from pathlib import Path
from collections import Counter
from rdkit import Chem,rdBase,RDLogger
from rdkit.Chem import rdMolDescriptors
ROOT=Path(__file__).resolve().parents[1]
BATCH='001';LIMIT=5000
START='  // BEGIN NAMED BATCH '+BATCH
END='  // END NAMED BATCH '+BATCH
sha=lambda b:hashlib.sha256(b).hexdigest()
def node(code,data):return json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT,input=json.dumps(data),text=True))
def canonical(m):return Chem.MolToSmiles(m,isomericSmiles=True)
PROBE=r"""
const fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({console});
for(const f of ['smiles','mol','smarts','stereo','transform','descriptors','rules'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),context);
context.rows=JSON.parse(fs.readFileSync(0,'utf8'));
console.log(JSON.stringify(vm.runInContext(`rows.map(smiles=>{try{
 const mol=buildMolecule(parseSmiles(smiles)),d=describe(mol);
 const serialized=writeSmiles({atoms:mol.atoms.map(a=>({...a,order:a.order?.slice(),neighbors:[],rings:[]})),bonds:mol.bonds.map(b=>({...b}))});
 return {formula:d.formula,serialized,finite:['mw','exactMass','tpsa','logp','mr','hbdStrict','hbaStrict','rotatableBonds'].every(k=>Number.isFinite(d[k]))};
}catch(e){return {error:e.message};}})`,context)));
"""
def run(path,write=False):
 raw=path.read_bytes();envelope=json.loads(raw);rows=envelope['rows']
 original=(ROOT/'data/library.js').read_text();base=re.sub(re.escape(START)+r'.*?'+re.escape(END)+r'\n','',original,flags=re.S)
 entries=node("const vm=require('node:vm'),fs=require('node:fs'),c={};vm.createContext(c);vm.runInContext(JSON.parse(fs.readFileSync(0,'utf8'))+';globalThis.rows=LIBRARY;',c);console.log(JSON.stringify(c.rows));",base)
 metadata=node("console.log(JSON.stringify(require('./data/library-names').LIBRARY_NAME_METADATA));",None)
 names={e['name'].casefold()for e in entries}|{r['preferredName'].casefold()for r in metadata['entries'].values()}
 graphs={canonical(Chem.MolFromSmiles(e['smiles']))for e in entries}
 accepted=[];rejected=[];records=[]
 def reject(r,reason):rejected.append({'id':r['id'],'name':r['name'],'reason':reason})
 for start in range(0,len(rows),200):
  pending=[]
  for r in rows[start:start+200]:
   if len(accepted)>=LIMIT:break
   name=r['name'].strip()
   if not name or re.match(r'^(?:CHEBI|CHEMBL|CID|ZINC|DTXSID|SCHEMBL|AKOS|UNII)[ :_-]*\d',name,re.I)or re.fullmatch(r'(?:[A-Z][a-z]?\d*)+',name)or re.fullmatch(r'\d{2,7}-\d\d-\d',name)or any(c in name for c in '\n\r\t'):
    reject(r,'Missing or identifier/formula-only name');continue
   if name.casefold()in names:reject(r,'Existing name');continue
   m=Chem.MolFromSmiles(r['smiles'])
   if m is None:reject(r,'RDKit parse failure');continue
   if len(Chem.GetMolFrags(m))!=1 or m.GetNumAtoms()>120:reject(r,'Disconnected or exceeds browser atom budget');continue
   if not any(a.GetAtomicNum()==6 for a in m.GetAtoms())or any(a.GetSymbol()not in {'C','H','N','O','S','P','F','Cl','Br','I'}or a.GetNumRadicalElectrons()for a in m.GetAtoms()):reject(r,'Unsupported element or open-shell chemistry');continue
   if Chem.MolToInchiKey(m)!=r['inchiKey']:reject(r,'Source InChIKey mismatch');continue
   s=canonical(m)
   if s in graphs:reject(r,'Existing exact isomeric graph');continue
   pending.append((r,m,s))
  checks=node(PROBE,[s for _,_,s in pending]) if pending else []
  for (r,m,s),check in zip(pending,checks):
   if len(accepted)>=LIMIT:break
   if check.get('error')or not check.get('finite'):reject(r,'Browser descriptor or serialization unavailable');continue
   formula=rdMolDescriptors.CalcMolFormula(m)
   if formula!=check['formula']:reject(r,'Browser/native formula disagreement');continue
   p=Chem.MolFromSmiles(check['serialized'])
   if p is None or canonical(p)!=s:reject(r,'Browser graph/stereo/isotope mismatch');continue
   if s in graphs or r['name'].casefold()in names:reject(r,'Duplicate in batch');continue
   source={'provider':r['provider'],'id':str(r['id']).removeprefix('CHEBI:'),'url':r['sourceUrl'],'snapshot':r['sourceSnapshot'],'inchiKey':r['inchiKey'],'license':r['license'],'nameKind':'ChEBI curated name','librarySmiles':s,'batch':BATCH}
   accepted.append({'name':r['name'],'cls':'ChEBI named compound','formula':formula,'smiles':s,'source':source})
   records.append({'id':source['id'],'name':r['name'],'sourceSmiles':r['smiles'],'sourceInchiKey':r['inchiKey'],'sourceFormula':r.get('formula'),'librarySmiles':s,'formula':formula,'browserRoundTripSmiles':check['serialized']})
   names.add(r['name'].casefold());graphs.add(s)
  if len(accepted)>=LIMIT:break
 if len(accepted)!=LIMIT:raise ValueError(f'Only {len(accepted)} qualified; do not pad batch')
 text=base.replace('\n];','\n'+START+'\n'+'\n'.join('  '+json.dumps(e,ensure_ascii=False,separators=(',',':'))+','for e in accepted)+'\n'+END+'\n];')
 report={'schemaVersion':1,'batch':BATCH,'target':LIMIT,'added':len(accepted),'baseEntries':len(entries),'total':len(entries)+len(accepted),'baseLibrarySha256':sha(base.encode()),'librarySha256':sha(text.encode()),'sourceFile':str(path.resolve().relative_to(ROOT)),'sourceSha256':sha(raw),'sourceMetadata':envelope['metadata'],'sourceRows':len(rows),'rdkitVersion':rdBase.rdkitVersion,'toolSha256':sha(Path(__file__).read_bytes()),'records':records,'rejectionCounts':dict(Counter(r['reason']for r in rejected)),'rejected':rejected,'scope':'Names and exact supplied structures from source snapshot; not measured biological activity, current approval, safety, or experimental identity verification. No generated analogues, neutralization, salt stripping or inferred stereo.'}
 if write:
  (ROOT/'data/library.js').write_text(text)
  (ROOT/'validation/named-library-batch-001.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
  p=ROOT/'validation/library-name-provenance.json';p.write_text(re.sub(r'("librarySha256":\s*")[^"]+(\")',lambda m:m[1]+report['librarySha256']+m[2],p.read_text(),count=1))
 print(json.dumps({k:report[k]for k in ['added','total','rejectionCounts']},indent=2));return report
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('source',type=Path);p.add_argument('--write',action='store_true');a=p.parse_args();RDLogger.DisableLog('rdApp.*');run(a.source,a.write)
