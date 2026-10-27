#!/usr/bin/env python3
"""Derive Nitroarene reference rows for molecule profiler's data/library.js.

Core: MONONITROBENZENE, a benzene ring carrying one nitro group, the maximum
common substructure of the five rows already filed under cls 'Nitroarene'.
Template: [O-][N+](=O)c1c{S2}c{S3}c{S4}c{S5}c1{S6} -- ring-closure digit 1 is
RESERVED for the nitro ring, substituent branches open at digit 2.  S2/S6 are
the two ortho positions, S3/S5 the two meta positions, S4 the para position.
Sites are the three symmetry classes ortho {2,6}, meta {3,5}, para {4}: the
mirror through the C-N axis maps 2 to 6 and 3 to 5, so those are one site and
not a cross-site transfer.  'Nitroarene' is a chemotype, not a pharmacological
family; only this one core is anchored, and nitro groups on heteroarenes
(nitrofurans, nitroimidazoles, nitazene benzimidazoles) and on fused benzo
rings (nitrazepam-type) are a different core and are neither anchors nor
emitted here.
Anchors: externally sourced rows only, reproduced by the template under
STEREO-INCLUSIVE canonical identity.  A row's slot assignment is ambiguous when
the ring carries more than one nitro group, because either nitro may be taken
as the core; a site/value pair counts an anchor only when EVERY reproduction of
that row places the value at that site.  The template is flat, so the 19
stereodefined sourced rows on this core (the nitro-aryl dihydropyridines,
chloramphenicol esters, acenocoumarol, dinoseb enantiomers, aureothin, b-AP15)
cannot be reproduced and are dropped rather than relaxing the gate.
Gates: >=2 unanimous sourced anchors per site/value pair, differential formula
composition cross-checked against CalcMolFormula, stereo-stripped structure
collision and casefolded name collision against the whole library and within
the batch.  Library rows are counted through the module, never by regex.
Naming: a composite prefix (trifluoromethyl) takes enclosing marks, as 27 of
the 32 library rows naming it do and as every lowercase systematic one does;
the ( [ { cycle never nests here because no slot value carries a locant.
Senior suffix ladder phenol/benzenediol/benzenetriol > aniline/
benzenediamine > benzene parent hydride with prefixes only; lowest locants to
the suffix, then to the prefix set, then to the alphabetically first prefix;
alphanumeric prefix order; di/tri/tetra/penta multiplying prefixes.  No slot
value carries an internal locant, so the ( [ { enclosing-mark cycle is unused.
Run: python3 -I derive-nitroarene-references.py > rows.js
     (row data on stdout, diagnostics on stderr -- never merge the two)
"""

import itertools
import json
import re
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

ATOM = re.compile(r"([A-Z][a-z]?)(\d*)")
LETTERS = re.compile(r"[^a-z]")
ITALIC = re.compile(r"\b(tert|sec|iso|cyclo)\b")

TEMPLATE = "[O-][N+](=O)c1c{S2}c{S3}c{S4}c{S5}c1{S6}"
CORE = Chem.MolFromSmarts(
    "[$([NX3+](=O)[O-]),$([NX4](=O)=O)]-[cX3]1[cX3][cX3][cX3][cX3][cX3]1")
CLS = "Nitroarene"
TARGET = 50

SITE = {"S2": "ortho", "S3": "meta", "S4": "para", "S5": "meta", "S6": "ortho"}
MULT = {2: "di", 3: "tri", 4: "tetra", 5: "penta"}

ORTHO = {
    "": ("H", None),
    "(O)": ("HO", "OH"),
    "(C)": ("CH3", "CH3"),
    "(Cl)": ("Cl", "CL"),
    "(N)": ("H2N", "NH2"),
}
META = {
    "": ("H", None),
    "([N+](=O)[O-])": ("NO2", "NO2"),
    "(N)": ("H2N", "NH2"),
    "(Cl)": ("Cl", "CL"),
    "(C(F)(F)F)": ("CF3", "CF3"),
}
PARA = {
    "": ("H", None),
    "(O)": ("HO", "OH"),
    "(C)": ("CH3", "CH3"),
    "(N)": ("H2N", "NH2"),
}

