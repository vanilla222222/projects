'use strict';
// Append-only curation notes; an evidence guard is not an identity repair.
const REFERENCE_REVIEWS={schemaVersion:1,decisions:[
 {id:'identity:Fenoldopam',status:'guarded_unresolved',history:[{date:'2026-10-25',event:'Legacy namesake graph mismatch documented. Source-verified DRD1 evidence is attached only to the exact source graph; the legacy graph remains flagged.',reference:'NAMED-FAMILY-PHARMACOLOGY.md'}]},
 {id:'identity:SCH-23390',status:'guarded_unresolved',history:[{date:'2026-10-25',event:'Legacy namesake graph mismatch documented. The exact source form is indexed separately as SCH 23390; no new source action is assigned to the mismatching legacy graph.',reference:'NAMED-FAMILY-PHARMACOLOGY.md'}]},
 {id:'identity:SKF-38393',status:'guarded_unresolved',history:[{date:'2026-10-25',event:'Legacy namesake graph mismatch documented. New source evidence remains on the existing exact source graph under its stable systematic key.',reference:'NAMED-FAMILY-PHARMACOLOGY.md'}]},
 {id:'identity:Valsartan',status:'guarded_unresolved',history:[{date:'2026-10-25',event:'Stereo/tautomer representation disagreement documented. Source evidence remains on CHEMBL1069. An alternative tetrazole tautomer does not imply a different substance; unspecified stereo does not establish the source enantiomer.',reference:'NAMED-FAMILY-003.md'}]},
 {id:'action:Quetiapine:HTR2A:Homo sapiens',status:'scoped_unresolved',history:[{date:'2026-10-25',event:'Source snapshot contains Full agonist and Antagonist classifications. Batch 004 selected only the unambiguous DRD2 and HRH1 rows. No adjudication of the HTR2A disagreement is claimed; imported rows remain visible.',reference:'NAMED-FAMILY-004.md'}]}
]};
if(typeof globalThis!=='undefined')globalThis.REFERENCE_REVIEWS=REFERENCE_REVIEWS;
if(typeof module!=='undefined')module.exports={REFERENCE_REVIEWS};
