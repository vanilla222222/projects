# Derive candidate `cls: 'Beta blocker'` rows for molecule profiler's data/library.js.
# Template-anchored: the aryloxypropanolamine scaffold and its stereo vocabulary are proven
# from externally sourced library rows only (hand-written rows are not valid anchors).
# Candidates are literature-documented beta blockers; nothing is enumerated to reach a count.
# Gates: proven-anchor count >= 2, name collision (casefold, library + batch),
# stereo-stripped canonical-SMILES collision (library + batch), cls equality.
# Read-only with respect to /home/user/projects. Run with: python3 -I

import json, os, collections
from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog('rdApp.*')
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = json.load(open(os.path.join(HERE, 'library.json')))
TARGET_CLS = 'Beta blocker'

# ---------------------------------------------------------------- anchors
# Each anchor must be an externally sourced row (carries `source`). The scaffold
# SMARTS is transcribed here by hand; the re-check script transcribes its own.
APA_SMARTS = 'cO[CH2][CH1X4]([OX2H1])[CH2][NX3;H1]'
APA = Chem.MolFromSmarts(APA_SMARTS)

ANCHOR_NAMES = ['esatenolol', '(R)-(+)-propranolol', 'levomoprolol',
                'levobetaxolol', 'prenalterol', '(S)-timolol (anhydrous)']

by_name = {r['name'].casefold(): r for r in LIB}

def prove_anchor(name):
    r = by_name.get(name.casefold())
    if r is None:
        return None, 'absent from library'
    if not r.get('source'):
        return None, 'not externally sourced'
    m = Chem.MolFromSmiles(r['smiles'])
    if m is None:
        return None, 'unparseable SMILES'
    match = m.GetSubstructMatch(APA)
    if not match:
        return None, 'no aryloxypropanolamine SMARTS match'
    if CalcMolFormula(m) != r['formula']:
        return None, 'stored formula != CalcMolFormula'
    # CIP-label the carbinol carbon located BY THE MATCH (index 3 of the SMARTS)
    Chem.AssignStereochemistry(m, cleanIt=True, force=True)
    carbinol = m.GetAtomWithIdx(match[3])
    cip = carbinol.GetPropsAsDict().get('_CIPCode', 'flat')
    return {'name': r['name'], 'provider': r['source'].get('provider'),
            'smiles': r['smiles'], 'formula': r['formula'],
            'carbinol_idx': match[3], 'cip': cip,
            'stereo_token': ('[C@H]' if '[C@H](O)' in r['smiles'] else
                             '[C@@H]' if '[C@@H](O)' in r['smiles'] else 'none')}, None

anchors, anchor_fail = [], []
for n in ANCHOR_NAMES:
    a, why = prove_anchor(n)
    (anchors.append(a) if a else anchor_fail.append((n, why)))

print('=== ANCHOR PROOF ===')
for a in anchors:
    print(f"  OK   {a['name']:24s} {a['provider']:12s} {a['formula']:12s} "
          f"carbinol atom {a['carbinol_idx']:2d} CIP={a['cip']:4s} token={a['stereo_token']}")
for n, why in anchor_fail:
    print(f"  FAIL {n}: {why}")
print(f'  proven anchors = {len(anchors)}')
if len(anchors) < 2:
    raise SystemExit('ABORT: fewer than 2 proven sourced anchors.')

# Scaffold string copied VERBATIM from anchor[0] by deleting its aryl part.
# esatenolol  CC(C)NC[C@H](O)COc1ccc(CC(N)=O)cc1  ->  side chain 'NC[C@H](O)CO' / flat 'NCC(O)CO'
FLAT_CHAIN = 'CC(C)NCC(O)CO'   # isopropylamino, flat: anchors prove both flat and labelled forms

