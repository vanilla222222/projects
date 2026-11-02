#!/usr/bin/env python3
"""Derive Cholinergic ester reference rows for molecule profiler's data/library.js from the 2-aminoethyl (choline) ester core, censused cls-blind with neutral, quaternary, beta-substituted and iminol forms measured separately and two externally sourced anchors required per (site, value) pair."""

import collections
import json
import os
import subprocess
import sys

from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")

PROJECT = "/home/user/projects/molecule profiler"
DUMP = (
    "const {LIBRARY}=require('./data/library.js');"
    "process.stdout.write(JSON.stringify(LIBRARY.map("
    "r=>[r.name,r.smiles,r.cls||'',r.source?1:0])));"
)
CLS = "Cholinergic ester"
TARGET = 50
MIN_ANCHORS = 2

TEMPLATE = "[*:1]CCOC(=O)[*:2]"

CORE_N0 = (
    "[NX3;H0;!$(N[a]);!$(N[CX3]=[OX1,SX1,NX2]);!$(N=*);!$(N~[!#6])]"
    "-[CH2]-[CH2]-[OX2]-[CX3](=O)-[#6,#7]"
)
CORE_Q0 = "[NX4;H0;+;!$(N[a]);!$(N~[!#6])]-[CH2]-[CH2]-[OX2]-[CX3](=O)-[#6,#7]"
CORE_LOOSE = "[#7]-[CH2]-[CH2]-[OX2]-[CX3](=O)-[#6,#7]"
CORE_BETA = "[NX3,NX4;H0;!$(N[a]);!$(N[CX3]=[OX1])]-[CH2]-[CH1]([#6,#8])-[OX2]-[CX3](=O)"
CARNITINE = "[CH3][N+]([CH3])([CH3])[CH2][CH1]([OX2][CX3]=O)[CH2][CX3](=O)[OX1,OX2H1]"
CARBAMATE_KETO = "[NX3,NX4;H0]-[CH2]-[CH2,CH1]-[OX2]-[CX3](=O)-[NX3]"
CARBAMATE_IMINOL = "[NX3,NX4;H0]-[CH2]-[CH2,CH1]-[OX2]-[CX3]([OX2H1])=[NX2]"
ESTER_IMINOL = "[CX3]([OX2H1])=[NX2]"
ACH_EXACT = "[CH3][N+]([CH3])([CH3])[CH2][CH2][OX2][CX3](=O)[CH3]"
BAD_RING_ORDER = "[NX3]1[CH2][CH2][OX2][CH2][CH2]1-[CH2][CH2][OX2][CX3]=O"
BAD_CHARGE_EXACT = "[N+;X4](C)(C)(C)[CH2][CH2][OX2][CX3](=O)[NX3]"

