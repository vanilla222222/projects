# Template-anchored derivation of new cls:'Penicillin' rows for data/library.js.
#
# Anchors are externally SOURCED penam rows only (hand-written rows have a measured
# defect rate and are never anchors). Each anchor is re-proven here: it must parse,
# must match the 6-aminopenicillanic-acid (penam) bicycle SMARTS, must carry the
# (2S,5R,6R) natural configuration by RDKit's CIP labeller, and its stored formula
# must equal CalcMolFormula of its stored SMILES.
#
# The scaffold stereo tags are copied verbatim from anchor 'benzylpenicillin'; the
# only varying slot is the C6 acylamino side chain (plus, for the two prodrug-ester
# rows, the C3 carboxyl ester). Formulae are composed DIFFERENTIALLY from the
# 6-APA core (6-APA + side-chain acid - H2O [+ alcohol - H2O]) and then cross
# checked against RDKit CalcMolFormula on the generated SMILES.
#
# Run: python3 -I derive-Penicillin-references.py    (reads library.json in cwd)

import json, re, sys, collections
from rdkit import Chem, RDLogger
from rdkit.Chem import rdCIPLabeler
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog('rdApp.*')

TARGET_CLS = 'Penicillin'
PENAM_SMARTS = 'C1(=O)N2C(C(=O)[OH0,OH1])C(C)(C)SC2C1'
# Penam core CIP, keyed by position in PENAM_SMARTS:
#   match[3]  = the carboxyl-bearing ring carbon  -> S
#   match[11] = the ring-fusion carbon (C5)       -> R
#   match[12] = the C6 acylamino carbon           -> R
NATURAL_CIP = {3: 'S', 11: 'R', 12: 'R'}
APA_CORE = {'C': 8, 'H': 12, 'N': 2, 'O': 3, 'S': 1}
WATER = {'H': 2, 'O': 1}

ANCHOR_NAMES = ['benzylpenicillin', 'phenoxymethylpenicillin', 'penamecillin']

# ---------------------------------------------------------------- helpers

def formula_dict(f):
    d = collections.Counter()
    for el, n in re.findall(r'([A-Z][a-z]?)(\d*)', f):
        if el:
            d[el] += int(n) if n else 1
    return d

def formula_str(d):
    out = ''
    for el in ('C', 'H'):
        if d.get(el):
            out += el + (str(d[el]) if d[el] > 1 else '')
    for el in sorted(k for k in d if k not in ('C', 'H')):
        if d[el]:
            out += el + (str(d[el]) if d[el] > 1 else '')
    return out

def add(a, b, sign=1):
    d = collections.Counter(a)
    for k, v in b.items():
        d[k] += sign * v
    return d

def core_cip(mol, patt):
    """CIP labels of the three penam stereocentres, keyed by SMARTS position."""
    rdCIPLabeler.AssignCIPLabels(mol)
    match = mol.GetSubstructMatch(patt)
    if not match:
        return None
    out = {}
    for pos in NATURAL_CIP:
        a = mol.GetAtomWithIdx(match[pos])
        out[pos] = a.GetPropsAsDict().get('_CIPCode')
    return out

def flat(smiles):
    m = Chem.MolFromSmiles(smiles)
    if m is None:
        return None
    Chem.RemoveStereochemistry(m)
    return Chem.MolToSmiles(m)

def wrap(prefix):
    """Parenthesise a substituent prefix at a prefix site when it is composite."""
    if re.fullmatch(r'[A-Za-z]+', prefix):
        return prefix
    return '(' + prefix + ')'

# ---------------------------------------------------------------- anchors

lib = json.load(open('library.json'))
penam = Chem.MolFromSmarts(PENAM_SMARTS)
assert penam is not None

by_name = {}
for r in lib:
    by_name.setdefault(r['name'], r)

proven = []
for nm in ANCHOR_NAMES:
    r = by_name.get(nm)
    if r is None:
        print('anchor missing:', nm); continue
    if not r.get('source'):
        print('anchor rejected (not externally sourced):', nm); continue
    m = Chem.MolFromSmiles(r['smiles'])
    if m is None:
        print('anchor rejected (unparseable):', nm); continue
    if not m.HasSubstructMatch(penam):
        print('anchor rejected (no penam core):', nm); continue
    cip = core_cip(m, penam)
    if cip != NATURAL_CIP:
        print('anchor rejected (core stereo not 2S,5R,6R):', nm, cip); continue
    if CalcMolFormula(m) != r['formula']:
        print('anchor rejected (formula mismatch):', nm, r['formula'], CalcMolFormula(m)); continue
    proven.append(r)
    print('anchor proven: %-26s %-14s C2=%s C5=%s C6=%s  [%s]'
          % (nm, r['formula'], cip[3], cip[11], cip[12], r['source']['provider']))

