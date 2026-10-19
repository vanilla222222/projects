"""Build nuclear-receptor reference structures by substitution on verified steroid scaffolds.

Run: python tools/derive-steroid-references.py [--output rows.js]

Same discipline as tools/derive-nsaid-references.py. Every pregnane, androstane and
estrane compound here is written as a set of substituent slots on one of two templates,
and both templates are validated first by regenerating steroids the library already
stores and requiring a canonical-SMILES match. Thirty-three stored entries are reproduced this
way, which is the strongest anchoring any family in this project has had.

That anchoring is what exposed three mis-drawn stored entries, corrected in the commit
before this one: Prednisolone, Methylprednisolone and the ESOL-labelled Norethisterone
row carried skeletons the template could not produce because no steroid has them.

Two template variants have no stored anchor. The 16,17-acetal slot used by the acetonide
corticosteroids and the aromatic-ring substituent slots used by the catechol estrogens
were not exercised by any stored entry, so those compounds rest on the formula
cross-check alone. Triamcinolone acetonide and 2-Hydroxyestradiol are the ones to check
by hand if either slot is ever extended.

The singleton section holds compounds that are not steroids at all, written as explicit
structures: the triphenylethylene and benzothiophene receptor modulators, the
non-steroidal synthetic estrogens, the isoflavone and lignan phytoestrogens, the
non-steroidal aromatase inhibitors and the anilide antiandrogens. Those carry no template
evidence, only the formula cross-check.

Each compound carries an independently stated molecular formula, which RDKit checks
against the formula computed from the constructed structure. Agreement between the two
recalls is evidence of consistency, not proof of identity: it cannot catch an error that
leaves the formula unchanged, which for these scaffolds means a substituent placed on the
wrong ring carbon or assigned to the wrong epimer.

Epimer pairs are deliberately absent. Betamethasone, diflorasone, calusterone and
etiocholanolone differ from compounds written here only in stereochemistry, so the
constitutional templates cannot distinguish them and the structure-collision gate would
reject them as duplicates.

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

# Atoms are written in steroid numbering order: C19, C10, then the A ring closing ring 8
# at C5, C6 and C7, C8, C9 closing ring 9 at C10, C11, C12, C13 reopening ring 9, C14
# closing ring 8, C15, C16, C17 closing ring 9, then the C20 side chain. Rings 8 and 9
# keep the nucleus clear of the ring numbers an interpolated ester or acetal opens.
STEROID = "{C19}C89{A}{B}C8C9{X9}{C11}CC9({C18})C8{C15}{C16}C9{C17}{S}"
ESTRANE = "{O3}c8{C2}{C1}c9c(c8{C4})C{C7}C8C9{C11}CC9({C18})C8{C15}{C16}C9{C17}{S}"

STEROID_SLOTS = dict(C19="C", A="CCC(=O)C=C8", B="CC", X9="", C11="C", C18="C",
                     C15="C", C16="C", C17="", S="")
ESTRANE_SLOTS = dict(O3="O", C2="c", C1="c", C4="", C7="C", C11="C", C18="C",
                     C15="C", C16="C", C17="", S="")

EN4 = "CCC(=O)C=C8"
DIEN = "C=CC(=O)C=C8"
SAT3ONE = "CCC(=O)CC8"
SAT3OL = "CCC(O)CC8"
ACETONIDE = ("C7", "(OC(C)(C)O7)")

# name, class, stated formula, slot overrides
STEROIDS = [
    ("Testosterone", "Steroid", "C19H28O2", dict(C17="O")),
    ("Progesterone", "Steroid", "C21H30O2", dict(S="C(C)=O")),
    ("Hydrocortisone", "Corticosteroid", "C21H30O5",
     dict(C11="C(O)", C17="(O)", S="C(=O)CO")),
    ("Cortisone", "Corticosteroid", "C21H28O5",
     dict(C11="C(=O)", C17="(O)", S="C(=O)CO")),
    ("Prednisolone", "Corticosteroid", "C21H28O5",
     dict(A=DIEN, C11="C(O)", C17="(O)", S="C(=O)CO")),
    ("Methylprednisolone", "Corticosteroid", "C22H30O5",
     dict(A=DIEN, B="C(C)C", C11="C(O)", C17="(O)", S="C(=O)CO")),
    ("Dexamethasone", "Corticosteroid", "C22H29FO5",
     dict(A=DIEN, X9="(F)", C11="C(O)", C16="C(C)", C17="(O)", S="C(=O)CO")),
    ("Triamcinolone", "Corticosteroid", "C21H27FO6",
     dict(A=DIEN, X9="(F)", C11="C(O)", C16="C(O)", C17="(O)", S="C(=O)CO")),
    ("Fludrocortisone", "Corticosteroid", "C21H29FO5",
     dict(X9="(F)", C11="C(O)", C17="(O)", S="C(=O)CO")),
    ("Mometasone", "Corticosteroid", "C22H28Cl2O4",
     dict(A=DIEN, X9="(Cl)", C11="C(O)", C16="C(C)", C17="(O)", S="C(=O)CCl")),
    ("Clobetasol", "Corticosteroid", "C22H28ClFO4",
     dict(A=DIEN, X9="(F)", C11="C(O)", C16="C(C)", C17="(O)", S="C(=O)CCl")),
    ("Corticosterone", "Corticosteroid", "C21H30O4",
     dict(C11="C(O)", S="C(=O)CO")),
    ("Deoxycorticosterone", "Corticosteroid", "C21H30O3", dict(S="C(=O)CO")),
    ("Aldosterone", "Hormone", "C21H28O5",
     dict(C11="C(O)", C18="C=O", S="C(=O)CO")),
    ("Hydrocortisone 21-acetate", "Corticosteroid", "C23H32O6",
     dict(C11="C(O)", C17="(O)", S="C(=O)COC(C)=O")),
    ("Androstenedione", "Steroid", "C19H26O2", dict(C17="=O")),
    ("adrenosterone", "Steroid", "C19H24O3", dict(C11="C(=O)", C17="=O")),
    ("Ethisterone", "Steroid", "C21H28O2", dict(C17="(O)C#C")),
    ("Hydroxyprogesterone-17a", "Steroid", "C21H30O3",
     dict(C17="(O)", S="C(C)=O")),
    ("17a-Methyltestosterone", "Steroid", "C20H30O2", dict(C17="(C)O")),
    ("megestrol acetate", "Steroid", "C24H32O4",
     dict(B="C(C)=C", C17="(OC(=O)C)", S="C(C)=O")),
    ("Medrogestone", "Steroid", "C23H32O2",
     dict(B="C(C)=C", C17="(C)", S="C(C)=O")),
    ("norethindrone acetate", "Steroid", "C22H28O3",
     dict(C19="", C17="(OC(=O)C)C#C")),
    ("methyltestosterone acetate", "Steroid", "C22H32O3",
     dict(C17="(C)OC(=O)C")),
    ("Norethisterone", "Steroid", "C20H26O2", dict(C19="", C17="(O)C#C")),
    ("Stanolone", "Steroid", "C19H30O2", dict(A=SAT3ONE, C17="O")),
    ("Epiandrosterone", "Steroid", "C19H30O2", dict(A=SAT3OL, C17="=O")),
    ("pregnenolone", "Steroid", "C21H32O2",
     dict(A=SAT3OL, B="=CC", S="C(C)=O")),
    ("Prasterone", "Steroid", "C19H28O2",
     dict(A=SAT3OL, B="=CC", C17="=O")),

    ("Prednisone", "Corticosteroid", "C21H26O5",
     dict(A=DIEN, C11="C(=O)", C17="(O)", S="C(=O)CO")),
    ("Beclometasone", "Corticosteroid", "C22H29ClO5",
     dict(A=DIEN, X9="(Cl)", C11="C(O)", C16="C(C)", C17="(O)", S="C(=O)CO")),
    ("Alclometasone", "Corticosteroid", "C22H29ClO5",
     dict(A=DIEN, B="CC(Cl)", C11="C(O)", C16="C(C)", C17="(O)", S="C(=O)CO")),
    ("Flumethasone", "Corticosteroid", "C22H28F2O5",
     dict(A=DIEN, B="C(F)C", X9="(F)", C11="C(O)", C16="C(C)", C17="(O)",
          S="C(=O)CO")),
    ("Fluocinolone", "Corticosteroid", "C21H26F2O6",
     dict(A=DIEN, B="C(F)C", X9="(F)", C11="C(O)", C16="C(O)", C17="(O)",
          S="C(=O)CO")),
    ("Paramethasone", "Corticosteroid", "C22H29FO5",
     dict(A=DIEN, B="C(F)C", C11="C(O)", C16="C(C)", C17="(O)", S="C(=O)CO")),
    ("Desoximetasone", "Corticosteroid", "C22H29FO4",
     dict(A=DIEN, X9="(F)", C11="C(O)", C16="C(C)", S="C(=O)CO")),
    ("Fluorometholone", "Corticosteroid", "C22H29FO4",
     dict(A=DIEN, B="C(C)C", X9="(F)", C11="C(O)", C17="(O)", S="C(=O)C")),
    ("Medrysone", "Corticosteroid", "C22H32O3",
     dict(B="C(C)C", C11="C(O)", S="C(=O)C")),
    ("Fluprednisolone", "Corticosteroid", "C21H27FO5",
     dict(A=DIEN, B="C(F)C", C11="C(O)", C17="(O)", S="C(=O)CO")),
    ("Isoflupredone", "Corticosteroid", "C21H27FO5",
     dict(A=DIEN, X9="(F)", C11="C(O)", C17="(O)", S="C(=O)CO")),
    ("Meprednisone", "Corticosteroid", "C22H28O5",
     dict(A=DIEN, C11="C(=O)", C16="C(C)", C17="(O)", S="C(=O)CO")),
    ("Cortodoxone", "Corticosteroid", "C21H30O4",
     dict(C17="(O)", S="C(=O)CO")),
    ("Tixocortol", "Corticosteroid", "C21H30O4S",
     dict(C11="C(O)", C17="(O)", S="C(=O)CS")),
    ("Rimexolone", "Corticosteroid", "C24H34O3",
     dict(A=DIEN, C11="C(O)", C16="C(C)", C17="(C)", S="C(=O)CC")),
    ("Diflucortolone", "Corticosteroid", "C22H28F2O4",
     dict(A=DIEN, B="C(F)C", X9="(F)", C11="C(O)", C16="C(C)", S="C(=O)CO")),
    ("Fluocortolone", "Corticosteroid", "C22H29FO4",
     dict(A=DIEN, B="C(F)C", C11="C(O)", C16="C(C)", S="C(=O)CO")),
    ("Clocortolone", "Corticosteroid", "C22H28ClFO4",
     dict(A=DIEN, B="C(F)C", X9="(Cl)", C11="C(O)", C16="C(C)", S="C(=O)CO")),
    ("Halometasone", "Corticosteroid", "C22H27ClF2O5",
     dict(A="C=C(Cl)C(=O)C=C8", B="C(F)C", X9="(F)", C11="C(O)", C16="C(C)",
          C17="(O)", S="C(=O)CO")),
    ("Methylprednisolone acetate", "Corticosteroid", "C24H32O6",
     dict(A=DIEN, B="C(C)C", C11="C(O)", C17="(O)", S="C(=O)COC(C)=O")),
    ("Dexamethasone acetate", "Corticosteroid", "C24H31FO6",
     dict(A=DIEN, X9="(F)", C11="C(O)", C16="C(C)", C17="(O)",
          S="C(=O)COC(C)=O")),
    ("Betamethasone valerate", "Corticosteroid", "C27H37FO6",
     dict(A=DIEN, X9="(F)", C11="C(O)", C16="C(C)", C17="(OC(=O)CCCC)",
          S="C(=O)CO")),
    ("Clobetasol propionate", "Corticosteroid", "C25H32ClFO5",
     dict(A=DIEN, X9="(F)", C11="C(O)", C16="C(C)", C17="(OC(=O)CC)",
          S="C(=O)CCl")),
    ("Mometasone furoate", "Corticosteroid", "C27H30Cl2O6",
     dict(A=DIEN, X9="(Cl)", C11="C(O)", C16="C(C)", C17="(OC(=O)c7ccco7)",
          S="C(=O)CCl")),
    ("Fluticasone propionate", "Corticosteroid", "C25H31F3O5S",
     dict(A=DIEN, B="C(F)C", X9="(F)", C11="C(O)", C16="C(C)",
          C17="(OC(=O)CC)", S="C(=O)SCF")),
    ("Fluticasone furoate", "Corticosteroid", "C27H29F3O6S",
     dict(A=DIEN, B="C(F)C", X9="(F)", C11="C(O)", C16="C(C)",
          C17="(OC(=O)c7ccco7)", S="C(=O)SCF")),
    ("Hydrocortisone butyrate", "Corticosteroid", "C25H36O6",
     dict(C11="C(O)", C17="(OC(=O)CCC)", S="C(=O)CO")),
    ("Hydrocortisone valerate", "Corticosteroid", "C26H38O6",
     dict(C11="C(O)", C17="(OC(=O)CCCC)", S="C(=O)CO")),
    ("Prednicarbate", "Corticosteroid", "C27H36O8",
     dict(A=DIEN, C11="C(O)", C17="(OC(=O)OCC)", S="C(=O)COC(=O)CC")),
    ("Difluprednate", "Corticosteroid", "C27H34F2O7",
     dict(A=DIEN, B="C(F)C", X9="(F)", C11="C(O)", C17="(OC(=O)CCC)",
          S="C(=O)COC(C)=O")),

    ("Triamcinolone acetonide", "Corticosteroid", "C24H31FO6",
     dict(A=DIEN, X9="(F)", C11="C(O)", C16=ACETONIDE[0], C17=ACETONIDE[1],
          S="C(=O)CO")),
    ("Fluocinolone acetonide", "Corticosteroid", "C24H30F2O6",
     dict(A=DIEN, B="C(F)C", X9="(F)", C11="C(O)", C16=ACETONIDE[0],
          C17=ACETONIDE[1], S="C(=O)CO")),
    ("Fluocinonide", "Corticosteroid", "C26H32F2O7",
     dict(A=DIEN, B="C(F)C", X9="(F)", C11="C(O)", C16=ACETONIDE[0],
          C17=ACETONIDE[1], S="C(=O)COC(C)=O")),
    ("Desonide", "Corticosteroid", "C24H32O6",
     dict(A=DIEN, C11="C(O)", C16=ACETONIDE[0], C17=ACETONIDE[1],
          S="C(=O)CO")),
    ("Flunisolide", "Corticosteroid", "C24H31FO6",
     dict(A=DIEN, B="C(F)C", C11="C(O)", C16=ACETONIDE[0], C17=ACETONIDE[1],
          S="C(=O)CO")),
    ("Halcinonide", "Corticosteroid", "C24H32ClFO5",
     dict(X9="(F)", C11="C(O)", C16=ACETONIDE[0], C17=ACETONIDE[1],
          S="C(=O)CCl")),
    ("Amcinonide", "Corticosteroid", "C28H35FO7",
     dict(A=DIEN, X9="(F)", C11="C(O)", C16="C7",
          C17="(OC6(CCCC6)O7)", S="C(=O)COC(C)=O")),
    ("Budesonide", "Corticosteroid", "C25H34O6",
     dict(A=DIEN, C11="C(O)", C16="C7", C17="(OC(CCC)O7)", S="C(=O)CO")),
    ("Ciclesonide", "Corticosteroid", "C32H44O7",
     dict(A=DIEN, C11="C(O)", C16="C7", C17="(OC(C6CCCCC6)O7)",
          S="C(=O)COC(=O)C(C)C")),

    ("Medroxyprogesterone", "Progestin", "C22H32O3",
     dict(B="C(C)C", C17="(O)", S="C(C)=O")),
    ("Medroxyprogesterone acetate", "Progestin", "C24H34O4",
     dict(B="C(C)C", C17="(OC(=O)C)", S="C(C)=O")),
    ("Megestrol", "Progestin", "C22H30O3",
     dict(B="C(C)=C", C17="(O)", S="C(C)=O")),
    ("Chlormadinone", "Progestin", "C21H27ClO3",
     dict(B="C(Cl)=C", C17="(O)", S="C(C)=O")),
    ("Chlormadinone acetate", "Progestin", "C23H29ClO4",
     dict(B="C(Cl)=C", C17="(OC(=O)C)", S="C(C)=O")),
    ("Delmadinone acetate", "Progestin", "C23H27ClO4",
     dict(A=DIEN, B="C(Cl)=C", C17="(OC(=O)C)", S="C(C)=O")),
    ("Nomegestrol", "Progestin", "C21H28O3",
     dict(C19="", B="C(C)=C", C17="(O)", S="C(C)=O")),
    ("Nomegestrol acetate", "Progestin", "C23H30O4",
     dict(C19="", B="C(C)=C", C17="(OC(=O)C)", S="C(C)=O")),
    ("Dydrogesterone", "Progestin", "C21H28O2",
     dict(B="C=C", S="C(C)=O")),
    ("Hydroxyprogesterone acetate", "Progestin", "C23H32O4",
     dict(C17="(OC(=O)C)", S="C(C)=O")),
    ("Hydroxyprogesterone caproate", "Progestin", "C27H40O4",
     dict(C17="(OC(=O)CCCCC)", S="C(C)=O")),
    ("Dimethisterone", "Progestin", "C23H32O2", dict(B="C(C)C", C17="(O)C#CC")),
    ("Levonorgestrel", "Progestin", "C21H28O2",
     dict(C19="", C18="CC", C17="(O)C#C")),
    ("Etonogestrel", "Progestin", "C22H28O2",
     dict(C19="", C18="CC", C11="C(=C)", C17="(O)C#C")),
    ("Desogestrel", "Progestin", "C22H30O",
     dict(C19="", C18="CC", C11="C(=C)", A="CCCC=C8", C17="(O)C#C")),
    ("Norethandrolone", "Progestin", "C20H30O2",
     dict(C19="", C17="(O)CC")),
    ("Lynestrenol", "Progestin", "C20H28O",
     dict(C19="", A="CCCC=C8", C17="(O)C#C")),
    ("Allylestrenol", "Progestin", "C21H32O",
     dict(C19="", A="CCCC=C8", C17="(O)CC=C")),
    ("Ethylestrenol", "Progestin", "C20H32O",
     dict(C19="", A="CCCC=C8", C17="(O)CC")),

    ("Nandrolone", "Androgen", "C18H26O2", dict(C19="", C17="O")),
    ("Nandrolone decanoate", "Androgen", "C28H44O3",
     dict(C19="", C17="OC(=O)CCCCCCCCC")),
    ("Nandrolone phenylpropionate", "Androgen", "C27H34O3",
     dict(C19="", C17="OC(=O)CCc7ccccc7")),
    ("Norclostebol", "Androgen", "C18H25ClO2",
     dict(C19="", A="CCC(=O)C(Cl)=C8", C17="O")),
    ("Trestolone", "Androgen", "C19H28O2",
     dict(C19="", B="CC(C)", C17="O")),
    ("Boldenone", "Androgen", "C19H26O2", dict(A=DIEN, C17="O")),
    ("Boldione", "Androgen", "C19H24O2", dict(A=DIEN, C17="=O")),
    ("Methandienone", "Androgen", "C20H28O2", dict(A=DIEN, C17="(C)O")),
    ("Fluoxymesterone", "Androgen", "C20H29FO3",
     dict(X9="(F)", C11="C(O)", C17="(C)O")),
    ("Bolasterone", "Androgen", "C21H32O2", dict(B="CC(C)", C17="(C)O")),
    ("Clostebol", "Androgen", "C19H27ClO2",
     dict(A="CCC(=O)C(Cl)=C8", C17="O")),
    ("Mesterolone", "Androgen", "C20H32O2",
     dict(A="C(C)CC(=O)CC8", C17="O")),
    ("Drostanolone", "Androgen", "C20H32O2",
     dict(A="CC(C)C(=O)CC8", C17="O")),
    ("Oxandrolone", "Androgen", "C19H30O3",
     dict(A="COC(=O)CC8", C17="(C)O")),
    ("Oxymetholone", "Androgen", "C21H32O3",
     dict(A="CC(=CO)C(=O)CC8", C17="(C)O")),
    ("Androstanedione", "Androgen", "C19H28O2", dict(A=SAT3ONE, C17="=O")),
    ("Androstenediol", "Androgen", "C19H30O2",
     dict(A=SAT3OL, B="=CC", C17="O")),
    ("11-Ketotestosterone", "Androgen", "C19H26O3",
     dict(C11="C(=O)", C17="O")),
    ("11b-Hydroxytestosterone", "Androgen", "C19H28O3",
     dict(C11="C(O)", C17="O")),
    ("11-Ketodihydrotestosterone", "Androgen", "C19H28O3",
     dict(A=SAT3ONE, C11="C(=O)", C17="O")),
    ("Testosterone isocaproate", "Androgen", "C25H38O3",
     dict(C17="OC(=O)CCC(C)C")),
    ("Testosterone enanthate", "Androgen", "C26H40O3",
     dict(C17="OC(=O)CCCCCC")),
    ("Testosterone cypionate", "Androgen", "C27H40O3",
     dict(C17="OC(=O)CCC7CCCC7")),
    ("Testosterone phenylpropionate", "Androgen", "C28H36O3",
     dict(C17="OC(=O)CCc7ccccc7")),
    ("Testosterone undecanoate", "Androgen", "C30H48O3",
     dict(C17="OC(=O)CCCCCCCCCC")),

    ("Formestane", "Aromatase inhibitor", "C19H26O3",
     dict(A="CCC(=O)C(O)=C8", C17="=O")),
    ("Atamestane", "Aromatase inhibitor", "C20H26O2",
     dict(A="C=C(C)C(=O)C=C8", C17="=O")),
    ("Androstenetrione", "Aromatase inhibitor", "C19H24O3",
     dict(B="C(=O)C", C17="=O")),
    ("19-Norprogesterone", "Progestin", "C20H28O2",
     dict(C19="", S="C(C)=O")),
    ("Gestonorone", "Progestin", "C20H28O3",
     dict(C19="", C17="(O)", S="C(C)=O")),
    ("Gestonorone caproate", "Progestin", "C26H38O4",
     dict(C19="", C17="(OC(=O)CCCCC)", S="C(C)=O")),
    ("Segesterone", "Progestin", "C21H28O3",
     dict(C19="", C16="C(=C)", C17="(O)", S="C(C)=O")),
    ("Segesterone acetate", "Progestin", "C23H30O4",
     dict(C19="", C16="C(=C)", C17="(OC(=O)C)", S="C(C)=O")),
    ("Norgestomet", "Progestin", "C23H32O4",
     dict(C19="", C11="C(C)", C17="(OC(=O)C)", S="C(C)=O")),
    ("Norethisterone enanthate", "Progestin", "C27H38O3",
     dict(C19="", C17="(OC(=O)CCCCCC)C#C")),
    ("Etynodiol", "Progestin", "C20H28O2",
     dict(C19="", A="CCC(O)C=C8", C17="(O)C#C")),
    ("Etynodiol diacetate", "Progestin", "C24H32O4",
     dict(C19="", A="CCC(OC(=O)C)C=C8", C17="(OC(=O)C)C#C")),
    ("Norgestimate", "Progestin", "C23H31NO3",
     dict(C19="", C18="CC", A="CCC(=NO)C=C8", C17="(OC(=O)C)C#C")),
    ("Norelgestromin", "Progestin", "C21H29NO2",
     dict(C19="", C18="CC", A="CCC(=NO)C=C8", C17="(O)C#C")),
    ("Gestodene", "Progestin", "C21H26O2",
     dict(C19="", C18="CC", C15="C=", C17="(O)C#C")),
    ("Normethandrone", "Progestin", "C19H28O2",
     dict(C19="", C17="(C)O")),
    ("Dimethandrolone", "Progestin", "C20H30O2",
     dict(C19="", B="C(C)C", C11="C(C)", C17="O")),
    ("Trestolone acetate", "Progestin", "C21H30O3",
     dict(C19="", B="C(C)C", C17="OC(=O)C")),
    ("Melengestrol acetate", "Progestin", "C25H32O4",
     dict(B="C(C)=C", C16="C(=C)", C17="(OC(=O)C)", S="C(C)=O")),
    ("Clomegestone acetate", "Progestin", "C24H31ClO4",
     dict(B="C(Cl)=C", C16="C(C)", C17="(OC(=O)C)", S="C(C)=O")),
    ("Delmadinone", "Progestin", "C21H25ClO3",
     dict(A=DIEN, B="C(Cl)=C", C17="(O)", S="C(C)=O")),
    ("Hydroxyprogesterone enanthate", "Progestin", "C28H42O4",
     dict(C17="(OC(=O)CCCCCC)", S="C(C)=O")),
    ("Flugestone", "Progestin", "C21H29FO4",
     dict(X9="(F)", C11="C(O)", C17="(O)", S="C(C)=O")),
    ("Flugestone acetate", "Progestin", "C23H31FO5",
     dict(X9="(F)", C11="C(O)", C17="(OC(=O)C)", S="C(C)=O")),
    ("Anagestone", "Progestin", "C22H34O2",
     dict(A="CCCC=C8", B="C(C)C", C17="(O)", S="C(C)=O")),
    ("Anagestone acetate", "Progestin", "C24H36O3",
     dict(A="CCCC=C8", B="C(C)C", C17="(OC(=O)C)", S="C(C)=O")),
    ("5a-Dihydroprogesterone", "Progestin", "C21H32O2",
     dict(A=SAT3ONE, S="C(C)=O")),
    ("20a-Dihydroprogesterone", "Progestin", "C21H32O2",
     dict(S="C(C)O")),
    ("17a-Hydroxypregnenolone", "Steroid", "C21H32O3",
     dict(A=SAT3OL, B="=CC", C17="(O)", S="C(C)=O")),

    ("Androstenedione", "Androgen", "C19H26O2", dict(C17="=O")),
    ("19-Hydroxyandrostenedione", "Aromatase inhibitor", "C19H26O3",
     dict(C19="CO", C17="=O")),
    ("16a-Hydroxyandrostenedione", "Aromatase inhibitor", "C19H26O3",
     dict(C16="C(O)", C17="=O")),
    ("Androstadienedione", "Aromatase inhibitor", "C19H24O2",
     dict(B="C=C", C17="=O")),
    ("Androstatrienedione", "Aromatase inhibitor", "C19H22O2",
     dict(A=DIEN, B="C=C", C17="=O")),
    ("Minamestane", "Aromatase inhibitor", "C19H25NO2",
     dict(A="C=CC(=O)C(N)=C8", C17="=O")),
    ("Plomestane", "Aromatase inhibitor", "C21H26O2",
     dict(C19="CC#C", C17="=O")),
    ("4-Acetoxyandrostenedione", "Aromatase inhibitor", "C21H28O4",
     dict(A="CCC(=O)C(OC(=O)C)=C8", C17="=O")),
    ("6-Methyleneandrostenedione", "Aromatase inhibitor", "C20H26O2",
     dict(B="C(=C)C", C17="=O")),
]

ESTRANES = [
    ("Estradiol", "Steroid", "C18H24O2", dict(C17="O")),
    ("Estrone", "Steroid", "C18H22O2", dict(C17="=O")),
    ("Ethinylestradiol", "Steroid", "C20H24O2", dict(C17="(O)C#C")),
    ("estriol", "Steroid", "C18H24O3", dict(C16="C(O)", C17="O")),

    ("Mestranol", "Estrogen", "C21H26O2", dict(O3="CO", C17="(O)C#C")),
    ("Estradiol 3-methyl ether", "Estrogen", "C19H26O2",
     dict(O3="CO", C17="O")),
    ("Estradiol acetate", "Estrogen", "C20H26O3", dict(C17="OC(=O)C")),
    ("Estradiol valerate", "Estrogen", "C23H32O3",
     dict(C17="OC(=O)CCCC")),
    ("Estradiol enanthate", "Estrogen", "C25H36O3",
     dict(C17="OC(=O)CCCCCC")),
    ("Estradiol benzoate", "Estrogen", "C25H28O3",
     dict(C17="OC(=O)c7ccccc7")),
    ("Estradiol cypionate", "Estrogen", "C26H36O3",
     dict(C17="OC(=O)CCC7CCCC7")),
    ("Estradiol undecylate", "Estrogen", "C29H44O3",
     dict(C17="OC(=O)CCCCCCCCCC")),
    ("Estradiol dipropionate", "Estrogen", "C24H32O4",
     dict(O3="CCC(=O)O", C17="OC(=O)CC")),
    ("Estrone acetate", "Estrogen", "C20H24O3",
     dict(O3="CC(=O)O", C17="=O")),
    ("Quinestrol", "Estrogen", "C25H32O2",
     dict(O3="C7CCCC7O", C17="(O)C#C")),
    ("16a-Hydroxyestrone", "Estrogen", "C18H22O3",
     dict(C16="C(O)", C17="=O")),
    ("Estetrol", "Estrogen", "C18H24O4",
     dict(C15="C(O)", C16="C(O)", C17="O")),
    ("2-Hydroxyestradiol", "Estrogen", "C18H24O3",
     dict(C2="c(O)", C17="O")),
    ("2-Methoxyestradiol", "Estrogen", "C19H26O3",
     dict(C2="c(OC)", C17="O")),
    ("2-Methoxyestrone", "Estrogen", "C19H24O3",
     dict(C2="c(OC)", C17="=O")),
    ("4-Hydroxyestradiol", "Estrogen", "C18H24O3",
     dict(C4="O", C17="O")),
    ("4-Methoxyestradiol", "Estrogen", "C19H26O3",
     dict(C4="OC", C17="O")),
    ("Fulvestrant", "Antiestrogen", "C32H47F5O3S",
     dict(C7="C(CCCCCCCCCS(=O)CCCC(F)(F)C(F)(F)F)", C17="O")),
]

SINGLETONS = [
    ("Toremifene", "SERM", "C26H28ClNO",
     "ClCCC(=C(c1ccccc1)c1ccc(OCCN(C)C)cc1)c1ccccc1"),
    ("Clomifene", "SERM", "C26H28ClNO",
     "ClC(=C(c1ccccc1)c1ccc(OCCN(CC)CC)cc1)c1ccccc1"),
    ("Ospemifene", "SERM", "C24H23ClO2",
     "OCCOc1ccc(C(=C(CCCl)c2ccccc2)c2ccccc2)cc1"),
    ("Afimoxifene", "SERM", "C26H29NO2",
     "CCC(=C(c1ccccc1)c1ccc(OCCN(C)C)cc1)c1ccc(O)cc1"),
    ("Endoxifen", "SERM", "C25H27NO2",
     "CCC(=C(c1ccccc1)c1ccc(OCCNC)cc1)c1ccc(O)cc1"),
    ("Droloxifene", "SERM", "C26H29NO2",
     "CCC(=C(c1ccccc1)c1ccc(OCCN(C)C)cc1)c1cccc(O)c1"),
    ("Idoxifene", "SERM", "C28H30INO",
     "CCC(=C(c1ccccc1)c1ccc(OCCN2CCCC2)cc1)c1ccc(I)cc1"),
    ("Bazedoxifene", "SERM", "C30H34N2O3",
     "Cc1c(-c2ccc(O)cc2)n(Cc2ccc(OCCN3CCCCCC3)cc2)c2ccc(O)cc12"),
    ("Lasofoxifene", "SERM", "C28H31NO2",
     "Oc1ccc2c(c1)C(c1ccc(OCCN3CCCC3)cc1)C(c1ccccc1)CC2"),

    ("Benzestrol", "Synthetic estrogen", "C20H26O2",
     "CCC(c1ccc(O)cc1)C(CC)C(C)c1ccc(O)cc1"),
    ("Promethestrol", "Synthetic estrogen", "C20H26O2",
     "CCC(c1ccc(O)c(C)c1)C(CC)c1ccc(O)c(C)c1"),
    ("Dimestrol", "Synthetic estrogen", "C20H24O2",
     "CCC(=C(CC)c1ccc(OC)cc1)c1ccc(OC)cc1"),
    ("Chlorotrianisene", "Synthetic estrogen", "C23H21ClO3",
     "COc1ccc(C(=C(Cl)c2ccc(OC)cc2)c2ccc(OC)cc2)cc1"),
    ("Bisphenol S", "Synthetic estrogen", "C12H10O4S",
     "Oc1ccc(S(=O)(=O)c2ccc(O)cc2)cc1"),
    ("Bisphenol F", "Synthetic estrogen", "C13H12O2",
     "Oc1ccc(Cc2ccc(O)cc2)cc1"),
    ("Bisphenol AF", "Synthetic estrogen", "C15H10F6O2",
     "Oc1ccc(C(c2ccc(O)cc2)(C(F)(F)F)C(F)(F)F)cc1"),
    ("4-Nonylphenol", "Synthetic estrogen", "C15H24O",
     "CCCCCCCCCc1ccc(O)cc1"),
    ("4-Octylphenol", "Synthetic estrogen", "C14H22O",
     "CCCCCCCCc1ccc(O)cc1"),
    ("4-tert-Octylphenol", "Synthetic estrogen", "C14H22O",
     "CC(C)(C)CC(C)(C)c1ccc(O)cc1"),
    ("Zearalenone", "Phytoestrogen", "C18H22O5",
     "CC1CCCC(=O)CCCC=Cc2cc(O)cc(O)c2C(=O)O1"),
    ("Zeranol", "Phytoestrogen", "C18H26O5",
     "CC1CCCC(O)CCCCCc2cc(O)cc(O)c2C(=O)O1"),
    ("a-Zearalenol", "Phytoestrogen", "C18H24O5",
     "CC1CCCC(O)CCCC=Cc2cc(O)cc(O)c2C(=O)O1"),

    ("Daidzein", "Phytoestrogen", "C15H10O4",
     "O=c1c(-c2ccc(O)cc2)coc2cc(O)ccc12"),
    ("Formononetin", "Phytoestrogen", "C16H12O4",
     "COc1ccc(-c2coc3cc(O)ccc3c2=O)cc1"),
    ("Biochanin A", "Phytoestrogen", "C16H12O5",
     "COc1ccc(-c2coc3cc(O)cc(O)c3c2=O)cc1"),
    ("Glycitein", "Phytoestrogen", "C16H12O5",
     "COc1cc2occ(-c3ccc(O)cc3)c(=O)c2cc1O"),
    ("Prunetin", "Phytoestrogen", "C16H12O5",
     "COc1cc(O)c2c(=O)c(-c3ccc(O)cc3)coc2c1"),
    ("Equol", "Phytoestrogen", "C15H14O3",
     "Oc1ccc(C2COc3cc(O)ccc3C2)cc1"),
    ("Coumestrol", "Phytoestrogen", "C15H8O5",
     "O=c1oc2cc(O)ccc2c2oc3cc(O)ccc3c12"),
    ("Apigenin", "Phytoestrogen", "C15H10O5",
     "O=c1cc(-c2ccc(O)cc2)oc2cc(O)cc(O)c12"),
    ("Luteolin", "Phytoestrogen", "C15H10O6",
     "O=c1cc(-c2ccc(O)c(O)c2)oc2cc(O)cc(O)c12"),
    ("Chrysin", "Phytoestrogen", "C15H10O4",
     "O=c1cc(-c2ccccc2)oc2cc(O)cc(O)c12"),
    ("Kaempferol", "Phytoestrogen", "C15H10O6",
     "O=c1c(O)c(-c2ccc(O)cc2)oc2cc(O)cc(O)c12"),
    ("Naringenin", "Phytoestrogen", "C15H12O5",
     "O=C1CC(c2ccc(O)cc2)Oc2cc(O)cc(O)c21"),
    ("Liquiritigenin", "Phytoestrogen", "C15H12O4",
     "O=C1CC(c2ccc(O)cc2)Oc2cc(O)ccc21"),
    ("8-Prenylnaringenin", "Phytoestrogen", "C20H20O5",
     "CC(C)=CCc1c(O)cc(O)c2c1OC(c1ccc(O)cc1)CC2=O"),
    ("Enterolactone", "Phytoestrogen", "C18H18O4",
     "O=C1OCC(Cc2cccc(O)c2)C1Cc1cccc(O)c1"),
    ("Enterodiol", "Phytoestrogen", "C18H22O4",
     "OCC(Cc1cccc(O)c1)C(CO)Cc1cccc(O)c1"),

    ("Aminoglutethimide", "Aromatase inhibitor", "C13H16N2O2",
     "CCC1(c2ccc(N)cc2)CCC(=O)NC1=O"),
    ("Rogletimide", "Aromatase inhibitor", "C12H14N2O2",
     "CCC1(c2ccncc2)CCC(=O)NC1=O"),
    ("Fadrozole", "Aromatase inhibitor", "C14H13N3",
     "N#Cc1ccc(cc1)C1CCCc2cncn12"),
    ("Vorozole", "Aromatase inhibitor", "C16H13ClN6",
     "Cn1nnc2cc(C(c3ccc(Cl)cc3)n3cncn3)ccc21"),
    ("Testolactone", "Aromatase inhibitor", "C19H24O3",
     "CC12C=CC(=O)C=C1CCC1C2CCC2(C)OC(=O)CCC12"),
    ("Liarozole", "Aromatase inhibitor", "C17H13ClN4",
     "Clc1cccc(c1)C(n1ccnc1)c1ccc2[nH]cnc2c1"),
    ("Galangin", "Phytoestrogen", "C15H10O5",
     "O=c1c(O)c(-c2ccccc2)oc2cc(O)cc(O)c12"),
    ("7-Hydroxyflavone", "Phytoestrogen", "C15H10O3",
     "O=c1cc(-c2ccccc2)oc2cc(O)ccc12"),
    ("a-Naphthoflavone", "Aromatase inhibitor", "C19H12O2",
     "O=c1cc(-c2ccccc2)oc2c3ccccc3ccc12"),
    ("Baicalein", "Phytoestrogen", "C15H10O5",
     "O=c1cc(-c2ccccc2)oc2cc(O)c(O)c(O)c12"),
    ("Myricetin", "Phytoestrogen", "C15H10O8",
     "O=c1c(O)c(-c2cc(O)c(O)c(O)c2)oc2cc(O)cc(O)c12"),
    ("Hesperetin", "Phytoestrogen", "C16H14O6",
     "COc1ccc(C2CC(=O)c3c(O)cc(O)cc3O2)cc1O"),
    ("Phloretin", "Phytoestrogen", "C15H14O5",
     "O=C(CCc1ccc(O)cc1)c1c(O)cc(O)cc1O"),
    ("Isoliquiritigenin", "Phytoestrogen", "C15H12O4",
     "O=C(C=Cc1ccc(O)cc1)c1ccc(O)cc1O"),
    ("Econazole", "Aromatase inhibitor", "C18H15Cl3N2O",
     "Clc1ccc(COC(Cn2ccnc2)c2ccc(Cl)cc2Cl)cc1"),
    ("Sulconazole", "Aromatase inhibitor", "C18H15Cl3N2S",
     "Clc1ccc(CSC(Cn2ccnc2)c2ccc(Cl)cc2Cl)cc1"),
    ("Bifonazole", "Aromatase inhibitor", "C22H18N2",
     "c1ccc(cc1)c1ccc(cc1)C(n1ccnc1)c1ccccc1"),

    ("Enzalutamide", "Antiandrogen", "C21H16F4N4O2S",
     "CNC(=O)c1ccc(N2C(=O)N(c3ccc(C#N)c(C(F)(F)F)c3)C(C)(C)C2=S)cc1F"),
    ("Hydroxyflutamide", "Antiandrogen", "C11H11F3N2O4",
     "CC(C)(O)C(=O)Nc1ccc([N+](=O)[O-])c(C(F)(F)F)c1"),
    ("Cyproterone", "Antiandrogen", "C22H27ClO3",
     "CC(=O)C1(O)CCC2C3C=C(Cl)C4=CC(=O)C5CC5C4(C)C3CCC21C"),
    ("Cyproterone acetate", "Antiandrogen", "C24H29ClO4",
     "CC(=O)OC1(C(C)=O)CCC2C3C=C(Cl)C4=CC(=O)C5CC5C4(C)C3CCC21C"),
    ("Canrenone", "Antiandrogen", "C22H28O3",
     "CC12CCC(=O)C=C1C=CC1C2CCC2(C)C1CCC21CCC(=O)O1"),
    ("Galeterone", "Antiandrogen", "C26H32N2O",
     "CC12CCC(O)CC1=CCC1C2CCC2(C)C1CC=C2n1cnc2ccccc21"),

    ("Mifepristone", "Antiprogestin", "C29H35NO2",
     "CC#CC1(O)CCC2C3CCC4=CC(=O)CCC4=C3C(c3ccc(N(C)C)cc3)CC21C"),
    ("Ulipristal acetate", "Antiprogestin", "C30H37NO4",
     "CC(=O)OC1(C(C)=O)CCC2C3CCC4=CC(=O)CCC4=C3C(c3ccc(N(C)C)cc3)CC21C"),
]

ENTRY = re.compile(
    r"\{ name: '((?:\\.|[^'\\])*)', cls: '((?:\\.|[^'\\])*)', "
    r"formula: '((?:\\.|[^'\\])*)', smiles: '((?:\\.|[^'\\])*)'(?:, propertyOnly: true)? \}"
)


def build(template, defaults, overrides):
    slots = dict(defaults)
    slots.update(overrides)
    return template.format(**slots)


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
        [(row[0], row[1], row[2], build(STEROID, STEROID_SLOTS, row[3]))
         for row in STEROIDS]
        + [(row[0], row[1], row[2], build(ESTRANE, ESTRANE_SLOTS, row[3]))
           for row in ESTRANES]
        + [(row[0], row[1], row[2], row[3]) for row in SINGLETONS])

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
    sys.stderr.write("templates reproduced %d stored entries; %d new rows\n"
                     % (len(anchors), len(rows)))


if __name__ == "__main__":
    main()
