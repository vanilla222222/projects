"""Template-anchored derivation of Aniline analgesic reference rows from the Molecule Profiler corpus."""

import json
import os
import subprocess
import sys
from collections import defaultdict

from rdkit import Chem
from rdkit.Chem.rdMolDescriptors import CalcMolFormula
from rdkit import RDLogger

RDLogger.DisableLog('rdApp.*')

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = '/home/user/projects/molecule profiler'
DUMP = os.path.join(HERE, 'library-dump.json')
CLS = 'Aniline analgesic'


def log(msg):
    sys.stderr.write(msg + '\n')


def redump():
    js = ("const {LIBRARY}=require('./data/library.js');"
          "require('fs').writeFileSync(%s, JSON.stringify(LIBRARY));"
          "console.error('dumped '+LIBRARY.length);" % json.dumps(DUMP))
    subprocess.run(['node', '-e', js], cwd=PROJECT, check=True)
    return json.load(open(DUMP))


SMARTS = {
    'anilide_amide': '[c]1[c][c][c][c][c]1[NX3;H1][CX3](=[OX1])',
    'anilide_iminol': '[c]1[c][c][c][c][c]1[NX2]=[CX3]([OX2H1])',
    'paroxy_amide': '[OX2]c1ccc(cc1)[NX3;H1][CX3](=[OX1])',
    'paroxy_iminol': '[OX2]c1ccc(cc1)[NX2]=[CX3][OX2H1]',
    'aminophenol': '[OX2H1]c1ccc(cc1)[NX3;H2]',
    'acetanilide': '[CH3][CX3](=[OX1])[NX3;H1]c1ccccc1',
    'iminol_any': '[NX2]=[CX3][OX2H1]',
}
PAT = {k: Chem.MolFromSmarts(v) for k, v in SMARTS.items()}

VALIDATION_POS = {
    'paracetamol': ('CC(=O)Nc1ccc(O)cc1', ['anilide_amide', 'paroxy_amide', 'acetanilide']),
    'phenacetin': ('CCOc1ccc(NC(C)=O)cc1', ['anilide_amide', 'paroxy_amide', 'acetanilide']),
    'acetanilide': ('CC(=O)Nc1ccccc1', ['anilide_amide', 'acetanilide']),
    'bucetin': ('CCOc1ccc(NC(=O)CC(C)O)cc1', ['anilide_amide', 'paroxy_amide']),
    'propacetamol': ('CCN(CC)CC(=O)Oc1ccc(NC(C)=O)cc1', ['anilide_amide', 'paroxy_amide', 'acetanilide']),
    'paracetamol iminol': ('CC(O)=Nc1ccc(O)cc1', ['anilide_iminol', 'paroxy_iminol', 'iminol_any']),
    '4-aminophenol': ('Nc1ccc(O)cc1', ['aminophenol']),
    'metacetamol': ('CC(=O)Nc1cccc(O)c1', ['anilide_amide', 'acetanilide']),
    'butacetin': ('CC(=O)Nc1ccc(C(C)(C)C)cc1', ['anilide_amide', 'acetanilide']),
}
VALIDATION_NEG = {
    'aniline': ('Nc1ccccc1', ['anilide_amide', 'anilide_iminol', 'paroxy_amide', 'aminophenol', 'acetanilide']),
    'benzamide': ('NC(=O)c1ccccc1', ['anilide_amide', 'acetanilide']),
    'sulfanilamide': ('Nc1ccc(S(N)(=O)=O)cc1', ['anilide_amide', 'paroxy_amide']),
    'acetamide': ('CC(N)=O', ['anilide_amide', 'acetanilide']),
    'anisole': ('COc1ccccc1', ['paroxy_amide', 'anilide_amide']),
    'N-methylacetanilide': ('CC(=O)N(C)c1ccccc1', ['anilide_amide', 'acetanilide']),
    'fentanyl': ('CCC(=O)N(c1ccccc1)C1CCN(CCc2ccccc2)CC1', ['anilide_amide', 'acetanilide']),
    'lidocaine': ('CCN(CC)CC(=O)Nc1c(C)cccc1C', ['acetanilide', 'paroxy_amide']),
    '4-methoxyaniline': ('COc1ccc(N)cc1', ['anilide_amide', 'paroxy_amide']),
    'phenol': ('Oc1ccccc1', ['aminophenol']),
    'paracetamol': ('CC(=O)Nc1ccc(O)cc1', ['anilide_iminol', 'paroxy_iminol', 'iminol_any']),
}


