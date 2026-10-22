"""Build antifungal azole and nucleoside/antimetabolite reference structures by
substitution on verified parent scaffolds.

Run: python tools/derive-antifungal-antiviral-references.py [--output rows.js]

Five templates are used: the 1-(2-aryl-2-alkoxyethyl)azole ether/thioether, the
azolylmethyl tertiary alcohol, the 2-aryl-1,3-dioxolan-2-ylmethyl azole, the
glycosyl/acyclic nucleoside, and the 4-aminobenzoyl-glutamate antifolate. Each is
validated first by regenerating entries the library already stores and requiring a
canonical-SMILES match, so a template error fails the run instead of propagating into
new rows.

Each compound then carries an independently stated molecular formula, which RDKit checks
against the formula computed from the constructed structure. Recalling the substitution
pattern and recalling the formula are separate acts of recall, so a disagreement between
them marks the entry as unreliable and the run fails rather than emitting it. Agreement is
evidence of consistency, not proof of identity: it cannot catch an error that leaves the
formula unchanged, which for these scaffolds means a substituent on the wrong ring carbon,
the wrong sugar epimer, or a purine written at N7 instead of N9.

Structures are written as constitution only. Sugar series that differ from one another
solely in configuration (ribo versus arabino, D versus L) therefore collapse onto one
another, and the collision gate rejects the duplicate rather than emitting two names for
one graph.

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

# {BN} the fragment carried on the ether/thioether oxygen or sulfur, ending at the atom
# that bonds to it; {X} that O or S; {AR} the aryl ring on the benzylic carbon; {AZ} the
# azole, written from its substituted nitrogen.
AZOLE_ETHER = "{BN}{X}C({AR})C{AZ}"

# {ARM} the third branch on the carbinol carbon; {AZ} the azole on the adjacent
# methylene; {AR} whatever closes the chain at the carbinol carbon.
TERT_ALCOHOL = "OC({ARM})(C{AZ}){AR}"

# {R4} the substituent at dioxolane C4, ending at the atom bonding to it; {AZ} the azole
# on the C2 methylene; {AR} the C2 aryl ring. Ring digit 9 closes the dioxolane.
DIOXOLANE = "{R4}C9COC(C{AZ})(O9){AR}"

# {SUGAR} the glycosyl or acyclic fragment, ending at the carbon that bonds to the base;
# {BASE} the base, written from its glycosidic nitrogen. Ring digit 9 closes the sugar.
NUCLEOSIDE = "{SUGAR}{BASE}"

# {N10} the substituent on N10, empty for the secondary amine; {AA} the amino acid
# fragment after the benzamide nitrogen. Ring digits 8 and 9 close the pteridine.
PTERIN = "{N10}N(Cc9cnc8nc(N)nc(N)c8n9)c1ccc(cc1)C(=O)N{AA}"

IMID, TRIAZ = "n1ccnc1", "n1cncn1"
DCB24 = "Clc1cc(Cl)c(cc1)C"
DCB26 = "Clc1cccc(Cl)c1C"
CB4 = "Clc1ccc(cc1)C"
DCP24 = "c1ccc(Cl)cc1Cl"
DFP24 = "c1ccc(F)cc1F"
GLU = "C(CCC(=O)O)C(=O)O"

# name, class, O/S fragment, O or S, benzylic aryl, azole, formula
AZOLE_ETHERS = [
    ("Miconazole", "Antifungal", DCB24, "O", DCP24, IMID, "C18H14Cl4N2O"),
    ("Econazole", "Antifungal", CB4, "O", DCP24, IMID, "C18H15Cl3N2O"),
    ("Sulconazole", "Antifungal", CB4, "S", DCP24, IMID, "C18H15Cl3N2S"),
    ("Isoconazole", "Antifungal", DCB26, "O", DCP24, IMID, "C18H14Cl4N2O"),
    ("Tioconazole", "Antifungal", "Clc1sccc1C", "O", DCP24, IMID,
     "C16H13Cl3N2OS"),
    ("Fenticonazole", "Antifungal", "c1ccc(cc1)Sc1ccc(cc1)C", "O", DCP24, IMID,
     "C24H20Cl2N2OS"),
    ("Sertaconazole", "Antifungal", "Clc1cccc2c1scc2C", "O", DCP24, IMID,
     "C20H15Cl3N2OS"),
    ("Enilconazole", "Antifungal", "C=CC", "O", DCP24, IMID, "C14H14Cl2N2O"),
]

# name, class, carbinol branch, azole, chain closing the carbinol, formula
TERT_ALCOHOLS = [
    ("Fluconazole", "Antifungal", "C" + TRIAZ, TRIAZ, DFP24, "C13H12F2N6O"),
    ("Voriconazole", "Antifungal", "C(C)c1ncncc1F", TRIAZ, DFP24,
     "C16H14F3N5O"),
    ("Efinaconazole", "Antifungal", "C(C)N1CCC(=C)CC1", TRIAZ, DFP24,
     "C18H22F2N4O"),
    ("Hexaconazole", "Antifungal", "CCCC", TRIAZ, DCP24, "C14H17Cl2N3O"),
    ("Tebuconazole", "Antifungal", "C(C)(C)C", TRIAZ, "CCc1ccc(Cl)cc1",
     "C16H22ClN3O"),
]

# name, class, C4 substituent, azole, C2 aryl, formula
DIOXOLANES = [
    ("Ketoconazole", "Antifungal", "CC(=O)N1CCN(CC1)c1ccc(cc1)OC", IMID,
     DCP24, "C26H28Cl2N4O4"),
    ("Terconazole", "Antifungal", "CC(C)N1CCN(CC1)c1ccc(cc1)OC", TRIAZ,
     DCP24, "C26H31Cl2N5O3"),
    ("Propiconazole", "Antifungal", "CCC", TRIAZ, DCP24, "C15H17Cl2N3O2"),
    ("Difenoconazole", "Antifungal", "C", TRIAZ,
     "c1ccc(Oc2ccc(Cl)cc2)cc1Cl", "C19H17Cl2N3O3"),
]

RIBO = "O9C(CO)C(O)C(O)C9"
DEOXY = "O9C(CO)C(O)CC9"
DIDEOXY = "O9C(CO)CCC9"
DIDEHYDRO = "O9C(CO)C=CC9"
AZIDO = "O9C(CO)C(N=[N+]=[N-])CC9"
OXATHIOLANE = "O9C(CO)SCC9"
DIFLUORO = "O9C(CO)C(O)C(F)(F)C9"
FLUOROARA = "O9C(CO)C(O)C(F)C9"
CYCLOPENTENE = "C9C(CO)C=CC9"
METHYLIDENECYCLOPENTANE = "C(=C)9C(CO)C(O)CC9"

URACIL = "n1ccc(=O)[nH]c1=O"
THYMINE = "n1cc(C)c(=O)[nH]c1=O"
CYTOSINE = "n1ccc(N)nc1=O"
FLUOROCYTOSINE = "n1cc(F)c(N)nc1=O"
FLUOROURACIL = "n1cc(F)c(=O)[nH]c1=O"
IODOURACIL = "n1cc(I)c(=O)[nH]c1=O"
TRIFLUOROMETHYLURACIL = "n1cc(C(F)(F)F)c(=O)[nH]c1=O"
BROMOVINYLURACIL = "n1cc(C=CBr)c(=O)[nH]c1=O"
ADENINE = "n1cnc2c(N)ncnc12"
GUANINE = "n1cnc2c1nc(N)[nH]c2=O"
HYPOXANTHINE = "n1cnc2c1nc[nH]c2=O"
FLUOROADENINE = "n1cnc2c(N)nc(F)nc12"
CHLOROADENINE = "n1cnc2c(N)nc(Cl)nc12"
AZACYTOSINE = "n1cnc(N)nc1=O"
AMINOPURINE = "n1cnc2cnc(N)nc12"
METHOXYGUANINE = "n1cnc2c1nc(N)nc2OC"
TRIAZOLECARBOXAMIDE = "n1cnc(C(N)=O)n1"
CYCLOPROPYLAMINOPURINE = "n1cnc2c(NC3CC3)nc(N)nc12"
HYDROXYIMIDAZOLECARBOXAMIDE = "n1cnc(C(N)=O)c1O"

# name, class, sugar or acyclic fragment, base, formula
NUCLEOSIDES = [
    ("Adenosine", "Nucleoside", RIBO, ADENINE, "C10H13N5O4"),
    ("Guanosine", "Nucleoside", RIBO, GUANINE, "C10H13N5O5"),
    ("Thymidine", "Nucleoside", DEOXY, THYMINE, "C10H14N2O5"),
    ("Uridine", "Nucleoside", RIBO, URACIL, "C9H12N2O6"),
    ("Inosine", "Nucleoside", RIBO, HYPOXANTHINE, "C10H12N4O5"),
    ("Cytarabine", "Antimetabolite", RIBO, CYTOSINE, "C9H13N3O5"),
    ("Azacitidine", "Antimetabolite", RIBO, AZACYTOSINE, "C8H12N4O5"),
    ("Decitabine", "Antimetabolite", DEOXY, AZACYTOSINE, "C8H12N4O4"),
    ("Gemcitabine", "Antimetabolite", DIFLUORO, CYTOSINE, "C9H11F2N3O4"),
    ("Fludarabine", "Antimetabolite", RIBO, FLUOROADENINE, "C10H12FN5O4"),
    ("Cladribine", "Antimetabolite", DEOXY, CHLOROADENINE, "C10H12ClN5O3"),
    ("Clofarabine", "Antimetabolite", FLUOROARA, CHLOROADENINE,
     "C10H11ClFN5O3"),
    ("Nelarabine", "Antimetabolite", RIBO, METHOXYGUANINE, "C11H15N5O5"),
    ("Floxuridine", "Antimetabolite", DEOXY, FLUOROURACIL, "C9H11FN2O5"),
    ("Trifluridine", "Antimetabolite", DEOXY, TRIFLUOROMETHYLURACIL,
     "C10H11F3N2O5"),
    ("Idoxuridine", "Antiviral", DEOXY, IODOURACIL, "C9H11IN2O5"),
    ("Brivudine", "Antiviral", DEOXY, BROMOVINYLURACIL, "C11H13BrN2O5"),
    ("Clevudine", "Antiviral", FLUOROARA, THYMINE, "C10H13FN2O5"),
    ("Zidovudine", "Antiviral", AZIDO, THYMINE, "C10H13N5O4"),
    ("Stavudine", "Antiviral", DIDEHYDRO, THYMINE, "C10H12N2O4"),
    ("Didanosine", "Antiviral", DIDEOXY, HYPOXANTHINE, "C10H12N4O3"),
    ("Zalcitabine", "Antiviral", DIDEOXY, CYTOSINE, "C9H13N3O3"),
    ("Lamivudine", "Antiviral", OXATHIOLANE, CYTOSINE, "C8H11N3O3S"),
    ("Emtricitabine", "Antiviral", OXATHIOLANE, FLUOROCYTOSINE,
     "C8H10FN3O3S"),
    ("Abacavir", "Antiviral", CYCLOPENTENE, CYCLOPROPYLAMINOPURINE,
     "C14H18N6O"),
    ("Entecavir", "Antiviral", METHYLIDENECYCLOPENTANE, GUANINE,
     "C12H15N5O3"),
    ("Acyclovir", "Antiviral", "OCCOC", GUANINE, "C8H11N5O3"),
    ("Ganciclovir", "Antiviral", "OCC(CO)OC", GUANINE, "C9H13N5O4"),
    ("Penciclovir", "Antiviral", "OCC(CO)CC", GUANINE, "C10H15N5O3"),
    ("Famciclovir", "Antiviral", "CC(=O)OCC(COC(C)=O)CC", AMINOPURINE,
     "C14H19N5O4"),
    ("Valganciclovir", "Antiviral", "CC(C)C(N)C(=O)OCC(CO)OC", GUANINE,
     "C14H22N6O5"),
    ("Adefovir", "Antiviral", "OP(=O)(O)COCC", ADENINE, "C8H12N5O4P"),
    ("Ribavirin", "Antiviral", RIBO, TRIAZOLECARBOXAMIDE, "C8H12N4O5"),
    ("Mizoribine", "Immunosuppressant", RIBO, HYDROXYIMIDAZOLECARBOXAMIDE,
     "C9H13N3O6"),
]

# name, class, N10 substituent, amino acid fragment, formula
PTERINS = [
    ("Methotrexate", "Antimetabolite", "C", GLU, "C20H22N8O5"),
    ("Aminopterin", "Antimetabolite", "", GLU, "C19H20N8O5"),
]

# name, class, structure, formula
SINGLETONS = [
    ("Oxiconazole", "Antifungal",
     "Clc1cc(Cl)c(cc1)CON=C(Cn1ccnc1)c1ccc(Cl)cc1Cl", "C18H13Cl4N3O"),
    ("Butoconazole", "Antifungal",
     "Clc1ccc(CCC(Cn2ccnc2)Sc2c(Cl)cccc2Cl)cc1", "C19H17Cl3N2S"),
    ("Climbazole", "Antifungal",
     "CC(C)(C)C(=O)C(n1ccnc1)Oc1ccc(Cl)cc1", "C15H17ClN2O2"),
    ("Chlormidazole", "Antifungal", "Cc1nc2ccccc2n1Cc1ccc(Cl)cc1",
     "C15H13ClN2"),
    ("Luliconazole", "Antifungal",
     "N#CC(=C1SCC(c2ccc(Cl)cc2Cl)S1)n1ccnc1", "C14H9Cl2N3S2"),
    ("Penconazole", "Antifungal", "CCCC(Cn1cncn1)c1ccc(Cl)cc1Cl",
     "C13H15Cl2N3"),
    ("Myclobutanil", "Antifungal", "CCCCC(C#N)(Cn1cncn1)c1ccc(Cl)cc1",
     "C15H17ClN4"),
    ("Epoxiconazole", "Antifungal",
     "Clc1ccccc1C2OC2(Cn1cncn1)c1ccc(F)cc1", "C17H13ClFN3O"),
    ("Prochloraz", "Antifungal",
     "CCCN(CCOc1c(Cl)cc(Cl)cc1Cl)C(=O)n1ccnc1", "C15H16Cl3N3O2"),
    ("Triadimefon", "Antifungal",
     "CC(C)(C)C(=O)C(n1cncn1)Oc1ccc(Cl)cc1", "C14H16ClN3O2"),
    ("Triadimenol", "Antifungal",
     "CC(C)(C)C(O)C(n1cncn1)Oc1ccc(Cl)cc1", "C14H18ClN3O2"),
    ("Bitertanol", "Antifungal",
     "CC(C)(C)C(O)C(n1cncn1)Oc1ccc(cc1)-c1ccccc1", "C20H23N3O2"),
    ("Naftifine", "Antifungal", "CN(CC=Cc1ccccc1)Cc1cccc2ccccc12",
     "C21H21N"),
    ("Butenafine", "Antifungal",
     "CN(Cc1ccc(cc1)C(C)(C)C)Cc1cccc2ccccc12", "C23H27N"),
    ("Amorolfine", "Antifungal",
     "CC1CN(CC(C)O1)CC(C)Cc1ccc(cc1)C(C)(C)CC", "C21H35NO"),
    ("Fenpropimorph", "Antifungal",
     "CC1CN(CC(C)O1)CC(C)Cc1ccc(cc1)C(C)(C)C", "C20H33NO"),
    ("Tolnaftate", "Antifungal",
     "CN(c1cccc(C)c1)C(=S)Oc1ccc2ccccc2c1", "C19H17NOS"),
    ("Trimetrexate", "Antimetabolite",
     "Nc1nc(N)nc2ccc(CNc3cc(OC)c(OC)c(OC)c3)c(C)c12", "C19H23N5O3"),
    ("Cycloguanil", "Antimalarial",
     "CC1(C)N=C(N)N=C(N)N1c1ccc(Cl)cc1", "C11H14ClN5"),
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
          AZOLE_ETHER.format(BN=row[2], X=row[3], AR=row[4], AZ=row[5]))
         for row in AZOLE_ETHERS]
        + [(row[0], row[1], row[-1],
            TERT_ALCOHOL.format(ARM=row[2], AZ=row[3], AR=row[4]))
           for row in TERT_ALCOHOLS]
        + [(row[0], row[1], row[-1],
            DIOXOLANE.format(R4=row[2], AZ=row[3], AR=row[4]))
           for row in DIOXOLANES]
        + [(row[0], row[1], row[-1],
            NUCLEOSIDE.format(SUGAR=row[2], BASE=row[3]))
           for row in NUCLEOSIDES]
        + [(row[0], row[1], row[-1],
            PTERIN.format(N10=row[2], AA=row[3]))
           for row in PTERINS]
        + [(row[0], row[1], row[-1], row[2]) for row in SINGLETONS])

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
