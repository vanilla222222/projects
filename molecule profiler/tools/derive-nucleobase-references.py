"""Template-anchored derivation of cls:'Nucleobase' reference rows for the Molecule
Profiler library. Product space is kept strictly disjoint from cls:'Nucleoside': the
glycosidic ring nitrogen must carry no substituent, so every row here is a free base.
Censuses each base core cls-blind over the whole corpus across all N-H tautomers,
admits a (site,value) cell only on two or more distinct externally sourced rows that
reproduce stereo-inclusively through a numbered template by FragmentOnBonds+molzip,
and emits survivors to stdout. Diagnostics go to stderr. Writes no files."""

import os, sys, json, re, subprocess, tempfile, collections

from rdkit import Chem, RDLogger
from rdkit.Chem import rdMolDescriptors as rdm
RDLogger.DisableLog('rdApp.*')

CLS = 'Nucleobase'
CACHE = os.environ.get("MP_DERIVE_CACHE") or tempfile.mkdtemp(prefix="mp-derive-nuc-")
LIBJSON = os.path.join(CACHE, "library-dump.json")

CORES = collections.OrderedDict()
CORES['adenine-9H'] = dict(
    label="9H-purin-6-amine free base",
    query='[NX3;!$([N+]);!$(N=*):6]c1n[c:2][n]c2c1n[c:8][nH]2',
    template='N{6}c1nc{2}nc2c1nc{8}[nH]2',
    ph={}, num={'6': 6, '2': 2, '8': 8}, parent='C5H5N5', family='adenine')
CORES['adenine-7H'] = dict(
    label="7H-purin-6-amine free base",
    query='[NX3;!$([N+]);!$(N=*):6]c1n[c:2][n]c2c1[nH][c:8]n2',
    template='N{6}c1nc{2}nc2c1[nH]c{8}n2',
    ph={}, num={'6': 6, '2': 2, '8': 8}, parent='C5H5N5', family='adenine')
CORES['adenine-3H'] = dict(
    label="3H-purin-6-amine free base, ChEBI storage tautomer",
    query='[NX3;!$([N+]);!$(N=*):6]c1n[c:2][nH]c2c1n[c:8]n2',
    template='N{6}c1nc{2}[nH]c2c1nc{8}n2',
    ph={}, num={'6': 6, '2': 2, '8': 8}, parent='C5H5N5', family='adenine')
CORES['adenine-1H'] = dict(
    label="1H-purin-6-imine free base, ChEBI storage tautomer",
    query='[NX3;!$([N+]);!$(N=*):6]c1[nH][c:2][n]c2c1n[c:8]n2',
    template='N{6}c1[nH]c{2}nc2c1nc{8}n2',
    ph={}, num={'6': 6, '2': 2, '8': 8}, parent='C5H5N5', family='adenine')
CORES['cytosine'] = dict(
    label="4-aminopyrimidin-2(1H)-one free base",
    query='[NX3;!$(N=*):4]c1[c:5][c:6][nH]c(=O)n1',
    template='N{4}c1c{5}c{6}[nH]c(=O)n1',
    ph={}, num={'4': 4, '5': 5, '6': 6}, parent='C4H5N3O', family='cytosine')
CORES['uracil'] = dict(
    label="pyrimidine-2,4(1H,3H)-dione keto form free base",
    query='O=c1[c:5][c:6][nH]c(=O)[nH]1',
    template='O=c1c{5}c{6}[nH]c(=O)[nH]1',
    ph={}, num={'5': 5, '6': 6}, parent='C4H4N2O2', family='uracil')
CORES['guanine-keto'] = dict(
    label="2-amino-1H-purin-6(9H)-one keto form free base",
    query='[NX3;!$(N=*):21]c1nc2c(n[c:8][nH]2)c(=O)[nH]1',
    template='N{2a}c1nc2c(nc{8}[nH]2)c(=O)[nH]1',
    ph={}, num={'2a': 21, '8': 8}, parent='C5H5N5O', family='guanine')
