# Property batch three and evidence coverage browsing

This batch adds 100 experimental FreeSolv hydration observations to exact
existing library graphs. Snapshot 003 retains the pinned primary rows, identity
witnesses and explicit selection. Source uncertainties remain unchanged:
95 are assigned defaults and five are source-reported estimates. They are not
SDs. Missing experimental conditions remain unknown. No structures, receptor
associations, preferred names or functional actions are added by the import.

Ten rows retain the unresolved `SAMPL4_Guthrie` label. Another source describes
unpublished Guthrie data and explicitly cites a DOI: its full wording and cited
link remain visible, with an unpublished-data status rather than a claim that
the measurement itself was published there. Earlier source snapshots stay
unchanged. The batch002 importer core is reused through explicit configuration;
all 61 previous batch002 outputs remain byte-identical.

Local calculated descriptors now cover every effective reference graph,
including reviewed replacements and overlay entries. The same nine RDKit
methods describe the complete stored graph, retaining charge and disconnected
components. Dataset input hashes include the raw library, curated projection,
composition helper and ChEMBL associations. ChEMBL IDs are associated metadata,
not a prerequisite for calculation. Historical module names remain compatible.
Calculated descriptors do not become experimental observations, receptor actions
or confirmation of a compound's identity.

The inspector now filters measured physical properties, standardized ChEMBL
binding, functional-assay observations, source action classifications and keys
with no imported observations. Counts describe current exact-graph support;
categories overlap and are not an evidence score. The latter state is a coverage
gap, not inactivity. Calculated descriptors are excluded from measured-property
counts. The same flags appear on rows and in filtered CSV exports. The index
checks stored-SMILES witnesses and avoids rescanning dossier records per keypress.

Dossiers retain every supplied primary reference, deduplicating the singular
legacy field against reference arrays. This repairs the second dimethyl
sulfoxide citation link. ChEMBL journal/year metadata are labeled as source-listed
fields and retain activity/document IDs and snapshot provenance; missing DOI or
PubMed identifiers are not invented.

Validation includes importer byte preservation, exact source-column checks,
native descriptor tests, support-index parity with the complete dossier model,
filtered CSV/DOM checks and the registered full validation suite. Generated
artifacts are rebuilt through `tools/repin.py`, and the property release is
pinned to its actual published commit.
