# Derives analgesic / anti-inflammatory reference structures from scaffold
# templates that are first proven against entries data/library.js already
# stores.
#
# Each template is a format string with named substituent slots. A row that
# names a compound already in the library is not emitted; instead its
# constructed structure must equal the stored one after stereochemistry is
# stripped. Those rows are the anchors. A template with fewer than two
# anchors is not trusted and its members are written as singletons instead.
#
# Every row additionally states its molecular formula independently of the
# structure. RDKit computes the formula from the constructed structure and
# the run aborts before emitting anything if the two disagree. That
# cross-check cannot catch an error that leaves the formula unchanged - a
# substituent on the wrong ring position, an ester and an amide
# interchanged, two isomeric alkyl groups swapped - so ring positions are
# written out in the slot tables and checked against the anchors.
#
# Ring-closure digit 9 is reserved for template cores. Interpolated
# substituents use 1-6.
#
# No affinity, selectivity, potency or clinical claim is made by anything
# written here.

import argparse
import os
import re
import sys

from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ENTRY = re.compile(
    r"\{ name: '([^']*)', cls: '([^']*)', formula: '([^']*)', smiles: '([^']*)'"
)

# 2-substituted benzoic acid core. atom1 carries C1, atom2 carries O2, then
# P3 P4 P5 P6 are ring positions 3 4 5 6 written as branches or empty.
SALICYL = "{C1}c9c({O2}){P3}{P4}{P5}{P6}9"

# anthranilic acid core: C1 on atom1, the anilino nitrogen on atom2.
FENAMATE = "{C1}c9ccccc9N{AR}"

# 2-aminonicotinic acid core, the aza-fenamates.
AZAFENAMATE = "OC(=O)c9cccnc9N{AR}"

# 2-arylpropanoate: C1 on the alpha carbon, which also carries a methyl.
PROFEN = "{C1}C(C){AR}"

# arylacetate.
ARYLACETIC = "{C1}C{AR}"

# 4-hydroxy-2H-1,2-benzothiazine-3-carboxamide 1,1-dioxide.
BENZOXICAM = "CN9C(C(=O)N{AM})=C(O)c1ccccc1S9(=O)=O"

# 1,5-dimethyl-2-phenylpyrazol-3-one, antipyrine type. C4 is ring position 4.
ANTIPYRINE = "Cc9c{C4}c(=O)n(-{N1})n9{N2}"

# pyrazolidine-3,5-dione, butazone type. R sits on ring carbon 4.
BUTAZONE = "{R}C9C(=O)N(-{NA})N(-{NB})C9=O"

# 4-substituted acetanilide.
ANILIDE = "{ACYL}Nc9ccc{P4}cc9"

PHENYL = "c1ccccc1"
PYRIDIN2YL = "c1ccccn1"
ANILIDO = "c1ccccc1NC(=O)"

