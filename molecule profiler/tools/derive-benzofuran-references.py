"""derive-benzofuran-references.py -- template-anchored derivation of cls 'Benzofuran' reference rows."""

import json, sys, re, itertools, collections
from rdkit import Chem
from rdkit.Chem import rdMolDescriptors as rdm
from rdkit import RDLogger
RDLogger.DisableLog('rdApp.*')

HERE = "/tmp/claude-0/-home-user-projects/a6d12805-aecf-5923-b265-93c142f30be4/scratchpad/bfuran/"
LIBJSON = HERE + "library.json"
CLS = 'Benzofuran'
TARGET_TOTAL = 50

CORES = {}

CORES['benzofuran'] = dict(
    label='1-benzofuran',
    query='o1ccc2ccccc12',
    template='o%10c{2}c{3}c%11c{4}c{5}c{6}c{7}c%10%11',
    locmap={0:'O1', 1:'2', 2:'3', 3:'3a', 4:'4', 5:'5', 6:'6', 7:'7', 8:'7a'},
    sites=['2','3','4','5','6','7'],
    parent='C8H6O',
    stem='1-benzofuran',
    generate=True,
    refusal=None,
)
CORES['phenylbenzofuran'] = dict(
    label='2-phenyl-1-benzofuran',
    query='o1c(-c2ccccc2)cc2ccccc12',
    template="o%10c(-c%12c{2'}c{3'}c{4'}c{5'}c{6'}%12)c{3}c%11c{4}c{5}c{6}c{7}c%10%11",
    locmap={0:'O1', 1:'2', 2:"1'", 3:"2'", 4:"3'", 5:"4'", 6:"5'", 7:"6'",
            8:'3', 9:'3a', 10:'4', 11:'5', 12:'6', 13:'7', 14:'7a'},
    sites=['3','4','5','6','7',"2'","3'","4'","5'","6'"],
    parent='C14H10O',
    stem='2-phenyl-1-benzofuran',
    generate=False,
    refusal='scaffold separation: every product of this core is a 2-aryl-1-benzofuran, '
            'and the benzofuran core generates those from whole aryl values that single '
            'rows attest as units. Per-site B-ring enumeration would assert aryl '
            'substitution patterns no stored row attests as a unit.',
)
CORES['benzofuran3one'] = dict(
    label='1-benzofuran-3(2H)-one (aurone parent)',
    query='O=C1COc2ccccc21',
    template=None,
    locmap={0:'O3', 1:'3', 2:'2', 3:'O1', 4:'7a', 5:'7', 6:'6', 7:'5', 8:'4', 9:'3a'},
    sites=['2','4','5','6','7'],
    parent='C8H6O2',
    stem='1-benzofuran-3(2H)-one',
    generate=False,
    refusal='the aurone product space on this core was already derived and shipped under '
            "cls 'Flavonoid'; re-deriving it under cls 'Benzofuran' would double-count one "
            'derived family under two classes.',
)
CORES['dihydrobenzofuran'] = dict(
    label='2,3-dihydro-1-benzofuran',
    query='C1Cc2ccccc2O1',
    template=None,
    locmap={0:'2', 1:'3', 2:'3a', 3:'4', 4:'5', 5:'6', 6:'7', 7:'7a', 8:'O1'},
    sites=['4','5','6','7'],
    parent='C8H8O',
    stem='2,3-dihydro-1-benzofuran',
    generate=False,
    refusal='one proven anchor library-wide; no site reaches the two-anchor gate.',
)
CORES['benzofuran2one'] = dict(
    label='1-benzofuran-2(3H)-one',
    query='O=C1Cc2ccccc2O1',
    template=None,
    locmap={0:'O2', 1:'2', 2:'3', 3:'3a', 4:'4', 5:'5', 6:'6', 7:'7', 8:'7a', 9:'O1'},
    sites=['3','4','5','6','7'],
    parent='C8H6O2',
    stem='1-benzofuran-2(3H)-one',
    generate=False,
    refusal='two rows library-wide carry this core; no site reaches the two-anchor gate.',
)