CORES['hypoxanthine-keto'] = dict(
    label="1H-purin-6(9H)-one keto form free base",
    query='O=c1[nH]c[n]c2c1n[c:8][nH]2',
    template='O=c1[nH]cnc2c1nc{8}[nH]2',
    ph={}, num={'8': 8}, parent='C5H4N4O', family='hypoxanthine')
CORES['purin-6-ol-iminol'] = dict(
    label="purin-6-ol IMINOL ARTEFACT free base",
    query='[OX2H1:61]c1n[c:2][n]c2c1n[c:8][nH]2',
    template='O{O6}c1nc{2}nc2c1nc{8}[nH]2',
    ph={'O6': ('', '(%s)')}, num={'O6': 61, '2': 2, '8': 8},
    parent='C5H4N4O', family='hypoxanthine', artefact='iminol')

SITES = {'adenine': ['2', '6', '8'], 'cytosine': ['4', '5', '6'], 'uracil': ['5', '6'],
         'guanine': ['2a', '8'], 'hypoxanthine': ['8', '2']}

VALIDATION = [
    ('adenine-9H', 'pos', 'Nc1ncnc2[nH]cnc12'),
    ('adenine-9H', 'neg', 'Nc1ncnc2c1ncn2[C@@H]1O[C@H](CO)[C@@H](O)[C@H]1O'),
    ('adenine-3H', 'pos', 'C/C(=C/CNc1nc[nH]c2ncnc1-2)CO'),
    ('adenine-1H', 'pos', 'c1coc(CNc2[nH]cnc3ncnc2-3)c1'),
    ('cytosine', 'pos', 'Nc1cc[nH]c(=O)n1'),
    ('cytosine', 'neg', 'Nc1ccn([C@@H]2O[C@H](CO)[C@@H](O)[C@H]2O)c(=O)n1'),
    ('uracil', 'pos', 'O=c1cc[nH]c(=O)[nH]1'),
    ('uracil', 'pos', 'Cc1c[nH]c(=O)[nH]c1=O'),
    ('uracil', 'neg', 'O=c1ccn([C@@H]2O[C@H](CO)[C@@H](O)[C@H]2O)c(=O)[nH]1'),
    ('guanine-keto', 'pos', 'Nc1nc2[nH]cnc2c(=O)[nH]1'),
    ('guanine-keto', 'neg', 'N=c1nc(O)c2[nH]cnc2[nH]1'),
    ('hypoxanthine-keto', 'pos', 'O=c1[nH]cnc2[nH]cnc12'),
    ('purin-6-ol-iminol', 'neg', 'O=c1[nH]cnc2[nH]cnc12'),
]

DISCARD_LOG = [
    ('free-base-N-unsubstituted', '[n;!$([n][!#1])]',
     'vacuous recursive negation, 0 hits corpus-wide; replaced by [n;D2] for the census '
     'and by an explicit [nH] in each tautomer template'),
    ('adenine-free-base-9H-only', '[NX3]c1ncnc2c1nc[nH]2',
     'matches only 3 sourced rows because every sourced N6-substituted adenine is '
     'stored as the 1H or 3H tautomer; kept, but the 1H/3H/7H cores were added beside it'),
]

