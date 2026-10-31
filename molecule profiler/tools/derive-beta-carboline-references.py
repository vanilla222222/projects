#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Template-anchored derivation of beta-Carboline reference rows for Molecule Profiler.

Run:  python3 -P derive-beta-carboline-references.py <out-rows.js>
Diagnostics go to stdout; ONLY row literals go to <out-rows.js>.

====================================================================
1. LOCANT MAP  (9H-pyrido[3,4-b]indole, "beta-carboline")
====================================================================
Atom-mapped reference frame used to assign locants during the
substructure census (map number -> locant):

    [cH:1]1[n:2][cH:3][cH:4][c:5]2[c:6]3[cH:7][cH:8][cH:9][cH:10][c:11]3[nH:12][c:13]12
      1->C1  2->N2  3->C3  4->C4  5->C4a  6->C4b  7->C5  8->C6
      9->C7  10->C8 11->C8a 12->N9 13->C9a

Rings:  pyridine  C1-N2-C3-C4-C4a-C9a
        pyrrole   C4a-C4b-C8a-N9-C9a
        benzene   C4b-C5-C6-C7-C8-C8a

FORWARD TEMPLATES (this file). Ring-closure digits 1,2,3 are RESERVED
for the core; substituent fragments start their digits at 4.
Written atom order is C1,N2,C3,C4,C4a,C4b,C5,C6,C7,C8,C8a,N9,C9a.

  aromatic      c1{S1}nc{S3}c{S4}c2c3c{S5}c{S6}c{S7}c{S8}c3{N9}c12
  3,4-dihydro   C1{S1}=NC{S3}C{S4}c2c3c{S5}c{S6}c{S7}c{S8}c3{N9}c12
  tetrahydro    C1{S1}{N2}C{S3}C{S4}c2c3c{S5}c{S6}c{S7}c{S8}c3{N9}c12

Name stems (one per oxidation state; never crossed):
  aromatic    -> 9H-pyrido[3,4-b]indole
  3,4-dihydro -> 4,9-dihydro-3H-pyrido[3,4-b]indole
  tetrahydro  -> 2,3,4,9-tetrahydro-1H-pyrido[3,4-b]indole

====================================================================
2. ANCHOR CENSUS  (substructure search over all 21739 library rows,
   cls ignored; oxidation-state-agnostic generic-bond skeleton query)
====================================================================
101 rows contain the beta-carboline skeleton.  83 of them are
ring-FUSED at core atoms (yohimbane / ajmalan / vincamine / canthinone /
fumitremorgin / reserpine frameworks): their non-core remainder is not
a pendant substituent and cannot be transcribed into a slot, so they
are NOT anchors.  18 rows are pendant-substituted only; of those,
2 are hand-written (Pinoline, Harmine) and therefore INELIGIBLE as
anchors (rule b).  16 externally sourced pendant anchors remain:

  aromatic     harman, annomontine, PS-1145, dichotomide III,
               dichotomide IV, dichotomide V, dichotomide VI,
               manzamine A                                    (8, all ChEBI)
Each of the 16 is proven below except manzamine A, whose C1 fragment is
out of transcription scope; it counts as a C1 *site* anchor only and
contributes no slot value.  Core and fragment chiral tags are searched
over @/@@ during a proof while the connectivity and the locants stay
hand-written, so a wrong locant still cannot pass.
  3,4-dihydro  harmaline, harmalol                            (2, ChEBI)
  tetrahydro   AC-4-248, chloroinconazide, tubulosan,
               tubulosine, alangimarckine, trans-Ned 19        (6, ChEBI)

