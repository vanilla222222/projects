"""Template-anchored derivation of cls='Retinoid' reference rows.

Censuses retinoid structural cores class-blind over the whole library, admits a
(stereo-core, site, value) cell only when >=2 externally sourced rows attest it
under every valid stereo-inclusive reproduction, composes the attested product
matrix, and prints surviving rows to STDOUT. Diagnostics go to STDERR.
Run with cwd = the project directory. Writes no files except a library cache.
"""
import json
import os
import subprocess
import sys
import tempfile

from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")
CLS = "Retinoid"


def err(*a):
    print(*a, file=sys.stderr)


def load():
    cache = os.environ.get("MP_DERIVE_CACHE") or tempfile.mkdtemp(prefix="mp-derive-ret-")
    os.makedirs(cache, exist_ok=True)
    path = os.path.join(cache, "retinoid-library.json")
    if not os.path.exists(path):
        js = (
            "const {LIBRARY}=require('./data/library.js');"
            "require('fs').writeFileSync(process.argv[1],"
            "JSON.stringify(LIBRARY.map(r=>[r.name,r.smiles,r.cls||'',r.source?1:0,r.formula||''])));"
        )
        subprocess.run(["node", "-e", js, path], check=True)
    rows = json.load(open(path))
    err("library rows: %d  sourced: %d" % (len(rows), sum(r[3] for r in rows)))
    return rows


def can(m):
    return Chem.MolToSmiles(m)


def ring_fused(mol, match):
    core = set(match)
    for r in mol.GetRingInfo().AtomRings():
        if set(r) & core and not set(r) <= core:
            return True
    return False


def transcribe(mol, match, site_q_idx):
    core = set(match)
    cuts = []
    for si, qi in site_q_idx.items():
        a = mol.GetAtomWithIdx(match[qi])
        for nb in a.GetNeighbors():
            if nb.GetIdx() not in core:
                cuts.append((a.GetIdx(), nb.GetIdx(), si))
    if not cuts:
        return None
    empty = [si for si in site_q_idx if si not in [c[2] for c in cuts]]
    bidx, pairs, lab2site = [], [], {}
    for k, (ai, bi, si) in enumerate(cuts):
        b = mol.GetBondBetweenAtoms(ai, bi)
        if b is None:
            return None
        lab = k + 1
        lab2site[lab] = si
        bidx.append(b.GetIdx())
        pairs.append((lab, lab))
    frag = Chem.FragmentOnBonds(mol, bidx, addDummies=True, dummyLabels=pairs)
    for a in frag.GetAtoms():
        if a.GetAtomicNum() == 0:
            a.SetAtomMapNum(a.GetIsotope())
            a.SetIsotope(0)
    fragidx = Chem.GetMolFrags(frag, asMols=False)
    try:
        pieces = Chem.GetMolFrags(frag, asMols=True, sanitizeFrags=True)
    except Exception:
        return None
    corepiece, subs = None, []
    for ix, p in zip(fragidx, pieces):
        if match[0] in ix:
            corepiece = p
        else:
            subs.append(p)
    if corepiece is None or len(pieces) < 2:
        return None
    reb = corepiece
    for p in subs:
        reb = Chem.molzip(reb, p)
    try:
        Chem.SanitizeMol(reb)
    except Exception:
        return None
    if can(reb) != can(mol):
        return None
    cd = Chem.RWMol(corepiece)
    for a in cd.GetAtoms():
        if a.GetAtomicNum() == 0:
            a.SetAtomMapNum(lab2site[a.GetAtomMapNum()] + 1)
    cdm = cd.GetMol()
    ck = Chem.RWMol(cdm)
    rm = [a.GetIdx() for a in ck.GetAtoms() if a.GetAtomicNum() == 0]
    for ix in sorted(rm, reverse=True):
        ck.RemoveAtom(ix)
    ckm = ck.GetMol()
    try:
        Chem.SanitizeMol(ckm)
        Chem.SanitizeMol(cdm)
    except Exception:
        return None
    sitefrag = {si + 1: ["[H]"] for si in empty}
    for p in subs:
        lab = None
        for a in p.GetAtoms():
            if a.GetAtomicNum() == 0:
                lab = a.GetAtomMapNum()
        q2 = Chem.RWMol(p)
        for a in q2.GetAtoms():
            if a.GetAtomicNum() == 0:
                a.SetAtomMapNum(1)
        sitefrag.setdefault(lab2site[lab] + 1, []).append(Chem.MolToSmiles(q2))
    return can(ckm), can(cdm), sitefrag


