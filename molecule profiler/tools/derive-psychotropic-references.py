# Derives antipsychotic and antidepressant reference structures from
# scaffold templates that are first proven against entries data/library.js
# already stores.
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
# substituent on the wrong ring position, two isomeric alkyl groups swapped
# - so ring positions are written out in the slot tables and checked
# against the anchors.
#
# A prefix slot's last atom is the one that bonds to the following template
# atom, so a side chain is written from its far end inwards. Where a prefix
# ends in a branch, the atom carrying that branch is the attaching atom.
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

# 10H-phenothiazine. SIDE sits on N10 and P2 is the one substituted ring
# position, anchored by chlorpromazine, fluphenazine, thioridazine and
# perphenazine, which carry chloro, trifluoromethyl, methylthio and chloro
# there respectively.
PHENOTHIAZINE = "{SIDE}N9c1ccccc1Sc1cc{P2}cc19"

# 9H-thioxanthen-9-ylidene. SIDE ends at the carbon beta to the exocyclic
# double bond; the geometry of that bond is left unspecified.
THIOXANTHENE = "{SIDE}C=C9c1ccccc1Sc1cc{P2}cc19"

# 5H-dibenz[b,f]azepine and its 10,11 variants. BR is the two-atom bridge:
# CC for the dihydro series, C=C for the carbamazepine series.
DIBENZAZEPINE = "{SIDE}N9c1ccccc1{BR}c1cc{PX}cc19"

# 5H-dibenzo[a,d]cyclohepten-5-ylidene and the oxepine analogue. BR is the
# bridge; both flanking rings are unsubstituted in every member here, so the
# direction the bridge is written in does not change the molecule.
DIBENZOSUBERANE = "{SIDE}C=C9c1ccccc1{BR}c1ccccc19"

# 4-aryl-4-oxobutylamine. AR ends at the attaching aromatic carbon and AM
# starts at the amine nitrogen.
BUTYROPHENONE = "{AR}C(=O)CCC{AM}"

# 4,4-bis(aryl)butylamine, the diphenylbutylpiperidines. AM is a prefix
# ending at the amine nitrogen.
DPBP = "{AM}CCCC({AR1}){AR2}"

# dibenzo-fused seven-membered ring carrying an amine at position 11. HET is
# the ring heteroatom: N for the diazepines, O for the oxazepines, S for the
# thiazepines.
DIBENZAMINE = "{AM}C9=Nc1c{PX}ccc1{HET}c1ccccc19"

# benzamide core. atom1 carries the amide, atom2 the P2 substituent, then
# P3 P4 P5 P6 are ring positions 3 4 5 6 written as whole ring atoms.
BENZAMIDE = "{AM}NC(=O)c9c({P2}){P3}{P4}{P5}{P6}9"

DMAP = "CN(C)CCC"
DMAE = "CN(C)CC"
MPZP = "CN1CCN(CC1)CCC"
HEPZP = "OCCN1CCN(CC1)CCC"
TRIMEP = "CN(C)CC(C)C"
THIORIDYL = "CN1CCCCC1CC"
PYRROLIDINYLMETHYL = "CCN1CCCC1C"
DEAE = "CCN(CC)CC"

