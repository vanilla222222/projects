"""Derive Methylenedioxy reference rows for molecule profiler's data/library.js: template-anchored, cls-blind SMARTS census, >=2 sourced anchors per site/value pair."""

import itertools
import json
import subprocess
import sys

from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog("rdApp.*")

PROJECT = "/home/user/projects/molecule profiler"
DUMP = (
    "const {LIBRARY}=require('./data/library.js');"
    "process.stdout.write(JSON.stringify(LIBRARY.map("
    "r=>[r.name,r.smiles,r.cls||'',r.source?1:0])));"
)

CLS = "Methylenedioxy"
TARGET = 50

CENSUS_SMARTS = "C1Oc2ccccc2O1"
CENSUS_STRICT = "[CH2]1Oc2ccccc2O1"

SMARTS_POSITIVES = {
    "safrole": "C=CCc1ccc2OCOc2c1",
    "MDMA": "CNC(C)Cc1ccc2OCOc2c1",
    "piperine": "O=C(/C=C/C=C/c1ccc2OCOc2c1)N1CCCCC1",
    "paroxetine": "Fc1ccc(cc1)C1CCNCC1COc1ccc2OCOc2c1",
    "tadalafil": "CN1CC(=O)N2C(C1=O)Cc1c([nH]c3ccccc13)C2c1ccc2OCOc2c1",
    "oxolinic acid": "CCn1cc(C(=O)O)c(=O)c2cc3OCOc3cc12",
    "MDPV": "CCCC(C(=O)c1ccc2OCOc2c1)N1CCCC1",
    "naphtho[2,3-d][1,3]dioxole": "c1ccc2cc3OCOc3cc2c1",
    "2,2-difluoro-1,3-benzodioxole": "FC1(F)Oc2ccccc2O1",
}

SMARTS_NEGATIVES = {
    "2,3-dihydro-1,4-benzodioxine": "C1COc2ccccc2O1",
    "1,4-benzodioxine": "c1ccc2OC=COc2c1",
    "catechol": "Oc1ccccc1O",
    "veratrole": "COc1ccccc1OC",
    "1,3-dioxolane": "C1OCCO1",
    "aliphatic methylenedioxy": "C1OC2CCCCC2O1",
    "indole": "c1ccc2[nH]ccc2c1",
    "2,4-dimethoxyamphetamine": "COc1ccc(CC(C)N)cc1OC",
    "benzofuran": "c1ccc2occc2c1",
    "1,3-dioxole": "C1OC=CO1",
}

CORE_E = "c1(-c2ccc3OCOc3c2)cc4ccccc4o1"
SITES_E = {"R5": 13, "R7": 15}
VALUES_E = {
    "R5": {
        "CCCO": "C3H7O",
        "CCCOC(C)=O": "C5H9O2",
        "CCCOC(=O)CC": "C6H11O2",
        "CCCOC(=O)CCC": "C7H13O2",
        "CCCOC(=O)C(C)C": "C7H13O2",
        "CCCOC(=O)[C@@H](C)CC": "C8H15O2",
        "CCCOC(=O)CCCCCCC/C=C\\CCCCCCCC": "C21H39O2",
        "CCCOC(=O)CCCCCCC/C=C\\C/C=C\\CCCCC": "C21H37O2",
        "CCCO[C@@H]1O[C@H](CO)[C@@H](O)[C@H](O)[C@H]1O": "C9H17O7",
    },
    "R7": {"": "H", "OC": "CH3O"},
}
ANCHORS_E = {
    "egonol": {"R5": "CCCO", "R7": "OC"},
    "7-demethoxyegonol": {"R5": "CCCO", "R7": ""},
    "egonol acetate": {"R5": "CCCOC(C)=O", "R7": "OC"},
    "7-demethoxylegonol acetate": {"R5": "CCCOC(C)=O", "R7": ""},
    "egonolpropanoate": {"R5": "CCCOC(=O)CC", "R7": "OC"},
    "egonolbutanoate": {"R5": "CCCOC(=O)CCC", "R7": "OC"},
    "egonol-2-methylpropanoate": {"R5": "CCCOC(=O)C(C)C", "R7": "OC"},
    "egonol-2'''-methyl butanoate": {"R5": "CCCOC(=O)[C@@H](C)CC", "R7": "OC"},
    "7-demethoxylegonol-2-methylbutanoate": {"R5": "CCCOC(=O)[C@@H](C)CC", "R7": ""},
    "egonol oleate": {"R5": "CCCOC(=O)CCCCCCC/C=C\\CCCCCCCC", "R7": "OC"},
    "7-demethoxyegonol oleate": {"R5": "CCCOC(=O)CCCCCCC/C=C\\CCCCCCCC", "R7": ""},
    "egonol-9(Z),12(Z)linoleate": {
        "R5": "CCCOC(=O)CCCCCCC/C=C\\C/C=C\\CCCCC", "R7": "OC"},
    "7-demethoxyegonol-9(Z),12(Z)linoleate": {
        "R5": "CCCOC(=O)CCCCCCC/C=C\\C/C=C\\CCCCC", "R7": ""},
    "egonol beta-D-glucoside": {
        "R5": "CCCO[C@@H]1O[C@H](CO)[C@@H](O)[C@H](O)[C@H]1O", "R7": "OC"},
}

