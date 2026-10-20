#!/usr/bin/env python3
"""Acquire source structures for a small, explicitly curated prodrug graph."""
import concurrent.futures,datetime,hashlib,json,time
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request,urlopen
from rdkit import Chem,rdBase
from rdkit.Chem import rdMolDescriptors
ROOT=Path(__file__).resolve().parents[1];CACHE=Path('/tmp/mp-prodrug-cache');CACHE.mkdir(exist_ok=True)
NCI='https://www.cancer.gov/publications/dictionaries/cancer-drug/def/'
PAIRS=[
 ('Levodopa','levodopa','Dopamine','dopamine','DOPA decarboxylation','CNS precursor; the documented BBB example uses transport and bioactivation, not a promise that lipophilicity alone is sufficient.',NCI+'levodopa'),
 ('Lisdexamfetamine','lisdexamfetamine','Dextroamphetamine','dextroamphetamine','Enzymatic hydrolysis primarily in blood','Parent prodrug and active amphetamine have different elimination kinetics.','https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=da3148af-f9b6-4725-adae-3595b4c7dc4b'),
 ('Valacyclovir','valacyclovir','Acyclovir','acyclovir','Enzymatic hydrolysis','Antiviral precursor; active acyclovir requires further intracellular activation.',NCI+'valacyclovir-hydrochloride'),
 ('Enalapril','enalapril','Enalaprilat','enalaprilat','Ester hydrolysis','ACE inhibitor precursor; this relationship does not establish CNS delivery.',NCI+'enalapril-maleate'),
 ('Prednisone','prednisone','Prednisolone','prednisolone','Reduction of the 11-keto group','Glucocorticoid precursor; conversion and response depend on biological context.','https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=463c7cd2-c973-5c6c-e063-6394a90a09a0'),
 ('Capecitabine','capecitabine','Fluorouracil','fluorouracil','Multistep enzymatic activation','Fluoropyrimidine precursor; 5-FU undergoes further activation to cytotoxic nucleotides.',NCI+'capecitabine'),
 ('Famciclovir','famciclovir','Penciclovir','penciclovir','Deacetylation and oxidation','Antiviral precursor; active penciclovir requires intracellular phosphorylation.','https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=2337e2f6-039b-4f5c-bca4-b0771c4cb632'),
 ('Valganciclovir','valganciclovir','Ganciclovir','ganciclovir','Enzymatic hydrolysis','Antiviral precursor; active ganciclovir requires intracellular phosphorylation.','https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=85177859-e0f5-6d83-17f3-29cae1db96c3')]
def fetch(item):
 name,query=item;url='https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/'+quote(query,safe='')+'/property/IsomericSMILES,MolecularFormula,InChIKey/JSON'
 p=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.json')
 if p.exists():e=json.loads(p.read_text())
 else:
  time.sleep(.4)
  with urlopen(Request(url,headers={'User-Agent':'MoleculeProfiler-CuratedProdrugEvidence/1.0'}),timeout=30) as r:data=json.load(r)
  e={'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'response':data};p.write_text(json.dumps(e)+'\n')
 rows=e['response']['PropertyTable']['Properties']
 if len(rows)!=1:raise ValueError('Ambiguous name '+name)
 r=rows[0];s=r.get('SMILES') or r['IsomericSMILES'];m=Chem.MolFromSmiles(s)
 if m is None or len(Chem.GetMolFrags(m))!=1 or rdMolDescriptors.CalcMolFormula(m)!=r['MolecularFormula']:raise ValueError('Invalid source graph '+name)
 return name,{'name':name,'smiles':s,'formula':r['MolecularFormula'],'inchiKey':r['InChIKey'],'sourceUrl':'https://pubchem.ncbi.nlm.nih.gov/compound/'+str(r['CID'])},{'name':name,'requestUrl':url,**e}
items=list(dict.fromkeys((r[0],r[1]) for r in PAIRS))+list(dict.fromkeys((r[2],r[3]) for r in PAIRS))+[('Aspirin','aspirin')]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(fetch,items))
structures={name:entry for name,entry,_ in results}
rows=[{'prodrug':structures[a],'active':structures[b],'activation':mechanism,'note':note,'sourceUrl':source,'evidenceType':'documented_relationship'} for a,_,b,_,mechanism,note,source in PAIRS]
payload={'schemaVersion':1,'relationships':rows,'halfLifeObservations':[
 {'compound':structures['Aspirin'],'reported':'20 min (parent aspirin)','population':'Product-label pharmacokinetics: aspirin component of oral aspirin/extended-release dipyridamole; not salicylate half-life or platelet-effect duration','sourceUrl':'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=c9a73ec9-e468-46a5-b2c1-99f1f1536585'},
 {'compound':structures['Lisdexamfetamine'],'reported':'Typically less than 1 h','population':'Healthy adults; parent in oral lisdexamfetamine product studies','sourceUrl':PAIRS[1][-1]},
 {'compound':structures['Dextroamphetamine'],'reported':'10–11.3 h','population':'Healthy adults; active dextroamphetamine after oral lisdexamfetamine','sourceUrl':PAIRS[1][-1]}]}
text="'use strict';\n// Curated source relationships; never inferred from a cleavable group.\nconst PHARMACOLOGY_EVIDENCE = "+json.dumps(payload,separators=(',',':'))+";\nif(typeof module!=='undefined'&&module.exports)module.exports={PHARMACOLOGY_EVIDENCE};\n"
(ROOT/'data/pharmacology-evidence.js').write_text(text)
report={'schemaVersion':1,'rdkitVersion':rdBase.rdkitVersion,'toolSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'dataSha256':hashlib.sha256(text.encode()).hexdigest(),'structures':[r for _,_,r in results],
 'scope':'Named PubChem parent structures and manually curated NCI/label relationships. No unverified derivative generation, CNS delivery inference, predicted potency or patient-effect assertion.'}
(ROOT/'validation/pharmacology-evidence-provenance.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'relationships':len(rows),'sourceStructures':len(results)}))