# name, cls, C1, O2, P3, P4, P5, P6, formula
SALICYLATES = [
    ("Aspirin", "Salicylate", "OC(=O)", "OC(C)=O", "c", "c", "c", "c", "C9H8O4"),
    ("Salicylic acid", "Salicylate", "OC(=O)", "O", "c", "c", "c", "c", "C7H6O3"),
    ("Methyl salicylate", "Salicylate", "COC(=O)", "O", "c", "c", "c", "c", "C8H8O3"),
    ("Ethenzamide", "Salicylate", "NC(=O)", "OCC", "c", "c", "c", "c", "C9H11NO2"),
    ("Salsalate", "Salicylate", "OC(=O)", "OC(=O)c1ccccc1O", "c", "c", "c", "c", "C14H10O5"),
    ("Benorilate", "Salicylate", "CC(=O)Nc1ccc(cc1)OC(=O)", "OC(C)=O", "c", "c", "c", "c", "C17H15NO5"),
    ("Diflunisal", "Salicylate", "OC(=O)", "O", "c", "c", "c(-c1ccc(F)cc1F)", "c", "C13H8F2O3"),
    ("Mesalazine", "Salicylate", "OC(=O)", "O", "c", "c", "c(N)", "c", "C7H7NO3"),
    ("Olsalazine", "Salicylate", "OC(=O)", "O", "c", "c", "c(N=Nc1ccc(O)c(C(=O)O)c1)", "c", "C14H10N2O6"),
    ("Niclosamide", "Salicylate", "Clc1cc([N+](=O)[O-])ccc1NC(=O)", "O", "c", "c", "c(Cl)", "c", "C13H8Cl2N2O4"),

    ("Ethyl salicylate", "Salicylate", "CCOC(=O)", "O", "c", "c", "c", "c", "C9H10O3"),
    ("Propyl salicylate", "Salicylate", "CCCOC(=O)", "O", "c", "c", "c", "c", "C10H12O3"),
    ("Isopropyl salicylate", "Salicylate", "CC(C)OC(=O)", "O", "c", "c", "c", "c", "C10H12O3"),
    ("Butyl salicylate", "Salicylate", "CCCCOC(=O)", "O", "c", "c", "c", "c", "C11H14O3"),
    ("Isobutyl salicylate", "Salicylate", "CC(C)COC(=O)", "O", "c", "c", "c", "c", "C11H14O3"),
    ("Amyl salicylate", "Salicylate", "CCCCCOC(=O)", "O", "c", "c", "c", "c", "C12H16O3"),
    ("Isoamyl salicylate", "Salicylate", "CC(C)CCOC(=O)", "O", "c", "c", "c", "c", "C12H16O3"),
    ("Hexyl salicylate", "Salicylate", "CCCCCCOC(=O)", "O", "c", "c", "c", "c", "C13H18O3"),
    ("Octyl salicylate", "Salicylate", "CCCCCCCCOC(=O)", "O", "c", "c", "c", "c", "C15H22O3"),
    ("Octisalate", "Salicylate", "CCCCC(CC)COC(=O)", "O", "c", "c", "c", "c", "C15H22O3"),
    ("Homosalate", "Salicylate", "CC1CC(C)(C)CC(C1)OC(=O)", "O", "c", "c", "c", "c", "C16H22O3"),
    ("Menthyl salicylate", "Salicylate", "CC1CCC(C(C)C)C(C1)OC(=O)", "O", "c", "c", "c", "c", "C17H24O3"),
    ("Cyclohexyl salicylate", "Salicylate", "C1CCCCC1OC(=O)", "O", "c", "c", "c", "c", "C13H16O3"),
    ("Benzyl salicylate", "Salicylate", "c1ccccc1COC(=O)", "O", "c", "c", "c", "c", "C14H12O3"),
    ("Phenyl salicylate", "Salicylate", "c1ccccc1OC(=O)", "O", "c", "c", "c", "c", "C13H10O3"),
    ("Glycol salicylate", "Salicylate", "OCCOC(=O)", "O", "c", "c", "c", "c", "C9H10O4"),

    ("Salicylamide", "Salicylate", "NC(=O)", "O", "c", "c", "c", "c", "C7H7NO2"),
    ("N-Methylsalicylamide", "Salicylate", "CNC(=O)", "O", "c", "c", "c", "c", "C8H9NO2"),
    ("N,N-Dimethylsalicylamide", "Salicylate", "CN(C)C(=O)", "O", "c", "c", "c", "c", "C9H11NO2"),
    ("Acetylsalicylamide", "Salicylate", "NC(=O)", "OC(C)=O", "c", "c", "c", "c", "C9H9NO3"),
    ("Salicylaldehyde", "Salicylate", "O=C", "O", "c", "c", "c", "c", "C7H6O2"),
    ("Salicylanilide", "Salicylate", ANILIDO, "O", "c", "c", "c", "c", "C13H11NO2"),
    ("Osalmid", "Salicylate", "Oc1ccc(cc1)NC(=O)", "O", "c", "c", "c", "c", "C13H11NO3"),
    ("Salicyluric acid", "Salicylate", "OC(=O)CNC(=O)", "O", "c", "c", "c", "c", "C9H9NO4"),
    ("Salicylhydroxamic acid", "Salicylate", "ONC(=O)", "O", "c", "c", "c", "c", "C7H7NO3"),

    ("Methyl acetylsalicylate", "Salicylate", "COC(=O)", "OC(C)=O", "c", "c", "c", "c", "C10H10O4"),
    ("Ethyl acetylsalicylate", "Salicylate", "CCOC(=O)", "OC(C)=O", "c", "c", "c", "c", "C11H12O4"),
    ("Benzyl acetylsalicylate", "Salicylate", "c1ccccc1COC(=O)", "OC(C)=O", "c", "c", "c", "c", "C16H14O4"),
    ("Phenyl acetylsalicylate", "Salicylate", "c1ccccc1OC(=O)", "OC(C)=O", "c", "c", "c", "c", "C15H12O4"),
    ("Guacetisal", "Salicylate", "COc1ccccc1OC(=O)", "OC(C)=O", "c", "c", "c", "c", "C16H14O5"),
    ("Dipyrocetyl", "Salicylate", "OC(=O)", "OC(C)=O", "c", "c", "c(OC(C)=O)", "c", "C11H10O6"),
    ("Triflusal", "Salicylate", "OC(=O)", "OC(C)=O", "c", "c(C(F)(F)F)", "c", "c", "C10H7F3O4"),
    ("Flufenisal", "Salicylate", "OC(=O)", "OC(C)=O", "c", "c", "c(-c1ccc(F)cc1)", "c", "C15H11FO4"),
    ("Fosfosal", "Salicylate", "OC(=O)", "OP(=O)(O)O", "c", "c", "c", "c", "C7H7O6P"),
    ("Salicylsulfuric acid", "Salicylate", "OC(=O)", "OS(=O)(=O)O", "c", "c", "c", "c", "C7H6O6S"),

    ("2-Hydroxy-4-(trifluoromethyl)benzoic acid", "Salicylate", "OC(=O)", "O", "c", "c(C(F)(F)F)", "c", "c", "C8H5F3O3"),
    ("Gentisic acid", "Salicylate", "OC(=O)", "O", "c", "c", "c(O)", "c", "C7H6O4"),
    ("2,3-Dihydroxybenzoic acid", "Salicylate", "OC(=O)", "O", "c(O)", "c", "c", "c", "C7H6O4"),
    ("2,4-Dihydroxybenzoic acid", "Salicylate", "OC(=O)", "O", "c", "c(O)", "c", "c", "C7H6O4"),
    ("2,6-Dihydroxybenzoic acid", "Salicylate", "OC(=O)", "O", "c", "c", "c", "c(O)", "C7H6O4"),
    ("2,4,6-Trihydroxybenzoic acid", "Salicylate", "OC(=O)", "O", "c", "c(O)", "c", "c(O)", "C7H6O5"),
    ("4-Aminosalicylic acid", "Salicylate", "OC(=O)", "O", "c", "c(N)", "c", "c", "C7H7NO3"),
    ("3-Aminosalicylic acid", "Salicylate", "OC(=O)", "O", "c(N)", "c", "c", "c", "C7H7NO3"),
    ("Fenamisal", "Salicylate", "c1ccccc1OC(=O)", "O", "c", "c(N)", "c", "c", "C13H11NO3"),
    ("5-Chlorosalicylic acid", "Salicylate", "OC(=O)", "O", "c", "c", "c(Cl)", "c", "C7H5ClO3"),
    ("4-Chlorosalicylic acid", "Salicylate", "OC(=O)", "O", "c", "c(Cl)", "c", "c", "C7H5ClO3"),
    ("3,5-Dichlorosalicylic acid", "Salicylate", "OC(=O)", "O", "c(Cl)", "c", "c(Cl)", "c", "C7H4Cl2O3"),
    ("5-Bromosalicylic acid", "Salicylate", "OC(=O)", "O", "c", "c", "c(Br)", "c", "C7H5BrO3"),
    ("3,5-Dibromosalicylic acid", "Salicylate", "OC(=O)", "O", "c(Br)", "c", "c(Br)", "c", "C7H4Br2O3"),
    ("5-Iodosalicylic acid", "Salicylate", "OC(=O)", "O", "c", "c", "c(I)", "c", "C7H5IO3"),
    ("5-Fluorosalicylic acid", "Salicylate", "OC(=O)", "O", "c", "c", "c(F)", "c", "C7H5FO3"),
    ("5-Nitrosalicylic acid", "Salicylate", "OC(=O)", "O", "c", "c", "c([N+](=O)[O-])", "c", "C7H5NO5"),
    ("3-Nitrosalicylic acid", "Salicylate", "OC(=O)", "O", "c([N+](=O)[O-])", "c", "c", "c", "C7H5NO5"),
    ("5-Methylsalicylic acid", "Salicylate", "OC(=O)", "O", "c", "c", "c(C)", "c", "C8H8O3"),
    ("4-Methylsalicylic acid", "Salicylate", "OC(=O)", "O", "c", "c(C)", "c", "c", "C8H8O3"),
    ("3-Methylsalicylic acid", "Salicylate", "OC(=O)", "O", "c(C)", "c", "c", "c", "C8H8O3"),
    ("4-Methoxysalicylic acid", "Salicylate", "OC(=O)", "O", "c", "c(OC)", "c", "c", "C8H8O4"),
    ("5-Sulfosalicylic acid", "Salicylate", "OC(=O)", "O", "c", "c", "c(S(=O)(=O)O)", "c", "C7H6O6S"),

    ("Tribromsalan", "Salicylate", "Brc1ccc(cc1)NC(=O)", "O", "c(Br)", "c", "c(Br)", "c", "C13H8Br3NO2"),
    ("Dibromsalan", "Salicylate", "Brc1ccc(cc1)NC(=O)", "O", "c", "c", "c(Br)", "c", "C13H9Br2NO2"),
    ("Metabromsalan", "Salicylate", ANILIDO, "O", "c(Br)", "c", "c(Br)", "c", "C13H9Br2NO2"),
    ("Balsalazide", "Salicylate", "OC(=O)", "O", "c", "c", "c(N=Nc1ccc(C(=O)NCCC(=O)O)cc1)", "c", "C17H15N3O6"),
]