CORE_O = "O=C1c2ccccc2-c2c3c(cc4ccnc1c24)OCO3"
SITES_O = {"P5": 5, "P6": 6, "P11": 11}
VALUES_O = {
    "P5": {"": "H", "O": "HO"},
    "P6": {"": "H", "OC": "CH3O"},
    "P11": {"": "H", "OC": "CH3O"},
}
ANCHORS_O = {
    "liriodenine": {"P5": "", "P6": "", "P11": ""},
    "atherospermidine": {"P5": "", "P6": "", "P11": "OC"},
    "7-oxohernangerine": {"P5": "O", "P6": "OC", "P11": ""},
    "lindechunine A": {"P5": "O", "P6": "OC", "P11": "OC"},
}

CORES = {
    "benzofuranylbenzodioxole (egonol)": (CORE_E, SITES_E, VALUES_E, ANCHORS_E),
    "oxoaporphine (liriodenine)": (CORE_O, SITES_O, VALUES_O, ANCHORS_O),
}

NAME_GRAMMAR_WITNESS = {
    "benzofuranylbenzodioxole (egonol)": None,
    "oxoaporphine (liriodenine)": None,
}

SURVEY_CORES = {
    "open MDA / MDMA core": ("c1cc2OCOc2cc1CC(C)N", (9, 10, 11)),
    "open methylenedioxycathinone core": ("c1cc2OCOc2cc1C(=O)C(C)N", (9, 11, 12)),
    "open methylenedioxyphenethylamine core": ("c1cc2OCOc2cc1CCN", (9, 10)),
    "open piperonylamine core": ("c1cc2OCOc2cc1CN", (9,)),
    "piperonylpiperazine core": ("c1cc2OCOc2cc1CN1CCNCC1", (9,)),
    "paroxetine core": ("c1ccc(C2CCNCC2COc2ccc3c(c2)OCO3)cc1", ()),
    "aryltetralin lignan core": ("O=C1OCC2Cc3cc4c(cc3C(c3ccccc3)C12)OCO4", ()),
    "dibenzylbutyrolactone lignan core": ("O=C1OCC(Cc2ccc3c(c2)OCO3)C1Cc1ccccc1", ()),
    "1,3-benzodioxole, any attachment": ("c1cc2OCOc2cc1", ()),
}


def flat(smiles):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    Chem.RemoveStereochemistry(mol)
    return Chem.MolToSmiles(mol)


def parse_formula(text):
    out = {}
    sym = ""
    num = ""
    for ch in (text or "") + "$":
        if ch.isupper() or ch == "$":
            if sym:
                out[sym] = out.get(sym, 0) + (int(num) if num else 1)
            sym = ch if ch != "$" else ""
            num = ""
        elif ch.islower():
            sym += ch
        elif ch.isdigit():
            num += ch
    return out


def render_formula(counts):
    order = ["C", "H"]
    rest = sorted(k for k in counts if k not in order and counts[k])
    out = ""
    for s in order + rest:
        n = counts.get(s, 0)
        if n > 1:
            out += s + str(n)
        elif n == 1:
            out += s
    return out


def build(core_smiles, sites, assign):
    core = Chem.MolFromSmiles(core_smiles)
    if core is None:
        return None
    rw = Chem.RWMol(core)
    for site, value in sorted(assign.items()):
        if not value:
            continue
        frag = Chem.MolFromSmiles(value)
        if frag is None:
            return None
        off = rw.GetNumAtoms()
        rw.InsertMol(frag)
        rw.AddBond(sites[site], off, Chem.BondType.SINGLE)
    mol = rw.GetMol()
    try:
        Chem.SanitizeMol(mol)
    except Exception:
        return None
    Chem.AssignStereochemistry(mol, cleanIt=True, force=True)
    return mol


