'use strict';

const GLOSSARY = {
  evidenceExact: ['Exact computation', 'Everything in this panel is counted or summed from the structure graph itself. There is no model and no training data, so there is nothing to be uncertain about beyond whether the SMILES you gave is the molecule you meant. Where a published definition is ambiguous the page shows both readings side by side rather than picking one.'],
  evidenceFitted: ['Fitted model', 'These numbers come from a published model whose coefficients were fitted to measured data, reimplemented here from the paper. The arithmetic is exact; the answer carries whatever error the original fit had, which is typically a few tenths of a log unit and is larger for molecules unlike the training set. Treat the digits after the first decimal as spurious precision.'],
  evidenceRule: ['Published rule', 'This panel applies thresholds somebody published, exactly as published. A pass or fail is a statement about the thresholds and nothing more: it is not a verdict on whether the molecule is a good drug, and plenty of marketed drugs fail several of these filters. Read it as a filter, not as a judgement.'],
  evidenceAnalogy: ['Structural analogy', 'This panel finds reference molecules whose fingerprints resemble yours, and reports them. Fingerprint resemblance is a structural statement, not a pharmacological one: two molecules can share a scaffold and act on nothing in common, and two molecules can act identically with no fingerprint overlap at all. Nothing here is evidence that your molecule does what its neighbours do.'],
  evidencePrediction: ['Prediction', 'This panel generates something that was not given to it, by applying reaction or scoring rules to the structure. The rules are drawn from reviews of the chemistry, but which of the possible outcomes actually happens, how much of it happens, and how fast, are not computed and cannot be read off this page. Treat the output as a list of plausible candidates to go and check.'],
  name: ['Name', 'The label you typed before the SMILES, or a generated one. It is only used to identify rows and tabs.'],
  smiles: ['SMILES', 'The structure you entered, as written. Everything on this page is derived from it: the parser builds an atom and bond graph, finds rings, decides aromaticity, kekulizes and then counts hydrogens from a valence model.'],
  formula: ['Molecular formula', 'Element counts in Hill order, with hydrogens added by the valence model rather than taken from the SMILES text.'],
  mw: ['Molecular weight', 'Average mass in g/mol, summed from standard atomic weights including the implicit hydrogens.'],
  exactMass: ['Monoisotopic mass', 'Mass using the most abundant isotope of each element. This is the number a mass spectrometer compares against, and it differs from the average molecular weight.'],
  heavyAtoms: ['Heavy atoms', 'Every atom except hydrogen. Several filters are written in terms of this count rather than molecular weight.'],
  carbons: ['Carbon atoms', 'Total carbons, aromatic and aliphatic. Muegge’s filter rejects fragments with four or fewer.'],
  depictHighlight: ['Highlight', 'Which atoms to mark on the drawing. Metabolism sites are the atoms a first-generation reaction rule acts on, taken from the transform engine itself rather than a separate model, so they follow the generation and phase filters in the metabolism panel. The other two modes mark whatever the alert and toxicity catalogues match.'],
  heteroatoms: ['Heteroatoms', 'Non-carbon, non-hydrogen atoms. A molecule with at most one is usually too greasy to be a drug candidate, which is why Muegge’s filter asks for more than one.'],
  charge: ['Formal charge', 'Sum of the formal charges written in the SMILES. It decides which branch of the bioavailability score applies, since anions behave differently.'],
  rings: ['Rings', 'Size of the smallest set of smallest rings: the number of independent cycles in the graph, which equals bonds minus atoms plus connected components.'],
  aromaticRings: ['Aromatic rings', 'Rings whose atoms were either written lowercase or satisfy a Hückel π-electron count of 4n+2.'],
  aromaticAtoms: ['Aromatic atoms', 'Atoms belonging to at least one aromatic ring after perception.'],
  rotatableBonds: ['Rotatable bonds', 'Single, acyclic bonds between two non-terminal heavy atoms, using the strict definition: triple-bond neighbours, CF₃, CCl₃, CBr₃ and tert-butyl groups are excluded, and so are amide and amidine-like bonds, whose rotation is hindered by conjugation.'],
  hbd: ['NH+OH count (Lipinski)', 'Every hydrogen attached to a nitrogen or oxygen, counted one per hydrogen, so an NH2 contributes two. This is the quantity Lipinski’s rule of five tests, which is why the rule-of-five row uses it. It matches RDKit’s NHOHCount on all 1012 reference compounds. For a paper’s “HBD”, compare the donor row below instead.'],
  hba: ['N+O count (Lipinski)', 'Every nitrogen and oxygen atom, whether or not it can really accept a hydrogen bond. This is the quantity Lipinski’s rule of five actually tests (“no more than 10 N or O”), which is why it is kept and why the rule-of-five row uses it. It is deliberately not the same number as the acceptor count below, and it is usually larger. It matches RDKit’s NOCount on all 1012 reference compounds. If you are comparing against a paper’s “HBA”, or against RDKit’s NumHAcceptors, compare the acceptor row instead.'],
  hbdStrict: ['H-bond donors', 'Donor groups rather than donor hydrogens: each nitrogen or oxygen carrying at least one hydrogen counts once however many hydrogens it has, so an NH2 contributes one, and a neutral thiol SH counts as well. This is the row to compare against RDKit’s NumHDonors or a paper’s “HBD”: it matches RDKit on all 1012 reference compounds. The count above answers a different question and will be larger whenever an NH2 or a water-like OH is present.'],
  hbaStrict: ['H-bond acceptors', 'The count most papers mean by “HBA”, and usually the smaller of the two. Only atoms with a lone pair actually available to accept: a hydroxyl next to a carbonyl is skipped, because a carboxylic acid’s own OH donates rather than accepts; an amide or sulfonamide nitrogen is skipped, because the lone pair is delocalised into the neighbouring double bond; a pyrrole-type ring nitrogen carrying a third substituent is skipped for the same reason, while a pyridine-type one is kept. A nitrogen whose neighbouring double bond lies inside a ring keeps its lone pair and is counted. This is the row to compare against RDKit’s NumHAcceptors or a paper’s “HBA”: it matches RDKit’s CalcNumHBA on all 1012 reference compounds. The N+O row above answers a different question and will usually be larger.'],
  tpsa: ['TPSA', 'Topological polar surface area in Å², by Ertl’s method: each nitrogen and oxygen contributes a value from a fitted table keyed on its bonding, and the contributions are summed. It tracks membrane permeability well; above roughly 140 Å² oral absorption tends to drop.'],
  fractionCsp3: ['Fraction Csp³', 'Share of carbons that are saturated. A low value means a flat, mostly aromatic molecule, which correlates with poorer solubility and more promiscuous binding.'],
  mr: ['Molar refractivity', 'Wildman–Crippen molar refractivity, a size-and-polarisability measure in cm³/mol. Ghose’s filter wants it between 40 and 130.'],
  logp: ['WLOGP', 'Octanol/water partition coefficient by the Wildman–Crippen atom-contribution method: every heavy atom and hydrogen is assigned one of 68 types and their contributions are summed. Higher means greasier.'],
  logS: ['Log S (ESOL)', 'Predicted decadic logarithm of aqueous solubility in mol/L, using Delaney’s ESOL equation from log P, molecular weight, rotatable bonds and the aromatic atom fraction. It is a linear fit, so treat it as an estimate, not a measurement.'],
  solubility: ['Solubility class', 'A plain-language band for the predicted log S, from insoluble below −10 up to highly soluble above 0.'],
  crippenTypes: ['Atom types', 'How many distinct Wildman–Crippen atom types the molecule contains. The table below lists them.'],
  abs: ['Bioavailability score', 'Martin’s probability that a compound exceeds 10% oral bioavailability in rat. Anions are scored from polar surface area alone (0.85, 0.56 or 0.11); everything else scores 0.55 if it passes the rule of five and 0.17 if it does not.'],
  lead: ['Lead-likeness', 'Whether the molecule is small and simple enough to be a starting point rather than a finished drug: molecular weight 250–350, log P at most 3.5 and at most 7 rotatable bonds.'],
  Lipinski: ['Lipinski rule of five', 'Pfizer’s oral-bioavailability filter: molecular weight at most 500, log P at most 5, at most 5 H-bond donors and at most 10 acceptors. One violation is tolerated.'],
  Ghose: ['Ghose filter', 'A drug-likeness window from a comparison of drug and non-drug databases: molecular weight 160–480, log P −0.4 to 5.6, molar refractivity 40–130 and 20–70 heavy atoms.'],
  Veber: ['Veber rules', 'From a GSK study of rat oral bioavailability: at most 10 rotatable bonds and TPSA at most 140 Å². Flexibility and polarity, not weight, were the properties that mattered.'],
  Egan: ['Egan egg', 'Pharmacia’s absorption model, which keeps log P at or below 5.88 and TPSA at or below 131.6 Å².'],
  Muegge: ['Muegge filter', 'Bayer’s pharmacophore-point filter, the strictest of the five: weight 200–600, log P −2 to 5, TPSA at most 150 Å², at most 7 rings, more than 4 carbons, more than 1 heteroatom, at most 15 rotatable bonds, at most 10 acceptors and at most 5 donors.'],
  hia: ['Passive absorption', 'Whether the molecule falls inside the outer region of the TPSA-against-log P plot, which the BOILED-Egg model associates with passive gastrointestinal absorption.'],
  bbb: ['Brain penetration', 'Whether the molecule falls inside the inner region of the same plot, associated with crossing the blood–brain barrier. Being outside it is desirable for a drug that should stay out of the brain.'],
  LIPO: ['LIPO', 'Lipophilicity as WLOGP. The favourable band is −0.7 to 5.0.'],
  SIZE: ['SIZE', 'Molecular weight. The favourable band is 150 to 500 g/mol.'],
  POLAR: ['POLAR', 'Topological polar surface area. The favourable band is 20 to 130 Å².'],
  INSOLU: ['INSOLU', 'Predicted log S. The favourable band is −6 to 0; further left means less soluble.'],
  INSATU: ['INSATU', 'Fraction of saturated carbons. At least 0.25 is favourable; a lower value means an unusually flat molecule.'],
  FLEX: ['FLEX', 'Rotatable bonds. Up to 9 is favourable.'],
  atomIndex: ['Atom', 'Position of the atom in the parsed structure, counting from one in the order it appears in the SMILES.'],
  atomElement: ['Element', 'Chemical element, with a lowercase marker if the atom ended up aromatic.'],
  atomH: ['H', 'Hydrogens on the atom: those written explicitly in brackets plus those added by the valence model.'],
  atomType: ['Type', 'Which of the 68 Wildman–Crippen atom types the atom matched. The rules are tried in a fixed order and the first match wins.'],
  atomLogp: ['Δ log P', 'The atom type’s contribution to WLOGP, including its hydrogens.'],
  atomMr: ['Δ MR', 'The atom type’s contribution to molar refractivity, including its hydrogens.'],
  aliphaticRings: ['Aliphatic rings', 'Rings carrying at least one non-aromatic bond. Saturated and partly unsaturated rings both count.'],
  saturatedRings: ['Saturated rings', 'Rings in which every bond is a single bond and no atom is aromatic — the fully sp³ rings that raise the saturated-carbon fraction.'],
  heterocycles: ['Heterocycles', 'Rings containing at least one atom that is neither carbon nor hydrogen.'],
  largestRing: ['Largest ring', 'Size of the biggest ring in the smallest set of smallest rings. A macrocycle shows up here as a ring well above six.'],
  halogens: ['Halogens', 'Fluorine, chlorine, bromine and iodine atoms. Halogens raise lipophilicity sharply and are often added to block metabolism.'],
  amideBonds: ['Amide bonds', 'Non-aromatic carbonyl-to-nitrogen single bonds. They resist rotation, which is why the strict rotatable-bond count excludes them.'],
  spiroAtoms: ['Spiro atoms', 'Atoms shared by two rings that have nothing else in common. A spiro centre forces the two rings perpendicular, which rigidifies the molecule.'],
  stereoCenters: ['Stereocentres', 'Atoms whose four substituents are all different, so swapping two of them gives a different molecule. The count is perceived from the graph; the figure in brackets is how many of them the SMILES actually pins down with an @ or @@ tag.'],
  stereoLabels: ['CIP labels', 'R or S per stereocentre, assigned by the Cahn\u2013Ingold\u2013Prelog rules from atomic number and substituent hierarchy. The number is the atom index in the SMILES, counting heavy atoms from 1. A centre whose configuration is given but whose label needs CIP rules beyond atomic number is withheld rather than guessed.'],
  stereoWithheld: ['Labels withheld', 'Centres with a specified configuration that this engine will not label: nitrogen centres, and pseudo-asymmetric carbons in bridged cages where the ranking needs the later CIP rules. Withholding keeps the printed labels at zero disagreements with RDKit rather than filling them in with a guess.'],
  stereoBonds: ['Stereogenic double bonds', 'Double bonds whose two ends each carry different substituents, so cis and trans are distinct molecules. The bracketed figure counts the ones the SMILES pins down with / or \\.'],
  stereoBondLabels: ['E/Z labels', 'E or Z per stereogenic double bond, assigned by CIP priority on each end. The two numbers are the SMILES atom indices of the bond.'],
  stereoUnspecified: ['Unspecified', 'Stereogenic centres and bonds the SMILES leaves open. Each one doubles the number of distinct compounds the string describes, so a value above zero means the input is a set of stereoisomers rather than a single substance.'],
  bridgeheadAtoms: ['Bridgehead atoms', 'The two end atoms of a bridge shared by two rings that have more than one bond in common — the hallmark of a caged, three-dimensional skeleton.'],
  chi0: ['Chi0', 'Zeroth-order connectivity index: the sum of 1/√δ over heavy atoms, where δ is the number of heavy neighbours. It grows with size and with branching.'],
  chi1: ['Chi1', 'First-order connectivity index: the same sum taken over bonds, as 1/√(δᵢδⱼ). Randić introduced it as a measure of branching, and it is still one of the most used descriptors in QSAR.'],
  chi0v: ['Chi0v', 'Valence-corrected Chi0, where each atom\u2019s degree is replaced by a valence degree derived from its valence electrons, hydrogens and atomic number. This lets it distinguish heteroatoms from carbon.'],
  chi1v: ['Chi1v', 'Valence-corrected Chi1, the bond-wise version of the same idea.'],
  hallKierAlpha: ['Hall-Kier alpha', 'Sum of per-atom corrections for atom size and hybridization, relative to sp³ carbon. It is negative for small, unsaturated, mostly organic molecules and positive for ones carrying sulfur, chlorine, bromine or iodine. The shape indices below are all adjusted by it.'],
  kappa1: ['Kappa1', 'First-order shape index: how far the molecule is from a linear chain of the same size, corrected by the Hall-Kier alpha.'],
  kappa2: ['Kappa2', 'Second-order shape index, built from two-bond paths. It responds to branching and to how spread out the skeleton is.'],
  kappa3: ['Kappa3', 'Third-order shape index, built from three-bond paths. It is the one that reacts most strongly to ring fusion and central branching.'],
  alertFilter: ['Catalogue', 'Restricts the table to one catalogue of alerts, or shows every pattern including the ones that did not match.'],
  alertName: ['Alert', 'The name of the matched substructure. Each one is a SMARTS pattern encoding a group that medicinal chemists flag, either because it is chemically reactive or because it makes assay readouts unreliable.'],
  alertSource: ['Catalogue', 'Where the pattern comes from: Brenk for the unwanted-functionality list published with the Brenk filter, PAINS for frequent-hitter motifs, and Reactive for plainly electrophilic or unstable groups that every screening deck removes.'],
  alertCount: ['Matches', 'How many distinct places in the molecule match this pattern, counted the way RDKit counts unique substructure matches. Two matches of the same alert mean two separate liabilities, not a stronger single one.'],
  alertAtoms: ['Atoms', 'The atoms involved, numbered from 1 in the order they appear in the parsed SMILES. Heavy atoms only, since hydrogens are added by the valence model rather than written out.'],
  alertSmarts: ['Pattern', 'The SMARTS query that matched, shown so you can check what was actually asked. The matcher is implemented in this page and was validated against RDKit on every pattern across the reference library.'],
  alertNote: ['Concern', 'A one-line note on why the group is flagged. Hand-written reference text, not computed from the structure.'],
  alertTotal: ['Structural alerts', 'How many of the catalogued patterns match this molecule. A hit is not a verdict: many marketed drugs carry one deliberately, and the panel below says which and why.'],
  toxFilter: ['Endpoint', 'Restricts the table to one toxicity endpoint, or shows every rule including the ones that did not fire.'],
  toxName: ['Rule', 'The name of the toxicophore or computed rule. Most are SMARTS substructures; four are counted from the ring perception or the physicochemical descriptors because they cannot be written as a substructure query.'],
  toxEndpoint: ['Endpoint', 'Which assay the rule was derived against: genotoxicity means bacterial mutagenicity (the Ames test), carcinogenicity means the rodent bioassay, neurotoxicity and cardiotoxicity are literature mechanisms rather than a single assay.'],
  toxSource: ['Source', 'Where the rule comes from. Kazius for the Ames toxicophores published by Kazius, McGuire and Bursi; Benigni-Bossa for the carcinogenicity alerts implemented in Toxtree; Literature for single-mechanism motifs with a named precedent; Computed where no published catalogue stands behind the rule. Four rules in the table are evaluated from the ring perception or the descriptors rather than matched as a substructure; their rule body is written out in words instead of a pattern.'],
  toxCount: ['Matches', 'How many distinct places in the molecule the rule fires. For the computed rules it is one if the condition holds and zero if it does not.'],
  toxAtoms: ['Atoms', 'The atoms involved, numbered from 1 in the order they appear in the parsed SMILES. Empty for a rule that is a property test rather than a substructure.'],
  toxPattern: ['Rule body', 'The SMARTS query, or for a computed rule the condition in words. Shown so you can check what was actually asked rather than trusting the label.'],
  toxNote: ['Mechanism', 'A one-line note on the activation pathway or mechanism that makes the group a liability. Hand-written reference text, not computed.'],
  toxTotal: ['Toxicity flags', 'How many toxicology rules fire across all four endpoints. A hit is a question to answer, not a finding: several marketed drugs match three or four.'],
  Genotoxicity: ['Genotoxicity', 'Substructures enriched among Ames-positive compounds. The mechanism is almost always metabolic activation to an electrophile that alkylates DNA, so the patterns encode the precursor rather than the damage.'],
  Carcinogenicity: ['Carcinogenicity', 'Structural alerts from the Benigni-Bossa rulebase for the rodent carcinogenicity bioassay, plus the computed fused-aromatic rules. Genotoxic and non-genotoxic mechanisms are mixed together here, as they are in the published rulebase.'],
  Neurotoxicity: ['Neurotoxicity', 'Motifs with a named neurotoxic precedent (organophosphate and carbamate cholinesterase inhibition, gamma-diketone axonopathy, acrylamide, the MPTP-type tetrahydropyridine) read alongside whether the molecule is predicted to reach the brain at all.'],
  Cardiotoxicity: ['Cardiotoxicity', 'One rule, and a crude one: the lipophilic-basic-amine pharmacophore shared by most hERG potassium channel blockers. QT prolongation is the single commonest cause of late-stage attrition, which is why even a three-term rule is worth showing.'],
  metSummary: ['Metabolism', 'How many distinct metabolites the rule set reaches from this structure within the chosen number of generations, and how they split between phase I (functionalisation) and phase II (conjugation).'],
  metRoute: ['Route', 'The reaction class, named the way the metabolism literature names it: oxidative N-dealkylation, benzylic hydroxylation, glucuronidation, and so on.'],
  metPrimary: ['Leading route', 'The enzyme family with the greatest summed weight across all reachable metabolites. Summed published class frequencies, not a measured flux.'],
  metOpen: ['Open aromatic positions', 'Aromatic CH carbons, counted directly. Each one is a site CYP can hydroxylate; a fluorine, a methyl or any other substituent at that carbon removes it from this count, which is the mechanical reason a halogenated analogue has fewer ring-oxidation routes than its parent.'],
  metNewTox: ['New toxicity flags', 'Toxicity rules that fire on at least one metabolite and do not fire on the parent. This is the panel asking whether the molecule becomes a liability only after the body has worked on it.'],
  metRank: ['#', 'Rank by relative weight, highest first. Ties are broken by generation.'],
  metSmiles: ['Metabolite', 'The predicted structure, written by this page\u2019s own SMILES writer. Click a row to load it as the query and run every panel on it.'],
  metStep: ['Step', 'The rule that produced this metabolite, and which structure it came from: the parent, or an earlier metabolite by its label.'],
  metEnzyme: ['Enzyme', 'The enzyme family that performs this class of reaction: CYP, MAO, FMO, ADH, AKR, COMT, UGT, SULT, NAT, GST, or a hydrolase. Attribution is by reaction class, not by a measured isoform assignment.'],
  metPhase: ['Phase', 'Phase I introduces or exposes a functional group; phase II attaches a polar conjugate to one. A phase II rule usually needs a phase I step first, which is why most conjugates appear in the second generation.'],
  metScore: ['Relative weight', 'The product of the published class frequencies along the path from the parent, each one scaled by its site factor. It orders the list; it is not a probability, a yield or a fraction of dose. The band under the number is a reading of that same product against two fixed cuts: major at 0.10 and above, minor from 0.02 to 0.10, trace below 0.02. A trace label means the route needs an unlikely step or a chain of them, not that a measured fraction of the dose was small.'],
  metBandFilter: ['Abundance', 'Shows only metabolites in one band. Major routes are the ones a rule set is most confident about; the trace list is where a reactive metabolite with a small predicted weight shows up, which is often what matters for toxicity.'],
  metSite: ['Site factor', 'How much the reaction weight is raised or lowered for the particular atom attacked, relative to an unsubstituted position of the same kind on the same ring or chain. Neighbouring groups that donate electron density raise an aromatic position, withdrawing groups lower it, crowding lowers it, and a branch point raises an aliphatic one. The factors are a transparent heuristic written from directing-effect and bond-strength arguments, clamped to 0.2x-2.5x; they are not fitted to measured turnover.'],
  metProps: ['MW / log P / TPSA', 'The metabolite run back through the same descriptor code as the parent. A conjugate adding 176 to the mass and 100 to the polar surface is the signature of glucuronidation.'],
  metTox: ['New toxicity flags', 'Toxicity rules firing on this metabolite that do not fire on the parent molecule.'],
  metNote: ['Mechanism', 'Why this reaction happens at this site, in one line. Reference text, hand-written.'],
  metDepth: ['Generations', 'How many sequential metabolic steps to enumerate. Two is enough to reach the conjugates of phase I products, which is where most reported metabolites sit.'],
  metPhaseFilter: ['Phase', 'Restricts the enumeration to one phase. Phase I only shows the oxidative and reductive chemistry; phase II only shows what can be conjugated directly on the parent.'],
  metCount: ['Metabolites', 'How many rows to list. The ranking and the counts above cover every metabolite either way.'],
  metNoteName: ['Observation', 'A structural feature with a known consequence for metabolism, matched on the parent molecule.'],
  metNoteEnzyme: ['Enzyme', 'The enzyme the observation concerns.'],
  metNoteAtoms: ['Atoms', 'Which atoms of the parent carry the feature, numbered as in the atom table.'],
  metNoteText: ['Why it matters', 'What the feature does to the molecule\u2019s metabolism, including the cases where it blocks a route rather than opening one.'],
  depBand: ['Analogy band', 'A plain-language reading of the highest fingerprint similarity to any drug in the labelled dependence set. Four bands, cut at 0.85, 0.65 and 0.45 on the metric chosen in the similarity panel.'],
  depNearest: ['Nearest liability', 'The closest drug in the set that carries a documented high or moderate dependence liability, and how similar it is. Antagonists and the other counter-examples are excluded from this one number but still listed in the table.'],
  depReward: ['Reward-circuit proximity', 'The highest similarity between the query and any known ligand of the opioid, dopaminergic, nicotinic, GABAergic or glutamatergic targets through which dependence is mediated. Taken from the same target set as the prediction panel.'],
  depCount: ['Neighbours', 'How many of the forty labelled drugs to list. The ranking covers all of them either way.'],
  depRank: ['#', 'Rank by similarity to the query, counting every labelled drug including the counter-examples.'],
  depName: ['Drug', 'A drug with a documented dependence liability, or a deliberate counter-example. All forty are entries in the reference library, so the similarity is computed the same way as everywhere else on this page.'],
  depClass: ['Class', 'The pharmacological family: opioid, stimulant, sedative, dissociative, nicotinic, cannabinoid or hallucinogen, plus the antagonists kept as counter-examples.'],
  depLiability: ['Liability', 'Hand-assigned from the clinical literature: high for a drug with tolerance and a defined withdrawal syndrome, moderate where dependence is documented but milder or route-dependent, low where misuse is reported without much physical dependence, none for the counter-examples. A label, not a measurement.'],
  depSimilarity: ['Similarity', 'Fingerprint similarity between the query and that drug, using the method and metric selected in the similarity panel.'],
  depNote: ['Mechanism', 'Why that drug has the liability it has, in one line. Reference text.'],
  depTargetName: ['Target', 'A receptor or transporter through which physical dependence is mediated.'],
  depTargetGene: ['Gene', 'The HGNC symbol for that target.'],
  depTargetScore: ['Similarity', 'Similarity between the query and the closest known ligand of that target, scored exactly as in the target prediction panel.'],
  depTargetLigand: ['Nearest ligand', 'The known active of that target which the query most resembles.'],
  tgtCount: ['Targets', 'How many targets to list. The ranking covers every target in the set either way.'],
  tgtMin: ['Min score', 'Hides targets whose nearest known ligand is less similar than this. A low cut shows weak, speculative matches; raise it to keep only targets with a genuinely close relative of the query among their actives.'],
  tgtOrganism: ['Organism', 'Which organism the target belongs to. Non-human targets are the selectivity story of an anti-infective: a bacterial, fungal, viral or parasite protein with no close human counterpart is why the drug can be given at all.'],
  tgtOrganismFilter: ['Organism', 'Restricts the table to targets from one organism. Useful for asking what an anti-infective scaffold looks like against human proteins, or the reverse.'],
  tgtMean: ['Mean top-3', 'The average similarity of the three closest known ligands of this target, or of all of them if there are fewer than three. The single-best score can be carried by one lucky neighbour; a high mean means the query resembles the whole cluster of actives, which is the stronger signal.'],
  tgtNote: ['Mechanism', 'A one-line note on what the target does and why it is drugged. Hand-written reference text, not computed from the structure.'],
  tgtRank: ['#', 'Rank by score, highest first.'],
  tgtName: ['Target', 'The protein, named as it appears in the curated ligand set.'],
  tgtGene: ['Gene', 'The human gene symbol, or the microbial gene name for antibacterial, antifungal and antiviral targets.'],
  tgtFamily: ['Family', 'Broad target class: GPCR, enzyme, kinase, ion channel, transporter, nuclear receptor or ribosome.'],
  tgtScore: ['Nearest similarity', 'The similarity between the query and the most similar of this target’s known ligands, computed with the fingerprint and metric chosen in the similarity panel above. It is the same number the similarity table would print for that one ligand. It is a structural resemblance and nothing else: 0.45 here means a Tanimoto of 0.45, not a 45% chance of binding. The column exists to rank these targets against each other, and the ranking is only over the ligand sets this page carries.'],
  tgtNearest: ['Nearest ligand', 'The known ligand of this target that the query resembles most. Click the row to profile it.'],
  tgtLigands: ['Actives', 'How many known ligands of this target are in the reference library. A target with one ligand can only ever be matched through that single compound, so its score says much less.'],
  tgtRecovered: ['Recovered', 'How often this target came first when one of its own known ligands was used as the query. Each of its ligands is removed from the library in turn, the remaining targets are re-scored exactly as they are here, and the share of those trials where this target ranked first is the number shown, with the number of trials in brackets. A target with fewer than two ligands cannot be tested at all and shows a dash, because dropping its only ligand leaves nothing to match against. This is the one number on the page that says how often the ranking has actually been right, measured rather than asserted \u2014 and it is measured on hand-curated ligand sets of a median of three compounds, so a target with 100% over two trials has been right twice, not validated. A low figure is not always a failure of the ranking: 5-HT2A and 5-HT2C share most of their ligands, so whichever of the two the fingerprint prefers takes every first place and the other scores zero while still sitting at rank two or three. For families like that the top-five figure in the line above the table is the fair one.'],
  metCases: ['Known-answer tests', 'A fixture set of 16 documented metabolites across 14 drugs \u2014 aspirin to salicylic acid, codeine to morphine and norcodeine, diazepam to nordazepam, MDMA to MDA and HHMA, morphine to its glucuronide, and others whose major route is textbook. The engine is run on each parent, the products are canonicalised, and the documented metabolite is looked for by structure. Regenerate it with tools/metabolism-cases.js. Two cases land in the minor band rather than the major one: paracetamol to NAPQI, whose rule carries a deliberately low weight because the conjugation routes dominate at ordinary doses, and caffeine to paraxanthine, where N3-demethylation is about 80% of caffeine clearance in people while the aromatic N-methyl rule here carries a generic class frequency of 0.09. Those weights were left alone on purpose: tuning a rule until a fixture passes makes the fixture meaningless. What the test shows is that the documented route is found and ranked, not that the weights are rates.'],
  tgtBenchmark: ['Measured recall', 'The whole target panel, scored against itself by leave-one-out: every known ligand of every target is held out, the targets are re-ranked, and the rank of the ligand\u2019s own target is recorded. Regenerate it with tools/retrieval-benchmark.js. The three baselines matter as much as the headline: ranking targets by how many ligands they happen to have, with no structure at all, and ranking them at random. The gap between those and the measured number is what the fingerprint is worth here.'],
  simMethod: ['Fingerprint', 'Which structural fingerprint is compared. ECFP4 and ECFP6 hash circular atom environments out to two and three bonds; FCFP4 does the same but describes each atom by its pharmacophore role (donor, acceptor, aromatic, halogen, basic, acidic) instead of its element, so it tolerates element swaps; atom pairs record every pair of typed atoms together with the number of bonds between them.'],
  simMetric: ['Metric', 'How two bit sets are turned into one number. Tanimoto divides the shared bits by the union, Dice by the mean set size. Dice is always the larger of the two and is more forgiving when the molecules differ in size.'],
  simCount: ['Hits', 'How many of the ranked reference compounds to list.'],
  simRank: ['Rank', 'Position in the ranking, best first. Ties are left in library order.'],
  simName: ['Compound', 'The reference compound. Click the row to profile it on this page.'],
  simClass: ['Class', 'A rough pharmacological label for the reference compound. It is only a hint about what the neighbourhood of your query looks like; it is not a prediction.'],
  simScore: ['Score', 'The similarity between the query and this compound, from 0 to 1. For ECFP-type fingerprints a Tanimoto above roughly 0.6 usually means a recognisable common scaffold, and above 0.85 means close analogues; atom-pair scores run much higher for the same pair of molecules, so compare them only within one method.'],
  simShared: ['Shared', 'Number of fingerprint bits present in both molecules, followed by the number set in the reference compound. It shows whether a high score comes from a real overlap or from both molecules simply having few bits.'],
  simBits: ['Query bits', 'How many distinct fingerprint bits the query sets. Small molecules set few bits, which makes every score noisier.']
};

