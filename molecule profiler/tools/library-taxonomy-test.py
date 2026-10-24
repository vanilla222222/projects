import importlib.util
from pathlib import Path
s=importlib.util.spec_from_file_location('tags',Path(__file__).with_name('build-library-tags.py'));t=importlib.util.module_from_spec(s);s.loader.exec_module(t)
def tags(s):return set(t.tags_for({'name':'Fixture','cls':'Test','smiles':s}))
cases=[('CCN',['Primary amine motif'],['Secondary amine motif','Amide motif']),('CCNCC',['Secondary amine motif'],['Primary amine motif']),('CN(C)C',['Tertiary amine motif'],['Quaternary ammonium motif']),('C[N+](C)(C)C',['Quaternary ammonium motif'],['Tertiary amine motif']),('CC(=O)N',['Amide motif'],['Primary amine motif']),('COC(=O)N',['Carbamate motif','Amide motif'],['Primary amine motif']),('NC(=O)N',['Urea motif'],['Primary amine motif']),('O=C1NCCC1',['Lactam motif'],['Lactone motif']),('O=C1OCCC1',['Lactone motif'],['Lactam motif']),('CC(=O)NCCc1c[nH]c2ccccc12',['Family motif: N-acyltryptamines (side-chain amides)'],['Family motif: Unacylated tryptamines']),('NCCc1c[nH]c2ccccc12',['Family motif: Unacylated tryptamines'],['Family motif: N-acyltryptamines (side-chain amides)']),('Oc1ccccc1O',['Family motif: Catechols'],['Family motif: Resorcinols','Family motif: Hydroquinones']),('Oc1cccc(O)c1',['Family motif: Resorcinols'],['Family motif: Catechols']),('Oc1ccc(O)cc1',['Family motif: Hydroquinones'],['Family motif: Catechols']),('N1CCNCC1',['Family motif: Piperazines'],['Family motif: Piperidines']),('O1CCNCC1',['Family motif: Morpholines'],['Family motif: Piperazines']),('c1ccncc1',['Family motif: Pyridines'],['Pyridine motif']),('c1ccc2[nH]ccc2c1',['Family motif: Indoles'],['Indole motif'])]
for smiles,yes,no in cases:
 actual=tags(smiles)
 for tag in yes:assert tag in actual,(smiles,tag)
 for tag in no:assert tag not in actual,(smiles,tag)
assert 'Rings: 3' in tags('c1ccc2cc3ccccc3cc2c1')
assert 'Topology: spiro rings' in tags('C1CCC2(CC1)CCCC2')
assert 'Topology: bridged rings' in tags('C1CC2CCC1C2')
assert 'Topology: macrocycle (8+ ring atoms)' in tags('C1CCCCCCC1')
source=t.tags_for({'name':'Fixture','cls':'ChEBI named compound','source':{'provider':'ChEBI','snapshot':'test'},'smiles':'CCO'})
assert 'Collection: ChEBI curated compounds' in source and 'Label: ChEBI named compound' not in source and 'Source: ChEBI' not in source
print(f'Taxonomy: {len(t.FAMILY_MOTIFS)} families; {len(cases)} positive/negative cases, ring topology, exact bins and consolidated tags passed.')