def library():
    out = subprocess.run(["node", "-e", DUMP], cwd=PROJECT, check=True,
                         stdout=subprocess.PIPE)
    return json.loads(out.stdout)


def validate_smarts(log):
    pat = Chem.MolFromSmarts(CENSUS_SMARTS)
    strict = Chem.MolFromSmarts(CENSUS_STRICT)
    missed = [k for k, v in SMARTS_POSITIVES.items()
              if not Chem.MolFromSmiles(v).HasSubstructMatch(pat)]
    false = [k for k, v in SMARTS_NEGATIVES.items()
             if Chem.MolFromSmiles(v).HasSubstructMatch(pat)]
    log("smarts %s validated on %d positives %d negatives: missed %d false %d"
        % (CENSUS_SMARTS, len(SMARTS_POSITIVES), len(SMARTS_NEGATIVES),
           len(missed), len(false)))
    for k in missed:
        log("  smarts missed positive %s" % k)
    for k in false:
        log("  smarts false positive %s" % k)
    strict_missed = [k for k, v in SMARTS_POSITIVES.items()
                     if not Chem.MolFromSmiles(v).HasSubstructMatch(strict)]
    log("strict variant %s missed positives: %s" % (CENSUS_STRICT, strict_missed))
    return pat, (missed, false)