const EXAMPLES = [
  ['aspirin', 'CC(=O)Oc1ccccc1C(=O)O'],
  ['caffeine', 'Cn1cnc2c1c(=O)n(C)c(=O)n2C'],
  ['ibuprofen', 'CC(C)Cc1ccc(cc1)C(C)C(=O)O'],
  ['paracetamol', 'CC(=O)Nc1ccc(O)cc1'],
  ['morphine', 'CN1CCC23c4c5ccc(O)c4OC2C(O)C=CC3C1C5'],
  ['atorvastatin', 'CC(C)c1c(C(=O)Nc2ccccc2)c(-c2ccccc2)c(-c2ccc(F)cc2)n1CCC(O)CC(O)CC(=O)O'],
  ['metformin', 'CN(C)C(=N)N=C(N)N'],
  ['ciprofloxacin', 'OC(=O)c1cn(C2CC2)c2cc(N3CCNCC3)c(F)cc2c1=O'],
  ['sucrose', 'OCC1OC(OC2(CO)OC(CO)C(O)C2O)C(O)C(O)C1O'],
  ['diazepam', 'CN1c2ccc(Cl)cc2C(=Nc2ccccc2)CC1=O']
];

const BATCH_COLUMNS = [
  ['name', 'Name', (d) => d.name],
  ['formula', 'Formula', (d) => d.formula],
  ['mw', 'MW', (d) => d.mw.toFixed(2)],
  ['logp', 'WLOGP', (d) => d.logp.toFixed(2)],
  ['tpsa', 'TPSA', (d) => d.tpsa.toFixed(1)],
  ['logS', 'Log S', (d) => d.logS.toFixed(2)],
  ['hbd', 'NH+OH', (d) => d.hbd],
  ['hba', 'N+O', (d) => d.hba],
  ['rotatableBonds', 'RotB', (d) => d.rotatableBonds],
  ['rings', 'Rings', (d) => d.rings],
  ['fractionCsp3', 'Csp3', (d) => d.fractionCsp3.toFixed(2)],
  ['abs', 'ABS', (d) => d.abs.toFixed(2)],
  ['Lipinski', 'Filters', (d) => d.passed + '/' + d.total]
];

const tip = document.createElement('div');
tip.id = 'tip';
tip.hidden = true;
document.body.appendChild(tip);

let records = [];
let current = 0;
let simPage = 1;
let batchPage = 1;
let preparedBatchRows = [];
let latestInputIssues = [];
let activeAnalysis = null;

const libraryCache = new Map();

function libraryFingerprints(methodKey) {
  if (libraryCache.has(methodKey)) return libraryCache.get(methodKey);
  const built = [];
  LIBRARY.forEach((entry) => {
    try {
      const mol = buildMolecule(parseSmiles(entry.smiles));
      built.push({ entry, fp: fingerprint(mol, methodKey) });
    } catch (error) { /* a reference entry that will not parse is simply left out */ }
  });
  libraryCache.set(methodKey, built);
  return built;
}

function infoButton(key) {
  if (!GLOSSARY[key]) return '';
  return '<button type="button" class="info" data-tip="' + key + '" aria-label="About this value" tabindex="0">i</button>';
}

