"""Explicit substructure definitions; these do not infer pharmacology."""
from rdkit import Chem
RINGS=[
('Indoles','c1ccc2[nH,nH0]ccc2c1'),('Pyridines','n1ccccc1'),
('Pyrroles','[nH,nH0]1cccc1'),('Furans','o1cccc1'),('Thiophenes','s1cccc1'),
('Imidazoles','n1cc[nH,nH0]c1'),('Pyrazoles','n1[nH,nH0]ccc1'),
('Oxazoles','o1cncc1'),('Isoxazoles','o1nccc1'),('Thiazoles','s1cncc1'),('Isothiazoles','s1nccc1'),
('Triazoles (1,2,3)','n1nncc1'),('Triazoles (1,2,4)','n1cnnc1'),('Tetrazoles','c1nnn[nH,nH0]1'),
('Pyrimidines','n1cnccc1'),('Pyrazines','n1ccncc1'),('Pyridazines','n1ncccc1'),
('Quinolines','c1ccc2ncccc2c1'),('Isoquinolines','c1ccc2cnccc2c1'),
('Benzimidazoles','c1ccc2[nH,nH0]cnc2c1'),('Benzofurans','c1ccc2occc2c1'),('Benzothiophenes','c1ccc2sccc2c1'),
('Benzoxazoles','c1ccc2ocnc2c1'),('Benzothiazoles','c1ccc2scnc2c1'),
('Indazoles','c1ccc2[nH,nH0]ncc2c1'),('Purines','c1ncnc2[nH,nH0]cnc12'),
('Piperidines','[NX3,NX4+]1[CX4][CX4][CX4][CX4][CX4]1'),
('Piperazines','[NX3,NX4+]1[CX4][CX4][NX3,NX4+][CX4][CX4]1'),
('Pyrrolidines','[NX3,NX4+]1[CX4][CX4][CX4][CX4]1'),
('Morpholines','[NX3,NX4+]1[CX4][CX4][OX2][CX4][CX4]1'),
('Thiomorpholines','[NX3,NX4+]1[CX4][CX4][SX2][CX4][CX4]1'),
('Azetidines','[NX3,NX4+]1[CX4][CX4][CX4]1'),('Oxetanes','[OX2]1[CX4][CX4][CX4]1'),
('Tetrahydrofurans','[OX2]1[CX4][CX4][CX4][CX4]1'),('Tetrahydropyrans','[OX2]1[CX4][CX4][CX4][CX4][CX4]1')]
# Saturated fused-ring and diarylmethane subgraphs. Additional fusion, bridges,
# substituents and stereochemistry are permitted; these imply no pharmacology.
RINGS += [
('Tetrahydroisoquinoline scaffolds','c1ccc2c(c1)[CX4][NX3,NX4+][CX4][CX4]2'),
('Chromane scaffolds','c1ccc2c(c1)[CX4][CX4][CX4][OX2]2'),
('2,3-Dihydrobenzofuran scaffolds','c1ccc2c(c1)[CX4][CX4][OX2]2'),
('Tetralin scaffolds','c1ccc2c(c1)[CX4][CX4][CX4][CX4]2')]
SERIES=[('Diphenylmethane scaffolds','c1ccccc1[CX4]c1ccccc1')]
SERIES += [('Unacylated phenethylamines','[NX3,NX4+;!$(N-[C,S,P]=[O,S,N])]-[CX4]-[CX4]-c1ccccc1'),
('Unacylated tryptamines','[NX3,NX4+;!$(N-[C,S,P]=[O,S,N])]-[CX4]-[CX4]-c1c[nH,nH0]c2ccccc12'),
('Catechols','[OX2H1]-c1ccccc1-[OX2H1]'),('Resorcinols','[OX2H1]-c1cccc([OX2H1])c1'),('Hydroquinones','[OX2H1]-c1ccc([OX2H1])cc1'),
('Catecholamines','[N]-[CX4]-[CX4]-c1ccc([OX2H1])c([OX2H1])c1'),
('Phenylethanolamines','[N]-[CX4]-[CX4]([OX2H1])-c1ccccc1'),
('Benzamides','[N]-[CX3](=[OX1])-c1ccccc1'),('Anilides','c1ccccc1-[N]-[CX3](=[OX1])'),
('Salicylic acids','[CX3](=[OX1])-[OX2H1,OX1-]'),
('Alpha-amino acids','[NX3,NX4+]-[CX4]-[CX3](=[OX1])-[OX2H1,OX1-]')]
# Salicylates require the ortho phenolic group, unlike the general acid motif.
SERIES=[(n,'[OX2H1]-c1ccccc1-[CX3](=[OX1])-[OX2H1,OX1-]' if n=='Salicylic acids' else s)for n,s in SERIES]
EXTRA_MOTIFS=[('Primary amine','[NX3H2;!$(N-[C,S,P]=[O,S,N])]-[#6]'),
('Secondary amine','[NX3H1;!$(N-[C,S,P]=[O,S,N])](-[#6])-[#6]'),
('Tertiary amine','[NX3H0;!$(N-[C,S,P]=[O,S,N])](-[#6])(-[#6])-[#6]'),
('Quaternary ammonium','[N+X4H0]'),('Carboxylate','[CX3](=[OX1])[O-]'),
('Aldehyde','[CX3H1](=[OX1])-[#6]'),('Nitrile','[#6]#[NX1]'),
('Nitro','[N+](=[OX1])[O-]'),('Thiol','[SX2H1]-[#6]'),('Thioether','[#6]-[SX2]-[#6]'),
('Sulfoxide','[#6]-[SX3](=[OX1])-[#6]'),('Sulfone','[#6]-[SX4](=[OX1])(=[OX1])-[#6]'),
('Carbamate','[OX2]-[CX3](=[OX1])-[NX3]'),('Urea','[NX3]-[CX3](=[OX1])-[NX3]'),
('Carbonate','[OX2]-[CX3](=[OX1])-[OX2]'),('Thioamide','[NX3]-[CX3](=[SX1])'),
('Imide','[CX3](=[OX1])-[NX3]-[CX3](=[OX1])'),
('Phosphate ester','[#6]-[OX2]-[PX4](=[OX1])'),('Phosphonate','[#6]-[PX4](=[OX1])'),
('Epoxide','[OX2]1[CX4][CX4]1'),('Lactam','[NX3;R]-[CX3;R](=[OX1])'),
('Lactone','[OX2;R]-[CX3;R](=[OX1])'),('Aryl methyl ether','[CH3]-[OX2]-c'),
('Diaryl ether','c-[OX2]-c'),('Alkyl aryl ether','[CX4]-[OX2]-c')]
def compile_patterns(rows):
 out=[(n,Chem.MolFromSmarts(s))for n,s in rows]
 if any(p is None for _,p in out):raise ValueError('Invalid taxonomy SMARTS')
 return out
