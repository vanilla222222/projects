# Chem Lab upgrades

## Metathesis, trans-alkene and Cannizzaro alternatives — 2026-10-30

- **Four additional reverse methods:** five- to eight-membered ring-closing metathesis, cross-metathesis of two terminal alkenes, dissolving-metal reduction of an acyclic internal alkyne to a trans alkene, and a primary alcohol from a non-enolizable aldehyde by Cannizzaro self-disproportionation. Each proposal requires the existing forward model to reproduce the target.
- **Planner constraints:** all four methods work through Path Finder. Both cross-metathesis partners remain explicit; custom inventory must supply the second building block. Cis requests are rejected under the encoded trans-only cross-metathesis/reduction branches. Ring-size, substitution and substrate exclusions remain bounded; metathesis geometry is the existing model heuristic, not an experimental selectivity claim.
- **Cannizzaro atom identity:** the hydroxide oxygen is copied into the carboxylate coproduct rather than replaced by an unlabelled new atom. This preserves oxygen-isotope labels alongside both aldehyde oxygen atoms. The two-aldehyde-equivalent requirement and separate alcohol/carboxylate products are retained. Isotope exchange, proton-transfer trajectories and experimental product ratios are not simulated.
- **Focused checks:** 76 reverse/planner checks and 22 forward/scope/stoichiometry/isotope checks cover the new methods, target immutability, exact replay, partner inventory, rejected cis requests, ring bounds and labelled coproduct oxygen.


## Nitrogen condensations and Paal–Knorr routes — 2026-10-30

- **Four forward-verified reverse methods:** oxime and hydrazone formation, Paal–Knorr furan synthesis, and Paal–Knorr pyrrole synthesis with ammonia or a primary amine. Hydroxylamine, hydrazine and pyrrole nitrogen donors are explicit precursors subject to inventory checks. Unsupported substituted donors and non-reproduced selective carbonyl conversions remain excluded.
- **Multiple condensation sites:** supported complete dioxime formation can reverse all matched sites together. Target structures are preserved during matching; each proposal still requires the existing forward engine to reproduce the complete target.
- **Condensation atom identity:** the carbonyl oxygen is removed and the actual nitrogen reagent atoms are copied into the product. This fixes an oxygen-isotope label incorrectly becoming a nitrogen-isotope label and preserves donor nitrogen/oxygen isotope labels. Explicit hydrogens on the attacking nitrogen are removed when forming C=N. This is net atom handling, not a balanced water/isotope-exchange model.
- **Pyrrole donor identity:** the ammonia nitrogen is copied instead of replaced with an unlabelled new atom; labelled-ammonia pyrrole products now retain their nitrogen label.
- **Focused checks:** 82 reverse/planner checks and 34 forward/isotope/scope checks cover the four methods, full target replay, unchanged target graphs, inventory requirements, labelled donors, carbonyl-oxygen loss, multiple carbonyls and negative controls. Existing E/Z-mixture and reaction-scope limitations remain visible.


## Acyl-substitution route alternatives — 2026-10-30

- **Four additional reverse methods:** carbodiimide amide coupling, Steglich esterification, methyl-ester aminolysis, and methyl/ethyl transesterification. Every proposal requires the existing forward engine to reproduce its target; cyclic acyl cuts and unsupported coupling partners remain excluded. The Steglich proposal includes DCC and DMAP; ester aminolysis supports explicit ammonia for primary amides.
- **Explicit incoming alcohol:** transesterification retains methanol or ethanol as a solvent-role precursor, so custom inventory cannot invent the carbon-containing alcohol. The donor is the opposite methyl/ethyl ester rather than a no-change exchange. Broader incoming alcohols are outside this reverse proposal's bounds.
- **Reagent recognition:** DCC/EDC formula matches now require neutral N=C=N connectivity. Same-formula diimine controls previously triggered false amide/ester coupling predictions; they are rejected. Supported DCC and EDC reactions retain their existing product and evidence behavior.
- **Regression coverage:** 66 reverse/planner checks and 20 forward/reagent checks cover all four methods, exact products, intended forward outcomes, negative targets, isotope/stereo preservation and custom inventory. Recipe Tree now includes the independently verified Steglich alternative with its complete acid-preparation branch, while enforcing the existing depth limit.


## Alpha-bromination, sulfur substitution and decarboxylation — 2026-10-30

- **Four additional reverse transforms:** HVZ alpha-bromination of carboxylic acids, alcohol sulfonate formation, amine sulfonamide formation, and ketone formation by beta-keto-acid decarboxylation. They reuse the existing sourced forward rules; shape matches remain proposals until forward replay reproduces the target. Sulfonyl precursors outside the forward engine's recognized reagent scope remain unavailable through these transforms.
- **Path Finder integration:** all four methods connect supported one-step endpoints. Sulfonylation includes an explicit sulfonyl-chloride building block and triethylamine conditions. A chiral alcohol route retains its specified stereocentre, and an isotope-labelled sulfonate keeps its label.
- **Sulfur reagent accuracy:** mesyl/tosyl chloride recognition now requires the actual sulfonyl-chloride bond pattern. A same-formula sulfinyl-chloride isomer previously triggered an incorrect mesylation product; that false positive is rejected. The leaving chloride is selected from its bond to the matched sulfur.
- **Focused validation:** 63 reverse/planner checks and 18 forward/scope checks cover the new methods, exact molecular identities, intended forward outcomes, negative controls, unchanged target graphs, stereo/isotope preservation and the reagent-isomer regression. These are bounded structural-model checks, not experimental feasibility or selectivity estimates.


## Route depth and reaction multiplicity — 2026-10-30

