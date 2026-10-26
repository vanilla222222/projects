# Updating reference counts and provenance

`data/reference-audit-baseline.js` is the shared generated count snapshot. Raw
library tests, identity-correction tests and the structure-worker scan use this
file. It separately records the base library, composed overlay, base targets,
composed panels and lookup-only panels. `sparseTargets` retains the audit's
explicit definition: fewer than three listed ligand names; it is not the
50-profile source-qualification goal.

After a reviewed reference addition, activate the Python environment with the
project's RDKit version and run one command from this directory:

```sh
python -B tools/repin.py --report validation/reference-update-validation.json
```

This rebuilds the fingerprint version, descriptive tags and family coverage,
curated overlay, receptor tags, local ChEMBL-entry descriptors, structural motifs, matched pairs, release
snapshots, receptor diversity and coverage, shared counts and retrieval benchmark
in dependency order. It then checks the current source pins and runs **every
script registered in `tools/run-validation.js`**. The report records individual
outcomes and the source digest before and after validation. A nonzero exit or
source change means the validation is not green.

Inspect the order without changing files:

```sh
python -B tools/repin.py --plan
```

Check current pins and run full validation without rebuilding datasets:

```sh
python -B tools/repin.py --check --report validation/reference-check-validation.json
```

`--no-validation` explicitly skips the full suite. Its success means the pin
checks passed, not that all validation passed. Python 3 is needed for the
orchestration tests; the rebuilding steps also need RDKit. The environment's
Python can be selected for the Node suite with `MOLECULE_PROFILER_PYTHON`.

## Source checks that must not be bypassed

The name-witness owner only accepts an append-only named extension: every
previous entry must be unchanged and additions must introduce no new CHEMBL-ID
naming candidates. The command uses the recorded audited base when available;
`--name-base <full-audited-commit>` can select an audited library explicitly.
Changed old structures or new identifier naming candidates require the full
name-curation workflow first. Neither the orchestrator nor the baseline writer
repairs duplicate names, missing structures/formulas or unresolved ligand links
by changing their expected values.

Historical source, assay and identity snapshots are immutable evidence. Their
hashes are checked by their existing owner builders, not replaced to make a
changed source pass. Release history also remains an explicit editorial choice:
the command rebuilds the existing list and stops if it violates the rule that
only the newest snapshot may use the working tree. Pin earlier releases to their
actual published commits before adding another working-tree release.

The command stops on the first builder failure. Earlier completed generated
outputs may remain; inspect them, correct the source issue and rerun. No commit,
push, release-history edit or scientific review decision is performed by the
command itself.
