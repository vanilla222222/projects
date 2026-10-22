"""Build beta-lactam and quinolone reference structures by substitution on verified cores.

Run: python tools/derive-antibacterial-references.py [--output rows.js]

Three templates are used: the penam (penicillin) core, the cephem (cephalosporin) core and
the 4-oxoquinoline-3-carboxylic acid core. Each is validated first by regenerating entries
the library already stores and requiring a canonical-SMILES match, so a template error
fails the run instead of propagating into new rows.

Each compound then carries an independently stated molecular formula, which RDKit checks
against the formula computed from the constructed structure. Recalling the substitution
pattern and recalling the formula are separate acts of recall, so a disagreement between
them marks the entry as unreliable and the run fails rather than emitting it. Agreement is
evidence of consistency, not proof of identity: it cannot catch an error that leaves the
formula unchanged, which for these cores means a substituent placed on the wrong ring
position or the wrong configuration at a stereocentre.

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

# {ACYL} the 6-acyl fragment, which bonds the 6-amino nitrogen written before it; an empty
# slot leaves the free amine of 6-aminopenicillanic acid. Ring digits 8 and 9 close the
# bicycle, leaving 1-7 free for interpolated side-chain rings.
PENAM = "CC9(C)SC8C(N{ACYL})C(=O)N8C9C(=O)O"

# {R3} the 3-substituent, ending at the atom that bonds C3, empty for a 3-unsubstituted
# cephem; {ACYL} the 7-acyl fragment; {OX} the carboxyl oxygen, deprotonated in the
# zwitterionic quaternary-ammonium members.
CEPHEM = "{R3}C9=C(C(=O){OX})N8C(=O)C(N{ACYL})C8SC9"

# {N1} the N1 substituent; {C8S} {C7S} {C6S} {C5S} the benzo-ring substituents, each
# written with its own parentheses so an unsubstituted position can be left empty.
QUINOLONE = "OC(=O)C9=CN({N1})c8c{C8S}c{C7S}c{C6S}c{C5S}c8C9=O"

PENICILLIN = "Penicillin"
CEPHALOSPORIN = "Cephalosporin"
FLUOROQUINOLONE = "Fluoroquinolone"

AMINOPHENYLACETYL = "C(=O)C(N)c1ccccc1"
DIHYDROPHENYLGLYCYL = "C(=O)C(N)C1=CCCC=C1"
ACETOXYMETHYL = "CC(=O)OC"
METHYLTETRAZOLYLTHIOMETHYL = "Cn1nnnc1SC"
METHYLTHIADIAZOLYLTHIOMETHYL = "Cc1nnc(s1)SC"
AMINOTHIAZOLYL_METHOXYIMINO = "C(=O)C(=NOC)c1csc(N)n1"
PIPERAZINYL = "(N1CCNCC1)"
METHYLPIPERAZINYL = "(N1CCN(C)CC1)"
METHYLPIPERAZINYL3 = "(N1CCNC(C)C1)"
CYCLOPROPYL = "C1CC1"
FLUORO = "(F)"

# name, 6-acyl fragment, formula
PENICILLINS = [
    ("Penicillin G", "C(=O)Cc1ccccc1", "C16H18N2O4S"),
    ("Penicillin V", "C(=O)COc1ccccc1", "C16H18N2O5S"),
    ("Ampicillin", AMINOPHENYLACETYL, "C16H19N3O4S"),
    ("Amoxicillin", "C(=O)C(N)c1ccc(O)cc1", "C16H19N3O5S"),
    ("Oxacillin", "C(=O)c1c(-c2ccccc2)noc1C", "C19H19N3O5S"),
    ("Cloxacillin", "C(=O)c1c(-c2ccccc2Cl)noc1C", "C19H18ClN3O5S"),
    ("Flucloxacillin", "C(=O)c1c(-c2c(Cl)cccc2F)noc1C", "C19H17ClFN3O5S"),
    ("Ticarcillin", "C(=O)C(C(=O)O)c1cccs1", "C15H16N2O6S2"),
    ("Piperacillin", "C(=O)C(NC(=O)N1CCN(CC)C(=O)C1=O)c1ccccc1",
     "C23H27N5O7S"),
    ("6-Aminopenicillanic acid", "", "C8H12N2O3S"),
    ("Methicillin", "C(=O)c1c(OC)cccc1OC", "C17H20N2O6S"),
    ("Nafcillin", "C(=O)c1c(OCC)ccc2ccccc12", "C21H22N2O5S"),
    ("Dicloxacillin", "C(=O)c1c(-c2c(Cl)cccc2Cl)noc1C", "C19H17Cl2N3O5S"),
    ("Carbenicillin", "C(=O)C(C(=O)O)c1ccccc1", "C17H18N2O6S"),
    ("Azlocillin", "C(=O)C(NC(=O)N1CCNC1=O)c1ccccc1", "C20H23N5O6S"),
    ("Mezlocillin", "C(=O)C(NC(=O)N1CCN(S(C)(=O)=O)C1=O)c1ccccc1",
     "C21H25N5O8S2"),
    ("Phenethicillin", "C(=O)C(C)Oc1ccccc1", "C17H20N2O5S"),
    ("Propicillin", "C(=O)C(CC)Oc1ccccc1", "C18H22N2O5S"),
    ("Azidocillin", "C(=O)C(N=[N+]=[N-])c1ccccc1", "C16H17N5O4S"),
    ("Epicillin", DIHYDROPHENYLGLYCYL, "C16H21N3O4S"),
    ("Ciclacillin", "C(=O)C1(N)CCCCC1", "C15H23N3O4S"),
]

# name, 3-substituent, 7-acyl fragment, carboxyl oxygen, formula
CEPHALOSPORINS = [
    ("Cefalexin", "C", AMINOPHENYLACETYL, "O", "C16H17N3O4S"),
    ("Cefadroxil", "C", "C(=O)C(N)c1ccc(O)cc1", "O", "C16H17N3O5S"),
    ("Cefazolin", METHYLTHIADIAZOLYLTHIOMETHYL, "C(=O)Cn1cnnn1", "O",
     "C14H14N8O4S3"),
    ("Cefotaxime", ACETOXYMETHYL, AMINOTHIAZOLYL_METHOXYIMINO, "O",
     "C16H17N5O7S2"),
    ("Cefuroxime", "NC(=O)OC", "C(=O)C(=NOC)c1ccco1", "O", "C16H16N4O8S"),
    ("Cefalotin", ACETOXYMETHYL, "C(=O)Cc1cccs1", "O", "C16H16N2O6S2"),
    ("Cefapirin", ACETOXYMETHYL, "C(=O)CSc1ccncc1", "O", "C17H17N3O6S2"),
    ("Cefacetrile", ACETOXYMETHYL, "C(=O)CC#N", "O", "C13H13N3O6S"),
    ("Cefaclor", "Cl", AMINOPHENYLACETYL, "O", "C15H14ClN3O4S"),
    ("Cephradine", "C", DIHYDROPHENYLGLYCYL, "O", "C16H19N3O4S"),
    ("Cefroxadine", "CO", DIHYDROPHENYLGLYCYL, "O", "C16H19N3O5S"),
    ("Cefatrizine", "c1n[nH]nc1SC", "C(=O)C(N)c1ccc(O)cc1", "O",
     "C18H18N6O5S2"),
    ("Cefamandole", METHYLTETRAZOLYLTHIOMETHYL, "C(=O)C(O)c1ccccc1", "O",
     "C18H18N6O5S2"),
    ("Cefonicid", "OS(=O)(=O)Cn1nnnc1SC", "C(=O)C(O)c1ccccc1", "O",
     "C18H18N6O8S3"),
    ("Cefmenoxime", METHYLTETRAZOLYLTHIOMETHYL, AMINOTHIAZOLYL_METHOXYIMINO,
     "O", "C16H17N9O5S3"),
    ("Cefotiam", "CN(C)CCn1nnnc1SC", "C(=O)Cc1csc(N)n1", "O",
     "C18H23N9O4S3"),
    ("Ceftezole", "c1nnc(s1)SC", "C(=O)Cn1cnnn1", "O", "C13H12N8O4S3"),
    ("Cefoperazone", METHYLTETRAZOLYLTHIOMETHYL,
     "C(=O)C(NC(=O)N1CCN(CC)C(=O)C1=O)c1ccc(O)cc1", "O", "C25H27N9O8S2"),
    ("Ceftizoxime", "", AMINOTHIAZOLYL_METHOXYIMINO, "O", "C13H13N5O5S2"),
    ("Cefixime", "C=C", "C(=O)C(=NOCC(=O)O)c1csc(N)n1", "O",
     "C16H15N5O7S2"),
    ("Cefpodoxime", "COC", AMINOTHIAZOLYL_METHOXYIMINO, "O",
     "C15H17N5O6S2"),
    ("Cefdinir", "C=C", "C(=O)C(=NO)c1csc(N)n1", "O", "C14H13N5O5S2"),
    ("Ceftibuten", "", "C(=O)C(=CCC(=O)O)c1csc(N)n1", "O", "C15H14N4O6S2"),
]

# name, N1 substituent, C8, C7, C6, C5, formula
QUINOLONES = [
    ("Ciprofloxacin", CYCLOPROPYL, "", PIPERAZINYL, FLUORO, "",
     "C17H18FN3O3"),
    ("Norfloxacin", "CC", "", PIPERAZINYL, FLUORO, "", "C16H18FN3O3"),
    ("Moxifloxacin", CYCLOPROPYL, "(OC)", "(N1CC2CCCNC2C1)", FLUORO, "",
     "C21H24FN3O4"),
    ("Pefloxacin", "CC", "", METHYLPIPERAZINYL, FLUORO, "", "C17H20FN3O3"),
    ("Lomefloxacin", "CC", FLUORO, METHYLPIPERAZINYL3, FLUORO, "",
     "C17H19F2N3O3"),
    ("Fleroxacin", "CCF", FLUORO, METHYLPIPERAZINYL, FLUORO, "",
     "C17H18F3N3O3"),
    ("Amifloxacin", "NC", "", METHYLPIPERAZINYL, FLUORO, "",
     "C16H19FN4O3"),
    ("Enrofloxacin", CYCLOPROPYL, "", "(N1CCN(CC)CC1)", FLUORO, "",
     "C19H22FN3O3"),
    ("Sarafloxacin", "c1ccc(F)cc1", "", PIPERAZINYL, FLUORO, "",
     "C20H17F2N3O3"),
    ("Difloxacin", "c1ccc(F)cc1", "", METHYLPIPERAZINYL, FLUORO, "",
     "C21H19F2N3O3"),
    ("Orbifloxacin", CYCLOPROPYL, FLUORO, "(N1CC(C)NC(C)C1)", FLUORO,
     FLUORO, "C19H20F3N3O3"),
    ("Sparfloxacin", CYCLOPROPYL, FLUORO, "(N1CC(C)NC(C)C1)", FLUORO,
     "(N)", "C19H22F2N4O3"),
    ("Gatifloxacin", CYCLOPROPYL, "(OC)", METHYLPIPERAZINYL3, FLUORO, "",
     "C19H22FN3O4"),
    ("Grepafloxacin", CYCLOPROPYL, "", METHYLPIPERAZINYL3, FLUORO, "(C)",
     "C19H22FN3O3"),
    ("Clinafloxacin", CYCLOPROPYL, "(Cl)", "(N1CCC(N)C1)", FLUORO, "",
     "C17H17ClFN3O3"),
    ("Besifloxacin", CYCLOPROPYL, "(Cl)", "(N1CC(N)CCCC1)", FLUORO, "",
     "C19H21ClFN3O3"),
    ("Rosoxacin", "CC", "", "(-c1ccncc1)", "", "", "C17H14N2O3"),
]

# name, class, structure, formula
SINGLETONS = [
    ("Nalidixic acid", "Quinolone", "CCn1cc(C(=O)O)c(=O)c2ccc(C)nc21",
     "C12H12N2O3"),
    ("Enoxacin", FLUOROQUINOLONE,
     "CCn1cc(C(=O)O)c(=O)c2cc(F)c(N3CCNCC3)nc21", "C15H17FN4O3"),
    ("Oxolinic acid", "Quinolone", "CCn1cc(C(=O)O)c(=O)c2cc3OCOc3cc21",
     "C13H11NO5"),
    ("Cinoxacin", "Quinolone", "CCn1nc(C(=O)O)c(=O)c2cc3OCOc3cc21",
     "C12H10N2O5"),
    ("Flumequine", FLUOROQUINOLONE,
     "CC1CCc2c(F)ccc3c(=O)c(C(=O)O)cn1c23", "C14H12FNO3"),
    ("Pipemidic acid", "Quinolone",
     "CCn1cc(C(=O)O)c(=O)c2cnc(N3CCNCC3)nc21", "C14H17N5O3"),
    ("Piromidic acid", "Quinolone",
     "CCn1cc(C(=O)O)c(=O)c2cnc(N3CCCC3)nc21", "C14H16N4O3"),
    ("Loracarbef", "Carbacephem",
     "ClC1=C(N2C(CC1)C(NC(=O)C(N)c1ccccc1)C2=O)C(=O)O",
     "C16H16ClN3O4"),
    ("Sulbactam", "Beta-lactamase inhibitor",
     "CC1(C)S(=O)(=O)C2CC(=O)N2C1C(=O)O", "C8H11NO5S"),
    ("Tazobactam", "Beta-lactamase inhibitor",
     "CC1(Cn2ccnn2)S(=O)(=O)C2CC(=O)N2C1C(=O)O", "C10H12N4O5S"),
    ("Thienamycin", "Carbapenem",
     "CC(O)C1C2CC(SCCN)=C(C(=O)O)N2C1=O", "C11H16N2O4S"),
    ("Doripenem", "Carbapenem",
     "CC1C2C(C(=O)O)=C(SC3CNC(CNS(N)(=O)=O)C3)N2C(=O)C1C(C)O",
     "C15H24N4O6S2"),
    ("Panipenem", "Carbapenem",
     "C1C2C(C(=O)O)=C(SC3CCN(C(C)=N)C3)N2C(=O)C1C(C)O", "C15H21N3O4S"),
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
        [(row[0], row[-1], PENAM.format(ACYL=row[1]), PENICILLIN)
         for row in PENICILLINS]
        + [(row[0], row[-1],
            CEPHEM.format(R3=row[1], ACYL=row[2], OX=row[3]), CEPHALOSPORIN)
           for row in CEPHALOSPORINS]
        + [(row[0], row[-1],
            QUINOLONE.format(N1=row[1], C8S=row[2], C7S=row[3], C6S=row[4],
                             C5S=row[5]), FLUOROQUINOLONE)
           for row in QUINOLONES]
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