# name, cls, SIDE, P2, formula
PHENOTHIAZINES = [
    ("Chlorpromazine", "Phenothiazine", DMAP, "c(Cl)", "C17H19ClN2S"),
    ("Fluphenazine", "Phenothiazine", HEPZP, "c(C(F)(F)F)", "C22H26F3N3OS"),
    ("Thioridazine", "Phenothiazine", THIORIDYL, "c(SC)", "C21H26N2S2"),
    ("Perphenazine", "Phenothiazine", HEPZP, "c(Cl)", "C21H26ClN3OS"),
    ("Promethazine", "Phenothiazine", "CN(C)C(C)C", "c", "C17H20N2S"),

    ("Promazine", "Phenothiazine", DMAP, "c", "C17H20N2S"),
    ("Triflupromazine", "Phenothiazine", DMAP, "c(C(F)(F)F)", "C18H19F3N2S"),
    ("Levomepromazine", "Phenothiazine", TRIMEP, "c(OC)", "C19H24N2OS"),
    ("Alimemazine", "Phenothiazine", TRIMEP, "c", "C18H22N2S"),
    ("Cyamemazine", "Phenothiazine", TRIMEP, "c(C#N)", "C19H21N3S"),
    ("Propiomazine", "Phenothiazine", "CN(C)C(C)C", "c(C(=O)CC)", "C20H24N2OS"),
    ("Aceprometazine", "Phenothiazine", "CN(C)C(C)C", "c(C(C)=O)", "C19H22N2OS"),
    ("Fenethazine", "Phenothiazine", DMAE, "c", "C16H18N2S"),
    ("Diethazine", "Phenothiazine", DEAE, "c", "C18H22N2S"),
    ("Etymemazine", "Phenothiazine", TRIMEP, "c(CC)", "C20H26N2S"),
    ("Pecazine", "Phenothiazine", "CN1CCCC(C1)C", "c", "C19H22N2S"),
    ("Periciazine", "Phenothiazine", "OC1CCN(CC1)CCC", "c(C#N)", "C21H23N3OS"),
    ("Prochlorperazine", "Phenothiazine", MPZP, "c(Cl)", "C20H24ClN3S"),
    ("Trifluoperazine", "Phenothiazine", MPZP, "c(C(F)(F)F)", "C21H24F3N3S"),
    ("Perazine", "Phenothiazine", MPZP, "c", "C20H25N3S"),
    ("Thiethylperazine", "Phenothiazine", MPZP, "c(SCC)", "C22H29N3S2"),
    ("Thioproperazine", "Phenothiazine", MPZP, "c(S(=O)(=O)N(C)C)", "C22H30N4O2S2"),
    ("Butaperazine", "Phenothiazine", MPZP, "c(C(=O)CCC)", "C24H31N3OS"),
    ("Acetophenazine", "Phenothiazine", HEPZP, "c(C(C)=O)", "C23H29N3O2S"),
    ("Carphenazine", "Phenothiazine", HEPZP, "c(C(=O)CC)", "C24H31N3O2S"),
    ("Mesoridazine", "Phenothiazine", THIORIDYL, "c(S(C)=O)", "C21H26N2OS2"),
    ("Sulforidazine", "Phenothiazine", THIORIDYL, "c(S(C)(=O)=O)", "C21H26N2O2S2"),
    ("Northioridazine", "Phenothiazine", "N1CCCCC1CC", "c(SC)", "C20H24N2S2"),
    ("Nordazine", "Phenothiazine", "CNCCC", "c(Cl)", "C16H17ClN2S"),
    ("Didesmethylchlorpromazine", "Phenothiazine", "NCCC", "c(Cl)", "C15H15ClN2S"),
    ("Norpromazine", "Phenothiazine", "CNCCC", "c", "C16H18N2S"),
    ("Nortriflupromazine", "Phenothiazine", "CNCCC", "c(C(F)(F)F)", "C17H17F3N2S"),
    ("Norlevomepromazine", "Phenothiazine", "CNCC(C)C", "c(OC)", "C18H22N2OS"),
    ("Norpromethazine", "Phenothiazine", "CNC(C)C", "c", "C16H18N2S"),
    ("Moricizine", "Phenothiazine", "C1COCCN1CCC(=O)", "c(NC(=O)OCC)", "C22H25N3O4S"),

    ("10-(2-Dimethylaminoethyl)-2-chlorophenothiazine", "Phenothiazine", DMAE, "c(Cl)", "C16H17ClN2S"),
    ("10-(2-Dimethylaminoethyl)-2-methoxyphenothiazine", "Phenothiazine", DMAE, "c(OC)", "C17H20N2OS"),
    ("10-(3-Dimethylaminopropyl)-2-methoxyphenothiazine", "Phenothiazine", DMAP, "c(OC)", "C18H22N2OS"),
    ("10-(3-Dimethylaminopropyl)-2-methylthiophenothiazine", "Phenothiazine", DMAP, "c(SC)", "C18H22N2S2"),
    ("10-(3-Dimethylaminopropyl)-2-cyanophenothiazine", "Phenothiazine", DMAP, "c(C#N)", "C18H19N3S"),
    ("10-(3-Dimethylaminopropyl)-2-acetylphenothiazine", "Phenothiazine", DMAP, "c(C(C)=O)", "C19H22N2OS"),
    ("10-(3-Diethylaminopropyl)-2-chlorophenothiazine", "Phenothiazine", "CCN(CC)CCC", "c(Cl)", "C19H23ClN2S"),
    ("10-(3-Diethylaminopropyl)phenothiazine", "Phenothiazine", "CCN(CC)CCC", "c", "C19H24N2S"),
    ("10-(4-Methylpiperazin-1-ylpropyl)-2-methoxyphenothiazine", "Phenothiazine", MPZP, "c(OC)", "C21H27N3OS"),
    ("10-(4-Methylpiperazin-1-ylpropyl)-2-methylthiophenothiazine", "Phenothiazine", MPZP, "c(SC)", "C21H27N3S2"),
    ("10-(4-Hydroxyethylpiperazin-1-ylpropyl)phenothiazine", "Phenothiazine", HEPZP, "c", "C21H27N3OS"),
    ("10-(4-Hydroxyethylpiperazin-1-ylpropyl)-2-methoxyphenothiazine", "Phenothiazine", HEPZP, "c(OC)", "C22H29N3O2S"),
    ("10-(4-Hydroxypiperidin-1-ylpropyl)-2-chlorophenothiazine", "Phenothiazine", "OC1CCN(CC1)CCC", "c(Cl)", "C20H23ClN2OS"),
    ("10-(1-Methylpiperidin-2-ylethyl)phenothiazine", "Phenothiazine", THIORIDYL, "c", "C20H24N2S"),
    ("10-(1-Methylpiperidin-2-ylethyl)-2-chlorophenothiazine", "Phenothiazine", THIORIDYL, "c(Cl)", "C20H23ClN2S"),
    ("2-Trifluoromethyl-10-(1-methylpiperidin-2-ylethyl)phenothiazine", "Phenothiazine", THIORIDYL, "c(C(F)(F)F)", "C21H23F3N2S"),
]

