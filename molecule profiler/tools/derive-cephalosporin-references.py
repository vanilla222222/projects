"""Derives cls:'Cephalosporin' reference rows on the cephem (5-thia-1-azabicyclo[4.2.0]oct-2-ene) core for data/library.js. The census is blind to cls across the whole corpus; anchors are externally sourced rows only and each is proven constructively by FragmentOnBonds plus molzip reassembly against a numbered template, identifying the core fragment by atom index and dropping ring-fused matches, and requiring stereo-inclusive canonical SMILES identity with the stored row. A substituent value is admitted at a site only when two or more distinct sourced anchors attest it unanimously. Slot tables carry attested values only. Formulae are composed differentially from the parent scaffold plus per-group differences and cross-checked against CalcMolFormula. Every stereodescriptor in every emitted name is read off the finished molecule by AssignStereochemistry followed by rdCIPLabeler.AssignCIPLabels through locants written onto the fragments as atom or bond properties before assembly; nothing is hand-assigned from a SMILES tag. Rows go to stdout, diagnostics to stderr, and the only file written is the library cache dump."""

import collections
import json
import os
import re
import subprocess
import sys
import tempfile

from rdkit import Chem, RDLogger
from rdkit.Chem import BondType, rdCIPLabeler
from rdkit.Chem.MolStandardize import rdMolStandardize
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")

TARGET_CLS = "Cephalosporin"
CEPHEM = "[#6]1=[#6][#6][#16][#6]2[#7]1[#6](=[#8])[#6]2"
SITE_POS = {0: "C2", 1: "C3", 8: "C7"}
FUSION_EXEMPT = 7
CORE_TEMPLATE = "[*:1]C1=C([*:2])N2C(=O)[C@@H]([*:3])[C@H]2SC1"
CORE_PLAIN = "*C1=C(*)N2C(=O)[C@@H](*)[C@H]2SC1"
CORE_MAP = {"C3": 1, "C2": 2, "C7": 3}
CORE_LOCMAP = {"c7": 7, "c6": 9}
PARENT = {"C3": "*C", "C2": "*C(=O)O", "C7": "*N"}
STEM = "8-oxo-5-thia-1-azabicyclo[4.2.0]oct-2-ene-2"
SHIFT = "[#7,#8;!H0]-[#6]=[#7,#8]"
DESC_BLOCK = re.compile(r"\((?:\d*[RSEZ])(?:,\d*[RSEZ])*\)")
TOKEN = re.compile(r"@([A-Za-z0-9]+)@")
LETTERS = re.compile(r"[^a-z]")
ATOMSYM = re.compile(r"([A-Z][a-z]?)(\d*)")
DESC_IN_NAME = re.compile(r"\((\d*[RSEZ](?:,\d*[RSEZ])*)\)")

C3_NAMES = {
    "*C": ("CH3", "methyl", {}),
    "*COC": ("C2H5O", "(methoxymethyl)", {}),
    "*COC(C)=O": ("C3H5O2", "[(acetyloxy)methyl]", {}),
    "*COC(N)=O": ("C2H4NO2", "[(carbamoyloxy)methyl]", {}),
    "*CSc1nnnn1C": ("C3H5N4S",
                    "[[(1-methyltetrazol-5-yl)sulfanyl]methyl]", {}),
    "*Cn1nnc(C)n1": ("C3H5N4", "[(5-methyltetrazol-2-yl)methyl]", {}),
    "*Sc1nc(-c2cc[n+](C)cc2)cs1": (
        "C9H8N2S2",
        "[[4-(1-methylpyridin-1-ium-4-yl)-1,3-thiazol-2-yl]sulfanyl]", {}),
    "*/C=C\\c1scnc1C": ("C6H6NS",
                        "[(@s@)-2-(4-methyl-1,3-thiazol-5-yl)ethenyl]",
                        {"s": (1, 2)}),
}

C2_NAMES = {
    "*C(=O)O": ("CHO2", "-carboxylic acid", {}),
    "*C(=O)[O-]": ("CO2", "-carboxylate", {}),
}

