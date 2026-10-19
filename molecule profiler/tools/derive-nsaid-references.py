"""Build cyclooxygenase reference structures by substitution on verified parent scaffolds.

Run: python tools/derive-nsaid-references.py [--output rows.js]

Same discipline as tools/derive-opioid-references.py. Each family is written as a
substituent pattern on one template, and every template is validated first by
regenerating a compound the library already stores and requiring a canonical-SMILES
match, so a template error fails the run instead of propagating into new rows. The
anchors are Ibuprofen, Naproxen, Ketoprofen and Flurbiprofen for the arylpropionic
acids and Diclofenac and Indomethacin for the arylacetic acids.

The fenamate and oxicam templates have no anchor, because the library stored no
2-anilinobenzoic acid and no benzothiazine carboxamide before this run. Those two
families therefore rest on the formula cross-check alone, which is weaker evidence than
the anchored families carry, and the first compound of each is the one to check by hand
if either family is ever extended.

Each compound then carries an independently stated molecular formula, which RDKit checks
against the formula computed from the constructed structure. Agreement between the two
recalls is evidence of consistency, not proof of identity: it cannot catch an error that
leaves the formula unchanged, which for these scaffolds means a substituent placed on the
wrong ring position.

No affinity, selectivity, potency or clinical claim is made by anything written here.
"""

import argparse
import os
import re
import sys

from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# {ARYL} is the aryl group written from the atom that carries the side chain, so the
# template appends the acid to it rather than substituting into it.
ARYLPROPIONIC = "O=C(O)C(C){ARYL}"
ARYLACETIC = "O=C(O)C{ARYL}"
FENAMATE = "O=C(O)c1ccccc1N{ARYL}"

# name, aryl group, stated formula
ARYLPROPIONICS = [
    ("Ibuprofen", "c1ccc(CC(C)C)cc1", "C13H18O2"),
    ("Naproxen", "c1ccc2cc(OC)ccc2c1", "C14H14O3"),
    ("Ketoprofen", "c1cccc(C(=O)c2ccccc2)c1", "C16H14O3"),
    ("Flurbiprofen", "c1cc(F)c(-c2ccccc2)cc1", "C15H13FO2"),

    ("Fenoprofen", "c1cccc(Oc2ccccc2)c1", "C15H14O3"),
    ("Loxoprofen", "c1ccc(CC2CCCC2=O)cc1", "C15H18O3"),
    ("Tiaprofenic acid", "c1ccc(C(=O)c2ccccc2)s1", "C14H12O3S"),
    ("Suprofen", "c1ccc(C(=O)c2cccs2)cc1", "C14H12O3S"),
    ("Pirprofen", "c1cc(Cl)c(N2CC=CC2)cc1", "C13H14ClNO2"),
    ("Indoprofen", "c1ccc(N2Cc3ccccc3C2=O)cc1", "C17H15NO3"),
    ("Alminoprofen", "c1ccc(NCC(=C)C)cc1", "C13H17NO2"),
    ("Benoxaprofen", "c1cc2oc(-c3ccc(Cl)cc3)nc2cc1", "C16H12ClNO3"),
    ("Carprofen", "c1cc2c(cc1)c1cc(Cl)ccc1[nH]2", "C15H12ClNO2"),
]

ARYLACETICS = [
    ("Diclofenac", "c1ccccc1Nc1c(Cl)cccc1Cl", "C14H11Cl2NO2"),
    ("Indomethacin", "c1c(C)n(C(=O)c2ccc(Cl)cc2)c2ccc(OC)cc12", "C19H16ClNO4"),

    ("Alclofenac", "c1cc(Cl)c(OCC=C)cc1", "C11H11ClO3"),
    ("Fenclofenac", "c1ccccc1Oc1ccc(Cl)cc1Cl", "C14H10Cl2O3"),
    ("Bromfenac", "c1cccc(C(=O)c2ccc(Br)cc2)c1N", "C15H12BrNO3"),
    ("Amfenac", "c1cccc(C(=O)c2ccccc2)c1N", "C15H13NO3"),
    ("Felbinac", "c1ccc(-c2ccccc2)cc1", "C14H12O2"),
    ("Lonazolac", "c1c(-c2ccc(Cl)cc2)nn(-c2ccccc2)c1", "C17H13ClN2O2"),
    ("Zomepirac", "c1cc(C)c(C(=O)c2ccc(Cl)cc2)n1C", "C15H14ClNO3"),
    ("Tolmetin", "c1ccc(C(=O)c2ccc(C)cc2)n1C", "C15H15NO3"),
]

FENAMATES = [
    ("Mefenamic acid", "c1cccc(C)c1C", "C15H15NO2"),

    ("Flufenamic acid", "c1cccc(C(F)(F)F)c1", "C14H10F3NO2"),
    ("Meclofenamic acid", "c1c(Cl)c(C)ccc1Cl", "C14H11Cl2NO2"),
    ("Tolfenamic acid", "c1c(C)c(Cl)ccc1", "C14H12ClNO2"),
]

