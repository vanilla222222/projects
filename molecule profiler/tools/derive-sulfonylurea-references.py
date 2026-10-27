#!/usr/bin/env python3
"""Derive Sulfonylurea reference rows.

Method copied from tools/derive-ergoline-references.py and
tools/derive-sulfonamide-references.py: template-anchored assembly, slot tables,
differential formula composition, sourced-anchor proof gate, collision gates run
against BOTH row styles of data/library.js (hand-written ENTRY and externally
sourced SOURCED).

CLASS SCOPE (stated, not silently assumed)
  data/library.js carries exactly 2 rows under cls 'Sulfonylurea' -- Glibenclamide
  and Glipizide -- both antidiabetic ARYLSULFONYLUREAS (ArSO2-NH-CO-NH-R with R an
  alkyl, cycloalkyl or N-aminocycle).  A scaffold census over all 21683 rows finds
  31 members of the sulfonylurea family, of which 7 are HERBICIDES (bensulfuron-
  methyl, chlorsulfuron, nicosulfuron, rimsulfuron, sulfometuron methyl,
  triasulfuron, tribenuron methyl).  Those differ constitutionally from the stored
  class members: N'-(methoxy/methyl-substituted triazinyl or pyrimidinyl) instead
  of N'-alkyl, and ortho ring substitution instead of para.  They are a different
  pharmacology and a different substitution pattern, so they are EXCLUDED from
  cls 'Sulfonylurea' and are NOT used as anchors.  They belong under a separate
  class string ('Sulfonylurea herbicide') which this generator does not emit.
  N,N''-sulfonyldiurea (ChEBI) is excluded too: it has no aryl ring at all.

SMILES mechanics
  template:  O=C(N{R})NS(=O)(=O)c1{RING}1
  ring-closure digit 1 is RESERVED for the benzene ring; substituent groups in the
  R slot start at digit 2.  No RING value opens a ring, so digit 2 is unambiguous.
  The RING slot is the five ring atoms FOLLOWING the sulfonyl-bearing c1, written
  in the sulfonamide-generator convention, so its tabulated formula counts those
  five carbons plus their hydrogens plus any substituent on them.
  Halogens are written as plain atoms; no 'CF' sequence is ever emitted (that
  parses as californium), fluorine always follows its carbon as 'c(F)'.

Numbering / naming
  Urea is the parent hydride and the senior characteristic group: an aryl sulfonyl
  on nitrogen, an acetyl on the ring and a nitro on the ring are all prefixes
  (amide outranks ketone, and nitro is always a prefix).  The two urea nitrogens
  are N1 and N3; the alphabetically first prefix takes locant 1, the other takes 3.
  Alphanumeric ordering strips non-letters, so '(4-methylbenzenesulfonyl)' sorts
  under 'methylbenzenesulfonyl' and '(azepan-1-yl)' under 'azepanyl'.
  wrap() parenthesises every prefix that carries a hyphen or comma.
  The grammar is PROVEN against published systematic names of seven stored rows
  (ANCHOR_NAMES below); a single mismatch aborts the run.

Stereochemistry
  No slot value is stereogenic, so every emitted row is achiral and the
  stereo-stripped structure-collision gate loses nothing.  glibornuride (the one
  stereodefined sourced sulfonylurea) carries a bornane-2-ol N-substituent that no
  slot reaches, so it is neither an anchor nor a collision risk.

Slot tables are ATTESTED-ONLY, and the class closes short of fifty
  Each RING and R value below occurs at that site in a sulfonylurea the library
  already stores from an external source.  Values that a sourced anchor proves
  only at SOME OTHER site are NOT tabulated, even though the shipped
  tools/derive-sulfonamide-references.py does tabulate such values (bromo, iodo,
  nitro, trifluoromethyl, ethyl, propan-2-yl) once an anchor proves the site
  itself.  That looser rule would carry the tables to roughly fifty rows.  It is
  declined here because a row it adds is a plausible compound rather than a
  documented substitution, and an earlier audit of cls 'Beta blocker' recorded
  nine such rows as a defect; manufacturing the same defect on purpose to reach a
  target is worse than missing the target.
  Measured consequence: 5 RING values x 4 R values = 20 combinations, of which 8
  collide on stereo-stripped structure (the 7 structure anchors themselves plus
  tolbutamide) and 0 collide on name, leaving 12 emitted rows.  With the 2 stored
  rows the class therefore closes at 14, and the fifty-reference target is
  UNREACHABLE for cls 'Sulfonylurea' by any method this project will use.
  TARGET stays at 50, so the generator exits 1; that non-zero exit is the
  unmet-target signal and not a failure.  See CLASS-FIFTY-LIMITS.md.

Run:  python3 -I derive-Sulfonylurea-references.py > Sulfonylurea-rows.js
      (row data on stdout, diagnostics on stderr -- never merge the two)
"""