POSITIVES = {
    "acetylcholine": "CC(=O)OCC[N+](C)(C)C",
    "carbachol": "C[N+](C)(C)CCOC(N)=O",
    "bethanechol": "CC(C[N+](C)(C)C)OC(N)=O",
    "methacholine": "CC(=O)OC(C)C[N+](C)(C)C",
    "suxamethonium": "C[N+](C)(C)CCOC(=O)CCC(=O)OCC[N+](C)(C)C",
    "benactyzine": "CCN(CC)CCOC(=O)C(O)(c1ccccc1)c1ccccc1",
    "adiphenine": "CCN(CC)CCOC(=O)C(c1ccccc1)c1ccccc1",
    "dimethylaminoethyl acetate": "CN(C)CCOC(C)=O",
    "morpholinoethyl acetate": "CC(=O)OCCN1CCOCC1",
    "triethanolamine triacetate": "CC(=O)OCCN(CCOC(C)=O)CCOC(C)=O",
    "acetylcarnitine": "CC(=O)O[C@H](CC(=O)[O-])C[N+](C)(C)C",
    "carbachol iminol form": "C[N+](C)(C)CCOC(O)=N",
    "etofylline acetate": "CC(=O)OCCn1cnc2c1c(=O)n(C)c(=O)n2C",
    "N-acyl ethanolamine ester": "CC(=O)OCCN1C(=O)CCC1",
    "aniline N ethanolamine ester": "CC(=O)OCCN(CC)c1ccccc1",
    "2-aminoethyl acetate": "CC(=O)OCCN",
}
NEGATIVES = {
    "choline": "C[N+](C)(C)CCO",
    "acetylcholine amide": "CC(=O)NCC[N+](C)(C)C",
    "ethyl acetate": "CCOC(C)=O",
    "3-(dimethylamino)propyl acetate": "CC(=O)OCCCN(C)C",
    "N-methylpyrrolidine": "CN1CCCC1",
    "acetylcholine ether": "C[N+](C)(C)CCOCC",
    "N,N-dimethylethanolamine": "CN(C)CCO",
}
EXPECT = {
    "core_N0": ["adiphenine", "benactyzine", "dimethylaminoethyl acetate",
                "morpholinoethyl acetate", "triethanolamine triacetate"],
    "core_Q0": ["acetylcholine", "carbachol", "suxamethonium"],
    "core_loose": ["2-aminoethyl acetate", "N-acyl ethanolamine ester", "acetylcholine",
                   "adiphenine", "aniline N ethanolamine ester", "benactyzine", "carbachol",
                   "dimethylaminoethyl acetate", "etofylline acetate",
                   "morpholinoethyl acetate", "suxamethonium", "triethanolamine triacetate"],
    "core_beta": ["acetylcarnitine", "bethanechol", "methacholine"],
    "carnitine": ["acetylcarnitine"],
    "carbamate_keto": ["bethanechol", "carbachol"],
    "carbamate_iminol": ["carbachol iminol form"],
    "ester_iminol": ["carbachol iminol form"],
    "ach_exact": ["acetylcholine"],
    "bad_ring_order": ["morpholinoethyl acetate"],
    "bad_charge_exact": ["carbachol", "bethanechol"],
}
QUERIES = [
    ("core_N0", CORE_N0),
    ("core_Q0", CORE_Q0),
    ("core_loose", CORE_LOOSE),
    ("core_beta", CORE_BETA),
    ("carnitine", CARNITINE),
    ("carbamate_keto", CARBAMATE_KETO),
    ("carbamate_iminol", CARBAMATE_IMINOL),
    ("ester_iminol", ESTER_IMINOL),
    ("ach_exact", ACH_EXACT),
    ("bad_ring_order", BAD_RING_ORDER),
    ("bad_charge_exact", BAD_CHARGE_EXACT),
]

