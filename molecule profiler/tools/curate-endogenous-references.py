# Adds documented endogenous signalling molecules to the comparison library.
#
# These are measured natural products, not scaffold homologues, so each row is
# written by hand with both a structure and an independently stated molecular
# formula. RDKit recomputes the formula from the structure and the two must
# agree, which catches a mistyped SMILES or a misremembered formula. Rows whose
# structure the library already stores are skipped.

import os
import re
import sys

from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLS = "Endogenous signalling reference"

ENTRY = re.compile(r"\{ name: '([^']*)', cls: '([^']*)', formula: '([^']*)', smiles: '([^']*)'")

ROWS = [
    ("Glycine", "C2H5NO2", "NCC(=O)O"),
    ("L-Glutamic acid", "C5H9NO4", "N[C@@H](CCC(=O)O)C(=O)O"),
    ("L-Glutamine", "C5H10N2O3", "N[C@@H](CCC(N)=O)C(=O)O"),
    ("L-Arginine", "C6H14N4O2", "N[C@@H](CCCNC(=N)N)C(=O)O"),
    ("L-Citrulline", "C6H13N3O3", "NC(=O)NCCC[C@@H](N)C(=O)O"),
    ("L-Ornithine", "C5H12N2O2", "NCCC[C@@H](N)C(=O)O"),
    ("Creatine", "C4H9N3O2", "CN(CC(=O)O)C(=N)N"),
    ("Glutathione", "C10H17N3O6S", "N[C@@H](CCC(=O)N[C@@H](CS)C(=O)NCC(=O)O)C(=O)O"),
    ("Adenosine", "C10H13N5O4", "Nc1ncnc2c1ncn2[C@@H]1O[C@H](CO)[C@@H](O)[C@H]1O"),
    ("Inosine", "C10H12N4O5", "O=c1[nH]cnc2c1ncn2[C@@H]1O[C@H](CO)[C@@H](O)[C@H]1O"),
    ("Adenine", "C5H5N5", "Nc1ncnc2[nH]cnc12"),
    ("Hypoxanthine", "C5H4N4O", "O=c1[nH]cnc2[nH]cnc12"),
    ("Xanthine", "C5H4N4O2", "O=c1[nH]c(=O)c2[nH]cnc2[nH]1"),
    ("Uric acid", "C5H4N4O3", "O=c1[nH]c(=O)c2[nH]c(=O)[nH]c2[nH]1"),
    ("Cyclic adenosine monophosphate (cAMP)", "C10H12N5O6P",
     "Nc1ncnc2c1ncn2[C@@H]1O[C@@H]2COP(=O)(O)O[C@H]2[C@H]1O"),
    ("Cyclic guanosine monophosphate (cGMP)", "C10H12N5O7P",
     "Nc1nc(=O)c2ncn([C@@H]3O[C@@H]4COP(=O)(O)O[C@H]4[C@H]3O)c2[nH]1"),
    ("Guanosine triphosphate (GTP)", "C10H16N5O14P3",
     "Nc1nc(=O)c2ncn([C@@H]3O[C@H](COP(=O)(O)OP(=O)(O)OP(=O)(O)O)[C@@H](O)[C@H]3O)c2[nH]1"),
    ("Choline", "C5H14NO+", "OCC[N+](C)(C)C"),
    ("Betaine", "C5H11NO2", "C[N+](C)(C)CC(=O)[O-]"),
    ("Hypotaurine", "C2H7NO2S", "NCCS(=O)O"),
    ("Carnosine", "C9H14N4O3", "NCCC(=O)N[C@@H](Cc1c[nH]cn1)C(=O)O"),
    ("Anserine", "C10H16N4O3", "NCCC(=O)N[C@@H](Cc1cn(C)cn1)C(=O)O"),
    ("Histamine", "C5H9N3", "NCCc1c[nH]cn1"),
    ("N-tau-Methylhistamine", "C6H11N3", "NCCc1cn(C)cn1"),
    ("Arachidonic acid", "C20H32O2", "CCCCC/C=C\\C/C=C\\C/C=C\\C/C=C\\CCCC(=O)O"),
    ("Prostaglandin E2", "C20H32O5",
     "CCCCC[C@@H](O)/C=C/[C@H]1[C@@H](O)CC(=O)[C@@H]1C/C=C\\CCCC(=O)O"),
    ("Prostaglandin F2alpha", "C20H34O5",
     "CCCCC[C@@H](O)/C=C/[C@H]1[C@@H](O)C[C@@H](O)[C@@H]1C/C=C\\CCCC(=O)O"),
    ("Prostaglandin D2", "C20H32O5",
     "CCCCC[C@@H](O)/C=C/[C@@H]1[C@@H](C/C=C\\CCCC(=O)O)[C@H](O)CC1=O"),
    ("Palmitoylethanolamide", "C18H37NO2", "CCCCCCCCCCCCCCCC(=O)NCCO"),
    ("Oleoylethanolamide", "C20H39NO2", "CCCCCCCC/C=C\\CCCCCCCC(=O)NCCO"),
    ("2-Oleoylglycerol", "C21H40O4", "CCCCCCCC/C=C\\CCCCCCCC(=O)OCC(O)CO"),
    ("N-Arachidonoyl dopamine", "C28H41NO3",
     "CCCCC/C=C\\C/C=C\\C/C=C\\C/C=C\\CCCC(=O)NCCc1ccc(O)c(O)c1"),
    ("Virodhamine", "C22H37NO2",
     "CCCCC/C=C\\C/C=C\\C/C=C\\C/C=C\\CCCC(=O)OCCN"),
    ("Sphingosine-1-phosphate", "C18H38NO5P",
     "CCCCCCCCCCCCC/C=C/[C@@H](O)[C@@H](N)COP(=O)(O)O"),
    ("L-DOPA", "C9H11NO4", "N[C@@H](Cc1ccc(O)c(O)c1)C(=O)O"),
    ("3-Methoxytyramine", "C9H13NO2", "NCCc1ccc(O)c(OC)c1"),
    ("Normetanephrine", "C9H13NO3", "NCC(O)c1ccc(O)c(OC)c1"),
    ("Metanephrine", "C10H15NO3", "CNCC(O)c1ccc(O)c(OC)c1"),
    ("3,4-Dihydroxyphenylglycol", "C8H10O4", "OCC(O)c1ccc(O)c(O)c1"),
    ("3,4-Dihydroxyphenylacetic acid (DOPAC)", "C8H8O4", "O=C(O)Cc1ccc(O)c(O)c1"),
    ("Homovanillic acid", "C9H10O4", "O=C(O)Cc1ccc(O)c(OC)c1"),
    ("5-Hydroxyindoleacetic acid", "C10H9NO3", "O=C(O)Cc1c[nH]c2ccc(O)cc12"),
    ("5-Hydroxytryptophan", "C11H12N2O3", "N[C@@H](Cc1c[nH]c2ccc(O)cc12)C(=O)O"),
    ("N-Acetylserotonin", "C12H14N2O2", "CC(=O)NCCc1c[nH]c2ccc(O)cc12"),
    ("Xanthurenic acid", "C10H7NO4", "O=C(O)c1cc(O)c2cccc(O)c2n1"),
    ("3-Hydroxykynurenine", "C10H12N2O4", "N[C@@H](CC(=O)c1cccc(O)c1N)C(=O)O"),
    ("Kynuramine", "C9H12N2O", "NCCC(=O)c1ccccc1N"),
    ("Anthranilic acid", "C7H7NO2", "Nc1ccccc1C(=O)O"),
    ("3-Hydroxyanthranilic acid", "C7H7NO3", "Nc1c(O)cccc1C(=O)O"),
    ("Picolinic acid", "C6H5NO2", "O=C(O)c1ccccn1"),
    ("Quinaldic acid", "C10H7NO2", "O=C(O)c1ccc2ccccc2n1"),
    ("Nicotinamide", "C6H6N2O", "NC(=O)c1cccnc1"),
]


def flat(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    Chem.RemoveStereochemistry(mol)
    return Chem.MolToSmiles(mol)


def main():
    text = open(os.path.join(ROOT, "data/library.js")).read()
    seen = {}
    stored_names = set()
    for name, cls, formula, smiles in ENTRY.findall(text):
        stored_names.add(name)
        key = flat(smiles)
        if key:
            seen[key] = name

    fails = []
    out = []
    skipped = []
    for name, stated, smiles in ROWS:
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            fails.append("%s: unparsable structure" % name)
            continue
        computed = CalcMolFormula(mol)
        if computed != stated:
            fails.append("%s: stated %s, structure gives %s" % (name, stated, computed))
            continue
        key = flat(smiles)
        if key in seen:
            skipped.append("%s (stored as %s)" % (name, seen[key]))
            continue
        if name in stored_names:
            skipped.append("%s (name already stored)" % name)
            continue
        seen[key] = name
        out.append("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },"
                   % (name, CLS, computed, smiles))

    if fails:
        sys.stderr.write("\n".join(fails) + "\n")
        return 1
    sys.stderr.write("%d new rows, %d already stored: %s\n"
                     % (len(out), len(skipped), "; ".join(skipped)))
    print("\n".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
