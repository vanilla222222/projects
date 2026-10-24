# Analogue engine

The analogue creator makes deterministic, bounded single-site structural edits without a named-molecule allowlist. It does not predict potency, target affinity, biological equivalence, prodrug release or a synthetic route.

Eleven explicit families cover aromatic CH substituents, aromatic CH-to-N changes, terminal halogen exchanges, alcohol/phenol O-alkylation, non-amide amine N-alkylation, methoxy chain extension, selected alcohol/thiol replacements, ether O-to-S replacement, carboxylic-acid ester variants, carbonyl O/S exchange and aromatic NH alkylation. Charged amine edits retain the input charge. Acid ester variants are structural analogues here; no biological prodrug status is assigned.

Inputs must be one supported closed-shell component with at most 120 atoms. Disconnected salts are not silently normalized. Each candidate must pass the browser chemistry screen, serialization round-trip and exact-graph duplicate checks. Candidates are limited to 160 atoms, 100 results and 400 edit attempts per enumeration. Isotope-labelled atoms are retained; element replacement at an isotope-labelled atom is excluded. Specified edit-site stereocentres are excluded; new stereochemistry is unassigned. Unresolved parent stereo serialization stops generation rather than dropping the labels.

`AnalogueCandidates.generate(parent, {limit, atom, families})` supports an original-input atom filter and selected family IDs. Defaults request 25 designs. Families are interleaved to keep aromatic edits from consuming the entire batch before compatible ether or amine edits are visited. Larger deterministic batches retain the original prefix. Coverage metadata records matching edits, attempts, duplicates and exhaustion; a shortfall is not filled with unsupported designs.

`node tools/analogue-candidates-test.js` tests the browser engine. With RDKit installed, `python tools/analogue-rdkit-test.py` independently sanitizes the exported designs, checks canonical graph uniqueness, and rebuilds each intended edit from its parent to verify isotope/stereo identity. The 30-input regression set currently checks 635 designs with RDKit 2026.09.1. These are structural validation results, not experimental validation of chemistry or biology.

## Comparison workspace

The browser workspace compares each design with its analyzed input using existing descriptors: formula, MW, WLOGP, TPSA (including supported sulfur/phosphorus contributions), ESOL log S, donors/acceptors, rings, rotatable bonds, charge and fraction Csp³. Local stereo-aware ECFP4s Tanimoto is a resemblance score, never a potency or target prediction. Missing calculations remain unavailable. The passive BBB screen in the selected-design detail is not measured penetration.

Choose an edit family and original-input atom, then **Generate set**. Draft generation settings do not silently alter an existing batch. Incompatible site choices are disabled for the selected family. **Generate 5 more** extends the same deterministic settings to a maximum of 100 designs when coverage remains; exhausted sets are not padded. A new input cancels queued generation and resets generation settings.

Search and property bounds filter the generated result set; sorting and table/structure-grid pagination operate on the entire filtered set. **Clear result filters** restores an unfiltered result view. Inspect a design to compare its properties and structures with the input; only the original-input edited atom is highlighted because candidate SMILES atom numbering may differ. The Analyze button starts a separate current analysis. The all-SMILES download exports the generated set, independent of result-view filters.

`tools/analogue-workbench-test.js` and `tools/analogue-ui-test.js` cover calculated deltas, similarity, missing values, property filters, family/site controls, pagination, extension, exhaustion and stale-job clearing. The full app smoke checks compatibility with the prodrug, notebook and Python modules.