def census(label, smarts, site_q_idx, rows, mols):
    q = Chem.MolFromSmarts(smarts)
    if q is None:
        raise SystemExit("bad SMARTS: %s" % smarts)
    hits = [i for i, m in enumerate(mols) if m is not None and m.HasSubstructMatch(q)]
    srcd = [i for i in hits if rows[i][3]]
    err("\n[%s] qatoms=%d hits=%d sourced=%d" % (label, q.GetNumAtoms(), len(hits), len(srcd)))
    cells, coreD, dropped = {}, {}, []
    for i in srcd:
        m = mols[i]
        good, nfused = [], 0
        for mt in m.GetSubstructMatches(q, uniquify=False, useChirality=False):
            if ring_fused(m, mt):
                nfused += 1
                continue
            r = transcribe(m, mt, site_q_idx)
            if r:
                good.append(r)
        if not good:
            dropped.append((rows[i][0], nfused))
            continue
        vals = {}
        for ck, cd, sf in good:
            coreD.setdefault(ck, cd)
            for s, v in sf.items():
                vals.setdefault(s, set()).update(v)
        for s in sorted(vals):
            if len(vals[s]) != 1:
                err("   NONUNANIM %-38s site%d %s" % (rows[i][0], s, sorted(vals[s])))
                continue
            v = list(vals[s])[0]
            for ck, cd, sf in good:
                cells.setdefault((ck, s, v), set()).add(rows[i][0])
    err("   dropped (ring-fused/irreproducible): %d %s" % (len(dropped), [d[0] for d in dropped][:14]))
    adm = {}
    for (ck, s, v), ns in sorted(cells.items(), key=lambda kv: (kv[0][0], kv[0][1], -len(kv[1]))):
        tag = "ADMIT " if len(ns) >= 2 else "refuse"
        err("   %s core=%s site%d %-44s %d %s" % (tag, ck, s, v, len(ns), sorted(ns)))
        if len(ns) >= 2:
            adm.setdefault(ck, {}).setdefault(s, {})[v] = sorted(ns)
    return adm, coreD


def compose(coreD_smiles, assign):
    core = Chem.MolFromSmiles(coreD_smiles)
    if core is None:
        return None
    prod = core
    for s, v in sorted(assign.items()):
        if v == "[H]":
            continue
        f = Chem.MolFromSmiles(v)
        if f is None:
            return None
        f = Chem.RWMol(f)
        for a in f.GetAtoms():
            if a.GetAtomicNum() == 0:
                a.SetAtomMapNum(s)
        prod = Chem.molzip(prod, f.GetMol())
    rw = Chem.RWMol(prod)
    rm = [a.GetIdx() for a in rw.GetAtoms() if a.GetAtomicNum() == 0]
    for ix in sorted(rm, reverse=True):
        rw.RemoveAtom(ix)
    out = rw.GetMol()
    try:
        Chem.SanitizeMol(out)
    except Exception:
        return None
    Chem.AssignStereochemistry(out, cleanIt=True, force=True)
    return out


def has_ring(frag_smiles):
    m = Chem.MolFromSmiles(frag_smiles)
    return m is not None and m.GetRingInfo().NumRings() > 0


def ncarbon(m):
    return sum(1 for a in m.GetAtoms() if a.GetAtomicNum() == 6)


def strip(smiles):
    m = Chem.MolFromSmiles(smiles)
    if m is None:
        return None
    Chem.RemoveStereochemistry(m)
    return Chem.MolToSmiles(m)