# name, cls, C1, AR, formula
FENAMATES = [
    ("Mefenamic acid", "Fenamate", "OC(=O)", "c1cccc(C)c1C", "C15H15NO2"),
    ("Flufenamic acid", "Fenamate", "OC(=O)", "c1cccc(C(F)(F)F)c1", "C14H10F3NO2"),
    ("Meclofenamic acid", "Fenamate", "OC(=O)", "c1c(Cl)ccc(C)c1Cl", "C14H11Cl2NO2"),
    ("Tolfenamic acid", "Fenamate", "OC(=O)", "c1cccc(Cl)c1C", "C14H12ClNO2"),

    ("Fenamic acid", "Fenamate", "OC(=O)", PHENYL, "C13H11NO2"),
    ("Enfenamic acid", "Fenamate", "OC(=O)", "CCc1ccccc1", "C15H15NO2"),
    ("Etofenamate", "Fenamate", "OCCOCCOC(=O)", "c1cccc(C(F)(F)F)c1", "C18H18F3NO4"),
    ("Glafenine", "Fenamate", "OCC(O)COC(=O)", "c1ccnc2cc(Cl)ccc12", "C19H17ClN2O4"),
    ("Floctafenine", "Fenamate", "OCC(O)COC(=O)", "c1ccnc2c(C(F)(F)F)cccc12", "C20H17F3N2O4"),
]

