"""Independent name-to-structure re-check of the derived cephalosporin rows. This script shares no code, constant or grammar with the generator: its scaffolds and side-chain SMILES are retyped from scratch, are strictly stereo-free, and use a disjoint ring-closure digit assignment drawn only from 7, 8, 9 and %10 with atom map numbers built only from the digits 7, 8 and 9, all of which is asserted positively so that no stereochemistry and no generator ring numbering can be smuggled in through a constant. Each house name is parsed by its own prefix grammar, compiled from templates carrying @ where a stereodescriptor belongs into regexes whose capture groups are the letters the name actually carries. The stereo-free scaffold is then enumerated with EnumerateStereoisomers and every isomer is CIP-labelled, and the isomer kept is the one whose CIP labels at the mapped sites equal the name's letters, asserting both that the isomer count is two to the power of the number of unspecified elements and that exactly one isomer matches. Reads the generator's rows on stdin, writes its report to stdout, and writes no files except the library cache dump."""

import collections
import itertools
import json
import os
import re
import subprocess
import sys
import tempfile

from rdkit import Chem, RDLogger
from rdkit.Chem import rdCIPLabeler
from rdkit.Chem.EnumerateStereoisomers import (EnumerateStereoisomers,
                                               StereoEnumerationOptions)

RDLogger.DisableLog("rdApp.*")

ACID_SCAFFOLD = "OC(=O)C%10=C({C3})CS[CH:77]7[CH:78]({C7})C(=O)N7%10"
SALT_SCAFFOLD = "[O-]C(=O)C%10=C({C3})CS[CH:77]7[CH:78]({C7})C(=O)N7%10"

C3_SIDE = {
    "methyl": "C",
    "methoxymethyl": "COC",
    "acetyloxymethyl": "COC(C)=O",
    "carbamoyloxymethyl": "COC(N)=O",
    "methyltetrazolylsulfanylmethyl": "CSc8nnnn8C",
    "methyltetrazolylmethyl": "Cn8nnc(C)n8",
    "methylpyridiniumthiazolylsulfanyl": "Sc8nc(-c9cc[n+](C)cc9)cs8",
    "methylthiazolylethenyl": "[CH:87]=[CH:88]c8scnc8C",
}

C7_SIDE = {
    "amino": "N",
    "aminophenylacetylamino": "NC(=O)[CH:97](N)c8ccccc8",
    "aminothiazolylmethoxyimino": "NC(=O)[C:97](=[N:98]OC)c8csc(N)n8",
    "aminothiadiazolylmethoxyimino": "NC(=O)[C:97](=[N:98]OC)c8nsc(N)n8",
    "aminothiadiazolylhydroxyimino": "NC(=O)[C:97](=[N:98]O)c8nsc(N)n8",
    "furylmethoxyimino": "NC(=O)[C:97](=[N:98]OC)c8ccco8",
    "aminothiazolylpentenoyl": "NC(=O)[C:97](=[CH:98]CC)c8csc(N)n8",
    "aminocarboxypentanoyl": "NC(=O)CCC[CH:97](N)C(=O)O",
}

C3_PREFIX = {
    "methyl": ("3-methyl", {}),
    "methoxymethyl": ("3-(methoxymethyl)", {}),
    "acetyloxymethyl": ("3-[(acetyloxy)methyl]", {}),
    "carbamoyloxymethyl": ("3-[(carbamoyloxy)methyl]", {}),
    "methyltetrazolylsulfanylmethyl":
        ("3-[[(1-methyltetrazol-5-yl)sulfanyl]methyl]", {}),
    "methyltetrazolylmethyl": ("3-[(5-methyltetrazol-2-yl)methyl]", {}),
    "methylpyridiniumthiazolylsulfanyl":
        ("3-[[4-(1-methylpyridin-1-ium-4-yl)-1,3-thiazol-2-yl]sulfanyl]", {}),
    "methylthiazolylethenyl":
        ("3-[(@)-2-(4-methyl-1,3-thiazol-5-yl)ethenyl]", {0: (87, 88)}),
}

