"""Build cholinergic reference structures by substitution on verified parent scaffolds.

Run: python tools/derive-cholinergic-references.py [--output rows.js]

Three templates are used: the 8-azabicyclo[3.2.1]octan-3-yl (tropane) ether/ester, the
generic aminoalkyl ester, and the aryl carbamate. Each is validated first by regenerating
entries the library already stores and requiring a canonical-SMILES match, so a template
error fails the run instead of propagating into new rows.

Each compound then carries an independently stated molecular formula, which RDKit checks
against the formula computed from the constructed structure. Recalling the substitution
pattern and recalling the formula are separate acts of recall, so a disagreement between
them marks the entry as unreliable and the run fails rather than emitting it. Agreement is
evidence of consistency, not proof of identity: it cannot catch an error that leaves the
formula unchanged, which for these scaffolds means a substituent placed on the wrong ring
position or the wrong epimer at C3.

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

# {N} the N8 substituent, which carries the ring-8 opening digit itself so that both
# tertiary and quaternary nitrogens can be written; {B} the C6-C7 bridge, plain in tropane
# and the epoxide in scopine; {R} whatever hangs off the 3-oxygen, empty for the free
# alcohol. Ring digits 8 and 9 close the bicycle, leaving 1-7 free for the interpolated
# aryl and cycloalkyl substituents.
TROPANE = "{N}C9{B}C8CC(C9)O{R}"

# {ALC} the alcohol fragment, ending at the carbon that bonds to the ester oxygen;
# {ACID} the acyl fragment. Each slot closes every ring digit it opens.
ESTER = "{ALC}OC(=O){ACID}"

# {NC} the carbamoyl nitrogen fragment, ending at that nitrogen; {AR} the O-aryl ring.
CARBAMATE = "{NC}C(=O)O{AR}"

NME, NOR, NH2ME = "CN8", "N8", "C[N+]8(C)"
CH2, EPOX, C6OH = "CC", "C7OC7", "C(O)C"
TROPATE = "C(=O)C(CO)c1ccccc1"
BENZILATE = "C(=O)C(O)(c1ccccc1)c1ccccc1"
DITHIENYLGLYCOLATE = "C(=O)C(O)(c1cccs1)c1cccs1"
CHX_PH_GLYCOLATE = "C(O)(c1ccccc1)C1CCCCC1"
XANTHENE_9_CARB = "C1c2ccccc2Oc2ccccc21"

# name, N8 substituent, C6-C7 bridge, 3-O substituent, formula
TROPANES = [
    ("Atropine", NME, CH2, TROPATE, "C17H23NO3"),
    ("Tropacocaine", NME, CH2, "C(=O)c1ccccc1", "C15H19NO2"),
    ("Nortropacocaine", NOR, CH2, "C(=O)c1ccccc1", "C14H17NO2"),
    ("Ipratropium", "CC(C)[N+]8(C)", CH2, TROPATE, "C20H30NO3+"),
    ("Tropine", NME, CH2, "", "C8H15NO"),
    ("Nortropine", NOR, CH2, "", "C7H13NO"),
    ("Noratropine", NOR, CH2, TROPATE, "C16H21NO3"),
    ("Methylatropine", NH2ME, CH2, TROPATE, "C18H26NO3+"),
    ("Homatropine", NME, CH2, "C(=O)C(O)c1ccccc1", "C16H21NO3"),
    ("Homatropine methylbromide", NH2ME, CH2, "C(=O)C(O)c1ccccc1",
     "C17H24NO3+"),
    ("Apoatropine", NME, CH2, "C(=O)C(=C)c1ccccc1", "C17H21NO2"),
    ("Etybenzatropine", "CCN8", CH2, "C(c1ccccc1)c1ccccc1", "C22H27NO"),
    ("Octatropine methylbromide", NH2ME, CH2, "C(=O)C(CCC)CCC",
     "C17H32NO2+"),
    ("Tropanyl benzilate", NME, CH2, BENZILATE, "C22H25NO3"),
    ("Scopine", NME, EPOX, "", "C8H13NO2"),
    ("Scopolamine", NME, EPOX, TROPATE, "C17H21NO4"),
    ("Methscopolamine", NH2ME, EPOX, TROPATE, "C18H24NO4+"),
    ("Butylscopolamine", "CCCC[N+]8(C)", EPOX, TROPATE, "C21H30NO4+"),
    ("Oxitropium", "CC[N+]8(C)", EPOX, TROPATE, "C19H26NO4+"),
    ("Tiotropium", NH2ME, EPOX, DITHIENYLGLYCOLATE, "C19H22NO4S2+"),
    ("Anisodamine", NME, C6OH, TROPATE, "C17H23NO4"),
    ("Anisodine", NME, EPOX, "C(=O)C(O)(CO)c1ccccc1", "C17H21NO5"),
]

# name, alcohol fragment, acyl fragment, formula
ESTERS = [
    ("Oxybutynin", "CCN(CC)CC#CC", CHX_PH_GLYCOLATE, "C22H31NO3"),
    ("Glycopyrronium", "C[N+]1(C)CCCC1C", "C(O)(c1ccccc1)C1CCCC1",
     "C20H30NO3+"),
    ("Desethyloxybutynin", "CCNCC#CC", CHX_PH_GLYCOLATE, "C20H27NO3"),
    ("Acetylcholine", "C[N+](C)(C)CC", "C", "C7H16NO2+"),
    ("Methacholine", "C[N+](C)(C)CC(C)", "C", "C8H18NO2+"),
    ("Carbachol", "C[N+](C)(C)CC", "N", "C6H15N2O2+"),
    ("Bethanechol", "C[N+](C)(C)CC(C)", "N", "C7H17N2O2+"),
    ("Aceclidine", "C1CN2CCC1CC2", "C", "C9H15NO2"),
    ("Dicycloverine", "CCN(CC)CC", "C1(C2CCCCC2)CCCCC1", "C19H35NO2"),
    ("Benactyzine", "CCN(CC)CC", "C(O)(c1ccccc1)c1ccccc1", "C20H25NO3"),
    ("Adiphenine", "CCN(CC)CC", "C(c1ccccc1)c1ccccc1", "C20H25NO2"),
    ("Cyclopentolate", "CN(C)CC", "C(c1ccccc1)C1(O)CCCC1", "C17H25NO3"),
    ("Oxyphenonium", "CC[N+](C)(CC)CC", CHX_PH_GLYCOLATE, "C21H34NO3+"),
    ("Propantheline", "CC(C)[N+](C)(C(C)C)CC", XANTHENE_9_CARB,
     "C23H30NO3+"),
    ("Methantheline", "CC[N+](C)(CC)CC", XANTHENE_9_CARB, "C21H26NO3+"),
]

# name, carbamoyl nitrogen fragment, O-aryl ring, formula
CARBAMATES = [
    ("Neostigmine", "CN(C)", "c1cccc([N+](C)(C)C)c1", "C12H19N2O2+"),
    ("Pyridostigmine", "CN(C)", "c1ccc[n+](C)c1", "C9H13N2O2+"),
    ("Rivastigmine", "CCN(C)", "c1cccc(c1)C(C)N(C)C", "C14H22N2O2"),
    ("Physostigmine", "CN", "c1ccc2c(c1)C3(C)CCN(C)C3N2C", "C15H21N3O2"),
    ("Phenserine", "c1ccccc1N", "c1ccc2c(c1)C3(C)CCN(C)C3N2C",
     "C20H23N3O2"),
    ("Carbaryl", "CN", "c1cccc2ccccc12", "C12H11NO2"),
    ("Propoxur", "CN", "c1ccccc1OC(C)C", "C11H15NO3"),
    ("Carbofuran", "CN", "c1cccc2c1OC(C)(C)C2", "C12H15NO3"),
    ("Bendiocarb", "CN", "c1cccc2c1OC(C)(C)O2", "C11H13NO4"),
    ("Methiocarb", "CN", "c1cc(C)c(SC)c(C)c1", "C11H15NO2S"),
]

# name, class, structure, formula
SINGLETONS = [
    ("Trihexyphenidyl", "Antimuscarinic",
     "OC(c1ccccc1)(C1CCCCC1)CCN1CCCCC1", "C20H31NO"),
    ("Procyclidine", "Antimuscarinic",
     "OC(c1ccccc1)(C1CCCCC1)CCN1CCCC1", "C19H29NO"),
    ("Biperiden", "Antimuscarinic",
     "OC(CCN1CCCCC1)(c1ccccc1)C1CC2C=CC1C2", "C21H29NO"),
    ("Tolterodine", "Antimuscarinic",
     "CC(C)N(C(C)C)CCC(c1ccccc1)c1cc(C)ccc1O", "C22H31NO"),
    ("5-Hydroxymethyltolterodine", "Antimuscarinic",
     "CC(C)N(C(C)C)CCC(c1ccccc1)c1cc(CO)ccc1O", "C22H31NO2"),
    ("Fesoterodine", "Antimuscarinic",
     "CC(C)N(C(C)C)CCC(c1ccccc1)c1cc(CO)ccc1OC(=O)C(C)C", "C26H37NO3"),
    ("Solifenacin", "Antimuscarinic",
     "O=C(OC1CN2CCC1CC2)N1CCc2ccccc2C1c1ccccc1", "C23H26N2O2"),
    ("Darifenacin", "Antimuscarinic",
     "NC(=O)C(c1ccccc1)(c1ccccc1)C1CCN(CCc2ccc3OCCc3c2)C1",
     "C28H30N2O2"),
    ("Trospium", "Antimuscarinic",
     "O=C(OC1CC2CCC(C1)[N+]23CCCC3)C(O)(c1ccccc1)c1ccccc1",
     "C25H30NO3+"),
    ("Clidinium", "Antimuscarinic",
     "C[N+]12CCC(CC1)C(C2)OC(=O)C(O)(c1ccccc1)c1ccccc1", "C22H26NO3+"),
    ("Mepenzolate", "Antimuscarinic",
     "C[N+]1(C)CCCC(C1)OC(=O)C(O)(c1ccccc1)c1ccccc1", "C21H26NO3+"),
    ("Pipenzolate", "Antimuscarinic",
     "CC[N+]1(C)CCCC(C1)OC(=O)C(O)(c1ccccc1)c1ccccc1", "C22H28NO3+"),
    ("Aclidinium", "Antimuscarinic",
     "[N+]12(CCCOc3ccccc3)CCC(CC1)C(C2)OC(=O)C(O)(c1cccs1)c1cccs1",
     "C26H30NO4S2+"),
    ("Umeclidinium", "Antimuscarinic",
     "OC(c1ccccc1)(c1ccccc1)C12CC[N+](CC1)(CC2)CCOCc1ccccc1",
     "C29H34NO2+"),
    ("Flavoxate", "Antimuscarinic",
     "Cc1c(-c2ccccc2)oc2c(C(=O)OCCN3CCCCC3)cccc2c1=O", "C24H25NO4"),
    ("Propiverine", "Antimuscarinic",
     "CCCOC(c1ccccc1)(C1CCCCC1)C(=O)OC1CCN(C)CC1", "C23H35NO3"),
    ("Tropicamide", "Antimuscarinic",
     "CCN(Cc1ccccn1)C(=O)C(CO)c1ccccc1", "C17H20N2O2"),
    ("Orphenadrine", "Antimuscarinic",
     "CN(C)CCOC(c1ccccc1)c1ccccc1C", "C18H23NO"),
    ("Doxylamine", "Antimuscarinic",
     "CN(C)CCOC(C)(c1ccccc1)c1ccccn1", "C17H22N2O"),
    ("Clemastine", "Antimuscarinic",
     "CN1CCCC1CCOC(C)(c1ccccc1)c1ccc(Cl)cc1", "C21H26ClNO"),
    ("Pirenzepine", "Antimuscarinic",
     "O=C1Nc2ncccc2N(CC(=O)N2CCN(C)CC2)c2ccccc21", "C19H21N5O2"),
    ("Choline", "Cholinergic", "C[N+](C)(C)CCO", "C5H14NO+"),
    ("Muscarine", "Cholinergic", "C[N+](C)(C)CC1CC(O)C(C)O1",
     "C9H20NO2+"),
    ("Pilocarpine", "Cholinergic", "CCC1C(Cc2cncn2C)OC(=O)C1",
     "C11H16N2O2"),
    ("Xanomeline", "Cholinergic", "CCCCCCOc1nsnc1C1=CCCN(C)C1",
     "C14H23N3OS"),
    ("Oxotremorine", "Cholinergic", "O=C1CCCN1CC#CCN1CCCC1",
     "C12H18N2O"),
    ("Oxotremorine-M", "Cholinergic", "C[N+](C)(C)CC#CCN1CCCC1=O",
     "C11H19N2O+"),
    ("Suxamethonium", "Cholinergic",
     "C[N+](C)(C)CCOC(=O)CCC(=O)OCC[N+](C)(C)C", "C14H30N2O4+2"),
    ("Tacrine", "Cholinesterase inhibitor", "Nc1c2CCCCc2nc2ccccc12",
     "C13H14N2"),
    ("Velnacrine", "Cholinesterase inhibitor",
     "Nc1c2CCCC(O)c2nc2ccccc12", "C13H14N2O"),
    ("Ipidacrine", "Cholinesterase inhibitor", "Nc1c2CCCc2nc2c1CCCC2",
     "C12H16N2"),
    ("Edrophonium", "Cholinesterase inhibitor",
     "CC[N+](C)(C)c1cccc(O)c1", "C10H16NO+"),
    ("Echothiophate", "Cholinesterase inhibitor",
     "C[N+](C)(C)CCSP(=O)(OCC)OCC", "C9H23NO3PS+"),
    ("Metrifonate", "Cholinesterase inhibitor",
     "COP(=O)(OC)C(O)C(Cl)(Cl)Cl", "C4H8Cl3O4P"),
    ("Paraoxon", "Cholinesterase inhibitor",
     "CCOP(=O)(OCC)Oc1ccc(cc1)[N+](=O)[O-]", "C10H14NO6P"),
    ("Parathion", "Cholinesterase inhibitor",
     "CCOP(=S)(OCC)Oc1ccc(cc1)[N+](=O)[O-]", "C10H14NO5PS"),
    ("Malathion", "Cholinesterase inhibitor",
     "CCOC(=O)CC(SP(=S)(OC)OC)C(=O)OCC", "C10H19O6PS2"),
    ("Chlorpyrifos", "Cholinesterase inhibitor",
     "CCOP(=S)(OCC)Oc1nc(Cl)c(Cl)cc1Cl", "C9H11Cl3NO3PS"),
    ("Dichlorvos", "Cholinesterase inhibitor",
     "COP(=O)(OC)OC=C(Cl)Cl", "C4H7Cl2O4P"),
    ("Diazinon", "Cholinesterase inhibitor",
     "CCOP(=S)(OCC)Oc1cc(C)nc(n1)C(C)C", "C12H21N2O3PS"),
    ("Pralidoxime", "Cholinesterase reactivator", "C[n+]1ccccc1C=NO",
     "C7H9N2O+"),
    ("Anabasine", "Nicotinic ligand", "C1CCNC(C1)c1cccnc1", "C10H14N2"),
    ("Nornicotine", "Nicotinic ligand", "C1CCNC1c1cccnc1", "C9H12N2"),
    ("Anatabine", "Nicotinic ligand", "C1=CCNC(C1)c1cccnc1", "C10H12N2"),
    ("Cotinine", "Nicotinic ligand", "CN1C(=O)CCC1c1cccnc1", "C10H12N2O"),
    ("Mecamylamine", "Nicotinic ligand", "CNC1(C)C(C)(C)C2CCC1C2",
     "C11H21N"),
    ("Hexamethonium", "Nicotinic ligand",
     "C[N+](C)(C)CCCCCC[N+](C)(C)C", "C12H30N2+2"),
    ("Decamethonium", "Nicotinic ligand",
     "C[N+](C)(C)CCCCCCCCCC[N+](C)(C)C", "C16H38N2+2"),
    ("Epibatidine", "Nicotinic ligand", "Clc1ccc(cn1)C1CC2CCC1N2",
     "C11H13ClN2"),
    ("Lobeline", "Nicotinic ligand",
     "OC(c1ccccc1)CC1CCCC(CC(=O)c2ccccc2)N1C", "C22H27NO2"),
    ("Dimethylphenylpiperazinium", "Nicotinic ligand",
     "C[N+]1(C)CCN(CC1)c1ccccc1", "C12H19N2+"),
    ("Metanicotine", "Nicotinic ligand", "CNCCC=Cc1cccnc1", "C10H14N2"),
    ("ABT-418", "Nicotinic ligand", "Cc1cc(no1)C1CCCN1C", "C9H14N2O"),
    ("A-85380", "Nicotinic ligand", "c1ccc(cn1)OCC1CCN1", "C9H12N2O"),
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
          TROPANE.format(N=row[1], B=row[2], R=row[3]), "Tropane")
         for row in TROPANES]
        + [(row[0], row[-1],
            ESTER.format(ALC=row[1], ACID=row[2]), "Cholinergic ester")
           for row in ESTERS]
        + [(row[0], row[-1],
            CARBAMATE.format(NC=row[1], AR=row[2]), "Carbamate")
           for row in CARBAMATES]
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
