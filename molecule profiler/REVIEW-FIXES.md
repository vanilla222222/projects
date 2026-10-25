# Reference and model review fixes

## Retrieval benchmark and the running app

The app and benchmark use `ReferenceContext.create` to compose the same base
library, reviewed identity corrections, curated structures and target panels.
The benchmark excludes property-only target references, as the app does. Only
listed target references need fingerprinting during benchmark generation.

Nearest-neighbour ties follow the actual app: nearest score, top-three mean,
then original target order. Toy holdouts compare the optimized evaluator against
the app ranking engine across five fingerprints and both metrics, including
shared ligands, aliases, empty sets and singleton panels. Historical cached
score-only evaluation remains available for reproducing older reports.

`data/benchmark.js` carries composition metadata and SHA-256 witnesses for its
input data and ranking implementation. Validation rejects stale source bytes.
The browser withholds numbers on a composition mismatch, another method, or a
filtered target/organism league. Name holdout can retain structural aliases;
the UI labels this limitation. It is not scaffold-held-out or external validation.

Regenerate with `node tools/retrieval-benchmark.js --write` after relevant data or
ranking changes. Run `node tools/reference-context-test.js` and
`node tools/retrieval-evaluate-test.js` to check the source and parity contracts.
