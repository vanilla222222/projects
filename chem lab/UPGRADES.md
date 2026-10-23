# Chem Lab upgrades

## Complex-substrate planning — 2026-10-23

- **Multiple installed groups:** Path Finder can seed compatible removal sequences of up to four separately counted steps. Boc/Cbz and Boc/Fmoc examples support complete removal and selected one-group removal. Every edge is forward reproduced and checked for retained-group compatibility. Existing reagent/rule/inventory filters and depth limits apply. Unknown survival, repeated-group selective cleavage and collateral hydrogenation are rejected; this is not general simultaneous multi-group installation.
- **Site alternatives:** two bounded generators show inequivalent one-site oxidation products for polyols with PCC/DMP and reduction products for polycarbonyls with NaBH4. Equivalent outcomes deduplicate; names identify the input carbon index and the Reactions view displays the selected site. These are partial-conversion alternatives with no assigned kinetic preference or ratio. They are withheld from verified retrosynthesis routes, and saved steps remain unverified as selective preparations. The catalog now has 156 descriptors, including these two inspection generators.
- **Broader coupling substrates:** source-bounded Kumada chemistry covers selected pyridyl/thienyl electrophiles and 2-pyridyl/2-thienyl Mg donors. Stille supports 2-thienyl trimethyl/tributylstannanes with exact ligand topology. Unsupported NH heterocycles, furyl cases and incompatible reactive groups remain excluded; Negishi retains its prior scope.
- **Focused checks:** 10 integration checks, eight multi-group sequence checks, 10 heteroaryl checks and the existing 10 coupling checks pass. No full browser/RDKit regression rerun was used for this update. Source references and explicit substrate limits accompany the implementation.

## Family expansion — 2026-10-23

- **154 sourced rules, 24 new families:** MPV reduction, Oppenauer oxidation, Tishchenko ester formation, Perkin condensation, Darzens glycidic esters, benzilic acid rearrangement, Hunsdiecker bromodecarboxylation, Kolbe–Schmitt carboxylation, McMurry coupling, acyloin cyclization, isocyanate urea/carbamate formation and hydrolysis, isothiocyanate thiourea formation, aldoxime dehydration, amide thionation, thiourea alkylation/isothiouronium release, Paal–Knorr thiophenes, Hantzsch thiazoles, amino-acid lactamization, and Negishi/Kumada/Stille cross-couplings.
- **17 new reverse transforms:** useful precursors are proposed through the existing forward verifier. Darzens disconnection first opens the epoxide ring before separating the precursor fragments.
- **Reagent access:** new catalyst/reagent condition choices register with the application; common isocyanate, isothiocyanate, oxime, thiourea and thioamide names resolve locally. Each rule records its specific conditions, substrate exclusions, sequential work-up assumptions and reaction-class sources.
- **Focused validation:** 69 new product/exclusion/reverse checks passed, plus syntax checks for the eight new modules and catalog integration confirming sources/scopes for all 154 rules. The full browser, RDKit and historical regression suites were intentionally not rerun for this expansion; their saved reports identify the earlier source versions they checked. These are bounded structural models, not experimental feasibility or yield predictions.

## Protection compatibility and nitrogen chemistry — 2026-10-22

