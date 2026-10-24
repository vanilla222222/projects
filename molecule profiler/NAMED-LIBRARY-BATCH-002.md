# Named-library batch 002

This batch adds **5,000 distinct, source-named compounds**, increasing the library from **16,037 to 21,037**. Earlier entries and their order are preserved byte for byte. These are imported identities, not generated analogues. Names include common names, systematic chemical names and authentic research-compound designations; not every name is widely recognizable.

Examples include foscarbidopa, harman, notoamide E, CK-666, tomelukast, egonol and ANA-12. The source selection is spread across established structural motifs before filling remaining capacity with shorter source names. Matching compounds receive the existing structural tags; no new pharmacological function is inferred from those tags.

## Source and attribution

Source: **ChEBI, EMBL-EBI**, curated three-star SDF snapshot **2026-10-06**, under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). [Original download](https://ftp.ebi.ac.uk/pub/databases/chebi/SDF/chebi_3_stars.sdf.gz). Each entry links to its ChEBI record and retains its source ID, snapshot, full InChIKey, license and exact stored SMILES.

`validation/sources/chebi-named-batch-002.json` pins 10,000 selected source candidates from a pool of 22,687 eligible new identities. It records the full-source SHA-256 checksum, source counts, supplied InChI, original supplied SMILES and source formulas. The importer stops at 5,000 accepted records; unused source candidates are not library entries.

## Identity and compatibility checks

- Deduplicate against existing names, preferred names, exact canonical isomeric graphs and full InChIKeys, and within the new batch.
- Require source InChI, source full InChIKey and source formula agreement. Preserve specified stereochemistry without inventing unspecified stereochemistry.
- Accept single-component, closed-shell, unlabelled organic structures within the website's supported elements and 120-atom budget. Salts, net-charged source forms and isotope-labelled variants are excluded; neutral structures can still contain internal formal charges, such as nitro groups.
- Require finite website descriptors, agreement between website/native formulas, and exact graph/stereo plus full-InChIKey agreement after website serialization. Source details that cannot survive the stored representation cause rejection, not silent simplification.
- Independently verify all 5,000 accepted identities and the checksum of the entire preceding library. Refresh structural tags, motif indexes and exact-match receptor classifications. Existing receptor evidence rules remain unchanged.

These checks establish source consistency and software compatibility. They do not establish experimental identity, assay reproducibility, efficacy, current approval or safety. Computed descriptors remain estimates.

## Reproduction

With RDKit and Node installed, run `python tools/import-named-batch-002.py validation/sources/chebi-named-batch-002.json --write` from the app directory against the preceding library state (master commit `aaa634fc07165b533324b68a4937f1895350ff03`); the importer also replaces its own batch deterministically. To reconstruct the source selection, run `python tools/prepare-named-batch-002.py --sdf PATH` against that same preceding library state and the checksum-pinned source SDF.

`validation/named-library-batch-002.json` records source/tool/library hashes, accepted identities, browser round trips and rejection reasons. Run `python tools/named-batch-002-test.py` and `node tools/named-batch-002-catalog-test.js` for identity, earlier-library preservation, lookup, attribution and export checks. Historical import tests continue to check their original batches separately.