def validate_smarts():
    npos = nneg = fails = 0
    for nm, (smi, keys) in VALIDATION_POS.items():
        m = Chem.MolFromSmiles(smi)
        for k in keys:
            npos += 1
            if not m.HasSubstructMatch(PAT[k]):
                fails += 1
                log('SMARTS VALIDATION FAIL positive %s / %s' % (nm, k))
    for nm, (smi, keys) in VALIDATION_NEG.items():
        m = Chem.MolFromSmiles(smi)
        for k in keys:
            nneg += 1
            if m.HasSubstructMatch(PAT[k]):
                fails += 1
                log('SMARTS VALIDATION FAIL negative %s / %s' % (nm, k))
    log('SMARTS validation: %d positive assertions, %d negative assertions, %d failures'
        % (npos, nneg, fails))
    if fails:
        sys.exit(1)


CORE_MATCH = Chem.MolFromSmarts('[OX2]c1ccc(cc1)[NX3;H1][CX3](=[OX1])')
ROLE_OF_MATCH_INDEX = {0: 'ETHER', 8: 'ACYL', 5: 'R2', 3: 'R2', 6: 'R3', 2: 'R3'}
MAPNUM = {'ACYL': 1, 'ETHER': 2, 'R2': 3, 'R3': 4}


def build(vals):
    a, e = vals.get('ACYL'), vals.get('ETHER')
    r2, r3 = vals.get('R2'), vals.get('R3')
    s = ('[*:1]' if a else '') + 'C(=O)Nc1' \
        + ('c([*:3])' if r2 else 'c') + ('c([*:4])' if r3 else 'c') \
        + 'c(O' + ('[*:2]' if e else '') + ')cc1'
    core = Chem.MolFromSmiles(s)
    if core is None:
        return None
    comb = core
    for key, num in MAPNUM.items():
        v = vals.get(key)
        if not v:
            continue
        fm = Chem.MolFromSmiles(v)
        if fm is None:
            return None
        nd = 0
        for at in fm.GetAtoms():
            if at.GetAtomicNum() == 0:
                at.SetAtomMapNum(num)
                at.SetIsotope(0)
                nd += 1
        if nd != 1:
            return None
        comb = Chem.CombineMols(comb, fm)
    try:
        z = Chem.molzip(comb)
        Chem.SanitizeMol(z)
        return Chem.MolToSmiles(z, isomericSmiles=True)
    except Exception:
        return None


def decompose(mol):
    out = []
    for mt in mol.GetSubstructMatches(CORE_MATCH, uniquify=True):
        core_idx = set(mt)
        cuts = []
        bad = False
        for mi, role in ROLE_OF_MATCH_INDEX.items():
            idx = mt[mi]
            at = mol.GetAtomWithIdx(idx)
            nb = [n.GetIdx() for n in at.GetNeighbors() if n.GetIdx() not in core_idx]
            if len(nb) > 1:
                bad = True
                break
            if nb:
                cuts.append((idx, nb[0], role))
        if bad:
            continue
        per = defaultdict(int)
        for _, _, role in cuts:
            per[role] += 1
        if any(v > 1 for v in per.values()):
            continue
        if not cuts:
            out.append({})
            continue
        bonds = [mol.GetBondBetweenAtoms(a, b) for a, b, _ in cuts]
        if any(bd.IsInRing() for bd in bonds):
            continue
        try:
            frag = Chem.FragmentOnBonds(mol, [bd.GetIdx() for bd in bonds],
                                        addDummies=True, dummyLabels=[(0, 0)] * len(bonds))
            pieces = Chem.GetMolFrags(frag, asMols=True, sanitizeFrags=True)
            fidx = Chem.GetMolFrags(frag)
        except Exception:
            continue
        vals = {}
        ok = True
        for a, b, role in cuts:
            tgt = None
            for pi, atoms in enumerate(fidx):
                if b in atoms and a not in atoms:
                    tgt = pieces[pi]
                    break
            if tgt is None:
                ok = False
                break
            sm = Chem.MolToSmiles(tgt, isomericSmiles=True)
            if sm.count('*') != 1:
                ok = False
                break
            vals[role] = sm
        if ok:
            out.append(vals)
    return out


