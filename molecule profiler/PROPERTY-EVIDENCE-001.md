# Experimental property enrichment: FreeSolv batch 001

Twelve existing source graphs now carry experimental hydration free-energy
observations, their source-listed uncertainties, primary DOI references and
explicit missing experimental conditions. The exact graphs map to thirteen
existing library keys: Acetone and methyl methyl ketone share one source graph.
No structures, stable keys, target panels or pharmacological actions are added.

The source is FreeSolv `database.txt` at commit
`134cd763f95d54d818fc0618095aa01cbe470fc3`, Git blob
`6c6dbf5d27e646db5a540288ece636f9c915f363`. The byte-exact source table and its
README are retained under `validation/sources/`; the selected rows and explicitly
RDKit-derived identity witnesses are pinned by `freesolv-properties-001.json`.
The importer verifies the upstream Git blob identities before generating entries.

Included compounds: Toluene, benzonitrile, Cyclohexane, Pyridine, Chloroform,
1-Propanol, Acetone, Aniline, Ethyl acetate, Anisole, 2-Propanol and acetonitrile.
Only the experimental value and uncertainty columns are imported as measurements;
the GAFF calculated values and uncertainties are not substituted for them.

Eleven rows carry an assigned default uncertainty of 0.60 kcal/mol. Toluene
carries a literature-suggested estimate of 0.20 kcal/mol. Neither is relabeled
as an experimental SD. Experimental temperature and pH are absent on these rows
and remain unknown. Simulation conditions are not used to fill those gaps.
Hydration free energy describes transfer into water under the dataset convention;
it is not solubility, logP/logD, pKa, receptor affinity or permeability.

The official licensing statement at separately retained revision
`6c7d19b4b565537365ffd22006aa2cd4643200c6` states CC BY 4.0 for data to the extent
the maintainers can license it, with possible original-source restrictions.
That 2026 statement is kept separate from the 2017 data revision and its README.
Upstream attribution and primary-study references remain attached to each row.

## Reproduce and verify

```sh
python -B tools/import-freesolv-properties.py --check
python -B tools/freesolv-properties-test.py
node tools/property-evidence-test.js
python -B tools/repin.py --report validation/property-enrichment-validation.json
```

The importer is offline, checks exact existing graph/formula agreement and refuses
to create a missing structure. Its tests also reject source tampering and graph
mismatches. Dossiers and comparisons distinguish property conditions from assay
species/host fields, expose assigned uncertainty without displaying it as SD,
and link to the primary experimental reference. Property-only evidence remains
excluded from receptor inference and potency/cliff comparisons. A historical
matched-pair fixture protects the original 107 graphs and 647 relations while
allowing newly curated graphs to participate in structural comparisons.
