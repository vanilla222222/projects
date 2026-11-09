#!/usr/bin/env python3
"""Offline fourth FreeSolv batch: one hundred previously unmeasured existing graphs."""
import argparse
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location('freesolv_existing_graph_core', ROOT/'tools/import-freesolv-properties-002.py')
core = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(core)
SNAPSHOT = 'validation/sources/freesolv-properties-004.json'
PREFIX = 'property-freesolv4-'
TABLE = core.TABLE
SOURCE_BLOBS = core.SOURCE_BLOBS
SELECTION = [
    ('mobley_299266', '2-Methylpropene', '299266'),
    ('mobley_303222', 'Propylene', '303222'),
    ('mobley_397645', 'Ethyl benzoate', '397645'),
    ('mobley_588781', 'Hexylbenzene', '588781'),
    ('mobley_766666', 'trichloroethylene', '766666'),
    ('mobley_778352', '2-Methy-2-Butene', '778352'),
    ('mobley_967099', '2-nitropropane', '967099'),
    ('mobley_994483', 'bromoethane', '994483'),
    ('mobley_1107178', 'iodoethane', '1107178'),
    ('mobley_1139153', 'isooctane', '1139153'),
    ('mobley_1244778', 'Cycloheptanol', '1244778'),
    ('mobley_1261349', 'neopentane', '1261349'),
    ('mobley_1449384', '4-Isopropyltoluene', '1449384'),
    ('mobley_1615431', 'Diisopropyl ether', '1615431'),
    ('mobley_1662128', '1-Butene', '1662128'),
    ('mobley_1674094', '1-Hexyne', '1674094'),
    ('mobley_1723043', 'octafluorocyclobutane', '1723043'),
    ('mobley_1770205', 'Azinphos-methyl', '1770205'),
    ('mobley_1899443', '2-Methyl-1-Pentene', '1899443'),
    ('mobley_1923244', 'Butane', '1923244'),
    ('mobley_2008055', 'Ethane', '2008055'),
    ('mobley_2143011', '3-Methyl-1-Butene', '2143011'),
    ('mobley_2198613', 'ethyl chloride', '2198613'),
    ('mobley_2213823', '3-Methylpentane', '2213823'),
    ('mobley_2261979', 'Acenapthene', '2261979'),
    ('mobley_2402487', 'Malonic acid diethylester', '2402487'),
    ('mobley_2481002', 'chloropicrin', '2481002'),
    ('mobley_2523689', 'chloridazon', '2523689'),
    ('mobley_2727678', '5-iodo-1H-pyrimidine-2,4-dione', '2727678'),
    ('mobley_2792521', '(2E)-hexenal', '2792521'),
    ('mobley_2845466', '2,3,7,8-tetrachlorodibenzodioxine', '2845466'),
    ('mobley_3083321', 'Dimethoxymethane', '3083321'),
    ('mobley_3201701', 'Pirimicarb', '3201701'),
    ('mobley_3274817', '(R)-dinoseb', '3274817'),
    ('mobley_3318135', '5-Nonanone', '3318135'),
    ('mobley_3572203', 'Pentyl propanoate', '3572203'),
    ('mobley_3727287', '1,4-benzoquinone', '3727287'),
    ('mobley_3777264', '3-nitroaniline', '3777264'),
    ('mobley_4219614', '1,2,3,4-tetrachlorobenzene', '4219614'),
    ('mobley_4252724', 'Isobutylbenzene', '4252724'),
    ('mobley_4305650', 'propionitrile', '4305650'),
    ('mobley_4364398', 'iodomethane', '4364398'),
    ('mobley_4924862', 'Isopentyl formate', '4924862'),
    ('mobley_5157661', '2-Methylpropane', '5157661'),
    ('mobley_5263791', '1-Ethylnaphthalene', '5263791'),
    ('mobley_5310099', '1-Hexene', '5310099'),
    ('mobley_5347550', 'methoxyflurane', '5347550'),
    ('mobley_5390332', 'methyl butanoate', '5390332'),
    ('mobley_5467162', 'p-t-Butylphenol', '5467162'),
    ('mobley_5471704', 'Isopentyl acetate', '5471704'),
    ('mobley_5510474', '1,2,3,4-tetrachlorodibenzodioxine', '5510474'),
    ('mobley_5571660', '2,6-dimethylaniline', '5571660'),
    ('mobley_5708811', 'dicamba', '5708811'),
    ('mobley_5760563', 'Dimethyl sulfate', '5760563'),
    ('mobley_5852491', 'Methylcyclopentane', '5852491'),
    ('mobley_5948990', '2-nitroaniline', '5948990'),
    ('mobley_5952846', 'tetrachloroethylene', '5952846'),
    ('mobley_5973402', '3-Methylbutan-1-ol', '5973402'),
    ('mobley_6060301', '1-hexanamine', '6060301'),
    ('mobley_6091882', 'Ethylene', '6091882'),
    ('mobley_6198745', 'Glyceryl triacetate', '6198745'),
    ('mobley_6232400', 'pyridine-3-carbaldehyde', '6232400'),
    ('mobley_6416775', 'Propylcyclopentane', '6416775'),
    ('mobley_6474572', 'Vinyl chloride', '6474572'),
    ('mobley_6497672', 't-Crotonaldehyde', '6497672'),
    ('mobley_6571751', '1-Methylcyclohexene', '6571751'),
    ('mobley_6632459', 'Propionaldehyde', '6632459'),
    ('mobley_6854178', 'Isopropyl formate', '6854178'),
    ('mobley_6861308', 'fenuron', '6861308'),
    ('mobley_6935906', 'linalyl acetate', '6935906'),
    ('mobley_6981465', 'Isopropyl acetate', '6981465'),
    ('mobley_7015518', 'methyl methyl ether', '7015518'),
    ('mobley_7106722', '2-Methylpentane', '7106722'),
    ('mobley_7227357', '3-Pentanol', '7227357'),
    ('mobley_7326706', 'Chlorpyrifos', '7326706'),
    ('mobley_7542832', 'Dipropyl ether', '7542832'),
    ('mobley_7768165', '1-bromo-2-chloroethane', '7768165'),
    ('mobley_7814642', '1,2,4-trichlorobenzene', '7814642'),
    ('mobley_7829570', 'benfluralin', '7829570'),
    ('mobley_7859387', 'heptanal', '7859387'),
    ('mobley_7988076', 'p-Hydroxybenzaldehyde', '7988076'),
    ('mobley_8118832', 'allyl alcohol', '8118832'),
    ('mobley_8124669', 'alachlor', '8124669'),
    ('mobley_8260524', 'Propyne', '8260524'),
    ('mobley_8320545', 'nitroethane', '8320545'),
    ('mobley_8337977', '4-Methyl-2-pentanone', '8337977'),
    ('mobley_8739734', '3-Methyl-2-butanone', '8739734'),
    ('mobley_8883511', 'o-tolualdehyde', '8883511'),
    ('mobley_8983100', 'bromomethane', '8983100'),
    ('mobley_9007496', 'Carbaryl', '9007496'),
    ('mobley_9029594', 'fluoromethane', '9029594'),
    ('mobley_9055303', 'Methane', '9055303'),
    ('mobley_9112978', 'cis-2-Pentene', '9112978'),
    ('mobley_9121449', '1-Butyne', '9121449'),
    ('mobley_9705941', '2-methylthiophene', '9705941'),
    ('mobley_9740891', '2,6-dichlorobenzonitrile', '9740891'),
    ('mobley_9794857', 'Methyl t-butyl ether', '9794857'),
    ('mobley_9838013', '2-Methylbutan-2-ol', '9838013'),
    ('mobley_9913368', 'trans-1,2-dichloroethene', '9913368'),
    ('mobley_9942801', '4-Ethyltoluene', '9942801'),
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
        raise ValueError('Generated FreeSolv batch004 inventory is stale')
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
