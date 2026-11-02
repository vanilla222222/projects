#!/usr/bin/env python3
"""derive-carbonic-anhydrase-references.py -- template-anchored derivation of cls 'Carbonic anhydrase inhibitor' reference rows."""

import json, sys, re, os, itertools, collections, subprocess, tempfile
from rdkit import Chem
from rdkit.Chem import rdMolDescriptors as rdm
from rdkit import RDLogger
RDLogger.DisableLog('rdApp.*')

CACHE = os.environ.get("MP_DERIVE_CACHE") or tempfile.mkdtemp(prefix="mp-derive-cai-")
LIBJSON = os.path.join(CACHE, "library-dump.json")
PROJECT = "/home/user/projects/molecule profiler"
CLS = 'Carbonic anhydrase inhibitor'
TARGET_TOTAL = 50

CORES = {}

CORES['thiadiazolesulfonamide'] = dict(
    label='1,3,4-thiadiazole-2-sulfonamide (acetazolamide / butazolamide)',
    query='[NH2]S(=O)(=O)c1nncs1',
    template='NS(=O)(=O)c%10nnc{5}s%10',
    locmap={5:'3', 6:'4', 7:'5'},
    sites=['5'],
    parent='C2H3N3O2S2',
    stem='1,3,4-thiadiazole-2-sulfonamide',
    generate=True,
    refusal=None,
)
CORES['benzothiazolesulfonamide'] = dict(
    label='1,3-benzothiazole-2-sulfonamide (ethoxzolamide)',
    query='[NH2]S(=O)(=O)c1nc2ccccc2s1',
    template='NS(=O)(=O)c%10nc%11c{4}c{5}c{6}c{7}c%11s%10',
    locmap={7:'4', 8:'5', 9:'6', 10:'7'},
    sites=['4', '5', '6', '7'],
    parent='C7H6N2O2S2',
    stem='1,3-benzothiazole-2-sulfonamide',
    generate=True,
    refusal=None,
)
CORES['pyrazolylbenzenesulfonamide'] = dict(
    label='4-(pyrazol-1-yl)benzenesulfonamide (celecoxib / deracoxib / mavacoxib)',
    query='[NH2]S(=O)(=O)c1[cH][cH]c([cH][cH]1)-n1cccn1',
    template='NS(=O)(=O)c%10ccc(cc%10)-n%11c{5}c{4}c{3}n%11',
    locmap={11:'5', 12:'4', 13:'3'},
    sites=['3', '4', '5'],
    parent='C9H9N3O2S',
    stem='4-(pyrazol-1-yl)benzenesulfonamide',
    generate=True,
    refusal=None,
)
CORES['thiophenesulfonamide'] = dict(
    label='thiophene-2-sulfonamide',
    query='[NH2]S(=O)(=O)c1cccs1',
    template='NS(=O)(=O)c%10c{3}c{4}c{5}s%10',
    locmap={5:'3', 6:'4', 7:'5'},
    sites=['3', '4', '5'],
    parent='C4H5NO2S2',
    stem='thiophene-2-sulfonamide',
    generate=True,
    refusal=None,
)
CORES['benzenedisulfonamide'] = dict(
    label='benzene-1,3-disulfonamide (clofenamide / dichlorphenamide / disulfamide)',
    query='[NH2]S(=O)(=O)c1cccc(c1)S(=O)(=O)[NH2]',
    template='NS(=O)(=O)c%10c{6}c{5}c{4}c(c{2}%10)S(N)(=O)=O',
    locmap={5:'6', 6:'5', 7:'4', 9:'2'},
    sites=['2', '4', '5', '6'],
    parent='C6H8N2O4S2',
    stem='benzene-1,3-disulfonamide',
    generate=True,
    refusal=None,
)
CORES['thienothiopyransulfonamide'] = dict(
    label='5,6-dihydro-4H-thieno[2,3-b]thiopyran-2-sulfonamide 7,7-dioxide (dorzolamide)',
    query='[NH2]S(=O)(=O)c1cc2c(s1)S(=O)(=O)CCC2',
    template=None,
    locmap={7:'3', 8:'4', 12:'6', 13:'5', 14:'4'},
    sites=['3', '4', '5', '6'],
    parent='C7H9NO4S3',
    stem='5,6-dihydro-4H-thieno[2,3-b]thiopyran-2-sulfonamide 7,7-dioxide',
    generate=False,
    refusal=None,
)
CORES['thienothiazinesulfonamide'] = dict(
    label='3,4-dihydro-2H-thieno[3,2-e][1,2]thiazine-6-sulfonamide 1,1-dioxide (brinzolamide)',
    query='[NH2]S(=O)(=O)c1cc2c(s1)S(=O)(=O)[NX3]~[#6]~[#6]2',
    template=None,
    locmap={},
    sites=['2', '3', '4', '7'],
    parent='C6H10N2O4S3',
    stem='3,4-dihydro-2H-thieno[3,2-e][1,2]thiazine-6-sulfonamide 1,1-dioxide',
    generate=False,
    refusal=None,
)
CORES['benzisoxazolemethanesulfonamide'] = dict(
    label='1,2-benzoxazol-3-ylmethanesulfonamide (zonisamide)',
    query='[NH2]S(=O)(=O)Cc1noc2ccccc12',
    template=None,
    locmap={},
    sites=['4', '5', '6', '7'],
    parent='C8H8N2O3S',
    stem='1,2-benzoxazol-3-ylmethanesulfonamide',
    generate=False,
    refusal=None,
)
CORES['benzenesulfonamide'] = dict(
    label='benzenesulfonamide (simple primary aryl sulfonamides)',
    query='[NH2]S(=O)(=O)c1ccccc1',
    template=None,
    locmap={},
    sites=['2', '3', '4'],
    parent='C6H7NO2S',
    stem='benzenesulfonamide',
    generate=False,
    refusal="cross-class double count: the substituted primary benzenesulfonamide product "
            "space on this core was already derived and shipped under cls 'Sulfonamide', "
            "which stands at 50 rows and holds the 2-, 3- and 4-halo, -methyl, -methoxy, "
            "-hydroxy, -nitro, -amino, -ethyl and -trifluoromethyl mono-substituted "
            "benzenesulfonamides plus the N-alkyl series. Re-deriving them under cls "
            "'Carbonic anhydrase inhibitor' would count one derived family twice.",
)
CORES['benzothiadiazine'] = dict(
    label='3,4-dihydro-2H-1,2,4-benzothiadiazine 1,1-dioxide (thiazide diuretics)',
    query='O=S1(=O)N[#6]Nc2ccccc21',
    template=None,
    locmap={},
    sites=['2', '3', '6'],
    parent='C7H8N2O2S',
    stem='3,4-dihydro-2H-1,2,4-benzothiadiazine 1,1-dioxide',
    generate=False,
    refusal="cross-class double count: the benzothiadiazine-7-sulfonamide 1,1-dioxide "
            "product space on this core was already derived and shipped under cls "
            "'Diuretic', which stands at 54 rows and holds nine derived thiazides plus "
            "derived tetrahydroquinazoline-6-sulfonamides and 3-sulfamoylbenzamides. "
            "Re-deriving them under cls 'Carbonic anhydrase inhibitor' would count one "
            "derived family twice.",
)