# name, cls, AR, formula
AZAFENAMATES = [
    ("Niflumic acid", "Fenamate", "c1cccc(C(F)(F)F)c1", "C13H9F3N2O2"),
    ("Clonixin", "Fenamate", "c1cccc(Cl)c1C", "C13H11ClN2O2"),
    ("Flunixin", "Fenamate", "c1cccc(C(F)(F)F)c1C", "C14H11F3N2O2"),
]

# name, cls, C1, AR, formula
PROFENS = [
    ("Ibuprofen", "Arylpropionic acid NSAID", "OC(=O)", "c1ccc(CC(C)C)cc1", "C13H18O2"),
    ("Naproxen", "Arylpropionic acid NSAID", "OC(=O)", "c1ccc2cc(OC)ccc2c1", "C14H14O3"),
    ("Ketoprofen", "Arylpropionic acid NSAID", "OC(=O)", "c1cccc(C(=O)c2ccccc2)c1", "C16H14O3"),
    ("Flurbiprofen", "Arylpropionic acid NSAID", "OC(=O)", "c1ccc(-c2ccccc2)c(F)c1", "C15H13FO2"),
    ("Fenoprofen", "Arylpropionic acid NSAID", "OC(=O)", "c1cccc(Oc2ccccc2)c1", "C15H14O3"),
    ("Carprofen", "Arylpropionic acid NSAID", "OC(=O)", "c1ccc2c(c1)[nH]c1ccc(Cl)cc12", "C15H12ClNO2"),
    ("Loxoprofen", "Arylpropionic acid NSAID", "OC(=O)", "c1ccc(CC2CCCC2=O)cc1", "C15H18O3"),
    ("Tiaprofenic acid", "Arylpropionic acid NSAID", "OC(=O)", "c1ccc(C(=O)c2ccccc2)s1", "C14H12O3S"),
    ("Suprofen", "Arylpropionic acid NSAID", "OC(=O)", "c1ccc(C(=O)c2cccs2)cc1", "C14H12O3S"),
    ("Indoprofen", "Arylpropionic acid NSAID", "OC(=O)", "c1ccc(N2Cc3ccccc3C2=O)cc1", "C17H15NO3"),
    ("Pirprofen", "Arylpropionic acid NSAID", "OC(=O)", "c1ccc(N2CC=CC2)c(Cl)c1", "C13H14ClNO2"),
    ("Alminoprofen", "Arylpropionic acid NSAID", "OC(=O)", "c1ccc(NCC(=C)C)cc1", "C13H17NO2"),
    ("Benoxaprofen", "Arylpropionic acid NSAID", "OC(=O)", "c1ccc2nc(-c3ccc(Cl)cc3)oc2c1", "C16H12ClNO3"),

    ("Vedaprofen", "Arylpropionic acid NSAID", "OC(=O)", "c1ccc(C2CCCCC2)c2ccccc12", "C19H22O2"),
    ("Zaltoprofen", "Arylpropionic acid NSAID", "OC(=O)", "c1ccc2c(c1)Sc1ccccc1CC2=O", "C17H14O3S"),
    ("Ibuproxam", "Arylpropionic acid NSAID", "ONC(=O)", "c1ccc(CC(C)C)cc1", "C13H19NO2"),
]