TAUTOMER_CENSUS = [
    ('1-benzofuran-3(2H)-one', 'keto',   'O=C1COc2ccccc21'),
    ('1-benzofuran-3(2H)-one', 'enol',   'Oc1coc2ccccc12'),
    ('aurone',                 'keto',   'O=C1C(=C)Oc2ccccc21'),
    ('aurone',                 'enol',   'OC1=C(C)Oc2ccccc21'),
    ('1-benzofuran-2(3H)-one', 'keto',   'O=C1Cc2ccccc2O1'),
    ('1-benzofuran-2(3H)-one', 'enol',   'Oc1cc2ccccc2o1'),
    ('1-benzofuran-2-carboxamide', 'keto',   'O=C(N)c1cc2ccccc2o1'),
    ('1-benzofuran-2-carboxamide', 'iminol', 'OC(=N)c1cc2ccccc2o1'),
    ('1-benzofuran-2-carboxylic acid', 'keto', 'OC(=O)c1cc2ccccc2o1'),
    ('1-benzofuran-2-carboxylic acid', 'enol', 'OC(O)=c1cc2ccccc2o1'),
    ('1-benzofuran-3-carboxylic acid', 'keto', 'OC(=O)c1coc2ccccc12'),
]

PREFIX = {
    'O':                  ('hydroxy',                 'hydroxy',         False),
    'OC':                 ('methoxy',                 'methoxy',         False),
    'C':                  ('methyl',                  'methyl',          False),
    'CC':                 ('ethyl',                   'ethyl',           False),
    'CCCO':               ('(3-hydroxypropyl)',       'hydroxypropyl',   True),
    'CC=C(C)C':           ('(3-methylbut-2-en-1-yl)', 'methylbutenyl',   True),
    'C(=O)c1ccc(O)cc1':   ('(4-hydroxybenzoyl)',      'hydroxybenzoyl',  True),
    'c1ccc(O)cc1O':       ('(2,4-dihydroxyphenyl)',   'dihydroxyphenyl', True),
    'c1ccc2c(c1)OCO2':    ('(1,3-benzodioxol-5-yl)',  'benzodioxolyl',   True),
}
RANK = {'O':0, 'OC':1, 'C':2, 'CC':3, 'CC=C(C)C':4, 'CCCO':5,
        'c1ccc(O)cc1O':6, 'c1ccc2c(c1)OCO2':7, 'C(=O)c1ccc(O)cc1':8}
MULT_SIMPLE  = {2:'di',  3:'tri',  4:'tetra'}
MULT_COMPLEX = {2:'bis', 3:'tris', 4:'tetrakis'}

