'use strict';

const AMINE_N = '[NX3;!$(N[!#6;!#1]);!$(NC=[O,N,S]);!$(N=*);!$(N#*)]';

const METABOLISM = [
  {
    name: 'N-demethylation (secondary amine)',
    phase: 'I',
    enzyme: 'CYP',
    route: 'oxidative N-dealkylation',
    smirks: '[CH3][NX3;H1;!$(N[!#6;!#1]);!$(NC=[O,N,S]);!$(N=*):1]>>[N:1]',
    weight: 0.28,
    note: 'The methyl is hydroxylated to a carbinolamine, which collapses to the primary amine and formaldehyde. This is the single most frequently observed phase I reaction in metabolite databases, and for N-methylated phenethylamines it is a CYP route, not a monoamine oxidase one.'
  },
  {
    name: 'N-demethylation (tertiary amine)',
    phase: 'I',
    enzyme: 'CYP',
    route: 'oxidative N-dealkylation',
    smirks: '[CH3][NX3;H0;!$(N[!#6;!#1]);!$(NC=[O,N,S]);!$(N=*):1]>>[N:1]',
    weight: 0.24,
    note: 'Same carbinolamine collapse on a tertiary nitrogen, giving the secondary amine. CYP3A4 and CYP2D6 carry most of this traffic; the isoform is not predicted here.'
  },
  {
    name: 'N-demethylation (aromatic N-methyl)',
    phase: 'I',
    enzyme: 'CYP',
    route: 'oxidative N-dealkylation',
    smirks: '[CH3][n:1]>>[n:1]',
    weight: 0.09,
    note: 'Demethylation of a methylated ring nitrogen, as in caffeine to theobromine and paraxanthine.'
  },
  {
    name: 'N-dealkylation (larger alkyl)',
    phase: 'I',
    enzyme: 'CYP',
    route: 'oxidative N-dealkylation',
    smirks: '[CH2;!R]([#6])[NX3;!$(N[!#6;!#1]);!$(NC=[O,N,S]);!$(N=*):1]>>[N:1]',
    weight: 0.16,
    note: 'Hydroxylation on the carbon next to nitrogen cleaves the N-C bond and releases the corresponding aldehyde. The amine is reported; the aldehyde fragment is not.'
  },
  {
    name: 'N-oxidation (tertiary amine)',
    phase: 'I',
    enzyme: 'FMO',
    route: 'N-oxygenation',
    smirks: '[NX3;H0;!R;!$(N[!#6;!#1]);!$(NC=[O,N,S]);!$(N=*);!$(N#*):1]>>[N+:1][O-]',
    weight: 0.07,
    note: 'Flavin-containing monooxygenase adds oxygen to the nitrogen lone pair, giving the N-oxide. CYP does the same reaction more slowly.'
  },
  {
    name: 'N-hydroxylation (primary or secondary amine)',
    phase: 'I',
    enzyme: 'CYP',
    route: 'N-oxygenation',
    smirks: '[NX3;H1,H2;!$(N[!#6;!#1]);!$(NC=[O,N,S]):1]>>[N:1]O',
    weight: 0.05,
    note: 'Hydroxylamine formation. On an aromatic amine this is the activation step that leads to a nitrenium ion, which is why the aromatic amine alert in the toxicity panel matters for anilines.'
  },
  {
    name: 'Oxidative deamination (monoamine oxidase)',
    phase: 'I',
    enzyme: 'MAO',
    route: 'oxidative deamination',
    smirks: '[CH2;!R:1][NX3;H1,H2;!$(N[!#6;!#1]);!$(NC=[O,N,S]);!$(Nc)]>>[C:1]=O',
    weight: 0.11,
    note: 'Monoamine oxidase abstracts the alpha carbon-hydrogen bond and releases the aldehyde plus ammonia or methylamine. It needs an unbranched alpha carbon: a methyl group on that carbon, as in every amphetamine, blocks the enzyme, which is why this rule requires CH2 and not CH.'
  },
  {
    name: 'Oxidative deamination (alpha-branched amine)',
    phase: 'I',
    enzyme: 'CYP',
    route: 'oxidative deamination',
    smirks: '[CX4;H1;!R;$(C[CH3]):1][NX3;H1,H2;!$(N[!#6;!#1]);!$(NC=[O,N,S])]>>[C:1]=O',
    weight: 0.08,
    note: 'Amphetamines are deaminated to the ketone, but by CYP rather than monoamine oxidase, because the alpha-methyl group that blocks the oxidase does not block the P450. Amphetamine gives phenylacetone this way.'
  },
  {
    name: 'Aromatic hydroxylation',
    phase: 'I',
    enzyme: 'CYP',
    route: 'aromatic oxidation',
    smirks: '[cH:1]>>[c:1]O',
    weight: 0.19,
    note: 'Ring oxidation through an arene oxide to the phenol. Only ring carbons that still carry a hydrogen can be hydroxylated, so a substituent (including fluorine) blocks its own position. Every open position is enumerated here; the real rate depends on ring electronics and on how the molecule sits in the active site.'
  },
  {
    name: 'Benzylic hydroxylation',
    phase: 'I',
    enzyme: 'CYP',
    route: 'aliphatic oxidation',
    smirks: '[CX4;H2;!R;$(Cc):1]>>[C:1]O',
    weight: 0.12,
    note: 'The carbon next to an aromatic ring is oxidised readily because the radical formed on hydrogen abstraction is benzylic and therefore stabilised.'
  },
  {
    name: 'Aliphatic hydroxylation (terminal methyl)',
    phase: 'I',
    enzyme: 'CYP',
    route: 'aliphatic oxidation',
    smirks: '[CH3;!$(C[!#6;!#1]);$(C[CX4]):1]>>[C:1]O',
    weight: 0.08,
    note: 'Omega-hydroxylation of an alkyl chain, the first step of the omega-oxidation sequence that ends in a carboxylic acid.'
  },
  {
    name: 'Aliphatic hydroxylation (chain CH2)',
    phase: 'I',
    enzyme: 'CYP',
    route: 'aliphatic oxidation',
    smirks: '[CX4;H2;!R;!$(C[!#6;!#1]);!$(Cc);$(C([CX4])[CX4]):1]>>[C:1]O',
    weight: 0.07,
    note: 'Hydroxylation inside a saturated chain. Secondary carbon-hydrogen bonds are weaker than primary ones, so this competes well with terminal hydroxylation.'
  },
  {
    name: 'Alicyclic hydroxylation',
    phase: 'I',
    enzyme: 'CYP',
    route: 'aliphatic oxidation',
    smirks: '[CX4;H2;R;!$(C[!#6;!#1]):1]>>[C:1]O',
    weight: 0.06,
    note: 'Hydroxylation on a saturated ring, as in the cyclohexyl rings of many drugs.'
  },
  {
    name: 'O-demethylation (aryl methyl ether)',
    phase: 'I',
    enzyme: 'CYP',
    route: 'O-dealkylation',
    smirks: '[CH3][OX2:1][c:2]>>[O:1][c:2]',
    weight: 0.22,
    note: 'CYP2D6 is the usual catalyst for electron-rich rings. The phenol it uncovers is a handle for sulfation and glucuronidation, so this reaction usually starts a two-step clearance route rather than ending one.'
  },
  {
    name: 'O-demethylation (aliphatic methyl ether)',
    phase: 'I',
    enzyme: 'CYP',
    route: 'O-dealkylation',
    smirks: '[CH3][OX2:1][CX4:2]>>[O:1][C:2]',
    weight: 0.10,
    note: 'The same carbinol collapse on an aliphatic ether, giving the alcohol and formaldehyde.'
  },
  {
    name: 'Methylenedioxy ring opening',
    phase: 'I',
    enzyme: 'CYP',
    route: 'O-dealkylation',
    smirks: '[c:1]1[c:2][O:3][CH2][O:4]1>>[c:1]([O:3])[c:2][O:4]',
    weight: 0.26,
    note: 'The 1,3-dioxole of a methylenedioxyphenyl group is opened by CYP2D6 to the catechol, releasing formaldehyde. This is the dominant route for MDMA and MDA, and it is the step that matters for their toxicology: the catechol it produces, not the parent, is what gets oxidised further.'
  },
  {
    name: 'Catechol O-methylation',
    phase: 'I',
    enzyme: 'COMT',
    route: 'O-methylation',
    smirks: '[OX2H:1][c:2][c:3][OX2H:4]>>[c:2]([O:1]C)[c:3][O:4]',
    weight: 0.20,
    note: 'Catechol O-methyltransferase caps one of the two hydroxyls with a methyl group. This is a detoxifying step: the methyl ether can no longer be oxidised to an ortho-quinone, so O-methylation competes directly with the quinone route below.'
  },
  {
    name: 'Catechol oxidation to ortho-quinone',
    phase: 'I',
    enzyme: 'Peroxidase or autoxidation',
    route: 'two-electron oxidation',
    smirks: '[OX2H:1][c:2]1[c:3]([OX2H:4])[c:5][c:6][c:7][c:8]1>>[O:1]=[C:2]1[C:3](=[O:4])[C:5]=[C:6][C:7]=[C:8]1',
    weight: 0.15,
    note: 'A catechol gives up two electrons to peroxidases, to tyrosinase, or simply to oxygen, and becomes an ortho-quinone. Quinones are electrophiles and redox cyclers: this is the single most common way a harmless-looking phenol becomes a reactive metabolite, and it is why the toxicity panel is worth re-running on the products of this reaction.'
  },
  {
    name: 'Quinone glutathione addition',
    phase: 'II',
    enzyme: 'GST',
    route: 'Michael addition',
    smirks: '[OX1:1]=[C:2]1[C:3](=[OX1:4])[C:5]=[CX3;H1:6][C:7]=[C:8]1>>[O:1][c:2]1[c:3]([O:4])[c:5][c:6](SCC(NC(=O)CCC(N)C(=O)O)C(=O)NCC(=O)O)[c:7][c:8]1',
    weight: 0.18,
    note: 'Glutathione adds to the quinone and the ring falls back to the catechol, now carrying a thioether. For the ring-substituted catecholamines these conjugates are not merely excretion products: the glutathionyl and N-acetylcysteinyl catechols of alpha-methyldopamine are taken up into brain, redox cycle there, and are the species most directly implicated in the serotonergic damage seen after MDMA.'
  },
  {
    name: 'S-oxidation (thioether)',
    phase: 'I',
    enzyme: 'FMO',
    route: 'S-oxygenation',
    smirks: '[SX2;!$(S(=O));!$(Sc1ncccc1);$(S([#6])[#6]):1]>>[S:1]=O',
    weight: 0.09,
    note: 'Thioethers are oxidised to sulfoxides and then further to sulfones, by flavin monooxygenase and by CYP.'
  },
  {
    name: 'Epoxidation (alkene)',
    phase: 'I',
    enzyme: 'CYP',
    route: 'alkene oxidation',
    smirks: '[CX3;H1,H2;!R:1]=[CX3;!R:2]>>[C:1]1[C:2]O1',
    weight: 0.06,
    note: 'An isolated double bond is epoxidised. Epoxides are alkylating agents, which is why the epoxide alert in the toxicity panel fires on the product; most are opened again by epoxide hydrolase before they do damage.'
  },
  {
    name: 'Primary alcohol oxidation',
    phase: 'I',
    enzyme: 'ADH',
    route: 'alcohol oxidation',
    smirks: '[CX4;H2;!R:1][OX2H:2]>>[C:1]=[O:2]',
    weight: 0.09,
    note: 'Alcohol dehydrogenase takes a primary alcohol to the aldehyde. The aldehyde is usually short-lived because aldehyde dehydrogenase is fast.'
  },
  {
    name: 'Secondary alcohol oxidation',
    phase: 'I',
    enzyme: 'ADH',
    route: 'alcohol oxidation',
    smirks: '[CX4;H1:1][OX2H:2]>>[C:1]=[O:2]',
    weight: 0.06,
    note: 'Oxidation of a secondary alcohol to the ketone. The reverse reaction, carbonyl reduction, is often faster, so the pair can be an interconverting couple rather than a one-way step.'
  },
  {
    name: 'Aldehyde oxidation',
    phase: 'I',
    enzyme: 'ALDH',
    route: 'aldehyde oxidation',
    smirks: '[CX3;H1:1]=[OX1:2]>>[C:1](=[O:2])O',
    weight: 0.14,
    note: 'Aldehyde dehydrogenase takes the aldehyde to the carboxylic acid. This is the step that empties the aldehyde pool left behind by deamination and by alcohol oxidation.'
  },
  {
    name: 'Ketone reduction',
    phase: 'I',
    enzyme: 'AKR or CBR',
    route: 'carbonyl reduction',
    smirks: '[CX3;H0;!$(C[OX2]);!$(C[NX3]);!$(C=[!O]);$(C([#6])[#6]):1]=[OX1:2]>>[CH1:1][O:2]',
    weight: 0.10,
    note: 'Aldo-keto reductases and carbonyl reductase reduce ketones to secondary alcohols. A new stereocentre is created here; which alcohol is formed is enzyme-dependent and is not predicted.'
  },
  {
    name: 'Aldehyde reduction',
    phase: 'I',
    enzyme: 'AKR or ADH',
    route: 'carbonyl reduction',
    smirks: '[CX3;H1:1]=[OX1:2]>>[C:1][O:2]',
    weight: 0.07,
    note: 'Reduction of the aldehyde back to the alcohol. For the deamination products of phenethylamines this competes with oxidation to the acid, which is why both the acid and the alcohol appear in urine.'
  },
  {
    name: 'Ester hydrolysis',
    phase: 'I',
    enzyme: 'Esterase',
    route: 'hydrolysis',
    smirks: '[CX3:1](=[OX1:2])[OX2][CX4:3]>>[C:1](=[O:2])O.[C:3]O',
    weight: 0.25,
    note: 'Carboxylesterases in liver and plasma cleave esters quickly, which is the whole design of a soft drug or an ester prodrug. Both halves are reported as separate metabolites.'
  },
  {
    name: 'Amide hydrolysis',
    phase: 'I',
    enzyme: 'Amidase',
    route: 'hydrolysis',
    smirks: '[CX3:1](=[OX1:2])[NX3;H1,H2:3]>>[C:1](=[O:2])O.[N:3]',
    weight: 0.08,
    note: 'Amides are hydrolysed much more slowly than esters, so this is a minor route for most molecules and a major one only for anilides and for a few peptide-like drugs.'
  },
  {
    name: 'Nitro reduction',
    phase: 'I',
    enzyme: 'Nitroreductase',
    route: 'reduction',
    smirks: '[N+:1](=[OX1])[OX1-]>>[NH2:1]',
    weight: 0.06,
    note: 'Gut flora and hepatic reductases take an aromatic nitro group down through the nitroso and hydroxylamine to the amine. The intermediates are mutagenic, which is where the genotoxicity of nitroaromatics comes from.'
  },
  {
    name: 'Aromatic O-glucuronidation',
    phase: 'II',
    enzyme: 'UGT',
    route: 'glucuronidation',
    smirks: '[c:1][OX2H:2]>>[c:1][O:2]C1OC(C(O)=O)C(O)C(O)C1O',
    weight: 0.25,
    note: 'UDP-glucuronosyltransferase attaches glucuronic acid to a phenol. The conjugate is acidic, much more water-soluble, and a substrate for biliary and renal transporters, so it is usually the end of the road.'
  },
  {
    name: 'Aliphatic O-glucuronidation',
    phase: 'II',
    enzyme: 'UGT',
    route: 'glucuronidation',
    smirks: '[CX4;!$(C(O)=O):1][OX2H:2]>>[C:1][O:2]C1OC(C(O)=O)C(O)C(O)C1O',
    weight: 0.10,
    note: 'The same conjugation on an aliphatic alcohol. It is slower than on a phenol, so an alcohol often has to be oxidised first for the molecule to be cleared.'
  },
  {
    name: 'Acyl glucuronidation',
    phase: 'II',
    enzyme: 'UGT',
    route: 'glucuronidation',
    smirks: '[CX3:1](=[OX1:2])[OX2H]>>[C:1](=[O:2])OC1OC(C(O)=O)C(O)C(O)C1O',
    weight: 0.12,
    note: 'Carboxylic acids are conjugated at the acid itself. Acyl glucuronides are reactive: they transacylate protein, which is the suspected mechanism behind the idiosyncratic hepatotoxicity of several carboxylic acid drugs.'
  },
  {
    name: 'N-glucuronidation',
    phase: 'II',
    enzyme: 'UGT',
    route: 'glucuronidation',
    smirks: '[NX3;H1,H2;!$(N[!#6;!#1]);!$(NC=[O,N,S]):1]>>[N:1]C1OC(C(O)=O)C(O)C(O)C1O',
    weight: 0.07,
    note: 'Amines can be glucuronidated directly on nitrogen. For tertiary amines the product is a quaternary ammonium glucuronide, which is a known route for antihistamines and tricyclics.'
  },
  {
    name: 'Aromatic O-sulfation',
    phase: 'II',
    enzyme: 'SULT',
    route: 'sulfation',
    smirks: '[c:1][OX2H:2]>>[c:1][O:2]S(=O)(=O)O',
    weight: 0.20,
    note: 'Sulfotransferase is high-affinity but low-capacity, so sulfation dominates at low dose and glucuronidation takes over once the sulfate donor is exhausted. That switch is the textbook explanation of paracetamol kinetics.'
  },
  {
    name: 'Aliphatic O-sulfation',
    phase: 'II',
    enzyme: 'SULT',
    route: 'sulfation',
    smirks: '[CX4;!$(C(O)=O):1][OX2H:2]>>[C:1][O:2]S(=O)(=O)O',
    weight: 0.07,
    note: 'Sulfation of an aliphatic alcohol. For benzylic and allylic alcohols the sulfate is a leaving group, so this conjugation can activate rather than detoxify.'
  },
  {
    name: 'N-acetylation (arylamine)',
    phase: 'II',
    enzyme: 'NAT',
    route: 'acetylation',
    smirks: '[c:1][NX3;H2:2]>>[c:1][N:2]C(C)=O',
    weight: 0.15,
    note: 'N-acetyltransferase 2 caps an aromatic amine. The enzyme is polymorphic, and the slow and fast acetylator phenotypes change both the dose needed and the toxicity seen for isoniazid, hydralazine and the sulfonamides.'
  },
  {
    name: 'N-acetylation (aliphatic amine)',
    phase: 'II',
    enzyme: 'NAT',
    route: 'acetylation',
    smirks: '[CX4:1][NX3;H2;!$(NC=[O,N,S]):2]>>[C:1][N:2]C(C)=O',
    weight: 0.06,
    note: 'Acetylation of a primary aliphatic amine, a minor route next to glucuronidation for most amines.'
  },
  {
    name: 'Epoxide glutathione addition',
    phase: 'II',
    enzyme: 'GST',
    route: 'glutathione conjugation',
    smirks: '[CX4;H1,H2:1]1[OX2:2][CX4:3]1>>[C:1]([O:2])[C:3]SCC(NC(=O)CCC(N)C(=O)O)C(=O)NCC(=O)O',
    weight: 0.14,
    note: 'Glutathione opens the epoxide. This is the main defence against the arene oxides and alkene oxides that CYP produces, and the point at which it fails - when glutathione runs out - is the point at which the reactive metabolite reaches protein and DNA.'
  },
  {
    name: 'Epoxide hydrolysis',
    phase: 'I',
    enzyme: 'Epoxide hydrolase',
    route: 'hydrolysis',
    smirks: '[CX4:1]1[OX2:2][CX4:3]1>>[C:1][O:2].[C:3]O',
    weight: 0.11,
    note: 'Epoxide hydrolase adds water across the ring to give the trans diol. The two halves are reported separately because the ring opening cuts the molecule in the template; chemically they stay joined as the diol.'
  },
  {
    name: 'Michael acceptor glutathione addition',
    phase: 'II',
    enzyme: 'GST',
    route: 'glutathione conjugation',
    smirks: '[CX3;H1,H2:1]=[CX3:2][CX3:3]=[OX1:4]>>[C:1](SCC(NC(=O)CCC(N)C(=O)O)C(=O)NCC(=O)O)[C:2][C:3]=[O:4]',
    weight: 0.12,
    note: 'Conjugate addition of glutathione to an activated double bond. The same electrophilicity that makes the alkene a glutathione substrate makes it a protein alkylator, so a hit here is both a clearance route and a warning.'
  },
  {
    name: 'Glycine conjugation',
    phase: 'II',
    enzyme: 'Acyl-CoA glycine N-acyltransferase',
    route: 'amino acid conjugation',
    smirks: '[c:1][CX3:2](=[OX1:3])[OX2H]>>[c:1][C:2](=[O:3])NCC(O)=O',
    weight: 0.08,
    note: 'Aromatic acids are conjugated with glycine after activation to the acyl-CoA. Benzoic acid to hippuric acid is the classical example, and the reaction that gave conjugation chemistry its name.'
  }
];