VALIDATION = {
    '[NH2]S(=O)(=O)c1nncs1': (
        ['NS(=O)(=O)c1nncs1', 'CC(=O)Nc1nnc(s1)S(N)(=O)=O', 'CCCC(=O)Nc1nnc(S(N)(=O)=O)s1',
         'Nc1nnc(S(N)(=O)=O)s1'],
        ['CCOc1ccc2nc(S(N)(=O)=O)sc2c1', 'NS(=O)(=O)c1cccs1',
         'Cc1nnc(NS(=O)(=O)c2ccc(N)cc2)s1', 'NS(=O)(=O)c1nccs1',
         'NS(=O)(=O)c1ccccc1']),
    '[NH2]S(=O)(=O)c1nc2ccccc2s1': (
        ['CCOc1ccc2nc(S(N)(=O)=O)sc2c1', 'NS(=O)(=O)c1nc2ccccc2s1'],
        ['NS(=O)(=O)c1nncs1', 'Nc1nc2cc(OC(F)(F)F)ccc2s1', 'NS(=O)(=O)c1ccccc1',
         'CSc1nc2ccccc2s1']),
    '[NH2]S(=O)(=O)c1[cH][cH]c([cH][cH]1)-n1cccn1': (
        ['Cc1ccc(cc1)-c1cc(nn1-c1ccc(cc1)S(N)(=O)=O)C(F)(F)F',
         'COc1ccc(-c2cc(C(F)F)nn2-c2ccc(S(N)(=O)=O)cc2)cc1F',
         'NS(=O)(=O)c1ccc(-n2nc(C(F)(F)F)cc2-c2ccc(F)cc2)cc1'],
        ['NS(=O)(=O)c1ccccc1', 'COc1ccc(-c2c(Cl)ncn2-c2ccc(S(N)(=O)=O)cc2)cc1F',
         'NS(=O)(=O)c1ccc(cc1)-n1ccnc1', 'NS(=O)(=O)c1cc(F)c(cc1)-n1cccn1',
         'Cc1nc(C2CCCCC2)c(-c2ccc(S(N)(=O)=O)c(F)c2)o1']),
    '[NH2]S(=O)(=O)c1cccs1': (
        ['NS(=O)(=O)c1cccs1', 'CCNC1CC(C)S(=O)(=O)c2sc(S(N)(=O)=O)cc21',
         'COCCCN1C=C(N)c2cc(S(N)(=O)=O)sc2S1(=O)=O'],
        ['NS(=O)(=O)c1ccccc1', 'NS(=O)(=O)c1nncs1', 'NS(=O)(=O)c1ccsc1',
         'CCOc1ccc2nc(S(N)(=O)=O)sc2c1']),
    '[NH2]S(=O)(=O)c1cccc(c1)S(=O)(=O)[NH2]': (
        ['NS(=O)(=O)c1cc(Cl)c(Cl)c(S(N)(=O)=O)c1', 'Cc1cc(Cl)c(S(N)(=O)=O)cc1S(N)(=O)=O',
         'NS(=O)(=O)c1ccc(Cl)c(S(N)(=O)=O)c1'],
        ['NS(=O)(=O)c1ccccc1', 'NS(=O)(=O)c1ccc(S(N)(=O)=O)cc1',
         'NS(=O)(=O)c1cc(S(=O)(=O)NC)ccc1']),
    '[NH2]S(=O)(=O)c1cc2c(s1)S(=O)(=O)CCC2': (
        ['CCNC1CC(C)S(=O)(=O)c2sc(S(N)(=O)=O)cc21'],
        ['CCCNC1CC(S(N)(=O)=O)c2sc(OCCC)cc2S1(=O)=O', 'NS(=O)(=O)c1cccs1',
         'NS(=O)(=O)c1ccccc1', 'Cc1cc2c(cc1S(N)(=O)=O)S(=O)(=O)CCC2']),
    '[NH2]S(=O)(=O)c1cc2c(s1)S(=O)(=O)[NX3]~[#6]~[#6]2': (
        ['COCCCN1C=C(N)c2cc(S(N)(=O)=O)sc2S1(=O)=O',
         'CCNC1CN(CCCOC)S(=O)(=O)c2sc(cc12)S(N)(=O)=O'],
        ['CCNC1CC(C)S(=O)(=O)c2sc(S(N)(=O)=O)cc21', 'NS(=O)(=O)c1cccs1',
         'NS(=O)(=O)c1cc2c(cc1Cl)NCNS2(=O)=O']),
    '[NH2]S(=O)(=O)Cc1noc2ccccc12': (
        ['NS(=O)(=O)Cc1noc2ccccc12'],
        ['NS(=O)(=O)c1ccc2noc(-c3ccccc3)c2c1', 'NS(=O)(=O)Cc1nc2ccccc2s1',
         'NS(=O)(=O)c1ccccc1']),
    '[NH2]S(=O)(=O)c1ccccc1': (
        ['NS(=O)(=O)c1ccccc1', 'NS(=O)(=O)c1ccc(Cl)cc1',
         'Cc1cc(Cl)c(S(N)(=O)=O)cc1S(N)(=O)=O'],
        ['NS(=O)(=O)c1cccs1', 'N(C)S(=O)(=O)c1ccccc1',
         'Cc1ccc(NS(=O)(=O)c2ccc(N)cc2)nn1', 'NS(=O)(=O)c1nncs1']),
    'O=S1(=O)N[#6]Nc2ccccc21': (
        ['NS(=O)(=O)c1cc2c(cc1Cl)NCNS2(=O)=O', 'NS(=O)(=O)c1cc2c(cc1Cl)NC(C)NS2(=O)=O',
         'CN1C(CCl)Nc2cc(Cl)c(S(N)(=O)=O)cc2S1(=O)=O'],
        ['NS(=O)(=O)c1cc2c(cc1Cl)N=CNS2(=O)=O', 'NS(=O)(=O)c1ccccc1',
         'NS(=O)(=O)c1ccc(N2CCCCS2(=O)=O)cc1',
         'O=C1c2cc(S(N)(=O)=O)c(Cl)cc2NC(C)N1']),
}

