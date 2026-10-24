#!/usr/bin/env python3
"""Build descriptive tags from stored graphs and qualified source associations."""
import hashlib
import json
from pathlib import Path
import subprocess
from rdkit import Chem, rdBase
from rdkit.Chem import Descriptors, Lipinski, rdMolDescriptors

ROOT = Path(__file__).resolve().parents[1]
MOTIFS = [(name,Chem.MolFromSmarts(smarts)) for name,smarts in [
    ('Amide','[NX3][CX3](=[OX1])'),('Ester','[CX3](=[OX1])[OX2][#6]'),
    ('Carboxylic acid','[CX3](=O)[OX2H1]'),('Amine','[NX3;!$(N-C=O);!$(N-S(=O)=O)]'),
    ('Alcohol','[OX2H1][CX4]'),('Phenol','[OX2H1]c'),
    ('Ether','[#6][OX2;!$([O]-[C]=[O])][#6]'),('Ketone','[#6][CX3](=[OX1])[#6]'),
    ('Sulfonamide','S(=O)(=O)N'),('Indole','c1ccc2[nH]ccc2c1'),
    ('Pyridine','n1ccccc1')]]

# Explicit substructure definitions, not inferred pharmacology or exhaustive
# taxonomic membership. Nested motifs intentionally produce multiple tags.
FAMILY_MOTIFS = [(name,Chem.MolFromSmarts(smarts)) for name,smarts in [
    ('Phenethylamines','[N]-[CX4]-[CX4]-c1ccccc1'),
    ('Amphetamines (alpha-methylphenethylamines)','[N]-[CX4]([CH3])-[CH2]-c1ccccc1'),
    ('Tryptamines','[N]-[CX4]-[CX4]-c1c[nH,nH0]c2ccccc12'),
    ('Cathinones','[N]-[CX4]-[CX3](=[OX1])-c1ccccc1'),
    ('2Cs (2,5-dimethoxyphenethylamines)','[$([NX3H2]),$([NX4H3+])]-[CH2]-[CH2]-c1c([OX2][CH3])ccc([OX2][CH3])c1'),
    ('Nitazene-related benzimidazoles','[N]-[CX4]-[CX4]-n1c([CX4]-c2ccccc2)nc2ccccc21'),
    ('Nitazenes','[N]-[CX4]-[CX4]-n1c([CX4]-c2ccccc2)nc2cc([N+](=O)[O-])ccc21'),
    ('N-benzylphenethylamines','[NX3,NX4+](Cc1ccccc1)CCc1ccccc1')]]
if any(pattern is None for _,pattern in FAMILY_MOTIFS):
    raise ValueError('Invalid family motif definition')


def group(entry):
    if entry.get('source',{}).get('provider')=='DrugCentral':
        return 'DrugCentral named compounds'
    cls=entry.get('cls','')
    return 'ESOL-labelled' if cls=='ESOL reference' else 'Illustrative series' if cls in ('Ester reference','Ether reference','Ketone reference') else 'Fragment examples' if cls=='Fragment' else 'Reference library'


def tags_for(entry, bindings=()):
    mol=Chem.MolFromSmiles(entry['smiles'])
    if mol is None:
        raise ValueError('Invalid graph: '+entry['name'])
    heavy=mol.GetNumHeavyAtoms();rings=rdMolDescriptors.CalcNumRings(mol)
    aromatic=any(a.GetIsAromatic() for a in mol.GetAtoms())
    charges=[a.GetFormalCharge() for a in mol.GetAtoms()]
    charge='positive' if sum(charges)>0 else 'negative' if sum(charges)<0 else 'charge-separated' if any(charges) else 'neutral'
    hbd=Lipinski.NumHDonors(mol);hba=Lipinski.NumHAcceptors(mol);rot=Lipinski.NumRotatableBonds(mol);tpsa=Descriptors.TPSA(mol)
    motifs=[name+' motif' for name,pattern in MOTIFS if mol.HasSubstructMatch(pattern)]
    motifs += ['Family motif: '+name for name,pattern in FAMILY_MOTIFS if mol.HasSubstructMatch(pattern)]
    elements={a.GetSymbol() for a in mol.GetAtoms()}
    motifs += [name for element,name in [('F','Fluorinated'),('Cl','Chlorinated'),('Br','Brominated'),('I','Iodinated'),('S','Sulfur-containing'),('P','Phosphorus-containing')] if element in elements]
    if elements & {'F','Cl','Br','I'}:
        motifs.append('Halogenated')
    centers=Chem.FindMolChiralCenters(mol,includeUnassigned=True)
    if any(label!='?' for _,label in centers):
        motifs.append('Stereo: specified tetrahedral centers')
    if any(label=='?' for _,label in centers):
        motifs.append('Stereo: unspecified tetrahedral centers')
    if any(b.GetStereo() in (Chem.BondStereo.STEREOE,Chem.BondStereo.STEREOZ,Chem.BondStereo.STEREOCIS,Chem.BondStereo.STEREOTRANS) for b in mol.GetBonds()):
        motifs.append('Stereo: specified double bonds')
    base=['Label: '+entry.get('cls','Unclassified'),'Collection: '+group(entry),
          'Size: '+('small (<20 heavy atoms)' if heavy<20 else 'medium (20-39 heavy atoms)' if heavy<40 else 'large (40+ heavy atoms)'),
          'Rings: '+(str(rings) if rings<3 else '3+'),'Aromatic' if aromatic else 'Nonaromatic',
          'Graph charge: '+charge,'HBD: '+('0' if hbd==0 else '1' if hbd==1 else '2+'),
          'HBA: '+('0' if hba==0 else '1-3' if hba<4 else '4+'),
          'Rotatable bonds: '+('0' if rot==0 else '1-3' if rot<4 else '4+'),
          'TPSA: '+('<40 A^2' if tpsa<40 else '40-90 A^2' if tpsa<=90 else '>90 A^2')]
    source=entry.get('source',{})
    provenance=['Source: DrugCentral','Source snapshot: '+source['snapshot']] if source.get('provider')=='DrugCentral' else []
    return list(dict.fromkeys(base[:2]+provenance+motifs+base[2:]+sorted(bindings)))


