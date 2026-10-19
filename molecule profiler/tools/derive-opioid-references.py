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

# Orvinol ring C: C6 carries the 6-methoxy and opens the bridge to C14, C7 carries the
# tertiary alcohol side chain, C8 is a methylene. The bridge itself is written into the
# C14 slot, so ring number 6 stays clear of the template rings 1-5.
ORVINOL_OME_BUTYL = "C6(OC)C(C(C)(O)CCC)C"
ORVINOL_OME_TBU = "C6(OC)C(C(C)(O)C(C)(C)C)C"
ETHENO, ETHANO = "(C=C6)", "(CC6)"

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
    ("Desomorphine", METHYL, "O", "CCC", "", "C17H21NO2"),
    ("Heterocodeine", METHYL, "O", "C(OC)C=C", "", "C18H21NO3"),
    ("Hydromorphinol", METHYL, "O", SAT_6OH, "(O)", "C17H21NO4"),
    ("Acetylcodeine", METHYL, "OC", "C(OC(C)=O)C=C", "", "C20H23NO4"),
    ("Diacetyldihydromorphine", METHYL, ACETYL, "C(OC(C)=O)CC", "",
     "C21H25NO5"),
    ("Thebacon", METHYL, "OC", "C(OC(C)=O)=CC", "", "C20H23NO4"),
    ("Benzylmorphine", METHYL, "OCc6ccccc6", ENOL_6OH, "", "C24H25NO3"),
    ("Pholcodine", METHYL, "OCCN6CCOCC6", ENOL_6OH, "", "C23H30N2O4"),
    ("Nicocodeine", METHYL, "OC", "C(OC(=O)c6cccnc6)C=C", "", "C24H24N2O4"),
    ("Nicomorphine", METHYL, "OC(=O)c6cccnc6",
     "C(OC(=O)c6cccnc6)C=C", "", "C29H25N3O5"),
    ("Naloxol", ALLYL, "O", SAT_6OH, "(O)", "C19H23NO4"),
    ("Nalmexone", "CC(C)=CCN", "O", SAT_6KETO, "(O)", "C21H25NO4"),
    ("Thebaine", METHYL, "OC", "C(OC)=CC=", "", "C19H21NO3"),
    ("Oripavine", METHYL, "O", "C(OC)=CC=", "", "C18H19NO3"),
    ("Naltrindole", CPM, "O", "c6[nH]c7ccccc7c6C", "(O)", "C26H26N2O3"),
    ("Nalfurafine", CPM, "O", "C(N(C)C(=O)C=Cc6ccoc6)CC", "(O)",
     "C28H32N2O5"),
    ("Etorphine", METHYL, "O", ORVINOL_OME_BUTYL, ETHENO, "C25H33NO4"),
    ("Dihydroetorphine", METHYL, "O", ORVINOL_OME_BUTYL, ETHANO,
     "C25H35NO4"),
    ("Diprenorphine", CPM, "O", "C6(OC)C(C(C)(C)O)C", ETHANO,
     "C26H35NO4"),
    ("Buprenorphine", CPM, "O", ORVINOL_OME_TBU, ETHANO, "C29H41NO4"),
    ("Norbuprenorphine", NOR, "O", ORVINOL_OME_TBU, ETHANO, "C25H35NO4"),
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

# {ACYL} the 4-acyl or 4-ester group, {ARYL} the 4-aryl ring, {NSUB} the nitrogen
# substituent. Ring 9 again keeps the piperidine closure clear of the substituent rings.
ARYLPIPERIDINE = "{ACYL}C9({ARYL})CCN{NSUB}CC9"

# name, acyl, aryl, N-substituent, stated formula
ARYLPIPERIDINES = [
    ("Pethidine", "CCOC(=O)", PHENYL, "C", "C15H21NO2"),

    ("Norpethidine", "CCOC(=O)", PHENYL, "", "C14H19NO2"),
    ("Pethidinic acid", "OC(=O)", PHENYL, "C", "C13H17NO2"),
    ("Properidine", "CC(C)OC(=O)", PHENYL, "C", "C16H23NO2"),
    ("Anileridine", "CCOC(=O)", PHENYL, "CCc1ccc(N)cc1", "C22H28N2O2"),
    ("Piminodine", "CCOC(=O)", PHENYL, "CCCNc1ccccc1", "C23H30N2O2"),
    ("Phenoperidine", "CCOC(=O)", PHENYL, "CCC(O)c1ccccc1", "C23H29NO3"),
    ("Ketobemidone", "CCC(=O)", "c1cccc(O)c1", "C", "C15H21NO2"),
    ("Diphenoxylate", "CCOC(=O)", PHENYL,
     "CCC(C#N)(c1ccccc1)c1ccccc1", "C30H32N2O2"),
    ("Difenoxin", "OC(=O)", PHENYL, "CCC(C#N)(c1ccccc1)c1ccccc1", "C28H28N2O2"),
]