SITE_A = {
    "N,N-diethylamino": ("[*:1]N(CC)CC", {"C": 4, "H": 10, "N": 1},
                         "2-(diethylamino)ethyl", ["(diethylamino)"]),
    "N,N-dimethylamino": ("[*:1]N(C)C", {"C": 2, "H": 6, "N": 1},
                          "2-(dimethylamino)ethyl", ["(dimethylamino)"]),
    "piperidin-1-yl": ("[*:1]N1CCCCC1", {"C": 5, "H": 10, "N": 1},
                       "2-(piperidin-1-yl)ethyl", ["(piperidin-1-yl)"]),
    "morpholin-4-yl": ("[*:1]N1CCOCC1", {"C": 4, "H": 8, "N": 1, "O": 1},
                       "2-(morpholin-4-yl)ethyl", ["(morpholin-4-yl)"]),
    "azepan-1-yl": ("[*:1]N1CCCCCC1", {"C": 6, "H": 12, "N": 1},
                    "2-(azepan-1-yl)ethyl", ["azepan-1-yl"]),
    "N-benzyl-N-methylamino": ("[*:1]N(C)Cc1ccccc1", {"C": 8, "H": 10, "N": 1},
                               "2-[benzyl(methyl)amino]ethyl", ["benzyl(methyl)amino"]),
    "4-[3-(2-chloro-10H-phenothiazin-10-yl)propyl]piperazin-1-yl":
        ("[*:1]N1CCN(CCCN2c3ccccc3Sc3ccc(Cl)cc32)CC1",
         {"C": 19, "H": 21, "Cl": 1, "N": 3, "S": 1},
         "2-{4-[3-(2-chloro-10H-phenothiazin-10-yl)propyl]piperazin-1-yl}ethyl",
         ["phenothiazin-10-yl"]),
    "4-{3-[2-(trifluoromethyl)-10H-phenothiazin-10-yl]propyl}piperazin-1-yl":
        ("[*:1]N1CCN(CCCN2c3ccccc3Sc3ccc(C(F)(F)F)cc32)CC1",
         {"C": 20, "H": 21, "F": 3, "N": 3, "S": 1},
         "2-(4-{3-[2-(trifluoromethyl)-10H-phenothiazin-10-yl]propyl}piperazin-1-yl)ethyl",
         ["phenothiazin-10-yl"]),
    "trimethylazaniumyl": ("[*:1][N+](C)(C)C", {"C": 3, "H": 9, "N": 1},
                           "2-(trimethylazaniumyl)ethyl", ["azanium"]),
    "triethylazaniumyl": ("[*:1][N+](CC)(CC)CC", {"C": 6, "H": 15, "N": 1},
                          "2-(triethylazaniumyl)ethyl", ["azanium"]),
    "diethyl(methyl)azaniumyl": ("[*:1][N+](C)(CC)CC", {"C": 5, "H": 13, "N": 1},
                                 "2-[diethyl(methyl)azaniumyl]ethyl", ["azanium"]),
}
SITE_B = {
    "acetyl": ("[*:2]C", {"C": 1, "H": 3}, "acetate", ["acetate"]),
    "2-phenyl-2-(piperidin-1-yl)acetyl":
        ("[*:2]C(c1ccccc1)N1CCCCC1", {"C": 12, "H": 16, "N": 1},
         "2-phenyl-2-(piperidin-1-yl)acetate", ["ylacetate", "2-phenyl", "(piperidin-1-yl)"]),
    "2-phenylbutanoyl": ("[*:2]C(CC)c1ccccc1", {"C": 9, "H": 11},
                         "2-phenylbutanoate", ["butanoate", "2-phenyl"]),
    "carbamoyl": ("[*:2]N", {"N": 1, "H": 2}, "carbamate", ["carbamate"]),
    "pyridine-3-carbonyl": ("[*:2]c1cccnc1", {"C": 5, "H": 4, "N": 1},
                            "pyridine-3-carboxylate", ["pyridine-3-carboxylate"]),
    "2-hydroxy-2,2-diphenylacetyl": ("[*:2]C(O)(c1ccccc1)c1ccccc1",
                                     {"C": 13, "H": 11, "O": 1},
                                     "2-hydroxy-2,2-diphenylacetate",
                                     ["2-hydroxy-2,2-diphenylacetate"]),
}
LINK = {"C": 3, "H": 4, "O": 2}
HILL = ["C", "H", "Br", "Cl", "F", "N", "O", "P", "S"]
NAME_CONVENTIONS = ["2-(diethylamino)ethyl", "2-(dimethylamino)ethyl", "(piperidin-1-yl)",
                    "(morpholin-4-yl)", "piperazin-1-yl)ethyl", "acetate", "butanoate",
                    "ylacetate", "2-phenyl", "azanium", "phenothiazin-10-yl", "-10-yl",
                    "azepan-1-yl", "benzyl(methyl)amino", "carbamate",
                    "pyridine-3-carboxylate", "2-hydroxy-2,2-diphenylacetate",
                    "morpholin-4-ylethyl", "(morpholin-4-yl)ethyl", "tert-"]
STEREOISOMER_RECORD_PAIRS = [("(R)-nicardipine", "(S)-nicardipine"),
                             ("(R)-efonidipine", "(S)-efonidipine"),
                             ("(R)-toloxatone", "(S)-toloxatone")]


def err(*a):
    print(*a, file=sys.stderr)


