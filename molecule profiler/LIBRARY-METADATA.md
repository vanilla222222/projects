# Reference names and searchable tags

The reference library now displays sourced chemical names and multiple tags
instead of a single class filter. Name, original identifier, aliases, formula
and tags are searchable. The tag field offers suggestions; selecting a full
tag matches that tag exactly, while an incomplete tag searches tag text.
Click a tag chip to filter; use Clear tag filter to remove it. Sorting supports
name, primary tag, tag count, formula and collection. The first ten tags are
visible, with additional tags available under the expansion control.

## Names and stable identifiers

The library currently contains 4,072 stored structures. Display-name metadata
does not change structures or target/evidence keys. Display
metadata maps names to an original reference key and exact stored SMILES. If
that graph changes, the name/tag overlay is ignored until regenerated. Original
identifiers remain visible and searchable; identical display labels do not
merge reference records. Similarity and receptor evidence views also use the
sourced display labels. Scientific reference keys remain available for tracing
records to their assays and source snapshots.

Of 1,225 ChEMBL-ID-only entries, 1,196 receive sourced names: 1,054 match an exact
isomeric graph in PubChem or ChEMBL, and 142 are explicitly qualified PubChem
standardized-form names. Twenty-nine retain identifiers because no reliable
name mapping was found. Many research molecules have no common drug name, so
the displayed name is a systematic chemical name. Source links accompany the
labels. A source name is not independent experimental identity validation.

PubChem lookups use the full InChIKey. Exact graph matching preserves stereo.
For qualified standardized-form labels, the full key and a completed RDKit
tautomer-family comparison must agree, without neutralization and with
tetrahedral stereo retained. Tautomer-labile bond stereo may differ. These
labels name PubChem's standardized representation, not the exact stored graph;
the distinction is displayed and included in the standalone reference CSV.
The original graph continues to drive analysis. Unmatched or ambiguous records
are not assigned guessed names.

## Tag interpretation

Every entry has at least ten descriptive tags. They include original labels
(explicitly prefixed `Label:`), collection, heavy-atom size, ring-count bin,
aromaticity, stored-graph formal charge, H-bond donor/acceptor bins, rotatable
bond bins and calculated TPSA bins. Functional-group/element motifs and
specified/unspecified stereochemistry add useful tags where present.

These are calculated with RDKit, whose version is recorded in the tag report.
HBD/HBA and rotatable-bond counts follow RDKit's Lipinski implementations; TPSA
is a calculated descriptor. Bin boundaries organize browsing and are not
clinical thresholds, absorption rules or experimental measurements. Stored
formal charge does not establish physiological protonation. Absence of a
stereochemistry tag does not prove a molecule is achiral.

`Binding:` and `Binding family:` tags require a valid, linked binding record
with current library SMILES. They describe source-assay associations, not
agonism, antagonism, selectivity or a prediction for a new molecule. Original
class labels have not been upgraded into experimentally validated activity
tags. Collection labels retain their existing provenance limitations.

## Export and reproduction

The standalone filtered reference-index CSV contains Name, Reference ID, Tags,
Collection, Formula, SMILES, Name form and Name source. It follows the current
filters and sorting and escapes spreadsheet formulas. Names and tag metadata
are separate from chemical structures and assay records.

```sh
python -B tools/curate-library-names.py
python -B tools/build-library-tags.py
python -B tools/library-metadata-test.py
node tools/library-metadata-report-test.js
```

Name curation requires RDKit and network access, or an existing request cache
with `--offline`. The committed name-provenance report retains selected source
responses, request hashes and retrieval times, allowing the Python verification
test to recheck mappings without network access. The tag-provenance report
records its source hashes and generated data hash. The Node regression suite
rejects stale metadata. Browser analysis does not make live naming requests.

Sources:
- https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest
- https://www.ebi.ac.uk/chembl/
- https://www.rdkit.org/docs/

ChEMBL-derived preferred-name labels retain the attribution described in
[CHEMBL-DATA-NOTICE.md](CHEMBL-DATA-NOTICE.md). PubChem labels have their own
direct source links in the metadata and provenance report.

## Receptor action filters

The additional graph-guarded `data/library-receptor-tags.js` dataset adds source-classified receptor/action pairs without altering structural tags. Separate categories expose receptor targets, binding observations, general actions and exact receptor/action pairs across the 146-receptor catalogue. See [receptor tag methods, attribution and limitations](RECEPTOR-TAGS.md). Source classifications and assay measurements are distinct; binding affinity never establishes an action by itself.

The [second 5,000-compound batch](NAMED-LIBRARY-BATCH-002.md) brings the library to 21,037 entries. Source names, original identities and import checks are pinned independently of inferred structural tags.