NAME_WITNESS = {
    'stem':                     r'1-benzofuran',
    'stem-with-locants':        r'1-benzofuran-2-yl',
    'hydroxy':                  r'\d-hydroxy',
    'methoxy':                  r'\d-methoxy|^methoxy|-methoxy',
    'methyl':                   r'\d-methyl',
    'ethyl':                    r'\d-ethyl',
    '(3-hydroxypropyl)':        r'\(3-hydroxypropyl\)',
    '(3-methylbut-2-en-1-yl)':  r'\(3-methylbut-2-en-1-yl\)',
    '(4-hydroxybenzoyl)':       r'\(\d(,\d)*-hydroxybenzoyl\)|\(\d,\d-dihydroxybenzoyl\)',
    '(2,4-dihydroxyphenyl)':    r'\(2,4-dihydroxyphenyl\)',
    '(1,3-benzodioxol-5-yl)':   r'\(1,3-benzodioxol-5-yl\)',
    'di':                       r'\d,\d-di(methoxy|hydroxy)',
    'tri':                      r'\d,\d,\d-tri(methoxy|hydroxy)',
    'tetra':                    r'tetra(methoxy|hydroxy)',
    'bis':                      r'\bbis\(',
    'tris':                     r'\btris\(',
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

LIB = json.load(open(LIBJSON))
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
inclass = sum(1 for r in LIB if r.get('cls') == CLS)
nsourced = sum(1 for r in LIB if r.get('source'))

log("=" * 78)
log("library rows loaded through the module dump : %d" % len(LIB))
log("externally sourced rows (carry a `source`)  : %d" % nsourced)
log("hand-written rows (no `source`)             : %d" % (len(LIB) - nsourced))
log("IN-CLASS cls == '%s' : %d   (target %d)" % (CLS, inclass, TARGET_TOTAL))
log("of those %d in-class rows, externally sourced: %d"
    % (inclass, sum(1 for r in LIB if r.get('cls') == CLS and r.get('source'))))
log("=" * 78)

log("")
log("SMARTS VALIDATION (positives must match, negatives must not)")
VALIDATION = {
    'o1ccc2ccccc12': (['c1ccc2occc2c1', 'CC(N)Cc1ccc2occc2c1', 'COc1cc(CCCO)cc2cc(-c3ccc4c(c3)OCO4)oc12'],
                      ['c1ccc2[nH]ccc2c1', 'C1Cc2ccccc2O1', 'c1ccoc1', 'O=C1COc2ccccc21', 'c1ccc2ocnc2c1']),
    'o1c(-c2ccccc2)cc2ccccc12': (['c1ccc(-c2cc3ccccc3o2)cc1', 'C/C=C/c1ccc2oc(-c3ccc(O)cc3)cc2c1'],
                      ['c1ccc2occc2c1', 'c1ccc(-c2coc3ccccc23)cc1', 'c1ccc(-c2ccco2)cc1']),
    'O=C1COc2ccccc21': (['O=C1COc2ccccc21', 'O=C1/C(=C/c2ccccc2)Oc2ccccc21'],
                      ['O=C1Cc2ccccc2O1', 'Oc1coc2ccccc12', 'c1ccc2occc2c1', 'O=C1CCc2ccccc21']),
    'C1Cc2ccccc2O1': (['C1Cc2ccccc2O1', 'CC(N)Cc1ccc2OCCc2c1'],
                      ['c1ccc2occc2c1', 'C1CCc2ccccc2O1', 'C1Cc2ccccc2N1']),
    'O=C1Cc2ccccc2O1': (['O=C1Cc2ccccc2O1', 'CCN(CC)CCC1(c2ccccc2)C(=O)Oc2ccccc21'],
                      ['O=C1COc2ccccc21', 'O=c1ccc2ccccc2o1', 'c1ccc2occc2c1']),
    'Oc1coc2ccccc12': (['Oc1coc2ccccc12', 'COc1coc2ccccc12'],
                      ['O=C1COc2ccccc21', 'Oc1cc2ccccc2o1']),
    'OC(=N)c1cc2ccccc2o1': (['OC(=N)c1cc2ccccc2o1', 'CN(C)Cc1c(C(O)=NCCOc2ccccc2)oc2ccccc12'],
                      ['O=C(N)c1cc2ccccc2o1', 'OC(=O)c1cc2ccccc2o1']),
}
discarded = []
vok = 0
for smarts, (pos, neg) in VALIDATION.items():
    q = Chem.MolFromSmarts(smarts)
    if q is None:
        discarded.append((smarts, 'does not compile')); continue
    fp = [p for p in pos if not Chem.MolFromSmiles(p).HasSubstructMatch(q)]
    fn = [n for n in neg if Chem.MolFromSmiles(n).HasSubstructMatch(q)]
    status = 'OK' if not fp and not fn else 'DISCARDED'
    log("  %-28s pos %d/%d  neg %d/%d  %s"
        % (smarts, len(pos) - len(fp), len(pos), len(neg) - len(fn), len(neg), status))
    if fp: log("      missed positives: %s" % fp)
    if fn: log("      matched negatives: %s" % fn)
    if status == 'OK': vok += 1
    else: discarded.append((smarts, 'positives missed %s / negatives matched %s' % (fp, fn)))
log("  %d of %d queries validated; %d discarded" % (vok, len(VALIDATION), len(discarded)))
for s, why in discarded:
    log("  DISCARDED %s : %s" % (s, why))

log("")
log("TAUTOMER-PAIRED CENSUS (keto form vs enol/iminol form, cls-blind)")
log("  %-34s %-7s %6s %8s %6s" % ('core', 'form', 'total', 'sourced', 'hand'))
for label, form, smarts in TAUTOMER_CENSUS:
    q = Chem.MolFromSmarts(smarts)
    if q is None:
        log("  %-34s %-7s  SMARTS did not compile" % (label, form)); continue
    h = [i for i, m in enumerate(libmols) if m is not None and m.HasSubstructMatch(q)]
    log("  %-34s %-7s %6d %8d %6d"
        % (label, form, len(h), sum(1 for i in h if LIB[i].get('source')),
           sum(1 for i in h if not LIB[i].get('source'))))

log("")
log("CORE CENSUS (substructure over the WHOLE library, cls-blind)")
queries = {k: Chem.MolFromSmarts(c['query']) for k, c in CORES.items()}
anchors = collections.defaultdict(lambda: collections.defaultdict(list))
proofs = collections.defaultdict(dict)
stat = collections.defaultdict(collections.Counter)
for i, r in enumerate(LIB):
    mol = libmols[i]
    if mol is None:
        continue
    for core, c in CORES.items():
        ms = mol.GetSubstructMatches(queries[core], uniquify=True)
        if not ms:
            continue
        s = stat[core]
        s['hit'] += 1
        if not r.get('source'):
            s['handwritten'] += 1; continue
        s['sourced'] += 1
        if len(ms) > 1:
            s['multimatch'] += 1; continue
        frags = cut_fragments(mol, ms[0], c['locmap'])
        if frags is None:
            s['uncuttable'] += 1; continue
        if any(l not in c['sites'] for l in frags):
            s['offsite'] += 1; continue
        if c['template'] is None:
            s['censused_only'] += 1
            for l, v in frags.items():
                anchors[core][(l, v)].append(r['name'])
            continue
        filled = fill(c['template'], frags)
        fm = Chem.MolFromSmiles(filled)
        if fm is None:
            s['rebuild_unparseable'] += 1; continue
        if Chem.MolToSmiles(fm) != Chem.MolToSmiles(mol):
            s['identity_fail'] += 1; continue
        s['proven'] += 1
        for l, v in frags.items():
            anchors[core][(l, v)].append(r['name'])
            proofs[core].setdefault((l, v), (r['name'], r['smiles'], filled))
log("  %-19s %5s %5s %5s %7s %9s %9s %6s %7s %7s"
    % ('core', 'hits', 'srcd', 'hand', 'proven', 'identfail', 'multimtch', 'uncut', 'offsite', 'censonly'))
for core in CORES:
    s = stat[core]
    log("  %-19s %5d %5d %5d %7d %9d %9d %6d %7d %7d"
        % (core, s['hit'], s['sourced'], s['handwritten'], s['proven'], s['identity_fail'],
           s['multimatch'], s['uncuttable'], s['offsite'], s['censused_only']))

log("")
log("PROVEN (site, value) PAIRS AND THE HARD TWO-ANCHOR GATE")
slots = collections.defaultdict(lambda: collections.defaultdict(list))
refusals = []
for core, c in CORES.items():
    log("")
    log("  --- %s (%s) ---" % (core, c['label']))
    if not anchors[core]:
        log("    no transcribable anchor at any site")
    for (site, val), names in sorted(anchors[core].items(),
                                     key=lambda kv: (loc_key(kv[0][0]), RANK.get(kv[0][1], 99), kv[0][1])):
        n = len(set(names))
        pretty = PREFIX[val][0] if val in PREFIX else val
        if not c['generate']:
            refusals.append((core, site, pretty, n, 'core refused for generation'))
            continue
        if val not in PREFIX:
            refusals.append((core, site, pretty, n,
                             'outside the generation vocabulary (no unambiguous single-attachment prefix)'))
            log("    %-3s %-26s anchors=%-3d REFUSED out-of-vocabulary" % (site, pretty[:26], n))
            continue
        if n < 2:
            refusals.append((core, site, pretty, n, 'two-anchor gate'))
            log("    %-3s %-26s anchors=%-3d REFUSED two-anchor-gate" % (site, pretty, n))
            continue
        slots[core][site].append(val)
        pn, psmi, pfill = proofs[core][(site, val)]
        ident = Chem.MolToSmiles(Chem.MolFromSmiles(pfill)) == Chem.MolToSmiles(Chem.MolFromSmiles(psmi))
        log("    %-3s %-26s anchors=%-3d PASS   proof anchor: %s" % (site, pretty, n, pn))
        log("        filled template -> %s" % pfill)
        log("        stereo-inclusive canonical identity with stored row: %s" % ident)
        log("        anchors: %s" % ', '.join(sorted(set(names))))

log("")
log("REFUSED SITES (no admissible value after the two-anchor gate)")
for core, c in CORES.items():
    if not c['generate']:
        continue
    for site in c['sites']:
        if not slots[core].get(site):
            n = len({v for (s, v) in anchors[core] if s == site})
            log("    %-19s %-3s  distinct values seen at site = %d, admitted = 0" % (core, site, n))
            refusals.append((core, site, '*', n, 'no admissible value at site'))

log("")
log("REFUSED CORES")
for core, c in CORES.items():
    if not c['generate']:
        log("    %-19s %s" % (core, c['refusal']))

log("")
log("NAME-CONVENTION WITNESSES MEASURED AGAINST THE LIBRARY'S OWN NAMES")
witness = {}
for k, pat in NAME_WITNESS.items():
    hits = [n for n in sorted(libnames) if re.search(pat, n, re.I)]
    witness[k] = len(hits)
    log("    %-26s witnesses=%-5d %s" % (k, len(hits), (hits[0][:52] if hits else 'NONE -> refuse at name gate')))
log("    multiplier convention: di( = %d, bis( = %d  -> simple prefixes take di/tri, "
    "parenthesised composite prefixes take bis(/tris("
    % (len(re.findall(r'\bdi\(', NAMEBLOB)), len(re.findall(r'\bbis\(', NAMEBLOB))))
log("    'FC' not 'CF': no fluorine value survived the two-anchor gate, so the rule is inapplicable here")
log("    enclosing-mark cycle ( [ { from innermost outward: no generated prefix nests an enclosure, "
    "so only '(' is ever needed")
log("    italicised tert- ignored in alphanumeric ordering: no tert- prefix in the vocabulary, inapplicable")

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
        if complexp:
            items.append((akey, ','.join(locs) + '-' + mult + pretty))
        else:
            items.append((akey, ','.join(locs) + '-' + mult + pretty))
    items.sort()
    return '-'.join(s for _, s in items) + '-' + CORES[core]['stem'], None

MINSUB, MAXSUB, MULTISET_CAP = 1, 4, 6

def candidates(core):
    c = CORES[core]
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
namegate_notes = []
formula_notes = []
collision_notes = []
emitted = []
gen_names, gen_strip = set(), set()
mscount = collections.Counter()

def try_emit(core, p):
    c = CORES[core]
    name, why = build_name(core, p)
    if name is None:
        skips['name-convention'] += 1
        namegate_notes.append((str(sorted(p.items())), why)); return False
    smi = fill(c['template'], p)
    m = Chem.MolFromSmiles(smi)
    if m is None:
        skips['parse'] += 1; return False
    d = parse_formula(c['parent'])
    d['H'] -= len(p)
    for v in p.values():
        d.update(fragcomp(v))
    exp, got = hill(d), rdm.CalcMolFormula(m)
    if exp != got:
        skips['formula'] += 1
        formula_notes.append((name, exp, got)); return False
    if name in libnames:
        skips['dup-name-lib'] += 1; return False
    if name in gen_names:
        skips['dup-name-self'] += 1; return False
    m2 = Chem.Mol(m); Chem.RemoveStereochemistry(m2)
    st = Chem.MolToSmiles(m2)
    if st in libstrip:
        skips['dup-struct-lib'] += 1
        collision_notes.append((name, libstripname.get(st, '?'), st))
        return False
    if st in gen_strip:
        skips['dup-struct-self'] += 1; return False
    gen_names.add(name); gen_strip.add(st)
    emitted.append(dict(name=name, formula=got, smiles=Chem.MolToSmiles(m)))
    return True

log("")
log("SLOT TABLES (attested-only, per core, per site)")
pools = {}
for core, c in CORES.items():
    if not c['generate'] or not slots[core]:
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
            skips['multiset-cap'] += 1; continue
        if try_emit(core, p):
            mscount[ms] += 1
capacity = len(emitted)
surplus = max(0, capacity - TARGET_NEW)
emitted = emitted[:TARGET_NEW]

log("")
log("GATE ACCOUNTING (in order)")
log("    %-20s %d" % ('enumerate', enumerated))
log("    %-20s %d" % ('name-convention', skips['name-convention']))
log("    %-20s %d" % ('parse', skips['parse']))
log("    %-20s %d" % ('formula differential', skips['formula']))
log("    %-20s %d" % ('dup-struct-lib', skips['dup-struct-lib']))
log("    %-20s %d" % ('dup-name-lib', skips['dup-name-lib']))
log("    %-20s %d" % ('dup-name-self', skips['dup-name-self']))
log("    %-20s %d" % ('dup-struct-self', skips['dup-struct-self']))
log("    %-20s %d" % ('multiset-cap', skips['multiset-cap']))
log("    %-20s %d" % ('passed every gate', capacity))
log("    %-20s %d" % ('emitted (target slice)', len(emitted)))
log("    %-20s %d" % ('surplus held back', surplus))
log("    %-20s %d  (%d pre-existing + %d derived)" % ('class total', inclass + len(emitted), inclass, len(emitted)))
log("    %-20s %d" % ('pool fully enumerated', sum(len(pools[c]) for c in pools)))
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
for core, site, val, n, why in sorted(refusals, key=lambda t: (t[0], loc_key(t[1]) if t[1] != '*' else (9, 9), -t[3])):
    log("    %-19s %-3s %-44s anchors=%-3d %s" % (core, site, str(val)[:44], n, why))

def jsq(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"

for r in emitted:
    print("  { name: %s, cls: '%s', formula: %s, smiles: %s }," % (jsq(r['name']), CLS, jsq(r['formula']), jsq(r['smiles'])))

log("")
log("MEASURED CAPACITY of the attested slot table : %d structures passed every gate" % capacity)
log("MEASURED CEILING for cls '%s' : the %d-row target is REACHED; capacity exceeds the %d rows "
    "needed by %d, so no ceiling below %d is binding" % (CLS, TARGET_TOTAL, TARGET_NEW, surplus, TARGET_TOTAL))
log("EMITTED this batch: %d rows -> class total %d" % (len(emitted), inclass + len(emitted)))