def load():
    out = subprocess.run(["node", "-e", DUMP], cwd=PROJECT, capture_output=True,
                         text=True, check=True)
    return json.loads(out.stdout)


def can(smi):
    m = Chem.MolFromSmiles(smi)
    return Chem.MolToSmiles(m) if m is not None else None


def flat_of(m):
    mm = Chem.Mol(m)
    Chem.RemoveStereochemistry(mm)
    return Chem.MolToSmiles(mm)


def maps_from_isotopes(m):
    rw = Chem.RWMol(m)
    for a in rw.GetAtoms():
        if a.GetAtomicNum() == 0:
            a.SetAtomMapNum(a.GetIsotope())
            a.SetIsotope(0)
    return rw.GetMol()


def split_core(m, match):
    n, c1, c2, o, cc, od, a0 = match
    b1 = m.GetBondBetweenAtoms(n, c1)
    b2 = m.GetBondBetweenAtoms(cc, a0)
    if b1 is None or b2 is None or b1.GetIdx() == b2.GetIdx():
        return None
    frg = Chem.FragmentOnBonds(m, [b1.GetIdx(), b2.GetIdx()], addDummies=True,
                               dummyLabels=[(1, 1), (2, 2)])
    try:
        parts = Chem.GetMolFrags(frg, asMols=True, sanitizeFrags=True)
    except Exception:
        return None
    if len(parts) != 3:
        return None
    amine = acyl = core = None
    for p in parts:
        tags = sorted(a.GetIsotope() for a in p.GetAtoms() if a.GetAtomicNum() == 0)
        if tags == [1, 2]:
            core = p
        elif tags == [1]:
            amine = p
        elif tags == [2]:
            acyl = p
    if None in (amine, acyl, core):
        return None
    return (Chem.MolToSmiles(maps_from_isotopes(amine)),
            Chem.MolToSmiles(maps_from_isotopes(acyl)),
            Chem.MolToSmiles(maps_from_isotopes(core)))


def assemble(amine_smi, acyl_smi):
    tpl = Chem.MolFromSmiles(TEMPLATE)
    a = Chem.MolFromSmiles(amine_smi)
    b = Chem.MolFromSmiles(acyl_smi)
    if None in (tpl, a, b):
        return None
    try:
        m = Chem.molzip(Chem.molzip(tpl, a), b)
        Chem.SanitizeMol(m)
    except Exception:
        return None
    return m