function showTip(target) {
  const entry = GLOSSARY[target.dataset.tip];
  if (!entry) return;
  tip.innerHTML = '<strong></strong><span></span>';
  tip.querySelector('strong').textContent = entry[0];
  tip.querySelector('span').textContent = entry[1];
  tip.hidden = false;
  const box = target.getBoundingClientRect();
  const size = tip.getBoundingClientRect();
  let left = box.left + box.width / 2 - size.width / 2;
  left = Math.max(10, Math.min(left, window.innerWidth - size.width - 10));
  let top = box.bottom + 9;
  if (top + size.height > window.innerHeight - 10) top = box.top - size.height - 9;
  tip.style.left = left + 'px';
  tip.style.top = Math.max(10, top) + 'px';
}

function hideTip() {
  tip.hidden = true;
}

document.addEventListener('pointerover', (event) => {
  const target = event.target.closest('[data-tip]');
  if (target) showTip(target);
  else if (!event.target.closest('#tip')) hideTip();
});
document.addEventListener('focusin', (event) => {
  const target = event.target.closest('[data-tip]');
  if (target) showTip(target);
});
document.addEventListener('focusout', hideTip);
window.addEventListener('scroll', hideTip, true);

function rows(target, entries) {
  target.innerHTML = entries.map(([key, label, value]) => (
    '<dt>' + label + infoButton(key) + '</dt><dd>' + value + '</dd>'
  )).join('');
}

function parsesAsSmiles(text) {
  if (!text) return false;
  try {
    return buildMolecule(parseSmiles(text)).atoms.length > 0;
  } catch (error) {
    return false;
  }
}

function splitLine(line) {
  const trimmed = line.trim();
  const tab = trimmed.indexOf('\t');
  const comma = trimmed.indexOf(',');
  const cut = tab >= 0 ? tab : comma;
  if (cut >= 0) {
    const head = trimmed.slice(0, cut).trim();
    const tail = trimmed.slice(cut + 1).trim();
    if (!tail) return { name: null, smiles: head };
    if (parsesAsSmiles(tail)) return { name: head || null, smiles: tail };
    if (parsesAsSmiles(head)) return { name: tail || null, smiles: head };
    return { name: head || null, smiles: tail };
  }
  if (parsesAsSmiles(trimmed)) return { name: null, smiles: trimmed };
  const parts = trimmed.split(/\s+/);
  for (let keep = parts.length - 1; keep >= 1; keep -= 1) {
    const candidate = parts.slice(keep).join(' ');
    if (parsesAsSmiles(candidate)) {
      return { name: parts.slice(0, keep).join(' '), smiles: candidate };
    }
  }
  for (let keep = 1; keep < parts.length; keep += 1) {
    const candidate = parts.slice(0, keep).join(' ');
    if (parsesAsSmiles(candidate)) {
      return { name: parts.slice(keep).join(' '), smiles: candidate };
    }
  }
  return { name: null, smiles: trimmed };
}

function setAnalysisBusy(busy) {
  document.getElementById('run').disabled = busy;
  document.getElementById('cancel-analysis').hidden = !busy;
  document.getElementById('analysis-progress').hidden = !busy;
  document.getElementById('smiles-input').setAttribute('aria-busy', String(busy));
  for (const id of ['export', 'export-full', 'export-snapshot', 'export-research']) {
    document.getElementById(id).disabled = busy || records.length === 0;
  }
}

async function analyse() {
  const text = document.getElementById('smiles-input').value;
  const input = InputWorkflow.parseInputText(text);
  const status = document.getElementById('status');
  if (activeAnalysis) activeAnalysis.cancelled = true;
  const job = {cancelled:false};
  activeAnalysis = job;
  const nextRecords = [];
  const nextPrepared = [];
  const problems = [];
  setAnalysisBusy(true);
  status.classList.remove('error');
  try {
    const outcome = await CooperativeBatch.run(input.rows, (row, index) => {
      if(row.error){problems.push({line:row.line,input:row.raw,reason:row.error});return;}
      const parsed = row.smiles ? {name:row.name,smiles:row.smiles} : splitLine(row.raw);
      try {
        const mol = buildMolecule(parseSmiles(parsed.smiles));
        const d = describe(mol);
        const verdicts = evaluate(d);
        const record = {
          name: parsed.name || ('molecule ' + (index + 1)),
          smiles: parsed.smiles,
          mol,
          d,
          v: verdicts
        };
        const prepared = {name:record.name,smiles:record.smiles,row:batchRow(record)};
        nextRecords.push(record);
        nextPrepared.push(prepared);
      } catch (error) {
        problems.push({line:row.line,input:row.raw,reason:error.message});
      }
    }, {
      isCancelled: () => job.cancelled || activeAnalysis !== job,
      onProgress: (completed, total) => {
        if (activeAnalysis !== job) return;
        const progress = document.getElementById('analysis-progress');
        progress.max = Math.max(1, total);
        progress.value = completed;
        status.textContent = 'Analyzing ' + completed + ' of ' + total + ' input records…';
      }
    });
    if (activeAnalysis !== job) return;
    if (outcome.cancelled) {
      status.textContent = 'Analysis cancelled after ' + outcome.completed + ' of ' + outcome.total
        + ' records. Previous completed results retained.';
      return;
    }
    records = nextRecords;
    preparedBatchRows = nextPrepared;
    latestInputIssues = problems.slice();
    const summary = InputWorkflow.summarizeOutcomes(records.length, problems, input.rows.length);
    status.classList.toggle('error', problems.length > 0);
    status.textContent = summary.status;
    const feedback = document.getElementById('input-feedback');
    feedback.hidden = input.rows.length===0 && problems.length===0;
    document.getElementById('input-summary').textContent =
      summary.successes+' of '+summary.total+' input records analyzed ('+input.format+' format). '
      + (summary.failures ? 'Invalid entries were skipped; valid results are retained.' : 'No invalid entries found.');
    const errors = document.getElementById('input-errors');
    errors.replaceChildren();
    problems.slice(0,100).forEach(problem => {
      const item = document.createElement('p');
      item.textContent = 'Line '+problem.line+': '+problem.reason+' — '+problem.input.slice(0,130);
      errors.appendChild(item);
    });
    if(problems.length>100) {
      const item=document.createElement('p');
      item.textContent=(problems.length-100)+' additional errors not displayed.';
      errors.appendChild(item);
    }

    document.getElementById('export').disabled = records.length === 0;
    document.getElementById('export-full').disabled = records.length === 0;
    document.getElementById('export-snapshot').disabled = records.length === 0;
    document.getElementById('export-research').disabled = records.length === 0;
    document.getElementById('results').hidden = records.length === 0;
    if (!records.length) {
      document.dispatchEvent(new Event('molecule-profiler:updated'));
      return;
    }
    current = 0;
    simPage = 1;
    batchPage = 1;
    renderTabs();
    renderBatch();
    renderCurrent();
    document.dispatchEvent(new Event('molecule-profiler:updated'));
  } catch (error) {
    if (activeAnalysis === job) {
      status.classList.add('error');
      status.textContent = 'Analysis could not finish: ' + error.message;
    }
  } finally {
    if (activeAnalysis === job) {
      activeAnalysis = null;
      setAnalysisBusy(false);
    }
  }
}

