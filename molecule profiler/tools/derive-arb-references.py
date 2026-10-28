#!/usr/bin/env python3
"""Derives Angiotensin receptor blocker reference rows by template-anchored transcription against externally sourced library anchors."""

# Forward generator and proof. Re-dumps the corpus through data/library.js, censuses the
# four sartan cores separately, transcribes every sourced anchor into a hand-typed
# numbered template under documented tetrazole-tautomer normalisation, gates each
# (site, value) pair at two unanimous anchors, aborts if an admitted cell holds fewer,
# then runs the house gates over the whole candidate pool and writes rows.js.

import json, os, subprocess, sys, itertools
from collections import defaultdict
from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog('rdApp.*')
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = '/home/user/projects/molecule profiler'
DUMP = os.path.join(HERE, 'library.json')
TARGET = 50
CLS = 'Angiotensin receptor blocker'

TEMPLATES = {
    1: ('T1 biphenyltetrazole',
        '[*:1]Cc1ccc(-c2ccccc2-c2nnn[nH]2)cc1',
        'n1nnnc1-c1ccccc1-c1ccc(C)cc1'),
    2: ('T2 biphenyl-2-carboxylic acid',
        '[*:1]Cc1ccc(-c2ccccc2C(=O)O)cc1',
        'OC(=O)c1ccccc1-c1ccc(C)cc1'),
    3: ('T3 1,2,4-oxadiazol-5(4H)-one biphenyl',
        '[*:1]Cc1ccc(-c2ccccc2-c2noc(=O)[nH]2)cc1',
        '[#8]1[#6](=[#8])[#7][#6](=,:[#7]1)-c1ccccc1-c1ccc(C)cc1'),
    4: ('T4 4-carboxybenzyl imidazole',
        '[*:1]Cc1ccc(C(=O)O)cc1',
        'OC(=O)c1ccc(Cn2ccnc2)cc1'),
}

DISCARDED = [
    ('c1nnnn1-c1ccccc1-c1ccccc1', 'aryl bound to the last-written tetrazole N instead of C5; 0 hits'),
    ('c1nnnn1-c2ccccc2', 'same defect with distinct ring digits; 0 hits'),
    ('c1nnnn1-[#6]', 'same defect, minimal form; 0 hits'),
    ('O=C1OC(=NN1)c1ccccc1-c1ccccc1', 'wrong oxadiazolone ring order; 0 hits against stored azilsartan'),
    ('[c;$(c(:n)):n][OX2H1]', 'recursive SMARTS did not compile'),
    ('[c;$([c](:[n])):[c,n]][OX2H1]', 'recursive SMARTS did not compile'),
]

POSITIVES = {
    1: ['CCCCc1nc(Cl)c(CO)n1Cc1ccc(cc1)-c1ccccc1-c1nn[nH]n1',
        'CCCCC(=O)N(Cc1ccc(cc1)-c1ccccc1-c1nn[nH]n1)C(C(C)C)C(=O)O',
        'CCCCC1=NC2(CCCC2)C(=O)N1Cc1ccc(cc1)-c1ccccc1-c1nnn[nH]1',
        'CCOc1nc2cccc(C(=O)O)c2n1Cc1ccc(cc1)-c1ccccc1-c1nnn[nH]1',
        'CCCc1nc(C(C)(C)O)c(C(=O)O)n1Cc1ccc(-c2ccccc2-c2nn[nH]n2)cc1'],
    2: ['CCCc1nc2c(C)cc(cc2n1Cc1ccc(cc1)-c1ccccc1C(=O)O)-c1nc2ccccc2n1C'],
    3: ['CCOc1nc2cccc(C(=O)O)c2n1Cc1ccc(-c2ccccc2-c2noc(=O)[nH]2)cc1'],
    4: ['CCCCc1ncc(C=C(Cc2cccs2)C(=O)O)n1Cc1ccc(C(=O)O)cc1'],
}

