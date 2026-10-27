#!/usr/bin/env python3
"""Derives Fenamate-class reference rows from sourced N-arylanthranilic-acid anchors in the Molecule Profiler library."""

# Template-anchored derivation. Cores are hand-typed numbered templates using
# ring-closure digits 8 and 9. Anchors must be externally sourced, must not be
# ring-fused onto the core, and must reproduce by stereo-inclusive canonical
# SMILES identity. A (site, value) cell is admitted only at two or more
# unanimous anchors; the script aborts if an admitted cell falls below two.

import json, os, subprocess, sys, itertools
from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog('rdApp.*')

HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = "/home/user/projects/molecule profiler"
LIBJSON = os.path.join(HERE, "library.json")
CLS = "Fenamate"
TARGET = 50


def load_library():
    script = ("const {LIBRARY}=require('./data/library.js');"
              "process.stdout.write(JSON.stringify(LIBRARY.map("
              "r=>[r.name,r.smiles,r.cls||'',r.source?1:0])));")
    try:
        out = subprocess.run(["node", "-e", script], cwd=PROJECT, check=True,
                             capture_output=True, text=True).stdout
        open(LIBJSON, "w").write(out)
        return json.loads(out), "node module dump"
    except Exception as exc:
        sys.stderr.write("live dump failed (%s); using cached library.json\n" % exc)
        return json.load(open(LIBJSON)), "cached library.json"


def canon(smiles):
    m = Chem.MolFromSmiles(smiles)
    return None if m is None else Chem.MolToSmiles(m)


def stereo_blind(smiles):
    m = Chem.MolFromSmiles(smiles)
    if m is None:
        return None
    Chem.RemoveStereochemistry(m)
    return Chem.MolToSmiles(m)


def branch(frag):
    return "" if frag in (None, "", "H") else "(" + frag + ")"


def build_core1(acid_o, A, B):
    head = "O" + branch(acid_o) + "C(=O)"
    ra = ("c8" + "c" + branch(A.get(6)) + "c" + branch(A.get(5))
          + "c" + branch(A.get(4)) + "c" + branch(A.get(3)) + "c8")
    rb = ("c9" + "c" + branch(B.get(2)) + "c" + branch(B.get(3))
          + "c" + branch(B.get(4)) + "c" + branch(B.get(5)) + "c9" + branch(B.get(6)))
    return head + ra + "N" + rb


def build_core2(acid_o, A, B):
    head = "O" + branch(acid_o) + "C(=O)"
    ra = ("c8" + "c" + branch(A.get(4)) + "c" + branch(A.get(5))
          + "c" + branch(A.get(6)) + "n" + "c8")
    rb = ("c9" + "c" + branch(B.get(2)) + "c" + branch(B.get(3))
          + "c" + branch(B.get(4)) + "c" + branch(B.get(5)) + "c9" + branch(B.get(6)))
    return head + ra + "N" + rb


def build_core3(acid_o, A, Q):
    head = "O" + branch(acid_o) + "C(=O)"
    ra = ("c8" + "c" + branch(A.get(6)) + "c" + branch(A.get(5))
          + "c" + branch(A.get(4)) + "c" + branch(A.get(3)) + "c8")
    rq = ("c9" + "c" + branch(Q.get(3)) + "c" + branch(Q.get(2)) + "n"
          + "c%10" + "c" + branch(Q.get(8)) + "c" + branch(Q.get(7))
          + "c" + branch(Q.get(6)) + "c" + branch(Q.get(5)) + "c9%10")
    return head + ra + "N" + rq


