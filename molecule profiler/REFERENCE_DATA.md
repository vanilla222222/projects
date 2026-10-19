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
1. The existing library contains entries without formulas. Missing formulas are reported rather than silently filled.
2. Two different SMILES can encode the same molecule. Exact-string duplicate checks do not catch those cases.
3. Biological roles in `data/signalling-profiles.js` are contextual summaries, not individual measured affinity claims.
4. Source search links are not provenance. A future curated identifier table should record exact PubChem CID, source URL, accessed date, and the claim supported.
5. A sparse target means fewer than three *listed* ligands in the local data; this does not imply the target has few ligands in reality.
6. A passing audit does not mean a molecule is safe, active or synthesizable.

## Next verification milestones
- Independently validate library structures with RDKit and canonicalize isomeric SMILES.
- Resolve and verify molecular formulas against a reliable compound identifier source.
- Attach source-level provenance to each biological relationship.
- Measure retrieval performance on held-out, experimentally characterized data.