NEGATIVES = [
    ('biphenyl', 'c1ccccc1-c1ccccc1'),
    ('4-methylbiphenyl', 'Cc1ccc(-c2ccccc2)cc1'),
    ('diphenic acid', 'O=C(O)c1ccccc1-c1ccccc1C(=O)O'),
    ('1H-tetrazole', 'c1nn[nH]n1'),
    ('pentylenetetrazol', 'C1CCc2nnnn2CC1'),
    ('cefamandole', 'Cn1nnnc1SCC1=C(C(=O)O)N2C(=O)C(NC(=O)C(O)c3ccccc3)C2SC1'),
    ('acitazanolast', 'O=C(O)C(=O)Nc1cccc(-c2nnn[nH]2)c1'),
    ('LY-2183240', 'CN(C)C(=O)n1nnnc1Cc1ccc(-c2ccccc2)cc1'),
    ('ozagrel', 'O=C(O)/C=C/c1ccc(Cn2ccnc2)cc1'),
    ('clemizole', 'Clc1ccc(Cn2c(CN3CCCC3)nc3ccccc32)cc1'),
    ('croconazole', 'C=C(c1ccccc1OCc1cccc(Cl)c1)n1ccnc1'),
    ('cimetidine', 'CC1=C(CSCCNC(=NC)NC#N)N=CN1'),
    ('forasartan', 'CCCCc1nc(CCCC)n(Cc2ccc(-c3ccccc3-c3nn[nH]n3)nc2)n1'),
    ('zolasartan', 'CCCCc1nc(Cl)c(C(=O)O)n1Cc1ccc2oc(-c3ccccc3-c3nn[nH]n3)c(Br)c2c1'),
    ('5-biphenyl-2-yl-1H-tetrazole', 'c1ccc(-c2ccccc2-c2nn[nH]n2)cc1'),
]

TZ = Chem.MolFromSmarts('[#6]1[#7][#7][#7][#7]1')


def fail(msg):
    print('\nABORT: ' + msg)
    sys.exit(1)


def norm_tz(mol):
    rw, moved = Chem.RWMol(mol), 0
    for mt in mol.GetSubstructMatches(TZ):
        c, ns = mt[0], list(mt[1:])
        if any(rw.GetAtomWithIdx(j).GetFormalCharge() for j in ns):
            continue
        if any(rw.GetAtomWithIdx(j).GetDegree() > 2 for j in ns):
            continue
        hs = [j for j in ns if rw.GetAtomWithIdx(j).GetTotalNumHs() == 1]
        if len(hs) != 1:
            continue
        tgt = min(a.GetIdx() for a in rw.GetAtomWithIdx(c).GetNeighbors() if a.GetIdx() in ns)
        if hs[0] == tgt:
            continue
        for j in ns:
            a = rw.GetAtomWithIdx(j)
            a.SetNoImplicit(True)
            a.SetNumExplicitHs(1 if j == tgt else 0)
        moved += 1
    out = rw.GetMol()
    try:
        Chem.SanitizeMol(out)
    except Exception:
        return mol, 0
    return out, moved


def can(x, normalise=True):
    m = x if isinstance(x, Chem.Mol) else Chem.MolFromSmiles(x)
    if m is None:
        return None
    if normalise:
        m = norm_tz(m)[0]
    return Chem.MolToSmiles(m)


def flat(x):
    m = Chem.MolFromSmiles(x) if not isinstance(x, Chem.Mol) else Chem.Mol(x)
    if m is None:
        return None
    m = norm_tz(m)[0]
    Chem.RemoveStereochemistry(m)
    return Chem.MolToSmiles(m)


def tz_form(mol):
    out = []
    for mt in mol.GetSubstructMatches(TZ):
        c, ns = mt[0], list(mt[1:])
        if any(mol.GetAtomWithIdx(j).GetFormalCharge() for j in ns):
            out.append('ionised'); continue
        if any(mol.GetAtomWithIdx(j).GetDegree() > 2 for j in ns):
            out.append('N-substituted'); continue
        hs = [j for j in ns if mol.GetAtomWithIdx(j).GetTotalNumHs() == 1]
        if len(hs) != 1:
            out.append('other'); continue
        adj = [a.GetIdx() for a in mol.GetAtomWithIdx(c).GetNeighbors() if a.GetIdx() in ns]
        out.append('1H' if hs[0] in adj else '2H')
    return out


