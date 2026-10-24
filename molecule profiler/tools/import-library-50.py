#!/usr/bin/env python3
"""Import sourced unique molecules; report measured tag quotas without padding."""
import json,hashlib,subprocess,importlib.util,re
from pathlib import Path
from rdkit import Chem,RDLogger,rdBase
from rdkit.Chem import rdMolDescriptors
RDLogger.DisableLog('rdApp.*');ROOT=Path(__file__).resolve().parents[1]
def loadmod(name,path):
 s=importlib.util.spec_from_file_location(name,ROOT/path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
D=loadmod('defs','tools/library-expansion-50.py').DEFINITIONS;P=[Chem.MolFromSmarts(s)for _,s in D];probe=loadmod('old','tools/import-amine-study.py').PROBE
base=(ROOT/'data/library.js').read_text();base=re.sub(r'  // BEGIN NAMED BATCH expansion-50.*?  // END NAMED BATCH expansion-50\n','',base,flags=re.S)
a=json.loads(subprocess.check_output(['node','-e',"const vm=require('vm'),fs=require('fs'),c={};vm.createContext(c);vm.runInContext(JSON.parse(fs.readFileSync(0,'utf8'))+';globalThis.x=LIBRARY',c);console.log(JSON.stringify(c.x));"],cwd=ROOT,input=json.dumps(base),text=True));names={r['name'].casefold()for r in a};graphs={Chem.MolToSmiles(Chem.MolFromSmiles(r['smiles']),True)for r in a};keys={Chem.MolToInchiKey(Chem.MolFromSmiles(r['smiles']))for r in a}
env=json.loads((ROOT/'validation/sources/library-50-selection.json').read_text());rawpub=json.loads((ROOT/'validation/sources/library-50-pubchem.json').read_text());rows=[]
for r in rawpub['PropertyTable']['Properties']:
 rows.append({'id':str(r['CID']),'name':r.get('Title',''),'smiles':r.get('SMILES',r.get('IsomericSMILES','')),'sourceInchi':r['InChI'],'inchiKey':r['InChIKey'],'formula':r['MolecularFormula'],'provider':'PubChem','sourceUrl':'https://pubchem.ncbi.nlm.nih.gov/compound/'+str(r['CID']),'sourceSnapshot':'2026-10-24','license':'PubChem record provenance; underlying source terms may apply'})
rows+=env['rows'];pending=[];rejected=[]
for r in rows:
 m=Chem.MolFromInchi(r['sourceInchi']);n=r['name'];reason=None
 if not n or n.casefold()in names or re.match(r'^(?:CHEMBL|SCHEMBL|CID|ZINC|AKOS|UNII)[: _-]*\d',n,re.I):reason='Existing or identifier-only name'
 elif m is None or len(Chem.GetMolFrags(m))!=1 or Chem.GetFormalCharge(m)!=0 or m.GetNumAtoms()>120 or any(at.GetNumRadicalElectrons()or at.GetIsotope()or at.GetSymbol()not in {'C','H','N','O','S','P','F','Cl','Br','I'}for at in m.GetAtoms()):reason='Unsupported, salt, isotope or charged structure'
 elif Chem.MolToInchiKey(m)!=r['inchiKey']or rdMolDescriptors.CalcMolFormula(m)!=r['formula']:reason='Source identity disagreement'
 if reason:rejected.append({'name':n,'reason':reason});continue
 s=Chem.MolToSmiles(m,True);matches=[i for i,p in enumerate(P)if m.HasSubstructMatch(p)]
 if s in graphs or r['inchiKey']in keys or not matches:rejected.append({'name':n,'reason':'Existing identity or no new tag match'});continue
 pending.append((r,s,matches));names.add(n.casefold());graphs.add(s);keys.add(r['inchiKey'])
valid=[]
for start in range(0,len(pending),200):
 batch=pending[start:start+200];checks=json.loads(subprocess.check_output(['node','-e',probe],cwd=ROOT,input=json.dumps([s for _,s,_ in batch]),text=True))
 for (r,s,matches),c in zip(batch,checks):
  cm=Chem.MolFromSmiles(c.get('serialized',''))
  if c.get('finite')and c.get('formula')==r['formula']and cm is not None and Chem.MolToSmiles(cm,True)==s:valid.append((r,s,matches,c['serialized']))
  else:rejected.append({'name':r['name'],'reason':'Browser formula/descriptor/identity check failed'})
 print('Checked',min(start+200,len(pending)),'valid',len(valid),flush=True)
chosen={};available=[sum(i in r[2]for r in valid)for i in range(50)]
for i in sorted(range(50),key=lambda i:available[i]):
 for j,v in enumerate(valid):
  if sum(i in valid[k][2]for k in chosen)>=50:break
  if i in v[2]:chosen[j]=v
for j,v in enumerate(valid):
 if len(chosen)>=2500:break
 chosen.setdefault(j,v)
accepted=[];records=[]
for r,s,matches,serialized in chosen.values():
 source={'provider':r['provider'],'id':r['id'],'url':r['sourceUrl'],'snapshot':r['sourceSnapshot'],'inchiKey':r['inchiKey'],'license':r['license'],'nameKind':r['provider']+' source name','librarySmiles':s,'batch':'expansion-50'}
 accepted.append({'name':r['name'],'cls':r['provider']+' named compound','formula':r['formula'],'smiles':s,'source':source});records.append({**r,'librarySmiles':s,'browserRoundTripSmiles':serialized,'matchedTags':[D[i][0]for i in matches]})
coverage=[]
for i,(name,pattern)in enumerate(D):
 new=[r['name']for r in records if name in r['matchedTags']];coverage.append({'tag':'Family motif: '+name,'targetNew':50,'newCount':len(new),'shortfall':max(0,50-len(new)),'checkedAvailable':available[i],'newNames':new})
text=base.replace('\n];','\n  // BEGIN NAMED BATCH expansion-50\n'+'\n'.join('  '+json.dumps(r,ensure_ascii=False,separators=(',',':'))+','for r in accepted)+'\n  // END NAMED BATCH expansion-50\n];')
sha=lambda b:hashlib.sha256(b).hexdigest();report={'batch':'expansion-50','baseEntries':len(a),'added':len(accepted),'total':len(a)+len(accepted),'targetDistinctNew':2500,'baseLibrarySha256':sha(base.encode()),'librarySha256':sha(text.encode()),'rdkitVersion':rdBase.rdkitVersion,'sourceHashes':{f:sha((ROOT/f).read_bytes())for f in ['tools/import-library-50.py','tools/library-expansion-50.py','validation/sources/library-50-selection.json','validation/sources/library-50-pubchem.json']},'coverage':coverage,'records':records,'rejected':rejected,'scope':'Source-named compounds and structural matches only. Quota deficits remain explicit. New counts can overlap between tags; distinct additions are counted once. Source consistency and browser parity do not establish experimental activity, efficacy or safety.'}
(ROOT/'data/library.js').write_text(text);(ROOT/'validation/library-50-import.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n');p=ROOT/'validation/library-name-provenance.json';p.write_text(re.sub(r'("librarySha256":\s*")[^"]+(\")',lambda m:m[1]+report['librarySha256']+m[2],p.read_text(),count=1))
print(json.dumps({'added':len(accepted),'total':report['total'],'tagsAtQuota':sum(c['newCount']>=50 for c in coverage),'coverage':[{k:c[k]for k in ['tag','newCount','shortfall']}for c in coverage]},indent=2))