# name, cls, SIDE, P2, formula
THIOXANTHENES = [
    ("Flupentixol", "Thioxanthene", "OCCN1CCN(CC1)CC", "c(C(F)(F)F)", "C23H25F3N2OS"),
    ("Zuclopenthixol", "Thioxanthene", "OCCN1CCN(CC1)CC", "c(Cl)", "C22H25ClN2OS"),

    ("Chlorprothixene", "Thioxanthene", DMAE, "c(Cl)", "C18H18ClNS"),
    ("Norchlorprothixene", "Thioxanthene", "CNCC", "c(Cl)", "C17H16ClNS"),
    ("Thiothixene", "Thioxanthene", "CN1CCN(CC1)CC", "c(S(=O)(=O)N(C)C)", "C23H29N3O2S2"),
    ("Prothixene", "Thioxanthene", DMAE, "c", "C18H19NS"),
    ("Clopenthixol hydroxyethyl analogue", "Thioxanthene", "OCCN1CCN(CC1)CC", "c", "C22H26N2OS"),
    ("2-Trifluoromethylchlorprothixene analogue", "Thioxanthene", DMAE, "c(C(F)(F)F)", "C19H18F3NS"),
]

# name, cls, SIDE, BR, PX, formula
DIBENZAZEPINES = [
    ("Imipramine", "Tricyclic antidepressant", DMAP, "CC", "c", "C19H24N2"),
    ("Desipramine", "Tricyclic antidepressant", "CNCCC", "CC", "c", "C18H22N2"),
    ("Clomipramine", "Tricyclic antidepressant", DMAP, "CC", "c(Cl)", "C19H23ClN2"),
    ("Trimipramine", "Tricyclic antidepressant", TRIMEP, "CC", "c", "C20H26N2"),

    ("Norclomipramine", "Tricyclic antidepressant", "CNCCC", "CC", "c(Cl)", "C18H21ClN2"),
    ("Didesmethylimipramine", "Tricyclic antidepressant", "NCCC", "CC", "c", "C17H20N2"),
    ("Nortrimipramine", "Tricyclic antidepressant", "CNCC(C)C", "CC", "c", "C19H24N2"),
    ("Opipramol", "Tricyclic antidepressant", HEPZP, "C=C", "c", "C23H29N3O"),
    ("Lofepramine", "Tricyclic antidepressant", "Clc1ccc(cc1)C(=O)CN(C)CCC", "CC", "c", "C26H27ClN2O"),
    ("Depramine", "Tricyclic antidepressant", DMAE, "CC", "c", "C18H22N2"),
    ("Clodesipramine", "Tricyclic antidepressant", "NCCC", "CC", "c(Cl)", "C17H19ClN2"),
    ("10,11-Dehydroimipramine", "Tricyclic antidepressant", DMAP, "C=C", "c", "C19H22N2"),
]