TWO-ANCHOR GATE PER SITE (>=2 distinct sourced anchors substituted at
that exact locant):

  aromatic   C1  ADMITTED  6 anchors (harman, annomontine, manzamine A,
                                      dichotomide III/IV/V/VI)
             C3  ADMITTED  4 anchors (dichotomide III/IV/V/VI)
             C8  ADMITTED  4 anchors (dichotomide IV/V/VI, PS-1145)
             (C1 is 7 anchors counting manzamine A)
             C6  REFUSED   1 anchor  (PS-1145 only)
             N2,C4,C5,C7,N9  REFUSED  0 anchors
  3,4-dihydro C1 ADMITTED  2 anchors (harmaline, harmalol)
             C7  ADMITTED  2 anchors (harmaline, harmalol)
             all other sites REFUSED  0 anchors
  tetrahydro C1  ADMITTED  5 anchors (chloroinconazide, tubulosan,
                                      tubulosine, alangimarckine,
                                      trans-Ned 19)
             C3  ADMITTED  2 anchors (chloroinconazide, trans-Ned 19)
             C6  ADMITTED  2 anchors (AC-4-248, tubulosine)
             N2  REFUSED   1 anchor  (AC-4-248 only)
             C4,C5,C7,C8,N9  REFUSED  0 anchors

Oxidation states: all three (aromatic, 3,4-dihydro, 1,2,3,4-tetrahydro)
meet the gate at >=1 site.  None refused.

====================================================================
3. SUBSTITUENT ATTACHMENT-ATOM SCOPE
====================================================================
A proven (site,value) pair enters a slot table only if the fragment's
attachment atom is C, N, O or halogen AND the fragment is <= 10 heavy
atoms AND it is expressible as a single standard substituent prefix.
Excluded by scope, with reason (each is still used as a *site* anchor):
  arom C1 : manzamine A macrocyclic fragment          (28 heavy atoms)
  arom C8 : beta-D-glucopyranosyloxy (dichotomide IV) (11 heavy, no prefix form)
  arom C8 : PS-1145 hydroxy(pyridin-3-yl)methylidene-amino (9 heavy,
            non-standard amide tautomer, no safe prefix name)
  TH   C1 : trans-Ned 19 aryl-piperazine fragment     (20 heavy atoms)
  TH   C1 : tubulosan / tubulosine / alangimarckine emetine
            half-fragments                            (13-14 heavy atoms)
  TH   C3 : chloroinconazide acylhydrazone fragment   (11 heavy, tautomer)

====================================================================
4. PROVEN (site, value) PAIRS -- ATTESTED-ONLY SLOT TABLES
====================================================================
Every pair below was proven by stereo-inclusive canonical-SMILES
identity between the hand-transcribed template fill and the library
row's stored SMILES (section 5 prints each proof).  No value is reused
at a site where it was not proven.

  aromatic    C1: methyl                                  <- harman
                  acetyl                                  <- dichotomide III/IV/V/VI
                  (2-imino-2,3-dihydropyrimidin-4-yl)     <- annomontine
              C3: carbamoyl                               <- dichotomide VI
                  [(E)-3-methoxy-3-oxoprop-1-en-1-yl]carbamoyl <- dichotomide III
                  [(Z)-3-methoxy-3-oxoprop-1-en-1-yl]carbamoyl <- dichotomide V
              C8: hydroxy                                 <- dichotomide V, VI
  3,4-dihydro C1: methyl                                  <- harmaline, harmalol
              C7: hydroxy                                 <- harmalol
                  methoxy                                 <- harmaline
  tetrahydro  C1: methyl                                  <- chloroinconazide
              C3: carboxy                                 <- trans-Ned 19
              C6: chloro                                  <- AC-4-248
                  hydroxy                                 <- tubulosine

Cross-site reuse explicitly NOT done (the audited defect):
  methyl is proven at C1 in all three states and nowhere else -> it is
  absent from every C3/C6/C7/C8 table.  hydroxy is proven at arom-C8,
  DH-C7 and TH-C6 independently, by different anchors, and appears only
  in those three tables.  methoxy is proven only at DH-C7 (harmaline);
  the 6-methoxy of Pinoline and Harmine is hand-written, so methoxy is
  NOT admitted at TH-C6 or arom-C6.
  Consequence: no value is attested at two sites of the same state, so
  no IUPAC multiplying prefix (di/tri) is ever reachable; the prefix
  logic in `assemble_name` implements di/tri/tetra and alphabetical
  ordering generally but that branch is unexercised here.