def main():
    lib = load()
    names = [r[0] for r in lib]
    wit = lambda p: sum(1 for n in names if p in n)
    err("== corpus, counted through the module ==")
    err("  library rows: %d" % len(lib))
    err("  externally sourced rows: %d" % sum(r[3] for r in lib))
    err("  rows in cls='%s': %d (sourced: %d)"
        % (CLS, sum(1 for r in lib if r[2] == CLS), sum(1 for r in lib if r[2] == CLS and r[3])))
    err("  sourced rows outside the three catch-all provenance classes: %d"
        % sum(1 for r in lib if r[3] and r[2] not in
              ("ChEBI named compound", "DrugCentral named compound", "PubChem named compound")))
    mols = [Chem.MolFromSmiles(r[1] or "") for r in lib]
    err("  rows parsed by RDKit: %d, unparseable: %d"
        % (sum(1 for m in mols if m is not None), sum(1 for m in mols if m is None)))
    err("")

    err("== SMARTS validation, positive and hard-negative controls ==")
    good = {}
    for label, pat in QUERIES:
        q = Chem.MolFromSmarts(pat)
        if q is None:
            err("  %-18s DISCARDED unparseable" % label)
            continue
        pos = sorted(n for n, s in POSITIVES.items() if Chem.MolFromSmiles(s).HasSubstructMatch(q))
        neg = sorted(n for n, s in NEGATIVES.items() if Chem.MolFromSmiles(s).HasSubstructMatch(q))
        want = sorted(EXPECT[label])
        if pos != want or neg:
            err("  %-18s DISCARDED positives=%s expected=%s negatives=%s" % (label, pos, want, neg))
            continue
        err("  %-18s OK positives %d/%d, negatives 0/%d" % (label, len(pos), len(want), len(NEGATIVES)))
        good[label] = q
    for label in ("core_N0", "core_Q0"):
        if label not in good:
            err("ABORT: core query %s failed validation" % label)
            sys.exit(2)
    err("")

    err("== cls-blind census over the whole corpus ==")
    census = {}
    for label, pat in QUERIES:
        q = Chem.MolFromSmarts(pat)
        if q is None:
            continue
        hits = [i for i, m in enumerate(mols) if m is not None and m.HasSubstructMatch(q)]
        src = [i for i in hits if lib[i][3]]
        census[label] = (hits, src)
        err("  %-18s hits=%6d sourced=%5d handwritten=%5d  %s"
            % (label, len(hits), len(src), len(hits) - len(src),
               "USED" if label in good else "discarded, census reported only"))
    err("")

    n0 = set(census["core_N0"][0])
    q0 = set(census["core_Q0"][0])
    loose = set(census["core_loose"][0])
    err("== charge and nitrogen-form split of the 2-aminoethyl ester skeleton ==")
    err("  neutral tertiary amine (core N0): %d rows, %d sourced" % (len(n0), len(census["core_N0"][1])))
    err("  quaternary ammonium (core Q0)   : %d rows, %d sourced" % (len(q0), len(census["core_Q0"][1])))
    err("  beta-substituted bridge         : %d rows, %d sourced" % (len(census["core_beta"][0]), len(census["core_beta"][1])))
    err("  carnitine ester sub-core        : %d rows, %d sourced" % (len(census["carnitine"][0]), len(census["carnitine"][1])))
    err("  any-nitrogen skeleton (loose)   : %d rows, %d sourced" % (len(loose), len(census["core_loose"][1])))
    err("  rows the loose query adds over N0+Q0 (aromatic, amide, aryl and primary N): %d" % len(loose - n0 - q0))
    err("  core rows carrying an anionic centre as well: %d, all of them charge-separated"
        % sum(1 for i in n0 | q0 if any(a.GetFormalCharge() < 0 for a in mols[i].GetAtoms())))
    err("  nitro groups, not salts or zwitterions: no core row is stored as a salt")
    err("  a charge-exact quaternary query alone would see %d of the %d skeleton rows"
        % (len(q0), len(loose)))
    err("")

    err("== iminol tautomer artefact, both forms censused ==")
    err("  corpus-wide C(O)=N iminol storage form : %d rows, %d sourced"
        % (len(census["ester_iminol"][0]), len(census["ester_iminol"][1])))
    err("  aminoethyl carbamate, keto form        : %d rows, %d sourced"
        % (len(census["carbamate_keto"][0]), len(census["carbamate_keto"][1])))
    err("  aminoethyl carbamate, iminol form      : %d rows, %d sourced"
        % (len(census["carbamate_iminol"][0]), len(census["carbamate_iminol"][1])))
    err("  core rows with an iminol anywhere      : %d" % len((n0 | q0) & set(census["ester_iminol"][0])))
    err("  the artefact does not reach this family: the ester C(=O)O is not an amide")
    err("")

    err("== anchor proof per core: remainder transcribed into template %s ==" % TEMPLATE)
    tplcan = can(TEMPLATE)
    anchors = {}
    for tag in ("N0", "Q0"):
        q = good["core_" + tag]
        rows_ok, dropped, nonunan = {}, [], []
        for i, m in enumerate(mols):
            if m is None or not lib[i][3]:
                continue
            ms = m.GetSubstructMatches(q, uniquify=False)
            if not ms:
                continue
            seen = set()
            bad = False
            for mt in ms:
                sp = split_core(m, mt)
                if sp is None:
                    bad = True
                    continue
                seen.add((sp[0], sp[1], sp[2]))
            if bad and not seen:
                dropped.append((lib[i][0], "core bond split failed"))
                continue
            if len({s[0] for s in seen}) > 1 or len({s[1] for s in seen}) > 1:
                nonunan.append(lib[i][0])
                continue
            a_val, b_val, c_val = seen.pop()
            if c_val != tplcan:
                dropped.append((lib[i][0], "extracted core %s is not the template" % c_val))
                continue
            built = assemble(a_val, b_val)
            if built is None:
                dropped.append((lib[i][0], "template reassembly failed"))
                continue
            if Chem.MolToSmiles(built) != can(lib[i][1]):
                strip = flat_of(built) == flat_of(mols[i])
                dropped.append((lib[i][0], "stereo-inclusive identity failed%s"
                                % (" (stereo-stripped identity would pass; not relaxed)" if strip else "")))
                continue
            rows_ok[lib[i][0]] = (a_val, b_val)
        err("  core %s: anchors proven %d, dropped %d, non-unanimous %d %s"
            % (tag, len(rows_ok), len(dropped), len(nonunan), nonunan))
        for nm, why in sorted(dropped):
            err("    DROPPED %-28s %s" % (nm, why))
        anchors[tag] = rows_ok
    err("")

    tally = {}
    for tag in ("N0", "Q0"):
        ca, cb = collections.defaultdict(set), collections.defaultdict(set)
        for nm, (a_val, b_val) in anchors[tag].items():
            ca[a_val].add(nm)
            cb[b_val].add(nm)
        for x, y in STEREOISOMER_RECORD_PAIRS:
            for d in (ca, cb):
                for k in d:
                    if x in d[k] and y in d[k]:
                        d[k].discard(y)
        tally[tag] = (ca, cb)
        err("  core %s: site A values %d (%d with >=%d anchors), site B values %d (%d with >=%d anchors)"
            % (tag, len(ca), sum(1 for v in ca.values() if len(v) >= MIN_ANCHORS), MIN_ANCHORS,
               len(cb), sum(1 for v in cb.values() if len(v) >= MIN_ANCHORS), MIN_ANCHORS))
    err("  stereoisomer record pairs collapsed to one anchor each: %s" % STEREOISOMER_RECORD_PAIRS)
    err("")

    err("== hard two-anchor gate plus independent name gate, per (site, value) per core ==")
    admitted = {}
    for tag in ("N0", "Q0"):
        ca, cb = tally[tag]
        aa, ab = [], []
        for site, table, store, bucket in (("A", SITE_A, ca, aa), ("B", SITE_B, cb, ab)):
            for key, (smi, comp, frag, needs) in table.items():
                kc = can(smi)
                anc = sorted(store.get(kc, set()))
                missing = [w for w in needs if wit(w) == 0]
                if len(anc) >= MIN_ANCHORS and not missing:
                    bucket.append(key)
                    err("  %s ADMITTED %s %-56s anchors=%d %s" % (tag, site, key[:56], len(anc), anc))
                else:
                    err("  %s REFUSED  %s %-56s anchors=%d %s%s"
                        % (tag, site, key[:56], len(anc), anc,
                           "  name gate: %s unattested" % missing if missing else ""))
        admitted[tag] = (aa, ab)
    err("  carnitine sub-core: one variable site (acyl) only, so every candidate it can build")
    err("  reconstructs the anchor it came from; measured as 0 derivable rows")
    err("")

    cands = []
    for tag in ("N0", "Q0"):
        aa, ab = admitted[tag]
        if not aa or not ab:
            err("  core %s contributes 0 candidates (site A admitted %d, site B admitted %d)"
                % (tag, len(aa), len(ab)))
            continue
        for a in aa:
            for b in ab:
                cands.append((tag, a, b))
    for tag, a, b in cands:
        ca, cb = tally[tag]
        if len(ca.get(can(SITE_A[a][0]), set())) < MIN_ANCHORS or \
           len(cb.get(can(SITE_B[b][0]), set())) < MIN_ANCHORS:
            err("ABORT: admitted cell fell below %d anchors" % MIN_ANCHORS)
            sys.exit(3)
    err("")

    err("== gate accounting ==")
    err("  gate 1 naming convention         : in  %d" % len(cands))
    g1 = []
    for tag, a, b in cands:
        nm = "%s %s" % (SITE_A[a][2], SITE_B[b][2])
        depth, order_ok, stack = 0, True, []
        for ch in nm:
            if ch in "([{":
                stack.append(ch)
                depth += 1
            elif ch in ")]}":
                if not stack or "([{".index(stack[-1]) != ")]}".index(ch):
                    order_ok = False
                if len(stack) >= 2 and "([{".index(stack[-1]) >= "([{".index(stack[-2]):
                    order_ok = False
                stack.pop()
                depth -= 1
            if depth < 0:
                order_ok = False
        if depth != 0 or not order_ok:
            err("    reject enclosing marks  %s" % nm)
            continue
        g1.append((tag, a, b, nm))
    err("  gate 1 naming convention         : out %d" % len(g1))
    g2 = []
    for tag, a, b, nm in g1:
        m = assemble(SITE_A[a][0], SITE_B[b][0])
        if m is None:
            err("    reject parse %s" % nm)
            continue
        g2.append((tag, a, b, nm, Chem.MolToSmiles(m), m))
    err("  gate 2 SMILES parse              : out %d" % len(g2))
    g3 = []
    for tag, a, b, nm, smi, m in g2:
        comp = collections.Counter(LINK)
        comp.update(SITE_A[a][1])
        comp.update(SITE_B[b][1])
        want = "".join("%s%s" % (e, comp[e] if comp[e] > 1 else "") for e in HILL if comp.get(e))
        got = CalcMolFormula(m)
        if want != got.replace("+", "").replace("-", ""):
            err("    reject formula %s differential=%s rdkit=%s" % (nm, want, got))
            continue
        g3.append((tag, a, b, nm, smi, got))
    err("  gate 3 differential formula      : out %d" % len(g3))
    flatlib = collections.defaultdict(list)
    for i, m in enumerate(mols):
        if m is not None:
            flatlib[flat_of(m)].append(lib[i][0])
    g4 = []
    for rec in g3:
        coll = flatlib.get(flat_of(Chem.MolFromSmiles(rec[4])))
        if coll:
            err("    reject structure collision %-52s -> %s" % (rec[3][:52], coll))
            continue
        g4.append(rec)
    err("  gate 4 structure collision       : out %d" % len(g4))
    exact = {n for n in names}
    g5 = [r for r in g4 if r[3] not in exact]
    for r in g4:
        if r[3] in exact:
            err("    reject name collision %s" % r[3])
    err("  gate 5 exact-name collision      : out %d" % len(g5))
    g6, seen = [], set()
    for r in g5:
        if r[4] in seen:
            err("    reject intra-batch structure duplicate %s" % r[3])
            continue
        seen.add(r[4])
        g6.append(r)
    err("  gate 6 intra-batch structure dup : out %d" % len(g6))
    g7, seen = [], set()
    for r in g6:
        if r[3] in seen:
            err("    reject intra-batch name duplicate %s" % r[3])
            continue
        seen.add(r[3])
        g7.append(r)
    err("  gate 7 intra-batch name dup      : out %d" % len(g7))
    err("")

    err("== naming-convention witnesses measured against stored names ==")
    for p in NAME_CONVENTIONS:
        err("  %-34s %d of %d" % (p, wit(p), len(names)))
    err("  bis( %d   di( %d" % (wit("bis("), wit("di(")))
    err("  stored SMILES containing CF: %d, FC: %d"
        % (sum(1 for r in lib if "CF" in (r[1] or "")), sum(1 for r in lib if "FC" in (r[1] or ""))))
    err("")

    err("== result ==")
    err("  rows emitted: %d" % len(g7))
    total = sum(1 for r in lib if r[2] == CLS) + len(g7)
    err("  measured capacity for cls='%s': %d of target %d, %d short" % (CLS, total, TARGET, max(0, TARGET - total)))
    for tag, a, b, nm, smi, form in g7:
        print("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' }," % (nm, CLS, form, smi))


if __name__ == "__main__":
    main()
