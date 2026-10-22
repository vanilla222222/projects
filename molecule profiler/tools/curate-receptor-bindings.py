#!/usr/bin/env python3
"""Acquire conservative human single-protein Ki/Kd reference associations.

Requires RDKit and Node. Writes a reviewable snapshot; --apply adds selected
structures, target links and binding-only annotations. No functional actions are
inferred. ChEMBL source records are retained for review, not revalidated assays.
"""
import argparse
import concurrent.futures
import datetime
from decimal import Decimal, InvalidOperation
import hashlib
from functools import lru_cache
import json
from pathlib import Path
import re
import subprocess
import time
from urllib.parse import urlencode
from urllib.request import urlopen, Request
from rdkit import Chem, rdBase
from rdkit.Chem import rdMolDescriptors
from rdkit.Chem.MolStandardize import rdMolStandardize

ROOT = Path(__file__).resolve().parents[1]
API = 'https://www.ebi.ac.uk/chembl/api/data/'
ACCESSIONS = {'HRH2':'P25021','CHRM1':'P11229','CHRM2':'P08172','CHRM3':'P20309',
 'ADRB1':'P08588','ADRB2':'P07550','ADORA1':'P30542','ADORA2A':'P29274',
 'AGTR1':'P30556','CYSLTR1':'Q9Y271',
 'MTNR1A':'P48039','P2RY12':'Q9H244','PPARG':'P37231','RARA':'P10276',
 'HRH3':'Q9Y5N1','HRH4':'Q9H3N8','CHRM4':'P08173','CHRM5':'P08912',
 'MTNR1B':'P49286','ADRB3':'P13945','DRD5':'P21918','ADORA2B':'P29275',
 'HTR4':'Q13639','HTR5A':'P47898',
 'ADORA3':'P0DMS8','ADRA1A':'P35348','ADRA1B':'P35368','ADRA1D':'P25100',
 'ADRA2A':'P08913','ADRA2B':'P18089','ADRA2C':'P18825',
 'DRD1':'P21728','DRD2':'P14416','DRD3':'P35462','DRD4':'P21917',
 'HTR1E':'P28566','HTR1F':'P30939',
 'OPRM1':'P35372','OPRD1':'P41143','OPRK1':'P41145','OPRL1':'P41146'}
DEFAULT_GENES=('HRH2','CHRM1','CHRM2','CHRM3','ADRB1','ADRB2','ADORA1','ADORA2A','AGTR1','CYSLTR1')


def pharmacology_name(activity):
    """A source preferred name, never an invented name or inferred action."""
    name = activity.get('molecule_pref_name')
    if not isinstance(name, str):
        return None
    name = name.strip()
    if not name or re.fullmatch(r'CHEMBL\d+|\d{2,7}-\d{2}-\d', name, re.I):
        return None
    return name


def new_reference_name(activity, used_names, named_only):
    if not named_only:
        return activity['molecule_chembl_id']
    name = pharmacology_name(activity)
    if name is None:
        raise ValueError('Named reference lacks a source preferred name')
    if name.casefold() in {n.strip().casefold() for n in used_names}:
        # Distinct source graphs must not differ only by name capitalization.
        # Keep the actual name first and identify the source form explicitly.
        name += ' [' + activity['molecule_chembl_id'] + ']'
    return name


def accepted_activity(a, target_id):
    try:
        value = Decimal(str(a.get('standard_value')))
        return (value.is_finite() and 0 < value <= 1000
            and a.get('standard_type') in ('Ki','Kd') and a.get('standard_relation') == '='
            and a.get('standard_units') == 'nM' and a.get('assay_type') == 'B'
            and a.get('target_chembl_id') == target_id and a.get('target_organism') == 'Homo sapiens'
            and not a.get('data_validity_comment') and a.get('potential_duplicate') == 0
            and not a.get('assay_variant_accession') and not a.get('assay_variant_mutation')
            and a.get('src_id') == 1 and bool(a.get('document_chembl_id')))
    except (InvalidOperation, TypeError):
        return False


def accepted_assay(a, target_id):
    return (a.get('confidence_score') == 9 and a.get('relationship_type') == 'D'
        and a.get('assay_type') == 'B' and a.get('target_chembl_id') == target_id
        and a.get('assay_organism') == 'Homo sapiens' and not a.get('variant_sequence')
        and 'unknown origin' not in str(a.get('description','')).lower())