function renderTabs() {
  const nav = document.getElementById('molecule-tabs');
  nav.hidden = records.length < 2;
  nav.innerHTML = records.map((record, index) => (
    '<button type="button" role="tab" data-index="' + index + '" aria-selected="'
      + (index === current) + '">' + escapeHtml(record.name) + '</button>'
  )).join('');
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

function renderCurrent() {
  const record = records[current];
  if (!record) return;
  document.querySelectorAll('#molecule-tabs [data-index]').forEach(button => {
    const selected = Number(button.dataset.index) === current;
    button.setAttribute('aria-selected', String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  const d = record.d;
  const v = record.v;
  document.dispatchEvent(new Event('molecule-profiler:selected'));
  const quality = MoleculeQuality.evaluate(record);
  const qualityHost = document.getElementById('quality-summary');
  qualityHost.hidden = false;
  document.getElementById('quality-status').textContent =
    quality.status === 'complete' ? 'No basic descriptor quality flags detected.' :
    quality.issues.length + ' review flag(s) for this molecule.';
  const qualityList = document.getElementById('quality-issues');
  qualityList.replaceChildren();
  for (const issue of quality.issues) {
    const item = document.createElement('li');
    item.textContent = issue.reason;
    qualityList.appendChild(item);
  }

  // Descriptor methods and extrapolation warnings; intentionally no new predictions.
  if (typeof propertyEvidenceRows === 'function') {
    const items = propertyEvidenceRows({ ...d, logS: v && v.logS },
      typeof PROPERTY_VALIDATION !== 'undefined' ? PROPERTY_VALIDATION.datasets : null);
    const host = document.getElementById('evidence-descriptors');
    if (host) {
      host.innerHTML = '<table class="table"><thead><tr><th>Property</th><th>Value</th><th>Method</th><th>Evidence</th><th>Validation</th></tr></thead><tbody>'
        + items.map(item => '<tr><td>' + escapeHtml(item.label) + '</td><td>'
          + (item.value === null ? 'Unavailable' : escapeHtml(String(item.value) + (item.unit ? ' ' + item.unit : '')))
          + '</td><td>' + escapeHtml(item.method) + '</td><td>' + escapeHtml(item.tier)
          + '</td><td>' + escapeHtml(item.validation || 'No measured-error benchmark supplied')
          + (item.validationUrl ? ' <a href="' + escapeHtml(item.validationUrl) + '" target="_blank" rel="noopener noreferrer">Source dataset ↗</a>' : '')
          + '</td></tr>').join('')
        + '</tbody></table>';
    }
    const warnings = propertyEvidenceWarnings({ ...d, logS: v && v.logS });
    const warningHost = document.getElementById('evidence-warnings');
    if (warningHost) warningHost.textContent = warnings.length
      ? 'Applicability cautions: ' + warnings.join(' ')
      : 'No simple applicability flags triggered. This does not establish model accuracy or chemical safety.';
  }

  rows(document.getElementById('identity'), [
    ['name', 'Name', '<span id="name-edit" contenteditable="true" spellcheck="false"'
      + ' title="Click to rename. The name is used for the tab, the export and the file name.">'
      + escapeHtml(record.name) + '</span>'],
    ['smiles', 'SMILES', escapeHtml(record.smiles)],
    ['formula', 'Formula', d.formula],
    ['mw', 'Molecular weight', d.mw.toFixed(2) + ' g/mol'],
    ['exactMass', 'Monoisotopic mass', d.exactMass.toFixed(4)],
    ['heavyAtoms', 'Heavy atoms', d.heavyAtoms],
    ['carbons', 'Carbons', d.carbons],
    ['heteroatoms', 'Heteroatoms', d.heteroatoms],
    ['charge', 'Formal charge', d.charge > 0 ? '+' + d.charge : d.charge]
  ]);

  const nameEdit = document.getElementById('name-edit');
  if (nameEdit) {
    const commit = () => {
      const next = nameEdit.textContent.trim();
      if (!next || next === record.name) {
        nameEdit.textContent = record.name;
        return;
      }
      record.name = next;
      renderTabs();
      renderBatch();
      document.dispatchEvent(new Event('molecule-profiler:updated'));
    };
    nameEdit.addEventListener('blur', commit);
    nameEdit.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        nameEdit.blur();
      } else if (event.key === 'Escape') {
        nameEdit.textContent = record.name;
        nameEdit.blur();
      }
    });
  }

  rows(document.getElementById('physchem'), [
    ['rings', 'Rings', d.rings],
    ['aromaticRings', 'Aromatic rings', d.aromaticRings],
    ['aromaticAtoms', 'Aromatic atoms', d.aromaticAtoms],
    ['rotatableBonds', 'Rotatable bonds', d.rotatableBonds],
    ['hbd', 'NH+OH count (Lipinski)', d.hbd],
    ['hba', 'N+O count (Lipinski)', d.hba],
    ['hbdStrict', 'H-bond donors', d.hbdStrict],
    ['hbaStrict', 'H-bond acceptors', d.hbaStrict],
    ['tpsa', 'TPSA', d.tpsa.toFixed(2) + ' Å²'],
    ['fractionCsp3', 'Fraction Csp³', d.fractionCsp3.toFixed(2)]
  ]);

  rows(document.getElementById('skeleton'), [
    ['aliphaticRings', 'Aliphatic rings', d.aliphaticRings],
    ['saturatedRings', 'Saturated rings', d.saturatedRings],
    ['heterocycles', 'Heterocycles', d.heterocycles],
    ['largestRing', 'Largest ring', d.largestRing || '—'],
    ['halogens', 'Halogens', d.halogens],
    ['amideBonds', 'Amide bonds', d.amideBonds],
    ['spiroAtoms', 'Spiro atoms', d.spiroAtoms],
    ['bridgeheadAtoms', 'Bridgehead atoms', d.bridgeheadAtoms]
  ]);

  renderStereo(record);
  renderWedgeNote();
  renderPropertyValidation(record);
  renderPropertyDomain(record);

  rows(document.getElementById('topology'), [
    ['chi0', 'Chi0', d.chi.chi0.toFixed(3)],
    ['chi1', 'Chi1', d.chi.chi1.toFixed(3)],
    ['chi0v', 'Chi0v', d.chi.chi0v.toFixed(3)],
    ['chi1v', 'Chi1v', d.chi.chi1v.toFixed(3)],
    ['hallKierAlpha', 'Hall-Kier alpha', d.shape.hallKierAlpha.toFixed(2)],
    ['kappa1', 'Kappa1', d.shape.kappa1.toFixed(3)],
    ['kappa2', 'Kappa2', d.shape.kappa2.toFixed(3)],
    ['kappa3', 'Kappa3', d.shape.kappa3.toFixed(3)]
  ]);

  rows(document.getElementById('lipo'), [
    ['logp', 'WLOGP', d.logp.toFixed(2)],
    ['mr', 'Molar refractivity', d.mr.toFixed(2)],
    ['logS', 'Log S (ESOL)', v.logS.toFixed(2)],
    ['solubility', 'Solubility class', v.solubility],
    ['crippenTypes', 'Distinct atom types', new Set(d.crippenTypes.map((entry) => entry.type)).size]
  ]);

  const filters = document.getElementById('filters');
  filters.innerHTML = v.filters.map((filter) => (
    '<div class="filter ' + (filter.pass ? 'pass' : 'fail') + '">'
      + '<div class="name">' + filter.name + infoButton(filter.name) + '</div>'
      + '<div class="verdict">' + (filter.pass ? 'PASS' : 'FAIL') + '</div>'
      + '<div class="why">' + (filter.fails.length ? escapeHtml(filter.fails.join('; ')) : 'no violation') + '</div>'
      + '</div>'
  )).join('');
  document.getElementById('filter-summary').textContent = v.passed + ' of ' + v.total + ' filters passed';

  rows(document.getElementById('druglike-extra'), [
    ['abs', 'Bioavailability score', v.bioavailability.score.toFixed(2) + ' — ' + v.bioavailability.reason],
    ['lead', 'Lead-likeness', v.lead.pass ? 'pass' : escapeHtml(v.lead.fails.join('; '))],
    ['hia', 'Passive absorption', v.egg.hia ? 'likely' : 'unlikely'],
    ['bbb', 'Brain penetration', v.egg.bbb ? 'likely' : 'unlikely'],
    ['alertTotal', 'Structural alerts', countAlerts(record.mol) + ' of ' + ALERTS.length + ' patterns'],
    ['toxTotal', 'Toxicity flags', toxFor(record).hits.length + ' of ' + toxFor(record).scored + ' rules']
  ]);

  drawRadar(v.radar);
  drawEgg(d);
  renderAtoms(record);
  renderSimilar(record);
  renderTargets(record);
  renderStructure(record);
  renderAlerts(record);
  renderTox(record);
  renderDependence(record);
  renderMetabolism(record);

  synchronizeBatchSelection();
}

function drawRadar(axes) {
  const svg = document.getElementById('radar');
  const cx = 160;
  const cy = 148;
  const radius = 104;
  const step = (Math.PI * 2) / axes.length;
  const at = (index, fraction) => {
    const angle = -Math.PI / 2 + index * step;
    return [cx + Math.cos(angle) * radius * fraction, cy + Math.sin(angle) * radius * fraction];
  };
  const polygon = (points) => points.map((point) => point.join(',')).join(' ');

  let out = '';
  for (let ring = 1; ring <= 4; ring += 1) {
    out += '<polygon class="axis-line" fill="none" points="'
      + polygon(axes.map((_, index) => at(index, ring / 4))) + '"/>';
  }
  out += '<polygon class="band" points="'
    + polygon(axes.map((axis, index) => at(index, axis.highFraction))) + '"/>';
  out += '<polygon class="band" fill="var(--bg-raise)" points="'
    + polygon(axes.map((axis, index) => at(index, axis.lowFraction))) + '"/>';
  axes.forEach((axis, index) => {
    const edge = at(index, 1);
    out += '<line class="axis-line" x1="' + cx + '" y1="' + cy + '" x2="' + edge[0] + '" y2="' + edge[1] + '"/>';
  });
  out += '<polygon class="shape" points="'
    + polygon(axes.map((axis, index) => at(index, axis.fraction))) + '"/>';
  axes.forEach((axis, index) => {
    const label = at(index, 1.21);
    const anchor = Math.abs(label[0] - cx) < 6 ? 'middle' : (label[0] > cx ? 'start' : 'end');
    out += '<text class="axis-label" x="' + label[0] + '" y="' + (label[1] + 4)
      + '" text-anchor="' + anchor + '">' + axis.label + '</text>';
    const value = at(index, 1.21);
    out += '<text class="tick-label" x="' + value[0] + '" y="' + (value[1] + 16)
      + '" text-anchor="' + anchor + '">' + formatAxis(axis) + '</text>';
  });
  svg.innerHTML = out;

  const keys = document.getElementById('radar-keys');
  keys.innerHTML = axes.map((axis) => (
    '<span class="key">' + axis.label + infoButton(axis.label) + '</span>'
  )).join('');
}

function formatAxis(axis) {
  if (axis.key === 'size') return axis.value.toFixed(0);
  if (axis.key === 'flex') return String(axis.value);
  return axis.value.toFixed(2);
}

function drawEgg(d) {
  const svg = document.getElementById('egg');
  const left = 46;
  const right = 320;
  const top = 18;
  const bottom = 258;
  const xMin = 0;
  const xMax = 200;
  const yMin = -4;
  const yMax = 8;
  const px = (tpsa) => left + (Math.max(xMin, Math.min(xMax, tpsa)) - xMin) / (xMax - xMin) * (right - left);
  const py = (logp) => bottom - (Math.max(yMin, Math.min(yMax, logp)) - yMin) / (yMax - yMin) * (bottom - top);

  let out = '';
  for (let tick = xMin; tick <= xMax; tick += 50) {
    out += '<line class="axis-line" x1="' + px(tick) + '" y1="' + top + '" x2="' + px(tick) + '" y2="' + bottom + '" opacity="0.5"/>';
    out += '<text class="tick-label" x="' + px(tick) + '" y="' + (bottom + 14) + '" text-anchor="middle">' + tick + '</text>';
  }
  for (let tick = yMin; tick <= yMax; tick += 2) {
    out += '<line class="axis-line" x1="' + left + '" y1="' + py(tick) + '" x2="' + right + '" y2="' + py(tick) + '" opacity="0.5"/>';
    out += '<text class="tick-label" x="' + (left - 8) + '" y="' + (py(tick) + 3.5) + '" text-anchor="end">' + tick + '</text>';
  }
  const ellipse = (shape, cls) => '<ellipse class="' + cls + '" cx="' + px(shape.x) + '" cy="' + py(shape.y)
    + '" rx="' + (px(shape.rx) - px(0)) + '" ry="' + (py(0) - py(shape.ry)) + '"/>';
  out += ellipse(EGG_WHITE, 'egg-white');
  out += ellipse(EGG_YOLK, 'egg-yolk');
  out += '<circle class="point" cx="' + px(d.tpsa) + '" cy="' + py(d.logp) + '" r="5"/>';
  out += '<text class="axis-label" x="' + ((left + right) / 2) + '" y="' + (bottom + 32) + '" text-anchor="middle">TPSA (Å²)</text>';
  out += '<text class="axis-label" x="14" y="' + ((top + bottom) / 2) + '" text-anchor="middle" transform="rotate(-90 14 '
    + ((top + bottom) / 2) + ')">WLOGP</text>';
  svg.innerHTML = out;
}

function stereoFor(record) {
  if (!record.stereo) record.stereo = stereoAnalyse(record.mol);
  return record.stereo;
}

function renderPropertyValidation(record) {
  const slot = document.getElementById('property-validation');
  if (!slot || typeof PROPERTY_VALIDATION === 'undefined') return;
  const sets = PROPERTY_VALIDATION.datasets;
  const parts = [];
  if (sets.logS) {
    parts.push('Log S against ' + sets.logS.n + ' measured aqueous solubilities (Delaney set): MAE '
      + sets.logS.mae + ', RMSE ' + sets.logS.rmse + ', R\u00b2 ' + sets.logS.r2 + ', '
      + sets.logS.within1Pct + '% within one log unit.');
  }
  if (sets.logSBlind) {
    parts.push('On the independent DLS-100 set (' + sets.logSBlind.n + ' compounds Delaney did not fit): MAE '
      + sets.logSBlind.mae + ', R\u00b2 ' + sets.logSBlind.r2 + '.');
  }
  if (sets.logPNeutral) {
    parts.push('WLOGP against ' + sets.logPNeutral.n
      + ' measured log D values at pH 7.4 for compounds with no ionisable group: MAE '
      + sets.logPNeutral.mae + ', mean signed error ' + sets.logPNeutral.bias
      + '. Over the whole lipophilicity set, including acids and bases whose log D is below their log P by the degree of ionisation, MAE is '
      + sets.logP.mae + ' with a ' + sets.logP.bias + ' bias, which bounds the error rather than measuring it.');
  }
  if (typeof CRIPPEN_CONFORMANCE !== 'undefined') {
    parts.push('The atom-contribution step itself agrees with RDKit on '
      + CRIPPEN_CONFORMANCE.logPWithin0_05 + '% of ' + CRIPPEN_CONFORMANCE.compounds
      + ' compounds to within 0.05 log units; the '
      + CRIPPEN_CONFORMANCE.disagreeOver0_05 + ' that differ are listed in data/crippencases.js.');
  }
  slot.textContent = 'Measured: ' + parts.join(' ');
}

const DOMAIN_LABELS = {
  mw: 'molecular weight', logp: 'log P', tpsa: 'TPSA',
  rotatableBonds: 'rotatable bonds', aromaticProportion: 'aromatic atom fraction',
  heavyAtoms: 'heavy atoms'
};

function renderPropertyDomain(record) {
  const slot = document.getElementById('evidence-warnings');
  if (!slot || typeof PROPERTY_VALIDATION === 'undefined' || !PROPERTY_VALIDATION.datasets.logS) return;
  const domain = PROPERTY_VALIDATION.datasets.logS.domain;
  const outside = [];
  Object.keys(domain).forEach((key) => {
    const value = record.d[key];
    const range = domain[key];
    if (!Number.isFinite(value) || !Array.isArray(range)) return;
    if (value < range[0] || value > range[1]) {
      outside.push((DOMAIN_LABELS[key] || key) + ' ' + value.toFixed(2)
        + ' (validation set spans ' + range[0] + ' to ' + range[1] + ')');
    }
  });
  if (outside.length) slot.textContent += ' Outside the solubility validation range: '
    + outside.join('; ') + '. Aggregate validation error is not a compound-specific bound.';
}

function renderWedgeNote() {
  const slot = document.getElementById('wedge-note');
  if (!slot || typeof WEDGE_CONFORMANCE === 'undefined') return;
  const w = WEDGE_CONFORMANCE;
  slot.textContent = w.agree + ' of ' + w.drawn + ' cases (' + w.agreePct + '%), measured by '
    + 'tools/stereo-depiction.js over ' + w.compounds + ' ' + w.source;
}

function renderStereo(record) {
  const s = stereoFor(record);
  const withheld = s.centers.filter((item) => item.specified && !item.label).length;
  rows(document.getElementById('stereo'), [
    ['stereoCenters', 'Stereocentres', s.centerCount + (s.centerCount
      ? ' (' + s.centerSpecified + ' specified)' : '')],
    ['stereoLabels', 'CIP labels', s.labels.length ? s.labels.join(', ') : '\u2014'],
    ['stereoWithheld', 'Labels withheld', withheld],
    ['stereoBonds', 'Stereogenic double bonds', s.bondCount + (s.bondCount
      ? ' (' + s.bondSpecified + ' specified)' : '')],
    ['stereoBondLabels', 'E/Z labels', s.bondLabels.length ? s.bondLabels.join(', ') : '\u2014'],
    ['stereoUnspecified', 'Unspecified', s.centerUnspecified + s.bondUnspecified]
  ]);

  const note = document.getElementById('stereo-note');
  if (!note) return;
  if (typeof STEREO_CONFORMANCE === 'undefined') { note.textContent = ''; return; }
  const c = STEREO_CONFORMANCE;
  note.textContent = 'Perception and CIP assignment are computed here from the SMILES, not read from a file. '
    + 'Measured against RDKit\u2019s rdCIPLabeler over ' + c.cases + ' enumerated stereoisomers of the reference '
    + 'library, ' + c.labelMatch + ' of ' + c.labels + ' R/S labels agreed (' + c.labelPct + '%), '
    + c.labelMissing + ' were withheld and ' + c.labelWrong + ' disagreed, and '
    + c.bondLabelMatch + ' of ' + c.bondLabels + ' E/Z labels agreed with '
    + c.bondLabelWrong + ' disagreements. The perceived centre set matched exactly on '
    + c.centerSetPct + '% of cases. Every label printed above is one that agreed; the withheld cases are '
    + 'reported as withheld instead of being filled in.';
}

function renderAtoms(record) {
  const table = document.getElementById('atoms');
  const columns = [
    ['atomIndex', '#'], ['atomElement', 'Element'], ['atomH', 'H'],
    ['atomType', 'Type'], ['atomLogp', 'Δ log P'], ['atomMr', 'Δ MR']
  ];
  table.querySelector('thead').innerHTML = '<tr>' + columns.map(([key, label]) => (
    '<th>' + label + infoButton(key) + '</th>'
  )).join('') + '</tr>';
  table.querySelector('tbody').innerHTML = record.d.crippenTypes.map((entry) => {
    const atom = record.mol.atoms[entry.atom];
    const symbol = atom.aromatic ? atom.element.toLowerCase() : atom.element;
    return '<tr><td>' + (entry.atom + 1) + '</td><td>' + symbol + '</td><td>' + atom.totalH
      + '</td><td>' + entry.type + '</td><td>' + entry.logp.toFixed(4)
      + '</td><td>' + entry.mr.toFixed(3) + '</td></tr>';
  }).join('');
}

const SIM_COLUMNS = [
  ['simRank', '#'],
  ['simName', 'Compound'],
  ['simClass', 'Class'],
  ['formula', 'Formula'],
  ['simScore', 'Score'],
  ['simShared', 'Shared']
];

function renderSimilar(record) {
  const methodKey = document.getElementById('sim-method').value;
  const metricKey = document.getElementById('sim-metric').value;
  const limit = Number(document.getElementById('sim-count').value);
  const method = FP_METHODS.find((entry) => entry.key === methodKey) || FP_METHODS[0];
  const score = metricKey === 'dice' ? dice : tanimoto;

  const query = fingerprint(record.mol, method.key);
  const library = libraryFingerprints(method.key);
  const includeProperty = document.getElementById('sim-include-property-only').checked;
  const isPropertyReference = (entry) => entry.propertyOnly === true;
  const rankedPool = includeProperty ? library : library.filter(item => !isPropertyReference(item.entry));
  const hits = rankedPool.map((item) => ({
    entry: item.entry,
    bits: item.fp.bits.size,
    shared: sharedCount(query, item.fp),
    score: score(query, item.fp)
  })).sort((a, b) => b.score - a.score);
  const pagination = SimPagination.paginateRanked(hits, limit, simPage, 50);
  simPage = pagination.page;
  const shown = pagination.rows;
  const paginationNav = document.getElementById('sim-pagination');
  paginationNav.hidden = pagination.pages <= 1;
  document.getElementById('sim-page').textContent =
    'Showing ' + pagination.from + '–' + pagination.to + ' of ' + pagination.total
    + ' ranked results · page ' + pagination.page + ' of ' + pagination.pages;
  document.getElementById('sim-prev').disabled = pagination.page <= 1;
  document.getElementById('sim-next').disabled = pagination.page >= pagination.pages;

  document.getElementById('sim-summary').innerHTML = rankedPool.length + ' reference structures ranked, '
    + query.bits.size + ' query bits' + infoButton('simBits');
  document.getElementById('sim-scope-count').textContent =
    rankedPool.length + ' of ' + library.length + ' parseable structures ranked; '
    + (library.length - rankedPool.length) + ' property-reference/illustrative entries excluded'
    + (includeProperty ? ' (included by request)' : ' by default') + '. Collection labels are not verified provenance.';
  document.getElementById('sim-blurb').textContent = method.blurb;

  const table = document.getElementById('similar');
  table.querySelector('thead').innerHTML = '<tr>' + SIM_COLUMNS.map(([key, label]) => (
    '<th>' + label + infoButton(key === 'formula' ? 'formula' : key) + '</th>'
  )).join('') + '</tr>';
  table.querySelector('tbody').innerHTML = shown.map((hit, index) => (
    '<tr data-smiles="' + escapeHtml(hit.entry.smiles) + '" data-name="' + escapeHtml(hit.entry.name) + '">'
      + '<td>' + (pagination.start + index + 1) + '</td>'
      + '<td>' + escapeHtml(hit.entry.name) + '</td>'
      + '<td>' + escapeHtml(hit.entry.cls) + '</td>'
      + '<td>' + escapeHtml(hit.entry.formula) + '</td>'
      + '<td><span class="score"><span class="score-track"><span class="score-fill" style="width:'
        + (hit.score * 100).toFixed(1) + '%"></span></span>' + hit.score.toFixed(3) + '</span></td>'
      + '<td>' + hit.shared + ' / ' + hit.bits + '</td>'
      + '</tr>'
  )).join('');
}

const TGT_COLUMNS = [
  ['tgtRank', '#'],
  ['tgtName', 'Target'],
  ['tgtGene', 'Gene'],
  ['tgtFamily', 'Family'],
  ['tgtOrganism', 'Organism'],
  ['tgtScore', 'Nearest similarity'],
  ['tgtMean', 'Mean top-3'],
  ['tgtNearest', 'Nearest ligand'],
  ['tgtLigands', 'Actives'],
  ['tgtRecovered', 'Recovered'],
  ['tgtNote', 'Mechanism']
];

const TGT_TIERS = [
  [0.5, 'Confident neighbours', 'The query shares most of its fingerprint with a compound already recorded as active at this target, so the row is worth treating as a real hypothesis to check against the literature.'],
  [0.3, 'Worth a look', 'Enough shared substructure to be suggestive and nothing more. These are leads to verify, not binding.'],
  [0, 'Weak tail \u2014 not a binding claim', 'Below about 0.30 a nearest-neighbour similarity says nothing about whether the query binds: these are simply the next-closest ligand sets in the catalogue, and a list like this comes back for almost any query. Shown for completeness, and greyed because the numbers should not be read as scores.']
];

function tgtTier(value) {
  return TGT_TIERS.findIndex(([floor]) => value >= floor);
}

function benchmarkRow(target) {
  if (typeof RETRIEVAL_BENCHMARK === 'undefined') return null;
  return RETRIEVAL_BENCHMARK.perTarget[target.gene + '::' + target.name] || null;
}

function recoveredCell(target) {
  const row = benchmarkRow(target);
  if (!row) return '<span class="quiet">\u2014</span>';
  return (row.r1 * 100).toFixed(0) + '% <span class="quiet">(' + row.n + ')</span>';
}

function casesLine() {
  if (typeof METABOLISM_CASES === 'undefined') return '';
  const c = METABOLISM_CASES;
  const misses = c.rows.filter((row) => row.found && row.band !== 'major')
    .map((row) => row.drug + ' to ' + row.metabolite);
  return 'Known-answer tests: of ' + c.cases + ' documented metabolites across ' + c.drugs + ' drugs, '
    + c.enumerated + ' are enumerated by this rule set within ' + c.generations + ' generations, '
    + c.major + ' land in the major band and ' + c.top5 + ' fall inside the top five by weight.'
    + (misses.length ? ' The ' + (misses.length === 1 ? 'one that lands' : misses.length + ' that land')
      + ' in the minor band instead: ' + misses.join(' and ') + '.' : '')
    + infoButton('metCases');
}

function benchmarkLine() {
  if (typeof RETRIEVAL_BENCHMARK === 'undefined') return '';
  const b = RETRIEVAL_BENCHMARK;
  const share = (value) => (value * 100).toFixed(0) + '%';
  return 'Measured by leave-one-out over the ' + b.trials + ' ligand slots that can be tested: the true target came '
    + 'first in ' + share(b.overall.r1) + ' of trials, in the top five in ' + share(b.overall.r5)
    + ', in the top ten in ' + share(b.overall.r10) + ', with a median true rank of ' + b.overall.median
    + ' out of ' + b.targets + '. Ranking targets by ligand-set size alone gets ' + share(b.popularity.r1)
    + ' and ' + share(b.popularity.r5) + '; ranking at random gets ' + share(b.random.r1) + ' and '
    + share(b.random.r5) + '. ' + b.unmeasurable + ' of the ' + b.targets
    + ' targets have fewer than two known ligands and cannot be tested at all.'
    + infoButton('tgtBenchmark');
}

function renderTargets(record) {
  const methodKey = document.getElementById('sim-method').value;
  const metricKey = document.getElementById('sim-metric').value;
  const limit = Number(document.getElementById('tgt-count').value);
  const floor = Number(document.getElementById('tgt-min').value);
  const organism = document.getElementById('tgt-organism').value;
  const method = FP_METHODS.find((entry) => entry.key === methodKey) || FP_METHODS[0];
  const score = metricKey === 'dice' ? dice : tanimoto;

  const query = fingerprint(record.mol, method.key);
  const byName = new Map();
  libraryFingerprints(method.key).forEach((item) => byName.set(item.entry.name, item));

  const ranked = [];
  TARGETS.forEach((target) => {
    if (organism !== 'all' && target.organism !== organism) return;
    const scored = [];
    target.ligands.forEach((name) => {
      const item = byName.get(name);
      if (!item) return;
      scored.push({ value: score(query, item.fp), entry: item.entry });
    });
    if (!scored.length) return;
    scored.sort((a, b) => b.value - a.value);
    const top = scored.slice(0, 3);
    const mean = top.reduce((sum, item) => sum + item.value, 0) / top.length;
    ranked.push({
      target: target,
      score: scored[0].value,
      mean: mean,
      nearest: scored[0].entry,
      count: scored.length
    });
  });
  ranked.sort((a, b) => b.score - a.score || b.mean - a.mean);

  const kept = ranked.filter((row) => row.score >= floor);
  const shown = limit > 0 ? kept.slice(0, limit) : kept;

  const pool = organism === 'all' ? TARGETS.length : ranked.length;
  const strong = kept.filter((row) => row.score >= 0.3).length;
  document.getElementById('tgt-summary').innerHTML = pool + ' targets'
    + (organism === 'all' ? '' : ' in ' + organism.toLowerCase() + ' scope')
    + ', ' + kept.length + ' above the score cut, '
    + (strong ? strong + ' of them above 0.30' : 'none of them above 0.30');
  document.getElementById('tgt-blurb').textContent = 'Scored with ' + method.label + ' and '
    + (metricKey === 'dice' ? 'Dice' : 'Tanimoto') + ', following the similarity panel above.';
  document.getElementById('tgt-bench').innerHTML = benchmarkLine();

  const table = document.getElementById('targets');
  table.querySelector('thead').innerHTML = '<tr>' + TGT_COLUMNS.map(([key, label]) => (
    '<th>' + label + infoButton(key) + '</th>'
  )).join('') + '</tr>';
  let tier = -1;
  table.querySelector('tbody').innerHTML = shown.length ? shown.map((row, index) => {
    let head = '';
    const band = tgtTier(row.score);
    if (band !== tier) {
      tier = band;
      head = '<tr class="tier-break" data-tier="' + band + '"><td colspan="11">'
        + '<strong>' + escapeHtml(TGT_TIERS[band][1]) + '</strong>'
        + escapeHtml(TGT_TIERS[band][2]) + '</td></tr>';
    }
    return head
    + '<tr data-smiles="' + escapeHtml(row.nearest.smiles) + '" data-name="' + escapeHtml(row.nearest.name) + '"'
      + (band === 2 ? ' class="quiet"' : '') + '>'
      + '<td>' + (index + 1) + '</td>'
      + '<td>' + escapeHtml(row.target.name) + '</td>'
      + '<td>' + escapeHtml(row.target.gene) + '</td>'
      + '<td>' + escapeHtml(row.target.family) + '</td>'
      + '<td>' + escapeHtml(row.target.organism) + '</td>'
      + '<td><span class="score"><span class="score-track"><span class="score-fill" style="width:'
        + (row.score * 100).toFixed(1) + '%"></span></span>' + row.score.toFixed(3) + '</span></td>'
      + '<td>' + row.mean.toFixed(3) + '</td>'
      + '<td>' + escapeHtml(row.nearest.name) + '</td>'
      + '<td>' + row.count + '</td>'
      + '<td>' + recoveredCell(row.target) + '</td>'
      + '<td class="note">' + escapeHtml(row.target.note) + '</td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="11">No target has a known ligand this similar to the query.</td></tr>';
}

function setupTargets() {
  ['tgt-count', 'tgt-min', 'tgt-organism'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
      if (records[current]) renderTargets(records[current]);
    });
  });
  [['tgt-count', 'tgtCount'], ['tgt-min', 'tgtMin'], ['tgt-organism', 'tgtOrganismFilter']].forEach(([id, key]) => {
    document.getElementById(id).insertAdjacentHTML('beforebegin', infoButton(key));
  });
  document.getElementById('targets').addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-smiles]');
    if (!row) return;
    document.getElementById('smiles-input').value = row.dataset.name + ', ' + row.dataset.smiles;
    analyse();
    document.getElementById('identity').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function countAlerts(mol) {
  let total = 0;
  ALERTS.forEach((alert) => {
    if (hasSmartsMatch(alert.smarts, mol)) total += 1;
  });
  return total;
}

