"""Build morphinan opioid reference structures by substitution on a verified parent scaffold.

Run: python tools/derive-opioid-references.py [--output rows.js]

Every structure here is written as a substituent pattern on one 4,5-epoxymorphinan
template rather than recalled whole. The template is validated first by regenerating
Morphine, Naloxone and Naltrexone and requiring a canonical-SMILES match against the
structures already stored in the library, so a template error fails the run instead of
propagating into new rows.

Each compound then carries an independently stated molecular formula, which RDKit checks
against the formula computed from the constructed structure. Recalling the substitution
pattern and recalling the formula are separate acts of recall, so a disagreement between
them marks the entry as unreliable and the run fails rather than emitting it. Agreement is
evidence of consistency, not proof of identity: it cannot catch an error that leaves the
formula unchanged, which for this scaffold means a substituent placed on the wrong ring
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

# {N} N-substituent, {R3} phenolic 3-substituent, {RING} C6-C7-C8 of ring C,
# {R14} optional C14 substituent.
TEMPLATE = "{N}1CCC23c4c5ccc({R3})c4OC2{RING}C3{R14}C1C5"

METHYL, ALLYL, CPM = "CN", "C=CCN", "C1CC1CN"
CBM, NOR = "C1CCC1CN", "N"

# C6/C7/C8 patterns.
ENOL_6OH = "C(O)C=C"        # 6-hydroxy, 7,8-ene (morphine)
SAT_6OH = "C(O)CC"          # 6-hydroxy, 7,8-dihydro
SAT_6KETO = "C(=O)CC"       # 6-keto, 7,8-dihydro
ENE_6KETO = "C(=O)C=C"      # 6-keto, 7,8-ene (codeinone)
SAT_6METHYLENE = "C(=C)CC"  # 6-methylene

ACETYL = "OC(C)=O"

# name, N-substituent, 3-substituent, ring C pattern, C14 substituent, stated formula
COMPOUNDS = [
    ("Morphine", METHYL, "O", ENOL_6OH, "", "C17H19NO3"),
    ("Naloxone", ALLYL, "O", SAT_6KETO, "(O)", "C19H21NO4"),
    ("Naltrexone", CPM, "O", SAT_6KETO, "(O)", "C20H23NO4"),

    ("Hydromorphone", METHYL, "O", SAT_6KETO, "", "C17H19NO3"),
    ("Hydrocodone", METHYL, "OC", SAT_6KETO, "", "C18H21NO3"),
    ("Oxymorphone", METHYL, "O", SAT_6KETO, "(O)", "C17H19NO4"),
    ("Dihydromorphine", METHYL, "O", SAT_6OH, "", "C17H21NO3"),
    ("Dihydrocodeine", METHYL, "OC", SAT_6OH, "", "C18H23NO3"),
    ("Morphinone", METHYL, "O", ENE_6KETO, "", "C17H17NO3"),
    ("Codeinone", METHYL, "OC", ENE_6KETO, "", "C18H19NO3"),
    ("14-Hydroxycodeinone", METHYL, "OC", ENE_6KETO, "(O)", "C18H19NO4"),
    ("Ethylmorphine", METHYL, "OCC", ENOL_6OH, "", "C19H23NO3"),
    ("Diamorphine", METHYL, ACETYL, "C(OC(C)=O)C=C", "", "C21H23NO5"),
    ("6-Monoacetylmorphine", METHYL, "O", "C(OC(C)=O)C=C", "", "C19H21NO4"),
    ("3-Monoacetylmorphine", METHYL, ACETYL, ENOL_6OH, "", "C19H21NO4"),
    ("Nalorphine", ALLYL, "O", ENOL_6OH, "", "C19H21NO3"),
    ("Nalmefene", CPM, "O", SAT_6METHYLENE, "(O)", "C21H25NO3"),
    ("Nalbuphine", CBM, "O", SAT_6OH, "(O)", "C21H27NO4"),
    ("Naltrexol", CPM, "O", SAT_6OH, "(O)", "C20H25NO4"),
    ("Noroxymorphone", "N", "O", SAT_6KETO, "(O)", "C16H17NO4"),
    ("Normorphine", "N", "O", ENOL_6OH, "", "C16H17NO3"),
    ("Norcodeine", "N", "OC", ENOL_6OH, "", "C17H19NO3"),
    ("Norhydrocodone", "N", "OC", SAT_6KETO, "", "C17H19NO3"),
    ("Noroxycodone", "N", "OC", SAT_6KETO, "(O)", "C17H19NO4"),
    ("Oxycodone", METHYL, "OC", SAT_6KETO, "(O)", "C18H21NO4"),
    ("Codeine", METHYL, "OC", ENOL_6OH, "", "C18H21NO3"),
]

# {ACYL} anilide acyl group, {ARYL} the N-aryl ring, {C4} piperidine 4-substituent,
# {NSUB} piperidine nitrogen substituent, {C3} piperidine 3-substituent.
# Ring number 9 keeps the piperidine closure clear of the aryl and N-substituent rings,
# which are written with low numbers and may be open at the same time.
ANILIDOPIPERIDINE = "{ACYL}N({ARYL})C9{C4}CCN{NSUB}CC9{C3}"

PHENETHYL = "CCc1ccccc1"
PROPANOYL = "CCC(=O)"
PHENYL = "c1ccccc1"
CARBOMETHOXY = "(C(=O)OC)"
METHOXYMETHYL = "(COC)"

# name, acyl, aryl, C4, N-substituent, C3, stated formula
ANILIDES = [
    ("Fentanyl", PROPANOYL, PHENYL, "", PHENETHYL, "", "C22H28N2O"),

    ("Acetylfentanyl", "CC(=O)", PHENYL, "", PHENETHYL, "", "C21H26N2O"),
    ("Butyrylfentanyl", "CCCC(=O)", PHENYL, "", PHENETHYL, "", "C23H30N2O"),
    ("Isobutyrylfentanyl", "CC(C)C(=O)", PHENYL, "", PHENETHYL, "", "C23H30N2O"),
    ("Valerylfentanyl", "CCCCC(=O)", PHENYL, "", PHENETHYL, "", "C24H32N2O"),
    ("Cyclopropylfentanyl", "C1CC1C(=O)", PHENYL, "", PHENETHYL, "", "C23H28N2O"),
    ("Cyclobutylfentanyl", "C1CCC1C(=O)", PHENYL, "", PHENETHYL, "", "C24H30N2O"),
    ("Cyclopentylfentanyl", "C1CCCC1C(=O)", PHENYL, "", PHENETHYL, "", "C25H32N2O"),
    ("Acryloylfentanyl", "C=CC(=O)", PHENYL, "", PHENETHYL, "", "C22H26N2O"),
    ("Crotonylfentanyl", "CC=CC(=O)", PHENYL, "", PHENETHYL, "", "C23H28N2O"),
    ("Methoxyacetylfentanyl", "COCC(=O)", PHENYL, "", PHENETHYL, "", "C22H28N2O2"),
    ("Furanylfentanyl", "c1ccoc1C(=O)", PHENYL, "", PHENETHYL, "", "C24H26N2O2"),
    ("Tetrahydrofuranylfentanyl", "C1CCOC1C(=O)", PHENYL, "", PHENETHYL, "", "C24H30N2O2"),
    ("Thiofuranylfentanyl", "c1ccsc1C(=O)", PHENYL, "", PHENETHYL, "", "C24H26N2OS"),
    ("Benzoylfentanyl", "c1ccccc1C(=O)", PHENYL, "", PHENETHYL, "", "C26H28N2O"),
    ("Phenylacetylfentanyl", "c1ccccc1CC(=O)", PHENYL, "", PHENETHYL, "", "C27H30N2O"),
    ("2-Fluorofentanyl", PROPANOYL, "c1ccccc1F", "", PHENETHYL, "", "C22H27FN2O"),
    ("3-Fluorofentanyl", PROPANOYL, "c1cccc(F)c1", "", PHENETHYL, "", "C22H27FN2O"),
    ("4-Fluorofentanyl", PROPANOYL, "c1ccc(F)cc1", "", PHENETHYL, "", "C22H27FN2O"),
    ("4-Chlorofentanyl", PROPANOYL, "c1ccc(Cl)cc1", "", PHENETHYL, "", "C22H27ClN2O"),
    ("4-Methylfentanyl", PROPANOYL, "c1ccc(C)cc1", "", PHENETHYL, "", "C23H30N2O"),
    ("4-Methoxyfentanyl", PROPANOYL, "c1ccc(OC)cc1", "", PHENETHYL, "", "C23H30N2O2"),
    ("para-Fluorobutyrylfentanyl", "CCCC(=O)", "c1ccc(F)cc1", "", PHENETHYL, "", "C23H29FN2O"),
    ("para-Fluoroisobutyrylfentanyl", "CC(C)C(=O)", "c1ccc(F)cc1", "", PHENETHYL, "", "C23H29FN2O"),
    ("para-Methoxybutyrylfentanyl", "CCCC(=O)", "c1ccc(OC)cc1", "", PHENETHYL, "", "C24H32N2O2"),
    ("3-Methylfentanyl", PROPANOYL, PHENYL, "", PHENETHYL, "C", "C23H30N2O"),
    ("3-Methylbutyrylfentanyl", "CCCC(=O)", PHENYL, "", PHENETHYL, "C", "C24H32N2O"),
    ("Norfentanyl", PROPANOYL, PHENYL, "", "", "", "C14H20N2O"),
    ("Despropionylfentanyl", "", PHENYL, "", PHENETHYL, "", "C19H24N2"),
    ("Carfentanil", PROPANOYL, PHENYL, CARBOMETHOXY, PHENETHYL, "", "C24H30N2O3"),
    ("Remifentanil", PROPANOYL, PHENYL, CARBOMETHOXY, "CCC(=O)OC", "", "C20H28N2O5"),
    ("Lofentanil", PROPANOYL, PHENYL, CARBOMETHOXY, PHENETHYL, "C", "C25H32N2O3"),
    ("Sufentanil", PROPANOYL, PHENYL, METHOXYMETHYL, "CCc1ccsc1", "", "C22H30N2O2S"),
    ("Alfentanil", PROPANOYL, PHENYL, METHOXYMETHYL, "CCN1N=NN(CC)C1=O", "", "C21H32N6O3"),
    ("Ocfentanil", "COCC(=O)", "c1ccccc1F", "", PHENETHYL, "", "C22H27FN2O2"),
    ("Benzylfentanyl", PROPANOYL, PHENYL, "", "Cc1ccccc1", "", "C21H26N2O"),
    ("Thenylfentanyl", PROPANOYL, PHENYL, "", "CCc1cccs1", "", "C20H26N2OS"),
    ("Beta-hydroxyfentanyl", PROPANOYL, PHENYL, "", "CC(O)c1ccccc1", "", "C22H28N2O2"),
    ("Beta-methylfentanyl", PROPANOYL, PHENYL, "", "CC(C)c1ccccc1", "", "C23H30N2O"),
]

ENTRY = re.compile(
    r"\{ name: '((?:\\.|[^'\\])*)', cls: '((?:\\.|[^'\\])*)', "
    r"formula: '((?:\\.|[^'\\])*)', smiles: '((?:\\.|[^'\\])*)'(?:, propertyOnly: true)? \}"
)


def build(row):
    return TEMPLATE.format(N=row[1], R3=row[2], RING=row[3], R14=row[4])


def build_anilide(row):
    nitrogen = "(%s)" % row[4] if row[4] else ""
    return ANILIDOPIPERIDINE.format(ACYL=row[1], ARYL=row[2], C4=row[3],
                                    NSUB=nitrogen, C3=row[5])


def flat(smiles):
    # Stored entries vary in whether they assign stereochemistry, and the template writes
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

    families = ([(row[0], row[-1], build(row), "Morphinan opioid") for row in COMPOUNDS]
                + [(row[0], row[-1], build_anilide(row), "Anilidopiperidine opioid")
                   for row in ANILIDES])

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
        rows.append({"name": name, "cls": cls, "formula": computed, "smiles": smiles})

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
    sys.stderr.write("template reproduced %d stored entries (%s); %d new rows\n"
                     % (len(anchors), ", ".join(anchors), len(rows)))


if __name__ == "__main__":
    main()
