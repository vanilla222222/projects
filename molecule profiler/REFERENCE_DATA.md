# Reference Explorer and library integrity

The main application links to `reference-explorer.html`.

## What it does
- Searches a curated set of signalling reference profiles.
- Shows library name, SMILES, formula, category and descriptive biological context.
- Labels the context as **not** experimental receptor-affinity evidence.
- Offers external *search* links to PubChem and IUPHAR; these are not verified record-level citations.
- Audits exact duplicate names, exact duplicate SMILES, missing formulas and missing SMILES.
- Reports target annotation coverage, missing target-ligand names, and reference profiles without a matching library entry.
- Exports a JSON audit and compares key counts against `data/reference-audit-baseline.js`.

## Automated check

From `molecule profiler/`, run:

```sh
node tools/reference-audit-test.js
```

This is a data-integrity regression check, not molecular graph canonicalization, pharmacology validation or a measurement accuracy benchmark.

## Important limitations
1. The library's previously blank formula fields were backfilled from SMILES-derived atom counts. These calculations are not independently verified against external compound identities.
2. Two different SMILES can encode the same molecule. Exact-string duplicate checks do not catch those cases.
3. Biological roles in `data/signalling-profiles.js` are contextual summaries, not individual measured affinity claims.
4. Source search links are not provenance. A future curated identifier table should record exact PubChem CID, source URL, accessed date, and the claim supported.
5. A sparse target means fewer than three *listed* ligands in the local data; this does not imply the target has few ligands in reality.
6. A passing audit does not mean a molecule is safe, active or synthesizable.

## RDKit independent structure audit\n\nRun `python tools/rdkit-library-audit.py --output rdkit-audit.json` after installing RDKit. The read-only audit reports invalid SMILES, mismatched formulas, canonical isomeric-SMILES duplicates, tautomer groupings, unspecified stereocenters, charged molecules and disconnected fragments. Its full JSON report is also uploaded by `.github/workflows/rdkit-structure-audit.yml`.\n\nA canonical duplicate is not automatically a data error: multiple legitimate names can refer to one structure. A tautomer match does not establish equivalent experimental behavior. A missing stereochemical assignment can be intentional for mixtures or racemates. Review each flagged case before editing the library.\n\n## Next verification milestones
- Independently validate library structures with RDKit and canonicalize isomeric SMILES.
- Resolve and verify molecular formulas against a reliable compound identifier source.
- Attach source-level provenance to each biological relationship.
- Measure retrieval performance on held-out, experimentally characterized data.

## Local validation when GitHub Actions is unavailable

From `molecule profiler/`, run `node tools/run-validation.js` to execute seven JavaScript regression scripts and receive an aggregated exit status. For independent chemical-structure checking, install RDKit and run `python tools/rdkit-library-audit.py --output rdkit-audit.json`. Inspect the generated JSON rather than automatically rewriting reference data.

The GitHub Actions workflows were observed to fail on 2026-10-19 with zero reported job steps and unavailable logs. This is **not** evidence that the regression scripts passed or failed; investigate runner availability, account billing/usage limits, workflow permissions, and GitHub Actions settings before interpreting the failure as a test failure. No browser smoke test has been completed against the latest master.

## Reference library inspector (text-only provenance grouping)

Open `library-inspector.html` from the application header to browse the full structure index. Search by name, class, or molecular formula; filter by collection or class; sort; use pagination; or export a filtered metadata CSV. Filtering does not alter the molecular-analysis or target-reference scoring engines.

Collection membership is inferred **only** from each record's existing `cls` string:

- `ESOL reference` => ESOL-labelled entries (344 at the time of this implementation).
- `Ester reference`, `Ether reference`, `Ketone reference` => homolog-series structural examples (500).
- `Fragment` => fragment examples (74).
- All other class labels => other named/reference entries (not described as independently curated or verified).

These are organizational labels, **not proof** of external provenance, measured properties, canonical uniqueness, or confirmed identity. The inspector's completeness statistics and exact-string duplicate checks do not replace the independent RDKit audit. The main similarity search intentionally retains all parsed structures but explicitly discloses their mixed provenance; selecting "All parsed entries" now shows every result instead of a historical 596-row cap.

Run `node tools/library-catalog-test.js` or the aggregate `node tools/run-validation.js` to check the index grouping and search behavior. No chemistry predictions are added here.