const ALERT_COLUMNS = [
  ['alertName', 'Alert'],
  ['alertSource', 'Catalogue'],
  ['alertCount', 'Matches'],
  ['alertAtoms', 'Atoms'],
  ['alertSmarts', 'Pattern'],
  ['alertNote', 'Concern']
];

function depictHighlightSet(record, mode) {
  const atoms = [];
  const push = (list) => list.forEach((index) => {
    if (typeof index === 'number' && index >= 0 && index < record.mol.atoms.length
      && atoms.indexOf(index) === -1) atoms.push(index);
  });
  if (mode === 'alerts') {
    ALERTS.forEach((alert) => {
      smartsMatches(compileSmarts(alert.smarts), record.mol, {}).forEach((match) => push(match));
    });
  } else if (mode === 'tox') {
    toxFor(record).hits.forEach((row) => push(row.atoms || []));
  } else if (mode === 'sites') {
    let tree = null;
    try { tree = metabolismFor(record); } catch (error) { tree = null; }
    if (tree) {
      tree.nodes.forEach((node) => {
        if (node.depth !== 1) return;
        push(node.touched || []);
        if (typeof node.siteAtom === 'number') push([node.siteAtom]);
      });
    }
  }
  atoms.sort((a, b) => a - b);
  return atoms;
}

const DEPICT_HIGHLIGHT_NOTE = {
  none: 'no atoms marked',
  sites: 'atoms a first-generation rule acts on',
  alerts: 'atoms matched by any catalogued alert',
  tox: 'atoms matched by a firing toxicity rule'
};

function renderStructure(record) {
  const box = document.getElementById('structure');
  if (typeof depictSvg !== 'function') {
    box.innerHTML = '<p class="hint">the depiction engine did not load \u2014 reload the page, bypassing the cache</p>';
    return;
  }
  const mode = document.getElementById('depict-highlight').value;
  let atoms = [];
  try { atoms = depictHighlightSet(record, mode); } catch (error) { atoms = []; }
  try {
    box.innerHTML = depictSvg(record.mol, {
      highlight: atoms,
      scale: 30,
      title: record.name + ' \u2014 generated 2D depiction'
    });
  } catch (error) {
    box.innerHTML = '<p class="hint">could not lay this structure out: ' + escapeHtml(error.message) + '</p>';
    document.getElementById('depict-summary').textContent = 'layout failed';
    return;
  }
  document.getElementById('depict-summary').textContent = mode === 'none'
    ? record.mol.atoms.length + ' heavy atoms'
    : atoms.length + ' of ' + record.mol.atoms.length + ' atoms marked \u2014 '
      + DEPICT_HIGHLIGHT_NOTE[mode];
}

function setupStructure() {
  const select = document.getElementById('depict-highlight');
  select.addEventListener('change', () => {
    if (records[current]) renderStructure(records[current]);
  });
  select.insertAdjacentHTML('beforebegin', infoButton('depictHighlight'));
  ['met-depth', 'met-phase'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
      if (records[current] && select.value === 'sites') renderStructure(records[current]);
    });
  });
}

function citationFor(ref, cite) {
  if (cite) return cite;
  const set = rulesetFor(ref);
  if (!set) return '';
  return set.citation + (set.doi ? ' doi:' + set.doi : '');
}

function rulesetFor(ref) {
  if (typeof RULESETS === 'undefined' || !ref) return null;
  return RULESETS[ref] || null;
}

function sourceCell(source, ref) {
  const set = rulesetFor(ref);
  const label = escapeHtml(source);
  if (!set) return label;
  const tip = escapeHtml(set.citation + ' ' + set.coverage);
  if (!set.url) return '<abbr title="' + tip + '">' + label + '</abbr>';
  return '<a href="' + escapeHtml(set.url) + '" target="_blank" rel="noopener" title="' + tip + '">'
    + label + '</a>';
}

function citeSpan(cite) {
  return cite ? ' <span class="cite">' + escapeHtml(cite) + '</span>' : '';
}

function renderCitations(id, refs, notImplemented) {
  const host = document.getElementById(id);
  if (!host) return;
  const used = Object.keys(RULESETS).filter((ref) => refs.indexOf(ref) !== -1);
  if (!used.length) {
    host.innerHTML = '';
    return;
  }
  let html = '<p class="note"><strong>Sources for the rules above</strong></p><ul class="cites">'
    + used.map((ref) => {
      const set = RULESETS[ref];
      const link = set.url
        ? ' <a href="' + escapeHtml(set.url) + '" target="_blank" rel="noopener">'
          + escapeHtml(set.doi || 'link') + '</a>'
        : '';
      return '<li><strong>' + escapeHtml(set.label) + '</strong> &mdash; ' + escapeHtml(set.citation) + link
        + ' <em>' + escapeHtml(set.coverage) + '</em></li>';
    }).join('') + '</ul>';
  html += '<p class="note warn">' + escapeHtml(ALERT_ENCODING_NOTE) + '</p>';
  if (notImplemented && typeof RULESETS_NOT_IMPLEMENTED !== 'undefined') {
    html += '<p class="note"><strong>Published rule sets this tool does not implement</strong></p><ul class="cites">'
      + RULESETS_NOT_IMPLEMENTED.map((entry) => (
        '<li><strong>' + escapeHtml(entry.label) + '</strong> &mdash; ' + escapeHtml(entry.citation)
          + ' ' + escapeHtml(entry.reason) + '</li>'
      )).join('') + '</ul>';
  }
  host.innerHTML = html;
}

function renderAlerts(record) {
  const choice = document.getElementById('alert-source').value;
  const scanned = ALERTS.map((alert) => {
    const matches = smartsMatches(compileSmarts(alert.smarts), record.mol, {});
    const atoms = [];
    matches.forEach((match) => match.forEach((index) => {
      if (atoms.indexOf(index) === -1) atoms.push(index);
    }));
    atoms.sort((a, b) => a - b);
    return { alert: alert, count: matches.length, atoms: atoms };
  });

  const hits = scanned.filter((row) => row.count > 0);
  const pool = choice === 'all-patterns' ? scanned : hits;
  const shown = choice === 'all' || choice === 'all-patterns'
    ? pool
    : pool.filter((row) => row.alert.source === choice);
  shown.sort((a, b) => b.count - a.count || a.alert.name.localeCompare(b.alert.name));

  document.getElementById('alert-summary').innerHTML = hits.length
    ? hits.length + ' of ' + ALERTS.length + ' patterns match'
    : 'no catalogued alert matches';

  const table = document.getElementById('alerts');
  table.querySelector('thead').innerHTML = '<tr>' + ALERT_COLUMNS.map(([key, label]) => (
    '<th>' + label + infoButton(key) + '</th>'
  )).join('') + '</tr>';
  table.querySelector('tbody').innerHTML = shown.length ? shown.map((row) => (
    '<tr' + (row.count ? '' : ' class="quiet"') + '>'
      + '<td>' + escapeHtml(row.alert.name) + '</td>'
      + '<td>' + sourceCell(row.alert.source, row.alert.ref) + '</td>'
      + '<td>' + row.count + '</td>'
      + '<td class="atoms">' + (row.atoms.length ? row.atoms.map((index) => index + 1).join(', ') : '—') + '</td>'
      + '<td><code>' + escapeHtml(row.alert.smarts) + '</code></td>'
      + '<td class="note">' + escapeHtml(row.alert.note) + citeSpan(row.alert.cite) + '</td>'
      + '</tr>'
  )).join('') : '<tr><td colspan="6">Nothing matches in this catalogue.</td></tr>';

  renderCitations('alert-citations', scanned.map((row) => row.alert.ref), true);
}

function setupAlerts() {
  document.getElementById('alert-source').addEventListener('change', () => {
    if (records[current]) renderAlerts(records[current]);
  });
  document.getElementById('alert-source').insertAdjacentHTML('beforebegin', infoButton('alertFilter'));
}

function toxFor(record) {
  if (!record.tox) record.tox = toxScan(record);
  return record.tox;
}

const TOX_COLUMNS = [
  ['toxName', 'Rule'],
  ['toxEndpoint', 'Endpoint'],
  ['toxSource', 'Source'],
  ['toxCount', 'Matches'],
  ['toxAtoms', 'Atoms'],
  ['toxPattern', 'Rule body'],
  ['toxNote', 'Mechanism']
];

function renderTox(record) {
  const scan = toxFor(record);
  if (typeof toxicityCoverageReport === 'function') {
    const coverage = toxicityCoverageReport(scan);
    const el = document.getElementById('tox-coverage');
    if (el) el.textContent = 'Screen coverage: ' + coverage.matchedRules + ' matching patterns across '
      + coverage.endpointCount + ' endpoint categories. ' + coverage.limitations.join(' ');
  }

  const choice = document.getElementById('tox-endpoint').value;

  document.getElementById('tox-cards').innerHTML = scan.byEndpoint.map((group) => (
    '<div class="filter ' + (group.hits.length ? 'fail' : 'pass') + '">'
      + '<div class="name">' + group.endpoint + infoButton(group.endpoint) + '</div>'
      + '<div class="verdict">' + (group.hits.length ? group.hits.length + ' OF ' + group.total : 'CLEAR') + '</div>'
      + '<div class="why">' + escapeHtml([
        group.hits.length ? group.hits.map((row) => row.name.toLowerCase()).join('; ') : 'no rule fires'
      ].concat(group.context.map((row) => row.name.toLowerCase() + ': ' + (row.count ? 'likely' : 'unlikely'))).join(' / ')) + '</div>'
      + '</div>'
  )).join('');

  const pool = choice === 'all-patterns' ? scan.rows : scan.hits;
  const shown = choice === 'all' || choice === 'all-patterns'
    ? pool
    : pool.filter((row) => row.endpoint === choice);
  shown.sort((a, b) => b.count - a.count
    || TOX_ENDPOINTS.indexOf(a.endpoint) - TOX_ENDPOINTS.indexOf(b.endpoint)
    || a.name.localeCompare(b.name));

  document.getElementById('tox-summary').innerHTML = scan.hits.length
    ? scan.hits.length + ' of ' + scan.scored + ' rules fire across ' + TOX_ENDPOINTS.length + ' endpoints'
    : 'no toxicology rule fires';

  const table = document.getElementById('tox');
  table.querySelector('thead').innerHTML = '<tr>' + TOX_COLUMNS.map(([key, label]) => (
    '<th>' + label + infoButton(key) + '</th>'
  )).join('') + '</tr>';
  table.querySelector('tbody').innerHTML = shown.length ? shown.map((row) => (
    '<tr' + (row.count ? '' : ' class="quiet"') + '>'
      + '<td>' + escapeHtml(row.name) + '</td>'
      + '<td>' + escapeHtml(row.endpoint) + '</td>'
      + '<td>' + sourceCell(row.source, row.ref) + '</td>'
      + '<td>' + row.count + '</td>'
      + '<td class="atoms">' + (row.atoms.length ? row.atoms.map((index) => index + 1).join(', ') : '\u2014') + '</td>'
      + '<td><code>' + escapeHtml(row.pattern) + '</code></td>'
      + '<td class="note">' + escapeHtml(row.note) + citeSpan(row.cite) + '</td>'
      + '</tr>'
  )).join('') : '<tr><td colspan="7">No rule fires for this endpoint.</td></tr>';

  renderCitations('tox-citations', scan.rows.map((row) => row.ref), false);
}

const DEP_COLUMNS = [
  ['depRank', '#'],
  ['depName', 'Drug'],
  ['depClass', 'Class'],
  ['depLiability', 'Liability'],
  ['depSimilarity', 'Similarity'],
  ['depNote', 'Mechanism']
];

const DEP_TARGET_COLUMNS = [
  ['depTargetName', 'Target'],
  ['depTargetGene', 'Gene'],
  ['depTargetScore', 'Similarity'],
  ['depTargetLigand', 'Nearest ligand']
];

const DEP_GATE = 0.45;

const DEP_VERDICTS = [
  [0.85, 'worth asking about', 'The query is a close structural analogue of a drug with a documented dependence liability, so the rows below are worth checking against the real pharmacology of that drug. They remain fingerprint neighbours: nearness of shape is not a shared mechanism, and this panel never tests one.'],
  [0.65, 'worth asking about', 'The query shares a scaffold with a drug that carries a documented dependence liability. That is a reason to go and read the pharmacology, not a finding in itself.'],
  [0.45, 'structural analogy only, not pharmacology', 'The nearest labelled drug is a distant resemblance. Below a score of about 0.65 a nearest-neighbour number carries no pharmacological claim at all, so the rows below are simply the closest shapes in the set, printed in rank order. Nothing here says the query touches the reward circuit, and the numbers in the cards should not be read as a liability assessment.'],
  [0, 'structural analogy only, not pharmacology', 'Nothing in the labelled dependence set is a relative of this query, so this panel has no content and should be read as empty rather than as a low risk score. The ranked tables are withheld below the gate for exactly that reason.']
];

