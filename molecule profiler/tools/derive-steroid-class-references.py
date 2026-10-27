#!/usr/bin/env python3
"""Derive Steroid reference rows from library-attested substituents.

Three independent steroid cores, each carrying its own locant map, its own set of
externally sourced anchors and its own slot tables.  A (site, core) pair is used
only when at least two sourced rows are reproduced from the template with
stereo-inclusive canonical SMILES identity, and a slot value is used only at the
exact site and core where a proven anchor carries it.  Row data goes to stdout;
every count and refusal goes to stderr.
"""

import json
import re
import subprocess
import sys
import itertools
from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")

ROOT = "/home/user/projects/molecule profiler"
DUMP = "const {LIBRARY}=require('./data/library.js');process.stdout.write(JSON.stringify(LIBRARY.map(r=>[r.name,r.cls||'',r.smiles,!!r.source])))"
CLS = "Steroid"
TARGET = 50

ATOM = re.compile(r"([A-Z][a-z]?)(\d*)")
LETTERS = re.compile(r"[^a-z]")
MULT = {1: "", 2: "di", 3: "tri", 4: "tetra", 5: "penta"}

A4 = {
    "template": "{C19}[C@]12CCC(=O){C4}=C1{C6}{C7}[C@@H]3[C@@H]2{C11}C[C@@]4(C)[C@H]3C{C16}{C17}",
    "nulls": {"C19": "C", "C4": "C", "C6": "C", "C7": "C", "C11": "C", "C16": "C", "C17": "C4"},
    "stems": {"androstane": "androst-4-ene", "pregnane": "pregn-4-ene", "cholestane": "cholest-4-ene"},
    "nullform": {"C19": "CH3", "C4": "CH", "C6": "CH2", "C7": "CH2", "C11": "CH2", "C16": "CH2", "C17": "CH2"},
    "base": [(3, "3", "one")],
    "order": ["C17", "C11", "C7", "C16", "C19", "C4", "C6"],
    "tables": {
        "C17": [
            ("C4=O", "CO", "androstane", [], [(17, "17", "one")]),
            ("[C@@H]4O", "CH2O", "androstane", [], [(17, "17beta", "ol")]),
            ("[C@]4(C)O", "C2H4O", "androstane", [(17, "17alpha", "methyl")], [(17, "17beta", "ol")]),
            ("[C@@H]4C(C)=O", "C3H4O", "pregnane", [], [(20, "20", "one")]),
            ("[C@]4(O)C(C)=O", "C3H4O2", "pregnane", [(17, "17alpha", "hydroxy")], [(20, "20", "one")]),
            ("[C@@H]4C(=O)CO", "C3H4O2", "pregnane", [(21, "21", "hydroxy")], [(20, "20", "one")]),
            ("[C@]4(O)C(=O)CO", "C3H4O3", "pregnane", [(17, "17alpha", "hydroxy"), (21, "21", "hydroxy")], [(20, "20", "one")]),
            ("[C@@H]4[C@H](C)CCCC(C)C", "C9H18", "cholestane", [], []),
        ],
        "C11": [
            ("C", "CH2", None, [], []),
            ("[C@@H](O)", "CH2O", None, [(11, "11beta", "hydroxy")], []),
            ("[C@H](O)", "CH2O", None, [(11, "11alpha", "hydroxy")], []),
        ],
        "C7": [
            ("C", "CH2", None, [], []),
            ("[C@@H](O)", "CH2O", None, [(7, "7alpha", "hydroxy")], []),
            ("[C@H](C)", "C2H4", None, [(7, "7alpha", "methyl")], []),
        ],
        "C16": [
            ("C", "CH2", None, [], []),
            ("[C@@H](O)", "CH2O", None, [(16, "16alpha", "hydroxy")], []),
        ],
        "C19": [
            ("C", "CH3", None, [], []),
            ("OC", "CH3O", None, [(19, "19", "hydroxy")], []),
        ],
        "C4": [
            ("C", "CH", None, [], []),
            ("C(O)", "CHO", None, [(4, "4", "hydroxy")], []),
            ("C(Cl)", "CCl", None, [(4, "4", "chloro")], []),
        ],
        "C6": [
            ("C", "CH2", None, [], []),
            ("[C@@H](C(F)(F)F)", "C2HF3", None, [(6, "6alpha", "(trifluoromethyl)")], []),
        ],
    },
    "anchors": {
        "androst-4-ene-3,17-dione": {"C17": "C4=O"},
        "19-hydroxyandrost-4-ene-3,17-dione": {"C19": "OC", "C17": "C4=O"},
        "11beta-hydroxyandrost-4-ene-3,17-dione": {"C11": "[C@@H](O)", "C17": "C4=O"},
        "16alpha-hydroxyandrost-4-ene-3,17-dione": {"C16": "[C@@H](O)", "C17": "C4=O"},
        "7alpha-hydroxyandrost-4-ene-3,17-dione": {"C7": "[C@@H](O)", "C17": "C4=O"},
        "19-hydroxytestosterone": {"C19": "OC", "C17": "[C@@H]4O"},
        "7alpha -hydroxytestosterone": {"C7": "[C@@H](O)", "C17": "[C@@H]4O"},
        "methyltestosterone": {"C17": "[C@]4(C)O"},
        "calusterone": {"C7": "[C@H](C)", "C17": "[C@]4(C)O"},
        "oxymesterone": {"C4": "C(O)", "C17": "[C@]4(C)O"},
        "11alpha-hydroxyprogesterone": {"C11": "[C@H](O)", "C17": "[C@@H]4C(C)=O"},
        "11beta-hydroxyprogesterone": {"C11": "[C@@H](O)", "C17": "[C@@H]4C(C)=O"},
        "16alpha-hydroxyprogesterone": {"C16": "[C@@H](O)", "C17": "[C@@H]4C(C)=O"},
        "17alpha-hydroxyprogesterone": {"C17": "[C@]4(O)C(C)=O"},
        "21-deoxycortisol": {"C11": "[C@@H](O)", "C17": "[C@]4(O)C(C)=O"},
        "algestone": {"C16": "[C@@H](O)", "C17": "[C@]4(O)C(C)=O"},
        "desoxycortone": {"C17": "[C@@H]4C(=O)CO"},
        "cortisol": {"C11": "[C@@H](O)", "C17": "[C@]4(O)C(=O)CO"},
        "11-deoxycortisol": {"C17": "[C@]4(O)C(=O)CO"},
        "cholest-4-en-3-one": {"C17": "[C@@H]4[C@H](C)CCCC(C)C"},
        "7alpha-hydroxycholest-4-en-3-one": {"C7": "[C@@H](O)", "C17": "[C@@H]4[C@H](C)CCCC(C)C"},
        "flumedroxone": {"C6": "[C@@H](C(F)(F)F)", "C17": "[C@]4(O)C(C)=O"},
        "flumedroxone acetate": {"C6": "[C@@H](C(F)(F)F)", "C17": "[C@]4(OC(C)=O)C(C)=O"},
        "clostebol acetate": {"C4": "C(Cl)", "C17": "[C@@H]4OC(C)=O"},
    },
    "witness": {
        "androst-4-ene-3,17-dione": "androst-4-ene-3,17-dione",
        "11beta-hydroxyandrost-4-ene-3,17-dione": "11beta-hydroxyandrost-4-ene-3,17-dione",
        "16alpha-hydroxyandrost-4-ene-3,17-dione": "16alpha-hydroxyandrost-4-ene-3,17-dione",
        "7alpha-hydroxyandrost-4-ene-3,17-dione": "7alpha-hydroxyandrost-4-ene-3,17-dione",
        "19-hydroxyandrost-4-ene-3,17-dione": "19-hydroxyandrost-4-ene-3,17-dione",
        "cholest-4-en-3-one": "cholest-4-en-3-one",
        "7alpha-hydroxycholest-4-en-3-one": "7alpha-hydroxycholest-4-en-3-one",
    },
}