# 2-benzylbenzimidazole opioids. {NSUB} the 1-substituent, {R4} the benzyl ring
# 4-substituent, {R5} the benzimidazole 5-substituent.
NITAZENE = "{NSUB}n1c(Cc2ccc{R4}cc2)nc2cc{R5}ccc21"

DIETHYLAMINOETHYL = "CCN(CC)CC"
PYRROLIDINOETHYL = "C1CCCN1CC"
PIPERIDINOETHYL = "C1CCCCN1CC"
NITRO = "[N+](=O)[O-]"

# name, 1-substituent, benzyl 4-substituent, benzimidazole 5-substituent, stated formula
NITAZENES = [
    ("Etonitazene", DIETHYLAMINOETHYL, "OCC", NITRO, "C22H28N4O3"),
    ("Metonitazene", DIETHYLAMINOETHYL, "OC", NITRO, "C21H26N4O3"),
    ("Isotonitazene", DIETHYLAMINOETHYL, "OC(C)C", NITRO, "C23H30N4O3"),
    ("Protonitazene", DIETHYLAMINOETHYL, "OCCC", NITRO, "C23H30N4O3"),
    ("Butonitazene", DIETHYLAMINOETHYL, "OCCCC", NITRO, "C24H32N4O3"),
    ("Flunitazene", DIETHYLAMINOETHYL, "F", NITRO, "C20H23FN4O2"),
    ("Etodesnitazene", DIETHYLAMINOETHYL, "OCC", "", "C22H29N3O"),
    ("Metodesnitazene", DIETHYLAMINOETHYL, "OC", "", "C21H27N3O"),
    ("Isotodesnitazene", DIETHYLAMINOETHYL, "OC(C)C", "", "C23H31N3O"),
    ("N-Pyrrolidino etonitazene", PYRROLIDINOETHYL, "OCC", NITRO, "C22H26N4O3"),
    ("N-Pyrrolidino metonitazene", PYRROLIDINOETHYL, "OC", NITRO, "C21H24N4O3"),
    ("N-Piperidinyl etonitazene", PIPERIDINOETHYL, "OCC", NITRO, "C23H28N4O3"),
]

