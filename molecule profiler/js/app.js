'use strict';

const GLOSSARY = {
  name: ['Name', 'The label you typed before the SMILES, or a generated one. It is only used to identify rows and tabs.'],
  smiles: ['SMILES', 'The structure you entered, as written. Everything on this page is derived from it: the parser builds an atom and bond graph, finds rings, decides aromaticity, kekulizes and then counts hydrogens from a valence model.'],
  formula: ['Molecular formula', 'Element counts in Hill order, with hydrogens added by the valence model rather than taken from the SMILES text.'],
  mw: ['Molecular weight', 'Average mass in g/mol, summed from standard atomic weights including the implicit hydrogens.'],
  exactMass: ['Monoisotopic mass', 'Mass using the most abundant isotope of each element. This is the number a mass spectrometer compares against, and it differs from the average molecular weight.'],
  heavyAtoms: ['Heavy atoms', 'Every atom except hydrogen. Several filters are written in terms of this count rather than molecular weight.'],
  carbons: ['Carbon atoms', 'Total carbons, aromatic and aliphatic. Muegge’s filter rejects fragments with four or fewer.'],
  heteroatoms: ['Heteroatoms', 'Non-carbon, non-hydrogen atoms. A molecule with at most one is usually too greasy to be a drug candidate, which is why Muegge’s filter asks for more than one.'],
  charge: ['Formal charge', 'Sum of the formal charges written in the SMILES. It decides which branch of the bioavailability score applies, since anions behave differently.'],
  rings: ['Rings', 'Size of the smallest set of smallest rings: the number of independent cycles in the graph, which equals bonds minus atoms plus connected components.'],
  aromaticRings: ['Aromatic rings', 'Rings whose atoms were either written lowercase or satisfy a Hückel π-electron count of 4n+2.'],
  aromaticAtoms: ['Aromatic atoms', 'Atoms belonging to at least one aromatic ring after perception.'],
  rotatableBonds: ['Rotatable bonds', 'Single, acyclic bonds between two non-terminal heavy atoms, using the strict definition: triple-bond neighbours, CF₃, CCl₃, CBr₃ and tert-butyl groups are excluded, and so are amide and amidine-like bonds, whose rotation is hindered by conjugation.'],
  hbd: ['H-bond donors', 'Lipinski’s count: every hydrogen attached to a nitrogen or oxygen. It overcounts in the chemical sense but it is what the rule of five was calibrated on.'],
  hba: ['H-bond acceptors', 'Lipinski’s count: every nitrogen and oxygen atom, whether or not it can really accept a hydrogen bond.'],
  hbdStrict: ['Donors (strict)', 'Only nitrogens and oxygens carrying a hydrogen that are plausible donors, skipping amide nitrogens and similar. Shown for comparison; the filters use the Lipinski count.'],
  hbaStrict: ['Acceptors (strict)', 'Only nitrogens and oxygens with an available lone pair, skipping amide nitrogens, pyrrole-type nitrogens and nitro oxygens. Shown for comparison.'],
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
  metScore: ['Relative weight', 'The product of the published class frequencies along the path from the parent. It orders the list; it is not a probability, a yield or a fraction of dose.'],
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
  tgtScore: ['Score', 'The similarity between the query and the most similar of this target’s known ligands — a nearest-neighbour score, computed with the fingerprint and metric chosen in the similarity panel above. It is a structural resemblance, not a probability of binding.'],
  tgtNearest: ['Nearest ligand', 'The known ligand of this target that the query resembles most. Click the row to profile it.'],
  tgtLigands: ['Actives', 'How many known ligands of this target are in the reference library. A target with one ligand can only ever be matched through that single compound, so its score says much less.'],
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
  ['hbd', 'HBD', (d) => d.hbd],
  ['hba', 'HBA', (d) => d.hba],
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
  const target = event.target.closest('.info');
  if (target) showTip(target);
  else if (!event.target.closest('#tip')) hideTip();
});
document.addEventListener('focusin', (event) => {
  const target = event.target.closest('.info');
  if (target) showTip(target);
});
document.addEventListener('focusout', hideTip);
window.addEventListener('scroll', hideTip, true);

