"""Build GABA-A-acting reference structures by substitution on verified parent scaffolds.

Run: python tools/derive-gabaa-references.py [--output rows.js]

Four templates are used: the 1,4-benzodiazepin-2-one, its triazolo- and imidazo-fused
variants, and the 5,5-disubstituted barbiturate ring. Each template is validated first by
regenerating entries the library already stores and requiring a canonical-SMILES match, so
a template error fails the run instead of propagating into new rows.

Each compound then carries an independently stated molecular formula, which RDKit checks
against the formula computed from the constructed structure. Recalling the substitution
pattern and recalling the formula are separate acts of recall, so a disagreement between
them marks the entry as unreliable and the run fails rather than emitting it. Agreement is
evidence of consistency, not proof of identity: it cannot catch an error that leaves the
formula unchanged, which for these scaffolds means a substituent placed on the wrong ring
position.

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

# {N1} N1 substituent, {R7} benzo 7-substituent carrying its own parentheses,
# {AR} the 5-aryl ring, {C3} the C3 atom with any 3-substituent. High ring numbers keep
# the core closures clear of the aryl and substituent rings interpolated into it.
BZD = "{N1}8c9ccc{R7}cc9C({AR})=N{C3}C8=O"

# {RT} triazole or imidazole 1-substituent, {R8} benzo 8-substituent, {AR} the 5-aryl.
TRIAZOLO = "{RT}c1nnc2n1-c1ccc{R8}cc1C({AR})=NC2"
IMIDAZO = "{RT}c1ncc2n1-c1ccc{R8}cc1C({AR})=NC2"

# {X} the 2-chalcogen, {N1} N1 substituent, {RA}/{RB} the two C5 substituents.
BARB = "{X}=C8N{N1}C(=O)C({RA})({RB})C(=O)N8"

NH, NME = "N", "CN"
CL, BR, NITRO, F = "(Cl)", "(Br)", "([N+](=O)[O-])", "(F)"
PH, PHF, PHCL, PYR2 = "c1ccccc1", "c1ccccc1F", "c1ccccc1Cl", "c1ccccn1"
C3H, C3OH = "C", "C(O)"

# name, N1 substituent, benzo 7-substituent, 5-aryl, C3 atom, stated formula
BENZODIAZEPINES = [
    ("Diazepam", NME, CL, PH, C3H, "C16H13ClN2O"),
    ("Lorazepam", NH, CL, PHCL, C3OH, "C15H10Cl2N2O2"),
    ("Oxazepam", NH, CL, PH, C3OH, "C15H11ClN2O2"),
    ("Temazepam", NME, CL, PH, C3OH, "C16H13ClN2O2"),

    ("Nordazepam", NH, CL, PH, C3H, "C15H11ClN2O"),
    ("Nitrazepam", NH, NITRO, PH, C3H, "C15H11N3O3"),
    ("Nimetazepam", NME, NITRO, PH, C3H, "C16H13N3O3"),
    ("Flunitrazepam", NME, NITRO, PHF, C3H, "C16H12FN3O3"),
    ("Clonazepam", NH, NITRO, PHCL, C3H, "C15H10ClN3O3"),
    ("Meclonazepam", NH, NITRO, PHCL, "C(C)", "C16H12ClN3O3"),
    ("Nifoxipam", NH, NITRO, PHF, C3OH, "C15H10FN3O4"),
    ("Lormetazepam", NME, CL, PHCL, C3OH, "C16H12Cl2N2O2"),
    ("Delorazepam", NH, CL, PHCL, C3H, "C15H10Cl2N2O"),
    ("Fludiazepam", NME, CL, PHF, C3H, "C16H12ClFN2O"),
    ("Diclazepam", NME, CL, PHCL, C3H, "C16H12Cl2N2O"),
    ("Phenazepam", NH, BR, PHCL, C3H, "C15H10BrClN2O"),
    ("Flubromazepam", NH, BR, PHF, C3H, "C15H10BrFN2O"),
    ("Norflurazepam", NH, CL, PHF, C3H, "C15H10ClFN2O"),
    ("Flurazepam", "CCN(CC)CCN", CL, PHF, C3H, "C21H23ClFN3O"),
    ("Prazepam", "C1CC1CN", CL, PH, C3H, "C19H17ClN2O"),
    ("Pinazepam", "C#CCN", CL, PH, C3H, "C18H13ClN2O"),
    ("Halazepam", "FC(F)(F)CN", CL, PH, C3H, "C17H12ClF3N2O"),
    ("Clorazepate", NH, CL, PH, "C(C(=O)O)", "C16H11ClN2O3"),
    ("Doxefazepam", "OCCN", CL, PHF, C3OH, "C17H14ClFN2O3"),
    ("Camazepam", NME, CL, PH, "C(OC(=O)N(C)C)", "C19H18ClN3O3"),
    ("Bromazepam", NH, BR, PYR2, C3H, "C14H10BrN3O"),
]

# name, azole 1-substituent, benzo 8-substituent, 5-aryl, template, stated formula
FUSED = [
    ("Alprazolam", "C", CL, PH, TRIAZOLO, "C17H13ClN4"),
    ("Midazolam", "C", CL, PHF, IMIDAZO, "C18H13ClFN3"),

    ("Triazolam", "C", CL, PHCL, TRIAZOLO, "C17H12Cl2N4"),
    ("Estazolam", "", CL, PH, TRIAZOLO, "C16H11ClN4"),
    ("Flualprazolam", "C", CL, PHF, TRIAZOLO, "C17H12ClFN4"),
    ("Flubromazolam", "C", BR, PHF, TRIAZOLO, "C17H12BrFN4"),
    ("Bromazolam", "C", BR, PH, TRIAZOLO, "C17H13BrN4"),
    ("Clonazolam", "C", NITRO, PHCL, TRIAZOLO, "C17H12ClN5O2"),
    ("Nitrazolam", "C", NITRO, PH, TRIAZOLO, "C17H13N5O2"),
    ("Flunitrazolam", "C", NITRO, PHF, TRIAZOLO, "C17H12FN5O2"),
    ("Adinazolam", "CN(C)C", CL, PH, TRIAZOLO, "C19H18ClN5"),
    ("Pyrazolam", "C", BR, PYR2, TRIAZOLO, "C16H12BrN5"),
    ("Climazolam", "C", CL, PHCL, IMIDAZO, "C18H13Cl2N3"),
]

ETHYL, ALLYL, METHYL = "CC", "CC=C", "C"
AMYL, ISOAMYL, SBUTYL, ISOBUTYL = "C(C)CCC", "CCC(C)C", "C(C)CC", "CC(C)C"
CYCLOHEXENYL, CYCLOHEPTENYL = "C7=CCCCC7", "C7=CCCCCC7"

# name, 2-chalcogen, N1 substituent, C5 substituent A, C5 substituent B, stated formula
BARBITURATES = [
    ("Phenobarbital", "O", "", ETHYL, PH, "C12H12N2O3"),
    ("Pentobarbital", "O", "", ETHYL, AMYL, "C11H18N2O3"),
    ("Thiopental", "S", "", ETHYL, AMYL, "C11H18N2O2S"),

    ("Barbital", "O", "", ETHYL, ETHYL, "C8H12N2O3"),
    ("Amobarbital", "O", "", ETHYL, ISOAMYL, "C11H18N2O3"),
    ("Butabarbital", "O", "", ETHYL, SBUTYL, "C10H16N2O3"),
    ("Butalbital", "O", "", ALLYL, ISOBUTYL, "C11H16N2O3"),
    ("Secobarbital", "O", "", ALLYL, AMYL, "C12H18N2O3"),
    ("Allobarbital", "O", "", ALLYL, ALLYL, "C10H12N2O3"),
    ("Aprobarbital", "O", "", ALLYL, "C(C)C", "C10H14N2O3"),
    ("Talbutal", "O", "", ALLYL, SBUTYL, "C11H16N2O3"),
    ("Probarbital", "O", "", ETHYL, "C(C)C", "C9H14N2O3"),
    ("Vinbarbital", "O", "", ETHYL, "C(C)=CCC", "C11H16N2O3"),
    ("Metharbital", "O", "(C)", ETHYL, ETHYL, "C9H14N2O3"),
    ("Mephobarbital", "O", "(C)", ETHYL, PH, "C13H14N2O3"),
    ("Hexobarbital", "O", "(C)", METHYL, CYCLOHEXENYL, "C12H16N2O3"),
    ("Cyclobarbital", "O", "", ETHYL, CYCLOHEXENYL, "C12H16N2O3"),
    ("Heptabarbital", "O", "", ETHYL, CYCLOHEPTENYL, "C13H18N2O3"),
    ("Methohexital", "O", "(C)", ALLYL, "C(C)C#CCC", "C14H18N2O3"),
    ("Thiamylal", "S", "", ALLYL, AMYL, "C12H18N2O2S"),
    ("Thiobarbital", "S", "", ETHYL, ETHYL, "C8H12N2O2S"),
]

# Chemotypes with no shared parent scaffold here. These are written out rather than
# decorated on a template, so only the formula cross-check applies to them.
# Reviewed PubChem graph corrections: flumazenil CID 3373, alpidem CID 54897,
# gaboxadol CID 3448. Source snapshots: validation/reference-identity-corrections.json.
SINGLETONS = [
    ("Flumazenil", "Imidazobenzodiazepine",
     "CCOC(=O)C1=C2CN(C(=O)C3=C(N2C=N1)C=CC(=C3)F)C", "C15H14FN3O3"),
    ("Alpidem", "Imidazopyridine",
     "CCCN(CCC)C(=O)CC1=C(N=C2N1C=C(C=C2)Cl)C3=CC=C(C=C3)Cl", "C21H23Cl2N3O"),
    ("Gaboxadol", "Isoxazole", "C1CNCC2=C1C(=O)NO2", "C6H8N2O2"),
    ("Pentylenetetrazol", "Tetrazole", "C1CCCCc2nnnn21", "C6H10N4"),
    ("Meprobamate", "Carbamate",
     "CCCC(C)(COC(N)=O)COC(N)=O", "C9H18N2O4"),
    ("Carisoprodol", "Carbamate",
     "CCCC(C)(COC(N)=O)COC(=O)NC(C)C", "C12H24N2O4"),
    ("Ethchlorvynol", "Chlorinated alcohol", "CCC(O)(C=CCl)C#C", "C7H9ClO"),
    ("Glutethimide", "Piperidinedione",
     "CCC1(c2ccccc2)CCC(=O)NC1=O", "C13H15NO2"),
    ("Methyprylon", "Piperidinedione",
     "CCC1(CC)C(=O)NCC(C)C1=O", "C10H17NO2"),
    ("Clomethiazole", "Thiazole", "Cc1ncsc1CCCl", "C6H8ClNS"),
]

ENTRY = re.compile(
    r"\{ name: '((?:\\.|[^'\\])*)', cls: '((?:\\.|[^'\\])*)', "
    r"formula: '((?:\\.|[^'\\])*)', smiles: '((?:\\.|[^'\\])*)'(?:, propertyOnly: true)? \}"
)


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
        [(row[0], row[-1],
          BZD.format(N1=row[1], R7=row[2], AR=row[3], C3=row[4]), "Benzodiazepine")
         for row in BENZODIAZEPINES]
        + [(row[0], row[-1],
            row[4].format(RT=row[1], R8=row[2], AR=row[3]), "Benzodiazepine")
           for row in FUSED]
        + [(row[0], row[-1],
            BARB.format(X=row[1], N1=row[2], RA=row[3], RB=row[4]), "Barbiturate")
           for row in BARBITURATES]
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