# name, cls, SIDE, BR, formula
DIBENZOSUBERANES = [
    ("Amitriptyline", "Tricyclic antidepressant", DMAE, "CC", "C20H23N"),
    ("Doxepin", "Tricyclic antidepressant", DMAE, "CO", "C19H21NO"),

    ("Nortriptyline", "Tricyclic antidepressant", "CNCC", "CC", "C19H21N"),
    ("Desmethyldoxepin", "Tricyclic antidepressant", "CNCC", "CO", "C18H19NO"),
    ("Cyclobenzaprine", "Tricyclic antidepressant", DMAE, "C=C", "C20H21N"),
    ("Butriptyline", "Tricyclic antidepressant", "CN(C)CC(C)", "CC", "C21H25N"),
    ("Didesmethylamitriptyline", "Tricyclic antidepressant", "NCC", "CC", "C18H19N"),
    ("Dibenzepin ring analogue", "Tricyclic antidepressant", DMAP, "CC", "C21H25N"),
]

# name, cls, AR, AM, formula
BUTYROPHENONES = [
    ("Haloperidol", "Butyrophenone", "Fc1ccc(cc1)", "N1CCC(O)(c2ccc(Cl)cc2)CC1", "C21H23ClFNO2"),
    ("Bromperidol", "Butyrophenone", "Fc1ccc(cc1)", "N1CCC(O)(c2ccc(Br)cc2)CC1", "C21H23BrFNO2"),
    ("Trifluperidol", "Butyrophenone", "Fc1ccc(cc1)", "N1CCC(O)(c2cccc(C(F)(F)F)c2)CC1", "C22H23F4NO2"),
    ("Moperone", "Butyrophenone", "Fc1ccc(cc1)", "N1CCC(O)(c2ccc(C)cc2)CC1", "C22H26FNO2"),
    ("Melperone", "Butyrophenone", "Fc1ccc(cc1)", "N1CCC(C)CC1", "C16H22FNO"),
    ("Benperidol", "Butyrophenone", "Fc1ccc(cc1)", "N1CCC(n2c(=O)[nH]c3ccccc32)CC1", "C22H24FN3O2"),
    ("Spiperone", "Butyrophenone", "Fc1ccc(cc1)", "N1CCC2(CC1)C(=O)NCN2c1ccccc1", "C23H26FN3O2"),
    ("Pipamperone", "Butyrophenone", "Fc1ccc(cc1)", "N1CCC(C(N)=O)(N2CCCCC2)CC1", "C21H30FN3O2"),

    ("Azaperone", "Butyrophenone", "Fc1ccc(cc1)", "N1CCN(CC1)c1ccccn1", "C19H22FN3O"),
    ("Fluanisone", "Butyrophenone", "Fc1ccc(cc1)", "N1CCN(CC1)c1ccccc1OC", "C21H25FN2O2"),
    ("Timiperone", "Butyrophenone", "Fc1ccc(cc1)", "N1CCC(n2c(=S)[nH]c3ccccc32)CC1", "C22H24FN3OS"),
    ("Clofluperol", "Butyrophenone", "Fc1ccc(cc1)", "N1CCC(O)(c2ccc(Cl)c(F)c2)CC1", "C21H22ClF2NO2"),
    ("Chlorophenyl melperone analogue", "Butyrophenone", "Clc1ccc(cc1)", "N1CCC(C)CC1", "C16H22ClNO"),
    ("Phenyl haloperidol analogue", "Butyrophenone", "c1ccccc1", "N1CCC(O)(c2ccc(Cl)cc2)CC1", "C21H24ClNO2"),
    ("Methoxyphenyl haloperidol analogue", "Butyrophenone", "COc1ccc(cc1)", "N1CCC(O)(c2ccc(Cl)cc2)CC1", "C22H26ClNO3"),
    ("Thienyl haloperidol analogue", "Butyrophenone", "c1ccsc1", "N1CCC(O)(c2ccc(Cl)cc2)CC1", "C19H22ClNO2S"),
    ("4-Phenylpiperazine butyrophenone", "Butyrophenone", "Fc1ccc(cc1)", "N1CCN(CC1)c1ccccc1", "C20H23FN2O"),
    ("4-Hydroxy-4-phenylpiperidine butyrophenone", "Butyrophenone", "Fc1ccc(cc1)", "N1CCC(O)(c2ccccc2)CC1", "C21H24FNO2"),
    ("4-Benzimidazolonylpiperidine phenyl ketone", "Butyrophenone", "c1ccccc1", "N1CCC(n2c(=O)[nH]c3ccccc32)CC1", "C22H25N3O2"),
    ("Piperidine butyrophenone", "Butyrophenone", "Fc1ccc(cc1)", "N1CCCCC1", "C15H20FNO"),
    ("Morpholine butyrophenone", "Butyrophenone", "Fc1ccc(cc1)", "N1CCOCC1", "C14H18FNO2"),
    ("Dimethylamino butyrophenone", "Butyrophenone", "Fc1ccc(cc1)", "N(C)C", "C12H16FNO"),
]

