# Named library batch 001

This batch adds 5,000 named compounds from ChEBI's curated three-star SDF collection. Names and structures are imported, not generated. ChEBI IDs and source links are searchable in the library inspector.

Source: ChEBI, EMBL-EBI, https://ftp.ebi.ac.uk/pub/databases/chebi/SDF/chebi_3_stars.sdf.gz ; snapshot 2026-10-06, retrieved 2026-10-24. Data are licensed CC BY 4.0: https://creativecommons.org/licenses/by/4.0/ . Imported records are selected and reserialized; formulas and descriptive tags are calculated locally. No endorsement is implied.

The importer checks source InChIKeys, exact isomeric graph uniqueness, browser serialization identity and browser/native formula agreement. Unsupported elements, disconnected graphs, open-shell structures and inputs above 120 atoms are excluded. Charges, supplied stereo and isotopes are preserved. These checks establish consistency with the source, not experimental identity or biological efficacy.

Reproduce with `python tools/import-named-batch.py validation/sources/chebi-batch-001.json --write`, then rebuild tags and reference motifs. The pinned source selection and import report retain provenance and exclusion reasons.