C7_PREFIX = {
    "amino": ("7-amino", {}),
    "aminophenylacetylamino":
        ("7-[[(2@)-2-amino-2-phenylacetyl]amino]", {0: 97}),
    "aminothiazolylmethoxyimino":
        ("7-[[(2@)-2-(2-amino-1,3-thiazol-4-yl)-2-methoxyiminoacetyl]amino]",
         {0: (97, 98)}),
    "aminothiadiazolylmethoxyimino":
        ("7-[[(2@)-2-(5-amino-1,2,4-thiadiazol-3-yl)-2-methoxyiminoacetyl]"
         "amino]", {0: (97, 98)}),
    "aminothiadiazolylhydroxyimino":
        ("7-[[(2@)-2-(5-amino-1,2,4-thiadiazol-3-yl)-2-hydroxyiminoacetyl]"
         "amino]", {0: (97, 98)}),
    "furylmethoxyimino":
        ("7-[[(2@)-2-(furan-2-yl)-2-methoxyiminoacetyl]amino]",
         {0: (97, 98)}),
    "aminothiazolylpentenoyl":
        ("7-[[(2@)-2-(2-amino-1,3-thiazol-4-yl)pent-2-enoyl]amino]",
         {0: (97, 98)}),
    "aminocarboxypentanoyl":
        ("7-[[(5@)-5-amino-5-carboxypentanoyl]amino]", {0: 97}),
}

CORE_PREFIX = "(6@,7@)"
CORE_SITES = {0: 77, 1: 78}
STEMS = {
    "acid": ("-8-oxo-5-thia-1-azabicyclo[4.2.0]oct-2-ene-2-carboxylic acid",
             ACID_SCAFFOLD),
    "salt": ("-8-oxo-5-thia-1-azabicyclo[4.2.0]oct-2-ene-2-carboxylate",
             SALT_SCAFFOLD),
}

FLIP = {"R": "S", "S": "R", "E": "Z", "Z": "E"}
BOND_FLIP = {Chem.BondStereo.STEREOZ: Chem.BondStereo.STEREOE,
             Chem.BondStereo.STEREOE: Chem.BondStereo.STEREOZ,
             Chem.BondStereo.STEREOCIS: Chem.BondStereo.STEREOTRANS,
             Chem.BondStereo.STEREOTRANS: Chem.BondStereo.STEREOCIS}
MAPNUM = re.compile(r":\d+")
PCT = re.compile(r"%\d+")
ROW = re.compile(r"^  \{ name: '(.*)', cls: '(.*)', formula: '(.*)', "
                 r"smiles: '(.*)' \},$")

CONTROLS = [
    ("cephalexin", "methyl", "acid", "aminophenylacetylamino"),
    ("cefetamet", "methyl", "acid", "aminothiazolylmethoxyimino"),
    ("cefaloglycin", "acetyloxymethyl", "acid", "aminophenylacetylamino"),
    ("cephalosporin C", "acetyloxymethyl", "acid", "aminocarboxypentanoyl"),
    ("deacetoxycephalosporin C", "methyl", "acid", "aminocarboxypentanoyl"),
    ("7beta-aminocephalosporanic acid", "acetyloxymethyl", "acid", "amino"),
    ("7beta-aminodeacetoxycephalosporanic acid", "methyl", "acid", "amino"),
    ("cefteram", "methyltetrazolylmethyl", "acid",
     "aminothiazolylmethoxyimino"),
    ("cefcapene", "carbamoyloxymethyl", "acid", "aminothiazolylpentenoyl"),
]


class Checks:
    def __init__(self):
        self.n = 0
        self.fail = []
        self.kinds = collections.Counter()

    def ok(self, cond, label, kind="other"):
        self.n += 1
        self.kinds[kind] += 1
        if not cond:
            self.fail.append(label)


def cache_dir():
    d = os.environ.get("MP_DERIVE_CACHE")
    if not d:
        d = tempfile.mkdtemp(prefix="mp-inverse-ceph-")
    if not os.path.isdir(d):
        os.makedirs(d)
    return d