# {AR} is the amide aryl ring, {BENZ} the atoms that complete the ring fused to the
# thiazine. Anchored on Piroxicam. Rings 8 and 9 keep the thiazine and its fused ring
# clear of the ring numbers an interpolated substituent opens for itself.
OXICAM = "CN8C(C(=O)N{AR})=C(O)c9{BENZ}S8(=O)=O"

OXICAMS = [
    ("Piroxicam", "c1ccccn1", "ccccc9", "C15H13N3O4S"),

    ("Meloxicam", "c1ncc(C)s1", "ccccc9", "C14H13N3O4S2"),
    ("Tenoxicam", "c1ccccn1", "sccc9", "C13H11N3O4S2"),
    ("Lornoxicam", "c1ccccn1", "sc(Cl)cc9", "C13H10ClN3O4S2"),
    ("Isoxicam", "c1cc(C)on1", "ccccc9", "C14H13N3O5S"),
    ("Sudoxicam", "c1nccs1", "ccccc9", "C13H11N3O4S2"),
]

SINGLETONS = [
    ("Diflunisal", "Salicylate", "OC(=O)c1cc(-c2ccc(F)cc2F)ccc1O", "C13H8F2O3"),
    ("Salsalate", "Salicylate", "OC(=O)c1ccccc1OC(=O)c1ccccc1O", "C14H10O5"),
    ("Benorilate", "Salicylate",
     "CC(=O)Oc1ccccc1C(=O)Oc1ccc(NC(C)=O)cc1", "C17H15NO5"),
    ("Ethenzamide", "Salicylate", "CCOc1ccccc1C(N)=O", "C9H11NO2"),
    ("Olsalazine", "Salicylate",
     "OC(=O)c1cc(N=Nc2ccc(O)c(C(=O)O)c2)ccc1O", "C14H10N2O6"),
    ("Methyl salicylate", "Salicylate", "COC(=O)c1ccccc1O", "C8H8O3"),

    ("Antipyrine", "Pyrazolone", "CC1=CC(=O)N(c2ccccc2)N1C", "C11H12N2O"),
    ("Propyphenazone", "Pyrazolone",
     "CC(C)C1=C(C)N(C)N(c2ccccc2)C1=O", "C14H18N2O"),
    ("Aminophenazone", "Pyrazolone",
     "CN(C)C1=C(C)N(C)N(c2ccccc2)C1=O", "C13H17N3O"),
    ("Metamizole", "Pyrazolone",
     "CN(CS(=O)(=O)O)C1=C(C)N(C)N(c2ccccc2)C1=O", "C13H17N3O4S"),
    ("Phenylbutazone", "Pyrazolone",
     "CCCCC1C(=O)N(c2ccccc2)N(c2ccccc2)C1=O", "C19H20N2O2"),
    ("Oxyphenbutazone", "Pyrazolone",
     "CCCCC1C(=O)N(c2ccccc2)N(c2ccc(O)cc2)C1=O", "C19H20N2O3"),
    ("Kebuzone", "Pyrazolone",
     "CC(=O)CCC1C(=O)N(c2ccccc2)N(c2ccccc2)C1=O", "C19H18N2O3"),

    ("Etoricoxib", "COX-2 inhibitor",
     "Cc1ccc(cn1)-c1ncc(Cl)cc1-c1ccc(S(C)(=O)=O)cc1", "C18H15ClN2O2S"),
    ("Valdecoxib", "COX-2 inhibitor",
     "Cc1onc(-c2ccccc2)c1-c1ccc(S(N)(=O)=O)cc1", "C16H14N2O3S"),
    ("Parecoxib", "COX-2 inhibitor",
     "CCC(=O)NS(=O)(=O)c1ccc(cc1)-c1c(C)onc1-c1ccccc1", "C19H18N2O4S"),
    ("Lumiracoxib", "COX-2 inhibitor",
     "OC(=O)Cc1cc(Cl)ccc1Nc1cc(C)ccc1F", "C15H13ClFNO2"),
    ("Nimesulide", "COX-2 inhibitor",
     "CS(=O)(=O)Nc1ccc(cc1Oc1ccccc1)[N+](=O)[O-]", "C13H12N2O5S"),

    ("Ketorolac", "NSAID", "OC(=O)C1CCn2c1ccc2C(=O)c1ccccc1", "C15H13NO3"),
    ("Nabumetone", "NSAID", "CC(=O)CCc1ccc2cc(OC)ccc2c1", "C15H16O2"),
    ("Oxaprozin", "NSAID",
     "OC(=O)CCc1oc(-c2ccccc2)c(-c2ccccc2)n1", "C18H15NO3"),
    ("Fenbufen", "NSAID", "OC(=O)CCC(=O)c1ccc(-c2ccccc2)cc1", "C16H14O3"),
    ("Sulindac", "NSAID",
     "OC(=O)Cc1c(C)c2cc(F)ccc2c1=Cc1ccc(S(C)=O)cc1", "C20H17FO3S"),
    ("Niflumic acid", "NSAID",
     "OC(=O)c1cccnc1Nc1cccc(C(F)(F)F)c1", "C13H9F3N2O2"),
    ("Clonixin", "NSAID",
     "OC(=O)c1cccnc1Nc1cccc(Cl)c1C", "C13H11ClN2O2"),
    ("Flunixin", "NSAID",
     "OC(=O)c1cccnc1Nc1cccc(C(F)(F)F)c1C", "C14H11F3N2O2"),
    ("Nepafenac", "NSAID",
     "NC(=O)Cc1cccc(C(=O)c2ccccc2)c1N", "C15H14N2O2"),
    ("Etodolac", "NSAID",
     "CCC1(CC(=O)O)OCCc2c1[nH]c1cccc(CC)c21", "C17H21NO3"),
]


