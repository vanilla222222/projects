#!/usr/bin/env python3
"""Reviewable, named reference additions and explicitly reviewed identity fixes.

PubChem name resolution establishes a database structure, not receptor activity.
DailyMed links document why these named pharmacology references were selected;
their product salts/formulations are not represented by the stored parent graph.
"""
import argparse
import datetime
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import time
from urllib.parse import quote
from urllib.request import Request, urlopen
from rdkit import Chem, rdBase
from rdkit.Chem import rdMolDescriptors

ROOT=Path(__file__).resolve().parents[1]
LABEL='https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid='
SELECTIONS=[
 ('Dextroamphetamine','dextroamphetamine','Amphetamine enantiomer reference',LABEL+'6b8c97ac-c83c-4a1f-a33c-121239253abf'),
 ('Levoamphetamine','levamfetamine','Amphetamine enantiomer reference',LABEL+'690e1ef4-caf7-4c48-a4ae-d2a0ab684e82'),
 ('Lisdexamfetamine','lisdexamfetamine','Amphetamine prodrug reference',LABEL+'da3148af-f9b6-4725-adae-3595b4c7dc4b'),
 ('Phentermine','phentermine','Sympathomimetic reference',LABEL+'70bc6f36-8087-4ccd-a396-a911c0ebae79'),
 ('Benzphetamine','benzphetamine','Sympathomimetic reference',LABEL+'60a394a5-04c6-819e-e053-2a91aa0add1f'),
 ('Levomethamphetamine','levmetamfetamine','Nasal decongestant reference',LABEL+'d11e916f-90a6-4099-bf83-75f2dfbd6266')]
REVIEWED={'Alpha-PPP','Alpha-PBP','Alpha-PVP','Alpha-PHP','MDPPP','MDPV','Naphyrone','Pyrovalerone'}


def canonical(smiles):
    mol=Chem.MolFromSmiles(smiles)
    if mol is None or len(Chem.GetMolFrags(mol))!=1:
        raise ValueError('Invalid or disconnected source graph')
    return Chem.MolToSmiles(mol,isomericSmiles=True)


