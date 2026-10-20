# Receptor reference scaffold diversity

The 50-profile goal measures source-linked coverage. Fifty close analogues need
not span fifty chemical scaffolds. The separate
[`validation/receptor-scaffold-diversity.json`](validation/receptor-scaffold-diversity.json)
snapshot describes ring-scaffold concentration for every catalog record. The
explorer offers the snapshot as a JSON download.

## What is counted

The audit uses only valid, linked, non-stale evidence records included by the
coverage API. It excludes legacy ligand names without qualifying source-linked
graph identities. Aliases and repeated evidence for one audited profile count
once within a receptor. Shared profiles can appear at several receptors.

RDKit independently recomputes each profile identity after uncharging and
canonical tautomer grouping, with stereochemistry retained for profile identity.
An incomplete enumeration or identity mismatch fails the audit. It then extracts
the Bemis-Murcko ring/linker scaffold. Atom and bond types are retained; scaffold
stereochemistry and isotopic labels are omitted. Scaffold counts are therefore
representation-dependent, not a universal measure of chemical diversity.

Acyclic profiles have no Murcko ring scaffold. They are reported separately,
rather than treating all acyclic molecules as a shared scaffold.
`largestRingScaffoldFractionOfRingProfiles` uses only profiles with a ring
scaffold as its denominator; it is null when that denominator is zero.

These counts do not measure potency, functional mechanism, assay independence,
selectivity, prediction confidence or clinical applicability. A high scaffold
count does not establish a validated model. The method applies no similarity
cutoff or activity extrapolation.

## Reproduction and freshness

Requires Node and RDKit. Run from the project directory:

```sh
python -B tools/receptor-diversity-test.py
python -B tools/receptor-diversity-audit.py --output validation/receptor-scaffold-diversity.json
node tools/receptor-diversity-report-test.js
```

The snapshot records the RDKit version and SHA-256 hashes of its source datasets,
coverage logic and audit tool. Source changes during the audit fail closed. The
Node regression suite rejects a stale snapshot and checks that profile totals
match current coverage. The independent chemical examples test substituent
series, heterocyclic scaffold distinctions, acyclic structures, charge aliases,
stereoisomers, invalid graphs and tampered identity keys.

Regenerate the snapshot whenever its source inputs change. The download is a
stored audit snapshot; the browser does not perform RDKit scaffold analysis.

## Method source

RDKit's official scaffold implementation and API documentation:
https://www.rdkit.org/docs/source/rdkit.Chem.Scaffolds.MurckoScaffold.html

## Fourth-batch snapshot

These are descriptive counts from the committed source snapshot.

| Receptor | Sourced profiles | Ring scaffolds | Acyclic profiles | Largest ring-scaffold group |
| --- | ---: | ---: | ---: | ---: |
| DRD1 | 50 | 22 | 0 | 16 |
| DRD2 | 50 | 28 | 0 | 6 |
| DRD3 | 50 | 27 | 0 | 6 |
| DRD4 | 50 | 25 | 0 | 9 |
| HTR1E | 4 | 3 | 0 | 2 |
| HTR1F | 26 | 15 | 0 | 6 |
