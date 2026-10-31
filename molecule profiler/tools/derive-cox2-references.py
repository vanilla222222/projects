"""Derives cls 'COX-2 inhibitor' library rows from externally sourced anchors on the 1,5-diaryl-4H-pyrazole core."""
import json
import os
import subprocess
import sys
import tempfile
import itertools
from rdkit import Chem, RDLogger
from rdkit.Chem.rdMolDescriptors import CalcMolFormula

RDLogger.DisableLog('rdApp.*')
CACHE = os.environ.get("MP_DERIVE_CACHE") or tempfile.mkdtemp(prefix="mp-derive-cox2-")
os.makedirs(CACHE, exist_ok=True)
DUMP = os.path.join(CACHE, "library-dump.json")

if not os.path.exists(DUMP):
    script = (
        "const L=require('./data/library.js').LIBRARY;"
        "require('fs').writeFileSync(process.argv[1], JSON.stringify("
        "L.map(function(r,i){return {i:i,name:r.name,cls:r.cls,formula:r.formula,"
        "smiles:r.smiles,sourced:!!r.source};})));"
    )
    subprocess.run(["node", "-e", script, DUMP], check=True, stdout=sys.stderr)

ROWS = json.load(open(DUMP))
print("library rows: %d" % len(ROWS), file=sys.stderr)
MOLS = {}
for r in ROWS:
    MOLS[r['i']] = Chem.MolFromSmiles(r['smiles'])

CORE = "[nX3;$(n-!@[c])]1[n][c][cH][c;$(c-!@[c])]1"
SITES = {0: 'N1', 2: 'C3', 4: 'C5'}


def canon(m):
    return Chem.MolToSmiles(m, isomericSmiles=True)


def flat(sm):
    m = Chem.MolFromSmiles(sm)
    if m is None:
        return None
    Chem.RemoveStereochemistry(m)
    return Chem.MolToSmiles(m)


def decompose(mol, match):
    core = set(match)
    cut = []
    for ai in match:
        for nb in mol.GetAtomWithIdx(ai).GetNeighbors():
            if nb.GetIdx() in core:
                continue
            b = mol.GetBondBetweenAtoms(ai, nb.GetIdx())
            if b.IsInRing():
                return (False, 'ring-fused', None)
            cut.append((b.GetIdx(), ai))
    assign = {p: [] for p in range(len(match))}
    for p, ai in enumerate(match):
        for _ in range(mol.GetAtomWithIdx(ai).GetTotalNumHs()):
            assign[p].append('[H]')
    if not cut:
        return (True, 'ok', {p: sorted(v) for p, v in assign.items()})
    bidx = [c[0] for c in cut]
    labels = [(k + 1, k + 1) for k in range(len(cut))]
    frag = Chem.FragmentOnBonds(mol, bidx, addDummies=True, dummyLabels=labels)
    for a in frag.GetAtoms():
        if a.GetAtomicNum() == 0 and a.GetIsotope():
            a.SetAtomMapNum(a.GetIsotope())
            a.SetIsotope(0)
    pieces = Chem.GetMolFrags(frag)
    fragmols = Chem.GetMolFrags(frag, asMols=True, sanitizeFrags=False)
    corepiece = None
    for p in pieces:
        if core.issubset(set(p)):
            corepiece = set(p)
            break
    if corepiece is None:
        return (False, 'core-split', None)
    lab2site = {k + 1: match.index(cut[k][1]) for k in range(len(cut))}
    coremol = None
    arms = []
    for p, fm in zip(pieces, fragmols):
        if set(p) == corepiece:
            coremol = fm
        else:
            arms.append(fm)
    z = coremol
    for a in arms:
        z = Chem.CombineMols(z, a)
    try:
        zz = Chem.molzip(z)
        Chem.SanitizeMol(zz)
    except Exception:
        return (False, 'molzip-fail', None)
    if canon(zz) != canon(mol):
        return (False, 'rezip-mismatch', None)
    for a in arms:
        labs = [at.GetAtomMapNum() for at in a.GetAtoms()
                if at.GetAtomicNum() == 0 and at.GetAtomMapNum()]
        if len(set(lab2site[l] for l in labs)) != 1:
            return (False, 'arm-bridges-sites', None)
        site = lab2site[labs[0]]
        ac = Chem.RWMol(a)
        for at in ac.GetAtoms():
            if at.GetAtomicNum() == 0:
                at.SetAtomMapNum(0)
        am = ac.GetMol()
        try:
            Chem.SanitizeMol(am)
        except Exception:
            pass
        assign[site].append(Chem.MolToSmiles(am))
    return (True, 'ok', {p: sorted(v) for p, v in assign.items()})