def main():
    paths=['data/library.js','data/targets.js','data/receptor-catalog.js','data/receptor-ligand-annotations.js','js/receptor-catalog.js','tools/build-library-tags.py']
    hashes={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in paths}
    code=r"""
const {LIBRARY:l}=require('./data/library'),{TARGETS:t}=require('./data/targets'),
 {RECEPTOR_REFERENCE_CATALOG:c}=require('./data/receptor-catalog'),
 {RECEPTOR_LIGAND_ANNOTATIONS:a}=require('./data/receptor-ligand-annotations'),api=require('./js/receptor-catalog');
const errors=api.validateAnnotations(a,c.receptors,l);if(errors.length)throw Error('Invalid source annotations');
const byName=new Map(l.map(e=>[e.name,e])),bindings={};
for(const r of c.receptors){const linked=new Set(api.links(r,t).flatMap(x=>x.target.ligands||[]));
 for(const x of a){if(x.receptorId!==r.id||!linked.has(x.ligandName)||x.evidenceType!=='binding'||x.librarySmiles!==byName.get(x.ligandName)?.smiles)continue;
  (bindings[x.ligandName]??=[]).push('Binding: '+r.id,'Binding family: '+r.family);
 }}
console.log(JSON.stringify({library:l,bindings}));
"""
    data=json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT,text=True))
    entries={e['name']:{'librarySmiles':e['smiles'],'tags':tags_for(e,data['bindings'].get(e['name'],[]))} for e in data['library']}
    if any(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h for p,h in hashes.items()):
        raise ValueError('Source changed while generating tags')
    metadata={'schemaVersion':1,'entries':entries}
    text="'use strict';\n// Descriptive graph tags and qualified reference labels. See LIBRARY-METADATA.md.\nconst LIBRARY_TAG_METADATA = "+json.dumps(metadata,ensure_ascii=False,separators=(',',':'))+";\nif(typeof module!=='undefined'&&module.exports)module.exports={LIBRARY_TAG_METADATA};\nif(typeof globalThis!=='undefined')globalThis.LIBRARY_TAG_METADATA=LIBRARY_TAG_METADATA;\n"
    (ROOT/'data/library-tags.js').write_text(text)
    report={'schemaVersion':1,'rdkitVersion':rdBase.rdkitVersion,'sourceSha256':hashes,'entries':len(entries),
            'minTags':min(len(e['tags']) for e in entries.values()),'maxTags':max(len(e['tags']) for e in entries.values()),
            'method':'Ten descriptive base tags plus functional-group/element motifs and source-linked binding tags. Stored graph charges and calculated bins are not physiological protonation or clinical claims. Original class labels remain explicitly labelled, not experimentally validated.',
            'dataSha256':hashlib.sha256(text.encode()).hexdigest()}
    (ROOT/'validation/library-tag-provenance.json').write_text(json.dumps(report,indent=2)+'\n')
    families=[{'tag':'Family motif: '+name,
               'entries':[e['name'] for e in data['library'] if 'Family motif: '+name in entries[e['name']]['tags']]}
              for name,_ in FAMILY_MOTIFS]
    for family in families:
        family['count']=len(family['entries'])
    coverage={'schemaVersion':1,'sourceSha256':hashes,'dataSha256':report['dataSha256'],
              'interpretation':'Overlapping structural motifs in stored graphs; not evidence of pharmacological function, exhaustive family membership or independently verified molecular identities.',
              'families':families}
    (ROOT/'validation/library-family-coverage.json').write_text(json.dumps(coverage,indent=2)+'\n')
    print(json.dumps({k:report[k] for k in ['entries','minTags','maxTags']}))


if __name__=='__main__':
    main()