E3 = {
    "template": "C[C@]12C{C11}[C@@H]3c4c{C2}c({O3})cc4{C6}{C7}[C@H]3[C@@H]1C{C16}{C17}",
    "nulls": {"C11": "C", "C2": "c", "O3": "O", "C6": "C", "C7": "C", "C16": "C", "C17": "C2"},
    "stems": {"estrane": "estra-1,3,5(10)-triene"},
    "nullform": {"C11": "CH2", "C2": "CH", "O3": "HO", "C6": "CH2", "C7": "CH2", "C16": "CH2", "C17": "CH2"},
    "base": [],
    "order": ["C17", "O3", "C16", "C2"],
    "tables": {
        "C17": [
            ("C2=O", "CO", "estrane", [], [(17, "17", "one")]),
            ("[C@@H]2O", "CH2O", "estrane", [], [(17, "17beta", "ol")]),
            ("[C@H]2O", "CH2O", "estrane", [], [(17, "17alpha", "ol")]),
            ("[C@@]2(O)C#C", "C3H2O", "estrane", [(17, "17alpha", "ethynyl")], [(17, "17beta", "ol")]),
            ("[C@@H]2OC", "C2H4O", "estrane", [(17, "17beta", "methoxy")], []),
        ],
        "O3": [
            ("O", "HO", None, [], [(3, "3", "ol")]),
            ("OC", "CH3O", None, [(3, "3", "methoxy")], []),
            ("OCCC", "C3H7O", None, [(3, "3", "propoxy")], []),
            ("OC5CCCC5", "C5H9O", None, [(3, "3", "cyclopentyloxy")], []),
        ],
        "C16": [
            ("C", "CH2", None, [], []),
            ("[C@@H](O)", "CH2O", None, [], [(16, "16alpha", "ol")]),
        ],
        "C2": [
            ("c", "CH", None, [], []),
            ("c(O)", "CHO", None, [], [(2, "2", "ol")]),
            ("c(OC)", "C2H3O", None, [(2, "2", "methoxy")], []),
        ],
    },
    "anchors": {
        "17beta-estradiol": {"C17": "[C@@H]2O"},
        "17alpha-estradiol": {"C17": "[C@H]2O"},
        "16alpha-hydroxyestrone": {"C16": "[C@@H](O)", "C17": "C2=O"},
        "2-hydroxyestrone": {"C2": "c(O)", "C17": "C2=O"},
        "2-hydroxy-17beta-estradiol": {"C2": "c(O)", "C17": "[C@@H]2O"},
        "2-methoxy-17beta-estradiol": {"C2": "c(OC)", "C17": "[C@@H]2O"},
        "17alpha-ethynylestradiol": {"C17": "[C@@]2(O)C#C"},
        "epimestrol": {"O3": "OC", "C16": "[C@@H](O)", "C17": "[C@H]2O"},
        "mytatrienediol": {"O3": "OC", "C16": "[C@](C)(O)", "C17": "[C@@H]2O"},
        "promestriene": {"O3": "OCCC", "C17": "[C@@H]2OC"},
        "17-epiestriol": {"C16": "[C@@H](O)", "C17": "[C@H]2O"},
        "quinestradol": {"O3": "OC5CCCC5", "C16": "[C@@H](O)", "C17": "[C@@H]2O"},
    },
    "witness": {
        "2-hydroxyestrone": "2,3-dihydroxyestra-1,3,5(10)-trien-17-one",
    },
}

