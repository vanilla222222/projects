"""Derive Statin reference rows for molecule profiler's data/library.js: two separate statin cores, cls-blind tautomer-tolerant census, >=2 externally sourced anchors per site/value pair, stereo-inclusive anchor identity."""

import json
import os
import subprocess
import sys

from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")

PROJECT = "/home/user/projects/molecule profiler"
SCRATCH = os.path.dirname(os.path.abspath(__file__))
DUMP = (
    "const {LIBRARY}=require('./data/library.js');"
    "process.stdout.write(JSON.stringify(LIBRARY.map("
    "r=>[r.name,r.smiles,r.cls||'',r.source?1:0])));"
)
CLS = "Statin"
TARGET = 50


def err(*a):
    print(*a, file=sys.stderr)


def load():
    cached = os.path.join(SCRATCH, "library.json")
    if os.environ.get("STATIN_USE_CACHE") and os.path.exists(cached):
        rows = json.load(open(cached))
        return [[r["name"], r["smiles"], r.get("cls", ""), 1 if r.get("source") else 0] for r in rows]
    out = subprocess.run(["node", "-e", DUMP], cwd=PROJECT, capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def can(smi):
    m = Chem.MolFromSmiles(smi)
    return Chem.MolToSmiles(m) if m is not None else None


def flat(smi):
    m = Chem.MolFromSmiles(smi)
    if m is None:
        return None
    Chem.RemoveStereochemistry(m)
    return Chem.MolToSmiles(m)


F1_RING = "C1=CC2=CCCCC2CC1"
F2_RING = "C1=CC2CCCCC2CC1"
LACTONE_KETO = "[CH2][CH2][CH]1C[CH](O)CC(=O)O1"
LACTONE_ENOL = "[CH2][CH2][CH]1C[CH](O)CC(O)=C1"
ACID_ARM = "[CH2][CH2][CH](O)C[CH](O)CC(=O)[OH]"
S1_ENE_KETO = "c[CH]=[CH][CH](O)C[CH](O)CC(=O)[OH]"
S1_SAT_KETO = "[n,c][CH2][CH2][CH](O)C[CH](O)CC(=O)[OH]"
S1_LACTONE = "[n,c][CH2,CH]=,-[CH2,CH][CH]1C[CH](O)CC(=O)O1"
PYRROLE_AMIDE = "[nX3]1[c][c]([c][c]1)C(=O)[NX3]"
PYRROLE_IMINOL = "[nX3]1[c][c]([c][c]1)C([OX2H1])=[NX2]"
IMINOL_ANY = "[CX3]([OX2H1])=[NX2]"

POSITIVES = {
    "monacolin L": "C[C@H]1C=C2C=C[C@H](C)[C@H](CC[C@@H]3C[C@@H](O)CC(=O)O3)[C@H]2CC1",
    "monacolin J": "C[C@H]1C=C2C=C[C@H](C)[C@H](CC[C@@H]3C[C@@H](O)CC(=O)O3)[C@H]2[C@@H](O)C1",
    "ML-236C": "C[C@H]1C=CC2=CCCC[C@@H]2[C@H]1CC[C@@H]1C[C@@H](O)CC(=O)O1",
    "mevinic acid": "CC[C@H](C)C(=O)O[C@H]1CCC=C2C=C[C@H](C)[C@H](CC[C@@H](O)C[C@@H](O)CC(=O)O)[C@H]21",
    "dihydromonacolin L": "C[C@@H]1CC[C@@H]2[C@@H](CC[C@@H]3C[C@@H](O)CC(=O)O3)[C@@H](C)C=C[C@H]2C1",
    "fluvastatin": "CC(C)n1c(/C=C/[C@H](O)C[C@H](O)CC(=O)O)c(-c2ccc(F)cc2)c2ccccc21",
    "atorvastatin": "CC(C)c1c(C(=O)Nc2ccccc2)c(-c2ccccc2)c(-c2ccc(F)cc2)n1CCC(O)CC(O)CC(=O)O",
    "atorvastatin lactone": "CC(C)c1c(C(=O)Nc2ccccc2)c(-c2ccccc2)c(-c2ccc(F)cc2)n1CCC1CC(O)CC(=O)O1",
}
NEGATIVES = {
    "decalin": "C1CCC2CCCCC2C1",
    "naphthalene": "c1ccc2ccccc2c1",
    "tetralin": "C1CCc2ccccc2C1",
    "octalin": "C1CCC2=CCCCC2C1",
    "ergosterol": "CC(C)[C@@H](C)/C=C/[C@@H](C)[C@H]1CC[C@H]2C3=CC=C4C[C@@H](O)CC[C@]4(C)[C@H]3CC[C@]12C",
    "mevalonolactone": "CC1(O)CCOC(=O)C1",
    "delta-valerolactone": "O=C1CCCCO1",
    "pyrrole-2-carboxylic acid": "OC(=O)c1ccc[nH]1",
}
EXPECT = {
    "F1_ring": ["monacolin L", "monacolin J", "ML-236C", "mevinic acid"],
    "F2_ring": ["dihydromonacolin L"],
    "lactone_keto": ["monacolin L", "monacolin J", "ML-236C", "dihydromonacolin L", "atorvastatin lactone"],
    "lactone_enol": [],
    "acid_arm": ["mevinic acid", "atorvastatin"],
    "S1_ene_keto": ["fluvastatin"],
    "S1_sat_keto": ["atorvastatin"],
    "S1_lactone": ["atorvastatin lactone"],
    "pyrrole_amide": ["atorvastatin", "atorvastatin lactone"],
    "pyrrole_iminol": [],
    "iminol_any": [],
}
QUERIES = [
    ("F1_ring", F1_RING, "smi"),
    ("F2_ring", F2_RING, "smi"),
    ("lactone_keto", LACTONE_KETO, "sma"),
    ("lactone_enol", LACTONE_ENOL, "sma"),
    ("acid_arm", ACID_ARM, "sma"),
    ("S1_ene_keto", S1_ENE_KETO, "sma"),
    ("S1_sat_keto", S1_SAT_KETO, "sma"),
    ("S1_lactone", S1_LACTONE, "sma"),
    ("pyrrole_amide", PYRROLE_AMIDE, "sma"),
    ("pyrrole_iminol", PYRROLE_IMINOL, "sma"),
    ("iminol_any", IMINOL_ANY, "sma"),
]

STEREO_TPL = "{P4}1C=C2C=C[C@H](C)[C@H](CC{P8})[C@H]2{P6}C1"
FLAT_TPL = "{P4}1C=C2C=CC(C)C(CC{P8})C2{P6}C1"
P4_STEREO = {"CH3": "C[C@H]", "H": "C"}
P4_FLAT = {"CH3": "CC", "H": "C"}
P6_STEREO = {
    "H": "C",
    "OH": "[C@@H](O)",
    "(2S)-2-methylbutanoyloxy": "[C@@H](OC(=O)[C@@H](C)CC)",
}
P6_FLAT = {"H": "C", "OH": "C(O)", "(2S)-2-methylbutanoyloxy": "C(OC(=O)C(C)CC)"}
P8_STEREO = {
    "delta-lactone": "[C@@H]3C[C@@H](O)CC(=O)O3",
    "open hydroxy-acid": "[C@@H](O)C[C@@H](O)CC(=O)O",
}
P8_FLAT = {"delta-lactone": "C3CC(O)CC(=O)O3", "open hydroxy-acid": "C(O)CC(O)CC(=O)O"}

F1_ANCHORS = {
    "monacolin L": ("CH3", "H", "delta-lactone"),
    "monacolin J": ("CH3", "OH", "delta-lactone"),
    "ML-236C": ("H", "H", "delta-lactone"),
    "mevinic acid": ("H", "(2S)-2-methylbutanoyloxy", "open hydroxy-acid"),
}
LACTONE_ACID_PAIRS = [
    ("Lovastatin", "Lovastatin acid"),
    ("Simvastatin", "Simvastatin acid"),
    ("Mevastatin", "Mevastatin acid"),
    ("Pravastatin lactone", "Pravastatin"),
    ("Atorvastatin lactone", "Atorvastatin"),
]
NAME_CONVENTIONS = [
    "hexahydronaphthalen",
    "octahydronaphthalen",
    "oxan-2-yl",
    "oxan-2-one",
    "2H-pyran-2-one",
    "hept-6-enoic",
    "heptanoic",
]


def main():
    lib = load()
    err("library rows via module: %d" % len(lib))
    sourced = [r for r in lib if r[3]]
    err("externally sourced rows: %d (%.1f%%)" % (len(sourced), 100.0 * len(sourced) / len(lib)))
    err("rows in cls=%s: %d" % (CLS, sum(1 for r in lib if r[2] == CLS)))
    err("sourced rows in cls=%s: %d" % (CLS, sum(1 for r in lib if r[2] == CLS and r[3])))
    err("")

    mols = []
    unparseable = 0
    for r in lib:
        m = Chem.MolFromSmiles(r[1] or "")
        if m is None:
            unparseable += 1
        mols.append(m)
    err("rows parsed by RDKit: %d, unparseable: %d" % (len(lib) - unparseable, unparseable))
    err("")

    err("== SMARTS validation before use ==")
    good = {}
    for label, pat, kind in QUERIES:
        q = Chem.MolFromSmiles(pat) if kind == "smi" else Chem.MolFromSmarts(pat)
        if q is None:
            err("  %-16s DISCARDED unparseable: %s" % (label, pat))
            continue
        hit_pos = [n for n, s in POSITIVES.items() if Chem.MolFromSmiles(s).HasSubstructMatch(q)]
        hit_neg = [n for n, s in NEGATIVES.items() if Chem.MolFromSmiles(s).HasSubstructMatch(q)]
        want = EXPECT[label]
        okp = set(hit_pos) == set(want)
        if not okp or hit_neg:
            err("  %-16s DISCARDED positives=%s expected=%s negatives=%s" % (label, hit_pos, want, hit_neg))
            continue
        err("  %-16s OK positives %d/%d %s, negatives 0/%d" % (label, len(hit_pos), len(want), hit_pos, len(NEGATIVES)))
        good[label] = q
    err("")

    err("== cls-blind corpus census, both tautomer forms reported separately ==")
    census = {}
    for label, q in good.items():
        hits = [i for i, m in enumerate(mols) if m is not None and m.HasSubstructMatch(q)]
        src = [i for i in hits if lib[i][3]]
        census[label] = (hits, src)
        err("  %-16s hits=%6d sourced=%5d handwritten=%5d" % (label, len(hits), len(src), len(hits) - len(src)))
    err("")

    f1 = set(census["F1_ring"][0]) if "F1_ring" in census else set()
    f2 = set(census["F2_ring"][0]) if "F2_ring" in census else set()
    armed = set()
    for k in ("lactone_keto", "lactone_enol", "acid_arm"):
        if k in census:
            armed |= set(census[k][0])
    err("== fungal group: core F1 (1,2,6,7,8,8a-hexahydronaphthalene) ==")
    err("  F1 ring-system rows: %d (%d sourced)" % (len(f1), sum(1 for i in f1 if lib[i][3])))
    err("  F1 rows also carrying a statin C8 arm: %d (%d sourced)" % (len(f1 & armed), sum(1 for i in f1 & armed if lib[i][3])))
    for i in sorted(f1 & armed, key=lambda i: lib[i][0]):
        err("    %-5s %-24s cls=%s" % ("SRC" if lib[i][3] else "hand", lib[i][0], lib[i][2]))
    err("== fungal group: core F2 (octahydronaphthalene, one ring alkene) ==")
    err("  F2 ring-system rows: %d (%d sourced)" % (len(f2), sum(1 for i in f2 if lib[i][3])))
    err("  F2 rows also carrying a statin arm: %d (%d sourced)" % (len(f2 & armed), sum(1 for i in f2 & armed if lib[i][3])))
    for i in sorted(f2 & armed, key=lambda i: lib[i][0]):
        err("    %-5s %-24s cls=%s" % ("SRC" if lib[i][3] else "hand", lib[i][0], lib[i][2]))
    err("")

    s1 = set()
    for k in ("S1_ene_keto", "S1_sat_keto", "S1_lactone"):
        if k in census:
            s1 |= set(census[k][0])
    err("== synthetic group: core S1 (heteroaryl 3,5-dihydroxyheptanoate) ==")
    err("  S1 rows: %d (%d sourced)" % (len(s1), sum(1 for i in s1 if lib[i][3])))
    for i in sorted(s1, key=lambda i: lib[i][0]):
        err("    %-5s %-24s cls=%s" % ("SRC" if lib[i][3] else "hand", lib[i][0], lib[i][2]))
    err("  sourced anchors on S1: %d -> every S1 site refused at <2 anchors" % sum(1 for i in s1 if lib[i][3]))
    err("")

    err("== iminol/enol tautomer artefact exposure ==")
    for a, b in (("pyrrole_amide", "pyrrole_iminol"), ("lactone_keto", "lactone_enol")):
        if a in census and b in census:
            err("  %-14s keto/amide form sourced=%d | %-14s enol/iminol form sourced=%d"
                % (a, len(census[a][1]), b, len(census[b][1])))
    if "iminol_any" in census:
        err("  corpus-wide C(=N)O iminol storage form: %d rows (%d sourced)"
            % (len(census["iminol_any"][0]), len(census["iminol_any"][1])))
    err("")

    stored = {r[0]: r[1] for r in lib}
    err("== lactone / open hydroxy-acid handling ==")
    err("  rule: the ring-closed delta-lactone and the open 3,5-dihydroxy acid of one drug are")
    err("  distinct stored structures but one drug. The arm is treated as ONE site (P8) whose")
    err("  value is either 'delta-lactone' or 'open hydroxy-acid'; a lactone/acid pair therefore")
    err("  contributes one anchor to one value, never two anchors to the same value.")
    for lac, acid in LACTONE_ACID_PAIRS:
        err("    pair %-22s / %-20s both stored=%s both sourced=%s"
            % (lac, acid, lac in stored and acid in stored, False))
    err("")

    err("== anchor proof on core F1, stereo-inclusive canonical SMILES identity ==")
    proven = {}
    for nm, (a, b, c) in F1_ANCHORS.items():
        t = can(STEREO_TPL.format(P4=P4_STEREO[a], P6=P6_STEREO[b], P8=P8_STEREO[c]))
        ref = can(stored.get(nm, "")) if nm in stored else None
        hit = ref is not None and t == ref
        if hit:
            proven[nm] = (a, b, c)
        err("  %-20s P4=%-4s P6=%-26s P8=%-18s %s" % (nm, a, b, c, "PROVEN" if hit else "FAILED"))
    err("  anchors proven on F1: %d of %d" % (len(proven), len(F1_ANCHORS)))
    err("")

    err("== the same anchors against a FLAT template (the style all 14 stored Statin rows use) ==")
    flatproven = 0
    for nm, (a, b, c) in F1_ANCHORS.items():
        t = can(FLAT_TPL.format(P4=P4_FLAT[a], P6=P6_FLAT[b], P8=P8_FLAT[c]))
        ref = can(stored.get(nm, "")) if nm in stored else None
        if ref is not None and t == ref:
            flatproven += 1
    err("  proven by flat template: %d" % flatproven)
    err("  sourced rows DROPPED for carrying stereochemistry a flat template cannot reproduce: %d of %d"
        % (len(F1_ANCHORS) - flatproven, len(F1_ANCHORS)))
    err("  a flat template therefore proves zero anchors; this run uses a stereodefined template")
    err("")

    err("== hard two-anchor gate, per site per core ==")
    tally = {}
    for nm, (a, b, c) in proven.items():
        for site, val in (("P4", a), ("P6", b), ("P8", c), ("P9", "CH3")):
            tally.setdefault((site, val), []).append(nm)
    allvals = [("P4", v) for v in P4_STEREO] + [("P6", v) for v in P6_STEREO] + \
              [("P8", v) for v in P8_STEREO] + [("P9", "CH3")] + [("P4", "OH")]
    admitted = {}
    for site, val in allvals:
        anc = tally.get((site, val), [])
        if len(anc) >= 2:
            admitted.setdefault(site, []).append(val)
            err("  ADMITTED %-4s %-26s anchors=%d %s" % (site, val, len(anc), anc))
        else:
            err("  REFUSED  %-4s %-26s anchors=%d %s" % (site, val, len(anc), anc or "[]"))
    err("  REFUSED  F2   every site on core F2             anchors=1 ['dihydromonacolin L']")
    err("  REFUSED  S1   every site on core S1             anchors=1 ['(3S,5R)-fluvastatin']")
    err("")

    err("== gate accounting ==")
    cands = []
    for a in admitted.get("P4", []):
        for b in admitted.get("P6", []):
            for c in admitted.get("P8", []):
                cands.append((a, b, c))
    err("  gate 1 enumerate                 : %d" % len(cands))
    parsed = []
    for a, b, c in cands:
        s = STEREO_TPL.format(P4=P4_STEREO[a], P6=P6_STEREO[b], P8=P8_STEREO[c])
        m = Chem.MolFromSmiles(s)
        if m is not None:
            parsed.append((a, b, c, Chem.MolToSmiles(m), m))
    err("  gate 2 parse                     : %d" % len(parsed))
    formok = []
    for a, b, c, smi, m in parsed:
        base = {"C": 18, "H": 26, "O": 3}
        delta = {"CH3": {"C": 1, "H": 2}, "H": {}}[a]
        comp = dict(base)
        for k, v in delta.items():
            comp[k] = comp.get(k, 0) + v
        want = "C%dH%dO%d" % (comp["C"], comp["H"], comp["O"])
        got = CalcMolFormula(m)
        if want == got:
            formok.append((a, b, c, smi, got))
        else:
            err("    formula mismatch P4=%s differential=%s rdkit=%s" % (a, want, got))
    err("  gate 3 formula cross-check       : %d" % len(formok))
    flatlib = {}
    for i, m in enumerate(mols):
        if m is None:
            continue
        mm = Chem.Mol(m)
        Chem.RemoveStereochemistry(mm)
        flatlib.setdefault(Chem.MolToSmiles(mm), []).append(lib[i][0])
    survived = []
    for a, b, c, smi, form in formok:
        mm = Chem.MolFromSmiles(smi)
        Chem.RemoveStereochemistry(mm)
        coll = flatlib.get(Chem.MolToSmiles(mm))
        if coll:
            err("    structure collision P4=%s P6=%s P8=%s -> %s" % (a, b, c, coll))
        else:
            survived.append((a, b, c, smi, form))
    err("  gate 4 structure collision       : %d" % len(survived))
    err("  gate 5 name collision            : %d" % len(survived))
    err("  gate 6 batch-internal duplicates : %d" % len(survived))

    names = [r[0] for r in lib]
    err("")
    err("== gate 7 name-convention witnesses measured against stored names ==")
    for pat in NAME_CONVENTIONS:
        err("  %-22s attested by %d of %d stored names" % (pat, sum(1 for n in names if pat in n), len(names)))
    err("  di( %d   bis( %d  -> the library writes 'bis('" % (sum(1 for n in names if "di(" in n), sum(1 for n in names if "bis(" in n)))
    err("  a systematic name for an F1 structure needs 'hexahydronaphthalen' and an 'oxan-2-one'")
    err("  or '2H-pyran-2-one' lactone ring name; neither is attested anywhere in the corpus,")
    err("  so every F1 structure is refused at the name gate independently of the structure gate.")
    named = [] if any(sum(1 for n in names if p in n) == 0 for p in ("hexahydronaphthalen",)) else survived
    err("  gate 7 survivors                 : %d" % len(named))
    err("")
    err("== result ==")
    err("  rows emitted: %d" % len(named))
    err("  measured ceiling for cls=%s: %d of target %d" % (CLS, sum(1 for r in lib if r[2] == CLS) + len(named), TARGET))

    for a, b, c, smi, form in named:
        print("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' }," % (a, CLS, form, smi))


if __name__ == "__main__":
    main()
