#!/usr/bin/env python3
"""Derive ergoline reference rows.

Method copied from tools/derive-arylpiperazine-references.py and
tools/derive-benzazepine-references.py: template-anchored assembly, slot tables,
differential formula composition, anchor proof gate, collision gates against both
library row styles.

Locant map proven in numbering.md (RDKit substructure mapping, 9 published names).

SMILES mechanics
  template ring-closure digits 1 (ring D), 2 (ring C), 3 (benzo A), 4 (pyrrole B)
  are RESERVED; substituent groups start at digit 5.
  N6 is a PREFIX slot: its last atom bonds forward to N6.
  N1 and C8 are inline/BRANCH slots.
  E covers C9+C10 including the ring-2 closure, so it carries the 9,10-ene choice.

Stereochemistry
  C8 written as [C@H](sub) between C7 and C9  ->  8beta   (proven anchors:
     festuclavine, metergoline, CHEMBL531, CHEMBL13816, lysergic acid, lysergol)
  C8 written as [C@@H](sub)                   ->  8alpha  (mesulergine, terguride)
  8alpha rows are NOT generated: the duplicate gate the brief mandates compares
  STEREO-STRIPPED canonical SMILES, under which an 8alpha epimer is identical to
  its 8beta partner, so every 8alpha row would be rejected as a duplicate.
  ring fusion tags [C@@H]2 (C10) / [C@H]21 (C5) are 10R,5R, copied verbatim from
  the proven anchors.  C10 is never substituted, so no 10alpha/10beta is emitted.

Run:  python3 -I derive-ergoline-references.py > ergoline-rows.js
      (row data on stdout, diagnostics on stderr -- never merge the two)
"""

import itertools
import os
import re
import sys

from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")

LIBRARY = "/home/user/projects/molecule profiler/data/library.js"

ENTRY = re.compile(
    r"\{ name: '([^']*)', cls: '([^']*)', formula: '([^']*)', smiles: '([^']*)'"
)
SOURCED = re.compile(
    r'\{"name":"([^"]*)","cls":"([^"]*)","formula":"([^"]*)","smiles":"([^"]*)"'
)
ATOM = re.compile(r"([A-Z][a-z]?)(\d*)")
LETTERS = re.compile(r"[^a-z]")

MULT = {2: "di", 3: "tri", 4: "tetra", 5: "penta", 6: "hexa"}


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


def pref(sub, text):
    return (LETTERS.sub("", sub.lower()), text)


def join(parts, stem):
    head = "-".join(text for _, text in sorted(parts))
    if not head:
        return stem
    return head + ("-" if stem[0].isdigit() else "") + stem


def wrap(text):
    if "-" not in text and "," not in text:
        return text
    return ("[" + text + "]") if "(" in text else ("(" + text + ")")


LOC = re.compile(r"^(\d+)(.*)$")


def rank(loc):
    """lowest-locant ordering; '8alpha' < '8beta', '9,10' sorts on 9."""
    m = LOC.match(loc)
    return (int(m.group(1)), m.group(2))


def collapse(items):
    """items: list of (locant, prefix-name).  Merge repeats with MULT."""
    order = []
    bag = {}
    for loc, nm in items:
        if nm not in bag:
            bag[nm] = []
            order.append(nm)
        bag[nm].append(loc)
    parts = []
    for nm in order:
        locs = sorted(bag[nm], key=rank)
        if len(locs) == 1:
            text = locs[0] + "-" + nm
        else:
            text = ",".join(locs) + "-" + MULT[len(locs)] + nm
        parts.append(pref(nm, text))
    return parts


def combos(slots):
    keys = sorted(slots)
    idx = [range(len(slots[k])) for k in keys]
    for t in sorted(itertools.product(*idx), key=lambda t: (sum(t), t)):
        yield {k: list(slots[k])[i] for k, i in zip(keys, t)}


# ---------------------------------------------------------------- slot tables
# value -> (formula of the slot as written, prefix name or None, face or None)

N1 = {
    "[nH]": ("NH", None, None),
    "n(C)": ("CH3N", "methyl", None),
}

N6 = {
    "C": ("CH3", "methyl", None),
    "CC": ("C2H5", "ethyl", None),
    "CCC": ("C3H7", "propyl", None),
    "C=CC": ("C3H5", "prop-2-en-1-yl", None),
    "C5CC5C": ("C4H7", "(cyclopropylmethyl)", None),
}

C8 = {
    "C": ("CH2", None, None),
    "[C@H](C)": ("C2H4", "methyl", "beta"),
    "[C@H](CC)": ("C3H6", "ethyl", "beta"),
    "[C@H](CSC)": ("C3H6S", "[(methylthio)methyl]", "beta"),
    "[C@H](CCC)": ("C4H8", "propyl", "beta"),
}

E = {
    "C[C@@H]2": ("C2H3", None, None),   # 9,10-dihydro -- the parent state
    "C=C2": ("C2H", "didehydro", None),
}

TABLES = {"N1": N1, "N6": N6, "C8": C8, "E": E}

