"""Build substituted-amphetamine and 2C-phenethylamine reference structures.

Run: python tools/derive-amphetamine-references.py [--output rows.js]

Two templates are used: the ring-substituted alpha-methylphenethylamine (amphetamine)
skeleton, and the 2,5-dimethoxy-4-substituted phenethylamine (2C) skeleton. Each is
validated first by regenerating entries the library already stores and requiring a
canonical-SMILES match, so a template error fails the run instead of propagating into
new rows. A handful of members that do not fit either slot pattern are written out in
full and checked the same way.

Each compound then carries an independently stated molecular formula, which RDKit checks
against the formula computed from the constructed structure. Recalling the substitution
pattern and recalling the formula are separate acts of recall, so a disagreement between
them marks the entry as unreliable and the run fails rather than emitting it. Agreement is
evidence of consistency, not proof of identity: it cannot catch an error that leaves the
formula unchanged, which for these scaffolds means a substituent placed on the wrong ring
position, a swapped 2-/5-methoxy pattern, or the wrong alkyl homologue.

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

# {N} the nitrogen fragment, whose last atom is the nitrogen that bonds to the alpha
# carbon; {A} the alpha-carbon branch text, empty for a plain phenethylamine; {B} the
# beta-carbon branch text, empty for the methylene; {R2}..{R5} raw text on ring carbons
# 2 to 5, counted from the carbon carrying the side chain. Ring digit 9 closes the
# aromatic core, leaving 1-6 free for interpolated substituent rings.
AMPHETAMINE = "{N}C{A}C{B}c9c{R2}c{R3}c{R4}c{R5}c9"

# The 2,5-dimethoxy pattern is fixed by the template itself, so a 2C member can only vary
# at ring carbons 3 and 4, on the nitrogen and at the beta carbon.
TWOC = "{N}CC{B}c9c(OC)c{R3}c{R4}c(OC)c9"

NH2, NME, NET, NPR, NIPR, NDIME, NOH = "N", "CN", "CCN", "CCCN", "CC(C)N", "CN(C)", "ON"
ME, ET = "(C)", "(CC)"
CH2, KETO, BOH, BOME, BME = "", "(=O)", "(O)", "(OC)", "(C)"
OME, SME = "(OC)", "(SC)"
# 3,4-methylenedioxy written across the R3 and R4 slots.
MDO3, MDO4 = "(OCO5)", "5"
# 4,5-methylenedioxy written across the R4 and R5 slots.
MDO4B, MDO5 = "(OCO5)", "5"
NBOME = "N(Cc1ccccc1OC)"
NBOH = "N(Cc1ccccc1O)"
NBF = "N(Cc1ccccc1F)"
NBMD = "N(Cc1cccc2OCOc12)"
NB = "N(Cc1ccccc1)"

# name, N fragment, alpha branch, beta branch, R2, R3, R4, R5, formula
AMPHETAMINES = [
    ("Amphetamine", NH2, ME, CH2, "", "", "", "", "C9H13N"),
    ("Methamphetamine", NME, ME, CH2, "", "", "", "", "C10H15N"),
    ("Levomethamphetamine", NME, ME, CH2, "", "", "", "", "C10H15N"),
    ("Phentermine", NH2, "(C)(C)", CH2, "", "", "", "", "C10H15N"),
    ("Benzphetamine", "N(C)(Cc1ccccc1)", ME, CH2, "", "", "", "",
     "C17H21N"),
    ("Selegiline", "N(C)(CC#C)", ME, CH2, "", "", "", "", "C13H17N"),
    ("Fenfluramine", NET, ME, CH2, "", "(C(F)(F)F)", "", "", "C12H16F3N"),
    ("Norfenfluramine", NH2, ME, CH2, "", "(C(F)(F)F)", "", "",
     "C10H12F3N"),
    ("4-Methoxyamphetamine", NH2, ME, CH2, "", "", OME, "", "C10H15NO"),
    ("4-Hydroxyamphetamine", NH2, ME, CH2, "", "", "(O)", "", "C9H13NO"),
    ("MMA", NH2, ME, CH2, "", OME, "(C)", "", "C11H17NO"),
    ("3,4-DMA", NH2, ME, CH2, "", OME, OME, "", "C11H17NO2"),
    ("2,4-DMA", NH2, ME, CH2, OME, "", OME, "", "C11H17NO2"),
    ("2,5-Dimethoxyamphetamine", NH2, ME, CH2, OME, "", "", OME,
     "C11H17NO2"),
    ("3,4,5-Trimethoxyamphetamine", NH2, ME, CH2, "", OME, OME, OME,
     "C12H19NO3"),
    ("TMA-2", NH2, ME, CH2, OME, "", OME, OME, "C12H19NO3"),
    ("4-Methyl-2,5-dimethoxyamphetamine", NH2, ME, CH2, OME, "", "(C)", OME,
     "C12H19NO2"),
    ("2,5-Dimethoxy-4-ethylamphetamine", NH2, ME, CH2, OME, "", "(CC)", OME,
     "C13H21NO2"),
    ("Brolamfetamine", NH2, ME, CH2, OME, "", "(Br)", OME, "C11H16BrNO2"),
    ("Iodoamphetamine", NH2, ME, CH2, OME, "", "(I)", OME, "C11H16INO2"),
    ("DOC", NH2, ME, CH2, OME, "", "(Cl)", OME, "C11H16ClNO2"),
    ("DOPR", NH2, ME, CH2, OME, "", "(CCC)", OME, "C14H23NO2"),
    ("DOBU", NH2, ME, CH2, OME, "", "(CCCC)", OME, "C15H25NO2"),
    ("DOTFM", NH2, ME, CH2, OME, "", "(C(F)(F)F)", OME, "C12H16F3NO2"),
    ("DON", NH2, ME, CH2, OME, "", "([N+](=O)[O-])", OME, "C11H16N2O4"),
    ("Aleph", NH2, ME, CH2, OME, "", SME, OME, "C12H19NO2S"),
    ("2,5-Dimethoxy-4-ethylthioamphetamine", NH2, ME, CH2, OME, "", "(SCC)",
     OME, "C13H21NO2S"),
    ("MEM", NH2, ME, CH2, OME, "", "(OCC)", OME, "C13H21NO3"),
    ("Ganesha", NH2, ME, CH2, OME, "(C)", "(C)", OME, "C13H21NO2"),
    ("N-Hydroxy-DOM", NOH, ME, CH2, OME, "", "(C)", OME, "C12H19NO3"),
    ("2-DM-DOM", NH2, ME, CH2, "(O)", "", "(C)", OME, "C11H17NO2"),
    ("5-DM-DOM", NH2, ME, CH2, OME, "", "(C)", "(O)", "C11H17NO2"),
    ("2-TOM", NH2, ME, CH2, SME, "", "(C)", OME, "C12H19NOS"),
    ("5-TOM", NH2, ME, CH2, OME, "", "(C)", SME, "C12H19NOS"),
    ("5-TOET", NH2, ME, CH2, OME, "", "(CC)", SME, "C13H21NOS"),
    ("4C-D", NH2, ET, CH2, OME, "", "(C)", OME, "C13H21NO2"),
    ("Methylenedioxymethamphetamine", NME, ME, CH2, "", MDO3, MDO4, "",
     "C11H15NO2"),
    ("Tenamfetamine", NH2, ME, CH2, "", MDO3, MDO4, "", "C10H13NO2"),
    ("MMDA", NH2, ME, CH2, "", OME, MDO4B, MDO5, "C11H15NO3"),
    ("MMDA-2", NH2, ME, CH2, OME, "", MDO4B, MDO5, "C11H15NO3"),
    ("MMDA-3a", NH2, ME, CH2, OME, MDO3, MDO4, "", "C11H15NO3"),
    ("DMMDA-2", NH2, ME, CH2, OME, OME, MDO4B, MDO5, "C12H17NO4"),
    ("Lophophine", NH2, "", CH2, "", OME, MDO4B, MDO5, "C10H13NO3"),
    ("BK-MDA", NH2, ME, KETO, "", MDO3, MDO4, "", "C10H11NO3"),
    ("Methylone", NME, ME, KETO, "", MDO3, MDO4, "", "C11H13NO3"),
    ("Mephedrone", NME, ME, KETO, "", "", "(C)", "", "C11H15NO"),
    ("Amfepramone", "CCN(CC)", ME, KETO, "", "", "", "", "C13H19NO"),

    ("2-Fluoroamphetamine", NH2, ME, CH2, "(F)", "", "", "", "C9H12FN"),
    ("3-Fluoroamphetamine", NH2, ME, CH2, "", "(F)", "", "", "C9H12FN"),
    ("4-Fluoroamphetamine", NH2, ME, CH2, "", "", "(F)", "", "C9H12FN"),
    ("2-Chloroamphetamine", NH2, ME, CH2, "(Cl)", "", "", "", "C9H12ClN"),
    ("3-Chloroamphetamine", NH2, ME, CH2, "", "(Cl)", "", "", "C9H12ClN"),
    ("4-Chloroamphetamine", NH2, ME, CH2, "", "", "(Cl)", "", "C9H12ClN"),
    ("3-Bromoamphetamine", NH2, ME, CH2, "", "(Br)", "", "", "C9H12BrN"),
    ("4-Bromoamphetamine", NH2, ME, CH2, "", "", "(Br)", "", "C9H12BrN"),
    ("4-Iodoamphetamine", NH2, ME, CH2, "", "", "(I)", "", "C9H12IN"),
    ("2-Methylamphetamine", NH2, ME, CH2, "(C)", "", "", "", "C10H15N"),
    ("3-Methylamphetamine", NH2, ME, CH2, "", "(C)", "", "", "C10H15N"),
    ("4-Methylamphetamine", NH2, ME, CH2, "", "", "(C)", "", "C10H15N"),
    ("4-Ethylamphetamine", NH2, ME, CH2, "", "", "(CC)", "", "C11H17N"),
    ("4-Methylthioamphetamine", NH2, ME, CH2, "", "", SME, "", "C10H15NS"),
    ("2-Methoxyamphetamine", NH2, ME, CH2, OME, "", "", "", "C10H15NO"),
    ("3-Methoxyamphetamine", NH2, ME, CH2, "", OME, "", "", "C10H15NO"),
    ("4-Trifluoromethylamphetamine", NH2, ME, CH2, "", "", "(C(F)(F)F)", "",
     "C10H12F3N"),
    ("N-Hydroxyamphetamine", NOH, ME, CH2, "", "", "", "", "C9H13NO"),
    ("2-Fluoromethamphetamine", NME, ME, CH2, "(F)", "", "", "",
     "C10H14FN"),
    ("3-Fluoromethamphetamine", NME, ME, CH2, "", "(F)", "", "",
     "C10H14FN"),
    ("4-Fluoromethamphetamine", NME, ME, CH2, "", "", "(F)", "",
     "C10H14FN"),
    ("4-Chloromethamphetamine", NME, ME, CH2, "", "", "(Cl)", "",
     "C10H14ClN"),
    ("3-Methylmethamphetamine", NME, ME, CH2, "", "(C)", "", "", "C11H17N"),
    ("4-Methylmethamphetamine", NME, ME, CH2, "", "", "(C)", "", "C11H17N"),
    ("4-Methoxymethamphetamine", NME, ME, CH2, "", "", OME, "", "C11H17NO"),
    ("Methoxyphenamine", NME, ME, CH2, OME, "", "", "", "C11H17NO"),
    ("Pholedrine", NME, ME, CH2, "", "", "(O)", "", "C10H15NO"),
    ("3,4-Dimethoxymethamphetamine", NME, ME, CH2, "", OME, OME, "",
     "C12H19NO2"),
    ("4-Methoxyethylamphetamine", NET, ME, CH2, "", "", OME, "",
     "C12H19NO"),
    ("4-Fluoroethylamphetamine", NET, ME, CH2, "", "", "(F)", "",
     "C11H16FN"),
    ("DOF", NH2, ME, CH2, OME, "", "(F)", OME, "C11H16FNO2"),
    ("Ethylamphetamine", NET, ME, CH2, "", "", "", "", "C11H17N"),
    ("Dimethylamphetamine", NDIME, ME, CH2, "", "", "", "", "C11H17N"),
    ("N-Propylamphetamine", NPR, ME, CH2, "", "", "", "", "C12H19N"),
    ("Mefenorex", "ClCCCN", ME, CH2, "", "", "", "", "C12H18ClN"),
    ("Fenproporex", "N#CCCN", ME, CH2, "", "", "", "", "C12H16N2"),
    ("Clobenzorex", "N(Cc1ccccc1Cl)", ME, CH2, "", "", "", "",
     "C16H18ClN"),
    ("Furfenorex", "N(C)(Cc1ccco1)", ME, CH2, "", "", "", "", "C15H19NO"),
    ("Prenylamine", "N(CCC(c1ccccc1)c1ccccc1)", ME, CH2, "", "", "", "",
     "C24H27N"),
    ("Fenethylline", "N(CCn1cnc2c1c(=O)n(C)c(=O)n2C)", ME, CH2, "", "", "",
     "", "C18H23N5O2"),
    ("Iofetamine", NIPR, ME, CH2, "", "", "(I)", "", "C12H18IN"),
    ("MDEA", NET, ME, CH2, "", MDO3, MDO4, "", "C12H17NO2"),
    ("MDDM", NDIME, ME, CH2, "", MDO3, MDO4, "", "C12H17NO2"),
    ("MDPR", NPR, ME, CH2, "", MDO3, MDO4, "", "C13H19NO2"),
    ("MDIP", NIPR, ME, CH2, "", MDO3, MDO4, "", "C13H19NO2"),
    ("MDBU", "CCCCN", ME, CH2, "", MDO3, MDO4, "", "C14H21NO2"),
    ("MDAL", "C=CCN", ME, CH2, "", MDO3, MDO4, "", "C13H17NO2"),
    ("MDPL", "C#CCN", ME, CH2, "", MDO3, MDO4, "", "C13H15NO2"),
    ("MDCPM", "C1CC1CN", ME, CH2, "", MDO3, MDO4, "", "C14H19NO2"),
    ("BDB", NH2, ET, CH2, "", MDO3, MDO4, "", "C11H15NO2"),
    ("MBDB", NME, ET, CH2, "", MDO3, MDO4, "", "C12H17NO2"),
]

# name, N fragment, beta branch, R3, R4, formula
TWOCS = [
    ("2C-B", NH2, CH2, "", "(Br)", "C10H14BrNO2"),
    ("2C-C", NH2, CH2, "", "(Cl)", "C10H14ClNO2"),
    ("2C-D", NH2, CH2, "", "(C)", "C11H17NO2"),
    ("2C-E", NH2, CH2, "", "(CC)", "C12H19NO2"),
    ("2C-F", NH2, CH2, "", "(F)", "C10H14FNO2"),
    ("2C-H", NH2, CH2, "", "", "C10H15NO2"),
    ("2C-I", NH2, CH2, "", "(I)", "C10H14INO2"),
    ("2C-N", NH2, CH2, "", "([N+](=O)[O-])", "C10H14N2O4"),
    ("2C-P", NH2, CH2, "", "(CCC)", "C13H21NO2"),
    ("2C-iP", NH2, CH2, "", "(C(C)C)", "C13H21NO2"),
    ("2C-Bu", NH2, CH2, "", "(CCCC)", "C14H23NO2"),
    ("2C-iBu", NH2, CH2, "", "(CC(C)C)", "C14H23NO2"),
    ("2C-tBu", NH2, CH2, "", "(C(C)(C)C)", "C14H23NO2"),
    ("2C-CP", NH2, CH2, "", "(C1CC1)", "C13H19NO2"),
    ("2C-CN", NH2, CH2, "", "(C#N)", "C11H14N2O2"),
    ("2C-V", NH2, CH2, "", "(C=C)", "C12H17NO2"),
    ("2C-TFM", NH2, CH2, "", "(C(F)(F)F)", "C11H14F3NO2"),
    ("2C-EF", NH2, CH2, "", "(CCF)", "C12H18FNO2"),
    ("2C-TFE", NH2, CH2, "", "(CC(F)(F)F)", "C12H16F3NO2"),
    ("2C-Se", NH2, CH2, "", "([Se]C)", "C11H17NO2Se"),
    ("2C-T", NH2, CH2, "", SME, "C11H17NO2S"),
    ("2C-T-2", NH2, CH2, "", "(SCC)", "C12H19NO2S"),
    ("2C-T-4", NH2, CH2, "", "(SC(C)C)", "C13H21NO2S"),
    ("2C-T-7", NH2, CH2, "", "(SCCC)", "C13H21NO2S"),
    ("2C-T-8", NH2, CH2, "", "(SCC1CC1)", "C14H21NO2S"),
    ("2C-T-9", NH2, CH2, "", "(SC(C)(C)C)", "C14H23NO2S"),
    ("2C-T-13", NH2, CH2, "", "(SCCOC)", "C13H21NO3S"),
    ("2C-T-15", NH2, CH2, "", "(SC1CC1)", "C13H19NO2S"),
    ("2C-T-17", NH2, CH2, "", "(SC(C)CC)", "C14H23NO2S"),
    ("2C-T-21", NH2, CH2, "", "(SCCF)", "C12H18FNO2S"),
    ("2C-T-36", NH2, CH2, "", "(SC(F)(F)F)", "C11H14F3NO2S"),
    ("2C-O", NH2, CH2, "", OME, "C11H17NO3"),
    ("2C-O-4", NH2, CH2, "", "(OC(C)C)", "C13H21NO3"),
    ("2C-G", NH2, CH2, "(C)", "(C)", "C12H19NO2"),
    ("beta-Keto-2C-B", NH2, KETO, "", "(Br)", "C10H12BrNO3"),
    ("beta-Methyl-2C-B", NH2, BME, "", "(Br)", "C11H16BrNO2"),
    ("BOB", NH2, BOME, "", "(Br)", "C11H16BrNO3"),
    ("BOD", NH2, BOME, "", "(C)", "C12H19NO3"),
    ("BOHB", NH2, BOH, "", "(Br)", "C10H14BrNO3"),
    ("N-Ethyl-2C-B", NET, CH2, "", "(Br)", "C12H18BrNO2"),
    ("2C-B-AN", "CC(=O)N", CH2, "", "(Br)", "C12H16BrNO3"),
    ("HOT-2", NOH, CH2, "", "(SCC)", "C12H19NO3S"),
    ("25B-NBOMe", NBOME, CH2, "", "(Br)", "C18H22BrNO3"),
    ("25I-NBOMe", NBOME, CH2, "", "(I)", "C18H22INO3"),
    ("25G-NBOMe", NBOME, CH2, "(C)", "(C)", "C20H27NO3"),
    ("25B-NBOH", NBOH, CH2, "", "(Br)", "C17H20BrNO3"),
    ("25E-NBOH", NBOH, CH2, "", "(CC)", "C19H25NO3"),
    ("25B-NBF", NBF, CH2, "", "(Br)", "C17H19BrFNO2"),
    ("25I-NBF", NBF, CH2, "", "(I)", "C17H19FINO2"),
    ("25B-NB", NB, CH2, "", "(Br)", "C17H20BrNO2"),

    ("2C-AL", NH2, CH2, "", "(CC=C)", "C13H19NO2"),
    ("2C-NH2", NH2, CH2, "", "(N)", "C10H16N2O2"),
    ("25D-NBOH", NBOH, CH2, "", "(C)", "C18H23NO3"),
    ("25F-NBOH", NBOH, CH2, "", "(F)", "C17H20FNO3"),
    ("25H-NBOH", NBOH, CH2, "", "", "C17H21NO3"),
    ("25N-NBOH", NBOH, CH2, "", "([N+](=O)[O-])", "C17H20N2O5"),
    ("25P-NBOH", NBOH, CH2, "", "(CCC)", "C20H27NO3"),
    ("25iP-NBOH", NBOH, CH2, "", "(C(C)C)", "C20H27NO3"),
    ("25O-NBOH", NBOH, CH2, "", OME, "C18H23NO4"),
    ("25G-NBOH", NBOH, CH2, "(C)", "(C)", "C19H25NO3"),
    ("25T-NBOH", NBOH, CH2, "", SME, "C18H23NO3S"),
    ("25T2-NBOH", NBOH, CH2, "", "(SCC)", "C19H25NO3S"),
    ("25T4-NBOH", NBOH, CH2, "", "(SC(C)C)", "C20H27NO3S"),
    ("25T7-NBOH", NBOH, CH2, "", "(SCCC)", "C20H27NO3S"),
    ("25TFM-NBOH", NBOH, CH2, "", "(C(F)(F)F)", "C18H20F3NO3"),
    ("25D-NBF", NBF, CH2, "", "(C)", "C18H22FNO2"),
    ("25E-NBF", NBF, CH2, "", "(CC)", "C19H24FNO2"),
    ("25H-NBF", NBF, CH2, "", "", "C17H20FNO2"),
    ("25N-NBF", NBF, CH2, "", "([N+](=O)[O-])", "C17H19FN2O4"),
    ("25P-NBF", NBF, CH2, "", "(CCC)", "C20H26FNO2"),
    ("25T-NBF", NBF, CH2, "", SME, "C18H22FNO2S"),
    ("25T2-NBF", NBF, CH2, "", "(SCC)", "C19H24FNO2S"),
    ("25T7-NBF", NBF, CH2, "", "(SCCC)", "C20H26FNO2S"),
    ("25TFM-NBF", NBF, CH2, "", "(C(F)(F)F)", "C18H19F4NO2"),
    ("25CN-NBF", NBF, CH2, "", "(C#N)", "C18H19FN2O2"),
    ("25B-NBMD", NBMD, CH2, "", "(Br)", "C18H20BrNO4"),
    ("25C-NBMD", NBMD, CH2, "", "(Cl)", "C18H20ClNO4"),
    ("25I-NBMD", NBMD, CH2, "", "(I)", "C18H20INO4"),
    ("25D-NBMD", NBMD, CH2, "", "(C)", "C19H23NO4"),
    ("25E-NBMD", NBMD, CH2, "", "(CC)", "C20H25NO4"),
    ("25H-NBMD", NBMD, CH2, "", "", "C18H21NO4"),
    ("25T2-NBMD", NBMD, CH2, "", "(SCC)", "C20H25NO4S"),
    ("25T7-NBMD", NBMD, CH2, "", "(SCCC)", "C21H27NO4S"),
    ("25C-NB", NB, CH2, "", "(Cl)", "C17H20ClNO2"),
    ("25I-NB", NB, CH2, "", "(I)", "C17H20INO2"),
    ("25D-NB", NB, CH2, "", "(C)", "C18H23NO2"),
    ("25E-NB", NB, CH2, "", "(CC)", "C19H25NO2"),
    ("25H-NB", NB, CH2, "", "", "C17H21NO2"),
    ("25T2-NB", NB, CH2, "", "(SCC)", "C19H25NO2S"),
    ("N-Methyl-2C-B", NME, CH2, "", "(Br)", "C11H16BrNO2"),
    ("N-Methyl-2C-C", NME, CH2, "", "(Cl)", "C11H16ClNO2"),
    ("N-Methyl-2C-I", NME, CH2, "", "(I)", "C11H16INO2"),
    ("N-Methyl-2C-D", NME, CH2, "", "(C)", "C12H19NO2"),
    ("N-Methyl-2C-E", NME, CH2, "", "(CC)", "C13H21NO2"),
    ("N-Methyl-2C-H", NME, CH2, "", "", "C11H17NO2"),
    ("N-Methyl-2C-T-2", NME, CH2, "", "(SCC)", "C13H21NO2S"),
    ("N-Ethyl-2C-C", NET, CH2, "", "(Cl)", "C12H18ClNO2"),
    ("N-Ethyl-2C-I", NET, CH2, "", "(I)", "C12H18INO2"),
    ("N-Ethyl-2C-D", NET, CH2, "", "(C)", "C13H21NO2"),
    ("N-Ethyl-2C-E", NET, CH2, "", "(CC)", "C14H23NO2"),
    ("N,N-Dimethyl-2C-B", NDIME, CH2, "", "(Br)", "C12H18BrNO2"),
    ("N,N-Dimethyl-2C-I", NDIME, CH2, "", "(I)", "C12H18INO2"),
]

# name, class, structure, formula
SINGLETONS = [
    ("2C-G-N", "2C phenethylamine", "NCCc1cc(OC)c2ccccc2c1OC",
     "C14H17NO2"),
    ("Propylhexedrine", "Amphetamine", "CNC(C)CC1CCCCC1", "C10H21N"),
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
          AMPHETAMINE.format(N=row[1], A=row[2], B=row[3], R2=row[4],
                             R3=row[5], R4=row[6], R5=row[7]), "Amphetamine")
         for row in AMPHETAMINES]
        + [(row[0], row[-1],
            TWOC.format(N=row[1], B=row[2], R3=row[3], R4=row[4]),
            "2C phenethylamine")
           for row in TWOCS]
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