import itertools
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

TEMPLATE = "O=C(N{R})NS(=O)(=O)c1{RING}1"
CLS = "Sulfonylurea"
TARGET = 50

# value -> (formula of the slot as written, prefix name or None)
RING = {
    "ccccc": ("C5H5", None),
    "ccc(C)cc": ("C6H7", "4-methyl"),
    "ccc(Cl)cc": ("C5H4Cl", "4-chloro"),
    "ccc(N)cc": ("C5H6N", "4-amino"),
    "ccc(C(C)=O)cc": ("C7H7O", "4-acetyl"),
}

R = {
    "CCC": ("C3H7", "propyl"),
    "CCCC": ("C4H9", "butyl"),
    "C2CCCCC2": ("C6H11", "cyclohexyl"),
    "N2CCCCCC2": ("C6H12N", "azepan-1-yl"),
}

TABLES = {"RING": RING, "R": R}
NULLS = {"RING": "ccc(C)cc", "R": "CCCC"}

# sourced rows (a "source" block in data/library.js) reachable exactly by the
# template.  Each is proven by stereo-inclusive canonical-SMILES identity.
ANCHORS = {
    "phenbutamide": {"RING": "ccccc", "R": "CCCC"},
    "carbutamide": {"RING": "ccc(N)cc", "R": "CCCC"},
    "chlorpropamide": {"RING": "ccc(Cl)cc", "R": "CCC"},
    "glycyclamide": {"RING": "ccc(C)cc", "R": "C2CCCCC2"},
    "acetohexamide": {"RING": "ccc(C(C)=O)cc", "R": "C2CCCCC2"},
    "tolazamide": {"RING": "ccc(C)cc", "R": "N2CCCCCC2"},
    "glypinamide": {"RING": "ccc(Cl)cc", "R": "N2CCCCCC2"},
}

# published systematic names, used to prove the naming grammar.  tolbutamide is a
# hand-written row and is NEVER a structure anchor; it appears here only as a
# name-grammar witness.
ANCHOR_NAMES = {
    "phenbutamide": "1-benzenesulfonyl-3-butylurea",
    "carbutamide": "1-(4-aminobenzenesulfonyl)-3-butylurea",
    "chlorpropamide": "1-(4-chlorobenzenesulfonyl)-3-propylurea",
    "glycyclamide": "1-cyclohexyl-3-(4-methylbenzenesulfonyl)urea",
    "acetohexamide": "1-(4-acetylbenzenesulfonyl)-3-cyclohexylurea",
    "tolazamide": "1-(azepan-1-yl)-3-(4-methylbenzenesulfonyl)urea",
    "glypinamide": "1-(azepan-1-yl)-3-(4-chlorobenzenesulfonyl)urea",
    "tolbutamide": "1-butyl-3-(4-methylbenzenesulfonyl)urea",
}
NAME_WITNESS = {"tolbutamide": {"RING": "ccc(C)cc", "R": "CCCC"}}


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


def wrap(text):
    if "-" not in text and "," not in text:
        return text
    return ("[" + text + "]") if "(" in text else ("(" + text + ")")


def key(text):
    return LETTERS.sub("", text.lower())


def sulfonylurea_name(vals):
    ring = RING[vals["RING"]][1]
    aryl = (ring + "benzenesulfonyl") if ring else "benzenesulfonyl"
    parts = sorted([aryl, R[vals["R"]][1]], key=key)
    return "1-%s-3-%surea" % (wrap(parts[0]), wrap(parts[1]))