if len(proven) < 2:
    sys.exit('HARD GATE FAILED: proven sourced anchors = %d (< 2). Class not derivable.' % len(proven))
print('proven sourced anchors: %d\n' % len(proven))

# Scaffold tags copied verbatim from anchor[0] (benzylpenicillin).
ANCHOR_SMILES = proven[0]['smiles']
assert ANCHOR_SMILES == 'CC1(C)S[C@@H]2[C@H](NC(=O)Cc3ccccc3)C(=O)N2[C@H]1C(=O)O'
SCAFFOLD = 'CC1(C)S[C@@H]2[C@H](N{side})C(=O)N2[C@H]1C(=O){ester}'

def build(side, ester='O'):
    return SCAFFOLD.format(side=side, ester=ester)

# ------------------------------------------------- candidate enumeration
# (name, side-chain acyl fragment, side-chain acid formula, ester SMILES,
#  ester alcohol formula, literature basis)
# Every entry is a penicillin documented in the literature; none is invented.
CANDIDATES = [
 ('Benzylpenicillin','C(=O)Cc3ccccc3','C8H8O2',None,None,'penicillin G, natural'),
 ('Phenoxymethylpenicillin','C(=O)COc3ccccc3','C8H8O3',None,None,'penicillin V, natural'),
 ('Heptylpenicillin','C(=O)CCCCCCC','C8H16O2',None,None,'penicillin K, natural fermentation series'),
 ('Pentylpenicillin','C(=O)CCCCC','C6H12O2',None,None,'dihydropenicillin F, natural'),
 ('Pent-2-enylpenicillin','C(=O)CC=CCC','C6H10O2',None,None,'penicillin F, natural'),
 ('(4-Hydroxybenzyl)penicillin','C(=O)Cc3ccc(O)cc3','C8H8O3',None,None,'penicillin X, natural'),
 ('(Allylsulfanylmethyl)penicillin','C(=O)CSCC=C','C5H8O2S',None,None,'penicillin O / almecillin'),
 ('(1-Phenoxyethyl)penicillin','C(=O)C(C)Oc3ccccc3','C9H10O3',None,None,'pheneticillin'),
 ('(1-Phenoxypropyl)penicillin','C(=O)C(CC)Oc3ccccc3','C10H12O3',None,None,'propicillin'),
 ('(Phenoxyphenylmethyl)penicillin','C(=O)C(Oc3ccccc3)c3ccccc3','C14H12O3',None,None,'fenbenicillin'),
 ('Aminobenzylpenicillin','C(=O)[C@H](N)c3ccccc3','C8H9NO2',None,None,'ampicillin'),
 ('(Amino-4-hydroxybenzyl)penicillin','C(=O)[C@H](N)c3ccc(O)cc3','C8H9NO3',None,None,'amoxicillin'),
 ('Carboxybenzylpenicillin','C(=O)C(C(=O)O)c3ccccc3','C9H8O4',None,None,'carbenicillin'),
 ('(Carboxy-3-thienylmethyl)penicillin','C(=O)C(C(=O)O)c3ccsc3','C7H6O4S',None,None,'ticarcillin'),
 ('(5-Methyl-3-phenylisoxazol-4-ylcarbonyl)penicillin','C(=O)c3c(-c4ccccc4)noc3C','C11H9NO3',None,None,'oxacillin'),
 ('[3-(2-Chlorophenyl)-5-methylisoxazol-4-ylcarbonyl]penicillin','C(=O)c3c(-c4ccccc4Cl)noc3C','C11H8ClNO3',None,None,'cloxacillin'),
 ('[3-(2,6-Dichlorophenyl)-5-methylisoxazol-4-ylcarbonyl]penicillin','C(=O)c3c(-c4c(Cl)cccc4Cl)noc3C','C11H7Cl2NO3',None,None,'dicloxacillin'),
 ('[3-(2-Chloro-6-fluorophenyl)-5-methylisoxazol-4-ylcarbonyl]penicillin','C(=O)c3c(-c4c(Cl)cccc4F)noc3C','C11H7ClFNO3',None,None,'flucloxacillin'),
 ('(2,6-Dimethoxybenzoyl)penicillin','C(=O)c3c(OC)cccc3OC','C9H10O4',None,None,'methicillin'),
 ('(2-Ethoxynaphthalen-1-ylcarbonyl)penicillin','C(=O)c3c(OCC)ccc4ccccc34','C13H12O3',None,None,'nafcillin'),
 ('(Azidobenzyl)penicillin','C(=O)C(N=[N+]=[N-])c3ccccc3','C8H7N3O2',None,None,'azidocillin'),
 ('(1-Aminocyclohexylcarbonyl)penicillin','C(=O)C3(N)CCCCC3','C7H13NO2',None,None,'ciclacillin'),
 ('[Amino(cyclohexa-1,4-dien-1-yl)methyl]penicillin','C(=O)C(N)C3=CCCC=C3','C8H11NO2',None,None,'epicillin'),
 ('(Sulfobenzyl)penicillin','C(=O)C(S(=O)(=O)O)c3ccccc3','C8H8O5S',None,None,'sulbenicillin'),
 ('{[(4-Ethyl-2,3-dioxopiperazin-1-yl)carbonylamino]benzyl}penicillin','C(=O)C(NC(=O)N3CCN(CC)C(=O)C3=O)c3ccccc3','C15H17N3O5',None,None,'piperacillin'),
 ('{[(2-Oxoimidazolidin-1-yl)carbonylamino]benzyl}penicillin','C(=O)C(NC(=O)N3CCNC3=O)c3ccccc3','C12H13N3O4',None,None,'azlocillin'),
 ('({[3-(Methanesulfonyl)-2-oxoimidazolidin-1-yl]carbonylamino}benzyl)penicillin','C(=O)C(NC(=O)N3CCN(S(C)(=O)=O)C3=O)c3ccccc3','C13H15N3O6S',None,None,'mezlocillin'),
 ('{[(4-Hydroxy-1,5-naphthyridin-3-ylcarbonyl)amino]benzyl}penicillin','C(=O)[C@H](NC(=O)c3cnc4cccnc4c3O)c3ccccc3','C17H13N3O4',None,None,'apalcillin'),
 ('[(3,4-Dichlorophenyl)methoxymethyl]penicillin','C(=O)C(OC)c3ccc(Cl)c(Cl)c3','C9H8Cl2O3',None,None,'clometocillin'),
 ('(5-Amino-5-carboxypentanoyl)penicillin','C(=O)CCC[C@@H](N)C(=O)O','C6H11NO4',None,None,'adicillin / penicillin N'),
 ('[(Phenoxycarbonyl)benzyl]penicillin','C(=O)C(C(=O)Oc3ccccc3)c3ccccc3','C15H12O4',None,None,'carfecillin'),
 ('[(Indanyloxycarbonyl)benzyl]penicillin','C(=O)C(C(=O)Oc3ccc4c(c3)CCC4)c3ccccc3','C18H16O4',None,None,'carindacillin'),
 ('6-Benzamidopenicillanic acid','C(=O)c3ccccc3','C7H6O2',None,None,'benzoyl-6-APA, classical semisynthetic analogue'),
 ('2-(Diethylamino)ethyl benzylpenicillinate','C(=O)Cc3ccccc3','C8H8O2','OCCN(CC)CC','C6H15NO','penethamate'),
 ('(Acetyloxymethyl) benzylpenicillinate','C(=O)Cc3ccccc3','C8H8O2','OCOC(C)=O','C3H6O3','penamecillin'),
 ('(2,2-Dimethylpropanoyloxymethyl) aminobenzylpenicillinate','C(=O)[C@H](N)c3ccccc3','C8H9NO2','OCOC(=O)C(C)(C)C','C6H12O3','pivampicillin'),
 ('(3-Oxo-1,3-dihydro-2-benzofuran-1-yl) aminobenzylpenicillinate','C(=O)[C@H](N)c3ccccc3','C8H9NO2','OC3OC(=O)c4ccccc43','C8H6O3','talampicillin'),
]

