#!/usr/bin/env python3
"""Resolve display names without changing stable reference keys or structures."""
import argparse
import concurrent.futures
import datetime
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import re
import subprocess
import time
from urllib.parse import urlencode
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from rdkit import Chem, rdBase
from rdkit.Chem.MolStandardize import rdMolStandardize

ROOT = Path(__file__).resolve().parents[1]
PROPERTIES = 'IUPACName,Title,IsomericSMILES,InChIKey'


def canonical(smiles):
    mol = Chem.MolFromSmiles(smiles or '')
    if mol is None:
        raise ValueError('Invalid structure')
    return Chem.MolToSmiles(mol, isomericSmiles=True)


@lru_cache(maxsize=16384)
def tautomer_family(smiles):
    mol=Chem.MolFromSmiles(smiles or '')
    if mol is None or len(Chem.GetMolFrags(mol))!=1:
        return None
    enumerator=rdMolStandardize.TautomerEnumerator()
    # Naming an explicitly disclosed standardized form is separate from exact
    # reference-graph identity. Preserve tetrahedral stereo; no neutralization.
    enumerator.SetRemoveSp3Stereo(False)
    enumerator.SetRemoveBondStereo(True)
    result=enumerator.Enumerate(mol)
    if result.status!=rdMolStandardize.TautomerEnumeratorStatus.Completed:
        return None
    return Chem.MolToSmiles(enumerator.PickCanonical(result),isomericSmiles=True)


def usable_name(name):
    name = str(name or '').strip()
    return bool(name and not re.match(r'^(?:CHEMBL|SCHEMBL|CID|DTXSID|AKOS|ZINC)\s*\d', name, re.I)
                and not re.fullmatch(r'\d{2,7}-\d{2}-\d', name))


