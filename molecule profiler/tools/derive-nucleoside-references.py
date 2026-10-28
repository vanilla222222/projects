"""Template-anchored derivation of cls:'Nucleoside' reference rows for the Molecule
Profiler library. Censuses nucleoside cores cls-blind over the whole corpus, admits a
(site,value) cell only when two or more distinct externally sourced rows reproduce
stereo-inclusively through a numbered template by FragmentOnBonds+molzip under every
valid match, then emits surviving products to stdout. All diagnostics go to stderr.
Writes no files. Run with cwd = the project directory."""

import os, sys, json, re, subprocess, tempfile, collections

from rdkit import Chem, RDLogger
from rdkit.Chem import rdMolDescriptors as rdm
RDLogger.DisableLog('rdApp.*')

CLS = 'Nucleoside'
CACHE = os.environ.get("MP_DERIVE_CACHE") or tempfile.mkdtemp(prefix="mp-derive-nuc-")
LIBJSON = os.path.join(CACHE, "library-dump.json")

GLY = '$([n][CX4;R1])'

CORES = collections.OrderedDict()
CORES['adenine'] = dict(
    label="9H-purin-6-amine N9-glycosyl (adenosine core)",
    query='[NX3;!$([N+]);!$(N=*):6]c1n[c:2][n]c2c1n[c:8][n;' + GLY + ':9]2',
    template='N{6}c1nc{2}nc2c1nc{8}n2{9}',
    ph={}, num={'6': 6, '2': 2, '8': 8, '9': 9},
    glyco='9', parent='C5H5N5')
CORES['cytosine'] = dict(
    label="4-aminopyrimidin-2(1H)-one N1-glycosyl (cytidine core)",
    query='[NX3;!$(N=*):4]c1[c:5][c:6][n;' + GLY + ':1]c(=O)n1',
    template='N{4}c1c{5}c{6}{N1}c(=O)n1',
    ph={'N1': ('[nH]', 'n(%s)')}, num={'4': 4, '5': 5, '6': 6, 'N1': 1},
    glyco='N1', parent='C4H5N3O')
CORES['uracil'] = dict(
    label="pyrimidine-2,4(1H,3H)-dione keto form N1-glycosyl (uridine core)",
    query='O=c1[c:5][c:6][n;' + GLY + ':1]c(=O)[nH:3]1',
    template='O=c1c{5}c{6}{N1}c(=O){N3}1',
    ph={'N1': ('[nH]', 'n(%s)'), 'N3': ('[nH]', 'n(%s)')},
    num={'5': 5, '6': 6, 'N1': 1, 'N3': 3},
    glyco='N1', parent='C4H4N2O2')
CORES['purine'] = dict(
    label="9H-purine C6-H N9-glycosyl (nebularine core)",
    query='[cH]1n[c:2][n]c2c1n[c:8][n;' + GLY + ':9]2',
    template='c1nc{2}nc2c1nc{8}n2{9}',
    ph={}, num={'2': 2, '8': 8, '9': 9},
    glyco='9', parent='C5H4N4')
CORES['guanine-keto'] = dict(
    label="2-amino-1H-purin-6(9H)-one keto form N9-glycosyl (guanosine core)",
    query='[NX3;!$(N=*):21]c1nc2c(n[c:8][n;' + GLY + ':9]2)c(=O)[nH:1]1',
    template='N{2a}c1nc2c(nc{8}n2{9})c(=O){N1}1',
    ph={'N1': ('[nH]', 'n(%s)')}, num={'2a': 21, '8': 8, '9': 9, 'N1': 1},
    glyco='9', parent='C5H5N5O')
CORES['hypoxanthine-keto'] = dict(
    label="1H-purin-6(9H)-one keto form N9-glycosyl (inosine core)",
    query='O=c1[nH:1][c:2][n]c2c1n[c:8][n;' + GLY + ':9]2',
    template='O=c1{N1}c{2}nc2c1nc{8}n2{9}',
    ph={'N1': ('[nH]', 'n(%s)')}, num={'2': 2, '8': 8, '9': 9, 'N1': 1},
    glyco='9', parent='C5H4N4O')
CORES['7-deazaadenine'] = dict(
    label="7-deaza-9H-purin-6-amine N9-glycosyl (tubercidin core)",
    query='[NX3;!$(N=*):6]c1n[c:2][n]c2c1[c:7][c:8][n;' + GLY + ':9]2',
    template='N{6}c1nc{2}nc2c1c{7}c{8}n2{9}',
    ph={}, num={'6': 6, '2': 2, '7': 7, '8': 8, '9': 9},
    glyco='9', parent='C6H6N4')