DISCARD_LOG = {
    '[NH2]S(=O)(=O)c1cc2c(s1)S(=O)(=O)[NX3][#6][#6]2': (
        ['COCCCN1C=C(N)c2cc(S(N)(=O)=O)sc2S1(=O)=O'],
        'ring order is right, but an unqualified SMARTS bond means single-or-aromatic, so '
        'the chain cannot match the 3,4-didehydro double bond of the only sourced row on '
        'the core; repaired by writing the two bonds as ~'),
    '[NH2]S(=O)(=O)c1sc2c(c1)[#6][#6][NX3]S2(=O)=O': (
        ['COCCCN1C=C(N)c2cc(S(N)(=O)=O)sc2S1(=O)=O',
         'CCNC1CN(CCCOC)S(=O)(=O)c2sc(cc12)S(N)(=O)=O'],
        'hand-typed ring-order defect: it puts the sulfamoyl carbon and the sulfonyl carbon '
        'on the same side of the thiophene sulfur, but in the stored rows the ring sulfur '
        'sits between them'),
    'c1nnnn1-c1ccccc1': (
        ['c1ccc(-c2nnn[nH]2)cc1'],
        'the warned hand-typing defect, kept as a demonstration: this binds the aryl to the '
        'last-written ring nitrogen, so it matches 1-phenyltetrazole and not the intended '
        '5-phenyltetrazole'),
    '[NH2]S(=O)(=O)c1ccccc1 >> placeholder': (
        [],
        'never a valid SMARTS, yet MolFromSmarts silently truncates at the space and '
        'returns the plain benzenesulfonamide query, so an uncontrolled census line would '
        'have reported 149 hits under the wrong label; this is why every query is '
        'controlled before it is trusted'),
}

TAUTOMER_CENSUS = [
    ('5-acylamino-1,3,4-thiadiazole-2-sulfonamide', 'keto',    '[#6]C(=O)[NX3H1]c1nnc(s1)S(=O)(=O)[NH2]'),
    ('5-acylamino-1,3,4-thiadiazole-2-sulfonamide', 'iminol',  '[#6]C(O)=[NX2]c1nnc(s1)S(=O)(=O)[NH2]'),
    ('5-acylamino-1,3,4-thiadiazole (any)',         'keto',    '[#6]C(=O)[NX3]c1nncs1'),
    ('5-acylamino-1,3,4-thiadiazole (any)',         'iminol',  '[#6]C(O)=[NX2]c1nncs1'),
    ('5-acylimino-1,3,4-thiadiazol-2(3H)-ylidene',  'ylidene', '[#6]C(=O)N=c1sccn1'),
    ('2-acylamino-1,3-benzothiazole',               'keto',    '[#6]C(=O)[NX3]c1nc2ccccc2s1'),
    ('2-acylamino-1,3-benzothiazole',               'iminol',  '[#6]C(O)=[NX2]c1nc2ccccc2s1'),
    ('aryl carboxamide (corpus baseline)',          'keto',    '[c]C(=O)[NX3]'),
    ('aryl carboxamide (corpus baseline)',          'iminol',  '[c]C(O)=[NX2]'),
    ('4-sulfamoylphenyl carboxamide',               'keto',    '[NH2]S(=O)(=O)c1ccc(cc1)C(=O)[NX3]'),
    ('4-sulfamoylphenyl carboxamide',               'iminol',  '[NH2]S(=O)(=O)c1ccc(cc1)C(O)=[NX2]'),
    ('sulfamoylaryl sulfonylurea',                  'keto',    '[NH2]S(=O)(=O)c1ccccc1 >> placeholder'),
    ('any acyclic amide/urea',                      'keto',    '[#6][CX3;!R](=O)[NX3]'),
    ('any acyclic amide/urea',                      'iminol',  '[#6][CX3;!R](O)=[NX2]'),
]

