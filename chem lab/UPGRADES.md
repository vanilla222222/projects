# Chem Lab upgrades

## Validation and synthesis-planning update — 2026-10-22

- **Desktop and mobile browser coverage:** the complete app now has a real
  Chromium test covering all four tabs, route comparisons, responsive layout,
  save/reload, step reordering and revalidation, exports/imports, rule search,
  extended depth settings and an explicit amine-protection route. Mobile means
  touch/viewport emulation, not a physical-device claim. See `tools/README.md`.
- **Sources and scope:** all 105 current rule descriptors have attributable
  reaction-class references and implementation-specific substrate/condition
  limits. Combined-rule branches still state where source coverage is narrower
  than the local model; a source is not validation of the code or query.
- **Independent checks:** the RDKit oracle compares actual exported structures
  and fixed product expectations independently. It found an ionic exact-mass
  omission; exact masses now include the net-charge electron-mass correction.
  The versioned report records fixture and loaded-script hashes.
- **Route comparison:** alternatives are displayed side by side on desktop and
  stacked on mobile, with step/material counts, source coverage, assumptions,
  scope and reported stereo/minor-product concerns. No numerical experimental
  feasibility or yield score is inferred from these counts.
- **Three additional families:** terminal-alkyne hydroboration/oxidation,
  BH3/THF carboxylic-acid reduction, and BBr3 aryl methyl ether cleavage, each with
  bounded scope, negative cases and forward-checked retrosynthesis.
- **Amine protection:** supported conflicts can expand into explicit protect,
  main reaction and deprotect steps. Automatic Boc planning is currently
  restricted to the encoded amine-versus-alcohol acyl-substitution case; each
  operation is independently forward checked. Forbidden reagents/rules and
  inventory checks apply to every substep. Unsupported amine conflicts produce
  an explanation instead of a guessed compatible protection scheme. Planning
  roles and reasons survive workspace JSON and CSV export.
  The forward Grignard, nitrile-addition and formation branches also reject the
  encoded O–H/N–H/acid conflicts rather than disagreeing with the planner.
- **One to ten steps:** Path Finder settings now include 6–10 steps. Protection
  and deprotection count separately. Searches up to five steps default to 60
  expanded structures/12 seconds; six to ten default to 200/30 seconds, remain
  cancellable, and do not establish impossibility when exhausted.

The current reproducible checks are `node tools/run-validation.js`, with optional
`--rdkit --browser` checks documented in `tools/README.md`. These are finite
regression and oracle comparisons, not a general accuracy percentage.
Integration results: all 18 default suites pass, RDKit passes 385 independent
checks, and the Chromium suite passes 56 desktop/mobile-emulation checks.

## Coordinated workbench upgrade — 2026-10-22

This round implements the six requested areas:

1. **Identity consistency:** a shared bounded exact graph key distinguishes
   connectivity, charge, isotope labels and supported specified stereochemistry.
   Reaction products, Path Finder and the workspace use shared identity checks.
   Copy/paste, schemes, SMILES, MOL and share links preserve isotope metadata;
   unmarked imported double bonds stay unspecified instead of inheriting E/Z
   from automatic layout. New v2 share links retain isotope/stereo flags while
   the decoder continues to accept legacy v1 links.
2. **Broader validation:** a fixture-based benchmark covers naming, eleven
   established forward families, negative controls, stereo and file roundtrips.
   `node tools/run-validation.js` runs every regression suite and syntax checks.
   The fixture set is finite regression coverage, not a measured accuracy rate
   across chemical space.
3. **Reaction coverage:** four additional bounded families and matching
   forward-verified retrosynthesis transforms: Finkelstein exchange, periodate
   thioether oxidation, peracid sulfoxide oxidation and iodine-mediated
   symmetric disulfide formation. Their descriptors record supported substrates,
   conditions, assumptions, limitations and literature/teaching references.
4. **Prediction evidence:** all 102 reaction descriptors can be searched and
   filtered in Reactions. Every outcome carries its generating rule, scope,
   assumptions and limitations. Curated sources are linked; older rules with
   missing source records are explicitly identified. References support a
   reaction class, not experimental validation of the local implementation.