Nomenclature note: substituent-prefix nomenclature is used uniformly,
so the acyl / acid / amide groups appear as the prefixes "acetyl",
"carbamoyl" and "carboxy" rather than in preferred-IUPAC suffix form
("...-1-yl ethanone", "...-3-carboxylic acid", "...-3-carboxamide").
This keeps one unambiguous grammar for the inverse checker.  Prefixes
are ordered alphabetically on the first letter of the complete prefix
name, ignoring enclosing marks, stereo-descriptors and multiplying
prefixes; locant sets are ascending within a prefix.

====================================================================
5. GATE ACCOUNTING (measured -- see the run banner for the live values)
====================================================================
Candidates enumerated   : 47   (aromatic 31, 3,4-dihydro 5, tetrahydro 11)
emitted                 : 32
skipped parse           : 0
skipped null            : 0
skipped formula         : 0
skipped dup-name-lib    : 0
skipped dup-name-self   : 0
skipped dup-struct-lib  : 9    (harman, annomontine, dichotomide III x2,
                                dichotomide V x2, dichotomide VI,
                                harmalol, harmaline)
skipped dup-struct-self : 6    (every (Z)-enamide variant: the C3 (E)- and
                                (Z)-[3-methoxy-3-oxoprop-1-en-1-yl]carbamoyl
                                values are distinct and both attested, but
                                they are identical once the mandated
                                RemoveStereochemistry pass is applied, so
                                the (Z) member of each pair is dropped)