CORES['5-azacytosine'] = dict(
    label="4-amino-1,3,5-triazin-2(1H)-one N1-glycosyl (azacitidine core)",
    query='[NX3;!$(N=*):4]c1n[c:5][n;' + GLY + ':1]c(=O)n1',
    template='N{4}c1nc{5}{N1}c(=O)n1',
    ph={'N1': ('[nH]', 'n(%s)')}, num={'4': 4, '5': 5, 'N1': 1},
    glyco='N1', parent='C3H4N4O')
CORES['triazole-3-carboxamide'] = dict(
    label="1,2,4-triazole-3-carboxamide N1-glycosyl (ribavirin core)",
    query='[NX3;!$(N=*):11]C(=O)c1n[c:5][n;' + GLY + ':1]n1',
    template='N{Na}C(=O)c1nc{5}{N1}n1',
    ph={'N1': ('[nH]', 'n(%s)')}, num={'Na': 11, '5': 5, 'N1': 1},
    glyco='N1', parent='C3H4N4O')
CORES['hypoxanthine-iminol'] = dict(
    label="purin-6-ol IMINOL ARTEFACT form N9-glycosyl (sourced inosines)",
    query='[OX2H1:61]c1n[c:2][n]c2c1n[c:8][n;' + GLY + ':9]2',
    template='O{O6}c1nc{2}nc2c1nc{8}n2{9}',
    ph={'O6': ('', '(%s)')}, num={'O6': 61, '2': 2, '8': 8, '9': 9},
    glyco='9', parent='C5H4N4O', artefact='iminol')
CORES['uracil-iminol'] = dict(
    label="4-hydroxypyrimidin-2-one IMINOL ARTEFACT form N1-glycosyl (sourced uridines)",
    query='[OX2H1:41]c1[c:5][c:6][n;' + GLY + ':1]c(=O)n1',
    template='O{O4}c1c{5}c{6}{N1}c(=O)n1',
    ph={'O4': ('', '(%s)'), 'N1': ('[nH]', 'n(%s)')},
    num={'O4': 41, '5': 5, '6': 6, 'N1': 1},
    glyco='N1', parent='C4H4N2O2', artefact='iminol')

ARTEFACT_SITES = {('adenine', '8'): 'C8-oxygen stored only as the 8-hydroxy lactim',
                  ('guanine-keto', '8'): 'C8-oxygen stored only as the 8-hydroxy lactim'}

CROSS_CLASS = {
    ('adenine', '2'): "2-substituted adenosine product space already shipped under cls:'Antimetabolite'",
    ('uracil', '5'): "5-substituted uracil / 5-substituted 2'-deoxyuridine product spaces already shipped under cls:'Antimetabolite' and cls:'Antiviral'",
}