5. **Cleaner internals:** reaction metadata is separated from graph edits in a
   common catalog/registration API. Naming parent selection and stereo-locant
   state management now use shared helpers; phenol/aniline retained names and
   suffix-group parent selection have regression coverage.
6. **Route workflow:** Path Finder returns ranked alternatives with editable
   inventory and reagent/rule exclusions. Each route can be saved to the Route
   Workspace, renamed, reordered and edited. Every edit is checked for endpoint
   continuity and forward-rule reproduction. Intermediate previews, step
   handoff, local persistence, validated JSON import/export and readable CSV
   exports are available; CSV text fields guard spreadsheet formula injection.

Known limits: endpoints currently require one connected molecule; search and
identity computation have explicit size/time/symmetry budgets. The existing CIP
implementation is not a complete implementation of every modern CIP rule.
Common labelled-isotope masses are supported; unknown isotope masses are shown
as unavailable. Historical stock entries whose stereo was previously discarded
cannot recover that information without re-importing the original structures.
At that earlier release rule-source coverage was partial; the update above adds
reaction-class references for every current rule. None of
these checks establishes experimental yield, selectivity or general feasibility.

Validation at integration: 61 browser scripts parse, and 11 regression/benchmark
suites passed at that release. A full-app DOM smoke test also passed startup, tab switching, path
search, route save/verification, reaction-step handoff and evidence/explorer
initialization, using jsdom with a stub canvas. Full browser rendering was not
available then; the current update adds the real Chromium suite described above.

## Naming

The parent-selection fallback now prefers a parent containing more principal
suffix groups before preferring chain length. Regression cases cover polyols,
diamines and dithiols, graph-order independence, and unchanged input graphs.
The displayed primary systematic name follows the selected parent. Butenedioic
acid receives the fumaric or maleic common name only when E or Z geometry is
specified; unspecified geometry keeps a nonspecific name.

Reference: [IUPAC Blue Book P-44.1.1](https://iupac.qmul.ac.uk/BlueBook/P4.html)
and [P-66, retained acid names](https://iupac.qmul.ac.uk/BlueBook/PDF/P6.pdf).
These changes do not establish complete IUPAC coverage for arbitrary structures.

## Reactions

Product merging preserves atom and bond metadata, product identity uses
isomeric SMILES, and a narrow structural validator rejects invalid bond graphs
and unsupported overvalent carbon/oxygen products. Carboxylates no longer match
the alkoxide reagent class.

Two sulfur transformations extend the rule library:

- Thiolate alkylation with methyl or accessible primary alkyl halides. Neutral
  thiols require a supported base; tertiary and neopentyl halides are excluded.
- TCEP reduction of disulfides under aqueous conditions, including mixed
  disulfides and product multiplicity for symmetric disulfides.

References: [University of Calgary, thiol reactions](https://www.chem.ucalgary.ca/courses/350/Carey5th/Ch16/ch16-7-1.html)
and [Burns et al., selective disulfide reduction using TCEP](https://doi.org/10.1021/jo00008a014).
The rules are bounded structural models; displayed conversions or yields from
the existing engine are estimates rather than measurements for a query.

Reaction-file import rejects empty dot components, malformed counts, missing
agent records, and compounds beyond the lab's supported limit. Oversized imports
are rejected before replacing the existing reaction.

Disconnected SMILES export now serializes every component independently, so
counterions and stereocentres in charged multi-component products survive export.

## Path Finder

The Path Finder tab accepts a starting material and target as local names or
SMILES. It searches backwards from the target using forward-checked
retrosynthesis candidates, carrying one precursor toward the chosen start and
requiring any other building blocks to be available in the local stock list.
The displayed route runs forwards and lists the additional building blocks,
reagents and conditions; each step can open in the Reactions tab.

Search is bounded to the selected step count, 60 expanded structures and 12
seconds of processing, with cancellation. A successful result is a candidate
within the supported rule model. Failure to find a route does not establish
that a route is impossible. Endpoints currently must be single connected
molecules, up to the existing retrosynthesis size limit.

## Validation

Run the standalone Node regression suites in `tools/` for naming, reaction
prediction, reaction I/O, sulfur retrosynthesis and Path Finder. They use the
same browser scripts as the app without requiring a package installation.