CEILING: 32 generated + 1 already in class (Pinoline) = 33 rows in
cls 'beta-Carboline'.  The 50-row target is NOT reachable from the
attested slot tables.  The binding constraint is attestation, not
combinatorics: only 14 (site,value) pairs are proven across the three
cores (8 admitted sites over 3 cores), and the refused sites (aromatic
C6, tetrahydro N2 -- one anchor each) plus the out-of-scope fragments
are what cap the product.  Even a perfect run with zero collisions
could not exceed 47 + 1 = 48, and the 15 collisions measured against
the live library bring that to 33.
Reaching 50 would require either loosening rule (d) (reusing methyl /
methoxy / hydroxy at unattested sites) or admitting single-anchor
sites; neither was done.
"""

import itertools
import json
import sys
import re
from collections import Counter, defaultdict

from rdkit import Chem
from rdkit.Chem import rdMolDescriptors
from rdkit import RDLogger

RDLogger.DisableLog('rdApp.*')

HERE = '/tmp/claude-0/-home-user-projects/a6d12805-aecf-5923-b265-93c142f30be4/scratchpad/bcarb'
LIB_DUMP = HERE + '/library-dump.json'

# ------------------------------------------------------------------ templates
SLOTS = ['S1', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']
SLOT_OF_LOCANT = {'1': 'S1', '3': 'S3', '4': 'S4', '5': 'S5',
                  '6': 'S6', '7': 'S7', '8': 'S8'}

TEMPLATES = {
    'aromatic':   '{A1}1{S1}nc{S3}c{S4}c2c3c{S5}c{S6}c{S7}c{S8}c3{N9}c12',
    '3,4-dihydro': '{A1}1{S1}=N{A3}{S3}C{S4}c2c3c{S5}c{S6}c{S7}c{S8}c3{N9}c12',
    'tetrahydro': '{A1}1{S1}{N2}{A3}{S3}C{S4}c2c3c{S5}c{S6}c{S7}c{S8}c3{N9}c12',
}
# default atom token at C1 / C3 for each state (no stereo)
A_DEFAULT = {'aromatic': ('c', 'c'), '3,4-dihydro': ('C', 'C'),
             'tetrahydro': ('C', 'C')}
STEM = {
    'aromatic':    '9H-pyrido[3,4-b]indole',
    '3,4-dihydro': '4,9-dihydro-3H-pyrido[3,4-b]indole',
    'tetrahydro':  '2,3,4,9-tetrahydro-1H-pyrido[3,4-b]indole',
}
# core molecular formulas, used for the differential formula cross-check
CORE_FORMULA = {
    'aromatic':    {'C': 11, 'H': 8,  'N': 2},
    '3,4-dihydro': {'C': 11, 'H': 10, 'N': 2},
    'tetrahydro':  {'C': 11, 'H': 12, 'N': 2},
}


def build(state, fills, stereo=None):
    """Fill the template.  `fills` maps locant -> SMILES fragment (bare).
    `stereo` optionally maps 'C1'/'C3' -> '' | '@' | '@@' for anchor proofs."""
    d = {k: '' for k in SLOTS}
    d['N9'] = '[nH]'
    d['N2'] = 'N'
    d['A1'], d['A3'] = A_DEFAULT[state]
    for loc, frag in fills.items():
        if loc == '2':
            d['N2'] = 'N(%s)' % frag
        elif loc == '9':
            d['N9'] = 'n(%s)' % frag
        else:
            d[SLOT_OF_LOCANT[loc]] = '(%s)' % frag
    if stereo:
        for k, v in stereo.items():
            if v:
                d[{'C1': 'A1', 'C3': 'A3'}[k]] = '[C%sH]' % v
    return TEMPLATES[state].format(**d)


def canon(smi):
    m = Chem.MolFromSmiles(smi)
    return Chem.MolToSmiles(m) if m is not None else None


def flat(smi):
    m = Chem.MolFromSmiles(smi)
    if m is None:
        return None
    Chem.RemoveStereochemistry(m)
    return Chem.MolToSmiles(m)


def formula_counts(smi):
    m = Chem.MolFromSmiles(smi)
    f = rdMolDescriptors.CalcMolFormula(m)
    out = Counter()
    for el, n in re.findall(r'([A-Z][a-z]?)(\d*)', f):
        if el:
            out[el] += int(n) if n else 1
    return dict(out), f


def formula_string(counts):
    order = ['C', 'H'] + sorted(k for k in counts if k not in ('C', 'H'))
    return ''.join('%s%s' % (e, counts[e] if counts[e] != 1 else '')
                   for e in order if counts.get(e))


# ------------------------------------------------- anchor proofs (rule c)
# Each entry: (anchor name, provider, state, hand-transcribed fills,
#              core stereo tags, locants asserted-and-thereby-proven)
ANCHORS = [
    ('harman', 'ChEBI', 'aromatic', {'1': 'C'}, False, ['1']),
    ('annomontine', 'ChEBI', 'aromatic', {'1': '-c4cc[nH]c(=N)n4'}, False, ['1']),
    ('dichotomide VI', 'ChEBI', 'aromatic',
     {'1': 'C(C)=O', '3': 'C(N)=O', '8': 'O'}, False, ['1', '3', '8']),
    ('dichotomide III', 'ChEBI', 'aromatic',
     {'1': 'C(C)=O', '3': 'C(=O)N/C=C/C(=O)OC'}, False, ['1', '3']),
    ('dichotomide IV', 'ChEBI', 'aromatic',
     {'1': 'C(C)=O', '3': 'C(=O)N/C=C/C(=O)OC',
      '8': 'O[C{s}H]4O[C{s}H](CO)[C{s}H](O)[C{s}H](O)[C{s}H]4O'},
     True, ['1', '3', '8']),
    ('dichotomide V', 'ChEBI', 'aromatic',
     {'1': 'C(C)=O', '3': 'C(=O)N/C=C\\C(=O)OC', '8': 'O'}, False, ['1', '3', '8']),
    ('PS-1145', 'ChEBI', 'aromatic',
     {'6': 'Cl', '8': 'N=C(O)c4cccnc4'}, False, ['6', '8']),
    ('harmaline', 'ChEBI', '3,4-dihydro', {'1': 'C', '7': 'OC'}, False, ['1', '7']),
    ('harmalol', 'ChEBI', '3,4-dihydro', {'1': 'C', '7': 'O'}, False, ['1', '7']),
    ('AC-4-248', 'ChEBI', 'tetrahydro',
     {'2': 'CCCN=C(O)CCC', '6': 'Cl'}, False, ['2', '6']),
    ('chloroinconazide', 'ChEBI', 'tetrahydro',
     {'1': 'C', '3': 'C(O)=N/N=C/c4ccc(Cl)cc4'}, True, ['1', '3']),
    ('trans-Ned 19', 'ChEBI', 'tetrahydro',
     {'1': '-c4ccc(OC)c(CN5CCN(c6ccccc6F)CC5)c4', '3': 'C(=O)O'},
     True, ['1', '3']),
    ('tubulosine', 'ChEBI', 'tetrahydro',
     {'1': 'C[C{s}H]4[C{s}H](CC)CN5CCc6cc(OC)c(OC)cc6[C{s}H]5C4', '6': 'O'},
     True, ['1', '6']),
    ('tubulosan', 'ChEBI', 'tetrahydro',
     {'1': 'C[C{s}H]4[C{s}H](CC)CN5CCc6ccccc6[C{s}H]5C4'}, True, ['1']),
    ('alangimarckine', 'ChEBI', 'tetrahydro',
     {'1': 'C[C{s}H]4[C{s}H](CC)CN5CCc6c(cc(OC)c(OC)c6O)[C{s}H]5C4'},
     True, ['1']),
    ('manzamine A', 'ChEBI', 'aromatic', {'1': 'OUT-OF-SCOPE'}, 'SKIP', ['1']),
]
STEREO_CHOICES = ['', '@', '@@']


def prove_anchors(lib_by_name):
    """Return {(state, locant): set(anchor names)} and
    {(state, locant, frag): [anchor names]} for proven pairs."""
    site_anchors = defaultdict(set)
    proven = defaultdict(list)
    print('--- 5. ANCHOR PROOFS (stereo-inclusive canonical SMILES identity) ---')
    for name, prov, state, fills, stereo, locs in ANCHORS:
        row = lib_by_name.get(name)
        if row is None:
            print('  MISSING-ROW   %-20s' % name)
            continue
        if row['provider'] != prov:
            print('  NOT-SOURCED   %-20s provider=%r' % (name, row['provider']))
            continue
        target = canon(row['smiles'])
        if stereo == 'SKIP':
            print('  SCOPE-SKIP    %-20s %-12s (fragment out of transcription '
                  'scope; site anchor only, no slot value)' % (name, state))
            for l in locs:
                site_anchors[(state, l)].add(name)
            continue
        nmark = sum(f.count('{s}') for f in fills.values())
        combos = []
        if not stereo:
            combos = [(None, ())]
        else:
            for a in STEREO_CHOICES:
                for b in STEREO_CHOICES:
                    for tags in itertools.product(STEREO_CHOICES[1:],
                                                  repeat=nmark):
                        combos.append(({'C1': a, 'C3': b}, tags))
        hit = None
        for cmb, tags in combos:
            it = iter(tags)
            f2 = {k: re.sub(r'\{s\}', lambda m: next(it), v)
                  for k, v in fills.items()}
            smi = build(state, f2, cmb)
            if canon(smi) == target:
                hit = (smi, cmb)
                break
        if hit is None:
            print('  PROOF-FAIL    %-20s %-12s' % (name, state))
            print('                built  %s' % canon(build(state, fills,
                                                            combos[0])))
            print('                stored %s' % target)
            continue
        smi, cmb = hit
        tag = '' if not cmb else ' core-stereo=%s' % {k: v or '-' for k, v
                                                      in cmb.items()}
        print('  PROVEN  %-20s %-12s locants=%-12s%s' %
              (name, state, ','.join(locs), tag))
        print('          %s' % smi)
        print('          == %s' % target)
        for l in locs:
            site_anchors[(state, l)].add(name)
            if l in fills and '{s}' not in fills[l]:
                proven[(state, l, fills[l])].append(name)
    return site_anchors, proven


# ------------------------------------------------- attested-only slot tables
# value = (prefix name, bare SMILES fragment).  Each MUST be a key of
# `proven` at exactly its own (state, locant) -- enforced at runtime.
SLOT_TABLES = {
    ('aromatic', '1'): [('methyl', 'C'),
                        ('acetyl', 'C(C)=O'),
                        ('(2-imino-2,3-dihydropyrimidin-4-yl)',
                         '-c4cc[nH]c(=N)n4')],
    ('aromatic', '3'): [('carbamoyl', 'C(N)=O'),
                        ('[(E)-3-methoxy-3-oxoprop-1-en-1-yl]carbamoyl',
                         'C(=O)N/C=C/C(=O)OC'),
                        ('[(Z)-3-methoxy-3-oxoprop-1-en-1-yl]carbamoyl',
                         'C(=O)N/C=C\\C(=O)OC')],
    ('aromatic', '8'): [('hydroxy', 'O')],
    ('3,4-dihydro', '1'): [('methyl', 'C')],
    ('3,4-dihydro', '7'): [('hydroxy', 'O'), ('methoxy', 'OC')],
    ('tetrahydro', '1'): [('methyl', 'C')],
    ('tetrahydro', '3'): [('carboxy', 'C(=O)O')],
    ('tetrahydro', '6'): [('chloro', 'Cl'), ('hydroxy', 'O')],
}

MULT = {1: '', 2: 'di', 3: 'tri', 4: 'tetra'}


def sort_key(prefix):
    """Alphabetical on the first LETTER of the complete prefix name,
    ignoring enclosing marks, stereo descriptors and locants."""
    s = re.sub(r'[\(\)\[\]\{\}]', '', prefix)
    s = re.sub(r'^[EZRS]-', '', s)
    s = re.sub(r'^[^A-Za-z]+', '', s)
    s = re.sub(r'^[EZRS]-', '', s)
    return (s.lower(), prefix)


def assemble_name(state, fills_named):
    """fills_named: {locant: prefix}.  Correct multiplying prefixes and
    alphabetical ordering with ascending locant sets."""
    by_prefix = defaultdict(list)
    for loc, pre in fills_named.items():
        by_prefix[pre].append(loc)
    parts = []
    for pre in sorted(by_prefix, key=sort_key):
        locs = sorted(by_prefix[pre], key=lambda x: (int(re.sub(r'\D', '', x)), x))
        parts.append('%s-%s%s' % (','.join(locs), MULT[len(locs)], pre))
    return '-'.join(parts) + '-' + STEM[state] if parts else STEM[state]


def main(out_path):
    lib = json.load(open(LIB_DUMP))
    lib_by_name = {r['name']: r for r in lib}
    lib_names = set(r['name'] for r in lib)
    lib_flat = {}
    for r in lib:
        if not r['smiles']:
            continue
        f = flat(r['smiles'])
        if f:
            lib_flat.setdefault(f, r['name'])

    in_class = [r for r in lib if r['cls'] == 'beta-Carboline']
    print('=== library rows: %d ; already cls=beta-Carboline: %d (%s) ==='
          % (len(lib), len(in_class), ', '.join(r['name'] for r in in_class)))
    print()

    site_anchors, proven = prove_anchors(lib_by_name)
    print()
    print('--- 2b. TWO-ANCHOR GATE (live) ---')
    admitted = set()
    for (state, loc), names in sorted(site_anchors.items()):
        verdict = 'ADMITTED' if len(names) >= 2 else 'REFUSED '
        if len(names) >= 2:
            admitted.add((state, loc))
        print('  %-12s C%-3s %s %d anchor(s): %s'
              % (state, loc, verdict, len(names), ', '.join(sorted(names))))
    for state in TEMPLATES:
        for loc in ['1', '2', '3', '4', '5', '6', '7', '8', '9']:
            if (state, loc) not in site_anchors:
                print('  %-12s C%-3s REFUSED  0 anchor(s)' % (state, loc))
    print()

    # enforce rule (b) and rule (d) on the slot tables themselves
    print('--- 4b. SLOT TABLE VALIDATION (rules b and d, live) ---')
    tables = {}
    for (state, loc), vals in sorted(SLOT_TABLES.items()):
        if (state, loc) not in admitted:
            print('  DROP SITE  %-12s C%-3s not admitted by two-anchor gate'
                  % (state, loc))
            continue
        keep = []
        for pre, frag in vals:
            key = (state, loc, frag)
            if key not in proven:
                print('  DROP VALUE %-12s C%-3s %-20s NOT proven at this site'
                      % (state, loc, pre))
                continue
            keep.append((pre, frag))
            print('  KEEP       %-12s C%-3s %-46s <- %s'
                  % (state, loc, pre, ', '.join(proven[key])))
        if keep:
            tables[(state, loc)] = keep
    print()

    # ---------------------------------------------------------- enumerate
    skips = Counter()
    rows = []
    seen_names = set()
    seen_flat = {}
    enumerated = 0
    per_state = Counter()

    for state in ['aromatic', '3,4-dihydro', 'tetrahydro']:
        sites = sorted([loc for (s, loc) in tables if s == state],
                       key=lambda x: int(x))
        options = []
        for loc in sites:
            options.append([None] + tables[(state, loc)])

        def rec(i, chosen):
            nonlocal enumerated
            if i == len(sites):
                if not chosen:
                    return
                enumerated += 1
                per_state[state] += 1
                fills = {loc: frag for loc, (pre, frag) in chosen.items()}
                named = {loc: pre for loc, (pre, frag) in chosen.items()}
                name = assemble_name(state, named)
                smi = build(state, fills)
                m = Chem.MolFromSmiles(smi)
                if m is None:
                    skips['parse'] += 1
                    print('  SKIP parse            %s' % name)
                    return
                cs = Chem.MolToSmiles(m)
                if not cs:
                    skips['null'] += 1
                    return
                # differential formula cross-check: core + per-slot deltas
                exp = Counter(CORE_FORMULA[state])
                base, _ = formula_counts(build(state, {}))
                assert base == dict(CORE_FORMULA[state]), (base, state)
                for loc, frag in fills.items():
                    one, _ = formula_counts(build(state, {loc: frag}))
                    for el, n in one.items():
                        exp[el] += n
                    for el, n in CORE_FORMULA[state].items():
                        exp[el] -= n
                got, got_f = formula_counts(cs)
                if dict(exp) != got:
                    skips['formula'] += 1
                    print('  SKIP formula          %s  expected %s got %s'
                          % (name, formula_string(exp), got_f))
                    return
                if name in lib_names:
                    skips['dup-name-lib'] += 1
                    print('  SKIP dup-name-lib     %s' % name)
                    return
                if name in seen_names:
                    skips['dup-name-self'] += 1
                    print('  SKIP dup-name-self    %s' % name)
                    return
                fl = flat(cs)
                if fl in lib_flat:
                    skips['dup-struct-lib'] += 1
                    print('  SKIP dup-struct-lib   %-60s == library %r'
                          % (name, lib_flat[fl]))
                    return
                if fl in seen_flat:
                    skips['dup-struct-self'] += 1
                    print('  SKIP dup-struct-self  %-60s == %r'
                          % (name, seen_flat[fl]))
                    return
                seen_names.add(name)
                seen_flat[fl] = name
                rows.append({'name': name, 'cls': 'beta-Carboline',
                             'formula': got_f, 'smiles': cs})
                return
            loc = sites[i]
            for opt in options[i]:
                if opt is None:
                    rec(i + 1, chosen)
                else:
                    chosen[loc] = opt
                    rec(i + 1, chosen)
                    del chosen[loc]

        print('--- enumerating %s over sites %s ---' % (state, sites))
        rec(0, {})

    print()
    print('--- 5b. GATE ACCOUNTING (live) ---')
    print('  candidates enumerated : %d  %s' % (enumerated, dict(per_state)))
    for k in ['parse', 'null', 'formula', 'dup-name-lib', 'dup-name-self',
              'dup-struct-lib', 'dup-struct-self']:
        print('  skipped %-16s: %d' % (k, skips[k]))
    print('  emitted               : %d' % len(rows))
    print('  in-class total         : %d (%d existing + %d new)'
          % (len(in_class) + len(rows), len(in_class), len(rows)))
    print('  TARGET 50 -> %s' % ('MET' if len(in_class) + len(rows) >= 50
                                 else 'NOT MET; measured ceiling = %d'
                                 % (len(in_class) + len(rows))))

    with open(out_path, 'w') as fh:
        for r in rows:
            fh.write("  { name: %s, cls: 'beta-Carboline', formula: %s, "
                     "smiles: %s },\n"
                     % (js(r['name']), js(r['formula']), js(r['smiles'])))
    print('  rows written to %s' % out_path)
    json.dump(rows, open(HERE + '/rows.json', 'w'), indent=1)


def js(s):
    return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"


if __name__ == '__main__':
    main(sys.argv[1])
