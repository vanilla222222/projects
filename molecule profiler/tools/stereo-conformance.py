# Builds the stereochemistry conformance set and scores js/stereo.js against RDKit.
# Takes every library SMILES, enumerates stereoisomers with RDKit, asks RDKit's
# rdCIPLabeler for the true CIP labels, then compares centre counts and R/S + E/Z
# labels with what tools/stereo-conformance.js reports for the same strings.
# Usage: python3 -I tools/stereo-conformance.py [--write]
import json
import collections, re, subprocess, sys, os, random
from rdkit import Chem, RDLogger
from rdkit.Chem import rdCIPLabeler
from rdkit.Chem.EnumerateStereoisomers import EnumerateStereoisomers, StereoEnumerationOptions
RDLogger.DisableLog('rdApp.*')

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(root, 'data/library.js')).read()
rows = re.findall(r"\{ name: '((?:[^'\\]|\\.)*)', cls: '[^']*', formula: '[^']*', smiles: '([^']*)' \}", src)

random.seed(11)
cases = []
opts = StereoEnumerationOptions(maxIsomers=2, onlyUnassigned=True, tryEmbedding=False)
for name, smi in rows:
    m = Chem.MolFromSmiles(smi)
    if m is None:
        continue
    try:
        isomers = list(EnumerateStereoisomers(m, options=opts))
    except Exception:
        continue
    if not isomers:
        continue
    for iso in isomers:
        cases.append((name, Chem.MolToSmiles(iso)))

print('library rows', len(rows), 'enumerated cases', len(cases))

byElement = collections.defaultdict(lambda: [0, 0, 0])
CAP = 10000 if '--dump' in sys.argv else 10

def rdkit_view(smi):
    m = Chem.MolFromSmiles(smi)
    if m is None:
        return None
    Chem.AssignStereochemistry(m, cleanIt=True, force=True)
    rdCIPLabeler.AssignCIPLabels(m)
    centers = []
    labels = {}
    for atom in m.GetAtoms():
        pass
    found = Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=False)
    for idx, code in found:
        centers.append(idx)
        if code in ('R', 'S'):
            labels[idx] = code
    for atom in m.GetAtoms():
        if atom.HasProp('_CIPCode'):
            labels[atom.GetIdx()] = atom.GetProp('_CIPCode')
    bonds = []
    bondlabels = {}
    for bond in m.GetBonds():
        if bond.GetStereo() != Chem.BondStereo.STEREONONE:
            key = (bond.GetBeginAtomIdx(), bond.GetEndAtomIdx())
            bonds.append(key)
            if bond.HasProp('_CIPCode'):
                bondlabels[key] = bond.GetProp('_CIPCode')
    return {'centers': centers, 'labels': labels, 'bonds': bonds, 'bondLabels': bondlabels}

smiles = [c[1] for c in cases]
proc = subprocess.run(['node', os.path.join(root, 'tools/stereo-conformance.js')],
                      input='\n'.join(smiles), capture_output=True, text=True)
if proc.returncode != 0:
    print(proc.stderr[-3000:])
    sys.exit(1)
mine = [json.loads(line) for line in proc.stdout.strip().split('\n')]
assert len(mine) == len(cases), (len(mine), len(cases))

stat = dict(cases=0, errors=0, centerSetMatch=0, labelTotal=0, labelMatch=0,
            labelMissing=0, bondSetMatch=0, bondLabelTotal=0, bondLabelMatch=0,
            bondLabelMissing=0, extraCenters=0, missedCenters=0)
examples = {'label': [], 'center': [], 'bond': []}
for (name, smi), got in zip(cases, mine):
    ref = rdkit_view(smi)
    if ref is None:
        continue
    stat['cases'] += 1
    if 'error' in got:
        stat['errors'] += 1
        if len(examples['center']) < CAP:
            examples['center'].append({'name': name, 'smiles': smi, 'why': got['error']})
        continue
    refc = set(ref['centers'])
    myc = set(got['centers'])
    if refc == myc:
        stat['centerSetMatch'] += 1
    else:
        stat['extraCenters'] += len(myc - refc)
        stat['missedCenters'] += len(refc - myc)
        if len(examples['center']) < CAP:
            examples['center'].append({'name': name, 'smiles': smi,
                                       'extra': sorted(myc - refc), 'missed': sorted(refc - myc)})
    for idx, code in ref['labels'].items():
        stat['labelTotal'] += 1
        hit = got['labels'].get(str(idx))
        kind = got.get('elements', {}).get(str(idx), '?')
        byElement[kind][0] += 1
        if hit == code:
            byElement[kind][1] += 1
            stat['labelMatch'] += 1
        elif hit is None:
            stat['labelMissing'] += 1
            if len(examples['label']) < CAP:
                examples['label'].append({'name': name, 'smiles': smi, 'atom': idx,
                                          'rdkit': code, 'mine': None})
        else:
            if len(examples['label']) < CAP:
                examples['label'].append({'name': name, 'smiles': smi, 'atom': idx,
                                          'rdkit': code, 'mine': hit})
    refb = set(ref['bonds'])
    myb = set(tuple(b) for b in got['bonds'])
    if refb == myb:
        stat['bondSetMatch'] += 1
    elif len(examples['bond']) < CAP:
        examples['bond'].append({'name': name, 'smiles': smi,
                                 'extra': sorted(myb - refb), 'missed': sorted(refb - myb)})
    for key, code in ref['bondLabels'].items():
        stat['bondLabelTotal'] += 1
        hit = got['bondLabels'].get('%d,%d' % key)
        if hit == code:
            stat['bondLabelMatch'] += 1
        elif hit is None:
            stat['bondLabelMissing'] += 1
        elif len(examples['bond']) < CAP:
            examples['bond'].append({'name': name, 'smiles': smi, 'bond': key,
                                     'rdkit': code, 'mine': hit})