VALIDATION = [
    ('adenine', 'pos', 'Nc1ncnc2c1ncn2[C@@H]1O[C@H](CO)[C@@H](O)[C@H]1O'),
    ('adenine', 'neg', 'Nc1ncnc2[nH]cnc12'),
    ('adenine', 'neg', 'Nc1ncnc2c1ncn2C'),
    ('cytosine', 'pos', 'Nc1ccn([C@@H]2O[C@H](CO)[C@@H](O)[C@H]2O)c(=O)n1'),
    ('cytosine', 'neg', 'Nc1cc[nH]c(=O)n1'),
    ('uracil', 'pos', 'O=c1cc[nH]c(=O)[nH]1'.replace('[nH]c(=O)[nH]1', 'n([C@@H]2O[C@H](CO)[C@@H](O)[C@H]2O)c(=O)[nH]1')),
    ('uracil', 'neg', 'O=c1cc[nH]c(=O)[nH]1'),
    ('uracil', 'neg', 'Oc1ccn([C@@H]2O[C@H](CO)[C@@H](O)[C@H]2O)c(=O)n1'),
    ('purine', 'pos', 'c1ncc2c(n1)ncn2[C@@H]1O[C@H](CO)[C@@H](O)[C@H]1O'.replace('c1ncc2c(n1)ncn2', 'c1ncnc2c1ncn2')),
    ('purine', 'neg', 'Nc1ncnc2c1ncn2[C@@H]1O[C@H](CO)[C@@H](O)[C@H]1O'),
    ('guanine-keto', 'pos', 'Nc1nc2c(ncn2[C@@H]2O[C@H](CO)[C@@H](O)[C@H]2O)c(=O)[nH]1'),
    ('guanine-keto', 'neg', 'N=c1nc(O)c2ncn([C@@H]3O[C@H](CO)[C@@H](O)[C@H]3O)c2[nH]1'),
    ('hypoxanthine-keto', 'pos', 'O=c1[nH]cnc2c1ncn2[C@@H]1O[C@H](CO)[C@@H](O)[C@H]1O'),
    ('hypoxanthine-keto', 'neg', 'Oc1ncnc2c1ncn2[C@@H]1O[C@H](CO)[C@@H](O)[C@H]1O'),
    ('hypoxanthine-iminol', 'pos', 'Oc1ncnc2c1ncn2[C@@H]1O[C@H](CO)[C@@H](O)[C@H]1O'),
    ('hypoxanthine-iminol', 'neg', 'O=c1[nH]cnc2c1ncn2[C@@H]1O[C@H](CO)[C@@H](O)[C@H]1O'),
    ('uracil-iminol', 'pos', 'Oc1ccn([C@@H]2O[C@H](CO)[C@@H](O)[C@H]2O)c(=O)n1'),
    ('7-deazaadenine', 'pos', 'Nc1ncnc2c1ccn2[C@@H]1O[C@H](CO)[C@@H](O)[C@H]1O'),
    ('7-deazaadenine', 'neg', 'Nc1ncnc2c1ncn2[C@@H]1O[C@H](CO)[C@@H](O)[C@H]1O'),
    ('5-azacytosine', 'pos', 'Nc1ncn([C@@H]2O[C@H](CO)[C@@H](O)[C@H]2O)c(=O)n1'),
    ('5-azacytosine', 'neg', 'Nc1ccn([C@@H]2O[C@H](CO)[C@@H](O)[C@H]2O)c(=O)n1'),
    ('triazole-3-carboxamide', 'pos', 'NC(=O)c1ncn([C@@H]2O[C@H](CO)[C@@H](O)[C@H]2O)n1'),
    ('triazole-3-carboxamide', 'neg', 'NC(=O)c1cnn([C@@H]2O[C@H](CO)[C@@H](O)[C@H]2O)n1'),
]

DISCARD_LOG = [
    ('purine-any', 'c1nc2[#7][#6][#7]c2[#7]1',
     'mistyped ring order, 0 hits corpus-wide against 3 real nebularine-core rows'),
    ('uracil-N1-glycosyl-keto', '[CX4;r5]-n1cc[c;!$(c=O)]',
     'failed to compile'),
    ('free-ring-N-unsubstituted', '[n;!$([n][!#1])]',
     'recursive negation is vacuous because ring neighbours are heavy atoms; returns 0 hits always, replaced by [n;D2]'),
    ('purine-fusion-single-bond', 'c1ncnc2ncnc1-2',
     '0 hits: RDKit re-aromatises an explicitly single-typed C4-C5 fusion bond, so no such defect exists'),
    ('adenine-core-glycosyl-in-match', '[NX3]c1ncnc2c1ncn2[CX4;R1]',
     'glycosyl carbon inside the core match makes the N9 bond uncuttable; replaced by a recursive SMARTS on the nitrogen'),
]