PREFIX = {
    'O':             ('hydroxy',           'hydroxy',       False),
    'OC':            ('methoxy',           'methoxy',       False),
    'OCC':           ('ethoxy',            'ethoxy',        False),
    'C':             ('methyl',            'methyl',        False),
    'CC':            ('ethyl',             'ethyl',         False),
    'N':             ('amino',             'amino',         False),
    'Cl':            ('chloro',            'chloro',        False),
    'FC(F)F':        ('(trifluoromethyl)', 'trifluoromethyl', True),
    'FC(F)':         ('(difluoromethyl)',  'difluoromethyl',  True),
    'NC(=O)C':       ('acetamido',         'acetamido',     False),
    'NC(=O)CCC':     ('butanamido',        'butanamido',    False),
    'c1ccc(C)cc1':   ('(4-methylphenyl)',  'methylphenyl',  True),
    'c1ccc(F)cc1':   ('(4-fluorophenyl)',  'fluorophenyl',  True),
    'c1cc(F)c(OC)cc1': ('(3-fluoro-4-methoxyphenyl)', 'fluoromethoxyphenyl', True),
}
RANK = {k: i for i, k in enumerate(PREFIX)}
MULT_SIMPLE  = {2: 'di',  3: 'tri',  4: 'tetra'}
MULT_COMPLEX = {2: 'bis', 3: 'tris', 4: 'tetrakis'}

NAME_WITNESS = {
    'thiadiazole stem':        r'1,3,4-thiadiazole',
    'thiadiazolesulfonamide':  r'thiadiazole-2-sulfonamide',
    'benzothiazole stem':      r'benzothiazol',
    'benzothiazolesulfonamide': r'benzothiazole-2-sulfonamide',
    'pyrazol-1-yl':            r'pyrazol-1-yl',
    'benzenesulfonamide stem': r'benzenesulfonamide',
    'disulfonamide stem':      r'disulfonamide',
    'thiophenesulfonamide':    r'thiophene-2-sulfonamide',
    'thieno fusion':           r'thieno',
    'thiopyran':               r'thiopyran',
    'thiazine':                r'thiazine',
    'benzoxazol':              r'benzoxazol',
    'sulfamoyl':               r'sulfamoyl',
    'hydroxy':                 r'\d-hydroxy',
    'methoxy':                 r'methoxy',
    'ethoxy':                  r'ethoxy',
    'methyl':                  r'\d-methyl',
    'ethyl':                   r'\d-ethyl',
    'amino':                   r'\d-amino|^amino',
    'chloro':                  r'chloro',
    '(trifluoromethyl)':       r'\(trifluoromethyl\)',
    '(difluoromethyl)':        r'\(difluoromethyl\)',
    'acetamido':               r'acetamido|acetylamino',
    'butanamido':              r'butanamido',
    '(4-methylphenyl)':        r'\(4-methylphenyl\)',
    '(4-fluorophenyl)':        r'\(4-fluorophenyl\)',
    '(3-fluoro-4-methoxyphenyl)': r'\(3-fluoro-4-methoxyphenyl\)',
    'di':                      r'\d,\d-di(methyl|methoxy|chloro|hydroxy)',
    'tri':                     r'\d,\d,\d-tri(methyl|methoxy|chloro|hydroxy)',
    'bis':                     r'\bbis\(',
    'tris':                    r'\btris\(',
}

def log(*a): print(*a, file=sys.stderr)

def loc_key(l):
    return (1 if l.endswith("'") else 0, int(re.sub(r"[^0-9]", '', l) or 0))

def fill(tpl, slots):
    out = tpl
    for k in set(re.findall(r'\{([^}]*)\}', tpl)):
        v = slots.get(k)
        out = out.replace('{%s}' % k, '(%s)' % v if v else '')
    return out

def cut_one(mol, cidx, catom, nbr):
    em = Chem.RWMol(mol)
    em.RemoveBond(catom, nbr)
    d = em.AddAtom(Chem.Atom(0))
    em.AddBond(nbr, d, Chem.BondType.SINGLE)
    m2 = em.GetMol()
    try:
        Chem.SanitizeMol(m2)
    except Exception:
        return None
    idxf = Chem.GetMolFrags(m2, asMols=False)
    molf = Chem.GetMolFrags(m2, asMols=True, sanitizeFrags=False)
    tgt = fm = None
    for k, f in enumerate(idxf):
        if nbr in f:
            tgt, fm = f, molf[k]
    if tgt is None or any(a in cidx for a in tgt):
        return None
    root = next((a.GetIdx() for a in fm.GetAtoms() if a.GetAtomicNum() == 0), None)
    if root is None:
        return None
    try:
        s = Chem.MolToSmiles(fm, rootedAtAtom=root, canonical=True, isomericSmiles=True)
    except Exception:
        return None
    return s[1:] if s.startswith('*') else None

