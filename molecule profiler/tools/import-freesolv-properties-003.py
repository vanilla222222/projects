#!/usr/bin/env python3
"""Offline third FreeSolv batch: one hundred previously unmeasured existing graphs."""
import argparse
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location('freesolv_existing_graph_core', ROOT/'tools/import-freesolv-properties-002.py')
core = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(core)
SNAPSHOT = 'validation/sources/freesolv-properties-003.json'
PREFIX = 'property-freesolv3-'
TABLE = core.TABLE
SOURCE_BLOBS = core.SOURCE_BLOBS
SELECTION = [
    ('mobley_1821184', 'skatole', '1821184'),
    ('mobley_5220185', 'ethylpyrazine', '5220185'),
    ('mobley_8966374', 'methylpyrazine', '8966374'),
    ('mobley_1520842', '4-methylpyridine', '1520842'),
    ('mobley_4584540', '2,6-dimethylpyridine', '4584540'),
    ('mobley_5026370', '4-cyanopyridine', '5026370'),
    ('mobley_3264884', '2-Naphthylamine', '3264884'),
    ('mobley_7261305', 'Hydrazine', '7261305'),
    ('mobley_6714389', 'methylamine', '6714389'),
    ('mobley_2410897', 'ethylamine', '2410897'),
    ('mobley_9185328', 'propylamine', '9185328'),
    ('mobley_5692472', 'dimethylamine', '5692472'),
    ('mobley_9209581', 'trimethylamine', '9209581'),
    ('mobley_1036761', 'cyclohexylamine', '1036761'),
    ('mobley_7774695', 'N-methylaniline', '7774695'),
    ('mobley_5326154', 'N,N-dimethylaniline', '5326154'),
    ('mobley_7039935', '1-Napthol', '7039935'),
    ('mobley_3663158', '2-Napthol', '3663158'),
    ('mobley_2925352', 'p-Cresol', '2925352'),
    ('mobley_4035953', '2-Methylphenol', '4035953'),
    ('mobley_8691603', '3-Methylphenol', '8691603'),
    ('mobley_4780078', '2,4-xylenol', '4780078'),
    ('mobley_3144334', '2,5-xylenol', '3144334'),
    ('mobley_6743808', '3,4-xylenol', '6743808'),
    ('mobley_7009711', '3,5-xylenol', '7009711'),
    ('mobley_486214', '2,6-dimethoxyphenol', '486214'),
    ('mobley_5063386', '2-nitrophenol', '5063386'),
    ('mobley_2751110', '4-Nitrophenol', '2751110'),
    ('mobley_6082662', '4-nitroaniline', '6082662'),
    ('mobley_4193752', 'Nitrobenzene', '4193752'),
    ('mobley_5072416', 'o-anisidine', '5072416'),
    ('mobley_4218209', 'p-anisidine', '4218209'),
    ('mobley_3187514', 'o-toluidine', '3187514'),
    ('mobley_5518547', 'p-toluidine', '5518547'),
    ('mobley_1929982', 'Hydrogen sulfide', '1929982'),
    ('mobley_525934', 'methanethiol', '525934'),
    ('mobley_1800170', 'ethanethiol', '1800170'),
    ('mobley_186894', 'propane-1-thiol', '186894'),
    ('mobley_5520946', 'thiophenol', '5520946'),
    ('mobley_9073553', 'dimethyl sulfide', '9073553'),
    ('mobley_4983965', 'diethyl sulfide', '4983965'),
    ('mobley_7690440', 'dimethyl disulfide', '7690440'),
    ('mobley_1189457', 'thioanisole', '1189457'),
    ('mobley_1708457', 'sulfonyldimethane', '1708457'),
    ('mobley_7754849', 'Ethion', '7754849'),
    ('mobley_9460824', 'Phorate', '9460824'),
    ('mobley_9281946', 'Parathion', '9281946'),
    ('mobley_5393242', 'Diazinon', '5393242'),
    ('mobley_4483973', 'monofluorobenzene', '4483973'),
    ('mobley_7608462', 'chlorobenzene', '7608462'),
    ('mobley_7599023', 'bromobenzene', '7599023'),
    ('mobley_4845722', 'hexachlorobenzene', '4845722'),
    ('mobley_7066554', '4-chlorophenol', '7066554'),
    ('mobley_8723116', '4-chloroaniline', '8723116'),
    ('mobley_8789465', '2-iodophenol', '8789465'),
    ('mobley_3762186', 'dichloromethane', '3762186'),
    ('mobley_6359135', 'Carbon tetrachloride', '6359135'),
    ('mobley_7578802', 'bromoform', '7578802'),
    ('mobley_1857976', '1,2-Dichloroethane', '1857976'),
    ('mobley_1792062', '1,2-dibromoethane', '1792062'),
    ('mobley_9897248', 'Nerol', '9897248'),
    ('mobley_819018', 'geraniol', '819018'),
    ('mobley_8337722', 'levomenthol', '8337722'),
    ('mobley_5616693', '(-)-menthone', '5616693'),
    ('mobley_7676709', '(+)-piperitone', '7676709'),
    ('mobley_9653690', '(-)-trans-carveol', '9653690'),
    ('mobley_1160109', '(+)-dihydrocarvone', '1160109'),
    ('mobley_7364468', 'isophorone', '7364468'),
    ('mobley_3211679', 'Cyclohexene', '3211679'),
    ('mobley_8006582', 'Cyclopentane', '8006582'),
    ('mobley_8885088', 'Cyclopentene', '8885088'),
    ('mobley_2784376', 'cyclopropane', '2784376'),
    ('mobley_1967551', 'acetaldehyde', '1967551'),
    ('mobley_2146331', 'Formaldehyde', '2146331'),
    ('mobley_8573194', 'Butyraldehyde', '8573194'),
    ('mobley_1976156', 'nonanal', '1976156'),
    ('mobley_4694328', 'octanal', '4694328'),
    ('mobley_1881249', '2-Pentanone', '1881249'),
    ('mobley_1875719', '3-Pentanone', '1875719'),
    ('mobley_2487143', '2-Hexanone', '2487143'),
    ('mobley_3573480', '2-Heptanone', '3573480'),
    ('mobley_2390199', '4-Heptanone', '2390199'),
    ('mobley_9407874', '2-Octanone', '9407874'),
    ('mobley_9617923', '2-Decanone', '9617923'),
    ('mobley_4792268', 'valeric acid', '4792268'),
    ('mobley_1735893', 'hexanoic acid', '1735893'),
    ('mobley_2929847', 'isovaleric acid', '2929847'),
    ('mobley_3982371', 'Methyl acetate', '3982371'),
    ('mobley_1717215', 'Methyl formate', '1717215'),
    ('mobley_2294995', 'Ethyl formate', '2294995'),
    ('mobley_2364370', 'Butyl acetate', '2364370'),
    ('mobley_7573149', 'Propyl acetate', '7573149'),
    ('mobley_6739648', '1,4-dioxane', '6739648'),
    ('mobley_3395921', 'Tetrahydropyran', '3395921'),
    ('mobley_8882696', 'Tetrahydrofurane', '8882696'),
    ('mobley_6102880', 'Diphenyl ether', '6102880'),
    ('mobley_129464', 'Dibutyl ether', '129464'),
    ('mobley_5880265', '2-Butoxyethanol', '5880265'),
    ('mobley_3047364', 'ametryn', '3047364'),
    ('mobley_8207196', 'simazine', '8207196'),
]


def build(root=ROOT, library=None, effective=None):
    return core.build(root, library, effective, selection=SELECTION, snapshot_path=SNAPSHOT,
                      record_prefix=PREFIX, scope_count_word='One hundred')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    output = build()
    inventory = {str(p.relative_to(ROOT)) for p in (ROOT/'data/curated-reference-entries').glob(PREFIX+'*.json')}
    expected = {name for name in output if name.startswith('data/')}
    if inventory - expected or (args.check and inventory != expected):
        raise ValueError('Generated FreeSolv batch003 inventory is stale')
    for name, text in output.items():
        path = ROOT/name
        if args.check:
            if not path.exists() or path.read_bytes() != text.encode('utf-8'):
                raise ValueError('Stale generated file: '+name)
        else:
            path.write_bytes(text.encode('utf-8'))
    print(('Checked' if args.check else 'Wrote')+' 100 existing-graph FreeSolv property records and one source snapshot')


if __name__ == '__main__':
    main()