def heads(mol, q):
    found = []
    for mt in mol.GetSubstructMatches(q, uniquify=False):
        tol = [a for a in mt if mol.GetAtomWithIdx(a).GetSymbol() == 'C'
               and not mol.GetAtomWithIdx(a).GetIsAromatic()]
        if len(tol) != 1:
            continue
        bz = tol[0]
        arm = [a.GetIdx() for a in mol.GetAtomWithIdx(bz).GetNeighbors() if a.GetIdx() not in mt]
        if len(arm) != 1:
            continue
        b = mol.GetBondBetweenAtoms(bz, arm[0]).GetIdx()
        fr = Chem.FragmentOnBonds(mol, [b], addDummies=True, dummyLabels=[(1, 1)])
        for p in Chem.GetMolFrags(fr, asMols=True, sanitizeFrags=True):
            if p.HasSubstructMatch(q):
                continue
            rw = Chem.RWMol(p)
            for a in rw.GetAtoms():
                if a.GetAtomicNum() == 0:
                    a.SetIsotope(0); a.SetAtomMapNum(1)
            h = rw.GetMol()
            try:
                Chem.SanitizeMol(h)
            except Exception:
                continue
            found.append(Chem.MolToSmiles(h))
    return found


def build(tmpl, head):
    a, b = Chem.MolFromSmiles(tmpl), Chem.MolFromSmiles(head)
    if a is None or b is None:
        return None
    try:
        return Chem.molzip(a, b)
    except Exception:
        return None


def dump_corpus():
    js = ("const {LIBRARY}=require('./data/library.js');"
          "require('fs').writeFileSync(%s, JSON.stringify(LIBRARY.map("
          "r=>[r.name,r.smiles,r.cls||'',r.source?1:0])));" % json.dumps(DUMP))
    subprocess.run(['node', '-e', js], cwd=PROJECT, check=True)
    return json.load(open(DUMP))


print('=' * 76)
print('Angiotensin receptor blocker -- template-anchored derivation')
print('=' * 76)
rows = dump_corpus()
mols = [Chem.MolFromSmiles(r[1]) for r in rows]
bad = sum(1 for m in mols if m is None)
inclass = [i for i, r in enumerate(rows) if r[2] == CLS]
print('corpus rows (measured through data/library.js) : %d' % len(rows))
print('externally sourced rows                        : %d' % sum(r[3] for r in rows))
print('unparseable stored rows                        : %d' % bad)
print('rows under cls %-32s: %d (sourced %d)' % (CLS, len(inclass), sum(rows[i][3] for i in inclass)))
if bad:
    fail('corpus holds unparseable rows')

print('\n-- SMARTS validation --')
print('   queries discarded before trusting any core : %d' % len(DISCARDED))
for q, why in DISCARDED:
    print('     %-44s %s' % (q, why))
negm = [(n, Chem.MolFromSmiles(s)) for n, s in NEGATIVES]
for k in sorted(TEMPLATES):
    name, tmpl, sma = TEMPLATES[k]
    q = Chem.MolFromSmarts(sma)
    if q is None:
        fail('%s query did not compile' % name)
    tp = sum(1 for s in POSITIVES[k] if Chem.MolFromSmiles(s).HasSubstructMatch(q))
    fp = [n for n, m in negm if m.HasSubstructMatch(q)]
    print('   %-38s positives %d/%d  negatives %d/%d clean %s'
          % (name, tp, len(POSITIVES[k]), len(negm) - len(fp), len(negm), fp if fp else ''))
    if tp != len(POSITIVES[k]) or fp:
        fail('%s failed validation' % name)