def cut_fragments(mol, match, locmap):
    cidx = set(match)
    found = {}
    for qi, loc in locmap.items():
        if qi >= len(match):
            return None
        ai = match[qi]
        for nb in mol.GetAtomWithIdx(ai).GetNeighbors():
            if nb.GetIdx() in cidx:
                continue
            f = cut_one(mol, cidx, ai, nb.GetIdx())
            if f is None:
                return None
            if loc in found:
                return None
            found[loc] = f
    return found

def parse_formula(f):
    d = collections.Counter()
    for el, n in re.findall(r'([A-Z][a-z]?)(\d*)', f):
        if el:
            d[el] += int(n) if n else 1
    return d

def hill(d):
    out = ''
    for el in ('C', 'H'):
        if d.get(el):
            out += el + (str(d[el]) if d[el] > 1 else '')
    for el in sorted(k for k in d if k not in ('C', 'H') and d[k]):
        out += el + (str(d[el]) if d[el] > 1 else '')
    return out

FRAGCOMP = {}
def fragcomp(val):
    if val not in FRAGCOMP:
        m = Chem.MolFromSmiles('*' + val)
        d = collections.Counter()
        for a in m.GetAtoms():
            if a.GetAtomicNum() == 0:
                continue
            d[a.GetSymbol()] += 1
            d['H'] += a.GetTotalNumHs()
        FRAGCOMP[val] = d
    return FRAGCOMP[val]

if not os.path.exists(LIBJSON):
    subprocess.run(['node', '-e',
        "const {LIBRARY}=require('./data/library.js'); require('fs').writeFileSync("
        + json.dumps(LIBJSON)
        + ", JSON.stringify(LIBRARY.map(r=>[r.name,r.smiles,r.cls||'',r.source?1:0])));"],
        cwd=PROJECT, check=True)

raw = json.load(open(LIBJSON))
LIB = [dict(name=r[0], smiles=r[1], cls=r[2], source=bool(r[3])) for r in raw]

libmols, libnames, libstrip = [], set(), set()
libstripname = {}
for r in LIB:
    m = Chem.MolFromSmiles(r['smiles'])
    libmols.append(m)
    libnames.add(r['name'])
    if m is not None:
        m2 = Chem.Mol(m)
        Chem.RemoveStereochemistry(m2)
        st0 = Chem.MolToSmiles(m2)
        libstrip.add(st0)
        libstripname.setdefault(st0, r['name'])
NAMEBLOB = '\n'.join(sorted(libnames))
inclass = sum(1 for r in LIB if r['cls'] == CLS)
nsourced = sum(1 for r in LIB if r['source'])
CLSCOUNT = collections.Counter(r['cls'] for r in LIB)

log("=" * 78)
log("library rows loaded through the module dump : %d" % len(LIB))
log("externally sourced rows (carry a `source`)  : %d" % nsourced)
log("hand-written rows (no `source`)             : %d" % (len(LIB) - nsourced))
log("rows that fail to parse                     : %d" % sum(1 for m in libmols if m is None))
log("IN-CLASS cls == '%s' : %d   (target %d)" % (CLS, inclass, TARGET_TOTAL))
log("of those %d in-class rows, externally sourced: %d"
    % (inclass, sum(1 for r in LIB if r['cls'] == CLS and r['source'])))
log("adjacent classes that already ship derived sulfonamide families:")
for k in ('Sulfonamide', 'Sulfonylurea', 'Diuretic', 'COX-2 inhibitor',
          'Substituted benzamide', 'Benzamide antipsychotic', 'Ophthalmic'):
    log("    cls '%-24s' : %d rows" % (k, CLSCOUNT.get(k, 0)))
log("=" * 78)

log("")
log("SMARTS VALIDATION (positives must match, negatives must not)")
discarded = []
vok = 0
for smarts, (pos, neg) in VALIDATION.items():
    q = Chem.MolFromSmarts(smarts)
    if q is None:
        discarded.append((smarts, 'does not compile'))
        log("  %-52s DOES NOT COMPILE" % smarts[:52])
        continue
    fp = [p for p in pos if not Chem.MolFromSmiles(p).HasSubstructMatch(q)]
    fn = [n for n in neg if Chem.MolFromSmiles(n).HasSubstructMatch(q)]
    status = 'OK' if not fp and not fn else 'DISCARDED'
    log("  %-52s pos %d/%d  neg %d/%d  %s"
        % (smarts[:52], len(pos) - len(fp), len(pos), len(neg) - len(fn), len(neg), status))
    if fp: log("      missed positives: %s" % fp)
    if fn: log("      matched negatives: %s" % fn)
    if status == 'OK':
        vok += 1
    else:
        discarded.append((smarts, 'positives missed %s / negatives matched %s' % (fp, fn)))
log("  %d of %d core queries validated; %d discarded" % (vok, len(VALIDATION), len(discarded)))
log("")
log("QUERIES WRITTEN, TESTED AND DISCARDED (recorded, never used as a core)")
for smarts, (pos, why) in DISCARD_LOG.items():
    q = Chem.MolFromSmarts(smarts)
    if q is None:
        log("  %-52s DOES NOT COMPILE" % smarts[:52])
    else:
        np_ = sum(1 for x in pos if Chem.MolFromSmiles(x).HasSubstructMatch(q))
        log("  %-52s intended positives matched %d/%d" % (smarts[:52], np_, len(pos)))
    log("      %s" % why)
for s, why in discarded:
    log("  DISCARDED %s : %s" % (s, why))
LIVE = {k: c for k, c in CORES.items()
        if c['query'] not in [s for s, _ in discarded]}