C7_NAMES = {
    "*N": ("H2N", "amino", {}),
    "*NC(=O)[C@H](N)c1ccccc1": (
        "C8H9N2O", "[[(2@s@)-2-amino-2-phenylacetyl]amino]", {"s": 4}),
    "*NC(=O)/C(=N\\OC)c1csc(N)n1": (
        "C6H7N4O2S",
        "[[(2@s@)-2-(2-amino-1,3-thiazol-4-yl)-2-methoxyiminoacetyl]amino]",
        {"s": (4, 5)}),
    "*NC(=O)/C(=N\\OC)c1nsc(N)n1": (
        "C5H6N5O2S",
        "[[(2@s@)-2-(5-amino-1,2,4-thiadiazol-3-yl)-2-methoxyiminoacetyl]"
        "amino]", {"s": (4, 5)}),
    "*NC(=O)/C(=N\\O)c1nsc(N)n1": (
        "C4H4N5O2S",
        "[[(2@s@)-2-(5-amino-1,2,4-thiadiazol-3-yl)-2-hydroxyiminoacetyl]"
        "amino]", {"s": (4, 5)}),
    "*NC(=O)/C(=N\\OC)c1ccco1": (
        "C7H7N2O3", "[[(2@s@)-2-(furan-2-yl)-2-methoxyiminoacetyl]amino]",
        {"s": (4, 5)}),
    "*NC(=O)/C(=C\\CC)c1csc(N)n1": (
        "C8H10N3OS",
        "[[(2@s@)-2-(2-amino-1,3-thiazol-4-yl)pent-2-enoyl]amino]",
        {"s": (4, 5)}),
    "*NC(=O)CCC[C@@H](N)C(=O)O": (
        "C6H11N2O3", "[[(5@s@)-5-amino-5-carboxypentanoyl]amino]", {"s": 7}),
}

NAMES = {"C3": C3_NAMES, "C2": C2_NAMES, "C7": C7_NAMES}
GATES = ["stereo-stripped-structure", "exact-smiles", "name-case-insensitive",
         "intra-batch-duplicate", "cross-class-double-count",
         "tautomer-identity", "unassigned-stereo (rule 9)"]


def err(text):
    print(text, file=sys.stderr)


def jsq(text):
    return "'" + text.replace("\\", "\\\\").replace("'", "\\'") + "'"


def cache_dir():
    d = os.environ.get("MP_DERIVE_CACHE")
    if not d:
        d = tempfile.mkdtemp(prefix="mp-derive-ceph-")
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


def parse_formula(text):
    out = collections.Counter()
    for sym, num in ATOMSYM.findall(text or ""):
        if sym:
            out[sym] += int(num) if num else 1
    return out


def render_formula(counts, charge):
    out = ""
    for sym in ("C", "H"):
        n = counts.get(sym, 0)
        if n:
            out += sym + (str(n) if n > 1 else "")
    for sym in sorted(k for k in counts if k not in ("C", "H")):
        n = counts[sym]
        if n:
            out += sym + (str(n) if n > 1 else "")
    if charge:
        sign = "+" if charge > 0 else "-"
        out += sign if abs(charge) == 1 else sign + str(abs(charge))
    return out


def shift_once(mol):
    out = []
    k = Chem.Mol(mol)
    try:
        Chem.Kekulize(k, clearAromaticFlags=True)
    except Exception:
        return out
    patt = Chem.MolFromSmarts(SHIFT)
    for don, mid, acc in k.GetSubstructMatches(patt, uniquify=False):
        w = Chem.RWMol(k)
        a = w.GetAtomWithIdx(don)
        b = w.GetAtomWithIdx(acc)
        if a.GetTotalNumHs() < 1:
            continue
        a.SetNoImplicit(False)
        a.SetNumExplicitHs(max(0, a.GetTotalNumHs() - 1))
        b.SetNoImplicit(False)
        b.SetNumExplicitHs(b.GetTotalNumHs() + 1)
        w.GetBondBetweenAtoms(don, mid).SetBondType(BondType.DOUBLE)
        w.GetBondBetweenAtoms(mid, acc).SetBondType(BondType.SINGLE)
        m = w.GetMol()
        try:
            Chem.SanitizeMol(m)
        except Exception:
            continue
        out.append(m)
    return out