def load_library():
    path = os.path.join(cache_dir(), "library.json")
    if not os.path.exists(path):
        out = subprocess.run(
            ["node", "-e",
             "const{LIBRARY}=require('./data/library.js');"
             "console.log(JSON.stringify(LIBRARY))"],
            cwd=os.getcwd(), stdout=subprocess.PIPE, check=True).stdout
        with open(path, "wb") as fh:
            fh.write(out)
    with open(path) as fh:
        return json.load(fh)


def compile_prefix(template):
    parts = template.split("@")
    out = ""
    for i, part in enumerate(parts):
        if i:
            out += "([RSEZ])"
        out += re.escape(part)
    return re.compile(out)


def constant_checks(chk):
    constants = [("ACID_SCAFFOLD", ACID_SCAFFOLD),
                 ("SALT_SCAFFOLD", SALT_SCAFFOLD)]
    for key in sorted(C3_SIDE):
        constants.append(("C3_SIDE[%s]" % key, C3_SIDE[key]))
    for key in sorted(C7_SIDE):
        constants.append(("C7_SIDE[%s]" % key, C7_SIDE[key]))
    for label, text in constants:
        chk.ok("@" not in text, "%s carries an @ stereo tag" % label,
               "stereo-free constants")
        chk.ok("/" not in text and "\\" not in text,
               "%s carries a / or \\ stereo tag" % label,
               "stereo-free constants")
    bare = "".join(PCT.sub("", MAPNUM.sub("", t)) for _, t in constants)
    assert "1" not in bare, "ring-closure digit 1 appears in the constants"
    assert "2" not in bare, "ring-closure digit 2 appears in the constants"
    for _, text in constants:
        for num in MAPNUM.findall(text):
            assert set(num[1:]) <= set("789"), num
    return len(constants)


def house_name(c3, stem, c7, letters):
    core = CORE_PREFIX
    for i in range(2):
        core = core.replace("@", letters["core"][i], 1)
    parts = []
    for key, table, tag in ((c3, C3_PREFIX, "c3"), (c7, C7_PREFIX, "c7")):
        text = table[key][0]
        for i in range(len(table[key][1])):
            text = text.replace("@", letters[tag][i], 1)
        parts.append((re.sub(r"[^a-z]", "",
                             re.sub(r"\(\d*[RSEZ]?\)", "",
                                    table[key][0].replace("@", "")).lower()),
                      text))
    head = "-".join(t for _, t in sorted(parts))
    return "%s-%s%s" % (core, head, STEMS[stem][0])


def parse_name(name):
    core_re = compile_prefix(CORE_PREFIX)
    found = []
    for c3, stem, c7 in itertools.product(sorted(C3_PREFIX), sorted(STEMS),
                                          sorted(C7_PREFIX)):
        p3 = compile_prefix(C3_PREFIX[c3][0])
        p7 = compile_prefix(C7_PREFIX[c7][0])
        for first, second in ((p3, p7), (p7, p3)):
            pat = re.compile("^" + core_re.pattern + re.escape("-")
                             + first.pattern + re.escape("-")
                             + second.pattern
                             + re.escape(STEMS[stem][0]) + "$")
            m = pat.match(name)
            if not m:
                continue
            groups = list(m.groups())
            core = groups[:2]
            rest = groups[2:]
            n3 = len(C3_PREFIX[c3][1])
            n7 = len(C7_PREFIX[c7][1])
            if first is p3:
                l3, l7 = rest[:n3], rest[n3:n3 + n7]
            else:
                l7, l3 = rest[:n7], rest[n7:n7 + n3]
            found.append((c3, stem, c7,
                          {"core": core, "c3": list(l3), "c7": list(l7)}))
    if len(found) != 1:
        return None
    return found[0]