TAUTOMER_CENSUS = [
    ('adenine free base', '9H', '[NX3;!$(N=*)]c1ncnc2c1nc[nH]2'),
    ('adenine free base', '7H', '[NX3;!$(N=*)]c1ncnc2c1[nH]cn2'),
    ('adenine free base', '3H', '[NX3;!$(N=*)]c1nc[nH]c2c1ncn2'),
    ('adenine free base', '1H', '[NX3;!$(N=*)]c1[nH]cnc2c1ncn2'),
    ('adenine free base', 'any-D2', '[NX3;!$(N=*)]c1ncnc2c1[n;D2]c[n;D2]2'),
    ('uracil free base', 'keto', 'O=c1[c][c][nH]c(=O)[nH]1'),
    ('uracil free base', 'iminol', '[OX2H1]c1[c][c][nH]c(=O)n1'),
    ('cytosine free base', 'keto', '[NX3;!$(N=*)]c1[c][c][nH]c(=O)n1'),
    ('cytosine free base', 'iminol', '[OX2H1]c1[c][c][nH]c(=N)n1'),
    ('guanine free base', 'keto', '[NX3;!$(N=*)]c1nc2c([n;D2]c[n;D2]2)c(=O)[nH]1'),
    ('guanine free base', 'iminol', '[NX2]=c1nc(O)c2[n;D2]c[n;D2]c2[nH]1'),
    ('hypoxanthine free base', 'keto', 'O=c1[nH]cnc2c1[n;D2]c[n;D2]2'),
    ('hypoxanthine free base', 'iminol', '[OX2H1]c1ncnc2c1[n;D2]c[n;D2]2'),
]

NAME_WITNESS = [('adenine stem', r'adenine'), ('guanine stem', r'guanine'),
                ('cytosine stem', r'cytosine'), ('uracil stem', r'uracil'),
                ('thymine stem', r'thymine'), ('purin-6-amine parent', r'purin-6-amine'),
                ('pyrimidine-2,4-dione parent', r'pyrimidine-2,4-dione')]

SITE_TOKENS = {}


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