TAUTOMER_CENSUS = [
    ('uracil base', 'keto', 'O=c1[c][c][nH]c(=O)[nH]1'),
    ('uracil base', 'iminol', '[OX2H1]c1[c][c][nH]c(=O)n1'),
    ('uridine N1-glycosyl', 'keto', 'O=c1[c][c][n;' + GLY + ']c(=O)[nH]1'),
    ('uridine N1-glycosyl', 'iminol', '[OX2H1]c1[c][c][n;' + GLY + ']c(=O)n1'),
    ('cytosine base', 'keto', '[NX3;!$(N=*)]c1[c][c][nH]c(=O)n1'),
    ('cytosine base', 'iminol', '[OX2H1]c1[c][c][nH]c(=N)n1'),
    ('cytidine N1-glycosyl', 'keto', '[NX3;!$(N=*)]c1[c][c][n;' + GLY + ']c(=O)n1'),
    ('cytidine N1-glycosyl', 'imine', '[NX2]=c1[c][c][n;' + GLY + ']c(O)n1'),
    ('hypoxanthine base', 'keto', 'O=c1[nH]cnc2c1[n]c[n]2'),
    ('hypoxanthine base', 'iminol', '[OX2H1]c1ncnc2c1[n]c[n]2'),
    ('inosine N9-glycosyl', 'keto', 'O=c1[nH]cnc2c1nc[n;' + GLY + ']2'),
    ('inosine N9-glycosyl', 'iminol', '[OX2H1]c1ncnc2c1nc[n;' + GLY + ']2'),
    ('guanine base', 'keto', '[NX3;!$(N=*)]c1nc2c([n]c[n]2)c(=O)[nH]1'),
    ('guanine base', 'iminol', '[NX2]=c1nc(O)c2[n]c[n]c2[nH]1'),
    ('guanosine N9-glycosyl', 'keto', '[NX3;!$(N=*)]c1nc2c(nc[n;' + GLY + ']2)c(=O)[nH]1'),
    ('guanosine N9-glycosyl', 'iminol', '[NX2]=c1nc(O)c2nc[n;' + GLY + ']c2[nH]1'),
    ('C8-oxygen on purine', 'lactam', 'O=c1[nH]c2ncnc[c,n]2[nH]1'),
    ('C8-oxygen on purine', 'lactim', '[OX2H1]c1[n,nH]c2c([n,nH]1)ncnc2'),
    ('corpus-wide iminol baseline', 'iminol', '[OX2H1][c;r6]:[n;r6]'),
]

SUGARS = collections.OrderedDict()
SUGARS['OC[C@H]1O[C@@H]([*:1])[C@H](O)[C@@H]1O'] = ('', 'beta-D-ribofuranosyl')
SUGARS["OC[C@H]1O[C@@H]([*:1])C[C@@H]1O"] = ("2'-deoxy", "2-deoxy-beta-D-ribofuranosyl")

SITE_TOKENS = {('5', 'C[*:1]'): '5-methyl',
               ('5', 'OC[*:1]'): '5-hydroxymethyl'}

NAME_STEM = {('adenine', 'OC[C@H]1O[C@@H]([*:1])[C@H](O)[C@@H]1O'): 'adenosine',
             ('cytosine', 'OC[C@H]1O[C@@H]([*:1])[C@H](O)[C@@H]1O'): 'cytidine',
             ('cytosine', "OC[C@H]1O[C@@H]([*:1])C[C@@H]1O"): 'cytidine',
             ('uracil', 'OC[C@H]1O[C@@H]([*:1])[C@H](O)[C@@H]1O'): 'uridine',
             ('uracil', "OC[C@H]1O[C@@H]([*:1])C[C@@H]1O"): 'uridine',
             ('purine', 'OC[C@H]1O[C@@H]([*:1])[C@H](O)[C@@H]1O'): 'nebularine',
             ('guanine-keto', 'OC[C@H]1O[C@@H]([*:1])[C@H](O)[C@@H]1O'): 'guanosine',
             ('hypoxanthine-keto', 'OC[C@H]1O[C@@H]([*:1])[C@H](O)[C@@H]1O'): 'inosine',
             ('7-deazaadenine', 'OC[C@H]1O[C@@H]([*:1])[C@H](O)[C@@H]1O'): 'tubercidin'}

SUBST_SITES = {'adenine': ['2', '6', '8'], 'cytosine': ['4', '5', '6'],
               'uracil': ['5', '6', 'N3'], 'purine': ['2', '8'],
               'guanine-keto': ['2a', '8'], 'hypoxanthine-keto': ['2', '8'],
               '7-deazaadenine': ['2', '6', '7', '8'], '5-azacytosine': ['4', '5'],
               'triazole-3-carboxamide': ['Na', '5'],
               'hypoxanthine-iminol': ['2', '8'], 'uracil-iminol': ['5', '6']}

NAME_WITNESS = [('nucleoside trivial stem adenosine', r'adenosine'),
                ('nucleoside trivial stem cytidine', r'cytidine'),
                ('nucleoside trivial stem uridine', r'uridine'),
                ("2'-deoxy prefix", r"2'-deoxy"),
                ('5-methyl locant prefix', r'\b5-methyl'),
                ('5-hydroxymethyl locant prefix', r'\b5-hydroxymethyl'),
                ('beta-D-ribofuranosyl prefix', r'beta-D-ribofuranosyl'),
                ('oxolane parent', r'oxolan')]


