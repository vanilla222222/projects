# Curated reference collections

Each JSON in `data/curated-reference-entries/` is one reviewed reference entry,
committed separately with its compiled index and validation report. Entries can
be a named ligand, a documented molecular pair, or a measured property record.
Existing exact isomeric graphs are reused. Additional sourced graphs are merged
into the browser library without rewriting historical identities. The existing scaffold audit is refreshed
against its original assay policy; curated panel diversity is reported separately.
When a source graph differs from a legacy namesake, a bracketed source-form label
keeps the two identities visibly distinct.

The inspector exposes collection and target-panel tags and the evidence cards.
The analyzer shows exact-graph records and includes them in its pharmacology
JSON export. Named single-target IUPHAR panels supplement similarity retrieval;
their source classifications do not predict the action of a new query.
Broad receptor assemblies retain source subunit context and do not become
single-gene ranking panels. Existing 50-profile reports describe their original
assay policy; these new classifications do not silently count toward that quota.

The seven collections cover named pharmacology, endogenous signalling, prodrugs,
metabolites, chemical probes and controls, stereochemical comparisons, and
measured properties (overlapping memberships). Controls remain restricted to
their reported target and assay. A censored result such as IC50 >100 µM is
retained as a bound, never an exact measurement or universal inactivity.
Hydration free energies are not solubilities, pKa, logP, logD or permeability.
Missing conditions and source-assigned default uncertainties remain explicit.

## Sources and attribution

- IUPHAR/BPS Guide to PHARMACOLOGY, pinned 2026.3.1 snapshot already in
  `validation/sources/receptor-actions-iuphar.json`, CC BY-SA 4.0.
  Selected raw ligand/interaction rows and snapshot hash accompany each entry.
  Adapted selections and classifications retain CC BY-SA 4.0 attribution.
- DrugCentral, University of New Mexico, 2021-09-01 structures, CC BY-SA 4.0;
  ChEBI, EMBL-EBI, 2026-10-06 structures, CC BY 4.0. These historical identity
  records do not establish current approval or experimental pharmacology.
- SGC chemical-probe pages and linked primary studies: manually transcribed
  factual structure identifiers and limited assay observations, with direct
  source links. No general inactivity or complete selectivity is inferred.
- NCI Drug Dictionary and product labels: relationship-specific sources.
  Product salts and formulations are distinguished from stored parent graphs.
- FreeSolv, Mobley laboratory: selected experimental hydration free-energy
  records, source Git blob pinned per entry; experimental and calculated columns
  remain separate. https://github.com/MobleyLab/FreeSolv,
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Selected records are
  adapted into structured fields; no experimental values are recalculated.

## Offline validation

With RDKit and Node installed, run:

```sh
python tools/build-curated-references.py --check
node tools/curated-references-test.js
node tools/run-validation.js
```

The compiler checks full source InChIKeys, formula, exact graph matching,
browser parser/serializer stereo round trips, and input/output hashes. It never
strips salts, invents stereochemistry, enumerates analogues or infers activity.
Raw source fields remain available in the per-entry JSON for review.