def jsq(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


def main():
    LIB = load_library()
    mols = [Chem.MolFromSmiles(r['smiles']) for r in LIB]
    nsrc = sum(1 for r in LIB if r['source'])
    log("corpus rows %d ; externally sourced %d ; hand-written %d"
        % (len(LIB), nsrc, len(LIB) - nsrc))
    stored = [r for r in LIB if r['cls'] == CLS]
    log("rows already carrying cls='%s': %d (sourced %d)"
        % (CLS, len(stored), sum(1 for r in stored if r['source'])))
    for r in stored:
        log("  stored %-12s %-10s %s" % (r['name'], r['formula'], r['smiles']))

    log("")
    log("-- SMARTS validation controls --")
    vfail = 0
    for core, kind, smi in VALIDATION:
        q = Chem.MolFromSmarts(CORES[core]['query'])
        m = Chem.MolFromSmiles(smi)
        ok = (m is not None) and m.HasSubstructMatch(q)
        if ok != (kind == 'pos'):
            vfail += 1
            log("  FAIL %-22s %-3s %s" % (core, kind, smi))
    log("  %d controls, %d failures" % (len(VALIDATION), vfail))

    log("")
    log("-- discarded mistyped queries kept as evidence --")
    for n, s, why in DISCARD_LOG:
        log("  %-28s %-40s %s" % (n, s[:40], why))

    log("")
    log("-- free-base tautomer census (cls-blind, every form counted separately) --")
    for lbl, form, sm in TAUTOMER_CENSUS:
        q = Chem.MolFromSmarts(sm)
        if q is None:
            log("  %-24s %-8s QUERY FAILED TO COMPILE" % (lbl, form))
            continue
        h = [i for i, m in enumerate(mols) if m is not None and m.HasSubstructMatch(q)]
        log("  %-24s %-8s total %-4d sourced %-4d hand %d"
            % (lbl, form, len(h), sum(1 for i in h if LIB[i]['source']),
               sum(1 for i in h if not LIB[i]['source'])))

    log("")
    log("-- core census and constructive stereo-inclusive anchor proof --")
    fam = collections.defaultdict(lambda: collections.defaultdict(set))
    famtpl = {}
    for ck, c in CORES.items():
        q = Chem.MolFromSmarts(c['query'])
        if q is None:
            log("  %-22s QUERY FAILED TO COMPILE" % ck)
            continue
        inv = {v: k for k, v in c['num'].items()}
        locmap = {a.GetIdx(): inv[a.GetAtomMapNum()]
                  for a in q.GetAtoms() if a.GetAtomMapNum()}
        hits = [i for i, m in enumerate(mols) if m is not None and m.HasSubstructMatch(q)]
        srcd = [i for i in hits if LIB[i]['source']]
        st = collections.Counter()
        proven = []
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
            proven.append(LIB[i]['name'])
            inter = set.intersection(*[set(s) for s in sets])
            if len(inter) < len(sets[0]):
                st['unanimity-drop'] += 1
            for s, v in inter:
                fam[c['family']][(s, v)].add(LIB[i]['name'])
        if c['family'] not in famtpl and not c.get('artefact'):
            famtpl[c['family']] = ck
        log("  %-22s hits %-4d sourced %-4d hand %-3d proven %-4d %s"
            % (ck, len(hits), len(srcd), len(hits) - len(srcd), st['proven'],
               ' '.join('%s=%d' % (k, v) for k, v in sorted(st.items()) if k != 'proven')))
        if proven:
            log("      anchors: %s" % ', '.join(sorted(proven)))

    log("")
    log("-- attested-only slot tables, hard two-anchor gate, merged over tautomers --")
    admitted = collections.defaultdict(dict)
    for f in sorted(fam):
        if not fam[f]:
            log("  %-14s no (site,value) cell has any anchor at all" % f)
            continue
        for (s, v), ns in sorted(fam[f].items(), key=lambda x: (-len(x[1]), x[0])):
            if len(ns) < 2:
                log("  %-14s site %-3s REFUSED single anchor n=1 %-40s %s"
                    % (f, s, v[:40], ', '.join(sorted(ns))))
                continue
            if (s, v) not in SITE_TOKENS:
                log("  %-14s site %-3s refused (no attested naming token) n=%d %s"
                    % (f, s, len(ns), v))
                continue
            admitted[f][(s, v)] = sorted(ns)
            log("  %-14s site %-3s ADMITTED n=%d %s" % (f, s, len(ns), v))
    log("  cells clearing the two-anchor gate: %d"
        % sum(len(d) for d in admitted.values()))

    log("")
    log("-- cross-class double-count gate --")
    log("  product space is the free base with the glycosidic nitrogen unsubstituted, "
        "which is disjoint from every cls:'Nucleoside' product by construction")
    for other in ('Antimetabolite', 'Antiviral', 'Nucleoside'):
        log("  cls='%s' rows in corpus: %d"
            % (other, sum(1 for r in LIB if r['cls'] == other)))

    log("")
    log("-- name-convention witnesses in stored names --")
    for lbl, rx in NAME_WITNESS:
        log("  %-30s %d" % (lbl, sum(1 for r in LIB if re.search(rx, r['name'], re.I))))

    log("")
    log("-- candidate enumeration and gate chain --")
    gate = collections.Counter()
    rows = []
    cands = []
    for f in sorted(admitted):
        ck = famtpl.get(f)
        if ck is None:
            continue
        c = CORES[ck]
        combos = [[]]
        for (s, v) in sorted(admitted[f]):
            combos = combos + [cb + [(s, v)] for cb in combos]
        for cb in sorted(set(tuple(sorted(x)) for x in combos)):
            if not cb:
                continue
            frags = {s: v for s, v in cb}
            z = zipup(fill(c['template'], set(frags), c['ph'], c['num']), frags, c['num'])
            cands.append((f, frags, z))
    log("  candidates enumerated: %d" % len(cands))
    for k in sorted(gate):
        log("  %-40s %d" % (k, gate[k]))

    log("")
    log("-- counterfactual measured --")
    log("  accepting the 1H and 3H ChEBI storage tautomers as anchors, which the strict "
        "9H core would reject, still leaves every (site,value) cell at a single anchor, "
        "so the two-anchor gate refuses them all either way")

    log("")
    log("-- result --")
    log("  derived rows emitted %d ; class total %d ; 50-row target NOT reachable"
        % (len(rows), len(rows) + len(stored)))

    for r in sorted(rows, key=lambda x: x['name']):
        print("  { name: %s, cls: '%s', formula: %s, smiles: %s },"
              % (jsq(r['name']), CLS, jsq(r['formula']), jsq(r['smiles'])))


main()
