#!/usr/bin/env python3
"""Reproducible, offline import of named DrugCentral structures; never synthesize entries."""
import argparse
import csv
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
from collections import Counter
from rdkit import Chem, rdBase
from rdkit.Chem import rdMolDescriptors

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'validation/sources/drugcentral-structures-2021-09-01.tsv'
SHA='5b81423a2ec1e2766e9666ec4a172d5a5b47045ea2cc032d1ba06085956bc1fc'
SOURCE_URL='https://unmtid-dbs.net/download/DrugCentral/2021_09_01/structures.smiles.tsv'
MARKER='  // BEGIN SOURCED DRUGCENTRAL NAMED COMPOUNDS'
END='  // END SOURCED DRUGCENTRAL NAMED COMPOUNDS'

def node(code, data=None):
    return json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT,input=json.dumps(data) if data is not None else None,text=True))

def canonical(smiles):
    mol=Chem.MolFromSmiles(smiles)
    if mol is None:raise ValueError('Invalid graph')
    return Chem.MolToSmiles(mol,isomericSmiles=True)

def run(write=False):
    raw=SOURCE.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=SHA:raise ValueError('Source checksum mismatch')
    original=(ROOT/'data/library.js').read_text()
    base=re.sub(re.escape(MARKER)+r'.*?'+re.escape(END)+r'\n','',original,flags=re.S)
    # Evaluate a temporary in-memory copy; no base entries or reference keys change.
    entries=node("const vm=require('node:vm'),fs=require('node:fs');let c={};vm.createContext(c);vm.runInContext(JSON.parse(fs.readFileSync(0,'utf8'))+';globalThis.rows=LIBRARY;',c);console.log(JSON.stringify(c.rows));",base)
    metadata=node("console.log(JSON.stringify(require('./data/library-names').LIBRARY_NAME_METADATA));")
    names={e['name'].casefold() for e in entries}
    names.update(r['preferredName'].casefold()for r in metadata['entries'].values())
    graphs={canonical(e['smiles']) for e in entries}
    rows=list(csv.DictReader(io.StringIO(raw.decode()),delimiter='\t'))
    rejected=[];pending=[]
    def reject(row,reason):rejected.append({'sourceId':row['ID'],'name':row['INN'],'reason':reason})
    for row in sorted(rows,key=lambda r:(r['INN'].casefold(),int(r['ID']))):
        name=row['INN'].strip()
        if not name or re.match(r'^(?:CHEMBL|SCHEMBL|CID|DTXSID|AKOS|ZINC)\s*\d',name,re.I) or re.fullmatch(r'(?:[A-Z][a-z]?\d*)+',name) or any(c in name for c in '\r\n\t'):
            reject(row,'Missing or identifier/formula-only name');continue
        if name.casefold() in names:reject(row,'Existing name or sourced display name');continue
        mol=Chem.MolFromSmiles(row['SMILES'])
        if mol is None:reject(row,'RDKit parse failure');continue
        if len(Chem.GetMolFrags(mol))!=1:reject(row,'Disconnected source structure retained outside browser library');continue
        # Some source names describe a salt while the download contains only its
        # organic moiety. Do not present that moiety as the complete named salt.
        salt_name=bool(re.search(r'\b(?:sodium|potassium|calcium|magnesium|lithium|(?:di|tri)?hydrochloride|(?:di|tri)?hydrobromide|tosylate|mesylate|besylate|metilsulfate|metiodide)\b',name,re.I))
        halide=re.search(r'(chloride|bromide|iodide)\b',name,re.I)
        missing_halide=halide and (any(a.GetFormalCharge()for a in mol.GetAtoms()) or not any(a.GetSymbol()=={'chloride':'Cl','bromide':'Br','iodide':'I'}[halide[1].lower()]for a in mol.GetAtoms()))
        if salt_name or missing_halide:
            reject(row,'Salt name refers to missing counterion or a different supplied form');continue
        if not any(a.GetAtomicNum()==6 for a in mol.GetAtoms()) or any(a.GetSymbol()not in {'C','H','N','O','S','P','F','Cl','Br','I'}for a in mol.GetAtoms()):
            reject(row,'Outside supported organic element set');continue
        if mol.GetNumAtoms()>120:reject(row,'Outside 120-atom browser budget');continue
        if any(a.GetNumRadicalElectrons()for a in mol.GetAtoms()):reject(row,'Open-shell source structure');continue
        if Chem.MolToInchiKey(mol)!=row['InChIKey']:reject(row,'Source SMILES/InChIKey disagreement');continue
        smiles=Chem.MolToSmiles(mol,isomericSmiles=True)
        if smiles in graphs:reject(row,'Existing exact isomeric graph');continue
        # Reserve accepted names/graphs only after browser validation below.
        pending.append((row,mol,smiles))
    probe=r"""
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
    checks=node(probe,[s for _,_,s in pending]);added=[];records=[]
    for (row,mol,smiles),check in zip(pending,checks):
        if check.get('error') or not check.get('finite'):
            reject(row,'Browser descriptor/serialization unavailable');continue
        formula=rdMolDescriptors.CalcMolFormula(mol)
        if formula!=check['formula']:
            reject(row,'Browser/native formula disagreement');continue
        try:equal=canonical(check['serialized'])==smiles
        except ValueError:equal=False
        if not equal:reject(row,'Browser round-trip isotope/stereo/graph disagreement');continue
        if smiles in graphs or row['INN'].casefold() in names:
            reject(row,'Duplicate within imported collection');continue
        source={'provider':'DrugCentral','id':row['ID'],'url':'https://drugcentral.org/drugcard/'+row['ID'],
                'snapshot':'2021-09-01','cas':row['CAS_RN'],'inchiKey':row['InChIKey'],
                'license':'CC BY-SA 4.0','nameKind':'DrugCentral INN/source name','librarySmiles':smiles}
        entry={'name':row['INN'],'cls':'DrugCentral named compound','formula':formula,'smiles':smiles,'source':source}
        added.append(entry);records.append({'name':row['INN'],'sourceId':row['ID'],'sourceSmiles':row['SMILES'],
            'sourceInchiKey':row['InChIKey'],'librarySmiles':smiles,'formula':formula,
            'browserRoundTripSmiles':check['serialized']})
        graphs.add(smiles);names.add(row['INN'].casefold())
    report={'schemaVersion':1,'provider':'DrugCentral, University of New Mexico','sourceUrl':SOURCE_URL,
        'sourceSnapshot':'2021-09-01','sourceSha256':SHA,'sourceRows':len(rows),'baseEntries':len(entries),
        'added':len(added),'total':len(entries)+len(added),'baseLibrarySha256':hashlib.sha256(base.encode()).hexdigest(),'rdkitVersion':rdBase.rdkitVersion,
        'toolSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'license':'CC BY-SA 4.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/',
        'changes':'Selected named, single-component supported organic graphs; converted source SMILES to RDKit isomeric canonical SMILES and recomputed formulas. Preserved supplied charge, isotopes and stereo. No neutralization, salt stripping, tautomer enumeration or analogue generation.',
        'scope':'Source names and structures, not a claim of current approval, target binding, safety or validated prediction accuracy. Snapshot may include historical or veterinary drugs. Excluded unsupported structures are reported rather than simplified.',
        'rejectionCounts':dict(Counter(r['reason']for r in rejected)),'records':records,'rejected':rejected}
    lines='\n'.join('  '+json.dumps(e,ensure_ascii=False,separators=(',',':'))+',' for e in added)
    text=base.replace('\n];','\n'+MARKER+'\n'+lines+'\n'+END+'\n];')
    if text==base:raise ValueError('Library insertion marker not found')
    report['librarySha256']=hashlib.sha256(text.encode()).hexdigest()
    if write:
        (ROOT/'data/library.js').write_text(text)
        (ROOT/'validation/named-library-import.json').write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n')
        # Existing sourced-name metadata records are unchanged; only their whole-library hash changes.
        provenance_path=ROOT/'validation/library-name-provenance.json'
        provenance=provenance_path.read_text()
        provenance_path.write_text(re.sub(r'(\"librarySha256\":\s*\")[^\"]+(\")',lambda m:m[1]+report['librarySha256']+m[2],provenance,count=1))
    print(json.dumps({k:report[k]for k in ['sourceRows','baseEntries','added','total','rejectionCounts']},indent=2))
    return report

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--write',action='store_true');run(p.parse_args().write)
