#!/usr/bin/env python3
"""Exact-graph, human-receptor source classifications; never infer actions from affinity."""
import argparse,csv,hashlib,html,json,re,subprocess
from pathlib import Path
from collections import defaultdict,Counter
from rdkit import Chem,rdBase
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'validation/sources/receptor-actions-iuphar.json'
ACTIONS={'agonist':'Agonist','full_agonist':'Full agonist','partial_agonist':'Partial agonist','antagonist':'Antagonist','inverse_agonist':'Inverse agonist','modulator':'Modulator','pam':'Positive allosteric modulator (PAM)','nam':'Negative allosteric modulator (NAM)','neutral_allosteric':'Neutral allosteric ligand','channel_blocker':'Channel blocker','channel_opener':'Channel opener','inhibitor':'Inhibitor','activator':'Activator','biased':'Biased agonist'}
def clean(s):return html.unescape(re.sub('<[^>]+>','',s or '')).strip()
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def graph(s):
 m=Chem.MolFromSmiles(s or '')
 return Chem.MolToSmiles(m,isomericSmiles=True) if m else None

def classify(row):
 """Prefer explicit Action over broad Type; preserve ambiguous classifications as unknown."""
 t,a=row['Type'],row['Action']
 direct={'Full agonist':['agonist','full_agonist'],'Agonist':['agonist'],'Partial agonist':['agonist','partial_agonist'],'Inverse agonist':['inverse_agonist'],'Antagonist':['antagonist'],'Biased agonist':['agonist','biased']}
 if t=='Allosteric modulator':
  return ['modulator']+({'Positive':['pam'],'Potentiation':['pam'],'Negative':['nam'],'Neutral':['neutral_allosteric']}.get(a,direct.get(a,[])))
 if t=='Channel blocker':return ['channel_blocker']
 if a in direct:return direct[a]
 if t=='Inhibitor' and a in {'Inhibition','Competitive','Non-competitive','Irreversible inhibition','Feedback inhibition'}:return ['inhibitor']
 if t=='Activator' and a in {'Activation','Potentiation','Positive'}:return ['activator']
 return []

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--source-dir',type=Path);args=ap.parse_args()
 data=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify({library:require('./data/library').LIBRARY,catalog:require('./data/receptor-catalog').RECEPTOR_REFERENCE_CATALOG,annotations:require('./data/receptor-ligand-annotations').RECEPTOR_LIGAND_ANNOTATIONS,targets:require('./data/targets').TARGETS}))"],cwd=ROOT,text=True))
 library,catalog=data['library'],data['catalog']['receptors'];bygraph=defaultdict(list)
 for e in library:
  g=graph(e['smiles'])
  if g:bygraph[g].append(e)
 if args.source_dir:
  raw={};versions={};hashes={}
  for file in ['interactions.csv','ligands.csv','targets_and_families.csv']:
   p=args.source_dir/('iuphar-'+file)
   with p.open() as f:versions[file]=next(f).strip();raw[file]=list(csv.DictReader(f))
   hashes[file]=digest(p)
  if len(set(versions.values()))!=1:raise ValueError('Mixed source releases')
  targetmap=defaultdict(set)
  for t in raw['targets_and_families.csv']:
   # A subunit record is not promoted to an entire heteromeric complex.
   for r in catalog:
    if (len(r['genes'])==1 and t['HGNC symbol']==r['genes'][0]) or (r['kind']=='Regulatory subunit' and t['HGNC symbol']==r['id']):targetmap[t['Target id']].add(r['id'])
   # These catalog IDs denote broad receptor groups, not one fixed heteromer.
   gene=t['HGNC symbol']
   for rid,prefix in [('GABAA','GABR'),('NMDA','GRIN'),('AMPA','GRIA'),('KAINATE','GRIK'),('GLYR','GLR'),('HTR3A','HTR3')]:
    if gene.startswith(prefix) and (rid!='GABAA' or gene.startswith(('GABRA','GABRB','GABRG','GABRD','GABRE','GABRP','GABRQ'))):targetmap[t['Target id']].add(rid)
  # Explicit source complex IDs; retain source target name and ID on every record.
  targetmap['428']={'GLYR'};targetmap['242']={'GABAB'};targetmap['378']={'HTR3A'};targetmap['379']={'HTR3A'}
  matched={r['Ligand ID']:r for r in raw['ligands.csv'] if r['SMILES'] and graph(r['SMILES']) in bygraph}
  rows=[r for r in raw['interactions.csv'] if r['Target Species']=='Human' and r['Target ID'] in targetmap and r['Ligand ID'] in matched]
  ids={r['Ligand ID'] for r in rows};tids={r['Target ID'] for r in rows}
  snapshot={'provider':'IUPHAR/BPS Guide to PHARMACOLOGY','version':versions['interactions.csv'],'retrieved':'2026-10-24','license':'CC BY-SA 4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/','sourceUrls':{k:'https://www.guidetopharmacology.org/DATA/'+k for k in raw},'rawSha256':hashes,'rawCounts':{k:len(v) for k,v in raw.items()},'mappingScope':'Exact human HGNC gene mapping for single targets and explicit complex IDs. GABAA/NMDA/AMPA/KAINATE/GLYR/HTR3A are broad catalog groups: source subunit records remain restricted to their reported subunit and assay composition; no claim across all subtypes.', 'targetMapping':{k:sorted(targetmap[k]) for k in sorted(tids)},'targetRows':[r for r in raw['targets_and_families.csv'] if r['Target id'] in tids],'ligands':[matched[k] for k in sorted(ids)],'interactions':rows}
  SOURCE.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n')
 src=json.loads(SOURCE.read_text());ligands={r['Ligand ID']:r for r in src['ligands']};records=defaultdict(lambda:{'tags':set(),'evidence':[]});counts=Counter()
 def add(e,tags,evidence):
  rec=records[e['name']];rec['librarySmiles']=e['smiles'];rec['tags'].update(tags);rec['evidence'].append(evidence)
 for i,row in enumerate(src['interactions']):
  ligand=ligands[row['Ligand ID']];g=graph(ligand['SMILES']);actions=classify(row)
  binding=row['Action']=='Binding' or (not actions and row['Type']=='None' and row['Affinity Units'] in {'pKi','pKd'})
  for rid in src['targetMapping'][row['Target ID']]:
   tags=['Receptor: '+rid]+['Action: '+ACTIONS[a] for a in actions]+['Receptor action: '+rid+' · '+ACTIONS[a] for a in actions]
   if binding:tags+=['Binding: '+rid]
   for e in bygraph.get(g,[]):
    if not actions and not binding:continue
    evidence={'provider':src['provider'],'sourceRow':i,'receptorId':rid,'ligandId':row['Ligand ID'],'sourceTargetId':row['Target ID'],'sourceTarget':clean(row['Target']),'sourceType':row['Type'],'sourceAction':row['Action'],'actions':actions,'bindingEvidence':binding,'species':row['Target Species'],'assay':clean(row['Assay Description']),'affinityUnits':row['Affinity Units'],'affinityHigh':row['Affinity High'],'affinityMedian':row['Affinity Median'],'affinityLow':row['Affinity Low'],'comment':clean(row['Action comment']),'ligandContext':clean(row['Ligand Context']),'receptorSite':clean(row['Receptor Site']),'pubmedIds':row['PubMed ID'],'sourceUrl':'https://www.guidetopharmacology.org/GRAC/LigandActivityRangeVisForward?ligandId='+row['Ligand ID']+'&targetId='+row['Target ID']}
    add(e,tags,evidence);counts['iuphar']+=1
 # Existing assay-linked records stay binding-only and graph guarded.
 byname={e['name']:e for e in library};byreceptor={r['id']:r for r in catalog}
 for i,a in enumerate(data['annotations']):
  e=byname.get(a['ligandName']);r=byreceptor.get(a['receptorId'])
  if not e or not r or a.get('evidenceType')!='binding' or a.get('action')!='binding_only' or a.get('librarySmiles')!=e['smiles']:continue
  aliases=set(r.get('targetAliases',[r['id']])+r.get('legacyTargetAliases',[]))
  if not any(t['gene'] in aliases and e['name'] in t.get('ligands',[]) for t in data['targets']):continue
  add(e,['Receptor: '+r['id'],'Binding: '+r['id']],{'provider':'ChEMBL','sourceRow':i,'receptorId':r['id'],'actions':[],'bindingEvidence':True,'species':a['species'],'assay':a['assay'],'sourceUrl':a['sourceUrl'],'endpoint':a['endpoint']});counts['chembl']+=1
 definitions=[]
 for r in catalog:
  common={'receptorId':r['id'],'receptorName':r['name'],'family':r['family'],'aliases':r.get('aliases',[]),'genes':r['genes']}
  definitions.extend([{**common,'tag':'Receptor: '+r['id'],'category':'Receptor targets'},{**common,'tag':'Binding: '+r['id'],'category':'Receptor binding'}])
  for a,label in ACTIONS.items():definitions.append({**common,'tag':'Receptor action: '+r['id']+' · '+label,'action':a,'category':'Receptor-specific actions'})
 definitions += [{'tag':'Action: '+label,'action':a,'category':'Receptor actions'}for a,label in ACTIONS.items()]
 entries={k:{**v,'tags':sorted(v['tags'])}for k,v in sorted(records.items())}
 paths=['data/library.js','data/receptor-catalog.js','data/receptor-ligand-annotations.js','data/targets.js','tools/build-receptor-tags.py',str(SOURCE.relative_to(ROOT))]
 report={'schemaVersion':1,'rdkitVersion':rdBase.rdkitVersion,'sourceSha256':{p:digest(ROOT/p) for p in paths},'sourceVersion':src['version'],'receptors':len(catalog),'annotatedEntries':len(entries),'evidenceRecords':dict(counts),'definitions':len(definitions),'coverage':[{'receptorId':r['id'],'binding':sum('Binding: '+r['id'] in e['tags'] for e in entries.values()),'actions':{a:sum('Receptor action: '+r['id']+' · '+label in e['tags'] for e in entries.values())for a,label in ACTIONS.items()}}for r in catalog]}
 payload={'schemaVersion':1,'source':{k:src[k] for k in ['provider','version','retrieved','license','licenseUrl']},'receptors':{r['id']:{k:r.get(k,[]) for k in ['name','family','aliases','genes']} for r in catalog},'definitions':definitions,'entries':entries,'interpretation':'Exact stored-graph matches to human source classifications. Source action labels may accompany binding assays; they are curated classifications, not newly demonstrated functional effects. Missing tags mean unannotated, not inactive. Complex and pathway context are retained. No affinity-based inference.'}
 text="'use strict';\n// IUPHAR/BPS Guide to PHARMACOLOGY classifications, CC BY-SA 4.0; ChEMBL binding evidence, CC BY-SA 3.0.\n// See RECEPTOR-TAGS.md. No action inferred from affinity or structural similarity.\nconst LIBRARY_RECEPTOR_METADATA = "+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+";\nif(typeof module!=='undefined'&&module.exports)module.exports={LIBRARY_RECEPTOR_METADATA};\nif(typeof globalThis!=='undefined')globalThis.LIBRARY_RECEPTOR_METADATA=LIBRARY_RECEPTOR_METADATA;\n"
 (ROOT/'data/library-receptor-tags.js').write_text(text);report['dataSha256']=hashlib.sha256(text.encode()).hexdigest();(ROOT/'validation/library-receptor-tags.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in {'sourceSha256','coverage'}}))
if __name__=='__main__':main()
