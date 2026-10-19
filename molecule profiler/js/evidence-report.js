'use strict';
// Explanations are computed from existing descriptor outputs, not new trained models.
const PROPERTY_EVIDENCE = Object.freeze([
  { key: 'mw', label: 'Molecular weight', method: 'Atomic-mass sum', tier: 'calculated', unit: 'g/mol' },
  { key: 'tpsa', label: 'Topological polar surface area', method: 'Fragment contribution model', tier: 'calculated', unit: 'Å²' },
  { key: 'logp', label: 'WLOGP', method: 'Wildman–Crippen fragment estimate', tier: 'estimated', unit: '' },
  { key: 'logS', label: 'Aqueous log S', method: 'ESOL empirical regression', tier: 'estimated', unit: '' },
  { key: 'mr', label: 'Molar refractivity', method: 'Wildman–Crippen atom contributions', tier: 'estimated', unit: '' },
  { key: 'hbd', label: 'Hydrogen bond donors', method: 'Graph-based rule count', tier: 'calculated', unit: '' },
  { key: 'hba', label: 'Hydrogen bond acceptors', method: 'Graph-based rule count', tier: 'calculated', unit: '' },
  { key: 'rotatableBonds', label: 'Rotatable bonds', method: 'Graph-based rule count', tier: 'calculated', unit: '' }
]);
function propertyEvidenceRows(d) {
  return PROPERTY_EVIDENCE.map(item => {
    const value = d[item.key];
    return {
      label: item.label,
      value: typeof value === 'number' && Number.isFinite(value) ? Number(value.toFixed(3)) : null,
      unit: item.unit,
      method: item.method,
      tier: item.tier
    };
  });
}
function propertyEvidenceWarnings(d) {
  const warnings = [];
  if (!Number.isFinite(d.mw) || !Number.isFinite(d.tpsa) || !Number.isFinite(d.logp)) warnings.push('A required descriptor is unavailable or non-finite.');
  if (d.charge !== 0) warnings.push('Charged structure: neutral-compound partitioning and solubility estimates may be unreliable.');
  if (d.mw > 700) warnings.push('High molecular weight: empirical solubility model may extrapolate beyond common training chemistry.');
  if (d.logp < -2 || d.logp > 7) warnings.push('Extreme predicted lipophilicity: treat ESOL estimates as low-confidence extrapolations.');
  if (d.heavyAtoms === 0) warnings.push('No heavy atoms found.');
  return warnings;
}
if (typeof module !== 'undefined' && module.exports) module.exports = { PROPERTY_EVIDENCE, propertyEvidenceRows, propertyEvidenceWarnings };