TABLES = {"S2": ORTHO, "S3": META, "S4": PARA, "S5": META, "S6": ORTHO}
NULLS = {k: "" for k in TABLES}

WRAP = {"CF3"}
MARKS = [("(", ")"), ("[", "]"), ("{", "}")]
PREFIX = {"NO2": "nitro", "CL": "chloro", "CH3": "methyl", "NH2": "amino",
          "CF3": "trifluoromethyl", "OH": "hydroxy"}
SUFFIX = [("OH", "ol", "phenol"), ("NH2", "amine", "aniline")]

ANCHOR_ONLY = {
    ("para", "(OP(=S)(OC)OC)"), ("para", "(Oc2ccccc2)"), ("para", "(OCC)"),
    ("meta", "(S(=O)(=O)N(C)C)"), ("meta", "(C(=O)NC2CCN(CC3CC=CCC3)CC2)"),
    ("ortho", "(N(CCC)CCC)"), ("ortho", "(N(CC)CCCC)"), ("meta", "(O)"),
}

ANCHORS = {
    "2-nitrophenol": {"S2": "", "S3": "", "S4": "", "S5": "", "S6": "(O)"},
    "2-nitrobenzene-1,3,5-triol": {"S2": "(O)", "S3": "", "S4": "(O)",
                                   "S5": "", "S6": "(O)"},
    "4-nitrocatechol": {"S2": "", "S3": "", "S4": "(O)", "S5": "(O)",
                        "S6": ""},
    "2-nitrotoluene": {"S2": "", "S3": "", "S4": "", "S5": "", "S6": "(C)"},
    "2,6-dinitrotoluene": {"S2": "(C)", "S3": "([N+](=O)[O-])", "S4": "",
                           "S5": "", "S6": ""},
    "tecnazene": {"S2": "(Cl)", "S3": "(Cl)", "S4": "", "S5": "(Cl)",
                  "S6": "(Cl)"},
    "chlorthion": {"S2": "", "S3": "", "S4": "(OP(=S)(OC)OC)", "S5": "",
                   "S6": "(Cl)"},
    "aclonifen": {"S2": "(N)", "S3": "(Cl)", "S4": "(Oc2ccccc2)", "S5": "",
                  "S6": ""},
    "cinitapride": {"S2": "(N)", "S3": "", "S4": "(OCC)",
                    "S5": "(C(=O)NC2CCN(CC3CC=CCC3)CC2)", "S6": ""},
    "trinitrophenol": {"S2": "", "S3": "([N+](=O)[O-])", "S4": "(O)",
                       "S5": "([N+](=O)[O-])", "S6": ""},
    "2,4-diamino-6-nitrotoluene": {"S2": "", "S3": "(N)", "S4": "",
                                   "S5": "(N)", "S6": "(C)"},
    "2,6-diamino-4-nitrotoluene": {"S2": "", "S3": "(N)", "S4": "(C)",
                                   "S5": "(N)", "S6": ""},
    "2,6-dichloro-4-nitroaniline": {"S2": "", "S3": "(Cl)", "S4": "(N)",
                                    "S5": "(Cl)", "S6": ""},
    "trifluralin": {"S2": "(N(CCC)CCC)", "S3": "([N+](=O)[O-])", "S4": "",
                    "S5": "(C(F)(F)F)", "S6": ""},
    "benfluralin": {"S2": "(N(CC)CCCC)", "S3": "([N+](=O)[O-])", "S4": "",
                    "S5": "(C(F)(F)F)", "S6": ""},
    "4-nitroaniline": {"S2": "", "S3": "", "S4": "(N)", "S5": "", "S6": ""},
    "BRL-50481": {"S2": "", "S3": "", "S4": "(C)", "S5": "(S(=O)(=O)N(C)C)",
                  "S6": ""},
}