# name, cls, C1, AR, formula
ARYLACETICS = [
    ("Diclofenac", "Arylacetic acid NSAID", "OC(=O)", "c1ccccc1Nc1c(Cl)cccc1Cl", "C14H11Cl2NO2"),
    ("Alclofenac", "Arylacetic acid NSAID", "OC(=O)", "c1ccc(OCC=C)c(Cl)c1", "C11H11ClO3"),
    ("Felbinac", "Arylacetic acid NSAID", "OC(=O)", "c1ccc(-c2ccccc2)cc1", "C14H12O2"),
    ("Bromfenac", "Arylacetic acid NSAID", "OC(=O)", "c1cccc(C(=O)c2ccc(Br)cc2)c1N", "C15H12BrNO3"),
    ("Amfenac", "Arylacetic acid NSAID", "OC(=O)", "c1cccc(C(=O)c2ccccc2)c1N", "C15H13NO3"),
    ("Nepafenac", "Arylacetic acid NSAID", "NC(=O)", "c1cccc(C(=O)c2ccccc2)c1N", "C15H14N2O2"),
    ("Tolmetin", "Arylacetic acid NSAID", "OC(=O)", "c1ccc(C(=O)c2ccc(C)cc2)n1C", "C15H15NO3"),
    ("Zomepirac", "Arylacetic acid NSAID", "OC(=O)", "c1cc(C)c(C(=O)c2ccc(Cl)cc2)n1C", "C15H14ClNO3"),
    ("Indomethacin", "Arylacetic acid NSAID", "OC(=O)", "c1c(C)n(C(=O)c2ccc(Cl)cc2)c2ccc(OC)cc12", "C19H16ClNO4"),
    ("Fenclofenac", "Arylacetic acid NSAID", "OC(=O)", "c1ccccc1Oc1ccc(Cl)cc1Cl", "C14H10Cl2O3"),
    ("Lonazolac", "Arylacetic acid NSAID", "OC(=O)", "c1cn(-c2ccccc2)nc1-c1ccc(Cl)cc1", "C17H13ClN2O2"),
    ("Lumiracoxib", "Arylacetic acid NSAID", "OC(=O)", "c1cc(Cl)ccc1Nc1cc(C)ccc1F", "C15H13ClFNO2"),

    ("Acemetacin", "Arylacetic acid NSAID", "OC(=O)COC(=O)", "c1c(C)n(C(=O)c2ccc(Cl)cc2)c2ccc(OC)cc12", "C21H18ClNO6"),
    ("Cinmetacin", "Arylacetic acid NSAID", "OC(=O)", "c1c(C)n(C(=O)C=Cc2ccccc2)c2ccc(OC)cc12", "C21H19NO4"),
    ("Fentiazac", "Arylacetic acid NSAID", "OC(=O)", "c1sc(-c2ccccc2)nc1-c1ccc(Cl)cc1", "C17H12ClNO2S"),
    ("Bufexamac", "Arylacetic acid NSAID", "ONC(=O)", "c1ccc(OCCCC)cc1", "C12H17NO3"),
]

