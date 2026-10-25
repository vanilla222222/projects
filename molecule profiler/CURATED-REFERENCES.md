# Curated reference collections

Each JSON in `data/curated-reference-entries/` is one reviewed reference entry,
committed with its feature batch, compiled index and validation report. Entries can
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

## Pharmacology assignment and family labels

[Family batch 003](NAMED-FAMILY-003.md) adds adenine ribonucleosides,
thiazolidinediones, benzhydrylpiperazines, dibenzocycloheptene-related cores and
ortho-biphenyltetrazoles, with 18 human source action classifications. Inverse
agonism remains distinct from antagonism, and nuclear receptor identity is
retained. Source stereo/tautomer differences are flagged for identity review.

[Additional named families](NAMED-FAMILY-PHARMACOLOGY.md) supply five new
structural filters and 19 human receptor action assignments from the pinned
IUPHAR snapshot. These are explicitly labeled curated action classifications,
with raw source witnesses in the receptor explorer and exports. They are
separate from the measured functional assay records and do not inflate the
strict binding-profile quota. Three legacy benzazepine namesake graph conflicts
are flagged; only exact source graphs receive the action assignment.

New named ligand entries are admitted to the pharmacology reference set only
when a linked source reports a target/action or assay observation. Structural
family membership alone never creates an action, affinity, selectivity or
ranking association. The 2026 family batch adds six references with published
mu-opioid receptor agonist observations. All six have explicit human MOR assay
evidence and can support human target retrieval. The Brorphine full paper
specifies human MOR in HEK293T cells; its beta-arrestin2 and mini-Gi EC50 values
are retained separately with confidence intervals. Reported EC50 values remain assay-specific functional endpoints and
are not treated as Ki or Kd. Salt form, assay, species and uncertainty are
retained where reported.

Identity fields and functional pharmacology have separate source snapshots.
No identity-only metabolites were added to this batch. This avoids presenting a
name/structure record as pharmacological evidence.

## Sources and attribution

The [2C study collection](TWO-C-REFERENCES.md) adds 30 named references and 32
human 5-HT2A functional observations across three complete selected study
cohorts. It preserves partial agonism, EC50, Emax, SD, original units and the
distinction between human receptor and mouse host cells. Its primary-figure
identity transcriptions explicitly label RDKit-derived identifiers; they do not
claim an independent registry confirmation.

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
- Named nitazene and Brorphine identity fields: exact supplier or PubChem
  records are linked per compound, with canonical identifier and formula
  checks; these database identity fields are not treated as pharmacology.
  Functional assay observations are separately attributed to the cited primary
  studies, with selected rows and snapshot hashes in
  `validation/sources/named-family-pharmacology-001.json`. Only the limited
  identity and assay fields used by the reference are retained; no synthesis,
  dose or clinical-effect claims are imported.
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

The compiler checks full stored InChIKeys, source-provided keys when available,
formula, reviewed source graph matching,
browser parser/serializer stereo round trips, and input/output hashes. It never
strips salts, invents stereochemistry, enumerates analogues or infers activity.
Raw source fields remain available in the per-entry JSON for review.

See [named family batch 004](NAMED-FAMILY-004.md) for four additional filters and 14 human action classifications across six exact-source identities.