# name, cls, AM, AR1, AR2, formula
DPBPS = [
    ("Pimozide", "Diphenylbutylpiperidine", "O=c1[nH]c2ccccc2n1C1CCN(CC1)", "c1ccc(F)cc1", "c1ccc(F)cc1", "C28H29F2N3O"),
    ("Penfluridol", "Diphenylbutylpiperidine", "OC1(c2ccc(Cl)c(C(F)(F)F)c2)CCN(CC1)", "c1ccc(F)cc1", "c1ccc(F)cc1", "C28H27ClF5NO"),
    ("Fluspirilene", "Diphenylbutylpiperidine", "O=C1NCN(c2ccccc2)C12CCN(CC2)", "c1ccc(F)cc1", "c1ccc(F)cc1", "C29H31F2N3O"),

    ("Clopimozide", "Diphenylbutylpiperidine", "O=c1[nH]c2cc(Cl)ccc2n1C1CCN(CC1)", "c1ccc(F)cc1", "c1ccc(F)cc1", "C28H28ClF2N3O"),
    ("Deshalo pimozide analogue", "Diphenylbutylpiperidine", "O=c1[nH]c2ccccc2n1C1CCN(CC1)", "c1ccccc1", "c1ccccc1", "C28H31N3O"),
    ("4-Hydroxy-4-phenylpiperidine diphenylbutyl analogue", "Diphenylbutylpiperidine", "OC1(c2ccccc2)CCN(CC1)", "c1ccc(F)cc1", "c1ccc(F)cc1", "C27H29F2NO"),
    ("Benzimidazolone diphenylbutylpiperidine", "Diphenylbutylpiperidine", "O=c1[nH]c2ccccc2n1C1CCN(CC1)", "c1ccc(Cl)cc1", "c1ccc(Cl)cc1", "C28H29Cl2N3O"),
]