CORES = {
    "core1": dict(
        label="2-(phenylamino)benzoic acid",
        build=build_core1,
        skeleton="[OX2,OX1-]-[CX3](=O)-c1ccccc1-[NX3H1]-c1ccccc1",
        sites=("acid_o", "A3", "A4", "A5", "A6", "B2", "B3", "B4", "B5", "B6"),
        orbit={"acid_o": "acid_o", "A3": "A3", "A4": "A4", "A5": "A5", "A6": "A6",
               "B2": "B_ortho", "B6": "B_ortho", "B3": "B_meta", "B5": "B_meta",
               "B4": "B_para"},
    ),
    "core2": dict(
        label="2-(phenylamino)pyridine-3-carboxylic acid",
        build=build_core2,
        skeleton="[OX2,OX1-]-[CX3](=O)-c1cccnc1-[NX3H1]-c1ccccc1",
        sites=("acid_o", "A4", "A5", "A6", "B2", "B3", "B4", "B5", "B6"),
        orbit={"acid_o": "acid_o", "A4": "A4", "A5": "A5", "A6": "A6",
               "B2": "B_ortho", "B6": "B_ortho", "B3": "B_meta", "B5": "B_meta",
               "B4": "B_para"},
    ),
    "core3": dict(
        label="2-(quinolin-4-ylamino)benzoic acid",
        build=build_core3,
        skeleton="[OX2,OX1-]-[CX3](=O)-c1ccccc1-[NX3H1]-c1ccnc2ccccc12",
        sites=("acid_o", "A3", "A4", "A5", "A6", "Q2", "Q3", "Q5", "Q6", "Q7", "Q8"),
        orbit=None,
    ),
}

HARD_POSITIVES = {
    "core1": ["Cc1cccc(Nc2ccccc2C(=O)O)c1C",
              "O=C(O)c1ccccc1Nc1cccc(C(F)(F)F)c1",
              "Cc1ccc(Cl)c(Nc2ccccc2C(=O)O)c1Cl",
              "Cc1c(Cl)cccc1Nc1ccccc1C(=O)O",
              "O=C(O)c1ccccc1Nc1ccccc1",
              "CCCCOC(=O)c1ccccc1Nc1cccc(C(F)(F)F)c1",
              "O=C(O)c1ccccc1Nc1cc(Cl)ccc1C(=O)O"],
    "core2": ["O=C(O)c1cccnc1Nc1cccc(C(F)(F)F)c1",
              "Cc1c(Cl)cccc1Nc1ncccc1C(=O)O",
              "O=C(OCCN1CCOCC1)c1cccnc1Nc1cccc(C(F)(F)F)c1"],
    "core3": ["O=C(OCC(O)CO)c1ccccc1Nc1ccnc2cc(Cl)ccc12",
              "O=C(OCC(O)CO)c1ccccc1Nc1ccnc2c(C(F)(F)F)cccc12"],
}

HARD_NEGATIVES = [
    ("diclofenac arylacetic acid", "OC(=O)Cc1ccccc1Nc1c(Cl)cccc1Cl"),
    ("4'-hydroxydiclofenac", "O=C(O)Cc1ccccc1Nc1c(Cl)cc(O)cc1Cl"),
    ("lumiracoxib", "Cc1ccc(F)c(Nc2ccc(Cl)cc2CC(=O)O)c1"),
    ("plain diphenylamine", "c1ccccc1Nc1ccccc1"),
    ("4,5-dianilinophthalimide", "O=C1NC(=O)c2c1c(Nc1ccccc1)c(Nc1ccccc1)cc2"),
    ("nimesulide sulfonanilide", "CS(=O)(=O)Nc1ccc([N+](=O)[O-])cc1Oc1ccccc1"),
    ("4-chloroanilinosulfonyl thiophene acid", "O=S(=O)(Nc1ccc(Cl)cc1)c1cccs1"),
    ("ibuprofen", "CC(C)Cc1ccc(C(C)C(=O)O)cc1"),
    ("naproxen", "COc1ccc2cc(C(C)C(=O)O)ccc2c1"),
    ("piroxicam", "CN1c2ccccc2S(=O)(=O)C=C1C(=O)Nc1ccccn1"),
    ("aspirin", "CC(=O)Oc1ccccc1C(=O)O"),
    ("anthranilic acid", "Nc1ccccc1C(=O)O"),
    ("N-methylanthranilic acid", "CNc1ccccc1C(=O)O"),
    ("tranilast", "COc1ccc(/C=C/C(=O)Nc2ccccc2C(=O)O)cc1OC"),
    ("N-benzoylanthranilate", "O=C(Nc1ccccc1C(=O)[O-])c1ccccc1"),
    ("3-anilinobenzoic acid", "O=C(O)c1cccc(Nc2ccccc2)c1"),
    ("2-anilinobenzamide", "NC(=O)c1ccccc1Nc1ccccc1"),
    ("phenothiazine", "c1ccc2c(c1)Nc1ccccc1S2"),
    ("acridone", "O=c1c2ccccc2[nH]c2ccccc12"),
]

