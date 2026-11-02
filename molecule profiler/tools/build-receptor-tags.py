#!/usr/bin/env python3
"""Exact-graph, human-receptor source classifications; never infer actions from affinity."""
import argparse,csv,hashlib,html,json,re,subprocess,math
from pathlib import Path
from collections import defaultdict,Counter
from urllib.parse import urlsplit
from rdkit import Chem,rdBase
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'validation/sources/receptor-actions-iuphar.json'
ACTIONS={'agonist':'Agonist','full_agonist':'Full agonist','partial_agonist':'Partial agonist','antagonist':'Antagonist','inverse_agonist':'Inverse agonist','modulator':'Modulator','pam':'Positive allosteric modulator (PAM)','nam':'Negative allosteric modulator (NAM)','neutral_allosteric':'Neutral allosteric ligand','channel_blocker':'Channel blocker','channel_opener':'Channel opener','inhibitor':'Inhibitor','activator':'Activator','biased':'Biased agonist'}
def clean(s):return html.unescape(re.sub('<[^>]+>','',s or '')).strip()
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def graph(s):
 m=Chem.MolFromSmiles(s or '')
 return Chem.MolToSmiles(m,isomericSmiles=True) if m else None

def iuphar_endpoints(row):
 """Retain source scales and ranges literally; these are not uncertainty bounds."""
 publications=list(dict.fromkeys(p for p in row.get('PubMed ID','').split('|') if re.fullmatch(r'[0-9]+',p)))
 external=[]
 for url in row.get('Webpage URLs','').split('|'):
  try:
   parsed=urlsplit(url)
   if parsed.scheme in {'https','http'} and parsed.hostname and not parsed.username and not parsed.password:external.append(url)
  except ValueError:pass
 return {'sourceEndpoint':{k:row.get(field,'') for k,field in [('scale','Affinity Units'),('high','Affinity High'),('median','Affinity Median'),('low','Affinity Low')]},
         'originalEndpoint':{k:row.get(field,'') for k,field in [('metric','Original Affinity Units'),('highNm','Original Affinity High nm'),('medianNm','Original Affinity Median nm'),('lowNm','Original Affinity Low nm'),('relation','Original Affinity Relation')]},
         'publicationIds':publications,'publicationUrls':['https://pubmed.ncbi.nlm.nih.gov/'+p+'/' for p in publications],
         'externalUrls':list(dict.fromkeys(external)),'patentIds':list(dict.fromkeys(p for p in row.get('Patent Numbers','').split('|') if p)),
         'sourceRecord':row}

def chembl_snapshot_index(root=ROOT):
 """Index retained observations by target and activity, never by a name/group key."""
 rows={};paths=[]
 for path in sorted((root/'validation').glob('chembl-receptor-binding-batch*.json')):
  batch=json.loads(path.read_text());relative=str(path.relative_to(root));paths.append(relative)
  for pi,panel in enumerate(batch['panels']):
   for si,selected in enumerate(panel['selected']):
    activity=selected['activity'];key=(panel['gene'],activity['activity_id'])
    assert key not in rows,'Duplicate retained ChEMBL target/activity witness: '+str(key)
    rows[key]=(selected,panel,{'sourceFile':relative,'sourceSha256':digest(path),'sourceLocation':f'panels[{pi}].selected[{si}]','sourceRelease':batch['sourceDatabase']['chembl_db_version']})
 return rows,paths