def build(template, **slots):
    return template.format(**slots)


ENTRY = re.compile(
    r"\{ name: '((?:\\.|[^'\\])*)', cls: '((?:\\.|[^'\\])*)', "
    r"formula: '((?:\\.|[^'\\])*)', smiles: '((?:\\.|[^'\\])*)'(?:, propertyOnly: true)? \}"
)


def optional(group):
    # An empty slot has to drop its parentheses too, or an atom is written C() and the
    # structure does not parse.
    return "(%s)" % group if group else ""


def build_butyrophenone(row):
    return BUTYROPHENONE.format(C4A=row[1], C4B=optional(row[2]), NSUB=row[3])


def build_benzamide(row):
    return BENZAMIDE.format(AMINE=row[1], R2=row[2], R3=row[3], R4=row[4],
                            R5=row[5], R6=row[6])


def build_tropane(row):
    return TROPANE.format(N=row[1], C2=optional(row[2]), C3=row[3])


def build_cathinone(row):
    return CATHINONE.format(AMINE=row[1], ALPHA=row[2], ARYL=row[3])


def build_benzazepine(row):
    return BENZAZEPINE.format(R7=row[1], R6=row[2], N3=optional(row[3]),
                              ARYL=row[4], R8=row[5])


def flat(smiles):
    # Stored entries vary in whether they assign stereochemistry, and the templates write
    # constitution only, so anchors are compared with stereochemistry removed.
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    Chem.RemoveStereochemistry(mol)
    return Chem.MolToSmiles(mol)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="-")
    args = parser.parse_args()

    source = open(os.path.join(ROOT, "data", "library.js"), encoding="utf-8").read()
    stored = {}
    for match in ENTRY.finditer(source):
        name, _cls, formula, smiles = match.groups()
        stored[name] = (formula, smiles.replace("\\\\", "\\"))

    families = (
        [(row[0], row[-1], ARYLPROPIONIC.format(ARYL=row[1]), "NSAID")
         for row in ARYLPROPIONICS]
        + [(row[0], row[-1], ARYLACETIC.format(ARYL=row[1]), "NSAID")
           for row in ARYLACETICS]
        + [(row[0], row[-1], FENAMATE.format(ARYL=row[1]), "NSAID")
           for row in FENAMATES]
        + [(row[0], row[-1], OXICAM.format(AR=row[1], BENZ=row[2]), "Oxicam")
           for row in OXICAMS]
        + [(row[0], row[-1], row[2], row[1]) for row in SINGLETONS])

    seen = {}
    for name, (_formula, smiles) in stored.items():
        key = flat(smiles)
        if key is not None:
            seen.setdefault(key, name)

    failures, rows, anchors = [], [], []
    for name, stated, smiles, cls in families:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            failures.append("%s: constructed structure does not parse" % name)
            continue
        computed = CalcMolFormula(mol)
        if computed != stated:
            failures.append("%s: stated %s but constructed structure is %s"
                            % (name, stated, computed))
            continue
        if sum(atom.GetNumRadicalElectrons() for atom in mol.GetAtoms()):
            failures.append("%s: constructed structure carries an unpaired electron" % name)
            continue
        if name in stored:
            if flat(stored[name][1]) != flat(smiles):
                failures.append("%s: template disagrees with the stored structure" % name)
            anchors.append(name)
            continue
        key = flat(smiles)
        if key in seen:
            failures.append("%s: same structure as %s" % (name, seen[key]))
            continue
        seen[key] = name
        rows.append({"name": name, "cls": cls, "formula": computed,
                     "smiles": Chem.MolToSmiles(mol)})

    if failures:
        for line in failures:
            print("FAIL " + line)
        raise SystemExit(1)

    text = "".join(
        "  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
        % (row["name"], row["cls"], row["formula"], row["smiles"]) for row in rows)
    if args.output == "-":
        sys.stdout.write(text)
    else:
        open(args.output, "w", encoding="utf-8").write(text)
    sys.stderr.write("templates reproduced %d stored entries (%s); %d new rows\n"
                     % (len(anchors), ", ".join(anchors), len(rows)))


if __name__ == "__main__":
    main()