@lru_cache(maxsize=20000)
def compound(smiles):
    mol = Chem.MolFromSmiles(smiles or '')
    if mol is None or len(Chem.GetMolFrags(mol)) != 1 or not 5 <= mol.GetNumHeavyAtoms() <= 100:
        return None
    if any(a.GetSymbol() not in {'C','N','O','F','S','P','Cl','Br','I'} or a.GetNumRadicalElectrons() for a in mol.GetAtoms()):
        return None
    canonical = Chem.MolToSmiles(mol, isomericSmiles=True)
    # Group protonation/tautomer alternatives only for counting, never alter
    # the stored source graph or assume equivalent assay behaviour.
    parent = rdMolStandardize.Uncharger().uncharge(Chem.Mol(mol))
    enumerator = rdMolStandardize.TautomerEnumerator()
    enumerator.SetRemoveBondStereo(False)
    enumerator.SetRemoveSp3Stereo(False)
    enumerated = enumerator.Enumerate(parent)
    if enumerated.status != rdMolStandardize.TautomerEnumeratorStatus.Completed:
        return None
    group = Chem.MolToSmiles(enumerator.PickCanonical(enumerated), isomericSmiles=True)
    return {'smiles':canonical, 'formula':rdMolDescriptors.CalcMolFormula(mol),
            'identityKey':hashlib.sha256(group.encode()).hexdigest()}


def js_string(value):
    return "'" + value.replace('\\','\\\\').replace("'","\\'") + "'"


def target_from_catalog(gene, catalog):
    matches=[r for r in catalog if r['id']==gene and r.get('genes')==[gene]
             and r.get('kind') in ('GPCR','Nuclear receptor','Catalytic receptor')]
    if len(matches)!=1:
        raise ValueError('New target must resolve to one ordinary catalog gene: '+gene)
    r=matches[0]
    family={'GPCR':'GPCR','Nuclear receptor':'Nuclear receptor','Catalytic receptor':'Kinase'}[r['kind']]
    return {'name':r['name'],'gene':gene,'family':family,'organism':'Human',
            'note':'ChEMBL assay-linked human binding references. Functional action and selectivity unassigned.',
            'ligands':[]}


def append_target_rows(text, rows):
    marker='];\n\nif (typeof module'
    if text.count(marker)!=1:
        raise ValueError('Unexpected target file format')
    prefix,suffix=text.split(marker)
    prefix=prefix.rstrip()
    if rows and prefix.endswith('}'):
        prefix+=','
    added=''
    for t in rows:
        added+='  { name: '+js_string(t['name'])+', gene: '+js_string(t['gene'])+', family: '+js_string(t['family'])+', organism: '+js_string(t['organism'])+',\n'
        added+='    note: '+js_string(t['note'])+',\n    ligands: ['+', '.join(js_string(n) for n in t['ligands'])+'] },\n'
    return prefix+'\n'+added+marker+suffix