def labels_at(mol, sites):
    out = {}
    bymap = {}
    for atom in mol.GetAtoms():
        if atom.GetAtomMapNum():
            bymap[atom.GetAtomMapNum()] = atom.GetIdx()
    for key, where in sites.items():
        if isinstance(where, tuple):
            bond = mol.GetBondBetweenAtoms(bymap[where[0]], bymap[where[1]])
            out[key] = bond.GetPropsAsDict().get("_CIPCode")
        else:
            out[key] = mol.GetAtomWithIdx(
                bymap[where]).GetPropsAsDict().get("_CIPCode")
    return out


def site_map(c3, stem, c7):
    sites = {}
    for i, where in CORE_SITES.items():
        sites[("core", i)] = where
    for i, where in C3_PREFIX[c3][1].items():
        sites[("c3", i)] = where
    for i, where in C7_PREFIX[c7][1].items():
        sites[("c7", i)] = where
    return sites


def resolve(c3, stem, c7, letters, chk=None, label=""):
    smi = STEMS[stem][1].format(C3=C3_SIDE[c3], C7=C7_SIDE[c7])
    base = Chem.MolFromSmiles(smi)
    if base is None:
        return None
    info = Chem.FindPotentialStereo(base)
    n = sum(1 for e in info
            if e.specified == Chem.StereoSpecified.Unspecified)
    opts = StereoEnumerationOptions(onlyUnassigned=True, unique=True)
    isomers = list(EnumerateStereoisomers(base, options=opts))
    if chk is not None:
        chk.ok(len(isomers) == 2 ** n,
               "%s isomer count %d != 2**%d" % (label, len(isomers), n),
               "isomer count is 2**n")
    sites = site_map(c3, stem, c7)
    want = {}
    for key, where in sites.items():
        want[key] = letters[key[0]][key[1]]
    hits = []
    for iso in isomers:
        Chem.AssignStereochemistry(iso, cleanIt=True, force=True)
        rdCIPLabeler.AssignCIPLabels(iso)
        if labels_at(iso, sites) == want:
            hits.append(iso)
    if chk is not None:
        chk.ok(len(hits) == 1,
               "%s matched %d isomers, expected exactly 1"
               % (label, len(hits)), "exactly one isomer matches")
    if len(hits) != 1:
        return None
    out = Chem.RWMol(hits[0])
    for atom in out.GetAtoms():
        atom.SetAtomMapNum(0)
    return Chem.MolToSmiles(out.GetMol())


def canon(smiles):
    mol = Chem.MolFromSmiles(smiles)
    return None if mol is None else Chem.MolToSmiles(mol)


def try_name(name):
    got = parse_name(name)
    if got is None:
        return None
    c3, stem, c7, letters = got
    for tag in ("core", "c3", "c7"):
        for letter in letters[tag]:
            if letter not in FLIP:
                return None
    return resolve(c3, stem, c7, letters)


