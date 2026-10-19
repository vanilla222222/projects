'use strict';
// Evidence vocabulary used by the reference explorer.
// No measured affinity, source-specific identifier, or activity is asserted here.
const REFERENCE_EVIDENCE_LEVELS = Object.freeze({
  verified: {label:'Source-verified',description:'Specific record independently matched to a stable external identifier and reviewed evidence.'},
  computed: {label:'Computed from structure',description:'A descriptor derived from the submitted molecular graph; not an experimental measurement.'},
  context: {label:'Biological context',description:'Descriptive educational context, not a measured ligand-target interaction.'},
  analogy: {label:'Structural analogy',description:'Similarity to a reference structure; does not establish shared pharmacology.'},
  prediction: {label:'Model prediction',description:'An inferred property requiring validation and an applicability assessment.'},
  unverified: {label:'Unverified library entry',description:'Entry has not been cross-checked against an authoritative external compound record.'}
});
if(typeof module!=='undefined'&&module.exports)module.exports={REFERENCE_EVIDENCE_LEVELS};