def merge_annotations(existing, incoming, genes, previous_release):
    retained=[]
    for a in existing:
        own=a.get('curationSource')=='chembl-human-binding-v1'
        if own and a['receptorId'] in genes:
            continue
        retained.append({**a,'sourceRelease':a.get('sourceRelease',previous_release)} if own else a)
    return retained+incoming


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--genes', default=','.join(DEFAULT_GENES))
    ap.add_argument('--goal', type=int, default=50)
    ap.add_argument('--max-activities', type=int, default=2000)
    ap.add_argument('--cache', type=Path, default=Path('/tmp/mp-chembl-cache'))
    ap.add_argument('--offline', action='store_true')
    ap.add_argument('--named-only', action='store_true', help='Require a ChEMBL preferred molecule name as well as qualifying binding evidence; leave shortfalls visible')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--add-targets', action='store_true',help='Permit source-backed rows for ordinary catalog genes; never assemblies')
    ap.add_argument('--output', type=Path, required=True)
    args = ap.parse_args()
    if not 1 <= args.goal <= 100 or not 1 <= args.max_activities <= 10000:
        raise SystemExit('Goal must be 1–100 and activity cap 1–10000')
    genes = args.genes.split(',')
    if any(g not in ACCESSIONS for g in genes) or len(set(genes)) != len(genes):
        raise SystemExit('Unknown or duplicate gene; add and verify accession mappings first')
    args.cache.mkdir(parents=True, exist_ok=True)
    requests = {}

    def get(resource, params):
        url = API + resource + '.json?' + urlencode(params)
        cache = args.cache / (hashlib.sha256(url.encode()).hexdigest()+'.json')
        if cache.exists():
            envelope = json.loads(cache.read_text())
        else:
            if args.offline:
                raise ValueError('Missing cached request: '+url)
            time.sleep(0.3)
            with urlopen(Request(url, headers={'User-Agent':'MoleculeProfiler-ReferenceCuration/1.0'}), timeout=60) as response:
                data = json.load(response)
            envelope = {'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'data':data}
            cache.write_text(json.dumps(envelope)+'\n')
        requests[url] = {'retrievedAt':envelope['retrievedAt'],
                        'sha256':hashlib.sha256(json.dumps(envelope['data'],sort_keys=True,separators=(',',':')).encode()).hexdigest()}
        return envelope['data']

    source_status = get('status', {})
    release = source_status.get('chembl_db_version')
    if not release:
        raise ValueError('Missing ChEMBL release metadata')
    source_paths=['data/library.js','data/targets.js','data/receptor-ligand-annotations.js','data/receptor-catalog.js']
    source_before={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in source_paths}
    code="const {LIBRARY}=require('./data/library.js'),{TARGETS}=require('./data/targets.js'),{RECEPTOR_LIGAND_ANNOTATIONS,RECEPTOR_BINDING_SOURCE}=require('./data/receptor-ligand-annotations.js'),{RECEPTOR_REFERENCE_CATALOG}=require('./data/receptor-catalog.js');console.log(JSON.stringify({library:LIBRARY,targets:TARGETS,annotations:RECEPTOR_LIGAND_ANNOTATIONS,source:RECEPTOR_BINDING_SOURCE,catalog:RECEPTOR_REFERENCE_CATALOG.receptors}));"
    current=json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT,text=True))
    if any(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h for p,h in source_before.items()):
        raise ValueError('Source changed while loading the curation snapshot')
    targets={t['gene']:t for t in current['targets']}
    new_genes=set()
    exact={}
    for e in current['library']:
        if e.get('propertyOnly'):
            continue
        mol=Chem.MolFromSmiles(e['smiles'])
        if mol is not None:
            exact.setdefault(Chem.MolToSmiles(mol,isomericSmiles=True),e)
    used_names={e['name'] for e in current['library']}
    additions,annotations,panels=[],[],[]

    for gene in genes:
        if gene not in targets:
            if not args.add_targets:
                raise ValueError('No existing target row for '+gene+'; use --add-targets after reviewing catalog identity')
            targets[gene]=target_from_catalog(gene,current['catalog'])
            new_genes.add(gene)
        accession = ACCESSIONS[gene]
        matches = get('target',{'target_components__accession':accession,'organism':'Homo sapiens','limit':100})['targets']
        matches = [t for t in matches if t['target_type']=='SINGLE PROTEIN' and len(t['target_components'])==1
                   and t['target_components'][0]['accession']==accession
                   and any(s['component_synonym']==gene and s['syn_type']=='GENE_SYMBOL'
                           for s in t['target_components'][0]['target_component_synonyms'])]
        if len(matches)!=1:
            raise ValueError('Ambiguous or unsupported target identity for '+gene)
        target = matches[0];tid = target['target_chembl_id']
        raw=[];offset=0;total=None
        while offset < args.max_activities:
            page=get('activity',{'target_chembl_id':tid,'standard_type__in':'Ki,Kd','standard_relation':'=',
                 'standard_units':'nM','standard_value__lte':1000,'assay_type':'B','data_validity_comment__isnull':'true',
                 'potential_duplicate':0,'limit':min(1000,args.max_activities-offset),'offset':offset,'order_by':'activity_id'})
            raw.extend(page['activities']);total=page['page_meta']['total_count'];offset+=len(page['activities'])
            if not page['activities'] or offset>=total:
                break
        eligible=[a for a in raw if accepted_activity(a,tid)]
        candidates=[a for a in eligible if not args.named_only or pharmacology_name(a) is not None]
        assay_ids=sorted({a['assay_chembl_id'] for a in candidates})
        batches=[assay_ids[i:i+40] for i in range(0,len(assay_ids),40)]
        def assays(batch):
            result=get('assay',{'assay_chembl_id__in':','.join(batch),'limit':100})
            if result['page_meta']['total_count']!=len(result['assays']):
                raise ValueError('Truncated assay response')
            return result['assays']
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            assay_map={a['assay_chembl_id']:a for batch in pool.map(assays,batches) for a in batch}
        seen=set();selected=[];structure_failures=[];planned_names=set(used_names)
        for a in sorted(candidates,key=lambda x:x['activity_id']):
            preferred_name = pharmacology_name(a)
            if args.named_only and preferred_name is None:
                continue
            assay=assay_map.get(a['assay_chembl_id'],{})
            if not accepted_assay(assay,tid):
                continue
            c=compound(a.get('canonical_smiles'))
            if c is None or c['identityKey'] in seen:
                continue
            entry=exact.get(c['smiles'])
            if entry is None:
                name=new_reference_name(a, planned_names, args.named_only)
                if name in planned_names:
                    raise ValueError('Compound ID resolves to conflicting graph: '+name)
                entry={'name':name,'cls':'ChEMBL binding reference','formula':c['formula'],'smiles':c['smiles']}
                planned_names.add(name)
            source_activity = {k:v for k,v in a.items() if k != 'ligand_efficiency'}
            selected.append({'entry':entry,'identityKey':c['identityKey'],'activity':source_activity,'assay':assay})
            seen.add(c['identityKey'])
        # Fail closed for structures the browser engine cannot represent with
        # the same formula as RDKit. No rejected entry counts toward the goal.
        js="for(const f of ['smiles','mol'])Object.assign(global,require('./js/'+f+'.js'));console.log(JSON.stringify(JSON.parse(require('fs').readFileSync(0,'utf8')).map(e=>{try{return molecularFormula(buildMolecule(parseSmiles(e.smiles)))===e.formula}catch(_){return false}})));"
        accepted=json.loads(subprocess.check_output(['node','-e',js],cwd=ROOT,input=json.dumps([s['entry'] for s in selected]),text=True))
        chosen=[]
        for selection,ok in zip(selected,accepted):
            if ok and len(chosen)<args.goal:
                chosen.append(selection)
            elif not ok:
                structure_failures.append(selection['entry']['name'])
        for item in chosen:
            entry=item['entry'];a=item['activity'];assay=item['assay']
            if entry['name'] not in used_names:
                additions.append(entry);used_names.add(entry['name']);exact[item['entry']['smiles']]=entry
            if entry['name'] not in targets[gene]['ligands']:
                targets[gene]['ligands'].append(entry['name'])
            annotations.append({'receptorId':gene,'ligandName':entry['name'],'action':'binding_only','evidenceType':'binding','curationSource':'chembl-human-binding-v1','sourceRelease':release,
              'sourceUrl':'https://www.ebi.ac.uk/chembl/explore/assay/'+a['assay_chembl_id'],
              'species':'Homo sapiens','assay':assay['description'],
              'endpoint':a['standard_type']+' = '+a['standard_value']+' nM (ChEMBL standardized)',
              'note':'Measured binding association in this assay; no functional action, selectivity or clinical effect inferred.',
              'documentUrl':'https://www.ebi.ac.uk/chembl/explore/document/'+a['document_chembl_id'],
              'chemblMoleculeId':a['molecule_chembl_id'],'chemblTargetId':tid,'activityId':a['activity_id'],
              'assayId':a['assay_chembl_id'],'documentId':a['document_chembl_id'],
              'identityKey':item['identityKey'],'librarySmiles':entry['smiles']})
        panel={'gene':gene,'newTarget':gene in new_genes,'targetRegistered':gene not in new_genes or bool(chosen),'accession':accession,'chemblTargetId':tid,'targetName':target['pref_name'],
               'targetComponent':target['target_components'][0],
               'availableActivityRows':total,'examinedRows':len(raw),'activityCapReached':len(raw)<total,
               'eligibleActivityRows':len(eligible),'distinctCandidateProfiles':len(selected),
               'unnamedActivityRowsExcluded':sum(pharmacology_name(a) is None for a in eligible) if args.named_only else 0,
               'browserFormulaRejected':structure_failures,'selected':chosen,'count':len(chosen),'remaining':max(0,args.goal-len(chosen))}
        panels.append(panel)
        print(gene+': '+str(len(chosen))+'/'+str(args.goal)+' sourced distinct binding profiles; '+str(len(raw))+' activity rows examined',flush=True)
    merged_annotations=merge_annotations(current['annotations'],annotations,genes,current.get('source',{}).get('release','unrecorded'))
    report={'schemaVersion':1,'rdkitVersion':rdBase.rdkitVersion,'goal':args.goal,
       'sourceDatabase':source_status,'sourceUrl':'https://www.ebi.ac.uk/chembl/','licenseUrl':'https://creativecommons.org/licenses/by-sa/3.0/',
       'protocol':'Human single-protein binding Ki/Kd, exact nM values in (0,1000], ChEMBL source 1, no data-validity flags/duplicates/variants; direct human assay assignment with confidence 9. First qualifying distinct profiles by activity ID; not a diversity-optimized or comprehensive ligand inventory.',
       'identityMethod':'SHA256 of RDKit canonical isomeric SMILES after uncharging/tautomer grouping (stereo removal disabled); grouping only, stored source graphs unchanged.',
       'limitations':['ChEMBL-curated assay records, not independent remeasurement.','Binding does not establish agonism, antagonism or selectivity.','Research IDs are valid entries even without established drug names.','Coverage is not scaffold diversity or predictive validation.','Availability may be limited by query filters and activity cap; do not fill gaps with inferred ligands.'],
       'selectionPolicy':'named-only' if args.named_only else 'all-qualifying',
       'sourceBeforeSha256':source_before,'requests':requests,'panels':panels,'newStructures':additions,'annotations':annotations,
       'newTargets':[targets[g] for g in genes if g in new_genes and targets[g]['ligands']]}
    if args.named_only:
        report['protocol'] += ' Named-only selection requires a non-identifier ChEMBL molecule preferred name on the activity record; new entries use that source name, with a bracketed compound ID when a case-insensitive name collision needs a distinct graph key. Existing exact-graph reference keys are preserved.'
        report['limitations'] = [s for s in report['limitations'] if not s.startswith('Research IDs')]
        report['limitations'].append('A preferred name and binding observation do not establish an approved therapeutic role or a functional mechanism. Named-only filtering can leave fewer than 50 profiles.')
    if args.apply:
        for p,h in source_before.items():
            if hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h:
                raise ValueError('Source changed during curation: '+p)
        library_path=ROOT/'data/library.js';text=library_path.read_text()
        marker='];\n\nif (typeof module'
        if text.count(marker)!=1:
            raise ValueError('Unexpected library format')
        rows=''.join('  { name: '+js_string(e['name'])+', cls: '+js_string(e['cls'])+', formula: '+js_string(e['formula'])+', smiles: '+js_string(e['smiles'])+' },\n' for e in additions)
        library_text=text.replace(marker,rows+marker)
        path=ROOT/'data/targets.js';text=path.read_text();lines=text.splitlines(True);gene=None
        for i,line in enumerate(lines):
            match=re.search(r"gene: '([^']*)'",line)
            if match:gene=match[1]
            if gene in genes and line.lstrip().startswith('ligands: ['):
                head,_,tail=re.match(r'(\s*ligands: \[)(.*)(\] \},?\n?)',line).groups()
                lines[i]=head+', '.join(js_string(n) for n in targets[gene]['ligands'])+tail
        target_text=''.join(lines)
        new_targets=report['newTargets']
        if new_targets:
            target_text=append_target_rows(target_text,new_targets)
        metadata={'database':'ChEMBL','release':release,
                  'releases':sorted({release}|{a['sourceRelease'] for a in merged_annotations if a.get('sourceRelease') and a.get('curationSource')=='chembl-human-binding-v1'}),
                  'sourceUrl':'https://www.ebi.ac.uk/chembl/','licenseUrl':'https://creativecommons.org/licenses/by-sa/3.0/'}
        annotation_text="'use strict';\n// "+release+" assay-linked binding evidence, CC BY-SA 3.0. See CHEMBL-DATA-NOTICE.md.\n// Binding associations do not establish functional actions.\nconst RECEPTOR_BINDING_SOURCE = "+json.dumps(metadata)+";\nconst RECEPTOR_LIGAND_ANNOTATIONS = "+json.dumps(merged_annotations,indent=2)+";\nif(typeof module!=='undefined'&&module.exports)module.exports={RECEPTOR_LIGAND_ANNOTATIONS,RECEPTOR_BINDING_SOURCE};\n"
        # Prepare all serializations before writing any project file.
        for p,h in source_before.items():
            if hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h:
                raise ValueError('Source changed while preparing the update: '+p)
        library_path.write_text(library_text)
        path.write_text(target_text)
        (ROOT/'data/receptor-ligand-annotations.js').write_text(annotation_text)
    report['applied']=args.apply
    report['sourceAfterSha256']={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in source_before}
    report['toolSha256']=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    args.output.write_text(json.dumps(report,indent=2)+'\n')
    print('New structures: '+str(len(additions))+'; sourced associations: '+str(len(annotations)),flush=True)

if __name__=='__main__':
    main()