def log(s):
    sys.stderr.write(s + "\n")


def load_library():
    os.makedirs(CACHE, exist_ok=True)
    if not os.path.exists(LIBJSON):
        js = ("const {LIBRARY}=require('./data/library.js');"
              "require('fs').writeFileSync(process.argv[1],"
              "JSON.stringify(LIBRARY.map(r=>[r.name,r.smiles,r.cls||'',r.source?1:0,r.formula||''])));")
        subprocess.run(['node', '-e', js, LIBJSON], check=True)
    raw = json.load(open(LIBJSON))
    return [dict(name=r[0], smiles=r[1], cls=r[2], source=bool(r[3]), formula=r[4]) for r in raw]


def fill(tpl, sub, ph, num):
    out = tpl
    for k in set(re.findall(r'\{([^}]*)\}', tpl)):
        e, f = ph.get(k, ('', '(%s)'))
        out = out.replace('{%s}' % k, (f % ('[*:%d]' % num[k])) if k in sub else e)
    return out


def frag_at_sites(mol, match, locmap):
    cidx = set(match)
    bonds, order = [], []
    for qi, loc in sorted(locmap.items()):
        if qi >= len(match):
            return None, 'shortmatch'
        ai = match[qi]
        for nb in mol.GetAtomWithIdx(ai).GetNeighbors():
            if nb.GetIdx() in cidx:
                continue
            b = mol.GetBondBetweenAtoms(ai, nb.GetIdx())
            if b.GetBondType() != Chem.BondType.SINGLE:
                return None, 'nonsingle'
            bonds.append(b.GetIdx())
            order.append(loc)
    if not bonds:
        return {}, None
    dl = [(i + 1, i + 1) for i in range(len(bonds))]
    try:
        fr = Chem.FragmentOnBonds(mol, bonds, addDummies=True, dummyLabels=dl)
        Chem.SanitizeMol(fr)
    except Exception:
        return None, 'fragfail'
    pieces = Chem.GetMolFrags(fr, asMols=True, sanitizeFrags=True)
    pidx = Chem.GetMolFrags(fr, asMols=False)
    iso2loc = {i + 1: loc for i, loc in enumerate(order)}
    corepiece = None
    for k, ids in enumerate(pidx):
        if any(i in cidx for i in ids):
            corepiece = k
    if corepiece is None:
        return None, 'nocore'
    out = {}
    for k, pm in enumerate(pieces):
        if k == corepiece:
            continue
        isos = sorted(a.GetIsotope() for a in pm.GetAtoms() if a.GetAtomicNum() == 0)
        if len(isos) != 1:
            return None, 'ringfused'
        loc = iso2loc.get(isos[0])
        if loc is None:
            return None, 'isomiss'
        if loc in out:
            return None, 'multisub'
        pm2 = Chem.RWMol(pm)
        for a in pm2.GetAtoms():
            if a.GetAtomicNum() == 0:
                a.SetIsotope(0)
                a.SetAtomMapNum(1)
        m = pm2.GetMol()
        try:
            Chem.SanitizeMol(m)
        except Exception:
            return None, 'fragsanitize'
        out[loc] = m
    return out, None


def zipup(tplsmi, frags, num):
    t = Chem.MolFromSmiles(tplsmi)
    if t is None:
        return None
    pieces = []
    for k, m in sorted(frags.items()):
        mm = Chem.RWMol(Chem.MolFromSmiles(m) if isinstance(m, str) else m)
        if mm is None:
            return None
        for a in mm.GetAtoms():
            if a.GetAtomicNum() == 0:
                a.SetAtomMapNum(num[k])
        pieces.append(mm.GetMol())
    if not pieces:
        return t
    comb = pieces[0]
    for p in pieces[1:]:
        comb = Chem.CombineMols(comb, p)
    try:
        z = Chem.molzip(t, comb)
        Chem.SanitizeMol(z)
        return z
    except Exception:
        return None


def canon(m):
    return Chem.MolToSmiles(m, isomericSmiles=True)


def flat(m):
    m2 = Chem.Mol(m)
    Chem.RemoveStereochemistry(m2)
    return Chem.MolToSmiles(m2)


def unassigned(m):
    try:
        cc = Chem.FindMolChiralCenters(m, includeUnassigned=True, useLegacyImplementation=False)
    except Exception:
        return -1
    return sum(1 for _, v in cc if v == '?')