- Retrosynthesis enumeration now enforces the remaining operation budget separately on each branch. Shared intermediates expanded at a shallower graph depth cannot expose longer recipes beyond the requested depth. Explicit protection/reaction/deprotection operations each consume a step; independent convergent branches retain their own remaining budget.
- Reaction outcome deduplication now includes product multiplicity. Different product amounts remain distinct, while repeated entries and explicit counts for the same molecular identity normalize to one multiset regardless of product order. Existing stereochemical identity handling is retained.
- Regression checks cover shared intermediates, exact depth boundaries, protection triplets, convergence, multiplicity and product order. The recipe-tree integration check now requires depth three for the three-operation acyl-chloride route rather than accepting it under depth two.


## Retrosynthesis search quality — 2026-10-27

- **Stereochemistry-safe stock endpoints:** bounded retrosynthesis search now compares full molecular identity before treating a stock record or a Grignard reagent's parent halide as an available precursor. Connectivity-only, name-only and opposite-enantiomer matches cannot silently terminate a route; the policy now matches Path Finder inventory handling.
- **Convergent-route scoring:** linear routes still multiply encoded step yields. Independent branches now use their weakest cumulative branch as a conservative planning bottleneck instead of multiplying all branches as if they were serial operations. This removes an artificial penalty on convergent routes; it remains a ranking heuristic, not an experimental yield prediction or a stoichiometric material-flow model.
- **Regression coverage:** eight focused checks cover linear and convergent yields, yield filtering, invalid connectivity and enantiomer stock matches, exact stereochemical stock, and Grignard fallback identity.

## Staged predictions, protected routes and reference comparisons — 2026-10-23

- **Explicit reaction stages:** the Path Finder now has a staged-reaction editor. Up to six declared stages carry one explicitly selected product into a fresh mixture and retain the other product/minor/byproduct branches as records. Ambiguous choices stop for selection; unresolved partial conversion and compatibility conflicts block continuation. Every selected edge is independently forward replayed and complete staged routes can be saved. This is not a kinetic cascade, a balanced material-flow model or a one-pot compatibility prediction.
- **Substrate and site review:** Reactions, route comparison and the workspace show recognized input functional groups with atom indices, which sites are susceptible in the encoded reagent model, and whether the selected branch was reproduced. Single recognized sites, multiple susceptible sites, unestablished partial-conversion alternatives and encoded conflicts are distinguished. No relative rates, product ratios or universal site-selectivity scores are invented.
- **Two-mask route coordination:** explicit route masks can request an amine mask (Boc, Cbz or Fmoc), optionally with TBS for an alcohol. The coordinator tries bounded installation orders, up to four prospective protected endpoints, a main Path Finder search, and compatible final removal orders. Starting installations require a unique eligible site. Prospective endpoint variants are proposals, and only independently reproduced main routes survive. Every installed group must remain present through each main step; all operations count toward the 1–10 step setting and obey material/rule filters. A benign amino-hydroxy aldehyde reduction supports a five-step Fmoc/TBS example. Unencoded orthogonality, including the current general Boc/fluoride case, remains unsupported.
- **Whole-route ledger:** route comparisons and saved routes show the recognized protecting-group counts installed, retained and removed at each step, with preservation conflicts. Recognized motifs can also be native functionality; detection alone does not establish intent or necessity. Explicit masks express a user request, not an automatic claim that masking is chemically needed or optimal.
- **Condition-specific scope:** selected rules are replayed against recorded conditions. Unrecognized IDs, normalized/clamped values, uninterpreted time/concentration text, missing scope and unsupported susceptible-site models stay visible as uncertainty. A reproduced branch means agreement with the current encoded scope, not experimental feasibility.
- **Reference routes:** four benign cases distinguish a documented university preparation from composed teaching examples. The MiraCosta wintergreen-to-salicylic-acid-to-aspirin sequence currently reproduces one of two expected edges; other exercises reproduce two of two, one of one and one of two. Unsupported edges remain coverage gaps. These are known-edge replays rather than blind synthesis discovery or a general accuracy estimate. See `REFERENCE-ROUTES.md` for sources and work-up distinctions.
- **Focused validation:** eight scope checks, eight stage checks, nine reference checks and ten protection-program checks pass. A DOM smoke check also mounts the new panels, saves a staged route and renders a five-step protected route. No full browser/RDKit regression rerun was used for this release.

## Planner inspection and compatibility — 2026-10-23

- **Inspectable atom correspondence:** Reactions, route comparison and saved routes can show heavy-atom input/product pairs and formed, broken or order-changed bonds. Source atom indices refer to each listed input SMILES. Detached input atoms are shown explicitly; omitted atoms are not treated as a balanced byproduct equation. Mapping preserves element/isotope identity and uses injective assignments across multiple inputs. It is a bounded minimum-edit heuristic, with explicit symmetry, incomplete-input and search-limit messages; it does not establish mechanism, hydrogen transfers or experimental atom origins.
- **Stricter substrate gates:** unresolved competing-site annotations and unestablished partial-conversion alternatives are excluded from planner candidates. Existing retained-group survival and proton-donor checks are reused. Each operation in an automatic protection sequence is assessed separately. Bulk conversion of multiple groups is allowed when no competing site is left. Saved route verification recalculates these checks rather than trusting a historical status. Unencoded chemistry remains outside these checks.
- **Search and rejection explanations:** breadth-first depth ordering now uses graph-count similarity to the requested starting material as a tie-breaker, without pruning dissimilar intermediates. Search limits remain bounded. Path Finder shows up to 12 rejection examples, including forward-product mismatches and compatibility reasons; single-step retrosynthesis also displays excluded substrate conflicts. Sources still document reaction classes rather than validating a queried substrate.
- **Validation:** 17 focused planner/mapping checks and the existing 10 complex-substrate integration checks. No full regression, browser or RDKit rerun for this update.

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