# name, cls, AM, PX, HET, formula
DIBENZAMINES = [
    ("Clozapine", "Dibenzazepine antipsychotic", "CN1CCN(CC1)", "c(Cl)", "N", "C18H19ClN4"),
    ("Loxapine", "Dibenzazepine antipsychotic", "CN1CCN(CC1)", "c(Cl)", "O", "C18H18ClN3O"),
    ("Quetiapine", "Dibenzazepine antipsychotic", "OCCOCCN1CCN(CC1)", "c", "S", "C21H25N3O2S"),

    ("Amoxapine", "Dibenzazepine antipsychotic", "C1CN(CCN1)", "c(Cl)", "O", "C17H16ClN3O"),
    ("Clotiapine", "Dibenzazepine antipsychotic", "CN1CCN(CC1)", "c(Cl)", "S", "C18H18ClN3S"),
    ("Deschloroclozapine", "Dibenzazepine antipsychotic", "CN1CCN(CC1)", "c", "N", "C18H20N4"),
    ("Deschloroloxapine", "Dibenzazepine antipsychotic", "CN1CCN(CC1)", "c", "O", "C18H19N3O"),
    ("Deschloroclotiapine", "Dibenzazepine antipsychotic", "CN1CCN(CC1)", "c", "S", "C18H19N3S"),
    ("Norquetiapine", "Dibenzazepine antipsychotic", "C1CN(CCN1)", "c", "S", "C17H17N3S"),
    ("Hydroxyethyl clozapine analogue", "Dibenzazepine antipsychotic", "OCCN1CCN(CC1)", "c(Cl)", "N", "C19H21ClN4O"),
    ("Hydroxyethyl loxapine analogue", "Dibenzazepine antipsychotic", "OCCN1CCN(CC1)", "c(Cl)", "O", "C19H20ClN3O2"),
    ("Piperidinyl loxapine analogue", "Dibenzazepine antipsychotic", "C1CCN(CC1)", "c(Cl)", "O", "C18H17ClN2O"),
]

# name, cls, AM, P2, P3, P4, P5, P6, formula
BENZAMIDES = [
    ("Sulpiride", "Benzamide antipsychotic", PYRROLIDINYLMETHYL, "OC", "c", "c", "c(S(N)(=O)=O)", "c", "C15H23N3O4S"),
    ("Amisulpride", "Benzamide antipsychotic", PYRROLIDINYLMETHYL, "OC", "c", "c(N)", "c(S(=O)(=O)CC)", "c", "C17H27N3O4S"),
    ("Remoxipride", "Benzamide antipsychotic", PYRROLIDINYLMETHYL, "OC", "c(Br)", "c", "c", "c(OC)", "C16H23BrN2O3"),

    ("Sultopride", "Benzamide antipsychotic", PYRROLIDINYLMETHYL, "OC", "c", "c", "c(S(=O)(=O)CC)", "c", "C17H26N2O4S"),
    ("Tiapride", "Benzamide antipsychotic", DEAE, "OC", "c", "c", "c(S(C)(=O)=O)", "c", "C15H24N2O4S"),
    ("Raclopride", "Benzamide antipsychotic", PYRROLIDINYLMETHYL, "O", "c(Cl)", "c", "c(Cl)", "c(OC)", "C15H20Cl2N2O3"),
    ("Bromopride", "Benzamide antipsychotic", DEAE, "OC", "c", "c(N)", "c(Br)", "c", "C14H22BrN3O2"),
    ("Desethylsulpiride", "Benzamide antipsychotic", "N1CCCC1C", "OC", "c", "c", "c(S(N)(=O)=O)", "c", "C13H19N3O4S"),
    ("Sulpiride methylsulfonyl analogue", "Benzamide antipsychotic", PYRROLIDINYLMETHYL, "OC", "c", "c", "c(S(C)(=O)=O)", "c", "C16H24N2O4S"),
    ("Aminosulpiride", "Benzamide antipsychotic", PYRROLIDINYLMETHYL, "OC", "c", "c(N)", "c(S(N)(=O)=O)", "c", "C15H24N4O4S"),
    ("Chlorosulpiride analogue", "Benzamide antipsychotic", PYRROLIDINYLMETHYL, "OC", "c", "c", "c(Cl)", "c", "C15H21ClN2O2"),
    ("Dimethoxy benzamide antipsychotic", "Benzamide antipsychotic", PYRROLIDINYLMETHYL, "OC", "c(OC)", "c", "c", "c", "C16H24N2O3"),
]


