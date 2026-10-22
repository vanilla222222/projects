"""Build sedative-hypnotic and anxiolytic reference structures by substitution on verified
parent scaffolds.

Run: python tools/derive-sedative-references.py [--output rows.js]

Two templates are used: the 1,4-benzodiazepin-2-one and the 5,5-disubstituted barbituric
acid ring (including its N1-substituted and 2-thioxo variants). Each template is validated
first by regenerating entries the library already stores and requiring a canonical-SMILES
match, so a template error fails the run instead of propagating into new rows. Chemotypes
with too few stored relatives to prove a template of their own - the oxazolo- and
thieno-fused diazepines, the 1,5- and 2,3-benzodiazepines, the quinazolin-4-ones, the
bromoureides and the remaining hypnotics - are written out as singletons instead.

Each compound then carries an independently stated molecular formula, which RDKit checks
against the formula computed from the constructed structure. Recalling the substitution
pattern and recalling the formula are separate acts of recall, so a disagreement between
them marks the entry as unreliable and the run fails rather than emitting it. Agreement is
evidence of consistency, not proof of identity: it cannot catch an error that leaves the
formula unchanged, which here means a halogen on the wrong ring, an isomeric C5
substituent, or an azole fused at the wrong position.

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

# {N1} N1 substituent ending at the ring nitrogen itself, {R7} benzo 7-substituent
# carrying its own parentheses, {AR} the 5-aryl or 5-cycloalkenyl group, {C3} the C3 atom
# with any 3-substituent. Ring digits 8 and 9 close the diazepine and its benzo ring,
# leaving 1-6 for the groups interpolated into the slots.
BZD = "{N1}8c9ccc{R7}cc9C({AR})=N{C3}C8=O"

# {X} the 2-chalcogen, {N1} the N1 substituent in parentheses, {RA}/{RB} the two C5
# substituents.
BARB = "{X}=C8N{N1}C(=O)C({RA})({RB})C(=O)N8"

NH, NME = "N", "CN"
CL, BR, NITRO = "(Cl)", "(Br)", "([N+](=O)[O-])"
PH, PHF, PHCL, PYR2 = "c1ccccc1", "c1ccccc1F", "c1ccccc1Cl", "c1ccccn1"
PHCL4, CHXENYL = "c1ccc(Cl)cc1", "C1=CCCCC1"
C3H, C3OH = "C", "C(O)"

# name, N1 substituent, benzo 7-substituent, 5-aryl, C3 atom, stated formula
BENZODIAZEPINES = [
    ("Diazepam", NME, CL, PH, C3H, "C16H13ClN2O"),
    ("Nordazepam", NH, CL, PH, C3H, "C15H11ClN2O"),
    ("Oxazepam", NH, CL, PH, C3OH, "C15H11ClN2O2"),
    ("Temazepam", NME, CL, PH, C3OH, "C16H13ClN2O2"),
    ("Lorazepam", NH, CL, PHCL, C3OH, "C15H10Cl2N2O2"),
    ("Clonazepam", NH, NITRO, PHCL, C3H, "C15H10ClN3O3"),
    ("Flunitrazepam", NME, NITRO, PHF, C3H, "C16H12FN3O3"),
    ("Bromazepam", NH, BR, PYR2, C3H, "C14H10BrN3O"),
    ("Flurazepam", "CCN(CC)CCN", CL, PHF, C3H, "C21H23ClFN3O"),
    ("Prazepam", "C1CC1CN", CL, PH, C3H, "C19H17ClN2O"),
    ("Clorazepate", NH, CL, PH, "C(C(=O)O)", "C16H11ClN2O3"),
    ("Camazepam", NME, CL, PH, "C(OC(=O)N(C)C)", "C19H18ClN3O3"),

    ("Cinolazepam", "N#CCCN", CL, PHF, C3OH, "C18H13ClFN3O2"),
    ("Ethyl loflazepate", NH, CL, PHF, "C(C(=O)OCC)", "C18H14ClFN2O3"),
    ("Fonazepam", NH, NITRO, PHF, C3H, "C15H10FN3O3"),
    ("Tetrazepam", NME, CL, CHXENYL, C3H, "C16H17ClN2O"),
    ("Nortetrazepam", NH, CL, CHXENYL, C3H, "C15H15ClN2O"),
    ("Gidazepam", "NNC(=O)CN", BR, PH, C3H, "C17H15BrN4O2"),
    ("Flutoprazepam", "C1CC1CN", CL, PHF, C3H, "C19H16ClFN2O"),
    ("Ro5-4864", NME, CL, PHCL4, C3H, "C16H12Cl2N2O"),
]

ETHYL, ALLYL, METHYL, VINYL = "CC", "CC=C", "C", "C=C"
AMYL, ISOAMYL, SBUTYL, ISOBUTYL = "C(C)CCC", "CCC(C)C", "C(C)CC", "CC(C)C"
PROPYL, ISOPROPYL, BUTYL, PENTYL, HEXYL = "CCC", "C(C)C", "CCCC", "CCCCC", "CCCCCC"
BENZYL, CYCLOHEXYL, NEOPENTYL = "Cc1ccccc1", "C1CCCCC1", "CC(C)(C)C"
BROMOALLYL, CHXENYL3 = "CC(Br)=C", "C1C=CCCC1"
CYCLOHEPTENYL = "C1=CCCCCC1"

# name, 2-chalcogen, N1 substituent, C5 substituent A, C5 substituent B, stated formula
BARBITURATES = [
    ("Barbital", "O", "", ETHYL, ETHYL, "C8H12N2O3"),
    ("Phenobarbital", "O", "", ETHYL, PH, "C12H12N2O3"),
    ("Probarbital", "O", "", ETHYL, ISOPROPYL, "C9H14N2O3"),
    ("Butabarbital", "O", "", ETHYL, SBUTYL, "C10H16N2O3"),
    ("Amobarbital", "O", "", ETHYL, ISOAMYL, "C11H18N2O3"),
    ("Pentobarbital", "O", "", ETHYL, AMYL, "C11H18N2O3"),
    ("Vinbarbital", "O", "", ETHYL, "C(C)=CCC", "C11H16N2O3"),
    ("Cyclobarbital", "O", "", ETHYL, CHXENYL, "C12H16N2O3"),
    ("Heptabarbital", "O", "", ETHYL, CYCLOHEPTENYL, "C13H18N2O3"),
    ("Allobarbital", "O", "", ALLYL, ALLYL, "C10H12N2O3"),
    ("Aprobarbital", "O", "", ALLYL, ISOPROPYL, "C10H14N2O3"),
    ("Talbutal", "O", "", ALLYL, SBUTYL, "C11H16N2O3"),
    ("Butalbital", "O", "", ALLYL, ISOBUTYL, "C11H16N2O3"),
    ("Secobarbital", "O", "", ALLYL, AMYL, "C12H18N2O3"),
    ("Metharbital", "O", "(C)", ETHYL, ETHYL, "C9H14N2O3"),
    ("Mephobarbital", "O", "(C)", ETHYL, PH, "C13H14N2O3"),
    ("Hexobarbital", "O", "(C)", METHYL, CHXENYL, "C12H16N2O3"),
    ("Methohexital", "O", "(C)", ALLYL, "C(C)C#CCC", "C14H18N2O3"),
    ("Thiobarbital", "S", "", ETHYL, ETHYL, "C8H12N2O2S"),
    ("Thiopental", "S", "", ETHYL, AMYL, "C11H18N2O2S"),
    ("Thiamylal", "S", "", ALLYL, AMYL, "C12H18N2O2S"),

    ("Alphenal", "O", "", ALLYL, PH, "C13H12N2O3"),
    ("Brallobarbital", "O", "", ALLYL, BROMOALLYL, "C10H11BrN2O3"),
    ("Nealbarbital", "O", "", ALLYL, NEOPENTYL, "C12H18N2O3"),
    ("Vinylbital", "O", "", VINYL, AMYL, "C11H16N2O3"),
    ("Butobarbital", "O", "", ETHYL, BUTYL, "C10H16N2O3"),
    ("Hexethal", "O", "", ETHYL, HEXYL, "C12H20N2O3"),
    ("Buthalital", "S", "", ALLYL, ISOBUTYL, "C11H16N2O2S"),
    ("Thialbarbital", "S", "", ALLYL, CHXENYL3, "C13H16N2O2S"),
    ("Thiobutabarbital", "S", "", ETHYL, SBUTYL, "C10H16N2O2S"),
    ("5-Methyl-5-phenylbarbituric acid", "O", "", METHYL, PH, "C11H10N2O3"),
    ("5-Propyl-5-phenylbarbituric acid", "O", "", PROPYL, PH, "C13H14N2O3"),
    ("5-Isopropyl-5-phenylbarbituric acid", "O", "", ISOPROPYL, PH,
     "C13H14N2O3"),
    ("5-Butyl-5-phenylbarbituric acid", "O", "", BUTYL, PH, "C14H16N2O3"),
    ("5,5-Diphenylbarbituric acid", "O", "", PH, PH, "C16H12N2O3"),
    ("5,5-Dimethylbarbituric acid", "O", "", METHYL, METHYL, "C6H8N2O3"),
    ("5,5-Dipropylbarbituric acid", "O", "", PROPYL, PROPYL, "C10H16N2O3"),
    ("5-Benzyl-5-ethylbarbituric acid", "O", "", ETHYL, BENZYL, "C13H14N2O3"),
    ("5-Cyclohexyl-5-ethylbarbituric acid", "O", "", ETHYL, CYCLOHEXYL,
     "C12H18N2O3"),
    ("5-Allyl-5-ethylbarbituric acid", "O", "", ETHYL, ALLYL, "C9H12N2O3"),
    ("5-Ethyl-5-isobutylbarbituric acid", "O", "", ETHYL, ISOBUTYL,
     "C10H16N2O3"),
    ("5-Ethyl-5-pentylbarbituric acid", "O", "", ETHYL, PENTYL, "C11H18N2O3"),
    ("5-Ethyl-5-propylbarbituric acid", "O", "", ETHYL, PROPYL, "C9H14N2O3"),
    ("5-Methyl-5-(cyclohex-1-en-1-yl)barbituric acid", "O", "", METHYL,
     CHXENYL, "C11H14N2O3"),
    ("5-Ethyl-5-phenyl-2-thiobarbituric acid", "S", "", ETHYL, PH,
     "C12H12N2O2S"),
    ("5,5-Diallyl-2-thiobarbituric acid", "S", "", ALLYL, ALLYL,
     "C10H12N2O2S"),
]

# name, class, structure, stated formula
SINGLETONS = [
    ("Chlordiazepoxide", "Benzodiazepine",
     "CNC1=Nc2ccc(Cl)cc2C(=[N+]([O-])C1)c1ccccc1", "C16H14ClN3O"),
    ("Demoxepam", "Benzodiazepine",
     "O=C1C[N+]([O-])=C(c2ccccc2)c2cc(Cl)ccc2N1", "C15H11ClN2O2"),
    ("Medazepam", "Benzodiazepine",
     "CN1CCN=C(c2ccccc2)c2cc(Cl)ccc21", "C16H15ClN2"),
    ("Metaclazepam", "Benzodiazepine",
     "CN1c2ccc(Br)cc2C(=NCC1COC)c1ccccc1Cl", "C18H18BrClN2O"),
    ("Quazepam", "Benzodiazepine",
     "S=C1CN=C(c2ccccc2F)c2cc(Cl)ccc2N1CC(F)(F)F", "C17H11ClF4N2S"),
    ("Clobazam", "Benzodiazepine",
     "CN1c2ccc(Cl)cc2N(c2ccccc2)C(=O)CC1=O", "C16H13ClN2O2"),
    ("Norclobazam", "Benzodiazepine",
     "O=C1CC(=O)N(c2ccccc2)c2cc(Cl)ccc2N1", "C15H11ClN2O2"),
    ("Ketazolam", "Benzodiazepine",
     "CC1=CC(=O)N2CC(=O)N(C)c3ccc(Cl)cc3C2(c2ccccc2)O1", "C20H17ClN2O3"),
    ("Oxazolam", "Benzodiazepine",
     "O=C1CN2CC(C)OC2(c2ccccc2)c2cc(Cl)ccc2N1", "C18H17ClN2O2"),
    ("Cloxazolam", "Benzodiazepine",
     "O=C1CN2CCOC2(c2ccccc2Cl)c2cc(Cl)ccc2N1", "C17H14Cl2N2O2"),
    ("Haloxazolam", "Benzodiazepine",
     "O=C1CN2CCOC2(c2ccccc2F)c2cc(Br)ccc2N1", "C17H14BrFN2O2"),
    ("Mexazolam", "Benzodiazepine",
     "O=C1CN2CC(C)OC2(c2ccccc2Cl)c2cc(Cl)ccc2N1", "C18H16Cl2N2O2"),
    ("Bentazepam", "Benzodiazepine",
     "O=C1CN=C(c2ccccc2)c2c3CCCCc3sc2N1", "C17H16N2OS"),
    ("Etizolam", "Benzodiazepine",
     "CCc1cc2c(s1)-n1c(C)nnc1CN=C2c1ccccc1Cl", "C17H15ClN4S"),
    ("Deschloroetizolam", "Benzodiazepine",
     "CCc1cc2c(s1)-n1c(C)nnc1CN=C2c1ccccc1", "C17H16N4S"),
    ("Brotizolam", "Benzodiazepine",
     "Brc1cc2c(s1)-n1c(C)nnc1CN=C2c1ccccc1Cl", "C15H10BrClN4S"),
    ("Tofisopam", "Benzodiazepine",
     "CCC1c2cc(OC)c(OC)cc2C(c2ccc(OC)c(OC)c2)=NN=C1C", "C22H26N2O4"),

    ("Primidone", "Anticonvulsant",
     "CCC1(c2ccccc2)CNC(=O)NC1=O", "C12H14N2O2"),
    ("Barbituric acid", "Barbiturate", "O=C1CC(=O)NC(=O)N1", "C4H4N2O3"),
    ("2-Thiobarbituric acid", "Barbiturate", "O=C1CC(=O)NC(=S)N1",
     "C4H4N2O2S"),
    ("1-Methylbarbituric acid", "Barbiturate", "CN1C(=O)CC(=O)NC1=O",
     "C5H6N2O3"),
    ("1,3-Dimethylbarbituric acid", "Barbiturate",
     "CN1C(=O)CC(=O)N(C)C1=O", "C6H8N2O3"),
    ("Eterobarb", "Barbiturate",
     "CCC1(c2ccccc2)C(=O)N(COC)C(=O)N(COC)C1=O", "C16H20N2O5"),

    ("Methaqualone", "Nonbenzodiazepine hypnotic",
     "Cc1ccccc1N1C(C)=Nc2ccccc2C1=O", "C16H14N2O"),
    ("Mecloqualone", "Nonbenzodiazepine hypnotic",
     "Clc1ccccc1N1C(C)=Nc2ccccc2C1=O", "C15H11ClN2O"),
    ("Etaqualone", "Nonbenzodiazepine hypnotic",
     "Cc1ccccc1N1C(CC)=Nc2ccccc2C1=O", "C17H16N2O"),
    ("Afloqualone", "Nonbenzodiazepine hypnotic",
     "Cc1ccccc1N1C(CF)=Nc2ccc(N)cc2C1=O", "C16H14FN3O"),
    ("Diproqualone", "Nonbenzodiazepine hypnotic",
     "OCC(O)CN1C(C)=Nc2ccccc2C1=O", "C12H14N2O3"),
    ("Pyrithyldione", "Nonbenzodiazepine hypnotic",
     "CCC1(CC)C(=O)C=CNC1=O", "C9H13NO2"),
    ("Ethinamate", "Nonbenzodiazepine hypnotic",
     "NC(=O)OC1(C#C)CCCCC1", "C9H13NO2"),
    ("Hexapropymate", "Nonbenzodiazepine hypnotic",
     "NC(=O)OC1(CC#C)CCCCC1", "C10H15NO2"),
    ("Mebutamate", "Nonbenzodiazepine hypnotic",
     "CCC(C)C(C)(COC(N)=O)COC(N)=O", "C10H20N2O4"),
    ("Tybamate", "Nonbenzodiazepine hypnotic",
     "CCCC(C)(COC(N)=O)COC(=O)NCCCC", "C13H26N2O4"),
    ("Paraldehyde", "Nonbenzodiazepine hypnotic", "CC1OC(C)OC(C)O1",
     "C6H12O3"),
    ("Chloral hydrate", "Nonbenzodiazepine hypnotic", "OC(O)C(Cl)(Cl)Cl",
     "C2H3Cl3O2"),
    ("Trichloroethanol", "Nonbenzodiazepine hypnotic", "OCC(Cl)(Cl)Cl",
     "C2H3Cl3O"),
    ("Triclofos", "Nonbenzodiazepine hypnotic", "OP(=O)(O)OCC(Cl)(Cl)Cl",
     "C2H4Cl3O4P"),
    ("Methylpentynol", "Nonbenzodiazepine hypnotic", "CCC(C)(O)C#C", "C6H10O"),
    ("Carbromal", "Nonbenzodiazepine hypnotic", "CCC(CC)(Br)C(=O)NC(N)=O",
     "C7H13BrN2O2"),
    ("Bromisoval", "Nonbenzodiazepine hypnotic", "CC(C)C(Br)C(=O)NC(N)=O",
     "C6H11BrN2O2"),
    ("Acecarbromal", "Nonbenzodiazepine hypnotic",
     "CCC(CC)(Br)C(=O)NC(=O)NC(C)=O", "C9H15BrN2O3"),
    ("Apronal", "Nonbenzodiazepine hypnotic", "C=CCC(C(C)C)C(=O)NC(N)=O",
     "C9H16N2O2"),
    ("Sulfonal", "Nonbenzodiazepine hypnotic",
     "CCS(=O)(=O)C(C)(C)S(=O)(=O)CC", "C7H16O4S2"),
    ("Trional", "Nonbenzodiazepine hypnotic",
     "CCS(=O)(=O)C(C)(CC)S(=O)(=O)CC", "C8H18O4S2"),
    ("Tetronal", "Nonbenzodiazepine hypnotic",
     "CCS(=O)(=O)C(CC)(CC)S(=O)(=O)CC", "C9H20O4S2"),
    ("Fospropofol", "Nonbenzodiazepine hypnotic",
     "CC(C)c1cccc(C(C)C)c1OCOP(=O)(O)O", "C13H21O5P"),
    ("Desmethylzopiclone", "Nonbenzodiazepine hypnotic",
     "O=C(OC1c2nccnc2C(=O)N1c1ccc(Cl)cn1)N1CCNCC1", "C16H15ClN6O3"),
    ("Ro15-4513", "Nonbenzodiazepine hypnotic",
     "CCOC(=O)C1=C2CN(C(=O)C3=C(N2C=N1)C=CC(=C3)N=[N+]=[N-])C",
     "C15H14N6O3"),
    ("Tasimelteon", "Nonbenzodiazepine hypnotic",
     "CCC(=O)NCC1CC1c1cccc2OCCc12", "C15H19NO2"),
    ("Lemborexant", "Nonbenzodiazepine hypnotic",
     "Cc1nc(C)ncc1OCC1(c2cccc(F)c2)CC1C(=O)Nc1ccc(F)cn1",
     "C22H20F2N4O2"),
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
