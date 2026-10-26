# Derives Methylxanthine reference rows for data/library.js by the
# template-anchored method.
#
# The class holds only two rows (Theobromine, Paraxanthine), both N-monoacidic
# xanthines. The derivable space is the fully N-substituted xanthine
# (purine-2,6-dione) core, which is where the documented drug chemistry lives:
# the library's own externally sourced rows supply 30 such compounds, and they
# vary four sites independently -- N1, N3, N7 and C8. Each option below is
# taken from one of those sourced rows, so every slot value is documented
# chemistry rather than invention: N1 hexyl from pentifylline, 5-oxohexyl from
# propentofylline, 5-hydroxyhexyl from lisofylline, 2-hydroxypropyl from
# protheobromine; N3 ethyl from istradefylline, propyl from propentofylline;
# N7 2-hydroxyethyl from etofylline, 2,3-dihydroxypropyl from diprophylline,
# 2-hydroxypropyl from proxyphylline, 2-(dimethylamino)ethyl from dimethazan,
# 2-(diethylamino)ethyl from etamiphylline, benzyl from
# 7-benzyl-1,3-dimethyl-8-piperazin-1-ylpurine-2,6-dione, 5-oxohexyl from
# lomifylline, the pyridinylmethylaminoethyl chain from pimefylline, the
# ethyl(2-hydroxyethyl)aminoethyl chain from bamifylline, propyl from
# propentofylline; C8 benzyl from
# bamifylline, piperazin-1-yl and the two arylethenyls from the rows just
# named, 2-hydroxyethyl(methyl)amino from cafaminol, chloro and bromo from
# 8-chlorotheophylline and pamabrom.
#
# Every anchor used is an externally sourced row, proven here by regenerating
# it from the template and matching stereo-stripped canonical SMILES; the
# class's own two hand-written rows are never used as anchors. Formulae are
# composed differentially from caffeine and cross-checked against RDKit.
#
# Two deliberate restrictions. No slot value carries a carboxylic acid: that
# group would become the principal characteristic group and change the parent
# hydride (PubChem names acefylline as an acetic acid, not as a purinedione),
# so acefylline is proven as an anchor but its side chain is not enumerated.
# And every emitted row keeps at least one N-methyl, so that it is a
# methylxanthine and not merely a xanthine.
#
# Ring-closure digits 1 and 2 are reserved for the purinedione bicycle, so
# substituent rings start at 3.

import re
import sys

from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")

LIBRARY = "/home/user/projects/molecule profiler/data/library.js"
CLS = "Methylxanthine"
TARGET = 48

PLAIN = re.compile(
    r"\{ name: '([^']*)', cls: '([^']*)', formula: '([^']*)', smiles: '([^']*)'"
)
JSON = re.compile(
    r'\{"name":"((?:[^"\\]|\\.)*)","cls":"((?:[^"\\]|\\.)*)",'
    r'"formula":"((?:[^"\\]|\\.)*)","smiles":"((?:[^"\\]|\\.)*)"'
)

ATOM = re.compile(r"([A-Z][a-z]?)(\d*)")
LETTERS = re.compile(r"[^a-z]")
STEREO = re.compile(r"\((?:E|Z)\)-")
MULT = {2: "di", 3: "tri", 4: "tetra", 5: "penta"}

TEMPLATE = "c1{C8}nc2c(n1{N7})c(=O)n({N1})c(=O)n2{N3}"
STEM = "purine-2,6-dione"
PARENT = "C8H10N4O2"