def main():
    log = lambda s: print(s, file=sys.stderr)
    rows_in = library()
    log("library rows measured through the module: %d" % len(rows_in))

    pat, (missed, false) = validate_smarts(log)
    if missed or false:
        log("FAIL census smarts did not validate")
        return 1

    stored = {}
    sourced = set()
    structures = {}
    names = {}
    in_class = 0
    for name, smiles, cls, src in rows_in:
        stored.setdefault(name, smiles)
        if src:
            sourced.add(name)
        if cls == CLS:
            in_class += 1
        names.setdefault(name.casefold(), name)
        k = flat(smiles)
        if k:
            structures.setdefault(k, name)
    need = TARGET - in_class
    log("distinct names %d  externally sourced rows %d  in class '%s' %d  need %d"
        % (len(names), len(sourced), CLS, in_class, need))

    census = []
    for name, smiles, cls, src in rows_in:
        mol = Chem.MolFromSmiles(smiles)
        if mol is not None and mol.HasSubstructMatch(pat):
            census.append((name, smiles, cls, src))
    log("cls-blind census: %d rows carry the motif, %d externally sourced, %d in class '%s'"
        % (len(census), sum(1 for r in census if r[3]),
           sum(1 for r in census if r[2] == CLS), CLS))

    for label in sorted(SURVEY_CORES):
        smarts, acyclic = SURVEY_CORES[label]
        probe = Chem.MolFromSmarts(smarts)
        hit_src = []
        hit_hand = 0
        hit_stereo = 0
        for name, smiles, cls, src in census:
            mol = Chem.MolFromSmiles(smiles)
            ri = mol.GetRingInfo()
            ok = False
            for match in mol.GetSubstructMatches(probe):
                if all(ri.NumAtomRings(match[i]) == 0 for i in acyclic):
                    ok = True
            if ok:
                if src:
                    hit_src.append(name)
                    if Chem.FindMolChiralCenters(mol, includeUnassigned=False):
                        hit_stereo += 1
                else:
                    hit_hand += 1
        log("survey %-42s sourced %3d  stereodefined %2d  hand %2d  %s"
            % (label, len(hit_src), hit_stereo, hit_hand,
               "; ".join(sorted(hit_src))[:58]))

    tally = {"enumerated": 0, "parse": 0, "formula": 0, "structure-collision": 0,
             "name-collision": 0, "name-gate": 0, "emitted": 0}
    emitted = []
    refusals = []
    measured = []

    for label in sorted(CORES):
        core_smiles, sites, values, anchors = CORES[label]
        core = Chem.MolFromSmiles(core_smiles)
        log("")
        log("core %s" % label)
        log("  template %s  sites %s" % (core_smiles, sites))
        base = parse_formula(CalcMolFormula(core))
        log("  parent %s" % render_formula(base))

        proven = {s: {} for s in sites}
        nproven = 0
        for name in sorted(anchors):
            assign = anchors[name]
            if name not in stored:
                refusals.append("%s anchor %s absent from library" % (label, name))
                continue
            if name not in sourced:
                refusals.append("%s anchor %s is not externally sourced" % (label, name))
                continue
            built = build(core_smiles, sites, assign)
            want = Chem.MolFromSmiles(stored[name])
            if built is None or want is None:
                refusals.append("%s anchor %s unparseable" % (label, name))
                continue
            if Chem.MolToSmiles(built) != Chem.MolToSmiles(want):
                refusals.append("%s anchor %s not reproduced stereo-inclusively" % (label, name))
                log("  anchor REFUSED %s" % name)
                continue
            nproven += 1
            for site in sites:
                proven[site].setdefault(assign[site], []).append(name)
            log("  anchor proven (stereo-inclusive) %-44s %s"
                % (name[:44], CalcMolFormula(want)))
        log("  anchors proven %d of %d" % (nproven, len(anchors)))
        if len(core.GetSubstructMatches(core, uniquify=False)) != 1:
            refusals.append("%s: core has an automorphism, locants ambiguous" % label)
            log("  REFUSED core automorphism")
            continue

        admitted = {}
        for site in sorted(sites):
            keep = {}
            for value in values[site]:
                got = proven[site].get(value, [])
                if len(got) >= 2:
                    keep[value] = got
                else:
                    refusals.append(
                        "%s site %s value %r: %d sourced anchors, need 2 (%s)"
                        % (label, site, value or "H", len(got), ", ".join(got) or "none"))
            if len(keep) < 1:
                refusals.append("%s site %s: no value reaches two anchors, site REFUSED"
                                % (label, site))
            admitted[site] = keep
            log("  site %-4s admitted %d of %d values  %s"
                % (site, len(keep), len(values[site]),
                   ", ".join((v or "H") + "[%d]" % len(n) for v, n in sorted(keep.items()))))
        if any(not admitted[s] for s in admitted) or nproven < 2:
            log("  core yields nothing: a site was refused outright")
            continue

        order = sorted(admitted)
        cells = list(itertools.product(*[sorted(admitted[s]) for s in order]))
        log("  cross-product cells %d" % len(cells))
        for combo in cells:
            assign = dict(zip(order, combo))
            tally["enumerated"] += 1
            mol = build(core_smiles, sites, assign)
            if mol is None:
                refusals.append("%s %s: parse" % (label, assign))
                continue
            tally["parse"] += 1
            counts = dict(base)
            for site, value in sorted(assign.items()):
                for sym, n in parse_formula(values[site][value]).items():
                    counts[sym] = counts.get(sym, 0) + n
                counts["H"] = counts.get("H", 0) - 1
            stated = render_formula(counts)
            if stated != CalcMolFormula(mol):
                log("  REFUSED formula %s stated %s rdkit %s"
                    % (Chem.MolToSmiles(mol), stated, CalcMolFormula(mol)))
                refusals.append("%s %s: formula %s vs %s"
                                % (label, assign, stated, CalcMolFormula(mol)))
                continue
            tally["formula"] += 1
            key = flat(Chem.MolToSmiles(mol))
            if key in structures:
                log("  SUPPRESSED structure-collision -> %s" % structures[key])
                tally["structure-collision"] += 1
                continue
            witness = NAME_GRAMMAR_WITNESS[label]
            if witness is None:
                log("  REFUSED name-gate %-16s %s"
                    % (stated, Chem.MolToSmiles(mol)))
                measured.append((label, stated, Chem.MolToSmiles(mol), dict(assign)))
                tally["name-gate"] += 1
                continue
            name = witness(assign)
            if name.casefold() in names:
                tally["name-collision"] += 1
                continue
            tally["emitted"] += 1
            emitted.append((name, stated, Chem.MolToSmiles(mol)))
        if NAME_GRAMMAR_WITNESS[label] is None:
            refusals.append(
                "%s: no library row witnesses a name grammar for this skeleton, "
                "so surviving structures cannot be named to the library's conventions"
                % label)

    log("")
    for r in refusals:
        log("REFUSED %s" % r)
    log("")
    log("measured but unnameable candidates: %d" % len(measured))
    for label, formula, smiles, assign in measured:
        log("  %-28s %-14s %-56s %s" % (label[:28], formula, smiles, assign))
    log("")
    log("gate accounting %s" % tally)
    log("class '%s' stored %d + emitted %d = %d of target %d"
        % (CLS, in_class, len(emitted), in_class + len(emitted), TARGET))
    log("measured derivation ceiling for '%s': %d rows" % (CLS, in_class + len(emitted)))

    for name, formula, smiles in emitted:
        sys.stdout.write("  { name: '%s', cls: '%s', formula: '%s', smiles: '%s' },\n"
                         % (name, CLS, formula, smiles))
    return 0


if __name__ == "__main__":
    sys.exit(main())
