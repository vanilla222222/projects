#!/usr/bin/env python3
"""Compile individually reviewed references without changing legacy identities.

Run offline after adding one JSON entry in data/curated-reference-entries/.
Full isomeric graphs, source keys, formula and browser round trips must agree.
"""
import argparse, csv, hashlib, json, subprocess, runpy
from pathlib import Path
from collections import defaultdict
from rdkit import Chem, rdBase
from rdkit.Chem import rdMolDescriptors
from rdkit.Chem.Scaffolds import MurckoScaffold

ROOT = Path(__file__).resolve().parents[1]
sha = lambda b: hashlib.sha256(b).hexdigest()
def graph(s):
    m = Chem.MolFromSmiles(s)
    if m is None: raise ValueError('Invalid SMILES: '+s)
    return Chem.MolToSmiles(m, isomericSmiles=True)

def build():
    library = json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./data/library').LIBRARY))"],cwd=ROOT,text=True))
    bygraph=defaultdict(list)
    for e in library: bygraph[graph(e['smiles'])].append(e)
    records=[]; extras=[]; names={e['name'].casefold() for e in library}; ids=set(); inputs={};sources={}
    def source(path,digest):
        raw=(ROOT/path).read_bytes();assert sha(raw)==digest,'Stale source '+path
        if path not in sources:
            sources[path]=json.loads(raw) if path.endswith('.json') else list(csv.DictReader(raw.decode().splitlines(),delimiter='\t')) if path.endswith('.tsv') else None
        return sources[path]
    for p in sorted((ROOT/'data/curated-reference-entries').glob('*.json')):
        raw=p.read_bytes();r=json.loads(raw);inputs[str(p.relative_to(ROOT))]=sha(raw)
        assert r['id']==p.stem and r['id'] not in ids, 'Duplicate/mismatched ID'
        ids.add(r['id']);assert r['collections'] and r['evidence'] and r['note']
        assert all(e['sourceUrl'].startswith('https://') and e['kind'] in {'source_classification','documented_relationship','measured_property','control_comparison','stereo_comparison','identity_reference','functional_assay'} for e in r['evidence'])
        for c in r['compounds']:
            m=Chem.MolFromSmiles(c['smiles']);g=graph(c['smiles'])
            assert len(Chem.GetMolFrags(m))==1 and m.GetNumAtoms()<=120
            assert not any(a.GetNumRadicalElectrons() for a in m.GetAtoms())
            assert Chem.MolToInchiKey(m)==c['inchiKey'], c['name']+' source key'
            assert rdMolDescriptors.CalcMolFormula(m)==c['formula'], c['name']+' formula'
            assert c['sourceUrl'].startswith('https://')
            identity=c['identitySource']
            if identity.get('sourceFile'):
                src=source(identity['sourceFile'],identity['sourceSha256'])
                raw=identity.get('sourceLigand') or identity.get('sourceRecord')
                if src is not None:
                    pool=src.get('ligands',src.get('rows',[])) if isinstance(src,dict) else src
                    assert raw in pool, 'Identity row absent from pinned source'
                else:assert any(e.get('source')==raw and graph(e['smiles'])==g for e in library)
                key=raw.get('InChIKey') or raw.get('inchiKey')
                assert key==c['inchiKey'],'Compound key differs from source'
                if raw.get('smiles'):assert graph(raw['smiles'])==g,'Compound graph differs from reviewed source transcription'
            for e in r['evidence']:
                if e.get('sourceFile'):
                    src=source(e['sourceFile'],e['sourceSha256'])
                    assert e['sourceRecord'] in src.get('interactions',src.get('rows',[])),'Evidence row absent from pinned source'
                    if e['kind']=='source_classification':assert e['sourceRecord']['Target Species']=='Human'
                if e['kind']=='functional_assay':
                    assert e['receptorId'] and e['action'] in {'agonist','partial_agonist'} and e['assay'] and e['species']
                    if 'value' in e:assert e['value']>0 and e['unit']=='nM' and e['relation']=='='
                    if 'originalUnit' in e:
                        scale={'nM':1,'µM':1000}[e['originalUnit']]
                        assert abs(e['value']-e['originalValue']*scale)<1e-8
                        assert abs(e['sd']-e['originalSd']*scale)<1e-8
                    if 'efficacy' in e:
                        assert e['efficacy']['reference']=='5-HT = 100%' and 0<=e['efficacy']['value']<=100
            if r.get('panel'):
                assert any(e['kind']=='source_classification' or (e['kind']=='functional_assay' and e['species']=='Homo sapiens' and e.get('rankEligible',True) and e['receptorId']==r['panel']['gene']) for e in r['evidence']),'Panel requires qualified pharmacology evidence'
            if not bygraph[g]:
                name=c['name'];assert name.casefold() not in names, 'Name belongs to a different graph: '+name
                extra={'name':name,'cls':'Curated named reference','formula':c['formula'],'smiles':c['smiles'],'curatedReferenceId':r['id']}
                extras.append(extra);bygraph[g].append(extra);names.add(name.casefold())
            c['libraryNames']=[e['name'] for e in bygraph[g]]
        for link in r.get('relationships',[]):
            assert link['kind'] in {'prodrug','metabolite','negative_control','enantiomer'}
            assert 0<=link['from']<len(r['compounds']) and 0<=link['to']<len(r['compounds'])
            if link['kind']=='enantiomer':
                a,b=[Chem.MolFromSmiles(r['compounds'][link[k]]['smiles']) for k in ['from','to']]
                assert Chem.MolToSmiles(a)!=Chem.MolToSmiles(b)
                Chem.RemoveStereochemistry(a);Chem.RemoveStereochemistry(b)
                assert Chem.MolToSmiles(a)==Chem.MolToSmiles(b)
        records.append(r)
    # Verify every curated graph with the actual browser parser and serializer.
    smiles=list(dict.fromkeys(c['smiles'] for r in records for c in r['compounds']))
    probe="""const fs=require('fs'),vm=require('vm'),c=vm.createContext({});for(const f of ['smiles','mol','smarts','stereo','transform','descriptors'])vm.runInContext(fs.readFileSync('js/'+f+'.js','utf8'),c);c.rows=JSON.parse(fs.readFileSync(0,'utf8'));console.log(JSON.stringify(vm.runInContext('rows.map(s=>{const m=buildMolecule(parseSmiles(s)),d=describe(m);return {formula:d.formula,finite:["mw","exactMass","logp","tpsa","mr","hbdStrict","hbaStrict","rotatableBonds"].every(k=>Number.isFinite(d[k])),smiles:writeSmiles({atoms:m.atoms.map(a=>({...a,order:a.order?.slice(),neighbors:[],rings:[]})),bonds:m.bonds.map(b=>({...b}))})};})',c)));"""
    checks=json.loads(subprocess.check_output(['node','-e',probe],cwd=ROOT,input=json.dumps(smiles),text=True))
    for s,c in zip(smiles,checks):
        assert c['finite'], 'Nonfinite browser descriptors'
        assert graph(s)==graph(c['smiles']), 'Browser graph/stereo mismatch'
        assert rdMolDescriptors.CalcMolFormula(Chem.MolFromSmiles(s))==c['formula']
    entries=defaultdict(lambda:{'librarySmiles':'','recordIds':[],'tags':set()})
    for r in records:
        for c in r['compounds']:
            for name in c['libraryNames']:
                e=next(e for e in bygraph[graph(c['smiles'])] if e['name']==name)
                out=entries[name];out['librarySmiles']=e['smiles'];out['recordIds'].append(r['id'])
                out['tags'].update('Curated collection: '+x for x in r['collections'])
                if r.get('panel'):out['tags'].add('Curated panel: '+r['panel']['gene'])
                for evidence in r['evidence']:
                    if evidence['kind']=='functional_assay':
                        action=evidence['action'].replace('_',' ').capitalize()
                        if evidence['species']=='Homo sapiens':out['tags'].update(['Evidence: Functional assay','Action: '+action,'Receptor: '+evidence['receptorId'],'Receptor action: '+evidence['receptorId']+' · '+action])
                        else:out['tags'].add('Evidence: Functional assay (species unresolved)')
                if all(e['kind']=='identity_reference' for e in r['evidence']):out['tags'].add('Evidence: Identity only')
    # New structural families apply to the entire composed library, not just
    # newly curated records. Existing historical tag snapshots remain intact.
    taxonomy=runpy.run_path(str(ROOT/'tools/build-library-tags.py'))
    definitions=json.loads((ROOT/'data/family-definitions.json').read_text())['definitions']
    patterns=[(d,Chem.MolFromSmarts(d['smarts'])) for d in definitions]
    assert all(p is not None for _,p in patterns),'Invalid family SMARTS'
    for e in extras:
        out=entries[e['name']];out['tags'].update(taxonomy['tags_for'](e))
    measured=[{'name':name,'tag':'Family motif: '+name,'pattern':p} for name,p in taxonomy['FAMILY_MOTIFS'] if name in {'Nitazenes','Nitazene-related benzimidazoles'}]
    measured += [{'name':d['name'],'tag':d['tag'],'pattern':p} for d,p in patterns]
    counts={d['tag']:{'name':d['name'],'tag':d['tag'],'baseEntries':0,'currentEntries':0,'newStructures':0,'graphs':set()} for d in measured}
    for i,e in enumerate(library+extras):
        m=Chem.MolFromSmiles(e['smiles'])
        for d,p in patterns:
            if m.HasSubstructMatch(p):
                out=entries[e['name']];out['librarySmiles']=e['smiles'];out['tags'].add(d['tag'])
        for d in measured:
            if not m.HasSubstructMatch(d['pattern']):continue
            count=counts[d['tag']];count['currentEntries']+=1;count['graphs'].add(graph(e['smiles']))
            if i<len(library):count['baseEntries']+=1
            else:count['newStructures']+=1
    familyCoverage=[{**{k:v for k,v in c.items() if k!='graphs'},'distinctIsomericGraphs':len(c['graphs'])} for c in counts.values()]
    panels={}
    for r in records:
        if not r.get('panel'):continue
        p=panels.setdefault(r['panel']['gene'],{'graphs':set(),'scaffolds':set(),'acyclic':set(),'classifications':set()})
        for c in r['compounds']:
            g=graph(c['smiles']);p['graphs'].add(g)
            scaffold=MurckoScaffold.MurckoScaffoldSmilesFromSmiles(c['smiles'])
            if scaffold:p['scaffolds'].add(scaffold)
            else:p['acyclic'].add(g)
        p['classifications'].update(e.get('sourceClassification') or 'Agonist (functional assay)' for e in r['evidence'] if e.get('sourceClassification') or e['kind']=='functional_assay')
    coverage=[{'gene':gene,'distinctIsomericGraphs':len(p['graphs']),'ringScaffolds':len(p['scaffolds']),'acyclicProfiles':len(p['acyclic']),'sourceClassifications':sorted(p['classifications'])} for gene,p in sorted(panels.items())]
    studyCoverage=[];studyInputs={}
    for path in sorted((ROOT/'validation/sources').glob('2c-*-functional.json')):
        snapshot=json.loads(path.read_text());relative=str(path.relative_to(ROOT));studyInputs[relative]=sha(path.read_bytes())
        reviewed=[row['name'] for row in snapshot['rows'] if any(e.get('sourceFile')==relative and e.get('sourceRecord')==row for r in records for e in r['evidence'])]
        studyCoverage.append({'cohort':snapshot['cohort'],'sourceUrl':snapshot['sourceUrl'],'scope':'Selected human 5-HT2A functional observations','expected':len(snapshot['rows']),'reviewed':len(reviewed),'missing':[row['name'] for row in snapshot['rows'] if row['name'] not in reviewed]})
    data={'schemaVersion':1,'records':records,'extraLibrary':extras,'panelCoverage':coverage,'familyDefinitions':definitions,'familyCoverage':familyCoverage,'studyCoverage':studyCoverage,'entries':{k:{**v,'recordIds':sorted(set(v['recordIds'])),'tags':sorted(v['tags'])} for k,v in sorted(entries.items())}}
    text="'use strict';\n// Individually sourced reference records. See CURATED-REFERENCES.md for attribution.\nconst CURATED_REFERENCES = "+json.dumps(data,ensure_ascii=False,separators=(',',':'))+";\nif(typeof module!=='undefined')module.exports={CURATED_REFERENCES};\nif(typeof globalThis!=='undefined')globalThis.CURATED_REFERENCES=CURATED_REFERENCES;\n"
    familyInputs=['data/family-definitions.json','tools/build-library-tags.py','tools/library-taxonomy.py','tools/library-expansion-50.py']
    report={'schemaVersion':1,'records':len(records),'extraStructures':len(extras),'rdkitVersion':rdBase.rdkitVersion,'inputSha256':inputs,'studySourceSha256':studyInputs,'studyCoverage':studyCoverage,'familySourceSha256':{p:sha((ROOT/p).read_bytes()) for p in familyInputs},'familyCoverage':familyCoverage,'librarySha256':sha((ROOT/'data/library.js').read_bytes()),'toolSha256':sha(Path(__file__).read_bytes()),'dataSha256':sha(text.encode()),'browserGraphsChecked':len(checks)}
    return text,json.dumps(report,indent=2)+'\n'
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--check',action='store_true');a=ap.parse_args()
    text,report=build()
    for path,value in [('data/curated-references.js',text),('validation/curated-references.json',report)]:
        p=ROOT/path
        if a.check:assert p.read_text()==value,'Stale '+path
        else:p.write_text(value)
    print(report)