# site -> { fragment SMILES: (radical formula, prefix name) }. The first entry
# of each site is the null, i.e. the group caffeine already carries there.
SLOTS = {
    "N1": [
        ("C", "C1H3", "methyl"),
        ("CC", "C2H5", "ethyl"),
        ("CC(C)O", "C3H7O", "2-hydroxypropyl"),
        ("CCCCCC", "C6H13", "hexyl"),
        ("CCCCC(C)=O", "C6H11O", "5-oxohexyl"),
        ("CCCCC(C)O", "C6H13O", "5-hydroxyhexyl"),
    ],
    "N3": [
        ("C", "C1H3", "methyl"),
        ("CC", "C2H5", "ethyl"),
        ("CCC", "C3H7", "propyl"),
    ],
    "N7": [
        ("C", "C1H3", "methyl"),
        ("CCC", "C3H7", "propyl"),
        ("CCO", "C2H5O", "2-hydroxyethyl"),
        ("CC(C)O", "C3H7O", "2-hydroxypropyl"),
        ("CC(O)CO", "C3H7O2", "2,3-dihydroxypropyl"),
        ("CCN(C)C", "C4H10N", "2-(dimethylamino)ethyl"),
        ("CCN(CC)CC", "C6H14N", "2-(diethylamino)ethyl"),
        ("Cc3ccccc3", "C7H7", "benzyl"),
        ("CCCCC(C)=O", "C6H11O", "5-oxohexyl"),
        ("CCNCc3cccnc3", "C8H11N2", "2-(pyridin-3-ylmethylamino)ethyl"),
        ("CCN(CC)CCO", "C6H14NO", "2-[ethyl(2-hydroxyethyl)amino]ethyl"),
    ],
    "C8": [
        ("", "H1", None),
        ("(Cl)", "Cl1", "chloro"),
        ("(Br)", "Br1", "bromo"),
        ("(Cc3ccccc3)", "C7H7", "benzyl"),
        ("(N3CCNCC3)", "C4H9N2", "piperazin-1-yl"),
        ("(N(C)CCO)", "C3H8NO", "2-hydroxyethyl(methyl)amino"),
        ("(/C=C/c3cccc(Cl)c3)", "C8H6Cl", "(E)-2-(3-chlorophenyl)ethenyl"),
        ("(/C=C/c3ccc(OC)c(OC)c3)", "C10H11O2",
         "(E)-2-(3,4-dimethoxyphenyl)ethenyl"),
    ],
}

LOCANT = {"N1": "1", "N3": "3", "N7": "7", "C8": "8"}
ORDER = ["N1", "N3", "N7", "C8"]

# Externally sourced rows this generator must be able to regenerate.
ANCHORS = [
    "dimethazan",
    "diprophylline",
    "etamiphylline",
    "etofylline",
    "lomifylline",
    "pentifylline",
    "pimefylline",
    "propentofylline",
    "protheobromine",
    "proxyphylline",
    "bamifylline",
    "cafaminol",
    "istradefylline",
    "8-(3-chlorostyryl)caffeine",
    "7-benzyl-1,3-dimethyl-8-piperazin-1-yl-3,7-dihydropurine-2,6-dione",
    "1-(5-hydroxyhexyl)-3,7-dimethyl-3,7-dihydro-1H-purine-2,6-dione",
]


def parse_formula(text):
    out = {}
    for sym, num in ATOM.findall(text):
        out[sym] = out.get(sym, 0) + (int(num) if num else 1)
    return out


def render_formula(counts):
    out = ""
    for sym in ["C", "H"] + sorted(s for s in counts if s not in ("C", "H")):
        n = counts.get(sym, 0)
        if n:
            out += sym + (str(n) if n > 1 else "")
    return out