query = Chem.MolFromSmarts(CORE)
cells = {}
proven = []
dropped = []
for r in ROWS:
    m = MOLS[r['i']]
    if m is None:
        continue
    matches = m.GetSubstructMatches(query, uniquify=False)
    if not matches:
        continue
    if not r['sourced']:
        dropped.append((r['name'], 'not-externally-sourced'))
        continue
    assigns = []
    reasons = set()
    for mt in matches:
        ok, why, asg = decompose(m, list(mt))
        if ok:
            assigns.append(asg)
        else:
            reasons.add(why)
    if not assigns:
        dropped.append((r['name'], ';'.join(sorted(reasons))))
        continue
    norm = {tuple(sorted((s, tuple(v)) for s, v in a.items())) for a in assigns}
    if len(norm) > 1:
        dropped.append((r['name'], 'non-unanimous'))
        continue
    proven.append(r['name'])
    for s, vals in assigns[0].items():
        if s not in SITES:
            continue
        for v in vals:
            cells.setdefault((s, v), set()).add(r['name'])

print("core %s" % CORE, file=sys.stderr)
print("proven anchors (%d): %s" % (len(proven), sorted(proven)), file=sys.stderr)
for n, why in sorted(dropped):
    print("dropped %s: %s" % (n, why), file=sys.stderr)

table = {}
for (s, v), names in sorted(cells.items()):
    tag = "%s=%s" % (SITES[s], v)
    if len(names) >= 2:
        print("admitted %s <- %s" % (tag, sorted(names)), file=sys.stderr)
        table.setdefault(s, []).append(v)
    else:
        print("refused %s: 1 anchor %s" % (tag, sorted(names)), file=sys.stderr)

NAMES = {
    '*c1ccc(S(N)(=O)=O)cc1': '4-sulfamoylphenyl',
    '*C(F)(F)F': 'trifluoromethyl',
    '*C(F)F': 'difluoromethyl',
    '*c1ccc(F)cc1': '4-fluorophenyl',
}
TEMPLATE = "[*:1]n1nc([*:3])cc1[*:5]"
exact = set()
flats = {}
lnames = set()
for r in ROWS:
    m = MOLS[r['i']]
    if m is not None:
        exact.add(Chem.MolToSmiles(m))
    flats.setdefault(flat(r['smiles']), []).append(r['name'])
    lnames.add(r['name'].lower())

CROSS = {'Arylacetic acid NSAID', 'Arylpropionic acid NSAID', 'Sulfonamide', 'Aniline analgesic'}
sites = sorted(table)
emitted = []
batch = set()
for combo in itertools.product(*[sorted(table[s]) for s in sites]):
    z = Chem.MolFromSmiles(TEMPLATE)
    labels = {0: 1, 2: 3, 4: 5}
    for s, v in zip(sites, combo):
        z = Chem.CombineMols(z, Chem.MolFromSmiles(
            v.replace('*', '[*:%d]' % labels[s], 1)))
    mol = Chem.molzip(z)
    Chem.SanitizeMol(mol)
    smi = Chem.MolToSmiles(mol)
    arms = dict(zip(sites, combo))
    name = "4-[3-(%s)-5-(%s)pyrazol-1-yl]benzenesulfonamide" % (
        NAMES[arms[2]], NAMES[arms[4]])
    formula = CalcMolFormula(mol)
    why = None
    if smi in exact:
        why = 'exact-smiles collision'
    elif flat(smi) in flats:
        why = 'stereo-stripped collision with %s' % flats[flat(smi)][0]
    elif name.lower() in lnames:
        why = 'name collision'
    elif smi in batch:
        why = 'intra-batch duplicate'
    elif Chem.FindMolChiralCenters(mol, includeUnassigned=True,
                                   useLegacyImplementation=False):
        why = 'unassigned stereocentre'
    if why:
        print("gate refused %s: %s" % (name, why), file=sys.stderr)
        continue
    batch.add(smi)
    emitted.append((name, formula, smi))

print("derived rows: %d" % len(emitted), file=sys.stderr)
for name, formula, smi in emitted:
    print("  { name: '%s', cls: 'COX-2 inhibitor', formula: '%s', smiles: '%s' },"
          % (name.replace("'", "\\'"), formula, smi))
sys.exit(0)