def main():
    chk = Checks()
    nconst = constant_checks(chk)

    rows = []
    for line in sys.stdin:
        m = ROW.match(line.rstrip("\n"))
        if m:
            rows.append({"name": m.group(1), "smiles": m.group(4)})
    print("rows under inverse check: %d" % len(rows))
    if not rows:
        print("no rows on stdin; pipe the generator's output into this script", file=sys.stderr)
        sys.exit(1)

    name_flips = 0
    tag_flips = 0
    for row in rows:
        got = parse_name(row["name"])
        chk.ok(got is not None, "unparsed name %s" % row["name"],
                "name parses")
        if got is None:
            continue
        c3, stem, c7, letters = got
        smi = resolve(c3, stem, c7, letters, chk, row["name"])
        chk.ok(smi is not None and smi == canon(row["smiles"]),
               "resolved structure differs for %s" % row["name"],
               "resolved structure identical")

        flat = [(tag, i) for tag in ("core", "c3", "c7")
                for i in range(len(letters[tag]))]
        for tag, i in flat:
            alt = {k: list(v) for k, v in letters.items()}
            alt[tag][i] = FLIP[alt[tag][i]]
            name2 = house_name(c3, stem, c7, alt)
            other = try_name(name2)
            name_flips += 1
            chk.ok(other is None or other != smi,
                   "name flip %s/%d did not change %s"
                   % (tag, i, row["name"]), "name-direction flips")

        mol = Chem.MolFromSmiles(row["smiles"])
        elems = [a.GetIdx() for a in mol.GetAtoms()
                 if a.GetChiralTag() != Chem.ChiralType.CHI_UNSPECIFIED]
        bonds = [b.GetIdx() for b in mol.GetBonds()
                 if b.GetStereo() in BOND_FLIP]
        for idx in elems:
            w = Chem.RWMol(mol)
            a = w.GetAtomWithIdx(idx)
            a.SetChiralTag(
                Chem.ChiralType.CHI_TETRAHEDRAL_CCW
                if a.GetChiralTag() == Chem.ChiralType.CHI_TETRAHEDRAL_CW
                else Chem.ChiralType.CHI_TETRAHEDRAL_CW)
            alt = Chem.MolToSmiles(w.GetMol())
            tag_flips += 1
            chk.ok(alt != smi, "tag flip at atom %d still matches %s"
                   % (idx, row["name"]), "structure-direction flips")
        for idx in bonds:
            w = Chem.RWMol(mol)
            b = w.GetBondWithIdx(idx)
            b.SetStereo(BOND_FLIP[b.GetStereo()])
            alt = Chem.MolToSmiles(w.GetMol())
            tag_flips += 1
            chk.ok(alt != smi, "tag flip at bond %d still matches %s"
                   % (idx, row["name"]), "structure-direction flips")

    print("name-direction descriptor flips: %d" % name_flips)
    print("structure-direction tag flips: %d" % tag_flips)

    lib = {}
    for r in load_library():
        lib.setdefault(r["name"], r)
    for name, c3, stem, c7 in CONTROLS:
        stored = lib.get(name)
        chk.ok(stored is not None, "control row %s absent" % name,
               "control row present")
        if stored is None:
            continue
        letters = {"core": ["R", "R"],
                   "c3": ["Z"] * len(C3_PREFIX[c3][1]),
                   "c7": []}
        for i in range(len(C7_PREFIX[c7][1])):
            letters["c7"].append(
                "R" if isinstance(C7_PREFIX[c7][1][i], int) else "Z")
        hname = house_name(c3, stem, c7, letters)
        got = try_name(hname)
        chk.ok(got is not None and got == canon(stored["smiles"]),
               "positive control %s: %s" % (name, hname),
               "positive controls")
        alt = dict(letters)
        alt["core"] = ["S", "R"]
        flipped = try_name(house_name(c3, stem, c7, alt))
        chk.ok(flipped is None or flipped != canon(stored["smiles"]),
               "(6S,7R) flip control %s still reproduces the row" % name,
               "(6S,7R) flip controls")

    good = house_name("methyl", "acid", "aminophenylacetylamino",
                      {"core": ["R", "R"], "c3": [], "c7": ["R"]})
    negatives = [
        ("missing core block", good[good.index("-") + 1:]),
        ("invalid core descriptor letter", good.replace("(6R,", "(6Q,", 1)),
        ("invalid side-chain descriptor letter",
         good.replace("(2R)", "(2Q)", 1)),
        ("missing side-chain descriptor", good.replace("(2R)", "()", 1)),
        ("empty core descriptors", good.replace("(6R,7R)", "(6,7)", 1)),
        ("unknown C3 prefix", good.replace("3-methyl", "3-ethyl", 1)),
        ("wrong locant on core prefix", good.replace("(6R,7R)", "(5R,7R)", 1)),
        ("unknown stem", good.replace("oct-2-ene", "oct-3-ene", 1)),
    ]
    for label, bad in negatives:
        chk.ok(try_name(bad) is None,
               "negative control resolved: %s" % label,
               "negative controls")

    print("constants checked: %d" % nconst)
    for kind, num in sorted(chk.kinds.items()):
        print("  assertions [%s]: %d" % (kind, num))
    print("assertions: %d" % chk.n)
    print("failures: %d" % len(chk.fail))
    for f in chk.fail:
        print("FAIL %s" % f)
    return 1 if chk.fail else 0


if __name__ == "__main__":
    sys.exit(main())