if len(LIVE) != len(CORES):
    log("  cores dropped because their query was discarded: %s"
        % sorted(set(CORES) - set(LIVE)))

log("")
log("TAUTOMER-PAIRED CENSUS (keto form vs iminol form, cls-blind)")
log("  %-46s %-8s %6s %8s %6s" % ('motif', 'form', 'total', 'sourced', 'hand'))
for label, form, smarts in TAUTOMER_CENSUS:
    q = Chem.MolFromSmarts(smarts)
    if q is None:
        log("  %-46s %-8s SMARTS did not compile (reported, not counted)" % (label, form))
        continue
    h = [i for i, m in enumerate(libmols) if m is not None and m.HasSubstructMatch(q)]
    log("  %-46s %-8s %6d %8d %6d"
        % (label, form, len(h), sum(1 for i in h if LIB[i]['source']),
           sum(1 for i in h if not LIB[i]['source'])))

log("")
log("CORE CENSUS (substructure over the WHOLE library, cls-blind, uniquify=False)")
queries = {k: Chem.MolFromSmarts(c['query']) for k, c in LIVE.items()}
anchors = collections.defaultdict(lambda: collections.defaultdict(list))
proofs = collections.defaultdict(dict)
stat = collections.defaultdict(collections.Counter)
corehits = collections.defaultdict(list)
for i, r in enumerate(LIB):
    mol = libmols[i]
    if mol is None:
        continue
    for core, c in LIVE.items():
        ms = mol.GetSubstructMatches(queries[core], uniquify=False)
        if not ms:
            continue
        s = stat[core]
        s['hit'] += 1
        corehits[core].append(i)
        if not r['source']:
            s['handwritten'] += 1
            continue
        s['sourced'] += 1
        reads = []
        bad = None
        for mt in ms:
            frags = cut_fragments(mol, mt, c['locmap'])
            if frags is None:
                bad = 'uncuttable'
                break
            if any(l not in c['sites'] for l in frags):
                bad = 'offsite'
                break
            reads.append(frags)
        if bad:
            s[bad] += 1
            continue
        if not reads:
            s['noread'] += 1
            continue
        allpairs = [set(fr.items()) for fr in reads]
        unanimous = set.intersection(*allpairs)
        nonunan = set.union(*allpairs) - unanimous
        if nonunan:
            s['unanimity_dropped_pairs'] += len(nonunan)
            for l, v in sorted(nonunan):
                log("      UNANIMITY DROP %-26s %-32s site %-3s value %s"
                    % (core, r['name'][:32], l, v))
        frags = dict(sorted(unanimous))
        if c['template'] is None:
            s['censused_only'] += 1
            for l, v in frags.items():
                anchors[core][(l, v)].append(r['name'])
            continue
        filled = fill(c['template'], frags)
        fm = Chem.MolFromSmiles(filled)
        if fm is None:
            s['rebuild_unparseable'] += 1
            continue
        if Chem.MolToSmiles(fm) != Chem.MolToSmiles(mol):
            s['identity_fail'] += 1
            log("      IDENTITY FAIL %-26s %-34s rebuilt %s" % (core, r['name'][:34], filled))
            continue
        s['proven'] += 1
        for l, v in frags.items():
            anchors[core][(l, v)].append(r['name'])
            proofs[core].setdefault((l, v), (r['name'], r['smiles'], filled))

log("  %-32s %5s %5s %5s %7s %9s %6s %7s %8s %7s"
    % ('core', 'hits', 'srcd', 'hand', 'proven', 'identfail', 'uncut', 'offsite', 'censonly', 'unandrp'))
for core in LIVE:
    s = stat[core]
    log("  %-32s %5d %5d %5d %7d %9d %6d %7d %8d %7d"
        % (core, s['hit'], s['sourced'], s['handwritten'], s['proven'], s['identity_fail'],
           s['uncuttable'], s['offsite'], s['censused_only'], s['unanimity_dropped_pairs']))
for core in LIVE:
    srcd = [i for i in corehits[core] if LIB[i]['source']]
    log("    %s : sourced rows on this core = %s"
        % (core, ', '.join(LIB[i]['name'] for i in srcd) or 'NONE'))

log("")
log("PROVEN (site, value) PAIRS AND THE HARD TWO-ANCHOR GATE")
slots = collections.defaultdict(lambda: collections.defaultdict(list))
refusals = []
admitted = []
for core, c in LIVE.items():
    log("")
    log("  --- %s (%s) ---" % (core, c['label']))
    if not anchors[core]:
        log("    no transcribable sourced anchor at any site")
    for (site, val), names in sorted(anchors[core].items(),
                                     key=lambda kv: (loc_key(kv[0][0]), RANK.get(kv[0][1], 99), kv[0][1])):
        n = len(set(names))
        pretty = PREFIX[val][0] if val in PREFIX else val
        if not c['generate']:
            refusals.append((core, site, pretty, n, 'core refused for generation'))
            log("    %-3s %-34s anchors=%-3d REFUSED core-not-generating (%s)"
                % (site, pretty[:34], n, ', '.join(sorted(set(names)))))
            continue
        if n < 2:
            refusals.append((core, site, pretty, n, 'two-anchor gate'))
            log("    %-3s %-34s anchors=%-3d REFUSED two-anchor-gate   (%s)"
                % (site, pretty[:34], n, ', '.join(sorted(set(names)))))
            continue
        if val not in PREFIX:
            refusals.append((core, site, pretty, n,
                             'outside the generation vocabulary (no attested single-attachment prefix)'))
            log("    %-3s %-34s anchors=%-3d REFUSED out-of-vocabulary" % (site, pretty[:34], n))
            continue
        slots[core][site].append(val)
        pn, psmi, pfill = proofs[core][(site, val)]
        ident = Chem.MolToSmiles(Chem.MolFromSmiles(pfill)) == Chem.MolToSmiles(Chem.MolFromSmiles(psmi))
        admitted.append((core, site, pretty, n, sorted(set(names))))
        log("    %-3s %-34s anchors=%-3d PASS   proof anchor: %s" % (site, pretty, n, pn))
        log("        filled template -> %s" % pfill)
        log("        stereo-inclusive canonical identity with stored row: %s" % ident)
        if not ident:
            log("        ABORT: admitted cell does not reproduce its anchor stereo-inclusively")
            sys.exit(2)
        log("        anchors: %s" % ', '.join(sorted(set(names))))