def chembl_evidence(annotation,entry,index,source_row):
 key=(annotation['receptorId'],annotation['activityId'])
 assert key in index,'Missing retained ChEMBL observation: '+str(key)
 selected,panel,provenance=index[key];activity=selected['activity'];assay=selected['assay']
 assert annotation['ligandName']==entry['name'] and annotation['librarySmiles']==entry['smiles'],'Stale ChEMBL library witness'
 assert all(selected['entry'][field]==entry[field] for field in ['name','smiles','formula']),'Retained ChEMBL identity differs from current library witness'
 assert annotation['sourceRelease']==provenance['sourceRelease'],'ChEMBL release mismatch'
 assert annotation['identityKey']==selected['identityKey'],'ChEMBL grouping witness differs'
 for field,source in [('assayId','assay_chembl_id'),('documentId','document_chembl_id'),('chemblMoleculeId','molecule_chembl_id'),('chemblTargetId','target_chembl_id')]:
  assert annotation[field]==activity[source],'ChEMBL source identifier mismatch: '+field
 assert panel['chemblTargetId']==activity['target_chembl_id']==assay['target_chembl_id']
 assert assay['assay_chembl_id']==activity['assay_chembl_id'] and assay['document_chembl_id']==activity['document_chembl_id']
 assert annotation['species']==activity['target_organism']=='Homo sapiens' and assay['assay_organism']=='Homo sapiens'
 assert activity['assay_type']==assay['assay_type']=='B' and assay['confidence_score']==9 and assay['relationship_type']=='D'
 assert not activity.get('data_validity_comment') and activity.get('potential_duplicate')==0 and activity['src_id']==1
 assert not activity.get('assay_variant_accession') and not activity.get('assay_variant_mutation') and not assay.get('variant_sequence')
 assert activity['standard_type'] in {'Ki','Kd'} and activity['standard_relation']=='=' and activity['standard_units']=='nM'
 value=float(activity['standard_value']);assert math.isfinite(value) and 0<value<=1000
 expected=f"{activity['standard_type']} = {activity['standard_value']} nM (ChEMBL standardized)"
 assert annotation['endpoint']==expected,'ChEMBL endpoint differs from retained value'
 assert annotation['assay']==activity['assay_description']==assay['description'],'ChEMBL assay description differs'
 urls={'assayUrl':'https://www.ebi.ac.uk/chembl/explore/assay/'+annotation['assayId'],
       'documentUrl':'https://www.ebi.ac.uk/chembl/explore/document/'+annotation['documentId'],
       'moleculeUrl':'https://www.ebi.ac.uk/chembl/explore/compound/'+annotation['chemblMoleculeId'],
       'targetUrl':'https://www.ebi.ac.uk/chembl/explore/target/'+annotation['chemblTargetId'],
       'activityUrl':'https://www.ebi.ac.uk/chembl/api/data/activity/'+str(annotation['activityId'])+'.json'}
 assert annotation['sourceUrl']==urls['assayUrl'] and annotation['documentUrl']==urls['documentUrl'],'ChEMBL source URL mismatch'
 result={'provider':'ChEMBL','sourceRow':source_row,'receptorId':annotation['receptorId'],'actions':[],'bindingEvidence':True,
         'species':annotation['species'],'assay':annotation['assay'],'sourceUrl':annotation['sourceUrl'],'endpoint':annotation['endpoint'],
         'librarySmiles':entry['smiles'],**provenance,**urls,
         **{k:annotation[k] for k in ['activityId','assayId','documentId','chemblMoleculeId','chemblTargetId']},
         'originalMetric':activity.get('type'),'originalValue':activity.get('value'),'originalUnit':activity.get('units'),'originalRelation':activity.get('relation'),
         'documentJournal':activity.get('document_journal'),'documentYear':activity.get('document_year'),
         'assayOrganism':assay.get('assay_organism'),'assayType':assay['assay_type'],'assayConfidence':assay['confidence_score'],
         'assayDescription':assay.get('description'),'assayTissue':assay.get('assay_tissue'),'assayCellType':assay.get('assay_cell_type'),
         'assayFormatId':assay.get('bao_format'),'assayFormat':assay.get('bao_label'),
         'assayTypeDescription':assay.get('assay_type_description'),'assayConfidenceDescription':assay.get('confidence_description'),
         'assayRelationshipType':assay.get('relationship_type'),'assayRelationshipDescription':assay.get('relationship_description'),
         'assaySubcellularFraction':assay.get('assay_subcellular_fraction'),'assayTestType':assay.get('assay_test_type'),'sourceActivityProperties':activity.get('activity_properties',[])}
 source_graph=graph(activity.get('canonical_smiles'));stored_graph=graph(entry['smiles'])
 assert source_graph and stored_graph,'Invalid retained ChEMBL graph'
 if source_graph!=stored_graph:
  result.update(numericalTransferStatus='excluded_graph_mismatch',context='Retained activity graph differs from the exact stored isomeric graph; no numerical result transferred. Grouped protonation or tautomer identity is insufficient.')
 else:
  result.update(numericalTransferStatus='exact_source_graph',metric=activity['standard_type'],relation=activity['standard_relation'],value=value,unit=activity['standard_units'],context='ChEMBL standardized binding result; original reported fields retained separately. No functional action or selectivity inferred.')
 return result