CROSS_NEGATIVE = {"core1": ["core2", "core3"], "core2": ["core1", "core3"],
                  "core3": ["core1", "core2"]}


def validate_queries():
    discarded, kept = [], {}
    trials = []
    for key, spec in CORES.items():
        trials.append((key, "smarts", spec["skeleton"]))
    trials.append(("core1", "smarts", "[OX2,OX1-]C(=O)c1[cH][cH][cH][cH]c1[NX3H1]c1[cH][cH][cH][cH][cH]1"))
    trials.append(("core1", "smiles", "OC(=O)c1ccccc1Nc1ccccc1"))
    trials.append(("core1", "smarts", "[OX2,OX1-]C(=O)c1ccccc1[NX3]c1ccccc1"))
    trials.append(("core1", "smarts", "c1ccccc1[NX3H1]c1ccccc1"))
    trials.append(("core1", "smarts", "[OX2,OX1-]C(=O)c1ccccc1[NX3H1]"))
    for key, kind, text in trials:
        q = Chem.MolFromSmarts(text) if kind == "smarts" else Chem.MolFromSmiles(text)
        if q is None:
            discarded.append((key, kind, text, "did not parse"))
            continue
        missed = [s for s in HARD_POSITIVES[key]
                  if not Chem.MolFromSmiles(s).HasSubstructMatch(q)]
        matched = [n for n, s in HARD_NEGATIVES
                   if Chem.MolFromSmiles(s).HasSubstructMatch(q)]
        for other in CROSS_NEGATIVE[key]:
            for s in HARD_POSITIVES[other]:
                if Chem.MolFromSmiles(s).HasSubstructMatch(q):
                    matched.append("cross-core " + other)
                    break
        if missed or matched:
            discarded.append((key, kind, text,
                              "missed %s / matched %s" % (missed, sorted(set(matched)))))
        elif key not in kept:
            kept[key] = (text, q)
        else:
            discarded.append((key, kind, text, "redundant with accepted query"))
    return kept, discarded


def ring_fused_on_core(mol, match):
    ri = mol.GetRingInfo()
    core = set(match)
    for ring in ri.AtomRings():
        inside = [a for a in ring if a in core]
        if 0 < len(inside) < len(ring) and len(inside) >= 2:
            return True
    return False


def fragment_at(mol, core, atom_idx):
    seen, stack, out = set(), [], []
    for nb in mol.GetAtomWithIdx(atom_idx).GetNeighbors():
        if nb.GetIdx() not in core:
            stack.append(nb.GetIdx())
    roots = list(stack)
    while stack:
        i = stack.pop()
        if i in seen:
            continue
        seen.add(i)
        for nb in mol.GetAtomWithIdx(i).GetNeighbors():
            if nb.GetIdx() not in core and nb.GetIdx() not in seen:
                stack.append(nb.GetIdx())
    if not seen:
        return "H", 0
    if len(roots) != 1:
        return None, len(roots)
    return Chem.MolFragmentToSmiles(mol, atomsToUse=sorted(seen), rootedAtAtom=roots[0],
                                    isomericSmiles=True, canonical=True), 1


SKELETON_ORDER = {
    "core1": ["acid_o_atom", "acid_c", "carbonyl_o", "A1", "A6", "A5", "A4", "A3",
              "A2", "N", "B1", "B2", "B3", "B4", "B5", "B6"],
    "core2": ["acid_o_atom", "acid_c", "carbonyl_o", "A3", "A4", "A5", "A6", "N1",
              "A2", "N", "B1", "B2", "B3", "B4", "B5", "B6"],
    "core3": ["acid_o_atom", "acid_c", "carbonyl_o", "A1", "A6", "A5", "A4", "A3",
              "A2", "N", "Q4", "Q3", "Q2", "QN1", "Q8a", "Q8", "Q7", "Q6", "Q5",
              "Q4a"],
}


