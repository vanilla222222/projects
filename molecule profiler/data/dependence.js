'use strict';

const DEPENDENCE = [
  { name: 'Morphine', klass: 'Opioid', liability: 'high', note: 'Mu-opioid agonist; tolerance and a well-described withdrawal syndrome make it the reference case for physical dependence.' },
  { name: 'Codeine', klass: 'Opioid', liability: 'moderate', note: 'Prodrug O-demethylated to morphine by CYP2D6, so the dependence liability is morphine’s, scaled by conversion.' },
  { name: 'Fentanyl', klass: 'Opioid', liability: 'high', note: 'Anilidopiperidine mu agonist, two orders of magnitude more potent than morphine; rapid onset drives the reinforcement.' },
  { name: 'Pethidine', klass: 'Opioid', liability: 'high', note: 'Phenylpiperidine mu agonist with a neurotoxic norpethidine metabolite.' },
  { name: 'Methadone', klass: 'Opioid', liability: 'moderate', note: 'Long-acting mu agonist; the slow pharmacokinetics that make it useful for substitution also blunt the reinforcing peak.' },
  { name: 'Tramadol', klass: 'Opioid', liability: 'moderate', note: 'Weak mu agonist plus monoamine reuptake inhibition; dependence is real but milder than the classical opioids.' },
  { name: 'Dextromethorphan', klass: 'Dissociative', liability: 'low', note: 'Morphinan skeleton without mu agonism; dissociative effects at high dose come from NMDA channel block.' },
  { name: 'Naloxone', klass: 'Opioid antagonist', liability: 'none', note: 'Counter-example: nearly identical to oxymorphone in structure, a competitive antagonist in function, and not reinforcing at all.' },
  { name: 'Naltrexone', klass: 'Opioid antagonist', liability: 'none', note: 'Counter-example: used to treat dependence, not to cause it, despite sitting beside morphine in any fingerprint space.' },
  { name: 'Cocaine', klass: 'Stimulant', liability: 'high', note: 'Dopamine transporter blocker; tropane ester whose rapid brain entry makes the reinforcement intense and short.' },
  { name: 'Amphetamine', klass: 'Stimulant', liability: 'high', note: 'Substrate-type releaser at DAT and NET; reverses transport rather than blocking it.' },
  { name: 'Methylphenidate', klass: 'Stimulant', liability: 'moderate', note: 'Dopamine and noradrenaline reuptake inhibitor; oral pharmacokinetics keep the dopamine rise gradual.' },
  { name: 'Mephedrone', klass: 'Stimulant', liability: 'high', note: 'Substituted cathinone; a beta-keto amphetamine releasing dopamine and serotonin.' },
  { name: 'Methylenedioxymethamphetamine', klass: 'Stimulant', liability: 'moderate', note: 'Serotonin-dominant releaser; compulsive use is less common than with the catecholamine-selective amphetamines.' },
  { name: 'Ephedrine', klass: 'Stimulant', liability: 'low', note: 'Peripherally weighted sympathomimetic with limited central reinforcement.' },
  { name: 'Bupropion', klass: 'Stimulant', liability: 'low', note: 'Counter-example of a sort: a cathinone used as an antidepressant and smoking-cessation aid, with low abuse liability by the oral route.' },
  { name: 'Modafinil', klass: 'Stimulant', liability: 'low', note: 'Weak DAT inhibitor; wake-promoting with much less reinforcement than the amphetamines.' },
  { name: 'Caffeine', klass: 'Stimulant', liability: 'moderate', note: 'Adenosine antagonist, not a monoamine drug, but tolerance and a genuine withdrawal headache syndrome are well documented.' },
  { name: 'Nicotine', klass: 'Nicotinic', liability: 'high', note: 'Alpha4-beta2 nicotinic agonist; indirect dopamine release in the ventral striatum with one of the highest dependence rates of any drug.' },
  { name: 'Diazepam', klass: 'Sedative', liability: 'moderate', note: 'GABA-A positive allosteric modulator; long-term use gives tolerance and a withdrawal syndrome with seizure risk.' },
  { name: 'Lorazepam', klass: 'Sedative', liability: 'moderate', note: 'Shorter-acting benzodiazepine; the faster offset makes interdose withdrawal more noticeable.' },
  { name: 'Alprazolam', klass: 'Sedative', liability: 'high', note: 'Triazolobenzodiazepine with rapid onset and short half-life, the combination most associated with benzodiazepine dependence.' },
  { name: 'Clonazepam', klass: 'Sedative', liability: 'moderate', note: 'Long-acting benzodiazepine; slower onset, same receptor mechanism.' },
  { name: 'Midazolam', klass: 'Sedative', liability: 'moderate', note: 'Imidazobenzodiazepine used for induction; dependence is a question of chronic exposure rather than procedural use.' },
  { name: 'Zolpidem', klass: 'Sedative', liability: 'moderate', note: 'Imidazopyridine selective for alpha1-containing GABA-A receptors; dependence is less frequent but documented.' },
  { name: 'Phenobarbital', klass: 'Sedative', liability: 'high', note: 'Barbiturate acting at the GABA-A chloride channel; withdrawal is more dangerous than benzodiazepine withdrawal.' },
  { name: 'Pentobarbital', klass: 'Sedative', liability: 'high', note: 'Short-acting barbiturate; the narrow margin between sedation and respiratory depression is part of the hazard.' },
  { name: 'Thiopental', klass: 'Sedative', liability: 'moderate', note: 'Thiobarbiturate for induction; redistribution-limited duration rather than low intrinsic liability.' },
  { name: 'Ethanol', klass: 'Sedative', liability: 'high', note: 'Low-affinity, high-occupancy modulator of GABA-A and NMDA; withdrawal can be fatal, which is as physical as dependence gets.' },
  { name: 'Sodium oxybate', klass: 'Sedative', liability: 'high', note: 'GHB, agonist at GABA-B and its own receptor; abrupt withdrawal after heavy use causes delirium.' },
  { name: 'Propofol', klass: 'Sedative', liability: 'moderate', note: 'GABA-A modulator; dependence is documented almost entirely among people with access to it.' },
  { name: 'Gabapentin', klass: 'Sedative', liability: 'low', note: 'Alpha2-delta calcium channel ligand; misuse is mostly in combination with opioids, and withdrawal is mild.' },
  { name: 'Pregabalin', klass: 'Sedative', liability: 'moderate', note: 'More potent alpha2-delta ligand with better absorption than gabapentin, and correspondingly more reported dependence.' },
  { name: 'Ketamine', klass: 'Dissociative', liability: 'moderate', note: 'NMDA channel blocker; tolerance develops quickly and compulsive use is well described, though classical withdrawal is slight.' },
  { name: 'Phencyclidine', klass: 'Dissociative', liability: 'moderate', note: 'NMDA channel blocker with additional dopaminergic action; psychological dependence dominates.' },
  { name: 'Tetrahydrocannabinol', klass: 'Cannabinoid', liability: 'moderate', note: 'CB1 partial agonist; a real withdrawal syndrome of irritability and sleep disturbance follows heavy chronic use.' },
  { name: 'Cannabidiol', klass: 'Cannabinoid', liability: 'none', note: 'Counter-example: the same carbon skeleton as THC without CB1 agonism, and no dependence liability.' },
  { name: 'Mescaline', klass: 'Hallucinogen', liability: 'none', note: 'Counter-example: 5-HT2A agonist phenethylamine with tolerance but no physical dependence or compulsive use.' },
  { name: 'Iodoamphetamine', klass: 'Hallucinogen', liability: 'none', note: 'Counter-example: amphetamine-shaped and 5-HT2A-selective, so close to the stimulants in structure and far from them in liability.' },
  { name: 'Lysergide', klass: 'Hallucinogen', liability: 'none', note: 'Counter-example: profound acute effects, rapid tolerance, and no dependence syndrome.' }
];

const REWARD_TARGETS = ['OPRM1', 'OPRK1', 'OPRD1', 'SLC6A3', 'SLC6A4', 'CHRNA4', 'GABRA1', 'GABBR1', 'GRIN1'];

if (typeof module !== 'undefined' && module.exports) { module.exports = { DEPENDENCE, REWARD_TARGETS }; }
