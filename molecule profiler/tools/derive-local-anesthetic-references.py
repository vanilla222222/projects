"""Build local-anaesthetic and sodium-channel-blocker reference structures by substitution
on verified parent scaffolds.

Run: python tools/derive-local-anesthetic-references.py [--output rows.js]

Two templates are used: the aminoamide anilide (an aryl ring, an amide and an amine tail)
and the aminoester (an aroyl ester of an aminoalkanol). Each is validated first by
regenerating entries the library already stores and requiring a canonical-SMILES match, so
a template error fails the run instead of propagating into new rows.

Each compound then carries an independently stated molecular formula, which RDKit checks
against the formula computed from the constructed structure. Recalling the substitution
pattern and recalling the formula are separate acts of recall, so a disagreement between
them marks the entry as unreliable and the run fails rather than emitting it. Agreement is
evidence of consistency, not proof of identity: it cannot catch an error that leaves the
formula unchanged, which for these scaffolds means a substituent placed on the wrong ring
carbon, the wrong N-alkyl homologue, or an ester written in the wrong direction.

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

# {AR} the N-aryl fragment, ending at the ring carbon that bonds to the amide nitrogen;
# {CH} the alpha carbon of the acyl chain, ending at the atom that bonds to the amine
# nitrogen; {AM} the amine substitution, empty for a primary amine. Ring digit 9 is
# reserved for a ring that spans the {CH} and {AM} slots, as in the pipecolyl anilides.
AMIDE = "{AR}NC(=O){CH}N{AM}"

# {AR} the aroyl fragment, ending at the ring carbon that bonds to the ester carbonyl;
# {CH2} the alkanol chain, ending at the carbon that bonds to the amine nitrogen;
# {AM} the amine substitution.
ESTER = "{AR}C(=O)O{CH2}N{AM}"

XYLYL = "Cc1cccc(C)c1"
TOLYL = "Cc1ccccc1"
MESITYL = "Cc1cc(C)cc(C)c1"
PABA = "Nc1ccc(cc1)"
PHENYL = "c1ccccc1"
DIETHYL = "(CC)CC"
PIPECOLYL = "C9CCCC"
METHYLPIPERIDINO = "2C(C)CCCC2"

# name, class, N-aryl fragment, alpha carbon, amine substitution, formula
AMIDES = [
    ("Lidocaine", "Local anesthetic", XYLYL, "C", DIETHYL, "C14H22N2O"),
    ("Bupivacaine", "Local anesthetic", XYLYL, PIPECOLYL, "9CCCC",
     "C18H28N2O"),
    ("Ropivacaine", "Local anesthetic", XYLYL, PIPECOLYL, "9CCC",
     "C17H26N2O"),
    ("Mepivacaine", "Local anesthetic", XYLYL, PIPECOLYL, "9C",
     "C15H22N2O"),
    ("Prilocaine", "Local anesthetic", TOLYL, "C(C)", "CCC", "C13H20N2O"),
    ("Etidocaine", "Local anesthetic", XYLYL, "C(CC)", "(CC)CCC",
     "C17H28N2O"),
    ("Trimecaine", "Local anesthetic", MESITYL, "C", DIETHYL,
     "C15H24N2O"),
    ("Pyrrocaine", "Local anesthetic", XYLYL, "C", "2CCCC2", "C14H20N2O"),
    ("Butanilicaine", "Local anesthetic", "Cc1cccc(Cl)c1", "C", "CCCC",
     "C13H19ClN2O"),
    ("Monoethylglycinexylidide", "Local anesthetic", XYLYL, "C", "CC",
     "C12H18N2O"),
    ("Glycinexylidide", "Local anesthetic", XYLYL, "C", "", "C10H14N2O"),
    ("Pipecolylxylidide", "Local anesthetic", XYLYL, PIPECOLYL, "9",
     "C14H20N2O"),
    ("Tocainide", "Antiarrhythmic", XYLYL, "C(C)", "", "C11H16N2O"),
]

# name, class, aroyl fragment, alkanol chain, amine substitution, formula
ESTERS = [
    ("Procaine", "Local anesthetic", PABA, "CC", DIETHYL, "C13H20N2O2"),
    ("Tetracaine", "Local anesthetic", "CCCCNc1ccc(cc1)", "CC", "(C)C",
     "C15H24N2O2"),
    ("Clormecaine", "Local anesthetic", "Nc1cc(ccc1Cl)", "CC", "(C)C",
     "C11H15ClN2O2"),
    ("Chloroprocaine", "Local anesthetic", "Nc1ccc(c(Cl)c1)", "CC",
     DIETHYL, "C13H19ClN2O2"),
    ("Propoxycaine", "Local anesthetic", "Nc1ccc(c(OCCC)c1)", "CC",
     DIETHYL, "C16H26N2O3"),
    ("Proparacaine", "Local anesthetic", "Nc1cc(ccc1OCCC)", "CC",
     DIETHYL, "C16H26N2O3"),
    ("Oxybuprocaine", "Local anesthetic", "CCCCOc1cc(ccc1N)", "CC",
     DIETHYL, "C17H28N2O3"),
    ("Butacaine", "Local anesthetic", PABA, "CCC", "(CCCC)CCCC",
     "C18H30N2O2"),
    ("Butethamine", "Local anesthetic", PABA, "CC", "CC(C)C",
     "C13H20N2O2"),
    ("Dimethocaine", "Local anesthetic", PABA, "CC(C)(C)C", DIETHYL,
     "C16H26N2O2"),
    ("Parethoxycaine", "Local anesthetic", "CCOc1ccc(cc1)", "CC", DIETHYL,
     "C15H23NO3"),
    ("Amylocaine", "Local anesthetic", PHENYL, "C(C)(CC)C", "(C)C",
     "C14H21NO2"),
    ("Meprylcaine", "Local anesthetic", PHENYL, "CC(C)(C)", "CCC",
     "C14H21NO2"),
    ("Isobucaine", "Local anesthetic", PHENYL, "CC(C)(C)", "CC(C)C",
     "C15H23NO2"),
    ("Hexylcaine", "Local anesthetic", PHENYL, "C(C)C", "C2CCCCC2",
     "C16H23NO2"),
    ("Piperocaine", "Local anesthetic", PHENYL, "CCC", METHYLPIPERIDINO,
     "C16H23NO2"),
    ("Cyclomethycaine", "Local anesthetic", "C2CCCCC2Oc1ccc(cc1)", "CCC",
     "3C(C)CCCC3", "C22H33NO3"),
]

# name, class, structure, formula
SINGLETONS = [
    ("Benzocaine", "Local anesthetic", "CCOC(=O)c1ccc(N)cc1", "C9H11NO2"),
    ("Butamben", "Local anesthetic", "CCCCOC(=O)c1ccc(N)cc1",
     "C11H15NO2"),
    ("Isobutamben", "Local anesthetic", "CC(C)COC(=O)c1ccc(N)cc1",
     "C11H15NO2"),
    ("Risocaine", "Local anesthetic", "CCCOC(=O)c1ccc(N)cc1",
     "C10H13NO2"),
    ("Tricaine", "Local anesthetic", "CCOC(=O)c1cccc(N)c1", "C9H11NO2"),
    ("Pramoxine", "Local anesthetic",
     "CCCCOc1ccc(OCCCN2CCOCC2)cc1", "C17H27NO3"),
    ("Dyclonine", "Local anesthetic",
     "CCCCOc1ccc(cc1)C(=O)CCN1CCCCC1", "C18H27NO2"),
    ("Phenacaine", "Local anesthetic",
     "CCOc1ccc(cc1)N=C(C)Nc1ccc(OCC)cc1", "C18H22N2O2"),
    ("Cinchocaine", "Local anesthetic",
     "CCCCOc1cc(C(=O)NCCN(CC)CC)c2ccccc2n1", "C20H29N3O2"),
    ("Quinisocaine", "Local anesthetic",
     "CCCCc1cc2ccccc2c(OCCN(C)C)n1", "C17H24N2O"),
    ("Diperodon", "Local anesthetic",
     "O=C(Nc1ccccc1)OCC(CN1CCCCC1)OC(=O)Nc1ccccc1", "C22H27N3O4"),
    ("Oxetacaine", "Local anesthetic",
     "OCCN(CC(=O)N(C)C(C)(C)Cc1ccccc1)CC(=O)N(C)C(C)(C)Cc1ccccc1",
     "C28H41N3O3"),
    ("QX-314", "Local anesthetic",
     "CC[N+](CC)(CC)CC(=O)Nc1c(C)cccc1C", "C16H27N2O+"),
    ("Procainamide", "Antiarrhythmic",
     "Nc1ccc(cc1)C(=O)NCCN(CC)CC", "C13H21N3O"),
    ("Acecainide", "Antiarrhythmic",
     "CC(=O)Nc1ccc(cc1)C(=O)NCCN(CC)CC", "C15H23N3O2"),
    ("Disopyramide", "Antiarrhythmic",
     "CC(C)N(C(C)C)CCC(C(N)=O)(c1ccccc1)c1ccccn1", "C21H29N3O"),
    ("Encainide", "Antiarrhythmic",
     "COc1ccc(cc1)C(=O)Nc1ccccc1CCC1CCCCN1C", "C22H28N2O2"),
    ("Moricizine", "Antiarrhythmic",
     "CCOC(=O)Nc1ccc2Sc3ccccc3N(C(=O)CCN3CCOCC3)c2c1", "C22H25N3O4S"),
    ("Aprindine", "Antiarrhythmic",
     "CCN(CC)CCCN(c1ccccc1)C1Cc2ccccc2C1", "C22H30N2"),
    ("Lorcainide", "Antiarrhythmic",
     "CC(C)N1CCC(CC1)N(C(=O)Cc1ccccc1)c1ccc(Cl)cc1", "C22H27ClN2O"),
    ("Cibenzoline", "Antiarrhythmic",
     "C1(c2ccccc2)(c2ccccc2)CC1C1=NCCN1", "C18H18N2"),
    ("Ethotoin", "Anticonvulsant", "CCN1C(=O)NC(c2ccccc2)C1=O",
     "C11H12N2O2"),
    ("Mephenytoin", "Anticonvulsant", "CCC1(c2ccccc2)NC(=O)N(C)C1=O",
     "C12H14N2O2"),
    ("Nirvanol", "Anticonvulsant", "CCC1(c2ccccc2)NC(=O)NC1=O",
     "C11H12N2O2"),
    ("Carbamazepine-10,11-epoxide", "Anticonvulsant",
     "NC(=O)N1c2ccccc2C3OC3c2ccccc21", "C15H12N2O2"),
    ("Eslicarbazepine acetate", "Anticonvulsant",
     "NC(=O)N1c2ccccc2CC(OC(C)=O)c2ccccc21", "C17H16N2O3"),
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
        [(row[0], row[1], row[-1],
          AMIDE.format(AR=row[2], CH=row[3], AM=row[4]))
         for row in AMIDES]
        + [(row[0], row[1], row[-1],
            ESTER.format(AR=row[2], CH2=row[3], AM=row[4]))
           for row in ESTERS]
        + [(row[0], row[1], row[3], row[2]) for row in SINGLETONS])

    seen = {}
    for name, (_formula, smiles) in stored.items():
        key = flat(smiles)
        if key is not None:
            seen.setdefault(key, name)

    failures, rows, anchors = [], [], []
    for name, cls, stated, smiles in families:
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
