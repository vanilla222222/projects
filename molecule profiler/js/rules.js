'use strict';

function lipinski(d) {
  const fails = [];
  if (d.mw > 500) fails.push('MW ' + d.mw.toFixed(1) + ' > 500');
  if (d.logp > 5) fails.push('WLOGP ' + d.logp.toFixed(2) + ' > 5');
  if (d.hbd > 5) fails.push('NH+OH ' + d.hbd + ' > 5');
  if (d.hba > 10) fails.push('N+O ' + d.hba + ' > 10');
  return { name: 'Lipinski', allowed: 1, fails, pass: fails.length <= 1 };
}

function ghose(d) {
  const fails = [];
  if (d.mw < 160 || d.mw > 480) fails.push('MW ' + d.mw.toFixed(1) + ' outside 160-480');
  if (d.logp < -0.4 || d.logp > 5.6) fails.push('WLOGP ' + d.logp.toFixed(2) + ' outside -0.4-5.6');
  if (d.mr < 40 || d.mr > 130) fails.push('MR ' + d.mr.toFixed(1) + ' outside 40-130');
  if (d.heavyAtoms < 20 || d.heavyAtoms > 70) fails.push('Atoms ' + d.heavyAtoms + ' outside 20-70');
  return { name: 'Ghose', allowed: 0, fails, pass: fails.length === 0 };
}

function veber(d) {
  const fails = [];
  if (d.rotatableBonds > 10) fails.push('Rotatable bonds ' + d.rotatableBonds + ' > 10');
  if (d.tpsa > 140) fails.push('TPSA ' + d.tpsa.toFixed(1) + ' > 140');
  return { name: 'Veber', allowed: 0, fails, pass: fails.length === 0 };
}

function egan(d) {
  const fails = [];
  if (d.logp > 5.88) fails.push('WLOGP ' + d.logp.toFixed(2) + ' > 5.88');
  if (d.tpsa > 131.6) fails.push('TPSA ' + d.tpsa.toFixed(1) + ' > 131.6');
  return { name: 'Egan', allowed: 0, fails, pass: fails.length === 0 };
}

function muegge(d) {
  const fails = [];
  if (d.mw < 200 || d.mw > 600) fails.push('MW ' + d.mw.toFixed(1) + ' outside 200-600');
  if (d.logp < -2 || d.logp > 5) fails.push('WLOGP ' + d.logp.toFixed(2) + ' outside -2-5');
  if (d.tpsa > 150) fails.push('TPSA ' + d.tpsa.toFixed(1) + ' > 150');
  if (d.rings > 7) fails.push('Rings ' + d.rings + ' > 7');
  if (d.carbons <= 4) fails.push('Carbons ' + d.carbons + ' <= 4');
  if (d.heteroatoms <= 1) fails.push('Heteroatoms ' + d.heteroatoms + ' <= 1');
  if (d.rotatableBonds > 15) fails.push('Rotatable bonds ' + d.rotatableBonds + ' > 15');
  if (d.hba > 10) fails.push('N+O ' + d.hba + ' > 10');
  if (d.hbd > 5) fails.push('NH+OH ' + d.hbd + ' > 5');
  return { name: 'Muegge', allowed: 0, fails, pass: fails.length === 0 };
}

function leadLikeness(d) {
  const fails = [];
  if (d.mw < 250) fails.push('MW ' + d.mw.toFixed(1) + ' < 250');
  if (d.mw > 350) fails.push('MW ' + d.mw.toFixed(1) + ' > 350');
  if (d.logp > 3.5) fails.push('WLOGP ' + d.logp.toFixed(2) + ' > 3.5');
  if (d.rotatableBonds > 7) fails.push('Rotatable bonds ' + d.rotatableBonds + ' > 7');
  return { name: 'Lead-likeness', allowed: 0, fails, pass: fails.length === 0 };
}