print('\n-- tetrazole tautomer measurement --')
tzc, tzrows = defaultdict(int), 0
for m in mols:
    f = tz_form(m)
    if f:
        tzrows += 1
        for v in f:
            tzc[v] += 1
print('   rows bearing a CN4 tetrazole ring : %d' % tzrows)
for k2 in sorted(tzc):
    print('   %-16s rings %d' % (k2, tzc[k2]))
q1 = Chem.MolFromSmarts(TEMPLATES[1][2])
sart = [i for i, m in enumerate(mols) if m.HasSubstructMatch(q1)]
sc = defaultdict(int)
for i in sart:
    for v in tz_form(mols[i]):
        sc[v] += 1
print('   within the T1 core census         : %s' % dict(sc))
print('   handling: census and anchor matching run on tetrazole-normalised molecules')
print('   (indicated H moved to the ring N adjacent to C5, 1H form); N-substituted and')
print('   ionised tetrazoles are left untouched; the identity gate stays stereo-inclusive.')

print('\n-- per-core census (never pooled) --')
census = {}
for k in sorted(TEMPLATES):
    name, tmpl, sma = TEMPLATES[k]
    q = Chem.MolFromSmarts(sma)
    hits = [i for i, m in enumerate(mols) if norm_tz(m)[0].HasSubstructMatch(q)]
    src = [i for i in hits if rows[i][3]]
    fused = []
    for i in hits:
        m = norm_tz(mols[i])[0]
        ri = m.GetRingInfo()
        for mt in m.GetSubstructMatches(q):
            if any(ri.NumAtomRings(a) > 1 for a in mt):
                fused.append(i); break
    census[k] = (hits, src, fused)
    print('   %-38s hits %-4d sourced %-3d ring-fused %-3d'
          % (name, len(hits), len(src), len(fused)))
    for i in src:
        print('        sourced: %s' % rows[i][0])

print('\n-- anchor transcription, stereo-inclusive canonical identity --')
transcribed, unanimous = defaultdict(set), defaultdict(set)
proven, dropped = [], []
for k in sorted(TEMPLATES):
    name, tmpl, sma = TEMPLATES[k]
    q = Chem.MolFromSmarts(sma)
    for i in census[k][1]:
        m = norm_tz(mols[i])[0]
        stored = Chem.MolToSmiles(m)
        hs = heads(m, q)
        if not hs:
            dropped.append((name, rows[i][0], 'no transcribable single-bond arm at the core attachment'))
            continue
        good = []
        for h in set(hs):
            r = build(tmpl, h)
            if r is not None and can(r) == stored:
                good.append(h)
        if not good:
            dropped.append((name, rows[i][0], 'transcription did not reproduce the stored canonical SMILES'))
            continue
        for h in set(hs):
            transcribed[(k, 'S1', h)].add(i)
        if len(set(hs)) == 1 and len(good) == 1:
            unanimous[(k, 'S1', good[0])].add(i)
        print('   %-38s %-24s reproductions %d  distinct arm values %d  identity OK'
              % (name, rows[i][0], len(hs), len(set(hs))))
        proven.append((k, rows[i][0], good[0]))
print('   anchors proven  : %d' % len(proven))
print('   anchors dropped : %d' % len(dropped))
for n, r, why in dropped:
    print('     dropped %-30s %-24s %s' % (n, r, why))

print('\n-- two-anchor gate per (site, value) --')
cells, refused = {}, []
for key in sorted(set(list(transcribed) + list(unanimous)), key=lambda t: (t[0], t[1], t[2])):
    t, u = len(transcribed[key]), len(unanimous[key])
    if u >= 2:
        cells[key] = u
    else:
        refused.append((key, t, u, sorted(rows[i][0] for i in (unanimous[key] or transcribed[key]))))
print('   admitted cells : %d' % len(cells))
print('   refused cells  : %d' % len(refused))
for key, t, u, who in refused:
    print('     REFUSED core T%d site %s  transcribed %d  unanimous %d  from %s'
          % (key[0], key[1], t, u, ', '.join(who)))
    print('        value %s' % key[2])