def flat(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    Chem.RemoveStereochemistry(mol)
    return Chem.MolToSmiles(mol)


def build():
    rows = []
    for name, cls, side, p2, formula in PHENOTHIAZINES:
        rows.append((name, cls, formula, PHENOTHIAZINE.format(SIDE=side, P2=p2)))
    for name, cls, side, p2, formula in THIOXANTHENES:
        rows.append((name, cls, formula, THIOXANTHENE.format(SIDE=side, P2=p2)))
    for name, cls, side, br, px, formula in DIBENZAZEPINES:
        rows.append((name, cls, formula, DIBENZAZEPINE.format(SIDE=side, BR=br, PX=px)))
    for name, cls, side, br, formula in DIBENZOSUBERANES:
        rows.append((name, cls, formula, DIBENZOSUBERANE.format(SIDE=side, BR=br)))
    for name, cls, ar, am, formula in BUTYROPHENONES:
        rows.append((name, cls, formula, BUTYROPHENONE.format(AR=ar, AM=am)))
    for name, cls, am, ar1, ar2, formula in DPBPS:
        rows.append((name, cls, formula, DPBP.format(AM=am, AR1=ar1, AR2=ar2)))
    for name, cls, am, px, het, formula in DIBENZAMINES:
        rows.append((name, cls, formula, DIBENZAMINE.format(AM=am, PX=px, HET=het)))
    for name, cls, am, p2, p3, p4, p5, p6, formula in BENZAMIDES:
        rows.append((name, cls, formula, BENZAMIDE.format(AM=am, P2=p2, P3=p3, P4=p4, P5=p5, P6=p6)))
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--output", default="-")
    args = ap.parse_args()

    source = open(os.path.join(ROOT, "data", "library.js"), encoding="utf-8").read()
    stored = {}
    for name, cls, formula, smiles in ENTRY.findall(source):
        stored[name] = (formula, smiles.replace("\\\\", "\\"))

    seen = {}
    for name, value in stored.items():
        key = flat(value[1])
        if key is not None:
            seen[key] = name

    failures = []
    anchors = []
    emitted = []

    for name, cls, formula, smiles in build():
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            failures.append("%s: constructed SMILES does not parse: %s" % (name, smiles))
            continue
        computed = CalcMolFormula(mol)
        canonical = Chem.MolToSmiles(mol)
        if computed != formula:
            failures.append(
                "%s: stated formula %s but structure is %s (%s)" % (name, formula, computed, canonical)
            )
            continue
        if any(atom.GetNumRadicalElectrons() for atom in mol.GetAtoms()):
            failures.append("%s: constructed structure carries a radical: %s" % (name, canonical))
            continue

        key = flat(smiles)
        if name in stored:
            stored_formula, stored_smiles = stored[name]
            stored_key = flat(stored_smiles)
            if stored_key is None:
                failures.append("%s: stored SMILES does not parse: %s" % (name, stored_smiles))
            elif stored_key != key:
                failures.append(
                    "%s: template gives %s but the library stores %s" % (name, key, stored_key)
                )
            elif stored_formula != formula:
                failures.append(
                    "%s: stated formula %s but the library stores %s" % (name, formula, stored_formula)
                )
            else:
                anchors.append(name)
            continue

        if key in seen:
            failures.append(
                "%s: same structure as %s (%s)" % (name, seen[key], key)
            )
            continue
        seen[key] = name
        emitted.append((name, cls, formula, canonical))

    if failures:
        for line in failures:
            sys.stderr.write("FAIL %s\n" % line)
        raise SystemExit(1)

    text = "".join(
        "  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n" % row for row in emitted
    )
    if args.output == "-":
        sys.stdout.write(text)
    else:
        open(args.output, "w", encoding="utf-8").write(text)

    sys.stderr.write(
        "templates reproduced %d stored entries (%s); %d new rows\n"
        % (len(anchors), ", ".join(anchors), len(emitted))
    )


if __name__ == "__main__":
    main()
