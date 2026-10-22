"""Build cardiovascular reference structures by substitution on verified parent scaffolds.

Run: python tools/derive-cardiovascular-references.py [--output rows.js]

Seven templates are used: the aryloxypropanolamine and the aryl ethanolamine of the
beta-adrenoceptor antagonists, the 4-aryl-1,4-dihydropyridine-3,5-dicarboxylate, the
alanyl-amino-acid and 3-mercapto-2-methylpropanoyl scaffolds of the ACE inhibitors, the
biphenyl-tetrazole benzyl scaffold of the sartans, and the hexahydronaphthalenyl ester of
the fungal-derived statins. Each is validated first by regenerating entries the library
already stores and requiring a canonical-SMILES match, so a template error fails the run
instead of propagating into new rows.

Each compound then carries an independently stated molecular formula, which RDKit checks
against the formula computed from the constructed structure. Recalling the substitution
pattern and recalling the formula are separate acts of recall, so a disagreement between
them marks the entry as unreliable and the run fails rather than emitting it. Agreement is
evidence of consistency, not proof of identity: it cannot catch an error that leaves the
formula unchanged, which for these scaffolds means a ring substituent on the wrong
position, the wrong alkyl homologue or the wrong ester on a dihydropyridine.

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

# {AR} the O-aryl fragment, ending at the ring atom that carries the ether oxygen; {N} the
# amine substituent, empty for the primary amine.
ARYLOXYPROPANOLAMINE = "{AR}OCC(O)CN{N}"

# {AR} the aryl fragment, ending at the ring atom that carries the benzylic alcohol.
ARYLETHANOLAMINE = "{AR}C(O)CN{N}"

# {E1}/{E2} the two ester alkyl groups; {M2}/{M6} the C2 and C6 substituents; {N9} the ring
# nitrogen substituent, empty for the N-H dihydropyridine; {AR} the C4 aryl group, written
# as a suffix starting at its attachment atom. Ring digit 9 closes the dihydropyridine.
DIHYDROPYRIDINE = "{E1}OC(=O)C9=C({M2})N{N9}C({M6})=C(C(=O)O{E2})C9{AR}"

# {E} the C-terminal ester alkyl of the 2-phenylethyl-glycine head, "O" for the diacid;
# {AA} the cyclic amino acid, continuing from its ring nitrogen. Ring digit 9 closes the
# template phenyl.
ALANYL_AMINO_ACID = "{E}C(=O)C(CCc9ccccc9)NC(C)C(=O)N{AA}"

# {R} the acyl group on the sulfur, empty for the free thiol; {AA} as above.
MERCAPTOPROPANOYL = "{R}SCC(C)C(=O)N{AA}"

# {HET} the heterocyclic head, ending at the atom that carries the benzylic methylene.
BIPHENYLTETRAZOLE = "{HET}Cc9ccc(cc9)-c9ccccc9-c9nn[nH]n9"

# {ACYL} the 8-O acyl group; {R6} the C6 ring substituent carbon; {TAIL} the 3,5-dihydroxy
# acid or its delta-lactone. Ring digits 8 and 9 close the hexahydronaphthalene.
HEXAHYDRONAPHTHALENE = "{ACYL}OC9C{R6}C=C8C=CC(C)C(CC{TAIL})C98"

IPR, TBU, NH2 = "C(C)C", "C(C)(C)C", ""

NAPHTH1 = "c1cc2ccccc2c(c1)"
NAPHTH1_4OH = "c1c(O)c2ccccc2c(c1)"
NAPHTH1_5OH = "c1cc2c(O)cccc2c(c1)"
NAPHTH2 = "c1cc2ccccc2cc1"
INDOL4 = "c1cc2c(cccc2[nH]1)"
METHYLINDOL4 = "Cc1cc2c(cccc2[nH]1)"
CARBAZOL4 = "c1cc2[nH]c3ccccc3c2c(c1)"
CARTEOLOL_AR = "O=C1CCc2c(cccc2N1)"
BUNOLOL_AR = "O=C1CCCc2c(cccc12)"
NADOLOL_AR = "OC1Cc2c(cccc2CC1O)"
TIMOLOL_AR = "C1COCCN1c1nsnc1"
BUFURALOL_AR = "CCc1cccc2CC(Oc12)"
ACEBUTOLOL_AR = "CCCC(=O)Nc1ccc(c(C(C)=O)c1)"
DIACETOLOL_AR = "CC(=O)Nc1ccc(c(C(C)=O)c1)"
CELIPROLOL_AR = "CCN(CC)C(=O)Nc1ccc(c(C(C)=O)c1)"
CRESOL3 = "Cc1cccc(c1)"

# name, O-aryl fragment, amine substituent, formula
ARYLOXY = [
    ("Propranolol", NAPHTH1, IPR, "C16H21NO2"),
    ("Atenolol", "NC(=O)Cc1ccc(cc1)", IPR, "C14H22N2O3"),
    ("Metoprolol", "COCCc1ccc(cc1)", IPR, "C15H25NO3"),
    ("Bisoprolol", "CC(C)OCCOCc1ccc(cc1)", IPR, "C18H31NO4"),
    ("Betaxolol", "C1CC1COCCc1ccc(cc1)", IPR, "C18H29NO3"),
    ("Esmolol", "COC(=O)CCc1ccc(cc1)", IPR, "C16H25NO4"),
    ("Celiprolol", CELIPROLOL_AR, TBU, "C20H33N3O4"),
    ("Timolol", TIMOLOL_AR, TBU, "C13H24N4O3S"),
    ("Carvedilol", CARBAZOL4, "CCOc1ccccc1OC", "C24H26N2O4"),
    ("Acebutolol", ACEBUTOLOL_AR, IPR, "C18H28N2O4"),
    ("Diacetolol", DIACETOLOL_AR, IPR, "C16H24N2O4"),
    ("Carteolol", CARTEOLOL_AR, TBU, "C16H24N2O3"),
    ("Nadolol", NADOLOL_AR, TBU, "C17H27NO4"),
    ("Oxprenolol", "C=CCOc1ccccc1", IPR, "C15H23NO3"),
    ("Penbutolol", "C1CCCC1c1ccccc1", TBU, "C18H29NO2"),
    ("Mepindolol", METHYLINDOL4, IPR, "C15H22N2O2"),
    ("Practolol", "CC(=O)Nc1ccc(cc1)", IPR, "C14H22N2O3"),
    ("Alprenolol", "C=CCc1ccccc1", IPR, "C15H23NO2"),
    ("Dihydroalprenolol", "CCCc1ccccc1", IPR, "C15H25NO2"),
    ("Bupranolol", "Cc1ccc(Cl)c(c1)", TBU, "C14H22ClNO2"),
    ("Carazolol", CARBAZOL4, IPR, "C18H22N2O2"),
    ("Levobunolol", BUNOLOL_AR, TBU, "C17H25NO3"),
    ("Moprolol", "COc1ccccc1", IPR, "C13H21NO3"),
    ("Toliprolol", CRESOL3, IPR, "C13H21NO2"),
    ("Bevantolol", CRESOL3, "CCc1ccc(OC)c(OC)c1", "C20H27NO4"),
    ("Talinolol", "C1CCCCC1NC(=O)Nc1ccc(cc1)", TBU, "C20H33N3O3"),
    ("Xamoterol", "Oc1ccc(cc1)", "CCNC(=O)N1CCOCC1", "C16H25N3O5"),
    ("Bunitrolol", "N#Cc1ccccc1", TBU, "C14H20N2O2"),
    ("Bucindolol", "N#Cc1ccccc1", "C(C)(C)Cc1c[nH]c2ccccc12", "C22H25N3O2"),
    ("4-Hydroxypropranolol", NAPHTH1_4OH, IPR, "C16H21NO3"),
    ("5-Hydroxypropranolol", NAPHTH1_5OH, IPR, "C16H21NO3"),
    ("N-Desisopropylpropranolol", NAPHTH1, NH2, "C13H15NO2"),
    ("O-Desmethylmetoprolol", "OCCc1ccc(cc1)", IPR, "C14H23NO3"),
    ("alpha-Hydroxymetoprolol", "COCC(O)c1ccc(cc1)", IPR, "C15H25NO4"),
    ("Esmolol acid", "OC(=O)CCc1ccc(cc1)", IPR, "C15H23NO4"),
    ("O-Desmethylcarvedilol", CARBAZOL4, "CCOc1ccccc1O", "C23H24N2O4"),
]

# name, aryl fragment, amine substituent, formula
ETHANOLAMINES = [
    ("Sotalol", "CS(=O)(=O)Nc1ccc(cc1)", IPR, "C12H20N2O3S"),
    ("Labetalol", "NC(=O)c1cc(ccc1O)", "C(CC)Cc1ccccc1", "C19H24N2O3"),
    ("Pronethalol", NAPHTH2, IPR, "C15H19NO"),
    ("Nifenalol", "[O-][N+](=O)c1ccc(cc1)", IPR, "C11H16N2O3"),
    ("Dichloroisoprenaline", "Clc1ccc(cc1Cl)", IPR, "C11H15Cl2NO"),
    ("Bufuralol", BUFURALOL_AR, TBU, "C16H25NO2"),
]

# name, structure, formula
BETA_SINGLETONS = [
    ("Nebivolol", "OC(CNCC(O)C1CCc2cc(F)ccc2O1)C1CCc2cc(F)ccc2O1",
     "C22H25F2NO4"),
    ("Butoxamine", "COc1ccc(OC)c(c1)C(O)C(C)NC(C)(C)C", "C15H25NO3"),
    ("Arotinolol",
     "CC(C)(C)NCC(O)CSc1nc(cs1)-c1ccc(s1)C(N)=O", "C15H21N3O2S3"),
    ("Bopindolol",
     "Cc1cc2c(cccc2[nH]1)OCC(OC(=O)c1ccccc1)CNC(C)(C)C", "C23H28N2O3"),
]

ONITROPHENYL = "c1ccccc1[N+](=O)[O-]"
MNITROPHENYL = "c1cccc(c1)[N+](=O)[O-]"
PNITROPHENYL = "c1ccc(cc1)[N+](=O)[O-]"
OCHLOROPHENYL = "c1ccccc1Cl"
MCHLOROPHENYL = "c1cccc(Cl)c1"
DICHLOROPHENYL = "c1cccc(Cl)c1Cl"
BENZOFURAZAN4 = "c1cccc2nonc12"

# name, C3 ester alkyl, C2 substituent, N substituent, C6 substituent,
# C5 ester alkyl, C4 aryl, formula
DIHYDROPYRIDINES = [
    ("Nifedipine", "C", "C", "", "C", "C", ONITROPHENYL, "C17H18N2O6"),
    ("Amlodipine", "CC", "COCCN", "", "C", "C", OCHLOROPHENYL,
     "C20H25ClN2O5"),
    ("Nimodipine", "COCC", "C", "", "C", "C(C)C", MNITROPHENYL,
     "C21H26N2O7"),
    ("Felodipine", "CC", "C", "", "C", "C", DICHLOROPHENYL,
     "C18H19Cl2NO4"),
    ("Nicardipine", "C", "C", "", "C", "CCN(C)Cc1ccccc1", MNITROPHENYL,
     "C26H29N3O6"),
    ("Lercanidipine", "C", "C", "", "C",
     "C(C)(C)CN(C)CCC(c1ccccc1)c1ccccc1", MNITROPHENYL, "C36H41N3O6"),
    ("Isradipine", "C", "C", "", "C", "C(C)C", BENZOFURAZAN4,
     "C19H21N3O5"),
    ("Darodipine", "CC", "C", "", "C", "CC", BENZOFURAZAN4, "C19H21N3O5"),
    ("Nisoldipine", "C", "C", "", "C", "CC(C)C", ONITROPHENYL,
     "C20H24N2O6"),
    ("Nitrendipine", "CC", "C", "", "C", "C", MNITROPHENYL, "C18H20N2O6"),
    ("Nilvadipine", "C", "C#N", "", "C", "C(C)C", MNITROPHENYL,
     "C19H19N3O6"),
    ("Lacidipine", "CC", "C", "", "C", "CC",
     "c1ccccc1C=CC(=O)OC(C)(C)C", "C26H33NO6"),
    ("Benidipine", "C", "C", "", "C", "C1CCCN(Cc2ccccc2)C1",
     MNITROPHENYL, "C28H31N3O6"),
    ("Barnidipine", "C", "C", "", "C", "C1CCN(Cc2ccccc2)C1",
     MNITROPHENYL, "C27H29N3O6"),
    ("Manidipine", "C", "C", "", "C",
     "CCN1CCN(CC1)C(c1ccccc1)c1ccccc1", MNITROPHENYL, "C35H38N4O6"),
    ("Cilnidipine", "COCC", "C", "", "C", "CC=Cc1ccccc1", MNITROPHENYL,
     "C27H28N2O7"),
    ("Aranidipine", "C", "C", "", "C", "CC(C)=O", ONITROPHENYL,
     "C19H20N2O7"),
    ("Azelnidipine", "C1CN(C(c2ccccc2)c2ccccc2)C1", "N", "", "C",
     "C(C)C", MNITROPHENYL, "C33H34N4O6"),
    ("Clevidipine", "C", "C", "", "C", "COC(=O)CCC", DICHLOROPHENYL,
     "C21H23Cl2NO6"),
    ("Pranidipine", "C", "C", "", "C", "CC=Cc1ccccc1", MNITROPHENYL,
     "C25H24N2O6"),
    ("Dimethyl 2,6-dimethyl-4-(3-nitrophenyl)-1,4-dihydropyridine-3,5-dicarboxylate",
     "C", "C", "", "C", "C", MNITROPHENYL, "C17H18N2O6"),
    ("Diethyl 2,6-dimethyl-4-(3-nitrophenyl)-1,4-dihydropyridine-3,5-dicarboxylate",
     "CC", "C", "", "C", "CC", MNITROPHENYL, "C19H22N2O6"),
    ("Diethyl 2,6-dimethyl-4-(2-nitrophenyl)-1,4-dihydropyridine-3,5-dicarboxylate",
     "CC", "C", "", "C", "CC", ONITROPHENYL, "C19H22N2O6"),
    ("Dimethyl 2,6-dimethyl-4-(4-nitrophenyl)-1,4-dihydropyridine-3,5-dicarboxylate",
     "C", "C", "", "C", "C", PNITROPHENYL, "C17H18N2O6"),
    ("Diisopropyl 2,6-dimethyl-4-(3-nitrophenyl)-1,4-dihydropyridine-3,5-dicarboxylate",
     "C(C)C", "C", "", "C", "C(C)C", MNITROPHENYL, "C21H26N2O6"),
    ("Dimethyl 1,2,6-trimethyl-4-(3-nitrophenyl)-1,4-dihydropyridine-3,5-dicarboxylate",
     "C", "C", "C", "C", "C", MNITROPHENYL, "C18H20N2O6"),
    ("Dimethyl 4-(2-chlorophenyl)-2,6-dimethyl-1,4-dihydropyridine-3,5-dicarboxylate",
     "C", "C", "", "C", "C", OCHLOROPHENYL, "C17H18ClNO4"),
    ("Diethyl 4-(2-chlorophenyl)-2,6-dimethyl-1,4-dihydropyridine-3,5-dicarboxylate",
     "CC", "C", "", "C", "CC", OCHLOROPHENYL, "C19H22ClNO4"),
    ("Dimethyl 4-(3-chlorophenyl)-2,6-dimethyl-1,4-dihydropyridine-3,5-dicarboxylate",
     "C", "C", "", "C", "C", MCHLOROPHENYL, "C17H18ClNO4"),
    ("Dimethyl 4-(2,3-dichlorophenyl)-2,6-dimethyl-1,4-dihydropyridine-3,5-dicarboxylate",
     "C", "C", "", "C", "C", DICHLOROPHENYL, "C17H17Cl2NO4"),
    ("Dimethyl 2,6-dimethyl-4-phenyl-1,4-dihydropyridine-3,5-dicarboxylate",
     "C", "C", "", "C", "C", "c1ccccc1", "C17H19NO4"),
    ("Diethyl 2,6-dimethyl-4-phenyl-1,4-dihydropyridine-3,5-dicarboxylate",
     "CC", "C", "", "C", "CC", "c1ccccc1", "C19H23NO4"),
]

PROLINE = "1CCCC1C(=O)O"
TETRAHYDROISOQUINOLINE = "1Cc2ccccc2CC1C(=O)O"
DIMETHOXY_THIQ = "1Cc2cc(OC)c(OC)cc2CC1C(=O)O"
CYCLOPENTAPYRROLIDINE = "1C2CCCC2CC1C(=O)O"
OCTAHYDROINDOLE = "1C(C(=O)O)CC2CCCCC12"
INDANYLGLYCINE = "(C1Cc2ccccc2C1)CC(=O)O"
METHYLIMIDAZOLIDINONE = "1C(=O)N(C)CC1C(=O)O"

# name, head ester alkyl, cyclic amino acid, formula
ALANYL = [
    ("Enalapril", "CCO", PROLINE, "C20H28N2O5"),
    ("Quinapril", "CCO", TETRAHYDROISOQUINOLINE, "C25H30N2O5"),
    ("Ramipril", "CCO", CYCLOPENTAPYRROLIDINE, "C23H32N2O5"),
    ("Trandolapril", "CCO", OCTAHYDROINDOLE, "C24H34N2O5"),
    ("Enalaprilat", "O", PROLINE, "C18H24N2O5"),
    ("Quinaprilat", "O", TETRAHYDROISOQUINOLINE, "C23H26N2O5"),
    ("Ramiprilat", "O", CYCLOPENTAPYRROLIDINE, "C21H28N2O5"),
    ("Trandolaprilat", "O", OCTAHYDROINDOLE, "C22H30N2O5"),
    ("Moexipril", "CCO", DIMETHOXY_THIQ, "C27H34N2O7"),
    ("Moexiprilat", "O", DIMETHOXY_THIQ, "C25H30N2O7"),
    ("Delapril", "CCO", INDANYLGLYCINE, "C26H32N2O5"),
    ("Delaprilat", "O", INDANYLGLYCINE, "C24H28N2O5"),
    ("Imidapril", "CCO", METHYLIMIDAZOLIDINONE, "C20H27N3O6"),
    ("Imidaprilat", "O", METHYLIMIDAZOLIDINONE, "C18H23N3O6"),
]

PHENYLTHIOPROLINE = "1CC(Sc2ccccc2)CC1C(=O)O"

# name, S-acyl group, cyclic amino acid, formula
MERCAPTO = [
    ("Captopril", "", PROLINE, "C9H15NO3S"),
    ("Zofenoprilat", "", PHENYLTHIOPROLINE, "C15H19NO3S2"),
    ("Zofenopril", "O=C(c1ccccc1)", PHENYLTHIOPROLINE, "C22H23NO4S2"),
    ("Alacepril", "CC(=O)", "1CCCC1C(=O)NC(Cc2ccccc2)C(=O)O",
     "C20H26N2O5S"),
]

# name, structure, formula
ACE_SINGLETONS = [
    ("Benazepril",
     "CCOC(=O)C(CCc1ccccc1)NC1C(=O)N(CC(=O)O)c2ccccc2CC1", "C24H28N2O5"),
    ("Benazeprilat",
     "OC(=O)C(CCc1ccccc1)NC1C(=O)N(CC(=O)O)c2ccccc2CC1", "C22H24N2O5"),
    ("Perindoprilat",
     "OC(=O)C(CCC)NC(C)C(=O)N1C(C(=O)O)CC2CCCCC12", "C17H28N2O5"),
    ("Fosinoprilat",
     "OP(=O)(CCCCc1ccccc1)CC(=O)N1CC(C2CCCCC2)CC1C(=O)O", "C23H34NO5P"),
]

# name, heterocyclic head, formula
SARTANS = [
    ("Losartan", "CCCCc1nc(Cl)c(CO)n1", "C22H23ClN6O"),
    ("Valsartan", "CCCCC(=O)N(C(C(C)C)C(=O)O)", "C24H29N5O3"),
    ("Olmesartan", "CCCc1nc(C(C)(C)O)c(C(=O)O)n1", "C24H26N6O3"),
    ("EXP3174", "CCCCc1nc(Cl)c(C(=O)O)n1", "C22H21ClN6O2"),
    ("Candesartan cilexetil",
     "CCOc1nc2cccc(C(=O)OC(C)OC(=O)OC3CCCCC3)c2n1", "C33H34N6O6"),
    ("Olmesartan medoxomil",
     "CCCc1nc(C(C)(C)O)c(C(=O)OCc2oc(=O)oc2C)n1", "C29H30N6O6"),
]

# name, structure, formula
SARTAN_SINGLETONS = [
    ("Azilsartan medoxomil",
     "CCOc1nc2cccc(C(=O)OCc3oc(=O)oc3C)c2n1Cc1ccc(-c2ccccc2-c2noc(=O)[nH]2)cc1",
     "C30H24N4O8"),
    ("Eprosartan",
     "CCCCc1ncc(C=C(Cc2cccs2)C(=O)O)n1Cc1ccc(cc1)C(=O)O",
     "C23H24N2O4S"),
]

LACTONE = "C1CC(O)CC(=O)O1"
OPEN_ACID = "C(O)CC(O)CC(=O)O"

# name, 8-O acyl group, C6 substituent, side chain, formula
MEVINIC = [
    ("Lovastatin", "CCC(C)C(=O)", "C(C)", LACTONE, "C24H36O5"),
    ("Simvastatin", "CCC(C)(C)C(=O)", "C(C)", LACTONE, "C25H38O5"),
    ("Pravastatin", "CCC(C)C(=O)", "C(O)", OPEN_ACID, "C23H36O7"),
    ("Mevastatin", "CCC(C)C(=O)", "C", LACTONE, "C23H34O5"),
    ("Simvastatin acid", "CCC(C)(C)C(=O)", "C(C)", OPEN_ACID, "C25H40O6"),
    ("Lovastatin acid", "CCC(C)C(=O)", "C(C)", OPEN_ACID, "C24H38O6"),
    ("Mevastatin acid", "CCC(C)C(=O)", "C", OPEN_ACID, "C23H36O6"),
    ("Pravastatin lactone", "CCC(C)C(=O)", "C(O)", LACTONE, "C23H34O6"),
]

# name, structure, formula
STATIN_SINGLETONS = [
    ("Cerivastatin",
     "CC(C)c1nc(C(C)C)c(COC)c(-c2ccc(F)cc2)c1C=CC(O)CC(O)CC(=O)O",
     "C26H34FNO5"),
    ("Atorvastatin lactone",
     "CC(C)c1c(C(=O)Nc2ccccc2)c(-c2ccccc2)c(-c2ccc(F)cc2)n1CCC1CC(O)CC(=O)O1",
     "C33H33FN2O4"),
]

BETA = "Beta blocker"
DHP = "Dihydropyridine calcium blocker"
ACEI = "ACE inhibitor"
ARB = "Angiotensin receptor blocker"
STATIN = "Statin"


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
          ARYLOXYPROPANOLAMINE.format(AR=row[1], N=row[2]), BETA)
         for row in ARYLOXY]
        + [(row[0], row[-1],
            ARYLETHANOLAMINE.format(AR=row[1], N=row[2]), BETA)
           for row in ETHANOLAMINES]
        + [(row[0], row[-1], row[1], BETA) for row in BETA_SINGLETONS]
        + [(row[0], row[-1],
            DIHYDROPYRIDINE.format(E1=row[1], M2=row[2], N9=row[3],
                                   M6=row[4], E2=row[5], AR=row[6]), DHP)
           for row in DIHYDROPYRIDINES]
        + [(row[0], row[-1],
            ALANYL_AMINO_ACID.format(E=row[1], AA=row[2]), ACEI)
           for row in ALANYL]
        + [(row[0], row[-1],
            MERCAPTOPROPANOYL.format(R=row[1], AA=row[2]), ACEI)
           for row in MERCAPTO]
        + [(row[0], row[-1], row[1], ACEI) for row in ACE_SINGLETONS]
        + [(row[0], row[-1], BIPHENYLTETRAZOLE.format(HET=row[1]), ARB)
           for row in SARTANS]
        + [(row[0], row[-1], row[1], ARB) for row in SARTAN_SINGLETONS]
        + [(row[0], row[-1],
            HEXAHYDRONAPHTHALENE.format(ACYL=row[1], R6=row[2],
                                        TAIL=row[3]), STATIN)
           for row in MEVINIC]
        + [(row[0], row[-1], row[1], STATIN) for row in STATIN_SINGLETONS])

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