const METABOLIC_NOTES = [
  {
    name: 'Alpha-methyl blocks monoamine oxidase',
    smarts: '[CH3][CX4;H1]([NX3;H1,H2;!$(N[!#6;!#1]);!$(NC=[O,N,S])])[#6]',
    enzyme: 'MAO',
    note: 'The branch on the carbon next to nitrogen stops monoamine oxidase from abstracting the alpha hydrogen. This is why amphetamines are orally active and long-lived where dopamine and serotonin are destroyed within minutes, and why their deamination has to go through CYP instead.'
  },
  {
    name: 'Ring fluorine blocks its own position',
    smarts: '[F][c]',
    enzyme: 'CYP',
    note: 'An aromatic carbon-fluorine bond is not broken by CYP under physiological conditions, so a fluorine put on a ring carbon removes that carbon as a hydroxylation site. Replacing a hydrogen with fluorine at a position that would otherwise be oxidised redirects metabolism, and if the blocked route was the one producing a reactive metabolite, it lowers the burden of that metabolite.'
  },
  {
    name: 'Methylenedioxy group',
    smarts: '[c]1[c][OX2][CH2][OX2]1',
    enzyme: 'CYP2D6',
    note: 'A 1,3-dioxole fused to an aromatic ring is both a CYP2D6 substrate and a mechanism-based inhibitor: the carbene formed during ring opening coordinates the heme iron. That is why MDMA inhibits its own clearance and why its kinetics are non-linear.'
  },
  {
    name: 'Catechol',
    smarts: '[OX2H][c][c][OX2H]',
    enzyme: 'COMT',
    note: 'A catechol has two fates that pull in opposite directions: O-methylation by COMT, which ends the story, and two-electron oxidation to the ortho-quinone, which starts a new one. Anything that slows the first raises the share going through the second.'
  },
  {
    name: 'Tertiary butyl group',
    smarts: '[CX4;H0]([CH3])([CH3])[CH3]',
    enzyme: 'CYP',
    note: 'A quaternary carbon has no hydrogen to abstract, so the only oxidation available is on the methyls. Tert-butyl groups are used deliberately to block a metabolic soft spot.'
  },
  {
    name: 'Para position open on a monosubstituted ring',
    smarts: '[cH]1[cH][c]([!#1])[cH][cH][cH]1',
    enzyme: 'CYP',
    note: 'Hydroxylation of a benzene ring is fastest at the para position when that position is free, because the arene oxide intermediate is best stabilised there. An open para carbon is usually the first ring site to be oxidised.'
  },
  {
    name: 'Aromatic amine',
    smarts: '[NX3;H1,H2][c]',
    enzyme: 'CYP and NAT',
    note: 'Aromatic amines are both acetylated and N-hydroxylated. The acetylation is an exit; the N-hydroxylation leads to a nitrenium ion that binds DNA. Which one wins is a matter of competing rates, and the NAT2 polymorphism moves that balance from person to person.'
  },
  {
    name: 'Thiophene ring',
    smarts: 'c1ccsc1',
    enzyme: 'CYP',
    note: 'Thiophene is oxidised either to the S-oxide or to a thiophene epoxide, and both are electrophiles. The ring is a recognised structural alert for metabolic activation rather than a stable bystander.'
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { METABOLISM, METABOLIC_NOTES, AMINE_N };
}