def build(vals):
    full = dict(NULLS)
    full.update(vals)
    return TEMPLATE.format(**full)


def combos():
    keys = sorted(TABLES)
    idx = [range(len(TABLES[k])) for k in keys]
    for t in sorted(itertools.product(*idx), key=lambda t: (sum(t), t)):
        yield {k: list(TABLES[k])[i] for k, i in zip(keys, t)}


def main():
    text = open(LIBRARY, encoding="utf-8").read()
    stored = {}
    structures = {}
    names = {}
    total = 0
    for rx in (ENTRY, SOURCED):
        for name, cls, formula, smiles in rx.findall(text):
            total += 1
            stored.setdefault(name, smiles)
            names.setdefault(name.casefold(), name)
            k = flat(smiles)
            if k:
                structures.setdefault(k, name)
    print("library rows %d  distinct names %d" % (total, len(names)), file=sys.stderr)

    fails = []

    # ---- naming-grammar gate: reproduce published systematic names
    for name, vals in dict(ANCHORS, **NAME_WITNESS).items():
        got = sulfonylurea_name(vals)
        want = ANCHOR_NAMES[name]
        if got != want:
            fails.append("name grammar %s\n  built %s\n  want  %s" % (name, got, want))
        else:
            print("name proven %s = %s" % (name, got), file=sys.stderr)

    # ---- anchor gate (hard): stereo-inclusive identity with the stored row
    proven = {"RING": set(), "R": set()}
    nproven = 0
    for name, vals in ANCHORS.items():
        if name not in stored:
            fails.append("anchor %s absent from library" % name)
            continue
        bmol = Chem.MolFromSmiles(build(vals))
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
        nproven += 1
        for k in proven:
            proven[k].add(vals[k])
        print(
            "anchor proven (stereo) %-16s %s  %s"
            % (name, CalcMolFormula(smol), build(vals)),
            file=sys.stderr,
        )
    for site in sorted(proven):
        print("site %s proven by %d anchors" % (site, len(proven[site])), file=sys.stderr)
        if len(proven[site]) < 2:
            fails.append("site %s: %d proven anchors, need 2" % (site, len(proven[site])))
    if nproven < 2:
        fails.append("%s: %d anchors proven, need 2" % (CLS, nproven))

    if fails:
        for f in fails:
            print("FAIL " + f, file=sys.stderr)
        return 1

    # ---- differential base formula
    parent = TEMPLATE.format(**NULLS)
    base = parse_formula(CalcMolFormula(Chem.MolFromSmiles(parent)))
    print("parent %s %s" % (parent, render_formula(base)), file=sys.stderr)

    seen_struct = {}
    seen_names = set()
    rows = []
    tally = {"enumerated": 0, "name-collision": 0, "structure-collision": 0,
             "refused": 0, "beyond-target": 0}

    for vals in combos():
        tally["enumerated"] += 1
        smiles = build(vals)
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            print("REFUSED parse %s" % smiles, file=sys.stderr)
            tally["refused"] += 1
            continue

        counts = dict(base)
        for k, v in vals.items():
            slot_formula(counts, TABLES[k][v][0], +1)
            slot_formula(counts, TABLES[k][NULLS[k]][0], -1)
        stated = render_formula(counts)
        if CalcMolFormula(mol) != stated:
            print("REFUSED formula %s stated %s rdkit %s"
                  % (smiles, stated, CalcMolFormula(mol)), file=sys.stderr)
            tally["refused"] += 1
            continue

        name = sulfonylurea_name(vals)
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
        if len(rows) >= TARGET:
            tally["beyond-target"] += 1
            continue
        rows.append((name, stated, Chem.MolToSmiles(mol)))

    for name, formula, smiles in rows:
        sys.stdout.write(
            "  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
            % (name, CLS, formula, smiles)
        )

    tally["accepted"] = len(rows)
    print("sulfonylurea rows %d / target %d  %s" % (len(rows), TARGET, tally),
          file=sys.stderr)
    return 0 if len(rows) == TARGET else 1


if __name__ == "__main__":
    sys.exit(main())