def chembl_action_evidence(binding,index):
 """A literal curated action is separate from the binding observation."""
 if binding.get('numericalTransferStatus')!='exact_source_graph':return None
 selected,panel,_=index[(binding['receptorId'],binding['activityId'])]
 literal=selected['activity'].get('action_type')
 action={'AGONIST':'agonist','ANTAGONIST':'antagonist'}.get(literal.get('action_type')) if isinstance(literal,dict) else None
 if not action:return None
 # These fields identify the source classification, not a functional assay or
 # a potency measurement. Binding values stay solely on the original record.
 keys=['sourceRow','receptorId','species','assay','librarySmiles','sourceFile','sourceSha256','sourceLocation','sourceRelease','activityId','assayId','documentId','chemblMoleculeId','chemblTargetId','sourceUrl','assayUrl','documentUrl','moleculeUrl','targetUrl','activityUrl','documentJournal','documentYear','assayFormatId','assayFormat','assayTypeDescription','assayConfidenceDescription','assayRelationshipType','assayRelationshipDescription','assaySubcellularFraction','assayTestType','sourceActivityProperties']
 return {**{k:binding[k] for k in keys},'provider':'ChEMBL curated action classification','bindingEvidence':False,
         'actions':[action],'sourceAction':literal['action_type'],'sourceActionRecord':literal,
         'classificationTransferStatus':'exact_source_graph',
         'context':'Explicit ChEMBL source action classification attached to this human target and exact stored graph. Not a newly measured functional result; binding potency does not establish the action.'}

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
 src=json.loads(SOURCE.read_text());source_digest=digest(SOURCE);ligands={r['Ligand ID']:r for r in src['ligands']};records=defaultdict(lambda:{'tags':set(),'evidence':[]});counts=Counter()
 def add(e,tags,evidence):
  rec=records[e['name']];rec['librarySmiles']=e['smiles'];rec['tags'].update(tags);rec['evidence'].append(evidence)
 for i,row in enumerate(src['interactions']):
  ligand=ligands[row['Ligand ID']];g=graph(ligand['SMILES']);actions=classify(row)
  binding=row['Action']=='Binding' or (not actions and row['Type']=='None' and row['Affinity Units'] in {'pKi','pKd'})
  for rid in src['targetMapping'][row['Target ID']]:
   tags=['Receptor: '+rid]+['Action: '+ACTIONS[a] for a in actions]+['Receptor action: '+rid+' · '+ACTIONS[a] for a in actions]
   if binding:tags+=['Binding: '+rid]
   if ligand.get('Type'):tags+=['Source ligand class: '+ligand['Type']]
   for e in bygraph.get(g,[]):
    if not actions and not binding:continue
    evidence={'provider':src['provider'],'sourceRow':i,'receptorId':rid,'ligandId':row['Ligand ID'],'sourceTargetId':row['Target ID'],'sourceTarget':clean(row['Target']),'sourceLigandType':ligand.get('Type',''),'sourceLigandRecord':ligand,'sourceFile':str(SOURCE.relative_to(ROOT)),'sourceSha256':source_digest,'sourceLocation':f'interactions[{i}]','librarySmiles':e['smiles'],'sourceType':row['Type'],'sourceAction':row['Action'],'actions':actions,'bindingEvidence':binding,'species':row['Target Species'],'assay':clean(row['Assay Description']),'affinityUnits':row['Affinity Units'],'affinityHigh':row['Affinity High'],'affinityMedian':row['Affinity Median'],'affinityLow':row['Affinity Low'],'comment':clean(row['Action comment']),'ligandContext':clean(row['Ligand Context']),'receptorSite':clean(row['Receptor Site']),'pubmedIds':row['PubMed ID'],'sourceUrl':'https://www.guidetopharmacology.org/GRAC/LigandActivityRangeVisForward?ligandId='+row['Ligand ID']+'&targetId='+row['Target ID'],**iuphar_endpoints(row)}
    add(e,tags,evidence);counts['iuphar']+=1
 # Existing assay-linked records stay binding-only and graph guarded.
 byname={e['name']:e for e in library};byreceptor={r['id']:r for r in catalog}
 chembl_index,chembl_paths=chembl_snapshot_index();seen_chembl=set()
 for i,a in enumerate(data['annotations']):
  e=byname.get(a['ligandName']);r=byreceptor.get(a['receptorId'])
  if not e or not r or a.get('evidenceType')!='binding' or a.get('action')!='binding_only' or a.get('librarySmiles')!=e['smiles']:continue
  aliases=set(r.get('targetAliases',[r['id']])+r.get('legacyTargetAliases',[]))
  if not any(t['gene'] in aliases and e['name'] in t.get('ligands',[]) for t in data['targets']):continue
  key=(a['receptorId'],a['activityId']);assert key not in seen_chembl,'Duplicate ChEMBL annotation';seen_chembl.add(key)
  evidence=chembl_evidence(a,e,chembl_index,i)
  if evidence['numericalTransferStatus']!='exact_source_graph':counts['chemblNumericalExclusions']+=1
  add(e,['Receptor: '+r['id'],'Binding: '+r['id']],evidence);counts['chembl']+=1
  classified=chembl_action_evidence(evidence,chembl_index)
  if classified:
   action=classified['actions'][0]
   add(e,['Receptor: '+r['id'],'Action: '+ACTIONS[action],'Receptor action: '+r['id']+' · '+ACTIONS[action],'Evidence: ChEMBL action classification'],classified);counts['chemblActionClassifications']+=1
 definitions=[]
 for r in catalog:
  common={'receptorId':r['id'],'receptorName':r['name'],'family':r['family'],'aliases':r.get('aliases',[]),'genes':r['genes']}
  definitions.extend([{**common,'tag':'Receptor: '+r['id'],'category':'Receptor targets'},{**common,'tag':'Binding: '+r['id'],'category':'Receptor binding'}])
  for a,label in ACTIONS.items():definitions.append({**common,'tag':'Receptor action: '+r['id']+' · '+label,'action':a,'category':'Receptor-specific actions'})
 definitions += [{'tag':'Action: '+label,'action':a,'category':'Receptor actions'}for a,label in ACTIONS.items()]
 definitions += [{'tag':'Source ligand class: '+kind,'category':'Source ligand classes'}for kind in sorted({l['Type'] for l in ligands.values() if l.get('Type')})]
 definitions.append({'tag':'Evidence: ChEMBL action classification','category':'Evidence provenance'})
 entries={k:{**v,'tags':sorted(v['tags'])}for k,v in sorted(records.items())}
 paths=['data/library.js','data/receptor-catalog.js','data/receptor-ligand-annotations.js','data/targets.js','tools/build-receptor-tags.py',str(SOURCE.relative_to(ROOT))]+chembl_paths
 report={'schemaVersion':1,'rdkitVersion':rdBase.rdkitVersion,'sourceSha256':{p:digest(ROOT/p) for p in paths},'sourceVersion':src['version'],'receptors':len(catalog),'annotatedEntries':len(entries),'evidenceRecords':dict(counts),'definitions':len(definitions),'coverage':[{'receptorId':r['id'],'binding':sum('Binding: '+r['id'] in e['tags'] for e in entries.values()),'actions':{a:sum('Receptor action: '+r['id']+' · '+label in e['tags'] for e in entries.values())for a,label in ACTIONS.items()}}for r in catalog]}
 payload={'schemaVersion':1,'source':{k:src[k] for k in ['provider','version','retrieved','license','licenseUrl']},'receptors':{r['id']:{k:r.get(k,[]) for k in ['name','family','aliases','genes']} for r in catalog},'definitions':definitions,'entries':entries,'interpretation':'Exact stored-graph matches to human source classifications. Source action labels may accompany binding assays; they are curated classifications, not newly demonstrated functional effects. Missing tags mean unannotated, not inactive. Complex and pathway context are retained. No affinity-based inference.'}
 text="'use strict';\n// IUPHAR/BPS Guide to PHARMACOLOGY classifications, CC BY-SA 4.0; ChEMBL binding evidence, CC BY-SA 3.0.\n// See RECEPTOR-TAGS.md. No action inferred from affinity or structural similarity.\nconst LIBRARY_RECEPTOR_METADATA = "+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+";\nif(typeof module!=='undefined'&&module.exports)module.exports={LIBRARY_RECEPTOR_METADATA};\nif(typeof globalThis!=='undefined')globalThis.LIBRARY_RECEPTOR_METADATA=LIBRARY_RECEPTOR_METADATA;\n"
 (ROOT/'data/library-receptor-tags.js').write_text(text);report['dataSha256']=hashlib.sha256(text.encode()).hexdigest();(ROOT/'validation/library-receptor-tags.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in {'sourceSha256','coverage'}}))
if __name__=='__main__':main()