# ---------------------------------------------------------------- build
built, dropped = [], []
for name, side, acid, ester, alc, basis in CANDIDATES:
    smi = build(side, ester if ester else 'O')
    m = Chem.MolFromSmiles(smi)
    if m is None:
        dropped.append((name, 'unparseable SMILES', basis)); continue
    if not m.HasSubstructMatch(penam):
        dropped.append((name, 'generated structure lost the penam core', basis)); continue
    cip = core_cip(m, penam)
    if cip != NATURAL_CIP:
        dropped.append((name, 'core stereo %s != anchor (2S,5R,6R)' % cip, basis)); continue
    # differential formula
    d = add(APA_CORE, formula_dict(acid))
    d = add(d, WATER, -1)
    if ester:
        d = add(d, formula_dict(alc))
        d = add(d, WATER, -1)
    diff = formula_str(d)
    rdkit_f = CalcMolFormula(m)
    if diff != rdkit_f:
        dropped.append((name, 'differential formula %s != RDKit %s' % (diff, rdkit_f), basis)); continue
    if 'CF' in smi:
        dropped.append((name, "SMILES contains 'CF' (parses as californium)", basis)); continue
    built.append({'name': name, 'cls': TARGET_CLS, 'formula': diff,
                  'smiles': Chem.MolToSmiles(m), '_basis': basis})