A5 = {
    "template": "{C19}[C@]12{C1}{C2}{C3}{C4}[C@@H]1{C6}{C7}[C@@H]3[C@@H]2{C11}C[C@@]4(C)[C@H]3C{C16}{C17}",
    "nulls": {"C19": "C", "C1": "C", "C2": "C", "C3": "C", "C4": "C", "C6": "C", "C7": "C", "C11": "C", "C16": "C", "C17": "C4"},
    "stems": {"androstane": "5alpha-androstane", "pregnane": "5alpha-pregnane", "cholestane": "5alpha-cholestane", "cholane": "5alpha-cholane"},
    "nullform": {"C19": "CH3", "C1": "CH2", "C2": "CH2", "C3": "CH2", "C4": "CH2", "C6": "CH2", "C7": "CH2", "C11": "CH2", "C16": "CH2", "C17": "CH2"},
    "base": [],
    "order": ["C17", "C3", "C2", "C11"],
    "tables": {
        "C17": [
            ("C4", "CH2", "androstane", [], []),
            ("C4=O", "CO", "androstane", [], [(17, "17", "one")]),
            ("[C@@H]4O", "CH2O", "androstane", [], [(17, "17beta", "ol")]),
            ("[C@]4(C)O", "C2H4O", "androstane", [(17, "17alpha", "methyl")], [(17, "17beta", "ol")]),
            ("[C@@H]4CC", "C3H6", "pregnane", [], []),
            ("[C@@H]4C(C)=O", "C3H4O", "pregnane", [], [(20, "20", "one")]),
            ("[C@]4(O)C(=O)CO", "C3H4O3", "pregnane", [(17, "17alpha", "hydroxy"), (21, "21", "hydroxy")], [(20, "20", "one")]),
            ("[C@@H]4[C@H](C)CCC", "C6H12", "cholane", [], []),
            ("[C@@H]4[C@H](C)CCCC(C)C", "C9H18", "cholestane", [], []),
        ],
        "C3": [
            ("C", "CH2", None, [], []),
            ("C(=O)", "CO", None, [], [(3, "3", "one")]),
            ("[C@H](O)", "CH2O", None, [], [(3, "3beta", "ol")]),
            ("[C@@H](O)", "CH2O", None, [], [(3, "3alpha", "ol")]),
        ],
        "C2": [
            ("C", "CH2", None, [], []),
            ("[C@@H](C)", "C2H4", None, [(2, "2alpha", "methyl")], []),
        ],
        "C11": [
            ("C", "CH2", None, [], []),
            ("C(=O)", "CO", None, [], [(11, "11", "one")]),
        ],
    },
    "anchors": {
        "5alpha-androstane": {},
        "5alpha-androstane-3,17-dione": {"C3": "C(=O)", "C17": "C4=O"},
        "androstanolone": {"C3": "C(=O)", "C17": "[C@@H]4O"},
        "5alpha-androstane-3beta,17beta-diol": {"C3": "[C@H](O)", "C17": "[C@@H]4O"},
        "mestanolone": {"C3": "C(=O)", "C17": "[C@]4(C)O"},
        "5alpha-pregnane": {"C17": "[C@@H]4CC"},
        "5alpha-cholane": {"C17": "[C@@H]4[C@H](C)CCC"},
        "5alpha-pregnane-3,20-dione": {"C3": "C(=O)", "C17": "[C@@H]4C(C)=O"},
        "3beta-hydroxy-5alpha-pregnan-20-one": {"C3": "[C@H](O)", "C17": "[C@@H]4C(C)=O"},
        "5alpha-cholestan-3-one": {"C3": "C(=O)", "C17": "[C@@H]4[C@H](C)CCCC(C)C"},
        "epidihydrocholesterin": {"C3": "[C@@H](O)", "C17": "[C@@H]4[C@H](C)CCCC(C)C"},
        "drostanolone propionate": {"C2": "[C@@H](C)", "C3": "C(=O)", "C17": "[C@@H]4OC(=O)CC"},
        "metholone": {"C2": "[C@@H](C)", "C3": "C(=O)", "C17": "[C@@H]4O"},
        "alfaxalone": {"C3": "[C@@H](O)", "C11": "C(=O)", "C17": "[C@@H]4C(C)=O"},
        "4,5alpha-dihydrocortisone": {"C3": "C(=O)", "C11": "C(=O)", "C17": "[C@]4(O)C(=O)CO"},
        "alfadolone acetate": {"C3": "[C@@H](O)", "C11": "C(=O)", "C17": "[C@@H]4C(=O)COC(C)=O"},
    },
    "witness": {
        "5alpha-androstane": "5alpha-androstane",
        "5alpha-androstane-3,17-dione": "5alpha-androstane-3,17-dione",
        "5alpha-androstane-3beta,17beta-diol": "5alpha-androstane-3beta,17beta-diol",
        "5alpha-pregnane": "5alpha-pregnane",
        "5alpha-cholane": "5alpha-cholane",
        "5alpha-pregnane-3,20-dione": "5alpha-pregnane-3,20-dione",
        "3beta-hydroxy-5alpha-pregnan-20-one": "3beta-hydroxy-5alpha-pregnan-20-one",
        "5alpha-cholestan-3-one": "5alpha-cholestan-3-one",
    },
}