IN_SCOPE_ACYL = {'*C', 'H'}
ACYL_NAME = {'H': 'formamide', '*C': 'acetamide'}
ETHER_NAME = {'H': '4-hydroxyphenyl', '*C': '4-methoxyphenyl'}

CORE_SKELETON = {'C': 7, 'H': 7, 'N': 1, 'O': 2}
HILL = ['C', 'H', 'N', 'O', 'S', 'F', 'Cl', 'Br', 'I', 'P']


def frag_composition(frag_smiles):
    if frag_smiles == 'H':
        return {'H': 1}
    m = Chem.MolFromSmiles(frag_smiles.replace('*', '[H]'))
    if m is None:
        return None
    m = Chem.AddHs(m)
    comp = defaultdict(int)
    for at in m.GetAtoms():
        comp[at.GetSymbol()] += 1
    comp['H'] -= 1
    return dict(comp)


def formula_string(comp):
    parts = []
    for sym in HILL:
        n = comp.get(sym, 0)
        if n:
            parts.append(sym + ('' if n == 1 else str(n)))
    for sym in sorted(k for k in comp if k not in HILL):
        n = comp[sym]
        if n:
            parts.append(sym + ('' if n == 1 else str(n)))
    return ''.join(parts)


def differential_formula(vals):
    comp = defaultdict(int, dict(CORE_SKELETON))
    for site in ('ACYL', 'ETHER', 'R2', 'R3'):
        v = vals.get(site) or 'H'
        if v == 'H':
            continue
        fc = frag_composition(v)
        if fc is None:
            return None
        for sym, n in fc.items():
            comp[sym] += n
        comp['H'] -= 1
    return formula_string(comp)