FAMILY = {
    "cls": "Ergoline",
    "template": "{N6}N1C{C8}{E}c3cccc4{N1}cc(c34)C[C@H]21",
    "nulls": {"N1": "[nH]", "N6": "C", "C8": "C", "E": "C[C@@H]2"},
    "tables": TABLES,
    "stem": "ergoline",
    "target": 47,
    "anchors": None,   # set below
}

# anchors proved by exact stereo-INCLUSIVE canonical SMILES against stored rows.
# Only anchors reachable from the slot tables are listed; each is sourced.
ANCHORS = {
    # nulls -> 6-methylergoline (ChEBI 2215, sourced)
    "6-methylergoline": {},
    # festuclavine (ChEBI 65035, sourced)
    "festuclavine": {"C8": "[C@H](C)"},
    # CHEMBL531 = stereodefined pergolide (hand row, stereo intact)
    "CHEMBL531": {"N6": "CCC", "C8": "[C@H](CSC)"},
}
FAMILY["anchors"] = ANCHORS


def ergoline_name(vals):
    items = []
    n1 = N1[vals["N1"]][1]
    if n1:
        items.append(("1", wrap(n1)))
    n6 = N6[vals["N6"]][1]
    items.append(("6", wrap(n6)))
    sub, nm, face = C8[vals["C8"]]
    if nm:
        items.append(("8" + face, wrap(nm)))
    ene = E[vals["E"]][1]
    if ene:
        items.append(("9,10", wrap(ene)))
    return join(collapse(items), "ergoline")


def main():
    text = open(LIBRARY, encoding="utf-8").read()
    stored = {}
    structures = set()
    names = set()
    for rx in (ENTRY, SOURCED):
        for name, cls, formula, smiles in rx.findall(text):
            stored.setdefault(name, smiles)
            key = flat(smiles)
            if key:
                structures.add(key)
            names.add(name)
    print("library rows %d" % len(names), file=sys.stderr)

    fam = FAMILY
    fails = []

    # ---- anchor gate (hard): stereo-inclusive identity with the stored row
    proven = 0
    for name, vals in fam["anchors"].items():
        if name not in stored:
            fails.append("anchor %s absent from library" % name)
            continue
        full = dict(fam["nulls"])
        full.update(vals)
        built = fam["template"].format(**full)
        bmol = Chem.MolFromSmiles(built)
        smol = Chem.MolFromSmiles(stored[name])
        if bmol is None or smol is None:
            fails.append("anchor %s unparseable" % name)
            continue
        if Chem.MolToSmiles(bmol) != Chem.MolToSmiles(smol):
            fails.append(
                "anchor %s mismatch\n  built %s\n  want  %s"
                % (name, Chem.MolToSmiles(bmol), Chem.MolToSmiles(smol))
            )
            continue
        proven += 1
        print("anchor proven (stereo) %s" % name, file=sys.stderr)
    if proven < 2:
        fails.append("%s: %d anchors proven, need 2" % (fam["cls"], proven))

    if fails:
        for f in fails:
            print("FAIL " + f, file=sys.stderr)
        return 1

    # ---- differential base formula
    parent = fam["template"].format(**fam["nulls"])
    pmol = Chem.MolFromSmiles(parent)
    base = parse_formula(CalcMolFormula(pmol))
    print("parent %s %s" % (parent, render_formula(base)), file=sys.stderr)

    seen_struct = set()
    seen_names = set()
    rows = []
    skipped = {"dup-struct": 0, "dup-name": 0, "null": 0, "formula": 0, "parse": 0}

    for vals in combos({k: list(v) for k, v in fam["tables"].items()}):
        if len(rows) >= fam["target"]:
            break
        if all(vals[k] == fam["nulls"][k] for k in vals):
            skipped["null"] += 1
            continue

        smiles = fam["template"].format(**vals)
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            skipped["parse"] += 1
            continue

        tally = dict(base)
        for k, v in vals.items():
            slot_formula(tally, fam["tables"][k][v][0], +1)
            slot_formula(tally, fam["tables"][k][fam["nulls"][k]][0], -1)
        stated = render_formula(tally)
        if CalcMolFormula(mol) != stated:
            print(
                "FORMULA %s stated %s rdkit %s"
                % (smiles, stated, CalcMolFormula(mol)),
                file=sys.stderr,
            )
            skipped["formula"] += 1
            continue

        canon = Chem.MolToSmiles(mol)
        key = flat(smiles)
        if key in structures or key in seen_struct:
            print("DUPSTRUCT %s %s %s" % ("lib" if key in structures else "self", smiles, vals), file=sys.stderr)
            skipped["dup-struct"] += 1
            continue
        name = ergoline_name(vals)
        if name in names or name in seen_names:
            skipped["dup-name"] += 1
            continue
        seen_struct.add(key)
        seen_names.add(name)
        rows.append((name, stated, canon))

    for name, formula, smiles in rows:
        sys.stdout.write(
            "  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
            % (name, fam["cls"], formula, smiles)
        )

    print(
        "ergoline rows %d / target %d  skipped %s"
        % (len(rows), fam["target"], skipped),
        file=sys.stderr,
    )
    return 0 if len(rows) == fam["target"] else 1


if __name__ == "__main__":
    sys.exit(main())