def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--cache',type=Path,default=Path('/tmp/mp-family-cache'))
    ap.add_argument('--offline',action='store_true');ap.add_argument('--apply',action='store_true')
    ap.add_argument('--output',type=Path,required=True)
    args=ap.parse_args();args.cache.mkdir(parents=True,exist_ok=True)
    paths=['data/library.js','data/targets.js','data/receptor-ligand-annotations.js']
    before={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths}
    library=json.loads(subprocess.check_output(['node','-e',"console.log(JSON.stringify(require('./data/library').LIBRARY))"],cwd=ROOT,text=True))
    by_name={e['name']:e for e in library};records=[];changes=[];additions=[]
    def fetch(resource):
        url='https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/'+resource+'/property/IsomericSMILES,MolecularFormula,InChIKey/JSON'
        cache=args.cache/(hashlib.sha256(url.encode()).hexdigest()+'.json')
        if cache.exists():envelope=json.loads(cache.read_text())
        else:
            if args.offline:raise ValueError('Missing cache: '+url)
            time.sleep(.4)
            with urlopen(Request(url,headers={'User-Agent':'MoleculeProfiler-NamedReferences/1.0'}),timeout=30) as response:
                data=json.load(response)
            envelope={'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'response':data}
            cache.write_text(json.dumps(envelope)+'\n')
        rows=envelope['response']['PropertyTable']['Properties']
        if len(rows)!=1:raise ValueError('Ambiguous source: '+url)
        p=rows[0];smiles=p.get('SMILES') or p['IsomericSMILES'];canonical(smiles)
        if rdMolDescriptors.CalcMolFormula(Chem.MolFromSmiles(smiles))!=p['MolecularFormula']:raise ValueError('Source formula disagrees')
        return {**envelope,'requestUrl':url,'sourceUrl':'https://pubchem.ncbi.nlm.nih.gov/compound/'+str(p['CID']),
                'sourceSmiles':smiles,'sourceFormula':p['MolecularFormula']}
    audit=json.loads((ROOT/'validation/cathinone-identity-before.json').read_text())
    for r in audit['records']:
        if r['name'] not in REVIEWED:continue
        e=by_name[r['name']]
        if e['smiles']!=r['librarySmiles'] or r['status']!='different_graph_requires_review':raise ValueError('Reviewed input changed')
        changes.append(r)
    if len(changes)!=len(REVIEWED):raise ValueError('Missing reviewed identities')
    extra=fetch('cid/6430745');e=by_name['4-Methyl-alpha-PPP']
    changes.append({'name':e['name'],'librarySmiles':e['smiles'],**extra})
    for r in changes:
        by_name[r['name']]['smiles']=r['sourceSmiles'];by_name[r['name']]['formula']=r['sourceFormula']
    exact={canonical(e['smiles']):e for e in library if not e.get('propertyOnly')}
    for name,query,role,role_source in SELECTIONS:
        r={'name':name,'documentedRole':role,'roleSourceUrl':role_source,**fetch('name/'+quote(query,safe=''))}
        key=canonical(r['sourceSmiles']);existing=exact.get(key)
        if existing:r['reusedReferenceId']=existing['name']
        else:
            if name.casefold() in {n.casefold() for n in by_name}:raise ValueError('Name conflict: '+name)
            e={'name':name,'cls':'Amphetamine-related reference','formula':r['sourceFormula'],'smiles':r['sourceSmiles']}
            additions.append(e);library.append(e);by_name[name]=e;exact[key]=e
        records.append(r)
    # Explicit enantiomer controls: both references must be stereo-defined,
    # distinct, and differ only in stereochemistry.
    pair=[Chem.MolFromSmiles(r['sourceSmiles']) for r in records[:2]]
    if (Chem.MolToSmiles(pair[0],True)==Chem.MolToSmiles(pair[1],True)
        or Chem.MolToSmiles(pair[0],False)!=Chem.MolToSmiles(pair[1],False)
        or any(not Chem.FindMolChiralCenters(m) or any(v=='?' for _,v in Chem.FindMolChiralCenters(m,includeUnassigned=True)) for m in pair)):
        raise ValueError('Amphetamine enantiomer identity check failed')
    js="for(const f of ['smiles','mol'])Object.assign(global,require('./js/'+f));console.log(JSON.stringify(JSON.parse(require('fs').readFileSync(0,'utf8')).map(e=>molecularFormula(buildMolecule(parseSmiles(e.smiles)))===e.formula)));"
    checked=[by_name[r['name']] for r in changes]+additions
    if not all(json.loads(subprocess.check_output(['node','-e',js],cwd=ROOT,input=json.dumps(checked),text=True))):raise ValueError('Browser formula disagreement')
    if any(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h for p,h in before.items()):raise ValueError('Source changed during acquisition')
    if args.apply:
        # Replace only reviewed rows; preserve all existing keys and other fields.
        text=(ROOT/'data/library.js').read_text()
        spec=importlib.util.spec_from_file_location('bindings',Path(__file__).with_name('curate-receptor-bindings.py'))
        helper=importlib.util.module_from_spec(spec);spec.loader.exec_module(helper)
        for r in changes:
            old="smiles: "+helper.js_string(r['librarySmiles'])
            lines=text.splitlines(True);matches=[i for i,line in enumerate(lines) if 'name: '+helper.js_string(r['name'])+',' in line]
            if len(matches)!=1 or old not in lines[matches[0]]:raise ValueError('Unexpected library row')
            i=matches[0];lines[i]=lines[i].replace(old,'smiles: '+helper.js_string(r['sourceSmiles']))
            old_formula=next(e['formula'] for e in checked if e['name']==r['name'])
            # All reviewed corrections preserve formula; never infer identity from it.
            if 'formula: '+helper.js_string(old_formula) not in lines[i]:raise ValueError('Reviewed formula changed')
            text=''.join(lines)
        marker='];\n\nif (typeof module'
        if text.count(marker)!=1:raise ValueError('Unexpected library footer')
        rows=''.join('  { '+', '.join(k+': '+helper.js_string(e[k]) for k in ['name','cls','formula','smiles'])+' },\n' for e in additions)
        (ROOT/'data/library.js').write_text(text.replace(marker,rows+marker))
    report={'schemaVersion':1,'applied':args.apply,'rdkitVersion':rdBase.rdkitVersion,'sourceBeforeSha256':before,
            'changes':changes,'namedSelections':records,'additions':additions,
            'scope':'Reviewed identity corrections and named parent-structure references. No target links or pharmacological predictions added. Product-label roles do not establish a receptor mechanism; stored parent graphs do not represent marketed salts/formulations.',
            'toolSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
    args.output.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'reviewedCorrections':len(changes),'newStructures':len(additions),'namedSelections':len(records),'applied':args.apply}))


if __name__=='__main__':main()