- **130 sourced rules:** eight new bounded families cover pyridine N-oxidation/deoxygenation, Cope elimination, Gabriel alkylation/hydrazinolysis, imine/enamine hydrolysis and Curtius rearrangement with aqueous work-up. Eight matching reverse transforms are forward checked; exact coproduct counts, isotope fate and migrating stereochemistry are tested.
- **14 protecting-group motifs:** the registry distinguishes Boc, Cbz, Fmoc, TMS/TBS/TIPS/TBDPS and other silyl ethers, benzyl/PMB ethers, acetals/ketals, and tert-butyl/methyl/benzyl esters. A detected motif does not prove that the user intended it as protection. The searchable Reactions reference lists installation/removal classes and sources. Recognition is broader than automatic planning.
- **Condition-specific checks:** acid, base, fluoride, hydrogenolysis, hydride, organometallic and oxidative liabilities produce compatible/conflict/unknown reports with reasons. Unhandled reagents or regimes remain unknown even alongside a recognized base. Carbamate N–H is still protic; Boc is not a universal Grignard solution. Relative cleavage rates and general orthogonality are not assumed.
- **Stronger verified routes:** the supported amine-versus-alcohol acylation case can use Boc, Cbz or Fmoc; a separate TBS alcohol protection/Grignard/fluoride-removal sequence is supported. Every installation, main reaction and removal is independently forward checked, with collateral-site compatibility checks and separate step counts. Conflicting or unknown preserved groups reject planner branches. Unsupported selective installation/removal across equivalent multiple sites is excluded.
- **User controls and audit trail:** Path Finder can disable new protection or allow only listed group IDs. Preservation reports appear in Reactions, route comparisons and the workspace; CSV exports include recalculated status/reasons, while JSON preserves the stable planned-group ID and rationale. Structural workspace verification remains distinct from compatibility and experimental validation.
- **Hydrogenolysis consistency:** the encoded Cbz/benzyl cleavage endpoint now includes reduction of C=C/C≡C and nitro groups on the same molecule, preventing an invented selective deprotection endpoint. Substrate-specific catalyst selectivity remains outside the model.
- **Validation:** 27 default suites, 544 independent RDKit checks (42 structures, 18 identity pairs, 48 reaction fixtures and four explicit protection routes), and 70 Chromium desktop/mobile-emulation checks. These are finite regression checks, not general accuracy or experimental-feasibility estimates.

## Expanded reaction engine — 2026-10-22

- **122 sourced rules at that release (17 new):** acid-anhydride hydrolysis, alcohol/phenol acylation, aminolysis, reduction and formation; gamma/delta hydroxy-acid lactonization; Rosenmund reduction; peracid aldehyde oxidation; tertiary-amine N-oxidation and N-oxide deoxygenation; aryl-sulfoxide deoxygenation; thiol acylation; thioester and sulfonyl-chloride hydrolysis; selective peroxide nitrile hydration; photochemical thiol–ene addition; and intramolecular Williamson five/six-membered ether formation.
- **13 new reverse transformations:** added to the existing planner with forward verification, isotope/stereo checks and explicit scope limits. Reversible or multi-product reactions do not imply a uniquely preferred synthesis.
- **Reagent access:** named inputs include acetic/formic anhydride and PCl3; the condition selector has a dedicated Pd/BaSO4 Rosenmund catalyst. Ordinary Pd/C is not treated as equivalent.
- **Chemical identity fix:** imported N-oxides and nitro groups retain N+–O− charges instead of becoming invalid neutral pentavalent N=O structures.
- **Consistent endpoints:** cold alkaline-peroxide nitrile hydration reports the encoded amide endpoint without also asserting exhaustive acid hydrolysis. All anhydride/thioester coproducts and repeated product counts are independently checked.
- **Validation:** 23 default suites pass, with 465 independent RDKit checks covering 42 structures, 18 identity pairs, 37 reaction fixtures and one encoded protection route; 60 Chromium desktop/mobile-emulation checks cover the integrated application.

Rules are bounded structural models. Sources document the reaction classes; neither source coverage nor RDKit agreement establishes experimental feasibility, yield, selectivity or general chemical-space accuracy. Explicit exclusions prevent unsupported functional-group competition from being treated as established chemistry.

## Validation and synthesis-planning update — 2026-10-22

- **Desktop and mobile browser coverage:** the complete app now has a real
  Chromium test covering all four tabs, route comparisons, responsive layout,
  save/reload, step reordering and revalidation, exports/imports, rule search,
  extended depth settings and an explicit amine-protection route. Mobile means
  touch/viewport emulation, not a physical-device claim. See `tools/README.md`.
- **Sources and scope:** all 105 rule descriptors in that release have attributable
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

The reproducible checks are `node tools/run-validation.js`, with optional
`--rdkit --browser` checks documented in `tools/README.md`. These are finite
regression and oracle comparisons, not a general accuracy percentage.
Results at that release: all 18 default suites passed, RDKit passed 385 independent
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