for core, site, pretty, n, names in admitted:
    if n < 2:
        log("ABORT: admitted cell %s/%s/%s has %d anchors" % (core, site, pretty, n))
        sys.exit(2)

log("")
log("REFUSED SITES (no admissible value after the two-anchor gate)")
for core, c in LIVE.items():
    if not c['generate']:
        continue
    for site in c['sites']:
        if not slots[core].get(site):
            n = len({v for (s, v) in anchors[core] if s == site})
            log("    %-32s %-3s  distinct sourced values seen at site = %d, admitted = 0"
                % (core, site, n))
            refusals.append((core, site, '*', n, 'no admissible value at site'))

log("")
log("REFUSED CORES")
for core, c in LIVE.items():
    if not c['generate']:
        n = len({i for i in corehits[core] if LIB[i]['source']})
        why = c['refusal'] or ('%d sourced row%s carry this core corpus-wide; no site reaches '
                               'the two-anchor gate' % (n, '' if n == 1 else 's'))
        log("    %-32s sourced=%d" % (core, n))
        log("        %s" % why)

log("")
log("NAME-CONVENTION WITNESSES MEASURED AGAINST THE LIBRARY'S OWN NAMES")
witness = {}
for k, pat in NAME_WITNESS.items():
    hits = [n for n in sorted(libnames) if re.search(pat, n, re.I)]
    witness[k] = len(hits)
    log("    %-30s witnesses=%-5d %s"
        % (k, len(hits), (hits[0][:48] if hits else 'NONE -> refuse at name gate')))
log("    multiplier convention: di( = %d, bis( = %d, tri( = %d, tris( = %d"
    % (len(re.findall(r'\bdi\(', NAMEBLOB)), len(re.findall(r'\bbis\(', NAMEBLOB)),
       len(re.findall(r'\btri\(', NAMEBLOB)), len(re.findall(r'\btris\(', NAMEBLOB))))
log("    SMILES fluorine convention measured: 'FC' = %d rows, 'CF' = %d rows, "
    "'[Cf]' (californium) = %d rows, rows that fail to parse = %d"
    % (sum(1 for r in LIB if 'FC' in r['smiles']),
       sum(1 for r in LIB if 'CF' in r['smiles']),
       sum(1 for r in LIB if '[Cf]' in r['smiles']),
       sum(1 for m in libmols if m is None)))
log("    italicised tert- in stored names: %d"
    % len([n for n in libnames if re.search(r'tert-', n)]))
log("    enclosing-mark nesting in stored names: '[' inside '(' = %d, '{' present = %d"
    % (len([n for n in libnames if re.search(r'\([^()]*\[', n)]),
       len([n for n in libnames if '{' in n])))

def build_name(core, p):
    groups = collections.defaultdict(list)
    for l, v in p.items():
        groups[v].append(l)
    items = []
    for v, locs in groups.items():
        pretty, akey, complexp = PREFIX[v]
        if witness.get(pretty, witness.get(akey, 0)) == 0:
            return None, 'no stored name attests the prefix %s' % pretty
        locs = sorted(locs, key=loc_key)
        n = len(locs)
        if n == 1:
            items.append((akey, ','.join(locs) + '-' + pretty))
            continue
        mult = (MULT_COMPLEX if complexp else MULT_SIMPLE).get(n)
        if mult is None or witness.get(mult, 0) == 0:
            return None, 'no stored name attests the multiplier %s' % mult
        items.append((akey, ','.join(locs) + '-' + mult + pretty))
    items.sort()
    stem = LIVE[core]['stem']
    if witness.get(core.replace('sulfonamide', 'sulfonamide'), 0) == 0:
        pass
    return '-'.join(s for _, s in items) + '-' + stem, None

MINSUB, MAXSUB, MULTISET_CAP = 1, 4, 6

def candidates(core):
    c = LIVE[core]
    pool = [(s, v) for s in c['sites'] for v in slots[core].get(s, [])]
    pats = []
    for n in range(MINSUB, MAXSUB + 1):
        for combo in itertools.combinations(pool, n):
            if len({s for s, _ in combo}) != n:
                continue
            pats.append(dict(combo))
    pats.sort(key=lambda p: (len(p), sorted(RANK.get(v, 99) for v in p.values()),
                             sorted(loc_key(l) for l in p), sorted(p.items())))
    return pats

skips = collections.Counter()
namegate_notes, formula_notes, collision_notes = [], [], []
emitted = []
gen_names, gen_strip = set(), set()
mscount = collections.Counter()