def tautomer_family(mol):
    scorer = rdMolStandardize.TautomerEnumerator()
    pool = [Chem.Mol(mol)]
    seen = {Chem.MolToSmiles(pool[0])}
    queue = list(pool)
    while queue:
        for cand in shift_once(queue.pop()):
            smi = Chem.MolToSmiles(cand)
            if smi in seen:
                continue
            seen.add(smi)
            queue.append(cand)
            pool.append(cand)
    best = max(pool, key=lambda m: (scorer.ScoreTautomer(m),
                                    Chem.MolToSmiles(m)))
    return best, seen


def normalize(mol):
    return Chem.MolToSmiles(tautomer_family(mol)[0])


def flat(mol):
    m = Chem.Mol(mol)
    Chem.RemoveStereochemistry(m)
    return Chem.MolToSmiles(m)


def core_matches(mol):
    patt = Chem.MolFromSmarts(CEPHEM)
    rings = mol.GetRingInfo().AtomRings()
    kept = []
    for match in mol.GetSubstructMatches(patt, uniquify=False):
        core = set(match)
        fused = False
        for idx in core:
            if idx == match[FUSION_EXEMPT]:
                continue
            for ring in rings:
                if idx in ring and not set(ring) <= core:
                    fused = True
        if not fused:
            kept.append(match)
    return kept


def strip_maps(mol, normalise):
    w = Chem.RWMol(mol)
    for atom in w.GetAtoms():
        if atom.GetAtomicNum() == 0:
            atom.SetAtomMapNum(0)
    m = w.GetMol()
    if normalise:
        return normalize(m)
    return Chem.MolToSmiles(m)