# ---------------------------------------------------------------- candidates
# disposition 'propose' rows carry a SMILES written here; 'refuse' rows carry the
# reason no structure could be proven to the standard of this method.
CANDIDATES = [
  # --- proposed: documented, and structure provable from in-library evidence ---
  dict(name='Pindolol', smiles='CC(C)NCC(O)COc1cccc2[nH]ccc12', mode='propose',
       evidence='structure independently written here; it canonicalises bit-for-bit onto the '
                'library row CHEMBL500, which is therefore pindolol. Corroborated in-library by '
                'Mepindolol (2-methylpindolol) and Bopindolol (mepindolol benzoate). '
                '(2-methylpindolol) and Bopindolol (mepindolol benzoate); isopropylamino '
                'arm proven by sourced anchors esatenolol/levomoprolol. Marketed racemate -> flat.'),
  dict(name='Desacetylmetipranolol', smiles='Oc1c(C)cc(OCC(O)CNC(C)C)c(C)c1C', mode='propose',
       evidence='pure ester-hydrolysis differential from the SOURCED row metipranolol '
                '(DrugCentral, CC(=O)Oc1c(C)cc(OCC(O)CNC(C)C)c(C)c1C); documented active '
                'metabolite of metipranolol. Racemate -> flat.'),

  # --- proposed only to exercise the structure-collision gate (expected to be refused) ---
  dict(name='Trimepranol', smiles='CC(=O)Oc1c(C)cc(OCC(O)CNC(C)C)c(C)c1C', mode='propose',
       evidence='synonym of metipranolol; included to exercise the structure gate.'),
  dict(name='Bunolol', smiles='CC(C)(C)NCC(O)COc1cccc2c1CCCC2=O', mode='propose',
       evidence='racemate of levobunolol; included to exercise the stereo-stripped gate.'),
  dict(name='Dexpropranolol', smiles='CC(C)NC[C@H](O)COc1cccc2ccccc12', mode='propose',
       evidence='(S)-propranolol; included to exercise the stereo-stripped gate.'),
  dict(name='Metoprolol acid', smiles='CC(C)NCC(O)COc1ccc(CC(=O)O)cc1', mode='propose',
       evidence='identical to the sourced row "atenolol acid"; exercises the structure gate.'),

  # --- already present under another class / name: expected name collisions ---
] + [dict(name=n, smiles=None, mode='name-probe', evidence='documented beta blocker; probing '
          'whether the library already holds it under a catch-all class')
     for n in ['befunolol','bucumolol','bufetolol','butofilolol','cetamolol','cicloprolol',
               'cloranolol','epanolol','esatenolol','landiolol','levobetaxolol','levomoprolol',
               'metipranolol','nipradilol','prenalterol','tertatolol','tilisolol','xibenolol',
               'amosulalol','medroxalol','sulfinalol','dilevalol','butidrine','diprafenone',
               'pindolol','mepindolol','bopindolol','carazolol','bufuralol','arotinolol']
] + [
  # --- refused: real compounds, but no in-library structural proof available ---
  dict(name=n, smiles=None, mode='refuse', evidence=why) for n, why in [
    ('Indenolol', 'inden-4-yl vs inden-7-yl ambiguity; commercial material is an isomer mixture; no in-library indene anchor'),
    ('Tolamolol', 'aryloxyethylamine linker details not provable in-library'),
    ('Pamatolol', 'carbamate ester arm not provable in-library'),
    ('Pafenolol', 'side-chain amide detail not provable in-library'),
    ('Primidolol', 'pyrimidinone attachment not provable in-library'),
    ('Tiprenolol', 'thioether position not provable in-library'),
    ('Bornaprolol', 'bornyl stereochemistry not provable in-library'),
    ('Cyanopindolol', 'indole-2-carbonitrile position recall-only; no in-library anchor'),
    ('Iodocyanopindolol', 'as cyanopindolol plus unproven iodination site'),
    ('Soquinolol', 'no in-library anchor'),
    ('Spirendolol', 'no in-library anchor'),
    ('Ridazolol', 'no in-library anchor'),
    ('Exaprolol', 'no in-library anchor'),
    ('Adimolol', 'no in-library anchor'),
    ('Ronactolol', 'no in-library anchor'),
    ('Metalol', 'no in-library anchor'),
    ('Procinolol', 'no in-library anchor'),
    ('Falintolol', 'oxime geometry not provable in-library'),
    ('Flestolol', 'no in-library anchor'),
    ('Adaprolol', 'ester arm not provable in-library'),
    ('Esprolol', 'no in-library anchor'),
    ('Iprocrolol', 'no in-library anchor'),
    ('8-Hydroxycarteolol', 'hydroxylation locant recall-only'),
    ('7-Hydroxypropranolol', 'hydroxylation locant recall-only'),
    ('Propranolol glycol', 'documented metabolite but not a beta blocker pharmacophore'),
    ('Denitronipradilol', 'clean differential from the sourced row nipradilol (nitrate ester -> alcohol), '
                          'but that it is a literature-named compound rests on recall alone'),
    ('Desacylbopindolol', 'clean differential from Bopindolol, but Bopindolol is a hand-written row '
                          '(not a valid anchor) and the compound name rests on recall alone'),
  ]
]

