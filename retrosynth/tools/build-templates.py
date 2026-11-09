"""Build the retro template library from atom-mapped USPTO reactions.

Usage: python3 -I tools/build-templates.py <reactions.csv> <out-dir> [limit]

Every template is extracted from one real reaction and then immediately run
backwards against that reaction's own product. A template that cannot recover
its own precursors is recorded as failing and kept out of the engine's library:
there is no point searching twelve levels deep with transforms that do not work
at one. That check is the whole reason this is a build step and not a one-liner.

Reactions are split train/test by a hash of the patent id, so that blind
recovery - can the engine find a route it was never shown? - can be measured
later on reactions whose templates it does not have.
"""
import sys, csv, json, time, hashlib, os
from collections import Counter, defaultdict
from rdkit import Chem, RDLogger
from rdchiral.template_extractor import extract_from_reaction
from rdchiral.main import rdchiralRunText

RDLogger.DisableLog('rdApp.*')

TEST_FRACTION = 10  # one reaction in ten is held out


def canon(smiles):
    """Canonical SMILES with atom maps stripped.

    The maps have to go before anything is compared. They survive
    canonicalisation, so a mapped product and the same unmapped molecule are
    different strings - which is how a perfectly good template library first
    measured 0% recovery here.
    """
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        return None
    for atom in mol.GetAtoms():
        atom.SetAtomMapNum(0)
    return Chem.MolToSmiles(mol)


def canon_set(smiles):
    """A multi-molecule side as an order-independent key."""
    parts = []
    for piece in smiles.split('.'):
        one = canon(piece)
        if one is None:
            return None
        parts.append(one)
    return '.'.join(sorted(parts))


def held_out(patent_id):
    digest = hashlib.sha256(patent_id.encode()).hexdigest()
    return int(digest[:8], 16) % TEST_FRACTION == 0


def main(source, out_dir, limit):
    os.makedirs(out_dir, exist_ok=True)
    stats = Counter()
    # smarts -> how it has behaved across every reaction it came from
    library = {}
    test_rows = []
    started = time.time()

    with open(source, newline='') as handle:
        for index, row in enumerate(csv.DictReader(handle)):
            if limit and index >= limit:
                break
            stats['reactions'] += 1
            reactants, product = row['rxn_smiles'].split('>>')
            patent = row['id']

            if held_out(patent):
                stats['held_out'] += 1
                target = canon(product)
                want = canon_set(reactants)
                if target and want:
                    test_rows.append({'id': patent, 'class': row['class'],
                                      'target': target, 'reactants': want})
                continue

            try:
                found = extract_from_reaction(
                    {'reactants': reactants, 'products': product, '_id': patent})
            except Exception:
                stats['extract_error'] += 1
                continue
            if not found or 'reaction_smarts' not in found:
                stats['no_template'] += 1
                continue

            smarts = found['reaction_smarts']
            entry = library.setdefault(smarts, {
                'smarts': smarts, 'count': 0, 'ok': 0, 'miss': 0,
                'classes': Counter(), 'example': None})
            entry['count'] += 1
            entry['classes'][row['class']] += 1
            stats['extracted'] += 1

            target = canon(product)
            want = canon_set(reactants)
            try:
                produced = rdchiralRunText(smarts, target) if target else []
            except Exception:
                stats['apply_error'] += 1
                entry['miss'] += 1
                continue
            if want and want in {canon_set(one) for one in produced}:
                entry['ok'] += 1
                stats['roundtrip_ok'] += 1
                if entry['example'] is None:
                    entry['example'] = {'target': target, 'precursors': want, 'patent': patent}
            else:
                entry['miss'] += 1
                stats['roundtrip_miss'] += 1

    # A template earns its place by having worked at least once.
    usable = [e for e in library.values() if e['ok'] > 0]
    usable.sort(key=lambda e: (-e['count'], e['smarts']))
    for entry in usable:
        entry['classes'] = dict(entry['classes'])

    with open(os.path.join(out_dir, 'templates.json'), 'w') as handle:
        json.dump(usable, handle)
    with open(os.path.join(out_dir, 'holdout.json'), 'w') as handle:
        json.dump(test_rows, handle)

    report = {
        'built': time.strftime('%Y-%m-%d'),
        'source_rows': stats['reactions'],
        'seconds': round(time.time() - started, 1),
        'stats': dict(stats),
        'templates_total': len(library),
        'templates_usable': len(usable),
        'templates_dropped': len(library) - len(usable),
        'recovery_rate': round(100 * stats['roundtrip_ok'] / max(1, stats['extracted']), 2),
        'seen_once': sum(1 for e in usable if e['count'] == 1),
        'covers_half_of_reactions': None,
        'holdout_reactions': len(test_rows),
    }
    # How many templates account for half of all extracted reactions? A small
    # number here means the search can try the common ones first and win often.
    running, half = 0, stats['extracted'] / 2
    for n, entry in enumerate(usable, 1):
        running += entry['count']
        if running >= half:
            report['covers_half_of_reactions'] = n
            break
    with open(os.path.join(out_dir, 'build-report.json'), 'w') as handle:
        json.dump(report, handle, indent=1)
    print(json.dumps(report, indent=1))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 0)
