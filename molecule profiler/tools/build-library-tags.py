#!/usr/bin/env python3
"""Build descriptive tags from stored graphs and qualified source associations."""
import hashlib
import json
import re
from pathlib import Path
import subprocess
import importlib.util
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
    ('N-acyltryptamines (side-chain amides)','[CX3](=[OX1])-[N]-[CH2]-[CH2]-c1c[nH,nH0]c2ccccc12'),
    ('Indole-3-carboxamides','[N]-[CX3](=[OX1])-c1c[nH,nH0]c2ccccc12'),
    ('Tryptophanamides','[N]-[CX3](=[OX1])-[CX4]([N])-[CH2]-c1c[nH,nH0]c2ccccc12'),
    ('Tryptamines','[N]-[CX4]-[CX4]-c1c[nH,nH0]c2ccccc12'),
    ('Cathinones','[N]-[CX4]-[CX3](=[OX1])-c1ccccc1'),
    ('Nitazene-related benzimidazoles','[N]-[CX4]-[CX4]-n1c([CX4]-c2ccccc2)nc2ccccc21'),
    ('Nitazenes','[N]-[CX4]-[CX4]-n1c([CX4]-c2ccccc2)nc2cc([N+](=O)[O-])ccc21'),
    ('N-benzylphenethylamines','[NX3,NX4+](Cc1ccccc1)CCc1ccccc1')]]
if any(pattern is None for _,pattern in FAMILY_MOTIFS):
    raise ValueError('Invalid family motif definition')


_spec=importlib.util.spec_from_file_location('library_taxonomy',Path(__file__).with_name('library-taxonomy.py'))
_tax=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_tax)
FAMILY_MOTIFS += _tax.compile_patterns(_tax.RINGS+_tax.SERIES)
MOTIFS = [(n,p)for n,p in MOTIFS if n not in {'Indole','Pyridine'}] + _tax.compile_patterns(_tax.EXTRA_MOTIFS)


SERIES_2C=Chem.MolFromSmarts('[NX3,NX4+;!$(N-C=O)]-[CH2]-[CH2]-c1c([OX2][CH3])ccc([OX2][CH3])c1')
MERGED_LABELS={'Tryptamine':'Family motif: Tryptamines','Amphetamine':'Family motif: Amphetamines (alpha-methylphenethylamines)','Cathinone':'Family motif: Cathinones','Benzofuran':'Family motif: Benzofurans','Benzothiophene':'Family motif: Benzothiophenes','Carbamate':'Carbamate motif','Sulfonamide':'Sulfonamide motif','Phenol':'Phenol motif','Epoxide':'Epoxide motif','Aldehyde':'Aldehyde motif','Thioamide':'Thioamide motif'}