# ---------------------------------------------------------------- gates
def flat_key(smi):
    m = Chem.MolFromSmiles(smi)
    if m is None:
        return None
    return Chem.MolToSmiles(Chem.MolFromSmiles(Chem.MolToSmiles(m, isomericSmiles=False)))

lib_names = {r['name'].casefold() for r in LIB}
lib_keys = {}
for r in LIB:
    k = flat_key(r['smiles'])
    if k:
        lib_keys.setdefault(k, r['name'])

accounting = collections.Counter()
rows, log = [], []
batch_names, batch_keys = set(), {}

for c in CANDIDATES:
    n, smi, mode = c['name'], c['smiles'], c['mode']
    accounting['enumerated'] += 1
    if mode in ('refuse',):
        accounting['refused'] += 1
        log.append(('REFUSED', n, c['evidence']))
        continue
    if n.casefold() in lib_names:
        accounting['name-collision'] += 1
        log.append(('NAME-COLLISION', n, 'already in library as ' +
                    repr(by_name[n.casefold()]['name']) + ' cls=' +
                    repr(by_name[n.casefold()].get('cls'))))
        continue
    if mode == 'name-probe':
        accounting['refused'] += 1
        log.append(('REFUSED', n, 'name probe found no library row and no structure was proven'))
        continue
    m = Chem.MolFromSmiles(smi)
    if m is None:
        accounting['refused'] += 1
        log.append(('REFUSED', n, 'SMILES does not parse'))
        continue
    if not m.HasSubstructMatch(APA):
        accounting['refused'] += 1
        log.append(('REFUSED', n, 'fails the anchor-proven scaffold SMARTS'))
        continue
    k = flat_key(smi)
    if k in lib_keys:
        accounting['structure-collision'] += 1
        log.append(('STRUCTURE-COLLISION', n, 'stereo-stripped match with library row ' +
                    repr(lib_keys[k])))
        continue
    if n.casefold() in batch_names:
        accounting['name-collision'] += 1
        log.append(('NAME-COLLISION', n, 'duplicate within batch'))
        continue
    if k in batch_keys:
        accounting['structure-collision'] += 1
        log.append(('STRUCTURE-COLLISION', n, 'duplicate within batch with ' + batch_keys[k]))
        continue
    formula = CalcMolFormula(m)
    row = {'name': n, 'cls': TARGET_CLS, 'formula': formula, 'smiles': smi}
    assert row['cls'] == TARGET_CLS
    assert CalcMolFormula(Chem.MolFromSmiles(row['smiles'])) == row['formula']
    rows.append(row)
    batch_names.add(n.casefold())
    batch_keys[k] = n
    accounting['accepted'] += 1
    log.append(('ACCEPTED', n, formula + '  ' + smi))

print('\n=== GATE LOG ===')
for tag, n, why in log:
    print(f'  {tag:21s} {n:24s} {why}')
print('\n=== ACCOUNTING ===')
for k in ('enumerated', 'name-collision', 'structure-collision', 'refused', 'accepted'):
    print(f'  {k:21s} {accounting[k]}')

cur = sum(1 for r in LIB if r.get('cls') == TARGET_CLS)
print(f"\ncls={TARGET_CLS!r} currently {cur} rows; + {len(rows)} accepted = {cur + len(rows)}")


def jsq(s):
    return '"%s"' % s if "'" in s else "'%s'" % s

out = ['[']
for r in rows:
    out.append("  { name: %s, cls: %s, formula: %s, smiles: %s }," %
               (jsq(r['name']), jsq(r['cls']), jsq(r['formula']), jsq(r['smiles'])))
out.append(']')
open(os.path.join(HERE, 'Beta-blocker-rows.js'), 'w').write('\n'.join(out) + '\n')
json.dump(rows, open(os.path.join(HERE, 'accepted.json'), 'w'), indent=1)
print('\nwrote Beta-blocker-rows.js (%d rows)' % len(rows))