function renderDependence(record) {
  const methodKey = document.getElementById('sim-method').value;
  const metricKey = document.getElementById('sim-metric').value;
  const method = FP_METHODS.find((entry) => entry.key === methodKey) || FP_METHODS[0];
  const score = metricKey === 'dice' ? dice : tanimoto;
  const limit = Number(document.getElementById('dep-count').value);
  const profile = dependenceProfile(record, method.key, score);
  const reward = profile.rewards.length ? profile.rewards[0] : null;

  document.getElementById('dep-summary').textContent = 'Scored against ' + DEPENDENCE.length
    + ' labelled drugs with ' + method.label + ' and '
    + (metricKey === 'dice' ? 'Dice' : 'Tanimoto') + ', following the similarity panel above.';

  const verdict = DEP_VERDICTS.find(([floor]) => profile.top >= floor);
  const weak = profile.top < 0.65;
  const gated = profile.top < DEP_GATE;
  const notice = document.getElementById('dep-verdict');
  notice.dataset.weak = weak ? 'yes' : 'no';
  notice.innerHTML = '<strong>' + escapeHtml(verdict[1]) + '</strong> ' + escapeHtml(verdict[2]);

  const gateNote = document.getElementById('dep-gate-note');
  gateNote.hidden = !gated;
  gateNote.textContent = gated
    ? 'Nothing in the labelled dependence set is a structural relative of this query. The closest drug carrying a documented liability scores '
      + profile.top.toFixed(3) + ', below the ' + DEP_GATE.toFixed(2)
      + ' floor at which a nearest-neighbour score starts to carry any meaning at all. The ranked tables are therefore withheld rather than printed: a list of addictive drugs sorted by a number that means nothing reads as a finding, and there is no finding here. Nothing was measured about this molecule and dependence. The rows remain available below and in the CSV export for audit, where they are distances in fingerprint space and nothing else.'
    : '';

  const ranking = document.getElementById('dep-ranking');
  ranking.open = !gated;
  document.getElementById('dep-ranking-summary').textContent = gated
    ? 'Show the withheld ranking \u2014 fingerprint distances with no pharmacological meaning'
    : 'Ranked neighbours and reward-circuit targets';

  const cards = document.getElementById('dep-cards');
  cards.dataset.weak = weak ? 'yes' : 'no';
  cards.innerHTML = gated ? [
    '<div class="filter pass">'
      + '<div class="name">Closest labelled analogy' + infoButton('depBand') + '</div>'
      + '<div class="verdict">' + profile.top.toFixed(3) + '</div>'
      + '<div class="why">' + escapeHtml(profile.band)
        + ' \u2014 below the ' + DEP_GATE.toFixed(2) + ' gate, so no nearest drug, no reward-circuit score and no band verdict is reported</div>'
      + '</div>'
  ].join('') : [
    '<div class="filter ' + (profile.top >= 0.65 ? 'fail' : 'pass') + '">'
      + '<div class="name">Analogy band' + infoButton('depBand') + '</div>'
      + '<div class="verdict">' + profile.top.toFixed(3) + '</div>'
      + '<div class="why">' + escapeHtml(profile.band)
        + (weak ? ' \u2014 no pharmacological claim' : '') + '</div>'
      + '</div>',
    '<div class="filter ' + (profile.best && profile.top >= 0.65 ? 'fail' : 'pass') + '">'
      + '<div class="name">Nearest liability' + infoButton('depNearest') + '</div>'
      + '<div class="verdict">' + (profile.best ? profile.best.value.toFixed(3) : '\u2014') + '</div>'
      + '<div class="why">' + (profile.best
        ? escapeHtml(profile.best.drug.name + ' \u2014 ' + profile.best.drug.klass.toLowerCase()
          + ', ' + profile.best.drug.liability + ' liability')
        : 'nothing in the set')
        + (weak ? ' \u2014 shape only' : '') + '</div>'
      + '</div>',
    '<div class="filter ' + (reward && reward.value >= 0.4 ? 'fail' : 'pass') + '">'
      + '<div class="name">Reward-circuit proximity' + infoButton('depReward') + '</div>'
      + '<div class="verdict">' + (reward ? reward.value.toFixed(3) : '\u2014') + '</div>'
      + '<div class="why">' + (reward
        ? escapeHtml(reward.target.gene + ' via ' + reward.nearest.name)
          + (reward.value < 0.4 ? ' \u2014 below any meaningful level' : '')
        : 'no scored target') + '</div>'
      + '</div>'
  ].join('');

  const shown = limit > 0 ? profile.neighbours.slice(0, limit) : profile.neighbours;
  const table = document.getElementById('dependence');
  table.querySelector('thead').innerHTML = '<tr>' + DEP_COLUMNS.map(([key, label]) => (
    '<th>' + label + infoButton(key) + '</th>'
  )).join('') + '</tr>';
  table.querySelector('tbody').innerHTML = shown.map((row, index) => (
    '<tr data-smiles="' + escapeHtml(row.entry.smiles) + '" data-name="' + escapeHtml(row.entry.name) + '"'
      + (row.drug.liability === 'none' ? ' class="quiet"' : '') + '>'
      + '<td>' + (index + 1) + '</td>'
      + '<td>' + escapeHtml(row.drug.name) + '</td>'
      + '<td>' + escapeHtml(row.drug.klass) + '</td>'
      + '<td>' + escapeHtml(row.drug.liability) + '</td>'
      + '<td><span class="score"><span class="score-track"><span class="score-fill" style="width:'
        + (row.value * 100).toFixed(1) + '%"></span></span>' + row.value.toFixed(3) + '</span></td>'
      + '<td class="note">' + escapeHtml(row.drug.note) + '</td>'
      + '</tr>'
  )).join('');

  const targets = document.getElementById('dep-targets');
  targets.querySelector('thead').innerHTML = '<tr>' + DEP_TARGET_COLUMNS.map(([key, label]) => (
    '<th>' + label + infoButton(key) + '</th>'
  )).join('') + '</tr>';
  targets.querySelector('tbody').innerHTML = profile.rewards.length ? profile.rewards.map((row) => (
    '<tr data-smiles="' + escapeHtml(row.nearest.smiles) + '" data-name="' + escapeHtml(row.nearest.name) + '">'
      + '<td>' + escapeHtml(row.target.name) + '</td>'
      + '<td>' + escapeHtml(row.target.gene) + '</td>'
      + '<td><span class="score"><span class="score-track"><span class="score-fill" style="width:'
        + (row.value * 100).toFixed(1) + '%"></span></span>' + row.value.toFixed(3) + '</span></td>'
      + '<td>' + escapeHtml(row.nearest.name) + '</td>'
      + '</tr>'
  )).join('') : '<tr><td colspan="4">No dependence-related target has a scored ligand.</td></tr>';
}

const MET_COLUMNS = [
  ['metRank', '#'],
  ['metSmiles', 'Metabolite'],
  ['metStep', 'Step'],
  ['metEnzyme', 'Enzyme'],
  ['metRoute', 'Route'],
  ['metPhase', 'Phase'],
  ['metScore', 'Relative weight'],
  ['metSite', 'Site factor'],
  ['metProps', 'MW / log P / TPSA'],
  ['metTox', 'New toxicity flags'],
  ['metNote', 'Mechanism']
];

const MET_NOTE_COLUMNS = [
  ['metNoteName', 'Observation'],
  ['metNoteEnzyme', 'Enzyme'],
  ['metNoteAtoms', 'Atoms'],
  ['metNoteText', 'Why it matters']
];

function metaboliteLabel(node) {
  return node.id === 0 ? 'parent' : 'M' + node.id;
}

function metabolismFor(record) {
  const depth = Number(document.getElementById('met-depth').value);
  const phase = document.getElementById('met-phase').value;
  const key = depth + '/' + phase;
  if (!record.metabolism) record.metabolism = new Map();
  if (!record.metabolism.has(key)) {
    record.metabolism.set(key, metabolicTree(record, {
      depth: depth,
      phases: phase === 'all' ? ['I', 'II'] : [phase]
    }));
  }
  return record.metabolism.get(key);
}

function renderMetabolism(record) {
  const coverageSlot = document.getElementById('met-coverage');
  if (coverageSlot) coverageSlot.textContent = '';
  if (typeof metabolicTree !== 'function' || typeof METABOLISM === 'undefined') {
    document.getElementById('met-summary').textContent =
      'the metabolism engine did not load \u2014 reload the page, bypassing the cache';
    document.getElementById('met-cards').innerHTML = '';
    document.getElementById('metabolites').querySelector('tbody').innerHTML = '<tr><td colspan="' + MET_COLUMNS.length + '">Metabolism engine unavailable.</td></tr>';
    return;
  }
  let tree;
  try {
    tree = metabolismFor(record);
  } catch (error) {
    document.getElementById('met-summary').textContent = 'enumeration failed: ' + error.message;
    document.getElementById('met-cards').innerHTML = '';
    document.getElementById('metabolites').querySelector('tbody').innerHTML =
      '<tr><td colspan="' + MET_COLUMNS.length + '">No metabolite could be enumerated for this structure.</td></tr>';
    return;
  }
  if (typeof metabolismCoverageReport === 'function') {
    const coverage = metabolismCoverageReport(tree);
    if (coverageSlot) coverageSlot.textContent = 'Enumeration scope: ' + coverage.predictedProducts
      + ' proposed products; ' + (coverage.rulesAttempted === null ? 'unknown' : coverage.rulesAttempted)
      + ' reaction rules attempted. ' + coverage.limitations.join(' ');
  }
  const limit = Number(document.getElementById('met-count').value);
  const toxOnly = document.getElementById('met-toxonly').checked;
  const band = document.getElementById('met-band').value;
  const byId = new Map();
  tree.nodes.forEach((node) => byId.set(node.id, node));

  const openSites = smartsMatches(compileSmarts('[cH]'), record.mol, {}).length;
  const newFlags = new Map();
  tree.metabolites.forEach((node) => node.newTox.forEach((row) => {
    if (!newFlags.has(row.name)) newFlags.set(row.name, row);
  }));
  const leading = tree.routes.length ? tree.routes[0] : null;

  const bands = { major: 0, minor: 0, trace: 0 };
  tree.metabolites.forEach((node) => { bands[metaboliteBand(node.score)] += 1; });

  document.getElementById('met-summary').innerHTML = tree.metabolites.length
    ? tree.metabolites.length + ' metabolites within ' + tree.depth
      + (tree.depth === 1 ? ' generation' : ' generations') + ', from ' + tree.rulesTried
      + ' reaction rules: ' + tree.phaseI + ' phase I, ' + tree.phaseII + ' phase II'
      + ' \u2014 ' + bands.major + ' major, ' + bands.minor + ' minor, ' + bands.trace + ' trace'
      + (tree.truncated ? ' (enumeration capped)' : '')
    : 'no rule in the set finds a site on this structure';

  document.getElementById('met-cards').innerHTML = [
    '<div class="filter ' + (leading ? 'pass' : 'fail') + '">'
      + '<div class="name">Leading route' + infoButton('metPrimary') + '</div>'
      + '<div class="verdict">' + escapeHtml(leading ? leading.enzyme : '\u2014') + '</div>'
      + '<div class="why">' + escapeHtml(leading
        ? leading.count + (leading.count === 1 ? ' metabolite' : ' metabolites')
          + ', summed weight ' + leading.weight.toFixed(2)
        : 'no route found') + '</div>'
      + '</div>',
    '<div class="filter ' + (tree.metabolites.length ? 'pass' : 'fail') + '">'
      + '<div class="name">Metabolites' + infoButton('metSummary') + '</div>'
      + '<div class="verdict">' + tree.metabolites.length + '</div>'
      + '<div class="why">' + escapeHtml(tree.routes.map((row) => row.enzyme.toLowerCase() + ' ' + row.count).join(', ') || 'none') + '</div>'
      + '</div>',
    '<div class="filter ' + (openSites ? 'pass' : 'fail') + '">'
      + '<div class="name">Open aromatic positions' + infoButton('metOpen') + '</div>'
      + '<div class="verdict">' + openSites + '</div>'
      + '<div class="why">' + escapeHtml(openSites
        ? 'ring CH carbons available for hydroxylation'
        : 'no unsubstituted aromatic carbon') + '</div>'
      + '</div>',
    '<div class="filter ' + (newFlags.size ? 'fail' : 'pass') + '">'
      + '<div class="name">New toxicity flags' + infoButton('metNewTox') + '</div>'
      + '<div class="verdict">' + (newFlags.size ? newFlags.size : 'NONE') + '</div>'
      + '<div class="why">' + escapeHtml(newFlags.size
        ? [...newFlags.values()].map((row) => row.name.toLowerCase() + ' (' + row.endpoint.toLowerCase() + ')').join('; ')
        : 'no metabolite trips a rule the parent does not') + '</div>'
      + '</div>'
  ].join('');

  let shown = tree.metabolites;
  if (toxOnly) shown = shown.filter((node) => node.newTox.length);
  if (band !== 'all') shown = shown.filter((node) => metaboliteBand(node.score) === band);
  if (limit) shown = shown.slice(0, limit);

  const table = document.getElementById('metabolites');
  table.querySelector('thead').innerHTML = '<tr>' + MET_COLUMNS.map(([key, label]) => (
    '<th>' + label + infoButton(key) + '</th>'
  )).join('') + '</tr>';
  table.querySelector('tbody').innerHTML = shown.length ? shown.map((node, index) => {
    const parent = byId.get(node.parent);
    const released = node.released.length
      ? ' Releases ' + node.released.join(' and ') + '.'
      : '';
    const extra = node.steps.length > 1
      ? ' Also reached by ' + (node.steps.length - 1) + ' other path' + (node.steps.length > 2 ? 's' : '') + '.'
      : '';
    return '<tr data-smiles="' + escapeHtml(node.smiles) + '" data-name="' + escapeHtml(metaboliteLabel(node)) + '"'
      + (node.newTox.length ? ' class="flagged"' : '') + '>'
      + '<td>' + (index + 1) + '</td>'
      + '<td><strong>' + metaboliteLabel(node) + '</strong> <code>' + escapeHtml(node.smiles) + '</code></td>'
      + '<td>' + escapeHtml(node.rule) + '<br><span class="quiet">from ' + escapeHtml(parent ? metaboliteLabel(parent) : 'parent') + '</span></td>'
      + '<td>' + escapeHtml(node.enzyme) + '</td>'
      + '<td>' + escapeHtml(node.route) + '</td>'
      + '<td>' + escapeHtml(node.phase) + '</td>'
      + '<td>' + node.score.toFixed(3)
      + '<br><span class="band ' + metaboliteBand(node.score) + '">' + metaboliteBand(node.score) + '</span></td>'
      + '<td' + (node.siteReasons && node.siteReasons.length ? ' title="' + escapeHtml(node.siteReasons.join('; ')) + '"' : '') + '>'
      + (typeof node.siteFactor === 'number' ? '\u00d7' + node.siteFactor.toFixed(2) : '\u2014')
      + (node.siteReasons && node.siteReasons.length
        ? '<br><span class="quiet">' + escapeHtml(node.siteReasons[0].replace(/ \([0-9.]+\)$/, '')) + (node.siteReasons.length > 1 ? ', +' + (node.siteReasons.length - 1) : '') + '</span>'
        : '') + '</td>'
      + '<td>' + node.d.mw.toFixed(1) + ' / ' + node.d.logp.toFixed(2) + ' / ' + node.d.tpsa.toFixed(1) + '</td>'
      + '<td>' + (node.newTox.length
        ? node.newTox.map((row) => escapeHtml(row.name) + ' <span class="quiet">(' + escapeHtml(row.endpoint.toLowerCase()) + ')</span>').join('<br>')
        : '\u2014') + '</td>'
      + '<td class="note" title="' + escapeHtml(node.steps[0].note + released + extra) + '">'
      + escapeHtml(node.steps[0].note + released + extra) + '</td>'
      + '</tr>';
  }).join('') : '<tr><td colspan="' + MET_COLUMNS.length + '">No metabolite matches this filter.</td></tr>';

  const notes = document.getElementById('met-notes');
  notes.querySelector('thead').innerHTML = '<tr>' + MET_NOTE_COLUMNS.map(([key, label]) => (
    '<th>' + label + infoButton(key) + '</th>'
  )).join('') + '</tr>';
  notes.querySelector('tbody').innerHTML = tree.notes.length ? tree.notes.map((note) => (
    '<tr>'
      + '<td>' + escapeHtml(note.name) + '</td>'
      + '<td>' + escapeHtml(note.enzyme) + '</td>'
      + '<td class="atoms">' + note.atoms.map((index) => index + 1).join(', ') + '</td>'
      + '<td class="note" title="' + escapeHtml(note.note) + '">' + escapeHtml(note.note) + '</td>'
      + '</tr>'
  )).join('') : '<tr><td colspan="4">No structural observation applies to this molecule.</td></tr>';
}

