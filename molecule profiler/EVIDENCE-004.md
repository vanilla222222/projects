# Measured properties, IUPHAR endpoints and canonical action claims

This batch adds 60 experimental hydration free-energy observations to existing
named library graphs. The selection is explicit in
`tools/import-freesolv-properties-002.py`; snapshot 002 retains exact source
rows and derived identity witnesses from the already pinned FreeSolv table.
No structures or target associations are added. Existing names and preferred
display labels are preserved. Current class and source-action tags remain
attached through exact graph matching.

Experimental value and uncertainty columns are retained separately from GAFF
calculations. Fifty-five uncertainties are source-assigned defaults and five
are source-reported estimates. Defaults are not uniformly 0.60 kcal/mol and
are never relabeled as SD. Missing experimental temperature and pH stay unknown.
Hydration free energy is not solubility, pKa, logP/logD or permeability.

Seven selected rows cite the unresolved literal `SAMPL4_Guthrie`; the importer
retains that label without inventing a DOI. A row with two DOI references keeps
both. The dataset revision, upstream Git blob, byte hashes and separately dated
licensing observation are pinned without rewriting earlier evidence batches.

IUPHAR dossiers now expose literal source medians, high/low endpoints and
original concentration fields, including their original relation where given.
The retained subset has 1,890 rows with a source median or range, including
523 with original nM endpoints. Source high/low labels are not sorted or
converted: their numeric direction can change between concentrations and
logarithmic scales. Missing relations are not replaced with equals signs.
These source ranges are not SDs or confidence intervals. Action classifications
do not become measured functional responses merely because a source row also
contains an affinity or potency value.

The existing 2,029 source associations also retain raw interaction witnesses,
validated PubMed links, external source URLs and patent identifiers. There are
707 distinct PubMed identifiers across 1,856 cited rows. Publication links point
to source literature; they do not represent new independent replications.

One shared canonical-action helper now serves claim tracing and review
candidates. Audited action arrays take precedence over raw tokens, fixing claims
such as positive/PAM, negative/NAM, inhibition/inhibitor and none/channel blocker.
Literal source wording remains visible. Binding and property observations cannot
create action claims. Full-agonist aliases and redundant parent labels are
deduplicated within a witness; distinct directional reports across witnesses
remain review candidates with their original target/species and source context.
Generic modulation alone does not conflict with an explicitly reported PAM.

Reproduce through the two batch import checks, native source tests, registered
Node validation scripts and `tools/repin.py`. Historical source snapshots remain
immutable. The new property release is pinned to its actual published commit.
