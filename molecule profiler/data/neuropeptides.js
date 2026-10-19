'use strict';

// Peptide neurotransmitter/neuromodulator reference metadata.
// Sequences are one-letter amino-acid codes, not SMILES. Do not feed these
// directly into the small-molecule fingerprint or molecular formula engine.
// Terminal modifications and disulfide bonds matter for chemical identity.
// Sequence records are for reference/lookup; no receptor affinity is asserted.
const NEUROPEPTIDE_REFERENCES = [
  { name: 'Oxytocin', sequence: 'CYIQNCPLG', cTerm: 'amide', disulfide: [[1, 6]], cls: 'Neuropeptide hormone' },
  { name: 'Arginine vasopressin', sequence: 'CYFQNCPRG', cTerm: 'amide', disulfide: [[1, 6]], cls: 'Neuropeptide hormone' },
  { name: 'Substance P', sequence: 'RPKPQQFFGLM', cTerm: 'amide', disulfide: [], cls: 'Tachykinin neuropeptide' },
  { name: 'Met-enkephalin', sequence: 'YGGFM', cTerm: 'free acid', disulfide: [], cls: 'Opioid neuropeptide' },
  { name: 'Leu-enkephalin', sequence: 'YGGFL', cTerm: 'free acid', disulfide: [], cls: 'Opioid neuropeptide' },
  { name: 'Somatostatin-14', sequence: 'AGCKNFFWKTFTSC', cTerm: 'free acid', disulfide: [[3, 14]], cls: 'Inhibitory neuropeptide' },
];

// This file is intentionally separate from LIBRARY until peptide-aware
// search, depiction, validation, and UI support are implemented.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NEUROPEPTIDE_REFERENCES };
}