# Open-chain and remaining chemotypes. These are written out rather than decorated on a
# template, so only the formula cross-check applies to them.
SINGLETONS = [
    ("Dezocine", "Morphinan", "CC1CCCCC2(N)CCC1c1ccc(O)cc12", "C16H23NO"),
    ("Metazocine", "Benzomorphan", "CN1CCC2(C)c3cc(O)ccc3CC1C2C",
     "C15H21NO"),
    ("Spiradoline", "Arylacetamide",
     "O=C(Cc1ccc(Cl)c(Cl)c1)N(C)C1CCC2(CCCO2)CC1N1CCCC1",
     "C22H30Cl2N2O2"),
    ("Salvinorin A", "Neoclerodane",
     "COC(=O)C1CC(OC(C)=O)C2(C)C(=O)CCC3(C)C2C1(C)OC(=O)C3c1ccoc1",
     "C23H28O8"),
    ("Mitragynine", "Indole alkaloid",
     "CCC1CN2CCc3c([nH]c4cccc(OC)c34)C2CC1C(=COC)C(=O)OC", "C23H30N2O4"),
    ("7-Hydroxymitragynine", "Indole alkaloid",
     "CCC1CN2CCC3(O)c4cccc(OC)c4N=C3C2CC1C(=COC)C(=O)OC", "C23H30N2O5"),
    ("Levomethadyl acetate", "Open-chain opioid",
     "CC(=O)OC(CC)C(CC(C)N(C)C)(c1ccccc1)c1ccccc1", "C23H31NO2"),
    ("Normethadone", "Open-chain opioid",
     "CCC(=O)C(CCN(C)C)(c1ccccc1)c1ccccc1", "C20H25NO"),
    ("Isomethadone", "Open-chain opioid",
     "CCC(=O)C(C(C)CN(C)C)(c1ccccc1)c1ccccc1", "C21H27NO"),
    ("Methadol", "Open-chain opioid",
     "CCC(O)C(CC(C)N(C)C)(c1ccccc1)c1ccccc1", "C21H29NO"),
    ("Dextropropoxyphene", "Open-chain opioid",
     "CCC(=O)OC(CC(C)N(C)C)(Cc1ccccc1)c1ccccc1", "C22H29NO2"),
    ("Dipipanone", "Open-chain opioid",
     "CCC(=O)C(CC(C)N1CCCCC1)(c1ccccc1)c1ccccc1", "C24H31NO"),
    ("Dextromoramide", "Open-chain opioid",
     "O=C(N1CCCC1)C(C(C)CN1CCOCC1)(c1ccccc1)c1ccccc1", "C25H32N2O2"),
    ("Phenadoxone", "Open-chain opioid",
     "CCC(=O)C(CC(C)N1CCOCC1)(c1ccccc1)c1ccccc1", "C23H29NO2"),
    ("Dextrorphan", "Morphinan opioid",
     "Oc1ccc2CC3N(C)CCC4(CCCCC34)c2c1", "C17H23NO"),
    ("Levallorphan", "Morphinan opioid",
     "Oc1ccc2CC3N(CC=C)CCC4(CCCCC34)c2c1", "C19H25NO"),
    ("Butorphanol", "Morphinan opioid",
     "Oc1ccc2CC3N(CC4CCC4)CCC5(CCCCC35O)c2c1", "C21H29NO2"),
    ("Pentazocine", "Benzomorphan opioid",
     "CC1C2Cc3ccc(O)cc3C1(C)CCN2CC=C(C)C", "C19H27NO"),
    ("Phenazocine", "Benzomorphan opioid",
     "CC1C2Cc3ccc(O)cc3C1(C)CCN2CCc1ccccc1", "C22H27NO"),
    ("Cyclazocine", "Benzomorphan opioid",
     "CC1C2Cc3ccc(O)cc3C1(C)CCN2CC1CC1", "C18H25NO"),
    ("Metazocine", "Benzomorphan opioid",
     "CC1C2Cc3ccc(O)cc3C1(C)CCN2C", "C15H21NO"),
    ("Tapentadol", "Open-chain opioid",
     "CCC(c1cccc(O)c1)C(C)CN(C)C", "C14H23NO"),
    ("O-Desmethyltramadol", "Open-chain opioid",
     "Oc1cccc(c1)C1(O)CCCCC1CN(C)C", "C15H23NO2"),
    ("N-Desmethyltramadol", "Open-chain opioid",
     "COc1cccc(c1)C1(O)CCCCC1CNC", "C15H23NO2"),
    ("Meptazinol", "Open-chain opioid",
     "CCC1(c2cccc(O)c2)CCCCN(C)C1", "C15H23NO"),
    ("Tilidine", "Open-chain opioid",
     "CCOC(=O)C1(c2ccccc2)C=CCCC1N(C)C", "C17H23NO2"),
    ("AH-7921", "Benzamide opioid",
     "CN(C)C1(CNC(=O)c2ccc(Cl)c(Cl)c2)CCCCC1", "C16H22Cl2N2O"),
    ("U-47700", "Benzamide opioid",
     "CN(C1CCCCC1N(C)C)C(=O)c1ccc(Cl)c(Cl)c1", "C16H22Cl2N2O"),
    ("U-48800", "Benzamide opioid",
     "CN(C1CCCCC1N(C)C)C(=O)c1ccc(Cl)cc1Cl", "C16H22Cl2N2O"),
    ("U-50488", "Benzamide opioid",
     "CN(C1CCCCC1N1CCCC1)C(=O)Cc1ccc(Cl)c(Cl)c1", "C19H26Cl2N2O"),
]

ENTRY = re.compile(
    r"\{ name: '((?:\\.|[^'\\])*)', cls: '((?:\\.|[^'\\])*)', "
    r"formula: '((?:\\.|[^'\\])*)', smiles: '((?:\\.|[^'\\])*)'(?:, propertyOnly: true)? \}"
)


def build(row):
    return TEMPLATE.format(N=row[1], R3=row[2], RING=row[3], R14=row[4])


def build_arylpiperidine(row):
    nitrogen = "(%s)" % row[3] if row[3] else ""
    return ARYLPIPERIDINE.format(ACYL=row[1], ARYL=row[2], NSUB=nitrogen)


def build_nitazene(row):
    # An empty slot has to drop its parentheses too, or the ring atom is written c() and
    # the structure does not parse.
    benzyl = "(%s)" % row[2] if row[2] else ""
    core = "(%s)" % row[3] if row[3] else ""
    return NITAZENE.format(NSUB=row[1], R4=benzyl, R5=core)


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
                   for row in ANILIDES]
                + [(row[0], row[-1], build_arylpiperidine(row), "Arylpiperidine opioid")
                   for row in ARYLPIPERIDINES]
                + [(row[0], row[-1], build_nitazene(row), "Benzimidazole opioid")
                   for row in NITAZENES]
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
    sys.stderr.write("template reproduced %d stored entries (%s); %d new rows\n"
                     % (len(anchors), ", ".join(anchors), len(rows)))


if __name__ == "__main__":
    main()