def flat(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    Chem.RemoveStereochemistry(mol)
    return Chem.MolToSmiles(mol)


def enclose(text):
    if "(" in text or "[" in text:
        return "[%s]" % text
    if "-" in text:
        return "(%s)" % text
    return text


def key(text):
    return LETTERS.sub("", STEREO.sub("", text).lower())


def collapse(items):
    """items: list of (locant, prefix name) -> ordered prefix string."""
    groups = {}
    for locant, name in items:
        groups.setdefault(name, []).append(locant)
    parts = []
    for name, locants in groups.items():
        locants = sorted(locants, key=int)
        mult = MULT.get(len(locants), "") if len(locants) > 1 else ""
        parts.append((key(name), "%s-%s%s" % (",".join(locants), mult,
                                              enclose(name))))
    parts.sort()
    return [text for _, text in parts]


def name_row(choice):
    items = []
    for site in ORDER:
        _, _, prefix = SLOTS[site][choice[site]]
        if prefix is not None:
            items.append((LOCANT[site], prefix))
    # the last prefix abuts the stem directly: "1,3,7-trimethylpurine-2,6-dione"
    return "-".join(collapse(items)) + STEM


def build(choice):
    return TEMPLATE.format(**{
        site: SLOTS[site][choice[site]][0] for site in ORDER})


def formula(choice):
    counts = parse_formula(PARENT)
    for site in ORDER:
        null = parse_formula(SLOTS[site][0][1])
        new = parse_formula(SLOTS[site][choice[site]][1])
        for sym, n in new.items():
            counts[sym] = counts.get(sym, 0) + n
        for sym, n in null.items():
            counts[sym] = counts.get(sym, 0) - n
    return render_formula({s: n for s, n in counts.items() if n})


def combos():
    out = []
    sizes = [len(SLOTS[s]) for s in ORDER]
    def walk(i, acc):
        if i == len(ORDER):
            out.append(tuple(acc))
            return
        for j in range(sizes[i]):
            walk(i + 1, acc + [j])
    walk(0, [])
    out.sort(key=lambda t: (sum(1 for x in t if x), sum(t), t))
    return [dict(zip(ORDER, t)) for t in out]


def has_methyl(choice):
    return any(SLOTS[site][choice[site]][2] == "methyl"
               for site in ("N1", "N3", "N7"))


def main():
    text = open(LIBRARY, encoding="utf-8").read()
    rows = [(m[0], m[1], m[2], m[3]) for m in PLAIN.findall(text)]
    sourced_rows = [(m[0], m[1], m[2], m[3]) for m in JSON.findall(text)]
    if not rows or not sourced_rows:
        raise SystemExit("FAIL could not parse library rows")

    names = set()
    seen = set()
    sourced = {}
    for name, cls, form, smiles in rows + sourced_rows:
        names.add(name.casefold())
        k = flat(smiles)
        if k:
            seen.add(k)
    for name, cls, form, smiles in sourced_rows:
        sourced[name.casefold()] = smiles

    # Prove the anchors: each must be an externally sourced row that this
    # generator's own template reproduces.
    reachable = {}
    for choice in combos():
        k = flat(build(choice))
        if k and k not in reachable:
            reachable[k] = choice
    proven = []
    for anchor in ANCHORS:
        if anchor.casefold() not in sourced:
            raise SystemExit("FAIL anchor %r is not an externally sourced row"
                             % anchor)
        k = flat(sourced[anchor.casefold()])
        if k not in reachable:
            raise SystemExit("FAIL anchor %r is not regenerated by the template"
                             % anchor)
        proven.append(anchor)
    if len(proven) < 2:
        raise SystemExit("FAIL only %d proven sourced anchors" % len(proven))

    out = []
    skipped = 0
    for choice in combos():
        if len(out) >= TARGET:
            break
        if not has_methyl(choice):
            continue
        smiles = build(choice)
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            raise SystemExit("FAIL unparsable SMILES %s" % smiles)
        stated = formula(choice)
        computed = CalcMolFormula(mol)
        if stated != computed:
            raise SystemExit("FAIL formula %s stated, %s computed for %s"
                             % (stated, computed, smiles))
        canonical = Chem.MolToSmiles(mol)
        k = flat(smiles)
        name = name_row(choice)
        if k in seen or name.casefold() in names:
            skipped += 1
            continue
        seen.add(k)
        names.add(name.casefold())
        out.append((name, stated, canonical))

    if len(out) < TARGET:
        raise SystemExit("FAIL only %d rows available" % len(out))

    for name, form, smiles in out:
        sys.stdout.write("  { name: '%s', cls: '%s', formula: '%s', "
                         "smiles: '%s' },\n" % (name, CLS, form, smiles))
    sys.stderr.write("%d new rows, %d proven sourced anchors, "
                     "%d collisions skipped\n"
                     % (len(out), len(proven), skipped))


if __name__ == "__main__":
    main()