def choose_name(record):
    title, systematic = record.get('Title', '').strip(), record.get('IUPACName', '').strip()
    if usable_name(title):
        return title, 'systematic' if title.casefold() == systematic.casefold() else 'source title'
    return (systematic, 'systematic') if usable_name(systematic) else ('', '')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--cache', type=Path, default=Path('/tmp/mp-library-names-cache'))
    ap.add_argument('--offline', action='store_true')
    args = ap.parse_args()
    args.cache.mkdir(parents=True, exist_ok=True)
    source = ROOT/'data/library.js'
    before = hashlib.sha256(source.read_bytes()).hexdigest()
    entries = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./data/library').LIBRARY))"], cwd=ROOT, text=True))
    wanted = [e for e in entries if re.fullmatch(r'CHEMBL\d+', e['name'])]
    keys = {}
    for e in wanted:
        keys.setdefault(Chem.MolToInchiKey(Chem.MolFromSmiles(e['smiles'])), []).append(e)
    requests = {}

    def get(batch):
        url = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/inchikey/'+','.join(batch)+'/property/'+PROPERTIES+'/JSON'
        cache = args.cache/(hashlib.sha256(url.encode()).hexdigest()+'.json')
        if cache.exists():
            envelope = json.loads(cache.read_text())
        else:
            if args.offline:
                raise ValueError('Missing cached name request: '+url)
            time.sleep(0.35)
            try:
                with urlopen(Request(url, headers={'User-Agent':'MoleculeProfiler-NameCuration/1.0'}), timeout=60) as response:
                    data = json.load(response)
                status = 200
            except HTTPError as error:
                if error.code != 404:
                    raise
                data, status = {'missing': True}, 404
            envelope = {'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(), 'status':status, 'response':data}
            cache.write_text(json.dumps(envelope)+'\n')
        requests[url] = {'retrievedAt':envelope['retrievedAt'], 'status':envelope['status'],
                         'sha256':hashlib.sha256(json.dumps(envelope['response'],sort_keys=True,separators=(',',':')).encode()).hexdigest()}
        if envelope['status'] == 404 and len(batch) > 1:
            half = len(batch)//2
            return get(batch[:half])+get(batch[half:])
        return envelope['response'].get('PropertyTable', {}).get('Properties', [])

    batches = [list(keys)[i:i+40] for i in range(0,len(keys),40)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        properties = [r for batch in pool.map(get,batches) for r in batch]
    by_key = {}
    for p in properties:
        by_key.setdefault(p.get('InChIKey'), []).append(p)
    # ChEMBL's own preferred names can resolve records that PubChem stores in a
    # different tautomer/stereo representation. Verify against ChEMBL's graph.
    missing=[]
    for key,group in keys.items():
        for e in group:
            if not any(canonical(p.get('SMILES',p.get('IsomericSMILES'))) == canonical(e['smiles']) and choose_name(p)[0] for p in by_key.get(key,[])):
                missing.append(e['name'])
    chembl={}
    for offset in range(0,len(missing),40):
        url='https://www.ebi.ac.uk/chembl/api/data/molecule.json?'+urlencode({'molecule_chembl_id__in':','.join(missing[offset:offset+40]),'limit':40,'only':'molecule_chembl_id,pref_name,molecule_structures'})
        cache=args.cache/(hashlib.sha256(url.encode()).hexdigest()+'.json')
        if cache.exists():
            envelope=json.loads(cache.read_text())
        else:
            if args.offline:
                raise ValueError('Missing cached ChEMBL request')
            time.sleep(0.5)
            with urlopen(Request(url,headers={'User-Agent':'MoleculeProfiler-NameCuration/1.0'}),timeout=60) as response:
                data=json.load(response)
            envelope={'retrievedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':200,'response':data}
            cache.write_text(json.dumps(envelope)+'\n')
        requests[url]={'retrievedAt':envelope['retrievedAt'],'status':200,'sha256':hashlib.sha256(json.dumps(envelope['response'],sort_keys=True,separators=(',',':')).encode()).hexdigest()}
        for p in envelope['response']['molecules']:
            chembl[p['molecule_chembl_id']]=p
    names, records = {}, []
    for key, group in keys.items():
        for e in group:
            matches = []
            for p in by_key.get(key, []):
                try:
                    if canonical(p.get('SMILES',p.get('IsomericSMILES'))) == canonical(e['smiles']) and choose_name(p)[0]:
                        matches.append(p)
                except ValueError:
                    continue
            if not matches:
                fallback=chembl.get(e['name'],{})
                smiles=(fallback.get('molecule_structures') or {}).get('canonical_smiles')
                if usable_name(fallback.get('pref_name')) and smiles and canonical(smiles)==canonical(e['smiles']):
                    label=fallback['pref_name']
                    names[e['name']]={'librarySmiles':e['smiles'],'preferredName':label,'nameKind':'ChEMBL preferred name','aliases':[e['name']],
                                     'sourceUrl':'https://www.ebi.ac.uk/chembl/explore/compound/'+e['name'],'chemblId':e['name']}
                    records.append({'referenceId':e['name'],'status':'exact ChEMBL isomeric graph match','sourceResponse':{'molecule_chembl_id':e['name'],'pref_name':label,'canonical_smiles':smiles}})
                else:
                    family=tautomer_family(e['smiles'])
                    compatible=[p for p in by_key.get(key,[]) if family and tautomer_family(p.get('SMILES',p.get('IsomericSMILES')))==family and choose_name(p)[0]]
                    if compatible and len({choose_name(p)[0].casefold() for p in compatible})==1:
                        p=min(compatible,key=lambda x:x['CID']);label,kind=choose_name(p)
                        names[e['name']]={'librarySmiles':e['smiles'],'preferredName':label,'nameKind':kind+' (PubChem standardized form)',
                                         'matchType':'tautomer-standardized','aliases':sorted({e['name'],p.get('IUPACName',''),p.get('Title','')}-{label,''}),
                                         'sourceUrl':'https://pubchem.ncbi.nlm.nih.gov/compound/'+str(p['CID']),'pubchemCid':p['CID']}
                        records.append({'referenceId':e['name'],'status':'disclosed standardized-form name; not an exact stored-graph name','sourceResponse':p})
                    else:
                        records.append({'referenceId':e['name'],'status':'no exact or qualified standardized-form name','pubchemCandidates':by_key.get(key,[])})
                continue
            # Multiple source records are accepted only if they agree on the name.
            labels = {choose_name(p)[0].casefold() for p in matches}
            if len(labels) != 1:
                records.append({'referenceId':e['name'],'status':'ambiguous source names'})
                continue
            p = min(matches,key=lambda x:x['CID']); label, kind = choose_name(p)
            aliases = sorted({e['name'],p.get('IUPACName',''),p.get('Title','')}-{label,''})
            names[e['name']] = {'librarySmiles':e['smiles'],'preferredName':label,'nameKind':kind,
                               'aliases':aliases,'sourceUrl':'https://pubchem.ncbi.nlm.nih.gov/compound/'+str(p['CID']),
                               'pubchemCid':p['CID']}
            records.append({'referenceId':e['name'],'status':'exact isomeric graph match','sourceResponse':p})
    if hashlib.sha256(source.read_bytes()).hexdigest() != before:
        raise ValueError('Library changed during name curation')
    metadata = {'schemaVersion':1,'entries':names}
    text = "'use strict';\n// Sourced display names; stable library keys and molecular graphs are unchanged.\nconst LIBRARY_NAME_METADATA = "+json.dumps(metadata,ensure_ascii=False,separators=(',',':'))+";\nif(typeof module!=='undefined'&&module.exports)module.exports={LIBRARY_NAME_METADATA};\nif(typeof globalThis!=='undefined')globalThis.LIBRARY_NAME_METADATA=LIBRARY_NAME_METADATA;\n"
    report = {'schemaVersion':1,'rdkitVersion':rdBase.rdkitVersion,'librarySha256':before,
              'toolSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
              'dataSha256':hashlib.sha256(text.encode()).hexdigest(),
              'protocol':'Prefer exact isomeric graph matches to PubChem titles/IUPAC names or ChEMBL preferred names. Otherwise require the full InChIKey plus completed RDKit tautomer-family agreement, no neutralization and tetrahedral stereo retained; explicitly label these as PubChem standardized-form names, not exact stored-graph names. Never change reference keys or graphs.',
              'requested':len(wanted),'resolved':len(names),'requests':requests,'records':records}
    (ROOT/'data/library-names.js').write_text(text)
    (ROOT/'validation/library-name-provenance.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'requested':len(wanted),'resolved':len(names),'unresolved':len(wanted)-len(names)}))


if __name__ == '__main__':
    main()
