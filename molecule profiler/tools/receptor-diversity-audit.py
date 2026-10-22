#!/usr/bin/env python3
"""Audit ring-scaffold coverage of current source-linked receptor profiles.

Requires RDKit and Node. This describes reference diversity, not prediction
accuracy, pharmacological breadth, or independent experimental validation.
"""
import argparse
from collections import defaultdict
from functools import lru_cache
import hashlib
import json
from pathlib import Path
import subprocess
from rdkit import Chem, rdBase
from rdkit.Chem.MolStandardize import rdMolStandardize
from rdkit.Chem.Scaffolds import MurckoScaffold

ROOT = Path(__file__).resolve().parents[1]


@lru_cache(maxsize=16384)
def profile_scaffold(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None or len(Chem.GetMolFrags(mol)) != 1:
        raise ValueError('Invalid or disconnected source graph')
    parent = rdMolStandardize.Uncharger().uncharge(mol)
    enumerator = rdMolStandardize.TautomerEnumerator()
    enumerator.SetRemoveBondStereo(False)
    enumerator.SetRemoveSp3Stereo(False)
    enumerated = enumerator.Enumerate(parent)
    if enumerated.status != rdMolStandardize.TautomerEnumeratorStatus.Completed:
        raise ValueError('Incomplete tautomer enumeration')
    parent = enumerator.PickCanonical(enumerated)
    identity = Chem.MolToSmiles(parent, isomericSmiles=True)
    scaffold = MurckoScaffold.GetScaffoldForMol(parent)
    return hashlib.sha256(identity.encode()).hexdigest(), Chem.MolToSmiles(scaffold, isomericSmiles=False)


def summarize(records):
    profiles = {}
    for record in records:
        identity, scaffold = profile_scaffold(record['librarySmiles'])
        if identity != record['identityKey']:
            raise ValueError('Source profile identity disagrees with current RDKit grouping')
        if identity in profiles and profiles[identity] != scaffold:
            raise ValueError('Conflicting scaffolds for one source profile')
        profiles[identity] = scaffold
    scaffolds = defaultdict(int)
    for scaffold in profiles.values():
        if scaffold:
            scaffolds[scaffold] += 1
    ring_profiles = sum(scaffolds.values())
    ranked = sorted(scaffolds.items(), key=lambda item: (-item[1], item[0]))
    return {'sourcedProfiles': len(profiles), 'ringProfiles': ring_profiles,
            'acyclicProfiles': len(profiles)-ring_profiles,
            'distinctRingScaffolds': len(scaffolds),
            'largestRingScaffoldProfiles': ranked[0][1] if ranked else 0,
            'largestRingScaffoldFractionOfRingProfiles': ranked[0][1]/ring_profiles if ring_profiles else None,
            'ringScaffolds': [{'smiles': scaffold, 'profiles': count} for scaffold, count in ranked]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    sources = ['data/library.js', 'data/targets.js', 'data/receptor-catalog.js',
               'data/receptor-ligand-annotations.js', 'js/receptor-catalog.js',
               'tools/receptor-diversity-audit.py']
    hashes = {p: hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in sources}
    code = r"""
const api=require('./js/receptor-catalog'),{LIBRARY:l}=require('./data/library'),
 {TARGETS:t}=require('./data/targets'),{RECEPTOR_REFERENCE_CATALOG:c}=require('./data/receptor-catalog'),
 {RECEPTOR_LIGAND_ANNOTATIONS:a}=require('./data/receptor-ligand-annotations');
const errors=api.validateAnnotations(a,c.receptors,l);
if(errors.length)throw Error('Invalid annotation contracts: '+JSON.stringify(errors));
const entries=new Map(l.filter(e=>!e.propertyOnly).map(e=>[e.name,e]));
console.log(JSON.stringify(c.receptors.map(r=>{
 const listed=new Set(api.links(r,t).flatMap(x=>x.target.ligands||[]));
 const records=a.filter(x=>x.receptorId===r.id&&listed.has(x.ligandName)&&entries.has(x.ligandName)
  &&entries.get(x.ligandName).smiles===x.librarySmiles&&/^[a-f0-9]{64}$/.test(x.identityKey||''));
 return {id:r.id,name:r.name,coverage:api.coverage(r,t,l,a),records};
})));
"""
    panels = json.loads(subprocess.check_output(['node', '-e', code], cwd=ROOT, text=True))
    rows = []
    for panel in panels:
        row = {'id': panel['id'], 'name': panel['name'], **summarize(panel['records'])}
        if row['sourcedProfiles'] != panel['coverage']['sourcedProfiles']:
            raise ValueError('Coverage/profile disagreement for '+panel['id'])
        rows.append(row)
    if any(hashlib.sha256((ROOT/p).read_bytes()).hexdigest() != h for p, h in hashes.items()):
        raise ValueError('Source changed during diversity audit')
    report = {'schemaVersion': 1, 'rdkitVersion': rdBase.rdkitVersion, 'sourceSha256': hashes,
              'method': 'RDKit Bemis-Murcko ring/linker scaffolds after audited uncharging and tautomer grouping; scaffold stereochemistry and isotopic labels omitted, atom and bond types retained.',
              'limitations': ['Current valid, linked and non-stale sourced profiles only; legacy names excluded.',
                             'Profiles deduplicated within each receptor; the same profile may occur at multiple receptors.',
                             'Acyclic profiles have no Murcko ring scaffold and are reported separately, not as one shared scaffold.',
                             'Scaffold diversity is representation-dependent and does not establish pharmacological diversity, assay independence or prediction accuracy.',
                             'No similarity threshold, potency weighting, or structure-activity extrapolation.'],
              'rows': rows}
    args.output.write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps({'panels': len(rows), 'withSourcedProfiles': sum(r['sourcedProfiles'] > 0 for r in rows),
                      'sourceHashesStable': True}))


if __name__ == '__main__':
    main()