NAMES = {
    "COc1cc(C)c(/C=C/C(C)=C/C=C/C(C)=C/C=O)c(C)c1C": "Acitretinal",
}

CORE_R = "[#6]=[#6]-[#6](-[CH3])=[#6]-[#6]=[#6]-[#6](-[CH3])=[#6]"
SITES_R = {0: 0, 1: 9}
CORE_B = "[#6]1(-[CH3])(-[CH3])-[#6]-[#6]-[#6]-[#6](-[CH3])=[#6]-1"
SITES_B = {0: 8, 1: 4, 2: 5}
CORE_C = ("[#6]1(-[CH3])(-[CH3])-[#6]-[#6]-[#6]-[#6](-[CH3])=[#6]-1"
          "-[#6]=[#6]-[#6](-[CH3])=[#6]-[#6]=[#6]-[#6](-[CH3])=[#6]")
SITES_C = {0: 4, 1: 5, 2: 18}


def main():
    rows = load()
    mols = [Chem.MolFromSmiles(r[1]) for r in rows]
    in_class = [r for r in rows if r[2] == CLS]
    err("cls=%s existing rows: %d (sourced: %d)" % (CLS, len(in_class), sum(r[3] for r in in_class)))
    known_struct = {}
    known_names = set()
    for n, s, c, src, f in rows:
        k = strip(s)
        if k:
            known_struct.setdefault(k, (n, c))
        known_names.add(n.lower())
    maxc = max(ncarbon(Chem.MolFromSmiles(r[1])) for r in in_class)
    err("cls=%s existing max carbon count: %d" % (CLS, maxc))

    emitted, seen = [], set()
    for label, smarts, sites in (("CORE R chain", CORE_R, SITES_R),
                                 ("CORE B beta-ionone ring", CORE_B, SITES_B),
                                 ("CORE C full C20", CORE_C, SITES_C)):
        adm, coreD = census(label, smarts, sites, rows, mols)
        for ck, per in sorted(adm.items()):
            if len(per) < len(sites):
                err("   core=%s has admitted values at only %d of %d sites: no product matrix"
                    % (ck, len(per), len(sites)))
                continue
            keys = sorted(per)
            combos = [{}]
            for s in keys:
                nxt = []
                for c in combos:
                    for v in sorted(per[s]):
                        d = dict(c)
                        d[s] = v
                        nxt.append(d)
                combos = nxt
            for assign in combos:
                head = assign[keys[0]]
                if not has_ring(head) and head != "[H]":
                    err("   REFUSE(acyclic head, not a retinoid) core=%s %s" % (ck, assign))
                    continue
                p = compose(coreD[ck], assign)
                if p is None:
                    err("   REFUSE(composition failed) core=%s %s" % (ck, assign))
                    continue
                smi = can(p)
                if ncarbon(p) > maxc:
                    err("   REFUSE(C%d > class max C%d: carotenoid product space, shipped under"
                        " provenance classes) %s" % (ncarbon(p), maxc, smi))
                    continue
                k = strip(smi)
                if k in known_struct:
                    err("   REFUSE(structure collision with '%s' cls=%s) %s"
                        % (known_struct[k][0], known_struct[k][1], smi))
                    continue
                if k in seen:
                    err("   REFUSE(intra-batch duplicate) %s" % smi)
                    continue
                name = NAMES.get(smi)
                if name is None:
                    err("   REFUSE(no attested name for composed product) %s" % smi)
                    continue
                if name.lower() in known_names:
                    err("   REFUSE(name collision '%s') %s" % (name, smi))
                    continue
                seen.add(k)
                emitted.append((name, CalcMolFormula(p), smi))
                err("   EMIT %s %s %s" % (name, CalcMolFormula(p), smi))

    for name, formula, smi in emitted:
        chk = CalcMolFormula(Chem.MolFromSmiles(smi))
        if chk != formula:
            raise SystemExit("formula cross-check failed: %s %s != %s" % (name, formula, chk))
        print("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' }," % (name, CLS, formula, smi))
    err("\nderived rows: %d   class total: %d" % (len(emitted), len(in_class) + len(emitted)))


main()