# name, cls, AM, formula
BENZOXICAMS = [
    ("Piroxicam", "Oxicam", PYRIDIN2YL, "C15H13N3O4S"),
    ("Meloxicam", "Oxicam", "c1ncc(C)s1", "C14H13N3O4S2"),
    ("Isoxicam", "Oxicam", "c1noc(C)c1", "C14H13N3O5S"),
    ("Sudoxicam", "Oxicam", "c1nccs1", "C13H11N3O4S2"),
]

# name, cls, C4, N1, N2, formula
ANTIPYRINES = [
    ("Antipyrine", "Pyrazolone", "", PHENYL, "C", "C11H12N2O"),
    ("Propyphenazone", "Pyrazolone", "(C(C)C)", PHENYL, "C", "C14H18N2O"),
    ("Aminophenazone", "Pyrazolone", "(N(C)C)", PHENYL, "C", "C13H17N3O"),
    ("Metamizole", "Pyrazolone", "(N(C)CS(=O)(=O)O)", PHENYL, "C", "C13H17N3O4S"),

    ("4-Aminoantipyrine", "Pyrazolone", "(N)", PHENYL, "C", "C11H13N3O"),
    ("4-Methylaminoantipyrine", "Pyrazolone", "(NC)", PHENYL, "C", "C12H15N3O"),
    ("4-Formylaminoantipyrine", "Pyrazolone", "(NC=O)", PHENYL, "C", "C12H13N3O2"),
    ("4-Acetamidoantipyrine", "Pyrazolone", "(NC(C)=O)", PHENYL, "C", "C13H15N3O2"),
    ("4-Hydroxyantipyrine", "Pyrazolone", "(O)", PHENYL, "C", "C11H12N2O2"),
    ("4-Nitrosoantipyrine", "Pyrazolone", "(N=O)", PHENYL, "C", "C11H11N3O2"),
    ("4-Chloroantipyrine", "Pyrazolone", "(Cl)", PHENYL, "C", "C11H11ClN2O"),
    ("4-Bromoantipyrine", "Pyrazolone", "(Br)", PHENYL, "C", "C11H11BrN2O"),
    ("4-Iodoantipyrine", "Pyrazolone", "(I)", PHENYL, "C", "C11H11IN2O"),
    ("Nifenazone", "Pyrazolone", "(NC(=O)c1cccnc1)", PHENYL, "C", "C17H16N4O2"),
    ("Ramifenazone", "Pyrazolone", "(NC(C)C)", PHENYL, "C", "C14H19N3O"),
]

# name, cls, R, NA, NB, formula
BUTAZONES = [
    ("Phenylbutazone", "Pyrazolone", "CCCC", PHENYL, PHENYL, "C19H20N2O2"),
    ("Oxyphenbutazone", "Pyrazolone", "CCCC", PHENYL, "c1ccc(O)cc1", "C19H20N2O3"),
    ("Sulfinpyrazone", "Pyrazolone", "O=S(c1ccccc1)CC", PHENYL, PHENYL, "C23H20N2O3S"),
    ("Kebuzone", "Pyrazolone", "CC(=O)CC", PHENYL, PHENYL, "C19H18N2O3"),

    ("Feprazone", "Pyrazolone", "CC(C)=CC", PHENYL, PHENYL, "C20H20N2O2"),
    ("gamma-Hydroxyphenylbutazone", "Pyrazolone", "CC(O)CC", PHENYL, PHENYL, "C19H20N2O3"),
    ("Sulfinpyrazone sulfide", "Pyrazolone", "c1ccccc1SCC", PHENYL, PHENYL, "C23H20N2O2S"),
    ("Sulfinpyrazone sulfone", "Pyrazolone", "O=S(=O)(c1ccccc1)CC", PHENYL, PHENYL, "C23H20N2O4S"),
    ("1,2-Diphenylpyrazolidine-3,5-dione", "Pyrazolone", "", PHENYL, PHENYL, "C15H12N2O2"),
]

