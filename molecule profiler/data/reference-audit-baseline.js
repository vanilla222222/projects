'use strict';
// Baseline refreshed after formula backfill on master, then lowered by two when the
// shuffled ESOL ester block was corrected: two of those rows turned out to name
// compounds the ester reference block already held, so the duplicates were removed.
// Intended for change detection, not an assertion that chemical structures are correct.
const REFERENCE_AUDIT_BASELINE={
  entries:5510,
  missingFormula:0,
  missingSmiles:0,
  duplicateNames:0,
  duplicateExactSmiles:0,
  profiles:27,
  unmatchedProfiles:0,
  targets:150,
  sparseTargets:65,
  unresolvedLigands:0
};
if(typeof module!=='undefined'&&module.exports)module.exports={REFERENCE_AUDIT_BASELINE};
