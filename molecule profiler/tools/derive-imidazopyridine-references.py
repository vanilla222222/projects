#!/usr/bin/env python3
"""Derive Imidazopyridine reference rows on the imidazo[1,2-a]pyridine scaffold.

Method copied from tools/derive-ergoline-references.py: template-anchored
assembly, slot tables, differential formula composition, hard anchor gate,
collision gates run against BOTH library row styles (ENTRY and SOURCED).

SCOPE.  "Imidazopyridine" spans four unrelated ring fusions.  This batch covers
imidazo[1,2-a]pyridine ONLY.  The other three were censused and refused:
  imidazo[4,5-b]pyridine  1 sourced row  (pentosidine)            -> < 2 anchors
  imidazo[4,5-c]pyridine  2 sourced rows (rimegepant, sulmazole)  -> neither is
      slot-reachable; both carry the substituent on a ring-fused or N-acylated
      imidazolone, so no locant-proving rebuild exists
  imidazo[1,5-a]pyridine  1 sourced row  (GDC-0623)               -> < 2 anchors
A name from one fusion is never built on another fusion's scaffold: the stem
string and the template are a single constant pair in FAMILY.

LOCANT MAP (imidazo[1,2-a]pyridine):  N1, C2, C3, N4 bridgehead, C5, C6, C7,
C8, C8a.  Template traverses C2 -> C3 -> N4 -> C5 -> C6 -> C7 -> C8 -> C8a,
ring digit 1 closing C2-N1 and ring digit 2 closing N4-C8a.

SMILES mechanics
  template ring-closure digits 1 and 2 are RESERVED; substituent groups start
  at digit 3.  Every slot is a BRANCH slot: the null value is the empty string
  (the ring atom keeps its implicit H).  `FC` not `CF` -- no CF group is used.

ANCHOR PROOF (hard gate, >= 2 per substitution site).
  Each anchor is an externally sourced row (it carries a `source` block, hence
  sits under a "<provider> named compound" cls -- pharmacological cls is NEVER
  present on a sourced row, so "sourced rows whose cls is Imidazopyridine" is
  identically 0 and is not the feasibility metric).  Anchors were found by
  scaffold substructure search over all 21683 rows regardless of cls.
  An anchor is proven by transcribing its non-core remainder into THIS
  template at the asserted locant and requiring stereo-INCLUSIVE canonical
  SMILES identity with the stored row.  A wrong locant map cannot pass.
  Where the transcribed fragment carries a stereocentre adjacent to the
  attachment bond (savolitinib C6, GSK-923295 C2) the written parity is the one
  that reproduces the stored row; the claim under test is the LOCANT, which no
  choice of parity could rescue if it were wrong.

  proven sites   C2  zolimidine, miroprofen, GSK-923295
                 C3  minodronic acid, LY-2090314
                 C6  olprinone, savolitinib
  refused sites  C5  0 anchors
                 C7  rifaximin only (1), and its C2/C3 are fusion carbons so it
                     is not slot-reachable at all -> 0 usable
                 C8  GSK-923295 only (1)
  Refused sites are absent from TABLES, so no row can carry a substituent there.

SUBSTITUENT SCOPE.  All seven anchors attach through CARBON at C2/C3/C6, so
only carbon-attached substituents are enumerated.  Ring halogen (alpidem's
6-chloro) is NOT derived: alpidem is a hand-written row and hand rows are not
valid anchors.

Run:  python3 -I derive-Imidazopyridine-references.py > Imidazopyridine-rows.js
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
# slot value as written -> (formula of the slot as written, bare prefix name)
# the null value "" contributes the ring atom's implicit H and has no prefix.

S2 = {
    "": ("H", None),
    "(C)": ("CH3", "methyl"),
    "(CC)": ("C2H5", "ethyl"),
    "(CCC)": ("C3H7", "propyl"),
    "(C(C)C)": ("C3H7", "propan-2-yl"),
    "(c3ccccc3)": ("C6H5", "phenyl"),
    "(c3ccc(C)cc3)": ("C7H7", "4-methylphenyl"),
    "(c3ccc(Cl)cc3)": ("C6H4Cl", "4-chlorophenyl"),
    "(c3ccc(F)cc3)": ("C6H4F", "4-fluorophenyl"),
    "(c3ccc(OC)cc3)": ("C7H7O", "4-methoxyphenyl"),
}

S3 = {
    "": ("H", None),
    "(C)": ("CH3", "methyl"),
    "(CC)": ("C2H5", "ethyl"),
    "(c3ccccc3)": ("C6H5", "phenyl"),
}

S6 = {
    "": ("H", None),
    "(C)": ("CH3", "methyl"),
    "(CC)": ("C2H5", "ethyl"),
    "(c3ccccc3)": ("C6H5", "phenyl"),
}

TABLES = {"S2": S2, "S3": S3, "S6": S6}
LOCANT = {"S2": "2", "S3": "3", "S6": "6"}

FAMILY = {
    "cls": "Imidazopyridine",
    "fusion": "imidazo[1,2-a]pyridine",
    "template": "c1{S2}c{S3}n2c{S5}c{S6}c{S7}c{S8}c2n1",
    "nulls": {"S2": "", "S3": "", "S5": "", "S6": "", "S7": "", "S8": ""},
    "tables": TABLES,
    "stem": "imidazo[1,2-a]pyridine",
    "target": 49,
}

# name -> (slot assignment, site it proves, provider, stated formula)
ANCHORS = {
    "zolimidine": (
        {"S2": "(c3ccc(S(C)(=O)=O)cc3)"}, "C2", "DrugCentral", "C14H12N2O2S"),
    "miroprofen": (
        {"S2": "(c3ccc(C(C)C(=O)O)cc3)"}, "C2", "ChEBI", "C16H14N2O2"),
    "GSK-923295": (
        {"S2": "(c3ccc(C[C@H](N=C(O)c4ccc(OC(C)C)c(Cl)c4)CN=C(O)CN(C)C)cc3)",
         "S8": "([C@H](C)O)"}, "C2", "ChEBI", "C32H38ClN5O4"),
    "minodronic acid": (
        {"S3": "(CC(O)(P(=O)(O)O)P(=O)(O)O)"}, "C3", "DrugCentral",
        "C9H12N2O7P2"),
    "LY-2090314": (
        {"S3": "(C4=C(c5cn6c7c(cc(F)cc57)CN(C(=O)N8CCCCC8)CC6)C(O)=NC4=O)"},
        "C3", "ChEBI", "C28H25FN6O3"),
    "olprinone": (
        {"S6": "(c3cc(C#N)c(=O)[nH]c3C)"}, "C6", "DrugCentral", "C14H10N4O"),
    "savolitinib": (
        {"S6": "([C@H](C)n3nnc4ncc(-c5cnn(C)c5)nc43)"}, "C6", "ChEBI",
        "C17H15N9"),
}


def row_name(vals):
    items = []
    for slot in ("S2", "S3", "S6"):
        nm = FAMILY["tables"][slot][vals[slot]][1]
        if nm:
            items.append((LOCANT[slot], wrap(nm)))
    return join(collapse(items), FAMILY["stem"])


def main():
    text = open(LIBRARY, encoding="utf-8").read()
    stored = {}
    structures = set()
    names = set()
    fold = set()
    total = 0
    for rx in (ENTRY, SOURCED):
        for name, cls, formula, smiles in rx.findall(text):
            total += 1
            stored.setdefault(name, (smiles, formula))
            key = flat(smiles)
            if key:
                structures.add(key)
            names.add(name)
            fold.add(name.casefold())
    print("library rows %d  distinct names %d" % (total, len(names)),
          file=sys.stderr)

    fam = FAMILY
    fails = []

    # ---- anchor gate (hard): stereo-inclusive identity with the stored row
    per_site = {}
    for name, (vals, site, provider, stated) in sorted(ANCHORS.items()):
        if name not in stored:
            fails.append("anchor %s absent from library" % name)
            continue
        smiles_stored, formula_stored = stored[name]
        full = dict(fam["nulls"])
        full.update(vals)
        built = fam["template"].format(**full)
        bmol = Chem.MolFromSmiles(built)
        smol = Chem.MolFromSmiles(smiles_stored)
        if bmol is None or smol is None:
            fails.append("anchor %s unparseable" % name)
            continue
        if Chem.MolToSmiles(bmol) != Chem.MolToSmiles(smol):
            fails.append("anchor %s mismatch\n  built %s\n  want  %s"
                         % (name, Chem.MolToSmiles(bmol),
                            Chem.MolToSmiles(smol)))
            continue
        rd = CalcMolFormula(smol)
        if rd != stated or rd != formula_stored:
            fails.append("anchor %s formula stated %s stored %s rdkit %s"
                         % (name, stated, formula_stored, rd))
            continue
        per_site.setdefault(site, []).append(name)
        print("anchor proven (stereo) %-16s site %s  %-12s %s"
              % (name, site, provider, rd), file=sys.stderr)

    for slot in sorted(fam["tables"]):
        site = "C" + LOCANT[slot]
        got = per_site.get(site, [])
        if len(got) < 2:
            fails.append("site %s: %d anchors proven, need 2" % (site, len(got)))
        else:
            print("site %s derivable: %d anchors %s"
                  % (site, len(got), ", ".join(got)), file=sys.stderr)

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
    skipped = {"dup-struct-lib": 0, "dup-struct-self": 0, "dup-name-lib": 0,
               "dup-name-self": 0, "null": 0, "formula": 0, "parse": 0}
    enumerated = 0

    for vals in combos({k: list(v) for k, v in fam["tables"].items()}):
        enumerated += 1
        if len(rows) >= fam["target"]:
            continue
        full = dict(fam["nulls"])
        full.update(vals)
        if all(full[k] == fam["nulls"][k] for k in full):
            skipped["null"] += 1
            continue

        smiles = fam["template"].format(**full)
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
            print("FORMULA %s stated %s rdkit %s"
                  % (smiles, stated, CalcMolFormula(mol)), file=sys.stderr)
            skipped["formula"] += 1
            continue

        canon = Chem.MolToSmiles(mol)
        key = flat(smiles)
        if key in structures:
            print("DUPSTRUCT lib %s %s" % (smiles, vals), file=sys.stderr)
            skipped["dup-struct-lib"] += 1
            continue
        if key in seen_struct:
            print("DUPSTRUCT self %s %s" % (smiles, vals), file=sys.stderr)
            skipped["dup-struct-self"] += 1
            continue
        name = row_name(vals)
        if name.casefold() in fold:
            print("DUPNAME lib %s" % name, file=sys.stderr)
            skipped["dup-name-lib"] += 1
            continue
        if name.casefold() in seen_names:
            print("DUPNAME self %s" % name, file=sys.stderr)
            skipped["dup-name-self"] += 1
            continue
        seen_struct.add(key)
        seen_names.add(name.casefold())
        rows.append((name, stated, canon))

    for name, formula, smiles in rows:
        assert "'" not in name and "'" not in smiles
        sys.stdout.write(
            "  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
            % (name, fam["cls"], formula, smiles))

    print("imidazo[1,2-a]pyridine rows %d / target %d  enumerated %d  skipped %s"
          % (len(rows), fam["target"], enumerated, skipped), file=sys.stderr)
    return 0 if len(rows) == fam["target"] else 1


if __name__ == "__main__":
    sys.exit(main())
