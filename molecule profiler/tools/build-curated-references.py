#!/usr/bin/env python3
"""Compile individually reviewed references without changing legacy identities.

Run offline after adding one JSON entry in data/curated-reference-entries/.
Full isomeric graphs, source keys, formula and browser round trips must agree.
"""
import argparse, csv, hashlib, json, subprocess
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
        assert all(e['sourceUrl'].startswith('https://') and e['kind'] in {'source_classification','documented_relationship','measured_property','control_comparison','stereo_comparison'} for e in r['evidence'])
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
            for e in r['evidence']:
                if e.get('sourceFile'):
                    src=source(e['sourceFile'],e['sourceSha256'])
                    assert e['sourceRecord'] in src['interactions'],'Evidence row absent from pinned source'
                    assert e['sourceRecord']['Target Species']=='Human'
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
    panels={}
    for r in records:
        if not r.get('panel'):continue
        p=panels.setdefault(r['panel']['gene'],{'graphs':set(),'scaffolds':set(),'acyclic':set(),'classifications':set()})
        for c in r['compounds']:
            g=graph(c['smiles']);p['graphs'].add(g)
            scaffold=MurckoScaffold.MurckoScaffoldSmilesFromSmiles(c['smiles'])
            if scaffold:p['scaffolds'].add(scaffold)
            else:p['acyclic'].add(g)
        p['classifications'].update(e['sourceClassification'] for e in r['evidence'] if e.get('sourceClassification'))
    coverage=[{'gene':gene,'distinctIsomericGraphs':len(p['graphs']),'ringScaffolds':len(p['scaffolds']),'acyclicProfiles':len(p['acyclic']),'sourceClassifications':sorted(p['classifications'])} for gene,p in sorted(panels.items())]
    data={'schemaVersion':1,'records':records,'extraLibrary':extras,'panelCoverage':coverage,'entries':{k:{**v,'recordIds':sorted(set(v['recordIds'])),'tags':sorted(v['tags'])} for k,v in sorted(entries.items())}}
    text="'use strict';\n// Individually sourced reference records. See CURATED-REFERENCES.md for attribution.\nconst CURATED_REFERENCES = "+json.dumps(data,ensure_ascii=False,separators=(',',':'))+";\nif(typeof module!=='undefined')module.exports={CURATED_REFERENCES};\nif(typeof globalThis!=='undefined')globalThis.CURATED_REFERENCES=CURATED_REFERENCES;\n"
    report={'schemaVersion':1,'records':len(records),'extraStructures':len(extras),'rdkitVersion':rdBase.rdkitVersion,'inputSha256':inputs,'librarySha256':sha((ROOT/'data/library.js').read_bytes()),'toolSha256':sha(Path(__file__).read_bytes()),'dataSha256':sha(text.encode()),'browserGraphsChecked':len(checks)}
    return text,json.dumps(report,indent=2)+'\n'
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('--check',action='store_true');a=ap.parse_args()
    text,report=build()
    for path,value in [('data/curated-references.js',text),('validation/curated-references.json',report)]:
        p=ROOT/path
        if a.check:assert p.read_text()==value,'Stale '+path
        else:p.write_text(value)
    print(report)