CORES = [("androst-4-en-3-one", A4), ("estra-1,3,5(10)-trien-3-ol", E3), ("5alpha-androstane", A5)]


def parse_formula(text):
    tally = {}
    for sym, num in ATOM.findall(text):
        tally[sym] = tally.get(sym, 0) + (int(num) if num else 1)
    return tally


def render_formula(tally):
    out = ""
    for sym in ["C", "H"] + sorted(s for s in tally if s not in ("C", "H")):
        n = tally.get(sym, 0)
        if n:
            out += sym + (str(n) if n > 1 else "")
    return out


def add_formula(tally, text, sign):
    for sym, n in parse_formula(text).items():
        tally[sym] = tally.get(sym, 0) + sign * n
    return tally


def canonical(smiles):
    mol = Chem.MolFromSmiles(smiles)
    return Chem.MolToSmiles(mol) if mol else None


def flat(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    Chem.RemoveStereochemistry(mol)
    return Chem.MolToSmiles(mol)


def build(core, vals):
    slots = dict(core["nulls"])
    slots.update(vals)
    return core["template"].format(**slots)


def lookup(core, site, value):
    for row in core["tables"][site]:
        if row[0] == value:
            return row
    return None


def name_of(core, vals):
    prefixes = []
    suffixes = list(core["base"])
    series = "androstane"
    for site in core["order"]:
        row = lookup(core, site, vals.get(site, core["nulls"][site]))
        if row is None:
            return None
        if row[2]:
            series = row[2]
        prefixes.extend(row[3])
        suffixes.extend(row[4])
    ones = [s for s in suffixes if s[2] == "one"]
    ols = [s for s in suffixes if s[2] == "ol"]
    if ones:
        prefixes.extend((n, loc, "hydroxy") for n, loc, _ in ols)
        chosen, kind = ones, "one"
    else:
        chosen, kind = ols, "ol"
    stem = core["stems"][series]
    groups = {}
    for n, loc, text in prefixes:
        groups.setdefault(text, []).append((n, loc))
    parts = []
    for text in sorted(groups, key=lambda t: LETTERS.sub("", t.lower())):
        locs = sorted(groups[text])
        parts.append(",".join(l for _, l in locs) + "-" + MULT[len(locs)] + text)
    head = "-".join(parts)
    if head and stem[0].isdigit():
        head += "-"
    if not chosen:
        return head + stem
    chosen = sorted(chosen)
    locs = ",".join(l for _, l, _ in chosen)
    if len(chosen) == 1:
        tail = stem[:-1] + "-" + locs + "-" + kind
    else:
        tail = stem + "-" + locs + "-" + MULT[len(chosen)] + kind
    return (head + tail) if head else tail


def combos(core):
    sites = core["order"]
    pools = [core["tables"][s] for s in sites]
    out = []
    for picks in itertools.product(*[range(len(p)) for p in pools]):
        vals = {}
        depth = 0
        for site, pool, i in zip(sites, pools, picks):
            value = pool[i][0]
            vals[site] = value
            if value != core["nulls"][site]:
                depth += 1
        out.append((depth, picks, vals))
    out.sort(key=lambda t: (t[0], t[1]))
    return out


def main():
    raw = subprocess.run(["node", "-e", DUMP], cwd=ROOT, capture_output=True, check=True).stdout
    table = json.loads(raw)
    lib = {}
    sourced = set()
    for name, cls, smiles, is_sourced in table:
        lib[name] = (cls, smiles)
        if is_sourced:
            sourced.add(name)
    log = sys.stderr
    print("library rows %d (sourced %d)" % (len(table), len(sourced)), file=log)

    lib_flat = {}
    lib_names = set()
    for name, cls, smiles, _ in table:
        lib_names.add(name.casefold())
        f = flat(smiles)
        if f:
            lib_flat.setdefault(f, name)
    stored = sum(1 for r in table if r[1] == CLS)
    print("stored %s rows %d" % (CLS, stored), file=log)

    fails = []
    for label, core in CORES:
        proven = {}
        for anchor, vals in core["anchors"].items():
            if anchor not in lib:
                fails.append("%s: anchor %s absent from library" % (label, anchor))
                continue
            if anchor not in sourced:
                fails.append("%s: anchor %s is not externally sourced" % (label, anchor))
                continue
            got = canonical(build(core, vals))
            want = canonical(lib[anchor][1])
            if got is None or got != want:
                fails.append("%s: anchor %s not reproduced" % (label, anchor))
                continue
            for site, value in vals.items():
                if value != core["nulls"].get(site):
                    proven.setdefault(site, []).append(anchor)
        core["proven"] = proven
        for site in core["order"]:
            got = proven.get(site, [])
            if len(got) < 2:
                fails.append("%s: site %s has %d proven anchor(s), refused" % (label, site, len(got)))
            print("%s site %-4s anchors %d: %s" % (label, site, len(got), ", ".join(sorted(got))), file=log)
        anchored = {}
        for anchor, vals in core["anchors"].items():
            for site, value in vals.items():
                anchored.setdefault(site, set()).add(value)
        for site in core["order"]:
            for row in core["tables"][site]:
                if row[0] == core["nulls"][site]:
                    continue
                if row[0] not in anchored.get(site, set()):
                    fails.append("%s: value %s at %s has no anchor" % (label, row[0], site))
        for anchor, published in core["witness"].items():
            got = name_of(core, core["anchors"][anchor])
            if got != published:
                fails.append("%s: name witness %s produced %r" % (label, anchor, got))
        print("%s witnesses %d ok" % (label, len(core["witness"])), file=log)

    if fails:
        for f in fails:
            print("GATE %s" % f, file=log)

    rows = []
    seen_flat = {}
    seen_names = set()
    counts = {"generated": 0, "parse": 0, "formula": 0, "collision": 0, "namecollision": 0, "named": 0}
    pool = []
    bases = {}
    for index, (label, core) in enumerate(CORES):
        if any(len(core["proven"].get(s, [])) < 2 for s in core["order"]):
            print("%s: core dropped, unproven site" % label, file=log)
            continue
        bases[label] = parse_formula(CalcMolFormula(Chem.MolFromSmiles(build(core, {}))))
        rank = {}
        for depth, picks, vals in combos(core):
            rank[depth] = rank.get(depth, 0) + 1
            pool.append((depth, rank[depth], index, picks, label, core, vals))
    pool.sort(key=lambda t: t[:4])
    print("candidate pool %d" % len(pool), file=log)
    if True:
        for depth, _, index, picks, label, core, vals in pool:
            base = bases[label]
            counts["generated"] += 1
            smiles = build(core, vals)
            mol = Chem.MolFromSmiles(smiles)
            if mol is None:
                counts["parse"] += 1
                continue
            tally = dict(base)
            for site in core["order"]:
                row = lookup(core, site, vals[site])
                if vals[site] != core["nulls"][site]:
                    add_formula(tally, core["nullform"][site], -1)
                    add_formula(tally, row[1], +1)
            formula = render_formula(tally)
            if formula != CalcMolFormula(mol):
                counts["formula"] += 1
                print("FORMULA %s %s vs %s" % (smiles, formula, CalcMolFormula(mol)), file=log)
                continue
            name = name_of(core, vals)
            if name is None:
                counts["named"] += 1
                continue
            f = flat(smiles)
            if f in lib_flat or f in seen_flat:
                counts["collision"] += 1
                continue
            if name.casefold() in lib_names or name.casefold() in seen_names:
                counts["namecollision"] += 1
                continue
            seen_flat[f] = name
            seen_names.add(name.casefold())
            rows.append((name, formula, Chem.MolToSmiles(mol)))
            if stored + len(rows) >= TARGET:
                break

    for name, formula, smiles in rows:
        sys.stdout.write("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n" % (name, CLS, formula, smiles))
    for k in sorted(counts):
        print("%-14s %d" % (k, counts[k]), file=log)
    print("emitted %d, class total %d of %d" % (len(rows), stored + len(rows), TARGET), file=log)
    return 0 if stored + len(rows) == TARGET and not fails else 1


if __name__ == "__main__":
    sys.exit(main())