def try_emit(core, p):
    c = LIVE[core]
    name, why = build_name(core, p)
    if name is None:
        skips['name-convention'] += 1
        namegate_notes.append((str(sorted(p.items())), why))
        return False
    smi = fill(c['template'], p)
    m = Chem.MolFromSmiles(smi)
    if m is None:
        skips['parse'] += 1
        return False
    d = parse_formula(c['parent'])
    d['H'] -= len(p)
    for v in p.values():
        d.update(fragcomp(v))
    exp, got = hill(d), rdm.CalcMolFormula(m)
    if exp != got:
        skips['formula'] += 1
        formula_notes.append((name, exp, got))
        return False
    m2 = Chem.Mol(m)
    Chem.RemoveStereochemistry(m2)
    st = Chem.MolToSmiles(m2)
    if st in libstrip:
        skips['dup-struct-lib'] += 1
        collision_notes.append((name, libstripname.get(st, '?'), st))
        return False
    if name in libnames:
        skips['dup-name-lib'] += 1
        return False
    if st in gen_strip:
        skips['dup-struct-self'] += 1
        return False
    if name in gen_names:
        skips['dup-name-self'] += 1
        return False
    gen_names.add(name)
    gen_strip.add(st)
    emitted.append(dict(name=name, formula=got, smiles=Chem.MolToSmiles(m)))
    return True

log("")
log("SLOT TABLES (attested-only, per core, per site)")
pools = {}
for core, c in LIVE.items():
    if not c['generate'] or not slots[core]:
        log("  %-32s no attested slot table" % core)
        continue
    log("  %s:" % core)
    for site in c['sites']:
        if slots[core].get(site):
            log("    %-3s %s" % (site, ', '.join(PREFIX[v][0] for v in
                                 sorted(slots[core][site], key=lambda v: RANK.get(v, 99)))))
    pools[core] = candidates(core)
    log("    attested substitution patterns enumerated: %d" % len(pools[core]))

TARGET_NEW = TARGET_TOTAL - inclass
enumerated = 0
for core in pools:
    for p in pools[core]:
        enumerated += 1
        ms = (core,) + tuple(sorted(p.values()))
        if mscount[ms] >= MULTISET_CAP:
            skips['multiset-cap'] += 1
            continue
        if try_emit(core, p):
            mscount[ms] += 1
capacity = len(emitted)
surplus = max(0, capacity - TARGET_NEW)
emitted = emitted[:TARGET_NEW]

log("")
log("GATE ACCOUNTING (in order, in -> out)")
order = [('enumerate', enumerated, enumerated),
         ('naming-convention', enumerated, enumerated - skips['name-convention']),
         ('SMILES parse', enumerated - skips['name-convention'],
          enumerated - skips['name-convention'] - skips['parse'])]
running = enumerated
for label, key in [('naming-convention', 'name-convention'), ('SMILES parse', 'parse'),
                   ('formula differential vs CalcMolFormula', 'formula'),
                   ('stereo-stripped structure collision vs corpus', 'dup-struct-lib'),
                   ('exact-name collision vs corpus', 'dup-name-lib'),
                   ('intra-batch structure duplicate', 'dup-struct-self'),
                   ('intra-batch name duplicate', 'dup-name-self'),
                   ('multiset cap', 'multiset-cap')]:
    out = running - skips[key]
    log("    %-46s in %5d  rejected %5d  out %5d" % (label, running, skips[key], out))
    running = out
log("    %-46s %d" % ('passed every gate', capacity))
log("    %-46s %d" % ('emitted (target slice)', len(emitted)))
log("    %-46s %d" % ('surplus held back', surplus))
log("    %-46s %d  (%d pre-existing + %d derived)"
    % ('class total', inclass + len(emitted), inclass, len(emitted)))
if formula_notes:
    log("    formula-gate skips: %s" % formula_notes[:5])
if namegate_notes:
    log("    name-gate refusals (%d), first 5: %s" % (len(namegate_notes), namegate_notes[:5]))
if collision_notes:
    log("")
    log("STRUCTURE COLLISIONS AGAINST THE STORED LIBRARY (%d)" % len(collision_notes))
    for cn, sn, cs in collision_notes:
        log("    %-46s collides with stored %-30s %s" % (cn, sn, cs))

log("")
log("REFUSED SITE/VALUE PAIRS WITH ANCHOR COUNTS (%d)" % len(refusals))
for core, site, val, n, why in sorted(refusals,
        key=lambda t: (t[0], loc_key(t[1]) if t[1] != '*' else (9, 9), -t[3])):
    log("    %-32s %-3s %-40s anchors=%-3d %s" % (core, site, str(val)[:40], n, why))

def jsq(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"

for r in emitted:
    print("  { name: %s, cls: '%s', formula: %s, smiles: %s },"
          % (jsq(r['name']), CLS, jsq(r['formula']), jsq(r['smiles'])))

log("")
log("MEASURED CAPACITY of the attested slot table : %d structures passed every gate" % capacity)
log("ROWS NEEDED to reach the %d-row target       : %d" % (TARGET_TOTAL, TARGET_NEW))
if capacity < TARGET_NEW:
    log("MEASURED CEILING for cls '%s' : %d rows. The %d-row target is NOT reached "
        "and widening scope or relaxing a gate is not an available answer."
        % (CLS, inclass + capacity, TARGET_TOTAL))
else:
    log("MEASURED CEILING for cls '%s' : the %d-row target is REACHED (surplus %d)"
        % (CLS, TARGET_TOTAL, surplus))
log("EMITTED this batch: %d rows -> class total %d" % (len(emitted), inclass + len(emitted)))