function rows(target, entries) {
  target.innerHTML = entries.map(([key, label, value]) => (
    '<dt>' + label + infoButton(key) + '</dt><dd>' + value + '</dd>'
  )).join('');
}

function splitLine(line) {
  const comma = line.indexOf(',');
  const tab = line.indexOf('\t');
  let cut = -1;
  if (tab >= 0) cut = tab;
  else if (comma >= 0) cut = comma;
  else {
    const space = line.search(/\s/);
    if (space >= 0) cut = space;
  }
  if (cut < 0) return { name: null, smiles: line.trim() };
  const head = line.slice(0, cut).trim();
  const tail = line.slice(cut + 1).trim();
  if (!tail) return { name: null, smiles: head };
  if (/^[A-Za-z0-9@+\-\[\]()=#$%./\\]+$/.test(head) && head.length > tail.length) {
    return { name: tail, smiles: head };
  }
  return { name: head, smiles: tail };
}

function analyse() {
  const text = document.getElementById('smiles-input').value;
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const status = document.getElementById('status');
  records = [];
  const problems = [];

  lines.forEach((line, index) => {
    const parsed = splitLine(line);
    try {
      const mol = buildMolecule(parseSmiles(parsed.smiles));
      const d = describe(mol);
      const verdicts = evaluate(d);
      records.push({
        name: parsed.name || ('molecule ' + (index + 1)),
        smiles: parsed.smiles,
        mol,
        d,
        v: verdicts
      });
    } catch (error) {
      problems.push(parsed.smiles + ': ' + error.message);
    }
  });

  status.classList.toggle('error', problems.length > 0);
  if (problems.length) status.textContent = problems.join(' | ');
  else status.textContent = records.length ? records.length + ' parsed' : '';

  document.getElementById('export').disabled = records.length === 0;
  document.getElementById('results').hidden = records.length === 0;
  if (!records.length) return;
  current = 0;
  renderTabs();
  renderBatch();
  renderCurrent();
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
  const d = record.d;
  const v = record.v;

  rows(document.getElementById('identity'), [
    ['name', 'Name', escapeHtml(record.name)],
    ['smiles', 'SMILES', escapeHtml(record.smiles)],
    ['formula', 'Formula', d.formula],
    ['mw', 'Molecular weight', d.mw.toFixed(2) + ' g/mol'],
    ['exactMass', 'Monoisotopic mass', d.exactMass.toFixed(4)],
    ['heavyAtoms', 'Heavy atoms', d.heavyAtoms],
    ['carbons', 'Carbons', d.carbons],
    ['heteroatoms', 'Heteroatoms', d.heteroatoms],
    ['charge', 'Formal charge', d.charge > 0 ? '+' + d.charge : d.charge]
  ]);

  rows(document.getElementById('physchem'), [
    ['rings', 'Rings', d.rings],
    ['aromaticRings', 'Aromatic rings', d.aromaticRings],
    ['aromaticAtoms', 'Aromatic atoms', d.aromaticAtoms],
    ['rotatableBonds', 'Rotatable bonds', d.rotatableBonds],
    ['hbd', 'H-bond donors', d.hbd],
    ['hba', 'H-bond acceptors', d.hba],
    ['hbdStrict', 'Donors (strict)', d.hbdStrict],
    ['hbaStrict', 'Acceptors (strict)', d.hbaStrict],
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
  renderAlerts(record);
  renderTox(record);
  renderDependence(record);
  renderMetabolism(record);

  document.querySelectorAll('#molecule-tabs button').forEach((button) => {
    button.setAttribute('aria-selected', String(Number(button.dataset.index) === current));
  });
  document.querySelectorAll('#batch tbody tr').forEach((tr, index) => {
    tr.classList.toggle('active', index === current);
  });
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
  const hits = library.map((item) => ({
    entry: item.entry,
    bits: item.fp.bits.size,
    shared: sharedCount(query, item.fp),
    score: score(query, item.fp)
  })).sort((a, b) => b.score - a.score).slice(0, limit);

  document.getElementById('sim-summary').innerHTML = library.length + ' reference compounds, '
    + query.bits.size + ' query bits' + infoButton('simBits');
  document.getElementById('sim-blurb').textContent = method.blurb;

  const table = document.getElementById('similar');
  table.querySelector('thead').innerHTML = '<tr>' + SIM_COLUMNS.map(([key, label]) => (
    '<th>' + label + infoButton(key === 'formula' ? 'formula' : key) + '</th>'
  )).join('') + '</tr>';
  table.querySelector('tbody').innerHTML = hits.map((hit, index) => (
    '<tr data-smiles="' + escapeHtml(hit.entry.smiles) + '" data-name="' + escapeHtml(hit.entry.name) + '">'
      + '<td>' + (index + 1) + '</td>'
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
  ['tgtScore', 'Score'],
  ['tgtMean', 'Mean top-3'],
  ['tgtNearest', 'Nearest ligand'],
  ['tgtLigands', 'Actives'],
  ['tgtNote', 'Mechanism']
];

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
  document.getElementById('tgt-summary').innerHTML = pool + ' targets'
    + (organism === 'all' ? '' : ' in ' + organism.toLowerCase() + ' scope')
    + ', ' + kept.length + ' above the score cut';
  document.getElementById('tgt-blurb').textContent = 'Scored with ' + method.label + ' and '
    + (metricKey === 'dice' ? 'Dice' : 'Tanimoto') + ', following the similarity panel above.';

  const table = document.getElementById('targets');
  table.querySelector('thead').innerHTML = '<tr>' + TGT_COLUMNS.map(([key, label]) => (
    '<th>' + label + infoButton(key) + '</th>'
  )).join('') + '</tr>';
  table.querySelector('tbody').innerHTML = shown.length ? shown.map((row, index) => (
    '<tr data-smiles="' + escapeHtml(row.nearest.smiles) + '" data-name="' + escapeHtml(row.nearest.name) + '">'
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
      + '<td class="note">' + escapeHtml(row.target.note) + '</td>'
      + '</tr>'
  )).join('') : '<tr><td colspan="10">No target has a known ligand this similar to the query.</td></tr>';
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
      + '<td>' + escapeHtml(row.alert.source) + '</td>'
      + '<td>' + row.count + '</td>'
      + '<td class="atoms">' + (row.atoms.length ? row.atoms.map((index) => index + 1).join(', ') : '—') + '</td>'
      + '<td><code>' + escapeHtml(row.alert.smarts) + '</code></td>'
      + '<td class="note">' + escapeHtml(row.alert.note) + '</td>'
      + '</tr>'
  )).join('') : '<tr><td colspan="6">Nothing matches in this catalogue.</td></tr>';
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
      + '<td>' + escapeHtml(row.source) + '</td>'
      + '<td>' + row.count + '</td>'
      + '<td class="atoms">' + (row.atoms.length ? row.atoms.map((index) => index + 1).join(', ') : '\u2014') + '</td>'
      + '<td><code>' + escapeHtml(row.pattern) + '</code></td>'
      + '<td class="note">' + escapeHtml(row.note) + '</td>'
      + '</tr>'
  )).join('') : '<tr><td colspan="7">No rule fires for this endpoint.</td></tr>';
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

  document.getElementById('dep-cards').innerHTML = [
    '<div class="filter ' + (profile.top >= 0.65 ? 'fail' : 'pass') + '">'
      + '<div class="name">Analogy band' + infoButton('depBand') + '</div>'
      + '<div class="verdict">' + profile.top.toFixed(3) + '</div>'
      + '<div class="why">' + escapeHtml(profile.band) + '</div>'
      + '</div>',
    '<div class="filter ' + (profile.best && profile.top >= 0.65 ? 'fail' : 'pass') + '">'
      + '<div class="name">Nearest liability' + infoButton('depNearest') + '</div>'
      + '<div class="verdict">' + (profile.best ? profile.best.value.toFixed(3) : '\u2014') + '</div>'
      + '<div class="why">' + (profile.best
        ? escapeHtml(profile.best.drug.name + ' \u2014 ' + profile.best.drug.klass.toLowerCase()
          + ', ' + profile.best.drug.liability + ' liability')
        : 'nothing in the set') + '</div>'
      + '</div>',
    '<div class="filter ' + (reward && reward.value >= 0.4 ? 'fail' : 'pass') + '">'
      + '<div class="name">Reward-circuit proximity' + infoButton('depReward') + '</div>'
      + '<div class="verdict">' + (reward ? reward.value.toFixed(3) : '\u2014') + '</div>'
      + '<div class="why">' + (reward
        ? escapeHtml(reward.target.gene + ' via ' + reward.nearest.name)
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
  const tree = metabolismFor(record);
  const limit = Number(document.getElementById('met-count').value);
  const toxOnly = document.getElementById('met-toxonly').checked;
  const byId = new Map();
  tree.nodes.forEach((node) => byId.set(node.id, node));

  const openSites = smartsMatches(compileSmarts('[cH]'), record.mol, {}).length;
  const newFlags = new Map();
  tree.metabolites.forEach((node) => node.newTox.forEach((row) => {
    if (!newFlags.has(row.name)) newFlags.set(row.name, row);
  }));
  const leading = tree.routes.length ? tree.routes[0] : null;

  document.getElementById('met-summary').innerHTML = tree.metabolites.length
    ? tree.metabolites.length + ' metabolites within ' + tree.depth
      + (tree.depth === 1 ? ' generation' : ' generations') + ', from ' + tree.rulesTried
      + ' reaction rules: ' + tree.phaseI + ' phase I, ' + tree.phaseII + ' phase II'
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
      + '<td>' + node.score.toFixed(3) + '</td>'
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
  ['met-depth', 'met-phase', 'met-count', 'met-toxonly'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
      if (records[current]) renderMetabolism(records[current]);
    });
  });
  [['met-depth', 'metDepth'], ['met-phase', 'metPhaseFilter'], ['met-count', 'metCount']].forEach(([id, key]) => {
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
  ['sim-method', 'sim-metric', 'sim-count'].forEach((id) => {
    document.getElementById(id).addEventListener('change', () => {
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

function renderBatch() {
  const table = document.getElementById('batch');
  table.querySelector('thead').innerHTML = '<tr>' + BATCH_COLUMNS.map(([key, label]) => (
    '<th>' + label + infoButton(key) + '</th>'
  )).join('') + '</tr>';
  table.querySelector('tbody').innerHTML = records.map((record, index) => {
    const row = batchRow(record);
    return '<tr data-index="' + index + '">' + BATCH_COLUMNS.map(([, , get]) => (
      '<td>' + escapeHtml(get(row)) + '</td>'
    )).join('') + '</tr>';
  }).join('');
}

function exportCsv() {
  const header = ['name', 'smiles'].concat(BATCH_COLUMNS.map(([key]) => key));
  const lines = [header.join(',')];
  records.forEach((record) => {
    const row = batchRow(record);
    const cells = [record.name, record.smiles].concat(BATCH_COLUMNS.map(([, , get]) => String(get(row))));
    lines.push(cells.map((cell) => '"' + String(cell).replace(/"/g, '""') + '"').join(','));
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
  const saved = localStorage.getItem('molecule-profiler-theme');
  if (saved) document.body.dataset.theme = saved;
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const next = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = next;
    try { localStorage.setItem('molecule-profiler-theme', next); } catch (error) { /* private mode */ }
    if (records.length) renderCurrent();
  });
}

document.getElementById('run').addEventListener('click', analyse);
document.getElementById('clear').addEventListener('click', () => {
  document.getElementById('smiles-input').value = '';
  document.getElementById('results').hidden = true;
  document.getElementById('status').textContent = '';
  document.getElementById('export').disabled = true;
  records = [];
});
document.getElementById('export').addEventListener('click', exportCsv);
document.getElementById('smiles-input').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) analyse();
});
document.getElementById('molecule-tabs').addEventListener('click', (event) => {
  const button = event.target.closest('[data-index]');
  if (!button) return;
  current = Number(button.dataset.index);
  renderCurrent();
});
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
setupAlerts();
setupTox();
setupMetabolism();
document.getElementById('smiles-input').value = 'aspirin, CC(=O)Oc1ccccc1C(=O)O';
analyse();
