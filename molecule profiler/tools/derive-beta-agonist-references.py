#!/usr/bin/env python3
"""Derive Beta agonist reference rows for molecule profiler's data/library.js.

Core: ARYLETHANOLAMINE, Ar-CH(OH)-CH2-NH-R.  The hydroxyl sits on the benzylic
carbon and there is no ether oxygen, so this core is NOT the aryloxypropanolamine
of cls 'Beta blocker'; no beta-blocker anchor, slot value or template is reused.
Template: {ARM}NCC(O)c1{RING}1 -- ring-closure digit 1 is RESERVED for the A-ring,
arm groups open at digit 2.  RING is the five ring atoms following the attachment
carbon.  One core only: the alpha carbon carries two hydrogens, so alpha-branched
rows (ephedrine, ritodrine, procaterol, formoterol) are a SECOND core and are
neither anchors nor emitted here.
Anchors: externally sourced rows only, reproduced by the template under
STEREO-INCLUSIVE canonical identity.  The template is flat, so a stereodefined
sourced row cannot be reproduced and is NOT an anchor: levosalbutamol, salmeterol,
vilanterol, arformoterol, butopamine, denopamine, arbutamine, dilevalol, olodaterol,
abediterol and the ChEBI (R)/(S) pairs are all dropped on that rule rather than
relaxing the gate.  Consequence: the saligenin (salbutamol) and 3-formamido-4-hydroxy
(formoterol) A-rings are REFUSED at one clean anchor each, and so are the
4-amino-3,5-dichloro (clenbuterol), 3-ureido-4-hydroxy (carbuterol), 2,5-dimethoxy
(deglymidodrine), 3-methanesulfonamido (amidefrine), 3,5-dimethoxy-4-hydroxy
(dimetofrine) and 4-hydroxy-3-carbamoyl (medroxalol) rings.
Gates: >=2 sourced anchors per site and per RING value, >=1 per ARM value,
differential formula composition cross-checked against CalcMolFormula, casefolded
name collision and stereo-stripped structure collision against the whole library
and within the batch.  Library rows are counted through the module, never by regex.
Naming: senior ring parent where the A-ring carries a phenolic hydroxyl
(phenol / benzene-1,2-diol / benzene-1,3-diol), ethanol parent otherwise;
alphanumeric prefix order; enclosing marks cycle ( [ { from the innermost outward.
Run: python3 -I derive-beta-agonist-references.py > rows.js
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

TEMPLATE = "{ARM}NCC(O)c1{RING}1"
CLS = "Beta agonist"
TARGET = 50

RING = {
    "ccccc": ("C5H5", "ethanol", None, "phenyl"),
    "c(Cl)cccc": ("C5H4Cl", "ethanol", None, "2-chlorophenyl"),
    "ccc(O)cc": ("C5H5O", "phenol", "4", None),
    "cccc(O)c": ("C5H5O", "phenol", "3", None),
    "ccc(O)c(O)c": ("C5H5O2", "benzene-1,2-diol", "4", None),
    "cc(O)cc(O)c": ("C5H5O2", "benzene-1,3-diol", "5", None),
}

ARM = {
    "": ("H", "amino"),
    "C": ("CH3", "(methylamino)"),
    "CC": ("C2H5", "(ethylamino)"),
    "CCCC": ("C4H9", "(butylamino)"),
    "CC(C)": ("C3H7", "(propan-2-ylamino)"),
    "CC(C)(C)": ("C4H9", "(tert-butylamino)"),
    "CC(C)(CO)": ("C4H9O", "[(1-hydroxy-2-methylpropan-2-yl)amino]"),
    "COc2ccccc2OCC": ("C9H11O2", "[2-(2-methoxyphenoxy)ethylamino]"),
    "CC(Cc2ccc(O)cc2)": ("C9H11O", "{[1-(4-hydroxyphenyl)propan-2-yl]amino}"),
    "CC(CCc2ccc(O)cc2)": ("C10H13O", "{[4-(4-hydroxyphenyl)butan-2-yl]amino}"),
    "CC(CCc2ccc(OC)cc2)": ("C11H15O", "{[4-(4-methoxyphenyl)butan-2-yl]amino}"),
    "CC(CCc2ccc([N+](=O)[O-])cc2)": ("C10H12NO2", "{[4-(4-nitrophenyl)butan-2-yl]amino}"),
    "CC(Cc2ccc3c(c2)OCO3)": ("C10H11O2", "{[1-(1,3-benzodioxol-5-yl)propan-2-yl]amino}"),
    "CC(CCc2ccc3c(c2)OCO3)": ("C11H13O2", "{[4-(1,3-benzodioxol-5-yl)butan-2-yl]amino}"),
}

TABLES = {"ARM": ARM, "RING": RING}
NULLS = {"ARM": "", "RING": "ccccc"}

RING_ANCHOR_ONLY = {
    "ccc(O)c(S(C)=O)c",
    "ccc(O)c(C(N)=O)c",
    "ccc(C)c(S(N)(=O)=O)c",
    "ccc(OC)cc",
}

ANCHORS = {
    "phenylethanolamine": {"ARM": "", "RING": "ccccc"},
    "N-methylphenylethanolamine": {"ARM": "C", "RING": "ccccc"},
    "fepradinol": {"ARM": "CC(C)(CO)", "RING": "ccccc"},
    "clorprenaline": {"ARM": "CC(C)", "RING": "c(Cl)cccc"},
    "tulobuterol": {"ARM": "CC(C)(C)", "RING": "c(Cl)cccc"},
    "oxedrine": {"ARM": "C", "RING": "ccc(O)cc"},
    "bamethan": {"ARM": "CCCC", "RING": "ccc(O)cc"},
    "4-(1-hydroxy-2-{[4-(4-hydroxyphenyl)butan-2-yl]amino}ethyl)phenol": {
        "ARM": "CC(CCc2ccc(O)cc2)", "RING": "ccc(O)cc"},
    "norfenefrine": {"ARM": "", "RING": "cccc(O)c"},
    "etilefrine": {"ARM": "CC", "RING": "cccc(O)c"},
    "colterol": {"ARM": "CC(C)(C)", "RING": "ccc(O)c(O)c"},
    "protokylol": {"ARM": "CC(Cc2ccc3c(c2)OCO3)", "RING": "ccc(O)c(O)c"},
    "orciprenaline": {"ARM": "CC(C)", "RING": "cc(O)cc(O)c"},
    "fenoterol": {"ARM": "CC(Cc2ccc(O)cc2)", "RING": "cc(O)cc(O)c"},
    "sulfinalol": {"ARM": "CC(CCc2ccc(OC)cc2)", "RING": "ccc(O)c(S(C)=O)c"},
    "medroxalol": {"ARM": "CC(CCc2ccc3c(c2)OCO3)", "RING": "ccc(O)c(C(N)=O)c"},
    "amosulalol": {"ARM": "COc2ccccc2OCC", "RING": "ccc(C)c(S(N)(=O)=O)c"},
    "1-(4-methoxyphenyl)-2-{[4-(4-nitrophenyl)butan-2-yl]amino}ethanol": {
        "ARM": "CC(CCc2ccc([N+](=O)[O-])cc2)", "RING": "ccc(OC)cc"},
}

ANCHOR_NAMES = {
    "4-(1-hydroxy-2-{[4-(4-hydroxyphenyl)butan-2-yl]amino}ethyl)phenol":
        "4-(1-hydroxy-2-{[4-(4-hydroxyphenyl)butan-2-yl]amino}ethyl)phenol",
    "1-(4-methoxyphenyl)-2-{[4-(4-nitrophenyl)butan-2-yl]amino}ethanol": None,
    "phenylethanolamine": "2-amino-1-phenylethanol",
    "N-methylphenylethanolamine": "2-(methylamino)-1-phenylethanol",
    "tulobuterol": "2-(tert-butylamino)-1-(2-chlorophenyl)ethanol",
    "clorprenaline": "1-(2-chlorophenyl)-2-(propan-2-ylamino)ethanol",
    "bamethan": "4-[2-(butylamino)-1-hydroxyethyl]phenol",
    "oxedrine": "4-[1-hydroxy-2-(methylamino)ethyl]phenol",
    "etilefrine": "3-[2-(ethylamino)-1-hydroxyethyl]phenol",
    "norfenefrine": "3-(2-amino-1-hydroxyethyl)phenol",
    "colterol": "4-[2-(tert-butylamino)-1-hydroxyethyl]benzene-1,2-diol",
    "orciprenaline": "5-[1-hydroxy-2-(propan-2-ylamino)ethyl]benzene-1,3-diol",
    "fenoterol": "5-(1-hydroxy-2-{[1-(4-hydroxyphenyl)propan-2-yl]amino}ethyl)benzene-1,3-diol",
    "protokylol": "4-(2-{[1-(1,3-benzodioxol-5-yl)propan-2-yl]amino}-1-hydroxyethyl)benzene-1,2-diol",
}

NAME_WITNESS = {
    "Adrenaline": ({"ARM": "C", "RING": "ccc(O)c(O)c"},
                   "4-[1-hydroxy-2-(methylamino)ethyl]benzene-1,2-diol"),
    "Isoprenaline": ({"ARM": "CC(C)", "RING": "ccc(O)c(O)c"},
                     "4-[1-hydroxy-2-(propan-2-ylamino)ethyl]benzene-1,2-diol"),
    "Terbutaline": ({"ARM": "CC(C)(C)", "RING": "cc(O)cc(O)c"},
                    "5-[2-(tert-butylamino)-1-hydroxyethyl]benzene-1,3-diol"),
    "Noradrenaline (norepinephrine)": ({"ARM": "", "RING": "ccc(O)c(O)c"},
                                       "4-(2-amino-1-hydroxyethyl)benzene-1,2-diol"),
}

MARKS = [("(", ")"), ("[", "]"), ("{", "}")]


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


def depth(text):
    best = 0
    for level, (op, cl) in enumerate(MARKS, start=1):
        if op in text:
            best = max(best, level)
    return best


def enclose(text):
    if "-" not in text and "," not in text:
        return text
    op, cl = MARKS[depth(text) % len(MARKS)]
    return op + text + cl


def key(text):
    return LETTERS.sub("", ITALIC.sub("", text.lower()))


def ethyl_prefix(arm):
    amino = ARM[arm][1]
    parts = sorted([amino, "hydroxy"], key=key)
    locants = {amino: "2", "hydroxy": "1"}
    return "-".join("%s-%s" % (locants[p], p) for p in parts) + "ethyl"


def agonist_name(vals):
    formula, parent, locant, aryl = RING[vals["RING"]]
    if parent == "ethanol":
        amino = ARM[vals["ARM"]][1]
        aryl = enclose(aryl)
        parts = sorted([amino, aryl], key=key)
        locants = {amino: "2", aryl: "1"}
        return "-".join("%s-%s" % (locants[p], p) for p in parts) + "ethanol"
    return "%s-%s%s" % (locant, enclose(ethyl_prefix(vals["ARM"])), parent)


def build(vals):
    full = dict(NULLS)
    full.update(vals)
    return TEMPLATE.format(**full)


def combos():
    keys = sorted(TABLES)
    idx = [range(len(TABLES[k])) for k in keys]
    for t in sorted(itertools.product(*idx), key=lambda t: (sum(t), t)):
        yield {k: list(TABLES[k])[i] for k, i in zip(keys, t)}


def library():
    out = subprocess.run(["node", "-e", DUMP], cwd=PROJECT, check=True,
                         stdout=subprocess.PIPE)
    return json.loads(out.stdout)


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

    fails = []

    for name, vals in ANCHORS.items():
        for site, value in vals.items():
            if site == "RING" and value in RING_ANCHOR_ONLY:
                continue
            if value not in TABLES[site]:
                fails.append("anchor %s cites untabulated %s %r" % (name, site, value))

    for name, want in ANCHOR_NAMES.items():
        if want is None:
            continue
        got = agonist_name(ANCHORS[name])
        if got != want:
            fails.append("name grammar %s\n  built %s\n  want  %s" % (name, got, want))
        else:
            print("name proven %-34s %s" % (name, got), file=sys.stderr)
    for name, (vals, want) in NAME_WITNESS.items():
        got = agonist_name(vals)
        if got != want:
            fails.append("name grammar %s\n  built %s\n  want  %s" % (name, got, want))
        elif flat(build(vals)) != flat(stored.get(name, "")):
            fails.append("name witness %s structure mismatch" % name)
        else:
            print("name witness %-34s %s" % (name, got), file=sys.stderr)

    proven = {"ARM": {}, "RING": {}}
    nproven = 0
    for name, vals in sorted(ANCHORS.items()):
        if name not in stored:
            fails.append("anchor %s absent from library" % name)
            continue
        if name not in sourced:
            fails.append("anchor %s is not externally sourced" % name)
            continue
        bmol = Chem.MolFromSmiles(build(vals))
        smol = Chem.MolFromSmiles(stored[name])
        if bmol is None or smol is None:
            fails.append("anchor %s unparseable" % name)
            continue
        if Chem.MolToSmiles(bmol) != Chem.MolToSmiles(smol):
            fails.append("anchor %s mismatch\n  built %s\n  want  %s"
                         % (name, Chem.MolToSmiles(bmol), Chem.MolToSmiles(smol)))
            continue
        nproven += 1
        for site in proven:
            proven[site].setdefault(vals[site], []).append(name)
        print("anchor proven (stereo) %-62s %s" % (name[:62], CalcMolFormula(smol)),
              file=sys.stderr)

    for site in sorted(proven):
        print("site %s proven by %d anchors over %d values"
              % (site, sum(len(v) for v in proven[site].values()), len(proven[site])),
              file=sys.stderr)
        if len(proven[site]) < 2:
            fails.append("site %s: %d proven values, need 2" % (site, len(proven[site])))
    for value in RING:
        got = proven["RING"].get(value, [])
        print("RING %-16s %d anchors  %s" % (value, len(got), ", ".join(got)[:70]),
              file=sys.stderr)
        if len(got) < 2:
            fails.append("RING %r: %d anchors, need 2" % (value, len(got)))
    for value in ARM:
        got = proven["ARM"].get(value, [])
        print("ARM  %-30s %d anchors  %s" % (value or "(H)", len(got),
              ", ".join(got)[:60]), file=sys.stderr)
        if len(got) < 1:
            fails.append("ARM %r: %d anchors, need 1" % (value, len(got)))
    if nproven < 2:
        fails.append("%s: %d anchors proven, need 2" % (CLS, nproven))

    if fails:
        for f in fails:
            print("FAIL " + f, file=sys.stderr)
        return 1

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
        for site, value in vals.items():
            slot_formula(counts, TABLES[site][value][0], +1)
            slot_formula(counts, TABLES[site][NULLS[site]][0], -1)
        stated = render_formula(counts)
        if CalcMolFormula(mol) != stated:
            print("REFUSED formula %s stated %s rdkit %s"
                  % (smiles, stated, CalcMolFormula(mol)), file=sys.stderr)
            tally["refused"] += 1
            continue
        name = agonist_name(vals)
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

    tally["accepted"] = len(rows)
    print("beta agonist rows %d + stored %d / target %d  %s"
          % (len(rows), in_class, TARGET, tally), file=sys.stderr)
    return 0 if len(rows) + in_class == TARGET else 1


if __name__ == "__main__":
    sys.exit(main())