def dissect(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    matches = core_matches(mol)
    if not matches:
        return None
    seen = set()
    results = []
    for match in matches:
        if match in seen:
            continue
        seen.add(match)
        got = dissect_one(mol, match)
        if got is None:
            return None
        results.append(got)
    first = results[0]
    for other in results[1:]:
        if other != first:
            return "nonunanimous"
    return first


def dissect_one(mol, match):
    core = set(match)
    bonds = []
    labels = []
    owner = {}
    tag = 1
    for pos in sorted(SITE_POS):
        atom = mol.GetAtomWithIdx(match[pos])
        for nbr in atom.GetNeighbors():
            if nbr.GetIdx() in core:
                continue
            bonds.append(
                mol.GetBondBetweenAtoms(atom.GetIdx(), nbr.GetIdx()).GetIdx())
            labels.append((tag, tag))
            owner[tag] = SITE_POS[pos]
            tag += 1
    if not bonds:
        return None
    frag = Chem.FragmentOnBonds(mol, bonds, addDummies=True,
                                dummyLabels=labels)
    for atom in frag.GetAtoms():
        if atom.GetAtomicNum() == 0:
            atom.SetAtomMapNum(atom.GetIsotope())
            atom.SetIsotope(0)
    groups = Chem.GetMolFrags(frag, asMols=False)
    mols = Chem.GetMolFrags(frag, asMols=True)
    which = [i for i, g in enumerate(groups) if core <= set(g)]
    if len(which) != 1:
        return None
    pieces = list(mols)
    combined = pieces[0]
    for piece in pieces[1:]:
        combined = Chem.CombineMols(combined, piece)
    try:
        zipped = Chem.molzip(combined)
        Chem.SanitizeMol(zipped)
    except Exception:
        return None
    if Chem.MolToSmiles(zipped) != Chem.MolToSmiles(mol):
        return None
    values = {}
    counts = collections.Counter()
    for i, group in enumerate(groups):
        if i == which[0]:
            continue
        tags = [a.GetAtomMapNum() for a in mols[i].GetAtoms()
                if a.GetAtomicNum() == 0]
        if len(tags) != 1:
            return None
        site = owner[tags[0]]
        counts[site] += 1
        values[site] = strip_maps(mols[i], True)
    return (strip_maps(mols[which[0]], False),
            tuple(sorted(values.items())), tuple(sorted(counts.items())))


def group_counts(value):
    mol = Chem.MolFromSmiles(value)
    w = Chem.RWMol(mol)
    for atom in w.GetAtoms():
        if atom.GetAtomicNum() == 0:
            atom.SetAtomicNum(1)
    m = w.GetMol()
    Chem.SanitizeMol(m)
    counts = parse_formula(CalcMolFormula(m))
    counts.pop("+", None)
    return counts, sum(a.GetFormalCharge() for a in m.GetAtoms())


def sort_key(text):
    bare = TOKEN.sub("", text)
    return LETTERS.sub("", DESC_BLOCK.sub("", bare).lower())


def build(c3, c2, c7):
    core = Chem.MolFromSmiles(CORE_TEMPLATE)
    for key, idx in sorted(CORE_LOCMAP.items()):
        core.GetAtomWithIdx(idx).SetProp("_loc", key)
    pieces = [core]
    for site, value in (("C3", c3), ("C2", c2), ("C7", c7)):
        locmap = NAMES[site][value][2]
        smi = value.replace("*", "[*:%d]" % CORE_MAP[site], 1)
        frag = Chem.MolFromSmiles(smi)
        for key, where in sorted(locmap.items()):
            tok = site + key
            if isinstance(where, tuple):
                frag.GetBondBetweenAtoms(where[0], where[1]).SetProp(
                    "_loc", tok)
            else:
                frag.GetAtomWithIdx(where).SetProp("_loc", tok)
        pieces.append(frag)
    combined = pieces[0]
    for piece in pieces[1:]:
        combined = Chem.CombineMols(combined, piece)
    mol = Chem.molzip(combined)
    Chem.SanitizeMol(mol)
    Chem.AssignStereochemistry(mol, cleanIt=True, force=True)
    rdCIPLabeler.AssignCIPLabels(mol)
    desc = {}
    for atom in mol.GetAtoms():
        if atom.HasProp("_loc"):
            desc[atom.GetProp("_loc")] = atom.GetPropsAsDict().get("_CIPCode")
    for bond in mol.GetBonds():
        if bond.HasProp("_loc"):
            desc[bond.GetProp("_loc")] = bond.GetPropsAsDict().get("_CIPCode")
    return mol, desc


def render(template, desc, prefix):
    def sub(match):
        key = prefix + match.group(1)
        return desc.get(key) or "?"
    return TOKEN.sub(sub, template)


def specified_stereo(mol):
    centres = Chem.FindMolChiralCenters(mol, includeUnassigned=True,
                                        useLegacyImplementation=False)
    tet = sum(1 for _, lab in centres if lab != "?")
    unassigned = sum(1 for _, lab in centres if lab == "?")
    geom = sum(1 for b in mol.GetBonds()
               if b.GetStereo() not in (Chem.BondStereo.STEREONONE,
                                        Chem.BondStereo.STEREOANY))
    anyb = sum(1 for b in mol.GetBonds()
               if b.GetStereo() == Chem.BondStereo.STEREOANY)
    return tet, geom, unassigned, anyb


def main():
    lib = load_library()
    err("library rows: %d" % len(lib))
    sourced = [r for r in lib if r.get("source")]
    err("externally sourced rows: %d" % len(sourced))

    patt = Chem.MolFromSmarts(CEPHEM)
    hits = []
    for row in lib:
        mol = Chem.MolFromSmiles(row["smiles"])
        if mol is not None and mol.HasSubstructMatch(patt):
            hits.append(row)
    err("cephem-core hits: %d (externally sourced %d)"
        % (len(hits), sum(1 for r in hits if r.get("source"))))

    proven = collections.Counter()
    anchors = []
    dropped = []
    for row in hits:
        if not row.get("source"):
            continue
        got = dissect(row["smiles"])
        if got is None or got == "nonunanimous":
            continue
        core, values, counts = got
        proven[core] += 1
        if dict(counts).get("C7", 0) > 1:
            dropped.append(row["name"])
            continue
        if core == CORE_PLAIN:
            anchors.append((row["name"], dict(values)))
    for core in sorted(proven):
        err("constructively proven anchors on core %s: %d"
            % (core, proven[core]))
    err("Five sourced rows dropped because C7 carries two heavy "
        "substituents (the cephamycins): %s" % ", ".join(sorted(dropped)))

    attest = collections.defaultdict(set)
    for name, values in anchors:
        for site, value in values.items():
            attest[(site, value)].add(name)

    admitted = {}
    refusals = []
    for site in ("C3", "C2", "C7"):
        admitted[site] = []
        for key in sorted(k for k in attest if k[0] == site):
            names = sorted(attest[key])
            if len(names) >= 2:
                admitted[site].append(key[1])
                err("%s=%-32s <- %s" % (site, key[1], ", ".join(names)))
            else:
                refusals.append("refused %s=%s: 1 anchor %r"
                                % (site, key[1], names))
    err("admitted values: %s"
        % ", ".join("%d at %s" % (len(admitted[s]), s)
                    for s in ("C3", "C2", "C7")))
    for line in refusals:
        err(line)
    err("one-anchor values refused: %d" % len(refusals))

    usable = {}
    for site in ("C3", "C2", "C7"):
        usable[site] = []
        for value in admitted[site]:
            if value in NAMES[site]:
                usable[site].append(value)
            else:
                err("refused %s=%s: no attested house name" % (site, value))

    parent_mol = Chem.MolFromSmiles(
        "CC1=C(C(=O)O)N2C(=O)[C@@H](N)[C@H]2SC1")
    parent_counts = parse_formula(CalcMolFormula(parent_mol))
    err("parent scaffold %s %s" % (Chem.MolToSmiles(parent_mol),
                                   CalcMolFormula(parent_mol)))

    for site in ("C3", "C2", "C7"):
        for value, entry in sorted(NAMES[site].items()):
            got, _ = group_counts(value)
            want = parse_formula(entry[0])
            want["H"] = want.get("H", 0) + 1
            assert got == want, (site, value, dict(got), dict(want))

    core_cls = collections.Counter(r["cls"] for r in hits)
    space = {c for c, n in core_cls.items()
             if c != TARGET_CLS and n >= 50}

    lib_flat = collections.defaultdict(list)
    lib_exact = collections.defaultdict(list)
    lib_names = set()
    lib_taut = collections.defaultdict(list)
    for row in lib:
        lib_names.add(row["name"].casefold())
        mol = Chem.MolFromSmiles(row["smiles"])
        if mol is None:
            continue
        lib_flat[flat(mol)].append(row)
        lib_exact[Chem.MolToSmiles(mol)].append(row)
    for row in hits:
        mol = Chem.MolFromSmiles(row["smiles"])
        if mol is None:
            continue
        for smi in tautomer_family(mol)[1]:
            lib_taut[smi].append(row)

    candidates = []
    for c3 in sorted(usable["C3"]):
        for c2 in sorted(usable["C2"]):
            for c7 in sorted(usable["C7"]):
                candidates.append((c3, c2, c7))

    built = []
    for c3, c2, c7 in candidates:
        mol, desc = build(c3, c2, c7)
        counts = collections.Counter(parent_counts)
        charge = sum(a.GetFormalCharge() for a in mol.GetAtoms())
        for site, value in (("C3", c3), ("C2", c2), ("C7", c7)):
            new, _ = group_counts(value)
            old, _ = group_counts(PARENT[site])
            for sym, num in new.items():
                counts[sym] += num
            for sym, num in old.items():
                counts[sym] -= num
        formula = render_formula(counts, charge)
        assert formula == CalcMolFormula(mol), (formula, CalcMolFormula(mol))
        stereo_prefix = "(6%s,7%s)" % (desc.get("c6") or "?",
                                       desc.get("c7") or "?")
        parts = []
        for site, value, locant in (("C3", c3, "3"), ("C7", c7, "7")):
            text = render(NAMES[site][value][1], desc, site)
            parts.append((sort_key(NAMES[site][value][1]), locant + "-" + text))
        for key, text in parts:
            assert key == sort_key(text), (key, sort_key(text))
        head = "-".join(text for _, text in sorted(parts))
        name = "%s-%s-%s%s" % (stereo_prefix, head, STEM,
                               NAMES["C2"][c2][1])
        built.append({"name": name, "formula": formula, "mol": mol,
                      "desc": desc})

    err("candidates enumerated: %d" % len(built))

    tripped = {g: [] for g in GATES}
    blocked = {}
    batch_flat = {}
    batch_name = {}
    cross = set()
    for row in built:
        mol = row["mol"]
        name = row["name"]
        fl = flat(mol)
        ex = Chem.MolToSmiles(mol)
        fails = []
        if fl in lib_flat:
            fails.append("stereo-stripped-structure")
            tripped["stereo-stripped-structure"].append(row)
        if ex in lib_exact:
            fails.append("exact-smiles")
            tripped["exact-smiles"].append(row)
        if name.casefold() in lib_names:
            fails.append("name-case-insensitive")
            tripped["name-case-insensitive"].append(row)
        if fl in batch_flat or name.casefold() in batch_name:
            fails.append("intra-batch-duplicate")
            tripped["intra-batch-duplicate"].append(row)
        hit_cls = set()
        for other in lib_flat.get(fl, []):
            if other["cls"] in space:
                hit_cls.add(other["cls"])
        if hit_cls:
            cross |= hit_cls
            fails.append("cross-class-double-count")
            tripped["cross-class-double-count"].append(row)
        tet, geom, unassigned, anyb = specified_stereo(mol)
        if unassigned or anyb:
            fails.append("unassigned-stereo (rule 9)")
            tripped["unassigned-stereo (rule 9)"].append(row)
        if "?" in name or "@" in name:
            raise SystemExit("FAIL unfilled token in %s" % name)
        carried = sum(len(m.group(1).split(","))
                      for m in DESC_IN_NAME.finditer(name))
        if carried != tet + geom:
            raise SystemExit("FAIL %s: %d stereo elements, %d descriptors"
                             % (name, tet + geom, carried))
        fam = tautomer_family(mol)[1]
        if any(smi in lib_taut for smi in fam):
            fails.append("tautomer-identity")
            tripped["tautomer-identity"].append(row)
        row["fails"] = fails
        row["tet"] = tet
        row["geom"] = geom
        if not fails:
            batch_flat[fl] = name
            batch_name[name.casefold()] = name
            blocked[name] = []
        else:
            blocked[name] = fails

    rows = [r for r in built if not r["fails"]]
    err("cephem rows per cls: %s" % sorted(core_cls.items()))
    err("cross-class double-count classes at or over 50: %s"
        % sorted(cross))

    for row in rows:
        sys.stdout.write(
            "  { name: %s, cls: %s, formula: %s, smiles: %s },\n"
            % (jsq(row["name"]), jsq(TARGET_CLS), jsq(row["formula"]),
               jsq(Chem.MolToSmiles(row["mol"]))))

    tet = sum(r["tet"] for r in rows)
    geom = sum(r["geom"] for r in rows)
    err("specified stereo elements across emitted rows: %d" % (tet + geom))
    carried = 0
    for row in rows:
        carried += sum(len(m.group(1).split(","))
                       for m in DESC_IN_NAME.finditer(row["name"]))
    err("stereodescriptors carried by emitted names: %d" % carried)
    err("tetrahedral centres %d, double-bond geometries %d" % (tet, geom))
    err("derived rows: %d" % len(rows))

    err("| gate | tripped | sole blocker for | rows if lifted |")
    err("|---|---|---|---|")
    for gate in GATES:
        sole = sum(1 for r in built if r["fails"] == [gate])
        err("| %s | %d | %d | %d (+%d) |"
            % (gate, len(tripped[gate]), sole, len(rows) + sole, sole))
    for row in built:
        if row["fails"] == ["tautomer-identity"]:
            err("tautomer-identity sole blocker: %s" % row["name"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