function bioavailabilityScore(d) {
  if (d.charge < 0) {
    if (d.tpsa <= 75) return { score: 0.85, reason: 'Anion with TPSA <= 75' };
    if (d.tpsa < 150) return { score: 0.56, reason: 'Anion with TPSA 75-150' };
    return { score: 0.11, reason: 'Anion with TPSA >= 150' };
  }
  const ro5 = lipinski(d);
  if (ro5.fails.length === 0) return { score: 0.55, reason: 'Passes the rule of five' };
  return { score: 0.17, reason: 'Fails the rule of five' };
}

const RADAR_AXES = [
  { key: 'lipo', label: 'LIPO', min: -2, max: 6.5, low: -0.7, high: 5.0, get: (d) => d.logp },
  { key: 'size', label: 'SIZE', min: 0, max: 600, low: 150, high: 500, get: (d) => d.mw },
  { key: 'polar', label: 'POLAR', min: 0, max: 180, low: 20, high: 130, get: (d) => d.tpsa },
  { key: 'insolu', label: 'INSOLU', min: -11, max: 1, low: -6, high: 0, get: (d) => d.logS },
  { key: 'insatu', label: 'INSATU', min: 0, max: 1, low: 0.25, high: 1, get: (d) => d.fractionCsp3 },
  { key: 'flex', label: 'FLEX', min: 0, max: 11, low: 0, high: 9, get: (d) => d.rotatableBonds }
];

function radarProfile(d) {
  return RADAR_AXES.map((axis) => {
    const value = axis.get(d);
    const span = axis.max - axis.min;
    return {
      key: axis.key,
      label: axis.label,
      value,
      fraction: Math.max(0, Math.min(1, (value - axis.min) / span)),
      lowFraction: (axis.low - axis.min) / span,
      highFraction: (axis.high - axis.min) / span,
      inRange: value >= axis.low && value <= axis.high
    };
  });
}

function esolLogS(d) {
  return 0.16 - 0.63 * d.logp - 0.0062 * d.mw + 0.066 * d.rotatableBonds - 0.74 * d.aromaticProportion;
}

function solubilityClass(logS) {
  if (logS > 0) return 'Highly soluble';
  if (logS > -2) return 'Very soluble';
  if (logS > -4) return 'Soluble';
  if (logS > -6) return 'Moderately soluble';
  if (logS > -10) return 'Poorly soluble';
  return 'Insoluble';
}

const EGG_WHITE = { x: 71.051, y: 2.292, rx: 71.051, ry: 4.585 };
const EGG_YOLK = { x: 38.117, y: 3.177, rx: 38.117, ry: 2.837 };

function insideEllipse(ellipse, tpsa, logp) {
  const dx = (tpsa - ellipse.x) / ellipse.rx;
  const dy = (logp - ellipse.y) / ellipse.ry;
  return dx * dx + dy * dy <= 1;
}

function boiledEgg(d) {
  const inYolk = insideEllipse(EGG_YOLK, d.tpsa, d.logp);
  const inWhite = insideEllipse(EGG_WHITE, d.tpsa, d.logp);
  return {
    bbb: inYolk,
    hia: inWhite || inYolk,
    region: inYolk ? 'yolk' : (inWhite ? 'white' : 'outside')
  };
}

function evaluate(input) {
  const logS = esolLogS(input);
  const d = Object.assign({}, input, { logS });
  const filters = [lipinski(d), ghose(d), veber(d), egan(d), muegge(d)];
  const lead = leadLikeness(d);
  return {
    logS,
    solubility: solubilityClass(logS),
    filters,
    lead,
    bioavailability: bioavailabilityScore(d),
    radar: radarProfile(d),
    egg: boiledEgg(d),
    passed: filters.filter((f) => f.pass).length,
    total: filters.length
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    evaluate, lipinski, ghose, veber, egan, muegge, leadLikeness,
    bioavailabilityScore, radarProfile, esolLogS, solubilityClass, boiledEgg, RADAR_AXES
  };
}