print('candidates enumerated: %d   built: %d   dropped pre-gate: %d\n'
      % (len(CANDIDATES), len(built), len(dropped)))

# ---------------------------------------------------------------- gates
lib_names = {r['name'].casefold() for r in lib}
lib_flat = {}
for r in lib:
    f = flat(r['smiles'])
    if f:
        lib_flat.setdefault(f, r['name'])

# The stored hand-written row 'Ticarcillin' draws the thiophene as 2-thienyl
# (c1cccs1) where ticarcillin is the 3-thienyl isomer (cf. sourced 'temocillin',
# c2ccsc2). The correctly drawn structure therefore does NOT trip the structure
# gate, but adding it would put a second ticarcillin row in the library beside a
# defective one. Reported, not spliced: refused here by name.
MANUAL_REFUSE = {
 '(Carboxy-3-thienylmethyl)penicillin':
   'near-duplicate of defective stored row "Ticarcillin" (2-thienyl isomer); reported, not added',
}

rows, suppressed = [], []
seen_names, seen_flat = set(), {}
for row in built:
    nm, smi = row['name'], row['smiles']
    if nm in MANUAL_REFUSE:
        suppressed.append((nm, MANUAL_REFUSE[nm], row['_basis'])); continue
    if nm.casefold() in lib_names:
        suppressed.append((nm, 'name collision with library', row['_basis'])); continue
    if nm.casefold() in seen_names:
        suppressed.append((nm, 'name collision within batch', row['_basis'])); continue
    f = flat(smi)
    if f in lib_flat:
        suppressed.append((nm, 'structure collision (stereo-stripped) with library row "%s"'
                           % lib_flat[f], row['_basis'])); continue
    if f in seen_flat:
        suppressed.append((nm, 'structure collision (stereo-stripped) within batch with "%s"'
                           % seen_flat[f], row['_basis'])); continue
    assert row['cls'] == TARGET_CLS
    seen_names.add(nm.casefold()); seen_flat[f] = nm
    rows.append(row)

print('--- suppressed by gates: %d ---' % len(suppressed))
for nm, why, basis in suppressed:
    print('  %-70s %s   [%s]' % (nm, why, basis))
print('\n--- dropped pre-gate: %d ---' % len(dropped))
for nm, why, basis in dropped:
    print('  %-70s %s   [%s]' % (nm, why, basis))

print('\n--- accepted rows: %d ---' % len(rows))
for r in rows:
    print('  %-46s %-14s %s' % (r['name'], r['formula'], r['smiles']))

for r in rows:
    r.pop('_basis')

with open('Penicillin-rows.js', 'w') as fh:
    fh.write('[\n')
    for i, r in enumerate(rows):
        fh.write("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' }%s\n"
                 % (r['name'], r['cls'], r['formula'], r['smiles'],
                    '' if i == len(rows) - 1 else ','))
    fh.write(']\n')

json.dump(rows, open('rows.json', 'w'), indent=1)
print('\nwrote Penicillin-rows.js (%d rows) and rows.json' % len(rows))
print('class size would become 12 + %d = %d' % (len(rows), 12 + len(rows)))