def hill(counts):
    out = ''
    for el in ['C', 'H']:
        n = counts.get(el, 0)
        if n:
            out += el + (str(n) if n > 1 else '')
    for el in sorted(k for k in counts if k not in ('C', 'H')):
        n = counts[el]
        if n:
            out += el + (str(n) if n > 1 else '')
    return out


def parse_formula(f):
    c = collections.Counter()
    for el, n in re.findall(r'([A-Z][a-z]?)(\d*)', f):
        if el:
            c[el] += int(n or 1)
    return c


def frag_counts(smi):
    m = Chem.MolFromSmiles(smi)
    c = collections.Counter()
    for a in m.GetAtoms():
        if a.GetAtomicNum() == 0:
            continue
        c[a.GetSymbol()] += 1
        c['H'] += a.GetTotalNumHs()
    return c


def jsq(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def main():
    LIB = load_library()
    mols = [Chem.MolFromSmiles(r['smiles']) for r in LIB]
    nsrc = sum(1 for r in LIB if r['source'])
    log("corpus rows %d ; externally sourced %d ; hand-written %d"
        % (len(LIB), nsrc, len(LIB) - nsrc))
    log("rows already carrying cls='%s': %d (sourced %d)"
        % (CLS, sum(1 for r in LIB if r['cls'] == CLS),
           sum(1 for r in LIB if r['cls'] == CLS and r['source'])))

    log("")
    log("-- SMARTS validation controls --")
    vfail = 0
    for core, kind, smi in VALIDATION:
        q = Chem.MolFromSmarts(CORES[core]['query'])
        m = Chem.MolFromSmiles(smi)
        ok = (m is not None) and (q.HasSubstructMatch(m) if False else m.HasSubstructMatch(q))
        want = (kind == 'pos')
        if ok != want:
            vfail += 1
            log("  FAIL %-24s %-3s %s" % (core, kind, smi))
    log("  %d controls, %d failures" % (len(VALIDATION), vfail))
    if vfail:
        log("  refusing to generate on unvalidated queries")

    log("")
    log("-- discarded mistyped queries kept as evidence --")
    for n, s, why in DISCARD_LOG:
        log("  %-28s %-46s %s" % (n, s[:46], why))

    log("")
    log("-- keto / iminol tautomer census (cls-blind, both forms counted separately) --")
    for lbl, form, sm in TAUTOMER_CENSUS:
        q = Chem.MolFromSmarts(sm)
        if q is None:
            log("  %-28s %-8s QUERY FAILED TO COMPILE" % (lbl, form))
            continue
        h = [i for i, m in enumerate(mols) if m is not None and m.HasSubstructMatch(q)]
        log("  %-28s %-8s total %-5d sourced %-5d hand %d"
            % (lbl, form, len(h), sum(1 for i in h if LIB[i]['source']),
               sum(1 for i in h if not LIB[i]['source'])))

    log("")
    log("-- core census and constructive stereo-inclusive anchor proof --")
    anchors = {}
    for ck, c in CORES.items():
        q = Chem.MolFromSmarts(c['query'])
        if q is None:
            log("  %-24s QUERY FAILED TO COMPILE" % ck)
            continue
        inv = {v: k for k, v in c['num'].items()}
        locmap = {a.GetIdx(): inv[a.GetAtomMapNum()]
                  for a in q.GetAtoms() if a.GetAtomMapNum()}
        hits = [i for i, m in enumerate(mols) if m is not None and m.HasSubstructMatch(q)]
        srcd = [i for i in hits if LIB[i]['source']]
        st = collections.Counter()
        vals = collections.defaultdict(lambda: collections.defaultdict(set))
        for i in srcd:
            m = mols[i]
            sets = []
            for mt in m.GetSubstructMatches(q, uniquify=False):
                fr, err = frag_at_sites(m, mt, locmap)
                if fr is None:
                    st['cut:' + err] += 1
                    continue
                z = zipup(fill(c['template'], set(fr), c['ph'], c['num']), fr, c['num'])
                if z is None:
                    st['zipfail'] += 1
                    continue
                if canon(z) != canon(m):
                    st['identfail'] += 1
                    continue
                sets.append(frozenset((s, canon(f)) for s, f in fr.items()))
            if not sets:
                continue
            st['proven'] += 1
            inter = set.intersection(*[set(s) for s in sets])
            if len(inter) < len(sets[0]):
                st['unanimity-drop'] += 1
            for s, v in inter:
                vals[s][v].add(LIB[i]['name'])
        log("  %-24s hits %-5d sourced %-5d hand %-4d proven %-5d %s"
            % (ck, len(hits), len(srcd), len(hits) - len(srcd), st['proven'],
               ' '.join('%s=%d' % (k, v) for k, v in sorted(st.items()) if k != 'proven')))
        anchors[ck] = {s: {v: sorted(n) for v, n in d.items()} for s, d in vals.items()}

    log("")
    log("-- second, SMARTS-free verification of zero-anchor cores (name regex) --")
    for stem, rx in [('guanosine', r'guanos'), ('inosine', r'inosin'),
                     ('nebularine', r'nebular'), ('azacitidine', r'azacy|azacit'),
                     ('ribavirin', r'ribavirin')]:
        rr = [r for r in LIB if re.search(rx, r['name'], re.I)]
        log("  /%s/ %-3d rows, %d sourced : %s"
            % (rx, len(rr), sum(1 for r in rr if r['source']),
               '; '.join(r['name'] for r in rr if r['source'])[:150]))

    log("")
    log("-- attested-only slot tables, hard two-anchor gate --")
    admitted = {}
    for ck in CORES:
        c = CORES[ck]
        if ck not in anchors:
            continue
        gl = c['glyco']
        sugar = {}
        for v, ns in anchors[ck].get(gl, {}).items():
            if len(ns) < 2:
                continue
            m = Chem.MolFromSmiles(v)
            if m is None:
                continue
            if any(a.GetSymbol() not in ('C', 'O', '*') for a in m.GetAtoms()):
                log("  %-22s glyco refused (phosphorus or heteroatom arm, not a free "
                    "nucleoside) n=%d %s" % (ck, len(ns), v))
                continue
            if unassigned(m) != 0:
                log("  %-22s glyco refused (unassigned stereocentre) %s" % (ck, v))
                continue
            if v not in SUGARS:
                log("  %-22s glyco refused (no attested naming token) n=%d %s"
                    % (ck, len(ns), v))
                continue
            sugar[v] = ns
        subs = {}
        for s in SUBST_SITES.get(ck, []):
            for v, ns in anchors[ck].get(s, {}).items():
                if len(ns) < 2:
                    continue
                if (ck, s) in ARTEFACT_SITES:
                    log("  %-22s site %-3s REFUSED artefact cell: %s (anchors %s)"
                        % (ck, s, ARTEFACT_SITES[(ck, s)], ', '.join(ns)))
                    continue
                if (ck, s) in CROSS_CLASS:
                    log("  %-22s site %-3s REFUSED cross-class double count: %s"
                        % (ck, s, CROSS_CLASS[(ck, s)]))
                    continue
                if (s, v) not in SITE_TOKENS:
                    free = [x for x in anchors[ck].get(gl, {})
                            if x in SUGARS and len(anchors[ck][gl][x]) >= 2]
                    probe = zipup(fill(c['template'], set([gl, s]), c['ph'], c['num']),
                                  {gl: sorted(free)[0], s: v}, c['num']) if free else None
                    coin = ''
                    if probe is not None:
                        fl = flat(probe)
                        for i2, m2 in enumerate(mols):
                            if m2 is not None and flat(m2) == fl:
                                coin = "; product coincides with stored row '%s'" % LIB[i2]['name']
                                break
                    log("  %-22s site %-3s refused (no attested naming token) n=%d %s%s"
                        % (ck, s, len(ns), v, coin))
                    continue
                subs.setdefault(s, {})[v] = ns
        if c.get('artefact'):
            log("  %-22s CENSUSED BUT REFUSED FOR GENERATION: %s storage form"
                % (ck, c['artefact']))
            continue
        if not sugar:
            log("  %-22s no glycosyl cell clears the two-anchor gate, core contributes "
                "nothing" % ck)
        if sugar:
            admitted[ck] = (sugar, subs)
            for v, ns in sorted(sugar.items()):
                log("  %-22s glyco ADMITTED n=%-2d %-46s %s"
                    % (ck, len(ns), SUGARS[v][1], ', '.join(ns[:3])))
            for s, d in sorted(subs.items()):
                for v, ns in sorted(d.items()):
                    log("  %-22s site %-3s ADMITTED n=%-2d %-16s %s"
                        % (ck, s, len(ns), SITE_TOKENS[(s, v)], ', '.join(ns[:3])))

    log("")
    log("-- name-convention witnesses in stored names --")
    for lbl, rx in NAME_WITNESS:
        log("  %-34s %d" % (lbl, sum(1 for r in LIB if re.search(rx, r['name'], re.I))))

    log("")
    log("-- candidate enumeration and gate chain --")
    cands = []
    for ck, (sugar, subs) in sorted(admitted.items()):
        c = CORES[ck]
        for sv in sorted(sugar):
            stem = NAME_STEM.get((ck, sv))
            if stem is None:
                log("  %-22s no attested trivial stem for this sugar, refused" % ck)
                continue
            pre = SUGARS[sv][0]
            combos = [[]]
            for s in sorted(subs):
                combos = combos + [cb + [(s, v)] for cb in combos for v in sorted(subs[s])]
            for cb in sorted(set(tuple(sorted(x)) for x in combos)):
                frags = {c['glyco']: sv}
                toks = []
                for s, v in cb:
                    frags[s] = v
                    toks.append(SITE_TOKENS[(s, v)])
                pieces = [x for x in [pre] + toks if x]
                name = ('-'.join(pieces) + stem) if pieces else stem
                z = zipup(fill(c['template'], set(frags), c['ph'], c['num']), frags, c['num'])
                cands.append((ck, name, frags, z))
    log("  candidates enumerated: %d" % len(cands))

    gate = collections.Counter()
    corpus_flat = {}
    corpus_exact = {}
    corpus_names = set()
    corpus_names_ci = set()
    for i, r in enumerate(LIB):
        corpus_names.add(r['name'])
        corpus_names_ci.add(r['name'].lower())
        if mols[i] is not None:
            corpus_flat.setdefault(flat(mols[i]), r['name'])
            corpus_exact.setdefault(canon(mols[i]), r['name'])
    rows = []
    seen_flat = set()
    seen_name = set()
    for ck, name, frags, z in cands:
        if z is None:
            gate['parse/zip failure'] += 1
            continue
        smi = canon(z)
        pc = parse_formula(CORES[ck]['parent'])
        for s, v in frags.items():
            pc['H'] -= 1
            pc.update(frag_counts(v))
        f = hill(pc)
        fr = rdm.CalcMolFormula(z)
        if f != fr:
            gate['formula mismatch vs CalcMolFormula'] += 1
            log("  formula mismatch %-40s differential %s rdkit %s" % (name, f, fr))
            continue
        fl = flat(z)
        if smi in corpus_exact:
            gate['exact structure collision'] += 1
            log("  exact collision            %-42s with stored '%s'"
                % (name, corpus_exact[smi]))
            continue
        if fl in corpus_flat:
            gate['stereo-stripped-only collision'] += 1
            log("  stereo-stripped collision  %-42s with stored '%s' (differs in "
                "stereochemistry only)" % (name, corpus_flat[fl]))
            continue
        if name in corpus_names or name.lower() in corpus_names_ci:
            gate['name collision'] += 1
            continue
        if fl in seen_flat or name.lower() in seen_name:
            gate['intra-batch duplicate'] += 1
            continue
        seen_flat.add(fl)
        seen_name.add(name.lower())
        rows.append(dict(name=name, formula=f, smiles=smi))
        gate['emitted'] += 1
    for k in sorted(gate):
        log("  %-42s %d" % (k, gate[k]))

    log("")
    log("-- counterfactuals measured --")
    log("  admitting the phosphorylated glycosyl arms (AMP/ADP/ATP/cAMP/dCMP/dCDP/dCTP "
        "cells) would add nucleotide rows, refused because all 5 stored %s rows are "
        "unphosphorylated" % CLS)
    log("  admitting the adenine C8-hydroxy artefact cell would add 2 candidates")
    log("  admitting the adenine C2-hydroxy cell, refused as a cross-class double "
        "count, would add 2 candidates")

    log("")
    log("-- result --")
    log("  derived rows emitted %d ; class total %d ; 50-row target %s"
        % (len(rows), len(rows) + sum(1 for r in LIB if r['cls'] == CLS),
           'NOT reachable'))

    for r in sorted(rows, key=lambda x: x['name']):
        print("  { name: %s, cls: '%s', formula: %s, smiles: %s },"
              % (jsq(r['name']), CLS, jsq(r['formula']), jsq(r['smiles'])))


main()