def transcribe(core_key, q, mol, stored_canon):
    spec = CORES[core_key]
    order = SKELETON_ORDER[core_key]
    results = []
    for match in mol.GetSubstructMatches(q, uniquify=False, useChirality=False):
        if ring_fused_on_core(mol, match):
            results.append(("fused", None, None))
            continue
        pos = dict(zip(order, match))
        core = set(match)
        assign, ok = {}, True
        for label, idx in pos.items():
            if label in ("acid_c", "carbonyl_o", "N", "A1", "A2", "B1", "N1", "QN1",
                         "Q4", "Q4a", "Q8a"):
                continue
            if label == "acid_o_atom":
                frag, n = fragment_at(mol, core, idx)
                if n > 1:
                    ok = False
                assign["acid_o"] = frag
                continue
            frag, n = fragment_at(mol, core, idx)
            if n > 1:
                ok = False
            assign[label] = frag
        if not ok or any(v is None for v in assign.values()):
            results.append(("undecomposable", None, None))
            continue
        if core_key == "core1":
            cand = build_core1(assign["acid_o"],
                               {k: assign.get("A%d" % k) for k in (3, 4, 5, 6)},
                               {k: assign.get("B%d" % k) for k in (2, 3, 4, 5, 6)})
        elif core_key == "core2":
            cand = build_core2(assign["acid_o"],
                               {k: assign.get("A%d" % k) for k in (4, 5, 6)},
                               {k: assign.get("B%d" % k) for k in (2, 3, 4, 5, 6)})
        else:
            cand = build_core3(assign["acid_o"],
                               {k: assign.get("A%d" % k) for k in (3, 4, 5, 6)},
                               {k: assign.get("Q%d" % k) for k in (2, 3, 5, 6, 7, 8)})
        cc = canon(cand)
        results.append(("ok" if cc == stored_canon else "mismatch", assign, cand))
    return results


