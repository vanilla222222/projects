'use strict';
// Explain the scope of existing structural screens without adding new alerts.
function toxicityCoverageReport(scan) {
  const groups = (scan && Array.isArray(scan.byEndpoint)) ? scan.byEndpoint : [];
  const hits = (scan && Array.isArray(scan.hits)) ? scan.hits : [];
  return {
    endpointCount: groups.length,
    matchedRules: hits.length,
    screenedRules: scan && Number.isFinite(scan.scored) ? scan.scored : null,
    limitations: [
      'A structural alert is a screening hypothesis, not an observed toxicological outcome.',
      'No matching alert does not demonstrate safety: many toxic mechanisms have no rule in this library.',
      'Pattern matches do not quantify dose, exposure, metabolism, potency or human risk.'
    ]
  };
}
function metabolismCoverageReport(tree) {
  const nodes = tree && Array.isArray(tree.metabolites) ? tree.metabolites : [];
  return {
    predictedProducts: nodes.length,
    capped: !!(tree && tree.truncated),
    rulesAttempted: tree && Number.isFinite(tree.rulesTried) ? tree.rulesTried : null,
    limitations: [
      'Enumerated products are structural possibilities, not experimentally confirmed metabolites.',
      'Reaction-class weights are not measured rates, yields, probabilities or human exposure fractions.',
      'Unmodeled enzymes, stereochemistry, competing pathways and transport can change observed products.'
    ].concat(tree && tree.truncated ? ['Enumeration was capped; this list is incomplete even within the implemented rule set.'] : [])
  };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { toxicityCoverageReport, metabolismCoverageReport };