ANCHOR_NAMES = {
    "2-nitrophenol": "2-nitrophenol",
    "2-nitrobenzene-1,3,5-triol": "2-nitrobenzene-1,3,5-triol",
    "4-nitroaniline": "4-nitroaniline",
    "2,6-dichloro-4-nitroaniline": "2,6-dichloro-4-nitroaniline",
    "4-nitrocatechol": None,
    "2-nitrotoluene": None,
    "2,6-dinitrotoluene": None,
    "tecnazene": None,
    "chlorthion": None,
    "aclonifen": None,
    "cinitapride": None,
    "trinitrophenol": None,
    "2,4-diamino-6-nitrotoluene": None,
    "2,6-diamino-4-nitrotoluene": None,
    "trifluralin": None,
    "benfluralin": None,
    "BRL-50481": None,
}

NAME_WITNESS = {
    "Nitrobenzene": (dict(NULLS), "nitrobenzene"),
    "4-Nitrophenol": ({"S2": "", "S3": "", "S4": "(O)", "S5": "", "S6": ""},
                      "4-nitrophenol"),
    "2,4-Dinitrotoluene": ({"S2": "(C)", "S3": "", "S4": "",
                            "S5": "([N+](=O)[O-])", "S6": ""},
                           "1-methyl-2,4-dinitrobenzene"),
}


def parse_formula(text):
    out = {}
    for sym, num in ATOM.findall(text or ""):
        out[sym] = out.get(sym, 0) + (int(num) if num else 1)
    return out


def render_formula(counts):
    order = ["C", "H"]
    rest = sorted(k for k in counts if k not in order and counts[k])
    out = ""
    for sym in order + rest:
        n = counts.get(sym, 0)
        if n > 1:
            out += sym + str(n)
        elif n == 1:
            out += sym
    return out


def slot_formula(tally, text, sign):
    for sym, n in parse_formula(text).items():
        tally[sym] = tally.get(sym, 0) + sign * n


