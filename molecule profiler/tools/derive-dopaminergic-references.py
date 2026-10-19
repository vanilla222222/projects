"""Build dopaminergic reference structures by substitution on verified parent scaffolds.

Run: python tools/derive-dopaminergic-references.py [--output rows.js]

Same discipline as tools/derive-opioid-references.py. Each family is written as a
substituent pattern on one template, and every template is validated first by
regenerating a compound the library already stores and requiring a canonical-SMILES
match, so a template error fails the run instead of propagating into new rows. The
anchors are Haloperidol for the butyrophenones, Sulpiride and Amisulpride for the
substituted benzamides, Cocaine for the tropanes, and Mephedrone for the cathinones.

Each compound then carries an independently stated molecular formula, which RDKit checks
against the formula computed from the constructed structure. Agreement between the two
recalls is evidence of consistency, not proof of identity: it cannot catch an error that
leaves the formula unchanged, which for these scaffolds means a substituent placed on the
wrong ring position.

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

# {C4A} and {C4B} are the piperidine 4-substituents, {NSUB} the nitrogen chain.
# Ring 9 keeps the piperidine closure clear of the substituent rings.
BUTYROPHENONE = "{C4A}C9{C4B}CCN({NSUB})CC9"

FLUOROBUTYROPHENONE = "CCCC(=O)c1ccc(F)cc1"
BENZIMIDAZOLONE = "O=C1Nc2ccccc2N1"

# name, C4 first substituent, C4 second substituent, N chain, stated formula
BUTYROPHENONES = [
    ("Haloperidol", "O", "c1ccc(Cl)cc1", FLUOROBUTYROPHENONE, "C21H23ClFNO2"),

    ("Bromperidol", "O", "c1ccc(Br)cc1", FLUOROBUTYROPHENONE, "C21H23BrFNO2"),
    ("Trifluperidol", "O", "c1cccc(C(F)(F)F)c1", FLUOROBUTYROPHENONE, "C22H23F4NO2"),
    ("Moperone", "O", "c1ccc(C)cc1", FLUOROBUTYROPHENONE, "C22H26FNO2"),
    ("Melperone", "C", "", FLUOROBUTYROPHENONE, "C16H22FNO"),
    ("Benperidol", BENZIMIDAZOLONE, "", FLUOROBUTYROPHENONE, "C22H24FN3O2"),
    ("Haloperidol reduced", "O", "c1ccc(Cl)cc1",
     "CCCC(O)c1ccc(F)cc1", "C21H25ClFNO2"),
    ("4-Fluorophenyl haloperidol analogue", "O", "c1ccc(F)cc1",
     FLUOROBUTYROPHENONE, "C21H23F2NO2"),
]

# {R2} to {R6} are the benzamide ring substituents, {AMINE} the amide side chain,
# written so that its last atom carries the amide nitrogen.
BENZAMIDE = "{AMINE}NC(=O)c1c{R2}c{R3}c{R4}c{R5}c1{R6}"

PYRROLIDINYLMETHYL = "CCN1CCCC1C"
DIETHYLAMINOETHYL = "CCN(CC)CC"

# name, amine, R2, R3, R4, R5, R6, stated formula
BENZAMIDES = [
    ("Sulpiride", PYRROLIDINYLMETHYL, "(OC)", "", "", "(S(N)(=O)=O)", "", "C15H23N3O4S"),
    ("Amisulpride", PYRROLIDINYLMETHYL, "(OC)", "", "(N)", "(S(=O)(=O)CC)", "",
     "C17H27N3O4S"),

    ("Sultopride", PYRROLIDINYLMETHYL, "(OC)", "", "", "(S(=O)(=O)CC)", "",
     "C17H26N2O4S"),
    ("Tiapride", DIETHYLAMINOETHYL, "(OC)", "", "", "(S(C)(=O)=O)", "", "C15H24N2O4S"),
    ("Raclopride", PYRROLIDINYLMETHYL, "(O)", "(Cl)", "", "(Cl)", "(OC)",
     "C15H20Cl2N2O3"),
    ("Eticlopride", PYRROLIDINYLMETHYL, "(O)", "(Cl)", "", "(CC)", "(OC)",
     "C17H25ClN2O3"),
    ("Remoxipride", PYRROLIDINYLMETHYL, "(OC)", "(Br)", "", "", "(OC)", "C16H23BrN2O3"),
    ("Nemonapride", "C1CN(Cc2ccccc2)C(C)C1", "(OC)", "", "(NC)", "(Cl)", "",
     "C21H26ClN3O2"),
    ("Clebopride", "C1CCN(Cc2ccccc2)CC1", "(OC)", "", "(N)", "(Cl)", "",
     "C20H24ClN3O2"),
    ("Metoclopramide", DIETHYLAMINOETHYL, "(OC)", "", "(N)", "(Cl)", "",
     "C14H22ClN3O2"),
]

# {N} the tropane nitrogen, {C2} the 2-substituent, {C3} the 3-substituent.
TROPANE = "{N}1C2CCC1C{C2}{C3}C2"

BENZOYLOXY = "C(OC(=O)c1ccccc1)"

# name, N-substituent, C2 substituent, C3 fragment, stated formula
TROPANES = [
    ("Cocaine", "CN", "C(=O)OC", BENZOYLOXY, "C17H21NO4"),

    ("Cocaethylene", "CN", "C(=O)OCC", BENZOYLOXY, "C18H23NO4"),
    ("Norcocaine", "N", "C(=O)OC", BENZOYLOXY, "C16H19NO4"),
    ("Benzoylecgonine", "CN", "C(=O)O", BENZOYLOXY, "C16H19NO4"),
    ("Ecgonine methyl ester", "CN", "C(=O)OC", "C(O)", "C10H17NO3"),
    ("Ecgonine", "CN", "C(=O)O", "C(O)", "C9H15NO3"),
    ("Troparil", "CN", "C(=O)OC", "C(c1ccccc1)", "C16H21NO2"),
    ("Beta-CFT", "CN", "C(=O)OC", "C(c1ccc(F)cc1)", "C16H20FNO2"),
    ("RTI-31", "CN", "C(=O)OC", "C(c1ccc(Cl)cc1)", "C16H20ClNO2"),
    ("RTI-32", "CN", "C(=O)OC", "C(c1ccc(C)cc1)", "C17H23NO2"),
    ("RTI-55", "CN", "C(=O)OC", "C(c1ccc(I)cc1)", "C16H20INO2"),
    ("Dichloropane", "CN", "C(=O)OC", "C(c1ccc(Cl)c(Cl)c1)", "C16H19Cl2NO2"),
    ("Tropacocaine", "CN", "", BENZOYLOXY, "C15H19NO2"),
    ("Nortropacocaine", "N", "", BENZOYLOXY, "C14H17NO2"),
]

# {AMINE} the amine, written so its last atom carries the bond to the alpha carbon,
# {ALPHA} the alpha-alkyl chain, {ARYL} the aroyl ring.
CATHINONE = "{AMINE}C({ALPHA})C(=O){ARYL}"

PYRROLIDINE = "N1CCCC1"
PHENYL = "c1ccccc1"
METHYLENEDIOXYPHENYL = "c1ccc2OCOc2c1"
TOLYL = "c1ccc(C)cc1"

# name, amine, alpha chain, aroyl ring, stated formula
CATHINONES = [
    ("Mephedrone", "CN", "C", TOLYL, "C11H15NO"),

    ("Cathinone", "N", "C", PHENYL, "C9H11NO"),
    ("Methcathinone", "CN", "C", PHENYL, "C10H13NO"),
    ("Ethcathinone", "CCN", "C", PHENYL, "C11H15NO"),
    ("3-Methylmethcathinone", "CN", "C", "c1cccc(C)c1", "C11H15NO"),
    ("4-Methylethcathinone", "CCN", "C", TOLYL, "C12H17NO"),
    ("4-Fluoromethcathinone", "CN", "C", "c1ccc(F)cc1", "C10H12FNO"),
    ("4-Chloromethcathinone", "CN", "C", "c1ccc(Cl)cc1", "C10H12ClNO"),
    ("Buphedrone", "CN", "CC", PHENYL, "C11H15NO"),
    ("Pentedrone", "CN", "CCC", PHENYL, "C12H17NO"),
    ("Hexedrone", "CN", "CCCC", PHENYL, "C13H19NO"),
    ("Amfepramone", "CCN(CC)", "C", PHENYL, "C13H19NO"),
    ("Methylone", "CN", "C", METHYLENEDIOXYPHENYL, "C11H13NO3"),
    ("Ethylone", "CCN", "C", METHYLENEDIOXYPHENYL, "C12H15NO3"),
    ("Butylone", "CN", "CC", METHYLENEDIOXYPHENYL, "C12H15NO3"),
    ("Eutylone", "CCN", "CC", METHYLENEDIOXYPHENYL, "C13H17NO3"),
    ("Pentylone", "CN", "CCC", METHYLENEDIOXYPHENYL, "C13H17NO3"),
    ("N-Ethylpentylone", "CCN", "CCC", METHYLENEDIOXYPHENYL, "C14H19NO3"),
    ("Dimethylone", "CN(C)", "C", METHYLENEDIOXYPHENYL, "C12H15NO3"),
    ("Dibutylone", "CN(C)", "CC", METHYLENEDIOXYPHENYL, "C13H17NO3"),
    ("Alpha-PPP", PYRROLIDINE, "C", PHENYL, "C13H17NO"),
    ("Alpha-PBP", PYRROLIDINE, "CC", PHENYL, "C14H19NO"),
    ("Alpha-PVP", PYRROLIDINE, "CCC", PHENYL, "C15H21NO"),
    ("Alpha-PHP", PYRROLIDINE, "CCCC", PHENYL, "C16H23NO"),
    ("4-Methyl-alpha-PPP", PYRROLIDINE, "C", TOLYL, "C14H19NO"),
    ("Pyrovalerone", PYRROLIDINE, "CCC", TOLYL, "C16H23NO"),
    ("MDPV", PYRROLIDINE, "CCC", METHYLENEDIOXYPHENYL, "C16H21NO3"),
    ("MDPPP", PYRROLIDINE, "C", METHYLENEDIOXYPHENYL, "C14H17NO3"),
    ("Naphyrone", PYRROLIDINE, "CCC", "c1ccc2ccccc2c1", "C19H23NO"),
]

# 1-phenyl-2,3,4,5-tetrahydro-1H-3-benzazepines. {R7} and {R8} are the catechol
# positions, {R6} the position next to the C5 methylene, {N3} the nitrogen
# substituent and {ARYL} the C1 aryl ring.
BENZAZEPINE = "{R7}c1c{R6}c2CCN{N3}CC({ARYL})c2cc1{R8}"

# name, R7, R6, N-substituent, C1 aryl, R8, stated formula
BENZAZEPINES = [
    ("SKF-38393", "O", "", "", PHENYL, "O", "C16H17NO2"),
    ("SCH-23390", "Cl", "", "C", PHENYL, "O", "C17H18ClNO"),
    ("Fenoldopam", "O", "(Cl)", "", "c1ccc(O)cc1", "O", "C16H16ClNO3"),
    ("SKF-82958", "O", "(Cl)", "CC=C", PHENYL, "O", "C19H20ClNO2"),
    ("SKF-81297", "O", "(Cl)", "", PHENYL, "O", "C16H16ClNO2"),
    ("SKF-83566", "Br", "", "C", PHENYL, "O", "C17H18BrNO"),
]

# Remaining chemotypes, written out rather than decorated on a template, so only the
# formula cross-check applies to them.
SINGLETONS = [
    ("Spiperone", "Butyrophenone",
     "O=C1NCN(c2ccccc2)C12CCN(CCCC(=O)c1ccc(F)cc1)CC2", "C23H26FN3O2"),
    ("Droperidol", "Butyrophenone",
     "O=C1Nc2ccccc2N1C1=CCN(CCCC(=O)c2ccc(F)cc2)CC1", "C22H22FN3O2"),
    ("Pipamperone", "Butyrophenone",
     "NC(=O)C1(N2CCCCC2)CCN(CCCC(=O)c2ccc(F)cc2)CC1", "C21H30FN3O2"),
    ("Pimozide", "Diphenylbutylpiperidine",
     "O=C1Nc2ccccc2N1C1CCN(CCCC(c2ccc(F)cc2)c2ccc(F)cc2)CC1", "C28H29F2N3O"),
    ("Penfluridol", "Diphenylbutylpiperidine",
     "OC1(c2ccc(Cl)c(C(F)(F)F)c2)CCN(CCCC(c2ccc(F)cc2)c2ccc(F)cc2)CC1",
     "C28H27ClF5NO"),
    ("Fluspirilene", "Diphenylbutylpiperidine",
     "O=C1NCN(c2ccccc2)C12CCN(CCCC(c1ccc(F)cc1)c1ccc(F)cc1)CC2", "C29H31F2N3O"),
    ("Apomorphine", "Dopamine agonist",
     "CN1CCc2cccc3c2C1Cc1ccc(O)c(O)c1-3", "C17H17NO2"),
    ("Piribedil", "Dopamine agonist",
     "c1ccc2OCOc2c1CN1CCN(c2ncccn2)CC1", "C16H18N4O2"),
    ("Sumanirole", "Dopamine agonist",
     "CNC1Cc2cccc3c2n(C1)c(=O)[nH]3", "C11H13N3O"),
    ("7-OH-DPAT", "Dopamine agonist",
     "CCCN(CCC)C1CCc2cc(O)ccc2C1", "C16H25NO"),
    ("Pergolide", "Ergoline",
     "CCCN1CC(CSC)CC2c3cccc4[nH]cc(c34)CC12", "C19H26N2S"),
    ("Lisuride", "Ergoline",
     "CCN(CC)C(=O)NC1CN(C)C2Cc3c[nH]c4cccc(c34)C2=C1", "C20H26N4O"),
    ("Cabergoline", "Ergoline",
     "C=CCN1CC(C(=O)N(CCCN(C)C)C(=O)NCC)CC2c3cccc4[nH]cc(c34)CC12",
     "C26H37N5O2"),
    ("GBR-12909", "Dopamine transporter ligand",
     "c1ccc(F)cc1CCCN1CCN(CCOC(c2ccccc2)c2ccccc2)CC1", "C28H33FN2O"),
    ("GBR-12935", "Dopamine transporter ligand",
     "c1ccccc1CCCN1CCN(CCOC(c2ccccc2)c2ccccc2)CC1", "C28H34N2O"),
    ("Nomifensine", "Dopamine transporter ligand",
     "CN1Cc2ccccc2C(c2ccccc2)C1N", "C16H18N2"),
    ("Mazindol", "Dopamine transporter ligand",
     "OC1(c2ccc(Cl)cc2)N2CCN=C2c2ccccc21", "C16H13ClN2O"),
    ("Methamphetamine", "Stimulant", "CNC(C)Cc1ccccc1", "C10H15N"),
    ("Amineptine", "Dopamine transporter ligand",
     "OC(=O)CCCCCCNC1c2ccccc2CCc2ccccc21", "C22H27NO2"),
    ("Dihydrotetrabenazine", "VMAT2 ligand",
     "CC(C)CC1CC(O)C2Cc3cc(OC)c(OC)cc3CN2C1", "C19H29NO3"),
    ("Valbenazine", "VMAT2 ligand",
     "CC(C)C(N)C(=O)OC1CC(CC(C)C)CN2CCc3cc(OC)c(OC)cc3C12", "C24H38N2O4"),
    ("Lobeline", "VMAT2 ligand",
     "CN1C(CC(=O)c2ccccc2)CCCC1CC(O)c1ccccc1", "C22H27NO2"),
    ("Reserpine", "VMAT2 ligand",
     "COC(=O)C1C(OC(=O)c2cc(OC)c(OC)c(OC)c2)C(OC)C2CN3CCc4c([nH]c5cc(OC)ccc45)C3CC2C1",
     "C33H40N2O9"),
]

ENTRY = re.compile(
    r"\{ name: '((?:\\.|[^'\\])*)', cls: '((?:\\.|[^'\\])*)', "
    r"formula: '((?:\\.|[^'\\])*)', smiles: '((?:\\.|[^'\\])*)'(?:, propertyOnly: true)? \}"
)


def optional(group):
    # An empty slot has to drop its parentheses too, or an atom is written C() and the
    # structure does not parse.
    return "(%s)" % group if group else ""


def build_butyrophenone(row):
    return BUTYROPHENONE.format(C4A=row[1], C4B=optional(row[2]), NSUB=row[3])


def build_benzamide(row):
    return BENZAMIDE.format(AMINE=row[1], R2=row[2], R3=row[3], R4=row[4],
                            R5=row[5], R6=row[6])


def build_tropane(row):
    return TROPANE.format(N=row[1], C2=optional(row[2]), C3=row[3])


def build_cathinone(row):
    return CATHINONE.format(AMINE=row[1], ALPHA=row[2], ARYL=row[3])


def build_benzazepine(row):
    return BENZAZEPINE.format(R7=row[1], R6=row[2], N3=optional(row[3]),
                              ARYL=row[4], R8=row[5])


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

    families = ([(row[0], row[-1], build_butyrophenone(row), "Butyrophenone")
                 for row in BUTYROPHENONES]
                + [(row[0], row[-1], build_benzamide(row), "Substituted benzamide")
                   for row in BENZAMIDES]
                + [(row[0], row[-1], build_tropane(row), "Tropane") for row in TROPANES]
                + [(row[0], row[-1], build_cathinone(row), "Cathinone")
                   for row in CATHINONES]
                + [(row[0], row[-1], build_benzazepine(row), "Benzazepine")
                   for row in BENZAZEPINES]
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