def group(entry):
    if entry.get('source',{}).get('provider')=='DrugCentral':
        return 'DrugCentral named compounds'
    if entry.get('source',{}).get('provider')=='ChEBI':
        return 'ChEBI curated compounds'
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
    if entry.get('cls')in {'2C phenethylamine','2x phenethylamine','2X phenethylamine'} or mol.HasSubstructMatch(SERIES_2C):motifs.append('Series: 2C / 2C-x phenethylamines')
    label=entry.get('studyName',entry['name']).casefold()
    if re.search(r'tryptam|tryptophanamide|serotonin|melatonin|bufoten|psiloc|aeruginascin|baeocystin',label):
        motifs.append('Study collection: Named tryptamine-related compounds')
    if re.search(r'phenethylamine|tyramine|dopamine|epinephrine|adrenaline|octopamine|synephrine|hordenine|ephedrine|mescaline|amphetamine|cathinone|cathine',label):
        motifs.append('Study collection: Named phenethylamine-related compounds')
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
          'Rings: '+(str(rings) if rings<5 else '5+'),'Aromatic' if aromatic else 'Nonaromatic',
          'Graph charge: '+charge,'HBD: '+('0' if hbd==0 else '1' if hbd==1 else '2+'),
          'HBA: '+('0' if hba==0 else '1-3' if hba<4 else '4+'),
          'Rotatable bonds: '+('0' if rot==0 else '1-3' if rot<4 else '4+'),
          'TPSA: '+('<40 A^2' if tpsa<40 else '40-90 A^2' if tpsa<=90 else '>90 A^2')]
    if rdMolDescriptors.CalcNumSpiroAtoms(mol):motifs.append('Topology: spiro rings')
    if rdMolDescriptors.CalcNumBridgeheadAtoms(mol):motifs.append('Topology: bridged rings')
    if any(len(r)>=8 for r in mol.GetRingInfo().AtomRings()):motifs.append('Topology: macrocycle (8+ ring atoms)')
    if aromatic and rdMolDescriptors.CalcNumAliphaticRings(mol):motifs.append('Ring composition: aromatic and aliphatic')
    if not centers:motifs.append('Tetrahedral stereo: no potential centers')
    elif all(c!='?'for _,c in centers):motifs.append('Tetrahedral stereo: fully specified')
    elif all(c=='?'for _,c in centers):motifs.append('Tetrahedral stereo: unspecified')
    else:motifs.append('Tetrahedral stereo: partially specified')
    source=entry.get('source',{})
    if source.get('provider')in {'DrugCentral','ChEBI'} or entry.get('cls')in {'2C phenethylamine','2x phenethylamine','2X phenethylamine'} or MERGED_LABELS.get(entry.get('cls'))in motifs or entry.get('cls')in {'Fragment','ESOL reference','Ester reference','Ether reference','Ketone reference'}:base=base[1:]
    provenance=['Source snapshot: '+source['snapshot']] if source.get('provider') in {'DrugCentral','ChEBI'} else []
    return list(dict.fromkeys(base[:2]+provenance+motifs+base[2:]+sorted(bindings)))


def main():
    paths=['data/library.js','data/library-names.js','data/targets.js','data/receptor-catalog.js','data/receptor-ligand-annotations.js','js/receptor-catalog.js','tools/build-library-tags.py','tools/library-taxonomy.py']
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
console.log(JSON.stringify({library:l,bindings,names:require('./data/library-names').LIBRARY_NAME_METADATA.entries}));
"""
    data=json.loads(subprocess.check_output(['node','-e',code],cwd=ROOT,text=True))
    entries={e['name']:{'librarySmiles':e['smiles'],'tags':tags_for({**e,'studyName':data['names'].get(e['name'],{}).get('preferredName',e['name'])},data['bindings'].get(e['name'],[]))} for e in data['library']}
    if any(hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h for p,h in hashes.items()):
        raise ValueError('Source changed while generating tags')
    metadata={'schemaVersion':2,'seriesDefinitions':[{'tag':'Series: 2C / 2C-x phenethylamines','rule':'Historical 2C/2x classification OR supported N-substituted 2,5-dimethoxyphenethylamine core. Includes related derivatives; not a strict primary-amine class.','smarts':Chem.MolToSmarts(SERIES_2C)}],'familyDefinitions':[{'tag':'Family motif: '+name,'smarts':Chem.MolToSmarts(pattern)}for name,pattern in FAMILY_MOTIFS],'entries':entries}
    text="'use strict';\n// Descriptive graph tags and qualified reference labels. See LIBRARY-METADATA.md.\nconst LIBRARY_TAG_METADATA = "+json.dumps(metadata,ensure_ascii=False,separators=(',',':'))+";\nif(typeof module!=='undefined'&&module.exports)module.exports={LIBRARY_TAG_METADATA};\nif(typeof globalThis!=='undefined')globalThis.LIBRARY_TAG_METADATA=LIBRARY_TAG_METADATA;\n"
    (ROOT/'data/library-tags.js').write_text(text)
    report={'schemaVersion':1,'rdkitVersion':rdBase.rdkitVersion,'sourceSha256':hashes,'entries':len(entries),
            'minTags':min(len(e['tags']) for e in entries.values()),'maxTags':max(len(e['tags']) for e in entries.values()),
            'method':'Explicit graph families and functional groups, source collections, property bins and qualified binding labels. Ring synonyms and duplicate source labels are consolidated. Family definitions are serialized with SMARTS. Stored graph charges and calculated bins are not physiological protonation or clinical claims. Original class labels remain explicitly labelled, not experimentally validated.',
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