# name, cls, ACYL, P4, formula
ANILIDES = [
    ("Paracetamol", "Aniline analgesic", "CC(=O)", "(O)", "C8H9NO2"),
    ("Phenacetin", "Aniline analgesic", "CC(=O)", "(OCC)", "C10H13NO2"),

    ("Acetanilide", "Aniline analgesic", "CC(=O)", "", "C8H9NO"),
    ("Methacetin", "Aniline analgesic", "CC(=O)", "(OC)", "C9H11NO2"),
    ("Butacetin", "Aniline analgesic", "CC(=O)", "(C(C)(C)C)", "C12H17NO"),
    ("Bucetin", "Aniline analgesic", "CC(O)CC(=O)", "(OCC)", "C12H17NO3"),
    ("Phenocoll", "Aniline analgesic", "NCC(=O)", "(OCC)", "C10H14N2O2"),
    ("Lactylphenetidin", "Aniline analgesic", "CC(O)C(=O)", "(OCC)", "C11H15NO3"),
    ("Propacetamol", "Aniline analgesic", "CC(=O)", "(OC(=O)CN(CC)CC)", "C14H20N2O3"),
]

# name, cls, smiles, formula
SINGLETONS = [
    ("Mofebutazone", "Pyrazolone", "CCCCC1C(=O)NN(c2ccccc2)C1=O", "C13H16N2O2"),
    ("Metacetamol", "Aniline analgesic", "CC(=O)Nc1cccc(O)c1", "C8H9NO2"),
    ("2-Hydroxyacetanilide", "Aniline analgesic", "CC(=O)Nc1ccccc1O", "C8H9NO2"),
    ("NAPQI", "Aniline analgesic", "CC(=O)N=C1C=CC(=O)C=C1", "C8H7NO2"),
    ("Butibufen", "Arylpropionic acid NSAID", "CCC(C(=O)O)c1ccc(CC(C)C)cc1", "C14H20O2"),
    ("Xenbucin", "Arylpropionic acid NSAID", "CCC(C(=O)O)c1ccc(-c2ccccc2)cc1", "C16H16O2"),
]


def flat(smiles):
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

    families = []
    for row in SALICYLATES:
        families.append((row[0], row[1], row[-1], SALICYL.format(
            C1=row[2], O2=row[3], P3=row[4], P4=row[5], P5=row[6], P6=row[7])))
    for row in FENAMATES:
        families.append((row[0], row[1], row[-1], FENAMATE.format(C1=row[2], AR=row[3])))
    for row in AZAFENAMATES:
        families.append((row[0], row[1], row[-1], AZAFENAMATE.format(AR=row[2])))
    for row in PROFENS:
        families.append((row[0], row[1], row[-1], PROFEN.format(C1=row[2], AR=row[3])))
    for row in ARYLACETICS:
        families.append((row[0], row[1], row[-1], ARYLACETIC.format(C1=row[2], AR=row[3])))
    for row in BENZOXICAMS:
        families.append((row[0], row[1], row[-1], BENZOXICAM.format(AM=row[2])))
    for row in ANTIPYRINES:
        families.append((row[0], row[1], row[-1], ANTIPYRINE.format(
            C4=row[2], N1=row[3], N2=row[4])))
    for row in BUTAZONES:
        families.append((row[0], row[1], row[-1], BUTAZONE.format(
            R=row[2], NA=row[3], NB=row[4])))
    for row in ANILIDES:
        families.append((row[0], row[1], row[-1], ANILIDE.format(ACYL=row[2], P4=row[3])))
    for row in SINGLETONS:
        families.append((row[0], row[1], row[3], row[2]))

    seen = {}
    for name, (_formula, smiles) in stored.items():
        key = flat(smiles)
        if key is not None:
            seen.setdefault(key, name)

    failures, rows, anchors = [], [], []
    for name, cls, stated, smiles in families:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            failures.append("%s: constructed structure does not parse (%s)" % (name, smiles))
            continue
        computed = CalcMolFormula(mol)
        if computed != stated:
            failures.append("%s: stated %s but constructed structure is %s" % (name, stated, computed))
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

    text = "".join("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
                   % (row["name"], row["cls"], row["formula"], row["smiles"])
                   for row in rows)
    if args.output == "-":
        sys.stdout.write(text)
    else:
        open(args.output, "w", encoding="utf-8").write(text)
    sys.stderr.write("templates reproduced %d stored entries (%s); %d new rows\n"
                     % (len(anchors), ", ".join(anchors), len(rows)))


if __name__ == "__main__":
    main()