function setupMetabolism() {
  document.getElementById('met-bench').innerHTML = casesLine();
  ['met-depth', 'met-phase', 'met-count', 'met-band', 'met-toxonly'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
      if (records[current]) renderMetabolism(records[current]);
    });
  });
  [['met-depth', 'metDepth'], ['met-phase', 'metPhaseFilter'], ['met-count', 'metCount'], ['met-band', 'metBandFilter']].forEach(([id, key]) => {
    document.getElementById(id).insertAdjacentHTML('beforebegin', infoButton(key));
  });
  document.getElementById('metabolites').addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-smiles]');
    if (!row) return;
    document.getElementById('smiles-input').value = row.dataset.name + ', ' + row.dataset.smiles;
    analyse();
    document.getElementById('identity').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function setupTox() {
  document.getElementById('tox-endpoint').addEventListener('change', () => {
    if (records[current]) renderTox(records[current]);
  });
  document.getElementById('tox-endpoint').insertAdjacentHTML('beforebegin', infoButton('toxFilter'));
  document.getElementById('dep-count').addEventListener('change', () => {
    if (records[current]) renderDependence(records[current]);
  });
  document.getElementById('dep-count').insertAdjacentHTML('beforebegin', infoButton('depCount'));
  [['dependence', 0], ['dep-targets', 0]].forEach(([id]) => {
    document.getElementById(id).addEventListener('click', (event) => {
      const row = event.target.closest('tr[data-smiles]');
      if (!row) return;
      document.getElementById('smiles-input').value = row.dataset.name + ', ' + row.dataset.smiles;
      analyse();
      document.getElementById('identity').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });
}

function setupSimilarity() {
  const select = document.getElementById('sim-method');
  select.innerHTML = FP_METHODS.map((method) => (
    '<option value="' + method.key + '">' + method.label + '</option>'
  )).join('');
  ['sim-method', 'sim-metric', 'sim-count', 'sim-include-property-only'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
      simPage = 1;
      if (records[current]) {
        renderSimilar(records[current]);
        renderTargets(records[current]);
        renderDependence(records[current]);
      }
    });
  });
  [['sim-method', 'simMethod'], ['sim-metric', 'simMetric'], ['sim-count', 'simCount']].forEach(([id, key]) => {
    document.getElementById(id).insertAdjacentHTML('beforebegin', infoButton(key));
  });
  document.getElementById('sim-prev').addEventListener('click', () => {
    if (simPage > 1 && records[current]) { simPage -= 1; renderSimilar(records[current]); }
  });
  document.getElementById('sim-next').addEventListener('click', () => {
    if (records[current]) { simPage += 1; renderSimilar(records[current]); }
  });
  document.getElementById('similar').addEventListener('click', (event) => {
    const row = event.target.closest('tr[data-smiles]');
    if (!row) return;
    document.getElementById('smiles-input').value = row.dataset.name + ', ' + row.dataset.smiles;
    analyse();
    document.getElementById('identity').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function batchRow(record) {
  return {
    name: record.name,
    formula: record.d.formula,
    mw: record.d.mw,
    logp: record.d.logp,
    tpsa: record.d.tpsa,
    logS: record.v.logS,
    hbd: record.d.hbd,
    hba: record.d.hba,
    rotatableBonds: record.d.rotatableBonds,
    rings: record.d.rings,
    fractionCsp3: record.d.fractionCsp3,
    abs: record.v.bioavailability.score,
    passed: record.v.passed,
    total: record.v.total
  };
}

function synchronizeBatchSelection() {
  document.querySelectorAll('#batch tbody tr[data-index]').forEach(tr => {
    const selected = Number(tr.dataset.index) === current;
    tr.classList.toggle('active', selected);
    if (selected) tr.setAttribute('aria-current', 'true');
    else tr.removeAttribute('aria-current');
  });
}

function renderBatch() {
  const table = document.getElementById('batch');
  const view = BatchBrowser.browseBatch(preparedBatchRows, {
    filter:document.getElementById('batch-search').value,
    sort:document.getElementById('batch-sort').value,
    desc:document.getElementById('batch-order').value==='desc',
    page:batchPage
  });
  batchPage=view.page;
  table.querySelector('thead').innerHTML = '<tr>' + BATCH_COLUMNS.map(([key,label]) => (
    '<th scope="col">' + label + infoButton(key) + '</th>'
  )).join('') + '</tr>';
  table.querySelector('tbody').innerHTML = view.visible.map(({record,index}) =>
    '<tr data-index="' + index + '">' + BATCH_COLUMNS.map(([, ,get]) =>
      '<td>' + escapeHtml(get(record.row)) + '</td>').join('') + '</tr>'
  ).join('') || '<tr><td colspan="' + BATCH_COLUMNS.length + '">No matching molecules.</td></tr>';
  document.getElementById('batch-count').textContent='Showing '+view.from+'–'+view.to+' of '+view.total+' matching molecules ('+view.overall+' analyzed).';
  document.getElementById('batch-page').textContent='Page '+view.page+' of '+view.pages;
  document.getElementById('batch-prev').disabled=view.page<=1;
  document.getElementById('batch-next').disabled=view.page>=view.pages;
  synchronizeBatchSelection();
}

function csvCell(value) {
  return '"' + String(value === null || value === undefined ? '' : value).replace(/"/g, '""') + '"';
}

function fullExportRows(record) {
  const d = record.d;
  const v = record.v;
  const out = [];
  const add = (section, item, field, value) => out.push([section, item, field, value]);
  const pair = (section, item, value) => add(section, item, 'value', value);

  [
    ['scope', 'Every row in this file is computed in the browser from the SMILES alone. Nothing here is a measurement, a literature value or a database lookup, and no column is calibrated against an assay.'],
    ['physicochemical', 'lipinskiNOCount and lipinskiNHOHCount are the atom and hydrogen tallies the rule of five tests; they match RDKit NOCount and NHOHCount. hbondAcceptors and hbondDonors are the chemically filtered counts; they match RDKit CalcNumHBA and NumHDonors. The two pairs answer different questions, so they are not expected to be equal, and the Lipinski pair is usually the larger.'],
    ['stereochemistry', 'Stereocentres and stereogenic double bonds are perceived from the graph; R/S and E/Z come from a Cahn\u2013Ingold\u2013Prelog implementation that ranks branches by atomic number through a hierarchical digraph. Centres whose ranking needs the later CIP rules, and all nitrogen centres, are reported as withheld rather than labelled. cipLabelsWithheld counts them. Atom numbers are heavy-atom SMILES positions counting from 1.'],
    ['drug-likeness', 'Rule-based filters with published cutoffs. A pass means the molecule falls inside a window drawn from earlier drug sets. It is not a verdict on whether the compound is a good drug.'],
    ['similarity', 'Fingerprint overlap between the query and each reference structure. A high value means the two structures share substructures; it does not mean they share pharmacology.'],
    ['targets', 'nearestLigandSimilarity is the fingerprint similarity between the query and the single most similar known ligand of that target; meanTop3Similarity is the mean over its three most similar. They are structural resemblances, used only to rank the targets in this file against each other. They are not probabilities of binding, not affinities, and not calibrated against any assay: a value of 0.45 means a Tanimoto of 0.45, not a 45% chance of interaction.'],
    ['retrieval benchmark', 'looRecallAt1, looTrials and looMedianRank come from a leave-one-out test of the target panel against its own curated ligand sets, regenerated by tools/retrieval-benchmark.js and stored in data/benchmark.js. For each target, every known ligand is held out in turn, the targets are re-ranked, and the rank of the held-out ligand\u2019s own target is recorded. looRecallAt1 is the share of those trials where the target came first. A target with fewer than two known ligands cannot be tested and reports "not measurable". The benchmark measures how well this page recovers the labels it was given; it does not measure agreement with any external assay, and the sets are small enough that a per-target figure over two or three trials is an anecdote, not a validation.'],
    ['metabolism', 'relativeWeight is the product of published reaction-class frequencies along the path from the parent, each scaled by a per-site factor. It orders candidate routes against each other. It is not a yield, a fraction of dose or a concentration. Route summedWeight adds those products over all metabolites on a route, so route totals can exceed 1 and must not be read as fractions of a dose. The major / minor / trace band is a reading of the same product against fixed cuts at 0.10 and 0.02. enumerationCapped reports whether the search hit its own breadth limit; "no" does not mean every biologically possible route was considered.'],
    ['toxicity', 'Substructure matches against published alert catalogues. A match flags a motif the literature associates with a liability. Zero matches means no catalogued motif was found, not that the compound is safe.'],
    ['dependence', 'Structural analogy to labelled reference drugs, and nothing more. No row in this section is a pharmacological or abuse-liability finding about the query.']
  ].forEach(([item, text]) => add('provenance', item, 'note', text));

  if (typeof METABOLISM_CASES !== 'undefined') {
    const c = METABOLISM_CASES;
    add('provenance', 'metabolism known-answer tests', 'summary', 'Generated ' + c.generated + ' by '
      + 'tools/metabolism-cases.js over ' + c.cases + ' documented metabolites of ' + c.drugs + ' drugs, '
      + c.generations + ' generations: ' + c.enumerated + ' enumerated, ' + c.major + ' in the major band, '
      + c.top5 + ' inside the top five by weight. The cases that fall short of the major band are reported as '
      + 'such rather than fixed by raising a rule weight.');
    c.rows.forEach((row) => {
      add('provenance', 'known-answer case: ' + row.drug + ' to ' + row.metabolite, 'result',
        (row.found ? 'found, band ' + row.band + ', rank ' + row.rank + ', weight ' + row.weight.toFixed(4)
          + ', generation ' + row.generation : 'not enumerated')
        + ' \u2014 documented route: ' + row.route + '; standing: ' + row.standing);
    });
  }

  if (typeof STEREO_CONFORMANCE !== 'undefined') {
    const c = STEREO_CONFORMANCE;
    add('provenance', 'stereochemistry conformance', 'summary', 'Generated ' + c.generated + ' by '
      + 'tools/stereo-conformance.py against RDKit rdCIPLabeler over ' + c.cases + ' enumerated stereoisomers '
      + 'of the reference library: ' + c.labelMatch + ' of ' + c.labels + ' R/S labels agreed ('
      + c.labelPct + '%), ' + c.labelMissing + ' withheld, ' + c.labelWrong + ' disagreed; '
      + c.bondLabelMatch + ' of ' + c.bondLabels + ' E/Z labels agreed, ' + c.bondLabelWrong + ' disagreed; '
      + 'perceived centre set exact on ' + c.centerSetPct + '% of cases ('
      + c.extraCenters + ' extra centres, ' + c.missedCenters + ' missed).');
  }

  if (typeof WEDGE_CONFORMANCE !== 'undefined') {
    const w = WEDGE_CONFORMANCE;
    add('provenance', 'wedge depiction conformance', 'summary', 'Generated ' + w.generated + ' by '
      + 'tools/stereo-depiction.js over ' + w.compounds + ' ' + w.source + ': ' + w.drawn + ' of '
      + w.centers + ' specified stereocentres carry a wedge or hash, and reading those drawings back with '
      + 'the ordinary convention recovers the stated configuration in ' + w.agree + ' of them ('
      + w.agreePct + '%), with ' + w.wrong + ' inverted.');
  }

  if (typeof PROPERTY_VALIDATION !== 'undefined') {
    const sets = PROPERTY_VALIDATION.datasets;
    Object.keys(sets).forEach((key) => {
      const d = sets[key];
      add('provenance', 'property validation: ' + key, 'summary', d.label + ' \u2014 n ' + d.n
        + ', MAE ' + d.mae + ', RMSE ' + d.rmse + ', R\u00b2 ' + d.r2 + ', mean signed error ' + d.bias
        + ', within one unit ' + d.within1Pct + '%'
        + (d.source ? '; source ' + d.source : '')
        + (d.sha256 ? '; sha256 ' + d.sha256 : '')
        + (d.note ? '; ' + d.note : ''));
    });
    const domain = sets.logS && sets.logS.domain;
    if (domain) {
      add('provenance', 'property validation: applicability domain', 'summary',
        Object.keys(domain).map((key) => key + ' ' + domain[key][0] + ' to ' + domain[key][1]).join('; ')
        + ' (1st to 99th percentile of the measured solubility set)');
    }
  }

  if (typeof CRIPPEN_CONFORMANCE !== 'undefined') {
    const c = CRIPPEN_CONFORMANCE;
    add('provenance', 'crippen conformance', 'summary', 'Generated ' + c.generated + ' by '
      + 'tools/crippen-conformance.py against RDKit over ' + c.compounds + ' compounds from ' + c.source
      + ': mean absolute log P difference ' + c.logPMeanAbsDiff + ', ' + c.logPWithin0_05
      + '% within 0.05, worst ' + c.logPMaxAbsDiff + '; molar refractivity mean absolute difference '
      + c.mrMeanAbsDiff + ', worst ' + c.mrMaxAbsDiff + '; ' + c.disagreeOver0_05 + ' disagreements over 0.05.');
  }

  if (typeof RETRIEVAL_BENCHMARK !== 'undefined') {
    const b = RETRIEVAL_BENCHMARK;
    add('provenance', 'retrieval benchmark', 'summary', 'Generated ' + b.generated + ' with ' + b.method + ' / '
      + b.metric + ' over ' + b.library + ' reference compounds: ' + b.trials + ' held-out trials across '
      + b.measurable + ' of ' + b.targets + ' targets, recall@1 ' + b.overall.r1.toFixed(4) + ', recall@5 '
      + b.overall.r5.toFixed(4) + ', recall@10 ' + b.overall.r10.toFixed(4) + ', median true rank '
      + b.overall.median + '. Popularity baseline recall@1 ' + b.popularity.r1.toFixed(4)
      + ', uniform random recall@1 ' + b.random.r1.toFixed(4) + '.');
  }

  pair('identity', 'name', record.name);
  pair('identity', 'smiles', record.smiles);
  pair('identity', 'formula', d.formula);
  pair('identity', 'molecularWeight', d.mw.toFixed(4));
  pair('identity', 'monoisotopicMass', d.exactMass.toFixed(4));
  pair('identity', 'heavyAtoms', d.heavyAtoms);
  pair('identity', 'carbons', d.carbons);
  pair('identity', 'heteroatoms', d.heteroatoms);
  pair('identity', 'formalCharge', d.charge);

  [
    ['rings', d.rings], ['aromaticRings', d.aromaticRings], ['aromaticAtoms', d.aromaticAtoms],
    ['aromaticProportion', d.aromaticProportion.toFixed(4)], ['rotatableBonds', d.rotatableBonds],
    ['lipinskiNHOHCount', d.hbd], ['lipinskiNOCount', d.hba],
    ['hbondDonors', d.hbdStrict], ['hbondAcceptors', d.hbaStrict],
    ['tpsa', d.tpsa.toFixed(4)], ['fractionCsp3', d.fractionCsp3.toFixed(4)]
  ].forEach(([key, value]) => pair('physicochemical', key, value));

  [
    ['aliphaticRings', d.aliphaticRings], ['saturatedRings', d.saturatedRings],
    ['heterocycles', d.heterocycles], ['largestRing', d.largestRing],
    ['halogens', d.halogens], ['amideBonds', d.amideBonds],
    ['spiroAtoms', d.spiroAtoms], ['bridgeheadAtoms', d.bridgeheadAtoms]
  ].forEach(([key, value]) => pair('skeleton', key, value));

  [
    ['chi0', d.chi.chi0], ['chi1', d.chi.chi1], ['chi0v', d.chi.chi0v], ['chi1v', d.chi.chi1v],
    ['hallKierAlpha', d.shape.hallKierAlpha], ['kappa1', d.shape.kappa1],
    ['kappa2', d.shape.kappa2], ['kappa3', d.shape.kappa3]
  ].forEach(([key, value]) => pair('topology', key, value.toFixed(4)));

  const st = stereoFor(record);
  pair('stereochemistry', 'stereocenters', st.centerCount);
  pair('stereochemistry', 'stereocentersSpecified', st.centerSpecified);
  pair('stereochemistry', 'cipLabels', st.labels.join(' '));
  pair('stereochemistry', 'cipLabelsWithheld',
    st.centers.filter((item) => item.specified && !item.label).length);
  pair('stereochemistry', 'stereogenicDoubleBonds', st.bondCount);
  pair('stereochemistry', 'stereogenicDoubleBondsSpecified', st.bondSpecified);
  pair('stereochemistry', 'ezLabels', st.bondLabels.join(' '));
  pair('stereochemistry', 'unspecifiedElements', st.centerUnspecified + st.bondUnspecified);

  pair('lipophilicity', 'wlogp', d.logp.toFixed(4));
  pair('lipophilicity', 'molarRefractivity', d.mr.toFixed(4));
  pair('lipophilicity', 'logS', v.logS.toFixed(4));
  pair('lipophilicity', 'solubilityClass', v.solubility);

  v.filters.forEach((filter) => {
    add('drug-likeness', filter.name, 'verdict', filter.pass ? 'pass' : 'fail');
    add('drug-likeness', filter.name, 'violations', filter.fails.join('; '));
  });
  pair('drug-likeness', 'filtersPassed', v.passed + ' of ' + v.total);
  pair('drug-likeness', 'bioavailabilityScore', v.bioavailability.score.toFixed(2));
  pair('drug-likeness', 'bioavailabilityReason', v.bioavailability.reason);
  pair('drug-likeness', 'leadLikeness', v.lead.pass ? 'pass' : v.lead.fails.join('; '));
  pair('drug-likeness', 'passiveAbsorption', v.egg.hia ? 'likely' : 'unlikely');
  pair('drug-likeness', 'brainPenetration', v.egg.bbb ? 'likely' : 'unlikely');

  v.radar.forEach((axis) => {
    add('radar', axis.label, 'value', axis.value.toFixed(4));
    add('radar', axis.label, 'inRange', axis.inRange ? 'yes' : 'no');
  });

  d.crippenTypes.forEach((entry) => {
    const atom = record.mol.atoms[entry.atom];
    const label = 'atom ' + (entry.atom + 1);
    add('atoms', label, 'element', atom.aromatic ? atom.element.toLowerCase() : atom.element);
    add('atoms', label, 'hydrogens', atom.totalH);
    add('atoms', label, 'crippenType', entry.type);
    add('atoms', label, 'logpContribution', entry.logp.toFixed(4));
    add('atoms', label, 'mrContribution', entry.mr.toFixed(4));
  });

  const methodKey = document.getElementById('sim-method').value;
  const metricKey = document.getElementById('sim-metric').value;
  const method = FP_METHODS.find((entry) => entry.key === methodKey) || FP_METHODS[0];
  const score = metricKey === 'dice' ? dice : tanimoto;
  const metricName = method.label + ' ' + (metricKey === 'dice' ? 'Dice' : 'Tanimoto');
  const query = fingerprint(record.mol, method.key);
  pair('similarity', 'fingerprint', method.label);
  pair('similarity', 'metric', metricKey === 'dice' ? 'Dice' : 'Tanimoto');
  pair('similarity', 'queryBits', query.bits.size);
  pair('similarity', 'rankedExportLimit', FullCsvExport.MAX_RANKED_RESULTS);
  const similarityRanked = libraryFingerprints(method.key).map((item) => ({
    entry: item.entry,
    bits: item.fp.bits.size,
    shared: sharedCount(query, item.fp),
    value: score(query, item.fp)
  })).sort((a, b) => b.value - a.value);
  FullCsvExport.topRanked(similarityRanked).forEach((hit, index) => {
    const label = 'rank ' + (index + 1);
    add('similarity', label, 'name', hit.entry.name);
    add('similarity', label, 'class', hit.entry.cls);
    add('similarity', label, 'formula', hit.entry.formula);
    add('similarity', label, 'smiles', hit.entry.smiles);
    add('similarity', label, 'score', hit.value.toFixed(4));
    add('similarity', label, 'sharedBits', hit.shared);
    add('similarity', label, 'referenceBits', hit.bits);
  });

  const byName = new Map();
  libraryFingerprints(method.key).forEach((item) => byName.set(item.entry.name, item));
  const ranked = [];
  TARGETS.forEach((target) => {
    const scored = [];
    target.ligands.forEach((name) => {
      const item = byName.get(name);
      if (item) scored.push({ value: score(query, item.fp), entry: item.entry });
    });
    if (!scored.length) return;
    scored.sort((a, b) => b.value - a.value);
    const top = scored.slice(0, 3);
    ranked.push({
      target: target,
      score: scored[0].value,
      mean: top.reduce((sum, item) => sum + item.value, 0) / top.length,
      nearest: scored[0].entry,
      count: scored.length
    });
  });
  ranked.sort((a, b) => b.score - a.score || b.mean - a.mean);
  pair('targets', 'rankedExportLimit', FullCsvExport.MAX_RANKED_RESULTS);
  FullCsvExport.topRanked(ranked).forEach((row, index) => {
    const label = 'rank ' + (index + 1);
    add('targets', label, 'target', row.target.name);
    add('targets', label, 'gene', row.target.gene);
    add('targets', label, 'family', row.target.family);
    add('targets', label, 'organism', row.target.organism);
    add('targets', label, 'nearestLigandSimilarity', row.score.toFixed(4));
    add('targets', label, 'meanTop3Similarity', row.mean.toFixed(4));
    add('targets', label, 'nearestLigand', row.nearest.name);
    add('targets', label, 'activesScored', row.count);
    add('targets', label, 'similarityMetric', metricName);
    const bench = benchmarkRow(row.target);
    add('targets', label, 'looRecallAt1', bench ? bench.r1.toFixed(4) : 'not measurable');
    add('targets', label, 'looTrials', bench ? bench.n : 0);
    add('targets', label, 'looMedianRank', bench ? bench.median : 'not measurable');
    add('targets', label, 'mechanism', row.target.note);
  });

  ALERTS.forEach((alert) => {
    const matches = smartsMatches(compileSmarts(alert.smarts), record.mol, {});
    if (!matches.length) return;
    const atoms = [];
    matches.forEach((match) => match.forEach((index) => {
      if (atoms.indexOf(index) === -1) atoms.push(index);
    }));
    atoms.sort((a, b) => a - b);
    add('alerts', alert.name, 'catalogue', alert.source);
    add('alerts', alert.name, 'matches', matches.length);
    add('alerts', alert.name, 'atoms', atoms.map((index) => index + 1).join(' '));
    add('alerts', alert.name, 'pattern', alert.smarts);
    add('alerts', alert.name, 'concern', alert.note);
    add('alerts', alert.name, 'citation', citationFor(alert.ref, alert.cite));
  });
  pair('alerts', 'patternsMatched', countAlerts(record.mol) + ' of ' + ALERTS.length);
  if (typeof RULESETS !== 'undefined') {
    Object.keys(RULESETS).forEach((ref) => {
      const set = RULESETS[ref];
      add('provenance', 'ruleset: ' + set.label, 'citation', set.citation);
      add('provenance', 'ruleset: ' + set.label, 'doi', set.doi || '');
      add('provenance', 'ruleset: ' + set.label, 'coverage', set.coverage);
    });
    add('provenance', 'rule encoding', 'statement', ALERT_ENCODING_NOTE);
    RULESETS_NOT_IMPLEMENTED.forEach((entry) => {
      add('provenance', 'not implemented: ' + entry.label, 'citation', entry.citation);
      add('provenance', 'not implemented: ' + entry.label, 'reason', entry.reason);
    });
  }

  const scan = toxFor(record);
  scan.byEndpoint.forEach((group) => {
    add('toxicity', group.endpoint, 'rulesFiring', group.hits.length + ' of ' + group.total);
    add('toxicity', group.endpoint, 'firing', group.hits.map((row) => row.name).join('; '));
    group.context.forEach((row) => {
      add('toxicity', group.endpoint, 'context: ' + row.name, row.count ? 'likely' : 'unlikely');
    });
  });
  scan.hits.forEach((row) => {
    add('toxicity rules', row.name, 'endpoint', row.endpoint);
    add('toxicity rules', row.name, 'source', row.source);
    add('toxicity rules', row.name, 'matches', row.count);
    add('toxicity rules', row.name, 'atoms', (row.atoms || []).map((index) => index + 1).join(' '));
    add('toxicity rules', row.name, 'ruleBody', row.pattern || row.smarts || '');
    add('toxicity rules', row.name, 'mechanism', row.note);
    add('toxicity rules', row.name, 'citation', citationFor(row.ref, row.cite));
  });

  const profile = dependenceProfile(record, method.key, score);
  pair('dependence', 'analogyScore', profile.top.toFixed(4));
  pair('dependence', 'analogyBand', profile.band);
  pair('dependence', 'claimType', DEP_VERDICTS.find(([floor]) => profile.top >= floor)[1]);
  pair('dependence', 'gate', profile.top < DEP_GATE
    ? 'withheld on screen: closest labelled analogy below ' + DEP_GATE.toFixed(2)
    + '; the ranks below are fingerprint distances carrying no pharmacological claim'
    : 'reported on screen: closest labelled analogy at or above ' + DEP_GATE.toFixed(2));
  pair('dependence', 'nearestLiability', profile.best
    ? profile.best.drug.name + ' (' + profile.best.drug.liability + ', ' + profile.best.value.toFixed(4) + ')'
    : '');
  profile.neighbours.forEach((row, index) => {
    const label = 'rank ' + (index + 1);
    add('dependence', label, 'drug', row.drug.name);
    add('dependence', label, 'class', row.drug.klass);
    add('dependence', label, 'liability', row.drug.liability);
    add('dependence', label, 'score', row.value.toFixed(4));
    add('dependence', label, 'note', row.drug.note);
  });
  profile.rewards.forEach((row) => {
    add('reward targets', row.target.name, 'gene', row.target.gene);
    add('reward targets', row.target.name, 'score', row.value.toFixed(4));
    add('reward targets', row.target.name, 'nearestLigand', row.nearest.name);
  });

  let tree = null;
  try { tree = metabolismFor(record); } catch (error) { tree = null; }
  if (tree) {
    pair('metabolism', 'generations', tree.depth);
    pair('metabolism', 'rulesTried', tree.rulesTried);
    pair('metabolism', 'metabolites', tree.metabolites.length);
    pair('metabolism', 'enumerationCapped', tree.truncated ? 'yes' : 'no');
    tree.routes.forEach((row) => {
      add('metabolism', 'route: ' + row.enzyme, 'metabolites', row.count);
      add('metabolism', 'route: ' + row.enzyme, 'summedWeight', row.weight.toFixed(4));
    });
    tree.metabolites.forEach((node) => {
      const label = metaboliteLabel(node);
      add('metabolites', label, 'smiles', node.smiles);
      add('metabolites', label, 'formula', node.d.formula);
      add('metabolites', label, 'rule', node.rule);
      add('metabolites', label, 'enzyme', node.enzyme);
      add('metabolites', label, 'route', node.route);
      add('metabolites', label, 'phase', node.phase);
      add('metabolites', label, 'generation', node.depth);
      add('metabolites', label, 'parent', metaboliteLabel({ id: node.parent }));
      add('metabolites', label, 'relativeWeight', node.score.toFixed(6));
      add('metabolites', label, 'abundanceBand', metaboliteBand(node.score));
      add('metabolites', label, 'siteFactor', typeof node.siteFactor === 'number' ? node.siteFactor.toFixed(4) : '');
      add('metabolites', label, 'siteReasons', (node.siteReasons || []).join('; '));
      add('metabolites', label, 'parentAtomsTouched', (node.touched || []).map((index) => index + 1).join(' '));
      add('metabolites', label, 'routesReaching', node.steps.length);
      add('metabolites', label, 'released', node.released.join(' '));
      add('metabolites', label, 'mw', node.d.mw.toFixed(4));
      add('metabolites', label, 'logp', node.d.logp.toFixed(4));
      add('metabolites', label, 'tpsa', node.d.tpsa.toFixed(4));
      add('metabolites', label, 'newToxicityFlags', node.newTox.map((row) => row.name + ' (' + row.endpoint + ')').join('; '));
      add('metabolites', label, 'mechanism', node.steps[0].note);
    });
    tree.notes.forEach((note) => {
      add('metabolism notes', note.name, 'enzyme', note.enzyme);
      add('metabolism notes', note.name, 'atoms', note.atoms.map((index) => index + 1).join(' '));
      add('metabolism notes', note.name, 'whyItMatters', note.note);
    });
  }

  return out;
}

function exportMoleculeCsv() {
  const record = records[current];
  if (!record) return;
  const csv = FullCsvExport.createCsv(record,fullExportRows(record));
  const slug = record.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'molecule';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = slug + '-full-profile-v2.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function exportFullCsvDictionary() {
  const csv=FullCsvExport.dictionaryCsv();
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const a=document.createElement('a');
  a.href=url;a.download='molecule-profiler-full-csv-dictionary-v2.csv';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function exportResearch() {
  if(!records.length)return;
  const val=typeof PROPERTY_VALIDATION==='undefined'?{}:PROPERTY_VALIDATION.datasets;
  const pkg=ResearchPackage.createPackage(records,val,latestInputIssues,{
    assetToken:(document.querySelector('script[src*="js/app.js?"]')?.getAttribute('src')||null),
    referenceLibraryCount:typeof LIBRARY!=='undefined'?LIBRARY.length:null,
    analysisSettings:{modelFamily:'WLOGP and ESOL'}
  });
  const zip=ResearchZip.makeZip(pkg.files);
  const url=URL.createObjectURL(new Blob([zip],{type:'application/zip'}));
  const a=document.createElement('a');a.href=url;a.download='molecule-profiler-research.zip';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportSnapshot() {
  if(!records.length)return;
  const snapshot = InputWorkflow.createSnapshot(records);
  const content=JSON.stringify(snapshot,(key,value)=>typeof value==='number'&&!Number.isFinite(value)?null:value,2);
  const url=URL.createObjectURL(new Blob([content],{type:'application/json;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;link.download='molecule-analysis.json';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function exportCsv() {
  const header = ['name', 'smiles'].concat(BATCH_COLUMNS.map(([key]) => key));
  const lines = [header.join(',')];
  records.forEach((record) => {
    const row = batchRow(record);
    const cells = [record.name, record.smiles].concat(BATCH_COLUMNS.map(([, , get]) => String(get(row))));
    lines.push(cells.map(csvCell).join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'molecule-profile.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function setupExamples() {
  const host = document.getElementById('examples');
  host.innerHTML = EXAMPLES.map(([name], index) => (
    '<button type="button" class="chip" data-example="' + index + '">' + name + '</button>'
  )).join('') + '<button type="button" class="chip" data-example="all">load all ten</button>';
  host.addEventListener('click', (event) => {
    const button = event.target.closest('[data-example]');
    if (!button) return;
    const input = document.getElementById('smiles-input');
    if (button.dataset.example === 'all') {
      input.value = EXAMPLES.map(([name, smiles]) => name + ', ' + smiles).join('\n');
    } else {
      const pair = EXAMPLES[Number(button.dataset.example)];
      input.value = pair[0] + ', ' + pair[1];
    }
    analyse();
  });
}

function setupTheme() {
  let saved;
  try { saved = localStorage.getItem('molecule-profiler-theme'); } catch (error) { /* storage may be blocked */ }
  if (saved === 'dark' || saved === 'light') document.body.dataset.theme = saved;
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = next;
    try { localStorage.setItem('molecule-profiler-theme', next); } catch (error) { /* private mode */ }
    if (records.length) renderCurrent();
  });
}

document.getElementById('run').addEventListener('click', analyse);
document.getElementById('cancel-analysis').addEventListener('click', () => {
  if (activeAnalysis) activeAnalysis.cancelled = true;
});
document.getElementById('clear').addEventListener('click', () => {
  if (activeAnalysis) activeAnalysis.cancelled = true;
  activeAnalysis = null;
  setAnalysisBusy(false);
  document.getElementById('smiles-input').value = '';
  document.getElementById('results').hidden = true;
  document.getElementById('status').textContent = '';
  document.getElementById('export').disabled = true;
  document.getElementById('export-full').disabled = true;
  document.getElementById('export-snapshot').disabled = true;
  document.getElementById('export-research').disabled = true;
  document.getElementById('input-feedback').hidden = true;
  document.getElementById('quality-summary').hidden = true;
  records = [];
  preparedBatchRows = [];
  document.dispatchEvent(new Event('molecule-profiler:updated'));
});
document.getElementById('export').addEventListener('click', exportCsv);
document.getElementById('export-full').addEventListener('click', exportMoleculeCsv);
document.getElementById('export-full-dictionary').addEventListener('click', exportFullCsvDictionary);
document.getElementById('export-snapshot').addEventListener('click', exportSnapshot);
document.getElementById('export-research').addEventListener('click', exportResearch);
document.getElementById('molecule-file').addEventListener('change', async event => {
  const file=event.target.files && event.target.files[0];
  if(!file)return;
  const status=document.getElementById('status');
  if(file.size>1024*1024){status.textContent='File is too large (maximum 1 MB).';status.classList.add('error');event.target.value='';return;}
  try {
    document.getElementById('smiles-input').value=await file.text();
    analyse();
  } catch(error) {
    status.textContent='Could not read input file: '+error.message;
    status.classList.add('error');
  } finally {event.target.value='';}
});
document.getElementById('smiles-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) analyse();
});
document.getElementById('molecule-tabs').addEventListener('keydown', event => {
  if (!event.target.closest('[data-index]') || !records.length) return;
  const movement = {ArrowRight: 1, ArrowLeft: -1};
  if (Object.prototype.hasOwnProperty.call(movement, event.key)) {
    current = (current + movement[event.key] + records.length) % records.length;
  } else if (event.key === 'Home') current = 0;
  else if (event.key === 'End') current = records.length - 1;
  else return;
  event.preventDefault();
  renderCurrent();
  document.querySelector('#molecule-tabs [data-index="' + current + '"]').focus();
});
document.getElementById('molecule-tabs').addEventListener('click', (event) => {
  const button = event.target.closest('[data-index]');
  if (!button) return;
  current = Number(button.dataset.index);
  renderCurrent();
});
for(const id of ['batch-search','batch-sort','batch-order']) {
  document.getElementById(id).addEventListener(id==='batch-search'?'input':'change',()=>{
    batchPage=1; renderBatch();
  });
}
document.getElementById('batch-prev').addEventListener('click',()=>{if(batchPage>1){batchPage--;renderBatch();}});
document.getElementById('batch-next').addEventListener('click',()=>{batchPage++;renderBatch();});
document.getElementById('batch').addEventListener('click', (event) => {
  const row = event.target.closest('tr[data-index]');
  if (!row) return;
  current = Number(row.dataset.index);
  renderCurrent();
  document.getElementById('identity').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

setupExamples();
setupTheme();
setupSimilarity();
setupTargets();
setupStructure();
setupAlerts();
setupTox();
setupMetabolism();
document.getElementById('smiles-input').value = 'aspirin, CC(=O)Oc1ccccc1C(=O)O';
analyse();