def main():
    library = redump()
    log('library rows measured: %d' % len(library))
    validate_smarts()

    parsed = []
    unparsed = 0
    for r in library:
        m = Chem.MolFromSmiles(r['smiles'])
        if m is None:
            unparsed += 1
            continue
        parsed.append((r, m))
    log('library rows parsed: %d, unparsed: %d' % (len(parsed), unparsed))

    log('')
    log('=== CENSUS (cls-blind, SMARTS substructure over the whole corpus) ===')
    census = {}
    for key in ('anilide_amide', 'anilide_iminol', 'paroxy_amide', 'paroxy_iminol',
                'aminophenol', 'acetanilide', 'iminol_any'):
        rows = [r for r, m in parsed if m.HasSubstructMatch(PAT[key])]
        srcd = [r for r in rows if 'source' in r]
        census[key] = (len(rows), len(srcd))
        log('  %-15s total %5d   externally sourced %5d' % (key, len(rows), len(srcd)))
    in_cls = [r for r, _ in parsed if r.get('cls') == CLS]
    log('  rows already filed under cls %r: %d' % (CLS, len(in_cls)))

    log('')
    log('=== ANCHOR GATE on the 4-oxyanilide template ===')
    anchors = defaultdict(list)
    handwritten = defaultdict(list)
    not_reproduced = []
    considered = 0
    for r, m in parsed:
        if not m.HasSubstructMatch(PAT['paroxy_amide']):
            continue
        considered += 1
        target = Chem.MolToSmiles(m, isomericSmiles=True)
        hit = None
        for d in decompose(m):
            if build(d) == target:
                hit = d
                break
        if hit is None:
            not_reproduced.append(r['name'])
            continue
        sink = anchors if 'source' in r else handwritten
        for site in ('ACYL', 'ETHER', 'R2', 'R3'):
            sink[(site, hit.get(site) or 'H')].append(r['name'])
    log('  template-matching rows considered: %d' % considered)
    log('  rows not reproducible from the template (skipped): %d (%s)'
        % (len(not_reproduced), ', '.join(not_reproduced)))

    slots = defaultdict(list)
    refusals = []
    for site in ('ACYL', 'ETHER', 'R2', 'R3'):
        keys = sorted({k for k in list(anchors) + list(handwritten) if k[0] == site},
                      key=lambda k: -len(anchors.get(k, [])))
        for k in keys:
            ns = len(anchors.get(k, []))
            nh = len(handwritten.get(k, []))
            if ns < 2:
                refusals.append((site, k[1], ns, nh,
                                 'fewer than two externally sourced anchors'))
                continue
            if site == 'ACYL' and k[1] not in IN_SCOPE_ACYL:
                refusals.append((site, k[1], ns, nh,
                                 'two anchors but out of class scope (N-acyl urea/carbamate, '
                                 'not an anilide analgesic)'))
                continue
            if site == 'ETHER' and k[1] not in ETHER_NAME:
                refusals.append((site, k[1], ns, nh,
                                 'two anchors but no house naming witness for this ether value'))
                continue
            slots[site].append(k[1])
            log('  ATTESTED %-6s %-22s sourced anchors=%d (%s)'
                % (site, k[1], ns, '; '.join(anchors[k])))
    for site in ('R2', 'R3'):
        if slots.get(site) == ['H']:
            log('  %s: only H is attested; every non-H value has a single sourced anchor' % site)

    log('')
    log('=== SITES / VALUES REFUSED ===')
    for site, val, ns, nh, why in refusals:
        log('  REFUSED %-6s %-50s sourced=%d hand=%d  %s' % (site, val, ns, nh, why))

    log('')
    log('=== ENUMERATION ===')
    lib_strip = defaultdict(list)
    lib_names = set()
    for r, m in parsed:
        lib_names.add(r['name'])
        lib_strip[Chem.MolToSmiles(m, isomericSmiles=False)].append(r['name'])

    n_enum = n_parse = n_formula = n_structcol = n_namecol = n_batchdup = 0
    emitted = []
    seen = set()
    for acyl in slots.get('ACYL', []):
        for ether in slots.get('ETHER', []):
            n_enum += 1
            vals = {}
            if acyl != 'H':
                vals['ACYL'] = acyl
            if ether != 'H':
                vals['ETHER'] = ether
            smi = build(vals)
            if smi is None:
                log('  PARSE GATE rejected %r / %r' % (acyl, ether))
                continue
            n_parse += 1
            name = 'N-(%s)%s' % (ETHER_NAME[ether], ACYL_NAME[acyl])
            diff = differential_formula(vals)
            rd = CalcMolFormula(Chem.MolFromSmiles(smi))
            if diff is None or diff != rd:
                log('  FORMULA GATE FIRED %s: differential=%s rdkit=%s' % (name, diff, rd))
                continue
            n_formula += 1
            strip = Chem.MolToSmiles(Chem.MolFromSmiles(smi), isomericSmiles=False)
            if strip in lib_strip:
                n_structcol += 1
                log('  STRUCTURE COLLISION %s collides with %s' % (name, lib_strip[strip]))
                continue
            if name in lib_names:
                n_namecol += 1
                log('  NAME COLLISION %s' % name)
                continue
            if strip in seen:
                n_batchdup += 1
                log('  BATCH DUPLICATE %s' % name)
                continue
            seen.add(strip)
            emitted.append({'name': name, 'cls': CLS, 'formula': diff, 'smiles': smi})

    log('')
    log('=== GATE ACCOUNTING ===')
    log('  enumerated          %d' % n_enum)
    log('  passed parse        %d' % n_parse)
    log('  passed formula      %d' % n_formula)
    log('  structure collision %d' % n_structcol)
    log('  name collision      %d' % n_namecol)
    log('  batch duplicate     %d' % n_batchdup)
    log('  emitted             %d' % len(emitted))
    log('  class total after emission: %d (%d stored + %d derived)'
        % (len(in_cls) + len(emitted), len(in_cls), len(emitted)))

    for row in emitted:
        sys.stdout.write("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
                         % (row['name'], row['cls'], row['formula'], row['smiles']))


if __name__ == '__main__':
    main()