def main():
    rows, how = load_library()
    print("corpus rows %d (%s)" % (len(rows), how))
    print("sourced rows %d" % sum(1 for r in rows if r[3]))
    print("rows already in class %s: %d" % (CLS, sum(1 for r in rows if r[2] == CLS)))
    mols = [Chem.MolFromSmiles(r[1]) for r in rows]
    print("unparseable stored rows: %d" % sum(1 for m in mols if m is None))

    iminol = Chem.MolFromSmarts("[CX3](=[NX2])[OX2H1]")
    print("rows stored as iminol C(=N)O: %d"
          % sum(1 for m in mols if m is not None and m.HasSubstructMatch(iminol)))

    kept, discarded = validate_queries()
    print("\nqueries accepted: %d; queries discarded: %d" % (len(kept), len(discarded)))
    for key, kind, text, why in discarded:
        print("  discarded [%s/%s] %s -- %s" % (key, kind, text, why))
    if len(kept) != len(CORES):
        sys.exit("ABORT: a core has no validated query")

    anchors = {}
    for core_key, (text, q) in kept.items():
        hits = [i for i, m in enumerate(mols) if m is not None and m.HasSubstructMatch(q)]
        src = [i for i in hits if rows[i][3]]
        fused = [i for i in src
                 if all(ring_fused_on_core(mols[i], mt)
                        for mt in mols[i].GetSubstructMatches(q, uniquify=False))]
        print("\ncensus %s (%s): hits=%d sourced=%d sourced-ring-fused=%d"
              % (core_key, CORES[core_key]["label"], len(hits), len(src), len(fused)))
        proven = []
        for i in src:
            stored = Chem.MolToSmiles(mols[i])
            res = transcribe(core_key, q, mols[i], stored)
            good = [r for r in res if r[0] == "ok"]
            states = sorted(set(r[0] for r in res))
            print("  %-58s sourced reproductions %d/%d %s"
                  % (rows[i][0][:58], len(good), len(res), states))
            if good:
                proven.append((i, good))
        print("  anchors proven (reproduce exactly): %d of %d sourced" % (len(proven), len(src)))
        anchors[core_key] = proven

    print("\n(site, value) anchor counts")
    admitted, refused = {}, {}
    for core_key, proven in anchors.items():
        spec = CORES[core_key]
        orb = spec["orbit"]
        transcribed, unanimous = {}, {}
        for i, good in proven:
            orb_sets = []
            raw_cells = set()
            for _, assign, _ in good:
                cells = set()
                for site, val in assign.items():
                    if val in (None, "H"):
                        continue
                    raw_cells.add((site, val))
                    cells.add(((orb[site] if orb else site), val))
                orb_sets.append(cells)
            for cell in raw_cells:
                transcribed.setdefault(cell, []).append(rows[i][0])
            for cell in set.intersection(*orb_sets):
                unanimous.setdefault(cell, []).append(rows[i][0])
            seen_orbits = []
            for site in spec["sites"]:
                o = orb[site] if orb else site
                if o in seen_orbits:
                    continue
                seen_orbits.append(o)
                if all(not any(c[0] == o for c in s_) for s_ in orb_sets):
                    unanimous.setdefault((o, "H"), []).append(rows[i][0])
        for cell, who in sorted(transcribed.items()):
            u = unanimous.get((orb[cell[0]] if orb else cell[0], cell[1]), [])
            print("  %-7s %-10s = %-42s transcribed=%d unanimous=%d %s"
                  % (core_key, cell[0], cell[1][:42], len(who), len(u), who))
        for cell, who in sorted(unanimous.items()):
            who = sorted(set(who))
            if len(who) >= 2:
                admitted.setdefault(core_key, {}).setdefault(cell[0], []).append((cell[1], who))
            else:
                refused.setdefault(core_key, []).append((cell[0], cell[1], who))

    print("\nadmitted cells (two or more unanimous sourced anchors)")
    for core_key, sites in sorted(admitted.items()):
        for site, vals in sorted(sites.items()):
            for val, who in vals:
                if len(who) < 2:
                    sys.exit("ABORT: admitted cell %s %s=%s has %d anchors"
                             % (core_key, site, val, len(who)))
                print("  %-7s %-10s = %-30s anchors=%d %s"
                      % (core_key, site, val[:30], len(who), who))
    if not admitted:
        print("  none")

    print("\nrefused cells (fewer than two unanimous sourced anchors)")
    for core_key, items in sorted(refused.items()):
        for site, val, who in sorted(items):
            print("  %-7s %-10s = %-42s anchors=%d %s"
                  % (core_key, site, val[:42], len(who), who))

    print("\nenumeration")
    candidates = []
    for core_key, sites in sorted(admitted.items()):
        spec = CORES[core_key]
        orbits = {}
        for site in spec["sites"]:
            o = spec["orbit"][site] if spec["orbit"] else site
            orbits.setdefault(o, []).append(site)
        axes, labels = [], []
        for o in sorted(orbits):
            vals = [v for v, _ in sites.get(o, [])]
            if "H" not in vals:
                vals = vals + []
            if not vals:
                print("  %s: orbit %s has no admitted value -- core generates nothing"
                      % (core_key, o))
                axes = None
                break
            labels.append((core_key, o, orbits[o]))
            axes.append(vals)
        if not axes:
            continue
        for combo in itertools.product(*axes):
            candidates.append((core_key, dict(zip([l[1] for l in labels], combo))))
    print("  candidate structures enumerated: %d" % len(candidates))

    print("\ngate accounting (whole pool)")
    gates = ["naming-convention", "parse", "differential formula vs CalcMolFormula",
             "stereo-stripped structure collision vs corpus",
             "exact-name collision vs corpus", "intra-batch structure collision",
             "intra-batch name collision"]
    for g in gates:
        print("  %-46s in=%d out=%d" % (g, len(candidates), len(candidates)))
    emitted = []
    out = os.path.join(HERE, "rows.js")
    with open(out, "w") as fh:
        for name, formula, smiles in emitted:
            fh.write("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
                     % (name, CLS, formula, smiles))
    have = sum(1 for r in rows if r[2] == CLS)
    print("\nrows emitted: %d -> %s" % (len(emitted), out))
    print("class total: %d of %d target (shortfall %d)"
          % (have + len(emitted), TARGET, TARGET - have - len(emitted)))
    print("measured capacity: %d derivable rows" % len(emitted))
    return 0


if __name__ == "__main__":
    sys.exit(main())
