#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""derive-flavonoid-references.py -- template-anchored derivation of `cls: 'Flavonoid'`
reference rows for the Molecule Profiler library.

Run as:  python3 -P derive-flavonoid-references.py <rows-out.js>
(`-P`/`-I` is mandatory: a stale enum.py in the scratchpad shadows the stdlib.)

====================================================================
1. METHOD
====================================================================
Flavonoid is a SUPERCLASS.  Each distinct scaffold is handled as its own
hard-coded (template, name-stem) constant pair.  Templates are SMILES strings
with brace-delimited substituent slots; ring-closure digits are %10/%11/%12 so
that an inserted fragment's own digits (1,2,3...) can never collide.

A (site, value) pair may be used ONLY if it is PROVEN by externally sourced
library rows (rows carrying a `source` object: ChEBI / DrugCentral / PubChem).
Hand-written rows are never anchors.  Proof procedure, per candidate anchor row:

  (i)   the row's molecule is matched against the core's query scaffold
        (exactly one match required);
  (ii)  every atom hanging off the matched core is cut out as a rooted
        fragment SMILES (the row's "non-core remainder");
  (iii) each fragment is transcribed into the TEMPLATE at the locant the match
        asserts, and the filled template is parsed;
  (iv)  stereo-inclusive Chem.MolToSmiles of the filled template must equal
        Chem.MolToSmiles of the row's stored SMILES.

Only rows that pass (iv) are anchors.  A wrong locant map cannot pass (iv),
so (iv) is what proves the locant maps printed in section 2.

TWO-ANCHOR GATE (rule b): a (site, value) pair enters a slot table only if
>= 2 distinct proven external anchor rows carry that value at that exact
position on that core.  One anchor => site/value REFUSED, refusal recorded
with its anchor count.  Slot tables are attested-only (rule d): a value is
never carried across sites or across cores, even when chemically identical.

====================================================================
2. CORES COVERED, LOCANT MAPS, SCAFFOLD SEPARATION
====================================================================
flavone     2-phenyl-4H-chromen-4-one.  A-ring C5,C6,C7,C8; C-ring C2 (= B-ring
            ipso, not a slot), C3; B-ring 2',3',4',5',6'.
            C3 = 'O' (hydroxy) is DELIBERATELY EXCLUDED from this core's slot
            table: 3-hydroxyflavone is the flavonol core, which has its own
            template.  This keeps the two scaffolds' product spaces disjoint.
flavonol    3-hydroxy-2-phenyl-4H-chromen-4-one.  Same locant map as flavone;
            C3 is hard-locked to OH in the template and the 3-hydroxy prefix is
            always emitted in the name.  Slots: A-ring C5-C8, B-ring 2'-6'.
isoflavone  3-phenyl-4H-chromen-4-one.  B-ring is on C3, NOT on C2 -- the
            template, the query and the slot tables are wholly separate from
            flavone's.  Slots: C2, A-ring C5-C8, B-ring 2'-6'.
flavanone   2,3-dihydro-2-phenyl-4H-chromen-4-one.  C2 is a stereocentre; the
            generation template leaves it UNSPECIFIED.  Anchors are proven
            against three stereo variants of the same template (C2 unspecified,
            2S, 2R); all three variants attest the same locants, so anchors
            from any variant count toward the two-anchor gate for the core.
            Slots: C3, A-ring C5-C8, B-ring 2'-6'.
aurone      (2Z/2E unspecified) 2-benzylidene-1-benzofuran-3(2H)-one.  Ring
            numbering O1, C2, C3(=O), C3a, C4, C5, C6, C7, C7a; A-ring slots
            C4,C5,C6,C7; B-ring 2'-6'; the exocyclic methylidene carbon is a
            slot ("Ca") that found 0 anchors and is refused.
chalcone    (E)-1,3-diphenylprop-2-en-1-one.  The PRIMED ring is the one on the
            carbonyl carbon C1 (slots 2',3',4',5',6'); the UNPRIMED ring is on
            the beta carbon C3 (slots 2,3,4,5,6).  The template fixes (E).
flavan3ol   2-phenyl-3,4-dihydro-2H-chromen-3-ol.  REFUSED as a generation core
            -- see section 5.

B-RING REFLECTION.  C1' is the attachment, so the only residual freedom in the
B ring is the reflection 2'<->6', 3'<->5', 4'->4'.  Reflected patterns are the
SAME molecule, so every generated B-ring pattern is first put into its
lowest-locant reflection (IUPAC rule; ties broken in favour of the
alphabetically first prefix).  Chalcone's two rings are each canonicalised this
way.  Consequently the generator only ever needs locants it has attested.

====================================================================
3. GLYCOSIDE DECISION (rule e)
====================================================================
GLYCOSIDES ARE DECLARED OUT OF TRANSCRIPTION SCOPE.  No sugar, no sugar
fragment and no other multi-stereocentre fragment is ever placed in a generated
row: asserting a pyranose's four stereocentres from a transcription is not
something this script can honestly do.  Glycoside rows ARE still used as site
anchors -- their sugar fragment is carried verbatim, exactly as cut from that
same row, solely to make the anchor's identity proof (step iv) close.  So a
glucoside proves "C7 bears a substituent"; it never licenses a generated
glucoside.

SUBSTITUENT ATTACHMENT-ATOM SCOPE.  The generation vocabulary is restricted to
single-attachment, stereocentre-free fragments of <= 6 heavy atoms, each with
an unambiguous IUPAC prefix:
    O            hydroxy                  OC           methoxy
    C            methyl                   OC(C)=O      acetyloxy
    CO           hydroxymethyl            C=O          formyl
    Cl           chloro                   OS(=O)(=O)O  sulfooxy
    CC=C(C)C     (3-methylbut-2-en-1-yl)  C(C)(C)C=C   (2-methylbut-3-en-2-yl)
A fragment that is fused back into the core (ring-closing onto a second core
atom, e.g. a pyrano- or furano-flavone, a biflavonoid link) is detected and the
whole row is dropped as an anchor rather than mis-transcribed.

====================================================================
4. GATES (rule g), all run against the live library
====================================================================
parse            every generated SMILES must parse under RDKit.
formula          expected formula is composed DIFFERENTIALLY -- hard-coded
                 parent-hydride formula (flavone C15H10O2, flavonol C15H10O3,
                 isoflavone C15H10O2, flavanone C15H12O2, aurone C15H10O2,
                 chalcone C15H12O) minus one H per substitution plus each
                 fragment's own composition -- and must equal
                 rdMolDescriptors.CalcMolFormula of the assembled molecule.
dup-name-lib     exact, case-sensitive match against any library `name`.
dup-name-self    match against an already-emitted generated name.
dup-struct-lib   canonical SMILES after Chem.RemoveStereochemistry must not
                 equal that of any library row (this is the gate that stops a
                 generated systematic name from denoting a compound the library
                 already stores under a trivial name).
dup-struct-self  same, against already-emitted generated rows.
null             slot/name construction produced nothing usable.
Every skip is counted and reported by reason.

====================================================================
5. REFUSALS
====================================================================
Per-core and per-site refusals, with anchor counts, are printed by this script
under "REFUSED SITES" and "REFUSED CORES" (they are measured, not asserted
here, so that the numbers in this docstring can never drift from the library).
Standing refusals that are decisions rather than measurements:
  * flavan3ol -- REFUSED as a generation core.  Every proven anchor is
    stereo-defined at C2/C3 and the only attested value anywhere on the core is
    'O' (hydroxy) at C5, C7, 3', 4', 5'.  The attested space is therefore the
    handful of compounds the library already stores (catechin, epicatechin,
    afzelechin, gallocatechin, fisetinidol, robinetinidol...), so after the
    structure-collision gate it yields nothing new without inventing
    stereochemistry.  Censused and reported, not generated.
  * aurone Ca (exocyclic methylidene carbon) -- 0 anchors.
  * isoflavone C2 -- see measured refusal list.
  * flavone C3 = hydroxy -- excluded by scaffold separation, not by anchors
    (it has 51 anchors); it belongs to the flavonol core.
"""

import json, sys, itertools, collections, re
from rdkit import Chem
from rdkit.Chem import rdMolDescriptors as rdm
from rdkit import RDLogger
RDLogger.DisableLog('rdApp.*')

HERE = "/tmp/claude-0/-home-user-projects/a6d12805-aecf-5923-b265-93c142f30be4/scratchpad/flav/"
LIBJSON = HERE + "library.json"
TARGET_TOTAL = 50

# --------------------------------------------------------------------------
# core constants: (template, query scaffold, query-atom-index -> locant,
#                  slot-name -> template placeholder, A sites, B sites, C sites)
# --------------------------------------------------------------------------
BRING = ["2'", "3'", "4'", "5'", "6'"]

CORES = {}

CORES['flavone'] = dict(
    template="O=c%10c{3}c(-c%11c{2'}c{3'}c{4'}c{5'}c{6'}%11)oc%12c{8}c{7}c{6}c{5}c%10%12",
    query="O=c1cc(-c2ccccc2)oc2ccccc12",
    locmap={1:'4',2:'3',3:'2',4:"1'",5:"2'",6:"3'",7:"4'",8:"5'",9:"6'",
            10:'O1',11:'8a',12:'8',13:'7',14:'6',15:'5',16:'4a'},
    sites=['3','5','6','7','8']+BRING,
    asites=['5','6','7','8'], bsites=BRING, csites=['3'],
    stem='flavone', parent='C15H10O2', fixed={}, stereo=[{}],
    exclude=[('3','O')],
)
CORES['flavonol'] = dict(
    template="O=c%10c(O)c(-c%11c{2'}c{3'}c{4'}c{5'}c{6'}%11)oc%12c{8}c{7}c{6}c{5}c%10%12",
    query="O=c1c(O)c(-c2ccccc2)oc2ccccc12",
    locmap={1:'4',2:'3',3:'O3',4:'2',5:"1'",6:"2'",7:"3'",8:"4'",9:"5'",10:"6'",
            11:'O1',12:'8a',13:'8',14:'7',15:'6',16:'5',17:'4a'},
    sites=['5','6','7','8']+BRING,
    asites=['5','6','7','8'], bsites=BRING, csites=[],
    stem='flavone', parent='C15H10O3', fixed={'3':'O'}, parent_has_fixed=True, stereo=[{}],
    exclude=[],
)
CORES['isoflavone'] = dict(
    template="O=c%10c(-c%11c{2'}c{3'}c{4'}c{5'}c{6'}%11)c{2}oc%12c{8}c{7}c{6}c{5}c%10%12",
    query="O=c1c(-c2ccccc2)coc2ccccc12",
    locmap={1:'4',2:'3',3:"1'",4:"2'",5:"3'",6:"4'",7:"5'",8:"6'",
            9:'2',10:'O1',11:'8a',12:'8',13:'7',14:'6',15:'5',16:'4a'},
    sites=['2','5','6','7','8']+BRING,
    asites=['5','6','7','8'], bsites=BRING, csites=['2'],
    stem='isoflavone', parent='C15H10O2', fixed={}, stereo=[{}],
    exclude=[],
)
CORES['flavanone'] = dict(
    template="O=C%10[C{T3}]{3}[C{T2}](c%11c{2'}c{3'}c{4'}c{5'}c{6'}%11)Oc%12c{8}c{7}c{6}c{5}c%12%10",
    query="O=C1CC(c2ccccc2)Oc2ccccc21",
    locmap={1:'4',2:'3',3:'2',4:"1'",5:"2'",6:"3'",7:"4'",8:"5'",9:"6'",
            10:'O1',11:'8a',12:'8',13:'7',14:'6',15:'5',16:'4a'},
    sites=['3','5','6','7','8']+BRING,
    asites=['5','6','7','8'], bsites=BRING, csites=['3'],
    stem='flavanone', parent='C15H12O2', fixed={},
    stereo=[{'T2':a,'T3':b} for a in ('','@H','@@H') for b in ('','@H','@@H')],
    stereo_requires={'T3':'3'},
    exclude=[],
)
CORES['aurone'] = dict(
    template="O=C%10C(=C{Ca}{Db}c%11c{2'}c{3'}c{4'}c{5'}c{6'}%11){Dc}Oc%12c{7}c{6}c{5}c{4}c%12%10",
    query="O=C1C(=Cc2ccccc2)Oc2ccccc21",
    locmap={1:'3',2:'2',3:'Ca',4:"1'",5:"2'",6:"3'",7:"4'",8:"5'",9:"6'",
            10:'O1',11:'7a',12:'7',13:'6',14:'5',15:'4',16:'3a'},
    sites=['4','5','6','7','Ca']+BRING,
    asites=['4','5','6','7'], bsites=BRING, csites=['Ca'],
    stem='aurone', parent='C15H10O2', fixed={},
    stereo=[{'Db':a,'Dc':b} for a in ('','/','\\') for b in ('','/','\\')],
    exclude=[],
)
CORES['chalcone'] = dict(
    template="O=C(/C=C/c%11c{2}c{3}c{4}c{5}c{6}%11)c%12c{2'}c{3'}c{4'}c{5'}c{6'}%12",
    query="O=C(C=Cc1ccccc1)c1ccccc1",
    locmap={0:'Ok',1:'1',2:'2a',3:'3b',4:'1u',5:'2',6:'3',7:'4',8:'5',9:'6',
            10:"1'",11:"2'",12:"3'",13:"4'",14:"5'",15:"6'"},
    sites=['2','3','4','5','6']+BRING,
    asites=["2'","3'","4'","5'","6'"], bsites=['2','3','4','5','6'], csites=[],
    arefl=True,
    stem='chalcone', parent='C15H12O', fixed={}, stereo=[{}],
    exclude=[],
)
CORES['flavan3ol'] = dict(   # censused only; refused as a generation core
    template=None,
    query="OC1Cc2ccccc2OC1c1ccccc1",
    locmap={0:'O3',1:'3',2:'4',3:'4a',4:'5',5:'6',6:'7',7:'8',8:'8a',
            9:'O1',10:'2',11:"1'",12:"2'",13:"3'",14:"4'",15:"5'",16:"6'"},
    sites=['5','6','7','8']+BRING,
    asites=['5','6','7','8'], bsites=BRING, csites=[],
    stem='flavan-3-ol', parent='C15H14O2', fixed={}, stereo=[{}],
    exclude=[],
)

# substituent vocabulary allowed in GENERATED rows
PREFIX = {
    'O':             ('hydroxy',                 'hydroxy',        False),
    'OC':            ('methoxy',                 'methoxy',        False),
    'C':             ('methyl',                  'methyl',         False),
    'OC(C)=O':       ('acetyloxy',               'acetyloxy',      False),
    'CO':            ('hydroxymethyl',           'hydroxymethyl',  False),
    'C=O':           ('formyl',                  'formyl',         False),
    'Cl':            ('chloro',                  'chloro',         False),
    'OS(=O)(=O)O':   ('sulfooxy',                'sulfooxy',       False),
    'CC=C(C)C':      ('(3-methylbut-2-en-1-yl)', 'methylbut2en1yl',True),
    'C(C)(C)C=C':    ('(2-methylbut-3-en-2-yl)', 'methylbut3en2yl',True),
}
MULT_SIMPLE = {2:'di', 3:'tri', 4:'tetra', 5:'penta', 6:'hexa'}
MULT_COMPLEX = {2:'bis', 3:'tris', 4:'tetrakis'}
RANK = {'O':0,'OC':1,'C':2,'CC=C(C)C':3,'OC(C)=O':4,'CO':5,'C=O':6,'Cl':7,
        'OS(=O)(=O)O':8,'C(C)(C)C=C':9}

REFL = {"2'":"6'","3'":"5'","4'":"4'","5'":"3'","6'":"2'"}
REFL_CHAL = {'2':'6','3':'5','4':'4','5':'3','6':'2'}

# --------------------------------------------------------------------------
def log(*a): print(*a, file=sys.stderr)

def canon(smi):
    m = Chem.MolFromSmiles(smi)
    return (None, None) if m is None else (Chem.MolToSmiles(m), m)

def fill(tpl, slots, stereo=None, requires=None):
    out = tpl
    requires = requires or {}
    if stereo is not None and requires:
        stereo = dict(stereo)
        for tag, need in requires.items():
            if tag in stereo and not slots.get(need):
                stereo[tag] = ''
    ph = set(re.findall(r'\{([^}]*)\}', tpl))
    for k in ph:
        if stereo is not None and k in stereo:
            out = out.replace('{%s}' % k, stereo[k]); continue
        v = slots.get(k)
        out = out.replace('{%s}' % k, '(%s)' % v if v else '')
    # a bracket atom with no stereo tag must lose its brackets to keep its H
    out = out.replace('[C]', 'C')
    return out

def cut_fragments(mol, core_idx, match, locmap):
    """row -> {locant: rooted-fragment-SMILES} or None if un-transcribable."""
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
        return None                      # fused back into the core
    root = next((a.GetIdx() for a in fm.GetAtoms() if a.GetAtomicNum() == 0), None)
    if root is None:
        return None
    try:
        s = Chem.MolToSmiles(fm, rootedAtAtom=root, canonical=True, isomericSmiles=True)
    except Exception:
        return None
    return s[1:] if s.startswith('*') else None

# ------------------------- formula arithmetic ------------------------------
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
    if val in FRAGCOMP:
        return FRAGCOMP[val]
    m = Chem.MolFromSmiles('*' + val)
    d = collections.Counter()
    for a in m.GetAtoms():
        if a.GetAtomicNum() == 0:
            continue
        d[a.GetSymbol()] += 1
        d['H'] += a.GetTotalNumHs()
    FRAGCOMP[val] = d
    return d

# --------------------------- naming ---------------------------------------
def loc_key(l):
    return (1 if l.endswith("'") else 0, int(l.rstrip("'")))

def canon_bring(pat, refl):
    """lowest-locant reflection of a ring substitution pattern."""
    alt = {refl[k]: v for k, v in pat.items()}
    def key(p):
        ls = sorted((loc_key(l) for l in p), key=lambda t: t)
        first = min(((PREFIX[v][1], loc_key(l)) for l, v in p.items()), default=None)
        return (ls, first)
    return min((pat, alt), key=key)

def build_name(core, slots):
    c = CORES[core]
    full = dict(slots)
    for l, v in c['fixed'].items():
        full[l] = v
    groups = collections.defaultdict(list)
    for l, v in full.items():
        groups[v].append(l)
    items = []
    for v, locs in groups.items():
        name, akey, complexp = PREFIX[v]
        locs = sorted(locs, key=loc_key)
        n = len(locs)
        if n == 1:
            mult = ''
        else:
            mult = (MULT_COMPLEX if complexp else MULT_SIMPLE).get(n)
            if mult is None:
                return None
        items.append((akey, ','.join(locs) + '-' + mult + name))
    if not items:
        return None
    items.sort()
    pre = '-'.join(s for _, s in items)
    stem = c['stem']
    if core == 'chalcone':
        return '(E)-' + pre + stem
    return pre + stem

# ===========================  PHASE 1: census + proof  =====================
LIB = json.load(open(LIBJSON))
libmols, libcanon, libstrip, libnames = [], set(), set(), set()
for r in LIB:
    m = Chem.MolFromSmiles(r['smiles'])
    libmols.append(m)
    libnames.add(r['name'])
    if m is not None:
        libcanon.add(Chem.MolToSmiles(m))
        m2 = Chem.Mol(m)
        Chem.RemoveStereochemistry(m2)
        libstrip.add(Chem.MolToSmiles(m2))

inclass = sum(1 for r in LIB if r.get('cls') == 'Flavonoid')
log("=" * 74)
log("IN-CLASS COUNT  cls == 'Flavonoid' : %d   (target %d)" % (inclass, TARGET_TOTAL))
log("library rows loaded: %d" % len(LIB))
log("=" * 74)

queries = {k: Chem.MolFromSmiles(v['query']) for k, v in CORES.items()}
for k, q in queries.items():
    assert q is not None, k

anchors = collections.defaultdict(lambda: collections.defaultdict(list))  # core->(site,val)->names
corestat = collections.defaultdict(lambda: collections.Counter())
proofs = collections.defaultdict(dict)   # core -> (site,val) -> (name, smiles, filled)

for i, r in enumerate(LIB):
    mol = libmols[i]
    if mol is None:
        continue
    ext = 'source' in r
    for core, c in CORES.items():
        ms = mol.GetSubstructMatches(queries[core], uniquify=True)
        if not ms:
            continue
        corestat[core]['hit'] += 1
        corestat[core]['ext' if ext else 'int'] += 1
        if not ext:
            continue
        if len(ms) > 1:
            corestat[core]['multimatch'] += 1
            continue
        frags = cut_fragments(mol, None, ms[0], c['locmap'])
        if frags is None:
            corestat[core]['uncuttable'] += 1
            continue
        if any(l not in c['sites'] for l in frags):
            corestat[core]['offsite'] += 1
            continue
        if c['template'] is None:
            corestat[core]['censused_only'] += 1
            for l, v in frags.items():
                anchors[core][(l, v)].append(r['name'])
            continue
        want = Chem.MolToSmiles(mol)
        hit = None
        for st in c['stereo']:
            s = fill(c['template'], frags, st, c.get('stereo_requires'))
            cs, mm = canon(s)
            if cs is not None and cs == want:
                hit = (s, st)
                break
        if hit is None:
            corestat[core]['proof_failed'] += 1
            continue
        corestat[core]['proven'] += 1
        for l, v in frags.items():
            anchors[core][(l, v)].append(r['name'])
            proofs[core].setdefault((l, v), (r['name'], r['smiles'], hit[0]))

log("")
log("CORE CENSUS  (substructure over the WHOLE library, any cls)")
log("%-11s %6s %6s %5s  %7s %9s %9s %7s %7s" %
    ('core', 'hits', 'extern', 'int', 'proven', 'prooffail', 'multimtch', 'uncut', 'offsite'))
for core in CORES:
    s = corestat[core]
    log("%-11s %6d %6d %5d  %7d %9d %9d %7d %7d" %
        (core, s['hit'], s['ext'], s['int'], s['proven'], s['proof_failed'],
         s['multimatch'], s['uncuttable'], s['offsite']))

# ---- two-anchor gate -> slot tables --------------------------------------
slots = collections.defaultdict(lambda: collections.defaultdict(list))
refused_sites = []
log("")
log("PROVEN (site, value) PAIRS AND THE TWO-ANCHOR GATE")
log("  [generation vocabulary only; sugar/large fragments are anchors but never values]")
for core in CORES:
    c = CORES[core]
    log("")
    log("  --- %s ---" % core)
    for (site, val), names in sorted(anchors[core].items(),
                                     key=lambda kv: (loc_key(kv[0][0]) if kv[0][0] not in ('Ca',) else (9, 9),
                                                     RANK.get(kv[0][1], 99), kv[0][1])):
        if val not in PREFIX:
            continue
        n = len(set(names))
        if (site, val) in c['exclude']:
            refused_sites.append((core, site, val, n, 'scaffold-separation (belongs to flavonol core)'))
            log("    %-4s %-24s anchors=%-3d EXCLUDED scaffold-separation" % (site, PREFIX[val][0], n))
            continue
        if n < 2:
            refused_sites.append((core, site, val, n, 'two-anchor gate'))
            log("    %-4s %-24s anchors=%-3d REFUSED two-anchor-gate" % (site, PREFIX[val][0], n))
            continue
        if c['template'] is None:
            refused_sites.append((core, site, val, n, 'core refused for generation'))
            continue
        slots[core][site].append(val)
        pn, psmi, pfill = proofs[core][(site, val)]
        log("    %-4s %-24s anchors=%-3d PASS  proof anchor: %s" % (site, PREFIX[val][0], n, pn))
        log("         template -> %s" % pfill)
        log("         canonical identity: %s" % (Chem.MolToSmiles(Chem.MolFromSmiles(pfill))
                                                 == Chem.MolToSmiles(Chem.MolFromSmiles(psmi))))

# sites with zero usable values
log("")
log("REFUSED SITES (no admissible value after the two-anchor gate)")
for core in CORES:
    for site in CORES[core]['sites']:
        if not slots[core].get(site):
            n = sum(len(set(v)) for (s, _), v in anchors[core].items() if s == site)
            log("    %-11s %-4s  total anchors at site = %d" % (core, site, n))
            refused_sites.append((core, site, '*', n, 'no admissible value'))

log("")
log("REFUSED CORES")
log("    flavan3ol   proven anchors=%d; only value attested anywhere on the core is"
    % corestat['flavan3ol']['censused_only'])
log("                hydroxy, every anchor is stereo-defined at C2/C3, and the attested")
log("                product space is already in the library -> refused for generation.")

log("")
log("SLOT TABLES (attested-only, per core, per site)")
for core in CORES:
    if not slots[core]:
        continue
    log("  %s:" % core)
    for site in CORES[core]['sites']:
        if slots[core].get(site):
            log("    %-4s %s" % (site, ', '.join(PREFIX[v][0] for v in
                                 sorted(slots[core][site], key=lambda v: RANK.get(v, 99)))))

# ===========================  PHASE 2: generate  ===========================
TARGET_NEW = TARGET_TOTAL - inclass
MULTISET_CAP = 5          # at most N rows per core per multiset of substituent values
SOFT_CAP = {'flavone': 14, 'flavonol': 10, 'flavanone': 10,
            'isoflavone': 9, 'chalcone': 7, 'aurone': 3}

def subsets(core, sites, maxn):
    """all attested substitution patterns over `sites` with 0..maxn substituents"""
    out = [{}]
    pool = [(s, v) for s in sites for v in slots[core].get(s, [])]
    for n in range(1, maxn + 1):
        for combo in itertools.combinations(pool, n):
            if len({s for s, _ in combo}) != n:
                continue
            out.append(dict(combo))
    return out

def candidates(core):
    c = CORES[core]
    bref = REFL_CHAL if core == 'chalcone' else REFL
    pats, seen = [], set()
    for a in subsets(core, c['asites'], 3):
        a = canon_bring(a, REFL) if (a and c.get('arefl')) else a
        for b in subsets(core, c['bsites'], 3):
            b = canon_bring(b, bref) if b else b
            for cc in subsets(core, c['csites'], 1):
                full = {}
                full.update(a); full.update(b); full.update(cc)
                if not (2 <= len(full) <= 5):
                    continue
                key = tuple(sorted(full.items()))
                if key in seen:
                    continue
                seen.add(key)
                pats.append(full)
    pats.sort(key=lambda p: (len(p),
                             sorted(RANK.get(v, 99) for v in p.values()),
                             sorted(loc_key(l) for l in p),
                             sorted(p.items())))
    return pats

skips = collections.Counter()
emitted = []
gen_names, gen_strip = set(), set()
mscount = collections.Counter()
percore = collections.Counter()
formula_skips = []

def try_emit(core, p):
    """run every gate on one candidate; return True if it became a row."""
    c = CORES[core]
    name = build_name(core, p)
    if name is None:
        skips['null'] += 1; return False
    smi = fill(c['template'], p, c['stereo'][0], c.get('stereo_requires'))
    m = Chem.MolFromSmiles(smi)
    if m is None:
        skips['parse'] += 1; return False
    cs = Chem.MolToSmiles(m)
    d = parse_formula(c['parent'])
    if c.get('parent_has_fixed'):
        nsub, allsub = len(p), list(p.values())
    else:
        nsub = len(p) + len(c['fixed'])
        allsub = list(p.values()) + list(c['fixed'].values())
    d['H'] -= nsub
    for v in allsub:
        d.update(fragcomp(v))
    exp, gotf = hill(d), rdm.CalcMolFormula(m)
    if exp != gotf:
        skips['formula'] += 1
        formula_skips.append((name, exp, gotf)); return False
    if name in libnames:
        skips['dup-name-lib'] += 1; return False
    if name in gen_names:
        skips['dup-name-self'] += 1; return False
    m2 = Chem.Mol(m); Chem.RemoveStereochemistry(m2)
    st = Chem.MolToSmiles(m2)
    if st in libstrip:
        skips['dup-struct-lib'] += 1; return False
    if st in gen_strip:
        skips['dup-struct-self'] += 1; return False
    gen_names.add(name); gen_strip.add(st)
    emitted.append(dict(name=name, cls='Flavonoid', formula=gotf, smiles=cs, core=core))
    return True

pools = {}
for core in CORES:
    c = CORES[core]
    if c['template'] is None or not slots[core]:
        continue
    pools[core] = candidates(core)
    log("  %-11s candidate attested patterns: %d" % (core, len(pools[core])))

# round-robin across cores so the class is spread over scaffolds, with a cap on
# how many rows may share one multiset of substituent values (value diversity)
cursor = {k: 0 for k in pools}
order = [k for k in CORES if k in pools]
progress = True
while len(emitted) < TARGET_NEW and progress:
    progress = False
    for core in order:
        if len(emitted) >= TARGET_NEW:
            break
        if percore[core] >= SOFT_CAP.get(core, 0):
            continue
        pl = pools[core]
        i = cursor[core]
        while i < len(pl):
            p = pl[i]; i += 1
            ms = (core,) + tuple(sorted(p.values()))
            if mscount[ms] >= MULTISET_CAP:
                continue
            if try_emit(core, p):
                mscount[ms] += 1
                percore[core] += 1
                progress = True
                break
        cursor[core] = i
# if the soft caps were the only thing left in the way, lift them and continue
if len(emitted) < TARGET_NEW:
    log("  soft caps lifted to chase the target")
    progress = True
    while len(emitted) < TARGET_NEW and progress:
        progress = False
        for core in order:
            if len(emitted) >= TARGET_NEW:
                break
            pl = pools[core]; i = cursor[core]
            while i < len(pl):
                p = pl[i]; i += 1
                ms = (core,) + tuple(sorted(p.values()))
                if mscount[ms] >= MULTISET_CAP:
                    continue
                if try_emit(core, p):
                    mscount[ms] += 1; percore[core] += 1; progress = True
                    break
            cursor[core] = i

log("")
log("ROWS EMITTED PER CORE")
for core in order:
    log("    %-11s %d   (pool %d, cursor %d)" % (core, percore[core], len(pools[core]), cursor[core]))

if formula_skips:
    log("")
    log("FORMULA-GATE SKIPS (%d), first 5:" % len(formula_skips))
    for n, e, g in formula_skips[:5]:
        log("    %s  expected %s  got %s" % (n, e, g))

log("")
log("GATE ACCOUNTING")
for k in ('dup-name-lib', 'dup-name-self', 'dup-struct-lib', 'dup-struct-self',
          'formula', 'parse', 'null'):
    log("    %-16s %d" % (k, skips[k]))
log("    %-16s %d" % ('emitted', len(emitted)))
log("    %-16s %d  (%d pre-existing + %d generated)" %
    ('class total', inclass + len(emitted), inclass, len(emitted)))

# -------------------------------- output ----------------------------------
def jsq(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"

out = sys.argv[1] if len(sys.argv) > 1 else HERE + "rows.js"
with open(out, 'w') as fh:
    for r in emitted:
        fh.write("  { name: %s, cls: 'Flavonoid', formula: %s, smiles: %s },\n"
                 % (jsq(r['name']), jsq(r['formula']), jsq(r['smiles'])))
log("")
log("wrote %d rows -> %s" % (len(emitted), out))
