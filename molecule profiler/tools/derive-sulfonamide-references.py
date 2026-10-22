"""Build sulfonamide reference structures by substitution on verified parent scaffolds.

Run: python tools/derive-sulfonamide-references.py [--output rows.js]

Three templates are used: the N1-substituted 4-aminobenzenesulfonamide of the sulfa
antibacterials, the para-substituted primary benzenesulfonamide, and the 3,4-dihydro-2H-
1,2,4-benzothiadiazine-7-sulfonamide 1,1-dioxide core of the thiazides. Each is validated
first by regenerating entries the library already stores and requiring a canonical-SMILES
match, so a template error fails the run instead of propagating into new rows.

Each compound then carries an independently stated molecular formula, which RDKit checks
against the formula computed from the constructed structure. Recalling the substitution
pattern and recalling the formula are separate acts of recall, so a disagreement between
them marks the entry as unreliable and the run fails rather than emitting it. Agreement is
evidence of consistency, not proof of identity: it cannot catch an error that leaves the
formula unchanged, which for these scaffolds means a substituent placed on the wrong ring
position of the heterocycle or of the benzothiadiazine.

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

# {R} whatever hangs off the sulfonamide nitrogen, empty for the free primary sulfonamide.
# Ring digit 9 closes the aniline ring, leaving 1-6 free for the interpolated heterocycles.
SULFA = "Nc9ccc(cc9)S(=O)(=O)N{R}"

# {X} the para substituent, ending at the atom that bonds to the ring, empty for
# benzenesulfonamide itself.
BENZENESULFONAMIDE = "{X}c9ccc(cc9)S(N)(=O)=O"

# {X6} the C6 substituent on the benzo ring, {C3} the C3 substituent of the thiadiazine
# and {N2} the N2 substituent, each parenthesised and each empty for hydrogen. Ring digits
# 8 and 9 close the benzothiadiazine, leaving 1-6 free for the C3 side chains.
THIAZIDE = "NS(=O)(=O)c9cc8c(cc9{X6})NC{C3}N{N2}S8(=O)=O"

CL, CF3 = "Cl", "C(F)(F)F"

# name, sulfonamide nitrogen substituent, formula
SULFAS = [
    ("Sulfanilamide", "", "C6H8N2O2S"),
    ("Sulfamethoxazole", "c1cc(C)on1", "C10H11N3O3S"),
    ("Sulfadiazine", "c1ncccn1", "C10H10N4O2S"),
    ("Sulfamethazine", "c1nc(C)cc(C)n1", "C12H14N4O2S"),
    ("Sulfathiazole", "c1nccs1", "C9H9N3O2S2"),
    ("Sulfamerazine", "c1nccc(C)n1", "C11H12N4O2S"),
    ("Sulfisomidine", "c1nc(C)nc(C)c1", "C12H14N4O2S"),
    ("Sulfadimethoxine", "c1nc(OC)nc(OC)c1", "C12H14N4O4S"),
    ("Sulfadoxine", "c1ncnc(OC)c1OC", "C12H14N4O4S"),
    ("Sulfalene", "c1nccnc1OC", "C11H12N4O3S"),
    ("Sulfapyrazine", "c1cnccn1", "C10H10N4O2S"),
    ("Sulfaclozine", "c1nccnc1Cl", "C10H9ClN4O2S"),
    ("Sulfamethoxypyridazine", "c1ccc(OC)nn1", "C11H12N4O3S"),
    ("Sulfachloropyridazine", "c1ccc(Cl)nn1", "C10H9ClN4O2S"),
    ("Sulfaquinoxaline", "c1cnc2ccccc2n1", "C14H12N4O2S"),
    ("Sulfisoxazole", "c1onc(C)c1C", "C11H13N3O3S"),
    ("Sulfamethizole", "c1nnc(C)s1", "C9H10N4O2S2"),
    ("Sulfaethidole", "c1nnc(CC)s1", "C10H12N4O2S2"),
    ("Sulfamoxole", "c1nc(C)c(C)o1", "C11H13N3O3S"),
    ("Sulfaphenazole", "c1ccnn1-c1ccccc1", "C15H14N4O2S"),
    ("Sulfacetamide", "C(C)=O", "C8H10N2O3S"),
    ("Sulfabenzamide", "C(=O)c1ccccc1", "C13H12N2O3S"),
    ("Sulfanilylurea", "C(N)=O", "C7H9N3O3S"),
    ("Sulfaguanidine", "=C(N)N", "C7H10N4O2S"),
]

# name, para substituent, formula
BENZENESULFONAMIDES = [
    ("Carzenide", "OC(=O)", "C7H7NO4S"),
    ("3-(4-Sulfamoylphenyl)propanoic acid", "OC(=O)CC", "C9H11NO4S"),
    ("Sulfasuccinamide", "OC(=O)CCC(=O)N", "C10H12N2O5S"),
    ("Benzenesulfonamide", "", "C6H7NO2S"),
    ("4-Methylbenzenesulfonamide", "C", "C7H9NO2S"),
    ("4-Chlorobenzenesulfonamide", "Cl", "C6H6ClNO2S"),
    ("4-Fluorobenzenesulfonamide", "F", "C6H6FNO2S"),
    ("4-Bromobenzenesulfonamide", "Br", "C6H6BrNO2S"),
    ("4-Methoxybenzenesulfonamide", "CO", "C7H9NO3S"),
    ("4-Hydroxybenzenesulfonamide", "O", "C6H7NO3S"),
    ("4-Nitrobenzenesulfonamide", "[O-][N+](=O)", "C6H6N2O4S"),
    ("4-Cyanobenzenesulfonamide", "N#C", "C7H6N2O2S"),
    ("4-Carbamoylbenzenesulfonamide", "NC(=O)", "C7H8N2O3S"),
    ("Mafenide", "NC", "C7H10N2O2S"),
    ("N4-Acetylsulfanilamide", "CC(=O)N", "C8H10N2O3S"),
    ("SLC-0111", "Fc1ccc(cc1)NC(=O)N", "C13H12FN3O3S"),
]

# name, C6 substituent, C3 substituent, N2 substituent, formula
THIAZIDES = [
    ("Hydrochlorothiazide", CL, "", "", "C7H8ClN3O4S2"),
    ("Hydroflumethiazide", CF3, "", "", "C8H8F3N3O4S2"),
    ("Bendroflumethiazide", CF3, "(Cc1ccccc1)", "", "C15H14F3N3O4S2"),
    ("Trichlormethiazide", CL, "(C(Cl)Cl)", "", "C8H8Cl3N3O4S2"),
    ("Methyclothiazide", CL, "(CCl)", "(C)", "C9H11Cl2N3O4S2"),
    ("Polythiazide", CL, "(CSCC(F)(F)F)", "(C)", "C11H13ClF3N3O4S3"),
    ("Epitizide", CL, "(CSCC(F)(F)F)", "", "C10H11ClF3N3O4S3"),
    ("Altizide", CL, "(CSCC=C)", "", "C11H14ClN3O4S3"),
    ("Cyclopenthiazide", CL, "(CC1CCCC1)", "", "C13H18ClN3O4S2"),
    ("Buthiazide", CL, "(CC(C)C)", "", "C11H16ClN3O4S2"),
    ("Ethiazide", CL, "(CC)", "", "C9H12ClN3O4S2"),
]

# name, class, structure, formula
SINGLETONS = [
    ("Chlorothiazide", "Diuretic",
     "NS(=O)(=O)c1cc2c(cc1Cl)N=CNS2(=O)=O", "C7H6ClN3O4S2"),
    ("Benzthiazide", "Diuretic",
     "NS(=O)(=O)c1cc2c(cc1Cl)N=C(CSCc1ccccc1)NS2(=O)=O",
     "C15H14ClN3O4S3"),
    ("Metolazone", "Diuretic",
     "CC1Nc2cc(Cl)c(S(N)(=O)=O)cc2C(=O)N1c1ccccc1C", "C16H16ClN3O3S"),
    ("Quinethazone", "Diuretic",
     "CCC1Nc2cc(Cl)c(S(N)(=O)=O)cc2C(=O)N1", "C10H12ClN3O3S"),
    ("Clopamide", "Diuretic",
     "CC1CCCC(C)N1NC(=O)c1ccc(Cl)c(c1)S(N)(=O)=O", "C14H20ClN3O3S"),
    ("Xipamide", "Diuretic",
     "Cc1cccc(C)c1NC(=O)c1cc(S(N)(=O)=O)c(Cl)cc1O", "C15H15ClN2O4S"),
    ("Mefruside", "Diuretic",
     "CN(CC1(C)CCCO1)S(=O)(=O)c1ccc(Cl)c(c1)S(N)(=O)=O",
     "C13H19ClN2O5S2"),
    ("Piretanide", "Diuretic",
     "OC(=O)c1cc(N2CCCC2)c(Oc2ccccc2)c(c1)S(N)(=O)=O", "C17H18N2O5S"),
    ("Etacrynic acid", "Diuretic",
     "CCC(=C)C(=O)c1ccc(OCC(=O)O)c(Cl)c1Cl", "C13H12Cl2O4"),
    ("Diazoxide", "Benzothiadiazine",
     "CC1=Nc2ccc(Cl)cc2S(=O)(=O)N1", "C8H7ClN2O2S"),
    ("Methazolamide", "Carbonic anhydrase inhibitor",
     "CC(=O)N=C1SC(=NN1C)S(N)(=O)=O", "C5H8N4O3S2"),
    ("Ethoxzolamide", "Carbonic anhydrase inhibitor",
     "CCOc1ccc2nc(S(N)(=O)=O)sc2c1", "C9H10N2O3S2"),
    ("Benzolamide", "Carbonic anhydrase inhibitor",
     "NS(=O)(=O)c1nnc(NS(=O)(=O)c2ccccc2)s1", "C8H8N4O4S3"),
    ("Dichlorphenamide", "Carbonic anhydrase inhibitor",
     "NS(=O)(=O)c1cc(S(N)(=O)=O)c(Cl)c(Cl)c1", "C6H6Cl2N2O4S2"),
    ("Clofenamide", "Carbonic anhydrase inhibitor",
     "NS(=O)(=O)c1cc(S(N)(=O)=O)c(Cl)cc1", "C6H7ClN2O4S2"),
    ("Sulthiame", "Carbonic anhydrase inhibitor",
     "NS(=O)(=O)c1ccc(cc1)N1CCCCS1(=O)=O", "C10H14N2O4S2"),
    ("Thiophene-2-sulfonamide", "Carbonic anhydrase inhibitor",
     "NS(=O)(=O)c1cccs1", "C4H5NO2S2"),
    ("1,3,4-Thiadiazole-2-sulfonamide", "Carbonic anhydrase inhibitor",
     "NS(=O)(=O)c1nncs1", "C2H3N3O2S2"),
    ("5-Amino-1,3,4-thiadiazole-2-sulfonamide",
     "Carbonic anhydrase inhibitor", "NS(=O)(=O)c1nnc(N)s1",
     "C2H4N4O2S2"),
    ("Succinylsulfathiazole", "Antibacterial",
     "OC(=O)CCC(=O)Nc1ccc(cc1)S(=O)(=O)Nc1nccs1", "C13H13N3O5S2"),
    ("Phthalylsulfathiazole", "Antibacterial",
     "OC(=O)c1ccccc1C(=O)Nc1ccc(cc1)S(=O)(=O)Nc1nccs1",
     "C17H13N3O5S2"),
    ("Acedapsone", "Antibacterial",
     "CC(=O)Nc1ccc(cc1)S(=O)(=O)c1ccc(NC(C)=O)cc1", "C16H16N2O4S"),
    ("4-Aminobenzoic acid", "Folate precursor",
     "Nc1ccc(cc1)C(=O)O", "C7H7NO2"),
    ("Sulfinpyrazone", "Uricosuric",
     "O=C1N(c2ccccc2)N(c2ccccc2)C(=O)C1CCS(=O)c1ccccc1",
     "C23H20N2O3S"),
    ("Benzbromarone", "Uricosuric",
     "CCc1oc2ccccc2c1C(=O)c1cc(Br)c(O)c(Br)c1", "C17H12Br2O3"),
    ("Lesinurad", "Uricosuric",
     "OC(=O)CSc1nnc(Br)n1-c1ccc(C2CC2)c2ccccc12",
     "C17H14BrN3O2S"),
    ("Tienilic acid", "Uricosuric",
     "OC(=O)COc1ccc(C(=O)c2cccs2)c(Cl)c1Cl", "C13H8Cl2O4S"),
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
        [(row[0], row[-1], SULFA.format(R=row[1]), "Antibacterial")
         for row in SULFAS]
        + [(row[0], row[-1], BENZENESULFONAMIDE.format(X=row[1]), "Sulfonamide")
           for row in BENZENESULFONAMIDES]
        + [(row[0], row[-1],
            THIAZIDE.format(X6=row[1], C3=row[2], N2=row[3]), "Diuretic")
           for row in THIAZIDES]
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