def pct(a, b):
    return 0.0 if not b else round(100.0 * a / b, 2)

print()
print('cases scored        ', stat['cases'], '  parse errors', stat['errors'])
print('centre set exact    ', stat['centerSetMatch'], pct(stat['centerSetMatch'], stat['cases']), '%')
print('  extra centres     ', stat['extraCenters'], ' missed centres', stat['missedCenters'])
print('R/S labels compared ', stat['labelTotal'])
print('  agree             ', stat['labelMatch'], pct(stat['labelMatch'], stat['labelTotal']), '%')
print('  not labelled by me', stat['labelMissing'])
print('  disagree          ', stat['labelTotal'] - stat['labelMatch'] - stat['labelMissing'])
print('double bond set     ', stat['bondSetMatch'], pct(stat['bondSetMatch'], stat['cases']), '%')
print('E/Z labels compared ', stat['bondLabelTotal'])
print('  agree             ', stat['bondLabelMatch'], pct(stat['bondLabelMatch'], stat['bondLabelTotal']), '%')
print('  not labelled by me', stat['bondLabelMissing'])
print('  disagree          ', stat['bondLabelTotal'] - stat['bondLabelMatch'] - stat['bondLabelMissing'])
print()
print('R/S agreement by centre element:degree')
for kind in sorted(byElement):
    seen, ok, _ = byElement[kind]
    print('  %-8s %5d compared %5d agree %6.2f %%' % (kind, seen, ok, pct(ok, seen)))
for kind in ('center', 'label', 'bond'):
    if examples[kind]:
        print()
        print('example mismatches:', kind)
        for e in examples[kind][:10]:
            print('  ', json.dumps(e))

if '--dump' in sys.argv:
    where = sys.argv[sys.argv.index('--dump') + 1]
    with open(where, 'w') as fh:
        for kind in ('center', 'label', 'bond'):
            for e in examples[kind]:
                e['kind'] = kind
                fh.write(json.dumps(e) + '\n')
    print('\nwrote', where)

if '--write' in sys.argv:
    out = {
        'generated': '2026-10-19',
        'cases': stat['cases'],
        'centerSetMatch': stat['centerSetMatch'],
        'centerSetPct': pct(stat['centerSetMatch'], stat['cases']),
        'labels': stat['labelTotal'],
        'labelMatch': stat['labelMatch'],
        'labelPct': pct(stat['labelMatch'], stat['labelTotal']),
        'labelMissing': stat['labelMissing'],
        'labelWrong': stat['labelTotal'] - stat['labelMatch'] - stat['labelMissing'],
        'bondSetMatch': stat['bondSetMatch'],
        'bondSetPct': pct(stat['bondSetMatch'], stat['cases']),
        'bondLabels': stat['bondLabelTotal'],
        'bondLabelMatch': stat['bondLabelMatch'],
        'bondLabelPct': pct(stat['bondLabelMatch'], stat['bondLabelTotal']),
        'bondLabelMissing': stat['bondLabelMissing'],
        'bondLabelWrong': stat['bondLabelTotal'] - stat['bondLabelMatch'] - stat['bondLabelMissing'],
        'extraCenters': stat['extraCenters'],
        'missedCenters': stat['missedCenters'],
        'byElement': dict((k, {'compared': v[0], 'agree': v[1], 'pct': pct(v[1], v[0])})
                          for k, v in sorted(byElement.items())),
        'errors': stat['errors']
    }
    path = os.path.join(root, 'data/stereocases.js')
    with open(path, 'w') as fh:
        fh.write('// Generated by tools/stereo-conformance.py. Do not edit by hand.\n')
        fh.write("'use strict';\n\n")
        fh.write('const STEREO_CONFORMANCE = ' + json.dumps(out, indent=2) + ';\n\n')
        fh.write("if (typeof module !== 'undefined' && module.exports) { module.exports = { STEREO_CONFORMANCE }; }\n")
    print('\nwrote data/stereocases.js')
