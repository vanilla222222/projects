# ChEMBL-derived reference data

Imported binding-reference data are from **ChEMBL_37** (EMBL-EBI), released
2026-05-01: https://www.ebi.ac.uk/chembl/ . The source version and retrieval times
are retained in `validation/chembl-receptor-binding-batch.json`,
`validation/chembl-receptor-binding-batch-2.json`,
`validation/chembl-receptor-binding-batch-3.json`,
`validation/chembl-receptor-binding-batch-4.json`,
`validation/chembl-receptor-binding-batch-5.json`, and
`validation/chembl-receptor-binding-batch-6.json`. Per-record release provenance
is retained in the published ligand annotations.

The imported subset and adaptations of it are redistributed under the
**Creative Commons Attribution-ShareAlike 3.0 Unported** license:
https://creativecommons.org/licenses/by-sa/3.0/ .

This subset comprises the source records, selected molecule structures,
ligand–target associations and binding-only annotations identified in the batch
snapshot and `data/receptor-ligand-annotations.js`. Molecule Profiler filters
source records, groups alternative graph representations for coverage counting,
reuses matching library names, calculates formulas with RDKit, and formats
records for browser use. Assay descriptions and standardized binding values
retain their ChEMBL provenance. Source assay/document links accompany every
imported annotation. Proprietary calculated ligand-efficiency fields are not
included in the selected-record snapshot.

Source data and curation documentation:
- https://chembl.gitbook.io/chembl-interface-documentation/
- https://chembl.gitbook.io/chembl-interface-documentation/frequently-asked-questions/general-questions

These are curated database observations, with their original experimental and
curation limitations. The import adds no claim of independent remeasurement,
functional action, selectivity, safety or clinical efficacy.

Additional ChEMBL preferred-name labels in `data/library-names.js` retain direct
source links and the same ChEMBL attribution. `validation/library-name-provenance.json`
records the naming lookups separately, including retrieval timestamps and
source graph checks. PubChem-derived name labels are identified separately.

The dossier projection retains standardized and original reported binding fields
separately, with activity, assay, target, molecule and document identifiers and
the retained snapshot's SHA-256 and record location. A standardized result is a
ChEMBL curation output; it is not a new experimental measurement. Source graphs
that disagree with the complete stored graph cannot transfer numerical binding
observations to that graph.

`data/chembl-properties.js` contains **locally calculated RDKit descriptors** of
existing ChEMBL-annotated library graphs. These are not ChEMBL-reported properties
or experimental measurements. The generated dataset records the RDKit version,
descriptor methods and current input hashes. Calculations retain the entire
stored graph, formal charge and disconnected fragments; they do not substitute
a neutralized or salt-stripped parent. These descriptors establish no pKa,
solubility, functional action, selectivity or clinical effect.
