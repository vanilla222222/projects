'use strict';
// Educational reference metadata, not measured affinities or target annotations.
// Stable IDs use the library entry name until PubChem CID mappings are verified.
// Source links are search endpoints, NOT evidence that a particular interaction exists.
const SIGNAL_REFERENCE_PROFILES = [
  {name:'Acetylcholine',group:'Classical neurotransmitter',role:'Cholinergic signalling',systems:['Nicotinic acetylcholine receptors','Muscarinic acetylcholine receptors']},
  {name:'GABA (gamma-aminobutyric acid)',group:'Classical neurotransmitter',role:'Major inhibitory signalling in the mature CNS',systems:['GABA-A receptors','GABA-B receptors']},
  {name:'Glutamic acid',group:'Classical neurotransmitter',role:'Major excitatory signalling in the CNS',systems:['AMPA receptors','NMDA receptors','Kainate receptors','Metabotropic glutamate receptors']},
  {name:'Glycine',group:'Classical neurotransmitter',role:'Inhibitory neurotransmission and NMDA co-agonism',systems:['Glycine receptors','NMDA receptor co-agonist site']},
  {name:'Dopamine',group:'Classical neurotransmitter',role:'Catecholamine signalling',systems:['D1-like dopamine receptors','D2-like dopamine receptors']},
  {name:'Serotonin',group:'Classical neurotransmitter',role:'Serotonergic signalling',systems:['Serotonin receptor families','Serotonin transporter']},
  {name:'Noradrenaline (norepinephrine)',group:'Classical neurotransmitter',role:'Adrenergic signalling',systems:['Alpha adrenergic receptors','Beta adrenergic receptors']},
  {name:'Adrenaline',group:'Classical neurotransmitter',role:'Adrenergic signalling',systems:['Alpha adrenergic receptors','Beta adrenergic receptors']},
  {name:'Histamine',group:'Classical neurotransmitter',role:'Histaminergic signalling',systems:['Histamine H1–H4 receptors']},
  {name:'Adenosine',group:'Neuromodulator',role:'Purine neuromodulation',systems:['A1, A2A, A2B and A3 adenosine receptors']},
  {name:'Adenosine triphosphate (ATP)',group:'Signalling mediator',role:'Purinergic extracellular signalling',systems:['P2X and P2Y receptors']},
  {name:'D-Serine',group:'Neuromodulator',role:'NMDA receptor co-agonist',systems:['NMDA receptor co-agonist site']},
  {name:'Taurine',group:'Neuromodulator',role:'Inhibitory and osmotic signalling roles',systems:['Glycine and GABA-related signalling; context dependent']},
  {name:'Anandamide',group:'Lipid mediator',role:'Endocannabinoid signalling',systems:['Cannabinoid CB1 and CB2 receptors']},
  {name:'2-Arachidonoylglycerol',group:'Lipid mediator',role:'Endocannabinoid signalling',systems:['Cannabinoid CB1 and CB2 receptors']},
  {name:'Nitric oxide',group:'Gasotransmitter',role:'Diffusible gaseous signalling',systems:['Soluble guanylyl cyclase']},
  {name:'Carbon monoxide',group:'Gasotransmitter',role:'Endogenous gaseous signalling; context dependent',systems:['Heme-containing signalling proteins']},
  {name:'Hydrogen sulfide',group:'Gasotransmitter',role:'Endogenous sulfur signalling',systems:['Multiple protein targets; context dependent']},
  {name:'Octopamine',group:'Trace amine',role:'Prominent in invertebrate signalling; minor mammalian role',systems:['Trace-amine-associated signalling']},
  {name:'Tyramine',group:'Trace amine',role:'Trace amine signalling',systems:['Trace amine-associated receptor pathways']},
  {name:'Phenethylamine',group:'Trace amine',role:'Endogenous trace amine',systems:['Trace amine-associated receptor pathways']},
  {name:'3-Methoxytyramine',group:'Signalling-related metabolite',role:'Dopamine metabolite; not a classical neurotransmitter',systems:[]},
  {name:'Metanephrine',group:'Signalling-related metabolite',role:'Adrenaline metabolite; not a classical neurotransmitter',systems:[]},
  {name:'Normetanephrine',group:'Signalling-related metabolite',role:'Noradrenaline metabolite; not a classical neurotransmitter',systems:[]},
  {name:'N-Acetyl-L-aspartate',group:'Signalling-related metabolite',role:'Abundant neuronal metabolite; not established as a neurotransmitter',systems:[]},
  {name:'Oleoylethanolamide',group:'Lipid mediator',role:'Lipid signalling mediator; not a classical neurotransmitter',systems:[]},
  {name:'Palmitoylethanolamide',group:'Lipid mediator',role:'Lipid signalling mediator; not a classical neurotransmitter',systems:[]}
];
if(typeof module!=='undefined'&&module.exports)module.exports={SIGNAL_REFERENCE_PROFILES};
