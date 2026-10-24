# Named compound expansion

The library now contains **8,476 entries**, including **2,506 additional named
DrugCentral compounds**. These additions come from real source records, not
enumerated analogues or formula-based inventions. Examples include capmatinib,
selpercatinib, bictegravir, risdiplam, ivacaftor and baloxavir marboxil.

Search the [reference library](library-inspector.html) by chemical name, CAS
number, DrugCentral ID or InChIKey. Choose **DrugCentral named compounds** to
browse only the additions. Each imported entry links to its source drug card.
The main analyzer uses the expanded library automatically. Structural similarity
to these compounds does not supply their pharmacology to a generated design.

## Source and attribution

DrugCentral, Division of Translational Informatics, University of New Mexico.
[Download page](https://drugcentral.org/download),
[source structure file](https://unmtid-dbs.net/download/DrugCentral/2021_09_01/structures.smiles.tsv).
The linked structure download is the **2021-09-01 snapshot**, retrieved on
2026-10-24. It is a historical structure collection, not a list of current
approvals or a claim that every entry is used in humans.

DrugCentral makes its database available under
[Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
The imported collection, its pinned source TSV and derived import records are
redistributed under that license, without warranties or implied endorsement.
The application changes this selection by canonicalizing SMILES, recalculating
formulas, adding graph tags, and excluding duplicates and incompatible records.
This notice does not assign DrugCentral's license to unrelated application code.

## Identity checks

Every addition retains its source name, source ID, CAS identifier, InChIKey and
source link. The offline importer verifies the pinned download's SHA-256 and:

1. Rejects missing names, formula-only labels and database-identifier-only labels.
2. Parses structures with RDKit; retains supplied isotopes, charges and stereo.
3. Requires agreement between source SMILES and the full source InChIKey.
4. Excludes exact isomeric duplicates and existing names or sourced display names.
5. Requires browser/native formula agreement and exact isomeric graph agreement
   after browser serialization.
6. Excludes disconnected structures, unsupported elements, open-shell graphs and
   inputs above the 120-atom browser budget. Salt names referring to an omitted
   counterion are excluded rather than renamed or silently simplified.

The import does not neutralize structures, strip salts, enumerate tautomers,
infer missing stereochemistry, invent common names or generate new chemicals.
Existing entries and stable reference keys are preserved. Existing unresolved
legacy entries and illustrative series remain separate from the new collection.

The checks establish consistency with the cited snapshot, not independent
experimental identity, measured ADME, clinical approval, potency or safety.

## Reproduction

With Node and RDKit installed, run from the app directory:

```sh
python tools/import-named-library.py --write
python tools/build-library-tags.py
python tools/named-library-test.py
node tools/library-catalog-test.js
node tools/library-metadata-report-test.js
```

The source is pinned at
`validation/sources/drugcentral-structures-2021-09-01.tsv`.
`validation/named-library-import.json` records all 4,099 source decisions,
including excluded names and reasons. Reimporting the same snapshot is
deterministic. Name-source provenance for existing entries remains unchanged;
only its whole-library freshness hash is updated.