def flat(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    Chem.RemoveStereochemistry(mol)
    return Chem.MolToSmiles(mol)


def key(text):
    return LETTERS.sub("", ITALIC.sub("", text.lower()))


def build(vals):
    full = dict(NULLS)
    full.update(vals)
    return TEMPLATE.format(**full)


def groups(vals):
    out = {1: "NO2"}
    for slot, value in vals.items():
        tag = TABLES[slot][value][1]
        if tag:
            out[int(slot[1])] = tag
    return out


def numberings():
    for step in (1, -1):
        for start in range(6):
            yield {p + 1: ((step * (p - start)) % 6) + 1 for p in range(6)}


def nitroarene_name(vals):
    tags = groups(vals)
    suffix = None
    for tag, _, _ in SUFFIX:
        if tag in tags.values():
            suffix = tag
            break
    best = None
    for mapping in numberings():
        head = sorted(mapping[p] for p, t in tags.items() if t == suffix) \
            if suffix else []
        prefixes = [(PREFIX[t], mapping[p]) for p, t in tags.items()
                    if t != suffix]
        locants = sorted(n for _, n in prefixes)
        alpha = tuple(n for _, n in sorted(prefixes, key=lambda x: (key(x[0]),
                                                                    x[1])))
        score = (tuple(head), tuple(locants), alpha)
        if best is None or score < best[0]:
            best = (score, mapping, head, prefixes)
    score, mapping, head, prefixes = best
    pieces = {}
    for name, n in prefixes:
        pieces.setdefault(name, []).append(n)
    parts = []
    wrapped = {PREFIX[t] for t in WRAP}
    for name in sorted(pieces, key=key):
        nums = sorted(pieces[name])
        if name in wrapped:
            open_mark, close_mark = MARKS[0]
            name = open_mark + name + close_mark
        if suffix is None and len(prefixes) == 1:
            parts.append(name)
        else:
            parts.append("%s-%s%s" % (",".join(str(n) for n in nums),
                                      MULT.get(len(nums), ""), name))
    if suffix is None:
        parent = "benzene"
    else:
        tag, base, mono = [s for s in SUFFIX if s[0] == suffix][0]
        if len(head) == 1:
            parent = mono
        else:
            parent = "benzene-%s-%s%s" % (",".join(str(n) for n in head),
                                          MULT[len(head)], base)
    return "-".join(parts) + parent


def combos():
    keys = sorted(TABLES)
    idx = [range(len(TABLES[k])) for k in keys]
    for t in sorted(itertools.product(*idx), key=lambda t: (sum(t), t)):
        yield {k: list(TABLES[k])[i] for k, i in zip(keys, t)}


def library():
    out = subprocess.run(["node", "-e", DUMP], cwd=PROJECT, check=True,
                         stdout=subprocess.PIPE)
    return json.loads(out.stdout)


def shift(smiles):
    out = []
    i = 0
    while i < len(smiles):
        c = smiles[i]
        if c == "[":
            j = smiles.index("]", i)
            out.append(smiles[i:j + 1])
            i = j + 1
            continue
        if c == "%":
            out.append("%" + str(int(smiles[i + 1:i + 3]) + 20))
            i += 3
            continue
        if c.isdigit():
            out.append(str(int(c) + 1))
            i += 1
            continue
        out.append(c)
        i += 1
    return "".join(out)


def transcribe(mol):
    info = mol.GetRingInfo()
    found = []
    for match in mol.GetSubstructMatches(CORE, uniquify=True):
        head = match[0]
        ring = list(match[1:])
        if any(info.NumAtomRings(a) != 1 for a in ring):
            continue
        core = {head} | {n.GetIdx() for n in mol.GetAtomWithIdx(head).GetNeighbors()
                         if n.GetIdx() != ring[0]}
        inring = set(ring)
        vals = {}
        bad = False
        for pos, atom in enumerate(ring):
            if pos == 0:
                continue
            arms = [n.GetIdx() for n in mol.GetAtomWithIdx(atom).GetNeighbors()
                    if n.GetIdx() not in inring and n.GetIdx() not in core]
            if len(arms) > 1:
                bad = True
                break
            if not arms:
                vals["S%d" % (pos + 1)] = ""
                continue
            stack = [arms[0]]
            frag = set()
            while stack:
                x = stack.pop()
                if x in frag:
                    continue
                frag.add(x)
                for n in mol.GetAtomWithIdx(x).GetNeighbors():
                    j = n.GetIdx()
                    if j in inring or j in core:
                        if j != atom:
                            bad = True
                        continue
                    if j not in frag:
                        stack.append(j)
            if bad:
                break
            try:
                frg = Chem.MolFragmentToSmiles(mol, atomsToUse=sorted(frag),
                                               rootedAtAtom=arms[0],
                                               canonical=True,
                                               isomericSmiles=True)
            except Exception:
                bad = True
                break
            vals["S%d" % (pos + 1)] = "(" + shift(frg) + ")"
        if bad:
            continue
        found.append(vals)
    return found


def main():
    rows_in = library()
    stored = {}
    sourced = set()
    structures = {}
    names = {}
    in_class = 0
    for name, smiles, cls, src in rows_in:
        stored.setdefault(name, smiles)
        if src:
            sourced.add(name)
        if cls == CLS:
            in_class += 1
        names.setdefault(name.casefold(), name)
        k = flat(smiles)
        if k:
            structures.setdefault(k, name)
    need = TARGET - in_class
    print("library rows %d  distinct names %d  sourced %d  in class '%s' %d  need %d"
          % (len(rows_in), len(names), len(sourced), CLS, in_class, need),
          file=sys.stderr)

    census = {"core": 0, "core-sourced": 0, "reproduced": 0,
              "reproduced-sourced": 0}
    unanimous = {}
    partial = {}
    for name, smiles, cls, src in rows_in:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None or not mol.HasSubstructMatch(CORE):
            continue
        census["core"] += 1
        if src:
            census["core-sourced"] += 1
        target = Chem.MolToSmiles(mol)
        good = [v for v in transcribe(mol)
                if Chem.MolToSmiles(Chem.MolFromSmiles(build(v))) == target]
        if not good:
            continue
        census["reproduced"] += 1
        if not src:
            continue
        census["reproduced-sourced"] += 1
        seen = []
        for vals in good:
            at = {}
            for slot, value in vals.items():
                at.setdefault(SITE[slot], set()).add(value)
            seen.append(at)
        every = set()
        for at in seen:
            every |= {(site, v) for site, vs in at.items() for v in vs}
        for site, value in every:
            if all(value in at.get(site, set()) for at in seen):
                unanimous.setdefault((site, value), set()).add(name)
            else:
                partial.setdefault((site, value), set()).add(name)
    print("census core rows %d (sourced %d)  template-reproduced %d (sourced %d)"
          % (census["core"], census["core-sourced"], census["reproduced"],
             census["reproduced-sourced"]), file=sys.stderr)

    fails = []
    for name, vals in ANCHORS.items():
        for slot, value in vals.items():
            if (SITE[slot], value) in ANCHOR_ONLY:
                continue
            if value not in TABLES[slot]:
                fails.append("anchor %s cites untabulated %s %r"
                             % (name, slot, value))

    nproven = 0
    proven = {}
    for name, vals in sorted(ANCHORS.items()):
        if name not in stored:
            fails.append("anchor %s absent from library" % name)
            continue
        if name not in sourced:
            fails.append("anchor %s is not externally sourced" % name)
            continue
        built = Chem.MolFromSmiles(build(vals))
        held = Chem.MolFromSmiles(stored[name])
        if built is None or held is None:
            fails.append("anchor %s unparseable" % name)
            continue
        if Chem.MolToSmiles(built) != Chem.MolToSmiles(held):
            fails.append("anchor %s mismatch\n  built %s\n  want  %s"
                         % (name, Chem.MolToSmiles(built),
                            Chem.MolToSmiles(held)))
            continue
        nproven += 1
        for slot, value in vals.items():
            proven.setdefault((SITE[slot], value), set()).add(name)
        print("anchor proven (stereo) %-30s %s"
              % (name[:30], CalcMolFormula(held)), file=sys.stderr)
    if nproven < 2:
        fails.append("%s: %d anchors proven, need 2" % (CLS, nproven))

    for slot in ("S2", "S3", "S4"):
        site = SITE[slot]
        for value in TABLES[slot]:
            hand = proven.get((site, value), set())
            wide = unanimous.get((site, value), set())
            print("site %-5s value %-16s transcribed %d  library-wide unanimous %d  %s"
                  % (site, value or "(H)", len(hand), len(wide),
                     ", ".join(sorted(hand))[:58]), file=sys.stderr)
            if len(hand) < 2:
                fails.append("site %s value %r: %d transcribed anchors, need 2"
                             % (site, value, len(hand)))
            if len(wide) < 2:
                fails.append("site %s value %r: %d unanimous anchors, need 2"
                             % (site, value, len(wide)))

    refused = []
    for pair in sorted(unanimous):
        if len(unanimous[pair]) < 2 or pair[1] in TABLES["S3"] \
                or pair[1] in TABLES["S2"] or pair[1] in TABLES["S4"]:
            if len(unanimous[pair]) < 2:
                refused.append(("one anchor", pair,
                                sorted(unanimous[pair])))
    for pair in sorted(partial):
        if len(unanimous.get(pair, ())) < 2:
            refused.append(("assignment not unanimous", pair,
                            sorted(partial[pair])))
    for kind, pair, who in refused:
        print("REFUSED site %-5s value %-30s %s (%s)"
              % (pair[0], pair[1] or "(H)", kind, ", ".join(who)[:50]),
              file=sys.stderr)
    print("refused site/value pairs %d" % len(refused), file=sys.stderr)
    for pair in sorted(unanimous):
        if len(unanimous[pair]) >= 2 and pair[1] not in TABLES[
                {"ortho": "S2", "meta": "S3", "para": "S4"}[pair[0]]]:
            print("OUT-OF-SCOPE site %-5s value %-30s %d anchors (naming scope)"
                  % (pair[0], pair[1], len(unanimous[pair])), file=sys.stderr)

    for name, want in ANCHOR_NAMES.items():
        if want is None:
            continue
        got = nitroarene_name(ANCHORS[name])
        if got != want:
            fails.append("name grammar %s\n  built %s\n  want  %s"
                         % (name, got, want))
        else:
            print("name proven %-30s %s" % (name, got), file=sys.stderr)
    for name, (vals, want) in NAME_WITNESS.items():
        got = nitroarene_name(vals)
        if got != want:
            fails.append("name witness %s\n  built %s\n  want  %s"
                         % (name, got, want))
        elif flat(build(vals)) != flat(stored.get(name, "")):
            fails.append("name witness %s structure mismatch" % name)
        else:
            print("name witness %-30s %s" % (name, got), file=sys.stderr)

    if fails:
        for f in fails:
            print("FAIL " + f, file=sys.stderr)
        return 1

    parent = build(NULLS)
    base = parse_formula(CalcMolFormula(Chem.MolFromSmiles(parent)))
    print("parent %s %s" % (parent, render_formula(base)), file=sys.stderr)

    seen_struct = {}
    seen_names = set()
    rows = []
    tally = {"enumerated": 0, "parse-refused": 0, "formula-refused": 0,
             "structure-collision": 0, "name-collision": 0,
             "beyond-target": 0}
    for vals in combos():
        tally["enumerated"] += 1
        smiles = build(vals)
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            print("REFUSED parse %s" % smiles, file=sys.stderr)
            tally["parse-refused"] += 1
            continue
        counts = dict(base)
        for slot, value in vals.items():
            slot_formula(counts, TABLES[slot][value][0], +1)
            slot_formula(counts, TABLES[slot][""][0], -1)
        stated = render_formula(counts)
        if CalcMolFormula(mol) != stated:
            print("REFUSED formula %s stated %s rdkit %s"
                  % (smiles, stated, CalcMolFormula(mol)), file=sys.stderr)
            tally["formula-refused"] += 1
            continue
        name = nitroarene_name(vals)
        k = flat(smiles)
        if k in structures or k in seen_struct:
            where = structures.get(k) or ("batch:" + seen_struct[k])
            print("SUPPRESSED structure-collision %s -> %s" % (name, where),
                  file=sys.stderr)
            tally["structure-collision"] += 1
            continue
        if name.casefold() in names or name.casefold() in seen_names:
            print("SUPPRESSED name-collision %s" % name, file=sys.stderr)
            tally["name-collision"] += 1
            continue
        seen_struct[k] = name
        seen_names.add(name.casefold())
        if len(rows) >= need:
            tally["beyond-target"] += 1
            continue
        rows.append((name, stated, Chem.MolToSmiles(mol)))

    for name, formula, smiles in rows:
        sys.stdout.write("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
                         % (name, CLS, formula, smiles))
    tally["emitted"] = len(rows)
    tally["survived-gates"] = len(rows) + tally["beyond-target"]
    print("nitroarene rows %d + stored %d / target %d  %s"
          % (len(rows), in_class, TARGET, tally), file=sys.stderr)
    return 0 if len(rows) + in_class == TARGET else 1


if __name__ == "__main__":
    sys.exit(main())