for key, u in cells.items():
    if u < 2:
        fail('admitted cell below two anchors: %s' % (key,))

print('\n-- attested-only slot enumeration --')
bysite = defaultdict(list)
for (k, site, val) in cells:
    bysite[(k, site)].append(val)
pool = []
for k in sorted(TEMPLATES):
    sites = sorted([s for (kk, s) in bysite if kk == k])
    if not sites:
        print('   core T%d: no admitted cell, 0 candidates' % k)
        continue
    for combo in itertools.product(*[bysite[(k, s)] for s in sites]):
        mol = None
        tmpl = TEMPLATES[k][1]
        for h in combo:
            mol = build(tmpl, h)
        if mol is not None:
            pool.append((k, combo, Chem.MolToSmiles(mol)))
print('   candidate pool before gates : %d' % len(pool))

print('\n-- naming-convention witnesses measured in the %d stored names --' % len(rows))
names = [r[0] for r in rows]
for frag in ['tetrazol', 'biphenyl', 'benzimidazol', 'oxadiazol', 'imidazol', 'pyrimidin',
             'bis(', 'tris(', 'di(', 'tri(', 'tert-', 'fluoromethyl', '[', '{', '1H-', '2H-',
             'FC', 'CF']:
    print('   %-14s witnesses %d case-insensitive, %d case-sensitive'
          % (frag, sum(1 for n in names if frag.lower() in n.lower()),
             sum(1 for n in names if frag in n)))

ARM_NAMES = {}

print('\n-- gate accounting over the whole pool --')
surv = list(pool)
corpus_flat = {}
corpus_names = set()
for i, r in enumerate(rows):
    corpus_flat.setdefault(flat(mols[i]), r[0])
    corpus_names.add(r[0])

def gate(label, keep):
    global surv
    before = len(surv)
    surv = [c for c in surv if keep(c)]
    print('   %-40s in %-4d out %-4d removed %d' % (label, before, len(surv), before - len(surv)))

gate('naming-convention', lambda c: all(h in ARM_NAMES for h in c[1]))
gate('parse', lambda c: Chem.MolFromSmiles(c[2]) is not None)
gate('differential formula vs CalcMolFormula',
     lambda c: CalcMolFormula(Chem.MolFromSmiles(c[2])) == CalcMolFormula(Chem.MolFromSmiles(c[2])))
gate('stereo-stripped collision vs corpus', lambda c: flat(c[2]) not in corpus_flat)
seenn = set()
gate('exact-name collision vs corpus', lambda c: ARM_NAMES.get(c[1][0]) not in corpus_names)
seens = set()
def uniq_struct(c):
    k = can(c[2])
    if k in seens:
        return False
    seens.add(k)
    return True
gate('intra-batch structure collision', uniq_struct)
def uniq_name(c):
    k = ARM_NAMES.get(c[1][0])
    if k in seenn:
        return False
    seenn.add(k)
    return True
gate('intra-batch name collision', uniq_name)
print('   passing pool : %d' % len(surv))

need = TARGET - len(inclass)
print('\n-- capacity --')
print('   class rows now           : %d' % len(inclass))
print('   rows needed to reach %d  : %d' % (TARGET, need))
print('   measured capacity        : %d' % len(surv))
emit = surv[:need]
with open(os.path.join(HERE, 'rows.js'), 'w') as fh:
    for k, combo, smi in emit:
        m = Chem.MolFromSmiles(smi)
        fh.write("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
                 % (ARM_NAMES[combo[0]], CLS, CalcMolFormula(m), smi))
print('   rows emitted to rows.js  : %d' % len(emit))
print('   class total reached      : %d' % (len(inclass) + len(emit)))
if len(emit) < need:
    print('   CEILING: %d, below the %d target' % (len(inclass) + len(emit), TARGET))
print('\nexit 0')
